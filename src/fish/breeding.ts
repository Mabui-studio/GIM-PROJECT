import { createRng } from "./rng.js";
import { normalizeStatSum } from "./stats.js";
import {
  SPECIES_BASE_STATS,
  RARITY_MULTIPLIER,
  RARITY_ORDER,
  type BreedOptions,
  type BreedParents,
  type BreedResult,
  type Fish,
  type Rarity,
  type Species,
  type StatBlock,
  BreedingIntegrityError,
} from "./types.js";

function assertBreedingIntegrity(mother: Fish, father: Fish, ownerId: string): void {
  if (mother.gender !== "F" || father.gender !== "M") {
    throw new BreedingIntegrityError(
      "การผสมต้องใช้แม่ (F) เป็น Genetic Key และพ่อ (M) เป็น Combat Template",
    );
  }
  if (mother.ownerId !== father.ownerId || mother.ownerId !== ownerId) {
    throw new BreedingIntegrityError(
      "ownerId ของพ่อแม่และลูกต้องตรงกัน — relational integrity",
    );
  }
}

function rarityIndex(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}

function clampRarityIndex(i: number): number {
  return Math.max(0, Math.min(RARITY_ORDER.length - 1, i));
}

/** Child rarity: เฉลี่ยจากพ่อแม่ + โอกาสกระโดดขั้นเล็กน้อย (deterministic). */
function rollOffspringRarity(mother: Fish, father: Fish, rng: () => number): Rarity {
  const im = rarityIndex(mother.rarity);
  const id = rarityIndex(father.rarity);
  const base = (im * 0.55 + id * 0.45) + (rng() - 0.5) * 1.2;
  let idx = Math.round(base);
  if (rng() < 0.08) idx += 1;
  if (rng() < 0.02) idx += 1;
  return RARITY_ORDER[clampRarityIndex(idx)];
}

function pickOffspringSpecies(motherSpecies: Species, fatherSpecies: Species, rng: () => number): Species {
  return rng() < 0.6 ? motherSpecies : fatherSpecies;
}

function blendBaseStats(mother: Fish, father: Fish, targetSpecies: Species, rng: () => number): StatBlock {
  const m = SPECIES_BASE_STATS[mother.species];
  const f = SPECIES_BASE_STATS[father.species];
  const t = SPECIES_BASE_STATS[targetSpecies];
  const pull = (rng() - 0.5) * 2;
  const raw: StatBlock = {
    hp: m.hp * 0.6 + f.hp * 0.4 + (t.hp - (m.hp * 0.6 + f.hp * 0.4)) * 0.12 * pull,
    atk: m.atk * 0.6 + f.atk * 0.4 + (t.atk - (m.atk * 0.6 + f.atk * 0.4)) * 0.12 * pull,
    def: m.def * 0.6 + f.def * 0.4 + (t.def - (m.def * 0.6 + f.def * 0.4)) * 0.12 * pull,
    spd: m.spd * 0.6 + f.spd * 0.4 + (t.spd - (m.spd * 0.6 + f.spd * 0.4)) * 0.12 * pull,
  };
  return normalizeStatSum(raw, 200, rng);
}

/** Birth swing ±10% — เก็บเป็นตัวคูณต่อสถิติ (0.9–1.1). */
function rollBirthSwing(rng: () => number): StatBlock {
  const swing = () => 0.9 + rng() * 0.2;
  return { hp: swing(), atk: swing(), def: swing(), spd: swing() };
}

/** Precision 0–1: แม่หนัก ความเสถียรสายเลือดจากรุ่น F1–F10 */
function computePrecision(mother: Fish, father: Fish, rng: () => number): number {
  const nextGen = Math.max(mother.bloodline.generation, father.bloodline.generation) + 1;
  const genStrain = Math.min(nextGen / 10, 1);
  const base = mother.precisionScore * 0.72 + father.precisionScore * 0.18;
  const stability = 1 - genStrain * 0.35;
  const jitter = (rng() - 0.5) * 0.06 * (1 - mother.precisionScore * 0.5);
  return Math.max(0, Math.min(1, base * stability + jitter));
}

function inheritVisualLayers(mother: Fish, father: Fish, precision: number, rng: () => number): Fish["visualLayers"] {
  const useMotherL4 = precision >= 0.48 || rng() < mother.precisionScore * 0.4;
  return {
    l1Body: rng() < 0.65 ? mother.visualLayers.l1Body : father.visualLayers.l1Body,
    l2Fin: rng() < 0.65 ? mother.visualLayers.l2Fin : father.visualLayers.l2Fin,
    l3Iridescent: mother.visualLayers.l3Iridescent,
    l4Opaque: useMotherL4 ? mother.visualLayers.l4Opaque : father.visualLayers.l4Opaque,
  };
}

function inheritActiveSkills(father: Fish, precision: number): string[] {
  if (father.activeSkillIds.length === 0) return [];
  const cap = precision < 0.35 ? Math.max(1, father.activeSkillIds.length - 1) : father.activeSkillIds.length;
  return father.activeSkillIds.slice(0, cap);
}

/**
 * อัลกอริทึมผสมพันธุ์: แม่ = Stability / Precision / L4&Hidden, พ่อ = Base trend / Skills / Visual dominance
 * ผลลัพธ์ deterministic เมื่อ entropy + id พ่อแม่ + offspringId คงที่
 */
export function breedFish(parents: BreedParents, options: BreedOptions): BreedResult {
  const { mother, father } = parents;
  assertBreedingIntegrity(mother, father, options.ownerId);

  const seed = [
    options.entropy ?? "default-entropy",
    options.offspringId,
    mother.id,
    father.id,
  ];
  const rng = createRng(seed);

  const species = pickOffspringSpecies(mother.species, father.species, rng);
  const rarity = rollOffspringRarity(mother, father, rng);
  const baseStats = blendBaseStats(mother, father, species, rng);
  const birthSwing = rollBirthSwing(rng);
  const precisionScore = computePrecision(mother, father, rng);
  const visualLayers = inheritVisualLayers(mother, father, precisionScore, rng);
  const activeSkillIds = inheritActiveSkills(father, precisionScore);

  const nextGen = Math.max(mother.bloodline.generation, father.bloodline.generation) + 1;

  const offspring: Fish = {
    id: options.offspringId,
    ownerId: options.ownerId,
    gender: rng() < 0.5 ? "F" : "M",
    species,
    rarity,
    baseStats,
    birthSwing,
    precisionScore,
    visualLayers,
    bloodline: {
      motherId: mother.id,
      fatherId: father.id,
      generation: nextGen,
    },
    activeSkillIds,
  };

  return { offspring };
}

/** Final stats สำหรับ UI/สู้ — รวม rarity mult และ birth swing (ยังไม่รวม training bonus). */
export function computeEffectiveBaseStats(fish: Fish): StatBlock {
  const m = RARITY_MULTIPLIER[fish.rarity];
  return {
    hp: fish.baseStats.hp * fish.birthSwing.hp * m,
    atk: fish.baseStats.atk * fish.birthSwing.atk * m,
    def: fish.baseStats.def * fish.birthSwing.def * m,
    spd: fish.baseStats.spd * fish.birthSwing.spd * m,
  };
}
