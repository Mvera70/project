import { describe, expect, it } from 'vitest';
import { foundGame } from '../../src/engine/found';
import { TERRAIN_CODE } from '../../src/engine/state';
import { run } from '../../src/engine/sim';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { elevatedRingOf, type ElevatedRingVariant } from '../../src/derive/elevated-ring';
import { planRingCorridorMoves } from '../../src/engine/world/placement';
import { sceneRingOf } from '../../src/render3d/world/plan';
import { createVillage } from '../../src/render3d/life/village';
import { forestLooks } from '../../src/render3d/world/forest-state';
import { scatterTransform } from '../../src/render3d/world/forest';
import { ringCandidateAssetsOf, unresolvedRingSeams } from '../../src/render3d/world/elevated-ring-assets';

const all: ElevatedRingVariant[] = ['straight', 'turn', 'diagonal', 'mixed',
  'gate-cardinal', 'gate-diagonal', 'gate-mixed', 'bastion-crossing', 'bastion-return'];

// **Las villas de este fichero son huellas de una trayectoria, y se remiden
// cuando el motor la mueve** (`docs/historico/rework.md` §2.7; el cuaderno lo
// anunció el 28 sep: «la villa de E3b» entre las jornadas que la madera una
// semana más tarde cambia). Se escribieron contra un motor anterior a la
// historia de este repositorio: ya fallaban las cinco en `ee9340e`. Remedido
// el 30 sep 2026 en 60 semillas a los 3846 ticks, buscando cada escena y no
// sólo el número: la iglesia anterior a la reserva está en la semilla 9 (la 7
// ya no tiene nada en el pasillo), los árboles que cortan el adarve de retorno
// 66 junto a muro en la 2 (la 23 ya está despejada), y el traslado de la
// iglesia se planea en la misma semilla 9. Lo que cada prueba exige es lo de
// siempre; cambia en qué villa se mira y sus identificadores.
describe('E3b · pasillo interior de una villa real', () => {
  it('no acredita una iglesia existente anterior a la reserva del adarve', () => {
    const state = foundGame(9);
    run(state, 3846, 'prudent', CATALOG);
    const bastion = state.buildings.find(item => item.kind === 'bastion' && item.lostTick === null);
    expect(bastion).toBeDefined();
    // La iglesia de la semilla 9 se levantó en el tick 136, mucho antes del
    // anillo, y sigue en pie pegada al eje del tramo 163.
    const church = state.buildings.find(item => item.id === 20);
    expect(church?.kind).toBe('church');
    expect(church?.lostTick).toBeNull();
    const ring = elevatedRingOf(state, bastion!, { approvedVariants: all, lane: 'center' });
    expect(ring.topologyClosed).toBe(true);
    expect(ring.segments.find(item => item.buildingId === 163)?.reason).toBe('interior');
    expect(ring.geometryReady).toBe(false);
  });

  // **Declarada en rojo, con la propiedad intacta** (`CLAUDE.md`, «cuando algo
  // no llega»). La escena que pide —un anillo que el motor deja libre él solo,
  // cerrado en el retorno 66 con el portón pegado al suroeste, que es lo único
  // que las fuentes candidatas cubren entero— **no sale hoy en ninguna villa**.
  // Medido el 30 sep 2026 en 60 semillas a los 3846 ticks: 12 cierran en
  // retorno 66, 11 con muro al suroeste (la junta sin GLB, `unresolvedRingSeams`)
  // y una, la 9, con el portón, pero su iglesia anterior a la reserva corta el
  // tramo 163 (primera prueba); pagando el traslado sí queda libre y cubierto
  // (104 tramos, 103 piezas, la combinada con la hoja del portón 52). La 91,
  // que era esta villa, cierra ahora en retorno 132 y la escena la para
  // `variant`. Si una villa del motor vuelve a darla, esto se pone rojo y hay
  // que quitar el `.fails` y clavar la semilla.
  it.fails('la nueva reserva deja libre el recorrido en otra villa construida por el motor', () => {
    const state = foundGame(91);
    run(state, 3846, 'prudent', CATALOG);
    const bastion = state.buildings.find(item => item.kind === 'bastion' && item.lostTick === null);
    expect(bastion).toBeDefined();
    const ring = elevatedRingOf(state, bastion!, { approvedVariants: all, lane: 'center' });
    expect(ring.topologyClosed).toBe(true);
    expect(ring.geometryReady).toBe(true);
    const scene = sceneRingOf(state, bastion!, all, 'center');
    expect(scene.geometryReady).toBe(true);
    expect(scene.segments).toHaveLength(88);
    expect(scene.segments.some(segment => segment.reason === 'obstacle')).toBe(false);
    expect(unresolvedRingSeams(scene)).toEqual([]);
    const placements = ringCandidateAssetsOf(scene);
    expect(placements).not.toBeNull();
    expect(placements).toHaveLength(87);
    expect(placements!.flatMap(piece => piece.replaces).sort((a, b) => a - b))
      .toEqual(scene.segments.map(segment => segment.buildingId).sort((a, b) => a - b));
    expect(placements!.filter(piece => piece.asset === 'e3b-anchor66-gate24-combined-candidate'))
      .toHaveLength(1);
    expect(placements!.find(piece => piece.asset === 'e3b-anchor66-gate24-combined-candidate')?.gateLeaf)
      .toEqual({ buildingId: scene.segments.find(segment => segment.variant === 'gate-mixed')?.buildingId,
        asset: 'e3b-gate-wide-light-finish-candidate' });
    expect(placements!.some(piece => piece.asset === 'e3b-gate-crossing-24-light-finish-candidate'))
      .toBe(false);
  });

  it('la segunda villa bloquea los árboles reales y reabre la ruta al despejarlos', () => {
    const state = foundGame(2);
    run(state, 3846, 'prudent', CATALOG);
    const bastion = state.buildings.find(item => item.kind === 'bastion' && item.lostTick === null);
    expect(bastion).toBeDefined();
    const scene = sceneRingOf(state, bastion!, all, 'center');
    expect(scene.topologyClosed).toBe(true);
    expect(scene.segments).toHaveLength(104);
    expect(scene.geometryReady).toBe(false);
    expect(scene.blocked).toEqual({ cell: { x: 19, z: 54 }, reason: 'obstacle' });
    expect(ringCandidateAssetsOf(scene)).toBeNull();
    const blocked = scene.segments.filter(segment => segment.reason === 'obstacle').map(segment => segment.cell);
    expect(blocked).toEqual([{ x: 19, z: 54 }, { x: 20, z: 53 }]);
    for (const look of forestLooks(state)) {
      if (look.stage !== 'standing') continue;
      const tree = scatterTransform(state.map.width, look.cell);
      if (!blocked.some(cell => Math.hypot(tree.x - cell.x - .5, tree.z - cell.z - .5) < 3)) continue;
      state.map.terrain[look.cell] = TERRAIN_CODE.cleared;
      state.map.forestStock[look.cell] = 0;
    }
    const cleared = sceneRingOf(state, bastion!, all, 'center');
    expect(cleared.geometryReady).toBe(true);
    expect(cleared.route.length).toBe(105);
    expect(unresolvedRingSeams(cleared)).toEqual([{ kind: 'anchor66-wall',
      bastionId: bastion!.id, wallId: 192 }]);
    const placements = ringCandidateAssetsOf(cleared);
    expect(placements).toHaveLength(103);
    expect(placements!.flatMap(piece => piece.replaces).sort((a, b) => a - b))
      .toEqual(cleared.segments.map(segment => segment.buildingId).sort((a, b) => a - b));
    expect(placements!.filter(piece => piece.asset === 'e3b-gate-crossing-65-light-finish-candidate'))
      .toHaveLength(1);
    expect(placements!.filter(piece => piece.asset === 'e3b-anchor66-wall24-combined-candidate'))
      .toHaveLength(1);
    expect(placements!.find(piece => piece.asset === 'e3b-anchor66-wall24-combined-candidate')?.replaces)
      .toEqual([bastion!.id, 192]);
    expect(placements!.find(piece => piece.asset === 'e3b-gate-crossing-65-light-finish-candidate')?.companionAssets)
      .toEqual(['e3b-gate-wide-light-finish-candidate']);
  });

  it('un guardia asignado sube, recorre y regresa por el anillo candidato de la semilla 23', () => {
    // Era la semilla 91, que ya no cierra en retorno 66 (remedido el 30 sep:
    // su bastión acaba en retorno 132, sin escalera en las fuentes nuevas). La
    // 23 sí: 88 tramos, retorno 66, y el guardia sube, da la vuelta y baja en
    // 8 206 pasos.
    const state = foundGame(23);
    run(state, 3846, 'prudent', CATALOG);
    (state.traits as string[]).push('arms', 'bows');
    state.threat.comingTick = state.tick + 1;
    const bastion = state.buildings.find(item => item.kind === 'bastion' && item.lostTick === null);
    expect(bastion).toBeDefined();
    const life = createVillage(state, 0, { ringOf: (candidateState, candidate) =>
      sceneRingOf(candidateState, candidate, all, 'center') });
    const ringPost = life.manned.find(post => post.elevatedVariant === 'ring');
    expect(ringPost, 'el bastión ofrece el circuito candidato').toBeDefined();
    expect(life.manned.filter(post => post.elevatedVariant === 'ring')).toHaveLength(1);
    expect([ringPost?.post.x, ringPost?.post.y]).toEqual([bastion!.x, bastion!.y]);
    expect(ringPost?.elevated?.foot.z).toBeCloseTo(bastion!.y + 2.65, 6);
    const gatePost = life.manned.find(post => post.post.on === 'gate');
    expect(gatePost, 'el portón mantiene su guardia').toBeDefined();
    expect([Math.floor(gatePost!.place.at.x), Math.floor(gatePost!.place.at.z)])
      .not.toEqual([Math.floor(ringPost!.place.at.x), Math.floor(ringPost!.place.at.z)]);
    expect(ringPost?.elevated?.climb.length).toBeGreaterThan(88);
    const assigned = life.dwellers.find(dweller => dweller.dayPlan?.job?.place === ringPost?.place.id);
    expect(assigned, 'la jornada asigna una persona al circuito').toBeDefined();
    const guard = assigned!;
    let reachedTop = false;
    let descended = false;
    for (let step = 0; step < 12000 && !descended; step += 1) {
      life.step();
      if (guard.elevated?.phase === 'occupied') {
        reachedTop = guard.elevated.next === 0
          && guard.body.y === guard.elevated.post.post.y;
      }
      if (reachedTop && guard.elevated === undefined && guard.body.y === undefined) descended = true;
    }
    expect(reachedTop, 'el mismo guardia terminó ascenso y circuito').toBe(true);
    expect(descended, 'el mismo guardia regresó al suelo').toBe(true);
  });

  it('puede planificar el traslado íntegro al pagar la reforma, sin alterar suelo ni identidades', () => {
    // La iglesia de la primera prueba, dos mil ticks antes: el plan la aparta
    // una celda del pasillo y, jugada la villa después, el adarve queda libre.
    const state = foundGame(9);
    run(state, 2000, 'prudent', CATALOG);
    const beforeTerrain = state.map.terrain.slice();
    const beforeBuildings = structuredClone(state.buildings);
    const moves = planRingCorridorMoves(state);
    expect(moves).toEqual([{ buildingId: 20, from: { x: 34, y: 44 }, to: { x: 34, y: 45 } }]);
    expect(planRingCorridorMoves(state)).toEqual(moves);
    expect(state.buildings).toEqual(beforeBuildings);
    for (const move of moves!) {
      const building = state.buildings.find(item => item.id === move.buildingId)!;
      building.x = move.to.x;
      building.y = move.to.y;
    }
    expect(state.map.terrain).toEqual(beforeTerrain);
    run(state, 1846, 'prudent', CATALOG);
    const bastion = state.buildings.find(item => item.kind === 'bastion' && item.lostTick === null);
    expect(bastion).toBeDefined();
    const ring = elevatedRingOf(state, bastion!, { approvedVariants: all, lane: 'center' });
    expect(ring.topologyClosed).toBe(true);
    expect(ring.geometryReady).toBe(true);
  });
});
