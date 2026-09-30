// El sonido de la interfaz: **ficheros fabricados fuera del juego, y un solo
// reproductor.**
//
// Historia corta, porque explica la forma. Hasta el 24 sep 2026 aquí vivía la
// síntesis en vivo de U-09 —viento, río, yunque, campana y los acentos, con
// osciladores y ruido de Web Audio—. Vera la oyó y la cortó: «el audio ese es
// malísimo, el de fondo es hasta incómodo». Se borró y quedó el hueco. El 29 sep
// eligió que los ficheros los fabrique Claude y que suene la interfaz entera
// —portada, navegación, reloj, decisiones, medios, ofertas e hitos—, con un
// botón de silencio en el valle y en la portada, y sonando por omisión.
//
// Lo que hay:
//
//   · **Los momentos** (`Cue`) con su fichero (`CUE_FILES`, en
//     `public/audio/`). Los fabrica `tools/ui/sounds.py`, que es donde se
//     cambia cómo suena algo; aquí sólo se decide **cuándo**. Sustituir uno es
//     soltar otro fichero con el mismo nombre y volver a sellar.
//   · **Los lechos de ambiente** (`LOOP_FILES`, fase 1 de
//     `docs/plan-audio-mundo.md`): bucles que cruzan su volumen en vez de
//     encenderse. Cuánto suena cada uno lo decide `ambience.ts`, que es puro;
//     aquí se reproducen, y **un lecho callado un rato se suelta**
//     (`SOUND.AMBIENCE_RELEASE_SECONDS`): antes se quedaban todos girando a
//     volumen cero con sus megas decodificados dentro.
//   · **El cielo** (`sky`): el latigazo y el trueno, con su propio fusible
//     por sonido. Iban por el de los acentos y el trueno cercano, que llega a
//     menos de un segundo de su latigazo, no sonaba nunca.
//   · **Los sucesos del mundo** (`moment`): caza y asedio, con su distancia
//     (`moments.ts`).
//   · **Cuándo suena un acento del juego** (`accentFor`, `accentAllowed`):
//     puro y con sus pruebas. Un hito o una encrucijada planteada; nunca
//     durante un letargo y nunca dos más cerca que `SOUND.ACCENT_MIN_GAP_MS`
//     (§11.4). El hito gana, y su peso y su clase eligen cuál (`milestoneCue`).
//   · **Los toques del jugador** (`tap`), que no pasan por ese fusible —quien
//     toca un botón espera oírlo aunque acabe de sonar un hito— pero sí por uno
//     propio y corto por sonido (`SOUND.TAP_MIN_GAP_MS`).
//   · **El reproductor** (`sound`), uno para toda la página porque la portada
//     suena antes de que exista el valle. Web Audio y no `<audio>`: en iPhone un
//     `<audio>` tarda en arrancar lo bastante para que el toque y su sonido se
//     separen. Sólo se arma con el primer toque —los navegadores no dejan sonar
//     antes—, y los ficheros se piden antes, en cuanto se instala, para que el
//     primer botón ya los tenga. **Con el sonido apagado no se paga nada**: ni
//     se descarga, ni se crea el contexto, ni se decodifica; lo que hubiera se
//     suelta al apagar. Los ficheros también los precachea el service worker
//     (`public/audio/manifest.json`), para que sin red el juego no calle.
//   · **La preferencia** (`valley.sound` en `localStorage`), la misma clave que
//     usaba U-09: quien lo silenció entonces sigue en silencio.

import { SOUND } from '@engine/balance';
import type { TickReport } from '@engine/sim';
import type { AmbienceLayer, Mix } from './ambience';
import { AMBIENCE_LAYERS } from './ambience';
import type { Milestone } from './milestones';

/** Cada momento que suena. Los nombres son los de `docs/plan-audio.md` §4. */
export type Cue =
  // El botón corriente, el que no tiene voz propia (§`OWN_VOICE`).
  | 'ui_button_press'
  | 'ui_button_release'
  | 'ui_title_begin'
  | 'ui_title_continue'
  | 'ui_panel_open'
  | 'ui_panel_close'
  | 'ui_tab_change'
  | 'ui_person_select'
  | 'ui_pause'
  | 'ui_resume'
  | 'ui_speed_change'
  | 'ui_action_success'
  | 'ui_action_refused'
  | 'ui_offer_arrives'
  | 'ui_offer_accept'
  | 'ui_offer_decline'
  | 'ui_crossroad_opens'
  | 'ui_crossroad_decide'
  | 'stinger_milestone_minor'
  | 'stinger_milestone_major'
  | 'stinger_decade'
  | 'stinger_century'
  // El cielo (U-13, §10.7). No son de la interfaz: los dispara la tormenta, y
  // cuál de los tres truenos suena lo decide la distancia (`ambience.ts`).
  | 'weather_lightning_crack'
  | 'weather_thunder_near'
  | 'weather_thunder_mid'
  | 'weather_thunder_far'
  // La caza y el asedio (fase 5): los dispara `moments.ts`, con su distancia.
  | 'combat_arrow_loose'
  | 'combat_arrow_hit'
  | 'combat_arrow_miss'
  | 'combat_melee'
  | 'combat_fall'
  | 'combat_gate_hit'
  | 'combat_gate_break';

