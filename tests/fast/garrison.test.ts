// C2 · Quién sube al cerco. design.md §1b, fase 4.
//
// Lo que se guarda no es cuántos suben —eso es balance y se nivela al final—
// sino las cuatro propiedades del diseño:
//
//  1 · **Una aldea en paz no tiene guarnición.** Nadie está de guardia porque
//      sí: la guardia existe porque el motor dijo que bajan.
//  2 · **Lo que suma es lo que se dio** (C1, K-2). Sin dar nada hay una mano en
//      el portón; con lanzas, arcos y fragua hay más. Es §1b: la defensa se
//      construye dando.
//  3 · **La aldea no deja de vivir por estar de guardia**: como mucho un tercio
//      de sus adultos, que es lo que hace que un caserío no se pare.
//  4 · **El portón se sujeta y desde la muralla se dispara**, y sin arcos no
//      hay arqueros en ninguna parte.

import { describe, expect, it } from 'vitest';
import { GARRISON, LIFE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { ageOf } from '@engine/people/villagers';
import { garrisonOf, postsOf } from '@derive/garrison';
import type { GameState, ValleyTrait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/**
 * Una aldea con cerco, sin esperar a que se lo construya.
 *
 * El anillo tarda de trece a treinta y cuatro años en fijarse (§7.4c), y esta
 * prueba no mide eso: mide quién sube. Así que el cerco se pone a mano —cuatro
 * estacas, un portón y una atalaya— igual que `pressure.test.ts` pone gallinas
 * en el corral para medir el peso de los lobos.
 */
function walled(seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
  const put = (kind: 'palisade' | 'gate' | 'watchtower', x: number, y: number): void => {
    state.buildings.push({
      id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick,
      lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  };
  put('gate', 30, 40);
  for (let n = 1; n <= 4; n += 1) put('palisade', 30 + n, 40);
  put('watchtower', 34, 44);
  return state;
}

/** Cuántos adultos tiene, que es el techo de la guarnición. */
function adultsOf(state: GameState): number {
  return state.people.villagers.filter((v) => {
    if (v.diedTick !== null || v.leftTick !== null) return false;
    const age = ageOf(v, state.tick);
    return age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1];
  }).length;
}

/** Pone la amenaza a `weeks` semanas de distancia. */
function coming(state: GameState, weeks: number): GameState {
  state.threat.comingTick = state.tick + weeks;
  state.threat.arrivedTick = null;
  return state;
}

describe('C2 · la guarnición', () => {
  it('una aldea en paz no tiene a nadie de guardia', () => {
    const state = walled();
    state.threat.comingTick = null;
    state.threat.arrivedTick = null;
    const garrison = garrisonOf(state);
    expect(garrison.manned, 'sin amenaza, nadie').toBe(false);
    expect(garrison.posts, 'y ningún puesto').toHaveLength(0);
    // Y tampoco con la amenaza lejos: el aviso de B2 llega ocho semanas antes y
    // ocho semanas en la muralla son dos horas de reloj sin sembrar.
    expect(garrisonOf(coming(state, GARRISON.ALERT_WEEKS + 1)).manned,
      'con la amenaza lejos, tampoco').toBe(false);
  });

  it('sube la víspera, y el día que llegan', () => {
    const state = walled();
    expect(garrisonOf(coming(state, GARRISON.ALERT_WEEKS)).manned, 'la víspera').toBe(true);
    expect(garrisonOf(coming(state, 0)).why, 'la semana misma').toBe('coming');
    state.threat.comingTick = null;
    state.threat.arrivedTick = state.tick;
    expect(garrisonOf(state).why, 'y el día que entran').toBe('arrived');
  });

  it('lo que sube es lo que se dio, y sin dar nada hay uno en el portón', () => {
    // El valle de la prueba tiene fragua desde que `foundTwenty` reparte
    // oficios, así que la cuenta desnuda es la base más el herrero.
    const bare = coming(walled(), 1);
    const smithy = bare.buildings.some((b) => b.kind === 'smithy' && b.lostTick === null);
    const floor = GARRISON.BASE_HANDS + (smithy ? GARRISON.SMITH_HANDS : 0);
    expect(garrisonOf(bare).hands, 'sin nada dado').toBe(floor);

    // **Y lo que se da suma, hasta donde la aldea da de sí.** No se congela la
    // suma exacta a propósito: esta aldea de veinte tiene dieciséis adultos, y
    // el tercio (`MOST_SHARE`) le corta la guarnición en cinco antes de que
    // lleguen las siete manos que lanzas, arcos y fragua valen. Eso **es** el
    // diseño: el techo es la aldea. Lo que la prueba guarda es que cada cosa
    // dada mueva la cuenta hacia arriba y que lo único que la pare sea el
    // techo.
    const armed = coming(walled(), 1);
    (armed.traits as ValleyTrait[]).push('arms');
    const bowed = coming(walled(), 1);
    (bowed.traits as ValleyTrait[]).push('arms', 'bows');
    const cap = Math.floor(adultsOf(bare) * GARRISON.MOST_SHARE);
    expect(garrisonOf(armed).hands, 'con lanzas suben más')
      .toBe(Math.min(cap, floor + GARRISON.ARMS_HANDS));
    expect(garrisonOf(bowed).hands, 'con arcos, más todavía o el techo')
      .toBe(Math.min(cap, floor + GARRISON.ARMS_HANDS + GARRISON.BOWS_HANDS));
    expect(garrisonOf(bowed).hands, 'y nunca menos que con sólo lanzas')
      .toBeGreaterThanOrEqual(garrisonOf(armed).hands);
  });

  it('nunca más de un tercio de los adultos', () => {
    // La propiedad que impide que una aldea se pare por estar de guardia. Se
    // fuerza el caso apretado: todo dado y poca gente.
    const state = coming(walled(), 1);
    (state.traits as ValleyTrait[]).push('arms', 'bows');
    const alive = state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null);
    // Se dejan vivos sólo nueve, que es un caserío: tres manos como mucho.
    for (const villager of alive.slice(9)) villager.leftTick = state.tick;
    const garrison = garrisonOf(state);
    expect(garrison.hands, `${adultsOf(state)} adultos`)
      .toBeLessThanOrEqual(Math.floor(adultsOf(state) * GARRISON.MOST_SHARE));
  });

  it('el portón se sujeta con lanza y desde la muralla se dispara', () => {
    const state = coming(walled(), 1);
    (state.traits as ValleyTrait[]).push('arms', 'bows');
    const posts = postsOf(state);
    const gate = posts.find((p) => p.on === 'gate');
    expect(gate?.arm, 'en el portón, lanza').toBe('spear');
    expect(posts.filter((p) => p.on === 'wall').every((p) => p.arm === 'bow'),
      'en la muralla, arco').toBe(true);
    expect(posts.find((p) => p.on === 'tower')?.arm, 'y en la atalaya, arco').toBe('bow');
    // El orden es la decisión táctica: primero por donde se entra.
    expect(posts[0]?.on, 'el primer puesto es el portón').toBe('gate');
  });

  it('sin arcos no hay un solo arquero', () => {
    // La otra mitad de lo mismo: un puesto no da un arco. Los arcos se dan (C1)
    // y si nadie los dio, lo que hay en la muralla es gente con una estaca.
    const state = coming(walled(), 1);
    (state.traits as ValleyTrait[]).push('arms');
    expect(postsOf(state).some((p) => p.arm === 'bow')).toBe(false);
  });

  it('sin cerco no hay guarnición, aunque bajen', () => {
    // No es un descuido: una guardia es un sitio del cerco. Un valle sin
    // muralla no tiene dónde ponerse, y lo que le pasa en un asalto ya lo
    // decide el motor (`THREAT.WALLED_SACK`).
    const open = coming(foundTwenty(7), 1);
    (open.traits as ValleyTrait[]).push('arms', 'bows');
    expect(garrisonOf(open).manned).toBe(false);
  });
});
