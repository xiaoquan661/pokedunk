/**
 * 存档系统（GDD S8 · pokedunk-v2）
 * ============================================
 * 单键自动持久：localStorage 仅 `pokedunk.save.v1` 一个游戏存档键（+设置类小键另行管理）。
 * 结构 = 训练师档案（GDD S1/S3~S7/S8 字段全集）：
 *   version      存档版本号（迁移用）
 *   createdAt    建档时间戳
 *   coach        训练师信息 { name }
 *   coins        篮球币（S1，整数，无负数无上限）
 *   team         队伍：首发+替补，≤10 个个体 id（S6）
 *   box          仓库：个体 id 数组，无上限（S6）
 *   mons         全部个体字典：id → { dex, level, xp, bonus, pos }（S6；个体=同种唯一载体）
 *   dex          图鉴：dexNo → 首次结缘时间戳（S7，两态：无记录=剪影）
 *   bag          背包：{ berryNormal, berryPremium, ... }（S4 树果留存）
 *   shop         每日商店：{ date, slots, soldFlags }（S2，懒刷新）
 *   eggs         孵蛋：{ unlockedSlots, slots: [{ eggTier, startTs, dex }] }（S3）
 *   journey      旅程进度：{ stage, difficulty, gymBadges[], season, … }（S8，字段随赛程实施细化）
 *   stats        战绩：{ w, l }（失败计入战绩）
 *
 * 个体规则（S5/S6）：
 *   - 同种唯一：全档案（team+box）不允许两只同 dex——入队函数统一校验（本文件提供 assertUniqueDex 辅助）
 *   - 调动无代价：team ⇄ box 自由移动，约束=队伍 ≤10 且 ≥5（比赛资格）
 *   - 仓库可吃树果不可比赛
 *
 * API：
 *   loadSave()          → 读档（无档/损坏返回 null，由调用方走"新建档"流程）
 *   createSave(opts)    → 生成全新默认档（选择初始伙伴后调用，见 startJourney）
 *   writeSave(save)     → 写档（自动 + 保留上次快照 pokejam.save.bak 供恢复）
 *   startJourney(save, starterDex, coachName, starterPos)  → 五位置选伙伴落库
 *   addMon(save, dex, opts)     → 统一入队函数（S5 三通道共用：同种唯一校验→队空入队/满入仓→图鉴点亮）
 *   moveMon(save, id, to)       → 调动（team⇄box，校验边界）
 *   resetSave()                 → 重开（覆盖确认由 UI 负责，这里只管清键）
 */
import { getPokemon } from "../engine/data/pokemon.js";
import { EVOLUTIONS } from "../engine/data/evolutions.js";
import { rollGrowth } from "../engine/growth.js?v=682";
import { ensureSeason } from "./journey/season.js?v=682";
import { ensureMainline } from "./journey/regions.js?v=682";
import { ensureBadgeUnlocks } from "./systems/badge-unlocks.js?v=682";
import { ensureMonBuild, ensureLineupSlots } from "./systems/build.js?v=682";
import { minAcquireLevel } from "./systems/acquire.js?v=682";
import { ensureNickname } from "./systems/profile.js?v=682";

export const SAVE_KEY = "pokedunk.save.v1";
export const BACKUP_KEY = "pokedunk.save.bak";
export const SAVE_VERSION = 1;

/** 存档校验（结构级）——损坏/陌生结构返回 false，调用方按无档处理 */
export function validateSave(s) {
  return (
    !!s &&
    typeof s === "object" &&
    s.version === SAVE_VERSION &&
    Number.isInteger(s.coins) &&
    s.coins >= 0 &&
    Array.isArray(s.team) &&
    Array.isArray(s.box) &&
    s.team.length <= 10 &&
    !!s.mons &&
    typeof s.mons === "object" &&
    !!s.dex &&
    !!s.bag &&
    !!s.journey &&
    !!s.stats
  );
}

