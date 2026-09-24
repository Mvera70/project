// El audio del valle: **un hueco para ficheros, y hoy en silencio.**
//
// Hasta el 24 sep 2026 aquí vivía la síntesis de U-09 —viento, río, yunque,
// campana y los acentos, todo con osciladores y ruido de Web Audio—. Vera la
// oyó y la cortó: «el audio ese es malísimo, el de fondo es hasta incómodo; hay
// que sustituir o borrar el sistema al completo». Se borró, y se eligió dejar
// **el sitio preparado** para cuando haya sonidos de verdad, grabados o
// generados, que se montan como el logotipo: los consigue ella y aquí se
// registran.
//
// Lo que queda:
//
//   · **Cuándo suena un acento** (`accentFor`, `accentAllowed`): puro y con sus
//     pruebas. Un hito, una encrucijada planteada o un trueno; nunca durante un
//     letargo y nunca dos más cerca que `SOUND.ACCENT_MIN_GAP_MS` (§11.4). Vale
//     igual para un fichero que para una síntesis.
//   · **El registro de ficheros** (`CUE_FILES`), vacío. Un sonido nuevo es una
//     línea aquí y su fichero en `public/audio/`; mientras falte, no suena nada
//     y no falla nada.
//   · **El reproductor** (`createSoundEngine`), que sólo se arma con el primer
//     toque —los navegadores no dejan sonar antes— y reproduce un fichero si
//     está registrado.
//
// No hay botón de sonido mientras no haya nada que sonar: vuelve con el primer
// fichero, junto con la preferencia de silencio.

import { SOUND } from '@engine/balance';

/** Los momentos que tienen sonido previsto. */
export type AccentKind = 'milestone' | 'crossroad' | 'thunder';

/**
 * Qué fichero suena en cada momento, relativo a la página
 * (`public/audio/<fichero>`). **Vacío a propósito**: se rellena cuando haya
 * sonidos buenos, no antes.
 */
export const CUE_FILES: Readonly<Partial<Record<AccentKind, string>>> = {};

/**
 * Qué acento dispara un tick, si alguno. El hito gana a la encrucijada si
 * coinciden —«una voz cada vez», la misma prioridad que la cartela sobre el
 * aviso— y durante un letargo no suena nada.
 */
export function accentFor(
  posed: string | null,
  milestoneFired: boolean,
  catchingUp: boolean,
): AccentKind | null {
  if (catchingUp) return null;
  if (milestoneFired) return 'milestone';
  if (posed !== null) return 'crossroad';
  return null;
}

/** El fusible de reloj de pared (§11.4): nunca dos acentos más cerca que el mínimo. */
export function accentAllowed(nowMs: number, lastPlayedMs: number | null): boolean {
  return lastPlayedMs === null || nowMs - lastPlayedMs >= SOUND.ACCENT_MIN_GAP_MS;
}

export interface SoundEngine {
  /** El primer toque: a partir de aquí el navegador deja sonar. */
  arm(): void;
  /** Suena el fichero de ese momento, si lo hay y el fusible lo deja. */
  accent(kind: AccentKind, nowMs: number): void;
}

export function createSoundEngine(): SoundEngine {
  let armed = false;
  let lastPlayedMs: number | null = null;
  return {
    arm(): void { armed = true; },
    accent(kind: AccentKind, nowMs: number): void {
      const file = CUE_FILES[kind];
      if (!armed || file === undefined || !accentAllowed(nowMs, lastPlayedMs)) return;
      lastPlayedMs = nowMs;
      const audio = new Audio(`./audio/${file}`);
      void audio.play().catch(() => { /* sin permiso o sin fichero: silencio, nunca un fallo */ });
    },
  };
}
