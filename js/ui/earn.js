/**
 * ui/earn.js —— 金币获取面板（pokedunk-v2）
 * 入口：主页金币 chip 旁「+」按钮。两个来源：
 *  1. 激励视频：window.LampsGame.showRewardedVideo()（Lamps 平台）；本地无桥时走 3 秒模拟兜底。
 *  2. 每日活跃任务：按日重置的任务列表（打比赛/投喂/签约…），完成领币。
 * 存档：pokedunk.daily.v1（{date, tasks:{id:true}, adAt}）。
 */
import { loadSave, writeSave, addMon, hasDex } from "../storage.js?v=696";
import { getPokemon } from "../../engine/data/pokemon.js";
import { LEGENDARY_DEX } from "../systems/build.js?v=696";
import { watchRewardedAd } from "../platform/ads.js?v=696";
import { gameAudio } from "../platform/audio.js?v=696";
import { rollEggDex } from "../systems/shop.js?v=696";
import { ICON } from "./icons.js?v=696";
import { playAcquire } from "./anim.js?v=696";

const DAILY_KEY = "pokedunk.daily.v1";
const AD_COINS = 200;     // 每次看广告奖励（S46：300→200，并加每日上限）
const AD_DAILY_MAX = 10;  // 每日看广告次数上限
const monName = (dex) => {
  const r = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return r ? String(r[1]).replace(/#\d+$/, "") : "#" + dex;
};
let earnToastTimer = null;
function earnToast(msg, ms = 2600) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(earnToastTimer);
  earnToastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/** 每日任务定义（check 按 save/daily 判定是否已完成；goal 供展示） */
const TASKS = [
  { id: "play1",  name: "打一场比赛",     goal: 1, coin: 30,  check: (s) => (daily().cnt.match || 0) >= 1 },
  { id: "play3",  name: "打三场比赛",     goal: 3, coin: 60,  check: (s) => (daily().cnt.match || 0) >= 3 },
  { id: "feed2",  name: "投喂树果 2 次",  goal: 2, coin: 30,  check: (s) => (daily().cnt.feed || 0) >= 2 },
  { id: "sign1",  name: "签下精灵合同 1 只",  goal: 1, coin: 80,  check: (s) => (daily().cnt.sign || 0) >= 1 },
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

/* ---------------- 7 日签到 ---------------- */
const SIGN_REWARDS = {
  1: { type: "rare", label: "随机稀有精灵" },
  2: { type: "egg", tier: "normal", n: 1, label: "普通蛋 ×1" },
  3: { type: "legend", label: "随机传说精灵 ×1" },
  4: { type: "berry", tier: "premium", n: 1, label: "高级树果 ×1" },
  5: { type: "egg", tier: "premium", n: 1, label: "高级蛋 ×1" },
  6: { type: "berry", tier: "premium", n: 2, label: "高级树果 ×2" },
  7: { type: "legend", label: "随机传说精灵 ×1" },
};
function yesterdayStr() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
/** 每日任务页是否有可领取：今日未签到，或有已完成未领的任务 */
export function dailyClaimable(save) {
  if (!signInfo(save).signedToday) return true;
  const d = daily();
  return TASKS.some((t) => !d.claimed[t.id] && t.check(save));
}

/** 签到状态：只读，不写存档 */
export function signInfo(save) {
  save.signin ||= { streak: 0, lastDate: "" };
  const today = todayStr();
  const signedToday = save.signin.lastDate === today;
  const nextStreak = signedToday
    ? (save.signin.streak || 1)
    : save.signin.lastDate === yesterdayStr()
      ? (save.signin.streak || 0) + 1
      : 1;
  const day = ((Math.max(1, nextStreak) - 1) % 7) + 1;
  return { signedToday, streak: nextStreak, day, today, reward: SIGN_REWARDS[day] };
}
/** 第 1 天签到：随机一只未结缘、OVR 85+ 的非传说精灵 */
function grantRareForSign(save) {
  const rows = window.__PJ_DEX_ROWS || [];
  let pool = rows.filter((r) => !LEGENDARY_DEX.has(r[0]) && !hasDex(save, r[0]) && (getPokemon(r[0]).ovr || 0) >= 85);
  if (!pool.length) pool = rows.filter((r) => !LEGENDARY_DEX.has(r[0]) && !hasDex(save, r[0]) && (getPokemon(r[0]).ovr || 0) >= 80);
  if (!pool.length) return { ok: false, fallback: "egg" };
  const row = pool[Math.floor(Math.random() * pool.length)];
  const r = addMon(save, row[0], { from: "signin" });
  if (!r.ok) return { ok: false, fallback: "egg" };
  return { ok: true, dex: row[0], name: monName(row[0]), placed: r.movedTo };
}
function grantLegendForSign(save) {
  const rows = window.__PJ_DEX_ROWS || [];
  const pool = rows.filter((r) => LEGENDARY_DEX.has(r[0]) && !hasDex(save, r[0]));
  if (!pool.length) return { ok: false, fallback: "egg" };
  const row = pool[Math.floor(Math.random() * pool.length)];
  const r = addMon(save, row[0], { from: "signin" });
  if (!r.ok) return { ok: false, fallback: "egg" };
  return { ok: true, dex: row[0], name: monName(row[0]), placed: r.movedTo };
}
function grantSignReward(save, reward) {
  save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
  save.eggs.stock ||= [];
  save.bag ||= {};
  if (reward.type === "berry") {
    const key = reward.tier === "premium" ? "berryPremium" : "berryNormal";
    save.bag[key] = (save.bag[key] || 0) + reward.n;
    return { ok: true, text: reward.label };
  }
  if (reward.type === "egg") {
    const tier = reward.tier === "premium" ? "premium" : "normal";
    for (let i = 0; i < reward.n; i++) {
      save.eggs.stock.push({ eggTier: tier, dex: rollEggDex(save, tier) });
    }
    return { ok: true, text: reward.label };
  }
  if (reward.type === "rare") {
    const rare = grantRareForSign(save);
    if (rare.ok) return { ok: true, text: `稀有精灵「${rare.name}」加入${rare.placed === "box" ? "仓库" : "队伍"}`, dex: rare.dex, name: rare.name };
    for (let i = 0; i < 2; i++) save.eggs.stock.push({ eggTier: "premium", dex: rollEggDex(save, "premium") });
    return { ok: true, fallback: true, text: "稀有已集齐 · 改发高级蛋 ×2" };
  }
  const legend = grantLegendForSign(save);
  if (legend.ok) return { ok: true, text: `传说精灵「${legend.name}」加入${legend.placed === "box" ? "仓库" : "队伍"}`, dex: legend.dex, name: legend.name };
  // 传说已集齐或队伍/仓库已满：改发高级蛋，避免签到只给金币
  for (let i = 0; i < 2; i++) save.eggs.stock.push({ eggTier: "premium", dex: rollEggDex(save, "premium") });
  return { ok: true, fallback: true, text: "传说已集齐 · 改发高级蛋 ×2" };
}

/** 活跃度计数（其他模块调用） */
export function bumpDaily(key, n = 1) {
  const d = daily();
  d.cnt[key] = (d.cnt[key] || 0) + n;
  persistDaily(d);
  return d.cnt[key];
}

/** 每日活跃任务独立面板（主页入口）：完成进度 + 领币 */
export function openDailyTasks(save, onCoins, opts = {}) {
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
      ".earn-body .pj-btn.done[disabled]{opacity:1;filter:none}" +
      ".earn-body .pj-note{font-size:11px;color:var(--text-dim);margin-top:10px;text-align:center}" +
      'html[data-ui-theme="retro"] .earn-body .pj-block{background:rgba(255,248,232,.72);border:2px solid #b9ad92;border-radius:4px}' +
      'html[data-ui-theme="retro"] .earn-body .pj-flbl{color:#1c241e}' +
      'html[data-ui-theme="retro"] .earn-body .pj-fdesc{color:#575245}' +
      'html[data-ui-theme="retro"] .earn-body .pj-row{color:#1c241e;border-bottom-color:rgba(28,36,30,.12)}' +
      'html[data-ui-theme="retro"] .earn-body .pj-row small{color:#4a4436!important}' +
      'html[data-ui-theme="retro"] .earn-body .pj-coin{color:#b56a16}' +
      'html[data-ui-theme="retro"] .earn-body .pj-note{color:#575245}' +
      'html[data-ui-theme="retro"] .earn-body .pj-btn{background:#1f5c3a;color:#f4ead2}' +
      'html[data-ui-theme="retro"] .earn-body .pj-btn.done{background:rgba(31,92,58,.16);color:#1f5c3a;box-shadow:inset 0 0 0 1px #1f5c3a}' +
      'html[data-ui-theme="retro"] .earn-body .pj-btn.done[disabled]{opacity:1;filter:none}';
    document.head.appendChild(st);
  }
  if (!document.getElementById("pj-signin-style")) {
    const st = document.createElement("style");
    st.id = "pj-signin-style";
    st.textContent =
      ".earn-body .signin-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin:7px 0 8px}" +
      ".earn-body .signin-day{display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 0;border:1px solid rgba(255,255,255,.12);border-radius:6px;font:700 9px var(--sport);color:var(--text-dim)}" +
      ".earn-body .signin-day.on{border-color:var(--gold);background:rgba(245,197,66,.14);color:var(--gold)}" +
      ".earn-body .signin-day.legend{border-color:rgba(245,197,66,.55)}" +
      ".earn-body .signin-day.rare{border-color:rgba(79,157,255,.55)}" +
      ".earn-body .signin-day b{font:700 10px var(--sport)}" +
      ".earn-body .signin-day small{font-size:8px;color:var(--gold)}" +
      ".earn-body .signin-day.legend small{letter-spacing:0}" +
      'html[data-ui-theme="retro"] .earn-body .signin-day{border-color:#b9ad92;color:#575245}' +
      'html[data-ui-theme="retro"] .earn-body .signin-day.on{border-color:#1f5c3a;background:rgba(31,92,58,.12);color:#1f5c3a}' +
      'html[data-ui-theme="retro"] .earn-body .signin-day small{color:#b56a16}' +
      ".earn-body .signin-today{display:flex;align-items:center;gap:10px;margin-top:2px;padding:8px 9px;border-radius:9px;border:1px solid rgba(245,197,66,.32);background:rgba(245,197,66,.07)}" +
      '.earn-body .signin-today .sp-ico{flex:0 0 auto;width:50px;height:50px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(79,157,255,.55);background:rgba(79,157,255,.1)}' +
      '.earn-body .signin-today .sp-ico.legend{border-color:rgba(245,197,66,.7);background:linear-gradient(160deg,rgba(245,197,66,.22),rgba(0,0,0,.25))}' +
      '.earn-body .signin-today .sp-ico.egg{border-color:rgba(255,255,255,.2);background:rgba(0,0,0,.25)}' +
      '.earn-body .signin-today .sp-ico .qm{font:800 24px var(--sport);color:#7fb8ff;line-height:1}' +
      '.earn-body .signin-today .sp-ico.legend .qm{color:var(--gold)}' +
      '.earn-body .signin-today .sp-ico small{font-size:8px;color:var(--text-dim);line-height:1.2}' +
      ".earn-body .signin-today .sp-ico{position:relative}" +
      ".earn-body .signin-today .sp-ico svg{width:30px;height:30px;display:block}" +
      ".earn-body .signin-today .sp-ico.premium{border-color:rgba(245,197,66,.78);box-shadow:0 0 0 1px rgba(245,197,66,.3) inset}" +
      ".earn-body .signin-today .sp-n{position:absolute;top:-5px;right:-5px;font-style:normal;font:700 9px var(--sport);background:var(--gold);color:#111;border-radius:7px;padding:1px 4px}" +
      ".earn-body .task-refresh{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 9px;padding:8px 9px;border-radius:8px;border:1px dashed rgba(245,197,66,.42);background:rgba(245,197,66,.07)}" +
      ".earn-body .task-refresh span{font-size:9.5px;line-height:1.45;color:var(--text-dim)}" +
      ".earn-body .task-refresh .pj-btn{flex:none;padding:6px 10px;font-size:10.5px}" +
      '.earn-body .signin-today .sp-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.earn-body .signin-today .sp-txt b{font:700 12px var(--sport);color:var(--text)}' +
      '.earn-body .signin-today .sp-txt small{font-size:9.5px;color:var(--text-dim);line-height:1.4}' +
      'html[data-ui-theme="retro"] .earn-body .signin-today{background:rgba(255,248,232,.8);border-color:#c9a35a}';
    document.head.appendChild(st);
  }
  const embed = !!opts.host;
  const wrap = embed ? opts.host : document.createElement("div");
  if (!embed) {
    wrap.className = "pj-scrim page-modal";
    wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  }
  const inner = `
      <div class="page-head"><button class="back" data-back>‹</button><h2>每日活跃任务</h2><span class="count" id="task-done">0/5</span></div>
      <div id="pj-task-body"></div>`;
  wrap.innerHTML = embed
    ? `<div class="earn-body">${inner}</div>`
    : `<div class="pj-page-card"><div class="sub-page pj-page-body earn-body">${inner}</div></div>`;
  const body = wrap.querySelector("#pj-task-body");
  const render = () => {
    const d = daily();
    const doneN = TASKS.filter((t) => d.claimed[t.id]).length;
    const cntEl = wrap.querySelector("#task-done");
    if (cntEl) cntEl.textContent = `${doneN}/${TASKS.length} 已完成`;
    const sign = signInfo(save);
    const dayCells = Array.from({ length: 7 }, (_, i) => {
      const day = i + 1;
      const legend = day === 3 || day === 7;
      const tag = legend ? "传说" : day === 1 ? "稀有" : "奖励";
      return `<span class="signin-day${sign.day === day ? " on" : ""}${legend ? " legend" : ""}${day === 1 ? " rare" : ""}">
        <b>${day}</b><small>${tag}</small>
      </span>`;
    }).join("");
    body.innerHTML = `
      <div class="pj-block">
        <div class="pj-flbl">每日签到 <span style="float:right;font:700 10px var(--sport);color:var(--gold)">连续 ${sign.signedToday ? sign.streak : sign.streak - 1 > 0 ? sign.streak - 1 : 0} 天</span></div>
        <div class="pj-fdesc">每天上线点一次 · 第 1 天必得稀有精灵 · 第 3 天和第 7 天必得传说精灵</div>
        <div class="signin-days">${dayCells}</div>
        <div class="signin-today">
          ${(() => {
            const r = sign.reward;
            const isEgg = r.type === "egg";
            const isBerry = r.type === "berry";
            const icon = r.type === "rare" || r.type === "legend"
              ? `<span class="qm">?</span>`
              : isEgg ? ICON.egg : isBerry ? ICON.berryPremium : `<span class="qm">?</span>`;
            const cls = r.type === "legend" ? "legend" : r.type === "rare" ? "rare" : isEgg ? "egg" : isBerry ? "berry" : "egg";
            const tag = r.type === "legend" ? "传说" : r.type === "rare" ? "稀有" : isEgg ? (r.tier === "premium" ? "高级蛋" : "普通蛋") : isBerry ? "树果" : "道具";
            return `<span class="sp-ico ${cls}${r.tier === "premium" ? " premium" : ""}">
              ${icon}<small>${tag}</small>${(r.n || 1) > 1 ? `<i class="sp-n">×${r.n}</i>` : ""}
            </span>`;
          })()}
          <span class="sp-txt">
            <b>今日奖励 · ${sign.reward.label}</b>
            <small>${sign.signedToday ? "已领取，明天再来" : sign.reward.type === "legend" ? "点击签到，必得 1 只传说精灵" : sign.reward.type === "rare" ? "点击签到，必得 1 只稀有精灵" : "点击签到，直接放入背包"}</small>
          </span>
          <button class="pj-btn ${sign.signedToday ? "done" : ""}" data-signin ${sign.signedToday ? "disabled" : ""}>${sign.signedToday ? "已签到" : "签到领取"}</button>
        </div>
      </div>
      <div class="pj-block">
        <div class="pj-flbl">今日任务</div>
        <div class="pj-fdesc">每天 0 点重置 · 完成后领取金币 · 全部完成额外高级精灵蛋 ×1</div>
        <div class="task-refresh">
          <span>看完广告可重置任务进度与领取状态 · 每日 1 次${d.refresh ? ` · 今日已刷新 ${d.refresh} 次` : ""}</span>
          <button class="pj-btn" data-task-refresh ${(d.refresh || 0) >= 1 ? "disabled" : ""}>${(d.refresh || 0) >= 1 ? "今日已刷新" : "看广告刷新"}</button>
        </div>
        ${TASKS.map((t) => {
          const done = !!d.claimed[t.id];
          const can = t.check(save) && !done;
          const cnt = t.id === "play1" || t.id === "play3" ? (d.cnt.match || 0)
            : t.id === "feed2" ? (d.cnt.feed || 0)
            : t.id === "sign1" ? (d.cnt.sign || 0)
            : (d.cnt.visit || 0);
          return `<div class="pj-row"><span>${t.name} <small style="opacity:.55">${cnt >= t.goal ? "✓" : `(${Math.min(cnt, t.goal)}/${t.goal})`}</small></span><button class="pj-btn ${done ? "done" : ""}" data-task-claim="${t.id}" ${can ? "" : "disabled"}>${done ? "已领取" : `领 +${t.coin} 币`}</button></div>`;
        }).join("")}
      </div>
      <p class="pj-note">打比赛、投喂树果、签下胜利后的精灵合同为主要来源</p>`;
  };
  wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { if (!embed) wrap.remove(); return; }
    if (e.target === wrap && !embed) { wrap.remove(); return; }
    const sb = e.target.closest("[data-signin]");
    if (sb && !sb.disabled) {
      const sign = signInfo(save);
      if (sign.signedToday) return;
      save.signin = { streak: sign.streak, lastDate: sign.today };
      const r = grantSignReward(save, sign.reward);
      writeSave(save);
      gameAudio.play(r.dex ? "special" : "coin");
      earnToast(r.text);
      if (r.dex) {
        playAcquire({
          dex: r.dex,
          kicker: "七日签到",
          title: `获得 ${r.name || ""}`,
          sub: r.text,
        }, () => render());
      } else {
        render();
      }
      return;
    }
    const rf = e.target.closest("[data-task-refresh]");
    if (rf && !rf.disabled) {
      const d0 = daily();
      if ((d0.refresh || 0) >= 1) { earnToast("今日刷新次数已用完"); render(); return; }
      rf.disabled = true;
      rf.textContent = "广告中…";
      let settled = false;
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        earnToast(msg);
        render();
      };
      // 广告桥偶发不回调时自动恢复按钮，避免界面卡在“广告中…”
      const timer = setTimeout(() => fail("广告加载超时，请重试"), 8000);
      watchRewardedAd("task_refresh").then((ad) => {
        if (settled) return;
        if (!ad.ok) return fail(ad.message || "广告暂不可用");
        settled = true;
        clearTimeout(timer);
        save = loadSave() || save;
        const d = daily();
        // 重置进度与领取状态；全清奖励（allBonus）保持每天一次，避免重复刷蛋
        d.cnt = {};
        d.claimed = {};
        d.refresh = (d.refresh || 0) + 1;
        persistDaily(d);
        gameAudio.play("coin");
        earnToast("今日任务已刷新：进度与领取状态已重置");
        render();
      }).catch(() => fail("广告暂不可用"));
      return;
    }
    const cb = e.target.closest("[data-task-claim]");
    if (!cb || cb.disabled) return;
    const t = TASKS.find((x) => x.id === cb.dataset.taskClaim);
    const d = daily();
    if (!t || d.claimed[t.id] || !t.check(save)) return;
    d.claimed[t.id] = true;
    persistDaily(d);
    save.coins += t.coin;
    if (TASKS.every((x) => d.claimed[x.id]) && !d.allBonus) {
      d.allBonus = true;
      save.eggs ||= { unlockedSlots: 1, slots: [], stock: [] };
      save.eggs.stock ||= [];
      save.eggs.stock.push({ eggTier: "premium", dex: rollEggDex(save, "premium") });
      persistDaily(d);
      earnToast("今日任务全清：高级精灵蛋 +1（去孵蛋页查看）");
    }
    writeSave(save);
    gameAudio.play("coin");
    onCoins?.();
    render();
  });
  if (!embed) (document.getElementById("stage")||document.body).appendChild(wrap);
  render();
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
      ".earn-body .pj-btn.done[disabled]{opacity:1;filter:none}" +
      ".earn-body .pj-note{font-size:11px;color:var(--text-dim);margin-top:10px;text-align:center}" +
      'html[data-ui-theme="retro"] .earn-body .pj-block{background:rgba(255,248,232,.72);border:2px solid #b9ad92;border-radius:4px}' +
      'html[data-ui-theme="retro"] .earn-body .pj-flbl{color:#1c241e}' +
      'html[data-ui-theme="retro"] .earn-body .pj-fdesc{color:#575245}' +
      'html[data-ui-theme="retro"] .earn-body .pj-row{color:#1c241e;border-bottom-color:rgba(28,36,30,.12)}' +
      'html[data-ui-theme="retro"] .earn-body .pj-row small{color:#4a4436!important}' +
      'html[data-ui-theme="retro"] .earn-body .pj-coin{color:#b56a16}' +
      'html[data-ui-theme="retro"] .earn-body .pj-note{color:#575245}' +
      'html[data-ui-theme="retro"] .earn-body .pj-btn{background:#1f5c3a;color:#f4ead2}' +
      'html[data-ui-theme="retro"] .earn-body .pj-btn.done{background:rgba(31,92,58,.16);color:#1f5c3a;box-shadow:inset 0 0 0 1px #1f5c3a}' +
      'html[data-ui-theme="retro"] .earn-body .pj-btn.done[disabled]{opacity:1;filter:none}';
    document.head.appendChild(st);
  }

  function render() {
    const d = daily();
    const adsLeft = Math.max(0, AD_DAILY_MAX - (d.adAt || 0));
    const coinEl = wrap.querySelector("#earn-coins");
    if (coinEl) coinEl.textContent = `${save.coins} 币`;
    wrap.querySelector("#pj-earn-body").innerHTML = `
      <div class="pj-block">
        <div class="pj-flbl">激励视频</div>
        <div class="pj-fdesc">观看一段短广告，立刻获得金币（每日 ${AD_DAILY_MAX} 次，今日剩 ${adsLeft} 次）</div>
        <div class="pj-row"><span>看广告得 <span class="pj-coin">+${AD_COINS} 币</span></span><button class="pj-btn" id="pj-earn-ad" ${adsLeft <= 0 ? "disabled" : ""}>${adsLeft <= 0 ? "今日已用完" : "观看"}</button></div>
      </div>
      <p class="pj-note">口袋灌篮 · 金币获取（每日活跃任务在主页「每日任务」）</p>`;
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
  (document.getElementById("stage")||document.body).appendChild(wrap);
  render();
}





