// v5.85 · La fauna por estaciones: que cada estación del valle se note en sus
// animales, sin que el motor se entere. Las propiedades son las cuatro que
// eligió Vera (2 oct 2026), sumando varias semillas y nunca una.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import type { GameState, Season } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { valleyCore } from '@derive/anchors';
import { faunaSeason, pollinatorSpots, storkSpots } from '@derive/seasonal-fauna';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { createRabbits } from '../../src/render3d/life/rabbits';
import { terrainOf } from '../../src/render3d/life/terrain';
import { BoxGeometry, Camera, Group, Mesh, MeshStandardMaterial } from 'three';
import { birdsAt, cranesAt, createAmbience } from '../../src/render3d/effects/ambience';
import { createSeasonalFauna } from '../../src/render3d/effects/seasonal-fauna';

const SEEDS = [7, 11, 23, 41];
const ORDER: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** La misma aldea, a mitad de la estación pedida del primer año. */
function inSeason(state: GameState, season: Season): GameState {
  return { ...state, tick: ORDER.indexOf(season) * TIME.WEEKS_PER_SEASON + 6 };
}

/** Lo que se deja ver de la caza: ciervos y jabalíes de la vida, y los conejos que saldrán. */
function visibleGame(state: GameState): { count: number; deerGap: number[] } {
  const village = createVillage(state, 0);
  const core = valleyCore(state);
  const wild = village.wildlife.filter((animal) => animal.kind === 'deer' || animal.kind === 'boar');
  const deerGap = village.wildlife.filter((animal) => animal.kind === 'deer')
    .map((animal) => Math.hypot(animal.x - core.x, animal.y - core.y));
  const rabbits = createRabbits(state, village.land, state.seed, { x: core.x, z: core.y }).length;
  village.dispose();
  return { count: wild.length + rabbits, deerGap };
}

