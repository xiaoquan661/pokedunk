// 调试6：二分执行——在 src 中段插入探针，看执行到哪一步
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
// 在关键声明后插入探针
const probes = [
  ["const Lt = Ha;", "window.__probe1 = 'Lt';"],
  ["const qa = new Set", "window.__probe2 = 'qa';"],
  ["const me = [", "window.__probe3 = 'me';"],
];
let s = src;
for (const [anchor, probe] of probes) s = s.replace(anchor, probe + "\n" + anchor);
const sb = { window: {} };
new Function("window", s)(sb);
console.log("probes:", sb.window.__probe1, sb.window.__probe2, sb.window.__probe3, "LEGACY?", !!sb.window.__LEGACY__);
