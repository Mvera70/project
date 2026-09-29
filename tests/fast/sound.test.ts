// U-09 · design.md §11.1, §11.4, §11.6; y el sonido de la interfaz del
// 29 sep 2026 (`docs/plan-audio.md`).
//
// Lo que estas pruebas guardan es la parte pura de `src/ui/sound.ts` —**cuándo**
// suena cada cosa— y que lo que el juego registra exista de verdad en
// `public/audio/`. Cómo suena cada fichero no se prueba aquí: se escucha, y lo
// fabrica `tools/ui/sounds.py`.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { SKY, SOUND, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { tick } from '@engine/sim';
import { milestonesAt } from '@ui/milestones';
import {
  accentAllowed, accentFor, createSoundEngine, CUE_FILES, LOOP_FILES, milestoneCue, playerAnswer,
  routeCue, soundPreference, speedCue, tapAllowed, type Cue,
} from '@ui/sound';
import { AMBIENCE_LAYERS, mixFor, thunderFor, windStrengthOf, type Mix, type WorldSound } from '@ui/ambience';
import type { SkyKind } from '@derive/weather';

const SKIES: readonly SkyKind[] = ['clear', 'overcast', 'rain', 'storm', 'snow'];

const SEEDS = [7, 42, 108, 999, 2024];
const WORK = { kind: 'work_done', weight: 2 } as const;
const CHAPEL = { kind: 'first_of_kind', weight: 3 } as const;

describe('accentFor · sólo dos motivos, y el hito gana', () => {
  it('sin hito y sin encrucijada, no suena nada', () => {
    expect(accentFor(null, null, false)).toBeNull();
  });

  it('una encrucijada recién planteada dispara su llamada', () => {
    expect(accentFor('some_template', null, false)).toBe('ui_crossroad_opens');
  });

  it('un hito dispara el suyo', () => {
    expect(accentFor(null, WORK, false)).toBe(milestoneCue(WORK));
  });

  it('si coinciden los dos en el mismo tick, gana el hito — «una voz cada vez», como la cartela sobre el aviso', () => {
    expect(accentFor('some_template', CHAPEL, false)).toBe(milestoneCue(CHAPEL));
  });

  it('durante un letargo no se dispara ningún acento, aunque haya hito y encrucijada', () => {
    expect(accentFor('some_template', CHAPEL, true)).toBeNull();
    expect(accentFor('some_template', null, true)).toBeNull();
    expect(accentFor(null, WORK, true)).toBeNull();
  });
});

describe('milestoneCue · el tiempo que pasa no suena como una obra', () => {
  it('la vuelta de la década y la del siglo tienen su marca, distinta de la de una obra', () => {
    const decade = milestoneCue({ kind: 'turn_of_decade', weight: 2 });
    const century = milestoneCue({ kind: 'turn_of_decade', weight: 3 });
    expect(new Set([decade, century, milestoneCue(WORK), milestoneCue(CHAPEL)]).size).toBe(4);
  });

  it('un hito de peso 3 no suena igual que uno de peso 2', () => {
    expect(milestoneCue(CHAPEL)).not.toBe(milestoneCue(WORK));
  });
});

