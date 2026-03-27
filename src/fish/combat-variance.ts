import { createRng } from "./rng.js";
import type { Fish, StatBlock } from "./types.js";

/**
 * Performance swing ±15% — ใช้ตอนคำนวณการต่อสู้แบบ real-time
 * deterministic ต่อ fish.id + roundId (หรือ tick) เพื่อ replay ได้
 */
export function applyPerformanceSwing(
  stats: StatBlock,
  fish: Fish,
  roundEntropy: string,
): StatBlock {
  const rng = createRng(["perf-swing", fish.id, roundEntropy]);
  const swing = () => 0.85 + rng() * 0.3;
  return {
    hp: stats.hp * swing(),
    atk: stats.atk * swing(),
    def: stats.def * swing(),
    spd: stats.spd * swing(),
  };
}
