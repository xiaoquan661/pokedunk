/**
 * app.js —— 应用入口与路由（pokedunk-v2）
 * 场景流：开始界面 →（点击开始）→ 五位置选初始伙伴 → 主界面（图二布局）
 * 存档判定：进入即 loadSave()——有档直接进主界面（单档自动，GDD S8），无档走开局。
 */
import "./systems/evo-rules.js?v=25"; // 先覆盖引擎原进化等级，再加载其余模块
import { loadSave, createSave, writeSave, startJourney } from "./storage.js?v=39";
import { renderDex } from "./ui/dex.js?v=46";
import { renderShop, renderEgg } from "./ui/shop-egg.js?v=54";
import { openSettings } from "./ui/settings.js?v=77";
import { renderBag } from "./ui/bag.js?v=41";
import { renderTeam } from "./ui/team.js?v=58";
import { buildGymMatch, mountMatch } from "./journey/match-screen.js?v=101";
import { gameAudio, installAudioUnlock } from "./platform/audio.js?v=33";
import { watchRewardedAd } from "./platform/ads.js?v=28";
import { ensureSeason, currentMatchInfo, myTeamPower, leagueInfo, fourKingsInfo, startNextSeason, advanceBye, rankTable, GYM_CN, roundView } from "./journey/season.js?v=38";
import { settleMatchResult } from "./journey/settle.js?v=61";
import { buildDailyMatch, settleDaily, dailyPreview } from "./journey/daily.js?v=42";
import { openDaily } from "./ui/daily.js?v=45";
import { openAchievements } from "./ui/achv-ui.js?v=37";
import { startTutorial } from "./ui/tutorial.js?v=32";
import { startOnboarding, mountGuide } from "./ui/onboarding.js?v=40";
import { openBadgeDetail, playBadgeGrant } from "./ui/badges.js?v=27";
import { openEarn, bumpDaily } from "./ui/earn.js?v=42";
import { ACHV } from "./systems/achv.js?v=32";
import { ensureLineupSlots, monPower, mainOVR, bondMultipliers, rarityOf, RARITY_COLOR } from "./systems/build.js?v=32";
import { playEvolve } from "./ui/anim.js?v=34";
import { ICON } from "./ui/icons.js?v=32";
import { LINE_ICON } from "./ui/menu-line-icons.js?v=25";
import { pendingLegend } from "./journey/legend.js?v=28";
import { openLegendPicker } from "./ui/legend.js?v=29";
import {
  getPokemon,
  calcOVR,
  MatchEngine,
  Renderer,
  demoMatch,
  attractLoop,
  preloadSprites,
  pickTeamRoster,
  versusTeam,
  TYPE_COLORS,
  TYPE_CHART,
  COURT_STYLES,
  defaultCourtStyle,
  LEAGUE_GYMS,
} from "../engine/readable/play-core.js?v=39";

const app = document.getElementById("app");
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const TYPE_ZH = { Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰", Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力", Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精" };

/** 单属性进攻倍率（与引擎 Xt 等价） */
function typeMult(atk, defTypes) {
  const [strong, weak, immune] = TYPE_CHART[atk] || [[], [], []];
  let m = 1;
  for (const d of defTypes || []) {
    if (immune.includes(d)) return 0;
    if (strong.includes(d)) m *= 2;
    else if (weak.includes(d)) m *= 0.5;
  }
  return m;
}

/** 多属性攻击取最高倍率（与引擎 Va 等价），并记录命中的属性用于提示 */
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

/** 篮球币图标 */
const COIN_SVG = LINE_ICON.coin;
/** 徽章图标（SVG：银灰奖牌） */
const BADGE_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="9" r="6" fill="#c9d3e8" stroke="#5a6a92" stroke-width="1.5"/><text x="12" y="12" text-anchor="middle" font-size="7" font-weight="bold" fill="#5a6a92" font-family="monospace">★</text><path d="M8 14 L6.5 21 L12 17.5 L17.5 21 L16 14" fill="#c9d3e8" stroke="#5a6a92" stroke-width="1.5"/></svg>`;
/** 观战图标（SVG 眼睛） */
const EYE_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;

/** 结果页小图标（SVG，统一 14px 描边风格） */
const LOCK_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="flex-shrink:0"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const GIFT_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><rect x="4" y="10" width="16" height="10" rx="2" fill="#f5c542" stroke="#7a5200" stroke-width="1.5"/><path d="M3 7h18v4H3z" fill="#ffe08a" stroke="#7a5200" stroke-width="1.5"/><path d="M12 7v13M12 7c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3" fill="none" stroke="#7a5200" stroke-width="1.5"/></svg>`;
const SIGN_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><path d="M3 12h4l2-3 3 6 2-3h7" fill="none" stroke="#21d07a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="12" r="1.6" fill="#21d07a"/></svg>`;
const UP_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style="flex-shrink:0"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="#f5c542" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ================= 场景一：开始界面 ================= */
function showStart() {
  app.replaceChildren();
  const sc = el(`
    <div class="screen-start">
      <div class="start-bg"><canvas></canvas></div>
      <div class="start-dim"></div>
      <div class="start-title">
        <h1>口袋灌篮</h1>
        <p>与宝可梦伙伴一起，征服街头篮球场</p>
        <button class="start-hint">点 击 开 始</button>
      </div>
    </div>`);
  app.append(sc);

  // 背景：demo MatchEngine + 渲染器（与原版 attract 同机制——真实球场动起来）
  const canvas = sc.querySelector("canvas");
  let stop = null;
  (async () => {
    // 预载 demo 两队精灵图后启动渲染循环
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    stop = attractLoopFor(canvas, demo, renderer);
  })();

  let leaving = false;
  sc.querySelector(".start-hint").addEventListener("click", () => {
    if (leaving) return;
    leaving = true;
    stop?.();
    sc.classList.add("is-leaving");
    setTimeout(() => {
      const save = loadSave();
      if (save && save.journey.stage !== "starter") showHome(save);
      else showStarter(save && save.journey.stage === "starter" ? save : createSave());
    }, 640);
  });
}

/** 精简版 attract 循环：仅渲染 demo 比赛画面作背景（无计分条回调）——draw(engine, dt) 签名与原版一致 */
function attractLoopFor(canvas, demo, renderer) {
  let stop = false, last = performance.now(), acc = 0;
  const engine = demo;
  const QT = 1 / 60;
  const input = { mx: 0, my: 0, turbo: false, shoot: false, shootHeld: false, pass: false, steal: false, special: false, swap: false };
  const frame = (now) => {
    if (stop) return;
    requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1e3));
    last = now;
    acc += dt;
    while (acc >= QT) { engine.update(QT, input); acc -= QT; }
    renderer.draw(engine, dt);
  };
  renderer.snap(engine);
  requestAnimationFrame(frame);
  return () => { stop = true; };
}

