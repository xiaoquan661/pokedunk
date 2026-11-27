/**
 * ui/daily-score-hud.js —— 每日挑战局内计分显示
 * 悬浮在状态卡与记分牌之间的空隙里（不压球场、不盖比分板）；
 * 常态显示当前挑战分与今日权重，得分时同一张卡闪出大字加分播报。
 */
import { liveScore, scoreWeights } from "../systems/daily-score.js?v=688";

const CSS = `
.dsh{position:absolute;inset:0;z-index:36;pointer-events:none}
/* 与记分牌同宽同列，独立成一条，和记分牌之间留出间隙 */
.dsh-card{position:absolute;left:50%;top:calc(var(--safe-t,0px) + 118px);transform:translateX(-50%);
  width:calc(100% - 24px);max-width:366px;height:46px;padding:0 12px;
  background:#0a0d15;border:2px solid rgba(245,197,66,.45);border-radius:3px;
  display:flex;align-items:center;justify-content:center;gap:10px;
  opacity:0;transition:opacity .18s;overflow:hidden;white-space:nowrap}
.dsh-card.on{opacity:1}
.dsh-score{flex:none;display:flex;align-items:baseline;gap:4px}
.dsh-score b{font:800 28px/1 var(--sport);color:var(--gold);font-variant-numeric:tabular-nums}
.dsh-score small{font:700 8px/1 var(--sport);color:#9aa4c4;letter-spacing:.06em}
.dsh-tip{min-width:0;display:flex;align-items:center;padding-left:10px;border-left:1px solid rgba(255,255,255,.14)}
.dsh-tip i{font:700 10.5px/1.2 var(--sport);font-style:normal;color:#c3cbe4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-tip em{display:none;font:800 14px/1.15 var(--sport);font-style:normal;color:#ffe9a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-card.flash{border-color:rgba(255,233,168,.85)}
.dsh-card.flash .dsh-tip i{display:none}
.dsh-card.flash .dsh-tip em{display:block}
.dsh-card.flash .dsh-score b{animation:dshPop .32s cubic-bezier(.2,1.4,.4,1)}
@keyframes dshPop{0%{transform:scale(1)}45%{transform:scale(1.18);color:#fff}100%{transform:scale(1)}}
.game.rot .dsh,.game.landscape .dsh{display:none}
@media (orientation:landscape),(min-width:701px){.dsh{display:none}}
`;

function ensureCss() {
  if (document.getElementById("pj-dsh-style")) return;
  const st = document.createElement("style");
  st.id = "pj-dsh-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function createDailyScoreHud(root, modId) {
  const game = root.querySelector(".game");
  if (!game) return { onFrame() {}, destroy() {} };
  ensureCss();
  const w = scoreWeights(modId);
  const layer = document.createElement("div");
  layer.className = "dsh";
  layer.innerHTML = `
    <div class="dsh-card">
      <div class="dsh-score"><b data-dsh-total>0</b><small>挑战分</small></div>
      <div class="dsh-tip"><i>${w.label}</i><em data-dsh-flash></em></div>
    </div>`;
  game.appendChild(layer);
  const card = layer.querySelector(".dsh-card");
  const totalEl = layer.querySelector("[data-dsh-total]");
  const flashEl = layer.querySelector("[data-dsh-flash]");
  let lastPaint = 0;
  let flashTimer = 0;
  let currentTotal = 0;

  function flash(text) {
    flashEl.textContent = text;
    card.classList.add("flash");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      card.classList.remove("flash");
      totalEl.textContent = String(currentTotal);
    }, 1300);
  }

  function onFrame(engine, events) {
    const now = performance.now();
    if (now - lastPaint > 150) {
      lastPaint = now;
      const s = liveScore(engine, modId);
      currentTotal = s.total;
      card.classList.add("on");
      if (!card.classList.contains("flash")) totalEl.textContent = String(s.total);
    }
    for (const ev of events || []) {
      if (!ev.player || ev.player.team !== (engine?.viewTeam ?? 0)) continue;
      if (ev.kind === "score") {
        const three = ev.points === 3;
        const dunk = ev.how === "dunk";
        const add = (ev.points || 0) + (three ? w.tpm : 0) + (dunk ? w.dnk : 0);
        flash(`${three ? "三分" : dunk ? "扣篮" : "得分"} +${add} 挑战分`);
      } else if (ev.kind === "steal") {
        flash(`抢断 +${w.stl} 挑战分`);
      } else if (ev.kind === "block") {
        flash(`盖帽 +${w.blk} 挑战分`);
      }
    }
  }

  function destroy() {
    clearTimeout(flashTimer);
    layer.remove();
  }

  return { onFrame, destroy };
}
