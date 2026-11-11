// 组装 engine/ 最终数据文件：tables.json 数据 + 手写可读包装
import { readFileSync, writeFileSync } from "node:fs";

const T = JSON.parse(readFileSync(new URL("../engine/data/tables.json", import.meta.url), "utf8"));
const out = (p, s) => {
  writeFileSync(new URL(p, import.meta.url), s);
  console.log("WROTE", p, s.length, "chars");
};

/* 1. 类型克制表 */
out(
  "../engine/data/type-chart.js",
  `/**
 * 属性克制表（18 系）——翻译自 play 包 Ka 表，数值逐字照抄。
 * 每系 = [克制列表, 抵抗列表, 免疫列表]；双向组合时倍率相乘（见 effectiveness）。
 * 行为等价铁律：本文件数值禁止调整（走 GDD 变更流程）。
 */
export const TYPE_CHART = ${T.TYPE_CHART};

/** 单属性对目标属性组合的倍率（翻译自 Xt，逻辑逐行等价） */
export function effectiveness(atkType, defTypes) {
  const [strong, resist, immune] = TYPE_CHART[atkType];
  let mult = 1;
  for (const dt of defTypes) {
    if (immune.includes(dt)) return 0;
    if (strong.includes(dt)) mult *= 2;
    else if (resist.includes(dt)) mult *= 0.5;
  }
  return mult;
}

/** 多攻击属性取最优倍率（翻译自 Va，逻辑逐行等价） */
export function bestEffectiveness(atkTypes, defTypes) {
  return Math.max(...atkTypes.map((t) => effectiveness(t, defTypes)));
}
`
);

/* 2. 难度表 */
out(
  "../engine/data/difficulty.js",
  `/**
 * 难度四档参数表——翻译自 play 包 Zt 表，字段逐字照抄。
 * cpuBoost=电脑队数值加成 / green=投篮绿区窗口 / aggro=AI 激进度 / react=AI 反应延迟
 * cpuShot=电脑投篮修正 / contest=干扰强度 / assist=新手辅助 / catchup=追分修正
 * 调难度=改这里的数据；字段语义与数值禁止在翻译外调整。
 */
export const DIFFICULTY = ${T.DIFFICULTY};

/** 难度档位顺序（菜单展示顺序） */
export const DIFFICULTY_ORDER = ["rookie", "pro", "allstar", "legend"];
`
);

/* 3. 位置与 OVR */
out(
  "../engine/data/positions.js",
  `/**
 * 位置体系——翻译自 play 包 me（位置序）/ aa（OVR 与加点权重表），数值逐字照抄。
 * POSITION_WEIGHTS 同时服务两处：calcOVR 加权求和、rollGrowth 随机加点抽样权重。
 */
export const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

export const POSITION_WEIGHTS = ${T.POSITION_WEIGHTS};

/** OVR 公式（翻译自 na，逐行等价）：位置加权均值 → 25~99 映射 */
export function calcOVR(pos, stats) {
  let sum = 0;
  for (const [stat, w] of Object.entries(POSITION_WEIGHTS[pos])) sum += stats[stat] * w;
  return Math.max(25, Math.min(99, Math.round((sum - 60) * 1.25 + 58)));
}

/** 取某位置的权重表（翻译自 _a） */
export function weightsOf(pos) {
  return POSITION_WEIGHTS[pos];
}
`
);

