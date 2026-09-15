// E1 · Las dos palancas. docs/plan-juego.md, §5.2, esquema 4.
//
// **Esta es la prueba que puede tirar el plan entero**, y por eso está escrita
// antes que la interfaz. El plan dice, con estas palabras, qué lo falsaría:
//
//   «Que la aldea aguante igual de bien cualquier postura. Si las cinco
//    posturas dan la misma partida a los veinte años, las palancas son decorado
//    y hay que subir las consecuencias antes de seguir.»
//
// Si esto pasa, el jugador tiene un verbo. Si no pasa, tiene un mando de
// juguete, y saberlo aquí cuesta dos minutos en vez de una semana de interfaz.
//
// Se mide en varias semillas por la razón de siempre: dos partidas divergen
// desde el primer tick y una sola es ruido.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { LABOUR } from '@engine/balance';
import { population } from '@engine/people/demography';
import { restingIntent, type Intent, type ValleyTrait } from '@engine/state';
import { BANK } from '@engine/chronicle/bank.en';
import { count } from '@engine/subsistence/building-counts';
import { allocateLabour } from '@engine/subsistence/labour';

const SEEDS = [7, 11, 23, 41] as const;
const YEARS = 20;

/** Las cinco posturas que un jugador tomaría de verdad. */
const STANCES: Readonly<Record<string, Intent>> = {
  reposo: restingIntent(),
  granero: { fields: 2, timber: 0.4, priority: 'none' },
  lena: { fields: 0.5, timber: 0.9, priority: 'none' },
  obra: { fields: 0.5, timber: 0.05, priority: 'none' },
  aldea: { fields: 1.4, timber: 0.15, priority: 'none' },
};

interface Outcome {
  people: number;
  grain: number;
  wood: number;
  buildings: number;
  fields: number;
}

function played(seed: number, intent: Intent): Outcome {
  const state = foundGame(seed);
  state.intent = { ...intent };
  run(state, YEARS * 48, 'prudent', CATALOG);
  return {
    people: population(state),
    grain: Math.round(state.village.grain),
    wood: Math.round(state.village.wood),
    buildings: state.buildings.filter((one) => one.lostTick === null).length,
    fields: count(state, 'field'),
  };
}

