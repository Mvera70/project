// V-04 y V-05 · Los impulsos y lo que el mundo ofrece. Anexo E.
//
// Lo que guardan estas pruebas son las dos reglas de las que depende que la
// variedad sea de verdad y no un dado:
//
// 1. **El carácter cambia lo que a uno le pide el cuerpo.** Si dos personas con
//    el mismo día acaban con los mismos impulsos, todo lo que venga encima
//    elegirá lo mismo y el valle será una coreografía.
// 2. **Ninguna oferta conoce a nadie.** En cuanto una diga «si pasa fulano…»,
//    esto deja de ser un mundo con cosas y es un guion disfrazado.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState, Trait } from '@engine/state';
import { blockedAt } from '../../src/render3d/life/body';
import { terrainOf } from '../../src/render3d/life/terrain';
import {
  drift, freshNeeds, loudest, NEED_NAMES, paceOf, type Doing, type Needs,
} from '../../src/render3d/life/needs';
import {
  OFFERS, offersNear, placesOf, seatKey, type Place,
} from '../../src/render3d/life/offers';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { pauseHere, worth } from '../../src/render3d/life/decide';
import { createRouter } from '../../src/render3d/life/navigate';
import { createVillage, type Dweller } from '../../src/render3d/life/village';

const grown = new Map<number, GameState>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, 40 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

const IDLE: Doing = { moving: false, withOthers: false, working: false, hunger: 0 };

/** Una jornada entera de impulsos, haciendo lo que se le diga. */
function liveADay(traits: readonly Trait[], doing: Doing): Needs {
  const needs = freshNeeds();
  for (let n = 0; n < STEPS_PER_DAY; n += 1) drift(needs, traits, doing, LIFE_STEP);
  return needs;
}

