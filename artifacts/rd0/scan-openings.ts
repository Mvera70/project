// RD-0 · barrido del motor: qué ofrece cada semilla en sus primeras semanas.
// Sin respuestas ni actos del jugador (como hace el juego si nadie toca nada).
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { tick } from '../../src/engine/sim';
import { foundGame } from '../../src/engine/found';
import { huntOpportunity } from '../../src/engine/world/hunting';
import { missionsOpen } from '../../src/engine/world/expeditions';

const seeds = process.argv.slice(2).map(Number);
const W = 60;
for (const seed of seeds) {
  const s = foundGame(seed);
  const hunts: string[] = [];
  let firstCross = -1; let firstMission = -1;
  const chron: string[] = [];
  const t0 = huntOpportunity(s);
  for (let w = 0; w < W; w++) {
    const o = huntOpportunity(s);
    if (o && w < 24) hunts.push(`${s.tick}:${o.species}/${o.weapons.join('+')}`);
    if (firstMission < 0 && missionsOpen(s).some((m) => m.refusal === null)) firstMission = s.tick;
    const before = s.chronicle.length;
    tick(s, CATALOG);
    if (s.crossroad !== null && firstCross < 0) firstCross = s.tick;
    for (const e of s.chronicle.slice(before)) if (chron.length < 14) chron.push(`t${e.tick} ${e.kind}/${e.templateKey} w${e.weight}`);
  }
  console.log(JSON.stringify({ seed, t0: t0?.species ?? null, people: s.people.villagers.length, hunts, firstCross, firstMission, traits: s.traits, chron }));
}
