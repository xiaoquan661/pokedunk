/**
 * systems/milestones.js —— 图鉴里程碑（GDD S7 / docs/04 §9 v2.5）
 * 按「累计结缘数」阶梯发奖，不按首次点亮；每档只能领一次。
 * 存档：save.milestones = { 档位: 领取时间戳 }（不新增存档版本，旧档按空对象处理）。
 */
import { ITEM_TYPES, rarityOf, LEGENDARY_DEX } from "./build.js?v=574";
import { addMon, hasDex } from "../storage.js?v=574";
import { getPokemon } from "../../engine/readable/play-core.js?v=574";

/** 档位表（S13 定案）：累计收集数 → 篮球币 + 道具 */
export const MILESTONES = [
  { n: 10, coins: 100, items: {} },
  { n: 30, coins: 200, items: { power: 1 } },
  { n: 50, coins: 300, items: {} },
  { n: 100, coins: 500, items: { speed: 2 } },
  { n: 150, coins: 800, items: {} },
  { n: 200, coins: 1000, items: { skill: 2 } },
  { n: 291, coins: 2000, items: { power: 2, speed: 2, skill: 2 }, label: "+2000 币 · 三系药剂 ×2" },
];

/** 收集奖励横幅（图鉴页顶部，每 10 只领 1 只） */
export function monRewardBannerHtml(save) {
  const info = monRewardInfo(save);
  const state = info.claimable > 0
    ? `<button class="ms-btn" data-mon-claim>领取 ×${info.claimable}</button>`
    : `<span class="ms-r"><b>再收集 ${info.remainToNext} 只</b><small>${info.got} 只 · 每 ${info.step} 只领 1 只</small></span>`;
  return `<div class="ms-box mon-rw-box">
    <div class="ms-head"><b>收集奖励</b><span>已领 ${info.claimed} 次</span></div>
    <div class="ms-next">每收集 ${info.step} 只，随机结缘 1 只尚未见过的精灵（不出传说）</div>
    <div class="ms-bar"><i style="width:${Math.round(((info.got % info.step) / info.step) * 100)}%"></i></div>
    <div class="ms-row reached">${state}</div>
  </div>`;
}

/* ---------------- 属性收集奖励：每个属性集齐 8 种领 1 只同属性 ---------------- */
export const TYPE_STEP = 8;
export const TYPE_CN = {
  Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰",
  Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力",
  Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精",
};

const typeOfDex = (dex) => {
  const p = getPokemon(dex);
  return (p.types && p.types[0]) || "Normal";
};

/** 各属性收集进度与领取状态 */
export function typeRewardRows(save) {
  const owned = save?.dex || {};
  const claimed = save.typeRewards || (save.typeRewards = {});
  const counts = {};
  for (const dex of Object.keys(owned)) {
    const t = typeOfDex(Number(dex));
    counts[t] = (counts[t] || 0) + 1;
  }
  return Object.keys(TYPE_CN).map((type) => {
    const have = counts[type] || 0;
    return {
      type,
      cn: TYPE_CN[type],
      have,
      step: TYPE_STEP,
      reached: have >= TYPE_STEP,
      claimed: !!claimed[type],
      canClaim: have >= TYPE_STEP && !claimed[type],
      remain: Math.max(0, TYPE_STEP - have),
    };
  });
}

/** 点亮某属性的收集徽章：只给图鉴展示，不再额外送精灵 */
export function claimTypeReward(save, type) {
  const row = typeRewardRows(save).find((r) => r.type === type);
  if (!row) return { ok: false, error: "未知属性" };
  if (row.claimed) return { ok: false, error: "该属性徽章已点亮" };
  if (!row.reached) return { ok: false, error: `该属性还差 ${row.remain} 种` };
  save.typeRewards ||= {};
  save.typeRewards[type] = Date.now();
  return { ok: true, badge: true, type, cn: row.cn };
}

export function dexCount(save) {
  return Object.keys(save?.dex || {}).length;
}

