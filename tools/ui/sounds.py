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
LEVEL = {'tick': -24.0, 'nav': -21.0, 'confirm': -19.0, 'call': -18.0, 'stinger': -18.0}
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
CHOSEN: dict[str, str] = {cue: 'a' for cue in RECIPES}


def render(cue: str, variant: str) -> np.ndarray:
    family, dur, x = RECIPES[cue](Voice(cue, variant))
    y = master(x, family, dur)
    assert np.isfinite(y).all(), f'{cue}/{variant} no es finito'
    return y


def write_wav(path: str, x: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, x.astype(np.float32), SR, subtype='PCM_16')


def write_mp3(path: str, x: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # `compression_level` 0 es la mejor calidad de LAME: a este tamaño de
    # fichero la diferencia es de un par de kilobytes.
    sf.write(path, x.astype(np.float32), SR, format='MP3', compression_level=0.0)


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

    source = re.sub(r"(^  [a-z_]+: )'([a-z_]+\.mp3)(?:\?v=[0-9a-f]+)?'", restamp, source, flags=re.M)
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
    cues = args.only or list(RECIPES)
    for cue in cues:
        x = render(cue, CHOSEN[cue])
        write_mp3(os.path.join(OUT_GAME, f'{cue}.mp3'), x)
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
