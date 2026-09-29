// Los ajustes gráficos que el jugador guarda (29 sep 2026). Se recuerdan en
// el navegador, como el idioma y el interruptor de taller: son del aparato,
// no de la partida, y por eso no van en el estado ni en el guardado. Lo que
// significan para el renderer lo dice `render3d/profile.ts`.

import { DEFAULT_GRAPHICS, sanitiseGraphics, type GraphicsSettings } from '../render3d/profile';

const KEY = 'valley.graphics';

export function readGraphicsSettings(): GraphicsSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return DEFAULT_GRAPHICS;
    return sanitiseGraphics(JSON.parse(raw));
  } catch {
    return DEFAULT_GRAPHICS;
  }
}

export function writeGraphicsSettings(settings: GraphicsSettings): void {
  try { localStorage.setItem(KEY, JSON.stringify(sanitiseGraphics(settings))); } catch { /* modo privado: nada que hacer */ }
}