/** 读档：无档/损坏 → null */
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!validateSave(s)) return null;
    // 归一化：压缩蛋槽空洞（历史 bug 可能把蛋写进 unlockedSlots 之外的索引，孵蛋页看不到）
    if (s.eggs && Array.isArray(s.eggs.slots)) s.eggs.slots = s.eggs.slots.filter(Boolean);
    if (s.eggs) s.eggs.stock ||= [];
    // 旧档迁移：补主线结构 / 首发实际位置
    s.assign ||= {};
    s.bag.items ||= {};
    for (const m of Object.values(s.mons || {})) { try { ensureMonBuild(m); } catch {} }
    try { ensureLineupSlots(s); } catch {}
    try { ensureSeason(s); } catch {}
    // 主线地区 / 等级上限 / 徽章永久设施
    try { ensureMainline(s); } catch {}
    try { ensureBadgeUnlocks(s); } catch {}
    // 老档迁移：补「新手之路」状态（老档没有 newbie 字段，顶部入口和缺人引导都不会出现）
    try { ensureNewbieBackfill(s); } catch {}
    // 旧版把「新手之路」期间的单条提示当成整段界面导引完成，通关后不再出现首次主页导引
    try { ensureHomeGuideV2(s); } catch {}
    // 图鉴「遇见」记录：已拥有的精灵至少算遇见过
    try { ensureSeen(s); } catch {}
    // 新手之路状态自愈：已标记完成但教程/补给标记缺失时补齐标记（旧版中途退教程会留下这种卡死状态）
    try { ensureNewbieFlags(s); } catch {}
    // 昵称：首次进入游戏自动生成
    try { if (ensureNickname(s)) writeSave(s); } catch {}
    return s;
  } catch {
    return null;
  }
}

/**
 * 老档补新手之路（一次性迁移）：
 * - 首发已满 5 人：直接标记完成，不打扰老玩家
 * - 首发不足 5 人：跳过操作教程（老玩家不需要重学），补上皮卡丘/伊布，再按剩余缺口走商店
 */
function ensureNewbieBackfill(s) {
  if (s.newbie) return;
  const starters = () => s.team.slice(0, 5).filter((id) => s.mons[id] && !s.benched?.[id]);
  if (starters().length >= 5) {
    s.newbie = { v: 1, tutorialDone: true, giftDone: true, shopBuys: 2, shopPrompted: true, done: true };
    return;
  }
  s.newbie = { v: 1, tutorialDone: true, giftDone: true, shopBuys: 0, shopPrompted: true, done: false };
  for (const dex of [25, 133]) {
    if (hasDex(s, dex)) continue;
    addMon(s, dex, { from: "tutorial" });
  }
  try { ensureLineupSlots(s); } catch {}
  if (starters().length >= 5) {
    s.newbie.shopBuys = 2;
  } else if (s.coins < 300) {
    // 保证还差人时能买得起两只（老档可能只剩几十币）
    s.coins = 300;
  }
  writeSave(s);
}

/**
 * 一次性修复界面导引：
 * 旧流程在新手之路中会显示一条「新手之路」说明，点「知道了」就把 guide.done 置为 true，
 * 导致走完新手之路后第一次进入主页时，完整的界面导引不再出现。
 * 对已通关但导引被提前消费的档，重置回第 0 步，让玩家补看一次。
 */
function ensureHomeGuideV2(s) {
  if (s.guideV2) return;
  s.guideV2 = 1;
  if (s.newbie?.done && s.guide?.done) s.guide = { v: 1, step: 0, done: false };
  writeSave(s);
}

/**
 * 新手之路标记自愈（S51）：
 * 已 done 的档如果 tutorialDone/giftDone 为 false，补成 true，避免「新手之路」入口/进度判断出现「已完成但教程未完成」的卡死状态。
 * 只补标记，不重复发资源。
 */
function ensureNewbieFlags(s) {
  const nb = s?.newbie;
  if (!nb || !nb.done) return;
  if (!nb.tutorialDone || !nb.giftDone) {
    nb.tutorialDone = true;
    nb.giftDone = true;
    writeSave(s);
  }
}

