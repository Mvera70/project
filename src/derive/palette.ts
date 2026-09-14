// M-16 · The twelve seasonal colours from design.md §10.3.

import type { Season } from '@engine/state';
import { SEASONS } from '@engine/time';
import { TIME } from '@engine/balance';

const { WEEKS_PER_SEASON } = TIME;

export interface Palette {
  void: string;
  meadow: string;
  meadowAlt: string;
  field: string;
  forest: string;
  forestDark: string;
  water: string;
  rock: string;
  path: string;
  wood: string;
  roof: string;
  accent: string;
}

export const PALETTES: Readonly<Record<Season, Palette>> = {
  spring: {
    void: '#b9c9cf', meadow: '#96b562', meadowAlt: '#7fa050', field: '#95924a',
    forest: '#4f7a3c', forestDark: '#3c6030', water: '#6ca0ba', rock: '#9a968f',
    path: '#b49e76', wood: '#8a6a45', roof: '#6d5236', accent: '#d9d2c2',
  },
  summer: {
    void: '#c9cfc2', meadow: '#99aa52', meadowAlt: '#8fa14c', field: '#d2b258',
    forest: '#46703a', forestDark: '#35562c', water: '#69a2b2', rock: '#a39e94',
    path: '#bfa77d', wood: '#8a6a45', roof: '#6d5236', accent: '#efe6cf',
  },
  autumn: {
    void: '#cfc4b2', meadow: '#a89a55', meadowAlt: '#98884a', field: '#d0b05a',
    forest: '#8a6f33', forestDark: '#6a5326', water: '#6c96a7', rock: '#a09a90',
    path: '#b89e75', wood: '#83643f', roof: '#654c32', accent: '#e8d9b8',
  },
  winter: {
    void: '#c6ccd2', meadow: '#d9dde0', meadowAlt: '#c9ced3', field: '#cfd4d6',
    forest: '#3d5544', forestDark: '#2e4235', water: '#aebfc6', rock: '#8e939a',
    path: '#b4b0a6', wood: '#6f563a', roof: '#55402a', accent: '#f2f4f6',
  },
};

const KEYS = Object.keys(PALETTES.spring) as (keyof Palette)[];

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
}

function hex(values: readonly number[]): string {
  return `#${values.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(from: string, to: string, amount: number): string {
  const a = rgb(from);
  const b = rgb(to);
  return hex(a.map((value, index) => value + ((b[index] as number) - value) * amount));
}

/**
 * How many weeks a season spends turning into the next one, at its end.
 *
 * TUNE: two of the twelve. Long enough that the change is a thaw and not a
 * cut — which is what the blend was written for — and short enough that ten of
 * every twelve weeks are the season's own colour.
 */
const TURN_WEEKS = 2;

/**
 * A season wears its own colours from its first day, and turns into the next
 * one over its last two weeks.
 *
 * **It used to be the other way round, and that was a bug with a very visible
 * face.** The blend ran over the *first* two weeks and started at zero, so
 * `mix` returned the previous palette unchanged on week zero. A game opens on
 * spring, week zero — so every new valley opened painted in **winter**: meadow
 * `#d9dde0`, the exact snow grey, held for two weeks. At a week every fifteen
 * seconds that is the first half minute of every game, which is every
 * screenshot anyone ever took of it, and it is why the valley looked bleached:
 * the largest surface on screen was wearing the wrong season.
 *
 * Fading at the end instead of the beginning fixes it without losing anything.
 * The thaw is where a thaw belongs —winter greens before spring is called
 * spring— and the seam is still seamless: the last week of a season is already
 * the next season's palette, which is exactly what its week zero returns. The
 * founding, on spring week zero, is finally green.
 */
export function paletteFor(season: Season, seasonWeek: number): Palette {
  const current = PALETTES[season];
  const at = SEASONS.indexOf(season);
  const next = PALETTES[SEASONS[(at + 1) % SEASONS.length] as Season];
  // Cero hasta que falten `TURN_WEEKS` semanas; uno en la última.
  const from = WEEKS_PER_SEASON - 1 - TURN_WEEKS;
  const amount = Math.max(0, Math.min(1, (seasonWeek - from) / TURN_WEEKS));
  return Object.fromEntries(KEYS.map((key) => [key, mix(current[key], next[key], amount)])) as unknown as Palette;
}

export function outline(colour: string): string {
  return mix(colour, '#000000', 0.45);
}

/** Perceptual grayscale value on the 0–255 scale used by the silhouette test. */
export function luminance(colour: string): number {
  const [red, green, blue] = rgb(colour);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

