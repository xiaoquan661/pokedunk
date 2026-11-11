/**
 * app.js —— 应用入口与路由（pokedunk-v2）
 * 场景流：开始界面 →（点击开始）→ 御三家三选一 → 主界面（图二布局）
 * 存档判定：进入即 loadSave()——有档直接进主界面（单档自动，GDD S8），无档走开局。
 */
import { loadSave, createSave, writeSave, startJourney } from "./storage.js?v=14";
import { renderDex } from "./ui/dex.js?v=19";
import { renderShop, renderEgg } from "./ui/shop-egg.js?v=20";
import { openSettings } from "./ui/settings.js?v=18";
import { renderBag } from "./ui/bag.js?v=16";
import { renderTeam } from "./ui/team.js?v=30";
import { buildGymMatch, mountMatch, simulateCurrentMatch } from "./journey/match-screen.js?v=35";
import { gameAudio, installAudioUnlock } from "./platform/audio.js?v=8";
import { watchRewardedAd } from "./platform/ads.js?v=4";
import { ensureSeason, currentMatchInfo, myTeamPower, SMALL_NAMES } from "./journey/season.js?v=9";
import { settleMatchResult } from "./journey/settle.js?v=22";
import { buildDailyMatch, settleDaily, dailyPreview } from "./journey/daily.js?v=17";
import { openDaily } from "./ui/daily.js?v=19";
import { openAchievements } from "./ui/achv-ui.js?v=13";
import { startTutorial } from "./ui/tutorial.js?v=6";
import { startOnboarding } from "./ui/onboarding.js?v=1";
import { openBadgeDetail, playBadgeGrant } from "./ui/badges.js?v=2";
import { openEarn, bumpDaily } from "./ui/earn.js?v=12";
import { ACHV } from "./systems/achv.js?v=7";
import { ensureLineupSlots, monPower, mainOVR, bondMultipliers } from "./systems/build.js?v=8";
import { playEvolve } from "./ui/anim.js?v=10";
import { ICON } from "./ui/icons.js?v=8";
import { pendingLegend } from "./journey/legend.js?v=2";
import { openLegendPicker } from "./ui/legend.js?v=3";
import {
  getPokemon,
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
} from "../engine/readable/play-core.js?v=15";

const app = document.getElementById("app");
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const TYPE_CN = { Grass: "草", Fire: "火", Water: "水", Electric: "电", Normal: "一般" };
const typeCn = (t) => TYPE_CN[t] ?? t;
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

/** 篮球币图标（金色硬币 + 篮球纹路） */
const COIN_SVG = ICON.coin;
/** 徽章图标（SVG：银灰奖牌） */
const BADGE_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="9" r="6" fill="#c9d3e8" stroke="#5a6a92" stroke-width="1.5"/><text x="12" y="12" text-anchor="middle" font-size="7" font-weight="bold" fill="#5a6a92" font-family="monospace">★</text><path d="M8 14 L6.5 21 L12 17.5 L17.5 21 L16 14" fill="#c9d3e8" stroke="#5a6a92" stroke-width="1.5"/></svg>`;
/** 观战图标（SVG 眼睛） */
const EYE_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;

/** 结果页小图标（SVG，统一 14px 描边风格） */
const LOCK_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="flex-shrink:0"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const GIFT_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><rect x="4" y="10" width="16" height="10" rx="2" fill="#f5c542" stroke="#7a5200" stroke-width="1.5"/><path d="M3 7h18v4H3z" fill="#ffe08a" stroke="#7a5200" stroke-width="1.5"/><path d="M12 7v13M12 7c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3" fill="none" stroke="#7a5200" stroke-width="1.5"/></svg>`;
const SIGN_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><path d="M3 12h4l2-3 3 6 2-3h7" fill="none" stroke="#21d07a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="12" r="1.6" fill="#21d07a"/></svg>`;
const UP_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style="flex-shrink:0"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="#f5c542" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** 每日挑战图标（SVG：日历 + 闪电） */
const DAILY_SVG = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" fill="#f5c542" stroke="#7a5200" stroke-width="1.5"/><path d="M3 9.5h18" stroke="#7a5200" stroke-width="1.5"/><path d="M8 3v4M16 3v4" stroke="#7a5200" stroke-width="1.8" stroke-linecap="round"/><path d="M13.2 11.2l-4.2 5.1h3l-1 4 4.2-5.3h-3z" fill="#7a5200"/></svg>`;
/** 新手教程图标（SVG：学士帽） */
const TUTORIAL_SVG = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M2.8 9.2 12 4.6l9.2 4.6L12 13.8z" fill="#7a5cf0" stroke="#2a1b52" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 11.3v4.2c0 2 2.7 3.4 6 3.4s6-1.4 6-3.4v-4.2" fill="none" stroke="#c9b8ff" stroke-width="1.6"/><path d="M21.2 9.2v5.2" stroke="#f5c542" stroke-width="1.6" stroke-linecap="round"/><circle cx="21.2" cy="16.1" r="1.4" fill="#f5c542"/></svg>`;

