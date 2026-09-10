/**
 * G-06 · De lo aprobado a lo distribuible. design.md D.4.
 *
 * D.4 quiere los recursos aprobados en `public/assets/valley3d/` con un
 * manifiesto que lleve identidad, hash y hechos de animación. Esto es el paso
 * que los pone ahí, y no copia nada que no esté aprobado: el catálogo es quien
 * dice qué lo está, y un candidato sin promoción no llega al juego por mucho que
 * exista su fichero.
 *
 * El manifiesto repite el hash del binario concreto que se copió. Sirve para lo
 * de siempre: saber, dentro de seis meses y mirando sólo `public/`, exactamente
 * qué se distribuyó.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseCatalog } from '../art/schema';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CATALOG = resolve(ROOT, 'art', 'catalog.json');
const OUTPUT = resolve(ROOT, 'public', 'assets', 'valley3d');

async function main(): Promise<void> {
  const catalog = parseCatalog(JSON.parse(await readFile(CATALOG, 'utf8')) as unknown);
  const ready = catalog.assets.filter((asset) => asset.approved !== null);
  if (ready.length === 0) throw new Error('No approved asset to publish.');

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });

  const published: Array<{
    id: string; file: string; sha256: string;
    motion: Array<{ name: string; seconds: number; loop: boolean; strideLength: number | null }>;
  }> = [];

  for (const asset of ready) {
    const source = resolve(ROOT, asset.approved?.directory ?? '', `${asset.id}.glb`);
    if (!existsSync(source)) {
      // Los artefactos aprobados no van al repositorio: quien clone el proyecto
      // tiene el catálogo pero no los binarios, y tiene que reconstruirlos.
      process.stderr.write(`  ! falta ${relative(ROOT, source)}; reconstruye '${asset.id}' y vuelve\n`);
      continue;
    }
    const file = `${asset.id}.glb`;
    await copyFile(source, resolve(OUTPUT, file));
    const bytes = await readFile(source);
    const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
    if (asset.hashes?.[file] !== undefined && asset.hashes[file] !== sha256) {
      throw new Error(`'${asset.id}' no coincide con el hash que el catálogo aprobó.`);
    }
    published.push({ id: asset.id, file, sha256, motion: asset.motion });
    process.stdout.write(`  ${asset.id.padEnd(18)} ${bytes.length} bytes  ${asset.motion.length} clips\n`);
  }

  if (published.length === 0) throw new Error('Nothing could be published; rebuild the assets first.');

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx tools/graphics/publish-assets.ts',
    assets: published,
  };
  await writeFile(resolve(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`\nEscrito ${relative(ROOT, resolve(OUTPUT, 'manifest.json'))}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
