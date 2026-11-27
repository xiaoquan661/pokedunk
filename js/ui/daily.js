/**
 * ui/daily.js —— 每日挑战弹窗卡片（pokedunk-v2）
 * 主页「每日挑战」入口 → 今日 modifier / 对手阵容 / 双方战力 / 最佳分 / 当日任务 / 开球。
 * 比赛与结算由 app.js 接线（本文件只负责面板）。
 */
import { loadSave, writeSave } from "../storage.js?v=697";
import { gameAudio } from "../platform/audio.js?v=697";
import {
  dailyPreview, dailyMissionRows, dailyScoreRows, claimDailyMission, ensureDaily,
} from "../journey/daily.js?v=697";
import { fetchDailyLeaderboard, leaderboardSupported } from "../platform/leaderboard.js?v=697";

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
.dsr-ico{flex:0 0 auto;width:52px;height:52px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;
  border:1px solid var(--line,rgba(255,255,255,.16));background:rgba(0,0,0,.28);overflow:hidden}
.dsr-ico img{width:40px;height:40px;object-fit:contain;image-rendering:pixelated}
.dsr-ico b{font:800 15px var(--sport);color:var(--gold)}
.dsr-ico small{font-size:8px;color:var(--text-dim);line-height:1}
.dsr-ico.rare{border-color:rgba(79,157,255,.6);background:rgba(79,157,255,.1)}
.dsr-ico.legend{border-color:rgba(245,197,66,.65);background:linear-gradient(160deg,rgba(245,197,66,.2),rgba(0,0,0,.25))}
.dsr-ico .qm{font:800 24px var(--sport);color:var(--text-dim);line-height:1}
.dsr-ico.rare .qm{color:#7fb8ff}
.dsr-ico.legend .qm{color:var(--gold)}
.dsr-bar{position:relative;height:5px;margin:6px 2px 0;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.dsr-bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#4f9dff,#f5c542)}
.dsr-need{flex:0 0 auto;text-align:right;font:700 9.5px var(--sport);color:var(--text-dim);line-height:1.35;min-width:44px}
.dsr-need b{display:block;font-size:11px;color:var(--gold)}
.dsr-need span{font-size:9.5px}
.dsr-row.claimed .dsr-need b{color:#9fe3b0}
.dsr-top{padding:7px 10px;border-radius:7px;border:1px dashed color-mix(in srgb,var(--gold) 40%,transparent);
  background:rgba(245,197,66,.07);font-size:10.5px;color:var(--text-dim);line-height:1.5}
.dsr-top b{color:var(--gold);font:700 12px var(--sport)}
.daily-score-help{padding:9px 11px;margin-bottom:10px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:6px;background:var(--panel-2,rgba(0,0,0,.18))}
.daily-score-help > b{display:block;margin-bottom:4px;font-size:12px;color:var(--gold)}
.daily-score-help p{margin:0 0 4px;font-size:12px;line-height:1.55;color:var(--text)}
.daily-score-help small{display:block;font-size:10.5px;line-height:1.5;color:var(--text-dim)}
.daily-rank{display:flex;flex-direction:column;margin:0 0 4px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;background:rgba(0,0,0,.18);overflow:hidden}
.dr-row{display:grid;grid-template-columns:34px minmax(0,1fr) 58px;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.06)}
.dr-row:last-child{border-bottom:none}
.dr-row.me{background:rgba(245,197,66,.1)}
.dr-rank{text-align:center;font:700 12px var(--sport);color:var(--text-dim);font-variant-numeric:tabular-nums}
.dr-row.top1 .dr-rank{color:#ffd75e}
.dr-row.top2 .dr-rank{color:#d8e4f5}
.dr-row.top3 .dr-rank{color:#e9a06b}
.dr-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:var(--text)}
.dr-row.me .dr-name{color:var(--gold);font-weight:700}
.dr-name em{font-style:normal;margin-left:4px;font:700 9px var(--sport);color:var(--gold)}
.dr-score{text-align:right;font:700 12px var(--sport);color:var(--gold);font-variant-numeric:tabular-nums}
.dr-empty,.dr-loading{margin:0;padding:12px 10px;text-align:center;font-size:10.5px;color:var(--text-dim);line-height:1.5}
.dr-refresh{display:block;margin:0 auto 10px;padding:5px 14px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.18));background:rgba(0,0,0,.24);color:var(--text);font:700 10.5px var(--sport)}
.dr-mine{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;border-top:1px solid rgba(245,197,66,.22);background:rgba(245,197,66,.06);font-size:10.5px;color:var(--text-dim)}
.dr-mine b{color:var(--gold);font:700 12px var(--sport);font-variant-numeric:tabular-nums}
.dr-total{margin:0;padding:5px 10px 7px;text-align:right;font-size:9.5px;color:var(--text-dim)}
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
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

  let rankSeq = 0;
  function renderRank(box, r) {
    if (!r.supported) {
      box.innerHTML = '<p class="dr-empty">排行榜在 Lamps 平台内开放；当前为本地预览。</p>';
      return;
    }
    if (r.message && !r.list.length) {
      box.innerHTML = `<p class="dr-empty">${esc(r.message)}</p><button type="button" class="dr-refresh" data-rank-refresh>重试</button>`;
      return;
    }
    const list = (r.list || []).slice(0, 10);
    const rows = list.map((it) => {
      const rank = Number(it.rank) || 0;
      const top = rank >= 1 && rank <= 3 ? ` top${rank}` : "";
      return `<div class="dr-row${it.isCurrentUser ? " me" : ""}${top}">
        <span class="dr-rank">${rank || "-"}</span>
        <span class="dr-name">${esc(it.nickname || "选手")}${it.isCurrentUser ? "<em>我</em>" : ""}</span>
        <span class="dr-score">${Number(it.score) || 0}</span>
      </div>`;
    }).join("");
    const mine = r.record;
    const inTop = !!(mine && list.some((x) => x.isCurrentUser));
    const mineHtml = mine && !inTop
      ? `<div class="dr-mine"><span>我的排名</span><span>#${mine.rank} · <b>${Number(mine.score) || 0}</b> 分</span></div>`
      : (!mine ? '<div class="dr-mine"><span>我的排名</span><span>今日尚未上榜</span></div>' : "");
    box.innerHTML = (rows
      ? `<div class="dr-list">${rows}</div>`
      : '<p class="dr-empty">今日还没有人上榜，打完一局抢占第一。</p>')
      + mineHtml
      + `<p class="dr-total">今日共 ${Number(r.total) || 0} 人上榜 · 显示前 ${list.length} 名</p>`;
  }

  async function loadRank(date) {
    const box = body.querySelector("#daily-rank");
    if (!box) return;
    if (!leaderboardSupported()) {
      renderRank(box, { supported: false });
      return;
    }
    const seq = ++rankSeq;
    box.innerHTML = '<p class="dr-loading">加载中…</p>';
    const r = await fetchDailyLeaderboard(date);
    if (seq !== rankSeq || !box.isConnected) return;
    renderRank(box, r);
  }

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

      <div class="dsec daily-sec">今日排行榜 <small>每日挑战分 · 每日 0 点换榜</small></div>
      <div class="daily-rank" id="daily-rank"><p class="dr-loading">加载中…</p></div>

      <div class="daily-note">${p.firstWin ? "今日首胜奖励已领取" : "今日首胜额外 +100 篮球币"} · 2 分钟 × 4 节 · 本模式仅限手动比赛</div>

      <div class="dsec daily-sec">计分方式 <small>每场只记最高分</small></div>
      <div class="daily-score-help">
        <b>挑战分 = 我方得分 + 今日风格分 + 胜利×10</b>
        ${(() => {
          const w = p.scoreRule;
          const ex = 40 + 6 * w.tpm + 5 * w.dnk + 4 * w.stl + 3 * w.blk + 8 * (w.reb || 0) + w.win;
          const parts = [`三分 6×${w.tpm}`, `扣篮 5×${w.dnk}`, `抢断 4×${w.stl}`, `盖帽 3×${w.blk}`];
          if (w.reb) parts.push(`篮板 8×${w.reb}`);
          return `<p>今日权重：${w.label}<br>例：40 分 + ${parts.join(" + ")} + 胜利 ${w.win} = <b>${ex} 分</b></p>`;
        })()}
        <small>风格分按全队技术统计累加；失败没有胜利分。局内比分板底栏会实时显示挑战分与加分播报。</small>
      </div>

      <div class="dsec daily-sec">分数奖励 <small>打每日挑战得分 · 达到自动发放 · 0 点刷新</small></div>
      ${(() => {
        const best = p.best || 0;
        const next = scoreRows.find((m) => !m.claimed && !m.weeklyLocked && best < m.score);
        const txt = next
          ? `再得 <b>${next.score - best}</b> 分领「${next.legend ? "随机传说精灵" : next.mon ? "随机稀有精灵" : `+${next.coin} 币`}」`
          : "今日档位奖励已全部达成";
        return `<div class="dsr-top">今日最高 <b>${best}</b> 分 · ${txt}</div>`;
      })()}
      <div class="daily-score">
        ${scoreRows.map((m) => {
          const reward = m.legend
            ? (m.weeklyLocked ? "本周已领 · 下周刷新" : "随机传说精灵")
            : m.mon
              ? (m.weeklyLocked ? "本周已领 · 下周刷新" : "随机稀有精灵")
              : `+${m.coin} 币`;
          const sub = m.legend
            ? "达到即发 · 从尚未结缘的传说中随机 1 只 · 每周限 1 · 不折币"
            : m.mon
              ? "达到即发 · 从尚未结缘的稀有精灵中随机 1 只 · 每周限 1 · 不折币"
              : "达到即发 · 直接进账";
          const best = p.best || 0;
          const pct = Math.min(100, Math.round((best / m.score) * 100));
          const icon = m.legend
            ? `<span class="qm">?</span><small>传说</small>`
            : m.mon
              ? `<span class="qm">?</span><small>稀有</small>`
              : `<b>+${m.coin}</b><small>币</small>`;
          const right = m.claimed
            ? `<b>已领取</b>`
            : m.weeklyLocked
              ? `<b>本周已领</b>`
              : m.reached
                ? `<b>已达成</b>`
                : `<b>还差</b><span>${m.score - best} 分</span>`;
          return `<div class="dsr-row ${m.claimed ? "claimed" : m.reached ? "reached" : ""}">
            <span class="dsr-score">${m.score} 分</span>
            <span class="dsr-ico ${m.legend ? "legend" : m.mon ? "rare" : ""}">${icon}</span>
            <span class="dsr-txt"><b>${reward}</b><small>${sub}</small>
              <span class="dsr-bar"><i style="width:${pct}%"></i></span></span>
            <span class="dsr-need">${right}</span>
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
    loadRank(p.date);
  }

  body.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { close(); return; }
    if (e.target.closest("[data-rank-refresh]")) { render(); return; }
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
