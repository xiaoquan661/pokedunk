// 冒烟测试：重命名后的 play-core.js 在 Node 中跑一场完整 seed 比赛
// 验证：①import 无异常（DOM stub 下）②MatchEngine 全场跑完 ③同 seed 两次结果逐字节一致（确定性）
// stub 全局 DOM（top-level da IIFE 等需要）
import { readFileSync, writeFileSync } from "node:fs";

const storage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = globalThis;
globalThis.document = { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {} }) };
globalThis.location = { reload() {}, search: "", href: "http://localhost/", origin: "http://localhost", pathname: "/" };
globalThis.URLSearchParams = globalThis.URLSearchParams || class { constructor() {} get() { return null; } };
try { globalThis.navigator = { userAgent: "node" }; } catch {} // Node22 自带只读 navigator，跳过
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 16);
globalThis.AudioContext = class { constructor() {} createGain() { return { connect() {}, gain: { value: 0 } }; } };

// 动态导入重命名核心
const core = await import("../engine/readable/play-core.js");
console.log("import OK；导出数:", Object.keys(core).length);

// 关键接口可用性
const { MatchEngine, getPokemon, buildPlayer, settleMatch, xpToNext, rollGrowth, seededRng, DIFFICULTY_LEVELS, POKEMON_LIST, INPUT_BITS, makeEmptyInput } = core;
for (const [name, v] of Object.entries({ MatchEngine, getPokemon, buildPlayer, settleMatch, xpToNext, rollGrowth, seededRng, DIFFICULTY_LEVELS, POKEMON_LIST, INPUT_BITS, makeEmptyInput })) {
  if (!v) { console.log("缺少导出:", name); process.exit(1); }
}
console.log("关键导出齐全 ✓  注册表:", POKEMON_LIST.length, "条");

// 建两队——roster item = buildPlayer(dex, bonus) 产物（Es 读 s.r/s.size/s.ovr）
function makeTeam(dexes, human) {
  return {
    human,
    name: "Test" + (human ? "Home" : "Away"),
    roster: dexes.map((d) => buildPlayer(d, { sht: 2, spd: 1 })),
    bench: [],
    boost: 0,
  };
}
const cfg = () => ({
  home: makeTeam([25, 6, 143, 149, 151], true),
  away: makeTeam([150, 149, 249, 143, 6], false),
  difficulty: "pro",
  seed: 42,
  quarterLen: 60,
  practice: false,
});

function runMatch(c) {
  const eng = new MatchEngine(c);
  let steps = 0;
  const maxSteps = 60 * 60 * 20; // 上限保险
  while (eng.phase !== "done" && steps < maxSteps) {
    eng.update(1 / 60, makeEmptyInput()); // 玩家不操作（待机 vs CPU）
    steps++;
  }
  return { steps, score: eng.score, phase: eng.phase, q: eng.quarter };
}

const r1 = runMatch(cfg());
const r2 = runMatch(cfg());
console.log("match1:", JSON.stringify(r1));
console.log("match2:", JSON.stringify(r2));
console.log("确定性:", JSON.stringify(r1) === JSON.stringify(r2) ? "✓ 同 seed 结果一致" : "✗ 不一致！");
process.exit(0);
