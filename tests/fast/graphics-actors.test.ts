// G-05 · design.md D.5, D.6 — el reloj de presentación y los actores.
//
// Dos capas que hay que probar por separado. El reloj no sabe nada de aldeanos:
// sólo reparte tiempo escénico y decide cuándo un fotograma es discontinuo. Los
// actores no saben nada de tiempo real: reciben un instante y devuelven quién
// está dónde. Lo que las une es que las dos tienen que ser reproducibles, porque
// el jugador cierra la aplicación y vuelve horas después.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isHere } from '@engine/people/demography';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { routesFor } from '@engine/world/paths';
import type { GameState, VillagerId } from '@engine/state';
import type { GraphicsFrame } from '../../src/render3d/contracts';
import {
  createPresentationClock, dayPhase, SCENIC_DAY_SECONDS,
} from '../../src/render3d/presentation-clock';
import { actorsFor, createActorMemory, MAX_ACTORS, VILLAGER_CLIPS } from '../../src/render3d/actors';
import { dayOf } from '../../src/render3d/actors/day';
import { fingerprint } from '../helpers/fingerprint';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** Un fotograma cualquiera, para cuando lo que se prueba no es el reloj. */
function frameAt(seconds: number, over: Partial<GraphicsFrame> = {}): GraphicsFrame {
  return {
    tickFraction: 0.5,
    presentationSeconds: seconds,
    deltaSeconds: 1 / 60,
    speed: 1,
    reducedMotion: false,
    discontinuity: false,
    ...over,
  };
}

