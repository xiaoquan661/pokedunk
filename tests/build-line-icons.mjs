import fs from "node:fs";
import path from "node:path";

const src = path.resolve("tests/ui-preview-icons");
const map = {
  ball: "basketball",
  daily: "calendar-check",
  trophy: "trophy",
  tutorial: "graduation-cap",
  book: "book-open",
  team: "users-three",
  shop: "storefront",
  egg: "egg",
  bag: "backpack",
  settings: "gear",
  coin: "coin",
};
const svg = (inner) => `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${inner}</svg>`;
const lines = [];
for (const [key, file] of Object.entries(map)) {
  const raw = fs.readFileSync(path.join(src, `${file}.svg`), "utf8");
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").trim();
  lines.push(`  ${key}: ${JSON.stringify(svg(inner)).replace(/^"|"$/g, "`")},`);
}
const out = `/**
 * ui/menu-line-icons.js —— 主菜单线框图标（Phosphor Regular，MIT）
 * https://phosphoricons.com
 * 统一 256×256 画布，fill=currentColor，颜色由 CSS 控制。
 */
export const LINE_ICON = {
${lines.join("\n")}
};
`;
fs.writeFileSync(path.resolve("js/ui/menu-line-icons.js"), out);
console.log("written js/ui/menu-line-icons.js");
