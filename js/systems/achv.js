/**
 * systems/achv.js —— 成就判定引擎（pokedunk-v2，移植自旧 achievements.js）
 * 存档：pokedunk.achv.v1（{成就id: 解锁时间戳}）。
 * 判定源：v2 生涯存档（stats/journey/mons/dex）+ 启动全量评估；比赛类成就由 settle 结算后调 evaluateMatch。
 */
const KEY = "pokedunk.achv.v1";
const SAVE_KEY = "pokedunk.save.v1";
/** 只靠历史记录、不随当前存档状态回退的成就 */
const KEEP_IDS = new Set(["w1", "close5", "blow20", "rich1k"]);

function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function persist(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} }
function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { return null; } }

let achv = load();

function badgeCount(save) {
  return (save?.journey?.gymBadges || []).filter((b) => b !== "champion").length;
}
function hasChampion(save) {
  const j = save?.journey || {};
  return !!j.gymBadges?.includes("champion")
    || !!j.season?.champion
    || (j.season?.history || []).some((h) => h.champion)
    || (typeof j.season?.no === "number" && j.season.no > 1)
    || j.stage === "tour";
}

/** 成就是否仍与当前存档匹配（防止换档/回档后沿用旧成就） */
function isStillValid(id, save) {
  switch (id) {
    case "stage1": return badgeCount(save) >= 1 || hasChampion(save);
    case "badges4": return badgeCount(save) >= 4 || hasChampion(save);
    case "badges8": return badgeCount(save) >= 8 || hasChampion(save);
    case "champion": return hasChampion(save);
    case "tour1": return hasChampion(save);
    case "evo1": return evolvedCount(save) >= 1;
    case "evo5": return evolvedCount(save) >= 5;
    case "vet16": return maxLevel(save) >= 16;
    case "coll10": return Object.keys(save?.dex || {}).length >= 10;
    case "coll30": return Object.keys(save?.dex || {}).length >= 30;
    case "w10": return (save?.stats?.w || 0) >= 10;
    case "sign1": return !!save?.flags?.sign1;
    default: return true;
  }
}

/** 首次运行/换档时清理过期解锁；徽章类每次同步都校验（赛季重置后靠冠军历史保留） */
function syncStore(save) {
  if (!save) return;
  const sid = String(save.createdAt || "");
  let changed = false;
  if (sid && achv.__saveId && achv.__saveId !== sid) {
    achv = {};
    changed = true;
  }
  for (const id of Object.keys(achv)) {
    if (id === "__saveId" || KEEP_IDS.has(id)) continue;
    if (!isStillValid(id, save)) { delete achv[id]; changed = true; }
  }
  if (sid && achv.__saveId !== sid) { achv.__saveId = sid; changed = true; }
  if (changed) persist(achv);
}

/** 解锁（重复调用幂等）；返回是否首次解锁 */
function unlock(id, def) {
  if (achv[id]) return false;
  achv[id] = Date.now();
  persist(achv);
  toast(`成就解锁：${def.name}`);
  return true;
}

function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 60px);transform:translateX(-50%);z-index:960;background:#1e3a6e;border:2px solid #f5c542;color:#f5c542;font:700 13px var(--sport, sans-serif);padding:10px 18px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.5)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* —— 生涯类成就（v2 存档字段） —— */
const defs = [
  { id: "stage1",  name: "初出茅庐", desc: "击败道馆馆主，拿下第一枚徽章", check: (s) => s.journey.gymBadges.length >= 1 },
  { id: "badges4", name: "四方来朝", desc: "集齐 4 枚道馆徽章",            check: (s) => s.journey.gymBadges.length >= 4 },
  { id: "badges8", name: "八方来朝", desc: "集齐 8 枚道馆徽章",            check: (s) => s.journey.gymBadges.length >= 8 },
  { id: "champion", name: "联盟之王", desc: "通关四天王，赢得冠军",        check: (s) => s.journey.gymBadges.includes("champion") },
  { id: "tour1",   name: "巡回骑士", desc: "进入巡回赛，踏上无尽挑战",      check: (s) => s.journey.stage === "tour" || s.journey.gymBadges.includes("champion") },
  { id: "evo1",    name: "进化之光", desc: "拥有一只进化后的精灵",          check: (s) => evolvedCount(s) >= 1 },
  { id: "evo5",    name: "养成大师", desc: "进化精灵达到 5 只",            check: (s) => evolvedCount(s) >= 5 },
  { id: "vet16",   name: "身经百战", desc: "任一精灵等级达到 16 级",        check: (s) => maxLevel(s) >= 16 },
  { id: "coll10",  name: "结缘十只", desc: "与 10 种精灵结缘（图鉴点亮）",  check: (s) => Object.keys(s.dex).length >= 10 },
  { id: "coll30",  name: "结缘三十", desc: "与 30 种精灵结缘",             check: (s) => Object.keys(s.dex).length >= 30 },
  { id: "rich1k",  name: "小康教练", desc: "持有 1000 篮球币",             check: (s) => s.coins >= 1000 },
  { id: "w10",     name: "十胜教头", desc: "生涯取得 10 场胜利",           check: (s) => s.stats.w >= 10 },
  { id: "sign1",   name: "签约达人", desc: "首次通过战胜签约收服精灵",      check: (s) => !!s.flags?.sign1 },
];

function evolvedCount(s) {
  // 进化判定：当前 dex 与 createSave 初始不同——用"该 dex 存在进化前形态"近似（EVOLUTIONS 值域包含其 dex）
  let n = 0;
  for (const m of Object.values(s.mons)) {
    const evo = EVOLUTIONS[m.dex];
    if (evo) n++; // 该 dex 是某个进化的目标 → 是进化形态
  }
  return n;
}
function maxLevel(s) {
  let n = 0;
  for (const m of Object.values(s.mons)) if ((m.level || 0) > n) n = m.level;
  return n;
}

/* —— 比赛类成就（settle 结算后传入单场统计） —— */
const matchDefs = [
  { id: "w1",     name: "开门红",   desc: "赢下第一场比赛",         check: (d) => d.won },
  { id: "close5", name: "关键先生", desc: "以 ≤5 分分差赢下比赛",   check: (d) => d.won && d.margin > 0 && d.margin <= 5 },
  { id: "blow20", name: "碾压全场", desc: "以 ≥20 分分差赢下比赛",  check: (d) => d.won && d.margin >= 20 },
];

function evaluateAll(save) {
  syncStore(save);
  for (const def of defs) {
    try { if (def.check(save)) unlock(def.id, def); } catch {}
  }
}

function evaluateMatch(save, result) {
  for (const def of matchDefs) {
    try { if (def.check(result)) unlock(def.id, def); } catch {}
  }
  evaluateAll(save);
}

import { EVOLUTIONS } from "../../engine/data/evolutions.js";

export const ACHV = {
  list: (save) => {
    syncStore(save || readSave());
    return defs.concat(matchDefs).map((def) => ({
      id: def.id, name: def.name, desc: def.desc,
      unlocked: !!achv[def.id], at: achv[def.id] || null,
    }));
  },
  refresh: evaluateAll,
  evaluateMatch,
};
