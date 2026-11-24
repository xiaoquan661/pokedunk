/**
 * platform/leaderboard.js —— Lamps 排行榜接入
 *
 * 每日挑战使用「当天一张榜」：gameRankType = daily-YYYY-MM-DD。
 * 平台只保留每位玩家在该榜上的历史最高分；每天换日后自动换榜。
 * 本地预览没有 LampsSDK 时返回 supported:false，不伪造榜单。
 */

const RANK_PREFIX = "daily-";

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dailyRankType(dateKey = todayKey()) {
  return RANK_PREFIX + dateKey;
}

export function leaderboardSupported() {
  if (typeof window === "undefined") return false;
  if (window.__PJ_FORCE_LEADERBOARD__) return true;
  try {
    return /LampsSDK/i.test(String(navigator.userAgent || ""));
  } catch {
    return false;
  }
}

/** 上报今日挑战分；只保留整数，0 分不上榜 */
export async function submitDailyScore(score, dateKey = todayKey()) {
  if (!leaderboardSupported()) {
    return { ok: false, supported: false, message: "排行榜暂不可用", data: null };
  }
  const api = window.LampsPlatform;
  if (!api || typeof api.submitLeaderboardScore !== "function") {
    return { ok: false, supported: false, message: "排行榜暂不可用", data: null };
  }
  const n = Math.round(Number(score));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, supported: true, message: "本场没有可上报的分数", data: null };
  }
  try {
    return await api.submitLeaderboardScore(n, dailyRankType(dateKey), { date: dateKey });
  } catch (err) {
    return { ok: false, supported: true, message: err?.message || "排行榜上报失败", data: null };
  }
}

/** 读取今日榜单、我的最佳排名和总人数 */
export async function fetchDailyLeaderboard(dateKey = todayKey()) {
  const type = dailyRankType(dateKey);
  if (!leaderboardSupported()) {
    return { supported: false, list: [], record: null, total: 0, message: "排行榜暂不可用" };
  }
  const api = window.LampsPlatform;
  if (!api) {
    return { supported: false, list: [], record: null, total: 0, message: "排行榜暂不可用" };
  }
  try {
    const [board, mine, info] = await Promise.all([
      typeof api.getLeaderboard === "function" ? api.getLeaderboard(type) : null,
      typeof api.getMyLeaderboardRecord === "function" ? api.getMyLeaderboardRecord(type) : null,
      typeof api.getLeaderboardInfo === "function" ? api.getLeaderboardInfo(type) : null,
    ]);
    return {
      supported: true,
      list: board?.data?.list || [],
      record: mine?.data?.record || null,
      total: Number(info?.data?.totalCount) || 0,
      message: board && board.ok === false ? (board.message || "读取榜单失败") : "",
    };
  } catch (err) {
    return {
      supported: true,
      list: [],
      record: null,
      total: 0,
      message: err?.message || "读取榜单失败",
    };
  }
}
