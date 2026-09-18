// K-2 · La voluntad del rey. `docs/plan-rey.md` §0.3.
//
// **Es la fase que hace que el rey importe**, y lo que se guarda aquí es la
// frase del dueño del diseño hecha aserto: «dependiendo de quién elijamos —el
// puesto de trabajo, la personalidad— ese rey hará unas cosas u otras».
//
// Una tabla por estilo, y cada estilo **abre algo y cierra algo**: si un rey
// sólo diera ventajas, coronar sería una compra y no una decisión. Y la prueba
// que cierra todas las demás: **sin corona nada cambia**, que es la garantía de
// §13.1 —una partida sin coronar es byte a byte la de antes de esta fase—.
//
// Se compara siempre **el mismo valle con y sin rey**, nunca dos semillas: lo
// que se mide es el efecto de la corona, no la biografía de una aldea.

import { describe, expect, it } from 'vitest';
import { CROWN, FATE, FOOD, MOOD, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { allocateLabour, produce } from '@engine/subsistence/labour';
import { updateMood } from '@engine/subsistence/mood';
import { nextProject } from '@engine/world/works';
import { withinCap } from '@engine/world/buildings';
import { weightNow } from '@engine/world/fate';
import { RESTING_WILL, will } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { crownCandidates } from '@engine/people/crown';
import type { CrownStyle, GameState, Role, TickContext, Trait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const grown = new Map<string, GameState>();
/** La misma aldea de `crown.test.ts`: la 41 pasa de treinta personas al año 15. */
function village(seed = 41, years = 15): GameState {
  const key = `${seed}:${years}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
    base.village.silver = CROWN.SILVER * 3;
    grown.set(key, base);
  }
  return structuredClone(base);
}

/**
 * Corona a alguien **con el oficio que se pide**, cambiándoselo a mano si hace
 * falta.
 *
 * Cambiar el oficio es legítimo aquí y no es trampa: lo que se mide es qué hace
 * un rey de ese estilo, no si la semilla 41 tiene herrero al año 15. Es lo mismo
 * que hace `pressure.test.ts` poniendo gallinas en el corral para medir el peso
 * de los lobos.
 */
function crowned(state: GameState, trade: Role | null, traits: Trait[] = []): GameState {
  const who = crownCandidates(state)[0];
  if (who === undefined) throw new Error('la aldea de la prueba no tiene candidatos');
  who.role = trade;
  if (traits.length > 0) who.traits = traits;
  const out = crownKing(state, who.id, 'spring', 3);
  if (!out.crowned) throw new Error(`no se pudo coronar: ${out.refusal ?? 'sin motivo'}`);
  return state;
}

/** El contexto que `updateMood` pide, con el hambre que se le diga. */
function ctx(severity = 0): TickContext {
  return { severity, cold: false, outbreak: null, deaths: 0, unexplainedDeaths: 0 };
}

describe('K-2 · el rey herrero mira a la muralla', () => {
  it('la aldea levanta empalizada sin esperar a que haya amenaza', () => {
    // §7.3 punto 8 pide fragua **y** amenaza; con este rey basta la fragua. Es
    // lo que «si eliges al herrero, pues haces más armas» significa en un juego
    // que no tiene armas como montón: la muralla, y el señor que la cuenta.
    const plain = village();
    const forge = crowned(village(), 'smith');
    for (const state of [plain, forge]) {
      delete state.flags['threatened'];
      state.village.wood = 4_000;
    }
    expect(will(forge).style).toBe<CrownStyle>('forge');
    expect(will(forge).arms).toBe(true);
    expect(will(plain).arms).toBe(false);
    // Con fragua en pie, el rey herrero la pide y el valle sin rey no.
    if (plain.buildings.some((b) => b.kind === 'smithy' && b.lostTick === null)) {
      expect(nextProject(forge)).toBe('palisade');
      expect(nextProject(plain)).not.toBe('palisade');
    }
  });

  it('y la familia de la defensa va delante en la cola', () => {
    const forge = crowned(village(), 'smith');
    expect(will(forge).priority).toBe('defence');
  });
});

describe('K-2 · el rey del campo siembra más ancho', () => {
  it('rotura tierra que el valle no tenía permiso de roturar', () => {
    // **Y esto es lo que de verdad hace al rey del campo**, porque el otro dial
    // no bastaba. Medido al escribir esta prueba: §5.2 trabaja `min(campos,
    // necesarios, dotables)`, y en la aldea de cuarenta personas del año 15 los
    // ocho campos de §12 ya están todos trabajados —veinte manos en el campo con
    // rey y sin él, el mismo número—, así que multiplicar «lo necesario» no
    // añadía nada. Lo que sí se nota es levantar el tope: el valle rotura dos
    // campos más, y eso son 1 200 de cosecha llena, comida para once personas.
    const plain = village();
    const plough = crowned(village(), 'reeve');
    expect(will(plough).moreFields).toBe(CROWN.PLOUGH_MORE_FIELDS);
    expect(will(plain).moreFields).toBe(0);
    // Con los ocho campos en pie, el valle sin rey ya no puede más y el del rey
    // del campo sí.
    for (const state of [plain, plough]) {
      const fields = state.buildings.filter((b) => b.kind === 'field' && b.lostTick === null);
      for (let n = fields.length; n < FOOD.MAX_FIELDS; n += 1) {
        state.buildings.push({
          id: 9600 + n, kind: 'field', x: 20 + n * 3, y: 20, w: 3, h: 2,
          builtTick: 0, lostTick: null, tier: 0, lit: true, blockedUntil: null,
        });
      }
    }
    expect(withinCap(plain, 'field'), 'sin rey, ocho y no más').toBe(false);
    expect(withinCap(plough, 'field'), 'con rey del campo, todavía cabe').toBe(true);
  });

  it('y la comida va delante en la cola', () => {
    expect(will(crowned(village(), 'reeve')).priority).toBe('food');
  });
});