/** 图鉴遇见记录：own dex 与已拥有个体都算遇见过 */
function ensureSeen(s) {
  s.seen ||= {};
  for (const k of Object.keys(s.dex || {})) s.seen[k] ||= s.dex[k];
  for (const m of Object.values(s.mons || {})) if (m?.dex) s.seen[m.dex] ||= Date.now();
}

/** 记录在赛场上遇见的精灵（不改变结缘/拥有状态） */
export function markSeen(save, dexes) {
  if (!save) return false;
  save.seen ||= {};
  let added = false;
  for (const dex of dexes || []) {
    if (!dex || save.seen[dex]) continue;
    save.seen[dex] = Date.now();
    added = true;
  }
  return added;
}

/** 写档：当前档滚入备份键，再写新值。全部异常吞掉（localStorage 满/禁用时不崩游戏） */
export function writeSave(save) {
  try {
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev) localStorage.setItem(BACKUP_KEY, prev);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** 重开：清主键+备份键。UI 必须先做覆盖确认 */
export function resetSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {}
}

/** 新个体 id 生成器：自增计数存档内（nextMonId），永不复用 */
function nextMonId(save) {
  save._nextMonId = (save._nextMonId ?? 0) + 1;
  return save._nextMonId;
}

/** 全档案同种唯一校验（S5/S6 铁律）：该 dex 已存在于 team/box → true */
export function hasDex(save, dex) {
  return Object.values(save.mons).some((m) => m.dex === dex);
}

/** assert 版：返回错误文案（null=通过），供 UI 提示 */
export function uniqueDexError(save, dex) {
  return hasDex(save, dex) ? "已经与这只精灵结缘了（同种唯一）" : null;
}

/**
 * 统一入队函数（S5 三通道共用落库）：
 *   同种唯一校验 → 队空(<10)入队 : 入仓库 → 图鉴点亮 → 返回 { id, isNewDex, movedTo }
 * opts: { level=1, xp=0, bonus={}, from="shop"|"egg"|"sign"|"starter" }
 */
export function addMon(save, dex, opts = {}) {
  const err = uniqueDexError(save, dex);
  if (err) return { ok: false, error: err };

  const base = getPokemon(dex);
  const id = nextMonId(save);
  // 直接获得进化后形态时，等级不能低于该形态的进化门槛
  const level = Math.max(1, opts.level ?? 1, minAcquireLevel(dex) || 1);
  save.mons[id] = {
    dex,
    level,
    xp: opts.xp ?? 0,
    bonus: opts.bonus ?? {},
    pos: base.pos, // 推荐位置（进化时更新）
    train: { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 },
    item: { points: 0, stats: {}, used: {} },
  };
  // 补发从 Lv1 到到手等级的随机成长与自由训练点，
  // 否则直接获得的进化形态会“等级高但属性没长”。
  const mon = save.mons[id];
  for (let lv = 1; lv < level; lv++) {
    rollGrowth({ dex, bonus: mon.bonus }, Math.random);
    mon.train.free += 1;
    mon.train.freeEarned += 1;
  }

  const movedTo = save.team.length < 10 ? (save.team.push(id), "team") : (save.box.push(id), "box");

  // 图鉴点亮（S7）：入队/入仓瞬间，记录首次结缘时间
  const isNewDex = !save.dex[dex];
  if (isNewDex) save.dex[dex] = Date.now();

  return { ok: true, id, isNewDex, movedTo };
}

/**
 * 调动（S6）：team ⇄ box 自由移动，无代价。
 * to: "team" | "box"。约束：队伍 ≤10（进队时）；比赛资格由比赛层校验（≥5）。
 */
