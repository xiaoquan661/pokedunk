/**
 * shop.js —— 每日商店（S2）· pokedunk-v2 · v13（S13 经济定案）
 * 行为规格移植自旧 pokedunk journey-core/shop（用户定稿设计）：
 *   货架 6 格 = 2 精灵 + 普通蛋 + 高级蛋 + 普通树果 + 高级树果；懒刷新（跨天重摇）；撞车置灰；
 *   蛋购买时定 dex（防改时间刷稀有）；树果库存制入背包。
 * S13 数值：精灵按种族 OVR 分档 80/120/180/240/320；普通蛋 70；高级蛋 220/3h/必稀有；
 *            撞车返还商店价 50%（普通 35 / 高级 110）；传说撞车 200。
 */
import { getPokemon } from "../../engine/data/pokemon.js";
import { addMon, hasDex } from "../storage.js?v=38";
import { rarityOf, LEGENDARY_DEX } from "./build.js?v=31";

const MIN30 = 30 * 60 * 1000;
const HOUR3 = 3 * 60 * 60 * 1000;

/** 蛋档位：传说独立判定；高级蛋必出稀有 */
export const EGG_TIERS = {
  normal: { id: "normal", name: "普通蛋", price: 70, hatchMs: MIN30, legendOdds: 1, odds: { 普通: 70, 稀有: 30 } },
  premium: { id: "premium", name: "高级蛋", price: 220, hatchMs: HOUR3, legendOdds: 3, odds: { 普通: 0, 稀有: 100 } },
};
export const PRICES = { mon: 80, monMax: 320, egg: 70, premiumEgg: 220, berry: 30, berryPremium: 90 };
export const HATCH_MS = MIN30;
export const EGG_SLOTS = 1;
export const DUPE_REFUND = 35;
export const DUPE_REFUND_PREMIUM = 110;
export const DUPE_REFUND_LEGEND = 200;
export const BERRY_XP = { normal: 50, premium: 300 };
/** 每日限购：蛋按档位、树果按档位；跨天重置，广告刷新不重置 */
export const SHOP_LIMITS = {
  egg_normal: 1,
  egg_premium: 1,
  berry_normal: 3,
  berry_premium: 2,
};
const emptyBought = () => ({ egg_normal: 0, egg_premium: 0, berry_normal: 0, berry_premium: 0 });
const limitKeyOf = (it) => {
  if (it.t === "egg") return it.tier === "premium" ? "egg_premium" : "egg_normal";
  if (it.t === "berry") return it.tier === "premium" ? "berry_premium" : "berry_normal";
  return null;
};

/** 精灵售价：按种族 OVR 分档，购买时用未养成个体 */
export function monPrice(dex) {
  const ovr = getPokemon(dex).ovr || 0;
  if (ovr < 60) return 80;
  if (ovr < 70) return 120;
  if (ovr < 80) return 180;
  if (ovr < 90) return 240;
  return 320;
}

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
  // 高级蛋承诺必出稀有：若未拥有的稀有已抽完，从全部稀有里撞车，不退化成普通
  if (!pool.length && wantRare) pool = all.filter((r) => rarityOf(r[0]) === "稀有");
  if (!pool.length) pool = base.length ? base : [[25, "皮皮"]];
  return pool[Math.floor(Math.random() * pool.length)][0];
}

/** 精灵出现权重：低 OVR 更常见，高 OVR 稀有 */
function spawnWeight(dex) {
  const ovr = getPokemon(dex).ovr || 0;
  if (ovr < 50) return 5;
  if (ovr < 60) return 4;
  if (ovr < 70) return 3;
  if (ovr < 80) return 2;
  if (ovr < 90) return 1;
  return 0.5;
}
/** 按权重抽一只，排除已抽出 */
function weightedPick(list, used) {
  const pool = list.filter((r) => !used.has(r[0]));
  if (!pool.length) return null;
  const total = pool.reduce((a, r) => a + spawnWeight(r[0]), 0);
  let roll = Math.random() * total;
  for (const r of pool) {
    roll -= spawnWeight(r[0]);
    if (roll <= 0) return r;
  }
  return pool[pool.length - 1];
}

