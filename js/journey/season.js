/**
 * journey/season.js —— 篮球赛季状态机（docs/09 v3.1）
 *
 * 9 队 = 8 个道馆队 + 玩家队伍。
 * 常规赛：9 队单循环 9 轮，每轮 4 场 + 1 队轮空；玩家 8 场 + 1 轮轮空。
 * 每轮玩家比赛结束后，本轮其他 3 场同步模拟并写入战况；玩家轮空轮直接模拟 4 场。
 * 前 4 进季后赛：半决赛 1v4、2v3 → 总决赛 → 总冠军。
 * 8-0（8 徽章）解锁四天王独立挑战；四天王不参与积分榜/季后赛/总冠军。
 *
 * 存档 journey.season：
 * { v, no, phase, round, byeRound, schedule[], rounds[], results[], table[],
 *   playoffs, fourKings, badges[], champion, history[] }
 */
import { LEAGUE_GYMS } from "../../engine/readable/play-core.js?v=39";
import { pickGymRoster } from "./gyms.js?v=29";
import { teamPower as buildTeamPower } from "../systems/build.js?v=32";

export const GYM_CN = ["深灰道馆", "华蓝道馆", "枯叶道馆", "彩虹道馆", "浅红道馆", "金黄道馆", "红莲道馆", "常磐道馆"];
export const ROUNDS = 9;
const SEASON_V = 3;
const BYE = "bye";

const avgOvr = (roster) => (roster.length ? Math.round(roster.reduce((a, p) => a + p.ovr, 0) / roster.length) : 60);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptySeason(no, history = []) {
  return {
    v: SEASON_V,
    no,
    phase: "regular",
    round: 0,
    byeRound: -1,
    schedule: [],
    scheduleSeason: null,
    rounds: [],
    results: [],
    table: null,
    playoffs: null,
    fourKings: { unlocked: false, attempts: 0, cleared: false, rewardClaimed: false },
    badges: [],
    champion: false,
    history,
  };
}

/** 9 队单循环：加一个 BYE 凑 10 队，圆桌轮转 9 轮 */
function makeSchedule(seasonNo = 1) {
  // 该排序让第 1 赛季玩家轮空落在第 5 轮，前后各 4 场，对手由弱到强。
  let ring = ["me", "g7", "g6", "g5", "g4", BYE, "g3", "g2", "g1", "g0"];
  const n = ring.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    let bye = "";
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i], b = ring[n - 1 - i];
      if (a === BYE) bye = b;
      else if (b === BYE) bye = a;
      else pairs.push({ a, b });
    }
    rounds.push({ round: r, bye, games: pairs });
    const fixed = ring[0];
    const rest = ring.slice(1);
    rest.unshift(rest.pop());
    ring = [fixed, ...rest];
  }
  // 赛季之间轮转赛程，轮空位置与对阵顺序会变化
  const offset = (Math.max(1, Number(seasonNo) || 1) - 1) % rounds.length;
  if (offset) {
    const shifted = rounds.slice(offset).concat(rounds.slice(0, offset));
    return shifted.map((r, i) => ({ ...r, round: i }));
  }
  return rounds;
}

export function ensureSeason(save) {
  const j = (save.journey ||= {});
  let s = j.season;
  if (!s || s.v !== SEASON_V) {
    const no = typeof s?.no === "number" ? s.no : 1;
    const history = Array.isArray(s?.history) ? s.history : [];
    s = j.season = emptySeason(no, history);
  }
  s.v = SEASON_V;
  s.round ||= 0;
  s.results ||= [];
  s.rounds ||= [];
  s.badges ||= [];
  s.history ||= [];
  s.fourKings ||= { unlocked: false, attempts: 0, cleared: false, rewardClaimed: false };
  s.phase ||= "regular";
  if (!Array.isArray(s.schedule) || !s.schedule.length || s.scheduleSeason !== s.no) {
    s.schedule = makeSchedule(s.no);
    s.scheduleSeason = s.no;
  }
  if (s.byeRound == null || s.byeRound < 0) {
    const bye = s.schedule.find((r) => r.bye === "me");
    s.byeRound = bye ? bye.round : 0;
  }
  if (!s.table) buildTable(save, s);
  try { syncLegacy(save, s); } catch {}
  return s;
}

