"""Create a single review image from the candidate three-quarter views."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
MODELS = [
    ("hall", "Sala del rey"),
    ("stall-pedlar", "Puesto · mercader"),
    ("stall-factor", "Puesto · factor"),
    ("stall-salter", "Puesto · sal"),
    ("quarry-face-intact", "Cantera · intacta"),
    ("quarry-face-mined", "Cantera · explotada"),
    ("quarry-face-exhausted", "Cantera · agotada"),
    ("crag-1", "Peñasco 1"),
    ("crag-2", "Peñasco 2"),
    ("crag-3", "Peñasco 3"),
    ("crag-4", "Peñasco 4"),
    ("crag-5", "Peñasco 5"),
    ("cairn", "Hito de piedras"),
]

COLS = 4
CARD_W, CARD_H = 440, 500
GAP, MARGIN, HEADER = 22, 36, 154
ROWS = (len(MODELS) + COLS - 1) // COLS
WIDTH = MARGIN * 2 + COLS * CARD_W + (COLS - 1) * GAP
HEIGHT = HEADER + ROWS * CARD_H + (ROWS - 1) * GAP + MARGIN

font_path = Path("C:/Windows/Fonts/arial.ttf")
bold_path = Path("C:/Windows/Fonts/arialbd.ttf")
title_font = ImageFont.truetype(str(bold_path), 42)
label_font = ImageFont.truetype(str(bold_path), 25)
detail_font = ImageFont.truetype(str(font_path), 19)

canvas = Image.new("RGB", (WIDTH, HEIGHT), "#ECE9E1")
draw = ImageDraw.Draw(canvas)
draw.text((MARGIN, 31), "THE VALLEY · Nuevos modelos 3D", fill="#302D28", font=title_font)
draw.text(
    (MARGIN, 92),
    "13 candidatos · vista de tres cuartos · cada vista encuadrada por separado",
    fill="#6D675D",
    font=detail_font,
)

for index, (model_id, label) in enumerate(MODELS):
    x = MARGIN + (index % COLS) * (CARD_W + GAP)
    y = HEADER + (index // COLS) * (CARD_H + GAP)
    draw.rounded_rectangle((x, y, x + CARD_W, y + CARD_H), radius=14, fill="#F8F7F2")
    with Image.open(ROOT / model_id / "sheet.png") as sheet:
        view = sheet.crop((0, 0, 640, 640)).convert("RGB")
    view = view.resize((CARD_W - 24, CARD_W - 24), Image.Resampling.LANCZOS)
    canvas.paste(view, (x + 12, y + 12))
    draw.text((x + 18, y + 439), label, fill="#2C2B26", font=label_font)
    draw.text((x + 18, y + 470), model_id, fill="#807B72", font=detail_font)

output = ROOT / "all-models-sheet.png"
canvas.save(output, optimize=True)
print(output)
