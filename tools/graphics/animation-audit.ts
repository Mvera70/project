/**
 * G-04 · Auditoría de animación. design.md D.4, D.6.
 *
 * Mide los clips **en el navegador**, sobre el GLB exportado, no en Blender.
 * D.4 lo pide así por un motivo concreto: lo que el juego reproduce es el GLB
 * cargado por Three.js, y entre la acción de Blender y esa reproducción hay un
 * exportador, un muestreo y un cargador. Cada uno de los tres puede perder algo
 * —y ya perdió los clips una vez, cuando sólo viajaba la acción activa—, así
 * que la verdad tiene que leerse del lado donde importa.
 *
 * Comprueba cinco propiedades, todas del diseño y ninguna de la implementación:
 *
 * 1. Los clips que la receta declara están todos en el GLB, y ninguno más.
 * 2. Cada clip dura lo que dicen sus fotogramas.
 * 3. La locomoción es *in-place*: la raíz no se desplaza. Quien mueve al
 *    aldeano por el valle es el controlador del juego (§5.2); si el clip
 *    también lo moviera, las dos velocidades tendrían que coincidir para
 *    siempre y los pies patinarían en cuanto alguien tocara una constante.
 * 4. Algo se mueve. Un clip vacío pasa todas las demás comprobaciones.
 * 5. Un clip que cicla vuelve a su primera pose, o el bucle da un salto.
 *
 * Y deja una hoja de contactos por clip, que es lo que juzga la persona: hay
 * deformaciones que ninguna de las cinco detecta. La cabeza separada del torso
 * que arregló el atado de G-04 pasaba la validación entera en verde y se vio a
 * la primera mirando una imagen.
 */
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { relative, resolve, sep } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { loadRecipe } from '../art/recipe';
import { ANIMATION_FPS, type RecipeClip } from '../art/schema';

type Vec3 = [number, number, number];
/** Por nodo: su origen y un punto a 25 cm por su eje. Ver `ViewerProbe.pose`. */
type Pose = Record<string, { joint: Vec3; lever: Vec3 }>;

interface ClipFinding {
  clip: string;
  durationSeconds: number;
  expectedSeconds: number;
  loops: boolean;
  /** D.4 · lo que el controlador necesitara para no deslizar los pies. */
  strideLength: number | null;
  rootDrift: number;
  liveliest: { node: string; travel: number };
  loopGap: number;
  outOfBounds: string[];
  contactSheet: string;
}

const ROOT = resolve(import.meta.dirname, '..', '..');
/** Los mismos navegadores del sistema que acepta `capture.ts`. */
const SYSTEM_BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

/** Blender exporta a los fps de la escena de fábrica. */
const FPS = ANIMATION_FPS;
/** Cuánto puede moverse la raíz y seguir llamándose quieta, en metros. */
const ROOT_DRIFT = 0.005;
/** Cuánto tiene que moverse el hueso más vivo para que el clip cuente, en metros. */
const MIN_TRAVEL = 0.02;
/** Cuánto puede separarse el bucle de su primera pose, en metros. */
const LOOP_GAP = 0.002;
/** Cuántas veces la caja en reposo puede ocupar un hueso antes de ser un miembro suelto. */
const BOUNDS_SLACK = 1.6;
/** Instantes de la hoja de contactos, en fracción del clip. */
const SHEET_AT = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
/** Instantes que se miden. Más que la hoja: medir es barato, rendir no. */
const SAMPLES = 24;

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : (process.argv[index + 1] ?? fallback);
}

