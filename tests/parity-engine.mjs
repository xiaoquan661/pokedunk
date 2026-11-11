// 引擎层 seed 对照测试（等价性硬验收）：
// 同一配置+seed → 重命名可读引擎 vs 原版 minified play 包，比分/事件流逐项一致。
// 原版跑在浏览器/Node 需同样 stub——这里用两条途径对比：
//   A) 本仓库参照物 play.js（原版原文，仅 import 指向 store-bridge-orig.js）
//   B) engine/readable/play-core.js（重命名版）
// 两者都经 stub 全局后 import，各跑一场 seed=42 比赛，对比最终比分与事件流。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// —— 准备原版可运行副本：play.js 原文（未重命名），import 指回 store.js 原文 ——
mkdirSync(new URL("../engine/reference-run/", import.meta.url), { recursive: true });
const fmt = readFileSync(new URL("../tools/reference/play-package/play.fmt.js", import.meta.url), "utf8");
// 原版格式化稿 + 原版 store（import 块为多行：从 "import {" 起到 "} from ...js;" 止）
const impStart = fmt.indexOf("import {");
const impEnd = fmt.indexOf('from "./store-CNfAwiAs.js";') + 'from "./store-CNfAwiAs.js";'.length;
const origHead = 'import * as S0 from "./store-orig.js";\nconst { f: fs, y: Zs, t: qe, e: B, l: st, b: nt, s: ea, a: ta, d: Qt, h: za } = S0;';
writeFileSync(new URL("../engine/reference-run/play-orig.js", import.meta.url), fmt.slice(0, impStart) + origHead + fmt.slice(impEnd));
const storeOrig = readFileSync(new URL("../tools/reference/play-package/store.fmt.js", import.meta.url), "utf8");
writeFileSync(new URL("../engine/reference-run/store-orig.js", import.meta.url), storeOrig);
console.log("原版运行副本已生成");

// —— DOM stub ——
function stubGlobals() {
  const storage = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => {}, key: () => null, get length() { return m.size; } };
  };
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  globalThis.window = globalThis;
  globalThis.location = { reload() {}, search: "", href: "", origin: "", pathname: "/" };
  globalThis.navigator ||= { userAgent: "node" };
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 16);
}
stubGlobals();

// —— 跑一场 ——
function makeCore(mod) {
  // 原版模块：ot(=buildPlayer)、Me(=makeEmptyInput)；重命名版：buildPlayer/makeEmptyInput
  const buildPlayer = mod.ot ?? mod.buildPlayer;
  const makeInput = mod.Me ?? mod.makeEmptyInput;
  const Dt = mod.Dt ?? mod.MatchEngine;
  if (!Dt || !buildPlayer) throw new Error("缺接口: Dt=" + !!Dt + " buildPlayer=" + !!buildPlayer);
  const makeTeam = (dexes, human) => ({
    human,
    name: human ? "Home" : "Away",
    roster: dexes.map((d) => buildPlayer(d, { sht: 2, spd: 1 })),
    bench: [],
    boost: 0,
  });
  const cfg = () => ({
    home: makeTeam([25, 6, 143, 149, 151], true),
    away: makeTeam([150, 149, 249, 143, 6], false),
    difficulty: "pro",
    seed: 42,
    quarterLen: 60,
    practice: false,
  });
  const eng = new Dt(cfg());
  const input = makeInput?.() ?? { mx: 0, my: 0, turbo: false, shoot: false, shootHeld: false, pass: false, steal: false, special: false, swap: false };
  let steps = 0;
  while (eng.phase !== "done" && steps < 72000) { eng.update(1 / 60, input); steps++; }
  return {
    score: eng.score,
    events: eng.events.map((e) => JSON.stringify(e)),
    stats: eng.players.map((p) => ({ id: p.id, pts: p.stats.pts, reb: p.stats.reb, ast: p.stats.ast })),
  };
}

// A) 原版（Dt 未导出——从 export 表找：原版没导出 Dt，用内部引用不可行。
//    改用暴露 new Dt 的包装……原版确实没导出 Dt。
//    对策：给原版副本追加一行 export —— 在文件尾加 "export { Dt };"）
{
  const p = new URL("../engine/reference-run/play-orig.js", import.meta.url);
  let s = readFileSync(p, "utf8");
  if (!s.includes("export { Dt }")) s += "\nexport { Dt, ot, Me };\n";
  writeFileSync(p, s);
}

const [orig, renamed] = await Promise.all([import("../engine/reference-run/play-orig.js"), import("../engine/reference-run/../readable/play-core.js")]);

const A = makeCore(orig);
const B = makeCore(renamed);

let fails = 0;
const eq = (name, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fails++; console.log("FAIL", name); } return ok; };

eq("最终比分", A.score, B.score);
eq("事件流", A.events, B.events);
eq("统计表", A.stats, B.stats);

// 事件流不一致时：找出第一条分歧
if (JSON.stringify(A.events) !== JSON.stringify(B.events)) {
  const n = Math.max(A.events.length, B.events.length);
  for (let i = 0; i < n; i++) {
    if (A.events[i] !== B.events[i]) {
      console.log("首个分歧 @", i);
      console.log("  原版  :", A.events[i]);
      console.log("  重命名:", B.events[i]);
      break;
    }
  }
}

console.log("原版:", JSON.stringify(A.score), "事件数", A.events.length);
console.log("重命名:", JSON.stringify(B.score), "事件数", B.events.length);
console.log(fails === 0 ? "\n✅ 引擎 seed 对照：逐项一致" : `\n❌ ${fails} 项不一致`);
process.exit(fails === 0 ? 0 : 1);
