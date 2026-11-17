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
import { calcOVR } from "../../engine/readable/play-core.js?v=84";
import { startMatchLoop, simulateFullMatch } from "../../engine/readable/play-core.js?v=84";
import { loadSet } from "../ui/settings.js?v=111";
import { STAT_KEYS } from "./gyms.js?v=60";
import { currentMatchInfo, matchSeed } from "./season.js?v=69";
import { buildMatchPlayer, bondMultipliers, starterIds } from "../systems/build.js?v=66";
import { createMatchHype } from "../ui/match-hype.js?v=64";

/** 由存档构建我方阵容：只取队伍内实际精灵；不足 5 人按实际人数开赛
 *  mult：小决赛 3-0 常规赛的百分比加成（1.00/1.01/1.02/1.03） */
export function buildMyRoster(save, mult = 1) {
  // 只用首发槽位内的实际精灵：不足 5 人按实际人数开赛，不从替补/仓库补位
  const ids = starterIds(save);
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
 * 竖屏镜头：放大球场并跟随「球 + 操控角色」加权中点。
 * 只对 canvas 做 CSS transform（球场、球员、特效一起缩放），HUD/摇杆不受影响。
 * 局内横屏（.game.rot）时恢复整场俯视。
 */
function createPortraitCamera(root) {
  const game = root.querySelector(".game");
  const canvas = root.querySelector(".game canvas.court") || root.querySelector(".game canvas");
  const ZOOM = 1.7;
  const ZOOM_SPEC = 1.55;
  const WIDE = 1.3; // 左右视野再扩大 30%
  const LIFT = 30; // 视野变宽后减少上移，避免只看到球场底边
  let tx = 0, ty = 0, primed = false;

  // 与引擎 gs.proj 同一投影：canvas 逻辑 480×270，x∈[0,94] 横向、y∈[0,50] 纵深
  const proj = (x, y, z = 0) => {
    const n = Math.max(0, Math.min(1, y / 50));
    const o = 5.9 + 2.1 * n;
    return { x: 240 + (x - 47) * o, y: 98 + 160 * n - z * o * 0.95 };
  };

  function frame(engine, dt) {
    if (!canvas) return;
    const fpsDt = Math.min(0.05, dt || 1 / 60);
    if (game?.classList.contains("rot")) {
      if (canvas.style.transform) canvas.style.transform = "";
      primed = false;
      return;
    }
    const ball = engine?.ball;
    if (!ball) return;
    // 只取地面坐标：忽略运球弹跳 / 起跳高度，避免镜头随球上下抖动
    const bp = proj(ball.x, ball.y, 0);
    const user = engine.user;
    let target = bp;
    if (user) {
      const up = proj(user.x, user.y, 0);
      // 持球时偏向两者中点；球脱手/飞行时更跟球，避免投篮出画
      const w = ball.owner === user ? 0.5 : ball.owner ? 0.6 : 0.75;
      target = { x: bp.x * w + up.x * (1 - w), y: bp.y * w + up.y * (1 - w) };
    }
    // 短屏自动降一档推进倍率，保证球场底边、蓄力条、按键弧三层不重叠；
    // 再除以 WIDE，使左右可见范围扩大 30%
    const H = game.clientHeight || 763;
    const fit = Math.max(1, Math.min(ZOOM, (H - 430) / 196) / WIDE);
    const zoom = user ? fit : Math.min(ZOOM_SPEC / WIDE, fit);
    const cw = canvas.clientWidth || 480;
    const ch = canvas.clientHeight || 270;
    if (!cw || !ch) return;
    // 纵向固定在中线：镜头只做左右跟随，不随球员前后移动或运球上下晃动
    const fixedY = proj(47, 25, 0).y;
    const T = { x: (target.x / 480) * cw, y: (fixedY / 270) * ch };
    const C = { x: cw / 2, y: ch / 2 };
    // 视野内允许的最大偏移：保证放大后画面边缘不露底
    const k = (zoom - 1) / (2 * zoom);
    const dx = Math.max(-cw * k, Math.min(cw * k, C.x - T.x));
    const dy = Math.max(-ch * k, Math.min(ch * k, C.y - T.y));
    const wantX = dx * zoom;
    const wantY = dy * zoom - LIFT;
    if (!primed) {
      tx = wantX; ty = wantY; primed = true;
    } else {
      const ax = 1 - Math.exp(-fpsDt * 6); // 仅横向跟拍
      tx += (wantX - tx) * ax;
      ty = wantY; // 纵向完全锁死
    }
    canvas.style.transformOrigin = "50% 50%";
    canvas.style.willChange = "transform";
    canvas.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom})`;
  }

  return { frame };
}

/**
 * 挂载比赛屏到 root。
 * onFinal(engine, cfg, quit, simulated)
 */
const TOUCH_ICONS = {
  // 篮球（投篮）
  ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.8"/><path d="M3.4 12h17.2M12 3.2v17.6M6 6c3 3 3 9 0 12M18 6c-3 3-3 9 0 12"/></svg>',
  // 封盖手掌（防守）
  block: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 20v-5.5M7.5 14.5V8a1.7 1.7 0 0 1 3.4 0v4.5"/><path d="M10.9 12.5V6.6a1.7 1.7 0 0 1 3.4 0v5.9"/><path d="M14.3 12.5V8.6a1.7 1.7 0 0 1 3.4 0V15c0 3.2-2.2 5-5.2 5H10"/></svg>',
  // 双箭头向前（传球 / 换防）
  pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5h9.5"/><path d="m10 5 3.5 3.5L10 12"/><path d="M10.5 15.5h9.5"/><path d="m17 12 3.5 3.5L17 19"/></svg>',
  // 手 + 球（抢断）
  steal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16.2" cy="8.2" r="3.4"/><path d="M7.6 20v-5.2M7.6 14.8V9.6a1.6 1.6 0 0 1 3.2 0v3.6"/><path d="M10.8 13.2V8.4a1.6 1.6 0 0 1 3.2 0v4.6"/></svg>',
  // 闪电（必杀）
  special: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.2 2 4.6 13.8h5.6L9 22l9.4-12.2h-5.7L13.2 2Z"/></svg>',
};

/** 竖屏操控层：四键弧形、图标+中文、摇杆推满冲刺、独立蓄力条 */
export function createTouchUI(root) {
  const game = root.querySelector(".game");
  const touch = game?.querySelector(".touch");
  if (!touch) return { frame() {} };
  const pad = game.__touchPad || null;

  touch.querySelector('.tb[data-b="turbo"]')?.remove();

  const put = (b, html) => {
    const btn = touch.querySelector(`.tb[data-b="${b}"]`);
    const bEl = btn?.querySelector("b");
    if (bEl) bEl.innerHTML = html;
    return btn;
  };
  put("pass", TOUCH_ICONS.pass);
  put("steal", TOUCH_ICONS.steal);
  put("special", TOUCH_ICONS.special);
  const shootBtn = put("shoot", `<span class="pd-ico pd-atk">${TOUCH_ICONS.ball}</span><span class="pd-ico pd-def">${TOUCH_ICONS.block}</span>`);
  const shootSpan = shootBtn?.querySelector("span:not(.pd-ico)");
  const syncDef = () => {
    if (!shootSpan) return;
    // 引擎防守态写的是「起跳」，统一显示「盖帽」；已经是「盖帽」时保持防守图标
    const def = shootSpan.textContent.includes("起跳") || shootSpan.textContent.includes("盖帽");
    if (def && shootSpan.textContent !== "盖帽") shootSpan.textContent = "盖帽";
    shootBtn.classList.toggle("pd-def", def);
  };
  if (shootSpan) {
    new MutationObserver(syncDef).observe(shootSpan, { childList: true, characterData: true, subtree: true });
    syncDef();
  }

  // 蓄力反馈：不再单独出横条，直接填充投篮键
  const charge = document.createElement("i");
  charge.className = "pd-charge";
  shootBtn?.appendChild(charge);

  let sprint = false;
  function frame(engine) {
    if (pad) {
      const m = Math.hypot(pad.touchMove?.x || 0, pad.touchMove?.y || 0);
      if (!sprint && m >= 0.9) {
        sprint = true;
        touch.classList.add("pd-sprint");
        try { navigator.vibrate?.(8); } catch {}
      } else if (sprint && m < 0.72) {
        sprint = false;
        touch.classList.remove("pd-sprint");
      }
      if (pad.touchBtn.turbo !== sprint) pad.touchBtn.turbo = sprint;
    }
    const u = engine?.user;
    const charging = !!(u && u.state === "shoot" && u.meter > 0);
    if (!charging) {
      if (charge) charge.style.height = "0%";
      shootBtn?.classList.remove("pd-perfect");
      return;
    }
    const gw = engine.greenWindow?.(u) || 0.03;
    const v = Math.max(0, Math.min(1, u.meter));
    if (charge) charge.style.height = (v * 100).toFixed(1) + "%";
    const perfect = u.meter >= 0.8 - gw && u.meter <= 0.8 + gw;
    shootBtn?.classList.toggle("pd-perfect", perfect);
  }
  return { frame };
}

export function mountMatch(root, cfg, audio, onFinal, opts = {}) {
  const spectator = !!opts.spectator;
  let hype = null;
  let camera = null;
  let touchUI = null;
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
        camera?.frame(engine, dt);
        touchUI?.frame(engine, dt);
        opts.onFrame?.(engine, events, input, dt);
      },
    }
  );

  // 竖屏镜头推进 + 自动跟随（球与操控角色的加权中点）
  camera = createPortraitCamera(root);
  touchUI = createTouchUI(root);

  // 暂停菜单：新增「重新开始」（同一对阵重开一局，不计负）
  if (!spectator) {
    const actions = root.querySelector(".pause-menu .pause-actions");
    if (actions) {
      const restart = document.createElement("button");
      restart.type = "button";
      restart.className = "btn";
      restart.textContent = "重新开始";
      restart.addEventListener("click", () => {
        try { handle.stop(); } catch {}
        mountMatch(root, { ...cfg, seed: (Number(cfg.seed) || 0) + 1 }, audio, onFinal, opts);
      });
      actions.insertBefore(restart, actions.querySelector('[data-a="quit"]'));
    }
  }

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
      try { window.__stageApply?.(); } catch {}
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
    try { window.__stageApply?.(); } catch {}
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





