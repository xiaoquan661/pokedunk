/**
 * systems/grass.js —— 训练草地挂机（S16）
 * 规则：
 *   - 3 个位置，拥有的精灵都可以拖上草地；首发精灵会先确认，再自动退出首发
 *   - 每只 2 经验/分钟，离线照算，没有累计上限
 *   - 上线时自动结算离线收益并弹窗汇报；页面上可随时手动领取
 * 存档：save.grass = { slots: [null | { monId, dex, lastTs, bankXp }], seenAt }
 */
import { GRASS_RATE, GRASS_CAP_MS, GRASS_SLOTS } from "./grass-config.js?v=696";
import { grantXp } from "./xp.js?v=696";
import { xpToNext } from "../../engine/growth.js?v=696";
import { EVOLUTIONS } from "../../engine/data/evolutions.js";
import { starterIds, ensureLineupSlots } from "./build.js?v=696";
import { levelCapOf } from "../journey/regions.js?v=696";

export { GRASS_SLOTS };

export function ensureGrass(save) {
  if (!save.grass || !Array.isArray(save.grass.slots)) {
    save.grass = { slots: Array.from({ length: GRASS_SLOTS }, () => null) };
  }
  while (save.grass.slots.length < GRASS_SLOTS) save.grass.slots.push(null);
  return save.grass;
}

/** 单格尚未领取的经验：不设上限，离线多久都持续累积 */
export function pendingXp(slot, now = Date.now()) {
  if (!slot) return 0;
  const start = slot.lastTs || now;
  if (now <= start) return 0;
  return Math.floor(((now - start) / 60000) * GRASS_RATE);
}

/** 兼容旧调用；草地当前无累计上限，始终返回 false */
export function isFull() {
  return false;
}

/** 草地总览（UI 用） */
export function grassState(save, now = Date.now()) {
  const g = ensureGrass(save);
  return g.slots.map((slot, i) => {
    if (!slot) return { index: i, empty: true };
    const mon = save.mons?.[slot.monId];
    if (!mon) return { index: i, empty: true, orphan: true };
    return {
      index: i,
      empty: false,
      slot,
      monId: slot.monId,
      mon,
      xp: pendingXp(slot, now),
      full: isFull(slot, now),
    };
  });
}

/** 是否在首发五人里：草地挂机与比赛互斥 */
export function isStarter(save, monId) {
  return starterIds(save).includes(Number(monId));
}

/** 可放上草地的精灵：拥有的全部精灵（队伍 + 仓库），排除已在草地上的 */
export function grassCandidates(save) {
  const ids = [...(save.team || []), ...(save.box || [])];
  const onGrass = new Set(ensureGrass(save).slots.filter(Boolean).map((s) => s.monId));
  return ids.filter((id) => save.mons?.[id] && !onGrass.has(id));
}

/**
 * 放上草地：不能重复放同一只。
 * opts.autoBench=true 时，首发精灵会先退出首发再上草地；否则返回 needsBench。
 */
export function placeOnGrass(save, slot, monId, opts = {}) {
  const g = ensureGrass(save);
  if (slot < 0 || slot >= GRASS_SLOTS) return { ok: false, error: "位置无效" };
  if (g.slots[slot]) return { ok: false, error: "这个位置已经有精灵了" };
  const mon = save.mons?.[monId];
  if (!mon) return { ok: false, error: "找不到这只精灵" };
  if (g.slots.some((s) => s && s.monId === monId)) return { ok: false, error: "这只已经在草地上了" };
  let benched = false;
  if (isStarter(save, monId)) {
    if (!opts.autoBench) return { ok: false, needsBench: true, error: "首发精灵需要先退出首发" };
    delete save.assign[monId];
    save.benched ||= {};
    save.benched[monId] = true;
    ensureLineupSlots(save);
    benched = true;
  }
  g.slots[slot] = { monId, dex: mon.dex, lastTs: Date.now(), bankXp: 0 };
  return { ok: true, benched };
}

/** 领取经验：结算升级（含进化），返回事件 */
export function collectGrass(save, slot, now = Date.now()) {
  const g = ensureGrass(save);
  const s = g.slots[slot];
  if (!s) return { ok: false, error: "这个位置没有精灵" };
  const mon = save.mons?.[s.monId];
  if (!mon) { g.slots[slot] = null; return { ok: false, error: "精灵已不在队伍中" }; }
  const gain = pendingXp(s, now);
  if (gain <= 0) return { ok: false, error: "还没攒够经验，稍后再来" };
  const before = mon.level;
  const events = grantXp(save, s.monId, mon, gain);
  s.lastTs = now;
  s.bankXp = 0;
  s.dex = mon.dex;
  return { ok: true, gain, before, after: mon.level, events };
}

