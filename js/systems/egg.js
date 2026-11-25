/**
 * egg.js —— 孵蛋（S3）· pokedunk-v2
 * 行为规格移植自旧 journey-egg/eggs（用户定稿设计）：
 *   真时制（startTs + HATCH_MS）；dex 购买时已定，孵化只揭示；
 *   撞车（同种唯一）折币 DUPE_REFUND；出蛋走 addMon 统一落库。
 */
import { getPokemon } from "../../engine/data/pokemon.js";
import { addMon, writeSave } from "../storage.js?v=574";
import { HATCH_MS, EGG_SLOTS, DUPE_REFUND, DUPE_REFUND_PREMIUM, DUPE_REFUND_LEGEND, EGG_TIERS, rollEggDex } from "./shop.js?v=574";
import { LEGENDARY_DEX } from "./build.js?v=574";
import { syncAcquireLevel } from "./acquire.js?v=574";

const hatchMsOf = (tier) => (EGG_TIERS[tier] || EGG_TIERS.normal).hatchMs;
/** 孵蛋加速券：背包道具 id（战斗掉落） */
export const HATCH_ITEM = "hatch";
export const EGG_AD_REDUCE_MS = 4 * 60 * 60 * 1000;
export const EGG_SLOT_MAX = 3;
export const EGG_SLOT_PRICE = 300;

/** 购买 1 个孵蛋槽位（上限 3，只能购买一次） */
export function eggBuySlot(save) {
  save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
  if (save.eggs.paidSlot) return { ok: false, error: "已购买过槽位" };
  if (save.eggs.unlockedSlots >= EGG_SLOT_MAX) return { ok: false, error: "孵蛋槽位已全部解锁" };
  if (save.coins < EGG_SLOT_PRICE) return { ok: false, error: `篮球币不足（需 ${EGG_SLOT_PRICE}）` };
  save.coins -= EGG_SLOT_PRICE;
  save.eggs.paidSlot = true;
  save.eggs.unlockedSlots = Math.min(EGG_SLOT_MAX, (save.eggs.unlockedSlots || 1) + 1);
  writeSave(save);
  return { ok: true, price: EGG_SLOT_PRICE, unlocked: save.eggs.unlockedSlots };
}

/** 看广告送 1 个孵蛋槽位（上限 3，只能领一次；广告播放由 UI 层负责） */
export function eggAdSlot(save) {
  save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
  if (save.eggs.adSlot) return { ok: false, error: "已领取过广告槽位" };
  if (save.eggs.unlockedSlots >= EGG_SLOT_MAX) return { ok: false, error: "孵蛋槽位已全部解锁" };
  save.eggs.adSlot = true;
  save.eggs.unlockedSlots = Math.min(EGG_SLOT_MAX, (save.eggs.unlockedSlots || 1) + 1);
  writeSave(save);
  return { ok: true, unlocked: save.eggs.unlockedSlots };
}
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** 孵化器 + 待孵栏视图（待孵蛋不显示 dex，保持神秘感） */
export function eggList(save) {
  save.eggs.slots ||= [];
  save.eggs.stock ||= [];
  const now = Date.now();
  const out = [];
  for (let i = 0; i < save.eggs.unlockedSlots; i++) {
    const e = save.eggs.slots[i];
    const total = e ? hatchMsOf(e.eggTier) : 0;
    const leftMs = e ? Math.max(0, e.startTs + total - now) : 0;
    out.push(e ? {
      tier: e.eggTier || "normal", startTs: e.startTs, dex: e.dex, leftMs,
      progress: Math.max(0, Math.min(1, (now - e.startTs) / total)),
      ready: leftMs <= 0,
    } : null);
  }
  return {
    slots: out,
    unlocked: save.eggs.unlockedSlots,
    free: out.filter((e) => !e).length,
    paidSlot: !!save.eggs.paidSlot,
    adSlot: !!save.eggs.adSlot,
    stock: save.eggs.stock.map((e, index) => ({ index, tier: e.eggTier || "normal" })),
  };
}

/** 从待孵栏放入孵化器（玩家主动选择）；放入后开始计时 */
export function eggStart(save, index) {
  save.eggs.slots ||= [];
  save.eggs.stock ||= [];
  const e = save.eggs.stock[index];
  if (!e) return { ok: false, error: "这颗蛋不见了" };
  let free = -1;
  for (let i = 0; i < save.eggs.unlockedSlots; i++) {
    if (!save.eggs.slots[i]) { free = i; break; }
  }
  if (free < 0) return { ok: false, error: "孵化器已满，等一颗孵完再放入" };
  // 兼容旧存档/成就奖励里 dex 为 null 的蛋：放入孵化器时补定精灵
  const dex = e.dex ?? rollEggDex(save, e.eggTier || "normal");
  save.eggs.slots[free] = { eggTier: e.eggTier || "normal", startTs: Date.now(), dex };
  save.eggs.stock.splice(index, 1);
  writeSave(save);
  return { ok: true, slot: free };
}

