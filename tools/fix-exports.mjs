// 修 export 块：截断原表，写干净导出
import { readFileSync, writeFileSync } from "node:fs";
const p = new URL("../engine/readable/play-core.js", import.meta.url);
let s = readFileSync(p, "utf8");

// 1) 修 import 块：绑定 play-core 实际用到的桥符号（DRILL_TABLE 在原版是函数 nt(u)——布尔校验）
s = s.replace(
  /import \{[\s\S]*?from "\.\/store-CNfAwiAs\.js";/,
  'import {\n  profanityFn,\n  challengeStorage,\n  storageRead,\n  escapeHtml,\n  teamNameClean,\n  shuffleArr,\n  DRILL_TABLE,\n  drillScore,\n  drillSpawn,\n} from "./store-bridge.js?v=2";'
);

// 2) 重写 export 块
const i = s.indexOf("export {");
if (i < 0) { console.log("未找到 export 块"); process.exit(1); }
const head = s.slice(0, i);
const NEW = `export {
  MatchEngine,
  getPokemon,
  buildPlayer,
  calcOVR,
  calcArchetype,
  sizeFactor,
  rollGrowth,
  xpToNext,
  settleMatch,
  seededRng,
  DIFFICULTY_LEVELS,
  TYPE_CHART,
  POKEMON_LIST,
  POSITION_WEIGHTS,
  STAT_LABELS,
  SPECIAL_EFFECTS,
  SPECIAL_MOVES,
  EVOLUTIONS,
  LEAGUE_GYMS,
  POSITION_ORDER,
  TYPE_COLORS,
  makeEmptyInput,
  INPUT_BITS,
  ENGINE_VERSION,
  clampNum,
  dist2d as distanceFn,
  lerpNum,
  weightsOf,
  isMythical,
  getMeasurements,
  buildPokemonEntry,
  buildTeamPlayerView,
  pickHealthyStarters,
  makeEmptyStats,
  saveKeyRoute,
  gs as Renderer,
  mi as buildMatchSettingsUI,
  pi as buildMatchRunner,
  wi as startMatchLoop,
  bi as matchInputDriver,
  Io as demoMatch,
  Oo as attractLoop,
  Ks as pickTeamRoster,
  va as versusTeam,
  Ea as preloadSprites,
  ye as franchiseView,
  Or as gameScoreOf,
  ts as playerGameScore,
  ds as COURT_STYLES,
  ms as defaultCourtStyle,
  Vs as clockTextOf,
  /* 比赛屏组件（wi/startMatchLoop 的内部依赖，系统层组装用） */
  Ga as Scoreboard,
  lr as InputManager,
  ys as AnnouncerClips,
  Gn as createAnnouncerVoice,
  Ca as AnnouncerChooser,
  Tr as pregameIntro,
  Ra as playHighlight,
  kr as showHighlightBanner,
  Pr as fastSimulate,
  Kr as simulateFullMatch,
  Aa as touchHelpHtml,
  le as spritePath,
};
`;
writeFileSync(p, head + NEW);
console.log("OK export 块重写");
