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
//     soltar otro fichero con el mismo nombre. Sin ambiente, a propósito: el
//     lecho de fondo es lo que resultó incómodo, y vuelve sólo si Vera lo pide.
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
//     primer botón ya los tenga.
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
  | 'weather_thunder_far';

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
  amb_village_sparse: { file: 'amb_village_sparse.mp3?v=05fd35e8', seconds: 14 },
  amb_village_busy: { file: 'amb_village_busy.mp3?v=35804cdc', seconds: 14 },
  amb_hearth: { file: 'amb_hearth.mp3?v=cf5891dd', seconds: 10 },
  amb_festival: { file: 'amb_festival.mp3?v=d8d32b5a', seconds: 14 },
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
  /** Un acento del juego: pasa por el fusible de §11.4. */
  accent(cue: Cue, nowMs: number): void;
  /** La respuesta a un toque del jugador. `rate` sube o baja el tono. */
  tap(cue: Cue, nowMs: number, rate?: number): void;
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
  const bytes = new Map<string, Promise<ArrayBuffer | null>>();
  const buffers = new Map<string, Promise<AudioBuffer | null>>();
  /** Una capa viva: su bucle, su ganancia y a qué volumen va. */
  const loops = new Map<AmbienceLayer, { gain: GainNode; at: number; want: number }>();

  const isEnabled = (): boolean => {
    if (enabled === null) enabled = soundPreference();
    return enabled;
  };

  /** Pide los ficheros. No necesita el `AudioContext`, así que va antes del toque. */
  const prefetch = (): void => {
    if (typeof fetch !== 'function') return;
    const all: [string, string][] = [
      ...(Object.entries(CUE_FILES) as [Cue, string][]),
      // Los lechos van detrás a propósito: pesan diez veces más que un toque y
      // lo primero que tiene que estar listo es el botón que se va a pulsar.
      ...AMBIENCE_LAYERS.map((layer) => [layer, LOOP_FILES[layer].file] as [string, string]),
    ];
    for (const [cue, file] of all) {
      if (bytes.has(cue)) continue;
      bytes.set(cue, fetch(`./audio/${file}`)
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .catch(() => null));
    }
  };

  const decoded = (cue: string): Promise<AudioBuffer | null> => {
    const known = buffers.get(cue);
    if (known !== undefined) return known;
    prefetch();
    const raw = bytes.get(cue);
    const context = ctx;
    const pending = raw === undefined || context === null
      ? Promise.resolve(null)
      // `slice`: `decodeAudioData` se queda con el búfer, y así el original
      // sigue sirviendo si alguna vez hay que volver a decodificar.
      : raw.then((data) => (data === null ? null : context.decodeAudioData(data.slice(0)).catch(() => null)));
    buffers.set(cue, pending);
    return pending;
  };

  const start = (cue: Cue, rate: number, requestedMs: number): void => {
    if (!isEnabled() || ctx === null || master === null) return;
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
      source.connect(out);
      source.start();
      if (typeof window !== 'undefined') {
        const log = window.__valleySound ?? { played: [] };
        log.played.push({ cue, atMs: Date.now(), rate });
        if (log.played.length > 64) log.played.splice(0, log.played.length - 64);
        window.__valleySound = log;
      }
    });
  };

  return {
    get enabled(): boolean { return isEnabled(); },
    setEnabled(on: boolean): void {
      enabled = on;
      storeSoundPreference(on);
      if (master !== null && ctx !== null) master.gain.setValueAtTime(on ? SOUND.MASTER_GAIN : 0, ctx.currentTime);
    },
    prefetch,
    arm(): void {
      prefetch();
      if (typeof window === 'undefined') return;
      if (ctx === null) {
        const Context = window.AudioContext ?? window.webkitAudioContext;
        if (Context === undefined) return;
        try { ctx = new Context(); } catch { return; }
        master = ctx.createGain();
        master.gain.value = isEnabled() ? SOUND.MASTER_GAIN : 0;
        master.connect(ctx.destination);
        for (const cue of Object.keys(CUE_FILES) as Cue[]) void decoded(cue);
      }
      if (ctx.state === 'running') return;
      void ctx.resume().catch(() => undefined);
      // iOS sólo abre el audio si algo suena **dentro** del gesto: un búfer
      // vacío de una muestra basta.
      const silence = ctx.createBufferSource();
      silence.buffer = ctx.createBuffer(1, 1, 22_050);
      silence.connect(ctx.destination);
      silence.start();
    },
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
          if (want <= 0) continue;
          // Nace en silencio y sube sola: así una capa nueva nunca entra de golpe.
          const gain = context.createGain();
          gain.gain.value = 0;
          gain.connect(out);
          loops.set(layer, { gain, at: 0, want });
          const { seconds } = LOOP_FILES[layer];
          void decoded(layer).then((buffer) => {
            const started = loops.get(layer);
            if (buffer === null || started === undefined || started.gain !== gain) return;
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
          });
          continue;
        }
        live.want = want;
        const delta = live.want - live.at;
        live.at += Math.sign(delta) * Math.min(Math.abs(delta), step);
        live.gain.gain.setTargetAtTime(live.at, context.currentTime, 0.02);
      }
    },
    accent(cue: Cue, nowMs: number): void {
      if (CUE_FILES[cue] === undefined || !accentAllowed(nowMs, lastAccentMs)) return;
      lastAccentMs = nowMs;
      start(cue, 1, Date.now());
    },
    tap(cue: Cue, nowMs: number, rate = 1): void {
      if (CUE_FILES[cue] === undefined || !tapAllowed(nowMs, lastTapMs[cue])) return;
      lastTapMs[cue] = nowMs;
      start(cue, rate, Date.now());
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
 * Lo que **no** está aquí y es deliberado: el badge de la velocidad (sólo
 * despliega la regleta), el botón de despejar, la señal de caza, los cierres,
 * el dado de la semilla, el taller, los mandos del carro y del tablón y los de
 * las opciones gráficas. Ésos son botones corrientes y suenan a sello.
 */
const OWN_VOICE = [
  '.skin-nav-tab',                                        // las pestañas · routeCue
  '.valley-speeds button',                                // la regleta · speedCue
  '.hud-speed-cluster .hud-round-btn:not(.valley-speed-badge)', // parar y seguir · speedCue
  '.valley-sound, .title-sound',                          // el silencio · se oye al encenderlo
  '.title-new, .title-continue, .title-preset',           // fundar y continuar
  '.title-annals, .title-graphics',                       // abren y cierran hoja
  '.crossroad-options button',                            // el sello de la decisión
  '.valley-voice-answer',                                 // aceptar o dejar pasar un trato
  '.people-row',                                          // abre una ficha
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
  // Pedir los ficheros no necesita permiso: así el primer botón ya los tiene.
  if (document.readyState === 'complete') sound.prefetch();
  else window.addEventListener('load', () => { sound.prefetch(); }, { once: true });
}
