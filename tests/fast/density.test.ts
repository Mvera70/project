// M-44 · design.md §11.6, §16.3 — que siga pasando algo.
//
// §11.6 nació de una cuenta: la primera sesión humana veía entre 0,0 y 0,6
// sucesos notables cada cinco minutos y dijo que no pasaba nada. Esta prueba
// existe para que no vuelva a caer ahí sin que nadie se entere.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
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
        // **`run` con política y no `tick` a secas, y esto costó una
        // conclusión falsa.** Con `tick` nadie contesta la encrucijada
        // planteada: se queda pendiente para siempre, ninguna otra puede
        // plantearse —§8.6 no plantea dos— y con ellas se van sus
        // consecuencias, sus semillas y sus obras. Esta prueba medía la
        // densidad de **una partida que nadie juega**, que es justo lo que no
        // hay que medir. Medido antes y después: 1,04 sucesos por sesión con
        // las encrucijadas sin contestar contra los que salen ahora.
        for (let n = 0; n < weeks && state.ended === null; n += 1) {
          run(state, 1, 'prudent', CATALOG);
        }
        const entries = state.chronicle.slice(before).filter((e) => e.weight >= 2).length;
        chronicleOnly += entries;
        notable += entries + milestonesAt(state, since).filter((m) => m.weight >= 2).length;
        sessions += 1;
      }
    }

    // **Medido con la partida jugada: 1,34 de crónica sola y 1,45 contando los
    // hitos.** Y en v3.61 eran 7,97, así que hay que decir de dónde venían:
    // **siete de esos ocho eran la misma frase**, el aviso semanal de la
    // temporada de caza que salía catorce veces al año y que v3.67 convirtió en
    // uno por temporada. La densidad de entonces era una ilusión de una sola
    // clave; esto es lo que el valle tiene de verdad que contar.
    //
    // **Y la primera medida de esta ronda dijo 1,04, que era falso.** Esta
    // prueba avanzaba el mundo con `tick` sin contestar la encrucijada
    // planteada, así que medía una partida que nadie juega: sin decisión no hay
    // consecuencia, ni semilla, ni obra concedida. Arreglado arriba, y la
    // lección apuntada porque de ese 1,04 salió media página de conclusiones
    // equivocadas sobre una aldea que «no tenía nada que contar».
    //
    // Sigue por encima del suelo de §16.3 —«por debajo de uno el juego no
    // valía»— y con margen, que es distinto de estar justo en él.
    expect(notable / sessions, 'sucesos notables por sesión de cinco minutos a ×1')
      .toBeGreaterThan(1);
    // La crónica sola, aparte y con su propia cota: si algún día los hitos
    // llevaran el peso de esto, se vería aquí.
    expect(chronicleOnly / sessions, 'sólo crónica, sin hitos').toBeGreaterThan(1);
  });
});
