// Sonda · el modelo de producción contra el descarte, sobre la misma aldea.
//
// El dueño del diseño ha visto la demo con V-07 puesto y sigue sin llegar a la
// del descarte (E.6, E.9: «cuándo parar»). Antes de proponer nada, esto mide
// qué hace distinto cada modelo con la misma gente: cuánto tiempo pasa cada uno
// andando, parado, en una escena; a qué distancia tiene al vecino más cercano;
// cuántos encuentros por persona y jornada; y qué largo es un viaje.
//
//   npx tsx tools/graphics/probe-models.ts [semilla]

import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { createVillage, type Dweller } from '../../src/render3d/life/village';
import { seatAt, seatKey, type Offer, type Place } from '../../src/render3d/life/offers';
import { decide, worth } from '../../src/render3d/life/decide';
import { NEED_NAMES } from '../../src/render3d/life/needs';
import { createRouter } from '../../src/render3d/life/navigate';
import { canReach, reachableFrom } from '../../src/render3d/life/terrain';
import { blockedAt } from '../../src/render3d/life/body';
import { seedOfDay, STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { createWorld, step as spikeStep, type World } from '../../src/render3d/life/spike/life';
import { createValley } from '../../src/render3d/life/spike/valley';

const seed = Number(process.argv[2] ?? 7);
const state = foundGame(seed);
run(state, 40 * 48, 'prudent', CATALOG);

interface Tally {
  people: number;
  samples: number;
  cat: Record<string, number>;
  nearest: number;
  within19: number;
  within3: number;
  within6: number;
  trips: number[];
  scenes: Record<string, number>;
  dests: Record<string, number>;
  notes: string[];
}

function fresh(people: number): Tally {
  return {
    people, samples: 0, cat: {}, nearest: 0, within19: 0, within3: 0, within6: 0,
    trips: [], scenes: {}, dests: {}, notes: [],
  };
}

function neighbours(t: Tally, xs: number[], zs: number[]): void {
  const n = xs.length;
  for (let i = 0; i < n; i += 1) {
    let best = Infinity;
    let c19 = 0; let c3 = 0; let c6 = 0;
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      const d = Math.hypot(xs[i]! - xs[j]!, zs[i]! - zs[j]!);
      if (d < best) best = d;
      if (d < 1.9) c19 += 1;
      if (d < 3) c3 += 1;
      if (d < 6) c6 += 1;
    }
    t.nearest += Number.isFinite(best) ? best : 0;
    t.within19 += c19 > 0 ? 1 : 0;
    t.within3 += c3;
    t.within6 += c6;
    t.samples += 1;
  }
}

/**
 * Por qué alguien está sin nada que hacer: se rehace la criba de `decide()`
 * desde fuera, con el aforo recalculado de lo que cada uno tiene reservado.
 */
function whyIdle(
  d: Dweller, places: readonly Place[], taken: ReadonlyMap<string, number>,
): 'nada-cerca' | 'todo-lleno' | 'sin-ganas' | 'habría-algo' {
  let near = 0; let free = 0; let worthy = 0;
  for (const place of places) {
    const away = Math.hypot(place.at.x - d.body.x, place.at.z - d.body.z);
    const hasHour = place.offers.some((o) => o.hours !== undefined);
    if (away > 5 * (hasHour ? 4 : 2)) continue;
    near += 1;
    for (const offer of place.offers) {
      if ((taken.get(seatKey(place, offer)) ?? 0) >= offer.seats) continue;
      free += 1;
      if (worth(offer, d.needs, d.traits, d.body) > 0) worthy += 1;
    }
  }
  if (near === 0) return 'nada-cerca';
  if (free === 0) return 'todo-lleno';
  if (worthy === 0) return 'sin-ganas';
  return 'habría-algo';
}

