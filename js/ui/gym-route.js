/**
 * ui/gym-route.js —— 道馆路线页（S86）
 * 沿用赛前对阵版式：双方战力、预计胜率、对手首发、系别克制、我方阵容。
 * 路线 5 关压成一条横向进度条，当前关对局放在首屏。
 */
import { routeState, routeForGym } from "../journey/gym-route.js?v=689";
import { regionOf } from "../journey/regions.js?v=689";
import { wildRoutePool } from "../journey/wild.js?v=689";
import { buildMyRoster } from "../journey/match-screen.js?v=689";
import { pickGymRoster } from "../journey/gyms.js?v=689";
import { teamPower, starterIds } from "../systems/build.js?v=689";
import { TYPE_CHART, TYPE_COLORS } from "../../engine/readable/play-core.js?v=689";
import { GYM_BADGES, badgeMedal } from "./badges.js?v=689";
import { ICON } from "./icons.js?v=689";
import { loadSave } from "../storage.js?v=689";

const TYPE_ZH = { Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰", Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力", Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精" };
const POS_ZH = { PG: "控卫", SG: "分卫", SF: "小前", PF: "大前", C: "C" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const monName = (dex) => String((window.__PJ_DEX_ROWS || []).find((r) => r[0] === dex)?.[1] || `No.${dex}`).replace(/#\d+$/, "");
const avgOvr = (list) => {
  const arr = (list || []).filter((p) => p && Number.isFinite(Number(p.ovr)));
  return arr.length ? Math.round(arr.reduce((n, p) => n + Number(p.ovr), 0) / arr.length) : 0;
};
const winPct = (my, opp) => Math.round(Math.max(0.05, Math.min(0.95, 0.5 + (my - opp) * 0.03)) * 100);

function bestTypeMult(atkTypes, defTypes) {
  let best = { mult: 0, atkType: null, defType: null };
  for (const a of atkTypes || []) {
    let m = 1, hit = null;
    const [strong, weak, immune] = TYPE_CHART[a] || [[], [], []];
    for (const d of defTypes || []) {
      if (immune.includes(d)) { m = 0; hit = d; break; }
      if (strong.includes(d)) { m *= 2; hit = d; }
      else if (weak.includes(d)) { m *= 0.5; hit = hit || d; }
    }
    if (m > best.mult) best = { mult: m, atkType: a, defType: hit || (defTypes || [])[0] || null };
  }
  return best;
}

const typeHintLine = (rows, cls, label) => rows.length
  ? `<p class="pth ${cls}"><span>${label}</span>${rows.map((x) => `<b>${TYPE_ZH[x.atkType] || x.atkType}</b><i>→</i>${TYPE_ZH[x.defType] || x.defType}<em>×${x.mult}</em>`).join(" · ")}</p>`
  : "";

function vsTypeHints(myRoster, oppRoster) {
  const mine = [], theirs = [];
  const homeByPos = new Map((myRoster || []).map((p) => [p.pos, p]));
  const awayByPos = new Map((oppRoster || []).map((p) => [p.pos, p]));
  for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
    const h = homeByPos.get(pos), a = awayByPos.get(pos);
    if (!h || !a) continue;
    const hm = bestTypeMult(h.types, a.types);
    const am = bestTypeMult(a.types, h.types);
    if (hm.mult > 1) mine.push(hm);
    if (am.mult > 1) theirs.push(am);
  }
  return { mine, theirs };
}

const monCardHtml = (p, clickable = false, smallText = "") => {
  if (!p?.dex) return "";
  const nm = monName(p.dex);
  const tc = TYPE_COLORS[p.types?.[0]] || "#5a6a92";
  const tag = clickable ? "button" : "div";
  const attrs = clickable ? ` type="button" data-dex="${p.dex}" aria-label="查看 ${esc(nm)} 详情"` : "";
  return `<${tag} class="pms-mon${clickable ? " pms-opp-card" : ""}"${attrs} style="--tc:${tc}">
    <span class="pms-ovr">${p.ovr ?? ""}</span>
    <img src="./sprites/${p.dex}.png" alt=""><b>${esc(nm)}</b><small>${esc(smallText || POS_ZH[p.pos] || p.pos || "")}</small>
  </${tag}>`;
};

const leadCardHtml = (p, selected, save) => {
  if (!p?.dex) return "";
  const nm = monName(p.dex);
  const tc = TYPE_COLORS[p.types?.[0]] || "#5a6a92";
  const mon = p.saveId ? save.mons?.[p.saveId] : null;
  return `<button type="button" class="pms-mon pms-lead-card${selected ? " on" : ""}" data-lead="${p.saveId}" style="--tc:${tc}" aria-pressed="${selected ? "true" : "false"}">
    <span class="pms-ovr">${p.ovr ?? ""}</span>
    <img src="./sprites/${p.dex}.png" alt=""><b>${esc(nm)}</b><small>Lv.${mon?.level || "?"}</small>
  </button>`;
};

/** 当前关卡：沿用赛前对阵结构 */
const STEP_ZH = { wild: "野生", minor: "训练家", rest: "补给", leader: "馆主" };

/** 宏大地图：8 馆轴 + 四天王/冠军/联盟 + 当前路线 5 关 */
function routeMapHtml(save, st) {
  const reg = regionOf(save);
  const gyms = reg.gyms || [];
  const season = save?.journey?.season || {};
  const badgeSet = new Set((season.badges || []).filter((b) => b !== "champion"));
  const badgeCount = badgeSet.size;
  const venue = Number(st.info?.venue) || 0;
  const fkDone = !!season.fourKings?.cleared;
  const fkOpen = badgeCount >= 8;
  const champ = !!season.champion;

  const nodes = gyms.map((g, i) => {
    const done = badgeSet.has(g.badge);
    const cur = i === venue;
    const state = done ? "done" : cur ? "cur" : "lock";
    return `<div class="rm-gym ${state}">
      <span class="rm-no">${i + 1}</span>
      ${badgeMedal(g.badge, 20, { earned: done })}
      <small>${esc(g.name.replace(/道馆$/, "").slice(0, 2))}</small>
    </div>`;
  }).join("");

  const steps = st.steps.map((s) => {
    const state = s.done ? "done" : s.current ? "cur" : "lock";
    return `<div class="rm-step ${state}"><i>${s.done ? "✓" : s.index + 1}</i><small>${STEP_ZH[s.kind] || s.name}</small></div>`;
  }).join("");

  return `<section class="route-map">
    <div class="rm-head">
      <b>冒险地图</b>
      <span>${esc(reg.name)} · ${badgeCount}/8 徽章 · 路线 ${st.step + 1}/5</span>
      <button type="button" class="rm-more" data-progress>完整进度 ›</button>
    </div>
    <div class="rm-gyms">${nodes}</div>
    <div class="rm-goals">
      <div class="rm-goal ${fkDone ? "done" : fkOpen ? "cur" : "lock"}"><b>四天王</b><small>${fkDone ? "已通关" : fkOpen ? "可挑战" : `${badgeCount}/8 徽章`}</small></div>
      <div class="rm-goal ${champ ? "done" : "lock"}"><b>冠军</b><small>${champ ? "已达成" : "击败四天王"}</small></div>
      <div class="rm-goal ${fkOpen ? "cur" : "lock"}"><b>联盟邀请赛</b><small>${fkOpen ? "已开放" : "需 8 枚徽章"}</small></div>
    </div>
    <div class="rm-route">${steps}</div>
  </section>`;
}

function matchupHtml(save, st, leadId = null) {
  const cur = st.steps[st.step];
  const gb = GYM_BADGES[Number(st.info.venue)] || GYM_BADGES[0];
  const myRoster = buildMyRoster(save, 1);
  const coach = save.coach?.name || "我";

  if (cur.kind === "rest") {
    return `<section class="route-rest-card">
      <div class="pms-sec"><b>${esc(cur.title)}</b></div>
      <div class="route-rest">
        <div class="route-rest-item"><i>${ICON.berry}</i><b>普通树果 ×1</b></div>
        <div class="route-rest-item"><i>${ICON.coin}</i><b>篮球币 +20</b></div>
      </div>
    </section>`;
  }

  let oppRoster = [];
  let oppName = "";
  let oppSub = "";
  let oppTitle = "对手首发";
  let myTitle = "我方阵容";
  let myCards = "";
  let oppCards = "";
  let myPowerText = "";
  let winBase = 0;
  let winOpp = 0;
  let typeHtml = "";

  if (cur.kind === "wild") {
    const route = routeForGym(st.gym);
    const lead = myRoster.find((p) => String(p.saveId) === String(leadId)) || myRoster[0];
    const pool = wildRoutePool(route).slice();
    const target = 45 + ((route.minLevel + route.maxLevel) / 2) * 1.2;
    pool.sort((a, b) => Math.abs((a.ovr || 60) - target) - Math.abs((b.ovr || 60) - target));
    const possible = pool.slice(0, 5);
    oppName = "野生宝可梦";
    oppSub = `Lv.${route.minLevel}–${route.maxLevel}`;
    oppTitle = "可能遇到";
    myTitle = "我方首发 · 点击选择";
    myCards = myRoster.length
      ? `<div class="pms-start route-lead-pick">${myRoster.map((p) => leadCardHtml(p, String(p.saveId) === String(lead?.saveId), save)).join("")}</div>`
      : `<div class="route-one"><span class="route-empty">首发为空</span></div>`;
    oppCards = possible.map((p) => monCardHtml({ ...p, ovr: p.ovr || 60 }, true, TYPE_ZH[p.types?.[0]] || "")).join("");
    myPowerText = `战力 ${lead?.ovr ?? 0}`;
    winBase = lead?.ovr || 60;
    winOpp = target;
    typeHtml = `<div class="pms-type-hint">
      <div class="pth-head"><b>系别克制</b><small>路线属性</small></div>
      <p class="pth neutral">野生属性：${route.types.map((t) => TYPE_ZH[t] || t).join(" / ")} · 以实际遭遇为准</p>
    </div>`;
  } else {
    if (cur.kind === "minor") {
      oppRoster = pickGymRoster(st.gym.gym, st.gym.types, -12);
      oppName = st.meta.trainer;
      oppSub = `路线训练家 · 战力 ${avgOvr(oppRoster)}`;
    } else {
      oppRoster = st.info.leaderRoster || [];
      oppName = st.gym.leader;
      oppSub = `${st.gym.name} · 战力 ${st.info.targetPower || avgOvr(oppRoster)}`;
    }
    const myPower = teamPower(save);
    const oppPower = avgOvr(oppRoster);
    oppCards = oppRoster.slice(0, 5).map((p) => monCardHtml(p, true)).join("");
    myCards = myRoster.slice(0, 5).map((p) => monCardHtml(p, false)).join("");
    myPowerText = `战力 ${myPower}`;
    winBase = myPower;
    winOpp = st.info.targetPower || oppPower;
    const hints = vsTypeHints(myRoster, oppRoster);
    typeHtml = `<div class="pms-type-hint">
      <div class="pth-head"><b>系别克制</b><small>仅列出发动 ×2 的属性优势</small></div>
      ${typeHintLine(hints.mine, "good", "我方")}
      ${typeHintLine(hints.theirs, "bad", "敌方")}
      ${!hints.mine.length && !hints.theirs.length ? '<p class="pth neutral">双方首发暂无 ×2 属性优势</p>' : ""}
    </div>`;
  }

  const winP = winPct(winBase, winOpp);
  return `<section class="route-pms" style="--tc:${gb.color}">
    <span class="brief-stage">第 ${st.step + 1}/5 关</span>
    <h2>${esc(cur.title)}</h2>
    <div class="brief-vs">
      <div class="brief-side"><b>${esc(coach)}</b><small>${esc(myPowerText)}</small></div>
      <span class="brief-vs-txt">对阵</span>
      <div class="brief-side away" style="--tc:${gb.color}"><b>${esc(oppName)}</b><small>${esc(oppSub)}</small></div>
    </div>
    <div class="brief-winrow"><span>预计胜率</span><div class="brief-winbar"><i style="width:${winP}%"></i></div><b style="color:${winP >= 50 ? "#57c785" : "#ff8f7c"}">${winP}%</b></div>
    <div class="pms-sec"><b>${oppTitle}</b><div class="pms-opp">${oppCards}</div></div>
    ${typeHtml}
    <div class="pms-head"><b>${myTitle}</b></div>
    ${cur.kind === "wild" ? myCards : `<div class="pms-start">${myCards}</div>`}
  </section>`;
}

export function openGymRoute(save, opts = {}) {
  const embed = !!opts.host;
  const wrap = embed ? opts.host : document.createElement("div");
  if (!embed) {
    wrap.className = "pj-scrim page-modal route-modal";
    wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  }
  wrap.innerHTML = embed
    ? `<div class="route-shell route-embed-shell">
        <div class="sub-page route-body"></div>
        <div class="route-foot"></div>
      </div>`
    : `<div class="pj-page-card"><div class="route-shell">
        <div class="sub-page pj-page-body route-body"></div>
        <div class="route-foot"></div>
      </div></div>`;
  const shell = wrap.querySelector(".route-shell");
  const body = wrap.querySelector(".route-body");
  const foot = wrap.querySelector(".route-foot");
  if (!embed) (document.getElementById("stage") || document.body).appendChild(wrap);

  let state = { notice: opts.notice || "", flash: "" };
  let leadId = null;
  const close = () => { if (!embed) wrap.remove(); opts.onBack?.(); };

  const render = () => {
    const f = loadSave() || save;
    const st = routeState(f);
    if (!st) {
      body.innerHTML = `<div class="page-head"><button class="back" data-back>‹</button><h2>道馆路线</h2></div>
        <p class="page-sub">当前没有可挑战的道馆。</p>
        <div class="route-acts"><button class="pk-btn-gold" data-back>返 回</button></div>`;
      return;
    }
    const cur = st.steps[st.step];
    const reg = regionOf(f);
    const gb = GYM_BADGES[Number(st.info.venue)] || GYM_BADGES[0];
    const starterList = starterIds(f);
    if (!leadId || !starterList.some((id) => String(id) === String(leadId))) leadId = starterList[0] || null;

    body.innerHTML = `
      <style>
        .route-modal .pj-page-card{height:auto;max-height:min(84%,720px)}
        .route-shell{display:flex;flex-direction:column;flex:1;min-height:0}
        .route-embed-shell{height:100%}
        .route-embed .route-body{flex:1;min-height:0;overflow-y:auto;padding:0 0 8px!important;background:transparent}
        .route-body{flex:1;min-height:0;overflow-y:auto;padding:0 14px 12px!important}
        .route-foot{flex:none;display:flex;gap:7px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#12224a);box-shadow:0 -8px 20px rgba(0,0,0,.18)}
        .route-foot .pk-btn-gold{flex:1;min-width:0;padding:10px 6px}
        .route-foot .pk-btn-gold.pm-ghost{background:var(--panel-2,#12224a)!important;color:var(--text,#fff)!important;border:1px solid var(--line,rgba(255,255,255,.18))!important;box-shadow:none!important}
        .route-foot .pm-ghost[data-spectate]{flex:1;border-color:color-mix(in srgb,var(--gold,#f5c542) 42%,var(--line,rgba(255,255,255,.18)))!important}
        .route-foot .pm-ghost[data-back]{flex:0 0 88px}
        .route-body .page-sub{margin-bottom:8px}
        .route-head-right{margin-left:auto;display:flex;align-items:center;gap:8px;flex:none}
        .route-head-right .count{margin-left:0}
        .route-map{margin:0 0 8px;padding:9px 10px 8px;border:1px solid rgba(245,197,66,.24);border-radius:10px;background:linear-gradient(180deg,rgba(245,197,66,.06),rgba(0,0,0,.18))}
        .rm-head{display:flex;align-items:center;gap:7px;margin-bottom:7px;min-width:0}
        .rm-head b{font:700 12px var(--sport,sans-serif);color:var(--gold,#f5c542);flex:none}
        .rm-head span{font-size:8.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rm-more{margin-left:auto;flex:none;padding:3px 7px;border-radius:999px;border:1px solid rgba(245,197,66,.4);background:rgba(245,197,66,.08);color:var(--gold,#f5c542);font:700 8.5px var(--sport,sans-serif);white-space:nowrap}
        .rm-gyms{position:relative;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding-top:1px}
        .rm-gyms::before{content:"";position:absolute;left:6%;right:6%;top:15px;height:2px;background:rgba(255,255,255,.12);z-index:0}
        .rm-gym{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:1px 0 2px;border-radius:5px;border:1px solid transparent;opacity:.42}
        .rm-gym.done{opacity:1}
        .rm-gym.cur{opacity:1;border-color:rgba(245,197,66,.75);background:rgba(245,197,66,.1)}
        .rm-gym .rm-no{font:700 7px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0);line-height:1}
        .rm-gym .badge-medal{filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
        .rm-gym small{font:700 7.5px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0);white-space:nowrap}
        .rm-gym.cur small{color:var(--gold,#f5c542)}
        .rm-goals{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:6px}
        .rm-goal{display:flex;flex-direction:column;gap:1px;padding:4px 5px;border-radius:5px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(0,0,0,.14);min-width:0}
        .rm-goal b{font:700 8.5px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap}
        .rm-goal small{font-size:7.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rm-goal.cur{border-color:rgba(245,197,66,.5);background:rgba(245,197,66,.08)}
        .rm-goal.done{opacity:.72}
        .rm-goal.lock{opacity:.4}
        .rm-route{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-top:6px}
        .rm-step{display:flex;flex-direction:column;align-items:center;gap:1px;padding:3px 1px;border-radius:5px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(0,0,0,.12)}
        .rm-step i{font:700 8px var(--sport,sans-serif);font-style:normal;color:var(--text-dim,#b9b0a0)}
        .rm-step small{font:700 7.5px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
        .rm-step.done{opacity:.62}
        .rm-step.cur{border-color:rgba(245,197,66,.65);background:rgba(245,197,66,.12)}
        .rm-step.cur i,.rm-step.cur small{color:var(--gold,#f5c542)}
        .rm-step.lock{opacity:.38}
        .route-head-card{display:flex;align-items:center;gap:9px;margin:0 0 7px;padding:9px 11px;border:1px solid color-mix(in srgb,var(--gc) 55%,transparent);border-radius:9px;background:
          radial-gradient(100% 100% at 100% 0%,color-mix(in srgb,var(--gc) 20%,transparent),transparent 70%),
          linear-gradient(135deg,color-mix(in srgb,var(--gc) 12%,var(--panel-2,#12224a)),var(--panel-2,#12224a) 76%)}
        .route-head-card .badge-medal{flex:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.28))}
        .route-head-txt{flex:1;min-width:0}
        .route-head-txt b{display:block;font:700 16px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .route-head-txt small{display:block;margin-top:1px;font-size:9.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .route-pms{position:relative;margin:0 0 8px;padding:1px 0 0;text-align:center}
        .route-pms h2{margin:6px 0 9px;font:700 18px var(--sport,sans-serif);color:var(--text,#fff);letter-spacing:.02em}
        .route-pms .pms-mon,.route-pms .pms-opp-card{border-color:transparent;background:none}
        .route-pms .pms-opp-card{transition:transform .12s ease,background .12s ease}
        .route-pms .pms-opp-card:active{background:rgba(255,255,255,.06);transform:translateY(-1px)}
        .route-pms .pms-lead-card{cursor:pointer;border:1px solid transparent;border-radius:8px;transition:background .12s,border-color .12s}
        .route-pms .pms-lead-card.on{border-color:var(--gold,#f5c542);background:color-mix(in srgb,var(--gold,#f5c542) 10%,transparent)}
        .route-pms .pms-lead-card:active{background:rgba(255,255,255,.06)}
        .route-one{display:flex;justify-content:center;padding:0 2px}
        .route-one .pms-mon{width:78px;flex:none}
        .route-empty{font-size:10px;color:var(--text-dim,#b9b0a0);padding:14px 2px}
        .route-rest-card{text-align:left}
        .route-rest{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:2px 0 8px}
        .route-rest-item{display:flex;align-items:center;gap:6px;padding:9px 8px;border:1px solid var(--line,rgba(255,255,255,.14));border-radius:7px;background:rgba(0,0,0,.14)}
        .route-rest-item i{width:22px;height:22px;flex:none;display:grid;place-items:center}
        .route-rest-item i svg{width:20px;height:20px}
        .route-rest-item b{font:700 10px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap}
        .route-acts{display:flex;flex-direction:column;gap:7px;margin-top:2px}
        .route-note{margin:0 0 8px;padding:7px 9px;border:1px solid rgba(245,197,66,.5);border-radius:5px;background:rgba(245,197,66,.1);color:var(--gold,#f5c542);font-size:11px;line-height:1.5}
        @media (max-width:360px){
          .route-pms .pms-mon{height:88px}
          .route-pms .pms-mon img{width:36px;height:36px}
          .route-pms h2{font-size:16px}
        }
      </style>
      <div class="page-head"><button class="back" data-back>‹</button><h2>道馆路线</h2>
        <span class="route-head-right"><span class="count">${st.step + 1}/${st.steps.length}</span></span>
      </div>
      ${state.notice ? `<p class="route-note">${esc(state.notice)}</p>` : ""}
      ${state.flash ? `<p class="route-note">${esc(state.flash)}</p>` : ""}
      ${opts.compact ? "" : routeMapHtml(f, st)}
      <div class="route-head-card" style="--gc:${gb.color};--gc2:${gb.color2}">
        ${badgeMedal(gb.badge, 42)}
        <div class="route-head-txt"><b>${esc(st.gym.name)}</b><small>${esc(reg.name)} · 第 ${Number(st.info.venue) + 1} 馆 · 馆主 ${esc(st.gym.leader || "")} · ${esc(st.gym.typeCn || "")}属性</small></div>
      </div>
      ${matchupHtml(f, st, leadId)}`;
    foot.innerHTML = cur.kind === "wild"
      ? `<button class="pk-btn-gold" data-stage>手动挑战</button>
         <button class="pk-btn-gold pm-ghost" data-spectate>观战</button>`
      : `${cur.kind === "leader"
        ? `<button class="pk-btn-gold" data-leader>挑战馆主</button>`
        : cur.kind === "rest"
          ? `<button class="pk-btn-gold" data-rest>领取补给</button>`
          : `<button class="pk-btn-gold" data-stage>挑战 路线训练家</button>`}
      <button class="pk-btn-gold pm-ghost" data-back>返 回</button>`;
  };

  wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { close(); return; }
    if (e.target.closest("[data-progress]")) {
      if (!embed) wrap.remove();
      opts.onProgress?.();
      return;
    }
    const leadBtn = e.target.closest("[data-lead]");
    if (leadBtn) {
      leadId = leadBtn.dataset.lead;
      const top = body.scrollTop;
      render();
      body.scrollTop = top;
      return;
    }
    const dexBtn = e.target.closest("[data-dex]");
    if (dexBtn) {
      const dex = Number(dexBtn.dataset.dex);
      if (!embed) wrap.remove();
      opts.onDex?.(dex);
      return;
    }
    const f = loadSave() || save;
    if (e.target.closest("[data-stage]")) {
      const st = routeState(f);
      if (!st) return;
      if (!embed) wrap.remove();
      opts.onStage?.(st.steps[st.step], { monId: leadId, spectate: false });
      return;
    }
    if (e.target.closest("[data-spectate]")) {
      const st = routeState(f);
      if (!st) return;
      if (!embed) wrap.remove();
      opts.onStage?.(st.steps[st.step], { monId: leadId, spectate: true });
      return;
    }
    if (e.target.closest("[data-rest]")) {
      if (!embed) wrap.remove();
      opts.onRest?.();
      return;
    }
    if (e.target.closest("[data-leader]")) {
      if (!embed) wrap.remove();
      opts.onLeader?.();
    }
  });

  render();
  return close;
}
