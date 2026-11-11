// 数据层等价性验证：新 engine/ 实现 vs play 包原始实现，同输入必须同输出
import { readFileSync, writeFileSync } from "node:fs";

// —— 载入原版实现（play.fmt.js 剥掉 import/顶层执行后取函数）——
// 原版顶层引用 window 等，直接 import 不可行；改为提取纯函数+数据段 eval。
const fmt = readFileSync(new URL("../tools/reference/play-package/play.fmt.js", import.meta.url), "utf8");
const lines = fmt.split("\n");
const cut = (a, b) => lines.slice(a - 1, b).join("\n");

// 组装一个 IIFE：数据表 + 依赖函数，返回对照接口（保持原版逻辑原样）
// Ba 是顶层 const，其后的 Ha/sa/Oe/Ps/Wa/aa 都是同一声明列表的成员（"，"分隔）——
// 把成员式块剥掉声明头、去掉块尾逗号后逐个补 const，块内闭合保留。
function memberToConst(s, name) {
  let b = s.replace(new RegExp("^\\s*" + name + " = "), "");
  b = b.replace(/[\s,]*$/, "");
  return "const " + name + " = " + b + ";";
}
const legacySrc = `
${cut(646, 650)}
${cut(651, 686)}
${cut(13, 185).replace(/,\s*$/, "")}
${memberToConst(cut(186, 307), "Ha")}
${memberToConst(cut(308, 600), "sa")}
${memberToConst(cut(601, 610), "Oe")}
${memberToConst(cut(611, 618), "Ps")}
${memberToConst(cut(619, 638), "Wa")}
${memberToConst(cut(639, 645), "aa")}
${cut(687, 823)}
${cut(824, 875)}
${cut(876, 876).replace(/,\s*$/, "") + ";"}
window.__LEGACY__ = { aa, na, oa, Ba, Ha, sa, Oe, Ps, Wa, ra, ia, ja, la, Ar, ca, $e, Ua, ue, ot, me };
`;
// Ba/Ha/sa/Oe/Ps/Wa/ra/ia 在底稿里是顶层大对象的成员（两空格缩进、无 const）——
// 直接作为赋值表达式在 IIFE 顶层声明即可（cut 内容形如 "Ba = [...]"）。
const sandbox = { window: {} };
try {
  new Function("window", legacySrc)(sandbox.window);
} catch (e) {
  console.log("LEGACY 组装失败:", e.message);
  writeFileSync(new URL("legacy-parity-dump.js", import.meta.url), legacySrc);
  process.exit(1);
}
const L = sandbox.window.__LEGACY__;
if (!L) {
  console.log("LEGACY 未产出（dump 到 legacy-parity-dump.js）");
  writeFileSync(new URL("legacy-parity-dump.js", import.meta.url), legacySrc);
  process.exit(1);
}

// —— 新实现 ——
import { POKEMON_LIST, getPokemon, buildPlayer, isMythical, STAT_LABELS } from "../engine/data/pokemon.js";
import { TYPE_CHART, effectiveness, bestEffectiveness } from "../engine/data/type-chart.js";
import { DIFFICULTY } from "../engine/data/difficulty.js";
import { EVOLUTIONS } from "../engine/data/evolutions.js";
import { SPECIALS, SPECIAL_MOVES } from "../engine/data/specials-data.js";
import { calcOVR, POSITION_WEIGHTS } from "../engine/data/positions.js";
import { xpToNext, rollGrowth } from "../engine/growth.js";
import { seededRng } from "../engine/rng.js";

let fails = 0;
const eq = (name, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fails++; console.log("FAIL", name); }
  return ok;
};

// 1. 注册表数量与全量对比：291 条逐字段一致
eq("注册表数量", POKEMON_LIST.length, L.$e.length);
for (let i = 0; i < L.$e.length; i++) {
  if (!eq(`pokemon[${i}] dex=${L.$e[i].dex}`, POKEMON_LIST[i], L.$e[i])) break;
}

// 2. ue/ot 逐 dex 对比（含 bonus 叠加）
const allDexes = [...new Set([...L.Ba.map(e=>e[0]), ...L.ra.map(e=>e[0]), ...L.ia.map(e=>e[0])])];
for (const dex of allDexes) {
  const a = L.ue(dex), b = getPokemon(dex);
  if (!eq(`ue(${dex})`, a, b)) break;
}
for (const dex of [1, 25, 6, 150, 151]) {
  const bonus = { sht: 5, spd: 3, reb: 2 };
  if (!eq(`ot(${dex},bonus)`, L.ot(dex, bonus), buildPlayer(dex, bonus))) break;
}

