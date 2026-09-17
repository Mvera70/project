// VZ-01 · La cola de la voz del valle.
// plan-voz.md §3.3, §5 VZ-01; design.md §11.6, §11.4.
//
// Las propiedades del diseño, no las llamadas: qué se lee cuando varias voces
// piden hablar, que no hay cola de cartelas, que la pista no se marca vista por
// ceder, y que un salto del reloj no deja nada a medias.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import {
  SILENT,
  dismissHint,
  expire,
  offer,
  offerUnlessMuted,
  speaking,
  ttlMs,
  type Utterance,
  type VoiceRole,
} from '@ui/voice';

const T0 = 1_700_000_000_000;

function say(role: VoiceRole, text: string, saidAtMs = T0): Utterance {
  return { role, text, saidAtMs };
}

describe('la prioridad: hito > suceso > pista > estado', () => {
  it('con las cuatro pidiendo el hueco se lee el hito, y al caducar cada una asoma la siguiente', () => {
    let v = SILENT;
    v = offer(v, say('state', 'Nothing is being built.'));
    v = offer(v, say('hint', 'The line below is the standing orders…'));
    v = offer(v, say('event', 'A fire took a roof.'));
    v = offer(v, say('milestone', 'The first chapel is raised.'));

    // El hito manda mientras vive.
    expect(speaking(v, T0)?.text).toBe('The first chapel is raised.');

    // Caducado el hito, no reaparece el suceso: lo sustituyó, y el suceso vive
    // en la crónica. Lo siguiente es la pista.
    const tras = expire(v, T0 + ttlMs('milestone'));
    expect(speaking(tras, T0 + ttlMs('milestone'))?.text).toBe('The line below is the standing orders…');

    // Y retirada la pista, el fondo: lo que la aldea está haciendo.
    const sinPista = dismissHint(tras);
    expect(speaking(sinPista, T0 + ttlMs('milestone'))?.text).toBe('Nothing is being built.');
  });

  it('sin nadie hablando, el valle calla', () => {
    expect(speaking(SILENT, T0)).toBeNull();
  });
});

describe('U-02 · el hito gana al suceso del mismo instante', () => {
  it('ofrecidos en el mismo milisegundo, se lee el hito', () => {
    let v = offer(SILENT, say('event', 'A fire took a roof.'));
    v = offer(v, say('milestone', 'The first chapel is raised.'));
    expect(speaking(v, T0)?.text).toBe('The first chapel is raised.');
  });

  it('y un suceso posterior no desplaza a un hito vivo', () => {
    let v = offer(SILENT, say('milestone', 'The first chapel is raised.'));
    v = offer(v, say('event', 'A fire took a roof.', T0 + 1_000));
    expect(speaking(v, T0 + 1_000)?.text).toBe('The first chapel is raised.');
  });

  it('pero sí lo desplaza cuando el hito ya ha caducado', () => {
    let v = offer(SILENT, say('milestone', 'The first chapel is raised.'));
    const luego = T0 + ttlMs('milestone') + 1;
    v = offer(v, say('event', 'A fire took a roof.', luego));
    expect(speaking(v, luego)?.text).toBe('A fire took a roof.');
  });

  it('un hito sí desplaza a otro hito: el último es el que se está viendo ocurrir', () => {
    let v = offer(SILENT, say('milestone', 'The first chapel is raised.'));
    v = offer(v, say('milestone', 'The mill turns for the first time.', T0 + 500));
    expect(speaking(v, T0 + 500)?.text).toBe('The mill turns for the first time.');
  });

  it('el hito se lee más rato que el suceso, y las dos medidas son las de balance.ts', () => {
    // Se muda aquí desde `notice.test.ts`, donde guardaba lo mismo para la
    // cartela: las dos cosas que asoman y se retiran solas (§11.6) son el aviso
    // —lo que acaba de pasar, y pasa mucho— y el hito —lo que pasa una vez—. Si
    // el hito no durase más, se leería como un aviso cualquiera y el momento no
    // sería un momento. Los dos en reloj de pared y a corte seco, por §11.4.
    expect(ttlMs('milestone')).toBeGreaterThan(ttlMs('event'));
    expect(ttlMs('event')).toBe(TIME.NOTICE_MS);
    expect(ttlMs('milestone')).toBe(TIME.MOMENT_MS);
    // Y ninguno tanto como para que haya que quitarlo de en medio.
    expect(ttlMs('milestone')).toBeLessThan(12_000);
  });
});

describe('sin cola de cartelas · visual-reference §5', () => {
  it('dos sucesos seguidos dejan uno, y el primero no vuelve nunca', () => {
    let v = offer(SILENT, say('event', 'A fire took a roof.'));
    v = offer(v, say('event', 'Someone came over the ridge.', T0 + 200));
    expect(speaking(v, T0 + 200)?.text).toBe('Someone came over the ridge.');
    // Ni al caducar el segundo: lo transitorio queda vacío, no encadenado.
    const tras = expire(v, T0 + 200 + ttlMs('event'));
    expect(tras.transient).toBeNull();
  });

  it('diez sucesos en un tick no acumulan nada: sólo se guarda el último', () => {
    let v = SILENT;
    for (let n = 0; n < 10; n += 1) v = offer(v, say('event', `suceso ${n}`, T0 + n));
    expect(v.transient?.text).toBe('suceso 9');
  });
});