/* ================= 场景一：开始界面 ================= */
function showStart() {
  app.replaceChildren();
  const sc = el(`
    <div class="screen-start">
      <div class="start-bg"><canvas></canvas></div>
      <div class="start-dim"></div>
      <div class="start-title">
        <h1>口袋灌篮高手</h1>
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
    }, 520);
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
  { dex: 1, en: "Bulbasaur", cn: "妙蛙种子", type: "Grass" },
  { dex: 4, en: "Charmander", cn: "小火龙", type: "Fire" },
  { dex: 7, en: "Squirtle", cn: "杰尼龟", type: "Water" },
];

function showStarter(save) {
  app.replaceChildren();
  let selected = 0;
  const sc = el(`
    <div class="screen-starter">
      <div class="starter-bg"><canvas></canvas></div>
      <div class="starter-dim"></div>
      <div class="starter-head">
        <span class="starter-kicker">第一步 · 选择伙伴</span>
        <h2>选择你的初始伙伴</h2>
        <p>它将与你一起，踏上灌篮高手之路</p>
      </div>
      <div class="starter-cards">
        ${STARTERS.map(
          (s, i) => `
        <button class="starter-card pk-panel" data-i="${i}" style="--tc:${TYPE_COLORS[s.type] || "#7ac74c"}">
          <span class="starter-check">✓</span>
          <img src="./sprites/${s.dex}.png" alt="${s.cn}" />
          <span class="name">${s.cn}</span>
          <span class="tag">${typeCn(s.type)}属性</span>
        </button>`
        ).join("")}
      </div>
      <div class="starter-actions">
        <button class="pk-btn-gold" disabled>确 定</button>
        <p class="starter-note">开局赠送 300 篮球币 · 选择后可随时调整首发</p>
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
      btn.textContent = `确定 · ${STARTERS[selected].cn}`;
    })
  );
  btn.addEventListener("click", () => {
    const r = startJourney(save, STARTERS[selected].dex, "小智");
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
  const stageLabel = currentMatchInfo(save).label;
  // —— 每日挑战（入口副标题：今日规则 + 最高分）——
  const daily = dailyPreview(save);

  const sc = el(`
    <div class="screen-menu">
      <div class="menu">
        <div class="attract"><canvas class="attract-canvas"></canvas><div class="attract-dim"></div></div>
      <div class="top-row">
        <button class="coin-chip coin-btn" id="earn-add" title="获取金币" aria-label="获取金币">${COIN_SVG}<b>${save.coins}</b><span class="coin-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></button>
        <button class="badge-chip" id="home-badges" type="button" title="道馆徽章">${BADGE_SVG} <b>${badge}</b>/8</button>
        <div class="spacer"></div>
        <div class="coin-chip plain">${save.coach.name}</div>
      </div>
      <div class="menu-in">
        <header class="title">
          <h1 class="logo"><span class="logo-poke">口袋</span><span class="logo-jam">灌篮高手</span></h1>
          <p class="tag">与宝可梦伙伴一起，征服街头篮球场</p>
        </header>
        <div class="team-card showcase">
          <button type="button" class="team-preset" id="mon-swap">
            <span class="tc-swap">更换</span>
            <img class="tc-sprite" src="./sprites/${mon.dex}.png" alt="" draggable="false">
            <span class="tc-meta"><i class="tc-type" style="--tc:${TYPE_COLORS[base.types[0]] || "#7ac74c"}">${TYPE_ZH[base.types[0]] || base.types[0]}</i><b class="tc-name">Lv.${mon.level} ${base.name}</b></span>
          </button>
        </div>
        <div class="menu-panel">
          <div class="mi-grid">
            <button class="mi mi-hot" data-go="match"><span class="mi-ico">${ICON.ball}</span><span class="mi-txt"><b class="mi-t">开始比赛</b><small class="mi-s">${stageLabel}</small></span></button>
            <button class="mi mi-daily" data-go="daily"><span class="mi-ico">${DAILY_SVG}</span><span class="mi-txt"><b class="mi-t">每日挑战</b><small class="mi-s">今日 ${daily.mod.name} · 最高分 ${daily.best || "未挑战"}</small></span></button>
            <button class="mi" data-go="achv"><span class="mi-ico">${ICON.trophy}</span><span class="mi-txt"><b class="mi-t">成就</b><small class="mi-s">${achvDone} / 16 · 里程碑</small></span></button>
            <button class="mi" data-go="tutorial"><span class="mi-ico">${TUTORIAL_SVG}</span><span class="mi-txt"><b class="mi-t">新手教程</b><small class="mi-s">操作 · 规则 · 训练</small></span></button>
            <button class="mi" data-go="dex"><span class="mi-ico">${ICON.book}</span><span class="mi-txt"><b class="mi-t">图鉴</b><small class="mi-s">${Object.keys(save.dex).length} / 291 已结缘</small></span></button>
            <button class="mi" data-go="team"><span class="mi-ico">${ICON.team}</span><span class="mi-txt"><b class="mi-t">队伍</b><small class="mi-s">${save.team.length}/10 · 仓库 ${save.box.length}</small></span></button>
            <button class="mi" data-go="shop"><span class="mi-ico">${ICON.shop}</span><span class="mi-txt"><b class="mi-t">每日商店</b><small class="mi-s">精灵 · 蛋 · 树果</small></span></button>
            <button class="mi" data-go="egg"><span class="mi-ico">${ICON.egg}</span><span class="mi-txt"><b class="mi-t">孵蛋</b><small class="mi-s">${save.eggs.slots.filter(Boolean).length}/${save.eggs.unlockedSlots} 槽</small></span></button>
            <button class="mi" data-go="bag"><span class="mi-ico">${ICON.bag}</span><span class="mi-txt"><b class="mi-t">背包</b><small class="mi-s">树果 ×${save.bag.berryNormal}</small></span></button>
            <button class="mi" data-go="settings"><span class="mi-ico">${ICON.gear}</span><span class="mi-txt"><b class="mi-t">设置</b><small class="mi-s">难度 · 声音 · 存档</small></span></button>
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
  // 金币"+"获取面板 / 成就面板
  sc.querySelector("#earn-add").addEventListener("click", () => {
    openEarn(save, () => {
      const coinB = sc.querySelector(".coin-chip b");
      if (coinB) coinB.textContent = save.coins;
    });
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

  if (!save.onboarded) {
    setTimeout(() => startOnboarding(sc, save, {
      onFinish: () => {
        const cur = loadSave() || save;
        cur.onboarded = true;
        writeSave(cur);
      },
    }), 420);
  }
}

/* ================= 赛季赛程弹窗（8 馆 × 4 小关 + 四天王） ================= */
const VENUE_CN = ["深灰道馆", "华蓝道馆", "枯叶道馆", "彩虹道馆", "浅红道馆", "金黄道馆", "红莲道馆", "常磐道馆"];

function openSeasonBoard(save) {
  const s = ensureSeason(save);
  const info = currentMatchInfo(save);
  const legendPending = pendingLegend(save);
  const teamPower = myTeamPower(save);
  const winP = Math.round(Math.max(0.05, Math.min(0.95, 0.5 + (teamPower - info.targetPower) * 0.03)) * 100);
  const resultFor = (v, sm) => {
    const list = s.results.filter((r) => (r.season || s.no) === s.no && r.venue === v && r.small === sm);
    return list[list.length - 1] || null;
  };
  const statusOf = (v, sm) => {
    if (s.phase === "final" || s.venue >= 8) return v < 8 ? "done" : sm === 3 ? "cur" : "lock";
    if (v < s.venue) return "done";
    if (v > s.venue) return "lock";
    if (sm < s.small) return "done";
    if (sm === s.small) return "cur";
    return "lock";
  };
  const stageCell = (v, sm) => {
    const st = statusOf(v, sm);
    const res = resultFor(v, sm);
    const mark = st === "cur" ? "●" : st === "done" ? (res && !res.win ? "✗" : "✓") : `<span class="stage-lock">${LOCK_SVG}</span>`;
    const score = res ? ` ${res.myScore}:${res.oppScore}${res.sim ? " 模拟" : ""}` : "";
    return `<div class="season-stage ${st}"><span>${SMALL_NAMES[sm]}</span><b>${mark}${score}</b></div>`;
  };

  let rows = "";
  const venueState = (v) => {
    if (s.phase === "final" || s.venue >= 8) return v < 8 ? "done" : "cur";
    if (v < s.venue) return "done";
    if (v > s.venue) return "lock";
    return "cur";
  };
  const stagesGrid = (v) => `<div class="season-stages" hidden>${[0, 1, 2, 3].map((sm) => stageCell(v, sm)).join("")}</div>`;
  for (let v = 0; v < 8; v++) {
    const gym = LEAGUE_GYMS[v];
    const vs = venueState(v);
    const gotBadge = s.badges.includes(gym.badge);
    if (vs === "lock") {
      rows += `<div class="season-venue locked compact">
        <div class="season-vhead"><span><i class="sv-no">${v + 1}</i>${VENUE_CN[v]}</span><small>${LOCK_SVG} 未解锁</small></div>
      </div>`;
      continue;
    }
    const isCur = vs === "cur";
    const vlabel = gotBadge ? `<span class="badge-label">${BADGE_SVG} 已获徽章</span>` : isCur ? `进行中 · ${Math.min(3, s.small)}/4` : "已完成 · 4/4";
    rows += `<div class="season-venue ${isCur ? "open" : ""}">
      <button class="season-vhead" data-vtoggle="${v}"><span><i class="sv-no">${v + 1}</i>${VENUE_CN[v]}</span><small>${vlabel}<i class="chev">›</i></small></button>
      ${isCur ? `<div class="season-stages">${[0, 1, 2, 3].map((sm) => stageCell(v, sm)).join("")}</div>` : stagesGrid(v)}
    </div>`;
  }
  const finalSt = s.phase === "final" || s.venue >= 8 ? "cur" : "lock";
  const finalRes = resultFor(8, 3);
  rows += finalSt === "lock"
    ? `<div class="season-venue locked compact"><div class="season-vhead"><span>四天王联队</span><small>${LOCK_SVG} 未解锁</small></div></div>`
    : `<div class="season-venue open">
        <button class="season-vhead" data-vtoggle="final"><span>四天王联队</span><small>冠军战<i class="chev">›</i></small></button>
        <div class="season-stages"><div class="season-stage ${finalSt}"><span>冠军战</span><b>${finalSt === "cur" ? "●" : ""}${finalRes ? ` ${finalRes.myScore}:${finalRes.oppScore}` : ""}</b></div></div>
      </div>`;

  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `
    <div class="pj-page-card"><div class="sub-page pj-page-body">
      <div class="page-head"><button class="back" data-back>‹</button><h2>赛季赛程</h2><button class="count badge-count" type="button" id="season-badges">第 ${s.no} 赛季 · ${s.badges.filter((b) => b !== "champion").length}/8 徽章 ›</button></div>
      <p class="page-sub">当前：${info.smallName} · 推荐 ${info.targetPower} · 我的 ${teamPower} · 胜率 ${winP}%</p>
      ${legendPending ? `<button class="legend-pending" id="season-legend">
        <b>✦ 冠军传说待领取</b>
        <small>S${legendPending.season} · ${legendPending.choices.length} 选 1 · 点击选择</small>
      </button>` : ""}
      ${rows}
      <div class="season-actions">
        <button class="pk-btn-gold" id="season-go">出 战</button>
        <button class="pk-btn-gold season-watch" id="season-watch">${EYE_SVG} 观战</button>
        <button class="pk-btn-gold season-sim" id="season-sim">一键模拟</button>
      </div>
    </div></div>`;
  const close = () => { wrap.remove(); showHome(loadSave() || save); };
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { close(); return; }
    const tg = e.target.closest("[data-vtoggle]");
    if (tg) {
      const box = tg.closest(".season-venue");
      const stages = box?.querySelector(".season-stages");
      if (stages) {
        stages.hidden = !stages.hidden;
        box.classList.toggle("open", !stages.hidden);
      }
    }
  });
  wrap.querySelector("#season-badges")?.addEventListener("click", () => {
    openBadgeDetail(loadSave() || save);
  });
  wrap.querySelector("#season-legend")?.addEventListener("click", () => {
    const fresh = loadSave() || save;
    openLegendPicker(fresh, legendPending, {
      onClose: () => { wrap.remove(); openSeasonBoard(loadSave() || fresh); },
    });
  });
  wrap.querySelector("#season-go").addEventListener("click", () => {
    const fresh = loadSave() || save;
    wrap.remove();
    showMatch(fresh);
  });
  wrap.querySelector("#season-watch").addEventListener("click", () => {
    const fresh = loadSave() || save;
    wrap.remove();
    startAutoMatch(fresh);
  });
  wrap.querySelector("#season-sim").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "模拟中…";
    const fresh = loadSave() || save;
    const { engine, cfg } = await simulateCurrentMatch(fresh);
    wrap.remove();
    showResult(fresh, engine, false, cfg.gym, true);
  });
  document.body.appendChild(wrap);
}

/* ================= 场景四：比赛 + 结果面板 ================= */
function showMatch(save) {
  showPreMatch(save);
}

/** 赛前对阵页：双方战力 / 首发 / 胜率（仅展示，不可调整阵容） */
function showPreMatch(save) {
  save = loadSave() || save;
  ensureLineupSlots(save);
  const cfg = buildGymMatch(save);
  const info = currentMatchInfo(save);
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
      <h2>${info.kind === "elite" ? "四天王 · 冠军战" : `第 ${info.venue + 1} 馆 · ${gym.name}`}</h2>
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
    startMatchNow(loadSave() || save);
  });
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
    { t: "移动", d: "按住左下摇杆拖动，控制球员跑位。" },
    { t: "投篮", d: "按住投篮键蓄力，力度条变绿的瞬间松开。" },
    { t: "传球 / 必杀", d: "点传球键给队友；必杀槽满后点必杀键。" },
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
function startMatchNow(save) {
  save = loadSave() || save;
  const cfg = buildGymMatch(save);
  const gym = cfg.gym;
  const rookie = isRookie(save);
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, cfg, gameAudio, (engine, c, quit, simulated) => showResult(save, engine, quit, gym, simulated), { startingFive: false });
  if (rookie) showRookieGuide(page, save);
}

/** 观战：双方 AI 自动比赛（奖励按模拟口径结算） */
function startAutoMatch(save, cfg) {
  save = loadSave() || save;
  cfg ||= buildGymMatch(save);
  const autoCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
  gameAudio.unlock();
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, autoCfg, gameAudio, (engine, c, quit) => showResult(save, engine, quit, cfg.gym, true, true), { spectator: true, startingFive: false });
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

function showResult(save, engine, quit, gym, simulated = false, spectate = false) {
  gameAudio.setTrack("menu");
  const page = app.firstElementChild;
  const r = settleMatchResult(save, engine, quit ? null : (engine?.cfg?.gym ?? gym), quit, simulated);
  const adDouble = !simulated && !spectate && !quit && r.coinsGained > 0 && adDoubleLeft() > 0;

  // 升级/进化中心弹窗队列（赛后自动逐个播放）
  playResultAnims(r);

  page.classList.add("result-screen");
  page.innerHTML = `
    <div class="rs-card ${r.won ? "win" : "lose"}">
      <span class="rs-kicker">${r.smallName}${r.simulated ? (spectate ? " · 观战" : " · 模拟") : ""}</span>
      <h2 class="rs-title">${quit ? "中途离场" : r.won ? "胜 利" : "惜 败"}</h2>
      <p class="rs-score">${engine ? `${engine.teams[0].abbr} <b>${r.myScore}</b> : <b>${r.oppScore}</b> ${engine.teams[1].abbr}` : quit ? "未打完，按判负记入战绩" : ""}</p>
      <div class="res-lines rs-lines">
        <p class="res-line"><span class="coin-ico">${ICON.coin}</span><span>篮球币 +${r.coinsGained}（${r.won ? "胜利奖励" : "安慰奖"}）</span></p>
        <p class="res-line"><span class="res-dot"></span><span>下一场：${r.nextLabel}</span></p>
        <p class="res-line">${ICON.trophy}<span>战绩 ${save.stats.w} 胜 ${save.stats.l} 负</span></p>
        ${r.badgeGained ? `<p class="res-line res-gold">${BADGE_SVG}<span>获得「${r.badgeName || "道馆"}」徽章！</span></p>` : ""}
        ${r.champion ? `<p class="res-line res-gold">${ICON.trophy}<span>冠军！进入第 ${save.journey.season.no} 赛季（全馆 +2 战力）</span></p>` : ""}
        ${r.legendReward ? `<p class="res-line res-gold"><span>✦</span><span>冠军传说自选已解锁：${r.legendReward.choices.length} 只中选 1 只</span></p>` : ""}
        ${r.itemGained ? `<p class="res-line res-gold">${GIFT_SVG}<span>获得道具：${r.itemName}</span></p>` : ""}
        ${r.sign ? (r.sign.dup
          ? `<p class="res-line">${SIGN_SVG}<span>对手 ${r.sign.name} 想加入，但已结缘 → 折算 +${r.sign.coin} 币</span></p>`
          : `<p class="res-line res-good">${SIGN_SVG}<span>战胜签约！${r.sign.name} 加入了你的${r.sign.movedTo === "team" ? "队伍" : "仓库"}！</span></p>`) : ""}
        ${r.xpEvents.length ? `<div class="res-xp">${r.xpEvents.map((e) => `<p class="res-line">${UP_SVG}<span>${e}</span></p>`).join("")}</div>` : ""}
      </div>
      <div class="rs-actions">
        ${adDouble ? `<button class="pk-btn-gold rs-ad" id="res-ad">看广告 · 金币 ×2（今日 ${adDoubleLeft()} 次）</button>` : ""}
        ${r.legendReward ? `<button class="pk-btn-gold rs-legend" id="res-legend">✦ 选择冠军传说 · 3 选 1</button>` : ""}
        <button class="pk-btn-gold" id="res-next">${r.won && !r.seasonEnded ? "下 一 场" : "再 来 一 场"}</button>
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
        btn.textContent = "✦ 冠军传说已领取";
      },
    });
  });
  page.querySelector("#res-home").addEventListener("click", () => showHome(loadSave() || save));
  page.querySelector("#res-next").addEventListener("click", () => showMatch(loadSave() || save));
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
          ${r.firstWin ? `<p class="res-line res-gold"><span class="coin-ico">${ICON.coin}</span><span>今日首胜 +100 篮球币</span></p>` : ""}
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
window.__PC = await import("../engine/readable/play-core.js?v=15");
preloadSprites?.([]); // 触发引擎资源预载（容错）
installAudioUnlock();
const existing = loadSave();
if (existing && existing.journey.stage !== "starter") showHome(existing);
else showStart();



















