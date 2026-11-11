// 调试：逐系对比 TYPE_CHART vs 原版 Ka
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { TYPE_CHART } from "../engine/data/type-chart.js";

const fmt = readFileSync(new URL("../tools/reference/play-package/play.fmt.js", import.meta.url), "utf8").split("\n");
const cut = (a, b) => fmt.slice(a - 1, b).join("\n");
const kaSrc = "const Ka = " + cut(897, 916).replace(/^\s*Ka = /, "").replace(/\}\s*;\s*$/, "}") + "; window.__K=Ka;";
const sb = { window: {} };
new vm.Script(kaSrc).runInNewContext(sb);
const B = sb.window.__K;
const A = TYPE_CHART;
console.log("keys equal:", JSON.stringify(Object.keys(A)) === JSON.stringify(Object.keys(B)));
for (const k of Object.keys(B)) {
  if (JSON.stringify(A[k]) !== JSON.stringify(B[k]))
    console.log("diff:", k, JSON.stringify(A[k]), "vs", JSON.stringify(B[k]));
}
console.log("A end:", JSON.stringify(Object.fromEntries([["Fairy", A.Fairy]])), "B end:", JSON.stringify([["Fairy", B.Fairy]]));
