/**
 * ui/tutorial.js —— 新手教程（移植 pokedunk 的训练模式，适配 v2 竖屏 UI）
 * 使用引擎 practice + drill：移动 / 上篮 / 跳投 / 传球 / 空接 / 防守 / 抢断。
 * 教程使用独立的 5 人训练阵容，不读写生涯队伍与战绩。
 */
import { buildPlayer } from "../../engine/readable/play-core.js?v=16";
import { startMatchLoop } from "../../engine/readable/play-core.js?v=16";
import { gameAudio } from "../platform/audio.js?v=7";

const HOME_DEXES = [1, 4, 7, 25, 133];
const AWAY_DEXES = [16, 19, 21, 23, 27];

const DRILLS = [
  {
    id: "movement", title: "移动", metric: "move", target: 6, time: 32, keys: ["摇杆"],
    intro: "先熟悉脚步：拖动摇杆，移动到发光点。",
    tip: "斜向切入更快，别只走直线。",
  },
  {
    id: "layups", title: "上篮", metric: "reps", target: 4, time: 38, keys: ["X"],
    intro: "靠近篮筐后按 X 投篮上篮，先做 4 个。",
    tip: "离篮筐太远会变成跳投，先贴近再出手。",
  },
  {
    id: "jumpshots", title: "跳投", metric: "reps", target: 4, time: 42, keys: ["X"],
    intro: "按住 X 蓄力，在跳跃最高点松开。",
    tip: "绿色力度区松开，命中率最高。",
  },
  {
    id: "passing", title: "传球", metric: "reps", target: 6, time: 34, keys: ["A"],
    intro: "按 A 传球，把球送到空位队友手里。",
    tip: "传球会自动寻找空位，也可以配合摇杆指向。",
  },
  {
    id: "alleyoop", title: "空接", metric: "reps", target: 3, time: 38, keys: ["RB", "A"],
    intro: "按住 RB 加速，再按 A 向篮筐抛空接。",
    tip: "先加速再传球，队友会起跳接球扣篮。",
  },
  {
    id: "defense", title: "防守", metric: "defend", target: 12, time: 30, keys: ["摇杆"],
    intro: "用摇杆跟住对手，保持在对手和篮筐之间 12 秒。",
    tip: "别轻易起跳，先卡住突破路线。",
  },
  {
    id: "steals", title: "抢断", metric: "reps", target: 3, time: 34, keys: ["B"],
    intro: "靠近持球人，按 B 完成 3 次抢断。",
    tip: "离得太远会挥空，贴身再按。",
  },
];

const CONTROLS = [
  ["摇杆", "移动 / 防守跟人"],
  ["X", "投篮 · 按住蓄力"],
  ["A", "传球 · 空接时抛球"],
  ["B", "抢断"],
  ["RB", "加速"],
  ["Y", "必杀技"],
];

