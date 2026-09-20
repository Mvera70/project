import { describe, expect, it, vi } from 'vitest';

import {
  STORMED_MAX_MS,
  STORMED_MIN_MS,
  startStormedTransition,
  type EndingScene,
} from '../../src/ui/stormed-transition';

const entering = (): EndingScene => ({
  active: true,
  ready: false,
  phase: 'entering',
  loads: 0,
  traces: 0,
});

function fakeTiming() {
  let time = 0;
  let nextFrame = 1;
  const pending = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  const now = () => time;
  const requestFrame = (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    pending.set(id, callback);
    return id;
  };
  const cancelFrame = (id: number) => {
    cancelled.push(id);
    pending.delete(id);
  };
  const runAt = (milliseconds: number) => {
    time = milliseconds;
    const frame = pending.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined;
    expect(frame, `no hay RAF pendiente en t=${milliseconds}`).toBeDefined();
    if (!frame) return;
    pending.delete(frame[0]);
    frame[1](milliseconds);
  };

  return { now, requestFrame, cancelFrame, runAt, pending, cancelled };
}

describe('startStormedTransition', () => {
  it.each([
    ['ready', { ...entering(), ready: true }],
    ['phase complete', { ...entering(), phase: 'complete' as const }],
  ])('respeta el mínimo de 8 s aunque la escena esté %s', (_label, ending) => {
    const timing = fakeTiming();
    const paint = vi.fn();
    const complete = vi.fn();

    startStormedTransition({
      reducedMotion: false,
      ending: () => ending,
      paint,
      complete,
      ...timing,
    });

    timing.runAt(STORMED_MIN_MS - 1);
    expect(complete).not.toHaveBeenCalled();

    timing.runAt(STORMED_MIN_MS);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(paint).toHaveBeenCalledTimes(2);
    expect(timing.pending.size).toBe(0);
  });

  it('finaliza forzosamente a los 12 s aunque la escena nunca esté lista', () => {
    const timing = fakeTiming();
    const complete = vi.fn();

    startStormedTransition({
      reducedMotion: false,
      ending: entering,
      paint: vi.fn(),
      complete,
      ...timing,
    });

    timing.runAt(STORMED_MAX_MS - 1);
    expect(complete).not.toHaveBeenCalled();

    timing.runAt(STORMED_MAX_MS);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(timing.pending.size).toBe(0);
  });

  it.each([
    ['movimiento reducido', true, entering()],
    ['escena ausente', false, null],
  ])('completa inmediatamente con %s', (_label, reducedMotion, scene) => {
    const timing = fakeTiming();
    const paint = vi.fn();
    const complete = vi.fn();

    const transition = startStormedTransition({
      reducedMotion,
      ending: () => scene,
      paint,
      complete,
      ...timing,
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(paint).not.toHaveBeenCalled();
    expect(timing.pending.size).toBe(0);

    transition.cancel();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(timing.cancelled).toEqual([]);
  });

  it('cancela el RAF pendiente de forma idempotente sin pintar ni completar', () => {
    const timing = fakeTiming();
    const paint = vi.fn();
    const complete = vi.fn();

    const transition = startStormedTransition({
      reducedMotion: false,
      ending: entering,
      paint,
      complete,
      ...timing,
    });

    expect(timing.pending.size).toBe(1);
    transition.cancel();
    transition.cancel();

    expect(timing.cancelled).toEqual([1]);
    expect(timing.pending.size).toBe(0);
    expect(paint).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it('invoca complete una sola vez incluso si reaparece un callback RAF obsoleto', () => {
    const timing = fakeTiming();
    const complete = vi.fn();

    startStormedTransition({
      reducedMotion: false,
      ending: () => ({ ...entering(), ready: true }),
      paint: vi.fn(),
      complete,
      ...timing,
    });

    const staleFrame = timing.pending.values().next().value as
      | FrameRequestCallback
      | undefined;
    timing.runAt(STORMED_MIN_MS);
    staleFrame?.(STORMED_MIN_MS + 1);

    expect(complete).toHaveBeenCalledTimes(1);
    expect(timing.pending.size).toBe(0);
  });
});
