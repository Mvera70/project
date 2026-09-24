#!/usr/bin/env node
// Comparación visual de marcha de GLB candidatos contra los recursos publicados.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { relative, resolve, sep } from 'node:path';
import { Box3, OrthographicCamera, Sphere, Vector3 } from 'three';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '../..');
const WIDTH = 480;
const HEIGHT = 480;
const ZOOM = 1.55;
const POSES = 12;
const SPECIES = {
  deer: [
    { name: 'foreL', hip: 'foreL', knee: 'foreLLower', ankle: 'foreLFoot' },
    { name: 'foreR', hip: 'foreR', knee: 'foreRLower', ankle: 'foreRFoot' },
    { name: 'hindL', hip: 'hindL', knee: 'hindLLower', ankle: 'hindLFoot' },
    { name: 'hindR', hip: 'hindR', knee: 'hindRLower', ankle: 'hindRFoot' },
  ],
  bear: [
    { name: 'foreL', hip: 'foreL', knee: 'foreLLower', ankle: 'foreLFoot' },
    { name: 'foreR', hip: 'foreR', knee: 'foreRLower', ankle: 'foreRFoot' },
    { name: 'hindL', hip: 'hindL', knee: 'hindLLower', ankle: 'hindLFoot' },
    { name: 'hindR', hip: 'hindR', knee: 'hindRLower', ankle: 'hindRFoot' },
  ],
};
const DIRECTIONS = {
  'iso-ne': new Vector3(1, 0.9, 1.15),
};

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1] ?? fallback;
}

function repositoryPath(path, label) {
  const absolute = resolve(ROOT, path);
  const rel = relative(ROOT, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(absolute) === resolve(ROOT, '..')) {
    throw new Error(`${label} must be inside the repository: ${absolute}`);
  }
  return absolute;
}

function assetUrl(path) {
  return `/${relative(ROOT, path).split(sep).map(encodeURIComponent).join('/')}`;
}

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function freePort() {
  const server = createNetServer();
  try {
    await new Promise((ready, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', ready);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Could not allocate a local port.');
    return address.port;
  } finally {
    await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  }
}

function cameraFor(bounds, width = WIDTH, height = HEIGHT) {
  const box = new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max));
  const sphere = box.getBoundingSphere(new Sphere());
  const radius = Math.max(sphere.radius, 0.01);
  const direction = DIRECTIONS['iso-ne'].clone();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  camera.position.copy(sphere.center).addScaledVector(direction.normalize(), radius * 4);
  camera.up.set(0, 1, 0);
  camera.lookAt(sphere.center);
  camera.near = Math.max(radius * 0.01, 0.001);
  camera.far = radius * 10;
  camera.updateMatrixWorld(true);

  const { min, max } = box;
  const corners = [
    new Vector3(min.x, min.y, min.z), new Vector3(max.x, min.y, min.z),
    new Vector3(min.x, max.y, min.z), new Vector3(max.x, max.y, min.z),
    new Vector3(min.x, min.y, max.z), new Vector3(max.x, min.y, max.z),
    new Vector3(min.x, max.y, max.z), new Vector3(max.x, max.y, max.z),
  ].map(point => point.applyMatrix4(camera.matrixWorldInverse));
  const halfWidth = Math.max(...corners.map(point => Math.abs(point.x)));
  const halfHeight = Math.max(...corners.map(point => Math.abs(point.y)));
  const fitted = Math.max(halfHeight, halfWidth / (width / height), radius * 0.1) * 1.14;
  const framedHalfHeight = fitted / ZOOM;
  camera.left = -framedHalfHeight * (width / height);
  camera.right = framedHalfHeight * (width / height);
  camera.top = framedHalfHeight;
  camera.bottom = -framedHalfHeight;
  camera.updateProjectionMatrix();
  return camera;
}

function angleAt(a, b, c) {
  const u = new Vector3(...a).sub(new Vector3(...b));
  const v = new Vector3(...c).sub(new Vector3(...b));
  if (u.length() === 0 || v.length() === 0) return null;
  return Math.acos(Math.max(-1, Math.min(1, u.normalize().dot(v.normalize())))) * 180 / Math.PI;
}

