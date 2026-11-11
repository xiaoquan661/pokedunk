/**
 * 属性克制表（18 系）——翻译自 play 包 Ka 表，数值逐字照抄。
 * 每系 = [克制列表, 抵抗列表, 免疫列表]；双向组合时倍率相乘（见 effectiveness）。
 * 行为等价铁律：本文件数值禁止调整（走 GDD 变更流程）。
 */
export const TYPE_CHART = {
  Normal: [[], ["Rock", "Steel"], ["Ghost"]],
  Fire: [["Grass", "Ice", "Bug", "Steel"], ["Fire", "Water", "Rock", "Dragon"], []],
  Water: [["Fire", "Ground", "Rock"], ["Water", "Grass", "Dragon"], []],
  Electric: [["Water", "Flying"], ["Electric", "Grass", "Dragon"], ["Ground"]],
  Grass: [["Water", "Ground", "Rock"], ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"], []],
  Ice: [["Grass", "Ground", "Flying", "Dragon"], ["Fire", "Water", "Ice", "Steel"], []],
  Fighting: [["Normal", "Ice", "Rock", "Dark", "Steel"], ["Poison", "Flying", "Psychic", "Bug", "Fairy"], ["Ghost"]],
  Poison: [["Grass", "Fairy"], ["Poison", "Ground", "Rock", "Ghost"], ["Steel"]],
  Ground: [["Fire", "Electric", "Poison", "Rock", "Steel"], ["Grass", "Bug"], ["Flying"]],
  Flying: [["Grass", "Fighting", "Bug"], ["Electric", "Rock", "Steel"], []],
  Psychic: [["Fighting", "Poison"], ["Psychic", "Steel"], ["Dark"]],
  Bug: [["Grass", "Psychic", "Dark"], ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"], []],
  Rock: [["Fire", "Ice", "Flying", "Bug"], ["Fighting", "Ground", "Steel"], []],
  Ghost: [["Psychic", "Ghost"], ["Dark"], ["Normal"]],
  Dragon: [["Dragon"], ["Steel"], ["Fairy"]],
  Dark: [["Psychic", "Ghost"], ["Fighting", "Dark", "Fairy"], []],
  Steel: [["Ice", "Rock", "Fairy"], ["Fire", "Water", "Electric", "Steel"], []],
  Fairy: [["Fighting", "Dragon", "Dark"], ["Fire", "Poison", "Steel"], []],
};

/** 单属性对目标属性组合的倍率（翻译自 Xt，逻辑逐行等价） */
export function effectiveness(atkType, defTypes) {
  const [strong, resist, immune] = TYPE_CHART[atkType];
  let mult = 1;
  for (const dt of defTypes) {
    if (immune.includes(dt)) return 0;
    if (strong.includes(dt)) mult *= 2;
    else if (resist.includes(dt)) mult *= 0.5;
  }
  return mult;
}

/** 多攻击属性取最优倍率（翻译自 Va，逻辑逐行等价） */
export function bestEffectiveness(atkTypes, defTypes) {
  return Math.max(...atkTypes.map((t) => effectiveness(t, defTypes)));
}
