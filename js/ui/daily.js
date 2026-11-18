/**
 * ui/daily.js —— 每日挑战弹窗卡片（pokedunk-v2）
 * 主页「每日挑战」入口 → 今日 modifier / 对手阵容 / 双方战力 / 最佳分 / 当日任务 / 开球。
 * 比赛与结算由 app.js 接线（本文件只负责面板）。
 */
import { loadSave, writeSave } from "../storage.js?v=75";
import { gameAudio } from "../platform/audio.js?v=64";
import {
  dailyPreview, dailyMissionRows, dailyScoreRows, claimDailyMission, ensureDaily,
} from "../journey/daily.js?v=92";

const DAILY_CSS = `
.daily-score{display:flex;flex-direction:column;gap:6px}
.dsr-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;background:var(--panel-2,rgba(0,0,0,.18));border:1px solid var(--line,rgba(255,255,255,.08))}
.dsr-row.reached{border-color:color-mix(in srgb,var(--gold) 45%,transparent)}
.dsr-row.claimed{opacity:.7}
.dsr-row .dsr-score{flex:0 0 58px;font:700 13px var(--sport);color:var(--gold);font-variant-numeric:tabular-nums}
.dsr-row .dsr-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dsr-row .dsr-txt b{font-size:12.5px;font-weight:600}
.dsr-row .dsr-txt small{font-size:10.5px;color:var(--text-dim)}
.dsr-row .dsr-tag{flex-shrink:0;padding:5px 10px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.16));color:var(--text-dim);font:700 11px var(--sport);white-space:nowrap}
.dsr-row.reached .dsr-tag{border-color:var(--gold);color:var(--gold)}
.daily-score-help{padding:9px 11px;margin-bottom:10px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:6px;background:var(--panel-2,rgba(0,0,0,.18))}
.daily-score-help > b{display:block;margin-bottom:4px;font-size:12px;color:var(--gold)}
.daily-score-help p{margin:0 0 4px;font-size:12px;line-height:1.55;color:var(--text)}
.daily-score-help small{display:block;font-size:10.5px;line-height:1.5;color:var(--text-dim)}
`;
function ensureCss() {
  if (document.getElementById("pj-daily-score-style")) return;
  const st = document.createElement("style");
  st.id = "pj-daily-score-style";
  st.textContent = DAILY_CSS;
  document.head.appendChild(st);
}

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
  ensureCss();
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
    const scoreRows = dailyScoreRows(save);
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

      <div class="dsec daily-sec">计分方式 <small>每场只记最高分</small></div>
      <div class="daily-score-help">
        <b>挑战分 = 我方得分 + 扣篮×3 + 三分×2 + 抢断×2 + 盖帽×2 + 胜利×10</b>
        <p>例：40 分 + 扣篮 5×3 + 三分 6×2 + 抢断 4×2 + 盖帽 3×2 + 胜利 10 = <b>91 分</b></p>
        <small>扣篮、三分、抢断、盖帽按全队技术统计累加；失败没有胜利分。</small>
      </div>

      <div class="dsec daily-sec">分数奖励 <small>达到即自动发放 · 0 点刷新 · 传说每周限 1 只</small></div>
      <div class="daily-score">
        ${scoreRows.map((m) => {
          const reward = m.legend ? (m.weeklyLocked ? "本周已领 · 折算 200 币" : "随机传说精灵") : `+${m.coin} 币`;
          const state = m.claimed ? "已领取" : m.weeklyLocked ? "本周已领" : m.reached ? "已达成" : "未达成";
          return `<div class="dsr-row ${m.claimed ? "claimed" : m.reached ? "reached" : ""}">
            <span class="dsr-score">${m.score} 分</span>
            <span class="dsr-txt"><b>${reward}</b><small>${m.legend ? "从尚未结缘的传说中随机获得" : "每日挑战分数奖励"}</small></span>
            <span class="dsr-tag">${state}</span>
          </div>`;
        }).join("")}
      </div>

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
      gameAudio.play("coin");
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
  (document.getElementById("stage")||document.body).appendChild(wrap);
  render();
}
