// G-06 · Buildings, added and removed one at a time. design.md D.6, D.8.
//
// Los edificios publicados usan su GLB. La caja con tejado sigue siendo el
// respaldo de tipos pendientes, como la sala del rey, y de bibliotecas parciales.
//
// D.8 conserva el respaldo para que una biblioteca incompleta no deje huecos
// invisibles ni bloquee una partida mientras llega un recurso.

import {
  Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3,
  type Material, type Object3D,
} from 'three';
import type { BuildingId, BuildingKind } from '@engine/state';
import type { PlannedBuilding } from './plan';
import type { ElevatedRingVariant } from '@derive/elevated-ring';
import { DEFENCE_DIAGONALS } from './defences';
import { buildDefence } from './defences';
import { varyHouse } from './house-variation';
import { buildRampart, rampartTower, type RampartModel } from './rampart-mesh';
import type { RampartLayout } from './rampart';

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
  /**
   * D6 · El portón que cedió deja de cerrar visualmente el paso.
   *
   * Es una marca de esta escena, no una ruina del motor: el parte de batalla
   * decide después qué le ocurre a la partida. Por eso una escena nueva nace
   * otra vez con su hoja puesta.
   */
  break?(): void;
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
  // G-24 · el portón propio, con la hoja `gate_door` que `door()` abre desde
  // su pivote exportado. El obstáculo lógico sigue siendo la celda del motor.
  gate: 'gate',
  wall: 'wall',
  watchtower: 'watchtower',
  bastion: 'bastion',
  grave_yard: 'grave-yard',
  stone_house: 'stone-house',
  granary: 'granary',
  mill: 'mill',
  smithy: 'smithy',
  chapel: 'chapel',
  church: 'church',
  well: 'well',
  // K-4 · la sala del rey. **Todavía sin malla**: el encargo de arte está en
  // `docs/historico/plan-rey.md` §8, y hasta que exista el render la dibuja con su propio
  // aspecto —más alta que una casa y con el tejado burdeos del jefe— por el
  // mismo camino que el barril y el arado.
  hall: 'hall',
};

/** Sólo el tablero recto de E3b.1 tiene recurso publicado y validado. */
export const ELEVATED_RING_ASSETS: Partial<Readonly<Record<ElevatedRingVariant, string>>> = {
  straight: 'e3b-walkway-candidate',
};

/**
 * Conserva el pivote y la hoja de un portón sin copiar su fábrica estática.
 * La unión de bastión y portón posee ya jambas, dintel y tablero propios; si
 * se deja también el marco antiguo aparecen piedras y suelos superpuestos.
 */
export function gateLeafOnly(source: Object3D): Object3D {
  const model = source.clone(true);
  const door = model.getObjectByName('gate_door');
  if (door === undefined) throw new Error('Gate asset has no gate_door pivot');
  const keep = new Set<Object3D>();
  for (let node: Object3D | null = door; node !== null; node = node.parent) keep.add(node);
  const prune = (node: Object3D): void => {
    for (const child of [...node.children]) {
      if (keep.has(child) || node === door || child.parent === door) prune(child);
      else node.remove(child);
    }
  };
  prune(model);
  return model;
}

/**
 * IA-fields · La parcela según su momento del año (`world/crops.ts`).
 *
 * Las plantas del recurso son las mallas que no son tierra (`crop`, `leaf`,
 * `heart`, `stalk`): crecen en altura desde el suelo con `fieldGrowth`, y al
 * arar no hay ninguna. La tierra se oscurece recién abonada o arada, y el
 * cereal maduro se dora. Los materiales se copian: los de la biblioteca son de
 * todas las parcelas del valle.
 */
const FIELD_TINT = {
  /** Estiércol recién echado: tierra casi negra. */
  manure: new Color('#5d4431'),
  /** Tierra recién vuelta, húmeda. */
  plough: new Color('#6e5038'),
  /** El cereal hecho, del verde al oro. */
  ripe: new Color('#c9a64a'),
} as const;

