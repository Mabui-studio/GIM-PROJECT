import { describe, expect, it } from "vitest";
import { breedFish, computeEffectiveBaseStats } from "./breeding.js";
import type { Fish } from "./types.js";
import { SPECIES_BASE_STATS } from "./types.js";

function makeFish(partial: Partial<Fish> & Pick<Fish, "id" | "gender" | "ownerId">): Fish {
  return {
    species: "Central",
    rarity: "Common",
    baseStats: { ...SPECIES_BASE_STATS.Central },
    birthSwing: { hp: 1, atk: 1, def: 1, spd: 1 },
    precisionScore: 0.5,
    visualLayers: {
      l1Body: "b1",
      l2Fin: "f1",
      l3Iridescent: "i1",
      l4Opaque: "o1",
    },
    bloodline: { motherId: null, fatherId: null, generation: 0 },
    activeSkillIds: [],
    ...partial,
  } as Fish;
}

describe("breedFish", () => {
  it("throws when mother is not F or father is not M", () => {
    const male = makeFish({ id: "m1", gender: "M", ownerId: "o1" });
    const female = makeFish({ id: "f1", gender: "F", ownerId: "o1" });
    expect(() =>
      breedFish(
        { mother: male, father: female },
        { offspringId: "c1", ownerId: "o1" },
      ),
    ).toThrow();
  });

  it("throws when ownerId mismatches parents", () => {
    const mother = makeFish({ id: "mom", gender: "F", ownerId: "o1" });
    const father = makeFish({ id: "dad", gender: "M", ownerId: "o1" });
    expect(() =>
      breedFish(
        { mother, father },
        { offspringId: "c1", ownerId: "o2" },
      ),
    ).toThrow();
  });

  it("is deterministic for same entropy and ids", () => {
    const mother = makeFish({
      id: "mom",
      gender: "F",
      ownerId: "o1",
      species: "Mahachai",
      rarity: "R",
      precisionScore: 0.7,
      activeSkillIds: [],
    });
    const father = makeFish({
      id: "dad",
      gender: "M",
      ownerId: "o1",
      species: "Isan",
      rarity: "UC",
      precisionScore: 0.4,
      activeSkillIds: ["skill_a", "skill_b"],
    });
    const a = breedFish(
      { mother, father },
      { offspringId: "child", ownerId: "o1", entropy: "session-1" },
    );
    const b = breedFish(
      { mother, father },
      { offspringId: "child", ownerId: "o1", entropy: "session-1" },
    );
    expect(a.offspring).toEqual(b.offspring);
  });

  it("child base stats sum to 200", () => {
    const mother = makeFish({ id: "mom", gender: "F", ownerId: "o1" });
    const father = makeFish({ id: "dad", gender: "M", ownerId: "o1" });
    const { offspring } = breedFish(
      { mother, father },
      { offspringId: "c1", ownerId: "o1", entropy: "x" },
    );
    const sum =
      offspring.baseStats.hp +
      offspring.baseStats.atk +
      offspring.baseStats.def +
      offspring.baseStats.spd;
    expect(sum).toBe(200);
  });

  it("effective stats apply rarity and birth swing", () => {
    const fish = makeFish({
      id: "x",
      gender: "F",
      ownerId: "o1",
      baseStats: { hp: 50, atk: 50, def: 50, spd: 50 },
      birthSwing: { hp: 1, atk: 1, def: 1, spd: 1 },
      rarity: "R",
    });
    const eff = computeEffectiveBaseStats(fish);
    expect(eff.hp).toBeCloseTo(50 * 1.3);
  });
});
