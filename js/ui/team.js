/**
 * ui/team.js —— 队伍页（pokedunk-v2，S6）：卡片布阵式 + 原版球星卡样式
 * 球星卡=引擎 .pcard 同款视觉语言：属性色边框+光晕、深色渐变卡底、能力条、位置徽章。
 * 首发阵容 5 槽（POSITION_ORDER）→ 替补席横排 → 一键布阵/仓库管理。
 * 调动规则走 storage.moveMon：队伍≥5 锁底、≤10 上限。
 */
import { getPokemon, POSITION_ORDER, TYPE_COLORS } from "../../engine/readable/play-core.js?v=44";
import { moveMon, writeSave, loadSave } from "../storage.js?v=43";
import { openDetail } from "./detail.js?v=49";
import { ICON } from "./icons.js?v=37";
import {
  autoLineup as buildAutoLineup, mainOVR, monPower, teamPower, bondMultipliers,
  activeBonds, ensureLineupSlots, recommendedPositions, rarityOf, RARITY_COLOR,
  assignStarterSlot, substituteBenchToSlot, substituteStarterToBench,
  starterIds, benchIds as benchMonIds,
  POSITION_ORDER as BUILD_POSITIONS,
} from "../systems/build.js?v=37";

const POS_CN = { PG: "控卫", SG: "分卫", SF: "小前", PF: "大前", C: "中锋" };
/** 中文名（引擎 getPokemon().name 可能仍是英文，页面其它地方依赖 zh 观察器） */
const monZh = (dex) => {
  const r = (window.__PJ_DEX_ROWS || []).find((x) => x[0] === dex);
  return r ? String(r[1]).replace(/#\d+$/, "") : getPokemon(dex).name;
};
const SLOT_ROWS = [["SF", "C", "PF"], ["SG", "PG"]]; // 参考图 3+2 阵型
const BOND_EFFECT = {
  fivePos: "全队有效属性 +3%",
  sameType: "该属性成员全属性 +5%",
  evoChain: "该进化链成员全属性 +4%",
  twinTowers: "全队盖帽、篮板 +5%",
  ironWall: "全队防守 +4%",
  runGun: "全队速度 +4%",
  starters: "比赛 XP +10%",
};

/** 队伍页小图标（SVG，替代 emoji） */
const PLUS_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const USER_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const REFRESH_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BOX_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 8l8-4 8 4v9l-8 4-8-4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 8l8 4 8-4M12 12v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

/** 空仓库插画 */
const EMPTY_BOX_SVG = `<svg viewBox="0 0 120 120" class="empty-svg" aria-hidden="true">
  <circle cx="60" cy="62" r="42" fill="rgba(99,144,240,.08)" stroke="rgba(99,144,240,.28)" stroke-width="1.5" stroke-dasharray="4 5"/>
  <path d="M30 50l30-14 30 14-30 14z" fill="#2c4b86" stroke="#7fa3e0" stroke-width="2" stroke-linejoin="round"/>
  <path d="M30 50v26l30 14V64z" fill="#1c376e" stroke="#7fa3e0" stroke-width="2" stroke-linejoin="round"/>
  <path d="M90 50v26L60 90V64z" fill="#24447e" stroke="#7fa3e0" stroke-width="2" stroke-linejoin="round"/>
  <path d="M45 44l30-12" stroke="#f5c542" stroke-width="3" stroke-linecap="round" opacity=".75"/>
  <path d="M95 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f5c542" opacity=".75"/>
  <path d="M26 84l1.4 3.6L31 89l-3.6 1.4L26 94l-1.4-3.6L21 89l3.6-1.4z" fill="#9db0d8" opacity=".6"/>
</svg>`;

/** 队伍精灵主属性（types[0]） */
function typeOf(m) {
  const b = getPokemon(m.dex);
  return (b.types && b.types[0]) || "Normal";
}

/** 首发槽位卡：位置是槽，任何精灵都能放；卡片显示初始八维推荐位置 */
function slotCard(pos, id, per) {
  if (!id) {
    return `<div class="lineup-slot empty" data-slot="${pos}" data-empty>
      <div class="slot-empty">${PLUS_SVG}<small>空位</small></div>
      <span class="slot-label no-zh">${pos}</span>
    </div>`;
  }
  const m = saveOf(id);
  const b = getPokemon(m.dex);
  const color = TYPE_COLORS[typeOf(m)] || "#a8a77a";
  const rec = recommendedPositions(m).join("/");
  const ovr = Math.round(monPower(m, pos, per.get(m)));
  const rarity = rarityOf(m.dex);
  return `<div class="lineup-slot" data-slot="${pos}">
    <button class="slot-card" data-open="${id}" data-drag="${id}" data-drag-from="start" style="--tc:${color}">
      <span class="slot-img"><img src="./sprites/${m.dex}.png" alt="" draggable="false"></span>
      <span class="slot-name">${b.name}</span>
      <span class="slot-meta"><b>${ovr}</b><small>Lv.${m.level}</small><small class="slot-rar" style="--rc:${RARITY_COLOR[rarity]}">${rarity}</small></span>
      <span class="slot-rec no-zh">推荐 ${rec}</span>
    </button>
    <span class="slot-label no-zh">${pos}</span>
  </div>`;
}

/** 进化目标 dex 集（有进化前形态的即进化形态） */
const EVOS_TARGET = new Set();

function saveOf(id) { return _save.mons[id]; }
let _save = null;

export function renderTeam(page, save) {
  _save = save;
  page.__teamSave = save;
  page.__view = "team";
  // 收集进化目标集
  EVOS_TARGET.clear();
  for (const m of Object.values(save.mons)) EVOS_TARGET.add(m.dex);

  // 首发 = 占据首发槽位的精灵；其余（含主动下放）都在替补席
  ensureLineupSlots(save);
  const lineupIds = starterIds(save);
  const byPos = {};
  for (const id of lineupIds) byPos[save.assign[id]] = id;
  const lineup = lineupIds.map((id) => ({ id, pos: save.assign[id] }));
  const benchIds = benchMonIds(save);
  const per = bondMultipliers(save);
  const teamOvr = teamPower(save);
  const startersOvr = lineup.length
    ? Math.round(lineup.reduce((a, e) => a + monPower(save.mons[e.id], e.pos, per.get(save.mons[e.id])), 0) / lineup.length)
    : 0;
  const active = activeBonds(save);

  page.innerHTML = `
    <div class="sub-inner">
      <style>
        .lineup-row{display:flex;justify-content:center;gap:9px;margin-bottom:8px}
        .lineup-slot{width:31.5%;max-width:118px;display:flex;flex-direction:column;align-items:center;gap:4px;transition:transform .12s}
        .lineup-slot.empty{opacity:.9}
        .slot-card{position:relative;width:100%;min-height:180px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:15px 5px 8px;background:linear-gradient(160deg,#16224a 0%,#0b1024 78%);border:2px solid var(--tc,#2a3170);border-radius:14px;color:#fff;cursor:pointer;touch-action:none;box-shadow:0 0 12px color-mix(in srgb,var(--tc) 40%,transparent),inset 0 0 18px rgba(0,0,0,.45);overflow:hidden}
        /* 精灵底不再有淡色光晕，立绘整体放大 50% */
        .slot-img{display:grid;place-items:center;width:96px;height:96px;background:none}
        .slot-img img{width:84px;height:84px;image-rendering:pixelated;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
        .slot-name{font:700 12px var(--sport,sans-serif);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .slot-meta{display:flex;align-items:baseline;gap:4px;font-size:10px;color:var(--text-dim)}
        .slot-meta b{font:700 13px var(--sport,sans-serif);color:var(--tc)}
        .slot-rar{font-size:8.5px;font-weight:700;color:var(--rc);border:1px solid var(--rc);border-radius:4px;padding:0 3px;line-height:1.45;white-space:nowrap}
        .slot-rec{font-size:9px;color:rgba(255,255,255,.66);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:0 6px;line-height:1.5}
        .slot-label{font:700 13px var(--sport,sans-serif);color:var(--gold);letter-spacing:.1em}
        .slot-empty{width:100%;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:2px dashed rgba(255,255,255,.18);border-radius:14px;color:var(--text-dim);background:rgba(0,0,0,.14)}
        .slot-empty small{font-size:10px}
        .lineup-slot.drop-hot{transform:scale(1.04)}
        .lineup-slot.drop-hot .slot-card,.lineup-slot.drop-hot .slot-empty{outline:2px solid var(--gold);box-shadow:0 0 24px rgba(245,197,66,.35)}
        .bench-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 5px 7px;background:linear-gradient(160deg,#16224a,#0b1024 78%);border:2px solid var(--tc,#2a3170);border-radius:10px;color:#fff;cursor:pointer;touch-action:none;box-shadow:0 0 10px color-mix(in srgb,var(--tc) 35%,transparent)}
        .bench-card img{width:46px;height:46px;image-rendering:pixelated;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
        .bench-card .sc-ovr{font:700 12px var(--sport,sans-serif);color:var(--tc)}
        .bench-card .bc-name{font-size:11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .bench-card .bench-rar{font-size:8px;font-weight:700;color:var(--rc);border:1px solid var(--rc);border-radius:4px;padding:0 3px;line-height:1.4}
        .bench-card .bench-rec{font-size:9px;color:var(--text-dim)}
        .bench-card.dim{opacity:.5;color:var(--text-dim);justify-content:center;cursor:default;touch-action:auto}
        .bench-card.drop-hot{outline:2px solid var(--gold);box-shadow:0 0 18px rgba(245,197,66,.32)}
        .bench-grid.drop-hot{outline:2px dashed var(--gold);outline-offset:4px;border-radius:10px}
        .box-rar{font-style:normal;color:var(--rc);font-weight:700}
        .drag-ghost{position:fixed;z-index:1200;pointer-events:none;opacity:.9;transform:translate(-50%,-50%) scale(.86);filter:drop-shadow(0 12px 20px rgba(0,0,0,.65))}
        .team-drag-hint{margin:8px 0 0;text-align:center;font-size:10.5px;color:rgba(173,190,226,.65)}
        .bond-active{margin:9px 0 0;padding:8px 10px;border-radius:10px;background:rgba(245,197,66,.08);border:1px solid rgba(245,197,66,.28)}
        .bond-active>b{display:block;font-size:10.5px;color:var(--gold);letter-spacing:.03em;margin-bottom:5px}
        .ba-list{display:flex;flex-direction:column;gap:5px}
        .ba-item{padding-top:5px;border-top:1px solid rgba(245,197,66,.16)}
        .ba-item:first-child{padding-top:0;border-top:none}
        .ba-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
        .ba-name{font-size:12px;font-weight:700;color:#fff}
        .ba-eff{font-size:10.5px;color:var(--gold);flex-shrink:0}
        .ba-item small{display:block;margin-top:1px;font-size:9.5px;color:var(--text-dim);line-height:1.45}
      </style>
      <div class="page-head"><button class="back" data-back>‹</button><h2>我的球队</h2><span class="count">${save.team.length}/10</span></div>
      <p style="color:var(--text-dim);font-size:12px">独立存档 · 单机自动保存</p>
      <div style="display:flex;gap:10px;margin:10px 0">
        <div class="pk-panel" style="flex:1;padding:10px;text-align:center"><b style="font-size:22px;color:var(--gold)">${teamOvr}</b><small style="display:block;color:var(--text-dim);font-size:11px">队伍评分</small></div>
        <div class="pk-panel" style="flex:1;padding:10px;text-align:center"><b style="font-size:22px;color:var(--gold)">${startersOvr}</b><small style="display:block;color:var(--text-dim);font-size:11px">首发评分</small></div>
        <div class="pk-panel" style="flex:1;padding:10px;text-align:center"><b style="font-size:22px">${save.stats.w}胜${save.stats.l}负</b><small style="display:block;color:var(--text-dim);font-size:11px">战绩</small></div>
      </div>

      <div class="team-h" style="margin:8px 0;color:var(--gold);font-weight:700;border-left:3px solid var(--gold);padding-left:8px">首发阵容 <small style="color:var(--text-dim);font-weight:400;font-size:11px">STARTING FIVE · ${lineup.length} / 5 人</small></div>
      ${SLOT_ROWS.map((row) => `<div class="lineup-row">${row.map((pos) => slotCard(pos, byPos[pos], per)).join("")}</div>`).join("")}
      ${active.length ? `<div class="bond-active"><b>羁绊生效中</b><div class="ba-list">${active.map((b) => `<div class="ba-item"><div class="ba-top"><span class="ba-name">${b.name}</span><span class="ba-eff">${BOND_EFFECT[b.id] || ""}</span></div><small>触发：${b.desc} · ${b.progress}</small></div>`).join("")}</div></div>` : ""}
      <p class="team-drag-hint">直接拖动卡片换位 · 拖到首发槽即可换人 · 推荐位置仅作提示</p>

      <div class="team-h" style="margin:14px 0 8px;color:var(--gold);font-weight:700;border-left:3px solid var(--gold);padding-left:8px">替补席 <small style="color:var(--text-dim);font-weight:400;font-size:11px">SUBSTITUTE · ${benchIds.length} 位待命</small></div>
      <div class="bench-grid" data-bench-drop style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${benchIds.map((id) => benchCard(id)).join("")}
        ${save.team.length < 10 ? benchCard(null) : ""}
      </div>

      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="pk-btn-gold" data-auto style="flex:1;padding:12px">${REFRESH_SVG} 一键布阵</button>
        <button class="pk-btn-gold" data-box style="flex:1;padding:12px;background:none;border:1px solid var(--line);color:var(--text-dim);box-shadow:none">${BOX_SVG} 仓库管理（${save.box.length}）</button>
      </div>
      <div class="team-msg" style="margin-top:8px;color:var(--red);font-size:13px;min-height:18px"></div>
    </div>`;

  // 重渲染后 msg 节点会更新——缓存在 page 上，监听器始终写当前节点
  page.__teamMsg = page.querySelector(".team-msg");
  const say = (text, color) => { const m = page.__teamMsg; if (!m) return; m.style.color = color; m.textContent = text; };
  bindTeamDrag(page);
  // 只绑定一次：从详情/仓库返回会重渲染页面，重复绑定会让一次点击执行多次
  if (page.__teamBound) return;
  page.__teamBound = true;
  page.addEventListener("click", (e) => {
    // 只处理球队视图；仓库/换人视图有自己的委托，避免两个视图的监听器同时响应
    if (page.__view !== "team") return;
    // 刚拖拽过：抑制随后触发的 click，避免误开详情
    if (Date.now() - (page.__dragAt || 0) < 380) return;
    const current = () => page.__teamSave || save;
    if (e.target.closest("[data-back]")) { page.dispatchEvent(new CustomEvent("team-back")); return; }
    const op = e.target.closest("[data-open]");
    if (op) {
      const id = Number(op.dataset.open);
      const s = current();
      // 详情页会自行读档写盘（训练/道具/位置）——返回时取最新档，避免旧对象覆盖
      openDetail(s.mons[id].dex, id, () => renderTeam(page, loadSave() || s));
      return;
    }
    const slot = e.target.closest("[data-empty]");
    if (slot) { say("空位排阵：队伍人数不足 5 人时开球会自动补学员，先去商店/孵蛋结缘新精灵吧", "var(--text-dim)"); return; }
    const auto = e.target.closest("[data-auto]");
    if (auto) {
      // 取最新存档（详情页可能刚改过训练/位置），再穷举 5 人 × 5 位置
      const s = loadSave() || current();
      const lineup = buildAutoLineup(s);
      const ids = lineup.map((x) => x.id);
      s.assign ||= {};
      s.benched ||= {};
      lineup.forEach((x) => { s.assign[x.id] = x.pos; delete s.benched[x.id]; });
      const rest = s.team.filter((id) => !ids.includes(id) && s.mons[id]);
      s.team = [...ids, ...rest].slice(0, 10);
      ensureLineupSlots(s);
      writeSave(s);
      renderTeam(page, s);
      say("已按战力与位置自动布阵（含越位倍率）", "var(--good)");
      setTimeout(() => { const m = page.__teamMsg; if (m && m.isConnected) m.textContent = ""; }, 2000);
      return;
    }
    const box = e.target.closest("[data-box]");
    if (box) renderBoxMgr(page, loadSave() || current());
  });
}

/** 指针拖拽：首发互拖 / 替补换入 / 首发换下 */
function bindTeamDrag(page) {
  if (page.__dragBound) return;
  page.__dragBound = true;
  let drag = null, ghost = null, hot = null;

  const clearHot = () => { hot?.classList.remove("drop-hot"); hot = null; };
  const cleanup = () => { ghost?.remove(); ghost = null; clearHot(); };
  const targetAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest("[data-slot],[data-bench],[data-bench-drop]") : null;
  };
  const flash = (msg, bad) => {
    const m = page.querySelector(".team-msg");
    if (!m) return;
    m.textContent = msg;
    m.style.color = bad ? "var(--red)" : "var(--good)";
    setTimeout(() => { if (m.isConnected) m.textContent = ""; }, 2200);
  };

  // 拖到屏幕上下边缘时自动滚动（替补席在小屏手机上需要滚动才看得到）
  let rafId = 0;
  const stopAutoScroll = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };
  const autoScroll = () => {
    rafId = 0;
    if (!drag || !drag.active) return;
    const r = page.getBoundingClientRect();
    const edge = Math.min(96, r.height * 0.18);
    let dy = 0;
    if (drag.y > r.bottom - edge) dy = Math.min(16, (drag.y - (r.bottom - edge)) * 0.4 + 3);
    else if (drag.y < r.top + edge) dy = -Math.min(16, ((r.top + edge) - drag.y) * 0.4 + 3);
    if (dy) {
      const before = page.scrollTop;
      page.scrollTop += dy;
      if (page.scrollTop !== before) {
        const t = targetAt(drag.x, drag.y);
        if (t !== hot) { clearHot(); hot = t; hot?.classList.add("drop-hot"); }
      }
    }
    rafId = requestAnimationFrame(autoScroll);
  };

  const onMove = (e) => {
    if (!drag) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 9) return;
      drag.active = true;
      const rect = drag.card.getBoundingClientRect();
      ghost = drag.card.cloneNode(true);
      ghost.classList.add("drag-ghost");
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      document.body.appendChild(ghost);
      rafId = requestAnimationFrame(autoScroll);
    }
    e.preventDefault();
    if (ghost) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; }
    const t = targetAt(e.clientX, e.clientY);
    if (t !== hot) { clearHot(); hot = t; hot?.classList.add("drop-hot"); }
  };

  const onUp = (e) => {
    if (!drag) return;
    if (drag.active) {
      const target = targetAt(e.clientX, e.clientY);
      const s = page.__teamSave;
      let msg = "", bad = false;
      if (s && target) {
        if (target.hasAttribute("data-slot")) {
          const pos = target.dataset.slot;
          if (drag.from === "start") {
            if (s.assign?.[drag.id] !== pos) {
              const r = assignStarterSlot(s, drag.id, pos);
              if (r.ok) { writeSave(s); renderTeam(page, s); msg = r.swapped ? "已交换位置" : "位置已调整"; }
              else { msg = r.error || "换位失败"; bad = true; }
            }
          } else {
            const r = substituteBenchToSlot(s, drag.id, pos);
            if (r.ok) {
              writeSave(s); renderTeam(page, s);
              msg = `换人完成：${monZh(s.mons[drag.id].dex)} → ${pos}`;
            } else { msg = r.error || "换人失败"; bad = true; }
          }
        } else if (drag.from === "start") {
          // 指定替补卡，或直接丢在替补席区域（与第一位替补互换）
          const benchId = target.hasAttribute("data-bench")
            ? Number(target.dataset.bench)
            : (benchMonIds(s)[0] ?? null);
          const r = substituteStarterToBench(s, drag.id, benchId);
          if (r.ok) {
            writeSave(s); renderTeam(page, s);
            msg = r.in != null
              ? `${monZh(s.mons[r.in].dex)} 进入首发 · ${monZh(s.mons[r.out].dex)} 回到替补席`
              : `${monZh(s.mons[r.out].dex)} 回到替补席，首发放出空位`;
          } else { msg = r.error || "换人失败"; bad = true; }
        }
      }
      if (msg) flash(msg, bad);
      page.__dragAt = Date.now();
    }
    stopAutoScroll();
    cleanup();
    drag = null;
    if (!page.isConnected) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
  };

  page.addEventListener("pointerdown", (e) => {
    if (page.__view !== "team") return;
    const card = e.target.closest("[data-drag]");
    if (!card) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag = {
      id: Number(card.dataset.drag),
      from: card.dataset.dragFrom || "start",
      x0: e.clientX, y0: e.clientY,
      x: e.clientX, y: e.clientY,
      active: false, card,
    };
  });
  page.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

