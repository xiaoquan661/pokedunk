/**
 * ui/league.js —— 联盟邀请赛（由旧赛季板接回）
 * 8 徽章后开放，独立于主线：9 队单循环 → 前4四强 → 总决赛。
 */
import {
  ensureLeague, startLeague, startNextLeague, leagueInfo, rankTable, teamRow,
  roundView, simulateLeagueRound, LEAGUE_ROUNDS,
} from "../journey/league.js?v=693";
import { regionOf } from "../journey/regions.js?v=693";
import { loadSave, writeSave } from "../storage.js?v=693";
import { ICON } from "./icons.js?v=693";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function openLeaguePage(save, opts = {}) {
  const embed = !!opts.host;
  const wrap = embed ? opts.host : document.createElement("div");
  if (!embed) {
    wrap.className = "pj-scrim page-modal league-modal";
    wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  }
  wrap.innerHTML = embed
    ? `<div class="lg-shell lg-embed-shell">
        <div class="sub-page lg-body"></div>
        <div class="lg-foot"></div>
      </div>`
    : `<div class="pj-page-card lg-card"><div class="lg-shell">
        <div class="sub-page pj-page-body lg-body"></div>
        <div class="lg-foot"></div>
      </div></div>`;
  const body = wrap.querySelector(".lg-body");
  const foot = wrap.querySelector(".lg-foot");
  if (!embed) (document.getElementById("stage") || document.body).appendChild(wrap);

  let notice = opts.notice || "";
  let busy = false;
  const pageTitle = opts.title || "联盟邀请赛";
  const close = () => { if (!embed) wrap.remove(); opts.onBack?.(); };

  const render = () => {
    const f = loadSave() || save;
    const s = ensureLeague(f);
    const reg = regionOf(f);
    const ranked = rankTable(s);
    const teamMap = new Map((s.table || []).map((r) => [r.id, r]));
    const tname = (id) => teamMap.get(id)?.name || (id === "me" ? "我队" : id);
    const me = teamMap.get("me") || { w: 0, l: 0, pf: 0, pa: 0 };
    const diff = (r) => r.pf - r.pa;
    const info = s.started ? leagueInfo(f) : null;

    const head = `<div class="page-head"><button class="back" data-back>‹</button>
      <h2>${esc(pageTitle)}</h2><span class="count">${s.trophy ? `<i class="lg-trophy">${ICON.trophy}</i>` : ""}第 ${s.no} 届</span></div>`;

    if (!s.started) {
      const rows = (s.table || []).map((r) => `<div class="lg-intro-row ${r.isMe ? "me" : ""}">
        <i style="background:${r.color}"></i><b>${esc(r.name)}</b><em>${r.power}</em>
      </div>`).join("");
      body.innerHTML = `<style>${CSS}</style>
        ${head}
        <div class="lg-intro-hero">
          <span>${ICON.trophy}</span>
          <b>${esc(reg.name)}${esc(pageTitle)}</b>
          <small>向 8 位馆主发出邀请 · 9 队单循环 · 前 4 进四强</small>
        </div>
        <div class="lg-sec"><b>参赛球队</b><small>你 + 8 位馆主</small></div>
        <div class="lg-intro-list">${rows}</div>
        <div class="lg-intro-note">每队打 8 场、轮空 1 轮；胜 3 分，积分相同看净胜分。季后赛为半决赛 1v4、2v3，胜者进入总决赛。<br>每场固定产出：胜 40 经验 + 60 币，负 20 经验 + 20 币（经验发给全体首发）；可反复参赛刷等级。</div>
        ${notice ? `<p class="lg-note">${esc(notice)}</p>` : ""}`;
      foot.innerHTML = `<button class="pk-btn-gold" data-start>发出邀请</button>
        <button class="pk-btn-gold pm-ghost" data-back>返 回</button>`;
      return;
    }

    const phaseText = s.phase === "regular"
      ? `常规赛 第 ${Math.min(s.round + 1, LEAGUE_ROUNDS)}/${LEAGUE_ROUNDS} 轮 · ${me.w} 胜 ${me.l} 负`
      : s.phase === "playoffs"
        ? `季后赛 · ${me.w} 胜 ${me.l} 负`
        : `联赛结束 · ${me.w} 胜 ${me.l} 负`;

    const tableRows = ranked.map((r, i) => `<div class="lg-row ${r.isMe ? "me" : ""} ${i < 4 ? "po" : ""}">
      <span class="lg-rank">${i + 1}</span>
      <span class="lg-team"><i style="background:${r.color}"></i>${esc(r.name)}</span>
      <span class="lg-rec">${r.w}-${r.l}</span>
      <span class="lg-diff">${diff(r) >= 0 ? "+" : ""}${diff(r)}</span>
    </div>`).join("");

    const gameHtml = (g) => `<div class="lg-game ${g.a === "me" || g.b === "me" ? "me" : ""}">
      <span class="lg-side">${esc(tname(g.a))}</span>
      <b>${g.sa ?? "-"}</b><i>:</i><b>${g.sb ?? "-"}</b>
      <span class="lg-side right">${esc(tname(g.b))}</span>
    </div>`;

    const latest = s.rounds[s.rounds.length - 1];
    const view = latest || s.schedule[Math.min(s.round, LEAGUE_ROUNDS - 1)];
    const viewNo = view ? view.round + 1 : 1;
    const viewGames = (view?.games || []).map(gameHtml).join("");
    const byeText = view?.bye ? `<div class="lg-bye">本轮轮空：${esc(tname(view.bye))}</div>` : "";

    const fixtures = s.schedule.map((rd, i) => {
      const g = rd.games.find((x) => x.a === "me" || x.b === "me");
      const res = s.results.find((r) => r.round === i);
      const cur = s.phase === "regular" && i === s.round;
      if (!g) return `<div class="lg-fixture ${cur ? "cur" : ""}"><span>R${i + 1}</span><b>轮空</b><small>${cur ? "本轮" : "—"}</small></div>`;
      const opp = g.a === "me" ? g.b : g.a;
      return `<div class="lg-fixture ${res ? (res.win ? "win" : "lose") : ""} ${cur ? "cur" : ""}">
        <span>R${i + 1}</span><b>${esc(tname(opp))}</b>
        <small>${res ? `${res.win ? "胜" : "负"} ${res.myScore}:${res.oppScore}` : "未赛"}</small>
      </div>`;
    }).join("");

    const po = s.playoffs;
    let poHtml = "";
    const poRow = (g, label) => `<div class="lg-po-row ${g?.winner === "me" ? "me" : ""} ${label === "总决赛" ? "final" : ""}">
      <span>${label}</span><b>${g ? esc(tname(g.a)) : "待定"}</b>
      <em>${g ? `${g.sa ?? "-"} : ${g.sb ?? "-"}` : "-"}</em>
      <b>${g ? esc(tname(g.b)) : "待定"}</b>
      <small>${g?.winner ? `${esc(tname(g.winner))} 胜` : "待打"}</small>
    </div>`;
    if (po && !po.missed) {
      poHtml = `<div class="lg-sec"><b>季后赛</b><small>前 4 进四强</small></div>
        <div class="lg-bracket">
          ${po.semis.map((g, i) => poRow(g, `半决赛 ${i + 1}`)).join("")}
          ${poRow(po.final, "总决赛")}
          ${po.champion ? `<div class="lg-champ">联赛冠军：${esc(tname(po.champion))}</div>` : ""}
        </div>`;
    } else if (po?.missed) {
      poHtml = `<div class="lg-sec"><b>季后赛</b><small>前 4 进四强</small></div><div class="lg-miss">常规赛未进前 4，本届结束。</div>`;
    }

    const rewardHtml = s.phase === "done" && s.lastReward
      ? `<div class="lg-reward ${s.lastReward.first ? "first" : ""}">
          <i>${ICON.trophy}</i><div><b>${esc(s.lastReward.placeCn)}</b><small>${esc(s.lastReward.text)}</small></div>
          ${s.lastReward.first ? `<span>首通奖杯</span>` : ""}
        </div>`
      : "";

    body.innerHTML = `<style>${CSS}</style>
      ${head}
      <p class="page-sub">${esc(phaseText)} · 净胜 ${diff(me) >= 0 ? "+" : ""}${diff(me)}</p>
      ${notice ? `<p class="lg-note">${esc(notice)}</p>` : ""}
      <div class="lg-sec"><b>积分榜</b><small>前 4 进季后赛</small></div>
      <div class="lg-table"><div class="lg-row lg-head"><span>#</span><span>球队</span><span>胜-负</span><span>净胜</span></div>${tableRows}</div>
      <div class="lg-sec"><b>${latest ? "上轮战况" : "下一轮"}</b><small>第 ${viewNo}/${LEAGUE_ROUNDS} 轮</small></div>
      <div class="lg-rounds">${viewGames}${byeText}</div>
      <div class="lg-sec"><b>我的赛程</b><small>${LEAGUE_ROUNDS} 轮 · 1 轮轮空</small></div>
      <div class="lg-fixtures">${fixtures}</div>
      ${poHtml}
      ${rewardHtml}`;

    let actions = "";
    if (s.phase === "regular" && s.schedule[s.round]?.bye === "me") {
      actions = `<button class="pk-btn-gold" data-bye>进入下一轮</button>
        <button class="pk-btn-gold pm-ghost" data-back>返 回</button>`;
    } else if (s.phase === "regular" || s.phase === "playoffs") {
      actions = `<button class="pk-btn-gold" data-play>手动比赛</button>
        <button class="pk-btn-gold pm-ghost" data-watch>观战</button>
        <button class="pk-btn-gold pm-ghost" data-sim ${busy ? "disabled" : ""}>${busy ? "模拟中…" : "模拟本轮"}</button>`;
    } else {
      actions = `<button class="pk-btn-gold" data-new>再来一届</button>
        <button class="pk-btn-gold pm-ghost" data-back>返 回</button>`;
    }
    foot.innerHTML = actions;
  };

  wrap.addEventListener("click", async (e) => {
    if (e.target.closest("[data-back]")) { close(); return; }
    if (e.target.closest("[data-start]")) {
      const f = loadSave() || save;
      startLeague(f);
      writeSave(f);
      render();
      return;
    }
    if (e.target.closest("[data-new]")) {
      const f = loadSave() || save;
      startNextLeague(f);
      writeSave(f);
      notice = "";
      render();
      return;
    }
    if (e.target.closest("[data-bye]")) {
      const f = loadSave() || save;
      const { advanceBye } = await import("../journey/league.js?v=693");
      advanceBye(f);
      writeSave(f);
      render();
      return;
    }
    if (e.target.closest("[data-play]")) {
      if (!embed) wrap.remove();
      opts.onPlay?.();
      return;
    }
    if (e.target.closest("[data-watch]")) {
      if (!embed) wrap.remove();
      opts.onWatch?.();
      return;
    }
    if (e.target.closest("[data-sim]")) {
      if (busy) return;
      busy = true;
      const top = body.scrollTop;
      render();
      body.scrollTop = top;
      const f = loadSave() || save;
      const r = await simulateLeagueRound(f);
      writeSave(f);
      busy = false;
      notice = r?.myScore != null
        ? `${r.won ? "胜" : "负"} ${r.myScore}:${r.oppScore} · 经验 +${r.matchReward?.xp || 0} · 币 +${r.matchReward?.coins || 0} · 本轮其他比赛已同步模拟`
        : r?.bye ? "本轮轮空，其他比赛已模拟" : r?.ended ? "联赛结束" : "本轮已模拟";
      render();
      body.scrollTop = top;
    }
  });

  render();
  return close;
}

