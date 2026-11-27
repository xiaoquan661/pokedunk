/**
 * match-screen.js —— 比赛屏组装层（pokedunk-v2）
 * 复用引擎 startMatchLoop(wi)：自带比赛模板/记分板/触屏输入/暂停/解说/回放。
 * 我们只提供：比赛配置（道馆/四天王对手、我方阵容）、音频适配器（静音占位）、结算回调。
 *
 * 主线结构（docs/09）：8 馆顺序推进 + 四天王 + 地区冠军，见 journey/season.js。
 *   - 道馆：徽章数决定当前馆；馆主阵容按馆序由弱到强
 *   - 四天王：8 徽章解锁，独立 1 场，可重试
 *   - 冠军后进入下一地区（馆主全属性 +2）
 */
import { calcOVR, buildPlayer, POKEMON_LIST } from "../../engine/readable/play-core.js?v=693";
import { startMatchLoop, simulateFullMatch } from "../../engine/readable/play-core.js?v=693";
import { loadSet, saveSet, audioOn, setAudio } from "../ui/settings.js?v=693";
import { STAT_KEYS, pickGymRoster, gymOfStage } from "./gyms.js?v=693";
import { currentMatchInfo, matchSeed } from "./season.js?v=693";
import { buildMatchPlayer, bondMultipliers, starterIds } from "../systems/build.js?v=693";
import { createMatchHype } from "../ui/match-hype.js?v=693";
import { createDailyScoreHud } from "../ui/daily-score-hud.js?v=693";

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

/** 组一场主线比赛配置（节长/换人/防守偏好取自设置页） */
export function buildGymMatch(save, mode = "league") {
  const set = loadSet();
  const quarterLen = 120; // 固定每节 2 分钟（S91）
  const prefs = { autoSwitch: set.autoSwitch !== false, userAutoSubs: set.autoSubs !== false, specialFx: set.specialFx !== false };
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
    title: save.coach?.title || "",
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

/* ---------------- 快速比赛（无存档娱乐模式） ---------------- */
export const QUICK_LEVELS = [
  { id: "easy", name: "轻松", hint: "对手 -6", extra: -6, difficulty: "rookie" },
  { id: "normal", name: "标准", hint: "对手原强度", extra: 0, difficulty: "pro" },
  { id: "hard", name: "硬仗", hint: "对手 +8", extra: 8, difficulty: "allstar" },
];

/** 快速比赛的对手阵容（原版道馆阵容，不写存档，只读） */
export function quickRoster(stage = "gym1", level = "normal") {
  const gym = gymOfStage(stage);
  const lv = QUICK_LEVELS.find((x) => x.id === level) || QUICK_LEVELS[1];
  return pickGymRoster(stage, gym.types || ["Normal"], lv.extra);
}

const QUICK_POS = ["PG", "SG", "SF", "PF", "C"];

/**
 * 快速比赛选秀池：每个位置给 3 只候选，按对手强度取相近 OVR。
 * 只读引擎注册表，与外面存档完全无关。
 */
export function quickDraftPool(stage = "gym1", level = "normal") {
  const opp = quickRoster(stage, level);
  const target = opp.length ? opp.reduce((a, p) => a + p.ovr, 0) / opp.length : 70;
  const used = new Set();
  const out = {};
  for (const pos of QUICK_POS) {
    let picked = [];
    for (const band of [10, 16, 99]) {
      const cands = POKEMON_LIST.filter((p) => p.pos === pos && !used.has(p.dex) && Math.abs(p.ovr - target) <= band);
      for (let i = cands.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cands[i], cands[j]] = [cands[j], cands[i]];
      }
      picked = cands.slice(0, 3);
      if (picked.length >= 3) break;
    }
    if (picked.length < 3) {
      const extra = POKEMON_LIST.filter((p) => p.pos === pos && !used.has(p.dex) && !picked.includes(p));
      for (let i = extra.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [extra[i], extra[j]] = [extra[j], extra[i]];
      }
      picked = picked.concat(extra.slice(0, 3 - picked.length));
    }
    picked.forEach((p) => used.add(p.dex));
    out[pos] = picked.map((p) => p.dex);
  }
  return out;
}

