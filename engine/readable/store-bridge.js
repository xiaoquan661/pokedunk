// store-bridge.js —— play-core 依赖的 store 包函数桥
// 来源：store.fmt.js（原版 store 包格式化版，570 行）。行为等价，函数名按 play 内别名。
// 翻译期 TODO：逐函数语义化注释；当前实现按 store.fmt.js 原逻辑搬运。

/* —— profanityFn（store f）：队名清洗 —— */
const U = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };
const WORDS = ["fuck", "shit", "nigg", "cunt", "bitch", "dick", "cock", "pussy", "ass", "rape", "hitler", "nazi"];
function normalizeWord(e) {
  const t = e.toLowerCase();
  let out = t;
  for (const a of ["i", "l"]) {
    const r = t.replace(/[034578@$!1]/g, (s) => (s === "1" ? a : U[s]));
    out = r; // 原 store 逻辑：两次变体各查一遍
    if (WORDS.some((w) => r.includes(w))) return r;
  }
  return out;
}
const pad = (e, t) => t.reduce((o, a) => o.split(a).join(" "), e);
const SEPARATORS = ["_", "-", ".", ",", "*", "$", "@", "!", "0", "1", "3", "4", "5", "7", "8"];
const BAD_PATTERNS = WORDS;
export function profanityFn(e, fallback) {
  const t = e.toLowerCase();
  for (const o of t.split(/[^a-z0-9@$!*]+/)) {
    if (!o) continue;
    const r = normalizeWord(o);
    for (const w of BAD_PATTERNS) if (r.includes(w)) return fallback;
  }
  const joined = normalizeWord(pad(t, SEPARATORS));
  for (const w of BAD_PATTERNS) if (joined.includes(w)) return fallback;
  return e;
}

/* —— challengeStorage（store y/Zs→W?）：缩写生成（取队名首字母大写） —— */
export function challengeStorage(e, t) {
  const src = (e && String(e).trim()) || t || "TM";
  return src.slice(0, 3).toUpperCase();
}

/* —— 其余桥接：引擎核心不使用，占位导出防 import 报错 —— */
export const storageRead = () => null;
export const isValidName = () => true;
/** HTML 转义（原版 store 导出 e，play 里以 B 使用——所有 UI 显示名都过这里） */
export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const teamNameClean = (s) => s;
/** DRILL_TABLE（store nt）：判断名字是否为内置训练项名（原版查表；引擎核心只做名称守卫） */
export const DRILL_TABLE = (name) => typeof name === "string" && ["movement", "layups", "jumpshots", "passing", "alleyoop", "defense", "steals"].some((k) => name.toLowerCase().includes(k));
export const drillScore = () => 0;
export const drillSpawn = (name) => (name || "").slice(0, 3).toUpperCase();
export const drillConfig = () => ({});

/** shuffleArr（store V）：Fisher–Yates 洗牌（原逻辑逐行等价） */
export function shuffleArr(e) {
  const t = e;
  for (let o = t.length - 1; o > 0; o--) {
    const a = Math.floor(Math.random() * (o + 1));
    [t[o], t[a]] = [t[a], t[o]];
  }
  return t;
}