export function myTeamPower(save) {
  try { return buildTeamPower(save); } catch { return 0; }
}

function buildTable(save, s) {
  const extra = (s.no - 1) * 2;
  const rows = GYM_CN.map((name, i) => {
    const gym = LEAGUE_GYMS[i];
    const roster = pickGymRoster(gym.gym, gym.types, extra);
    return {
      id: "g" + i,
      venue: i,
      name,
      abbr: gym.abbr,
      color: gym.color,
      power: avgOvr(roster),
      w: 0, l: 0, pf: 0, pa: 0,
      isMe: false,
    };
  });
  rows.push({
    id: "me",
    name: (save.coach?.name || "我") + "队",
    abbr: "ME",
    color: "#3b6fd8",
    power: myTeamPower(save),
    w: 0, l: 0, pf: 0, pa: 0,
    isMe: true,
  });
  s.table = rows;
}

export function teamRow(s, id) {
  ensureTable(s);
  return s.table.find((r) => r.id === id) || null;
}
function ensureTable(s) {
  if (!s.table) s.table = [];
}

function rankOf(s, id) {
  const row = teamRow(s, id);
  if (!row) return 99;
  return rankTable(s).findIndex((r) => r.id === id);
}

function headToHead(s, a, b) {
  let aw = 0, bw = 0;
  for (const round of s.rounds || []) {
    for (const g of round.games || []) {
      if (!g.sa && !g.sb) continue;
      if (g.a === a && g.b === b) { if (g.sa > g.sb) aw++; else bw++; }
      else if (g.a === b && g.b === a) { if (g.sa > g.sb) bw++; else aw++; }
    }
  }
  return aw - bw;
}

export function rankTable(s) {
  return [...(s.table || [])].sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w;
    const da = a.pf - a.pa, db = b.pf - b.pa;
    if (db !== da) return db - da;
    const h = headToHead(s, a.id, b.id);
    if (h !== 0) return -h;
    if (b.pf !== a.pf) return b.pf - a.pf;
    return b.power - a.power;
  });
}

function simScore(a, b, rng) {
  const diff = a.power - b.power;
  const p = clamp(0.5 + diff * 0.018, 0.08, 0.92);
  const winA = rng() < p;
  const base = 76 + Math.round(((a.power + b.power) / 2) * 0.12);
  let sa = base + Math.round(rng() * 30 - 15) + Math.round(clamp(diff * 0.3, -12, 12));
  let sb = base + Math.round(rng() * 30 - 15) - Math.round(clamp(diff * 0.3, -12, 12));
  if (winA && sa <= sb) sa = sb + 1 + Math.floor(rng() * 6);
  if (!winA && sb <= sa) sb = sa + 1 + Math.floor(rng() * 6);
  return [sa, sb];
}

function applyGame(s, aId, bId, sa, sb) {
  const A = teamRow(s, aId), B = teamRow(s, bId);
  if (!A || !B) return;
  A.pf += sa; A.pa += sb;
  B.pf += sb; B.pa += sa;
  if (sa > sb) { A.w++; B.l++; }
  else { B.w++; A.l++; }
}

/** 推进一轮：玩家结果 + 其他 3 场；玩家轮空则模拟 4 场 */
function simulateRound(save, s, playerResult = null) {
  const sched = s.schedule[s.round];
  if (!sched) return;
  const games = [];
  for (const pair of sched.games) {
    let sa, sb;
    if (pair.a === "me" || pair.b === "me") {
      const pr = playerResult || s.results.find((r) => r.round === s.round);
      if (!pr) return; // 玩家比赛还没打，不能推进
      const meHome = pair.a === "me";
      sa = meHome ? pr.myScore : pr.oppScore;
      sb = meHome ? pr.oppScore : pr.myScore;
    } else {
      const A = teamRow(s, pair.a), B = teamRow(s, pair.b);
      const rng = rngFrom(hashStr(`${s.no}-${s.round}-${pair.a}-${pair.b}`));
      [sa, sb] = simScore(A, B, rng);
    }
    games.push({ a: pair.a, b: pair.b, sa, sb });
    applyGame(s, pair.a, pair.b, sa, sb);
  }
  s.rounds.push({ round: s.round, bye: sched.bye, games });
  s.round += 1;
  syncLegacy(save, s);
  if (s.round >= ROUNDS) finalizeRegular(save, s);
}

