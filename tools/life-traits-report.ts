// IA-3 · La medida que demuestra la fase. docs/life-ai-implementation-prompt.md.
//
// No es un fichero de la capa de vida ni toca ninguno de los cuatro
// autorizados de esta ronda (`needs.ts`, `decide.ts`, `village.ts`,
// `offers.ts`): es una herramienta de medida nueva, en el mismo sitio y con
// el mismo espíritu que `tools/life-report.ts` (IA-1) — «mide primero, no
// inventes una API de prueba» — pero para una propiedad que ese informe no
// mira: **cuánto tiempo pasa cada rasgo en cada actividad**, y si la misma
// persona se parece a sí misma de un día a otro.
//
//   npx tsx tools/life-traits-report.ts [semillas...] [--days N] [--years N]
//
// Dos tablas, sobre personas (nunca bestias: los rasgos son de gente, §6.1):
//
//   1. **Rasgo × actividad**, cuerpo-segundos por rasgo (y por grupo de edad,
//      aparte porque no es un rasgo) en cada oferta, como fracción del total
//      de ese rasgo. Es lo que enseña «el devoto reza más que el resto».
//   2. **Estabilidad**: cuántas veces al día cambia de actividad una persona
//      de media, y cuánto se parece el reparto de una persona en un día al
//      reparto de la MISMA persona en otro día, contra cuánto se parece al de
//      OTRA persona cualquiera el mismo día — la propiedad de «no cambia de
//      carácter a cada decisión» convertida en un número que se puede
//      comparar.
//
// **Varias semillas y varias jornadas, nunca una** (`CLAUDE.md`): el día 0 de
// seis semillas son seis muestras de un instante del calendario, no seis
// aldeas, así que hacen falta las dos dimensiones para que un reparto no sea
// ruido de un solo tiro.

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { Trait } from '@engine/state';
import { foundTwenty } from '../tests/helpers/founding';
import { STEPS_PER_DAY } from '../src/render3d/life/clock';
import { OFFERS } from '../src/render3d/life/offers';
import { createVillage, type Dweller } from '../src/render3d/life/village';

/**
 * Las ofertas que de verdad son un encuentro (dan compañía) — la misma
 * condición que `SECRETIVE_SHORT` usa en `decide.ts`, leída del catálogo en
 * vez de copiada a mano para que no pueda desincronizarse.
 *
 * **Menos `gather`**: es la reunión que convoca el motor (V-11, `staging.ts`),
 * de cuarenta a ciento veinte segundos y para toda la aldea a la vez — no es
 * un corro que uno elige, es una orden, y su duración no la fija `decide()`
 * por persona. Mezclarla aquí ahoga cualquier diferencia entre rasgos bajo el
 * peso de un suceso que le pasa a todo el mundo igual.
 */
const SOCIAL_OFFERS = new Set(
  Object.values(OFFERS).filter((o) => o.gives.company !== undefined && o.id !== 'gather').map((o) => o.id),
);

const args = process.argv.slice(2);
const flag = (name: string, fallback: number): number => {
  const at = args.indexOf(name);
  return at >= 0 ? Number(args[at + 1]) : fallback;
};
const DAYS = flag('--days', 3);
const YEARS = flag('--years', 30);
const given = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--days' && args[i - 1] !== '--years')
  .map(Number);
const SEEDS = given.length > 0 ? given : [7, 23, 41, 67, 79, 97];

/** Cada cuánto se muestrea: un segundo escénico, igual que `life-report.ts`. */
const SAMPLE_EVERY = 30;

/** En qué anda uno, para la tabla: la oferta si ha llegado, «andando» si va
 *  de camino, «nada» si no tiene ni eso — `pauseHere()` hace que este último
 *  caso sea rarísimo, y por eso vale la pena seguir contándolo. */
function activityOf(d: Dweller): string {
  if (d.doing === null) return 'nada';
  return d.doing.there ? d.doing.offer.id : 'andando';
}

type Row = 'sin_rasgos' | 'edad:child' | 'edad:elder' | Trait;

const byRow = new Map<Row, Map<string, number>>();
function tally(row: Row, activity: string): void {
  let acts = byRow.get(row);
  if (acts === undefined) { acts = new Map(); byRow.set(row, acts); }
  acts.set(activity, (acts.get(activity) ?? 0) + 1);
}

