/**
 * P-1a · Banco de la aplicación completa, no del renderer aislado.
 *
 * Entra por el menú de verdad: abre Desarrollo y pulsa el preset village
 * (semilla 11, año visible 21). Por eso mide también el trabajo de UI, carga,
 * creación de estado y vida que `bench.ts` deja intencionadamente fuera.
 *
 * No llama INP a `inputToNextAnimationFrameMs`: es una latencia sintética,
 * repetible, desde el wheel que llega al lienzo hasta el RAF siguiente. Los
 * Event Timing entries se conservan aparte cuando el navegador las ofrece.
 * `--condition all` fija sólo la presentación en día despejado, noche
 * despejada y noche lluviosa mediante la ruta local de diagnóstico. La app
 * conserva el estado, la vida y los guardados del preset real.
 *
 * Ejecución de la primera línea de base de la app:
 *   npx tsx tools/graphics/bench-app.ts --repeats 3 --cache cold --seconds 10
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { hostname, platform, release } from 'node:os';
import { createServer as createNetServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '..', '..');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EXPECTED = { seed: 11, visibleYear: 21, presetId: 'village' } as const;
type Condition = 'natural' | 'day-clear' | 'night-clear' | 'night-wet';
const CONTROLLED: Record<Exclude<Condition, 'natural'>, { readonly phase: number; readonly sky: 'clear' | 'rain' }> = {
  'day-clear': { phase: 0.38, sky: 'clear' },
  'night-clear': { phase: 0.85, sky: 'clear' },
  'night-wet': { phase: 0.85, sky: 'rain' },
};

function conditionsOf(value: string): readonly Condition[] {
  if (value === 'all') return ['day-clear', 'night-clear', 'night-wet'];
  if (value === 'natural' || value === 'day-clear' || value === 'night-clear' || value === 'night-wet') return [value];
  throw new Error('--condition must be natural, day-clear, night-clear, night-wet, or all.');
}

function conditionUrl(base: string, condition: Condition, stages: boolean): string {
  const url = new URL(base);
  if (condition !== 'natural') {
    url.searchParams.set('preview-phase', String(CONTROLLED[condition].phase));
    url.searchParams.set('preview-sky', CONTROLLED[condition].sky);
  }
  if (stages) url.searchParams.set('bench-stages', '1');
  return url.toString();
}

interface RawTiming {
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly processingStart?: number;
  readonly processingEnd?: number;
  readonly interactionId?: number;
  readonly domContentLoadedEventEnd?: number;
}

interface PageProbe {
  readonly eventTimingSupported: boolean;
  readonly navigation: RawTiming | null;
  readonly longTasks: readonly RawTiming[];
  readonly eventTimings: readonly RawTiming[];
  readonly inputSamples: readonly number[];
  readonly resources: readonly ResourceTiming[];
  readonly stageMarks: readonly RawTiming[];
  readonly appReadyAt: number | null;
  readonly render3dAt: number | null;
  readonly usableAt: number | null;
  readonly presetClickAt: number | null;
  readonly postLoadInteractionAt: number | null;
}

interface ResourceTiming {
  readonly name: string;
  readonly initiatorType: string;
  readonly startTime: number;
  readonly duration: number;
  readonly transferSize: number;
  readonly encodedBodySize: number;
  readonly decodedBodySize: number;
}

interface Cadence {
  readonly samples: readonly number[];
  readonly p50: number | null;
  readonly p95: number | null;
  readonly p99: number | null;
}

interface Replica {
  readonly index: number;
  readonly condition: Condition;
  readonly cache: 'cold' | 'warm';
  readonly preset: typeof EXPECTED;
  readonly observed: { readonly date: string | null; readonly people: string | null; readonly sky: string | null; readonly sunPhase: string | null };
  readonly load: { readonly navigationToDomContentLoadedMs: number | null; readonly presetToAppReadyMs: number | null; readonly presetToUsableMs: number | null };
  readonly marks: { readonly presetClickAt: number | null; readonly appReadyAt: number | null; readonly render3dAt: number | null; readonly usableAt: number | null; readonly postLoadInteractionAt: number | null };
  readonly cadence: Cadence;
  readonly interaction: { readonly name: 'wheel-to-next-animation-frame'; readonly samplesMs: readonly number[]; readonly p50: number | null; readonly p95: number | null };
  readonly postLoadInteraction: { readonly name: 'bare-view-toggle'; readonly attemptedClicks: number; readonly eventTimingSupported: boolean; readonly observedInteractions: readonly { readonly id: number; readonly maxEventDurationMs: number }[]; readonly p95: number | null; readonly browserInpMs: null };
  readonly longTasks: readonly RawTiming[];
  readonly eventTimings: readonly RawTiming[];
  readonly resources: readonly ResourceTiming[];
  readonly stageMarks: readonly RawTiming[];
  readonly screenshot: string | null;
  readonly pageErrors: readonly string[];
  readonly cpuProfile: unknown | null;
  readonly loadCpuProfile: unknown | null;
}

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : (process.argv[at + 1] ?? fallback);
}

function percentile(values: readonly number[], point: number): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.max(0, Math.round((ordered.length - 1) * point)))] ?? null;
}

async function freePort(): Promise<number> {
  const server = createNetServer();
  try {
    await new Promise<void>((ready, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ready); });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('No local port was allocated.');
    return address.port;
  } finally {
    await new Promise<void>((done, fail) => server.close((error) => error === undefined ? done() : fail(error)));
  }
}

function browserChoice(): { readonly executablePath?: string; readonly label: 'edge' | 'chromium-fallback' } {
  if (existsSync(EDGE)) return { executablePath: EDGE, label: 'edge' };
  const bundled = chromium.executablePath();
  return existsSync(bundled) ? { executablePath: bundled, label: 'chromium-fallback' } : { label: 'chromium-fallback' };
}

function revision(): string | null {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim(); }
  catch { return null; }
}

async function uniqueOutput(): Promise<string> {
  const base = resolve(ROOT, 'artifacts', 'graphics', 'P-1a-app');
  await mkdir(base, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/gu, '-');
  for (let serial = 0; serial < 100; serial += 1) {
    const candidate = resolve(base, `${stem}-${String(serial).padStart(2, '0')}`);
    try { await mkdir(candidate, { recursive: false }); return candidate; }
    catch (error) { if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error; }
  }
  throw new Error('Could not allocate a non-overwriting artifact directory.');
}

async function installProbe(page: Page): Promise<void> {
  const script = () => {
    type Entry = { name: string; startTime: number; duration: number; processingStart?: number; processingEnd?: number; interactionId?: number; domContentLoadedEventEnd?: number };
    type Resource = { name: string; initiatorType: string; startTime: number; duration: number; transferSize: number; encodedBodySize: number; decodedBodySize: number };
    const copy = (entry: PerformanceEntry): Entry => {
      const timing = entry as PerformanceEntry & Partial<PerformanceEventTiming>;
      const event = entry as unknown as { interactionId?: unknown };
      return {
        name: entry.name, startTime: entry.startTime, duration: entry.duration,
        ...(typeof timing.processingStart === 'number' ? { processingStart: timing.processingStart } : {}),
        ...(typeof timing.processingEnd === 'number' ? { processingEnd: timing.processingEnd } : {}),
        ...('domContentLoadedEventEnd' in entry && typeof entry.domContentLoadedEventEnd === 'number'
          ? { domContentLoadedEventEnd: entry.domContentLoadedEventEnd } : {}),
        ...(typeof event.interactionId === 'number' ? { interactionId: event.interactionId } : {}),
      };
    };
    const resources = (): Resource[] => performance.getEntriesByType('resource')
      .filter((entry) => entry.name.includes('valley3d') || entry.name.endsWith('.glb'))
      .map((entry) => {
        const resource = entry as PerformanceResourceTiming;
        return { name: entry.name, initiatorType: resource.initiatorType, startTime: entry.startTime, duration: entry.duration,
          transferSize: resource.transferSize, encodedBodySize: resource.encodedBodySize, decodedBodySize: resource.decodedBodySize };
      });
    const probe: { eventTimingSupported: boolean; navigation: Entry | null; longTasks: Entry[]; eventTimings: Entry[]; inputSamples: number[]; resources: Resource[]; stageMarks: Entry[]; appReadyAt: number | null; render3dAt: number | null; usableAt: number | null; presetClickAt: number | null; postLoadInteractionAt: number | null } = {
      eventTimingSupported: PerformanceObserver.supportedEntryTypes.includes('event'),
      navigation: null, longTasks: [], eventTimings: [], inputSamples: [], resources: [], stageMarks: [], appReadyAt: null, render3dAt: null, usableAt: null, presetClickAt: null, postLoadInteractionAt: null,
    };
    const markUsable = (): void => {
      if (probe.usableAt !== null || probe.appReadyAt === null || probe.render3dAt === null) return;
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { probe.usableAt = performance.now(); })));
    };
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.appReady === 'true' && probe.appReadyAt === null) probe.appReadyAt = performance.now();
      if (document.documentElement.dataset.render === 'pilot3d' && probe.render3dAt === null) probe.render3dAt = performance.now();
      markUsable();
    });
    const observeRoot = (): void => {
      if (document.documentElement === null) { setTimeout(observeRoot, 0); return; }
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-app-ready', 'data-render'] });
    };
    observeRoot();
    for (const type of ['longtask', 'event'] as const) {
      try {
        new PerformanceObserver((list) => {
          const target = type === 'longtask' ? probe.longTasks : probe.eventTimings;
          target.push(...list.getEntries().map(copy));
        }).observe(type === 'event' ? { type, buffered: true, durationThreshold: 16 } as PerformanceObserverInit : { type, buffered: true });
      } catch { /* Event Timing and Long Tasks are optional browser APIs. */ }
    }
    window.addEventListener('wheel', () => {
      const arrived = performance.now();
      requestAnimationFrame(() => probe.inputSamples.push(performance.now() - arrived));
    }, { capture: true, passive: true });
    (window as Window & { __valleyAppBench?: unknown }).__valleyAppBench = {
      markPresetClick: () => { probe.presetClickAt = performance.now(); },
      markPostLoadInteraction: () => { probe.postLoadInteractionAt = performance.now(); },
      read: () => { const navigation = performance.getEntriesByType('navigation')[0]; probe.navigation = navigation === undefined ? null : copy(navigation); probe.resources = resources(); probe.stageMarks = performance.getEntriesByType('mark').filter((entry) => entry.name.startsWith('valley3d:')).map(copy); return probe; },
      cadence: async (milliseconds: number): Promise<number[]> => new Promise((done) => {
        const samples: number[] = []; let previous = performance.now(); const until = previous + milliseconds;
        const frame = (now: number): void => { samples.push(now - previous); previous = now; if (now < until) requestAnimationFrame(frame); else done(samples.slice(1)); };
        requestAnimationFrame(frame);
      }),
    };
  };
  await page.addInitScript({ content: `var __name = (target) => target; (${script.toString()})();` });
}

