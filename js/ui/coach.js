/**
 * ui/coach.js —— 教练档案（教练声望）
 *
 * 第一刀：把比赛、每日挑战、野球场、今日任务和广告串成一个局外成长层。
 * 不给比赛数值，升级只解锁教练称号。
 */
import { loadSave, writeSave } from "../storage.js?v=697";
import { watchRewardedAd } from "../platform/ads.js?v=697";
import { gameAudio } from "../platform/audio.js?v=697";
import { rerollNickname } from "../systems/profile.js?v=697";
import {
  repInfo, repMissionRows, claimRepMission, claimRepAd, repAdLeft,
  REP_LEVEL_REWARDS, REP_SOURCES, levelRewardText,
} from "../systems/reputation.js?v=697";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const COACH_CSS = `
.coach-name{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:8px 10px;border:1px solid var(--line,rgba(255,255,255,.14));border-radius:8px;background:rgba(0,0,0,.16)}
.coach-name span{font-size:9.5px;color:var(--text-dim)}
.coach-name b{flex:1;min-width:0;font:700 13px var(--sport);color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.coach-name button{flex:none;padding:4px 9px;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 42%,transparent);background:rgba(245,197,66,.1);color:var(--gold,#f5c542);font:700 9.5px var(--sport)}
.coach-hero{padding:12px 14px;border:1px solid rgba(245,197,66,.32);border-radius:10px;background:linear-gradient(160deg,rgba(245,197,66,.12),rgba(0,0,0,.18));margin-bottom:10px}
.coach-hero .ch-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:7px}
.coach-hero .ch-top b{font:800 22px var(--sport);color:var(--gold)}
.coach-hero .ch-top span{font-size:10.5px;color:var(--text-dim)}
.coach-bar{position:relative;height:7px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
.coach-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#4f9dff,#f5c542)}
.coach-hero small{display:block;margin-top:5px;font-size:10px;color:var(--text-dim);text-align:right}
.coach-sec{display:flex;align-items:baseline;gap:7px;margin:12px 0 6px;font:700 12px var(--sport);color:var(--gold)}
.coach-sec small{font-weight:400;font-size:9.5px;color:var(--text-dim)}
.coach-fold-head{width:100%;padding:7px 2px;border:0;border-top:1px solid rgba(255,255,255,.08);background:none;text-align:left;cursor:pointer}
.coach-chev{margin-left:auto;font-style:normal;font-size:15px;line-height:1;color:var(--text-dim);transform:rotate(0);transition:transform .18s}
.coach-chev.open{transform:rotate(90deg)}
.coach-mission{display:flex;align-items:center;gap:9px;padding:8px 10px;margin-bottom:6px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;background:rgba(0,0,0,.18)}
.coach-mission .cm-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.coach-mission .cm-txt b{font-size:11.5px;color:#fff;font-weight:600}
.coach-mission .cm-txt small{font-size:9.5px;color:var(--text-dim)}
.coach-mission.done{opacity:.7}
.coach-mission button{padding:5px 10px;border-radius:12px;border:1px solid rgba(245,197,66,.35);background:rgba(245,197,66,.1);color:var(--gold);font:700 10px var(--sport)}
.coach-mission button:disabled{opacity:.45;color:var(--text-dim);border-color:var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.16)}
.coach-ad{display:block;width:100%;margin:4px 0 2px;padding:9px 10px;border-radius:8px;border:1px solid rgba(245,197,66,.45);background:rgba(245,197,66,.12);color:var(--gold);font:700 11.5px var(--sport)}
.coach-ad:disabled{opacity:.45;border-color:var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.16);color:var(--text-dim)}
.coach-note{margin:5px 0 0;font-size:9.5px;line-height:1.5;color:var(--text-dim)}
.coach-source{display:flex;flex-direction:column;gap:1px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.coach-source:last-child{border-bottom:none}
.coach-source b{font-size:11px;color:#fff;font-weight:600}
.coach-source span{font-size:10.5px;color:var(--gold)}
.coach-source small{font-size:9.5px;color:var(--text-dim)}
.coach-reward{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:10.5px}
.coach-reward:last-child{border-bottom:none}
.coach-reward b{color:var(--gold);font:700 11px var(--sport)}
.coach-reward.done{opacity:.55}
`;

function ensureCss() {
  if (document.getElementById("pj-coach-style")) return;
  const st = document.createElement("style");
  st.id = "pj-coach-style";
  st.textContent = COACH_CSS;
  document.head.appendChild(st);
}

let toastTimer = null;
function toast(msg, ms = 2600) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

function upText(levelUps) {
  if (!levelUps?.length) return "";
  const parts = levelUps.map((u) => `Lv.${u.level}${u.reward?.text ? `（${u.reward.text}）` : ""}`);
  return ` · 教练升级：${parts.join(" / ")}`;
}

