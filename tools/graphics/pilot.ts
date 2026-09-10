/**
 * G-06 · El piloto, en una sola página. design.md D.5, D.6.
 *
 * El mismo renderer, los mismos actores y el mismo motor que corren en el
 * proyecto, empaquetados para poder mirarlos desde un teléfono sin servidor.
 * El GLB del aldeano viaja dentro de la página en base64 y la biblioteca lo
 * recibe como bytes, así que no hay ninguna petición de red que pueda fallar.
 *
 * No es una maqueta: si aquí se ve mal, está mal en el juego.
 */
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere } from '@engine/people/demography';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { actorsFor } from '../../src/render3d/actors';
import { loadAssets } from '../../src/render3d/assets';
import { createPresentationClock } from '../../src/render3d/presentation-clock';
import { createGraphicsRenderer } from '../../src/render3d/renderer';
import type { GraphicsRenderer } from '../../src/render3d/contracts';

declare const VALLEY_VILLAGER_GLB: string;
declare const VALLEY_TREE_GLB: string;

function bytesOf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const readout = document.querySelector<HTMLElement>('#readout');
const clock = createPresentationClock();

let state: GameState | null = null;
let renderer: GraphicsRenderer | null = null;
let speed: 0 | 1 | 4 | 16 = 1;
let years = 14;
let seed = 7;

function say(text: string): void {
  if (readout !== null) readout.textContent = text;
}

function size(): { width: number; height: number } {
  const stage = document.querySelector<HTMLElement>('#stage-wrap');
  const width = Math.max(240, stage?.clientWidth ?? 360);
  return { width, height: Math.round(Math.min(Math.max(width * 1.25, 320), 620)) };
}

function found(): void {
  const fresh = foundGame(seed);
  run(fresh, Math.round(years * 48), 'prudent', CATALOG);
  state = fresh;
  clock.reset();
}

