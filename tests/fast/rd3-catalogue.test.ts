// RD-3 · Las ocho encrucijadas reescritas y las seis retiradas.
//
// Vera aplicó el dictamen de `docs/medidas/rd0-encrucijadas-2026-09-30.md` el 1
// oct 2026. Aquí se guardan las **propiedades** que el dictamen pedía, no las
// cifras: que un efecto de grano no sea un número fijo pensado para otra aldea,
// que una condición de sitio se pueda preguntar y que un rencor se pueda exigir
// real, y que una retirada pendiente en un guardado se siga leyendo y
// contestando (la parte que RD-0 midió rota). Lo que sólo se ve jugando —quién
// es B cuando se plantea, cuántas veces sale cada una— vive en
// `tests/journeys/catalogue-coverage.test.ts` (sección RD-3).

import { describe, expect, it } from 'vitest';
import { CROSSROAD_EFFECTS } from '@engine/balance';
import { CATALOG, RETIRED_TEMPLATES, templateOf } from '@engine/crossroads/catalog';
import { fillCast } from '@engine/crossroads/cast';
import { evaluate } from '@engine/crossroads/conditions';
import type { CrossroadTemplate } from '@engine/crossroads/schema';
import { deserialize, serialize } from '@engine/save';
import { requestBuild } from '@engine/world/works';
import { run, tick } from '@engine/sim';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const REWRITTEN = [
  'winter_grain_debt', 'hungry_spring', 'granary_theft', 'smith_feud',
  'feud_inherited', 'forest_cut', 'after_the_raid', 'first_stone',
];
const SIX = ['plague_blame', 'tithe_demand', 'chapel_or_granary', 'relic_pedlar', 'wolf_winter', 'bandits'];

const theOne = (id: string): CrossroadTemplate => {
  const t = templateOf(CATALOG, id);
  if (t === undefined) throw new Error(`falta ${id}`);
  return t;
};

describe('RD-3 · escala: nada que dependa del tamaño de la aldea es un número fijo', () => {
  it('ningún efecto de grano de las reescritas es un `delta` fijo: es una proporción de lo que hay', () => {
    // RD-0 T5: +900, +600, +300, +140, +120 y −450 pensados para 40–80
    // personas y heredados por aldeas de siete. Un `mul` escala solo.
    const fixed: string[] = [];
    for (const id of REWRITTEN) {
      for (const o of theOne(id).options) {
        for (const e of [...o.effects, ...o.seeds.flatMap((s) => s.effects)]) {
          if (e.k === 'stat' && e.stat === 'grain' && 'delta' in e) fixed.push(`${id}.${o.id}: ${e.delta}`);
        }
      }
    }
    expect(fixed).toEqual([]);
  });

  it('lo que traen los carros no es más del triple del granero, ni lo que se roba menos que nada', () => {
    // Cota de cordura sobre las constantes: un `mul` de 20 es un error de
    // dedo, y uno ≥ 1 en un robo sería regalar grano.
    expect(CROSSROAD_EFFECTS.KNEEL_GRAIN_MUL).toBeGreaterThan(1);
    expect(CROSSROAD_EFFECTS.KNEEL_GRAIN_MUL).toBeLessThanOrEqual(3);
    expect(CROSSROAD_EFFECTS.NIGHT_GRAIN_MUL).toBeLessThan(CROSSROAD_EFFECTS.KNEEL_GRAIN_MUL);
    expect(CROSSROAD_EFFECTS.THEFT_GRAIN_MUL).toBeLessThan(1);
    expect(CROSSROAD_EFFECTS.THEFT_GRAIN_MUL).toBeGreaterThan(0.5);
  });

  it('`winter_grain_debt` llega al caserío, con un préstamo proporcional y no fijo', () => {
    // RD-6 (Vera, 1 oct 2026): el límite de veinte personas de RD-3 dejaba al
    // caserío sin su salvavidas del segundo invierno (hambre a tres años de 20 a
    // 39 muertes en 16 semillas). El préstamo sigue siendo proporcional.
    const t = theOne('winter_grain_debt');
    expect(t.requires.some((c) => c.k === 'stat' && c.stat === 'people' && c.op === '>=' && c.v > 2)).toBe(false);
    const kneel = t.options.find((o) => o.id === 'kneel')!;
    expect(kneel.effects.some((e) => e.k === 'stat' && e.stat === 'grain' && 'mul' in e)).toBe(true);
    expect(kneel.effects.some((e) => e.k === 'stat' && e.stat === 'grain' && 'delta' in e)).toBe(false);
  });

  it('`granary_theft` toca el grano en las tres opciones', () => {
    for (const o of theOne('granary_theft').options) {
      expect(o.effects.some((e) => e.k === 'stat' && e.stat === 'grain'), o.id).toBe(true);
    }
  });
});