/** 玩家轮空轮：模拟本轮 4 场并推进 */
export function advanceBye(save) {
  const s = ensureSeason(save);
  const sched = s.schedule[s.round];
  if (!sched || sched.bye !== "me") return { ok: false };
  simulateRound(save, s, null);
  return { ok: true, seasonEnded: s.phase === "done" };
}

function finalizeRegular(save, s) {
  const ranked = rankTable(s);
  const seeds = ranked.slice(0, 4).map((r) => r.id);
  if (!seeds.includes("me")) {
    s.phase = "done";
    s.playoffs = { seeds, semis: [], final: null, champion: null, missed: true };
    s.champion = false;
    syncLegacy(save, s);
    return;
  }
  s.phase = "playoffs";
  const semis = [
    { a: seeds[0], b: seeds[3], sa: null, sb: null, winner: null },
    { a: seeds[1], b: seeds[2], sa: null, sb: null, winner: null },
  ];
  s.playoffs = { seeds, semis, final: null, champion: null };
  for (const semi of semis) {
    if (semi.a !== "me" && semi.b !== "me") simulatePlayoff(s, semi);
  }
  syncLegacy(save, s);
}

function simulatePlayoff(s, game) {
  const A = teamRow(s, game.a), B = teamRow(s, game.b);
  if (!A || !B) return;
  const rng = rngFrom(hashStr(`${s.no}-po-${game.a}-${game.b}`));
  const [sa, sb] = simScore(A, B, rng);
  game.sa = sa; game.sb = sb;
  game.winner = sa > sb ? game.a : game.b;
}

function startFinal(save, s) {
  const p = s.playoffs;
  if (!p || p.final || !p.semis.every((x) => x.winner)) return;
  p.final = { a: p.semis[0].winner, b: p.semis[1].winner, sa: null, sb: null, winner: null };
  if (p.final.a !== "me" && p.final.b !== "me") {
    simulatePlayoff(s, p.final);
    p.champion = p.final.winner;
    s.phase = "done";
    syncLegacy(save, s);
  }
}

function recordPlayoffResult(save, info, won, myScore, oppScore) {
  const s = ensureSeason(save);
  const p = s.playoffs;
  if (!p) return { seasonEnded: true, champion: false, legendTrack: null };
  let changed = false;
  if (info.playoffRound === "semi") {
    const semi = p.semis[info.slot];
    if (semi && semi.winner === null) {
      semi.sa = myScore; semi.sb = oppScore;
      semi.winner = won ? "me" : (semi.a === "me" ? semi.b : semi.a);
      changed = true;
    }
    // 另一场半决赛若还没打，先模拟
    for (const other of p.semis) if (!other.winner) simulatePlayoff(s, other);
    startFinal(save, s);
    if (!won) {
      if (!p.final) startFinal(save, s);
      if (p.final && !p.final.winner) {
        simulatePlayoff(s, p.final);
        p.champion = p.final.winner;
      }
      s.phase = "done";
      s.champion = false;
    }
  } else if (info.playoffRound === "final") {
    const f = p.final;
    if (f && f.winner === null) {
      f.sa = myScore; f.sb = oppScore;
      f.winner = won ? "me" : (f.a === "me" ? f.b : f.a);
      p.champion = f.winner;
      s.phase = "done";
      s.champion = won;
      changed = true;
      if (won) {
        s.history.push({ no: s.no, champion: true, at: Date.now(), w: save.stats.w, l: save.stats.l });
      }
    }
  }
  syncLegacy(save, s);
  return {
    seasonEnded: s.phase === "done",
    champion: !!s.champion,
    legendTrack: s.champion ? "champion" : null,
    changed,
  };
}