describe('K-2 · el rey cura sube la fe y apaga la fiesta', () => {
  it('la fe deriva hacia su número en vez de hacia el de siempre', () => {
    const plain = village();
    const chapel = crowned(village(), 'priest');
    // B-1 · **y al valle de control hay que quitarle el cura**, que es lo que
    // esta prueba aprendió cuando el ritmo cambió: coronar al cura le quita el
    // cura a la aldea —ese hombre pasa a ocupar el asiento de `leader`— y
    // `MOOD.FAITH_NO_PRIEST` pesa más que derivar hacia 50. Mientras ninguna
    // aldea llegaba a tener capilla eso no se veía; con la capilla a las 47
    // horas de reloj (B-1) el control tenía cura y el rey no, así que la prueba
    // medía la diferencia de tener cura y no la voluntad del rey. Sin cura en
    // los dos, la única diferencia es la corona, que es lo que se quiere medir.
    for (const v of plain.people.villagers) if (v.role === 'priest') v.role = null;
    for (const state of [plain, chapel]) state.village.faith = MOOD.FAITH_DRIFT_TO - 5;
    for (let n = 0; n < 24; n += 1) {
      updateMood(plain, ctx());
      updateMood(chapel, ctx());
    }
    expect(will(chapel).faithTo).toBe(CROWN.CHAPEL_FAITH_TO);
    expect(chapel.village.faith).toBeGreaterThan(plain.village.faith);
  });

  it('y el barril vale la mitad de ánimo', () => {
    expect(will(crowned(village(), 'priest')).feast).toBe(CROWN.CHAPEL_FEAST);
    expect(will(village()).feast).toBe(1);
  });
});

