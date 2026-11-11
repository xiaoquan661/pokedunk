/**
 * 必杀数据——翻译自 play 包 Ps（六类效果说明）/ Wa（属性→必杀映射），逐字照抄。
 * SPECIALS: 效果 id → { label, desc }；SPECIAL_MOVES: 属性 → [效果 id, 招式名]。
 */
export const SPECIALS = {
  surge: { label: "Surge", desc: "Unlimited turbo and +25% speed for 5 seconds." },
  lockin: { label: "Lock-In", desc: "Next shot is a guaranteed perfect release." },
  phase: { label: "Phase", desc: "Cannot be stolen from, shoved or blocked for 5 seconds." },
  blaze: { label: "Blaze", desc: "Instantly catch fire." },
  quake: { label: "Quake", desc: "Knocks down every opponent within 14 ft. Type matchups apply." },
  freeze: { label: "Freeze", desc: "Slows the whole opposing team for 5 seconds." },
};

export const SPECIAL_MOVES = {
  Electric: ["surge", "VOLT TACKLE"],
  Normal: ["surge", "EXTREME SPEED"],
  Flying: ["surge", "TAILWIND"],
  Psychic: ["lockin", "CALM MIND"],
  Fairy: ["lockin", "MOONBLAST"],
  Steel: ["lockin", "IRON FOCUS"],
  Ghost: ["phase", "PHANTOM FORCE"],
  Dark: ["phase", "SUCKER PUNCH"],
  Poison: ["phase", "TOXIC SPIKES"],
  Fire: ["blaze", "BLAST BURN"],
  Dragon: ["blaze", "OUTRAGE"],
  Ground: ["quake", "EARTHQUAKE"],
  Rock: ["quake", "ROCK SLIDE"],
  Fighting: ["quake", "CLOSE COMBAT"],
  Water: ["quake", "SURF"],
  Ice: ["freeze", "ICY WIND"],
  Grass: ["freeze", "SLEEP POWDER"],
  Bug: ["freeze", "STRING SHOT"],
};
