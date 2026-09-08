// M-09 · design.md §3.7, §9.1, §9.2, §9.3.
//
// Lo que hay que proteger es la voz. Las prohibiciones de §9.3 son tests porque
// una sola frase que juzgue al jugador rompe el principio del que cuelga todo
// el capítulo 9: la crónica narra, no califica.
import { describe, expect, it } from 'vitest';
import { makeBundle } from '@engine/rng';
import type { ChronicleEntry, ChronicleKind, DeathCause, GameState, Villager } from '@engine/state';
import { foundPeople } from '@engine/people/villagers';
import { BANK } from '@engine/chronicle/bank.en';
import {
  arrivalKey,
  birthKey,
  builtKey,
  deathKey,
  departureKey,
  fireKey,
  harvestKey,
  lostKey,
  record,
  seasonKey,
} from '@engine/chronicle/events';
import { bankKeys, knows, numberWord, renderEntry, renderYear } from '@engine/chronicle/render';
import { epitaphFor, namedDeathEntry } from '@engine/chronicle/events';
import { adjustOpinion } from '@engine/people/opinions';
import { remember } from '@engine/people/memories';
import { welcomeDigest } from '@engine/chronicle/digest';

const CELLS = 36 * 56;

function village(seed: number): GameState {
  const rng = makeBundle(seed);
  return {
    version: 1,
    seed,
    tick: 0,
    rng,
    map: {
      width: 36,
      height: 56,
      terrain: new Uint8Array(CELLS),
      traffic: new Uint16Array(CELLS),
      path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS),
      forestAge: new Uint8Array(CELLS),
      forestStock: new Uint16Array(CELLS),
    },
    village: { grain: 800, wood: 200, morale: 55, faith: 50 },
    people: foundPeople(rng, 0),
    buildings: [],
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [],
    history: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    ended: null,
  };
}

const ALL_TEXTS = Object.values(BANK).flat();

describe('el banco · forma', () => {
  it('toda clave tiene entre 3 y 5 variantes', () => {
    for (const [key, variants] of Object.entries(BANK)) {
      expect(variants.length, key).toBeGreaterThanOrEqual(3);
      expect(variants.length, key).toBeLessThanOrEqual(5);
    }
  });

  it('ninguna clave repite una variante', () => {
    for (const [key, variants] of Object.entries(BANK)) {
      expect(new Set(variants).size, key).toBe(variants.length);
    }
  });

  it('ninguna frase está vacía ni empieza o acaba con espacio', () => {
    for (const t of ALL_TEXTS) {
      expect(t.length).toBeGreaterThan(10);
      expect(t).toBe(t.trim());
    }
  });

  it('toda frase acaba en punto', () => {
    for (const t of ALL_TEXTS) expect(t.endsWith('.'), t).toBe(true);
  });
});

describe('el banco · las prohibiciones de §9.3', () => {
  it('sin signos de exclamación', () => {
    for (const t of ALL_TEXTS) expect(t, t).not.toContain('!');
  });

  it('sin segunda persona', () => {
    // La crónica cuenta lo que pasó en el valle, no lo que hiciste tú.
    for (const t of ALL_TEXTS) {
      const lower = ` ${t.toLowerCase()} `;
      for (const word of [' you ', ' your ', " you're ", ' yours ', ' yourself ']) {
        expect(lower, t).not.toContain(word);
      }
    }
  });

  it('sin ninguna palabra que valore la decisión del jugador', () => {
    // La crónica narra, no juzga. Si un suceso necesita un adverbio para ser
    // interesante, el problema está en el cruce de sistemas, no aquí.
    const banned = [
      'wisely',
      'foolishly',
      'at last',
      'thankfully',
      'sadly',
      'luckily',
      'unfortunately',
      'fortunately',
      'mercifully',
      'cruelly',
      'bravely',
      'stupidly',
      'rightly',
      'wrongly',
      'deserved',
      'should have',
      'if only',
    ];
    for (const t of ALL_TEXTS) {
      const lower = t.toLowerCase();
      for (const word of banned) expect(lower, `${word} en: ${t}`).not.toContain(word);
    }
  });

  it('sin metáforas de las que se cuelan solas', () => {
    // No se puede detectar una metáfora con una regla; sí se pueden prohibir
    // las que aparecen cuando alguien intenta adornar una línea sosa.
    const banned = [
      'like a ',
      'as if',
      'seemed to',
      'the heart of',
      'shadow of',
      'the jaws of',
      'a river of',
      'swallowed by',
      'the hand of fate',
      'darkness fell',
    ];
    for (const t of ALL_TEXTS) {
      const lower = t.toLowerCase();
      for (const word of banned) expect(lower, `${word} en: ${t}`).not.toContain(word);
    }
  });

  it('ningún hueco en minúscula abre una segunda frase', () => {
    // Sólo se capitaliza la primera posición (§9.1), así que una plantilla como
    // "... did not stay there. {season}, year 7." sale con minúscula a mitad.
    // Los huecos que dan número o nombre propio no tienen este problema.
    const lowercaseHoles = ['{season}', '{building}', '{count}'];
    for (const [key, variants] of Object.entries(BANK)) {
      for (const t of variants) {
        for (const hole of lowercaseHoles) {
          expect(t, `${key}: ${t}`).not.toContain(`. ${hole}`);
        }
      }
    }
  });

  it('las frases son cortas: ninguna pasa de 120 caracteres', () => {
    for (const t of ALL_TEXTS) expect(t.length, t).toBeLessThanOrEqual(120);
  });
});

