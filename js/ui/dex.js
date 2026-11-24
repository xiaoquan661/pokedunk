/**
 * dex.js —— 图鉴页（pokedunk-v2）
 * 基于旧 pokedunk dex-ui.js 设计，按用户定稿简化：
 *   - 不做地区页签（原版 291 只就 291 只，全部平铺一张表）
 *   - 筛选：全部 / 已获得 / 按系别（18 属性 chips，属性色，取引擎 getPokemon(types[0])）
 * 数据源 = 新存档 save.dex；快照 dex-data.js 提供中文名/位置/综合。
 */
import { loadSave, writeSave } from "../storage.js?v=549";
import { gameAudio } from "../platform/audio.js?v=549";
import { getPokemon } from "../../engine/readable/play-core.js?v=549";
import { rarityOf, RARITY_COLOR } from "../systems/build.js?v=549";
import { openDetail } from "./detail.js?v=549";
import {
  milestoneRows, rewardText, claimMilestone, monRewardBannerHtml, claimMonReward,
  typeRewardRows, claimTypeReward,
} from "../systems/milestones.js?v=550";

const ROWS = window.__PJ_DEX_ROWS || [];
let curFilter = "all"; // "all" | "own" | "Type:Fire" ...
let msOpen = false; // 里程碑档位列表是否展开

let toastTimer = null;
function toast(msg, ms = 2400) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

