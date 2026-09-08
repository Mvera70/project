// M-21 · Gesture recognition is pure; pointer events are adapted by app.ts.

export interface Point { x: number; y: number; atMs: number }
export interface GestureTrace {
  points: readonly Point[];
  secondStartDistance?: number;
  secondEndDistance?: number;
}
export type Gesture = 'tap' | 'hold' | 'swipe_up' | 'swipe_down' | 'pinch' | 'none';

export function recogniseGesture(trace: GestureTrace): Gesture {
  if (trace.secondStartDistance !== undefined && trace.secondEndDistance !== undefined) {
    return Math.abs(trace.secondEndDistance - trace.secondStartDistance) >= 12 ? 'pinch' : 'none';
  }
  const first = trace.points[0];
  const last = trace.points.at(-1);
  if (first === undefined || last === undefined) return 'none';
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  const duration = Math.max(0, last.atMs - first.atMs);
  if (distance <= 10) return duration >= 500 ? 'hold' : duration <= 300 ? 'tap' : 'none';
  if (Math.abs(dy) >= 44 && Math.abs(dy) > Math.abs(dx)) return dy < 0 ? 'swipe_up' : 'swipe_down';
  return 'none';
}