describe('accentAllowed · el fusible de reloj de pared (§11.4)', () => {
  it('el primer acento siempre pasa', () => {
    expect(accentAllowed(1_000, null)).toBe(true);
  });

  it('no dos acentos más cerca que SOUND.ACCENT_MIN_GAP_MS', () => {
    expect(accentAllowed(1_000, 1_000)).toBe(false);
    expect(accentAllowed(1_000 + SOUND.ACCENT_MIN_GAP_MS - 1, 1_000)).toBe(false);
    expect(accentAllowed(1_000 + SOUND.ACCENT_MIN_GAP_MS, 1_000)).toBe(true);
  });

  it('un salto de sesenta y cuatro ticks no encola sesenta y cuatro sonidos', () => {
    // Lo que de verdad pasa con un salto de velocidad o un lote del letargo
    // (§11.4): varios ticks corren en el mismo instante de reloj de pared
    // porque ninguno de ellos tarda nada en ejecutarse — `nowMs` no avanza
    // entre uno y el siguiente. Sesenta y cuatro disparos con el mismo
    // instante sólo pueden dejar pasar el primero.
    const nowMs = 5_000;
    let lastPlayedMs: number | null = null;
    let played = 0;
    for (let i = 0; i < 64; i += 1) {
      if (accentAllowed(nowMs, lastPlayedMs)) {
        played += 1;
        lastPlayedMs = nowMs;
      }
    }
    expect(played).toBe(1);
  });

  it('pero sí deja pasar el siguiente una vez que el reloj de pared avanza de verdad', () => {
    let lastPlayedMs: number | null = null;
    let played = 0;
    for (const nowMs of [0, SOUND.ACCENT_MIN_GAP_MS, 2 * SOUND.ACCENT_MIN_GAP_MS]) {
      if (accentAllowed(nowMs, lastPlayedMs)) { played += 1; lastPlayedMs = nowMs; }
    }
    expect(played).toBe(3);
  });
});

describe('el acento, en una partida real: raro, no un teletipo', () => {
  it('un puñado de acentos en sesenta años, no uno por tick', () => {
    // El mismo tipo de propiedad que `notice.test.ts` guarda para el aviso:
    // si esto se disparase en cada tick, «ha pasado algo» dejaría de
    // significar nada (§11.6, y el propio brief de U-09: "raro").
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      let ticks = 0;
      let lastMilestoneTick = state.tick;
      let accents = 0;
      const totalTicks = 60 * 48;
      while (state.tick < totalTicks && state.ended === null) {
        const report = tick(state, CATALOG);
        ticks += 1;
        const passed = milestonesAt(state, lastMilestoneTick);
        lastMilestoneTick = state.tick;
        const kind = accentFor(report.posed, passed[0] ?? null, false);
        if (kind !== null) accents += 1;
      }
      expect(accents).toBeGreaterThan(0);
      // CROSSROADS.MIN_TICKS_BETWEEN ya impone un mínimo de 120 semanas entre
      // dos encrucijadas, y los hitos son más raros todavía: sesenta años no
      // deberían dejar ni de lejos un acento cada pocos ticks.
      expect(accents / ticks).toBeLessThan(0.05);
    }
  });
});

describe('tapAllowed · el mismo sonido no se apila sobre sí mismo', () => {
  it('dos disparos del mismo toque en el mismo fotograma suenan una vez', () => {
    expect(tapAllowed(1_000, undefined)).toBe(true);
    expect(tapAllowed(1_010, 1_000)).toBe(false);
  });

  it('pero un pulgar rápido —cuatro toques en un segundo— se oye entero', () => {
    let last: number | undefined;
    let played = 0;
    for (const nowMs of [0, 250, 500, 750]) {
      if (tapAllowed(nowMs, last)) { played += 1; last = nowMs; }
    }
    expect(played).toBe(4);
  });
});

describe('routeCue · abrir, cerrar, cambiar de pestaña', () => {
  const SHEETS = ['chronicle', 'people', 'cart', 'board'];

  it('abrir cualquier hoja desde el valle suena a abrir, y volver al valle, a cerrar', () => {
    for (const sheet of SHEETS) {
      expect(routeCue('valley', sheet)).toBe('ui_panel_open');
      expect(routeCue(sheet, 'valley')).toBe('ui_panel_close');
    }
  });

  it('abrir y cerrar son dos sonidos distintos', () => {
    expect(routeCue('valley', 'people')).not.toBe(routeCue('people', 'valley'));
  });

  it('quedarse donde se está no suena', () => {
    for (const route of ['valley', ...SHEETS]) expect(routeCue(route, route)).toBeNull();
  });

  it('una ficha es una persona, se llegue desde donde se llegue', () => {
    for (const from of ['valley', 'people', 'chronicle', 'inspect']) {
      expect(routeCue(from, 'inspect')).toBe('ui_person_select');
    }
  });

  it('de una hoja a otra es cambiar de pestaña, que es lo más discreto', () => {
    expect(routeCue('chronicle', 'people')).toBe('ui_tab_change');
    expect(routeCue('inspect', 'people')).toBe('ui_tab_change');
  });
});

