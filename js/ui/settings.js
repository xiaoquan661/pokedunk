/**
 * ui/settings.js —— 设置中心（pokedunk-v2，移植自旧 pokedunk settings-ui.js）
 * 页签：比赛 / 声音 / 外观 / 说明 / 存档。
 * - 比赛：难度/节长/自动换人/防守切换/赛前演出 → localStorage pokedunk.settings（buildGymMatch 读取）
 * - 声音：音乐/音效/解说开关（v2 当前静音适配器，存偏好待接音频）
 * - 存档：重置本机偏好（不影响生涯存档）
 */
import { gameAudio } from "../platform/audio.js?v=23";
import { VISIBLE_THEMES, THEME_SWITCH_ENABLED, loadTheme, setTheme } from "./theme.js?v=40";
import { BONDS } from "../systems/build.js?v=22";
import { EGG_TIERS } from "../systems/shop.js?v=30";
import { TYPE_CHART, TYPE_COLORS } from "../../engine/readable/play-core.js?v=29";

const SET_KEY = "pokedunk.settings";

const ONOFF = [["1", "开"], ["0", "关"]];
const ASW = [["auto", "自动"], ["manual", "手动"]];
const INTRO = [["full", "完整"], ["off", "关闭"]]; // 引擎只支持「有/无入场演出」两档
const AUDIO_ROWS = [["音乐", "pokedunk.music", "球场 BGM"], ["音效", "pokedunk.muted", "进球、蜂鸣与碰撞声"], ["解说", "pokedunk.announcer", "比赛语音播报"]];

export function loadSet() {
  try {
    const c = JSON.parse(localStorage.getItem(SET_KEY) || "{}") || {};
    // v2.6：防守切换默认改为手动；旧档只迁移一次，之后仍可在设置里选回自动
    if (!c.__switchManual) {
      c.autoSwitch = false;
      c.__switchManual = true;
      try { localStorage.setItem(SET_KEY, JSON.stringify(c)); } catch {}
    }
    return c;
  } catch { return {}; }
}
function saveSet(patch) {
  const c = loadSet();
  for (const k in patch) c[k] = patch[k];
  try { localStorage.setItem(SET_KEY, JSON.stringify(c)); } catch {}
}
function audioOn(key) {
  try {
    const k = key === "pokedunk.announcer" ? "pokejam.announcer" : key;
    const v = localStorage.getItem(k);
    return key === "pokedunk.muted" ? v !== "1" : v !== "0";
  } catch { return true; }
}
function setAudio(key, on) {
  if (key === "pokedunk.music") { gameAudio.setMusicEnabled(on); return; }
  if (key === "pokedunk.muted") { gameAudio.setMuted(!on); return; }
  try { localStorage.setItem(key, on ? "1" : "0"); } catch {}
  if (key === "pokedunk.announcer") {
    // 引擎内部读取的原版键名
    try { localStorage.setItem("pokejam.announcer", on ? "1" : "0"); } catch {}
  }
}

