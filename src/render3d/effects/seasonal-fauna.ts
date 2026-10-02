// v5.85 · Las cigüeñas, las mariposas y las abejas: lo que de la fauna por
// estaciones no tiene modelo y se dibuja aquí, procedural.
//
// Vera, 2 oct 2026: «aves de paso» (cigüeñas o golondrinas en primavera y
// verano) y «mariposas y abejas en verano». Las golondrinas ya existían
// (`ambience.ts`) y ahora sólo vuelan en su estación; lo que no existía eran
// la cigüeña picando en el prado húmedo y lo pequeño que revolotea sobre la
// hierba. Dónde va cada cosa lo dice `derive/seasonal-fauna.ts`; cuándo, la
// estación del estado (`faunaSeason`) y la hora de la jornada. Decorado como
// los peces: no escribe en el estado, no tira dados —todo sale de un hash del
// índice— y no colisiona con nadie.
//
// **Coste.** Cuatro llamadas de dibujo con todo encendido: el cuerpo de las
// cigüeñas, su cuello (que se dobla para picar), las alas de las mariposas y
// los cuerpos de las abejas, cada una una malla instanciada. Sin las
// estaciones que toca, ninguna (`count = 0`). La malla de la cigüeña es un
// apaño de primitivas; la de verdad está pedida en `docs/encargos-3d.md`.

import {
  BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Euler, Float32BufferAttribute,
  Group, InstancedMesh, Matrix4, MeshLambertMaterial, Quaternion, SphereGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GameState } from '@engine/state';
import { hash32 } from '@engine/rng';
import { faunaSeason, pollinatorSpots, storkSpots, type Pollinator, type Spot } from '@derive/seasonal-fauna';
import type { SkyKind } from '../../derive/weather';
import { hourAt } from './day-phases';
import { ashore } from './fauna';

const STORK_MAX = 4;
const POLLINATOR_MAX = 32;
/** TUNE: la cigüeña, de los pies a la coronilla, en celdas. Algo más que una gallina grande. */
const STORK_HEIGHT = 0.5;
/** TUNE: cuánto se aparta de su sitio mientras busca, en celdas, y su paso. */
const STORK_ROAM = 0.5;
/** TUNE: la envergadura de una mariposa y el cuerpo de una abeja en pantalla, en celdas. */
const BUTTERFLY_SIZE = 0.16;
const BEE_SIZE = 0.07;
/** Colores de las mariposas: blanca de la col, amarilla, una naranja y una azul apagada. */
const BUTTERFLY_COLOURS = ['#f2efe2', '#e8cf5a', '#d9853b', '#8fa3c9'];
const BEE_COLOUR = '#d6a62c';

function unit(index: number, what: string): number {
  return hash32(index, `seasonal-fauna:${what}`) / 4_294_967_296;
}

function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  // Sin índice y sin uv: así se pueden juntar piezas de primitivas distintas.
  const plain = geometry.index === null ? geometry : geometry.toNonIndexed();
  plain.deleteAttribute('uv');
  const colour = new Color(hex);
  const count = plain.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let n = 0; n < count; n += 1) colours.set([colour.r, colour.g, colour.b], n * 3);
  plain.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return plain;
}

/**
 * El cuerpo de la cigüeña, mirando a +z con el origen en los pies: patas
 * rojas, cuerpo blanco y la cola de las alas negra. El cuello va aparte.
 */
function storkBody(): BufferGeometry {
  const h = STORK_HEIGHT;
  const body = new SphereGeometry(0.5, 10, 7);
  body.scale(h * 0.26, h * 0.24, h * 0.42);
  body.translate(0, h * 0.58, 0);
  const wings = new SphereGeometry(0.5, 8, 6);
  wings.scale(h * 0.28, h * 0.16, h * 0.36);
  wings.translate(0, h * 0.62, -h * 0.12);
  const legs = [-1, 1].map((side) => {
    const leg = new CylinderGeometry(h * 0.018, h * 0.018, h * 0.42, 4);
    leg.translate(side * h * 0.05, h * 0.21, 0);
    return painted(leg, '#c2452f');
  });
  return mergeGeometries([painted(body, '#f3f1ea'), painted(wings, '#24211f'), ...legs])!;
}

