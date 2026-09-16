// IA-4 · Animales con conducta propia. Anexo E, `docs/life-ai-proposal.md`,
// `docs/life-ai-implementation-prompt.md`.
//
// Lo que se guarda aquí son propiedades del diseño, no detalles de
// `beasts.ts`: cada especie hace más de una cosa consigo misma, un animal usa
// más de un sitio en una jornada, `feed`/`pet`/`chase` tienen principio y
// final de verdad —y no se quedan pegados aunque la visita se quede al
// lado—, la vaca busca al rebaño cuando anda sola, y todo ello es
// determinista y no toca el estado del motor.
//
// Los umbrales suman varias semillas y varias jornadas (CLAUDE.md): una sola
// partida diverge desde el primer tick, y con poblaciones pequeñas de cerdo o
// vaca una sola muestra es ruido.

import { createCommitmentRegistry, type CommitmentRegistry } from '../../src/render3d/life/commitments';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { TIME } from '@engine/balance';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { fingerprint } from '../helpers/fingerprint';
import type { Point, Terrain } from '../../src/render3d/life/body';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { createRouter } from '../../src/render3d/life/navigate';
import { freshProgress } from '../../src/render3d/life/decide';
import { freshNeeds } from '../../src/render3d/life/needs';
import { OFFERS } from '../../src/render3d/life/offers';
import { STEPS_PER_DAY, seedOfDay } from '../../src/render3d/life/clock';
import { terrainOf } from '../../src/render3d/life/terrain';
import { createVillage, type Dweller } from '../../src/render3d/life/village';
import { createBeasts, stepBeasts, type Beast, type BeastKind } from '../../src/render3d/life/beasts';

// Una sola aldea por (años, semilla), igual que `animals.test.ts`: correr
// muchos ticks por prueba es lo que engorda la suite rápida.
const grown = new Map<string, GameState>();
function village(years: number, seed: number): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

const SEEDS = [7, 23];

// **Una sola pasada de simulación para las dos propiedades siguientes**, no
// dos: recorrer `STEPS_PER_DAY` pasos por semilla y jornada es lo que
// engorda la suite rápida (CLAUDE.md, menos de 30 s la suite entera), y las
// dos preguntas —cuántas actividades usa cada especie, cuántos sitios usa
// cada animal— se contestan mirando el mismo recorrido.
function surveySpecies(): { activities: Map<BeastKind, Set<string>>; spotsPerAnimalDay: number[] } {
  const activities = new Map<BeastKind, Set<string>>();
  const spotsPerAnimalDay: number[] = [];
  for (const seed of SEEDS) {
    const state = village(20, seed);
    // Se fuerza la cabaña, igual que `animals.test.ts` («el dibujo enseña
    // exactamente el rebaño que la aldea tiene»): a los veinte años el
    // rebaño que de verdad sale depende de la subsistencia y puede no tener
    // cerdos todavía, y esta prueba mide la conducta de las tres especies,
    // no si a esta semilla concreta le ha tocado cebar uno.
    state.herd = { hens: 6, pigs: 4, cows: 3 };
    for (let day = 0; day < 2; day += 1) {
      const life = createVillage(state, day);
      const spots = new Map<number, Set<string>>();
      for (const beast of life.beasts) spots.set(beast.dweller.body.id, new Set());
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const beast of life.beasts) {
          const { doing, body } = beast.dweller;
          if (doing === null || !doing.there) continue;
          if (doing.place.id.startsWith('pause:') || doing.place.id.endsWith(':gift')) continue;
          spots.get(body.id)?.add(`${Math.round(body.x * 10)}:${Math.round(body.z * 10)}`);
          if (!doing.place.id.endsWith(':self') && doing.place.id !== beast.drink?.id) continue;
          const set = activities.get(beast.kind) ?? new Set<string>();
          set.add(doing.offer.id);
          activities.set(beast.kind, set);
        }
      }
      for (const set of spots.values()) spotsPerAnimalDay.push(set.size);
    }
  }
  return { activities, spotsPerAnimalDay };
}

/**
 * El registro de la aldea, que `stepBeasts` recibe desde la consolidación de
 * IA-4 en vez de hacerse el suyo. Aquí se crea uno por llamada porque cada
 * prueba es una aldea de mentira independiente.
 */
function registry(): CommitmentRegistry {
  return createCommitmentRegistry();
}

/**
 * La ventana de intención: en estas pruebas la persona **sí** viene a lo que el
 * animal ofrece, que es justamente lo que se quiere medir. En el juego la da
 * `village.ts` leyendo el `Dweller`.
 */
const GIFT_FOR_TEST = 'feed';

