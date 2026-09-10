// Partido de `sim-long.test.ts` en v3.14 · design.md §14.1.
//
// El primer reparto dejó casi todo el peso en un solo fichero: 33 s de los
// 35 que tardaba la suite. Vitest reparte por fichero, así que repartir mal
// no reparte nada. Aquí van los finales de partida y las políticas.
//
// **Sin tocar una sola aserción.**

// Partido de `sim.test.ts` en v3.14 · design.md §14.1.
//
// La suite rápida tiene veinte segundos de presupuesto y `sim.test.ts` sola
// tardaba treinta y cinco. Vitest reparte el trabajo por fichero y no por
// prueba, así que un fichero de treinta y cinco segundos es un suelo que no
// baja por muchos núcleos que tenga la máquina. Aquí viven las pruebas que
// corren partidas largas.
//
// **No se ha tocado ni una aserción.** Mover una prueba para que corra en
// paralelo es legítimo; recortarla para que tarde menos sería esconder el
// problema en vez de resolverlo.

// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { describe, expect, it } from 'vitest';
import { MIGRATION, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population, resolveMigration } from '@engine/people/demography';
import { holderOf } from '@engine/crossroads/conditions';
import { decide, run, tick } from '@engine/sim';
import type { GameState } from '@engine/state';
import type { CrossroadTemplate } from '@engine/crossroads/schema';
import { fingerprint } from '../helpers/fingerprint';

const YEAR = TIME.WEEKS_PER_YEAR;