const RARE_SLOT_CHANCE = 0.55;
/** 货架精灵：2 格；优先未拥有；第 1 格普通档，第 2 格 55% 稀有 */
function pickShopMons(save) {
  const all = (window.__PJ_DEX_ROWS || []).filter((r) => !LEGENDARY_DEX.has(r[0]));
  const unowned = all.filter((r) => !save.dex || !save.dex[r[0]]);
  const pool = unowned.length ? unowned : all;
  const common = pool.filter((r) => rarityOf(r[0]) === "普通");
  const rare = pool.filter((r) => rarityOf(r[0]) !== "普通");
  const picks = [];
  const used = new Set();
  const take = (list) => {
    const r = weightedPick(list, used);
    if (!r) return false;
    picks.push(r);
    used.add(r[0]);
    return true;
  };
  // 第 1 格：普通档；没有普通档时用稀有档
  if (!take(common)) take(rare);
  // 第 2 格：55% 稀有，否则普通；池子不足时从全量补
  if (rare.length && Math.random() < RARE_SLOT_CHANCE) take(rare);
  else take(common);
  while (picks.length < 2 && take(all)) {}
  return picks.slice(0, 2);
}

/** 重摇当日货架（2 精灵 + 普通蛋 + 高级蛋 + 树果） */
function rollShop(save) {
  const items = [];
  for (const r of pickShopMons(save)) {
    items.push({ t: "mon", dex: r[0], price: monPrice(r[0]) });
  }
  items.push({ t: "egg", tier: "normal", dex: rollEggDex(save, "normal"), price: EGG_TIERS.normal.price });
  items.push({ t: "egg", tier: "premium", dex: rollEggDex(save, "premium"), price: EGG_TIERS.premium.price });
  items.push({ t: "berry", tier: "normal", price: PRICES.berry });
  items.push({ t: "berry", tier: "premium", price: PRICES.berryPremium });
  const day = todayStr();
  const sameDay = save.shop?.date === day;
  const bought = sameDay ? { ...emptyBought(), ...(save.shop.bought || {}) } : emptyBought();
  save.shop = { date: day, slots: items, soldFlags: {}, adDay: save.shop?.adDay || null, bought };
}

/** 懒刷新：跨天重摇货架（写回 save.shop） */
function shopEnsure(save) {
  const slots = Array.isArray(save.shop?.slots) ? save.shop.slots : [];
  const hasPremium = slots.some((it) => it.t === "egg" && it.tier === "premium");
  const hasLegendMon = slots.some((it) => it.t === "mon" && LEGENDARY_DEX.has(it.dex));
  if (save.shop && save.shop.date === todayStr() && slots.length === 6 && hasPremium && !hasLegendMon) {
    save.shop.bought = { ...emptyBought(), ...(save.shop.bought || {}) };
    return;
  }
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
  return save.shop.slots.map((it, i) => {
    const key = limitKeyOf(it);
    const limit = key ? SHOP_LIMITS[key] : 0;
    const bought = key ? (save.shop.bought?.[key] || 0) : 0;
    return {
      slot: i,
      type: it.t,
      tier: it.tier || null,
      dex: it.dex ?? null,
      price: it.price,
      ovr: it.t === "mon" ? getPokemon(it.dex).ovr : null,
      rarity: it.t === "mon" ? rarityOf(it.dex) : null,
      owned: it.t === "mon" ? hasDex(save, it.dex) : false,
      limit,
      bought,
      left: key ? Math.max(0, limit - bought) : null,
      soldOut: key ? bought >= limit : false,
    };
  });
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
    const key = limitKeyOf(it);
    const bought = save.shop.bought?.[key] || 0;
    if (bought >= SHOP_LIMITS[key]) return { ok: false, error: `今日限购 ${SHOP_LIMITS[key]} 个，明天再来` };
    if (save.coins < it.price) return { ok: false, error: "篮球币不足" };
    const tier = it.tier === "premium" ? "premium" : "normal";
    save.coins -= it.price;
    save.shop.bought[key] = bought + 1;
    // 货架生成时已按概率定 dex（S3 防改时间刷稀有）；先进入待孵栏
    save.eggs.stock.push({ eggTier: tier, dex: it.dex ?? rollEggDex(save, tier) });
    return { ok: true, kind: "egg", tier, stock: save.eggs.stock.length, left: SHOP_LIMITS[key] - bought - 1 };
  }

  if (it.t === "berry") {
    const key = limitKeyOf(it);
    const bought = save.shop.bought?.[key] || 0;
    if (bought >= SHOP_LIMITS[key]) return { ok: false, error: `今日限购 ${SHOP_LIMITS[key]} 个，明天再来` };
    if (save.coins < it.price) return { ok: false, error: "篮球币不足" };
    save.coins -= it.price;
    save.shop.bought[key] = bought + 1;
    const premium = it.tier === "premium";
    const bagKey = premium ? "berryPremium" : "berryNormal";
    save.bag[bagKey] = (save.bag[bagKey] || 0) + 1;
    return { ok: true, kind: "berry", tier: premium ? "premium" : "normal", count: save.bag[bagKey], left: SHOP_LIMITS[key] - bought - 1 };
  }
  return { ok: false, error: "bad-item" };
}





