import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { atomicWriteJson, assertInside } from './files';
import { validateGlb, type GlbInspection } from './glb';
import { parseCatalog, parseRecipe, type ArtCatalog, type ArtRecipe, type CatalogAsset, type Vec3 } from './schema';

type Command = 'build' | 'validate' | 'report' | 'all';
interface LatestRun { schemaVersion: 1; assetId: string; runId: string; directory: string }
interface FileEvidence { path: string; bytes: number; sha256: string }
interface CaptureReport {
  environment: { node: string; browser: string; three: string };
  captures: Array<{
    file: string; sha256: string; dimensions: { width: number; height: number }; durationMs: number;
    viewer: { objectNames: string[]; bounds: { min: Vec3; max: Vec3; size: Vec3 }; loadDurationMs: number };
  }>;
  deterministicOnThisHost: boolean;
  browserErrors: string[];
}
interface BuildReport {
  schemaVersion: 1; assetId: string; runId: string; recipe: string; blender: string;
  blenderVersion: string; durationMs: number; completionMarker: boolean; files: Record<string, FileEvidence>;
}
interface ValidationReport {
  schemaVersion: 1; assetId: string; runId: string; status: 'pass'; durationMs: number;
  candidateSha256: string; glb: GlbInspection; capture: CaptureReport;
  checks: string[];
}

const ROOT = resolve(import.meta.dirname, '..', '..');
const ARTIFACT_ROOT = resolve(ROOT, 'artifacts', 'graphics', 'G-02');
const RUNS = resolve(ARTIFACT_ROOT, 'runs');
const APPROVED = resolve(ARTIFACT_ROOT, 'approved');
const CATALOG_PATH = resolve(ROOT, 'art', 'catalog.json');
const GENERATOR = resolve(import.meta.dirname, 'blender-build.py');
const LATEST = resolve(ARTIFACT_ROOT, 'latest-run.json');

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

function hash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

async function evidence(path: string): Promise<FileEvidence> {
  const buffer = await readFile(path);
  return { path: relative(ROOT, path).replaceAll('\\', '/'), bytes: buffer.length, sha256: hash(buffer) };
}

function blenderCandidates(): string[] {
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
  return [...candidates];
}

