/**
 * settle.js —— 比赛结算（pokedunk-v2 · 赛季 v2.4）
 * 奖励口径（docs/09 §6.3/§7）：
 *   - 篮球币：base = 20 + 0.5×对手OVR；常规赛×0.4 / 小决赛×1.5 / 四天王×3.0
 *   - 模拟胜利：奖励 ×0.8、无首通；手动胜利：100% + 首通 +50%（仅第一次）
 *   - 重复通关递减：100% → 50% → 25% → 10%
 *   - 小决赛 3-0 常规赛：金币 +10%（模拟 +5%）
 *   - 失败：每天前 3 次给胜利奖励 20%，之后 0；模拟失败 0 XP；退出 0 币 0 XP
 *   - 四天王胜利：冠军 +300 币，进入下一赛季（season.js 负责重置）
 * XP：胜 12+分差、负 5，再按关卡 40%/100%/200% 缩放，模拟 ×0.8。
 */
import { xpToNext, rollGrowth, getPokemon } from "../../engine/readable/play-core.js?v=15";
import { EVOLUTIONS } from "../../engine/data/evolutions.js";
import { recordEvolution, writeSave, addMon, hasDex } from "../storage.js?v=14";
import { DUPE_REFUND, DUPE_REFUND_LEGEND } from "../systems/shop.js?v=12";
import { ACHV } from "../systems/achv.js?v=8";
import { bumpDaily } from "../ui/earn.js?v=10";
import { currentMatchInfo, recordResult } from "./season.js?v=14";
import { activeBonds, ITEM_TYPES, LEGENDARY_DEX } from "../systems/build.js?v=8";
import { offerLegendReward } from "./legend.js?v=4";

const SIGN_CHANCE = 0.25;
const KIND_COIN = { league: 0.4, playoff: 1.0, final: 1.5, elite: 3.0 };
const KIND_XP = { league: 0.4, playoff: 1.0, final: 1.5, elite: 2.0 };

/** 战胜签约：胜利后概率收服对手一名上场精灵 */
function trySign(save, engine) {
  if (Math.random() >= SIGN_CHANCE) return null;
  const roster = engine.teams[1].roster;
  if (!roster?.length) return null;
  const pick = roster[Math.floor(Math.random() * roster.length)];
  const name = getPokemon(pick.dex).name;
  if (hasDex(save, pick.dex)) {
    const refund = LEGENDARY_DEX.has(pick.dex) ? DUPE_REFUND_LEGEND : DUPE_REFUND;
    save.coins += refund;
    return { dex: pick.dex, name, dup: true, coin: refund };
  }
  const r = addMon(save, pick.dex, { from: "sign" });
  return r.ok ? { dex: pick.dex, name, dup: false, movedTo: r.movedTo } : null;
}

/** 单个个体吃 XP（含升级循环+进化判定），返回播报；动画事件写入 anims */
function grantXp(save, monId, mon, amount, anims) {
  const events = [];
  if (!amount) return events;
  mon.xp += amount;
  while (mon.xp >= xpToNext(mon.level)) {
    mon.xp -= xpToNext(mon.level);
    if (mon.level >= 99) { mon.xp = 0; break; }
    mon.level++;
    const growth = rollGrowth({ dex: mon.dex, bonus: mon.bonus }, Math.random);
    events.push(`${getPokemon(mon.dex).name} 升到 Lv.${mon.level}（${growth.join("、") || "无加点"}）`);
    const evo = EVOLUTIONS[mon.dex];
    if (evo && mon.level >= evo.level && evo.to.length) {
      const oldDex = mon.dex;
      const oldName = getPokemon(oldDex).name;
      const r = recordEvolution(save, monId, evo.to[0]);
      if (r.ok) {
        const newName = getPokemon(r.newDex).name;
        events.push(`进化！${oldName} → ${newName}`);
        anims.push({ type: "evolve", monId, oldDex, newDex: r.newDex, oldName, newName, growth });
      }
    } else {
      anims.push({ type: "levelup", monId, dex: mon.dex, level: mon.level, growth });
    }
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

  // 赛前信息（推进前读取）
  const info = currentMatchInfo(save, mode) || {
    kind: mode === "elite" ? "elite" : "league",
    season: save.journey?.season?.no || 1,
    smallName: mode === "elite" ? "四天王挑战" : "常规赛",
    targetPower: 60,
    gym,
  };

  // 1. 战绩
  if (won) save.stats.w++; else save.stats.l++;

  // 2. 奖励
  const oppOvr = engine
    ? Math.round(engine.teams[1].roster.reduce((a, p) => a + p.ovr, 0) / engine.teams[1].roster.length)
    : (info.targetPower || 60);
  const baseCoins = 20 + Math.round(oppOvr * 0.5);
  const coinMult = info.kind === "playoff"
    ? (info.playoffRound === "final" ? 1.5 : 1.0)
    : (KIND_COIN[info.kind] ?? 0.4);
  const xpMult = info.kind === "playoff"
    ? (info.playoffRound === "final" ? 1.5 : 1.0)
    : (KIND_XP[info.kind] ?? 0.4);

  let coins = 0;
  let xp = 0;
  if (!quit && won) {
    coins = baseCoins * coinMult;
    xp = (12 + margin) * xpMult;
    if (simulated) {
      coins *= 0.8;
      xp *= 0.8;
    }
    if (info.kind === "elite") coins += 300;
  } else if (!quit) {
    const n = bumpDaily("loss");
    coins = n <= 3 ? baseCoins * 0.2 : 0;
    xp = simulated ? 0 : 5;
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
  save.team.slice(0, 5).forEach((id) => {
    const mon = save.mons[id];
    if (mon) xpEvents.push(...grantXp(save, id, mon, xp, anims));
  });

  // 4. 战胜签约
  const sign = won && engine?.teams?.[1]?.roster ? trySign(save, engine) : null;

  // 5. 赛程推进（联赛/季后赛/四天王），再发传说/道具
  const seasonNo = info.season || save.journey?.season?.no || 1;
  const advance = recordResult(save, info, { won, myScore, oppScore, sim: simulated });
  if (advance.champion) {
    coins += 300;
    save.coins += 300; // 联赛总冠军奖励
  }
  const legendReward = advance.legendTrack ? offerLegendReward(save, seasonNo, advance.legendTrack) : null;

  // 徽章/冠军/四天王发道具
  let itemGained = null;
  if (advance.badgeGained || advance.champion || (advance.fourKings && advance.legendTrack)) {
    save.bag.items ||= {};
    const keys = Object.keys(ITEM_TYPES);
    itemGained = keys[Math.floor(Math.random() * keys.length)];
    save.bag.items[itemGained] = (save.bag.items[itemGained] || 0) + 1;
  }
  const after = currentMatchInfo(save, mode);

  // 6. 每日活跃 / 成就
  bumpDaily("match");
  if (sign) bumpDaily("sign");
  save.flags = save.flags || {};
  if (sign) save.flags.sign1 = true;
  ACHV.evaluateMatch(save, { won, margin });

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
    seasonEnded: advance.seasonEnded,
    legendReward,
    nextLabel: after ? after.label : (mode === "elite" ? "四天王已通关" : "赛季结束"),
    sign,
    simulated,
    levelKind: info.kind,
    smallName: info.smallName,
    itemGained,
    itemName: itemGained ? ITEM_TYPES[itemGained].name : null,
  };
}







