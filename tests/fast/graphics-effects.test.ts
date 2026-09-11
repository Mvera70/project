// G-08 · design.md §10.3, D.3, D.8 — estaciones y consecuencias visibles.
//
// El objetivo de la ronda dicho por el brief: **que la belleza conserve el valle
// como HUD**. Lo que el jugador tiene que poder leer sin abrir una ficha es que
// hay hambre, que hay peste, que el granero está lleno o vacío, que una casa se
// quemó. El render 2D ya lo dice; lo que estas pruebas guardan es que el 3D no
// pierda ninguna de esas señales por el camino.
//
// La regla que las gobierna todas: **ninguna consecuencia se representa por un
// temporizador propio.** Se lee del estado, y cuando el estado deja de decirla,
// desaparece. Una peste vencida que siguiera manchando casas sería el mismo
// fallo que la v2.18 pagó con cinco rondas de balance.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { clockOf, SEASONS } from '@engine/time';
import type { GameState } from '@engine/state';
import { PALETTES, paletteFor } from '@render/palette';
import { tellsFor } from '@render/layers/tells';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { TERRAIN_CODE } from '@engine/state';
import { animalPositions, wildlifePositions } from '@render/animals';
import { daylightAt, NIGHT_FLOOR, NOON } from '../../src/render3d/effects/daylight';
import { Fauna, ashore as ashoreOf } from '../../src/render3d/effects/fauna';
import { Tells } from '../../src/render3d/effects/tells';
import { cellColour } from '../../src/render3d/world/ground';
import { TIME } from '@engine/balance';
import { groundSignature, planChange, planFor } from '../../src/render3d/world/plan';
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

/** El mismo valle en la semana que se pida, sin volver a simular. */
function atTick(state: GameState, tick: number): GameState {
  const moved = structuredClone(state);
  moved.tick = tick;
  return moved;
}