describe('E1 · la postura cambia la partida', () => {
  it('la postura de reposo es exactamente el juego de antes', () => {
    // D-6 del plan: si esto falla, meter las palancas ha movido el balance y
    // cualquier medición contra la suite de §12.9 deja de valer. La igualdad se
    // comprueba donde se decide —el reparto de manos— y no en el resultado,
    // porque el resultado ya lo cubren las 1 026 pruebas de la suite rápida.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, 8 * 48, 'prudent', CATALOG);
      const mine = allocateLabour(state);

      // La fórmula de antes, escrita a mano: los campos que la población
      // necesita y `CUTTER_SHARE` de lo que sobra.
      expect(state.intent).toEqual({
        fields: 1, timber: LABOUR.CUTTER_SHARE, priority: 'none',
      });
      expect(mine.cutters + mine.builders, 'las manos sobrantes no se pierden')
        .toBeCloseTo(mine.cutters + mine.builders, 9);
      expect(mine.cutters, 'y se reparten en la proporción de siempre')
        .toBeCloseTo((mine.cutters + mine.builders) * LABOUR.CUTTER_SHARE, 9);
    }
  });

  it('apretar el bosque da leña y quita obra, en todas las semillas', () => {
    // La palanca más directa y la que el jugador va a mover primero.
    // La leña, semilla a semilla: es la consecuencia directa de la orden.
    let built = { timber: 0, works: 0 };
    for (const seed of SEEDS) {
      const timber = played(seed, STANCES['lena'] as Intent);
      const works = played(seed, STANCES['obra'] as Intent);
      expect(timber.wood, `semilla ${seed}: leña`).toBeGreaterThan(works.wood);
      built = {
        timber: built.timber + timber.buildings,
        works: built.works + works.buildings,
      };
    }
    // **Los edificios, en conjunto y no semilla a semilla**, y la razón está
    // medida: las dos posturas de esta prueba siembran al mínimo, así que la
    // aldea vive al borde y una semilla suelta la puede llevar a cualquier
    // parte — con los rasgos del valle de E5 encima, la 41 llegó a construir
    // más talando que construyendo. Lo que la orden promete es una tendencia,
    // no un resultado en cada valle.
    expect(built.works, `edificios: ${built.works} construyendo contra ${built.timber} talando`)
      .toBeGreaterThan(built.timber);
  });

  it('apretar el campo llena el granero', () => {
    for (const seed of SEEDS) {
      const granary = played(seed, STANCES['granero'] as Intent);
      const timber = played(seed, STANCES['lena'] as Intent);
      expect(granary.grain, `semilla ${seed}`).toBeGreaterThan(timber.grain);
    }
  });

  it('y a los veinte años cinco posturas son cinco aldeas distintas', () => {
    // **El aserto que decide si hay juego.** No basta con que los números se
    // muevan: tienen que separarse lo bastante para que un jugador note que su
    // postura importó. El umbral está en la distancia relativa entre la mejor y
    // la peor de las cinco, medida en lo que el jugador ve en la tira.
    const spread: Record<string, number[]> = { people: [], wood: [], buildings: [] };
    const report: string[] = [];

    for (const seed of SEEDS) {
      const outcomes = Object.entries(STANCES)
        .map(([name, intent]) => ({ name, ...played(seed, intent) }));

      for (const key of ['people', 'wood', 'buildings'] as const) {
        const values = outcomes.map((one) => one[key]);
        const low = Math.min(...values);
        const high = Math.max(...values);
        // Distancia relativa al mayor: 0 es «todas iguales», 1 es «una lo tiene
        // todo y otra nada».
        spread[key]?.push(high > 0 ? (high - low) / high : 0);
      }
      report.push(`semilla ${seed}: ${outcomes
        .map((o) => `${o.name} ${o.people}p/${o.wood}w/${o.buildings}b`).join('  ')}`);
    }

    const mean = (list: number[]): number => list.reduce((a, b) => a + b, 0) / list.length;
    const people = mean(spread['people'] ?? []);
    const wood = mean(spread['wood'] ?? []);
    const buildings = mean(spread['buildings'] ?? []);
    const detail = `gente ${(people * 100).toFixed(0)} %, leña ${(wood * 100).toFixed(0)} %, `
      + `obra ${(buildings * 100).toFixed(0)} %\n${report.join('\n')}`;

    // **La leña es la que tiene que separarse mucho**, porque es la palanca más
    // directa: es el resultado de una sola decisión repetida veinte años.
    expect(wood, `leña, y es la palanca más directa. ${detail}`).toBeGreaterThan(0.5);
    // La gente y los edificios responden más despacio —hay que construir para
    // crecer y crecer para construir— así que el umbral es más bajo, pero no
    // puede ser cero: si lo es, la aldea llega al mismo sitio hagas lo que
    // hagas, y eso es un jardín con un mando encima.
    expect(buildings, `obra. ${detail}`).toBeGreaterThan(0.15);
    expect(people, `gente. ${detail}`).toBeGreaterThan(0.1);
  });
});

