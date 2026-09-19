// P-4 · La muralla se levanta en anillo, no en cachos. §7.4c.
//
// **Lo pidió el dueño del diseño mirando una captura**, el 18 sep 2026: «¿podemos
// también evitar esos cachos sueltos? Sé que es complicado porque la aldea tiene
// que ir creciendo, pero la muralla también tendrá que quedarse por secciones.
// Es decir, si la aldea crece a un cierto punto, se construye la muralla
// alrededor y después la siguiente sección de construcción va fuera de la
// muralla».
//
// **Vive en las jornadas** porque son cuatro partidas de sesenta años.
//
// Lo que había: la empalizada se levantaba sobre la envolvente convexa del
// núcleo, que crece con la aldea, así que cada pieza caía sobre la envolvente de
// su año. Medido entonces, al año 60: **de 7 a 19 tramos desconectados por
// valle**, y el más largo con la cuarta parte de las piezas.
//
// Lo que hay: un anillo escrito en el estado (`GameState.ring`) alrededor de la
// plaza, que no se mueve mientras quepa una pieza más, y otro tres celdas más
// afuera cuando se llena. Medido igual:
//
//   año 20 · [4] · [4] · [] · [4]            (semillas 7, 11, 23, 41)
//   año 40 · [8] · [28] · [4] · [8]          un solo tramo en las cuatro
//   año 60 · [12] · [41,15,4,1,1] · [25] · [57,19,19,14,11,2,2,1,1,1,1]

