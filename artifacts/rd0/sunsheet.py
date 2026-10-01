import json, sys
from PIL import Image, ImageDraw, ImageStat
d = sys.argv[1]
out = sys.argv[2]
rows = json.load(open(d + '/rows.json'))['rows']
def lum(im):
    w, h = im.size
    crop = im.crop((0, int(h * 0.25), w, int(h * 0.62))).convert('L')  # franja del valle, sin cabecera ni hoja
    return ImageStat.Stat(crop).mean[0]
items = []
for r in rows:
    im = Image.open(f"{d}/{r['name']}").convert('RGB')
    r['lum'] = lum(im)
    items.append((r, im))
# orden por hora de cabecera (hora 0..23) para ver la luz contra el reloj
def hour(r):
    try:
        return int(r['time'].split(':')[0]) if r['time'] else -1
    except Exception:
        return -1
items.sort(key=lambda x: (hour(x[0]), x[0]['i']))
tw = 150
th = int(tw * 844 / 390)
cols = 8
n = len(items)
rowsn = (n + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rowsn * (th + 34)), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for k, (r, im) in enumerate(items):
    x = (k % cols) * tw
    y = (k // cols) * (th + 34)
    sheet.paste(im.resize((tw, th)), (x, y + 34))
    dr.text((x + 3, y + 2), f"hdr {r['time']}  f{r['i']}", fill=(255, 255, 255))
    dr.text((x + 3, y + 14), f"sun {float(r['sun']):.2f} lum {r['lum']:.0f}", fill=(255, 220, 120))
    dr.text((x + 3, y + 24), f"{r['sky']}", fill=(150, 200, 255))
sheet.save(out, quality=70)
# tabla
by = {}
for r, _ in items:
    h = hour(r)
    night = h >= 21 or h < 5
    by.setdefault('night(21-05)' if night else 'day', []).append(r['lum'])
for k, v in by.items():
    print(k, 'n', len(v), 'lum mean %.1f min %.1f max %.1f' % (sum(v) / len(v), min(v), max(v)))
print('size', sheet.size)
