// U-09 · El sonido del valle. design.md §11.1, §11.4, §11.6; CLAUDE.md.
//
// El proyecto no tenía ni una línea de audio, y la restricción que abre el
// área es dura: **nada de ficheros**. La demo publicable se abre sin servidor
// detrás (`tools/graphics/bundle-game.ts` la empotra entera) y unos cuantos
// WAV la doblarían de peso. Todo lo de aquí se sintetiza con Web Audio —
// osciladores, ruido filtrado, envolventes— y pesa cero bytes en el fichero:
// un río es ruido rosa filtrado, un yunque es un golpe con un poco de campana
// encima, el viento es ruido con un filtro que se mueve despacio.
//
// Dos capas, igual que pide el encargo:
//
//   **Ambiente.** Continua y baja: el viento (cambia con la estación), el río
//   (si el mapa lo tiene, y siempre lo tiene) y, sólo si la aldea los ha
//   levantado, el yunque de la fragua encendida y la campana de la capilla o
//   la iglesia. `ambientFor` decide qué capas suenan; `SoundEngine.update`
//   las cruza con una rampa, nunca con un corte.
//
//   **Acentos.** Un apunte corto cuando pasa algo que importa: un hito
//   (`milestones.ts`) o una encrucijada que se plantea. Raro a propósito —
//   `accentFor` no conoce el aviso corriente de `notice.ts`, que pasa demasiado
//   a menudo para significar algo si sonara cada vez.
//
// **La parte pura no toca el navegador.** `ambientFor` y `accentFor` son
// funciones de estado a valor, igual que `noticeworthy` en `notice.ts`, y se
// prueban sin arrancar nada. Lo que sí necesita el navegador —crear el
// `AudioContext`, encadenar nodos— vive detrás de `createSoundEngine` y no se
// ejercita en `tests/fast/`.
//
// **Silencio hasta que alguien toca.** Los navegadores no dejan arrancar audio
// sin un gesto, así que `SoundEngine.arm()` es lo único que crea o reanuda el
// `AudioContext`, y sólo `src/ui/app.ts` lo llama, desde el primer
// `pointerdown` de la raíz. Nada de aquí lo crea antes.
//
// **§11.4, el caso duro.** Un salto de velocidad o el letargo de §13.2 pueden
// llamar al disparador del acento varias veces antes de que haya sonado nada
// — el mismo problema que ya resolvió `notice.ts` con `catchingUp` para el
// aviso. `accentFor` toma `catchingUp` como el suyo; y como una tanda de
// varios ticks corre en el mismo fotograma, con el mismo instante de reloj de
// pared, `accentAllowed` es el fusible: nunca dos acentos más cerca que
// `SOUND.ACCENT_MIN_GAP_MS`, el mismo tipo de guardián de reloj de pared que
// `NOTICE_MS`/`MOMENT_MS` ya usan para cortarse en seco en vez de a medias.

import { SOUND } from '@engine/balance';
import { count, standing } from '@engine/subsistence/building-counts';
import { TERRAIN_CODE } from '@engine/state';
import type { GameState, ValleyMap } from '@engine/state';
import { seasonOf } from '@engine/time';

// ---------------------------------------------------------------------------
// La parte pura. Sin `AudioContext`, sin `Math.random` salvo donde se marca
// —el mismo permiso que `moment.ts` se da para sus motas: decorado del
// navegador, no una tirada de la partida (§4.3)— y probable sin navegador.
// ---------------------------------------------------------------------------

export interface AmbientMix {
  /** Ganancia del lecho de viento, 0..1, ya resuelta por estación. */
  readonly wind: number;
  /** Si el mapa tiene agua que sonar. Prácticamente siempre. */
  readonly river: boolean;
  /** Una fragua en pie y encendida (`Building.lit`). */
  readonly forge: boolean;
  /** Una capilla o una iglesia en pie. */
  readonly bell: boolean;
}

// El río no cambia una vez fundado el valle: el terreno es fijo. Cachear por
// la propia matriz evita recorrer 36×56 celdas en cada pintado sin que
// `ambientFor` deje de ser una función de `state` a valor.
const riverByTerrain = new WeakMap<Uint8Array, boolean>();