describe('el banco · cobertura', () => {
  const KINDS: ChronicleKind[] = [
    'founding',
    'season',
    'birth',
    'death',
    'harvest',
    'famine',
    'plague',
    'fire',
    'built',
    'lost',
    'arrival',
    'departure',
    'grudge',
    'succession',
    'extinction',
  ];

  it('todo ChronicleKind de §9 tiene al menos una clave, salvo los de encrucijada', () => {
    // crossroad_posed, crossroad_taken y consequence son de M-08: sus claves
    // las escribe el catálogo y allí se comprueban.
    const keys = bankKeys();
    for (const kind of KINDS) {
      const prefix = kind === 'founding' || kind === 'succession' || kind === 'extinction';
      const found = prefix ? keys.includes(kind) : keys.some((k) => k.startsWith(`${kind}.`));
      expect(found, kind).toBe(true);
    }
  });

  it('toda causa de muerte tiene línea con nombre y sin nombre', () => {
    const causes: DeathCause[] = [
      'natural',
      'old_age',
      'hunger',
      'cold',
      'plague',
      'fire',
      'violence',
    ];
    for (const cause of causes) {
      expect(knows(deathKey(cause, true)), cause).toBe(true);
      expect(knows(deathKey(cause, false, 1)), cause).toBe(true);
      expect(knows(deathKey(cause, false, 3)), cause).toBe(true);
    }
  });

  it('todo edificio de §7.2 se puede levantar y perder', () => {
    const kinds = [
      'house', 'field', 'granary', 'well', 'chapel', 'smithy', 'mill',
      'palisade', 'grave_yard', 'wall', 'stone_house', 'church', 'watchtower',
    ] as const;
    for (const k of kinds) {
      expect(knows(builtKey(k)), k).toBe(true);
      expect(knows(lostKey(k)), k).toBe(true);
      expect(knows(fireKey(k)), k).toBe(true);
    }
  });

  it('las cuatro estaciones y los cinco climas están', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
      expect(knows(seasonKey(s)), s).toBe(true);
    }
    for (const f of [0.6, 0.8, 1.0, 1.2, 1.45]) expect(knows(harvestKey(f)), String(f)).toBe(true);
    expect(new Set([0.6, 0.8, 1.0, 1.2, 1.45].map(harvestKey)).size).toBe(5);
  });

  it('llegadas, marchas y nacimientos distinguen uno de varios', () => {
    // Los anónimos no tienen nombre: la crónica los cuenta o no los menciona.
    for (const n of [1, 4]) {
      expect(knows(arrivalKey(n))).toBe(true);
      expect(knows(departureKey(n))).toBe(true);
      expect(knows(birthKey(false, false, n))).toBe(true);
    }
    expect(arrivalKey(1)).not.toBe(arrivalKey(2));
    expect(birthKey(true, true)).not.toBe(birthKey(true, false));
  });

  it('ninguna plantilla de anónimos pide un nombre', () => {
    // Es el fallo que se lleva por delante el primer invierno.
    for (const [key, variants] of Object.entries(BANK)) {
      if (!key.includes('.anon.')) continue;
      for (const t of variants) {
        expect(t, `${key}: ${t}`).not.toContain('{name}');
        expect(t, `${key}: ${t}`).not.toContain('{other}');
      }
    }
  });

  it('ninguna plantilla de uno solo pide un recuento', () => {
    for (const [key, variants] of Object.entries(BANK)) {
      if (!key.endsWith('.one')) continue;
      for (const t of variants) expect(t, `${key}: ${t}`).not.toContain('{count}');
    }
  });
});

