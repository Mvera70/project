// v5.74 · El pasto de la falda.
//
// Con el valle de forma natural delante (v5.73), Vera eligió que lo que era
// cinturón muerto alrededor del contorno tuviera uso, y uno de los tres fue
// éste: el rebaño sube a pastar a la falda. Y como vida, sin tocar el balance:
// las vacas son las que `state.herd` dice, y sólo cambia dónde pastan. Se mira
// por `createVillage`, que es lo que monta el renderer cada jornada.
//
// Medido al escribirlo, con cuatro vacas en ocho aldeas de seis años: el
// rebaño anclado en la falda en las ocho (64 anclas de 64) y el 82 % de la
// jornada fuera del contorno. La víspera de un asedio vuelven junto a las
// casas (E0a, en `life-preparation.test.ts`).
import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE } from '@engine/state';
import { distanceOutside } from '@engine/world/valley-shape';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';

const SEEDS = [3, 7, 11, 19, 23, 31];

describe('v5.74 · el pasto de la falda', () => {
  it('el rebaño se ancla junto en el prado de fuera del contorno y pasa allí la jornada', () => {
    let anchors = 0;
    let onFalda = 0;
    let samples = 0;
    let outside = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      // Con la política prudente casi ninguna aldea tiene vacas (una muestra
      // de 96, en doce valles hasta los sesenta años): se le ponen cuatro.
      state.herd.cows = 4;
      const before = JSON.stringify(state);
      const away = distanceOutside(state.map.heart);
      const life = createVillage(state, seed * 7 + 2);
      const cows = life.beasts.filter((beast) => beast.kind === 'cow');
      expect(cows, `semilla ${seed}`).toHaveLength(4);
      for (const cow of cows) {
        const cell = Math.floor(cow.anchor.z) * state.map.width + Math.floor(cow.anchor.x);
        anchors += 1;
        if (state.map.heart[cell] === 0 && (away[cell] as number) <= 2
          && state.map.terrain[cell] === TERRAIN_CODE.meadow) onFalda += 1;
      }
      // Juntas: el rebaño, no cuatro vacas cada una en su campo.
      const spread = Math.max(...cows.flatMap((a) => cows.map((b) => Math.hypot(a.anchor.x - b.anchor.x, a.anchor.z - b.anchor.z))));
      expect(spread, `semilla ${seed}: el rebaño separado`).toBeLessThan(8);
      while (life.steps < 900) {
        life.step();
        if (life.steps % 30 !== 0) continue;
        for (const cow of cows) {
          const { x, z } = cow.dweller.body;
          samples += 1;
          if (state.map.heart[Math.floor(z) * state.map.width + Math.floor(x)] === 0) outside += 1;
        }
      }
      expect(JSON.stringify(state), `semilla ${seed}: la jornada escribió en el estado`).toBe(before);
    }
    expect(onFalda, `${onFalda} de ${anchors} vacas ancladas en la falda`).toBeGreaterThanOrEqual(Math.ceil(anchors * 0.9));
    expect(outside / samples, 'parte de la jornada fuera del contorno').toBeGreaterThan(0.5);
  });
});
