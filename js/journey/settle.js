/**
 * settle.js —— 比赛结算（pokedunk-v2 · 主线）
 * 奖励口径（docs/09 §6.3/§7，S13 定案）：
 *   - 篮球币：base = 20 + 0.5×对手OVR；道馆战×0.7 / 四天王×3.0
 *   - 模拟胜利：奖励 ×0.8；失败：每天前 3 次给胜利奖励 20%，之后 0；退出 0 币 0 XP
 *   - 四天王胜利：额外 +400 币；地区冠军额外 +400 币
 * XP：胜 12+分差，按关卡 5.0/7.0/8.0 缩放；负 25（模拟失败 0）；模拟 ×0.8。
 */
import { xpToNext, getPokemon } from "../../engine/readable/play-core.js?v=682";
import { rollGrowth } from "../../engine/growth.js?v=682";
import { writeSave, addMon, hasDex, markSeen } from "../storage.js?v=682";
import { monPrice } from "../systems/shop.js?v=682";
import { ACHV } from "../systems/achv.js?v=682";
import { bumpDaily } from "../ui/earn.js?v=682";
import { currentMatchInfo, recordResult, grantFourKingsReward } from "./season.js?v=682";
import { activeBonds, starterIds, ITEM_TYPES, LEGENDARY_DEX, growthZh, rarityOf } from "../systems/build.js?v=682";
import { offerLegendReward } from "./legend.js?v=682";
import { syncAcquireLevel } from "../systems/acquire.js?v=682";
import { recordSeasonStats, ensureOvrBase, computeSeasonAwards } from "../systems/awards.js?v=682";
import { ensureCareerStats } from "../systems/career.js?v=682";
import { levelCapOf } from "./regions.js?v=682";
import { ensureBadgeUnlocks } from "../systems/badge-unlocks.js?v=682";

const CONTRACT_DISCOUNT = 1; // 合同按商店原价出售，不再打折
// S31：每场胜利 35% 概率出现合同；连续 3 胜未出，下一场必出
const CONTRACT_CHANCE = 0.35;
const CONTRACT_PITY = 3;
// S13：道馆战收益上调，避免“打一场不如看一条广告”；四天王同步提高
const KIND_COIN = { league: 0.7, playoff: 1.5, final: 2.0, elite: 3.0 };
const KIND_XP = { league: 10.0, playoff: 13.0, final: 15.0, elite: 15.0 };

/**
 * 战胜后的精灵合同：每场胜利按 35% 概率出现；连续 3 场胜利未出，下一场必出。
 * 从普通+稀有的未结缘精灵中抽 3 只供玩家选 1，按商店原价出售；不出传说，不重复返币。
 */
export function rollContract(save) {
  const season = save.journey?.season;
  if (!season) return null;
  const dry = season.contractDry || 0;
  const forced = dry >= CONTRACT_PITY;
  if (!forced && Math.random() >= CONTRACT_CHANCE) {
    season.contractDry = dry + 1;
    return null;
  }
  const rows = window.__PJ_DEX_ROWS || [];
  const pool = rows.filter((r) => {
    const dex = r[0];
    if (LEGENDARY_DEX.has(dex)) return false;
    if (hasDex(save, dex)) return false;
    return true;
  });
  if (!pool.length) return null;

  // 三选一：部分洗牌，避免重复抽取，也不会因 RNG 重复而卡死
  const count = Math.min(3, pool.length);
  const shuffled = pool.slice();
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (shuffled.length - i));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, count);
  const offers = picked.map((row) => {
    const dex = row[0];
    const name = String(row[1] ?? getPokemon(dex).name).replace(/#\d+$/, "");
    const basePrice = monPrice(dex);
    const price = Math.max(30, Math.round((basePrice * CONTRACT_DISCOUNT) / 5) * 5);
    return { dex, name, basePrice, price, rarity: rarityOf(dex), ovr: getPokemon(dex).ovr };
  });
  season.contracts = (season.contracts || 0) + 1;
  season.contractDry = 0;
  return { offers };
}

/** 签下合同：扣币、入队/仓库、点亮签约成就 */
export function signContract(save, offer) {
  if (!offer) return { ok: false, error: "没有可签的合同" };
  if (hasDex(save, offer.dex)) return { ok: false, error: "已经与这只精灵结缘了" };
  if (save.coins < offer.price) return { ok: false, error: `篮球币不足（需 ${offer.price}）` };
  const before = save.coins;
  save.coins -= offer.price;
  const r = addMon(save, offer.dex, { from: "sign" });
  if (!r.ok) {
    save.coins = before;
    return { ok: false, error: r.error || "签约失败" };
  }
  const level = syncAcquireLevel(save, r.id, offer.dex, "sign");
  save.flags = save.flags || {};
  save.flags.sign1 = true;
  bumpDaily("sign");
  writeSave(save);
  return { ok: true, movedTo: r.movedTo, coins: save.coins, level };
}

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

