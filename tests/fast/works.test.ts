// M-14 · Edificios, colocación y obras. design.md §7.2, §7.3, §7.4.
//
// Las propiedades que se comprueban son las del diseño: la prioridad de §7.3,
// los topes de §7.2, que nada se pise y que nada se levante sobre agua,
// marisma o ruina de piedra. Cómo esté escrito el bucle de obras da igual.
//
// La batería de prioridad se construye a mano —una fundación real y luego el
// estado exacto que activa cada regla— porque una partida simulada no visita
// los ocho casos y, cuando lo hace, no se sabe por cuál de ellos pasó.
import { beforeAll, describe, expect, it } from 'vitest';

import { BUILDING_RULES, BUILDINGS, FOOD, LIFE, WORLD } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog/index';
import { foundGame } from '@engine/found';
import { makeVillager } from '@engine/people/villagers';
import { run, tick } from '@engine/sim';
import { TERRAIN_CODE } from '@engine/state';
import type { Building, BuildingKind, GameState } from '@engine/state';
import { destroyBuilding, familyOf } from '@engine/world/buildings';
import { canPlace, placeBuilding } from '@engine/world/placement';
import { nextUpgrade, upgradeSpot } from '@engine/world/upgrade';
import { advanceWorks, bpCostOf, nextProject, requestBuild } from '@engine/world/works';

const YEAR = 48;

/** Añade adultos anónimos hasta llegar a `target` vivos. */
function populate(state: GameState, target: number): GameState {
  let next = state.people.villagers.reduce((n, v) => Math.max(n, v.id + 1), 0);
  while (state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null).length < target) {
    state.people.villagers.push(makeVillager({
      id: next, female: next % 2 === 0, bornTick: state.tick - 25 * YEAR,
    }));
    next += 1;
  }
  return state;
}

/** Levanta n edificios de un tipo, ya terminados, donde §7.4 los pondría. */
function raise(state: GameState, kind: BuildingKind, n: number): GameState {
  for (let i = 0; i < n; i += 1) {
    const spot = placeBuilding(state, kind);
    if (spot === null) throw new Error(`sin sitio para ${kind}`);
    const spec = BUILDINGS[kind];
    state.buildings.push({
      id: state.buildings.reduce((m, b) => Math.max(m, b.id + 1), 0),
      kind, x: spot.x, y: spot.y, w: spec.w, h: spec.h,
      builtTick: state.tick, lostTick: null, tier: spec.tier, lit: true, blockedUntil: null,
    });
  }
  return state;
}

function live(state: GameState): Building[] {
  return state.buildings.filter((b) => b.lostTick === null);
}

function overlapping(state: GameState): string | null {
  const boxes = [
    ...live(state).map((b) => ({ what: `${b.kind}#${b.id}`, x: b.x, y: b.y, w: b.w, h: b.h })),
    ...state.works.map((w) => ({ what: `obra ${w.kind}#${w.id}`, x: w.x, y: w.y, w: w.w, h: w.h })),
  ];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      // Una mejora ocupa la parcela de su origen mientras se construye: no es
      // solapamiento, es la misma parcela transformándose.
      const upgrade = state.works.some((w) => w.upgradeOf !== null &&
        (`obra ${w.kind}#${w.id}` === a.what || `obra ${w.kind}#${w.id}` === b.what));
      if (upgrade) continue;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        return `${a.what} pisa ${b.what}`;
      }
    }
  }
  return null;
}

function onForbiddenGround(state: GameState): string | null {
  for (const b of live(state)) {
    for (let y = b.y; y < b.y + b.h; y += 1) {
      for (let x = b.x; x < b.x + b.w; x += 1) {
        const t = state.map.terrain[y * state.map.width + x];
        if (t === TERRAIN_CODE.water || t === TERRAIN_CODE.marsh) return `${b.kind}#${b.id} en ${x},${y}`;
      }
    }
  }
  return null;
}

