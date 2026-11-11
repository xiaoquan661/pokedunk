/**
 * shop-egg-ui.js —— 商店页 / 孵蛋页（pokedunk-v2 L1）
 * 布局移植旧 journey-ui 的 shopView/eggView 设计（卡片网格+价格胶囊+状态按钮），
 * 数据层走新 systems/shop.js 与 systems/egg.js。
 */
import { loadSave, writeSave } from "../storage.js?v=14";
import { shopList, shopBuy, PRICES, EGG_TIERS, shopAdRefresh, shopAdRefreshLeft } from "../systems/shop.js?v=12";
import { eggList, eggHatch, eggStart, eggSpeedUp } from "../systems/egg.js?v=12";
import { watchRewardedAd } from "../platform/ads.js?v=4";
import { playHatch } from "./anim.js?v=10";
import { ICON, coinInline } from "./icons.js?v=8";

const monName = (dex) => {
  const rows = window.__PJ_DEX_ROWS || [];
  const r = rows.find((x) => x[0] === dex);
  return r ? String(r[1]).replace(/#\d+$/, "") : "#" + dex;
};
const sprite = (dex) => `./sprites/${dex}.png`;
const SPARK_SVG = `<svg viewBox="0 0 24 24" width="50" height="50" aria-hidden="true"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#f5c542" stroke="#7a5200" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const PLUS_SVG = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
/** 孵蛋器/待孵栏用的大蛋插画 */
const EGG_ART = `<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="44" rx="23" ry="31" fill="#f3ead2" stroke="#c9b27a" stroke-width="2"/><path d="M16 38c6 4 11 2 16-1s10-4 16 0M14 52c7 4 12 2 18-1s11-4 18 0" fill="none" stroke="#d8c89e" stroke-width="2.6" stroke-linecap="round"/><circle cx="27" cy="27" r="4" fill="#e8dfc6"/><circle cx="40" cy="63" r="3" fill="#e8dfc6"/><path d="M22 21c3-7 7-11 10-11s7 4 10 11" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/></svg>`;

/** 空孵蛋器插画 */
const EMPTY_EGG_SVG = `<svg viewBox="0 0 120 120" class="empty-svg" aria-hidden="true">
  <circle cx="60" cy="60" r="42" fill="rgba(122,92,240,.08)" stroke="rgba(160,140,255,.3)" stroke-width="1.5" stroke-dasharray="4 5"/>
  <ellipse cx="60" cy="64" rx="24" ry="31" fill="#f3ead2" stroke="#c9b27a" stroke-width="2"/>
  <path d="M40 58c6 5 12 3 18-1s12-5 20 0M44 72c7 4 12 2 17-1s10-4 17 0" fill="none" stroke="#d8c89e" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M92 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f5c542" opacity=".85"/>
  <path d="M28 40l1.4 3.6L33 45l-3.6 1.4L28 50l-1.4-3.6L23 45l3.6-1.4z" fill="#9db0d8" opacity=".7"/>
  <path d="M80 84l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#f5c542" opacity=".6"/>
</svg>`;
const fmtMs = (ms) => {
  const s = Math.ceil(ms / 1000);
  if (s >= 3600) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  }
  if (s >= 60) {
    const m = Math.floor(s / 60), sec = s % 60;
    return sec ? `${m} 分 ${sec} 秒` : `${m} 分钟`;
  }
  return `${s} 秒`;
};
const tierName = (tier) => (EGG_TIERS[tier] || EGG_TIERS.normal).name;

let toastTimer = null;
function toast(msg, ms = 2200) {
  let t = document.getElementById("pk-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "pk-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/* ---------- 商店页 ---------- */
export function renderShop(root) {
  const save = loadSave();
  const items = shopList(save);
  const bagCount = save.bag.berryNormal || 0;

  root.innerHTML = `
    <div class="page-head">
      <button class="back" data-back>‹</button>
      <h2>每日商店</h2>
      <span class="count">${coinInline}${save.coins}</span>
    </div>
    <p class="page-sub">每日货架（跨天自动刷新）· 精灵 ${PRICES.mon} / 普通蛋 ${EGG_TIERS.normal.price} / 高级蛋 ${EGG_TIERS.premium.price} / 树果 ${PRICES.berry} 币 · 蛋有 1% 传说概率</p>
    <div class="shop-tools"><button class="shop-ad" id="shop-refresh">看广告刷新货架（今日剩 ${shopAdRefreshLeft(save)} 次）</button></div>
    <div class="shop-grid">
      ${items.map((it) => {
        if (it.type === "mon")
          return `<div class="shop-card${it.owned ? " off" : ""}">
            <img src="${sprite(it.dex)}" alt="">
            <div class="nm">${monName(it.dex)}</div>
            <div class="info">${coinInline}${it.price}</div>
            <button data-buy="${it.slot}"${it.owned ? " disabled" : ""}>${it.owned ? "已结缘" : "购买"}</button>
          </div>`;
        if (it.type === "egg") {
          const t = EGG_TIERS[it.tier] || EGG_TIERS.normal;
          return `<div class="shop-card"><span class="emoji">${ICON.egg}</span>
            <div class="nm">${t.name}</div><div class="info">${coinInline}${it.price} · 孵化 ${fmtMs(t.hatchMs)}</div>
            <button data-buy="${it.slot}">购买</button></div>`;
        }
        return `<div class="shop-card"><span class="emoji">${ICON.berry}</span>
          <div class="nm">普通树果</div><div class="info">${coinInline}${it.price} · +50 XP · 背包 ${bagCount}</div>
          <button data-buy="${it.slot}">购买</button></div>`;
      }).join("")}
    </div>`;

  root.querySelectorAll("[data-buy]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = shopBuy(save, Number(b.dataset.buy));
      if (!r.ok) return toast("购买失败：" + r.error);
      if (r.kind === "mon") toast(`${monName(r.dex)}${r.placed === "box" ? " 进入仓库（队伍已满）" : " 已入队！"}`, 3000);
      else if (r.kind === "egg") toast(`神秘蛋已放入背包（待孵 ${r.stock} 颗）——去孵蛋页选择孵化`, 3000);
      else toast(`树果已入背包（共 ${r.count} 个）`);
      writeSave(save);
      renderShop(root); // 重渲染刷新币数/置灰
    })
  );

  root.querySelector("#shop-refresh")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (shopAdRefreshLeft(save) <= 0) return toast("今日广告刷新已用完");
    btn.disabled = true;
    btn.textContent = "播放中…";
    const ad = await watchRewardedAd("shop_refresh");
    if (!ad.ok) {
      btn.disabled = false;
      btn.textContent = "看广告刷新货架";
      return toast(ad.message || "广告暂不可用");
    }
    const r = shopAdRefresh(save);
    if (!r.ok) return toast(r.error);
    writeSave(save);
    toast("货架已刷新");
    renderShop(root);
  });
}

/* ---------- 孵蛋页 ---------- */
function eggSlotHtml(e, i) {
  if (!e) {
    return `<div class="egg-slot empty">
      <div class="egg-orb empty">${PLUS_SVG}</div>
      <b class="egg-state">空槽</b>
      <small class="egg-slot-hint">从下方待孵栏放入一颗蛋</small>
      <span class="egg-slot-no">槽位 ${i + 1}</span>
    </div>`;
  }
  const ready = e.ready || e.leftMs <= 0;
  return `<div class="egg-slot ${ready ? "ready" : "hatching"}">
    <div class="egg-orb">${EGG_ART}</div>
    <small class="egg-tier">${tierName(e.tier)}</small>
    <b class="egg-state">${ready ? "可以孵化！" : "孵化中…"}</b>
    ${ready
      ? `<span class="egg-ready-hint">蛋壳在轻轻晃动</span>
         <button class="pk-btn-gold egg-hatch" data-hatch="${i}">孵 化</button>`
      : `<span class="egg-left">${fmtMs(e.leftMs)}</span>
         <div class="egg-bar"><i style="width:${Math.round((e.progress || 0) * 100)}%"></i></div>
         <button class="egg-ad" data-adspeed="${i}">看广告 -30 分钟</button>`}
    <span class="egg-slot-no">槽位 ${i + 1}</span>
  </div>`;
}

function stockCardHtml(e, hasFree) {
  const t = EGG_TIERS[e.tier] || EGG_TIERS.normal;
  return `<div class="egg-stock-card">
    <span class="egg-mini">${EGG_ART}</span>
    <span class="es-txt"><b>${t.name}</b><small>孵化 ${fmtMs(t.hatchMs)} · ${hasFree ? "放入后开始计时" : "孵化器已满"}</small></span>
    <button class="pk-btn-gold es-btn" data-start="${e.index}" ${hasFree ? "" : "disabled"}>放入孵化器</button>
  </div>`;
}

export function renderEgg(root) {
  const save = loadSave();
  // 倒计时刷新：孵化中每秒重绘；页面销毁自动停表
  clearInterval(root.__eggTimer);
  root.__eggTimer = null;
  const data = eggList(save);
  const live = data.slots.filter(Boolean).length;
  const hasFree = data.free > 0;
  const nothing = live === 0 && data.stock.length === 0;

  root.innerHTML = `
    <div class="page-head">
      <button class="back" data-back>‹</button>
      <h2>孵蛋</h2>
      <span class="count">${ICON.egg}${live}/${data.unlocked}</span>
    </div>
    <p class="page-sub">购买后进入待孵栏，由你决定何时放入孵化器 · 普通蛋 30 分钟 / 高级蛋 6 小时 · 每次孵化 1% 传说概率</p>
    ${nothing ? `<div class="empty-art">
      ${EMPTY_EGG_SVG}
      <b class="empty-title">还没有精灵蛋</b>
      <p class="empty-sub">去每日商店买一颗神秘蛋，再回来亲手放进孵化器</p>
      <button class="pk-btn-gold empty-cta" data-eggshop>去每日商店买蛋</button>
    </div>` : `
      <div class="egg-sec">孵化器 <small>${live}/${data.unlocked} 槽</small></div>
      <div class="egg-grid">${data.slots.map((e, i) => eggSlotHtml(e, i)).join("")}</div>
      <div class="egg-sec">待孵化 <small>${data.stock.length} 颗 · 放入后开始计时</small></div>
      ${data.stock.length
        ? `<div class="egg-stock">${data.stock.map((e) => stockCardHtml(e, hasFree)).join("")}</div>`
        : `<p class="egg-stock-empty">待孵栏是空的，去每日商店买一颗蛋吧</p>`}
    `}`;

  // 商店跳转 + 放入孵化器（委托绑定一次：每秒重绘会替换节点）
  if (!root.__eggBound) {
    root.__eggBound = true;
    root.addEventListener("click", async (e) => {
      if (e.target.closest("[data-eggshop]")) { root.dispatchEvent(new CustomEvent("page-goto", { detail: "shop" })); return; }
      const st = e.target.closest("[data-start]");
      if (st && !st.disabled) {
        const fresh = loadSave() || save;
        const r = eggStart(fresh, Number(st.dataset.start));
        if (!r.ok) return toast(r.error);
        toast("已放入孵化器，开始计时");
        renderEgg(root);
        return;
      }
      const sp = e.target.closest("[data-adspeed]");
      if (sp && !sp.disabled) {
        sp.disabled = true;
        sp.textContent = "播放中…";
        const ad = await watchRewardedAd("egg_speed");
        if (!ad.ok) {
          sp.disabled = false;
          sp.textContent = "看广告 -30 分钟";
          return toast(ad.message || "广告暂不可用");
        }
        const fresh = loadSave() || save;
        const r = eggSpeedUp(fresh, Number(sp.dataset.adspeed));
        if (!r.ok) return toast(r.error);
        toast(r.leftMs <= 0 ? "加速完成，可以孵化了！" : "已加速 30 分钟");
        renderEgg(root);
      }
    });
  }

  root.querySelectorAll("[data-hatch]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = eggHatch(save, Number(b.dataset.hatch));
      if (!r.ok) return toast(r.error === "还没孵好" ? `还没孵好（剩 ${fmtMs(r.leftMs)}）` : "无法开启：" + r.error);
      const legend = !!r.legend;
      const title = r.recruited
        ? legend ? `传说降临 · ${monName(r.dex)}` : `恭喜！${monName(r.dex)} 加入了${r.placed === "box" ? "仓库" : "队伍"}`
        : legend ? `传说再临 · ${monName(r.dex)}` : `撞车 · ${monName(r.dex)} 已折算`;
      const sub = r.recruited
        ? legend
          ? `传说精灵加入了${r.placed === "box" ? "仓库" : "队伍"} · 图鉴${r.first ? "首次点亮" : "记录 +1"}`
          : "图鉴" + (r.first ? " · 首次点亮" : " · 记录 +1")
        : `已拥有该精灵 · 转化为篮球币 +${r.coin}`;
      playHatch({ dex: r.dex, title, sub, dup: !r.recruited, legend }, () => renderEgg(root));
    })
  );

  if (data.slots.some((e) => e && e.leftMs > 0)) {
    root.__eggTimer = setInterval(() => {
      if (!root.isConnected) { clearInterval(root.__eggTimer); root.__eggTimer = null; return; }
      renderEgg(root);
    }, 1000);
  }
}









