/**
 * app.js —— 应用入口与路由（pokedunk-v2）
 * 场景流：开始界面 →（点击开始）→ 五位置选初始伙伴 → 主界面（图二布局）
 * 存档判定：进入即 loadSave()——有档直接进主界面（单档自动，GDD S8），无档走开局。
 */
import "./systems/evo-rules.js?v=698"; // 先覆盖引擎原进化等级，再加载其余模块
import { loadSave, createSave, writeSave, startJourney, addMon, hasDex } from "./storage.js?v=698";
import { renderDex } from "./ui/dex.js?v=698";
import { renderCareer } from "./ui/career.js?v=698";
import { renderShop, renderEgg } from "./ui/shop-egg.js?v=698";
import { openSettings, openSettingsGuide } from "./ui/settings.js?v=698";
import { renderBag } from "./ui/bag.js?v=698";
import { renderTeam } from "./ui/team.js?v=698";
import { renderTrain, focusTrainMon } from "./ui/train.js?v=698";
import { openDetail } from "./ui/detail.js?v=698";
import { buildGymMatch, mountMatch, buildQuickMatch, quickRoster, quickDraftPool, QUICK_LEVELS } from "./journey/match-screen.js?v=698";
import { gameAudio, installAudioUnlock } from "./platform/audio.js?v=698";
import { watchRewardedAd } from "./platform/ads.js?v=698";
import { adLeft, adUse } from "./platform/ad-caps.js?v=698";
import { ensureSeason, currentMatchInfo, myTeamPower, leagueInfo, startNextSeason, FOUR_KINGS_REWARD } from "./journey/season.js?v=698";
import { settleMatchResult, signContract } from "./journey/settle.js?v=698";
import { grassState, settleOffline, offlineGrassPending } from "./systems/grass.js?v=698";
import { showOfflineGrass } from "./ui/offline-grass.js?v=698";
import { buildDailyMatch, settleDaily, dailyPreview } from "./journey/daily.js?v=698";
import { openDaily } from "./ui/daily.js?v=698";
import { openCoachProfile } from "./ui/coach.js?v=698";
import { addRep, bumpRepMission, repInfo, repMissionRows } from "./systems/reputation.js?v=698";
import { submitDailyScore } from "./platform/leaderboard.js?v=698";
import { openAchievements } from "./ui/achv-ui.js?v=698";
import { startTutorial } from "./ui/tutorial.js?v=698";
import { startOnboarding, mountGuide } from "./ui/onboarding.js?v=698";
import { openBadgeDetail, playBadgeGrant } from "./ui/badges.js?v=698";
import { openEarn, openDailyTasks, bumpDaily, signInfo, dailyClaimable } from "./ui/earn.js?v=698";
import { ACHV } from "./systems/achv.js?v=698";
import { eggList } from "./systems/egg.js?v=698";
import { ensureLineupSlots, monPower, mainOVR, bondMultipliers, rarityOf, RARITY_COLOR, starterIds } from "./systems/build.js?v=698";
import { playEvolve, playAcquire } from "./ui/anim.js?v=698";
import { ICON } from "./ui/icons.js?v=698";
import { LINE_ICON } from "./ui/menu-line-icons.js?v=698";
import { pendingLegend } from "./journey/legend.js?v=698";
import { syncAcquireLevel } from "./systems/acquire.js?v=698";
import { openLegendPicker } from "./ui/legend.js?v=698";
import { openChampionCeremony } from "./ui/champion.js?v=698";
import { openMainQuest } from "./ui/main-quest.js?v=698";
import { openLeaguePage } from "./ui/league.js?v=698";
import { buildLeagueMatch, recordLeagueResult, hasLeagueUnlocked } from "./journey/league.js?v=698";
import { openGymRoute } from "./ui/gym-route.js?v=698";
import { ROUTE_STEPS, routeState, buildRouteWild, buildRouteMinor, recordRouteWild, recordRouteMinor, claimRouteRest } from "./journey/gym-route.js?v=698";
import { regionOf, REGIONS, badgeCountOf } from "./journey/regions.js?v=698";
import { randomNickname, sanitizeNickname } from "./systems/profile.js?v=698";
import { openWild } from "./ui/wild.js?v=698";
import {
  getPokemon,
  calcOVR,
  MatchEngine,
  Renderer,
  demoMatch,
  attractLoop,
  preloadSprites,
  pickTeamRoster,
  versusTeam,
  TYPE_COLORS,
  TYPE_CHART,
  COURT_STYLES,
  defaultCourtStyle,
  LEAGUE_GYMS,
} from "../engine/readable/play-core.js?v=698";

const app = document.getElementById("app");
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const TYPE_ZH = { Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰", Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力", Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精" };
/** 关都八馆馆主（原作姓名） */
const GYM_LEADER_CN = ["小刚", "小霞", "马志士", "莉佳", "阿桔", "娜姿", "夏伯", "坂木"];

/** 更新公告：版本号变化后主轴按钮出现红点，并自动弹一次；文案直接改这里 */
const NOTICE_VERSION = "s73-2026-11-26";
/** 公告日期跟随设备当天日期，避免下次更新忘记改 */
const NOTICE_DATE = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();
const NOTICE_KEY = "pokedunk.noticeRead";
const NOTICE_ITEMS = [
  ["主线改版：赛季已移除", "「开始比赛」现在直接推进主线：按顺序挑战 8 个道馆，每个道馆先清 5 关路线再打馆主；赢了拿徽章并解锁下一馆。8 徽章后挑战四天王，通关即地区冠军，再前往下一地区。原 9 队联赛、积分榜、轮空和季后赛已全部移除。战斗机制与数值不变。"],
  ["野球场入口隐藏", "主页不再显示「野球场1v1」独立入口；野生 1v1 保留在道馆路线第 1、4 关，主线页「捕捉」也可进入。"],
  ["联赛残留清理", "主线存档升级到 v4：旧档自动保留徽章、四天王、冠军与战绩，清掉赛程、积分榜、轮空、季后赛等联赛字段；徽章页不再按赛季分页。现在只剩一条主线：打馆 → 徽章 → 四天王 → 地区冠军 → 下一地区。"],
  ["草地与比赛互斥", "首发精灵拖上草地时会先弹窗确认，确认后自动退出首发；草地中的精灵也不能进入首发或参加比赛。老档里已在草地的首发会自动退出首发。"],
  ["徽章球探已移除", "第 4、8 枚徽章的免费 3 选 1 已删除；徽章页只保留 8 枚解锁四天王。获取精灵仍由商店、孵蛋、赛后合同、每日挑战、签到与地区传说提供。"],
  ["合同出现率下调", "战胜后的精灵合同改为每场 35%，连续 3 场胜利未出则下一场必出；仍是 3 选 1、原价签约、到手 Lv.5，看广告可免费多签 1 只。"],
  ["升级结算按精灵汇总", "赛后升级不再一级一级弹窗：每只精灵合并为一条，直接显示「雷丘 Lv.18 → Lv.20，升了 2 级」和累计成长；草地离线结算同样按精灵汇总。"],
  ["进化形态到手等级", "直接获得的二阶/三阶精灵会按形态门槛抬到 Lv15 / Lv25 / Lv30，并补发对应等级的随机成长和自由训练点，不再出现二阶精灵还是一级的情况。"],
  ["长时间挂机更稳", "主页动态背景降到约 30fps、切到后台自动暂停，并停止累积无用的比赛事件；连续玩或长时间挂机时，低端机不容易发热卡顿。"],
  ["能力差异强化", "投篮现在同时决定完美窗口和完美命中；防守贴防、控球持球速度的作用也拉开，高数值在手动操作和模拟里都更明显。"],
  ["快速比赛上线", "主页九宫格新增「快速比赛」：自由选择 8 道馆或四天王，三档难度；2 节 × 2 分钟短局，开打前临时选秀 5 人（五位置各 1 只），与外面存档完全隔离；不计战绩、不发奖励、不消耗次数。"],
  ["手动进化", "精灵达到进化等级后不再自动进化，详情页会出现「进化」按钮，由你确认后播放进化演出；等级与训练点全部保留。"],
  ["进化门槛上调", "三段进化改为 Lv15 / Lv30，两段进化 Lv25；商店、孵蛋、合同直接获得的进化形态也同步抬到对应最低等级。"],
  ["成就奖励上线", "成就扩到 33 项，覆盖道馆、养成、图鉴、对战、签到与每日挑战；每项解锁后可在成就页手动领取金币（50–400）或道具，支持一键领取。"],
  ["升级更快", "精灵升级经验需求再降 40%（Lv2 只需 15 XP，之后每级 +6）；比赛胜利经验翻倍，草地收益也提升到 2 经验/分钟。"],
  ["看广告金币不限次数", "每日任务页的「看广告得 +100 币」取消每日 5 次限制，可重复观看。"],
  ["签到首日送稀有", "每天上线签到一次，连续 7 天一轮；第 1 天必得随机稀有精灵，第 3 天和第 7 天必得随机传说精灵。断签从第 1 天重新开始。"],
  ["孵蛋更便宜、更快", "普通蛋 50 币 / 20 分钟，高级蛋 160 币 / 2 小时；高级蛋必出稀有，传说概率 6%。第二槽 300 币，普通蛋到手 Lv.2，高级蛋 Lv.5。"],
  ["训练更自由", "每升 1 级获得 1 点自由训练，想加哪项由你决定；购买训练 10 + 3×已购买点数，买满 40 点 2,740 币。"],
  ["每日商店扩容", "每日货架精灵从 2 只增加到 4 只，新增位置以普通档为主；每天至少 1 只稀有（OVR≥70）。"],
  ["商店不刷已拥有", "每日货架只出现尚未结缘的精灵；购买后该格从货架移除，不会重复占用位置。"],
  ["战胜签约价格调整", "合同统一按商店原价出售，不再打折；3 只里选 1 只，到手 Lv.5；看广告可免费额外多签 1 只。"],
  ["徽章页保留四天王", "集齐 8 枚徽章后，仍可直接在徽章页挑战四天王。"],
  ["每日奖励更丰富", "每日挑战 90 分给随机稀有精灵（每周 1 只），120 分给传说；每日任务全部完成额外送高级精灵蛋。"],
  ["广告福利加强", "金币广告 +100；训练广告自由点 +5；孵蛋可加速 2 小时或立即完成；输掉比赛可看广告撤销败局重打。"],
  ["商店与孵蛋扩容", "每日商店精灵格 4 → 6；普通蛋每天可买 3 个、高级蛋每天可领 2 个（各看广告）。"],
  ["战斗掉落道具", "每赢一场比赛掉落 1 件道具：力量/速度/技巧/防守/篮板药剂，或孵蛋加速券（孵化时间减半）。道具在背包查看，药剂在培养页使用，加速券在孵蛋页使用。"],
  ["合同出现率", "战胜后的精灵合同按固定概率出现，连续多场未出后触发保底。"],
  ["新增培养页", "主页新增「培养」：草地挂机升级 + 培养强化加点与药剂。精灵详情页不再显示加点，统一到培养页操作。"],
  ["训练草地挂机", "培养页「草地」tab：把拥有的精灵直接拖上草坪挂机，每分钟 2 经验、离线也持续累积，没有上限；拖出草地即收回。"],
  ["树果与赛后奖励", "赛后奖励改为金币 + 树果，胜利金币减半；普通树果 12 币 / +50 XP 不限购；高级树果 60 币 / +800 XP，每日限购 3 个。"],
  ["体验修复", "比分条改为转播式布局；赛前首发取消卡片外框；修复部分手机顶部按钮被状态栏遮挡。"],
  ["奖励精简", "调整了部分奖励结构，减少了重复发放的金币和道具；收集类奖励改为纪念章、徽章等展示内容。"],
  ["广告收益提升", "提高了看广告获得的金币、训练点、孵蛋加速、教练声望和赛后金币收益。"],
  ["成就金币下调", "下调了成就的金币奖励，道具奖励保持不变。"],
  ["删除新手任务", "移除了获取金币入口里的新手任务，保留看广告和主页每日任务。"],
  ["战斗差异拉开", "拉开了不同属性在投篮、篮板、体力、速度、控球和传球上的表现差距。"],
  ["体力与冲刺调整", "高耐力球员冲刺更持久、耗体更低；速度会影响冲刺加成；体力耗尽后的惩罚更明显。"],
  ["速度/控球/传球差异", "低速、低控球、低传球的球员会更吃亏，高属性球员的跑动和出球优势更明显。"],
  ["教练声望与离线收益", "教练声望和离线收益接入局外成长；离线一段时间后会先弹出收益，可直接收取或看广告加倍。"],
  ["主页顶部栏整理", "重新排布金币、教练等级、地区徽章和指引/公告入口，修复窄屏溢出与红点常亮。"],
];
/** 更新日志：按日期分组，默认折叠 */
const NOTICE_LOG = [
  ["2026-11-25", "", [
    ["奖励精简", "减少了重复发放的金币和道具，收集类奖励改为纪念章、徽章等展示内容。"],
    ["广告收益提升", "提高了看广告获得的金币、训练点、孵蛋加速、教练声望和赛后金币收益。"],
    ["战斗差异", "拉开不同属性在投篮、篮板、体力、冲刺、速度、控球和传球上的表现差距。"],
    ["局外成长与界面", "教练声望、离线收益和世代篇章接入局外成长；主页顶部入口重新排布。"],
    ["经济重平衡", "精灵 300–1800 币、普通蛋 150、高级蛋 600、孵蛋槽 800、金币刷新货架 500；训练与树果同步涨价，比赛金币提高。看广告每日限 10 次（每次 200 币）。"],
  ]],
  ["2026-11-24", "", [
    ["野球场1v1", "新增半场 1v1 野球场，赢下后可获得野生精灵，每日次数可用广告增加。"],
    ["合同与徽章", "调整了合同出现率和保底；移除了徽章页的免费球探。"],
    ["草地与比赛", "首发上草地需要确认，草地中的精灵不能参加比赛；离线收益改为上线先结算。"],
  ]],
  ["2026-11-19", "", [
    ["能力差异强化", "拉开了投篮、贴防和持球速度在比赛里的作用。"],
    ["快速比赛与手动进化", "新增快速比赛；进化改为达到等级后由玩家手动确认。"],
    ["升级与广告", "下调了升级经验需求；调整了金币广告和训练广告的收益。"],
    ["签到与孵蛋", "新增签到；调整孵蛋、商店和赛后奖励。"],
  ]],
  ["2026-11-12", "", [
    ["基础系统", "建立了道馆主线、每日挑战、图鉴里程碑、成就和排行榜等基础循环。"],
    ["经济与进化", "确定了商店、合同、进化等级和比赛奖励的基本规则。"],
  ]],
];

/** 首发人数：比赛要求 5 人，不足时引导玩家先组队 */
const lineupSize = (save) => starterIds(save).filter((id) => save.mons[id]).length;
const hasFullLineup = (save) => lineupSize(save) >= 5;

/* ================= 新手之路：短教程 → 买精灵 → 队伍配置 → 第一场比赛 ================= */
const newbieActive = (save) => !!(save?.newbie && !save.newbie.done);

function newbieStep(save) {
  const nb = save?.newbie;
  if (!nb || nb.done) return 0;
  if (!nb.tutorialDone) return 1;
  if ((nb.shopBuys || 0) < 2) return 2;
  if (!nb.teamDone) return 3;
  return 4;
}

function newbieStepText(save) {
  const step = newbieStep(save);
  if (step === 1) return "第 1 步 · 完成约 2 分钟教程";
  if (step === 2) return "第 2 步 · 商店买两只精灵";
  if (step === 3) return "第 3 步 · 把新伙伴拖进首发";
  return "第 4 步 · 开始第一场比赛";
}

/** 买到的新伙伴进入首发后，记录队伍配置完成 */
function syncNewbieTeam(save) {
  const nb = save?.newbie;
  if (!nb || nb.done || nb.teamDone || !nb.lastBuyId) return false;
  if (!starterIds(save).includes(Number(nb.lastBuyId))) return false;
  nb.teamDone = true;
  writeSave(save);
  return true;
}

/** 打完第一场正式比赛即视为走完新手之路：顶部入口彻底隐藏（不管从哪个入口进的比赛） */
function syncNewbieDone(save) {
  const nb = save?.newbie;
  if (!nb || nb.done) return false;
  const played = (save.stats?.w || 0) + (save.stats?.l || 0);
  if (!nb.tutorialDone || (nb.shopBuys || 0) < 2 || !nb.teamDone || lineupSize(save) < 5 || played < 1) return false;
  nb.done = true;
  // 新手之路结束：确保完整的主页界面导引从第一步开始
  save.guide = { v: 1, step: 0, done: false };
  save.guideV2 = 1;
  writeSave(save);
  return true;
}

function grantTutorialGift(save) {
  const s = loadSave() || save;
  s.newbie ||= { v: 1, tutorialDone: false, giftDone: false, shopBuys: 0, shopPrompted: false, done: false };
  const got = [];
  let missing = 0;
  // 固定送两只：杰尼龟 + 腕力；若本命撞了其中之一，用备用伙伴补位，保证仍是两只
  const GIFT_DEX = [7, 66];
  const FALLBACK = [25, 133, 1, 4];
  const grant = (dex) => {
    const st = STARTERS.find((x) => x.dex === dex) || { dex, pos: "SF" };
    const r = addMon(s, dex, { from: "tutorial" });
    if (!r.ok) return false;
    const m = s.mons[r.id];
    if (m) m.pos = st.pos;
    got.push(dex);
    return true;
  };
  for (const dex of GIFT_DEX) {
    if (hasDex(s, dex)) {
      const alt = FALLBACK.find((d) => !hasDex(s, d));
      if (!alt || !grant(alt)) missing++;
    } else if (!grant(dex)) {
      missing++;
    }
  }
  if (missing) s.coins += missing * 200;
  s.coins += 200;
  ensureLineupSlots(s);
  s.newbie.tutorialDone = true;
  s.newbie.giftDone = true;
  s.newbie.shopBuys = 0;
  s.newbie.teamDone = false;
  delete s.newbie.lastBuyId;
  writeSave(s);
  if (!got.length) return { text: "新手补给 +200 篮球币 · 去商店挑两只新伙伴", got: [] };
  return { text: "新伙伴加入 · 新手补给 +200 篮球币", got };
}

function startNewbieFirstMatch(save) {
  const cur = loadSave() || save;
  if (lineupSize(cur) < 5) return showHome(cur);
  const nb = cur.newbie;
  if (nb && !nb.done && ((nb.shopBuys || 0) < 2 || !nb.teamDone)) { openNewbieQuest(cur); return; }
  cur.newbie ||= { v: 1, tutorialDone: true, giftDone: true, shopBuys: 2, teamDone: true, done: false };
  cur.newbie.done = true;
  cur.guide = { v: 1, step: 0, done: false };
  cur.guideV2 = 1;
  writeSave(cur);
  startMatchNow(cur);
}

function startNewbieTutorial(save) {
  const s = loadSave() || save;
  s.newbie ||= { v: 1, tutorialDone: false, giftDone: false, shopBuys: 0, shopPrompted: false, done: false };
  writeSave(s);
  startTutorial(app, s, {
    onDone: () => grantTutorialGift(s),
    // 中途退出按「跳过教程」处理：直接补首发并标记完成，避免新手之路卡在教程步骤
    onExit: () => {
      const f = loadSave() || s;
      grantTutorialGift(f);
      showHome(loadSave() || f);
    },
    onContinue: () => {
      const f = loadSave() || s;
      showHome(f);
      setTimeout(() => showSub(renderShop, loadSave() || f), 80);
    },
    onStartMatch: () => startNewbieFirstMatch(loadSave() || s),
  });
}

function openNewbieQuest(save) {
  const s = loadSave() || save;
  const nb = s.newbie;
  if (!nb || nb.done) return showHome(s);
  const step = newbieStep(s);
  const lineup = lineupSize(s);
  const row = (ok, title, desc) => `<div class="nbq-row${ok ? " ok" : ""}"><i>${ok ? "✓" : ""}</i><div><b>${title}</b><small>${desc}</small></div></div>`;
  const actions = {
    1: ["去操作教程", () => { wrap.remove(); startNewbieTutorial(s); }],
    2: s.coins < 100
      ? ["先看广告换金币", () => { wrap.remove(); openEarn(loadSave() || s); }]
      : ["去商店买精灵", () => { wrap.remove(); showSub(renderShop, loadSave() || s); }],
    3: ["去调整队伍", () => { wrap.remove(); showTeam(loadSave() || s); }],
    4: ["开始第一场比赛", () => { wrap.remove(); startNewbieFirstMatch(loadSave() || s); }],
  };
  if (!document.getElementById("nbq-style")) {
    const st = document.createElement("style");
    st.id = "nbq-style";
    st.textContent =
      ".nbq-row{display:flex;align-items:flex-start;gap:8px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.08)}" +
      ".nbq-row:last-of-type{border-bottom:none}" +
      ".nbq-row i{flex:0 0 16px;height:16px;margin-top:1px;border:1px solid #3a3a3a;border-radius:50%;font-style:normal;font-size:10px;line-height:15px;text-align:center;color:#101010}" +
      ".nbq-row.ok i{background:#b8e63c;border-color:#b8e63c}" +
      ".nbq-row b{display:block;font-size:12.5px;color:#f2f2f2}" +
      ".nbq-row small{display:block;margin-top:1px;font-size:11px;color:#9a9a9a;line-height:1.45}" +
      'html[data-ui-theme="retro"] .nbq-row{border-bottom-color:var(--r-line,#b9ad92)}' +
      'html[data-ui-theme="retro"] .nbq-row i{border-color:var(--r-line,#b9ad92);color:#fff8e8}' +
      'html[data-ui-theme="retro"] .nbq-row.ok i{background:#1f5c3a;border-color:#1f5c3a;color:#f4ead2}' +
      'html[data-ui-theme="retro"] .nbq-row b{color:#1c241e}' +
      'html[data-ui-theme="retro"] .nbq-row small{color:#575245}';
    document.head.appendChild(st);
  }
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body">
    <div class="page-head"><button class="back" data-back>‹</button><h2>新手之路</h2><span class="count">${lineup}/5 首发</span></div>
    <p class="page-sub">完成教程后去商店买两只新伙伴，把他们拖进首发，再开始第一场比赛。</p>
    <div class="pk-panel" style="padding:4px 12px">
      ${row(!!nb.tutorialDone, "完成操作教程", "移动、传球、上篮、扣篮、空接、投篮、抢断、盖帽，约 2 分钟")}
      ${row((nb.shopBuys || 0) >= 2, "商店买两只精灵", (nb.shopBuys || 0) >= 2 ? "已买到两只新伙伴" : `新手货架特惠 150 币一只 · 已买 ${nb.shopBuys || 0}/2`)}
      ${row(!!nb.teamDone, "把新伙伴放进首发", nb.teamDone ? "首发已调整" : "去队伍页，把新伙伴拖进首发槽")}
      ${row(!!nb.teamDone && lineup >= 5, "开始第一场比赛", lineup >= 5 ? `首发 ${lineup}/5 已就位` : "首发不足 5 人")}
    </div>
    <button class="pk-btn-gold" id="nbq-go" style="width:100%;padding:12px;margin-top:12px">${actions[step][0]}</button>
    ${step === 1 ? '<button class="pk-btn-gold pm-ghost" id="nbq-skip" style="width:100%;padding:10px;margin-top:8px">跳过教程，直接领首发</button>' : ""}
    <p class="page-sub" style="text-align:center;margin-top:8px">${newbieStepText(s)}</p>
  </div></div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); showHome(loadSave() || s); return; }
    if (e.target.closest("#nbq-go")) actions[step][1]();
    if (e.target.closest("#nbq-skip")) {
      const f = loadSave() || s;
      grantTutorialGift(f);
      wrap.remove();
      openNewbieQuest(loadSave() || f);
    }
  });
  (document.getElementById("stage")||document.body).appendChild(wrap);
}

