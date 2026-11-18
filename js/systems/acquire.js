/**
 * systems/acquire.js —— 获得精灵时的最低等级校正
 *
 * 商店 / 孵蛋 / 赛后合同可能直接给出进化后的形态。
 * 这类个体不能以 Lv.1 入队，否则等级与形态不匹配：
 *   - 三段进化：第二形态最低 Lv.10，最终形态最低 Lv.20
 *   - 两段进化：进化形态最低 Lv.15
 * 宝宝进化来的基础形态（皮丘→皮卡丘等）仍按 Lv.1 处理。
 */
import { EVOLUTIONS } from "../../engine/data/evolutions.js";

const BABY_DEX = new Set([172, 173, 174, 175, 236, 238, 239, 240]);
const BABY_EVOLVED = new Set();
for (const [from, ev] of Object.entries(EVOLUTIONS)) {
  if (!BABY_DEX.has(Number(from))) continue;
  for (const to of ev.to || []) BABY_EVOLVED.add(Number(to));
}

/** 该 dex 作为「直接获得的个体」时，允许的最低等级 */
export function minAcquireLevel(dex) {
  const d = Number(dex);
  if (BABY_EVOLVED.has(d)) return 1;
  let level = 1;
  for (const ev of Object.values(EVOLUTIONS)) {
    if ((ev.to || []).includes(d)) level = Math.max(level, Number(ev.level) || 1);
  }
  return level;
}

/** 把已入队个体抬到该形态的最低等级；返回最终等级 */
export function syncAcquireLevel(save, monId, dex) {
  const mon = save?.mons?.[monId];
  if (!mon) return 1;
  const level = minAcquireLevel(dex ?? mon.dex);
  if ((mon.level || 1) < level) mon.level = level;
  return mon.level;
}
