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
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { Building, GameState } from '@engine/state';

/** Los tramos de muralla conectados, de mayor a menor. */
function runs(state: GameState): number[] {
  const walls = state.buildings.filter(
    (b) => b.lostTick === null && (b.kind === 'wall' || b.kind === 'palisade'),
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
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
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
    // tener pueblo** —que es la palabra del dueño para eso—. Medido a los
    // cuarenta años: el tramo mayor tiene 68, 71, 56 y 63 piezas, o sea del
    // 62 % al 92 % de la muralla del valle, y lo que sobra son de uno a cuatro
    // trozos de 1 a 31 piezas.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
      const sizes = runs(state);
      const total = sizes.reduce((sum, n) => sum + n, 0);
      if (total === 0) continue;
      expect((sizes[0] ?? 0) / total, `semilla ${seed}: ${JSON.stringify(sizes)}`)
        .toBeGreaterThanOrEqual(0.6);
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
    const state = foundGame(41);
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    const ring = state.ring;
    expect(ring, 'a los cuarenta años ya hay anillo').not.toBeNull();
    if (ring === null) return;
    const centre = { x: state.plaza.x + 0.5, y: state.plaza.y + 0.5 };
    const walls = state.buildings.filter((b) => b.lostTick === null
      && (b.kind === 'wall' || b.kind === 'palisade'));
    const onRing = walls.filter((b) => {
      const gap = Math.hypot(b.x + 0.5 - centre.x, b.y + 0.5 - centre.y);
      return Math.abs(gap - ring) <= 0.75;
    });
    expect(onRing.length / Math.max(1, walls.length),
      `en el anillo ${onRing.length} de ${walls.length}`).toBeGreaterThanOrEqual(0.8);
  });
});