/**
 * 快速比赛配置：我方用临时选秀阵容（dexes），对手用原版道馆阵容。
 * 与外部存档完全隔离，不改战绩/主线/金币/XP。
 * stage: "gym1".."gym8" | "elite"
 */
export function buildQuickMatch(save, stage = "gym1", level = "normal", dexes = []) {
  const set = loadSet();
  const prefs = { autoSwitch: set.autoSwitch !== false, userAutoSubs: set.autoSubs !== false, specialFx: set.specialFx !== false };
  const gym = gymOfStage(stage);
  const lv = QUICK_LEVELS.find((x) => x.id === level) || QUICK_LEVELS[1];
  const roster = quickRoster(stage, level);
  const away = {
    name: gym.name, abbr: gym.abbr, color: gym.color, color2: gym.color2,
    roster, bench: [], human: false, boost: 0, elite: stage === "elite",
  };
  const draft = (dexes || []).slice(0, 5);
  const homeRoster = draft.length
    ? draft.map((d) => buildPlayer(d, {}))
    : buildMyRoster(save, 1);
  const home = {
    name: "快速队",
    abbr: "QK",
    title: save?.coach?.title || "",
    color: "#3b6fd8",
    color2: "#16224a",
    roster: homeRoster,
    bench: [],
    human: true,
    boost: 0,
  };
  return {
    home, away, difficulty: lv.difficulty, quarterLen: 120, quarters: 2, ...prefs,
    seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0,
    gym: { ...gym, elite: stage === "elite" },
    mode: "quick", info: null, stamina: true,
    quick: { stage, level: lv.id, dexes: homeRoster.map((p) => p.dex) },
  };
}