function hasRiver(map: ValleyMap): boolean {
  const cached = riverByTerrain.get(map.terrain);
  if (cached !== undefined) return cached;
  let found = false;
  for (let i = 0; i < map.terrain.length; i += 1) {
    if (map.terrain[i] === TERRAIN_CODE.water) { found = true; break; }
  }
  riverByTerrain.set(map.terrain, found);
  return found;
}

/** Qué ambiente corresponde a un estado dado. Nunca un suceso, siempre una condición. */
export function ambientFor(state: GameState): AmbientMix {
  return {
    wind: SOUND.WIND_BY_SEASON[seasonOf(state.tick)],
    river: hasRiver(state.map),
    forge: standing(state, 'smithy').some((b) => b.lit),
    bell: count(state, 'chapel') > 0 || count(state, 'church') > 0,
  };
}

export type AccentKind = 'milestone' | 'crossroad' | 'thunder';

/**
 * Qué acento dispara un tick, si alguno. `milestoneFired` es si
 * `milestonesAt` tuvo algo que celebrar este tick (`app.ts` ya lo calcula
 * para la cartela de `moment.ts`; esto no repite esa consulta) y `posed` es
 * el `TickReport.posed` del propio tick.
 *
 * El hito gana a la encrucijada si coinciden — la misma prioridad que
 * `app.ts` ya aplica entre la cartela y el aviso ("una voz cada vez") — y
 * durante un letargo no suena nada, exactamente la regla que `notice.ts`
 * cumple con `catchingUp`.
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

/**
 * El fusible de reloj de pared (§11.4): si el instante actual está a menos de
 * `SOUND.ACCENT_MIN_GAP_MS` del último acento que sonó de verdad, este no
 * suena. Es lo que impide que una tanda de varios ticks en el mismo
 * fotograma —un salto de velocidad, un lote del letargo— apile un acento
 * sobre otro: `nowMs` no avanza dentro de esa tanda, así que sólo el primero
 * de ellos pasa el fusible.
 */
export function accentAllowed(nowMs: number, lastPlayedMs: number | null): boolean {
  return lastPlayedMs === null || nowMs - lastPlayedMs >= SOUND.ACCENT_MIN_GAP_MS;
}

// ---------------------------------------------------------------------------
// La síntesis. Todo lo de aquí abajo toca el navegador y no se prueba en
// `tests/fast/`: lo comprueba `tools/graphics/sound-check.mjs`, que abre la
// página de verdad y mira el propio `AudioContext`.
// ---------------------------------------------------------------------------

/** Ruido en un `AudioBuffer`, blanco o rosado (filtro económico de Paul Kellet). */
function noiseBuffer(ctx: AudioContext, seconds: number, pink: boolean): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (!pink) {
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.0990460;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
  }
  return buffer;
}

function loopingNoise(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start();
  return source;
}

/** Sube o baja una ganancia con una rampa, o al instante si `fadeSeconds <= 0`. */
function rampGain(ctx: AudioContext, param: AudioParam, target: number, fadeSeconds: number): void {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  if (fadeSeconds <= 0) param.setValueAtTime(target, now);
  else param.linearRampToValueAtTime(target, now + fadeSeconds);
}

interface Layer {
  readonly gain: GainNode;
  setTarget(target: number, fadeSeconds: number): void;
}

function makeLayer(ctx: AudioContext, dest: AudioNode, source: AudioNode): Layer {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(dest);
  return { gain, setTarget: (target, fade) => rampGain(ctx, gain.gain, target, fade) };
}

/** El viento: ruido blanco tras un filtro cuyo corte deriva despacio (un LFO inaudible por sí mismo). */
function createWind(ctx: AudioContext, dest: AudioNode): Layer {
  const source = loopingNoise(ctx, noiseBuffer(ctx, 4, false));
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 650;
  filter.Q.value = 0.25;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 200;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();
  source.connect(filter);
  return makeLayer(ctx, dest, filter);
}

/** El río: ruido rosa tras un filtro fijo, más grave y más opaco que el viento. */
function createRiver(ctx: AudioContext, dest: AudioNode): Layer {
  const source = loopingNoise(ctx, noiseBuffer(ctx, 4, true));
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  source.connect(filter);
  return makeLayer(ctx, dest, filter);
}

