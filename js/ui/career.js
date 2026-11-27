/**
 * ui/career.js —— 生涯统计页
 * 球队战绩 / 本赛季走势 / 球员场均 / 宝可梦与图鉴收集
 */
import { careerSummary } from "../systems/career.js?v=694";
import { loadSave } from "../storage.js?v=694";
import { TYPE_COLORS } from "../../engine/readable/play-core.js?v=694";

const TYPE_ZH = { Normal: "一般", Fire: "火", Water: "水", Electric: "电", Grass: "草", Ice: "冰", Fighting: "格斗", Poison: "毒", Ground: "地面", Flying: "飞行", Psychic: "超能力", Bug: "虫", Rock: "岩石", Ghost: "幽灵", Dragon: "龙", Dark: "恶", Steel: "钢", Fairy: "妖精" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const pctTxt = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);

export function renderCareer(root) {
  const save = loadSave();
  const s = careerSummary(save || {});
  const season = s.season;
  const awards = s.awards.slice(0, 5);
  const top = s.players.slice(0, 6);

  const statCell = (label, value, sub = "") => `<div class="cr-cell"><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ""}</div>`;
  const seasonBar = (a, b) => {
    const total = Math.max(1, a + b);
    return `<div class="cr-bar"><i style="width:${(a / total) * 100}%"></i></div>`;
  };
  const typeChips = s.collection.topTypes.length
    ? s.collection.topTypes.map(([t, c]) => `<span class="cr-type" style="--tc:${TYPE_COLORS[t] || "#888"}">${TYPE_ZH[t] || t}<b>${c}</b></span>`).join("")
    : `<span class="cr-muted">队伍暂无属性数据</span>`;
  const awardHtml = awards.length
    ? `<div class="cr-awards">${awards.map((a) => `<span class="cr-award"><b>${esc(a.label)}</b>${esc(a.name)}${a.line ? `<small>${esc(a.line)}</small>` : ""}</span>`).join("")}</div>`
    : `<p class="cr-muted">本赛季暂无奖项记录。</p>`;

  root.innerHTML = `
    <style>${CSS}</style>
    <div class="page-head">
      <button class="back" data-back>‹</button>
      <h2>生涯统计</h2>
      <span class="count">S${season.no}</span>
    </div>
    <div class="cr-page">
      <div class="cr-hero">
        <div class="cr-hero-top"><span class="cr-kicker">CAREER · ${esc(s.coach)}</span><span class="cr-seasons">第 ${s.seasons} 赛季</span></div>
        <div class="cr-record"><b>${s.wins}</b><span>胜</span><i>—</i><b>${s.losses}</b><span>负</span><em>${fmt(s.winPct, 1)}%</em></div>
        <div class="cr-hero-meta"><span>执教 ${s.games} 场</span><span>总冠军 ${s.championships}</span><span>徽章 ${s.badges}</span></div>
      </div>

      <div class="cr-sec"><b>生涯概览</b><small>累计比赛</small></div>
      <div class="cr-grid">
        ${statCell("场均得分", fmt(s.ppg), `总得分 ${Math.round(s.pf)}`)}
        ${statCell("场均失分", fmt(s.papg), `总失分 ${Math.round(s.pa)}`)}
        ${statCell("场均净胜", `${s.diff >= 0 ? "+" : ""}${fmt(s.diff)}`)}
        ${statCell("最佳连胜", s.bestStreak, s.streak ? `当前 ${s.streak} 连胜` : "当前无连胜")}
        ${statCell("总冠军", s.championships)}
        ${statCell("累计徽章", s.badges)}
      </div>

      <div class="cr-sec"><b>本赛季</b><small>第 ${season.no} 赛季 · ${season.champion ? "地区冠军" : "进行中"}</small></div>
      <div class="cr-season">
        <div class="cr-season-top"><span>${season.wins} 胜 ${season.losses} 负</span><b>${season.games} 场</b></div>
        ${seasonBar(season.wins, season.losses)}
        <div class="cr-grid cr-grid-4">
          ${statCell("场均得分", fmt(season.ppg))}
          ${statCell("场均失分", fmt(season.papg))}
          ${statCell("单场最高", season.bestGame || "—")}
          ${statCell("赛季连胜", season.bestStreak || "—")}
        </div>
      </div>

      <div class="cr-sec"><b>球员数据</b><small>当前赛季 · 按场均得分</small></div>
      ${top.length ? `<div class="cr-mon-list">${top.map((p) => `
        <div class="cr-mon">
          <img loading="lazy" src="./sprites/${p.dex}.png" alt="${esc(p.name)}">
          <div class="cr-mon-main">
            <div class="cr-mon-name"><b>${esc(p.name)}</b><span>${esc(p.pos)} · Lv.${p.level} · OVR ${p.ovr}</span></div>
            <div class="cr-mon-line"><b>${fmt(p.ppg)}</b> 分 · ${fmt(p.rpg)} 板 · ${fmt(p.apg)} 助 · ${fmt(p.spg)} 断 · ${fmt(p.bpg)} 帽</div>
            <div class="cr-mon-sub">${p.gp} 场 · 首发 ${p.gs} · 命中 ${pctTxt(p.fg)} · 三分 ${pctTxt(p.tp)}</div>
          </div>
        </div>`).join("")}</div>` : `<p class="cr-muted">还没有球员出场记录，打一场比赛后这里会出现场均数据。</p>`}
      ${awardHtml}

      <div class="cr-sec"><b>宝可梦与收集</b><small>训练师档案</small></div>
      <div class="cr-collect">
        <div class="cr-dex">
          <div class="cr-dex-head"><span>图鉴收集</span><b>${s.collection.dexOwned} / ${s.collection.dexTotal}</b></div>
          <div class="cr-bar"><i style="width:${Math.min(100, (s.collection.dexOwned / s.collection.dexTotal) * 100)}%"></i></div>
          <div class="cr-dex-foot"><span>传说 ${s.collection.legendOwned}</span><span>稀有 ${s.collection.rareOwned}</span></div>
        </div>
        <div class="cr-grid cr-grid-3">
          ${statCell("队伍规模", `${s.collection.teamSize} / 10`)}
          ${statCell("队伍均级", fmt(s.collection.avgLv))}
          ${statCell("球队战力", s.collection.teamPower)}
        </div>
        <div class="cr-type-title">队伍属性分布</div>
        <div class="cr-types">${typeChips}</div>
      </div>

      <p class="cr-note">生涯数据记录主线比赛；每日挑战与快速比赛不计入战绩。</p>
    </div>`;
}

