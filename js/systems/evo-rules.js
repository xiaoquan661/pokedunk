/**
 * systems/evo-rules.js —— 游戏层进化等级覆盖（S13 定案）
 *
 * 引擎原表（engine/data/evolutions.js）的等级是 2/3/4/5/6，直接沿用会让
 * 精灵在训练系统还没解锁时就进入最终形态。这里在运行时按进化链深度重写：
 *   - 三段进化：第一段 Lv8，第二段 Lv16
 *   - 两段进化：第一段 Lv12
 *
 * 只改 level，保留原 to（分支路线、进化目标）不变。
 * 必须在任何 UI/结算读取 EVOLUTIONS[dex].level 之前执行；app.js 顶层导入即可。
 */
import { EVOLUTIONS } from "../../engine/data/evolutions.js";

const targets = new Set();
for (const ev of Object.values(EVOLUTIONS)) {
  for (const dex of ev.to) targets.add(Number(dex));
}

for (const [key, ev] of Object.entries(EVOLUTIONS)) {
  const dex = Number(key);
  const firstOfThree = ev.to.some((next) => EVOLUTIONS[next]);
  const hasParent = targets.has(dex);
  ev.level = firstOfThree ? 8 : hasParent ? 16 : 12;
}
