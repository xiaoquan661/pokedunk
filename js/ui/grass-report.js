/**
 * ui/grass-report.js —— 草地离线收益弹窗
 * 玩家离线回来时，展示每只挂机精灵获得了多少经验、升了几级、是否进化。
 * 外观复用页面弹窗主题（黑色 / 复古体育等主题自动统一）。
 */
const CSS = `
.gr-card.pj-page-card{height:auto;max-height:80vh}
.gr-sub{margin:0 0 9px;font-size:10.5px;color:var(--text-dim)}
.gr-list{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow-y:auto;overscroll-behavior:contain}
.gr-row{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:4px;
  border:2px solid var(--line,rgba(255,255,255,.14));background:var(--panel-2,rgba(0,0,0,.22))}
.gr-row img{width:44px;height:44px;object-fit:contain;image-rendering:pixelated;flex:none}
.gr-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.gr-line{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.gr-line b{font:800 13px var(--r-font,var(--sport));color:var(--text)}
.gr-line em{font-style:normal;font:700 11px var(--sport);color:var(--gold)}
.gr-line .gr-lv{font:700 10.5px var(--sport);color:var(--text-dim)}
.gr-line .gr-lv i{font-style:normal;color:var(--gold)}
.gr-events{font-size:9.5px;line-height:1.5;color:var(--text-dim);white-space:pre-line}
.gr-badge{flex:none;align-self:flex-start;padding:1px 6px;border-radius:3px;font:800 9px var(--sport);
  color:#101010;background:var(--gold,#f5c542)}
.gr-foot{width:100%;padding:12px;margin-top:12px}
`;

function ensureCss() {
  if (document.getElementById("pj-grass-report-style")) return;
  const st = document.createElement("style");
  st.id = "pj-grass-report-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

const monName = (dex) => {
  const row = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return row ? String(row[1]).replace(/#\d+$/, "") : "#" + dex;
};

function eventText(ev) {
  return String(ev)
    .replace(/（[^）]*）/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param results settleOffline() 的返回数组
 * @param onClose 关闭后的回调
 */
export function showGrassReport(results, onClose = null) {
  if (!results || !results.length) return;
  ensureCss();
  const total = results.reduce((s, r) => s + r.gain, 0);
  const rows = results.map((r) => {
    const name = r.name || monName(r.dex);
    const lv = r.after > r.before
      ? `Lv.${r.before} <i>→</i> Lv.${r.after}`
      : `Lv.${r.before}`;
    const evs = r.events.slice(0, 4).map(eventText);
    if (r.events.length > 4) evs.push(`…等 ${r.events.length} 条`);
    return `<div class="gr-row">
      <img src="./sprites/${r.dex}.png" alt="">
      <div class="gr-info">
        <div class="gr-line"><b>${name}</b><em>+${r.gain} XP</em><span class="gr-lv">${lv}</span></div>
        <div class="gr-events">${evs.join("\n") || (r.maxed ? "已满级" : "经验已入账")}</div>
      </div>
      ${r.evolved ? `<span class="gr-badge">进化</span>` : ""}
    </div>`;
  }).join("");

  const ov = document.createElement("div");
  ov.className = "pj-scrim page-modal";
  ov.style.cssText = "position:fixed;inset:0;z-index:99990;display:grid;place-items:center;padding:10px";
  ov.innerHTML = `<div class="pj-page-card gr-card"><div class="sub-page pj-page-body">
    <div class="page-head">
      <button class="back" data-gr-close>‹</button>
      <h2>草地离线收益</h2><span class="count">共 ${total} XP</span>
    </div>
    <p class="gr-sub">离开期间精灵一直在草地上训练 · 2 经验/分钟</p>
    <div class="gr-list">${rows}</div>
    <button class="pk-btn-gold gr-foot" data-gr-close>知道了</button>
  </div></div>`;
  const close = () => { ov.remove(); onClose?.(); };
  ov.addEventListener("click", (e) => {
    if (e.target === ov || e.target.closest("[data-gr-close]")) close();
  });
  (document.getElementById("stage") || document.body).appendChild(ov);
}