function dressField(model: Object3D, planned: PlannedBuilding): Material[] {
  const owned: Material[] = [];
  const phase = planned.fieldPhase;
  const growth = planned.fieldGrowth ?? 1;
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh !== true || Array.isArray(mesh.material)) return;
    const material = mesh.material as MeshStandardMaterial;
    const soil = material.name.includes('soil');
    if (soil) {
      if (phase === 'manure' || phase === 'plough' || phase === 'sow') {
        const copy = material.clone(); owned.push(copy);
        copy.color.copy(FIELD_TINT[phase === 'manure' ? 'manure' : 'plough']);
        mesh.material = copy;
      }
      return;
    }
    // Brote a ras de suelo al sembrar, y de ahí hasta su altura.
    mesh.visible = phase !== 'plough' && growth > 0;
    mesh.scale.y *= Math.max(0.08, growth);
    if (phase === 'ripe' && planned.asset === 'field' && material.name.includes('crop')) {
      const copy = material.clone(); owned.push(copy);
      copy.color.lerp(FIELD_TINT.ripe, 0.75);
      mesh.material = copy;
    }
  });
  return owned;
}

/**
 * Un edificio con su recurso de verdad, colocado sobre su huella.
 *
 * La receta se escribe con la esquina en el origen y la huella hacia +X y +Z,
 * igual que el motor guarda la suya (D.4), asi que colocar es poner el grupo en
 * la esquina y nada mas. Una ruina nunca usa recurso: §7.4 la deja en el mapa y
 * lo que tiene que leerse es que ya no es una casa.
 */
