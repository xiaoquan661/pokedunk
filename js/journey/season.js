/**
 * journey/season.js —— 赛季状态机（docs/09 v2.4）
 * 赛季 = 8 馆 × 4 小关 + 四天王 = 33 场。
 *   - 每馆：新秀赛(馆主-6) → 主力赛(-4) → 王牌赛(-2) → 小决赛(馆主队)
 *   - 小决赛胜 → 徽章 + 进入下一馆；四天王胜 → 冠军 → 下一赛季（全馆 +2）
 *   - 常规赛软保底 min(target, teamPower+10)；同小关连败 3 次 → -3
 *   - 存档 journey.season{ no, phase, venue, small, results[], badges[], champion, history[] }
 */
import { LEAGUE_GYMS, getPokemon, buildPlayer, POKEMON_LIST, POSITION_ORDER } from "../../engine/readable/play-core.js?v=15";
import { pickGymRoster, GYM_ROSTERS, STAT_KEYS } from "./gyms.js?v=5";
import { teamPower as buildTeamPower } from "../systems/build.js?v=8";

export const SMALL_NAMES = ["新秀赛", "主力赛", "王牌赛", "小决赛"];
const SMALL_OFFSET = [6, 4, 2, 0];
const STYLES = ["防守型", "进攻型", "均衡型"];

const avgOvr = (roster) => (roster.length ? Math.round(roster.reduce((a, p) => a + p.ovr, 0) / roster.length) : 60);

/** 保证存档具备赛季结构；旧档按 stage/gymBadges 迁移 */
export function ensureSeason(save) {
  const j = save.journey;
  if (!j.season || typeof j.season !== "object") {
    let venue = 0, phase = "venue", no = typeof j.season === "number" ? j.season : 1, small = 0;
    const stage = j.stage || "gym1";
    if (stage === "elite") { phase = "final"; venue = 8; }
    else if (stage === "tour") { no = 2; }
    else {
      const n = Number(String(stage).replace("gym", "")) || 1;
      venue = Math.min(7, Math.max(0, n - 1));
    }
    j.season = {
      no,
      phase,
      venue,
      small,
      results: [],
      badges: (j.gymBadges || []).filter((b) => b !== "champion"),
      champion: false,
      history: [],
    };
  }
  const s = j.season;
  s.results ||= [];
  s.badges ||= [];
  s.history ||= [];
  if (typeof s.no !== "number") s.no = 1;
  if (typeof s.venue !== "number") s.venue = 0;
  if (typeof s.small !== "number") s.small = 0;
  if (!s.phase) s.phase = s.venue >= 8 ? "final" : "venue";
  try { syncLegacy(save, s); } catch {}
  return s;
}

/** 我方前 5 高战力（buildPlayer 口径，构筑系统接入后换成 monPower） */
export function myTeamPower(save) {
  try { return buildTeamPower(save); } catch {
    const list = [...save.team, ...save.box]
      .map((id) => save.mons[id])
      .filter(Boolean)
      .map((m) => buildPlayer(m.dex, m.bonus).ovr)
      .sort((a, b) => b - a);
    return list.length ? Math.round(list.slice(0, 5).reduce((a, v) => a + v, 0) / Math.min(5, list.length)) : 0;
  }
}

/** 当前赛季进度信息（比赛屏与主页共用） */
export function currentMatchInfo(save) {
  const s = ensureSeason(save);
  const extra = (s.no - 1) * 2;
  const isElite = s.phase === "final" || s.venue >= 8;

  if (isElite) {
    const gym = LEAGUE_GYMS.find((g) => g.elite) || LEAGUE_GYMS[LEAGUE_GYMS.length - 1];
    const leaderRoster = pickGymRoster("elite", gym.types, extra);
    const lp = avgOvr(leaderRoster);
    return {
      kind: "elite", season: s.no, venue: 8, small: 3, smallName: "四天王", styleName: "联队",
      gym, leaderRoster, leaderPower: lp, targetPower: lp, regularWins: 0, attempt: attemptOf(s, 8, 3),
      label: `赛季 ${s.no} · 四天王 · 冠军战`,
    };
  }

  const gym = LEAGUE_GYMS[s.venue];
  const small = Math.min(3, s.small);
  const leaderRoster = pickGymRoster(gym.gym, gym.types, extra);
  const leaderPower = avgOvr(leaderRoster);
  const isFinal = small === 3;
  const rawTarget = isFinal ? leaderPower : Math.max(30, leaderPower - SMALL_OFFSET[small]);
  const soft = Math.min(rawTarget, myTeamPower(save) + 10);
  const streak = lossStreak(s, s.venue, small);
  const targetPower = Math.max(20, (isFinal ? rawTarget : soft) - (streak >= 3 ? 3 : 0));
  return {
    kind: isFinal ? "final" : "regular",
    season: s.no,
    venue: s.venue,
    small,
    smallName: SMALL_NAMES[small],
    styleName: isFinal ? "馆主队" : STYLES[small % 3],
    gym,
    leaderRoster,
    leaderPower,
    targetPower,
    regularWins: regularWins(s, s.venue),
    attempt: attemptOf(s, s.venue, small),
    label: `赛季 ${s.no} · 第 ${s.venue + 1} 馆 ${gym.abbr} · ${SMALL_NAMES[small]}`,
  };
}