describe('speedCue · el reloj', () => {
  const running = TIME.SPEEDS.filter((speed) => speed !== 0);

  it('parar suena a parar, y seguir a seguir, desde cualquier velocidad', () => {
    for (const speed of running) {
      expect(speedCue(speed, 0)?.cue).toBe('ui_pause');
      expect(speedCue(0, speed)?.cue).toBe('ui_resume');
    }
  });

  it('cada velocidad es un tono, y más deprisa es más agudo', () => {
    const rates = running.map((speed) => speedCue(speed === 1 ? 4 : 1, speed)?.rate ?? Number.NaN);
    for (let i = 1; i < rates.length; i += 1) expect(rates[i]).toBeGreaterThan(rates[i - 1]!);
  });

  it('elegir la velocidad que ya había no suena', () => {
    for (const speed of TIME.SPEEDS) expect(speedCue(speed, speed)).toBeNull();
  });
});

describe('playerAnswer · la respuesta del valle a lo que hizo el jugador', () => {
  const none = { means: null, crown: null, offer: null };
  const means = (given: boolean) => ({ id: 'plough', given, refusal: given ? null : 'silver', entry: null }) as never;
  const offer = (accepted: boolean, refused: boolean) => ({ id: 'pedlar', accepted, refused, entry: null }) as never;

  it('una semana sin actos no suena', () => {
    expect(playerAnswer(none)).toBeNull();
  });

  it('lo que se pudo dar suena distinto de lo que no se pudo pagar', () => {
    expect(playerAnswer({ ...none, means: means(true) })).toBe('ui_action_success');
    expect(playerAnswer({ ...none, means: means(false) })).toBe('ui_action_refused');
  });

  it('una oferta aceptada, dejada pasar o sin con qué pagarla son tres respuestas', () => {
    const answers = [offer(true, false), offer(false, false), offer(true, true)]
      .map((outcome) => playerAnswer({ ...none, offer: outcome }));
    expect(new Set(answers).size).toBe(3);
    expect(answers[2]).toBe('ui_action_refused');
  });
});

describe('los ficheros · lo que se registra, existe', () => {
  const AUDIO = resolve(__dirname, '../../public/audio');
  // Lo registrado lleva su huella (`?v=`); en el disco el fichero va sin ella.
  const registered = (Object.entries(CUE_FILES) as [Cue, string][])
    .map(([cue, url]) => [cue, url.split('?')[0]!, url] as const);

  it('todo momento tiene su fichero, y desde la fase 1 no queda ninguno mudo', () => {
    const every: Cue[] = [
      'ui_button_press', 'ui_button_release',
      'weather_lightning_crack', 'weather_thunder_near', 'weather_thunder_mid', 'weather_thunder_far',
      'ui_title_begin', 'ui_title_continue', 'ui_panel_open', 'ui_panel_close', 'ui_tab_change',
      'ui_person_select', 'ui_pause', 'ui_resume', 'ui_speed_change', 'ui_action_success',
      'ui_action_refused', 'ui_offer_arrives', 'ui_offer_accept', 'ui_offer_decline',
      'ui_crossroad_opens', 'ui_crossroad_decide', 'stinger_milestone_minor',
      'stinger_milestone_major', 'stinger_decade', 'stinger_century',
    ];
    for (const cue of every) expect(CUE_FILES[cue], cue).toBeDefined();
  });

  it('cada fichero registrado está en public/audio y no está vacío', () => {
    for (const [cue, file] of registered) {
      const path = resolve(AUDIO, file);
      expect(existsSync(path), `${cue} → ${file}`).toBe(true);
      expect(statSync(path).size, file).toBeGreaterThan(1_000);
    }
  });

  it('cada uno lleva la huella de su fichero: uno cambiado llega a un teléfono que tenía el viejo', () => {
    // El service worker sirve de la caché primero (§13.4). Si esto falla, un
    // fichero cambió sin volver a sellarlo: `python tools/ui/sounds.py --stamp`.
    for (const [cue, file, url] of registered) {
      const digest = createHash('sha256').update(readFileSync(resolve(AUDIO, file))).digest('hex').slice(0, 8);
      expect(url, cue).toBe(`${file}?v=${digest}`);
    }
  });

  it('los veinte caben en un presupuesto de móvil: menos de 400 KB entre todos', () => {
    // Medido el 29 sep 2026: 204 KB en MP3. El presupuesto es el doble, para
    // que una variante más larga quepa y un WAV colado por error no.
    const total = registered.reduce((sum, [, file]) => sum + statSync(resolve(AUDIO, file)).size, 0);
    expect(total).toBeLessThan(400_000);
  });
});

