// D2 · La muralla contesta. design.md §1b, fase 4; Anexo E.
//
// **Vive en las jornadas** porque cada semilla es una partida de veinticinco a
// cuarenta años más una jornada escénica entera con el mundo físico encendido.
//
// Y lo que guarda es lo que se puede guardar de una batalla que **no es
// determinista por diseño** (§1b): no cuántos caen —eso cambia entre partidas y
// esa es la gracia— sino que el circuito entero exista y sea honesto.
//
//  · **Se dispara, vuela y se acierta.** Si esto se rompe, la fase 4 se queda
//    en una muralla decorada.
//  · **Sólo con arcos**, que es §1b: la defensa se construye dando. Un valle al
//    que nadie le dio arcos no suelta una flecha.
//  · **Y no toca una sola cifra del motor**, que es el innegociable de la capa
//    (E.3). Lo que un asalto le costó al clan entra en la partida en B4, como
//    datos, y hasta entonces se queda contado aquí.

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
 * Un valle con cerco, con la partida entrando hoy.
 *
 * Los años son los que tarda cada uno en tener muralla (§7.4c): la 41 necesita
 * cuarenta donde la 7 tiene cuarenta y ocho piezas a los veinticinco.
 */
function assaulted(seed: number, years: number, bows: boolean): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
  (state.traits as ValleyTrait[]).push('arms');
  if (bows) (state.traits as ValleyTrait[]).push('bows');
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = 20;
  return state;
}

/**
 * Los valles que **tienen cerco y siguen en pie** a esa altura.
 *
 * Las dos mitades importan desde B3 (18 sep 2026). La semilla 41 estaba aquí y
 * se cayó de la lista por las dos razones a la vez: **no levanta muralla** —su
 * anillo sigue sin fijarse al año treinta— y por eso mismo **acaba tomada** en
 * el año treinta y cinco. Medir la guarnición de un valle sin cerco no es medir
 * nada: eso es la propiedad «sin cerco no hay guarnición», y la guarda
 * `tests/fast/garrison.test.ts`.
 */
const VALLEYS: readonly (readonly [number, number])[] = [[7, 25], [11, 25], [23, 25], [36, 30]];

/**
 * RD-3 (1 oct 2026) · **La semilla 11 salió de la lista y quedó declarada aparte**
 * (`it.fails`), con la propiedad intacta. Con el catálogo de RD-3 su
 * trayectoria cambia y a los veinticinco años —y a los treinta— la partida
 * saquea y se va sin acercarse al cerco: medido, **96 flechas, 0 aciertos**,
 * todas en el suelo a una mediana de 4,3 celdas del asaltante más cercano (la
 * más cercana a 1,2) y ninguna en el muro. Se leyó como puntería contra una
 * partida que no se acerca.
 *
 * **Con el valle de forma natural (v5.73) vuelve a la lista, y la causa era otra**
 * (2 oct 2026). La semilla 23 cayó igual —36 flechas, 0 aciertos— y mirando
 * dónde estaba la partida salió lo mismo en las dos: **plantada en la otra
 * orilla del río**, a 17 celdas de la puerta en la 11 y de 7 a 10 en la 23, al
 * otro lado del agua. `outsideOf` (`life/raiders.ts`) cogía el campo más grande
 * del valle y no el de la puerta, y una partida que viene a mirar el cerco
 * desde donde no llega no se acerca a él por mucho que el cerco dispare. Con la
 * cara de fuera del portón por delante (`fieldOutside`) la partida llega, y en
 * esta misma jornada la 11 suelta 29 flechas y acierta 11, la 23 suelta 13 y
 * acierta 6 y la 36 suelta 7 y acierta 6.
 */