function locateBlender(): { path: string; version: string } {
  for (const candidate of blenderCandidates()) {
    const result = spawnSync(candidate, ['--version'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    if (result.status === 0) return { path: candidate, version: result.stdout.split(/\r?\n/u)[0]?.trim() ?? 'unknown' };
  }
  throw new Error('Blender was not found. Set VALLEY_BLENDER_PATH to its executable.');
}

function recipePath(assetId: string): string {
  if (!/^[a-z][a-z0-9-]*$/u.test(assetId)) throw new Error(`Invalid asset id '${assetId}'.`);
  return resolve(ROOT, 'art', 'recipes', `${assetId}.json`);
}

async function recipeFor(assetId: string): Promise<{ recipe: ArtRecipe; path: string }> {
  const path = recipePath(assetId);
  const recipe = parseRecipe(await json(path));
  if (recipe.id !== assetId) throw new Error(`Recipe id '${recipe.id}' does not match requested asset '${assetId}'.`);
  return { recipe, path };
}

async function latestFor(assetId: string): Promise<LatestRun> {
  const latest = await json(LATEST) as Partial<LatestRun>;
  if (latest.schemaVersion !== 1 || latest.assetId !== assetId || typeof latest.runId !== 'string' || typeof latest.directory !== 'string') {
    throw new Error(`No valid latest build exists for '${assetId}'.`);
  }
  const directory = assertInside(RUNS, resolve(ROOT, latest.directory));
  return { schemaVersion: 1, assetId, runId: latest.runId, directory };
}

async function build(assetId: string): Promise<LatestRun> {
  const started = performance.now();
  const { path } = await recipeFor(assetId);
  const catalog = parseCatalog(await json(CATALOG_PATH));
  const declaration = catalog.assets.find((item) => item.id === assetId);
  if (declaration === undefined) throw new Error(`Catalog does not declare '${assetId}'.`);
  if (resolve(ROOT, declaration.recipe) !== path) throw new Error(`Catalog recipe for '${assetId}' does not match its canonical path.`);
  if (resolve(ROOT, declaration.generator) !== GENERATOR) throw new Error(`Catalog generator for '${assetId}' does not match the runner.`);
  const blender = locateBlender();
  if (blender.version !== `Blender ${declaration.blenderVersion}`) {
    throw new Error(`Blender version mismatch: catalog requires '${declaration.blenderVersion}', found '${blender.version}'.`);
  }
  const runId = `${new Date().toISOString().replace(/[:.]/gu, '-')}-${process.pid}`;
  const directory = assertInside(RUNS, resolve(RUNS, runId));
  const temporary = assertInside(directory, resolve(directory, 'temporary'));
  const candidate = assertInside(directory, resolve(directory, 'candidate'));
  await mkdir(temporary, { recursive: true });
  await mkdir(candidate, { recursive: true });
  const generatedScript = resolve(temporary, 'build.py');
  await copyFile(GENERATOR, generatedScript);
  const result = spawnSync(blender.path, [
    '--background', '--factory-startup', '--python', generatedScript, '--', path, candidate, assetId,
  ], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  const log = `${result.stdout}\n${result.stderr}`;
  await writeFile(resolve(directory, 'blender.log'), log, 'utf8');
  const completionMarker = log.includes(`VALLEY_ART_BUILD_OK:${assetId}`);
  const products = {
    blend: resolve(candidate, `${assetId}.blend`),
    glb: resolve(candidate, `${assetId}.glb`),
    blenderRender: resolve(candidate, `${assetId}-blender.png`),
  };
  const missing = Object.values(products).filter((item) => !existsSync(item));
  if (result.status !== 0 || !completionMarker || missing.length > 0) {
    throw new Error(`Blender build failed: status=${String(result.status)}, marker=${String(completionMarker)}, missing=${missing.map((item) => basename(item)).join(',')}. See ${resolve(directory, 'blender.log')}`);
  }
  const files: Record<string, FileEvidence> = {};
  for (const [name, product] of Object.entries(products)) files[name] = await evidence(product);
  files.log = await evidence(resolve(directory, 'blender.log'));
  files.generatedScript = await evidence(generatedScript);
  const report: BuildReport = {
    schemaVersion: 1, assetId, runId,
    recipe: relative(ROOT, path).replaceAll('\\', '/'), blender: blender.path,
    blenderVersion: blender.version, durationMs: Math.round(performance.now() - started),
    completionMarker, files,
  };
  await atomicWriteJson(resolve(directory, 'build.json'), report);
  const latest: LatestRun = { schemaVersion: 1, assetId, runId, directory: relative(ROOT, directory).replaceAll('\\', '/') };
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  await atomicWriteJson(LATEST, latest);
  process.stdout.write(`Built ${assetId} in ${relative(ROOT, directory)}\n`);
  return latest;
}

async function validate(assetId: string): Promise<ValidationReport> {
  const started = performance.now();
  const { recipe } = await recipeFor(assetId);
  const latest = await latestFor(assetId);
  const candidate = resolve(latest.directory, 'candidate', `${assetId}.glb`);
  const buffer = await readFile(candidate);
  const inspection = validateGlb(recipe, buffer);
  const captureOutput = resolve(latest.directory, 'three');
  const tsx = resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const capture = resolve(ROOT, 'tools', 'graphics', 'capture.ts');
  const captureResult = spawnSync(process.execPath, [
    tsx, capture, '--asset', candidate, '--output', captureOutput,
    '--width', String(recipe.referenceRender.width), '--height', String(recipe.referenceRender.height),
    '--pixelRatio', '1', '--camera', 'iso-ne', '--time', '0',
  ], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  await writeFile(resolve(latest.directory, 'capture.log'), `${captureResult.stdout}\n${captureResult.stderr}`, 'utf8');
  if (captureResult.status !== 0) throw new Error(`Three.js capture failed; see ${resolve(latest.directory, 'capture.log')}`);
  const captureReport = await json(resolve(captureOutput, 'capture.json')) as CaptureReport;
  const first = captureReport.captures[0];
  if (first === undefined || !captureReport.deterministicOnThisHost) throw new Error('Three.js capture did not produce repeatable evidence.');
  for (const primitive of recipe.primitives) {
    if (!first.viewer.objectNames.includes(primitive.name)) throw new Error(`Three.js scene is missing '${primitive.name}'.`);
  }
  if (captureReport.browserErrors.length > 0) throw new Error(`Three.js emitted browser errors: ${captureReport.browserErrors.join('; ')}`);
  if (!first.viewer.bounds.size.every((value) => Number.isFinite(value) && value > 0)) throw new Error('Three.js reported invalid scene bounds.');
  const report: ValidationReport = {
    schemaVersion: 1, assetId, runId: latest.runId, status: 'pass',
    durationMs: Math.round(performance.now() - started), candidateSha256: hash(buffer), glb: inspection,
    capture: captureReport,
    checks: [
      'GLB 2 container and JSON chunk', 'finite three-axis POSITION bounds',
      'unique expected object and material names', 'declared connectors and clips',
      'real Three.js load', 'repeatable same-host capture', 'finite positive world bounds',
    ],
  };
  await atomicWriteJson(resolve(latest.directory, 'validation.json'), report);
  process.stdout.write(`Validated ${assetId} from run ${latest.runId}\n`);
  return report;
}

async function copyPromotionFile(source: string, targetDirectory: string): Promise<FileEvidence> {
  const target = resolve(targetDirectory, basename(source));
  await copyFile(source, target);
  return evidence(target);
}

async function report(assetId: string): Promise<void> {
  const started = performance.now();
  const { recipe } = await recipeFor(assetId);
  const catalog = parseCatalog(await json(CATALOG_PATH));
  const index = catalog.assets.findIndex((item) => item.id === assetId);
  if (index < 0) throw new Error(`Catalog does not declare '${assetId}'.`);
  const current = catalog.assets[index] as CatalogAsset;
  const latest = await latestFor(assetId);
  const buildReport = await json(resolve(latest.directory, 'build.json')) as BuildReport;
  const validation = await json(resolve(latest.directory, 'validation.json')) as ValidationReport;
  if (validation.status !== 'pass' || validation.assetId !== assetId || validation.runId !== latest.runId) {
    throw new Error('The latest candidate has no passing validation report.');
  }
  const candidateGlb = resolve(latest.directory, 'candidate', `${assetId}.glb`);
  if (hash(await readFile(candidateGlb)) !== validation.candidateSha256) throw new Error('Candidate changed after validation; rebuild and validate again.');
  const key = validation.candidateSha256.slice(0, 16).toLowerCase();
  const approvedDirectory = assertInside(APPROVED, resolve(APPROVED, key));
  const stage = assertInside(ARTIFACT_ROOT, resolve(ARTIFACT_ROOT, `.stage-${latest.runId}`));
  await mkdir(APPROVED, { recursive: true });
  const promotedFiles: Record<string, FileEvidence> = {};
  const promotedNames = [`${assetId}.blend`, `${assetId}.glb`, `${assetId}-blender.png`, 'capture-1.png', 'capture.json', 'build.json', 'validation.json'];
  if (!existsSync(approvedDirectory)) {
    await mkdir(stage, { recursive: false });
    const sources = [
      resolve(latest.directory, 'candidate', `${assetId}.blend`), candidateGlb,
      resolve(latest.directory, 'candidate', `${assetId}-blender.png`),
      resolve(latest.directory, 'three', 'capture-1.png'), resolve(latest.directory, 'three', 'capture.json'),
      resolve(latest.directory, 'build.json'), resolve(latest.directory, 'validation.json'),
    ];
    for (const source of sources) await copyPromotionFile(source, stage);
    await rename(stage, approvedDirectory);
  }
  for (const name of promotedNames) promotedFiles[name] = await evidence(resolve(approvedDirectory, name));
  let equivalence: { compared: false } | { compared: true; previous: string; equivalent: boolean } = { compared: false };
  if (current.approved !== null && existsSync(resolve(ROOT, current.approved.directory, `${assetId}.glb`))) {
    const previous = validateGlb(recipe, await readFile(resolve(ROOT, current.approved.directory, `${assetId}.glb`)));
    const equivalent = JSON.stringify({
      nodes: previous.nodeNames.sort(), materials: previous.materialNames.sort(), clips: previous.animationNames.sort(),
      statistics: previous.statistics,
    }) === JSON.stringify({
      nodes: validation.glb.nodeNames.slice().sort(), materials: validation.glb.materialNames.slice().sort(),
      clips: validation.glb.animationNames.slice().sort(), statistics: validation.glb.statistics,
    });
    if (!equivalent) throw new Error('Candidate is not geometrically/materially equivalent to the prior approved build.');
    equivalence = { compared: true, previous: current.approved.directory, equivalent };
  }
  const reportValue = {
    schemaVersion: 1, assetId, runId: latest.runId,
    commands: [
      `npx tsx tools/art/index.ts build ${assetId}`,
      `npx tsx tools/art/index.ts validate ${assetId}`,
      `npx tsx tools/art/index.ts report ${assetId}`,
    ],
    durationMs: Math.round(performance.now() - started),
    build: buildReport, validation,
    approved: relative(ROOT, approvedDirectory).replaceAll('\\', '/'), files: promotedFiles, equivalence,
  };
  await atomicWriteJson(resolve(latest.directory, 'report.json'), reportValue);

  const firstCapture = validation.capture.captures[0];
  if (firstCapture === undefined) throw new Error('Validation report has no capture.');
  const updated: CatalogAsset = {
    ...current, status: 'study',
    approved: { runId: latest.runId, directory: relative(ROOT, approvedDirectory).replaceAll('\\', '/') },
    bounds: firstCapture.viewer.bounds,
    materials: recipe.materials.map((item) => item.name), clips: recipe.clips, connectors: recipe.connectors,
    statistics: validation.glb.statistics,
    hashes: Object.fromEntries(Object.entries(promotedFiles).map(([name, item]) => [name, item.sha256])),
  };
  const next: ArtCatalog = { ...catalog, assets: catalog.assets.map((item, assetIndex) => assetIndex === index ? updated : item) };
  await atomicWriteJson(CATALOG_PATH, next);
  process.stdout.write(`Reported and promoted ${assetId} to ${relative(ROOT, approvedDirectory)}\n`);
}

const command = process.argv[2] as Command | undefined;
const assetId = process.argv[3];
if (!['build', 'validate', 'report', 'all'].includes(command ?? '') || assetId === undefined) {
  throw new Error('Usage: npx tsx tools/art/index.ts <build|validate|report|all> <asset-id>');
}
if (command === 'build' || command === 'all') await build(assetId);
if (command === 'validate' || command === 'all') await validate(assetId);
if (command === 'report' || command === 'all') await report(assetId);
