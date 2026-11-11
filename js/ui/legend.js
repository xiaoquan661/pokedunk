/**
 * ui/legend.js —— 冠军传说三选一弹窗（v2.5）
 * 首通四天王后由结算页/赛季页打开；领取后立即写入存档。
 */
import { getPokemon } from "../../engine/data/pokemon.js";
import { loadSave, writeSave } from "../storage.js?v=14";
import { claimLegendReward, dexName, LEGEND_DUPE_COINS } from "../journey/legend.js?v=2";
import { ICON } from "./icons.js?v=8";

const TYPE_ZH = {
  Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰",
  Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力",
  Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精",
};

function choiceCard(save, dex) {
  const p = getPokemon(dex);
  const owned = !!save.dex?.[dex];
  const types = (p.types || []).map((t) => TYPE_ZH[t] || t).join(" · ");
  return `<button class="legend-choice${owned ? " owned" : ""}" data-legend-pick="${dex}">
    <span class="lc-badge">传说</span>
    <img src="./sprites/${dex}.png" alt="">
    <b>${dexName(dex)}</b>
    <small>${types}</small>
    <span class="lc-ovr">OVR ${p.ovr}</span>
    <em>${owned ? `已拥有 · 折算 ${LEGEND_DUPE_COINS} 币` : "选择"}</em>
  </button>`;
}

/**
 * @param save 当前存档
 * @param pending { season, choices:[dex] }
 * @param opts { onClose, onClaim }
 */
export function openLegendPicker(save, pending, opts = {}) {
  if (!pending) return;
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal legend-picker";
  wrap.style.cssText = "position:fixed;inset:0;z-index:960;background:rgba(5,8,16,.78);display:grid;place-items:center;padding:10px";

  const card = document.createElement("div");
  card.className = "pj-page-card legend-pick-card";
  wrap.appendChild(card);

  const close = () => {
    wrap.remove();
    opts.onClose?.();
  };

  const renderPick = () => {
    card.innerHTML = `<div class="sub-page pj-page-body">
      <div class="page-head">
        <button class="back" data-legend-close>‹</button>
        <h2>冠军传说</h2>
        <span class="count">S${pending.season} · 3 选 1</span>
      </div>
      <p class="page-sub">首通四天王奖励 · 选择一只传说精灵加入球队</p>
      <div class="legend-choice-grid">${pending.choices.map((dex) => choiceCard(save, dex)).join("")}</div>
      <p class="legend-pick-note">每个赛季只能领取一次；未领取的奖励会保留在赛季页。</p>
    </div>`;
  };

  const renderSuccess = (r) => {
    card.innerHTML = `<div class="sub-page pj-page-body legend-result">
      <div class="page-head">
        <button class="back" data-legend-close>‹</button>
        <h2>传说降临</h2>
        <span class="count">S${pending.season}</span>
      </div>
      <div class="legend-reveal">
        <span class="legend-reveal-ring"></span>
        <img src="./sprites/${r.dex}.png" alt="">
        <span class="legend-reveal-tag">传说</span>
        <h3>${r.name}</h3>
        <p>${r.dup
          ? `已拥有该传说 · 折算 <b>${ICON.coin}${r.coin}</b> 篮球币`
          : `已加入${r.placed === "box" ? "仓库" : "队伍"} · 图鉴点亮`}</p>
        <button class="pk-btn-gold legend-done" data-legend-close>确 定</button>
      </div>
    </div>`;
  };

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-legend-close]")) { close(); return; }
    const btn = e.target.closest("[data-legend-pick]");
    if (!btn || btn.disabled) return;
    const dex = Number(btn.dataset.legendPick);
    const fresh = loadSave() || save;
    const r = claimLegendReward(fresh, pending.season, dex);
    if (!r.ok) return;
    writeSave(fresh);
    renderSuccess(r);
    opts.onClaim?.(r);
  });

  renderPick();
  document.body.appendChild(wrap);
}
