import { describe, expect, it } from 'vitest';
import { TIME, WORLD } from '@engine/balance';
import type { Season, ValleyMap } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { cellFor } from '@render/canvas';
import { luminance, outline, PALETTES, paletteFor, TURN_WEEKS } from '@derive/palette';
import { regionContours } from '@render/layers/terrain';
import { BUILDING_SPRITES, NAMED_TONES } from '@render/sprites';
import { crowdPositions } from '@render/crowd';
import { foundGame } from '@engine/found';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { advanceAccumulator } from '@ui/loop';
import { roman } from '@ui/app';

const SILHOUETTES = ['forest', 'meadow', 'field', 'water', 'path'] as const;

describe('M-16 · paletas', () => {
  it('separa las cinco siluetas al menos ocho puntos en las cuatro estaciones', () => {
    for (const palette of Object.values(PALETTES)) {
      const values = SILHOUETTES.map((key) => luminance(palette[key])).sort((a, b) => a - b);
      for (let i = 1; i < values.length; i += 1) {
        expect((values[i] as number) - (values[i - 1] as number)).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('cada estación lleva su propio color desde el primer día', () => {
    // **Esta prueba decía lo contrario y por eso el fallo duró tanto.** Exigía
    // `paletteFor(season, 0) === paletteFor(anterior)`, o sea que la primera
    // semana de cada estación llevara la estación anterior entera. Comprobaba
    // que no hubiera corte y de paso convertía en requisito que el valle
    // mintiera sobre en qué estación está. Como la partida empieza en primavera
    // semana cero, **todo juego nuevo abría pintado de invierno** —prado
    // `#d9dde0`, el gris de la nieve— durante dos semanas, que a quince
    // segundos por semana son los primeros treinta segundos de cada partida y
    // de cada captura.
    const order: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    for (const season of order) {
      expect(paletteFor(season, 0), `${season} no empieza siendo ${season}`)
        .toEqual(PALETTES[season]);
    }
  });

  it('y se deshiela hacia la siguiente sin un corte de color', () => {
    // La propiedad que la prueba anterior quería proteger, escrita de forma que
    // no obligue a mentir: la transición existe, va al final de la estación, y
    // la costura entre dos estaciones no salta — la última semana de una es ya
    // exactamente la paleta con la que empieza la siguiente.
    const order: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const last = TIME.WEEKS_PER_SEASON - 1;
    order.forEach((season, index) => {
      const following = order[(index + 1) % 4] as Season;
      expect(paletteFor(season, last), `la costura ${season}→${following} salta`)
        .toEqual(paletteFor(following, 0));
      // Y hay deshielo de verdad: la penúltima no es ni una cosa ni la otra.
      expect(paletteFor(season, last - 1)).not.toEqual(PALETTES[season]);
      expect(paletteFor(season, last - 1)).not.toEqual(PALETTES[following]);
      // Que no se convierta en un degradado de toda la estación: hasta que
      // faltan `TURN_WEEKS` semanas (cuatro desde v4.51, antes dos), la paleta
      // es la estación misma.
      expect(paletteFor(season, last - TURN_WEEKS)).toEqual(PALETTES[season]);
    });
  });

  it('deriva el contorno mezclando un 45 % de negro', () => {
    expect(outline('#ffffff')).toBe('#8c8c8c');
  });
});

describe('M-16 · geometría y regiones', () => {
  it('la celda es lo que cabe: el mapa entero en la pantalla', () => {
    // Diez píxeles cuando el mapa medía 36 × 56; cinco desde que mide 72 × 112,
    // que es la misma regla —el lado que primero se queda corto manda— sobre un
    // valle cuatro veces mayor.
    //
    // **Y esto es una consecuencia declarada del mapa grande, no un descuido.**
    // El Canvas de `src/render/` dibuja el valle **entero** en la pantalla, sin
    // cámara: con un mapa cuatro veces mayor, cada celda mide la mitad. El 3D no
    // tiene ese problema porque tiene cámara y enfoca la aldea. La puerta de
    // `?render=canvas` se queda puesta igual, porque su razón de ser es tener
    // algo a lo que volver si el 3D no va en un móvil de verdad (CLAUDE.md), y
    // un valle pequeño se sigue viendo.
    expect(cellFor(390, 664)).toBe(Math.floor(Math.min(390 / WORLD.WIDTH, 664 / WORLD.HEIGHT)));
    expect(cellFor(390, 664)).toBe(5);
  });

  it('agrupa una mancha contigua en un solo contorno', () => {
    const map = {
      width: WORLD.WIDTH, height: WORLD.HEIGHT,
      terrain: new Uint8Array(WORLD.WIDTH * WORLD.HEIGHT), traffic: new Uint16Array(WORLD.WIDTH * WORLD.HEIGHT),
      path: new Uint8Array(WORLD.WIDTH * WORLD.HEIGHT), ruins: new Uint8Array(WORLD.WIDTH * WORLD.HEIGHT),
      forestAge: new Uint8Array(WORLD.WIDTH * WORLD.HEIGHT), forestStock: new Uint16Array(WORLD.WIDTH * WORLD.HEIGHT),
    } satisfies ValleyMap;
    map.terrain[0] = TERRAIN_CODE.forest;
    map.terrain[1] = TERRAIN_CODE.forest;
    expect(regionContours(map, TERRAIN_CODE.forest)).toHaveLength(1);
  });
});

describe('M-17 · catálogo visual', () => {
  it('tiene un sprite para cada clase de edificio', () => {
    // `hall` desde K-4: la sala del rey. En este render, que es el camino de
    // reserva (`?render=canvas`), reutiliza la silueta de la casa de piedra —la
    // más grande que hay aquí— porque lo que el dueño del diseño pidió que se
    // diferenciara es el valle en 3D, y allí sí tiene su propio aspecto.
    expect(Object.keys(BUILDING_SPRITES).sort()).toEqual([
      // A2 · `gate` reutiliza la silueta de la empalizada por lo mismo: aquí es
      // una celda de muralla, y quien lo enseña como portón es el 3D.
      // A3 · `bastion` reutiliza la silueta de la muralla de piedra, por el
      // mismo motivo que `gate`: aquí es la pieza de muralla que ocupa.
      'bastion', 'chapel', 'church', 'field', 'gate', 'granary', 'grave_yard', 'hall', 'house',
      'mill', 'palisade', 'smithy', 'stone_house', 'wall', 'watchtower', 'well',
    ]);
  });

  it('reserva ocho tonos estables para los personajes nombrados', () => {
    expect(NAMED_TONES).toHaveLength(8);
    expect(new Set(NAMED_TONES).size).toBe(8);
  });
});

describe('M-18 · multitud derivada', () => {
  it('es pura, determinista y no deja figuras fuera del valle', () => {
    const state = foundGame(7);
    run(state, 20 * 48, 'prudent', CATALOG);
    const tick = state.tick;
    const terrain = [...state.map.terrain];
    const first = crowdPositions(state, 0.45);
    expect(crowdPositions(state, 0.45)).toEqual(first);
    expect(state.tick).toBe(tick);
    expect([...state.map.terrain]).toEqual(terrain);
    for (const figure of first) {
      expect(figure.x).toBeGreaterThanOrEqual(0);
      expect(figure.y).toBeGreaterThanOrEqual(0);
      expect(figure.x + 1).toBeLessThanOrEqual(state.map.width);
      expect(figure.y + (figure.named ? 1.8 : 1.5)).toBeLessThanOrEqual(state.map.height);
    }
  });

  it('de noche no deja a nadie a la intemperie', () => {
    expect(crowdPositions(foundGame(7), 0.9)).toEqual([]);
  });

  it('calcula mil fotogramas de ochenta figuras en menos de 100 ms', () => {
    const state = foundGame(7);
    const originals = state.people.villagers;
    while (state.people.villagers.length < 80) {
      const source = originals[state.people.villagers.length % originals.length]!;
      state.people.villagers.push({ ...source, id: state.people.nextId++, named: false, name: '' });
    }
    // **Se toma la mejor de tres pasadas, no una.** Esto mide tiempo de pared en
    // una máquina que está haciendo otras cosas, así que una sola medida no mide
    // el código: mide lo ocupado que estaba el equipo ese segundo. Fallaba una
    // vez de cada cuatro con 103 ms contra un límite de 100, siempre con la
    // suite entera compilando al lado, y un fallo que aparece y desaparece es
    // peor que no tener prueba, porque enseña a ignorarla.
    //
    // La mejor de tres sigue cazando lo que esta prueba existe para cazar: que
    // alguien meta un bucle de más en la multitud y esto se vaya al doble. Lo
    // que deja de cazar es el ruido de la máquina, que nunca fue el objetivo.
    let best = Infinity;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const started = performance.now();
      for (let i = 0; i < 1_000; i += 1) crowdPositions(state, 0.45);
      best = Math.min(best, performance.now() - started);
    }
    expect(best).toBeLessThan(100);
  });
});

describe('M-20 · reloj de aplicación', () => {
  it('a 4× y 60 fps, doce minutos reales no pierden ni un tick por el camino', () => {
    // Lo que se vigila es que sumar dos mil ciento sesenta fotogramas de 16,67
    // ms no pierda nada por redondeo, no una cifra concreta: con el tick de
    // quince segundos eran 192 ticks y con el de v3.72 son tres. El número
    // sale de la constante.
    const minutes = 12;
    let remainder = 0;
    let ticks = 0;
    let maximum = 0;
    for (let frame = 0; frame < minutes * 60 * 60; frame += 1) {
      const advance = advanceAccumulator(remainder, 1000 / 60, 4);
      remainder = advance.remainderMs;
      ticks += advance.ticks;
      maximum = Math.max(maximum, advance.ticks);
    }
    expect(ticks).toBe(Math.floor((minutes * 60_000 * 4) / TIME.REAL_MS_PER_TICK));
    expect(maximum).toBeLessThanOrEqual(8);
  });

  it('un fotograma nunca ejecuta más de ocho ticks y conserva la deuda', () => {
    const advance = advanceAccumulator(0, 10 * 60_000, 16);
    expect(advance.ticks).toBe(8);
    expect(advance.remainderMs).toBeGreaterThan(0);
  });

  it('presenta el año civil en romanos desde ANNO I', () => {
    expect(roman(1)).toBe('I');
    expect(roman(4)).toBe('IV');
    expect(roman(120)).toBe('CXX');
  });
});
