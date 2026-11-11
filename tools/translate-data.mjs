// 翻译生成器：从 play.fmt.js 底稿按行切出数据表，产出 engine/ 可读数据文件
// 原则：数据逐字照抄（不改一个数字），只换语义命名 + 加注释
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("./reference/play-package/play.fmt.js", import.meta.url), "utf8");
const lines = src.split("\n"); // 0-based

// 行号区间（1-based，含端点）——来自 rg 定位
const cut = (a, b) => lines.slice(a - 1, b).join("\n");

// Ba: 13-185 / Ha: 186-307 / sa: 308-600 / Oe: 601-610 / Ps: 611-618 / Wa: 619-638
// aa: 639-645 / ra: 687-808 / ia: 809-823 / Ka: 897-916 / Zt: 955-1000

function deindent(block) {
  // 底稿里这些表是模块级大对象的两层缩进成员，剥掉最外两层缩进
  return block
    .split("\n")
    .map((l) => l.replace(/^  /, ""))
    .join("\n");
}

// Ba 也是顶层 const 声明，同样剥到纯行集
function stripTopArray(block, name) {
  return stripDecl(block, name);
}

function stripDecl(block, name) {
  // 数组声明剥掉声明头 + 块尾逗号，保留自己的 "[...]"；包装层只补 ";"
  let b = block.replace(new RegExp("^\\s*(const )?" + name + " = "), "");
  b = b.replace(/,\s*$/, "");
  return b;
}

const tables = {
  BASE_ROSTER: stripTopArray(deindent(cut(13, 185)), "Ba"),
  EVOLUTIONS: deindent(cut(186, 307)).replace(/^\s*Ha = /, "").replace(/\}\s*,?\s*$/, "}").replace(/,\s*$/, ""),
  HEIGHT_WEIGHT: deindent(cut(308, 600)).replace(/^\s*sa = /, "").replace(/\}\s*,?\s*$/, "").replace(/,\s*$/, "") + "\n}",
  STAT_LABELS: deindent(cut(601, 610)).replace(/^\s*Oe = /, "").replace(/,\s*$/, ""),
  SPECIALS: deindent(cut(611, 618)).replace(/^\s*Ps = /, "").replace(/,\s*$/, ""),
  SPECIAL_MOVES: deindent(cut(619, 638)).replace(/^\s*Wa = /, "").replace(/,\s*$/, ""),
  POSITION_WEIGHTS: deindent(cut(639, 645)).replace(/^\s*aa = /, "").replace(/\}\s*;\s*$/, "}").replace(/,\s*$/, ""),
  STAR_ROSTER: stripDecl(cut(687, 808), "ra"),
  MYTHICAL_ROSTER: stripDecl(cut(809, 823), "ia"),
  TYPE_CHART: deindent(cut(897, 916)).replace(/^\s*Ka = /, "").replace(/\}\s*;\s*$/, "}").replace(/,\s*$/, ""),
  DIFFICULTY: deindent(cut(955, 1000)).replace(/^\s*(const )?Zt = /, "").replace(/\}\s*,?\s*$/, "}").replace(/,\s*$/, ""),
};

// 校验：切出的块必须以合法边界开头/结尾
for (const [k, v] of Object.entries(tables)) {
  if (!v || v.length < 10) throw new Error(`表 ${k} 切取异常`);
}

writeFileSync(
  new URL("../engine/data/tables.json", import.meta.url),
  JSON.stringify(tables, null, 2)
);
console.log("OK 各表行数:", Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.split("\n").length])));
