// Lo lento de `tests/fast/ui.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 132 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { UI_BANK } from '@engine/chronicle/bank.en';
import { CATALOG } from '@engine/crossroads/catalog';
import { isHere } from '@engine/people/demography';
import { run } from '@engine/sim';

describe('U-08 · la pantalla People', () => {
  it('el banco cubre todo rasgo y todo oficio que una partida de verdad pueda enseñar', () => {
    // CLAUDE.md: los umbrales, y aquí la cobertura misma, nunca se comprueban
    // con una sola semilla — varias partidas de sesenta años, con políticas
    // distintas para que la crianza de oficios y rasgos no sea siempre la
    // misma carrera de encrucijadas.
    const seeds: Array<[number, 'first' | 'last' | 'worst' | 'prudent']> = [
      [7, 'first'], [11, 'last'], [23, 'worst'], [41, 'prudent'], [59, 'first'], [101, 'last'],
    ];
    const seenTraits = new Set<string>();
    const seenRoles = new Set<string>();
    for (const [seed, policy] of seeds) {
      const state = foundTwenty(seed);
      run(state, 60 * TIME.WEEKS_PER_YEAR, policy, CATALOG);
      // Toda la partida, no sólo quien sigue vivo al final: la lista de U-08
      // sólo enseña a los nombrados vivos en cada momento, pero el rasgo y el
      // oficio que llegan a pantalla en algún instante de la partida son
      // exactamente los de cualquiera que haya pasado por named+isHere.
      for (const v of state.people.villagers) {
        if (!v.named) continue;
        for (const trait of v.traits) seenTraits.add(trait);
        if (v.role !== null) seenRoles.add(v.role);
      }
    }
    // La corrida tiene que haber tocado más de un rasgo y más de un oficio,
    // o la prueba estaría comprobando una lista vacía sin darse cuenta.
    expect(seenTraits.size).toBeGreaterThan(3);
    expect(seenRoles.size).toBeGreaterThan(1);

    const missingTraits = [...seenTraits].filter((trait) => UI_BANK[`trait.${trait}`] === undefined);
    const missingRoles = [...seenRoles].filter((role) => UI_BANK[`role.${role}`] === undefined);
    expect(missingTraits).toEqual([]);
    expect(missingRoles).toEqual([]);
  });

  it('la lista sólo enseña a los nombrados vivos, y su edad y oficio salen del banco', () => {
    // Con los veinte de §12.2 y no con la pareja: la prueba pide nombrados
    // vivos **y** nombrados muertos a los veinte años, y desde R-1 §2.6 una
    // pareja no siempre llega hasta ahí.
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
    const living = state.people.villagers.filter((v) => v.named && isHere(v));
    expect(living.length).toBeGreaterThan(0);
    for (const v of living) {
      if (v.role !== null) expect(UI_BANK[`role.${v.role}`]).toBeTruthy();
      for (const trait of v.traits) expect(UI_BANK[`trait.${trait}`]).toBeTruthy();
    }
    // Nadie que haya muerto o se haya ido aparece en la lista de nombrados
    // vivos: es lo que separa U-08 de recorrer `state.people.villagers` a
    // secas.
    const dead = state.people.villagers.filter((v) => v.named && !isHere(v));
    expect(dead.length).toBeGreaterThan(0);
    for (const v of dead) expect(living).not.toContain(v);
  });
});