/* ---------------- 野球场1v1（无主线结算） ---------------- */
const cnDexName = (dex, fallback = "") => {
  const row = (window.__PJ_DEX_ROWS || []).find((r) => Number(r[0]) === Number(dex));
  return row ? String(row[1]).replace(/#\d+$/, "") : fallback;
};

/** 1v1 篮球配置：每边 1 只精灵，2 节 × 60 秒，无换人。 */
export function buildWildMatch(save, route, monId, opp) {
  if (!save?.mons?.[monId] || !route || !opp) return null;
  const set = loadSet();
  const me = buildMatchPlayer(save, monId, new Map());
  const wild = buildPlayer(opp.dex, opp.bonus || {});
  return {
    home: {
      name: "野球挑战", abbr: "ME", color: "#3b6fd8", color2: "#16224a",
      roster: [me], bench: [], human: true, boost: 0,
    },
    away: {
      name: cnDexName(opp.dex, opp.name), abbr: "WLD", color: route.color, color2: route.color2,
      roster: [wild], bench: [], human: false, boost: 0,
    },
    difficulty: route.difficulty || "pro",
    quarterLen: 60,
    quarters: 2,
    autoSwitch: false,
    userAutoSubs: false,
    specialFx: set.specialFx !== false,
    seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0,
    mode: "wild",
    halfCourt: true,
    stamina: false,
    gym: { name: route.name, abbr: "WLD", color: route.color, color2: route.color2, elite: false },
    wild: { routeId: route.id, monId, opp },
  };
}

const SIM_CPU_BOOST = { rookie: -14, pro: -5, allstar: 0, legend: 4 };
const SIM_MAX_MARGIN = 30;

/** 无头模拟双方都是 AI，引擎不会自动注入难度档补正，这里手动补上 */
export function makeSimCfg(cfg) {
  const cpu = SIM_CPU_BOOST[cfg.difficulty] || 0;
  return {
    ...cfg,
    home: { ...cfg.home, human: false },
    away: { ...cfg.away, human: false, boost: (cfg.away?.boost || 0) + cpu },
  };
}

/** 模拟比分限幅：保持胜负，最多 30 分差 */
function capSimMargin(engine) {
  const s = engine?.score;
  if (!Array.isArray(s) || Math.abs(s[0] - s[1]) <= SIM_MAX_MARGIN) return engine;
  if (s[0] > s[1]) s[1] = Math.max(0, s[0] - SIM_MAX_MARGIN);
  else s[0] = Math.max(0, s[1] - SIM_MAX_MARGIN);
  return engine;
}

/** 共用无头模拟：难度补正 + 30 分差上限 */
export async function simulateHeadless(cfg) {
  return capSimMargin(await simulateFullMatch(makeSimCfg(cfg)));
}

/** 直接无头模拟当前比赛（主线「一键模拟」用），返回 { engine, cfg } */
export async function simulateCurrentMatch(save, mode = "league") {
  const cfg = buildGymMatch(save, mode);
  if (!cfg) return { engine: null, cfg: null };
  const engine = await simulateHeadless(cfg);
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
  let viewScale = Math.max(0.8, Math.min(1.2, Number(loadSet().viewScale) || 1));
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
    const ZOOM = 1.7 * viewScale;
    const ZOOM_SPEC = 1.55 * viewScale;
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

  function setViewScale(v) {
    viewScale = Math.max(0.8, Math.min(1.2, Number(v) || 1));
  }

  return { frame, setViewScale };
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
  function setStick(cfg = {}) {
    const c = { ...loadSet(), ...cfg };
    const scale = Math.max(0.9, Math.min(1.4, Number(c.stickScale) || 1));
    touch.style.setProperty("--stick-scale", String(scale));
  }
  setStick();

  touch.querySelector('.tb[data-b="turbo"]')?.remove();

  const put = (b, html) => {
    const btn = touch.querySelector(`.tb[data-b="${b}"]`);
    const bEl = btn?.querySelector("b");
    if (bEl) bEl.innerHTML = html;
    return btn;
  };
  put("pass", TOUCH_ICONS.pass);
  const stealBtn = put("steal", TOUCH_ICONS.steal);
  if (stealBtn && !stealBtn.querySelector(".pd-steal-cd")) {
    const stealCd = document.createElement("i");
    stealCd.className = "pd-steal-cd";
    stealBtn.appendChild(stealCd);
  }
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
  const zone = document.createElement("i");
  zone.className = "pd-zone";
  shootBtn?.appendChild(zone);

  let sprint = false;
  let perfectCue = false;
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
    if (stealBtn) {
      const left = Math.max(0, Number(u?.stealCd) || 0);
      const max = Number(u?.stealCdMax) || 1.2;
      const pct = Math.max(0, Math.min(1, left / max));
      stealBtn.style.setProperty("--steal-cd", pct.toFixed(3));
      stealBtn.classList.toggle("pd-cooling", pct > 0.01);
    }
    const charging = !!(u && u.state === "shoot" && u.meter > 0);
    if (!charging) {
      if (charge) charge.style.height = "0%";
      zone?.classList.remove("on");
      shootBtn?.classList.remove("pd-perfect");
      perfectCue = false;
      return;
    }
    const gw = engine.greenWindow?.(u) || 0.03;
    const v = Math.max(0, Math.min(1, u.meter));
    if (charge) charge.style.height = (v * 100).toFixed(1) + "%";
    // 黄条区域 = 完美出手窗口；长度由该精灵的投篮数值决定
    if (zone) {
      const lo = Math.max(0, 0.8 - gw);
      const hi = Math.min(1, 0.8 + gw);
      zone.style.bottom = (lo * 100).toFixed(1) + "%";
      zone.style.height = Math.max(2, (hi - lo) * 100).toFixed(1) + "%";
      zone.classList.add("on");
    }
    const perfect = u.meter >= 0.8 - gw && u.meter <= 0.8 + gw;
    // 完美白闪/震感是投篮 90+ 的专属反馈；低投篮只能自己盯蓄力条
    const cue = perfect && (Number(u.r?.sht) || 0) >= 90;
    if (cue && !perfectCue) {
      try { navigator.vibrate?.(8); } catch {}
    }
    perfectCue = cue;
    shootBtn?.classList.toggle("pd-perfect", cue);
  }
  return { frame, setStick };
}

