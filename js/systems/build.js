/**
 * systems/build.js —— 构筑系统（docs/02 附 v2.4 + docs/03）
 * 三层数值：种族值 + 成长值（等级 bonus / 训练 train / 道具 item，单项 99 封顶）
 * 成长预算：等级随机 98 + 训练 138（自由 98 + 购买 40）+ 道具 20 = 256（上限，非保底）
 * 位置：推荐位置 pos + 适配度 fit + 越位倍率 0.90~1.00；save.assign 存实际位置
 * 羁绊：首发 5 人，最多 3 条（通用/属性/防守/进攻/经济 各取 1）
 */
import { getPokemon, calcOVR, calcArchetype, POSITION_WEIGHTS, POSITION_ORDER } from "../../engine/readable/play-core.js?v=695";
import { EVOLUTIONS } from "../../engine/data/evolutions.js";
import { facilityState } from "./badge-unlocks.js?v=695";
export { POSITION_ORDER };

export const STAT_KEYS = ["spd", "sht", "ins", "pas", "def", "blk", "reb", "hnd"];
export const STAT_ZH = { spd: "速度", sht: "投篮", ins: "终结", pas: "传球", def: "防守", blk: "盖帽", reb: "篮板", hnd: "控球" };
/** 引擎随机加点文案（"+1 Finishing"）→ 中文（"+1 终结"） */
const STAT_EN_ZH = { Speed: "速度", Shooting: "投篮", Finishing: "终结", Passing: "传球", "Perimeter D": "防守", Blocking: "盖帽", Rebounding: "篮板", Handles: "控球" };
export const growthZh = (msg) => String(msg).replace(/^(\+\d+\s+)(.+)$/, (m, p1, en) => p1 + (STAT_EN_ZH[en.trim()] || en));
export const TRAIN_MAX = 40;
export const ITEM_MAX = 20;
export const ITEM_PER_TYPE = 4;

/** 传说/幻之 dex 白名单（S13 可继续扩充） */
export const LEGENDARY_DEX = new Set([
  144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251,
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
  494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
]);

/** 稀有度：普通 <70 / 稀有 70~84 / 传说白名单 */
export function rarityOf(dex) {
  if (LEGENDARY_DEX.has(dex)) return "传说";
  const b = getPokemon(dex);
  return b.ovr >= 70 ? "稀有" : "普通";
}
export const RARITY_COLOR = { 普通: "#9db0d8", 稀有: "#4f9dff", 传说: "#f5c542" };

const clamp99 = (v) => Math.max(0, Math.min(99, v));
const tidy = (mon) => {
  mon.train ||= { points: 0, stats: {}, bank: 0 };
  mon.train.stats ||= {};
  mon.train.bank ||= 0;
  mon.train.free ||= 0;
  mon.train.freeEarned ||= 0;
  // 旧存档：此前的训练点全部视为已购买，保证价格曲线连续
  if (mon.train.paid == null) mon.train.paid = mon.train.points || 0;
  mon.item ||= { points: 0, stats: {}, used: {} };
  mon.item.stats ||= {};
  mon.item.used ||= {};
  return mon;
};
export { tidy as ensureMonBuild };

/** 成长值 = 种族值 + 等级 bonus + 训练 + 道具（每项 0..99） */
export function growthStats(mon) {
  tidy(mon);
  const base = getPokemon(mon.dex).r;
  const out = {};
  for (const k of STAT_KEYS) {
    out[k] = clamp99((base[k] || 0) + (mon.bonus?.[k] || 0) + (mon.train.stats[k] || 0) + (mon.item.stats[k] || 0));
  }
  return out;
}

/** 位置适配度：Σ(成长值 × 位置权重)，0..99 */
export function fit(mon, pos, stats) {
  const s = stats || growthStats(mon);
  const w = POSITION_WEIGHTS[pos] || {};
  let n = 0;
  for (const k of STAT_KEYS) n += (s[k] || 0) * (w[k] || 0);
  return n;
}

