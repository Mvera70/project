// El reproductor de `src/ui/sound.ts`, con un `AudioContext` de mentira.
//
// Hasta la revisión del 30 sep 2026 nada ejercitaba `createSoundEngine`: las
// pruebas de `sound.test.ts` guardan las funciones puras del *cuándo*, y así
// pasó que el trueno cercano no sonaba nunca —el fusible de los acentos lo
// tiraba— con todas ellas en verde. Aquí se mira lo que el reproductor **hace**
// con lo que le piden: qué empieza a sonar, qué bucles siguen vivos, qué se
// descarga y qué se decodifica. Cómo suena cada fichero no se prueba: se oye.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SOUND } from '@engine/balance';
import { createSoundEngine, type Cue } from '@ui/sound';
import { thunderFor, type Mix } from '@ui/ambience';

class FakeParam {
  value = 0;
  setValueAtTime(value: number): void { this.value = value; }
  setTargetAtTime(value: number): void { this.value = value; }
}

class FakeNode {
  disconnected = false;
  connect<T>(node: T): T { return node; }
  disconnect(): void { this.disconnected = true; }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeSource extends FakeNode {
  buffer: { duration: number } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  readonly playbackRate = new FakeParam();
  started = false;
  stopped = false;
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}

/** Lo que el reproductor le ha pedido al navegador, para mirarlo desde fuera. */
class FakeContext {
  static made: FakeContext[] = [];
  state = 'running';
  currentTime = 0;
  readonly destination = new FakeNode();
  readonly sources: FakeSource[] = [];
  decodes = 0;
  constructor() { FakeContext.made.push(this); }
  createGain(): FakeGain { return new FakeGain(); }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createBuffer(): { duration: number } { return { duration: 0 }; }
  decodeAudioData(): Promise<{ duration: number }> {
    this.decodes += 1;
    return Promise.resolve({ duration: 12 });
  }
  resume(): Promise<void> { this.state = 'running'; return Promise.resolve(); }
  suspend(): Promise<void> { this.state = 'suspended'; return Promise.resolve(); }
}

let fetches: string[] = [];
let failing = false;
const played = (): Cue[] => (globalThis.window.__valleySound?.played ?? []).map((p) => p.cue);
/** Deja correr las promesas de descarga y decodificación. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const context = (): FakeContext => FakeContext.made.at(-1)!;
/** Los bucles que el reproductor tiene girando ahora mismo. */
const liveLoops = (): FakeSource[] => context().sources.filter((s) => s.loop && s.started && !s.stopped);

function install(preference: 'on' | 'off' = 'on'): void {
  FakeContext.made = [];
  fetches = [];
  failing = false;
  vi.stubGlobal('window', { AudioContext: FakeContext });
  vi.stubGlobal('document', { hidden: false });
  vi.stubGlobal('localStorage', {
    getItem: () => preference,
    setItem: () => undefined,
  });
  vi.stubGlobal('fetch', (url: string) => {
    fetches.push(url);
    if (failing) return Promise.reject(new Error('sin red'));
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  });
}

beforeEach(() => install());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('el cielo · el trueno cercano suena detrás de su latigazo', () => {
  it('un rayo encima de la cámara suena dos veces: latigazo y trueno', async () => {
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    // El caso de la revisión: rayo a diez celdas, con el retardo de verdad.
    const { cue, delaySeconds } = thunderFor(10);
    expect(cue).toBe('weather_thunder_near');
    engine.sky('weather_lightning_crack', 0);
    await settle();
    engine.sky(cue, delaySeconds * 1000);
    await settle();
    expect(played()).toEqual(['weather_lightning_crack', 'weather_thunder_near']);
  });

  it('y un hito que acaba de sonar no se come el trueno: son dos fusibles', async () => {
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    engine.accent('stinger_milestone_minor', 0);
    engine.sky('weather_thunder_mid', 200);
    await settle();
    expect(played()).toEqual(['stinger_milestone_minor', 'weather_thunder_mid']);
  });

  it('el fusible de los acentos sigue ahí para lo que es suyo', async () => {
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    engine.accent('stinger_milestone_minor', 0);
    engine.accent('ui_crossroad_opens', SOUND.ACCENT_MIN_GAP_MS / 2);
    await settle();
    expect(played()).toEqual(['stinger_milestone_minor']);
  });
});

describe('la memoria · un lecho callado se suelta', () => {
  const STORM: Mix = { amb_storm_bed: 0.5 };

  it('pasado un rato en silencio su bucle se para y se vuelve a decodificar sin red', async () => {
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    engine.ambience(STORM, 0);
    await settle();
    expect(liveLoops()).toHaveLength(1);
    const decodes = context().decodes;
    const downloads = fetches.length;

    // La tormenta pasa: la capa baja a cero y se queda callada.
    for (let s = 0; s <= SOUND.AMBIENCE_RELEASE_SECONDS + 5; s += 1) engine.ambience({}, 1);
    expect(liveLoops()).toHaveLength(0);

    // Vuelve la tormenta: suena otra vez, decodificando de lo ya descargado.
    engine.ambience(STORM, 0);
    await settle();
    expect(liveLoops()).toHaveLength(1);
    expect(context().decodes).toBe(decodes + 1);
    expect(fetches.length).toBe(downloads);
  });

  it('un lecho que sólo baja un momento no se suelta', async () => {
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    engine.ambience(STORM, 0);
    await settle();
    for (let s = 0; s < SOUND.AMBIENCE_RELEASE_SECONDS / 2; s += 1) engine.ambience({}, 1);
    engine.ambience(STORM, 1);
    for (let s = 0; s < SOUND.AMBIENCE_RELEASE_SECONDS / 2 + 2; s += 1) engine.ambience({}, 1);
    expect(liveLoops()).toHaveLength(1);
  });
});

describe('apagado no se paga nada', () => {
  it('con el sonido apagado desde el principio, ni se descarga ni se crea el contexto', async () => {
    install('off');
    const engine = createSoundEngine();
    engine.prefetch();
    engine.arm();
    engine.tap('ui_panel_open', 0);
    engine.ambience({ amb_river: 0.4 }, 0.1);
    await settle();
    expect(fetches).toHaveLength(0);
    expect(FakeContext.made).toHaveLength(0);
  });

  it('al apagarlo se paran los bucles y el contexto se duerme; al encenderlo, vuelve', async () => {
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    engine.ambience({ amb_river: 0.4, amb_wind_calm: 0.3 }, 0);
    await settle();
    expect(liveLoops()).toHaveLength(2);

    engine.setEnabled(false);
    expect(liveLoops()).toHaveLength(0);
    await settle();
    expect(context().state).toBe('suspended');

    engine.setEnabled(true);
    await settle();
    expect(context().state).toBe('running');
    engine.ambience({ amb_river: 0.4 }, 0);
    await settle();
    expect(liveLoops()).toHaveLength(1);
  });

  it('al encender, los toques ya están decodificados y no esperan al primer toque', async () => {
    // Un toque que se decodifica al pulsarlo llega tarde con el valle
    // cargando, y `LATE_PLAY_MS` lo tira: medido en el recorrido, cuatro
    // botones mudos seguidos tras apagar y encender en la portada, y el
    // propio sonido de encender mudo en el valle.
    install('off');
    const engine = createSoundEngine();
    engine.arm();
    engine.setEnabled(true);
    await settle();
    engine.setEnabled(false);
    engine.setEnabled(true);
    await settle();
    const before = context().decodes;
    engine.tap('ui_title_begin', 0);
    await settle();
    expect(context().decodes).toBe(before);
    expect(played()).toEqual(['ui_title_begin']);
  });
});

describe('sin red · un fallo de descarga no es para siempre', () => {
  it('lo que no llegó se vuelve a pedir pasado el plazo, y entonces suena', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    failing = true;
    const engine = createSoundEngine();
    engine.arm();
    await settle();
    engine.tap('ui_panel_open', now);
    await settle();
    expect(played()).toEqual([]);

    // Sin esperar el plazo no se pide en ráfaga.
    const asked = fetches.length;
    now += SOUND.TAP_MIN_GAP_MS;
    engine.tap('ui_panel_open', now);
    await settle();
    expect(fetches.length).toBe(asked);

    // Vuelve la red y pasa el plazo: suena.
    failing = false;
    now += SOUND.FETCH_RETRY_MS;
    engine.tap('ui_panel_open', now);
    await settle();
    expect(played()).toEqual(['ui_panel_open']);
  });
});