/**
 * Qué fichero suena en cada momento, relativo a la página
 * (`public/audio/<fichero>`). Uno que falte aquí no suena y no falla nada.
 *
 * **Con su huella** (`?v=`, el `sha256` del fichero): el service worker sirve
 * de la caché primero (§13.4), y un sonido cambiado con el mismo nombre no
 * llegaría nunca a un teléfono que ya tenía el viejo. La escribe
 * `tools/ui/sounds.py` y la vigila `tests/fast/sound.test.ts`.
 */
export const CUE_FILES: Readonly<Partial<Record<Cue, string>>> = {
  ui_button_press: 'ui_button_press.mp3?v=b9625e27',
  ui_button_release: 'ui_button_release.mp3?v=b5c781c5',
  ui_title_begin: 'ui_title_begin.mp3?v=e19bbc1d',
  ui_title_continue: 'ui_title_continue.mp3?v=0ea9ea9d',
  ui_panel_open: 'ui_panel_open.mp3?v=73234a2e',
  ui_panel_close: 'ui_panel_close.mp3?v=4c410ef4',
  ui_tab_change: 'ui_tab_change.mp3?v=e65c5761',
  ui_person_select: 'ui_person_select.mp3?v=6bff5b56',
  ui_pause: 'ui_pause.mp3?v=e3f6d278',
  ui_resume: 'ui_resume.mp3?v=6418449a',
  ui_speed_change: 'ui_speed_change.mp3?v=95ffea85',
  ui_action_success: 'ui_action_success.mp3?v=0dfec421',
  ui_action_refused: 'ui_action_refused.mp3?v=9d84e77a',
  ui_offer_arrives: 'ui_offer_arrives.mp3?v=858c701d',
  ui_offer_accept: 'ui_offer_accept.mp3?v=3862b1cc',
  ui_offer_decline: 'ui_offer_decline.mp3?v=e4b7d504',
  ui_crossroad_opens: 'ui_crossroad_opens.mp3?v=3995942f',
  ui_crossroad_decide: 'ui_crossroad_decide.mp3?v=3b1e5d9c',
  stinger_milestone_minor: 'stinger_milestone_minor.mp3?v=e11d35ae',
  stinger_milestone_major: 'stinger_milestone_major.mp3?v=e1d5fe69',
  stinger_decade: 'stinger_decade.mp3?v=acf9fb5d',
  stinger_century: 'stinger_century.mp3?v=396e17e2',
  weather_lightning_crack: 'weather_lightning_crack.mp3?v=35d201b9',
  weather_thunder_near: 'weather_thunder_near.mp3?v=9f478873',
  weather_thunder_mid: 'weather_thunder_mid.mp3?v=017d246e',
  weather_thunder_far: 'weather_thunder_far.mp3?v=2d10980b',
  combat_arrow_loose: 'combat_arrow_loose.mp3?v=48031948',
  combat_arrow_hit: 'combat_arrow_hit.mp3?v=f846e59b',
  combat_arrow_miss: 'combat_arrow_miss.mp3?v=680c4b09',
  combat_melee: 'combat_melee.mp3?v=bce5b662',
  combat_fall: 'combat_fall.mp3?v=ea836f82',
  combat_gate_hit: 'combat_gate_hit.mp3?v=4566a021',
  combat_gate_break: 'combat_gate_break.mp3?v=d594b2ca',
};

/**
 * Qué suena por un hito. La vuelta de la década y la del siglo tienen su
 * marca propia —el tiempo que pasa no es lo mismo que una obra—, y el resto va
 * por peso: el 3 es lo que cambia la aldea (la primera capilla, la primera
 * fragua) y el 2 todo lo demás.
 */
export function milestoneCue(milestone: Pick<Milestone, 'kind' | 'weight'>): Cue {
  if (milestone.kind === 'turn_of_decade') return milestone.weight === 3 ? 'stinger_century' : 'stinger_decade';
  return milestone.weight === 3 ? 'stinger_milestone_major' : 'stinger_milestone_minor';
}

