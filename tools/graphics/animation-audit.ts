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
  /** Grados que abre cada bisagra a lo largo del clip, y cuánto dobla al revés. */
  joints: Record<string, { least: number; most: number; wrongWay: number }>;
  /** Zancada por ciclo que dan las piernas, medida, o `null` si el clip no anda. */
  measuredStride: number | null;
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
/**
 * Cuánto tiene que plegarse una rodilla en un clip que anda, en grados.
 *
 * Una pierna que se balancea entera desde la cadera parece un péndulo, y así
 * estuvo la primera marcha de G-04: las espinillas tenían el signo cambiado y
 * la rodilla se abría hacia delante en vez de plegarse. Llegaba a 25 grados y
 * pasaba todas las demás comprobaciones. Andar de verdad pliega unos sesenta;
 * treinta es el suelo por debajo del cual no hay rodilla que valga.
 */
const KNEE_FLEXION = 30;
/**
 * Cuánto puede doblar una bisagra hacia su lado prohibido, en grados.
 *
 * No es cero porque cerca de recta el sentido no significa nada: dos grados de
 * ruido en una pierna casi estirada cambian el signo sin que se vea nada. Ocho
 * grados de hiperextensión sí se ven, y es lo que hacían los codos de andar.
 */
const HINGE_SLACK = 8;
/** Cuánto puede desviarse la zancada declarada de la que las piernas dan, en tanto por uno. */
const STRIDE_SLACK = 0.2;
/** Instantes de la hoja de contactos, en fracción del clip. */
const SHEET_AT = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
/**
 * Instantes que se miden. Más que la hoja: medir es barato, rendir no.
 *
 * Cuarenta y ocho y no veinticuatro porque la zancada se suma tramo a tramo, y
 * los tramos que se pierden son los del cambio de apoyo, donde la medida no
 * vale. Cuantos más tramos, menos peso tiene cada cambio.
 */
const SAMPLES = 48;

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
 * El nodo del GLB que corresponde a un hueso de la receta.
 *
 * glTF no admite puntos en los nombres, así que el exportador convierte
 * `foot.L` en `footL`. Es la clase de detalle que rompe una comprobación en
 * silencio: la búsqueda no encuentra nada, la medida sale vacía y el clip pasa.
 */
function nodeFor(pose: Pose, bone: string): { joint: Vec3; lever: Vec3 } | undefined {
  return pose[bone] ?? pose[bone.replaceAll('.', '')];
}

/** El ángulo en `b` del codo o la rodilla `a-b-c`, en grados. 180 es recto. */
function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const u: Vec3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const v: Vec3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const sizes = Math.hypot(...u) * Math.hypot(...v);
  if (sizes === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / sizes))) * 180) / Math.PI;
}

/**
 * Hacia dónde dobla la bisagra `a-b-c`: **negativo si el segmento de abajo se va
 * hacia delante**, positivo si se va hacia atrás.
 *
 * El signo sale de la cuenta y no se elige. Con el segmento de arriba apuntando
 * hacia abajo, (0,−1,0), y el de abajo yendo hacia delante, (0,−cos,+sen), la
 * componente X del producto vectorial es −sen. Escribirlo al revés hizo que la
 * comprobación denunciara justo los clips que estaban bien.
 *
 * El aldeano mira a +Z y se sostiene sobre +Y, así que el eje de una bisagra es
 * el lateral, X. Vale mientras la raíz no gire, que es justo lo que garantiza la
 * locomoción in-place: el clip no la toca nunca.
 *
 * Existe porque el ángulo solo no distingue una rodilla de una rodilla al
 * revés. En G-04 el signo estuvo cambiado dos veces —las espinillas primero, los
 * antebrazos después— y las dos veces todo lo demás pasó en verde.
 */
function bendOf(a: Vec3, b: Vec3, c: Vec3): number {
  const upper: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const lower: Vec3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  // La componente X del producto vectorial upper x lower.
  return upper[1] * lower[2] - upper[2] * lower[1];
}

/**
 * La zancada que las piernas dan de verdad, por ciclo.
 *
 * Definición: **en cada instante el pie que está más abajo es el que pisa, y lo
 * que ese pie retrocede es lo que el cuerpo avanza.** Sumado a lo largo del
 * ciclo da la zancada. En un clip in-place el pie apoyado se desliza hacia
 * atrás exactamente a la velocidad de avance, así que la suma es justo lo que
 * el controlador tiene que recorrer mientras el clip da una vuelta. Si declara
 * otra cosa, los pies patinan.
 *
 * Costó dos intentos. El primero midió la separación máxima entre tobillos: dio
 * 1,50 m donde la marcha da 0,59, porque cuando el pie de vuelo está arriba y
 * adelante esa separación es grande y no significa nada. El segundo tomó lo que
 * recorre un pie mientras está por debajo de un umbral de altura, y dijo que
 * cargado se anda más largo que suelto, porque con la zancada corta los pies
 * quedan todos dentro del umbral y el de vuelo entraba en la cuenta. Ninguna de
 * las dos era falsable a ojo; la tercera se apoya en lo único que define un
 * apoyo, que es cuál de los dos pies está en el suelo.
 */