/** 比赛内暂停菜单：比赛 / 操作 / 声音（与局外设置共用存储） */
function installPauseTuning(root, camera, touchUI, getEngine) {
  const panel = root.querySelector(".pause-menu .panel");
  if (!panel || panel.querySelector(".pause-tune")) return;
  const c = loadSet();
  const view = Math.round(Math.max(0.8, Math.min(1.2, Number(c.viewScale) || 1)) * 100);
  const stick = Math.round(Math.max(0.9, Math.min(1.4, Number(c.stickScale) || 1)) * 100);
  const seg = (key, opts, cur) => `<div class="pt-seg">${opts.map(([v, label]) =>
    `<button type="button" data-pt-set="${key}" data-v="${v}" class="${String(cur) === String(v) ? "on" : ""}">${label}</button>`).join("")}</div>`;
  const tune = document.createElement("div");
  tune.className = "pause-tune";
  tune.innerHTML = `
    <div class="pt-title">比赛设置 <button type="button" data-pt-reset>恢复默认</button></div>
    <div class="pt-sub">比赛</div>
    <div class="pt-row"><span>自动换防</span>${seg("autoSwitch", [["1", "开"], ["0", "关"]], c.autoSwitch === false ? "0" : "1")}</div>
    <div class="pt-sub">操作</div>
    <div class="pt-row"><span>画面大小</span><output data-pt-out="viewScale">${view}%</output></div>
    <input type="range" data-pt="viewScale" min="80" max="120" step="5" value="${view}">
    <div class="pt-row"><span>摇杆大小</span><output data-pt-out="stickScale">${stick}%</output></div>
    <input type="range" data-pt="stickScale" min="90" max="140" step="5" value="${stick}">
    <div class="pt-sub">声音</div>
    <div class="pt-row"><span>音乐</span>${seg("pokedunk.music", [["1", "开"], ["0", "关"]], audioOn("pokedunk.music") ? "1" : "0")}</div>
    <div class="pt-row"><span>音效</span>${seg("pokedunk.muted", [["1", "开"], ["0", "关"]], audioOn("pokedunk.muted") ? "1" : "0")}</div>
    <div class="pt-row"><span>解说</span>${seg("pokedunk.announcer", [["1", "开"], ["0", "关"]], audioOn("pokedunk.announcer") ? "1" : "0")}</div>
    <p class="pt-note">画面、摇杆、声音即时生效；自动换防下一次轮换生效。</p>`;
  const actions = panel.querySelector(".pause-actions");
  panel.style.maxHeight = "86dvh";
  panel.style.overflowY = "auto";
  panel.insertBefore(tune, actions || panel.querySelector(".subs-panel") || null);

  const apply = (key, raw) => {
    const value = raw / 100;
    saveSet({ [key]: value });
    if (key === "viewScale") camera?.setViewScale?.(value);
    else touchUI?.setStick?.({ [key]: value });
    const out = tune.querySelector(`[data-pt-out="${key}"]`);
    if (out) out.textContent = `${raw}%`;
  };
  tune.addEventListener("input", (e) => {
    const input = e.target.closest("input[data-pt]");
    if (!input) return;
    apply(input.dataset.pt, Number(input.value) || 0);
  });
  tune.addEventListener("click", (e) => {
    if (e.target.closest("[data-pt-reset]")) {
      saveSet({ viewScale: 1, stickScale: 1, autoSwitch: true });
      camera?.setViewScale?.(1);
      touchUI?.setStick?.({ stickScale: 1 });
      tune.remove();
      installPauseTuning(root, camera, touchUI, getEngine);
      return;
    }
    const btn = e.target.closest("[data-pt-set]");
    if (!btn) return;
    const key = btn.dataset.ptSet;
    const v = btn.dataset.v;
    if (key === "pokedunk.music" || key === "pokedunk.muted" || key === "pokedunk.announcer") {
      setAudio(key, v === "1");
    } else {
      const patch = {};
      if (key === "autoSubs") patch[key] = v !== "manual";
      else if (key === "autoSwitch") patch[key] = v === "1";
      else if (key === "specialFx") patch[key] = v === "1";
      else patch[key] = v;
      saveSet(patch);
      const eng = getEngine?.();
      if (eng?.cfg) {
        if (key === "autoSubs") eng.cfg.userAutoSubs = patch[key];
        else if (key === "autoSwitch") eng.cfg.autoSwitch = patch[key];
        else if (key === "specialFx") eng.cfg.specialFx = patch[key];
      }
    }
    btn.parentNode.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === btn));
  });
}

