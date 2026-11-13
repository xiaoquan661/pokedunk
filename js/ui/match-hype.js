/**
 * ui/match-hype.js —— 比赛内「必杀」现场特写（v2）
 * 监听引擎事件，只在 kind === "special" 时触发（双方都播）。
 * 设计：斜切能量带 + 大立绘 + 必杀大字 + 招式名，不暂停比赛。
 */

const MOVE_CN = {
  "VOLT TACKLE": "伏特攻击",
  "EXTREME SPEED": "神速",
  "TAILWIND": "顺风",
  "CALM MIND": "冥想",
  "MOONBLAST": "月亮之力",
  "IRON FOCUS": "钢铁专注",
  "PHANTOM FORCE": "潜灵奇袭",
  "SUCKER PUNCH": "突袭",
  "TOXIC SPIKES": "毒菱",
  "BLAST BURN": "爆炸烈焰",
  "OUTRAGE": "逆鳞",
  "EARTHQUAKE": "地震",
  "ROCK SLIDE": "岩崩",
  "CLOSE COMBAT": "近身战",
  "SURF": "冲浪",
  "ICY WIND": "冰冻之风",
  "SLEEP POWDER": "催眠粉",
  "STRING SHOT": "吐丝",
};

const CSS = `
.mh{position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .1s ease}
.mh.on{opacity:1}
.mh-shade{position:absolute;inset:0;background:radial-gradient(circle at 32% 48%,transparent 0 16%,rgba(3,7,16,.38) 58%,rgba(3,7,16,.84) 100%)}
.mh-lines{position:absolute;inset:-10%;background:repeating-conic-gradient(from 205deg at 31% 50%,rgba(255,255,255,.08) 0 2deg,transparent 2deg 9deg);opacity:0;mix-blend-mode:screen}
.mh.on .mh-lines{animation:mhLines .6s ease-out both}
.mh-bar{position:absolute;left:0;right:0;height:0;background:linear-gradient(180deg,#030710,rgba(3,7,16,.65));transition:height .2s cubic-bezier(.2,.9,.3,1)}
.mh-bar.top{top:0}
.mh-bar.bottom{bottom:0;transform:rotate(180deg)}
.mh.on .mh-bar{height:7.5%}
.mh-cut{position:absolute;left:50%;top:50%;width:132%;height:min(320px,45vh);display:flex;align-items:center;gap:4px;padding:0 11% 0 12%;
  transform:translate(-50%,-50%) rotate(-7deg) translateX(-115%);
  background:
    radial-gradient(circle at 78% 50%,color-mix(in srgb,var(--mh-accent,#f5c542) 24%,transparent) 0,transparent 58%),
    linear-gradient(100deg,var(--mh-accent,#f5c542) 0%,color-mix(in srgb,var(--mh-accent,#f5c542) 72%,#0a1128) 33%,#0a1128 33.3%,#070d1d 100%);
  border-top:2px solid rgba(255,255,255,.85);border-bottom:1px solid rgba(255,255,255,.18);
  box-shadow:0 0 44px color-mix(in srgb,var(--mh-accent,#f5c542) 35%,transparent)}
.mh-cut::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.45;
  background:repeating-linear-gradient(115deg,rgba(255,255,255,.055) 0 1px,transparent 1px 16px)}
.mh.on .mh-cut{animation:mhCut .34s cubic-bezier(.16,1.08,.3,1) .12s both}
.mh-burst{position:absolute;left:-62px;top:50%;width:350px;height:350px;transform:translateY(-50%);border-radius:50%;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.18) 0 5deg,transparent 5deg 14deg);opacity:.6;filter:blur(.4px)}
.mh-aura{position:absolute;left:2%;top:50%;width:330px;height:330px;transform:translateY(-50%) scale(.5);border-radius:50%;
  background:radial-gradient(circle,color-mix(in srgb,var(--mh-fx,var(--mh-accent,#f5c542)) 42%,transparent) 0,transparent 66%);
  opacity:0;mix-blend-mode:screen;filter:blur(2px)}
.mh.on .mh-aura{animation:mhAura 2s ease-out both}
.mh-portrait{position:relative;z-index:2;width:41%;flex-shrink:0;display:grid;place-items:center}
.mh-ghost{position:absolute;z-index:1;width:176px;height:176px;object-fit:contain;image-rendering:pixelated;opacity:0;
  filter:blur(2px) saturate(1.4);mix-blend-mode:screen}
.mh.on .mh-ghost.g1{animation:mhGhost1 1.95s ease-out both}
.mh.on .mh-ghost.g2{animation:mhGhost2 1.95s ease-out both}
.mh-sprite{position:relative;z-index:2;width:176px;height:176px;object-fit:contain;image-rendering:pixelated;
  filter:drop-shadow(0 6px 7px rgba(0,0,0,.65)) drop-shadow(0 0 12px color-mix(in srgb,var(--mh-fx,var(--mh-accent,#f5c542)) 52%,transparent));
  opacity:0;transform:rotate(-5deg) scale(.7) translateY(18px)}
.mh.on .mh-sprite{animation:mhAction 1.98s cubic-bezier(.2,.8,.3,1) .05s both}
.mh-ring{position:absolute;z-index:1;width:226px;height:226px;border:2px solid color-mix(in srgb,var(--mh-fx,var(--mh-accent,#f5c542)) 74%,#fff);
  border-radius:50%;transform:rotate(-16deg) scale(.55);opacity:0;box-shadow:0 0 24px color-mix(in srgb,var(--mh-fx,var(--mh-accent,#f5c542)) 45%,transparent)}
.mh.on .mh-ring.r1{animation:mhRing .6s ease-out .06s both}
.mh.on .mh-ring.r2{animation:mhRing .6s ease-out 1.02s both}
.mh-impact{position:absolute;z-index:3;left:50%;top:50%;width:34px;height:34px;border:3px solid #fff;border-radius:50%;
  opacity:0;transform:translate(-50%,-50%) scale(.2);box-shadow:0 0 22px color-mix(in srgb,var(--mh-fx,var(--mh-accent,#f5c542)) 75%,transparent)}
.mh.on .mh-impact{animation:mhImpact 2s ease-out both}
.mh-copy{position:relative;z-index:2;min-width:0;flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:2px;
  padding-left:8px;border-left:3px solid color-mix(in srgb,var(--mh-accent,#f5c542) 80%,#fff);
  opacity:0;transform:translateX(46px)}
.mh.on .mh-copy{animation:mhCopy .3s cubic-bezier(.2,1.2,.35,1) .12s both}
.mh-kicker{font:700 8px var(--sport);letter-spacing:.24em;color:rgba(255,255,255,.62);line-height:1.2;white-space:nowrap}
.mh-name{font:700 12.5px var(--sport);color:rgba(255,255,255,.94);letter-spacing:.05em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(0,0,0,.32);padding:1px 6px;border-radius:3px}
.mh-label{display:flex;gap:3px;font:900 clamp(46px,14vw,60px)/.92 var(--sport);color:#fff;letter-spacing:.02em;
  -webkit-text-stroke:1px rgba(4,8,18,.55);
  text-shadow:0 3px 0 #040812,0 0 22px color-mix(in srgb,var(--mh-accent,#f5c542) 62%,transparent)}
.mh-label span{display:inline-block;opacity:0;transform:translateY(26px) scale(1.35) rotate(-4deg)}
.mh.on .mh-label span{animation:mhChar .24s cubic-bezier(.2,1.4,.35,1) both}
.mh.on .mh-label span:nth-child(2){animation-delay:.06s}
.mh-move{display:block;max-width:100%;margin-top:5px;padding:3px 12px 4px;border-radius:3px;
  background:var(--mh-accent,#f5c542);color:#0a1128;font:800 14px var(--sport);letter-spacing:.08em;
  transform:skewX(-10deg);box-shadow:0 2px 0 rgba(0,0,0,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mh-flash{position:absolute;inset:0;background:linear-gradient(105deg,transparent 18%,rgba(255,255,255,.32) 48%,transparent 78%);opacity:0;mix-blend-mode:screen}
.mh.on .mh-flash{animation:mhFlash .42s ease-out both}
.game.mh-zoom .stage{transform-origin:var(--mh-focus-x,50%) 54%;animation:mhCam 1.95s cubic-bezier(.2,.75,.25,1) both}
@keyframes mhCam{0%{transform:scale(1)}14%{transform:scale(1.28)}78%{transform:scale(1.28)}100%{transform:scale(1)}}
@keyframes mhCut{0%{transform:translate(-50%,-50%) rotate(-7deg) translateX(-115%)}100%{transform:translate(-50%,-50%) rotate(-7deg) translateX(0)}}
@keyframes mhLines{0%{opacity:0;transform:scale(1.2) rotate(-4deg)}35%{opacity:.9}100%{opacity:0;transform:scale(1) rotate(0)}}
@keyframes mhAura{0%{opacity:0;transform:translateY(-50%) scale(.45)}22%{opacity:.85;transform:translateY(-50%) scale(1)}72%{opacity:.55;transform:translateY(-50%) scale(1.06)}100%{opacity:0;transform:translateY(-50%) scale(1.15)}}
@keyframes mhGhost1{0%,10%{opacity:0;transform:translate(-28px,8px) rotate(-14deg) scale(.72)}22%{opacity:.52;transform:translate(-8px,2px) rotate(-8deg) scale(.96)}38%{opacity:0;transform:translate(10px,-2px) rotate(-4deg) scale(1.04)}100%{opacity:0}}
@keyframes mhGhost2{0%,46%{opacity:0;transform:translate(10px,0) rotate(-4deg) scale(.9)}56%{opacity:.42;transform:translate(24px,-2px) rotate(-2deg) scale(1.04)}72%{opacity:0;transform:translate(34px,-4px) rotate(0) scale(1.08)}100%{opacity:0}}
@keyframes mhAction{0%{opacity:0;transform:rotate(-20deg) scale(.6) translate(-32px,34px)}16%{opacity:1;transform:rotate(-8deg) scale(1.08) translate(0,0)}32%{transform:rotate(-4deg) scale(1.2) translate(14px,-4px)}46%{transform:rotate(-6deg) scale(1.08) translate(0,0)}70%{transform:rotate(-3deg) scale(1.24) translate(24px,-2px)}84%{transform:rotate(-5deg) scale(1.04) translate(0,0)}100%{opacity:1;transform:rotate(-5deg) scale(1) translate(0,0)}}
@keyframes mhRing{0%{opacity:0;transform:rotate(-16deg) scale(.4)}40%{opacity:1}100%{opacity:0;transform:rotate(-16deg) scale(1.35)}}
@keyframes mhImpact{0%,66%{opacity:0;transform:translate(-50%,-50%) scale(.15)}70%{opacity:1;transform:translate(-50%,-50%) scale(.9)}84%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}100%{opacity:0}}
@keyframes mhCopy{0%{opacity:0;transform:translateX(46px)}100%{opacity:1;transform:translateX(0)}}
@keyframes mhChar{0%{opacity:0;transform:translateY(26px) scale(1.35) rotate(-4deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}
@keyframes mhFlash{0%{opacity:0;transform:translateX(-24%)}35%{opacity:1}100%{opacity:0;transform:translateX(24%)}}
`;

