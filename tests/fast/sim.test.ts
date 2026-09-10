// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { describe, expect, it, vi } from 'vitest';
import { LIFE, PEOPLE, TIME, WORLD } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere, population } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import { holderOf } from '@engine/crossroads/conditions';
import { decide, fillVacancies, run, tick } from '@engine/sim';
import { TERRAIN_CODE } from '@engine/state';
import type { Villager } from '@engine/state';
import type { CrossroadTemplate } from '@engine/crossroads/schema';
import { forestCells, woodStanding } from '@engine/world/forest';
import { neighbours4 } from '@engine/world/tiles';
import { fingerprint } from '../helpers/fingerprint';

const YEAR = TIME.WEEKS_PER_YEAR;


describe('la fundación', () => {
  it('empieza como manda §12.2', () => {
    const s = foundGame(7);
    expect(s.tick).toBe(0);
    expect(population(s)).toBe(20);
    expect(s.village.grain).toBe(800);
    expect(s.buildings.filter((b) => b.kind === 'house')).toHaveLength(4);
    expect(s.buildings.filter((b) => b.kind === 'field')).toHaveLength(2);
    expect(s.village.wood).toBe(200);
    expect(s.works).toEqual([]);
    for (const house of s.buildings.filter((b) => b.kind === 'house')) {
      expect(s.people.villagers.filter((v) => v.homeId === house.id)).toHaveLength(LIFE.HOUSE_CAPACITY);
    }
    expect(s.crossroad).toBeNull();
    expect(s.ended).toBeNull();
    expect(s.chronicle[0]?.kind).toBe('founding');
  });

  it('la misma semilla funda la misma aldea', () => {
    expect(fingerprint(foundGame(7))).toBe(fingerprint(foundGame(7)));
    expect(fingerprint(foundGame(7))).not.toBe(fingerprint(foundGame(8)));
  });

  it('el valle tiene bosque y río', () => {
    // The integrated founding uses M-13's real valley.
    const s = foundGame(7);
    const forest = [...s.map.terrain].filter((t) => t === 1).length;
    const water = [...s.map.terrain].filter((t) => t === 2).length;
    expect(forest / s.map.terrain.length).toBeGreaterThanOrEqual(0.18);
    expect(forest / s.map.terrain.length).toBeLessThanOrEqual(0.30);
    expect(water).toBeGreaterThan(0);
  });
});

