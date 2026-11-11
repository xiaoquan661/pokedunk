// 列 play-core 导出
const stub = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => {}, key: () => null, get length() { return m.size; } }; };
globalThis.localStorage = stub();
globalThis.sessionStorage = stub();
globalThis.window = globalThis;
globalThis.location = { reload() {}, search: "", href: "", origin: "", pathname: "/" };
const core = await import("../engine/readable/play-core.js");
const names = Object.keys(core);
console.log("total", names.length);
console.log("大写开头:", names.filter((n) => /^[A-Z_$]/.test(n)).join(", "));
console.log("全量:", names.join(", "));
process.exit(0);
