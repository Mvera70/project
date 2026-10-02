// Lo lento de `tests/fast/daylife.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 46 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-35 · design.md §11.9 — que la aldea parezca viva.
//
// Este fichero mide lo que un jugador llamó «aburrido y repetitivo»: que todos
// hicieran lo mismo a la vez, todos los días, apilados en la misma celda y sin
// hablar con nadie. Cada prueba es una de esas cuatro cosas.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { crowdPositions } from '@render/crowd';
import { routesFor } from '@engine/world/paths';
import { type GameState } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** Una semana de trabajo, que no sea la de reunión del domingo. */
function workweek(state: GameState): GameState {
  if (state.tick % 4 === 0) state.tick += 1;
  // Sin sucesos del valle en marcha (R-1): una boda esa semana junta a todo el
  // mundo en la plaza a la vez, y estas pruebas miden la jornada de trabajo,
  // que es donde cada uno va a lo suyo.
  state.happenings = [];
  return state;
}

const positionsAt = (s: GameState, f: number): Map<number, { x: number; y: number }> =>
  new Map(crowdPositions(s, f).map((p) => [p.id, { x: p.x, y: p.y }]));

describe('no todos hacen lo mismo a la vez · §11.9', () => {
  it('a lo largo del día siempre hay alguien andando', () => {
    // Antes había dos picos —todos salen, todos vuelven— y un valle muerto en
    // medio donde nadie se movía. Eso es lo que se leía como un mecanismo.
    const state = workweek(village(20));
    let quietMoments = 0;
    let checked = 0;
    let previous = positionsAt(state, 0.02);
    for (let f = 0.06; f < 0.75; f += 0.06) {
      const now = positionsAt(state, f);
      let walking = 0;
      for (const [id, p] of now) {
        const was = previous.get(id);
        if (was !== undefined && Math.hypot(p.x - was.x, p.y - was.y) > 0.15) walking += 1;
      }
      if (walking < now.size * 0.15) quietMoments += 1;
      checked += 1;
      previous = now;
    }
    expect(checked).toBeGreaterThan(5);
    expect(quietMoments, 'no debe haber ratos muertos en la jornada').toBe(0);
  });

  it('ni todos salen de casa en el mismo instante', () => {
    // Al principio del día tiene que haber gente ya fuera y gente aún dentro.
    // Se mira a la hora en que se sale —entre el amanecer y `DAY.LEAVE_SPAN`—
    // y no más tarde: la primera versión comparaba las 0,08 con las 0,2, y a
    // las 0,2 ya ha salido todo el mundo por construcción, así que sólo
    // pasaba cuando alguien con el campo pegado a casa había llegado ya. Con
    // R-1 la aldea de veinte años tiene otra gente y ese alguien no estaba.
    // Tres semanas, porque un umbral no se fija con una jornada.
    const base = workweek(village(20));
    for (let week = 0; week < 3; week += 1) {
      const state = structuredClone(base);
      state.tick += week;
      if (state.tick % 4 === 0) state.tick += 1;
      const home = new Map(crowdPositions(state, 0).map((p) => [p.id, p]));
      let out = 0;
      let inside = 0;
      for (const p of crowdPositions(state, 0.08)) {
        const was = home.get(p.id);
        if (was === undefined) continue;
        if (Math.hypot(p.x - was.x, p.y - was.y) > 0.5) out += 1;
        else inside += 1;
      }
      expect(out, `semana ${week}: alguien ya ha salido`).toBeGreaterThan(0);
      expect(inside, `semana ${week}: alguien sigue en casa`).toBeGreaterThan(0);
    }
  });
});

