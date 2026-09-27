"""Reúne las vistas tres cuartos G-41 para revisar las cinco casas juntas."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
IDS = [
    ("house-twin-gable", "Madera · dos crujías"),
    ("house-hip-roof", "Madera · cuatro aguas"),
    ("stone-house", "Piedra · base revisada"),
    ("stone-house-cross-gable", "Piedra · cubierta cruzada"),
    ("stone-house-tower-loft", "Piedra · altillo"),
]
SIZE = 520
LABEL = 68
MARGIN = 24
canvas = Image.new("RGB", (MARGIN * 4 + SIZE * 3, MARGIN * 3 + (SIZE + LABEL) * 2), "#ece9e1")
draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
for index, (model_id, title) in enumerate(IDS):
    source = ROOT / "artifacts" / "graphics" / "astra" / model_id / "sheet.png"
    with Image.open(source) as sheet:
        half_width, half_height = sheet.width // 2, sheet.height // 2
        picture = sheet.crop((0, 0, half_width, half_height)).resize((SIZE, SIZE))
    column, row = index % 3, index // 3
    x = MARGIN + column * (SIZE + MARGIN)
    y = MARGIN + row * (SIZE + LABEL + MARGIN)
    canvas.paste(picture, (x, y))
    draw.text((x + 8, y + SIZE + 12), title, fill="#3c352e", font=font)
out = ROOT / "artifacts" / "graphics" / "G-41" / "all-houses.png"
out.parent.mkdir(parents=True, exist_ok=True)
canvas.save(out)
print(out)