describe('la pista no se marca vista por ceder · UI-R1', () => {
  it('tapada por un suceso, vuelve con el mismo texto cuando el suceso se retira', () => {
    let v = offer(SILENT, say('hint', 'The line below is the standing orders…'));
    v = offer(v, say('event', 'A fire took a roof.', T0 + 100));
    expect(speaking(v, T0 + 100)?.role).toBe('event');

    const luego = T0 + 100 + ttlMs('event');
    v = expire(v, luego);
    expect(speaking(v, luego)?.text).toBe('The line below is the standing orders…');
    expect(speaking(v, luego)?.role).toBe('hint');
  });

  it('sólo tocarla la retira', () => {
    const v = offer(SILENT, say('hint', 'The line below is the standing orders…'));
    expect(dismissHint(v).hint).toBeNull();
    // Y retirar dos veces no rompe nada.
    expect(dismissHint(dismissHint(v)).hint).toBeNull();
  });
});

describe('las vidas, al milisegundo · §11.4', () => {
  it('lo transitorio se lee hasta el último milisegundo y no en el siguiente', () => {
    const v = offer(SILENT, say('event', 'A fire took a roof.'));
    expect(speaking(v, T0 + ttlMs('event') - 1)?.role).toBe('event');
    expect(speaking(v, T0 + ttlMs('event'))?.role).not.toBe('event');
  });

  it('un salto del reloj del juego no deja nada a medias: se lee o no se lee', () => {
    // §11.4 pide estado definido en cada instante. Un salto de una hora de
    // pared sobre un aviso de cinco segundos lo deja retirado, no medio.
    const v = offer(SILENT, say('event', 'A fire took a roof.'));
    const tras = expire(v, T0 + 3_600_000);
    expect(tras.transient).toBeNull();
    expect(speaking(tras, T0 + 3_600_000)).toBeNull();
  });

  it('`expire` no toca la pista ni el estado', () => {
    let v = offer(SILENT, say('state', 'Nothing is being built.'));
    v = offer(v, say('hint', 'The line below…'));
    v = offer(v, say('event', 'A fire took a roof.'));
    const tras = expire(v, T0 + 999_999);
    expect(tras.state?.text).toBe('Nothing is being built.');
    expect(tras.hint?.text).toBe('The line below…');
  });
});

describe('el letargo · §11.6, §13.2', () => {
  it('callado, no acepta sucesos ni hitos', () => {
    const v = offerUnlessMuted(SILENT, say('event', 'A fire took a roof.'), true);
    expect(v).toBe(SILENT);
    const w = offerUnlessMuted(SILENT, say('milestone', 'The first chapel.'), true);
    expect(w).toBe(SILENT);
  });

  it('pero la pista y el estado sí se guardan: no son sucesos', () => {
    const v = offerUnlessMuted(SILENT, say('hint', 'The line below…'), true);
    expect(v.hint?.text).toBe('The line below…');
    const w = offerUnlessMuted(SILENT, say('state', 'Nothing is being built.'), true);
    expect(w.state?.text).toBe('Nothing is being built.');
  });

  it('y al dejar de estar callado vuelve a aceptarlos', () => {
    const v = offerUnlessMuted(SILENT, say('event', 'A fire took a roof.'), false);
    expect(speaking(v, T0)?.role).toBe('event');
  });
});

describe('pureza', () => {
  it('ninguna función muta lo que recibe', () => {
    const inicial = Object.freeze({ ...SILENT });
    const v = offer(inicial, say('event', 'A fire took a roof.'));
    expect(inicial.transient).toBeNull();
    expect(v).not.toBe(inicial);

    const congelado = Object.freeze(v);
    expect(() => expire(congelado, T0 + 999_999)).not.toThrow();
    expect(() => dismissHint(congelado)).not.toThrow();
    expect(congelado.transient?.text).toBe('A fire took a roof.');
  });

  it('dos llamadas iguales dan lo mismo', () => {
    const u = say('event', 'A fire took a roof.');
    expect(offer(SILENT, u)).toEqual(offer(SILENT, u));
    expect(speaking(offer(SILENT, u), T0)).toEqual(speaking(offer(SILENT, u), T0));
  });

  it('un ofrecimiento que no cambia nada devuelve el mismo objeto', () => {
    // Un suceso contra un hito vivo: nada cambia, y no se crea basura por
    // fotograma (esto se llama desde `paint`).
    const v = offer(SILENT, say('milestone', 'The first chapel.'));
    expect(offer(v, say('event', 'A fire.', T0 + 1))).toBe(v);
    expect(expire(v, T0)).toBe(v);
  });
});
