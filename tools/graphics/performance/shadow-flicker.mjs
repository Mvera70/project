// El parpadeo de las sombras, medido (28 sep 2026).
//
// Vera: «la sombra de un árbol, en vez de verse fija en el suelo y moverse
// poquito a poco con el sol, parpadea y se mueve para un lado, para otro». Un
// parpadeo no se ve en una captura: se ve entre dos. Esto abre el valle sobre
// una zona quieta con sombras de árboles, fotografía el lienzo N veces seguidas
// a ×1 y cuenta, entre cada dos fotogramas consecutivos, qué fracción de
// píxeles cambia más de un umbral. Lo quieto de verdad da cero; una sombra que
// tiembla, un porcentaje que sube con el número de bordes que bailan.
//
// Es comparativo: la misma toma antes y después de un cambio. La gente que
// anda y los pájaros también cambian píxeles, así que la zona se elige sin
// aldea (el borde del bosque) y se toma la mediana de las parejas.
//
//   node tools/graphics/performance/shadow-flicker.mjs [url] [frames] [ms] [out]
//
// Por omisión el servidor de Vite en 5185, 12 fotogramas cada 150 ms, salida en
// artifacts/graphics/shadow-flicker/.

import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [url = 'http://127.0.0.1:5185/?debug=1&live=1&seed=11&year=5&season=summer',
  framesArg = '12', msArg = '150', outArg = 'artifacts/graphics/shadow-flicker'] = process.argv.slice(2);
const frames = Number(framesArg);
const gap = Number(msArg);
const out = resolve(outArg);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage({ viewport: { width: 900, height: 760 }, deviceScaleFactor: 1 });
await tab.goto(url);
await tab.waitForSelector('.valley-vital', { timeout: 180000 });
await tab.waitForTimeout(5000);
await tab.mouse.move(450, 380);
const hold = async (key, ms) => { await tab.keyboard.down(key); await tab.waitForTimeout(ms); await tab.keyboard.up(key); };
// Al borde del bosque, de cerca: sombras largas de copas sobre prado, sin aldea.
await hold('KeyW', 700); await hold('KeyD', 500); await hold('Equal', 900);
await tab.waitForTimeout(1500);
// Sólo el valle: sin la cabecera (arriba) ni la hoja de papel (abajo).
const clip = { x: 0, y: 120, width: 900, height: 320 };
for (let n = 0; n < frames; n += 1) {
  await tab.screenshot({ path: resolve(out, `f${String(n).padStart(2, '0')}.png`), clip });
  await tab.waitForTimeout(gap);
}
await browser.close();

const python = spawnSync('python', ['-c', `
import sys
from PIL import Image, ImageChops
out, n = sys.argv[1], int(sys.argv[2])
frames = [Image.open(f"{out}/f{i:02d}.png").convert("RGB") for i in range(n)]
ratios = []
for a, b in zip(frames, frames[1:]):
    d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 10 else 0)
    hist = d.histogram()
    ratios.append(hist[255] / (a.width * a.height))
ratios.sort()
print(f"pares {len(ratios)} · píxeles que cambian: mediana {100*ratios[len(ratios)//2]:.2f} % · máximo {100*ratios[-1]:.2f} %")
`, out, String(frames)], { encoding: 'utf8' });
process.stdout.write(python.stdout);
if (python.status !== 0) process.stderr.write(python.stderr);
