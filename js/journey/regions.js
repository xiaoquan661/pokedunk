/**
 * journey/regions.js —— 主线地区与等级上限（S65，Phase 1）
 * 一个地区 = 8 馆 + 四天王 + 冠军；一个地区固定 20 级段。
 * 等级段：0–1 徽章开段内第 10 级，2–5 徽章第 15 级，6–8 徽章满 20 级。
 * 当前开放：关都；城都数据完整但内容待接入；丰缘数据不足（14/135）。
 */
export const REGIONS = [
  {
    no: 1, id: "kanto", name: "关都", from: 1, to: 20, available: true,
    gyms: [
      { name: "深灰道馆", leader: "小刚", type: "岩石", badge: "Boulder" },
      { name: "华蓝道馆", leader: "小霞", type: "水", badge: "Cascade" },
      { name: "枯叶道馆", leader: "马志士", type: "电", badge: "Thunder" },
      { name: "彩虹道馆", leader: "莉佳", type: "草", badge: "Rainbow" },
      { name: "浅红道馆", leader: "阿桔", type: "毒", badge: "Soul" },
      { name: "金黄道馆", leader: "娜姿", type: "超能", badge: "Marsh" },
      { name: "红莲道馆", leader: "夏伯", type: "火", badge: "Volcano" },
      { name: "常磐道馆", leader: "坂木", type: "地面", badge: "Earth" },
    ],
  },
  {
    no: 2, id: "johto", name: "城都", from: 21, to: 40, available: false,
    gyms: [
      { name: "桔梗道馆", leader: "阿速", type: "飞行", badge: "Zephyr" },
      { name: "桧皮道馆", leader: "阿笔", type: "虫", badge: "Hive" },
      { name: "满金道馆", leader: "小茜", type: "一般", badge: "Plain" },
      { name: "圆朱道馆", leader: "松叶", type: "幽灵", badge: "Fog" },
      { name: "湛蓝道馆", leader: "阿四", type: "格斗", badge: "Storm" },
      { name: "浅葱道馆", leader: "阿蜜", type: "钢", badge: "Mineral" },
      { name: "卡吉道馆", leader: "柳伯", type: "冰", badge: "Glacier" },
      { name: "烟墨道馆", leader: "小椿", type: "龙", badge: "Rising" },
    ],
  },
  { no: 3, id: "hoenn", name: "丰缘", from: 41, to: 60, available: false, gyms: [] },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function regionOf(save) {
  const no = clamp(Number(save?.journey?.regionNo) || 1, 1, REGIONS.length);
  return REGIONS[no - 1];
}

/** 旧档兼容：没有 capV 的档不强制上限；有 capV 的新档正常吃等级上限 */
export function ensureMainline(save) {
  const j = (save.journey ||= {});
  j.regionNo = clamp(Number(j.regionNo) || 1, 1, REGIONS.length);
  j.mainQuest ||= { seen: {}, claimed: {} };
  if (!j.capV) {
    j.capV = 1;
    const maxLv = Math.max(1, ...Object.values(save.mons || {}).map((m) => Number(m?.level) || 1));
    j.legacyCap = maxLv;
    j.capExempt = maxLv > REGIONS[0].to;
  }
  return regionOf(save);
}

export function badgeCountOf(save) {
  const s = save?.journey?.season;
  if (!s) return 0;
  return (s.badges || []).filter((b) => b !== "champion").length;
}

export function levelCapOf(save) {
  const j = (save.journey ||= {});
  if (j.capExempt) return 99;
  const reg = regionOf(save);
  const s = j.season;
  const n = badgeCountOf(save);
  if (s?.champion || n >= 6) return reg.to;
  if (n >= 2) return reg.from + 14;
  return reg.from + 9;
}

/** UI 用：当前等级上限、地区、徽章与下一档提示 */
export function capInfo(save) {
  ensureMainline(save);
  const j = save.journey;
  const reg = regionOf(save);
  const n = badgeCountOf(save);
  const champion = !!j.season?.champion;
  let nextText;
  if (j.capExempt) nextText = "旧档兼容：不受等级上限限制";
  else if (champion) nextText = "冠军达成，前往下一地区";
  else if (n < 2) nextText = `再拿 ${2 - n} 枚徽章 → Lv.${reg.from + 14}`;
  else if (n < 6) nextText = `再拿 ${6 - n} 枚徽章 → Lv.${reg.to}`;
  else if (n < 8) nextText = `再拿 ${8 - n} 枚徽章 → 解锁四天王`;
  else nextText = "8 徽章达成，挑战四天王";
  return {
    cap: levelCapOf(save), region: reg, badges: n, champion,
    exempt: !!j.capExempt, nextText,
  };
}

export function nextRegionOf(save) {
  ensureMainline(save);
  return REGIONS[(save.journey.regionNo || 1)] || null;
}

/** 徽章数 → 设施解锁文案（与 badge-unlocks 的阈值一致） */
export function badgeUnlockText(n) {
  return {
    2: "第 2 个孵蛋槽",
    3: "野球场每日 +1 次",
    4: "商店精灵货架 +1 格",
    5: "训练上限 +5 点",
    6: "第 3 个孵蛋槽",
    7: "商店免费刷新 +1 次/天",
    8: "第 4 个孵蛋槽 + 训练上限再 +5 点",
  }[n] || "";
}
