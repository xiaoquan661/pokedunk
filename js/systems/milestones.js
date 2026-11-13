/**
 * systems/milestones.js —— 图鉴里程碑（GDD S7 / docs/04 §9 v2.5）
 * 按「累计结缘数」阶梯发奖，不按首次点亮；每档只能领一次。
 * 存档：save.milestones = { 档位: 领取时间戳 }（不新增存档版本，旧档按空对象处理）。
 */
import { ITEM_TYPES } from "./build.js?v=31";

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
