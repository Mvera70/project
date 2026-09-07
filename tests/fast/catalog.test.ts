// M-08 · design.md Anexo A, §8.1, §9.3, §14.1.
//
// Lo que hay que proteger es que el catálogo sea contenido vivo: que ninguna
// opción deje la pantalla igual, que ninguna clave de texto falte, y sobre todo
// que ninguna plantilla tenga condiciones que no se cumplan jamás. Una
// plantilla que nunca sale es contenido muerto, y con dieciséis escritas a mano
// es fácil que pase.
import { describe, expect, it } from 'vitest';
import { FOUNDING, TIME } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type { Building, GameState, TickContext } from '@engine/state';
import { ageOf, foundPeople, minAgeFor, promoteToNamed } from '@engine/people/villagers';
import {
  isHere,
  population,
  resolveBirths,
  resolveDeaths,
  resolveMigration,
} from '@engine/people/demography';
import { driftOpinions } from '@engine/people/opinions';
import { decayMemories } from '@engine/people/memories';
import { allocateLabour, produce } from '@engine/subsistence/labour';
import { consume, overwinter } from '@engine/subsistence/consumption';
import { applySpoilage, harvest } from '@engine/subsistence/harvest';
import { isUnexplained, updateMood } from '@engine/subsistence/mood';
import { rollWeather } from '@engine/subsistence/seasons';
import { rollPlague } from '@engine/subsistence/disasters';
import { count } from '@engine/subsistence/building-counts';
import { CATALOG } from '@engine/crossroads/catalog';
import type { AppliedEffects, CrossroadCategory } from '@engine/crossroads/schema';
import { holderOf } from '@engine/crossroads/conditions';
import { selectCrossroad } from '@engine/crossroads/select';
import { applyOption } from '@engine/crossroads/resolve';
import { fireSeeds } from '@engine/crossroads/seeds';
import { BANK, CROSSROAD_BANK } from '@engine/chronicle/bank.en';

const CELLS = 36 * 56;
const YEAR = TIME.WEEKS_PER_YEAR;

