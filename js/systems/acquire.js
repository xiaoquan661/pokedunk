/**
 * systems/acquire.js —— 获得精灵时的最低等级校正
 *
 * 商店 / 孵蛋 / 赛后合同可能直接给出进化后的形态。
 * 这类个体不能以 Lv.1 入队，否则等级与形态不匹配：
 *   - 三段进化：第二形态最低 Lv.15，最终形态最低 Lv.30
 *   - 两段进化：进化形态最低 Lv.25
 * 宝宝进化来的基础形态（皮丘→皮卡丘等）仍按 Lv.1 处理。
 */
import { EVOLUTIONS } from "../../engine/data/evolutions.js";
import { rollGrowth } from "../../engine/growth.js?v=695";

const BABY_DEX = new Set([172, 173, 174, 175, 236, 238, 239, 240]);
const BABY_EVOLVED = new Set();
for (const [from, ev] of Object.entries(EVOLUTIONS)) {
  if (!BABY_DEX.has(Number(from))) continue;
  for (const to of ev.to || []) BABY_EVOLVED.add(Number(to));
}

/** 获取来源保底等级：孵蛋/合同到手的个体不再从 1 级开始 */
const SOURCE_MIN_LEVEL = {
  egg_normal: 2,
  egg_premium: 5,
  sign: 5,
};

/** 该 dex 作为「直接获得的个体」时，允许的最低等级 */
export function minAcquireLevel(dex, source) {
  const d = Number(dex);
  const sourceMin = SOURCE_MIN_LEVEL[source] || 1;
  if (BABY_EVOLVED.has(d)) return sourceMin;
  let level = sourceMin;
  for (const ev of Object.values(EVOLUTIONS)) {
    if ((ev.to || []).includes(d)) level = Math.max(level, Number(ev.level) || 1);
  }
  return level;
}

/** 把已入队个体抬到该形态的最低等级；返回最终等级 */
export function syncAcquireLevel(save, monId, dex, source) {
  const mon = save?.mons?.[monId];
  if (!mon) return 1;
  const sourceMin = SOURCE_MIN_LEVEL[source] || 1;
  const before = mon.level || 1;
  // 来源保底 + 形态门槛都要附带等级成长，否则只是数字变大、属性不变
  const level = Math.max(sourceMin, minAcquireLevel(dex ?? mon.dex, source));
  if (level > before) {
    mon.bonus ||= {};
    mon.train ||= { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 };
    for (let lv = before; lv < level; lv++) {
      rollGrowth({ dex: dex ?? mon.dex, bonus: mon.bonus }, Math.random);
      mon.train.free = (mon.train.free || 0) + 1;
      mon.train.freeEarned = (mon.train.freeEarned || 0) + 1;
    }
    mon.level = level;
  }
  return mon.level;
}
