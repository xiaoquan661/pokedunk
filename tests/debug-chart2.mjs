// 调试：TYPE_CHART vs Ka 全键值严格对比（值级）
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { TYPE_CHART } from "../engine/data/type-chart.js";

const fmt = readFileSync(new URL("../tools/reference/play-package/play.fmt.js", import.meta.url), "utf8").split("\n");
const cut = (a, b) => fmt.slice(a - 1, b).join("\n");
const kaSrc = "const Ka = " + cut(897, 916).replace(/^\s*Ka = /, "").replace(/\}\s*;\s*$/, "}") + "; window.__K=Ka;";
const sb = { window: {} };
new vm.Script(kaSrc).runInNewContext(sb);
const A = TYPE_CHART, B = sb.window.__K;
let diff = 0;
for (const k of Object.keys(A)) {
  const x = JSON.stringify(A[k]), y = JSON.stringify(B[k]);
  if (x !== y) { diff++; console.log("DIFF", k, "\n  new:", x, "\n  old:", y); }
}
console.log(diff === 0 ? "值级全部一致 —— FAIL 来自键序或 __D 提取路径" : `${diff} 项值级差异`);
// 键序检查
console.log("键序一致:", Object.keys(A).join(",") === Object.keys(B).join(","));
// 复现 parity 的 dataSrc 提取路径（该路径下的 Zt/Ka）
const dataKa = cut(897, 916).replace(/^\s*Ka = /, "").replace(/\}\s*;\s*$/, "}");
console.log("dataSrc Ka 首行:", JSON.stringify(dataKa.slice(0, 40)));
console.log("dataSrc Ka 尾行:", JSON.stringify(dataKa.slice(-40)));