/** 放回仓库：未领取经验直接结算，避免玩家误以为丢了 */
export function removeFromGrass(save, slot, now = Date.now()) {
  const g = ensureGrass(save);
  const s = g.slots[slot];
  if (!s) return { ok: false, error: "这个位置没有精灵" };
  const mon = save.mons?.[s.monId];
  const events = [];
  const gain = pendingXp(s, now);
  if (mon && gain > 0) events.push(...grantXp(save, s.monId, mon, gain));
  g.slots[slot] = null;
  return { ok: true, gain, events };
}

/** 草地离线收益的前置预览：不发放经验，只算 pending XP、可升级与可进化数量 */
export function offlineGrassPending(save, now = Date.now()) {
  const g = ensureGrass(save);
  const rows = [];
  let total = 0;
  for (let i = 0; i < g.slots.length; i++) {
    const s = g.slots[i];
    if (!s) continue;
    const mon = save.mons?.[s.monId];
    if (!mon) continue;
    const gain = pendingXp(s, now);
    if (gain <= 0) continue;
    let level = mon.level;
    let xp = (mon.xp || 0) + gain;
    const cap = levelCapOf(save);
    while (level < cap && xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level += 1;
    }
    const evo = EVOLUTIONS[mon.dex];
    const evolveLevel = Number(evo?.level) || 999;
    const canEvolve = !!evo && mon.level < evolveLevel && level >= evolveLevel;
    rows.push({
      slot: i, monId: s.monId, dex: mon.dex, gain,
      before: mon.level, after: level, levels: level - mon.level,
      canEvolve, evolveLevel: canEvolve ? evolveLevel : 0,
    });
    total += gain;
  }
  const lastSeen = g.seenAt || Math.min(...g.slots.filter(Boolean).map((s) => Number(s.lastTs) || now));
  return {
    total,
    rows,
    count: rows.length,
    canLevel: rows.filter((r) => r.levels > 0).length,
    canEvolve: rows.filter((r) => r.canEvolve).length,
    idleMs: Math.max(0, now - (Number.isFinite(lastSeen) ? lastSeen : now)),
  };
}

/** 领取离线草地收益；multiplier=2 用于广告双倍。返回每只精灵的升级事件。 */
export function claimOfflineGrass(save, multiplier = 1, now = Date.now()) {
  const g = ensureGrass(save);
  const out = [];
  g.seenAt = now;
  g.slots.forEach((s, i) => {
    if (!s) return;
    const mon = save.mons?.[s.monId];
    if (!mon) { g.slots[i] = null; return; }
    const gain = pendingXp(s, now);
    if (gain <= 0) { s.lastTs = now; return; }
    const totalGain = Math.max(0, Math.round(gain * multiplier));
    const before = mon.level;
    const oldDex = mon.dex;
    const events = grantXp(save, s.monId, mon, totalGain);
    s.lastTs = now;
    s.bankXp = 0;
    s.dex = mon.dex;
    out.push({
      slot: i, monId: s.monId, oldDex, dex: mon.dex, gain: totalGain,
      before, after: mon.level, evolved: mon.dex !== oldDex, events,
      maxed: mon.level >= 99,
    });
  });
  return out;
}

/**
 * 上线时结算离线收益：把所有格子里攒的经验自动发放到精灵身上。
 * 只有距上次结算 ≥ 1 分钟才结算，避免切页面/刷新时反复弹窗。
 * 返回本次有收益的精灵列表，供离线收益弹窗展示。
 */
export function settleOffline(save, now = Date.now(), minGapMs = 60000) {
  const g = ensureGrass(save);
  const lastSeen = g.seenAt || 0;
  const out = [];
  if (now - lastSeen < minGapMs) return out;
  g.seenAt = now;
  g.slots.forEach((s, i) => {
    if (!s) return;
    const mon = save.mons?.[s.monId];
    if (!mon) { g.slots[i] = null; return; }
    const gain = pendingXp(s, now);
    if (gain <= 0) { s.lastTs = now; return; }
    const before = mon.level;
    const oldDex = mon.dex;
    const events = grantXp(save, s.monId, mon, gain);
    s.lastTs = now;
    s.bankXp = 0;
    s.dex = mon.dex;
    out.push({
      slot: i, monId: s.monId, name: "", oldDex, dex: mon.dex, gain,
      before, after: mon.level, evolved: mon.dex !== oldDex, events,
      maxed: mon.level >= 99,
    });
  });
  return out;
}