function field(label, desc, segHtml) {
  return `<div class="pj-block"><div class="pj-flbl">${label}</div>${desc ? `<div class="pj-fdesc">${desc}</div>` : ""}${segHtml}</div>`;
}
function seg(name, opts, cur) {
  const btns = opts.map((o) => `<button data-v="${o[0]}" data-f="${name}" class="${String(cur) === String(o[0]) ? "on" : ""}">${o[1]}</button>`).join("");
  return `<div class="pj-seg" data-field="${name}">${btns}</div>`;
}
function tabMatch(c) {
  return field("自动换人", "体力不足时自动轮换替补", seg("autoSubs", ASW, c.autoSubs === false ? "manual" : "auto")) +
    field("防守切换", "防守对象自动跟随或手动指定", seg("autoSwitch", ASW, c.autoSwitch === true ? "auto" : "manual")) +
    field("赛前演出", "开局入场与首发阵容展示", seg("introMode", INTRO, c.introMode || "full")) +
    field("必杀动画", "必杀时播放镜头推近与斜切特写；关闭后不打断比赛画面", seg("specialFx", ONOFF, c.specialFx === false ? "0" : "1")) +
    '<p class="pj-mut">难度由赛程决定：越往后的道馆对手越强</p>' +
    '<p class="pj-mut">比赛偏好即时保存，下次开球生效</p>';
}
function tabLook() {
  const desc = THEME_SWITCH_ENABLED
    ? "体验版：开放全部主题用于对比。"
    : "正式版：复古体育 / 墨黑两套风格。";
  return field("界面风格", "切换局外界面的视觉主题；对局内球场与操作不变", seg("uiTheme", VISIBLE_THEMES, loadTheme())) +
    `<p class="pj-mut">${desc}</p>` +
    '<p class="pj-mut">切换后立即生效，并记住到下一次启动。</p>';
}
function tabSound() {
  let t = "";
  AUDIO_ROWS.forEach((row) => {
    const cur = audioOn(row[1]) ? "1" : "0";
    const btns = ONOFF.map((o) => `<button data-v="${o[0]}" data-f="${row[1]}" class="${cur === o[0] ? "on" : ""}">${o[1]}</button>`).join("");
    t += field(row[0], row[2], `<div class="pj-seg">${btns}</div>`);
  });
  return t + '<p class="pj-mut">音乐与音效即时生效；解说开关在下一场开球时生效</p>';
}
const BOND_EFFECT = {
  fivePos: "全队有效属性 +3%",
  sameType: "该属性成员全属性 +5%",
  evoChain: "该进化链成员全属性 +4%",
  twinTowers: "全队盖帽、篮板 +5%",
  ironWall: "全队防守 +4%",
  runGun: "全队速度 +4%",
  starters: "比赛 XP +10%",
};

const TYPE_ZH = {
  Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰",
  Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力",
  Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精",
};
const typeNames = (list) => (list && list.length ? list.map((t) => TYPE_ZH[t] || t).join(" / ") : "—");
function typeChartHtml() {
  return Object.entries(TYPE_CHART).map(([type, [strong, weak, immune]]) => `<div class="type-row">
    <i style="--tc:${TYPE_COLORS[type] || "#9db0d8"}">${TYPE_ZH[type] || type}</i>
    <div class="type-txt">
      <span>克制 ${typeNames(strong)}</span>
      <small>弱效 ${typeNames(weak)} · 无效 ${typeNames(immune)}</small>
    </div>
  </div>`).join("");
}

