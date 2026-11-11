/**
 * 种子随机数——翻译自 play 包 Ya（sfc32 变体），逻辑逐行等价。
 * 同一 seed 产生同一序列——seed 对照测试与每日挑战的地基。
 */
export function seededRng(seed) {
  const next = () => {
    next.state = (next.state + 1831565813) >>> 0;
    let t = next.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.state = seed >>> 0;
  return next;
}
