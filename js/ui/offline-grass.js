/**
 * ui/offline-grass.js —— 进游戏时的离线收益弹窗
 *
 * 草地离线 ≥30 分钟时先展示 pending XP，玩家选择：
 *   - 一键收取
 *   - 看广告双倍（每日 1 次）
 * 收取后写回存档，并用 existing grass report 展示升级/进化汇总。
 */
import { loadSave, writeSave } from "../storage.js?v=684";
import { watchRewardedAd } from "../platform/ads.js?v=684";
import { adLeft, adUse } from "../platform/ad-caps.js?v=684";
import { gameAudio } from "../platform/audio.js?v=684";
import { claimOfflineGrass } from "../systems/grass.js?v=684";
import { showGrassReport } from "./grass-report.js?v=684";

const OFFLINE_CSS = `
.offline-card .off-lead{margin:0 0 10px;font-size:10.5px;line-height:1.5;color:var(--text-dim)}
.offline-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:12px 14px;margin-bottom:10px;border:1px solid rgba(245,197,66,.34);border-radius:10px;background:linear-gradient(160deg,rgba(245,197,66,.13),rgba(0,0,0,.18))}
.offline-hero .oh-main{display:flex;flex-direction:column;gap:2px}
.offline-hero .oh-main b{font:800 27px var(--sport);color:var(--gold);line-height:1}
.offline-hero .oh-main small{font-size:10px;color:var(--text-dim)}
.offline-hero .oh-side{text-align:right;font-size:10px;line-height:1.55;color:var(--text-dim)}
.offline-hero .oh-side b{display:block;color:var(--gold);font:700 13px var(--sport)}
.offline-list{display:flex;flex-direction:column;gap:7px;max-height:42vh;overflow-y:auto;overscroll-behavior:contain}
.offline-row{display:flex;align-items:center;gap:9px;padding:7px 9px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:6px;background:rgba(0,0,0,.18)}
.offline-row img{width:42px;height:42px;object-fit:contain;image-rendering:pixelated;flex:none}
.offline-row .or-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.offline-row .or-info b{font-size:11.5px;color:#fff;font-weight:600}
.offline-row .or-info small{font-size:9.5px;color:var(--text-dim)}
.offline-row .or-xp{flex:none;text-align:right;font:700 11px var(--sport);color:var(--gold);font-variant-numeric:tabular-nums}
.offline-row .or-xp em{display:block;font-style:normal;font-size:9px;color:var(--text-dim)}
.offline-badge{flex:none;padding:1px 5px;border-radius:3px;font:800 8.5px var(--sport);color:#101010;background:var(--gold)}
.offline-actions{display:flex;gap:8px;margin-top:12px}
.offline-actions button{flex:1;padding:11px 6px;border-radius:8px;font:700 12px var(--sport)}
.offline-actions .primary{border:2px solid #8a6a00;background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52}
.offline-actions .ad{border:2px solid rgba(245,197,66,.5);background:rgba(245,197,66,.1);color:var(--gold)}
.offline-actions button:disabled{opacity:.45}
.offline-note{margin:8px 0 0;font-size:9.5px;line-height:1.5;color:var(--text-dim)}
`;

function ensureCss() {
  if (document.getElementById("pj-offline-style")) return;
  const st = document.createElement("style");
  st.id = "pj-offline-style";
  st.textContent = OFFLINE_CSS;
  document.head.appendChild(st);
}

const monName = (dex) => {
  const row = (window.__PJ_DEX_ROWS || []).find((x) => Number(x[0]) === Number(dex));
  return row ? String(row[1]).replace(/#\d+$/, "") : "#" + dex;
};

function fmtAway(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

/**
 * @param save 当前存档
 * @param pending offlineGrassPending() 的返回
 * @param opts { onDone(freshSave) }
 */
export function showOfflineGrass(save, pending, opts = {}) {
  if (!pending || pending.total <= 0) { opts.onDone?.(save); return; }
  ensureCss();
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.78);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card offline-card"><div class="sub-page pj-page-body"></div></div>`;
  const body = wrap.querySelector(".pj-page-body");

  const rows = pending.rows.map((r) => {
    const lv = r.levels > 0
      ? `Lv.${r.before} <span style="color:var(--gold)">→</span> Lv.${r.after} · 升 ${r.levels} 级`
      : `Lv.${r.before}`;
    return `<div class="offline-row">
      <img src="./sprites/${r.dex}.png" alt="">
      <div class="or-info"><b>${monName(r.dex)}</b><small>${lv}</small></div>
      ${r.canEvolve ? `<span class="offline-badge">可进化</span>` : ""}
      <div class="or-xp">+${r.gain} XP<em>草地挂机</em></div>
    </div>`;
  }).join("");

  const adLeftN = adLeft("grass_offline", 1);
  body.innerHTML = `
    <div class="page-head"><button class="back" data-off-close>‹</button><h2>离线收益</h2><span class="count">离开 ${fmtAway(pending.idleMs)}</span></div>
    <p class="off-lead">草地上的伙伴一直在训练。收取后直接入账，升级和进化按正常规则结算。</p>
    <div class="offline-hero">
      <div class="oh-main"><b>${pending.total} XP</b><small>草地累计经验</small></div>
      <div class="oh-side"><b>${pending.count} 只</b>挂机精灵<br>${pending.canLevel} 只可升级${pending.canEvolve ? ` · ${pending.canEvolve} 只可进化` : ""}</div>
    </div>
    <div class="offline-list">${rows}</div>
    <div class="offline-actions">
      <button type="button" class="primary" data-off-claim>一键收取</button>
      <button type="button" class="ad" data-off-ad ${adLeftN > 0 ? "" : "disabled"}>${adLeftN > 0 ? "看广告双倍" : "今日双倍已用"}</button>
    </div>
    <p class="offline-note">离线收益 2 XP/分钟，不设上限；广告双倍每天 1 次。${pending.canEvolve ? " 达到进化等级的精灵需要到详情页手动进化。" : ""}</p>`;

  const close = () => wrap.remove();

  const claim = async (double) => {
    const btn = body.querySelector(double ? "[data-off-ad]" : "[data-off-claim]");
    if (btn?.disabled) return;
    if (double) {
      btn.disabled = true;
      btn.textContent = "广告中…";
      const ad = await watchRewardedAd("grass_offline");
      if (!ad.ok) { btn.disabled = false; btn.textContent = "广告暂不可用"; return; }
      if (!adUse("grass_offline", 1)) { btn.disabled = false; btn.textContent = "今日双倍已用"; return; }
    }
    const fresh = loadSave() || save;
    const results = claimOfflineGrass(fresh, double ? 2 : 1);
    writeSave(fresh);
    close();
    gameAudio.play("coin");
    opts.onDone?.(fresh);
    showGrassReport(results, () => opts.onDone?.(loadSave() || fresh));
  };

  body.addEventListener("click", (e) => {
    if (e.target.closest("[data-off-close]")) { close(); return; }
    if (e.target.closest("[data-off-claim]")) { claim(false); return; }
    if (e.target.closest("[data-off-ad]")) { claim(true); }
  });
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  (document.getElementById("stage") || document.body).appendChild(wrap);
}