function tabGuide() {
  const eggs = Object.values(EGG_TIERS).map((t) => {
    const oddsText = t.odds.普通 === 0
      ? `必出稀有 · 传说 ${t.legendOdds}%`
      : `传说 ${t.legendOdds}% · 其余普通 ${t.odds.普通}% / 稀有 ${t.odds.稀有}%`;
    const hatchText = t.hatchMs >= 3600000 ? Math.round(t.hatchMs / 3600000) + " 小时" : Math.round(t.hatchMs / 60000) + " 分钟";
    return `<div class="pj-guide-row">
    <b>${t.name}</b>
    <span>${oddsText}</span>
    <small>传说为独立判定；孵化 ${hatchText} · ${t.price} 币</small>
  </div>`;
  }).join("");
  const bonds = BONDS.map((b) => `<div class="pj-guide-row">
    <b>${b.name}<i>${b.category}</i></b>
    <span>${BOND_EFFECT[b.id] || ""}</span>
    <small>${b.desc}</small>
  </div>`).join("");
  return `<div class="pj-block"><div class="pj-flbl">赛季与比赛</div>
      <div class="pj-guide-row"><b>常规赛</b><span>9 队单循环，每队 8 场 + 1 轮轮空</span><small>每轮 4 场同时进行；赛后会显示其他球队战况，积分榜前 4 进季后赛。</small></div>
      <div class="pj-guide-row"><b>季后赛</b><span>半决赛 1v4 / 2v3，再打总决赛</span><small>总决赛胜者为赛季总冠军；没进前 4 或季后赛出局，直接进入下一赛季。</small></div>
      <div class="pj-guide-row"><b>徽章 / 四天王</b><span>每赢一个馆主得 1 枚徽章，8 枚解锁四天王</span><small>四天王是独立 1 场挑战，可重试，不参与积分榜、季后赛和总冠军；赛季结束入口关闭。</small></div>
      <div class="pj-guide-row"><b>赛前对阵</b><span>看双方战力、预计胜率、首发和系别克制</span><small>该页只读，阵容在队伍页调整；点「继续」开球。</small></div>
      <div class="pj-guide-row"><b>赛后结算</b><span>奖励、升级进化、其他球队战况和最新积分榜</span><small>常规赛不能重打；中途退出判负，0 币 0 XP。</small></div>
      <div class="pj-guide-row"><b>赛季轮换</b><span>赛季结束进入下一赛季</span><small>重置排名、徽章和季后赛；保留队伍、等级、训练、金币和图鉴。</small></div>
    </div>
    <div class="pj-block"><div class="pj-flbl">孵蛋概率</div><div class="pj-fdesc">购买时确定精灵；普通蛋 1%、高级蛋 3% 独立概率孵出传说。未拥有优先。</div>${eggs}
    <div class="pj-guide-row"><b>传说获取</b><span>普通蛋 1% / 高级蛋 3% · 联赛冠军/四天王共享 2 选 1 · 战胜签约</span><small>每赛季 2 只传说；联赛冠军和四天王共享该池，先完成 2 选 1，后完成拿剩下 1 只。重复传说折算 200 币。</small></div></div>
    <div class="pj-block"><div class="pj-flbl">系别克制</div><div class="pj-fdesc">以该属性进攻时：×2 克制 / ×0.5 弱效 / ×0 无效。克制影响抢位推撞成功率，以及地震/冰冻类必杀的击退与减速；不影响投篮基础命中。多属性攻击取最高倍率。</div>
      <div class="type-chart">${typeChartHtml()}</div>
    </div>
    <div class="pj-block"><div class="pj-flbl">队伍羁绊</div><div class="pj-fdesc">首发 5 人满足条件时自动生效。</div>${bonds}</div>
    <p class="pj-mut">更多规则以球队页、训练页和赛季页的实际说明为准</p>`;
}
function tabSave() {
  return '<div class="pj-block"><div class="pj-flbl">危险区</div><div class="pj-fdesc">清空难度/时长等本机偏好（不影响生涯存档）</div><button class="pj-btn red" id="pj-set-reset">重置本机设置</button></div>' +
    '<div class="pj-block"><div class="pj-flbl">生涯存档</div><div class="pj-fdesc">单机自动存档（浏览器本地）。如需完全重开生涯，请清空浏览器站点数据。</div></div>';
}

const CSS =
  ".set-body .pj-tabs{display:flex;gap:6px;margin:0 0 14px}" +
  ".set-body .pj-tabs button{padding:8px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.24);color:rgba(255,255,255,.75);font:400 12px var(--sport)}" +
  ".set-body .pj-tabs button.on{background:rgba(245,197,66,.16);border-color:var(--gold);color:var(--gold);box-shadow:inset 0 0 0 1px rgba(245,197,66,.35)}" +
  ".set-body .pj-block{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;margin-bottom:10px}" +
  ".set-body .pj-flbl{font-size:13px;font-weight:700;margin-bottom:2px}" +
  ".set-body .pj-fdesc{font-size:11.5px;color:var(--text-dim);margin-bottom:8px}" +
  ".set-body .pj-seg{display:flex;gap:6px;flex-wrap:wrap}" +
  ".set-body .pj-seg button{padding:7px 14px;border-radius:15px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.24);color:rgba(255,255,255,.75);font:400 12px var(--sport)}" +
  ".set-body .pj-seg button.on{background:var(--gold);border-color:#8a6a00;color:#1a2c55;font-weight:700}" +
  ".set-body .pj-btn{padding:8px 16px;border-radius:15px;border:none;font:400 12px var(--sport)}" +
  ".set-body .pj-btn.red{background:#b3261e;color:#fff}" +
  ".set-body .pj-mut{font-size:11.5px;color:var(--text-dim);margin:6px 0 0}" +
  ".set-body .pj-guide-row{display:flex;flex-direction:column;gap:1px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}" +
  ".set-body .pj-guide-row:last-child{border-bottom:none}" +
  ".set-body .pj-guide-row>b{font-size:12px;color:#fff;display:flex;align-items:center;gap:5px}" +
  ".set-body .pj-guide-row>b i{font-style:normal;font-size:9px;color:var(--gold);border:1px solid rgba(245,197,66,.35);border-radius:5px;padding:0 4px}" +
  ".set-body .pj-guide-row>span{font-size:11px;color:var(--gold)}" +
  ".set-body .pj-guide-row>small{font-size:10.5px;color:var(--text-dim);line-height:1.45}" +
  ".set-body .type-chart{display:flex;flex-direction:column;gap:1px;margin-top:2px}" +
  ".set-body .type-row{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)}" +
  ".set-body .type-row:last-child{border-bottom:none}" +
  ".set-body .type-row>i{width:36px;height:20px;flex-shrink:0;display:grid;place-items:center;border-radius:5px;background:color-mix(in srgb,var(--tc,#4f9dff) 24%,#0a1228);border:1px solid color-mix(in srgb,var(--tc,#4f9dff) 55%,#26325a);color:#fff;font-style:normal;font-size:10px;font-weight:700}" +
  ".set-body .type-txt{min-width:0;display:flex;flex-direction:column;gap:1px}" +
  ".set-body .type-txt span{font-size:10.5px;color:#fff;line-height:1.35}" +
  ".set-body .type-txt small{font-size:10px;color:var(--text-dim);line-height:1.4}";

