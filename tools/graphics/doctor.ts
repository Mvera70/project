import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, platform, release } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

type Status = 'pass' | 'fail' | 'pending';

interface Check {
  tool: string;
  path: string | null;
  version: string | null;
  check: string;
  status: Status;
  durationMs: number;
  error: string | null;
}

const root = resolve(import.meta.dirname, '..', '..');
const output = resolve(root, 'artifacts', 'graphics', 'G-00');
mkdirSync(output, { recursive: true });

const checks: Check[] = [];

function firstLine(value: string): string | null {
  const line = value.split(/\r?\n/u).map((item) => item.trim()).find(Boolean);
  return line ?? null;
}

function run(
  tool: string,
  executable: string,
  args: string[],
  check: string,
  versionFrom: (result: SpawnSyncReturns<string>) => string | null = (result) => firstLine(result.stdout),
): SpawnSyncReturns<string> {
  const started = performance.now();
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  const error = result.error?.message ?? (result.status === 0 ? null : firstLine(result.stderr) ?? `Exited with ${String(result.status)}`);
  checks.push({
    tool,
    path: executable,
    version: result.status === 0 ? versionFrom(result) : null,
    check,
    status: result.status === 0 ? 'pass' : 'fail',
    durationMs: Math.round(performance.now() - started),
    error,
  });
  return result;
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
      if (!entry.isDirectory()) continue;
      candidates.add(join(base, entry.name, 'blender.exe'));
    }
  }
  return [...candidates];
}

function locateBlender(): string | null {
  for (const candidate of blenderCandidates()) {
    const result = spawnSync(candidate, ['--version'], { cwd: root, encoding: 'utf8', windowsHide: true });
    if (result.status === 0) return candidate;
  }
  return null;
}

const blenderScript = String.raw`
import bpy
import math
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
out_dir = os.path.abspath(args[0])
os.makedirs(out_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, rgba):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = rgba
    principled.inputs['Roughness'].default_value = 0.82
    return mat

red = material('direction-red', (0.55, 0.06, 0.035, 1.0))
gold = material('front-gold', (0.95, 0.46, 0.06, 1.0))
blue = material('left-blue', (0.04, 0.28, 0.68, 1.0))
ground = material('ground', (0.16, 0.19, 0.14, 1.0))

def cube(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj

cube('Ground', (0, 0, -0.12), (2.8, 2.3, 0.1), ground)
cube('Axis_X', (1.0, 0, 0.18), (1.0, 0.12, 0.12), red)
cube('Axis_Y', (0, 0, 0.75), (0.12, 0.12, 0.75), blue)
cube('Front_Z', (0, 0.85, 0.22), (0.18, 0.85, 0.18), gold)
bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.48, radius2=0.0, depth=0.9, location=(2.05, 0, 0.18), rotation=(0, math.pi / 2, 0))
bpy.context.object.name = 'Positive_X_Arrow'
bpy.context.object.data.materials.append(red)
bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.48, radius2=0.0, depth=0.9, location=(0, 1.9, 0.22), rotation=(math.pi / 2, 0, 0))
bpy.context.object.name = 'Positive_Z_Front'
bpy.context.object.data.materials.append(gold)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.32, location=(-0.75, -0.45, 0.32))
bpy.context.object.name = 'Asymmetry_Marker'
bpy.context.object.data.materials.append(blue)

bpy.ops.object.light_add(type='AREA', location=(-3.5, -4.0, 7.0))
bpy.context.object.data.energy = 900
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 5.0
bpy.ops.object.light_add(type='AREA', location=(4.0, 1.0, 4.0))
bpy.context.object.data.energy = 350
bpy.context.object.data.size = 3.0

bpy.ops.object.camera_add(location=(7.0, -8.0, 7.0))
camera = bpy.context.object
bpy.context.scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 7.2

def point_at(obj, target=(0.3, 0.3, 0.35)):
    direction = mathutils.Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

import mathutils
point_at(camera)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.join(out_dir, 'axis-marker.png')
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('ValleyWorld')
scene.world.color = (0.035, 0.04, 0.055)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, 'axis-marker.blend'))
bpy.ops.export_scene.gltf(
    filepath=os.path.join(out_dir, 'axis-marker.glb'),
    export_format='GLB',
    export_yup=True,
    export_cameras=False,
    export_lights=False,
)
bpy.ops.render.render(write_still=True)
print('VALLEY_G00_OK')
`;

for (const name of ['axis-marker.blend', 'axis-marker.glb', 'axis-marker.png', 'blender.log', 'doctor.json']) {
  const target = join(output, name);
  if (existsSync(target)) rmSync(target);
}

