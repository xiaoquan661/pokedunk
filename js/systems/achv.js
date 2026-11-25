/**
 * systems/achv.js —— 成就判定引擎（pokedunk-v2，移植自旧 achievements.js）
 * 存档：pokedunk.achv.v1（{成就id: 解锁时间戳}）。
 * 判定源：v2 生涯存档（stats/journey/mons/dex）+ 启动全量评估；比赛类成就由 settle 结算后调 evaluateMatch。
 */
import { getPokemon } from "../../engine/readable/play-core.js?v=589";
import { writeSave } from "../storage.js?v=589";
import { rollEggDex } from "./shop.js?v=589";

const KEY = "pokedunk.achv.v1";
const SAVE_KEY = "pokedunk.save.v1";
/** 只靠历史记录、不随当前存档状态回退的成就 */
const KEEP_IDS = new Set(["w1", "close5", "blow20", "rich1k", "score100", "score120"]);

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
    || j.stage === "tour";
}

/** 成就是否仍与当前存档匹配（防止换档/回档后沿用旧成就） */
function isStillValid(id, save) {
  switch (id) {
    case "stage1": return badgeCount(save) >= 1 || hasChampion(save);
    case "badges2": return badgeCount(save) >= 2 || hasChampion(save);
    case "badges4": return badgeCount(save) >= 4 || hasChampion(save);
    case "badges8": return badgeCount(save) >= 8 || hasChampion(save);
    case "champion": return hasChampion(save);
    case "tour1": return hasChampion(save);
    case "evo1": return evolvedCount(save) >= 1;
    case "evo5": return evolvedCount(save) >= 5;
    case "evo10": return evolvedCount(save) >= 10;
    case "vet16": return maxLevel(save) >= 16;
    case "lv25": return maxLevel(save) >= 25;
    case "lv40": return maxLevel(save) >= 40;
    case "coll10": return Object.keys(save?.dex || {}).length >= 10;
    case "coll30": return Object.keys(save?.dex || {}).length >= 30;
    case "coll50": return Object.keys(save?.dex || {}).length >= 50;
    case "coll80": return Object.keys(save?.dex || {}).length >= 80;
    case "types18": return typeCoverage(save) >= 18;
    case "team10": return (save?.team || []).length >= 10;
    case "grass3": return (save?.grass?.slots || []).filter(Boolean).length >= 3;
    case "rich5k": return (save?.coins || 0) >= 5000;
    case "w10": return (save?.stats?.w || 0) >= 10;
    case "w30": return (save?.stats?.w || 0) >= 30;
    case "w50": return (save?.stats?.w || 0) >= 50;
    case "sign1": return !!save?.flags?.sign1;
    case "streak7": return (save?.signin?.streak || 0) >= 7;
    case "daily90": return (save?.daily?.history || []).some((d) => (d.best || 0) >= 90);
    case "daily120": return (save?.daily?.history || []).some((d) => (d.best || 0) >= 120);
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
    if (id === "__saveId" || id === "__claimed" || KEEP_IDS.has(id)) continue;
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
  const r = def.reward;
  const gain = r ? (r.coins ? ` · 可领取 +${r.coins} 币` : r.label ? ` · 可领取 ${r.label}` : "") : "";
  toast(`成就解锁：${def.name}${gain}`, 3000);
  return true;
}

/* —— 奖励领取（在成就面板手动领取，避免金币凭空出现） —— */
const REWARD_ITEMS = {
  berryPremium: "高级树果",
  hatch: "孵蛋加速券",
  power: "力量药剂",
  speed: "速度药剂",
  skill: "技巧药剂",
  guard: "防守药剂",
  board: "篮板药剂",
};

export function claimReward(id) {
  const def = defs.concat(matchDefs).find((d) => d.id === id);
  if (!def || !achv[id]) return { ok: false, error: "尚未解锁" };
  achv.__claimed ||= {};
  if (achv.__claimed[id]) return { ok: false, error: "奖励已领取" };
  const save = readSave();
  if (!save) return { ok: false, error: "找不到存档" };
  const r = def.reward || {};
  const parts = [];
  if (r.coins) { save.coins = (save.coins || 0) + r.coins; parts.push(`+${r.coins} 币`); }
  if (r.item) {
    save.bag ||= {};
    save.bag.items ||= {};
    save.bag.items[r.item] = (save.bag.items[r.item] || 0) + (r.n || 1);
    parts.push(`${REWARD_ITEMS[r.item] || "道具"} ×${r.n || 1}`);
  }
  if (r.egg) {
    save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
    save.eggs.stock ||= [];
    save.eggs.stock.push({ eggTier: r.egg, dex: rollEggDex(save, r.egg) });
    parts.push(r.egg === "premium" ? "高级精灵蛋 ×1" : "普通精灵蛋 ×1");
  }
  achv.__claimed[id] = Date.now();
  persist(achv);
  if (parts.length) writeSave(save);
  return { ok: true, text: parts.join(" · "), coins: r.coins || 0 };
}

let toastTimer = null;
/** 与全站提示一致：复用 #pk-toast，跟随当前外观主题 */
function toast(msg, ms = 3000) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/* —— 生涯类成就（v2 存档字段） —— */
const defs = [
  { id: "stage1",  name: "初出茅庐", desc: "击败道馆馆主，拿下第一枚徽章", check: (s) => s.journey.gymBadges.length >= 1, reward: { coins: 25 } },
  { id: "badges2", name: "初露锋芒", desc: "集齐 2 枚道馆徽章",            check: (s) => badgeCount(s) >= 2, reward: { coins: 40 } },
  { id: "badges4", name: "四方来朝", desc: "集齐 4 枚道馆徽章",            check: (s) => s.journey.gymBadges.length >= 4, reward: { coins: 75 } },
  { id: "badges8", name: "八方来朝", desc: "集齐 8 枚道馆徽章",            check: (s) => s.journey.gymBadges.length >= 8, reward: { coins: 125, item: "hatch" } },
  { id: "champion", name: "联盟之王", desc: "赢得赛季总冠军",              check: (s) => hasChampion(s), reward: { coins: 200, item: "hatch", n: 2 } },
  { id: "tour1",   name: "巡回骑士", desc: "进入巡回赛，踏上无尽挑战",      check: (s) => s.journey.stage === "tour" || s.journey.gymBadges.includes("champion"), reward: { coins: 75 } },
  { id: "evo1",    name: "进化之光", desc: "拥有一只进化后的精灵",          check: (s) => evolvedCount(s) >= 1, reward: { coins: 25 } },
  { id: "evo5",    name: "养成大师", desc: "进化精灵达到 5 只",            check: (s) => evolvedCount(s) >= 5, reward: { coins: 75, item: "berryPremium" } },
  { id: "evo10",   name: "进化研究所", desc: "进化精灵达到 10 只",          check: (s) => evolvedCount(s) >= 10, reward: { coins: 125 } },
  { id: "vet16",   name: "身经百战", desc: "任一精灵等级达到 16 级",        check: (s) => maxLevel(s) >= 16, reward: { coins: 40 } },
  { id: "lv25",    name: "精兵强将", desc: "任一精灵等级达到 25 级",        check: (s) => maxLevel(s) >= 25, reward: { coins: 60 } },
  { id: "lv40",    name: "王牌训练家", desc: "任一精灵等级达到 40 级",      check: (s) => maxLevel(s) >= 40, reward: { coins: 125 } },
  { id: "coll10",  name: "结缘十只", desc: "与 10 种精灵结缘（图鉴点亮）",  check: (s) => Object.keys(s.dex).length >= 10, reward: { coins: 25 } },
  { id: "coll30",  name: "结缘三十", desc: "与 30 种精灵结缘",             check: (s) => Object.keys(s.dex).length >= 30, reward: { coins: 60 } },
  { id: "coll50",  name: "图鉴收藏家", desc: "与 50 种精灵结缘",            check: (s) => Object.keys(s.dex).length >= 50, reward: { coins: 100, item: "berryPremium" } },
  { id: "coll80",  name: "图鉴大师", desc: "与 80 种精灵结缘",              check: (s) => Object.keys(s.dex).length >= 80, reward: { coins: 150 } },
  { id: "types18", name: "全属性制霸", desc: "图鉴覆盖全部 18 种属性",       check: (s) => typeCoverage(s) >= 18, reward: { coins: 200, item: "hatch", n: 2 } },
  { id: "team10",  name: "满编教练", desc: "队伍满员 10 人",               check: (s) => (s.team || []).length >= 10, reward: { coins: 50 } },
  { id: "grass3",  name: "牧场主", desc: "草地 3 个位置同时挂机",           check: (s) => (s.grass?.slots || []).filter(Boolean).length >= 3, reward: { coins: 50, item: "berryPremium" } },
  { id: "rich1k",  name: "小康教练", desc: "持有 1000 篮球币",             check: (s) => s.coins >= 1000, reward: { coins: 25 } },
  { id: "rich5k",  name: "财大气粗", desc: "持有 5000 篮球币",             check: (s) => s.coins >= 5000, reward: { coins: 75 } },
  { id: "w10",     name: "十胜教头", desc: "生涯取得 10 场胜利",           check: (s) => s.stats.w >= 10, reward: { coins: 40 } },
  { id: "w30",     name: "三十胜", desc: "生涯取得 30 场胜利",             check: (s) => s.stats.w >= 30, reward: { coins: 100 } },
  { id: "w50",     name: "五十胜", desc: "生涯取得 50 场胜利",             check: (s) => s.stats.w >= 50, reward: { coins: 150 } },
  { id: "sign1",   name: "签约达人", desc: "首次签下胜利后的精灵合同",      check: (s) => !!s.flags?.sign1, reward: { coins: 25, item: "hatch" } },
  { id: "streak7", name: "全勤一周", desc: "连续签到 7 天",                check: (s) => (s.signin?.streak || 0) >= 7, reward: { coins: 75, item: "berryPremium" } },
  { id: "daily90", name: "每日之星", desc: "每日挑战单日拿到 90 分",        check: (s) => (s.daily?.history || []).some((d) => (d.best || 0) >= 90), reward: { coins: 50 } },
  { id: "daily120", name: "挑战极限", desc: "每日挑战单日拿到 120 分",      check: (s) => (s.daily?.history || []).some((d) => (d.best || 0) >= 120), reward: { coins: 100, item: "hatch", n: 1 } },
];

/** 所有进化后的形态（作为其他形态的进化目标出现） */
const EVOLVED_DEXES = new Set(Object.values(EVOLUTIONS).flatMap((e) => e.to || []));

function evolvedCount(s) {
  // 只统计「进化后形态」；未进化的精灵即使自己还能再进化，也不算
  let n = 0;
  for (const m of Object.values(s?.mons || {})) {
    if (EVOLVED_DEXES.has(m.dex)) n++;
  }
  return n;
}
function maxLevel(s) {
  let n = 0;
  for (const m of Object.values(s.mons)) if ((m.level || 0) > n) n = m.level;
  return n;
}
/** 图鉴覆盖的属性数量（最多 18） */
function typeCoverage(s) {
  const set = new Set();
  for (const k of Object.keys(s?.dex || {})) {
    const mon = getPokemon(Number(k));
    for (const t of mon?.types || []) set.add(t);
  }
  return set.size;
}

/* —— 比赛类成就（settle 结算后传入单场统计） —— */
const matchDefs = [
  { id: "w1",     name: "开门红",   desc: "赢下第一场比赛",         check: (d) => d.won, reward: { coins: 25 } },
  { id: "close5", name: "关键先生", desc: "以 ≤5 分分差赢下比赛",   check: (d) => d.won && d.margin > 0 && d.margin <= 5, reward: { coins: 50 } },
  { id: "blow20", name: "碾压全场", desc: "以 ≥20 分分差赢下比赛",  check: (d) => d.won && d.margin >= 20, reward: { coins: 50 } },
  { id: "score100", name: "百分大战", desc: "单场得到 100 分",      check: (d) => (d.myScore || 0) >= 100, reward: { coins: 75 } },
  { id: "score120", name: "得分机器", desc: "单场得到 120 分",      check: (d) => (d.myScore || 0) >= 120, reward: { coins: 125, item: "berryPremium" } },
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
      claimed: !!achv.__claimed?.[def.id],
      reward: def.reward || null,
      rewardText: rewardText(def.reward),
    }));
  },
  refresh: evaluateAll,
  evaluateMatch,
  claim: claimReward,
};

/** 奖励文案（卡片展示用） */
function rewardText(r) {
  if (!r) return "";
  const parts = [];
  if (r.coins) parts.push(`+${r.coins} 币`);
  if (r.item) parts.push(`${REWARD_ITEMS[r.item] || "道具"} ×${r.n || 1}`);
  if (r.egg) parts.push(r.egg === "premium" ? "高级蛋 ×1" : "普通蛋 ×1");
  return parts.join(" · ");
}