export function buildFromAsset(planned: PlannedBuilding, source: Object3D, walkwayEntry?: Object3D, walkwayStraight?: Object3D): BuildingModel {
  // El portón aprobado es una pieza completa, con la hoja `gate_door` separada.
  // No puede pasar por el ensamblador de tramos: aquél sólo toma su material y
  // lo convertía de nuevo en una entrada provisional sin bisagra.
  if (!planned.ruin && planned.connections !== undefined && planned.kind !== 'gate' && planned.bastionAccess === undefined) {
    return buildDefence(planned, source);
  }
  const disposeVariation = !planned.ruin && planned.variant !== undefined
    && (planned.kind === 'house' || planned.kind === 'stone_house')
    ? varyHouse(source, planned.variant) : undefined;
  const group = new Group();
  group.name = `Building_${planned.id}`;
  const gateJointGeometries: BoxGeometry[] = [];
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
  // Los recursos anteriores salen del exportador con la huella en Z negativa.
  // G-26 es la excepción deliberada: su caja local es 0..1 en X/Z, así que
  // sumarle la altura la echaría una celda al sur. No se normaliza el catálogo
  // entero por una pieza nueva; se conserva la colocación validada de cada una.
  group.position.set(planned.x, 0,
    planned.asset === 'bastion' || planned.asset === 'bastion-access-candidate' || planned.asset === 'e3b-bastion-joint-candidate'
      ? planned.z : planned.z + planned.h);
  group.userData.buildingId = planned.id;
  let model = source;
  // E3b.3 · Bajo el adarve la torre pierde sus almenas propias; el adarve
  // dibuja las suyas sobre el borde real del suelo, bocas incluidas.
  const tower = planned.rampartShift !== undefined && planned.kind === 'bastion' && !planned.ruin
    ? rampartTower(source, planned.bastionAccess === undefined ? 0 : planned.rampartShift) : undefined;
  if (tower !== undefined) model = tower.object;
  const fieldMaterials = planned.kind === 'field' && !planned.ruin ? dressField(model, planned) : [];
  if (planned.rubbleStage === 'settling') model.scale.y *= 0.55;
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
  for (const painted of [model, walkwayEntry, walkwayStraight]) {
    if (painted === undefined) continue;
    painted.traverse((object) => {
      object.userData.buildingId = planned.id;
      const mesh = object as Object3D & {
        isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean; material?: Material | Material[];
      };
      if (mesh.isMesh === true) {
        // El campo ya lleva hileras facetadas como parte del recurso. Si esas
        // caras proyectan y reciben sombra a la vez, el shadow map dibuja una
        // sombra por cada diente y el sembrado parpadea al moverse el sol. Es
        // suelo trabajado, no un volumen que tenga que oscurecer a la aldea:
        // dejamos la luz directa y quitamos la auto-sombra de la parcela.
        mesh.castShadow = planned.kind !== 'field';
        // Los listones finos del tejado se auto-sombrean con el mapa solar y
        // producen bandas que saltan al girar el sol. El tejado sigue echando
        // sombra al suelo; sólo deja de recibir la suya sobre cada listón.
        const roof = mesh.material !== undefined && !Array.isArray(mesh.material)
          && mesh.material.name.includes('roof');
        mesh.receiveShadow = planned.kind !== 'field' && !roof;
      }
    });
  }
  if (planned.kind === 'gate' && planned.gate === 'x') {
    // La receta abre en su eje base. `defences.ts` ya giraba los portones que
    // dejan pasar por X; se conserva esa convención, pero alrededor del centro
    // de la celda: girar el grupo de la esquina echaría el marco al vecino.
    const turn = new Group();
    turn.position.set(0.5, 0, -0.5);
    turn.rotation.y = Math.PI / 2;
    model.position.set(-0.5, 0, 0.5);
    turn.add(model);
    group.add(turn);
  } else {
  if (planned.bastionAccess !== undefined) {
    // La receta abre hacia +Z local. Girar el modelo entero alrededor del
    // centro de la celda conserva la torre sobre su parcela al cambiar de cara.
    const anchor = new Group();
    anchor.position.set(0.5, 0, 0.5);
    anchor.rotation.y = Math.atan2(planned.bastionAccess.x, planned.bastionAccess.z);
    model.position.set(-0.5, 0, -0.5);
    anchor.add(model);
    if (planned.bastionWalkway !== undefined && walkwayEntry !== undefined) {
      // Las dos recetas comparten origen y giro: una celda en +X local hace
      // tocar sus suelos en las cuatro caras sin inventar una transformación.
      // `model` empieza a -0,5 dentro del anclaje; conservar esa base y sumar
      // una celda deja el borde de entrada exactamente en el borde del bastión.
      walkwayEntry.position.set(0.5, 0, -0.5);
      anchor.add(walkwayEntry);
      if (walkwayStraight !== undefined) {
        walkwayStraight.position.set(1.5, 0, -0.5);
        anchor.add(walkwayStraight);
      }
    }
    group.add(anchor);
  } else group.add(model);
  }
  if (planned.kind === 'gate' && planned.asset === 'gate' && planned.gateCornerLinks !== undefined) {
    let stone: Material | undefined;
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      stone ??= materials.find((material) => material.name.includes('stone'));
    });
    if (stone !== undefined) {
      for (const direction of DEFENCE_DIAGONALS) {
        if ((planned.gateCornerLinks & direction.bit) === 0) continue;
        // The half-diagonal stops short of the jamb. This short stone joint
        // closes that seam outside the wide gate candidate's 0.84 passage.
        const passageAlongZ = planned.gate !== 'x';
        const geometry = new BoxGeometry(passageAlongZ ? .16 : .28, .72, passageAlongZ ? .28 : .16);
        gateJointGeometries.push(geometry);
        const joint = new Mesh(geometry, stone);
        joint.name = `GateCornerJoint_${direction.bit}`;
        joint.position.set(passageAlongZ ? (direction.x > 0 ? 1 : 0)
          : (direction.x > 0 ? .78 : .22), .36,
        passageAlongZ ? (direction.z > 0 ? -.22 : -.78)
          : (direction.z > 0 ? 0 : -1));
        joint.castShadow = true;
        joint.receiveShadow = true;
        joint.userData.buildingId = planned.id;
        group.add(joint);
      }
    }
  }
  // La hoja usa material propio; nunca se arranca del material de toda la casa.
  group.updateMatrixWorld(true);
  const doorMesh = model.getObjectByName(planned.kind === 'gate' ? 'gate_door' : `${planned.asset}_door`);
  const hinge = new Group();
  if (doorMesh !== undefined) {
    hinge.name = 'DoorHinge';
    // El portón G-24 trae un empty `gate_door` justo en el gozne. La caja de
    // sus tablas no es un pivote: usarla lo desplazaba unos centímetros al
    // abrir. Las puertas antiguas no tienen ese contrato y conservan su borde.
    if (planned.kind === 'gate') {
      hinge.position.copy(group.worldToLocal(doorMesh.getWorldPosition(new Vector3())));
    } else {
      const bounds = new Box3().setFromObject(doorMesh);
      hinge.position.copy(group.worldToLocal(new Vector3(bounds.min.x, bounds.min.y, bounds.max.z)));
    }
    group.add(hinge);
    hinge.attach(doorMesh);
  }
  const roofs = roofsOf(model);
  const snowy = new Color();
  let broken = false;
  return {
    object: group,
    face(radians: number): void {
      const dx = -planned.w / 2, dz = planned.h / 2;
      group.rotation.y = radians;
      group.position.x = planned.x + planned.w / 2 + Math.cos(radians) * dx + Math.sin(radians) * dz;
      group.position.z = planned.z + planned.h / 2 - Math.sin(radians) * dx + Math.cos(radians) * dz;
    },
    door(open: boolean, seconds: number): void {
      if (broken) return;
      const target = open ? -Math.PI / 2 : 0;
      const delta = Math.max(0, Math.min(1, seconds * 4));
      hinge.rotation.y += (target - hinge.rotation.y) * delta;
    },
    break(): void {
      broken = true;
      // La hoja sale como tablas físicas en `battle-debris.ts`. Conservar el
      // marco deja que el boquete se lea como puerta rota, no como un tramo de
      // muralla que desapareció por un fallo de reconstrucción.
      if (doorMesh !== undefined) hinge.visible = false;
      else model.visible = false;
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
      for (const geometry of gateJointGeometries) geometry.dispose();
      roofs.length = 0;
      disposeVariation?.();
      tower?.dispose();
      for (const material of fieldMaterials) material.dispose();
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
    roof.receiveShadow = false;
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
    break(): void {
      // La caja es sólo el respaldo de un catálogo incompleto; si la escena
      // llega aquí, mostrarla entera tras los cascotes haría parecer intacto
      // el portón. El recurso publicado conserva el marco por la rama de
      // arriba.
      group.visible = false;
    },
    dispose(): void {
      for (const thing of owned) thing.dispose();
    },
  };
}

