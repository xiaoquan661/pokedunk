/**
 * ui/icons.js —— 统一 SVG 图标集 · 第三版（pokedunk-v2）
 * 风格：贴纸/徽章质感 —— 实色渐变 + 深色描边 + 白色高光，无外圈底；
 * 贴近参考图（口袋幸存者）的彩色图标观感。24×24 viewBox，尺寸由外层 CSS 控制。
 */
const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
const grad = (id, top, bottom) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`;

export const ICON = {
  /* 篮球币：金色币框 + 橙色篮球芯 */
  coin: svg(
    grad("ic-coin", "#ffe27a", "#dfa000") +
      `<circle cx="12" cy="12" r="9.4" fill="url(#ic-coin)" stroke="#6b4a00" stroke-width="1.7"/>` +
      `<circle cx="12" cy="12" r="6.5" fill="#f28a2e" stroke="#7a3c00" stroke-width="1.5"/>` +
      `<path d="M5.5 12h13M12 5.5v13M8.2 8.1c2.4 1.8 5.2 1.8 7.6 0M8.2 15.9c2.4-1.8 5.2-1.8 7.6 0" fill="none" stroke="#7a3c00" stroke-width="1.35" stroke-linecap="round"/>` +
      `<ellipse cx="8.7" cy="7.6" rx="2.4" ry="1.3" fill="#fff" opacity=".62" transform="rotate(-25 8.7 7.6)"/>`
  ),
  /* 比赛：篮球 */
  ball: svg(
    grad("ic-ball", "#ffb266", "#e26a12") +
      `<circle cx="12" cy="12.4" r="9" fill="url(#ic-ball)" stroke="#7a3c00" stroke-width="1.7"/>` +
      `<path d="M3.4 12.4h17.2M12 3.4v18M6 6.4c3.6 2.9 8.4 2.9 12 0M6 18.4c3.6-2.9 8.4-2.9 12 0" fill="none" stroke="#5c2a00" stroke-width="1.5"/>` +
      `<ellipse cx="8.4" cy="7.6" rx="2.8" ry="1.6" fill="#fff" opacity=".5" transform="rotate(-28 8.4 7.6)"/>`
  ),
  /* 图鉴：书本 */
  book: svg(
    grad("ic-book", "#6f9bff", "#2f57b8") +
      `<rect x="4.4" y="3.4" width="14.2" height="17.2" rx="2" fill="url(#ic-book)" stroke="#16295e" stroke-width="1.6"/>` +
      `<path d="M8 3.8v16.4" stroke="#cfe0ff" stroke-width="1.8"/>` +
      `<path d="M11 8.2h5M11 11.4h5M11 14.6h3.4" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>` +
      `<rect x="14.4" y="3.6" width="2.2" height="4.4" rx=".8" fill="#ffd84d" stroke="#6b4a00" stroke-width=".9"/>`
  ),
  /* 队伍：两名球员 */
  team: svg(
    grad("ic-team", "#ffffff", "#c3d2f2") +
      `<circle cx="9" cy="8" r="3.4" fill="url(#ic-team)" stroke="#26406f" stroke-width="1.4"/>` +
      `<path d="M3.8 19.4c.3-3.4 2.4-5.4 5.2-5.4s4.9 2 5.2 5.4z" fill="url(#ic-team)" stroke="#26406f" stroke-width="1.4"/>` +
      `<circle cx="17.2" cy="9.4" r="2.5" fill="#8fa8d8" stroke="#26406f" stroke-width="1.2"/>` +
      `<path d="M15 18.8c.2-2.4 1.5-3.8 3.3-3.8 1.8 0 3.1 1.4 3.3 3.8z" fill="#8fa8d8" stroke="#26406f" stroke-width="1.2"/>`
  ),
  /* 商店：摊位 */
  shop: svg(
    grad("ic-shop", "#ff8f6b", "#d94f2b") +
      `<path d="M4 9.6 5.2 4.4h13.6L20 9.6z" fill="url(#ic-shop)" stroke="#5c1f0e" stroke-width="1.5"/>` +
      `<path d="M4.6 9.6h4V4.6h-3zM12.6 9.6h4l-1-5h-3z" fill="#fff" opacity=".85"/>` +
      `<rect x="5.4" y="9.6" width="13.2" height="10" rx="1.4" fill="#f4efe2" stroke="#5c1f0e" stroke-width="1.5"/>` +
      `<path d="M5.6 13.4h12.8" stroke="#c9b98f" stroke-width="1.3"/>` +
      `<circle cx="9.4" cy="16.6" r="1.1" fill="#e4572e"/><circle cx="14.6" cy="16.6" r="1.1" fill="#e4572e"/>`
  ),
  /* 孵蛋：蛋 */
  egg: svg(
    grad("ic-egg", "#fffdf4", "#e5d9b8") +
      `<path d="M12 2.8c4.4 0 7.2 5.2 7.2 9.8 0 4.5-3 7.8-7.2 7.8s-7.2-3.3-7.2-7.8c0-4.6 2.8-9.8 7.2-9.8z" fill="url(#ic-egg)" stroke="#8a7550" stroke-width="1.6"/>` +
      `<ellipse cx="9.2" cy="8.4" rx="1.8" ry="2.6" fill="#fff" opacity=".85" transform="rotate(-18 9.2 8.4)"/>` +
      `<circle cx="13.6" cy="14.6" r=".9" fill="#d9c79a"/><circle cx="10.4" cy="16.2" r=".7" fill="#d9c79a"/>`
  ),
  /* 背包 */
  bag: svg(
    grad("ic-bag", "#c98a4b", "#8a5524") +
      `<rect x="7.4" y="4" width="9.2" height="5" rx="2.5" fill="none" stroke="#5b3a14" stroke-width="1.6"/>` +
      `<path d="M5.6 8.4h12.8l1.1 10.2a1.8 1.8 0 0 1-1.8 2H6.3a1.8 1.8 0 0 1-1.8-2z" fill="url(#ic-bag)" stroke="#5b3a14" stroke-width="1.6"/>` +
      `<path d="M5.8 12.2h12.4" stroke="#5b3a14" stroke-width="1.3" opacity=".7"/>` +
      `<rect x="10.4" y="10.8" width="3.2" height="2.8" rx=".8" fill="#ffd84d" stroke="#6b4a00" stroke-width="1"/>`
  ),
  /* 设置：齿轮 */
  gear: svg(
    grad("ic-gear", "#dfe8ff", "#93a6cc") +
      `<path d="M12 2.6l2.1 2.2 3-.6.6 3 2.4 1.9-1.4 2.7 1.4 2.7-2.4 1.9-.6 3-3-.6L12 21.4l-2.1-2.2-3 .6-.6-3-2.4-1.9L5.3 12 3.9 9.3l2.4-1.9.6-3 3 .6z" fill="url(#ic-gear)" stroke="#33456e" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<circle cx="12" cy="12" r="3.2" fill="#33456e"/><circle cx="12" cy="12" r="1.4" fill="#dfe8ff"/>`
  ),
  /* 成就：奖杯 */
  trophy: svg(
    grad("ic-trophy", "#ffe27a", "#d99f00") +
      `<path d="M7.6 3.8h8.8v4.8a4.4 4.4 0 0 1-8.8 0z" fill="url(#ic-trophy)" stroke="#6b4a00" stroke-width="1.5"/>` +
      `<path d="M7.6 5.4H4.6v1.6a3.6 3.6 0 0 0 3.4 3.6M16.4 5.4h3v1.6a3.6 3.6 0 0 1-3.4 3.6" fill="none" stroke="#6b4a00" stroke-width="1.5"/>` +
      `<path d="M12 13v3.4" stroke="#6b4a00" stroke-width="1.8"/>` +
      `<rect x="8.6" y="17.6" width="6.8" height="2.6" rx="1" fill="#c98a2b" stroke="#6b4a00" stroke-width="1.3"/>` +
      `<ellipse cx="9.6" cy="5.6" rx="1.3" ry=".9" fill="#fff" opacity=".65"/>`
  ),
  /* 树果 */
  berry: svg(
    grad("ic-berry", "#7fb0ff", "#2f55b0") +
      `<ellipse cx="12" cy="14.6" rx="7" ry="6.4" fill="url(#ic-berry)" stroke="#16295e" stroke-width="1.6"/>` +
      `<path d="M12 8.4c.8-2.2 2.7-3.5 4.9-3.2-.3 2.2-1.7 3.7-3.9 4.4" fill="#4caf50" stroke="#215c25" stroke-width="1.2"/>` +
      `<ellipse cx="9.4" cy="11.8" rx="2.1" ry="1.4" fill="#fff" opacity=".55" transform="rotate(-22 9.4 11.8)"/>` +
      `<circle cx="11" cy="15" r="1.6" fill="#22408f" opacity=".35"/>`
  ),
};

/** 行内小图标（价格/计数用） */
export const coinInline = `<span class="coin-ico">${ICON.coin}</span>`;
