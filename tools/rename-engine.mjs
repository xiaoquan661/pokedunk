// 机械重命名：play.fmt.js → engine/readable/play-core.js
// 只重命名"已知语义"的顶层符号（词边界），函数内部单字母局部变量保持原样（作用域内自洽），
// 结构可读性由类字段名+重命名后的顶层名保证。安全网 = seed 对照测试。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync(new URL("./reference/play-package/play.fmt.js", import.meta.url), "utf8");

// 符号映射表：minified 名 → 语义名（覆盖所有已确认语义的顶层符号）
const MAP = {
  // 数据表
  Ba: "BASE_ROSTER",
  Ha: "EVOLUTIONS_TABLE",
  sa: "HEIGHT_WEIGHT",
  Oe: "STAT_LABELS",
  Ps: "SPECIAL_EFFECTS",
  Wa: "SPECIAL_MOVES",
  aa: "POSITION_WEIGHTS",
  ra: "STAR_ROSTER",
  ia: "MYTHICAL_ROSTER",
  Ka: "TYPE_CHART",
  Zt: "DIFFICULTY_LEVELS",
  ma: "LEAGUE_GYMS",
  me: "POSITION_ORDER",
  ha: "TYPE_COLORS",
  qa: "STAR_DEX_SET",
  $e: "POKEMON_LIST",
  Ua: "POKEMON_MAP",
  Lt: "EVOLUTIONS",
  // 精灵构建
  ja: "isMythical",
  Bt: "clamp01",
  la: "sizeFactor",
  Ar: "getMeasurements",
  ca: "buildPokemonEntry",
  ue: "getPokemon",
  ot: "buildPlayer",
  _a: "weightsOf",
  na: "calcOVR",
  oa: "calcArchetype",
  // 基础数学/工具
  H: "clampNum",
  ut: "lerpNum",
  Ya: "seededRng",
  // 注意：z 既是顶层距离函数又是玩家/事件对象的字段名（z=高度）——
  // 不能整词替换，只改"函数调用形态"，字段保留原名（见下方特殊处理）
  It: "sideSign",
  ie: "hoopXOf",
  ua: "isOutsideCourt",
  // 场地常量
  X: "COURT_HALF_WIDTH",
  he: "COURT_MID_X",
  N: "COURT_MID_Y",
  He: "HOOP_OFFSET",
  wt: "COURT_SCALE_W",
  Ye: "HOOP_RING_DIAMETER",
  et: "COURT_SCALE_H",
  Ja: "SPAWN_POSITIONS",
  es: "FREE_THROW_SPOTS",
  // 引擎
  Dt: "MatchEngine",
  at: "ENGINE_VERSION",
  Me: "makeEmptyInput",
  Zs: "challengeStorage",
  qe: "storageRead",
  Fs: "xpToNext",
  pa: "makeEmptyStats",
  ee: "buildTeamPlayerView",
  ps: "pickHealthyStarters",
  mn: "rollGrowth",
  Vr: "settleMatch",
  Te: "FRAME_DELTA",
  At: "INPUT_BITS",
  da: "saveKeyRoute",
  // 其余按位置命名（语义待翻译期确认，先保可检索）
};

// word-boundary 替换（兼容 $ 开头符号）：前后不能是标识符字符
function renameAll(text, map) {
  let out = text;
  for (const [from, to] of Object.entries(map)) {
    const re = new RegExp("(?<![A-Za-z0-9_$])" + from.replace(/\$/g, "\\$") + "(?![A-Za-z0-9_$])", "g");
    out = out.replace(re, to);
  }
  return out;
}

let out = src;

// 1) import 行改指向本地 store
out = out.replace(
  /import\{[^}]*\}from"\.\/store-CNfAwiAs\.js";/,
  'import { f as profanityFn, y as challengeStorage, t as storageRead, e as escapeHtml, l as teamNameClean, b as DRILL_TABLE, s as drillScore, a as drillSpawn, d as shuffleArr, h as drillConfig } from "./store-bridge.js";'
);
// store 内部名在 play 里以别名使用（fs/Zs/qe/B/st/nt/ea/ta/Qt/za），统一映射
// 注意：B = store 导出 e = HTML 转义函数（store.fmt.js H），不是敏感词校验（那是 l）！
out = renameAll(out, {
  fs: "profanityFn",
  qe: "storageRead",
  B: "escapeHtml",
  st: "teamNameClean",
  nt: "DRILL_TABLE",
  ea: "drillScore",
  ta: "drillSpawn",
  Qt: "shuffleArr",
  za: "drillConfig",
});