/** Un tono con su propia envolvente, en un instante dado relativo a ahora. */
function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  type: OscillatorType,
  startAt: number,
  attack: number,
  decay: number,
  gain: number,
): void {
  const start = ctx.currentTime + startAt;
  const end = start + attack + decay;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.001, end);
  env.connect(dest);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(env);
  osc.start(start);
  osc.stop(end + 0.05);
}

/** Un golpe de ruido corto, para el filo metálico del yunque. */
function noiseHit(ctx: AudioContext, dest: AudioNode, buffer: AudioBuffer, gain: number): void {
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + 0.002);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  source.connect(filter).connect(env).connect(dest);
  source.start(now);
  source.stop(now + 0.15);
}

/** El yunque: un golpe de ruido y dos parciales metálicos e inarmónicos encima. */
function playForgeHit(ctx: AudioContext, dest: AudioNode, clickBuffer: AudioBuffer): void {
  noiseHit(ctx, dest, clickBuffer, SOUND.FORGE_GAIN * 0.6);
  tone(ctx, dest, 520, 'triangle', 0, 0.002, 0.22, SOUND.FORGE_GAIN);
  tone(ctx, dest, 1230, 'triangle', 0, 0.002, 0.16, SOUND.FORGE_GAIN * 0.5);
}

/** La campana: dos parciales inarmónicos, larga cola — es una campana y no un timbre. */
function playBellToll(ctx: AudioContext, dest: AudioNode): void {
  tone(ctx, dest, 523.25, 'sine', 0, 0.01, 2.2, SOUND.BELL_GAIN);
  tone(ctx, dest, 784, 'sine', 0, 0.01, 1.6, SOUND.BELL_GAIN * 0.55);
}

/**
 * El acento (§11.6, §11.8's «raro»). El hito lleva un arpegio de tres notas
 * ascendentes — algo que celebrar, algo que pasa una vez, como su propia
 * cartela de `moment.ts` — y la encrucijada un apunte de dos notas, más
 * discreto que el hito porque es más frecuente que él.
 */
function playAccent(ctx: AudioContext, dest: AudioNode, kind: AccentKind): void {
  const total = SOUND.ACCENT_DURATION_S;
  if (kind === 'thunder') {
    // U-13 · un trueno: ruido rosa por un paso bajo que se va cerrando, con
    // caída larga. Ni un fichero de audio, como todo lo demás de U-09.
    const now = ctx.currentTime;
    const seconds = SOUND.THUNDER_DURATION_S;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx, seconds, true);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + seconds);
    filter.Q.value = 0.7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    // El golpe primero y el retumbe después: sin la rampa de subida se oye
    // como un clic, y un trueno no empieza de golpe ni acaba de golpe.
    env.gain.linearRampToValueAtTime(SOUND.THUNDER_GAIN, now + 0.06);
    env.gain.exponentialRampToValueAtTime(SOUND.THUNDER_GAIN * 0.35, now + seconds * 0.35);
    env.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    source.connect(filter).connect(env).connect(dest);
    source.start(now);
    source.stop(now + seconds + 0.1);
    return;
  }
  if (kind === 'milestone') {
    const step = total * 0.16;
    const decay = total * 0.6;
    [523.25, 659.25, 987.77].forEach((freq, i) => {
      tone(ctx, dest, freq, 'triangle', i * step, 0.008, decay, SOUND.ACCENT_GAIN * (1 - i * 0.12));
    });
  } else {
    tone(ctx, dest, 659.25, 'sine', 0, 0.01, total * 0.55, SOUND.ACCENT_GAIN * 0.85);
    tone(ctx, dest, 987.77, 'sine', 0.02, 0.01, total * 0.45, SOUND.ACCENT_GAIN * 0.5);
  }
}

/** Programa golpes espaciados al azar dentro de un intervalo, mientras esté activo. */
interface Scheduler {
  setActive(active: boolean): void;
  stop(): void;
}

function createScheduler(play: () => void, intervalS: readonly [number, number]): Scheduler {
  const [min, max] = intervalS;
  let active = false;
  let timer = 0;
  const next = (): void => {
    // Decorado del navegador, no la partida (§4.3): cuándo cae exactamente el
    // siguiente golpe no reproduce nada, así que `Math.random` no rompe nada.
    const delayMs = (min + Math.random() * (max - min)) * 1000;
    timer = window.setTimeout(() => {
      if (!active) return;
      play();
      next();
    }, delayMs);
  };
  return {
    setActive(value): void {
      if (value === active) return;
      active = value;
      if (active) next();
      else window.clearTimeout(timer);
    },
    stop(): void {
      active = false;
      window.clearTimeout(timer);
    },
  };
}

