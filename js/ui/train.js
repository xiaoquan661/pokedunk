/**
 * ui/train.js —— 培养页（S16）
 * 两个 tab：
 *   草地：SVG 草坪场景，拥有的精灵可直接拖上草地挂机（2 经验/分钟，无上限）；拖出草地即收回
 *   训练：给精灵分配训练点（自由点 / 返还点 / 购买点）+ 一键推荐 + 广告 +5 + 重置
 */
import { loadSave, writeSave } from "../storage.js?v=574";
import { gameAudio } from "../platform/audio.js?v=574";
import { watchRewardedAd } from "../platform/ads.js";
import { adLeft, adUse } from "../platform/ad-caps.js?v=574";
import { getPokemon, POSITION_WEIGHTS } from "../../engine/readable/play-core.js?v=574";
import {
  STAT_KEYS, STAT_ZH, growthStats, mainOVR, trainCaps, trainPrice, trainStat, resetTrain,
  ITEM_TYPES, itemCount, useItem,
} from "../systems/build.js?v=574";
import {
  grassState, grassCandidates, placeOnGrass, collectGrass, removeFromGrass, isStarter,
} from "../systems/grass.js?v=574";
import { openDetail } from "./detail.js?v=574";

const AD_TRAIN_MAX = 3;
const AD_TRAIN_POINTS = 10;
const POS_CN = { PG: "控卫", SG: "分卫", SF: "小前", PF: "大前", C: "中锋" };

