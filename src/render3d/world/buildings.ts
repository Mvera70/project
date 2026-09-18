// G-06 · Buildings, added and removed one at a time. design.md D.6, D.8.
//
// Placeholder geometry on purpose. The catalogue only holds a villager and two
// study corners; the house, the field and the tree are G-10's work. Until then
// a building is a box with a roof, sized and coloured from `visual-config`, so
// that a real game produces a real village and the scale can be judged against
// the villager who now stands 0.65 cells high.
//
// D.8 says as much in order: a minimum coherent set first, variants last. What
// this must not do is wait for the catalogue, because the thing that has to be
// judged — whether a valley of these proportions reads from above — does not
// need the final art to be judged wrong.

import {
  Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Vector3,
  type Material, type Object3D,
} from 'three';
import type { BuildingId, BuildingKind } from '@engine/state';
import type { PlannedBuilding } from './plan';
import { buildDefence } from './defences';

/**
 * A four-sided pyramid over a `w × h` footprint, `rise` tall.
 *
 * Written out rather than taken from `ConeGeometry` because a cone with four
 * segments is square in plan but not rectangular: a two-by-three barn would get
 * a roof that did not sit on its walls.
 */
function roofGeometry(w: number, h: number, rise: number): BufferGeometry {
  const positions = new Float32Array([
    // Four eaves and one ridge point, as four triangles.
    0, 0, 0, w, 0, 0, w / 2, rise, h / 2,
    w, 0, 0, w, 0, h, w / 2, rise, h / 2,
    w, 0, h, 0, 0, h, w / 2, rise, h / 2,
    0, 0, h, 0, 0, 0, w / 2, rise, h / 2,
  ]);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export interface BuildingModel {
  readonly object: Object3D;
  /**
   * Pinta el tejado de este edificio con la nieve que le toque.
   *
   * `snow` va de 0 a 1 y es cuánta hay puesta. La nieve no la decide esto: la
   * decide la estación, igual que el color del suelo y el del bosque.
   */
  weather(snow: number, colour: string): void;
  face?(radians: number): void;
  door?(open: boolean, seconds: number): void;
  dispose(): void;
}

/**
 * Los materiales de tejado de un recurso, copiados para poder pintarlos.
 *
 * Copiados porque los del recurso son de la biblioteca: nevar sobre ellos
 * nevaría sobre todas las casas del valle a la vez, incluidas las de otra
 * partida abierta al lado. **No cuesta una llamada de dibujo más**, que es la
 * misma cuenta que la ropa del aldeano: la llamada la cuenta la malla.
 */
function roofsOf(model: Object3D): Array<{ material: MeshStandardMaterial; base: Color }> {
  const roofs: Array<{ material: MeshStandardMaterial; base: Color }> = [];
  model.traverse((child) => {
    const mesh = child as Object3D & { isMesh?: boolean; material?: Material | Material[] };
    if (mesh.isMesh !== true || mesh.material === undefined || Array.isArray(mesh.material)) return;
    const source = mesh.material as MeshStandardMaterial;
    // El tejado se conoce por el nombre de su material, que es el papel de la
    // paleta con el que se autorizó la receta. No se nieva sobre la pared: la
    // nieve cuaja arriba, y una casa blanca entera es una casa de otro color.
    if (!source.name.includes('roof')) return;
    const copy = source.clone();
    mesh.material = copy;
    roofs.push({ material: copy, base: copy.color.clone() });
  });
  return roofs;
}

/**
 * Que recurso del catalogo corresponde a cada tipo de edificio.
 *
 * El motor escribe `stone_house` con guion bajo y el catalogo no lo admite en
 * un identificador, asi que la correspondencia se escribe una vez aqui en vez
 * de repetirse en cada sitio que la necesite.
 */
export const BUILDING_ASSETS: Partial<Record<BuildingKind, string>> = {
  house: 'house',
  field: 'field',
  palisade: 'palisade',
  // A2 · el portón. **Todavía sin malla propia** (E3 del plan de la meta):
  // usa la de la empalizada, que es la pieza de muralla que ocupa, y las
  // jambas las dibuja `obstacles.ts` en su celda. El día que la malla exista
  // con una hoja llamada `gate_door`, el gozne de `door()` la abre sin tocar
  // una línea de aquí.
  gate: 'palisade',
  wall: 'wall',
  watchtower: 'watchtower',
  grave_yard: 'grave-yard',
  stone_house: 'stone-house',
  granary: 'granary',
  mill: 'mill',
  smithy: 'smithy',
  chapel: 'chapel',
  church: 'church',
  well: 'well',
  // K-4 · la sala del rey. **Todavía sin malla**: el encargo de arte está en
  // `docs/plan-rey.md` §8, y hasta que exista el render la dibuja con su propio
  // aspecto —más alta que una casa y con el tejado burdeos del jefe— por el
  // mismo camino que el barril y el arado.
  hall: 'hall',
};

/**
 * Un edificio con su recurso de verdad, colocado sobre su huella.
 *
 * La receta se escribe con la esquina en el origen y la huella hacia +X y +Z,
 * igual que el motor guarda la suya (D.4), asi que colocar es poner el grupo en
 * la esquina y nada mas. Una ruina nunca usa recurso: §7.4 la deja en el mapa y
 * lo que tiene que leerse es que ya no es una casa.
 */
export function buildFromAsset(planned: PlannedBuilding, source: Object3D): BuildingModel {
  if (!planned.ruin && planned.connections !== undefined) return buildDefence(planned, source);
  const group = new Group();
  group.name = `Building_${planned.id}`;
  // **El fondo de la huella se suma a la Z, y esto es un arreglo, no un ajuste.**
  //
  // Las recetas se escriben en Blender, que tiene la Z arriba; glTF tiene la Y
  // arriba, y el exportador convierte poniendo `z_glTF = -y_blender`. Una
  // receta que ocupa de 0 a 6 metros en Y sale ocupando **de -6 a 0** en Z, asi
  // que colocando el grupo en la esquina que dice el motor, el edificio se
  // dibujaba dos celdas al norte de donde esta.
  //
  // Llevaba asi desde G-06 y no se veia, porque **el pueblo entero estaba
  // desplazado igual**: lo que lo delato fue la gente, que si sale de las
  // coordenadas del motor. De ahi venian tres cosas que parecian tres fallos
  // distintos: los aldeanos cavando fuera del campo, las ventanas encendidas
  // donde no habia ventana, y la gente cruzando paredes.
  group.position.set(planned.x, 0, planned.z + planned.h);
  group.userData.buildingId = planned.id;
  let model = source;
  if (planned.ruin && planned.asset?.startsWith('ruin-')) {
    // La misma ruina sustituye parcelas de 1×1, 2×2, 3×2 o 3×3. Ajustar solo
    // su huella evita invadir al vecino; la altura del cascote se conserva.
    const bounds = new Box3().setFromObject(source);
    const size = bounds.getSize(new Vector3());
    if (size.x > 0 && size.z > 0) {
      const origin = new Group();
      origin.position.set(-bounds.min.x, -bounds.min.y, -bounds.max.z);
      origin.add(source);
      const fitted = new Group();
      fitted.scale.set(planned.w / size.x, 1, planned.h / size.z);
      fitted.add(origin);
      model = fitted;
    }
  }
  model.traverse((object) => {
    object.userData.buildingId = planned.id;
    const mesh = object as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
    if (mesh.isMesh === true) {
      // El campo ya lleva hileras facetadas como parte del recurso. Si esas
      // caras proyectan y reciben sombra a la vez, el shadow map dibuja una
      // sombra por cada diente y el sembrado parpadea al moverse el sol. Es
      // suelo trabajado, no un volumen que tenga que oscurecer a la aldea:
      // dejamos la luz directa y quitamos la auto-sombra de la parcela.
      mesh.castShadow = planned.kind !== 'field';
      mesh.receiveShadow = planned.kind !== 'field';
    }
  });
  group.add(model);
  // La hoja usa material propio; nunca se arranca del material de toda la casa.
  group.updateMatrixWorld(true);
  const doorMesh = model.getObjectByName(`${planned.asset}_door`);
  const hinge = new Group();
  if (doorMesh !== undefined) {
    const bounds = new Box3().setFromObject(doorMesh);
    hinge.name = 'DoorHinge';
    hinge.position.copy(group.worldToLocal(new Vector3(bounds.min.x, bounds.min.y, bounds.max.z)));
    group.add(hinge);
    hinge.attach(doorMesh);
  }
  const roofs = roofsOf(model);
  const snowy = new Color();
  return {
    object: group,
    face(radians: number): void {
      const dx = -planned.w / 2, dz = planned.h / 2;
      group.rotation.y = radians;
      group.position.x = planned.x + planned.w / 2 + Math.cos(radians) * dx + Math.sin(radians) * dz;
      group.position.z = planned.z + planned.h / 2 - Math.sin(radians) * dx + Math.cos(radians) * dz;
    },
    door(open: boolean, seconds: number): void {
      const target = open ? -Math.PI / 2 : 0;
      const delta = Math.max(0, Math.min(1, seconds * 4));
      hinge.rotation.y += (target - hinge.rotation.y) * delta;
    },
    weather(snow: number, colour: string): void {
      for (const roof of roofs) {
        roof.material.color.copy(roof.base).lerp(snowy.set(colour), Math.max(0, Math.min(1, snow)));
      }
    },
    dispose(): void {
      // La geometria es del recurso compartido: soltarla aqui dejaria sin casa
      // a todas las demas casas del valle. Los materiales de tejado si son
      // nuestros, porque se copiaron para poder nevar sobre ellos.
      for (const roof of roofs) roof.material.dispose();
      roofs.length = 0;
      group.clear();
    },
  };
}

function buildBuilding(planned: PlannedBuilding): BuildingModel {
  const group = new Group();
  group.name = `Building_${planned.id}`;
  // The engine's corner is the building's corner (D.4), so the group sits there
  // and the geometry is laid out over the footprint from it.
  group.position.set(planned.x, 0, planned.z);
  group.userData.buildingId = planned.id;

  const owned: Array<{ dispose(): void }> = [];

  const wallGeometry = new BoxGeometry(planned.w, planned.walls, planned.h);
  const wallMaterial = new MeshStandardMaterial({ color: planned.wallColour, roughness: 0.95 });
  const walls = new Mesh(wallGeometry, wallMaterial);
  walls.position.set(planned.w / 2, planned.walls / 2, planned.h / 2);
  walls.castShadow = true;
  walls.receiveShadow = true;
  walls.userData.buildingId = planned.id;
  group.add(walls);
  owned.push(wallGeometry, wallMaterial);

  if (planned.roofed && planned.roof > 0) {
    const geometry = roofGeometry(planned.w, planned.h, planned.roof);
    const material = new MeshStandardMaterial({ color: planned.roofColour, roughness: 0.9 });
    const roof = new Mesh(geometry, material);
    roof.position.set(0, planned.walls, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.buildingId = planned.id;
    group.add(roof);
    owned.push(geometry, material);
  }

  return {
    object: group,
    weather(): void {
      // La caja de reserva no nieva. Es geometria provisional y pintarla de
      // blanco no la haria menos provisional.
    },
    dispose(): void {
      for (const thing of owned) thing.dispose();
    },
  };
}

/**
 * The village, kept in step with the plan one building at a time.
 *
 * Nothing here rebuilds the whole village. A house that burns down becomes a
 * ruin by having its own model replaced, and its neighbours are not touched.
 */
export class Village {
  readonly group = new Group();
  private readonly models = new Map<BuildingId, BuildingModel>();
  /**
   * Tiempo real mínimo que una puerta sigue visible después de un paso.
   *
   * A ×64 la rutina doméstica puede recorrer `opening` y `entering` entre dos
   * fotogramas. Guardar el pulso aquí permite enseñar la acción sin ralentizar
   * la IA ni atarla a la velocidad del calendario.
   */
  private readonly doorHolds = new Map<BuildingId, number>();

  /**
   * `instance` da una copia del recurso que se le pida, o `undefined` si el
   * catalogo no lo tiene. Sin el, o para una familia sin recurso, se cae a la
   * caja con tejado: un valle a medio catalogar sigue siendo un valle.
   */
  constructor(private readonly instance?: (id: string) => Object3D | undefined) {
    this.group.name = 'Valley_Buildings';
  }

  /** Cuánta nieve hay puesta ahora mismo, y de qué color. */
  private snow = 0;
  private snowColour = '#f2f4f6';

  /**
   * Pone la estación sobre los tejados.
   *
   * El suelo cambiaba de estación desde G-08 y el bosque desde v3.40; los
   * tejados seguían de agosto en enero. Se llama cuando cambia el suelo, que es
   * cuando cambia la estación, y no en cada fotograma.
   */
  season(snow: number, colour: string): void {
    this.snow = snow;
    this.snowColour = colour;
    for (const model of this.models.values()) model.weather(snow, colour);
  }

  add(planned: PlannedBuilding): void {
    this.remove(planned.id);
    // Quien decide el recurso es el plan, no esto: el campo cambia con la
    // cosecha y el plan es quien sabe en que semana estamos.
    const source = planned.asset === null ? undefined : this.instance?.(planned.asset);
    const model = source === undefined ? buildBuilding(planned) : buildFromAsset(planned, source);
    this.models.set(planned.id, model);
    // Una casa levantada en enero nace nevada, no en verano hasta que cambie la
    // estación.
    model.weather(this.snow, this.snowColour);
    this.group.add(model.object);
  }

  entrances(entries: ReadonlyMap<number, number>): void {
    for (const [id, facing] of entries) this.models.get(id)?.face?.(facing);
  }

  doors(open: ReadonlySet<number>, seconds: number): void {
    for (const id of open) this.doorHolds.set(id, 0.8);
    for (const [id, model] of this.models) {
      const remaining = this.doorHolds.get(id) ?? 0;
      model.door?.(open.has(id) || remaining > 0, seconds);
      if (open.has(id) || seconds <= 0) continue;
      const next = Math.max(0, remaining - seconds);
      if (next > 0) this.doorHolds.set(id, next);
      else this.doorHolds.delete(id);
    }
  }

  remove(id: BuildingId): void {
    const model = this.models.get(id);
    if (model === undefined) return;
    this.group.remove(model.object);
    model.dispose();
    this.models.delete(id);
    this.doorHolds.delete(id);
  }

  clear(): void {
    for (const id of [...this.models.keys()]) this.remove(id);
  }

  get count(): number {
    return this.models.size;
  }

  dispose(): void {
    this.clear();
  }
}