import { describe, expect, it } from 'vitest';
import { BUILDING_RULES, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { ringClosed } from '@engine/world/placement';
import { defenceGates } from '@derive/defence-gates';
import { eraOf, type Era } from '@derive/era';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { destroyBuilding } from '@engine/world/buildings';
import { canGive, giveMeans } from '@engine/world/means';
import { terrainOf, reachableFrom } from '../../src/render3d/life/terrain';
import type { Building, GameState } from '@engine/state';

/**
 * Los tramos de muralla conectados, de mayor a menor.
 *
 * **En ocho direcciones desde A2c**: el anillo es un círculo rasterizado de una
 * celda de grosor, así que dos estacas seguidas de la misma muralla caen en
 * diagonal cada pocos pasos. Contando en cruz, el cerco entero de la semilla 7
 * se leía como once trozos —[13, 13, 13, 7, 7, 2, 1, 1, 1, 1, 1]— cuando es una
 * muralla sola. Y es la vecindad que significa lo que aquí se pregunta: lo que
 * no se puede cruzar.
 *
 * **Y el portón cuenta como muralla** (A2): una puerta es parte del cerco, no
 * un agujero en él. Sin esto la cuenta partía el anillo en dos a los dos lados
 * de la puerta —medido en la semilla 7: [39, 28, …] en vez de un tramo de 67—
 * y la prueba habría dicho que la muralla se rompió cuando lo que pasó es que
 * la aldea colgó su puerta.
 */
function runs(state: GameState): number[] {
  const walls = state.buildings.filter(
    (b) => b.lostTick === null
      && (b.kind === 'wall' || b.kind === 'palisade' || b.kind === 'gate'),
  );
  const byCell = new Map(walls.map((b) => [b.y * state.map.width + b.x, b]));
  const seen = new Set<number>();
  const sizes: number[] = [];
  for (const wall of walls) {
    if (seen.has(wall.id)) continue;
    const run: Building[] = [wall];
    seen.add(wall.id);
    for (let n = 0; n < run.length; n += 1) {
      const b = run[n];
      if (b === undefined) continue;
      for (const [dx, dz] of [
        [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
      ] as const) {
        const next = byCell.get((b.y + dz) * state.map.width + b.x + dx);
        if (next !== undefined && !seen.has(next.id)) { seen.add(next.id); run.push(next); }
      }
    }
    sizes.push(run.length);
  }
  return sizes.sort((a, b) => b - a);
}

const SEEDS = [7, 11, 23, 41];

describe('P-4 · la muralla es una muralla', () => {
  it('a los cuarenta años hay una muralla, y lo demás son secciones', () => {
    // **Esto pedía «un solo tramo», y B-1 enseñó por qué no podía seguir
    // pidiéndolo.** El anillo se fija una vez (§7.4c) y §7.3 no es el único que
    // levanta muralla: una encrucijada contestada también la concede. Con el
    // ritmo nuevo la primera decisión llega a las 14 horas de reloj en vez de a
    // las cien, así que había piezas de empalizada en el año dos y el anillo se
    // fijaba **alrededor de una aldea de cinco casas, en radio 7** — medido en
    // doce semillas — para no moverse nunca: 49 piezas en un círculo de 44
    // celdas y el pueblo creciendo fuera de su propia muralla.
    //
    // La regla que lo arregla es del dueño del diseño —«la muralla se podría
    // hacer a partir de X número de casas»— con la X medida en once
    // (`BUILDING_RULES.PALISADE_HOUSES`: con once casas el pueblo ocupa ya el
    // 91 % del radio que va a ocupar). Con ella, el anillo se fija en el año 13
    // a 34 con radio 10 a 12, que es el del valle hecho.
    //
    // Lo que queda, y es lo que esta prueba guarda ahora: **una muralla de
    // verdad y, como mucho, secciones sueltas de lo que se levantó antes de
    // tener pueblo** —que es la palabra del dueño para eso—.
    //
    // **Y el listón baja de 0,6 a 0,4 con A2c, con lo medido escrito.** El
    // anillo pasó de ser una banda de celda y media a un círculo de una celda,
    // y una muralla de una sola capa **no tiene puentes**: donde el agua o la
    // roca ocupan una celda del círculo, el cerco se parte ahí. Eso no es
    // confeti, son arcos del mismo anillo, y es lo que el dueño llamó
    // secciones. Medido a los cuarenta años en las cuatro semillas:
    //
    //   7  → [53,3,1,1,1,1]   88 % en el tramo mayor
    //   11 → [29,24,19]       tres arcos del mismo círculo, 40 %
    //   23 → [41,19,1,1,1]    65 %
    //   41 → [63,4,2,1]       90 %
    //
    // Lo que sí se sigue exigiendo, y es la propiedad: **nada de confeti** —
    // como mucho seis trozos— y el mayor con al menos dos quintos del cerco.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
      const sizes = runs(state);
      const total = sizes.reduce((sum, n) => sum + n, 0);
      if (total === 0) continue;
      expect((sizes[0] ?? 0) / total, `semilla ${seed}: ${JSON.stringify(sizes)}`)
        .toBeGreaterThanOrEqual(0.4);
      expect(sizes.length, `semilla ${seed}: ${JSON.stringify(sizes)}`).toBeLessThanOrEqual(6);
    }
  });

  it('y a los sesenta, lo que hay es anillos y no confeti', () => {
    // A los sesenta años los valles grandes han cerrado su primer anillo y han
    // empezado otro, así que hay más de un tramo **a propósito**. Lo que no
    // puede volver es el confeti: antes el tramo mayor tenía el 25 % de las
    // piezas (10 de 40 en la semilla 41); ahora, del 45 % al 100 %.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
      const sizes = runs(state);
      const total = sizes.reduce((sum, n) => sum + n, 0);
      if (total === 0) continue;
      const longest = sizes[0] ?? 0;
      expect(longest / total, `semilla ${seed}: ${JSON.stringify(sizes)}`).toBeGreaterThan(0.4);
      // Y ninguna aldea llena el valle de piezas de una sola: como mucho una de
      // cada diez, que son los restos de un anillo que se quedó sin sitio.
      const lonely = sizes.filter((n) => n === 1).length;
      expect(lonely / Math.max(1, total), `semilla ${seed}: sueltas ${lonely} de ${total}`)
        .toBeLessThan(0.12);
    }
  });

  it('el anillo se escribe una vez, y la muralla vive en él', () => {
    // `GameState.ring` es el radio en curso: mientras quepa una pieza más no
    // cambia, y cada pieza que se levanta **desde que se escribió** cae en él.
    //
    // **Lo que no puede exigir esta prueba, y B-1 lo midió:** que *todas* las
    // piezas estén en el anillo. El anillo se escribe cuando el pueblo tiene
    // once casas (`PALISADE_HOUSES`), y hasta entonces una encrucijada
    // contestada puede conceder empalizada —con el ritmo nuevo, desde las 14
    // horas de reloj—. Esas piezas de antes son las **secciones** de las que
    // habló el dueño del diseño, y están donde la aldea pudo ponerlas. Medido
    // en la semilla 41: de 69 piezas, 63 en el anillo y 6 en dos secciones
    // previas.
    // **La semilla pasa de la 41 a la 7 con G3** (19 sep 2026), y el motivo es
    // del método y no del contenido: esta prueba clava **una sola semilla**
    // —lo que `CLAUDE.md` desaconseja para fijar nada— y la 41 es una de las
    // cinco que ven las plantillas del caserío (`hamlet.ts`), así que su
    // trayectoria depende de una decisión del año uno. Con ella, la 41 llega a
    // los cuarenta años **tomada y sin anillo**, y lo que se rompía era el
    // soporte de la prueba, no la propiedad. La 7 no ve contenido de caserío
    // —juega igual con él y sin él, comprobado—, así que mide §7.4c y nada
    // más. Medido a los cuarenta años: anillo 11 y **59 de 59 piezas en él**.
    const state = foundGame(7);
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    const ring = state.ring;
    expect(ring, 'a los cuarenta años ya hay anillo').not.toBeNull();
    if (ring === null) return;
    const centre = { x: state.plaza.x + 0.5, y: state.plaza.y + 0.5 };
    // A3 · el bastión es una pieza de muralla y vive en el anillo como las
    // demás: contarlo aparte sería tener dos ideas de qué es el cerco.
    const walls = state.buildings.filter((b) => b.lostTick === null
      && (b.kind === 'wall' || b.kind === 'palisade' || b.kind === 'bastion'));
    const onRing = walls.filter((b) => {
      const gap = Math.hypot(b.x + 0.5 - centre.x, b.y + 0.5 - centre.y);
      return Math.abs(gap - ring) <= 0.75;
    });
    expect(onRing.length / Math.max(1, walls.length),
      `en el anillo ${onRing.length} de ${walls.length}`).toBeGreaterThanOrEqual(0.8);
  });
});

