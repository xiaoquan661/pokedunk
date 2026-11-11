// 调试12：深入——new Function 里 param window 未绑定？检查函数体里 window 的实际身份
const f = new Function("window", "return typeof window + '|' + (window === undefined);");
console.log("typeof window in fn:", f({}));
const g = new Function("window", "return window === arguments[0];");
console.log("window === arg0:", g({ ok: 1 }, "extra"));
