// V-09b · Los trastos, pintados. design.md Anexo E.
//
// Pelota, palo y cubo conservan las primitivas pequeñas de V-09. El haz ya tiene
// recurso publicado: cuando queda en el suelo se usa su GLB; mientras alguien
// lo lleva lo pinta `Cast`, unido al hueso de la mano.
//
// El mismo patrón que `Bubbles` (`effects/bubbles.ts`): un grupo, un trasto
// por id, se crea al aparecer y se retira cuando `propsOf` deja de listarlo —
// que es la vez que se suelta al morir/irse el `Village` entero, porque un
// trasto no sobrevive a la jornada (E.2).

import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry,
  type BufferGeometry, type Material, type Object3D,
} from 'three';
import type { PropSighting } from '../life/cast';

type Kind = PropSighting['kind'];

/**
 * El tamaño de cada trasto, en celdas.
 *
 * TUNE: pequeño a propósito. El aldeano mide 0,65 (D.6.2, `world/cast.ts`);
 * un trasto que compitiera en tamaño con la persona que lo lleva se leería
 * como un segundo actor, y esto es un objeto que se coge con una mano.
 */
const BALL_RADIUS = 0.14;
const OTHER_RADIUS = 0.11;
const OTHER_HEIGHT = 0.28;

/**
 * **El barril y el arado son de otra escala, y a propósito.** M-3: son lo que
 * el jugador metió en el valle, no algo que alguien se echa al hombro, así que
 * se leen desde lejos. Una celda de este valle son unos tres metros (D.6.2), de
 * donde salen las dos medidas del encargo de arte (`docs/encargos/encargo-arado.md`):
 * el barril mide 0,9 m de alto —0,3 celdas— y el arado 2,4 × 0,9 × 1,0 m, que
 * son 0,8 × 0,3 × 0,33.
 *
 * Son primitivas mientras no haya malla, igual que la pelota y el cubo llevan
 * siendo una esfera y un cilindro desde V-09: en cuanto `barrel.glb` y
 * `plough.glb` estén publicados, `instance` los devuelve y esto no se usa.
 */
const BARREL_RADIUS = 0.13;
const BARREL_HEIGHT = 0.3;
const PLOUGH_LENGTH = 0.8;
const PLOUGH_WIDTH = 0.3;
const PLOUGH_HEIGHT = 0.33;

/** El color de cada clase, de la paleta de P1: tinta y latón, sin colores que
 *  no estén ya en la aldea. */
const COLOUR: Readonly<Record<Kind, number>> = {
  ball: 0xb5502c,
  stick: 0x6b4a2b,
  bucket: 0x4a4a46,
  bundle: 0x8a6a3c,
  stone: 0x8f8a84,
  grain: 0xc89a48,
  // Roble y hierro: las dos maderas ya están en la aldea y el hierro es el de
  // la herrería.
  barrel: 0x7a5630,
  plough: 0x6b4a2b,
};

/** El hierro de la vertedera del arado, para que no sea un bulto de madera. */
const IRON = 0x53565a;

interface Shown {
  readonly object: Object3D;
  readonly kind: Kind;
}

export class Props {
  readonly group = new Group();
  private readonly shown = new Map<number, Shown>();
  private readonly geometry: Readonly<Record<Kind, BufferGeometry>>;
  private readonly materials = new Map<Kind, Material>();
  /** El hierro del arado de apaño: no es de ninguna clase de trasto, así que no
   *  cabe en el mapa de arriba. Se crea la primera vez que hace falta. */
  private iron: Material | null = null;
  /** Lo que el arado de apaño crea por su cuenta, para poder liberarlo. */
  private readonly extra: BufferGeometry[] = [];

  constructor(private readonly instance?: (id: string) => Object3D | undefined) {
    this.group.name = 'Valley_Props';
    const ball = new SphereGeometry(BALL_RADIUS, 10, 8);
    const other = new CylinderGeometry(OTHER_RADIUS, OTHER_RADIUS, OTHER_HEIGHT, 8);
    const barrel = new CylinderGeometry(BARREL_RADIUS, BARREL_RADIUS * 0.88, BARREL_HEIGHT, 10);
    const plough = new BoxGeometry(PLOUGH_LENGTH, PLOUGH_HEIGHT * 0.34, PLOUGH_WIDTH);
    this.geometry = {
      ball, stick: other, bucket: other, bundle: other, stone: other, grain: other,
      barrel, plough,
    };
  }

  private materialFor(kind: Kind): Material {
    let material = this.materials.get(kind);
    if (material === undefined) {
      material = new MeshStandardMaterial({ color: COLOUR[kind], roughness: 0.85 });
      this.materials.set(kind, material);
    }
    return material;
  }