describe('IA-4 · cada especie hace más de una cosa consigo misma, y usa más de un sitio', () => {
  const { activities, spotsPerAnimalDay } = surveySpecies();

  it('cada especie usa más de una actividad propia a lo largo de la muestra', () => {
    for (const kind of ['hen', 'pig', 'cow'] as const) {
      const seen = activities.get(kind) ?? new Set();
      expect(seen.size, `${kind}: ${[...seen].join(', ')}`).toBeGreaterThan(1);
    }
  });

  it('un animal pisa más de un sitio propio a lo largo de una jornada, de media', () => {
    // Checklist IA-1 punto 2, ampliado: con un único punto por animal (antes
    // de IA-1) la media era exactamente 1. Con varias actividades y varios
    // sitios por actividad (IA-4), tiene que ser mayor — sin fijar cuánto,
    // que es cosa del nivelado posterior (CLAUDE.md, el rework en marcha).
    expect(spotsPerAnimalDay.length).toBeGreaterThan(0);
    const avg = spotsPerAnimalDay.reduce((a, b) => a + b, 0) / spotsPerAnimalDay.length;
    expect(avg, `media de sitios por animal-jornada: ${avg.toFixed(2)}`).toBeGreaterThan(1);
  });
});

describe('IA-4 · feed/pet/chase como interacción, no como oferta pasiva', () => {
  function openField(): Terrain {
    return { width: 24, height: 24, blocked: new Uint8Array(24 * 24) };
  }

  function makeBeast(kind: BeastKind, id: number, at: Point): Beast {
    const dweller: Dweller = {
      body: { id, x: at.x, z: at.z, vx: 0, vz: 0, facing: 0, radius: 0.24, pace: 0.4 },
      villager: -1 - id,
      traits: [],
      needs: freshNeeds(),
      doing: null,
      travelled: 0,
      faceAnchor: { x: at.x, z: at.z },
      scene: null,
      sceneCooldownUntil: 0,
      holding: null,
      aimAt: null,
      playedUntil: 0,
      rethinkAt: 0,
    };
    const giftId = kind === 'hen' ? 'chase' : kind === 'pig' ? 'feed' : 'pet';
    const giftSpec = OFFERS[giftId];
    if (giftSpec === undefined) throw new Error('offer missing');
    const selfSpots = [at, { x: at.x + 1, z: at.z }];
    return {
      dweller,
      kind,
      anchor: at,
      gift: { id: `beast:${id}:gift`, at: dweller.body, offers: [{ ...giftSpec, at: dweller.body }] },
      self: {
        id: `beast:${id}:self`,
        at,
        offers: [{
          id: 'busy', at, reach: 1.1, seats: selfSpots.length,
          gives: { boredom: 0.5 }, seconds: [8, 16], spots: selfSpots,
        }],
      },
      drink: null,
      progress: freshProgress(),
      reaction: { commitmentId: null, stage: null, actSince: null, recoverUntil: 0, cooldownUntil: 0 },
    };
  }

  it('el cerdo o la vaca no se quedan plantados para siempre aunque la visita nunca se vaya', () => {
    // Es exactamente el fallo real que costó esta ronda: una visita parada al
    // lado —rezando, trabajando, yendo a beber, tanto da— dejaba al animal
    // congelado mientras durase, y en una aldea real eso podía ser toda la
    // jornada. Aquí la visita no se va NUNCA, y aun así el animal tiene que
    // volver a moverse.
    for (const kind of ['pig', 'cow'] as const) {
      const land = openField();
      const beast = makeBeast(kind, 500, { x: 10, z: 10 });
      // Un cuerpo de persona, quieto, pegado a la distancia de contacto —igual
      // que alguien que se ha parado a darle de comer o a acariciarlo— y que
      // no se mueve jamás.
      const visitor = { id: 3, x: 10.9, z: 10, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 };
      const around = createNeighbourhood(land.width, land.height);
      const router = createRouter();
      const taken = new Map<string, number>();

      // **Un registro para toda la jornada, no uno por paso.** La primera
      // versión creaba uno nuevo en cada `stepBeasts`, que no es lo que hace
      // el juego —`village.ts` tiene uno y lo pasa— y con eso la reserva nunca
      // persistía: el animal se reiniciaba en bucle y la prueba pasaba por el
      // motivo equivocado. Con el registro compartido, lo que la saca del
      // apuro es lo que de verdad lo hace en el juego: el tope de `act` y el
      // enfriamiento de después.
      const shared = registry();
      // **Cada especie con su regalo.** La primera versión pasaba «dar de
      // comer» para las dos, y a una vaca se la acaricia: con el regalo
      // equivocado la reacción no llega a empezar (desde la consolidación de
      // IA-4 hace falta que la persona venga **a eso**), así que la prueba no
      // medía lo que dice medir.
      const gift = kind === 'pig' ? 'feed' : 'pet';
      let everMoved = false;
      let everReleased = false;
      for (let step = 0; step < 3000; step += 1) {
        around.rebuild([beast.dweller.body, visitor]);
        stepBeasts([beast], land, around, router, 7, step, taken, shared, () => gift);
        if (Math.hypot(beast.dweller.body.vx, beast.dweller.body.vz) > 0.05) everMoved = true;
        if (beast.reaction.stage === null) everReleased = true;
      }
      expect(everReleased, `${kind}: la reacción nunca se soltó en 100 s`).toBe(true);
      expect(everMoved, `${kind}: el cuerpo nunca recuperó velocidad en 100 s`).toBe(true);
    }
  });

  it('la gallina se aparta al notar a alguien y se calma cuando ya no está', () => {
    const land = openField();
    const beast = makeBeast('hen', 501, { x: 10, z: 10 });
    const around = createNeighbourhood(land.width, land.height);
    const router = createRouter();
    const taken = new Map<string, number>();

    // Cerca al principio: tiene que apartarse (velocidad de huida) en vez de
    // seguir clavada.
    const visitorClose = { id: 4, x: 10.6, z: 10, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 };
    // **Se mide que se aleja, no que haya un compromiso puesto.** La primera
    // versión miraba `beast.reaction.stage`, o sea el mecanismo, y dejó de
    // valer al convertir la cautela en un reflejo sin reserva (consolidación
    // de IA-4): apartarse de quien pasa no reserva a nadie, no tiene final que
    // negociar y no puede fallar, así que no es un compromiso. La propiedad que
    // esta prueba dice guardar es la de la gallina, y es ésta.
    const shared = registry();
    const gap = (): number => Math.hypot(
      beast.dweller.body.x - visitorClose.x, beast.dweller.body.z - visitorClose.z,
    );
    const before = gap();
    let farthest = before;
    for (let step = 0; step < 90; step += 1) {
      around.rebuild([beast.dweller.body, visitorClose]);
      stepBeasts([beast], land, around, router, 7, step, taken, shared, () => GIFT_FOR_TEST);
      farthest = Math.max(farthest, gap());
    }
    expect(farthest, `la gallina no se apartó: de ${before.toFixed(2)} a ${farthest.toFixed(2)} celdas`)
      .toBeGreaterThan(before + 0.3);

    // Y lejos después: tiene que acabar en calma otra vez.
    // Y sin nadie cerca vuelve a lo suyo: deja de huir y elige una actividad.
    let calmed = false;
    for (let step = 90; step < 400; step += 1) {
      around.rebuild([beast.dweller.body]);
      stepBeasts([beast], land, around, router, 7, step, taken, shared, () => GIFT_FOR_TEST);
      if (beast.reaction.stage === null && beast.dweller.doing !== null) calmed = true;
    }
    expect(calmed, 'la gallina se quedó sin volver a lo suyo con nadie cerca').toBe(true);
  });

  it('es determinista: la misma visita, en el mismo terreno, da la misma reacción', () => {
    const land = openField();
    const visitor = { id: 3, x: 10.9, z: 10, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 };
    const run1 = makeBeast('cow', 500, { x: 10, z: 10 });
    const run2 = makeBeast('cow', 500, { x: 10, z: 10 });
    const around1 = createNeighbourhood(land.width, land.height);
    const around2 = createNeighbourhood(land.width, land.height);
    const router1 = createRouter();
    const router2 = createRouter();
    const taken1 = new Map<string, number>();
    const taken2 = new Map<string, number>();

    for (let step = 0; step < 500; step += 1) {
      around1.rebuild([run1.dweller.body, visitor]);
      around2.rebuild([run2.dweller.body, { ...visitor }]);
      stepBeasts([run1], land, around1, router1, 7, step, taken1, registry(), () => GIFT_FOR_TEST);
      stepBeasts([run2], land, around2, router2, 7, step, taken2, registry(), () => GIFT_FOR_TEST);
    }
    expect(run1.dweller.body.x).toBeCloseTo(run2.dweller.body.x, 9);
    expect(run1.dweller.body.z).toBeCloseTo(run2.dweller.body.z, 9);
    expect(run1.reaction.stage).toBe(run2.reaction.stage);
  });
});

