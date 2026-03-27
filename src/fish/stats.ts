import type { StatBlock, StatKey } from "./types.js";

const KEYS: StatKey[] = ["hp", "atk", "def", "spd"];

export function sumStats(s: StatBlock): number {
  return s.hp + s.atk + s.def + s.spd;
}

export function scaleStatBlock(s: StatBlock, factor: number): StatBlock {
  return {
    hp: s.hp * factor,
    atk: s.atk * factor,
    def: s.def * factor,
    spd: s.spd * factor,
  };
}

/** Redistribute a stat block to exact target sum while preserving rough ratios (deterministic tie-break). */
export function normalizeStatSum(
  raw: StatBlock,
  targetSum: number,
  rng: () => number,
): StatBlock {
  const current = sumStats(raw);
  if (current <= 0) {
    return distributeEven(targetSum, rng);
  }
  const scaled = scaleStatBlock(raw, targetSum / current);
  let rounded = {
    hp: Math.round(scaled.hp),
    atk: Math.round(scaled.atk),
    def: Math.round(scaled.def),
    spd: Math.round(scaled.spd),
  };
  let drift = targetSum - sumStats(rounded);
  const order = [...KEYS].sort((a, b) => {
    const fracA = scaled[a] - rounded[a];
    const fracB = scaled[b] - rounded[b];
    if (fracA !== fracB) return fracB - fracA;
    return a.localeCompare(b);
  });
  let i = 0;
  while (drift !== 0 && i < 1000) {
    const k = order[i % order.length];
    if (drift > 0) {
      rounded = { ...rounded, [k]: rounded[k] + 1 };
      drift -= 1;
    } else {
      if (rounded[k] > 1) {
        rounded = { ...rounded, [k]: rounded[k] - 1 };
        drift += 1;
      }
    }
    i += 1;
  }
  return rounded;
}

function distributeEven(targetSum: number, rng: () => number): StatBlock {
  const base = Math.floor(targetSum / 4);
  let rest = targetSum - base * 4;
  const out: StatBlock = { hp: base, atk: base, def: base, spd: base };
  const order = [...KEYS].sort(() => rng() - 0.5);
  for (const k of order) {
    if (rest <= 0) break;
    out[k] += 1;
    rest -= 1;
  }
  return out;
}