// 2) 主映射替换
out = renameAll(out, MAP);

// 2b) z 特殊处理：仅重命名函数声明与调用形态（z( → dist2d( ），字段 z:/ .z 保留
out = out.replace(/(?<![A-Za-z0-9_$.])const z = /, "const dist2d = ");
out = out.replace(/(?<![A-Za-z0-9_$.])z\(/g, "dist2d(");

// 2c) 触屏按钮标签修复：重命名把字符串里的按键字母误替换（X→COURT_HALF_WIDTH、B→escapeHtml）
out = out.replace('<b>COURT_HALF_WIDTH</b><span>SHOOT</span>', "<b>X</b><span>投篮</span>");
out = out.replace('<b>escapeHtml</b><span>STEAL</span>', "<b>B</b><span>抢断</span>");
out = out.replace('<b>RB</b><span>TURBO</span>', "<b>RB</b><span>加速</span>");
out = out.replace('<b>Y</b><span>SPECIAL</span>', "<b>Y</b><span>必杀</span>");
out = out.replace('<b>A</b><span>PASS</span>', "<b>A</b><span>传球</span>");

// 2d) 字符串字面量污染修复：B/st 在字符串里的误替换（等级评级与序数词）——全局替换
out = out.split('[89, "escapeHtml+"]').join('[89, "B+"]');
out = out.split('[88, "escapeHtml"]').join('[88, "B"]');
out = out.split('[87, "escapeHtml-"]').join('[87, "B-"]');
out = out.split('["th", "teamNameClean", "nd", "rd"]').join('["th", "st", "nd", "rd"]');
// It→sideSign 的字符串污染（"It's super effective!" 等解说文案）
out = out.split("sideSign's super effective!").join("It's super effective!");
out = out.split("sideSign's not very effective...").join("It's not very effective...");
out = out.split("sideSign doesn't affect ").join("It doesn't affect ");
out = out.split("sideSign's not effective...").join("It's not effective...");

// 3) 把关键内部接口追加进 export 表（Dt 类原本不导出，新系统层需要直连）
out = out.replace(
  /export\{/,
  "export {\n  MatchEngine,\n  getPokemon,\n  buildPlayer,\n  calcOVR,\n  calcArchetype,\n  sizeFactor,\n  rollGrowth,\n  xpToNext,\n  settleMatch,\n  seededRng,\n  DIFFICULTY_LEVELS,\n  TYPE_CHART,\n  POKEMON_LIST,\n  POSITION_WEIGHTS,\n  STAT_LABELS,\n  SPECIAL_EFFECTS,\n  SPECIAL_MOVES,\n  EVOLUTIONS,\n  LEAGUE_GYMS,\n  POSITION_ORDER,\n  makeEmptyInput,\n  INPUT_BITS,\n  ENGINE_VERSION,\n  clampNum,\n  distance2d,\n  lerpNum,\n  weightsOf,\n  isMythical,\n  getMeasurements,\n  buildPokemonEntry,\n  buildTeamPlayerView,\n  pickHealthyStarters,\n  makeEmptyStats,\n  saveKeyRoute,"
);

// 4) 输出
mkdirSync(new URL("../engine/readable/", import.meta.url), { recursive: true });
writeFileSync(new URL("../engine/readable/play-core.js", import.meta.url), out);
console.log("WROTE play-core.js", out.length, "chars");

// 4) 语法校验（ESM）
const { execSync } = await import("node:child_process");
try {
  execSync("node --check ../engine/readable/play-core.js", { cwd: new URL(".", import.meta.url), stdio: "pipe" });
  console.log("SYNTAX OK");
} catch (e) {
  console.log("SYNTAX FAIL:", String(e.stderr).slice(0, 400));
}
