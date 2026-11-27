/**
 * ui/champion.js —— 总冠军颁奖庆典（2026-11-25 · S49）
 * ============================================
 * 移植原版夺冠结算的表现层：彩带 + 奖杯 + 冠军阵容 + 地区奖项（MVP 高亮）+ 联盟新闻。
 * 数据由 settle.js 在冠军结算时写入 journey.season.awards / mvp。
 * 入口：app.js 结算页检测到 r.champion 时自动打开，也提供手动按钮。
 */
import { ICON } from "./icons.js?v=697";

const AWARD_ICON = { mvp: "★", scoring: "分", dpoy: "防", smoy: "替", mip: "↑" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** 44 片彩带（与原版 .confetti 一致） */
function confettiHtml(colors) {
  const palette = [...colors, "#ffd866", "#ff7a59", "#5fe0a0", "#7aa2ff"];
  const pieces = Array.from({ length: 44 }, (_, i) =>
    `<i style="--x:${(i * 37) % 100}%;--d:${(((i * 53) % 18) / 10).toFixed(1)}s;--t:${(2.4 + ((i * 29) % 15) / 10).toFixed(1)}s;--r:${(i * 71) % 360}deg;--c:${palette[i % palette.length]}"></i>`
  ).join("");
  return `<div class="confetti" aria-hidden="true">${pieces}</div>`;
}

/**
 * 打开冠军庆典。
 * @param opts { save, awards, mvp, regionName, teamName, w, l, awardItem, legendPending, onLegend, onNext, onHome }
 * @returns close()
 */
export function openChampionCeremony(opts = {}) {
  const { save, awards = [], mvp, regionName = "地区", teamName = "我队", w = 0, l = 0, legendPending = null } = opts;
  const wrap = document.createElement("div");
  wrap.className = "champ-celebrate";
  wrap.style.cssText = "position:fixed;inset:0;z-index:970;overflow:auto;display:flex;flex-direction:column";

  const starters = (save?.team || []).slice(0, 5).map((id) => save?.mons?.[id]).filter(Boolean);
  const lineup = starters.map((m) => {
    const cn = (window.__PJ_DEX_ROWS || []).find((r) => r[0] === m.dex)?.[1] || "";
    return `<div class="champ-mon"><img src="./sprites/${m.dex}.png" alt=""><small>${esc(String(cn).replace(/#\d+$/, ""))}</small></div>`;
  }).join("");

  const awardRows = awards.length
    ? awards.map((a) => `<div class="champ-award${a.key === "mvp" ? " is-mvp" : ""}">
        <span class="ca-ico">${AWARD_ICON[a.key] || "★"}</span>
        <span class="ca-label">${esc(a.label)}</span>
        <b>${esc(a.name)}</b>
        <small>${esc(a.line)}</small>
      </div>`).join("")
    : `<p class="champ-empty">本地区出场不足 4 场，未产生个人奖项</p>`;

  wrap.innerHTML = `
    ${confettiHtml(["#f5c542", "#3b6fd8"])}
    <div class="champ-card">
      <p class="champ-kicker">${esc(regionName || "地区")}主线</p>
      <div class="champ-trophy">${ICON.trophy}</div>
      <h1 class="champ-title">总 冠 军</h1>
      <p class="champ-team">${esc(teamName)}<span>${w} 胜 ${l} 负</span></p>
      <div class="champ-lineup">${lineup}</div>
      <div class="champ-awards">${awardRows}</div>
      <p class="champ-news">联盟新闻：${esc(teamName)} 夺得${esc(regionName)}地区冠军${mvp ? `，${esc(mvp.name)} 当选地区 MVP` : ""}！</p>
      <div class="champ-acts">
        ${legendPending ? `<button class="pk-btn-gold" data-c="legend">✦ 选择地区传说</button>` : ""}
        <button class="pk-btn-gold" data-c="next">进入下一地区</button>
        <button class="pk-btn-gold pm-ghost" data-c="home">回 主 界 面</button>
      </div>
    </div>`;

  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-c]");
    if (!btn) return;
    const act = btn.dataset.c;
    if (act === "legend") { close(); opts.onLegend?.(); return; }
    close();
    if (act === "next") opts.onNext?.();
    else opts.onHome?.();
  });

  document.body.appendChild(wrap);
  return close;
}
