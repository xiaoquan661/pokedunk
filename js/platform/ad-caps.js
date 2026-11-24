/**
 * platform/ad-caps.js —— 激励视频每日次数（本地）
 * 只记录“今天用了几次”，用于新增广告点位的每日上限。
 * 不参与云存档，跨设备不合并；与既有各面板自己的计数相互独立。
 */
const KEY = "pokedunk.adCaps";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && raw.date === today() ? raw : { date: today(), used: {} };
  } catch {
    return { date: today(), used: {} };
  }
};
const write = (state) => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
};

export function adLeft(id, max) {
  const state = read();
  return Math.max(0, (Number(max) || 0) - (state.used?.[id] || 0));
}

export function adUse(id, max) {
  const state = read();
  const used = state.used?.[id] || 0;
  if (used >= max) return false;
  state.used = state.used || {};
  state.used[id] = used + 1;
  write({ date: state.date || today(), used: state.used });
  return true;
}
