/**
 * journey/legend.js —— 赛季传说奖励（v3）
 *
 * 规则（docs/09 v3.1）：
 *   - 当前实际传说池 16 只，每赛季 2 只，8 个赛季轮换，循环不永久绝版。
 *   - 联赛总冠军、四天王挑战共享同一个赛季池：
 *       先完成的一条线 → 2 选 1；
 *       后完成的另一条线 → 拿剩下的 1 只；
 *       两条都完成 → 当季 2 只全拿。
 *   - 只完成一条时，另一只不会消失；等另一条完成后可继续领。
 *   - 传说直接进队伍；队伍满 10 只进仓库；重复折算 200 币。
 */
import { getPokemon } from "../../engine/data/pokemon.js";
import { POKEMON_LIST } from "../../engine/readable/play-core.js?v=15";
import { addMon } from "../storage.js?v=14";
import { LEGENDARY_DEX } from "../systems/build.js?v=8";

export const LEGEND_DUPE_COINS = 200;
const DEXES = new Set(POKEMON_LIST.map((p) => p.dex));

export function dexName(dex) {
  const row = (window.__PJ_DEX_ROWS || []).find((r) => r[0] === dex);
  return row ? String(row[1]).replace(/#\d+$/, "") : getPokemon(dex).name;
}

export const LEGEND_ROTATION = [...LEGENDARY_DEX]
  .filter((dex) => DEXES.has(dex))
  .sort((a, b) => a - b);

/** 该赛季的 2 只候选传说 */
export function legendChoicesForSeason(seasonNo) {
  const list = LEGEND_ROTATION.length ? LEGEND_ROTATION : [150, 151, 249];
  const no = Math.max(1, Number(seasonNo) || 1);
  const start = ((no - 1) * 2) % list.length;
  return [0, 1].map((i) => list[(start + i) % list.length]);
}

export function ensureLegend(save) {
  save.journey ||= {};
  const j = save.journey;
  j.legend ||= {};
  const l = j.legend;
  l.claimed = Array.isArray(l.claimed) ? l.claimed : [];
  l.pending = Array.isArray(l.pending) ? l.pending : [];
  l.taken = l.taken && typeof l.taken === "object" ? l.taken : {};
  l.tracks = l.tracks && typeof l.tracks === "object" ? l.tracks : {};
  return l;
}

/**
 * 某条获取线完成时调用。
 * @param track "champion" | "fourKings"
 * @returns 待领取项；同一条线重复完成不会重复给奖励
 */
export function offerLegendReward(save, seasonNo, track) {
  const l = ensureLegend(save);
  const no = Number(seasonNo) || 1;
  if (!track) return null;
  l.tracks[no] ||= [];
  if (l.tracks[no].includes(track)) {
    return l.pending.find((p) => p.season === no) || null;
  }
  l.tracks[no].push(track);

  const taken = l.taken[no] ||= [];
  const choices = legendChoicesForSeason(no).filter((d) => !taken.includes(d));
  if (!choices.length) return null;

  let item = l.pending.find((p) => p.season === no);
  if (item) {
    item.choices = choices;
    item.claims = Math.min(2, (item.claims || 1) + 1);
  } else {
    item = { season: no, choices, claims: 1, at: Date.now() };
    l.pending.push(item);
  }
  return item;
}

/** 当前最早一条待领取 */
export function pendingLegend(save) {
  const l = ensureLegend(save);
  return l.pending[0] || null;
}

/**
 * 领取一个传说。每次消耗 1 个 claims。
 * 返回 { ok, dex, name, placed, first } 或 { ok, dup, dex, name, coin }。
 */
export function claimLegendReward(save, seasonNo, dex) {
  const l = ensureLegend(save);
  const no = Number(seasonNo) || 1;
  const idx = l.pending.findIndex((p) => p.season === no);
  if (idx < 0) return { ok: false, error: "没有待领取的赛季传说" };
  const item = l.pending[idx];
  if (!item.choices.includes(dex)) return { ok: false, error: "这只传说不在本期可选范围" };

  const r = addMon(save, dex, { from: "legend" });
  const taken = l.taken[no] ||= [];
  if (!taken.includes(dex)) taken.push(dex);
  item.claims = Math.max(0, (item.claims || 1) - 1);
  item.choices = item.choices.filter((d) => d !== dex);
  if (item.claims <= 0 || !item.choices.length) l.pending.splice(idx, 1);
  if (taken.length >= 2 && !l.claimed.includes(no)) l.claimed.push(no);

  if (r.ok) {
    return { ok: true, dex, name: dexName(dex), placed: r.movedTo, first: r.isNewDex };
  }

  // 已拥有：折算篮球币，仍然消耗本次领取资格
  save.coins += LEGEND_DUPE_COINS;
  return { ok: true, dup: true, dex, name: dexName(dex), coin: LEGEND_DUPE_COINS };
}
