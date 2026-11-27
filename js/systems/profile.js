/**
 * systems/profile.js —— 玩家昵称（2026-11-25 · S52）
 * 首次进入游戏自动生成一个随机昵称，与初始精灵一起确定。
 * 昵称只用于教练档案/排行榜展示，不替代教练名（coach.name）。
 * 存档位置：save.coach.nick
 */
const PREFIX = ["街头", "闪电", "篮板", "三分", "火锅", "快攻", "王牌", "传奇", "疾风", "铁壁", "灌篮", "妙传", "空接", "抢断", "全场", "压哨"];
const SUFFIX = ["少年", "教练", "飞人", "队长", "新星", "王者", "高手", "后卫", "中锋", "训练家", "扣将", "控卫"];
const MAX_LEN = 10;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function randomNickname() {
  // 统一格式：形容词 + 名词 + 两位数字（10–99）
  const num = Math.floor(Math.random() * 90) + 10;
  return (pick(PREFIX) + pick(SUFFIX) + num).slice(0, MAX_LEN);
}

/** 确保昵称存在：昵称即教练名（开局与初始精灵一起确定）。旧档没有昵称时沿用教练名，不凭空改名。 */
export function ensureNickname(save) {
  save.coach ||= {};
  if (!save.coach.nick) {
    save.coach.nick = save.coach.name || randomNickname();
    return true;
  }
  // 新档：昵称与教练名保持一致（历史档若两者不同，以教练名为准显示）
  return false;
}

/** 重新随机昵称（返回新昵称） */
export function rerollNickname(save) {
  save.coach ||= {};
  let next = randomNickname();
  for (let i = 0; i < 4 && next === save.coach.name; i++) next = randomNickname();
  save.coach.nick = next;
  save.coach.name = next;
  return next;
}

export function nicknameOf(save, fallback = "训练师") {
  // 昵称就是教练名；nick 仅作旧档回退
  return String(save?.coach?.name || save?.coach?.nick || fallback).slice(0, MAX_LEN);
}