function insideRepository(path: string, what: string): string {
  const resolved = resolve(ROOT, path);
  const relation = relative(ROOT, resolved);
  if (relation.startsWith(`..${sep}`) || relation === '..') {
    throw new Error(`The ${what} must be inside the repository: ${resolved}`);
  }
  return resolved;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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

/**
 * Lo que un clip debería durar, en segundos.
 *
 * Es `frames / fps`, no el span entre la primera clave y la última. Un ciclo de
 * 32 fotogramas dura 32 tiempos aunque sus claves vayan del 1 al 32: el último
 * fotograma no es el mismo instante que el primero, es el instante justo antes
 * de volver a él. Medido sobre el GLB, `walk` dura 1,3333 s = 32/24.
 */
function expectedSeconds(clip: RecipeClip): number {
  return clip.frames / FPS;
}

/**
 * La hoja de contactos: un clip, ocho instantes, en fila.
 *
 * Se compone en el navegador con las capturas ya escritas, sirviéndolas por el
 * mismo Vite. Componer imágenes en Node necesitaría una dependencia nueva para
 * hacer lo que una etiqueta `img` hace de balde.
 *
 * La página se inyecta con `setContent` sobre el origen de Vite en vez de
 * escribir un HTML temporal: un fichero dentro de la raíz servida despierta al
 * vigilante de Vite, que recarga la página una y otra vez, y la captura no
 * llega nunca a hacerse.
 */
async function contactSheet(
  browser: Browser, base: string, files: string[], destination: string, label: string, scale: number,
): Promise<void> {
  // `scale` agranda la hoja sin tocar la captura: la prueba de silueta de P1
  // se rinde al tamano que el aldeano tendra en pantalla —dos docenas de
  // pixeles— y a ese tamano una hoja de contactos no se puede mirar.
  const sources = files.map((file) => `/${relative(ROOT, file).split(sep).map(encodeURIComponent).join('/')}`);
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; background: #2b2620; font: 13px/1.4 system-ui, sans-serif; color: #e8e2d6; }
    h1 { margin: 0; padding: 10px 14px; font-size: 15px; font-weight: 600; }
    .row { display: flex; align-items: flex-start; }
    figure { margin: 0; }
    figcaption { padding: 4px 0 10px; text-align: center; opacity: .75; }
    img { display: block; image-rendering: pixelated; zoom: ${scale}; }
  </style><h1>${label}</h1><div class="row">${
    sources.map((source, index) => `<figure><img src="${source}"><figcaption>t = ${
      SHEET_AT[index]?.toFixed(3) ?? '?'
    }</figcaption></figure>`).join('')
  }</div>`;
  // Pestaña aparte: la del visor tiene el aldeano cargado y la sonda montada,
  // y navegarla se lo lleva todo por delante.
  const page = await browser.newPage({ viewport: { width: 1200, height: 480 } });
  try {
    await page.goto(new URL('/tools/graphics/blank', base).href, {
      waitUntil: 'domcontentloaded', timeout: 30_000,
    }).catch(() => undefined);
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForFunction(
      () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
      undefined, { timeout: 30_000 },
    );
    await page.screenshot({ path: destination, fullPage: true });
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  const assetId = argument('asset', 'villager');
  const recipePath = insideRepository(
    argument('recipe', `art/recipes/${assetId}/${assetId}.json`), 'recipe',
  );
  const glbPath = insideRepository(argument('glb', ''), 'asset');
  if (!existsSync(glbPath)) throw new Error(`Asset does not exist: ${glbPath}`);
  const output = insideRepository(argument('output', `artifacts/graphics/G-04/${assetId}-animation`), 'output');
  const width = Number(argument('width', '320'));
  const height = Number(argument('height', '360'));
  const zoom = Number(argument('zoom', '1'));
  const camera = argument('camera', 'iso-ne');
  const sheetScale = Number(argument('sheetScale', '1'));

  const recipe = await loadRecipe(recipePath);
  const declared = recipe.clipDefinitions;
  if (declared.length === 0) throw new Error(`Recipe '${assetId}' declares no clips to audit.`);

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  const problems: string[] = [];
  const findings: ClipFinding[] = [];
  try {
    const port = await freePort();
    server = await createServer({
      root: ROOT,
      server: {
        host: '127.0.0.1', port, strictPort: true,
        // Escribimos capturas dentro de la raíz servida mientras el navegador
        // mira. Sin esto, cada PNG nuevo recarga la página a media medición.
        watch: { ignored: ['**/artifacts/**'] },
      },
    });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (base === undefined) throw new Error('Vite did not publish a local URL.');

    const bundled = chromium.executablePath();
    const executablePath = existsSync(bundled) ? bundled : SYSTEM_BROWSERS.find(existsSync);
    browser = await chromium.launch({
      headless: true, ...(executablePath === undefined ? {} : { executablePath }),
    });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const assetUrl = `/${relative(ROOT, glbPath).split(sep).map(encodeURIComponent).join('/')}`;
    const query = new URLSearchParams({
      asset: assetUrl, width: String(width), height: String(height),
      pixelRatio: '1', camera, zoom: String(zoom), time: '0',
    });
    await page.goto(new URL(`/tools/graphics/viewer.html?${query.toString()}`, base).href, {
      waitUntil: 'domcontentloaded', timeout: 30_000,
    });
    await page.waitForFunction(() => {
      const state = document.documentElement.dataset.graphicsState;
      return state === 'ready' || state === 'error';
    }, undefined, { timeout: 30_000 });
    const message = await page.locator('html').getAttribute('data-graphics-message');
    if (await page.locator('html').getAttribute('data-graphics-state') === 'error') {
      throw new Error(`The viewer refused the asset: ${message ?? 'unknown error'}`);
    }

    const report = await page.evaluate(() => window.valleyGraphicsReport);
    const present = await page.evaluate(() => window.valleyGraphicsProbe?.clips ?? []);
    if (report === undefined) throw new Error('The viewer became ready without a report.');

    // 1 · lo declarado y lo exportado son lo mismo.
    const declaredNames = declared.map((clip) => clip.name).sort();
    const presentNames = present.map((clip) => clip.name).sort();
    const missing = declaredNames.filter((name) => !presentNames.includes(name));
    const extra = presentNames.filter((name) => !declaredNames.includes(name));
    if (missing.length > 0) problems.push(`The GLB is missing clips: ${missing.join(', ')}.`);
    if (extra.length > 0) problems.push(`The GLB has clips the recipe does not declare: ${extra.join(', ')}.`);

    // La caja en reposo, para reconocer un miembro que se ha ido de viaje.
    const rest = report.bounds;
    const span = Math.max(...rest.size) * BOUNDS_SLACK;
    const centre = rest.min.map((low, axis) => (low + (rest.max[axis] ?? low)) / 2) as Vec3;

    for (const clip of declared) {
      const exported = present.find((candidate) => candidate.name === clip.name);
      if (exported === undefined) continue;

      // 2 · dura lo que dicen sus fotogramas.
      const expected = expectedSeconds(clip);
      if (Math.abs(exported.duration - expected) > 0.5 / FPS) {
        problems.push(
          `Clip '${clip.name}' lasts ${exported.duration.toFixed(3)}s but its keys span ${expected.toFixed(3)}s.`,
        );
      }

      const poses: Pose[] = [];
      for (let index = 0; index <= SAMPLES; index += 1) {
        const seconds = (exported.duration * index) / SAMPLES;
        poses.push(await page.evaluate(([name, at]) => {
          window.valleyGraphicsProbe?.show(name as string, at as number);
          return window.valleyGraphicsProbe?.pose() ?? {};
        }, [clip.name, seconds] as [string, number]));
      }

      const first = poses[0] ?? {};
      const nodes = Object.keys(first);

      // 3 · la raíz no viaja.
      const rootNode = nodes.find((name) => name === 'root' || name.endsWith('_root'));
      let rootDrift = 0;
      if (rootNode === undefined) {
        problems.push(`Clip '${clip.name}' has no root node to check for in-place locomotion.`);
      } else {
        const origin = first[rootNode];
        if (origin !== undefined) {
          for (const pose of poses) {
            const here = pose[rootNode];
            if (here !== undefined) rootDrift = Math.max(rootDrift, distance(origin.joint, here.joint));
          }
        }
        if (rootDrift > ROOT_DRIFT) {
          problems.push(
            `Clip '${clip.name}' moves its root ${rootDrift.toFixed(4)}m. Locomotion must be in place.`,
          );
        }
      }

      // 4 · algo se mueve, y 6 · nada se va de la caja.
      let liveliest = { node: '(none)', travel: 0 };
      const outOfBounds: string[] = [];
      for (const node of nodes) {
        const origin = first[node];
        if (origin === undefined) continue;
        let travel = 0;
        for (const pose of poses) {
          const here = pose[node];
          if (here === undefined) continue;
          travel = Math.max(travel, distance(origin.lever, here.lever));
          const away = Math.max(...here.joint.map((value, axis) => Math.abs(value - (centre[axis] ?? 0))));
          if (away > span && !outOfBounds.includes(node)) outOfBounds.push(node);
        }
        if (travel > liveliest.travel) liveliest = { node, travel };
      }
      if (liveliest.travel < MIN_TRAVEL) {
        problems.push(`Clip '${clip.name}' barely moves: its liveliest node travels ${liveliest.travel.toFixed(4)}m.`);
      }
      if (outOfBounds.length > 0) {
        problems.push(`Clip '${clip.name}' throws nodes out of the resting bounds: ${outOfBounds.join(', ')}.`);
      }

      // 5 · el bucle cierra.
      let loopGap = 0;
      const last = poses[poses.length - 1] ?? {};
      for (const node of nodes) {
        const start = first[node];
        const end = last[node];
        if (start !== undefined && end !== undefined) loopGap = Math.max(loopGap, distance(start.lever, end.lever));
      }
      if (clip.loop && loopGap > LOOP_GAP) {
        problems.push(`Clip '${clip.name}' loops but ends ${loopGap.toFixed(4)}m away from its first pose.`);
      }

      const frames: string[] = [];
      for (const fraction of SHEET_AT) {
        const seconds = exported.duration * fraction;
        await page.evaluate(([name, at]) => {
          window.valleyGraphicsProbe?.show(name as string, at as number);
        }, [clip.name, seconds] as [string, number]);
        const file = resolve(output, `${clip.name}-${fraction.toFixed(3)}.png`);
        await page.screenshot({ path: file });
        frames.push(file);
      }
      const sheet = resolve(output, `${clip.name}-contact.png`);
      await contactSheet(
        browser, base, frames, sheet,
        `${assetId} · ${clip.name} · ${exported.duration.toFixed(2)}s · ${camera}`
        + (sheetScale === 1 ? '' : ` · ${width}×${height} px, shown ×${sheetScale}`),
        sheetScale,
      );

      findings.push({
        clip: clip.name,
        durationSeconds: Number(exported.duration.toFixed(4)),
        expectedSeconds: Number(expected.toFixed(4)),
        loops: clip.loop,
        strideLength: clip.strideLength,
        rootDrift: Number(rootDrift.toFixed(5)),
        liveliest: { node: liveliest.node, travel: Number(liveliest.travel.toFixed(4)) },
        loopGap: Number(loopGap.toFixed(5)),
        outOfBounds,
        contactSheet: relative(ROOT, sheet).replaceAll('\\', '/'),
      });
    }

    if (pageErrors.length > 0) problems.push(`The page raised errors: ${pageErrors.join(' | ')}`);
  } finally {
    await browser?.close();
    await server?.close();
  }

  const audit = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx tools/graphics/animation-audit.ts',
    asset: relative(ROOT, glbPath).replaceAll('\\', '/'),
    recipe: relative(ROOT, recipePath).replaceAll('\\', '/'),
    camera,
    thresholds: { fps: FPS, rootDrift: ROOT_DRIFT, minTravel: MIN_TRAVEL, loopGap: LOOP_GAP, boundsSlack: BOUNDS_SLACK },
    status: problems.length === 0 ? 'pass' : 'fail',
    problems,
    clips: findings,
  };
  await writeFile(resolve(output, 'animation-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  for (const finding of findings) {
    process.stdout.write(
      `${finding.clip.padEnd(12)} ${finding.durationSeconds.toFixed(2)}s  `
      + `root ${finding.rootDrift.toFixed(4)}m  liveliest ${finding.liveliest.node} ${finding.liveliest.travel.toFixed(3)}m  `
      + `loop ${finding.loopGap.toFixed(4)}m\n`,
    );
  }
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`  ! ${problem}\n`);
    throw new Error(`Animation audit failed with ${problems.length} problem(s).`);
  }
  process.stdout.write(`Animation audit passed. Contact sheets in ${relative(ROOT, output)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
