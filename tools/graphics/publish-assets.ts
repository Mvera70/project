/**
 * G-06/G-24 · De lo aprobado a lo distribuible. design.md D.4.
 *
 * Publicar es una admisión selectiva, nunca una limpieza de `public/`: los
 * binarios existentes pueden pertenecer a otras rondas. Se comprueba el lote
 * entero antes de escribir uno solo y se rechaza cualquier colisión de bytes.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseCatalog, type CatalogAsset } from '../art/schema';
import { assertInside, atomicWriteJson } from '../art/files';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CATALOG = resolve(ROOT, 'art', 'catalog.json');
const OUTPUT = resolve(ROOT, 'public', 'assets', 'valley3d');

interface PublishedAsset {
  readonly id: string;
  readonly file: string;
  readonly sha256: string;
  readonly motion: CatalogAsset['motion'];
  readonly provenance?: CatalogAsset['provenance'];
}

interface PublishedManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly invocation: string;
  readonly assets: PublishedAsset[];
}

interface Candidate {
  readonly asset: CatalogAsset;
  readonly source: string;
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly file: string;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function idsFrom(argv: readonly string[]): string[] {
  const selected = argv[1];
  if (argv.length !== 2 || argv[0] !== '--ids' || selected === undefined) {
    throw new Error('Usage: npx tsx tools/graphics/publish-assets.ts --ids bow,spear,arrow');
  }
  const ids = selected.split(',').map(id => id.trim()).filter(Boolean);
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error('--ids must name one or more unique, comma-separated asset ids.');
  }
  return ids;
}

function manifestFrom(value: unknown): PublishedManifest {
  if (typeof value !== 'object' || value === null) throw new Error('Published manifest is not an object.');
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.assets)) throw new Error('Published manifest has an unknown schema.');
  const assets = raw.assets.map((entry, index): PublishedAsset => {
    if (typeof entry !== 'object' || entry === null) throw new Error(`Published manifest asset ${index} is invalid.`);
    const asset = entry as Record<string, unknown>;
    if (typeof asset.id !== 'string' || typeof asset.file !== 'string' || typeof asset.sha256 !== 'string'
      || !Array.isArray(asset.motion)) throw new Error(`Published manifest asset ${index} is incomplete.`);
    return asset as unknown as PublishedAsset;
  });
  return {
    schemaVersion: 1,
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
    invocation: typeof raw.invocation === 'string' ? raw.invocation : '',
    assets,
  };
}

async function existingManifest(): Promise<PublishedManifest> {
  const path = resolve(OUTPUT, 'manifest.json');
  if (!existsSync(path)) return { schemaVersion: 1, generatedAt: '', invocation: '', assets: [] };
  return manifestFrom(JSON.parse(await readFile(path, 'utf8')) as unknown);
}

async function assertPublicationRoot(): Promise<void> {
  if (!existsSync(OUTPUT)) return;
  const stat = await lstat(OUTPUT);
  if (stat.isSymbolicLink()) throw new Error('Refusing a symlinked public asset directory.');
  assertInside(ROOT, await realpath(OUTPUT));
}

async function preflight(ids: readonly string[]): Promise<Candidate[]> {
  const catalog = parseCatalog(JSON.parse(await readFile(CATALOG, 'utf8')) as unknown);
  const candidates: Candidate[] = [];
  for (const id of ids) {
    const asset = catalog.assets.find(item => item.id === id);
    if (asset === undefined) throw new Error(`'${id}' is not in art/catalog.json.`);
    if (asset.approved === null) throw new Error(`'${id}' has not been approved.`);
    const file = `${asset.id}.glb`;
    const expected = asset.hashes?.[file];
    if (expected === undefined) throw new Error(`'${id}' has no approved GLB hash.`);
    const source = resolve(ROOT, asset.approved.directory, file);
    if (!existsSync(source)) throw new Error(`Approved source is missing: ${relative(ROOT, source)}`);
    const bytes = await readFile(source);
    const actual = sha256(bytes);
    if (actual !== expected) throw new Error(`'${id}' source does not match its approved catalog hash.`);
    candidates.push({ asset, source, bytes, sha256: actual, file });
  }
  return candidates;
}

async function assertDestinations(candidates: readonly Candidate[], manifest: PublishedManifest): Promise<void> {
  for (const candidate of candidates) {
    const destination = resolve(OUTPUT, candidate.file);
    const sameId = manifest.assets.find(asset => asset.id === candidate.asset.id);
    if (sameId !== undefined && sameId.file !== candidate.file) {
      throw new Error(`Refusing to replace '${candidate.asset.id}' manifest identity from ${sameId.file} to ${candidate.file}.`);
    }
    if (!existsSync(destination)) continue;
    if ((await lstat(destination)).isSymbolicLink()) {
      throw new Error(`Refusing a symlinked destination: ${relative(ROOT, destination)}`);
    }
    const destinationHash = sha256(await readFile(destination));
    if (destinationHash !== candidate.sha256) {
      throw new Error(`Refusing to overwrite ${relative(ROOT, destination)}: its bytes differ from approved '${candidate.asset.id}'.`);
    }
    const recorded = manifest.assets.find(asset => asset.file === candidate.file);
    if (recorded !== undefined && recorded.id !== candidate.asset.id) {
      throw new Error(`Refusing to claim ${candidate.file}: manifest assigns it to '${recorded.id}'.`);
    }
  }
}

function published(candidate: Candidate): PublishedAsset {
  return {
    id: candidate.asset.id,
    file: candidate.file,
    sha256: candidate.sha256,
    motion: candidate.asset.motion,
    provenance: candidate.asset.provenance,
  };
}

async function main(): Promise<void> {
  const ids = idsFrom(process.argv.slice(2));
  const candidates = await preflight(ids);
  await assertPublicationRoot();
  const manifest = await existingManifest();
  await assertDestinations(candidates, manifest);

  process.stdout.write('Preflight passed; no destination has been changed yet.\n');
  for (const candidate of candidates) {
    process.stdout.write(`  ${candidate.asset.id.padEnd(10)} ${candidate.bytes.length} bytes  ${candidate.sha256}\n`
      + `    ${relative(ROOT, candidate.source)}\n`
      + `    provenance: ${candidate.asset.provenance.license}; ${candidate.asset.provenance.source}\n`);
  }

  await mkdir(OUTPUT, { recursive: true });
  for (const candidate of candidates) {
    const destination = resolve(OUTPUT, candidate.file);
    if (!existsSync(destination)) await writeFile(destination, candidate.bytes);
    const copied = await readFile(destination);
    if (sha256(copied) !== candidate.sha256) {
      throw new Error(`'${candidate.asset.id}' destination failed verification after copy.`);
    }
  }

  const selected = new Map(candidates.map(candidate => [candidate.asset.id, published(candidate)]));
  const assets = [
    ...manifest.assets.filter(asset => !selected.has(asset.id)),
    ...candidates.map(candidate => selected.get(candidate.asset.id)!),
  ];
  const next: PublishedManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    invocation: `npx tsx tools/graphics/publish-assets.ts --ids ${ids.join(',')}`,
    assets,
  };
  await atomicWriteJson(resolve(OUTPUT, 'manifest.json'), next);
  const preserved = manifest.assets.filter(asset => !selected.has(asset.id)).length;
  process.stdout.write(`\nVerified ${candidates.length} selected assets; preserved ${preserved} existing manifest entries.\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
