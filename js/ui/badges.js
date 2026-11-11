/**
 * ui/badges.js —— 道馆徽章：统一徽章图形、获得动画、徽章详情页
 * 8 枚徽章沿用现有徽章形状（奖牌 + 绶带），按道馆主题配色与图腾区分。
 */

const GLYPHS = {
  rock: `<path d="M5 16.5 L7.8 9.5 L13 7.2 L19 11 L17.2 17.2 L9.2 18.4 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.8 9.5 L12 14 L17.2 17.2 M12 14 L13 7.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
  water: `<path d="M12 4.5 C12 4.5 6.6 11.4 6.6 15.1 A5.4 5.4 0 0 0 17.4 15.1 C17.4 11.4 12 4.5 12 4.5 Z" fill="currentColor"/><path d="M9.4 14.6 A2.8 2.8 0 0 0 12.2 17" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.3" stroke-linecap="round"/>`,
  thunder: `<path d="M13.4 3.8 L5.8 13.4 L10.8 13.4 L9.8 20.4 L18.6 10.2 L13.2 10.2 Z" fill="currentColor"/>`,
  rainbow: `<path d="M4.4 17.6 A7.6 7.6 0 0 1 19.6 17.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7.4 17.6 A4.6 4.6 0 0 1 16.6 17.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><path d="M10.4 17.6 A1.6 1.6 0 0 1 13.6 17.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  soul: `<path d="M12 4.2 C12 4.2 7.2 10 7.2 13.6 A4.8 4.8 0 0 0 16.8 13.6 C16.8 10 12 4.2 12 4.2 Z" fill="currentColor"/><circle cx="9.4" cy="16.4" r="1.1" fill="currentColor"/><circle cx="14.8" cy="18.2" r=".9" fill="currentColor"/>`,
  psychic: `<path d="M12 6.2 A5.8 5.8 0 1 0 17.8 12 A4.2 4.2 0 1 1 13.6 7.8 A2.6 2.6 0 1 0 16.2 10.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  fire: `<path d="M3.4 19.4 L9.2 7.4 L12 12.2 L14.2 8.8 L20.6 19.4 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 7.4 L11 11.2 L9 14.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
  earth: `<path d="M4 15.4 H20 M6.4 18.6 H17.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M4.6 12.6 L8.4 9.2 L11.6 12.2 L15 8.4 L19.4 12.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`,
};

export const GYM_BADGES = [
  { badge: "Boulder", badgeCn: "灰色徽章", venueCn: "深灰道馆", color: "#a38c63", color2: "#2e271b", glyph: "rock" },
  { badge: "Cascade", badgeCn: "蓝色徽章", venueCn: "华蓝道馆", color: "#2bb3d6", color2: "#0b2c38", glyph: "water" },
  { badge: "Thunder", badgeCn: "橙色徽章", venueCn: "枯叶道馆", color: "#f2c522", color2: "#3a2f06", glyph: "thunder" },
  { badge: "Rainbow", badgeCn: "彩虹徽章", venueCn: "彩虹道馆", color: "#5cb85c", color2: "#13301a", glyph: "rainbow" },
  { badge: "Soul", badgeCn: "粉红徽章", venueCn: "浅红道馆", color: "#b04fc4", color2: "#2d1236", glyph: "soul" },
  { badge: "Marsh", badgeCn: "金色徽章", venueCn: "金黄道馆", color: "#f2668b", color2: "#3a1220", glyph: "psychic" },
  { badge: "Volcano", badgeCn: "深红徽章", venueCn: "红莲道馆", color: "#e8622c", color2: "#3d160b", glyph: "fire" },
  { badge: "Earth", badgeCn: "绿色徽章", venueCn: "常磐道馆", color: "#7c9a3a", color2: "#1e2a0e", glyph: "earth" },
];

export const byBadge = (id) => GYM_BADGES.find((g) => g.badge === id) || GYM_BADGES[0];

/** 徽章奖牌 SVG；earned=false 时降低饱和度 */
export function badgeMedal(id, size = 64, opts = {}) {
  const g = byBadge(id);
  const earned = opts.earned !== false;
  return `<svg class="badge-medal${earned ? "" : " off"}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <path d="M22 33 L17.4 60 L32 50.6 L46.6 60 L42 33" fill="${g.color}" opacity="${earned ? ".9" : ".4"}" stroke="${g.color2}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="29.6" r="19" fill="${g.color}" opacity="${earned ? "1" : ".45"}" stroke="#f5e6a8" stroke-width="2.4"/>
    <circle cx="32" cy="29.6" r="15" fill="none" stroke="rgba(255,255,255,${earned ? ".55" : ".25"})" stroke-width="1.2"/>
    <g transform="translate(20 17.6)" color="#fff" opacity="${earned ? "1" : ".6"}">${GLYPHS[g.glyph] || GLYPHS.rock}</g>
  </svg>`;
}

