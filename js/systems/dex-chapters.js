/**
 * systems/dex-chapters.js —— 图鉴世代篇章
 *
 * 按现有图鉴行数分篇（不按理论全国图鉴数）：
 *   关都 1–151 / 城都 152–251 / 丰缘 252–386（现有部分）
 * 每篇独立进度、50% 纪念章与 100% 完成勋章（纯展示，不发资源）。
 * 存档：save.dexChapters = { kanto: { half: true, full: true, medal: true } }
 */
export const DEX_CHAPTERS = [
  { id: "kanto", name: "关都篇", from: 1, to: 151, color: "#ee8130" },
  { id: "johto", name: "城都篇", from: 152, to: 251, color: "#f5c542" },
  { id: "hoenn", name: "丰缘篇", from: 252, to: 386, color: "#57c785", note: "现有部分" },
];

export const DEX_CHAPTER_REWARDS = {
  half: { label: "50% 纪念章" },
  full: { label: "完成勋章" },
};

export function ensureDexChapters(save) {
  save.dexChapters ||= {};
  return save.dexChapters;
}

export function chapterRows(save) {
  const state = ensureDexChapters(save);
  const rows = window.__PJ_DEX_ROWS || [];
  return DEX_CHAPTERS.map((ch) => {
    const list = rows.filter((r) => {
      const dex = Number(r[0]);
      return dex >= ch.from && dex <= ch.to;
    });
    const total = list.length;
    const got = list.filter((r) => save.dex && save.dex[Number(r[0])]).length;
    const pct = total ? Math.min(100, Math.round((got / total) * 100)) : 0;
    const halfGoal = total ? Math.max(1, Math.ceil(total / 2)) : 0;
    const mark = state[ch.id] || {};
    return {
      ...ch, total, got, pct,
      halfGoal,
      halfReached: got >= halfGoal,
      full: total > 0 && got >= total,
      halfClaimed: !!mark.half,
      fullClaimed: !!mark.full,
      medal: !!mark.medal,
      canClaimHalf: got >= halfGoal && !mark.half,
      canClaimFull: total > 0 && got >= total && !mark.full,
    };
  });
}

/** 领取篇章纪念章；100% 获得完成勋章。只给展示，不发资源。调用方负责 writeSave */
export function claimChapterReward(save, id, tier) {
  const row = chapterRows(save).find((r) => r.id === id);
  if (!row) return { ok: false, error: "未知篇章" };
  if (tier !== "half" && tier !== "full") return { ok: false, error: "未知奖励档位" };
  if (tier === "half" && !row.halfReached) return { ok: false, error: `还差 ${Math.max(0, row.halfGoal - row.got)} 只` };
  if (tier === "full" && !row.full) return { ok: false, error: `还差 ${Math.max(0, row.total - row.got)} 只` };
  const state = ensureDexChapters(save);
  state[id] ||= {};
  if (state[id][tier]) return { ok: false, error: "该纪念章已领取" };
  const rw = DEX_CHAPTER_REWARDS[tier];
  state[id][tier] = true;
  if (tier === "full") state[id].medal = true;
  return {
    ok: true, medal: tier === "full", text: rw.label, chapter: row.name, tier,
  };
}
