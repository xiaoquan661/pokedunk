/**
 * detail.js —— 精灵详情页（pokedunk-v2）
 * 移植自旧 pokedunk journey-ui.js 详情弹窗（用户定稿设计）：
 * detail-top(精灵图+OVR+名字+风格+属性标签) / 八维条 / 必杀盒 / XP 条 / 投喂树果 / 进化预告 / 调动。
 * 数据源：引擎注册表（getPokemon/calcOVR/POSITION_WEIGHTS）+ 新存档个体。
 * 图鉴页点击未结缘精灵也可看（剪影详情：无个体数据，只显示基础信息）。
 */
import { getPokemon, calcOVR, calcArchetype, STAT_LABELS, SPECIAL_MOVES, SPECIAL_EFFECTS, xpToNext } from "../../engine/readable/play-core.js?v=574";
import {
  STAT_KEYS, growthStats, mainOVR, versatility, rarityOf, RARITY_COLOR, posMult,
  growthZh, recommendedPositions,
} from "../systems/build.js?v=574";
import { rollGrowth } from "../../engine/growth.js?v=574";
import { loadSave, writeSave, moveMon, recordEvolution } from "../storage.js?v=574";
import { mergeOwnedSpecies } from "../systems/evo-merge.js?v=574";
import { BERRY_XP } from "../systems/shop.js?v=574";
import { bumpDaily } from "./earn.js?v=574";
import { playEvolve } from "./anim.js?v=574";
import { ICON } from "./icons.js?v=574";
import { EVOLUTIONS } from "../../engine/data/evolutions.js";

