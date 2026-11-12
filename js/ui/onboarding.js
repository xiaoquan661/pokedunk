/**
 * ui/onboarding.js —— 首次进入主界面的一次性聚光灯指引
 * 框选主页图标，逐项说明用途；完成后写入 save.onboarded，不再自动出现。
 */

const STEPS = [
  { sel: ".top-row", title: "资源与目标", text: "篮球币买精灵、孵蛋、树果和训练。徽章是本赛季进度，集齐 8 枚才能打四天王。" },
  { sel: '[data-go="match"]', title: "赛季规则", text: "9 支队伍单循环 8 场，前 4 进季后赛，最后打总决赛。赢下馆主得徽章，8 枚解锁四天王；夺冠后进入下一赛季。" },
  { sel: '[data-go="match"]', title: "比赛规则", text: "4 节 × 3 分钟，24 秒内出手，5 对 5。投篮 2 分、三分 3 分；体力会随跑动下降，记得换人。" },
  { sel: '[data-go="daily"]', title: "每日挑战", text: "每天换规则和全明星对手，必须手动打，只记最高分。首胜 +100 币，另有 3 个当日任务。" },
  { sel: '[data-go="team"]', title: "队伍与羁绊", text: "前 5 只首发。位置分 PG/SG/SF/PF/C，拖到不同槽位会改变对位和属性；首发满足条件会激活羁绊，最多 3 条。" },
  { sel: '[data-go="shop"]', title: "精灵与图鉴", text: "精灵来自商店、孵蛋和战胜签约。普通蛋 30 分钟、高级蛋 6 小时，均有 1% 传说；联赛冠军和四天王共享每赛季 2 只传说。" },
  { sel: '[data-go="settings"]', title: "防守与存档", text: "防守切换默认手动，只有按换人键才换控制对象。声音、自动换人、存档都在设置里。" },
];

const CSS = `
.onb{position:fixed;inset:0;z-index:1100;pointer-events:auto}
.onb-hole{position:fixed;border:2px solid var(--gold,#f5c542);border-radius:14px;box-shadow:0 0 0 9999px rgba(3,6,14,.78);transition:left .22s ease,top .22s ease,width .22s ease,height .22s ease;pointer-events:none}
.onb-hole::after{content:"";position:absolute;inset:-6px;border-radius:18px;border:2px solid rgba(245,197,66,.35);animation:onbPulse 1.6s ease-out infinite}
@keyframes onbPulse{0%{opacity:.9;transform:scale(.98)}70%{opacity:0;transform:scale(1.04)}100%{opacity:0}}
.onb-hit{position:fixed;border-radius:14px;background:transparent;border:0;cursor:pointer}
.onb-tip{position:fixed;width:min(320px,calc(100vw - 24px));box-sizing:border-box;padding:13px 14px 12px;border:1px solid rgba(245,197,66,.45);border-radius:14px;background:linear-gradient(180deg,#1c376e,#0c1730);box-shadow:0 16px 44px rgba(0,0,0,.6);color:#fff;transition:left .2s ease,top .2s ease}
.onb-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.onb-count{font:700 10px/1 var(--sport);letter-spacing:.1em;color:var(--gold,#f5c542)}
.onb-skip{border:0;background:none;color:rgba(255,255,255,.55);font:700 10px var(--sport);padding:2px}
.onb-tip h3{margin:0 0 5px;font:700 17px var(--sport);color:var(--gold,#f5c542)}
.onb-tip p{margin:0 0 11px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.82)}
.onb-acts{display:flex;gap:7px}
.onb-acts button{flex:1;padding:9px 10px;border-radius:9px;font:700 12px var(--sport)}
.onb-prev{border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.24);color:rgba(255,255,255,.72)}
.onb-prev[disabled]{opacity:.35}
.onb-next{border:1px solid #8a6a00;background:linear-gradient(180deg,#ffd75e,#f5c542);color:#2a1b52}
`;

