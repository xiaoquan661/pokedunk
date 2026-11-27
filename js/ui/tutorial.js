/**
 * ui/tutorial.js —— 新手教程（移植 pokedunk 的训练模式，适配 v2 竖屏 UI）
 * 使用引擎 practice + drill：移动 / 传球 / 上篮 / 扣篮 / 空接 / 投篮 / 抢断 / 盖帽，约 2 分钟。
 * 教程使用独立的 5 人训练阵容，不读写生涯队伍与战绩。
 */
import { buildPlayer } from "../../engine/readable/play-core.js?v=695";
import { startMatchLoop } from "../../engine/readable/play-core.js?v=695";
import { gameAudio } from "../platform/audio.js?v=695";
import { createTouchUI } from "../journey/match-screen.js?v=695";

const HOME_DEXES = [1, 4, 7, 25, 133];
const AWAY_DEXES = [16, 19, 21, 23, 27];
// 移动训练：依次点亮的落脚点（球场坐标，与引擎一致）
const MOVE_SPOTS = [
  [70, 15],
  [81, 29],
  [70, 40],
];

const DRILLS = [
  {
    id: "movement", title: "移动", metric: "move", target: 2, time: 10, keys: ["摇杆"],
    intro: "拖动摇杆跑向篮筐，推满摇杆可以冲刺。",
    tip: "推满摇杆冲刺更快。",
  },
  {
    id: "passing", title: "传球", metric: "pass", target: 1, time: 10, keys: ["传球"],
    intro: "按传球，把球交给队友。",
    tip: "被包夹时先传球。",
  },
  {
    id: "layups", title: "上篮", metric: "layup", target: 1, time: 12, keys: ["投篮"],
    intro: "运球靠近篮筐，按投篮上篮。",
    tip: "离篮筐越近越稳。",
  },
  {
    id: "dunks", title: "扣篮", metric: "dunk", target: 1, time: 12, keys: ["推满摇杆", "投篮"],
    intro: "推满摇杆冲进禁区，再按投篮扣篮。",
    tip: "推满摇杆时按投篮才是扣篮。",
  },
  {
    id: "alleyoop", title: "空接", metric: "oop", target: 1, time: 15, keys: ["传球"],
    intro: "队友已经切到篮下，按传球把球抛给他。",
    tip: "空接会把球直接送向篮筐。",
  },
  {
    id: "jumpshots", title: "投篮", metric: "jumpshot", target: 1, time: 15, keys: ["投篮"],
    intro: "按住投篮，蓄力条进入完美区时松开。",
    tip: "松手越准，命中越高。",
  },
  {
    id: "steals", title: "抢断", metric: "steal", target: 1, time: 15, keys: ["抢断"],
    intro: "贴近持球人，按抢断。",
    tip: "推满摇杆时抢断会变成撞击。",
  },
  {
    id: "blocks", title: "盖帽", metric: "block", target: 1, time: 18, keys: ["投篮"],
    intro: "守住篮下，对手出手时按投篮起跳封盖。",
    tip: "别起跳太早，等球离手再跳。",
  },
];

const CONTROLS = [
  ["摇杆", "移动 / 防守跟人（推满冲刺）"],
  ["投篮", "投篮 / 上篮 / 扣篮 / 盖帽"],
  ["传球", "传球 / 空接 / 换防"],
  ["抢断", "抢断"],
];