export function mountMatch(root, cfg, audio, onFinal, opts = {}) {
  const spectator = !!opts.spectator;
  let hype = null;
  let dailyHud = null;
  let camera = null;
  let touchUI = null;
  let liveEngine = null;
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
        liveEngine = engine;
        hype?.onFrame(engine, events);
        dailyHud?.onFrame(engine, events);
        camera?.frame(engine, dt);
        touchUI?.frame(engine, dt);
        opts.onFrame?.(engine, events, input, dt);
      },
    }
  );

  // 竖屏镜头推进 + 自动跟随（球与操控角色的加权中点）
  camera = createPortraitCamera(root);
  touchUI = createTouchUI(root);

  // 画面看门狗：部分机型（如小米 WebView）偶发 canvas 停止绘制/上下文失效，
  // 连续两次检测到全透明画面时弹出可重新进入的提示，避免整屏黑屏。
  if (!spectator) {
    let blankCount = 0;
    let checked = 0;
    const timer = setInterval(() => {
      if (!root.isConnected) { clearInterval(timer); return; }
      checked++;
      if (checked < 3) return; // 跳过开场
      const canvas = root.querySelector("canvas");
      const ctx = canvas && canvas.getContext && canvas.getContext("2d");
      if (!canvas || !ctx) return;
      let blank = true;
      try {
        const w = canvas.width, h = canvas.height;
        const pts = [[0.5, 0.5], [0.2, 0.3], [0.8, 0.7], [0.5, 0.85]];
        blank = pts.every(([px, py]) => ctx.getImageData((w * px) | 0, (h * py) | 0, 1, 1).data[3] === 0);
      } catch { blank = false; }
      blankCount = blank ? blankCount + 1 : 0;
      if (blankCount >= 2) {
        clearInterval(timer);
        root.__stopBg?.();
        window.__pjFatal?.("canvas", "比赛画面停止渲染");
      }
    }, 5000);
  }

  // 暂停菜单：新增「重新开始」（同一对阵重开一局，不计负）
  if (!spectator) {
    installPauseTuning(root, camera, touchUI, () => liveEngine);
    const actions = root.querySelector(".pause-menu .pause-actions");
    if (actions) {
      // 声音/解说已并入暂停设置，移除旧的重复按钮
      actions.querySelector('[data-a="mute"]')?.remove();
      actions.querySelector('[data-a="announcer"]')?.remove();
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

  if (cfg.daily) root.querySelector(".game")?.classList.add("daily");
  if (cfg.daily && !spectator) dailyHud = createDailyScoreHud(root, cfg.dailyMod?.id);
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
    try {
      // 双方 AI 无头模拟，带难度补正与 30 分差上限
      const done = await simulateHeadless(cfg);
      if (!done) throw new Error("模拟未返回结果");
      onFinal(done, cfg, false, true);
    } catch (e) {
      console.error("一键模拟失败", e);
      btn.disabled = false;
      btn.textContent = "模拟失败，重试";
    }
  });
  root.querySelector(".game")?.appendChild(btn);
  // 四天王只允许手打，不提供一键模拟
  if (spectator || cfg.daily || cfg.mode === "elite") btn.hidden = true;

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
      dailyHud?.destroy();
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