function measureStride(poses: Pose[], feet: string[]): number | null {
  if (feet.length < 2 || poses.length < 3) return null;
  let advanced = 0;
  for (let index = 0; index + 1 < poses.length; index += 1) {
    const here = poses[index];
    const next = poses[index + 1];
    if (here === undefined || next === undefined) continue;
    const grounded = feet
      .map((foot) => ({ foot, node: nodeFor(here, foot) }))
      .filter((entry) => entry.node !== undefined)
      .sort((a, b) => (a.node?.joint[1] ?? 0) - (b.node?.joint[1] ?? 0))[0];
    if (grounded === undefined) continue;
    const from = grounded.node?.joint[2];
    const to = nodeFor(next, grounded.foot)?.joint[2];
    if (from === undefined || to === undefined) continue;
    // El aldeano mira a +Z, así que el pie que pisa va hacia −Z. Un tramo en el
    // que avance es un cambio de apoyo, y no cuenta.
    advanced += Math.max(0, from - to);
  }
  return advanced;
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

      // Las bisagras y la zancada. Las dos son propiedades de una marcha, no
      // del esqueleto, así que se miden por clip y sólo si la receta declara
      // qué huesos son pies y cuáles forman una bisagra.
      const joints: Record<string, { least: number; most: number; wrongWay: number }> = {};
      const gait = recipe.rig?.gait ?? null;
      if (gait !== null) {
        for (const [joint, hinge] of Object.entries(gait.hinges)) {
          const angles: number[] = [];
          let wrongWay = 0;
          for (const pose of poses) {
            const [a, b, c] = hinge.bones.map((bone) => nodeFor(pose, bone)?.joint);
            if (a === undefined || b === undefined || c === undefined) continue;
            const angle = angleAt(a, b, c);
            angles.push(angle);
            // Cerca de recta el sentido no significa nada y el signo baila.
            if (angle > 176) continue;
            const bend = bendOf(a, b, c);
            const forwards = bend < 0;
            if (forwards !== (hinge.bends === 'front')) wrongWay = Math.max(wrongWay, 180 - angle);
          }
          if (angles.length === 0) {
            problems.push(`Clip '${clip.name}' cannot be measured: '${joint}' names bones the GLB lacks.`);
            continue;
          }
          if (wrongWay > HINGE_SLACK) {
            problems.push(
              `Clip '${clip.name}' bends '${joint}' ${wrongWay.toFixed(0)} degrees the wrong way. `
              + `It is declared to bend ${hinge.bends === 'front' ? 'forwards' : 'backwards'}.`,
            );
          }
          joints[joint] = {
            least: Number(Math.min(...angles).toFixed(1)),
            most: Number(Math.max(...angles).toFixed(1)),
            wrongWay: Number(wrongWay.toFixed(1)),
          };
        }
      }

      let measuredStride: number | null = null;
      if (gait !== null && clip.strideLength !== null) {
        measuredStride = measureStride(poses, gait.feet);
        // Una pierna que se balancea entera desde la cadera parece un péndulo.
        for (const [joint, hinge] of Object.entries(gait.hinges)) {
          const range = joints[joint];
          if (!hinge.walking || range === undefined) continue;
          const flexion = range.most - range.least;
          if (flexion < KNEE_FLEXION) {
            problems.push(
              `Clip '${clip.name}' walks but '${joint}' only bends ${flexion.toFixed(0)} degrees. `
              + 'A leg that swings whole from the hip reads as a pendulum.',
            );
          }
        }
        // Y una zancada declarada que no case con la que las piernas dan hace
        // que el controlador reproduzca a otro ritmo y los pies patinen.
        if (measuredStride === null) {
          problems.push(`Clip '${clip.name}' declares a stride but no foot ever plants.`);
        } else if (Math.abs(measuredStride - clip.strideLength) > clip.strideLength * STRIDE_SLACK) {
          problems.push(
            `Clip '${clip.name}' declares a stride of ${clip.strideLength.toFixed(2)}m `
            + `but its legs give ${measuredStride.toFixed(2)}m. The feet would slide.`,
          );
        }
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
        joints,
        measuredStride: measuredStride === null ? null : Number(measuredStride.toFixed(3)),
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
    thresholds: {
      fps: FPS, rootDrift: ROOT_DRIFT, minTravel: MIN_TRAVEL, loopGap: LOOP_GAP,
      boundsSlack: BOUNDS_SLACK, kneeFlexion: KNEE_FLEXION, strideSlack: STRIDE_SLACK,
      hingeSlack: HINGE_SLACK,
    },
    status: problems.length === 0 ? 'pass' : 'fail',
    problems,
    clips: findings,
  };
  await writeFile(resolve(output, 'animation-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  for (const finding of findings) {
    process.stdout.write(
      `${finding.clip.padEnd(12)} ${finding.durationSeconds.toFixed(2)}s  `
      + `root ${finding.rootDrift.toFixed(4)}m  liveliest ${finding.liveliest.node} ${finding.liveliest.travel.toFixed(3)}m  `
      + `loop ${finding.loopGap.toFixed(4)}m`
      + Object.entries(finding.joints)
        .map(([joint, range]) => `  ${joint} ${(range.most - range.least).toFixed(0)}deg`).join('')
      + (finding.measuredStride === null ? '' : `  stride ${finding.measuredStride.toFixed(2)}m`)
      + `\n`,
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
