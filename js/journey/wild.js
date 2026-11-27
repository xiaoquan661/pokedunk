/**
 * journey/wild.js —— 野球场1v1（V1）
 *
 * 核心循环：选路线 → 和野生精灵打一场 1v1 篮球 → 赢了它加入，参赛精灵获得 XP。
 * 不推进主线、不计生涯战绩、不发合同；每天 3 次，广告 +1 次。
 */
import { POKEMON_LIST, getPokemon } from "../../engine/readable/play-core.js?v=697";
import { STAT_KEYS, LEGENDARY_DEX, isOnGrass } from "../systems/build.js?v=697";
import { addMon, hasDex } from "../storage.js?v=697";
import { grantXp } from "../systems/xp.js?v=697";
import { bumpDaily } from "../ui/earn.js?v=697";
import { ACHV } from "../systems/achv.js?v=697";
import { facilityState } from "../systems/badge-unlocks.js?v=697";

export const WILD_ATTEMPTS = 3;
export const WILD_AD_ATTEMPTS = 1;

export const WILD_ROUTES = [
  {
    id: "grass", name: "草原野球场", short: "草原", types: ["Normal", "Grass", "Bug"],
    minBadges: 0, minLevel: 3, maxLevel: 10, difficulty: "rookie",
    color: "#67a94a", color2: "#16351c",
  },
  {
    id: "water", name: "水边野球场", short: "水边", types: ["Water", "Electric", "Flying"],
    minBadges: 2, minLevel: 8, maxLevel: 18, difficulty: "pro",
    color: "#3b8fd8", color2: "#122a46",
  },
  {
    id: "cave", name: "洞窟野球场", short: "洞窟", types: ["Fire", "Rock", "Ground", "Psychic"],
    minBadges: 4, minLevel: 15, maxLevel: 28, difficulty: "allstar",
    color: "#c46a3a", color2: "#351b12",
  },
];

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 每日状态：日期变化后重置 */
export function wildEnsure(save) {
  const key = dateKey();
  if (!save.wild || save.wild.date !== key) {
    save.wild = { date: key, attempts: 0, adUsed: 0, wins: 0, last: null };
  }
  save.wild.attempts = Number(save.wild.attempts) || 0;
  save.wild.adUsed = Number(save.wild.adUsed) || 0;
  save.wild.wins = Number(save.wild.wins) || 0;
  return save.wild;
}

export function wildMax(save) {
  const w = wildEnsure(save);
  return WILD_ATTEMPTS + (facilityState(save).wildBonus || 0) + (w.adUsed ? WILD_AD_ATTEMPTS : 0);
}

export function wildLeft(save) {
  return Math.max(0, wildMax(save) - wildEnsure(save).attempts);
}

export function wildUseAttempt(save) {
  if (wildLeft(save) <= 0) return false;
  wildEnsure(save).attempts++;
  return true;
}

export function wildGrantAdAttempt(save) {
  const w = wildEnsure(save);
  if (w.adUsed) return false;
  w.adUsed = 1;
  return true;
}

export function badgeCount(save) {
  return (save?.journey?.season?.badges || []).filter((b) => b !== "champion").length;
}

export function wildRouteUnlocked(save, route) {
  return badgeCount(save) >= (route?.minBadges || 0);
}

/** 可出战的精灵：队伍 + 仓库，排除草地挂机中的 */
export function wildEligibleMons(save) {
  const ids = [...new Set([...(save.team || []), ...(save.box || [])])];
  return ids.filter((id) => save.mons?.[id] && !isOnGrass(save, id));
}

function levelBonus(level) {
  const gain = Math.max(0, Math.round((Number(level) - 5) * 0.6));
  const bonus = {};
  for (const k of STAT_KEYS) bonus[k] = gain;
  return bonus;
}

function routeCandidates(route) {
  return POKEMON_LIST.filter((p) => {
    if (LEGENDARY_DEX.has(p.dex)) return false;
    const types = getPokemon(p.dex)?.types || p.types || [];
    return types.some((t) => route.types.includes(t));
  });
}

/** 进度页用：该路线可能出现的野生精灵池（含传说过滤） */
export function wildRoutePool(route) {
  return routeCandidates(route);
}

function wildOpponent(pick, level, route) {
  return {
    dex: pick.dex,
    level,
    bonus: levelBonus(level),
    name: getPokemon(pick.dex)?.name || pick.name || "",
    types: getPokemon(pick.dex)?.types || pick.types || [],
    ovr: getPokemon(pick.dex)?.ovr || pick.ovr || 60,
    routeId: route.id,
  };
}

/** 按路线等级抽一只野生对手，未拥有优先 */
export function pickWildOpponent(save, route, rng = Math.random) {
  const min = route.minLevel, max = route.maxLevel;
  const level = min + Math.floor(rng() * (max - min + 1));
  const target = 45 + level * 1.2;
  let pool = routeCandidates(route);
  if (!pool.length) pool = POKEMON_LIST.filter((p) => !LEGENDARY_DEX.has(p.dex));
  const unowned = pool.filter((p) => !hasDex(save, p.dex));
  if (unowned.length && rng() < 0.7) pool = unowned;
  const ranked = pool
    .map((p) => ({ p, d: Math.abs((getPokemon(p.dex)?.ovr || 60) - target) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 10);
  const pick = ranked[Math.floor(rng() * ranked.length)]?.p || pool[0];
  return wildOpponent(pick, level, route);
}

/**
 * 赛后结算：参赛精灵拿 XP；赢下后野生精灵加入。
 * 同种已拥有时折算篮球币 + 普通树果。
 */
export function recordWildResult(save, { won, opp, monId, engine }) {
  const w = wildEnsure(save);
  const p = engine?.players?.find((x) => x.team === 0);
  const st = p?.stats || {};
  const pts = Number(st.pts) || 0;
  const dnk = Number(st.dnk) || 0;
  const stl = Number(st.stl) || 0;
  const base = won
    ? 30 + opp.level * 2 + pts * 2 + dnk * 3 + stl * 2
    : 10 + opp.level + pts;
  const xp = Math.min(won ? 160 : 80, Math.max(0, Math.round(base)));
  const mon = save.mons?.[monId];
  const before = mon?.level || 0;
  const events = mon ? grantXp(save, monId, mon, xp) : [];
  let recruit = null;
  let dup = false;
  let coins = 0;

  if (won) {
    w.wins++;
    const r = addMon(save, opp.dex, { level: opp.level });
    if (r.ok) {
      recruit = { dex: opp.dex, level: save.mons[r.id]?.level || opp.level, placed: r.movedTo };
    } else {
      dup = true;
      coins = 25;
      save.coins = (save.coins || 0) + coins;
      save.bag ||= {};
      save.bag.berryNormal = (save.bag.berryNormal || 0) + 1;
    }
  }
  // 野球场也属于“打完一场”：接入每日任务计数与比赛类成就
  const myScore = Number(engine?.score?.[0]) || 0;
  const oppScore = Number(engine?.score?.[1]) || 0;
  bumpDaily("match");
  ACHV.evaluateMatch(save, { won, margin: Math.abs(myScore - oppScore), myScore });
  w.last = { at: Date.now(), dex: opp.dex, won, xp, recruit: !!recruit, dup, coins };
  return {
    won, xp, events, recruit, dup, coins,
    before, after: mon?.level || 0,
  };
}
