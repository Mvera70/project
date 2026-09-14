// V-09b · Los trastos, pintados. design.md Anexo E.
//
// **Sin modelo todavía** (V-09 lo dejó dicho: no hay Blender en este entorno).
// Hasta que haya pelota/palo/cubo/haz por la vía de D.4, esto pinta primitivas
// de Three.js — una esfera pequeña para la pelota, un cilindro corto para lo
// demás — y nada más: ni GLB, ni textura, ni sombra propia que no dé ya el sol
// de la escena.
//
// El mismo patrón que `Bubbles` (`effects/bubbles.ts`): un grupo, un trasto
// por id, se crea al aparecer y se retira cuando `propsOf` deja de listarlo —
// que es la vez que se suelta al morir/irse el `Village` entero, porque un
// trasto no sobrevive a la jornada (E.2).

import {
  CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry,
  type BufferGeometry, type Material,
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

/** El color de cada clase, de la paleta de P1: tinta y latón, sin colores que
 *  no estén ya en la aldea. */
const COLOUR: Readonly<Record<Kind, number>> = {
  ball: 0xb5502c,
  stick: 0x6b4a2b,
  bucket: 0x4a4a46,
  bundle: 0x8a6a3c,
};

interface Shown {
  readonly mesh: Mesh;
  readonly kind: Kind;
}

export class Props {
  readonly group = new Group();
  private readonly shown = new Map<number, Shown>();
  private readonly geometry: Readonly<Record<Kind, BufferGeometry>>;
  private readonly materials = new Map<Kind, Material>();

  constructor() {
    this.group.name = 'Valley_Props';
    const ball = new SphereGeometry(BALL_RADIUS, 10, 8);
    const other = new CylinderGeometry(OTHER_RADIUS, OTHER_RADIUS, OTHER_HEIGHT, 8);
    this.geometry = { ball, stick: other, bucket: other, bundle: other };
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
      present.add(sighting.id);
      let held = this.shown.get(sighting.id);
      if (held === undefined || held.kind !== sighting.kind) {
        if (held !== undefined) this.retire(sighting.id);
        const mesh = new Mesh(this.geometry[sighting.kind], this.materialFor(sighting.kind));
        mesh.name = `Prop_${sighting.id}`;
        mesh.castShadow = true;
        this.group.add(mesh);
        held = { mesh, kind: sighting.kind };
        this.shown.set(sighting.id, held);
      }
      held.mesh.position.set(sighting.x, ground(sighting.x, sighting.z) + sighting.y, sighting.z);
    }

    for (const id of [...this.shown.keys()]) {
      if (!present.has(id)) this.retire(id);
    }
  }

  private retire(id: number): void {
    const held = this.shown.get(id);
    if (held === undefined) return;
    this.group.remove(held.mesh);
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
    for (const material of this.materials.values()) material.dispose();
  }
}