describe('render', () => {
  const entry = (over: Partial<ChronicleEntry> = {}): ChronicleEntry => ({
    tick: 100,
    kind: 'death',
    templateKey: 'death.old_age.named',
    params: { name: 'Aelric', age: 71, year: 2, season: 'winter' },
    weight: 2,
    ...over,
  });

  it('sustituye todos los parámetros', () => {
    const text = renderEntry(entry(), makeBundle(7));
    expect(text).not.toMatch(/\{\w+\}/);
    expect(text).toContain('Aelric');
  });

  it('sobre 5 000 entradas no queda ni un hueco sin resolver', () => {
    const b = makeBundle(3);
    const params = {
      name: 'Mildreth',
      other: 'Osric',
      age: 44,
      year: 17,
      season: 'autumn',
      count: 3,
      grain: 1224,
      people: 31,
      building: 'mill',
      sinceYear: 5,
      years: 12,
      // Las letras del reparto: es lo que produce namesOf (§8.3).
      A: 'Aelric',
      B: 'Wulfrun',
    };
    const keys = bankKeys();
    let rendered = 0;
    for (let i = 0; i < 5000; i += 1) {
      const key = keys[i % keys.length] as string;
      const text = renderEntry(entry({ templateKey: key, tick: i, params }), b);
      expect(text, key).not.toMatch(/\{\w+\}/);
      expect(text.startsWith('['), key).toBe(false);
      rendered += 1;
    }
    expect(rendered).toBe(5000);
  });

  it('un parámetro que falta se queda a la vista, no en blanco', () => {
    const text = renderEntry(entry({ params: { age: 71, year: 2, season: 'winter' } }), makeBundle(7));
    expect(text).toContain('{name}');
  });

  it('una clave que no existe se ve, y no revienta', () => {
    expect(renderEntry(entry({ templateKey: 'no.such.key' }), makeBundle(7))).toBe('[no.such.key]');
  });

  it('los recuentos pequeños se escriben con letra', () => {
    expect(numberWord(1)).toBe('one');
    expect(numberWord(3)).toBe('three');
    expect(numberWord(12)).toBe('twelve');
    expect(numberWord(13)).toBe('13');
    expect(numberWord(80)).toBe('80');

    const text = renderEntry(
      entry({ templateKey: 'death.hunger.anon.many', params: { count: 3, season: 'winter', year: 4, people: 18 } }),
      makeBundle(7),
    );
    // Capitalizada si abre la frase, en minúscula si no: en los dos casos
    // escrita con letra y nunca con dígito.
    expect(text.toLowerCase()).toContain('three');
    expect(text).not.toContain('3 ');
  });

  it('toda frase empieza con mayúscula, aunque abra con un recuento', () => {
    // "three came over the ridge" es el fallo que sólo se ve leyendo.
    const b = makeBundle(7);
    const params = {
      name: 'Mildreth', other: 'Osric', age: 44, year: 17, season: 'autumn',
      count: 3, grain: 1224, people: 31, building: 'mill', sinceYear: 5, years: 12,
      A: 'Aelric', B: 'Wulfrun',
    };
    for (const key of bankKeys()) {
      for (let tick = 0; tick < 12; tick += 1) {
        const text = renderEntry(entry({ templateKey: key, tick, params }), b);
        expect(text[0], `${key}: ${text}`).toBe(text[0]?.toUpperCase());
      }
    }
  });

  it('las demás cifras van en números', () => {
    const text = renderEntry(
      entry({ templateKey: 'harvest.poor', params: { grain: 412, people: 23, year: 8 } }),
      makeBundle(7),
    );
    expect(text).toContain('412');
  });

  it('la misma entrada se lee siempre igual, y no gasta el flujo', () => {
    // Si cada render consumiera una tirada, desplazar la crónica y volver
    // reescribiría la historia de la aldea.
    const b = makeBundle(7);
    const before = { ...b };
    const e = entry();
    const first = renderEntry(e, b);
    for (let i = 0; i < 50; i += 1) expect(renderEntry(e, b)).toBe(first);
    expect(b).toEqual(before);
  });

  it('dos entradas de la misma clave y el mismo tick se distinguen', () => {
    // §9.1: su posición en la crónica es el discriminante. Sin él, dos muertos
    // de la misma semana se entierran con las mismas palabras.
    const b = makeBundle(7);
    const e = entry();
    const texts = new Set<string>();
    for (let i = 0; i < 20; i += 1) texts.add(renderEntry(e, b, i));
    expect(texts.size).toBeGreaterThan(1);
  });

  it('el mismo discriminante da siempre el mismo texto', () => {
    const b = makeBundle(7);
    const e = entry();
    expect(renderEntry(e, b, 4)).toBe(renderEntry(e, b, 4));
  });

  it('renderYear distingue dos entradas iguales del mismo tick', () => {
    const s = village(7);
    s.tick = 100;
    for (let i = 0; i < 6; i += 1) {
      record(s, {
        kind: 'death',
        templateKey: 'death.old_age.named',
        params: { name: 'Osric', age: 70, year: 2, season: 'winter' },
        weight: 2,
      });
    }
    expect(new Set(renderYear(s, 2)).size).toBeGreaterThan(1);
  });

  it('dos entradas de la misma clave en ticks distintos no dicen lo mismo', () => {
    const b = makeBundle(7);
    const texts = new Set<string>();
    for (let tick = 0; tick < 40; tick += 1) {
      texts.add(renderEntry(entry({ tick }), b));
    }
    expect(texts.size).toBeGreaterThan(1);
  });

  it('reparte entre todas las variantes de una clave', () => {
    const b = makeBundle(7);
    const seen = new Set<string>();
    for (let tick = 0; tick < 400; tick += 1) seen.add(renderEntry(entry({ tick }), b));
    expect(seen.size).toBe((BANK['death.old_age.named'] as string[]).length);
  });

  it('renderYear devuelve el año en orden y filtra por peso', () => {
    const s = village(7);
    const push = (tick: number, weight: 1 | 2 | 3, key: string): void => {
      s.tick = tick;
      record(s, { kind: 'season', templateKey: key, params: { year: 1, season: 'spring' }, weight });
    };
    push(48, 1, 'season.spring');
    push(60, 2, 'harvest.fair');
    push(70, 3, 'plague.begins');
    push(200, 2, 'harvest.good'); // año 4

    expect(renderYear(s, 1)).toHaveLength(2);
    expect(renderYear(s, 1, 1)).toHaveLength(3);
    expect(renderYear(s, 1, 3)).toHaveLength(1);
    expect(renderYear(s, 4)).toHaveLength(1);
    expect(renderYear(s, 99)).toEqual([]);
  });
});

