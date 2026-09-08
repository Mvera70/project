// M-02 · The crossroad template schema. design.md §8.1, §8.3, §8.4, §8.5.
//
// Types and nothing else. M-07 writes the logic (evaluation, casting,
// selection, resolution) in the other files of this folder; M-08 writes the
// catalogue against these declarations.
//
// Op and Condition are not here but in state.ts: PlantedSeed depends on
// Condition, and putting the DSL here would make the two files import each
// other. This file imports from state.ts, never the reverse.

import type {
  BuildingKind,
  Condition,
  MemoryKind,
  Role,
  StatName,
  Trait,
  VillagerId,
} from '../state';

// ---------------------------------------------------------------------------
// §8.1 · Template
// ---------------------------------------------------------------------------

export type CrossroadCategory =
  | 'famine'
  | 'plague'
  | 'lord'
  | 'feud'
  | 'faith'
  | 'forest'
  | 'stranger'
  | 'succession';

export interface CrossroadTemplate {
  id: string; // 'winter_grain_debt'
  category: CrossroadCategory;
  weight: number; // base selection weight
  cooldownYears: number; // cannot repeat before this
  maxPerGame?: number;
  minYear?: number;
  requires: Condition[]; // ALL must hold
  cast: CastSpec[];
  title: string; // key into the text bank
  body: string; // key into the text bank
  options: CrossroadOption[]; // 2 or 3
}

/**
 * `visible` is mandatory and must not be empty. A test walks the catalogue and
 * fails if any option changes nothing on screen — principle 1 of the game
 * turned into an assertion (design.md §8.1).
 */
export interface CrossroadOption {
  id: string;
  label: string; // key: the verb, 1-3 words
  cost: string; // key: the price, visible before choosing
  effects: Effect[];
  visible: VisualEffect[]; // MANDATORY, length >= 1
  seeds: SeedSpec[];
  requires?: Condition[]; // the option may be unavailable
  traitWeight?: Partial<Record<Trait, number>>; // casting weighs, it does not decide
}

// ---------------------------------------------------------------------------
// §8.3 · Casting
//
// Binds letters to actual villagers. If a part cannot be filled, the template
// is not eligible.
// ---------------------------------------------------------------------------

export type CastSpec =
  | { as: string; role: Role }
  /**
    * `agedBetween` is a hard filter with one escape: if the band yields nobody
    * for this letter, it widens to the whole named pool. Cast letter by letter,
    * that is exactly §A.15's rule — if there are not two in the band, the first
    * takes the only one there is and the second widens.
    */
  | { as: string; anyNamed: true; excluding?: string[]; agedBetween?: [number, number] }
  | { as: string; grudgeAgainst: string } // the one who hates them most
  | { as: string; childOf: string }
  | { as: string; youngestNamed: true; female?: boolean };

// ---------------------------------------------------------------------------
// §8.4 · Effects
// ---------------------------------------------------------------------------

export type Effect =
  | { k: 'stat'; stat: StatName; delta: number }
  | { k: 'stat'; stat: StatName; mul: number }
  | { k: 'kill'; who: 'random' | 'weakest' | string; count: number | 'fraction'; fraction?: number }
  | { k: 'leave'; who: string }
  | { k: 'arrive'; count: number }
  | { k: 'flag'; flag: string; years: number } // 0 = permanent
  | { k: 'build'; kind: BuildingKind; free: true }
  /**
   * `blockYears` leaves the ground unbuildable for that long (§7.4, v2.25).
   * Without it a burnt house is rebuilt within the decade and the price the
   * option charged was a few weeks of building work.
   */
  | { k: 'destroy'; kind: BuildingKind; count: number; blockYears?: number }
  /**
   * The next `harvests` reapings come in at `factor` of what they would have
   * been (§5.3, v2.25). The catalogue has asked for this since A.3 — "cosecha
   * del año ×0.55" — and it was implemented as a flag nobody reads.
   */
  | { k: 'harvest'; factor: number; harvests: number }
  | { k: 'outbreak'; weeks: number }
  | { k: 'opinion'; from: string; to: string; delta: number }
  | { k: 'memory'; who: string; kind: MemoryKind; about?: string; weight: number }
  | { k: 'role'; who: string; role: Role | null }
  | { k: 'lit'; kind: BuildingKind; on: boolean };

/** What the option changes on screen. Never empty. */
export type VisualEffect =
  | { k: 'raise'; kind: BuildingKind }
  | { k: 'ruin'; kind: BuildingKind }
  | { k: 'banner'; colour: string; years: number } // a banner over the core
  | { k: 'douse'; kind: BuildingKind } // put a building's fire out
  | { k: 'gather'; where: 'square' | 'chapel' | 'ford'; days: number }
  | { k: 'scar'; what: 'burnt_field' | 'grave_row' | 'felled_wood' };

// ---------------------------------------------------------------------------
// §8.5 · Seeds — the deferred consequence
//
// Half the design. Without it a crossroad is a menu of modifiers; with it, it
// is a decision. When it comes due the chronicle entry quotes the decision that
// planted it, with the year.
// ---------------------------------------------------------------------------

export interface SeedSpec {
  id: string;
  delayYears: [number, number]; // drawn within the range
  condition?: Condition; // if it fails when due, the seed withers
  effects: Effect[];
  visible: VisualEffect[];
  chronicleKey: string; // the text that links back to the original decision
  /**
   * A flag held for exactly as long as the seed takes to come due (v2.13).
   *
   * The delay is drawn when the option is taken, so an ordinary
   * `{k:'flag', years}` effect cannot match it: it would have to guess. A.15
   * needs the match exactly — `interregnum` must lift on the week the leaderless
   * years end, not a year before or after — and this is the only way to say
   * "until this consequence arrives" without special-casing a flag name inside
   * the resolver.
   */
  holdsFlag?: string;
}

// ---------------------------------------------------------------------------
// M-07 · What the engine hands back
//
// Completing schema.ts rather than reopening it: these are declarations, they
// belong with the rest of §8's types, and M-10 reads all three.
// ---------------------------------------------------------------------------

/** The whole catalogue. M-08 writes it; M-07 only ever reads one. */
export type Catalogue = readonly CrossroadTemplate[];

/** A template that could fire this tick, with the score §8.6 gives it. */
export interface ScoredTemplate {
  template: CrossroadTemplate;
  cast: Record<string, VillagerId>;
  score: number;
  /** The parts of the score, so that why it won can be inspected. */
  weight: number;
  crisis: number;
  story: number;
  trait: number;
  novelty: number;
}

/**
 * What resolving an option actually did.
 *
 * `build` and `destroy` are requests, not deeds: M-14 owns the buildings and
 * carries them out, the same way rollFire reports a fire it does not light.
 */
export interface AppliedEffects {
  templateId: string;
  optionId: string;
  killed: VillagerId[];
  left: VillagerId[];
  arrived: VillagerId[];
  seedsPlanted: string[];
  build: BuildingKind[];
  destroy: { kind: BuildingKind; count: number; blockYears?: number }[];
  visible: VisualEffect[];
}

/** What became of a seed that came due. §8.5. */
export interface FiredSeed {
  id: string;
  fromTemplateId: string;
  fromOptionId: string;
  /** False when the condition failed and the seed withered instead. */
  fired: boolean;
  effects: AppliedEffects | null;
}
