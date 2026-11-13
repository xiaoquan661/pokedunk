/**
 * ui/achv-ui.js —— 成就面板 UI（pokedunk-v2，移植自旧 achievements-ui.js）
 * 主界面成就入口 → 面板：总进度条 + 生涯/单场两页签 + 卡片流。
 */
import { ACHV } from "../systems/achv.js?v=30";
import { ICON } from "./icons.js?v=30";

const CAREER_IDS = new Set(["stage1", "badges4", "badges8", "champion", "tour1", "evo1", "evo5", "vet16", "coll10", "coll30", "rich1k", "w10", "sign1"]);
const ICON_CAREER = ICON.trophy, ICON_MATCH = ICON.ball;

const CSS =
  ".achv-body .pj-sub{margin:0 0 12px;font-size:12px;color:var(--text-dim)}" +
  ".achv-body .pj-prog{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px;margin-bottom:12px}" +
  ".achv-body .pj-prow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}" +
  ".achv-body .pj-lbl{font-size:12px;color:var(--text-dim)}" +
  ".achv-body .pj-num{font-size:20px;color:var(--gold);font-variant-numeric:tabular-nums}" +
  ".achv-body .pj-track{height:8px;border-radius:4px;background:rgba(0,0,0,.35);overflow:hidden}" +
  ".achv-body .pj-track i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),#ffe89a);border-radius:4px}" +
  ".achv-body .pj-tabs{display:inline-flex;gap:6px;margin-bottom:12px}" +
  ".achv-body .pj-tabs button{padding:8px 18px;border-radius:17px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.24);color:rgba(255,255,255,.75);font:400 12px var(--sport)}" +
  ".achv-body .pj-tabs button.on{background:rgba(245,197,66,.16);border-color:var(--gold);color:var(--gold)}" +
  ".achv-body .pj-card{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:11px 13px;margin-bottom:8px}" +
  ".achv-body .pj-card.lock{background:rgba(0,0,0,.16);border-color:rgba(255,255,255,.05)}" +
  ".achv-body .pj-ico{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(245,197,66,.14);border:1.5px solid var(--gold)}" +
  ".achv-body .pj-ico svg{width:20px;height:20px}" +
  ".achv-body .pj-card.lock .pj-ico{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.14);filter:grayscale(1);opacity:.8}" +
  ".achv-body .pj-txt{flex:1;min-width:0}" +
  ".achv-body .pj-name{font-weight:700;font-size:14px}" +
  ".achv-body .pj-card.lock .pj-name{color:rgba(255,255,255,.62)}" +
  ".achv-body .pj-desc{font-size:12px;color:var(--text-dim);margin-top:2px}" +
  ".achv-body .pj-date{font-size:11.5px;color:var(--gold);flex-shrink:0;font-variant-numeric:tabular-nums}";

let curTab = "career";

function cardHtml(x) {
  const locked = !x.unlocked;
  const ico = CAREER_IDS.has(x.id) ? ICON_CAREER : ICON_MATCH;
  let date = "";
  if (x.unlocked && x.at) {
    const d = new Date(x.at);
    date = `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `<div class="pj-card${locked ? " lock" : ""}"><span class="pj-ico">${ico}</span><span class="pj-txt"><span class="pj-name">${x.name}</span><div class="pj-desc">${x.desc}</div></span>${date ? `<span class="pj-date">✓ ${date}</span>` : ""}</div>`;
}

function renderList(panel, tab) {
  const list = ACHV.list();
  const rows = list.filter((x) => (tab === "match" ? !CAREER_IDS.has(x.id) : CAREER_IDS.has(x.id))).map(cardHtml).join("");
  panel.querySelector("#pj-achv-list").innerHTML = rows || '<p class="pj-sub">暂无此类成就</p>';
  panel.querySelectorAll(".pj-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
}

export function openAchievements() {
  if (!document.getElementById("pj-achv-style")) {
    const st = document.createElement("style");
    st.id = "pj-achv-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const wrap = document.createElement("div");
  wrap.className = "pj-scrim page-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:900;background:rgba(5,8,16,.72);display:grid;place-items:center;padding:10px";
  const list = ACHV.list();
  const done = list.filter((x) => x.unlocked).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  wrap.innerHTML = `
    <div class="pj-page-card"><div class="sub-page pj-page-body achv-body">
      <div class="page-head"><button class="back" data-back>‹</button><h2>成就</h2><span class="count">${done}/${list.length}</span></div>
      <p class="pj-sub">闯关、养成、对战里程碑</p>
      <div class="pj-prog"><div class="pj-prow"><span class="pj-lbl">总进度</span><span class="pj-num">${done} / ${list.length} · ${pct}%</span></div><div class="pj-track"><i style="width:${pct}%"></i></div></div>
      <div class="pj-tabs"><button data-tab="career" class="on">生涯</button><button data-tab="match">单场</button></div>
      <div id="pj-achv-list"></div>
    </div></div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-back]")) { wrap.remove(); return; }
    const tb = e.target.closest(".pj-tabs button");
    if (tb) { curTab = tb.dataset.tab; renderList(wrap, curTab); }
  });
  document.body.appendChild(wrap);
  renderList(wrap, curTab);
}


