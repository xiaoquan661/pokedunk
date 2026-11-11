/**
 * journey/daily.js —— 每日挑战（docs/15 v2.5 实施定案）
 * 规则：
 *   - 日期做种子，全平台当天同一套对手；每天轮换 modifier（双方同享）
 *   - 对手战力跟随玩家队伍战力（+2，夹在 45~97），无限次尝试、只记当日最高分
 *   - 结算分 = 我方得分 + 扣篮×3 + 三分×2 + 抢断×2 + 盖帽×2 + 胜利 10；模拟 ×0.8
 *   - 每日首胜 +100 币；3 个当日任务（完成场次/首胜/单场扣篮）另领币
 *   - 不推进赛季、不计生涯战绩、不给 XP/签约，避免与训练师之旅互相刷取
 * 状态：save.daily（按 date 懒重置，history 保留最近 7 天）
 */
import {
  getPokemon, buildPlayer, calcOVR, POKEMON_LIST, POSITION_ORDER, simulateFullMatch,
} from "../../engine/readable/play-core.js?v=15";
import { buildMyRoster } from "./match-screen.js?v=30";
import { teamPower, STAT_KEYS } from "../systems/build.js?v=8";
import { writeSave } from "../storage.js?v=14";

const FIRST_WIN_COINS = 100;

/** 每日 modifier 轮换表（buff 同时作用于双方） */
export const DAILY_MODS = [
  { id: "rain3", name: "三分雨", desc: "双方投篮 +6", buff: { sht: 6 }, type: "Water" },
  { id: "wall", name: "铁壁防线", desc: "双方防守/盖帽 +6", buff: { def: 6, blk: 6 }, type: "Steel" },
  { id: "fast", name: "快攻风暴", desc: "双方速度 +6 · 传球 +3", buff: { spd: 6, pas: 3 }, type: "Electric" },
  { id: "glass", name: "篮板大战", desc: "双方篮板 +8 · 终结 +3", buff: { reb: 8, ins: 3 }, type: "Rock" },
  { id: "paint", name: "内线霸权", desc: "双方终结 +6 · 盖帽 +4", buff: { ins: 6, blk: 4 }, type: "Fighting" },
  { id: "pick", name: "抢断之夜", desc: "双方防守 +5 · 速度 +4", buff: { def: 5, spd: 4 }, type: "Dark" },
  { id: "star", name: "全明星", desc: "双方全属性 +3", buff: { spd: 3, sht: 3, ins: 3, pas: 3, def: 3, blk: 3, reb: 3, hnd: 3 }, type: "Normal" },
];

/** 每日任务（当日有效） */
export const DAILY_MISSIONS = [
  { id: "play1", name: "完成 1 场每日挑战", goal: 1, coin: 30, have: (d) => Math.min(d.plays || 0, 1) },
  { id: "win1", name: "赢下 1 场每日挑战", goal: 1, coin: 60, have: (d) => Math.min(d.wins || 0, 1) },
  { id: "dunk2", name: "单场完成 2 次扣篮", goal: 2, coin: 40, have: (d) => Math.min(d.bestDunks || 0, 2) },
];

/* ---------------- 日期 / 种子 ---------------- */
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const WEEK_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 今日 modifier */
export function modOfToday(d = new Date()) {
  return DAILY_MODS[hash32(dateKey(d)) % DAILY_MODS.length];
}

/* ---------------- 每日状态 ---------------- */
export function ensureDaily(save) {
  const key = dateKey();
  if (save.daily && save.daily.date === key) return save.daily;
  const prev = save.daily || null;
  const history = [...(prev?.history || [])];
  if (prev?.date && (prev.plays || 0) > 0) {
    history.push({ date: prev.date, best: prev.best || 0, wins: prev.wins || 0, plays: prev.plays });
  }
  save.daily = {
    date: key,
    plays: 0,
    wins: 0,
    best: 0,
    bestDunks: 0,
    firstWin: false,
    missions: {},
    history: history.slice(-7),
  };
  return save.daily;
}

/** 任务列表（含领取状态） */
export function dailyMissionRows(save) {
  const d = ensureDaily(save);
  return DAILY_MISSIONS.map((m) => {
    const have = m.have(d);
    return { ...m, have, reached: have >= m.goal, claimed: !!d.missions[m.id], canClaim: have >= m.goal && !d.missions[m.id] };
  });
}

/** 领取任务奖励（调用方负责 writeSave） */
export function claimDailyMission(save, id) {
  const d = ensureDaily(save);
  const m = DAILY_MISSIONS.find((x) => x.id === id);
  if (!m) return { ok: false, error: "未知任务" };
  if (d.missions[id]) return { ok: false, error: "已领取" };
  if (m.have(d) < m.goal) return { ok: false, error: "任务未完成" };
  d.missions[id] = true;
  save.coins += m.coin;
  return { ok: true, coin: m.coin };
}