function ensureLineupGateCss() {
  if (document.getElementById("lg-gate-style")) return;
  const st = document.createElement("style");
  st.id = "lg-gate-style";
  st.textContent =
    ".lineup-gate{position:fixed;inset:0;z-index:950;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:22px}" +
    ".lineup-gate .lg-gate-card{width:min(330px,92vw);border:2px solid #b8e63c;border-radius:4px;background:#0a0a0a;color:#f2f2f2;padding:18px 16px;box-shadow:7px 7px 0 rgba(0,0,0,.6)}" +
    ".lineup-gate h3{margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #b8e63c;font:700 18px var(--sport);color:#b8e63c}" +
    ".lineup-gate p{margin:0 0 14px;font-size:12px;line-height:1.6;color:#d0d0d0}" +
    ".lineup-gate p b{color:#f5c542}" +
    ".lineup-gate .lg-gate-acts{display:flex;gap:7px}" +
    ".lineup-gate .lg-gate-acts button{flex:1;padding:9px 4px;font-size:12px;border:2px solid #b8e63c;border-radius:3px;background:#b8e63c;color:#101010;font:700 12px var(--sport);white-space:nowrap}" +
    ".lineup-gate .lg-gate-newbie{display:block;width:100%;margin-top:8px;padding:10px 6px;border:2px solid #b8e63c;border-radius:3px;background:#b8e63c;color:#101010;font:700 12px var(--sport)}" +
    ".lineup-gate .lg-gate-close{width:100%;margin-top:9px;padding:8px;border:1px solid #3a3a3a;border-radius:3px;background:#121212;color:#bbb;font:700 11px var(--sport)}" +
    'html[data-ui-theme="retro"] .lineup-gate .lg-gate-card{background:#f4ead2;border-color:#1c241e;color:#1c241e;box-shadow:8px 8px 0 rgba(28,36,30,.35)}' +
    'html[data-ui-theme="retro"] .lineup-gate h3{border-bottom-color:#1f5c3a;color:#1c241e}' +
    'html[data-ui-theme="retro"] .lineup-gate p{color:#3a443c}' +
    'html[data-ui-theme="retro"] .lineup-gate p b{color:#b56a16}' +
    'html[data-ui-theme="retro"] .lineup-gate .lg-gate-acts button{background:#1f5c3a;border-color:#1c241e;color:#f4ead2;box-shadow:3px 3px 0 rgba(28,36,30,.3)}' +
    'html[data-ui-theme="retro"] .lineup-gate .lg-gate-newbie{background:#1f5c3a;border-color:#1c241e;color:#f4ead2;box-shadow:3px 3px 0 rgba(28,36,30,.3)}' +
    'html[data-ui-theme="retro"] .lineup-gate .lg-gate-close{background:#fff8e8;border-color:#b9ad92;color:#575245}';
  document.head.appendChild(st);
}

function ensureGuideMenuCss() {
  if (document.getElementById("guide-menu-style")) return;
  const st = document.createElement("style");
  st.id = "guide-menu-style";
  st.textContent =
    ".guide-menu .guide-opt{display:flex;flex-direction:column;align-items:flex-start;gap:3px;width:100%;padding:14px;margin-bottom:10px;text-align:left;border:2px solid #b8e63c;border-radius:4px;background:#121212;color:#f2f2f2;cursor:pointer;font-family:inherit}" +
    ".guide-menu .guide-opt b{font:700 14px var(--sport);color:#b8e63c}" +
    ".guide-menu .guide-opt small{font-size:11px;line-height:1.5;color:#bdbdbd}" +
    'html[data-ui-theme="retro"] .guide-menu .guide-opt{background:#fff8e8;border-color:#1c241e;color:#1c241e;box-shadow:3px 3px 0 rgba(28,36,30,.2)}' +
    'html[data-ui-theme="retro"] .guide-menu .guide-opt b{color:#1f5c3a}' +
    'html[data-ui-theme="retro"] .guide-menu .guide-opt small{color:#4a4436}';
  document.head.appendChild(st);
}

/** 主页「导引」：界面指引 / 操作教程 / 说明 */
function openGuideMenu(save) {
  ensureGuideMenuCss();
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body guide-menu">
    <div class="page-head"><button class="back" data-back>‹</button><h2>导引</h2></div>
    <p class="page-sub">需要帮忙时，可以重看界面指引，或进入练习赛学习操作。</p>
    <button class="guide-opt" data-guide-walk>
      <b>界面指引</b>
      <small>重看主界面 → 主线 → 赛前 → 结算的流程说明</small>
    </button>
    <button class="guide-opt" data-guide-tut>
      <b>操作教程</b>
      <small>进入练习赛，学习移动、传球、上篮、扣篮、空接、投篮、抢断和盖帽，约 2 分钟</small>
    </button>
    <button class="guide-opt" data-guide-info>
      <b>说明</b>
      <small>查看主线、比赛、获取、孵蛋、概率与养成的完整规则</small>
    </button>
  </div></div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); return; }
    if (e.target.closest("[data-guide-walk]")) {
      const s = loadSave() || save;
      s.guide = { v: 1, step: 0, done: false };
      writeSave(s);
      wrap.remove();
      showHome(s);
      return;
    }
    if (e.target.closest("[data-guide-tut]")) {
      wrap.remove();
      startTutorial(app, loadSave() || save, { onExit: () => showHome(loadSave() || save) });
      return;
    }
    if (e.target.closest("[data-guide-info]")) {
      wrap.remove();
      openSettingsGuide();
    }
  });
  (document.getElementById("stage")||document.body).appendChild(wrap);
}

/** 四天王挑战入口（主线页 / 徽章页共用）：集齐 8 徽章即可随时挑战，仅校验首发人数 */
function startElite(save) {
  const f = loadSave() || save;
  const s = f.journey?.season;
  const badgeCount = (s?.badges || []).filter((b) => b !== "champion").length;
  if (!s || badgeCount < 8 || s.fourKings?.cleared) return false;
  if (!hasFullLineup(f)) { openLineupGate(f); return false; }
  showMatch(f, "elite");
  return true;
}

/** 道馆路线页：野生 → 小人物球队 → 馆主 */
function leaguePageOpts(f) {
  return {
    onBack: () => switchTab("adventure"),
    onPlay: () => startLeagueBattle(loadSave() || f, false),
    onWatch: () => startLeagueBattle(loadSave() || f, true),
  };
}

function startLeagueBattle(save, spectate = false) {
  const f = loadSave() || save;
  if (!hasLeagueUnlocked(f)) { openTournamentTab(); return; }
  if (!hasFullLineup(f)) { openLineupGate(f); return; }
  const cfg = buildLeagueMatch(f);
  if (!cfg) { openTournamentTab("当前没有可进行的联赛比赛"); return; }
  const info = cfg.info;
  const mountCfg = spectate
    ? { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } }
    : cfg;
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, mountCfg, gameAudio, (engine, c, quit) => {
    const g = loadSave() || f;
    gameAudio.setTrack("menu");
    if (quit) {
      showHome(g);
      openTournamentTab("中途退出，本轮未计入联赛战绩");
      return;
    }
    const my = Number(engine?.score?.[0]) || 0;
    const opp = Number(engine?.score?.[1]) || 0;
    const won = my > opp;
    const r = recordLeagueResult(g, { won, myScore: my, oppScore: opp, sim: spectate, spectate });
    writeSave(g);
    showLeagueResult(g, { my, opp, won, spectate, info, ended, reward: r.reward, matchReward: r.matchReward });
  }, spectate ? { spectator: true, startingFive: false } : undefined);
}

function showLeagueResult(save, { my, opp, won, spectate, info, ended, reward, matchReward }) {
  const page = el(`<div class="sub-page screen-match result-screen"></div>`);
  app.replaceChildren(page);
  const oppName = info?.gym?.name || "对手";
  page.innerHTML = `
    <div class="rs-card ${won ? "win" : "lose"}">
      <span class="rs-kicker">联盟邀请赛${info?.smallName ? ` · ${escHtml(info.smallName)}` : ""}${spectate ? " · 观战" : ""}</span>
      <h2 class="rs-title">${won ? "胜 利" : "惜 败"}</h2>
      <p class="rs-score">ME <b>${my}</b> : <b>${opp}</b> ${escHtml(oppName)}</p>
      <div class="res-lines rs-lines">
        ${matchReward ? `<p class="res-line"><span class="res-dot"></span><span>经验 +${matchReward.xp} · 篮球币 +${matchReward.coins}</span></p>` : ""}
        <p class="res-line"><span class="res-dot"></span><span>${ended ? (reward ? escHtml(reward.text) : "联赛结束") : "联赛积分与赛程已更新"}</span></p>
        ${spectate ? `<p class="res-line"><span class="res-dot"></span><span>观战结果按正常胜负计入联赛</span></p>` : ""}
      </div>
      <div class="rs-actions">
        <button class="pk-btn-gold" id="lg-back">返回联赛</button>
        <button class="pk-btn-gold pm-ghost" id="lg-home">回 主 界 面</button>
      </div>
    </div>`;
  page.querySelector("#lg-back").addEventListener("click", () => {
    const g = loadSave() || save;
    showHome(g);
    openTournamentTab();
  });
  page.querySelector("#lg-home").addEventListener("click", () => showHome(loadSave() || save));
}

function openGymRoutePage(save, notice = "") {
  const f = loadSave() || save;
  if (!tabState.root || !tabState.root.isConnected) showHome(f);
  tabState.seasonNotice = notice || "";
  tabState.tab = "adventure";
  renderAdventureRoute(f, notice);
}

function startGymRouteStage(save, step, options = {}) {
  const f = loadSave() || save;
  const cfg = step.kind === "wild" ? buildRouteWild(f, options.monId) : buildRouteMinor(f);
  if (!cfg) { openGymRoutePage(f, "路线进度已变化，请重新进入"); return; }
  const spectate = !!options.spectate;
  const mountCfg = spectate
    ? { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } }
    : cfg;
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, mountCfg, gameAudio, (engine, c, quit) => {
    const g = loadSave() || f;
    const score = engine ? `${engine.score[0]}:${engine.score[1]}` : "";
    let msg;
    let won = false;
    let result = null;
    if (step.kind === "wild") {
      const r = recordRouteWild(g, engine, cfg.routeStage, quit);
      result = r;
      won = !!r.won;
      msg = quit ? "中途离场，路线进度保留" : `野生战${r.won ? "胜利" : "惜败"} ${score} · 经验 +${r.xp || 0}${r.recruit ? " · 已收服" : ""}`;
    } else {
      const r = recordRouteMinor(g, engine, cfg.routeStage, quit);
      result = r;
      won = !!r.won;
      msg = quit ? "中途离场，路线进度保留" : `路线训练家${r.won ? "胜利" : "惜败"} ${score} · 篮球币 +${r.coins} · 经验 +${r.xp}`;
    }
    writeSave(g);
    gameAudio.setTrack("menu");
    if (quit) { showHome(g); openGymRoutePage(g, msg); return; }
    showRouteStageResult(g, { won, score, msg, title: `${step.kind === "wild" ? "野生战" : "路线训练家"}${spectate ? " · 观战" : ""}`, engine, result, kind: step.kind });
  }, spectate ? { spectator: true, startingFive: false } : undefined);
}

/** 路线小关结算页：沿用主结算页的比分/奖励/逐精灵数据，再继续路线 */
function showRouteStageResult(save, { won, score, msg, title, engine, result, kind }) {
  const page = el(`<div class="sub-page screen-match result-screen"></div>`);
  app.replaceChildren(page);
  const xpEvents = (result?.events || []).map((e) => `<p class="res-line">${UP_SVG}<span>${escHtml(e)}</span></p>`).join("");
  const recruitLine = kind === "wild" && result?.recruit
    ? `<p class="res-line res-gold">${ICON.trophy}<span>收服 ${cnMonName(result.recruit.dex)} · Lv.${result.recruit.level}</span></p>`
    : kind === "wild" && result?.dup
      ? `<p class="res-line res-gold"><span class="coin-ico">${COIN_SVG}</span><span>同种已拥有 · 折算 ${result.coins} 币 + 普通树果</span></p>`
      : "";
  page.innerHTML = `
    <div class="rs-card ${won ? "win" : "lose"}">
      <span class="rs-kicker">${title}</span>
      <h2 class="rs-title">${won ? "胜 利" : "惜 败"}</h2>
      <p class="rs-score">${engine ? `${escHtml(engine.teams[0]?.abbr || "ME")} <b>${engine.score[0]}</b> : <b>${engine.score[1]}</b> ${escHtml(engine.teams[1]?.abbr || "OPP")}` : score}</p>
      <div class="res-lines rs-lines">
        <p class="res-line"><span class="res-dot"></span><span>${escHtml(msg)}</span></p>
        <p class="res-line"><span class="res-dot"></span><span>${won ? "路线进度已推进" : "路线进度保留，可再次挑战"}</span></p>
        ${recruitLine}
        ${xpEvents}
        ${engine ? boxScoreHtml(engine) : ""}
      </div>
      <div class="rs-actions">
        <button class="pk-btn-gold" id="route-next">继续路线</button>
        <button class="pk-btn-gold pm-ghost" id="route-home">回 主 界 面</button>
      </div>
    </div>`;
  page.querySelector("#route-next").addEventListener("click", () => {
    const g = loadSave() || save;
    showHome(g);
    openGymRoutePage(g);
  });
  page.querySelector("#route-home").addEventListener("click", () => showHome(loadSave() || save));
}

/** 主线页统一入口：主页主线条、冠军后拦截、开始比赛都走这里 */
function openMainQuestPage(save, notice = "") {
  const f = loadSave() || save;
  openMainQuest(f, {
    notice,
    onBack: () => showHome(loadSave() || f),
    onRoute: () => openGymRoutePage(loadSave() || f),
    onPrep: (kind) => {
      const g = loadSave() || f;
      if (kind === "train") showSub(renderTrain, g);
      else if (kind === "wild") openWild(g, { onBack: () => showHome(loadSave() || g) });
      else if (kind === "team") showTeam(g);
      else if (kind === "shop") showSub(renderShop, g);
      else if (kind === "egg") showSub(renderEgg, g);
      else if (kind === "dex") showDex(g);
    },
    onDex: (dex) => openDetail(dex, null, () => openMainQuestPage(loadSave() || f)),
    onLeague: () => openTournamentTab(),
    onElite: () => { const g = loadSave() || f; if (!hasFullLineup(g)) { openLineupGate(g); return; } startElite(g); },
    onBadges: () => openBadgeDetail(loadSave() || f, {
      onElite: () => startElite(loadSave() || f),
      onQuest: () => openMainQuestPage(loadSave() || f),
    }),
    onStart: (info) => {
      const g = loadSave() || f;
      if (!hasFullLineup(g)) { openLineupGate(g); return; }
      if (info?.kind === "elite") { startElite(g); return; }
      showMatch(g, "league");
    },
    onNext: () => showHome(loadSave() || f),
  });
}