describe('IA-4 · la vaca sola busca al rebaño', () => {
  it('una vaca sin ninguna otra cerca se inclina hacia las demás', () => {
    const land: Terrain = { width: 30, height: 30, blocked: new Uint8Array(30 * 30) };
    const around = createNeighbourhood(land.width, land.height);
    const router = createRouter();
    const taken = new Map<string, number>();

    // Tres vacas juntas y una cuarta lejos, sin nada más que hacer (`self`
    // vacío no existe: se le da una oferta que no calma nada, para aislar el
    // tirón del rebaño de cualquier otra fuerza de movimiento).
    const idle = { id: 'idle', at: { x: 0, z: 0 }, offers: [] };
    const lone = { ...idleBeast(700, { x: 5, z: 5 }), self: idle };
    const herd = [
      { ...idleBeast(701, { x: 20, z: 20 }), self: idle },
      { ...idleBeast(702, { x: 20.5, z: 20 }), self: idle },
      { ...idleBeast(703, { x: 20, z: 20.5 }), self: idle },
    ];
    const all = [lone, ...herd];

    for (let step = 0; step < 60; step += 1) {
      around.rebuild(all.map((b) => b.dweller.body));
      stepBeasts(all, land, around, router, 7, step, taken, registry(), () => GIFT_FOR_TEST);
    }

    const moved = Math.hypot(lone.dweller.body.x - 5, lone.dweller.body.z - 5);
    expect(moved, 'la vaca sola no se movió hacia el rebaño').toBeGreaterThan(0.05);
    expect(lone.dweller.body.x, 'se acercó al rebaño en X').toBeGreaterThan(5);
    expect(lone.dweller.body.z, 'se acercó al rebaño en Z').toBeGreaterThan(5);

    function idleBeast(id: number, at: Point): Beast {
      return {
        dweller: {
          body: { id, x: at.x, z: at.z, vx: 0, vz: 0, facing: 0, radius: 0.4, pace: 0.32 },
          villager: -1 - id, traits: [], needs: freshNeeds(), doing: null, travelled: 0,
          faceAnchor: { x: at.x, z: at.z }, scene: null, sceneCooldownUntil: 0,
          holding: null, aimAt: null, playedUntil: 0, rethinkAt: 100_000,
        },
        kind: 'cow',
        anchor: at,
        gift: { id: `beast:${id}:gift`, at, offers: [] },
        self: idle,
        drink: null,
        progress: freshProgress(),
        reaction: { commitmentId: null, stage: null, actSince: null, recoverUntil: 0, cooldownUntil: 0 },
      };
    }
  });
});