const CSS = `
.screen-match .tut-strip{position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:35;display:flex;flex-wrap:wrap;align-items:center;gap:8px;row-gap:5px;padding:9px 10px 10px;border:2px solid #b8e63c;border-radius:3px;background:#0a0a0a;box-shadow:4px 4px 0 rgba(0,0,0,.6);pointer-events:none}
.screen-match .tut-strip .tut-text{flex:1 1 120px;min-width:0;display:flex;flex-direction:column;gap:3px}
.screen-match .tut-strip .tut-step{font-size:10px;font-weight:700;letter-spacing:.08em;color:#b8e63c;display:flex;flex-wrap:wrap;align-items:center;gap:5px;line-height:1.45}
.screen-match .tut-key{display:inline-block;min-width:18px;padding:1px 5px;border:1px solid #b8e63c;border-radius:3px;background:rgba(184,230,60,.12);color:#b8e63c;font:700 9px/1.5 var(--sport);letter-spacing:0;text-align:center}
.screen-match .tut-strip .tut-hint{font-size:12px;line-height:1.35;color:#f2f2f2}
.screen-match .tut-strip .tut-acts{display:flex;gap:5px;flex-shrink:0;margin-left:auto}
.screen-match .tut-strip button{pointer-events:auto;border:2px solid #3a3a3a;border-radius:3px;background:#121212;color:#f2f2f2;font:700 10px var(--sport);padding:7px 9px}
.screen-match .tut-strip button.ghost{border-color:#262626;background:#0d0d0d;color:#9a9a9a}
.screen-match .tut-strip .tut-prog{position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:0 0 3px 3px;background:linear-gradient(90deg,#8fbf2a,#b8e63c);transform-origin:left;transform:scaleX(0);transition:transform .15s}
.game.tut-on .bug,.game.tut-on .pcard,.game.tut-on .sim-btn,.game.tut-on .rot-btn,.game.tut-on .pause-btn{display:none!important}
.screen-match .tut-result,.screen-match .tut-done,.screen-match .tut-intro{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.screen-match .tut-result[hidden],.screen-match .tut-done[hidden],.screen-match .tut-intro[hidden]{display:none}
.screen-match .tut-intro .panel{text-align:left}
.screen-match .tut-intro-sub{margin:0 0 10px;color:#9a9a9a;font-size:12px;line-height:1.5}
.screen-match .tut-keys{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px}
.screen-match .tut-keys li{display:flex;align-items:center;gap:9px;padding:5px 8px;border:1px solid #2a2a2a;border-radius:3px;background:#121212}
.screen-match .tut-keys li i{flex:0 0 52px;text-align:center;padding:3px 0;border:1px solid #b8e63c;border-radius:3px;background:rgba(184,230,60,.12);color:#b8e63c;font:700 10px var(--sport);font-style:normal}
.screen-match .tut-keys li span{font-size:12px;color:#f2f2f2}
.screen-match .tut-intro .tut-begin{width:100%;padding:11px 12px;border-radius:3px;border:2px solid #b8e63c;background:#b8e63c;color:#101010;font:700 13px var(--sport)}
.screen-match .tut-intro .tut-skip-all{width:100%;margin-top:7px;padding:9px 12px;border-radius:3px;border:1px solid #3a3a3a;background:#121212;color:#9a9a9a;font:700 11px var(--sport)}
.screen-match.intro-on .tut-strip{opacity:.5}
.screen-match.intro-on .tut-strip [data-tut="skip"]{visibility:hidden}
.screen-match .tut-result .panel,.screen-match .tut-done .panel,.screen-match .tut-intro .panel{width:min(340px,92vw);border-radius:3px;border:2px solid #3a3a3a;border-left:6px solid #b8e63c;background:#0a0a0a;box-shadow:7px 7px 0 rgba(0,0,0,.6);padding:18px 16px;text-align:center;color:#f2f2f2}
.screen-match .tut-result h2,.screen-match .tut-done h2,.screen-match .tut-intro h2{margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #b8e63c;font:700 20px var(--sport);color:#b8e63c;text-align:left}
.screen-match .tut-result p,.screen-match .tut-done p,.screen-match .tut-intro p{margin:0 0 10px;color:#d0d0d0;font-size:12px;line-height:1.55}
.screen-match .tut-score b{font-size:24px;color:#b8e63c}
.screen-match .tut-stars{font-size:26px;line-height:1;color:#b8e63c;letter-spacing:.14em}
.screen-match .tut-done-acts{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:12px}
.screen-match .tut-done-acts button{flex:1;min-width:100px;padding:10px 12px;border-radius:3px;border:2px solid #3a3a3a;background:#121212;color:#f2f2f2;font:700 12px var(--sport)}
.screen-match .tut-done-acts button.primary{background:#b8e63c;border-color:#b8e63c;color:#101010}
.screen-match .tut-sum{list-style:none;margin:0 0 12px;padding:0;text-align:left;font-size:12px}
.screen-match .tut-sum li{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid #242424}
.screen-match .tut-sum li:last-child{border-bottom:none}
.screen-match .tut-reward{margin:0 0 10px;padding:8px 10px;border:1px dashed #b8e63c;border-radius:3px;color:#eaffb0;font-size:12px;line-height:1.5;text-align:left}
/* 教程完成：皮卡丘 / 伊布加入队伍 */
.screen-match .tut-gift{position:relative;margin:2px 0 12px;padding:10px 8px 12px;border:1px solid rgba(184,230,60,.5);border-radius:4px;background:radial-gradient(120% 100% at 50% 0%,rgba(184,230,60,.18),rgba(184,230,60,.03) 68%,transparent);overflow:hidden}
.screen-match .tut-gift::after{content:"";position:absolute;top:-60%;left:-40%;width:40%;height:220%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:rotate(18deg);animation:tutGiftSweep 1.8s .35s ease-in-out both;pointer-events:none}
.screen-match .tut-gift-title{display:block;margin-bottom:9px;font:700 13px var(--sport);letter-spacing:.14em;color:#b8e63c;animation:tutGiftTitle .45s ease both}
.screen-match .tut-gift-row{display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
.screen-match .tut-gift-card{position:relative;width:70px;padding:6px 3px 5px;display:flex;flex-direction:column;align-items:center;gap:2px;border:2px solid #b8e63c;border-radius:4px;background:linear-gradient(180deg,#18200c,#0b0e07);opacity:0;transform:translateY(18px) scale(.55);animation:tutGiftIn .6s cubic-bezier(.2,1.5,.35,1) forwards;animation-delay:var(--d);box-shadow:0 0 14px rgba(184,230,60,.22)}
.screen-match .tut-gift-card img{position:relative;z-index:1;width:44px;height:44px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 0 9px rgba(255,203,5,.7));animation:tutGiftBob 2s ease-in-out infinite}
.screen-match .tut-gift-card b{position:relative;z-index:1;font:700 12px var(--sport);color:#f4f1e8;line-height:1.2}
.screen-match .tut-gift-card small{position:relative;z-index:1;font-size:9.5px;color:#b8e63c;letter-spacing:.06em;line-height:1.2}
.screen-match .tut-gift-halo{position:absolute;left:50%;top:35px;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:radial-gradient(circle,rgba(255,203,5,.46),rgba(255,203,5,0) 70%);animation:tutGiftHalo 1.8s ease-in-out infinite}
@keyframes tutGiftIn{0%{opacity:0;transform:translateY(18px) scale(.5) rotate(-6deg)}70%{opacity:1;transform:translateY(-2px) scale(1.06) rotate(2deg)}100%{opacity:1;transform:none}}
@keyframes tutGiftBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes tutGiftHalo{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1.12)}}
@keyframes tutGiftTitle{0%{opacity:0;letter-spacing:.5em}100%{opacity:1;letter-spacing:.14em}}
@keyframes tutGiftSweep{0%{left:-45%}100%{left:125%}}

/* —— 复古主题：黑底保留，文字改米色、强调色改复古琥珀，边框改米色 —— */
html[data-ui-theme="retro"] .screen-match .tut-strip{border-color:#f4ead2;background:rgba(8,10,9,.88);box-shadow:4px 4px 0 rgba(0,0,0,.6)}
html[data-ui-theme="retro"] .screen-match .tut-strip .tut-step{color:#e9b45f}
html[data-ui-theme="retro"] .screen-match .tut-key{border-color:#f4ead2;background:rgba(244,234,210,.08);color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-strip .tut-hint{color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-strip button{border-color:#f4ead2;background:#121212;color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-strip button.ghost{border-color:#575245;background:#0d0d0d;color:#b9b19d}
html[data-ui-theme="retro"] .screen-match .tut-strip .tut-prog{background:linear-gradient(90deg,#b5761f,#e9b45f)}
html[data-ui-theme="retro"] .screen-match .tut-result .panel,
html[data-ui-theme="retro"] .screen-match .tut-done .panel,
html[data-ui-theme="retro"] .screen-match .tut-intro .panel{border-color:#f4ead2;border-left-color:#e9b45f;background:#0a0a0a;color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-result h2,
html[data-ui-theme="retro"] .screen-match .tut-done h2,
html[data-ui-theme="retro"] .screen-match .tut-intro h2{border-bottom-color:#e9b45f;color:#e9b45f}
html[data-ui-theme="retro"] .screen-match .tut-result p,
html[data-ui-theme="retro"] .screen-match .tut-done p,
html[data-ui-theme="retro"] .screen-match .tut-intro p{color:#e6ddc9}
html[data-ui-theme="retro"] .screen-match .tut-intro-sub{color:#c9c0a8}
html[data-ui-theme="retro"] .screen-match .tut-keys li{border-color:rgba(244,234,210,.35);background:#121212}
html[data-ui-theme="retro"] .screen-match .tut-keys li i{border-color:#f4ead2;background:rgba(244,234,210,.08);color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-keys li span{color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-intro .tut-begin{border-color:#f4ead2;background:#e9b45f;color:#1c241e}
html[data-ui-theme="retro"] .screen-match .tut-score b{color:#e9b45f}
html[data-ui-theme="retro"] .screen-match .tut-stars{color:#e9b45f}
html[data-ui-theme="retro"] .screen-match .tut-done-acts button{border-color:#f4ead2;background:#121212;color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-done-acts button.primary{background:#e9b45f;border-color:#f4ead2;color:#1c241e}
html[data-ui-theme="retro"] .screen-match .tut-sum li{border-bottom-color:rgba(244,234,210,.2)}
html[data-ui-theme="retro"] .screen-match .tut-reward{border-color:#e9b45f;color:#f4ead2}
html[data-ui-theme="retro"] .screen-match .tut-gift{border-color:rgba(244,234,210,.45);background:radial-gradient(120% 100% at 50% 0%,rgba(233,180,95,.18),rgba(233,180,95,.03) 68%,transparent)}
html[data-ui-theme="retro"] .screen-match .tut-gift-title{color:#e9b45f}
html[data-ui-theme="retro"] .screen-match .tut-gift-card{border-color:#f4ead2;background:linear-gradient(180deg,#fff8e8,#f1e2c2);box-shadow:0 0 14px rgba(233,180,95,.25)}
html[data-ui-theme="retro"] .screen-match .tut-gift-card b{color:#1c241e}
html[data-ui-theme="retro"] .screen-match .tut-gift-card small{color:#8a5200}
`;