describe('v5.85 · la fauna por estaciones', () => {
  it('en primavera hay crías detrás de las madres que existen, y en verano ya no', () => {
    let young = 0, mothersWithYoung = 0;
    for (const seed of SEEDS) {
      const spring = inSeason(foundTwenty(seed), 'spring');
      const before = JSON.stringify(spring);
      const village = createVillage(spring, 0);
      for (let step = 0; step < 240; step += 1) village.step();
      const mothers = [...village.beasts.map((beast) => ({ kind: beast.kind, x: beast.dweller.body.x, z: beast.dweller.body.z })),
        ...village.wildlife.filter((animal) => animal.kind === 'deer').map((animal) => ({ kind: 'deer', x: animal.x, z: animal.y }))];
      const seen = new Set<string>();
      for (const cub of village.young) {
        young += 1;
        expect(cub.scale).toBeLessThan(1);
        // Cada cría es de una clase de madre que la aldea tiene, y va pegada a una.
        const near = mothers.filter((mother) => mother.kind === cub.kind
          && Math.hypot(mother.x - cub.x, mother.z - cub.y) < 1.4);
        expect(near.length).toBeGreaterThan(0);
        seen.add(`${cub.kind}:${Math.round(near[0]!.x * 10)}`);
      }
      // La primera cierva lleva siempre su cervatillo, si hay ciervos.
      if (village.wildlife.some((animal) => animal.kind === 'deer')) {
        expect(village.young.some((cub) => cub.kind === 'deer')).toBe(true);
      }
      // Sin cerdos en la cabaña, ningún lechón.
      if (spring.herd.pigs === 0) expect(village.young.some((cub) => cub.kind === 'pig')).toBe(false);
      mothersWithYoung += seen.size;
      const ids = [...village.wildlife, ...village.young].map((animal) => animal.id)
        .concat(village.beasts.map((beast) => beast.dweller.body.id));
      expect(new Set(ids).size).toBe(ids.length);
      expect(JSON.stringify(spring)).toBe(before);
      village.dispose();

      const summer = createVillage(inSeason(foundTwenty(seed), 'summer'), 0);
      expect(summer.young).toHaveLength(0);
      summer.dispose();
    }
    expect(young).toBeGreaterThan(SEEDS.length);
    expect(mothersWithYoung).toBeGreaterThanOrEqual(SEEDS.length);
  });

  it('las crías son deterministas: la misma jornada da las mismas', () => {
    const state = inSeason(foundTwenty(7), 'spring');
    const a = createVillage(state, 3), b = createVillage(state, 3);
    for (let step = 0; step < 120; step += 1) { a.step(); b.step(); }
    expect(a.young).toEqual(b.young);
    a.dispose(); b.dispose();
  });

  it('en invierno hay menos caza a la vista que en verano, y el ciervo baja hacia la aldea', () => {
    let summer = 0, winter = 0;
    const summerGap: number[] = [], winterGap: number[] = [];
    for (const seed of SEEDS) {
      const base = foundTwenty(seed);
      const s = visibleGame(inSeason(base, 'summer'));
      const w = visibleGame(inSeason(base, 'winter'));
      summer += s.count; winter += w.count;
      summerGap.push(...s.deerGap); winterGap.push(...w.deerGap);
    }
    expect(winter).toBeLessThan(summer);
    const mean = (list: number[]): number => list.reduce((sum, n) => sum + n, 0) / Math.max(1, list.length);
    expect(winterGap.length).toBeGreaterThan(0);
    expect(mean(winterGap)).toBeLessThan(mean(summerGap));
  });

  it('en otoño salen jabalíes a la linde del bosque, y en verano no', () => {
    let autumn = 0;
    for (const seed of SEEDS) {
      const state = inSeason(foundTwenty(seed), 'autumn');
      const village = createVillage(state, 0);
      const boars = village.wildlife.filter((animal) => animal.kind === 'boar');
      autumn += boars.length;
      // `Fauna` indexa por id entre especies: un jabalí con el id del perro
      // sería el perro con otra piel (pasó en la primera versión, 44 000).
      const ids = [...village.wildlife, ...village.young].map((animal) => animal.id)
        .concat(village.beasts.map((beast) => beast.dweller.body.id));
      expect(new Set(ids).size).toBe(ids.length);
      const { width, terrain } = state.map;
      for (const boar of boars) {
        // Hoza en el prado, con bosque a unos pasos (en su cuadro de nueve: puede haberse movido).
        const x = Math.floor(boar.x), z = Math.floor(boar.y);
        let trees = 0;
        for (let dz = -4; dz <= 4; dz += 1) for (let dx = -4; dx <= 4; dx += 1) {
          if (terrain[(z + dz) * width + x + dx] === TERRAIN_CODE.forest) trees += 1;
        }
        expect(trees).toBeGreaterThan(0);
      }
      village.dispose();
      const summer = createVillage(inSeason(foundTwenty(seed), 'summer'), 0);
      expect(summer.wildlife.some((animal) => animal.kind === 'boar')).toBe(false);
      summer.dispose();
    }
    expect(autumn).toBeGreaterThanOrEqual(SEEDS.length);
  });

  it('las golondrinas son de primavera y verano, y las grullas se van en otoño', () => {
    expect(birdsAt(11, 'clear', 'spring')).toBe(1);
    expect(birdsAt(11, 'clear', 'summer')).toBe(1);
    expect(birdsAt(11, 'clear', 'autumn')).toBe(0);
    expect(birdsAt(11, 'clear', 'winter')).toBe(0);
    for (const season of ORDER) {
      expect(cranesAt(11, 'clear', season) > 0).toBe(season === 'autumn');
    }
    // Y en el camino vivo: con el pájaro de Astra, el cielo de cada estación.
    const bird = new Group();
    for (const name of ['bird_body', 'bird_wing_l', 'bird_wing_r']) {
      const part = new Mesh(new BoxGeometry(0.05, 0.01, 0.02), new MeshStandardMaterial());
      part.name = name;
      bird.add(part);
    }
    const sky: Record<string, { birds: number; cranes: number }> = {};
    for (const season of ORDER) {
      const ambience = createAmbience(foundTwenty(11).map, bird);
      ambience.step(0.45, season, 'clear', 0.1, new Camera());
      sky[season] = { birds: ambience.visible.birds, cranes: ambience.visible.cranes };
      ambience.dispose();
    }
    expect(sky.spring!.birds).toBeGreaterThan(0);
    expect(sky.summer!.birds).toBeGreaterThan(0);
    expect(sky.autumn).toEqual({ birds: 0, cranes: 15 });
    expect(sky.winter).toEqual({ birds: 0, cranes: 0 });
  });

  it('las cigüeñas y las mariposas se ven en su estación y no en invierno', () => {
    const shown = { storks: 0, butterflies: 0, bees: 0 };
    for (const seed of SEEDS) {
      for (const season of ['summer', 'winter'] as const) {
        const state = inSeason(foundTwenty(seed), season);
        const effect = createSeasonalFauna();
        // Mediodía (la fase 0,5 son las doce y media) con cielo raso.
        effect.update(state, 0.5, 'clear', 30, () => 0);
        if (season === 'winter') {
          expect(effect.visible).toEqual({ storks: 0, butterflies: 0, bees: 0 });
        } else {
          shown.storks += effect.visible.storks;
          shown.butterflies += effect.visible.butterflies;
          shown.bees += effect.visible.bees;
        }
        effect.dispose();
      }
      expect(storkSpots(foundTwenty(seed)).every((spot) => Number.isFinite(spot.x))).toBe(true);
    }
    expect(shown.storks).toBeGreaterThan(0);
    expect(shown.butterflies).toBeGreaterThan(0);
    expect(shown.bees).toBeGreaterThan(0);
  });

  it('la estación sale del estado y nada de esto toca la partida', () => {
    const state = foundTwenty(7);
    const before = JSON.stringify(state);
    for (const season of ORDER) expect(faunaSeason(inSeason(state, season)).season).toBe(season);
    pollinatorSpots(state); storkSpots(state);
    const land = terrainOf(state);
    expect(land.width).toBe(state.map.width);
    expect(JSON.stringify(state)).toBe(before);
  });
});
