/**
 * journey/legend.js —— 冠军传说自选（v2.5）
 * 规则：
 *   - 每个赛季首通四天王 → 解锁该赛季 3 只传说自选，必得 1 只
 *   - 每赛季轮换 3 只，按 LEGENDARY_DEX 顺序覆盖全部传说
 *   - 未领取会保留在 journey.legend.pending，可在赛季页补领
 *   - 已拥有 → 折算 200 篮球币（避免重复传说只值 25 币）
 */
import { getPokemon } from "../../engine/data/pokemon.js";
import { POKEMON_LIST } from "../../engine/readable/play-core.js?v=15";
import { addMon } from "../storage.js?v=14";
import { LEGENDARY_DEX } from "../systems/build.js?v=8";

export const LEGEND_DUPE_COINS = 200;
const DEXES = new Set(POKEMON_LIST.map((p) => p.dex));

/** 中文名优先取 dex 数据表，回退到引擎名 */
export function dexName(dex) {
  const row = (window.__PJ_DEX_ROWS || []).find((r) => r[0] === dex);
  return row ? String(row[1]).replace(/#\d+$/, "") : getPokemon(dex).name;
}

/** 只保留游戏中实际存在的传说 dex，按图鉴顺序轮换 */
export const LEGEND_ROTATION = [...LEGENDARY_DEX]
  .filter((dex) => DEXES.has(dex))
  .sort((a, b) => a - b);

/** 该赛季的 3 只候选传说 */
export function legendChoicesForSeason(seasonNo) {
  const list = LEGEND_ROTATION.length ? LEGEND_ROTATION : [150, 151, 249];
  const no = Math.max(1, Number(seasonNo) || 1);
  const start = ((no - 1) * 3) % list.length;
  return [0, 1, 2].map((i) => list[(start + i) % list.length]);
}

export function ensureLegend(save) {
  save.journey ||= {};
  const j = save.journey;
  j.legend ||= {};
  const l = j.legend;
  l.claimed = Array.isArray(l.claimed) ? l.claimed : [];
  if (!Array.isArray(l.pending)) l.pending = l.pending ? [l.pending] : [];
  return l;
}

/** 冠军后解锁本期自选；每赛季只解锁一次 */
export function offerLegendReward(save, seasonNo) {
  const l = ensureLegend(save);
  const no = Number(seasonNo) || 1;
  if (l.claimed.includes(no)) return null;
  const old = l.pending.find((p) => p.season === no);
  if (old) return old;
  const item = { season: no, choices: legendChoicesForSeason(no), at: Date.now() };
  l.pending.push(item);
  return item;
}

/** 当前待领取的冠军传说（最早一条） */
export function pendingLegend(save) {
  const l = ensureLegend(save);
  return l.pending[0] || null;
}

/**
 * 领取冠军传说。
 * 返回 { ok, dex, name, placed, first } 或 { ok, dup, dex, name, coin }。
 */
export function claimLegendReward(save, seasonNo, dex) {
  const l = ensureLegend(save);
  const idx = l.pending.findIndex((p) => p.season === Number(seasonNo));
  if (idx < 0) return { ok: false, error: "没有待领取的冠军传说" };
  const item = l.pending[idx];
  if (!item.choices.includes(dex)) return { ok: false, error: "这只传说不在本期可选范围" };

  const r = addMon(save, dex, { from: "legend" });
  if (r.ok) {
    l.pending.splice(idx, 1);
    l.claimed.push(Number(seasonNo));
    return { ok: true, dex, name: dexName(dex), placed: r.movedTo, first: r.isNewDex };
  }

  // 已拥有：折算篮球币，仍然消耗本期领取资格
  save.coins += LEGEND_DUPE_COINS;
  l.pending.splice(idx, 1);
  l.claimed.push(Number(seasonNo));
  return { ok: true, dup: true, dex, name: dexName(dex), coin: LEGEND_DUPE_COINS };
}
