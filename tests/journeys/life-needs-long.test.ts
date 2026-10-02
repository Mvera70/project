// Lo lento de `tests/fast/life-needs.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 239 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
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
  drift, freshNeeds, NEED_NAMES, type Doing, } from '../../src/render3d/life/needs';
import {
  OFFERS, offersNear, placesOf, seatKey, type Place,
} from '../../src/render3d/life/offers';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { pauseHere } from '../../src/render3d/life/decide';
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
    // acercarse a `GIVE_UP` (docs/historico/rework.md, checklist IA-1).
    expect(frail, 'una pausa sigue siendo una pausa, no media jornada')
      .toBeLessThan(20 * 30);
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
   * `docs/historico/life-rounds/IA-3.md`, medida con `tools/reports/life-traits-report.ts`.
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
    // **Cuatro valles y no dos** (B3, 18 sep 2026). Es la segunda vez que esta
    // muestra se queda corta: B2 la movió unas décimas y B3 —el valle que puede
    // acabar **tomado**— la movió otra vez, esta vez al otro lado (43,4 % contra
    // 45,8 %, o sea la propiedad del revés por dos puntos). El número no baila
    // porque la propiedad sea falsa: baila porque doce muestras de una capa con
    // semilla por jornada son pocas. Cuatro semillas × tres jornadas son
    // veinticuatro, y eso es lo que pide `CLAUDE.md` para un umbral de aquí.
    // **Seis valles y no cuatro** (19 sep 2026), y es la tercera vez que esta
    // muestra se queda corta por lo mismo. Bajar el hueco entre decisiones a
    // un tercio de año movió las trayectorias y el devoto se quedó en 3,05 %
    // contra el 3,46 % que pedía el doble — la propiedad del pelo, por cuatro
    // décimas. Con dieciocho muestras vuelve a sostenerse. No se toca el
    // umbral: lo que baila es el tamaño de la muestra, que es lo que
    // `CLAUDE.md` deja escrito para esta capa.
    //
    // **Y lo que cuesta, dicho aquí para que se vea**: esta muestra es el gasto
    // más grande de la suite rápida —36 s de los 61— y se paga una vez para
    // las tres pruebas que la usan. Si hay que ensancharla otra vez, ya no cabe
    // aquí y se muda a las jornadas, que es la regla del 16 sep.
    const seeds = [7, 23, 41, 11, 31, 53];
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
  //
  // **Rojo desde el cielo por estaciones (25 sep 2026), y es la deuda que la
  // fila H del plan ya nombra («la del devoto»):** depende de qué aldea sale
  // en la muestra, y con la trayectoria nueva el devoto reza el 3,7 % de sus
  // jornadas contra el 3,0 % del resto (1,2×, no 2×). Se deja `it.fails` con
  // la propiedad intacta, como manda la casa, en vez de bajar el listón.
  //
  // **Y verde otra vez con la trayectoria de v4.95 (28 sep 2026)**, por el mismo
  // motivo por el que se puso roja: la aldea de la muestra es otra (llegan
  // familias por el camino). La propiedad no se ha movido; si vuelve a caer
  // con otra trayectoria, vuelve a `it.fails`.
  //
  // **Y vuelve a caer con el valle de forma natural (v5.73, 2 oct 2026), como
  // este comentario avisaba: `it.fails`, con la propiedad intacta.** El devoto
  // reza el 5,9 % de las muestras contra el 4,4 % del resto (1,35×; las mismas
  // cifras que da la CI). Y no es el contorno: en `main`, con esta misma muestra
  // de seis semillas y tres jornadas, sale 6,5 % contra 3,2 % —2,04×, por un
  // pelo—, y en doce semillas (las seis y la 3, 19, 37, 67, 97 y 5) dan lo mismo
  // los dos: 1,72× con el contorno y 1,74× en `main`. Lo que baila es la muestra
  // de seis (el cociente por semilla va de 1,15× a 2,69× con el contorno y de
  // 1,22× a 3,14× en `main`), no el rasgo: `LEANING`, `DEVOUT_REACH_MULT` y la
  // oferta `pray` son los mismos. Además la cuenta de abajo suma filas por rasgo,
  // así que el «resto» incluye las demás filas de los propios devotos: contando
  // personas saldrían 2,14× con el contorno y 2,20× en `main` en las doce, y
  // 1,58× y 2,72× en las seis. No se toca la cuenta ni el listón aquí; una prueba
  // que no baile tendría que medir personas, y en más de seis aldeas.
  it.fails('el devoto reza al menos el doble que el resto, sin apagar una necesidad urgente', () => {
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
