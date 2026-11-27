/**
 * journey/gym-route.js —— 道馆路线（S69/S70/S72）
 * 参照口袋冒险：挑战馆主前先清一条 5 关路线——
 *   野生 1v1 → 路线训练家 5v5 → 补给点 → 野生 1v1 → 馆主 5v5。
 * 前四关不推进主线，馆主战给徽章并解锁下一个道馆。
 * 存档：save.journey.route = { key, step }
 */
import { LEAGUE_GYMS } from "../../engine/readable/play-core.js?v=688";
import { buildMyRoster, buildWildMatch } from "./match-screen.js?v=688";
import { pickGymRoster } from "./gyms.js?v=688";
import { WILD_ROUTES, pickWildOpponent, recordWildResult } from "./wild.js?v=688";
import { leagueInfo } from "./season.js?v=688";
import { regionOf } from "./regions.js?v=688";
import { starterIds } from "../systems/build.js?v=688";
import { loadSet } from "../ui/settings.js?v=688";
import { grantXp } from "../systems/xp.js?v=688";
import { bumpDaily } from "../ui/earn.js?v=688";
import { ACHV } from "../systems/achv.js?v=688";

export const ROUTE_STEPS = [
  { id: "wild1", kind: "wild", name: "野生宝可梦", desc: "1v1 · 打赢可收服" },
  { id: "minor", kind: "minor", name: "路线训练家", desc: "5v5 · 小人物球队" },
  { id: "rest", kind: "rest", name: "补给点", desc: "领取树果与篮球币" },
  { id: "wild2", kind: "wild", name: "野生宝可梦", desc: "1v1 · 路线深处" },
  { id: "leader", kind: "leader", name: "馆主", desc: "5v5 · 胜利获得徽章" },
];

/** 每馆路线风味：路线名 / 训练家 / 补给点 */
const ROUTE_META = [
  { route: "常磐森林", trainer: "短裤小子 阿明", rest: "尼比市补给", color: "#67a94a" },
  { route: "月见山", trainer: "捕虫少年 小武", rest: "华蓝市补给", color: "#3b8fd8" },
  { route: "地鼠洞", trainer: "水手 阿海", rest: "枯叶市补给", color: "#d8b23b" },
  { route: "岩山隧道", trainer: "园丁 小花", rest: "彩虹市补给", color: "#5aa86a" },
  { route: "宝可梦塔", trainer: "火箭队手下", rest: "浅红市补给", color: "#8a4a9c" },
  { route: "西尔佛公司", trainer: "超能少年 阿念", rest: "金黄市补给", color: "#b06ad8" },
  { route: "宝可梦屋", trainer: "登山男 阿岩", rest: "红莲岛补给", color: "#c8452f" },
  { route: "冠军之路", trainer: "火箭队干部", rest: "常磐市补给", color: "#a06a3a" },
];

function routeKey(save, info) {
  return `${save.journey?.regionNo || 1}-${save.journey?.season?.no || 1}-${info.venue}`;
}

/** 当前道馆路线状态；非道馆战（四天王/结束）返回 null */
export function routeState(save) {
  const info = leagueInfo(save);
  if (!info || info.kind !== "league") return null;
  const j = (save.journey ||= {});
  const key = routeKey(save, info);
  if (!j.route || j.route.key !== key) j.route = { key, step: 0 };
  j.route.step = Math.max(0, Math.min(ROUTE_STEPS.length - 1, Number(j.route.step) || 0));
  const base = LEAGUE_GYMS[info.venue] || LEAGUE_GYMS[0];
  const display = regionOf(save).gyms?.[info.venue] || {};
  const gym = {
    ...base,
    name: display.name || info.gym?.name || base.name,
    leader: display.leader || base.leader || "",
    typeCn: display.type || (base.types || []).join("/"),
  };
  const meta = ROUTE_META[info.venue] || ROUTE_META[0];
  const titles = [
    `${meta.route} · 前段`, meta.trainer, meta.rest, `${meta.route} · 深处`, `馆主 ${gym.leader}`,
  ];
  const steps = ROUTE_STEPS.map((s, i) => ({
    ...s,
    index: i,
    done: i < j.route.step,
    current: i === j.route.step,
    locked: i > j.route.step,
    title: titles[i] || s.name,
  }));
  return { info, gym, route: j.route, steps, step: j.route.step, meta };
}

export function routeForGym(gym) {
  const types = gym.types || [];
  if (types.some((t) => ["Water", "Electric", "Flying"].includes(t))) return WILD_ROUTES.find((r) => r.id === "water") || WILD_ROUTES[0];
  if (types.some((t) => ["Fire", "Rock", "Ground", "Psychic"].includes(t))) return WILD_ROUTES.find((r) => r.id === "cave") || WILD_ROUTES[0];
  return WILD_ROUTES.find((r) => r.id === "grass") || WILD_ROUTES[0];
}

