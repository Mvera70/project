// E0a · La aldea se prepara para el asedio.
//
// La decisión ya existe en el motor (`braced`). Esta capa no vuelve a decidir
// nada ni paga dos veces su coste: sólo convierte el estado congelado de la
// jornada en viajes visibles. Todo lo que sale de aquí es función de ese estado,
// la geometría y la semilla escénica; no consume ningún flujo del motor.

import { flagSet } from '@engine/crossroads/conditions';
import { hash32 } from '@engine/rng';
import { ageOf } from '@engine/people/villagers';
import { LIFE } from '@engine/balance';
import type { GameState, VillagerId } from '@engine/state';
import type { Point, Terrain } from './body';
import { pathTo, type Waypoint } from './navigate';
import { doorOf, placedOffer, seatAt, type Offer, type Place } from './offers';

/** Dos hacen legible la acción y cuatro no vacían la aldea. Es aforo escénico del brief. */
const MIN_PORTERS = 2;
const MAX_PORTERS = 4;

const PICK_UP = {
  id: 'prepare-load', reach: 0.8, seats: MAX_PORTERS,
  gives: { duty: 0.35 }, seconds: [1.5, 2.5] as const, routineOnly: true,
};
const PUT_AWAY = {
  id: 'prepare-store', reach: 0.9, seats: MAX_PORTERS,
  gives: { duty: 0.35 }, seconds: [2, 4] as const, routineOnly: true,
};

export type PreparationLoad = 'grain' | 'bundle';

export interface PreparationSource {
  readonly place: Place;
  readonly load: PreparationLoad;
}

export interface PreparationSites {
  readonly sources: readonly PreparationSource[];
  readonly targets: readonly Place[];
}

export interface PreparationCandidate {
  readonly villager: VillagerId;
  readonly at: Point;
  readonly radius: number;
  /** La guarnición se reparte antes; sus puestos no se pueden abandonar. */
  readonly guarding: boolean;
}

export interface PreparationTrip {
  readonly villager: VillagerId;
  readonly load: PreparationLoad;
  readonly source: Place;
  readonly sourceSeat: number;
  readonly target: Place;
  readonly targetSeat: number;
  readonly toSource: readonly Waypoint[];
  readonly toTarget: readonly Waypoint[];
}

/** La bandera sola no basta: una decisión vieja no coreografía otra jornada. */
export function preparationActive(state: GameState): boolean {
  return flagSet(state, 'braced')
    && state.threat.comingTick !== null
    && state.tick < state.threat.comingTick;
}

/**
 * Suelo del que sale la carga y edificios donde acaba.
 *
 * Los campos son la primera lectura: grano exterior que entra bajo techo. Una
 * reserva de leña ya cortada (`wood-store`) es el respaldo visible y usa el haz
 * existente. El destino es granero/molino y sólo cuando no hay ninguno una
 * casa en pie, la misma jerarquía que la cosecha visible de `offers.ts`.
 */
export function preparationSites(
  state: GameState, land: Terrain, places: readonly Place[],
): PreparationSites {
  const sources: PreparationSource[] = [];
  const appendSources = (prefix: string, load: PreparationLoad): void => {
    for (const original of places.filter(place => place.id.startsWith(prefix))) {
      const spots = original.offers.flatMap(offer => offer.spots ?? [offer.at]).slice(0, MAX_PORTERS);
      if (spots.length === 0) continue;
      const offer: Offer = { ...PICK_UP, at: original.at, seats: spots.length, spots };
      sources.push({ place: { id: `prepare-source:${original.id}`, at: original.at, offers: [offer] }, load });
    }
  };
  appendSources('field:', 'grain');
  appendSources('wood-store:', 'bundle');

  const live = state.buildings.filter(building => building.lostTick === null);
  const stores = live.filter(building => building.kind === 'granary' || building.kind === 'mill');
  const buildings = (stores.length > 0 ? stores : live
    .filter(building => building.kind === 'house' || building.kind === 'stone_house'))
    .sort((a, b) => a.id - b.id);
  const targets: Place[] = [];
  for (const building of buildings) {
    const at = doorOf(land, building.x, building.y, building.w, building.h);
    if (at === null) continue;
    const offer = placedOffer(PUT_AWAY, at, land);
    if (offer !== null) targets.push({ id: `prepare-store:${building.id}`, at, offers: [offer] });
  }
  return { sources, targets };
}

/**
 * El reparto completo, incluidas ambas rutas. Si una ida no existe no se
 * finge: se prueba la siguiente combinación y, si no hay dos, se devuelve lo
 * que de verdad cabe. El orden por hash sólo reparte las jornadas entre
 * vecinos; sigue siendo reconstruible con semilla, tick e ids.
 */
export function planPreparation(
  state: GameState,
  land: Terrain,
  candidates: readonly PreparationCandidate[],
  sites: PreparationSites,
  seed: number,
): PreparationTrip[] {
  if (!preparationActive(state) || sites.sources.length === 0 || sites.targets.length === 0) return [];
  const aliveAdults = candidates.filter(candidate => {
    if (candidate.guarding) return false;
    const villager = state.people.villagers.find(person => person.id === candidate.villager);
    if (villager === undefined || villager.diedTick !== null || villager.leftTick !== null) return false;
    const age = ageOf(villager, state.tick);
    return age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1];
  }).sort((a, b) => {
    const ah = hash32(seed, `prepare:${state.tick}:${a.villager}`);
    const bh = hash32(seed, `prepare:${state.tick}:${b.villager}`);
    return ah - bh || a.villager - b.villager;
  });

  const trips: PreparationTrip[] = [];
  const usedSource = new Set<string>();
  const usedTarget = new Set<string>();
  for (const candidate of aliveAdults) {
    let chosen: PreparationTrip | null = null;
    for (const source of sites.sources) {
      const sourceOffer = source.place.offers[0];
      if (sourceOffer === undefined) continue;
      for (let sourceSeat = 0; sourceSeat < sourceOffer.seats; sourceSeat += 1) {
        if (usedSource.has(`${source.place.id}:${sourceSeat}`)) continue;
        const sourceSpot = seatAt(sourceOffer, sourceSeat);
        const toSource = pathTo(land, candidate.at, sourceSpot, candidate.radius);
        if (toSource === null) continue;
        for (const target of sites.targets) {
          const targetOffer = target.offers[0];
          if (targetOffer === undefined) continue;
          for (let targetSeat = 0; targetSeat < targetOffer.seats; targetSeat += 1) {
            if (usedTarget.has(`${target.id}:${targetSeat}`)) continue;
            const targetSpot = seatAt(targetOffer, targetSeat);
            const toTarget = pathTo(land, sourceSpot, targetSpot, candidate.radius);
            if (toTarget === null) continue;
            chosen = {
              villager: candidate.villager, load: source.load, source: source.place, sourceSeat,
              target, targetSeat, toSource, toTarget,
            };
            break;
          }
          if (chosen !== null) break;
        }
        if (chosen !== null) break;
      }
      if (chosen !== null) break;
    }
    if (chosen === null) continue;
    usedSource.add(`${chosen.source.id}:${chosen.sourceSeat}`);
    usedTarget.add(`${chosen.target.id}:${chosen.targetSeat}`);
    trips.push(chosen);
    if (trips.length >= MAX_PORTERS) break;
  }

  // No se rellena con rutas falsas para llegar al mínimo. El llamador puede
  // enseñar una sola persona si es literalmente la única que cabe.
  return trips.length < MIN_PORTERS ? trips : trips.slice(0, MAX_PORTERS);
}