describe('§9.4 · la muerte de un nombrado', () => {
  const named = (s: GameState, i = 0): Villager =>
    s.people.villagers.find((v) => v.id === s.people.namedIds[i]) as Villager;

  it('es de peso 3: era uno de los ocho', () => {
    const s = village(7);
    s.tick = 48 * 14;
    expect(namedDeathEntry(s, named(s), 'old_age').weight).toBe(3);
  });

  it('arrastra el rencor abierto más antiguo', () => {
    const s = village(7);
    const a = named(s);
    const b = named(s, 1);
    s.tick = 48 * 5;
    adjustOpinion(s, a.id, b.id, -60);
    s.tick = 48 * 14;

    const e = namedDeathEntry(s, a, 'old_age');
    expect(e.params['tail']).toBe('death.named.grudge');
    expect(e.params['other']).toBe(b.name);
    expect(e.params['sinceYear']).toBe(5);

    const text = renderEntry({ ...e, tick: s.tick }, s.rng);
    expect(text).toContain(a.name);
    expect(text).toContain(b.name);
    expect(text).toContain('5');
  });

  it('el más antiguo, no el más hondo', () => {
    const s = village(7);
    const a = named(s);
    const older = named(s, 1);
    const deeper = named(s, 2);
    s.tick = 48 * 3;
    adjustOpinion(s, a.id, older.id, -55);
    s.tick = 48 * 9;
    adjustOpinion(s, a.id, deeper.id, -95);
    s.tick = 48 * 20;
    expect(namedDeathEntry(s, a, 'old_age').params['other']).toBe(older.name);
  });

  it('un rencor sanado se arrastra como tal, no como abierto', () => {
    // Era la regla de la v2.6; la v2.7 lo sube a escalón 2 de §9.4.
    const s = village(7);
    const a = named(s);
    const b = named(s, 1);
    s.tick = 48 * 5;
    adjustOpinion(s, a.id, b.id, -60);
    s.tick = 48 * 12;
    adjustOpinion(s, a.id, b.id, 50);
    s.tick = 48 * 14;

    const e = namedDeathEntry(s, a, 'old_age');
    expect(e.params['tail']).toBe('death.named.grudge_healed');
    expect(e.params['count']).toBe(7);
    expect(renderEntry({ ...e, tick: s.tick }, s.rng)).not.toMatch(/\{\w+\}/);
  });

  it('sin rencor abierto, arrastra el sanado más LARGO', () => {
    // §9.4 escalón 2: un arco cerrado es tan buen epitafio como uno abierto.
    const s = village(7);
    const a = named(s);
    const shortOne = named(s, 1);
    const longOne = named(s, 2);

    s.tick = 48 * 10;
    adjustOpinion(s, a.id, shortOne.id, -60);
    s.tick = 48 * 12; // dos años
    adjustOpinion(s, a.id, shortOne.id, 50);

    s.tick = 48 * 3;
    adjustOpinion(s, a.id, longOne.id, -60);
    s.tick = 48 * 10; // siete años
    adjustOpinion(s, a.id, longOne.id, 50);

    s.tick = 48 * 20;
    const e = namedDeathEntry(s, a, 'old_age');
    expect(e.params['tail']).toBe('death.named.grudge_healed');
    expect(e.params['other']).toBe(longOne.name);
    expect(e.params['count']).toBe(7);

    const text = renderEntry({ ...e, tick: s.tick }, s.rng);
    expect(text).toContain(longOne.name);
    expect(text.toLowerCase()).toContain('seven');
  });

  it('un rencor abierto gana a uno sanado, por viejo que sea el sanado', () => {
    const s = village(7);
    const a = named(s);
    const healedWith = named(s, 1);
    const openWith = named(s, 2);

    s.tick = 48 * 2;
    adjustOpinion(s, a.id, healedWith.id, -60);
    s.tick = 48 * 18; // dieciséis años, larguísimo
    adjustOpinion(s, a.id, healedWith.id, 50);

    s.tick = 48 * 19;
    adjustOpinion(s, a.id, openWith.id, -60); // recién abierto

    s.tick = 48 * 20;
    const e = namedDeathEntry(s, a, 'old_age');
    expect(e.params['tail']).toBe('death.named.grudge');
    expect(e.params['other']).toBe(openWith.name);
  });

  it('un rencor sanado gana a la memoria más pesada', () => {
    const s = village(7);
    const a = named(s);
    const b = named(s, 1);
    remember(a, { tick: 48 * 4, kind: 'lost_child', aboutId: null, weight: 5 });
    s.tick = 48 * 5;
    adjustOpinion(s, a.id, b.id, -60);
    s.tick = 48 * 9;
    adjustOpinion(s, a.id, b.id, 50);
    s.tick = 48 * 20;
    expect(namedDeathEntry(s, a, 'old_age').params['tail']).toBe('death.named.grudge_healed');
  });

  it('una riña arreglada el mismo año no es una historia', () => {
    const s = village(7);
    const a = named(s);
    const b = named(s, 1);
    s.tick = 48 * 5;
    adjustOpinion(s, a.id, b.id, -60);
    s.tick = 48 * 5 + 20; // el mismo año
    adjustOpinion(s, a.id, b.id, 50);
    s.tick = 48 * 20;
    expect(namedDeathEntry(s, a, 'old_age').params['tail']).toBeUndefined();
  });

  it('sin rencor, arrastra la memoria de más peso', () => {
    const s = village(7);
    const a = named(s);
    remember(a, { tick: 48 * 4, kind: 'went_hungry', aboutId: null, weight: 2 });
    remember(a, { tick: 48 * 7, kind: 'lost_child', aboutId: null, weight: 5 });
    s.tick = 48 * 14;

    const e = namedDeathEntry(s, a, 'old_age');
    expect(e.params['tail']).toBe('death.named.lost_child');
    expect(e.params['sinceYear']).toBe(7);
  });

  it('sin nada que arrastrar, la línea va sola y no queda hueco', () => {
    const s = village(7);
    s.tick = 48 * 14;
    const e = namedDeathEntry(s, named(s), 'old_age');
    expect(e.params['tail']).toBeUndefined();
    expect(epitaphFor(s, named(s))).toBeNull();

    const text = renderEntry({ ...e, tick: s.tick }, s.rng);
    expect(text).not.toMatch(/\{\w+\}/);
    expect(text).toContain(named(s).name);
  });

  it('una memoria was_saved sin nadie a quien nombrar cae en unspoken', () => {
    const s = village(7);
    const a = named(s);
    remember(a, { tick: 48 * 6, kind: 'was_saved', aboutId: null, weight: 5 });
    s.tick = 48 * 14;
    expect(namedDeathEntry(s, a, 'old_age').params['tail']).toBe('death.named.unspoken');
  });

  it('los anónimos no llevan epitafio', () => {
    const s = village(7);
    const anon = s.people.villagers.find((v) => !v.named) as Villager;
    expect(epitaphFor(s, anon)).toBeNull();
  });

  it('toda subordinada rinde sin dejar huecos, para toda causa', () => {
    const s = village(7);
    const a = named(s);
    const b = named(s, 1);
    s.tick = 48 * 5;
    adjustOpinion(s, a.id, b.id, -60);
    s.tick = 48 * 14;
    for (const cause of ['natural', 'old_age', 'hunger', 'cold', 'plague', 'fire', 'violence'] as const) {
      const e = namedDeathEntry(s, a, cause);
      for (let d = 0; d < 10; d += 1) {
        const text = renderEntry({ ...e, tick: s.tick }, s.rng, d);
        expect(text, cause).not.toMatch(/\{\w+\}/);
        expect(text.startsWith('['), cause).toBe(false);
      }
    }
  });
});

