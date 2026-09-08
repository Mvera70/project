// M-08 · design.md Anexo A, §8.1, §9.3, §14.1.
//
// Lo que hay que proteger es que el catálogo sea contenido vivo: que ninguna
// opción deje la pantalla igual, que ninguna clave de texto falte, y sobre todo
// que ninguna plantilla tenga condiciones que no se cumplan jamás. Una
// plantilla que nunca sale es contenido muerto, y con dieciséis escritas a mano
// es fácil que pase.
import { beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import type { CrossroadCategory } from '@engine/crossroads/schema';
import type { GameState } from '@engine/state';
import { population } from '@engine/people/demography';
import { BANK, CROSSROAD_BANK } from '@engine/chronicle/bank.en';
import { founded, silentIn, sweep, tick, YEAR } from '../helpers/catalogue-bench';


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
          ...o.seeds.flatMap((seed) => BANK[seed.chronicleKey] ?? []),
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
// Cobertura
//
// El banco vive en tests/helpers/catalogue-bench.ts porque lo comparten las dos
// suites. El barrido completo —30 semillas × 150 años— cuesta unos veinticinco
// segundos él solo, que es el presupuesto entero de §14.1, así que se ejecuta
// en tests/balance/catalog-coverage.test.ts. Aquí queda el que cabe.
// ---------------------------------------------------------------------------

describe('el catálogo · cobertura rápida', () => {
  let seen: Map<string, number>;
  beforeAll(() => { seen = sweep(12, 100); });

  // Estas seis necesitan siglos o estados muy concretos y no salen en doce
  // partidas de cien años. Que no falten de verdad lo comprueba el barrido
  // completo de tests/balance/, no esta prueba.
  const SLOW = [
    'plague_blame', 'forest_cut', 'wolf_winter', 'first_stone',
    'chapel_or_granary', 'feud_inherited',
  ];

  it('ninguna plantilla corriente se queda a cero en 12 semillas × 100 años', () => {
    // Contenido muerto: condiciones que no se cumplen nunca. Con dieciséis
    // escritas a mano, es el fallo más fácil de cometer y el más difícil de ver.
    const missing = silentIn(seen).filter((id) => !SLOW.includes(id));
    expect(missing, `sin salir nunca: ${missing.join(', ')}`).toEqual([]);
  });

  it('las categorías del bucle largo hablan', () => {
    const byCategory = new Set(
      CATALOG.filter((t) => (seen.get(t.id) ?? 0) > 0).map((t) => t.category),
    );
    for (const c of ['famine', 'lord', 'feud', 'faith', 'stranger', 'succession'] as CrossroadCategory[]) {
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
