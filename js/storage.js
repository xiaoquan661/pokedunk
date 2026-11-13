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
import { ensureSeason } from "./journey/season.js?v=32";
import { ensureMonBuild, ensureLineupSlots } from "./systems/build.js?v=31";

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
    // 旧档迁移：补赛季结构 / 首发实际位置
    s.assign ||= {};
    s.bag.items ||= {};
    for (const m of Object.values(s.mons || {})) { try { ensureMonBuild(m); } catch {} }
    try { ensureLineupSlots(s); } catch {}
    try { ensureSeason(s); } catch {}
    return s;
  } catch {
    return null;
  }
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

/** 全档案同种唯一校验（S5/S6 铁律）：该 dex 已存在于 team/box → false */
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
  save.mons[id] = {
    dex,
    level: opts.level ?? 1,
    xp: opts.xp ?? 0,
    bonus: opts.bonus ?? {},
    pos: base.pos, // 推荐位置（进化时更新）
    train: { points: 0, stats: {}, bank: 0 },
    item: { points: 0, stats: {}, used: {} },
  };

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
      stage: "starter", // starter=未选初始伙伴 → gym1..8 → elite（旧字段，由 season 同步）
      difficulty: "",
      gymBadges: [],
      season: { no: 1, phase: "venue", venue: 0, small: 0, results: [], badges: [], champion: false, history: [] },
      seasonNo: 1,
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




