/**
 * journey/league.js —— 联盟邀请赛（由旧 9 队联赛接回，作为 8 徽章后的独立趣味玩法）
 *
 * 9 队 = 玩家 + 8 馆主；9 轮单循环，每轮 4 场 + 1 队轮空。
 * 前 4 进季后赛：半决赛 1v4、2v3 → 总决赛。
 * 不影响徽章、四天王、地区冠军与主线存档。
 */
import { LEAGUE_GYMS } from "../../engine/readable/play-core.js?v=695";
import { pickGymRoster } from "./gyms.js?v=695";
import { buildMyRoster, simulateHeadless } from "./match-screen.js?v=695";
import { teamPower, starterIds } from "../systems/build.js?v=695";
import { grantXp } from "../systems/xp.js?v=695";
import { regionOf } from "./regions.js?v=695";
import { loadSet } from "../ui/settings.js?v=695";

export const LEAGUE_ROUNDS = 9;
const LEAGUE_V = 1;
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

function emptyLeague(no, keep = {}) {
  return {
    v: LEAGUE_V,
    regionNo: 0,
    no,
    started: false,
    phase: "regular",
    round: 0,
    byeRound: -1,
    schedule: [],
    scheduleNo: null,
    rounds: [],
    results: [],
    table: null,
    playoffs: null,
    champion: false,
    rewardGiven: false,
    lastReward: null,
    trophy: !!keep.trophy,
    firstClear: !!keep.firstClear,
    runs: Number(keep.runs) || 0,
  };
}

/** 9 队单循环：加一个 BYE 凑 10 队，圆桌轮转 9 轮 */
function makeSchedule(no = 1) {
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
  const offset = (Math.max(1, Number(no) || 1) - 1) % rounds.length;
  if (!offset) return rounds;
  return rounds.slice(offset).concat(rounds.slice(0, offset)).map((r, i) => ({ ...r, round: i }));
}

export function hasLeagueUnlocked(save) {
  const s = save?.journey?.season;
  const n = (s?.badges || []).filter((b) => b !== "champion").length;
  return n >= 8;
}

function buildTable(save, s) {
  const reg = regionOf(save);
  const myPower = teamPower(save);
  const rows = (reg.gyms || []).map((g, i) => {
    const base = LEAGUE_GYMS[i] || LEAGUE_GYMS[0];
    const baseRoster = pickGymRoster(base.gym, base.types, 0);
    const basePower = avgOvr(baseRoster);
    const target = myPower - 4 + i * 1.2;
    const extra = clamp(Math.round(target - basePower), 0, 24);
    const roster = pickGymRoster(base.gym, base.types, extra);
    return {
      id: `g${i}`, venue: i, name: g.name, abbr: base.abbr, color: base.color,
      power: avgOvr(roster), extra, w: 0, l: 0, pf: 0, pa: 0, isMe: false,
    };
  });
  const coachName = save.coach?.name || "我";
  rows.push({
    id: "me", name: /队$/.test(coachName) ? coachName : `${coachName}队`, abbr: "ME", color: "#3b6fd8",
    power: myPower, extra: 0, w: 0, l: 0, pf: 0, pa: 0, isMe: true,
  });
  s.table = rows;
}

export function ensureLeague(save) {
  const j = (save.journey ||= {});
  const regNo = Number(j.regionNo) || 1;
  let s = j.league;
  if (!s || s.v !== LEAGUE_V || s.regionNo !== regNo) {
    s = j.league = emptyLeague(1);
    s.regionNo = regNo;
  }
  s.v = LEAGUE_V;
  s.round ||= 0;
  s.results ||= [];
  s.rounds ||= [];
  s.phase ||= "regular";
  s.started = !!s.started;
  s.champion = !!s.champion;
  s.runs = Number(s.runs) || 0;
  if (!Array.isArray(s.schedule) || !s.schedule.length || s.scheduleNo !== s.no) {
    s.schedule = makeSchedule(s.no);
    s.scheduleNo = s.no;
  }
  if (s.byeRound == null || s.byeRound < 0) {
    const bye = s.schedule.find((r) => r.bye === "me");
    s.byeRound = bye ? bye.round : 0;
  }
  if (!s.table) buildTable(save, s);
  return s;
}