describe('record', () => {
  it('sella la entrada con el tick del estado', () => {
    const s = village(7);
    s.tick = 137;
    record(s, { kind: 'birth', templateKey: 'birth.anon.one', params: {}, weight: 1 });
    expect(s.chronicle).toHaveLength(1);
    expect(s.chronicle[0]?.tick).toBe(137);
  });

  it('no guarda prosa, sólo clave y parámetros', () => {
    const s = village(7);
    record(s, {
      kind: 'death',
      templateKey: 'death.old_age.named',
      params: { name: 'Osric', age: 68 },
      weight: 2,
    });
    const e = s.chronicle[0] as ChronicleEntry;
    expect(Object.keys(e).sort()).toEqual(['kind', 'params', 'templateKey', 'tick', 'weight']);
    expect(JSON.stringify(e)).not.toContain(' died ');
  });
});

describe('welcomeDigest · §9.2', () => {
  function withHistory(): GameState {
    const s = village(7);
    const push = (tick: number, kind: ChronicleKind, weight: 1 | 2 | 3, key: string, params = {}): void => {
      s.tick = tick;
      record(s, { kind, templateKey: key, params, weight });
    };
    push(10, 'harvest', 2, 'harvest.fair');
    push(20, 'plague', 3, 'plague.begins');
    push(30, 'birth', 1, 'birth.anon.many', { count: 3 });
    push(40, 'death', 2, 'death.plague.anon.many', { count: 5 });
    push(50, 'built', 2, 'built.granary');
    push(60, 'arrival', 2, 'arrival.many', { count: 4 });
    push(70, 'departure', 1, 'departure.one');
    push(80, 'lost', 2, 'lost.house');
    push(90, 'fire', 3, 'fire.house');
    s.tick = 100;
    return s;
  }

  it('trae el titular de peso 3 más reciente', () => {
    const d = welcomeDigest(withHistory(), 0);
    expect(d.headline?.templateKey).toBe('fire.house');
  });

  it('trae como mucho cuatro entradas de peso 2, en orden', () => {
    const d = welcomeDigest(withHistory(), 0);
    expect(d.entries).toHaveLength(4);
    expect(d.entries.every((e) => e.weight === 2)).toBe(true);
    expect(d.entries.map((e) => e.tick)).toEqual([40, 50, 60, 80]);
  });

  it('cuenta lo que cambió, contando las entradas agregadas', () => {
    const d = welcomeDigest(withHistory(), 0);
    expect(d.summary.born).toBe(3);
    expect(d.summary.died).toBe(5);
    expect(d.summary.arrived).toBe(4);
    expect(d.summary.left).toBe(1);
    expect(d.summary.built).toBe(1);
    expect(d.summary.lost).toBe(1);
    expect(d.summary.weeks).toBe(100);
    expect(d.summary.people).toBe(20);
  });

  it('sólo mira desde sinceTick', () => {
    const d = welcomeDigest(withHistory(), 55);
    expect(d.headline?.templateKey).toBe('fire.house');
    expect(d.summary.born).toBe(0);
    expect(d.summary.arrived).toBe(4);
    expect(d.summary.weeks).toBe(45);
  });

  it('una ausencia sin sucesos devuelve un parte vacío, no un error', () => {
    const s = village(7);
    s.tick = 40;
    const d = welcomeDigest(s, 20);
    expect(d.headline).toBeNull();
    expect(d.entries).toEqual([]);
    expect(d.summary.born).toBe(0);
    expect(d.summary.weeks).toBe(20);
  });
});