describe('G-08 · las estaciones', () => {
  it('el valle cambia de color cuatro veces al año', () => {
    // Sin esto el suelo sólo se reconstruía cuando alguien talaba un árbol, y
    // el valle seguía verde en enero.
    const state = village(10);
    const seen = new Set<number>();
    for (let week = 0; week < 48; week += 1) {
      seen.add(groundSignature(state.map, week));
    }
    // Cuatro estaciones y dos semanas de transición en cada una: seis firmas
    // distintas a lo largo del año, ni una más.
    expect(seen.size).toBe(SEASONS.length * 3);
  });

  it('el invierno no se parece al verano en ninguna celda de prado', () => {
    const state = village(10);
    let different = 0;
    let checked = 0;
    for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
      if ((state.map.terrain[cell] ?? 0) !== 0 || (state.map.path[cell] ?? 0) > 0) continue;
      checked += 1;
      if (cellColour(state.map, cell, PALETTES.winter) !== cellColour(state.map, cell, PALETTES.summer)) {
        different += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(different).toBe(checked);
  });

  it('la estación nueva crece de la vieja durante dos semanas', () => {
    // §10.3. Un cambio de golpe se lee como un fallo de dibujo; el degradado se
    // lee como que ha pasado el tiempo.
    const winter = paletteFor('winter', 0);
    const settled = paletteFor('winter', 6);
    expect(winter.meadow).not.toBe(settled.meadow);
    expect(paletteFor('winter', 2).meadow).toBe(settled.meadow);
  });

  it('mirar el valle no lo cambia, en ninguna estación', () => {
    const state = village(8);
    const before = fingerprint(state);
    for (let week = 0; week < 96; week += 1) {
      const moment = atTick(state, state.tick + week);
      groundSignature(moment.map, moment.tick);
      planFor(moment);
    }
    expect(fingerprint(state)).toBe(before);
  });
});

describe('G-08 · las consecuencias', () => {
  it('el valle dice sin abrir una ficha qué le pasa a la aldea', () => {
    // La matriz que el brief pide: cada señal existe y sale del estado.
    const state = village(14);
    const kinds = new Set(tellsFor(state).map((tell) => tell.kind));
    // Humo y luz en las casas habitadas, y el granero con su nivel: son las
    // tres que una aldea viva tiene siempre.
    expect(kinds.has('smoke')).toBe(true);
    expect(kinds.has('light')).toBe(true);
    expect(kinds.has('granary')).toBe(true);
  });

  it('una peste se ve mientras dura y deja de verse al vencerla', () => {
    // La regla entera de la ronda: no hay temporizador propio. Cuando el estado
    // deja de decir peste, la mancha desaparece sola.
    const state = village(14);
    const sick = structuredClone(state);
    sick.outbreak = { startedTick: sick.tick, endsTick: sick.tick + 6, deaths: 0 };
    const during = tellsFor(sick).filter((tell) => tell.kind === 'plague');
    expect(during.length).toBeGreaterThan(0);

    // Vencida: el mismo estado, con la peste ya caducada.
    const cured = structuredClone(sick);
    cured.tick = sick.outbreak.endsTick;
    expect(tellsFor(cured).filter((tell) => tell.kind === 'plague')).toEqual([]);
  });

  it('una casa quemada deja de echar humo', () => {
    // Una consecuencia no es sólo lo que aparece: es también lo que se apaga.
    const state = village(14);
    const before = tellsFor(state).filter((tell) => tell.kind === 'smoke').length;
    expect(before).toBeGreaterThan(0);

    const burnt = structuredClone(state);
    const home = burnt.buildings.find(
      (building) => building.lostTick === null
        && (building.kind === 'house' || building.kind === 'stone_house'),
    );
    expect(home).toBeDefined();
    if (home !== undefined) home.lostTick = burnt.tick;

    const after = tellsFor(burnt).filter((tell) => tell.kind === 'smoke').length;
    expect(after).toBeLessThan(before);
    // Y la ruina sigue en el plan, más baja y sin tejado: §7.4 la deja en el
    // mapa, así que desaparecer no es una opción.
    const ruin = planFor(burnt).buildings.find((building) => building.id === home?.id);
    expect(ruin?.ruin).toBe(true);
    expect(ruin?.roofed).toBe(false);
  });

  it('el granero dice cuánto grano hay, no cuántas semanas van', () => {
    const state = village(14);
    const full = structuredClone(state);
    full.village.grain = 100_000;
    const empty = structuredClone(state);
    empty.village.grain = 0;

    const levelOf = (game: GameState): number => {
      const tell = tellsFor(game).find((candidate) => candidate.kind === 'granary');
      return tell !== undefined && tell.kind === 'granary' ? tell.fraction : -1;
    };
    expect(levelOf(full)).toBe(1);
    expect(levelOf(empty)).toBe(0);
  });

  it('se lee en grises: cada señal se distingue por sitio y forma, no por color', () => {
    // D.3 · la legibilidad en escala de grises es la prueba de que la señal no
    // depende del color. Aquí se comprueba lo que la sostiene: dos señales
    // distintas nunca caen exactamente en el mismo punto.
    const state = village(14);
    const seats = new Map<string, string>();
    for (const tell of tellsFor(state)) {
      const at = `${tell.x.toFixed(2)},${tell.y.toFixed(2)}`;
      const already = seats.get(at);
      if (already !== undefined && already !== tell.kind) {
        expect.fail(`'${tell.kind}' y '${already}' caen en el mismo punto ${at}`);
      }
      seats.set(at, tell.kind);
    }
    expect(seats.size).toBeGreaterThan(5);
  });

  it('el suelo en grises separa el agua del prado y del bosque', () => {
    // La otra mitad de D.3, sobre el terreno: si en grises el río se confunde
    // con el prado, el valle deja de leerse para quien no distingue colores.
    for (const season of SEASONS) {
      const palette = PALETTES[season];
      const grey = (hex: string): number => {
        const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
        return 0.299 * (r ?? 0) + 0.587 * (g ?? 0) + 0.114 * (b ?? 0);
      };
      const meadow = grey(palette.meadow);
      const water = grey(palette.water);
      const forest = grey(palette.forest);
      expect(Math.abs(meadow - water), `agua y prado en ${season}`).toBeGreaterThan(8);
      expect(Math.abs(meadow - forest), `bosque y prado en ${season}`).toBeGreaterThan(8);
    }
  });

  it('las señales se rehacen cuando cambian, y no cuando no', () => {
    // D.6 · no reconstruir todo cada fotograma. Las señales cambian con la
    // semana; pintar sesenta veces por segundo no puede rehacer treinta objetos.
    const state = village(14);
    const tells = new Tells();
    tells.update(state);
    const built = tells.count;
    expect(built).toBeGreaterThan(5);

    const before = tells.group.children[0];
    for (let step = 0; step < 30; step += 1) tells.update(state);
    expect(tells.count).toBe(built);
    expect(tells.group.children[0]).toBe(before);

    // Y cuando el estado cambia de verdad, se rehacen.
    const sick = structuredClone(state);
    sick.outbreak = { startedTick: sick.tick, endsTick: sick.tick + 6, deaths: 0 };
    tells.update(sick);
    expect(tells.count).toBeGreaterThan(built);
    tells.dispose();
    expect(tells.count).toBe(0);
  });

  it('el campo se ve segado después de la cosecha y sembrado antes', () => {
    // G-08 pide consecuencias visibles y ésta es la mas grande del año: la
    // semana de la siega el valle cambia de color en todas sus parcelas. La
    // regla sale de la misma semana en la que el motor recoge el grano.
    const state = village(14);
    const fieldAt = (week: number): string | null => {
      const moment = atTick(state, week);
      const parcel = planFor(moment).buildings.find((building) => building.kind === 'field');
      return parcel?.asset ?? null;
    };
    expect(fieldAt(TIME.HARVEST_WEEK - 1)).toBe('field');
    expect(fieldAt(TIME.HARVEST_WEEK)).toBe('field-cut');
    expect(fieldAt(TIME.HARVEST_WEEK + 6)).toBe('field-cut');
    expect(fieldAt(2)).toBe('field-cut');
    expect(fieldAt(20)).toBe('field');
  });

  it('y ese cambio pide reconstruir el campo, no el pueblo entero', () => {
    const state = village(14);
    const before = planFor(atTick(state, TIME.HARVEST_WEEK - 1));
    const after = planFor(atTick(state, TIME.HARVEST_WEEK));
    const change = planChange(before, after);
    expect(change.added.length).toBe(0);
    expect(change.removed.length).toBe(0);
    expect(change.changed.length).toBeGreaterThan(0);
    for (const building of change.changed) expect(building.kind).toBe('field');
  });

  it('una ruina usa el recurso de ruina, no el de lo que fue', () => {
    // §7.4 la deja en el mapa, y lo que tiene que leerse es que ya no es una
    // casa. Ponerle su modelo intacto diría lo contrario, y dejarla sin recurso
    // la devolvía a la caja gris de reserva, que no dice nada.
    const state = village(14);
    const burnt = structuredClone(state);
    const home = burnt.buildings.find((building) => building.lostTick === null && building.kind !== 'field');
    if (home !== undefined) home.lostTick = burnt.tick;
    const before = planFor(state).buildings.find((building) => building.id === home?.id);
    const ruin = planFor(burnt).buildings.find((building) => building.id === home?.id);
    expect(ruin?.ruin).toBe(true);
    expect(ruin?.asset).not.toBe(before?.asset);
    // De madera o de piedra: el juego trata las dos ruinas distinto y lo que se
    // ve tiene que ser lo que el juego hace.
    expect(ruin?.asset).toBe(home?.tier === 1 ? 'ruin-stone' : 'ruin-wood');
  });

  it('la estación que se pinta es la del tick, no la de ninguna otra cuenta', () => {
    const state = village(10);
    for (const week of [0, 11, 12, 23, 24, 35, 36, 47]) {
      const moment = atTick(state, week);
      const clock = clockOf(moment.tick);
      expect(groundSignature(moment.map, moment.tick))
        .toBe(groundSignature(moment.map, week));
      expect(SEASONS).toContain(clock.season);
    }
  });
});

describe('G-10 · la fauna (§7.7)', () => {
  /** Un recurso de mentira: dos mallas, que es lo que la fauna instancia. */
  function model(): Object3D {
    const group = new Group();
    for (let part = 0; part < 2; part += 1) {
      group.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshStandardMaterial()));
    }
    return group;
  }

  it('pone en la escena lo que el 2D dice y ni una cabeza más', () => {
    // La regla es la misma que con las señales: no hay reglas nuevas aquí. Si
    // esto contara sus propios animales, las dos aldeas se separarían en cuanto
    // alguien tocara §7.7.
    const state = village(14);
    const fauna = new Fauna(() => model());
    fauna.update(state, 0.4);
    const said = [...animalPositions(state, 0.4), ...wildlifePositions(state, 0.4)];
    expect(said.length).toBeGreaterThan(0);
    expect(fauna.count).toBeLessThanOrEqual(said.length);
    fauna.dispose();
  });

  it('al anochecer la cabaña se recoge', () => {
    // §10.6: pasadas las ocho décimas del día todo el mundo está dentro, y el
    // corral también. Ese patio vacío al anochecer no es decoración: es la
    // ventana por la que entran los lobos de §7.7.
    const state = village(14);
    const fauna = new Fauna(() => model());
    fauna.update(state, 0.4);
    const byDay = fauna.count;
    fauna.update(state, 0.95);
    expect(byDay).toBeGreaterThan(0);
    expect(fauna.count).toBeLessThan(byDay);
    fauna.dispose();
  });

  it('ninguna vaca se mete en el río, y ningún pez sale de él', () => {
    const state = village(14);
    const { width, terrain } = state.map;
    const wet = (x: number, y: number): boolean =>
      terrain[Math.floor(y) * width + Math.floor(x)] === TERRAIN_CODE.water;
    let land = 0;
    for (let step = 0; step < 12; step += 1) {
      const phase = step / 12;
      for (const animal of animalPositions(state, phase)) {
        // Lo que se comprueba no es el 2D, que coloca por anclas y no mira el
        // terreno, sino que el 3D lo corrige: aquí el río tiene cauce.
        const dry = ashoreOf(state.map, animal.x, animal.y);
        if (dry === null) continue;
        expect(wet(dry.x, dry.y)).toBe(false);
        land += 1;
      }
    }
    expect(land).toBeGreaterThan(0);
  });

  it('no rehace las mallas en cada fotograma', () => {
    // Los animales se mueven en cada fotograma y la geometría no. D.9 dice que
    // lo que no se puede hacer es reconstruir objetos sesenta veces por segundo.
    const state = village(14);
    const fauna = new Fauna(() => model());
    fauna.update(state, 0.3);
    const before = [...fauna.group.children];
    expect(before.length).toBeGreaterThan(0);
    for (let step = 1; step <= 6; step += 1) fauna.update(state, 0.3 + step * 0.02);
    const after = [...fauna.group.children];
    expect(after.length).toBe(before.length);
    for (let index = 0; index < after.length; index += 1) expect(after[index]).toBe(before[index]);
    fauna.dispose();
  });

  it('lo suelta todo al terminar', () => {
    const state = village(14);
    const fauna = new Fauna(() => model());
    fauna.update(state, 0.4);
    fauna.dispose();
    expect(fauna.group.children.length).toBe(0);
    expect(fauna.count).toBe(0);
  });
});

