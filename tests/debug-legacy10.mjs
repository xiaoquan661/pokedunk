// 调试10：诡异 —— 解析成功、执行却啥都没设置。试 hello world 验证 new Function 基本行为：
const sb = { window: {} };
new Function("window", "window.__X__ = 1;")(sb);
console.log("hello:", sb.window.__X__);
// 再试：把 legacy-test.js 原文最后 200 行 + 开头 mark 拼起来执行
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
const sb2 = { window: {} };
try {
  new Function("window", "window.__M__ = 'a';\n" + src.split("\n").slice(0, 50).join("\n"))(sb2);
  console.log("50 行:", sb2.window.__M__);
} catch (e) {
  console.log("50 行 throw:", e.message.slice(0, 60));
}
