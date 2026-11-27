/**
 * journey/season.js —— 主线进度状态（S72/S73）
 *
 * 现行结构：地区 → 按顺序 8 个道馆 → 四天王 → 地区冠军 → 下一地区。
 * 已移除 9 队联赛：不再生成赛程、积分榜、轮空或季后赛。
 *
 * 存档 journey.season（v4）：
 * { v, no, phase, badges[], results[], fourKings, champion, history[],
 *   contracts, contractWins, contractDry, playerStats, ovrBase, awards, mvp }
 * 旧档的 schedule / rounds / table / playoffs / byeRound / round 在读取时清理。
 */
import { LEAGUE_GYMS } from "../../engine/readable/play-core.js?v=684";
import { pickGymRoster } from "./gyms.js?v=684";
import { teamPower as buildTeamPower } from "../systems/build.js?v=684";
import { REGIONS, ensureMainline } from "./regions.js?v=684";

const MAINLINE_V = 4;
const LEGACY_KEYS = ["schedule", "scheduleSeason", "rounds", "table", "playoffs", "byeRound", "round"];

const avgOvr = (roster) => (roster.length ? Math.round(roster.reduce((a, p) => a + p.ovr, 0) / roster.length) : 60);

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function emptySeason(no = 1, history = []) {
  return {
    v: MAINLINE_V,
    no,
    phase: "regular",
    badges: [],
    results: [],
    fourKings: { unlocked: false, attempts: 0, cleared: false, rewardClaimed: false, rewardGiven: false },
    contracts: 0,
    contractWins: 0,
    contractDry: 0,
    champion: false,
    playerStats: {},
    ovrBase: {},
    awards: [],
    mvp: null,
    history,
  };
}

/** 旧档迁移：只保留主线需要的字段，清掉联赛残留 */
function migrateSeason(old) {
  const s = emptySeason(Number(old?.no) || 1, Array.isArray(old?.history) ? old.history : []);
  if (!old || typeof old !== "object") return s;
  s.badges = Array.isArray(old.badges) ? [...old.badges] : [];
  s.results = Array.isArray(old.results) ? [...old.results] : [];
  // 新规则下四天王通关即地区冠军；旧档已通四天王的直接补成冠军
  s.champion = !!old.champion || !!old.fourKings?.cleared;
  s.fourKings = {
    unlocked: !!(old.fourKings?.unlocked || s.badges.filter((b) => b !== "champion").length >= 8),
    attempts: old.fourKings?.attempts || 0,
    cleared: !!old.fourKings?.cleared,
    rewardClaimed: !!old.fourKings?.rewardClaimed,
    rewardGiven: !!old.fourKings?.rewardGiven,
  };
  s.contracts = old.contracts || 0;
  s.contractWins = old.contractWins || 0;
  s.contractDry = old.contractDry || 0;
  s.playerStats = old.playerStats || {};
  s.ovrBase = old.ovrBase || {};
  s.awards = Array.isArray(old.awards) ? old.awards : [];
  s.mvp = old.mvp ?? null;
  s.phase = s.champion ? "done" : "regular";
  return s;
}

export function ensureSeason(save) {
  const j = (save.journey ||= {});
  let s = j.season;
  if (!s || s.v !== MAINLINE_V) s = j.season = migrateSeason(s);
  for (const key of LEGACY_KEYS) delete s[key];
  s.v = MAINLINE_V;
  s.no ||= 1;
  s.badges ||= [];
  s.results ||= [];
  s.history ||= [];
  s.fourKings ||= { unlocked: false, attempts: 0, cleared: false, rewardClaimed: false, rewardGiven: false };
  s.fourKings.rewardGiven ??= false;
  s.contractDry ||= 0;
  s.playerStats ||= {};
  s.ovrBase ||= {};
  s.awards ||= [];
  s.mvp ??= null;
  s.phase = s.champion ? "done" : "regular";
  try { syncLegacy(save, s); } catch {}
  return s;
}

export function myTeamPower(save) {
  try { return buildTeamPower(save); } catch { return 0; }
}

/** 当前主线道馆：按徽章数顺序推进 */
export function leagueInfo(save) {
  const s = ensureSeason(save);
  const reg = REGIONS[(save.journey?.regionNo || 1) - 1] || REGIONS[0];
  const badges = (s.badges || []).filter((b) => b !== "champion").length;
  if (s.champion) {
    return { kind: "done", region: reg, badges, smallName: `${reg.name}冠军`, label: `${reg.name}冠军达成 · 前往下一地区` };
  }
  if (badges >= 8) {
    return { kind: "done", region: reg, badges, smallName: "四天王", label: "8 徽章达成 · 挑战四天王" };
  }
  const venue = badges;
  const row = reg.gyms[venue];
  const base = LEAGUE_GYMS[venue];
  if (!base || !row) return { kind: "done", region: reg, badges, smallName: "主线", label: "主线已完成" };
  const roster = pickGymRoster(base.gym, base.types, (s.no - 1) * 2);
  const power = avgOvr(roster);
  return {
    kind: "league", season: s.no, small: 0,
    venue, key: `gym-${save.journey?.regionNo || 1}-${venue}`,
    smallName: `第 ${venue + 1} 馆`,
    gym: {
      ...base, name: row.name, leader: row.leader, typeCn: row.type,
      venue, badge: row.badge,
    },
    leaderRoster: roster,
    leaderPower: power,
    targetPower: power,
    attempt: 1,
    badgeName: row.name,
    label: `${reg.name} · 第 ${venue + 1} 馆 · VS ${row.name} · ${row.leader}`,
  };
}