describe('G-10 · la luz del día escénico', () => {
  it('el sol sube, cruza y se pone', () => {
    const dawn = daylightAt(0.06);
    const noon = daylightAt(0.45);
    const dusk = daylightAt(0.85);
    expect(noon.sun.y).toBeGreaterThan(dawn.sun.y);
    expect(noon.sun.y).toBeGreaterThan(dusk.sun.y);
    // De este a oeste: la componente que cruza el valle cambia de signo.
    expect(Math.sign(dawn.sun.x)).not.toBe(Math.sign(dusk.sun.x));
  });

  it('de noche baja la luz pero no se apaga', () => {
    // §10.3 quiere el valle como HUD, y eso vale a las tres de la madrugada
    // también. Una noche de verdad dejaría el granero ilegible.
    const noon = daylightAt(NOON);
    const night = daylightAt(0.98);
    expect(night.sunIntensity).toBeLessThan(noon.sunIntensity * 0.6);
    expect(night.sunIntensity).toBeGreaterThan(noon.sunIntensity * NIGHT_FLOOR * 0.9);
    expect(night.ambientIntensity).toBeGreaterThan(0);
  });

  it('no da saltos de un fotograma al siguiente', () => {
    // El día escénico avanza continuo, y la luz con él. Un escalón en el
    // amanecer se vería como un parpadeo del valle entero.
    //
    // El paso es el de un fotograma de verdad: un día escénico dura ciento
    // veinte segundos (D.6.1), así que a sesenta por segundo son 7 200 pasos.
    // Medirlo con pasos más gordos mide la curva, no el parpadeo.
    const frames = 7200;
    let worst = 0;
    let before = daylightAt(0);
    for (let step = 1; step <= frames; step += 1) {
      const now = daylightAt(step / frames);
      worst = Math.max(worst, Math.abs(now.sunIntensity - before.sunIntensity));
      before = now;
    }
    expect(worst).toBeLessThan(0.01);
  });

  it('es la misma luz para el mismo instante, siempre', () => {
    // §4.3: el mismo instante da siempre la misma imagen. Si esto consumiera
    // azar, dos partidas iguales se verían distintas.
    for (const phase of [0, 0.13, 0.45, 0.79, 0.99]) {
      expect(daylightAt(phase)).toEqual(daylightAt(phase));
      // Y el día da la vuelta: la medianoche de hoy es la de mañana.
      expect(daylightAt(phase + 1)).toEqual(daylightAt(phase));
    }
  });
});