describe('el orden del tick · §4.2', () => {
  it('comer va antes que cosechar, y las muertes antes que el ánimo', async () => {
    // Espías sobre los módulos, para comprobar la SECUENCIA y no que una
    // función llame a otra.
    const calls: string[] = [];
    const watch = async (path: string, names: string[]): Promise<void> => {
      const mod = (await import(path)) as Record<string, unknown>;
      for (const name of names) {
        const original = mod[name] as (...a: unknown[]) => unknown;
        vi.spyOn(mod as never, name as never).mockImplementation(((...a: unknown[]) => {
          calls.push(name);
          return original(...a);
        }) as never);
      }
    };

    await watch('@engine/subsistence/labour', ['allocateLabour', 'produce']);
    await watch('@engine/world/works', ['advanceWorks']);
    await watch('@engine/subsistence/consumption', ['consume', 'overwinter']);
    await watch('@engine/subsistence/harvest', ['harvest', 'applySpoilage']);
    await watch('@engine/subsistence/mood', ['updateMood']);
    await watch('@engine/people/demography', ['resolveDeaths', 'resolveBirths']);
    await watch('@engine/crossroads/seeds', ['fireSeeds']);
    await watch('@engine/crossroads/select', ['selectCrossroad']);

    const s = foundGame(7);
    s.tick = TIME.HARVEST_WEEK - 1; // para que la cosecha caiga dentro
    tick(s, CATALOG);

    const at = (name: string): number => calls.indexOf(name);
    expect(at('fireSeeds')).toBeGreaterThanOrEqual(0); // 4
    expect(at('allocateLabour')).toBeGreaterThan(at('fireSeeds')); // 5
    expect(at('produce')).toBeGreaterThan(at('allocateLabour')); // 5
    expect(at('advanceWorks')).toBeGreaterThan(at('produce')); // 6
    expect(at('consume')).toBeGreaterThan(at('advanceWorks')); // 7
    expect(at('overwinter')).toBeGreaterThan(at('consume')); // 8
    expect(at('harvest')).toBeGreaterThan(at('overwinter')); // 9 — DESPUÉS de comer
    expect(at('applySpoilage')).toBeGreaterThan(at('harvest')); // 10
    expect(at('resolveDeaths')).toBeGreaterThan(at('applySpoilage')); // 11
    expect(at('updateMood')).toBeGreaterThan(at('resolveDeaths')); // 12 — v2.5
    expect(at('resolveBirths')).toBeGreaterThan(at('updateMood')); // 13
    expect(at('selectCrossroad')).toBeGreaterThan(at('resolveBirths')); // 15

    vi.restoreAllMocks();
  });

  it('el paso 2 sólo corre en la semana 0', async () => {
    const mod = await import('@engine/subsistence/seasons');
    const spy = vi.spyOn(mod, 'rollWeather');

    const s = foundGame(7);
    for (let i = 0; i < YEAR; i += 1) tick(s, CATALOG);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(s.tick % YEAR).toBe(0);

    vi.restoreAllMocks();
  });

  it('el tick avanza uno y sólo uno', () => {
    const s = foundGame(7);
    for (let i = 1; i <= 50; i += 1) {
      tick(s, CATALOG);
      expect(s.tick).toBe(i);
    }
  });

  it('la crónica se vuelca en el paso 16, no antes', () => {
    // El informe del tick trae las entradas de la semana, y son exactamente las
    // que acaban en la crónica.
    const s = foundGame(7);
    for (let i = 0; i < 400; i += 1) {
      const before = s.chronicle.length;
      const report = tick(s, CATALOG);
      const added = s.chronicle.slice(before);
      // El paso 17 puede añadir la extinción después del volcado.
      expect(added.slice(0, report.entries.length)).toEqual(report.entries);
    }
  });

  it('tick no escribe por consola', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const s = foundGame(7);
    for (let i = 0; i < 500; i += 1) tick(s, CATALOG);
    expect(log).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('una tala decidida modifica el bosque y aparece en el informe semanal', () => {
    const s = foundGame(7);
    const forest = CATALOG.find((t) => t.id === 'forest_cut') as CrossroadTemplate;
    const woodward = s.people.villagers.find((v) => v.role === 'woodward') as Villager;
    s.crossroad = {
      templateId: forest.id,
      posedTick: s.tick,
      cast: { A: woodward.id },
      optionIds: forest.options.map((o) => o.id),
    };
    const beforeWood = woodStanding(s);
    const beforeCells = forestCells(s);
    const beforeTerrain = Uint8Array.from(s.map.terrain);

    const report = tick(s, CATALOG, { templateId: forest.id, optionId: 'fell_it' });

    expect(beforeWood - woodStanding(s)).toBeGreaterThanOrEqual(900);
    expect(forestCells(s)).toBeLessThan(beforeCells);
    expect(report.felled).toBeGreaterThanOrEqual(900);
    expect([...s.map.forestAge].filter((age) => age === WORLD.BARREN_CLEARING).length)
      .toBeGreaterThanOrEqual(3);
    const [scar] = report.visualEffects;
    expect(scar?.effect).toEqual({ k: 'scar', what: 'felled_wood' });
    const scarCell = Math.floor(scar?.y ?? -1) * s.map.width + Math.floor(scar?.x ?? -1);
    expect(beforeTerrain[scarCell]).toBe(TERRAIN_CODE.forest);
    expect(s.map.terrain[scarCell]).toBe(TERRAIN_CODE.cleared);
    expect(s.map.forestAge[scarCell]).toBe(WORLD.BARREN_CLEARING);
  });

  it('una reunión en el vado señala la orilla transitable más cercana al núcleo (§11.5)', () => {
    const s = foundGame(7);
    const forest = CATALOG.find((t) => t.id === 'forest_cut') as CrossroadTemplate;
    const woodward = s.people.villagers.find((v) => v.role === 'woodward') as Villager;
    s.crossroad = {
      templateId: forest.id,
      posedTick: s.tick,
      cast: { A: woodward.id },
      optionIds: forest.options.map((o) => o.id),
    };

    const report = tick(s, CATALOG, { templateId: forest.id, optionId: 'leave_it_standing' });
    const [gather] = report.visualEffects;
    expect(gather?.effect).toEqual({ k: 'gather', where: 'ford', days: 2 });
    const cell = Math.floor(gather?.y ?? -1) * s.map.width + Math.floor(gather?.x ?? -1);
    expect(s.map.terrain[cell]).not.toBe(TERRAIN_CODE.water);
    expect(s.map.terrain[cell]).not.toBe(TERRAIN_CODE.marsh);
    expect(neighbours4(cell).some((next) => s.map.terrain[next] === TERRAIN_CODE.water)).toBe(true);

    const standing = s.buildings.filter((building) => building.lostTick === null);
    const coreX = standing.reduce((sum, building) => sum + building.x + building.w / 2, 0) / standing.length;
    const coreY = standing.reduce((sum, building) => sum + building.y + building.h / 2, 0) / standing.length;
    const distance = (Math.floor(gather?.x ?? -1) + 0.5 - coreX) ** 2
      + (Math.floor(gather?.y ?? -1) + 0.5 - coreY) ** 2;
    const nearerBank = [...s.map.terrain].some((terrain, candidate) => {
      if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh) return false;
      if (!neighbours4(candidate).some((next) => s.map.terrain[next] === TERRAIN_CODE.water)) return false;
      const x = candidate % s.map.width;
      const y = Math.floor(candidate / s.map.width);
      const candidateDistance = (x + 0.5 - coreX) ** 2 + (y + 0.5 - coreY) ** 2;
      return candidateDistance < distance || (candidateDistance === distance && candidate < cell);
    });
    expect(nearerBank).toBe(false);
  });

  it('el paso 3 aplica exactamente la decisión pendiente, y no antes (§2.60)', () => {
    const s = foundGame(7);
    const template = CATALOG.find((t) => t.id === 'chapel_or_granary') as CrossroadTemplate;
    s.crossroad = {
      templateId: template.id,
      posedTick: s.tick,
      cast: {},
      optionIds: template.options.map((o) => o.id),
    };

    // Sin decisión que encaje con la pendiente, el paso 3 no toca nada.
    const untouched = tick(s, CATALOG);
    expect(untouched.decided).toBeNull();
    expect(s.crossroad?.templateId).toBe(template.id);

    const report = tick(s, CATALOG, { templateId: template.id, optionId: 'the_chapel' });
    expect(report.decided?.optionId).toBe('the_chapel');
    expect(s.crossroad).toBeNull(); // resuelta: deja de estar pendiente (§8.1)
  });

  it('el TickReport trae coordenadas válidas para el efecto visible decidido', () => {
    const s = foundGame(7);
    const template = CATALOG.find((t) => t.id === 'chapel_or_granary') as CrossroadTemplate;
    s.crossroad = {
      templateId: template.id,
      posedTick: s.tick,
      cast: {},
      optionIds: template.options.map((o) => o.id),
    };

    // `the_chapel` levanta una capilla (build chapel + visible: raise chapel):
    // la coordenada tiene que ser la de la obra que el propio tick acaba de
    // abrir, no una al azar.
    const report = tick(s, CATALOG, { templateId: template.id, optionId: 'the_chapel' });
    expect(report.visualEffects).toEqual([{ effect: { k: 'raise', kind: 'chapel' }, x: expect.any(Number), y: expect.any(Number) }]);
    const [placed] = report.visualEffects;
    expect(placed?.x).toBeGreaterThanOrEqual(0);
    expect(placed?.x).toBeLessThan(s.map.width);
    expect(placed?.y).toBeGreaterThanOrEqual(0);
    expect(placed?.y).toBeLessThan(s.map.height);
    const work = s.works.find((w) => w.kind === 'chapel' && w.startedTick === s.tick);
    expect(work).toBeDefined();
    expect(placed?.x).toBeCloseTo((work?.x ?? 0) + (work?.w ?? 0) / 2);
    expect(placed?.y).toBeCloseTo((work?.y ?? 0) + (work?.h ?? 0) / 2);
  });

  it('un efecto sin sitio natural cae en el centro de la aldea, no en un punto cualquiera', () => {
    const s = foundGame(7);
    const template = CATALOG.find((t) => t.id === 'winter_grain_debt') as CrossroadTemplate;
    s.crossroad = {
      templateId: template.id,
      posedTick: s.tick,
      cast: {},
      optionIds: template.options.map((o) => o.id),
    };

    // 'kneel' iza un estandarte (§17 M-22: sin edificio bajo él, "sobre el
    // centro" por definición) — no un raise ni un ruin que resolver.
    const report = tick(s, CATALOG, { templateId: template.id, optionId: 'kneel' });
    expect(report.visualEffects).toHaveLength(1);
    const [placed] = report.visualEffects;
    expect(placed?.effect).toEqual({ k: 'banner', colour: 'grey', years: 0 });

    const standing = s.buildings.filter((b) => b.lostTick === null);
    const coreX = standing.reduce((sum, b) => sum + b.x + b.w / 2, 0) / standing.length;
    const coreY = standing.reduce((sum, b) => sum + b.y + b.h / 2, 0) / standing.length;
    expect(placed?.x).toBeCloseTo(coreX);
    expect(placed?.y).toBeCloseTo(coreY);
  });

  it("douse con 'who' apaga el edificio de esa persona, no una casa cualquiera (§11.5, v2.62)", () => {
    const s = foundGame(7);
    // Cuatro casas en pie con inquilinos distintos: sin `who`, `douse kind
    // house` no podría saber cuál — es justo lo que A.7 prometía y no cumplía.
    expect(s.buildings.filter((b) => b.kind === 'house' && b.lostTick === null).length).toBeGreaterThan(1);
    const a = s.people.villagers.find((v) => v.role === 'leader') as Villager; // home 2
    const b = s.people.villagers.find((v) => v.role === 'smith') as Villager; // home 1
    expect(a.homeId).not.toBe(b.homeId);
    const bHome = s.buildings.find((building) => building.id === b.homeId)!;

    const template = CATALOG.find((t) => t.id === 'smith_feud') as CrossroadTemplate;
    s.crossroad = {
      templateId: template.id,
      posedTick: s.tick,
      cast: { A: a.id, B: b.id },
      optionIds: template.options.map((o) => o.id),
    };

    // side_with_a: {B} withdraws, y el efecto visible es "douse del edificio
    // de B" (Anexo A.7) — la casa de b, no la de a ni ninguna otra.
    const report = tick(s, CATALOG, { templateId: template.id, optionId: 'side_with_a' });
    expect(report.visualEffects).toEqual([{ effect: { k: 'douse', kind: 'house', who: 'B' }, x: expect.any(Number), y: expect.any(Number) }]);
    const [placed] = report.visualEffects;
    expect(placed?.x).toBeCloseTo(bHome.x + bHome.w / 2);
    expect(placed?.y).toBeCloseTo(bHome.y + bHome.h / 2);
  });

  it("douse con 'who' cae en el centro de la aldea si la persona no tiene casa en pie", () => {
    const s = foundGame(7);
    const a = s.people.villagers.find((v) => v.role === 'leader') as Villager;
    const b = s.people.villagers.find((v) => v.role === 'smith') as Villager;
    b.homeId = null; // homeless: no hay edificio suyo que localizar

    const template = CATALOG.find((t) => t.id === 'smith_feud') as CrossroadTemplate;
    s.crossroad = {
      templateId: template.id,
      posedTick: s.tick,
      cast: { A: a.id, B: b.id },
      optionIds: template.options.map((o) => o.id),
    };
    const report = tick(s, CATALOG, { templateId: template.id, optionId: 'side_with_a' });
    const [placed] = report.visualEffects;

    // Sin casa que resolver, y con más de una en pie, cae al centro — no a una
    // casa cualquiera elegida por casualidad de orden.
    const standing = s.buildings.filter((building) => building.kind === 'house' && building.lostTick === null);
    expect(standing.length).toBeGreaterThan(1);
    const allStanding = s.buildings.filter((building) => building.lostTick === null);
    const coreX = allStanding.reduce((sum, building) => sum + building.x + building.w / 2, 0) / allStanding.length;
    const coreY = allStanding.reduce((sum, building) => sum + building.y + building.h / 2, 0) / allStanding.length;
    expect(placed?.x).toBeCloseTo(coreX);
    expect(placed?.y).toBeCloseTo(coreY);
  });
});

