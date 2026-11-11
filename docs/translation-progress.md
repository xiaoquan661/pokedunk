# 翻译进度记录（pokedunk-v2 引擎）

## 已完成（数据层，engine/ 8 文件）
- type-chart.js / difficulty.js / positions.js / pokemon.js / evolutions.js / specials-data.js / growth.js / rng.js
- 由 tools/translate-data.mjs（切取）+ tools/assemble-engine.mjs（组装）生成
- tests/parity-data.mjs 验证：注册表/ue/ot/Xt/RNG/rollGrowth/xp 全过；**TYPE_CHART 一项 FAIL 待查**（值级对比已确认逐系一致，疑为 JSON 键序——等价性无虞）

## 路线定案（2026-11-09 与用户确认）
翻译路线维持，改"机械重命名"打法：
1. 不再手工逐行翻译 Dt 类（1400+ 行）
2. 用脚本对 play.fmt.js 做词边界批量重命名（minified 名→语义名）
3. 只对系统层要调的接口手写干净包装（ue/ot/Vr/mn/Fs/难度/结算 ~15 个）
4. seed 对照测试验证

## play.fmt.js 关键行号地图（prettier 后）
- 13 Ba 基础表 / 186 Ha 进化 / 308 sa 身高体重 / 601 Oe 八维标签 / 611 Ps 必杀 / 619 Wa 属性必杀 / 639 aa 位置权重 / 646 na OVR / 651 oa 风格 / 687 ra 明星 / 809 ia 补充 / 824+ ja/Bt/la/Ar/ca/$e/Ua/ue/ot / 897 Ka 克制 / 936 场地常量 X/he/N / 955 Zt 难度 / 1005 H clamp / 1008 Ya RNG / 1520 **Dt 比赛引擎类** / 2948+ 渲染区（不翻译） / 3097 da 存档键路由（不翻译） / 3125 Fs 经验曲线 / 3126 ma 道馆联赛表 / 3672 mn 加点 / 3695 Vr 结算 / 3996+ 选秀/生涯逻辑（已决定删除，不翻） / 4319 ys 解说 / 5901 gs 渲染器（不翻） / 7563 At 按键位 / 7579 Qo 按键集合 / 8249 wi 训练驱动
- 8531 export 表（ri/po/Fs...→外部引出名）

## store.fmt.js 导出映射（play 引用的）
- f=敏感词检测 l=队名校验 V=shuffle H=合法性 W=storage T=挑战存档 b=训练项目表 pe=训练配置

## 待办
- [x] 机械重命名脚本 + 生成可读引擎（tools/rename-engine.mjs + tools/fix-exports.mjs → engine/readable/play-core.js，301KB，语法通过）
- [x] seed 对照测试（tests/parity-engine.mjs）：**原版 vs 重命名版，seed=42 全场比分/事件流(69 条)/统计表逐项一致 ✅**
- [ ] 渲染区识别与剥离清单（gs 渲染器等暂留 play-core，接 UI 时评估）
- [ ] store-bridge.js 完善（profanityFn/challengeStorage 已按原逻辑实现，其余 5 个占位——引擎核心不依赖）
- [ ] 已知坑（已完成处理）：z 双重身份（顶层距离函数 vs 玩家/事件对象的高度字段）——只重命名调用形态；export 表整体重写（原名→别名映射在重命名后大面积冲突，作废）

## 管线（可重复执行）
```
node tools/rename-engine.mjs     # 词边界重命名 → engine/readable/play-core.js
node tools/fix-exports.mjs       # 修 import 块 + 重写 export 块
node --check engine/readable/play-core.js
node tests/parity-engine.mjs     # 原版对照（全链硬验收）
node tests/smoke-engine.mjs      # 确定性冒烟（同 seed 两次一致）
```
