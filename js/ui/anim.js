/**
 * ui/anim.js —— 进化/孵化动画层（pokedunk-v2，移植自旧 journey-ui.js 开蛋壳/进化动画层）
 * 模式：
 *  - hatch：蛋摇晃→裂纹→闪光→双壳飞出→精灵弹出→金环扩散（可跳过）
 *  - evolve：旧形态 3 次白光脉冲（ePulse）→ 白闪 → 新形态弹出（evoPop）+金环
 *  - levelup：升级结算卡（属性提升对比展示）
 * 三种模式共用 buildOverlay；onDone 在揭晓卡出现时回调（结算已先行落库）。
 */

const CSS =
  ".hatch-ov{position:fixed;inset:0;z-index:990;background:rgba(5,8,20,.92);display:none;place-items:center;text-align:center;color:#fff;font:400 12px/1.5 var(--sport, sans-serif)}" +
  ".hatch-ov.on{display:grid}" +
  ".hatch-flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none}" +
  ".hatch-flash.on{animation:hFlash .35s ease-out}" +
  "@keyframes hFlash{0%{opacity:0}35%{opacity:1}100%{opacity:0}}" +
  ".hatch-inner{display:flex;flex-direction:column;align-items:center;width:min(340px,88vw)}" +
  ".hatch-stage{position:relative;width:240px;height:220px}" +
  ".hatch-egg{position:absolute;left:calc(50% - 48px);top:calc(50% - 57px);width:96px;height:114px;background:#e8dcc0;border-radius:50%/58% 58% 42% 42%;box-shadow:inset -6px -8px 0 rgba(0,0,0,.18)}" +
  ".hatch-egg.shake{animation:hWiggle 1.3s ease-in-out}" +
  ".hatch-egg.shakes{animation:hWiggle .6s ease-in-out}" +
  "@keyframes hWiggle{0%,26%,32%,58%,64%,90%,100%{transform:rotate(0)}8%{transform:rotate(-9deg)}16%{transform:rotate(8deg)}40%{transform:rotate(9deg)}48%{transform:rotate(-7deg)}72%{transform:rotate(-8deg)}80%{transform:rotate(7deg)}}" +
  ".hatch-crack{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .4s}" +
  ".hatch-crack.on{opacity:1}" +
  ".hshell{position:absolute;left:calc(50% - 48px);top:calc(50% - 57px);width:96px;height:114px;background:#e8dcc0;border-radius:50%/58% 58% 42% 42%;opacity:0;pointer-events:none;box-shadow:inset -6px -8px 0 rgba(0,0,0,.18)}" +
  ".hshell.top{clip-path:polygon(0 0,100% 0,100% 44%,82% 52%,64% 45%,46% 54%,28% 46%,10% 54%,0 47%)}" +
  ".hshell.bot{clip-path:polygon(0 47%,10% 54%,28% 46%,46% 54%,64% 45%,82% 52%,100% 44%,100% 100%,0 100%)}" +
  ".hshell.on.top{animation:hFlyL .55s ease-in forwards}" +
  ".hshell.on.bot{animation:hFlyR .55s ease-in forwards}" +
  "@keyframes hFlyL{0%{opacity:1}100%{opacity:0;transform:translate(-130px,-30px) rotate(-60deg)}}" +
  "@keyframes hFlyR{0%{opacity:1}100%{opacity:0;transform:translate(130px,-30px) rotate(60deg)}}" +
  ".hatch-mon{position:absolute;left:calc(50% - 72px);top:calc(50% - 76px);width:144px;height:144px;opacity:0;image-rendering:pixelated}" +
  ".hatch-mon.on{animation:hPop .5s cubic-bezier(.34,1.56,.64,1) forwards}" +
  "@keyframes hPop{0%{opacity:0;transform:scale(.3)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}" +
  ".hatch-ring{position:absolute;left:calc(50% - 85px);top:calc(50% - 85px);width:170px;height:170px;border:3px solid #f5c542;border-radius:50%;opacity:0}" +
  ".hatch-ring.on{animation:hRing .6s ease-out forwards}" +
  "@keyframes hRing{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.9)}}" +
  ".hatch-card{width:100%;margin:14px auto 0;background:linear-gradient(180deg,#1c376e,#12224a);border:2px solid #f5c542;border-radius:14px;padding:14px 16px;opacity:0;transform:translateY(14px);transition:.3s;pointer-events:none}" +
  ".hatch-card.on{opacity:1;transform:none;pointer-events:auto}" +
  ".hc-t{font-size:20px;font-weight:800;color:#f5c542;text-shadow:0 2px 4px rgba(0,0,0,.45)}" +
  ".hc-s{font-size:12px;color:rgba(255,255,255,.7);margin-top:4px}" +
  ".hc-xp{margin-top:10px;text-align:left;background:rgba(0,0,0,.25);border-radius:10px;padding:9px 12px}" +
  ".hc-xp .row{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}" +
  ".hc-xp .row b{color:#f5c542}" +
  ".hc-xp .up{color:#21d07a;font-weight:700}" +
  ".hatch-skip{position:fixed;bottom:18px;left:0;right:0;text-align:center;color:rgba(255,255,255,.4);font-size:11px}" +
  ".hatch-ov.end .hatch-skip{display:none}" +
  ".hatch-ov .pulse{opacity:1 !important;animation:ePulse .5s ease-in-out 3}" +
  "@keyframes ePulse{0%,100%{filter:none;transform:scale(1)}50%{filter:brightness(2.2) drop-shadow(0 0 14px #fff);transform:scale(1.06)}}" +
  ".hatch-ov .evolve{opacity:1 !important;animation:evoPop .55s cubic-bezier(.34,1.56,.64,1) forwards}" +
  "@keyframes evoPop{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}" +
  /* 传说孵化：金色光柱、双重光环、星屑、金色蛋壳 */
  ".hatch-ov.legend{background:radial-gradient(ellipse at 50% 43%,#241a08 0%,#0b0906 55%,#03050c 100%)}" +
  ".legend-rays{position:absolute;left:50%;top:50%;width:380px;height:380px;margin:-190px 0 0 -190px;border-radius:50%;opacity:0;pointer-events:none;background:repeating-conic-gradient(from 0deg,rgba(255,224,138,0) 0deg 9deg,rgba(255,211,92,.34) 9deg 11deg,rgba(255,224,138,0) 11deg 24deg);filter:drop-shadow(0 0 10px rgba(245,197,66,.35))}" +
  ".hatch-ov.legend .legend-rays{animation:legendRays 2.6s ease-out forwards}" +
  "@keyframes legendRays{0%{opacity:0;transform:scale(.3) rotate(0)}16%{opacity:.95}55%{opacity:.55}100%{opacity:.22;transform:scale(1.25) rotate(18deg)}}" +
  ".legend-aura{position:absolute;left:calc(50% - 118px);top:calc(50% - 118px);width:236px;height:236px;border-radius:50%;opacity:0;pointer-events:none;background:radial-gradient(circle,rgba(255,234,170,.5),rgba(245,197,66,.16) 43%,transparent 70%)}" +
  ".hatch-ov.legend .legend-aura{animation:legendAura 2.8s ease-in-out infinite}" +
  "@keyframes legendAura{0%,100%{opacity:.25;transform:scale(.92)}50%{opacity:.85;transform:scale(1.12)}}" +
  ".legend-stars{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}" +
  ".legend-stars i{position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;background:#fff3b0;box-shadow:0 0 9px 2px rgba(245,197,66,.85);opacity:0}" +
  ".hatch-ov.legend .legend-stars i{animation:legendSpark 1.7s ease-out infinite;animation-delay:var(--d,0s)}" +
  "@keyframes legendSpark{0%{opacity:0;transform:translate(0,0) scale(.25)}18%{opacity:1}100%{opacity:0;transform:translate(var(--dx,0),var(--dy,0)) scale(1.15)}}" +
  ".hatch-ov.legend .hatch-egg{background:linear-gradient(150deg,#fff8df,#f5c542 48%,#b8861c);box-shadow:inset -6px -8px 0 rgba(0,0,0,.18),0 0 28px rgba(245,197,66,.65)}" +
  ".hatch-ov.legend .hshell{background:linear-gradient(150deg,#fff8df,#f5c542 48%,#b8861c);box-shadow:inset -6px -8px 0 rgba(0,0,0,.18),0 0 18px rgba(245,197,66,.55)}" +
  ".hatch-ov.legend .hatch-ring{border-color:#fff1a8;box-shadow:0 0 30px #f5c542}" +
  ".hatch-ring.r2,.hatch-ring.r3{display:none}" +
  ".hatch-ov.legend .hatch-ring.r2,.hatch-ov.legend .hatch-ring.r3{display:block}" +
  ".hatch-ov.legend .hatch-ring.r2.on{animation-delay:.16s;border-color:#fff}" +
  ".hatch-ov.legend .hatch-ring.r3.on{animation-delay:.32s;border-color:#f5c542}" +
  ".hatch-ov.legend .hatch-mon{filter:drop-shadow(0 0 16px rgba(255,220,100,.95)) drop-shadow(0 0 34px rgba(245,197,66,.45))}" +
  ".hatch-ov.legend .hatch-card{border-color:#ffe08a;background:linear-gradient(180deg,#3a2a08,#1c1404);box-shadow:0 0 0 1px rgba(255,224,138,.35),0 0 36px rgba(245,197,66,.22)}" +
  ".hatch-ov.legend .hc-t{font-size:23px;color:#ffe08a;text-shadow:0 0 16px rgba(245,197,66,.5)}" +
  ".hc-badge{display:none;margin:0 auto 6px;width:max-content;padding:2px 10px;border-radius:999px;border:1px solid rgba(255,224,138,.6);background:rgba(245,197,66,.16);color:#ffe08a;font-size:10px;font-weight:700;letter-spacing:2px}" +
  ".hatch-ov.legend .hc-badge{display:block}" +
  ".hatch-flash.gold{background:#ffe9a8}" +
  ".hatch-ov.legend .legend-rays,.hatch-ov.legend .legend-aura,.hatch-ov.legend .legend-stars{display:block}" +
  ".hatch-ov:not(.legend) .legend-rays,.hatch-ov:not(.legend) .legend-aura,.hatch-ov:not(.legend) .legend-stars{display:none}";

