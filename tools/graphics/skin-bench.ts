/**
 * G-04 · Piel rígida contra piel deformable. design.md D.4.
 *
 * D.4 no deja elegir el atado por gusto: pide construir las dos con la misma
 * receta y compararlas en un banco común antes de fijar una. Esto es ese banco.
 *
 * - **Rígida**: cada pieza pesa 1 sobre un solo hueso. Ningún vértice se mueve
 *   respecto a su hueso, así que el aldeano se articula a bloques, como una
 *   talla de madera con goznes.
 * - **Deformable**: los pesos los reparte Blender por proximidad, y una pieza
 *   puede seguir a dos huesos a la vez, así que la piel se dobla en el codo.
 *
 * Construye las dos, mide lo que cuestan y rinde las mismas poses de las dos,
 * lado a lado. No toca el camino de promoción: la variante perdedora no puede
 * acabar en el catálogo por accidente, porque nunca entra en él.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { join, relative, resolve, sep } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { loadRecipe } from '../art/recipe';
import { validateGlb } from '../art/glb';

const ROOT = resolve(import.meta.dirname, '..', '..');
const GENERATOR = resolve(ROOT, 'tools', 'art', 'blender-build.py');
const GENERATOR_MODULES = ['rig.py', 'animate.py'];
const OUTPUT = resolve(ROOT, 'artifacts', 'graphics', 'G-04', 'skin-bench');
const SYSTEM_BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
/** Los instantes que se comparan: uno por acción, en lo más doblado de cada una. */
const POSES: Array<{ clip: string; fraction: number }> = [
  { clip: 'walk', fraction: 0.25 },
  { clip: 'work_hoe', fraction: 0.375 },
  { clip: 'carry_walk', fraction: 0.5 },
];
const SKINS = ['rigid', 'smooth'] as const;
type Skin = typeof SKINS[number];

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : (process.argv[index + 1] ?? fallback);
}

function blenderPath(): string {
  const candidates = new Set<string>();
  const configured = process.env.VALLEY_BLENDER_PATH;
  if (configured) candidates.add(resolve(configured));
  candidates.add('blender');
  for (const base of [
    'C:\\Program Files\\Blender Foundation',
    join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Blender Foundation'),
  ]) {
    if (!base || !existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.add(join(base, entry.name, 'blender.exe'));
    }
  }
  for (const candidate of candidates) {
    if (spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0) return candidate;
  }
  throw new Error('No Blender found. Set VALLEY_BLENDER_PATH.');
}