const TYPE_ZH = { Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰", Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力", Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精" };
const TYPE_ORDER = Object.keys(TYPE_ZH);
const RARITY_ORDER = ["传说", "稀有", "普通"];

const ownedSet = () => {
  const s = loadSave();
  const set = {};
  if (s && s.dex) for (const k of Object.keys(s.dex)) set[Number(k)] = 1;
  return set;
};

/** 赛场上遇见过 / 已结缘的精灵（用于图鉴立绘和资料解锁） */
const seenSet = () => {
  const s = loadSave();
  const set = {};
  if (!s) return set;
  if (s.dex) for (const k of Object.keys(s.dex)) set[Number(k)] = 1;
  if (s.seen) for (const k of Object.keys(s.seen)) set[Number(k)] = 1;
  for (const m of Object.values(s.mons || {})) if (m?.dex) set[m.dex] = 1;
  return set;
};

/** dex → 主属性（缓存查询） */
const typeCache = {};
function typeOf(dex) {
  if (!typeCache[dex]) {
    const p = getPokemon(dex);
    typeCache[dex] = (p.types && p.types[0]) || "Normal";
  }
  return typeCache[dex];
}

function cardHtml(r, owned, seen) {
  const dex = r[0], name = String(r[1]).replace(/#\d+$/, "");
  const has = !!seen[dex];
  const color = has ? TYPE_COLORS_ZH(dex) : "rgba(255,255,255,.14)";
  const rarity = rarityOf(dex);
  return (
    '<button class="dex-card' + (has ? "" : " off") + '" data-dex="' + dex + '" style="border-color:' + color + '">' +
    '<span class="no">No.' + dex + "</span>" +
    '<span class="dex-rar" style="--rc:' + RARITY_COLOR[rarity] + '">' + rarity + "</span>" +
    '<img loading="lazy" src="./sprites/' + dex + '.png" alt="' + (has ? name : "???") + '">' +
    '<div class="nm">' + (has ? name : "？？？") + "</div>" +
    (has ? '<div class="info">' + r[2] + " · " + r[3] + "</div>" : "") +
    "</button>"
  );
}
function TYPE_COLORS_ZH(dex) {
  const t = typeOf(dex);
  return TYPE_COLOR_MAP[t] || "#888";
}
const TYPE_COLOR_MAP = { Normal: "#a8a878", Fire: "#ee8130", Water: "#6390f0", Electric: "#f7d02c", Grass: "#7ac74c", Ice: "#96d9d6", Fighting: "#c22e28", Poison: "#a33ea1", Ground: "#e2bf65", Flying: "#a98ff3", Psychic: "#f95587", Bug: "#a6b91a", Rock: "#b6a136", Ghost: "#735797", Dragon: "#6f35fc", Dark: "#705746", Steel: "#b7b7ce", Fairy: "#d685ad" };

function renderGrid(root, owned, seen) {
  const body = root.querySelector("#dex-grid");
  let list;
  if (curFilter === "all") list = ROWS;
  else if (curFilter === "own") list = ROWS.filter((r) => owned[r[0]]);
  else if (curFilter.startsWith("Rarity:")) {
    const rar = curFilter.slice(7);
    list = ROWS.filter((r) => rarityOf(r[0]) === rar);
  } else {
    const t = curFilter.slice(5);
    list = ROWS.filter((r) => typeOf(r[0]) === t);
  }
  body.innerHTML = list.length
    ? list.map((r) => cardHtml(r, owned, seen)).join("")
    : '<div class="dex-empty">这里还没有收集记录。<br>比赛签约、孵蛋和商店获得的精灵会点亮图鉴。</div>';
}

function rarityChipsHtml(owned) {
  const cnt = {};
  for (const r of ROWS) {
    if (!owned[r[0]]) continue;
    const rar = rarityOf(r[0]);
    cnt[rar] = (cnt[rar] || 0) + 1;
  }
  return RARITY_ORDER.map((rar) => {
    const key = "Rarity:" + rar;
    const on = curFilter === key;
    const c = cnt[rar] || 0;
    return `<button data-f="${key}"${on ? ' class="on"' : ""} style="--rc:${RARITY_COLOR[rar]}">${rar}${c ? ` ${c}` : ""}</button>`;
  }).join("");
}

function chipsHtml(owned) {
  // 属性 chips：已获得的属性先亮出数量
  const cnt = {};
  for (const r of ROWS) {
    if (!owned[r[0]]) continue;
    const t = typeOf(r[0]);
    cnt[t] = (cnt[t] || 0) + 1;
  }
  return TYPE_ORDER.map((t) => {
    const key = "Type:" + t;
    const on = curFilter === key;
    const c = cnt[t] || 0;
    return `<button data-f="${key}"${on ? ' class="on"' : ""} style="--tc:${TYPE_COLOR_MAP[t]}">${TYPE_ZH[t]}${c ? ` ${c}` : ""}</button>`;
  }).join("");
}

/** 里程碑区块：进度条 + 下一档 + 可折叠档位列表 */
function milestoneHtml(save) {
  const rows = milestoneRows(save);
  const got = rows[0]?.got || 0;
  const next = rows.find((r) => !r.reached) || null;
  const ready = rows.filter((r) => r.canClaim).length;
  const prevN = [...rows].reverse().find((r) => r.reached && r.n < (next?.n ?? 999))?.n || 0;
  const pct = next ? Math.round(((got - prevN) / (next.n - prevN)) * 100) : 100;
  return `
    <div class="ms-box">
      <div class="ms-head"><b>图鉴里程碑</b><span>${got} / ${ROWS.length}</span></div>
      <div class="ms-next">${next ? `下一档 ${next.n} 只 · 还差 ${next.remain} 只 · ${rewardText(next)}` : "全部档位已达成"}</div>
      <div class="ms-bar"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>
      <button class="ms-toggle" data-ms-toggle>${msOpen ? "收起档位" : "查看全部档位"}${ready ? ` · ${ready} 档可领` : ""}</button>
      ${msOpen ? `<div class="ms-list">${rows.map((r) => `
        <div class="ms-row ${r.claimed ? "done" : ""} ${r.reached ? "reached" : ""}">
          <span class="ms-n">${r.n}</span>
          <span class="ms-r"><b>${rewardText(r)}</b><small>${r.claimed ? "已领取" : r.reached ? "已达成" : `还差 ${r.remain} 只`}</small></span>
          <button class="ms-btn" data-ms="${r.n}" ${r.canClaim ? "" : "disabled"}>${r.claimed ? "已领取" : r.reached ? "领取" : "未达成"}</button>
        </div>`).join("")}</div>` : ""}
    </div>`;
}

/** 属性收集奖励：每个属性集齐 8 种，可领 1 只同属性未结缘精灵 */
function typeRewardHtml(save) {
  const rows = typeRewardRows(save);
  const ready = rows.filter((r) => r.canClaim);
  const done = rows.filter((r) => r.claimed).length;
  return `
    <div class="ms-box ty-rw-box">
      <div class="ms-head"><b>属性收集奖励</b><span>已领 ${done} / ${rows.length}</span></div>
      <div class="ms-next">每个属性集齐 ${rows[0]?.step || 8} 种，可领 1 只同属性未结缘精灵${ready.length ? ` · <b style="color:var(--gold)">${ready.length} 个可领</b>` : ""}</div>
      ${ready.length ? `<button class="ms-btn" data-ty-claim="${ready[0].type}" style="align-self:flex-start">领取 ${ready[0].cn}</button>` : ""}
      <div class="ty-grid">
        ${rows.map((r) => `
          <button class="ty-chip ${r.canClaim ? "ready" : ""} ${r.claimed ? "done" : ""}"
            ${r.canClaim ? `data-ty-claim="${r.type}"` : "disabled"}>
            <b>${r.cn}</b><small>${r.claimed ? "已领" : `${r.have}/${r.step}`}</small>
          </button>`).join("")}
      </div>
    </div>`;
}

/** 渲染图鉴页到 root（全屏页，主界面菜单项进入） */
export function renderDex(root) {
  const owned = ownedSet();
  const seen = seenSet();
  const got = ROWS.filter((r) => owned[r[0]]).length;
  const save = loadSave() || { dex: {} };
  root.innerHTML = `
    <style>
      .dex-chips.rarity-chips button{border-color:var(--rc);color:var(--rc)}
      .dex-chips.rarity-chips button.on{background:var(--rc);color:#10203f;box-shadow:0 0 8px var(--rc)}
      .dex-card .dex-rar{position:absolute;right:6px;top:5px;font-style:normal;font-size:9px;font-weight:700;color:var(--rc);border:1px solid var(--rc);border-radius:4px;padding:0 4px;background:rgba(0,0,0,.28)}
      .dex-card.off .dex-rar{opacity:.55}
      .ty-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:8px}
      .ty-chip{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:5px;
        border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--text-dim)}
      .ty-chip b{font-size:10px;font-weight:700;color:var(--text)}
      .ty-chip small{font:700 8.5px var(--sport);font-variant-numeric:tabular-nums}
      .ty-chip.ready{border-color:var(--gold);background:rgba(245,197,66,.14)}
      .ty-chip.ready b,.ty-chip.ready small{color:var(--gold)}
      .ty-chip.done{opacity:.45}
    </style>
    <div class="page-head">
      <button class="back" data-back>‹</button>
      <h2>图鉴</h2>
      <span class="count">${got} / ${ROWS.length}</span>
    </div>
    <p class="page-sub">收集你结缘过的精灵 · 剪影代表尚未结缘 · 卡边框=属性色</p>
    ${milestoneHtml(save)}
    ${monRewardBannerHtml(save)}
    ${typeRewardHtml(save)}
    <div class="dex-chips">
      <button data-f="all"${curFilter === "all" ? ' class="on"' : ""}>全部</button>
      <button data-f="own"${curFilter === "own" ? ' class="on"' : ""}>已获得</button>
    </div>
    <div class="dex-chips rarity-chips">${rarityChipsHtml(owned)}</div>
    <div class="dex-chips type-chips">${chipsHtml(owned)}</div>
    <div class="dex-grid" id="dex-grid"></div>`;

  renderGrid(root, owned, seen);

  // 只绑定一次：renderDex 会被 onClose 重入，重复绑定会导致一次点击叠多层详情
  if (root.__dexBound) return;
  root.__dexBound = true;
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-ms-toggle]")) {
      msOpen = !msOpen;
      renderDex(root);
      return;
    }
    const tyBtn = e.target.closest("[data-ty-claim]");
    if (tyBtn) {
      const fresh = loadSave() || {};
      const r = claimTypeReward(fresh, tyBtn.dataset.tyClaim);
      if (!r.ok) return toast(r.error);
      writeSave(fresh);
      gameAudio.play("coin");
      toast(`${r.name || "精灵"} 加入${r.placed === "box" ? "仓库" : "队伍"}`);
      renderDex(root);
      return;
    }
    if (e.target.closest("[data-mon-claim]")) {
      const fresh = loadSave() || {};
      const r = claimMonReward(fresh);
      if (!r.ok) return toast(r.error);
      writeSave(fresh);
      gameAudio.play("coin");
      toast(`收集奖励：${r.name || "精灵"} 加入${r.placed === "box" ? "仓库" : "队伍"}`);
      renderDex(root);
      return;
    }
    const msBtn = e.target.closest("[data-ms]");
    if (msBtn && !msBtn.disabled) {
      const fresh = loadSave() || {};
      const r = claimMilestone(fresh, Number(msBtn.dataset.ms));
      if (!r.ok) return toast(r.error);
      writeSave(fresh);
      gameAudio.play("coin");
      toast(`里程碑达成：${r.text}`);
      renderDex(root);
      return;
    }
    const card = e.target.closest(".dex-card");
    if (card) {
      const dex = Number(card.dataset.dex);
      // 已结缘 → 找到个体 id 打开完整详情；未结缘 → 只读详情
      const save = loadSave();
      const monId = Object.keys(save.mons).find((id) => save.mons[id].dex === dex) ?? null;
      const monIdNum = monId != null ? Number(monId) : null; // mons 键为字符串，team/box 存数字
      openDetail(dex, monIdNum, () => renderDex(root));
      return;
    }
    const cb = e.target.closest(".dex-chips button");
    if (cb) {
      curFilter = cb.dataset.f;
      root.querySelectorAll(".dex-chips button").forEach((b) => b.classList.toggle("on", b === cb));
      renderGrid(root, ownedSet(), seenSet()); // 每次点击取最新存档，避免闭包持有旧收集状态
    }
  });
}