async function main(): Promise<void> {
  if (canvas === null) throw new Error('No canvas.');
  found();

  renderer = await createGraphicsRenderer({
    canvas,
    assetBaseUrl: '',
    quality: 'standard',
    library,
  }).catch((error: unknown) => {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  });

  const viewport = size();
  renderer.resize({ ...viewport, widthCss: viewport.width, heightCss: viewport.height, pixelRatio: window.devicePixelRatio });
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  // El acumulador del juego, aparte del reloj de presentación: el reloj no
  // adelanta un tick ni lo toca, que es la regla de D.6.
  let carried = 0;
  let previous = performance.now();

  function step(now: number): void {
    if (state === null || renderer === null) return;
    const elapsed = Math.min(250, now - previous);
    previous = now;

    carried += elapsed * speed;
    while (carried >= 15_000 && state.tick < 20_000) {
      run(state, 1, 'prudent', CATALOG);
      carried -= 15_000;
    }

    const frame = clock.frame({
      realMs: now,
      tick: state.tick,
      tickFraction: Math.max(0, Math.min(1, carried / 15_000)),
      speed,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      hidden: document.hidden,
    });
    renderer.paint(state, frame);

    const actors = actorsFor(state, frame);
    const doing: Record<string, number> = {};
    for (const actor of actors) doing[actor.activity] = (doing[actor.activity] ?? 0) + 1;
    const year = Math.floor(state.tick / 48);
    say(
      `año ${year} · ${state.people.villagers.filter(isHere).length} vecinos · `
      + `${state.buildings.filter((b) => b.lostTick === null).length} en pie · `
      + Object.entries(doing).map(([what, many]) => `${many} ${what}`).join(', '),
    );
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  window.addEventListener('resize', () => {
    if (renderer === null) return;
    const next = size();
    canvas.style.width = `${next.width}px`;
    canvas.style.height = `${next.height}px`;
    renderer.resize({ widthCss: next.width, heightCss: next.height, pixelRatio: window.devicePixelRatio });
  });

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    button.addEventListener('click', () => {
      speed = Number(button.dataset.speed) as 0 | 1 | 4 | 16;
      for (const other of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
    });
  }

  const seedInput = document.querySelector<HTMLInputElement>('#seed');
  const yearsInput = document.querySelector<HTMLInputElement>('#years');
  document.querySelector<HTMLButtonElement>('#refound')?.addEventListener('click', () => {
    seed = Number(seedInput?.value ?? 7) || 7;
    years = Math.max(1, Math.min(80, Number(yearsInput?.value ?? 14) || 14));
    found();
  });

  // --- gestos ---------------------------------------------------------------
  //
  // Un dedo arrastra, dos pellizcan, y un toque que no arrastra selecciona.
  // Distinguir el toque del arrastre por distancia recorrida y no por tiempo:
  // un dedo siempre se mueve un poco, y un umbral de tiempo convierte un
  // arrastre lento en una selección que nadie pidió.
  const TAP = 8;
  const touching = new Map<number, { x: number; y: number }>();
  let dragged = 0;
  let pinch = 0;

  const localOf = (event: PointerEvent): { x: number; y: number } => {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const spread = (): { gap: number; x: number; y: number } => {
    const [a, b] = [...touching.values()];
    if (a === undefined || b === undefined) return { gap: 0, x: 0, y: 0 };
    return { gap: Math.hypot(b.x - a.x, b.y - a.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    touching.set(event.pointerId, localOf(event));
    dragged = 0;
    if (touching.size === 2) pinch = spread().gap;
  });

  canvas.addEventListener('pointermove', (event) => {
    if (renderer === null || !touching.has(event.pointerId)) return;
    const was = touching.get(event.pointerId);
    const now = localOf(event);
    touching.set(event.pointerId, now);
    if (was === undefined) return;

    if (touching.size >= 2) {
      const { gap, x, y } = spread();
      if (pinch > 0 && gap > 0) renderer.zoom(pinch / gap, x, y);
      pinch = gap;
      dragged = TAP + 1;
      return;
    }
    const dx = now.x - was.x;
    const dy = now.y - was.y;
    dragged += Math.hypot(dx, dy);
    renderer.pan(dx, dy);
  });

  const lift = (event: PointerEvent): void => {
    const was = touching.get(event.pointerId);
    touching.delete(event.pointerId);
    if (touching.size < 2) pinch = 0;
    if (renderer === null || was === undefined || dragged > TAP) return;
    const hit = renderer.pick(was.x, was.y);
    const note = document.querySelector<HTMLElement>('#touched');
    if (note === null) return;
    note.textContent = hit === null
      ? ''
      : `tocaste: ${hit.kind === 'terrain' ? `terreno ${hit.x},${hit.y}` : `${hit.kind} ${hit.id}`}`;
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', (event) => {
    touching.delete(event.pointerId);
    if (touching.size < 2) pinch = 0;
  });

  canvas.addEventListener('wheel', (event) => {
    if (renderer === null) return;
    event.preventDefault();
    const box = canvas.getBoundingClientRect();
    renderer.zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12, event.clientX - box.left, event.clientY - box.top);
  }, { passive: false });

  document.querySelector<HTMLButtonElement>('#reset-view')?.addEventListener('click', () => {
    renderer?.resetView();
  });
}

// La biblioteca se monta aquí, con el GLB que viaja dentro de la página, y se
// le presta al renderer. La página la posee y la página la suelta.
let library: Awaited<ReturnType<typeof loadAssets>>;

void (async (): Promise<void> => {
  library = await loadAssets({
    baseUrl: '',
    manifest: {
      schemaVersion: 1,
      assets: [
        { id: 'villager', file: 'villager.glb', sha256: 'embedded', motion: [] },
        { id: 'tree', file: 'tree.glb', sha256: 'embedded', motion: [] },
      ],
    },
    bytes: { villager: bytesOf(VALLEY_VILLAGER_GLB), tree: bytesOf(VALLEY_TREE_GLB) },
  });
  await main();
})().catch((error: unknown) => {
  say(error instanceof Error ? error.message : String(error));
});