describe('prioridad de construcción · §7.3', () => {
  it('1 · campos, mientras falten para lo que come la aldea', () => {
    const s = foundGame(7); // 20 personas, 2 campos; neededFields = 3
    expect(nextProject(s)).toBe('field');
  });

  it('2 · casas, cuando la gente pasa del aforo menos dos', () => {
    const s = raise(foundGame(7), 'field', 1); // campos cubiertos
    expect(s.people.villagers.filter((v) => v.diedTick === null).length)
      .toBeGreaterThan(LIFE.HOUSE_CAPACITY * 4 - 2);
    expect(nextProject(s)).toBe('house');
  });

  it('3 · graneros, sólo con el granero por encima del 80 %', () => {
    const s = raise(raise(foundGame(7), 'field', 1), 'house', 1);
    s.village.grain = 10;
    expect(nextProject(s)).not.toBe('granary');
    s.village.grain = FOOD.BASE_STORAGE * BUILDING_RULES.GRANARY_FULL + 1;
    expect(nextProject(s)).toBe('granary');
  });

  it('4 · el pozo a los 25, y no a los 24', () => {
    const base = (): GameState => {
      const s = raise(raise(foundGame(7), 'field', 4), 'house', 4);
      s.village.grain = 10;
      return s;
    };
    const shy = populate(base(), BUILDING_RULES.WELL_PEOPLE - 1);
    expect(nextProject(shy)).not.toBe('well');
    const enough = populate(base(), BUILDING_RULES.WELL_PEOPLE);
    expect(nextProject(enough)).toBe('well');
  });

  it('5, 6 y 7 · capilla, fragua y molino, cada uno tras el anterior', () => {
    const base = (people: number): GameState => {
      const s = populate(raise(raise(foundGame(7), 'field', 6), 'house', 12), people);
      s.village.grain = 10;
      s.village.faith = 60;
      return raise(s, 'well', 1);
    };
    expect(nextProject(base(BUILDING_RULES.CHAPEL_PEOPLE))).toBe('chapel');
    const smithy = raise(base(BUILDING_RULES.SMITHY_PEOPLE), 'chapel', 1);
    expect(nextProject(smithy)).toBe('smithy');
    const mill = raise(raise(base(BUILDING_RULES.MILL_PEOPLE), 'chapel', 1), 'smithy', 1);
    expect(nextProject(mill)).toBe('mill');
  });

  it('5 · sin fe suficiente no hay capilla', () => {
    const s = populate(raise(raise(foundGame(7), 'field', 6), 'house', 12), BUILDING_RULES.CHAPEL_PEOPLE);
    s.village.grain = 10;
    s.village.faith = BUILDING_RULES.CHAPEL_FAITH - 1;
    raise(s, 'well', 1);
    expect(nextProject(s)).not.toBe('chapel');
  });

  it('8 · la empalizada quiere fragua y la bandera threatened', () => {
    const s = populate(raise(raise(foundGame(7), 'field', 8), 'house', 12), 50);
    s.village.grain = 10;
    s.village.faith = 60;
    raise(s, 'well', 1); raise(s, 'chapel', 1); raise(s, 'smithy', 1); raise(s, 'mill', 1);
    expect(nextProject(s)).not.toBe('palisade');
    s.flags['threatened'] = 0;
    expect(nextProject(s)).toBe('palisade');
  });

  it('sin madera no se empieza: la obra espera, no se regala', () => {
    const s = foundGame(7);
    s.village.wood = 0;
    // El campo no cuesta madera (§7.2), así que se sigue pudiendo empezar.
    expect(nextProject(s)).toBe('field');
    raise(s, 'field', 1);
    expect(nextProject(s)).toBeNull(); // la casa cuesta 60 y no hay
    s.village.wood = BUILDINGS.house.wood;
    expect(nextProject(s)).toBe('house');
  });

  it('vuelve a buscar cuando se abre una puerta después de no hallar proyecto', () => {
    const s = raise(foundGame(7), 'field', 1);
    s.village.wood = 0;
    advanceWorks(s, 0);
    expect(s.works).toHaveLength(0);

    // Una segunda semana idéntica sigue sin obra. Al poder pagar la casa, el
    // cambio de estado debe invalidar cualquier resultado nulo recordado.
    advanceWorks(s, 0);
    s.village.wood = BUILDINGS.house.wood;
    advanceWorks(s, 0);
    expect(s.works).toHaveLength(1);
    expect(s.works[0]?.kind).toBe('house');
  });
});

