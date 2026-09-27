import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const made: string[] = [];
const makeTake = (change: (trace: Record<string, unknown>, summary: Record<string, unknown>) => void = () => {}) => {
  const take = mkdtempSync(join(tmpdir(), 'valley-evidence-'));
  made.push(take); mkdirSync(join(take, 'frames'));
  writeFileSync(join(take, 'frames', '0000.png'), Buffer.from([137, 80, 78, 71]));
  const trace: Record<string, unknown> = { mode: 'production-renderer-fixed-state-30hz', seed: 11, year: 20, fps: 2, speed: null, lead: 0, advanceWeeks: 0, errors: [], frames: [{ seconds: 0, file: 'frames/0000.png', engineTick: 12, life: { people: [{}], beasts: [] } }] };
  const summary: Record<string, unknown> = { firstTick: 12, lastTick: 12, sampledPeople: 1, sampledBeasts: 0 };
  change(trace, summary);
  writeFileSync(join(take, 'trace.json'), JSON.stringify(trace)); writeFileSync(join(take, 'summary.json'), JSON.stringify(summary));
  return take;
};
const run = (take: string) => spawnSync(process.execPath, [resolve('tools/graphics/evidence-index.mjs'), take], { encoding: 'utf8' });
afterEach(() => { while (made.length) rmSync(made.pop()!, { recursive: true, force: true }); });

describe('P1 · índice verificable de evidencia', () => {
  it('indexa una toma fija y mantiene los null antiguos', () => {
    const take = makeTake((trace) => { delete trace.speed; });
    const result = run(take); expect(result.status).toBe(0);
    const index = JSON.parse(readFileSync(join(take, 'evidence-index.json'), 'utf8'));
    expect(index).toMatchObject({ schemaVersion: 1, frameCount: 1, firstTick: 12, lastTick: 12, speed: null, warnings: [] });
    expect(index.sourceTraceSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('avisa si el modo vivo no avanza el tick', () => {
    const take = makeTake((trace) => { trace.mode = 'live-engine-browser-clock'; });
    const result = run(take); expect(result.status).toBe(0);
    const index = JSON.parse(readFileSync(join(take, 'evidence-index.json'), 'utf8'));
    expect(index.warnings).toHaveLength(1);
  });

  it('rechaza un PNG ausente por ausencia', () => {
    const take = makeTake((trace) => { (trace.frames as Array<Record<string, unknown>>)[0]!.file = 'frames/missing.png'; });
    const result = run(take);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('falta el PNG');
  });

  it('rechaza un PNG existente fuera de la carpeta por confinamiento', () => {
    const outside = mkdtempSync(join(tmpdir(), 'valley-evidence-outside-'));
    made.push(outside);
    const outsideFile = join(outside, 'outside.png');
    writeFileSync(outsideFile, Buffer.from([137, 80, 78, 71]));
    const take = makeTake();
    const trace = JSON.parse(readFileSync(join(take, 'trace.json'), 'utf8')) as { frames: Array<{ file: string }> };
    trace.frames[0]!.file = relative(take, outsideFile).split(sep).join('/');
    writeFileSync(join(take, 'trace.json'), JSON.stringify(trace));
    const result = run(take);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('escapa de la carpeta');
  });

  it('rechaza un resumen inconsistente', () => {
    const take = makeTake((_trace, summary) => { summary.lastTick = 13; });
    expect(run(take).status).not.toBe(0);
  });

  it('rechaza JSON incorrecto', () => {
    const take = makeTake(); writeFileSync(join(take, 'trace.json'), '{');
    expect(run(take).status).not.toBe(0);
  });
});
