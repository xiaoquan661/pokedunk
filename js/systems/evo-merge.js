/**
 * systems/evo-merge.js —— 进化撞车融合
 *
 * 允许同一家族不同进化阶段同时持有；但当低阶个体进化后，
 * 目标 dex 已经在档案里时，不再生成第二只同种：
 *   - 保留正在进化的个体（id 不变，避免首发/队伍位置丢失）
 *   - 把已有同种个体的等级/经验/随机加点并入
 *   - 已有同种的训练点转入返还池
 *   - 道具投入优先转移，超出上限按每点 100 币折算
 */
import { ITEM_TYPES, ITEM_MAX, ITEM_PER_TYPE, ensureLineupSlots } from "./build.js?v=694";

const sameId = (a, b) => Number(a) === Number(b);

export function mergeOwnedSpecies(save, monId, newDex) {
  const src = save?.mons?.[monId];
  if (!src) return { merged: false };
  const targetKey = Object.keys(save.mons || {}).find(
    (id) => !sameId(id, monId) && Number(save.mons[id]?.dex) === Number(newDex)
  );
  if (!targetKey) return { merged: false };

  const target = save.mons[targetKey];
  const targetId = Number(targetKey);

  // 等级 / 经验 / 随机加点：逐项取高，不叠加，避免融合刷属性
  src.level = Math.max(src.level || 1, target.level || 1);
  src.xp = Math.max(src.xp || 0, target.xp || 0);
  src.bonus ||= {};
  for (const [k, v] of Object.entries(target.bonus || {})) {
    src.bonus[k] = Math.max(src.bonus[k] || 0, v || 0);
  }

  // 训练点：把被融合个体的已投入点、返还池、未用自由点转入保留个体
  src.train ||= { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 };
  const trainRefund = (target.train?.points || 0) + (target.train?.bank || 0);
  src.train.bank = (src.train.bank || 0) + trainRefund;
  src.train.free = (src.train.free || 0) + (target.train?.free || 0);
  src.train.freeEarned = Math.max(src.train.freeEarned || 0, target.train?.freeEarned || 0);

  // 道具：能转移就转移；达到单只/单项上限的部分折币
  src.item ||= { points: 0, stats: {}, used: {} };
  src.item.used ||= {};
  src.item.stats ||= {};
  let overflow = 0;
  let usedTotal = 0;
  for (const [type, count] of Object.entries(target.item?.used || {})) {
    const it = ITEM_TYPES[type];
    if (!it) continue;
    usedTotal += count || 0;
    for (let i = 0; i < (count || 0); i++) {
      const can = (src.item.points || 0) < ITEM_MAX
        && (src.item.used[type] || 0) < ITEM_PER_TYPE
        && (src.item.stats[it.stat] || 0) < 99;
      if (!can) { overflow++; continue; }
      src.item.stats[it.stat] = (src.item.stats[it.stat] || 0) + 1;
      src.item.used[type] = (src.item.used[type] || 0) + 1;
      src.item.points = (src.item.points || 0) + 1;
    }
  }
  overflow += Math.max(0, (target.item?.points || 0) - usedTotal);
  const coin = overflow * 100;
  if (coin) save.coins = (save.coins || 0) + coin;

  // 队伍 / 仓库：保留进化个体的位置；若进化个体在仓库而目标在队伍，则接管目标队伍位
  const srcId = Number(monId);
  const ti = (save.team || []).findIndex((id) => sameId(id, targetId));
  const si = (save.team || []).findIndex((id) => sameId(id, srcId));
  if (ti >= 0 && si < 0) {
    save.team[ti] = srcId;
    save.box = (save.box || []).filter((id) => !sameId(id, srcId));
  } else {
    save.team = (save.team || []).filter((id) => !sameId(id, targetId));
    save.box = (save.box || []).filter((id) => !sameId(id, targetId));
  }

  const targetPos = save.assign?.[targetId];
  if (targetPos && !save.assign?.[srcId]) save.assign[srcId] = targetPos;
  if (save.assign) delete save.assign[targetId];
  if (save.benched) delete save.benched[targetId];
  delete save.mons[targetKey];

  // 队伍人数因融合减少时，从仓库补足到至少 5 人
  while ((save.team || []).length < 5 && (save.box || []).length) save.team.push(save.box.shift());
  try { ensureLineupSlots(save); } catch {}
  return { merged: true, targetId, trainRefund, overflow, coin };
}
