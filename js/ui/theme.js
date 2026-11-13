/**
 * ui/theme.js —— 局外界面风格 + 双版本模式
 * - 正式版：锁定「复古体育」，不加载主题切换入口
 * - 体验版：URL 加 ?themes=1 时开放四主题切换
 * 持久化键：pokedunk.uiTheme
 */
const KEY = "pokedunk.uiTheme";
const LOCKED = "black";

/** 是否开放主题切换：默认关闭，?themes=1 开启 */
export const THEME_SWITCH_ENABLED = (() => {
  try {
    return new URLSearchParams(location.search).get("themes") === "1";
  } catch {
    return false;
  }
})();

export const THEMES = [
  ["retro", "复古体育"],
  ["black", "墨黑"],
  ["classic", "暗黑原版"],
  ["valorant", "战术"],
  ["stardew", "星露谷"],
  ["terraria", "泰拉瑞亚"],
];

const REAL_THEMES = new Set(["retro", "black"]);

/** 正式版只显示复古体育 / 墨黑；?themes=1 显示全部 */
export const VISIBLE_THEMES = THEME_SWITCH_ENABLED
  ? THEMES
  : THEMES.filter((x) => REAL_THEMES.has(x[0]));

const VISIBLE_VALID = new Set(VISIBLE_THEMES.map((x) => x[0]));

const HREF = {
  retro: "./css/retro.css?v=25",
  classic: "./css/classic.css?v=1",
  valorant: "./css/valorant.css?v=10",
  stardew: "./css/stardew.css?v=4",
  terraria: "./css/terraria.css?v=3",
  black: "./css/black.css?v=10",
};

export function loadTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return VISIBLE_VALID.has(v) ? v : LOCKED;
  } catch {
    return LOCKED;
  }
}

export function applyTheme(name) {
  const t = VISIBLE_VALID.has(name) ? name : LOCKED;
  let link = document.getElementById("ui-theme-style");
  if (!link) {
    link = document.createElement("link");
    link.id = "ui-theme-style";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = HREF[t];
  document.documentElement.dataset.uiTheme = t;
  return t;
}

export function setTheme(name) {
  const t = VISIBLE_VALID.has(name) ? name : LOCKED;
  try { localStorage.setItem(KEY, t); } catch {}
  return applyTheme(t);
}
