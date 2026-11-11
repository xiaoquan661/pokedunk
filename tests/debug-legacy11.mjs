// 调试11：最小文件版——怀疑 'window' 参数名在模块上下文被全局 window 覆盖？
const sb = { window: {} };
const f = new Function("window", "window.__X__ = 1;");
f(sb);
console.log("param window:", sb.window.__X__, "| global window.__X__:", globalThis.window && globalThis.window.__X__);
