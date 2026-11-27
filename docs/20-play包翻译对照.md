# 20 play 包翻译对照（归档）

> 状态：**代码翻译已完成并进入运行时**。运行时只使用 `engine/` 下的可读源码，`play` 包不再被页面或模块引用。
> 注意：S14（加点改 1 点 + 自由训练点）和 S18（XP 曲线改 `15 + 6×(L−1)`）是**主动玩法修改**，这两项不再与原版逐值一致。对照表用于溯源与排错，不是“所有数据永久等价”的承诺。
> 本文件保留“压缩名 → 可读模块”的映射，用于溯源、回归测试和后续排错。

## 1. 两种“翻译”不要混淆

| 名称 | 对象 | 产物 | 是否运行时 |
|---|---|---|---|
| **代码翻译** | `tools/reference/play-package/play.js` 压缩代码 | `engine/**` 可读源码 | 是，`engine/` 进入运行时 |
| **文案汉化** | 原版 UI/解说文本 | `js/zh.js`、`assets/lang-zh.js` 等 | 是，运行时加载中文对照 |

S12 说的是第一种：把压缩变量名/函数展开成可读模块，不是把英文界面换成中文。

## 2. 为什么还要保留对照表

- **溯源**：`Dt` 这类压缩名在新代码里已不存在，只有映射表能回答“`MatchEngine` 是从哪段逻辑翻译来的”。
- **回归**：`tests/parity-*.mjs` 用同一 seed 对比新旧实现；对照表说明每个模块对应哪个旧资产，方便定位差异。
- **排错**：玩家反馈某个数值/事件异常时，可以回到 play 包对照原始实现，确认是翻译偏差还是后续改动。
- **归档成本低**：表本身只有十几行；play 包文件也只在 `tools/reference/`，不进发布产物。

## 3. 对照表

| # | play 包资产（压缩名） | 新模块（可读命名） | 内容 | 被谁引用 |
| --- | --- | --- | --- | --- |
| 1 | Dt 类 | `engine/match-engine.js`（MatchEngine 类） | 比赛全逻辑（开局跳球/攻防/投篮/盖帽/抢断/换人/结算事件流） | 主线比赛/快速比赛 |
| 2 | $e/Ua（291 注册表） | `engine/data/pokemon.js`（POKEMON 表 + getPokemon(dex)/buildPlayer(dex,bonus)） | 291 精灵数据+个体构造 | 全系统 |
| 3 | Ka | `engine/data/type-chart.js`（TYPE_CHART） | 18 系攻防克制 | 比赛引擎 |
| 4 | Fs | `engine/data/pokemon.js`（xpToNext(level)=60+25×(L−1)） | 经验曲线 | 树果/比赛结算 |
| 5 | mn | `engine/growth.js`（rollGrowth(player)） | 位置权重随机加点（掷 1 点，cap 99） | 升级循环 |
| 6 | Lt/Ha | `engine/data/evolutions.js`（EVOLUTIONS） | 120 条进化表+播报 | 升级循环 |
| 7 | na | `engine/data/pokemon.js`（calcOVR） | OVR 公式（→25~99） | 全系统 |
| 8 | Vr | `engine/match-result.js`（settleMatch） | 结算（比分/XP/受伤/进化） | 主线比赛 |
| 9 | aa | `engine/data/positions.js`（POSITION_WEIGHTS） | 位置权重表 | 加点/OVR |
| 10 | Ps / Wa | `engine/data/specials-data.js` | 必杀表/属性必杀 | 比赛引擎 |
| 11 | Zt | `engine/data/difficulty.js`（DIFFICULTY） | 难度四档参数 | 比赛引擎 |
| 12 | Ya（RNG） | `engine/rng.js`（seededRng） | 种子随机数 | 比赛引擎/对照测试 |
| 13 | 旅程状态机（旧 story.js 行为规格） | `js/journey/**`（新写） | 主线推进/重试/冠军/结算 | 训练师之旅 |
| 14 | 平台接入（旧 LampsPlatform 行为规格） | `js/platform/lamps.js`（新写） | sync/ad-sign/状态栏 | 全系统 |

> 注：`engine/readable/play-core.js` 是运行时实际入口；`engine/reference-run/` 仅保留旧实现副本给对照测试。

## 4. 行为等价范围

翻译期要求逐值一致：
- 克制表数值、进化等级、位置权重、OVR 公式、难度四档参数、必杀充能/效果数值、比赛引擎事件流。

后续主动修改、不再要求与原版一致：
- **XP 曲线**：S18 改为 `15 + 6×(L−1)`（原版 `60 + 25×(L−1)`）。
- **随机加点**：S14 改为每级 1 点 + 自由训练点（原版多掷点）。
- 赛季/主线、经济、商店、孵蛋等系统层规则。

测试现状：
- `tests/parity-engine.mjs` 用于比赛引擎 seed 对照。
- `tests/parity-data.mjs` 仍保留几处**过期断言**（TYPE_CHART 占位比较、按旧 XP 曲线比较、按旧加点规则比较），会出现假失败；修测试时应先区分“翻译偏差”和“主动改版”。

## 5. 不翻译清单

- campaign/draft 逻辑（已随经典赛季删除）
- 旧存档键路由（Nr/zr/da/`__pjSetLine`）
- 旧菜单线、旧 `__pj*` 注入 API
- 旧 UI 的 DOM/样式（UI 全部重写）

## 6. 当前文件位置

- 旧包参照：`tools/reference/play-package/`（仅开发参考，不打包）
- 可读引擎：`engine/`、`engine/readable/`
- 对照测试：`tests/parity-engine.mjs`、`tests/parity-data.mjs`、`tests/legacy-parity-dump.js`
