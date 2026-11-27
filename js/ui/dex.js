/**
 * dex.js —— 图鉴页（pokedunk-v2）
 * 基于旧 pokedunk dex-ui.js 设计，按用户定稿简化：
 *   - 不做地区页签（原版 291 只就 291 只，全部平铺一张表）
 *   - 筛选：全部 / 已获得 / 按系别（18 属性 chips，属性色，取引擎 getPokemon(types[0])）
 * 数据源 = 新存档 save.dex；快照 dex-data.js 提供中文名/位置/综合。
 */
import { loadSave, writeSave } from "../storage.js?v=697";
import { gameAudio } from "../platform/audio.js?v=697";
import { getPokemon } from "../../engine/readable/play-core.js?v=697";
import { rarityOf, RARITY_COLOR } from "../systems/build.js?v=697";
import { openDetail } from "./detail.js?v=697";
import { typeRewardRows, claimTypeReward } from "../systems/milestones.js?v=697";
import { claimChapterReward, DEX_CHAPTER_REWARDS } from "../systems/dex-chapters.js?v=697";

const ROWS = window.__PJ_DEX_ROWS || [];
let curFilter = "all"; // "all" | "own" | "Type:Fire" ...
let curChapter = null; // 当前展开的地区 id；null = 全部收起

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

/* 地区下拉（S92）：图鉴按全国编号分组，点一行展开该地区条目 */
const DEX_REGIONS = [
  { id: "kanto", name: "关都", from: 1, to: 151, color: "#c94f42" },
  { id: "johto", name: "城都", from: 152, to: 251, color: "#a9822d" },
  { id: "hoenn", name: "丰缘", from: 252, to: 386, color: "#3f945c" },
  { id: "sinnoh", name: "神奥", from: 387, to: 493, color: "#4a63b5" },
  { id: "unova", name: "合众", from: 494, to: 649, color: "#3b587a" },
  { id: "other", name: "其他地区", from: 650, to: 1025, color: "#75664f" },
];
const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4.5" y="10" width="15" height="10" rx="2" fill="currentColor"/></svg>';

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
    '<img loading="lazy" src="./sprites/' + dex + '.png" alt="' + name + '">' +
    '<div class="nm">' + name + "</div>" +
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
  if (!body) return;
  const region = DEX_REGIONS.find((x) => x.id === curChapter) || null;
  let list = region
    ? ROWS.filter((r) => Number(r[0]) >= region.from && Number(r[0]) <= region.to)
    : [];
  if (curFilter === "own") list = list.filter((r) => owned[r[0]]);
  else if (curFilter.startsWith("Rarity:")) {
    const rar = curFilter.slice(7);
    list = list.filter((r) => rarityOf(r[0]) === rar);
  } else if (curFilter.startsWith("Type:")) {
    const t = curFilter.slice(5);
    list = list.filter((r) => typeOf(r[0]) === t);
  }
  body.innerHTML = list.length
    ? list.map((r) => cardHtml(r, owned, seen)).join("")
    : '<div class="dex-empty">这里还没有收集记录。<br>比赛签约、孵蛋和商店获得的精灵会点亮图鉴。</div>';
}

/** 各地区收集进度；未解锁地区不出条目 */
function dexRegionRows(save, owned) {
  const regionNo = Number(save?.journey?.regionNo) || 1;
  return DEX_REGIONS.map((r, i) => {
    const list = ROWS.filter((row) => Number(row[0]) >= r.from && Number(row[0]) <= r.to);
    const total = list.length;
    const got = list.filter((row) => owned[row[0]]).length;
    return {
      ...r, no: i + 1, total, got,
      pct: total ? Math.round((got / total) * 100) : 0,
      unlocked: i + 1 <= regionNo || got > 0,
    };
  }).filter((r) => r.total > 0);
}

