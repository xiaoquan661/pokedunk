/**
 * systems/awards.js —— 地区颁奖（2026-11-25 · S49）
 * ============================================
 * 移植自原版冠军结算 window.__pjCrown → pn()：
 *   MVP / 得分王 / 最佳防守 / 最佳第六人 / 最快进步，地区内至少出场 MIN_GP 场参与评选。
 * 数据来源：每场结算时把「我方」球员单场 stats 累加进 journey.season.playerStats。
 * 以个体 saveId 为键（进化后仍归同一只），展示时用当前 dex 取中文名。
 * 只负责数据；颁奖演出在 js/ui/champion.js。
 */
import { getPokemon } from "../../engine/readable/play-core.js?v=688";
import { mainOVR } from "./build.js?v=688";

export const MIN_GP = 4;
const STAT_KEYS = ["gp", "gs", "pts", "reb", "ast", "stl", "blk", "fgm", "fga", "tpm", "tpa", "dnk", "sec"];

const emptyLine = () => { const o = {}; for (const k of STAT_KEYS) o[k] = 0; return o; };

/** 确保地区统计容器存在（旧档自动补空对象） */
export function ensureSeasonStats(save) {
  const se = save?.journey?.season;
  if (!se) return {};
  se.playerStats ||= {};
  se.ovrBase ||= {};
  return se.playerStats;
}

/** 记录地区开始时的 OVR 基线（用于最快进步；首次见到该个体时写入） */
export function ensureOvrBase(save) {
  const se = save?.journey?.season;
  if (!se) return;
  se.ovrBase ||= {};
  for (const [id, mon] of Object.entries(save.mons || {})) {
    if (se.ovrBase[id] == null) {
      try { se.ovrBase[id] = mainOVR(mon); } catch { se.ovrBase[id] = 0; }
    }
  }
}

/** 一场结束后累加我方球员数据。engine 可为空 */
export function recordSeasonStats(save, engine) {
  if (!engine?.players?.length) return false;
  const bank = ensureSeasonStats(save);
  for (const p of engine.players) {
    if (p.team !== 0) continue;
    const s = p.stats || {};
    // 只统计真正上过场的（首发或有出场时间）
    if (!(p.slot >= 0 || (s.sec || 0) > 0)) continue;
    const key = String(p.mon?.saveId ?? p.mon?.dex ?? p.id);
    const row = (bank[key] ||= emptyLine());
    row.gp += 1;
    if (p.slot >= 0) row.gs += 1;
    for (const k of STAT_KEYS) {
      if (k === "gp" || k === "gs") continue;
      row[k] += Number(s[k]) || 0;
    }
  }
  return true;
}

/** 综合评分：原版 ts()，用于 MVP / 第六人 */
export function gameScore(s) {
  return (s.pts || 0) + (s.reb || 0) * 1.2 + (s.ast || 0) * 1.5 + (s.stl || 0) * 2 + (s.blk || 0) * 2 - ((s.fga || 0) - (s.fgm || 0)) * 0.4;
}

const per = (s, k) => (s.gp > 0 ? (s[k] || 0) / s.gp : 0);

function monName(save, key, row) {
  const mon = save?.mons?.[key];
  const dex = mon?.dex ?? row?.dex;
  const base = dex ? getPokemon(dex)?.name : "";
  const cn = (window.__PJ_DEX_ROWS || []).find((r) => r[0] === dex)?.[1];
  return String(cn ?? base ?? "?").replace(/#\d+$/, "");
}

/**
 * 计算地区奖项。
 * 返回 { awards: [{key,label,dex,name,line}], mvp: award|null }
 * 命中不足 MIN_GP 时不会产生奖项（返回空）。
 */
export function computeSeasonAwards(save, minGp = MIN_GP) {
  const bank = ensureSeasonStats(save);
  const rows = Object.entries(bank)
    .map(([key, s]) => ({ key, s }))
    .filter(({ s }) => (s.gp || 0) >= minGp);
  if (!rows.length) return { awards: [], mvp: null };

  const byBest = (fn) => rows.reduce((best, r) => (best == null || fn(r.s) > fn(best.s) ? r : best), null);
  const awards = [];
  const push = (key, label, r, lineFn) => {
    if (!r) return;
    const mon = save?.mons?.[r.key];
    let line = "";
    try { line = typeof lineFn === "function" ? lineFn(r) : String(lineFn ?? ""); } catch {}
    awards.push({ key, label, dex: mon?.dex ?? null, name: monName(save, r.key), line });
  };

  push("mvp", "MVP", byBest((s) => gameScore(s) / s.gp), (r) => `${(gameScore(r.s) / r.s.gp).toFixed(1)} 效率`);
  push("scoring", "得分王", byBest((s) => per(s, "pts")), (r) => `${per(r.s, "pts").toFixed(1)} 分/场`);

  // 最佳防守：抢断×2 + 盖帽×2 + 篮板×0.5（原版权重）
  push("dpoy", "最佳防守", byBest((s) => per(s, "stl") * 2 + per(s, "blk") * 2 + per(s, "reb") * 0.5),
    (r) => `${per(r.s, "stl").toFixed(1)} 断 · ${per(r.s, "blk").toFixed(1)} 帽`);

  // 最佳第六人：替补出场（首发场次不超过一半）
  const bench = rows.filter(({ s }) => (s.gs || 0) <= (s.gp || 0) / 2);
  push("smoy", "最佳第六人", bench.length ? bench.reduce((b, r) => (b == null || gameScore(r.s) / r.s.gp > gameScore(b.s) / b.s.gp ? r : b), null) : null,
    (r) => `${per(r.s, "pts").toFixed(1)} 分/场（替补）`);

  // 最快进步：本地区 OVR 增长最多（以 ensureOvrBase 记录的基线为准）
  const base = save?.journey?.season?.ovrBase || {};
  const growth = rows.map(({ key, s }) => {
    const mon = save?.mons?.[key];
    const now = mon ? mainOVR(mon) : 0;
    return { key, s, gain: base[key] == null ? 0 : Math.max(0, now - base[key]) };
  });
  const mip = growth.reduce((b, r) => (b == null || r.gain > b.gain ? r : b), null);
  push("mip", "最快进步", mip && mip.gain > 0 ? mip : null, (r) => `综合 +${r.gain}`);

  return { awards, mvp: awards.find((a) => a.key === "mvp") || null };
}
