/**
 * G-09 · El corredor del banco. design.md D.9.
 *
 * Levanta el servidor, abre la página del banco en un navegador de verdad, la
 * deja correr y escribe el informe estructurado que D.9 exige.
 *
 * **Lo que este corredor no puede dar.** D.9 dice, con esas palabras, que la
 * emulación móvil no sustituye al hardware, y aquí sólo hay un Chrome de
 * escritorio. El informe lo declara en `device.realDevice: false` y ninguna
 * cifra de las que salen de aquí puede cerrar P3 por sí sola. Sirven para dos
 * cosas que sí valen: comparar escenas entre ellas, y comparar antes y después
 * de una optimización en la misma máquina.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { relative, resolve } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import type { BenchReport } from './bench';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUTPUT = resolve(ROOT, 'artifacts', 'graphics', 'G-09');
const SYSTEM_BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : (process.argv[index + 1] ?? fallback);
}

async function freePort(): Promise<number> {
  const server = createNetServer();
  try {
    await new Promise<void>((ready, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', ready);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('No local port.');
    return address.port;
  } finally {
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  }
}

function bar(value: number, top: number, width = 18): string {
  const filled = Math.max(0, Math.min(width, Math.round((value / Math.max(0.001, top)) * width)));
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

async function main(): Promise<void> {
  const seconds = Number(argument('seconds', '4'));
  const width = Number(argument('width', '390'));
  const height = Number(argument('height', '640'));
  const real = argument('real', 'false') === 'true';
  const suite = argument('suite', 'g09') === 'p1' ? 'p1' : 'g09';
  const repeats = Math.max(1, Number(argument('repeats', suite === 'p1' ? '3' : '1')));

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
    browser = await chromium.launch({
      headless: true,
      ...(executablePath === undefined ? {} : { executablePath }),
      // Sin argumentos. Forzar ANGLE o desbloquear la GPU dejaba el contexto en
      // nada —Three.js muere leyendo `precision` de un contexto nulo— y un banco
      // que no arranca no mide. Qué acaba pintando lo dice el informe, y si es
      // un rasterizador por software, mucho más motivo para no llamar a nada de
      // esto tiempo de GPU.
    });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));

    const query = new URLSearchParams({ seconds: String(seconds), real: String(real), suite, repeats: String(repeats) });
    await page.goto(`${base}tools/graphics/bench.html?${query.toString()}`, {
      waitUntil: 'domcontentloaded', timeout: 60_000,
    });
    await page.waitForFunction(
      () => ['done', 'error'].includes(document.documentElement.dataset.benchState ?? ''),
      undefined, { timeout: 15 * 60_000 },
    );
    if (await page.locator('html').getAttribute('data-bench-state') === 'error') {
      throw new Error(await page.locator('html').getAttribute('data-bench-message') ?? 'unknown');
    }

    const report = await page.evaluate(() => window.valleyBenchDone) as BenchReport | undefined;
    if (report === undefined) throw new Error('The bench finished without a report.');

    // P-1a conserva cada corrida: una base que pisa a la anterior no deja rango
    // ni permite comprobar un resultado sorprendente. El banco G-09 conserva su
    // ruta histórica para no alterar sus consumidores.
    const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
    const output = suite === 'p1' ? resolve(ROOT, 'artifacts', 'graphics', 'P-1a', stamp) : OUTPUT;
    await mkdir(output, { recursive: true });
    const file = resolve(output, 'benchmark.json');
    await writeFile(file, `${JSON.stringify({ ...report, problems }, null, 2)}\n`, 'utf8');

    process.stdout.write(
      `${report.suite} · ${report.device.gpu ?? 'GPU desconocida'} · ${report.device.cores ?? '?'} nucleos · `
      + `${width}x${height} @${report.device.pixelRatio}x\n`
      + `Dispositivo real: ${report.device.realDevice ? 'si' : 'NO — emulacion, D.9 no la acepta para cerrar P3'}\n`
      + `Instancia inicial ${report.load.coldMs.toFixed(0)} ms · segunda instancia ${report.load.warmMs.toFixed(0)} ms · `
      + `${(report.load.bytes / 1024).toFixed(0)} KB por red\n\n`,
    );

    const worst = Math.max(...report.scenes.map((scene) => scene.cpu.p95), 16.7);
    process.stdout.write(
      'escena          cpu med   p95    p99   fps  llamadas  triangulos  deriva\n',
    );
    for (const scene of report.scenes) {
      process.stdout.write(
        `${scene.id.padEnd(14)} ${scene.cpu.median.toFixed(2).padStart(6)} `
        + `${scene.cpu.p95.toFixed(2).padStart(6)} ${scene.cpu.p99.toFixed(2).padStart(6)} `
        + `${scene.cadence.fps.toFixed(0).padStart(5)} `
        + `${String(scene.stats.drawCalls).padStart(9)} ${String(scene.stats.triangles).padStart(11)} `
        + `${scene.drift >= 0 ? '+' : ''}${scene.drift.toFixed(2).padStart(6)}  |${bar(scene.cpu.p95, worst)}|\n`,
      );
    }
    process.stdout.write(`\nEscrito ${relative(ROOT, file)}\n`);
    if (problems.length > 0) process.stderr.write(`  ! ${problems.slice(0, 3).join(' | ')}\n`);
  } finally {
    await browser?.close();
    await server?.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