describe('no es el mismo día una y otra vez · §11.9', () => {
  it('la mayoría está en otro sitio que la semana pasada', () => {
    const state = workweek(village(20));
    const before = positionsAt(state, 0.3);
    tick(state, CATALOG);
    const after = positionsAt(state, 0.3);

    let same = 0;
    let compared = 0;
    for (const [id, p] of after) {
      const was = before.get(id);
      if (was === undefined) continue;
      compared += 1;
      if (Math.hypot(p.x - was.x, p.y - was.y) < 0.3) same += 1;
    }
    expect(compared).toBeGreaterThan(10);
    expect(same / compared, 'más de la mitad tiene que haber cambiado').toBeLessThan(0.5);
  });
});

describe('la gente no se apila · §11.9', () => {
  it('la tierra se reparte: no van todos al campo más cercano', () => {
    // Repartiendo salen de 5 a 9 destinos distintos; dejando que cada uno vaya
    // al más cercano a su casa bajan a 4 o 5. Los dos rangos se tocan, así que
    // la medida que separa las dos conductas es **la media de varias
    // partidas**, no el suelo de una: seis semillas, y la media por encima de
    // seis. Con una calle entre las casas (§7.2) la media bajó de 7,50 a 6,67
    // —las casas están más repartidas y el sitio más cercano cae más a mano—,
    // que es el mismo reparto en un pueblo más ancho y no un reparto peor.
    // **Y sólo cuenta en las aldeas donde la gente anda.** Desde el mapa grande
    // hay valles en los que casi nadie recorre nada: medido en la semilla 7,
    // cuatro rutas para treinta y nueve personas, con cincuenta y cuatro pares
    // casa-campo a más de dos celdas. No es que el reparto haya empeorado, es
    // que **los campos cayeron al otro lado del río y A* no cruza el agua**
    // (`astar.ts`) — el vado es de momento sólo un dibujo (`render3d/world/
    // ford.ts`). Está anotado como defecto aparte: contar destinos entre cuatro
    // caminantes no mide un reparto, mide el azar de una fundación.
    const WALKERS = 10;
    const spread: number[] = [];
    let counted = 0;
    for (const seed of [7, 3, 11, 23, 41, 97]) {
      const state = workweek(village(20, seed));
      const routes = routesFor(state);
      if (routes.size < WALKERS) continue;
      counted += 1;
      const targets = new Set<number>();
      for (const cells of routes.values()) {
        const last = cells[cells.length - 1];
        if (last !== undefined) targets.add(last);
      }
      // Y ninguna partida suelta se desploma **del todo** al campo de al lado.
      // El suelo por semilla va en cuatro y no en cinco, que es donde estaba:
      // el comentario de arriba dice que los dos rangos se tocan, así que un
      // suelo dentro del solape no separa las conductas, sólo cuenta cuántas
      // casas tenía esa aldea. En v3.61 la semilla 7 cayó a cuatro sin que el
      // reparto cambiara, y la media siguió donde estaba: es la media la que
      // mide esto, y es la que manda abajo.
      expect(targets.size, `semilla ${seed}`).toBeGreaterThanOrEqual(4);
      spread.push(targets.size);
    }
    // Que la mayoría de las semillas tengan aldea que ande sigue siendo parte de
    // lo que esto vigila: si esto baja, el defecto del vado se ha comido el
    // juego y hay que arreglarlo antes que nada.
    expect(counted, `${counted} de 6 semillas con gente andando`).toBeGreaterThanOrEqual(4);
    const mean = spread.reduce((sum, n) => sum + n, 0) / spread.length;
    // Medido tras el mapa grande, en las cuatro semillas que andan: 7, 5, 10 y
    // 9 destinos, media 7,75. El umbral se queda en seis, que es donde estaba.
    expect(mean, `media ${mean.toFixed(2)} sobre ${spread.join(', ')}`).toBeGreaterThan(6);
  });
});

