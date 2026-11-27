/**
 * journey/gyms.js —— 八馆 + 四天王配置（pokedunk-v2）
 * 从 match-screen.js 抽出，供主线与比赛屏共用。
 */
import { LEAGUE_GYMS, buildPlayer, POKEMON_LIST } from "../../engine/readable/play-core.js?v=688";

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

/** 八馆+四天王：原作馆主代表阵容（各取 5 只，含招牌精灵） */
export const GYM_ROSTERS = {
  // 小刚：岩石
  1: [74, 75, 95, 111, 140],   // 小拳石 / 隆隆石 / 大岩蛇 / 独角犀牛 / 化石盔
  // 小霞：水
  2: [120, 121, 118, 119, 60], // 海星星 / 宝石海星 / 角金鱼 / 金鱼王 / 蚊香蝌蚪
  // 马志士：电
  3: [100, 101, 81, 82, 26],   // 霹雳电球 / 顽皮雷弹 / 小磁怪 / 三合一磁怪 / 雷丘
  // 莉佳：草
  4: [43, 44, 45, 114, 71],    // 走路草 / 臭臭花 / 霸王花 / 蔓藤怪 / 大食花
  // 阿桔：毒
  5: [109, 110, 88, 89, 49],   // 瓦斯弹 / 双弹瓦斯 / 臭泥 / 臭臭泥 / 摩鲁蛾
  // 娜姿：超能
  6: [63, 64, 65, 122, 97],    // 凯西 / 勇基拉 / 胡地 / 魔墙人偶 / 引梦貘人
  // 夏伯：火
  7: [58, 59, 77, 78, 126],    // 卡蒂狗 / 风速狗 / 小火马 / 烈焰马 / 鸭嘴火兽
  // 坂木：地面
  8: [111, 112, 31, 34, 115],  // 独角犀牛 / 钻角犀兽 / 尼多后 / 尼多王 / 袋兽
  // 四天王联队
  elite: [131, 68, 94, 149, 130], // 拉普拉斯 / 怪力 / 耿鬼 / 快龙 / 暴鲤龙
};

/**
 * 首个地区的原始目标平均战力：
 * 60 / 63 / 66 / 69 / 72 / 75 / 78 / 81，四天王 88。
 * 下面的加成是把各馆原版阵容校准到该目标后反推的值。
 * 进入下一地区后 +2 全属性（由 season.js 的 extra 注入）。
 */
export const GYM_TARGETS = { 1: 60, 2: 63, 3: 66, 4: 69, 5: 72, 6: 75, 7: 78, 8: 81, elite: 88 };
export const GYM_BONUS = { 1: -3, 2: -4, 3: -7, 4: 2, 5: 2, 6: -1, 7: 3, 8: 2, elite: 2 };

const STAT_KEYS = ["spd", "sht", "ins", "pas", "def", "blk", "reb", "hnd"];

/** 按馆主配置挑 5 只；extra = 地区周目加成（全八维 +N） */
export function pickGymRoster(stage, types, extra = 0) {
  const dexes = GYM_ROSTERS[stage] ?? GYM_DEXES[types[0]] ?? [];
  const pool = [];
  for (const d of dexes) if (!pool.includes(d)) pool.push(d);
  for (const p of POKEMON_LIST) if (pool.length < 5 && !pool.includes(p.dex)) pool.push(p.dex);
  const bonus = {};
  const b = (GYM_BONUS[stage] ?? 0) + extra;
  if (b !== 0) for (const k of STAT_KEYS) bonus[k] = b;
  return pool.slice(0, 5).map((d) => buildPlayer(d, bonus));
}

/** gym 序号（"gym1".."gym8","elite"）→ LEAGUE_GYMS 行 */
export function gymOfStage(stage) {
  if (stage === "elite") return LEAGUE_GYMS.find((g) => g.elite);
  const n = Number(String(stage).replace("gym", ""));
  return LEAGUE_GYMS.find((g) => g.gym === n) ?? LEAGUE_GYMS[0];
}

export { STAT_KEYS };
