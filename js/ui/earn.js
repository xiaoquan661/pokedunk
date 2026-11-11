/**
 * ui/earn.js —— 金币获取面板（pokedunk-v2）
 * 入口：主页金币 chip 旁「+」按钮。两个来源：
 *  1. 激励视频：window.LampsGame.showRewardedVideo()（Lamps 平台）；本地无桥时走 3 秒模拟兜底。
 *  2. 每日活跃任务：按日重置的任务列表（打比赛/投喂/签约…），完成领币。
 * 存档：pokedunk.daily.v1（{date, tasks:{id:true}, adAt}）。
 */
import { writeSave } from "../storage.js?v=14";
import { watchRewardedAd } from "../platform/ads.js?v=4";
import { gameAudio } from "../platform/audio.js?v=8";

const DAILY_KEY = "pokedunk.daily.v1";
const AD_COINS = 60;      // 每次看广告奖励（S13 待定案）
const ADS_PER_DAY = 5;    // 每日看广告次数上限

/** 每日任务定义（check 按 save/daily 判定是否已完成；goal 供展示） */
const TASKS = [
  { id: "play1",  name: "打一场比赛",     goal: 1, coin: 30,  check: (s) => (daily().cnt.match || 0) >= 1 },
  { id: "play3",  name: "打三场比赛",     goal: 3, coin: 60,  check: (s) => (daily().cnt.match || 0) >= 3 },
  { id: "feed2",  name: "投喂树果 2 次",  goal: 2, coin: 30,  check: (s) => (daily().cnt.feed || 0) >= 2 },
  { id: "sign1",  name: "战胜签约 1 只",  goal: 1, coin: 80,  check: (s) => (daily().cnt.sign || 0) >= 1 },
  { id: "visit",  name: "逛一逛商店/孵蛋", goal: 1, coin: 20, check: (s) => (daily().cnt.visit || 0) >= 1 },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function daily() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}"); } catch {}
  if (d.date !== todayStr()) d = { date: todayStr(), cnt: {}, claimed: {}, adAt: d.adAt && d.date === todayStr() ? d.adAt : 0 };
  return d;
}
function persistDaily(d) { try { localStorage.setItem(DAILY_KEY, JSON.stringify(d)); } catch {} }

/** 活跃度计数（其他模块调用） */
export function bumpDaily(key, n = 1) {
  const d = daily();
  d.cnt[key] = (d.cnt[key] || 0) + n;
  persistDaily(d);
  return d.cnt[key];
}

export function openEarn(save, onCoins) {
  if (!document.getElementById("pj-earn-style")) {
    const st = document.createElement("style");
    st.id = "pj-earn-style";
    st.textContent =
      ".earn-body .pj-block{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;margin-bottom:10px}" +
      ".earn-body .pj-flbl{font-size:13px;font-weight:700;margin-bottom:2px}" +
      ".earn-body .pj-fdesc{font-size:11.5px;color:var(--text-dim);margin-bottom:8px}" +
      ".earn-body .pj-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)}" +
      ".earn-body .pj-row:last-child{border-bottom:none}" +
      ".earn-body .pj-coin{color:var(--gold);font-weight:700}" +
      ".earn-body .pj-btn{padding:7px 14px;border-radius:14px;border:none;font:700 11.5px var(--sport);background:var(--gold);color:#1a2c55}" +
      ".earn-body .pj-btn[disabled]{opacity:.4}" +
      ".earn-body .pj-btn.done{background:rgba(33,208,122,.2);color:var(--good);box-shadow:inset 0 0 0 1px rgba(33,208,122,.5)}" +
      ".earn-body .pj-note{font-size:11px;color:var(--text-dim);margin-top:10px;text-align:center}";
    document.head.appendChild(st);
  }

  function render() {
    const d = daily();
    const adsLeft = ADS_PER_DAY - (d.adAt || 0);
    const coinEl = wrap.querySelector("#earn-coins");
    if (coinEl) coinEl.textContent = `${save.coins} 币`;
    wrap.querySelector("#pj-earn-body").innerHTML = `
      <div class="pj-block">
        <div class="pj-flbl">激励视频</div>
        <div class="pj-fdesc">观看一段短广告，立刻获得金币（今日剩余 ${Math.max(0, adsLeft)} 次）</div>
        <div class="pj-row"><span>看广告得 <span class="pj-coin">+${AD_COINS} 币</span></span><button class="pj-btn" id="pj-earn-ad" ${adsLeft <= 0 ? "disabled" : ""}>观看</button></div>
      </div>
      <div class="pj-block">
        <div class="pj-flbl">每日活跃任务</div>
        <div class="pj-fdesc">每天 0 点重置 · 完成后领金币</div>
        ${TASKS.map((t) => {
          const done = !!d.claimed[t.id];
          const can = t.check(save) && !done;
          const cnt = t.id === "play1" || t.id === "play3" ? (d.cnt.match || 0)
            : t.id === "feed2" ? (d.cnt.feed || 0)
            : t.id === "sign1" ? (d.cnt.sign || 0)
            : (d.cnt.visit || 0);
          return `<div class="pj-row"><span>${t.name} <small style="color:rgba(255,255,255,.4)">${cnt >= t.goal ? "✓" : `(${Math.min(cnt, t.goal)}/${t.goal})`}</small></span><button class="pj-btn ${done ? "done" : ""}" data-claim="${t.id}" ${can ? "" : "disabled"}>${done ? "已领取" : `领 +${t.coin} 币`}</button></div>`;
        }).join("")}
      </div>
      <p class="pj-note">宝可灌篮 · 金币获取</p>`;
  }
  const keyOf = (t) => t.id;

  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `
    <div class="pj-page-card"><div class="sub-page pj-page-body earn-body">
      <div class="page-head"><button class="back" data-back>‹</button><h2>获取金币</h2><span class="count" id="earn-coins">${save.coins} 币</span></div>
      <div id="pj-earn-body"></div>
    </div></div>`;
  wrap.addEventListener("click", async (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); return; }
    if (e.target.closest("#pj-earn-ad")) {
      const btn = wrap.querySelector("#pj-earn-ad");
      btn.disabled = true; btn.textContent = "播放中…";
      const ad = await watchRewardedAd("coins");
      const ok = ad.ok;
      const d = daily();
      if (ok) {
        d.adAt = (d.adAt || 0) + 1;
        persistDaily(d);
        save.coins += AD_COINS;
        writeSave(save);
        gameAudio.play("coin");
        onCoins?.();
        render();
      } else {
        btn.textContent = "广告暂不可用";
        setTimeout(render, 1200);
      }
      return;
    }
    const cb = e.target.closest("[data-claim]");
    if (cb && !cb.disabled) {
      const t = TASKS.find((x) => x.id === cb.dataset.claim);
      const d = daily();
      if (!t || d.claimed[t.id] || !t.check(save)) return;
      d.claimed[t.id] = true;
      persistDaily(d);
      save.coins += t.coin;
      writeSave(save);
      gameAudio.play("coin");
      onCoins?.();
      render();
    }
  });
  document.body.appendChild(wrap);
  render();
}