function project(point, camera) {
  const ndc = new Vector3(...point).project(camera);
  const x = (ndc.x + 1) * 50;
  const y = (1 - ndc.y) * 50;
  return {
    x: Number(x.toFixed(2)), y: Number(y.toFixed(2)),
    inside: ndc.x >= -1 && ndc.x <= 1 && ndc.y >= -1 && ndc.y <= 1 && ndc.z >= -1 && ndc.z <= 1,
  };
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function main() {
  const candidateDir = repositoryPath(arg('candidate-dir', ''), 'Candidate directory');
  if (!arg('candidate-dir', '')) {
    throw new Error('Usage: npx tsx tools/graphics/animal-gait-compare.mjs --candidate-dir artifacts/graphics/<round>/candidate [--output artifacts/graphics/<round>/gait-review]');
  }
  const output = repositoryPath(
    arg('output', `artifacts/graphics/gait-review/${new Date().toISOString().replaceAll(':', '-')}`),
    'Output directory',
  );
  const targets = Object.keys(SPECIES).map(id => ({
    id,
    published: resolve(ROOT, `public/assets/valley3d/${id}.glb`),
    candidate: resolve(candidateDir, `${id}.glb`),
  }));
  for (const target of targets) {
    for (const [label, path] of [['published', target.published], ['candidate', target.candidate]]) {
      if (!existsSync(path)) throw new Error(`Missing ${label} ${target.id} GLB: ${path}`);
    }
  }
  if (existsSync(output)) throw new Error(`Output already exists; choose a new path: ${output}`);
  mkdirSync(output, { recursive: true });

  let server;
  let browser;
  const errors = [];
  const animals = {};
  try {
    const port = await freePort();
    server = await createServer({
      root: ROOT,
      server: { host: '127.0.0.1', port, strictPort: true, watch: { ignored: ['**/artifacts/**'] } },
    });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (base === undefined) throw new Error('Vite did not provide a local URL.');
    const executablePath = existsSync(chromium.executablePath()) ? chromium.executablePath() : undefined;
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

    for (const target of targets) {
      const versions = {};
      for (const variant of ['published', 'candidate']) {
        const path = target[variant];
        const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
        let active = `${target.id}/${variant}`;
        page.on('pageerror', error => errors.push({ target: active, kind: 'pageerror', message: error.message }));
        page.on('console', message => {
          if (message.type() === 'error') errors.push({ target: active, kind: 'console', message: message.text() });
        });
        page.on('requestfailed', request => errors.push({
          target: active, kind: 'requestfailed', url: request.url(), message: request.failure()?.errorText ?? 'unknown',
        }));
        const query = new URLSearchParams({
          asset: assetUrl(path), width: String(WIDTH), height: String(HEIGHT),
          pixelRatio: '1', camera: 'iso-ne', zoom: String(ZOOM), clip: 'walk', time: '0',
        });
        await page.goto(new URL(`/tools/graphics/viewer.html?${query}`, base).href, {
          waitUntil: 'domcontentloaded', timeout: 30_000,
        });
        await page.waitForFunction(() => ['ready', 'error'].includes(document.documentElement.dataset.graphicsState),
          undefined, { timeout: 30_000 });
        const state = await page.locator('html').getAttribute('data-graphics-state');
        if (state !== 'ready') throw new Error(`${active}: viewer error: ${await page.locator('html').getAttribute('data-graphics-message')}`);

        const initial = await page.evaluate(() => ({
          report: window.valleyGraphicsReport,
          clips: window.valleyGraphicsProbe?.clips ?? [],
        }));
        const walk = initial.clips.find(clip => clip.name === 'walk');
        if (walk === undefined) throw new Error(`${active}: exported GLB has no 'walk' clip.`);
        const camera = cameraFor(initial.report.bounds);
        const frames = [];
        for (let index = 0; index < POSES; index += 1) {
          const phase = index / POSES;
          const seconds = walk.duration * phase;
          active = `${target.id}/${variant}/pose-${String(index + 1).padStart(2, '0')}`;
          const pose = await page.evaluate(seconds => {
            window.valleyGraphicsProbe?.show('walk', seconds);
            return window.valleyGraphicsProbe?.pose() ?? {};
          }, seconds);
          const landmarks = SPECIES[target.id].map(chain => {
            const hip = pose[chain.hip]?.joint;
            const knee = pose[chain.knee]?.joint;
            const ankle = pose[chain.ankle]?.joint;
            if (!hip || !knee || !ankle) {
              throw new Error(`${active}: missing landmark bone(s) ${chain.hip}, ${chain.knee}, ${chain.ankle}`);
            }
            const angle = angleAt(hip, knee, ankle);
            return {
              chain: chain.name,
              hip: { world: hip },
              knee: { world: knee, screen: project(knee, camera), visible: project(knee, camera).inside },
              ankle: { world: ankle, screen: project(ankle, camera), visible: project(ankle, camera).inside },
              kneeFlexionDegrees: angle === null ? null : Number((180 - angle).toFixed(2)),
            };
          });
          const file = resolve(output, `${target.id}-${variant}-${String(index + 1).padStart(2, '0')}.png`);
          await page.locator('canvas').screenshot({ path: file });
          frames.push({ index: index + 1, phase: Number(phase.toFixed(4)), seconds: Number(seconds.toFixed(4)), file, landmarks });
        }
        versions[variant] = {
          path: relative(ROOT, path).replaceAll('\\', '/'),
          sha256: digest(path),
          clipDurationSeconds: Number(walk.duration.toFixed(4)),
          bonesFound: [...new Set(frames[0].landmarks.flatMap(item => [item.chain, `${item.chain}Lower`, `${item.chain}Foot`]))],
          poses: frames,
        };
        await page.close();
      }
      animals[target.id] = versions;
      await writeContactSheet(target.id, versions, output, browser);
    }
  } finally {
    await browser?.close();
    await server?.close();
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx tools/graphics/animal-gait-compare.mjs --candidate-dir <folder>',
    candidateDirectory: relative(ROOT, candidateDir).replaceAll('\\', '/'),
    capture: { camera: 'iso-ne', viewport: [WIDTH, HEIGHT], zoom: ZOOM, samples: POSES, phase: 'i / 12 of each exported walk clip' },
    animals,
    javascriptErrors: errors,
    status: errors.length === 0 ? 'captured-without-js-errors' : 'captured-with-js-errors',
  };
  const { writeFileSync } = await import('node:fs');
  writeFileSync(resolve(output, 'gait-comparison.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`12-pose gait comparison saved to ${relative(ROOT, output)}\n`);
  process.stdout.write(`JavaScript errors: ${errors.length}\n`);
}

async function writeContactSheet(id, versions, output, browser) {
  const sheet = await browser.newPage({ viewport: { width: WIDTH * 2, height: HEIGHT * 6 + 320 }, deviceScaleFactor: 1 });
  const cells = [];
  for (let i = 0; i < POSES; i += 1) {
    const published = versions.published.poses[i];
    const candidate = versions.candidate.poses[i];
    const side = (version, pose, label) => {
      const png = readFileSync(pose.file).toString('base64');
      const markers = pose.landmarks.flatMap(landmark => [
        { role: 'knee', name: `${landmark.chain} knee`, position: landmark.knee.screen },
        { role: 'ankle', name: `${landmark.chain} ankle`, position: landmark.ankle.screen },
      ]).filter(marker => marker.position.inside).map(marker =>
        `<span class="marker ${marker.role}" title="${escapeHtml(marker.name)}" style="left:${marker.position.x}%;top:${marker.position.y}%">${marker.role === 'knee' ? 'K' : 'A'}</span>`,
      ).join('');
      const missing = pose.landmarks.some(landmark => !landmark.knee.visible || !landmark.ankle.visible)
        ? '<span class="visibility">Some landmarks fall outside the camera</span>' : '';
      return `<div class="side"><div class="variant">${label} · ${escapeHtml(version.clipDurationSeconds)} s</div><div class="frame"><img src="data:image/png;base64,${png}" alt="${escapeHtml(id)} ${label} pose ${i + 1}">${markers}${missing}</div></div>`;
    };
    cells.push(`<article><header>Pose ${String(i + 1).padStart(2, '0')} · ${Math.round(published.phase * 100)}% cycle</header><div class="pair">${side(versions.published, published, 'PUBLISHED')}${side(versions.candidate, candidate, 'CANDIDATE')}</div></article>`);
  }
  await sheet.setContent(`<!doctype html><meta charset="utf-8"><title>${id} gait comparison</title><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;background:#ded8c9;color:#27251f;font:14px/1.35 system-ui,sans-serif}
    h1{margin:0 0 6px;font-size:22px}p{margin:0 0 14px;color:#615c50}.grid{display:grid;grid-template-columns:${WIDTH * 2}px;gap:14px}
    article{width:${WIDTH * 2}px;background:#f3efe5;border:1px solid #aaa18f}header{padding:6px 10px;background:#c7bfad;font-weight:700}
    .pair{display:flex}.side{width:${WIDTH}px}.variant{padding:4px 8px;background:#e9e3d7;font-weight:700;font-size:12px}.frame{position:relative;width:${WIDTH}px;height:${HEIGHT}px;background:#e8e2d6}
    img{display:block;width:${WIDTH}px;height:${HEIGHT}px}.marker{position:absolute;transform:translate(-50%,-50%);width:19px;height:19px;border:2px solid #fff;border-radius:50%;color:#fff;text-align:center;font:bold 10px/15px sans-serif;text-shadow:0 1px 2px #000;box-shadow:0 0 2px #111}
    .knee{background:#c3422f}.ankle{background:#176da1}.visibility{position:absolute;left:4px;bottom:4px;padding:2px 4px;background:#8b2822;color:white;font-size:10px}
    .legend{margin:0 0 14px}.legend b{display:inline-block;margin-right:14px}
  </style><h1>${escapeHtml(id)} · published vs candidate</h1><p class="legend"><b><span style="color:#c3422f">K</span> rodilla (origen del hueso inferior)</b><b><span style="color:#176da1">A</span> tobillo (origen del hueso del pie)</b> · cámara y fase iguales</p><div class="grid">${cells.join('')}</div>`);
  await sheet.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await sheet.screenshot({ path: resolve(output, `${id}-gait-contact.png`), fullPage: true });
  await sheet.close();
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
