#!/usr/bin/env python3
"""Comparaciones «antes/después» a escala nativa (ronda AN-4).

Lee fotogramas ya capturados (`<carpeta>/frames/NNNN.png`, 390×844) y, por cada
par, escribe en esta misma carpeta:

  <nombre>-native.gif      dos paneles 1:1 (izquierda «antes», derecha «después»)
  <nombre>-native-x3.gif   lo mismo con cada panel ampliado ×3 (NEAREST)
  <nombre>-strip.png       tira de contactos: antes arriba, después abajo, ×2 (NEAREST)

No captura nada, no inventa fotogramas y no escribe fuera de esta carpeta. Un par
cuya carpeta no existe, o que no llega a los fotogramas pedidos, se salta y se dice.
Además imprime un diagnóstico de cada par (fotogramas negros, duplicados, saltos,
alineación de las trazas, personaje dentro del recorte); no escribe nada con él.

Uso (desde cualquier directorio):
    python3 artifacts/graphics/AN-4/compare/build-compare.py [nombre-de-par ...]
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Este fichero vive en <raíz>/artifacts/graphics/AN-4/compare/: la raíz se deduce de
# ahí y todas las rutas de abajo son relativas a ella.
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
GRAPHICS = ROOT / "artifacts" / "graphics"

NEAREST = Image.Resampling.NEAREST
SIDES = ("antes", "después")

CENTRE = (0.5, 0.5)        # centro del recorte, fracción del fotograma (igual que strip.py)
BAND = 14                  # alto de la banda de etiquetas encima de los paneles, px
GAP = 4                    # separador vertical entre paneles, px
GAP_COLOUR = (128, 128, 128)
BLACK, WHITE = (0, 0, 0), (255, 255, 255)
# Grises que la paleta del GIF conserva exactos: negro de la banda, blanco del texto,
# el separador y los grises intermedios del borde suavizado de las letras.
RESERVED = tuple((v, v, v) for v in (0, 32, 64, 96, 128, 160, 192, 224, 255))

STRIP_COUNT = 12           # fotogramas por fila de la tira
STRIP_SCALE = 2            # ampliación de cada casilla de la tira
STRIP_GUTTER = 2           # hueco entre casillas y entre filas de la tira, px

# Umbrales del diagnóstico (no afectan a los ficheros que se escriben).
DARK_MEAN = 10.0           # luma media (0..255) por debajo de la cual un fotograma es «negro»
FLAT_STD = 3.0             # desviación típica por debajo de la cual un recorte es «liso»
JUMP_FACTOR = 3.0          # diferencia consecutiva > factor × mediana = salto; < mediana / factor = parada
EDGE_MARGIN = 24           # margen mínimo (px) del ancla del personaje al borde del recorte


@dataclass(frozen=True)
class Pair:
    name: str
    before: str            # carpeta «antes», relativa a artifacts/graphics/
    after: str             # carpeta «después», relativa a artifacts/graphics/
    fps: int               # cadencia de la captura: fija la duración de cada fotograma del GIF
    crop: int              # lado del recorte 1:1 alrededor del centro, px
    first: int             # primer fotograma pedido
    count: int             # cuántos fotogramas se piden desde `first`
    strict: bool           # True: si faltan fotogramas de los pedidos, el par se salta
    person: int | None     # id del personaje que sigue la cámara (sólo para el diagnóstico)


PAIRS = [
    Pair("walk-adulto-seed11", "AN-0/baseline/walk-seed11-y21-follow13",
         "AN-1/after/walk-seed11-y21-follow13", fps=15, crop=160, first=30, count=30,
         strict=True, person=13),
    Pair("walk-nino-seed7", "AN-1/before/walk-seed7-y60-child242",
         "AN-1/after/walk-seed7-y60-child242", fps=15, crop=160, first=30, count=30,
         strict=True, person=242),
    Pair("walk-adulto-seed7", "AN-1/before/walk-seed7-y60-follow208",
         "AN-1/after/walk-seed7-y60-follow208", fps=15, crop=160, first=30, count=30,
         strict=True, person=208),
    Pair("plaza-seed11", "AN-0/baseline/wide-seed11-y21",
         "AN-2/after/wide-seed11-y21", fps=2, crop=260, first=0, count=40,
         strict=False, person=None),   # «40 fotogramas, o los que haya»
    # AN-4 · la villa 7/60 al encuadre de reposo: antes (GLB de G-17 en la página
    # «antes», a 390×844: la toma de AN-0 era de 331×717 y no casa) y después (AN-4).
    Pair("plaza-seed7", "AN-1/before/wide-seed7-y60",
         "AN-4/after/wide-seed7-y60", fps=2, crop=260, first=0, count=40,
         strict=False, person=None),
]


# --------------------------------------------------------------------------- entrada

def frame_numbers(folder: Path) -> set[int]:
    frames = folder / "frames"
    if not frames.is_dir():
        return set()
    return {int(p.stem) for p in frames.glob("*.png") if p.stem.isdigit()}


def plan(pair: Pair) -> tuple[list[int], str | None]:
    """Fotogramas a usar (los que existen en las dos carpetas) o el motivo de saltar el par."""
    folders = {"antes": GRAPHICS / pair.before, "después": GRAPHICS / pair.after}
    for side, folder in folders.items():
        if not folder.is_dir():
            return [], f"la carpeta «{side}» no existe ({folder.relative_to(ROOT)})"
    have = frame_numbers(folders["antes"]) & frame_numbers(folders["después"])
    wanted = range(pair.first, pair.first + pair.count)
    indices = [i for i in wanted if i in have]
    if not indices:
        return [], f"ningún fotograma de {wanted.start}..{wanted.stop - 1} existe en las dos carpetas"
    if pair.strict and len(indices) < pair.count:
        return [], (f"sólo hay {len(indices)} de los {pair.count} fotogramas pedidos "
                    f"({wanted.start}..{wanted.stop - 1}) en las dos carpetas")
    return indices, None


def load_rgb(folder: Path, index: int) -> Image.Image:
    """Carga frames/NNNN.png. Las capturas son opacas; si no lo fueran, se aplanan sobre negro."""
    with Image.open(folder / "frames" / f"{index:04d}.png") as im:
        im.load()
        if im.mode == "RGB":
            return im.copy()
        rgba = im.convert("RGBA")
        flat = Image.new("RGB", rgba.size, BLACK)
        flat.paste(rgba, mask=rgba.getchannel("A"))
        return flat


def crop_box(frame_size: tuple[int, int], side: int) -> tuple[int, int, int, int]:
    """Recorte side×side alrededor del centro; misma cuenta que strip.py."""
    w, h = frame_size
    x0, y0 = int(w * CENTRE[0] - side / 2), int(h * CENTRE[1] - side / 2)
    return (x0, y0, x0 + side, y0 + side)


@dataclass
class Loaded:
    box: tuple[int, int, int, int]
    crops: dict[str, dict[int, Image.Image]]           # lado -> fotograma -> recorte 1:1
    luma: dict[str, dict[int, tuple[float, float]]]    # lado -> fotograma -> (media, desviación)
    identical_full: list[int]                          # fotogramas completos idénticos antes/después


def load_pair(pair: Pair, indices: list[int]) -> Loaded:
    folders = {"antes": GRAPHICS / pair.before, "después": GRAPHICS / pair.after}
    crops: dict[str, dict[int, Image.Image]] = {s: {} for s in SIDES}
    luma: dict[str, dict[int, tuple[float, float]]] = {s: {} for s in SIDES}
    identical_full: list[int] = []
    box = None
    for i in indices:
        full = {s: load_rgb(folders[s], i) for s in SIDES}
        if full["antes"].size != full["después"].size:
            if pair.strict:
                raise SystemExit(f"{pair.name}: el fotograma {i} tiene distinto tamaño antes/después")
            # AN-4 · el empaquetado «antes» (código de d82bd84) captura a 331×717
            # aunque se le pida 390×844 (su adaptativa bajaba la resolución bajo
            # SwiftShader): para el plano general se reescala al tamaño del
            # «después» y se dice; no vale para medir píxeles, sí para mirar.
            full["antes"] = full["antes"].resize(full["después"].size, Image.LANCZOS)
        box = box or crop_box(full["antes"].size, pair.crop)
        for s, im in full.items():
            grey = np.asarray(im.convert("L"), dtype=np.float32)
            luma[s][i] = (float(grey.mean()), float(grey.std()))
            crops[s][i] = im.crop(box)
        if np.array_equal(np.asarray(full["antes"]), np.asarray(full["después"])):
            identical_full.append(i)
    return Loaded(box, crops, luma, identical_full)


# --------------------------------------------------------------------------- salida

# La fuente por defecto de PIL (Aileron reducido) no trae acentos: una «é» sale como un
# cuadrado. Se pinta la letra sin acento y el acento se añade encima, píxel a píxel.
ACUTE = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u"}


def plain(text: str) -> str:
    return "".join(ACUTE.get(ch, ch) for ch in text)


def text_width(draw: ImageDraw.ImageDraw, text: str, font) -> float:
    return draw.textlength(plain(text), font=font)


def draw_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font, fill=WHITE) -> None:
    """Texto con la fuente por defecto de PIL; las vocales con acento agudo llevan el suyo dibujado."""
    if any(ord(ch) > 127 and ch not in ACUTE for ch in text):
        raise ValueError(f"la fuente por defecto no dibuja {text!r}")
    x, y = xy
    draw.text((x, y), plain(text), font=font, fill=fill)
    for k, ch in enumerate(text):
        if ch in ACUTE:
            left = x + font.getlength(plain(text[:k]))
            centre = round(left + font.getlength(ACUTE[ch]) / 2)
            draw.point([(centre - 1, y + 3), (centre, y + 2), (centre + 1, y + 1)], fill=fill)   # «/» de 3 px


def side_by_side(before: Image.Image, after: Image.Image, scale: int, font) -> Image.Image:
    """Lienzo «antes | después»: cada panel ×scale (NEAREST), etiquetas encima y separador."""
    panel = before.width * scale
    canvas = Image.new("RGB", (2 * panel + GAP, BAND + panel), BLACK)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((panel, 0, panel + GAP - 1, canvas.height - 1), fill=GAP_COLOUR)
    for slot, (label, crop) in enumerate((("antes", before), ("después", after))):
        left = slot * (panel + GAP)
        canvas.paste(crop if scale == 1 else crop.resize((panel, panel), NEAREST), (left, BAND))
        text_w = round(text_width(draw, label, font))
        draw_text(draw, (left + (panel - text_w) // 2, 0), label, font)
    return canvas


def shared_palette(pair: Pair, loaded: Loaded, indices: list[int]) -> np.ndarray:
    """Paleta adaptativa (corte por la mediana) común a todos los fotogramas del GIF.

    Sale de los recortes de las dos mitades juntos, así que «antes» y «después» se
    cuantifican exactamente igual: ninguna diferencia de color viene del codificador.
    """
    side = pair.crop
    stack = Image.new("RGB", (2 * side, side * len(indices)))
    for row, i in enumerate(indices):
        stack.paste(loaded.crops["antes"][i], (0, row * side))
        stack.paste(loaded.crops["después"][i], (side, row * side))
    adaptive = stack.quantize(colors=256 - len(RESERVED), method=Image.Quantize.MEDIANCUT)
    flat = adaptive.getpalette() or []
    used = [k for k, n in enumerate(adaptive.histogram()) if n]
    colours = [tuple(flat[3 * k:3 * k + 3]) for k in used]
    colours += [c for c in RESERVED if c not in colours]
    return np.array(colours, dtype=np.int32)


def to_indexed(canvas: Image.Image, colours: np.ndarray) -> Image.Image:
    """Cada píxel al color más cercano de la paleta (euclídea, sin tramado, sin caché)."""
    rgb = np.asarray(canvas, dtype=np.int32)
    packed = ((rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]).reshape(-1)
    uniq, inverse = np.unique(packed, return_inverse=True)
    uniq_rgb = np.stack([(uniq >> 16) & 255, (uniq >> 8) & 255, uniq & 255], axis=1).astype(np.float32)
    pal = colours.astype(np.float32)
    # |a-b|² = |a|² + |b|² - 2a·b, exacto en float32 (todo son enteros < 2^24)
    dist = (uniq_rgb ** 2).sum(1)[:, None] + (pal ** 2).sum(1)[None, :] - 2.0 * uniq_rgb @ pal.T
    nearest = dist.argmin(axis=1).astype(np.uint8)
    indexed = nearest[inverse.reshape(-1)]
    out = Image.frombytes("P", canvas.size, indexed.tobytes())
    flat = [int(v) for c in colours for v in c]
    out.putpalette(flat + [0] * (768 - len(flat)))
    return out


def gif_durations(count: int, fps: int) -> list[int]:
    """Duración de cada fotograma en ms. El GIF sólo cuenta en centésimas (66,7 ms no cabe):
    se reparte el redondeo para que el bucle entero dure count·1000/fps."""
    step = 1000.0 / fps
    edges = [round(k * step / 10) * 10 for k in range(count + 1)]
    return [edges[k + 1] - edges[k] for k in range(count)]


def write_gif(path: Path, pair: Pair, loaded: Loaded, indices: list[int],
              colours: np.ndarray, scale: int, font) -> list[Image.Image]:
    frames = [to_indexed(side_by_side(loaded.crops["antes"][i], loaded.crops["después"][i], scale, font),
                         colours) for i in indices]
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=gif_durations(len(frames), pair.fps),
                   loop=0, optimize=True)
    return frames


def pick_regular(indices: list[int], count: int) -> list[int]:
    """`count` fotogramas a intervalos regulares que incluyen el primero y el último."""
    if len(indices) <= count:
        return list(indices)
    picks = np.linspace(indices[0], indices[-1], count).round().astype(int)
    return [min(indices, key=lambda i: abs(i - int(p))) for p in picks]


def contact_strip(pair: Pair, loaded: Loaded, indices: list[int], font) -> Image.Image:
    """Dos filas (antes arriba, después abajo); cada casilla, el recorte 1:1 ×2 con su número."""
    picks = pick_regular(indices, STRIP_COUNT)
    cell = pair.crop * STRIP_SCALE
    row_h = BAND + cell
    width = len(picks) * cell + (len(picks) - 1) * STRIP_GUTTER
    sheet = Image.new("RGB", (width, 2 * row_h + STRIP_GUTTER), GAP_COLOUR)
    draw = ImageDraw.Draw(sheet)
    for r, (side, folder) in enumerate((("antes", pair.before), ("después", pair.after))):
        top = r * (row_h + STRIP_GUTTER)
        draw.rectangle((0, top, width - 1, top + BAND - 1), fill=BLACK)
        draw_text(draw, (4, top), f"{side}   {folder}", font)
        for c, i in enumerate(picks):
            left, y = c * (cell + STRIP_GUTTER), top + BAND
            sheet.paste(loaded.crops[side][i].resize((cell, cell), NEAREST), (left, y))
            tag = f"{i:04d}"
            draw.rectangle((left, y, left + round(draw.textlength(tag, font=font)) + 5, y + 12), fill=BLACK)
            draw.text((left + 3, y), tag, font=font, fill=WHITE)
    return sheet


# --------------------------------------------------------------------------- diagnóstico

def report(label: str, found: list, ok_text: str = "ninguno") -> str:
    return f"  [!] {label}: {found}" if found else f"  ok  {label}: {ok_text}"


def diagnose(pair: Pair, indices: list[int], loaded: Loaded) -> list[str]:
    lines = [f"  recorte {pair.crop}×{pair.crop} en x={loaded.box[0]} y={loaded.box[1]} "
             f"(fotogramas {indices[0]}..{indices[-1]}, {len(indices)})"]
    arr = {s: [np.asarray(loaded.crops[s][i], dtype=np.int16) for i in indices] for s in SIDES}
    for s in SIDES:
        lines.append(report(f"{s}: fotogramas negros (luma media < {DARK_MEAN:g})",
                            [i for i in indices if loaded.luma[s][i][0] < DARK_MEAN]))
        lines.append(report(f"{s}: recortes lisos (desviación < {FLAT_STD:g})",
                            [i for i, a in zip(indices, arr[s]) if a.std() < FLAT_STD]))
        steps = [float(np.abs(arr[s][k] - arr[s][k - 1]).mean()) for k in range(1, len(indices))]
        med = float(np.median(steps)) if steps else 0.0
        lines.append(report(f"{s}: recortes idénticos al anterior",
                            [indices[k] for k, d in enumerate(steps, 1) if d == 0]))
        lines.append(report(f"{s}: saltos/paradas entre consecutivos (x{JUMP_FACTOR:g} la mediana)",
                            [indices[k] for k, d in enumerate(steps, 1)
                             if med > 0 and (d > JUMP_FACTOR * med or (0 < d < med / JUMP_FACTOR))],
                            f"ninguno; dif. media consecutiva {min(steps):.1f}/{med:.1f}/{max(steps):.1f} (mín/med/máx)"
                            if steps else "ninguno"))
    frac = [100.0 * float((a != b).any(axis=2).mean()) for a, b in zip(arr["antes"], arr["después"])]
    lines.append(report("recortes idénticos antes/después",
                        [i for i, a, b in zip(indices, arr["antes"], arr["después"]) if np.array_equal(a, b)],
                        f"ninguno; píxeles distintos {min(frac):.2f}% / {float(np.median(frac)):.2f}% / {max(frac):.2f}% (mín/med/máx)"))
    lines.append(report("fotogramas completos idénticos antes/después", loaded.identical_full))
    lines += trace_notes(pair, indices, loaded.box)
    return lines


def trace_notes(pair: Pair, indices: list[int], box: tuple[int, int, int, int]) -> list[str]:
    traces = {}
    notes = []
    for s, folder in zip(SIDES, (pair.before, pair.after)):
        path = GRAPHICS / folder / "trace.json"
        if not path.is_file():
            return [f"  [!] {s}: no hay trace.json, no se comprueba la alineación"]
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("errors"):
            notes.append(f"  [!] {s}: la traza registra errores: {data['errors']}")
        traces[s] = {f["file"]: f for f in data["frames"]}
    frames = {s: [traces[s].get(f"frames/{i:04d}.png") for i in indices] for s in SIDES}
    missing = [i for i, fb, fa in zip(indices, frames["antes"], frames["después"]) if fb is None or fa is None]
    if missing:
        return notes + [f"  [!] fotogramas sin entrada en la traza: {missing}"]
    ticks = {s: sorted({f["engineTick"] for f in frames[s]}) for s in SIDES}
    notes.append(f"  ok  tick del motor antes {ticks['antes']} / después {ticks['después']}" if ticks["antes"] == ticks["después"]
                 else f"  [!] el tick del motor difiere: antes {ticks['antes']} después {ticks['después']}")
    x0, y0, x1, y1 = box

    def rendered(f):
        return {p["id"]: p for p in f["life"]["renderedPeople"]}

    delta = 0.0
    for fb, fa in zip(frames["antes"], frames["después"]):
        rb, ra = rendered(fb), rendered(fa)
        delta = max([delta] + [max(abs(rb[k]["x"] - ra[k]["x"]), abs(rb[k]["z"] - ra[k]["z"])) for k in rb if k in ra])
    notes.append(f"  {'ok ' if delta < 1e-6 else '[!]'} posiciones de los cuerpos antes/después: máx |Δ| = {delta:.2e} "
                 f"(cero = los fotogramas están alineados en el tiempo)")
    if pair.person is not None:
        pid, anchors, clips, gone = pair.person, [], [], []
        for i, fb, fa in zip(indices, frames["antes"], frames["después"]):
            person = next((p for p in fa["life"]["people"] if p["id"] == pid), None)
            clip_b = rendered(fb).get(pid, {}).get("clip")
            clip_a = rendered(fa).get(pid, {}).get("clip")
            if person is None:
                gone.append(i)
                continue
            anchors.append((person["screen"]["x"], person["screen"]["y"]))
            clips.append((clip_b, clip_a))
        notes.append(report(f"personaje {pid} ausente de la traza", gone))
        if anchors:
            xs, ys = [a[0] for a in anchors], [a[1] for a in anchors]
            margin = min(min(xs) - x0, x1 - max(xs), min(ys) - y0, y1 - max(ys))
            notes.append(f"  {'ok ' if margin >= EDGE_MARGIN else '[!]'} personaje {pid}: ancla x {min(xs):.1f}..{max(xs):.1f} "
                         f"y {min(ys):.1f}..{max(ys):.1f}; margen mínimo al borde del recorte {margin:.1f} px")
            notes.append(report(f"personaje {pid}: clip distinto antes/después", [c for c in clips if c[0] != c[1]],
                                f"ninguno (clips antes {sorted({c[0] for c in clips})}, después {sorted({c[1] for c in clips})})"))
    else:
        counts = {s: [sum(1 for p in f["life"]["people"] if x0 <= p["screen"]["x"] < x1 and y0 <= p["screen"]["y"] < y1)
                      for f in frames[s]] for s in SIDES}
        notes.append("  ok  personas con el ancla dentro del recorte (mín/med/máx): " + ", ".join(
            f"{s} {min(v)}/{int(np.median(v))}/{max(v)}" for s, v in counts.items()))
    return notes


# --------------------------------------------------------------------------- verificación

def inspect_output(path: Path) -> dict:
    info = {"path": path.relative_to(ROOT).as_posix(), "bytes": os.path.getsize(path)}
    with Image.open(path) as im:
        info["size"] = im.size
        if path.suffix == ".gif":
            info["loop"] = im.info.get("loop")
            info["stored"] = getattr(im, "n_frames", 1)
            delays = []
            for k in range(info["stored"]):
                im.seek(k)
                delays.append(im.info.get("duration", 0))
            info["total_ms"], info["delays"] = sum(delays), sorted(set(delays))
    return info


def gif_matches(path: Path, frames: list[Image.Image]) -> str:
    """Decodifica el GIF escrito y lo compara con los fotogramas indexados que se le dieron."""
    with Image.open(path) as gif:
        if getattr(gif, "n_frames", 1) != len(frames):
            return "no comparable (Pillow fundió fotogramas idénticos)"
        for k, expected in enumerate(frames):
            gif.seek(k)
            if not np.array_equal(np.asarray(gif.convert("RGB")), np.asarray(expected.convert("RGB"))):
                return f"DIFIERE en el fotograma {k}"
    return "idéntico a los fotogramas indexados"


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    names = {p.name for p in PAIRS}
    wanted = set(argv[1:])
    if wanted - names:
        print(f"pares desconocidos: {sorted(wanted - names)}; los hay: {sorted(names)}")
        return 2
    font = ImageFont.load_default()      # la fuente por defecto de PIL, como se pidió
    produced: list[Path] = []
    skipped: list[tuple[str, str]] = []
    gif_frames: dict[Path, list[Image.Image]] = {}
    for pair in PAIRS:
        if wanted and pair.name not in wanted:
            continue
        indices, why = plan(pair)
        print(f"\n== {pair.name}: {pair.before}  ->  {pair.after}")
        if why:
            print(f"  SALTADO: {why}")
            skipped.append((pair.name, why))
            continue
        loaded = load_pair(pair, indices)
        for line in diagnose(pair, indices, loaded):
            print(line)
        colours = shared_palette(pair, loaded, indices)
        for scale, suffix in ((1, "native"), (3, "native-x3")):
            path = HERE / f"{pair.name}-{suffix}.gif"
            gif_frames[path] = write_gif(path, pair, loaded, indices, colours, scale, font)
            produced.append(path)
        path = HERE / f"{pair.name}-strip.png"
        contact_strip(pair, loaded, indices, font).save(path, optimize=True)
        produced.append(path)
        print("  hecho: " + ", ".join(p.name for p in produced[-3:]))

    print("\n== verificación de ficheros")
    failures = 0
    for path in produced:
        try:
            info = inspect_output(path)
        except OSError as exc:
            print(f"  FALLO {path.name}: {exc}")
            failures += 1
            continue
        if info["bytes"] <= 0:
            print(f"  FALLO {path.name}: vacío")
            failures += 1
            continue
        extra = ""
        if path.suffix == ".gif":
            extra = (f" fotogramas_guardados={info['stored']} bucle={info['loop']} duración_total={info['total_ms']}ms "
                     f"retardos={info['delays']} decodificado: {gif_matches(path, gif_frames[path])}")
        print(f"  {info['path']}  {info['bytes']} bytes  {info['size'][0]}x{info['size'][1]}{extra}")
    if skipped:
        print("\n== pares saltados")
        for name, why in skipped:
            print(f"  {name}: {why}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
