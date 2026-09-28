"""Genera láminas de propuesta a partir de una captura archivada, sin arrancar el juego."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "laminas-2026-09-28"
OUT.mkdir(exist_ok=True)
SCENE = Image.open(ROOT / "docs/interfaz/2026-09-27/ui/010-valle-despejado.jpg").convert("RGB")
S = 2
W, H = 390 * S, 844 * S
FONT = Path("C:/Windows/Fonts")

def font(size, face="segoeui.ttf"):
    return ImageFont.truetype(str(FONT / face), size * S)

def xy(box):
    return tuple(int(v * S) for v in box)

def rr(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy(box), radius=radius*S, fill=fill,
                           outline=outline, width=width*S)

def txt(draw, x, y, value, size, fill, face="segoeui.ttf", anchor=None):
    draw.text((x*S, y*S), value, font=font(size, face), fill=fill, anchor=anchor)

def line(draw, points, fill, width=1):
    draw.line([(int(x*S), int(y*S)) for x, y in points], fill=fill, width=width*S)

def base():
    return SCENE.resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")

def overlay(im, color, opacity):
    im.alpha_composite(Image.new("RGBA", im.size, (*color, opacity)))

INK = "#302a22"
PAPER = "#eee1c5"
PAPER_LIGHT = "#f7edd8"
BRASS = "#bd9e5b"
TEAL = "#254d4c"
WOOD = "#58412d"
WARM = "#d9c7a6"

def header(im, compact=False):
    d = ImageDraw.Draw(im, "RGBA")
    rr(d, (12, 14, 378, 105 if not compact else 91), 13, (35, 34, 29, 220), (187, 158, 96, 180))
    txt(d, 27, 23, "YEAR 50", 12, WARM, "segoeuib.ttf")
    txt(d, 91, 23, "SPRING  ·  DAY 1", 12, PAPER_LIGHT, "segoeui.ttf")
    d.ellipse(xy((337, 23, 353, 39)), fill=BRASS)
    for dx, dy in ((0,-14),(0,14),(-14,0),(14,0),(-10,-10),(10,-10),(-10,10),(10,10)):
        d.ellipse(xy((344+dx, 30+dy, 346+dx, 32+dy)), fill=BRASS)
    line(d, [(26, 49), (364, 49)], (207, 181, 124, 110))
    vals = [("35", "people"), ("76", "grain"), ("326", "wood"), ("33", "ore"), ("36", "silver")]
    for i, (v, label) in enumerate(vals):
        x = 29 + i * 71
        txt(d, x, 57, v, 18 if not compact else 17, PAPER_LIGHT, "segoeuib.ttf")
        if not compact:
            txt(d, x, 79, label, 9, WARM)

def nav(im, variant="A", selected="Valley"):
    d = ImageDraw.Draw(im, "RGBA")
    if variant == "A":
        rr(d, (12, 767, 378, 830), 17, (27, 35, 32, 188), (204, 180, 129, 115))
        boxes = [(18, 773, 135, 824), (137, 773, 253, 824), (255, 773, 372, 824)]
    else:
        rr(d, (9, 773, 381, 833), 21, (239, 225, 195, 194), (81, 62, 42, 120))
        boxes = [(15, 779, 135, 827), (137, 779, 253, 827), (255, 779, 375, 827)]
    for box, name in zip(boxes, ["Valley", "Chronicle", "People"]):
        active = name == selected
        rr(d, box, 12, TEAL if active else ("#373931" if variant == "A" else "#e1d1b4"),
           BRASS if active else None)
        txt(d, (box[0]+box[2])/2, 798 if variant == "A" else 803, name, 14,
            PAPER_LIGHT if active else (PAPER_LIGHT if variant == "A" else INK),
            "segoeuib.ttf" if active else "segoeui.ttf", "mm")

def context_card(im):
    d = ImageDraw.Draw(im, "RGBA")
    # La punta conserva el vínculo con la casa y se recolocaría en runtime.
    d.polygon([(242*S, 301*S), (260*S, 317*S), (275*S, 298*S)],
              fill=PAPER, outline="#806446")
    rr(d, (35, 160, 355, 302), 8, PAPER, "#806446", 2)
    rr(d, (42, 167, 348, 295), 4, None, "#c5a975")
    txt(d, 55, 180, "Stone house", 22, INK, "georgiab.ttf")
    txt(d, 55, 215, "Raised in Anno 47. Cold in winter,", 14, INK)
    txt(d, 55, 236, "but it will not burn.", 14, INK)
    line(d, [(55, 265), (335, 265)], "#b79c6b")
    txt(d, 55, 273, "Edith Cole", 12, TEAL, "segoeuib.ttf")
    txt(d, 260, 273, "Sound", 12, INK)
    d.ellipse(xy((251, 320, 270, 339)), fill=(247, 237, 216, 70), outline=BRASS, width=2*S)

def board(im):
    overlay(im, (15, 20, 16), 103)
    d = ImageDraw.Draw(im, "RGBA")
    rr(d, (24, 122, 366, 754), 13, WOOD, "#b89558", 3)
    for y in (150, 299, 448, 597, 721):
        line(d, [(31, y), (358, y)], "#7d5a37", 2)
    rr(d, (127, 135, 264, 174), 3, PAPER_LIGHT, "#987a4b")
    txt(d, 195, 154, "Notices", 19, INK, "georgiab.ttf", "mm")
    d.ellipse(xy((326, 135, 358, 167)), fill="#743e32", outline=BRASS, width=2*S)
    txt(d, 342, 150, "×", 21, PAPER_LIGHT, anchor="mm")
    notices = [
        ("Mushrooms in the birchwood", "The wood is generous after rain.", "1 week · free", "2", 186),
        ("The high seam", "Ore in the rocks above the gorge.", "3 weeks · 8 silver · risky", "3", 353),
        ("Market at Ashford", "Goods down the road, silver back.", "4 weeks · 15 silver", "2", 520),
    ]
    for title, desc, meta, count, y in notices:
        rr(d, (42, y, 348, y+146), 4, PAPER_LIGHT, "#c1a87c")
        d.ellipse(xy((189, y-5, 201, y+7)), fill="#39291d")
        txt(d, 55, y+15, title, 16, INK, "georgiab.ttf")
        txt(d, 55, y+44, desc, 12, "#6d5b48", "segoeuisl.ttf")
        txt(d, 55, y+77, meta, 12, INK)
        rr(d, (158, y+99, 190, y+132), 5, WOOD, "#3d2a1f")
        txt(d, 174, y+115, "−", 19, PAPER_LIGHT, anchor="mm")
        txt(d, 208, y+115, count, 16, INK, "segoeuib.ttf", "mm")
        rr(d, (225, y+99, 257, y+132), 5, WOOD, "#3d2a1f")
        txt(d, 241, y+115, "+", 18, PAPER_LIGHT, anchor="mm")
        rr(d, (267, y+98, 336, y+133), 5, TEAL, BRASS, 2)
        txt(d, 301, y+114, "Send", 13, PAPER_LIGHT, "segoeuib.ttf", "mm")
    txt(d, 44, 690, "No one is away.", 12, PAPER_LIGHT)

def sheet(im):
    d = ImageDraw.Draw(im, "RGBA")
    # El valle queda visible hasta ~49 % de la pantalla.
    rr(d, (0, 409, 390, 844), 19, PAPER, "#b6955c", 2)
    rr(d, (0, 409, 390, 451), 16, (75, 57, 37, 245), None)
    txt(d, 24, 422, "Chronicle", 20, PAPER_LIGHT, "georgiab.ttf")
    txt(d, 350, 427, "×", 22, PAPER_LIGHT, anchor="mm")
    txt(d, 27, 468, "YEAR 50  /  SPRING", 10, TEAL, "segoeuib.ttf")
    txt(d, 27, 493, "A wall around the valley", 22, INK, "georgiab.ttf")
    line(d, [(27, 533), (363, 533)], "#aa8a54")
    txt(d, 27, 552, "They are setting the stone wall.", 15, INK)
    txt(d, 27, 577, "The work will take another season.", 15, INK)
    rr(d, (27, 643, 363, 707), 8, TEAL, BRASS, 2)
    txt(d, 195, 674, "Open the cart", 17, PAPER_LIGHT, "segoeuib.ttf", "mm")

def save(im, name):
    im.convert("RGB").save(OUT / name, quality=95)

im = base(); header(im); nav(im); save(im, "01-valle-hud-a.png")
im = base(); header(im, compact=True); nav(im, "B"); save(im, "02-valle-hud-b.png")
im = base(); header(im); nav(im); context_card(im); save(im, "03-lectura-a1.png")
im = base(); header(im); nav(im); board(im); save(im, "04-tablon-b1.png")
im = base(); header(im); nav(im, selected="Chronicle"); sheet(im); save(im, "05-cronica-media-hoja.png")
print("Generadas", len(list(OUT.glob("*.png"))), "láminas en", OUT)
