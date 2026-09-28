// Las pisadas (28 sep 2026): propiedades del mapa que leen la hierba y la
// nieve. Vera: la hierba se aparta al pisarla, la nieve guarda la huella, y
// una nevada gorda la va tapando.

import { describe, expect, it } from 'vitest';
import { MAX_TRAMPLERS, createTrampleMap, setTramplers, trampleUniforms, SNOW_FROM } from '../../src/render3d/effects/trample';

describe('el mapa de pisadas', () => {
  it('una pisada marca donde se pisa y no al lado, y la hierba se yergue sola en segundos', () => {
    const map = createTrampleMap(72, 112);
    map.stamp(10.5, 20.5, 0.3, 0.5, false);
    expect(map.at(10.5, 20.5).grass).toBeGreaterThan(0.3);
    expect(map.at(12.5, 20.5).grass).toBe(0);
    expect(map.at(10.5, 20.5).snow).toBe(0);
    // Sin nieve, la huella no existe; y la hierba pisada se recupera en unos segundos.
    map.step(30, 0.3, false, 0);
    expect(map.at(10.5, 20.5).grass).toBe(0);
    map.dispose();
  });

  it('con nieve la huella se queda; nevando se tapa; al deshelarse se va', () => {
    const map = createTrampleMap(72, 112);
    map.stamp(30.5, 40.5, 0.3, 0.6, true);
    const fresh = map.at(30.5, 40.5).snow;
    expect(fresh).toBeGreaterThan(0.3);
    // Un minuto sin nevar: la hierba de debajo se yergue, la huella sigue.
    map.step(60, 0.3, false, 0.6);
    expect(map.at(30.5, 40.5).grass).toBe(0);
    expect(map.at(30.5, 40.5).snow).toBe(fresh);
    // Nevando, la huella se va tapando y en unos minutos no queda.
    map.step(45, 0.3, true, 0.6);
    expect(map.at(30.5, 40.5).snow).toBeLessThan(fresh);
    map.step(120, 0.3, true, 0.6);
    expect(map.at(30.5, 40.5).snow).toBe(0);
    // Y el deshielo se lleva lo que hubiera.
    map.stamp(30.5, 40.5, 0.3, 0.6, true);
    map.step(1, 0.3, false, SNOW_FROM + 0.1);
    map.step(1, 0.3, false, 0);
    expect(map.at(30.5, 40.5).snow).toBe(0);
    map.dispose();
  });

  it('los que apartan la hierba en vivo son los primeros de la lista, hasta el tope del sombreador', () => {
    const many = Array.from({ length: MAX_TRAMPLERS + 5 }, (_, i) => ({ x: i, z: 2 * i, radius: 0.4 }));
    setTramplers(many);
    const u = trampleUniforms();
    expect(u.uTramplerCount.value).toBe(MAX_TRAMPLERS);
    expect(u.uTramplers.value[0]!.x).toBe(0);
    expect(u.uTramplers.value[MAX_TRAMPLERS - 1]!.y).toBe(2 * (MAX_TRAMPLERS - 1));
    setTramplers([]);
    expect(u.uTramplerCount.value).toBe(0);
  });
});
