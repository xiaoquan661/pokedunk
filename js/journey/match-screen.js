/**
 * match-screen.js —— 比赛屏组装层（pokedunk-v2）
 * 复用引擎 startMatchLoop(wi)：自带比赛模板/记分板/触屏输入/暂停/解说/回放。
 * 我们只提供：比赛配置（赛季对手/我方阵容）、音频适配器（静音占位）、结算回调。
 *
 * 赛季结构（docs/09 v3.1）：9 队单循环 9 轮 + 季后赛 + 四天王，见 journey/season.js。
 *   - 常规赛：9 轮，每轮 4 场 + 1 队轮空；玩家 8 场 + 1 轮轮空
 *   - 季后赛：前 4，半决赛 1v4 / 2v3 → 总决赛
 *   - 四天王：8-0 解锁，独立 1 场，不参与总冠军
 *   - 四天王：联队，胜利后进入下一赛季（全馆 +2）
 */
import { calcOVR } from "../../engine/readable/play-core.js?v=32";
import { startMatchLoop, simulateFullMatch } from "../../engine/readable/play-core.js?v=32";
import { loadSet } from "../ui/settings.js?v=67";
import { STAT_KEYS } from "./gyms.js?v=19";
import { currentMatchInfo, matchSeed } from "./season.js?v=28";
import { buildMatchPlayer, bondMultipliers } from "../systems/build.js?v=22";
import { createMatchHype } from "../ui/match-hype.js?v=23";

/** 由存档构建我方阵容：只取队伍内实际精灵；不足 5 人按实际人数开赛
 *  mult：小决赛 3-0 常规赛的百分比加成（1.00/1.01/1.02/1.03） */
export function buildMyRoster(save, mult = 1) {
  // 只用队伍内实际精灵：不足 5 人按实际人数开赛，不从仓库/训练生补位
  const ids = save.team.filter((id) => save.mons[id]);
  const bonds = bondMultipliers(save); // 首发 5 人羁绊加成
  const roster = ids.map((id) => {
    const p = buildMatchPlayer(save, id, bonds);
    if (mult !== 1) {
      for (const k of STAT_KEYS) p.r[k] = Math.min(99, Math.round(p.r[k] * mult));
      p.ovr = calcOVR(p.pos, p.r);
    }
    return p;
  });
  return roster.slice(0, 5);
}

/** 难度随道馆序号递增：1-2 rookie、3-5 pro、6-8 allstar */
export function diffOfRound(i) {
  const n = Number(i) + 1;
  if (n <= 2) return "rookie";
  if (n <= 5) return "pro";
  return "allstar";
}

/** 组一场赛季比赛配置（节长/换人/防守偏好取自设置页） */
export function buildGymMatch(save, mode = "league") {
  const set = loadSet();
  const quarterLen = 180; // 固定每节 3 分钟（设置项已移除）
  const prefs = { autoSwitch: set.autoSwitch === true, userAutoSubs: set.autoSubs !== false, specialFx: set.specialFx !== false };
  const info = currentMatchInfo(save, mode);
  if (!info || info.kind === "bye" || info.kind === "done") return null;

  const gym = info.kind === "elite"
    ? { ...info.gym, elite: true, gym: 9 }
    : { ...info.gym, elite: false };
  const away = {
    name: gym.name, abbr: gym.abbr, color: gym.color, color2: gym.color2,
    roster: info.leaderRoster, bench: [], human: false, boost: 0,
  };
  const home = {
    name: (save.coach.name || "ME") + "队",
    abbr: (save.coach.name || "ME").slice(0, 3).toUpperCase(),
    color: "#3b6fd8",
    color2: "#16224a",
    roster: buildMyRoster(save, 1),
    bench: [],
    human: true,
    boost: 0,
  };

  const difficulty = info.kind === "elite"
    ? "legend"
    : info.kind === "playoff"
      ? (info.playoffRound === "final" ? "legend" : "allstar")
      : diffOfRound(info.venue);
  return { home, away, difficulty, quarterLen, ...prefs, seed: matchSeed(save, info), gym, mode, info, stamina: true };
}

/** 直接无头模拟当前比赛（赛季页「一键模拟」用），返回 { engine, cfg } */
export async function simulateCurrentMatch(save, mode = "league") {
  const cfg = buildGymMatch(save, mode);
  if (!cfg) return { engine: null, cfg: null };
  const simCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
  const engine = await simulateFullMatch(simCfg);
  return { engine, cfg };
}

/**
 * 挂载比赛屏到 root。
 * onFinal(engine, cfg, quit, simulated)
 */
export function mountMatch(root, cfg, audio, onFinal, opts = {}) {
  const spectator = !!opts.spectator;
  let hype = null;
  const handle = startMatchLoop(
    root,
    cfg,
    audio,
    (engine) => onFinal(engine, cfg, false, false),
    () => onFinal(null, cfg, true, false),
    {
      startingFive: opts.startingFive !== undefined ? !!opts.startingFive : loadSet().introMode !== "off",
      spectator,
      onFrame: (engine, events, input, dt) => {
        hype?.onFrame(engine, events);
        opts.onFrame?.(engine, events, input, dt);
      },
    }
  );

  if (!spectator && cfg.specialFx !== false) hype = createMatchHype(root);

  if (spectator) {
    const game = root.querySelector(".game");
    game?.classList.add("is-spectating");
    const badge = document.createElement("div");
    badge.className = "watch-badge";
    badge.textContent = "观战中 · AI 自动";
    game?.appendChild(badge);
    const skip = root.querySelector('.spec-bar [data-a="skip"]');
    if (skip) skip.textContent = "跳到结果";
  }

  const btn = document.createElement("button");
  btn.className = "sim-btn";
  btn.textContent = "一键模拟";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "模拟中…";
    handle.stop();
    // 无头模拟必须双方 AI（Kr 不喂输入，human 队会站桩）：克隆 cfg 摘掉 human 标记
    const simCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
    const done = await simulateFullMatch(simCfg);
    onFinal(done, cfg, false, true);
  });
  root.querySelector(".game")?.appendChild(btn);
  if (spectator || cfg.daily) btn.hidden = true;

  // 横竖屏切换：方向锁优先，失败落 CSS 旋转兜底
  const rotBtn = document.createElement("button");
  rotBtn.className = "rot-btn";
  rotBtn.textContent = "横屏";
  rotBtn.addEventListener("click", async () => {
    const game = root.querySelector(".game");
    if (!game) return;
    if (game.classList.contains("rot")) {
      game.classList.remove("rot");
      rotBtn.textContent = "横屏";
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
      try { screen.orientation && screen.orientation.unlock(); } catch {}
      return;
    }
    let locked = false;
    const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(res, ms))]);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await withTimeout(document.documentElement.requestFullscreen(), 800);
      }
    } catch {}
    try {
      if (screen.orientation && screen.orientation.lock) {
        await Promise.race([
          screen.orientation.lock("landscape").then(() => { locked = true; }),
          new Promise((res) => setTimeout(res, 800)),
        ]);
      }
    } catch {}
    if (!locked) game.classList.add("rot");
    rotBtn.textContent = "竖屏";
  });
  root.querySelector(".game")?.appendChild(rotBtn);

  return {
    stop() {
      hype?.destroy();
      handle.stop();
      btn.remove();
      rotBtn.remove();
    },
  };
}

/** 静音音频适配器（引擎比赛屏接口全实现，无实际发声） */
export const silentAudio = {
  muted: true,
  setMuted(v) { this.muted = v; },
  start() {},
  stopCrowd() {},
  startCrowd() {},
  play() {},
};