describe('la política prudent · §12.9', () => {
  // El catálogo real no sirve para fijar el resultado de una puntuación: no se
  // sabe qué encrucijada sale ni con qué estado. Estas plantillas existen sólo
  // aquí, con las cifras a la vista, que es lo que hace legible el aserto.
  const template = (options: CrossroadTemplate['options']): CrossroadTemplate => ({
    id: 'probe', category: 'lord', weight: 1, cooldownYears: 0,
    requires: [], cast: [],
    title: 'crossroad.probe.title', body: 'crossroad.probe.body',
    options,
  });
  const option = (
    id: string,
    effects: CrossroadTemplate['options'][number]['effects'],
    seeds: CrossroadTemplate['options'][number]['seeds'] = [],
  ): CrossroadTemplate['options'][number] => ({
    id, label: `crossroad.probe.${id}.label`, cost: `crossroad.probe.${id}.cost`,
    effects, visible: [{ k: 'gather', where: 'square', days: 1 }], seeds,
  });

  const ask = (t: CrossroadTemplate, state = foundGame(7)): string | null => {
    state.crossroad = {
      templateId: t.id, posedTick: state.tick, cast: {},
      optionIds: t.options.map((o) => o.id),
    };
    return decide(state, [t], 'prudent');
  };

  it('prefiere no pagar grano', () => {
    const t = template([
      option('pay', [{ k: 'stat', stat: 'grain', delta: -300 }]),
      option('refuse', []),
    ]);
    expect(ask(t)).toBe('refuse');
  });

  it('las muertes no se compran a ningún precio', () => {
    // v2.14. La versión anterior tasaba una vida en 40 fanegas, y había
    // opciones donde salía a cuenta: medido, prudent moría de violencia el
    // triple que first. Ahora es un filtro, no un sumando, así que da igual
    // cuánto grano haya al otro lado.
    for (const price of [30, 50, 500, 5000, 50000]) {
      const t = template([
        option('kill_one', [{ k: 'kill', who: 'random', count: 1 }]),
        option('pay', [{ k: 'stat', stat: 'grain', delta: -price }]),
      ]);
      expect(ask(t), `${price} de grano`).toBe('pay');
    }
  });

  it('tampoco las compra cuando el muerto es una fracción de la aldea', () => {
    const t = template([
      option('cull', [{ k: 'kill', who: 'random', count: 'fraction', fraction: 0.1 }]),
      option('pay', [{ k: 'stat', stat: 'grain', delta: -5000 }]),
    ]);
    expect(ask(t)).toBe('pay');
  });

  it('una expulsión también es población perdida y no se compra', () => {
    const t = template([
      option('expel', [{ k: 'leave', who: 'A' }]),
      option('pay', [{ k: 'stat', stat: 'grain', delta: -100 }]),
    ]);
    expect(ask(t)).toBe('pay');

    const s = foundGame(7);
    s.crossroad = {
      templateId: t.id, posedTick: s.tick, cast: {},
      optionIds: t.options.map((o) => o.id),
    };
    expect(decide(s, [t], 'worst')).toBe('expel');
  });

  it('si todas matan, elige la que mata a menos', () => {
    const t = template([
      option('many', [{ k: 'kill', who: 'random', count: 4 }]),
      option('few', [
        { k: 'kill', who: 'random', count: 1 },
        { k: 'stat', stat: 'grain', delta: -400 },
      ]),
    ]);
    expect(ask(t)).toBe('few');
  });

  it('entre las que no matan, sigue pesando el grano', () => {
    const t = template([
      option('cheap', [{ k: 'stat', stat: 'grain', delta: -10 }]),
      option('dear', [{ k: 'stat', stat: 'grain', delta: -900 }]),
    ]);
    expect(ask(t)).toBe('cheap');
  });

  it('el ánimo perdido pesa 3 por punto', () => {
    const t = template([
      option('mood', [{ k: 'stat', stat: 'morale', delta: -10 }]), // −30
      option('grain', [{ k: 'stat', stat: 'grain', delta: -100 }]), // −100
    ]);
    expect(ask(t)).toBe('mood');
  });

  it('con todo lo demás igual, prefiere la opción que no planta semilla', () => {
    const seed = {
      id: 'later', delayYears: [2, 4] as [number, number], effects: [],
      visible: [], chronicleKey: 'consequence.later',
    };
    const t = template([option('with_seed', [], [seed]), option('clean', [])]);
    expect(ask(t)).toBe('clean');
  });

  it('una ganancia de grano es un coste negativo, no cero', () => {
    const t = template([
      option('take', [{ k: 'stat', stat: 'grain', delta: 200 }]),
      option('leave', []),
    ]);
    expect(ask(t)).toBe('take');
  });

  it('el coste de un multiplicador se mide sobre el estado de este tick', () => {
    const t = template([
      option('third', [{ k: 'stat', stat: 'grain', mul: 0.66 }]),
      option('flat', [{ k: 'stat', stat: 'grain', delta: -100 }]),
    ]);
    const poor = foundGame(7);
    poor.village.grain = 60; // un tercio de 60 son 20: más barato que 100
    expect(ask(t, poor)).toBe('third');
    const rich = foundGame(7);
    rich.village.grain = 3000; // un tercio de 3000 son 1020
    expect(ask(t, rich)).toBe('flat');
  });

  it('el orden en que estén escritas las opciones no cambia el resultado', () => {
    // El aserto que pide el brief: ante un empate desempata el id, no la
    // posición. Con las dos ordenaciones tiene que salir la misma opción.
    const a = option('aaa', [{ k: 'stat', stat: 'grain', delta: -50 }]);
    const z = option('zzz', [{ k: 'stat', stat: 'grain', delta: -50 }]);
    expect(ask(template([a, z]))).toBe('aaa');
    expect(ask(template([z, a]))).toBe('aaa');
  });

  it('es determinista y no consume aleatoriedad', () => {
    const s = foundGame(7);
    const t = template([
      option('a', [{ k: 'stat', stat: 'grain', delta: -10 }]),
      option('b', [{ k: 'stat', stat: 'morale', delta: -1 }]),
    ]);
    s.crossroad = { templateId: t.id, posedTick: 0, cast: {}, optionIds: ['a', 'b'] };
    const before = { ...s.rng };
    const first = decide(s, [t], 'prudent');
    expect(decide(s, [t], 'prudent')).toBe(first);
    expect({ ...s.rng }).toEqual(before);
  });

  it('dos partidas con prudent y la misma semilla son idénticas', () => {
    const a = foundGame(19);
    const b = foundGame(19);
    run(a, 3000, 'prudent', CATALOG);
    run(b, 3000, 'prudent', CATALOG);
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});

describe('el abandono · §5.7, v2.16', () => {
  const YEARS = MIGRATION.ABANDON_YEARS;

  /** Una aldea reducida a `n` vivos, sin tocar nada más. */
  function shrunk(n: number): GameState {
    const s = foundGame(7);
    s.people.villagers.forEach((v, i) => {
      if (i >= n) {
        v.diedTick = 0;
        v.causeOfDeath = 'natural';
      }
    });
    s.people.namedIds = s.people.namedIds.filter(
      (id) => s.people.villagers.find((v) => v.id === id)?.diedTick === null,
    );
    s.village.grain = 100000; // que no sea el hambre quien decida
    return s;
  }

  it('cinco años seguidos por debajo de seis y se marchan', () => {
    const s = shrunk(3);
    for (let i = 0; i < (YEARS + 2) * YEAR && s.ended === null; i += 1) tick(s, CATALOG);
    expect(s.ended?.cause).toBe('abandoned');
    expect(population(s)).toBe(0);
    // Se van, no se mueren: la mortalidad de §12.4 no se lleva el mérito.
    for (const v of s.people.villagers) {
      if (v.diedTick === null) expect(v.leftTick).toBe(s.ended?.tick);
    }
  });

  it('ni una semana antes', () => {
    // El reloj arranca la semana en que se les ve por debajo de seis, así que
    // se van cinco años completos después de esa semana y no antes.
    const s = shrunk(3);
    for (let i = 0; i < YEARS * YEAR; i += 1) tick(s, CATALOG);
    expect(s.dwindlingSince).not.toBeNull();
    expect(s.tick - (s.dwindlingSince as number)).toBeLessThan(YEARS * YEAR);
    expect(s.ended).toBeNull();
    tick(s, CATALOG);
    expect(s.tick - (s.dwindlingSince as number)).toBe(YEARS * YEAR);
    expect(s.ended?.cause).toBe('abandoned');
  });

  it('el reloj se pone a cero si la aldea se recupera', () => {
    const s = shrunk(3);
    for (let i = 0; i < 3 * YEAR; i += 1) tick(s, CATALOG);
    expect(s.dwindlingSince).not.toBeNull();
    // Vuelven a ser seis: el contador se reinicia y los cinco años empiezan de
    // nuevo, que es lo que quiere decir "cinco años seguidos".
    for (const v of s.people.villagers.slice(0, MIGRATION.VIABLE_POPULATION)) {
      v.diedTick = null;
      v.leftTick = null;
    }
    tick(s, CATALOG);
    expect(s.dwindlingSince).toBeNull();
    for (const v of s.people.villagers.slice(3, MIGRATION.VIABLE_POPULATION)) v.diedTick = 0;
    for (let i = 0; i < 3 * YEAR; i += 1) tick(s, CATALOG);
    expect(s.ended).toBeNull();
  });

  it('una aldea viable no se abandona nunca', () => {
    const s = foundGame(108);
    run(s, 40 * YEAR, 'prudent', CATALOG);
    if (population(s) >= MIGRATION.VIABLE_POPULATION) {
      expect(s.ended).toBeNull();
      expect(s.dwindlingSince).toBeNull();
    }
  });

  it('deja su línea de peso 3 en la crónica, y no es la de extinción', () => {
    const s = shrunk(3);
    for (let i = 0; i < (YEARS + 2) * YEAR && s.ended === null; i += 1) tick(s, CATALOG);
    const entry = s.chronicle.find((e) => e.kind === 'abandonment');
    expect(entry?.weight).toBe(3);
    expect(s.chronicle.some((e) => e.kind === 'extinction')).toBe(false);
  });

  it('morir del todo sigue siendo extinción, no abandono', () => {
    const s = foundGame(3);
    for (const v of s.people.villagers) v.diedTick = 1;
    tick(s, CATALOG);
    expect(s.ended?.cause).toBe('extinction');
  });

  it('acota la racha más larga de agonía a los años que dice §5.7', () => {
    // Lo que esto existe para arreglar: partidas que pasaban cuarenta años a
    // dos habitantes sin morirse ni recuperarse.
    // Seed 2 is the one natural terminal case in the v2.18 bank. More seeds
    // here became four full 200-year balance runs after the plague fix, while
    // the 60-seed bank already measures the population-level property.
    const s = foundGame(2);
    let longest = 0;
    for (let i = 0; i < 200 * YEAR && s.ended === null; i += 1) {
      tick(s, CATALOG);
      if (s.dwindlingSince !== null) {
        longest = Math.max(longest, s.tick - s.dwindlingSince);
      }
    }
    expect(s.ended).not.toBeNull();
    expect(longest / YEAR).toBeLessThanOrEqual(MIGRATION.ABANDON_YEARS);
  });
});

describe('quedarse sin líder duele · Anexo A.15, v2.22', () => {
  /** Un líder muerto, sin nada más tocado: la sucesión queda pendiente de responder. */
  function beheaded(seed: number): GameState {
    const s = foundGame(seed);
    const leader = s.people.villagers.find((v) => v.role === 'leader');
    if (leader !== undefined) leader.diedTick = 0;
    return s;
  }

  it('ningún forastero llega mientras el puesto está vacante', () => {
    // Todas las demás puertas de §5.7 abiertas a propósito: si no llega nadie
    // en treinta años con ánimo alto, grano de sobra y sitio en las casas, es
    // porque falta el líder y no por otra cosa.
    const s = beheaded(7);
    s.village.morale = 80;
    s.village.grain = 100000;
    // El propio crossroad de sucesión queda sin responder: nunca se pasa una
    // `decision`, así que el puesto sigue vacante los treinta años.
    for (let i = 0; i < 30 * YEAR; i += 1) tick(s, CATALOG);
    expect(holderOf(s, 'leader')).toBeNull();
    expect(s.chronicle.some((e) => e.kind === 'arrival')).toBe(false);
  });

  it('en cambio, con líder, llega gente en esas mismas condiciones', () => {
    const s = foundGame(7); // líder vivo
    s.village.morale = 80;
    s.village.grain = 100000;
    let arrived = false;
    for (let i = 0; i < 30 * YEAR && !arrived; i += 1) {
      tick(s, CATALOG);
      arrived = s.chronicle.some((e) => e.kind === 'arrival');
    }
    expect(arrived).toBe(true);
  });

  it('las marchas se duplican mientras el puesto está vacante', () => {
    // Dos estados que comparten hasta el último bit de aleatoriedad: la única
    // diferencia es si hay líder. Si la marcha se duplica, la cuenta de quienes
    // se van tiene que ser exactamente el doble.
    const base = foundGame(7);
    base.tick = 0;
    base.village.morale = 5; // la marcha es casi segura
    const withLeader = structuredClone(base);
    const withoutLeader = structuredClone(base);
    const leader = withoutLeader.people.villagers.find((v) => v.role === 'leader');
    if (leader !== undefined) leader.diedTick = 0;

    const withEvents = resolveMigration(withLeader);
    const withoutEvents = resolveMigration(withoutLeader);
    const withCount = withEvents[0]?.kind === 'departure' ? withEvents[0].ids.length : 0;
    const withoutCount = withoutEvents[0]?.kind === 'departure' ? withoutEvents[0].ids.length : 0;

    expect(withCount).toBeGreaterThan(0);
    expect(withoutCount).toBe(withCount * 2);
  });

  it('al tercer «No one» seguido, sin líder de por medio, la aldea se dispersa', () => {
    const s = beheaded(7);
    const answerNoOne = (state: GameState, options: readonly string[]): string =>
      state.crossroad?.templateId === 'succession' ? 'no_one' : (options[0] as string);

    let dispersed = false;
    for (let i = 0; i < 60 * YEAR && !dispersed; i += 1) {
      run(s, 1, answerNoOne, CATALOG);
      dispersed = s.ended !== null;
    }
    expect(s.ended?.cause).toBe('dispersed');
    expect(s.noOneStreak).toBeGreaterThanOrEqual(MIGRATION.NO_LEADER_DISPERSAL_STREAK);
    expect(population(s)).toBe(0);
    const entry = s.chronicle.find((e) => e.templateKey === 'dispersal');
    expect(entry?.weight).toBe(3);
    expect(entry?.kind).toBe('abandonment');
  });

  it('elegir a alguien reinicia la racha', () => {
    const s = beheaded(7);
    let noOnes = 0;
    const answerTwiceThenChoose = (state: GameState, options: readonly string[]): string => {
      if (state.crossroad?.templateId !== 'succession') return options[0] as string;
      if (noOnes < 2) { noOnes += 1; return 'no_one'; }
      return options.find((o) => o === 'choose_a' || o === 'choose_b') ?? (options[0] as string);
    };
    for (let i = 0; i < 60 * YEAR && s.noOneStreak < 2; i += 1) run(s, 1, answerTwiceThenChoose, CATALOG);
    // Con un líder en el puesto, la racha vuelve a cero.
    for (let i = 0; i < 20 * YEAR && holderOf(s, 'leader') === null; i += 1) {
      run(s, 1, answerTwiceThenChoose, CATALOG);
    }
    expect(s.noOneStreak).toBe(0);
    expect(s.ended).toBeNull();
  });

  it('no cuenta como racha si nunca se pregunta por sucesión', () => {
    // Un `no_one` en una encrucijada cualquiera no es un `no_one` de A.15.
    const s = foundGame(7); // líder vivo: succession nunca sale elegible
    run(s, 20 * YEAR, 'first', CATALOG);
    expect(s.noOneStreak).toBe(0);
  });
});
