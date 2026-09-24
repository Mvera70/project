// IA-fields · El cultivo de cada parcela y la fase del año en que está.
//
// Puro: sale del `id` de la parcela y de la semana, sin azar y sin estado
// nuevo, así que la crónica del motor, la escena y la vida leen lo mismo.
// Hasta aquí el cultivo sólo existía en la pantalla (`id % 3` en `plan.ts`).

import { FIELD_CYCLE, TIME } from '../balance';
import type { Building } from '../state';
import { weekOf } from '../time';

export const CROPS = ['grain', 'cabbage', 'leeks'] as const;
export type Crop = (typeof CROPS)[number];

/** El cultivo de una parcela: el mismo reparto que ya se dibujaba. */
export function cropOf(field: Pick<Building, 'id'>): Crop {
  return CROPS[field.id % CROPS.length] as Crop;
}

export type FieldPhase = 'fallow' | 'manure' | 'plough' | 'sow' | 'grow' | 'ripe' | 'stubble';

export interface FieldMoment {
  readonly phase: FieldPhase;
  /** 0 recién sembrado, 1 hecho. Sólo tiene sentido en `sow`, `grow` y `ripe`. */
  readonly growth: number;
}

/**
 * En qué punto del año está una parcela.
 *
 * `stubble` es el rastrojo que queda de la cosecha hasta que empieza el
 * invierno, y `fallow` el invierno en reposo. El resto sigue a `FIELD_CYCLE`.
 */
export function fieldMoment(crop: Crop, tick: number): FieldMoment {
  const week = weekOf(tick);
  const sow = FIELD_CYCLE.SOW_FROM[crop];
  const ripe = FIELD_CYCLE.RIPE_AT[crop];
  // El invierno empieza justo después de la cosecha: rastrojo su primera
  // mitad, reposo la segunda.
  if (week > TIME.HARVEST_WEEK) return { phase: week <= TIME.HARVEST_WEEK + TIME.WEEKS_PER_SEASON / 2 ? 'stubble' : 'fallow', growth: 0 };
  if (week === TIME.HARVEST_WEEK) return { phase: 'ripe', growth: 1 };
  if (week < FIELD_CYCLE.PLOUGH_FROM) return { phase: 'manure', growth: 0 };
  if (week < sow) return { phase: 'plough', growth: 0 };
  const growth = Math.max(0, Math.min(1, (week - sow) / (ripe - sow)));
  if (week < sow + FIELD_CYCLE.SOW_WEEKS) return { phase: 'sow', growth };
  return { phase: week >= ripe ? 'ripe' : 'grow', growth };
}

/**
 * IA-fields · Lo que la crónica cuenta del año del campo esta semana.
 *
 * Cada fase que empieza es un suceso; la primera vez que el valle hace algo
 * —el primer arado, la primera siembra de cada cultivo— es una noticia de
 * peso 2 y se recuerda en `state.flags` (permanente, valor 0) para no volver
 * a contarla. Lo demás es la rutina del año, de peso 1. Sin azar.
 */
export interface FieldEvent {
  readonly templateKey: string;
  readonly weight: 1 | 2;
  readonly count: number;
  /** Marca que hay que poner para no repetir una primera vez. */
  readonly flag: string | null;
}

export function fieldEvents(
  fields: readonly Pick<Building, 'id' | 'kind' | 'lostTick'>[],
  flags: Readonly<Record<string, number>>,
  tick: number,
): FieldEvent[] {
  const standing = fields.filter(field => field.kind === 'field' && field.lostTick === null);
  if (standing.length === 0) return [];
  const week = weekOf(tick);
  const events: FieldEvent[] = [];
  const first = (flag: string, once: string, again: string, count: number): void => {
    const known = flags[flag] !== undefined;
    events.push({ templateKey: known ? again : once, weight: known ? 1 : 2, count, flag: known ? null : flag });
  };
  if (week === FIELD_CYCLE.MANURE_FROM) first('field_first_manure', 'fields.first_manure', 'fields.manured', standing.length);
  if (week === FIELD_CYCLE.PLOUGH_FROM) first('field_first_plough', 'fields.first_plough', 'fields.ploughed', standing.length);
  for (const crop of CROPS) {
    const mine = standing.filter(field => cropOf(field) === crop).length;
    if (mine === 0) continue;
    if (week === FIELD_CYCLE.SOW_FROM[crop]) first(`field_first_sow_${crop}`, `fields.first_sowing.${crop}`, `fields.sown.${crop}`, mine);
    if (week === FIELD_CYCLE.RIPE_AT[crop]) events.push({ templateKey: `fields.ripe.${crop}`, weight: 1, count: mine, flag: null });
  }
  return events;
}