const CSS = `
.tn-tabs{display:flex;gap:6px;margin:8px 0 10px}
.tn-tabs button{flex:1;padding:8px 0;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.14));
  background:rgba(0,0,0,.2);color:var(--text-dim);font:700 12px var(--sport)}
.tn-tabs button.on{border-color:var(--gold);color:var(--gold);background:rgba(245,197,66,.14)}
/* —— 草坪场景 —— */
.gs-field{position:relative;height:196px;border-radius:10px;overflow:hidden;border:1px solid rgba(103,196,120,.4);background:#0d2418}
.gs-svg{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.gs-cloud-g{animation:gsCloudMove 26s linear infinite}
.gs-cloud-g.c2{animation-duration:34s;animation-delay:-8s}
.gs-cloud-g.c3{animation-duration:46s;animation-delay:-18s}
.gs-blade{transform-origin:bottom center;animation:gsBladeSway 3.2s ease-in-out infinite alternate}
.gs-blade:nth-child(2n){animation-delay:.6s}
.gs-blade:nth-child(3n){animation-delay:1.2s}
.gs-blade:nth-child(5n){animation-delay:1.8s}
.gs-sun-glow{animation:gsSunPulse 5s ease-in-out infinite}
.gs-spot{position:absolute;bottom:14px;width:112px;margin-left:-56px;display:flex;flex-direction:column;align-items:center;gap:2px;
  touch-action:none;user-select:none;cursor:grab}
.gs-spot.dragging{opacity:.35}
.gs-field.drop{border-color:var(--gold);box-shadow:inset 0 0 0 2px rgba(245,197,66,.5)}
.gs-spot.s0{left:21%}
.gs-spot.s1{left:50%}
.gs-spot.s2{left:79%}
.gs-spot .gs-chip{font:700 9px var(--sport);color:#eaf7ee;background:rgba(6,20,12,.62);
  border:1px solid rgba(255,255,255,.16);border-radius:9px;padding:1px 6px;white-space:nowrap;
  max-width:108px;overflow:hidden;text-overflow:ellipsis}
.gs-spot .gs-chip em{font-style:normal;color:#9fe0b0;font-variant-numeric:tabular-nums}
.gs-spot .gs-chip.full em{color:var(--gold)}
.gs-spot .gs-shadow{position:absolute;bottom:0;left:50%;width:44px;height:8px;margin-left:-22px;border-radius:50%;
  background:rgba(0,0,0,.42);filter:blur(1px)}
.gs-mon{width:60px;height:60px;object-fit:contain;image-rendering:pixelated;cursor:pointer;
  filter:drop-shadow(0 3px 4px rgba(0,0,0,.6));
  animation:gsWalk 5.4s ease-in-out infinite alternate,gsBob 1.25s ease-in-out infinite}
.gs-spot.s1 .gs-mon{animation-duration:6.4s,1.45s;animation-delay:-1.4s}
.gs-spot.s2 .gs-mon{animation-duration:4.9s,1.1s;animation-delay:-2.6s}
.gs-spot.sel .gs-chip{border-color:var(--gold);color:var(--gold)}
.gs-spot.sel .gs-shadow{background:rgba(245,197,66,.5)}
.gs-empty-hint{position:absolute;left:0;right:0;bottom:26px;text-align:center;font-size:10px;
  color:rgba(255,255,255,.62);text-shadow:0 1px 2px rgba(0,0,0,.65);pointer-events:none}
.gs-actions{display:flex;align-items:center;gap:7px;margin-top:7px;padding:7px 9px;border-radius:8px;
  border:1px solid rgba(245,197,66,.35);background:rgba(245,197,66,.08)}
.gs-actions .ga-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.gs-actions .ga-txt b{font-size:11.5px}
.gs-actions .ga-txt small{font-size:9.5px;color:var(--text-dim)}
.gs-actions button{flex:none;padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.2);
  background:rgba(0,0,0,.28);color:#dfe8ff;font:700 10px var(--sport)}
.gs-actions button.hot{border-color:var(--gold);color:var(--gold);background:rgba(245,197,66,.16)}
.gs-actions button:disabled{opacity:.45}
/* —— 拥有的精灵（拖入草地） —— */
.gs-pool-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:11px 0 6px}
.gs-pool-h b{font:800 12px var(--sport);color:var(--text)}
.gs-pool-h small{font-size:9.5px;color:var(--text-dim)}
.gs-pool{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.gs-pool button{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px 5px;border-radius:8px;
  border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.22);color:inherit;
  touch-action:none;user-select:none;cursor:grab}
.gs-pool button img{width:40px;height:40px;object-fit:contain;image-rendering:pixelated;pointer-events:none}
.gs-pool button b{font-size:9px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
.gs-pool button small{font-size:8.5px;color:var(--text-dim);pointer-events:none}
.gs-pool button .pool-tag{position:absolute;top:2px;right:3px;font:700 7.5px var(--sport);color:#0b1a10;
  background:#8fe0a4;border-radius:6px;padding:0 3px}
.gs-pool button:active{border-color:rgba(103,196,120,.75);background:rgba(52,132,74,.2)}
.gs-ghost{position:fixed;z-index:99995;width:64px;height:64px;object-fit:contain;image-rendering:pixelated;
  pointer-events:none;transform:translate(-50%,-60%);filter:drop-shadow(0 6px 8px rgba(0,0,0,.55))}
.gs-none{font-size:11px;color:var(--text-dim);padding:10px 2px}
/* —— 训练 tab —— */
.tn-pick-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 7px}
.tn-pick-row .tp-label{font:700 10.5px var(--sport);color:var(--text-dim)}
.tn-pick-row .tp-btn{padding:6px 12px;border-radius:14px;border:1px solid var(--line,rgba(255,255,255,.16));
  background:rgba(0,0,0,.22);color:var(--text);font:700 10.5px var(--sport)}
.tn-pick-row .tp-btn.on{border-color:var(--gold);color:var(--gold);background:rgba(245,197,66,.12)}
.tn-picker{display:flex;flex-direction:column;gap:5px;margin-bottom:9px;padding:8px;border-radius:8px;
  border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);max-height:300px;overflow-y:auto;overscroll-behavior:contain}
.tn-pk-grp{font:700 9.5px var(--sport);color:var(--text-dim);padding:2px 2px 1px}
.tn-pk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.tn-pk{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:7px;
  border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.2);color:var(--text-dim)}
.tn-pk .pk-pts{position:absolute;top:2px;right:3px;font:700 8px var(--sport);font-style:normal;color:#111;
  background:var(--gold,#f5c542);border-radius:6px;padding:0 3px;line-height:1.35}
.tn-pk img{width:38px;height:38px;object-fit:contain;image-rendering:pixelated}
.tn-pk b{font-size:9.5px;color:var(--text);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tn-pk small{font-size:8px}
.tn-pk.on{border-color:var(--gold);background:rgba(245,197,66,.14)}
.tn-pk.on b{color:var(--gold)}
.tn-card{position:relative;display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;
  border:1px solid rgba(245,197,66,.32);background:linear-gradient(160deg,rgba(245,197,66,.12),rgba(8,14,24,.6))}
.tn-card .tc-pts{position:absolute;top:6px;right:8px;font:700 9.5px var(--sport);color:#111;
  background:var(--gold,#f5c542);border-radius:8px;padding:2px 7px;font-style:normal}
.tn-card .tc-pts.none{background:rgba(255,255,255,.1);color:var(--text-dim)}
.tn-card img{width:62px;height:62px;object-fit:contain;image-rendering:pixelated}
.tn-card .tc-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.tn-card .tc-info b{font:800 15px var(--sport)}
.tn-card .tc-info small{font-size:10.5px;color:var(--text-dim)}
.tn-points{display:flex;gap:8px;margin:8px 0;font:700 10px var(--sport);color:var(--text-dim)}
.tn-points b{color:var(--gold)}
.tn-stats{display:flex;flex-direction:column;gap:5px}
.tn-stat-row{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:7px;
  border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(0,0,0,.18)}
.tn-stat-row .sr-name{flex:0 0 42px;font:700 11.5px var(--sport);color:var(--text)}
.tn-stat-row .sr-bar{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}
.tn-stat-row .sr-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#f5c542,#ffe9a8)}
.tn-stat-row .sr-val{flex:0 0 26px;text-align:right;font:700 11px var(--sport);font-variant-numeric:tabular-nums}
.tn-stat-row button{flex:0 0 auto;width:30px;height:26px;border-radius:13px;border:1px solid rgba(245,197,66,.55);
  background:rgba(245,197,66,.12);color:var(--gold);font:800 14px/1 var(--sport)}
.tn-stat-row button:disabled{opacity:.3;border-color:var(--line);color:var(--text-dim);background:transparent}
.tn-items{display:flex;flex-direction:column;gap:5px}
.tn-item-row{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:7px;
  border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(0,0,0,.18)}
.tn-item-row .ii-name{flex:1;min-width:0;font:700 11px var(--sport);color:var(--text)}
.tn-item-row .ii-name small{display:block;font-weight:400;font-size:9px;color:var(--text-dim)}
.tn-item-row .ii-cnt{flex:none;font:700 10.5px var(--sport);color:var(--gold)}
.tn-item-row button{flex:none;padding:5px 10px;border-radius:11px;border:1px solid rgba(245,197,66,.5);
  background:rgba(245,197,66,.12);color:var(--gold);font:700 10px var(--sport)}
.tn-item-row button:disabled{opacity:.35;border-color:var(--line);color:var(--text-dim);background:transparent}
.tn-acts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
.tn-acts button{padding:9px 0;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.16));
  background:rgba(0,0,0,.22);color:var(--text);font:700 11px var(--sport)}
.tn-acts button.gold{border-color:var(--gold);color:var(--gold);background:rgba(245,197,66,.12)}
.tn-acts button:disabled{opacity:.4}
.tn-empty{padding:16px;text-align:center;color:var(--text-dim);font-size:11.5px}
@keyframes gsCloudMove{0%{transform:translateX(0)}100%{transform:translateX(150px)}}
@keyframes gsBladeSway{0%{transform:rotate(-6deg)}100%{transform:rotate(7deg)}}
@keyframes gsSunPulse{0%,100%{opacity:.8}50%{opacity:1}}
.gs-firefly{animation:gsFire 4.6s ease-in-out infinite}
.gs-firefly:nth-of-type(2){animation-delay:-1.2s}
.gs-firefly:nth-of-type(3){animation-delay:-2.4s}
.gs-firefly:nth-of-type(4){animation-delay:-3.1s}
.gs-firefly:nth-of-type(5){animation-delay:-.6s}
@keyframes gsFire{0%,100%{opacity:.2;transform:translateY(0)}50%{opacity:.95;transform:translateY(-3px)}}
.gs-wind{animation:gsWindSweep 9s linear infinite;pointer-events:none}
.gs-wind.w2{animation-duration:13s;animation-delay:-5.5s}
@keyframes gsWindSweep{0%{transform:translateX(0)}100%{transform:translateX(540px)}}
.gs-spore{animation:gsSporeFloat 7s ease-in-out infinite;transform-origin:center}
.gs-spore:nth-of-type(2){animation-delay:-1.6s}
.gs-spore:nth-of-type(3){animation-delay:-3.2s}
.gs-spore:nth-of-type(4){animation-delay:-4.5s}
.gs-spore:nth-of-type(5){animation-delay:-2.4s}
@keyframes gsSporeFloat{0%{opacity:0;transform:translate(0,4px)}25%{opacity:.85}
  60%{opacity:.7;transform:translate(7px,-10px)}100%{opacity:0;transform:translate(14px,-20px)}}
@keyframes gsWalk{0%{transform:translateX(-10px)}100%{transform:translateX(10px)}}
@keyframes gsBob{0%,100%{margin-bottom:0}50%{margin-bottom:3px}}
@media (prefers-reduced-motion:reduce){
  .gs-mon,.gs-cloud-g,.gs-blade,.gs-sun-glow,.gs-firefly,.gs-wind,.gs-spore{animation:none}
}
`;