function ensureCss() {
  if (document.getElementById("pj-onb-style")) return;
  const st = document.createElement("style");
  st.id = "pj-onb-style";
  st.textContent = CSS;
  document.head.appendChild(st);
}

function near(el) {
  return el ? el.getBoundingClientRect() : null;
}

/**
 * @param root  当前主界面根节点（用于查找目标）
 * @param save  存档对象
 * @param opts  { onFinish, startAt }
 */
export function startOnboarding(root, save, opts = {}) {
  const targets = STEPS.map((s) => root.querySelector(s.sel));
  if (!targets.some(Boolean)) return;
  ensureCss();
  const steps = STEPS.filter((_, i) => targets[i]);
  const els = targets.filter(Boolean);

  let idx = Math.max(0, Math.min(steps.length - 1, opts.startAt || 0));
  let closed = false;

  const layer = document.createElement("div");
  layer.className = "onb";
  layer.innerHTML = `<div class="onb-hole"></div><button class="onb-hit" aria-label="继续指引"></button>
    <div class="onb-tip" role="dialog" aria-live="polite">
      <div class="onb-meta"><span class="onb-count"></span><button class="onb-skip" type="button" data-onb="skip">跳过指引</button></div>
      <h3></h3><p></p>
      <div class="onb-acts">
        <button class="onb-prev" type="button" data-onb="prev">上一步</button>
        <button class="onb-next" type="button" data-onb="next">下一步</button>
      </div>
    </div>`;
  document.body.appendChild(layer);

  const hole = layer.querySelector(".onb-hole");
  const hit = layer.querySelector(".onb-hit");
  const tip = layer.querySelector(".onb-tip");
  const count = layer.querySelector(".onb-count");
  const title = layer.querySelector("h3");
  const text = layer.querySelector("p");
  const prev = layer.querySelector('[data-onb="prev"]');
  const next = layer.querySelector('[data-onb="next"]');

  function place() {
    const el = els[idx];
    const r = near(el);
    if (!r) return;
    const pad = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(4, r.left - pad);
    const y = Math.max(4, r.top - pad);
    const w = Math.min(vw - 8, r.width + pad * 2);
    const h = Math.min(vh - 8, r.height + pad * 2);
    hole.style.left = x + "px";
    hole.style.top = y + "px";
    hole.style.width = w + "px";
    hole.style.height = h + "px";
    hit.style.left = x + "px";
    hit.style.top = y + "px";
    hit.style.width = w + "px";
    hit.style.height = h + "px";

    const tw = Math.min(320, vw - 24);
    const th = tip.offsetHeight || 150;
    let ty = y + h + 12;
    if (ty + th > vh - 12) ty = y - th - 12;
    ty = Math.max(12, Math.min(ty, vh - th - 12));
    let tx = Math.min(Math.max(12, x), vw - tw - 12);
    tip.style.width = tw + "px";
    tip.style.left = tx + "px";
    tip.style.top = ty + "px";
  }

  function render() {
    const s = steps[idx];
    count.textContent = `指引 ${idx + 1} / ${steps.length}`;
    title.textContent = s.title;
    text.textContent = s.text;
    prev.disabled = idx === 0;
    next.textContent = idx === steps.length - 1 ? "完成" : "下一步";
    const el = els[idx];
    try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (_) {}
    place();
    setTimeout(place, 120);
    setTimeout(place, 320);
  }

  function finish() {
    if (closed) return;
    closed = true;
    layer.remove();
    window.removeEventListener("resize", place);
    opts.onFinish?.();
  }

  function go(n) {
    idx = Math.max(0, Math.min(steps.length - 1, n));
    if (n >= steps.length) { finish(); return; }
    render();
  }

  layer.addEventListener("click", (ev) => {
    const act = ev.target.closest("[data-onb]")?.dataset.onb;
    if (act === "skip") { finish(); return; }
    if (act === "next") { go(idx + 1); return; }
    if (act === "prev") { go(idx - 1); return; }
  });
  hit.addEventListener("click", () => go(idx + 1));
  window.addEventListener("resize", place);

  render();
}