let styleInjected = false;
function ensureCss() {
  if (styleInjected) return;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);
  styleInjected = true;
}

function buildOverlay(id) {
  const old = document.getElementById(id);
  if (old) old.remove();
  ensureCss();
  const ov = document.createElement("div");
  ov.className = "hatch-ov";
  ov.id = id;
  ov.innerHTML =
    '<div class="hatch-flash"></div>' +
    '<div class="hatch-inner"><div class="hatch-stage">' +
    '<div class="legend-rays"></div><div class="legend-aura"></div>' +
    '<div class="legend-stars">' +
    '<i style="--dx:-86px;--dy:-70px;--d:.05s"></i><i style="--dx:72px;--dy:-84px;--d:.2s"></i>' +
    '<i style="--dx:96px;--dy:34px;--d:.35s"></i><i style="--dx:46px;--dy:92px;--d:.5s"></i>' +
    '<i style="--dx:-52px;--dy:96px;--d:.65s"></i><i style="--dx:-98px;--dy:30px;--d:.8s"></i>' +
    '<i style="--dx:-24px;--dy:-104px;--d:.95s"></i><i style="--dx:112px;--dy:-18px;--d:1.1s"></i>' +
    '</div>' +
    '<div class="hatch-ring"></div><div class="hatch-ring r2"></div><div class="hatch-ring r3"></div>' +
    '<div class="hatch-egg"><svg class="hatch-crack" viewBox="0 0 96 114">' +
    '<polyline points="48,20 42,34 52,42 44,54 54,60 46,72" fill="none" stroke="#6b5a34" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<polyline points="30,44 36,56 28,64 38,74 32,86" fill="none" stroke="#6b5a34" stroke-width="2" stroke-linejoin="round"/>' +
    '<polyline points="66,38 60,50 70,58 62,68" fill="none" stroke="#6b5a34" stroke-width="2" stroke-linejoin="round"/>' +
    '</svg></div>' +
    '<div class="hshell top"></div><div class="hshell bot"></div>' +
    '<img class="hatch-mon" src="" alt="">' +
    "</div>" +
    '<div class="hatch-card"><div class="hc-badge">传说降临</div><div class="hc-t"></div><div class="hc-s"></div><div class="hc-xp" hidden></div><button class="pj-btn" style="margin-top:10px;padding:8px 16px;border-radius:14px;border:none;background:#f5c542;color:#1a2c55;font:700 12px var(--sport, sans-serif)">确认</button></div></div>' +
    '<p class="hatch-skip">点击任意处跳过</p>';
  document.body.appendChild(ov);
  return ov;
}

