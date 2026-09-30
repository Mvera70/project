"""Los sonidos de la interfaz, fabricados aquí y no grabados. Materiales, sin notas.

Historia. El 24 sep 2026 se retiró la síntesis en vivo de U-09 («malísima»). El
29 se fabricaron veinte sonidos fuera del juego y **Vera los descartó todos**:
sonaban romos. Se probaron entonces cuatro tandas de un solo botón, y de cada una
salió una lección:

  · madera saturada          → crujía, no llenaba;
  · chasquidos afilados      → sonaban a ratón, no a algo tranquilo;
  · notas afinadas y agudas  → «infantil, de niños pequeños»: un tono puro entre
    600 y 1300 Hz con cola (gota, marimba, kalimba, laúd) es una caja de música;
  · **materiales**           → «me gustan mucho, sigue por ahí».

Lo que gustó: la piedra sobre madera, el cofre, el cuero con hebilla y el sello
de cera. Lo que no: el tambor. Así que **ningún sonido de la interfaz tiene una
nota afinada** salvo las campanas de los hitos, que son graves y de bronce, no de
juguete. Todo lo demás es foley de materiales: contacto en banda entre 600 y
3200 Hz (lo que se siente como toque), cuerpo mate entre 350 y 700 Hz (lo grave
que un móvil sí da), nada por encima de 4,8 kHz.

Cada material tiene su papel, para que la interfaz se aprenda de oído:

  piedra sobre madera  → los toques (pestañas, personas, reloj)
  cofre de madera      → abrir y cerrar (hojas, portada)
  cuero y hebilla      → lo que llega y se contesta (ofertas)
  sello de cera        → lo que se decide y se acepta
  madera hueca         → la pregunta y la negativa (dos golpes en una puerta)
  campana de bronce    → el tiempo que pasa (hitos), siempre grave

Cada receta sale en **tres variantes** para escuchar y elegir: *a* la de
referencia, *b* más grave y sorda, *c* más ligera y clara. La elegida de cada una
está en `CHOSEN`; sólo ésa va a `public/audio/<id>.mp3`, que es lo que carga el
juego (MP3 porque pesa la cuarta parte que un WAV y porque libsndfile escribe la
cabecera LAME con el retardo del codificador: medido, cero muestras de desfase).

Y la huella. El service worker sirve de la caché primero todo lo que no sea el
documento (§13.4), así que un fichero que cambia sin cambiar de nombre no llega
nunca a un teléfono que ya lo tenía. Cada entrada de `CUE_FILES` lleva `?v=` y los
ocho primeros caracteres del `sha256` del fichero; esta herramienta la reescribe
al terminar y `tests/fast/sound.test.ts` falla si alguna no coincide.

Determinista: el ruido de cada receta sale de una semilla derivada de su nombre.

Uso:
    pip install numpy scipy soundfile
    python tools/ui/sounds.py            # las elegidas → public/audio/*.mp3, y selladas
    python tools/ui/sounds.py --audition # y las tres de cada una → artifacts/audio/ui/
    python tools/ui/sounds.py --stamp    # sólo sellar lo que haya en public/audio/
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from typing import Callable

import numpy as np
import soundfile as sf
from scipy import signal

SR = 32_000  # Todo va por debajo de 5 kHz: 32 kHz sobra y pesa un 27 % menos que 44,1.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_GAME = os.path.join(ROOT, 'public', 'audio')
OUT_AUDITION = os.path.join(ROOT, 'artifacts', 'audio', 'ui')
SOUND_TS = os.path.join(ROOT, 'src', 'ui', 'sound.ts')

VARIANTS = {
    'a': {'pitch': 1.0, 'bright': 1.0, 'room': 0.06, 'decay': 1.0},
    'b': {'pitch': 2 ** (-2 / 12), 'bright': 0.75, 'room': 0.05, 'decay': 0.9},
    'c': {'pitch': 2 ** (2 / 12), 'bright': 1.2, 'room': 0.08, 'decay': 1.1},
}


# -- filtros -------------------------------------------------------------------

def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def place(*parts: tuple[float, np.ndarray], dur: float) -> np.ndarray:
    out = np.zeros(int(dur * SR))
    for at, x in parts:
        i = int(at * SR)
        j = min(len(out), i + len(x))
        if j > i:
            out[i:j] += x[: j - i]
    return out


def unit(x: np.ndarray, level: float) -> np.ndarray:
    return x / (np.abs(x).max() + 1e-9) * level


class Voice:
    """Los materiales de una receta en una variante, con su propio azar."""

    def __init__(self, cue: str, variant: str) -> None:
        seed = int(hashlib.sha256(f'{cue}/{variant}'.encode()).hexdigest()[:8], 16)
        self.rng = np.random.default_rng(seed)
        self.v = VARIANTS[variant]

    def t(self, dur: float) -> np.ndarray:
        return np.arange(int(dur * SR)) / SR

    def noise(self, n: int) -> np.ndarray:
        return self.rng.standard_normal(n)

    def f(self, hz: float) -> float:
        return hz * self.v['pitch']

    def env(self, d: float, tau: float, att_ms: float = 0.3) -> np.ndarray:
        e = np.exp(-self.t(d) / tau)
        a = max(1, min(len(e), int(SR * att_ms / 1000)))
        e[:a] *= np.linspace(0, 1, a)
        return e

    def modes(self, freqs, amps, taus, d: float, att_ms: float = 0.2, detune: float = 0.0) -> np.ndarray:
        tt = self.t(d)
        out = np.zeros_like(tt)
        for f, a, tau in zip(freqs, amps, taus):
            f = f * (1 + detune * self.rng.uniform(-1, 1))
            if f > SR * 0.42:
                continue
            out += a * np.sin(2 * np.pi * f * tt + self.rng.uniform(0, 2 * np.pi)) * np.exp(-tt / tau)
        a = max(1, int(SR * att_ms / 1000))
        out[:a] *= np.linspace(0, 1, a)
        return out

    # -- los materiales ------------------------------------------------------

    def contact(self, d=0.02, lo=600, hi=3200, tau=0.004, att_ms=0.6, level=1.0) -> np.ndarray:
        """El contacto de dos materiales: ruido en banda, sin brillo. Es lo que se siente."""
        hi = hi * (0.75 + 0.25 * self.v['bright'])
        x = bp(self.noise(int(d * SR)), lo, hi) * self.env(d, tau, att_ms)
        return unit(x, level)

    def tick(self, d=0.01, lo=1200, hi=4000, tau=0.003, level=0.3) -> np.ndarray:
        """Un toque redondeado: el clic, sin el chasquido."""
        return self.contact(d, lo, hi, tau, 1.2, level)

    def knock(self, f, d=0.1, tau=0.03, level=1.0) -> np.ndarray:
        """Madera hueca: ruido que excita una resonancia estrecha, como un golpe de verdad."""
        f = self.f(f)
        exc = self.noise(int(d * SR)) * np.exp(-self.t(d) / 0.0008)
        y = bp(exc, f * 0.9, f * 1.1) * self.env(d, tau * self.v['decay'], 0.1)
        return unit(y, level)

    def drop(self, f, d, tau, drop=1.15, glide_s=0.01, level=1.0) -> np.ndarray:
        """Cuerpo mate: un tono que cae un poco, tan corto que no se oye como nota."""
        f = self.f(f)
        freq = f + f * (drop - 1) * np.exp(-self.t(d) / glide_s)
        ph = 2 * np.pi * np.cumsum(freq) / SR
        return np.sin(ph) * self.env(d, tau * self.v['decay'], 0.5) * level

    def iron(self, f0, d=0.045, level=1.0) -> np.ndarray:
        """Hierro apagado: un pestillo, una hebilla, sin su brillo."""
        f0 = self.f(f0)
        x = self.modes([f0, f0 * 1.47, f0 * 2.09, f0 * 2.9], [1, 0.7, 0.5, 0.3],
                       [0.006, 0.004, 0.003, 0.002], d, detune=0.01)
        return lp(x, 4200) * level

    def grains(self, d=0.09, lo=1200, hi=3800, n=3, level=0.4) -> np.ndarray:
        """Un roce a granos: pergamino, cera que se despega."""
        ns = int(d * SR)
        x = bp(self.noise(ns), lo, hi)
        env = np.zeros(ns)
        idx = np.arange(ns)
        for _ in range(n):
            c = self.rng.uniform(0.05, 0.7) * ns
            w = self.rng.uniform(0.004, 0.012) * SR
            env += np.exp(-0.5 * ((idx - c) / w) ** 2) * self.rng.uniform(0.5, 1.0)
        return unit(x * env, level)

    def bell(self, f, d=1.0, level=1.0) -> np.ndarray:
        """Bronce de aldea, grave: parciales de campana con su tercera menor, sin brillo."""
        f = self.f(f)
        ratios = [0.5, 1.0, 1.19, 1.5, 2.0, 2.52]
        amps = [0.35, 1.0, 0.7, 0.45, 0.5, 0.22]
        taus = [0.9, 0.7, 0.5, 0.4, 0.28, 0.16]
        x = self.modes([f * r for r in ratios], amps, [tau * d * self.v['decay'] for tau in taus],
                       d, att_ms=1.5, detune=0.002)
        strike = self.contact(0.02, 500, 2500, 0.004, 0.6, 0.35)
        x[: len(strike)] += strike * np.abs(x).max()
        return lp(x, 4200) * level

    def room(self, x: np.ndarray, size=0.05, mix=None) -> np.ndarray:
        """Una sala de madera pequeña: da ambiente y casi ninguna cola."""
        mix = self.v['room'] if mix is None else mix
        n = int(size * SR)
        ir = lp(self.noise(n), 3500) * np.exp(-self.t(size) / (size / 4))
        x = np.concatenate([x, np.zeros(n)])
        wet = signal.fftconvolve(x, ir)[: len(x)]
        wet = wet / (np.abs(wet).max() + 1e-9) * np.abs(x).max()
        return x * (1 - mix) + wet * mix


# El nivel de cada familia, en dBFS de RMS **en la banda del teléfono** (350 Hz a
# 6 kHz): dos sonidos igual de fuertes con auriculares pueden sonar uno el doble
# que el otro en un iPhone, y el iPhone es donde se juega.
LEVEL = {'tick': -24.0, 'nav': -21.0, 'confirm': -19.0, 'call': -18.0, 'stinger': -18.0,
         'thunder': -17.0, 'thunder_far': -23.0,
         # La caza y el asedio (fase 5): un golpe suelto va como un toque fuerte;
         # el portón, que es lo que más pesa en el juego, va un poco por encima.
         'strike': -21.0, 'blow': -19.0, 'heavy': -17.0}
PEAK_CEILING = 0.9


def band_rms(x: np.ndarray) -> float:
    b = bp(x, 350, 6000)
    peak = np.abs(x).max() + 1e-12
    active = b[np.abs(x) > peak * 0.02]
    return float(np.sqrt(np.mean(active ** 2)) + 1e-12)


def master(x: np.ndarray, family: str, dur: float) -> np.ndarray:
    x = hp(x, 110)          # por debajo, un altavoz de móvil sólo hace ruido
    x = lp(x, 4800)         # por encima, sólo filo
    n = int(dur * SR)
    x = x[:n] if len(x) >= n else np.concatenate([x, np.zeros(n - len(x))])
    gain = 10 ** (LEVEL[family] / 20) / band_rms(x)
    # Sin saturar: si se pasa del techo, se baja el todo, no se recorta.
    gain = min(gain, PEAK_CEILING / (np.abs(x).max() + 1e-12))
    x = x * gain
    fade_in = min(len(x), int(SR * 0.0005))
    x[:fade_in] *= np.linspace(0, 1, fade_in)
    fade_out = min(len(x), int(SR * 0.02))
    x[-fade_out:] *= np.linspace(1, 0, fade_out) ** 2
    return x


# -- las recetas ------------------------------------------------------------------
# Cada una devuelve (familia, duración, señal). La duración incluye la cola.

Recipe = Callable[[Voice], tuple[str, float, np.ndarray]]
RECIPES: dict[str, Recipe] = {}


def recipe(cue: str):
    def register(fn: Recipe) -> Recipe:
        RECIPES[cue] = fn
        return fn
    return register


# ---- cofre de madera: abrir y cerrar -----------------------------------------

@recipe('ui_title_begin')
def _(v: Voice):
    # La tapa gruesa de un arcón que se abre: el pestillo, el golpe y cómo asienta.
    x = place((0, v.iron(1800, 0.05, 0.6)), (0, v.tick(0.01, 600, 2500, 0.003, 0.25)),
              (0.012, v.knock(420, 0.14, 0.05, 1.0)), (0.012, v.drop(400, 0.12, 0.04, 1.15, 0.01, 0.4)),
              (0.17, v.knock(480, 0.08, 0.03, 0.5)), (0.17, v.contact(0.01, 700, 2500, 0.002, 0.5, 0.25)), dur=0.3)
    return 'confirm', 0.3, v.room(x)


@recipe('ui_title_continue')
def _(v: Voice):
    # Volver a una partida: el mismo cofre, más ligero y con una sola pieza.
    x = place((0, v.iron(1600, 0.045, 0.45)), (0, v.tick(0.01, 600, 2500, 0.003, 0.2)),
              (0.008, v.knock(470, 0.1, 0.035, 0.8)), dur=0.18)
    return 'confirm', 0.18, v.room(x)


@recipe('ui_panel_open')
def _(v: Voice):
    x = place((0, v.iron(1900, 0.045, 0.6)), (0, v.tick(0.01, 600, 2500, 0.003, 0.25)),
              (0.004, v.knock(420, 0.1, 0.035, 1.0)), (0.004, v.drop(400, 0.09, 0.03, 1.15, 0.01, 0.35)), dur=0.12)
    return 'nav', 0.12, v.room(x)


@recipe('ui_panel_close')
def _(v: Voice):
    # Su pareja: primero la madera y luego el hierro que asienta. Más baja.
    x = place((0, v.knock(440, 0.06, 0.02, 0.6)), (0.005, v.iron(1400, 0.035, 0.45)),
              (0.005, v.contact(0.01, 700, 2500, 0.002, 0.6, 0.2)), dur=0.09)
    return 'nav', 0.09, v.room(x)


# ---- sello de cera: el botón corriente ---------------------------------------------
# **El K.** De las cuatro tandas de un solo botón, Vera eligió éste: «Eligo el K
# para ese botón» (29 sep 2026). Al apretar, el sello sobre la cera; al soltar,
# la cera que se despega. Lo lleva **todo botón que no tenga voz propia**
# (`OWN_VOICE` en `sound.ts`).

@recipe('ui_button_press')
def _(v: Voice):
    x = place((0, v.contact(0.07, 350, 1700, 0.02, 3.0, 0.5)), (0, v.knock(470, 0.09, 0.03, 0.9)),
              (0, v.drop(440, 0.09, 0.028, 1.3, 0.015, 0.55)), dur=0.13)
    return 'nav', 0.13, v.room(x)


@recipe('ui_button_release')
def _(v: Voice):
    # Más corto y más bajo que apretar: es la respuesta, no el gesto.
    x = place((0, v.grains(0.09, 900, 2700, 3, 0.4)), (0.01, v.knock(520, 0.05, 0.014, 0.3)), dur=0.11)
    return 'tick', 0.11, x


# ---- piedra sobre madera: los toques ----------------------------------------------

@recipe('ui_tab_change')
def _(v: Voice):
    # Un solo contacto ligero: casi subliminal.
    x = place((0, v.contact(0.012, 800, 2800, 0.003, 0.5, 0.6)), (0, v.knock(700, 0.04, 0.01, 0.35)), dur=0.06)
    return 'tick', 0.06, x


@recipe('ui_person_select')
def _(v: Voice):
    # Una tarjeta de retrato: cuero suave y un golpe pequeño de madera.
    x = place((0, v.contact(0.04, 300, 1500, 0.01, 1.2, 0.6)), (0, v.knock(520, 0.07, 0.02, 0.55)),
              (0.008, v.iron(2100, 0.03, 0.12)), dur=0.09)
    return 'nav', 0.09, v.room(x)


@recipe('ui_pause')
def _(v: Voice):
    # Una ficha de piedra que se pone en el tablero, con su pequeño rebote.
    x = place((0, v.contact(0.02, 600, 3200, 0.0035, 0.5, 0.9)), (0, v.knock(480, 0.08, 0.02, 1.0)),
              (0.014, v.contact(0.015, 700, 3000, 0.003, 0.5, 0.4)), (0.014, v.knock(540, 0.05, 0.014, 0.3)), dur=0.1)
    return 'nav', 0.1, v.room(x)


@recipe('ui_resume')
def _(v: Voice):
    # La pareja: la ficha que se levanta, ligera y más aguda, una sola vez.
    x = place((0, v.contact(0.012, 800, 2800, 0.003, 0.5, 0.35)), (0, v.knock(700, 0.05, 0.012, 0.3)),
              (0.02, v.contact(0.008, 900, 2800, 0.002, 0.5, 0.15)), dur=0.07)
    return 'nav', 0.07, x


@recipe('ui_speed_change')
def _(v: Voice):
    # Un contacto y un golpe cortos. El juego lo sube de tono en cada velocidad
    # (`SOUND.SPEED_RATES`), y como no tiene altura, sube sin sonar a escala.
    x = place((0, v.contact(0.012, 800, 2800, 0.003, 0.5, 0.6)), (0, v.knock(640, 0.045, 0.01, 0.5)), dur=0.06)
    return 'tick', 0.06, x


# ---- sello de cera: lo que se decide y se acepta ------------------------------------

@recipe('ui_action_success')
def _(v: Voice):
    # El valle acepta lo que le das: un sello sobre cera y una moneda que toca la mesa.
    x = place((0, v.contact(0.07, 350, 1700, 0.02, 3.0, 0.5)), (0, v.knock(470, 0.09, 0.03, 0.9)),
              (0, v.drop(440, 0.09, 0.028, 1.3, 0.015, 0.55)), (0.075, v.iron(2300, 0.05, 0.22)), dur=0.16)
    return 'confirm', 0.16, v.room(x)


@recipe('ui_crossroad_decide')
def _(v: Voice):
    # El sello de una decisión: la cera apretada, el golpe sordo, y al final la cera que se despega.
    x = place((0, v.contact(0.07, 350, 1700, 0.02, 3.0, 0.5)), (0, v.knock(470, 0.1, 0.035, 1.0)),
              (0, v.drop(440, 0.1, 0.03, 1.3, 0.015, 0.55)), (0.07, v.grains(0.08, 1200, 3400, 3, 0.2)), dur=0.18)
    return 'confirm', 0.18, v.room(x)


# ---- madera hueca: la pregunta y la negativa ----------------------------------------

@recipe('ui_action_refused')
def _(v: Voice):
    # Una negativa educada: dos golpes sordos y bajos en una puerta que no se abre.
    x = place((0, v.knock(450, 0.07, 0.022, 0.95)), (0, v.contact(0.012, 500, 2000, 0.003, 0.8, 0.3)),
              (0.09, v.knock(415, 0.08, 0.026, 0.7)), (0.09, v.contact(0.01, 400, 1600, 0.003, 0.8, 0.2)), dur=0.2)
    return 'confirm', 0.2, v.room(x)


@recipe('ui_crossroad_opens')
def _(v: Voice):
    # Alguien llama a la puerta, despacio, dos veces: hay algo que decidir.
    x = place((0, v.knock(430, 0.14, 0.045, 1.0)), (0, v.contact(0.012, 500, 2200, 0.003, 0.8, 0.35)),
              (0.32, v.knock(400, 0.14, 0.05, 0.75)), (0.32, v.contact(0.012, 500, 2200, 0.003, 0.8, 0.25)), dur=0.6)
    return 'call', 0.6, v.room(x, 0.08, 0.1)


# ---- cuero y hebilla: lo que llega y se contesta -------------------------------------

@recipe('ui_offer_arrives')
def _(v: Voice):
    # Alguien llega por el camino: arreos que tintinean y un par de pisadas de cascos.
    x = place((0, v.contact(0.05, 250, 1400, 0.012, 1.5, 0.5)),
              (0, v.iron(2300, 0.05, 0.5)), (0.06, v.iron(2700, 0.05, 0.4)), (0.115, v.iron(2100, 0.05, 0.35)),
              (0.02, v.knock(430, 0.08, 0.02, 0.4)), (0.13, v.knock(400, 0.08, 0.02, 0.3)), dur=0.3)
    return 'call', 0.3, v.room(x, 0.06, 0.09)


@recipe('ui_offer_accept')
def _(v: Voice):
    # El trato: una bolsa de cuero que se cierra, una moneda y un golpe cálido.
    x = place((0, v.contact(0.05, 250, 1400, 0.012, 1.5, 0.8)), (0.07, v.iron(2600, 0.06, 0.35)),
              (0.10, v.iron(2900, 0.05, 0.2)), (0.09, v.knock(480, 0.1, 0.03, 0.7)), dur=0.26)
    return 'confirm', 0.26, v.room(x)


@recipe('ui_offer_decline')
def _(v: Voice):
    # Un pergamino que se retira sobre la mesa y un golpe pequeño y grave que cierra.
    x = place((0, v.grains(0.14, 1000, 3200, 4, 0.5)), (0.1, v.knock(420, 0.07, 0.02, 0.35)), dur=0.18)
    return 'nav', 0.18, v.room(x)


# ---- campana de bronce: el tiempo que pasa ------------------------------------------------

@recipe('stinger_milestone_minor')
def _(v: Voice):
    # Un hito que suma: una ficha de piedra sobre madera y una campana pequeña, a lo lejos.
    x = place((0, v.contact(0.02, 600, 3200, 0.0035, 0.5, 0.7)), (0, v.knock(480, 0.08, 0.02, 0.7)),
              (0.03, v.bell(415, 1.0, 0.55)), dur=1.1)
    return 'stinger', 1.1, v.room(x, 0.2, 0.1)


@recipe('stinger_milestone_major')
def _(v: Voice):
    # Lo que cambia la aldea: el golpe del cofre, hierro, y dos campanas, la segunda una quinta más arriba.
    x = place((0, v.iron(1800, 0.05, 0.5)), (0, v.knock(420, 0.14, 0.05, 0.9)), (0, v.drop(400, 0.12, 0.04, 1.15, 0.01, 0.35)),
              (0.04, v.bell(392, 1.4, 0.7)), (0.42, v.bell(588, 1.2, 0.5)), dur=1.8)
    return 'stinger', 1.8, v.room(x, 0.3, 0.12)


@recipe('stinger_decade')
def _(v: Voice):
    # Dos tañidos graves separados por un respiro y uno más, más suave, que se asienta.
    x = place((0, v.bell(440, 0.9, 0.75)), (0.5, v.bell(440, 0.9, 0.65)), (1.0, v.bell(392, 1.0, 0.5)), dur=1.9)
    return 'stinger', 1.9, v.room(x, 0.3, 0.1)


@recipe('stinger_century')
def _(v: Voice):
    # Un siglo: una campana de aldea, ancha y larga, con un golpe de madera debajo.
    x = place((0, v.knock(420, 0.14, 0.05, 0.5)), (0.01, v.bell(392, 2.3, 1.0)), (0.9, v.bell(392, 1.6, 0.35)), dur=2.6)
    return 'stinger', 2.6, v.room(x, 0.35, 0.12)


# La variante que suena en el juego.
# ---- el cielo: el rayo y sus tres distancias ---------------------------------------
# El destello dura 0,46 s y el trueno llega después, **por la distancia real**
# del rayo al centro de la vista (§10.7 y `plan-audio-mundo.md`, decisión 8):
# cerca es un chasquido con cuerpo, lejos es sólo un retumbar largo. Tres
# ficheros y no uno con volumen, porque lo que cambia con la distancia no es el
# volumen: es que el aire se come los agudos y estira la cola.
#
# **Y los tres van más altos de lo que un trueno de verdad es.** Un retumbar
# vive por debajo de 350 Hz, que es justo donde un altavoz de móvil no llega:
# medido, el lejano se quedaba con el 34 % de su energía en la banda del
# teléfono y allí habría sido inaudible. Subidos, conservan el orden —lejos
# más oscuro que cerca— y se oyen en un iPhone; con auriculares se pierde algo
# del peso, y es el precio de que exista en el aparato donde se juega.

def _rumble(v: Voice, d: float, lo: float, hi: float, tau: float, level: float,
            roll: float = 0.35) -> np.ndarray:
    """El retumbar: ruido grave que rueda, con su propia respiración."""
    n = int(d * SR)
    x = bp(v.noise(n), lo, hi, order=3)
    t = np.arange(n) / SR
    body = np.exp(-t / tau) * (1 + roll * np.sin(2 * np.pi * 0.9 * t + v.rng.uniform(0, 6.28)))
    x = x * body
    a = int(SR * 0.004)
    x[:a] *= np.linspace(0, 1, a)
    return unit(x, level)


@recipe('weather_lightning_crack')
def _(v: Voice):
    # El latigazo: el aire que se rompe. Corto y sin cola; la cola es el trueno.
    x = place((0, v.contact(0.05, 900, 3400, 0.008, 0.2, 1.0)),
              (0, _rumble(v, 0.22, 200, 1400, 0.045, 0.7)), dur=0.3)
    return 'thunder', 0.3, x


@recipe('weather_thunder_near')
def _(v: Voice):
    # Encima: el chasquido y detrás el desplome, con un segundo golpe de eco.
    x = place((0, v.contact(0.06, 700, 3000, 0.01, 0.3, 0.85)),
              (0, _rumble(v, 1.6, 280, 1500, 0.32, 1.0)),
              (0.45, _rumble(v, 1.2, 240, 900, 0.3, 0.45)), dur=1.9)
    return 'thunder', 1.9, v.room(x, 0.3, 0.14)


@recipe('weather_thunder_mid')
def _(v: Voice):
    # A media distancia: ya no hay latigazo, hay un desplome que rueda.
    x = place((0, _rumble(v, 2.4, 260, 1000, 0.55, 1.0, roll=0.5)),
              (0.6, _rumble(v, 1.8, 230, 780, 0.5, 0.5)), dur=2.6)
    return 'thunder', 2.6, v.room(x, 0.35, 0.16)


@recipe('weather_thunder_far')
def _(v: Voice):
    # Lejos: sólo lo grave llega, y llega estirado. Es el más largo y el más bajo.
    x = place((0, _rumble(v, 3.2, 230, 720, 0.9, 1.0, roll=0.6)),
              (0.9, _rumble(v, 2.2, 210, 600, 0.8, 0.5)), dur=3.4)
    return 'thunder_far', 3.4, v.room(x, 0.4, 0.18)


# ---- la caza y el asedio (fase 5 · `docs/plan-audio-mundo.md`) --------------------
# **Ruido que se apaga, y ninguna resonancia.** La primera tanda (30 sep 2026) se
# hizo con `drop` y `knock` subidos a 420–600 Hz para llenar la banda del móvil, y
# Vera los descartó los siete: «juguetes de niño pequeño, timbales». Medido con
# `tools/ui/tonality.py`, sostenían 84–264 ms de resonancia; un timbal de
# referencia, 336. Un golpe de verdad no tiene altura: es ruido en banda que
# muere en decenas de milisegundos, más crujidos minúsculos, más —si hay hierro—
# golpecitos sueltos. **Lo que se ha de cumplir es una resonancia de ≤ 30 ms.**
#
# La familia es la «C» de la segunda tanda (el ariete con herrajes), la que
# Vera delegó en elegir: un golpe sordo sin altura y, detrás, el hierro y la
# madera que se sacuden. Sin voces (decisión 1 de §6) ni notas.

def _thump(v: Voice, d: float, lo: float, hi: float, tau: float, att_ms: float = 3.0) -> np.ndarray:
    """El cuerpo de un golpe, sin altura: ruido en banda que se apaga rápido."""
    return bp(v.noise(int(d * SR)), lo, hi, order=3) * v.env(d, tau * v.v['decay'], att_ms)


def _splinters(v: Voice, dur: float, n: int, lo: float = 420, hi: float = 2300,
               decay: float = 0.35) -> np.ndarray:
    """Crujidos minúsculos, más juntos al principio: madera que se astilla."""
    parts = []
    for _ in range(n):
        at = (v.rng.random() ** 1.7) * dur
        d = v.rng.uniform(0.002, 0.008) * 5
        m = int(d * SR) + 8
        e = np.exp(-(np.arange(m) / SR) / (d / 4))
        a = max(1, int(SR * 0.0003))
        e[:a] *= np.linspace(0, 1, a)
        f0 = v.rng.uniform(lo, hi * 0.6)
        amp = np.exp(-at / (dur * decay)) * v.rng.uniform(0.4, 1.0)
        parts.append((at, bp(v.noise(m), f0, min(hi, f0 * 2.2)) * e * amp))
    return place(*parts, dur=dur + 0.05)


def _rattle(v: Voice, dur: float, n: int, level: float = 0.5) -> np.ndarray:
    """Herrajes y cadenas que se sacuden: golpecitos de hierro sueltos, sin nota."""
    parts = []
    for _ in range(n):
        at = 0.02 + (v.rng.random() ** 1.4) * dur
        lo = v.rng.uniform(1300, 2600)
        m = int(0.02 * SR)
        parts.append((at, bp(v.noise(m), lo, min(lo + v.rng.uniform(1200, 1500), 3800))
                      * v.env(0.02, 0.004, 0.3) * v.rng.uniform(0.15, 1.0) * level))
    return place(*parts, dur=dur + 0.1)


@recipe('combat_arrow_loose')
def _(v: Voice):
    # La cuerda que restalla (cuero) y el aire de la flecha que se va.
    x = place((0, v.contact(0.03, 450, 1800, 0.006, 0.5, 1.0)),
              (0, _thump(v, 0.05, 400, 1200, 0.01, 1.0) * 0.4),
              (0.012, bp(v.noise(int(0.16 * SR)), 700, 2000)
               * np.sin(np.pi * np.linspace(0, 1, int(0.16 * SR)) ** 0.6) ** 2 * 0.3), dur=0.24)
    return 'strike', 0.24, v.room(x, 0.04, 0.05)


@recipe('combat_arrow_hit')
def _(v: Voice):
    # La flecha en carne: golpe blando y húmedo, sin resonancia ni madera.
    x = place((0, _thump(v, 0.12, 350, 1300, 0.024, 4.0)),
              (0, v.contact(0.03, 700, 2200, 0.007, 0.8, 0.3)),
              (0.03, v.grains(0.07, 500, 1600, 2, 0.2)), dur=0.18)
    return 'strike', 0.18, v.room(x, 0.03, 0.04)


@recipe('combat_arrow_miss')
def _(v: Voice):
    # Un tarascazo seco en madera o en tierra: pocos crujidos y un golpe corto.
    x = place((0, _splinters(v, 0.1, 7, 500, 2600)), (0, _thump(v, 0.07, 400, 1400, 0.012) * 0.7), dur=0.16)
    return 'strike', 0.16, v.room(x, 0.03, 0.04)


@recipe('combat_melee')
def _(v: Voice):
    # Palo contra escudo de madera y cuero: dos golpes secos y el hierro que tintinea.
    x = place((0, _thump(v, 0.09, 380, 1500, 0.014) * 1.0),
              (0, v.contact(0.025, 600, 2500, 0.005, 0.5, 0.6)),
              (0.07, _thump(v, 0.08, 350, 1300, 0.012) * 0.6),
              (0.02, _rattle(v, 0.16, 5, 0.35)), dur=0.26)
    return 'blow', 0.26, v.room(x, 0.05, 0.07)


@recipe('combat_fall')
def _(v: Voice):
    # Un cuerpo que se desploma: golpe sordo y, después, cuero y tela que se asientan.
    n = int(0.2 * SR)
    cloth = bp(v.noise(n), 500, 2000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * 0.3
    x = place((0, _thump(v, 0.2, 300, 1200, 0.04, 6.0)), (0.05, cloth), (0.06, v.grains(0.12, 500, 1800, 3, 0.2)), dur=0.36)
    return 'blow', 0.36, v.room(x, 0.05, 0.08)


@recipe('combat_gate_hit')
def _(v: Voice):
    # El ariete contra el portón: un golpe sordo y, detrás, los herrajes que se sacuden.
    x = place((0, _thump(v, 0.16, 360, 1400, 0.026) * 1.0), (0, _rattle(v, 0.36, 12, 0.5)), dur=0.5)
    return 'heavy', 0.5, v.room(x, 0.08, 0.14)


@recipe('combat_gate_break')
def _(v: Voice):
    # El portón que cede: las fibras que revientan, el golpe grande, los tablones
    # que caen y los herrajes por el suelo. Lo más largo de la fase.
    x = place((0, _splinters(v, 0.7, 34, 420, 2400, 0.5)),
              (0.0, _thump(v, 0.22, 340, 1400, 0.05) * 0.9),
              (0.25, _thump(v, 0.3, 320, 1300, 0.07, 6.0) * 1.0),
              (0.3, _splinters(v, 0.7, 22, 450, 2200, 0.6)),
              (0.32, _rattle(v, 0.8, 18, 0.6)),
              (0.4, v.grains(0.5, 500, 2200, 8, 0.3)), dur=1.3)
    return 'heavy', 1.3, v.room(x, 0.12, 0.18)


# ===========================================================================
# LOS LECHOS DE AMBIENTE (fase 1 · `docs/plan-audio-mundo.md`)
#
# Un ambiente no es un sonido de un disparo: es un **bucle** que va a estar
# sonando minutos. Tres cosas lo separan de todo lo de arriba:
#
#   · **No puede oírse la costura.** Se genera con una cola de más y se pliega
#     sobre la cabeza con un cruce (`seamless`): para una textura de ruido eso
#     es matemáticamente perfecto, no una aproximación.
#   · **No lleva fundido en los bordes.** Un `master()` normal apaga el final,
#     y eso en un bucle es un latido cada vez que da la vuelta.
#   · **Va mucho más bajo.** Un lecho que se nota es un lecho incómodo, que es
#     exactamente lo que Vera cortó el 24 sep. Los niveles de `LOOP_LEVEL`
#     están entre 14 y 21 dB por debajo de un toque de la interfaz.
#
# Duran entre 8 y 14 segundos. Menos se reconoce; más pesa sin ganar nada,
# porque la modulación lenta ya hace que dos vueltas no suenen igual.
# ===========================================================================

LOOP_LEVEL = {
    'bed': -38.0,      # viento en calma, nieve: lo que casi no se oye
    'weather': -33.0,  # lluvia, tormenta: presente pero detrás de todo
    # El río y la cascada están sonando **siempre** —el pueblo se funda pegado
    # al cauce—, así que son lo que antes cansa. A −40 el río de un día claro
    # es un fondo y no una presencia (Vera, 29 sep 2026: «suena muy fuerte…
    # imagínate que estamos por las montañas»); con la cámara encima del agua
    # sigue subiendo seis decibelios y se oye de sobra.
    'water': -40.0,
    'fire': -31.0,     # el fuego es un suceso y se acerca la cámara
    'life': -36.0,     # pájaros, grillos y la aldea: presencia, no protagonismo
}

# Hasta dónde llega cada lecho por arriba. Casi todos se cortan a 4,8 kHz, que
# es donde empieza el filo; **los bichos no**, porque un pájaro y un grillo
# viven ahí arriba y cortados ahí suenan a juguete mojado. Es la única
# excepción del proyecto y va medida: aun así se quedan muy por debajo de los
# 8 kHz a los que un móvil ya no da.
LOOP_TOP = {'amb_birds_day': 6800, 'amb_night_summer': 5200}

LOOP_RECIPES: dict[str, Callable[[Voice], tuple[str, float, np.ndarray]]] = {}


def loop(cue: str):
    def register(fn):
        LOOP_RECIPES[cue] = fn
        return fn
    return register


def seamless(x: np.ndarray, seconds: float, cross: float = 1.0) -> np.ndarray:
    """Pliega la cola sobre la cabeza: el bucle da la vuelta sin costura."""
    n = int(seconds * SR)
    c = int(cross * SR)
    assert len(x) >= n + c, 'la receta tiene que generar la cola de más'
    out = np.array(x[:n], dtype=float)
    fade = np.linspace(0, 1, c)
    out[:c] = out[:c] * fade + x[n:n + c] * (1 - fade)
    return out


def wobble(v: Voice, seconds: float, hz: float, depth: float, floor: float = 0.0) -> np.ndarray:
    """Una modulación lenta **periódica en el bucle**: si no lo fuera, la costura se oiría."""
    t = np.arange(int(seconds * SR)) / SR
    cycles = max(1, round(hz * seconds))          # un número entero de vueltas
    out = np.zeros_like(t)
    for harmonic, weight in ((1, 1.0), (2, 0.45), (3, 0.25)):
        out += weight * np.sin(2 * np.pi * cycles * harmonic * t / seconds + v.rng.uniform(0, 6.28))
    out = out / (np.abs(out).max() + 1e-9)
    return floor + (1 - floor) * (0.5 + 0.5 * out) * depth + (1 - depth)


def bed_noise(v: Voice, seconds: float, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return bp(v.noise(int(seconds * SR)), lo, hi, order)


@loop('amb_wind_calm')
def _(v: Voice):
    # Brisa: ruido grave y ancho que respira despacio. Nada de silbido.
    d = 12.0
    x = bed_noise(v, d + 1.5, 300, 1300) * wobble(v, d + 1.5, 0.11, 0.55, 0.3)
    x += bed_noise(v, d + 1.5, 900, 2400) * wobble(v, d + 1.5, 0.17, 0.8, 0.05) * 0.25
    return 'bed', d, x


@loop('amb_wind_gust')
def _(v: Voice):
    # Racha: la misma brisa con el cuerpo más alto y la respiración más marcada.
    d = 12.0
    x = bed_noise(v, d + 1.5, 260, 1500) * wobble(v, d + 1.5, 0.25, 0.85, 0.15)
    x += bed_noise(v, d + 1.5, 1200, 3200) * wobble(v, d + 1.5, 0.33, 0.9, 0.0) * 0.4
    return 'weather', d, x


@loop('amb_wind_winter')
def _(v: Voice):
    # Aire frío: limpio, hueco, sin hojas que muevan. Más estrecho y más grave.
    d = 12.0
    x = bed_noise(v, d + 1.5, 300, 1100, order=3) * wobble(v, d + 1.5, 0.08, 0.5, 0.35)
    return 'bed', d, x


@loop('amb_rain_light')
def _(v: Voice):
    # Lluvia fina: un siseo continuo y gotas sueltas sobre hierba y tejado.
    d = 10.0
    hiss = bed_noise(v, d + 1.5, 700, 3200) * wobble(v, d + 1.5, 0.2, 0.25, 0.75)
    return 'weather', d, hiss + drops(v, d + 1.5, per_second=26, level=0.5, hi=3200)


@loop('amb_rain_heavy')
def _(v: Voice):
    # Lluvia fuerte: el siseo gana cuerpo, las gotas se funden en una lámina.
    d = 10.0
    hiss = bed_noise(v, d + 1.5, 400, 3300) * wobble(v, d + 1.5, 0.3, 0.3, 0.7)
    return 'weather', d, hiss * 1.4 + drops(v, d + 1.5, per_second=90, level=0.35, hi=3200)


@loop('amb_storm_bed')
def _(v: Voice):
    # Tormenta **sin truenos**: lluvia pesada, viento grave y un retumbar lejano.
    d = 12.0
    hiss = bed_noise(v, d + 1.5, 350, 3300) * wobble(v, d + 1.5, 0.35, 0.4, 0.6)
    gale = bed_noise(v, d + 1.5, 200, 1400) * wobble(v, d + 1.5, 0.22, 0.9, 0.1) * 0.9
    rumble = lp(v.noise(int((d + 1.5) * SR)), 260, order=3) * wobble(v, d + 1.5, 0.09, 1.0) * 0.5
    return 'weather', d, hiss * 1.3 + gale + rumble + drops(v, d + 1.5, per_second=70, level=0.3, hi=3200)


@loop('amb_snow_hush')
def _(v: Voice):
    # Nieve: el aire amortiguado, que es **casi** silencio. Sin gotas.
    d = 12.0
    x = bed_noise(v, d + 1.5, 320, 900, order=3) * wobble(v, d + 1.5, 0.07, 0.4, 0.5)
    return 'bed', d, x * 0.8


@loop('amb_river')
def _(v: Voice):
    # Corriente tranquila: agua sobre piedra, con burbujeo suelto.
    d = 12.0
    flow = bed_noise(v, d + 1.5, 350, 2600) * wobble(v, d + 1.5, 0.28, 0.2, 0.8)
    body = bed_noise(v, d + 1.5, 200, 900) * wobble(v, d + 1.5, 0.15, 0.3, 0.7) * 0.6
    return 'water', d, flow + body + drops(v, d + 1.5, per_second=7, level=0.22, lo=600, hi=2600)


@loop('amb_waterfall')
def _(v: Voice):
    # Salto de agua: más ancho, más grave y sin pausas. Es lo que no calla.
    d = 10.0
    fall = bed_noise(v, d + 1.5, 320, 3200) * wobble(v, d + 1.5, 0.4, 0.12, 0.88)
    pool = lp(v.noise(int((d + 1.5) * SR)), 420, order=3) * wobble(v, d + 1.5, 0.2, 0.25, 0.75)
    return 'water', d, fall * 1.2 + pool * 0.8


@loop('amb_fire_flame')
def _(v: Voice):
    # Llama viva: un rugido bajo y chasquidos que saltan.
    d = 8.0
    roar = bed_noise(v, d + 1.5, 300, 1500) * wobble(v, d + 1.5, 0.5, 0.45, 0.5)
    return 'fire', d, roar + crackles(v, d + 1.5, per_second=11, level=0.85)


@loop('amb_fire_embers')
def _(v: Voice):
    # Brasas: sin rugido, sólo el chasquido de vez en cuando y un siseo tenue.
    d = 10.0
    bedding = bed_noise(v, d + 1.5, 340, 1200) * wobble(v, d + 1.5, 0.25, 0.3, 0.6) * 0.35
    return 'fire', d, bedding + crackles(v, d + 1.5, per_second=3.2, level=0.55)


def drops(v: Voice, seconds: float, per_second: float, level: float,
          lo: float = 900, hi: float = 4200) -> np.ndarray:
    """Gotas sueltas: impactos cortos repartidos al azar sobre el lecho."""
    n = int(seconds * SR)
    out = np.zeros(n)
    count = int(per_second * seconds)
    for _ in range(count):
        at = int(v.rng.uniform(0, n - 400))
        length = int(v.rng.uniform(0.004, 0.02) * SR)
        tone = v.rng.uniform(lo, hi)
        grain = bp(v.noise(length), tone * 0.7, tone * 1.4) * np.exp(-np.arange(length) / (length * 0.25))
        out[at:at + length] += grain * v.rng.uniform(0.3, 1.0)
    return unit(out, level)


def crackles(v: Voice, seconds: float, per_second: float, level: float) -> np.ndarray:
    """Chasquidos de fuego: pops secos, irregulares, con algún estallido mayor."""
    n = int(seconds * SR)
    out = np.zeros(n)
    for _ in range(int(per_second * seconds)):
        at = int(v.rng.uniform(0, n - 1200))
        big = v.rng.uniform() < 0.18
        length = int(v.rng.uniform(0.003, 0.012 if not big else 0.03) * SR)
        pop = bp(v.noise(length), 400 if big else 900, 3000 if big else 4500)
        pop = pop * np.exp(-np.arange(length) / (length * (0.3 if big else 0.18)))
        out[at:at + length] += pop * (v.rng.uniform(0.7, 1.0) if big else v.rng.uniform(0.15, 0.6))
    return unit(out, level)


# ---- la vida: el día, la noche y la aldea que crece --------------------------------
# **Ninguno de éstos tiene una garganta.** Es la decisión de fondo del 29 sep
# 2026: una voz sintética es lo que más «de dibujos» suena, así que el bullicio
# de una aldea se hace con lo que la aldea **hace** —golpes lejanos, una puerta,
# pasos, un cacharro— y con un rumor de banda estrecha que el oído completa
# solo. Si Vera consigue voces de verdad, sustituyen a esto sin tocar nada más.

def _far(v: Voice, x: np.ndarray, size: float = 0.35, mix: float = 0.5) -> np.ndarray:
    """Lo pone lejos: una cola de valle y los agudos comidos, como hace el aire."""
    n = int(size * SR)
    ir = lp(v.noise(n), 2200) * np.exp(-v.t(size) / (size / 3.5))
    wet = signal.fftconvolve(x, ir)[: len(x)]
    wet = wet / (np.abs(wet).max() + 1e-9) * (np.abs(x).max() + 1e-12)
    return lp(x * (1 - mix) + wet * mix, 3000)


def chirps(v: Voice, seconds: float, per_second: float, level: float,
           lo: float = 2600, hi: float = 5200, notes: int = 3) -> np.ndarray:
    """Un pájaro: dos o tres silbidos cortos que barren de tono, no una nota tenida."""
    n = int(seconds * SR)
    out = np.zeros(n)
    for _ in range(max(1, int(per_second * seconds))):
        at = int(v.rng.uniform(0, n - int(0.5 * SR)))
        base = v.rng.uniform(lo, hi)
        for note in range(v.rng.integers(1, notes + 1)):
            d = v.rng.uniform(0.035, 0.075)
            m = int(d * SR)
            t = np.arange(m) / SR
            # El barrido es lo que hace que sea un pájaro y no un pitido.
            sweep = base * (1 + v.rng.uniform(-0.35, 0.45) * (t / d))
            ph = 2 * np.pi * np.cumsum(sweep) / SR
            env = np.sin(np.pi * t / d) ** 1.5
            call = (np.sin(ph) + 0.22 * np.sin(2 * ph)) * env
            start = at + int(note * v.rng.uniform(0.07, 0.16) * SR)
            if start + m < n:
                out[start:start + m] += call * v.rng.uniform(0.5, 1.0)
    return unit(out, level)


@loop('amb_birds_day')
def _(v: Voice):
    # Dos o tres pájaros lejanos y silencios largos. La dirección que Vera
    # aprobó en septiembre («escasos, lejanos y con aire»), no un bosque entero.
    d = 14.0
    air = bed_noise(v, d + 1.5, 400, 1600) * wobble(v, d + 1.5, 0.1, 0.3, 0.5) * 0.25
    return 'life', d, air + _far(v, chirps(v, d + 1.5, 0.75, 1.0), 0.45, 0.45)


@loop('amb_night_summer')
def _(v: Voice):
    # Grillos: un pulso rápido de ruido en banda, muchos y desacompasados. No
    # es un tono, y por eso no cae en la trampa de la caja de música.
    d = 12.0
    n = int((d + 1.5) * SR)
    out = np.zeros(n)
    for _ in range(9):
        rate = v.rng.uniform(22, 31)           # trinos por segundo
        t = np.arange(n) / SR
        pulse = np.clip(np.sin(2 * np.pi * rate * t), 0, 1) ** 3
        # Cada grillo calla a ratos, que es lo que hace que no sea un zumbido.
        gate = (np.sin(2 * np.pi * v.rng.uniform(0.05, 0.13) * t + v.rng.uniform(0, 6.28)) > -0.2)
        # Medido: con la banda en 3000-5600 el lecho se iba al 40 % de energía
        # por encima de 4 kHz, y eso toda la noche es siseo. Bajada, sigue
        # leyéndose como grillo y cae al 12 %.
        tone = bp(v.noise(n), v.rng.uniform(2400, 3400), v.rng.uniform(3600, 4400))
        out += tone * pulse * gate * v.rng.uniform(0.3, 1.0)
    quiet = bed_noise(v, d + 1.5, 220, 800) * 0.2
    return 'life', d, quiet + unit(_far(v, out, 0.3, 0.35), 0.9)


@loop('amb_night_cold')
def _(v: Voice):
    # Noche de otoño e invierno: casi nada. Un aire quieto y, muy de vez en
    # cuando, algo lejos. El silencio también es un sonido y aquí es el tema.
    d = 14.0
    air = bed_noise(v, d + 1.5, 320, 1000, order=3) * wobble(v, d + 1.5, 0.06, 0.35, 0.5)
    calls = chirps(v, d + 1.5, 0.12, 0.5, lo=700, hi=1400, notes=2)
    return 'life', d, air + _far(v, calls, 0.6, 0.6) * 0.5


# **La aldea, la hoguera y la fiesta no están.** Se fabricaron con actividad
# (golpes, cacharros, un rumor de banda estrecha, palmas) y Vera las tachó las
# cuatro: «horrible, no tiene ningún sentido» (30 sep 2026). La lección va en
# la skill `sonido-del-valle`: **una multitud no se sintetiza**; se graba.


def render_loop(cue: str, variant: str) -> np.ndarray:
    """Un lecho: sin costura, sin fundidos en los bordes y nivelado en la banda del teléfono."""
    family, seconds, raw = LOOP_RECIPES[cue](Voice(cue, variant))
    x = seamless(raw, seconds)
    x = hp(x, 110)
    x = lp(x, LOOP_TOP.get(cue, 4800))
    gain = 10 ** (LOOP_LEVEL[family] / 20) / (band_rms(x) + 1e-12)
    gain = min(gain, PEAK_CEILING / (np.abs(x).max() + 1e-12))
    x = x * gain
    assert np.isfinite(x).all(), f'{cue}/{variant} no es finito'
    return x


CHOSEN: dict[str, str] = {cue: 'a' for cue in list(RECIPES) + list(LOOP_RECIPES)}


def render(cue: str, variant: str) -> np.ndarray:
    if cue in LOOP_RECIPES:
        return render_loop(cue, variant)
    family, dur, x = RECIPES[cue](Voice(cue, variant))
    y = master(x, family, dur)
    assert np.isfinite(y).all(), f'{cue}/{variant} no es finito'
    return y


def write_wav(path: str, x: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, x.astype(np.float32), SR, subtype='PCM_16')


def write_mp3(path: str, x: np.ndarray, quality: float = 0.0) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # `compression_level` 0 es la mejor calidad de LAME: a este tamaño de
    # fichero la diferencia es de un par de kilobytes.
    sf.write(path, x.astype(np.float32), SR, format='MP3', compression_level=quality)


def stamp() -> int:
    """Reescribe la huella de cada fichero en `CUE_FILES`. Devuelve cuántas cambió."""
    with open(SOUND_TS, encoding='utf-8') as fh:
        source = fh.read()
    changed = 0

    def restamp(match: re.Match) -> str:
        nonlocal changed
        name = match.group(2)
        path = os.path.join(OUT_GAME, name)
        if not os.path.exists(path):
            return match.group(0)
        with open(path, 'rb') as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()[:8]
        new = f"{match.group(1)}'{name}?v={digest}'"
        changed += new != match.group(0)
        return new

    # Dos formas: la de un toque (`ui_panel_open: '...'`) y la de un lecho
    # (`amb_river: { file: '...', seconds: 12 }`). Las dos llevan huella, y
    # olvidar la segunda fue el fallo del 29 sep: los bucles se cambiaron y no
    # habrían llegado a un teléfono que ya tuviera los viejos.
    for pattern in (r"(^  [a-z_]+: )'([a-z_]+\.mp3)(?:\?v=[0-9a-f]+)?'",
                    r"(^  [a-z_]+: \{ file: )'([a-z_]+\.mp3)(?:\?v=[0-9a-f]+)?'"):
        source = re.sub(pattern, restamp, source, flags=re.M)
    with open(SOUND_TS, 'w', encoding='utf-8') as fh:
        fh.write(source)
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--audition', action='store_true', help='escribe también las tres variantes de cada una')
    parser.add_argument('--only', nargs='*', help='sólo estos identificadores')
    parser.add_argument('--stamp', action='store_true', help='sólo sellar los ficheros que ya hay')
    args = parser.parse_args()
    if args.stamp:
        print(f'{stamp()} huellas cambiadas en src/ui/sound.ts')
        return
    cues = args.only or list(RECIPES) + list(LOOP_RECIPES)
    for cue in cues:
        x = render(cue, CHOSEN[cue])
        # Un lecho es ruido que suena a -35 dB durante minutos: el detalle fino
        # que paga un bitrate alto no se oye, y sí se nota en lo que pesa.
        write_mp3(os.path.join(OUT_GAME, f'{cue}.mp3'), x, 0.85 if cue in LOOP_RECIPES else 0.0)
        print(f"{cue:<26} {CHOSEN[cue]}  {len(x) / SR:.2f} s  pico {20 * np.log10(np.abs(x).max() + 1e-12):.1f} dBFS")
        if args.audition:
            for variant in VARIANTS:
                y = x if variant == CHOSEN[cue] else render(cue, variant)
                base = os.path.join(OUT_AUDITION, f'{cue}-{variant}')
                write_wav(base + '.wav', y)
                write_mp3(base + '.mp3', y)
    print(f'{stamp()} huellas cambiadas en src/ui/sound.ts')
    if args.audition:
        with open(os.path.join(OUT_AUDITION, 'index.json'), 'w') as fh:
            json.dump({'variants': list(VARIANTS), 'chosen': CHOSEN, 'cues': cues}, fh, indent=2)


if __name__ == '__main__':
    main()