/** 替补小卡（球星卡同款） */
function benchCard(id) {
  if (!id) return `<div class="bench-card dim"><span class="bc-ico">${USER_SVG}</span><small style="font-size:10px">空位</small></div>`;
  const m = _save.mons[id];
  const b = getPokemon(m.dex);
  const color = TYPE_COLORS[typeOf(m)] || "#a8a77a";
  const rarity = rarityOf(m.dex);
  return `<button class="bench-card" data-open="${id}" data-bench="${id}" data-drag="${id}" data-drag-from="bench" style="--tc:${color}">
    <img src="./sprites/${m.dex}.png" alt="" draggable="false">
    <b class="sc-ovr">${mainOVR(m)}</b>
    <span class="bc-name">${b.name}</span>
    <span class="bench-rar" style="--rc:${RARITY_COLOR[rarity]}">${rarity}</span>
    <span class="bench-rec no-zh">${recommendedPositions(m).join("/")}</span>
  </button>`;
}


/** 仓库管理视图：卡片可看详情；有空位直接调入，满员则选择一名队员换出 */
function renderBoxMgr(page, save) {
  _save = save;
  page.__boxSave = save;
  page.__view = "box";
  const full = save.team.length >= 10;
  const row = (id) => {
    const m = save.mons[id];
    const b = getPokemon(m.dex);
    const color = TYPE_COLORS[typeOf(m)] || "#a8a77a";
    const rarity = rarityOf(m.dex);
    return `<div class="box-row">
      <button class="box-main" data-open="${id}" style="--tc:${color}">
        <img src="./sprites/${m.dex}.png" alt="" loading="lazy" decoding="async">
        <span class="box-meta">
          <b>${b.name}</b>
          <small>Lv.${m.level} · OVR ${mainOVR(m)} · <i class="box-rar" style="--rc:${RARITY_COLOR[rarity]}">${rarity}</i> · 推荐 ${recommendedPositions(m).join("/")}</small>
        </span>
      </button>
      <button class="box-in" data-in="${id}">${full ? "换入队伍" : "调入队伍"}</button>
    </div>`;
  };
  page.innerHTML = `
    <div class="sub-inner">
      <div class="page-head"><button class="back" data-boxback>‹</button><h2>仓库</h2><span class="count">${save.box.length} 只</span></div>
      <p class="page-sub">点击卡片查看详情${full ? "；队伍已满，换入时需选择一名队员放入仓库" : "；队伍有空位时可直接调入"}</p>
      ${save.box.length ? `<div class="box-list">${save.box.map(row).join("")}</div>` : `<div class="empty-art">
        ${EMPTY_BOX_SVG}
        <b class="empty-title">仓库空着</b>
        <p class="empty-sub">队伍满 10 人时，新结缘的精灵会自动进入仓库</p>
        <button class="pk-btn-gold empty-cta" data-boxback>返回球队</button>
      </div>`}
      <div class="team-msg box-msg"></div>
    </div>`;

  if (page.__boxBound) return;
  page.__boxBound = true;
  page.addEventListener("click", (e) => {
    if (page.__view !== "box" && page.__view !== "swap") return;
    const current = () => loadSave() || page.__boxSave || save;
    if (e.target.closest("[data-boxback]")) {
      const s = current();
      renderTeam(page, s);
      return;
    }
    if (e.target.closest("[data-swapback]")) {
      const s = current();
      renderBoxMgr(page, s);
      return;
    }
    const out = e.target.closest("[data-out]");
    if (out) {
      const s = current();
      const boxId = page.__swapBoxId;
      const inMon = s.mons[boxId];
      const outId = Number(out.dataset.out);
      const outMon = s.mons[outId];
      let r = moveMon(s, outId, "box");
      if (r.ok) r = moveMon(s, boxId, "team");
      if (!r.ok) {
        const msg = page.querySelector(".box-msg");
        if (msg) msg.textContent = "换入失败：" + r.error;
        return;
      }
      ensureLineupSlots(s);
      writeSave(s);
      renderBoxMgr(page, s);
      const msg = page.querySelector(".box-msg");
      if (msg) msg.textContent = `${getPokemon(outMon.dex).name} 已入仓库 · ${getPokemon(inMon.dex).name} 已加入队伍`;
      return;
    }
    const inn = e.target.closest("[data-in]");
    if (inn) {
      const s = current();
      const id = Number(inn.dataset.in);
      if (s.team.length >= 10) {
        page.__swapBoxId = id;
        renderBoxSwap(page, s, id);
        return;
      }
      const r = moveMon(s, id, "team");
      if (!r.ok) {
        const msg = page.querySelector(".box-msg");
        if (msg) msg.textContent = "调动失败：" + r.error;
        return;
      }
      ensureLineupSlots(s);
      writeSave(s);
      renderBoxMgr(page, s);
      const msg = page.querySelector(".box-msg");
      if (msg) msg.textContent = `${getPokemon(s.mons[id].dex).name} 已调入队伍`;
      return;
    }
    const op = e.target.closest("[data-open]");
    if (op) {
      const s = current();
      const id = Number(op.dataset.open);
      openDetail(s.mons[id].dex, id, () => renderBoxMgr(page, loadSave() || s));
    }
  });
}

