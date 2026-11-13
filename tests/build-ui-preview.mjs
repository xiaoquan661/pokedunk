import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("tests/ui-preview-icons");
const names = ["basketball", "calendar-check", "trophy", "graduation-cap", "book-open", "users-three", "storefront", "egg", "backpack", "gear", "coin"];
const icon = {};
for (const n of names) {
  const svg = fs.readFileSync(path.join(dir, `${n}.svg`), "utf8");
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "");
  icon[n] = `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${inner}</svg>`;
}

const item = (key, title, sub) => `<button class="pv-item"><span class="pv-icon">${icon[key]}</span><span class="pv-txt"><b>${title}</b><small>${sub}</small></span></button>`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>图标风格预览</title>
<link rel="stylesheet" href="../css/main.css?v=16">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#0c1730;display:flex;justify-content:center;align-items:flex-start;padding:18px 10px;color:#fff;font-family:var(--sport,monospace)}
.pv-phone{width:390px;max-width:100%}
.pv-name{text-align:center;color:#9ad8ff;font-size:13px;letter-spacing:.08em;margin:0 0 10px}
.pv-sub{text-align:center;color:rgba(173,190,226,.65);font-size:10px;margin:-6px 0 12px}
.pv-panel{background:linear-gradient(180deg,#24447e,#1e3a6e);border:2px solid #2f5599;border-radius:16px;padding:10px}
.pv-hero,.pv-daily,.pv-item{font-family:inherit;color:#fff;cursor:pointer}
.pv-hero{display:flex;align-items:center;gap:10px;width:100%;padding:12px 6px;border:0;border-bottom:1px solid rgba(255,255,255,.12);background:none;text-align:left}
.pv-daily{display:flex;align-items:center;gap:9px;width:100%;padding:10px 8px;margin:2px 0 8px;border:1px solid rgba(245,197,66,.5);border-radius:10px;background:rgba(245,197,66,.07);text-align:left}
.pv-main-icon{width:38px;height:38px;flex-shrink:0;color:var(--ico-main,#f5c542)}
.pv-main-icon svg,.pv-icon svg{width:100%;height:100%;display:block}
.pv-icon{width:32px;height:32px;flex-shrink:0;color:var(--ico-nav,#9ad8ff)}
.pv-txt{display:flex;flex-direction:column;gap:1px;min-width:0;text-align:left}
.pv-hero b{font-size:18px;color:var(--ico-main,#f5c542)}
.pv-hero small{font-size:10.5px;color:rgba(173,190,226,.9)}
.pv-daily b{font-size:15px;color:var(--ico-main,#f5c542)}
.pv-daily small{font-size:9.5px;color:rgba(245,197,66,.78);white-space:nowrap}
.pv-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.pv-item{display:flex;align-items:center;gap:9px;padding:9px 4px;border:0;border-bottom:1px solid rgba(255,255,255,.07);background:none;text-align:left}
.pv-item:nth-last-child(-n+2){border-bottom:0}
.pv-item b{display:block;font-size:14px;white-space:nowrap}
.pv-item small{display:block;font-size:9.5px;color:rgba(173,190,226,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.style-gold{--ico-main:#f5c542;--ico-nav:#f5c542}
body.style-ice{--ico-main:#f5c542;--ico-nav:#9ad8ff}
body.style-duo{--ico-main:#f5c542;--ico-nav:#eaf6ff}
</style>
</head>
<body class="style-duo">
<div class="pv-phone">
  <p class="pv-name" id="pvName">风格 C · 白金线框</p>
  <p class="pv-sub">图标仅示意 · 同一个 32px 画布</p>
  <div class="pv-panel">
    <button class="pv-hero"><span class="pv-main-icon">${icon.basketball}</span><span class="pv-txt"><b>开始比赛</b><small>赛季 1 · 第 1 轮 · VS 深灰道馆</small></span></button>
    <button class="pv-daily"><span class="pv-main-icon">${icon["calendar-check"]}</span><span class="pv-txt"><b>每日挑战</b><small>今日 全明星 · 最高分 未挑战</small></span></button>
    <div class="pv-grid">
      ${item("trophy", "成就", "1 / 16 · 里程碑")}
      ${item("graduation-cap", "新手教程", "操作 · 规则 · 训练")}
      ${item("book-open", "图鉴", "1 / 291 已结缘")}
      ${item("users-three", "队伍", "1/10 · 仓库 0")}
      ${item("storefront", "每日商店", "精灵 · 蛋 · 树果")}
      ${item("egg", "孵蛋", "0/1 槽")}
      ${item("backpack", "背包", "树果 ×0")}
      ${item("gear", "设置", "难度 · 声音 · 存档")}
    </div>
  </div>
</div>
<script>
const q = new URLSearchParams(location.search);
const style = q.get("style") || "duo";
document.body.className = "style-" + style;
document.getElementById("pvName").textContent = ({gold:"风格 A · 金色线框", ice:"风格 B · 冰蓝线框", duo:"风格 C · 白金线框"})[style] || "风格 C · 白金线框";
</script>
</body>
</html>`;

fs.writeFileSync(path.resolve("tests/ui-style-preview.html"), html);
console.log("written tests/ui-style-preview.html");
