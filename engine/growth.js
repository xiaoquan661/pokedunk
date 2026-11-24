/**
 * 成长系统——经验曲线沿用原版；随机加点在 S14 改为每级 1 点，另一半转自由训练点。
 */
import { getPokemon } from "./data/pokemon.js";
import { STAT_LABELS } from "./data/pokemon.js";
import { weightsOf } from "./data/positions.js";

/** 升到下一级所需 XP（S18 再次下调：15 + 6×等级差） */
export const xpToNext = (level) => 15 + 6 * (level - 1);

/**
 * 升级随机加点：
 * 每级掷 1 次——按位置权重+0.04 平滑项抽样一项属性，
 * 该属性已达 99（基础+bonus）则跳过，否则 bonus+1。
 * 另一半成长改为“自由训练点”，由升级流程单独发放（S14）。
 * rng 参数默认 Math.random（与原版一致），比赛内结算传引擎 rng。
 * 返回播报数组，如 ["+1 Shooting"]。
 */
export function rollGrowth(player, rng = Math.random) {
  const base = getPokemon(player.dex);
  const weights = weightsOf(base.pos);
  const statKeys = Object.keys(STAT_LABELS);
  const messages = [];
  for (let i = 0; i < 1; i++) {
    // 每项权重 = 位置权重 + 0.04 平滑项（保证弱权重也可能被抽中）
    const pool = statKeys.map((k) => (weights[k] != null ? weights[k] : 0) + 0.04);
    let roll = rng() * pool.reduce((a, b) => a + b, 0);
    let picked = statKeys[0];
    for (let j = 0; j < statKeys.length; j++) {
      roll -= pool[j];
      if (roll <= 0) {
        picked = statKeys[j];
        break;
      }
    }
    const capped = base.r[picked] + (player.bonus[picked] != null ? player.bonus[picked] : 0) >= 99;
    if (!capped) {
      player.bonus[picked] = (player.bonus[picked] != null ? player.bonus[picked] : 0) + 1;
      messages.push("+1 " + STAT_LABELS[picked]);
    }
  }
  return messages;
}