function ensureCss() {
  if (document.getElementById("pj-train-style")) return;
  const st = document.createElement("style");
  st.id = "pj-train-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

const monName = (dex) => {
  const row = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return row ? String(row[1]).replace(/#\d+$/, "") : getPokemon(dex).name;
};
const freePts = (m) => (m.train?.free || 0) + (m.train?.bank || 0);

let toastTimer = null;
function toast(msg, ms = 2200) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/** 草坪 SVG：黄昏天空 / 太阳 / 云 / 双层远山 / 树林 / 草甸 / 多层草叶 / 萤火 */
const gsBlade = (x, y, h, lean) =>
  `M${x} ${y} C${x + lean * 0.12} ${y - h * 0.45}, ${x + lean * 0.58} ${y - h * 0.84}, ${x + lean} ${y - h} ` +
  `C${x + lean * 0.52} ${y - h * 0.66}, ${x + lean * 0.26} ${y - h * 0.28}, ${x + 2.3} ${y} Z`;

const gsBladeLayer = (count, from, to, baseY, hMin, hMax, lean, fill, op) => {
  const step = (to - from) / count;
  return `<g fill="${fill}" opacity="${op}">${Array.from({ length: count }, (_, i) => {
    const x = from + step * i + ((i * 37) % 9) * 0.35;
    const h = hMin + (((i * 53) % 7) / 6) * (hMax - hMin);
    const l = ((i % 3) - 1) * lean + ((((i * 29) % 5) - 2) * 0.55);
    return `<path class="gs-blade" d="${gsBlade(x, baseY, h, l)}"/>`;
  }).join("")}</g>`;
};

const gsTree = (x, y, s, fill) => `<g fill="${fill}">
    <path d="M${x} ${y} L${x - 7 * s} ${y} L${x} ${y - 13 * s} Z"/>
    <path d="M${x} ${y - 8 * s} L${x - 5.6 * s} ${y - 8 * s} L${x} ${y - 19 * s} Z"/>
    <path d="M${x} ${y - 15 * s} L${x - 4.2 * s} ${y - 15 * s} L${x} ${y - 24.5 * s} Z"/>
  </g>`;

const gsFlower = (x, y, c) =>
  `<g><path d="M${x} ${y} v-4.5" stroke="#4d9159" stroke-width="1"/>` +
  `<circle cx="${x}" cy="${y - 4.8}" r="1.8" fill="${c}"/><circle cx="${x}" cy="${y - 4.8}" r="0.6" fill="#fff6cf"/></g>`;

/* —— 随真实时间变化的天色 —— */
const rgb = (color) => {
  const m = String(color).match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(",").map((v) => parseFloat(v));
    return [p[0] || 0, p[1] || 0, p[2] || 0];
  }
  const h = String(color).replace("#", "");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
};
const mixColor = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
/** 关键帧：[小时, 颜色]，按当前小时插值 */
const colorAt = (stops, hour) => {
  for (let i = 0; i < stops.length - 1; i++) {
    const [h0, c0] = stops[i], [h1, c1] = stops[i + 1];
    if (hour >= h0 && hour <= h1) {
      return mixColor(c0, c1, h1 === h0 ? 0 : (hour - h0) / (h1 - h0));
    }
  }
  return stops[stops.length - 1][1];
};

// 0 点 / 黎明 / 上午 / 正午 / 下午 / 黄昏 / 入夜 / 深夜 / 24 点
const SKY_TOP = [[0,"#050a18"],[4.5,"#081528"],[6,"#243a5c"],[7.5,"#2f6d94"],[12,"#3b86b4"],[16.5,"#3f6f96"],[19,"#3c3a58"],[21,"#13223a"],[24,"#050a18"]];
const SKY_MID = [[0,"#0a1826"],[4.5,"#133044"],[6,"#6b4a5e"],[7.5,"#7fb4c4"],[12,"#a3d2d6"],[16.5,"#93a8b8"],[19,"#a46452"],[21,"#1b2c3c"],[24,"#0a1826"]];
const SKY_LOW = [[0,"#0d1f2e"],[4.5,"#1b3a48"],[6,"#d98756"],[7.5,"#a8d2c4"],[12,"#cfe6cf"],[16.5,"#c0b49a"],[19,"#c07a50"],[21,"#26343e"],[24,"#0d1f2e"]];
const GROUND_TOP = [[0,"#143f2b"],[4.5,"#1a4f34"],[6,"#2c6b45"],[7.5,"#3f9058"],[12,"#4aa263"],[16.5,"#43955c"],[19,"#3a7a4e"],[21,"#22553a"],[24,"#143f2b"]];

/** 天象：白天太阳、夜里月亮，沿弧线移动 */
function skyBody(hour) {
  const day = hour >= 6 && hour < 19.5;
  const t = day ? (hour - 6) / 13.5 : ((hour < 6 ? hour + 24 : hour) - 19.5) / 10.5;
  const x = 40 + t * 310;
  const y = 96 - Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 62;
  return { day, x, y, t };
}

export function grassSvg(now = Date.now()) {
  const d = new Date(now);
  const hour = d.getHours() + d.getMinutes() / 60;
  const body = skyBody(hour);
  const night = hour < 5.6 || hour > 20.2;
  const dusk = (hour >= 5 && hour < 7.4) || (hour >= 17.6 && hour <= 20.2);
  const top = colorAt(SKY_TOP, hour);
  const mid = colorAt(SKY_MID, hour);
  const low = colorAt(SKY_LOW, hour);
  const groundTop = colorAt(GROUND_TOP, hour);
  const groundMid = mixColor(groundTop, "#123a26", night ? .5 : .16);
  const groundDeep = mixColor(groundTop, "#143a26", .55);
  const groundDeepest = mixColor(groundTop, "#0a2116", .78);
  const starOp = night ? .8 : dusk ? .15 : 0;
  const fireOp = night ? 1 : dusk ? .55 : .12;
  const sunColor = body.day ? "#fff4c9" : "#e8eeff";
  const bodyGlow = body.day ? "rgba(255,246,208," : "rgba(210,224,255,";
  const lightColor = body.day ? "#e9ffd8" : "#b6f0ad";
  const stars = Array.from({ length: 26 }, (_, i) => {
    const sx = 6 + ((i * 61) % 378);
    const sy = 6 + ((i * 37) % 78);
    const sr = 0.5 + ((i * 13) % 5) * 0.16;
    return `<circle cx="${sx}" cy="${sy}" r="${sr.toFixed(2)}" opacity="${(0.35 + ((i * 17) % 6) * 0.1).toFixed(2)}"/>`;
  }).join("");

  return `<svg class="gs-svg" viewBox="0 0 390 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="gsSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset=".5" stop-color="${mid}"/>
      <stop offset=".8" stop-color="${low}"/><stop offset="1" stop-color="${groundTop}"/>
    </linearGradient>
    <linearGradient id="gsHillFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#357a66"/><stop offset="1" stop-color="#204f42"/>
    </linearGradient>
    <linearGradient id="gsHillMid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#27614e"/><stop offset="1" stop-color="#173d31"/>
    </linearGradient>
    <linearGradient id="gsGround" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${groundTop}"/><stop offset=".32" stop-color="${groundMid}"/>
      <stop offset=".68" stop-color="${groundDeep}"/><stop offset="1" stop-color="${groundDeepest}"/>
    </linearGradient>
    <linearGradient id="gsLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lightColor}" stop-opacity=".55"/><stop offset="1" stop-color="${lightColor}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="gsSunG" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${body.day ? "#fff6d0" : "#e8eeff"}" stop-opacity=".95"/>
      <stop offset=".38" stop-color="${body.day ? "#ffe9a0" : "#c8d8ff"}" stop-opacity=".5"/>
      <stop offset="1" stop-color="${body.day ? "#ffe9a0" : "#c8d8ff"}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gsCloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".26"/><stop offset="1" stop-color="#cfe6ff" stop-opacity=".06"/>
    </linearGradient>
    <radialGradient id="gsVig" cx=".5" cy=".42" r=".74">
      <stop offset=".52" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#03120c" stop-opacity=".52"/>
    </radialGradient>
    <linearGradient id="gsWind" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d6ffc8" stop-opacity="0"/>
      <stop offset=".5" stop-color="#d6ffc8" stop-opacity=".16"/>
      <stop offset="1" stop-color="#d6ffc8" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="390" height="200" fill="url(#gsSky)"/>
  ${starOp > 0 ? `<g fill="#eef4ff" opacity="${starOp}">${stars}</g>` : ""}
  <g class="gs-sun-glow">
    <circle cx="${body.x.toFixed(1)}" cy="${body.y.toFixed(1)}" r="50" fill="url(#gsSunG)"/>
    <circle cx="${body.x.toFixed(1)}" cy="${body.y.toFixed(1)}" r="24" fill="url(#gsSunG)" opacity=".9"/>
  </g>
  <circle cx="${body.x.toFixed(1)}" cy="${body.y.toFixed(1)}" r="9.5" fill="${sunColor}"/>
  <circle cx="${(body.x - 2.5).toFixed(1)}" cy="${(body.y - 2.5).toFixed(1)}" r="7" fill="#ffffff" opacity=".6"/>

  <g class="gs-cloud-g" fill="url(#gsCloud)">
    <ellipse cx="58" cy="36" rx="30" ry="8"/><ellipse cx="76" cy="30" rx="18" ry="7"/>
    <ellipse cx="36" cy="31" rx="14" ry="6"/><ellipse cx="96" cy="34" rx="10" ry="5"/>
  </g>
  <g class="gs-cloud-g c2" fill="url(#gsCloud)">
    <ellipse cx="200" cy="58" rx="24" ry="6.5"/><ellipse cx="214" cy="53" rx="13" ry="5.5"/>
    <ellipse cx="186" cy="54" rx="10" ry="5"/>
  </g>
  <g class="gs-cloud-g c3" fill="url(#gsCloud)" opacity=".7">
    <ellipse cx="298" cy="84" rx="27" ry="5.5"/><ellipse cx="282" cy="80" rx="12" ry="4.5"/>
  </g>

  <path d="M0 112 Q34 84 74 98 T150 92 Q196 76 246 94 T336 86 Q364 82 390 98 L390 200 L0 200 Z" fill="url(#gsHillFar)" opacity=".55"/>
  <path d="M0 112 Q34 84 74 98 T150 92 Q196 76 246 94 T336 86 Q364 82 390 98" fill="none" stroke="#8fd8b4" stroke-width="1.1" opacity=".22"/>
  <path d="M0 124 Q52 100 108 114 T214 108 Q268 96 322 112 T390 108 L390 200 L0 200 Z" fill="url(#gsHillMid)" opacity=".82"/>
  <path d="M0 124 Q52 100 108 114 T214 108 Q268 96 322 112 T390 108" fill="none" stroke="#9adfb8" stroke-width="1" opacity=".2"/>

  <g opacity=".97">
    ${gsTree(10, 132, .95, "#1a513c")}${gsTree(34, 131, 1.1, "#154634")}${gsTree(58, 133, .8, "#1c5740")}
    ${gsTree(84, 131, .95, "#154634")}
    ${gsTree(190, 133, .75, "#1a513c")}${gsTree(214, 131, .9, "#154634")}${gsTree(248, 133, .72, "#1a513c")}
    ${gsTree(300, 132, .85, "#1c5740")}${gsTree(322, 130, 1.05, "#154634")}${gsTree(346, 133, .78, "#1a513c")}
    ${gsTree(368, 131, .98, "#154634")}${gsTree(386, 133, .8, "#1c5740")}
  </g>
  <g fill="none" stroke="#cfe8d2" stroke-width="1.1" stroke-linecap="round" opacity=".35">
    <path d="M120 44 q3 -3 6 0 q3 -3 6 0"/>
    <path d="M141 36 q2.4 -2.4 4.8 0 q2.4 -2.4 4.8 0"/>
    <path d="M256 30 q2 -2 4 0 q2 -2 4 0"/>
  </g>
  <path d="M0 138 Q120 131 240 135 T390 133 L390 141 L0 141 Z" fill="#0c2d21" opacity=".22"/>

  <path d="M0 136 Q84 124 170 132 T330 128 Q362 126 390 130 L390 200 L0 200 Z" fill="url(#gsGround)"/>
  <path d="M0 136 Q84 124 170 132 T330 128 Q362 126 390 130 L390 150 Q300 144 210 148 T0 144 Z" fill="url(#gsLight)" opacity=".32"/>
  <ellipse cx="196" cy="152" rx="150" ry="26" fill="#d9ffd2" opacity=".07"/>

  <g fill="none" stroke="rgba(210,255,205,.09)" stroke-width="5" stroke-linecap="round">
    <path d="M8 152 Q100 144 190 151 T378 147"/>
    <path d="M-6 166 Q90 158 186 165 T392 160"/>
    <path d="M14 181 Q110 174 204 180 T386 176"/>
  </g>
  <g fill="none" stroke="rgba(6,28,18,.22)" stroke-width="4" stroke-linecap="round">
    <path d="M-4 159 Q92 152 188 158 T390 154"/>
    <path d="M8 174 Q104 167 200 173 T388 169"/>
  </g>

  <g>
    <ellipse cx="20" cy="158" rx="20" ry="9" fill="#2c7448"/>
    <ellipse cx="34" cy="154" rx="14" ry="8" fill="#358652"/>
    <ellipse cx="8" cy="154" rx="11" ry="7" fill="#2a6c44"/>
    <ellipse cx="372" cy="160" rx="18" ry="8" fill="#2c7448"/>
    <ellipse cx="358" cy="157" rx="12" ry="7" fill="#348252"/>
  </g>

  ${gsFlower(46, 168, "#f3a7c0")}${gsFlower(74, 178, "#ffe08a")}${gsFlower(112, 170, "#f4f4ff")}
  ${gsFlower(168, 183, "#ffd0e0")}${gsFlower(236, 172, "#ffe08a")}${gsFlower(278, 182, "#f3a7c0")}
  ${gsFlower(334, 169, "#f4f4ff")}${gsFlower(362, 180, "#ffe08a")}

  <g>
    <ellipse cx="86" cy="190" rx="9" ry="3.4" fill="#4a7a55" opacity=".85"/>
    <ellipse cx="84" cy="188.6" rx="6" ry="2.2" fill="#6d9a74" opacity=".7"/>
    <ellipse cx="312" cy="196" rx="7" ry="2.8" fill="#477652" opacity=".8"/>
  </g>
  ${gsBladeLayer(38, 0, 390, 202, 20, 32, 3.6, "#3d8c58", .85)}
  ${gsBladeLayer(34, 0, 390, 204, 14, 24, 3.1, "#54a56a", .9)}
  ${gsBladeLayer(30, 0, 390, 205, 9, 17, 2.5, "#74c681", .92)}
  ${gsBladeLayer(16, 0, 390, 207, 22, 36, 4.0, "#8ad690", .55)}

  <g fill="#ffe9a0" opacity="${fireOp}">
    <circle class="gs-firefly" cx="64" cy="146" r="1.6"/>
    <circle class="gs-firefly" cx="142" cy="158" r="2"/>
    <circle class="gs-firefly" cx="226" cy="150" r="1.4"/>
    <circle class="gs-firefly" cx="306" cy="160" r="1.8"/>
    <circle class="gs-firefly" cx="368" cy="146" r="1.3"/>
  </g>
  <g>
    <rect class="gs-wind" x="-110" y="140" width="90" height="60" fill="url(#gsWind)"/>
    <rect class="gs-wind w2" x="-110" y="140" width="90" height="60" fill="url(#gsWind)"/>
  </g>
  <g fill="#eaffd8">
    <circle class="gs-spore" cx="118" cy="168" r="1.1"/>
    <circle class="gs-spore" cx="196" cy="172" r=".9"/>
    <circle class="gs-spore" cx="264" cy="164" r="1.2"/>
    <circle class="gs-spore" cx="330" cy="174" r=".8"/>
    <circle class="gs-spore" cx="52" cy="176" r="1"/>
  </g>

  ${night ? `<rect width="390" height="200" fill="#04101f" opacity=".26" pointer-events="none"/>` : ""}
  <rect width="390" height="200" fill="url(#gsVig)" pointer-events="none"/>
</svg>`;
}

/**
 * 渲染培养页（openPageModal / showSub 挂载）。
 */
let pendingFocus = null;
/** 从精灵详情页「去升级」进入：下一次渲染直接定位到培养强化 + 对应精灵 */
export function focusTrainMon(monId) { pendingFocus = monId; }

export function renderTrain(page, save) {
  ensureCss();
  save = loadSave() || save;
  const ui = page.__trainUI ||= {
    tab: "grass", selGrass: null, selMon: null, pickOpen: false, noClick: 0,
  };
  ui.selMon ??= null;
  if (pendingFocus != null && save.mons?.[pendingFocus]) {
    ui.tab = "train";
    ui.selMon = pendingFocus;
    ui.pickOpen = false;
    pendingFocus = null;
  }

  const team = (save.team || []).filter((id) => save.mons[id]);

  function drawGrass() {
    const slots = grassState(save);
    const sel = ui.selGrass != null ? slots[ui.selGrass] : null;
    const filled = slots.filter((s) => !s.empty).length;
    const pool = grassCandidates(save);
    return `
      <div class="dsec">训练草地 <small>2 经验/分钟 · 无上限</small></div>
      <div class="gs-field">
        ${grassSvg()}
        ${slots.map((g) => {
          if (g.empty) return "";
          return `<div class="gs-spot s${g.index} ${ui.selGrass === g.index ? "sel" : ""}" data-gsel="${g.index}">
            <span class="gs-chip">${monName(g.mon.dex)} <em>+${g.xp}</em></span>
            <span class="gs-shadow"></span>
            <img class="gs-mon" src="./sprites/${g.mon.dex}.png" alt="" draggable="false">
          </div>`;
        }).join("")}
        ${filled === 0 ? `<span class="gs-empty-hint">把下方精灵拖到草地上开始挂机</span>` : ""}
      </div>
      ${sel && !sel.empty ? `<div class="gs-actions">
        <span class="ga-txt"><b>${monName(sel.mon.dex)} · Lv.${sel.mon.level}</b>
          <small>+${sel.xp} XP · 挂机中 · 拖出草地可收回</small></span>
        <button data-gcollect="${sel.index}" class="hot">领取</button>
        <button data-gremove="${sel.index}">收回</button>
      </div>` : ""}
      <div class="gs-pool-h"><b>拥有的精灵</b><small>${filled >= 3 ? "草地已满（3/3）" : `拖到草地上挂机 · ${filled}/3 · 首发会先确认`}</small></div>
      ${pool.length ? `<div class="gs-pool">${pool.map((id) => {
        const m = save.mons[id];
        return `<button data-poolmon="${id}" title="拖到草地上升级">
          <img src="./sprites/${m.dex}.png" alt="" draggable="false">
          <b>${monName(m.dex)}</b><small>Lv.${m.level}</small>
          ${isStarter(save, id) ? `<span class="pool-tag">首发</span>` : ""}
        </button>`;
      }).join("")}</div>` : `<p class="gs-none">所有精灵都在草地上了。</p>`}`;
  }

  /* —— 草地拖拽：下方精灵拖进草地；草地精灵拖出收回；轻点也能操作 —— */
  const fieldRect = () => page.querySelector(".gs-field")?.getBoundingClientRect();

  function doPlace(monId, target, autoBench) {
    const fresh = loadSave() || save;
    const r = placeOnGrass(fresh, target, monId, { autoBench });
    if (!r.ok) return toast(r.error);
    writeSave(fresh);
    save = fresh;
    gameAudio.play("coin");
    ui.selGrass = target;
    draw();
    if (r.benched) toast(`已从首发换下，${monName(fresh.mons[monId].dex)} 开始挂机`);
  }

  /** 首发上草地前的确认弹窗 */
  function confirmBenchThenGrass(monId, target) {
    const fresh = loadSave() || save;
    const mon = fresh.mons?.[monId];
    if (!mon) return toast("找不到这只精灵");
    const name = monName(mon.dex);
    const layer = document.createElement("div");
    layer.className = "pj-scrim page-modal";
    layer.style.cssText = "position:fixed;inset:0;z-index:99995;background:rgba(5,8,16,.78);display:grid;place-items:center;padding:14px";
    layer.innerHTML = `<div class="pj-page-card" style="width:100%;max-width:330px"><div class="sub-page pj-page-body" style="padding:16px">
      <div style="font:700 17px var(--sport);color:var(--gold);letter-spacing:.04em">放上草地</div>
      <p style="margin:9px 0 0;font-size:12px;line-height:1.65;color:var(--text-dim)">${name} 目前在首发阵容。放上草地会自动退出首发，并可能留下空位。是否继续？</p>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button type="button" data-gcancel style="flex:1;padding:11px 0;border:2px solid var(--line,#3a3a3a);border-radius:6px;background:transparent;color:var(--text-dim);font:700 12px var(--sport)">取消</button>
        <button type="button" data-gok style="flex:1;padding:11px 0;border:2px solid #8a6a00;border-radius:6px;background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52;font:700 12px var(--sport)">放上草地</button>
      </div>
    </div></div>`;
    const close = () => layer.remove();
    layer.addEventListener("click", (e) => {
      if (e.target === layer || e.target.closest("[data-gcancel]")) { close(); return; }
      if (e.target.closest("[data-gok]")) { close(); doPlace(monId, target, true); }
    });
    (document.getElementById("stage") || document.body).appendChild(layer);
  }

  function placeMon(monId, slot = null) {
    const fresh = loadSave() || save;
    const free = grassState(fresh).filter((s) => s.empty);
    if (!free.length) return toast("草地已满（3/3）");
    const target = slot == null ? free[0].index : slot;
    if (isStarter(fresh, monId)) return confirmBenchThenGrass(monId, target);
    doPlace(monId, target, false);
  }

  function recallMon(slot) {
    const fresh = loadSave() || save;
    const r = removeFromGrass(fresh, slot);
    if (!r.ok) return toast(r.error);
    writeSave(fresh);
    save = fresh;
    ui.selGrass = null;
    toast(r.gain > 0 ? `已收回，结算 ${r.gain} 经验` : "已收回");
    draw();
  }

  function nearestFreeSlot(x) {
    const rect = fieldRect();
    if (!rect) return null;
    const free = grassState(loadSave() || save).filter((s) => s.empty);
    if (!free.length) return null;
    const spots = [0.21, 0.5, 0.79];
    let best = free[0].index, bestD = Infinity;
    for (const s of free) {
      const d = Math.abs(x - (rect.left + rect.width * spots[s.index]));
      if (d < bestD) { bestD = d; best = s.index; }
    }
    return best;
  }

  let drag = null;

  function inField(x, y) {
    const r = fieldRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function endDrag(x, y, cancelled) {
    if (!drag) return;
    const d = drag;
    drag = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
    window.removeEventListener("pointercancel", onDragCancel);
    d.ghost.remove();
    d.el?.classList.remove("dragging");
    page.querySelector(".gs-field")?.classList.remove("drop");
    if (!d.moved) {
      if (d.fromSlot != null) {
        ui.selGrass = ui.selGrass === d.fromSlot ? null : d.fromSlot;
        draw();
      } else placeMon(d.monId);
      return;
    }
    ui.noClick = Date.now() + 400;
    if (cancelled) { draw(); return; }
    const hit = inField(x, y);
    if (d.fromSlot != null) {
      if (hit) { ui.selGrass = d.fromSlot; draw(); }
      else recallMon(d.fromSlot);
    } else if (hit) {
      const target = nearestFreeSlot(x);
      if (target == null) return toast("草地已满（3/3）");
      placeMon(d.monId, target);
    } else {
      toast("拖到草地上才能挂机");
    }
  }

  function moveGhost(x, y) {
    if (!drag) return;
    drag.ghost.style.left = x + "px";
    drag.ghost.style.top = y + "px";
  }

  function onDragMove(e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 7) {
      drag.moved = true;
      drag.el?.classList.add("dragging");
    }
    if (!drag.moved) return;
    if (e.cancelable) e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    page.querySelector(".gs-field")?.classList.toggle("drop", inField(e.clientX, e.clientY));
  }
  function onDragUp(e) { endDrag(e.clientX, e.clientY, false); }
  function onDragCancel() { endDrag(0, 0, true); }

  function beginDrag(e, monId, fromSlot, el, dex) {
    if ((e.button != null && e.button !== 0) || drag) return;
    const ghost = document.createElement("img");
    ghost.className = "gs-ghost";
    ghost.src = `./sprites/${dex}.png`;
    ghost.alt = "";
    ghost.style.left = e.clientX + "px";
    ghost.style.top = e.clientY + "px";
    document.body.appendChild(ghost);
    drag = { monId, fromSlot, el, ghost, x0: e.clientX, y0: e.clientY, moved: false };
    window.addEventListener("pointermove", onDragMove, { passive: false });
    window.addEventListener("pointerup", onDragUp);
    window.addEventListener("pointercancel", onDragCancel);
  }

  if (!page.__trainDragBound) {
    page.__trainDragBound = true;
    page.addEventListener("pointerdown", (e) => {
      const poolBtn = e.target.closest("[data-poolmon]");
      if (poolBtn) {
        const fresh = loadSave() || save;
        const monId = Number(poolBtn.dataset.poolmon);
        const mon = fresh.mons?.[monId];
        if (mon) beginDrag(e, monId, null, poolBtn, mon.dex);
        return;
      }
      const spot = e.target.closest("[data-gsel]");
      if (spot) {
        const fresh = loadSave() || save;
        const st = grassState(fresh)[Number(spot.dataset.gsel)];
        if (st && !st.empty) beginDrag(e, st.monId, st.index, spot, st.mon.dex);
      }
    });
  }

  function drawTrain() {
    const mons = [...(save.team || []), ...(save.box || [])].filter((id) => save.mons[id]);
    if (!mons.length) return `<div class="tn-empty">还没有精灵可以训练。</div>`;
    if (ui.selMon == null || !save.mons[ui.selMon]) ui.selMon = mons[0];
    const m = save.mons[ui.selMon];
    const teamIds = (save.team || []).filter((id) => save.mons[id]);
    const teamSet = new Set(teamIds);
    const boxIds = mons.filter((id) => !teamSet.has(id));
    const ptsOf = (mm) => (mm.train?.free || 0) + (mm.train?.bank || 0);
    const pickBtn = (id) => {
      const mm = save.mons[id];
      const pts = ptsOf(mm);
      return `<button class="tn-pk ${ui.selMon === id ? "on" : ""}" data-pick="${id}">
        <img src="./sprites/${mm.dex}.png" alt=""><b>${monName(mm.dex)}</b><small>Lv.${mm.level}</small>
        ${pts > 0 ? `<i class="pk-pts">+${pts}</i>` : ""}
      </button>`;
    };
    const picker = !ui.pickOpen ? "" : `<div class="tn-picker">
      ${teamIds.length ? `<div class="tn-pk-grp">队伍 · ${teamIds.length}</div><div class="tn-pk-grid">${teamIds.map(pickBtn).join("")}</div>` : ""}
      ${boxIds.length ? `<div class="tn-pk-grp">仓库 · ${boxIds.length}</div><div class="tn-pk-grid">${boxIds.map(pickBtn).join("")}</div>` : ""}
    </div>`;
    const b = getPokemon(m.dex);
    const caps = trainCaps(m);
    const tr = m.train || {};
    const freeLeft = (tr.bank || 0) + (tr.free || 0);
    const blocked = caps.points >= caps.totalCap || (freeLeft <= 0 && (tr.paid || 0) >= caps.paidCap);
    const assigned = save.assign?.[ui.selMon] || b.pos;
    const vals = growthStats(m);
    const ovr = Math.round(mainOVR(m));
    const rec = Object.entries(POSITION_WEIGHTS[assigned] || POSITION_WEIGHTS.PG)
      .sort((a, b2) => b2[1] - a[1]).slice(0, 3).map(([k]) => STAT_ZH[k]).join(" · ");
    return `
      <div class="tn-pick-row">
        <span class="tp-label">培养对象 · ${mons.length} 只</span>
        <button class="tp-btn ${ui.pickOpen ? "on" : ""}" data-open-picker>${ui.pickOpen ? "收起列表" : "更换精灵"}</button>
      </div>
      ${picker}
      <div class="tn-card">
        <i class="tc-pts${freeLeft > 0 ? "" : " none"}">可加点 ${freeLeft}</i>
        <img src="./sprites/${m.dex}.png" alt="">
        <span class="tc-info">
          <b>${monName(m.dex)}</b>
          <small>OVR ${ovr} · Lv.${m.level} · ${POS_CN[assigned] || assigned} · ${tr.points || 0}/${caps.totalCap} 点</small>
          <small>推荐：${rec}</small>
        </span>
      </div>
      <div class="tn-points">
        <span>自由 <b>${tr.free || 0}</b></span><span>返还 <b>${tr.bank || 0}</b></span>
        <span>购买 <b>${tr.paid || 0}/${caps.paidCap}</b></span><span>下一点 <b>${trainPrice(m)}</b> 币</span>
      </div>
      <div class="tn-stats">
        ${STAT_KEYS.map((k) => {
          const v = vals[k] || 0;
          return `<div class="tn-stat-row">
            <span class="sr-name">${STAT_ZH[k]}</span>
            <span class="sr-bar"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>
            <span class="sr-val">${v}</span>
            <button data-add="${k}" ${blocked || v >= 99 ? "disabled" : ""}>+</button>
          </div>`;
        }).join("")}
      </div>
      <div class="dsec">药剂 <small>该只道具 ${m.item?.points || 0}/20 · 每种最多 4 次</small></div>
      <div class="tn-items">
        ${Object.entries(ITEM_TYPES).map(([id, it]) => {
          const n = itemCount(save, id);
          const used = m.item?.used?.[id] || 0;
          return `<div class="tn-item-row">
            <span class="ii-name">${it.name}<small>${STAT_ZH[it.stat]} +1 · 该只 ${used}/4</small></span>
            <span class="ii-cnt">×${n}</span>
            <button data-useitem="${id}" ${n <= 0 || used >= 4 || (m.item?.points || 0) >= 20 ? "disabled" : ""}>使用</button>
          </div>`;
        }).join("")}
      </div>
      <div class="tn-acts">
        <button class="gold" data-recommend ${blocked ? "disabled" : ""}>按推荐分配（${freeLeft} 点可用）</button>
        <button data-ad ${adLeft("train_point", AD_TRAIN_MAX) <= 0 ? "disabled" : ""}>看广告 +${AD_TRAIN_POINTS} 点（${adLeft("train_point", AD_TRAIN_MAX)}/${AD_TRAIN_MAX}）</button>
        <button data-reset ${tr.points ? "" : "disabled"}>重置训练（返还 80%）</button>
        <button data-open-detail>打开完整详情</button>
      </div>`;
  }

  function draw() {
    save = loadSave() || save;
    page.innerHTML = `
      <div class="page-head"><button class="back" data-back>‹</button><h2>培养</h2><span class="count">${team.length + save.box.length} 只</span></div>
      <p class="page-sub">草地挂机升级 · 训练加点与药剂强化</p>
      <div class="tn-tabs">
        <button data-tab="grass" class="${ui.tab === "grass" ? "on" : ""}">草地</button>
        <button data-tab="train" class="${ui.tab === "train" ? "on" : ""}">培养强化</button>
      </div>
      ${ui.tab === "grass" ? drawGrass() : drawTrain()}
    `;
  }

  if (!page.__trainBound) {
    page.__trainBound = true;
    page.addEventListener("click", (e) => {
      if (e.target.closest("[data-back]")) { page.dispatchEvent(new CustomEvent("page-back")); return; }

      const tabBtn = e.target.closest("[data-tab]");
      if (tabBtn) { ui.tab = tabBtn.dataset.tab; draw(); return; }

      // —— 草地 ——
      if (Date.now() < (ui.noClick || 0)) return;
      const gcol = e.target.closest("[data-gcollect]");
      if (gcol) {
        const fresh = loadSave() || save;
        const r = collectGrass(fresh, Number(gcol.dataset.gcollect));
        if (!r.ok) return toast(r.error);
        writeSave(fresh);
        gameAudio.play("coin");
        const lv = r.after > r.before ? ` · 升到 Lv.${r.after}` : "";
        toast(`领取 ${r.gain} 经验${lv}`);
        draw();
        return;
      }
      const grem = e.target.closest("[data-gremove]");
      if (grem) {
        const fresh = loadSave() || save;
        const r = removeFromGrass(fresh, Number(grem.dataset.gremove));
        if (!r.ok) return toast(r.error);
        writeSave(fresh);
        ui.selGrass = null;
        toast(r.gain > 0 ? `已放回，结算 ${r.gain} 经验` : "已放回");
        draw();
        return;
      }

      // —— 训练 ——
      if (e.target.closest("[data-open-picker]")) { ui.pickOpen = !ui.pickOpen; draw(); return; }
      const pick = e.target.closest("[data-pick]");
      if (pick) {
        ui.selMon = Number(pick.dataset.pick);
        ui.pickOpen = false;
        draw();
        return;
      }
      const add = e.target.closest("[data-add]");
      if (add && ui.selMon != null) {
        const fresh = loadSave() || save;
        const mon = fresh.mons[ui.selMon];
        if (!mon) return;
        const before = growthStats(mon)[add.dataset.add] || 0;
        const r = trainStat(fresh, mon, add.dataset.add);
        if (!r.ok) return toast(r.error);
        writeSave(fresh);
        gameAudio.play("coin");
        const after = growthStats(mon)[add.dataset.add] || 0;
        toast(`${STAT_ZH[add.dataset.add]} ${before} → ${after}${r.free ? " · 使用自由点" : ` · -${r.price} 币`}`);
        draw();
        return;
      }
      const useBtn = e.target.closest("[data-useitem]");
      if (useBtn && ui.selMon != null) {
        const fresh = loadSave() || save;
        const mon = fresh.mons[ui.selMon];
        if (!mon) return;
        const id = useBtn.dataset.useitem;
        const stat = ITEM_TYPES[id].stat;
        const before = growthStats(mon)[stat] || 0;
        const r = useItem(fresh, mon, id);
        if (!r.ok) return toast(r.error);
        writeSave(fresh);
        gameAudio.play("coin");
        const after = growthStats(mon)[stat] || 0;
        toast(`${ITEM_TYPES[id].name}：${STAT_ZH[stat]} ${before} → ${after}`);
        draw();
        return;
      }
      const recBtn = e.target.closest("[data-recommend]");
      if (recBtn && ui.selMon != null) {
        const fresh = loadSave() || save;
        const mon = fresh.mons[ui.selMon];
        if (!mon) return;
        const assigned = fresh.assign?.[ui.selMon] || getPokemon(mon.dex).pos;
        const order = Object.entries(POSITION_WEIGHTS[assigned] || POSITION_WEIGHTS.PG)
          .sort((a, b2) => b2[1] - a[1]).map(([k]) => k);
        let used = 0;
        const freeLeft = () => (mon.train?.free || 0) + (mon.train?.bank || 0);
        for (const k of order) {
          while (freeLeft() > 0 && growthStats(mon)[k] < 99) {
            // 只用自由/返还点，绝不触发扣币
            const r = trainStat(fresh, mon, k);
            if (!r.ok || !r.free) break;
            used++;
          }
          if (freeLeft() <= 0) break;
        }
        if (!used) return toast("没有可用的自由/返还点");
        writeSave(fresh);
        gameAudio.play("coin");
        toast(`已按${POS_CN[assigned] || assigned}推荐分配 ${used} 点`);
        draw();
        return;
      }
      const resetBtn = e.target.closest("[data-reset]");
      if (resetBtn && ui.selMon != null) {
        const fresh = loadSave() || save;
        const mon = fresh.mons[ui.selMon];
        if (!mon) return;
        const r = resetTrain(mon);
        if (!r.ok) return toast(r.error);
        writeSave(fresh);
        toast(`已重置训练，返还 ${r.refund} 点`);
        draw();
        return;
      }
      const adBtn = e.target.closest("[data-ad]");
      if (adBtn && ui.selMon != null) {
        adBtn.disabled = true;
        adBtn.textContent = "广告中…";
        watchRewardedAd("train_point").then((ad) => {
          if (!ad.ok) return toast(ad.message || "广告暂不可用");
          if (!adUse("train_point", AD_TRAIN_MAX)) return toast("今日广告训练点已用完");
          const fresh = loadSave() || save;
          const mon = fresh.mons[ui.selMon];
          if (!mon) return;
          mon.train ||= { points: 0, stats: {}, bank: 0, free: 0, freeEarned: 0, paid: 0 };
          mon.train.free = (mon.train.free || 0) + AD_TRAIN_POINTS;
          mon.train.freeEarned = (mon.train.freeEarned || 0) + AD_TRAIN_POINTS;
          writeSave(fresh);
          gameAudio.play("coin");
          toast(`广告奖励：自由训练点 +${AD_TRAIN_POINTS}`);
          draw();
        });
        return;
      }
      const openDetailBtn = e.target.closest("[data-open-detail]");
      if (openDetailBtn && ui.selMon != null) {
        const fresh = loadSave() || save;
        const mon = fresh.mons[ui.selMon];
        if (!mon) return;
        openDetail(mon.dex, ui.selMon, () => renderTrain(page, loadSave() || fresh));
        return;
      }
    });
  }

  draw();

  clearInterval(page.__trainTimer);
  page.__trainTimer = setInterval(() => {
    if (!page.isConnected) { clearInterval(page.__trainTimer); return; }
    if (ui.tab === "grass") draw();
  }, 15000);
}