async function freePort(): Promise<number> {
  const server = createNetServer();
  try {
    await new Promise<void>((ready, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', ready);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Could not allocate a local TCP port.');
    return address.port;
  } finally {
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  }
}

async function main(): Promise<void> {
  const assetId = argument('asset', 'villager');
  const recipePath = resolve(ROOT, argument('recipe', `art/recipes/${assetId}/${assetId}.json`));
  const width = Number(argument('width', '360'));
  const height = Number(argument('height', '420'));
  const zoom = Number(argument('zoom', '1.15'));

  const recipe = await loadRecipe(recipePath);
  if (recipe.rig === null) throw new Error(`Recipe '${assetId}' has no rig to skin.`);

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  const blender = blenderPath();

  const built: Record<Skin, { glb: string; statistics: unknown; bytes: number; sha256: string; buildMs: number }> = {} as never;
  for (const skin of SKINS) {
    const directory = resolve(OUTPUT, skin);
    await mkdir(directory, { recursive: true });
    const script = resolve(directory, 'build.py');
    await copyFile(GENERATOR, script);
    for (const moduleName of GENERATOR_MODULES) {
      await copyFile(resolve(ROOT, 'tools', 'art', moduleName), resolve(directory, moduleName));
    }
    const resolvedRecipe = resolve(directory, 'resolved-recipe.json');
    await writeFile(resolvedRecipe, `${JSON.stringify(recipe, null, 2)}\n`, 'utf8');

    const started = performance.now();
    const result = spawnSync(blender, [
      '--background', '--factory-startup', '--python', script, '--', resolvedRecipe, directory, assetId, skin,
    ], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    const buildMs = Math.round(performance.now() - started);
    await writeFile(resolve(directory, 'blender.log'), `${result.stdout}\n${result.stderr}`, 'utf8');
    const glb = resolve(directory, `${assetId}.glb`);
    if (!existsSync(glb)) throw new Error(`The ${skin} build produced no GLB. See ${resolve(directory, 'blender.log')}`);

    const buffer = await readFile(glb);
    built[skin] = {
      glb, bytes: buffer.length, buildMs,
      sha256: createHash('sha256').update(buffer).digest('hex').toUpperCase(),
      statistics: validateGlb(recipe, buffer).statistics,
    };
    process.stdout.write(`${skin.padEnd(7)} built in ${(buildMs / 1000).toFixed(1)}s, ${buffer.length} bytes\n`);
  }

  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    const port = await freePort();
    server = await createServer({
      root: ROOT,
      server: { host: '127.0.0.1', port, strictPort: true, watch: { ignored: ['**/artifacts/**'] } },
    });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (base === undefined) throw new Error('Vite did not publish a local URL.');
    const bundled = chromium.executablePath();
    const executablePath = existsSync(bundled) ? bundled : SYSTEM_BROWSERS.find(existsSync);
    browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

    const shots: Record<string, string> = {};
    for (const skin of SKINS) {
      const assetUrl = `/${relative(ROOT, built[skin].glb).split(sep).map(encodeURIComponent).join('/')}`;
      const query = new URLSearchParams({
        asset: assetUrl, width: String(width), height: String(height),
        pixelRatio: '1', camera: 'iso-ne', zoom: String(zoom), time: '0',
      });
      await page.goto(new URL(`/tools/graphics/viewer.html?${query.toString()}`, base).href, {
        waitUntil: 'domcontentloaded', timeout: 30_000,
      });
      await page.waitForFunction(() => document.documentElement.dataset.graphicsState === 'ready', undefined, { timeout: 30_000 });
      const clips = await page.evaluate(() => window.valleyGraphicsProbe?.clips ?? []);
      for (const pose of POSES) {
        const clip = clips.find((candidate) => candidate.name === pose.clip);
        if (clip === undefined) throw new Error(`The ${skin} build has no clip '${pose.clip}'.`);
        await page.evaluate(([name, at]) => {
          window.valleyGraphicsProbe?.show(name as string, at as number);
        }, [pose.clip, clip.duration * pose.fraction] as [string, number]);
        const file = resolve(OUTPUT, `${pose.clip}-${skin}.png`);
        await page.screenshot({ path: file });
        shots[`${pose.clip}/${skin}`] = file;
      }
    }

    // La hoja: una columna por acción, la rígida arriba y la deformable abajo.
    const cell = (file: string): string =>
      `<img src="/${relative(ROOT, file).split(sep).map(encodeURIComponent).join('/')}">`;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body { margin: 0; background: #2b2620; font: 13px/1.4 system-ui, sans-serif; color: #e8e2d6; }
      h1 { margin: 0; padding: 10px 14px; font-size: 15px; font-weight: 600; }
      table { border-collapse: collapse; }
      th, td { padding: 4px 8px; text-align: center; font-weight: 500; }
      th { opacity: .75; }
      img { display: block; }
    </style><h1>${assetId} · rigid (top) vs smooth (bottom)</h1><table>
      <tr>${POSES.map((pose) => `<th>${pose.clip}</th>`).join('')}</tr>
      ${SKINS.map((skin) => `<tr>${
        POSES.map((pose) => `<td>${cell(shots[`${pose.clip}/${skin}`] ?? '')}</td>`).join('')
      }</tr><tr>${POSES.map(() => `<th>${skin}</th>`).join('')}</tr>`).join('')}
    </table>`;
    const sheet = await browser.newPage({ viewport: { width: width * POSES.length + 80, height: height * 2 + 140 } });
    await sheet.goto(new URL('/tools/graphics/blank', base).href, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await sheet.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await sheet.waitForFunction(
      () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
      undefined, { timeout: 30_000 },
    );
    await sheet.screenshot({ path: resolve(OUTPUT, 'skin-comparison.png'), fullPage: true });
    await sheet.close();
  } finally {
    await browser?.close();
    await server?.close();
  }

  const bench = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx tools/graphics/skin-bench.ts',
    asset: assetId,
    recipe: relative(ROOT, recipePath).replaceAll('\\', '/'),
    poses: POSES,
    variants: Object.fromEntries(SKINS.map((skin) => [skin, {
      bytes: built[skin].bytes,
      sha256: built[skin].sha256,
      buildMs: built[skin].buildMs,
      statistics: built[skin].statistics,
      glb: relative(ROOT, built[skin].glb).replaceAll('\\', '/'),
    }])),
    comparison: relative(ROOT, resolve(OUTPUT, 'skin-comparison.png')).replaceAll('\\', '/'),
  };
  await writeFile(resolve(OUTPUT, 'skin-bench.json'), `${JSON.stringify(bench, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${relative(ROOT, resolve(OUTPUT, 'skin-comparison.png'))}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