/**
 * Cuántas escenas de conflicto (`shove`/`brawl`, nunca `chat`) empieza cada
 * rasgo, por persona-jornada — no es una oferta de `decide.ts` (vive en
 * `scenes.ts`/`village.ts`), así que la tabla de arriba no la ve, y es
 * justo lo que hace falta para comprobar «tensión más rápido, sin peleas
 * constantes». Se cuenta una escena nueva por su `since` (el paso en que
 * nació): si dos muestras seguidas ven el mismo `since`, es la misma escena
 * todavía en marcha, no una segunda pelea.
 */
const conflictsByTrait = new Map<Trait, number>();
const conflictPersonDays = new Map<Trait, Set<string>>();
const lastConflictSince = new Map<number, number>();
/** Cuántas persona-jornadas distintas tuvieron este rasgo, para poder decir
 *  «de cuántas» y no sólo «cuántas veces» — varias personas pueden compartir
 *  rasgo en la misma aldea, así que el denominador no es `semillas × días`. */
const traitPersonDays = new Map<Trait, Set<string>>();

/** Cuántas veces cambia de actividad un cuerpo en la jornada — sólo cuenta un
 *  cambio cuando las dos actividades son «haber llegado a algo» (`there`),
 *  para no contar el vaivén de ir/venir de la misma cosa como si fueran dos
 *  caracteres distintos. */
const switchesPerPersonDay = new Map<string, number>();
/** Los rasgos de quien tuvo esa clave `seed:id`, para poder separar el grupo
 *  «más persistente en el tajo» del resto al leer `switchesPerPersonDay`. */
const traitsOfPersonDay = new Map<string, readonly Trait[]>();
const WORK_STICKY_TRAITS: readonly Trait[] = ['ambitious', 'stubborn', 'loyal'];
/**
 * Cuánto dura cada tanda seguida en el tajo, por persona-jornada: no «cuánto
 * tiempo pasa trabajando en total» (eso ya lo dice la tabla 1, y ahí pesa
 * tanto `LEANING.work` —de antes de esta fase— como la persistencia nueva),
 * sino «una vez dentro, cuánto aguanta antes de soltarlo» — la propiedad que
 * el brief pide de verdad para `ambitious`/`stubborn`/`loyal`.
 */
const workRunsByPersonDay = new Map<string, number[]>();
let currentWorkRun = new Map<number, number>();
/** El `Intent.since` de la tanda de trabajo en marcha, para no fundir dos
 *  tandas de trabajo distintas en una sola sólo porque comparten el mismo
 *  `offer.id`. */
let currentWorkSince = new Map<number, number>();
/** Lo mismo que `workRunsByPersonDay`, pero para cualquier oferta social —
 *  «encuentros breves» de un `secretive`, del brief IA-3. */
const socialRunsByPersonDay = new Map<string, number[]>();
let currentSocialRun = new Map<number, number>();
let currentSocialSince = new Map<number, number>();
/** El reparto de una persona en un día concreto: fracción de cuerpo-segundos
 *  por actividad, para la comparación de estabilidad. Clave: `id:seed:day`. */
const shareOf = new Map<string, Map<string, number>>();
/** Los `(seed, villagerId)` con más de un día medido, para comparar consigo
 *  mismos. */
const daysSeenOf = new Map<string, number[]>();

let totalBodySeconds = 0;