// 3. 克制表
eq("TYPE_CHART", TYPE_CHART, L.__none ?? { ...({} ) }); // 占位：Ka 在闭包外未导出，改用 Xt 对比
// 通过原版 Xt 行为对比：
const legacyXtSrc = `
${cut(897, 916)}
${cut(917, 928)}
window.__X = { Xt, Va };
`;
const sb2 = { window: {} };
new Function("window", legacyXtSrc)(sb2.window);
const X = sb2.window.__X;
const atkTypes = Object.keys(TYPE_CHART);
let xtFail = 0;
for (const at of atkTypes) {
  for (const dt of [["Fire"],["Water"],["Ghost","Steel"],["Normal"],["Flying","Poison"],["Dragon","Fairy"],["Ground","Flying","Rock"],["Rock","Steel"],["Fairy","Fire"],["Ice","Dragon"],["Normal","Ghost"]]) {
    if (X.Xt(at, dt) !== effectiveness(at, dt)) { xtFail++; console.log("XT FAIL", at, dt); }
  }
}
if (xtFail) fails += xtFail; else console.log("克制表 Xt 全对（11 组合 × 18 系）");

// 4. 难度/进化/必杀/权重表直接 JSON 对比
// Ka/Zt/Lt 等在 legacy 闭包里——重新提取
const dataSrc = `
const Ka = ${cut(897, 916).replace(/^\s*Ka = /, "").replace(/\}\s*;\s*$/, "}")};
const Zt = ${cut(955, 1000).replace(/^\s*(const )?Zt = /, "").replace(/\}\s*,?\s*$/, "}")};
window.__D = { Ka, Zt };
`;
const sb3 = { window: {} };
new Function("window", dataSrc)(sb3.window);
const D = sb3.window.__D;
eq("Ka", TYPE_CHART, D.Ka);
eq("Zt", DIFFICULTY, D.Zt);

const evoSrc = `window.__E = { Ha: (function(){ const Ha = ${cut(186, 307).replace(/^\s*Ha = /, "").replace(/\}\s*,?\s*$/, "}")}; return Ha; })() };`;
const sb4 = { window: {} };
new Function("window", evoSrc)(sb4.window);
eq("Ha/EVOLUTIONS", EVOLUTIONS, sb4.window.__E.Ha);

// Ps/Wa/Oe 已在 L 里
eq("Ps", SPECIALS, L.Ps);
eq("Wa", SPECIAL_MOVES, L.Wa);
eq("Oe", STAT_LABELS, L.Oe);
eq("aa", POSITION_WEIGHTS, L.aa);

// 5. OVR/size/archetype：全注册表扫一遍（buildEntry 内部已含，$e 对比已覆盖；再抽 ot 后对比 archetype/size）
for (const dex of [1, 4, 7, 25, 143, 149, 151]) {
  const bonus = { ins: 10, blk: 8 };
  const a = L.ot(dex, bonus), b = buildPlayer(dex, bonus);
  if (a.archetype !== b.archetype) { fails++; console.log("archetype FAIL", dex, a.archetype, b.archetype); }
  if (Math.abs(a.size - b.size) > 1e-12) { fails++; console.log("size FAIL", dex); }
}

// 6. xp 曲线
for (let lv = 1; lv <= 99; lv++) {
  const f = new Function("a", `return (a)=>60 + 25*(a-1)`)(0);
  if (f(lv) !== xpToNext(lv)) { fails++; console.log("xp FAIL", lv); }
}

// 7. RNG 序列一致性（seed 42，前 1000 个数）
const legacyYa = `
${cut(1008, 1019)}
window.__Y = Ya;
`;
const sb5 = { window: {} };
new Function("window", legacyYa)(sb5.window);
const a1 = sb5.window.__Y(42), a2 = seededRng(42);
let rngFail = 0;
for (let i = 0; i < 1000; i++) if (a1() !== a2()) { rngFail++; break; }
if (rngFail) fails++; else console.log("RNG seed=42 序列 1000 位一致");

// 8. rollGrowth：同 rng 序列下加一点结果一致
// mn 依赖 ue(dex)（取基础八维）与 _a(pos)（位置权重）——ue 用新实现注入（mn 逻辑本身仍为原版原文）
const legacyMn = `
const aa = ${cut(639, 645).replace(/^\s*aa = /, "").replace(/\}\s*;\s*$/, "}")};
const Oe = ${cut(601, 610).replace(/^\s*Oe = /, "").replace(/\}\s*,?\s*$/, "}")};
${cut(873, 875)}
const ue = (dex) => window.__GP(dex);
function mn(a, e = Math.random) {
${cut(3673, 3693)}
}
window.__M = mn;
`;
const sb6 = { window: {} };
sb6.window.__GP = getPokemon;
new Function("window", legacyMn)(sb6.window);
const M = sb6.window.__M;
for (const dex of [1, 25, 6, 143]) {
  const pa = { dex, bonus: {} }, pb = { dex, bonus: {} };
  const r1 = seededRng(7), r2 = seededRng(7);
  const ma = M(pa, r1), mb = rollGrowth(pb, r2);
  if (!eq(`mn(${dex})`, ma, mb) || !eq(`mn(${dex}) bonus`, pa.bonus, pb.bonus)) break;
}

console.log(fails === 0 ? "\n✅ 全部等价性验证通过" : `\n❌ ${fails} 项失败`);
process.exit(fails === 0 ? 0 : 1);
