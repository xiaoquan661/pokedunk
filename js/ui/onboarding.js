/**
 * ui/onboarding.js —— 新玩家局外流程指引（v3）
 * 只覆盖局外：主页入口 → 赛季页 → 赛前对阵 → 赛后结算。
 * 比赛内操作仍使用原有 rookie-guide，不在这里重复。
 * 状态：save.guide = { v: 1, step: 0, done: false }
 */
import { loadSave, writeSave } from "../storage.js?v=40";

const STEPS = [
  {
    screen: "home",
    target: ".top-row",
    title: "资源与目标",
    text: "篮球币来自比赛、每日挑战、每日活跃任务和看广告，用于商店、孵蛋、树果和训练。徽章来自击败馆主：常规赛每赢一个馆主得 1 枚，8 枚解锁四天王；赛季结束重置。",
    action: "下一步",
  },
  {
    screen: "home",
    target: '[data-go="team"]',
    title: "队伍与位置",
    text: "队伍最多 10 只，前 5 只首发。每只精灵有速度、投篮、终结、传球、防守、盖帽、篮板、控球八项能力；卡片上的推荐位置由这八项算出。把精灵放到不合适的位置会降低有效属性，优先拖到推荐槽位。",
    action: "下一步",
  },
  {
    screen: "home",
    target: '[data-go="shop"]',
    title: "每日商店",
    text: "每日商店每天刷新精灵、宝可蛋和树果，记得每天来看。购买后用「孵蛋」入口孵化；普通蛋 30 分钟、高级蛋 3 小时，高级蛋必出稀有且传说率更高。",
    action: "下一步",
  },
  {
    screen: "home",
    target: '[data-go="egg"]',
    title: "孵蛋与成长",
    text: "商店买的蛋在「孵蛋」页放入槽位后开始计时；默认 1 个槽位，可购买 1 个、看广告再送 1 个，最多 3 个。背包里的树果可以给精灵加经验，训练点则用来补八项能力。",
    action: "下一步",
  },
  {
    screen: "home",
    target: '[data-go="daily"]',
    title: "每日挑战",
    text: "每日挑战每天换一套阵容和规则，只记录当日最高分；首次胜利给 100 篮球币，完成每日任务还能再领金币。",
    action: "下一步",
  },
  {
    screen: "home",
    target: '[data-go="match"]',
    title: "开始比赛",
    text: "准备好就从「开始比赛」进入赛季。赛季赛制、赛前对阵、赛后结算和四天王规则都写在「设置 → 说明」里。",
    action: "完成引导",
  },
];

const CSS = `
.nb-layer{position:fixed;inset:0;z-index:1250;pointer-events:none}
.nb-hole{position:fixed;border:2px solid var(--gold,#f5c542);border-radius:14px;box-shadow:0 0 0 9999px rgba(3,6,14,.78);transition:left .2s ease,top .2s ease,width .2s ease,height .2s ease;pointer-events:none}
.nb-hole::after{content:"";position:absolute;inset:-6px;border-radius:18px;border:2px solid rgba(245,197,66,.35);animation:nbPulse 1.6s ease-out infinite}
@keyframes nbPulse{0%{opacity:.9;transform:scale(.98)}70%{opacity:0;transform:scale(1.04)}100%{opacity:0}}
.nb-card{position:fixed;box-sizing:border-box;width:min(320px,calc(100vw - 24px));padding:13px 14px 12px;border:1px solid rgba(245,197,66,.45);border-radius:14px;background:linear-gradient(180deg,#1c376e,#0c1730);box-shadow:0 16px 44px rgba(0,0,0,.6);color:#fff;pointer-events:auto;transition:left .2s ease,top .2s ease}
.nb-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.nb-count{font:700 10px/1 var(--sport);letter-spacing:.1em;color:var(--gold,#f5c542)}
.nb-skip{border:0;background:none;color:rgba(255,255,255,.55);font:700 10px var(--sport);padding:2px}
.nb-card h3{margin:0 0 5px;font:700 17px var(--sport);color:var(--gold,#f5c542)}
.nb-card p{margin:0 0 10px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.84)}
.nb-foot{font-size:10.5px;line-height:1.4;color:rgba(255,255,255,.5)}
.nb-done{display:block;width:100%;padding:10px 12px;border-radius:9px;border:1px solid #8a6a00;background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52;font:700 12px var(--sport)}
.nb-result{pointer-events:auto;background:rgba(3,6,14,.62)}
.nb-result .nb-card{left:50%;top:50%;transform:translate(-50%,-50%)}
`;

let session = null;

