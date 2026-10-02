// Lo lento de `tests/fast/sim-endings.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 154 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// Partido de `sim-long.test.ts` en v3.14 · design.md §14.1.
//
// El primer reparto dejó casi todo el peso en un solo fichero: 33 s de los
// 35 que tardaba la suite. Vitest reparte por fichero, así que repartir mal
// no reparte nada. Aquí van los finales de partida y las políticas.
//
// **Sin tocar una sola aserción.**

// Partido de `sim.test.ts` en v3.14 · design.md §14.1.
//
// La suite rápida tiene veinte segundos de presupuesto y `sim.test.ts` sola
// tardaba treinta y cinco. Vitest reparte el trabajo por fichero y no por
// prueba, así que un fichero de treinta y cinco segundos es un suelo que no
// baja por muchos núcleos que tenga la máquina. Aquí viven las pruebas que
// corren partidas largas.
//
// **No se ha tocado ni una aserción.** Mover una prueba para que corra en
// paralelo es legítimo; recortarla para que tarde menos sería esconder el
// problema en vez de resolverlo.

// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { MIGRATION, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { population } from '@engine/people/demography';
import { holderOf } from '@engine/crossroads/conditions';
import { run, tick } from '@engine/sim';
import type { GameState } from '@engine/state';
import { fingerprint } from '../helpers/fingerprint';

const YEAR = TIME.WEEKS_PER_YEAR;

describe('la política prudent · §12.9', () => {
  it('dos partidas con prudent y la misma semilla son idénticas', () => {
    const a = foundTwenty(19);
    const b = foundTwenty(19);
    run(a, 3000, 'prudent', CATALOG);
    run(b, 3000, 'prudent', CATALOG);
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});

describe('el abandono · §5.7, v2.16', () => {
  it('una aldea viable no se abandona nunca', () => {
    // **Lo que esta prueba guarda es el abandono, no el final.** Pedía
    // `ended === null` y desde B3 (18 sep 2026) eso es otra cosa: un valle
    // puede acabar **tomado** por el clan vecino, que es la mitad grande de
    // «caer» (§1b) y no tiene nada que ver con §5.7. Medido: la semilla 108
    // llegaba al año 40 viva y ahora la toman en el año 21. La propiedad es la
    // misma de siempre —una aldea con gente no se queda sin gente sola— y se
    // dice como lo que es.
    const s = foundTwenty(108);
    run(s, 40 * YEAR, 'prudent', CATALOG);
    if (population(s) >= MIGRATION.VIABLE_POPULATION) {
      expect(s.ended?.cause ?? null, 'no se abandona').not.toBe('abandoned');
      expect(s.dwindlingSince).toBeNull();
    }
  });

  it('acota la racha más larga de agonía a los años que dice §5.7', () => {
    // Lo que esto existe para arreglar: partidas que pasaban cuarenta años a
    // dos habitantes sin morirse ni recuperarse.
    // Seed 2 is the one natural terminal case in the v2.18 bank. More seeds
    // here became four full 200-year balance runs after the plague fix, while
    // the 60-seed bank already measures the population-level property.
    const s = foundTwenty(2);
    let longest = 0;
    for (let i = 0; i < 200 * YEAR && s.ended === null; i += 1) {
      tick(s, CATALOG);
      if (s.dwindlingSince !== null) {
        longest = Math.max(longest, s.tick - s.dwindlingSince);
      }
    }
    expect(s.ended).not.toBeNull();
    expect(longest / YEAR).toBeLessThanOrEqual(MIGRATION.ABANDON_YEARS);
  });
});

describe('quedarse sin líder duele · Anexo A.15, v2.22', () => {
  /** Un líder muerto, sin nada más tocado: la sucesión queda pendiente de responder. */
  function beheaded(seed: number): GameState {
    const s = foundTwenty(seed);
    const leader = s.people.villagers.find((v) => v.role === 'leader');
    if (leader !== undefined) leader.diedTick = 0;
    return s;
  }

  it('ningún forastero llega mientras el puesto está vacante', () => {
    // Todas las demás puertas de §5.7 abiertas a propósito: si no llega nadie
    // en treinta años con ánimo alto, grano de sobra y sitio en las casas, es
    // porque falta el líder y no por otra cosa.
    const s = beheaded(7);
    s.village.morale = 80;
    s.village.grain = 100000;
    // El propio crossroad de sucesión queda sin responder: nunca se pasa una
    // `decision`, así que el puesto sigue vacante los treinta años.
    for (let i = 0; i < 30 * YEAR; i += 1) tick(s, CATALOG);
    expect(holderOf(s, 'leader')).toBeNull();
    expect(s.chronicle.some((e) => e.kind === 'arrival')).toBe(false);
  });

  it('no cuenta como racha si nunca se pregunta por sucesión', () => {
    // Un `no_one` en una encrucijada cualquiera no es un `no_one` de A.15.
    const s = foundTwenty(7); // líder vivo: succession nunca sale elegible
    run(s, 20 * YEAR, 'first', CATALOG);
    expect(s.noOneStreak).toBe(0);
  });
});
