// 调试：vm 运行 legacy，检查 __LEGACY__
import { readFileSync } from "node:fs";
import vm from "node:vm";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
const sb = { window: {} };
try {
  new vm.Script(src).runInNewContext(sb);
  const L = sb.window.__LEGACY__;
  console.log("LEGACY?", !!L, L ? Object.keys(L).join(",") : "-");
} catch (e) {
  console.log("RUNTIME FAIL:", e.message);
  console.log(e.stack.split("\n").slice(0, 4).join("\n"));
}