/**
 * Qué acento dispara un tick, si alguno. El hito gana a la encrucijada si
 * coinciden —«una voz cada vez», la misma prioridad que la cartela sobre el
 * aviso— y durante un letargo no suena nada.
 */
export function accentFor(
  posed: string | null,
  milestone: Pick<Milestone, 'kind' | 'weight'> | null,
  catchingUp: boolean,
): Cue | null {
  if (catchingUp) return null;
  if (milestone !== null) return milestoneCue(milestone);
  if (posed !== null) return 'ui_crossroad_opens';
  return null;
}

/** El fusible de reloj de pared (§11.4): nunca dos acentos más cerca que el mínimo. */
export function accentAllowed(nowMs: number, lastPlayedMs: number | null): boolean {
  return lastPlayedMs === null || nowMs - lastPlayedMs >= SOUND.ACCENT_MIN_GAP_MS;
}

/**
 * Qué hacer con el `AudioContext` según se vea o no la página. **Pura**, para
 * poder probarla sin navegador.
 *
 * Ocultar la pestaña ya apagaba el ambiente por ganancia (`ambienceAllowed`),
 * pero el contexto seguía corriendo: once bucles decodificados girando a
 * volumen cero, gastando batería para nada. Con la página oculta se suspende;
 * al volver se reanuda. `interrupted` es el estado con el que iOS deja un
 * contexto tras una llamada o un cambio de aplicación, y también se reanuda.
 */
export function contextAction(state: string, hidden: boolean): 'suspend' | 'resume' | null {
  if (hidden) return state === 'running' ? 'suspend' : null;
  return state === 'suspended' || state === 'interrupted' ? 'resume' : null;
}

/**
 * El fusible de un suceso del mundo: el mismo golpe no se apila sobre sí mismo
 * dentro de `SOUND.MOMENT_MIN_GAP_MS`, y uno que no llega a `MOMENT_MIN_GAIN`
 * no se programa. Una salva de siete arcos en el mismo fotograma suena como
 * una y no como una ametralladora.
 */
export function momentAllowed(nowMs: number, lastPlayedMs: number | undefined, gain: number): boolean {
  if (gain < SOUND.MOMENT_MIN_GAIN) return false;
  return lastPlayedMs === undefined || nowMs - lastPlayedMs >= SOUND.MOMENT_MIN_GAP_MS;
}

/** El fusible de un toque: el mismo sonido no se apila sobre sí mismo. */
export function tapAllowed(nowMs: number, lastPlayedMs: number | undefined): boolean {
  return lastPlayedMs === undefined || nowMs - lastPlayedMs >= SOUND.TAP_MIN_GAP_MS;
}

/**
 * Qué suena al pasar de una ruta a otra: abrir una hoja, cerrarla, cambiar de
 * pestaña o nada. Una ficha es una persona, venga de la lista, del valle o de
 * un nombre en la crónica: su toque es el de la tarjeta de retrato, no el de
 * una hoja. De una hoja a otra es cambiar de pestaña, casi en silencio.
 */
export function routeCue(from: string, to: string): Cue | null {
  if (to === 'inspect') return 'ui_person_select';
  if (from === to) return null;
  if (to === 'valley') return 'ui_panel_close';
  if (from === 'valley') return 'ui_panel_open';
  return 'ui_tab_change';
}

/**
 * La respuesta del valle a lo que hizo el jugador esta semana, si hizo algo.
 * Un medio o una corona dados suenan a confirmación y uno que no se pudo, a
 * negativa educada; una oferta tiene su propio trato —aceptarla, dejarla
 * pasar— y una aceptada sin con qué pagar es la misma negativa que un medio.
 * Si coinciden varios en la misma semana, suena el primero: una voz cada vez.
 */
export function playerAnswer(report: Pick<TickReport, 'means' | 'crown' | 'offer'>): Cue | null {
  if (report.means !== null) return report.means.given ? 'ui_action_success' : 'ui_action_refused';
  if (report.crown !== null) return report.crown.crowned ? 'ui_action_success' : 'ui_action_refused';
  if (report.offer !== null) {
    if (report.offer.refused) return 'ui_action_refused';
    return report.offer.accepted ? 'ui_offer_accept' : 'ui_offer_decline';
  }
  return null;
}