/** 赛程/积分/战况信息给 UI */
export function leagueInfo(save) {
  const s = ensureSeason(save);
  if (s.phase === "done") {
    return { kind: "done", season: s.no, smallName: "赛季结束", label: `赛季 ${s.no} · 赛季结束`, round: s.round };
  }
  if (s.phase === "playoffs") {
    const p = s.playoffs;
    if (!p) return null;
    const semi = p.semis.find((x) => (x.a === "me" || x.b === "me") && x.winner === null);
    if (semi) {
      const oppId = semi.a === "me" ? semi.b : semi.a;
      const gym = opponentGym(save, s, oppId);
      return {
        kind: "playoff", playoffRound: "semi", slot: p.semis.indexOf(semi),
        season: s.no, smallName: "半决赛", venue: gym.venue,
        gym, leaderRoster: gym.roster, leaderPower: gym.power, targetPower: gym.power,
        attempt: 1, opponentId: oppId, label: `赛季 ${s.no} · 季后赛 · 半决赛 VS ${gym.name}`,
      };
    }
    const fin = p.final;
    if (fin && fin.winner === null && (fin.a === "me" || fin.b === "me")) {
      const oppId = fin.a === "me" ? fin.b : fin.a;
      const gym = opponentGym(save, s, oppId);
      return {
        kind: "playoff", playoffRound: "final", slot: 0,
        season: s.no, smallName: "总决赛", venue: gym.venue,
        gym, leaderRoster: gym.roster, leaderPower: gym.power, targetPower: gym.power,
        attempt: 1, opponentId: oppId, label: `赛季 ${s.no} · 季后赛 · 总决赛 VS ${gym.name}`,
      };
    }
    return { kind: "done", season: s.no, smallName: "赛季结束", label: `赛季 ${s.no} · 赛季结束`, round: s.round };
  }
  // 常规赛
  const sched = s.schedule[s.round];
  if (!sched) return null;
  if (sched.bye === "me") {
    return {
      kind: "bye", season: s.no, round: s.round, smallName: "轮空",
      label: `赛季 ${s.no} · 第 ${s.round + 1} 轮 · 轮空`,
    };
  }
  const pair = sched.games.find((g) => g.a === "me" || g.b === "me");
  if (!pair) return null;
  const oppId = pair.a === "me" ? pair.b : pair.a;
  const gym = opponentGym(save, s, oppId);
  return {
    kind: "league", season: s.no, round: s.round, small: 0,
    venue: gym.venue, smallName: `第 ${s.round + 1} 轮`,
    gym, leaderRoster: gym.roster, leaderPower: gym.power,
    targetPower: Math.min(gym.power, myTeamPower(save) + 10),
    attempt: 1, opponentId: oppId,
    label: `赛季 ${s.no} · 第 ${s.round + 1} 轮 · VS ${gym.name}`,
  };
}

function opponentGym(save, s, id) {
  const row = teamRow(s, id);
  if (!row) return null;
  if (id === "me") return null;
  const i = row.venue;
  const gym = LEAGUE_GYMS[i];
  const roster = pickGymRoster(gym.gym, gym.types, (s.no - 1) * 2);
  return {
    ...gym,
    name: GYM_CN[i],
    venue: i,
    roster,
    power: row.power,
  };
}

export function fourKingsInfo(save) {
  const s = ensureSeason(save);
  if (s.phase === "done" || !s.fourKings?.unlocked) return null;
  const extra = (s.no - 1) * 2;
  const elite = LEAGUE_GYMS.find((g) => g.elite) || LEAGUE_GYMS[LEAGUE_GYMS.length - 1];
  const roster = pickGymRoster("elite", elite.types, extra);
  const power = avgOvr(roster);
  return {
    kind: "elite", season: s.no, smallName: "四天王挑战", venue: 8,
    gym: { ...elite, name: "四天王联队", abbr: "E4" },
    leaderRoster: roster, leaderPower: power, targetPower: power,
    attempt: (s.fourKings.attempts || 0) + 1,
    label: `赛季 ${s.no} · 四天王挑战 · 第 ${(s.fourKings.attempts || 0) + 1} 次`,
  };
}

