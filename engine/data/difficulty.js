/**
 * 难度四档参数表——翻译自 play 包 Zt 表，字段逐字照抄。
 * cpuBoost=电脑队数值加成 / green=投篮绿区窗口 / aggro=AI 激进度 / react=AI 反应延迟
 * cpuShot=电脑投篮修正 / contest=干扰强度 / assist=新手辅助 / catchup=追分修正
 * 调难度=改这里的数据；字段语义与数值禁止在翻译外调整。
 */
export const DIFFICULTY = {
  rookie: {
    label: "Rookie",
    cpuBoost: -14,
    green: 1.9,
    aggro: 0.3,
    react: 0.5,
    cpuShot: -0.1,
    contest: 0.5,
    assist: !0,
    catchup: 1,
  },
  pro: {
    label: "Pro",
    cpuBoost: -5,
    green: 1.35,
    aggro: 0.6,
    react: 0.3,
    cpuShot: -0.04,
    contest: 0.8,
    assist: !0,
    catchup: 0.5,
  },
  allstar: {
    label: "All-Star",
    cpuBoost: 0,
    green: 1.1,
    aggro: 0.9,
    react: 0.2,
    cpuShot: 0,
    contest: 0.9,
    assist: !1,
    catchup: 0,
  },
  legend: {
    label: "Legend",
    cpuBoost: 4,
    green: 0.85,
    aggro: 1.15,
    react: 0.12,
    cpuShot: 0.03,
    contest: 1,
    assist: !1,
    catchup: 0,
  },
};

/** 难度档位顺序（菜单展示顺序） */
export const DIFFICULTY_ORDER = ["rookie", "pro", "allstar", "legend"];