function ensureCss() {
  if (document.getElementById("pj-mh-style")) return;
  const st = document.createElement("style");
  st.id = "pj-mh-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

const monName = (dex) => {
  const r = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return r ? String(r[1]).replace(/#\d+$/, "") : "";
};

export function createMatchHype(root) {
  const game = root.querySelector(".game");
  if (!game) return { onFrame() {}, destroy() {} };
  ensureCss();

  const layer = document.createElement("div");
  layer.className = "mh";
  layer.innerHTML = `
    <div class="mh-shade"></div>
    <div class="mh-lines"></div>
    <div class="mh-bar top"></div><div class="mh-bar bottom"></div>
    <div class="mh-cut">
      <div class="mh-burst"></div>
      <div class="mh-aura"></div>
      <div class="mh-portrait">
        <img class="mh-ghost g1" alt=""><img class="mh-ghost g2" alt="">
        <span class="mh-ring r1"></span><span class="mh-ring r2"></span>
        <img class="mh-sprite" alt=""><span class="mh-impact"></span>
      </div>
      <div class="mh-copy">
        <span class="mh-kicker">SPECIAL</span>
        <span class="mh-name"></span>
        <b class="mh-label"><span>必</span><span>杀</span></b>
        <span class="mh-move"></span>
      </div>
    </div>
    <div class="mh-flash"></div>`;
  game.appendChild(layer);

  const img = layer.querySelector(".mh-sprite");
  const ghosts = layer.querySelectorAll(".mh-ghost");
  const name = layer.querySelector(".mh-name");
  const move = layer.querySelector(".mh-move");
  const FX_COLOR = {
    blaze: "#ff9a3d", quake: "#d9b25c", freeze: "#8ee6e9",
    phase: "#b28cff", lockin: "#82d8ff", surge: "#ffe45c",
  };
  let active = false;
  let last = -Infinity;
  let timer = 0;
  let pausedEngine = null;
  let pausedBefore = false;

  function onFrame(engine, events) {
    if (active) return;
    const ev = (events || []).find((e) => e.kind === "special" && e.player?.mon);
    if (!ev) return;
    const now = performance.now();
    if (now - last < 2200) return;
    last = now;

    const p = ev.player;
    const mon = p.mon;
    const accent = p.team === 0 ? "#f5c542" : "#ff7a90";
    layer.style.setProperty("--mh-accent", accent);
    layer.style.setProperty("--mh-fx", FX_COLOR[mon.special] || accent);
    game.style.setProperty("--mh-focus-x", p.team === 0 ? "32%" : "68%");
    img.src = `./sprites/${mon.dex}.png`;
    ghosts.forEach((g) => { g.src = img.src; });
    name.textContent = monName(mon.dex) || mon.name || "";
    move.textContent = MOVE_CN[mon.move] || mon.move || "必杀";
    // 特写期间冻结比赛，动作只存在于特写里
    pausedEngine = engine || null;
    pausedBefore = !!engine?.paused;
    if (engine) engine.paused = true;
    active = true;
    game.classList.add("mh-zoom");
    layer.classList.add("on");
    clearTimeout(timer);
    timer = setTimeout(() => {
      layer.classList.remove("on");
      game.classList.remove("mh-zoom");
      active = false;
      if (pausedEngine && !pausedBefore) {
        const menu = game.querySelector(".pause-menu");
        if (!menu || menu.hidden) pausedEngine.paused = false;
      }
      pausedEngine = null;
    }, 2000);
  }

  function destroy() {
    clearTimeout(timer);
    if (pausedEngine && !pausedBefore) pausedEngine.paused = false;
    pausedEngine = null;
    layer.remove();
    game.classList.remove("mh-zoom");
  }

  return { onFrame, destroy };
}