describe('V-04 · los impulsos', () => {
  it('ninguno se sale de sus casillas, haga uno lo que haga', () => {
    // Seis jornadas seguidas y cuatro maneras de pasarlas. Un impulso por
    // encima de uno o por debajo de cero rompe la elección de V-06 sin avisar,
    // porque lo que allí se compara son fracciones.
    const ways: Doing[] = [
      IDLE,
      { moving: true, withOthers: false, working: true, hunger: 0 },
      { moving: false, withOthers: true, working: false, hunger: 1 },
      { moving: true, withOthers: true, working: true, hunger: 0.5 },
    ];
    for (const traits of [[], ['hot_tempered'], ['frail', 'craven'], ['hardy', 'secretive']] as Trait[][]) {
      const needs = freshNeeds();
      for (let day = 0; day < 6; day += 1) {
        const doing = ways[day % ways.length] as Doing;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          drift(needs, traits, doing, LIFE_STEP);
          for (const name of NEED_NAMES) {
            expect(needs[name], `${name} se salió con ${traits.join('+') || 'nadie'}`)
              .toBeGreaterThanOrEqual(0);
            expect(needs[name]).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('dos caracteres distintos acaban el día distintos', () => {
    // La propiedad de la que cuelga la variedad. Si esto se rompe, el valle
    // entero elige lo mismo a la misma hora.
    const calm = liveADay(['kind', 'hardy'], IDLE);
    const fierce = liveADay(['hot_tempered', 'frail'], IDLE);
    expect(fierce.irritation, 'el de mal genio se enciende antes')
      .toBeGreaterThan(calm.irritation * 2);

    // **El cansancio se compara andando**, que es cuando existe: parado baja, y
    // quieto todo el día los dos llegan a cero y no se distingue nada.
    const walking: Doing = { ...IDLE, moving: true };
    const tough = liveADay(['hardy'], walking);
    const weak = liveADay(['frail'], walking);
    expect(weak.rest, 'el enclenque se cansa antes').toBeGreaterThan(tough.rest);

    // **A media jornada, no al final.** El hablador llega al tope antes de que
    // acabe el día —que es lo que significa el tope: no puede pensar en otra
    // cosa— y comparar dos cosas cuando una está saturada no compara nada.
    const half = (traits: Trait[]): number => {
      const needs = freshNeeds();
      for (let n = 0; n < STEPS_PER_DAY / 2; n += 1) drift(needs, traits, IDLE, LIFE_STEP);
      return needs.company;
    };
    expect(half(['generous']), 'el hablador echa de menos a la gente')
      .toBeGreaterThan(half(['secretive']) * 2);
  });

  it('lo que se hace calma lo que toca', () => {
    // Cada impulso tiene su remedio, y se comprueba que el remedio funciona: un
    // impulso que sólo sube no es un impulso, es un reloj.
    const still = liveADay([], IDLE);
    const walking = liveADay([], { ...IDLE, moving: true });
    expect(walking.rest, 'andar cansa; parado se descansa').toBeGreaterThan(still.rest);

    const alone = liveADay([], IDLE);
    const together = liveADay([], { ...IDLE, withOthers: true });
    expect(together.company, 'la compañía se calma con compañía').toBeLessThan(alone.company);

    const idle = liveADay([], IDLE);
    const busy = liveADay([], { ...IDLE, working: true });
    expect(busy.duty, 'el deber se calma trabajando').toBeLessThan(idle.duty);
  });

  it('el hambre de la aldea agria a todo el mundo', () => {
    // La misma idea de §7.9 en la capa de vida: un año de hambre no sólo mata
    // gente, enemista a la que queda.
    const fed = liveADay([], IDLE);
    const starving = liveADay([], { ...IDLE, hunger: 1 });
    expect(starving.irritation).toBeGreaterThan(fed.irritation);
  });

  it('no consume azar, y el mismo día da lo mismo', () => {
    // §4.3. Mirar el valle no puede cambiarlo, ni siquiera por dentro.
    const one = liveADay(['proud', 'loyal'], { ...IDLE, moving: true });
    const two = liveADay(['proud', 'loyal'], { ...IDLE, moving: true });
    for (const name of NEED_NAMES) expect(one[name]).toBe(two[name]);
  });

  it('en una jornada corriente aprieta más de un impulso', () => {
    // Si siempre ganara el mismo, la elección de V-06 sería una constante con
    // pasos intermedios. Se mira qué manda a lo largo del día.
    const needs = freshNeeds();
    const seen = new Set<string>();
    for (let n = 0; n < STEPS_PER_DAY * 2; n += 1) {
      const doing: Doing = {
        moving: n % 900 < 450,
        withOthers: n % 1200 < 300,
        working: n % 1500 < 700,
        hunger: 0.2,
      };
      drift(needs, ['ambitious'], doing, LIFE_STEP);
      seen.add(loudest(needs).need);
    }
    expect(seen.size, `a lo largo de dos jornadas mandan: ${[...seen].join(', ')}`)
      .toBeGreaterThan(1);
  });

  it('el carácter acelera, no cambia de impulso', () => {
    // `paceOf` es el reparto de personalidades, y tiene que leerse al derecho.
    expect(paceOf(['hot_tempered'], 'irritation')).toBeGreaterThan(paceOf([], 'irritation'));
    expect(paceOf(['kind'], 'irritation')).toBeLessThan(paceOf([], 'irritation'));
    expect(paceOf(['secretive'], 'company')).toBeLessThan(paceOf([], 'company'));
    // Un rasgo que no toca un impulso lo deja exactamente igual.
    expect(paceOf(['devout'], 'rest')).toBe(paceOf([], 'rest'));
  });
});

describe('V-05 · lo que el mundo ofrece', () => {
  it('el valle ofrece cosas, y todas en suelo pisable', () => {
    for (const seed of [7, 11, 23]) {
      const state = village(seed);
      const land = terrainOf(state);
      const places = placesOf(state, land);

      expect(places.length, `semilla ${seed}: el valle no ofrece nada`).toBeGreaterThan(5);
      for (const place of places) {
        expect(blockedAt(land, place.at.x, place.at.z),
          `semilla ${seed}: ${place.id} ofrece meterse en una pared`).toBe(false);
        expect(place.at.x).toBeGreaterThan(0);
        expect(place.at.z).toBeGreaterThan(0);
        expect(place.at.x).toBeLessThan(land.width);
        expect(place.at.z).toBeLessThan(land.height);
        expect(place.offers.length).toBeGreaterThan(0);
      }
    }
  });

  it('lo que ofrece un edificio sale de para qué sirve', () => {
    const state = village(7);
    const land = terrainOf(state);
    const places = placesOf(state, land);
    const kinds = new Map<string, Set<string>>();
    for (const place of places) {
      const kind = place.id.split(':')[0] as string;
      const set = kinds.get(kind) ?? new Set<string>();
      for (const offer of place.offers) set.add(offer.id);
      kinds.set(kind, set);
    }
    // El pozo da de beber y la capilla no. Si esto se cruza, alguien ha metido
    // una oferta donde no pega y la aldea hará cosas que no se entienden.
    if (kinds.has('well')) expect([...(kinds.get('well') ?? [])]).toContain('drink');
    if (kinds.has('chapel')) expect([...(kinds.get('chapel') ?? [])]).toContain('pray');
    if (kinds.has('field')) expect([...(kinds.get('field') ?? [])]).toContain('work');
  });

  it('el aforo se respeta: no entran nueve en un pozo de dos', () => {
    const state = village(7);
    const land = terrainOf(state);
    const places = placesOf(state, land);
    const well = places.find((p) => p.id.startsWith('well:'))
      ?? places[0] as Place;
    const offer = well.offers[0];
    expect(offer).toBeDefined();
    if (offer === undefined) return;

    const empty = offersNear(places, well.at, 2, new Map());
    expect(empty.some((o) => o.id === offer.id), 'vacío, se ofrece').toBe(true);

    const full = new Map([[seatKey(well, offer), offer.seats]]);
    const left = offersNear([well], well.at, 2, full);
    expect(left.some((o) => o.id === offer.id), 'lleno, ya no').toBe(false);
  });

  it('ninguna oferta conoce a nadie', () => {
    // La regla que separa un mundo con cosas de un guion con disfraz. Se
    // comprueba sobre la forma del catálogo: una oferta es qué, dónde, cuánto
    // cabe y qué calma. Si alguna gana un campo que nombre a una persona, un
    // oficio o una decisión, aquí salta.
    const allowed = new Set(['id', 'reach', 'seats', 'gives', 'seconds', 'routineOnly']);
    for (const [name, spec] of Object.entries(OFFERS)) {
      for (const field of Object.keys(spec)) {
        expect(allowed.has(field), `la oferta ${name} habla de '${field}'`).toBe(true);
      }
      expect(spec.seats, `${name} tiene que caber alguien`).toBeGreaterThan(0);
      expect(spec.seconds[0], `${name} dura algo`).toBeGreaterThan(0);
      expect(spec.seconds[1]).toBeGreaterThanOrEqual(spec.seconds[0]);
      // Y calma algo: una oferta que no sirve para nada no la elegirá nadie.
      expect(Object.keys(spec.gives).length, `${name} no calma nada`).toBeGreaterThan(0);
    }
  });

  it('una oferta nueva da comportamiento a todo el mundo sin tocar a nadie', () => {
    // La propiedad que hace esto barato de crecer, comprobada como lo que es:
    // el catálogo es una tabla, y lo que un sitio ofrece se lee de ella. Nadie
    // tiene escrito qué hacer con qué.
    const state = village(7);
    const land = terrainOf(state);
    const places = placesOf(state, land);
    const near = offersNear(places, { x: land.width / 2, z: land.height / 2 }, 12, new Map());
    expect(near.length, 'en medio del valle hay algo que hacer').toBeGreaterThan(0);
    // Todo lo ofrecido está en el catálogo: nada se inventa por el camino.
    for (const offer of near) expect(OFFERS[offer.id], `${offer.id} no está en el catálogo`).toBeDefined();
  });
});

describe('IA-3 · aldeanos con hábitos', () => {
  it('hardy y frail no descansan el mismo rato, y ninguno se queda clavado', () => {
    // «Pausas y ritmo distintos, sin bloquear el cuerpo» (brief IA-3). No hace
    // falta una aldea entera: `pauseHere` es una función pura, igual que
    // `worth` en la descripción de más arriba.
    const state = village(7);
    const land = terrainOf(state);
    const router = createRouter();
    // Un punto donde de verdad se pueda estar: el de un sitio del valle, no el
    // centro del mapa a ciegas (puede caer en el río).
    const at = placesOf(state, land)[0]?.at ?? { x: land.width / 2, z: land.height / 2 };

    const span = (traits: Trait[]): number => {
      const intent = pauseHere(at, land, router, 11, 1, 0, traits);
      return intent.until - intent.since;
    };
    const plain = span([]);
    const hardy = span(['hardy']);
    const frail = span(['frail']);

    expect(hardy, 'el hardy descansa menos rato que quien no tiene el rasgo').toBeLessThan(plain);
    expect(frail, 'el frail descansa más rato').toBeGreaterThan(plain);
    // Y «sin bloquear el cuerpo»: ninguna pausa se sale de lo que una pausa
    // puede durar como mucho — `PAUSE_FRAIL_SCALE` está pensado para no
    // acercarse a `GIVE_UP` (rework.md, checklist IA-1).
    expect(frail, 'una pausa sigue siendo una pausa, no media jornada')
      .toBeLessThan(20 * 30);
  });

  it('un devoto busca la capilla más lejos que un pozo cualquiera', () => {
    // «Preferencia contextual por capilla alcanzable» (brief IA-3): el radio
    // de búsqueda de `decide()` se estira para un `devout` frente a una
    // capilla, y no frente a cualquier otra cosa. Se comprueba con `worth()`,
    // que es la pieza pública que puntúa: a la misma distancia e igualdad de
    // necesidad, un `devout` valora rezar por encima de cualquiera sin el
    // rasgo — la propiedad de la que depende que le compense caminar más.
    const needs = { ...freshNeeds(), irritation: 0.6, boredom: 0.4 };
    const pray = OFFERS.pray;
    expect(pray).toBeDefined();
    if (pray === undefined) return;
    const offer = { ...pray, at: { x: 10, z: 10 }, spots: [{ x: 10, z: 10 }] };
    const from = { x: 10, z: 4 };
    const scorePlain = worth(offer, needs, [], from);
    const scoreDevout = worth(offer, needs, ['devout'], from);
    expect(scoreDevout, 'la capilla vale más para el devoto a la misma distancia')
      .toBeGreaterThan(scorePlain);
  });

  /**
   * Una sola pasada de simulación para las dos propiedades de abajo — devoto
   * que reza y genio que se enzarza — en vez de dos, que es lo que costaba
   * antes de agruparlas: `createVillage`/`life.step()` para una jornada entera
   * (3 600 pasos) cuesta de verdad, y la suite rápida tiene que quedarse por
   * debajo de treinta segundos (`CLAUDE.md`). Memoizado con `village()` para
   * no rehacerlo si vitest reejecuta el fichero.
   *
   * Dos semillas y una jornada cada una: pequeño a propósito para una prueba
   * rápida — «varias, nunca una» (`CLAUDE.md`), pero la muestra grande que de
   * verdad demuestra la fase (varias semillas × varios días) vive en
   * `docs/life-rounds/IA-3.md`, medida con `tools/life-traits-report.ts`.
   */
  interface HabitSample {
    readonly byTrait: Map<Trait, { pray: number; total: number }>;
    readonly anyThirstIgnored: boolean;
    readonly fieryConflictDays: number;
    readonly fieryPersonDays: number;
    readonly calmConflictDays: number;
    readonly calmPersonDays: number;
  }
  let sample: HabitSample | null = null;
  function habitSample(): HabitSample {
    if (sample !== null) return sample;
    const seeds = [7, 23];
    const fiery: Trait[] = ['hot_tempered', 'spiteful'];
    const calm: Trait[] = ['kind', 'generous'];
    const byTrait = new Map<Trait, { pray: number; total: number }>();
    let anyThirstIgnored = false;
    let fieryConflictDays = 0;
    let fieryPersonDays = 0;
    let calmConflictDays = 0;
    let calmPersonDays = 0;

    // **Tres jornadas por semilla, y no una** (18 sep 2026). Cada jornada tiene
    // su propia semilla (`seedOfDay`), así que el día 0 de dos valles son dos
    // muestras y no dos aldeas — es la regla que `CLAUDE.md` deja escrita para
    // esta capa, y esta función la incumplía. Se vio cuando B2 metió al clan
    // vecino: la trayectoria se movió unas décimas y la tasa de encontronazos
    // cayó del 6,67 % al 6,52 %, con lo que una propiedad verdadera —los de
    // mal genio se enzarzan más— salía roja por un cuarto de punto. Con seis
    // muestras el número deja de bailar por un asalto.
    for (const seed of seeds) {
    for (const day of [0, 1, 2]) {
      const state = village(seed);
      const life = createVillage(state, day);
      const hadConflict = new Set<number>();
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const d of life.dwellers as readonly Dweller[]) {
          if (d.scene !== null && (d.scene.kind === 'shove' || d.scene.kind === 'brawl')) {
            hadConflict.add(d.body.id);
          }
          if ((n + 1) % 30 !== 0) continue;
          const praying = d.doing !== null && d.doing.there && d.doing.offer.id === 'pray';
          for (const trait of d.traits) {
            const row = byTrait.get(trait) ?? { pray: 0, total: 0 };
            row.total += 1;
            if (praying) row.pray += 1;
            byTrait.set(trait, row);
          }
          // «No ignora necesidades urgentes para forzar una escena»: nunca se
          // ve a alguien con la sed al máximo sin ir a beber — `thirst` no
          // baja salvo en `drink` o en el vado. Si esto se ve, un sesgo de
          // rasgo o edad está ganándole la partida a una necesidad real.
          if (d.needs.thirst > 0.9 && d.doing?.offer.id !== 'drink'
            && d.doing?.offer.gives.thirst !== undefined) {
            anyThirstIgnored = true;
          }
        }
      }
      for (const d of life.dwellers as readonly Dweller[]) {
        if (d.traits.some((t) => fiery.includes(t))) {
          fieryPersonDays += 1;
          if (hadConflict.has(d.body.id)) fieryConflictDays += 1;
        }
        if (d.traits.some((t) => calm.includes(t))) {
          calmPersonDays += 1;
          if (hadConflict.has(d.body.id)) calmConflictDays += 1;
        }
      }
    }
    }

    sample = {
      byTrait, anyThirstIgnored, fieryConflictDays, fieryPersonDays, calmConflictDays, calmPersonDays,
    };
    return sample;
  }

  // IA-12: pasa al evitar la charla previa al primer destino laboral.
  // Se conserva el umbral 2× y la condición de necesidades urgentes.
  it('el devoto reza al menos el doble que el resto, sin apagar una necesidad urgente', () => {
    const { byTrait, anyThirstIgnored } = habitSample();
    expect(anyThirstIgnored, 'una necesidad urgente no se apaga con otra cosa').toBe(false);

    const devout = byTrait.get('devout');
    expect(devout, 'tiene que haber al menos un devoto en la muestra').toBeDefined();
    if (devout === undefined) return;
    const devoutShare = devout.pray / devout.total;

    let othersPray = 0;
    let othersTotal = 0;
    for (const [trait, row] of byTrait) {
      if (trait === 'devout') continue;
      othersPray += row.pray;
      othersTotal += row.total;
    }
    const othersShare = othersTotal === 0 ? 0 : othersPray / othersTotal;
    expect(devoutShare, `devoto ${(devoutShare * 100).toFixed(1)}% contra el resto ${(othersShare * 100).toFixed(1)}%`)
      .toBeGreaterThan(othersShare * 2);
  });

  it('hot_tempered y spiteful se enzarzan más que kind y generous, pero no todo el rato', () => {
    // «Tensión más rápido, sin peleas constantes» (brief IA-3). Encontronazo
    // es `shove`/`brawl`, nunca `chat`.
    const { fieryConflictDays, fieryPersonDays, calmConflictDays, calmPersonDays } = habitSample();
    expect(fieryPersonDays, 'tiene que haber al menos un hot_tempered/spiteful en la muestra')
      .toBeGreaterThan(0);
    expect(calmPersonDays, 'tiene que haber al menos un kind/generous en la muestra')
      .toBeGreaterThan(0);
    const fieryRate = fieryConflictDays / fieryPersonDays;
    const calmRate = calmPersonDays === 0 ? 0 : calmConflictDays / calmPersonDays;
    expect(fieryRate, `hot_tempered/spiteful ${(fieryRate * 100).toFixed(0)}% de jornadas con encontronazo`)
      .toBeGreaterThan(calmRate);
    // Y «no constantes»: ni siquiera el más propenso se enzarza la mayoría de
    // sus jornadas.
    expect(fieryRate, 'ni el más propenso se pelea la mayoría de sus días').toBeLessThan(0.6);
  });
});
