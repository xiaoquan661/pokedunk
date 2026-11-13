/**
 * detail.js —— 精灵详情页（pokedunk-v2）
 * 移植自旧 pokedunk journey-ui.js 详情弹窗（用户定稿设计）：
 * detail-top(精灵图+OVR+名字+风格+属性标签) / 八维条 / 必杀盒 / XP 条 / 投喂树果 / 进化预告 / 调动。
 * 数据源：引擎注册表（getPokemon/calcOVR/POSITION_WEIGHTS）+ 新存档个体。
 * 图鉴页点击未结缘精灵也可看（剪影详情：无个体数据，只显示基础信息）。
 */
import { getPokemon, calcOVR, calcArchetype, POSITION_WEIGHTS, STAT_LABELS, SPECIAL_MOVES, SPECIAL_EFFECTS } from "../../engine/readable/play-core.js?v=27";
import {
  STAT_KEYS, growthStats, mainOVR, versatility, rarityOf, RARITY_COLOR, posMult,
  trainPrice, trainStat, resetTrain,
  ITEM_TYPES, itemCount, useItem, TRAIN_MAX, recommendedPositions,
} from "../systems/build.js?v=21";
import { loadSave, writeSave, moveMon } from "../storage.js?v=26";
import { BERRY_XP } from "../systems/shop.js?v=28";
import { bumpDaily } from "./earn.js";
import { playEvolve } from "./anim.js?v=18";
import { ICON } from "./icons.js?v=20";
import { xpToNext } from "../../engine/growth.js";
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