describe('RD-3 · el DSL sabe preguntar por el sitio y por un rencor real', () => {
  it('`room` es `withinCap`: con ocho campos ya no hay sitio para otro', () => {
    const s = foundTwenty(7);
    const room = { k: 'room', building: 'field' } as const;
    // Una aldea recién hecha tiene campos de sobra por levantar.
    expect(evaluate(room, s)).toBe(true);
    const field = s.buildings.find((b) => b.kind === 'field' && b.lostTick === null);
    expect(field).toBeDefined();
    if (field === undefined) return;
    const base = field;
    let id = 9000;
    while (s.buildings.filter((b) => b.kind === 'field' && b.lostTick === null).length < 8) {
      s.buildings.push({ ...base, id: id += 1 });
    }
    expect(evaluate(room, s)).toBe(false);
  });

  it('`room` de una estaca pide además el anillo escrito: sin él `placeBuilding` la rechaza', () => {
    // A2c: la aldea decide su anillo con once casas, y antes cualquier estaca
    // concedida por una encrucijada se rechazaba en silencio (`build_together`,
    // `build_up`: medido en las semillas 7 y 11 hasta el año 12).
    const s = foundTwenty(7);
    const room = { k: 'room', building: 'palisade' } as const;
    expect(s.ring).toBeNull();
    expect(evaluate(room, s)).toBe(false);
    expect(requestBuild(s, 'palisade')).toBeNull();
  });

  it('el reparto `grudgeAgainst` con `min` sólo cuenta si el rencor llega', () => {
    const s = foundTwenty(7);
    const t = theOne('smith_feud');
    // Nadie odia a nadie al nacer la aldea: sin rencor real no hay reparto.
    for (const v of s.people.villagers) for (const k of Object.keys(v.opinions)) v.opinions[Number(k)] = 0;
    expect(fillCast(t, s)).toBeNull();

    // Un rencor flojo (−20) tampoco: la riña tiene que ser de verdad.
    const [a, b] = s.people.namedIds;
    const first = s.people.villagers.find((v) => v.id === a);
    const second = s.people.villagers.find((v) => v.id === b);
    expect(first && second).toBeTruthy();
    if (first === undefined || second === undefined || a === undefined || b === undefined) return;
    second.opinions[a] = -20;
    first.opinions[b] = -20;
    expect(fillCast(t, s)).toBeNull();

    // Uno hondo sí: reparte a los dos, y B es el que odia.
    second.opinions[a] = -(CROSSROAD_EFFECTS.SMITH_FEUD_MIN_OPINION + 5);
    first.opinions[b] = -(CROSSROAD_EFFECTS.SMITH_FEUD_MIN_OPINION + 5);
    const cast = fillCast(t, s);
    expect(cast).not.toBeNull();
    const other = cast !== null ? s.people.villagers.find((v) => v.id === cast['B']) : undefined;
    expect(other?.opinions[cast?.['A'] ?? -1] ?? 0).toBeLessThanOrEqual(-CROSSROAD_EFFECTS.SMITH_FEUD_MIN_OPINION);
  });
});