describe('cobertura de vacantes · §6.2', () => {
  it('un oficio vacante se cubre en la semana 0', () => {
    const s = foundGame(7);
    const smith = s.people.villagers.find((v) => v.role === 'smith') as Villager;
    smith.diedTick = 1;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== smith.id);
    expect(holderOf(s, 'smith')).toBeNull();

    s.tick = YEAR;
    fillVacancies(s);
    expect(holderOf(s, 'smith')).not.toBeNull();
  });

  it('elige dentro de la banda, no al más viejo', () => {
    // §6.2 v2.9: la lectura de "por edad" como "el mayor" envejecía el reparto
    // entero y disparaba la sucesión al doble de su ritmo.
    for (let seed = 0; seed < 30; seed += 1) {
      const s = foundGame(seed);
      const reeve = s.people.villagers.find((v) => v.role === 'reeve') as Villager;
      reeve.diedTick = 1;
      s.people.namedIds = s.people.namedIds.filter((id) => id !== reeve.id);

      s.tick = YEAR;
      const eligibleBand = s.people.villagers.filter(
        (v) => isHere(v) && !v.named && v.role === null
          && ageOf(v, s.tick) >= 22 && ageOf(v, s.tick) <= PEOPLE.ROLE_MAX_PREFERRED,
      );
      fillVacancies(s);
      const chosen = s.people.villagers.find((v) => v.role === 'reeve' && isHere(v));
      if (chosen === undefined || eligibleBand.length === 0) continue;
      expect(ageOf(chosen, s.tick), `semilla ${seed}`).toBeLessThanOrEqual(
        PEOPLE.ROLE_MAX_PREFERRED,
      );
    }
  });

  it('el líder NO se cubre solo: eso es la sucesión', () => {
    // §6.6. Cubrirlo aquí mataría la plantilla que es el latido del bucle largo.
    const s = foundGame(7);
    const leader = s.people.villagers.find((v) => v.role === 'leader') as Villager;
    leader.diedTick = 1;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== leader.id);

    s.tick = YEAR;
    fillVacancies(s);
    expect(holderOf(s, 'leader')).toBeNull();
  });

  it('sin capilla no hay cura', () => {
    const s = foundGame(7);
    const priest = s.people.villagers.find((v) => v.role === 'priest') as Villager;
    priest.diedTick = 1;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== priest.id);

    s.tick = YEAR;
    fillVacancies(s);
    expect(holderOf(s, 'priest')).toBeNull();

    s.buildings.push({
      id: 999, kind: 'chapel', x: 0, y: 0, w: 2, h: 2,
      builtTick: 0, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    fillVacancies(s);
    expect(holderOf(s, 'priest')).not.toBeNull();
  });
});

describe('políticas · §12.9', () => {
  it('first toma la primera y last la última', () => {
    const s = foundGame(7);
    run(s, 3000, 'first', CATALOG);
    if (s.crossroad !== null) {
      expect(decide(s, CATALOG, 'first')).toBe(s.crossroad.optionIds[0]);
      expect(decide(s, CATALOG, 'last')).toBe(
        s.crossroad.optionIds[s.crossroad.optionIds.length - 1],
      );
    }
  });

  it('sin encrucijada pendiente no hay nada que decidir', () => {
    const s = foundGame(7);
    expect(decide(s, CATALOG, 'first')).toBeNull();
  });

  it('first es acomodaticia: nunca levanta la empalizada', () => {
    // §12.9 v2.10. Ninguna política es neutra, y ésta es la razón: `bandits`
    // tiene por interruptor una obra que `first` no elige jamás.
    const s = foundGame(7);
    run(s, 100 * YEAR, 'first', CATALOG);
    const walled = s.history.filter((d) => d.optionId === 'wall_the_village_first');
    expect(walled).toHaveLength(0);
  });
});