const CSS = `
.tut-strip{position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:35;display:flex;align-items:center;gap:8px;padding:9px 10px 10px;border:1px solid rgba(245,197,66,.4);border-radius:12px;background:rgba(8,14,32,.92);box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none}
.tut-strip .tut-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.tut-strip .tut-step{font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--gold);display:flex;align-items:center;gap:5px}
.tut-key{display:inline-block;min-width:18px;padding:1px 5px;border:1px solid rgba(245,197,66,.5);border-radius:5px;background:rgba(245,197,66,.14);color:#ffe08a;font:700 9px/1.5 var(--sport);letter-spacing:0;text-align:center}
.tut-strip .tut-hint{font-size:12px;line-height:1.35;color:#fff}
.tut-strip .tut-acts{display:flex;gap:5px;flex-shrink:0}
.tut-strip button{pointer-events:auto;border:1px solid rgba(245,197,66,.35);border-radius:8px;background:rgba(245,197,66,.12);color:#ffe08a;font:700 10px var(--sport);padding:7px 9px}
.tut-strip button.ghost{border-color:rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:rgba(255,255,255,.7)}
.tut-strip .tut-prog{position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:0 0 12px 12px;background:linear-gradient(90deg,var(--gold),#ffe89a);transform-origin:left;transform:scaleX(0);transition:transform .15s}
.game.tut-on .bug,.game.tut-on .pcard,.game.tut-on .sim-btn,.game.tut-on .rot-btn,.game.tut-on .pause-btn{display:none!important}
.tut-result,.tut-done,.tut-intro{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:18px;background:rgba(4,7,14,.72);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.tut-result[hidden],.tut-done[hidden],.tut-intro[hidden]{display:none}
.tut-intro .panel{text-align:left}
.tut-intro-sub{margin:0 0 10px;color:rgba(255,255,255,.72);font-size:12px;line-height:1.5}
.tut-keys{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px}
.tut-keys li{display:flex;align-items:center;gap:9px;padding:5px 8px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.04)}
.tut-keys li i{flex:0 0 52px;text-align:center;padding:3px 0;border:1px solid rgba(245,197,66,.5);border-radius:6px;background:rgba(245,197,66,.14);color:#ffe08a;font:700 10px var(--sport);font-style:normal}
.tut-keys li span{font-size:12px;color:rgba(255,255,255,.86)}
.tut-intro .tut-begin{width:100%;padding:11px 12px;border-radius:10px;border:1px solid #8a6a00;background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52;font:700 13px var(--sport)}
.screen-match.intro-on .tut-strip{opacity:.5}
.screen-match.intro-on .tut-strip [data-tut="skip"]{visibility:hidden}
.tut-result .panel,.tut-done .panel,.tut-intro .panel{width:min(340px,92vw);border-radius:16px;border:1px solid rgba(245,197,66,.45);background:linear-gradient(180deg,#1c376e,#0e1830);box-shadow:0 18px 50px rgba(0,0,0,.65);padding:18px 16px;text-align:center;color:#fff}
.tut-result h2,.tut-done h2,.tut-intro h2{margin:0 0 8px;font:700 20px var(--sport);color:var(--gold)}
.tut-result p,.tut-done p,.tut-intro p{margin:0 0 10px;color:rgba(255,255,255,.78);font-size:12px;line-height:1.55}
.tut-score b{font-size:24px;color:var(--gold)}
.tut-stars{font-size:26px;line-height:1;color:var(--gold);letter-spacing:.14em}
.tut-done-acts{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:12px}
.tut-done-acts button{flex:1;min-width:100px;padding:10px 12px;border-radius:10px;border:1px solid rgba(245,197,66,.45);background:rgba(245,197,66,.14);color:#ffe08a;font:700 12px var(--sport)}
.tut-done-acts button.primary{background:linear-gradient(180deg,#ffd75e,#f5c542);border-color:#8a6a00;color:#2a1b52}
.tut-sum{list-style:none;margin:0 0 12px;padding:0;text-align:left;font-size:12px}
.tut-sum li{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.tut-sum li:last-child{border-bottom:none}
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
  let stats = statsEmpty();
  let dist = 0;
  let lastPos = null;
  let lastBallMode = "";
  let started = false;
  let finished = false;

  const game = () => page.querySelector(".game");
  const strip = () => page.querySelector(".tut-strip");

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
    phase = "intro";
    phaseT = 0;
    stats = statsEmpty();
    dist = 0;
    lastPos = null;
    lastBallMode = "";
    const d = DRILLS[idx];
    if (engine) {
      engine.paused = false;
      engine.setDrill(d.id);
    }
    page.querySelector(".tut-result")?.setAttribute("hidden", "");
    page.querySelector(".tut-done")?.setAttribute("hidden", "");
    updateStrip(d.intro, 0);
    const skip = strip()?.querySelector('[data-tut="skip"]');
    if (skip) skip.hidden = false;
  }

  function feedEvents(events, d) {
    for (const ev of events || []) {
      const mine = ev.player && ev.player.team === 0;
      if (!mine) continue;
      if (ev.kind === "score") {
        if (d.id === "layups" && (ev.how === "layup" || ev.how === "dunk")) stats.reps++;
        if (d.id === "jumpshots" && ev.how === "jump") stats.reps++;
      } else if (ev.kind === "oop" && d.id === "alleyoop") {
        stats.reps++;
      } else if (ev.kind === "steal" && d.id === "steals") {
        stats.reps++;
      }
    }
  }

  function showResult(skipped = false) {
    phase = "done";
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
    finished = true;
    if (engine) engine.paused = true;
    const summary = DRILLS.map((d, i) => `<li><span>${i + 1}. ${d.title}</span><span>${i < idx || (i === idx && phase === "done") ? "✓" : "—"}</span></li>`).join("");
    const done = page.querySelector(".tut-done");
    done.innerHTML = `<div class="panel">
      <h2>教程完成</h2>
      <ul class="tut-sum">${summary}</ul>
      <p>现在可以去打一场真正的比赛了。</p>
      <div class="tut-done-acts">
        <button class="primary" data-done="exit">返回主页</button>
        <button data-done="again">重新训练</button>
      </div>
    </div>`;
    done.removeAttribute("hidden");
  }

  function exitTutorial() {
    if (finished) return;
    finished = true;
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
    if (engine.paused && phase !== "keys" && phase !== "done") return;
    if (phase === "keys") return;
    const d = DRILLS[idx];
    if (phase === "intro") {
      phaseT += dt;
      if (phaseT >= 2.4) { phase = "countdown"; phaseT = 0; updateStrip("准备… 3", 0); }
      return;
    }
    if (phase === "countdown") {
      phaseT += dt;
      const left = Math.max(1, 3 - Math.floor(phaseT));
      updateStrip(left > 1 ? `准备… ${left}` : "开始！", 0);
      if (phaseT >= 3) { phase = "active"; phaseT = 0; updateStrip(d.tip, 0); }
      return;
    }
    if (phase !== "active") return;

    stats.elapsed += dt;
    feedEvents(events, d);

    const u = engine.user;
    if (d.id === "movement" && u) {
      if (lastPos) dist += Math.hypot(u.x - lastPos.x, u.y - lastPos.y);
      lastPos = { x: u.x, y: u.y };
      stats.reps = Math.min(d.target, Math.floor(dist / 10));
    }
    if (d.id === "passing") {
      const mode = engine.ball?.mode;
      if (mode === "pass" && lastBallMode !== "pass" && engine.ball?.pass?.from?.team === 0) stats.reps++;
      lastBallMode = mode;
    }
    if (d.id === "defense" && engine.offense !== 0) stats.defendS += dt;

    const p = drillProgress(d, stats);
    updateStrip(p >= 1 ? "完成！" : d.tip, p);
    if (p >= 1 || stats.elapsed >= d.time) showResult(false);
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

  const g = game();
  if (g) g.classList.add("tut-on");
  page.insertAdjacentHTML("beforeend", `<div class="tut-strip">
      <div class="tut-text"><span class="tut-step"></span><b class="tut-hint"></b></div>
      <div class="tut-acts"><button data-tut="skip">跳过本项</button><button class="ghost" data-tut="exit">退出</button></div>
      <i class="tut-prog"></i>
    </div><div class="tut-intro"><div class="panel">
      <h2>先认识按键</h2>
      <p class="tut-intro-sub">比赛中随时会用到下面这些按钮。</p>
      <ul class="tut-keys">${CONTROLS.map(([k, t]) => `<li><i>${k}</i><span>${t}</span></li>`).join("")}</ul>
      <button class="tut-begin" type="button" data-tut="begin">开始训练</button>
    </div></div><div class="tut-result" hidden></div><div class="tut-done" hidden></div>`);
  page.addEventListener("click", (ev) => {
      const t = ev.target.closest("[data-tut]")?.dataset.tut;
      if (t === "begin") {
        page.querySelector(".tut-intro")?.setAttribute("hidden", "");
        page.classList.remove("intro-on");
        if (engine) engine.paused = false;
        phase = "intro";
        phaseT = 0;
        updateStrip(DRILLS[idx].intro, 0);
        return;
      }
      if (t === "skip") { showResult(true); return; }
      if (t === "exit") { exitTutorial(); return; }
      const r = ev.target.closest("[data-res]")?.dataset.res;
      if (r === "next") {
        if (idx >= DRILLS.length - 1) { showDone(); return; }
        startDrill(idx + 1);
        return;
      }
      if (r === "retry") { startDrill(idx); return; }
      if (r === "exit") { exitTutorial(); return; }
      const d = ev.target.closest("[data-done]")?.dataset.done;
      if (d === "exit") { exitTutorial(); return; }
      if (d === "again") {
        page.querySelector(".tut-done")?.setAttribute("hidden", "");
        finished = false;
        startDrill(0);
      }
    });
}
