/**
 * systems/daily-score.js —— 每日挑战计分权重
 * 同一条规则决定双方 buff，也决定当日挑战分的风格权重。
 * 基础分 = 实际得分；风格分 = 三分/扣篮/抢断/盖帽/篮板 × 当日权重；胜利 +10。
 */

export const DAILY_SCORE_RULES = {
  rain3: { tpm: 4, dnk: 2, stl: 2, blk: 2, reb: 0, win: 10, label: "三分 +4 · 扣篮 +2 · 抢断/盖帽 +2" },
  wall: { tpm: 1, dnk: 2, stl: 3, blk: 4, reb: 1, win: 10, label: "盖帽 +4 · 抢断 +3 · 扣篮 +2" },
  fast: { tpm: 2, dnk: 4, stl: 3, blk: 1, reb: 0, win: 10, label: "扣篮 +4 · 抢断 +3 · 三分 +2" },
  glass: { tpm: 1, dnk: 4, stl: 1, blk: 2, reb: 2, win: 10, label: "扣篮 +4 · 篮板 +2 · 盖帽 +2" },
  paint: { tpm: 1, dnk: 5, stl: 1, blk: 3, reb: 1, win: 10, label: "扣篮 +5 · 盖帽 +3" },
  pick: { tpm: 1, dnk: 2, stl: 5, blk: 2, reb: 0, win: 10, label: "抢断 +5 · 扣篮/盖帽 +2" },
  star: { tpm: 2, dnk: 3, stl: 2, blk: 2, reb: 1, win: 10, label: "扣篮 +3 · 三分/抢断/盖帽 +2" },
};

/** 取当日权重；未知规则回落到全明星 */
export function scoreWeights(modId) {
  return DAILY_SCORE_RULES[modId] || DAILY_SCORE_RULES.star;
}

/** 从引擎实时数据计算挑战分（不含模拟 0.8 折扣） */
export function liveScore(engine, modId) {
  const w = scoreWeights(modId);
  let pts = 0, tpm = 0, stl = 0, blk = 0, dnk = 0, reb = 0;
  for (const p of engine?.players || []) {
    if (p.team !== 0) continue;
    const s = p.stats || {};
    pts += s.pts || 0;
    tpm += s.tpm || 0;
    stl += s.stl || 0;
    blk += s.blk || 0;
    dnk += s.dnk || 0;
    reb += s.reb || 0;
  }
  if (!pts) pts = engine?.score?.[0] || 0;
  const style = tpm * w.tpm + dnk * w.dnk + stl * w.stl + blk * w.blk + reb * w.reb;
  return { total: pts + style, pts, style, tpm, stl, blk, dnk, reb, weights: w };
}