describe('A1 · la villa se cierra, y se cuenta una vez', () => {
  // §1b · La fase 3 de la meta. Lo que se guarda no es cuándo se cierra —eso
  // es balance y se nivela al final— sino que **el juego se entera**: que la
  // aldea que ya no puede seguir amurallando lo diga, con peso de titular, y
  // que no lo repita.
  //
  // Medido al cerrar A1, doce semillas × ochenta años: cierran **once de
  // doce**, la mediana en el año 38 —425 h de reloj a ×1— con 58 a 103 piezas
  // de muralla, y **ninguna lo dijo dos veces**. La que no cierra (la 91) se
  // queda en 67 piezas: su anillo cruza agua y sigue teniendo hueco donde no
  // se puede construir, que es el caso que `ringClosed` tiene que saber leer
  // sin colgarse esperando un círculo perfecto.
  const YEARS = 80;

  it('el valle que cierra su anillo lo cuenta, con peso de titular y una sola vez', () => {
    let closed = 0;
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const said: number[] = [];
      for (let week = 0; week < TIME.WEEKS_PER_YEAR * YEARS && state.ended === null; week += 1) {
        for (const report of run(state, 1, 'prudent', CATALOG)) {
          for (const entry of report.entries) {
            if (entry.templateKey === 'wall.closed') said.push(entry.weight);
          }
        }
      }
      // La propiedad, en las dos direcciones: lo dice si y sólo si se cerró.
      expect(said.length, `semilla ${seed}: lo dijo ${said.length} veces`)
        .toBe(ringClosed(state) ? 1 : 0);
      for (const weight of said) {
        expect(weight, `semilla ${seed}: peso`).toBe(3);
      }
      if (said.length === 1) closed += 1;
    }
    // Y no es una propiedad vacía: la mayoría de los valles llegan a cerrar.
    expect(closed, `cerraron ${closed} de ${SEEDS.length}`)
      .toBeGreaterThanOrEqual(Math.ceil(SEEDS.length / 2));
  });

  it('la marca se queda puesta, que es lo que la fase 4 va a preguntar', () => {
    const state = foundGame(69);
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    expect(ringClosed(state), 'la semilla 69 cierra en el año 29').toBe(true);
    expect(state.flags['wall_closed'], 'y la marca es permanente').toBe(0);
  });

  it('un valle sin anillo no está cerrado', () => {
    // `ringClosed` no puede decir que sí por no haber muralla: sin anillo no
    // hay nada cerrado, y es la mitad de la propiedad que un asedio necesita.
    const state = foundGame(7);
    expect(state.ring).toBeNull();
    expect(ringClosed(state)).toBe(false);
  });
});