/** 越位倍率：推荐位置 1.0；邻位 ~0.97-1.0；最低 0.90 */
export function posMult(mon, assignedPos) {
  const rec = fit(mon, mon.pos);
  if (!assignedPos || assignedPos === mon.pos) return 1;
  if (rec <= 0) return 0.9;
  const v = 0.9 + 0.1 * (fit(mon, assignedPos) / rec);
  return Math.max(0.9, Math.min(1, v));
}

/** 初始八维推荐位置（取适配度前二；只读种族值，不随等级/训练变化） */
export function recommendedPositions(monOrDex, count = 2) {
  const dex = typeof monOrDex === "number" ? monOrDex : monOrDex?.dex;
  if (!dex) return [];
  const base = getPokemon(dex).r || {};
  const scored = POSITION_ORDER.map((pos, i) => {
    const w = POSITION_WEIGHTS[pos] || {};
    let score = 0;
    for (const k of STAT_KEYS) score += (base[k] || 0) * (w[k] || 0);
    return { pos, score, i };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, count).map((x) => x.pos);
}

/** 主位置 OVR / 全能度（五位置平均） */
export function mainOVR(mon) {
  const s = growthStats(mon);
  return calcOVR(mon.pos, s);
}
export function versatility(mon) {
  const s = growthStats(mon);
  const arr = POSITION_ORDER.map((p) => calcOVR(p, s));
  return Math.round(arr.reduce((a, v) => a + v, 0) / arr.length);
}

/* ---------------- 训练 ---------------- */
export const TRAIN_COST_BASE = 30;
export const TRAIN_COST_STEP = 10;
export function trainPrice(mon) {
  tidy(mon);
  return TRAIN_COST_BASE + TRAIN_COST_STEP * (mon.train.paid || 0);
}
/** 训练额度：升级赠送的免费点 + 可购买点（4 + 等级÷2，最多 40） */
export function trainCaps(mon, save = null) {
  const bonus = save ? (facilityState(save).trainBonus || 0) : 0;
  tidy(mon);
  const paidCap = Math.min(TRAIN_MAX + 10, 4 + Math.floor((mon.level || 1) / 2) + bonus);
  const freeMax = Math.max(0, mon.train.freeEarned || 0);
  return {
    paidCap,
    freeMax,
    totalCap: freeMax + paidCap,
    free: mon.train.free || 0,
    paid: mon.train.paid || 0,
    points: mon.train.points || 0,
  };
}
export function canTrain(save, mon) {
  tidy(mon);
  const cap = trainCaps(mon, save);
  if (mon.train.points >= cap.totalCap) {
    return { ok: false, error: `已达当前训练上限（${cap.totalCap} 点），升级后可继续` };
  }
  const freeLeft = mon.train.bank > 0 || mon.train.free > 0;
  if (!freeLeft && mon.train.paid >= cap.paidCap) {
    return { ok: false, error: `购买训练已达当前等级上限（${cap.paidCap} 点）` };
  }
  const price = trainPrice(mon);
  if (!freeLeft && save.coins < price) return { ok: false, error: `篮球币不足（需 ${price}）` };
  return { ok: true, price, free: freeLeft, cap };
}

/** 训练 1 点：优先返还池，其次升级赠送点，最后扣币 */
export function trainStat(save, mon, stat) {
  tidy(mon);
  const chk = canTrain(save, mon);
  if (!chk.ok) return chk;
  const g = growthStats(mon);
  if (g[stat] >= 99) return { ok: false, error: `${STAT_ZH[stat]}已满 99` };
  let paid = 0;
  if (mon.train.bank > 0) mon.train.bank--;
  else if (mon.train.free > 0) mon.train.free--;
  else { paid = chk.price; save.coins -= paid; mon.train.paid++; }
  mon.train.stats[stat] = (mon.train.stats[stat] || 0) + 1;
  mon.train.points++;
  return { ok: true, free: paid === 0, price: paid, stat };
}

/** 重置训练：清空加点，返还 80% 训练点（不进每周额度、不退币） */
export function resetTrain(mon) {
  tidy(mon);
  if (!mon.train.points) return { ok: false, error: "没有可重置的训练" };
  const refund = Math.floor(mon.train.points * 0.8);
  mon.train.stats = {};
  mon.train.points = 0;
  mon.train.paid = 0;
  mon.train.bank += refund;
  return { ok: true, refund };
}

/* ---------------- 道具 ---------------- */
export const ITEM_TYPES = {
  power: { name: "力量药剂", stat: "ins", desc: "终结 +1（单只最多 4 次）" },
  speed: { name: "速度药剂", stat: "spd", desc: "速度 +1（单只最多 4 次）" },
  skill: { name: "技巧药剂", stat: "sht", desc: "投篮 +1（单只最多 4 次）" },
  guard: { name: "防守药剂", stat: "def", desc: "防守 +1（单只最多 4 次）" },
  board: { name: "篮板药剂", stat: "reb", desc: "篮板 +1（单只最多 4 次）" },
};
export function itemCount(save, id) {
  save.bag.items ||= {};
  return save.bag.items[id] || 0;
}
export function useItem(save, mon, itemId) {
  tidy(mon);
  const it = ITEM_TYPES[itemId];
  if (!it) return { ok: false, error: "未知道具" };
  if (mon.item.points >= ITEM_MAX) return { ok: false, error: "道具加成已满 20 点" };
  if ((mon.item.used[itemId] || 0) >= ITEM_PER_TYPE) return { ok: false, error: `该精灵已使用 ${ITEM_PER_TYPE} 次` };
  if (itemCount(save, itemId) <= 0) return { ok: false, error: "道具不足" };
  if (growthStats(mon)[it.stat] >= 99) return { ok: false, error: `${STAT_ZH[it.stat]}已满 99` };
  save.bag.items[itemId]--;
  mon.item.stats[it.stat] = (mon.item.stats[it.stat] || 0) + 1;
  mon.item.points++;
  mon.item.used[itemId] = (mon.item.used[itemId] || 0) + 1;
  return { ok: true, stat: it.stat };
}

/* ---------------- 羁绊 ---------------- */
const PARENT = {};
for (const [d, ev] of Object.entries(EVOLUTIONS)) for (const t of ev.to) PARENT[t] = Number(d);
function chainRoot(dex) {
  let d = dex;
  const seen = new Set();
  while (PARENT[d] && !seen.has(d)) { seen.add(d); d = PARENT[d]; }
  return d;
}

/** 草地中的个体 id：挂机与比赛互斥，草地精灵不能进入首发 */
function grassIdSet(save) {
  const set = new Set();
  for (const slot of save?.grass?.slots || []) {
    if (slot && slot.monId != null) set.add(Number(slot.monId));
  }
  return set;
}
export function isOnGrass(save, monId) {
  return grassIdSet(save).has(Number(monId));
}

/** 首发 5 人（按 assign 槽位，主动下放的替补不计入） */
export function startersOf(save) {
  return starterIds(save).map((id) => save.mons[id]).filter(Boolean);
}

export const BONDS = [
  {
    id: "fivePos", name: "五位置齐", category: "通用", desc: "首发 PG/SG/SF/PF/C 各 1，且适配度达标",
    check(ctx) {
      const poss = new Set(ctx.assigned);
      if (poss.size < 5) return { met: false, progress: `${poss.size}/5` };
      const qualified = ctx.entries.filter((e) => {
        const rec = fit(e.mon, e.mon.pos);
        return rec > 0 && fit(e.mon, e.pos) / rec >= 0.9;
      }).length;
      return { met: qualified === 5, progress: `${qualified}/5` };
    },
    mult: { all: 0.03 },
  },
  {
    id: "sameType", name: "同系共鸣", category: "属性", desc: "首发同属性 ≥3（该属性成员关键属性 +5%）",
    check(ctx) {
      const cnt = {};
      ctx.mons.forEach((m) => { const t = m.types?.[0]; if (t) cnt[t] = (cnt[t] || 0) + 1; });
      const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      return { met: best && best[1] >= 3, progress: best ? `${best[1]}/3` : "0/3", type: best?.[0] };
    },
    mult: { all: 0.05, onlyType: true },
  },
  {
    id: "evoChain", name: "进化链", category: "属性", desc: "同进化链 ≥2（不同 dex），该两只 +4%",
    check(ctx) {
      const roots = {};
      ctx.mons.forEach((m) => { const r = chainRoot(m.dex); (roots[r] ||= []).push(m); });
      const hit = Object.values(roots).find((arr) => arr.length >= 2);
      return { met: !!hit, progress: hit ? `${hit.length}/2` : "0/2", dexes: hit?.map((m) => m.dex) };
    },
    mult: { all: 0.04, onlyDexes: true },
  },
  {
    id: "twinTowers", name: "双塔", category: "防守", desc: "C + PF 各 1，且两者盖帽 ≥80",
    check(ctx) {
      const c = ctx.entries.find((e) => e.pos === "C");
      const pf = ctx.entries.find((e) => e.pos === "PF");
      const ok = c && pf && ctx.stats(c.mon).blk >= 80 && ctx.stats(pf.mon).blk >= 80;
      return { met: !!ok, progress: `${c ? 1 : 0}+${pf ? 1 : 0}/2` };
    },
    mult: { blk: 0.05, reb: 0.05 },
  },
  {
    id: "ironWall", name: "铁壁", category: "防守", desc: "首发全队防守 ≥75",
    check(ctx) {
      const n = ctx.mons.filter((m) => ctx.stats(m).def >= 75).length;
      return { met: n === 5, progress: `${n}/5` };
    },
    mult: { def: 0.04 },
  },
  {
    id: "runGun", name: "跑轰", category: "进攻", desc: "PG+SG+SF 各 1，且三者速度 ≥85",
    check(ctx) {
      const list = ["PG", "SG", "SF"].map((p) => ctx.entries.find((e) => e.pos === p));
      const ok = list.every((e) => e && ctx.stats(e.mon).spd >= 85);
      return { met: !!ok, progress: `${list.filter((e) => e && ctx.stats(e.mon).spd >= 85).length}/3` };
    },
    mult: { spd: 0.04 },
  },
  {
    id: "starters", name: "御三家", category: "经济", desc: "妙蛙/小火龙/杰尼龟进化链各 ≥1（比赛 XP +10%）",
    check(ctx) {
      const roots = new Set(ctx.mons.map((m) => chainRoot(m.dex)));
      const need = [1, 4, 7].filter((r) => roots.has(r)).length;
      return { met: need === 3, progress: `${need}/3` };
    },
    mult: {},
  },
];

/** 首发上下文 */
function bondCtx(save) {
  const entries = starterIds(save)
    .map((id) => ({ id, mon: save.mons[id], pos: save.assign?.[id] || save.mons[id]?.pos }))
    .filter((e) => e.mon);
  return {
    entries,
    mons: entries.map((e) => ({ ...getPokemon(e.mon.dex), dex: e.mon.dex, mon: e.mon })),
    assigned: entries.map((e) => e.pos),
    stats: (m) => growthStats(m.mon || m),
  };
}

/** 全部羁绊的达成情况（队伍页展示用） */
export function bondReport(save) {
  const ctx = bondCtx(save);
  return BONDS.map((b) => {
    const r = b.check(ctx) || { met: false, progress: "0" };
    return { id: b.id, name: b.name, category: b.category, desc: b.desc, met: !!r.met, progress: r.progress, extra: r };
  });
}

/** 当前生效羁绊（每类别 1 条，最多 3 条） */
export function activeBonds(save) {
  const report = bondReport(save);
  const byCat = {};
  for (const b of report) if (b.met && !byCat[b.category]) byCat[b.category] = b;
  return Object.values(byCat).slice(0, 3);
}

/** 计算某只首发精灵的羁绊属性加成（乘法系数） */
export function bondMultipliers(save) {
  const bonds = activeBonds(save);
  const ctx = bondCtx(save);
  const perMon = new Map();
  const add = (mon, key, v) => {
    if (!perMon.has(mon)) perMon.set(mon, {});
    const map = perMon.get(mon);
    map[key] = (map[key] || 0) + v;
  };
  for (const b of bonds) {
    const def = BONDS.find((x) => x.id === b.id);
    if (!def || !def.mult || !Object.keys(def.mult).length) continue;
    const m = def.mult;
    for (const e of ctx.entries) {
      // e.mon 是存档里的原始个体（只有 dex/level/bonus 等），种族属性要从注册表取
      const types = getPokemon(e.mon.dex)?.types || [];
      if (m.onlyType && types[0] !== b.extra?.type) continue;
      if (m.onlyDexes && !(b.extra?.dexes || []).includes(e.mon.dex)) continue;
      if (m.all) { for (const k of STAT_KEYS) add(e.mon, k, m.all); }
      for (const k of STAT_KEYS) if (m[k]) add(e.mon, k, m[k]);
    }
  }
  return perMon;
}

/* ---------------- 默认首发位置 ---------------- */
/** 为首发 5 人补齐实际位置（缺省按位置槽顺序；已有 assign 不覆盖；主动下放的替补不补位） */
export function ensureAssignments(save) {
  save.assign ||= {};
  save.benched ||= {};
  // 自愈：已经占据首发槽位的精灵不应再标记为替补
  for (const id of Object.keys(save.benched)) if (save.assign[id]) delete save.benched[id];
  // 草地挂机与比赛互斥：老档里已在草地的首发自动退出首发，空位由后面的队员补上
  const grass = grassIdSet(save);
  for (const id of Object.keys(save.assign)) if (grass.has(Number(id))) delete save.assign[id];
  const first = save.team.filter((id) => save.mons[id] && !save.benched[id] && !grass.has(Number(id))).slice(0, 5);
  const used = new Set(first.map((id) => save.assign[id]).filter(Boolean));
  first.forEach((id, i) => {
    if (save.assign[id]) return;
    let pos = POSITION_ORDER[i];
    if (used.has(pos)) pos = POSITION_ORDER.find((p) => !used.has(p)) || save.mons[id]?.pos || pos;
    save.assign[id] = pos;
    used.add(pos);
  });
}

/** 首发 id（按槽位顺序；以 assign 为准，主动下放的替补不算首发） */
export function starterIds(save) {
  ensureLineupSlots(save);
  const grass = grassIdSet(save);
  return POSITION_ORDER.map((pos) => save.team.find((id) => save.assign?.[id] === pos))
    .filter((id) => id && !grass.has(Number(id)));
}

/** 替补 id（队伍中未占据首发槽位的精灵） */
export function benchIds(save) {
  const st = new Set(starterIds(save));
  return save.team.filter((id) => save.mons[id] && !st.has(id));
}

/* ---------------- 首发槽位（位置只是槽，任何精灵都能放） ---------------- */
/** 让首发 5 人各占一个唯一位置槽；缺失/重复的按空槽补齐 */
export function ensureLineupSlots(save) {
  save.assign ||= {};
  save.benched ||= {};
  ensureAssignments(save);
  const grass = grassIdSet(save);
  const first = save.team.filter((id) => save.mons[id] && !save.benched[id] && !grass.has(Number(id))).slice(0, 5);
  const used = new Set();
  for (const id of first) {
    const p = save.assign[id];
    if (!POSITION_ORDER.includes(p) || used.has(p)) {
      const free = POSITION_ORDER.find((x) => !used.has(x));
      save.assign[id] = free || recommendedPositions(save.mons[id])[0] || p;
    }
    used.add(save.assign[id]);
  }
  syncStarterOrder(save);
  return first;
}

/** 首发数组按槽位顺序（PG/SG/SF/PF/C）排列，主动下放的替补排到队尾 */
export function syncStarterOrder(save) {
  const assigned = POSITION_ORDER
    .map((pos) => save.team.find((id) => save.assign?.[id] === pos))
    .filter(Boolean);
  if (assigned.length) save.team = [...assigned, ...save.team.filter((id) => !assigned.includes(id))];
}

/** 当前占据某槽位的首发 id */
export function slotOwner(save, pos) {
  ensureLineupSlots(save);
  return save.team.find((id) => save.assign?.[id] === pos) || null;
}

/** 首发换槽：id 移到 pos；若该槽有人则两人交换（任意位置都可放） */
export function assignStarterSlot(save, id, pos) {
  if (!POSITION_ORDER.includes(pos)) return { ok: false, error: "未知位置" };
  ensureLineupSlots(save);
  if (!save.assign?.[id]) return { ok: false, error: "该精灵不在首发" };
  const old = save.assign[id];
  if (old === pos) return { ok: true, swapped: null };
  const occupant = slotOwner(save, pos);
  save.assign[id] = pos;
  if (occupant && occupant !== id) save.assign[occupant] = old;
  syncStarterOrder(save);
  return { ok: true, swapped: occupant && occupant !== id ? occupant : null };
}

/** 首发两人互换槽位 */
export function swapStarterSlots(save, a, b) {
  ensureLineupSlots(save);
  if (!save.assign?.[a] || !save.assign?.[b] || a === b) return { ok: false };
  const pa = save.assign[a], pb = save.assign[b];
  save.assign[a] = pb; save.assign[b] = pa;
  syncStarterOrder(save);
  return { ok: true };
}

/** 替补换入首发槽：原首发回替补席；空槽则替补直接升入 */
export function substituteBenchToSlot(save, benchId, pos) {
  if (!POSITION_ORDER.includes(pos)) return { ok: false, error: "未知位置" };
  ensureLineupSlots(save);
  save.benched ||= {};
  if (isOnGrass(save, benchId)) return { ok: false, error: "该精灵在草地挂机，请先收回" };
  if (save.assign?.[benchId]) return { ok: false, error: "该精灵已在首发" };
  const occupant = slotOwner(save, pos);
  if (occupant === benchId) return { ok: true };
  if (!occupant) {
    save.assign[benchId] = pos;
    delete save.benched[benchId];
    syncStarterOrder(save);
    return { ok: true, out: null };
  }
  save.assign[benchId] = pos;
  delete save.benched[benchId];
  delete save.assign[occupant];
  save.benched[occupant] = true;
  syncStarterOrder(save);
  return { ok: true, out: occupant };
}

/** 首发换下到替补席（与指定替补互换；benchId 为空则仅下放，留出空槽） */
export function substituteStarterToBench(save, starterId, benchId = null) {
  ensureLineupSlots(save);
  save.benched ||= {};
  if (!save.assign?.[starterId]) return { ok: false, error: "该精灵不在首发" };
  // 拖到替补席区域时，目标可能是旧界面的首发卡或错位 id；
  // 这里自动退回第一个真正未上场的替补，找不到则只下放、留出空槽。
  if (benchId != null && save.assign?.[benchId]) {
    benchId = save.team.find((id) => id !== starterId && save.mons[id] && !save.assign?.[id]) ?? null;
  }
  const pos = save.assign[starterId];
  delete save.assign[starterId];
  save.benched[starterId] = true;
  if (benchId != null) {
    save.assign[benchId] = pos;
    delete save.benched[benchId];
  }
  syncStarterOrder(save);
  return { ok: true, in: benchId, out: starterId, pos };
}

/* ---------------- 战力与自动排阵 ---------------- */
export function monPower(mon, assignedPos, bonuses) {
  const s = growthStats(mon);
  const mult = posMult(mon, assignedPos);
  const eff = {};
  const bm = bonuses || {};
  for (const k of STAT_KEYS) eff[k] = clamp99(Math.round(s[k] * mult * (1 + (bm[k] || 0))));
  return calcOVR(assignedPos || mon.pos, eff);
}

/** 队伍战力：前 5 高 monPower 平均（含羁绊加成） */
export function teamPower(save) {
  const per = bondMultipliers(save);
  const list = save.team
    .map((id) => ({ id, mon: save.mons[id] }))
    .filter((x) => x.mon)
    .map((x) => monPower(x.mon, save.assign?.[x.id] || x.mon.pos, per.get(x.mon)))
    .sort((a, b) => b - a);
  return list.length ? Math.round(list.slice(0, 5).reduce((a, v) => a + v, 0) / Math.min(5, list.length)) : 0;
}

const POSITIONS = POSITION_ORDER;

/** 自动排阵：队伍 10 人穷举 5 人 × 5 位置，优先总 monPower，其次全能度 */
export function autoLineup(save) {
  const ids = save.team.filter((id) => save.mons[id] && !isOnGrass(save, id));
  const per = bondMultipliers(save);
  const n = ids.length;
  if (n === 0) return [];
  let best = null;
  const pick = [];
  const choose = (start) => {
    if (pick.length === 5) {
      const val = permutations(ids, pick).reduce((best2, combo) => {
        const score = combo.reduce((a, e) => a + monPower(save.mons[e.id], e.pos, per.get(save.mons[e.id])), 0);
        const vers = combo.reduce((a, e) => a + versatility(save.mons[e.id]), 0);
        const cand = { score, vers, combo: combo.slice() };
        if (!best2 || score > best2.score || (score === best2.score && vers > best2.vers)) return cand;
        return best2;
      }, null);
      if (val && (!best || val.score > best.score || (val.score === best.score && val.vers > best.vers))) best = val;
      return;
    }
    for (let i = start; i < n; i++) { pick.push(ids[i]); choose(i + 1); pick.pop(); }
  };
  choose(0);
  return best ? best.combo : ids.slice(0, 5).map((id, i) => ({ id, pos: POSITIONS[i] }));
}
function permutations(ids, five) {
  const out = [];
  const used = new Set();
  const cur = [];
  const rec = () => {
    if (cur.length === 5) { out.push(cur.slice()); return; }
    for (let i = 0; i < five.length; i++) {
      if (used.has(i)) continue;
      used.add(i);
      cur.push({ id: five[i], pos: POSITIONS[cur.length] });
      rec();
      cur.pop();
      used.delete(i);
    }
  };
  rec();
  return out;
}

/** 构建比赛用球员（成长值 + 位置倍率 + 羁绊） */
export function buildMatchPlayer(save, id, bondMap) {
  const mon = save.mons[id];
  const base = getPokemon(mon.dex);
  const assigned = save.assign?.[id] || mon.pos;
  const s = growthStats(mon);
  const mult = posMult(mon, assigned);
  const bm = bondMap ? (bondMap.get(mon) || {}) : {};
  const eff = {};
  for (const k of STAT_KEYS) eff[k] = clamp99(Math.round(s[k] * mult * (1 + (bm[k] || 0))));
  const p = { ...base, dex: mon.dex, pos: assigned, r: eff, saveId: id };
  p.ovr = calcOVR(assigned, eff);
  p.archetype = calcArchetype(assigned, eff, p.ovr);
  return p;
}