/** 首发不足 5 人：阻止开赛并提供去组队 / 商店 / 孵蛋的入口 */
function openLineupGate(save, opts = {}) {
  const s = loadSave() || save;
  const n = Math.min(5, lineupSize(s));
  ensureLineupGateCss();
  const ov = document.createElement("div");
  ov.className = "lineup-gate";
  ov.innerHTML = `<div class="lg-gate-card" role="dialog" aria-label="首发阵容不足">
    <h3>首发还差 ${5 - n} 人</h3>
    <p>比赛需要 <b>5 名首发</b> 才能开始。当前首发 <b>${n}/5</b>，先把阵容补齐再来开球；空位太多会打不过对手。</p>
    <div class="lg-gate-acts">
      <button class="pk-btn-gold" data-lg-team>去组队</button>
      <button class="pk-btn-gold" data-lg-shop>去商店</button>
      <button class="pk-btn-gold" data-lg-egg>去孵蛋</button>
    </div>
    ${newbieActive(s) ? `<button class="lg-gate-newbie" data-lg-newbie>去「新手之路」快速组队</button>` : ""}
    <button class="lg-gate-close" data-lg-close>稍后再说</button>
  </div>`;
  (document.getElementById("stage")||document.body).appendChild(ov);
  ov.addEventListener("click", (e) => {
    if (e.target === ov || e.target.closest("[data-lg-close]")) { ov.remove(); opts.onClose?.(); return; }
    const leave = () => { ov.remove(); opts.onLeave?.(); };
    if (e.target.closest("[data-lg-team]")) { leave(); showTeam(loadSave() || s); return; }
    if (e.target.closest("[data-lg-shop]")) { leave(); bumpDaily("visit"); showSub(renderShop, loadSave() || s); return; }
    if (e.target.closest("[data-lg-egg]")) { leave(); bumpDaily("visit"); showSub(renderEgg, loadSave() || s); return; }
    if (e.target.closest("[data-lg-newbie]")) { leave(); openNewbieQuest(loadSave() || s); return; }
  });
}

/** 单属性进攻倍率（与引擎 Xt 等价） */
function typeMult(atk, defTypes) {
  const [strong, weak, immune] = TYPE_CHART[atk] || [[], [], []];
  let m = 1;
  for (const d of defTypes || []) {
    if (immune.includes(d)) return 0;
    if (strong.includes(d)) m *= 2;
    else if (weak.includes(d)) m *= 0.5;
  }
  return m;
}

/** 多属性攻击取最高倍率（与引擎 Va 等价），并记录命中的属性用于提示 */
function bestTypeMult(atkTypes, defTypes) {
  let best = { mult: 0, atkType: null, defType: null };
  for (const a of atkTypes || []) {
    let m = 1, hit = null;
    const [strong, weak, immune] = TYPE_CHART[a] || [[], [], []];
    for (const d of defTypes || []) {
      if (immune.includes(d)) { m = 0; hit = d; break; }
      if (strong.includes(d)) { m *= 2; hit = d; }
      else if (weak.includes(d)) { m *= 0.5; hit = hit || d; }
    }
    if (m > best.mult) best = { mult: m, atkType: a, defType: hit || (defTypes || [])[0] || null };
  }
  return best;
}

/** 篮球币图标 */
const COIN_SVG = LINE_ICON.coin;
/** 徽章图标（SVG：银灰奖牌） */
const BADGE_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="9" r="6" fill="#c9d3e8" stroke="#5a6a92" stroke-width="1.5"/><text x="12" y="12" text-anchor="middle" font-size="7" font-weight="bold" fill="#5a6a92" font-family="monospace">★</text><path d="M8 14 L6.5 21 L12 17.5 L17.5 21 L16 14" fill="#c9d3e8" stroke="#5a6a92" stroke-width="1.5"/></svg>`;
/** 观战图标（SVG 眼睛） */

/** 结果页小图标（SVG，统一 14px 描边风格） */
const LOCK_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="flex-shrink:0"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const GIFT_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><rect x="4" y="10" width="16" height="10" rx="2" fill="#f5c542" stroke="#7a5200" stroke-width="1.5"/><path d="M3 7h18v4H3z" fill="#ffe08a" stroke="#7a5200" stroke-width="1.5"/><path d="M12 7v13M12 7c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3" fill="none" stroke="#7a5200" stroke-width="1.5"/></svg>`;
const SIGN_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="flex-shrink:0"><path d="M3 12h4l2-3 3 6 2-3h7" fill="none" stroke="#21d07a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="12" r="1.6" fill="#21d07a"/></svg>`;
const UP_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style="flex-shrink:0"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="#f5c542" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ================= 场景一：开始界面 ================= */
function showStart() {
  app.replaceChildren();
  const sc = el(`
    <div class="screen-start">
      <div class="start-bg"><canvas></canvas></div>
      <div class="start-dim"></div>
      <div class="start-title">
        <h1>口袋灌篮</h1>
        <p>与宝可梦伙伴一起，征服篮球场</p>
        <button class="start-hint">点 击 开 始</button>
      </div>
    </div>`);
  app.append(sc);

  // 背景：demo MatchEngine + 渲染器（与原版 attract 同机制——真实球场动起来）
  const canvas = sc.querySelector("canvas");
  let stop = null;
  (async () => {
    // 预载 demo 两队精灵图后启动渲染循环
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    stop = attractLoopFor(canvas, demo, renderer);
  })();

  let leaving = false;
  sc.querySelector(".start-hint").addEventListener("click", () => {
    if (leaving) return;
    leaving = true;
    stop?.();
    sc.classList.add("is-leaving");
    setTimeout(() => {
      const save = loadSave();
      if (save && save.journey.stage !== "starter") showHome(save);
      else showStarter(save && save.journey.stage === "starter" ? save : createSave());
    }, 640);
  });
}

/**
 * 精简版 attract 循环：仅渲染 demo 比赛画面作背景（无计分条回调）。
 * 注意：这里没有比赛 UI 消费 engine.events / engine.sfx，必须每帧清空，
 * 否则挂机一小时会累积几十万个事件对象，低端机（红米等）会明显卡死。
 * 同时限制到约 30fps，并让 demo 打完后只渲染不再模拟，降低发热与耗电。
 */
function attractLoopFor(canvas, demo, renderer) {
  let stop = false, last = performance.now(), acc = 0;
  const engine = demo;
  const QT = 1 / 60;
  const FRAME = 1000 / 30;
  const input = { mx: 0, my: 0, turbo: false, shoot: false, shootHeld: false, pass: false, steal: false, special: false, swap: false };
  const frame = (now) => {
    if (stop || !canvas.isConnected) return; // 画布已脱离 DOM：立即终止，防止泄漏的渲染循环拖垮 iOS
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; } // 后台不渲染、不模拟
    if (now - last < FRAME - 2) return;           // 约 30fps，减少持续发热
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1e3));
    last = now;
    acc += dt;
    if (engine.phase !== "final") {
      while (acc >= QT) { engine.update(QT, input); acc -= QT; }
    }
    engine.events.length = 0;
    engine.sfx.length = 0;
    renderer.draw(engine, dt);
  };
  renderer.snap(engine);
  requestAnimationFrame(frame);
  return () => { stop = true; };
}

/* ================= 场景二：御三家三选一 ================= */
const STARTERS = [
  { pos: "PG", dex: 7, cn: "杰尼龟", type: "Water" },
  { pos: "SG", dex: 4, cn: "小火龙", type: "Fire" },
  { pos: "SF", dex: 1, cn: "妙蛙种子", type: "Grass" },
  { pos: "PF", dex: 66, cn: "腕力", type: "Fighting" },
  { pos: "C", dex: 74, cn: "小拳石", type: "Rock" },
];
const rarityTag = (dex, size = 10) => {
  const r = rarityOf(dex);
  return `<i data-rar="${r}" style="font-style:normal;font-weight:700;font-size:${size}px;color:${RARITY_COLOR[r]}">${r}</i>`;
};

function showStarter(save) {
  app.replaceChildren();
  let selected = 0;
  let coachNick = randomNickname();
  const sc = el(`
    <div class="screen-starter">
      <div class="starter-bg"><canvas></canvas></div>
      <div class="starter-dim"></div>
      <div class="starter-head">
        <span class="starter-kicker">球风测试 · 选择本命伙伴</span>
        <h2>找到与你合拍的本命</h2>
        <p>按喜欢的打法挑一只 · 位置可在队伍页随时调整</p>
      </div>
      <div class="starter-nick">
        <span>训练师昵称</span>
        <input data-nick-input type="text" maxlength="10" value="${coachNick}" aria-label="训练师昵称" autocomplete="off" spellcheck="false">
        <button type="button" data-nick-roll>随 机</button>
      </div>
      <div class="starter-cards">
        ${STARTERS.map(
          (s, i) => `
        <button class="starter-card pk-panel" data-i="${i}" style="--tc:${TYPE_COLORS[s.type] || "#7ac74c"}">
          <span class="starter-check">✓</span>
          <span class="starter-ovr no-zh">OVR ${calcOVR(s.pos, getPokemon(s.dex).r)} · ${rarityTag(s.dex)}</span>
          <img src="./sprites/${s.dex}.png" alt="${s.cn}" />
          <span class="name">${s.cn}</span>
          <span class="tag no-zh">${s.pos}</span>
        </button>`
        ).join("")}
      </div>
      <div class="starter-actions">
        <button class="pk-btn-gold no-zh" disabled>确 定</button>
        <p class="starter-note">昵称开局后不可更改 · 选好本命后直接进入手把手教程 · 开局赠送 100 篮球币</p>
      </div>
    </div>`);
  app.append(sc);

  // 背景：真实球场 attract（与开始界面同源）
  const canvas = sc.querySelector(".starter-bg canvas");
  (async () => {
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    sc.__stopBg = attractLoopFor(canvas, demo, renderer);
  })();

  const nickInput = sc.querySelector("[data-nick-input]");
  sc.querySelector("[data-nick-roll]")?.addEventListener("click", () => {
    let next = randomNickname();
    for (let i = 0; i < 4 && next === coachNick; i++) next = randomNickname();
    coachNick = next;
    if (nickInput) nickInput.value = coachNick;
  });

  const cards = [...sc.querySelectorAll(".starter-card")];
  const btn = sc.querySelector(".pk-btn-gold");
  cards.forEach((c) =>
    c.addEventListener("click", () => {
      selected = Number(c.dataset.i);
      cards.forEach((x) => x.classList.toggle("sel", x === c));
      btn.disabled = false;
      btn.textContent = `确定 · ${STARTERS[selected].pos} ${STARTERS[selected].cn}`;
    })
  );
  btn.addEventListener("click", () => {
    const finalNick = sanitizeNickname(nickInput?.value) || coachNick || "小智";
    const r = startJourney(save, STARTERS[selected].dex, finalNick, STARTERS[selected].pos);
    if (!r.ok) return;
    save.coach.nick = save.coach.name;
    sc.__stopBg?.();
    save.coins = 100; // 开局启动资金（S42：300→100，避免开局金币过剩、削弱广告动机）
    writeSave(save);
    startNewbieTutorial(save); // 选完本命伙伴 → 直接手把手教程
  });
}

/* ================= 场景三：主界面（参考图二布局：球场背景+资源条+展示卡+菜单） ================= */
let homeBgStop = null; // 当前主页背景渲染循环的停止句柄（换主页前必须停掉旧的，防泄漏）

