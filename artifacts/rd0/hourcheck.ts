// ¿La hora de cabecera (texto) corresponde a la fase del sol pintada (data-sun-phase) en el mismo muestreo?
import { readFileSync } from 'node:fs';
import { hourAt } from '../../src/render3d/effects/day-phases';
for (const f of process.argv.slice(2)) {
  const log = JSON.parse(readFileSync(`artifacts/rd0/${f}/log.json`, 'utf8')) as { time: string | null; sun: string | null; tick: string }[];
  let n = 0, bad = 0, big = 0; const samples: string[] = [];
  for (const s of log) {
    if (!s.time || !s.sun) continue;
    const hdr = Number(s.time.split(':')[0]); const exp = hourAt(Number(s.sun));
    const diff = Math.min(Math.abs(hdr - exp), 24 - Math.abs(hdr - exp));
    n++; if (diff > 0) bad++; if (diff > 2) big++;
    if (samples.length < 6 && diff > 2) samples.push(`${s.time}/sun ${s.sun}->${exp}h`);
  }
  console.log(f, 'n', n, 'distinta', bad, '>2h', big, samples.join(' ; '));
}