function ensureCss() {
  if (document.getElementById("pj-nb-style")) return;
  const st = document.createElement("style");
  st.id = "pj-nb-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

/** 只把指引字段写回最新存档，避免覆盖玩家刚领取的金币/奖励 */
function persist(save) {
  const cur = loadSave() || save;
  cur.guide = save.guide;
  if (save.onboarded) cur.onboarded = true;
  writeSave(cur);
}

function guideState(save) {
  if (!save) return null;
  let g = save.guide;
  if (!g || g.v !== 1) {
    g = save.guide = { v: 1, step: 0, done: false };
    persist(save);
  }
  return g.done ? null : g;
}

function teardown() {
  if (!session) return;
  clearInterval(session.guard);
  window.removeEventListener("resize", session.place);
  window.removeEventListener("scroll", session.place, true);
  if (session.click) document.removeEventListener("click", session.click, true);
  session.layer?.remove();
  session = null;
}

function saveStep(save, g, step) {
  g.step = Math.max(g.step, step);
  persist(save);
}

function finish(save, g, opts = {}) {
  g.done = true;
  g.step = STEPS.length;
  save.onboarded = true;
  persist(save);
  teardown();
  opts.onFinish?.();
}

/** 页面加载后，按屏幕显示当前步骤 */
export function mountGuide(screen, save, opts = {}) {
  const g = guideState(save);
  if (!g) { teardown(); return false; }

  if (screen !== "home") { teardown(); return false; }
  const idx = Math.max(0, Math.min(STEPS.length - 1, g.step));
  const resume = false;

  teardown();
  build(screen, idx, save, g, { ...opts, resume });
  return true;
}

function build(screen, idx, save, g, opts) {
  ensureCss();
  const step = STEPS[idx];
  const root = opts.root;
  const last = idx === STEPS.length - 1;
  const hasAction = !!step.action && !opts.resume;
  const layer = document.createElement("div");
  layer.className = "nb-layer" + (screen === "result" ? " nb-result" : "");
  layer.innerHTML = `
    <div class="nb-hole" hidden></div>
    <div class="nb-card" role="dialog" aria-live="polite">
      <div class="nb-meta"><span class="nb-count">${opts.resume ? "继续指引" : `新手指引 ${idx + 1} / ${STEPS.length}`}</span><button class="nb-skip" type="button" data-nb="skip">跳过指引</button></div>
      <h3></h3><p></p>
      ${hasAction ? `<button class="nb-done" type="button" data-nb="done">${step.action}</button>` : `<div class="nb-foot">${opts.resume ? "点高亮按钮继续" : "完成高亮操作后自动继续"}</div>`}
    </div>`;
  document.body.appendChild(layer);

  const hole = layer.querySelector(".nb-hole");
  const card = layer.querySelector(".nb-card");
  card.querySelector("h3").textContent = opts.resume ? "继续新手指引" : step.title;
  card.querySelector("p").textContent = opts.resume
    ? "点「开始比赛」打开赛季页，接着了解联赛和比赛流程。"
    : (opts.text || step.text);

  let target = null;
  const selector = opts.target || step.target;
  if (selector && root) {
    try { target = root.querySelector(selector); } catch { target = null; }
  }

  const place = () => {
    if (screen === "result") return;
    if (!target) {
      hole.hidden = true;
      card.style.left = "50%";
      card.style.top = "50%";
      card.style.transform = "translate(-50%,-50%)";
      return;
    }
    const r = target.getBoundingClientRect();
    if (!r.width && !r.height) { hole.hidden = true; return; }
    const pad = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(4, r.left - pad);
    const y = Math.max(4, r.top - pad);
    const w = Math.min(vw - 8, r.width + pad * 2);
    const h = Math.min(vh - 8, r.height + pad * 2);
    hole.hidden = false;
    hole.style.left = x + "px";
    hole.style.top = y + "px";
    hole.style.width = w + "px";
    hole.style.height = h + "px";

    const tw = Math.min(320, vw - 24);
    card.style.width = tw + "px";
    const th = card.offsetHeight || 160;
    let ty = y + h + 12;
    if (ty + th > vh - 12) ty = y - th - 12;
    ty = Math.max(12, Math.min(ty, vh - th - 12));
    const tx = Math.min(Math.max(12, x), vw - tw - 12);
    card.style.left = tx + "px";
    card.style.top = ty + "px";
    card.style.transform = "none";
  };

  session = { screen, idx, save, g, root, layer, place, guard: 0, click: null };

  const advance = (to) => {
    saveStep(save, g, to);
    teardown();
  };

  card.addEventListener("click", (ev) => {
    const act = ev.target.closest("[data-nb]")?.dataset.nb;
    if (act === "skip") { finish(save, g, opts); return; }
    if (act !== "done") return;
    if (last) { finish(save, g, opts); return; }
    const r = session?.root;
    const keptTarget = opts.target;
    const keptText = opts.text;
    saveStep(save, g, idx + 1);
    teardown();
    mountGuide(screen, save, { root: r, target: keptTarget, text: keptText });
  });

  // 高亮目标被真实点击后自动进入下一步；resume 只负责导航，不重复推进
  if (target && !hasAction && !opts.resume) {
    session.click = (ev) => {
      if (!session || session.idx !== idx) return;
      if (ev.target.closest("[data-nb]")) return;
      if (!ev.target.closest(selector)) return;
      if (g.step !== idx) return;
      advance(idx + 1);
    };
    document.addEventListener("click", session.click, true);
  }

  session.guard = setInterval(() => {
    if (!session) return;
    if (root && !root.isConnected) teardown();
  }, 350);

  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  if (target && screen !== "result") {
    try { target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
  }
  place();
  setTimeout(place, 140);
  setTimeout(place, 360);
}

/** 主页入口（保留旧导出名） */
export function startOnboarding(root, save, opts = {}) {
  return mountGuide("home", save, { root, onFinish: opts.onFinish });
}