for (const seed of SEEDS) {
  const state = foundTwenty(seed);
  run(state, YEARS * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);

  for (let day = 0; day < DAYS; day += 1) {
    const life = createVillage(state, day);
    const lastArrived = new Map<number, string>();
    const dayShare = new Map<number, Map<string, number>>();
    const dayTotal = new Map<number, number>();
    currentWorkRun = new Map<number, number>();
    currentWorkSince = new Map<number, number>();
    currentSocialRun = new Map<number, number>();
    currentSocialSince = new Map<number, number>();

    for (let n = 0; n < STEPS_PER_DAY; n += 1) {
      life.step();
      if ((n + 1) % SAMPLE_EVERY !== 0) continue;

      for (const d of life.dwellers) {
        const activity = activityOf(d);
        totalBodySeconds += 1;

        if (d.traits.length === 0) tally('sin_rasgos', activity);
        else for (const trait of d.traits) {
          tally(trait, activity);
          const set = traitPersonDays.get(trait) ?? new Set<string>();
          set.add(`${seed}:${d.body.id}:${day}`);
          traitPersonDays.set(trait, set);
        }
        if (d.ageGroup !== undefined) tally(`edad:${d.ageGroup}` as Row, activity);

        dayTotal.set(d.body.id, (dayTotal.get(d.body.id) ?? 0) + 1);
        const acts = dayShare.get(d.body.id) ?? new Map<string, number>();
        acts.set(activity, (acts.get(activity) ?? 0) + 1);
        dayShare.set(d.body.id, acts);

        // Clave por persona **y jornada** — sin el día, dos jornadas de la
        // misma semilla compartirían contador y el promedio dejaría de ser
        // «por jornada» para pasar a ser «por vida entera medida», que no es
        // lo que el brief pide medir.
        const pdKey = `${seed}:${d.body.id}:${day}`;
        traitsOfPersonDay.set(pdKey, d.traits);
        if (d.doing !== null && d.doing.there) {
          const prev = lastArrived.get(d.body.id);
          if (prev !== undefined && prev !== d.doing.offer.id) {
            switchesPerPersonDay.set(pdKey, (switchesPerPersonDay.get(pdKey) ?? 0) + 1);
          }
          lastArrived.set(d.body.id, d.doing.offer.id);
        } else if (!switchesPerPersonDay.has(pdKey)) {
          switchesPerPersonDay.set(pdKey, 0);
        }

        // Tanda seguida en el tajo: crece mientras la muestra sigue siendo
        // `work` **de la misma intención** (mismo `Intent.since`) — sin esto,
        // dos tandas de trabajo seguidas de un replanteo entre medias se
        // contarían como una sola, y el número dejaría de medir persistencia.
        const since = d.doing?.since;
        if (activity === 'work' && since !== undefined) {
          const sameRun = currentWorkSince.get(d.body.id) === since;
          currentWorkRun.set(d.body.id, sameRun ? (currentWorkRun.get(d.body.id) ?? 0) + 1 : 1);
          currentWorkSince.set(d.body.id, since);
        } else {
          const run = currentWorkRun.get(d.body.id);
          if (run !== undefined && run > 0) {
            const list = workRunsByPersonDay.get(pdKey) ?? [];
            list.push(run);
            workRunsByPersonDay.set(pdKey, list);
          }
          currentWorkRun.set(d.body.id, 0);
        }
        if (SOCIAL_OFFERS.has(activity) && since !== undefined) {
          const sameRun = currentSocialSince.get(d.body.id) === since;
          currentSocialRun.set(d.body.id, sameRun ? (currentSocialRun.get(d.body.id) ?? 0) + 1 : 1);
          currentSocialSince.set(d.body.id, since);
        } else {
          const run = currentSocialRun.get(d.body.id);
          if (run !== undefined && run > 0) {
            const list = socialRunsByPersonDay.get(pdKey) ?? [];
            list.push(run);
            socialRunsByPersonDay.set(pdKey, list);
          }
          currentSocialRun.set(d.body.id, 0);
        }

        if (d.scene !== null && (d.scene.kind === 'shove' || d.scene.kind === 'brawl')) {
          const already = lastConflictSince.get(d.body.id);
          if (already !== d.scene.since) {
            lastConflictSince.set(d.body.id, d.scene.since);
            for (const trait of d.traits) {
              conflictsByTrait.set(trait, (conflictsByTrait.get(trait) ?? 0) + 1);
              const set = conflictPersonDays.get(trait) ?? new Set<string>();
              set.add(`${seed}:${d.body.id}:${day}`);
              conflictPersonDays.set(trait, set);
            }
          }
        }
      }
    }

    // Cierra cualquier tanda de trabajo que siguiera en marcha al terminar la
    // jornada — si no, la última tanda del día se pierde sin contar.
    for (const [id, run] of currentWorkRun) {
      if (run <= 0) continue;
      const pdKey = `${seed}:${id}:${day}`;
      const list = workRunsByPersonDay.get(pdKey) ?? [];
      list.push(run);
      workRunsByPersonDay.set(pdKey, list);
    }
    for (const [id, run] of currentSocialRun) {
      if (run <= 0) continue;
      const pdKey = `${seed}:${id}:${day}`;
      const list = socialRunsByPersonDay.get(pdKey) ?? [];
      list.push(run);
      socialRunsByPersonDay.set(pdKey, list);
    }

    for (const [id, acts] of dayShare) {
      const total = dayTotal.get(id) ?? 1;
      const frac = new Map<string, number>();
      for (const [act, n] of acts) frac.set(act, n / total);
      const key = `${seed}:${id}:${day}`;
      shareOf.set(key, frac);
      const seenKey = `${seed}:${id}`;
      const list = daysSeenOf.get(seenKey) ?? [];
      list.push(day);
      daysSeenOf.set(seenKey, list);
    }
  }
}

