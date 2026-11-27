/**
 * systems/badge-unlocks.js —— 徽章永久设施解锁（S65，Phase 1）
 * 阈值：2 蛋槽 / 3 野球 / 4 商店格 / 5 训练+5 / 6 蛋槽 / 7 免费刷新 / 8 蛋槽+训练+5。
 * 跨地区永久保留：用 journey.unlocks 记录，不随当前地区徽章重置。
 */
export function maxBadgeCount(save) {
  const j = save?.journey || {};
  const count = (arr) => (Array.isArray(arr) ? arr.filter((b) => b && b !== "champion").length : 0);
  let max = count(j.season?.badges);
  for (const row of Object.values(j.badgeSeasons || {})) max = Math.max(max, count(row?.badges));
  max = Math.max(max, count(j.gymBadges));
  return Math.min(8, max);
}

/** 读档/拿徽章后调用：把历史最高徽章数写进永久解锁表，并补齐蛋槽 */
export function ensureBadgeUnlocks(save) {
  const j = (save.journey ||= {});
  j.unlocks ||= {};
  const n = maxBadgeCount(save);
  const set = (key, on) => { if (on) j.unlocks[key] = true; };
  set("egg2", n >= 2);
  set("wild1", n >= 3);
  const hadShop1 = !!j.unlocks.shop1;
  set("shop1", n >= 4);
  // 新解锁商店格：让下一次打开商店时重摇，立即看到第 7 格
  if (!hadShop1 && j.unlocks.shop1 && save.shop) save.shop.date = "";
  set("train1", n >= 5);
  set("egg3", n >= 6);
  set("free1", n >= 7);
  set("egg4", n >= 8);
  set("train2", n >= 8);

  save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
  const slots = j.unlocks.egg4 ? 4 : j.unlocks.egg3 ? 3 : j.unlocks.egg2 ? 2 : 1;
  if ((save.eggs.unlockedSlots || 1) < slots) save.eggs.unlockedSlots = slots;
  return facilityState(save);
}

export function facilityState(save) {
  const u = save?.journey?.unlocks || {};
  return {
    egg2: !!u.egg2, egg3: !!u.egg3, egg4: !!u.egg4,
    wild1: !!u.wild1, shop1: !!u.shop1,
    train1: !!u.train1, train2: !!u.train2,
    free1: !!u.free1,
    eggSlots: u.egg4 ? 4 : u.egg3 ? 3 : u.egg2 ? 2 : 1,
    wildBonus: u.wild1 ? 1 : 0,
    shopBonus: u.shop1 ? 1 : 0,
    trainBonus: u.train2 ? 10 : u.train1 ? 5 : 0,
    freeRefresh: 1 + (u.free1 ? 1 : 0),
  };
}