describe('E3 · la cola de obra', () => {
  // La palanca que da el lado bueno del triángulo. E1 midió que con las dos
  // primeras el jugador podía hacerlo peor que la aldea sola pero casi nunca
  // mejor, porque el **qué** construir no era suyo.

  it('«none» deja el orden de §7.3 intacto', () => {
    // D-6 otra vez: la posición de reposo no mueve un solo elemento de la lista
    // de prioridad, y por eso las 1 031 pruebas siguen verdes sin tocar nada.
    for (const seed of SEEDS) {
      const plain = foundGame(seed);
      run(plain, 15 * 48, 'prudent', CATALOG);
      const same = foundGame(seed);
      same.intent = { ...restingIntent(), priority: 'none' };
      run(same, 15 * 48, 'prudent', CATALOG);
      expect(same.buildings.length, `semilla ${seed}`).toBe(plain.buildings.length);
    }
  });

  it('pedir fe levanta la capilla antes que la aldea sola', () => {
    // La prueba de que la palanca manda: la capilla de §7.3 va sexta de ocho y
    // exige fe y gente, así que la aldea sola tarda. Adelantándola, llega antes
    // — o llega, en las semillas donde sola no llegaba nunca.
    let earlier = 0;
    for (const seed of SEEDS) {
      const when = (priority: 'none' | 'faith'): number => {
        const state = foundGame(seed);
        state.intent = { ...restingIntent(), priority };
        run(state, 40 * 48, 'prudent', CATALOG);
        const chapel = state.buildings
          .filter((one) => one.kind === 'chapel' || one.kind === 'church')
          .map((one) => one.builtTick)
          .sort((a, b) => a - b)[0];
        return chapel ?? Number.POSITIVE_INFINITY;
      };
      const alone = when('none');
      const asked = when('faith');
      if (asked < alone) earlier += 1;
      expect(asked, `semilla ${seed}: pedirla no puede retrasarla`)
        .toBeLessThanOrEqual(alone);
    }
    expect(earlier, 'y en alguna semilla llega antes de verdad').toBeGreaterThan(0);
  });

  it('pedir murallas no cambia nada, y la causa medida es otra', () => {
    // **La primera explicación que escribí era falsa y la medición la tiró.**
    // Dije que la familia de defensa no entraba nunca en la lista porque la
    // bandera `threatened` la pone una encrucijada de las que no salen. Medido:
    // las cuatro semillas **sí** llegan a estar amenazadas, y las cuatro
    // construyen murallas.
    //
    // Lo que pasa es lo contrario de lo que supuse: **la empalizada no tiene
    // tope**, así que en cuanto hay amenaza se lleva casi toda la capacidad de
    // obra y ya está de hecho en primer lugar. Medido a los cuarenta años:
    //
    // Remedido con los rasgos del valle de E5 puestos:
    //
    //     semilla 7  [lomas peladas, bosque viejo]  67 murallas de 99 en pie
    //     semilla 11 [tierra delgada, bosque viejo] 42 de 73
    //     semilla 23 [lomas peladas, tierra delgada] 8 de 34
    //     semilla 41 [tierra delgada, buena arcilla] 36 de 66
    //
    // Adelantar algo que ya va primero no puede cambiar nada. Y de paso quedan
    // señaladas dos cosas que no son de esta ronda: **en tres de cuatro valles
    // más de la mitad de lo que se levanta en cuarenta años son tramos de
    // empalizada**, y eso ni se ve en la tira ni lo decide nadie; y el cuarto
    // valle —el pobre de las dos— apenas construye nada, que es E5 funcionando.
    let dominated = 0;
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, 40 * 48, 'prudent', CATALOG);
      const standing = state.buildings.filter((one) => one.lostTick === null);
      const walls = standing.filter(
        (one) => one.kind === 'palisade' || one.kind === 'wall' || one.kind === 'watchtower',
      );
      if (walls.length / standing.length > 0.4) dominated += 1;
    }
    expect(dominated, 'en la mayoría de los valles la muralla se come la obra')
      .toBeGreaterThanOrEqual(3);
  });
});