/* ---------------- 对手与比赛配置 ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avgOvr = (roster) => (roster.length ? Math.round(roster.reduce((a, p) => a + p.ovr, 0) / roster.length) : 60);

function targetPowerOf(save) {
  return clamp(Math.round(teamPower(save) + 2), 45, 97);
}

function buildOpponent(mod, target, seed) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let pool = POKEMON_LIST.filter((p) => p.types.includes(mod.type));
  if (pool.length < 5) pool = POKEMON_LIST.slice();
  const order = pool.slice().sort((a, b) => hash32(`${seed}-${a.dex}`) - hash32(`${seed}-${b.dex}`));
  const used = new Set();
  const picked = [];
  for (const pos of POSITION_ORDER) {
    let cands = order.filter((p) => p.pos === pos && !used.has(p.dex));
    if (!cands.length) cands = order.filter((p) => !used.has(p.dex));
    if (!cands.length) break;
    cands.sort((a, b) => Math.abs(a.ovr - target) - Math.abs(b.ovr - target));
    const top = cands.slice(0, Math.min(6, cands.length));
    const pick = top[Math.floor(rng() * top.length)];
    picked.push(pick);
    used.add(pick.dex);
  }
  for (const p of order) {
    if (picked.length >= 5) break;
    if (!used.has(p.dex)) { picked.push(p); used.add(p.dex); }
  }
  return picked.slice(0, 5).map((p) => {
    const base = getPokemon(p.dex);
    const gap = clamp(Math.round(target - base.ovr), 0, 25);
    const bonus = {};
    for (const k of STAT_KEYS) bonus[k] = gap;
    return buildPlayer(p.dex, bonus);
  });
}

/** 应用 modifier：双方同享（含 OVR 重算） */
function applyMod(roster, mod) {
  for (const p of roster) {
    for (const k of STAT_KEYS) p.r[k] = clamp(p.r[k] + (mod.buff[k] || 0), 0, 99);
    p.ovr = calcOVR(p.pos, p.r);
  }
  return roster;
}

/** 今日挑战预览（主页副标题 / 弹窗） */
export function dailyPreview(save) {
  const d = ensureDaily(save);
  const mod = modOfToday();
  const tp = teamPower(save);
  const roster = buildDailyMatch(save).away.roster.map((p) => ({
    dex: p.dex, pos: p.pos, ovr: p.ovr, types: p.types,
  }));
  return {
    date: dateKey(),
    weekday: WEEK_CN[new Date().getDay()],
    mod,
    teamPower: tp,
    target: targetPowerOf(save),
    roster,
    best: d.best || 0,
    plays: d.plays || 0,
    wins: d.wins || 0,
    firstWin: !!d.firstWin,
  };
}

/** 构建今日比赛配置（固定 90 秒 × 4 节） */
export function buildDailyMatch(save) {
  const mod = modOfToday();
  const target = targetPowerOf(save);
  const seed = hash32(`pokedunk-daily-${dateKey()}`);
  const homeRoster = applyMod(buildMyRoster(save).slice(0, 5), mod);
  const awayRoster = applyMod(buildOpponent(mod, target, seed), mod);
  const coach = save.coach?.name || "ME";
  return {
    home: {
      name: `${coach}队`, abbr: coach.slice(0, 3).toUpperCase(), color: "#3b6fd8", color2: "#16224a",
      roster: homeRoster, bench: [], human: true, boost: 0,
    },
    away: {
      name: `${mod.name}联队`, abbr: "DLY", color: "#7a5cf0", color2: "#2a1b52",
      roster: awayRoster, bench: [], human: false, boost: 0,
    },
    difficulty: target >= 90 ? "legend" : target >= 75 ? "allstar" : "pro",
    quarterLen: 180, // 与赛季一致：每节 3 分钟
    autoSwitch: true,
    userAutoSubs: true,
    seed,
    stamina: true,
    daily: true,
    gym: { name: "每日挑战", abbr: "DLY", color: "#7a5cf0", color2: "#2a1b52", gym: "daily", badge: "daily", types: [mod.type] },
  };
}

/** 一键模拟（双方 AI） */
export async function simulateDailyMatch(save) {
  const cfg = buildDailyMatch(save);
  const simCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
  const engine = await simulateFullMatch(simCfg);
  return { engine, cfg };
}

/** 挑战分：得分 + 风格分（扣篮/三分/抢断/盖帽）+ 胜利分
 *  技术统计取自 engine.players（模拟局不生成 engine.box）。 */
export function challengeScore(engine, won) {
  let pts = 0, tpm = 0, stl = 0, blk = 0, dnk = 0;
  for (const p of Object.values(engine?.players || {})) {
    if (p.team !== 0) continue;
    const s = p.stats || {};
    pts += s.pts || 0; tpm += s.tpm || 0; stl += s.stl || 0; blk += s.blk || 0; dnk += s.dnk || 0;
  }
  if (!pts) pts = engine?.score?.[0] || 0;
  const style = dnk * 3 + tpm * 2 + stl * 2 + blk * 2 + (won ? 10 : 0);
  return { total: pts + style, pts, tpm, stl, blk, dnk, winBonus: won ? 10 : 0 };
}

/**
 * 每日挑战结算：记录场次/胜场/最高分/最佳扣篮，发首胜币。
 * 不写 stats.w/l、不推进赛季、不发 XP。
 */
export function settleDaily(save, engine, quit = false, simulated = false) {
  const d = ensureDaily(save);
  if (quit || !engine) return { quit: true, coins: 0, score: 0, best: d.best || 0, plays: d.plays || 0 };
  const myScore = engine.score[0];
  const oppScore = engine.score[1];
  const won = myScore > oppScore;
  const detail = challengeScore(engine, won);
  const score = Math.round(detail.total * (simulated ? 0.8 : 1));

  d.plays++;
  if (won) d.wins++;
  d.bestDunks = Math.max(d.bestDunks || 0, detail.dnk);
  const newBest = score > (d.best || 0);
  if (newBest) d.best = score;

  let coins = 0, firstWin = false;
  if (won && !d.firstWin) {
    d.firstWin = true;
    firstWin = true;
    coins += FIRST_WIN_COINS;
    save.coins += coins;
  }
  writeSave(save);
  return {
    quit: false, won, myScore, oppScore, score, detail, simulated,
    newBest, best: d.best, coins, firstWin,
    plays: d.plays, wins: d.wins,
  };
}
