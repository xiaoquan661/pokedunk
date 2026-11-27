/**
 * systems/milestones.js —— 图鉴属性收集徽章
 * 每个属性集齐 8 种点亮对应徽章，仅图鉴展示，不发资源。
 * 存档：save.typeRewards = { 属性: 点亮时间戳 }。
 */
import { getPokemon } from "../../engine/readable/play-core.js?v=688";

/* ---------------- 属性收集徽章：每个属性集齐 8 种点亮一枚 ---------------- */
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

