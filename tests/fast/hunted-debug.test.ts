// AN-4b · La ruta de depuración que abre las cazas y la visita del oso.
//
// El observatorio no podía grabar ni la visita del oso ni una caza de conejo
// o de jabalí: la primera sólo nace superado el jabalí (`createBear`) y el
// motor ofrece cada presa sólo cuando las anteriores están cazadas
// (`HUNT_ORDER`). `?hunted=` y `?happening=bear_in_the_wood` ponen el valle en
// ese estado. Lo que se guarda aquí es la propiedad: dar por cazada una especie
// abre la siguiente y sólo la siguiente, y el oso de la visita nace con el
// jabalí cazado y el suceso, y no sin cualquiera de los dos.
import { describe, expect, it } from 'vitest';
import { happenNow, huntedNow } from '../../src/ui/debug';
import { huntOpportunity } from '@engine/world/hunting';
import { valleyCore } from '@derive/anchors';
import { createBear } from '../../src/render3d/life/bear';
import { terrainOf } from '../../src/render3d/life/terrain';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [7, 11, 23] as const;

describe('AN-4b · &hunted= y la visita del oso', () => {
  it('marca sólo especies de caza, como las marca el cobro', () => {
    const state = foundTwenty(7);
    huntedNow(state, ['partridge', 'dragon']);
    expect(state.flags['hunt:partridge']).toBe(0);
    expect(state.flags['hunt:dragon']).toBeUndefined();
  });

  it('dar por cazada una especie abre la siguiente y sólo la siguiente', () => {
    let rabbits = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const species = (s: typeof state): string | undefined => huntOpportunity(s)?.species;
      const weeks = Array.from({ length: 120 }, (_, n) => ({ ...state, tick: state.tick + n }));
      // Sin nada cazado, nunca pasa de la perdiz.
      expect(weeks.every(week => [undefined, 'partridge'].includes(species(week)))).toBe(true);
      huntedNow(state, ['partridge']);
      const opened = weeks.map(week => species({ ...week, flags: state.flags }));
      expect(opened.every(one => [undefined, 'partridge', 'rabbit'].includes(one))).toBe(true);
      rabbits += opened.filter(one => one === 'rabbit').length;
    }
    expect(rabbits).toBeGreaterThan(0);
  });

  it('el oso de la visita nace con el jabalí cazado y el suceso, y no sin uno de los dos', () => {
    let born = 0;
    for (const seed of SEEDS) {
      const make = (boar: boolean, bear: boolean) => {
        const state = foundTwenty(seed);
        if (boar) huntedNow(state, ['partridge', 'rabbit', 'deer', 'boar']);
        if (bear) happenNow(state, 'bear_in_the_wood');
        const core = valleyCore(state);
        return createBear(state, terrainOf(state), { x: core.x, z: core.y });
      };
      expect(make(false, true), `semilla ${seed}: sin jabalí cazado`).toBeNull();
      expect(make(true, false), `semilla ${seed}: sin el suceso`).toBeNull();
      if (make(true, true) !== null) born += 1;
    }
    expect(born).toBeGreaterThan(0);
  });
});