describe('G-05 · el reloj de presentación', () => {
  it('en pausa no avanza ni un segundo escénico', () => {
    // D.6: la pausa congela desplazamiento y clips. La cámara y las fichas
    // siguen respondiendo, pero eso no es asunto del reloj.
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 10, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const running = clock.frame({ realMs: 16, tick: 10, tickFraction: 0.1, speed: 1, reducedMotion: false, hidden: false });
    expect(running.deltaSeconds).toBeGreaterThan(0);

    const before = clock.seconds;
    for (let step = 1; step <= 30; step += 1) {
      const paused = clock.frame({
        realMs: 16 + step * 16, tick: 10, tickFraction: 0.1, speed: 0, reducedMotion: false, hidden: false,
      });
      expect(paused.deltaSeconds).toBe(0);
      expect(paused.speed).toBe(0);
    }
    expect(clock.seconds).toBe(before);
  });

  it('el día escénico no se acelera con la velocidad', () => {
    // D.6 lo decide y G-05 lo calibra: a ×16 la semana dura menos de un segundo,
    // y atar el día a la semana haría que los aldeanos corrieran. Lo que se
    // acelera es el mundo, no la gente.
    const advanced = (speed: 0 | 1 | 4 | 16): number => {
      const clock = createPresentationClock();
      clock.frame({ realMs: 0, tick: 0, tickFraction: 0, speed, reducedMotion: false, hidden: false });
      for (let step = 1; step <= 60; step += 1) {
        clock.frame({
          realMs: step * 16, tick: Math.floor(step * speed * 16 / 15_000),
          tickFraction: 0, speed, reducedMotion: false, hidden: false,
        });
      }
      return clock.seconds;
    };
    expect(advanced(4)).toBeCloseTo(advanced(1), 6);
    expect(advanced(16)).toBeCloseTo(advanced(1), 6);
    expect(advanced(0)).toBe(0);
  });

  it('un letargo no se representa: se salta y se avisa', () => {
    // D.6: al volver se reconstruye desde el estado final sin representar el
    // intervalo omitido, y `discontinuity` cancela lo que estuviera en marcha.
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 100, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const steady = clock.frame({ realMs: 16, tick: 100, tickFraction: 0.1, speed: 1, reducedMotion: false, hidden: false });
    expect(steady.discontinuity).toBe(false);

    const woken = clock.frame({
      realMs: 32, tick: 940, tickFraction: 0.1, speed: 1, reducedMotion: false, hidden: false,
    });
    expect(woken.discontinuity).toBe(true);
    // Y ochocientas semanas de golpe no valen ochocientas semanas de animación.
    expect(woken.deltaSeconds).toBeLessThanOrEqual(0.1);
  });

  it('la pestaña oculta suspende, y volver es discontinuo', () => {
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 5, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const away = clock.frame({ realMs: 16, tick: 5, tickFraction: 0, speed: 1, reducedMotion: false, hidden: true });
    expect(away.deltaSeconds).toBe(0);
    expect(away.discontinuity).toBe(true);

    const back = clock.frame({
      realMs: 120_000, tick: 5, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false,
    });
    expect(back.discontinuity).toBe(true);
    expect(back.deltaSeconds).toBe(0);
  });

  it('un fotograma lento avanza lo que puede, no lo que le falta', () => {
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 1, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const slow = clock.frame({ realMs: 400, tick: 1, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    expect(slow.deltaSeconds).toBeCloseTo(0.1, 6);
    expect(slow.discontinuity).toBe(false);
  });

  it('el tiempo escénico sólo crece, y reset lo devuelve a cero', () => {
    const clock = createPresentationClock();
    let last = -1;
    for (let step = 0; step <= 200; step += 1) {
      const frame = clock.frame({
        realMs: step * 16, tick: step, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false,
      });
      expect(frame.presentationSeconds).toBeGreaterThanOrEqual(last);
      last = frame.presentationSeconds;
    }
    clock.reset();
    expect(clock.seconds).toBe(0);
    const fresh = clock.frame({ realMs: 9_999, tick: 3, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    expect(fresh.discontinuity).toBe(true);
    expect(fresh.presentationSeconds).toBe(0);
  });

  it('la fase del día da la vuelta y nunca sale de [0,1)', () => {
    for (const seconds of [0, 1, SCENIC_DAY_SECONDS - 0.001, SCENIC_DAY_SECONDS, 1_000, 86_400]) {
      const phase = dayPhase(seconds);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
    expect(dayPhase(0)).toBeCloseTo(dayPhase(SCENIC_DAY_SECONDS), 9);
  });
});

describe('G-05 · los actores', () => {
  it('dibujar no escribe en el estado ni consume una tirada', () => {
    // §4.3, y la razón por la que nada de esto puede simularse.
    const state = village(6);
    const before = fingerprint(state);
    for (let step = 0; step < 40; step += 1) actorsFor(state, frameAt(step * 0.37));
    expect(fingerprint(state)).toBe(before);
  });

  it('el mismo instante da siempre el mismo reparto', () => {
    const state = village(6);
    const once = actorsFor(state, frameAt(7.5));
    const twice = actorsFor(structuredClone(state), frameAt(7.5));
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it('recorre las cinco actividades a lo largo del día', () => {
    // D.6 nombra cinco estados efímeros. Si alguno no aparece nunca, o es que
    // sobra o es que la jornada no llega hasta él.
    const state = village(8);
    const seen = new Set<string>();
    for (let step = 0; step < 240; step += 1) {
      for (const actor of actorsFor(state, frameAt((step / 240) * SCENIC_DAY_SECONDS))) {
        seen.add(actor.activity);
      }
    }
    for (const activity of ['home', 'leaving', 'walking', 'working', 'returning']) {
      expect(seen.has(activity), `nadie llega a '${activity}'`).toBe(true);
    }
  });

  it('un muerto no sale a trabajar', () => {
    // D.6: retirar actor sin seguir una ruta antigua. Aquí no hay ruta antigua
    // que seguir, porque no se guarda ninguna.
    const state = village(10);
    // Alguien que sale de verdad en escena: el reparto tiene un tope y un
    // orden, y matar a quien no salía no probaría nada.
    const victim = actorsFor(state, frameAt(4))[0];
    expect(victim).toBeDefined();
    const id = victim?.id as VillagerId;

    const dead = structuredClone(state);
    const person = dead.people.villagers.find((candidate) => candidate.id === id);
    expect(person).toBeDefined();
    if (person !== undefined) {
      person.diedTick = dead.tick;
      person.causeOfDeath = 'old_age';
    }
    for (let step = 0; step < 30; step += 1) {
      expect(actorsFor(dead, frameAt(step * 0.5)).some((actor) => actor.id === id)).toBe(false);
    }
  });

  it('quien se muda sale de su casa nueva, no de la vieja', () => {
    const state = village(12);
    const routes = routesFor(state);
    const mover = state.people.villagers.find(
      (person) => isHere(person) && person.homeId !== null && (routes.get(person.id)?.length ?? 0) > 2,
    );
    expect(mover).toBeDefined();
    const id = mover?.id as VillagerId;

    const houses = state.buildings.filter(
      (building) => building.lostTick === null && building.id !== mover?.homeId,
    );
    const other = houses[houses.length - 1];
    expect(other).toBeDefined();

    const moved = structuredClone(state);
    const person = moved.people.villagers.find((candidate) => candidate.id === id);
    if (person !== undefined && other !== undefined) person.homeId = other.id;

    const atHome = frameAt(0);
    const wasAt = actorsFor(state, atHome).find((actor) => actor.id === id);
    const nowAt = actorsFor(moved, atHome).find((actor) => actor.id === id);
    expect(wasAt).toBeDefined();
    expect(nowAt).toBeDefined();
    expect(nowAt?.cell).not.toBe(wasAt?.cell);
  });

  it('sin destino se reposa, no se inventa un taller', () => {
    // D.6 lo dice con esas palabras. La prueba pone a todo el mundo sin ruta.
    const state = village(6);
    const actors = actorsFor(state, frameAt(6), { plan: { routes: new Map() } });
    expect(actors.length).toBeGreaterThan(0);
    for (const actor of actors) {
      expect(actor.activity).toBe('resting');
      expect(actor.clip).toBe('idle');
    }
  });

  it('nadie anda por fuera del mapa ni se aleja de su destino', () => {
    const state = village(15);
    for (let step = 0; step < 120; step += 1) {
      for (const actor of actorsFor(state, frameAt((step / 120) * SCENIC_DAY_SECONDS))) {
        expect(actor.x).toBeGreaterThanOrEqual(0);
        expect(actor.z).toBeGreaterThanOrEqual(0);
        expect(actor.x).toBeLessThanOrEqual(state.map.width);
        expect(actor.z).toBeLessThanOrEqual(state.map.height);
        expect(Number.isFinite(actor.facing)).toBe(true);
      }
    }
  });

  it('las esquinas se giran, no se cortan', () => {
    // Seguir los centros de celda garantiza que el trazo nunca sale de las
    // celdas de la ruta, que ya son transitables. Se comprueba que entre dos
    // instantes seguidos nadie salta más de una celda.
    const state = village(10);
    const width = state.map.width;
    const previous = new Map<VillagerId, { x: number; z: number }>();
    for (let step = 0; step <= 300; step += 1) {
      const seconds = (step / 300) * SCENIC_DAY_SECONDS;
      for (const actor of actorsFor(state, frameAt(seconds))) {
        const was = previous.get(actor.id);
        if (was !== undefined) {
          const jump = Math.hypot(actor.x - was.x, actor.z - was.z);
          expect(jump, `el aldeano ${actor.id} salta ${jump.toFixed(2)} celdas`).toBeLessThan(1.5);
        }
        previous.set(actor.id, { x: actor.x, z: actor.z });
        expect(actor.cell).toBeGreaterThanOrEqual(0);
        expect(actor.cell).toBeLessThan(width * state.map.height);
      }
    }
  });

  it('el paso lo marca el suelo recorrido, no el reloj', () => {
    // Es lo que impide que los pies patinen: el clip avanza un ciclo por cada
    // zancada de suelo, así que la velocidad de reproducción sale sola y no hay
    // ninguna constante que casar a mano.
    const state = village(10);
    const stride = VILLAGER_CLIPS.walk.strideLength ?? 1;
    const seconds = VILLAGER_CLIPS.walk.seconds;
    let checked = 0;
    let last: { id: VillagerId; travelled: number; clipSeconds: number } | null = null;
    for (let step = 0; step <= 400; step += 1) {
      const actor = actorsFor(state, frameAt((step / 400) * SCENIC_DAY_SECONDS))
        .find((candidate) => candidate.clip === 'walk');
      if (actor === undefined) { last = null; continue; }
      if (last !== null && last.id === actor.id) {
        const ground = actor.travelled - last.travelled;
        const advanced = (actor.clipSeconds - last.clipSeconds + seconds) % seconds;
        const expected = (ground / stride) * seconds;
        if (ground > 0.01 && expected < seconds * 0.5) {
          expect(advanced, `avanzó ${ground.toFixed(3)} celdas`).toBeCloseTo(expected, 6);
          checked += 1;
        }
      }
      last = { id: actor.id, travelled: actor.travelled, clipSeconds: actor.clipSeconds };
    }
    expect(checked, 'no se llegó a comprobar ningún tramo andando').toBeGreaterThan(20);
  });

  it('y el suelo recorrido es el que pisa de verdad', () => {
    // La comprobación anterior es exacta porque las dos magnitudes salen de la
    // misma cuenta. Esta las separa: lo que el actor dice haber recorrido tiene
    // que parecerse a lo que se ha movido por el mundo.
    //
    // Se mide sobre la jornada entera de una persona y no entre dos muestras.
    // Instante a instante las dos cosas discrepan por geometría y no por error:
    // en una esquina la cuerda es más corta que el arco, y el carril lateral
    // añade movimiento que no es avance. Sumadas a lo largo del viaje esas dos
    // se cancelan, y lo que queda es si el reparto de la ruta está bien. Con el
    // reparto por índice de celda que tenía esto al principio, aquí salía un
    // desvío del treinta por ciento.
    const state = village(10);
    interface Leg { chords: number; ground: number; x: number; z: number; travelled: number }
    const legs = new Map<VillagerId, Leg>();
    const done: Leg[] = [];
    for (let step = 0; step <= 900; step += 1) {
      const seconds = (step / 900) * SCENIC_DAY_SECONDS;
      const walking = new Set<VillagerId>();
      for (const actor of actorsFor(state, frameAt(seconds))) {
        if (actor.activity !== 'walking') continue;
        walking.add(actor.id);
        const leg = legs.get(actor.id);
        if (leg === undefined) {
          legs.set(actor.id, { chords: 0, ground: 0, x: actor.x, z: actor.z, travelled: actor.travelled });
          continue;
        }
        leg.chords += Math.hypot(actor.x - leg.x, actor.z - leg.z);
        leg.ground += actor.travelled - leg.travelled;
        leg.x = actor.x;
        leg.z = actor.z;
        leg.travelled = actor.travelled;
      }
      for (const [id, leg] of [...legs]) {
        if (walking.has(id)) continue;
        done.push(leg);
        legs.delete(id);
      }
    }

    const measured = [...done, ...legs.values()].filter((leg) => leg.ground > 2);
    expect(measured.length, 'ningún viaje lo bastante largo para medirlo').toBeGreaterThan(3);
    // El límite es de una sola cara y no es cero. Lo que el actor recorre por el
    // mundo es siempre algo más que el largo de su ruta, porque el carril lo
    // aparta del eje y al girar una esquina ese punto desviado barre un arco.
    // Ese exceso está acotado por la anchura del carril multiplicada por el
    // giro total del camino, y en este valle se queda por debajo del quince por
    // ciento. Lo que la prueba caza es un reparto de ruta equivocado, que da
    // diferencias de un tercio y puede darlas en el otro sentido: con el
    // reparto por índice de celda que tenía esto al principio, el aldeano
    // aceleraba en las diagonales.
    for (const leg of measured) {
      const excess = (leg.chords - leg.ground) / leg.ground;
      const label = `${(excess * 100).toFixed(1)} % de exceso sobre ${leg.ground.toFixed(2)} celdas`;
      // Dos cosas separan las dos cifras y las dos son geometría: la cuerda
      // entre dos muestras corta las esquinas, y el carril barre un arco al
      // girarlas. Ninguna llega al quince por ciento. Un reparto de ruta
      // equivocado da un tercio, y puede darlo en cualquier sentido.
      expect(excess, label).toBeGreaterThan(-0.06);
      expect(excess, label).toBeLessThan(0.15);
    }
  });

  it('correr las semanas no teletransporta a nadie', () => {
    // El fallo que esto guarda se vio jugando, no en una prueba: a x16 la gente
    // parpadeaba por el valle. La jornada estaba sorteada con el tick, y un tick
    // dura quince segundos reales mientras que un dia escenico dura ciento
    // veinte, asi que el plan de cada uno se rehacia ocho veces por dia a x1 y
    // ciento veintiocho a x16. Cada rehecho era un salto.
    //
    // A x16 pasa cerca de un tick por segundo escenico. Se simula eso: avanzar
    // la semana mientras el dia escenico corre, y mirar si alguien salta.
    const state = village(10);
    const memory = createActorMemory();
    let biggest = 0;
    let previous = new Map<VillagerId, { x: number; z: number }>();
    for (let step = 0; step <= 240; step += 1) {
      const seconds = (step / 240) * SCENIC_DAY_SECONDS;
      // Una semana por segundo escenico, que es el ritmo de x16.
      const weeks = Math.floor(seconds);
      while (state.tick < 480 + weeks) run(state, 1, 'prudent', CATALOG);

      const now = new Map<VillagerId, { x: number; z: number }>();
      for (const actor of actorsFor(state, frameAt(seconds), { memory })) {
        now.set(actor.id, { x: actor.x, z: actor.z });
        const was = previous.get(actor.id);
        if (was !== undefined) {
          biggest = Math.max(biggest, Math.hypot(actor.x - was.x, actor.z - was.z));
        }
      }
      previous = now;
    }
    // Medio segundo escenico de camino a paso vivo es una celda escasa. Lo que
    // esto tiene que cazar es un salto de valle a valle, no un paso largo.
    expect(biggest, `el mayor salto es ${biggest.toFixed(2)} celdas`).toBeLessThan(2);
  });

  it('la jornada de alguien no cambia por dentro del dia', () => {
    // La propiedad de la que cuelga lo anterior: dentro de un mismo dia
    // escenico, el plan es el mismo aunque pasen semanas.
    const person = village(10).people.villagers[0];
    expect(person).toBeDefined();
    if (person === undefined) return;
    const same = dayOf(person, 500, 3);
    for (const tick of [500, 501, 520, 900]) {
      expect(dayOf(person, tick, 3).leave).toBe(same.leave);
      expect(dayOf(person, tick, 3).arrive).toBe(same.arrive);
    }
    // Y cambia al amanecer siguiente, que es lo que le da variedad.
    expect(dayOf(person, 500, 4).leave).not.toBe(same.leave);
  });

  it('no salen más de los que caben, y el seguido va primero', () => {
    const state = village(30);
    const plain = actorsFor(state, frameAt(5));
    expect(plain.length).toBeLessThanOrEqual(MAX_ACTORS);

    const last = state.people.villagers.filter(isHere).at(-1);
    expect(last).toBeDefined();
    const tracked = actorsFor(state, frameAt(5), { tracked: last?.id ?? null });
    expect(tracked[0]?.id).toBe(last?.id);
  });

  it('la tabla de clips es la del catálogo, no una copia que se ha ido de él', () => {
    // G-04 midió estos números sobre el GLB exportado. Aquí hay una copia
    // porque el manifiesto de recursos es de G-06; una copia que nadie
    // comprueba es una copia que se separa en silencio.
    const catalog = JSON.parse(readFileSync(
      resolve(import.meta.dirname, '..', '..', 'art', 'catalog.json'), 'utf8',
    )) as { assets: Array<{ id: string; motion: Array<{ name: string; seconds: number; loop: boolean; strideLength: number | null }> }> };
    const villager = catalog.assets.find((asset) => asset.id === 'villager');
    expect(villager).toBeDefined();

    for (const motion of villager?.motion ?? []) {
      const mine = VILLAGER_CLIPS[motion.name as keyof typeof VILLAGER_CLIPS];
      expect(mine, `falta el clip '${motion.name}'`).toBeDefined();
      expect(mine.seconds).toBeCloseTo(motion.seconds, 6);
      expect(mine.loop).toBe(motion.loop);
      expect(mine.strideLength).toBe(motion.strideLength);
    }
    expect(Object.keys(VILLAGER_CLIPS).length).toBe(villager?.motion.length);
  });
});
