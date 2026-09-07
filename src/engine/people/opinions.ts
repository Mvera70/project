// M-05 · What the named think of each other. design.md §6.4.
//
// Opinions run −100 to +100 and exist only between the named. They move on
// events, and between events they drift back towards nothing at 0.05 a week —
// a spiteful villager at half that speed, a loyal one at double. That single
// asymmetry is most of what makes two villages with the same events tell
// different stories.
//
// A grudge is what an opinion leaves behind when it crosses −50. Grudges are
// append-only, like `villagers`: healing one sets `healedTick` and nothing is
// ever deleted. The village remembers that two people once hated each other,
// even after they stopped.

import { OPINION } from '../balance';
import type { GameState, Grudge, MemoryKind, Villager, VillagerId } from '../state';
import { isHere } from './demography';
import { memoriesAbout } from './memories';

const clamp = (x: number): number => Math.max(OPINION.MIN, Math.min(OPINION.MAX, x));

function villager(state: GameState, id: VillagerId): Villager | undefined {
  return state.people.villagers.find((v) => v.id === id);
}

/** What `from` thinks of `to`. Zero when they have no opinion at all. */
export function opinionOf(state: GameState, from: VillagerId, to: VillagerId): number {
  return villager(state, from)?.opinions[to] ?? 0;
}

/** The open grudge `from` holds against `to`, if there is one running. */
function openGrudge(state: GameState, from: VillagerId, to: VillagerId): Grudge | undefined {
  return state.people.grudges.find(
    (g) => g.fromId === from && g.toId === to && g.healedTick === null,
  );
}

/**
 * Why they fell out: the heaviest memory the wronged one carries about the
 * other. If nobody wrote anything down, the cause is `unspoken` — which is
 * itself true to life, and gives the feud templates something to say.
 */
function causeOf(
  state: GameState,
  from: VillagerId,
  to: VillagerId,
): { cause: MemoryKind; causeTick: number } {
  const v = villager(state, from);
  const heaviest = v === undefined ? undefined : memoriesAbout(v, to)[0];
  if (heaviest === undefined) return { cause: 'unspoken', causeTick: state.tick };
  return { cause: heaviest.kind, causeTick: heaviest.tick };
}

/**
 * Write an opinion and keep the grudge ledger honest.
 *
 * A grudge is created the once, on the way down past −50 — not on every tick
 * that stays below it. It heals on the way back up past −20, and healing does
 * not remove it. After it has healed, the same two can fall out again and a
 * second grudge is written.
 */
function setOpinion(state: GameState, from: VillagerId, to: VillagerId, value: number): void {
  const v = villager(state, from);
  if (v === undefined) return;

  const next = clamp(value);
  v.opinions[to] = next;

  const open = openGrudge(state, from, to);
  if (open === undefined) {
    if (next <= OPINION.GRUDGE_AT) {
      const { cause, causeTick } = causeOf(state, from, to);
      state.people.grudges.push({
        fromId: from,
        toId: to,
        cause,
        causeTick,
        formedTick: state.tick,
        healedTick: null,
      });
    }
  } else if (next > OPINION.GRUDGE_HEALS_AT) {
    open.healedTick = state.tick;
  }
}

/**
 * Move an opinion by `d`. The §6.4 table is the list of things that call this:
 * a child lost to hunger by the leader's choice is −35, a public accusation
 * −30, being saved +25.
 */
export function adjustOpinion(
  state: GameState,
  from: VillagerId,
  to: VillagerId,
  d: number,
): void {
  if (from === to) return; // nobody holds an opinion of themselves
  setOpinion(state, from, to, opinionOf(state, from, to) + d);
}

/** How fast this villager forgives. §6.4: spiteful ×0.5, loyal ×2. */
function recoveryRate(v: Villager): number {
  if (v.traits.includes('spiteful')) return OPINION.SPITEFUL_RECOVERY;
  if (v.traits.includes('loyal')) return OPINION.LOYAL_RECOVERY;
  return 1;
}

/**
 * A week of living together without incident. §6.4.
 *
 * Every opinion moves towards zero, never past it. Two kinds of entry are left
 * alone: those held by the dead, who have stopped changing their minds, and
 * those held *about* the dead — that somebody never forgave a dead man is a
 * fact about them worth keeping, and the entry costs nothing.
 */
export function driftOpinions(state: GameState): void {
  for (const v of state.people.villagers) {
    if (!v.named || !isHere(v)) continue;

    const step = OPINION.DRIFT_PER_WEEK * recoveryRate(v);
    for (const key of Object.keys(v.opinions)) {
      const to = Number(key);
      const target = villager(state, to);
      if (target === undefined || !isHere(target)) continue;

      const current = v.opinions[to] ?? 0;
      if (current === 0) continue;
      const moved = current > 0 ? Math.max(0, current - step) : Math.min(0, current + step);
      setOpinion(state, v.id, to, moved);
    }
  }
}

/**
 * The grudges on record, worst first. `min` filters by how deep the opinion
 * behind them still runs, so `grudges(state, 60)` is "who hates somebody by at
 * least sixty points".
 *
 * Only open grudges are returned: a healed one is history, and §8.2's
 * `{k:'grudge'}` condition asks whether the village has a feud right now.
 * The order is total — depth, then the two ids — so two runs of the same game
 * see the same list.
 */
export function grudges(state: GameState, min = 0): Grudge[] {
  return state.people.grudges
    .filter((g) => g.healedTick === null && -opinionOf(state, g.fromId, g.toId) >= min)
    .sort(
      (a, b) =>
        opinionOf(state, a.fromId, a.toId) - opinionOf(state, b.fromId, b.toId) ||
        a.fromId - b.fromId ||
        a.toId - b.toId,
    );
}

/**
 * How deep the worst dislike in the village runs, as a positive number.
 * Zero when nobody dislikes anybody.
 *
 * §8.2's `{k:'grudge', min:N}` asks whether "a grudge of at least N exists". A
 * Grudge record only comes into being once an opinion has crossed −50 (§6.4),
 * so reading the ledger alone would make every template asking for less than
 * fifty unsatisfiable — and Annex A asks for 30, 40 and 55.
 */
export function deepestDislike(state: GameState): number {
  let worst = 0;
  for (const v of state.people.villagers) {
    if (!v.named || !isHere(v)) continue;
    for (const [key, value] of Object.entries(v.opinions)) {
      const other = villager(state, Number(key));
      if (other === undefined || !isHere(other) || !other.named) continue;
      if (value < worst) worst = value;
    }
  }
  return -worst;
}

/**
 * Who hates `id` the most — the casting of §8.3's `grudgeAgainst`.
 *
 * Only the living named can hate anyone, and only a genuinely negative opinion
 * counts: if nobody dislikes them, the answer is nobody, and the feud template
 * that asked has no cast and does not fire. Ties go to the lowest id so the
 * answer never depends on array order.
 */
export function worstEnemyOf(state: GameState, id: VillagerId): VillagerId | null {
  let worst: VillagerId | null = null;
  let lowest = 0;

  for (const otherId of [...state.people.namedIds].sort((a, b) => a - b)) {
    if (otherId === id) continue;
    const other = villager(state, otherId);
    if (other === undefined || !isHere(other)) continue;

    const view = other.opinions[id];
    if (view === undefined || view >= 0) continue;
    if (worst === null || view < lowest) {
      worst = otherId;
      lowest = view;
    }
  }

  return worst;
}