let toastTimer = null;
let buildTab = "train"; // 详情页构筑页签：train / item
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

  // 八维 = 种族值 + 等级 + 训练 + 道具（构筑系统统一口径，cap 99）
  const vals = mon ? growthStats(mon) : Object.fromEntries(STAT_KEYS.map((k) => [k, base.r[k] || 0]));
  const assigned = mon ? save.assign?.[monId] || mon.pos : base.pos;
  const rec = mon ? recommendedPositions(mon) : [base.pos];
  const ovr = mon ? mainOVR(mon) : calcOVR(base.pos, base.r);
  const vers = mon ? versatility(mon) : ovr;
  const rarity = rarityOf(dexNo);
  const arch = calcArchetype(assigned, vals, calcOVR(assigned, vals));
  const wa = SPECIAL_MOVES[base.types[0]];
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

  const xpHtml = mon
    ? `<div class="detail-xp"><div class="row"><b>Lv.${mon.level}</b><span>经验 ${mon.xp} / ${xpToNext(mon.level)}</span></div>
       <div class="track"><i style="width:${Math.min(100, Math.round((mon.xp / xpToNext(mon.level)) * 100))}%"></i></div></div>`
    : `<div class="detail-xp"><div class="row"><span>尚未结缘 —— 在商店 / 孵蛋 / 比赛签约中与它相遇</span></div></div>`;

  // 训练 / 道具（构筑系统）：两块收进页签，首屏只显示一块
  const trainCap = mon ? Math.min(TRAIN_MAX, 4 + Math.floor(mon.level / 2)) : 0;
  const tr = mon?.train || { points: 0, stats: {} };
  const seenTab = ["train", "item"].includes(buildTab) ? buildTab : "train";
  const trainBody = mon
    ? `<div class="train-grid">${STAT_KEYS.map((k) => `<button class="train-stat" data-train="${k}"${tr.points >= trainCap ? " disabled" : ""}><span>${STAT_ZH[k]}</span><b>${vals[k]}</b></button>`).join("")}</div>
      <p class="note">每点 +1 属性；费用随已训练点数上涨，当前 ${trainPrice(mon)} 币/点${tr.points < trainCap ? `，下一点 ${trainPrice(mon) + 5} 币` : ""}。</p>
      <p class="note">${tr.points >= trainCap ? `已达当前等级上限：Lv.${mon.level} 最多训练 ${trainCap} 点，升级后可继续。` : `每只精灵最多训练 ${TRAIN_MAX} 点，当前上限 = 4 + 等级÷2（Lv.${mon.level} → ${trainCap} 点）。`}</p>
      <p class="note">重置返还 80% 训练点，返还点优先使用且不扣币；已花费的篮球币不退。</p>
      <button class="dbtn b" data-trainreset>重置训练（返还 80% 点数，不退币）</button>`
    : "";
  const itemBody = mon
    ? Object.entries(ITEM_TYPES).map(([id, it]) => `<button class="dbtn" data-item="${id}"${itemCount(save, id) <= 0 ? " disabled" : ""}>${it.name} ×${itemCount(save, id)} · ${STAT_ZH[it.stat]}+1（该只 ${mon.item?.used?.[id] || 0}/4）</button>`).join("")
    : "";
  const buildHtml = mon
    ? `<div class="dsec">构筑 <small>训练 ${tr.points}/${TRAIN_MAX} · 道具 ${mon.item?.points || 0}/20 · ${POS_ZH[assigned]}</small></div>
      <div class="dtab-row">
        ${[["train", "训练"], ["item", "道具"]].map(([id, label]) => `<button class="dtab${seenTab === id ? " on" : ""}" data-btab="${id}">${label}</button>`).join("")}
      </div>
      <div class="dtab-panel" data-bpanel="train"${seenTab !== "train" ? " hidden" : ""}>${trainBody}</div>
      <div class="dtab-panel" data-bpanel="item"${seenTab !== "item" ? " hidden" : ""}>${itemBody}</div>`
    : "";

  const moveHtml = mon
    ? (where === "roster"
        ? `<button class="dbtn b" data-move="box"${save.team.length <= 5 ? " disabled" : ""}>放入仓库</button>`
        : `<button class="dbtn b" data-move="roster"${save.team.length >= 10 ? " disabled" : ""}>调入队伍</button>`)
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
      ${specialHtml}
      ${xpHtml}
      ${buildHtml}
      ${mon ? `<div class="dsec">养成与调动</div>
      <div class="dact-row">
        <button class="dbtn b" data-feed="normal"${feedN ? " disabled" : ""}><span class="btn-ico">${ICON.berry}</span>普通树果 +${BERRY_XP.normal} XP（×${berries.berryNormal || 0}）</button>
        <button class="dbtn b" data-feed="premium"${feedP ? " disabled" : ""}><span class="btn-ico">${ICON.berry}</span>高级树果 +${BERRY_XP.premium} XP（×${berries.berryPremium || 0}）</button>
      </div>
      <div class="dact-row">${moveHtml}</div>
      ${evo ? `<p class="note">Lv${evo.level} 可进化 → ${evo.to.map(monName).join(" / ")}</p>` : ""}` : ""}
    </div>`;

  // 事件
  ov.addEventListener("click", (e) => {
    if (e.target === ov || e.target.closest(".dback")) { ov.remove(); onClose?.(); return; }
    const tab = e.target.closest("[data-btab]");
    if (tab && mon) {
      buildTab = tab.dataset.btab;
      ov.querySelectorAll("[data-btab]").forEach((b) => b.classList.toggle("on", b === tab));
      ov.querySelectorAll("[data-bpanel]").forEach((p) => { p.hidden = p.dataset.bpanel !== buildTab; });
      return;
    }
    const act = e.target.closest("[data-train],[data-trainreset],[data-item]");
    if (act && mon) {
      const refresh = () => { ov.remove(); openDetail(mon.dex, monId, onClose); };
      if (act.hasAttribute("data-train")) {
        const r = trainStat(save, mon, act.dataset.train);
        if (!r.ok) return toast(r.error);
        writeSave(save);
        toast(`训练 +1：${STAT_ZH[act.dataset.train]}${r.free ? "（返还点）" : "（-" + r.price + " 币）"}`);
        refresh();
        return;
      }
      if (act.hasAttribute("data-trainreset")) {
        const r = resetTrain(mon);
        if (!r.ok) return toast(r.error);
        writeSave(save);
        toast(`已重置训练，返还 ${r.refund} 点`);
        refresh();
        return;
      }
      if (act.hasAttribute("data-item")) {
        const r = useItem(save, mon, act.dataset.item);
        if (!r.ok) return toast(r.error);
        writeSave(save);
        toast(`${ITEM_TYPES[act.dataset.item].name}：${STAT_ZH[r.stat]} +1`);
        refresh();
        return;
      }
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
      const events = [];
      const anims = [];
      while (mon.xp >= xpToNext(mon.level) && mon.level < 99) {
        mon.xp -= xpToNext(mon.level);
        mon.level++;
        events.push(`升到 Lv.${mon.level}！`);
        const evo2 = EVOLUTIONS[mon.dex];
        if (evo2 && mon.level >= evo2.level && evo2.to.length) {
          const old = mon.dex;
          const oldName = monName(old);
          mon.dex = evo2.to[0];
          save.dex[mon.dex] ??= Date.now();
          events.push(`进化！${oldName} → ${monName(mon.dex)}`);
          anims.push({ type: "evolve", oldDex: old, newDex: mon.dex, oldName, newName: monName(mon.dex), level: mon.level, growth: [] });
        } else {
          anims.push({ type: "levelup", dex: mon.dex, level: mon.level, growth: [] });
        }
      }
      writeSave(save);
      ov.remove();
      // 逐个播放升级/进化中心弹窗，结束后重开详情页（dex 可能已进化）
      const playQueue = () => {
        const a = anims.shift();
        if (!a) return openDetail(mon.dex, monId, onClose);
        if (a.type === "evolve") {
          playEvolve({ oldDex: a.oldDex, newDex: a.newDex, title: `进化！${a.oldName} → ${a.newName}`, sub: `Lv.${a.level} · 位置已随形态更新`, changes: a.growth.map((g) => ({ k: "随机成长", v: g })) }, playQueue);
        } else {
          playEvolve({ oldDex: a.dex, title: `升级！Lv.${a.level}`, sub: "经验已入账", changes: [] }, playQueue);
        }
      };
      if (anims.length) playQueue();
      else { toast(`${monName(dexNo)} 经验增加（未升级）`, 3000); openDetail(mon.dex, monId, onClose); }
    } else if (b.hasAttribute("data-move")) {
      const mr = moveMon(save, monId, b.dataset.move);
      if (mr.ok) { writeSave(save); toast(`${monName(dexNo)}${b.dataset.move === "box" ? " 移入仓库" : " 调入队伍"}`); }
      else toast("调动失败：" + mr.error);
      ov.remove();
      openDetail(dexNo, monId, onClose);
    }
  });

  document.body.appendChild(ov);
}










