/**
 * 成长系统——翻译自 play 包 Fs（经验曲线）/ mn（随机加点），逻辑逐行等价。
 */
import { getPokemon } from "./data/pokemon.js";
import { STAT_LABELS } from "./data/pokemon.js";
import { weightsOf } from "./data/positions.js";

/** 升到下一级所需 XP（翻译自 Fs，逐行等价） */
export const xpToNext = (level) => 60 + 25 * (level - 1);

/**
 * 升级随机加点（翻译自 mn，逐行等价）：
 * 掷 2 次——每次按位置权重+0.04 平滑项抽样一项属性，
 * 该属性已达 99（基础+bonus）则跳过，否则 bonus+1。
 * rng 参数默认 Math.random（与原版一致），比赛内结算传引擎 rng。
 * 返回播报数组，如 ["+1 Shooting", "+1 Speed"]。
 */
export function rollGrowth(player, rng = Math.random) {
  const base = getPokemon(player.dex);
  const weights = weightsOf(base.pos);
  const statKeys = Object.keys(STAT_LABELS);
  const messages = [];
  for (let i = 0; i < 2; i++) {
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