describe('A2 · el portón es una cosa, no un cálculo', () => {
  // §1b, fase 3. Lo que esto guarda es que **la puerta existe, es una sola, y
  // es por donde se pasa** — que es lo que la fase 4 necesita para poder
  // romperla. Antes de A2 el paso era una estaca elegida por `defenceGates`, y
  // esa elección se movía cada vez que la muralla crecía: la misma enfermedad
  // que tenía el anillo antes de v3.88.
  //
  // Medido al cerrar A2, cuatro semillas × cuarenta años: un portón por valle,
  // levantado entre el año 2,3 y el 6,6 (26 a 74 h de reloj a ×1), siempre en
  // el anillo y pegado a la muralla, y **ni una estaca abierta por error**.

  it('la aldea cuelga un portón, y sólo uno', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
      const gates = state.buildings.filter((b) => b.kind === 'gate' && b.lostTick === null);
      const walls = state.buildings.filter((b) => b.lostTick === null
        && (b.kind === 'palisade' || b.kind === 'wall'));
      // Sin muralla no hay puerta: una puerta suelta en el prado era el defecto
      // que el dueño del diseño vio en una captura el 18 sep.
      if (walls.length < BUILDING_RULES.GATE_MIN_RUN) {
        expect(gates.length, `semilla ${seed}: sin muralla`).toBe(0);
        continue;
      }
      expect(gates.length, `semilla ${seed}: ${gates.length} portones`).toBe(1);
      const gate = gates[0]!;
      // Cuelga de la muralla: tiene una pieza pegada en cruz.
      const touching = walls.some((w) => Math.abs(w.x - gate.x) + Math.abs(w.y - gate.y) === 1);
      expect(touching, `semilla ${seed}: el portón toca muralla`).toBe(true);
    }
  });

  it('y el paso de la muralla es el portón, no un agujero en una estaca', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
      const gateIds = new Set(state.buildings
        .filter((b) => b.kind === 'gate' && b.lostTick === null).map((b) => b.id));
      if (gateIds.size === 0) continue;
      const passages = defenceGates(state);
      expect([...passages.keys()], `semilla ${seed}`).toEqual([...gateIds]);
    }
  });

  it('si el portón se pierde, la aldea vuelve a colgar uno', () => {
    // La otra mitad, y es la que la fase 4 va a usar: un portón roto es un
    // edificio perdido, con el hueco que deja. La aldea lo repone porque §7.3
    // vuelve a pedirlo, sin ninguna regla nueva.
    const state = foundGame(23);
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    const gate = state.buildings.find((b) => b.kind === 'gate' && b.lostTick === null);
    expect(gate, 'la semilla 23 cuelga su portón en el año 2,3').toBeDefined();
    if (gate === undefined) return;
    destroyBuilding(state, gate.id);
    expect(state.buildings.some((b) => b.kind === 'gate' && b.lostTick === null)).toBe(false);
    run(state, TIME.WEEKS_PER_YEAR * 10, 'prudent', CATALOG);
    expect(state.buildings.some((b) => b.kind === 'gate' && b.lostTick === null),
      'diez años después hay puerta otra vez').toBe(true);
  });
});


