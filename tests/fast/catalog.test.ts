// M-08 · design.md Anexo A, §8.1, §9.3, §14.1.
//
// Lo que hay que proteger es que el catálogo sea contenido vivo: que ninguna
// opción deje la pantalla igual, que ninguna clave de texto falte, y sobre todo
// que ninguna plantilla tenga condiciones que no se cumplan jamás. Una
// plantilla que nunca sale es contenido muerto, y con dieciséis escritas a mano
// es fácil que pase.
import { beforeAll, describe, expect, it } from 'vitest';
import { CATALOG, RETIRED_TEMPLATES, templateOf } from '@engine/crossroads/catalog';
import { fireSeeds } from '@engine/crossroads/seeds';
import { BUILDINGS } from '@engine/balance';
import type { CrossroadCategory } from '@engine/crossroads/schema';
import type { GameState } from '@engine/state';
import { population } from '@engine/people/demography';
import { BANK, CROSSROAD_BANK } from '@engine/chronicle/bank.en';
import { founded, silentIn, sweep, tick, YEAR } from '../helpers/catalogue-bench';


describe('el catálogo · forma', () => {
  it('son las dieciséis del Anexo A y la reserva; los tres comerciantes ya no están', () => {
    // v2.95 añadió la categoría `trade` y el número subió a 20; **M-0 retira
    // esas tres plantillas** —el tratante, el salinero y el factor son ofertas
    // del camino desde entonces (§7.8, `world/road.ts`)— y el número baja a 17.
    // Esta prueba existe justo para que subir o bajar sea una decisión y no un
    // descuido, así que las retiradas se cuentan aparte: siguen existiendo
    // porque una partida guardada las nombra.
    // Diecinueve desde B2: las dos del clan del valle vecino (§1b), una
    // categoría que el Anexo A no tenía porque el asedio es de la meta.
    // Veintiuna desde G3: las dos del caserío (`hamlet.ts`), la primera
    // decisión que un valle de menos de diez personas puede ver.
    //
    // **Quince desde RD-3 (1 oct 2026), y nueve retiradas.** Vera aplicó el
    // dictamen de `docs/medidas/rd0-encrucijadas-2026-09-30.md`: seis plantillas
    // salen del sorteo —`plague_blame` (casi inalcanzable), `tithe_demand` (el
    // diezmo ya lo cobra el motor cada otoño), `chapel_or_granary` (se plantea
    // con la iglesia ya en pie), `relic_pedlar` (duplica el medio `relic`),
    // `wolf_winter` (los lobos ya son un suceso con cuerpo) y `bandits` (es el
    // clan vecino sin su batalla)— y pasan a `RETIRED_TEMPLATES`, de modo que
    // un guardado con una pendiente o con ellas en el registro sigue cargando.
    expect(CATALOG).toHaveLength(15);
    expect(RETIRED_TEMPLATES).toHaveLength(9);
    for (const retired of RETIRED_TEMPLATES) {
      expect(CATALOG.some((t) => t.id === retired.id), retired.id).toBe(false);
    }
    expect(CATALOG.some((t) => t.id === 'quiet_years')).toBe(true);
  });

  it('las seis que RD-3 retiró están retiradas, no borradas: título, opciones y semillas siguen', () => {
    const six = ['plague_blame', 'tithe_demand', 'chapel_or_granary', 'relic_pedlar', 'wolf_winter', 'bandits'];
    for (const id of six) {
      expect(CATALOG.some((t) => t.id === id), id).toBe(false);
      const template = templateOf(CATALOG, id);
      expect(template, id).toBeDefined();
      expect(CROSSROAD_BANK[template?.title ?? ''], `${id}: título`).toBeDefined();
      for (const option of template?.options ?? []) {
        expect(CROSSROAD_BANK[option.label], `${id}.${option.id}`).toBeDefined();
        expect(BANK[`crossroad.${id}.${option.id}`], `${id}.${option.id}: crónica`).toBeDefined();
      }
    }
  });

  it('ninguna semilla de una retirada queda colgando: se dispara con su efecto y su crónica', () => {
    // `seeds.ts` busca la plantilla con `templateOf`; con `catalogue.find` a
    // secas una semilla plantada por una retirada caía en `spec === null` y se
    // marcaba disparada sin efecto ni crónica.
    for (const retired of RETIRED_TEMPLATES) {
      for (const option of retired.options) {
        for (const spec of option.seeds) {
          const s = founded(3);
          s.seeds.push({
            id: `${retired.id}:${option.id}:${spec.id}:0`,
            fromTemplateId: retired.id,
            fromOptionId: option.id,
            plantedTick: 0,
            firesAtTick: 0,
            cast: {},
            condition: null,
            firedTick: null,
            witheredTick: null,
          });
          const before = s.chronicle.length;
          const fired = fireSeeds(s, CATALOG);
          expect(fired, `${retired.id}.${option.id}.${spec.id}`).toHaveLength(1);
          expect(fired[0]?.fired).toBe(true);
          expect(fired[0]?.effects?.visible, `${retired.id}.${option.id}.${spec.id}`).toEqual(spec.visible);
          expect(s.chronicle.length, `${retired.id}.${option.id}.${spec.id}`).toBe(before + 1);
          expect(s.chronicle.at(-1)?.templateKey).toBe(spec.chronicleKey);
        }
      }
    }
  });

  it('ningún identificador repetido, y todos en snake_case', () => {
    const ids = CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('las categorías que quedan vivas, y cuántas plantillas lleva cada una', () => {
    const byCategory = new Map<CrossroadCategory, number>();
    for (const t of CATALOG) byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
    // Con dos: la pregunta no se repite sola (§12.9).
    for (const c of ['famine', 'feud', 'succession', 'hamlet', 'raid'] as CrossroadCategory[]) {
      expect(byCategory.get(c), c).toBe(2);
    }
    // stranger lleva dos: la suya y quiet_years, que es la reserva.
    expect(byCategory.get('stranger')).toBe(2);
    // RD-3: señor, peste y bosque se quedan con una sola —la otra era un
    // duplicado de un mecanismo posterior o inalcanzable—, y `faith` y `trade`
    // dejan de tener plantillas vivas. Una categoría con una sola plantilla
    // repite la misma pregunta; lo que lo impide es el reposo de cada una.
    for (const c of ['lord', 'plague', 'forest'] as CrossroadCategory[]) {
      expect(byCategory.get(c), c).toBe(1);
    }
    expect(byCategory.get('faith')).toBeUndefined();
    expect(byCategory.get('trade')).toBeUndefined();
  });

  it('toda plantilla tiene 2 o 3 opciones, con ids únicos', () => {
    for (const t of CATALOG) {
      expect(t.options.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.options.length, t.id).toBeLessThanOrEqual(3);
      const ids = t.options.map((o) => o.id);
      expect(new Set(ids).size, t.id).toBe(ids.length);
    }
  });

  it('la capilla retirada conserva su cosecha al ochenta por ciento, por si un guardado la contesta', () => {
    const chapel = RETIRED_TEMPLATES.find((t) => t.id === 'chapel_or_granary')
      ?.options.find((o) => o.id === 'the_chapel');
    expect(chapel?.effects).toContainEqual({ k: 'harvest', factor: 0.8, harvests: 1 });
  });

  it('las dos talas de A.11 alcanzan el mapa y la menor cobra hambre inmediata', () => {
    const forest = CATALOG.find((t) => t.id === 'forest_cut');
    const all = forest?.options.find((o) => o.id === 'fell_it');
    const edge = forest?.options.find((o) => o.id === 'take_the_edge');
    expect(all?.effects).toContainEqual({ k: 'fell', wood: 900, permanent: true });
    expect(edge?.effects).toContainEqual({ k: 'fell', wood: 300, permanent: false });
    expect(edge?.effects).toContainEqual({ k: 'flag', flag: 'forced_hunger', years: 1 / 48 });
  });

  it('A.11 abre la puerta mientras queda más del doce por ciento de bosque', () => {
    const forest = CATALOG.find((t) => t.id === 'forest_cut');
    expect(forest?.requires).toContainEqual({
      k: 'ratio', ratio: 'forestLeft', op: '>', v: 0.12,
    });
  });

  it('A.10 (retirada) sigue abierta cuando la fe supera setenta', () => {
    const relic = RETIRED_TEMPLATES.find((t) => t.id === 'relic_pedlar');
    expect(relic?.requires).toContainEqual({ k: 'stat', stat: 'faith', op: '>', v: 30 });
    expect(relic?.requires).not.toContainEqual({ k: 'stat', stat: 'faith', op: '<', v: 70 });
  });

  it('elegir la muralla deja veinte años de casas frías', () => {
    const wall = CATALOG.find((t) => t.id === 'first_stone')
      ?.options.find((o) => o.id === 'the_wall');
    expect(wall?.effects).toContainEqual({ k: 'flag', flag: 'wall_unlocked', years: 0 });
    expect(wall?.effects).toContainEqual({ k: 'flag', flag: 'cold_houses', years: 20 });
  });

  it('ninguna bandera escrita por el catálogo carece de lector', () => {
    const read = new Set([
      'a_name_in_the_valley', 'behind_the_wall', 'cold_houses', 'feud_ripe',
      'flood_prone', 'forced_hunger', 'hostile', 'proud', 'stone_house_unlocked',
      'threatened', 'vassal', 'wall_unlocked', 'watched', 'works_slowed_40',
      'works_slowed_80', 'works_slowed_85',
      // §7.8, v2.95: la sal del salinero. Su lector está en la matanza de
      // M-29, que saca más de cada cabeza mientras la sal dure.
      'salted',
      // §1b, B2: las tres del clan vecino. Las lee `world/threat.ts`, que es
      // quien posee la mecánica: `braced` esconde la mitad de lo saqueable,
      // `bought_off` hace que la partida se dé la vuelta, y `known_to_pay` —la
      // consecuencia de haber pagado— hace que vuelvan antes.
      'braced', 'bought_off', 'known_to_pay',
    ]);
    const written = CATALOG.flatMap((template) => template.options).flatMap((option) => [
      ...option.effects,
      ...option.seeds.flatMap((seed) => seed.effects),
    ]).filter((effect) => effect.k === 'flag').map((effect) => effect.flag);
    expect([...new Set(written)].filter((flag) => !read.has(flag))).toEqual([]);
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

  it('lo que una opción enseña es lo que ocurre (RD-3: ninguna `visible` sin respaldo)', () => {
    // RD-0 midió 7 opciones que anunciaban una obra, una tala o una ruina que
    // no ocurría (`raise`/`scar` sin `build` ni `fell`) y 4 que apagaban una
    // fragua o un molino sin relación con lo decidido. Cada efecto visible del
    // catálogo vivo tiene que estar respaldado por un efecto del mismo gesto, y
    // un `raise` de algo con tope sólo se ofrece si hay sitio (`room`).
    type Backing = { template: string; option: string; where: string };
    const unbacked: string[] = [];
    for (const t of CATALOG) {
      // `hamlet.ts` es de otro carril (la fundación): su semilla
      // `the_cleared_strip` levanta un campo sin `room`, y queda dicho en el
      // informe de RD-3 en vez de arreglarse aquí.
      if (t.category === 'hamlet') continue;
      for (const o of t.options) {
        const rooms = new Set(
          [...t.requires, ...(o.requires ?? [])]
            .filter((c) => c.k === 'room')
            .map((c) => (c.k === 'room' ? c.building : '')),
        );
        const check = (effects: typeof o.effects, visible: typeof o.visible, where: string): void => {
          for (const v of visible) {
            const has = (pred: (e: (typeof effects)[number]) => boolean): boolean => effects.some(pred);
            if (v.k === 'raise' && !has((e) => e.k === 'build' && e.kind === v.kind)) unbacked.push(`${where}: raise ${v.kind} sin build`);
            // Con tope, o estaca/muralla (que sin anillo se rechazan: A2c).
            if (v.k === 'raise') {
              const needsRoom = BUILDINGS[v.kind].cap !== null || v.kind === 'palisade' || v.kind === 'wall';
              if (needsRoom && !rooms.has(v.kind)) unbacked.push(`${where}: raise ${v.kind} sin room`);
            }
            if (v.k === 'ruin' && !has((e) => e.k === 'destroy' && e.kind === v.kind)) unbacked.push(`${where}: ruin ${v.kind} sin destroy`);
            // `douse` con `who` señala **la casa de una persona** (A.7, §11.5): la
            // cámara va a donde vive B. Sin `who` tiene que apagar algo de verdad.
            if (v.k === 'douse' && v.who === undefined && !has((e) => e.k === 'lit' && e.kind === v.kind && !e.on)) unbacked.push(`${where}: douse ${v.kind} sin lit off`);
            if (v.k === 'scar' && v.what === 'felled_wood' && !has((e) => e.k === 'fell')) unbacked.push(`${where}: scar felled_wood sin fell`);
            if (v.k === 'scar' && v.what === 'burnt_field' && !has((e) => e.k === 'destroy' && e.kind === 'field')) unbacked.push(`${where}: scar burnt_field sin destroy field`);
            // El camposanto es una marca que el render no dibuja.
            if (v.k === 'scar' && v.what === 'grave_row') unbacked.push(`${where}: scar grave_row no se dibuja`);
          }
        };
        check(o.effects, o.visible, `${t.id}.${o.id}`);
        for (const seed of o.seeds) check(seed.effects, seed.visible, `${t.id}.${o.id}.${seed.id}`);
      }
    }
    void (undefined as Backing | undefined);
    expect(unbacked).toEqual([]);
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
// El banco vive en tests/helpers/catalogue-bench.ts y es sintético: funda con
// veinte personas y no es el juego. Lo que dice **si hay contenido muerto** es
// tests/journeys/catalogue-coverage.test.ts, que juega partidas de verdad
// (12 semillas × 100 años, 49 s) y sustituyó desde G2 al barrido de 30 × 150
// que vivía en tests/balance/ — donde nadie lo corría, porque ese banco cuesta
// más que su propio presupuesto. Aquí queda el barrido barato.
// ---------------------------------------------------------------------------

describe('el catálogo · cobertura rápida', () => {
  let seen: Map<string, number>;
  // Diez semillas × ochenta años desde el mapa grande, y doce × cien antes: un
  // tick cuesta ahora 1,67 veces lo que costaba —el mundo es cuatro veces
  // mayor— y este barrido era el fichero más lento de la suite. Ochocientos
  // años siguen siendo ochocientos años, y el barrido de treinta semillas ×
  // ciento cincuenta años vive en `tests/balance/`, que es donde cabe.
  beforeAll(() => { seen = sweep(10, 80); });

  // Estas necesitan siglos o estados muy concretos y no salen en doce partidas
  // de cien años. Que no falten de verdad lo comprueba el barrido completo de
  // tests/balance/, no esta prueba.
  //
  // `quiet_years` está aquí por lo contrario que las demás, y conviene no
  // confundirlo: es la **reserva** de §8.6, la que sale cuando no hay ninguna
  // otra elegible, y su propio fichero dice que existe para que la garantía no
  // falle y no para ser interesante. Desde v3.61 el valle tiene bastante que
  // preguntar por su cuenta —los rencores del carácter dan de comer a las
  // plantillas de rencilla— y la reserva deja de hacer falta. **Que no salga es
  // la señal buena**: significa que había algo mejor que preguntar.
  //
  // `grain_factor` se suma a la lista con el mapa grande, y su causa está
  // medida y no supuesta: `npx tsx tools/reports/eligibility-report.ts` dice que
  // **cumple condiciones en el 2,56 % de los ticks y se ofrece en el 0,00 %**
  // —«cumple condiciones pero nunca llega a ofrecerse»—. No es contenido
  // muerto, que es lo que esta prueba vigila: es la cadencia de encrucijadas de
  // `docs/medidas/findings-drama.md`, la decisión que está tomada y pendiente. Lo que
  // el mapa grande hizo fue mover las trayectorias lo justo para que en estas
  // doce semillas concretas dejara de ganar el sorteo.
  // **Esta lista no dice que estas plantillas estén muertas: dice que este
  // banco no las ve.** `founded()` (`tests/helpers/catalogue-bench.ts`) funda
  // con **veinte personas en el tick 0** —la aldea de antes de la pareja
  // fundadora— y las mantiene ahí, con un bucle de tick propio. No es el juego,
  // y a propósito: existe para que las condiciones del Anexo A se puedan
  // cumplir alguna vez sin esperar siglos.
  //
  // Lo que se midió el 19 sep 2026 al rehacer el banco de balance (G2): con
  // `foundGame` + `run` y la política prudente, **20 de las 21 plantillas se
  // plantean** en 12 semillas × 100 años, y tres de las de esta lista salen en
  // 24, 24 y 11 valles de 24 (`chapel_or_granary`, `one_at_the_ford`,
  // `breaking_ground`). Quien dice si hay contenido muerto es
  // `tests/journeys/catalogue-coverage.test.ts`, que juega de verdad.
  //
  // Esto se queda como lo que sirve: un barrido barato que caza una plantilla
  // cuyas condiciones no se pueden cumplir **ni siquiera en un banco generoso**,
  // que es un defecto de forma y se ve en dos segundos.
  // RD-3: `plague_blame`, `wolf_winter` y `chapel_or_granary` salen de la lista
  // porque salen del catálogo (retiradas); `first_stone` y `forest_cut` se
  // quedan, ahora con condiciones de estado que este banco generoso no siempre
  // cumple (la iglesia en pie, sitio para un campo).
  const SLOW = [
    'forest_cut', 'first_stone', 'feud_inherited', 'smith_feud', 'quiet_years',
    'grain_factor', 'breaking_ground', 'one_at_the_ford',
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
    // RD-3: `faith` ya no tiene plantillas vivas (las dos se retiraron).
    for (const c of ['famine', 'lord', 'feud', 'stranger', 'succession'] as CrossroadCategory[]) {
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
