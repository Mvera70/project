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
import {
  actorsFor, createActorMemory, MAX_ACTORS, VILLAGER_CLIPS, type ClipName,
} from '../../src/render3d/actors';
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

  it('el día escénico se acelera con la raíz de la velocidad, no con ella', () => {
    // Las dos puntas estaban mal y las dos se probaron. Atado a la velocidad, a
    // ×16 la gente cruzaba el valle con las piernas a dieciséis ciclos por
    // segundo. Sin atar, apretar ×16 no cambiaba nada visible y el botón
    // parecía roto: así lo describió quien lo probó.
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
    const base = advanced(1);
    expect(advanced(4)).toBeCloseTo(base * 2, 6);
    expect(advanced(16)).toBeCloseTo(base * 4, 6);
    expect(advanced(0)).toBe(0);
    // Y por debajo de la velocidad del juego, que es lo que evita el borrón.
    expect(advanced(16)).toBeLessThan(base * 16);
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

  it('recorre a lo largo del día las cuatro actividades que se ven', () => {
    // D.6 nombra cinco estados efímeros. Si alguno no aparece nunca, o es que
    // sobra o es que la jornada no llega hasta él.
    //
    // **`home` es la excepción, y desde v3.62 lo es a propósito: estar en casa
    // es estar dentro, y dentro no se ve a nadie.** Hasta entonces se dibujaba
    // en el umbral, y lo que se veía era a los veinte vecinos de pie en su
    // puerta toda la noche. Aquí se comprueba las dos mitades: que las cuatro
    // que se ven salen, y que la quinta **no** sale nunca.
    const state = village(8);
    const seen = new Set<string>();
    for (let step = 0; step < 240; step += 1) {
      for (const actor of actorsFor(state, frameAt((step / 240) * SCENIC_DAY_SECONDS))) {
        seen.add(actor.activity);
      }
    }
    for (const activity of ['leaving', 'walking', 'working', 'returning']) {
      expect(seen.has(activity), `nadie llega a '${activity}'`).toBe(true);
    }
    expect(seen.has('home'), 'a quien está en casa no se le dibuja').toBe(false);
  });

  it('de madrugada no hay un alma en la calle, y al amanecer sale la aldea', () => {
    // La otra mitad de lo mismo, dicha en lo que se ve: el valle se vacía de
    // noche y se llena por la mañana. Y **se vacía poco a poco**, cada uno a su
    // hora (§11.9), porque una aldea que se apaga de golpe parece una campana.
    const state = village(8);
    const at = (phase: number): number =>
      actorsFor(state, frameAt(((phase - 0.28 + 1) % 1) * SCENIC_DAY_SECONDS)).length;

    expect(at(0.45), 'a media tarde la aldea está fuera').toBeGreaterThan(10);
    expect(at(0.92), 'de madrugada no hay nadie fuera').toBe(0);
    expect(at(0.14), 'y por la mañana ha vuelto a salir').toBeGreaterThan(10);
    // Escalonado: entre el pleno y el vacío hay horas con unos pocos fuera.
    const dusk = [0.65, 0.70, 0.75, 0.80].map(at);
    expect(dusk.some((n) => n > 0 && n < 10), `el anochecer se vacía a tirones: ${dusk.join(', ')}`)
      .toBe(true);
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

    // **En cuanto asoma**, que es cuando se sabe de qué puerta ha salido.
    //
    // Antes se le buscaba de madrugada, «que es cuando alguien está en su
    // casa». Desde v3.62 estar en casa es estar dentro y no se dibuja a nadie,
    // así que de madrugada no hay a quién mirar: el primer instante en que
    // aparece es su propio umbral, y ése dice lo mismo y además es lo que el
    // jugador ve.
    // Recorriendo la jornada **desde el amanecer**, que no es el segundo cero:
    // la partida abre a media mañana (v3.46) y con todo el mundo ya en la
    // calle, así que barrer desde ahí se salta justo el momento de salir.
    const firstSeen = (game: GameState): { cell: number } | undefined => {
      for (let step = 0; step < 240; step += 1) {
        const phase = step / 240;
        const seconds = ((phase - 0.28 + 1) % 1) * SCENIC_DAY_SECONDS;
        const at = actorsFor(game, frameAt(seconds)).find((actor) => actor.id === id);
        if (at !== undefined) return at;
      }
      return undefined;
    };
    const wasAt = firstSeen(state);
    const nowAt = firstSeen(moved);
    expect(wasAt, 'sale de casa en algún momento del día').toBeDefined();
    expect(nowAt, 'y desde la casa nueva también').toBeDefined();
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

  it('un clip en el sitio exige un cuerpo en el sitio', () => {
    // El fallo que esto guarda también se vio jugando: al trabajar, el aldeano
    // reproducía el golpe de azada mientras el cuerpo se desplazaba de un lado
    // a otro. Por poco que fuera, se leía como patinar. Ahora cava quieto y da
    // unos pasos al surco siguiente, y esos pasos son el clip de andar.
    const state = village(12);
    const memory = createActorMemory();
    const still = new Set<ClipName>(['work_hoe', 'idle']);
    let checked = 0;
    let worst = 0;
    let previous = new Map<VillagerId, { x: number; z: number; clip: ClipName }>();

    for (let step = 0; step <= 600; step += 1) {
      const seconds = (step / 600) * SCENIC_DAY_SECONDS;
      const now = new Map<VillagerId, { x: number; z: number; clip: ClipName }>();
      for (const actor of actorsFor(state, frameAt(seconds), { memory })) {
        now.set(actor.id, { x: actor.x, z: actor.z, clip: actor.clip });
        const was = previous.get(actor.id);
        if (was === undefined || !still.has(actor.clip) || was.clip !== actor.clip) continue;
        const moved = Math.hypot(actor.x - was.x, actor.z - was.z);
        worst = Math.max(worst, moved);
        checked += 1;
      }
      previous = now;
    }

    expect(checked, 'nadie llega a estar quieto').toBeGreaterThan(200);
    // Una centésima de celda entre dos muestras es tres centímetros: por debajo
    // de lo que un píxel puede enseñar. Antes de esto daba media celda.
    expect(worst, `se desplazó ${worst.toFixed(3)} celdas con un clip quieto`).toBeLessThan(0.01);
  });

  it('quien anda reproduce el clip de andar, trabaje o no', () => {
    // La otra mitad de la misma propiedad: si el cuerpo se mueve, el clip es
    // el de andar aunque la actividad sea trabajar.
    const state = village(12);
    const memory = createActorMemory();
    let stepping = 0;
    let previous = new Map<VillagerId, { x: number; z: number; activity: string; clip: ClipName }>();
    for (let step = 0; step <= 600; step += 1) {
      const seconds = (step / 600) * SCENIC_DAY_SECONDS;
      const now = new Map<VillagerId, { x: number; z: number; activity: string; clip: ClipName }>();
      for (const actor of actorsFor(state, frameAt(seconds), { memory })) {
        now.set(actor.id, { x: actor.x, z: actor.z, activity: actor.activity, clip: actor.clip });
        const was = previous.get(actor.id);
        // Las dos muestras tienen que caer dentro de la misma faena y con el
        // mismo clip. En la frontera, lo que el cuerpo recorrió durante el
        // intervalo fue con el clip anterior, no con el que se ve al final.
        if (was === undefined || actor.activity !== 'working' || was.activity !== 'working') continue;
        if (was.clip !== actor.clip) continue;
        const moved = Math.hypot(actor.x - was.x, actor.z - was.z);
        if (moved > 0.02) {
          expect(actor.clip, `el aldeano ${actor.id} se mueve trabajando`).toBe('walk');
          stepping += 1;
        }
      }
      previous = now;
    }
    expect(stepping, 'nadie cambia de surco en toda la jornada').toBeGreaterThan(20);
  });

  it('no salen más de los que caben, y el seguido va primero', () => {
    const state = village(30);
    const plain = actorsFor(state, frameAt(5));
    expect(plain.length).toBeLessThanOrEqual(MAX_ACTORS);

    // **Se sigue a alguien que esté en la calle a esa hora.** Antes se cogía al
    // último de la lista de vivos, y a media mañana ése puede estar dentro de
    // casa: entonces no sale —seguirle no le saca, y así debe ser— y la prueba
    // acusaba al seguimiento de no poner primero a quien ni siquiera se dibuja.
    // El último de los que **salen** prueba lo mismo sin depender de la hora.
    const last = plain.at(-1);
    expect(last, 'alguien a la vista a quien seguir').toBeDefined();
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

describe('G-10 · la reunión (§11.8)', () => {
  /** Una decisión con `gather` puesta a mano, para no simular veinte años. */
  function summon(state: GameState): GameState {
    const called = structuredClone(state);
    const template = CATALOG.find((candidate) => candidate.options.some(
      (option) => option.visible.some((effect) => effect.k === 'gather'),
    ));
    expect(template).toBeDefined();
    const option = template?.options.find(
      (candidate) => candidate.visible.some((effect) => effect.k === 'gather'),
    );
    called.history.push({
      tick: called.tick, templateId: template?.id ?? '', optionId: option?.id ?? '', cast: {},
    });
    return called;
  }

  it('la aldea se junta donde la decisión dijo', () => {
    // El principio 1 del juego: toda opción de encrucijada cambia algo en
    // pantalla. Veinticinco de las cincuenta y seis convocan a la gente, y
    // hasta ahora en tres dimensiones no pasaba nada.
    const state = village(12);
    const called = summon(state);

    const before = actorsFor(state, frameAt(0), { memory: createActorMemory() });
    const after = actorsFor(called, frameAt(0), { memory: createActorMemory() });
    expect(before.length).toBeGreaterThan(4);
    expect(after.length).toBe(before.length);

    // Durante la jornada todos comparten destino, que es el sitio de la
    // reunión. Sin ella cada uno va a lo suyo.
    const midday = frameAt(SCENIC_DAY_SECONDS * 0.2);
    const scattered = new Set(
      actorsFor(state, midday, { memory: createActorMemory() }).map((actor) => actor.cell),
    );
    const gathered = new Set(
      actorsFor(called, midday, { memory: createActorMemory() }).map((actor) => actor.cell),
    );
    expect(gathered.size).toBeLessThan(scattered.size);
  });

  it('en la reunión se está, no se cava', () => {
    const called = summon(village(12));
    const memory = createActorMemory();
    const actors = actorsFor(called, frameAt(SCENIC_DAY_SECONDS * 0.35), { memory });
    const working = actors.filter((actor) => actor.activity === 'working');
    expect(working.length).toBeGreaterThan(0);
    for (const actor of working) expect(actor.clip).not.toBe('work_hoe');
  });

  it('nadie se teletransporta al juntarse', () => {
    // La reunión se decide al amanecer, como los destinos, y por el mismo
    // motivo: cambiarla a media jornada dejaría a la gente en otro sitio de
    // golpe, que es el defecto que costó dos rondas arreglar.
    const called = summon(village(12));
    const memory = createActorMemory();
    let worst = 0;
    const where = new Map<number, { x: number; z: number }>();
    for (let step = 0; step <= 240; step += 1) {
      const seconds = (step / 240) * SCENIC_DAY_SECONDS;
      for (const actor of actorsFor(called, frameAt(seconds), { memory })) {
        const last = where.get(actor.id);
        if (last !== undefined) worst = Math.max(worst, Math.hypot(actor.x - last.x, actor.z - last.z));
        where.set(actor.id, { x: actor.x, z: actor.z });
      }
    }
    // Medio segundo de día escénico a paso vivo no llega a media celda.
    expect(worst).toBeLessThan(0.5);
  });
});

describe('G-10 · la gente se para a hablar (§11.9)', () => {
  it('a media jornada hay quien está parado con alguien', () => {
    // Una aldea donde cuarenta personas coinciden en un campo y ninguna habla
    // con otra no parece una aldea. Quién se para con quién lo decide
    // `encountersAmong`, el mismo del render 2D, y lo decide la opinión: dos
    // que se aprecian se paran a menudo y dos que se detestan no se paran nunca.
    const state = village(14);
    const memory = createActorMemory();
    let talking = 0;
    for (let step = 0; step <= 80; step += 1) {
      const seconds = (step / 80) * SCENIC_DAY_SECONDS;
      const actors = actorsFor(state, frameAt(seconds), { memory });
      talking = Math.max(talking, actors.filter(
        (actor) => actor.activity === 'working' && actor.clip === 'idle',
      ).length);
    }
    expect(talking).toBeGreaterThan(0);
  });

  it('se acerca andando, no aparece de golpe ni echa a correr', () => {
    // Tres defectos que costó encontrar y que esta sola medida caza.
    //
    // Sin congelar el emparejamiento al amanecer, la conversación cambiaba de
    // sitio ocho veces al día: 5,88 celdas. Repartiendo la ida en una fracción
    // fija de la charla, la gente cruzaba el campo a seis veces su paso. Y
    // midiendo la distancia desde el centro del puesto en vez de desde donde se
    // está cavando, una charla a un palmo se daba por alcanzada al instante y
    // el aldeano aparecía allí: 0,78.
    const state = village(14);
    const memory = createActorMemory();
    let biggest = 0;
    const last = new Map<VillagerId, { x: number; z: number }>();
    // **A ritmo de fotograma**, no a saltos de medio segundo: muestreando cada
    // 0,4 s, andar parece saltar. Un décimo de segundo son seis fotogramas.
    const STEPS = 1200;
    for (let step = 0; step <= STEPS; step += 1) {
      const seconds = (step / STEPS) * SCENIC_DAY_SECONDS;
      for (const actor of actorsFor(state, frameAt(seconds), { memory })) {
        const before = last.get(actor.id);
        if (before !== undefined) {
          biggest = Math.max(biggest, Math.hypot(actor.x - before.x, actor.z - before.z));
        }
        last.set(actor.id, { x: actor.x, z: actor.z });
      }
    }
    // El paso mayor de la jornada es el del camino de ida, que es anterior a
    // esto y es andar continuo. Medido con conversaciones y sin ellas da lo
    // mismo, y ése es el punto: la charla no añade ni un salto.
    //
    // Dos décimas y no una y media desde que hay calle entre las casas: el
    // trecho se anda en la misma fracción del día, así que quien vive más
    // lejos anda más deprisa. Medido en cuatro partidas de catorce años,
    // semillas 7, 11, 23 y 41: 0,173 · 0,164 · 0,141 · 0,140, y los cuatro son
    // el mismo paso sostenido durante decenas de fotogramas seguidos, que es
    // justo lo que un salto no es.
    expect(biggest, `el mayor salto es ${biggest.toFixed(3)} celdas`).toBeLessThan(0.2);
  });

  it('quien está parado está parado', () => {
    // La regla de siempre: un clip en el sitio exige un cuerpo en el sitio.
    const state = village(14);
    const memory = createActorMemory();
    const moved = new Map<VillagerId, { x: number; z: number; clip: string }>();
    let slid = 0;
    for (let step = 0; step <= 600; step += 1) {
      const seconds = (step / 600) * SCENIC_DAY_SECONDS;
      for (const actor of actorsFor(state, frameAt(seconds), { memory })) {
        const before = moved.get(actor.id);
        // Dos fotogramas seguidos **los dos quietos**: el primero de la parada
        // viene de andar, y ese paso lo dio andando.
        if (before !== undefined && actor.clip === 'idle' && before.clip === 'idle') {
          const step2 = Math.hypot(actor.x - before.x, actor.z - before.z);
          if (step2 > 0.004) slid += 1;
        }
        moved.set(actor.id, { x: actor.x, z: actor.z, clip: actor.clip });
      }
    }
    expect(slid).toBe(0);
  });
});

describe('G-10 · nadie atraviesa una pared', () => {
  it('la jornada entera transcurre fuera de las casas', () => {
    // Se veía jugando: la gente cruzaba las casas del vecino como si no
    // estuvieran, y se plantaba dentro del salón de la suya. El motor no evita
    // las huellas, y tiene razón —su camino es el que desgasta la senda— pero
    // dibujar a alguien atravesando una casa es dibujar mal.
    const state = village(14);
    const memory = createActorMemory();
    const walls = state.buildings.filter(
      (building) => building.lostTick === null
        && ['house', 'stone_house', 'granary', 'chapel', 'church', 'smithy', 'mill', 'watchtower']
          .includes(building.kind),
    );
    expect(walls.length).toBeGreaterThan(4);

    let inside = 0;
    let samples = 0;
    for (let step = 0; step <= 400; step += 1) {
      const seconds = (step / 400) * SCENIC_DAY_SECONDS;
      for (const actor of actorsFor(state, frameAt(seconds), { memory })) {
        samples += 1;
        const trespass = walls.some(
          (building) => actor.x > building.x + 0.1 && actor.x < building.x + building.w - 0.1
            && actor.z > building.y + 0.1 && actor.z < building.y + building.h - 0.1,
        );
        if (trespass) inside += 1;
      }
    }
    expect(samples).toBeGreaterThan(1000);
    // **Medido, no deseado**, y en tres tramos. Antes de esta ronda era el 48 %
    // de la jornada: la gente se plantaba dentro de su salón y cruzaba las
    // casas del vecino de camino al campo. Con la puerta y el rodeo bajó al
    // 5 %, y lo que quedaba no era de dibujo: el motor colocaba las casas
    // pegadas, así que había umbrales que daban contra la pared de al lado
    // porque no había otro sitio donde darlos. Con la calle de §7.2 baja al
    // 0,2 – 0,9 % según la partida (semillas 7, 11, 23 y 41), y lo que queda es
    // el carril lateral rozando un muro en una esquina muy cerrada.
    expect(inside / samples, `${inside} de ${samples} dentro de un muro`).toBeLessThan(0.015);
  });
});

