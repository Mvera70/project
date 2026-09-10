import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { createServer as createNetServer } from 'node:net';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

interface ViewerReport {
  resourceUrl: string;
  viewport: { width: number; height: number; pixelRatio: number };
  camera: string;
  presentationSeconds: number;
  threeRevision: string;
  objectNames: string[];
  bounds: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  loadDurationMs: number;
}

interface CaptureResult {
  file: string;
  sha256: string;
  dimensions: { width: number; height: number };
  grayscale: null | { file: string; sha256: string; dimensions: { width: number; height: number } };
  durationMs: number;
  viewer: ViewerReport;
}

const ROOT = resolve(import.meta.dirname, '..', '..');
const DEFAULT_OUTPUT = resolve(ROOT, 'artifacts', 'graphics', 'G-01');
const SYSTEM_BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : (process.argv[index + 1] ?? fallback);
}

function numericArgument(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = Number(argument(name, String(fallback)));
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`--${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24 || buffer.subarray(1, 4).toString('ascii') !== 'PNG') {
    throw new Error('Playwright did not return a valid PNG.');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function freePort(): Promise<number> {
  const server = createNetServer();
  try {
    await new Promise<void>((resolveListen, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolveListen);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Could not allocate a local TCP port.');
    return address.port;
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
}

async function waitForResult(page: Page): Promise<'ready' | 'error'> {
  await page.waitForFunction(() => {
    const state = document.documentElement.dataset.graphicsState;
    return state === 'ready' || state === 'error';
  }, undefined, { timeout: 30_000 });
  const state = await page.locator('html').getAttribute('data-graphics-state');
  if (state !== 'ready' && state !== 'error') throw new Error(`Unexpected viewer state '${String(state)}'.`);
  return state;
}

async function captureValid(page: Page, url: string, file: string, grayscale: boolean): Promise<CaptureResult> {
  const started = performance.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const state = await waitForResult(page);
  const message = await page.locator('html').getAttribute('data-graphics-message');
  if (state === 'error') throw new Error(`Viewer rejected valid asset: ${message ?? 'unknown error'}`);
  const viewer = await page.evaluate(() => window.valleyGraphicsReport);
  if (viewer === undefined) throw new Error('Viewer became ready without structured metadata.');
  const png = await page.screenshot({ path: file });
  let grayEvidence: CaptureResult['grayscale'] = null;
  if (grayscale) {
    await page.locator('html').evaluate((element) => { element.style.filter = 'grayscale(1)'; });
    const grayFile = file.replace(/\.png$/u, '-gray.png');
    const gray = await page.screenshot({ path: grayFile });
    grayEvidence = { file: grayFile, sha256: sha256(gray), dimensions: pngDimensions(gray) };
  }
  return {
    file, sha256: sha256(png), dimensions: pngDimensions(png), grayscale: grayEvidence,
    durationMs: Math.round(performance.now() - started), viewer,
  };
}

async function main(): Promise<void> {
  const width = numericArgument('width', 640, 64, 4096);
  const height = numericArgument('height', 640, 64, 4096);
  const pixelRatio = numericArgument('pixelRatio', 1, 0.5, 4);
  const camera = argument('camera', 'iso-ne');
  const presentationSeconds = numericArgument('time', 0, 0, 1_000_000);
  const grayscale = argument('grayscale', 'false') === 'true';
  const output = resolve(ROOT, argument('output', DEFAULT_OUTPUT));
  const outputRelative = relative(ROOT, output);
  if (outputRelative.startsWith(`..${sep}`) || outputRelative === '..') {
    throw new Error('The output must be inside the repository.');
  }
  const assetPath = resolve(ROOT, argument('asset', 'artifacts/graphics/G-00/axis-marker.glb'));
  const assetRelative = relative(ROOT, assetPath);
  if (assetRelative.startsWith(`..${sep}`) || assetRelative === '..') {
    throw new Error('The asset must be inside the repository so Vite can serve it.');
  }
  if (!existsSync(assetPath)) throw new Error(`Asset does not exist: ${assetPath}`);

  await mkdir(output, { recursive: true });
  for (const name of ['capture-1.png', 'capture-1-gray.png', 'capture-2.png', 'capture-2-gray.png', 'missing-resource.png', 'capture.json']) {
    await rm(resolve(output, name), { force: true });
  }

  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  const browserErrors: string[] = [];
  try {
    const port = await freePort();
    server = await createServer({ root: ROOT, server: { host: '127.0.0.1', port, strictPort: true } });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (base === undefined) throw new Error('Vite did not publish a local URL.');

    const bundled = chromium.executablePath();
    const executablePath = existsSync(bundled)
      ? bundled
      : SYSTEM_BROWSERS.find(existsSync);
    browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) });
    const browserVersion = browser.version();
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: pixelRatio });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    const assetUrl = `/${assetRelative.split(sep).map(encodeURIComponent).join('/')}`;
    const viewerPath = '/tools/graphics/viewer.html';
    const query = new URLSearchParams({
      asset: assetUrl, width: String(width), height: String(height),
      pixelRatio: String(pixelRatio), camera, time: String(presentationSeconds),
    });
    const validUrl = new URL(`${viewerPath}?${query.toString()}`, base).href;
    const captures = [
      await captureValid(page, validUrl, resolve(output, 'capture-1.png'), grayscale),
      await captureValid(page, validUrl, resolve(output, 'capture-2.png'), grayscale),
    ];
    if (captures[0]?.sha256 !== captures[1]?.sha256) {
      throw new Error(`Determinism failure: ${captures[0]?.sha256} != ${captures[1]?.sha256}`);
    }
    if (captures[0]?.dimensions.width !== captures[1]?.dimensions.width
      || captures[0]?.dimensions.height !== captures[1]?.dimensions.height) {
      throw new Error('Determinism failure: repeated captures have different dimensions.');
    }
    if (grayscale && captures[0]?.grayscale?.sha256 !== captures[1]?.grayscale?.sha256) {
      throw new Error('Determinism failure: repeated grayscale captures differ.');
    }

    const missingQuery = new URLSearchParams(query);
    missingQuery.set('asset', '/artifacts/graphics/G-00/intentionally-missing.glb');
    const missingUrl = new URL(`${viewerPath}?${missingQuery.toString()}`, base).href;
    const missingStarted = performance.now();
    await page.goto(missingUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const missingState = await waitForResult(page);
    const missingMessage = await page.locator('html').getAttribute('data-graphics-message');
    await page.screenshot({ path: resolve(output, 'missing-resource.png') });
    if (missingState !== 'error') throw new Error('The deliberately missing resource unexpectedly loaded.');

    const threePackage = JSON.parse(await readFile(resolve(ROOT, 'node_modules', 'three', 'package.json'), 'utf8')) as { version?: string };
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      invocation: 'npx tsx tools/graphics/capture.ts',
      input: { assetPath, assetUrl, viewport: { width, height, pixelRatio }, camera, presentationSeconds, grayscale },
      environment: { node: process.version, browser: browserVersion, three: threePackage.version ?? 'unknown' },
      captures,
      deterministicOnThisHost: true,
      missingResource: {
        url: missingUrl,
        state: missingState,
        message: missingMessage,
        durationMs: Math.round(performance.now() - missingStarted),
        screenshot: resolve(output, 'missing-resource.png'),
      },
      browserErrors,
    };
    await writeFile(resolve(output, 'capture.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await browser?.close();
    await server?.close();
  }
}

await main();
