// Fase 5 del sonido (30 sep 2026): los sucesos de la caza y el asedio.
//
// Lo que se guarda aquí es el **contrato**: de dos fotogramas de
// `GraphicsStats.moments` sale qué acaba de pasar, sin navegador y sin azar.
// Cómo suena cada fichero se escucha (`tools/ui/sounds.py`).

import { describe, expect, it } from 'vitest';
import { SOUND } from '@engine/balance';
import { CUE_FILES, momentAllowed } from '@ui/sound';
import { MOMENT_CUE, momentsAudible, momentsFrom, type MomentKind } from '@ui/moments';
import type { WorldMoments } from '../../src/render3d/contracts';

const NONE: WorldMoments = { battle: null, hunt: null, bear: null };
const GATE = { x: 30, z: 40 };

function battle(over: Partial<NonNullable<WorldMoments['battle']>> = {}): WorldMoments {
  return {
    ...NONE,
    battle: { loosed: 0, hits: 0, arrowHits: 0, fallen: 0, lost: 0,
      gate: { at: GATE, hits: 0, broken: false }, ...over },
  };
}
const kinds = (list: readonly { kind: MomentKind }[]): MomentKind[] => list.map((m) => m.kind);

describe('momentsFrom · de dos fotogramas, qué acaba de pasar', () => {
  it('sin fotograma anterior no pasa nada: abrir una partida a mitad de un cerco no lo suelta todo', () => {
    expect(momentsFrom(null, battle({ loosed: 40, gate: { at: GATE, hits: 30, broken: true } }))).toEqual([]);
  });

  it('un fotograma igual al anterior no suena nada', () => {
    const frame = battle({ loosed: 5, hits: 2, arrowHits: 1 });
    expect(momentsFrom(frame, frame)).toEqual([]);
  });

  it('cada flecha soltada, cada acierto y cada golpe suenan, y un golpe de mano no es una flecha', () => {
    const out = momentsFrom(battle(), battle({ loosed: 2, hits: 3, arrowHits: 1 }));
    expect(kinds(out).filter((k) => k === 'arrow_loosed')).toHaveLength(2);
    expect(kinds(out).filter((k) => k === 'arrow_struck')).toHaveLength(1);
    expect(kinds(out).filter((k) => k === 'blow')).toHaveLength(2);
  });

  it('los caídos suenan, y los del clan y los de la aldea son sucesos distintos', () => {
    const out = momentsFrom(battle(), battle({ fallen: 1, lost: 1 }));
    expect(kinds(out).sort()).toEqual(['defender_down', 'raider_down']);
  });

  it('el portón suena en su sitio: cada golpe y, una sola vez, el que cede', () => {
    const struck = momentsFrom(battle(), battle({ gate: { at: GATE, hits: 2, broken: false } }));
    expect(kinds(struck)).toEqual(['gate_struck', 'gate_struck']);
    expect(struck.every((m) => m.at?.x === GATE.x && m.at.z === GATE.z)).toBe(true);
    const broke = momentsFrom(battle({ gate: { at: GATE, hits: 9, broken: false } }),
      battle({ gate: { at: GATE, hits: 10, broken: true } }));
    expect(kinds(broke)).toEqual(['gate_struck', 'gate_broken']);
    const after = battle({ gate: { at: GATE, hits: 10, broken: true } });
    expect(momentsFrom(after, after)).toEqual([]);
  });

  it('una jornada que se abre con el portón ya roto no lo rompe otra vez', () => {
    const out = momentsFrom(NONE, battle({ gate: { at: GATE, hits: 0, broken: true } }));
    expect(kinds(out)).not.toContain('gate_broken');
  });

  it('una cuenta que baja es una jornada nueva: lo que lleva ahora es nuevo, no un negativo', () => {
    const out = momentsFrom(battle({ loosed: 12 }), battle({ loosed: 2 }));
    expect(kinds(out)).toEqual(['arrow_loosed', 'arrow_loosed']);
  });

  it('pero nunca más de un puñado por fotograma: una jornada rehecha a mitad de cerco no devuelve sesenta golpes', () => {
    const out = momentsFrom(battle(), battle({ gate: { at: GATE, hits: 60, broken: false } }));
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('momentsFrom · la caza y el oso', () => {
  const hunt = (strokes: number, outcome: 'hit' | 'wound' | 'graze' | 'standing' | 'ground' | 'miss'): WorldMoments => ({
    ...NONE, hunt: { strokes, last: strokes === 0 ? null : { kind: 'shot', outcome }, at: { x: 10, z: 12 } },
  });

  it('un tiro que da suena a acierto, y uno que roza o se clava en la madera, a fallo', () => {
    expect(kinds(momentsFrom(hunt(0, 'hit'), hunt(1, 'hit')))).toEqual(['hunt_struck']);
    expect(kinds(momentsFrom(hunt(0, 'hit'), hunt(1, 'wound')))).toEqual(['hunt_struck']);
    for (const outcome of ['graze', 'standing', 'ground', 'miss'] as const) {
      expect(kinds(momentsFrom(hunt(0, 'hit'), hunt(1, outcome)))).toEqual(['hunt_missed']);
    }
  });

  it('el mismo tiro no suena dos veces', () => {
    expect(momentsFrom(hunt(1, 'hit'), hunt(1, 'hit'))).toEqual([]);
  });

  it('un oso que se alza es un suceso con su sitio, y todavía sin voz', () => {
    const out = momentsFrom({ ...NONE, bear: { warnings: 0, at: { x: 5, z: 6 } } },
      { ...NONE, bear: { warnings: 1, at: { x: 5, z: 6 } } });
    expect(kinds(out)).toEqual(['bear_rises']);
    expect(out[0]!.at).toEqual({ x: 5, z: 6 });
    // Un gruñido es una voz de animal: sintetizada se descartó (U-09).
    expect(MOMENT_CUE.bear_rises).toBeNull();
  });
});

describe('el contrato, contra los ficheros', () => {
  it('todo suceso con voz apunta a un sonido que existe en el reproductor', () => {
    for (const cue of Object.values(MOMENT_CUE)) {
      if (cue !== null) expect(CUE_FILES[cue], String(cue)).toBeDefined();
    }
  });

  it('el oso no suena: un gruñido es una voz de animal y una voz sintética está descartada', () => {
    expect(MOMENT_CUE.bear_rises).toBeNull();
  });
});

describe('las compuertas · un suceso lejano o apilado no suena', () => {
  it('el mismo golpe no se apila dentro del fusible, y pasa cuando el reloj avanza', () => {
    expect(momentAllowed(1000, undefined, 1)).toBe(true);
    expect(momentAllowed(1000 + SOUND.MOMENT_MIN_GAP_MS - 1, 1000, 1)).toBe(false);
    expect(momentAllowed(1000 + SOUND.MOMENT_MIN_GAP_MS, 1000, 1)).toBe(true);
  });

  it('lo que queda por debajo de la cercanía mínima no se programa', () => {
    expect(momentAllowed(0, undefined, SOUND.MOMENT_MIN_GAIN / 2)).toBe(false);
  });

  it('en pausa, en un letargo, con la pestaña oculta y a ×16 o más, calla', () => {
    const on = { speed: 1, catchingUp: false, hidden: false };
    expect(momentsAudible(on, SOUND.AMBIENCE_FAST_SPEED)).toBe(true);
    expect(momentsAudible({ ...on, speed: 4 }, SOUND.AMBIENCE_FAST_SPEED)).toBe(true);
    expect(momentsAudible({ ...on, speed: 0 }, SOUND.AMBIENCE_FAST_SPEED)).toBe(false);
    expect(momentsAudible({ ...on, catchingUp: true }, SOUND.AMBIENCE_FAST_SPEED)).toBe(false);
    expect(momentsAudible({ ...on, hidden: true }, SOUND.AMBIENCE_FAST_SPEED)).toBe(false);
    expect(momentsAudible({ ...on, speed: 16 }, SOUND.AMBIENCE_FAST_SPEED)).toBe(false);
    expect(momentsAudible({ ...on, speed: 64 }, SOUND.AMBIENCE_FAST_SPEED)).toBe(false);
  });
});