/** 路线第一步：野生宝可梦 1v1；monId 可指定首发，未传则用首发第一位 */
export function buildRouteWild(save, monId = null) {
  const st = routeState(save);
  if (!st || st.steps[st.step]?.kind !== "wild") return null;
  const ids = starterIds(save);
  if (!ids.length) return null;
  const cur = st.steps[st.step];
  const route = { ...routeForGym(st.gym), name: cur.title };
  const opp = pickWildOpponent(save, route);
  const leadId = ids.find((id) => String(id) === String(monId)) || ids[0];
  const cfg = buildWildMatch(save, route, leadId, opp);
  if (!cfg) return null;
  cfg.mode = "route";
  cfg.routeStage = { kind: "wild", step: st.step, opp, monId: leadId };
  return cfg;
}

/** 路线第二步：小人物球队 5v5 */
export function buildRouteMinor(save) {
  const st = routeState(save);
  if (!st || st.step !== 1) return null;
  const gym = st.gym;
  const set = loadSet();
  const roster = pickGymRoster(gym.gym, gym.types, -12);
  const home = {
    name: (save.coach?.name || "ME") + "队",
    abbr: (save.coach?.name || "ME").slice(0, 3).toUpperCase(),
    title: save.coach?.title || "",
    color: "#3b6fd8", color2: "#16224a",
    roster: buildMyRoster(save, 1), bench: [], human: true, boost: 0,
  };
  const away = {
    name: st.meta.trainer,
    abbr: "TRN",
    color: st.meta.color,
    color2: "#2a1a10",
    roster, bench: [], human: false, boost: 0,
  };
  return {
    home, away, difficulty: "rookie", quarterLen: 120, quarters: 2,
    autoSwitch: set.autoSwitch !== false,
    userAutoSubs: set.autoSubs !== false,
    specialFx: set.specialFx !== false,
    seed: (Date.now() ^ ((st.info.venue + 1) * 2654435761)) >>> 0,
    mode: "route",
    stamina: true,
    gym: { name: away.name, abbr: "TRN", color: away.color, color2: away.color2, elite: false },
    routeStage: { kind: "minor", step: 1 },
  };
}

function advance(save, expected) {
  const st = routeState(save);
  if (st && st.step === expected) st.route.step = Math.min(ROUTE_STEPS.length - 1, st.step + 1);
}

/** 结算路线野生战：复用野球场收服/经验逻辑，但不消耗每日次数 */
export function recordRouteWild(save, engine, stage, quit = false) {
  const won = !quit && !!engine && engine.score[0] > engine.score[1];
  const opp = stage?.opp;
  const monId = stage?.monId;
  const r = recordWildResult(save, { won, opp, monId, engine });
  if (won) advance(save, stage?.step ?? 0);
  return { ...r, won };
}

/** 结算路线小人物球队：金币 + 首发 XP，不推进主线 */
export function recordRouteMinor(save, engine, stage, quit = false) {
  const won = !quit && !!engine && engine.score[0] > engine.score[1];
  const myScore = Number(engine?.score?.[0]) || 0;
  const oppScore = Number(engine?.score?.[1]) || 0;
  const margin = Math.min(10, Math.abs(myScore - oppScore));
  const coins = won ? 35 + margin * 2 : 5;
  save.coins = (save.coins || 0) + coins;
  const xp = won ? 18 + margin * 3 : 6;
  const events = [];
  for (const id of starterIds(save)) {
    const mon = save.mons?.[id];
    if (mon) events.push(...grantXp(save, id, mon, xp));
  }
  bumpDaily("match");
  try { ACHV.evaluateMatch(save, { won, margin, myScore }); } catch {}
  if (won) advance(save, stage?.step ?? 1);
  return { won, coins, xp, events };
}

/** 补给点：领 1 个普通树果 + 20 币，直接推进路线 */
export function claimRouteRest(save) {
  const st = routeState(save);
  if (!st || st.steps[st.step]?.kind !== "rest") return null;
  save.bag ||= {};
  save.bag.berryNormal = (save.bag.berryNormal || 0) + 1;
  save.coins = (save.coins || 0) + 20;
  advance(save, st.step);
  return { berry: 1, coins: 20, step: st.step };
}

/** 馆主战前把路线标记为已清（馆主胜负由主线结算处理） */
export function markRouteLeader(save) {
  const st = routeState(save);
  if (st) st.route.step = ROUTE_STEPS.length - 1;
}