describe('A2c · el cerco tiene una capa y dos puertas que sirven', () => {
  // §1b, fase 3, y **la ronda que el dueño del diseño mandó atacar de raíz**:
  // «no es el remedio para el valle que se queda encerrado; las dos puertas
  // tienen que ser funcionales», y después «para, intenta abordar tú el
  // problema».
  //
  // La raíz era el grosor. El anillo se plantaba en una **banda**
  // (`|distancia − radio| ≤ 0,75`) y esa banda es de celda y media: en muchos
  // ángulos entraban dos celdas y la muralla salía de dos capas. Un portón es
  // una celda, así que perforaba una y la otra seguía sellando el pueblo.
  // Medido en diez semillas con la banda: **cinco valles con bloques de dos
  // por dos** y, en la semilla 41, las quince casas en una bolsa de 220 celdas
  // de 8 064 con los dos lados de la puerta dando al campo.
  //
  // Con el círculo rasterizado: **cero valles de dos capas, cero aldeas
  // encerradas, y las dos puertas útiles en los diez**, separadas de 12 a 16
  // celdas.
  const TEN = [3, 7, 11, 14, 23, 25, 36, 41, 47, 58];

  /**
   * El valle a los sesenta, con el jugador pagando su segunda puerta.
   *
   * **Y se para si la partida acaba**, que desde B3 (18 sep 2026) puede pasar:
   * un valle al que se le lleva el clan vecino pierde su portón en el asalto
   * (`THREAT.BREACH` lo convierte en ruina), y eso no es un defecto del cerco —
   * es lo que le pasó. Medido: la semilla 11 acaba tomada antes del año sesenta
   * y se quedaba con cero portones, con lo que esta prueba leía un fallo de
   * colocación donde lo que había era una derrota.
   */
  function valley(seed: number): GameState {
    const state = foundGame(seed);
    for (let year = 0; year < 60 && state.ended === null; year += 1) {
      run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
      if (canGive(state, 'gate')) giveMeans(state, 'gate', 'spring', year);
    }
    if (state.ended === null) run(state, TIME.WEEKS_PER_YEAR * 3, 'prudent', CATALOG);
    return state;
  }

  it('la muralla no tiene dos capas en ninguna parte', () => {
    // Un bloque de dos por dos de muralla es la firma del grosor doble, y es
    // exactamente lo que una puerta de una celda no puede atravesar.
    for (const seed of TEN) {
      const state = valley(seed);
      // Un valle tomado no se mide aquí: su cerco tiene un boquete **puesto a
      // propósito** por el asalto (B3), que es lo contrario de un defecto.
      if (state.ended !== null) continue;
      const wall = new Set(state.buildings
        .filter((b) => b.lostTick === null
          && (b.kind === 'palisade' || b.kind === 'wall' || b.kind === 'gate'))
        .map((b) => b.y * state.map.width + b.x));
      const blocks = [...wall].filter((c) => wall.has(c + 1)
        && wall.has(c + state.map.width) && wall.has(c + state.map.width + 1));
      expect(blocks.length, `semilla ${seed}: ${blocks.length} bloques de 2×2`).toBe(0);
    }
  });

  it('y las dos puertas llevan de las casas al campo, cada una por su lado', () => {
    // Funcional quiere decir las dos cosas a la vez: desde la puerta se llega a
    // donde vive la gente **y** a campo abierto de fuera del cerco. Una puerta
    // que da del campo al campo, o de una bolsa a otra bolsa, no es una puerta.
    let measured = 0;
    for (const seed of TEN) {
      const state = valley(seed);
      if (state.ended !== null) continue;
      measured += 1;
      const gates = state.buildings.filter((b) => b.lostTick === null && b.kind === 'gate');
      expect(gates.length, `semilla ${seed}: ${gates.length} portones`).toBe(2);
      const land = terrainOf(state);
      const homes = state.buildings.filter((b) => b.lostTick === null
        && (b.kind === 'house' || b.kind === 'stone_house'));
      const centre = { x: state.plaza.x + 0.5, y: state.plaza.y + 0.5 };
      for (const gate of gates) {
        const reach = reachableFrom(land, { x: gate.x + 0.5, z: gate.y + 0.5 });
        const reached = homes.filter((h) => ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => {
          const x = h.x + dx; const y = h.y + dy;
          return x >= 0 && y >= 0 && x < land.width && y < land.height
            && reach[y * land.width + x] === 1;
        })).length;
        expect(reached / Math.max(1, homes.length),
          `semilla ${seed}, portón ${gate.x},${gate.y}: llega a ${reached} de ${homes.length} casas`)
          .toBeGreaterThanOrEqual(0.8);
        let outside = 0;
        for (let i = 0; i < reach.length; i += 1) {
          if (reach[i] !== 1) continue;
          const x = i % land.width; const y = (i - x) / land.width;
          if (Math.hypot(x + 0.5 - centre.x, y + 0.5 - centre.y) > (state.ring ?? 0) + 3) outside += 1;
        }
        expect(outside, `semilla ${seed}, portón ${gate.x},${gate.y}: campo abierto`)
          .toBeGreaterThan(200);
      }
      // Y en otro lado del cerco, no la de al lado: dos puertas son dos por
      // dónde entrar. Medido: de 12 a 16 celdas de separación.
      const [a, b] = gates as [Building, Building];
      expect(Math.hypot(a.x - b.x, a.y - b.y), `semilla ${seed}: puertas juntas`)
        .toBeGreaterThanOrEqual((state.ring ?? 0) * BUILDING_RULES.GATE_APART);
    }
    // Y la prueba no se puede quedar vacía por la puerta de atrás: si un día
    // cayeran todos los valles, esto lo diría en vez de pasar sin medir nada.
    expect(measured, `valles en pie que se pudieron medir: ${measured} de ${TEN.length}`)
      .toBeGreaterThanOrEqual(TEN.length / 2);
  });
});