function regionListHtml(rows, owned) {
  return `<div class="dx-regions">${rows.map((r) => {
    const open = !!curChapter && curChapter === r.id && r.unlocked;
    const list = open ? ROWS.filter((row) => Number(row[0]) >= r.from && Number(row[0]) <= r.to) : null;
    return `<button type="button" class="dx-region${open ? " on" : ""}${r.unlocked ? "" : " locked"}" data-chapter="${r.id}" style="--rc:${r.color}">
      <span class="dx-region-head">
        <b>${r.name}</b>
        <span>${r.unlocked ? `${r.got} / ${r.total}` : `${LOCK_SVG}<em>地区未解锁</em>`}</span>
      </span>
      <span class="dx-region-bar"><i style="width:${r.pct}%"></i></span>
      <small>${r.unlocked ? `已收集 ${r.pct}%` : `图鉴 ${r.total} 只`}</small>
      <span class="dx-region-arrow" aria-hidden="true">›</span>
    </button>${open ? `<div class="dx-region-panel" style="--rc:${r.color}">
      <div class="dex-chips">
        <button data-f="all"${curFilter === "all" ? ' class="on"' : ""}>全部</button>
        <button data-f="own"${curFilter === "own" ? ' class="on"' : ""}>已获得</button>
      </div>
      <div class="dex-chips rarity-chips">${rarityChipsHtml(owned, list)}</div>
      <div class="dex-chips type-chips">${chipsHtml(owned, list)}</div>
      <div class="dex-grid" id="dex-grid"></div>
    </div>` : ""}`;
  }).join("")}</div>`;
}

