// 调试13：param 绑定正常。那为什么赋值语句没生效？——试在 body 里用同一 param 直接赋值并返回
const f = new Function("window", "window.__A__ = 1; return window.__A__;");
console.log("return value:", f({}));
// 再试 sb 上有 window 子对象的情况（parity 的 sandbox={window:{}} 传入）
const f2 = new Function("window", "window.__B__ = 1; return window.__B__;");
const sb = { window: {} };
console.log("with nested:", f2(sb), "| sb.window.__B__ =", sb.window.__B__);