describe('el catálogo · forma', () => {
  it('son las dieciséis del Anexo A más la reserva', () => {
    expect(CATALOG).toHaveLength(17);
    expect(CATALOG.some((t) => t.id === 'quiet_years')).toBe(true);
  });

  it('ningún identificador repetido, y todos en snake_case', () => {
    const ids = CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('las ocho categorías tienen dos plantillas', () => {
    const byCategory = new Map<CrossroadCategory, number>();
    for (const t of CATALOG) byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
    for (const c of [
      'famine', 'plague', 'lord', 'feud', 'faith', 'forest', 'succession',
    ] as CrossroadCategory[]) {
      expect(byCategory.get(c), c).toBe(2);
    }
    // stranger lleva tres: las dos suyas y quiet_years, que es la reserva.
    expect(byCategory.get('stranger')).toBe(3);
  });

  it('toda plantilla tiene 2 o 3 opciones, con ids únicos', () => {
    for (const t of CATALOG) {
      expect(t.options.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.options.length, t.id).toBeLessThanOrEqual(3);
      const ids = t.options.map((o) => o.id);
      expect(new Set(ids).size, t.id).toBe(ids.length);
    }
  });

  it('TODA opción cambia algo en pantalla', () => {
    // El principio 1 del juego convertido en aserto (§8.1). Si esto falla, hay
    // una decisión que el jugador toma y no ve.
    for (const t of CATALOG) {
      for (const o of t.options) {
        expect(o.visible.length, `${t.id}.${o.id}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('los pesos, reposos y topes son sensatos', () => {
    for (const t of CATALOG) {
      expect(t.weight, t.id).toBeGreaterThan(0);
      expect(t.cooldownYears, t.id).toBeGreaterThanOrEqual(0);
      if (t.maxPerGame !== undefined) expect(t.maxPerGame, t.id).toBeGreaterThan(0);
      if (t.minYear !== undefined) expect(t.minYear, t.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('todo reparto declara letras únicas y sólo referencia letras que existen', () => {
    for (const t of CATALOG) {
      const letters = t.cast.map((c) => c.as);
      expect(new Set(letters).size, t.id).toBe(letters.length);
      for (const spec of t.cast) {
        const refs: string[] = [];
        if ('grudgeAgainst' in spec) refs.push(spec.grudgeAgainst);
        if ('childOf' in spec) refs.push(spec.childOf);
        if ('anyNamed' in spec) refs.push(...(spec.excluding ?? []));
        for (const r of refs) expect(letters, `${t.id} -> ${r}`).toContain(r);
      }
    }
  });

  it('todo efecto y toda semilla referencian letras declaradas', () => {
    for (const t of CATALOG) {
      const letters = new Set(t.cast.map((c) => c.as));
      const check = (who: string, where: string): void => {
        if (who === 'random' || who === 'weakest') return;
        expect(letters.has(who), `${where}: ${who}`).toBe(true);
      };
      for (const o of t.options) {
        for (const e of [...o.effects, ...o.seeds.flatMap((s) => s.effects)]) {
          if (e.k === 'kill') check(e.who, `${t.id}.${o.id}`);
          if (e.k === 'memory') {
            check(e.who, `${t.id}.${o.id}`);
            if (e.about !== undefined) check(e.about, `${t.id}.${o.id}`);
          }
          if (e.k === 'role') check(e.who, `${t.id}.${o.id}`);
          if (e.k === 'opinion') {
            check(e.from, `${t.id}.${o.id}`);
            check(e.to, `${t.id}.${o.id}`);
          }
        }
      }
    }
  });

  it('toda semilla tiene retraso creciente y una clave de crónica', () => {
    for (const t of CATALOG) {
      for (const o of t.options) {
        for (const s of o.seeds) {
          expect(s.delayYears[0], `${t.id}.${o.id}.${s.id}`).toBeGreaterThan(0);
          expect(s.delayYears[1], `${t.id}.${o.id}.${s.id}`).toBeGreaterThanOrEqual(s.delayYears[0]);
          expect(s.chronicleKey, `${t.id}.${o.id}.${s.id}`).toMatch(/^consequence\./);
        }
      }
    }
  });

  it('la reserva no planta semillas', () => {
    // §A.17: existe para que la garantía nunca falle, no para ser interesante.
    const quiet = CATALOG.find((t) => t.id === 'quiet_years');
    for (const o of quiet?.options ?? []) expect(o.seeds).toEqual([]);
  });
});

describe('el catálogo · los textos', () => {
  it('toda clave de pantalla existe en CROSSROAD_BANK', () => {
    for (const t of CATALOG) {
      expect(CROSSROAD_BANK[t.title], t.title).toBeDefined();
      expect(CROSSROAD_BANK[t.body], t.body).toBeDefined();
      for (const o of t.options) {
        expect(CROSSROAD_BANK[o.label], o.label).toBeDefined();
        expect(CROSSROAD_BANK[o.cost], o.cost).toBeDefined();
      }
    }
  });

  it('toda clave de crónica existe en el banco, con 3 a 5 variantes', () => {
    // El test que M-09 dejó para aquí: ahora que el catálogo existe, sus claves
    // se pueden verificar.
    const keys: string[] = [];
    for (const t of CATALOG) {
      for (const o of t.options) {
        keys.push(`crossroad.${t.id}.${o.id}`);
        for (const s of o.seeds) keys.push(s.chronicleKey);
      }
    }
    for (const key of new Set(keys)) {
      const variants = BANK[key];
      expect(variants, key).toBeDefined();
      expect((variants ?? []).length, key).toBeGreaterThanOrEqual(3);
      expect((variants ?? []).length, key).toBeLessThanOrEqual(5);
    }
  });

  it('toda consecuencia puede citar su origen', () => {
    // §8.5: la frase que enlaza decisión y consecuencia es el producto del
    // juego. Una clave que no puede decir cuándo se decidió está mal escrita.
    for (const t of CATALOG) {
      for (const o of t.options) {
        for (const s of o.seeds) {
          for (const variant of BANK[s.chronicleKey] ?? []) {
            const cites = variant.includes('{years}') || variant.includes('{sinceYear}');
            expect(cites, `${s.chronicleKey}: ${variant}`).toBe(true);
          }
        }
      }
    }
  });

  it('los textos de pantalla respetan §9.3', () => {
    const banned = [
      'wisely', 'foolishly', 'thankfully', 'sadly', 'luckily', 'unfortunately',
      'fortunately', 'mercifully', 'cruelly', 'bravely', 'stupidly', 'rightly',
      'wrongly', 'should have', 'if only',
    ];
    for (const [key, text] of Object.entries(CROSSROAD_BANK)) {
      expect(text, key).not.toContain('!');
      const lower = ` ${text.toLowerCase()} `;
      for (const w of [' you ', ' your ', ' yours ', ' yourself ']) {
        expect(lower, `${key}: ${text}`).not.toContain(w);
      }
      for (const w of banned) expect(lower, `${key}: ${w}`).not.toContain(w);
      expect(text.length, key).toBeGreaterThan(0);
      expect(text, key).toBe(text.trim());
    }
  });

  it('toda plantilla nombra a alguien del reparto en alguna parte', () => {
    // Un dilema sin nadie dentro es un aviso del sistema, no una encrucijada.
    // Basta con que lo nombre el cuerpo o el precio de una opción: A.14 pone la
    // situación en el cuerpo y la persona en el precio de "Fight them".
    for (const t of CATALOG) {
      const texts = [
        CROSSROAD_BANK[t.body] ?? '',
        ...t.options.flatMap((o) => [CROSSROAD_BANK[o.label] ?? '', CROSSROAD_BANK[o.cost] ?? '']),
      ].join(' ');
      const named = t.cast.some((c) => texts.includes(`{${c.as}}`));
      expect(named, t.id).toBe(true);
    }
  });

  it('ninguna plantilla usa una letra que no reparte, en ningún texto', () => {
    for (const t of CATALOG) {
      const letters = new Set(t.cast.map((c) => c.as));
      const texts = [
        CROSSROAD_BANK[t.title] ?? '',
        CROSSROAD_BANK[t.body] ?? '',
        ...t.options.flatMap((o) => [
          CROSSROAD_BANK[o.label] ?? '',
          CROSSROAD_BANK[o.cost] ?? '',
          ...(BANK[`crossroad.${t.id}.${o.id}`] ?? []),
        ]),
      ];
      for (const text of texts) {
        for (const hole of text.match(/\{([A-Z])\}/g) ?? []) {
          const letter = hole.slice(1, -1);
          expect(letters.has(letter), `${t.id}: ${hole} en "${text}"`).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Cobertura: ninguna plantilla a cero apariciones
// ---------------------------------------------------------------------------

let bid = 0;
const build = (kind: Building['kind']): Building => ({
  id: ++bid, kind, x: 0, y: 0, w: 2, h: 2, builtTick: 0, lostTick: null, tier: 0, lit: true,
});

/**
 * Una aldea con edificios generosos: M-13 y M-14 no existen, así que se le dan
 * de entrada los que el catálogo necesita poder ver. No es la partida real —
 * es el banco de pruebas que permite que las condiciones se cumplan alguna vez.
 */
function founded(seed: number): GameState {
  bid = 0;
  const rng = makeBundle(seed);
  return {
    version: 1, seed, tick: 0, rng,
    map: {
      width: 36, height: 56,
      terrain: new Uint8Array(CELLS).fill(1, 0, Math.floor(CELLS * 0.45)),
      traffic: new Uint16Array(CELLS), path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS), forestAge: new Uint8Array(CELLS),
    },
    village: { grain: FOUNDING.GRAIN, wood: 900, morale: FOUNDING.MORALE, faith: FOUNDING.FAITH },
    people: foundPeople(rng, 0),
    buildings: [
      ...Array.from({ length: 14 }, () => build('house')),
      ...Array.from({ length: 6 }, () => build('field')),
      build('granary'),
      build('smithy'),
    ],
    works: [], crossroad: null, seeds: [], flags: {}, chronicle: [], history: [],
    weather: { year: 0, index: 2, factor: 1 }, outbreak: null, ended: null,
  };
}

/**
 * §6.2: un oficio que queda vacante se cubre en el paso ANNUAL del año
 * siguiente, con el adulto vivo de más edad que no tenga oficio.
 *
 * Eso vive en sim.ts, que es de M-10 y todavía no existe, así que va aquí como
 * parte del banco de pruebas — igual que el paso 7 se stubbeó en M-04. Sin
 * ello, cuando muere el cura fundador no hay otro nunca, y la mitad del
 * catálogo se queda sin reparto para siempre.
 *
 * El líder NO se cubre así a propósito: su sucesión es una decisión del
 * jugador (§6.6), y cubrirla sola mataría la plantilla que es el latido del
 * bucle largo.
 */
function fillVacancies(s: GameState): void {
  for (const role of ['smith', 'midwife', 'priest', 'woodward', 'reeve'] as const) {
    if (holderOf(s, role) !== null) continue;
    if (role === 'priest' && count(s, 'chapel') === 0) continue; // §6.2
    const best = s.people.villagers
      .filter(
        (v) =>
          isHere(v) &&
          !v.named &&
          v.role === null &&
          ageOf(v, s.tick) >= minAgeFor(role) &&
          (role !== 'midwife' || v.female),
      )
      .sort((a, b) => ageOf(b, s.tick) - ageOf(a, s.tick) || a.id - b.id)[0];
    if (best !== undefined) promoteToNamed(s, best.id, role);
  }
}

/**
 * §8.4: `build` y `destroy` son peticiones, y quien las ejecuta es M-14, que
 * todavía no existe. Sin esto la capilla que paga `chapel_or_granary` no se
 * levanta nunca, y sin capilla §6.2 no nombra cura — con lo que media
 * categoría del catálogo se queda sin reparto para siempre.
 *
 * Otro trozo de M-14 stubbeado en el banco de pruebas. Coloca sin criterio,
 * porque la colocación de §7.4 también es suya.
 */
function carryOut(s: GameState, applied: AppliedEffects): void {
  for (const kind of applied.build) s.buildings.push(build(kind));
  for (const { kind, count: howMany } of applied.destroy) {
    for (const b of s.buildings.filter((x) => x.kind === kind && x.lostTick === null).slice(0, howMany)) {
      b.lostTick = s.tick;
    }
  }
}

/** El tick de §4.2, con los pasos que existen. Política neutra. */
function tick(s: GameState): void {
  s.tick += 1;
  if (s.tick % YEAR === 0) {
    s.weather = rollWeather(s);
    const o = rollPlague(s);
    if (o) s.outbreak = o;
    resolveMigration(s);
    decayMemories(s);
    fillVacancies(s);
  }
  if (s.outbreak && s.tick >= s.outbreak.endsTick) s.outbreak = null;
  if (s.crossroad !== null) {
    const applied = applyOption(s, s.crossroad.optionIds[0] as string, CATALOG);
    if (applied !== null) carryOut(s, applied);
  }
  fireSeeds(s, CATALOG);
  const a = allocateLabour(s);
  produce(s, a);
  const { severity, starved } = consume(s);
  const { cold } = overwinter(s);
  harvest(s, a);
  applySpoilage(s);
  const partial: TickContext = { severity, cold, outbreak: s.outbreak, deaths: 0, unexplainedDeaths: 0 };
  const dead = resolveDeaths(s, partial);
  const ctx: TickContext = {
    ...partial,
    deaths: starved.length + dead.length,
    unexplainedDeaths: dead.filter((d) => isUnexplained(d.cause, d.age)).length,
  };
  updateMood(s, ctx);
  resolveBirths(s, ctx);
  driftOpinions(s);
  if (s.crossroad === null) {
    const posed = selectCrossroad(s, CATALOG);
    if (posed) s.crossroad = posed;
  }
}

describe('el catálogo · cobertura', () => {
  const seen = new Map<string, number>();
  for (let seed = 0; seed < 30; seed += 1) {
    const s = founded(seed);
    for (let i = 0; i < 150 * YEAR && population(s) > 0; i += 1) tick(s);
    for (const d of s.history) seen.set(d.templateId, (seen.get(d.templateId) ?? 0) + 1);
  }

  it('ninguna plantilla se queda a cero apariciones en 30 semillas × 150 años', () => {
    // Contenido muerto: condiciones que no se cumplen nunca. Con dieciséis
    // escritas a mano, es el fallo más fácil de cometer y el más difícil de ver.
    //
    // Las dos de `lord` estuvieron muertas hasta la v2.8: A.1 pedía el granero
    // vacío en invierno, y el invierno empieza la semana 36, justo después de la
    // cosecha. Con `grainToHarvest` y la semana de invierno avanzada disparan.
    const missing = CATALOG.filter((t) => (seen.get(t.id) ?? 0) === 0).map((t) => t.id);
    expect(missing, `sin salir nunca: ${missing.join(', ')}`).toEqual([]);
  });

  it('ninguna categoría se queda muda', () => {
    const byCategory = new Set(
      CATALOG.filter((t) => (seen.get(t.id) ?? 0) > 0).map((t) => t.category),
    );
    for (const c of [
      'famine', 'plague', 'lord', 'feud', 'faith', 'forest', 'stranger', 'succession',
    ] as CrossroadCategory[]) {
      expect(byCategory.has(c), c).toBe(true);
    }
  });
});

describe('el catálogo · en juego', () => {
  it('las decisiones y las consecuencias llegan a la crónica', () => {
    const s = founded(3);
    for (let i = 0; i < 100 * YEAR && population(s) > 0; i += 1) tick(s);

    expect(s.history.length).toBeGreaterThan(0);
    expect(s.chronicle.some((e) => e.kind === 'crossroad_taken')).toBe(true);
    // Y alguna semilla ha vencido: sin eso el juego es un menú de modificadores.
    expect(s.seeds.length).toBeGreaterThan(0);
    expect(s.seeds.some((x) => x.firedTick !== null)).toBe(true);
  });

  it('dos partidas con la misma semilla toman las mismas decisiones', () => {
    const run = (): GameState => {
      const s = founded(9);
      for (let i = 0; i < 40 * YEAR && population(s) > 0; i += 1) tick(s);
      return s;
    };
    expect(run().history).toEqual(run().history);
  });

  it('ninguna entrada de crónica queda con un hueco sin resolver', () => {
    const s = founded(5);
    for (let i = 0; i < 100 * YEAR && population(s) > 0; i += 1) tick(s);
    for (const e of s.chronicle) {
      const variants = BANK[e.templateKey];
      expect(variants, e.templateKey).toBeDefined();
      for (const v of variants ?? []) {
        for (const hole of v.match(/\{(\w+)\}/g) ?? []) {
          const key = hole.slice(1, -1);
          expect(e.params[key], `${e.templateKey} sin ${hole}`).toBeDefined();
        }
      }
    }
  });
});