const STAT_ZH = { spd: "速度", sht: "投篮", ins: "终结", pas: "传球", def: "防守", blk: "盖帽", reb: "篮板", hnd: "控球" };
const POS_ZH = { PG: "控卫", SG: "分卫", SF: "小前", PF: "大前", C: "中锋" };
const TYPE_TC = { Normal: "#a8a878", Fire: "#f08030", Water: "#6890f0", Electric: "#f8d030", Grass: "#78c850", Ice: "#98d8d8", Fighting: "#c03028", Poison: "#a040a0", Ground: "#e0c068", Flying: "#a890f0", Psychic: "#f85888", Bug: "#a8b820", Rock: "#b8a038", Ghost: "#705898", Dragon: "#7038f8", Dark: "#705848", Steel: "#b8b8d0", Fairy: "#ee99ac" };
const TYPE_ZH = { Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰", Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力", Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精" };
const ARCH_ZH = { "Rim Protector": "护筐者", "Stretch Big": "空间内线", "Point Forward": "组织前锋", "Point Center": "组织中锋", "Glass Cleaner": "篮板手", "Post Scorer": "低位得分手", "Three-Level Scorer": "三威胁得分手", "3-and-D Wing": "投防侧翼", "Floor General": "场上指挥官", "Sharpshooter": "神射手", "Lockdown Defender": "锁防者", "Slasher": "突破手", "Speedster": "速度型", "Rim Runner": "护筐跑轰", "Hustle Big": "拼抢内线", "Role Player": "角色球员", "Developmental Project": "培养股" };

const monName = (dex) => {
  const r = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return r ? String(r[1]).replace(/#\d+$/, "") : "#" + dex;
};

/** 进化族谱：找到最早形态，再按层级展开（支持分支进化） */
function evoFamily(dex) {
  let root = dex;
  const guard = new Set();
  for (;;) {
    const p = Object.keys(EVOLUTIONS)
      .map(Number)
      .find((k) => EVOLUTIONS[k].to.includes(root));
    if (p == null || guard.has(p) || p === root) break;
    guard.add(p);
    root = p;
  }
  const tiers = [[root]];
  const levels = [];
  const depth = new Map([[root, 0]]);
  for (let d = 0; d < 4; d++) {
    const next = [];
    const lv = new Set();
    for (const id of tiers[d]) {
      const ev = EVOLUTIONS[id];
      if (!ev) continue;
      for (const to of ev.to) {
        lv.add(ev.level);
        if (!depth.has(to)) {
          depth.set(to, d + 1);
          next.push(to);
        }
      }
    }
    if (!next.length) break;
    levels.push([...lv].sort((a, b) => a - b));
    tiers.push(next);
  }
  return { tiers, levels };
}

/** 图鉴/详情里的进化链区块 */
function evoHtml(dex, save) {
  const { tiers, levels } = evoFamily(dex);
  if (tiers.length < 2) return "";
  const seen = save?.dex || {};
  const encountered = save?.seen || {};
  const owned = new Set(Object.values(save?.mons || {}).map((m) => m.dex));
  const node = (id) => {
    const cur = id === dex;
    // 已结缘或赛场上遇见过才显示立绘与名字；否则剪影 + 问号
    const has = !!seen[id] || !!encountered[id] || owned.has(id);
    return `<button type="button" class="evo-node${cur ? " cur" : ""}${has ? "" : " sil"}" data-evo="${id}"${cur || !has ? " disabled" : ""}>
      <img src="./sprites/${id}.png" alt="" loading="lazy">
      <b>${has ? monName(id) : "？？？"}</b>
      <small>${cur ? "当前形态" : has ? "点击查看" : "尚未发现"}</small>
    </button>`;
  };
  let out = "";
  tiers.forEach((tier, i) => {
    if (i > 0) out += `<span class="evo-arrow"><small>Lv.${levels[i - 1].join("/")}</small><i>›</i></span>`;
    out += tier.map(node).join("");
  });
  return `<div class="dsec">进化 <small>到达等级后在详情页手动进化</small></div><div class="evo-chain">${out}</div>`;
}

let toastTimer = null;
/** 训练扣币后同步主页/弹层背后的金币数字，避免看起来“没扣钱” */
function syncCoinUI(coins) {
  document.querySelectorAll(".coin-chip b").forEach((el) => {
    if (/^\d+$/.test(el.textContent.trim())) el.textContent = String(coins);
  });
}
function toast(msg, ms = 2600) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/**
 * 打开详情弹窗。
 * @param dexNo    图鉴编号
 * @param monId    个体 id（未结缘传 null → 只读展示）
 * @param onClose  关闭回调（图鉴页刷新用）
 */
export function openDetail(dexNo, monId = null, onClose = null) {
  const base = getPokemon(dexNo);
  const save = loadSave();
  const mon = monId != null ? save.mons[monId] : null;
  const where = monId != null ? (save.team.includes(monId) ? "roster" : "box") : null;

  // 未结缘且未在球场上遇见 → 只展示黑色剪影与问号，不泄露任何资料
  const known = !!save.dex?.[dexNo] || !!save.seen?.[dexNo] || Object.values(save.mons || {}).some((m) => m.dex === dexNo);
  if (!known) {
    const ov = document.createElement("div");
    ov.className = "detail-wrap";
    ov.innerHTML = `
      <div class="detail-box detail-locked">
        <div class="dhead"><h2>精灵详情</h2><button class="dback">关闭</button></div>
        <div class="lock-body">
          <span class="lock-no">No.${dexNo}</span>
          <img class="lock-sil" src="./sprites/${dexNo}.png" alt="" draggable="false">
          <b class="lock-name">？？？</b>
          <p class="lock-hint">尚未在球场上遇见</p>
          <small>遇见后解锁图鉴资料</small>
          <p class="lock-hint" style="margin-top:10px;font-size:11px;line-height:1.7">获取途径：每日商店 · 孵蛋 · 战胜签约 · 每日挑战 / 赛季传说</p>
        </div>
      </div>`;
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest(".dback")) { ov.remove(); onClose?.(); }
    });
    (document.getElementById("stage") || document.body).appendChild(ov);
    return;
  }

  // 八维 = 种族值 + 等级 + 训练 + 道具（构筑系统统一口径，cap 99）
  const vals = mon ? growthStats(mon) : Object.fromEntries(STAT_KEYS.map((k) => [k, base.r[k] || 0]));
  const assigned = mon ? save.assign?.[monId] || mon.pos : base.pos;
  const rec = mon ? recommendedPositions(mon) : [base.pos];
  const ovr = mon ? mainOVR(mon) : calcOVR(base.pos, base.r);
  const vers = mon ? versatility(mon) : ovr;
  const rarity = rarityOf(dexNo);
  const arch = calcArchetype(assigned, vals, calcOVR(assigned, vals));
  const wa = base.types?.[0] ? SPECIAL_MOVES[base.types[0]] : null;
  const sp = wa ? SPECIAL_EFFECTS[wa[0]] : null;

  // 能力条压缩为 4×2 网格（保留数值与进度，减少纵向滚动）
  const statsHtml = Object.keys(STAT_ZH)
    .map((k) => `<div class="stat-cell"><i style="--v:${vals[k]}%"></i><span>${STAT_ZH[k]}</span><b>${vals[k]}</b></div>`)
    .join("");
  const typesHtml = base.types.map((t) => `<i style="--tc:${TYPE_TC[t] || "#888"}">${TYPE_ZH[t] || t}</i>`).join("");
  const specialHtml = sp
    ? `<div class="special-box"><span class="lbl">必杀：${wa[1]}</span><p>${sp.label}. ${sp.desc}</p></div>`
    : "";

  const berries = save.bag;
  const maxed = mon ? mon.level >= 99 : true;
  const feedN = !mon || maxed || (berries.berryNormal || 0) <= 0;
  const feedP = !mon || maxed || (berries.berryPremium || 0) <= 0;
  const evo = EVOLUTIONS[dexNo];
  const canEvolve = !!(mon && evo && mon.level >= evo.level && evo.to.length);
  const evoTarget = canEvolve ? evo.to[0] : null;

  const xpHtml = mon
    ? `<div class="detail-xp"><div class="row"><b>Lv.${mon.level}</b><span>经验 ${mon.xp} / ${xpToNext(mon.level)}</span></div>
       <div class="track"><i style="width:${Math.min(100, Math.round((mon.xp / xpToNext(mon.level)) * 100))}%"></i></div></div>`
    : `<div class="detail-xp"><div class="row"><span>尚未结缘 —— 在商店 / 孵蛋 / 比赛签约中与它相遇</span></div></div>`;


  const moveHtml = mon
    ? (where === "roster"
        ? `<button class="dbtn b" data-move="box"${save.team.length <= 5 ? " disabled" : ""}>${save.team.length <= 5 ? "至少保留 5 人" : "放入仓库"}</button>`
        : `<button class="dbtn b" data-move="roster"${save.team.length >= 10 ? " disabled" : ""}>${save.team.length >= 10 ? "队伍已满（10 人）" : "调入队伍"}</button>`)
    : "";

  const ov = document.createElement("div");
  ov.className = "detail-wrap";
  ov.innerHTML = `
    <div class="detail-box">
      <div class="dhead"><h2>精灵详情</h2><button class="dback">关闭</button></div>
      <div class="detail-top">
        <img src="./sprites/${dexNo}.png" alt="">
        <div>
          <div class="detail-ovr">${ovr}<small>OVR</small></div>
          <h3>${monName(dexNo)}</h3>
          <p class="arch">${{ PG: "控卫", SG: "分卫", SF: "小前", PF: "大前", C: "中锋" }[assigned]} · ${ARCH_ZH[arch] || arch}</p>
          <p class="build-meta no-zh"><i class="rarity" style="--rc:${RARITY_COLOR[rarity]}">${rarity}</i> 推荐 ${rec.join("/")} · 全能 ${vers}${mon && assigned !== mon.pos ? ` · 越位 ${Math.round(posMult(mon, assigned) * 100)}%` : ""}</p>
          <span class="types">${typesHtml}</span>
        </div>
      </div>
      <div class="ratings compact">${statsHtml}</div>
      ${evoHtml(dexNo, save)}
      ${specialHtml}
      ${xpHtml}
      ${mon ? `<div class="dsec">养成与调动</div>
      ${canEvolve ? `<div class="dact-row"><button class="dbtn b" data-do-evolve style="border-color:var(--gold,#f5c542);color:var(--gold,#f5c542)">进化！${monName(evoTarget)}</button></div>` : ""}
      <div class="dact-row">
        <button class="dbtn b" data-feed="normal"${feedN ? " disabled" : ""}><span class="btn-ico">${ICON.berry}</span>普通树果 +${BERRY_XP.normal} XP（×${berries.berryNormal || 0}）</button>
        <button class="dbtn b" data-feed="premium"${feedP ? " disabled" : ""}><span class="btn-ico">${ICON.berry}</span>高级树果 +${BERRY_XP.premium} XP（×${berries.berryPremium || 0}）</button>
      </div>
      <div class="dact-row"><button class="dbtn b" data-go-train>去升级 · 培养强化</button></div>
      <div class="dact-row">${moveHtml}</div>` : ""}
    </div>`;

  // 事件
  ov.addEventListener("click", (e) => {
    if (e.target === ov || e.target.closest(".dback")) { ov.remove(); onClose?.(); return; }
    // 进化链跳转（只看已发现的形态）
    const evoBtn = e.target.closest("[data-evo]");
    if (evoBtn && !evoBtn.disabled) {
      const id = Number(evoBtn.dataset.evo);
      if (id !== dexNo) {
        const s2 = loadSave() || save;
        const mid = Object.keys(s2.mons || {}).find((k) => s2.mons[k].dex === id);
        ov.remove();
        openDetail(id, mid != null ? Number(mid) : null, onClose);
      }
      return;
    }
    if (e.target.closest("[data-do-evolve]") && mon) {
      const evoNow = EVOLUTIONS[mon.dex];
      if (!evoNow || mon.level < evoNow.level || !evoNow.to?.length) return;
      const oldDex = mon.dex;
      const oldName = monName(oldDex);
      const targetDex = evoNow.to[0];
      const merged = mergeOwnedSpecies(save, monId, targetDex);
      const r = recordEvolution(save, monId, targetDex);
      if (!r.ok) return toast("进化失败：" + r.error);
      writeSave(save);
      ov.remove();
      const newDex = r.newDex;
      const newName = monName(newDex);
      const done = () => openDetail(newDex, monId, onClose);
      playEvolve({
        oldDex, newDex,
        title: `进化！${oldName} → ${newName}`,
        sub: `Lv.${mon.level} · ${merged?.merged ? "与已有同种融合，训练点已返还" : "位置已随形态更新"}`,
        changes: [],
        onSkipAll: done,
      }, done);
      return;
    }
    if (e.target.closest("[data-go-train]") && mon) {
      ov.remove();
      window.dispatchEvent(new CustomEvent("pj-open-train", { detail: { monId } }));
      return;
    }
    const b = e.target.closest("button[data-feed], button[data-move]");
    if (!b || !mon) return;

    if (b.hasAttribute("data-feed")) {
      const tier = b.dataset.feed;
      const key = tier === "normal" ? "berryNormal" : "berryPremium";
      if ((save.bag[key] || 0) <= 0) return toast("树果不足（去商店购买）");
      if (mon.level >= 99) return toast("已 Lv99 满级");
      save.bag[key]--;
      bumpDaily("feed");
      mon.xp += BERRY_XP[tier];
      const fromLevel = mon.level;
      const growthAll = [];
      while (mon.xp >= xpToNext(mon.level) && mon.level < 99) {
        mon.xp -= xpToNext(mon.level);
        mon.level++;
        growthAll.push(...rollGrowth({ dex: mon.dex, bonus: mon.bonus }, Math.random).map(growthZh));
        mon.train ||= { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 };
        mon.train.free = (mon.train.free || 0) + 1;
        mon.train.freeEarned = (mon.train.freeEarned || 0) + 1;
      }
      const levels = mon.level - fromLevel;
      const anims = levels > 0
        ? [{ type: "levelup", dex: mon.dex, fromLevel, toLevel: mon.level, levels, growth: growthAll }]
        : [];
      writeSave(save);
      ov.remove();
      // 逐个播放升级/进化中心弹窗，结束后重开详情页（dex 可能已进化）
      const finishAll = () => { anims.length = 0; openDetail(mon.dex, monId, onClose); };
      const playQueue = () => {
        const a = anims.shift();
        if (!a) return finishAll();
        if (a.type === "evolve") {
          playEvolve({ oldDex: a.oldDex, newDex: a.newDex, title: `进化！${a.oldName} → ${a.newName}`, sub: `Lv.${a.level} · ${a.merged ? "与已有同种融合，训练点已返还" : "等级保持不变，位置已随形态更新"}`, changes: a.growth.map((g) => ({ k: "随机成长", v: g })), onSkipAll: finishAll }, playQueue);
        } else {
          const cnt = {};
          (a.growth || []).forEach((g) => {
            const m = String(g).match(/^\+\d+\s+(.+)$/);
            const k = m ? m[1] : String(g);
            cnt[k] = (cnt[k] || 0) + 1;
          });
          const changes = Object.entries(cnt).map(([k, v]) => ({ k, v: `+${v}` }));
          const title = a.levels > 1 ? `升级！Lv.${a.fromLevel} → Lv.${a.toLevel}` : `升级！Lv.${a.toLevel}`;
          playEvolve({ oldDex: a.dex, title, sub: `升了 ${a.levels} 级 · 经验已入账`, changes, onSkipAll: finishAll }, playQueue);
        }
      };
      if (anims.length) playQueue();
      else { toast(`${monName(dexNo)} 经验增加（未升级）`, 3000); openDetail(mon.dex, monId, onClose); }
    } else if (b.hasAttribute("data-move")) {
      const mr = moveMon(save, monId, b.dataset.move);
      if (mr.ok) {
        writeSave(save);
        toast(`${monName(dexNo)}${b.dataset.move === "box" ? " 已移入仓库" : " 已调入队伍"}`);
      } else toast("调动失败：" + mr.error);
      ov.remove();
      openDetail(dexNo, monId, onClose);
    }
  });

  (document.getElementById("stage")||document.body).appendChild(ov);
}