/** 四天王首通关卡奖励（每地区一次）：金币 + 高级树果 + 孵蛋加速券 */
export const FOUR_KINGS_REWARD = { coins: 2000, berryPremium: 2, hatch: 1 };

/** 是否还有未领取的四天王通关奖励（清关后未发过） */
export function fourKingsRewardPending(save) {
  const s = ensureSeason(save);
  return !!(s.fourKings?.cleared && !s.fourKings.rewardGiven);
}

/** 发放四天王通关奖励；已发过返回 null。调用方负责 writeSave */
export function grantFourKingsReward(save) {
  const s = ensureSeason(save);
  if (!s.fourKings?.cleared || s.fourKings.rewardGiven) return null;
  save.coins = (save.coins || 0) + FOUR_KINGS_REWARD.coins;
  save.bag ||= {};
  save.bag.berryPremium = (save.bag.berryPremium || 0) + FOUR_KINGS_REWARD.berryPremium;
  save.bag.items ||= {};
  save.bag.items.hatch = (save.bag.items.hatch || 0) + FOUR_KINGS_REWARD.hatch;
  s.fourKings.rewardGiven = true;
  s.fourKings.rewardClaimed = true;
  return { ...FOUR_KINGS_REWARD };
}

export function fourKingsInfo(save) {
  const s = ensureSeason(save);
  const badgeCount = (s.badges || []).filter((b) => b !== "champion").length;
  if (badgeCount < 8 || s.fourKings?.cleared) return null;
  const extra = (s.no - 1) * 2;
  const elite = LEAGUE_GYMS.find((g) => g.elite) || LEAGUE_GYMS[LEAGUE_GYMS.length - 1];
  const roster = pickGymRoster("elite", elite.types, extra);
  const power = avgOvr(roster);
  return {
    kind: "elite", season: s.no, smallName: "四天王挑战", venue: 8,
    gym: { ...elite, name: "四天王联队", abbr: "E4" },
    leaderRoster: roster, leaderPower: power, targetPower: power,
    attempt: (s.fourKings.attempts || 0) + 1,
    label: `四天王挑战 · 第 ${(s.fourKings.attempts || 0) + 1} 次`,
  };
}

export function currentMatchInfo(save, mode = "league") {
  return mode === "elite" ? fourKingsInfo(save) : leagueInfo(save);
}

export function matchSeed(save, info) {
  const s = ensureSeason(save);
  const str = info?.key || `${s.no}-${info?.kind}-${info?.venue ?? ""}-${info?.attempt || 1}`;
  return hashStr(str);
}

/** 记录一场比赛并推进；四天王通关即地区冠军 */
export function recordResult(save, info, { won, myScore, oppScore, sim }) {
  const s = ensureSeason(save);
  const no = s.no;

  if (info.kind === "elite") {
    s.fourKings.attempts = (s.fourKings.attempts || 0) + 1;
    let legendTrack = null;
    const justCleared = !!(won && !s.fourKings.cleared);
    if (won && !s.fourKings.cleared) {
      s.fourKings.cleared = true;
      s.fourKings.rewardClaimed = true;
      legendTrack = "fourKings";
      s.champion = true;
      s.phase = "done";
      s.history.push({ no, champion: true, at: Date.now(), w: save.stats.w, l: save.stats.l });
    }
    syncLegacy(save, s);
    return {
      badgeGained: null, champion: justCleared, seasonEnded: justCleared,
      fourKings: true, legendTrack, fourKingsCleared: s.fourKings.cleared, fourKingsJustCleared: justCleared,
      nextLabel: justCleared ? "地区冠军达成 · 前往下一地区" : "四天王挑战失败 · 可再次挑战",
    };
  }

  if (info.kind === "league") {
    s.results.push({
      no, venue: info.venue,
      win: !!won, myScore, oppScore, sim: !!sim, at: Date.now(),
    });
    let badgeGained = null;
    if (won) {
      badgeGained = info.gym?.badge || null;
      if (badgeGained && !s.badges.includes(badgeGained)) s.badges.push(badgeGained);
      if (s.badges.filter((b) => b !== "champion").length >= 8) s.fourKings.unlocked = true;
    }
    syncLegacy(save, s);
    const after = leagueInfo(save);
    return {
      badgeGained, champion: false, seasonEnded: false,
      legendTrack: null, nextLabel: after ? after.label : "8 徽章达成 · 挑战四天王",
    };
  }

  return { badgeGained: null, champion: false, seasonEnded: false, legendTrack: null, nextLabel: "" };
}

/** 冠军后进入下一地区；下一地区内容未就绪时拦截 */
export function startNextSeason(save) {
  const old = ensureSeason(save);
  syncLegacy(save, old);
  ensureMainline(save);
  const next = REGIONS[(save.journey.regionNo || 1)];
  if (old.champion && next && !next.available) {
    return { blocked: true, region: next };
  }
  const nextNo = (old.no || 1) + 1;
  const s0 = emptySeason(nextNo, old.history || []);
  // 非冠军重开时保留地区进度；冠军进入下一地区才清零
  if (!old.champion) {
    s0.badges = [...(old.badges || [])];
    s0.fourKings.unlocked = s0.badges.filter((b) => b !== "champion").length >= 8;
  }
  save.journey.season = s0;
  if (old.champion && next) save.journey.regionNo = next.no;
  return ensureSeason(save);
}

/** 同步旧字段（成就/主页） */
export function syncLegacy(save, s) {
  s ||= ensureSeason(save);
  const j = (save.journey ||= {});
  const badges = [...s.badges];
  if (s.champion) badges.push("champion");
  j.gymBadges = badges;
  j.stage = s.champion ? "done" : "gym";
  j.seasonNo = s.no;
}