const CSS = `
.bd-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 4px}
.bd-card{display:flex;align-items:center;gap:8px;padding:9px 8px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.045);min-width:0}
.bd-card.locked{opacity:.5;filter:grayscale(.7)}
.bd-card .badge-medal{flex:0 0 auto}
.bd-info{min-width:0;display:flex;flex-direction:column;gap:1px}
.bd-info b{font:700 12px var(--sport);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bd-info span{font-size:10px;color:var(--gold,#f5c542)}
.bd-info small{font-size:9px;color:rgba(255,255,255,.5);line-height:1.35}
.bd-note{margin:8px 0 0;font-size:10px;color:rgba(255,255,255,.45);text-align:center}
.page-head .badge-count{border:1px solid rgba(245,197,66,.45);background:rgba(245,197,66,.1);color:var(--gold,#f5c542);padding:4px 9px;border-radius:999px;font:700 11px var(--sport);cursor:pointer;white-space:nowrap}
.page-head .badge-count:active{transform:scale(.97)}
.screen-menu .badge-chip{cursor:pointer}
.sv-no{display:inline-block;min-width:22px;margin-right:6px;padding:1px 5px;border-radius:5px;background:rgba(245,197,66,.12);border:1px solid rgba(245,197,66,.35);color:rgba(255,224,138,.9);font:700 10px/1.4 var(--sport);text-align:center;font-style:normal}
.bgr{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;background:rgba(3,5,12,.88);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:bgrFade .22s ease;text-align:center;padding:18px}
.bgr-rays{position:absolute;width:360px;height:360px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(245,197,66,.28) 0deg 7deg,transparent 7deg 26deg);animation:bgrSpin 10s linear infinite;mask:radial-gradient(circle,#000 26%,transparent 68%);-webkit-mask:radial-gradient(circle,#000 26%,transparent 68%)}
.bgr-body{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center}
.bgr-medal{animation:bgrPop .72s cubic-bezier(.2,1.5,.4,1) both;filter:drop-shadow(0 0 26px rgba(245,197,66,.65))}
.bgr-kicker{margin:10px 0 4px;font:700 10px var(--sport);letter-spacing:.22em;color:rgba(245,197,66,.75)}
.bgr h2{margin:0 0 4px;font:700 24px var(--sport);color:var(--gold,#f5c542);text-shadow:0 2px 12px rgba(245,197,66,.35)}
.bgr-name{margin:0 0 18px;font-size:12px;color:rgba(255,255,255,.82)}
.bgr button{min-width:160px;padding:11px 18px;border-radius:11px;border:1px solid #8a6a00;background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52;font:700 13px var(--sport)}
.bgr-spark{position:absolute;width:5px;height:5px;border-radius:50%;background:#ffe89a;animation:bgrTwinkle 1.6s ease-in-out infinite}
@keyframes bgrFade{from{opacity:0}to{opacity:1}}
@keyframes bgrSpin{to{transform:rotate(360deg)}}
@keyframes bgrPop{0%{transform:scale(.35) rotate(-12deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes bgrTwinkle{0%,100%{opacity:0;transform:scale(.6)}50%{opacity:1;transform:scale(1.4)}}
`;

function ensureCss() {
  if (document.getElementById("pj-badge-style")) return;
  const st = document.createElement("style");
  st.id = "pj-badge-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

// 赛季页的徽章数字与徽章入口样式需要立即生效，不能等到打开详情页才注入
ensureCss();

function badgeRecord(s, venue) {
  const list = (s.results || []).filter((r) => r.venue === venue && r.small === 3 && r.win);
  return list[list.length - 1] || null;
}

/** 徽章详情页：8 枚道馆徽章 + 获取状态 */
export function openBadgeDetail(save, opts = {}) {
  ensureCss();
  const s = save?.journey?.season || {};
  const got = new Set(s.badges || []);
  const count = GYM_BADGES.filter((g) => got.has(g.badge)).length;

  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:1100;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body">
    <div class="page-head"><button class="back" data-bd-back>‹</button><h2>道馆徽章</h2><span class="count">${count} / 8</span></div>
    <p class="page-sub">击败道馆馆主获得徽章 · 集齐 8 枚挑战四天王</p>
    <div class="bd-grid">
      ${GYM_BADGES.map((g, i) => {
        const has = got.has(g.badge);
        const rec = badgeRecord(s, i);
        const sub = has ? (rec ? `S${rec.season || s.no} · ${rec.myScore}:${rec.oppScore}${rec.sim ? " 模拟" : ""}` : "已获得") : "击败馆主后获得";
        return `<div class="bd-card ${has ? "got" : "locked"}">
          ${badgeMedal(g.badge, 56, { earned: has })}
          <div class="bd-info"><b>${g.venueCn}</b><span>${g.badgeCn}</span><small>${sub}</small></div>
        </div>`;
      }).join("")}
    </div>
    <p class="bd-note">徽章会随赛季重置，成长与图鉴会保留。</p>
  </div></div>`;
  const close = () => { wrap.remove(); opts.onClose?.(); };
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-bd-back]")) close(); });
  document.body.appendChild(wrap);
}

/** 徽章获得动画：奖牌放大 + 金色光芒；点击收下后移除 */
export function playBadgeGrant(badgeId, opts = {}) {
  ensureCss();
  const g = byBadge(badgeId);
  const layer = document.createElement("div");
  layer.className = "bgr";
  const sparks = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const r = 110 + (i % 3) * 26;
    return `<i class="bgr-spark" style="left:calc(50% + ${Math.cos(a) * r}px);top:calc(50% + ${Math.sin(a) * r}px);animation-delay:${(i * 0.13).toFixed(2)}s"></i>`;
  }).join("");
  layer.innerHTML = `<div class="bgr-rays"></div>${sparks}
    <div class="bgr-body">
      <div class="bgr-medal">${badgeMedal(badgeId, 132)}</div>
      <p class="bgr-kicker">GYM BADGE</p>
      <h2>获得道馆徽章</h2>
      <p class="bgr-name">${g.venueCn} · ${g.badgeCn}</p>
      <button type="button" data-bgr-close>收 下 徽 章</button>
    </div>`;
  const close = () => { layer.remove(); opts.onClose?.(); };
  layer.addEventListener("click", (e) => {
    if (e.target === layer || e.target.closest("[data-bgr-close]")) close();
  });
  const show = () => {
    document.body.appendChild(layer);
    try { opts.onShow?.(); } catch (_) {}
  };
  if (opts.delay) setTimeout(show, opts.delay); else show();
  return { close };
}