describe('IA-4 · presentación, no motor', () => {
  it('recorrer varias jornadas de vida no cambia el estado del motor', () => {
    for (const seed of [3, 23]) {
      const state = village(20, seed);
      const before = fingerprint(state);
      const life = createVillage(state, 0);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step();
      expect(fingerprint(state), `semilla ${seed}`).toBe(before);
    }
  });

  it('el flujo de vida no toca el flujo de azar del motor: la misma jornada da la misma partida', () => {
    // Igual que `seedOfDay` documenta: reconstruir la jornada no puede
    // desplazar el motor. Se comprueba jugando la misma partida una vez sin
    // tocar la capa de vida y otra recorriéndola entera, y viendo que el
    // estado del motor —lo único que persiste al día siguiente— es idéntico.
    const untouched = village(20, 7);
    const withLife = village(20, 7);
    const life = createVillage(withLife, 0);
    for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step();
    expect(fingerprint(withLife)).toBe(fingerprint(untouched));
    // Y la propia semilla del día es una función pura de la del motor.
    expect(seedOfDay(untouched.seed, 0)).toBe(seedOfDay(withLife.seed, 0));
  });
});

describe('IA-4 · createBeasts sigue siendo determinista con el vado', () => {
  it('dos reconstrucciones de la misma aldea colocan la cabaña igual, vado incluido', () => {
    for (const seed of [3, 23]) {
      const state = village(20, seed);
      const land = terrainOf(state);
      const heart = { x: land.width / 2, z: land.height / 2 };
      const shore = new Uint8Array(land.width * land.height).fill(1);
      const dayNumber = 0;
      const seedOfDayValue = seedOfDay(state.seed, dayNumber);
      const a = createBeasts(state, land, heart, seedOfDayValue, shore);
      const b = createBeasts(state, land, heart, seedOfDayValue, shore);
      expect(a.length).toBe(b.length);
      for (let i = 0; i < a.length; i += 1) {
        expect(a[i]?.dweller.body.x).toBe(b[i]?.dweller.body.x);
        expect(a[i]?.dweller.body.z).toBe(b[i]?.dweller.body.z);
        expect(a[i]?.drink?.id).toBe(b[i]?.drink?.id);
      }
    }
  });
});