async function openPreset(page: Page, base: string, beforePresetClick?: () => Promise<void>): Promise<void> {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('.title-scrim').waitFor({ timeout: 60_000 });
  // La preferencia de Desarrollo persiste entre las dos páginas del contexto caliente.
  if (await page.locator('.title-dev').getAttribute('aria-pressed') !== 'true') await page.locator('.title-dev').click();
  await page.locator('.title-dev-row').waitFor({ state: 'visible' });
  const presets = page.locator('.title-preset');
  if (await presets.count() !== 3) throw new Error('Development menu no longer has the three known presets.');
  await beforePresetClick?.();
  await page.evaluate(() => ((window as unknown as { __valleyAppBench: { markPresetClick(): void } }).__valleyAppBench.markPresetClick()));
  await presets.nth(1).click();
  await page.locator('html[data-app-ready="true"][data-render="pilot3d"]').waitFor({ timeout: 120_000 });
}

async function measureReplica(context: BrowserContext, base: string, index: number, condition: Condition, cache: 'cold' | 'warm', sampleMs: number, settleMs: number, profileCpu: boolean, profileLoad: boolean, stages: boolean, screenshot: string | null): Promise<Replica> {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installProbe(page);
  const loadCdp: CDPSession | null = profileLoad ? await context.newCDPSession(page) : null;
  if (loadCdp !== null) await loadCdp.send('Profiler.enable');
  try {
    await openPreset(page, base, loadCdp === null ? undefined : async () => { await loadCdp.send('Profiler.start'); });
    if (loadCdp !== null) {
      await page.waitForFunction(() => (window as unknown as { __valleyAppBench: { read(): PageProbe } }).__valleyAppBench.read().usableAt !== null, undefined, { timeout: 30_000 });
    }
  }
  catch (error) { throw new Error(`Preset setup failed: ${error instanceof Error ? error.message : String(error)}; page errors: ${errors.join(' | ')}`); }
  const loadCpuProfile = loadCdp === null ? null : (await loadCdp.send('Profiler.stop')).profile;
  if (loadCdp !== null) await loadCdp.send('Profiler.disable');
  if (settleMs > 0) await page.waitForTimeout(settleMs);
  if (screenshot !== null) await page.screenshot({ path: screenshot });
  const cdp: CDPSession | null = profileCpu ? await context.newCDPSession(page) : null;
  if (cdp !== null) await cdp.send('Profiler.enable');
  if (cdp !== null) await cdp.send('Profiler.start');
  const cadenceSamples = await page.evaluate((duration) => (window as unknown as { __valleyAppBench: { cadence(milliseconds: number): Promise<number[]> } }).__valleyAppBench.cadence(duration), sampleMs);
  const canvas = page.locator('#valley3d');
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await canvas.hover(); await page.mouse.wheel(0, attempt % 2 === 0 ? 1 : -1);
  }
  await page.waitForFunction(() => ((window as unknown as { __valleyAppBench: { read(): PageProbe } }).__valleyAppBench.read().inputSamples.length >= 8), undefined, { timeout: 10_000 });
  const cpuProfile = cdp === null ? null : (await cdp.send('Profiler.stop')).profile;
  if (cdp !== null) await cdp.send('Profiler.disable');
  await page.evaluate(() => (window as unknown as { __valleyAppBench: { markPostLoadInteraction(): void } }).__valleyAppBench.markPostLoadInteraction());
  const bareToggle = page.locator('.valley-bare');
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await bareToggle.click();
    await bareToggle.waitFor({ state: 'visible' });
    await page.waitForFunction((pressed) => document.querySelector('.valley-bare')?.getAttribute('aria-pressed') === pressed,
      String(attempt % 2 === 0));
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(250);
  const raw = await page.evaluate(() => (window as unknown as { __valleyAppBench: { read(): PageProbe } }).__valleyAppBench.read());
  if (stages && !raw.stageMarks.some((entry) => entry.name === 'valley3d:paint:submit-end')) {
    throw new Error('Stage diagnostics did not reach the first 3D render.');
  }
  const observed = await page.evaluate(() => ({
    date: document.querySelector('.valley-date')?.textContent?.trim() ?? null,
    people: document.querySelector('.valley-vital b')?.textContent?.trim() ?? null,
    sky: document.documentElement.dataset.sky ?? null,
    sunPhase: document.documentElement.dataset.sunPhase ?? null,
  }));
  await page.close();
  if (observed.date?.includes('21') !== true) throw new Error(`Preset did not show visible year 21 (saw ${observed.date ?? 'nothing'}).`);
  if (observed.people === null) throw new Error('The population chip was absent; cannot establish comparable inhabitants.');
  if (condition !== 'natural') {
    const expected = CONTROLLED[condition];
    if (observed.sky !== expected.sky || Math.abs(Number(observed.sunPhase) - expected.phase) > 0.01) {
      throw new Error(`${condition} control failed: saw sky=${observed.sky ?? 'none'}, phase=${observed.sunPhase ?? 'none'}.`);
    }
  }
  const interaction = raw.inputSamples;
  const postLoadById = new Map<number, number>();
  for (const entry of raw.eventTimings) {
    if (raw.postLoadInteractionAt === null || entry.startTime < raw.postLoadInteractionAt || !entry.interactionId) continue;
    postLoadById.set(entry.interactionId, Math.max(postLoadById.get(entry.interactionId) ?? 0, entry.duration));
  }
  const postLoadDurations = [...postLoadById.values()];
  return {
    index, condition, cache, preset: EXPECTED, observed,
    load: {
      navigationToDomContentLoadedMs: raw.navigation?.domContentLoadedEventEnd ?? null,
      presetToAppReadyMs: raw.appReadyAt === null || raw.presetClickAt === null ? null : raw.appReadyAt - raw.presetClickAt,
      presetToUsableMs: raw.usableAt === null || raw.presetClickAt === null ? null : raw.usableAt - raw.presetClickAt,
    },
    marks: { presetClickAt: raw.presetClickAt, appReadyAt: raw.appReadyAt, render3dAt: raw.render3dAt,
      usableAt: raw.usableAt, postLoadInteractionAt: raw.postLoadInteractionAt },
    cadence: { samples: cadenceSamples, p50: percentile(cadenceSamples, 0.5), p95: percentile(cadenceSamples, 0.95), p99: percentile(cadenceSamples, 0.99) },
    interaction: { name: 'wheel-to-next-animation-frame', samplesMs: interaction, p50: percentile(interaction, 0.5), p95: percentile(interaction, 0.95) },
    postLoadInteraction: { name: 'bare-view-toggle', attemptedClicks: 6, eventTimingSupported: raw.eventTimingSupported,
      observedInteractions: [...postLoadById].map(([id, maxEventDurationMs]) => ({ id, maxEventDurationMs })),
      p95: percentile(postLoadDurations, 0.95), browserInpMs: null },
    longTasks: raw.longTasks, eventTimings: raw.eventTimings, resources: raw.resources, stageMarks: raw.stageMarks,
    screenshot, pageErrors: errors, cpuProfile, loadCpuProfile,
  };
}

