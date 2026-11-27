/**
 * ui/settings.js —— 设置中心（pokedunk-v2，移植自旧 pokedunk settings-ui.js）
 * 页签：比赛 / 操作 / 声音 / 外观 / 存档。
 * 「说明」已移到主页导引，由 openSettingsGuide 单独打开。
 * - 比赛：难度/节长/自动换人/防守切换/赛前演出 → localStorage pokedunk.settings（buildGymMatch 读取）
 * - 声音：音乐/音效/解说开关（v2 当前静音适配器，存偏好待接音频）
 * - 存档：重置本机偏好（不影响生涯存档）
 */
import { gameAudio } from "../platform/audio.js?v=699";
import { resetSave } from "../storage.js?v=699";
import { VISIBLE_THEMES, THEME_SWITCH_ENABLED, loadTheme, setTheme } from "./theme.js?v=699";
import { BONDS } from "../systems/build.js?v=699";
import { EGG_TIERS } from "../systems/shop.js?v=699";
import { TYPE_CHART, TYPE_COLORS } from "../../engine/readable/play-core.js?v=699";

const SET_KEY = "pokedunk.settings";

const ONOFF = [["1", "开"], ["0", "关"]];
const ASW = [["auto", "自动"], ["manual", "手动"]];
const INTRO = [["full", "完整"], ["off", "关闭"]]; // 引擎只支持「有/无入场演出」两档
const AUDIO_ROWS = [["音乐", "pokedunk.music", "球场 BGM"], ["音效", "pokedunk.muted", "进球、蜂鸣与碰撞声"], ["解说", "pokedunk.announcer", "比赛语音播报"]];

