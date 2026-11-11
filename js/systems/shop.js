/**
 * shop.js —— 每日商店（S2）· pokedunk-v2 · v12（传说蛋池 1%）
 * 行为规格移植自旧 pokedunk journey-core/shop（用户定稿设计）：
 *   货架 6 格 = 4 精灵 + 1 蛋 + 1 树果；懒刷新（跨天重摇）；撞车置灰；
 *   蛋购买时定 dex（防改时间刷稀有）；树果库存制入背包。
 * 数值（临时口径，S13 定案）：mon 60 / egg 50 / berry 30；孵化测试期 30s；撞车折 25 币。
 */
import { getPokemon } from "../../engine/data/pokemon.js";
import { addMon, hasDex } from "../storage.js?v=14";
import { rarityOf, LEGENDARY_DEX } from "./build.js?v=8";

const MIN30 = 30 * 60 * 1000;
const HOUR6 = 6 * 60 * 60 * 1000;

/** 蛋档位：传说 1% 独立判定；其余按普通/稀有比例 */
export const EGG_TIERS = {
  normal: { id: "normal", name: "普通蛋", price: 50, hatchMs: MIN30, legendOdds: 1, odds: { 普通: 70, 稀有: 30 } },
  premium: { id: "premium", name: "高级蛋", price: 150, hatchMs: HOUR6, legendOdds: 1, odds: { 普通: 30, 稀有: 70 } },
};
export const PRICES = { mon: 60, egg: 50, premiumEgg: 150, berry: 30 };
export const HATCH_MS = MIN30;
export const EGG_SLOTS = 1;
export const DUPE_REFUND = 25;
export const DUPE_REFUND_LEGEND = 200;
export const BERRY_XP = { normal: 50, premium: 300 };

const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
};

/** 按档位概率抽一只蛋中精灵：未拥有优先；传说独立 1% 判定 */
function rollEggDex(save, tier) {
  const rows = window.__PJ_DEX_ROWS || [];
  const legendPool = rows.filter((r) => LEGENDARY_DEX.has(r[0]));
  if (legendPool.length && Math.random() * 100 < (EGG_TIERS[tier] || EGG_TIERS.normal).legendOdds) {
    const unownedLegend = legendPool.filter((r) => !save.dex || !save.dex[r[0]]);
    const pool = unownedLegend.length ? unownedLegend : legendPool;
    return pool[Math.floor(Math.random() * pool.length)][0];
  }

  const all = rows.filter((r) => !LEGENDARY_DEX.has(r[0]));
  const unowned = all.filter((r) => !save.dex || !save.dex[r[0]]);
  const base = unowned.length ? unowned : all;
  const odds = (EGG_TIERS[tier] || EGG_TIERS.normal).odds;
  const wantRare = Math.random() * 100 >= odds.普通;
  const want = wantRare ? "稀有" : "普通";
  let pool = base.filter((r) => rarityOf(r[0]) === want);
  if (!pool.length) pool = base.length ? base : [[25, "皮皮"]];
  return pool[Math.floor(Math.random() * pool.length)][0];
}

/** 重摇当日货架（4 精灵 + 普通蛋 + 高级蛋 + 树果） */
function rollShop(save) {
  const rows = (window.__PJ_DEX_ROWS || [])
    .filter((r) => !LEGENDARY_DEX.has(r[0]))
    .slice()
    .sort(() => Math.random() - 0.5);
  const items = [];
  for (let i = 0; i < 4 && i < rows.length; i++) items.push({ t: "mon", dex: rows[i][0], price: PRICES.mon });
  items.push({ t: "egg", tier: "normal", dex: rollEggDex(save, "normal"), price: EGG_TIERS.normal.price });
  items.push({ t: "egg", tier: "premium", dex: rollEggDex(save, "premium"), price: EGG_TIERS.premium.price });
  items.push({ t: "berry", price: PRICES.berry });
  save.shop = { date: todayStr(), slots: items, soldFlags: {}, adDay: save.shop?.adDay || null };
}

/** 懒刷新：跨天重摇货架（写回 save.shop） */
function shopEnsure(save) {
  const slots = Array.isArray(save.shop?.slots) ? save.shop.slots : [];
  const hasPremium = slots.some((it) => it.t === "egg" && it.tier === "premium");
  const hasLegendMon = slots.some((it) => it.t === "mon" && LEGENDARY_DEX.has(it.dex));
  if (save.shop && save.shop.date === todayStr() && slots.length >= 7 && hasPremium && !hasLegendMon) return;
  rollShop(save);
}

/** 看广告刷新当日货架：每天 1 次 */
export function shopAdRefresh(save) {
  shopEnsure(save);
  const day = todayStr();
  const cur = save.shop.adDay || {};
  const used = cur.date === day ? (cur.count || 0) : 0;
  if (used >= 1) return { ok: false, error: "今日广告刷新已用完" };
  const adDay = save.shop.adDay;
  rollShop(save);
  save.shop.adDay = { date: day, count: used + 1 };
  return { ok: true, left: 0, adDay };
}

export function shopAdRefreshLeft(save) {
  shopEnsure(save);
  const day = todayStr();
  return save.shop.adDay && save.shop.adDay.date === day ? Math.max(0, 1 - (save.shop.adDay.count || 0)) : 1;
}

/** 货架视图：[{slot, type, dex, price, owned}] */
export function shopList(save) {
  shopEnsure(save);
  return save.shop.slots.map((it, i) => ({
    slot: i,
    type: it.t,
    tier: it.tier || null,
    dex: it.dex ?? null,
    price: it.price,
    owned: it.t === "mon" ? hasDex(save, it.dex) : false,
  }));
}

/**
 * 购买：统一走 addMon（同种唯一/队满入仓/图鉴点亮都在里面）。
 * 返回 { ok, kind, ... } 或 { ok:false, error }
 */
export function shopBuy(save, slot) {
  shopEnsure(save);
  const it = save.shop.slots[slot];
  if (!it) return { ok: false, error: "no-slot" };

  if (it.t === "mon") {
    if (hasDex(save, it.dex)) return { ok: false, error: "已拥有同种精灵" };
    if (save.coins < it.price) return { ok: false, error: "篮球币不足" };
    save.coins -= it.price;
    const r = addMon(save, it.dex, { from: "shop" });
    if (!r.ok) { save.coins += it.price; return { ok: false, error: r.error }; }
    return { ok: true, kind: "mon", dex: it.dex, placed: r.movedTo, first: r.isNewDex, mon: getPokemon(it.dex) };
  }

  if (it.t === "egg") {
    save.eggs.stock ||= [];
    if (save.coins < it.price) return { ok: false, error: "篮球币不足" };
    const tier = it.tier === "premium" ? "premium" : "normal";
    save.coins -= it.price;
    // 货架生成时已按概率定 dex（S3 防改时间刷稀有）；先进入待孵栏
    save.eggs.stock.push({ eggTier: tier, dex: it.dex ?? rollEggDex(save, tier) });
    return { ok: true, kind: "egg", tier, stock: save.eggs.stock.length };
  }

  if (it.t === "berry") {
    if (save.coins < it.price) return { ok: false, error: "篮球币不足" };
    save.coins -= it.price;
    save.bag.berryNormal = (save.bag.berryNormal || 0) + 1;
    return { ok: true, kind: "berry", count: save.bag.berryNormal };
  }
  return { ok: false, error: "bad-item" };
}