describe('A4 · la era y la muralla de piedra', () => {
  // **La era jugada.** Vive aquí y no en la suite rápida porque son seis
  // partidas de ochenta años; la versión de estado —qué marca cada era, que no
  // vuelve atrás cuando el valle pierde lo que la marcaba— está en
  // `tests/fast/era.test.ts` y es instantánea.
  const ORDER: readonly Era[] = ['hamlet', 'village', 'town'];
  const A4_SEEDS = [7, 23, 36, 41, 79, 91];

  it('la era nunca da un paso atrás en ochenta años', () => {
    // La propiedad de `derive/era.ts` contra el juego y no contra un estado a
    // mano: con rayos, riadas y asaltos por medio, una aldea que perdió su
    // fragua sigue siendo una aldea. Con `run` porque un bucle de `tick` no
    // contesta encrucijadas (la trampa escrita en CLAUDE.md).
    for (const seed of A4_SEEDS) {
      const state = foundGame(seed);
      let seen = 0;
      for (let year = 0; year < 80; year += 1) {
        run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
        const now = ORDER.indexOf(eraOf(state));
        expect(now, `semilla ${seed}, año ${year}: la era retrocedió`)
          .toBeGreaterThanOrEqual(seen);
        seen = now;
        if (state.ended !== null) break;
      }
    }
  });

  it('y las tres eras son las tres fases: el valle que cierra su cerco las recorre', () => {
    // **La medida que A4 existe para mover.** Antes de A4 la muralla de piedra
    // no la tenía **ningún** valle de los doce medidos: la única puerta era la
    // encrucijada de la primera piedra, que obliga a elegir entre la muralla y
    // las casas, y las diez veces que se desbloqueó se eligieron las casas.
    // Con el cerco cerrado como segunda puerta: **10 de 12 valles con muralla
    // de piedra**, 65 tramos en la semilla 91, y la escalera del ritmo la pone
    // a las 249 h de reloj — la misma hora que la villa cerrada, que es lo que
    // el contrato dice (`stoneWallOpen`).
    let towns = 0;
    let withStone = 0;
    for (const seed of A4_SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 80, 'prudent', CATALOG);
      if (eraOf(state) !== 'town') continue;
      towns += 1;
      // Una villa cerrada ha pasado por aldea: la fragua es lo que abre la
      // piedra, así que no se puede cerrar un cerco sin haber sido aldea.
      expect(state.buildings.some((b) => b.kind === 'smithy'),
        `semilla ${seed}: villa sin haber sido aldea`).toBe(true);
      if (state.buildings.some((b) => b.kind === 'wall')) withStone += 1;
    }
    expect(towns, 'valles que cerraron su cerco').toBeGreaterThanOrEqual(2);
    expect(withStone / towns, `muralla de piedra en ${withStone} de ${towns} villas`)
      .toBeGreaterThanOrEqual(0.5);
  });
});
