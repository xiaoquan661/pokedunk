/**
 * systems/career.js —— 生涯统计
 * 球队：生涯战绩、得分/失分、胜率、总冠军、徽章、当前赛季走势
 * 球员：当前赛季每位首发/替补的出场与场均数据
 * 宝可梦：图鉴、稀有度、队伍等级、属性分布
 */
import { getPokemon } from "../../engine/readable/play-core.js?v=694";
import { mainOVR, teamPower, rarityOf, LEGENDARY_DEX } from "./build.js?v=694";

const n = (v) => Number(v) || 0;
const pct = (made, att) => (att > 0 ? (made / att) * 100 : null);

function bestStreakOf(results = []) {
  let cur = 0, best = 0;
  for (const r of results) {
    if (r?.win) { cur++; if (cur > best) best = cur; }
    else cur = 0;
  }
  return { cur, best };
}

/** 补全生涯累计字段；旧档首次读取时用当前赛季结果回填得分/失分 */
export function ensureCareerStats(save) {
  save.stats ||= { w: 0, l: 0 };
  const st = save.stats;
  st.w = n(st.w);
  st.l = n(st.l);
  const results = save.journey?.season?.results || [];
  if (st.pf == null || st.pa == null) {
    st.pf = results.reduce((a, r) => a + n(r?.myScore), 0);
    st.pa = results.reduce((a, r) => a + n(r?.oppScore), 0);
  }
  if (st.bestStreak == null || st.streak == null) {
    const b = bestStreakOf(results);
    st.bestStreak = b.best;
    st.streak = b.cur;
  }
  return st;
}

function dexRow(dex) {
  return (window.__PJ_DEX_ROWS || []).find((r) => Number(r[0]) === Number(dex)) || null;
}
function dexName(dex) {
  const row = dexRow(dex);
  return row ? String(row[1]).replace(/#\d+$/, "") : `No.${dex}`;
}

export function careerSummary(save) {
  const st = ensureCareerStats(save);
  const season = save?.journey?.season || {};
  const history = Array.isArray(season.history) ? season.history : [];
  const results = Array.isArray(season.results) ? season.results : [];

  const games = st.w + st.l;
  const winPct = games ? (st.w / games) * 100 : 0;
  const championships = history.filter((h) => h.champion).length
    + (season.champion && !history.some((h) => Number(h.no) === Number(season.no)) ? 1 : 0);
  const badgeSet = new Set([...(save?.journey?.badgeVault || []), ...(season.badges || [])]);
  const badges = [...badgeSet].filter((b) => b !== "champion").length;

  const seasonWins = results.filter((r) => r?.win).length;
  const seasonPf = results.reduce((a, r) => a + n(r?.myScore), 0);
  const seasonPa = results.reduce((a, r) => a + n(r?.oppScore), 0);
  const seasonGames = results.length;
  const seasonStreak = bestStreakOf(results);
  const bestGame = results.reduce((best, r) => Math.max(best, n(r?.myScore)), 0);
  const awards = Array.isArray(season.awards) ? season.awards : [];

  const bank = season.playerStats || {};
  const players = Object.entries(bank)
    .map(([key, raw]) => {
      const mon = save?.mons?.[key];
      if (!mon) return null;
      const gp = n(raw.gp), gs = n(raw.gs);
      const row = {
        gp, gs,
        pts: n(raw.pts), reb: n(raw.reb), ast: n(raw.ast), stl: n(raw.stl), blk: n(raw.blk),
        fgm: n(raw.fgm), fga: n(raw.fga), tpm: n(raw.tpm), tpa: n(raw.tpa), dnk: n(raw.dnk),
      };
      const per = (k) => (gp ? row[k] / gp : 0);
      return {
        key, dex: mon.dex, name: dexName(mon.dex), level: mon.level, pos: mon.pos,
        ovr: mainOVR(mon), types: getPokemon(mon.dex).types || [],
        gp, gs,
        ppg: per("pts"), rpg: per("reb"), apg: per("ast"), spg: per("stl"), bpg: per("blk"),
        fg: pct(row.fgm, row.fga), tp: pct(row.tpm, row.tpa), dnk: row.dnk,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.ppg - a.ppg || b.gp - a.gp);

  const teamMons = (save?.team || []).map((id) => save?.mons?.[id]).filter(Boolean);
  const avgLv = teamMons.length ? teamMons.reduce((a, m) => a + n(m.level), 0) / teamMons.length : 0;
  const dexOwned = Object.keys(save?.dex || {}).length;
  const legendOwned = Object.keys(save?.dex || {}).filter((d) => LEGENDARY_DEX.has(Number(d))).length;
  const rareOwned = Object.keys(save?.dex || {}).filter((d) => rarityOf(Number(d)) === "稀有").length;

  const typeCount = {};
  for (const mon of teamMons) {
    const t = getPokemon(mon.dex).types?.[0];
    if (t) typeCount[t] = (typeCount[t] || 0) + 1;
  }
  const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return {
    coach: save?.coach?.name || "ME",
    games, wins: st.w, losses: st.l, winPct,
    pf: st.pf, pa: st.pa,
    ppg: games ? st.pf / games : 0,
    papg: games ? st.pa / games : 0,
    diff: games ? (st.pf - st.pa) / games : 0,
    bestStreak: n(st.bestStreak), streak: n(st.streak),
    championships, badges, seasons: n(season.no) || history.length + 1,
    season: {
      no: n(season.no) || 1, games: seasonGames, wins: seasonWins, losses: seasonGames - seasonWins,
      pf: seasonPf, pa: seasonPa, ppg: seasonGames ? seasonPf / seasonGames : 0,
      papg: seasonGames ? seasonPa / seasonGames : 0,
      diff: seasonGames ? (seasonPf - seasonPa) / seasonGames : 0,
      bestGame, bestStreak: seasonStreak.best, streak: seasonStreak.cur,
      champion: !!season.champion,
    },
    players, awards,
    collection: {
      dexOwned, dexTotal: 291, legendOwned, rareOwned,
      teamSize: teamMons.length, avgLv, teamPower: save?.team?.length ? teamPower(save) : 0,
      topTypes,
    },
  };
}