describe('D2 · la muralla contesta', () => {
  it('se dispara, y alguna acierta, en los valles que se acercan al cerco', async () => {
    // Medido al cerrar D2, con el clan de veinte y doce cuerpos en pantalla:
    // de **28 a 97 flechas** soltadas en la jornada y de **4 a 12 saqueadores
    // en el suelo**. El reparto es dispar a propósito y no es un defecto: la
    // semilla 41 tira veintiocho flechas y tumba a los doce, y la 11 tira
    // noventa y siete y tumba a cuatro, porque la geometría de cada cerco pone
    // a la partida más o menos tiempo a tiro. Eso es «cada valle es distinto»
    // (§1) llegando a la batalla.
    for (const [seed, years] of VALLEYS) {
      const state = assaulted(seed, years, true);
      const physics = await createPhysics(terrainOf(state));
      expect(physics, 'Rapier tiene que cargar en este entorno').not.toBeNull();
      if (physics === null) return;
      const life = createVillage(state, 0, { physics });
      expect(life.manned.some((post) => post.post.arm === 'bow'),
        `semilla ${seed}: hay arqueros`).toBe(true);
      for (let n = 0; n < DAY_STEPS; n += 1) life.step();
      const { loosed, hits, fallen } = life.defence;
      expect(loosed, `semilla ${seed}: flechas soltadas`).toBeGreaterThan(0);
      expect(hits, `semilla ${seed}: ${hits} de ${loosed} dieron`).toBeGreaterThan(0);
      expect(fallen, `semilla ${seed}: caídos`).toBeGreaterThan(0);
      expect(fallen, 'y nunca más caídos que saqueadores')
        .toBeLessThanOrEqual(life.raiders.length);
      // Y el mundo físico no se llena de flechas: las gastadas se retiran.
      expect(physics.count, `semilla ${seed}: ${physics.count} cuerpos al cerrar`)
        .toBeLessThan(60);
      physics.dispose();
    }
  });

  it('sin arcos no se suelta una sola flecha', async () => {
    // La otra mitad de «la defensa se construye dando»: el mismo valle, el
    // mismo asalto, sin arcos. Hay guarnición —lanzas en el portón— y no hay
    // arquería, porque las lanzas son el cuerpo a cuerpo y eso es D4.
    const state = assaulted(7, 25, false);
    const physics = await createPhysics(terrainOf(state));
    if (physics === null) return;
    const life = createVillage(state, 0, { physics });
    expect(life.manned.length, 'sí hay guarnición').toBeGreaterThan(0);
    expect(life.manned.some((post) => post.post.arm === 'bow'), 'y ningún arco').toBe(false);
    for (let n = 0; n < DAY_STEPS; n += 1) life.step();
    expect(life.defence.loosed, 'ni una flecha').toBe(0);
    // **Y aquí acaba la propiedad, que es «sin arcos no hay arquería».**
    // Esto pedía además que no cayera nadie, y eso dejó de ser lo mismo el día
    // de D4: desde el cuerpo a cuerpo, el de la lanza que sujeta el portón
    // puede tumbar a quien se le pone al alcance de un brazo, sin que vuele una
    // sola flecha. Era cierto por casualidad —en este valle concreto ningún
    // saqueador llegaba a esa distancia antes de acabarse el día— y con el
    // ritmo nuevo (§8.6, el hueco entre decisiones) la guarnición de la
    // semilla 7 al año 25 ya no es la misma y cae uno. Con `loosed` en cero,
    // cualquier caído es de lanza **por construcción**, que es justo lo que
    // esta prueba quería separar.
    physics.dispose();
  });

  it('y la batalla no escribe una cifra del motor', async () => {
    // El innegociable de esta capa, con la batalla encendida: doce cuerpos
    // enemigos, siete arqueros, flechas volando, y el estado del motor igual
    // byte a byte al cerrar la jornada.
    const state = assaulted(23, 25, true);
    const physics = await createPhysics(terrainOf(state));
    if (physics === null) return;
    const before = JSON.stringify(state);
    const life = createVillage(state, 0, { physics });
    for (let n = 0; n < DAY_STEPS; n += 1) life.step();
    expect(life.defence.loosed, 'hubo batalla').toBeGreaterThan(0);
    expect(JSON.stringify(state), 'y el motor no se enteró').toBe(before);
    physics.dispose();
  });
});