export function moveMon(save, id, to) {
  const inTeam = save.team.indexOf(id);
  const inBox = save.box.indexOf(id);
  if (inTeam < 0 && inBox < 0) return { ok: false, error: "找不到这只精灵" };

  if (to === "team") {
    if (inTeam >= 0) return { ok: true }; // 已在队伍
    if (save.team.length >= 10) return { ok: false, error: "队伍已满（10 人）" };
    save.box.splice(inBox, 1);
    save.team.push(id);
    return { ok: true };
  }
  if (to === "box") {
    if (inBox >= 0) return { ok: true }; // 已在仓库
    if (save.team.length <= 5) return { ok: false, error: "队伍至少要保留 5 人（比赛资格）" };
    save.team.splice(inTeam, 1);
    save.box.push(id);
    return { ok: true };
  }
  return { ok: false, error: "未知调动目标" };
}

/** 开局五位置选伙伴：Lv1 零 bonus，按所选位置落库+建档元信息 */
export function startJourney(save, starterDex, coachName = "小智", starterPos = "") {
  const base = getPokemon(starterDex);
  if (!base?.name) return { ok: false, error: "未知的初始伙伴" };
  const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
  const pos = POSITIONS.includes(starterPos) ? starterPos : base.pos;
  const r = addMon(save, starterDex, { level: 1, bonus: {}, from: "starter" });
  if (!r.ok) return r;
  const mon = save.mons[r.id];
  mon.pos = pos; // 开局伙伴按所选位置培养，避免越位惩罚
  save.assign ||= {};
  save.assign[r.id] = pos;
  save.coach = { name: coachName };
  save.journey.startedAt = Date.now();
  save.journey.starterDex = starterDex;
  save.journey.starterPos = pos;
  save.journey.stage = "gym1"; // 选完初始伙伴即进入第一道馆阶段
  // 新手之路：教程 → 固定送两只 → 商店买 2 只 → 拖进首发 → 第一场比赛
  save.newbie = { v: 1, tutorialDone: false, giftDone: false, shopBuys: 0, shopPrompted: false, done: false };
  return { ok: true, id: r.id };
}

/** 新建默认档（进入训练师之旅、尚未选御三家时的空档骨架） */
export function createSave() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    coach: { name: "" },
    _nextMonId: 0,
    coins: 0, // 数额待 S13 数值清单定（开局启动资金）
    team: [],
    box: [],
    mons: {},
    dex: {},
    bag: { berryNormal: 0, berryPremium: 0, items: {} },
    shop: { date: "", slots: [], soldFlags: {} },
    eggs: { unlockedSlots: 1, slots: [], stock: [] },
    journey: {
      stage: "starter", // starter=未选初始伙伴 → gym（由 season 同步）
      difficulty: "",
      gymBadges: [],
      season: {
        v: 4, no: 1, phase: "regular", badges: [], results: [],
        fourKings: { unlocked: false, attempts: 0, cleared: false, rewardClaimed: false, rewardGiven: false },
        contracts: 0, contractWins: 0, contractDry: 0,
        champion: false, playerStats: {}, ovrBase: {}, awards: [], mvp: null, history: [],
      },
      seasonNo: 1,
      regionNo: 1,
      capV: 1,
      capExempt: false,
      legacyCap: 0,
      mainQuest: { seen: {}, claimed: {} },
      unlocks: {},
      startedAt: 0,
      starterDex: 0,
      starterPos: "",
    },
    assign: {}, // 个体 id → 实际位置（构筑系统；缺省=推荐位置）
    stats: { w: 0, l: 0 },
  };
}

/** 进化联动（S7）：成长流程调用——old dex → new dex，自动写入图鉴（bonus 保留、等级不变由成长层处理） */
export function recordEvolution(save, monId, newDex) {
  const mon = save.mons[monId];
  if (!mon) return { ok: false, error: "找不到个体" };
  if (!EVOLUTIONS[mon.dex] || !EVOLUTIONS[mon.dex].to.includes(newDex)) {
    return { ok: false, error: "非法进化路径" };
  }
  const oldDex = mon.dex;
  mon.dex = newDex;
  mon.pos = getPokemon(newDex).pos; // 进化换位置
  if (!save.dex[newDex]) save.dex[newDex] = Date.now();
  return { ok: true, oldDex, newDex };
}