let curTab = "match";

function renderBody(panel) {
  const body = panel.querySelector("#pj-set-body");
  const c = loadSet();
  body.innerHTML = curTab === "match" ? tabMatch(c)
    : curTab === "sound" ? tabSound()
    : curTab === "look" ? tabLook()
    : curTab === "guide" ? tabGuide()
    : tabSave();
}

/** 打开设置面板（挂在 body，关闭即销毁） */
export function openSettings() {
  curTab = "match"; // 每次打开回到「比赛」页签，避免上次停留的页签造成困惑
  if (document.getElementById("pj-set-style")) document.getElementById("pj-set-style").remove();
  const st = document.createElement("style");
  st.id = "pj-set-style";
  st.textContent = CSS;
  document.head.appendChild(st);

  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `
    <div class="pj-page-card"><div class="sub-page pj-page-body set-body">
      <div class="page-head"><button class="back" data-back>‹</button><h2>设置</h2><span class="count">本机偏好</span></div>
      <div class="pj-tabs">
        <button data-tab="match" class="on">比赛</button>
        <button data-tab="sound">声音</button>
        <button data-tab="look">外观</button>
        <button data-tab="guide">说明</button>
        <button data-tab="save">存档</button>
      </div>
      <div id="pj-set-body"></div>
    </div></div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); return; }
    const tb = e.target.closest(".pj-tabs button");
    if (tb) {
      curTab = tb.dataset.tab;
      wrap.querySelectorAll(".pj-tabs button").forEach((x) => x.classList.toggle("on", x === tb));
      renderBody(wrap);
      return;
    }
    const sb = e.target.closest(".pj-seg button");
    if (sb) {
      const f = sb.dataset.f, v = sb.dataset.v;
      if (f.startsWith("pokedunk.")) { setAudio(f, v === "1"); }
      else if (f === "uiTheme") { setTheme(v); }
      else {
        const patch = {};
        if (f === "autoSubs") patch[f] = v !== "manual";
        else if (f === "autoSwitch") patch[f] = v !== "manual";
        else if (f === "specialFx") patch[f] = v === "1";
        else patch[f] = v;
        saveSet(patch);
      }
      sb.parentNode.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === sb));
      return;
    }
    // （难度不可设置——由赛程隐性递增，见 match-screen.diffOfStage）
    const reset = e.target.closest("#pj-set-reset");
    if (reset) {
      if (reset.dataset.arm !== "1") {
        reset.dataset.arm = "1";
        reset.textContent = "再点一次确认重置";
        setTimeout(() => { reset.dataset.arm = ""; reset.textContent = "重置本机设置"; }, 2500);
        return;
      }
      saveSet({ autoSubs: true, autoSwitch: false, introMode: "full" });
      renderBody(wrap);
    }
  });
  document.body.appendChild(wrap);
  renderBody(wrap);
}
