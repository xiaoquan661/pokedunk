// 调试4：new Function 执行与 vm 相同内容
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
const sb = { window: {} };
try {
  new Function("window", src)(sb);
  console.log("new Function OK, LEGACY?", !!sb.window.__LEGACY__);
} catch (e) {
  console.log("new Function FAIL:", e.message);
}