function ensureCss() {
  if (document.getElementById("pj-tut-style")) return;
  const st = document.createElement("style");
  st.id = "pj-tut-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

function statsEmpty() {
  return { reps: 0, defendS: 0, elapsed: 0 };
}

function giftName(dex) {
  const r = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  if (r) return String(r[1]).replace(/#\d+$/, "");
  return ({ 25: "皮卡丘", 133: "伊布" })[dex] || "新伙伴";
}

function configFor(drill) {
  const homeRoster = HOME_DEXES.map((dex) => buildPlayer(dex, {}));
  const awayRoster = AWAY_DEXES.map((dex) => buildPlayer(dex, {}));
  return {
    home: { name: "训练营", abbr: "TUT", color: "#3b6fd8", color2: "#16224a", roster: homeRoster, bench: [], human: true, boost: 0 },
    away: { name: "训练营陪练", abbr: "CPU", color: "#7a5cf0", color2: "#2a1b52", roster: awayRoster, bench: [], human: false, boost: 0 },
    difficulty: "rookie", quarterLen: 90, stamina: false, autoSwitch: false,
    seed: 20261031, practice: true, drill,
  };
}

function drillProgress(d, s) {
  const target = d.metric === "defend" ? d.target : d.target;
  const value = d.metric === "defend" ? s.defendS : d.metric === "move" ? s.reps : s.reps;
  if (target) return Math.max(0, Math.min(1, value / target));
  return Math.max(0, Math.min(1, s.elapsed / d.time));
}

function starsFor(d, s) {
  const p = drillProgress(d, s);
  return p >= 1 ? 3 : p >= 0.6 ? 2 : 1;
}

export function startTutorial(root, save, actions = {}) {
  ensureCss();
  root.replaceChildren();
  const page = document.createElement("div");
  page.className = "sub-page screen-match";
  root.appendChild(page);

  let engine = null;
  let handle = null;
  let idx = 0;
  let phase = "keys";
  let phaseT = 0;
  let begun = false;
  let stats = statsEmpty();
  let dist = 0;
  let lastPos = null;
  let lastBallMode = "";
  let started = false;
  let finished = false;
  let rewarded = false;
  let moveSpotIdx = 0;
  let touchUI = null;
  let drillDone = false;
  let settleT = 0;

  const game = () => page.querySelector(".game");
  const strip = () => page.querySelector(".tut-strip");

  /** 移动训练的发光落脚点：交给引擎的 markers 渲染，随镜头一起缩放 */
  function clearMoveSpots() {
    if (!engine) return;
    engine.markers = (engine.markers || []).filter((m) => m.kind !== "spot");
  }
  function setMoveSpot(i) {
    if (!engine) return;
    clearMoveSpots();
    const spot = MOVE_SPOTS[i];
    if (spot) engine.markers.push({ kind: "spot", x: spot[0], y: spot[1] });
  }

  function updateStrip(hint, progress) {
    const el = strip();
    if (!el) return;
    el.querySelector(".tut-hint").textContent = hint;
    el.querySelector(".tut-prog").style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    const keys = (DRILLS[idx].keys || []).map((k) => `<span class="tut-key">${k}</span>`).join("");
    el.querySelector(".tut-step").innerHTML = `教程 ${idx + 1}/${DRILLS.length} · ${DRILLS[idx].title}${keys}`;
  }

  function startDrill(i) {
    idx = i;
    phase = begun ? "active" : "standby";
    phaseT = 0;
    stats = statsEmpty();
    dist = 0;
    lastPos = null;
    lastBallMode = "";
    drillDone = false;
    settleT = 0;
    const d = DRILLS[idx];
    if (engine) {
      engine.setDrill(d.id);
      engine.paused = !begun;
    }
    // 移动训练点亮第一个落脚点，其他训练清掉残留标记
    moveSpotIdx = 0;
    if (d.id === "movement") setMoveSpot(0);
    else clearMoveSpots();
    page.querySelector(".tut-done")?.setAttribute("hidden", "");
    updateStrip(d.intro, 0);
    const skip = strip()?.querySelector('[data-tut="skip"]');
    if (skip) skip.hidden = false;
  }

  function advanceDrill() {
    if (idx >= DRILLS.length - 1) { finishMatch(); return; }
    startDrill(idx + 1);
  }

  function feedEvents(events, d) {
    for (const ev of events || []) {
      const mine = ev.player && ev.player.team === 0;
      if (!mine) continue;
      if (ev.kind === "score") {
        if (d.id === "layups" && ev.how === "layup") stats.reps++;
        if (d.id === "dunks" && ev.how === "dunk") stats.reps++;
        if (d.id === "jumpshots" && ev.how === "jump") stats.reps++;
      } else if (ev.kind === "oop" && d.id === "alleyoop") {
        stats.reps++;
      } else if (ev.kind === "steal" && d.id === "steals") {
        stats.reps++;
      } else if (ev.kind === "block" && d.id === "blocks") {
        stats.reps++;
      }
    }
  }

  function showResult(skipped = false) {
    phase = "done";
    clearMoveSpots();
    if (engine) engine.paused = true;
    const d = DRILLS[idx];
    const stars = skipped ? 0 : starsFor(d, stats);
    const score = Math.round((d.metric === "defend" ? stats.defendS * 50 : stats.reps * 100) || 0);
    const line = skipped
      ? "已跳过本项，可以随时重新挑战。"
      : stars >= 3 ? "漂亮！这一项已经掌握。"
      : stars >= 2 ? "不错，再练一次会更稳。"
      : "别急，先跟着提示慢慢做。";
    const last = idx >= DRILLS.length - 1;
    const result = page.querySelector(".tut-result");
    result.innerHTML = `<div class="panel">
      <h2>${d.title}${skipped ? " · 已跳过" : ""}</h2>
      <p class="tut-score">得分 <b>${score}</b></p>
      <p class="tut-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</p>
      <p class="tut-res-line">${line}</p>
      <div class="tut-done-acts">
        <button class="primary" data-res="next">${last ? "完成教程" : "下一项"}</button>
        <button data-res="retry">再练一次</button>
        <button data-res="exit">退出教程</button>
      </div>
    </div>`;
    result.removeAttribute("hidden");
  }

  function showDone() {
    if (finished) return;
    finished = true;
    phase = "done";
    if (engine) engine.paused = true;
    let gift = null;
    if (!rewarded) { rewarded = true; gift = actions.onDone?.() || null; }
    const giftDex = Array.isArray(gift?.got) ? gift.got : [];
    const reward = typeof gift === "string" ? gift : gift?.text || "";
    // 提前切回菜单音乐：把音频初始化挪到结算页显示期间，返回主页时不再额外卡顿
    gameAudio.setTrack("menu");
    const summary = DRILLS.map((d, i) => `<li><span>${i + 1}. ${d.title}</span><span>${i < idx || (i === idx && phase === "done") ? "✓" : "—"}</span></li>`).join("");
    const giftHtml = giftDex.length
      ? `<div class="tut-gift">
          <b class="tut-gift-title">新伙伴加入！</b>
          <div class="tut-gift-row">${giftDex.map((dex, i) => `
            <div class="tut-gift-card" style="--d:${(0.15 + i * 0.22).toFixed(2)}s">
              <span class="tut-gift-halo"></span>
              <img src="./sprites/${dex}.png" alt="">
              <b>${giftName(dex)}</b>
              <small>已加入队伍</small>
            </div>`).join("")}
          </div>
        </div>`
      : "";
    const canContinue = typeof actions.onContinue === "function";
    const canStart = !canContinue && typeof actions.onStartMatch === "function";
    const primary = canContinue
      ? { label: "去商店挑一只", done: "continue" }
      : canStart
        ? { label: "开始第一场比赛", done: "match" }
        : { label: "返回主页", done: "exit" };
    const hint = canContinue
      ? "下一步：去商店挑两只新伙伴，再把他们拖进首发。"
      : giftDex.length
        ? "首发五人已就位，直接打第一场。"
        : "现在可以开始第一场比赛了。";
    const done = page.querySelector(".tut-done");
    done.innerHTML = `<div class="panel">
      <h2>准备开打</h2>
      ${giftHtml}
      <ul class="tut-sum">${summary}</ul>
      ${reward ? `<p class="tut-reward">${reward}</p>` : ""}
      <p>${hint}</p>
      <div class="tut-done-acts">
        <button class="primary" data-done="${primary.done}">${primary.label}</button>
        ${canContinue || canStart ? '<button data-done="exit">先回主页</button>' : ""}
      </div>
    </div>`;
    done.removeAttribute("hidden");
  }

  function exitTutorial() {
    if (finished) return;
    finished = true;
    clearMoveSpots();
    handle?.stop();
    gameAudio.setTrack("menu");
    actions.onExit?.();
  }

  function finishMatch() {
    if (finished) return;
    showDone();
    handle?.stop();
  }

  function onFrame(e, events, input, dt) {
    if (finished) return;
    touchUI?.frame(e);
    if (!started) {
      started = true;
      engine = e;
      engine.paused = true;
      game()?.classList.add("tut-on");
      startDrill(0);
      phase = "keys";
      page.classList.add("intro-on");
    }
    if (!engine) engine = e;
    if (phase !== "active") return;
    const d = DRILLS[idx];

    stats.elapsed += dt;
    feedEvents(events, d);

    // 动作完成后先停留，让传球/投篮/扣篮动画播完再进入下一项
    if (drillDone) {
      settleT -= dt;
      updateStrip("完成！", 1);
      if (settleT <= 0) advanceDrill();
      return;
    }

    const u = engine.user;
    if (d.id === "movement" && u) {
      if (lastPos) dist += Math.hypot(u.x - lastPos.x, u.y - lastPos.y);
      lastPos = { x: u.x, y: u.y };
      stats.reps = Math.min(d.target, Math.floor(dist / 10));
      // 走到发光点后点亮下一个
      const spot = MOVE_SPOTS[moveSpotIdx];
      if (spot && Math.hypot(u.x - spot[0], u.y - spot[1]) < 2.4) {
        moveSpotIdx++;
        setMoveSpot(moveSpotIdx);
      }
    }
    if (d.id === "passing") {
      const mode = engine.ball?.mode;
      if (mode === "pass" && lastBallMode !== "pass" && engine.ball?.pass?.from?.team === 0) stats.reps++;
      lastBallMode = mode;
    }
    if (d.id === "defense" && engine.offense !== 0) stats.defendS += dt;

    const p = drillProgress(d, stats);
    if (p >= 1 || stats.elapsed >= d.time) {
      drillDone = true;
      settleT = p >= 1 ? 1.4 : 0.5;
      updateStrip(p >= 1 ? "完成！" : "时间到，进入下一项", p);
      return;
    }
    updateStrip(d.tip, p);
  }

  handle = startMatchLoop(
    page,
    configFor(DRILLS[0].id),
    gameAudio,
    finishMatch,
    exitTutorial,
    { startingFive: false, record: false, onFrame }
  );
  gameAudio.setTrack(null);
  gameAudio.unlock();

  touchUI = createTouchUI(page);

  const g = game();
  if (g) g.classList.add("tut-on");
  page.insertAdjacentHTML("beforeend", `<div class="tut-strip">
      <div class="tut-text"><span class="tut-step"></span><b class="tut-hint"></b></div>
      <div class="tut-acts"><button data-tut="skip">跳过本项</button><button class="ghost" data-tut="exit">跳过教程</button></div>
      <i class="tut-prog"></i>
    </div><div class="tut-intro"><div class="panel">
      <h2>先认识按键</h2>
      <p class="tut-intro-sub">8 个小练习，约 2 分钟；跟着提示做一遍就开打。</p>
      <ul class="tut-keys">${CONTROLS.map(([k, t]) => `<li><i>${k}</i><span>${t}</span></li>`).join("")}</ul>
      <button class="tut-begin" type="button" data-tut="begin">开始训练</button>
      <button class="tut-skip-all" type="button" data-tut="skip-all">跳过教程，直接领首发</button>
    </div></div><div class="tut-result" hidden></div><div class="tut-done" hidden></div>`);
  page.addEventListener("click", (ev) => {
      const t = ev.target.closest("[data-tut]")?.dataset.tut;
      if (t === "begin") {
        begun = true;
        page.querySelector(".tut-intro")?.setAttribute("hidden", "");
        page.classList.remove("intro-on");
        if (engine) engine.paused = false;
        phase = "active";
        phaseT = 0;
        updateStrip(DRILLS[idx].tip, 0);
        return;
      }
      if (t === "skip-all") { finishMatch(); return; }
      if (t === "skip") { advanceDrill(); return; }
      if (t === "exit") { exitTutorial(); return; }
      const d = ev.target.closest("[data-done]")?.dataset.done;
      if (d === "exit") {
        finished = true;
        handle?.stop();
        gameAudio.setTrack("menu");
        actions.onExit?.();
        return;
      }
      if (d === "match") {
        finished = true;
        handle?.stop();
        gameAudio.setTrack("menu");
        actions.onStartMatch?.();
      }
      if (d === "continue") {
        finished = true;
        handle?.stop();
        gameAudio.setTrack("menu");
        actions.onContinue?.();
      }
    });
}