function rarityChipsHtml(owned, list = ROWS) {
  const cnt = {};
  for (const r of list) {
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

function chipsHtml(owned, list = ROWS) {
  // 属性 chips：已获得的属性先亮出数量
  const cnt = {};
  for (const r of list) {
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

/** 属性收集徽章：每个属性集齐 8 种点亮徽章（纯展示，不送精灵） */
function typeRewardHtml(save) {
  const rows = typeRewardRows(save);
  const ready = rows.filter((r) => r.canClaim);
  const done = rows.filter((r) => r.claimed).length;
  return `
    <div class="ms-box ty-rw-box">
      <div class="ms-head"><b>属性收集徽章</b><span>已点亮 ${done} / ${rows.length}</span></div>
      <div class="ms-next">每个属性集齐 ${rows[0]?.step || 8} 种，点亮对应属性徽章 · 纯收藏，不发资源${ready.length ? ` · <b style="color:var(--gold)">${ready.length} 个可点亮</b>` : ""}</div>
      ${ready.length ? `<button class="ms-btn" data-ty-claim="${ready[0].type}" style="align-self:flex-start">点亮 ${ready[0].cn}</button>` : ""}
      <div class="ty-grid">
        ${rows.map((r) => `
          <button class="ty-chip ${r.canClaim ? "ready" : ""} ${r.claimed ? "done" : ""}"
            ${r.canClaim ? `data-ty-claim="${r.type}"` : "disabled"}>
            <b>${r.cn}</b><small>${r.claimed ? "已点亮" : `${r.have}/${r.step}`}</small>
          </button>`).join("")}
      </div>
    </div>`;
}

const MEDAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l-2 6h-4L8 3Z"/><circle cx="12" cy="15" r="5"/><path d="m12 12 1.1 2.1 2.3.3-1.7 1.6.4 2.3-2.1-1.1-2.1 1.1.4-2.3-1.7-1.6 2.3-.3L12 12Z"/></svg>';

function chapterCardsHtml(rows) {
  return `<div class="dex-chapters">
    ${rows.map((ch) => `<button type="button" class="dex-chapter${curChapter === ch.id ? " on" : ""}${ch.medal ? " medal" : ""}" data-chapter="${ch.id}" style="--cc:${ch.color}">
      <span class="dc-name">${ch.name}${ch.note ? `<small>${ch.note}</small>` : ""}</span>
      <span class="dc-count">${ch.got} / ${ch.total}</span>
      <span class="dc-bar"><i style="width:${ch.pct}%"></i></span>
      ${ch.medal ? `<span class="dc-medal">${MEDAL_SVG}完成</span>` : `<span class="dc-pct">${ch.pct}%</span>`}
    </button>`).join("")}
  </div>
  <p class="dex-chapter-note">点篇章查看独立进度与纪念章 · 仅展示，不发资源 · 只统计当前图鉴中该地区的条目${(() => {
    const covered = rows.reduce((s, c) => s + c.total, 0);
    const extra = ROWS.length - covered;
    return extra > 0 ? ` · 另有 ${extra} 只后续地区暂未分篇` : "";
  })()}</p>`;
}

function chapterPanelHtml(ch) {
  if (!ch) return "";
  const half = DEX_CHAPTER_REWARDS.half;
  const full = DEX_CHAPTER_REWARDS.full;
  return `<div class="dex-chapter-panel" style="--cc:${ch.color}">
    <div class="dcp-head"><b>${ch.name}${ch.note ? ` · ${ch.note}` : ""}</b><span>${ch.got} / ${ch.total} · ${ch.pct}%</span></div>
    <div class="dcp-bar"><i style="width:${ch.pct}%"></i></div>
    <div class="dcp-rewards">
      <button type="button" data-chapter-claim="${ch.id}:half" ${ch.canClaimHalf ? "" : "disabled"}>
        <b>50%</b><span>${ch.halfClaimed ? "已点亮" : half.label}</span>
      </button>
      <button type="button" data-chapter-claim="${ch.id}:full" ${ch.canClaimFull ? "" : "disabled"}>
        <b>100%</b><span>${ch.fullClaimed ? "已领取 · 勋章已获得" : full.label}</span>
      </button>
    </div>
    <p class="dcp-note">${ch.medal ? `${MEDAL_SVG} 完成勋章已获得` : `集齐 ${ch.total} 只可获得 ${ch.name}完成勋章`}${ch.halfReached ? "" : ` · 50% 还差 ${Math.max(0, ch.halfGoal - ch.got)} 只`}</p>
  </div>`;
}

/** 渲染图鉴页到 root（全屏页，主界面菜单项进入） */
export function renderDex(root) {
  const scrollTop = root.scrollTop || 0;
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
      .dex-card.off .nm{color:var(--text-dim)}
      .ty-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:8px}
      .ty-chip{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:5px;
        border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--text-dim)}
      .ty-chip b{font-size:10px;font-weight:700;color:var(--text)}
      .ty-chip small{font:700 8.5px var(--sport);font-variant-numeric:tabular-nums}
      .ty-chip.ready{border-color:var(--gold);background:rgba(245,197,66,.14)}
      .ty-chip.ready b,.ty-chip.ready small{color:var(--gold)}
      .ty-chip.done{opacity:.45}
      .dex-chapters{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:2px 0 3px}
      .dex-chapter{position:relative;display:flex;flex-direction:column;gap:3px;min-width:0;padding:8px 7px 7px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.2);color:var(--text);text-align:left}
      .dex-chapter.on{border-color:var(--cc);background:color-mix(in srgb,var(--cc) 16%,rgba(0,0,0,.2));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cc) 40%,transparent)}
      .dex-chapter .dc-name{font:700 11px var(--sport);color:var(--cc);display:flex;align-items:baseline;gap:3px;white-space:nowrap;overflow:hidden}
      .dex-chapter .dc-name small{font:400 8px var(--sport);color:var(--text-dim)}
      .dex-chapter .dc-count{font:700 10px var(--sport);color:var(--text);font-variant-numeric:tabular-nums}
      .dex-chapter .dc-bar,.dcp-bar{display:block;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}
      .dex-chapter .dc-bar i,.dcp-bar i{display:block;height:100%;border-radius:2px;background:var(--cc)}
      .dex-chapter .dc-pct{font:700 9px var(--sport);color:var(--text-dim)}
      .dex-chapter .dc-medal{display:flex;align-items:center;gap:2px;font:700 8.5px var(--sport);color:var(--gold)}
      .dex-chapter .dc-medal svg{width:11px;height:11px}
      .dex-chapter-note{margin:0 0 9px;font-size:9.5px;color:var(--text-dim)}
      .dex-chapter-panel{padding:10px 11px;margin:0 0 10px;border:1px solid color-mix(in srgb,var(--cc) 45%,transparent);border-radius:8px;background:color-mix(in srgb,var(--cc) 9%,rgba(0,0,0,.2))}
      .dcp-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px}
      .dcp-head b{font:700 12px var(--sport);color:var(--cc)}
      .dcp-head span{font:700 10px var(--sport);color:var(--text)}
      .dcp-rewards{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
      .dcp-rewards button{display:flex;flex-direction:column;gap:1px;padding:6px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2);color:var(--text);text-align:left}
      .dcp-rewards button b{font:700 10px var(--sport);color:var(--gold)}
      .dcp-rewards button span{font-size:9px;color:var(--text-dim);line-height:1.35}
      .dcp-rewards button:disabled{opacity:.45}
      .dcp-note{display:flex;align-items:center;gap:4px;margin:7px 0 0;font-size:9.5px;color:var(--text-dim)}
      .dcp-note svg{width:12px;height:12px;color:var(--gold);flex:none}
      .dx-regions{display:flex;flex-direction:column;gap:8px}
      .dx-region{position:relative;display:flex;flex-direction:column;gap:5px;width:100%;padding:13px 14px 12px;border-radius:11px;
        border:1px solid color-mix(in srgb,var(--rc) 70%,transparent);color:#fff;text-align:left;overflow:hidden;
        background:linear-gradient(105deg,color-mix(in srgb,var(--rc) 92%,#0a1020),color-mix(in srgb,var(--rc) 55%,#0a1020));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 4px 12px rgba(0,0,0,.28)}
      .dx-region.on{border-radius:11px 11px 0 0}
      .dx-region-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-right:18px}
      .dx-region-head b{font:700 19px var(--sport);letter-spacing:.5px}
      .dx-region-head>span{display:flex;align-items:center;gap:4px;font:700 11px var(--sport);color:rgba(255,255,255,.9);font-variant-numeric:tabular-nums}
      .dx-region-head>span svg{width:13px;height:13px;flex:none;color:rgba(255,255,255,.75)}
      .dx-region-head>span em{font-style:normal}
      .dx-region-bar{display:block;height:5px;border-radius:3px;background:rgba(0,0,0,.3);overflow:hidden}
      .dx-region-bar i{display:block;height:100%;border-radius:3px;background:rgba(255,255,255,.88);transition:width .25s}
      .dx-region>small{font:700 9px var(--sport);color:rgba(255,255,255,.7)}
      .dx-region-arrow{position:absolute;right:12px;bottom:9px;font:700 18px/1 var(--sport);color:rgba(255,255,255,.6);transform:rotate(90deg);transition:transform .2s}
      .dx-region.on .dx-region-arrow{transform:rotate(-90deg)}
      .dx-region.locked{filter:saturate(.35);opacity:.72}
      .dx-region.locked .dx-region-bar i{width:0!important}
      .dx-region-panel{padding:10px 10px 12px;margin:-2px 0 4px;border:1px solid color-mix(in srgb,var(--rc) 40%,transparent);
        border-top:none;border-radius:0 0 11px 11px;background:rgba(0,0,0,.22)}
      .dx-region-panel .dex-chips{margin-bottom:8px}
      .dx-region-panel .dex-chips button{padding:4px 10px;font-size:10.5px}
      .dx-region-panel .dex-chips.type-chips{margin-top:0;gap:4px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}
      .dx-region-panel .dex-chips.type-chips::-webkit-scrollbar{display:none}
      .dx-region-panel .dex-chips.type-chips button{flex:none;padding:4px 8px;font-size:10px}
      .dx-region-panel .dex-grid{margin-top:9px}
    </style>
    <div class="page-head">
      <button class="back" data-back>‹</button>
      <h2>图鉴</h2>
      <span class="count">${got} / ${ROWS.length}</span>
    </div>
    ${regionListHtml(dexRegionRows(save, owned), owned)}`;

  renderGrid(root, owned, seen);
  root.scrollTop = scrollTop;

  // 只绑定一次：renderDex 会被 onClose 重入，重复绑定会导致一次点击叠多层详情
  if (root.__dexBound) return;
  root.__dexBound = true;
  root.addEventListener("click", (e) => {
    const chCard = e.target.closest("[data-chapter]");
    if (chCard) {
      const id = chCard.dataset.chapter;
      if (chCard.classList.contains("locked")) { toast("该地区尚未解锁"); return; }
      curChapter = curChapter === id ? null : id;
      curFilter = "all";
      renderDex(root);
      return;
    }
    const chClaim = e.target.closest("[data-chapter-claim]");
    if (chClaim && !chClaim.disabled) {
      const [id, tier] = chClaim.dataset.chapterClaim.split(":");
      const fresh = loadSave() || {};
      const r = claimChapterReward(fresh, id, tier);
      if (!r.ok) return toast(r.error);
      writeSave(fresh);
      gameAudio.play("special");
      toast(`${r.chapter}：${r.medal ? "完成勋章已获得" : "50% 纪念章已点亮"}`);
      renderDex(root);
      return;
    }
    const tyBtn = e.target.closest("[data-ty-claim]");
    if (tyBtn) {
      const fresh = loadSave() || {};
      const r = claimTypeReward(fresh, tyBtn.dataset.tyClaim);
      if (!r.ok) return toast(r.error);
      writeSave(fresh);
      gameAudio.play("special");
      toast(`${r.cn}属性徽章已点亮`);
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