/** 单个个体吃 XP：以“一只精灵”为单位结算，多级合并成一条播报/一个动画 */
function grantXp(save, monId, mon, amount, anims) {
  const events = [];
  if (!amount) return events;
  const fromLevel = mon.level;
  const growthAll = [];
  const cap = levelCapOf(save);
  mon.xp += amount;
  while (mon.xp >= xpToNext(mon.level)) {
    if (mon.level >= cap) {
      mon.xp = Math.min(mon.xp, Math.max(0, xpToNext(mon.level) - 1));
      break;
    }
    mon.xp -= xpToNext(mon.level);
    mon.level++;
    growthAll.push(...rollGrowth({ dex: mon.dex, bonus: mon.bonus }, Math.random).map(growthZh));
    mon.train ||= { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 };
    mon.train.free = (mon.train.free || 0) + 1;
    mon.train.freeEarned = (mon.train.freeEarned || 0) + 1;
  }
  if (mon.level > fromLevel) {
    const levels = mon.level - fromLevel;
    const gtxt = growthLine(growthAll);
    events.push(`${getPokemon(mon.dex).name} 升了 ${levels} 级（Lv.${fromLevel} → Lv.${mon.level}）${gtxt ? ` · ${gtxt}` : ""}`);
    if (anims) anims.push({ type: "levelup", monId, dex: mon.dex, fromLevel, toLevel: mon.level, levels, growth: growthAll });
  }
  return events;
}

/**
 * 结算入口。
 * @param quit 中途退出（判负，0 奖励）
 * @param simulated 一键模拟（奖励 80%，无首通）
 */