/* ================= 场景二：御三家三选一 ================= */
const STARTERS = [
  { pos: "PG", dex: 7, cn: "杰尼龟", type: "Water" },
  { pos: "SG", dex: 4, cn: "小火龙", type: "Fire" },
  { pos: "SF", dex: 1, cn: "妙蛙种子", type: "Grass" },
  { pos: "PF", dex: 66, cn: "腕力", type: "Fighting" },
  { pos: "C", dex: 74, cn: "小拳石", type: "Rock" },
];
const rarityTag = (dex, size = 10) => {
  const r = rarityOf(dex);
  return `<i data-rar="${r}" style="font-style:normal;font-weight:700;font-size:${size}px;color:${RARITY_COLOR[r]}">${r}</i>`;
};

function showStarter(save) {
  app.replaceChildren();
  let selected = 0;
  const sc = el(`
    <div class="screen-starter">
      <div class="starter-bg"><canvas></canvas></div>
      <div class="starter-dim"></div>
      <div class="starter-head">
        <span class="starter-kicker">第一步 · 选择位置</span>
        <h2>选择位置与初始伙伴</h2>
        <p>每个位置一名伙伴 · 位置可在队伍页调整</p>
      </div>
      <div class="starter-cards">
        ${STARTERS.map(
          (s, i) => `
        <button class="starter-card pk-panel" data-i="${i}" style="--tc:${TYPE_COLORS[s.type] || "#7ac74c"}">
          <span class="starter-check">✓</span>
          <span class="starter-ovr no-zh">OVR ${calcOVR(s.pos, getPokemon(s.dex).r)} · ${rarityTag(s.dex)}</span>
          <img src="./sprites/${s.dex}.png" alt="${s.cn}" />
          <span class="name">${s.cn}</span>
          <span class="tag no-zh">${s.pos}</span>
        </button>`
        ).join("")}
      </div>
      <div class="starter-actions">
        <button class="pk-btn-gold no-zh" disabled>确 定</button>
        <p class="starter-note">开局赠送 300 篮球币 · 选择后可在队伍页调整位置与首发</p>
      </div>
    </div>`);
  app.append(sc);

  // 背景：真实球场 attract（与开始界面同源）
  const canvas = sc.querySelector(".starter-bg canvas");
  (async () => {
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    sc.__stopBg = attractLoopFor(canvas, demo, renderer);
  })();

  const cards = [...sc.querySelectorAll(".starter-card")];
  const btn = sc.querySelector(".pk-btn-gold");
  cards.forEach((c) =>
    c.addEventListener("click", () => {
      selected = Number(c.dataset.i);
      cards.forEach((x) => x.classList.toggle("sel", x === c));
      btn.disabled = false;
      btn.textContent = `确定 · ${STARTERS[selected].pos} ${STARTERS[selected].cn}`;
    })
  );
  btn.addEventListener("click", () => {
    const r = startJourney(save, STARTERS[selected].dex, "小智", STARTERS[selected].pos);
    if (!r.ok) return;
    sc.__stopBg?.();
    save.coins = 300; // 开局启动资金（S13 待最终数值，先给可玩额度）
    writeSave(save);
    showHome(save, true);
  });
}

