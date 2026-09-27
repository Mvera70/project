// El panel de taller: FPS y dos cifras más, arriba a la derecha. 27 sep 2026.
//
// Vera: «añade al modo desarrollador un contador de fps en la esquina superior
// derecha, y alguna que otra métrica muy importante, no mucho; tres líneas
// máximo». Sale sólo con el interruptor de taller del menú (`devPreference`).
// Es de taller, como el panel del banco de batallas: va en español y no pasa
// por el banco de plantillas, que es para lo que lee el jugador.
//
//   1 · fotogramas por segundo y el peor fotograma del último medio segundo
//   2 · llamadas de dibujo y triángulos del último dibujo
//   3 · la resolución a la que va la adaptativa (`adaptResolution`)
//
// Cuesta un `requestAnimationFrame` que sólo suma, y reescribir tres líneas
// dos veces por segundo.

const DEV_KEY = 'valley.dev';

/** Si el interruptor de taller del menú está puesto. Se recuerda, como el sonido. */
export function devPreference(): boolean {
  try { return localStorage.getItem(DEV_KEY) === 'on'; } catch { return false; }
}

export function setDevPreference(on: boolean): void {
  try { localStorage.setItem(DEV_KEY, on ? 'on' : 'off'); } catch { /* modo privado: nada que hacer */ }
}

/** Cada cuánto se reescribe, en milisegundos. */
const REFRESH_MS = 500;

export interface DevHud { dispose(): void }

export function startDevHud(host: HTMLElement): DevHud {
  const panel = document.createElement('div');
  panel.className = 'dev-hud';
  panel.setAttribute('aria-hidden', 'true');
  panel.style.cssText = [
    'position:fixed', 'top:calc(env(safe-area-inset-top, 0px) + 6px)', 'right:6px', 'z-index:9999',
    'padding:4px 7px', 'border-radius:6px', 'background:rgba(20,16,12,.72)', 'color:#f3e3c2',
    'font:600 11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace', 'white-space:pre',
    'pointer-events:none', 'text-align:right', 'font-variant-numeric:tabular-nums',
  ].join(';');
  host.append(panel);

  let frames = 0;
  let worst = 0;
  let last = performance.now();
  let windowStart = last;
  let raf = 0;
  const tick = (now: number): void => {
    const delta = now - last;
    last = now;
    frames += 1;
    worst = Math.max(worst, delta);
    if (now - windowStart >= REFRESH_MS) {
      const fps = (frames * 1000) / (now - windowStart);
      const stats = window.__valleyRenderStats?.();
      const lines = [`${fps.toFixed(0)} fps · peor ${worst.toFixed(0)} ms`];
      if (stats !== undefined) {
        lines.push(`${stats.calls} llamadas · ${(stats.triangles / 1000).toFixed(0)}k tri`);
        lines.push(`resolución ${(stats.scale * 100).toFixed(0)} %`);
      }
      panel.textContent = lines.join('\n');
      frames = 0;
      worst = 0;
      windowStart = now;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      panel.remove();
    },
  };
}
