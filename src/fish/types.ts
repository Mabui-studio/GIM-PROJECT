/** Single Fish schema — Betta Master 2026 */

export type FishId = string;
export type OwnerId = string;
export type ParentRef = FishId | null;

export const SPECIES = ["Central", "Mahachai", "Isan", "South"] as const;
export type Species = (typeof SPECIES)[number];

/** Base stat templates: total 200 per species (HP, ATK, DEF, SPD) */
export const SPECIES_BASE_STATS: Record<Species, StatBlock> = {
  Central: { hp: 50, atk: 50, def: 50, spd: 50 },
  Mahachai: { hp: 45, atk: 60, def: 45, spd: 50 },
  Isan: { hp: 45, atk: 45, def: 50, spd: 60 },
  South: { hp: 55, atk: 45, def: 55, spd: 45 },
};

export const RARITY_ORDER = [
  "Common",
  "UC",
  "R",
  "SR",
  "SSR",
  "UR",
  "GOD",
] as const;
export type Rarity = (typeof RARITY_ORDER)[number];

/** Multiplier applied to final stat block (after distribution, before optional training bonus). */
export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  Common: 1.0,
  UC: 1.1,
  R: 1.3,
  SR: 1.6,
  SSR: 1.8,
  UR: 2.0,
  GOD: 2.5,
};

export type StatKey = "hp" | "atk" | "def" | "spd";

export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

/** L1–L4 visual layer asset ids (opaque strings). */
export interface VisualLayers {
  l1Body: string;
  l2Fin: string;
  l3Iridescent: string;
  l4Opaque: string;
}

export interface Bloodline {
  motherId: ParentRef;
  fatherId: ParentRef;
  /** F1–F10 — no fish level; generation tracks breeding depth. */
  generation: number;
}

export interface Fish {
  id: FishId;
  ownerId: OwnerId;
  gender: "F" | "M";
  species: Species;
  rarity: Rarity;
  /** Base stats before rarity mult / swings (200-point family). */
  baseStats: StatBlock;
  /** Locked at birth ±10% — applied to effective combat base. */
  birthSwing: StatBlock;
  /** 0.0–1.0 — mother & bloodline stability drive inheritance. */
  precisionScore: number;
  visualLayers: VisualLayers;
  bloodline: Bloodline;
  /** Father-skewed combat identifiers; mother influences unlock via precision. */
  activeSkillIds: string[];
}

export interface BreedParents {
  mother: Fish;
  father: Fish;
}

export interface BreedOptions {
  offspringId: FishId;
  /** Same owner as parents — enforced. */
  ownerId: OwnerId;
  /** Deterministic entropy string (e.g. breed session id). Same inputs → same child. */
  entropy?: string;
}

export interface BreedResult {
  offspring: Fish;
}

export class BreedingIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BreedingIntegrityError";
  }
}
