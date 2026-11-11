/**
 * 位置体系——翻译自 play 包 me（位置序）/ aa（OVR 与加点权重表），数值逐字照抄。
 * POSITION_WEIGHTS 同时服务两处：calcOVR 加权求和、rollGrowth 随机加点抽样权重。
 */
export const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

export const POSITION_WEIGHTS = {
  PG: { spd: 0.2, sht: 0.2, pas: 0.2, hnd: 0.2, def: 0.1, ins: 0.1 },
  SG: { sht: 0.3, spd: 0.15, hnd: 0.15, ins: 0.15, def: 0.15, pas: 0.1 },
  SF: { sht: 0.2, ins: 0.2, def: 0.2, spd: 0.15, reb: 0.1, blk: 0.1, pas: 0.05 },
  PF: { ins: 0.25, reb: 0.2, blk: 0.15, def: 0.15, sht: 0.1, spd: 0.1, pas: 0.05 },
  C: { ins: 0.2, reb: 0.25, blk: 0.25, def: 0.1, pas: 0.1, sht: 0.05, spd: 0.05 },
};

/** OVR 公式（翻译自 na，逐行等价）：位置加权均值 → 25~99 映射 */
export function calcOVR(pos, stats) {
  let sum = 0;
  for (const [stat, w] of Object.entries(POSITION_WEIGHTS[pos])) sum += stats[stat] * w;
  return Math.max(25, Math.min(99, Math.round((sum - 60) * 1.25 + 58)));
}

/** 取某位置的权重表（翻译自 _a） */
export function weightsOf(pos) {
  return POSITION_WEIGHTS[pos];
}