describe('mejoras a piedra · §7.3 punto 9', () => {
  /**
   * Un valle sin sitio. Todo lo libre pasa a marisma, que §7.4 prohíbe para
   * cualquier edificio; la roca se deja **debajo** de lo ya construido, que es
   * la única forma de que haya afloramiento sin que haya parcela libre.
   */
  function fillTheValley(state: GameState): GameState {
    const taken = new Set<number>();
    for (const b of live(state)) {
      for (let y = b.y; y < b.y + b.h; y += 1) {
        for (let x = b.x; x < b.x + b.w; x += 1) taken.add(y * state.map.width + x);
      }
    }
    for (let i = 0; i < state.map.terrain.length; i += 1) {
      if (!taken.has(i)) state.map.terrain[i] = TERRAIN_CODE.marsh;
    }
    for (const i of [...taken].slice(0, 6)) state.map.terrain[i] = TERRAIN_CODE.rock;
    return state;
  }

  it('cuando no queda sitio devuelve mejoras y no edificios nuevos', () => {
    const s = raise(foundGame(7), 'smithy', 1);
    fillTheValley(s);
    const project = nextProject(s);
    expect(project).not.toBeNull();
    expect(typeof project).toBe('object');
    expect((project as { kind: string }).kind).toBe('stone_house');
  });

  it('sin fragua no hay piedra, y entonces no hay nada que hacer', () => {
    const s = fillTheValley(foundGame(7));
    expect(nextProject(s)).toBeNull();
  });

  it('las casas van antes que la empalizada y la empalizada antes que la capilla', () => {
    // El orden lo fija nextUpgrade, y se comprueba sobre él: llenar el valle
    // además de esto sólo añade una segunda causa a cada fallo.
    const s = raise(raise(foundGame(7), 'palisade', 2), 'chapel', 1);
    expect(nextUpgrade(s)?.kind).toBe('stone_house');
    for (const b of live(s)) if (b.kind === 'house') b.kind = 'stone_house';
    expect(nextUpgrade(s)?.kind).toBe('wall');
    for (const b of live(s)) if (b.kind === 'palisade') b.kind = 'wall';
    expect(nextUpgrade(s)?.kind).toBe('church');
  });

  it('la iglesia crece sobre la capilla desde cualquiera de sus cuatro esquinas', () => {
    // 3×3 sobre 2×2: si sólo se probara la esquina superior izquierda, una
    // capilla con un vecino al sur o al este no podría llegar nunca a iglesia.
    const s = raise(foundGame(7), 'chapel', 1);
    const chapel = live(s).find((b) => b.kind === 'chapel')!;
    s.buildings.push({
      id: 900, kind: 'palisade', x: chapel.x + 2, y: chapel.y + 2, w: 1, h: 1,
      builtTick: 0, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    const spot = upgradeSpot(s, 'church', chapel);
    expect(spot).not.toBeNull();
    expect(spot!.x).toBeLessThanOrEqual(chapel.x);
    expect(spot!.y).toBeLessThanOrEqual(chapel.y);
    // Y contiene a la capilla entera, que es lo que la hace una mejora.
    expect(spot!.x + 3).toBeGreaterThanOrEqual(chapel.x + 2);
    expect(spot!.y + 3).toBeGreaterThanOrEqual(chapel.y + 2);
  });

  it('la piedra se paga en puntos de obra, no en un sexto recurso', () => {
    // §7.2, v2.12: bpCost = bp + stone / STONE_PER_BP.
    expect(bpCostOf('stone_house')).toBe(
      BUILDINGS.stone_house.bp + BUILDINGS.stone_house.stone / WORLD.STONE_PER_BP,
    );
    // `free` de §8.4 exime materiales, nunca el trabajo de levantarlo.
    expect(bpCostOf('watchtower', true)).toBe(BUILDINGS.watchtower.bp);
    expect(bpCostOf('house', true)).toBe(BUILDINGS.house.bp);
  });

  it('una mejora sustituye a su origen sin dejar ruina ni gente en la calle', () => {
    const s = raise(foundGame(7), 'smithy', 1);
    fillTheValley(s);
    const source = live(s).find((b) => b.kind === 'house')!;
    const tenants = s.people.villagers.filter((v) => v.homeId === source.id).map((v) => v.id);
    expect(tenants.length).toBeGreaterThan(0);
    advanceWorks(s, 0); // abre la obra
    advanceWorks(s, bpCostOf('stone_house'));
    const raised = live(s).find((b) => b.kind === 'stone_house');
    expect(raised).toBeDefined();
    expect(live(s).some((b) => b.id === source.id)).toBe(false);
    expect(s.map.ruins[source.y * s.map.width + source.x]).toBe(0);
    for (const id of tenants) {
      expect(s.people.villagers.find((v) => v.id === id)?.homeId).toBe(raised?.id);
    }
  });
});

describe('colocación · §7.4', () => {
  it('nunca sobre agua ni marisma, en 20 semillas', () => {
    for (const seed of Array.from({ length: 20 }, (_, i) => i)) {
      const s = foundGame(seed);
      expect(onForbiddenGround(s), `semilla ${seed}`).toBeNull();
      expect(overlapping(s), `semilla ${seed}`).toBeNull();
    }
  });

  it('no se puede edificar sobre una ruina de piedra, sí sobre una de madera', () => {
    const s = foundGame(7);
    const house = live(s).find((b) => b.kind === 'house')!;
    destroyBuilding(s, house.id);
    expect(canPlace(s, 'house', house.x, house.y)).toBe(true);
    const stone = live(s).find((b) => b.kind === 'field')!;
    stone.tier = 1;
    destroyBuilding(s, stone.id);
    expect(canPlace(s, 'field', stone.x, stone.y)).toBe(false);
  });

  it('destruir deja lostTick y marca las celdas en map.ruins', () => {
    const s = foundGame(7);
    const doomed = live(s).find((b) => b.kind === 'house')!;
    const tenants = s.people.villagers.filter((v) => v.homeId === doomed.id).length;
    expect(tenants).toBeGreaterThan(0);
    destroyBuilding(s, doomed.id);
    expect(s.buildings.find((b) => b.id === doomed.id)?.lostTick).toBe(s.tick);
    for (let y = doomed.y; y < doomed.y + doomed.h; y += 1) {
      for (let x = doomed.x; x < doomed.x + doomed.w; x += 1) {
        expect(s.map.ruins[y * s.map.width + x]).toBe(1);
      }
    }
    expect(s.people.villagers.filter((v) => v.homeId === doomed.id)).toHaveLength(0);
  });

  it('una obra reserva su parcela: nada se coloca encima mientras dura', () => {
    const s = foundGame(7);
    advanceWorks(s, 0);
    const work = s.works[0];
    expect(work).toBeDefined();
    expect(canPlace(s, 'house', work!.x, work!.y)).toBe(false);
  });
});

describe('topes de §7.2', () => {
  it('requestBuild respeta el tope y devuelve null cuando está lleno', () => {
    const s = foundGame(7);
    expect(requestBuild(s, 'grave_yard')).not.toBeNull();
    advanceWorks(s, bpCostOf('grave_yard', true));
    expect(live(s).some((b) => b.kind === 'grave_yard')).toBe(true);
    expect(requestBuild(s, 'grave_yard')).toBeNull();
  });
});

describe('las obras dentro del tick · §4.2 paso 6', () => {
  // El brief pide 30 semillas × 150 años. Treinta partidas de siglo y medio no
  // caben en los 20 s de §14.1, así que la versión completa vive en
  // tests/balance/ y aquí queda la muestra que detecta una regresión en
  // segundos. Las cinco partidas se corren UNA vez y las comprueban todas:
  // repetirlas por aserto multiplica el coste y la memoria sin añadir nada.
  const SEEDS = [0, 7, 13, 42, 108];
  interface Played {
    overlap: string | null;
    forbidden: string | null;
    families: [BuildingKind, number][];
    standing: number;
    atFounding: number;
  }
  const played = new Map<number, Played>();
  beforeAll(() => {
    for (const seed of SEEDS) {
      const s = foundGame(seed);
      const atFounding = live(s).length;
      run(s, 150 * YEAR, 'first', CATALOG);
      const families = new Map<BuildingKind, number>();
      for (const b of live(s)) {
        const f = familyOf(b.kind);
        families.set(f, (families.get(f) ?? 0) + 1);
      }
      // Sólo se guardan los hechos. Retener cinco partidas de siglo y medio
      // enteras se lleva por delante al worker de vitest.
      played.set(seed, {
        overlap: overlapping(s), forbidden: onForbiddenGround(s),
        families: [...families], standing: live(s).length, atFounding,
      });
    }
  });

  it('nada se pisa ni cae al agua en cinco semillas de 150 años', () => {
    for (const seed of SEEDS) {
      expect(played.get(seed)?.overlap, `semilla ${seed}`).toBeNull();
      expect(played.get(seed)?.forbidden, `semilla ${seed}`).toBeNull();
    }
  });

  it('los topes de §7.2 nunca se superan, ni contando las obras abiertas', () => {
    for (const seed of SEEDS) {
      for (const [family, n] of played.get(seed)!.families) {
        const cap = BUILDINGS[family].cap;
        if (cap !== null) expect(n, `semilla ${seed}: ${family}`).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('la aldea crece: hay más edificios en pie que al fundarse', () => {
    // No en todas: una partida que se extingue deja de construir. Pero no
    // puede pasar en ninguna, que es lo que ocurría sin el paso 6.
    const grew = SEEDS.filter((seed) => played.get(seed)!.standing > played.get(seed)!.atFounding);
    expect(grew.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
  });

  it('lo que una encrucijada regala hay que levantarlo, y la crónica lo cuenta al acabar', () => {
    const s = foundGame(7);
    requestBuild(s, 'watchtower');
    expect(live(s).some((b) => b.kind === 'watchtower')).toBe(false);
    const before = s.chronicle.length;
    let raised = false;
    for (let i = 0; i < 400 && !raised; i += 1) {
      tick(s, CATALOG);
      raised = live(s).some((b) => b.kind === 'watchtower');
    }
    expect(raised).toBe(true);
    expect(s.chronicle.slice(before).some((e) => e.kind === 'built' && e.params['building'] === 'watchtower'))
      .toBe(true);
  });

  it('los puntos sobrantes de una obra terminada pasan a la siguiente de la cola', () => {
    const s = foundGame(7);
    requestBuild(s, 'grave_yard');
    requestBuild(s, 'watchtower');
    expect(s.works).toHaveLength(2);
    const first = s.works[0]!;
    advanceWorks(s, first.bpCost + 10);
    expect(s.works.some((w) => w.id === first.id)).toBe(false);
    expect(s.works.find((w) => w.kind === 'watchtower')?.bpDone).toBe(10);
  });
});

describe('el suelo quemado · §7.4, v2.25', () => {
  it('una ruina con plazo no se puede reconstruir mientras dure', () => {
    const s = foundGame(7);
    const house = live(s).find((b) => b.kind === 'house')!;
    destroyBuilding(s, house.id, 20);
    expect(canPlace(s, 'house', house.x, house.y)).toBe(false);
    // Y sigue sin poderse un año antes de que venza.
    s.tick = 19 * YEAR;
    expect(canPlace(s, 'house', house.x, house.y)).toBe(false);
  });

  it('cuando vence, el suelo vuelve a ser suelo', () => {
    const s = foundGame(7);
    const house = live(s).find((b) => b.kind === 'house')!;
    destroyBuilding(s, house.id, 20);
    s.tick = 20 * YEAR + 1;
    expect(canPlace(s, 'house', house.x, house.y)).toBe(true);
  });

  it('sin plazo, una ruina de madera se edifica encima como siempre', () => {
    const s = foundGame(7);
    const house = live(s).find((b) => b.kind === 'house')!;
    destroyBuilding(s, house.id);
    expect(canPlace(s, 'house', house.x, house.y)).toBe(true);
  });

  it('la aldea no coloca nada sobre suelo con plazo, ni al buscar sitio', () => {
    const s = foundGame(7);
    for (const b of live(s).filter((x) => x.kind === 'house')) destroyBuilding(s, b.id, 20);
    const burnt = s.buildings.filter((b) => b.blockedUntil !== null);
    expect(burnt.length).toBeGreaterThan(0);
    const spot = placeBuilding(s, 'house');
    if (spot !== null) {
      for (const b of burnt) {
        const hits = spot.x < b.x + b.w && spot.x + 2 > b.x && spot.y < b.y + b.h && spot.y + 2 > b.y;
        expect(hits, `la casa nueva pisa la parcela quemada ${b.id}`).toBe(false);
      }
    }
  });
});