/** 从邀请页正式开赛：清空当前届，保留奖杯/首通 */
export function startLeague(save) {
  const old = ensureLeague(save);
  const s = emptyLeague((old.runs || 0) + 1, {
    trophy: old.trophy, firstClear: old.firstClear, runs: old.runs,
  });
  s.regionNo = old.regionNo;
  s.started = true;
  save.journey.league = s;
  return ensureLeague(save);
}

/** 再来一届：保留历史荣誉，重开赛程 */
export function startNextLeague(save) {
  return startLeague(save);
}

export function teamRow(s, id) {
  return (s?.table || []).find((r) => r.id === id) || null;
}

function headToHead(s, a, b) {
  let aw = 0, bw = 0;
  for (const round of s.rounds || []) {
    for (const g of round.games || []) {
      if (g.sa == null || g.sb == null) continue;
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

function opponentGym(save, s, id) {
  const row = teamRow(s, id);
  if (!row || id === "me") return null;
  const reg = regionOf(save);
  const base = LEAGUE_GYMS[row.venue] || LEAGUE_GYMS[0];
  const roster = pickGymRoster(base.gym, base.types, Number(row.extra) || 0);
  return {
    ...base, name: reg.gyms?.[row.venue]?.name || row.name, venue: row.venue,
    roster, power: row.power,
  };
}

export function leagueInfo(save) {
  const s = ensureLeague(save);
  if (!s.started) return null;
  if (s.phase === "done") {
    return { kind: "done", no: s.no, smallName: "联赛结束", label: `联盟邀请赛 · 第 ${s.no} 届结束`, round: s.round };
  }
  if (s.phase === "playoffs") {
    const p = s.playoffs;
    if (!p) return null;
    const semi = p.semis.find((x) => (x.a === "me" || x.b === "me") && x.winner === null);
    if (semi) {
      const oppId = semi.a === "me" ? semi.b : semi.a;
      const gym = opponentGym(save, s, oppId);
      return {
        kind: "playoff", playoffRound: "semi", slot: p.semis.indexOf(semi), no: s.no,
        smallName: "半决赛", venue: gym.venue, gym, leaderRoster: gym.roster,
        leaderPower: gym.power, targetPower: gym.power, attempt: 1, opponentId: oppId,
        label: `第 ${s.no} 届 · 半决赛 VS ${gym.name}`,
      };
    }
    const fin = p.final;
    if (fin && fin.winner === null && (fin.a === "me" || fin.b === "me")) {
      const oppId = fin.a === "me" ? fin.b : fin.a;
      const gym = opponentGym(save, s, oppId);
      return {
        kind: "playoff", playoffRound: "final", slot: 0, no: s.no,
        smallName: "总决赛", venue: gym.venue, gym, leaderRoster: gym.roster,
        leaderPower: gym.power, targetPower: gym.power, attempt: 1, opponentId: oppId,
        label: `第 ${s.no} 届 · 总决赛 VS ${gym.name}`,
      };
    }
    return { kind: "done", no: s.no, smallName: "联赛结束", label: `联盟邀请赛 · 第 ${s.no} 届结束`, round: s.round };
  }
  const sched = s.schedule[s.round];
  if (!sched) return null;
  if (sched.bye === "me") {
    return { kind: "bye", no: s.no, round: s.round, smallName: "轮空", label: `第 ${s.no} 届 · 第 ${s.round + 1} 轮 · 轮空` };
  }
  const pair = sched.games.find((g) => g.a === "me" || g.b === "me");
  if (!pair) return null;
  const oppId = pair.a === "me" ? pair.b : pair.a;
  const gym = opponentGym(save, s, oppId);
  return {
    kind: "league", no: s.no, round: s.round, venue: gym.venue,
    smallName: `第 ${s.round + 1} 轮`, gym, leaderRoster: gym.roster, leaderPower: gym.power,
    targetPower: gym.power, attempt: 1, opponentId: oppId,
    label: `第 ${s.no} 届 · 第 ${s.round + 1} 轮 VS ${gym.name}`,
  };
}

export function matchSeed(save, info) {
  const s = ensureLeague(save);
  return hashStr(`${s.no}-${info?.kind}-${info?.round ?? info?.playoffRound ?? ""}-${info?.venue ?? info?.opponentId ?? ""}`);
}

/** 组一场联盟比赛；玩家固定为 home，比分记为 myScore:oppScore */
export function buildLeagueMatch(save) {
  const info = leagueInfo(save);
  if (!info || info.kind === "done" || info.kind === "bye") return null;
  const set = loadSet();
  const prefs = { autoSwitch: set.autoSwitch !== false, userAutoSubs: set.autoSubs !== false, specialFx: set.specialFx !== false };
  const gym = info.gym;
  const coachName = save.coach?.name || "ME";
  const home = {
    name: /队$/.test(coachName) ? coachName : `${coachName}队`,
    abbr: coachName.slice(0, 3).toUpperCase(),
    title: save.coach?.title || "", color: "#3b6fd8", color2: "#16224a",
    roster: buildMyRoster(save, 1), bench: [], human: true, boost: 0,
  };
  if (!home.roster.length || !info.leaderRoster?.length) return null;
  const away = {
    name: gym.name, abbr: gym.abbr || "OPP", color: gym.color, color2: gym.color2,
    roster: info.leaderRoster, bench: [], human: false, boost: 0,
  };
  return {
    home, away, difficulty: info.kind === "playoff" ? "allstar" : "pro",
    quarterLen: 120, quarters: 2, ...prefs,
    seed: matchSeed(save, info), mode: "league-side", stamina: true,
    gym: { ...gym, elite: false }, info,
  };
}

function simulateRound(save, s, playerResult = null) {
  const sched = s.schedule[s.round];
  if (!sched) return;
  const games = [];
  for (const pair of sched.games) {
    let sa, sb;
    if (pair.a === "me" || pair.b === "me") {
      const pr = playerResult || s.results.find((r) => r.round === s.round);
      if (!pr) return;
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
  if (s.round >= LEAGUE_ROUNDS) finalizeRegular(save, s);
}

export function advanceBye(save) {
  const s = ensureLeague(save);
  const sched = s.schedule[s.round];
  if (!sched || sched.bye !== "me") return { ok: false };
  simulateRound(save, s, null);
  if (s.phase === "done") finishRewards(save, s);
  return { ok: true, ended: s.phase === "done" };
}

function finalizeRegular(save, s) {
  const ranked = rankTable(s);
  const seeds = ranked.slice(0, 4).map((r) => r.id);
  if (!seeds.includes("me")) {
    s.phase = "done";
    s.playoffs = { seeds, semis: [], final: null, champion: null, missed: true };
    s.champion = false;
    finishRewards(save, s);
    return;
  }
  s.phase = "playoffs";
  const semis = [
    { a: seeds[0], b: seeds[3], sa: null, sb: null, winner: null },
    { a: seeds[1], b: seeds[2], sa: null, sb: null, winner: null },
  ];
  s.playoffs = { seeds, semis, final: null, champion: null };
  for (const semi of semis) if (semi.a !== "me" && semi.b !== "me") simulatePlayoff(s, semi);
  startFinal(save, s);
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
    s.champion = false;
    finishRewards(save, s);
  }
}

function recordPlayoffResult(save, info, won, myScore, oppScore) {
  const s = ensureLeague(save);
  const p = s.playoffs;
  if (!p) return { ended: true, champion: false };
  if (info.playoffRound === "semi") {
    const semi = p.semis[info.slot];
    if (semi && semi.winner === null) {
      const meA = semi.a === "me";
      semi.sa = meA ? myScore : oppScore;
      semi.sb = meA ? oppScore : myScore;
      semi.winner = won ? "me" : (meA ? semi.b : semi.a);
    }
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
      finishRewards(save, s);
    }
  } else if (info.playoffRound === "final") {
    const f = p.final;
    if (f && f.winner === null) {
      const meA = f.a === "me";
      f.sa = meA ? myScore : oppScore;
      f.sb = meA ? oppScore : myScore;
      f.winner = won ? "me" : (meA ? f.b : f.a);
      p.champion = f.winner;
      s.champion = won;
      s.phase = "done";
      finishRewards(save, s);
    }
  }
  return { ended: s.phase === "done", champion: !!s.champion };
}

function placementOf(s) {
  if (s.champion) return "champion";
  const p = s.playoffs;
  if (!p || p.missed) return "regular";
  if (p.final && [p.final.a, p.final.b].includes("me")) return "runnerUp";
  if ((p.semis || []).some((x) => [x.a, x.b].includes("me"))) return "semifinal";
  return "regular";
}

const PLACE_CN = { champion: "冠军", runnerUp: "亚军", semifinal: "四强", regular: "常规赛" };

function finishRewards(save, s) {
  if (s.rewardGiven) return;
  const place = placementOf(s);
  let coins = { champion: 800, runnerUp: 500, semifinal: 300, regular: 150 }[place] || 150;
  let first = false;
  const extras = [];
  if (place === "champion" && !s.firstClear) {
    first = true;
    s.firstClear = true;
    s.trophy = true;
    coins += 1500;
    save.bag ||= {};
    save.bag.berryPremium = (save.bag.berryPremium || 0) + 2;
    save.bag.items ||= {};
    save.bag.items.hatch = (save.bag.items.hatch || 0) + 1;
    extras.push("高级树果 ×2", "孵蛋加速券 ×1");
  }
  s.rewardGiven = true;
  s.runs = (s.runs || 0) + 1;
  save.coins = (save.coins || 0) + coins;
  s.lastReward = {
    place, placeCn: PLACE_CN[place], coins, first,
    text: `${PLACE_CN[place]} · 篮球币 +${coins}${extras.length ? " · " + extras.join(" · ") : ""}`,
  };
}

/** 联赛每场固定产出：反复参赛同奖励，供刷等级使用 */
function grantLeagueMatchRewards(save, won) {
  const coins = won ? 60 : 20;
  const xp = won ? 40 : 20;
  save.coins = (save.coins || 0) + coins;
  const events = [];
  for (const id of starterIds(save)) {
    const mon = save.mons?.[id];
    if (mon) events.push(...grantXp(save, id, mon, xp));
  }
  return { coins, xp, events };
}

/** 记录玩家当前联盟比赛结果 */
export function recordLeagueResult(save, { won, myScore, oppScore, sim = false, spectate = false }) {
  const s = ensureLeague(save);
  const info = leagueInfo(save);
  if (!info || info.kind === "done" || info.kind === "bye") {
    return { ended: s.phase === "done", champion: !!s.champion, reward: s.lastReward, info, matchReward: null };
  }
  if (info.kind === "league" && s.phase !== "regular") {
    return { ended: s.phase === "done", champion: !!s.champion, reward: s.lastReward, info, matchReward: null };
  }
  const matchReward = grantLeagueMatchRewards(save, !!won);
  if (info.kind === "league") {
    s.results.push({ no: s.no, round: s.round, venue: info.venue, win: !!won, myScore, oppScore, sim: !!sim, spectate: !!spectate, at: Date.now() });
    simulateRound(save, s, s.results[s.results.length - 1]);
    if (s.phase === "done") finishRewards(save, s);
  } else if (info.kind === "playoff") {
    recordPlayoffResult(save, info, won, myScore, oppScore);
    if (s.phase === "done") finishRewards(save, s);
  }
  return { ended: s.phase === "done", champion: !!s.champion, reward: s.lastReward, info, matchReward };
}

/** 一键模拟玩家当前这场；其他球队由 simulateRound 按实力模拟 */
export async function simulateLeagueRound(save) {
  const s = ensureLeague(save);
  const info = leagueInfo(save);
  if (!info) return { ok: false };
  if (info.kind === "bye") {
    const r = advanceBye(save);
    return { ok: true, bye: true, ...r, reward: s.lastReward };
  }
  if (info.kind === "done") return { ok: false, ended: true, reward: s.lastReward };
  const cfg = buildLeagueMatch(save);
  if (!cfg) return { ok: false };
  const simCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
  const engine = await simulateHeadless(simCfg);
  if (!engine) return { ok: false };
  const my = Number(engine.score?.[0]) || 0;
  const opp = Number(engine.score?.[1]) || 0;
  const r = recordLeagueResult(save, { won: my > opp, myScore: my, oppScore: opp, sim: true });
  return { ok: true, myScore: my, oppScore: opp, won: my > opp, ...r };
}

export function leagueSummary(save) {
  const s = ensureLeague(save);
  return {
    started: s.started,
    active: s.started && s.phase !== "done",
    phase: s.phase,
    round: s.round,
    no: s.no,
    trophy: !!s.trophy,
    firstClear: !!s.firstClear,
    runs: s.runs || 0,
    placement: s.lastReward?.placeCn || "",
    lastReward: s.lastReward || null,
  };
}

/** UI 用：某一轮赛程 + 已打战况 */
export function roundView(save, index) {
  const s = ensureLeague(save);
  const done = s.rounds[index];
  const sched = s.schedule[index];
  return { ...(sched || {}), ...(done || {}), done: !!done };
}
