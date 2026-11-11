/**
 * ui/daily.js —— 每日挑战弹窗卡片（pokedunk-v2）
 * 主页「每日挑战」入口 → 今日 modifier / 对手阵容 / 双方战力 / 最佳分 / 当日任务 / 开球。
 * 比赛与结算由 app.js 接线（本文件只负责面板）。
 */
import { loadSave, writeSave } from "../storage.js?v=14";
import {
  dailyPreview, dailyMissionRows, claimDailyMission, ensureDaily,
} from "../journey/daily.js?v=17";

let toastTimer = null;
function toast(msg, ms = 2400) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

function dateLabel(key) {
  const [, m, d] = key.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

const TYPE_ZH = {
  Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰",
  Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力",
  Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精",
};
const monName = (dex) => {
  const row = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return row ? String(row[1]).replace(/#\d+$/, "") : "#" + dex;
};
const typeText = (types) => TYPE_ZH[types?.[0]] || types?.[0] || "";

/**
 * 打开每日挑战面板。
 * @param save   当前存档（内部会重读）
 * @param actions { onStart(simulated) } 关闭面板后开始比赛
 */
export function openDaily(save, actions = {}) {
  save = loadSave() || save;
  ensureDaily(save);
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body daily-body"></div></div>`;
  const body = wrap.querySelector(".daily-body");

  const close = () => wrap.remove();

  function render() {
    const p = dailyPreview(save);
    const d = ensureDaily(save);
    const missions = dailyMissionRows(save);
    const hist = (d.history || []).slice(-3).reverse();
    body.innerHTML = `
      <div class="page-head"><button class="back" data-close>‹</button><h2>每日挑战</h2><span class="count">${p.weekday}</span></div>
      <p class="page-sub">${dateLabel(p.date)} · 每日轮换规则 · 无限次尝试，只记最高分</p>

      <div class="daily-hero">
        <div class="dh-top"><span class="dh-tag">今日规则</span><b>${p.mod.name}</b></div>
        <p>${p.mod.desc}</p>
        <div class="dh-opp">对手：${p.mod.name}联队 · 战力 <b>${p.target}</b> · 我方 ${p.teamPower}</div>
      </div>

      <div class="daily-lineup">
        <div class="dl-title"><span>全明星阵容</span><small>今日对手首发</small></div>
        <div class="dl-grid">
          ${(p.roster || []).map((m) => `<div class="dl-card">
            <img src="./sprites/${m.dex}.png" alt="">
            <b>${monName(m.dex)}</b>
            <small>${m.pos} · ${typeText(m.types)}</small>
            <span>${m.ovr}</span>
          </div>`).join("")}
        </div>
      </div>

      <div class="daily-stats">
        <div><b>${p.best || "—"}</b><small>今日最高分</small></div>
        <div><b>${p.plays}</b><small>挑战次数</small></div>
        <div><b>${p.wins}</b><small>今日胜场</small></div>
      </div>

      <div class="daily-note">${p.firstWin ? "今日首胜奖励已领取" : "今日首胜额外 +100 篮球币"} · 3 分钟 × 4 节 · 本模式仅限手动比赛</div>

      <div class="dsec daily-sec">今日任务 <small>完成后领取，0 点刷新</small></div>
      <div class="daily-missions">
        ${missions.map((m) => `
          <div class="daily-mission ${m.claimed ? "done" : m.reached ? "ready" : ""}">
            <span class="dm-txt"><b>${m.name}</b><small>${m.have}/${m.goal}</small></span>
            <button class="dm-btn" data-mission="${m.id}" ${m.canClaim ? "" : "disabled"}>${m.claimed ? "已领取" : `+${m.coin} 币`}</button>
          </div>`).join("")}
      </div>

      ${hist.length ? `<div class="dsec daily-sec">最近战绩</div>
      <div class="daily-history">${hist.map((h) => `<div><span>${dateLabel(h.date)}</span><b>${h.best} 分</b><small>${h.wins} 胜 / ${h.plays} 场</small></div>`).join("")}</div>` : ""}

      <div class="daily-actions">
        <button class="pk-btn-gold" id="daily-play">开 球</button>
      </div>`;
  }

  body.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { close(); return; }
    const mb = e.target.closest("[data-mission]");
    if (mb && !mb.disabled) {
      save = loadSave() || save;
      const r = claimDailyMission(save, mb.dataset.mission);
      if (!r.ok) return toast(r.error);
      writeSave(save);
      toast(`任务完成：+${r.coin} 币`);
      render();
      return;
    }
    if (e.target.closest("#daily-play")) {
      close();
      actions.onStart?.();
    }
  });
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
  render();
}