const CSS = `
.lg-card{height:auto;max-height:min(88%,760px)}
.lg-shell{display:flex;flex-direction:column;flex:1;min-height:0}
.lg-embed-shell{height:100%}
.lg-embed .lg-body{flex:1;min-height:0;overflow-y:auto;padding:0 0 8px!important;background:transparent}
.lg-body{flex:1;min-height:0;overflow-y:auto;padding:0 14px 12px!important}
.lg-foot{flex:none;display:flex;gap:6px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#12224a);box-shadow:0 -8px 20px rgba(0,0,0,.18)}
.lg-foot .pk-btn-gold{flex:1;min-width:0;padding:10px 4px;font-size:12px}
.lg-foot .pk-btn-gold.pm-ghost{background:var(--panel-2,#12224a)!important;color:var(--text,#fff)!important;border:1px solid var(--line,rgba(255,255,255,.18))!important;box-shadow:none!important}
.lg-trophy{display:inline-grid;place-items:center;width:15px;height:15px;margin-right:3px;vertical-align:-3px;color:var(--gold,#f5c542)}
.lg-trophy svg{width:14px;height:14px}
.lg-note{margin:0 0 8px;padding:7px 9px;border:1px solid rgba(245,197,66,.4);border-radius:6px;background:rgba(245,197,66,.08);color:var(--gold,#f5c542);font-size:10px;line-height:1.5}
.lg-intro-hero{display:flex;flex-direction:column;align-items:center;gap:2px;padding:16px 12px;margin:4px 0 10px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 40%,transparent);border-radius:10px;background:linear-gradient(180deg,rgba(245,197,66,.12),rgba(0,0,0,.1));text-align:center}
.lg-intro-hero>span{width:40px;height:40px;display:grid;place-items:center;color:var(--gold,#f5c542)}
.lg-intro-hero>span svg{width:38px;height:38px}
.lg-intro-hero b{font:700 17px var(--sport,sans-serif);color:var(--text,#fff)}
.lg-intro-hero small{font-size:9.5px;color:var(--text-dim,#b9b0a0)}
.lg-intro-list{display:flex;flex-direction:column;gap:3px}
.lg-intro-row{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:6px;background:rgba(0,0,0,.12);font-size:10px}
.lg-intro-row>i{width:8px;height:8px;border-radius:50%;flex:none}
.lg-intro-row>b{flex:1;min-width:0;font:700 10px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lg-intro-row>em{font:700 9px var(--sport,sans-serif);font-style:normal;color:var(--gold,#f5c542)}
.lg-intro-row.me{border-color:rgba(245,197,66,.5);background:rgba(245,197,66,.09)}
.lg-intro-note{margin-top:9px;padding:8px 9px;border-radius:6px;background:rgba(0,0,0,.12);font-size:9.5px;line-height:1.6;color:var(--text-dim,#b9b0a0)}
.lg-reward{display:flex;align-items:center;gap:8px;margin-top:10px;padding:9px 10px;border:1px solid rgba(245,197,66,.45);border-radius:8px;background:rgba(245,197,66,.09)}
.lg-reward>i{width:28px;height:28px;flex:none;display:grid;place-items:center;color:var(--gold,#f5c542)}
.lg-reward>i svg{width:26px;height:26px}
.lg-reward>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.lg-reward b{font:700 11px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.lg-reward small{font-size:9px;color:var(--text-dim,#b9b0a0)}
.lg-reward>span{flex:none;font:700 8px var(--sport,sans-serif);color:var(--gold,#f5c542)}
@media (max-width:360px){.lg-body{padding-left:10px!important;padding-right:10px!important}}
`;
