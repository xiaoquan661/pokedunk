/**
 * ui/main-quest.js —— 冒险进度页（S84 重构）
 * 视觉结构：当前目标大卡 → 8 馆节点轴 → 接下来 → 底部固定操作栏。
 * 目标：玩家不滚动也能回答「我在哪 / 下一步做什么 / 奖励是什么」。
 */
import { ensureSeason, leagueInfo, fourKingsInfo, fourKingsRewardPending, startNextSeason } from "../journey/season.js?v=688";
import { regionOf, capInfo, badgeUnlockText, nextRegionOf } from "../journey/regions.js?v=688";
import { routeState, routeForGym } from "../journey/gym-route.js?v=688";
import { wildRoutePool } from "../journey/wild.js?v=688";
import { LEAGUE_GYMS } from "../../engine/readable/play-core.js?v=688";
import { loadSave, writeSave } from "../storage.js?v=688";
import { teamPower } from "../systems/build.js?v=688";
import { leagueSummary } from "../journey/league.js?v=688";
import { GYM_BADGES, badgeMedal } from "./badges.js?v=688";
import { ICON } from "./icons.js?v=688";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const cnDex = (dex) => String((window.__PJ_DEX_ROWS || []).find((r) => r[0] === dex)?.[1] || "").replace(/#\d+$/, "");
const shortVenue = (name) => String(name || "").replace(/道馆$/, "");

/** 每个道馆 = 一个章节：路线类型 + 该路线可能出现的野生池 */
function gymChapter(index) {
  const base = LEAGUE_GYMS[index];
  if (!base) return null;
  const route = routeForGym(base);
  const pool = wildRoutePool(route);
  const target = 45 + ((route.minLevel + route.maxLevel) / 2) * 1.2;
  const picks = pool.slice()
    .sort((a, b) => Math.abs((a.ovr || 60) - target) - Math.abs((b.ovr || 60) - target))
    .slice(0, 8);
  return { route, count: pool.length, picks };
}

const STEP_SHORT = ["野生", "训练家", "补给", "野生", "馆主"];

function routeTrackHtml(route, compact = false) {
  if (!route) return "";
  return `<div class="mq-route5${compact ? " compact" : ""}">
    ${route.steps.map((st, i) => `<div class="mq-rstep ${st.done ? "done" : st.current ? "cur" : "lock"}">
      <i>${st.done ? "✓" : i + 1}</i><small>${STEP_SHORT[i] || st.name}</small>
    </div>`).join("")}
  </div>`;
}

function gymState(gym, i, badges, currentVenue) {
  const done = badges.has(gym.badge);
  const current = currentVenue === i;
  return { done, current, state: done ? "done" : current ? "cur" : "lock" };
}

/** 点开道馆后的底部详情 */
function gymSheetHtml(save, idx, route) {
  const s = ensureSeason(save);
  const reg = regionOf(save);
  const gym = reg.gyms?.[idx];
  if (!gym) return "";
  const badges = new Set(s.badges || []);
  const { done, current } = gymState(gym, idx, badges, leagueInfo(save)?.venue ?? -1);
  const gb = GYM_BADGES[idx] || GYM_BADGES[0];
  const chapter = gymChapter(idx);
  const rec = (s.results || []).filter((r) => r.venue === idx).slice(-1)[0];
  const unlock = badgeUnlockText(idx + 1);
  const mons = chapter ? chapter.picks.map((p) => `<button type="button" class="mq-mon" data-dex="${p.dex}" title="No.${p.dex} ${esc(cnDex(p.dex))}">
    <img src="./sprites/${p.dex}.png" alt=""><small>${esc(cnDex(p.dex))}</small>
  </button>`).join("") : "";
  return `<div class="mq-sheet-scrim" data-sheet-close>
    <div class="mq-sheet" role="dialog" aria-label="${esc(gym.name)}详情">
      <div class="mq-sheet-head">
        ${badgeMedal(gym.badge, 44, { earned: done })}
        <div class="mq-sheet-title">
          <b>${esc(gym.name)} · ${esc(gym.leader)}</b>
          <small>${esc(gym.type)}属性 · ${done ? "徽章已获得" : current ? "当前目标" : "尚未解锁"}</small>
        </div>
        <button class="mq-sheet-close" type="button" data-sheet-close aria-label="关闭">✕</button>
      </div>
      <div class="mq-sheet-body">
        ${current && route ? `<div class="mq-sheet-route">
          <div class="mq-sheet-label"><b>路线 ${route.step + 1}/5</b><small>${esc(route.steps[route.step].title)}</small></div>
          ${routeTrackHtml(route, true)}
        </div>` : ""}
        ${chapter ? `<div class="mq-sheet-label"><b>可能遇到</b><small>共 ${chapter.count} 种 · 以下为常见</small></div>
        <div class="mq-mons">${mons}</div>` : ""}
        <div class="mq-sheet-label"><b>可获得</b></div>
        <ul class="mq-loot">
          <li>徽章：${esc(gb.badgeCn)}</li>
          <li>路线补给：普通树果 ×1 · 篮球币 +20</li>
          <li>${unlock ? `胜利解锁：${esc(unlock)}` : "8 徽章后解锁四天王"}</li>
          <li>战斗掉落：树果 / 训练药剂 / 孵蛋加速券</li>
        </ul>
        ${rec ? `<p class="mq-sheet-rec">最近比分 ${rec.myScore}:${rec.oppScore}${rec.sim ? "（模拟）" : ""}</p>` : ""}
      </div>
    </div>
  </div>`;
}

export function openMainQuest(save, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal mq-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="mq-shell">
    <div class="sub-page pj-page-body mq-body"></div>
    <div class="mq-foot"></div>
    <div class="mq-sheet-host"></div>
  </div></div>`;
  const shell = wrap.querySelector(".mq-shell");
  const body = wrap.querySelector(".mq-body");
  const foot = wrap.querySelector(".mq-foot");
  const sheetHost = wrap.querySelector(".mq-sheet-host");
  (document.getElementById("stage") || document.body).appendChild(wrap);

  let state = { notice: opts.notice || "", flash: "" };
  let detailOpen = -1;
  let showAll = false;
  const close = () => { wrap.remove(); opts.onBack?.(); };

  const renderSheet = () => {
    const f = loadSave() || save;
    sheetHost.innerHTML = detailOpen >= 0 ? gymSheetHtml(f, detailOpen, routeState(f)) : "";
  };

  const render = () => {
    const f = loadSave() || save;
    const s = ensureSeason(f);
    const reg = regionOf(f);
    const cap = capInfo(f);
    const info = leagueInfo(f, "league");
    const route = routeState(f);
    const myPower = teamPower(f);
    const weak = info?.targetPower && myPower + 5 < info.targetPower;
    const fk = fourKingsInfo(f);
    const rewardsPending = fourKingsRewardPending(f);
    const badges = new Set(s.badges || []);
    const currentVenue = info?.kind === "league" ? info.venue : -1;
    const gyms = reg.gyms || [];
    const curGym = currentVenue >= 0 ? gyms[currentVenue] : null;
    const routeCur = route ? route.steps[route.step] : null;
    const fkDone = !!s.fourKings?.cleared;
    const fkUnlocked = cap.badges >= 8;
    const lg = fkUnlocked ? leagueSummary(f) : null;
    const lgText = lg
      ? (lg.active
        ? `第 ${lg.no} 届 · 第 ${Math.min(lg.round + 1, 9)}/9 轮`
        : lg.trophy
          ? `已夺冠 · ${lg.placement || "冠军"} · 可再来一届`
          : lg.started
            ? `${lg.placement || "已结束"} · 可再来一届`
            : "9 队单循环 · 八馆主邀请")
      : "";

    const heroBadge = curGym ? GYM_BADGES[currentVenue] : null;
    let hero = "";
    if (curGym && heroBadge) {
      const chapter = gymChapter(currentVenue);
      const picks = chapter?.picks.slice(0, 5) || [];
      const maxPow = Math.max(myPower, info.targetPower || 1) * 1.18;
      const myPct = Math.max(6, Math.min(100, (myPower / maxPow) * 100));
      const tgtPct = Math.max(0, Math.min(100, ((info.targetPower || 0) / maxPow) * 100));
      const unlock = badgeUnlockText(currentVenue + 1);
      hero = `<section class="mq-hero" style="--gc:${heroBadge.color};--gc2:${heroBadge.color2}">
        <div class="mq-hero-kicker"><span>当前目标</span><em>第 ${currentVenue + 1}/8 馆</em></div>
        <div class="mq-hero-row">
          <div class="mq-hero-info">
            <b>${esc(curGym.name)}</b>
            <small>${esc(curGym.type)}属性 · 馆主 ${esc(curGym.leader)}</small>
          </div>
          <div class="mq-hero-badge">${badgeMedal(curGym.badge, 56)}<small>${esc(heroBadge.badgeCn)}</small></div>
        </div>
        <div class="mq-power">
          <span>我方 <b>${myPower}</b></span>
          <div class="mq-pbar"><i style="width:${myPct}%"></i><em style="left:${tgtPct}%"></em></div>
          <span>建议 <b>${info.targetPower}</b></span>
        </div>
        ${weak ? `<p class="mq-warn">战力偏低约 ${info.targetPower - myPower} 点，建议先练级或捕捉</p>` : ""}
        ${routeTrackHtml(route)}
        ${routeCur ? `<div class="mq-nextstep">
          <small>下一步</small><b>${esc(routeCur.title)}</b><span>${esc(routeCur.desc)}</span>
        </div>` : ""}
        <div class="mq-encrow">
          <small>路线常见</small>
          <div>${picks.map((p) => `<button type="button" data-dex="${p.dex}" title="${esc(cnDex(p.dex))}">
            <img src="./sprites/${p.dex}.png" alt=""><span>${esc(cnDex(p.dex))}</span>
          </button>`).join("")}</div>
        </div>
        <div class="mq-hero-reward">首通：${esc(heroBadge.badgeCn)}${unlock ? ` · ${esc(unlock)}` : ""}</div>
      </section>`;
    } else if (fk) {
      const maxPow = Math.max(myPower, fk.targetPower || 1) * 1.18;
      const myPct = Math.max(6, Math.min(100, (myPower / maxPow) * 100));
      const tgtPct = Math.max(0, Math.min(100, ((fk.targetPower || 0) / maxPow) * 100));
      hero = `<section class="mq-hero elite" style="--gc:#e05a5a;--gc2:#3a0c14">
        <div class="mq-hero-kicker"><span>当前目标</span><em>8/8 徽章</em></div>
        <div class="mq-hero-row">
          <div class="mq-hero-info"><b>四天王挑战</b><small>关都 · 最终试炼 · 胜利即为地区冠军</small></div>
          <div class="mq-hero-emblem">★</div>
        </div>
        <div class="mq-power">
          <span>我方 <b>${myPower}</b></span>
          <div class="mq-pbar"><i style="width:${myPct}%"></i><em style="left:${tgtPct}%"></em></div>
          <span>建议 <b>${fk.targetPower}</b></span>
        </div>
        ${weak ? `<p class="mq-warn">战力偏低约 ${fk.targetPower - myPower} 点，建议先整备阵容</p>` : ""}
        <div class="mq-nextstep"><small>下一步</small><b>击败四天王</b><span>通关后获得首通奖励并成为关都冠军</span></div>
        ${rewardsPending ? `<div class="mq-hero-reward">首通奖励待领取</div>` : ""}
      </section>`;
    } else {
      const next = nextRegionOf(f);
      hero = `<section class="mq-hero champion" style="--gc:#f5c542;--gc2:#3a2a06">
        <div class="mq-hero-kicker"><span>当前目标</span><em>${s.champion ? "地区冠军" : "主线完成"}</em></div>
        <div class="mq-hero-row">
          <div class="mq-hero-info"><b>${esc(reg.name)}${s.champion ? "冠军" : "主线完成"}</b>
          <small>${s.champion ? "已击败四天王" : "当前地区主线已全部完成"}</small></div>
          <div class="mq-hero-emblem">♛</div>
        </div>
        <div class="mq-nextstep"><small>下一步</small><b>${next?.available ? `前往${esc(next.name)}` : `${esc(next?.name || "下一地区")} · 内容制作中`}</b><span>${next?.available ? "开启新的 8 馆旅程" : "当前冠军进度已保存"}</span></div>
      </section>`;
    }

    const axis = gyms.map((g, i) => {
      const st = gymState(g, i, badges, currentVenue);
      return `<button type="button" class="mq-gcell ${st.state}" data-gym="${i}" aria-label="${esc(g.name)}">
        <span class="mq-gnum">${i + 1}</span>
        ${badgeMedal(g.badge, 24, { earned: st.done })}
        <small>${esc(shortVenue(g.name))}</small>
      </button>`;
    }).join("");

    const nextIdx = currentVenue >= 0 ? currentVenue + 1 : -1;
    const nextGym = nextIdx >= 0 && nextIdx < gyms.length ? gyms[nextIdx] : null;
    const nextRow = nextGym ? `<button type="button" class="mq-nextrow" data-gym="${nextIdx}">
      <span class="mq-nodeno">${nextIdx + 1}</span>
      <div><b>${esc(nextGym.name)} · ${esc(nextGym.leader)}</b><small>${esc(nextGym.type)}属性 · 完成当前馆后解锁</small></div>
      <span class="mq-rowstate">锁定 ›</span>
    </button>` : "";
    const fkRow = `<div class="mq-nextrow static ${fkDone ? "done" : fkUnlocked ? "cur" : "lock"}">
      <span class="mq-nodeno star">★</span>
      <div><b>四天王</b><small>${fkDone ? "已通关" : fkUnlocked ? (rewardsPending ? "已通关 · 首通奖励待领" : "8 徽章达成 · 可挑战") : `集齐 8 枚徽章解锁（${cap.badges}/8）`}</small></div>
      <span class="mq-rowstate">${fkDone ? "已完成" : fkUnlocked ? "可挑战" : "锁定"}</span>
    </div>`;
    const champRow = `<div class="mq-nextrow static ${s.champion ? "done" : "lock"}">
      <span class="mq-nodeno crown">♛</span>
      <div><b>${esc(reg.name)}冠军</b><small>${s.champion ? "已夺冠" : "击败四天王即为地区冠军"}</small></div>
      <span class="mq-rowstate">${s.champion ? "已完成" : "锁定"}</span>
    </div>`;

    const allRows = gyms.map((g, i) => {
      const st = gymState(g, i, badges, currentVenue);
      const unlock = badgeUnlockText(i + 1);
      const routeText = st.current && route ? ` · 路线 ${route.step + 1}/5` : "";
      return `<button type="button" class="mq-allrow ${st.state}" data-gym="${i}">
        <span class="mq-nodeno">${i + 1}</span>
        <div><b>${esc(g.name)} · ${esc(g.leader)}</b><small>${esc(g.type)} · ${st.done ? "徽章已获得" : st.current ? "当前目标" : "未解锁"}${routeText}${unlock ? ` · 解锁：${esc(unlock)}` : ""}</small></div>
        <span class="mq-rowstate">${st.done ? "已完成" : st.current ? "挑战" : "锁定"} ›</span>
      </button>`;
    }).join("");

    let primary;
    if (fk) primary = { attr: "data-elite", label: "挑战四天王", sub: "8/8 徽章 · 最终试炼" };
    else if (info?.kind === "league") {
      const atLeader = route && route.step >= route.steps.length - 1;
      primary = {
        attr: "data-route",
        label: atLeader ? "挑战馆主" : route && route.step > 0 ? "继续路线" : "开始路线",
        sub: routeCur ? `${route.step + 1}/5 · ${routeCur.title}` : "清完路线后挑战馆主",
      };
    } else if (info?.kind !== "done") {
      primary = { attr: "data-start", label: "进入比赛", sub: info?.label || "" };
    } else if (s.champion) {
      const next = nextRegionOf(f);
      if (next?.available) primary = { attr: "data-next", label: `前往${next.name}`, sub: "开启新的 8 馆旅程" };
      else primary = { attr: "", label: `${next?.name || "下一地区"} · 制作中`, sub: "冠军进度已保存", off: true };
    } else if (s.phase === "done") primary = { attr: "data-next", label: "进入下一地区", sub: "开启新的 8 馆旅程" };
    else primary = { attr: "data-back", label: "返回主页", sub: "" };

    body.innerHTML = `
      <style>
        .mq-shell{position:relative;display:flex;flex-direction:column;flex:1;min-height:0}
        .mq-body{flex:1;min-height:0;overflow-y:auto;padding:0 14px 12px!important}
        .mq-top{position:sticky;top:0;z-index:4;display:flex;align-items:center;gap:9px;padding:12px 0 9px;background:linear-gradient(180deg,var(--panel-2,#12224a) 72%,transparent);margin:0 -14px;padding-left:14px;padding-right:14px}
        .mq-back{width:31px;height:31px;flex:none;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.18);color:var(--text,#fff);font:700 20px/1 var(--sport,sans-serif)}
        .mq-headtxt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
        .mq-headtxt b{font:700 16px var(--sport,sans-serif);color:var(--text,#fff);letter-spacing:.02em}
        .mq-headtxt small{font-size:9.5px;color:var(--text-dim,#b9b0a0)}
        .mq-cap{flex:none;padding:4px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 55%,transparent);background:color-mix(in srgb,var(--gold,#f5c542) 11%,transparent);color:var(--gold,#f5c542);font:700 9.5px var(--sport,sans-serif);white-space:nowrap}
        .mq-notice{margin:0 0 8px;padding:7px 9px;border:1px solid rgba(245,197,66,.5);border-radius:6px;background:rgba(245,197,66,.1);color:var(--gold,#f5c542);font-size:10.5px;line-height:1.5}
        .mq-hero{position:relative;overflow:hidden;margin:2px 0 10px;padding:11px 12px 10px 15px;border:1px solid color-mix(in srgb,var(--gc) 42%,var(--line,#3a3a3a));border-radius:9px;background:var(--panel-2,#12224a)}
        .mq-hero::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gc);opacity:.9;pointer-events:none}
        .mq-hero.elite{border-color:color-mix(in srgb,var(--gc) 52%,var(--line,#3a3a3a))}
        .mq-hero.champion{border-color:color-mix(in srgb,var(--gold,#f5c542) 52%,var(--line,#3a3a3a))}
        .mq-hero-kicker{display:flex;align-items:center;justify-content:space-between;gap:8px;position:relative;z-index:1;font:700 9px var(--sport,sans-serif);letter-spacing:.08em}
        .mq-hero-kicker span{color:var(--gold,#f5c542);text-transform:uppercase}
        .mq-hero-kicker em{font-style:normal;color:var(--text-dim,#b9b0a0)}
        .mq-hero-row{display:flex;align-items:center;gap:10px;margin-top:3px;position:relative;z-index:1}
        .mq-hero-info{flex:1;min-width:0}
        .mq-hero-info b{display:block;font:700 19px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-hero-info small{display:block;margin-top:1px;font-size:10px;color:var(--text-dim,#c9c0a8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-hero-badge{flex:none;display:flex;flex-direction:column;align-items:center;gap:1px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.28))}
        .mq-hero-badge small{font:700 8px var(--sport,sans-serif);color:var(--gold,#f5c542);white-space:nowrap}
        .mq-hero-emblem{width:56px;height:56px;flex:none;display:grid;place-items:center;border-radius:50%;border:2px solid color-mix(in srgb,var(--gc) 70%,transparent);background:color-mix(in srgb,var(--gc) 13%,transparent);color:var(--gc);font:700 27px/1 var(--sport,sans-serif)}
        .mq-power{display:flex;align-items:center;gap:7px;margin-top:7px;font:700 9px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0);position:relative;z-index:1}
        .mq-power b{color:var(--text,#fff);font-size:10.5px}
        .mq-pbar{position:relative;flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:visible}
        .mq-pbar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#57c785,var(--gc))}
        .mq-pbar em{position:absolute;top:-3px;width:2px;height:11px;border-radius:1px;background:var(--text,#fff);opacity:.72}
        .mq-warn{margin:5px 0 0;padding:4px 7px;border-radius:4px;background:rgba(255,110,90,.12);color:#ff9a86;font-size:9px;line-height:1.4;position:relative;z-index:1}
        .mq-route5{position:relative;display:flex;align-items:flex-start;margin-top:9px;padding-top:1px;position:relative;z-index:1}
        .mq-route5::before{content:"";position:absolute;left:9%;right:9%;top:10px;height:1px;background:rgba(255,255,255,.16)}
        .mq-rstep{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
        .mq-rstep i{width:19px;height:19px;display:grid;place-items:center;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.2));background:var(--panel-2,#12224a);color:var(--text-dim,#b9b0a0);font:700 9px/1 var(--sport,sans-serif);font-style:normal}
        .mq-rstep small{font:700 7.5px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0);white-space:nowrap}
        .mq-rstep.done i{border-color:#57c785;background:#57c785;color:#0b2416}
        .mq-rstep.done small{color:#57c785}
        .mq-rstep.cur i{border-color:var(--gold,#f5c542);background:var(--gold,#f5c542);color:#2a1b06;box-shadow:0 0 0 3px color-mix(in srgb,var(--gold,#f5c542) 18%,transparent)}
        .mq-rstep.cur small{color:var(--gold,#f5c542)}
        .mq-route5.compact{margin-top:5px}
        .mq-route5.compact .mq-rstep i{width:17px;height:17px;font-size:8px}
        .mq-nextstep{display:flex;align-items:baseline;gap:6px;margin-top:9px;padding:6px 8px;border-radius:5px;background:rgba(0,0,0,.16);position:relative;z-index:1}
        .mq-nextstep small{flex:none;font:700 8px var(--sport,sans-serif);color:var(--gold,#f5c542);letter-spacing:.08em}
        .mq-nextstep b{font:700 10px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-nextstep span{flex:1;min-width:0;font-size:8.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}
        .mq-encrow{display:flex;align-items:center;gap:7px;margin-top:8px;position:relative;z-index:1}
        .mq-encrow>small{flex:none;font:700 8px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
        .mq-encrow>div{flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;min-width:0}
        .mq-encrow button{display:flex;flex-direction:column;align-items:center;gap:1px;padding:2px;border:1px solid rgba(255,255,255,.08);border-radius:4px;background:rgba(0,0,0,.14);min-width:0}
        .mq-encrow img{width:27px;height:27px;image-rendering:pixelated}
        .mq-encrow button span{width:100%;font-size:7px;line-height:1.2;text-align:center;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-hero-reward{margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.1);font:700 8.5px var(--sport,sans-serif);color:var(--gold,#f5c542);position:relative;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-sechead{display:flex;align-items:baseline;gap:7px;margin:0 0 6px}
        .mq-sechead b{font:700 12.5px var(--sport,sans-serif);color:var(--gold,#f5c542)}
        .mq-sechead span{font:700 9.5px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
        .mq-sechead button{margin-left:auto;border:0;background:none;padding:0;color:var(--text-dim,#b9b0a0);font:700 9.5px var(--sport,sans-serif)}
        .mq-axis{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin:0 0 5px}
        .mq-gcell{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:0;height:51px;padding:2px 0 1px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:6px;background:rgba(0,0,0,.16)}
        .mq-gcell.lock{filter:grayscale(.35)}
        .mq-gcell.lock .badge-medal{opacity:.48}
        .mq-gcell.lock small{color:var(--text-dim,#b9b0a0)}
        .mq-gcell.done{border-color:rgba(87,199,133,.42);background:rgba(87,199,133,.08)}
        .mq-gcell.cur{border-color:var(--gold,#f5c542);background:color-mix(in srgb,var(--gold,#f5c542) 12%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--gold,#f5c542) 24%,transparent)}
        .mq-gnum{position:absolute;left:3px;top:2px;font:700 7px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
        .mq-gcell.cur .mq-gnum{color:var(--gold,#f5c542)}
        .mq-gcell small{width:100%;font-size:7px;line-height:1.1;text-align:center;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-gcell.done small{color:#57c785}
        .mq-gcell.cur small{color:var(--gold,#f5c542);font-weight:700}
        .mq-longgoals{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:0 0 6px}
        .mq-league{display:flex;align-items:center;gap:7px;width:100%;margin:0 0 10px;padding:7px 9px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 38%,transparent);border-radius:6px;background:color-mix(in srgb,var(--gold,#f5c542) 6%,transparent);text-align:left}
        .mq-league>i{width:22px;height:22px;flex:none;display:grid;place-items:center;color:var(--gold,#f5c542)}
        .mq-league>i svg{width:20px;height:20px}
        .mq-league>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
        .mq-league b{font:700 10px var(--sport,sans-serif);color:var(--text,#fff)}
        .mq-league small{font-size:8.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-league>span{flex:none;font:700 8.5px var(--sport,sans-serif);color:var(--gold,#f5c542)}
        .mq-lg{display:flex;align-items:center;gap:4px;min-width:0;padding:4px 6px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:5px;background:rgba(0,0,0,.12);font-size:8px;color:var(--text-dim,#b9b0a0)}
        .mq-lg b{font:700 8.5px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap}
        .mq-lg small{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-lg i{font-style:normal;color:var(--gold,#f5c542);font-size:11px}
        .mq-lg.cur{border-color:rgba(245,197,66,.55);background:rgba(245,197,66,.09)}
        .mq-lg.done{opacity:.7}
        .mq-lg.lock b{color:var(--text-dim,#b9b0a0)}
        .mq-nextrow{display:flex;align-items:center;gap:7px;width:100%;padding:7px 8px;margin-bottom:4px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:6px;background:rgba(0,0,0,.13);text-align:left}
        .mq-nextrow.static{pointer-events:none}
        .mq-nextrow.done{border-color:rgba(87,199,133,.4);background:rgba(87,199,133,.07)}
        .mq-nextrow.cur{border-color:rgba(245,197,66,.55);background:rgba(245,197,66,.09)}
        .mq-nextrow.lock{background:rgba(0,0,0,.07)}
        .mq-nextrow.lock b{color:var(--text-dim,#b9b0a0)}
        .mq-nodeno{width:21px;height:21px;flex:none;display:grid;place-items:center;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.18));color:var(--gold,#f5c542);font:700 8.5px var(--sport,sans-serif)}
        .mq-nodeno.star,.mq-nodeno.crown{font-size:10px}
        .mq-nextrow>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
        .mq-nextrow b{font:700 10px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-nextrow small{font-size:8.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-rowstate{flex:none;font:700 8.5px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
        .mq-nextrow.cur .mq-rowstate{color:var(--gold,#f5c542)}
        .mq-nextrow.done .mq-rowstate{color:#57c785}
        .mq-allrow{display:flex;align-items:center;gap:7px;width:100%;padding:6px 8px;margin-bottom:4px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:6px;background:rgba(0,0,0,.11);text-align:left}
        .mq-allrow.done{border-color:rgba(87,199,133,.32)}
        .mq-allrow.cur{border-color:rgba(245,197,66,.55);background:rgba(245,197,66,.09)}
        .mq-allrow.lock{background:rgba(0,0,0,.06)}
        .mq-allrow.lock b{color:var(--text-dim,#b9b0a0)}
        .mq-allrow>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
        .mq-allrow b{font:700 9.5px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-allrow small{font-size:8px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-allrow.cur .mq-rowstate{color:var(--gold,#f5c542)}
        .mq-allrow.done .mq-rowstate{color:#57c785}
        .mq-foot{position:relative;flex:none;display:flex;gap:6px;padding:9px 12px calc(9px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#12224a);box-shadow:0 -10px 24px rgba(0,0,0,.24)}
        .mq-prep-btn{width:52px;flex:none;border-radius:8px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 45%,transparent);background:color-mix(in srgb,var(--gold,#f5c542) 8%,transparent);color:var(--gold,#f5c542);font:700 10px var(--sport,sans-serif)}
        .mq-cta{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:6px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 72%,transparent);background:linear-gradient(180deg,#ffd75e,#f5c542);color:#241a06;box-shadow:0 3px 0 #8a6a00;font:700 13px var(--sport,sans-serif)}
        .mq-cta small{font:700 8px var(--sport,sans-serif);color:rgba(36,26,6,.68);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
        .mq-cta.off{border-color:var(--line,rgba(255,255,255,.16));background:rgba(255,255,255,.08);color:var(--text-dim,#b9b0a0);box-shadow:none}
        .mq-prep-pop{position:absolute;left:10px;right:10px;bottom:calc(100% + 7px);z-index:8;padding:9px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 38%,transparent);border-radius:9px;background:var(--panel-2,#12224a);box-shadow:0 12px 26px rgba(0,0,0,.42);display:none}
        .mq-shell.prep-open .mq-prep-pop{display:block}
        .mq-prep-pop>b{display:block;margin-bottom:6px;font:700 9.5px var(--sport,sans-serif);color:var(--gold,#f5c542)}
        .mq-prep-pop>div{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
        .mq-prep-pop button{padding:7px 2px;border:1px solid var(--line,rgba(255,255,255,.14));border-radius:5px;background:rgba(0,0,0,.14);color:var(--text,#fff);font:700 9.5px var(--sport,sans-serif)}
        .mq-sheet-host{position:absolute;inset:0;z-index:30;pointer-events:none}
        .mq-sheet-scrim{position:absolute;inset:0;display:flex;align-items:flex-end;background:rgba(2,5,12,.58);backdrop-filter:blur(2px);pointer-events:auto;animation:mq-sheet-in .18s ease-out}
        .mq-sheet{width:100%;max-height:72%;overflow-y:auto;padding:11px 12px calc(13px + env(safe-area-inset-bottom,0px));border-top:1px solid color-mix(in srgb,var(--gold,#f5c542) 38%,transparent);border-radius:14px 14px 0 0;background:var(--panel-2,#12224a);box-shadow:0 -16px 34px rgba(0,0,0,.46);animation:mq-sheet-up .2s cubic-bezier(.2,.9,.3,1)}
        @keyframes mq-sheet-in{from{opacity:0}to{opacity:1}}
        @keyframes mq-sheet-up{from{transform:translateY(24px)}to{transform:translateY(0)}}
        .mq-sheet-head{display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--line,rgba(255,255,255,.12))}
        .mq-sheet-head .badge-medal{flex:none}
        .mq-sheet-title{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
        .mq-sheet-title b{font:700 13px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-sheet-title small{font-size:9px;color:var(--text-dim,#b9b0a0)}
        .mq-sheet-close{width:28px;height:28px;flex:none;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.18));background:rgba(0,0,0,.16);color:var(--text-dim,#b9b0a0);font:700 12px var(--sport,sans-serif)}
        .mq-sheet-route{margin-top:9px}
        .mq-sheet-label{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:9px 0 4px}
        .mq-sheet-label b{font:700 9.5px var(--sport,sans-serif);color:var(--gold,#f5c542)}
        .mq-sheet-label small{font-size:8px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-mons{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
        .mq-mon{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 2px;border:1px solid rgba(255,255,255,.09);border-radius:4px;background:rgba(0,0,0,.16);min-width:0;color:inherit;font:inherit;cursor:pointer}
        .mq-mon img{width:32px;height:32px;image-rendering:pixelated;flex:none}
        .mq-mon small{width:100%;font-size:8px;line-height:1.2;text-align:center;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mq-loot{margin:0;padding-left:14px;font-size:9px;line-height:1.6;color:var(--text-dim,#b9b0a0)}
        .mq-sheet-rec{margin:7px 0 0;font-size:9px;color:var(--text-dim,#b9b0a0)}
      </style>
      <div class="mq-top">
        <button class="mq-back" data-back aria-label="返回">‹</button>
        <div class="mq-headtxt"><b>冒险进度</b><small>${esc(reg.name)} · ${cap.badges}/8 徽章</small></div>
        <span class="mq-cap">上限 Lv.${cap.cap}</span>
      </div>
      ${state.notice ? `<p class="mq-notice">${esc(state.notice)}</p>` : ""}
      ${state.flash ? `<p class="mq-notice">${esc(state.flash)}</p>` : ""}
      ${hero}
      <div class="mq-sechead"><b>${esc(reg.name)} 8 馆</b><span>${cap.badges}/8</span><button type="button" data-badges>徽章墙 ›</button></div>
      <div class="mq-axis">${axis}</div>
      <div class="mq-longgoals">
        <div class="mq-lg ${fkDone ? "done" : fkUnlocked ? "cur" : "lock"}"><i>★</i><b>四天王</b><small>${fkDone ? "已通关" : fkUnlocked ? "可挑战" : `${cap.badges}/8 徽章`}</small></div>
        <div class="mq-lg ${s.champion ? "done" : "lock"}"><i>♛</i><b>冠军</b><small>${s.champion ? "已达成" : "击败四天王"}</small></div>
      </div>
      ${lg ? `<button type="button" class="mq-league" data-league>
        <i>${ICON.trophy}</i>
        <div><b>联盟邀请赛</b><small>${esc(lgText)}</small></div>
        <span>${lg.active ? "进行中" : "进入"} ›</span>
      </button>` : ""}
      <div class="mq-sechead"><b>接下来</b><button type="button" data-all>${showAll ? "收起全部" : "全部道馆"}</button></div>
      ${nextRow}${fkRow}${champRow}
      ${showAll ? `<div class="mq-allprint">${allRows}</div>` : ""}
    `;

    const off = primary.off ? ' disabled' : "";
    foot.innerHTML = `
      <div class="mq-prep-pop"><b>出发前准备</b>
        <div>
          <button type="button" data-prep="train">练级</button>
          <button type="button" data-prep="wild">捕捉</button>
          <button type="button" data-prep="team">队伍</button>
          <button type="button" data-prep="shop">商店</button>
          <button type="button" data-prep="egg">孵蛋</button>
        </div>
      </div>
      <button class="mq-prep-btn" type="button" data-prep-toggle>准备</button>
      <button class="mq-cta${primary.off ? " off" : ""}" type="button" ${primary.attr}${off}>
        <span>${esc(primary.label)}</span>
        ${primary.sub ? `<small>${esc(primary.sub)}</small>` : ""}
      </button>`;
    renderSheet();
  };

  wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-sheet-close]")) { detailOpen = -1; renderSheet(); return; }
    if (e.target.closest("[data-back]")) { close(); return; }
    if (e.target.closest("[data-league]")) { wrap.remove(); opts.onLeague?.(); return; }
    const monBtn = e.target.closest("[data-dex]");
    if (monBtn) {
      const dex = Number(monBtn.dataset.dex);
      wrap.remove();
      opts.onDex?.(dex);
      return;
    }
    if (e.target.closest("[data-gym]")) {
      detailOpen = Number(e.target.closest("[data-gym]").dataset.gym);
      renderSheet();
      return;
    }
    if (e.target.closest("[data-prep-toggle]")) {
      shell.classList.toggle("prep-open");
      return;
    }
    if (!e.target.closest(".mq-prep-pop")) shell.classList.remove("prep-open");
    const prep = e.target.closest("[data-prep]");
    if (prep) {
      wrap.remove();
      opts.onPrep?.(prep.dataset.prep);
      return;
    }
    if (e.target.closest("[data-all]")) {
      showAll = !showAll;
      const top = body.scrollTop;
      render();
      body.scrollTop = top;
      return;
    }
    if (e.target.closest("[data-route]")) {
      wrap.remove();
      opts.onRoute?.();
      return;
    }
    if (e.target.closest("[data-elite]")) {
      wrap.remove();
      opts.onElite?.();
      return;
    }
    if (e.target.closest("[data-badges]")) {
      wrap.remove();
      opts.onBadges?.();
      return;
    }
    if (e.target.closest("[data-start]")) {
      const f = loadSave() || save;
      const info = leagueInfo(f, "league");
      wrap.remove();
      opts.onStart?.(info);
      return;
    }
    if (e.target.closest("[data-next]")) {
      const f = loadSave() || save;
      const r = startNextSeason(f);
      if (r?.blocked) {
        state.notice = `${r.region.name}内容制作中，先保留当前冠军进度`;
        render();
        return;
      }
      writeSave(f);
      wrap.remove();
      opts.onNext?.();
    }
  });

  render();
  return close;
}