describe('pesos y agregación por año · §9.2, v2.14', () => {
  const YEAR_TICKS = 48;

  function withEntries(entries: { key: string; weight: 1 | 2 | 3; kind: string; count?: number }[]): GameState {
    const s = village(7);
    s.chronicle = entries.map((e, i) => ({
      tick: 3 * YEAR_TICKS + i,
      kind: e.kind as ChronicleEntry['kind'],
      templateKey: e.key,
      params: { year: 3, season: 'spring', people: 20, ...(e.count === undefined ? {} : { count: e.count }) },
      weight: e.weight,
    }));
    return s;
  }

  it('veintiún tramos de empalizada son una línea, no veintiuna', () => {
    const s = withEntries(Array.from({ length: 21 }, (_, i) => ({
      key: 'built.palisade', weight: 1 as const, kind: 'built', count: i + 1,
    })));
    const lines = renderYear(s, 3, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('[');
  });

  it('el recuento agregado cuenta edificios, no el total acumulado del último', () => {
    const s = withEntries(Array.from({ length: 4 }, (_, i) => ({
      key: 'built.house', weight: 1 as const, kind: 'built', count: 12 + i,
    })));
    expect(renderYear(s, 3, 1)[0]).toContain('four');
  });

  it('para las personas, el recuento suma cabezas', () => {
    const s = withEntries([
      { key: 'birth.anon.one', weight: 1, kind: 'birth', count: 1 },
      { key: 'birth.anon.many', weight: 1, kind: 'birth', count: 4 },
    ]);
    // Una sola línea, cinco cabezas: `.one` y `.many` son la misma familia.
    const lines = renderYear(s, 3, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('five');
  });

  it('una sola entrada del año se queda como estaba', () => {
    const s = withEntries([{ key: 'built.palisade', weight: 1, kind: 'built', count: 1 }]);
    const lines = renderYear(s, 3, 1);
    expect(lines).toHaveLength(1);
    // La forma anual habla del año; la individual, de la estación.
    expect(lines[0]).not.toMatch(/^The palisade closed/);
  });

  it('los nombrados nunca se agregan: cada muerte tiene su nombre y su epitafio', () => {
    const s = village(7);
    const named = s.people.villagers.filter((v: Villager) => v.named).slice(0, 3);
    s.chronicle = named.map((v: Villager, i: number) => ({
      tick: 3 * YEAR_TICKS + i,
      kind: 'death' as const,
      templateKey: 'death.natural.named',
      params: { name: v.name, age: 60, year: 3, season: 'winter' },
      weight: 3 as const,
    }));
    const lines = renderYear(s, 3);
    expect(lines).toHaveLength(3);
    for (const v of named) expect(lines.some((l) => l.includes(v.name))).toBe(true);
  });

  it('la línea agregada ocupa el sitio de la primera de su familia', () => {
    const s = withEntries([
      { key: 'built.palisade', weight: 1, kind: 'built', count: 1 },
      { key: 'plague.begins', weight: 3, kind: 'plague' },
      { key: 'built.palisade', weight: 1, kind: 'built', count: 2 },
    ]);
    const lines = renderYear(s, 3, 1);
    expect(lines).toHaveLength(2);
    // La empalizada abrió el año, así que su línea anual va primero y la peste
    // detrás: agregar no reordena la crónica.
    expect(lines[0]).toMatch(/palisade|fenced/i);
  });

});
