// D3b/D5 · El portón que cede. design.md §1b, fase 4; Anexo E.
//
// **Aquí se cierra el bucle de la meta.** El motor marca el asalto (B3), la
// escena lo pelea —la avalancha contra la puerta contra las flechas de la
// muralla—, y lo que salga de esa pelea entra al motor por la puerta de B4 y
// puede acabar la partida. Es §1b entero, funcionando: «el tower defense es
// literal» y «la pelea decide».
//
// **Vive en las jornadas** porque cada semilla es una partida de veinticinco
// años más una jornada escénica con física.
//
// Y lo que se guarda es lo que se puede guardar de una carrera que no es
// determinista por diseño:
//
//  · **Un saqueo no toca la puerta y un asalto sí.** Las dos visitas son
//    distintas porque el motor las distingue, y si esto se rompe, la fase 4 se
//    queda en una escena decorativa.
//  · **Los golpes son manos**, así que la defensa que mata retrasa la puerta.
//  · **Entrar es entrar y seguir en pie**: un portón roto con la partida entera
//    en el suelo no es un valle tomado.
//  · **Y la escena no escribe en el motor**, ni siquiera para perder la partida:
//    lo que hace es contarlo.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { createVillage } from '../../src/render3d/life/village';
import { createPhysics } from '../../src/render3d/life/physics';
import { terrainOf } from '../../src/render3d/life/terrain';
import type { GameState, ValleyTrait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/** Los pasos de una jornada escénica entera. */
const DAY_STEPS = 3600;

/**
 * Un valle con cerco y la partida encima, con o sin arcos y con o sin asalto.
 *
 * `assault` es la marca del motor (B3): sin ella lo de hoy es un saqueo y nadie
 * toca la puerta, que es la propiedad que separa D3 de D3b.
 */
function raided(seed: number, years: number, opts: {
  bows: boolean; assault: boolean; band?: number;
}): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
  (state.traits as ValleyTrait[]).push('arms');
  if (opts.bows) (state.traits as ValleyTrait[]).push('bows');
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = opts.band ?? 20;
  if (opts.assault) state.flags['assault'] = state.tick + 1;
  return state;
}

/** Juega la jornada entera y devuelve lo que la defensa hizo. */
async function fight(state: GameState): Promise<{
  posts: number; loosed: number; fallen: number;
  gateHits: number; broken: boolean; entered: boolean;
  lost: number;
  brokeAt: number | null;
}> {
  const physics = await createPhysics(terrainOf(state));
  if (physics === null) throw new Error('Rapier tiene que cargar en este entorno');
  const life = createVillage(state, 0, { physics });
  let brokeAt: number | null = null;
  for (let n = 0; n < DAY_STEPS; n += 1) {
    life.step();
    if (brokeAt === null && life.defence.gate?.broken === true) brokeAt = n;
  }
  const { loosed, fallen, lost, gate } = life.defence;
  physics.dispose();
  return {
    posts: life.manned.length,
    loosed, fallen, lost,
    gateHits: gate?.hits ?? 0,
    broken: gate?.broken ?? false,
    entered: gate?.entered ?? false,
    brokeAt,
  };
}

/** Los valles que tienen cerco con portón a esa altura, medidos al cerrar D5. */
const WALLED: readonly (readonly [number, number])[] = [[7, 25], [11, 25], [23, 25], [3, 25]];

