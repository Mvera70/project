// Los asertos de §12.9, uno por línea, con lo medido al lado.
//
// **Existe porque triar el banco a ojo cuesta media hora cada vez.** El banco
// (`npm run test:balance`) tarda treinta y dos minutos y escribe
// `artifacts/balance-summary.json`; esto lee ese fichero y dice, para cada
// aserto de `tests/balance/balance.test.ts`, qué pide y qué salió. No simula
// nada: si el informe es de hace una semana, lo dice la fecha del fichero.
//
// Uso: `npx tsx tools/balance-verdict.ts`

import { readFileSync, statSync } from 'node:fs';

interface Summary {
  policy: string;
  extinction: number;
  medianPeak: number;
  medianGenerationOne: number;
  fullMap: number;
  cadence: number;
  maxCadence: number;
  shockExtinction: number;
  shockTrials: number;
  invalidCases: number;
  geometryCases: number;
  maxYearsDying: number;
  forestTrials: number;
  forestInBand: number;
  medianForestRatio: number;
  busiestOption: string;
  busiestOptionShare: number;
  eligibility: Record<string, number>;
}

const REPORT = 'artifacts/balance-summary.json';
const raw = JSON.parse(readFileSync(REPORT, 'utf8')) as {
  durationMs: number;
  summaries: Summary[];
};

/** Un aserto: qué pide, qué salió, y si pasa. */
interface Verdict {
  policy: string;
  name: string;
  got: string;
  want: string;
  ok: boolean;
}

const pct = (value: number): string => `${(value * 100).toFixed(1)} %`;

function verdictsFor(s: Summary): Verdict[] {
  const out: Verdict[] = [];
  const add = (name: string, ok: boolean, got: string, want: string): void => {
    out.push({ policy: s.policy, name, got, want, ok });
  };
  add('cifras dentro de rango', s.invalidCases === 0, String(s.invalidCases), '0');
  add('geometría', s.geometryCases === 0, String(s.geometryCases), '0');
  // **Un aserto, no uno por cifra.** La suite mide la cadencia media y la
  // máxima en el mismo `it`, y la elegibilidad de todas las plantillas en otro:
  // desglosarlas aquí daba 35 rojas donde el banco cuenta 16, que es una forma
  // de mentir con la verdad.
  add('cadencia', s.cadence >= 1 && s.cadence <= 5 && s.maxCadence <= 7,
    `media ${s.cadence.toFixed(2)} · máxima ${s.maxCadence.toFixed(1)}`, 'media 1 a 5, máxima hasta 7');
  const loose = Object.entries(s.eligibility).filter(([, fraction]) => fraction >= 0.01)
    .sort((a, b) => b[1] - a[1]);
  add('elegibilidad por plantilla', loose.length === 0,
    loose.length === 0 ? 'todas por debajo del 1 %'
      : loose.map(([id, fraction]) => `${id} ${pct(fraction)}`).join(', '),
    'menos del 1 % cada una');
  add('agonía', s.maxYearsDying <= 10, String(s.maxYearsDying), 'hasta 10 años');
  add('extinción tras el choque', s.shockExtinction >= 0.25, pct(s.shockExtinction), 'al menos 25 %');
  if (s.policy === 'prudent') {
    add('pico de población', s.medianPeak >= 65 && s.medianPeak <= 85, s.medianPeak.toFixed(1), '65 a 85');
    add('población a la generación 1', s.medianGenerationOne >= 26, s.medianGenerationOne.toFixed(1), 'al menos 26');
    add('extinción prudente', s.extinction >= 0.02 && s.extinction <= 0.12, pct(s.extinction), '2 a 12 %');
    add('opción más usada', s.busiestOptionShare < 0.45,
      `${s.busiestOption} ${pct(s.busiestOptionShare)}`, 'menos del 45 %');
    add('mapa lleno (8 campos, 16 casas)', s.fullMap >= 0.6, pct(s.fullMap), 'al menos 60 %');
    add('bosque en pie al año 100', s.forestInBand / Math.max(1, s.forestTrials) >= 0.5,
      `${s.forestInBand} de ${s.forestTrials} en banda · mediana ${pct(s.medianForestRatio)}`,
      'la mayoría entre 40 y 70 %');
  }
  if (s.policy === 'worst') {
    add('extinción adversa', s.extinction >= 0.25, pct(s.extinction), 'al menos 25 %');
  }
  return out;
}

const all = raw.summaries.flatMap(verdictsFor);
const prudent = raw.summaries.find((s) => s.policy === 'prudent');
const worst = raw.summaries.find((s) => s.policy === 'worst');
if (prudent !== undefined && worst !== undefined) {
  const gap = worst.extinction - prudent.extinction;
  all.push({
    policy: 'prudent vs worst', name: 'distancia entre políticas', ok: gap >= 0.2,
    got: `${(gap * 100).toFixed(1)} puntos`, want: 'al menos 20 puntos',
  });
}

const when = statSync(REPORT).mtime.toISOString().slice(0, 16).replace('T', ' ');
const red = all.filter((v) => !v.ok);
console.info(`Informe de ${when} · ${(raw.durationMs / 1000).toFixed(0)} s · `
  + `${all.length - red.length} verdes y ${red.length} rojas de ${all.length}\n`);
for (const v of red) {
  console.info(`ROJA  ${v.policy.padEnd(8)} ${v.name.padEnd(34)} salió ${v.got.padEnd(30)} pide ${v.want}`);
}
console.info('');
for (const v of all.filter((x) => x.ok)) {
  console.info(`verde ${v.policy.padEnd(8)} ${v.name.padEnd(34)} salió ${v.got.padEnd(30)} pide ${v.want}`);
}
