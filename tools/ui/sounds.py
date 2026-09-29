"""Los sonidos de la interfaz, fabricados aquí y no grabados.

Por qué existe. El 24 sep 2026 se retiró la síntesis en vivo de U-09 —Web Audio
en el navegador, osciladores y ruido— porque sonaba «malísima», y quedó un hueco
para ficheros (`src/ui/sound.ts`, `CUE_FILES`). El 29 sep Vera eligió que esos
ficheros los fabrique Claude, **fuera del juego**, con la paleta de
`docs/plan-audio.md` §8.0: un gesto orgánico mínimo (papel, fieltro, madera,
cuero, metal viejo) y un cuerpo tonal leve y redondeado. Nada de pitidos, nada
de brillo de máquina tragaperras.

Qué hace. Cada momento de §4.2 y §4.7 que la interfaz usa es una receta de
esta hoja, construida con cuatro familias de instrumento modelado:

  · madera con fieltro — una marimba apagada: parciales 1 · 3,9 · 9,2 que
    mueren deprisa, con un golpe de maza blando debajo;
  · toque de madera — un bloque pequeño, parciales 1 · 2,57 · 4,3, muy corto;
  · cuerda de tripa — Karplus-Strong con pérdida y una caja que la calienta;
  · bronce pequeño — parciales de campana, filtrados para que no brillen.

Y papel: ruido en banda con granos, que es lo que hace que un gesto suene a
pergamino y no a instrumento.

Cada receta sale en **tres variantes** para escuchar y elegir:

  a · la de referencia;
  b · dos semitonos más grave, más oscura y más seca;
  c · dos semitonos más aguda, algo más clara y con un poco más de sala.

La elegida de cada una está en `CHOSEN`; sólo ésa se escribe en
`public/audio/<id>.mp3`, que es lo que carga el juego: en MP3 porque pesa la
cuarta parte que un WAV (unos 200 KB los veinte) y porque libsndfile escribe la
cabecera LAME con el retardo del codificador, así que el golpe empieza donde
empieza —medido: cero muestras de desfase al decodificar—. Cambiar de variante es
cambiar una letra y volver a lanzar esto.

Todo es determinista: el ruido de cada receta sale de una semilla derivada de
su nombre, así que dos pasadas escriben los mismos bytes.

Y la huella. El service worker sirve de la caché primero todo lo que no sea
el documento (§13.4), así que un fichero que cambia sin cambiar de nombre no
llega nunca a un teléfono que ya lo tenía. Por eso cada entrada de `CUE_FILES`
lleva `?v=` y los ocho primeros caracteres del `sha256` del fichero, como los
modelos desde VZ-6; esta herramienta la reescribe al terminar, y
`tests/fast/sound.test.ts` falla si alguna no coincide con el fichero que hay.
Un fichero soltado a mano se sella con `--stamp`.

Uso:
    pip install numpy scipy soundfile
    python tools/ui/sounds.py            # las elegidas → public/audio/*.mp3, y selladas
    python tools/ui/sounds.py --audition # y las tres de cada una, en WAV y MP3,
                                         # → artifacts/audio/ui/
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

SR = 32_000  # El master corta a 9 kHz: 32 kHz sobra y pesa un 27 % menos que 44,1.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_GAME = os.path.join(ROOT, 'public', 'audio')
OUT_AUDITION = os.path.join(ROOT, 'artifacts', 'audio', 'ui')

# Las notas, en un re mayor templado y en el registro cálido (sol 3 a re 5):
# nada por encima de 600 Hz de fundamental, para que un altavoz de móvil no
# lo convierta en un pitido.
NOTE = {
    'A2': 110.00, 'D3': 146.83, 'E3': 164.81, 'F#3': 185.00, 'G3': 196.00, 'A3': 220.00,
    'B3': 246.94, 'C#4': 277.18, 'D4': 293.66, 'E4': 329.63, 'F#4': 369.99, 'G4': 392.00,
    'A4': 440.00, 'B4': 493.88, 'D5': 587.33, 'E5': 659.26,
}

VARIANTS = {
    'a': {'pitch': 1.0, 'bright': 1.0, 'room': 0.12, 'decay': 1.0},
    'b': {'pitch': 2 ** (-2 / 12), 'bright': 0.62, 'room': 0.09, 'decay': 0.85},
    'c': {'pitch': 2 ** (2 / 12), 'bright': 1.25, 'room': 0.17, 'decay': 1.1},
}


class Voice:
    """Los instrumentos de una receta en una variante, con su propio azar."""

    def __init__(self, cue: str, variant: str) -> None:
        seed = int(hashlib.sha256(f'{cue}/{variant}'.encode()).hexdigest()[:8], 16)
        self.rng = np.random.default_rng(seed)
        self.v = VARIANTS[variant]

    # -- utilidades ----------------------------------------------------------

    @staticmethod
    def t(dur: float) -> np.ndarray:
        return np.arange(int(dur * SR)) / SR

    @staticmethod
    def attack(ms: float, n: int) -> np.ndarray:
        a = max(1, int(SR * ms / 1000))
        env = np.ones(n)
        env[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, min(a, n)))[: min(a, n)]
        return env

    def f(self, note: str | float) -> float:
        base = NOTE[note] if isinstance(note, str) else note
        return base * self.v['pitch']

    def noise(self, n: int) -> np.ndarray:
        return self.rng.standard_normal(n)

    # -- instrumentos --------------------------------------------------------

    def modal(self, freq: float, ratios, amps, decays, dur: float, att_ms: float) -> np.ndarray:
        t = self.t(dur)
        out = np.zeros_like(t)
        for r, a, d in zip(ratios, amps, decays):
            fr = freq * r
            if fr > SR / 2.5:
                continue
            out += a * np.sin(2 * np.pi * fr * t + self.rng.uniform(0, 2 * np.pi)) * np.exp(-t / d)
        return out * self.attack(att_ms, len(t))

    def felt(self, note, dur=0.3, damp=1.0, level=1.0) -> np.ndarray:
        """Madera con fieltro: una marimba apagada, con el golpe de la maza."""
        b, k = self.v['bright'], self.v['decay'] * damp
        body = self.modal(self.f(note), [1, 3.93, 9.2], [1, 0.32 * b, 0.07 * b],
                          [0.12 * k, 0.045 * k, 0.016 * k], dur, att_ms=3.0)
        mallet = lp(self.noise(len(body)), 700 + 500 * b) * np.exp(-self.t(dur) / 0.005) * 0.3
        return (body + mallet) * level

    def tap(self, note, dur=0.12, level=1.0) -> np.ndarray:
        """Un bloque de madera pequeño: seco, casi sin tono."""
        b = self.v['bright']
        body = self.modal(self.f(note), [1, 2.57, 4.3], [1, 0.3 * b, 0.1 * b],
                          [0.028, 0.013, 0.007], dur, att_ms=1.0)
        click = bp(self.noise(len(body)), 1200, 3200 + 800 * b) * np.exp(-self.t(dur) / 0.0025) * 0.18 * b
        return (body + click) * level

    def string(self, note, dur=0.8, level=1.0, damp=1.0) -> np.ndarray:
        """Cuerda de tripa pulsada (Karplus-Strong), con la caja que la calienta."""
        freq = self.f(note)
        n = int(dur * SR)
        period = SR / freq
        p = int(period)
        frac = period - p
        # La excitación: ruido filtrado, y pulsada a un octavo de la cuerda
        # (un peine), que le quita el zumbido metálico de la cuerda de acero.
        burst = lp(self.noise(p + 2), 1400 + 1200 * self.v['bright'])
        q = max(1, p // 8)
        burst[q:] -= burst[:-q] * 0.6
        y = np.zeros(n + p + 2)
        y[: p + 2] = burst
        loss = 0.4985 * (0.9975 ** (1 / (damp * self.v['decay'])))
        for i in range(p + 2, n + p + 2):
            # Interpolación lineal del retardo para que la afinación no se vaya.
            j = i - p
            y[i] = loss * ((1 - frac) * (y[j] + y[j - 1]) + frac * (y[j - 1] + y[j - 2]))
        out = y[p + 2:]
        body = bp(out, 180, 900) * 0.5
        out = (out + body) * self.attack(2.5, n)
        return out / (np.abs(out).max() + 1e-9) * level

    def bronze(self, note, dur=1.0, level=1.0) -> np.ndarray:
        """Bronce pequeño e imperfecto: parciales de campana, sin brillo."""
        ratios = [0.5, 1.0, 1.19, 1.51, 2.0, 2.52, 2.99]
        amps = [0.35, 1.0, 0.4, 0.25, 0.28, 0.1, 0.06]
        decays = [0.95, 0.6, 0.42, 0.33, 0.24, 0.14, 0.09]
        freq = self.f(note)
        out = np.zeros(int(dur * SR))
        for r, a, d in zip(ratios, amps, decays):
            # Imperfecta: cada parcial un pelo desafinado, y en pareja batiendo.
            for beat in (-0.3, 0.3):
                out += self.modal(freq * r + beat * r, [1], [a * 0.5],
                                  [d * dur * self.v['decay']], dur, att_ms=3.0)
        hammer = lp(self.noise(len(out)), 900) * np.exp(-self.t(dur) / 0.004) * 0.25
        return lp(out + hammer, 3800 + 900 * self.v['bright']) * level

    def paper(self, dur=0.1, lo=1600, hi=5200, grains=4, level=0.3, sweep=0.0) -> np.ndarray:
        """Pergamino: ruido en banda, a granos, como un roce de dedo."""
        n = int(dur * SR)
        hi = hi * (0.75 + 0.25 * self.v['bright'])
        base = bp(self.noise(n), lo, hi)
        if sweep != 0.0:
            # Un roce que se va: la banda baja (o sube) mientras dura.
            low = bp(self.noise(n), lo * 0.5, hi * 0.5)
            mix = np.linspace(0, 1, n) if sweep < 0 else np.linspace(1, 0, n)
            base = base * (1 - mix) + low * mix
        idx = np.arange(n)
        env = np.zeros(n)
        for _ in range(grains):
            c = self.rng.uniform(0.05, 0.75) * n
            w = self.rng.uniform(0.004, 0.018) * SR
            env += np.exp(-0.5 * ((idx - c) / w) ** 2) * self.rng.uniform(0.5, 1.0)
        out = base * env
        return out / (np.abs(out).max() + 1e-9) * level

    def thump(self, dur=0.12, fc=220, level=0.6, tau=0.018) -> np.ndarray:
        """Un golpe sordo: la mano sobre la mesa, el sello sobre la cera."""
        n = int(dur * SR)
        out = lp(self.noise(n), fc, order=4) * np.exp(-self.t(dur) / tau) * self.attack(2.0, n)
        return out / (np.abs(out).max() + 1e-9) * level

    def coin(self, dur=0.25, level=0.25) -> np.ndarray:
        """Una moneda vieja que toca otra: metal pequeño, apagado."""
        freq = 1850 * self.v['pitch']
        out = self.modal(freq, [1, 1.52, 2.23], [1, 0.5, 0.25], [0.06, 0.035, 0.02], dur, att_ms=0.6)
        return lp(out, 5500) * level

    def room(self, x: np.ndarray, size=0.22) -> np.ndarray:
        """Una sala de madera pequeña, no una catedral."""
        mix = self.v['room']
        n = int(size * SR)
        ir = lp(self.noise(n), 3000) * np.exp(-self.t(size) / (size / 5))
        wet = signal.fftconvolve(x, ir)
        dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
        wet = wet / (np.abs(wet).max() + 1e-9) * np.abs(x).max()
        return dry * (1 - mix) + wet * mix


# -- filtros y montaje ---------------------------------------------------------

def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def peaking(x, fc, gain_db, q=0.8):
    """Un filtro de campana (RBJ): sube o baja una banda sin tocar el resto."""
    a_ = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * fc / SR
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * a_, -2 * np.cos(w0), 1 - alpha * a_]
    a = [1 + alpha / a_, -2 * np.cos(w0), 1 - alpha / a_]
    return signal.lfilter(b, a, x)


def place(*parts: tuple[float, np.ndarray], dur: float) -> np.ndarray:
    out = np.zeros(int(dur * SR))
    for at, x in parts:
        i = int(at * SR)
        j = min(len(out), i + len(x))
        if j > i:
            out[i:j] += x[: j - i]
    return out


# El nivel de cada familia, en dBFS de RMS sobre la parte que suena. La
# navegación es lo más frecuente y va más baja; un hito puede ocupar más.
LEVEL = {'nav': -20.0, 'tick': -23.0, 'confirm': -17.0, 'call': -16.0, 'stinger': -15.0}
PEAK_CEILING_DB = -1.0


def phone_band(x: np.ndarray) -> np.ndarray:
    """Lo que oye un teléfono: su altavoz apenas da nada por debajo de 350 Hz."""
    return bp(x, 350, 6000)


def master(x: np.ndarray, family: str, dur: float) -> np.ndarray:
    x = hp(x, 130)          # por debajo, un altavoz de móvil sólo hace ruido
    x = peaking(x, 180, -4.0, 0.7)   # el barro que en un móvil sólo hace bulto
    x = peaking(x, 2200, 5.0, 0.8)   # la presencia: el toque se oye en un teléfono
    x = lp(x, 9000)         # por encima, sólo fatiga
    n = int(dur * SR)
    x = x[:n] if len(x) >= n else np.concatenate([x, np.zeros(n - len(x))])
    # La RMS de la parte que suena (sobre −40 dB del pico), no la del fichero
    # entero: una cola larga no debe hacer que el golpe suene más fuerte. Y
    # medida **en la banda del teléfono**: dos sonidos igual de fuertes en unos
    # auriculares pueden sonar uno el doble que otro en un iPhone, y el iPhone
    # es donde se juega.
    band = phone_band(x)
    peak = np.abs(x).max() + 1e-12
    active = band[np.abs(x) > peak * 0.01]
    rms = np.sqrt(np.mean(active ** 2)) + 1e-12
    x = x * (10 ** (LEVEL[family] / 20) / rms)
    ceiling = 10 ** (PEAK_CEILING_DB / 20)
    if np.abs(x).max() > ceiling:
        x = x * (ceiling / np.abs(x).max())
    # Entrada y salida limpias: ni un clic al empezar ni al cortar.
    fade_in = min(len(x), int(SR * 0.001))
    x[:fade_in] *= np.linspace(0, 1, fade_in)
    fade_out = min(len(x), int(SR * 0.025))
    x[-fade_out:] *= np.linspace(1, 0, fade_out) ** 2
    return x


# -- las recetas ------------------------------------------------------------------
# Cada una devuelve (familia, duración, señal). La duración es la objetivo de
# `plan-audio.md` §8.1 y §8.7, más la cola que la sala necesita.

Recipe = Callable[[Voice], tuple[str, float, np.ndarray]]
RECIPES: dict[str, Recipe] = {}


def recipe(cue: str):
    def register(fn: Recipe) -> Recipe:
        RECIPES[cue] = fn
        return fn
    return register


@recipe('ui_title_begin')
def _(v: Voice):
    # Una pulsación cálida de madera y una resonancia pequeña que sube.
    x = place((0.0, v.felt('D4', 0.5)), (0.0, v.thump(0.1, 200, 0.25)),
              (0.07, v.string('A4', 0.5, 0.28)), (0.14, v.felt('D5', 0.4, level=0.18)), dur=0.62)
    return 'confirm', 0.62, v.room(x)


@recipe('ui_title_continue')
def _(v: Voice):
    # Un toque grave y familiar, y una subida apenas audible.
    x = place((0.0, v.tap('A3', 0.14)), (0.05, v.felt('E4', 0.32, level=0.22)), dur=0.4)
    return 'confirm', 0.4, v.room(x)


@recipe('ui_panel_open')
def _(v: Voice):
    # El pergamino que se abre y una pulsación de fieltro que sube un poco.
    x = place((0.0, v.paper(0.08, level=0.35)), (0.02, v.felt('A4', 0.28, damp=0.8)),
              (0.06, v.felt('D5', 0.22, damp=0.7, level=0.35)), dur=0.34)
    return 'nav', 0.34, v.room(x)


@recipe('ui_panel_close')
def _(v: Voice):
    # Su pareja: el pliegue, y la pulsación que baja. Más corta y más baja.
    x = place((0.0, v.paper(0.07, 1300, 4200, grains=3, level=0.3, sweep=-1)),
              (0.02, v.felt('D5', 0.2, damp=0.6, level=0.5)), (0.055, v.felt('A4', 0.22, damp=0.7, level=0.8)),
              dur=0.28)
    return 'nav', 0.28, v.room(x) * 0.8


@recipe('ui_tab_change')
def _(v: Voice):
    # Un roce de papel y un tic de fieltro, casi subliminal.
    x = place((0.0, v.paper(0.05, 2000, 5000, grains=2, level=0.5)), (0.008, v.felt('E5', 0.1, damp=0.4, level=0.4)),
              dur=0.14)
    return 'tick', 0.14, x


@recipe('ui_person_select')
def _(v: Voice):
    # Un dedo sobre una tarjeta de retrato y un tic de madera cálido.
    x = place((0.0, v.paper(0.04, 1800, 4500, grains=2, level=0.25)), (0.006, v.tap('F#4', 0.1, 0.6)),
              (0.012, v.felt('F#4', 0.18, damp=0.7, level=0.5)), dur=0.22)
    return 'nav', 0.22, v.room(x)


@recipe('ui_pause')
def _(v: Voice):
    # Dos toques de madera que se asientan hacia abajo y paran.
    x = place((0.0, v.felt('A4', 0.12, damp=0.45)), (0.075, v.felt('E4', 0.16, damp=0.5, level=0.85)), dur=0.24)
    return 'nav', 0.24, x


@recipe('ui_resume')
def _(v: Voice):
    # La pareja de la pausa: los mismos dos toques, abriéndose hacia arriba.
    x = place((0.0, v.felt('E4', 0.12, damp=0.5, level=0.85)), (0.075, v.felt('A4', 0.2, damp=0.6)), dur=0.28)
    return 'nav', 0.28, v.room(x)


@recipe('ui_speed_change')
def _(v: Voice):
    # Un tic de rueda de madera con centro tonal. El juego lo sube de tono en
    # cada velocidad (`SOUND.SPEED_RATES`), así que aquí sólo va el de ×1.
    x = place((0.0, v.tap('D5', 0.08, 0.7)), (0.0, v.felt('D5', 0.1, damp=0.35, level=0.35)), dur=0.12)
    return 'tick', 0.12, x


@recipe('ui_action_success')
def _(v: Voice):
    # La confirmación: una pulsación de maza y otra más aguda y más baja,
    # una quinta arriba. Sin brillo y sin fanfarria.
    x = place((0.0, v.felt('D4', 0.35)), (0.0, v.thump(0.08, 240, 0.2)),
              (0.09, v.felt('A4', 0.34, level=0.55)), dur=0.46)
    return 'confirm', 0.46, v.room(x)


@recipe('ui_action_refused')
def _(v: Voice):
    # Una negativa educada: un toque apagado y otro más grave, más apagado.
    x = place((0.0, v.felt('E4', 0.14, damp=0.4)), (0.0, v.tap('E4', 0.08, 0.35)),
              (0.08, v.felt('B3', 0.2, damp=0.45, level=0.7)), dur=0.3)
    return 'confirm', 0.3, x * 0.85


@recipe('ui_offer_arrives')
def _(v: Voice):
    # Alguien llega por el camino: una campanilla de mano pequeña y lejana,
    # con cuero y madera debajo. No es la campana de la capilla.
    bell = v.bronze('A4', 0.7)
    x = place((0.0, v.thump(0.1, 300, 0.25, tau=0.02)), (0.01, bell),
              (0.012, v.paper(0.06, 700, 2200, grains=3, level=0.12)), dur=0.72)
    return 'call', 0.72, v.room(x, 0.3)


@recipe('ui_offer_accept')
def _(v: Voice):
    # El trato: una bolsa de cuero que se mueve, una moneda y una pulsación cálida.
    pouch = v.paper(0.12, 350, 1800, grains=4, level=0.35)
    x = place((0.0, pouch), (0.07, v.coin(0.22, 0.2)), (0.12, v.felt('G4', 0.3, level=0.9)), dur=0.46)
    return 'confirm', 0.46, v.room(x)


@recipe('ui_offer_decline')
def _(v: Voice):
    # Una tarjeta de pergamino que se retira y un toque de fieltro que baja.
    x = place((0.0, v.paper(0.16, 1200, 4200, grains=5, level=0.3, sweep=-1)),
              (0.1, v.felt('E4', 0.2, damp=0.6, level=0.7)), dur=0.32)
    return 'nav', 0.32, v.room(x)


@recipe('ui_crossroad_opens')
def _(v: Voice):
    # Una pregunta: dos notas de cuerda con un intervalo sin resolver (una
    # segunda mayor, re y mi) y un movimiento de pergamino. Curiosa, no amenaza.
    x = place((0.0, v.paper(0.1, 1200, 4000, grains=3, level=0.12)),
              (0.02, v.string('D4', 0.7, 0.8)), (0.02, v.felt('D4', 0.3, level=0.3)),
              (0.26, v.string('E4', 0.6, 0.7)), (0.26, v.felt('E4', 0.3, level=0.25)), dur=0.86)
    return 'call', 0.86, v.room(x, 0.28)


@recipe('ui_crossroad_decide')
def _(v: Voice):
    # El sello: la cera apretada sobre pergamino, una pulsación grave y una
    # resonancia pequeña que se asienta.
    x = place((0.0, v.thump(0.14, 420, 0.55, tau=0.02)), (0.0, v.paper(0.05, 900, 3000, grains=3, level=0.3)),
              (0.015, v.felt('D4', 0.4, level=0.8)), (0.015, v.felt('D3', 0.3, level=0.3)),
              (0.03, v.string('A4', 0.4, 0.25)), dur=0.5)
    return 'confirm', 0.5, v.room(x)


@recipe('stinger_milestone_minor')
def _(v: Voice):
    # Tres notas pequeñas que suben (re, fa sostenido, la) y acaban suaves,
    # sin cerrar en triunfo.
    x = place((0.0, v.felt('D4', 0.4)), (0.0, v.string('D4', 0.6, 0.45)),
              (0.16, v.felt('F#4', 0.4, level=0.85)), (0.16, v.string('F#4', 0.55, 0.4)),
              (0.32, v.felt('A4', 0.5, level=0.7)), (0.32, v.string('A4', 0.55, 0.35)), dur=0.92)
    return 'stinger', 0.92, v.room(x, 0.3)


@recipe('stinger_milestone_major')
def _(v: Voice):
    # Una nota grave de madera, dos de cuerda que suben por encima y un
    # armónico de bronce pequeño e imperfecto. Importante, nunca grandiosa.
    x = place((0.0, v.felt('D4', 0.9, level=0.8)), (0.0, v.felt('D3', 0.9, level=0.5)),
              (0.0, v.thump(0.12, 300, 0.25)),
              (0.24, v.string('F#4', 0.9, 0.7)), (0.24, v.felt('F#4', 0.4, level=0.35)),
              (0.5, v.string('A4', 0.9, 0.65)), (0.5, v.felt('A4', 0.45, level=0.3)),
              (0.78, v.bronze('D5', 0.75, 0.3)), dur=1.52)
    return 'stinger', 1.52, v.room(x, 0.35)


@recipe('stinger_decade')
def _(v: Voice):
    # Dos notas graves de cuerda separadas por un respiro, y una tercera que
    # se asienta en casa: el tiempo ha pasado y el trabajo ha aguantado.
    x = place((0.0, v.string('A3', 0.6, 0.8)), (0.0, v.felt('A3', 0.3, level=0.3)),
              (0.34, v.string('F#3', 0.6, 0.75)), (0.34, v.felt('F#3', 0.3, level=0.3)),
              (0.66, v.string('D3', 0.5, 0.9)), (0.66, v.felt('D4', 0.5, level=0.45)), dur=1.18)
    return 'stinger', 1.18, v.room(x, 0.3)


@recipe('stinger_century')
def _(v: Voice):
    # Una campana de aldea mediana, con dos cuerdas graves muy bajas debajo.
    # Celebra que se aguantó, no que se ganó.
    x = place((0.0, v.bronze('E4', 2.2, 1.0)), (0.0, v.thump(0.15, 160, 0.3)),
              (0.12, v.string('D3', 1.6, 0.35, damp=1.4)), (0.55, v.string('A2', 1.4, 0.3, damp=1.4)), dur=2.3)
    return 'stinger', 2.3, v.room(x, 0.4)


# La variante que suena en el juego. Todas empiezan en «a», la de referencia,
# hasta que Vera las escuche y elija.
CHOSEN: dict[str, str] = {cue: 'a' for cue in RECIPES}


def render(cue: str, variant: str) -> np.ndarray:
    family, dur, x = RECIPES[cue](Voice(cue, variant))
    return master(x, family, dur)


def write_wav(path: str, x: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, x.astype(np.float32), SR, subtype='PCM_16')


def write_mp3(path: str, x: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # `compression_level` 0 es la mejor calidad de LAME: a este tamaño de
    # fichero la diferencia es de dos kilobytes.
    sf.write(path, x.astype(np.float32), SR, format='MP3', compression_level=0.0)


SOUND_TS = os.path.join(ROOT, 'src', 'ui', 'sound.ts')


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
    report = []
    for cue in cues:
        x = render(cue, CHOSEN[cue])
        write_mp3(os.path.join(OUT_GAME, f'{cue}.mp3'), x)
        report.append({'cue': cue, 'variant': CHOSEN[cue], 'seconds': round(len(x) / SR, 3),
                       'peak_db': round(20 * np.log10(np.abs(x).max() + 1e-12), 1)})
        if args.audition:
            for variant in VARIANTS:
                y = x if variant == CHOSEN[cue] else render(cue, variant)
                base = os.path.join(OUT_AUDITION, f'{cue}-{variant}')
                write_wav(base + '.wav', y)
                write_mp3(base + '.mp3', y)
    for row in report:
        print(f"{row['cue']:<26} {row['variant']}  {row['seconds']:.2f} s  pico {row['peak_db']} dBFS")
    print(f'{stamp()} huellas cambiadas en src/ui/sound.ts')
    if args.audition:
        with open(os.path.join(OUT_AUDITION, 'index.json'), 'w') as fh:
            json.dump({'variants': list(VARIANTS), 'chosen': CHOSEN, 'cues': cues}, fh, indent=2)


if __name__ == '__main__':
    main()