describe('D3b/D5 · el portón que cede', () => {
  it('un saqueo no toca la puerta', async () => {
    // La propiedad que separa las dos visitas. Sin esto, cualquier partida que
    // baje a robar grano acabaría tirando el portón, y el asalto —que el motor
    // reserva para la partida que da para tomar el valle— dejaría de ser nada.
    for (const [seed, years] of WALLED) {
      const sack = await fight(raided(seed, years, { bows: true, assault: false }));
      expect(sack.gateHits, `semilla ${seed}: golpes en un saqueo`).toBe(0);
      expect(sack.broken, `semilla ${seed}: la puerta aguanta`).toBe(false);
      expect(sack.entered, `semilla ${seed}: nadie entra`).toBe(false);
    }
  });

  it('un asalto la golpea hasta tirarla, y entran', async () => {
    // Medido al cerrar D5 en cuatro valles **sin arcos**: la puerta cae en 18 a
    // 31 segundos escénicos y entran los doce. Sin nadie que dispare, sesenta
    // golpes son doce hombres durante cinco segundos más lo que tardan en
    // llegar.
    for (const [seed, years] of WALLED) {
      const storm = await fight(raided(seed, years, { bows: false, assault: true }));
      expect(storm.gateHits, `semilla ${seed}: golpes`).toBeGreaterThan(0);
      expect(storm.broken, `semilla ${seed}: la puerta cede`).toBe(true);
      expect(storm.entered, `semilla ${seed}: y entran`).toBe(true);
    }
  });

  it('y los arqueros cambian la carrera: retrasan la puerta o se la comen entera', async () => {
    // **La propiedad de la fase 4, y no se puede escribir como una igualdad**:
    // la batalla no es determinista por diseño (§1b), así que lo que se guarda
    // es que disparar **cambie el resultado** en la dirección buena. Medido en
    // los cuatro valles: con arcos la puerta tarda de 20 a 39 segundos en vez de
    // 18 a 31, caen de 2 a 12 saqueadores, y **la semilla 7 salva el valle con
    // el portón roto** porque no queda ni uno en pie para pasar por él.
    let helped = 0;
    for (const [seed, years] of WALLED) {
      const bare = await fight(raided(seed, years, { bows: false, assault: true }));
      const bowed = await fight(raided(seed, years, { bows: true, assault: true }));
      expect(bowed.loosed, `semilla ${seed}: se dispara`).toBeGreaterThan(0);
      expect(bowed.fallen, `semilla ${seed}: y caen`).toBeGreaterThan(0);
      const slower = (bowed.brokeAt ?? DAY_STEPS) > (bare.brokeAt ?? DAY_STEPS);
      const saved = !bowed.entered;
      if (slower || saved) helped += 1;
    }
    expect(helped, `los arcos cambiaron la carrera en ${helped} de ${WALLED.length}`)
      .toBe(WALLED.length);
  });

  it('un portón roto con la partida entera en el suelo no es un valle tomado', async () => {
    // La medida que obligó a partir la pregunta en dos. La semilla 7 con siete
    // puestos y arcos: el portón cae a los veinte segundos, cuatro hombres
    // entran por él, y **los doce acaban muertos**. Contar «entró alguien»
    // perdía una partida que la muralla había ganado.
    const held = await fight(raided(7, 25, { bows: true, assault: true }));
    expect(held.broken, 'la puerta cedió').toBe(true);
    expect(held.fallen, 'y cayeron los doce').toBe(12);
    expect(held.entered, 'pero no queda nadie dentro: el valle aguanta').toBe(false);
  });

  it('y la escena no escribe en el motor, ni para perder la partida', async () => {
    // El innegociable de esta capa (E.3) con lo más grave que puede pasar
    // encima: el valle se pierde **por la puerta de B4**, como dato, y no porque
    // la jornada haya tocado el estado.
    const state = raided(11, 25, { bows: false, assault: true });
    const before = JSON.stringify(state);
    const storm = await fight(state);
    expect(storm.entered, 'entraron').toBe(true);
    expect(JSON.stringify(state), 'y el motor no se enteró por su cuenta').toBe(before);
    expect(state.ended, 'la partida sigue abierta hasta que el motor lo lea').toBeNull();
  });
});

describe('D4 · y defender cuesta', () => {
  it('un asalto se cobra a alguno de los nuestros', async () => {
    // **La mitad que faltaba del asedio.** Hasta D4 el parte de B4 informaba
    // `lost: 0` siempre: las flechas salían y nadie tocaba a los que
    // defendían. Medido al cerrar D4 en los cuatro valles con arcos y sin
    // arcos: caen de **cero a tres** de los nuestros por asalto, y el reparto
    // es dispar a propósito —depende de a quién alcancen los doce en la puerta—.
    //
    // La propiedad, que es la que se puede escribir de algo que no es
    // determinista: **en algún valle cuesta gente**. Que costara siempre sería
    // un número, no una batalla.
    let bled = 0;
    for (const [seed, years] of WALLED) {
      for (const bows of [true, false]) {
        const fight2 = await fight(raided(seed, years, { bows, assault: true }));
        if (fight2.lost > 0) bled += 1;
      }
    }
    expect(bled, `hubo bajas propias en ${bled} de ${WALLED.length * 2} asaltos`)
      .toBeGreaterThan(0);
  });

  it('y un saqueo no se cobra a nadie: no hay a quién pegar', async () => {
    // Nadie se acerca a la muralla en un saqueo (D3), así que el cuerpo a
    // cuerpo no ocurre. Es la otra mitad de la propiedad de arriba: lo que
    // cuesta gente es el asalto.
    for (const [seed, years] of WALLED) {
      const sack = await fight(raided(seed, years, { bows: true, assault: false }));
      expect(sack.lost, `semilla ${seed}: ni una baja propia en un saqueo`).toBe(0);
    }
  });
});
