import { TIME } from '@engine/balance';
import { renderUiText } from '@engine/chronicle/render';

export type Speed = (typeof TIME.SPEEDS)[number];

export function isSpeed(value: number): value is Speed {
  return (TIME.SPEEDS as readonly number[]).includes(value);
}

export function speedLabel(speed: Speed): string {
  return speed === 0
    ? renderUiText('app.speed.pause')
    : renderUiText('app.speed.multiplier', { speed });
}
