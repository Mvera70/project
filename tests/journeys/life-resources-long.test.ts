// Lo lento de `tests/fast/life-resources.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 10 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
import { describe, expect, it } from 'vitest';
import { createVillage } from '../../src/render3d/life/village';
import { foundTwenty } from '../helpers/founding';

describe('IA-15/17/18 · recursos visibles', () => {
  it('los porteadores de madera hacen cola sin compartir una plaza de descarga ni perder el haz', () => {
    const state = foundTwenty(7);
    const before = JSON.stringify(state);
    const life = createVillage(state, 0);
    const mirror = createVillage(foundTwenty(7), 0);
    const store = life.places.find(place => place.id.startsWith('wood-store:'))!;
    const delivery = store.offers.find(offer => offer.id === 'deliver')!;
    expect(life.dwellers.filter(dweller => dweller.dayPlan?.job?.place.startsWith('felling:')).length)
      .toBeGreaterThan(delivery.seats);

    let sawQueue = false;
    // A las diez (fase 0,38) y no a las once: desde el 25 sep 2026 las once son
    // la hora de comer en corro en la plaza, y con los leñadores comiendo no
    // llegan tres haces a la vez. La cola se mide en hora de faena.
    for (let step = 0; step < 4_800; step += 1) {
      life.step(0.38);
      mirror.step(0.38);
      const carriers = life.dwellers.filter(dweller => dweller.holding === -1 - dweller.body.id);
      const unloading = carriers.filter(dweller => dweller.doing?.place.id === store.id
        && dweller.doing.offer.id === 'deliver');
      const seats = unloading.map(dweller => dweller.doing!.seat);
      expect(unloading.length).toBeLessThanOrEqual(delivery.seats);
      expect(new Set(seats).size).toBe(seats.length);
      const waiting = carriers.filter(dweller => dweller.doing?.offer.id === 'pause');
      sawQueue ||= waiting.length > 0;
      expect(carriers.every(dweller => dweller.doing?.offer.id === 'deliver'
        || dweller.doing?.offer.id === 'pause')).toBe(true);
    }
    expect(sawQueue, 'cuando la leñera se llena, el tercer haz espera fuera de su puerta').toBe(true);
    expect(life.timberDeliveries).toBeGreaterThan(delivery.seats);
    expect(life.props.filter(prop => prop.kind === 'bundle' && prop.held === null)).toHaveLength(0);
    expect(mirror.timberDeliveries).toBe(life.timberDeliveries);
    expect(mirror.dwellers.map(dweller => ({
      id: dweller.villager, x: dweller.body.x, z: dweller.body.z, holding: dweller.holding,
      place: dweller.doing?.place.id ?? null, seat: dweller.doing?.seat ?? null,
    }))).toEqual(life.dwellers.map(dweller => ({
      id: dweller.villager, x: dweller.body.x, z: dweller.body.z, holding: dweller.holding,
      place: dweller.doing?.place.id ?? null, seat: dweller.doing?.seat ?? null,
    })));
    expect(JSON.stringify(state)).toBe(before);
  });
});