describe('el reproductor, sin navegador', () => {
  it('sin preferencia guardada, el valle suena', () => {
    expect(soundPreference()).toBe(true);
  });

  it('sin permiso del navegador —antes del primer toque— pedir un sonido no falla', () => {
    const engine = createSoundEngine();
    expect(() => {
      engine.tap('ui_panel_open', 0);
      engine.accent('stinger_decade', 0);
      engine.accent('weather_thunder_far', SOUND.ACCENT_MIN_GAP_MS);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// El fondo del mundo (fase 1, 29 sep 2026). Lo que se guarda aquí es **cuánto
// suena cada capa**, que es puro y por tanto lo único de todo el sonido que se
// puede comprobar sin oírlo. Cómo suena cada lecho se escucha.
// ---------------------------------------------------------------------------

// Mediodía de primavera, cielo claro, una aldea de veinte y la cámara en su
// altura de reposo: lo más parecido a «un día cualquiera» que hay.
const CALM: WorldSound = {
  sky: 'clear', season: 'spring', speed: 1, catchingUp: false, hidden: false,
  flood: 0, riverCells: 6, waterfallCells: null, flameCells: null, emberCells: null,
  viewHeight: 26, phase: 0.45, people: 20, villageCells: 3, festivity: false,
};
const NIGHT = { ...CALM, phase: 0.95 };
const total = (mix: Mix): number => Object.values(mix).reduce((sum, gain) => sum + gain, 0);

describe('el fondo del mundo · las compuertas lo callan entero', () => {
  it('en pausa no suena nada: un valle quieto que sigue sonando es un valle roto', () => {
    expect(mixFor({ ...CALM, speed: 0 })).toEqual({});
  });

  it('en un letargo no suena nada, por lo mismo que calla la voz (§9.2)', () => {
    expect(mixFor({ ...CALM, catchingUp: true })).toEqual({});
  });

  it('con la pestaña escondida no suena nada', () => {
    expect(mixFor({ ...CALM, hidden: true })).toEqual({});
  });

  it('y jugando sí suena: el valle nunca está mudo, siempre hay viento', () => {
    const mix = mixFor(CALM);
    expect(total(mix)).toBeGreaterThan(0);
    expect(mix.amb_wind_calm ?? 0).toBeGreaterThan(0);
  });
});

describe('el fondo del mundo · a ×16 y ×64 el mundo es un avance rápido', () => {
  it('el ambiente se apaga, pero no del todo: un valle mudo a ×64 parece roto', () => {
    const slow = total(mixFor({ ...CALM, sky: 'rain' }));
    for (const speed of [16, 64]) {
      const fast = total(mixFor({ ...CALM, sky: 'rain', speed }));
      expect(fast).toBeGreaterThan(0);
      expect(fast).toBeLessThan(slow);
    }
  });

  it('y el fuego se calla del todo: arde tres jornadas, que a ×64 son seis segundos', () => {
    const near = { ...CALM, flameCells: 3 };
    expect(mixFor(near).amb_fire_flame ?? 0).toBeGreaterThan(0);
    expect(mixFor({ ...near, speed: 64 }).amb_fire_flame).toBeUndefined();
  });
});

describe('el fondo del mundo · el cielo manda sobre el viento y sobre la lluvia', () => {
  it('cada cielo suena distinto de los demás', () => {
    const heard = new Set(SKIES.map((sky) => JSON.stringify(mixFor({ ...CALM, sky }))));
    expect(heard.size).toBe(SKIES.length);
  });

  it('cuanto peor el cielo, más viento: la misma tabla que mece las hojas', () => {
    const gust = (sky: SkyKind): number => mixFor({ ...CALM, sky }).amb_wind_gust ?? 0;
    expect(gust('storm')).toBeGreaterThan(gust('rain'));
    expect(gust('rain')).toBeGreaterThan(gust('clear'));
    expect(windStrengthOf('storm')).toBe(SOUND.WIND_BY_SKY.storm);
  });

  it('un día claro es casi silencio: la brisa sigue a la fuerza que hace, no suena entera', () => {
    // La corrección de Vera del 29 sep 2026: «un día claro suena muy fuerte,
    // el viento y el río; imagínate que estamos por las montañas». La brisa
    // de un cielo claro no puede sonar como la de uno encapotado.
    const breeze = (sky: SkyKind): number => mixFor({ ...CALM, sky }).amb_wind_calm ?? 0;
    expect(breeze('clear')).toBeLessThan(breeze('overcast'));
    expect(breeze('clear')).toBeLessThan(0.4);
    // Y el día claro entero tiene que ser el más callado de todos los cielos.
    const loudest = Math.max(...SKIES.filter((s) => s !== 'snow').map((sky) => total(mixFor({ ...CALM, sky }))));
    expect(total(mixFor({ ...CALM, sky: 'clear' }))).toBeLessThan(loudest);
  });

  it('sólo llueve cuando llueve, y sólo nieva cuando nieva', () => {
    expect(mixFor({ ...CALM, sky: 'rain' }).amb_rain_light ?? 0).toBeGreaterThan(0);
    expect(mixFor({ ...CALM, sky: 'clear' }).amb_rain_light).toBeUndefined();
    expect(mixFor({ ...CALM, sky: 'snow' }).amb_snow_hush ?? 0).toBeGreaterThan(0);
    expect(mixFor({ ...CALM, sky: 'storm' }).amb_snow_hush).toBeUndefined();
  });

  it('en invierno el viento es el aire frío, y no la brisa entre hojas que no hay', () => {
    const winter = mixFor({ ...CALM, season: 'winter' });
    expect(winter.amb_wind_winter ?? 0).toBeGreaterThan(0);
    expect(winter.amb_wind_calm).toBeUndefined();
  });
});

describe('el fondo del mundo · el agua está en un sitio', () => {
  it('el río se oye al acercar la cámara y se va al alejarla', () => {
    const close = mixFor({ ...CALM, viewHeight: 10 }).amb_river ?? 0;
    const far = mixFor({ ...CALM, viewHeight: 80 }).amb_river ?? 0;
    expect(close).toBeGreaterThan(far);
  });

  it('y se oye menos cuanto más lejos queda del centro de la vista', () => {
    const gains = [2, 10, 20, 40].map((riverCells) => mixFor({ ...CALM, riverCells }).amb_river ?? 0);
    for (let i = 1; i < gains.length; i += 1) expect(gains[i]!).toBeLessThan(gains[i - 1]!);
    expect(gains.at(-1)).toBe(0);
  });

  it('una riada sube el río: es el mismo cauce, con más agua', () => {
    expect(mixFor({ ...CALM, flood: 1 }).amb_river ?? 0)
      .toBeGreaterThan(mixFor(CALM).amb_river ?? 0);
  });

  it('un valle sin cascada no suena a cascada', () => {
    expect(mixFor(CALM).amb_waterfall).toBeUndefined();
    expect(mixFor({ ...CALM, waterfallCells: 4 }).amb_waterfall ?? 0).toBeGreaterThan(0);
  });
});

describe('el fondo del mundo · la llama y las brasas no son lo mismo', () => {
  it('cada estado del fuego suena el suyo, nunca los dos', () => {
    const flame = mixFor({ ...CALM, flameCells: 4 });
    const ember = mixFor({ ...CALM, emberCells: 4 });
    expect(flame.amb_fire_flame ?? 0).toBeGreaterThan(0);
    expect(flame.amb_fire_embers).toBeUndefined();
    expect(ember.amb_fire_embers ?? 0).toBeGreaterThan(0);
    expect(ember.amb_fire_flame).toBeUndefined();
  });

  it('sin fuego no hay fuego', () => {
    expect(mixFor(CALM).amb_fire_flame).toBeUndefined();
  });
});

describe('el trueno llega por la distancia, no por una tirada', () => {
  it('más lejos, más tarde, y siempre', () => {
    const delays = [0, 10, 30, 60].map((cells) => thunderFor(cells).delaySeconds);
    for (let i = 1; i < delays.length; i += 1) expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
  });

  it('y más lejos, más sordo: tres truenos y no uno con el volumen bajado', () => {
    expect(thunderFor(2).cue).toBe('weather_thunder_near');
    expect(thunderFor(SOUND.THUNDER_NEAR_CELLS + 1).cue).toBe('weather_thunder_mid');
    expect(thunderFor(SOUND.THUNDER_MID_CELLS + 1).cue).toBe('weather_thunder_far');
  });

  it('el rayo más lejano del corazón del valle no tarda más que el retardo que sustituye', () => {
    // El corazón mide 36 × 56 celdas (`tiles.ts`), o sea 66 de esquina a
    // esquina; `SKY.THUNDER_DELAY[1]` era el tope del retardo aleatorio viejo.
    expect(thunderFor(Math.hypot(36, 56)).delaySeconds).toBeLessThanOrEqual(SKY.THUNDER_DELAY[1]);
  });
});

describe('los lechos · lo que se registra, existe y no se nota que da la vuelta', () => {
  const AUDIO = resolve(__dirname, '../../public/audio');

  it('cada capa tiene su fichero, y la huella es la de ese fichero', () => {
    // Un lecho **también** lleva huella. Olvidarlo fue el fallo del 29 sep:
    // los bucles se cambiaron y el sellador sólo conocía la forma de un
    // toque, así que un teléfono con los viejos se habría quedado con ellos.
    for (const layer of AMBIENCE_LAYERS) {
      const { file } = LOOP_FILES[layer];
      const name = file.split('?')[0]!;
      const path = resolve(AUDIO, name);
      expect(existsSync(path), layer).toBe(true);
      const digest = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8);
      expect(file, layer).toBe(`${name}?v=${digest}`);
    }
  });

  it('y su duración declarada, que es lo que impide el latido del relleno del MP3', () => {
    for (const layer of AMBIENCE_LAYERS) {
      // Un bucle corto se reconoce; uno largo pesa sin ganar nada.
      expect(LOOP_FILES[layer].seconds, layer).toBeGreaterThanOrEqual(8);
      expect(LOOP_FILES[layer].seconds, layer).toBeLessThanOrEqual(20);
    }
  });

  it('todo el sonido cabe en un presupuesto de móvil: menos de 1,5 MB', () => {
    // Medido el 29 sep 2026, con las fases 1 y 2 dentro: **1043 KB** —18
    // lechos, 4 del cielo y 22 de interfaz—. El tope deja sitio para los
    // golpes cortos de las fases 3 a 5 (unos 5 KB cada uno) sin volver aquí.
    // **Si se pasa, lo que se acorta son los bucles, no el tope**: los
    // modelos 3D ya precachean 2,7 MB y el sonido no puede competir con eso.
    const files = [...AMBIENCE_LAYERS.map((l) => LOOP_FILES[l].file),
      ...Object.values(CUE_FILES)];
    const total = files.reduce((sum, file) => sum + statSync(resolve(AUDIO, file.split('?')[0]!)).size, 0);
    expect(total).toBeLessThan(1_500_000);
  });
});

// ---------------------------------------------------------------------------
// Fase 2: el día, la noche y la aldea que crece.
// ---------------------------------------------------------------------------

describe('el fondo del mundo · el día y la noche se relevan', () => {
  it('de día cantan los pájaros y de noche no, y al revés con los grillos', () => {
    expect(mixFor(CALM).amb_birds_day ?? 0).toBeGreaterThan(0);
    expect(mixFor(CALM).amb_night_summer).toBeUndefined();
    expect(mixFor(NIGHT).amb_birds_day).toBeUndefined();
    expect(mixFor(NIGHT).amb_night_summer ?? 0).toBeGreaterThan(0);
  });

  it('se cruzan en el alba y en el anochecer, no se cortan', () => {
    // Justo antes de la noche cerrada quedan los dos a media voz: si uno
    // acabara de golpe se oiría el corte, que es lo que el cruce evita.
    const dusk = mixFor({ ...CALM, phase: 0.85 });
    expect(dusk.amb_birds_day ?? 0).toBeGreaterThan(0);
    expect(dusk.amb_birds_day ?? 1).toBeLessThan(1);
    expect(dusk.amb_night_summer ?? 0).toBeGreaterThan(0);
  });

  it('los pájaros callan con tormenta y con nieve, y se retiran con lluvia', () => {
    const birds = (sky: SkyKind): number => mixFor({ ...CALM, sky }).amb_birds_day ?? 0;
    expect(birds('storm')).toBe(0);
    expect(birds('snow')).toBe(0);
    expect(birds('rain')).toBeGreaterThan(0);
    expect(birds('rain')).toBeLessThan(birds('clear'));
  });

  it('los grillos son de primavera y verano; el resto del año la noche es el aire quieto', () => {
    for (const season of ['spring', 'summer'] as const) {
      expect(mixFor({ ...NIGHT, season }).amb_night_summer ?? 0, season).toBeGreaterThan(0);
    }
    for (const season of ['autumn', 'winter'] as const) {
      expect(mixFor({ ...NIGHT, season }).amb_night_summer, season).toBeUndefined();
      expect(mixFor({ ...NIGHT, season }).amb_night_cold ?? 0, season).toBeGreaterThan(0);
    }
  });
});

describe('el fondo del mundo · la aldea suena a lo grande que es', () => {
  it('cuanta más gente, más bullicio: la escalera medida en seis semillas', () => {
    // `founding-report.ts`: 6-13 personas el primer año, 20-39 el quinto,
    // 50-80 en un valle maduro. El sonido tiene que separar esos tres valles.
    const loudness = [3, 10, 25, 45, 75].map((people) => total(mixFor({ ...CALM, people })));
    for (let i = 1; i < loudness.length; i += 1) {
      expect(loudness[i]!, `${i}`).toBeGreaterThan(loudness[i - 1]!);
    }
  });

  it('la pareja fundadora casi no suena, y un valle lleno tiene los dos lechos', () => {
    const founding = mixFor({ ...CALM, people: 2 });
    expect(founding.amb_village_sparse).toBeUndefined();
    expect(founding.amb_village_busy).toBeUndefined();
    const town = mixFor({ ...CALM, people: 75 });
    expect(town.amb_village_sparse ?? 0).toBeGreaterThan(0);
    expect(town.amb_village_busy ?? 0).toBeGreaterThan(0);
  });

  it('de noche la aldea calla: la gente duerme y ni siquiera se dibuja', () => {
    const night = mixFor({ ...NIGHT, people: 75 });
    expect(night.amb_village_sparse).toBeUndefined();
    expect(night.amb_village_busy).toBeUndefined();
  });

  it('y se va si la cámara se lleva la mirada lejos del pueblo', () => {
    const here = mixFor({ ...CALM, people: 60 }).amb_village_sparse ?? 0;
    const away = mixFor({ ...CALM, people: 60, villageCells: 40 }).amb_village_sparse ?? 0;
    expect(away).toBeLessThan(here);
  });
});

describe('el fondo del mundo · la plaza', () => {
  it('la hoguera arde en su rato de la tarde y en ningún otro', () => {
    expect(mixFor({ ...CALM, phase: 0.62 }).amb_hearth ?? 0).toBeGreaterThan(0);
    expect(mixFor({ ...CALM, phase: 0.3 }).amb_hearth).toBeUndefined();
    expect(mixFor({ ...CALM, phase: 0.95 }).amb_hearth).toBeUndefined();
  });

  it('una fiesta se oye, y sin fiesta no hay fiesta', () => {
    expect(mixFor(CALM).amb_festival).toBeUndefined();
    expect(mixFor({ ...CALM, festivity: true }).amb_festival ?? 0).toBeGreaterThan(0);
  });
});
