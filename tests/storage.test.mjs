// storage.js 单元测试：建档/御三家/入队三通道/同种唯一/调动边界/图鉴联动/进化记录
import { createSave, startJourney, addMon, moveMon, loadSave, writeSave, resetSave, hasDex, recordEvolution, validateSave, uniqueDexError } from "../js/storage.js";

let fails = 0;
const ok = (name, cond) => { if (!cond) { fails++; console.log("FAIL:", name); } else console.log("✓", name); };

// stub localStorage
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

// 1. 新建默认档
const s = createSave();
ok("默认档结构合法", validateSave(s));
ok("初始 coins=0", s.coins === 0);
ok("队伍/仓库空", s.team.length === 0 && s.box.length === 0);
ok("journey.stage=starter", s.journey.stage === "starter");

// 2. 御三家三选一
ok("非法御三家拒绝", startJourney(s, 25).ok === false);
const starter = startJourney(s, 4, "小赤");
ok("选小火龙成功", starter.ok && s.mons[starter.id].dex === 4);
ok("落队伍", s.team.length === 1);
ok("图鉴点亮 dex4", !!s.dex[4]);
ok("开局时间戳", s.journey.startedAt > 0);

// 3. 统一入队（同种唯一）
const dup = addMon(s, 4, { from: "shop" });
ok("同种唯一拒绝重复 dex4", dup.ok === false && /结缘/.test(dup.error));
ok("uniqueDexError 文案", uniqueDexError(s, 4) !== null);
ok("其他 dex 可入", addMon(s, 1, { from: "shop" }).ok);
ok("图鉴点亮 dex1", !!s.dex[1]);

// 4. 入队 vs 入仓（队伍 ≤10）
for (let d of [7, 25, 133, 143, 149, 150, 151, 6]) addMon(s, d, { from: "egg" });
ok("队伍 10 人满", s.team.length === 10);
const overflow = addMon(s, 9, { from: "sign" });
ok("队满自动入仓", overflow.ok && overflow.movedTo === "box" && s.box.length === 1);
ok("入仓也点亮图鉴", !!s.dex[9]);

// 5. 调动边界
const id0 = s.team[0];
ok("队伍满时入队拒绝", moveMon(s, s.box[0], "team").ok === false);
moveMon(s, id0, "box");
ok("移 1 人入仓成功", s.box.length === 2 && s.team.length === 9);
ok("队伍 5 人时禁止再移出", (() => { while (s.team.length > 5) moveMon(s, s.team[0], "box"); return moveMon(s, s.team[0], "box").ok === false; })());
// 回填到 9 人，恢复常用态
ok("移回队伍", moveMon(s, s.box[0], "team").ok && s.team.length === 6);

// 6. 持久化 roundtrip
ok("写档成功", writeSave(s));
const loaded = loadSave();
ok("读档结构一致", loaded && loaded.coins === s.coins && loaded.team.length === s.team.length && loaded.mons[s.team[0]].dex === s.mons[s.team[0]].dex);

// 7. 损坏档
mem.set("pokedunk.save.v1", "{broken json");
ok("损坏档返回 null", loadSave() === null);
mem.set("pokedunk.save.v1", JSON.stringify({ version: 999 }));
ok("陌生版本返回 null", loadSave() === null);

// 8. 重开
resetSave();
ok("重开清键", loadSave() === null);

// 9. 进化记录（dex4→5，换位置 + 图鉴联动）
const s2 = createSave();
startJourney(s2, 4);
const mid = s2.team[0];
const evo = recordEvolution(s2, mid, 5);
ok("进化成功 dex4→5", evo.ok);
ok("进化点亮图鉴 dex5", !!s2.dex[5]);
ok("非法进化路径拒绝", recordEvolution(s2, mid, 150).ok === false);

function getPokemonPos(dex) {
  return null;
}
// 直接引引擎表核对
const { getPokemon } = await import("../engine/data/pokemon.js");
ok("位置更新 SG（引擎核对）", s2.mons[mid].pos === getPokemon(5).pos);

console.log(fails === 0 ? "\n✅ storage.js 全部通过" : `\n❌ ${fails} 项失败`);
process.exit(fails === 0 ? 0 : 1);