export function loadSet() {
  try {
    const c = JSON.parse(localStorage.getItem(SET_KEY) || "{}") || {};
    // v2.7：自动换防恢复为默认开启；旧档只迁移一次，之后仍可在设置里手动关闭
    if (!c.__switchAuto) {
      c.autoSwitch = true;
      c.__switchAuto = true;
      delete c.__switchManual;
      try { localStorage.setItem(SET_KEY, JSON.stringify(c)); } catch {}
    }
    return c;
  } catch { return {}; }
}
export function saveSet(patch) {
  const c = loadSet();
  for (const k in patch) c[k] = patch[k];
  try { localStorage.setItem(SET_KEY, JSON.stringify(c)); } catch {}
}
export function audioOn(key) {
  try {
    const k = key === "pokedunk.announcer" ? "pokejam.announcer" : key;
    const v = localStorage.getItem(k);
    return key === "pokedunk.muted" ? v !== "1" : v !== "0";
  } catch { return true; }
}
export function setAudio(key, on) {
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
    field("自动换防", "自动切到对位持球人的防守者；已在防他时保持不动", seg("autoSwitch", ONOFF, c.autoSwitch !== false ? "1" : "0")) +
    field("赛前演出", "开局入场与首发阵容展示", seg("introMode", INTRO, c.introMode || "full")) +
    field("必杀动画", "必杀时播放镜头推近与斜切特写；关闭后不打断比赛画面", seg("specialFx", ONOFF, c.specialFx === false ? "0" : "1")) +
    '<p class="pj-mut">难度由赛程决定：越往后的道馆对手越强</p>' +
    '<p class="pj-mut">比赛偏好即时保存，下次开球生效</p>';
}
function tabFeel(c) {
  const view = Math.round(Math.max(0.8, Math.min(1.2, Number(c.viewScale) || 1)) * 100);
  const stick = Math.round(Math.max(0.9, Math.min(1.4, Number(c.stickScale) || 1)) * 100);
  const row = (label, desc, key, min, max, step, val) =>
    `<div class="pj-block"><div class="pj-flbl">${label}</div><div class="pj-fdesc">${desc}</div>
      <div class="pj-range"><output data-feel-out="${key}">${val}%</output><input type="range" data-feel="${key}" min="${min}" max="${max}" step="${step}" value="${val}"></div></div>`;
  return row("画面大小", "比赛镜头远近；80% 看到更多球场，120% 镜头更近。", "viewScale", 80, 120, 5, view) +
    row("摇杆大小", "摇杆按下时会跳到手指位置，这里只调整摇杆显示尺寸。", "stickScale", 90, 140, 5, stick) +
    '<button class="pj-btn" id="feel-reset" style="margin-top:2px">恢复默认</button>' +
    '<p class="pj-mut">这里与战斗内暂停菜单共用同一套设置，下一场生效。</p>';
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
  return `<div class="pj-block"><div class="pj-flbl">主线与比赛</div>
      <div class="pj-guide-row"><b>主线</b><span>按顺序挑战 8 个道馆，赢了拿徽章并解锁下一个馆</span><small>开始比赛就是推进主线；每个道馆先清 5 关路线，再打馆主。</small></div>
      <div class="pj-guide-row"><b>道馆路线</b><span>野生 1v1 → 路线训练家 5v5 → 补给点 → 野生 1v1 → 馆主 5v5</span><small>路线关卡不推进主线；打赢野生有概率收服；补给点领树果与篮球币。</small></div>
      <div class="pj-guide-row"><b>徽章 / 四天王</b><span>每赢一个馆主得 1 枚徽章，8 枚解锁四天王</span><small>四天王是地区最终战，可重试；击败四天王即为地区冠军，前往下一地区。</small></div>
      <div class="pj-guide-row"><b>赛前对阵</b><span>看双方战力、预计胜率、首发和系别克制</span><small>该页只读，阵容在队伍页调整；点「继续」开球。</small></div>
      <div class="pj-guide-row"><b>赛后结算</b><span>奖励、升级进化、合同与下一场目标</span><small>馆主战失败可整条路线重试；中途退出判负，0 币 0 XP。</small></div>
    </div>
    <div class="pj-block"><div class="pj-flbl">获取与概率</div>
      <div class="pj-guide-row"><b>每日商店</b><span>每天 6 只精灵（至少 1 只稀有，已拥有不刷新）+ 普通蛋 + 高级蛋 + 两种树果</span><small>精灵 300~1800 币，按种族 OVR 定价（新手之路特惠 150 币）；普通蛋 150 币，高级蛋 600 币（广告领取）；普通树果 25 币不限购，高级树果 150 币、每日 3 个；金币刷新货架 500 币。</small></div>
      <div class="pj-guide-row"><b>孵蛋</b><span>普通蛋 1% 传说 / 30% 稀有 / 70% 普通；高级蛋 6% 传说 / 其余必出稀有</span><small>传说为独立判定；普通蛋 20 分钟、到手 Lv.2；高级蛋 2 小时、到手 Lv.5。默认 1 槽，可花 300 币买 1 槽，看广告再送 1 槽，最多 3 槽。</small></div>
      <div class="pj-guide-row"><b>战胜签约</b><span>每场胜利 35% 出现；连续 3 场胜利未出，下一场必出</span><small>出现后 3 只未结缘精灵选 1，按商店原价签约，到手 Lv.5；看广告可免费额外多签 1 只（每日 1 次）。</small></div>
      <div class="pj-guide-row"><b>野生 1v1</b><span>道馆路线中的野生关；赢了野生精灵加入</span><small>2 节 × 60 秒；参赛精灵获得 XP；不消耗每日次数、不计战绩；同种已拥有折算 25 币 + 普通树果。</small></div>
      <div class="pj-guide-row"><b>每日挑战</b><span>60 分 +80 币；90 分随机稀有（每周 1 只）；120 分随机传说（每周 1 只）</span><small>重复或本周已领不再折币；每日首胜 +100 币；挑战分随当日规则变化，只看当日最高。</small></div>
      <div class="pj-guide-row"><b>每日任务</b><span>5 个任务全部完成，额外送高级精灵蛋 ×1</span><small>任务奖励金币；全清奖励每天一次，0 点重置。</small></div>
      <div class="pj-guide-row"><b>七日签到</b><span>第 1 天必得稀有精灵；第 3、7 天必得随机传说</span><small>连续签到累计，断签从第 1 天重新开始；稀有/传说已集齐或队伍/仓库满，改发高级蛋 ×2。</small></div>
      <div class="pj-guide-row"><b>地区传说</b><span>四天王通关解锁本地区 2 只</span><small>先完成 2 选 1，后完成拿剩下 1 只；重复传说折算 300 币。</small></div>
    </div>
    <div class="pj-block"><div class="pj-flbl">概率与公式（公示）</div><div class="pj-fdesc">以下为当前代码实际使用的固定规则；每日挑战的权重每天轮换，以每日挑战页显示为准。</div>
      <div class="pj-guide-row"><b>孵蛋</b><span>普通蛋：传说独立 1%，其余普通 70% / 稀有 30%；高级蛋：传说独立 6%，未出传说时 100% 稀有</span><small>购买/入包时确定精灵，优先未拥有；蛋价 150 / 600 币，孵化 20 分钟 / 2 小时；额外孵蛋槽 800 币。</small></div>
      <div class="pj-guide-row"><b>精灵合同</b><span>每场胜利 35%；连续 3 场胜利未出，下一场必出</span><small>3 只未结缘、非传说精灵选 1；价格按商店原价（OVR 档位 100/150/220/300/400）四舍五入到 5 币。</small></div>
      <div class="pj-guide-row"><b>每日商店</b><span>6 只未拥有精灵；第 2 格 55% 稀有，第 4 格 20%，第 5/6 格各 15%；非新手每日至少 1 只稀有</span><small>低 OVR 出现权重更高（&lt;50:5 / &lt;60:4 / &lt;70:3 / &lt;80:2 / &lt;90:1 / ≥90:0.5）；价格按 OVR 分档。</small></div>
      <div class="pj-guide-row"><b>野球场</b><span>对手等级在路线区间内均匀随机；70% 优先未拥有，再从 OVR 最接近的 10 只中均匀抽 1</span><small>同种已拥有折算 25 币 + 普通树果 ×1；每天 3 次，广告 +1 次。</small></div>
      <div class="pj-guide-row"><b>每日挑战分</b><span>挑战分 = 得分 + 三分×w1 + 扣篮×w2 + 抢断×w3 + 盖帽×w4 + 篮板×w5 + 胜利 10</span><small>w1~w5 由当日规则决定，7 套权重每天轮换；只记当日最高分，排行榜同步记录当天最高分。</small></div>
      <div class="pj-guide-row"><b>升级与训练</b><span>升到下一级所需 XP = 15 + 6×(当前等级−1)；每级随机 1 项属性 +1、自由训练点 +1</span><small>满级 99；训练点重置返还 80%，不退币；购买训练点上限 40 点。</small></div>
      <div class="pj-guide-row"><b>签到与传说保底</b><span>七日签到第 1 天必得稀有，第 3/7 天必得传说</span><small>每日挑战 90/120 分、地区冠军/四天王传说重复时折算 300 币；已集齐或队伍满时按系统兜底。</small></div>
    </div>
    <div class="pj-flbl" style="margin:14px 0 0">养成与广告</div>
    <div class="pj-block">
      <div class="pj-guide-row"><b>等级成长</b><span>每升 1 级：随机属性 +1，自由训练点 +1</span><small>满级共 98 点随机成长 + 98 点自由训练；自由点由你决定加到哪一项。</small></div>
      <div class="pj-guide-row"><b>训练</b><span>自由点升级赠送；购买点最多 40 点</span><small>购买价 30 + 10×已购买点数，买满 40 点共 9,000 币；自由点、返还点优先使用且不扣币；重置返还 80% 训练点，不退币。</small></div>
      <div class="pj-guide-row"><b>树果</b><span>普通 +50 XP / 高级 +800 XP</span><small>普通 25 币不限购；高级 150 币、每日 3 个；可喂队伍或仓库精灵，Lv.99 不可使用。</small></div>
      <div class="pj-guide-row"><b>广告每日次数</b><span>金币 +200（每日 10 次）· 训练 +10 自由点（3 次）· 孵蛋加速 4 小时（3 次）· 立即孵出（2 次）· 合同免费（1 次）· 败局复活（1 次）· 赛后金币 ×3（2 次）</span><small>高级蛋领取、商店刷新、广告孵蛋槽、离线双倍、教练应援、野球场 +1 次另计。</small></div>
      <div class="pj-guide-row"><b>败局复活</b><span>看广告撤销本场失败并重打</span><small>恢复赛前存档，本场不计战绩、不推进主线；每日 1 次，模拟和中途退出不可用。</small></div>
    </div>
    <div class="pj-block"><div class="pj-flbl">孵蛋概率</div><div class="pj-fdesc">购买时确定精灵；普通蛋 1%、高级蛋 6% 独立概率孵出传说，高级蛋必出稀有。未拥有优先。</div>${eggs}
    <div class="pj-guide-row"><b>传说获取</b><span>普通蛋 1% / 高级蛋 6% · 地区冠军/四天王共享 2 选 1 · 战胜后的精灵合同</span><small>每个地区 2 只传说；四天王通关解锁该池，先完成 2 选 1，后完成拿剩下 1 只。重复传说折算 300 币。</small></div></div>
    <div class="pj-block"><div class="pj-flbl">系别克制</div><div class="pj-fdesc">以该属性进攻时：×2 克制 / ×0.5 弱效 / ×0 无效。克制影响抢位推撞成功率，以及地震/冰冻类必杀的击退与减速；不影响投篮基础命中。多属性攻击取最高倍率。</div>
      <div class="type-chart">${typeChartHtml()}</div>
    </div>
    <div class="pj-block"><div class="pj-flbl">队伍羁绊</div><div class="pj-fdesc">首发 5 人满足条件时自动生效。</div>${bonds}</div>
    <p class="pj-mut">更多规则以球队页、训练页和主线页的实际说明为准</p>`;
}
function tabSave() {
  return '<div class="pj-block"><div class="pj-flbl">危险区</div><div class="pj-fdesc">清空难度/时长等本机偏好（不影响生涯存档）</div><button class="pj-btn red" id="pj-set-reset">重置本机设置</button></div>' +
    '<div class="pj-block"><div class="pj-flbl">生涯存档</div><div class="pj-fdesc">单机自动存档（浏览器本地）。清除后从选择本命伙伴重新开始，队伍、精灵、徽章与主线进度都会清空，不可恢复。</div><button class="pj-btn red" id="pj-set-wipe">清除生涯存档</button></div>';
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
  ".set-body .type-txt small{font-size:10px;color:var(--text-dim);line-height:1.4}" +
  ".set-head-tools{display:flex;gap:5px;margin-left:auto}" +
  ".set-head-tools button{padding:5px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.28);color:rgba(255,255,255,.82);font:700 11px var(--sport)}" +
  ".set-head-tools button.on{background:rgba(245,197,66,.18);border-color:var(--gold);color:var(--gold)}" +
  ".set-tune{margin:0 0 12px;padding:11px 12px;border:1px solid rgba(245,197,66,.32);border-radius:10px;background:rgba(245,197,66,.07)}" +
  ".set-tune[hidden]{display:none!important}" +
  ".set-tune .tune-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}" +
  ".set-tune .tune-head b{font:700 12.5px var(--sport);color:var(--gold)}" +
  ".set-tune .tune-head button{width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.24);color:rgba(255,255,255,.7);font:700 13px var(--sport)}" +
  ".set-tune .tune-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;font-size:11.5px}" +
  ".set-tune .tune-row output{font:700 11.5px var(--sport);color:var(--gold);font-variant-numeric:tabular-nums}" +
  ".set-tune input[type=range]{width:100%;margin:7px 0 2px;accent-color:var(--gold)}" +
  ".set-tune .tune-note{font-size:10.5px;color:var(--text-dim);line-height:1.45;margin:2px 0 0}" +
  ".set-tune .tune-reset{margin-top:10px;padding:6px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.24);color:rgba(255,255,255,.75);font:700 11px var(--sport)}" +
  ".set-body .pj-range{display:flex;align-items:center;gap:10px}" +
  ".set-body .pj-range output{flex:0 0 52px;text-align:right;color:var(--gold);font:700 12px var(--sport);font-variant-numeric:tabular-nums}" +
  ".set-body .pj-range input[type=range]{flex:1;min-width:0;accent-color:var(--gold)}";

let tuneKind = null;
function tuneRow(label, key, min, max, step, value, fmt, desc) {
  return `<div class="tune-row"><span>${label}</span><output data-tune-out="${key}">${fmt(value)}</output></div>` +
    `<input type="range" data-tune="${key}" min="${min}" max="${max}" step="${step}" value="${value}">` +
    (desc ? `<p class="tune-note">${desc}</p>` : "");
}
function tuneHtml(kind) {
  const c = loadSet();
  if (kind === "view") {
    const v = Math.round(Math.max(0.8, Math.min(1.2, Number(c.viewScale) || 1)) * 100);
    return `<div class="tune-head"><b>画面大小</b><button type="button" data-tune-close>×</button></div>` +
      tuneRow("比赛视野", "viewScale", 80, 120, 5, v, (x) => `${x}%`, "调大后镜头更近，调小后能看到更多球场；下一场比赛生效。");
  }
  const s = Math.round(Math.max(0.9, Math.min(1.4, Number(c.stickScale) || 1)) * 100);
  const x = Math.round(Math.max(-30, Math.min(30, Number(c.stickX) || 0)));
  const y = Math.round(Math.max(-30, Math.min(30, Number(c.stickY) || 0)));
  const px = (n) => `${n > 0 ? "+" : ""}${n}px`;
  return `<div class="tune-head"><b>摇杆调整</b><button type="button" data-tune-close>×</button></div>` +
    tuneRow("摇杆大小", "stickScale", 90, 140, 5, s, (n) => `${n}%`, "") +
    tuneRow("左右位置", "stickX", -30, 30, 5, x, px, "") +
    tuneRow("上下位置", "stickY", -30, 30, 5, y, px, "调整后下一场比赛生效；默认位置在左下角。") +
    `<button type="button" class="tune-reset" data-tune-reset>恢复默认</button>`;
}
function renderTune(wrap) {
  const box = wrap.querySelector("#pj-set-tune");
  if (!box) return;
  wrap.querySelectorAll("[data-tune-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tuneTab === tuneKind));
  if (!tuneKind) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = tuneHtml(tuneKind);
}

let curTab = "match";

function renderBody(panel) {
  const body = panel.querySelector("#pj-set-body");
  const c = loadSet();
  body.innerHTML = curTab === "match" ? tabMatch(c)
    : curTab === "feel" ? tabFeel(c)
    : curTab === "sound" ? tabSound()
    : curTab === "look" ? tabLook()
    : curTab === "guide" ? tabGuide()
    : tabSave();
}

function ensureSettingsCss() {
  if (document.getElementById("pj-set-style")) return;
  const st = document.createElement("style");
  st.id = "pj-set-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

/** 打开设置面板（挂在 body，关闭即销毁） */
export function openSettings() {
  curTab = "match"; // 每次打开回到「比赛」页签，避免上次停留的页签造成困惑
  tuneKind = null;
  ensureSettingsCss();

  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `
    <div class="pj-page-card"><div class="sub-page pj-page-body set-body">
      <div class="page-head"><button class="back" data-back>‹</button><h2>设置</h2><span class="count">本机偏好</span></div>
      <div class="pj-tabs">
        <button data-tab="match" class="on">比赛</button>
        <button data-tab="feel">操作</button>
        <button data-tab="sound">声音</button>
        <button data-tab="look">外观</button>
        <button data-tab="save">存档</button>
      </div>
      <div id="pj-set-body"></div>
    </div></div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); return; }
    if (e.target.closest("#feel-reset")) {
      saveSet({ viewScale: 1, stickScale: 1 });
      renderBody(wrap);
      return;
    }
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
        else if (f === "autoSwitch") patch[f] = v === "1";
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
      saveSet({ autoSubs: true, autoSwitch: true, introMode: "full" });
      renderBody(wrap);
      return;
    }
    // 清除生涯存档：二次确认后回选伙伴开局
    const wipe = e.target.closest("#pj-set-wipe");
    if (wipe) {
      if (wipe.dataset.arm !== "1") {
        wipe.dataset.arm = "1";
        wipe.textContent = "再点一次确认清空";
        setTimeout(() => { if (!wipe.isConnected) return; wipe.dataset.arm = ""; wipe.textContent = "清除生涯存档"; }, 3000);
        return;
      }
      resetSave();
      location.reload();
    }
  });
  wrap.addEventListener("input", (e) => {
    const r = e.target.closest("input[data-feel]");
    if (!r) return;
    const key = r.dataset.feel;
    const raw = Number(r.value) || 0;
    saveSet({ [key]: raw / 100 });
    const out = wrap.querySelector(`[data-feel-out="${key}"]`);
    if (out) out.textContent = `${raw}%`;
  });
  (document.getElementById("stage")||document.body).appendChild(wrap);
  renderBody(wrap);
}

/** 主页「导引 → 说明」：独立规则页，不再占设置页签 */
export function openSettingsGuide() {
  ensureSettingsCss();
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body set-body">
    <div class="page-head"><button class="back" data-back>‹</button><h2>说明</h2><span class="count">规则与概率</span></div>
    ${tabGuide()}
  </div></div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) wrap.remove();
  });
  (document.getElementById("stage")||document.body).appendChild(wrap);
}