const avg = (xs: number[]): number => xs.reduce((s, n) => s + n, 0) / Math.max(1, xs.length);

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0; let na = 0; let nb = 0;
  for (const k of keys) {
    const va = a.get(k) ?? 0; const vb = b.get(k) ?? 0;
    dot += va * vb; na += va * va; nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------------------------------------------------------------------------
// Tabla 1 · rasgo × actividad
// ---------------------------------------------------------------------------

process.stdout.write(`\n=== Rasgo × actividad (${SEEDS.length} semillas × ${DAYS} jornadas, ${YEARS} años) ===\n`);
const allActs = new Set<string>();
for (const acts of byRow.values()) for (const a of acts.keys()) allActs.add(a);
const actList = [...allActs].sort();

for (const [row, acts] of [...byRow.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  const total = [...acts.values()].reduce((s, n) => s + n, 0);
  const parts = actList
    .map((a) => [a, acts.get(a) ?? 0] as const)
    .filter(([, n]) => n > 0)
    .map(([a, n]) => `${a} ${(100 * n / total).toFixed(1)}%`)
    .join(', ');
  process.stdout.write(`${row.padEnd(14)} (${total} cs) · ${parts}\n`);
}

// ---------------------------------------------------------------------------
// Tabla 2 · estabilidad
// ---------------------------------------------------------------------------

process.stdout.write('\n=== Estabilidad ===\n');
const allSwitches = [...switchesPerPersonDay.values()];
const avgSwitches = allSwitches.reduce((s, n) => s + n, 0) / Math.max(1, allSwitches.length);
process.stdout.write(
  `cambios de actividad por persona y jornada: media ${avgSwitches.toFixed(2)}`
  + ` sobre ${allSwitches.length} persona-jornadas\n`,
);

// «Más persistencia en trabajo válido» (ambitious/stubborn/loyal, brief
// IA-3): menos cambios de actividad al día que el resto, no sólo más tiempo
// en el tajo — lo uno es «lo eligen más», lo otro es «lo sueltan menos», y
// son cosas distintas (ver el comentario de `WORK_STICKY_BONUS` en
// `decide.ts`).
const stickyGroup: number[] = [];
const restGroup: number[] = [];
for (const [pdKey, switches] of switchesPerPersonDay) {
  const traits = traitsOfPersonDay.get(pdKey) ?? [];
  if (traits.length === 0) continue;
  (traits.some((t) => WORK_STICKY_TRAITS.includes(t)) ? stickyGroup : restGroup).push(switches);
}
process.stdout.write(
  `cambios/jornada con ambitious/stubborn/loyal: media ${avg(stickyGroup).toFixed(2)}`
  + ` (n=${stickyGroup.length}) · el resto de los nombrados: media ${avg(restGroup).toFixed(2)}`
  + ` (n=${restGroup.length})\n`,
);

// La propiedad de verdad: cuánto dura, seguida, una tanda en el tajo — no
// cuánto se elige (eso ya lo dice `LEANING.work`, de antes de esta fase).
const stickyRuns: number[] = [];
const restRuns: number[] = [];
for (const [pdKey, runs] of workRunsByPersonDay) {
  const traits = traitsOfPersonDay.get(pdKey) ?? [];
  const bucket = traits.some((t) => WORK_STICKY_TRAITS.includes(t)) ? stickyRuns : restRuns;
  bucket.push(...runs);
}
process.stdout.write(
  `duración de una tanda seguida en el tajo (segundos escénicos): `
  + `ambitious/stubborn/loyal media ${avg(stickyRuns).toFixed(1)} (n=${stickyRuns.length} tandas) `
  + `· el resto media ${avg(restRuns).toFixed(1)} (n=${restRuns.length} tandas)\n`,
);

// «Encuentros breves» de un `secretive`, del brief IA-3: cuánto dura, seguida,
// una tanda en una oferta social (gossip/watch/chase/pet/play/gather).
const secretiveRuns: number[] = [];
const othersRuns: number[] = [];
for (const [pdKey, runs] of socialRunsByPersonDay) {
  const traits = traitsOfPersonDay.get(pdKey) ?? [];
  const bucket = traits.includes('secretive') ? secretiveRuns : othersRuns;
  bucket.push(...runs);
}
process.stdout.write(
  `duración de un encuentro social (segundos escénicos): `
  + `secretive media ${avg(secretiveRuns).toFixed(1)} (n=${secretiveRuns.length} encuentros) `
  + `· el resto media ${avg(othersRuns).toFixed(1)} (n=${othersRuns.length} encuentros)\n`,
);

// Consigo misma: para cada (seed, id) con ≥2 días, la similitud de coseno
// entre cada par de días distintos.
const selfSims: number[] = [];
const otherSims: number[] = [];
for (const [seenKey, days] of daysSeenOf) {
  const uniqueDays = [...new Set(days)];
  if (uniqueDays.length < 2) continue;
  for (let i = 0; i < uniqueDays.length; i += 1) {
    for (let j = i + 1; j < uniqueDays.length; j += 1) {
      const a = shareOf.get(`${seenKey}:${uniqueDays[i]}`);
      const b = shareOf.get(`${seenKey}:${uniqueDays[j]}`);
      if (a !== undefined && b !== undefined) selfSims.push(cosine(a, b));
    }
  }
}
// Contra otra persona cualquiera: mismo (seed, día), dos ids distintos, tantos
// pares como los de «consigo misma» para que la muestra pese lo mismo — se
// recorren las claves guardadas y se emparejan con un desplazamiento fijo, sin
// azar (esto es una herramienta de medida, no la capa de vida: no le aplica
// E.3.2, pero tampoco hace falta un dado para esto).
const keysByDay = new Map<string, string[]>();
for (const key of shareOf.keys()) {
  const [seed, id, day] = key.split(':');
  const dayKey = `${seed}:${day}`;
  const list = keysByDay.get(dayKey) ?? [];
  list.push(id as string);
  keysByDay.set(dayKey, list);
}
for (const [dayKey, ids] of keysByDay) {
  if (ids.length < 2) continue;
  for (let i = 0; i < ids.length; i += 1) {
    const j = (i + 1) % ids.length;
    if (i === j) continue;
    const [seed, day] = dayKey.split(':');
    const a = shareOf.get(`${seed}:${ids[i]}:${day}`);
    const b = shareOf.get(`${seed}:${ids[j]}:${day}`);
    if (a !== undefined && b !== undefined) otherSims.push(cosine(a, b));
  }
}
process.stdout.write(
  `similitud del reparto diario (coseno, 0 a 1): consigo misma en otro día `
  + `${avg(selfSims).toFixed(3)} (n=${selfSims.length}) · contra otra persona el mismo día `
  + `${avg(otherSims).toFixed(3)} (n=${otherSims.length})\n`,
);
process.stdout.write(`\ntotal cuerpo-segundos de persona medidos: ${totalBodySeconds}\n`);

// ---------------------------------------------------------------------------
// Tabla 3 · encontronazos por rasgo (fuera de `decide.ts`, ver comentario)
// ---------------------------------------------------------------------------

process.stdout.write('\n=== Encontronazos (shove/brawl) por rasgo ===\n');
for (const [trait, count] of [...conflictsByTrait.entries()].sort((a, b) => b[1] - a[1])) {
  const withOne = conflictPersonDays.get(trait)?.size ?? 0;
  const of = traitPersonDays.get(trait)?.size ?? 0;
  process.stdout.write(
    `${trait.padEnd(14)} ${count} encontronazos en total`
    + ` · ${withOne} de ${of} persona-jornadas con al menos uno`
    + ` (${(100 * withOne / Math.max(1, of)).toFixed(0)}%)\n`,
  );
}