  /**
   * Pone cada trasto donde `propsOf` dice que está ahora, y retira el que ya
   * no sale en la lista — el mismo trato que `Cast.show` da a la gente.
   *
   * `ground` da la cota del suelo en cada punto, igual que `Cast.standOn`:
   * `sighting.y` es la altura *sobre* ese suelo (`props.ts`, `Prop.y`: cero es
   * el suelo, por encima va por el aire o en la mano), así que la posición
   * final es siempre la suma de las dos.
   */
  update(sightings: readonly PropSighting[], ground: (x: number, z: number) => number): void {
    const present = new Set<number>();
    for (const sighting of sightings) {
      // `Cast` ya cuelga el GLB del haz de la mano durante `carry_walk`.
      // Pintarlo también en sus coordenadas físicas produciría dos cargas.
      if ((sighting.kind === 'bundle' || sighting.kind === 'stone' || sighting.kind === 'grain')
        && sighting.heldBy !== null) continue;
      present.add(sighting.id);
      let held = this.shown.get(sighting.id);
      if (held === undefined || held.kind !== sighting.kind) {
        if (held !== undefined) this.retire(sighting.id);
        const model = sighting.kind === 'bundle' || sighting.kind === 'grain' ? this.instance?.('bundle')
          : sighting.kind === 'stone' ? this.instance?.('rock')
            // M-3 · lo que el jugador dio. Los dos piden su propia malla y, hasta
            // que exista, se apañan con primitivas: el arado ya tiene GLB;
            // el barril sigue sin recurso publicado.
            : sighting.kind === 'barrel' ? this.instance?.('barrel')
              : sighting.kind === 'plough' ? this.instance?.('plough') : undefined;
        const object = model
          ?? (sighting.kind === 'plough' ? this.ploughStandIn()
            : new Mesh(this.geometry[sighting.kind], this.materialFor(sighting.kind)));
        object.name = `Prop_${sighting.id}`;
        object.traverse(child => { child.castShadow = true; });
        // Un barril de pie se apoya en el suelo, no se entierra hasta la mitad:
        // el cilindro tiene el origen en su centro.
        if (model === undefined && sighting.kind === 'barrel') {
          object.userData.groundLift = BARREL_HEIGHT / 2;
        }
        if (model !== undefined && (sighting.kind === 'barrel' || sighting.kind === 'plough')) {
          // Las mallas del encargo vienen ya en unidades de celda, con el origen
          // centrado y en el suelo (`docs/encargos/encargo-arado.md`): ni escala ni
          // levante, o se dibujarían del tamaño de una casa.
          object.userData.groundLift = 0;
        } else if (model !== undefined) {
          // El recurso cuelga hacia abajo cuando va en la mano. En tierra se
          // tumba, se hace menor que una carga completa y se levanta medio
          // grosor para no enterrarlo.
          if (sighting.kind === 'bundle' || sighting.kind === 'grain') object.rotation.x = Math.PI / 2;
          object.scale.setScalar(sighting.kind === 'stone' ? 0.24 : sighting.kind === 'grain' ? 0.5 : 0.65);
          object.userData.groundLift = sighting.kind === 'stone' ? 0.08 : 0.11;
        }
        this.group.add(object);
        held = { object, kind: sighting.kind };
        this.shown.set(sighting.id, held);
      }
      const lift = typeof held.object.userData.groundLift === 'number'
        ? held.object.userData.groundLift : 0;
      held.object.position.set(sighting.x, ground(sighting.x, sighting.z) + sighting.y + lift, sighting.z);
    }

    for (const id of [...this.shown.keys()]) {
      if (!present.has(id)) this.retire(id);
    }
  }

  /**
   * Un arado de apaño, mientras no haya malla: el cuerpo tumbado, la vertedera
   * de hierro y la mancera levantada. Tres primitivas y ninguna es un adorno —
   * son las tres piezas por las que se reconoce un arado de vertedera de lejos,
   * que es la distancia a la que se mira este juego.
   *
   * Las medidas son las del encargo (`docs/encargos/encargo-arado.md`) pasadas a celdas,
   * así que el día que llegue el GLB no cambia de tamaño en pantalla.
   */
  private ploughStandIn(): Object3D {
    const group = new Group();
    const wood = this.materialFor('plough');
    const body = new Mesh(this.geometry.plough, wood);
    body.position.y = PLOUGH_HEIGHT * 0.17;
    group.add(body);

    this.iron ??= new MeshStandardMaterial({ color: IRON, roughness: 0.5, metalness: 0.35 });
    const iron: Material = this.iron;
    const shareShape = new BoxGeometry(
      PLOUGH_LENGTH * 0.3, PLOUGH_HEIGHT * 0.2, PLOUGH_WIDTH * 0.8,
    );
    this.extra.push(shareShape);
    const share = new Mesh(shareShape, iron);
    share.position.set(-PLOUGH_LENGTH * 0.42, PLOUGH_HEIGHT * 0.1, 0);
    share.rotation.z = 0.26;
    group.add(share);

    const handleShape = new CylinderGeometry(
      PLOUGH_WIDTH * 0.07, PLOUGH_WIDTH * 0.07, PLOUGH_HEIGHT, 6,
    );
    this.extra.push(handleShape);
    const handle = new Mesh(handleShape, wood);
    handle.position.set(PLOUGH_LENGTH * 0.34, PLOUGH_HEIGHT * 0.5, 0);
    handle.rotation.z = -0.3;
    group.add(handle);
    return group;
  }

  private retire(id: number): void {
    const held = this.shown.get(id);
    if (held === undefined) return;
    this.group.remove(held.object);
    this.shown.delete(id);
  }

  get count(): number {
    return this.shown.size;
  }

  clear(): void {
    for (const id of [...this.shown.keys()]) this.retire(id);
  }

  dispose(): void {
    this.clear();
    // `stick`/`bucket`/`bundle` comparten una geometría: se libera una vez,
    // no tres.
    for (const geometry of new Set(Object.values(this.geometry))) geometry.dispose();
    for (const geometry of this.extra) geometry.dispose();
    this.extra.length = 0;
    for (const material of this.materials.values()) material.dispose();
    this.iron?.dispose();
    this.iron = null;
  }
}
