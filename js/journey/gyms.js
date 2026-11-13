/**
 * journey/gyms.js —— 八馆 + 四天王配置（pokedunk-v2）
 * 从 match-screen.js 抽出，供赛季系统与比赛屏共用。
 */
import { LEAGUE_GYMS, buildPlayer, POKEMON_LIST } from "../../engine/readable/play-core.js?v=41";

const GYM_DEXES = {
  Rock: [95, 111, 74, 138, 247],
  Water: [7, 54, 79, 116, 183],
  Electric: [25, 81, 100, 172, 179],
  Grass: [1, 43, 69, 102, 191],
  Poison: [23, 42, 88, 109, 45],
  Psychic: [63, 96, 122, 97, 124],
  Fire: [4, 37, 58, 77, 126],
  Ground: [27, 51, 104, 231, 220],
  Ice: [124, 86, 87, 131, 91],
  Fighting: [56, 66, 106, 107, 236],
  Ghost: [92, 93, 94, 200, 302],
  Dragon: [147, 148, 149, 230, 635],
};

/** 八馆+四天王原版馆主队（唯一、最强） */
export const GYM_ROSTERS = {
  1: [246, 74, 111, 213, 222],
  2: [60, 140, 98, 184, 195],
  3: [239, 82, 405, 171, 100],
  4: [189, 182, 114, 45, 103],
  5: [169, 93, 24, 45, 110],
  6: [124, 64, 475, 97, 437],
  7: [38, 229, 257, 136, 244],
  8: [383, 445, 208, 260, 530],
  elite: [151, 243, 150, 384, 249],
};

export const GYM_BONUS = { 1: 0, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 12, 8: 14, elite: 4 };

const STAT_KEYS = ["spd", "sht", "ins", "pas", "def", "blk", "reb", "hnd"];

/** 按馆主配置挑 5 只；extra = 赛季加成（全八维 +N） */
export function pickGymRoster(stage, types, extra = 0) {
  const dexes = GYM_ROSTERS[stage] ?? GYM_DEXES[types[0]] ?? [];
  const pool = [];
  for (const d of dexes) if (!pool.includes(d)) pool.push(d);
  for (const p of POKEMON_LIST) if (pool.length < 5 && !pool.includes(p.dex)) pool.push(p.dex);
  const bonus = {};
  const b = (GYM_BONUS[stage] ?? 0) + extra;
  if (b > 0) for (const k of STAT_KEYS) bonus[k] = b;
  return pool.slice(0, 5).map((d) => buildPlayer(d, bonus));
}

/** gym 序号（"gym1".."gym8","elite"）→ LEAGUE_GYMS 行 */
export function gymOfStage(stage) {
  if (stage === "elite") return LEAGUE_GYMS.find((g) => g.elite);
  const n = Number(String(stage).replace("gym", ""));
  return LEAGUE_GYMS.find((g) => g.gym === n) ?? LEAGUE_GYMS[0];
}

export { STAT_KEYS };