/* ================= 场景三：主界面（参考图二布局：球场背景+资源条+展示卡+菜单） ================= */
function showHome(save, justStarted = false) {
  gameAudio.setTrack("menu");
  // 商店/孵蛋等子页会自己读档并写盘——返回主页时必须取最新存档，否则旧对象会覆盖刚发生的购买/孵化
  save = loadSave() || save;
  app.replaceChildren();
  // 展示精灵：优先「更换」选择的精灵，否则队伍首位
  const starterId = save.journey.showcaseId && save.mons[save.journey.showcaseId] ? save.journey.showcaseId : save.team[0];
  const mon = save.mons[starterId];
  const base = getPokemon(mon.dex);
  const season = ensureSeason(save);
  const badge = season.badges.filter((b) => b !== "champion").length;
  ACHV.refresh(save);
  const achvDone = ACHV.list().filter((x) => x.unlocked).length;

  // —— 赛季进度（开始比赛入口副标题）——
  const stageLabel = currentMatchInfo(save)?.label || "赛季结束";
  // —— 每日挑战（入口副标题：今日规则 + 最高分）——
  const daily = dailyPreview(save);

  const sc = el(`
    <div class="screen-menu">
      <div class="menu">
        <div class="attract"><canvas class="attract-canvas"></canvas><div class="attract-dim"></div></div>
      <div class="top-row">
        <button class="coin-chip coin-btn" id="earn-add" title="获取金币" aria-label="获取金币">${COIN_SVG}<b>${save.coins}</b><span class="coin-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></button>
        <button class="badge-chip" id="home-badges" type="button" title="道馆徽章">${BADGE_SVG} <b>${badge}</b>/8</button>
        <button class="guide-chip" id="home-guide" type="button" title="新手指引">导引</button>
        <div class="spacer"></div>
        <div class="coin-chip plain">${save.coach.name}</div>
      </div>
      <div class="menu-in">
        <header class="title">
          <h1 class="logo"><span class="logo-poke">口袋</span><span class="logo-jam">灌篮</span></h1>
          <p class="tag">与宝可梦伙伴一起，征服街头篮球场</p>
        </header>
        <div class="team-card showcase">
          <button type="button" class="team-preset" id="mon-swap">
            <span class="tc-swap">更换</span>
            <img class="tc-sprite" src="./sprites/${mon.dex}.png" alt="" draggable="false">
            <span class="tc-meta"><i class="tc-type" style="--tc:${TYPE_COLORS[base.types[0]] || "#7ac74c"}">${TYPE_ZH[base.types[0]] || base.types[0]}</i><b class="tc-name">Lv.${mon.level} ${base.name} · ${rarityTag(mon.dex, 9)}</b></span>
          </button>
        </div>
        <div class="menu-panel home-menu">
          <button class="hm-hero" data-go="match">
            <span class="hm-ico">${LINE_ICON.ball}</span>
            <span class="hm-txt"><b>开始比赛</b><small>${stageLabel}</small></span>
          </button>
          <button class="hm-sub" data-go="daily">
            <span class="hm-ico">${LINE_ICON.daily}</span>
            <span class="hm-txt"><b>每日挑战</b><small>今日 ${daily.mod.name} · 最高分 ${daily.best || "未挑战"}</small></span>
          </button>

          <div class="hm-grid">
            <button class="hm-item" data-go="achv">
              <span class="hm-ico">${LINE_ICON.trophy}</span>
              <span class="hm-txt"><b>成就</b></span>
            </button>
            <button class="hm-item" data-go="tutorial">
              <span class="hm-ico">${LINE_ICON.tutorial}</span>
              <span class="hm-txt"><b>新手教程</b></span>
            </button>
            <button class="hm-item" data-go="dex">
              <span class="hm-ico">${LINE_ICON.book}</span>
              <span class="hm-txt"><b>图鉴</b></span>
            </button>
            <button class="hm-item" data-go="team">
              <span class="hm-ico">${LINE_ICON.team}</span>
              <span class="hm-txt"><b>队伍</b></span>
            </button>
            <button class="hm-item" data-go="shop">
              <span class="hm-ico">${LINE_ICON.shop}</span>
              <span class="hm-txt"><b>每日商店</b></span>
            </button>
            <button class="hm-item" data-go="egg">
              <span class="hm-ico">${LINE_ICON.egg}</span>
              <span class="hm-txt"><b>孵蛋</b></span>
            </button>
            <button class="hm-item" data-go="bag">
              <span class="hm-ico">${LINE_ICON.bag}</span>
              <span class="hm-txt"><b>背包</b></span>
            </button>
            <button class="hm-item" data-go="settings">
              <span class="hm-ico">${LINE_ICON.settings}</span>
              <span class="hm-txt"><b>设置</b></span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>`);
  app.append(sc);

  // 球场实时背景（fixed 铺满视口，内容滚动于其上——参考图二）
  const canvas = sc.querySelector(".attract-canvas");
  (async () => {
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    const stopBg = attractLoopFor(canvas, demo, renderer);
    sc.__stopBg = stopBg;
  })();

  // 「更换」= 弹已结缘精灵选择器（队伍+仓库全部，点选切换展示）
  sc.querySelector("#mon-swap").addEventListener("click", () => {
    const all = [...save.team, ...save.box].filter((id) => save.mons[id]);
    if (!all.length) return;
    const wrap = document.createElement("div");
    wrap.className = "pj-scrim page-modal";
    wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
    wrap.innerHTML = `
      <div class="pj-page-card"><div class="sub-page pj-page-body">
        <div class="page-head"><button class="back" data-back>‹</button><h2>选择展示精灵</h2><span class="count">${all.length} 只</span></div>
        <div class="sw-grid">
          ${all.map((id) => {
            const m = save.mons[id];
            const b = getPokemon(m.dex);
            return `<button class="sw-pick${id === starterId ? " on" : ""}" data-pick="${id}">
              <img src="./sprites/${m.dex}.png" alt="" loading="lazy" decoding="async">
              <b>${b.name}</b>
              <small>Lv.${m.level}${save.team.includes(id) ? "" : " · 仓库"}</small>
              ${id === starterId ? '<span class="sw-cur">当前</span>' : ""}
            </button>`;
          }).join("")}
        </div>
      </div></div>`;
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); return; }
      const pick = e.target.closest("[data-pick]");
      if (!pick) return;
      const id = Number(pick.dataset.pick);
      // 落存档：记录展示精灵（不改变首发/队伍顺序），跨页面保持
      save.journey.showcaseId = id;
      writeSave(save);
      wrap.remove();
      showHome(loadSave() || save);
    });
    document.body.appendChild(wrap);
  });

  sc.querySelector("#home-badges")?.addEventListener("click", () => {
    openBadgeDetail(loadSave() || save);
  });
  // 随时重看新手指引
  sc.querySelector("#home-guide")?.addEventListener("click", () => {
    const s = loadSave() || save;
    s.guide = { v: 1, step: 0, done: false };
    writeSave(s);
    showHome(s);
  });
  // 金币"+"获取面板 / 成就面板
  sc.querySelector("#earn-add").addEventListener("click", () => {
    const refreshRoster = () => {
      const team = sc.querySelector('[data-go="team"] .hm-txt small');
      if (team) team.textContent = `${save.team.length}/10 · 仓库 ${save.box.length}`;
      const dex = sc.querySelector('[data-go="dex"] .hm-txt small');
      if (dex) dex.textContent = `${Object.keys(save.dex).length} / 291 已结缘`;
    };
    openEarn(save, () => {
      const coinB = sc.querySelector(".coin-chip b");
      if (coinB) coinB.textContent = save.coins;
    }, refreshRoster);
  });
  sc.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "match") { sc.__stopBg?.(); openSeasonBoard(save); }
      else if (go === "daily") { sc.__stopBg?.(); openDaily(save, { onStart: () => startDaily(loadSave() || save) }); }
      else if (go === "achv") { openAchievements(); }
      else if (go === "tutorial") { sc.__stopBg?.(); startTutorial(app, loadSave() || save, { onExit: () => showHome(loadSave() || save) }); }
      else if (go === "dex") { sc.__stopBg?.(); showDex(save); }
      else if (go === "shop") { sc.__stopBg?.(); bumpDaily("visit"); showSub(renderShop, save); }
      else if (go === "egg") { sc.__stopBg?.(); bumpDaily("visit"); showSub(renderEgg, save); }
      else if (go === "team") { sc.__stopBg?.(); showTeam(save); }
      else if (go === "bag") { sc.__stopBg?.(); showBag(save); }
      else if (go === "settings") { sc.__stopBg?.(); openSettings(); }
    })
  );

  // 新玩家局外指引（主页 → 赛季 → 赛前 → 结算；比赛内沿用原 rookie-guide）
  setTimeout(() => startOnboarding(sc, loadSave() || save), 420);
}