/** 奖励文案：+100 币 · 力量药剂 ×1 */
export function rewardText(ms) {
  if (ms.label) return ms.label;
  const parts = [];
  if (ms.coins) parts.push(`+${ms.coins} 币`);
  for (const [id, n] of Object.entries(ms.items || {})) {
    parts.push(`${ITEM_TYPES[id]?.name || id} ×${n}`);
  }
  return parts.join(" · ") || "—";
}

/** 全部档位状态（图鉴页展示/领取用） */
export function milestoneRows(save) {
  const got = dexCount(save);
  const claimed = save.milestones || (save.milestones = {});
  return MILESTONES.map((ms) => ({
    ...ms,
    got,
    claimed: !!claimed[ms.n],
    canClaim: got >= ms.n && !claimed[ms.n],
    reached: got >= ms.n,
    remain: Math.max(0, ms.n - got),
  }));
}

/** 下一个未达成档位（主页/图鉴进度用） */
export function nextMilestone(save) {
  return milestoneRows(save).find((r) => !r.reached) || null;
}

/* ---------------- 收集奖励：每收集 10 只领 1 只精灵 ---------------- */
export const MON_STEP = 10;
const MON_RARE_ODDS = 0.22;

/** 收集进度与可领次数（图鉴页展示用） */
export function monRewardInfo(save) {
  const got = dexCount(save);
  const earned = Math.floor(got / MON_STEP);
  const claimed = save.monMilestoneClaims || 0;
  return {
    step: MON_STEP,
    got,
    earned,
    claimed,
    claimable: Math.max(0, earned - claimed),
    nextAt: (earned + 1) * MON_STEP,
    remainToNext: Math.max(0, (earned + 1) * MON_STEP - got),
  };
}

/** 从未结缘精灵中抽 1 只：普通 78% / 稀有 22%，不出传说 */
function rollUnowned(save) {
  const rows = (window.__PJ_DEX_ROWS || []).filter(
    (r) => !LEGENDARY_DEX.has(r[0]) && !hasDex(save, r[0])
  );
  if (!rows.length) return null;
  const wantRare = Math.random() < MON_RARE_ODDS;
  let pool = rows.filter((r) => (rarityOf(r[0]) === "稀有") === wantRare);
  if (!pool.length) pool = rows;
  return pool[Math.floor(Math.random() * pool.length)][0];
}

/** 领取一次收集奖励（调用方负责 writeSave） */
export function claimMonReward(save) {
  const info = monRewardInfo(save);
  if (info.claimable <= 0) {
    return { ok: false, error: `再收集 ${info.remainToNext} 只可领取` };
  }
  const dex = rollUnowned(save);
  if (!dex) return { ok: false, error: "可结缘的精灵已全部收集" };
  const r = addMon(save, dex, { from: "dex", level: 5 });
  if (!r.ok) return { ok: false, error: r.error || "领取失败" };
  save.monMilestoneClaims = (save.monMilestoneClaims || 0) + 1;
  const row = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return { ok: true, dex, name: row ? String(row[1]).replace(/#\d+$/, "") : "", placed: r.movedTo };
}

/** 领取一档：写币、发道具、记录时间；返回 { ok, coins, items } */
export function claimMilestone(save, n) {
  const row = milestoneRows(save).find((r) => r.n === n);
  if (!row) return { ok: false, error: "未知里程碑" };
  if (!row.reached) return { ok: false, error: `还差 ${row.remain} 只精灵` };
  if (row.claimed) return { ok: false, error: "该档位已领取" };
  save.milestones ||= {};
  save.milestones[n] = Date.now();
  save.coins += row.coins;
  save.bag.items ||= {};
  for (const [id, count] of Object.entries(row.items || {})) {
    save.bag.items[id] = (save.bag.items[id] || 0) + count;
  }
  return { ok: true, coins: row.coins, items: row.items || {}, text: rewardText(row) };
}