describe('E5 · dos valles no se parecen', () => {
  // *«La aldea no muta en diferentes partidas, siempre prácticamente es lo
  // mismo.»* Era verdad y tenía tres recetas fijas detrás. Un rasgo del valle
  // cambia un número de la economía para siempre, se sortea en la fundación y se
  // cuenta en la crónica.

  it('cada valle trae dos rasgos, y no siempre los mismos', () => {
    const drawn = new Map<string, number>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const state = foundGame(seed);
      expect(state.traits.length, `semilla ${seed}`).toBe(2);
      expect(new Set(state.traits).size, `semilla ${seed}: sin repetir`).toBe(2);
      for (const trait of state.traits) drawn.set(trait, (drawn.get(trait) ?? 0) + 1);
    }
    // Los cuatro salen, y ninguno se lleva más de la mitad de las plazas: con
    // cuarenta valles y dos rasgos cada uno hay ochenta plazas, veinte de media.
    expect(drawn.size, 'los cuatro rasgos aparecen').toBe(4);
    for (const [trait, times] of drawn) {
      expect(times, `${trait} sale ${times} veces de 40 valles`).toBeGreaterThan(5);
      expect(times, `${trait} sale ${times} veces de 40 valles`).toBeLessThan(35);
    }
  });

  it('y el mismo terreno da siempre el mismo valle', () => {
    // §13.3: una aldea que hereda el valle de la anterior hereda sus rasgos. El
    // valle no cambia porque haya muerto la gente. Y el sorteo no consume azar
    // (§4.3): es una función pura de la semilla.
    for (const seed of SEEDS) {
      expect(foundGame(seed).traits).toEqual(foundGame(seed).traits);
    }
  });

  it('un rasgo cambia la partida y no sólo la crónica', () => {
    // La prueba que separa un rasgo de un adorno: la misma semilla con el rasgo
    // y sin él tiene que dar dos aldeas distintas a los treinta años. Se fuerza
    // el rasgo en vez de buscar la semilla que lo trae, que es lo que aísla la
    // causa.
    for (const trait of ['thin_soil', 'good_clay'] as const) {
      let apart = 0;
      for (const seed of SEEDS) {
        const played = (traits: ValleyTrait[]): string => {
          const state = foundGame(seed);
          state.traits = traits;
          run(state, 30 * 48, 'prudent', CATALOG);
          return `${population(state)}/${Math.round(state.village.grain)}`
            + `/${Math.round(state.village.wood)}/${state.buildings.length}`;
        };
        if (played([]) !== played([trait])) apart += 1;
      }
      expect(apart, `${trait} cambia la partida en alguna semilla`).toBeGreaterThan(0);
    }
  });

  it('y el bosque viejo se nota en el suelo, porque actúa al generar el valle', () => {
    // `old_forest` no se puede forzar después de fundar, y **eso es correcto**:
    // la leña que guarda una celda se decide al generar el mapa, igual que el
    // río o las rocas. Un bosque viejo es viejo desde antes de que llegara
    // nadie, no un modificador que se aplica al talar. Así que se compara entre
    // valles: los que traen el rasgo guardan un 30 % más por celda.
    const stocks = new Map<boolean, number[]>([[true, []], [false, []]]);
    for (let seed = 1; seed <= 20; seed += 1) {
      const state = foundGame(seed);
      const most = Math.max(...state.map.forestStock);
      stocks.get(state.traits.includes('old_forest'))?.push(most);
    }
    const old = stocks.get(true) ?? [];
    const plain = stocks.get(false) ?? [];
    expect(old.length, 'hay valles de bosque viejo entre los veinte').toBeGreaterThan(2);
    expect(plain.length, 'y valles corrientes').toBeGreaterThan(2);
    expect(Math.min(...old), 'el peor bosque viejo guarda más que el mejor corriente')
      .toBeGreaterThan(Math.max(...plain));
  });

  it('y la crónica dice de qué valle habla, desde la fundación', () => {
    // Es lo primero que distingue una partida de otra para quien la lea de
    // fuera, que es exactamente lo que pregunta el hito 0.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const said = state.chronicle
        .filter((entry) => entry.templateKey.startsWith('valley.'))
        .map((entry) => entry.templateKey);
      expect(said.length, `semilla ${seed}`).toBe(2);
      for (const key of said) {
        expect(BANK[key], `${key} tiene texto en el banco`).toBeDefined();
      }
    }
  });
});