function production(): Tally {
  const life = createVillage(state, 0);
  const t = fresh(life.dwellers.length);
  const lastDoing = new Map<number, object | null>();
  const seen = new Set<object>();
  const idleWhy: Record<string, number> = {};
  const router = createRouter();
  const daySeed = seedOfDay(state.seed, 0);
  // Los sitios de esta orilla, igual que los filtra `createVillage`.
  let heart = life.places[0]?.at ?? { x: 0, z: 0 };
  let most = -1;
  for (const place of life.places) {
    const near = life.places.filter((o) => Math.hypot(o.at.x - place.at.x, o.at.z - place.at.z) < 14).length;
    if (near > most) { most = near; heart = place.at; }
  }
  const shore = reachableFrom(life.land, heart);
  const mine = life.places.filter((p) => canReach(life.land, shore, p.at));
  t.notes.push(`sitios: ${life.places.length} en total, ${mine.length} en esta orilla`);
  let needSum = 0; let needSamples = 0;
  for (let s = 0; s < STEPS_PER_DAY; s += 1) {
    life.step();
    const xs: number[] = []; const zs: number[] = [];
    if (s % 30 === 0) {
      const taken = new Map<string, number>();
      for (const d of life.dwellers) {
        if (d.doing !== null) {
          const k = seatKey(d.doing.place, d.doing.offer);
          taken.set(k, (taken.get(k) ?? 0) + 1);
        }
      }
      for (const d of life.dwellers) {
        for (const n of NEED_NAMES) { needSum += d.needs[n]; needSamples += 1; }
        if (d.doing !== null || d.scene !== null) continue;
        let why: string = whyIdle(d, mine, taken);
        if (why === 'habría-algo') {
          // La misma pregunta que hace `village.ts`, con lo mismo delante.
          const chosen = decide(
            { traits: d.traits, needs: d.needs, at: d.body, id: d.body.id, doing: null },
            mine, taken, life.land, router, daySeed, s,
          );
          if (chosen !== null) why = 'decide-sí-elige';
          else {
            // ¿Es el camino? Se busca lo mejor que hay libre y se pide la ruta.
            let best: { offer: Offer; place: Place; score: number } | null = null;
            for (const place of mine) {
              const away = Math.hypot(place.at.x - d.body.x, place.at.z - d.body.z);
              if (away > 10) continue;
              for (const offer of place.offers) {
                if ((taken.get(seatKey(place, offer)) ?? 0) >= offer.seats) continue;
                const score = worth(offer, d.needs, d.traits, d.body);
                if (score > 0 && (best === null || score > best.score)) best = { offer, place, score };
              }
            }
            if (best === null) why = 'decide-null-sin-mejor';
            else {
              const seat = taken.get(seatKey(best.place, best.offer)) ?? 0;
              const spot = seatAt(best.offer, seat);
              const route = router.to(life.land, d.body, spot);
              const ground = blockedAt(life.land, spot.x, spot.z) ? 'plaza-en-pared/agua'
                : canReach(life.land, shore, spot) ? 'plaza-libre-pero-sin-ruta' : 'plaza-en-otra-orilla';
              why = route === null ? `sin-camino (${best.offer.id}, ${ground}, plaza ${seat})` : 'decide-null-otra-razón';
            }
          }
        }
        idleWhy[why] = (idleWhy[why] ?? 0) + 1;
      }
    }
    for (const d of life.dwellers) {
      xs.push(d.body.x); zs.push(d.body.z);
      const cat = d.scene !== null ? 'scene' : d.doing === null ? 'idle' : d.doing.there ? 'at' : 'walk';
      t.cat[cat] = (t.cat[cat] ?? 0) + 1;
      if (d.doing !== null && lastDoing.get(d.body.id) !== d.doing) {
        const spot = seatAt(d.doing.offer, d.doing.seat);
        t.trips.push(Math.hypot(spot.x - d.body.x, spot.z - d.body.z));
        const key = d.doing.offer.id;
        t.dests[key] = (t.dests[key] ?? 0) + 1;
      }
      lastDoing.set(d.body.id, d.doing);
      if (d.scene !== null && !seen.has(d.scene)) {
        seen.add(d.scene);
        const key = d.scene.kind === 'chat' ? (d.scene.roleA === 'peer' ? 'chat' : 'reject') : d.scene.kind;
        t.scenes[key] = (t.scenes[key] ?? 0) + 1;
      }
    }
    neighbours(t, xs, zs);
  }
  const idleTotal = Object.values(idleWhy).reduce((a, b) => a + b, 0);
  t.notes.push(`sin nada que hacer, por qué: ${Object.entries(idleWhy)
    .map(([k, v]) => `${k} ${(100 * v / Math.max(1, idleTotal)).toFixed(0)}%`).join(' · ')}`);
  t.notes.push(`impulso medio     : ${(needSum / Math.max(1, needSamples)).toFixed(3)} (de 0 a 1)`);
  return t;
}

function spike(world: World): Tally {
  const t = fresh(world.bodies.length);
  // Por coordenadas y no por identidad: ir a por la pelota reescribe `goal`
  // cada paso con un objeto nuevo y contaría como un viaje por paso.
  const lastGoal = new Map<number, string>();
  for (let s = 0; s < STEPS_PER_DAY; s += 1) {
    spikeStep(world);
    const xs: number[] = []; const zs: number[] = [];
    for (const b of world.bodies) {
      xs.push(b.x); zs.push(b.z);
      const cat = b.talkingTo !== null ? 'scene' : b.goal === null ? 'idle' : 'walk';
      t.cat[cat] = (t.cat[cat] ?? 0) + 1;
      const key = b.goal === null ? '' : `${b.goal.x.toFixed(2)},${b.goal.z.toFixed(2)}`;
      if (b.goal !== null && lastGoal.get(b.id) !== key) {
        t.trips.push(Math.hypot(b.goal.x - b.x, b.goal.z - b.z));
      }
      lastGoal.set(b.id, key);
    }
    neighbours(t, xs, zs);
  }
  t.scenes = { chat: world.chats, shove: world.shoves, passes: world.passes, blows: world.blows };
  return t;
}