/** El cuello, la cabeza y el pico, con el origen en el arranque del cuello. */
function storkNeck(): BufferGeometry {
  const h = STORK_HEIGHT;
  const neck = new CylinderGeometry(h * 0.04, h * 0.06, h * 0.36, 6);
  neck.translate(0, h * 0.18, 0);
  const head = new SphereGeometry(h * 0.07, 8, 6);
  head.translate(0, h * 0.37, h * 0.02);
  const beak = new ConeGeometry(h * 0.03, h * 0.26, 5);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, h * 0.35, h * 0.17);
  return mergeGeometries([painted(neck, '#f3f1ea'), painted(head, '#f3f1ea'), painted(beak, '#c2452f')])!;
}

/** Dos alas en pajarita: cada una un triángulo que se abre y cierra sobre el eje z. */
function butterflyWings(): BufferGeometry {
  const s = 0.5;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    0, 0, s * 0.3, s, 0, s * 0.5, s * 0.8, 0, -s * 0.5,
    0, 0, s * 0.3, -s * 0.8, 0, -s * 0.5, -s, 0, s * 0.5,
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

export interface SeasonalFauna {
  readonly group: Group;
  /** Cuántas cosas de cada clase se ven ahora, para las pruebas y la traza. */
  readonly visible: { readonly storks: number; readonly butterflies: number; readonly bees: number };
  update(state: GameState, phase: number, sky: SkyKind, seconds: number, ground: (x: number, z: number) => number): void;
  dispose(): void;
}

/** Si a esta hora y con este cielo salen las cigüeñas: de día y sin tormenta. */
export function storksAbroad(hour: number, sky: SkyKind): boolean {
  return hour >= 6.5 && hour <= 20 && sky !== 'storm' && sky !== 'snow';
}

/** Si revolotean mariposas y abejas: a media mañana y por la tarde, sin agua. */
export function pollinatorsAbroad(hour: number, sky: SkyKind): boolean {
  return hour >= 9 && hour <= 19 && (sky === 'clear' || sky === 'overcast');
}

export function createSeasonalFauna(): SeasonalFauna {
  const group = new Group();
  group.name = 'Valley_SeasonalFauna';
  const storkMaterial = new MeshLambertMaterial({ vertexColors: true });
  const bodyGeometry = storkBody();
  const neckGeometry = storkNeck();
  const bodies = new InstancedMesh(bodyGeometry, storkMaterial, STORK_MAX);
  const necks = new InstancedMesh(neckGeometry, storkMaterial, STORK_MAX);
  const wingGeometry = butterflyWings();
  const wingMaterial = new MeshLambertMaterial({ side: DoubleSide });
  const wings = new InstancedMesh(wingGeometry, wingMaterial, POLLINATOR_MAX);
  const beeGeometry = new SphereGeometry(0.5, 6, 4);
  beeGeometry.scale(1, 0.8, 1.4);
  const beeMaterial = new MeshLambertMaterial({ color: BEE_COLOUR });
  const bees = new InstancedMesh(beeGeometry, beeMaterial, POLLINATOR_MAX);
  for (const mesh of [bodies, necks, wings, bees]) {
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    group.add(mesh);
  }
  for (let n = 0; n < POLLINATOR_MAX; n += 1) wings.setColorAt(n, new Color(BUTTERFLY_COLOURS[n % BUTTERFLY_COLOURS.length]!));
  if (wings.instanceColor !== null) wings.instanceColor.needsUpdate = true;

  const matrix = new Matrix4();
  const local = new Matrix4();
  const at = new Vector3();
  const size = new Vector3();
  const turn = new Quaternion();
  const euler = new Euler(0, 0, 0, 'YXZ');
  const shown = { storks: 0, butterflies: 0, bees: 0 };
  // Los sitios se calculan una vez por semana: recorrer el mapa cada fotograma no.
  let cachedTick = Number.NaN;
  let storkAt: Spot[] = [];
  let flutterAt: (Spot & { kind: Pollinator })[] = [];

  return {
    group,
    get visible() { return shown; },
    update(state, phase, sky, seconds, ground): void {
      const season = faunaSeason(state);
      const hour = hourAt(phase);
      if (state.tick !== cachedTick) {
        cachedTick = state.tick;
        storkAt = season.storks ? storkSpots(state) : [];
        flutterAt = season.pollinators > 0 ? pollinatorSpots(state) : [];
      }

      // Las cigüeñas: andan despacio alrededor de su sitio y pican a ratos.
      const storks = season.storks && storksAbroad(hour, sky) ? Math.min(STORK_MAX, storkAt.length) : 0;
      for (let n = 0; n < storks; n += 1) {
        const spot = storkAt[n]!;
        const rate = 0.05 + unit(n, 'rate') * 0.03;
        const angle = seconds * rate + unit(n, 'phase') * Math.PI * 2;
        const raw = { x: spot.x + Math.cos(angle) * STORK_ROAM, y: spot.z + Math.sin(angle) * STORK_ROAM * 0.7 };
        const dry = ashore(state.map, raw.x, raw.y) ?? { x: spot.x, y: spot.z };
        // Hacia donde anda: la tangente de su vuelta.
        const facing = Math.atan2(-Math.sin(angle), Math.cos(angle) * 0.7);
        euler.set(0, facing, 0);
        turn.setFromEuler(euler);
        at.set(dry.x, ground(dry.x, dry.y), dry.y);
        matrix.compose(at, turn, size.setScalar(1));
        bodies.setMatrixAt(n, matrix);
        // Pica un rato de cada cinco segundos: el cuello se dobla hacia delante.
        const peck = Math.max(0, Math.sin(seconds * 1.25 + n * 2.3)) ** 6;
        local.makeRotationX(peck * 1.9);
        local.setPosition(0, STORK_HEIGHT * 0.68, STORK_HEIGHT * 0.16);
        necks.setMatrixAt(n, matrix.clone().multiply(local));
      }
      bodies.count = storks;
      necks.count = storks;
      bodies.instanceMatrix.needsUpdate = true;
      necks.instanceMatrix.needsUpdate = true;

      // Mariposas y abejas: cada una da vueltas pequeñas sobre su sitio, a su altura.
      const amount = pollinatorsAbroad(hour, sky) ? season.pollinators : 0;
      const wanted = Math.min(POLLINATOR_MAX, Math.round(flutterAt.length * amount));
      let butterflies = 0, beeCount = 0;
      for (let n = 0; n < wanted; n += 1) {
        const spot = flutterAt[n]!;
        const speed = spot.kind === 'bee' ? 1.4 : 0.6;
        const t = seconds * speed + unit(n, 'flutter') * 20;
        const radius = spot.kind === 'bee' ? 0.35 : 0.7;
        const x = spot.x + Math.sin(t) * radius + Math.sin(t * 2.3) * radius * 0.3;
        const z = spot.z + Math.cos(t * 0.8) * radius;
        const y = ground(x, z) + (spot.kind === 'bee' ? 0.18 : 0.28) + Math.sin(t * 3.1) * 0.08;
        const heading = Math.atan2(Math.cos(t) - Math.sin(t * 2.3) * 0.69, -Math.sin(t * 0.8) * 0.8);
        if (spot.kind === 'butterfly') {
          // Las alas se abren y cierran: se encoge el ancho con el aleteo.
          const flap = 0.25 + 0.75 * Math.abs(Math.sin(seconds * 9 + n));
          euler.set(0, heading, 0);
          turn.setFromEuler(euler);
          matrix.compose(at.set(x, y, z), turn, size.set(BUTTERFLY_SIZE * flap, BUTTERFLY_SIZE, BUTTERFLY_SIZE));
          wings.setMatrixAt(butterflies, matrix);
          butterflies += 1;
        } else {
          euler.set(0, heading, 0);
          turn.setFromEuler(euler);
          matrix.compose(at.set(x, y, z), turn, size.setScalar(BEE_SIZE));
          bees.setMatrixAt(beeCount, matrix);
          beeCount += 1;
        }
      }
      wings.count = butterflies;
      bees.count = beeCount;
      wings.instanceMatrix.needsUpdate = true;
      bees.instanceMatrix.needsUpdate = true;
      shown.storks = storks;
      shown.butterflies = butterflies;
      shown.bees = beeCount;
    },
    dispose(): void {
      for (const geometry of [bodyGeometry, neckGeometry, wingGeometry, beeGeometry]) geometry.dispose();
      for (const material of [storkMaterial, wingMaterial, beeMaterial]) material.dispose();
      for (const mesh of [bodies, necks, wings, bees]) mesh.dispose();
    },
  };
}
