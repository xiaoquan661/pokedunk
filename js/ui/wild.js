/**
 * ui/wild.js —— 野球场1v1
 *
 * V1：
 *   - 3 条路线，按徽章解锁
 *   - 每天 3 次挑战，广告 +1
 *   - 1v1 篮球（2 节 × 60 秒，无换人）
 *   - 赢了野生精灵加入；输了只给 XP
 */
import { loadSave, writeSave } from "../storage.js?v=557";
import { getPokemon } from "../../engine/readable/play-core.js?v=557";
import { mainOVR } from "../systems/build.js?v=557";
import {
  WILD_ROUTES, wildEnsure, wildLeft, wildMax, wildUseAttempt, wildGrantAdAttempt,
  wildRouteUnlocked, wildEligibleMons, pickWildOpponent, recordWildResult, badgeCount,
} from "../journey/wild.js?v=557";
import { buildWildMatch, mountMatch } from "../journey/match-screen.js?v=557";
import { gameAudio } from "../platform/audio.js?v=557";
import { watchRewardedAd } from "../platform/ads.js?v=557";
import { playAcquire } from "./anim.js?v=557";

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const app = () => document.getElementById("app");
const rows = () => window.__PJ_DEX_ROWS || [];
const monName = (dex) => {
  const row = rows().find((r) => Number(r[0]) === Number(dex));
  return row ? String(row[1]).replace(/#\d+$/, "") : getPokemon(dex)?.name || `#${dex}`;
};
const TYPE_ZH = {
  Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰",
  Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力",
  Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精",
};
const typeText = (types) => (types || []).map((t) => TYPE_ZH[t] || t).join("/");

const CSS = `
.wd-page{position:absolute;inset:0;overflow-y:auto;padding:10px 12px calc(18px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#0b0e16,#05060a 60%);color:var(--r-ink,#f2f2f2);box-sizing:border-box}
.wd-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.wd-back{width:32px;height:32px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#fff;font-size:22px;line-height:1}
.wd-title{flex:1;min-width:0}
.wd-title b{display:block;font:700 17px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.wd-title small{display:block;font-size:10px;color:var(--text-dim,#9aa0c0);margin-top:2px}
.wd-runs{font:700 11px var(--sport,sans-serif);color:var(--gold,#f5c542);border:1px solid rgba(245,197,66,.35);border-radius:999px;padding:4px 8px}
.wd-sec{margin:12px 0 8px;font:700 12px var(--sport,sans-serif);color:#fff}
.wd-routes{display:flex;flex-direction:column;gap:8px}
.wd-route{position:relative;display:flex;flex-direction:column;gap:4px;width:100%;padding:12px;border-radius:10px;border:2px solid var(--tc,#3b6fd8);background:linear-gradient(135deg,color-mix(in srgb,var(--tc) 24%,#101522),#0a0d16 70%);color:#fff;text-align:left;box-shadow:3px 3px 0 rgba(0,0,0,.35)}
.wd-route:disabled{opacity:.48;filter:grayscale(.5)}
.wd-route-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.wd-route-top b{font:700 14px var(--sport,sans-serif)}
.wd-route-top em{font-style:normal;font:700 10px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.wd-route small{font-size:10px;color:rgba(255,255,255,.62);line-height:1.5}
.wd-route-lock{font-size:9.5px;color:var(--gold,#f5c542)}
.wd-note{font-size:10px;line-height:1.6;color:var(--text-dim,#9aa0c0);margin:8px 0 0}
.wd-vs{display:flex;align-items:center;justify-content:center;gap:10px;margin:8px 0 12px}
.wd-vs-card{flex:1;min-width:0;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);text-align:center}
.wd-vs-card img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated}
.wd-vs-card b{display:block;font:700 12px var(--sport,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-vs-card small{display:block;font-size:9.5px;color:var(--gold,#f5c542);margin-top:2px;line-height:1.4}
.wd-vs-i{font:800 13px var(--sport,sans-serif);color:var(--text-dim,#9aa0c0)}
.wd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}
.wd-mon{display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 4px;border-radius:9px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff}
.wd-mon.on{border-color:var(--gold,#f5c542);background:rgba(245,197,66,.14)}
.wd-mon img{width:42px;height:42px;object-fit:contain;image-rendering:pixelated}
.wd-mon b{font-size:10px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-mon small{font-size:9px;color:var(--text-dim,#9aa0c0)}
.wd-actions{display:flex;gap:8px;margin-top:14px}
.wd-btn{flex:1;padding:11px 0;border-radius:8px;border:2px solid var(--gold,#f5c542);background:transparent;color:var(--gold,#f5c542);font:700 12px var(--sport,sans-serif)}
.wd-btn.main{background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52;border-color:#8a6a00}
.wd-btn:disabled{opacity:.4}
.wd-result{margin-top:10px;padding:14px;border-radius:12px;border:2px solid var(--line,rgba(255,255,255,.18));background:rgba(0,0,0,.28)}
.wd-result h2{margin:0 0 4px;font:800 22px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.wd-result .wd-score{font:700 13px var(--sport,sans-serif);color:#fff}
.wd-result p{margin:8px 0 0;font-size:11px;line-height:1.6;color:var(--text-dim,#9aa0c0)}
.wd-recruit{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px;border-radius:10px;border:1px solid rgba(245,197,66,.35);background:rgba(245,197,66,.08)}
.wd-recruit img{width:54px;height:54px;object-fit:contain;image-rendering:pixelated}
.wd-recruit b{display:block;font:700 13px var(--sport,sans-serif);color:#fff}
.wd-recruit small{display:block;font-size:10px;color:var(--gold,#f5c542);margin-top:2px}
.wd-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:99999;padding:8px 14px;border-radius:999px;background:rgba(8,12,24,.94);border:1px solid rgba(245,197,66,.5);color:#fff;font:700 11px var(--sport,sans-serif);opacity:0;pointer-events:none;transition:opacity .18s}
.wd-toast.show{opacity:1}
`;

function ensureCss() {
  if (document.getElementById("pj-wild-style")) return;
  const st = document.createElement("style");
  st.id = "pj-wild-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

let toastTimer = 0;
function toast(msg) {
  ensureCss();
  let t = document.getElementById("wd-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "wd-toast";
    t.className = "wd-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/** 路线的入口/选人/结算统一用弹窗，比赛本身仍全屏 */
function mountModal(page) {
  document.querySelectorAll(".pj-scrim.wd-modal").forEach((n) => n.remove());
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal wd-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body"></div></div>`;
  page.classList.remove("sub-page", "wd-page");
  page.classList.add("wd-content");
  wrap.querySelector(".pj-page-body").appendChild(page);
  (document.getElementById("stage") || document.body).appendChild(wrap);
  return wrap;
}
function closeModal(page) {
  page?.closest(".wd-modal")?.remove();
}

function routeCard(save, route) {
  const unlocked = wildRouteUnlocked(save, route);
  const need = route.minBadges;
  return `<button type="button" class="wd-route" data-route="${route.id}" style="--tc:${route.color}" ${unlocked ? "" : "disabled"}>
    <span class="wd-route-top"><b>${route.name}</b><em>Lv.${route.minLevel}～${route.maxLevel}</em></span>
    <small>${typeText(route.types)} · 对手强度 ${route.difficulty === "rookie" ? "入门" : route.difficulty === "pro" ? "进阶" : "硬仗"}</small>
    <span class="wd-route-lock">${unlocked ? "可挑战 · 打赢收服" : `需要 ${need} 枚徽章解锁（当前 ${badgeCount(save)}）`}</span>
  </button>`;
}

function renderRoutes(save, opts = {}) {
  ensureCss();
  save = loadSave() || save;
  const w = wildEnsure(save);
  const left = wildLeft(save);
  const page = el(`<div class="sub-page wd-page">
    <div class="page-head">
      <button class="back" data-back aria-label="返回">‹</button>
      <h2>野球场1v1</h2>
      <span class="count">今日 ${left}/${wildMax(save)}</span>
    </div>
    <p class="page-sub">半场 1v1 · 打赢野生精灵就加入</p>
    <div class="wd-sec">选择野球场</div>
    <div class="wd-routes">${WILD_ROUTES.map((r) => routeCard(save, r)).join("")}</div>
    <div class="wd-actions">
      <button type="button" class="wd-btn${w.adUsed ? "" : " main"}" data-ad ${w.adUsed ? "disabled" : ""}>${w.adUsed ? "今日广告次数已用完" : "看广告 +1 次"}</button>
    </div>
    <p class="wd-note">每次挑战打一场 2 节 × 60 秒的半场 1v1；不推进赛季、不计战绩。参赛精灵获得 XP，赢了野生精灵加入；同种已拥有则折算 100 币 + 普通树果。</p>
  </div>`);
  mountModal(page);
  page.addEventListener("click", async (e) => {
    if (e.target.closest("[data-back]")) { closeModal(page); opts.onBack?.(); return; }
    if (e.target.closest("[data-ad]")) {
      const btn = e.target.closest("[data-ad]");
      btn.disabled = true;
      btn.textContent = "广告中…";
      const ad = await watchRewardedAd("wild_attempt");
      if (!ad.ok) { btn.disabled = false; btn.textContent = "广告暂不可用"; return; }
      const fresh = loadSave() || save;
      if (!wildGrantAdAttempt(fresh)) { toast("今日广告次数已用完"); renderRoutes(fresh, opts); return; }
      writeSave(fresh);
      renderRoutes(fresh, opts);
      return;
    }
    const card = e.target.closest("[data-route]");
    if (card) {
      const route = WILD_ROUTES.find((r) => r.id === card.dataset.route);
      if (!route) return;
      if (!wildRouteUnlocked(save, route)) return toast(`需要 ${route.minBadges} 枚徽章解锁`);
      if (wildLeft(save) <= 0) return toast("今日次数已用完，看广告可 +1 次");
      renderPreMatch(save, route, opts);
    }
  });
}

function renderPreMatch(save, route, opts = {}) {
  ensureCss();
  save = loadSave() || save;
  if (wildLeft(save) <= 0) return renderRoutes(save, opts);
  const opp = pickWildOpponent(save, route);
  const eligible = wildEligibleMons(save);
  if (!eligible.length) return toast("没有可出战的精灵（草地中的精灵不能上场）");
  let selectedId = eligible[0];
  const selectedMon = () => save.mons[selectedId];
  const page = el(`<div class="sub-page wd-page">
    <div class="page-head">
      <button class="back" data-back aria-label="返回">‹</button>
      <h2>${route.name}</h2>
      <span class="count">剩余 ${wildLeft(save)} 次</span>
    </div>
    <p class="page-sub">半场 1v1 · 2 节 × 60 秒</p>
    <div class="wd-vs">
      <div class="wd-vs-card">
        <img src="./sprites/${selectedMon().dex}.png" alt="" data-my-img>
        <b data-my-name>${monName(selectedMon().dex)}</b>
        <small data-my-meta>Lv.${selectedMon().level} · OVR ${mainOVR(selectedMon())}</small>
      </div>
      <span class="wd-vs-i">VS</span>
      <div class="wd-vs-card">
        <img src="./sprites/${opp.dex}.png" alt="">
        <b>${monName(opp.dex)}</b>
        <small>Lv.${opp.level} · ${typeText(opp.types)} · OVR ${opp.ovr}</small>
      </div>
    </div>
    <div class="wd-sec">选择出战精灵</div>
    <div class="wd-grid">${eligible.map((id) => {
      const m = save.mons[id];
      const on = id === selectedId;
      return `<button type="button" class="wd-mon${on ? " on" : ""}" data-mon="${id}">
        <img src="./sprites/${m.dex}.png" alt="">
        <b>${monName(m.dex)}</b>
        <small>Lv.${m.level} · ${mainOVR(m)}</small>
      </button>`;
    }).join("")}</div>
    <div class="wd-actions">
      <button type="button" class="wd-btn" data-back>返回</button>
      <button type="button" class="wd-btn main" data-start>开始 1v1</button>
    </div>
    <p class="wd-note">草地中的精灵不能出战；首发不受影响，野球场是独立半场 1v1。</p>
  </div>`);
  mountModal(page);
  page.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { closeModal(page); renderRoutes(loadSave() || save, opts); return; }
    const monBtn = e.target.closest("[data-mon]");
    if (monBtn) {
      selectedId = Number(monBtn.dataset.mon);
      const m = save.mons[selectedId];
      if (!m) return;
      page.querySelectorAll("[data-mon]").forEach((b) => b.classList.toggle("on", b === monBtn));
      const img = page.querySelector("[data-my-img]");
      if (img) img.src = `./sprites/${m.dex}.png`;
      const name = page.querySelector("[data-my-name]");
      if (name) name.textContent = monName(m.dex);
      const meta = page.querySelector("[data-my-meta]");
      if (meta) meta.textContent = `Lv.${m.level} · OVR ${mainOVR(m)}`;
      return;
    }
    if (e.target.closest("[data-start]")) {
      const fresh = loadSave() || save;
      const pickId = Number(page.querySelector(".wd-mon.on")?.dataset.mon);
      if (!pickId || !fresh.mons[pickId]) return toast("请选择出战精灵");
      if (wildLeft(fresh) <= 0) { toast("今日次数已用完"); return renderRoutes(fresh, opts); }
      if (!wildUseAttempt(fresh)) { toast("今日次数已用完"); return; }
      writeSave(fresh);
      closeModal(page);
      startWildMatch(fresh, route, opp, pickId, opts);
      return;
    }
  });
}

function startWildMatch(save, route, opp, monId, opts = {}) {
  const cfg = buildWildMatch(save, route, monId, opp);
  if (!cfg) return toast("无法开始比赛");
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app().replaceChildren(page);
  mountMatch(page, cfg, gameAudio, (engine, c, quit) => {
    if (quit) { opts.onBack?.(); return; }
    const fresh = loadSave() || save;
    const won = !!engine && engine.score[0] > engine.score[1];
    const result = recordWildResult(fresh, { won, opp, monId, engine });
    writeSave(fresh);
    renderResult(fresh, route, opp, monId, result, engine, opts);
  }, { startingFive: false });
  // 1v1 没有换人/传球对象，移除模拟、换防和任何跳过入口，保证手动单挑
  page.querySelector(".sim-btn")?.remove();
  page.querySelector('.tb[data-b="pass"]')?.remove();
  page.querySelector(".s5-skip")?.remove();
}

function renderResult(save, route, opp, monId, result, engine, opts = {}) {
  ensureCss();
  const score = engine?.score || [0, 0];
  const left = wildLeft(save);
  const w = wildEnsure(save);
  const lv = result.after > result.before ? `Lv.${result.before} → Lv.${result.after}` : `Lv.${result.before || save.mons[monId]?.level || 1}`;
  const page = el(`<div class="sub-page wd-page">
    <div class="page-head">
      <h2>野球场结算</h2>
      <span class="count">今日 ${left}/${wildMax(save)}</span>
    </div>
    <p class="page-sub">${route.name} · 半场 1v1</p>
    <div class="wd-result">
      <h2>${result.won ? "胜 利" : "惜 败"}</h2>
      <div class="wd-score">${score[0]} : ${score[1]} · ${monName(save.mons[monId]?.dex || opp.dex)} ${lv}</div>
      <p>参赛精灵 +${result.xp} XP${result.events?.length ? `<br>${result.events.join("<br>")}` : ""}</p>
      ${result.recruit ? `<div class="wd-recruit">
        <img src="./sprites/${result.recruit.dex}.png" alt="">
        <div><b>${monName(result.recruit.dex)} 加入</b><small>Lv.${result.recruit.level} · ${result.recruit.placed === "team" ? "已入队" : "已放入仓库"}</small></div>
      </div>` : result.dup ? `<p>已经拥有同种精灵，折算 ${result.coins} 币 + 普通树果 ×1。</p>` : result.won ? `<p>已拥有同种精灵，奖励已折算。</p>` : ""}
    </div>
    <div class="wd-actions">
      <button type="button" class="wd-btn" data-routes>返回野球场</button>
      <button type="button" class="wd-btn main" data-again ${left <= 0 ? "disabled" : ""}>再来一次</button>
    </div>
    ${left <= 0 && !w.adUsed ? `<div class="wd-actions"><button type="button" class="wd-btn main" data-ad-result>看广告 +1 次</button></div>` : ""}
    <div class="wd-actions">
      <button type="button" class="wd-btn" data-home>回主页</button>
    </div>
  </div>`);
  mountModal(page);
  page.addEventListener("click", async (e) => {
    if (e.target.closest("[data-routes]")) { closeModal(page); return renderRoutes(loadSave() || save, opts); }
    if (e.target.closest("[data-home]")) { closeModal(page); return opts.onBack?.(); }
    const adBtn = e.target.closest("[data-ad-result]");
    if (adBtn) {
      adBtn.disabled = true;
      adBtn.textContent = "广告中…";
      const ad = await watchRewardedAd("wild_attempt");
      if (!ad.ok) { adBtn.disabled = false; adBtn.textContent = "广告暂不可用"; return; }
      const fresh = loadSave() || save;
      if (!wildGrantAdAttempt(fresh)) { toast("今日广告次数已用完"); closeModal(page); return renderRoutes(fresh, opts); }
      writeSave(fresh);
      closeModal(page);
      return renderPreMatch(fresh, route, opts);
    }
    if (e.target.closest("[data-again]")) {
      const fresh = loadSave() || save;
      if (wildLeft(fresh) <= 0) return toast("今日次数已用完");
      closeModal(page);
      return renderPreMatch(fresh, route, opts);
    }
  });
  if (result.recruit) {
    setTimeout(() => {
      if (!page.isConnected) return;
      try {
        playAcquire({
          dex: result.recruit.dex,
          kicker: "野球场1v1",
          title: `${monName(result.recruit.dex)} 加入`,
          sub: `Lv.${result.recruit.level} · ${result.recruit.placed === "team" ? "已加入队伍" : "已放入仓库"}`,
          z: 1200,
        });
      } catch {}
    }, 260);
  }
}

export function openWild(save, opts = {}) {
  ensureCss();
  renderRoutes(loadSave() || save, opts);
}