/** Qué suena al cambiar de velocidad, y a qué altura. */
export function speedCue(from: number, to: number): { cue: Cue; rate: number } | null {
  if (from === to) return null;
  if (to === 0) return { cue: 'ui_pause', rate: 1 };
  if (from === 0) return { cue: 'ui_resume', rate: 1 };
  const rates: Readonly<Record<number, number>> = SOUND.SPEED_RATES;
  return { cue: 'ui_speed_change', rate: rates[to] ?? 1 };
}

const STORAGE_KEY = 'valley.sound';

/** Suena salvo que quien juega lo haya apagado: por omisión, encendido. */
export function soundPreference(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

function storeSoundPreference(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch { /* modo privado: no se puede guardar */ }
}

/**
 * **Los lechos de ambiente**, que no son cues: son bucles que van a estar
 * sonando minutos y cuyo volumen se cruza en vez de encenderse.
 *
 * El fichero lleva su huella, como los demás. Y lleva además **su duración
 * exacta en segundos**, que es lo que evita el único fallo que un bucle en MP3
 * puede tener y nadie que programa esto podría oír: el codificador añade unas
 * milésimas de silencio al final, y un silencio de tres milésimas cada doce
 * segundos es un latido. Con `loopEnd` puesto a esta duración, ese relleno no
 * se reproduce nunca. Lo escribe `tools/ui/sounds.py`.
 */
export const LOOP_FILES: Readonly<Record<AmbienceLayer, { file: string; seconds: number }>> = {
  amb_wind_calm: { file: 'amb_wind_calm.mp3?v=dee93647', seconds: 12 },
  amb_wind_gust: { file: 'amb_wind_gust.mp3?v=14acdeb9', seconds: 12 },
  amb_wind_winter: { file: 'amb_wind_winter.mp3?v=93d2d039', seconds: 12 },
  amb_rain_light: { file: 'amb_rain_light.mp3?v=05cb21d3', seconds: 10 },
  amb_rain_heavy: { file: 'amb_rain_heavy.mp3?v=43379d6b', seconds: 10 },
  amb_storm_bed: { file: 'amb_storm_bed.mp3?v=9fde8a19', seconds: 12 },
  amb_snow_hush: { file: 'amb_snow_hush.mp3?v=c23fe5a5', seconds: 12 },
  amb_river: { file: 'amb_river.mp3?v=dbc2b61a', seconds: 12 },
  amb_waterfall: { file: 'amb_waterfall.mp3?v=22323461', seconds: 10 },
  amb_fire_flame: { file: 'amb_fire_flame.mp3?v=b36efd39', seconds: 8 },
  amb_birds_day: { file: 'amb_birds_day.mp3?v=96e5469b', seconds: 14 },
  amb_night_summer: { file: 'amb_night_summer.mp3?v=41d4fedf', seconds: 12 },
  amb_night_cold: { file: 'amb_night_cold.mp3?v=0e5a8c06', seconds: 14 },
  amb_fire_embers: { file: 'amb_fire_embers.mp3?v=ea930d6b', seconds: 10 },
};

/** Lo que se ha oído, para que una herramienta de fuera lo compruebe. */
export interface SoundLog {
  readonly played: { cue: Cue; atMs: number; rate: number }[];
  /** La mezcla de ambiente que se está pidiendo, para verla desde fuera. */
  mix?: Mix;
}

declare global {
  interface Window {
    /** Los últimos sonidos que de verdad empezaron a sonar (`sound.ts`). */
    __valleySound?: SoundLog;
    webkitAudioContext?: typeof AudioContext;
  }
}

export interface SoundEngine {
  readonly enabled: boolean;
  /** El botón de silencio: se guarda, y apaga lo que esté sonando. */
  setEnabled(on: boolean): void;
  /** Pide los ficheros; no hace falta haber tocado nada. */
  prefetch(): void;
  /** El primer toque: a partir de aquí el navegador deja sonar. */
  arm(): void;
  /** La página se oculta o se vuelve a ver: el contexto se suspende o se reanuda. */
  visibility(hidden: boolean): void;
  /** Un acento del juego: pasa por el fusible de §11.4. */
  accent(cue: Cue, nowMs: number): void;
  /**
   * El cielo: el latigazo del rayo y su trueno. **No pasa por el fusible de
   * los acentos**, que es de la interfaz: el trueno cercano llega a menos de
   * un segundo de su latigazo y ese fusible lo tiraba siempre (revisión del
   * 30 sep 2026). Sólo el suyo por sonido, como un suceso.
   */
  sky(cue: Cue, nowMs: number): void;
  /** La respuesta a un toque del jugador. `rate` sube o baja el tono. */
  tap(cue: Cue, nowMs: number, rate?: number): void;
  /**
   * Un suceso del mundo (caza, asedio) con la cercanía de la cámara (0 a 1).
   * Pasa por `momentAllowed` y varía el tono un poco cada vez.
   */
  moment(cue: Cue, nowMs: number, gain: number): void;
  /**
   * El fondo del mundo: cada capa a su volumen, cruzando desde el que tenía.
   * Se llama en cada pintado con la mezcla entera; lo que no venga, se apaga.
   */
  ambience(mix: Mix, dtSeconds: number): void;
}

export function createSoundEngine(): SoundEngine {
  let enabled: boolean | null = null;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let lastAccentMs: number | null = null;
  const lastTapMs: Partial<Record<Cue, number>> = {};
  const lastMomentMs: Partial<Record<Cue, number>> = {};
  const lastSkyMs: Partial<Record<Cue, number>> = {};
  /**
   * Los ficheros tal como llegan, comprimidos: 0,9 MB entre todos. Se quedan,
   * porque son lo que deja volver a decodificar un lecho soltado sin red.
   */
  const bytes = new Map<string, Promise<ArrayBuffer | null>>();
  /** Lo decodificado, que es lo que pesa: un lecho son megas y se suelta. */
  const buffers = new Map<string, Promise<AudioBuffer | null>>();
  /** Cuándo falló por última vez cada fichero, para no pedirlo en ráfaga. */
  const failedAt = new Map<string, number>();
  /** Una capa viva: su bucle, su ganancia, a qué volumen va y cuánto lleva callada. */
  const loops = new Map<AmbienceLayer, {
    gain: GainNode; source: AudioBufferSourceNode | null; at: number; want: number; quiet: number;
  }>();

  const isEnabled = (): boolean => {
    if (enabled === null) enabled = soundPreference();
    return enabled;
  };

  const failedRecently = (key: string): boolean => {
    const at = failedAt.get(key);
    return at !== undefined && Date.now() - at < SOUND.FETCH_RETRY_MS;
  };

  /**
   * Pide los ficheros. No necesita el `AudioContext`, así que va antes del
   * toque; con el sonido apagado no pide nada. Uno que no llegó no se guarda
   * como perdido: se olvida, y se vuelve a pedir pasado `SOUND.FETCH_RETRY_MS`.
   */
  const prefetch = (): void => {
    if (typeof fetch !== 'function' || !isEnabled()) return;
    const all: [string, string][] = [
      ...(Object.entries(CUE_FILES) as [Cue, string][]),
      // Los lechos van detrás a propósito: pesan diez veces más que un toque y
      // lo primero que tiene que estar listo es el botón que se va a pulsar.
      ...AMBIENCE_LAYERS.map((layer) => [layer, LOOP_FILES[layer].file] as [string, string]),
    ];
    for (const [cue, file] of all) {
      if (bytes.has(cue) || failedRecently(cue)) continue;
      const pending: Promise<ArrayBuffer | null> = fetch(`./audio/${file}`)
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .catch(() => null)
        .then((data) => {
          if (data === null && bytes.get(cue) === pending) {
            bytes.delete(cue);
            failedAt.set(cue, Date.now());
          }
          return data;
        });
      bytes.set(cue, pending);
    }
  };

  const decoded = (cue: string): Promise<AudioBuffer | null> => {
    const known = buffers.get(cue);
    if (known !== undefined) return known;
    prefetch();
    const raw = bytes.get(cue);
    const context = ctx;
    const pending: Promise<AudioBuffer | null> = raw === undefined || context === null
      ? Promise.resolve(null)
      // `slice`: `decodeAudioData` se queda con el búfer, y así el original
      // sigue sirviendo si hay que volver a decodificar (un lecho soltado).
      : raw.then((data) => (data === null ? null : context.decodeAudioData(data.slice(0)).catch(() => null)));
    buffers.set(cue, pending);
    // Un `null` no se queda guardado: la próxima vez se vuelve a intentar.
    void pending.then((buffer) => { if (buffer === null && buffers.get(cue) === pending) buffers.delete(cue); });
    return pending;
  };

  /** Suelta un lecho: para su bucle, lo desengancha y tira lo decodificado. */
  const release = (layer: AmbienceLayer): void => {
    const live = loops.get(layer);
    if (live === undefined) return;
    loops.delete(layer);
    if (live.source !== null) {
      try { live.source.stop(); } catch { /* ya parado */ }
      live.source.disconnect();
    }
    live.gain.disconnect();
    buffers.delete(layer);
  };

  const start = (cue: Cue, rate: number, requestedMs: number, level = 1): void => {
    if (!isEnabled() || ctx === null || master === null) return;
    // Con la pestaña oculta no suena nada, y menos aún se reanuda el contexto:
    // un temporizador de trueno que vence de fondo soltaría todo de golpe al volver.
    if (typeof document !== 'undefined' && document.hidden) return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    const context = ctx;
    const out = master;
    void decoded(cue).then((buffer) => {
      if (buffer === null || !isEnabled()) return;
      // Un sonido que llega tarde a su toque se lee como un fallo, no como
      // una respuesta (`SOUND.LATE_PLAY_MS`).
      if (Date.now() - requestedMs > SOUND.LATE_PLAY_MS) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      if (level === 1) {
        source.connect(out);
      } else {
        const near = context.createGain();
        near.gain.value = level;
        source.connect(near);
        near.connect(out);
      }
      source.start();
      if (typeof window !== 'undefined') {
        const log = window.__valleySound ?? { played: [] };
        log.played.push({ cue, atMs: Date.now(), rate });
        if (log.played.length > 64) log.played.splice(0, log.played.length - 64);
        window.__valleySound = log;
      }
    });
  };

  const arm = (): void => {
    // **Apagado no se paga nada**: ni descarga, ni contexto, ni decodificar.
    // Encenderlo es un toque, y `setEnabled` vuelve a pasar por aquí dentro
    // de ese mismo gesto, que es lo que el navegador exige para sonar.
    if (!isEnabled()) return;
    prefetch();
    if (typeof window === 'undefined') return;
    if (ctx === null) {
      const Context = window.AudioContext ?? window.webkitAudioContext;
      if (Context === undefined) return;
      try { ctx = new Context(); } catch { return; }
      master = ctx.createGain();
      master.gain.value = SOUND.MASTER_GAIN;
      master.connect(ctx.destination);
    }
    // Todos los toques, decodificados ya: uno que se decodifica al tocarlo
    // llega tarde con el valle cargando y `LATE_PLAY_MS` lo tira. También al
    // encender por primera vez tras arrancar apagado; lo que ya está no se
    // repite (`decoded` guarda la promesa).
    for (const cue of Object.keys(CUE_FILES) as Cue[]) void decoded(cue);
    if (ctx.state === 'running') return;
    void ctx.resume().catch(() => undefined);
    // iOS sólo abre el audio si algo suena **dentro** del gesto: un búfer
    // vacío de una muestra basta.
    const silence = ctx.createBufferSource();
    silence.buffer = ctx.createBuffer(1, 1, 22_050);
    silence.connect(ctx.destination);
    silence.start();
  };

  return {
    get enabled(): boolean { return isEnabled(); },
    setEnabled(on: boolean): void {
      enabled = on;
      storeSoundPreference(on);
      if (master !== null && ctx !== null) master.gain.setValueAtTime(on ? SOUND.MASTER_GAIN : 0, ctx.currentTime);
      if (on) {
        // Explícito y no sólo por `arm`: si el `suspend` de apagarlo aún no ha
        // terminado, el contexto se lee «running» y se quedaría dormido.
        if (ctx !== null) void ctx.resume().catch(() => undefined);
        arm();
        return;
      }
      // Apagado: fuera los bucles, que son lo que pesa (30,7 MB los catorce a
      // 48 kHz), y el contexto dormido. Callar a ganancia cero los dejaba
      // girando con sus megas dentro. Los toques ya decodificados (4,2 MB
      // todos) se quedan: son lo que hace que encenderlo suene en el acto y no
      // llegue tarde. Quien arranca apagado no los paga nunca (`arm`).
      for (const layer of [...loops.keys()]) release(layer);
      if (ctx !== null && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
    },
    prefetch,
    visibility(hidden: boolean): void {
      if (ctx === null) return;
      // Apagado se queda dormido aunque la pestaña vuelva a verse.
      const action = contextAction(ctx.state, hidden || !isEnabled());
      if (action === 'suspend') void ctx.suspend().catch(() => undefined);
      else if (action === 'resume') void ctx.resume().catch(() => undefined);
    },
    arm,
    ambience(mix: Mix, dtSeconds: number): void {
      if (typeof window !== 'undefined') {
        const log = window.__valleySound ?? { played: [] };
        log.mix = mix;
        window.__valleySound = log;
      }
      if (ctx === null || master === null) return;
      const context = ctx;
      const out = master;
      // Un paso de cruce por fotograma, y **acotado**: si la pestaña estuvo
      // escondida medio minuto, `dtSeconds` llega enorme y sin el tope una
      // capa entraría de golpe, que es justo el corte que esto evita.
      const step = Math.min(dtSeconds, 0.25) * SOUND.AMBIENCE_EASE;
      for (const layer of AMBIENCE_LAYERS) {
        const want = isEnabled() ? (mix[layer] ?? 0) : 0;
        const live = loops.get(layer);
        if (live === undefined) {
          if (want <= 0 || failedRecently(layer)) continue;
          // Nace en silencio y sube sola: así una capa nueva nunca entra de golpe.
          const gain = context.createGain();
          gain.gain.value = 0;
          gain.connect(out);
          const born = { gain, source: null as AudioBufferSourceNode | null, at: 0, want, quiet: 0 };
          loops.set(layer, born);
          const { seconds } = LOOP_FILES[layer];
          void decoded(layer).then((buffer) => {
            if (loops.get(layer) !== born) return;
            if (buffer === null) {
              // No llegó: fuera la capa, y se vuelve a intentar pasado el plazo.
              failedAt.set(layer, Date.now());
              release(layer);
              return;
            }
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.loopStart = 0;
            // El relleno que el codificador añade al final no se reproduce:
            // por eso la duración viaja con el fichero (`LOOP_FILES`).
            source.loopEnd = Math.min(seconds, buffer.duration);
            source.connect(gain);
            // Cada capa empieza por un sitio distinto del bucle: dos partidas
            // con el mismo cielo no suenan sincronizadas.
            source.start(0, Math.random() * source.loopEnd);
            born.source = source;
          });
          continue;
        }
        live.want = want;
        const delta = live.want - live.at;
        live.at += Math.sign(delta) * Math.min(Math.abs(delta), step);
        live.gain.gain.setTargetAtTime(live.at, context.currentTime, 0.02);
        // **Un lecho callado un rato se suelta** (`SOUND.AMBIENCE_RELEASE_SECONDS`).
        // Antes se quedaba girando a ganancia cero con sus megas dentro, y al
        // cabo de una hora estaban todos los cielos vistos.
        live.quiet = live.at <= 0 && live.want <= 0 ? live.quiet + dtSeconds : 0;
        if (live.quiet >= SOUND.AMBIENCE_RELEASE_SECONDS) release(layer);
      }
    },
    accent(cue: Cue, nowMs: number): void {
      if (CUE_FILES[cue] === undefined || !accentAllowed(nowMs, lastAccentMs)) return;
      lastAccentMs = nowMs;
      start(cue, 1, Date.now());
    },
    sky(cue: Cue, nowMs: number): void {
      if (CUE_FILES[cue] === undefined || !momentAllowed(nowMs, lastSkyMs[cue], 1)) return;
      lastSkyMs[cue] = nowMs;
      start(cue, 1, Date.now());
    },
    tap(cue: Cue, nowMs: number, rate = 1): void {
      if (CUE_FILES[cue] === undefined || !tapAllowed(nowMs, lastTapMs[cue])) return;
      lastTapMs[cue] = nowMs;
      start(cue, rate, Date.now());
    },
    moment(cue: Cue, nowMs: number, gain: number): void {
      if (CUE_FILES[cue] === undefined || !momentAllowed(nowMs, lastMomentMs[cue], gain)) return;
      lastMomentMs[cue] = nowMs;
      const jitter = 1 + (Math.random() - 0.5) * SOUND.MOMENT_PITCH_JITTER;
      start(cue, jitter, Date.now(), Math.min(1, gain));
    },
  };
}

/** El reproductor de la página: la portada y el valle suenan por el mismo. */
export const sound: SoundEngine = createSoundEngine();

/**
 * **Los botones que ya tienen voz propia**, y que por tanto no llevan encima el
 * sello genérico: abrir una hoja suena a cofre, una velocidad a ficha de
 * piedra, una decisión a cera. Una lista en **un solo sitio** y no un atributo
 * repartido por siete ficheros, para que se vea de un vistazo quién suena por
 * su cuenta; `data-sfx="off"` queda como escape para un caso suelto.
 *
 * **Todo botón que navega por `actions.navigate` tiene voz propia**, porque
 * ahí suena `routeCue`: un cierre o una vuelta que se quede fuera suena dos o
 * tres veces —sello al bajar, sello al subir y cofre—. Pasaba con nueve el
 * 30 sep 2026; lo vigila el recorrido (`tools/ui/sound-check.mjs`, «una vez»).
 * Lo mismo los cierres de la portada, que suenan en su `onClose` (`title.ts`).
 *
 * Lo que **no** está aquí y es deliberado: el badge de la velocidad (sólo
 * despliega la regleta), el botón de despejar, la señal de caza, el dado de la
 * semilla, el taller, los mandos del carro y del tablón que no cierran, los de
 * las opciones gráficas y el cierre de la crónica del epitafio (no pasa por
 * `routeCue`). Ésos son botones corrientes y suenan a sello.
 */
const OWN_VOICE = [
  '.skin-nav-tab',                                        // las pestañas · routeCue
  '.valley-speeds button',                                // la regleta · speedCue
  '.hud-speed-cluster .hud-round-btn:not(.valley-speed-badge)', // parar y seguir · speedCue
  '.valley-sound, .title-sound',                          // el silencio · se oye al encenderlo
  '.title-new, .title-continue, .title-preset',           // fundar y continuar
  '.title-annals, .title-graphics',                       // abren hoja
  '.annals-close, .graphics-done',                        // y la cierran · su onClose
  '.crossroad-options button',                            // el sello de la decisión
  '.valley-voice-answer',                                 // aceptar o dejar pasar un trato
  '.people-row, .chronicle-name-link',                    // abren una ficha · routeCue
  '.valley-orders-now',                                   // abre y cierra el carro · routeCue
  // Cierran la hoja · routeCue. El de la bandeja es el que se toca en la
  // crónica, el carro, la gente y la ficha; el propio de la crónica y el del
  // carro están ocultos dentro de ella (`wood.css`), y se quedan por si vuelven.
  '.ui-shell-content-close, .valley-board-close, .cart-close',
  '.ui-shell-content .chronicle-close, .chronicle-sealed', // la crónica del valle · routeCue
  '.valley-panel-back',                                   // de la ficha a la gente · routeCue
  '[data-sfx="off"]',                                     // el escape puntual
].join(', ');

/**
 * El botón corriente bajo un toque, si lo hay: uno de verdad, habilitado y sin
 * voz propia. Devuelve `null` para todo lo demás, incluido el lienzo del valle.
 */
function plainButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest('button');
  if (button === null || button.disabled || button.matches(OWN_VOICE)) return null;
  // Un contenedor marcado calla a todo lo que lleva dentro.
  return button.closest('[data-sfx="off"]') === null ? button : null;
}

/**
 * Lo engancha a la página: pide los ficheros ya y se arma con el primer toque
 * **en cualquier sitio**, en la fase de captura para ir antes que el botón
 * que lo recibe. Se llama una vez, desde `main.ts`.
 *
 * **En los tres momentos del toque, no en uno.** Chrome deja arrancar el audio
 * al bajar el dedo; Safari en iPhone sólo al levantarlo (`touchend`, `click`),
 * y un contexto creado al bajar se queda suspendido. `arm` no hace nada si el
 * audio ya corre, así que repetirlo no cuesta.
 */
export function installSound(): void {
  for (const type of ['pointerdown', 'pointerup', 'click'] as const) {
    document.addEventListener(type, () => { sound.arm(); }, { capture: true });
  }
  // **El sello de cera en todo botón corriente** (Vera, 29 sep 2026: «Eligo el
  // K para ese botón»): el golpe al bajar el dedo y la cera que se despega al
  // levantarlo, como en un juego de móvil. En captura, para ir antes que el
  // manejador del propio botón; y separados, porque soltar fuera del botón
  // —arrastrar el dedo para arrepentirse— no debe sonar a confirmación.
  document.addEventListener('pointerdown', (event) => {
    if (plainButton(event.target) !== null) sound.tap('ui_button_press', Date.now());
  }, { capture: true });
  document.addEventListener('pointerup', (event) => {
    if (plainButton(event.target) !== null) sound.tap('ui_button_release', Date.now());
  }, { capture: true });
  // Y con el teclado, que no manda punteros: la barra y el retorno aprietan un
  // botón igual que un dedo. `repeat` se ignora, o mantenerla pulsada tabletea.
  document.addEventListener('keydown', (event) => {
    if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
    if (plainButton(event.target) !== null) sound.tap('ui_button_press', Date.now());
  }, { capture: true });
  document.addEventListener('keyup', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (plainButton(event.target) !== null) sound.tap('ui_button_release', Date.now());
  }, { capture: true });
  // Al ocultar la pestaña el contexto se suspende (batería y sonido de fondo
  // en un móvil con la pantalla apagada); al volver, se reanuda.
  document.addEventListener('visibilitychange', () => { sound.visibility(document.hidden); });
  // Pedir los ficheros no necesita permiso: así el primer botón ya los tiene.
  if (document.readyState === 'complete') sound.prefetch();
  else window.addEventListener('load', () => { sound.prefetch(); }, { once: true });
}
