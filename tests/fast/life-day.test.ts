import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AnimationMixer, Bone, SkinnedMesh, Vector3 } from 'three';
import { foundTwenty } from '../helpers/founding';
import { foundGame } from '../../src/engine/found';
import type { Role } from '../../src/engine/state';
import type { Terrain } from '../../src/render3d/life/body';
import { dayPlans } from '../../src/render3d/life/day';
import { OFFERS, placesOf, type Offer, type Place } from '../../src/render3d/life/offers';
import { terrainOf } from '../../src/render3d/life/terrain';
import { createVillage } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';
import { ACTION_CLIPS, actionClips } from '../../src/render3d/action-clips';
import { allocateLabour } from '../../src/engine/subsistence/labour';

describe('IA-12 · jornada y acciones', () => {
  it('la pareja convierte sus fracciones semanales en jornadas enteras sin perder ninguna', () => {
    const state = foundGame(7), before = JSON.stringify(state), land = terrainOf(state);
    const places = placesOf(state, land), field = places.find(place => place.id.startsWith('field:'))!;
    const work = field.offers.find(offer => offer.id === 'work')!;
    // La fundación aún no tiene obra real. Se añade un tajo alcanzable sólo
    // para comprobar que la fracción de albañil no se pierde cuando sí lo hay.
    const works: Place = {
      id: 'works:test', at: field.at,
      offers: [{ ...work, seats: 1, spots: [field.at] }],
    };
    const days = Array.from({ length: 7 }, (_, day) => dayPlans(state, [...places, works], land, undefined, day));
    const jobs = days.flatMap((plans, day) => [...plans].flatMap(([id, plan]) => plan.job === null
      ? [] : [{ day, id, place: plan.job.place }]));

    // **La propiedad, y no el reparto de un día concreto.** Esto decía «doce de
    // campo, una de tala y una de obra», y esos tres números son el reparto de
    // manos de §5.2, que B-1 movió: la obra pasó de tener garantizado el 15 %
    // de las manos al 30 %, así que la pareja de la fundación reparte hoy 10 de
    // campo, 2 de tala y 2 de obra. Congelar el reparto era congelar el balance
    // en una prueba de la capa de vida, que no es de quien es.
    //
    // Lo que esta prueba guarda —y es lo que IA-12 tenía que demostrar— es que
    // **las fracciones semanales del motor se convierten en jornadas enteras y
    // no se pierde ninguna**: dos personas por siete días son catorce jornadas,
    // cada oficio se lleva las suyas con un día de margen de redondeo, y el
    // campo sigue siendo lo que más manos come.
    const share = allocateLabour(state);
    const inDays = (fraction: number): number => fraction * 7;
    const fieldDays = jobs.filter(job => job.place.startsWith('field:')).length;
    const fellingDays = jobs.filter(job => job.place.startsWith('felling:')).length;
    const worksDays = jobs.filter(job => job.place.startsWith('works:')).length;
    expect(fieldDays + fellingDays + worksDays).toBe(share.workforce * 7);
    expect(Math.abs(fieldDays - inDays(share.farmers)), 'campo').toBeLessThanOrEqual(1);
    expect(Math.abs(fellingDays - inDays(share.cutters)), 'tala').toBeLessThanOrEqual(1);
    expect(Math.abs(worksDays - inDays(share.builders)), 'obra').toBeLessThanOrEqual(1);
    expect(fieldDays).toBeGreaterThan(fellingDays + worksDays);
    expect(new Set(jobs.map(job => `${job.day}:${job.id}`)).size).toBe(jobs.length);
    expect(new Set(jobs.map(job => job.id))).toEqual(new Set([0, 1]));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('representa las manos de caza como jornadas asignadas a un sitio del bosque', () => {
    const state = foundTwenty(7);
    state.village.grain = 0;
    const before = JSON.stringify(state), land = terrainOf(state);
    const hands = allocateLabour(state);
    expect(hands.hunters).toBeGreaterThan(0);
    expect(OFFERS.hunt?.routineOnly).toBe(true);
    const places = placesOf(state, land);
    const hunting = places.find(place => place.id.startsWith('hunt:'))!;
    expect(hunting).toBeDefined();
    expect(hunting.offers[0]?.id).toBe('hunt');

    const huntDays = Array.from({ length: 7 }, (_, day) => dayPlans(state, places, land, undefined, day))
      .flatMap(plans => [...plans.values()].filter(plan => plan.job?.offer === 'hunt'));
    expect(huntDays.length).toBeGreaterThan(0);
    expect(Math.abs(huntDays.length - hands.hunters * 7)).toBeLessThanOrEqual(1);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('conserva los puestos de especialista y usa otra plaza si la primera no tiene ruta', () => {
    const state = foundTwenty(7);
    for (const villager of state.people.villagers) villager.homeId = null;
    const before = JSON.stringify(state);
    const land: Terrain = { width: 12, height: 8, blocked: new Uint8Array(12 * 8) };
    // El muro deja `felling:0` más cerca del guardabosques, pero al otro lado.
    for (let z = 0; z < land.height; z += 1) land.blocked[z * land.width + 4] = 1;
    const at = (x: number, z: number): { x: number; z: number } => ({ x, z });
    const offer = (id: keyof typeof OFFERS, spot: { x: number; z: number }, seats = 1): Offer => ({
      ...OFFERS[id]!, at: spot, seats,
      spots: Array.from({ length: seats }, (_, seat) => ({ x: spot.x + seat * 0.05, z: spot.z })),
    });
    const places: Place[] = [
      { id: 'smithy:0', at: at(1.5, 1.5), offers: [offer('work', at(1.5, 1.5))] },
      { id: 'church:0', at: at(1.5, 2.5), offers: [offer('pray', at(1.5, 2.5))] },
      { id: 'granary:0', at: at(1.5, 3.5), offers: [offer('work', at(1.5, 3.5))] },
      { id: 'square', at: at(1.5, 4.5), offers: [offer('gossip', at(1.5, 4.5))] },
      { id: 'felling:0', at: at(5.5, 2.5), offers: [offer('work', at(5.5, 2.5))] },
      { id: 'felling:1', at: at(2.5, 5.5), offers: [offer('work', at(2.5, 5.5), 4)] },
      { id: 'field:0', at: at(2.5, 6.5), offers: [offer('work', at(2.5, 6.5), 8)] },
      { id: 'works:0', at: at(3.5, 6.5), offers: [offer('work', at(3.5, 6.5), 4)] },
    ];
    const starts = new Map(state.people.villagers.map(villager => [villager.id, at(3.5, 2.5)]));
    const byRole = new Map(state.people.villagers.flatMap(villager => villager.role === null
      ? [] : [[villager.role, villager.id] as const]));
    const expected: Partial<Record<Role, readonly [string, string]>> = {
      leader: ['square', 'gossip'], smith: ['smithy:', 'work'], priest: ['church:', 'pray'],
      woodward: ['felling:1', 'work'], reeve: ['granary:', 'work'],
    };
    let midwifeWorked = false;
    for (let day = 0; day < 7; day += 1) {
      const plans = dayPlans(state, places, land, starts, day);
      for (const [role, [prefix, action]] of Object.entries(expected) as [Role, readonly [string, string]][]) {
        const job = plans.get(byRole.get(role)!)?.job;
        expect(job?.place.startsWith(prefix), `${role}, día ${day}`).toBe(true);
        expect(job?.offer, `${role}, día ${day}`).toBe(action);
      }
      const midwife = plans.get(byRole.get('midwife')!)?.job;
      if (midwife?.place.startsWith('field:') || midwife?.place.startsWith('works:')) midwifeWorked = true;
    }
    expect(midwifeWorked).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each([7, 23])('semilla %s: puestos distintos, menores y mayores libres, sin escribir en el motor', seed => {
    const state = foundTwenty(seed), before = JSON.stringify(state), life = createVillage(state, 0);
    const jobs = life.dwellers.flatMap(d => d.dayPlan?.job ? [d.dayPlan.job] : []);
    expect(jobs.length).toBeGreaterThan(0);
    expect(new Set(jobs.map(j => `${j.place}/${j.offer}/${j.seat}`)).size).toBe(jobs.length);
    const leisure = new Set<string>(), workers = new Set<number>();
    for (let step = 0; step < 1800; step++) {
      life.step(0.4);
      for (const d of life.dwellers) {
        if (d.ageGroup !== undefined) {
          expect(d.dayPlan?.job).toBeNull();
          expect(d.doing?.offer.id).not.toBe('work');
          if (d.doing?.there) leisure.add(`${d.ageGroup}:${d.doing.offer.id}`);
        }
        if (d.doing?.there && d.doing.offer.id === 'work') workers.add(d.villager);
      }
      for (const actor of castOf(life, step / 30, new Map(), new Set())) {
        if (actor.talking) expect(actor.clip).toBe('talk');
        if (actor.activity === 'working') expect(['work_hoe', 'hammer', 'chop', 'sort']).toContain(actor.clip);
      }
    }
    expect(workers.size).toBeGreaterThan(0);
    expect(leisure.has('child:play')).toBe(true);
    expect(leisure.has('elder:sit')).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(['villager', 'villager-priest', 'villager-elder'])('%s: clips nuevos compatibles, finitos y sin alterar el idle', async id => {
    const manifest = JSON.parse(readFileSync('public/assets/valley3d/manifest.json', 'utf8')) as AssetManifest;
    const library = await loadAssets({ baseUrl: '/', manifest: { ...manifest, assets: manifest.assets.filter(a => a.id === id) },
      bytes: { [id]: Uint8Array.from(readFileSync(`public/assets/valley3d/${id}.glb`)).buffer } });
    const idle = library.get(id)!.clips.find(c => c.name === 'idle')!;
    const original = JSON.stringify(idle.toJSON()), clips = actionClips(idle), object = library.instance(id)!;
    const mixer = new AnimationMixer(object);
    const names = clips.map(clip => clip.name);
    expect(new Set(names).size, 'los clips fabricados no deben repetirse').toBe(names.length);
    expect(names, 'la librería debe cubrir todos los clips de acción esperados')
      .toEqual(expect.arrayContaining([...ACTION_CLIPS]));
    for (const clip of clips) {
      expect(clip.tracks.some(track => /^(upperarm|forearm|thigh)/.test(track.name)
        && JSON.stringify(Array.from(track.values)) !== JSON.stringify(Array.from(idle.tracks.find(t => t.name === track.name)!.values))),
      `${clip.name} debe cambiar las extremidades, no sólo renombrar idle`).toBe(true);
      mixer.stopAllAction(); const action = mixer.clipAction(clip).play();
      for (const t of [0, clip.duration / 4, clip.duration / 2, clip.duration - 0.00001]) {
        action.time = t; mixer.update(0); object.updateMatrixWorld(true);
        object.traverse(node => {
          if (node instanceof Bone) expect(node.matrixWorld.elements.every(Number.isFinite)).toBe(true);
          if (node instanceof SkinnedMesh) {
            node.skeleton.update();
            for (let i = 0; i < node.geometry.getAttribute('position').count; i += 29)
              expect(node.getVertexPosition(i, new Vector3()).toArray().every(Number.isFinite)).toBe(true);
          }
        });
      }
    }
    expect(JSON.stringify(idle.toJSON())).toBe(original);
    mixer.stopAllAction(); mixer.uncacheRoot(object); library.dispose();
  });
});
