// 调试9：为什么整个文件跑完是 silent（mark 未设置）？——标记语句在第一行，若整体解析成功 mark 必被设置。
// 唯一可能：new Function 的函数体里，最后有 return 或代码被吞。试直接跑完整 src 并在首行设 mark。
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("legacy-test.js", import.meta.url), "utf8");
const sb = { window: {} };
new Function("window", "window.__MARK__ = 'start';\n" + src)(sb);
console.log("MARK:", sb.window.__MARK__, "LEGACY?", !!sb.window.__LEGACY__, "END?", sb.window.__END__);
