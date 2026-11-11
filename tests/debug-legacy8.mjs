// 调试8：逐行执行定位卡点
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
const lines = src.split("\n");
// 二分：只执行前 N 行，找第一次"卡住"的位置
function tryRun(n) {
  const sb = { window: {} };
  try {
    new Function("window", "window.__MARK__ = " + n + ";\n" + lines.slice(0, n).join("\n"))(sb);
    return sb.window.__MARK__ === n ? "ok" : "silent";
  } catch (e) {
    return "throw: " + e.message.slice(0, 60);
  }
}
// 前几行就卡？na 函数定义没问题；先看 1 行
console.log("1:", tryRun(1));
console.log("20:", tryRun(20));
console.log("100:", tryRun(100));
console.log("200:", tryRun(200));
console.log("400:", tryRun(400));
console.log("600:", tryRun(600));
console.log("700:", tryRun(700));
console.log("800:", tryRun(800));
console.log("865:", tryRun(865));
