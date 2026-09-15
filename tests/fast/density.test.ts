// M-44 · design.md §11.6, §16.3 — que siga pasando algo.
//
// §11.6 nació de una cuenta: la primera sesión humana veía entre 0,0 y 0,6
// sucesos notables cada cinco minutos y dijo que no pasaba nada. Esta prueba
// existe para que no vuelva a caer ahí sin que nadie se entere.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';
import { milestonesAt } from '@ui/milestones';

describe('la aldea tiene algo que contar · §11.6', () => {
  it('una sesión de cinco minutos a ×1 trae varios sucesos notables', () => {
    // Cinco minutos reales a velocidad normal son veinte semanas.
    const weeks = Math.round((5 * 60 * 1000) / TIME.REAL_MS_PER_TICK);
    const seeds = [3, 7, 11, 23, 41, 97];
    // **Y se miran muchas sesiones, no una.** La primera versión medía una sola
    // ventana de veinte semanas justo al cumplirse el año veinte, y eso es una
    // muestra: en v3.61 esas tres ventanas concretas cayeron en un hueco y la
    // prueba dio cero, mientras la densidad real medida sobre doscientas
    // cuarenta ventanas era de ocho por sesión. `CLAUDE.md` lo dice para las
    // semillas y vale igual para el tiempo: un umbral sobre una muestra es
    // ruido, y aquí el ruido acusaba a un motor que estaba sano.
    const WINDOWS = 20;
    let notable = 0;
    let sessions = 0;

    // **Y se cuenta todo lo que llega a la pantalla, no sólo la crónica.**
    // `app.ts` saca por el mismo aviso de §11.6 dos cosas: las entradas de
    // crónica de peso ≥ 2 y los hitos de `milestones.ts`, que no son entradas de
    // crónica. Contando sólo las primeras, esta prueba medía menos de lo que el
    // jugador ve.
    let chronicleOnly = 0;
    for (const seed of seeds) {
      const state = foundGame(seed);
      run(state, 20 * 48, 'prudent', CATALOG); // una aldea ya asentada
      for (let w = 0; w < WINDOWS && state.ended === null; w += 1) {
        const before = state.chronicle.length;
        const since = state.tick;
        for (let n = 0; n < weeks && state.ended === null; n += 1) tick(state, CATALOG);
        const entries = state.chronicle.slice(before).filter((e) => e.weight >= 2).length;
        chronicleOnly += entries;
        notable += entries + milestonesAt(state, since).filter((m) => m.weight >= 2).length;
        sessions += 1;
      }
    }

    // **Medido hoy: 0,94 de crónica sola y 1,04 contando los hitos.** Y en
    // v3.61 eran 7,97, así que hay que decir de dónde venían: **siete de esos
    // ocho eran la misma frase**, el aviso semanal de la temporada de caza que
    // salía catorce veces al año y que v3.67 convirtió en uno por temporada. La
    // densidad de entonces era una ilusión de una sola clave; esto es lo que el
    // valle tiene de verdad que contar.
    //
    // Sigue por encima del suelo de §16.3 —«por debajo de uno el juego no
    // valía»— y **está justo en el suelo**, que es un hallazgo y no un aprobado.
    // La causa está medida y escrita en `docs/next-plan.md`: en los años 20 a 40
    // una aldea empieza **de 0,3 a 0,5 obras al año**, porque ya ha llegado a
    // `MAX_HOUSES`, a `MAX_FIELDS` y a un oficio de cada clase. Una aldea madura
    // no tiene nada que construir, así que no tiene nada que contar, y la
    // palanca «qué se levanta antes» se queda sin nada que ordenar.
    expect(notable / sessions, 'sucesos notables por sesión de cinco minutos a ×1')
      .toBeGreaterThan(1);
    // Que la crónica sola se quede corta queda dicho aquí, con su número, para
    // que el día que alguien suba la densidad se vea contra qué se compara.
    expect(chronicleOnly / sessions, 'sólo crónica, sin hitos').toBeGreaterThan(0.8);
  });
});