export function openCoachProfile(save) {
  ensureCss();
  save = loadSave() || save;
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body coach-body"></div></div>`;
  const body = wrap.querySelector(".coach-body");
  const close = () => wrap.remove();
  let sourcesOpen = false;

  function render() {
    const info = repInfo(save);
    const missions = repMissionRows(save);
    const adLeft = repAdLeft(save);
    const rewards = Object.keys(REP_LEVEL_REWARDS).map(Number).sort((a, b) => a - b);
    body.innerHTML = `
      <div class="page-head"><button class="back" data-back>‹</button><h2>教练档案</h2><span class="count">Lv.${info.level}</span></div>
      <p class="page-sub">比赛、每日挑战、野球场都累积教练声望 · 升级只解锁教练称号</p>

      <div class="coach-name">
        <span>训练师昵称</span>
        <b>${esc(save.coach?.name || "训练师")}</b>
        <button type="button" data-coach-roll>重新随机</button>
      </div>

      <div class="coach-hero">
        <div class="ch-top"><b>Lv.${info.level}</b><span>${save.coach?.title || "见习教练"} · 累计 ${info.total} 声望</span></div>
        <div class="coach-bar"><i style="width:${info.pct}%"></i></div>
        <small>${info.maxLevel ? "已达最高等级" : `${info.exp} / ${info.need} → Lv.${info.level + 1}`}</small>
      </div>

      <div class="coach-sec">今日清单 <small>三种模式各完成 1 次 · 0 点刷新</small></div>
      ${missions.map((m) => `
        <div class="coach-mission ${m.claimed ? "done" : ""}">
          <span class="cm-txt"><b>${m.name}</b><small>${m.claimed ? "今日已领取" : `进度 ${m.have}/${m.goal} · 声望 +${m.rep}`}</small></span>
          <button type="button" data-coach-mission="${m.id}" ${m.canClaim ? "" : "disabled"}>${m.claimed ? "已领取" : m.canClaim ? `+${m.rep}` : "未完成"}</button>
        </div>`).join("")}

      <button type="button" class="coach-ad" data-coach-ad ${adLeft ? "" : "disabled"}>看广告 +100 声望（今日 ${adLeft}/1）</button>

      <button type="button" class="coach-sec coach-fold-head" data-coach-fold="sources" aria-expanded="${sourcesOpen}">
        <span>声望来源</span><small>不给比赛数值</small><i class="coach-chev${sourcesOpen ? " open" : ""}">›</i>
      </button>
      ${sourcesOpen ? REP_SOURCES.map(([name, gain, note]) => `<div class="coach-source"><b>${name}</b><span>${gain}</span><small>${note}</small></div>`).join("") : ""}

      <div class="coach-sec">等级称号 <small>达到自动解锁 · 无数值奖励</small></div>
      ${rewards.map((lv) => {
        const rw = REP_LEVEL_REWARDS[lv];
        return `<div class="coach-reward ${info.level >= lv ? "done" : ""}"><span>Lv.${lv}</span><b>${levelRewardText(rw)}</b></div>`;
      }).join("")}
      <p class="coach-note">教练等级是账号层成长：进入下一地区不清空，和精灵等级、训练点互不影响。</p>`;
  }

  body.addEventListener("click", async (e) => {
    if (e.target.closest("[data-back]")) { close(); return; }
    if (e.target.closest("[data-coach-roll]")) {
      save = loadSave() || save;
      const next = rerollNickname(save);
      writeSave(save);
      const home = document.querySelector("#home-coach span");
      if (home) home.textContent = next;
      toast(`新昵称：${next}`);
      render();
      return;
    }
    const fold = e.target.closest("[data-coach-fold]");
    if (fold) { sourcesOpen = !sourcesOpen; render(); return; }
    const mb = e.target.closest("[data-coach-mission]");
    if (mb && !mb.disabled) {
      save = loadSave() || save;
      const r = claimRepMission(save, mb.dataset.coachMission);
      if (!r.ok) return toast(r.error);
      writeSave(save);
      gameAudio.play("coin");
      toast(`今日任务完成 · 声望 +${r.rep}${upText(r.levelUps)}`);
      render();
      return;
    }
    const ad = e.target.closest("[data-coach-ad]");
    if (ad && !ad.disabled) {
      ad.disabled = true;
      ad.textContent = "广告中…";
      const res = await watchRewardedAd("coach_rep");
      if (!res.ok) { ad.disabled = false; ad.textContent = "广告暂不可用"; return; }
      save = loadSave() || save;
      const r = claimRepAd(save);
      if (!r.ok) { toast(r.error); render(); return; }
      writeSave(save);
      gameAudio.play("special");
      toast(`广告应援 · 声望 +${r.rep}${upText(r.levelUps)}`);
      render();
    }
  });
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  (document.getElementById("stage") || document.body).appendChild(wrap);
  render();
}