export function settleMatchResult(save, engine, gym, quit = false, simulated = false, mode = "league") {
  const myScore = engine ? engine.score[0] : 0;
  const oppScore = engine ? engine.score[1] : 0;
  const won = !quit && engine ? myScore > oppScore : false;
  const margin = Math.min(10, Math.abs(myScore - oppScore));
  if (won) {
    const season = save.journey?.season;
    if (season) season.contractWins = (season.contractWins || 0) + 1;
  }

  // 赛前信息（推进前读取）
  const info = currentMatchInfo(save, mode) || {
    kind: mode === "elite" ? "elite" : "league",
    season: save.journey?.season?.no || 1,
    smallName: mode === "elite" ? "四天王挑战" : "道馆战",
    targetPower: 60,
    gym,
  };

  // 0. 地区统计（颁奖用）：先补地区 OVR 基线，再累加本场我方数据
  try {
    ensureOvrBase(save);
    recordSeasonStats(save, engine);
  } catch {}

  // 1. 战绩（生涯累计）
  const cs = ensureCareerStats(save);
  if (won) {
    cs.w++;
    cs.streak = (cs.streak || 0) + 1;
    cs.bestStreak = Math.max(cs.bestStreak || 0, cs.streak);
  } else {
    cs.l++;
    cs.streak = 0;
  }
  cs.pf = (cs.pf || 0) + myScore;
  cs.pa = (cs.pa || 0) + oppScore;

  // 2. 奖励
  const oppOvr = engine
    ? Math.round(engine.teams[1].roster.reduce((a, p) => a + p.ovr, 0) / engine.teams[1].roster.length)
    : (info.targetPower || 60);
  const baseCoins = 40 + Math.round(oppOvr * 1.0);
  const coinMult = info.kind === "playoff"
    ? (info.playoffRound === "final" ? 2.0 : 1.5)
    : (KIND_COIN[info.kind] ?? 0.7);
  const xpMult = info.kind === "playoff"
    ? (info.playoffRound === "final" ? 8.0 : 7.0)
    : (KIND_XP[info.kind] ?? 5.0);

  let coins = 0;
  let xp = 0;
  if (!quit && won) {
    // 金币底座抬高（S46）：一场道馆战约 70–100 币，配合涨价后的商店
    coins = baseCoins * coinMult;
    xp = (12 + margin) * xpMult;
    if (simulated) {
      coins *= 0.8;
      xp *= 0.8;
    }
    if (info.kind === "elite") coins += 400;
  } else if (!quit) {
    const n = bumpDaily("loss");
    coins = n <= 3 ? baseCoins * 0.2 : 0;
    xp = simulated ? 0 : 25;
    if (simulated) coins = n <= 3 ? coins * 0.8 : 0;
  }
  // 御三家羁绊：比赛 XP +10%（经济类）
  if (activeBonds(save).some((b) => b.id === "starters")) xp = Math.round(xp * 1.1);
  coins = Math.round(coins);
  xp = Math.round(xp);
  save.coins += coins;

  // 3. XP（仅上场前 5 人）
  const xpEvents = [];
  const anims = [];
  starterIds(save).forEach((id) => {
    const mon = save.mons[id];
    if (mon) xpEvents.push(...grantXp(save, id, mon, xp, anims));
  });

  // 4. 主线推进（道馆/四天王），再发传说/道具
  const seasonNo = info.season || save.journey?.season?.no || 1;
  const advance = recordResult(save, info, { won, myScore, oppScore, sim: simulated });
  // 徽章设施永久解锁（2/3/4/5/6/7/8 枚）
  try { ensureBadgeUnlocks(save); } catch {}
  if (advance.champion) {
    coins += 400;
    save.coins += 400; // 地区冠军奖励
  }
  const legendReward = advance.legendTrack ? offerLegendReward(save, seasonNo, advance.legendTrack) : null;
  // 四天王首通奖励（每地区一次）：金币 + 高级树果 + 孵蛋加速券
  const fourKingsReward = advance.fourKingsJustCleared ? grantFourKingsReward(save) : null;
  // 地区颁奖（移植原版 __pjCrown）：冠军结算时评选 MVP / 得分王 / 最佳防守 / 第六人 / 最快进步
  let awards = null;
  if (advance.champion) {
    try {
      const res = computeSeasonAwards(save);
      awards = res.awards.length ? res.awards : null;
      const se = save.journey.season;
      se.awards = awards || [];
      se.mvp = res.mvp?.dex ?? null;
      const last = (se.history || [])[se.history.length - 1];
      if (last && last.no === se.no && awards) last.mvp = res.mvp?.name || "—";
    } catch {}
  }
  // 5. 精灵合同：胜利后概率出现
  const contract = won && !quit ? rollContract(save) : null;


  // 战斗掉落：胜利给树果（主要奖励），道具改为 50% 概率
  let berryDrop = null;
  if (won && !quit) {
    let normal = 1 + (margin >= 10 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
    let premium = Math.random() < 0.15 ? 1 : 0;
    if (simulated) { normal = Math.max(1, normal - 1); premium = 0; }
    save.bag.berryNormal = (save.bag.berryNormal || 0) + normal;
    if (premium) save.bag.berryPremium = (save.bag.berryPremium || 0) + premium;
    berryDrop = { normal, premium };
  } else if (!quit && Math.random() < 0.25) {
    // 失败也给一点安慰树果
    save.bag.berryNormal = (save.bag.berryNormal || 0) + 1;
    berryDrop = { normal: 1, premium: 0 };
  }

  let itemDrop = null;
  if (won && !quit && Math.random() < 0.5) {
    save.bag.items ||= {};
    const keys = Object.keys(ITEM_TYPES);
    if (Math.random() < 0.65) {
      const id = keys[Math.floor(Math.random() * keys.length)];
      save.bag.items[id] = (save.bag.items[id] || 0) + 1;
      itemDrop = { id, name: ITEM_TYPES[id].name };
    } else {
      save.bag.items.hatch = (save.bag.items.hatch || 0) + 1;
      itemDrop = { id: "hatch", name: "孵蛋加速券" };
    }
  }

  // 徽章/冠军/四天王发道具
  let itemGained = null;
  if (advance.badgeGained || advance.champion || (advance.fourKings && advance.legendTrack)) {
    save.bag.items ||= {};
    const keys = Object.keys(ITEM_TYPES);
    itemGained = keys[Math.floor(Math.random() * keys.length)];
    save.bag.items[itemGained] = (save.bag.items[itemGained] || 0) + 1;
  }
  const after = currentMatchInfo(save, mode);

  // 6. 每日活跃 / 成就（签约成就在真正买下合同时点亮）
  bumpDaily("match");
  save.flags = save.flags || {};
  ACHV.evaluateMatch(save, { won, margin, myScore });
  // 赛场遇见：双方阵容都写入图鉴的「遇见」记录
  if (engine?.teams) {
    const seen = [];
    for (const team of engine.teams) for (const p of team.roster || []) if (p?.dex) seen.push(p.dex);
    markSeen(save, seen);
  }

  writeSave(save);
  return {
    won,
    myScore,
    oppScore,
    coinsGained: coins,
    xpEvents,
    anims,
    badgeGained: advance.badgeGained,
    badgeName: info.gym?.name,
    champion: advance.champion,
    fourKings: !!advance.fourKings,
    fourKingsJustCleared: !!advance.fourKingsJustCleared,
    fourKingsReward,
    awards,
    mvp: awards?.find((a) => a.key === "mvp") || null,
    seasonEnded: advance.seasonEnded,
    legendReward,
    nextLabel: after ? after.label : (mode === "elite" ? "四天王已通关" : "主线完成"),
    contract,
    simulated,
    levelKind: info.kind,
    smallName: info.smallName,
    itemGained,
    itemName: itemGained ? ITEM_TYPES[itemGained].name : null,
    itemDrop,
    berryDrop,
  };
}