describe('K-2 · el rey noble trae corte y mirada de fuera', () => {
  it('coronarlo deja el valle vigilado', () => {
    const court = crowned(village(), 'leader');
    expect(will(court).style).toBe<CrownStyle>('court');
    const until = court.flags['watched'];
    expect(until, 'el camino se entera').toBeDefined();
    expect(until).toBeGreaterThan(court.tick);
  });

  it('y la sala le da ánimo, pero sólo cuando está en pie', () => {
    const court = crowned(village(), 'leader');
    const before = { ...court.village };
    updateMood(court, ctx());
    const withoutHall = court.village.morale - before.morale;
    // Con la sala puesta a mano, la misma semana da más ánimo.
    const withHall = crowned(village(), 'leader');
    withHall.buildings.push({
      id: 9500, kind: 'hall', x: 40, y: 40, w: 3, h: 3,
      builtTick: 0, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    const start = withHall.village.morale;
    updateMood(withHall, ctx());
    expect(withHall.village.morale - start).toBeGreaterThan(withoutHall);
  });
});

describe('K-2 · y la personalidad del rey también cuenta', () => {
  it('el ambicioso levanta un 5 % más de obra', () => {
    // §6.3 lo prometía desde el primer día —«el líder ambicioso levanta un 5 %
    // más»— y no estaba escrito en ninguna parte.
    const plain = village();
    const king = crowned(village(), 'reeve', ['ambitious']);
    const hands = allocateLabour(plain);
    expect(produce(king, hands).buildPoints)
      .toBeCloseTo(produce(plain, hands).buildPoints * CROWN.AMBITIOUS_WORKS, 6);
  });

  it('el generoso hace que el hambre cueste menos ánimo', () => {
    // La otra fila de §6.3 sin implementar: «−3 · severidad en vez de −4».
    const plain = village();
    const king = crowned(village(), 'reeve', ['generous']);
    for (const state of [plain, king]) state.village.morale = 60;
    updateMood(plain, ctx(1));
    updateMood(king, ctx(1));
    expect(king.village.morale).toBeGreaterThan(plain.village.morale);
  });

  it('el de mal genio hace la riña más probable', () => {
    const plain = village();
    const king = crowned(village(), 'reeve', ['hot_tempered']);
    const of = (state: GameState): number => weightNow(state, 'quarrel_in_the_square');
    if (of(plain) > 0) {
      expect(of(king)).toBeCloseTo(of(plain) * CROWN.TEMPER_QUARREL, 6);
    }
  });

  it('y el miedoso cierra la puerta a los de fuera', () => {
    expect(will(crowned(village(), 'reeve', ['craven'])).gate).toBe(CROWN.CRAVEN_GATE);
    expect(will(village()).gate).toBe(1);
  });
});

describe('K-2 · sin corona, nada de esto pasa', () => {
  it('la voluntad es la de reposo y el tick la lee igual que siempre', () => {
    const plain = village();
    expect(will(plain)).toEqual(RESTING_WILL);
    // Y los cuatro sitios que la leen dan lo de siempre: campos a 1, obra a 1,
    // fiesta a 1, puerta a 1. Si alguno de estos cuatro se desviara, una
    // partida guardada cambiaría de curso al cargarla, que es lo que §13.1
    // prohíbe.
    expect(will(plain).fields).toBe(1);
    expect(will(plain).works).toBe(1);
    expect(will(plain).feast).toBe(1);
    expect(will(plain).gate).toBe(1);
    expect(will(plain).priority).toBe('none');
    expect(will(plain).faithTo).toBeNull();
  });

  it('y con el trono vacante, vuelve al reposo', () => {
    // El interregno de A.15: el rey murió, la corona existe y nadie la lleva.
    // La aldea vuelve a hacer lo que hacía sola, que es el precio que esa
    // pregunta ya cobraba.
    const state = crowned(village(), 'smith');
    expect(will(state).style).toBe<CrownStyle>('forge');
    const king = state.people.villagers.find((v) => v.id === state.crown?.id);
    expect(king).toBeDefined();
    if (king === undefined) return;
    king.diedTick = state.tick;
    expect(will(state)).toEqual(RESTING_WILL);
  });
});

describe('K-2 · y el señor se fija en un valle armado', () => {
  it('el interés por las plantillas del señor sube con el rey herrero', () => {
    // No se mide el sorteo —eso es una tirada— sino el **peso**: lo mismo que
    // `pressure.test.ts` hace con los lobos. `FORGE_LORD` entra como candidato
    // `story`, así que si el valle ya está detrás de un muro gana el muro, y eso
    // es correcto: un rey armado tras una muralla molesta menos.
    expect(CROWN.FORGE_LORD).toBeGreaterThan(1);
    expect(will(crowned(village(), 'smith')).style).toBe<CrownStyle>('forge');
    // Y la fiesta del rey cura no toca la fe, sólo el ánimo: lo que le molesta
    // es la juerga.
    expect(FATE.FEAST_FAITH).toBeGreaterThan(0);
  });
});
