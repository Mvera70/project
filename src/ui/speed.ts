import { TIME } from '@engine/balance';

export type Speed = (typeof TIME.SPEEDS)[number];

export function isSpeed(value: number): value is Speed {
  return (TIME.SPEEDS as readonly number[]).includes(value);
}

export function speedLabel(speed: Speed): string {
  return speed === 0 ? 'Pause' : `${speed}×`;
}