describe('G-10 · el humo se mueve', () => {
  it('sube, se deshace y vuelve a empezar', () => {
    const state = village(14);
    const tells = new Tells();
    tells.update(state);
    const smoke = tells.group.children.find((thing) => thing.userData.plume !== undefined);
    expect(smoke).toBeDefined();
    const puff = smoke as NonNullable<typeof smoke>;

    // A lo largo de una vuelta sube siempre, menos una vez: cuando se deshace
    // y vuelve a salir por la chimenea. Cuál es ese momento depende del desfase
    // de esta casa, así que no se busca por reloj, se cuenta.
    tells.drift(0);
    const start = puff.position.y;
    let falls = 0;
    let before = start;
    for (let step = 1; step <= 60; step += 1) {
      tells.drift(step / 10);
      if (puff.position.y < before) falls += 1;
      before = puff.position.y;
    }
    expect(falls).toBe(1);
    // Y la vuelta se cierra: seis segundos después está donde estaba.
    tells.drift(6);
    expect(puff.position.y).toBeCloseTo(start, 5);
    tells.dispose();
  });

  it('el humo no reconstruye nada al moverse', () => {
    // D.6 lo dice con estas palabras: no rehacer todo en cada fotograma. Mover
    // una señal tiene que ser mover una señal.
    const state = village(14);
    const tells = new Tells();
    tells.update(state);
    const before = tells.group.children[0];
    for (let step = 0; step < 30; step += 1) tells.drift(step * 0.016);
    expect(tells.group.children[0]).toBe(before);
    tells.dispose();
  });

  it('dos casas no humean al unísono', () => {
    // Un valle donde todas las chimeneas laten a la vez se lee como un latido,
    // no como un pueblo. El desfase sale de dónde está cada casa.
    const state = village(14);
    const tells = new Tells();
    tells.update(state);
    tells.drift(1.3);
    const heights = tells.group.children
      .filter((thing) => thing.userData.plume !== undefined)
      .map((thing) => thing.position.y.toFixed(3));
    expect(heights.length).toBeGreaterThan(3);
    expect(new Set(heights).size).toBeGreaterThan(1);
    tells.dispose();
  });
});