export function currentMatchInfo(save, mode = "league") {
  return mode === "elite" ? fourKingsInfo(save) : leagueInfo(save);
}

export function matchSeed(save, info) {
  const s = ensureSeason(save);
  const str = info?.key || `${s.no}-${info?.kind}-${info?.round ?? info?.playoffRound ?? ""}-${info?.venue ?? info?.opponentId ?? ""}-${info?.attempt || 1}`;
  return hashStr(str);
}

/** 记录一场比赛并推进；四天王与联赛分开 */
export function recordResult(save, info, { won, myScore, oppScore, sim }) {
  const s = ensureSeason(save);
  const seasonNo = s.no;

  if (info.kind === "elite") {
    s.fourKings.attempts = (s.fourKings.attempts || 0) + 1;
    let legendTrack = null;
    if (won) {
      if (!s.fourKings.cleared) {
        s.fourKings.cleared = true;
        s.fourKings.rewardClaimed = true;
        legendTrack = "fourKings";
      }
    }
    syncLegacy(save, s);
    const after = currentMatchInfo(save, "elite");
    return {
      badgeGained: null, champion: false, seasonEnded: false,
      fourKings: true, legendTrack,
      nextLabel: after ? after.label : "赛季结束",
    };
  }

  if (info.kind === "bye") {
    advanceBye(save);
    return { badgeGained: null, champion: false, seasonEnded: s.phase === "done", legendTrack: null, nextLabel: "" };
  }

  if (info.kind === "league") {
    if (s.phase !== "regular") {
      return { badgeGained: null, champion: false, seasonEnded: s.phase === "done", legendTrack: null, nextLabel: "" };
    }
    s.results.push({
      season: seasonNo, round: s.round, venue: info.venue,
      win: !!won, myScore, oppScore, sim: !!sim, at: Date.now(),
    });
    let badgeGained = null;
    if (won) {
      badgeGained = info.gym?.badge || null;
      if (badgeGained && !s.badges.includes(badgeGained)) s.badges.push(badgeGained);
      if (s.badges.length >= 8) s.fourKings.unlocked = true;
    }
    simulateRound(save, s, s.results[s.results.length - 1]);
    syncLegacy(save, s);
    const after = leagueInfo(save);
    return {
      badgeGained, champion: false, seasonEnded: s.phase === "done",
      legendTrack: null, nextLabel: after ? after.label : "赛季结束",
    };
  }

  if (info.kind === "playoff") {
    const r = recordPlayoffResult(save, info, won, myScore, oppScore);
    return {
      badgeGained: null, champion: r.champion, seasonEnded: r.seasonEnded,
      legendTrack: r.legendTrack, nextLabel: leagueInfo(save)?.label || "赛季结束",
    };
  }

  return { badgeGained: null, champion: false, seasonEnded: false, legendTrack: null, nextLabel: "" };
}

export function startNextSeason(save) {
  const old = ensureSeason(save);
  const nextNo = (old.no || 1) + 1;
  const history = old.history || [];
  save.journey.season = emptySeason(nextNo, history);
  const s = ensureSeason(save);
  return s;
}

/** 同步旧字段（成就/主页） */
export function syncLegacy(save, s) {
  s ||= ensureSeason(save);
  const j = (save.journey ||= {});
  const badges = [...s.badges];
  if (s.champion) badges.push("champion");
  j.gymBadges = badges;
  j.stage = s.phase === "done" ? "done" : "league";
  j.seasonNo = s.no;
}

export function progressLabel(save) {
  const info = currentMatchInfo(save);
  return info ? info.label : "赛季结束";
}

/** UI 用：当前轮次展示（含未打轮） */
export function roundView(save, index) {
  const s = ensureSeason(save);
  const done = s.rounds[index];
  const sched = s.schedule[index];
  return { ...(sched || {}), ...(done || {}), done: !!done };
}