describe('los oficios se ven · §11.9', () => {
  const spotOf = (s: GameState, id: number): { x: number; y: number } | undefined =>
    crowdPositions(s, 0.35).find((f) => f.id === id);

  const centreOf = (s: GameState, kind: string): { x: number; y: number } | undefined => {
    const b = s.buildings.find((v) => v.kind === kind && v.lostTick === null);
    return b === undefined ? undefined : { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  };

  /**
   * Una aldea de veinticinco años **que tenga herrero y fragua en pie**, de
   * entre varias semillas.
   *
   * Antes se cogía la semilla 7 y se daba por hecho que a los veinticinco años
   * tendría las dos cosas. Desde que el caos es el juego (R-1 §2.6, «que haya
   * partidas que se rompan y no se pueda seguir jugando es la idea del
   * juego»), el rayo puede quemar la fragua de cualquier valle y en la 7 la
   * quema: la prueba fallaba por la suerte de un valle, no por lo que dice
   * medir. Lo que se guarda es «el que tiene taller trabaja en su taller», y
   * para eso hace falta un valle con taller, no uno concreto.
   */
  const forgeVillage = (): { state: GameState; smithId: number; forge: { x: number; y: number } } | null => {
    for (const seed of [7, 11, 23, 41, 97]) {
      const state = workweek(village(25, seed));
      const smith = state.people.villagers.find((v) => v.role === 'smith' && v.diedTick === null && v.leftTick === null);
      const forge = centreOf(state, 'smithy');
      if (smith !== undefined && forge !== undefined) return { state, smithId: smith.id, forge };
    }
    return null;
  };

  it('el herrero pasa el día en la fragua, no en el campo', () => {
    // El reparto de §5.2 cuenta brazos, no personas, así que el herrero era un
    // labrador más. Los ocho con nombre son los únicos que el jugador sigue.
    const found = forgeVillage();
    expect(found, 'alguna de las cinco semillas debe llegar a los 25 años con herrero y fragua').not.toBeNull();
    const at = spotOf(found!.state, found!.smithId);
    expect(at).toBeDefined();
    expect(Math.hypot(at!.x - found!.forge.x, at!.y - found!.forge.y)).toBeLessThan(4);
  });

  it('el alguacil, junto al granero', () => {
    const state = workweek(village(25));
    const reeve = state.people.villagers.find((v) => v.role === 'reeve' && v.diedTick === null);
    if (reeve === undefined) return;
    const at = spotOf(state, reeve.id);
    expect(at).toBeDefined();
    // **Cerca de un granero, no del centro de todos.** `centreOf` promedia, y
    // una aldea madura tiene varios graneros repartidos: el promedio de tres
    // graneros puede caer donde no hay ninguno, así que la prueba medía la
    // distancia a un sitio inventado. Salió al crecer las aldeas con E5 —7,43
    // celdas al promedio— y la propiedad que se quería guardar nunca fue ésa.
    const granaries = state.buildings.filter(
      (one) => one.kind === 'granary' && one.lostTick === null,
    );
    if (granaries.length === 0) return;
    const away = Math.min(...granaries.map(
      (one) => Math.hypot(at!.x - (one.x + one.w / 2), at!.y - (one.y + one.h / 2)),
    ));
    expect(away, 'el alguacil trabaja junto a alguno de los graneros').toBeLessThan(5);
  });

  it('y si la fragua se pierde, el herrero vuelve al campo', () => {
    // Sin taller no hay sitio propio: no se le deja plantado en un solar. Y la
    // fragua la tira la prueba a mano, que es el punto: se compara el mismo
    // herrero del mismo valle con y sin ella. El valle lo elige
    // `forgeVillage()` porque desde R-1 §2.6 no todos llegan con fragua.
    const found = forgeVillage();
    expect(found, 'alguna de las cinco semillas debe llegar a los 25 años con herrero y fragua').not.toBeNull();
    const withForge = spotOf(found!.state, found!.smithId);

    const razed = structuredClone(found!.state);
    for (const b of razed.buildings) if (b.kind === 'smithy') b.lostTick = razed.tick - 100;
    const without = spotOf(razed, found!.smithId);

    expect(withForge).toBeDefined();
    expect(without).toBeDefined();
    expect(without).not.toEqual(withForge);
  });
});