let timers = [];
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

/**
 * 孵化动画。o = { dex, title, sub, dup }；onDone 在揭晓卡出现时回调。
 */
export function playHatch(o, onDone) {
  const ov = buildOverlay("pj-hatch-ov");
  const q = (sel) => ov.querySelector(sel);
  const egg = q(".hatch-egg"), crack = q(".hatch-crack"), flash = q(".hatch-flash"),
    st = q(".hshell.top"), sb = q(".hshell.bot"), mon = q(".hatch-mon"),
    rings = [...ov.querySelectorAll(".hatch-ring")],
    card = q(".hatch-card");
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    clearTimers();
    q(".hc-t").textContent = o.title;
    q(".hc-s").textContent = o.sub;
    card.classList.add("on");
    ov.classList.add("end");
    q("button").onclick = (e) => { e.stopPropagation(); ov.remove(); onDone?.(); };
  }

  mon.src = `./sprites/${o.dex}.png`;
  ov.classList.add("on");
  const reveal = () => {
    flash.classList.add("on");
    if (o.legend) flash.classList.add("gold");
    egg.style.visibility = "hidden";
    st.classList.add("on"); sb.classList.add("on"); mon.classList.add("on");
    rings.forEach((r) => r.classList.add("on"));
  };

  if (o.legend) {
    // 传说：金卵长摇 → 裂纹发光 → 金色爆闪 → 三重光环 + 星屑
    ov.classList.add("legend");
    timers.push(setTimeout(() => egg.classList.add("shake"), 220));
    timers.push(setTimeout(() => crack.classList.add("on"), 1650));
    timers.push(setTimeout(reveal, 2350));
    timers.push(setTimeout(finish, 3350));
  } else if (o.dup) {
    timers.push(setTimeout(() => egg.classList.add("shakes"), 250));
    timers.push(setTimeout(reveal, 900));
    timers.push(setTimeout(finish, 1500));
  } else {
    timers.push(setTimeout(() => egg.classList.add("shake"), 300));
    timers.push(setTimeout(() => crack.classList.add("on"), 1700));
    timers.push(setTimeout(reveal, 2300));
    timers.push(setTimeout(finish, 2950));
  }
  ov.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    clearTimers();
    if (card.classList.contains("on")) { finished = true; return; }
    finished = false;
    egg.style.visibility = "hidden"; crack.classList.remove("on");
    st.classList.remove("on"); sb.classList.remove("on");
    mon.classList.remove("pulse", "evolve");
    mon.classList.add("on"); rings.forEach((r) => r.classList.add("on"));
    finish();
  });
}

