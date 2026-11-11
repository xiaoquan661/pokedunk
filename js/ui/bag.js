/**
 * ui/bag.js —— 背包页（pokedunk-v2）：物品格子 + 物品详情页
 * 格子展示持有物品（树果/精灵蛋），点击格子 → 进入物品详情页（大图+描述+数量）。
 * 使用入口不在背包：树果投喂走精灵详情页（detail.js），孵蛋走孵蛋页。
 */
import { getPokemon, xpToNext, rollGrowth } from "../../engine/readable/play-core.js?v=15";
import { EVOLUTIONS } from "../../engine/data/evolutions.js";
import { recordEvolution, writeSave } from "../storage.js?v=14";
import { ICON } from "./icons.js?v=8";

const BERRY_XP = 50;

/** 空背包插画 */
const EMPTY_BAG_SVG = `<svg viewBox="0 0 120 120" class="empty-svg" aria-hidden="true">
  <circle cx="60" cy="62" r="42" fill="rgba(245,197,66,.06)" stroke="rgba(245,197,66,.22)" stroke-width="1.5" stroke-dasharray="4 5"/>
  <path d="M38 48h44l7 40a8 8 0 0 1-8 9H39a8 8 0 0 1-8-9z" fill="#24447e" stroke="#6f8fc8" stroke-width="2"/>
  <path d="M46 48v-6a14 14 0 0 1 28 0v6" fill="none" stroke="#6f8fc8" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M47 68h26" stroke="#f5c542" stroke-width="3" stroke-linecap="round"/>
  <circle cx="60" cy="80" r="4" fill="#f5c542"/>
  <path d="M92 32l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f5c542" opacity=".8"/>
  <path d="M28 30l1.4 3.6L33 35l-3.6 1.4L28 40l-1.4-3.6L23 35l3.6-1.4z" fill="#9db0d8" opacity=".7"/>
</svg>`;

/** 投喂单个个体（与 settle.js grantXp 同款升级循环+进化判定） */
function grantXp(save, monId, mon, amount) {
  const events = [];
  mon.xp += amount;
  while (mon.xp >= xpToNext(mon.level)) {
    mon.xp -= xpToNext(mon.level);
    if (mon.level >= 99) { mon.xp = 0; break; }
    mon.level++;
    const growth = rollGrowth({ dex: mon.dex, bonus: mon.bonus }, Math.random);
    events.push(`${getPokemon(mon.dex).name} 升到 Lv.${mon.level}（${growth.join("、") || "无加点"}）`);
    const evo = EVOLUTIONS[mon.dex];
    if (evo && mon.level >= evo.level && evo.to.length) {
      const r = recordEvolution(save, monId, evo.to[0]);
      if (r.ok) events.push(`进化！${getPokemon(r.oldDex).name} → ${getPokemon(r.newDex).name}`);
    }
  }
  return events;
}

/* —— 物品定义 —— */
const ITEMS = {
  berry: {
    icon: ICON.berry,
    name: "普通树果",
    desc: "投喂给一只精灵，立刻获得 50 XP。使用入口：精灵详情页的「投喂」按钮。",
    count: (save) => save.bag.berryNormal || 0,
  },
  egg: {
    icon: ICON.egg,
    name: "精灵蛋",
    desc: "购买后进入待孵栏，由你在孵蛋页放入孵化器；倒计时结束后孵出随机精灵（同种唯一与撞车折币同商店）。",
    count: (save) => (save.eggs.stock || []).length,
  },
};

export function renderBag(page, save) {
  const total = Object.values(ITEMS).reduce((a, it) => a + it.count(save), 0);
  page.innerHTML = `
    <div class="page-head"><button class="back" data-back>‹</button><h2>背包</h2></div>
    <p class="page-sub">结缘获得的消耗品 · 点击物品查看详情（投喂入口在精灵详情页）</p>
    ${total ? `<div class="bag-grid">
      ${Object.entries(ITEMS).map(([key, it]) => {
        const n = it.count(save);
        return `<button class="bag-item pk-panel${n <= 0 ? " dim" : ""}" data-item="${key}">
          <span class="bi-icon">${it.icon}</span>
          <b class="bi-name">${it.name}</b>
          <small class="bi-note">${n > 0 ? "点击查看" : "暂无"}</small>
          <span class="bi-count">×${n}</span>
        </button>`;
      }).join("")}
    </div>` : `<div class="empty-art">
      ${EMPTY_BAG_SVG}
      <b class="empty-title">背包空空如也</b>
      <p class="empty-sub">去商店买颗树果，或孵一颗蛋迎接新伙伴</p>
      <button class="pk-btn-gold empty-cta" data-go-shop>去每日商店</button>
    </div>`}`;

  // 只绑定一次：物品详情返回会重渲染背包，重复绑定会让一次点击执行多次
  if (!page.__bagBound) {
    page.__bagBound = true;
    page.addEventListener("click", (e) => {
      if (e.target.closest("[data-back]")) { page.dispatchEvent(new CustomEvent("bag-back")); return; }
      if (e.target.closest("[data-go-shop]")) { page.dispatchEvent(new CustomEvent("page-goto", { detail: "shop" })); return; }
      if (e.target.closest("[data-itemback]")) { renderBag(page, save); return; }
      const item = e.target.closest("[data-item]");
      if (item) renderItemDetail(page, save, item.dataset.item);
    });
  }
}

/** 物品详情页（替换 sub-page 内容，返回回背包格） */
function renderItemDetail(page, save, key) {
  const it = ITEMS[key];
  if (!it) return;
  const n = it.count(save);
  page.innerHTML = `
    <div class="page-head"><button class="back" data-itemback>‹</button><h2>${it.name}</h2><span class="count">×${n}</span></div>
    <p class="page-sub">物品详情</p>
    <div class="item-detail pk-panel">
      <span class="id-icon">${it.icon}</span>
      <b class="id-count">持有数量：×${n}</b>
      <p class="id-desc">${it.desc}</p>
    </div>`;
}