/** 看广告立即孵出：把倒计时直接归零，每日次数由 UI 层 ad-caps 控制 */
export function eggAdInstant(save, slot) {
  save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
  save.eggs.slots ||= [];
  const e = save.eggs.slots[slot];
  if (!e) return { ok: false, error: "空蛋槽" };
  e.startTs = Date.now() - hatchMsOf(e.eggTier) - 1;
  writeSave(save);
  return { ok: true, slot };
}

/** 看广告加速：减 4 小时；每天最多 3 次 */
export function eggSpeedUp(save, slot) {
  save.eggs.slots ||= [];
  const e = save.eggs.slots[slot];
  if (!e) return { ok: false, error: "空蛋槽" };
  const day = todayStr();
  const cur = save.eggs.adDay || {};
  const used = cur.date === day ? (cur.count || 0) : 0;
  if (used >= 3) return { ok: false, error: "今日广告加速已用完" };
  const total = hatchMsOf(e.eggTier);
  const left = Math.max(0, e.startTs + total - Date.now());
  if (left <= 0) return { ok: false, error: "这颗蛋已经可以孵化" };
  e.startTs -= Math.min(EGG_AD_REDUCE_MS, left);
  save.eggs.adDay = { date: day, count: used + 1 };
  writeSave(save);
  return { ok: true, leftMs: Math.max(0, e.startTs + total - Date.now()), left: 3 - used - 1 };
}

/** 使用背包里的「孵蛋加速券」：减少剩余时间 50%（至少 1 分钟），消耗 1 张 */
export function eggItemSpeedUp(save, slot) {
  save.eggs.slots ||= [];
  const e = save.eggs.slots[slot];
  if (!e) return { ok: false, error: "空蛋槽" };
  const total = hatchMsOf(e.eggTier);
  const left = Math.max(0, e.startTs + total - Date.now());
  if (left <= 0) return { ok: false, error: "这颗蛋已经可以孵化" };
  const n = save.bag?.items?.[HATCH_ITEM] || 0;
  if (n <= 0) return { ok: false, error: "没有孵蛋加速券" };
  const cut = Math.max(60 * 1000, Math.floor(left / 2));
  e.startTs -= Math.min(cut, left);
  save.bag.items[HATCH_ITEM] = n - 1;
  writeSave(save);
  return { ok: true, leftMs: Math.max(0, e.startTs + total - Date.now()), cut, left: n - 1 };
}

/**
 * 孵化：时间到才能开。返回
 *   { ok, recruited, dex, first, placed }  出蛋入队
 *   { ok, dup, dex, coin }                 撞车折币
 *   { ok:false, error, leftMs? }           未就绪等
 */
export function eggHatch(save, slot) {
  save.eggs.slots ||= [];
  const e = save.eggs.slots[slot];
  if (!e) return { ok: false, error: "空蛋槽" };
  const left = e.startTs + hatchMsOf(e.eggTier) - Date.now();
  if (left > 0) return { ok: false, error: "还没孵好", leftMs: left };

  // 旧存档/异常数据可能在蛋槽里留下 null dex，孵化时兜底补定，避免 getPokemon(null) 崩溃
  const dex = e.dex ?? rollEggDex(save, e.eggTier || "normal");
  save.eggs.slots[slot] = null; // 先清槽
  const r = addMon(save, dex, { from: "egg" });
  if (r.ok) {
    const level = syncAcquireLevel(save, r.id, dex, e.eggTier === "premium" ? "egg_premium" : "egg_normal");
    writeSave(save);
    return {
      ok: true, recruited: true, dex, level, first: r.isNewDex, placed: r.movedTo,
      legend: LEGENDARY_DEX.has(dex), mon: getPokemon(dex),
    };
  }
  // 撞车折币：商店价 50% —— 普通 25 / 高级 75 / 传说 200
  const refund = LEGENDARY_DEX.has(dex)
    ? DUPE_REFUND_LEGEND
    : e.eggTier === "premium" ? DUPE_REFUND_PREMIUM : DUPE_REFUND;
  save.coins += refund;
  writeSave(save);
  return {
    ok: true, dup: true, dex, coin: refund, legend: LEGENDARY_DEX.has(dex), error: r.error,
  };
}

export { EGG_SLOTS, HATCH_MS, DUPE_REFUND };