/** Una cimentación baja conserva legible el solar bloqueado sin cascotes eternos. */
function buildRuinScar(planned: PlannedBuilding): BuildingModel {
  const group = new Group();
  group.name = `Building_${planned.id}`;
  group.position.set(planned.x, 0, planned.z);
  group.userData.buildingId = planned.id;
  const edge = Math.min(0.13, planned.w / 5, planned.h / 5);
  const positions: number[] = [];
  const addStrip = (x0: number, z0: number, x1: number, z1: number): void => {
    const y = 0.025;
    positions.push(
      x0, y, z0, x0, y, z1, x1, y, z1,
      x0, y, z0, x1, y, z1, x1, y, z0,
    );
  };
  addStrip(0, 0, planned.w, edge);
  addStrip(0, planned.h - edge, planned.w, planned.h);
  addStrip(0, edge, edge, planned.h - edge);
  addStrip(planned.w - edge, edge, planned.w, planned.h - edge);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({
    color: planned.kind === 'stone_house' ? '#88847b' : '#504d46',
    roughness: 1, side: DoubleSide,
  });
  const outline = new Mesh(geometry, material);
  outline.name = 'ClearedFoundation';
  outline.receiveShadow = true;
  outline.userData.buildingId = planned.id;
  group.add(outline);
  return { object: group, weather(): void {}, dispose(): void { geometry.dispose(); material.dispose(); } };
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
  private readonly gateRecoils = new Map<BuildingId, { x: number; z: number; axis: 'x' | 'z'; object: Group }>();
  /** Portones que han cedido en esta escena efímera. */
  private readonly brokenGates = new Set<BuildingId>();
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

  private rampartModel: RampartModel | null = null;

  /**
   * E3b.3 · El adarve generado, con la piedra del muro publicado.
   *
   * Sin recurso de muro no hay piedra que prestarle, y el adarve no se dibuja:
   * la ruta del guardia depende del plan, no de esta malla.
   */
  rampart(layout: RampartLayout | null): void {
    if (this.rampartModel !== null) {
      this.group.remove(this.rampartModel.object);
      this.rampartModel.dispose();
      this.rampartModel = null;
    }
    if (layout === null) return;
    let stone: Material | undefined;
    this.instance?.('wall')?.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material as Material[] : [node.material as Material];
      stone ??= materials.find((material) => material.name.includes('stone'));
    });
    if (stone === undefined) return;
    this.rampartModel = buildRampart(layout, stone);
    this.group.add(this.rampartModel.object);
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
    // `add` reemplaza una malla durante la misma escena (nieve, ruina, cambio
    // de recurso). No puede resucitar una hoja que ya rompió la física. Sólo
    // `clear`, al abrir otra escena, olvida esa marca efímera.
    this.remove(planned.id, false);
    // Quien decide el recurso es el plan, no esto: el campo cambia con la
    // cosecha y el plan es quien sabe en que semana estamos.
    const source = planned.asset === null ? undefined : this.instance?.(planned.asset);
    const entry = planned.bastionWalkway === undefined ? undefined : this.instance?.('e3b-walkway-entry-candidate');
    const straight = planned.bastionWalkway === undefined ? undefined : this.instance?.(ELEVATED_RING_ASSETS.straight!);
    // La junta sólo existe completa. Con una biblioteca parcial se conserva el
    // acceso E3a si está cargado: perder el segundo recurso no borra una
    // escalera que el estado todavía puede mostrar. Sólo G-27 queda después.
    const accessFallback = planned.bastionWalkway === undefined ? undefined : this.instance?.('bastion-access-candidate');
    const baseFallback = planned.bastionWalkway === undefined ? undefined : this.instance?.('bastion');
    const accessFallbackPlan = { ...planned };
    delete accessFallbackPlan.bastionWalkway;
    accessFallbackPlan.asset = 'bastion-access-candidate';
    const baseFallbackPlan = { ...accessFallbackPlan };
    delete baseFallbackPlan.bastionAccess;
    baseFallbackPlan.asset = 'bastion';
    const model = planned.rubbleStage === 'scar' ? buildRuinScar(planned)
      : planned.bastionWalkway !== undefined && (source === undefined || entry === undefined || straight === undefined)
      ? accessFallback === undefined
        ? baseFallback === undefined ? buildBuilding(baseFallbackPlan) : buildFromAsset(baseFallbackPlan, baseFallback)
        : buildFromAsset(accessFallbackPlan, accessFallback)
      : source === undefined ? buildBuilding(planned) : buildFromAsset(planned, source, entry, straight);
    this.models.set(planned.id, model);
    if (planned.kind === 'gate' && !planned.ruin) {
      // Capa visual local: no mueve la huella ni el obstáculo. Si existe hoja,
      // sólo ella acusa; mientras E3 no la entregue, acusa la malla prestada.
      const leaf = model.object.getObjectByName('DoorHinge');
      const parent = leaf?.parent ?? model.object;
      const parts = leaf === undefined ? [...parent.children] : [leaf];
      const recoil = new Group(); recoil.name = 'GateRecoil';
      parent.add(recoil);
      for (const part of parts) recoil.add(part);
      this.gateRecoils.set(planned.id, { x: planned.x + 0.5, z: planned.z + 0.5,
        axis: planned.gate ?? 'z', object: recoil });
    }
    // Una casa levantada en enero nace nevada, no en verano hasta que cambie la
    // estación.
    model.weather(this.snow, this.snowColour);
    if (planned.kind === 'gate' && this.brokenGates.has(planned.id)) model.break?.();
    this.group.add(model.object);
  }

  /**
   * D6 · Quita la hoja una sola vez cuando la física abre el boquete.
   *
   * El booleano distingue la transición de las lecturas repetidas de
   * `gate.broken`; el renderer puede usarlo para no crear dos tandas de tablas
   * en el mismo paso ni al repintar el mismo fotograma.
   */
  breakGate(id: BuildingId): boolean {
    if (this.brokenGates.has(id)) return false;
    const model = this.models.get(id);
    if (model === undefined) return false;
    this.brokenGates.add(id);
    model.break?.();
    // Conservamos su pose aunque la hoja ya esté oculta. La escena sigue
    // leyendo `gate.broken` durante muchos fotogramas: quitar esta entrada
    // haría que una búsqueda por posición escogiera el siguiente portón del
    // anillo y lo rompiera por error.
    return true;
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

  /** Transformaciones reales para contrastar el píxel con el contacto en la traza. */
  gatePoses(): { id: number; x: number; z: number; axis: 'x' | 'z'; offset: number[]; rotation: number[] }[] {
    return [...this.gateRecoils].map(([id, gate]) => ({ id, x: gate.x, z: gate.z,
      axis: gate.axis, offset: gate.object.position.toArray(),
      rotation: [gate.object.rotation.x, gate.object.rotation.y, gate.object.rotation.z] }));
  }

  /** E1 · Sacudida absoluta desde el contacto, sin acumulación entre pintados. */
  gateImpact(at: { readonly x: number; readonly z: number } | null, elapsed: number | null): void {
    for (const gate of this.gateRecoils.values()) {
      const active = at !== null && at.x === gate.x && at.z === gate.z
        && elapsed !== null && elapsed >= 0 && elapsed < 0.45;
      // Impulso en el mismo fotograma, dos rebotes decrecientes y reposo exacto.
      const pulse = active ? Math.cos(elapsed * Math.PI * 10) * (1 - elapsed / 0.45) ** 2 : 0;
      gate.object.position.set(gate.axis === 'x' ? pulse * 0.08 : 0, 0,
        gate.axis === 'z' ? pulse * 0.08 : 0);
      gate.object.rotation.set(gate.axis === 'z' ? pulse * 0.08 : 0, 0,
        gate.axis === 'x' ? -pulse * 0.08 : 0);
    }
  }

  remove(id: BuildingId, forgetBroken = true): void {
    const model = this.models.get(id);
    if (model === undefined) return;
    this.group.remove(model.object);
    model.dispose();
    this.models.delete(id);
    this.gateRecoils.delete(id);
    this.doorHolds.delete(id);
    if (forgetBroken) this.brokenGates.delete(id);
  }

  clear(): void {
    this.rampart(null);
    for (const id of [...this.models.keys()]) this.remove(id);
    // Una jornada/escena nueva no hereda física efímera de la anterior. La
    // simulación decide de nuevo si hay portón y si llega a romperse.
    this.brokenGates.clear();
  }

  get count(): number {
    return this.models.size;
  }

  dispose(): void {
    this.clear();
  }
}
