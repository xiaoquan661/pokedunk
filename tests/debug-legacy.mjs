// 临时调试：校验 legacy 组装语法
import { readFileSync, writeFileSync } from "node:fs";
const fmt = readFileSync(new URL("../tools/reference/play-package/play.fmt.js", import.meta.url), "utf8").split("\n");
const cut = (a, b) => fmt.slice(a - 1, b).join("\n");
function memberToConst(s, name) {
  let b = s.replace(new RegExp("^\\s*" + name + " = "), "");
  b = b.replace(/[\s,]*$/, "");
  return "const " + name + " = " + b + ";";
}
const src = [
  cut(646, 650),
  cut(651, 686),
  cut(13, 185).replace(/,\s*$/, ""),
  memberToConst(cut(186, 307), "Ha"),
  memberToConst(cut(308, 600), "sa"),
  memberToConst(cut(601, 610), "Oe"),
  memberToConst(cut(611, 618), "Ps"),
  memberToConst(cut(619, 638), "Wa"),
  memberToConst(cut(639, 645), "aa"),
  cut(687, 823),
  cut(824, 875),
].join("\n");
writeFileSync(new URL("legacy-test.js", import.meta.url), src);
console.log("written", src.length);
