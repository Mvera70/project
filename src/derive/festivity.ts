// El valle más vivo (25 sep 2026) · Cuándo está la plaza de fiesta.
//
// Una boda, la fiesta de la cosecha o la del barril ya reúnen a la aldea
// (`derive/gatherings.ts`, R-1); lo que faltaba era que la plaza se vistiera
// para ellas. Esto dice **si hoy hay fiesta y de qué**, leyendo los sucesos del
// motor, sin tocarlo y sin azar. La decoración (banderines y farolillos) la
// pone el render (`effects/festoon.ts`).

import type { GameState, HappeningId } from '@engine/state';

/** Los sucesos que son una fiesta, y por eso engalanan la plaza. */
export const FESTIVE: readonly HappeningId[] = ['wedding', 'harvest_feast', 'ale_feast'];

/**
 * TUNE: cuántas semanas se queda puesta la decoración tras el suceso. Una: se
 * cuelga el día de la fiesta y se descuelga a la semana, que es lo que tarda
 * una aldea en recoger.
 */
const FESTOON_WEEKS = 1;

/** La fiesta que engalana la plaza esta semana, o `null` si no hay ninguna. */
export function festivityOf(state: Readonly<GameState>): HappeningId | null {
  for (let n = state.happenings.length - 1; n >= 0; n -= 1) {
    const happening = state.happenings[n]!;
    if (happening.tick > state.tick) continue;
    if (state.tick - happening.tick >= FESTOON_WEEKS) break;
    if (FESTIVE.includes(happening.id)) return happening.id;
  }
  return null;
}