/**
 * 进化/升级中心弹窗。o = { oldDex, newDex, title, sub, changes:[{k,v}] }。
 * 序列：旧形态三次白光脉冲（ePulse）→ 白闪 → 新形态 evoPop 弹出 + 金环 → 属性提升卡。
 * 无 newDex（纯升级）时直接弹属性提升卡。
 */
export function playEvolve(o, onDone) {
  const ov = buildOverlay("pj-evo-ov");
  const q = (sel) => ov.querySelector(sel);
  const flash = q(".hatch-flash"), mon = q(".hatch-mon"), ring = q(".hatch-ring"),
    card = q(".hatch-card"), egg = q(".hatch-egg"), crack = q(".hatch-crack"),
    st = q(".hshell.top"), sb = q(".hshell.bot");
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    clearTimers();
    q(".hc-t").textContent = o.title;
    q(".hc-s").textContent = o.sub;
    // 属性提升对比卡
    if (o.changes?.length) {
      const xp = q(".hc-xp");
      xp.hidden = false;
      xp.innerHTML = o.changes.map((c) => `<div class="row"><span>${c.k}</span><b class="up">${c.v}</b></div>`).join("");
    }
    card.classList.add("on");
    ov.classList.add("end");
    q("button").onclick = (e) => { e.stopPropagation(); ov.remove(); onDone?.(); };
  }

  egg.style.display = "none"; crack.style.display = "none";
  st.style.display = "none"; sb.style.display = "none";
  mon.src = `./sprites/${o.newDex || o.oldDex}.png`;
  ov.classList.add("on");

  if (o.newDex && o.newDex !== o.oldDex) {
    // 进化序列：旧形态脉冲 3 次（1.5s）→ 白闪换图 → 新形态弹出
    mon.src = `./sprites/${o.oldDex}.png`;
    mon.classList.add("pulse"); mon.style.opacity = "1";
    timers.push(setTimeout(() => { flash.classList.add("on"); }, 1550));
    timers.push(setTimeout(() => {
      mon.classList.remove("pulse");
      mon.src = `./sprites/${o.newDex}.png`;
      mon.classList.add("evolve");
    }, 1700));
    timers.push(setTimeout(() => { ring.classList.add("on"); }, 1750));
    timers.push(setTimeout(finish, 2450));
  } else {
    // 纯升级：直接展示卡
    mon.style.opacity = "1";
    timers.push(setTimeout(() => { ring.classList.add("on"); }, 150));
    timers.push(setTimeout(finish, 700));
  }
  ov.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    clearTimers();
    if (card.classList.contains("on")) { finished = true; return; }
    finished = false;
    if (o.newDex && o.newDex !== o.oldDex) mon.src = `./sprites/${o.newDex}.png`;
    mon.classList.remove("pulse");
    mon.classList.add("on"); ring.classList.add("on");
    finish();
  });
}
