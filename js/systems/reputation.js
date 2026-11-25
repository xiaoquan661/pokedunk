/**
 * systems/reputation.js —— 教练声望（局外账号层成长）
 *
 * 第一刀只做“连接”：
 *   - 打比赛 / 每日挑战 / 野球场 → 声望
 *   - 今日任务把三种模式串成一张清单
 *   - 看广告每日可领一次 +100 声望
 * 声望升级只发教练称号（外观/档案展示），不发金币、树果或道具，避免重复奖励通胀。
 */
const MAX_LEVEL = 30;
const REP_KEY = "rep";

/** 每级所需声望：Lv.1→2 为 80，之后每级 +40 */
export function repNeed(level) {
  return 80 + 40 * (Math.max(1, level) - 1);
}

/** 等级奖励：达到即自动发放，仅称号，不产资源 */
export const REP_LEVEL_REWARDS = {
  2: { title: "初出茅庐" },
  3: { title: "场边新秀" },
  4: { title: "战术学徒" },
  5: { title: "青训教练" },
  7: { title: "临场指挥" },
  10: { title: "铁血教头" },
  12: { title: "冠军教头" },
  15: { title: "名帅" },
  18: { title: "传奇教头" },
  20: { title: "殿堂教练" },
  25: { title: "一代宗师" },
  30: { title: "口袋灌篮大师" },
};

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ensureRep(save) {
  save.coach ||= {};
  save[REP_KEY] ||= {};
  const r = save[REP_KEY];
  r.level = Math.max(1, Math.min(MAX_LEVEL, Number(r.level) || 1));
  r.exp = Math.max(0, Number(r.exp) || 0);
  r.total = Math.max(0, Number(r.total) || 0);
  // 老档补称号：按当前等级取已解锁的最高称号，不补发旧资源
  if (!save.coach.title) {
    const unlocked = Object.keys(REP_LEVEL_REWARDS).map(Number).filter((lv) => lv <= r.level).sort((a, b) => b - a);
    if (unlocked.length) save.coach.title = REP_LEVEL_REWARDS[unlocked[0]].title;
  }
  const today = todayKey();
  if (!r.today || r.today.date !== today) {
    r.today = { date: today, match: 0, daily: 0, wild: 0, adUsed: 0, claimed: {} };
  }
  r.today.claimed ||= {};
  return r;
}

export function repInfo(save) {
  const r = ensureRep(save);
  const need = repNeed(r.level);
  return {
    level: r.level,
    maxLevel: r.level >= MAX_LEVEL,
    exp: r.level >= MAX_LEVEL ? need : Math.min(r.exp, need),
    need,
    total: r.total,
    pct: r.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((r.exp / need) * 100)),
  };
}

function levelRewardText(rw) {
  if (!rw) return "";
  return rw.title ? `称号「${rw.title}」` : "";
}
export { levelRewardText };

function grantLevelReward(save, level) {
  const rw = REP_LEVEL_REWARDS[level];
  if (!rw) return null;
  if (rw.title) {
    save.coach ||= {};
    save.coach.title = rw.title;
  }
  return { ...rw, text: levelRewardText(rw) };
}

/**
 * 增加声望。调用方负责 writeSave。
 * @returns { gain, level, exp, need, levelUps:[{level,reward}], maxLevel }
 */
export function addRep(save, amount, source = "") {
  const r = ensureRep(save);
  const gain = Math.max(0, Math.round(Number(amount) || 0));
  if (!gain) return { gain: 0, level: r.level, exp: r.exp, need: repNeed(r.level), levelUps: [], maxLevel: r.level >= MAX_LEVEL, source };
  r.exp += gain;
  r.total += gain;
  const levelUps = [];
  while (r.level < MAX_LEVEL && r.exp >= repNeed(r.level)) {
    r.exp -= repNeed(r.level);
    r.level += 1;
    const reward = grantLevelReward(save, r.level);
    levelUps.push({ level: r.level, reward });
  }
  if (r.level >= MAX_LEVEL) r.exp = Math.min(r.exp, repNeed(r.level) - 1);
  return { gain, level: r.level, exp: r.exp, need: repNeed(r.level), levelUps, maxLevel: r.level >= MAX_LEVEL, source };
}

/** 今日任务：三种模式各一次，领取时加声望 */
export const REP_MISSIONS = [
  { id: "match", name: "完成 1 场比赛", goal: 1, rep: 20 },
  { id: "daily", name: "完成 1 次每日挑战", goal: 1, rep: 20 },
  { id: "wild", name: "野球场赢 1 场", goal: 1, rep: 20 },
];

export function bumpRepMission(save, key, n = 1) {
  const r = ensureRep(save);
  if (key in r.today) r.today[key] = Math.max(0, Number(r.today[key]) || 0) + n;
  return r.today;
}

export function repMissionRows(save) {
  const r = ensureRep(save);
  return REP_MISSIONS.map((m) => {
    const have = Math.min(m.goal, Number(r.today[m.id]) || 0);
    const claimed = !!r.today.claimed[m.id];
    return { ...m, have, claimed, canClaim: have >= m.goal && !claimed };
  });
}

export function claimRepMission(save, id) {
  const r = ensureRep(save);
  const m = REP_MISSIONS.find((x) => x.id === id);
  if (!m) return { ok: false, error: "未知任务" };
  if (r.today.claimed[id]) return { ok: false, error: "今日已领取" };
  if ((Number(r.today[id]) || 0) < m.goal) return { ok: false, error: "任务还未完成" };
  r.today.claimed[id] = true;
  const result = addRep(save, m.rep, "mission");
  return { ok: true, rep: m.rep, ...result };
}

/** 广告应援：每天 1 次 +100 声望 */
export function claimRepAd(save) {
  const r = ensureRep(save);
  if (r.today.adUsed) return { ok: false, error: "今日应援次数已用完" };
  r.today.adUsed = 1;
  const result = addRep(save, 100, "ad");
  return { ok: true, rep: 100, ...result };
}

export function repAdLeft(save) {
  const r = ensureRep(save);
  return r.today.adUsed ? 0 : 1;
}

export const REP_SOURCES = [
  ["比赛", "胜利 +20 / 失败 +8", "四天王额外 +15，季后赛 +10"],
  ["每日挑战", "胜利 +18 / 失败 +8", "不计模拟"],
  ["野球场 1v1", "胜利 +15 / 失败 +6", "赢球同时推进今日任务"],
  ["今日任务", "每项 +20", "比赛 / 每日挑战 / 野球各 1 项"],
  ["广告应援", "每日 +100", "每天 1 次"],
  ["升级称号", "自动解锁", "只改教练档案展示，不发资源"],
];