function openNotice() {
  const row = (title, body) => `<div>
    <b style="font:700 12.5px var(--sport);color:var(--gold,#f5c542)">${title}</b>
    <p style="margin:3px 0 0;font-size:11.5px;line-height:1.6;color:var(--text-dim,#c9c0a8)">${body}</p>
  </div>`;
  const current = NOTICE_ITEMS.slice(-9).reverse();
  const logHtml = NOTICE_LOG.map(([date, _version, items]) => `<details class="notice-log-group">
    <summary><span>${date}</span><i>›</i></summary>
    <div class="nl-items">${items.map(([title, body]) => `<div class="nl-item"><b>${title}</b><p>${body}</p></div>`).join("")}</div>
  </details>`).join("");
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:950;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<style>
    .notice-actions{display:flex;gap:8px;margin-top:12px}
    .notice-actions .pk-btn-gold{flex:1;padding:11px 8px}
    .notice-log{display:flex;flex-direction:column;gap:8px}
    .notice-log-group{border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(0,0,0,.18);overflow:hidden}
    .notice-log-group summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;cursor:pointer;list-style:none;font:700 12px var(--sport);color:var(--gold,#f5c542)}
    .notice-log-group summary::-webkit-details-marker{display:none}
    .notice-log-group summary i{font-style:normal;font-size:15px;line-height:1;color:var(--text-dim,#c9c0a8);transition:transform .16s}
    .notice-log-group[open] summary i{transform:rotate(90deg)}
    .notice-log-group .nl-items{padding:0 12px 10px;display:flex;flex-direction:column;gap:8px}
    .notice-log-group .nl-item b{display:block;font-size:11.5px;color:#fff}
    .notice-log-group .nl-item p{margin:2px 0 0;font-size:10.5px;line-height:1.55;color:var(--text-dim,#c9c0a8)}
  </style>
  <div class="pj-page-card"><div class="sub-page pj-page-body notice-body"></div></div>`;
  const body = wrap.querySelector(".notice-body");
  const render = (mode) => {
    body.innerHTML = mode === "log" ? `
      <div class="page-head"><button class="back" data-log-back>‹</button><h2>更新日志</h2></div>
      <p class="page-sub">按日期折叠 · 点击日期展开</p>
      <div class="notice-log">${logHtml}</div>
      <button class="pk-btn-gold" data-log-back style="width:100%;padding:12px;margin-top:12px">返回本次更新</button>` : `
      <div class="page-head"><button class="back" data-close>‹</button><h2>更新公告</h2></div>
      <p class="page-sub">${NOTICE_DATE} · 本次更新</p>
      <div class="pk-panel" style="padding:10px 12px;display:flex;flex-direction:column;gap:10px">
        ${current.map(([title, text]) => row(title, text)).join("")}
      </div>
      <div class="notice-actions">
        <button class="pk-btn-gold" data-close>知道了</button>
        <button class="pk-btn-gold pm-ghost" data-log-open>更新日志</button>
      </div>`;
  };
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-close]")) { wrap.remove(); return; }
    if (e.target.closest("[data-log-open]")) { render("log"); return; }
    if (e.target.closest("[data-log-back]")) { render("notice"); }
  });
  (document.getElementById("stage") || document.body).appendChild(wrap);
  render("notice");
}

function showLegacyHome(save, justStarted = false) {
  gameAudio.setTrack("menu");
  homeBgStop?.();
  homeBgStop = null;
  // 商店/孵蛋等子页会自己读档并写盘——返回主页时必须取最新存档，否则旧对象会覆盖刚发生的购买/孵化
  save = loadSave() || save;
  syncNewbieTeam(save);
  syncNewbieDone(save);
  app.replaceChildren();
  // 展示精灵：优先「更换」选择的精灵，否则队伍首位
  // 主页展示：首发五人（只读，不再提供「更换」）
  ensureLineupSlots(save);
  const FIVE_POS = ["PG", "SG", "SF", "PF", "C"];
  const fiveSlots = FIVE_POS.map((pos) => ({
    pos,
    id: save.team.find((id) => save.mons[id] && save.assign?.[id] === pos) || null,
  }));
  const season = ensureSeason(save);
  ACHV.refresh(save);
  const achvDone = ACHV.list().filter((x) => x.unlocked).length;

  // —— 每日挑战（入口副标题：今日规则 + 最高分）——
  const daily = dailyPreview(save);
  const sign = signInfo(save);
  const rep = repInfo(save);
  const coachDot = repMissionRows(save).some((m) => m.canClaim);
  const gslots = grassState(save);
  const grassBusy = gslots.some((g) => !g.empty);
  const grassXp = gslots.reduce((s, g) => s + (g.empty ? 0 : g.xp), 0);
  const trainHint = grassBusy ? (grassXp > 0 ? `挂机中 · +${grassXp} XP` : "草地挂机中") : "今日未安排";
  // 九宫格红点：对应页面是否有可领取内容
  const safeDot = (fn) => { try { return !!fn(); } catch { return false; } };
  const dot = {
    achv: safeDot(() => ACHV.list(save).some((x) => x.unlocked && !x.claimed && x.reward)),
    tasks: safeDot(() => dailyClaimable(save)),
    // 图鉴奖励入口暂时隐藏（S92），不再提示可领取，避免红点常亮
    dex: false,
    train: safeDot(() => gslots.some((g) => !g.empty && g.xp > 0)),
    egg: safeDot(() => eggList(save).slots.some((e) => e && e.ready)),
  };
  const dotHtml = (on) => on ? '<i class="dot"></i>' : "";
  const noticeUnread = (() => {
    try { return localStorage.getItem(NOTICE_KEY) !== NOTICE_VERSION; } catch { return false; }
  })();

  const sc = el(`
    <div class="screen-menu">
      <div class="menu">
        <div class="attract"><canvas class="attract-canvas"></canvas><div class="attract-dim"></div></div>
      <style>
        .screen-menu .home-five{width:100%;display:flex;flex-direction:column;gap:6px;padding:9px 10px 10px;border-radius:6px;background:var(--panel,#f4ead2);border:2px solid var(--line,#b9ad92);box-shadow:3px 3px 0 rgba(0,0,0,.22)}
        .screen-menu .hf-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
        .screen-menu .hf-head b{font:700 13px var(--sport);color:var(--text,#1c241e)}
        .screen-menu .hf-head small{font-size:10px;color:var(--text-dim,#575245)}
        .screen-menu .hf-line{display:flex;align-items:flex-end;justify-content:center;min-height:118px;padding:2px 4px 0;box-sizing:border-box}
        .screen-menu .hf-mon{width:102px;height:102px;image-rendering:pixelated;filter:drop-shadow(0 4px 5px rgba(0,0,0,.42));position:relative;flex-shrink:0}
        .screen-menu .hf-line[data-n="2"]{justify-content:space-around}
        .screen-menu .hf-line[data-n="3"]{justify-content:space-between}
        .screen-menu .hf-line[data-n="3"] .hf-mon:nth-child(2){transform:translateY(-12px);z-index:3}
        .screen-menu .hf-line[data-n="4"]{justify-content:space-between}
        .screen-menu .hf-line[data-n="4"] .hf-mon{margin-left:-24px}
        .screen-menu .hf-line[data-n="4"] .hf-mon:first-child{margin-left:0}
        .screen-menu .hf-line[data-n="5"]{justify-content:center}
        .screen-menu .hf-line[data-n="5"] .hf-mon{margin-left:-43px}
        .screen-menu .hf-line[data-n="5"] .hf-mon:first-child{margin-left:0}
        .screen-menu .hf-line[data-n="5"] .hf-mon:nth-child(3){transform:translateY(-12px);z-index:3}
        .screen-menu .newbie-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:9px;width:calc(100% - 24px);margin:6px 12px 0;padding:9px 12px;border:2px solid var(--gold,#f5c542);border-radius:5px;background:linear-gradient(135deg,color-mix(in srgb,var(--gold,#f5c542) 26%,var(--panel,#0f1420)),var(--panel,#0f1420));color:var(--text,#fff);text-align:left;box-shadow:0 4px 14px rgba(0,0,0,.28);box-sizing:border-box}
        .screen-menu .newbie-top .nt-ico{width:28px;height:28px;flex-shrink:0;display:grid;place-items:center;border-radius:4px;background:var(--gold,#f5c542);color:#1c241e}
        .screen-menu .newbie-top .nt-ico svg{width:19px;height:19px}
        .screen-menu .newbie-top .nt-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
        .screen-menu .newbie-top .nt-txt b{font-size:12.5px;color:var(--text,#fff);letter-spacing:.02em}
        .screen-menu .newbie-top .nt-txt b em{font-style:normal;font-size:9.5px;color:var(--gold,#f5c542);margin-left:4px;font-weight:700}
        .screen-menu .newbie-top .nt-txt small{font-size:10px;color:var(--text-dim,#c9c0a8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .screen-menu .newbie-top .nt-arrow{flex-shrink:0;font-size:11px;font-weight:700;color:var(--gold,#f5c542)}
        .screen-menu .top-row{gap:5px;padding-left:10px;padding-right:10px;flex-wrap:nowrap}
        .screen-menu .top-row .coin-chip.coin-btn{padding:4px 4px 4px 9px;gap:5px;flex-shrink:0}
        .screen-menu .top-row .coin-chip.plain{max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .screen-menu .top-row .coach-chip{position:relative;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;cursor:pointer;max-width:150px;min-width:0;padding:4px 8px}
        .screen-menu .top-row .coach-chip.plain{max-width:150px}
        .screen-menu .top-row .coach-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .screen-menu .top-row .coach-chip em{font-style:normal;flex-shrink:0;font:700 9px var(--sport);color:var(--gold)}
        .screen-menu .top-row .coach-chip .dot{position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:#ff5a5a;border:1px solid #0a0a0a}
        .screen-menu .top-row .icon-chip{width:30px;height:30px;padding:0;justify-content:center;gap:0;border-radius:50%;flex-shrink:0}
        .screen-menu .top-row .guide-chip svg,.screen-menu .top-row .settings-chip svg{width:15px;height:15px;display:block}
        .screen-menu .top-row .settings-chip{position:relative;display:inline-flex;align-items:center;flex-shrink:0;border:1px solid var(--line,#b9ad92);background:rgba(0,0,0,.35);color:var(--text,#1c241e);cursor:pointer}
        .screen-menu .notice-chip{position:relative;display:inline-flex;align-items:center;flex-shrink:0;border:1px solid var(--line,#b9ad92);background:rgba(0,0,0,.35);color:var(--text,#1c241e);cursor:pointer}
        .screen-menu .notice-chip svg{width:14px;height:14px;display:block}
        .screen-menu .notice-chip .dot{position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:#ff5a5a;border:1px solid #0a0a0a}
        .screen-menu .home-menu .hm-item.hm-wide{grid-column:1/-1;display:flex;align-items:center;gap:8px;text-align:left}
        .screen-menu .home-menu .hm-item.hm-wide .hm-txt{flex:1;min-width:0}
        .screen-menu .home-menu .hm-item.hm-wide .hm-arrow{font:700 16px var(--sport,sans-serif);color:var(--gold,#f5c542);flex:none}
      </style>
      <div class="top-row">
        <button class="coin-chip coin-btn" id="earn-add" title="获取金币" aria-label="获取金币">${COIN_SVG}<b>${save.coins}</b><span class="coin-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></button>
        <button class="coin-chip plain coach-chip" id="home-coach" type="button" title="教练档案"><span>${save.coach.name}</span><em>Lv.${rep.level}</em>${coachDot ? '<i class="dot"></i>' : ""}</button>
        <div class="spacer"></div>
        <button class="guide-chip icon-chip" id="home-guide" type="button" title="新手指引" aria-label="新手指引">${LINE_ICON.tutorial}</button>
        <button class="notice-chip icon-chip" id="home-notice" type="button" title="更新公告" aria-label="更新公告">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/></svg>
          ${noticeUnread ? '<i class="dot"></i>' : ""}
        </button>
        <button class="settings-chip icon-chip" data-go="settings" type="button" title="设置" aria-label="设置">${LINE_ICON.settings}</button>
      </div>
      ${newbieActive(save) ? `<button class="newbie-top" data-go="newbie">
        <span class="nt-ico">${LINE_ICON.tutorial}</span>
        <span class="nt-txt"><b>新手之路 <em>${newbieStep(save)}/4</em></b><small>${newbieStepText(save)}</small></span>
        <span class="nt-arrow">继续 ›</span>
      </button>` : ""}
      <div class="menu-in">
        <header class="title">
          <h1 class="logo"><span class="logo-poke">口袋</span><span class="logo-jam">灌篮</span></h1>
          <p class="tag">与宝可梦伙伴一起，征服篮球场</p>
        </header>
        <div class="home-five">
          <div class="hf-head"><b>首发阵容</b><small>${fiveSlots.filter((x) => x.id).length}/5 人</small></div>
          <div class="hf-line" data-n="${fiveSlots.filter((x) => x.id).length}">
            ${fiveSlots.filter((x) => x.id).map(({ id }) => {
              const m = save.mons[id];
              const b = getPokemon(m.dex);
              return `<img class="hf-mon" src="./sprites/${m.dex}.png" alt="${b.name}" title="Lv.${m.level} ${b.name}" draggable="false">`;
            }).join("")}
          </div>
        </div>
        <div class="menu-panel home-menu">
          <button class="hm-hero" data-go="match" type="button">
            <span class="hm-ico">${LINE_ICON.ball}</span>
            <span class="hm-txt"><b>开始游戏</b></span>
          </button>
          <button class="hm-sub" data-go="daily">
            <span class="hm-ico">${LINE_ICON.daily}</span>
            <span class="hm-txt"><b>每日挑战</b><small>今日 ${daily.mod.name} · 最高分 ${daily.best || "未挑战"}</small></span>
          </button>
          <div class="hm-grid">
            <button class="hm-item" data-go="achv">
              <span class="hm-ico">${LINE_ICON.trophy}</span>
              <span class="hm-txt"><b>成就</b></span>${dotHtml(dot.achv)}
            </button>
            <button class="hm-item" data-go="tasks">
              <span class="hm-ico">${LINE_ICON.daily}</span>
              <span class="hm-txt"><b>每日任务</b><small style="color:var(--gold)">${sign.signedToday ? "今日已签到" : "签到待领 · 稀有"}</small></span>${dotHtml(dot.tasks)}
            </button>
            <button class="hm-item" data-go="dex">
              <span class="hm-ico">${LINE_ICON.book}</span>
              <span class="hm-txt"><b>图鉴</b></span>${dotHtml(dot.dex)}
            </button>
            <button class="hm-item" data-go="train">
              <span class="hm-ico">${LINE_ICON.pokeball}</span>
              <span class="hm-txt"><b>培养</b><small>${trainHint}</small></span>${dotHtml(dot.train)}
            </button>
            <button class="hm-item" data-go="team">
              <span class="hm-ico">${LINE_ICON.team}</span>
              <span class="hm-txt"><b>队伍</b></span>
            </button>
            <button class="hm-item" data-go="shop">
              <span class="hm-ico">${LINE_ICON.shop}</span>
              <span class="hm-txt"><b>每日商店</b></span>
            </button>
            <button class="hm-item" data-go="egg">
              <span class="hm-ico">${LINE_ICON.egg}</span>
              <span class="hm-txt"><b>孵蛋</b></span>${dotHtml(dot.egg)}
            </button>
            <button class="hm-item" data-go="bag">
              <span class="hm-ico">${LINE_ICON.bag}</span>
              <span class="hm-txt"><b>背包</b></span>
            </button>
            <button class="hm-item" data-go="quick">
              <span class="hm-ico">${LINE_ICON.quick}</span>
              <span class="hm-txt"><b>快速比赛</b><small>自由对战 · 不计战绩</small></span>
            </button>
            <button class="hm-item" data-go="career">
              <span class="hm-ico">${LINE_ICON.career}</span>
              <span class="hm-txt"><b>生涯统计</b><small>战绩 · 球员 · 收集</small></span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>`);
  app.append(sc);

  // 球场实时背景（fixed 铺满视口，内容滚动于其上——参考图二）
  // 先让主界面完成一帧绘制，再初始化演示比赛，避免从教程/比赛返回时卡一下
  const canvas = sc.querySelector(".attract-canvas");
  const startAttractBg = () => {
    if (!sc.isConnected) return;
    (async () => {
      const demo = demoMatch();
      await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
      if (!sc.isConnected) return;
      const renderer = new Renderer(canvas);
      const stopBg = attractLoopFor(canvas, demo, renderer);
      sc.__stopBg = stopBg;
      homeBgStop = stopBg;
    })();
  };
  requestAnimationFrame(() => setTimeout(startAttractBg, 40));

  sc.querySelector("#home-coach")?.addEventListener("click", () => openCoachProfile(loadSave() || save));
  // 导引：新手指引 + 操作教程合并入口
  sc.querySelector("#home-guide")?.addEventListener("click", () => openGuideMenu(loadSave() || save));
  // 更新公告：打开后记录已读，红点消失
  sc.querySelector("#home-notice")?.addEventListener("click", (e) => {
    openNotice();
    try { localStorage.setItem(NOTICE_KEY, NOTICE_VERSION); } catch {}
    e.currentTarget.querySelector(".dot")?.remove();
  });
  // 金币"+"获取面板 / 成就面板
  sc.querySelector("#earn-add").addEventListener("click", () => {
    const refreshRoster = () => {
      const team = sc.querySelector('[data-go="team"] .hm-txt small');
      if (team) team.textContent = `${save.team.length}/10 · 仓库 ${save.box.length}`;
      const dex = sc.querySelector('[data-go="dex"] .hm-txt small');
      if (dex) dex.textContent = `${Object.keys(save.dex).length} / 291 已结缘`;
    };
    openEarn(save, () => {
      const coinB = sc.querySelector(".coin-chip b");
      if (coinB) coinB.textContent = save.coins;
    }, refreshRoster);
  });
  sc.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "match") {
        // 新手之路未完成时先走新手步骤，避免跳过买精灵/队伍配置
        if (newbieActive(save) && newbieStep(save) > 0) { openNewbieQuest(save); return; }
        if (!hasFullLineup(save)) { openLineupGate(save); return; }
        sc.__stopBg?.(); showMatch(save, "league");
      }
      else if (go === "daily") {
        sc.__stopBg?.();
        openDaily(save, {
          onStart: () => {
            const f = loadSave() || save;
            if (!hasFullLineup(f)) { openLineupGate(f); return; }
            startDaily(f);
          },
        });
      }
      else if (go === "newbie") { openNewbieQuest(save); }
      else if (go === "achv") {
        openAchievements({
          onCoins: () => {
            const fresh = loadSave() || save;
            document.querySelectorAll(".coin-chip b").forEach((el) => { el.textContent = String(fresh.coins || 0); });
          },
        });
      }
      else if (go === "tasks") {
        sc.__stopBg?.();
        const f = loadSave() || save;
        openDailyTasks(f, () => {
          const coinB = sc.querySelector(".coin-chip b");
          if (coinB) coinB.textContent = f.coins;
        });
      }
      else if (go === "train") { sc.__stopBg?.(); showSub(renderTrain, save); }
      else if (go === "dex") { sc.__stopBg?.(); showDex(save); }
      else if (go === "career") { sc.__stopBg?.(); showCareer(save); }
      else if (go === "shop") { sc.__stopBg?.(); bumpDaily("visit"); showSub(renderShop, save); }
      else if (go === "egg") { sc.__stopBg?.(); bumpDaily("visit"); showSub(renderEgg, save); }
      else if (go === "team") { sc.__stopBg?.(); showTeam(save); }
      else if (go === "bag") { sc.__stopBg?.(); showBag(save); }
      else if (go === "quick") { sc.__stopBg?.(); openQuickMatch(save); }
      else if (go === "settings") { sc.__stopBg?.(); openSettings(); }
    })
  );

  // 新玩家局外指引：新手之路结束后再完整走一遍主页/主线/赛前/结算导引
  const gs = loadSave() || save;
  if (!gs.newbie || gs.newbie.done) setTimeout(() => startOnboarding(sc, gs), 420);

  // 进入主页自动弹一次更新公告；新手指引/其他弹窗打开时不打断，留待下次进入
  if (noticeUnread && (!save.newbie || save.newbie.done)) {
    setTimeout(() => {
      if (!sc.isConnected) return;
      if (document.querySelector(".pj-scrim, .nb-layer")) return;
      openNotice();
      try { localStorage.setItem(NOTICE_KEY, NOTICE_VERSION); } catch {}
      sc.querySelector("#home-notice .dot")?.remove();
    }, 1100);
  }
}

/* ================= 底部 5 Tab 主壳 ================= */
const TAB_ITEMS = [
  ["adventure", "冒险", "map"],
  ["team", "球队", "team"],
  ["dex", "图鉴", "book"],
  ["shop", "商店", "shop"],
  ["tournament", "锦标赛", "trophy"],
];
const TAB_DEX_SUBS = [["dex", "图鉴"], ["achv", "成就"]];
const TAB_TEAM_SUBS = [["team", "首发"], ["train", "训练"], ["bag", "背包"], ["career", "生涯"]];
const TAB_SHOP_SUBS = [["shop", "商店"], ["egg", "孵蛋"]];
const tabState = { tab: "adventure", sub: "map", root: null, save: null, seasonNotice: "", viewRegionNo: 1, tournamentNotice: "" };
const ADV_STEP_ZH = { wild: "野生", minor: "训练家", rest: "补给", leader: "馆主" };
const ADV_REGION_LIMIT = 2;
const ADV_ART = {
  kanto: {
    banner: "./assets/adventure/banner-kanto.webp",
    gyms: Array.from({ length: 8 }, (_, i) => `./assets/adventure/gym-kanto-${i + 1}.webp`),
    leaders: Array.from({ length: 8 }, (_, i) => `./assets/adventure/leader-kanto-${i + 1}.png`),
    badges: "./assets/adventure/badge-kanto-1.png",
  },
  johto: {
    banner: "./assets/adventure/banner-johto.webp",
    gyms: Array.from({ length: 8 }, (_, i) => `./assets/adventure/gym-johto-${i + 1}.webp`),
    leaders: Array.from({ length: 8 }, (_, i) => `./assets/adventure/leader-johto-${i + 1}.png`),
    badges: null,
  },
};

function tabIcon(name) { return LINE_ICON[name] || ""; }
function isNoticeUnread() {
  try { return localStorage.getItem(NOTICE_KEY) !== NOTICE_VERSION; } catch { return false; }
}

function buildTabShell(save) {
  const rep = repInfo(save);
  const coachDot = repMissionRows(save).some((m) => m.canClaim);
  const noticeUnread = isNoticeUnread();
  const tabs = TAB_ITEMS.map(([id, label, ico]) =>
    `<button class="tabbar-item" type="button" data-nav-tab="${id}"><span class="tb-ico">${tabIcon(ico)}</span><span>${label}</span></button>`
  ).join("");
  return el(`
    <div class="screen-menu tab-shell">
      <div class="menu">
        <div class="top-row">
          <button class="coin-chip coin-btn" id="earn-add" title="获取金币" aria-label="获取金币">${COIN_SVG}<b>${save.coins}</b><span class="coin-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></button>
          <button class="coin-chip plain coach-chip" id="home-coach" type="button" title="教练档案"><span>${save.coach.name}</span><em>Lv.${rep.level}</em>${coachDot ? '<i class="dot"></i>' : ""}</button>
          <div class="spacer"></div>
          <button class="guide-chip icon-chip" id="home-guide" type="button" title="新手指引" aria-label="新手指引">${LINE_ICON.tutorial}</button>
          <button class="notice-chip icon-chip" id="home-notice" type="button" title="更新公告" aria-label="更新公告">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/></svg>
            ${noticeUnread ? '<i class="dot"></i>' : ""}
          </button>
          <button class="settings-chip icon-chip" data-go="settings" type="button" title="设置" aria-label="设置">${LINE_ICON.settings}</button>
        </div>
        <div class="tab-body"><div class="tab-view"></div></div>
        <nav class="tabbar">${tabs}</nav>
      </div>
    </div>`);
}

function bindTabShell(root, save) {
  root.querySelector("#home-coach")?.addEventListener("click", () => openCoachProfile(loadSave() || save));
  root.querySelector("#home-guide")?.addEventListener("click", () => openGuideMenu(loadSave() || save));
  root.querySelector("#home-notice")?.addEventListener("click", (e) => {
    openNotice();
    try { localStorage.setItem(NOTICE_KEY, NOTICE_VERSION); } catch {}
    e.currentTarget.querySelector(".dot")?.remove();
  });
  root.querySelector("#earn-add")?.addEventListener("click", () => {
    const f = loadSave() || save;
    openEarn(f, () => refreshTabHeader(), () => refreshTabHeader());
  });
  root.querySelector('[data-go="settings"]')?.addEventListener("click", () => openSettings());
  root.querySelectorAll("[data-nav-tab]").forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.navTab))
  );
  root.addEventListener("click", (e) => {
    const sub = e.target.closest("[data-nav-sub]");
    if (!sub) return;
    if (tabState.tab === "adventure") openAdventureSub(sub.dataset.navSub);
    else if (tabState.tab === "team") openTeamSub(sub.dataset.navSub);
    else if (tabState.tab === "dex") openDexSub(sub.dataset.navSub);
    else if (tabState.tab === "shop") openShopSub(sub.dataset.navSub);
  });
  ensureTabSaveRefresh();
}

function refreshTabHeader() {
  const root = tabState.root;
  if (!root || !root.isConnected) return;
  const f = loadSave();
  if (!f) return;
  const coin = root.querySelector("#earn-add b");
  if (coin) coin.textContent = String(f.coins ?? 0);
  const coach = root.querySelector("#home-coach span");
  if (coach && f.coach?.name) coach.textContent = f.coach.name;
}

let tabSaveListener = null;
function ensureTabSaveRefresh() {
  if (tabSaveListener) window.removeEventListener("pokedunk-save", tabSaveListener);
  tabSaveListener = () => refreshTabHeader();
  window.addEventListener("pokedunk-save", tabSaveListener);
}

function updateTabbar() {
  const root = tabState.root;
  if (!root) return;
  root.querySelectorAll("[data-nav-tab]").forEach((b) =>
    b.classList.toggle("on", b.dataset.navTab === tabState.tab)
  );
}

function createTabPage(wrap) {
  const page = document.createElement("div");
  page.className = "sub-page tab-page";
  wrap.replaceChildren(page);
  return page;
}

const TAB_SUB_ICONS = {
  team: "team", train: "ball", bag: "bag", career: "career",
  dex: "book", achv: "trophy", shop: "shop", egg: "egg",
};
function tabSubnav(items, active) {
  return `<nav class="tab-subnav" aria-label="分类">${items.map(([id, label]) => {
    const ico = LINE_ICON[TAB_SUB_ICONS[id]] || LINE_ICON.ball;
    const on = id === active;
    return `<button type="button" class="${on ? "on" : ""}" data-nav-sub="${id}"${on ? ' aria-current="page"' : ""}><span class="ts-ico">${ico}</span><span>${label}</span></button>`;
  }).join("")}</nav>`;
}

function renderTabFrame(subnav, mount) {
  const view = tabState.root?.querySelector(".tab-view");
  if (!view) return;
  view.innerHTML = `${subnav}<div class="tab-page-wrap"></div>`;
  const wrap = view.querySelector(".tab-page-wrap");
  mount(wrap);
  updateTabbar();
}

function mountTabPage(wrap, renderFn, save, opts = {}) {
  const page = createTabPage(wrap);
  if (opts.root) page.classList.add("tab-page-root");
  const backEvent = opts.backEvent || "";
  try {
    renderFn(page, save);
  } catch (err) {
    console.error("[tab-page]", err);
    page.innerHTML = `<div class="page-head"><button class="back" data-back>‹</button><h2>页面加载失败</h2></div><p class="page-sub">${escHtml(err?.message || String(err))}</p>`;
  }
  if (backEvent) page.addEventListener(backEvent, goBackTab);
  else page.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) goBackTab(); });
  page.addEventListener("page-goto", (e) => {
    if (e.detail === "shop") openShopSub("shop");
    else if (e.detail === "newbie") setTimeout(() => openNewbieQuest(loadSave() || save), 80);
  });
  return page;
}

function bindEmbedBack(page) {
  page.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) goBackTab(); });
}

function renderHomeTab(sub = "home") {
  tabState.tab = "home";
  tabState.sub = sub;
  const f = loadSave() || tabState.save;
  renderTabFrame(tabSubnav(TAB_HOME_SUBS, sub), (wrap) => {
    const page = createTabPage(wrap);
    if (sub === "tasks") {
      openDailyTasks(f, () => refreshTabHeader(), { host: page });
      bindEmbedBack(page);
      return;
    }
    if (sub === "achv") {
      openAchievements({ host: page, onCoins: () => refreshTabHeader() });
      bindEmbedBack(page);
      return;
    }
    syncNewbieTeam(f); syncNewbieDone(f);
    ensureLineupSlots(f);
    const season = ensureSeason(f);
    ACHV.refresh(f);
    const fiveSlots = ["PG", "SG", "SF", "PF", "C"].map((pos) => ({
      pos,
      id: f.team.find((id) => f.mons[id] && f.assign?.[id] === pos) || null,
    }));
    const daily = dailyPreview(f);
    const sign = signInfo(f);
    const achvDone = ACHV.list().filter((x) => x.unlocked).length;
    const badgeCount = new Set((season.badges || []).filter((b) => b !== "champion")).size;
    const newbie = newbieActive(f);
    page.innerHTML = `
      <div class="page-head"><h2>主场</h2><span class="count">S${season.no} · ${badgeCount}/8</span></div>
      ${newbie ? `<button class="newbie-top" data-go="newbie" type="button">
        <span class="nt-ico">${LINE_ICON.tutorial}</span>
        <span class="nt-txt"><b>新手之路 <em>${newbieStep(f)}/4</em></b><small>${newbieStepText(f)}</small></span>
        <span class="nt-arrow">继续 ›</span>
      </button>` : ""}
      <div class="home-five">
        <div class="hf-head"><b>首发阵容</b><small>${fiveSlots.filter((x) => x.id).length}/5 人</small></div>
        <div class="hf-line" data-n="${fiveSlots.filter((x) => x.id).length}">
          ${fiveSlots.filter((x) => x.id).map(({ id }) => {
            const m = f.mons[id];
            const b = getPokemon(m.dex);
            return `<img class="hf-mon" src="./sprites/${m.dex}.png" alt="${b.name}" title="Lv.${m.level} ${b.name}" draggable="false">`;
          }).join("")}
        </div>
      </div>
      <div class="menu-panel home-menu">
        <button class="hm-hero" data-go="match" type="button">
          <span class="hm-ico">${LINE_ICON.ball}</span>
          <span class="hm-txt"><b>开始游戏</b></span>
        </button>
        <button class="hm-sub" data-go="daily" type="button">
          <span class="hm-ico">${LINE_ICON.daily}</span>
          <span class="hm-txt"><b>每日挑战</b><small>今日 ${daily.mod.name} · 最高分 ${daily.best || "未挑战"}</small></span>
        </button>
      </div>
      <div class="tab-quick-grid">
        <button class="tab-quick" data-go="tasks" type="button"><b>每日任务</b><small>${sign.signedToday ? "今日已签到" : "签到待领"}</small></button>
        <button class="tab-quick" data-go="achv" type="button"><b>成就</b><small>${achvDone} 项已解锁</small></button>
        <button class="tab-quick" data-go="quick" type="button"><b>快速比赛</b><small>自由对战</small></button>
        <button class="tab-quick" data-go="career" type="button"><b>生涯统计</b><small>战绩与球员数据</small></button>
      </div>`;
    page.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "match") {
        if (newbieActive(f) && newbieStep(f) > 0) { openNewbieQuest(f); return; }
        if (!hasFullLineup(f)) { openLineupGate(f); return; }
        showMatch(f, "league");
      } else if (go === "daily") {
        openDaily(f, { onStart: () => { const g = loadSave() || f; if (!hasFullLineup(g)) { openLineupGate(g); return; } startDaily(g); } });
      } else if (go === "tasks") {
        openHomeSub("tasks");
      } else if (go === "achv") {
        openHomeSub("achv");
      } else if (go === "quick") {
        openQuickMatch(f);
      } else if (go === "career") {
        openTeamSub("career");
      } else if (go === "newbie") {
        openNewbieQuest(f);
      }
    }));
  });
}

const ADV_LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`;
const ADV_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>`;

function tabToast(msg, ms = 1800) {
  let t = document.getElementById("pk-toast");
  if (!t) { t = document.createElement("div"); t.id = "pk-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(tabToast.timer);
  tabToast.timer = setTimeout(() => t.classList.remove("show"), ms);
}

function adventureNodeHtml(g, i, { done, current, locked, steps, step, art }) {
  const cls = done ? "done" : current ? "current" : "locked";
  const stateText = done ? "已通关" : current ? "当前" : "未解锁";
  const icon = done ? ADV_CHECK : locked ? ADV_LOCK : String(i + 1);
  const thumb = art?.gyms?.[i] ? `style="background-image:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.3)),url('${art.gyms[i]}')"` : "";
  const leader = art?.leaders?.[i] ? `<img class="adv-node-leader" src="${art.leaders[i]}" alt="" draggable="false">` : "";
  const badge = art?.badges ? `<span class="adv-node-badge" style="--bi:${i};background-image:url('${art.badges}')"></span>` : "";
  const stepHtml = current && steps?.length
    ? `<div class="adv-substeps">${steps.map((s, idx) => {
        const sc = idx < step ? "done" : idx === step ? "cur" : "lock";
        return `<span class="adv-step ${sc}"><i>${idx + 1}</i><small>${ADV_STEP_ZH[s.kind] || "关卡"}</small></span>`;
      }).join("")}</div>
      <button class="adv-node-cta" type="button" data-adv="route">查看当前关卡 ${LINE_ICON.arrow || ""}</button>`
    : "";
  return `<div class="adv-node ${cls}" data-gym="${i}">
    ${current && art?.gyms?.[i] ? `<span class="adv-node-scene" style="background-image:linear-gradient(180deg,rgba(8,6,2,.18),rgba(8,6,2,.88)),url('${art.gyms[i]}')"></span>` : ""}
    <div class="adv-node-main">
      <span class="adv-node-thumb" ${thumb}>${leader}<span class="adv-node-icon">${icon}</span></span>
      <span class="adv-node-copy"><b>${g.name}</b><small>${g.leader} · ${g.type}属性</small></span>
      ${badge}
      <span class="adv-node-tag">${stateText}</span>
    </div>
    ${stepHtml}
  </div>`;
}

function adventureMapHtml(f) {
  const currentRegNo = Math.max(1, Number(f.journey?.regionNo) || 1);
  const viewNo = Math.max(1, Math.min(ADV_REGION_LIMIT, Number(tabState.viewRegionNo) || currentRegNo));
  const reg = REGIONS[viewNo - 1];
  const season = ensureSeason(f);
  const badges = badgeCountOf(f);
  const champion = !!season.champion;
  let st = null;
  try { st = routeState(f); } catch {}
  const venue = st ? Math.max(0, Number(st.info?.venue) || 0) : Math.min(8, badges);
  const step = st ? Math.max(0, Number(st.step) || 0) : 0;
  const steps = st?.steps || [];
  const sameRegion = viewNo === currentRegNo;
  const playable = sameRegion && !!reg.available;
  const gyms = reg.gyms || [];
  const art = ADV_ART[reg.id] || ADV_ART.kanto;
  const gymNodes = gyms.map((g, i) => {
    const done = champion || i < badges || (sameRegion && i < venue);
    const current = playable && !champion && i === venue && venue < 8;
    return adventureNodeHtml(g, i, { done, current, locked: !done && !current, steps, step, art });
  }).join("");
  const daily = dailyPreview(f);
  const newbie = newbieActive(f);
  return `<div class="page-head adv-head"><h2>冒险</h2><span class="count">${reg.name} · ${badges}/8</span></div>
    ${newbie ? `<button class="newbie-top" data-adv="newbie" type="button">
      <span class="nt-ico">${LINE_ICON.tutorial}</span>
      <span class="nt-txt"><b>新手之路 <em>${newbieStep(f)}/4</em></b><small>${newbieStepText(f)}</small></span>
      <span class="nt-arrow">继续 ›</span>
    </button>` : ""}
    <div class="adv-region-hero" style="background-image:linear-gradient(90deg,rgba(4,6,10,.86),rgba(4,6,10,.26)),url('${art.banner}')">
      <div class="adv-region-hero-mask"></div>
      <div class="adv-region-hero-body">
        <button type="button" data-region="prev" ${viewNo <= 1 ? "disabled" : ""} aria-label="上一地区">‹</button>
        <div class="adv-region-hero-copy"><small>第 ${viewNo} 地区</small><b>${reg.name}</b><span>${badges}/8 徽章${champion ? " · 地区冠军" : playable ? " · 探索中" : " · 待开放"}</span></div>
        <button type="button" data-region="next" ${viewNo >= ADV_REGION_LIMIT ? "disabled" : ""} aria-label="下一地区">›</button>
      </div>
    </div>
    <div class="adv-entry-row">
      <button class="adv-entry" type="button" data-adv="daily">${LINE_ICON.daily}<span><b>每日挑战</b><small>${daily.mod.name} · 最高 ${daily.best || "未挑战"}</small></span></button>
      <button class="adv-entry" type="button" data-adv="tasks">${LINE_ICON.daily}<span><b>任务</b><small>签到与每日活跃</small></span></button>
    </div>
    ${playable ? "" : `<div class="adv-region-lock">${ADV_LOCK}<b>${reg.name}地区</b><small>${sameRegion ? "内容接入中，敬请期待" : "完成关都 8 枚徽章后开放"}</small></div>`}
    <div class="adv-map">${gymNodes}</div>
    ${playable && badges >= 8 ? `<button class="adv-final" type="button" data-adv="mainquest">${LINE_ICON.trophy}<span><b>${champion ? "地区冠军已达成" : "挑战四天王"}</b><small>${champion ? "可前往下一地区" : "8 枚徽章已集齐"}</small></span>${LINE_ICON.arrow || ""}</button>` : ""}`;
}

function bindAdventureEvents(page, f) {
  page.querySelectorAll("[data-region]").forEach((b) => b.addEventListener("click", () => {
    const dir = b.dataset.region === "next" ? 1 : -1;
    tabState.viewRegionNo = Math.max(1, Math.min(ADV_REGION_LIMIT, (tabState.viewRegionNo || 1) + dir));
    renderAdventureTab("map");
  }));
  page.querySelectorAll("[data-adv]").forEach((b) => b.addEventListener("click", () => {
    const go = b.dataset.adv;
    if (go === "daily") {
      openDaily(f, { onStart: () => { const g = loadSave() || f; if (!hasFullLineup(g)) { openLineupGate(g); return; } startDaily(g); } });
    } else if (go === "tasks") openAdventureSub("tasks");
    else if (go === "route") openAdventureSub("route");
    else if (go === "mainquest") openMainQuestPage(f);
    else if (go === "newbie") openNewbieQuest(f);
  }));
  page.querySelectorAll("[data-gym]").forEach((n) => n.addEventListener("click", (e) => {
    if (e.target.closest("[data-adv]")) return;
    if (n.classList.contains("current")) { openAdventureSub("route"); return; }
    if (n.classList.contains("done")) tabToast("该道馆已通关");
    else tabToast("先完成上一道馆，迷雾才会散开");
  }));
}

function renderAdventureTab(sub = "map") {
  tabState.tab = "adventure";
  tabState.sub = sub;
  const f = loadSave() || tabState.save;
  if (!tabState.viewRegionNo) tabState.viewRegionNo = Math.max(1, Math.min(ADV_REGION_LIMIT, Number(f.journey?.regionNo) || 1));
  if (sub === "tasks") {
    renderTabFrame("", (wrap) => {
      const page = createTabPage(wrap);
      openDailyTasks(f, () => refreshTabHeader(), { host: page });
      bindEmbedBack(page);
    });
    return;
  }
  if (sub === "route") { renderAdventureRoute(f, tabState.seasonNotice); return; }
  renderTabFrame("", (wrap) => {
    const page = createTabPage(wrap);
    page.innerHTML = adventureMapHtml(f);
    bindAdventureEvents(page, f);
  });
}

function renderAdventureRoute(save, notice = "") {
  tabState.tab = "adventure";
  tabState.sub = "route";
  const f = loadSave() || save;
  renderTabFrame("", (wrap) => {
    const page = createTabPage(wrap);
    page.classList.add("route-embed");
    openGymRoute(f, {
      host: page,
      notice,
      compact: true,
      onBack: () => renderAdventureTab("map"),
      onProgress: () => renderAdventureTab("map"),
      onStage: (step, options) => {
        const g = loadSave() || f;
        if (!hasFullLineup(g)) { openLineupGate(g); return; }
        startGymRouteStage(g, step, options);
      },
      onDex: (dex) => openDetail(dex, null, () => renderAdventureRoute(loadSave() || f)),
      onRest: () => {
        const g = loadSave() || f;
        const r = claimRouteRest(g);
        if (!r) { renderAdventureRoute(g, "当前不是补给点"); return; }
        writeSave(g);
        renderAdventureRoute(g, `补给领取：普通树果 ×${r.berry} · 篮球币 +${r.coins}`);
      },
      onLeader: () => {
        const g = loadSave() || f;
        if (!hasFullLineup(g)) { openLineupGate(g); return; }
        showMatch(g, "league");
      },
    });
  });
}

function openAdventureSub(sub) {
  tabState.tab = "adventure";
  renderAdventureTab(sub);
}

function renderTournamentTab() {
  tabState.tab = "tournament";
  tabState.sub = "tournament";
  const f = loadSave() || tabState.save;
  const badges = badgeCountOf(f);
  renderTabFrame("", (wrap) => {
    const page = createTabPage(wrap);
    if (badges < 8) {
      page.innerHTML = `<div class="adv-tour-lock"><span>${LINE_ICON.trophy}</span><b>锦标赛</b><small>集齐 8 枚徽章后解锁</small><div class="adv-tour-bar"><i style="width:${Math.round((badges / 8) * 100)}%"></i></div><em>${badges} / 8 徽章</em><button class="pk-btn-gold" type="button" data-adv="map">前往冒险</button></div>`;
      page.querySelector('[data-adv="map"]')?.addEventListener("click", () => switchTab("adventure"));
      return;
    }
    page.classList.add("league-embed", "tab-page-root");
    openLeaguePage(f, {
      host: page,
      title: "锦标赛",
      notice: tabState.tournamentNotice,
      onBack: () => switchTab("adventure"),
      onPlay: () => startLeagueBattle(f, false),
      onWatch: () => startLeagueBattle(f, true),
    });
  });
}

function openTournamentTab(notice = "") {
  if (!tabState.root || !tabState.root.isConnected) showHome(loadSave());
  tabState.tournamentNotice = notice || "";
  switchTab("tournament");
}

function renderTeamTab(sub = "team") {
  tabState.tab = "team";
  tabState.sub = sub;
  const f = loadSave() || tabState.save;
  const meta = { team: ["renderTeam", null], train: ["renderTrain", "page-back"], bag: ["renderBag", "bag-back"], career: ["renderCareer", null] };
  const [fnName, backEvent] = meta[sub] || meta.team;
  const fn = fnName === "renderTrain" ? renderTrain : fnName === "renderBag" ? renderBag : fnName === "renderCareer" ? renderCareer : renderTeam;
  renderTabFrame(tabSubnav(TAB_TEAM_SUBS, sub), (wrap) => {
    mountTabPage(wrap, (page) => fn(page, f), f, { backEvent, root: true });
  });
}

function openHomeSub(sub) {
  tabState.tab = "home";
  renderHomeTab(sub);
}

function openTeamSub(sub) {
  tabState.tab = "team";
  renderTeamTab(sub);
}

function renderShopTab(sub = "shop") {
  tabState.tab = "shop";
  tabState.sub = sub;
  const f = loadSave() || tabState.save;
  renderTabFrame(tabSubnav(TAB_SHOP_SUBS, sub), (wrap) => {
    mountTabPage(wrap, sub === "egg" ? (page) => renderEgg(page) : (page) => renderShop(page), f, { root: true });
  });
}

function openShopSub(sub) {
  tabState.tab = "shop";
  renderShopTab(sub);
}

function renderDexTab(sub = "dex") {
  tabState.tab = "dex";
  tabState.sub = sub;
  const f = loadSave() || tabState.save;
  renderTabFrame(tabSubnav(TAB_DEX_SUBS, sub), (wrap) => {
    if (sub === "achv") {
      const page = createTabPage(wrap);
      page.classList.add("tab-page-root");
      openAchievements({ host: page, onCoins: () => refreshTabHeader() });
      bindEmbedBack(page);
      return;
    }
    mountTabPage(wrap, (page) => renderDex(page), f, { root: true });
  });
}

function openDexSub(sub) {
  tabState.tab = "dex";
  renderDexTab(sub);
}

function switchTab(tab) {
  if (!tabState.root) return;
  if (tab === "team") renderTeamTab("team");
  else if (tab === "dex") renderDexTab("dex");
  else if (tab === "shop") renderShopTab("shop");
  else if (tab === "tournament") renderTournamentTab();
  else {
    const f = loadSave() || tabState.save;
    tabState.viewRegionNo = Math.max(1, Math.min(ADV_REGION_LIMIT, Number(f?.journey?.regionNo) || 1));
    renderAdventureTab("map");
  }
  refreshTabHeader();
}

function goBackTab() {
  if (tabState.tab === "adventure" && tabState.sub !== "map") { renderAdventureTab("map"); return; }
  if (tabState.tab === "dex" && tabState.sub !== "dex") { renderDexTab("dex"); return; }
  if (tabState.tab === "team" && tabState.sub !== "team") { renderTeamTab("team"); return; }
  if (tabState.tab === "shop" && tabState.sub !== "shop") { renderShopTab("shop"); return; }
  switchTab("adventure");
}

function showHome(save, justStarted = false) {
  gameAudio.setTrack("menu");
  homeBgStop?.();
  homeBgStop = null;
  save = loadSave() || save;
  syncNewbieTeam(save);
  syncNewbieDone(save);
  const root = buildTabShell(save);
  app.replaceChildren(root);
  tabState.root = root;
  tabState.save = save;
  tabState.tab = "adventure";
  tabState.sub = "map";
  tabState.seasonNotice = "";
  tabState.tournamentNotice = "";
  tabState.viewRegionNo = Math.max(1, Math.min(ADV_REGION_LIMIT, Number(save.journey?.regionNo) || 1));
  bindTabShell(root, save);
  switchTab("adventure");
  const gs = loadSave() || save;
  if (!justStarted && (!gs.newbie || gs.newbie.done)) {
    setTimeout(() => { if (root.isConnected) startOnboarding(root, gs); }, 420);
  }
  if (isNoticeUnread() && (!save.newbie || save.newbie.done)) {
    setTimeout(() => {
      if (!root.isConnected) return;
      if (document.querySelector(".pj-scrim, .nb-layer")) return;
      if (!isNoticeUnread()) return;
      openNotice();
      try { localStorage.setItem(NOTICE_KEY, NOTICE_VERSION); } catch {}
      root.querySelector("#home-notice .dot")?.remove();
    }, 1100);
  }
}

/* ================= 场景四：比赛 + 结果面板 ================= */
function showMatch(save, mode = "league") {
  if (mode === "league") {
    const f = loadSave() || save;
    const info = leagueInfo(f);
    // 8 徽章 / 冠军后没有普通道馆：开始比赛进入主线页处理四天王与下一地区
    if (!info || info.kind === "done") { openMainQuestPage(f); return; }
    const st = routeState(f);
    if (st && st.step < ROUTE_STEPS.length - 1) { openGymRoutePage(f); return; }
  }
  showPreMatch(save, mode);
}

/** 赛前对阵页：双方战力 / 首发 / 胜率（仅展示，不可调整阵容） */
function showPreMatch(save, mode = "league") {
  save = loadSave() || save;
  ensureLineupSlots(save);
  if (!hasFullLineup(save)) {
    showHome(save);
    openLineupGate(save);
    return;
  }
  const cfg = buildGymMatch(save, mode);
  if (!cfg) return showHome(loadSave() || save);
  const info = cfg.info || currentMatchInfo(save, mode);
  const teamPower = myTeamPower(save);
  const winP = Math.round(Math.max(0.05, Math.min(0.95, 0.5 + (teamPower - info.targetPower) * 0.03)) * 100);
  const gym = cfg.gym;
  const coach = save.coach?.name || "ME";
  const coachTitle = save.coach?.title || "";
  const starters = starterIds(save);
  const starterSet = new Set(starters);
  const bench = save.team.filter((id) => save.mons[id] && !starterSet.has(id));
  const per = bondMultipliers(save);
  const typeHints = (() => {
    const mine = [], theirs = [];
    const homeByPos = new Map(cfg.home.roster.map((p) => [p.pos, p]));
    const awayByPos = new Map(cfg.away.roster.map((p) => [p.pos, p]));
    for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
      const h = homeByPos.get(pos), a = awayByPos.get(pos);
      if (!h || !a) continue;
      const hm = bestTypeMult(h.types, a.types);
      const am = bestTypeMult(a.types, h.types);
      if (hm.mult > 1) mine.push({ pos, ...hm });
      if (am.mult > 1) theirs.push({ pos, ...am });
    }
    return { mine, theirs };
  })();
  const typeHintLine = (rows, cls, label) => rows.length
    ? `<p class="pth ${cls}"><span>${label}</span>${rows.map((x) => `<b>${TYPE_ZH[x.atkType] || x.atkType}</b><i>→</i>${TYPE_ZH[x.defType] || x.defType}<em>×${x.mult}</em>`).join(" · ")}</p>`
    : "";
  const mini = (id, from) => {
    const m = save.mons[id];
    const b = getPokemon(m.dex);
    const color = TYPE_COLORS[b.types?.[0]] || "#5a6a92";
    const label = from === "start" ? save.assign[id] || m.pos : "替补";
    const ovr = from === "start"
      ? Math.round(monPower(m, label, per.get(m)))
      : Math.round(mainOVR(m));
    return `<div class="pms-mon" style="--tc:${color}">
      <span class="pms-ovr">${ovr}</span>
      <img src="./sprites/${m.dex}.png" alt=""><b>${b.name}</b><small>${label}</small>
    </div>`;
  };
  const miniPlayer = (p) => `<div class="pms-mon" style="--tc:${TYPE_COLORS[p.types?.[0]] || "#5a6a92"}">
    <span class="pms-ovr">${p.ovr}</span>
    <img src="./sprites/${p.dex}.png" alt=""><b>${getPokemon(p.dex).name}</b><small>${p.pos}</small>
  </div>`;

  const page = el(`<div class="sub-page screen-match prematch-screen"></div>`);
  app.replaceChildren(page);
  page.innerHTML = `
    <div class="pm-bg"><canvas></canvas></div>
    <div class="pm-dim"></div>
    <div class="pm-top">
      <button class="pm-back" data-pms-back>‹</button>
      <span class="pm-label">${info.label}</span>
      <span class="pm-season">S${info.season}</span>
    </div>
    <div class="brief-card pms-card">
      <span class="brief-stage">${info.smallName}</span>
      <h2>${info.kind === "elite" ? "四天王挑战" : info.kind === "playoff" ? info.smallName : `${info.smallName || `第 ${Number(info.venue) + 1} 馆`} · ${gym.name}`}</h2>
      <div class="brief-vs">
        <div class="brief-side"><b>${coach}</b>${coachTitle ? `<em class="brief-coach-title">${coachTitle}</em>` : ""}<small>战力 ${teamPower}</small></div>
        <span class="brief-vs-txt">对阵</span>
        <div class="brief-side away" style="--tc:${gym.color}"><b>${info.kind === "elite" ? "四天王" : (GYM_LEADER_CN[(Number(gym.gym) || 1) - 1] || gym.name)}</b><small>${info.kind === "elite" ? "联盟四天王" : gym.name} · 战力 ${info.targetPower}</small></div>
      </div>
      <div class="brief-winrow"><span>预计胜率</span><div class="brief-winbar"><i style="width:${winP}%"></i></div><b style="color:${winP >= 50 ? "var(--good)" : "var(--red)"}">${winP}%</b></div>
      <div class="pms-sec"><b>对手首发</b><div class="pms-opp">${cfg.away.roster.slice(0, 5).map((p) => {
        const nm = getPokemon(p.dex).name;
        return `<button type="button" class="pms-mon pms-opp-card" data-pms-dex="${p.dex}" style="--tc:${TYPE_COLORS[p.types?.[0]] || "#5a6a92"}" aria-label="查看 ${nm} 详情"><span class="pms-ovr">${p.ovr}</span><img src="./sprites/${p.dex}.png" alt=""><b>${nm}</b><small>${p.pos}</small></button>`;
      }).join("")}</div></div>
      <div class="pms-type-hint">
        <div class="pth-head"><b>系别克制</b><small>仅列出发动 ×2 的属性优势</small></div>
        ${typeHintLine(typeHints.mine, "good", "我方")}
        ${typeHintLine(typeHints.theirs, "bad", "敌方")}
        ${!typeHints.mine.length && !typeHints.theirs.length ? '<p class="pth neutral">双方首发暂无 ×2 属性优势</p>' : ""}
        <p class="pth-note">克制影响抢位推撞成功率，以及地震/冰冻类必杀的击退与减速；不影响投篮基础命中。</p>
      </div>
      <div class="pms-head"><b>我方阵容</b></div>
      <div class="pms-start">${cfg.home.roster.slice(0, 5).map(miniPlayer).join("")}</div>
      ${bench.length ? `<div class="pms-benchrow"><span>替补</span><div class="pms-bench">${bench.map((id) => mini(id, "bench")).join("")}</div></div>` : ""}
      <div class="pms-actions"><button class="pk-btn-gold" id="pms-go">继 续</button><button class="pk-btn-gold pm-ghost" data-pms-back>返 回</button></div>
    </div>`;

  const canvas = page.querySelector(".pm-bg canvas");
  (async () => {
    const demo = demoMatch();
    await preloadSprites([...demo.cfg.home.roster, ...demo.cfg.away.roster]);
    const renderer = new Renderer(canvas);
    page.__stopBg = attractLoopFor(canvas, demo, renderer);
  })();
  const stopBg = () => { page.__stopBg?.(); page.__stopBg = null; };
  page.querySelectorAll("[data-pms-back]").forEach((b) => b.addEventListener("click", () => { stopBg(); showHome(loadSave() || save); }));
  // 对手首发：点击查看只读详情（含八维/必杀/推荐位置）
  page.querySelectorAll("[data-pms-dex]").forEach((b) =>
    b.addEventListener("click", () => openDetail(Number(b.dataset.pmsDex), null))
  );

  page.querySelector("#pms-go").addEventListener("click", () => {
    stopBg();
    startMatchNow(loadSave() || save, mode);
  });
  mountGuide("prematch", loadSave() || save, { root: page });
}


const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= 快速比赛：无存档自由对战 ================= */
const QUICK_CSS = `
.screen-quick,.screen-quick-result{position:absolute;inset:0;overflow-y:auto;padding:10px 12px calc(18px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#0b0e16,#05060a 60%);color:var(--r-ink,#f2f2f2);box-sizing:border-box}
.qk-head{display:flex;align-items:center;gap:10px;padding:4px 0 12px}
.qk-back{width:34px;height:34px;flex:0 0 auto;border:2px solid var(--line,#3a3a3a);border-radius:3px;background:transparent;color:var(--text,#fff);font-size:20px;line-height:1}
.qk-title{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.qk-title b{font:800 16px var(--sport,sans-serif);letter-spacing:.06em}
.qk-title small{font-size:10px;color:var(--text-dim,#9a9a9a)}
.qk-badge{flex:0 0 auto;font:700 9px var(--sport,sans-serif);color:#111;background:var(--gold,#f5c542);padding:2px 6px;border-radius:3px}
.qk-sec{margin-bottom:12px}
.qk-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px}
.qk-h b{font:700 12px var(--sport,sans-serif);color:var(--gold,#f5c542);letter-spacing:.04em}
.qk-h small{font-size:9.5px;color:var(--text-dim,#9a9a9a)}
.qk-link{border:0;background:none;color:var(--gold,#f5c542);font:700 10px var(--sport,sans-serif);padding:0}
.qk-opps{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.qk-opp.wide{grid-column:1/-1}
.qk-opp{position:relative;display:flex;align-items:center;gap:7px;padding:6px;border:1px solid rgba(255,255,255,.13);border-radius:5px;background:rgba(255,255,255,.04);text-align:left;color:inherit;min-width:0}
.qk-opp.on{border-color:var(--gold,#f5c542);background:rgba(245,197,66,.13)}
.qk-opp img{width:34px;height:34px;flex:0 0 auto;image-rendering:pixelated;object-fit:contain}
.qk-opp-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:0}
.qk-opp-txt b{font:700 11px var(--sport,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qk-opp-txt small{font-size:8.5px;color:var(--text-dim,#9a9a9a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qk-opp em{font:800 12px var(--sport,sans-serif);font-style:normal;color:var(--gold,#f5c542)}
.qk-levels{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.qk-levels button{padding:7px 4px;border:1px solid rgba(255,255,255,.14);border-radius:5px;background:rgba(255,255,255,.04);color:var(--text-dim,#9a9a9a)}
.qk-levels button.on{border-color:var(--gold,#f5c542);color:var(--gold,#f5c542);background:rgba(245,197,66,.12)}
.qk-levels b{display:block;font:700 11px var(--sport,sans-serif)}
.qk-levels small{font-size:8px;opacity:.78}
.qk-mine{display:flex;gap:5px}
.qk-mini{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border:1px solid rgba(255,255,255,.09);border-radius:5px;background:rgba(255,255,255,.03)}
.qk-mini img{width:44px;height:44px;image-rendering:pixelated;object-fit:contain}
.qk-mini b{font:700 9px var(--sport,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.qk-mini small{font-size:8px;color:var(--text-dim,#9a9a9a)}
.qk-empty{width:100%;text-align:center;font-size:10px;color:var(--text-dim,#9a9a9a);padding:12px 0}
.qk-foot{padding:10px 0 2px;border-top:1px solid rgba(255,255,255,.1);margin-top:2px}
.qk-vs{display:flex;align-items:center;justify-content:center;gap:8px;font-size:10.5px;color:var(--text-dim,#9a9a9a)}
.qk-vs b{color:var(--text,#fff);font-size:12px}
.qk-vs i{font-style:normal;font-weight:800;color:var(--gold,#f5c542)}
.qk-win{display:flex;align-items:center;gap:7px;margin:7px 0 9px;font-size:9.5px;color:var(--text-dim,#9a9a9a)}
.qk-bar{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.qk-bar i{display:block;height:100%;background:linear-gradient(90deg,#f5c542,#ffe9a8)}
.qk-win b{font:800 11px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.qk-note{margin:0;font-size:9.5px;line-height:1.55;color:var(--text-dim,#9a9a9a)}
.qk-slots{display:flex;gap:5px;margin-bottom:12px}
.qk-slot{flex:1;height:58px;display:grid;place-items:center;border:1px dashed rgba(255,255,255,.2);border-radius:5px;background:rgba(255,255,255,.03);color:var(--text-dim,#9a9a9a);font:700 9px var(--sport,sans-serif)}
.qk-slot.on{border-style:solid;border-color:rgba(245,197,66,.5);background:rgba(245,197,66,.08)}
.qk-slot.cur{border-color:var(--gold,#f5c542);box-shadow:0 0 0 1px var(--gold,#f5c542)}
.qk-slot img{width:46px;height:46px;image-rendering:pixelated;object-fit:contain}
.qk-cands{display:flex;flex-direction:column;gap:7px}
.qk-cand{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid rgba(255,255,255,.13);border-radius:5px;background:rgba(255,255,255,.04);text-align:left;color:inherit}
.qk-cand:active{border-color:var(--gold,#f5c542);background:rgba(245,197,66,.12)}
.qk-cand img{width:56px;height:56px;flex:0 0 auto;image-rendering:pixelated;object-fit:contain}
.qk-cand-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.qk-cand-txt b{font:700 13px var(--sport,sans-serif);color:#fff}
.qk-cand-txt small{font-size:9.5px;color:var(--gold,#f5c542)}
.qk-cand-txt em{font-style:normal;font-size:9px;color:var(--text-dim,#9a9a9a)}
.qk-start{width:100%;padding:12px 0;font-size:15px;letter-spacing:.22em}
.qk-foot .qk-ghost{width:100%;margin-top:7px;padding:9px 0}
.qk-res{position:relative;left:auto;top:auto;transform:none;width:100%;max-width:none;margin:8px auto 0;padding:18px 16px;border:3px solid var(--r-ink,#f2f2f2);border-radius:4px;background:var(--r-paper,#060606);box-shadow:7px 7px 0 rgba(255,255,255,.22);text-align:center;box-sizing:border-box}
.qk-res-kicker{font:700 9.5px var(--sport,sans-serif);letter-spacing:.14em;color:var(--text-dim,#9a9a9a)}
.qk-res h2{margin:6px 0 2px;font:800 28px var(--sport,sans-serif);letter-spacing:.18em;color:var(--gold,#f5c542)}
.qk-res h2.lose{color:#ff6b6b}
.qk-res-score{display:flex;align-items:center;justify-content:center;gap:10px;margin:4px 0 2px}
.qk-res-score b{font:800 30px var(--sport,sans-serif);color:#fff}
.qk-res-score i{font-style:normal;color:var(--text-dim,#9a9a9a)}
.qk-res-team{font-size:10.5px;color:var(--text-dim,#9a9a9a);letter-spacing:.1em}
.qk-res-note{margin:10px 0 14px;font-size:10px;line-height:1.6;color:var(--text-dim,#9a9a9a)}
.qk-res-acts{display:flex;flex-direction:column;gap:7px}
.qk-res-acts .pk-btn-gold{width:100%;padding:10px 0}
.qk-ghost{background:transparent!important;color:var(--text-dim,#9a9a9a)!important;border-color:var(--line,#3a3a3a)!important}
`;

const quickWinRate = (my, opp) =>
  Math.round(Math.max(0.05, Math.min(0.95, 0.5 + (my - opp) * 0.03)) * 100);

/** 快速比赛大厅：选对手 / 难度，只读当前存档，不写入任何进度 */
/** 快速比赛的路线/选秀/结算统一用弹窗；比赛本身仍全屏 */
function mountQuickModal(page) {
  document.querySelectorAll(".pj-scrim.qk-modal").forEach((n) => n.remove());
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal qk-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body"></div></div>`;
  page.classList.remove("sub-page", "screen-quick", "screen-quick-result");
  page.classList.add("qk-content");
  wrap.querySelector(".pj-page-body").appendChild(page);
  (document.getElementById("stage") || document.body).appendChild(wrap);
  return wrap;
}
function closeQuickModal(page) {
  page?.closest(".qk-modal")?.remove();
}

function openQuickMatch(save) {
  save = loadSave() || save;
  homeBgStop?.();
  homeBgStop = null;
  const ui = { stage: "gym1", level: "normal" };
  const stageOptions = [
    ...LEAGUE_GYMS.filter((g) => !g.elite).map((g) => ({ stage: "gym" + g.gym, gym: g })),
    { stage: "elite", gym: LEAGUE_GYMS.find((g) => g.elite) || LEAGUE_GYMS[0] },
  ];
  const page = el(`<div class="sub-page screen-quick"></div>`);
  mountQuickModal(page);

  const draw = () => {
    const cur = stageOptions.find((x) => x.stage === ui.stage) || stageOptions[0];
    const oppRoster = quickRoster(ui.stage, ui.level);
    const oppPower = oppRoster.length
      ? Math.round(oppRoster.reduce((a, p) => a + p.ovr, 0) / oppRoster.length)
      : 0;
    page.innerHTML = `<style>${QUICK_CSS}</style>
      <div class="page-head">
        <button class="back" data-qk-back aria-label="返回">‹</button>
        <h2>快速比赛</h2>
        <span class="count">无存档</span>
      </div>
      <p class="page-sub">2 节 × 2 分钟 · 临时选秀 · 不计战绩</p>
      <div class="qk-sec">
        <div class="qk-h"><b>选择对手</b><small>8 道馆 + 四天王 · 原版阵容</small></div>
        <div class="qk-opps">${stageOptions.map(({ stage, gym }) => {
          const roster = quickRoster(stage, ui.level);
          const power = roster.length ? Math.round(roster.reduce((a, p) => a + p.ovr, 0) / roster.length) : 0;
          const leader = stage === "elite" ? "四天王" : (GYM_LEADER_CN[(Number(gym.gym) || 1) - 1] || gym.leader);
          return `<button class="qk-opp${stage === ui.stage ? " on" : ""}${stage === "elite" ? " wide" : ""}" data-qk-stage="${stage}" style="--tc:${gym.color}">
            <img src="./sprites/${roster[0]?.dex ?? 1}.png" alt="">
            <span class="qk-opp-txt"><b>${leader}</b><small>${gym.name} · ${(gym.types || []).map((t) => TYPE_ZH[t] || t).join("/")}</small></span>
            <em>${power}</em>
          </button>`;
        }).join("")}</div>
      </div>
      <div class="qk-sec">
        <div class="qk-h"><b>难度</b><small>调整对手八维</small></div>
        <div class="qk-levels">${QUICK_LEVELS.map((lv) => `<button class="${ui.level === lv.id ? "on" : ""}" data-qk-level="${lv.id}"><b>${lv.name}</b><small>${lv.hint}</small></button>`).join("")}</div>
      </div>
      <div class="qk-sec">
        <div class="qk-h"><b>本场阵容</b><small>临时选秀 5 人</small></div>
        <p class="qk-note">进入后按 控卫 / 分卫 / 小前 / 大前 / 中锋 各选 1 只，只用于这一场；不读取、也不改动外面的球队和存档。</p>
      </div>
      <div class="qk-foot">
        <div class="qk-vs"><span>临时选秀队</span><i>VS</i><span>${cur.gym.name} <b>${oppPower}</b></span></div>
        <button class="pk-btn-gold qk-start" data-qk-start>选 人</button>
      </div>`;
  };
  draw();

  page.addEventListener("click", (e) => {
    if (e.target.closest("[data-qk-back]")) { closeQuickModal(page); showHome(loadSave() || save); return; }
    const st = e.target.closest("[data-qk-stage]");
    if (st) { ui.stage = st.dataset.qkStage; draw(); return; }
    const lv = e.target.closest("[data-qk-level]");
    if (lv) { ui.level = lv.dataset.qkLevel; draw(); return; }
    if (e.target.closest("[data-qk-start]")) {
      closeQuickModal(page);
      openQuickDraft(save, ui.stage, ui.level);
    }
  });
}

const QUICK_POS_ZH = { PG: "控卫", SG: "分卫", SF: "小前", PF: "大前", C: "中锋" };
const QUICK_POS_ORDER = ["PG", "SG", "SF", "PF", "C"];

/** 临时选秀：五个位置各选 1 只，用完即弃，不碰外部存档 */
function openQuickDraft(save, stage = "gym1", level = "normal") {
  save = loadSave() || save;
  const pool = quickDraftPool(stage, level);
  const ui = { round: 0, picks: [] };
  const oppRoster = quickRoster(stage, level);
  const oppPower = oppRoster.length
    ? Math.round(oppRoster.reduce((a, p) => a + p.ovr, 0) / oppRoster.length)
    : 0;
  const page = el(`<div class="sub-page screen-quick"></div>`);
  mountQuickModal(page);

  const draw = () => {
    const done = ui.round >= 5;
    const pos = QUICK_POS_ORDER[ui.round];
    const cands = done ? [] : (pool[pos] || []).map((d) => getPokemon(d));
    const myPower = ui.picks.length
      ? Math.round(ui.picks.reduce((a, d) => a + getPokemon(d).ovr, 0) / ui.picks.length)
      : 0;
    const winP = myPower ? quickWinRate(myPower, oppPower) : 0;
    page.innerHTML = `<style>${QUICK_CSS}</style>
      <div class="page-head">
        <button class="back" data-qk-back aria-label="返回">‹</button>
        <h2>快速比赛 · 选秀</h2>
        <span class="count">第 ${Math.min(5, ui.round + 1)}/5 轮</span>
      </div>
      <p class="page-sub">五位置各选 1 只 · 仅本场使用</p>
      <div class="qk-slots">${QUICK_POS_ORDER.map((p, i) => {
        const d = ui.picks[i];
        return `<div class="qk-slot${d ? " on" : ""}${i === ui.round && !done ? " cur" : ""}">
          ${d ? `<img src="./sprites/${d}.png" alt="">` : `<span>${QUICK_POS_ZH[p]}</span>`}
        </div>`;
      }).join("")}</div>
      ${done ? `
        <div class="qk-sec">
          <div class="qk-h"><b>阵容完成</b><small>${ui.picks.map((d) => cnMonName(d, getPokemon(d).name)).join("、")}</small></div>
          <div class="qk-vs"><span>我方 <b>${myPower}</b></span><i>VS</i><span>${stage === "elite" ? "四天王" : "道馆"} <b>${oppPower}</b></span></div>
          <div class="qk-win"><span>预计胜率</span><div class="qk-bar"><i style="width:${winP}%"></i></div><b>${winP}%</b></div>
          <p class="qk-note">这套阵容只在快速比赛里使用，比赛结束即散，不会进入队伍、图鉴或任何存档。</p>
        </div>
        <div class="qk-foot">
          <button class="pk-btn-gold qk-start" data-qk-go>开 球</button>
          <button class="pk-btn-gold qk-ghost" data-qk-redraft>重 选</button>
        </div>` : `
        <div class="qk-sec">
          <div class="qk-h"><b>第 ${ui.round + 1} 轮 · ${QUICK_POS_ZH[pos]}</b><button class="qk-link" data-qk-undo ${ui.picks.length ? "" : "disabled"}>撤回上一选</button></div>
          <div class="qk-cands">${cands.map((b) => `<button class="qk-cand" data-qk-pick="${b.dex}">
            <img src="./sprites/${b.dex}.png" alt="">
            <span class="qk-cand-txt"><b>${cnMonName(b.dex, b.name)}</b><small>${QUICK_POS_ZH[b.pos] || b.pos} · OVR ${b.ovr}</small><em>${(b.types || []).map((t) => TYPE_ZH[t] || t).join(" / ")}</em></span>
          </button>`).join("")}</div>
        </div>
        <p class="qk-note">只选本场阵容：不消耗你的精灵，也不改变外面球队的等级、训练和羁绊。</p>`}`;
  };
  draw();

  page.addEventListener("click", (e) => {
    if (e.target.closest("[data-qk-back]")) { closeQuickModal(page); openQuickMatch(save); return; }
    if (e.target.closest("[data-qk-undo]")) {
      if (ui.picks.length) { ui.picks.pop(); ui.round = Math.max(0, ui.round - 1); draw(); }
      return;
    }
    const pick = e.target.closest("[data-qk-pick]");
    if (pick && ui.round < 5) {
      ui.picks.push(Number(pick.dataset.qkPick));
      ui.round++;
      draw();
      return;
    }
    if (e.target.closest("[data-qk-redraft]")) { ui.picks = []; ui.round = 0; draw(); return; }
    if (e.target.closest("[data-qk-go]")) {
      if (ui.picks.length !== 5) return;
      closeQuickModal(page);
      startQuickMatch(save, stage, level, ui.picks);
    }
  });
}

/** 开始一场快速比赛；不结算、不发奖、不写存档 */
function startQuickMatch(save, stage = "gym1", level = "normal", dexes = []) {
  save = loadSave() || save;
  const cfg = buildQuickMatch(save, stage, level, dexes);
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, cfg, gameAudio, (engine, c, quit) => {
    if (quit) { showHome(loadSave() || save); return; }
    showQuickResult(save, engine, cfg);
  });
}

function showQuickResult(save, engine, cfg) {
  gameAudio.setTrack("menu");
  const score = engine?.score || [0, 0];
  const won = score[0] > score[1];
  const stage = cfg.quick?.stage || "gym1";
  const level = cfg.quick?.level || "normal";
  const page = el(`<div class="sub-page screen-quick-result"></div>`);
  mountQuickModal(page);
  page.innerHTML = `<style>${QUICK_CSS}</style>
    <div class="page-head">
      <h2>快速比赛结算</h2>
      <span class="count">不计战绩</span>
    </div>
    <p class="page-sub">临时阵容 · 不写存档</p>
    <div class="qk-res">
      <h2 class="${won ? "" : "lose"}">${won ? "胜 利" : "惜 败"}</h2>
      <p class="qk-res-score"><b>${score[0]}</b><i>:</i><b>${score[1]}</b></p>
      <p class="qk-res-team">${cfg.home.abbr} · ${cfg.away.abbr}</p>
      <p class="qk-res-note">本场不消耗次数、不发奖励，也不影响主线进度和战绩；临时选秀阵容不会进入你的球队。</p>
      <div class="qk-res-acts">
        <button class="pk-btn-gold" data-qk-again>再来一场</button>
        <button class="pk-btn-gold" data-qk-redraft>重选阵容</button>
        <button class="pk-btn-gold qk-ghost" data-qk-switch>换对手</button>
        <button class="pk-btn-gold qk-ghost" data-qk-home>回主页</button>
      </div>
    </div>`;
  page.addEventListener("click", (e) => {
    if (e.target.closest("[data-qk-again]")) {
      closeQuickModal(page);
      startQuickMatch(save, stage, level, cfg.quick?.dexes || []);
      return;
    }
    if (e.target.closest("[data-qk-redraft]")) { closeQuickModal(page); openQuickDraft(save, stage, level); return; }
    if (e.target.closest("[data-qk-switch]")) { closeQuickModal(page); openQuickMatch(save); return; }
    if (e.target.closest("[data-qk-home]")) { closeQuickModal(page); showHome(loadSave() || save); }
  });
}

/** 新手判定：没有任何比赛记录、未看过引导，且没有走过新手之路的操作教程 */
function isRookie(save) {
  if (!save?.journey || save.journey.guideDone) return false;
  // 新手之路里已经完整教过移动/传球/上篮/扣篮/空接/投篮/抢断/盖帽，第一场正式比赛不再重复弹操作导引
  if (save.newbie?.tutorialDone || save.newbie?.done) return false;
  const games = (save.stats?.w || 0) + (save.stats?.l || 0);
  const results = save.journey.season?.results?.length || 0;
  return games === 0 && results === 0;
}

/** 首场 30 秒非阻塞操作引导：移动 → 投篮 → 传球/必杀 */
function showRookieGuide(page, save) {
  save.journey.guideDone = true;
  writeSave(save);
  const steps = [
    { t: "移动", d: "按住左下摇杆拖动。进攻时跑位，防守时跟住对位球员。" },
    { t: "投篮", d: "按住投篮键蓄力，按键填满发白的瞬间松开。空位出手更稳。" },
    { t: "传球 / 必杀", d: "点传球给队友；必杀槽满后点必杀；抢断键断球；把摇杆推到外圈自动冲刺。" },
  ];
  const box = document.createElement("div");
  box.className = "rookie-guide";
  box.innerHTML = `<div class="rg-card">
    <button class="rg-skip" type="button">跳过</button>
    <div class="rg-step"></div>
    <b class="rg-title"></b>
    <p class="rg-desc"></p>
    <div class="rg-dots"></div>
  </div>`;
  page.appendChild(box);
  let i = 0;
  const render = () => {
    const s = steps[i];
    box.querySelector(".rg-step").textContent = `新手引导 ${i + 1}/${steps.length}`;
    box.querySelector(".rg-title").textContent = s.t;
    box.querySelector(".rg-desc").textContent = s.d;
    box.querySelector(".rg-dots").innerHTML = steps.map((_, n) => `<i class="${n <= i ? "on" : ""}"></i>`).join("");
  };
  render();
  const timer = setInterval(() => {
    i += 1;
    if (i >= steps.length) { finish(); return; }
    render();
  }, 10000);
  const guard = setInterval(() => {
    if (!page.isConnected) {
      clearInterval(timer); clearInterval(guard);
      box.remove();
    }
  }, 1000);
  const finish = () => {
    clearInterval(timer); clearInterval(guard);
    box.classList.add("out");
    setTimeout(() => box.remove(), 320);
  };
  box.querySelector(".rg-skip").addEventListener("click", finish);
}

/** 真正进入比赛（赛前页点继续后调用） */
function startMatchNow(save, mode = "league") {
  save = loadSave() || save;
  const cfg = buildGymMatch(save, mode);
  if (!cfg) return showHome(loadSave() || save);
  const gym = cfg.gym;
  const rookie = isRookie(save);
  gameAudio.unlock();
  gameAudio.setMuted(localStorage.getItem("pokedunk.muted") === "1");
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  // 默认按设置里的「赛前演出」播放入场 + 首发阵容动画
  mountMatch(page, cfg, gameAudio, (engine, c, quit, simulated) => {
    // 暂停菜单退出：直接回主界面，不结算、不判负
    if (quit) { showHome(loadSave() || save); return; }
    showResult(save, engine, quit, gym, simulated, mode);
  });
  if (rookie) showRookieGuide(page, save);
}

/** 观战：双方 AI 自动比赛（奖励按模拟口径结算） */
function startAutoMatch(save, cfg, mode = "league") {
  save = loadSave() || save;
  cfg ||= buildGymMatch(save, mode);
  if (!cfg) return showHome(loadSave() || save);
  const autoCfg = { ...cfg, home: { ...cfg.home, human: false }, away: { ...cfg.away, human: false } };
  gameAudio.unlock();
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  mountMatch(page, autoCfg, gameAudio, (engine, c, quit) => showResult(save, engine, quit, cfg.gym, true, mode, true), { spectator: true, startingFive: false });
}

/** 赛后升级/进化中心弹窗队列：逐个播放 anims 事件 */
function playResultAnims(r) {
  const anims = (r.anims || []).slice();
  const skipAll = () => { anims.length = 0; };
  const next = () => {
    const a = anims.shift();
    if (!a) return;
    // "+1 终结" 合并成 { k: "终结", v: "+2" }，多级升级只展示一张卡
    const cnt = {};
    (a.growth || []).forEach((g) => {
      const m = String(g).match(/^\+\d+\s+(.+)$/);
      const k = m ? m[1] : String(g);
      cnt[k] = (cnt[k] || 0) + 1;
    });
    const changes = Object.entries(cnt).map(([k, v]) => ({ k, v: `+${v}` }));
    if (a.type === "evolve") {
      playEvolve({
        oldDex: a.oldDex,
        newDex: a.newDex,
        title: `进化！${a.oldName} → ${a.newName}`,
        sub: `Lv.${a.level ?? ""} · ${a.merged ? "与已有同种融合，训练点已返还" : "等级保持不变，位置已随形态更新"}`,
        changes,
        onSkipAll: skipAll,
      }, next);
    } else {
      const levels = a.levels || 1;
      const to = a.toLevel ?? a.level ?? 1;
      const from = a.fromLevel ?? Math.max(1, to - levels + 1);
      const name = cnMonName(a.dex, getPokemon(a.dex).name);
      playEvolve({
        oldDex: a.dex,
        title: levels > 1 ? `升级！${name} Lv.${from} → Lv.${to}` : `升级！${name} Lv.${to}`,
        sub: `升了 ${levels} 级 · 随机成长已加入面板`,
        changes,
        onSkipAll: skipAll,
      }, next);
    }
  };
  next();
}

const AD_DOUBLE_KEY = "pokedunk.addouble.v1";
function adDoubleDay() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function adDoubleLeft() {
  try {
    const d = JSON.parse(localStorage.getItem(AD_DOUBLE_KEY) || "{}");
    return d.date === adDoubleDay() ? Math.max(0, 2 - (d.count || 0)) : 2;
  } catch { return 2; }
}
function markAdDouble() {
  const day = adDoubleDay();
  let d = {};
  try { d = JSON.parse(localStorage.getItem(AD_DOUBLE_KEY) || "{}"); } catch {}
  const count = d.date === day ? (d.count || 0) : 0;
  try { localStorage.setItem(AD_DOUBLE_KEY, JSON.stringify({ date: day, count: count + 1 })); } catch {}
}

/** 中文精灵名（优先图鉴表，回退引擎名） */
function cnMonName(dex, fallback) {
  const row = (window.__PJ_DEX_ROWS || []).find((r) => r[0] === dex);
  return String(row?.[1] ?? fallback ?? "?").replace(/#\d+$/, "");
}

/** 战后双方数据：首发 + 有出场时间的替补 */
function boxScoreHtml(engine) {
  if (!engine?.players?.length) return "";
  const table = (teamIdx) => {
    const players = engine.players
      .filter((p) => p.team === teamIdx && (p.slot >= 0 || (p.stats?.sec || 0) > 0))
      .sort((a, b) => (a.slot >= 0 ? a.slot : 99 + (a.rotation || 0)) - (b.slot >= 0 ? b.slot : 99 + (b.rotation || 0)));
    const rows = players.map((p) => {
      const s = p.stats || {};
      return `<tr class="${p.slot >= 0 ? "" : "bn"}"><td>${cnMonName(p.mon?.dex, p.mon?.name)}</td><td>${s.pts || 0}</td><td>${s.reb || 0}</td><td>${s.ast || 0}</td><td>${s.stl || 0}</td><td>${s.blk || 0}</td><td>${s.fgm || 0}/${s.fga || 0}</td><td>${s.tpm || 0}/${s.tpa || 0}</td></tr>`;
    }).join("");
    return `<div class="bs-team-row">
      <b>${engine.teams[teamIdx]?.name || (teamIdx === 0 ? "我方" : "对方")}<span>${engine.score[teamIdx] || 0}</span></b>
      <table class="bs-table"><thead><tr><th>精灵</th><th>分</th><th>板</th><th>助</th><th>断</th><th>帽</th><th>命中</th><th>三分</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  };
  return `<div class="rs-boxscore">
    <div class="bs-head"><b>本场数据</b><small>分 · 板 · 助 · 断 · 帽 · 命中</small></div>
    ${table(0)}${table(1)}
  </div>`;
}

function showResult(save, engine, quit, gym, simulated = false, mode = "league", spectate = false) {
  gameAudio.setTrack("menu");
  const page = app.firstElementChild;
  // 败局复活：结算前留档，看广告可撤销本场重打（每日 1 次）
  const reviveEligible = !quit && !simulated && !spectate && engine && engine.score[0] <= engine.score[1];
  const reviveSnapshot = reviveEligible ? JSON.stringify(save) : null;
  const r = settleMatchResult(save, engine, quit ? null : (engine?.cfg?.gym ?? gym), quit, simulated, mode);
  // 教练声望：把比赛接进局外成长；四天王有额外加成，模拟减半
  const repGain = !quit && !spectate && !simulated
    ? Math.max(0, Math.round((r.won ? 20 : 8) + (mode === "elite" ? 15 : mode === "playoff" ? 10 : 0)))
    : 0;
  const repUp = repGain ? addRep(save, repGain, "match") : null;
  if (repGain) { bumpRepMission(save, "match"); writeSave(save); }
  const adDouble = !simulated && !spectate && !quit && r.coinsGained > 0 && adDoubleLeft() > 0;
  const canRevive = !!reviveSnapshot && !r.won && adLeft("match_revive", 1) > 0;

  // 升级/进化中心弹窗队列（赛后自动逐个播放）
  playResultAnims(r);

  page.classList.add("result-screen");
  page.innerHTML = `
    <div class="rs-card ${r.won ? "win" : "lose"}">
      <span class="rs-kicker">${r.smallName}${r.simulated ? (spectate ? " · 观战" : " · 模拟") : ""}</span>
      <h2 class="rs-title">${quit ? "中途离场" : r.champion ? "总 冠 军" : r.won ? "胜 利" : "惜 败"}</h2>
      <p class="rs-score">${engine ? `${engine.teams[0].abbr} <b>${r.myScore}</b> : <b>${r.oppScore}</b> ${engine.teams[1].abbr}` : quit ? "未打完，按判负记入战绩" : ""}</p>
      <div class="res-lines rs-lines">
        <p class="res-line"><span class="coin-ico">${COIN_SVG}</span><span>篮球币 +${r.coinsGained}（${r.won ? "胜利奖励" : "安慰奖"}）</span></p>
        ${repGain ? `<p class="res-line"><span class="res-dot"></span><span>教练声望 +${repGain}${repUp?.levelUps?.length ? ` · 教练等级提升到 Lv.${repUp.level}` : ""}</span></p>` : ""}
        <p class="res-line"><span class="res-dot"></span><span>${r.seasonEnded ? "地区冠军达成 · 前往下一地区" : mode === "elite" ? "四天王挑战结束 · 可再次挑战" : `下一场：${r.nextLabel}`}</span></p>
        <p class="res-line">${ICON.trophy}<span>战绩 ${save.stats.w} 胜 ${save.stats.l} 负</span></p>
        ${r.badgeGained ? `<p class="res-line res-gold">${BADGE_SVG}<span>获得「${r.badgeName || "道馆"}」徽章！</span></p>` : ""}
        ${r.fourKings && r.won ? `<p class="res-line res-gold">${ICON.trophy}<span>四天王挑战完成！</span></p>` : ""}
        ${r.fourKingsReward ? `<p class="res-line res-gold">${ICON.trophy}<span>四天王首通奖励：${COIN_SVG} +${FOUR_KINGS_REWARD.coins} 币 · 高级树果 ×${FOUR_KINGS_REWARD.berryPremium} · 孵蛋加速券 ×${FOUR_KINGS_REWARD.hatch}</span></p>` : ""}
        ${r.champion ? `<p class="res-line res-gold">${ICON.trophy}<span>地区冠军！奖杯与 400 币已入库${r.mvp ? ` · 地区 MVP：${r.mvp.name}` : ""}</span></p>` : ""}
        ${r.legendReward ? `<p class="res-line res-gold"><span>✦</span><span>地区传说已解锁：${r.legendReward.choices.length} 选 1，当前还可领 ${r.legendReward.claims || 1} 只</span></p>` : ""}
        ${r.berryDrop ? `<p class="res-line res-gold">${ICON.berry}<span>树果：普通 ×${r.berryDrop.normal}${r.berryDrop.premium ? ` · 高级 ×${r.berryDrop.premium}` : ""}（背包查看）</span></p>` : ""}
        ${r.itemDrop ? `<p class="res-line res-gold">${GIFT_SVG}<span>战利品：${r.itemDrop.name} ×1（背包查看）</span></p>` : ""}
        ${r.itemGained ? `<p class="res-line res-gold">${GIFT_SVG}<span>获得道具：${r.itemName}</span></p>` : ""}
        ${r.contract ? (() => {
          const offers = r.contract.offers || [r.contract];
          return `<div class="res-contract-list" id="res-contract-card">
            <div class="rc-head"><b>${SIGN_SVG}精灵合同 · 3 选 1</b><small>原价签一只 · 看广告可免费多签一只</small></div>
            ${offers.map((o, i) => `<div class="res-contract rc-opt">
              <img src="./sprites/${o.dex}.png" alt="">
              <span class="rc-info">
                <b>${o.name}</b>
                <small>OVR ${o.ovr} · ${o.rarity} · <em>${o.price}</em> 币</small>
              </span>
              <span class="rc-acts">
                <button class="rc-sign" data-contract-i="${i}"${save.coins < o.price ? " disabled" : ""}>${save.coins < o.price ? `币不足 ${o.price}` : `签下 ${o.price} 币`}</button>
                <button class="rc-sign rc-ad" data-contract-ad="${i}"${adLeft("contract_free", 1) <= 0 ? " disabled" : ""}>${adLeft("contract_free", 1) <= 0 ? "今日已用" : "广告免费多签"}</button>
              </span>
            </div>`).join("")}
          </div>`;
        })() : ""}
        ${engine ? boxScoreHtml(engine) : ""}
        ${r.xpEvents.length ? `<div class="res-xp">${r.xpEvents.map((e) => `<p class="res-line">${UP_SVG}<span>${e}</span></p>`).join("")}</div>` : ""}
      </div>
      <div class="rs-actions">
        ${adDouble ? `<button class="pk-btn-gold rs-ad" id="res-ad">看广告 · 金币 ×3（今日 ${adDoubleLeft()} 次）</button>` : ""}
        ${canRevive ? `<button class="pk-btn-gold" id="res-revive">看广告 · 撤销本场败局重打</button>` : ""}
        ${r.legendReward ? `<button class="pk-btn-gold rs-legend" id="res-legend">✦ 选择地区传说 · ${r.legendReward.choices.length} 选 1</button>` : ""}
        ${mode === "elite" && !r.seasonEnded && !r.fourKingsCleared ? `<button class="pk-btn-gold" id="res-fk">再次挑战四天王</button>` : ""}
        <button class="pk-btn-gold" id="res-next">${r.seasonEnded ? "进入下一地区" : mode === "elite" ? "回 到 主 线" : "下 一 场"}</button>
        <button class="pk-btn-gold pm-ghost" id="res-home">回 主 界 面</button>
      </div>
    </div>`;
  if (r.badgeGained) {
    playBadgeGrant(r.badgeGained, {
      delay: 520,
      onShow: () => gameAudio.play("special"),
    });
  }
  page.querySelector("#res-ad")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "播放中…";
    const ad = await watchRewardedAd("match_double");
    if (!ad.ok) {
      btn.disabled = false;
      btn.textContent = "广告暂不可用";
      return;
    }
    save.coins += r.coinsGained * 2;
    writeSave(save);
    markAdDouble();
    btn.textContent = `已领取 +${r.coinsGained * 2} 币`;
  });
  page.querySelector("#res-revive")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "播放中…";
    const ad = await watchRewardedAd("match_revive");
    if (!ad.ok) {
      btn.disabled = false;
      btn.textContent = "看广告 · 撤销本场败局重打";
      return;
    }
    if (!adUse("match_revive", 1)) {
      btn.textContent = "今日复活次数已用完";
      return;
    }
    try {
      const restored = JSON.parse(reviveSnapshot);
      writeSave(restored);
      showMatch(restored, mode);
    } catch {
      btn.textContent = "存档恢复失败";
    }
  });
  page.querySelector("#res-legend")?.addEventListener("click", (e) => {
    const btn = e.currentTarget;
    let claimed = false;
    openLegendPicker(loadSave() || save, r.legendReward, {
      onClaim: () => { claimed = true; },
      onClose: () => {
        if (!claimed) return;
        btn.disabled = true;
        btn.textContent = "✦ 地区传说已领取";
      },
    });
  });
  page.querySelectorAll("[data-contract-ad]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      const idx = Number(btn.dataset.contractAd);
      const offers = r.contract?.offers || (r.contract ? [r.contract] : []);
      const offer = offers[idx];
      if (!offer) return;
      btn.disabled = true;
      btn.textContent = "播放中…";
      const ad = await watchRewardedAd("contract_free");
      if (!ad.ok) {
        btn.disabled = false;
        btn.textContent = "广告免费多签";
        return;
      }
      if (!adUse("contract_free", 1)) {
        btn.textContent = "今日已用";
        return;
      }
      // 广告权益：额外免费多签一只
      const res = signContract(loadSave() || save, { ...offer, price: 0 });
      if (!res.ok) {
        btn.disabled = false;
        btn.textContent = res.error;
        return;
      }
      page.querySelectorAll("[data-contract-ad]").forEach((b) => { b.disabled = true; });
      page.querySelectorAll(`[data-contract-i="${idx}"]`).forEach((b) => { b.disabled = true; });
      btn.textContent = "已免费多签";
      playAcquire({
        dex: offer.dex,
        kicker: "广告免费多签",
        title: `获得 ${offer.name}`,
        sub: `Lv.${res.level} · OVR ${offer.ovr} · ${offer.rarity} · 免费 · 已加入${res.movedTo === "team" ? "队伍" : "仓库"}`,
        z: 1200,
      }, () => {});
    });
  });

  page.querySelectorAll("[data-contract-i]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.contractI);
      const offers = r.contract?.offers || (r.contract ? [r.contract] : []);
      const offer = offers[idx];
      if (!offer) return;
      btn.disabled = true;
      const res = signContract(loadSave() || save, offer);
      if (!res.ok) {
        btn.disabled = false;
        btn.textContent = res.error;
        return;
      }
      btn.textContent = "签约中…";
      page.querySelectorAll("[data-contract-i]").forEach((b) => { if (b !== btn) b.disabled = true; });
      page.querySelectorAll(`[data-contract-ad="${idx}"]`).forEach((b) => { b.disabled = true; });
      playAcquire({
        dex: offer.dex,
        kicker: "合同签约",
        title: `获得 ${offer.name}`,
        sub: `Lv.${res.level} · OVR ${offer.ovr} · ${offer.rarity} · 已加入${res.movedTo === "team" ? "队伍" : "仓库"}`,
        z: 1200,
      }, () => {
        btn.classList.add("signed");
        btn.textContent = `已签约 · 加入${res.movedTo === "team" ? "队伍" : "仓库"}`;
      });
    });
  });
  page.querySelector("#res-fk")?.addEventListener("click", () => showMatch(loadSave() || save, "elite"));
  page.querySelector("#res-home").addEventListener("click", () => showHome(loadSave() || save));
  page.querySelector("#res-next").addEventListener("click", () => {
    const f = loadSave() || save;
    if (r.seasonEnded) {
      const nr = startNextSeason(f);
      writeSave(f);
      showHome(f);
      if (nr?.blocked) openMainQuestPage(f, `${nr.region.name}内容制作中，先保留当前冠军进度`);
      return;
    }
    if (mode === "elite") { openMainQuestPage(f); return; }
    showMatch(f, mode);
  });
  mountGuide("result", save, { root: page });

  // 总冠军颁奖庆典：结算页出来后自动弹出（移植原版夺冠颁奖）
  if (r.champion && !simulated && !spectate) {
    const f = loadSave() || save;
    const pending = pendingLegend(f);
    setTimeout(() => {
      openChampionCeremony({
        save: f,
        awards: r.awards || se.awards || [],
        mvp: r.mvp || (se.awards || []).find((a) => a.key === "mvp"),
        regionName: regionOf(f).name,
        teamName: `${f.coach?.name || "我"}队`,
        w: f.stats.w,
        l: f.stats.l,
        legendPending: pending,
        onLegend: () => openLegendPicker(loadSave() || f, pendingLegend(loadSave() || f), {}),
        onNext: () => {
          const g = loadSave() || f;
          const nr = startNextSeason(g);
          writeSave(g);
          showHome(g);
          if (nr?.blocked) openMainQuestPage(g, `${nr.region.name}内容制作中，先保留当前冠军进度`);
        },
        onHome: () => showHome(loadSave() || f),
      });
    }, 700);
  }
}

/* ================= 每日挑战：开球 + 结果 ================= */
function startDaily(save) {
  save = loadSave() || save;
  if (!hasFullLineup(save)) { showHome(save); openLineupGate(save); return; }
  gameAudio.setTrack(null);
  const page = el(`<div class="sub-page screen-match"></div>`);
  app.replaceChildren(page);
  const cfg = buildDailyMatch(save);
  const rookie = isRookie(save);
  gameAudio.unlock();
  mountMatch(page, cfg, gameAudio, (engine, c, quit) => showDailyResult(save, engine, quit, page));
  if (rookie) showRookieGuide(page, save);
}

function showDailyResult(save, engine, quit, page = app.firstElementChild) {
  gameAudio.setTrack("menu");
  const r = settleDaily(save, engine, quit, false);
  // 教练声望：每日挑战也喂局外成长
  const repGain = !r.quit ? (r.won ? 18 : 8) : 0;
  const repUp = repGain ? addRep(save, repGain, "daily") : null;
  if (repGain) { bumpRepMission(save, "daily"); writeSave(save); }
  // 每日挑战榜：按当天一张榜上报，平台只保留当天最高分
  const rankSubmit = !r.quit && r.score > 0 ? submitDailyScore(r.score) : null;
  const again = `<button class="pk-btn-gold" id="daily-again">再来一局</button>`;
  const home = `<button class="pk-btn-gold pm-ghost" id="daily-home">回主界面</button>`;
  page.classList.add("result-screen");

  if (r.quit) {
    page.innerHTML = `
      <div class="rs-card lose daily-result">
        <span class="rs-kicker">每日挑战</span>
        <h2 class="rs-title">中途离场</h2>
        <p class="rs-score">本场不计分 · 不发奖励</p>
        <div class="res-lines rs-lines"><p class="res-line"><span class="res-dot"></span><span>今日最佳 ${r.best || "—"} 分 · 已挑战 ${r.plays} 场</span></p></div>
        <div class="rs-actions">${again}${home}</div>
      </div>`;
  } else {
    const d = r.detail;
    page.innerHTML = `
      <div class="rs-card daily-result ${r.won ? "win" : "lose"}">
        <span class="rs-kicker">每日挑战</span>
        <h2 class="rs-title">${r.won ? "挑战胜利" : "挑战惜败"}</h2>
        <p class="rs-score">${engine.teams[0].abbr} <b>${r.myScore}</b> : <b>${r.oppScore}</b> ${engine.teams[1].abbr}</p>
        <div class="dr-score"><b>${r.score}</b><small>挑战分${r.newBest ? " · 新纪录！" : ""}</small></div>
        <p class="dr-break">${(() => {
          const w = d.weights || {};
          const parts = [`得分 ${d.pts}`, `三分 ${d.tpm}×${w.tpm ?? 2}`, `扣篮 ${d.dnk}×${w.dnk ?? 3}`, `抢断 ${d.stl}×${w.stl ?? 2}`, `盖帽 ${d.blk}×${w.blk ?? 2}`];
          if (w.reb) parts.push(`篮板 ${d.reb}×${w.reb}`);
          parts.push(`胜利 ${d.winBonus}`);
          return parts.join(" + ");
        })()}</p>
        <div class="res-lines rs-lines">
          ${r.firstWin ? `<p class="res-line res-gold"><span class="coin-ico">${COIN_SVG}</span><span>今日首胜 +100 篮球币</span></p>` : ""}
          ${(r.milestones || []).map((m) => {
            if (m.mon?.ok) return `<p class="res-line res-gold"><span>✦</span><span>${m.score} 分奖励：稀有精灵「${m.mon.name}」加入${m.mon.placed === "box" ? "仓库" : "队伍"}！</span></p>`;
            if (m.mon) return `<p class="res-line res-gold"><span>✦</span><span>${m.score} 分奖励：本周稀有精灵已领取，下周刷新</span></p>`;
            if (m.legend?.ok) return `<p class="res-line res-gold"><span>✦</span><span>${m.score} 分奖励：传说精灵「${m.legend.name}」加入${m.legend.placed === "box" ? "仓库" : "队伍"}！</span></p>`;
            if (m.legend) return `<p class="res-line res-gold"><span>✦</span><span>${m.score} 分奖励：本周传说精灵已领取，下周刷新</span></p>`;
            return `<p class="res-line res-gold"><span class="coin-ico">${COIN_SVG}</span><span>${m.score} 分奖励：+${m.coin} 篮球币</span></p>`;
          }).join("")}
          <p class="res-line"><span class="res-dot"></span><span>今日最佳 ${r.best} 分 · 已挑战 ${r.plays} 场（${r.wins} 胜）</span></p>
          ${repGain ? `<p class="res-line"><span class="res-dot"></span><span>教练声望 +${repGain}${repUp?.levelUps?.length ? ` · 教练等级提升到 Lv.${repUp.level}` : ""}</span></p>` : ""}
          <p class="res-line" id="daily-rank-note" style="display:none"></p>
          <p class="res-line" style="color:var(--text-dim);font-size:11.5px"><span class="res-dot" style="background:var(--text-dim)"></span><span>当日任务可在「每日挑战」面板领取</span></p>
        </div>
        <div class="rs-actions">${again}${home}</div>
      </div>`;
  }
  rankSubmit?.then((res) => {
    const note = page.querySelector("#daily-rank-note");
    if (!note || !res?.ok) return;
    const action = res.data?.action;
    note.style.display = "";
    note.innerHTML = `<span class="res-dot"></span><span>今日排行榜：${action === "update" ? "已刷新今日最高分" : action === "insert" ? "已上榜" : "保留今日最高分"}</span>`;
  });
  if (!r.quit && r.milestones?.length) {
    const gains = [];
    for (const m of r.milestones) {
      if (m.mon?.ok && m.mon.dex) gains.push({ dex: m.mon.dex, name: m.mon.name, placed: m.mon.placed, score: m.score, kind: "稀有" });
      if (m.legend?.ok && m.legend.dex) gains.push({ dex: m.legend.dex, name: m.legend.name, placed: m.legend.placed, score: m.score, kind: "传说" });
    }
    if (gains.length) {
      setTimeout(() => {
        if (!page.isConnected) return;
        for (const g of gains) {
          playAcquire({
            dex: g.dex,
            kicker: `每日挑战 ${g.score} 分奖励`,
            title: `获得 ${g.name || ""}`,
            sub: `${g.kind}精灵 · 已加入${g.placed === "box" ? "仓库" : "队伍"}`,
          });
        }
      }, 450);
    }
  }
  page.querySelector("#daily-again")?.addEventListener("click", () => startDaily(loadSave() || save));
  page.querySelector("#daily-home")?.addEventListener("click", () => showHome(loadSave() || save));
}

/* ================= 子页面：图鉴 ================= */
/* ================= 子页弹窗壳（图鉴/队伍/商店/孵蛋/背包统一为浮层卡片） ================= */
function openPageModal(renderFn, save) {
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  wrap.innerHTML = `<div class="pj-page-card"><div class="sub-page pj-page-body"></div></div>`;
  const body = wrap.querySelector(".pj-page-body");
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    showHome(loadSave() || save); // 关闭后刷新主页数据（金币/队伍/图鉴计数）
  };
  renderFn(body);
  // 返回键 / 队伍、背包自定义返回事件 / 点击遮罩：统一关闭
  body.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) close(); });
  body.addEventListener("team-back", close);
  body.addEventListener("bag-back", close);
  // 子页内部跳转（如孵蛋空槽 → 商店）：关闭当前卡片后打开目标卡片
  body.addEventListener("page-goto", (e) => {
    if (e.detail === "shop") {
      close();
      showSub(renderShop, loadSave() || save);
      return;
    }
    if (e.detail === "newbie") {
      close();
      setTimeout(() => openNewbieQuest(loadSave() || save), 80);
    }
  });
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  (document.getElementById("stage")||document.body).appendChild(wrap);
  return close;
}

function showDex(save) {
  switchTab("dex");
}
function showCareer(save) {
  openTeamSub("career");
}
function showTeam(save) {
  // 新手之路：打开队伍页不直接算完成，回到主页后会检查新伙伴是否已进入首发
  switchTab("team");
}
function showBag(save) {
  openTeamSub("bag");
}
function showSub(renderFn, save) {
  if (renderFn === renderTrain) { openTeamSub("train"); return; }
  if (renderFn === renderShop) { openShopSub("shop"); return; }
  if (renderFn === renderEgg) { openShopSub("egg"); return; }
  if (renderFn === renderBag) { openTeamSub("bag"); return; }
  if (renderFn === renderCareer) { openTeamSub("career"); return; }
  openPageModal(renderFn, save);
}

// 精灵详情「去升级」：关闭当前页面弹层，直接打开培养强化并定位该精灵
window.addEventListener("pj-open-train", (e) => {
  const fresh = loadSave();
  if (!fresh) return;
  focusTrainMon(e.detail?.monId ?? null);
  document.querySelectorAll(".pj-scrim.page-modal").forEach((n) => n.remove());
  showSub(renderTrain, fresh);
});

/* ================= 启动路由 ================= */
// settle.js 引用 play-core 内部符号（xpToNext/rollGrowth/LEAGUE_GYMS 等已由引擎直连导出）
window.__PC = await import("../engine/readable/play-core.js?v=698");
preloadSprites?.([]); // 触发引擎资源预载（容错）
installAudioUnlock();
const existing = loadSave();
if (existing) {
  // 修复历史存档：商店/孵蛋/合同可能把进化后的形态以 Lv.1 入队
  let repaired = false;
  for (const [id, mon] of Object.entries(existing.mons || {})) {
    const before = mon.level || 1;
    const after = syncAcquireLevel(existing, id, mon.dex);
    if (after > before) repaired = true;
  }
  // 清理指向不存在个体的队伍/仓库/首发引用，避免旧档在渲染阵容时直接崩溃
  const mons = existing.mons || {};
  const beforeTeam = (existing.team || []).length;
  existing.team = (existing.team || []).filter((id) => mons[id]);
  existing.box = (existing.box || []).filter((id) => mons[id]);
  if (existing.team.length !== beforeTeam) repaired = true;
  for (const map of [existing.assign, existing.benched]) {
    if (!map) continue;
    for (const id of Object.keys(map)) if (!mons[id]) { delete map[id]; repaired = true; }
  }
  if (repaired) writeSave(existing);
}
// 先出首屏，再结算离线草地收益：
// 长时间挂机后 grantXp 可能要连续处理多级成长，放在首帧前会推迟主页绘制，表现为黑屏。
const hasCareer = !!(existing && existing.journey.stage !== "starter");
try {
  if (hasCareer) showHome(existing);
  else showStart();
} finally {
  window.__pjBootDone?.();
}
if (hasCareer) {
  setTimeout(() => {
    const fresh = loadSave() || existing;
    const refreshHint = (f) => {
      try {
        const hint = document.querySelector('[data-go="train"] .hm-txt small');
        if (hint) {
          const busy = grassState(f).some((g) => !g.empty);
          hint.textContent = busy ? "挂机中" : "今日未安排";
        }
      } catch {}
    };
    const pending = offlineGrassPending(fresh);
    // 离线 ≥30 分钟才先弹「离线收益」；少于 30 分钟静默结算，避免频繁打扰
    if (pending.total > 0 && pending.idleMs >= 30 * 60 * 1000) {
      showOfflineGrass(fresh, pending, { onDone: refreshHint });
      return;
    }
    settleOffline(fresh);
    writeSave(fresh);
    refreshHint(fresh);
  }, 80);
}



