/** 队伍满员时：选择要放入仓库的队员，与仓库精灵交换 */
function renderBoxSwap(page, save, boxId) {
  page.__boxSave = save;
  page.__view = "swap";
  const mon = save.mons[boxId];
  const b = getPokemon(mon.dex);
  const team = save.team.filter((id) => save.mons[id]);
  page.innerHTML = `
    <div class="sub-inner">
      <div class="page-head"><button class="back" data-swapback>‹</button><h2>换入队伍</h2><span class="count">队伍 ${team.length}/10</span></div>
      <p class="page-sub">队伍已满。选择一名队员放入仓库，<b style="color:var(--gold)">${b.name}</b> 将加入队伍。</p>
      <div class="box-swap-list">
        ${team.map((id) => {
          const m = save.mons[id];
          const p = getPokemon(m.dex);
          const starter = !!save.assign?.[id];
          const rarity = rarityOf(m.dex);
          return `<div class="box-row">
            <span class="box-meta">
              <b>${p.name}</b>
              <small>Lv.${m.level} · OVR ${mainOVR(m)} · <i class="box-rar" style="--rc:${RARITY_COLOR[rarity]}">${rarity}</i> · ${starter ? "首发" : "替补"}</small>
            </span>
            <button class="box-in box-out" data-out="${id}">换出</button>
          </div>`;
        }).join("")}
      </div>
      <div class="team-msg box-msg"></div>
    </div>`;
}