async function main(): Promise<void> {
  const repeats = Math.max(1, Number(option('repeats', '3')));
  const cacheArg = option('cache', 'cold');
  if (cacheArg !== 'cold' && cacheArg !== 'warm') throw new Error('--cache must be cold or warm.');
  const cache = cacheArg as 'cold' | 'warm';
  const conditions = conditionsOf(option('condition', 'natural'));
  const sampleMs = Math.max(1_000, Number(option('seconds', '10')) * 1_000);
  const settleMs = Math.max(0, Number(option('settle-seconds', conditions.includes('natural') ? '0' : '5')) * 1_000);
  const profileCpu = option('cpu-profile', 'false') === 'true';
  const profileLoad = option('profile-load', 'false') === 'true';
  const headed = option('headed', 'false') === 'true';
  const stages = option('stages', 'false') === 'true';
  const capture = option('capture', 'false') === 'true';
  const output = await uniqueOutput();
  const port = await freePort();
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    server = await createServer({ root: ROOT, server: { host: '127.0.0.1', port, strictPort: true, watch: { ignored: ['**/artifacts/**'] } } });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (base === undefined) throw new Error('Vite did not publish a local URL.');
    const choice = browserChoice();
    browser = await chromium.launch({ headless: !headed, ...(choice.executablePath === undefined ? {} : { executablePath: choice.executablePath }) });
    const replicas: Replica[] = [];
    for (let index = 1; index <= repeats; index += 1) {
      // Cada repetición rota el orden para repartir calentamiento y deriva térmica.
      for (let offset = 0; offset < conditions.length; offset += 1) {
        const condition = conditions[(index - 1 + offset) % conditions.length] as Condition;
        const url = conditionUrl(base, condition, stages);
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        if (cache === 'warm') {
          const primer = await context.newPage(); await installProbe(primer); await openPreset(primer, url); await primer.close();
        }
        const screenshot = capture && index === 1 ? resolve(output, `${condition}-${cache}.png`) : null;
        replicas.push(await measureReplica(context, url, index, condition, cache, sampleMs, settleMs, profileCpu, profileLoad, stages, screenshot));
        await context.close();
      }
    }
    const report = {
      schemaVersion: 4, generatedAt: new Date().toISOString(), commit: revision(),
      invocation: process.argv.slice(2), output, browser: { requested: 'Edge if installed; Chromium fallback', selected: choice.label, version: browser.version(), headed },
      durationSeconds: sampleMs / 1_000, settleSeconds: settleMs / 1_000, stageDiagnostics: stages,
      host: { hostname: hostname(), platform: platform(), release: release() }, viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, quality: 'standard',
      conditions: { requested: conditions, controlled: conditions.every((condition) => condition !== 'natural'),
        method: 'localhost Vite only; renderer-only preview-phase and preview-sky; rain keeps derived intensity when the original day is rainy',
        presets: CONTROLLED },
      metrics: { appRoute: 'title -> Development -> village preset', inputMetric: 'wheel-to-next-animation-frame (synthetic; not INP)',
        postLoadInteraction: 'six real bare-view clicks; Event Timing grouped by interactionId; entries under 16 ms may be absent; browser INP not measured',
        stageMarks: stages ? 'local DEV PerformanceMark boundaries in backend and first renderer paint; no GPU time' : 'not requested',
        eventTiming: 'raw entries when browser exposes Event Timing', resources: 'raw GLB/valley3d Resource Timing; zero transfer bytes alone do not prove a cache hit', gpu: 'not measured',
        cpuProfile: profileCpu ? 'CDP CPU profile during cadence and wheel; profiling overhead applies' : 'not measured',
        loadCpuProfile: profileLoad ? 'CDP CPU profile from before preset click through usable 3D; profiling overhead applies' : 'not measured' },
      replicas,
    };
    await writeFile(resolve(output, 'run.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`P-1a app report: ${resolve(output, 'run.json')}\n`);
  } finally { await browser?.close(); await server?.close(); }
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