/* ================= 赛季赛程弹窗（9 队单循环 + 季后赛 + 四天王） ================= */
function openSeasonBoard(save) {
  const s = ensureSeason(save);
  const fresh0 = loadSave() || save;
  const legendPending = pendingLegend(fresh0);
  const ranked = rankTable(s);
  const teamMap = new Map(s.table.map((r) => [r.id, r]));
  const tname = (id) => teamMap.get(id)?.name || (id === "me" ? "我队" : id);
  const me = teamMap.get("me") || { w: 0, l: 0, pf: 0, pa: 0 };
  const badgeCount = s.badges.filter((b) => b !== "champion").length;
  const diff = (r) => r.pf - r.pa;
  const phaseText = s.phase === "regular"
    ? `常规赛 第 ${Math.min(s.round + 1, 9)}/9 轮 · ${me.w} 胜 ${me.l} 负`
    : s.phase === "playoffs"
      ? `季后赛 · ${me.w} 胜 ${me.l} 负`
      : `赛季结束 · ${me.w} 胜 ${me.l} 负`;

  const tableRows = ranked.map((r, i) => `<div class="lg-row ${r.isMe ? "me" : ""} ${i < 4 ? "po" : ""}">
    <span class="lg-rank">${i + 1}</span>
    <span class="lg-team"><i style="background:${r.color}"></i>${r.name}</span>
    <span class="lg-rec">${r.w}-${r.l}</span>
    <span class="lg-diff">${diff(r) >= 0 ? "+" : ""}${diff(r)}</span>
  </div>`).join("");

  const gameHtml = (g) => `<div class="lg-game ${g.a === "me" || g.b === "me" ? "me" : ""}">
    <span class="lg-side">${tname(g.a)}</span>
    <b>${g.sa ?? "-"}</b><i>:</i><b>${g.sb ?? "-"}</b>
    <span class="lg-side right">${tname(g.b)}</span>
  </div>`;

  const latest = s.rounds[s.rounds.length - 1];
  const view = latest || s.schedule[Math.min(s.round, 8)];
  const viewNo = view ? view.round + 1 : 1;
  const viewGames = (view?.games || []).map(gameHtml).join("");
  const byeText = view?.bye ? `<div class="lg-bye">本轮轮空：${tname(view.bye)}</div>` : "";

  const fixtures = s.schedule.map((rd, i) => {
    const g = rd.games.find((x) => x.a === "me" || x.b === "me");
    const res = s.results.find((r) => r.round === i);
    const cur = s.phase === "regular" && i === s.round;
    if (!g) return `<div class="lg-fixture ${cur ? "cur" : ""}"><span>R${i + 1}</span><b>轮空</b><small>${cur ? "本轮" : "—"}</small></div>`;
    const opp = g.a === "me" ? g.b : g.a;
    return `<div class="lg-fixture ${res ? (res.win ? "win" : "lose") : ""} ${cur ? "cur" : ""}">
      <span>R${i + 1}</span><b>${tname(opp)}</b>
      <small>${res ? `${res.win ? "胜" : "负"} ${res.myScore}:${res.oppScore}` : "未赛"}</small>
    </div>`;
  }).join("");

  const po = s.playoffs;
  let poHtml = "";
  if (po && !po.missed) {
    const semi = (g, i) => `<div class="lg-po-row ${g?.winner === "me" ? "me" : ""}">
      <span>半决赛 ${i + 1}</span>
      <b>${tname(g.a)}</b><em>${g.sa ?? "-"} : ${g.sb ?? "-"}</em><b>${tname(g.b)}</b>
      <small>${g.winner ? `${tname(g.winner)} 胜` : "待打"}</small>
    </div>`;
    const fin = po.final;
    poHtml = `<div class="lg-sec"><b>季后赛</b><small>前 4 进季后赛</small></div>
      <div class="lg-bracket">
        ${po.semis.map(semi).join("")}
        <div class="lg-po-row final ${fin?.winner === "me" ? "me" : ""}">
          <span>总决赛</span>
          <b>${fin ? tname(fin.a) : "待定"}</b><em>${fin ? `${fin.sa ?? "-"} : ${fin.sb ?? "-"}` : "-"}</em><b>${fin ? tname(fin.b) : "待定"}</b>
          <small>${fin?.winner ? `${tname(fin.winner)} 夺冠` : "待打"}</small>
        </div>
        ${po.champion ? `<div class="lg-champ">总冠军：${tname(po.champion)}</div>` : ""}
      </div>`;
  } else if (po?.missed) {
    poHtml = `<div class="lg-sec"><b>季后赛</b><small>前 4 进季后赛</small></div><div class="lg-miss">常规赛未进前 4，本赛季结束。</div>`;
  }

  const fk = s.fourKings;
  const fkClosed = s.phase === "done";
  const fkCan = !fkClosed && fk.unlocked && !fk.cleared;
  const fkText = fkClosed
    ? "本赛季四天王入口已关闭"
    : !fk.unlocked
      ? `集齐 8 枚徽章解锁（${badgeCount}/8）`
      : fk.cleared
        ? "已通关 · 本赛季奖励已领取"
        : `可挑战 · 已尝试 ${fk.attempts} 次`;
  const fkHtml = `<div class="lg-fk ${fkCan ? "on" : ""}">
    <div><b>四天王挑战</b><small>${fkText}</small></div>
    <div class="lg-fk-acts">
      ${fkCan ? '<button class="pk-btn-gold" id="season-fk">挑 战</button>' : ""}
    </div>
  </div>`;

  let actions = "";
  if (s.phase === "regular") {
    if (s.schedule[s.round]?.bye === "me") {
      actions = `<button class="pk-btn-gold" id="season-bye">进入下一轮</button>`;
    } else {
      actions = `<button class="pk-btn-gold" id="season-go">进入比赛</button>
        <button class="pk-btn-gold season-watch" id="season-watch">${EYE_SVG} 观战</button>`;
    }
  } else if (s.phase === "playoffs") {
    const info = leagueInfo(save);
    actions = `<button class="pk-btn-gold" id="season-go">${info?.playoffRound === "final" ? "总决赛" : "半决赛"}</button>
      <button class="pk-btn-gold season-watch" id="season-watch">${EYE_SVG} 观战</button>`;
  } else {
    actions = `<button class="pk-btn-gold" id="season-next">进入下一赛季</button>`;
  }

  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body">
    <div class="page-head"><button class="back" data-back>‹</button><h2>赛季赛程</h2>
      <button class="count badge-count" type="button" id="season-badges">第 ${s.no} 赛季 · ${badgeCount}/8 徽章 ›</button>
    </div>
    <p class="page-sub">${phaseText} · 净胜 ${diff(me) >= 0 ? "+" : ""}${diff(me)}</p>
    ${legendPending ? `<button class="legend-pending" id="season-legend"><b>✦ 赛季传说待领取</b><small>S${legendPending.season} · ${legendPending.choices.length} 选 1 · 可领 ${legendPending.claims || 1} 只</small></button>` : ""}
    <div class="lg-sec"><b>积分榜</b><small>前 4 进季后赛</small></div>
    <div class="lg-table"><div class="lg-row lg-head"><span>#</span><span>球队</span><span>胜-负</span><span>净胜</span></div>${tableRows}</div>
    <div class="lg-sec"><b>${latest ? "本轮战况" : "下一轮"}</b><small>第 ${viewNo}/9 轮</small></div>
    <div class="lg-rounds">${viewGames}${byeText}</div>
    <div class="lg-sec"><b>我的赛程</b><small>9 轮 · 1 轮轮空</small></div>
    <div class="lg-fixtures">${fixtures}</div>
    ${poHtml}
    ${fkHtml}
    <div class="season-actions">${actions}</div>
  </div></div>`;

  const close = () => { wrap.remove(); showHome(loadSave() || save); };
  const reopen = () => { const f = loadSave() || save; wrap.remove(); openSeasonBoard(f); };
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { close(); return; }
  });
  wrap.querySelector("#season-badges")?.addEventListener("click", () => {
    openBadgeDetail(loadSave() || save);
  });
  wrap.querySelector("#season-legend")?.addEventListener("click", () => {
    const f = loadSave() || save;
    openLegendPicker(f, pendingLegend(f), {
      onClose: () => { wrap.remove(); openSeasonBoard(loadSave() || f); },
    });
  });
  wrap.querySelector("#season-bye")?.addEventListener("click", () => {
    const f = loadSave() || save;
    advanceBye(f);
    writeSave(f);
    reopen();
  });
  wrap.querySelector("#season-go")?.addEventListener("click", () => {
    const f = loadSave() || save;
    const info = leagueInfo(f);
    if (info?.kind === "bye") { advanceBye(f); writeSave(f); reopen(); return; }
    if (!info || info.kind === "done") return;
    wrap.remove();
    showMatch(f, "league");
  });
  wrap.querySelector("#season-watch")?.addEventListener("click", () => {
    const f = loadSave() || save;
    const info = leagueInfo(f);
    if (info?.kind === "bye") { advanceBye(f); writeSave(f); reopen(); return; }
    if (!info || info.kind === "done") return;
    wrap.remove();
    startAutoMatch(f, null, "league");
  });
  wrap.querySelector("#season-fk")?.addEventListener("click", () => {
    const f = loadSave() || save;
    wrap.remove();
    showMatch(f, "elite");
  });
  wrap.querySelector("#season-next")?.addEventListener("click", () => {
    const f = loadSave() || save;
    startNextSeason(f);
    writeSave(f);
    wrap.remove();
    openSeasonBoard(loadSave() || f);
  });
  document.body.appendChild(wrap);
  const guideBye = s.phase === "regular" && s.schedule[s.round]?.bye === "me";
  mountGuide("season", loadSave() || save, {
    root: wrap,
    target: guideBye ? "#season-bye" : s.phase === "done" ? "#season-next" : "#season-go",
    text: guideBye
      ? "本轮你轮空，点「进入下一轮」查看其他球队战况。9 支球队单循环，每队打 8 场、轮空 1 轮；前 4 进季后赛，再打总决赛。赢馆主得徽章，8 枚解锁四天王。"
      : s.phase === "done"
        ? "本赛季已经结束，点「进入下一赛季」开启新赛季。新赛季会重置排名和徽章，队伍、等级和金币都会保留。"
        : undefined,
  });
}

/* ================= 场景四：比赛 + 结果面板 ================= */
function showMatch(save, mode = "league") {
  showPreMatch(save, mode);
}

/** 赛前对阵页：双方战力 / 首发 / 胜率（仅展示，不可调整阵容） */
function showPreMatch(save, mode = "league") {
  save = loadSave() || save;
  ensureLineupSlots(save);
  const cfg = buildGymMatch(save, mode);
  if (!cfg) return showHome(loadSave() || save);
  const info = cfg.info || currentMatchInfo(save, mode);
  const teamPower = myTeamPower(save);
  const winP = Math.round(Math.max(0.05, Math.min(0.95, 0.5 + (teamPower - info.targetPower) * 0.03)) * 100);
  const gym = cfg.gym;
  const coach = save.coach?.name || "ME";
  const starters = save.team.slice(0, 5).filter((id) => save.mons[id]);
  const bench = save.team.slice(5).filter((id) => save.mons[id]);
  const per = bondMultipliers(save);
  const typeHints = (() => {
    const mine = [], theirs = [];
    const homeByPos = new Map(cfg.home.roster.map((p) => [p.pos, p]));
    const awayByPos = new Map(cfg.away.roster.map((p) => [p.pos, p]));
    for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
      const h = homeByPos.get(pos), a = awayByPos.get(pos);
      if (!h || !a) continue;
      const hm = bestTypeMult(h.types, a.types);
      const am = bestTypeMult(a.types, h.types);
      if (hm.mult > 1) mine.push({ pos, ...hm });
      if (am.mult > 1) theirs.push({ pos, ...am });
    }
    return { mine, theirs };
  })();
  const typeHintLine = (rows, cls, label) => rows.length
    ? `<p class="pth ${cls}"><span>${label}</span>${rows.map((x) => `<b>${TYPE_ZH[x.atkType] || x.atkType}</b><i>→</i>${TYPE_ZH[x.defType] || x.defType}<em>×${x.mult}</em>`).join(" · ")}</p>`
    : "";
  const mini = (id, from) => {
    const m = save.mons[id];
    const b = getPokemon(m.dex);
    const color = TYPE_COLORS[b.types?.[0]] || "#5a6a92";
    const label = from === "start" ? save.assign[id] || m.pos : "替补";
    const ovr = from === "start"
      ? Math.round(monPower(m, label, per.get(m)))
      : Math.round(mainOVR(m));
    return `<div class="pms-mon" style="--tc:${color}">
      <span class="pms-ovr">${ovr}</span>
      <img src="./sprites/${m.dex}.png" alt=""><b>${b.name}</b><small>${label}</small>
    </div>`;
  };
  const miniPlayer = (p) => `<div class="pms-mon" style="--tc:${TYPE_COLORS[p.types?.[0]] || "#5a6a92"}">
    <span class="pms-ovr">${p.ovr}</span>
    <img src="./sprites/${p.dex}.png" alt=""><b>${getPokemon(p.dex).name}</b><small>${p.pos}</small>
  </div>`;

  const page = el(`<div class="sub-page screen-match prematch-screen"></div>`);
  app.replaceChildren(page);
  page.innerHTML = `
    <div class="pm-bg"><canvas></canvas></div>
    <div class="pm-dim"></div>
    <div class="pm-top">
      <button class="pm-back" data-pms-back>‹</button>
      <span class="pm-label">${info.label}</span>
      <span class="pm-season">S${info.season}</span>
    </div>
    <div class="brief-card pms-card">
      <span class="brief-stage">${info.smallName}</span>
      <h2>${info.kind === "elite" ? "四天王挑战" : info.kind === "playoff" ? info.smallName : `第 ${info.round + 1} 轮 · ${gym.name}`}</h2>
      <div class="brief-vs">
        <div class="brief-side"><span class="brief-emblem home">${coach.slice(0, 2)}</span><b>${coach}队</b><small>战力 ${teamPower}</small></div>
        <span class="brief-vs-txt">对阵</span>
        <div class="brief-side away" style="--tc:${gym.color}"><span class="brief-emblem">${gym.abbr}</span><b>${gym.name}</b><small>战力 ${info.targetPower}</small></div>
      </div>
      <div class="brief-winrow"><span>预计胜率</span><div class="brief-winbar"><i style="width:${winP}%"></i></div><b style="color:${winP >= 50 ? "var(--good)" : "var(--red)"}">${winP}%</b></div>
      <div class="pms-sec"><b>对手首发</b><div class="pms-opp">${cfg.away.roster.slice(0, 5).map((p) => `<span class="brief-mon" style="--tc:${TYPE_COLORS[p.types?.[0]] || "#5a6a92"}"><span class="bo">${p.ovr}</span><img src="./sprites/${p.dex}.png" alt=""><i>${p.pos}</i></span>`).join("")}</div></div>
      <div class="pms-type-hint">
        <div class="pth-head"><b>系别克制</b><small>仅列出发动 ×2 的属性优势</small></div>
        ${typeHintLine(typeHints.mine, "good", "我方")}
        ${typeHintLine(typeHints.theirs, "bad", "敌方")}
        ${!typeHints.mine.length && !typeHints.theirs.length ? '<p class="pth neutral">双方首发暂无 ×2 属性优势</p>' : ""}
        <p class="pth-note">克制影响抢位推撞成功率，以及地震/冰冻类必杀的击退与减速；不影响投篮基础命中。</p>
      </div>
      <div class="pms-head"><b>我方阵容</b></div>
      <div class="pms-start">${cfg.home.roster.slice(0, 5).map(miniPlayer).join("")}</div>
      ${bench.length ? `<div class="pms-benchrow"><span>替补</span><div class="pms-bench">${bench.map((id) => mini(id, "bench")).join("")}</div></div>` : ""}
      <div class="pms-actions"><button class="pk-btn-gold" id="pms-go">继 续</button><button class="pk-btn-gold pm-ghost" data-pms-back>返 回</button></div>
    </div>`;

  const canvas = page.querySelector(".pm-bg canvas");
  (async () => {
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    page.__stopBg = attractLoopFor(canvas, demo, renderer);
  })();
  const stopBg = () => { page.__stopBg?.(); page.__stopBg = null; };
  page.querySelectorAll("[data-pms-back]").forEach((b) => b.addEventListener("click", () => { stopBg(); showHome(loadSave() || save); }));

  page.querySelector("#pms-go").addEventListener("click", () => {
    stopBg();
    startMatchNow(loadSave() || save, mode);
  });
  mountGuide("prematch", loadSave() || save, { root: page });
}

/** 新手判定：没有任何比赛记录且未看过引导 */
function isRookie(save) {
  if (!save?.journey || save.journey.guideDone) return false;
  const games = (save.stats?.w || 0) + (save.stats?.l || 0);
  const results = save.journey.season?.results?.length || 0;
  return games === 0 && results === 0;
}

/** 首场 30 秒非阻塞操作引导：移动 → 投篮 → 传球/必杀 */
function showRookieGuide(page, save) {
  save.journey.guideDone = true;
  writeSave(save);
  const steps = [
    { t: "移动", d: "按住左下摇杆拖动。进攻时跑位，防守时跟住对位球员。" },
    { t: "投篮", d: "按住 X 蓄力，力度条进入绿区时松开。空位出手更稳。" },
    { t: "传球 / 必杀", d: "A 传球给队友；Y 在必杀槽满后释放必杀。B 抢断，RB 加速。" },
  ];
  const box = document.createElement("div");
  box.className = "rookie-guide";
  box.innerHTML = `<div class="rg-card">
    <button class="rg-skip" type="button">跳过</button>
    <div class="rg-step"></div>
    <b class="rg-title"></b>
    <p class="rg-desc"></p>
    <div class="rg-dots"></div>
  </div>`;
  page.appendChild(box);
  let i = 0;
  const render = () => {
    const s = steps[i];
    box.querySelector(".rg-step").textContent = `新手引导 ${i + 1}/${steps.length}`;
    box.querySelector(".rg-title").textContent = s.t;
    box.querySelector(".rg-desc").textContent = s.d;
    box.querySelector(".rg-dots").innerHTML = steps.map((_, n) => `<i class="${n <= i ? "on" : ""}"></i>`).join("");
  };
  render();
  const timer = setInterval(() => {
    i += 1;
    if (i >= steps.length) { finish(); return; }
    render();
  }, 10000);
  const guard = setInterval(() => {
    if (!page.isConnected) {
      clearInterval(timer); clearInterval(guard);
      box.remove();
    }
  }, 1000);
  const finish = () => {
    clearInterval(timer); clearInterval(guard);
    box.classList.add("out");
    setTimeout(() => box.remove(), 320);
  };
  box.querySelector(".rg-skip").addEventListener("click", finish);
}

/** 真正进入比赛（赛前页点继续后调用） */
function startMatchNow(save, mode = "league") {
  save = loadSave() || save;
  const cfg = buildGymMatch(save, mode);
  if (!cfg) return showHome(loadSave() || save);
  const gym = cfg.gym;
  const rookie = isRookie(save);
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  // 默认按设置里的「赛前演出」播放入场 + 首发阵容动画
  mountMatch(page, cfg, gameAudio, (engine, c, quit, simulated) => showResult(save, engine, quit, gym, simulated, mode));
  if (rookie) showRookieGuide(page, save);
}

/** 观战：双方 AI 自动比赛（奖励按模拟口径结算） */
function startAutoMatch(save, cfg, mode = "league") {
  save = loadSave() || save;
  cfg ||= buildGymMatch(save, mode);
  if (!cfg) return showHome(loadSave() || save);
  const autoCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
  gameAudio.unlock();
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, autoCfg, gameAudio, (engine, c, quit) => showResult(save, engine, quit, cfg.gym, true, mode, true), { spectator: true, startingFive: false });
}

/** 赛后升级/进化中心弹窗队列：逐个播放 anims 事件 */
function playResultAnims(r) {
  const anims = (r.anims || []).slice();
  const next = () => {
    const a = anims.shift();
    if (!a) return;
    if (a.type === "evolve") {
      playEvolve({
        oldDex: a.oldDex,
        newDex: a.newDex,
        title: `进化！${a.oldName} → ${a.newName}`,
        sub: `Lv.${a.level ?? ""} · 位置已随形态更新`,
        changes: a.growth.map((g) => ({ k: "随机成长", v: g })),
      }, next);
    } else {
      playEvolve({
        oldDex: a.dex,
        title: `升级！Lv.${a.level}`,
        sub: (a.growth.join("、") || "无随机加点") + " —— 继续保持训练！",
        changes: a.growth.map((g) => ({ k: "随机成长", v: g })),
      }, next);
    }
  };
  next();
}

const AD_DOUBLE_KEY = "pokedunk.addouble.v1";
function adDoubleDay() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function adDoubleLeft() {
  try {
    const d = JSON.parse(localStorage.getItem(AD_DOUBLE_KEY) || "{}");
    return d.date === adDoubleDay() ? Math.max(0, 2 - (d.count || 0)) : 2;
  } catch { return 2; }
}
function markAdDouble() {
  const day = adDoubleDay();
  let d = {};
  try { d = JSON.parse(localStorage.getItem(AD_DOUBLE_KEY) || "{}"); } catch {}
  const count = d.date === day ? (d.count || 0) : 0;
  try { localStorage.setItem(AD_DOUBLE_KEY, JSON.stringify({ date: day, count: count + 1 })); } catch {}
}

function showResult(save, engine, quit, gym, simulated = false, mode = "league", spectate = false) {
  gameAudio.setTrack("menu");
  const page = app.firstElementChild;
  const r = settleMatchResult(save, engine, quit ? null : (engine?.cfg?.gym ?? gym), quit, simulated, mode);
  const adDouble = !simulated && !spectate && !quit && r.coinsGained > 0 && adDoubleLeft() > 0;

  // 升级/进化中心弹窗队列（赛后自动逐个播放）
  playResultAnims(r);

  page.classList.add("result-screen");
  page.innerHTML = `
    <div class="rs-card ${r.won ? "win" : "lose"}">
      <span class="rs-kicker">${r.smallName}${r.simulated ? (spectate ? " · 观战" : " · 模拟") : ""}</span>
      <h2 class="rs-title">${quit ? "中途离场" : r.champion ? "总 冠 军" : r.won ? "胜 利" : "惜 败"}</h2>
      <p class="rs-score">${engine ? `${engine.teams[0].abbr} <b>${r.myScore}</b> : <b>${r.oppScore}</b> ${engine.teams[1].abbr}` : quit ? "未打完，按判负记入战绩" : ""}</p>
      <div class="res-lines rs-lines">
        <p class="res-line"><span class="coin-ico">${COIN_SVG}</span><span>篮球币 +${r.coinsGained}（${r.won ? "胜利奖励" : "安慰奖"}）</span></p>
        <p class="res-line"><span class="res-dot"></span><span>${r.seasonEnded ? "本赛季结束 · 进入下一赛季" : mode === "elite" ? "四天王挑战结束 · 可回赛季继续" : `下一场：${r.nextLabel}`}</span></p>
        <p class="res-line">${ICON.trophy}<span>战绩 ${save.stats.w} 胜 ${save.stats.l} 负</span></p>
        ${r.badgeGained ? `<p class="res-line res-gold">${BADGE_SVG}<span>获得「${r.badgeName || "道馆"}」徽章！</span></p>` : ""}
        ${r.fourKings && r.won ? `<p class="res-line res-gold">${ICON.trophy}<span>四天王挑战完成！</span></p>` : ""}
        ${r.champion ? `<p class="res-line res-gold">${ICON.trophy}<span>联赛总冠军！奖杯、400 币与赛季 MVP 已入库</span></p>` : ""}
        ${r.legendReward ? `<p class="res-line res-gold"><span>✦</span><span>赛季传说已解锁：${r.legendReward.choices.length} 选 1，本赛季还可领 ${r.legendReward.claims || 1} 只</span></p>` : ""}
        ${r.itemGained ? `<p class="res-line res-gold">${GIFT_SVG}<span>获得道具：${r.itemName}</span></p>` : ""}
        ${r.sign ? (r.sign.dup
          ? `<p class="res-line">${SIGN_SVG}<span>对手 ${r.sign.name} 想加入，但已结缘 → 折算 +${r.sign.coin} 币</span></p>`
          : `<p class="res-line res-good">${SIGN_SVG}<span>战胜签约！${r.sign.name} 加入了你的${r.sign.movedTo === "team" ? "队伍" : "仓库"}！</span></p>`) : ""}
        ${r.xpEvents.length ? `<div class="res-xp">${r.xpEvents.map((e) => `<p class="res-line">${UP_SVG}<span>${e}</span></p>`).join("")}</div>` : ""}
      </div>
      <div class="rs-actions">
        ${adDouble ? `<button class="pk-btn-gold rs-ad" id="res-ad">看广告 · 金币 ×2（今日 ${adDoubleLeft()} 次）</button>` : ""}
        ${r.legendReward ? `<button class="pk-btn-gold rs-legend" id="res-legend">✦ 选择赛季传说 · ${r.legendReward.choices.length} 选 1</button>` : ""}
        ${mode === "elite" && !r.seasonEnded ? `<button class="pk-btn-gold" id="res-fk">再次挑战四天王</button>` : ""}
        <button class="pk-btn-gold" id="res-next">${r.seasonEnded ? "进入下一赛季" : mode === "elite" ? "回 到 赛 季" : "下 一 场"}</button>
        <button class="pk-btn-gold pm-ghost" id="res-home">回 主 界 面</button>
      </div>
    </div>`;
  if (r.badgeGained) {
    playBadgeGrant(r.badgeGained, {
      delay: 520,
      onShow: () => gameAudio.play("special"),
    });
  }
  page.querySelector("#res-ad")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "播放中…";
    const ad = await watchRewardedAd("match_double");
    if (!ad.ok) {
      btn.disabled = false;
      btn.textContent = "广告暂不可用";
      return;
    }
    save.coins += r.coinsGained;
    writeSave(save);
    markAdDouble();
    btn.textContent = `已领取 +${r.coinsGained} 币`;
  });
  page.querySelector("#res-legend")?.addEventListener("click", (e) => {
    const btn = e.currentTarget;
    let claimed = false;
    openLegendPicker(loadSave() || save, r.legendReward, {
      onClaim: () => { claimed = true; },
      onClose: () => {
        if (!claimed) return;
        btn.disabled = true;
        btn.textContent = "✦ 赛季传说已领取";
      },
    });
  });
  page.querySelector("#res-fk")?.addEventListener("click", () => showMatch(loadSave() || save, "elite"));
  page.querySelector("#res-home").addEventListener("click", () => showHome(loadSave() || save));
  page.querySelector("#res-next").addEventListener("click", () => {
    const f = loadSave() || save;
    if (r.seasonEnded) {
      startNextSeason(f);
      writeSave(f);
      showHome(f);
      return;
    }
    if (mode === "elite") { openSeasonBoard(f); return; }
    showMatch(f, mode);
  });
  mountGuide("result", save, { root: page });
}

/* ================= 每日挑战：开球 + 结果 ================= */
function startDaily(save) {
  save = loadSave() || save;
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  const cfg = buildDailyMatch(save);
  const rookie = isRookie(save);
  gameAudio.unlock();
  mountMatch(page, cfg, gameAudio, (engine, c, quit) => showDailyResult(save, engine, quit, page));
  if (rookie) showRookieGuide(page, save);
}

function showDailyResult(save, engine, quit, page = app.firstElementChild) {
  gameAudio.setTrack("menu");
  const r = settleDaily(save, engine, quit, false);
  const again = `<button class="pk-btn-gold" id="daily-again">再来一局</button>`;
  const home = `<button class="pk-btn-gold pm-ghost" id="daily-home">回主界面</button>`;
  page.classList.add("result-screen");

  if (r.quit) {
    page.innerHTML = `
      <div class="rs-card lose daily-result">
        <span class="rs-kicker">每日挑战</span>
        <h2 class="rs-title">中途离场</h2>
        <p class="rs-score">本场不计分 · 不发奖励</p>
        <div class="res-lines rs-lines"><p class="res-line"><span class="res-dot"></span><span>今日最佳 ${r.best || "—"} 分 · 已挑战 ${r.plays} 场</span></p></div>
        <div class="rs-actions">${again}${home}</div>
      </div>`;
  } else {
    const d = r.detail;
    page.innerHTML = `
      <div class="rs-card daily-result ${r.won ? "win" : "lose"}">
        <span class="rs-kicker">每日挑战</span>
        <h2 class="rs-title">${r.won ? "挑战胜利" : "挑战惜败"}</h2>
        <p class="rs-score">${engine.teams[0].abbr} <b>${r.myScore}</b> : <b>${r.oppScore}</b> ${engine.teams[1].abbr}</p>
        <div class="dr-score"><b>${r.score}</b><small>挑战分${r.newBest ? " · 新纪录！" : ""}</small></div>
        <p class="dr-break">得分 ${d.pts} + 扣篮 ${d.dnk}×3 + 三分 ${d.tpm}×2 + 抢断 ${d.stl}×2 + 盖帽 ${d.blk}×2 + 胜利 ${d.winBonus}</p>
        <div class="res-lines rs-lines">
          ${r.firstWin ? `<p class="res-line res-gold"><span class="coin-ico">${COIN_SVG}</span><span>今日首胜 +100 篮球币</span></p>` : ""}
          <p class="res-line"><span class="res-dot"></span><span>今日最佳 ${r.best} 分 · 已挑战 ${r.plays} 场（${r.wins} 胜）</span></p>
          <p class="res-line" style="color:var(--text-dim);font-size:11.5px"><span class="res-dot" style="background:var(--text-dim)"></span><span>当日任务可在「每日挑战」面板领取</span></p>
        </div>
        <div class="rs-actions">${again}${home}</div>
      </div>`;
  }
  page.querySelector("#daily-again")?.addEventListener("click", () => startDaily(loadSave() || save));
  page.querySelector("#daily-home")?.addEventListener("click", () => showHome(loadSave() || save));
}

/* ================= 子页面：图鉴 ================= */
/* ================= 子页弹窗壳（图鉴/队伍/商店/孵蛋/背包统一为浮层卡片） ================= */
function openPageModal(renderFn, save) {
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body"></div></div>`;
  const body = wrap.querySelector(".pj-page-body");
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    showHome(loadSave() || save); // 关闭后刷新主页数据（金币/队伍/图鉴计数）
  };
  renderFn(body);
  // 返回键 / 队伍、背包自定义返回事件 / 点击遮罩：统一关闭
  body.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) close(); });
  body.addEventListener("team-back", close);
  body.addEventListener("bag-back", close);
  // 子页内部跳转（如孵蛋空槽 → 商店）：关闭当前卡片后打开目标卡片
  body.addEventListener("page-goto", (e) => {
    if (e.detail !== "shop") return;
    close();
    showSub(renderShop, loadSave() || save);
  });
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
  return close;
}

function showDex(save) {
  openPageModal((page) => renderDex(page), save);
}
function showTeam(save) {
  openPageModal((page) => renderTeam(page, save), save);
}
function showBag(save) {
  openPageModal((page) => renderBag(page, save), save);
}
function showSub(renderFn, save) {
  openPageModal(renderFn, save);
}

/* ================= 启动路由 ================= */
// settle.js 引用 play-core 内部符号（xpToNext/rollGrowth/LEAGUE_GYMS 等已由引擎直连导出）
window.__PC = await import("../engine/readable/play-core.js?v=39");
preloadSprites?.([]); // 触发引擎资源预载（容错）
installAudioUnlock();
const existing = loadSave();
if (existing && existing.journey.stage !== "starter") showHome(existing);
else showStart();



