const CSS = `
.cr-page{display:flex;flex-direction:column;gap:8px;padding-bottom:8px}
.cr-hero{padding:15px 14px 13px;border:1px solid color-mix(in srgb,var(--gold,#f5c542) 42%,transparent);border-radius:11px;
  background:radial-gradient(120% 130% at 100% 0%,rgba(245,197,66,.16),transparent 62%),linear-gradient(160deg,rgba(245,197,66,.08),rgba(0,0,0,.2))}
.cr-hero-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}
.cr-kicker{font:700 9px var(--sport,sans-serif);letter-spacing:.09em;color:var(--gold,#f5c542)}
.cr-seasons{font:700 9px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
.cr-record{display:flex;align-items:baseline;gap:5px;font-variant-numeric:tabular-nums}
.cr-record b{font:800 34px/1 var(--sport,sans-serif);color:var(--text,#fff)}
.cr-record span{font:700 10px var(--sport,sans-serif);color:var(--text-dim,#b9b0a0)}
.cr-record i{font-style:normal;color:var(--text-dim,#b9b0a0);margin:0 2px}
.cr-record em{margin-left:auto;font:800 17px var(--sport,sans-serif);font-style:normal;color:var(--gold,#f5c542)}
.cr-hero-meta{display:flex;gap:12px;margin-top:7px;font-size:9.5px;color:var(--text-dim,#b9b0a0)}
.cr-sec{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:3px}
.cr-sec b{font:700 13px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.cr-sec small{font-size:9px;color:var(--text-dim,#b9b0a0)}
.cr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.cr-grid-4{grid-template-columns:repeat(4,1fr);gap:5px}
.cr-grid-3{grid-template-columns:repeat(3,1fr);gap:5px}
.cr-cell{display:flex;flex-direction:column;gap:1px;padding:8px 9px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:7px;background:rgba(0,0,0,.18);min-width:0}
.cr-cell small{font-size:8.5px;color:var(--text-dim,#b9b0a0);white-space:nowrap}
.cr-cell b{font:700 18px var(--sport,sans-serif);color:var(--text,#fff);font-variant-numeric:tabular-nums}
.cr-cell em{font:400 8px var(--sport,sans-serif);font-style:normal;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-grid-4 .cr-cell{padding:7px 6px}
.cr-grid-4 .cr-cell b{font-size:14px}
.cr-season{padding:9px 10px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;background:rgba(0,0,0,.16)}
.cr-season-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.cr-season-top span{font:700 12px var(--sport,sans-serif);color:var(--text,#fff)}
.cr-season-top b{font:700 10px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.cr-bar{display:block;height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;margin-bottom:7px}
.cr-bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--gold,#f5c542),#ffdf7a)}
.cr-mon-list{display:flex;flex-direction:column;gap:5px}
.cr-mon{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:7px;background:rgba(0,0,0,.16)}
.cr-mon img{width:40px;height:40px;object-fit:contain;flex:none}
.cr-mon-main{min-width:0;flex:1}
.cr-mon-name{display:flex;align-items:baseline;gap:5px;min-width:0}
.cr-mon-name b{font:700 11px var(--sport,sans-serif);color:var(--text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-mon-name span{font-size:8px;color:var(--text-dim,#b9b0a0);white-space:nowrap;flex:none}
.cr-mon-line{font-size:9.5px;color:var(--text,#fff);margin-top:2px;font-variant-numeric:tabular-nums}
.cr-mon-line b{font:800 12px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.cr-mon-sub{font-size:8px;color:var(--text-dim,#b9b0a0);margin-top:1px;font-variant-numeric:tabular-nums}
.cr-awards{display:flex;gap:5px;overflow-x:auto;padding:2px 0 1px;scrollbar-width:none}
.cr-awards::-webkit-scrollbar{display:none}
.cr-award{flex:none;display:flex;flex-direction:column;gap:1px;padding:5px 7px;border:1px solid rgba(245,197,66,.35);border-radius:6px;background:rgba(245,197,66,.08);font-size:9px;color:var(--text,#fff);max-width:150px}
.cr-award b{font:700 8px var(--sport,sans-serif);color:var(--gold,#f5c542)}
.cr-award small{font-size:8px;color:var(--text-dim,#b9b0a0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-collect{padding:9px 10px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;background:rgba(0,0,0,.16)}
.cr-dex{margin-bottom:7px}
.cr-dex-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;font-size:9.5px;color:var(--text-dim,#b9b0a0)}
.cr-dex-head b{font:700 12px var(--sport,sans-serif);color:var(--text,#fff)}
.cr-dex-foot{display:flex;gap:12px;margin-top:-3px;font-size:8.5px;color:var(--text-dim,#b9b0a0)}
.cr-type-title{font-size:9px;color:var(--text-dim,#b9b0a0);margin:8px 0 4px}
.cr-types{display:flex;flex-wrap:wrap;gap:4px}
.cr-type{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:999px;border:1px solid var(--tc,#888);background:color-mix(in srgb,var(--tc,#888) 16%,transparent);color:var(--text,#fff);font-size:9px}
.cr-type b{font:700 9px var(--sport,sans-serif);color:var(--tc,#fff)}
.cr-muted{margin:2px 0;font-size:9.5px;color:var(--text-dim,#b9b0a0);line-height:1.5}
.cr-note{margin:3px 0 0;font-size:8.5px;color:var(--text-dim,#b9b0a0);text-align:center}
@media (max-width:350px){.cr-grid-4{grid-template-columns:repeat(2,1fr)}}
`;
