import { createRng } from "../fish/rng.js";
import {
  RARITY_ORDER,
  SPECIES_BASE_STATS,
  type Fish,
  type Rarity,
  type Species,
  type StatBlock,
} from "../fish/types.js";

/** DNA string เดิมของเกม — ใช้คงความสอดคล้องกับลาย */
export function patternDnaFromId(id: string): string {
  let h = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return String(h).padStart(12, "0").slice(0, 12);
}

function rollBirthSwing(rng: () => number): StatBlock {
  const swing = () => 0.9 + rng() * 0.2;
  return { hp: swing(), atk: swing(), def: swing(), spd: swing() };
}

/** KOI/GALAXY บนการ์ด → สายพันธุ์ใน schema */
export function presentationToSpecies(presentation: "KOI" | "GALAXY"): Species {
  return presentation === "GALAXY" ? "Isan" : "Central";
}

/** สำหรับสี/ลายบน canvas */
export function speciesToPresentation(species: Species): "KOI" | "GALAXY" {
  return species === "Mahachai" || species === "Isan" ? "GALAXY" : "KOI";
}

export function createStarterFish(
  id: string,
  ownerId: string,
  presentation: "KOI" | "GALAXY",
  sex: "male" | "female",
): Fish {
  const rng = createRng(["gacha", id, ownerId]);
  const species = presentationToSpecies(presentation);
  const rarity = RARITY_ORDER[Math.min(2, Math.floor(rng() * 3))] as Rarity;
  const dna = patternDnaFromId(id);
  const baseStats = { ...SPECIES_BASE_STATS[species] };
  const birthSwing = rollBirthSwing(rng);
  const precisionScore = Math.max(0, Math.min(1, 0.35 + rng() * 0.45));

  return {
    id,
    ownerId,
    gender: sex === "female" ? "F" : "M",
    species,
    rarity,
    baseStats,
    birthSwing,
    precisionScore,
    visualLayers: {
      l1Body: presentation,
      l2Fin: dna.slice(0, 4),
      l3Iridescent: species,
      l4Opaque: dna.slice(4, 8),
    },
    bloodline: { motherId: null, fatherId: null, generation: 0 },
    activeSkillIds: presentation === "GALAXY" ? ["spark_tail"] : ["scale_guard"],
  };
}