run('Node.js', process.execPath, ['--version'], 'runtime executes');
const tsxPath = resolve(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
run('tsx', process.execPath, [tsxPath, '--version'], 'project-local TypeScript runner executes');
const bundledBrowser = chromium.executablePath();
const systemBrowsers = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = [bundledBrowser, ...systemBrowsers].find(existsSync) ?? bundledBrowser;
const browserExists = existsSync(browserPath);
if (browserExists) {
  const browserStarted = performance.now();
  try {
    const browser = await chromium.launch({ executablePath: browserPath, headless: true });
    const browserVersion = browser.version();
    await browser.close();
    checks.push({
      tool: 'Browser for Playwright',
      path: browserPath,
      version: browserVersion,
      check: 'Playwright launches and closes browser',
      status: 'pass',
      durationMs: Math.round(performance.now() - browserStarted),
      error: null,
    });
  } catch (error) {
    checks.push({
      tool: 'Browser for Playwright', path: browserPath, version: null,
      check: 'Playwright launches and closes browser', status: 'fail',
      durationMs: Math.round(performance.now() - browserStarted),
      error: error instanceof Error ? error.message : String(error),
    });
  }
} else checks.push({
  tool: 'Browser for Playwright', path: browserPath, version: null,
  check: 'browser executable runs', status: 'fail', durationMs: 0,
  error: 'Neither bundled Chromium nor a supported system browser was found.',
});

const missingStarted = performance.now();
const missing = spawnSync('valley-intentionally-missing-executable', ['--version'], { encoding: 'utf8', windowsHide: true });
checks.push({
  tool: 'Process runner',
  path: 'valley-intentionally-missing-executable',
  version: null,
  check: 'missing executable is reported without crashing',
  status: missing.error ? 'pass' : 'fail',
  durationMs: Math.round(performance.now() - missingStarted),
  error: missing.error ? null : 'The deliberately missing executable unexpectedly ran.',
});

const blender = locateBlender();
if (blender === null) {
  checks.push({
    tool: 'Blender', path: null, version: null, check: 'background generation',
    status: 'pending', durationMs: 0,
    error: 'Not found. Set VALLEY_BLENDER_PATH to the Blender executable if installed elsewhere.',
  });
} else {
  const scriptPath = join(output, 'blender-scene.py');
  writeFileSync(scriptPath, blenderScript, 'utf8');
  const result = run(
    'Blender', blender,
    ['--background', '--factory-startup', '--python', scriptPath, '--', output],
    'background save, GLB export, and PNG render',
    (completed) => {
      const combined = `${completed.stdout}\n${completed.stderr}`;
      return combined.includes('VALLEY_G00_OK') ? firstLine(spawnSync(blender, ['--version'], { encoding: 'utf8' }).stdout) : null;
    },
  );
  writeFileSync(join(output, 'blender.log'), `${result.stdout}\n${result.stderr}`, 'utf8');
  const blenderCheck = checks.at(-1);
  const completed = `${result.stdout}\n${result.stderr}`.includes('VALLEY_G00_OK');
  if (blenderCheck && !completed) {
    blenderCheck.status = 'fail';
    blenderCheck.error = 'Blender exited without the VALLEY_G00_OK completion marker; inspect blender.log.';
  }
  const products = ['axis-marker.blend', 'axis-marker.glb', 'axis-marker.png'];
  const productsExist = products.every((name) => existsSync(join(output, name)));
  checks.push({
    tool: 'Blender artifacts', path: output, version: null,
    check: 'blend, GLB, and PNG all exist', status: productsExist ? 'pass' : 'fail', durationMs: 0,
    error: productsExist ? null : `Missing: ${products.filter((name) => !existsSync(join(output, name))).join(', ')}`,
  });
  checks.push({
    tool: 'Process runner', path: blender, version: null,
    check: 'path containing spaces executes', status: blender.includes(' ') && result.status === 0 ? 'pass' : 'fail', durationMs: 0,
    error: blender.includes(' ') ? (result.status === 0 ? null : 'Blender failed from a path containing spaces.') : 'Located Blender path has no spaces; case unverified.',
  });
}

const glbPath = join(output, 'axis-marker.glb');
const glbHeader = existsSync(glbPath) ? readFileSync(glbPath).subarray(0, 4).toString('ascii') : '';
checks.push({
  tool: 'GLB container', path: glbPath, version: glbHeader === 'glTF' ? 'glTF 2 binary' : null,
  check: 'binary begins with glTF magic', status: glbHeader === 'glTF' ? 'pass' : 'fail', durationMs: 0,
  error: glbHeader === 'glTF' ? null : `Unexpected GLB header: ${JSON.stringify(glbHeader)}`,
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  host: { name: hostname(), platform: platform(), release: release() },
  invocation: 'npx tsx tools/graphics/doctor.ts',
  output,
  overall: checks.every((item) => item.status === 'pass') ? 'pass' : checks.some((item) => item.status === 'fail') ? 'fail' : 'pending',
  checks,
};
writeFileSync(join(output, 'doctor.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.overall === 'fail' ? 1 : 0;