function report(name: string, t: Tally): void {
  const pct = (n: number): string => `${(100 * n / t.samples).toFixed(0)}%`;
  const trips = t.trips.slice().sort((a, b) => a - b);
  const median = trips[Math.floor(trips.length / 2)] ?? 0;
  const mean = trips.reduce((a, b) => a + b, 0) / Math.max(1, trips.length);
  const scenesPer = Object.entries(t.scenes)
    .map(([k, v]) => `${k} ${(v / t.people).toFixed(2)}`).join(' · ');
  console.log(`\n## ${name} · ${t.people} personas · semilla ${seed}`);
  console.log(`  reparto del día : ${Object.entries(t.cat).map(([k, v]) => `${k} ${pct(v)}`).join(' · ')}`);
  console.log(`  vecino más cerca: ${(t.nearest / t.samples).toFixed(2)} celdas de media`);
  console.log(`  alguien a <1,9  : ${pct(t.within19)} del tiempo`);
  console.log(`  gente a <3 / <6 : ${(t.within3 / t.samples).toFixed(2)} / ${(t.within6 / t.samples).toFixed(2)} personas de media`);
  console.log(`  viajes          : ${t.trips.length} (${(t.trips.length / t.people).toFixed(1)} por persona) · mediana ${median.toFixed(1)} celdas · media ${mean.toFixed(1)}`);
  console.log(`  por persona/día : ${scenesPer}`);
  if (Object.keys(t.dests).length > 0) {
    const top = Object.entries(t.dests).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, v]) => `${k} ${v}`).join(' · ');
    console.log(`  destinos        : ${top}`);
  }
  for (const note of t.notes) console.log(`  ${note}`);
}

/**
 * Cuánto mide una persona en pantalla, en cada demo.
 *
 * Aproxima `fitting()` de `camera.ts` (VIEW = (1, 0,9, 1,15), AIR = 5) sobre la
 * caja de reposo de `renderer.ts` (CORE_SHARE = 0,8, FRAME_MARGIN = 2,5) en el
 * marco de 390×844 css al que `.valley-app` recorta el juego. El banco del
 * descarte se encuadra con `span = max(w, h) · 0,62` a pantalla completa.
 */
function scale(): void {
  const buildings = state.buildings.filter((b) => b.lostTick === null);
  const centres = buildings.map((b) => ({ x: b.x + b.w / 2, z: b.y + b.h / 2, b }));
  const mid = (v: number[]): number => v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 0;
  const hx = mid(centres.map((c) => c.x)); const hz = mid(centres.map((c) => c.z));
  const core = centres.slice().sort((a, b) => ((a.x - hx) ** 2 + (a.z - hz) ** 2) - ((b.x - hx) ** 2 + (b.z - hz) ** 2))
    .slice(0, Math.ceil(centres.length * 0.8));
  let minX = Infinity; let minZ = Infinity; let maxX = 0; let maxZ = 0;
  for (const { b } of core) {
    minX = Math.min(minX, b.x); minZ = Math.min(minZ, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxZ = Math.max(maxZ, b.y + b.h);
  }
  const w = maxX - minX + 5; const h = maxZ - minZ + 5;
  const az = Math.atan2(1, 1.15); const el = Math.atan2(0.9, Math.hypot(1, 1.15));
  const seenW = w * Math.cos(az) + h * Math.sin(az);
  const seenH = (w * Math.sin(az) + h * Math.cos(az)) * Math.sin(el);
  const aspect = 390 / 844;
  const visible = Math.max(seenH + 10, (seenW + 10) / aspect);
  const px = 844 / visible;
  console.log(`\n## escala en pantalla · semilla ${seed}`);
  console.log(`  juego, reposo   : núcleo ${w.toFixed(0)}×${h.toFixed(0)} celdas → ${visible.toFixed(0)} celdas de alto en 844 px → ${px.toFixed(1)} px/celda → una persona (0,65) ≈ ${(0.65 * px).toFixed(0)} px`);
  console.log(`  juego, tope zoom: 8 celdas de alto → ${(844 / 8).toFixed(0)} px/celda → una persona ≈ ${(0.65 * 844 / 8).toFixed(0)} px`);
  const spikePx = 650 / (34 * 0.62 * 2);
  console.log(`  descarte (prado): ${(34 * 0.62 * 2).toFixed(0)} celdas de alto en ~650 px css → ${spikePx.toFixed(1)} px/celda → un cuerpo (≈1,2) ≈ ${(1.2 * spikePx).toFixed(0)} px`);
  console.log(`  mapa: ${state.map.width}×${state.map.height} celdas · ${buildings.length} edificios`);
}

scale();
report('producción (life/village.ts)', production());
report('descarte · valle real', spike(createValley(state, seed, 80)));
report('descarte · prado de 8 (la referencia)', spike(createWorld(seed, 8)));