function attemptOf(s, venue, small) {
  return s.results.filter((r) => r.venue === venue && r.small === small && (r.season || s.no) === s.no).length + 1;
}

export function priorWins(s, venue, small) {
  return s.results.filter((r) => r.venue === venue && r.small === small && r.win && (r.season || s.no) === s.no).length;
}

/** 本馆 3 场常规赛已赢几场（用于小决赛 3-0 加成） */
export function regularWins(s, venue) {
  let n = 0;
  for (let i = 0; i < 3; i++) if (priorWins(s, venue, i) > 0) n++;
  return n;
}

/** 同一小关最近连败次数 */
export function lossStreak(s, venue, small) {
  const list = s.results.filter((r) => r.venue === venue && r.small === small && (r.season || s.no) === s.no);
  let n = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].win) break;
    n++;
  }
  return n;
}

/** 常规赛同系队伍（排除馆主 5 只；不足时允许少量重叠） */
export function buildRegularOpponent(info) {
  const theme = info.gym.types[0];
  const excluded = new Set((GYM_ROSTERS[info.kind === "elite" ? "elite" : info.gym.gym] || []));
  let pool = POKEMON_LIST.filter((p) => p.types.includes(theme) && !excluded.has(p.dex));
  if (pool.length < 5) pool = POKEMON_LIST.filter((p) => p.types.includes(theme));
  if (pool.length < 5) pool = POKEMON_LIST.filter((p) => !excluded.has(p.dex));
  const want = info.targetPower;
  const style = info.small % 3;
  const used = new Set();
  const roster = [];
  for (const pos of POSITION_ORDER) {
    const cand = pool
      .filter((p) => p.pos === pos && !used.has(p.dex))
      .sort((a, b) => Math.abs(a.ovr - want) - Math.abs(b.ovr - want))[0];
    if (cand) { roster.push(cand.dex); used.add(cand.dex); }
  }
  for (const p of [...pool].sort((a, b) => Math.abs(a.ovr - want) - Math.abs(b.ovr - want))) {
    if (roster.length >= 5) break;
    if (!used.has(p.dex)) { roster.push(p.dex); used.add(p.dex); }
  }
  return roster.slice(0, 5).map((dex) => {
    const base = getPokemon(dex);
    const gap = Math.max(0, Math.min(25, Math.round(want - base.ovr)));
    const bonus = {};
    for (const k of STAT_KEYS) {
      let add = gap;
      if (style === 0 && ["def", "blk", "reb"].includes(k)) add += 2;
      if (style === 1 && ["sht", "ins", "spd"].includes(k)) add += 2;
      bonus[k] = Math.max(0, Math.min(25, add));
    }
    return buildPlayer(dex, bonus);
  });
}

/** 赛季种子：同一场尝试可复现（docs/09 6.2） */
export function matchSeed(save, info) {
  const s = ensureSeason(save);
  const str = `${s.no}-${info.venue}-${info.small}-${info.attempt}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 记录一场结果并推进赛程；返回 { badgeGained, champion, seasonEnded, nextLabel } */
export function recordResult(save, info, { won, myScore, oppScore, sim }) {
  const s = ensureSeason(save);
  s.results.push({
    season: s.no,
    venue: info.venue,
    small: info.small,
    kind: info.kind,
    win: !!won,
    myScore,
    oppScore,
    sim: !!sim,
    attempt: info.attempt,
    at: Date.now(),
  });

  let badgeGained = null, champion = false, seasonEnded = false;
  if (won) {
    if (info.kind === "regular") {
      s.small = info.small + 1;
    } else if (info.kind === "final") {
      badgeGained = info.gym.badge;
      if (!s.badges.includes(badgeGained)) s.badges.push(badgeGained);
      s.venue += 1;
      s.small = 0;
      if (s.venue >= 8) s.phase = "final";
    } else {
      champion = true;
      seasonEnded = true;
      s.champion = true;
      s.badges.push("champion");
      s.history.push({ no: s.no, champion: true, at: Date.now(), w: save.stats.w, l: save.stats.l });
      // 下一赛季：重置关卡进度与徽章，保留养成/图鉴/金币；全馆 +2（由 no 推导）
      s.no += 1;
      s.phase = "venue";
      s.venue = 0;
      s.small = 0;
      s.results = [];
      s.badges = [];
      s.champion = false;
    }
  }

  syncLegacy(save, s);
  const next = s.phase === "final" || s.venue >= 8 ? "四天王" : `第 ${s.venue + 1} 馆 · ${SMALL_NAMES[Math.min(3, s.small)]}`;
  return { badgeGained, champion, seasonEnded, nextLabel: next };
}

/** 同步旧字段（成就/旧 UI 仍在读 stage/gymBadges） */
export function syncLegacy(save, s) {
  s ||= ensureSeason(save);
  const j = save.journey;
  const badges = [...s.badges];
  if (s.history.some((h) => h.champion) || s.champion) badges.push("champion");
  j.gymBadges = badges;
  j.stage = s.phase === "final" || s.venue >= 8 ? "elite" : `gym${Math.min(8, s.venue + 1)}`;
  j.seasonNo = s.no;
}

/** 主页副标题 */
export function progressLabel(save) {
  const info = currentMatchInfo(save);
  return info.label;
}


