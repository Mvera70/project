// Las cuatro estaciones del mismo valle, en una pasada (v5.85, la fauna por
// estaciones).
//
//   node tools/graphics/seasons.mjs --seed 11 --year 8
//   node tools/graphics/seasons.mjs --seed 23 --year 10 --only spring --query "&means=pigs"
//   node tools/graphics/seasons.mjs --seed 11 --year 8 --only autumn --cranes
//   node tools/graphics/seasons.mjs --look "summer:ciguena:38.5,50.5:0.22"
//
// `shot.mjs --year N` abre siempre en primavera, día 1, y `--advance` falsea el
// reloj semana a semana: con el valle de un año avanzado, en el dibujo por
// software, no llegaba nunca al verano (medido el 2 oct 2026: cinco minutos sin
// salir de la fundación). Esto abre cada estación por la ruta de taller que ya
// existía (`?debug=1&live=1&season=…`, `src/ui/debug.ts`: el valle jugado con la
// política prudente hasta la semana seis de esa estación), fija el mediodía y
// el cielo raso, y guarda por estación:
//
//   <estación>.json        la traza: `__valleyLife().seasonal` (crías, cigüeñas,
//                          mariposas, abejas, golondrinas, grullas) y cada animal
//                          pintado, con su id y su sitio
//   <estación>-valle.png   el encuadre de juego, sólo el lienzo
//   <estación>-<qué>.png   de cerca: la cría del ciervo y la del corral en
//                          primavera, la vaca en verano, el jabalí en otoño y el
//                          ciervo en invierno, si los hay
//
// `--look estación:nombre:X,Z[:zoom]` (separadas por `;`) añade encuadres; y
// `--cranes` espera en otoño a que la uve de grullas pase sobre el valle y la
// encuadra (pasa cada minuto y medio de reloj real, que en un dibujo por
// software son muchos más).
//
// Antes: `npx tsx tools/graphics/bundle-game.ts`.

import { chromium } from '@playwright/test';
import { browserExe } from './browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const seed = opt('seed', '11');
const year = opt('year', '8');
const outDir = resolve(opt('out', `artifacts/graphics/seasons/s${seed}-y${year}`));
const seasons = opt('only', 'spring,summer,autumn,winter').split(',');
const query = opt('query', '');
const looks = opt('look', '').split(';').filter(Boolean).map((one) => one.split(':'));
const cranes = args.includes('--cranes');
const page = resolve(opt('page', 'artifacts/graphics/G-10/game/valley.html'));
mkdirSync(outDir, { recursive: true });

const exe = browserExe();
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const season of seasons) {
  const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await tab.goto(`file://${page}?debug=1&live=1&seed=${seed}&year=${year}&season=${season}${query}`);
  await tab.waitForFunction(() => typeof window.__valleyCapture === 'function', null, { timeout: 180_000 });
  await tab.evaluate(() => { window.__valleyHoldSky?.('clear'); window.__valleyHoldPhase?.(0.45); window.__valleyHoldScale?.(1); });
  await tab.waitForTimeout(9000);
  const date = await tab.evaluate(() => document.querySelector('.valley-date')?.textContent ?? '');
  const trace = await tab.evaluate(() => {
    const life = window.__valleyLife?.();
    const animals = (life?.renderedAnimals ?? []).map((a) => ({ id: a.id, kind: a.kind, x: a.x, z: a.z }));
    const kinds = {};
    for (const a of animals) kinds[a.kind] = (kinds[a.kind] ?? 0) + 1;
    return { seasonal: life?.seasonal ?? null, kinds, animals };
  });
  console.log(`${season} · ${date} · ${JSON.stringify(trace.seasonal)} · ${JSON.stringify(trace.kinds)}`);
  writeFileSync(`${outDir}/${season}.json`, JSON.stringify({ date, ...trace }, null, 1));
  const shoot = async (name, point, zoom) => {
    const image = await tab.evaluate(({ point, zoom }) => (point === null
      ? window.__valleyCapture(-1, zoom, false)
      : window.__valleyCapture(-1, zoom, false, point)).image, { point, zoom });
    writeFileSync(`${outDir}/${season}-${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  };
  // El encuadre de juego primero: un encuadre de cerca deja la cámara donde miró.
  await shoot('valle', null, 1);
  if (cranes && season === 'autumn') {
    let seen = false;
    for (let tries = 0; tries < 400 && !seen; tries += 1) {
      const lead = await tab.evaluate(() => window.__valleyLife?.()?.seasonal?.craneLead ?? null);
      if (lead !== null && lead.x > 20 && lead.x < 60 && lead.z > 30 && lead.z < 90) {
        // Lo que se ve de un ave a `y` celdas de altura cae, en el suelo, hacia
        // donde mira la cámara de reposo (`VIEW = (1, 0,9, 1,15)`, `camera.ts`).
        await shoot('grullas', { x: lead.x - lead.y / 0.9, z: lead.z - lead.y * 1.15 / 0.9 }, 0.8);
        console.log(`  grullas encuadradas en ${lead.x.toFixed(1)},${lead.z.toFixed(1)}`);
        seen = true;
      } else {
        await tab.waitForTimeout(1500);
      }
    }
    if (!seen) console.log('  la uve no pasó sobre el valle mientras se esperaba');
  }
  const young = trace.animals.filter((a) => a.id >= 100_000);
  const first = (test) => trace.animals.find(test);
  const close = {
    spring: [['cria-ciervo', young.find((a) => a.kind === 'deer')],
      ['cria-corral', young.find((a) => a.kind === 'hen') ?? young.find((a) => a.kind !== 'deer')]],
    summer: [['vaca', first((a) => a.kind === 'cow')]],
    autumn: [['jabali', first((a) => a.kind === 'boar' && a.id >= 45_000 && a.id < 46_000)]],
    winter: [['ciervo', first((a) => a.kind === 'deer')]],
  }[season] ?? [];
  for (const [name, animal] of close) if (animal !== undefined) await shoot(name, { x: animal.x, z: animal.z }, 0.3);
  for (const [when, name, at, zoom] of looks) {
    if (when !== season) continue;
    const [x, z] = at.split(',').map(Number);
    await shoot(name, { x, z }, Number(zoom ?? '0.3'));
  }
  await tab.close();
}
await browser.close();
console.log(`→ ${outDir}`);
