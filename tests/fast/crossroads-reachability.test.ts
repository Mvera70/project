// M-08 · design.md Anexo A, §8.2. docs/medidas/findings-drama.md §7.
//
// La prueba que habría cazado `wolf_winter`. `tests/fast/catalog.test.ts` ya
// vigila que ninguna plantilla se quede sin **plantearse**, pero mide sobre el
// banco sintético de `tests/helpers/catalogue-bench.ts` — una aldea generosa
// que nace con 45 % de bosque para que el catálogo tenga ocasión de dispararse
// rápido. `wolf_winter` pedía `forestLeft > 0.25` y en ese banco a veces lo
// cumplía por las mismas razones que en la partida real nunca podía: el banco
// no funda como funda `foundGame`. El fallo pasó dos rondas de pruebas verdes.
//
// Esta prueba mide sobre partidas **reales** (`foundGame` + `run`, la política
// `prudent`, el mismo camino que `tools/reports/eligibility-report.ts`) si `requires`
// llega a cumplirse alguna vez — no si la plantilla llega a plantearse, que
// depende del peso y del sorteo y es otra pregunta (`docs/roadmap.md` §1). Una
// condición que nunca se cumple en ninguna partida real, sea cual sea la
// semilla, es un error de construcción: un umbral fuera del rango que el motor
// puede alcanzar. Una condición que se cumple poco no lo es.
import { foundTwenty } from '../helpers/founding';
import { beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { all } from '@engine/crossroads/conditions';
import { run } from '@engine/sim';
import type { Policy } from '@engine/sim';
import { TIME } from '@engine/balance';
import type { GameState } from '@engine/state';

// Varias semillas, nunca una sola (CLAUDE.md): una partida sola no dice si un
// umbral es alcanzable o si esa semilla concreta tuvo suerte.
const SEEDS = [7, 11, 23, 31, 37, 41];
const YEARS = 60;
const POLICY: Policy = 'prudent';
// G3 · las que se fundan con la pareja, para que el caserío tenga dónde
// cumplirse. Son las semillas que `tests/journeys/founding.test.ts` midió
// preguntando algo del caserío, que es donde esa ventana existe de verdad.
const COUPLE_SEEDS = [41, 53, 67, 89, 97];
const COUPLE_YEARS = 10;

/**
 * Por cada plantilla, cuántos ticks —sumados sobre todas las semillas— tenían
 * `requires` satisfecho a la vez. No es "se planteó": es "pudo plantearse".
 */
function passesByTemplate(): Map<string, number> {
  const passes = new Map<string, number>();
  for (const t of CATALOG) passes.set(t.id, 0);

  const play = (state: GameState, years: number): void => {
    const wanted = state.tick + years * TIME.WEEKS_PER_YEAR;
    while (state.tick < wanted && state.ended === null) {
      for (const t of CATALOG) {
        if (all(t.requires, state)) passes.set(t.id, (passes.get(t.id) ?? 0) + 1);
      }
      run(state, 1, POLICY, CATALOG);
    }
  };

  for (const seed of SEEDS) play(foundTwenty(seed), YEARS);
  // G3 · **y unas cuantas fundadas como funda el juego, que son dos.**
  //
  // La cabecera de este fichero dice que mide «partidas reales (`foundGame` +
  // `run`)» y hasta G3 medía sólo `foundTwenty`, que nace con veinte personas:
  // la aldea de antes del 15 sep 2026. Mientras todo el catálogo pedía aldea
  // hecha eso daba igual; con las dos plantillas del caserío (`hamlet.ts`,
  // `people < 10`) dejó de darlo — sus condiciones son inalcanzables en un
  // banco que nunca tiene menos de diez, y esta prueba las habría llamado
  // contenido muerto siendo falso.
  //
  // Se juegan pocos años a propósito: la ventana del caserío se cierra en
  // cuanto el valle crece, así que diez años por semilla la cubren entera y el
  // coste cabe en el presupuesto de §14.1.
  for (const seed of COUPLE_SEEDS) play(foundGame(seed), COUPLE_YEARS);
  return passes;
}

describe('el catálogo · alcanzabilidad de las condiciones', () => {
  let passes: Map<string, number>;
  beforeAll(() => { passes = passesByTemplate(); }, 15_000);

  // Dos plantillas siguen sin cumplir `requires` en esta ventana, y ninguna de
  // las dos por un umbral inalcanzable:
  //
  //   · `tithe_demand` depende de haberse arrodillado en `winter_grain_debt`
  //     (A.1 kneel: `flag vassal years:0`), una cadena que existe y funciona
  //     —comprobado disparando la opción a mano— pero que rara vez se recorre:
  //     `winter_grain_debt` mismo es elegible ~0,2 % de los ticks y sólo una
  //     de sus tres opciones vota vasallaje. Documentado en design.md v3.65 y
  //     en la auditoría de v2.46 como "por diseño, gira sobre una decisión
  //     anterior, no sobre la edad". No se toca en esta ronda.
  //   · `chapel_or_granary` exige a la vez `people >= 30`, `wood > 200` y
  //     `faith > 45` sin capilla, y es hito de una sola vez (`maxPerGame: 1`):
  //     la combinación es estrecha y ya está en el `SLOW` de
  //     `tests/fast/catalog.test.ts` por el mismo motivo, midiendo sobre el
  //     banco sintético.
  //   · `relic_pedlar` exige `has chapel`, y levantar una capilla depende a su
  //     vez de que salga `chapel_or_granary` —la única puerta a ese edificio
  //     en el catálogo—, así que hereda su misma rareza. Es además el fallo
  //     "por descuido" que design.md ya tiene anotado aparte (la fe se
  //     estabiliza fuera de banda una vez hay capilla) y que esta ronda no
  //     tenía encargo de tocar.
  //
  // Si otra entra aquí sin que nadie la haya sacado a propósito, el fallo es
  // real y hay que investigarlo, no ampliar la lista.
  const NARROW_NOT_IMPOSSIBLE = ['tithe_demand', 'chapel_or_granary', 'relic_pedlar'];

  // **Estuvo roja a propósito durante tres días, y ya no lo está** (18 sep
  // 2026). Llegó con la rama del 14 sep y su lista se midió contra el mapa de
  // 36 × 56; el mapa grande de v3.68 redefinió `forestLeft` contra el corazón y
  // movió las trayectorias, y desde entonces medía **`plague_blame` y `bandits`
  // sin cumplir condiciones nunca** en seis semillas × sesenta años. Se dejó
  // entera y roja en vez de meter las dos en la lista de excepciones, que es lo
  // que el método de `CLAUDE.md` pide: bajar el listón esconde el hallazgo.
  //
  // Lo que la ha puesto verde es la fase 4: **B1 dio al valle un vecino que
  // baja a saquear**, así que ahora hay partidas armadas en el valle y las dos
  // plantillas encuentran su sitio. No se tocó ni una condición del catálogo.
  it(`ninguna plantilla corriente tiene una condición inalcanzable — ${SEEDS.length} semillas × ${YEARS} años`, () => {
    const never = CATALOG
      .filter((t) => !NARROW_NOT_IMPOSSIBLE.includes(t.id))
      .filter((t) => (passes.get(t.id) ?? 0) === 0)
      .map((t) => t.id);
    expect(never, `\`requires\` nunca satisfecho: ${never.join(', ')}`).toEqual([]);
  });

  // `wolf_winter` es el caso que motiva el fichero: exigía `forestLeft > 0.25`
  // y el valle nunca funda ni se queda con más de `MAPGEN.FOREST_FRACTION`
  // (0.20–0.26), así que el umbral estaba por encima de lo que el motor podía
  // dar el día uno y sólo baja desde ahí. Aserto nombrado para que una futura
  // subida de este umbral, o de cualquier otro basado en `forestLeft`, se note
  // aquí y no sólo como una entrada más en la lista genérica de arriba.
  it('`wolf_winter` sale de la lista de las nunca-elegibles: su umbral de bosque es alcanzable', () => {
    // **Y lo es con el 0.25 original, desde el mapa grande** (medido el 15 sep
    // 2026 al fusionar esta rama). La rama lo bajaba a 0.15 porque en el mapa
    // de 36 × 56 el umbral era imposible —el valle fundaba entre 0.20 y 0.26 y
    // `forestLeft` sólo baja—; v3.68 redefinió `forestLeft` contra el corazón
    // productivo y con eso el bosque del mapa entero pasa a dar de sí. Así que
    // el arreglo sobraba: se deshizo el cambio de umbral y **esta prueba pasa
    // sin él**, que es la única manera de saber que sobraba.
    expect(passes.get('wolf_winter') ?? 0).toBeGreaterThan(0);
  });
});