describe('RD-3 · lo que se promete es lo que el motor hace', () => {
  it('`feud_inherited`: B es el que odia a A (un nombrado), no un hijo anónimo, y el oficio sólo si no hay herrero', () => {
    const t = theOne('feud_inherited');
    const b = t.cast.find((c) => c.as === 'B');
    expect(b).toMatchObject({ grudgeAgainst: 'A' });
    expect(t.cast.some((c) => 'childOf' in c)).toBe(false);
    const smithy = t.options.find((o) => o.id === 'give_b_the_smithy');
    expect(smithy?.requires).toContainEqual({ k: 'role', role: 'smith', alive: false });
  });

  it('`after_the_raid.build_up` construye empalizada: pide la obra que anuncia', () => {
    const o = theOne('after_the_raid').options.find((x) => x.id === 'build_up');
    expect(o?.effects.filter((e) => e.k === 'build' && e.kind === 'palisade').length).toBeGreaterThanOrEqual(1);
    expect(o?.visible).toContainEqual({ k: 'raise', kind: 'palisade' });
  });

  it('`first_stone` ya no espera al año 41: pide la primera piedra (la iglesia) y el cerco sin cerrar', () => {
    const t = theOne('first_stone');
    expect(t.minYear).toBeUndefined();
    expect(t.requires).toContainEqual({ k: 'has', building: 'church' });
    expect(t.requires).toContainEqual({ k: 'flag', flag: 'wall_closed', set: false });
    expect(t.requires.some((c) => c.k === 'year')).toBe(false);
  });

  it('`forest_cut` pide sitio para un campo y una despensa corta', () => {
    const t = theOne('forest_cut');
    expect(t.requires).toContainEqual({ k: 'room', building: 'field' });
    expect(t.requires.some((c) => c.k === 'ratio' && c.ratio === 'grainToHarvest' && c.op === '<')).toBe(true);
  });

  it('`hungry_spring` no exige un `reeve` ni una `midwife`: la ve el caserío', () => {
    const t = theOne('hungry_spring');
    expect(t.cast.some((c) => 'role' in c)).toBe(false);
  });

  it('ninguna opción de las reescritas promete un «si» que el motor cumple siempre', () => {
    // `take_it_at_night` decía «If it is found out» y su semilla no tenía
    // condición. Ahora el precio no condiciona lo que no se condiciona.
    const o = theOne('winter_grain_debt').options.find((x) => x.id === 'take_it_at_night');
    const seed = o?.seeds[0];
    expect(seed?.condition).toBeUndefined();
  });
});

function withPending(templateId: string, seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, 30, 'prudent', CATALOG);
  const template = theOne(templateId);
  const alive = state.people.villagers.filter((p) => p.diedTick === null && p.leftTick === null);
  state.crossroad = {
    templateId,
    posedTick: state.tick,
    cast: Object.fromEntries(template.cast.map((c, i) => [c.as, alive[i]!.id])),
    optionIds: template.options.map((o) => o.id),
  };
  const saved = structuredClone(serialize(state, [], [], 0)) as unknown;
  return deserialize(saved).state;
}

describe('RD-3 · las seis retiradas siguen siendo preguntas en un guardado', () => {
  it('cada una, pendiente, carga, se contesta con cada opción y el valle vuelve a preguntar', () => {
    for (const id of SIX) {
      expect(RETIRED_TEMPLATES.some((t) => t.id === id), id).toBe(true);
      for (const option of theOne(id).options) {
        const state = withPending(id, 7);
        expect(templateOf(CATALOG, state.crossroad!.templateId)?.title, id).toBeTruthy();
        tick(state, CATALOG, { templateId: id, optionId: option.id });
        expect(state.history.some((d) => d.templateId === id && d.optionId === option.id), `${id}.${option.id}`).toBe(true);
        expect(state.crossroad?.templateId ?? null, `${id}.${option.id}`).not.toBe(id);
        // Las semillas que plantó se disparan solas, con su crónica.
        const planted = state.seeds.filter((s) => s.fromTemplateId === id);
        expect(planted.length, `${id}.${option.id}`).toBe(option.seeds.length);
      }
    }
  });
});
