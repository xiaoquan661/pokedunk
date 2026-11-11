// 调试7：执行到底了吗？——在脚本最末尾加最终探针
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
const s = src + "\nwindow.__END__ = 'yes';\n";
const sb = { window: {} };
try {
  new Function("window", s)(sb);
  console.log("END probe:", sb.window.__END__, "LEGACY?", !!sb.window.__LEGACY__);
} catch (e) {
  console.log("THREW:", e.message);
}