// Se expone sólo para que `tools/graphics/sound-check.mjs` pueda leer, desde
// fuera, que el contexto existe, está corriendo y su reloj avanza — la
// comprobación que reemplaza a "escucharlo" (ver el brief de U-09). El mismo
// tipo de gancho de observación que ya usan `data-app-ready` y `data-tick`.
declare global {
  interface Window {
    __valleySound?: {
      context: AudioContext;
      masterGain: AudioParam;
      windGain: AudioParam;
      riverGain: AudioParam;
    };
  }
}

export interface SoundEngine {
  readonly enabled: boolean;
  /** El botón junto a la regleta de velocidad. Persiste en `localStorage`. */
  setEnabled(on: boolean): void;
  /** Sólo esto crea o reanuda el `AudioContext` — llamado desde el primer toque. */
  arm(): void;
  /** El ambiente que corresponde al estado, cruzado con el que sonaba. */
  update(mix: AmbientMix): void;
  /** Un acento, si el fusible de §11.4 lo deja pasar. */
  accent(kind: AccentKind, nowMs: number): void;
}

const STORAGE_KEY = 'valley.sound';

/** La preferencia guardada. U-10 la enseña en el menú de inicio, antes de que exista el motor. */
export function soundPreference(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

export function setSoundPreference(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch { /* modo privado, o similar: no hay nada que hacer */ }
}

export function createSoundEngine(): SoundEngine {
  let enabled = soundPreference();
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let wind: Layer | null = null;
  let river: Layer | null = null;
  let forgeClick: AudioBuffer | null = null;
  let forgeScheduler: Scheduler | null = null;
  let bellScheduler: Scheduler | null = null;
  let lastMix: AmbientMix | null = null;
  let lastAccentAtMs: number | null = null;

  const applyMix = (mix: AmbientMix, immediate: boolean): void => {
    const fade = immediate ? 0 : SOUND.AMBIENT_FADE_S;
    wind?.setTarget(mix.wind, fade);
    river?.setTarget(mix.river ? SOUND.RIVER_GAIN : 0, fade);
    forgeScheduler?.setActive(mix.forge);
    bellScheduler?.setActive(mix.bell);
  };

  const boot = (): void => {
    if (ctx !== null) return;
    const context = new AudioContext();
    const masterGain = context.createGain();
    masterGain.gain.value = enabled ? 1 : 0;
    masterGain.connect(context.destination);
    ctx = context;
    master = masterGain;
    wind = createWind(context, masterGain);
    river = createRiver(context, masterGain);
    forgeClick = noiseBuffer(context, 0.12, false);
    forgeScheduler = createScheduler(
      () => { if (forgeClick !== null) playForgeHit(context, masterGain, forgeClick); },
      SOUND.FORGE_INTERVAL_S,
    );
    bellScheduler = createScheduler(() => playBellToll(context, masterGain), SOUND.BELL_INTERVAL_S);
    window.__valleySound = {
      context,
      masterGain: masterGain.gain,
      windGain: wind.gain.gain,
      riverGain: river.gain.gain,
    };
    if (lastMix !== null) applyMix(lastMix, true);
  };

  return {
    get enabled(): boolean { return enabled; },
    setEnabled(on: boolean): void {
      enabled = on;
      setSoundPreference(on);
      // Encender es también un gesto del usuario — el propio toque del botón
      // —, así que puede ser la primera vez que se arranca el contexto.
      if (on) boot();
      if (ctx !== null && master !== null) rampGain(ctx, master.gain, on ? 1 : 0, 0.15);
    },
    arm(): void {
      if (!enabled) return;
      if (ctx === null) { boot(); return; }
      if (ctx.state === 'suspended') void ctx.resume();
    },
    update(mix: AmbientMix): void {
      lastMix = mix;
      if (ctx === null) return;
      applyMix(mix, false);
    },
    accent(kind: AccentKind, nowMs: number): void {
      if (!enabled || ctx === null || master === null) return;
      if (!accentAllowed(nowMs, lastAccentAtMs)) return;
      lastAccentAtMs = nowMs;
      playAccent(ctx, master, kind);
    },
  };
}
