/**
 * systems/xp.js —— 通用经验结算（S16）
 * 与 bag.js / settle.js 的升级循环同款：加经验 → 连续升级 → 随机成长 +1 → 每级 1 点自由训练。
 * 进化不再自动触发，由玩家在详情页手动进化。
 * 供训练草地等非比赛来源复用，避免第三份实现走样。
 */
import { xpToNext, getPokemon } from "../../engine/readable/play-core.js?v=574";
import { rollGrowth } from "../../engine/growth.js?v=574";
import { growthZh } from "./build.js?v=574";

/** 把多级成长合并成“速度 +2、投篮 +1” */
function growthLine(list) {
  const cnt = {};
  for (const g of list) {
    const m = String(growthZh(g)).match(/^\+\d+\s+(.+)$/);
    const k = m ? m[1] : String(g);
    cnt[k] = (cnt[k] || 0) + 1;
  }
  return Object.entries(cnt).map(([k, v]) => `${k}+${v}`).join("、");
}

/** 给一只精灵加经验：按“一只精灵”汇总，多级只出一条播报 */
export function grantXp(save, monId, mon, amount) {
  const events = [];
  if (!mon || amount <= 0) return events;
  const fromLevel = mon.level;
  const growthAll = [];
  mon.xp = (mon.xp || 0) + amount;
  while (mon.xp >= xpToNext(mon.level)) {
    if (mon.level >= 99) { mon.xp = 0; break; }
    mon.xp -= xpToNext(mon.level);
    mon.level++;
    growthAll.push(...rollGrowth({ dex: mon.dex, bonus: mon.bonus }, Math.random));
    mon.train ||= { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 };
    mon.train.free = (mon.train.free || 0) + 1;
    mon.train.freeEarned = (mon.train.freeEarned || 0) + 1;
  }
  if (mon.level > fromLevel) {
    const levels = mon.level - fromLevel;
    const gtxt = growthLine(growthAll);
    events.push(`${getPokemon(mon.dex).name} 升了 ${levels} 级（Lv.${fromLevel} → Lv.${mon.level}）${gtxt ? ` · ${gtxt}` : ""}`);
  }
  return events;
}