/* 4. 精灵注册表 */
out(
  "../engine/data/pokemon.js",
  `/**
 * 精灵注册表（291 条）——翻译自 play 包 Ba（基础表）/ ra（明星覆盖表）/ ia（补充表），
 * 数据逐字照抄；构建函数（calcArchetype/sizeFactor/buildEntry/getPokemon/buildPlayer）逻辑逐行等价。
 * 表项格式: [dex, name, types[], pos, spd, sht, ins, pas, def, blk, reb, hnd]
 */
import { calcOVR } from "./positions.js";
import { SPECIAL_MOVES } from "./specials-data.js";

/* 明星覆盖表（ra）：同名 dex 以本表为准 */
const STAR_ROSTER = ${T.STAR_ROSTER};

/* 补充表（ia）：不在进化体系中的特殊精灵 */
const MYTHICAL_ROSTER = ${T.MYTHICAL_ROSTER};

/* 基础表（Ba） */
const BASE_ROSTER = ${T.BASE_ROSTER};

/* 身高体重表（sa）：{ dex: [米, 千克] } */
const HEIGHT_WEIGHT = ${T.HEIGHT_WEIGHT};

/** 竞技风格判定（翻译自 oa，逐行等价）：按位置+八维返回风格名 */
export function calcArchetype(pos, stats, ovr) {
  const big = pos === "PF" || pos === "C";
  return ovr < 50
    ? "Developmental Project"
    : big && stats.blk >= 90
      ? "Rim Protector"
      : big && stats.sht >= 85
        ? "Stretch Big"
        : big && stats.pas >= 82
          ? pos === "PF"
            ? "Point Forward"
            : "Point Center"
          : big && stats.reb >= 90
            ? "Glass Cleaner"
            : big && stats.ins >= 90
              ? "Post Scorer"
              : stats.sht >= 90 && stats.ins >= 88
                ? "Three-Level Scorer"
                : stats.sht >= 88 && stats.def >= 80
                  ? "3-and-D Wing"
                  : stats.pas >= 88 && stats.hnd >= 84
                    ? "Floor General"
                    : stats.sht >= 90
                      ? "Sharpshooter"
                      : stats.def >= 90
                        ? "Lockdown Defender"
                        : stats.ins >= 88 && stats.spd >= 84
                          ? "Slasher"
                          : stats.spd >= 92
                            ? "Speedster"
                            : stats.ins >= 88
                              ? "Rim Runner"
                              : big
                                ? "Hustle Big"
                                : "Role Player";
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** 体型系数（翻译自 la，逐行等价）：按身高体重表与篮板/盖帽综合 */
export function sizeFactor(dex, stats) {
  const bigRaw = clamp01(((stats.blk + stats.reb) / 2 - 30) / 70);
  const hw = HEIGHT_WEIGHT[dex];
  const sizeRaw = hw
    ? 0.7 * clamp01(Math.log(hw[0] / 0.3) / Math.log(20)) + 0.3 * clamp01(Math.log(hw[1] / 2) / Math.log(200))
    : bigRaw;
  return 0.8 + (0.5 * (bigRaw + sizeRaw)) / 2;
}

/** 身高体重读取（翻译自 Ar，逐行等价） */
export function getMeasurements(dex) {
  const hw = HEIGHT_WEIGHT[dex];
  return { h: hw != null ? hw[0] : 0, w: hw != null ? hw[1] : 0 };
}

/** 单条表项 → 精灵档案（翻译自 ca，逐行等价） */
function buildEntry([dex, name, types, pos, spd, sht, ins, pas, def, blk, reb, hnd]) {
  const stats = { spd, sht, ins, pas, def, blk, reb, hnd };
  const ovr = calcOVR(pos, stats);
  const [special, move] = SPECIAL_MOVES[types[0]];
  return {
    dex,
    name,
    types,
    pos,
    r: stats,
    ovr,
    size: sizeFactor(dex, stats),
    archetype: calcArchetype(pos, stats, ovr),
    special,
    move,
  };
}

/* 注册表组装（翻译自 $e/Ua，逐行等价）：明星覆盖优先，其余取基础表，按 dex 升序 */
const starSet = new Set(STAR_ROSTER.map((e) => e[0]));
export const POKEMON_LIST = [...STAR_ROSTER, ...BASE_ROSTER.filter((e) => !starSet.has(e[0]))]
  .sort((a, b) => a[0] - b[0])
  .map(buildEntry);

const POKEMON_MAP = new Map([...POKEMON_LIST, ...MYTHICAL_ROSTER.map(buildEntry)].map((p) => [p.dex, p]));

/** 按 dex 取精灵基础档案（翻译自 ue，逐行等价） */
export function getPokemon(dex) {
  const p = POKEMON_MAP.get(dex);
  if (!p) throw new Error("Unknown Pokémon #" + dex);
  return p;
}

/** 按 dex+个体加成构造比赛个体（翻译自 ot，逐行等价） */
export function buildPlayer(dex, bonus) {
  const base = getPokemon(dex);
  const stats = { ...base.r };
  for (const k of Object.keys(bonus)) stats[k] = Math.min(99, stats[k] + (bonus[k] != null ? bonus[k] : 0));
  const ovr = calcOVR(base.pos, stats);
  return { ...base, r: stats, ovr, archetype: calcArchetype(base.pos, stats, ovr), size: sizeFactor(dex, stats) };
}

/** 是否补充表精灵（翻译自 ja，逐行等价） */
export function isMythical(dex) {
  return MYTHICAL_ROSTER.some((e) => e[0] === dex);
}

/** 八维标签（翻译自 Oe，逐字照抄） */
export const STAT_LABELS = ${T.STAT_LABELS};
`
);

/* 5. 进化表 */
out(
  "../engine/data/evolutions.js",
  `/**
 * 进化表——翻译自 play 包 Ha（即 Lt）表，条目逐字照抄。
 * 格式: { dex: { level: 进化等级, to: [可进化为的 dex 列表] } }
 * 进化语义：底板替换 + bonus 保留 + 等级不变 + 可换位置。
 */
export const EVOLUTIONS = ${T.EVOLUTIONS};

/** 查询某 dex 的进化条件（无则 null） */
export function evolutionOf(dex) {
  return EVOLUTIONS[dex] != null ? EVOLUTIONS[dex] : null;
}
`
);

/* 6. 必杀数据 */
out(
  "../engine/data/specials-data.js",
  `/**
 * 必杀数据——翻译自 play 包 Ps（六类效果说明）/ Wa（属性→必杀映射），逐字照抄。
 * SPECIALS: 效果 id → { label, desc }；SPECIAL_MOVES: 属性 → [效果 id, 招式名]。
 */
export const SPECIALS = ${T.SPECIALS};

export const SPECIAL_MOVES = ${T.SPECIAL_MOVES};
`
);

/* 7. 成长系统 */
out(
  "../engine/growth.js",
  `/**
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
`
);

/* 8. RNG */
out(
  "../engine/rng.js",
  `/**
 * 种子随机数——翻译自 play 包 Ya（sfc32 变体），逻辑逐行等价。
 * 同一 seed 产生同一序列——seed 对照测试与每日挑战的地基。
 */
export function seededRng(seed) {
  const next = () => {
    next.state = (next.state + 1831565813) >>> 0;
    let t = next.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.state = seed >>> 0;
  return next;
}
`
);

console.log("DONE");
