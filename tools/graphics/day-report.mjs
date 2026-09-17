// IA-12 · Resume la traza del renderer, no una simulación paralela.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const file = resolve(process.argv[2] ?? 'trace.json');
const trace = JSON.parse(readFileSync(file, 'utf8'));
const people = new Map();
let misleadingChat = 0, wrongClip = 0;
for (const frame of trace.frames) {
  const life = frame.life;
  for (const bubble of life.bubbles ?? []) {
    if (bubble.kind === 'chat' && !life.actors.find(a => a.id === bubble.id)?.talking) misleadingChat++;
  }
  for (const mesh of life.renderedPeople) {
    if (mesh.clip !== undefined && mesh.clip !== life.actors.find(a => a.id === mesh.id)?.clip) wrongClip++;
  }
  if (life.phase < 0.16 || life.phase >= 0.65) continue;
  for (const p of life.people) {
    const entry = people.get(p.id) ?? { id: p.id, ageGroup: p.ageGroup, job: p.dayPlan?.job ?? null, samples: 0, atJob: 0, actions: {} };
    const action = p.scene ?? (p.doing?.there ? p.doing.offer : 'travelling');
    entry.actions[action] = (entry.actions[action] ?? 0) + 1;
    entry.samples++;
    if (p.scene === null && p.doing?.there && p.dayPlan?.job?.place === p.doing.place && p.dayPlan.job.offer === p.doing.offer) entry.atJob++;
    people.set(p.id, entry);
  }
}
const assigned = [...people.values()].filter(p => p.job !== null && ['work', 'pray'].includes(p.job.offer));
const report = { seed: trace.seed, year: trace.year, mode: trace.mode, fps: trace.fps,
  assigned: assigned.length, reachedJob: assigned.filter(p => p.atJob > 0).length,
  pendingWorkers: assigned.filter(p => p.atJob === 0).map(p => p.id),
  misleadingChat: trace.frames.every(f => f.life.bubbles !== undefined) ? misleadingChat : null,
  wrongClip: trace.frames.every(f => f.life.renderedPeople.every(p => p.clip !== undefined)) ? wrongClip : null,
  people: [...people.values()] };
writeFileSync(resolve(dirname(file), 'day-summary.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, people: undefined }, null, 2));
