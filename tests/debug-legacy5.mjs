// 调试5：找 new Function 丢 __LEGACY__ 的原因——参数名遮蔽？
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
// 原版块 cut(824,875) 里有 function 定义用了 'window'？搜一下
const i = src.indexOf("window");
console.log("src 中出现 'window' 的位置:", [...src.matchAll(/window/g)].map((m) => m.index));
// 检查 824-875 块里是否有 'const window' 或 'let window'
console.log("含 'window' 的行:");
src.split("\n").forEach((l, idx) => {
  if (l.includes("window")) console.log(idx + 1, ":", l.slice(0, 120));
});
