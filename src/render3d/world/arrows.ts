// D2b · Las flechas, pintadas. design.md §1b, fase 4; Anexo D.
//
// **Una flecha que no se ve no existe para quien juega**, y esa es la regla que
// hace que esto no sea opcional: D2 puso el vuelo, la puntería y el impacto, y
// sin esta cincuentena de líneas todo eso pasaría en un mundo invisible.
//
// El mismo patrón que `Props` y `Bubbles`: un grupo, una malla por id, se crea
// al aparecer y se retira cuando la lista deja de nombrarla. Y por la misma
// razón: una flecha no sobrevive a la jornada (E.2).
//
// **Es una primitiva y no una malla, y aquí sí es lo correcto.** Una flecha
// vista desde la cámara ortográfica de este juego es un palo de treinta
// centímetros: lo que se lee es la **trayectoria**, no el emplumado. El encargo
// de arte (`encargos-3d.md`) pide arco y lanza en la mano, que sí se ven; la
// flecha no está en esa lista a propósito.

import {
  CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3,
  type Material, type Object3D,
} from 'three';

/** Dónde está una flecha y hacia dónde va, en celdas. */
export interface ArrowSighting {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
}

/**
 * Lo que mide una flecha, en celdas.
 *
 * TUNE: 0,35 de largo y 0,05 de grueso, y **el grosor está medido en píxeles y
 * no en centímetros**. La primera versión usaba 0,012 —tres centímetros y
 * medio, el grosor de una flecha de verdad— y una toma del observatorio lo
 * desmintió: a la cámara de este juego el valle entra en 1 100 píxeles con unas
 * cuarenta celdas a la vista, o sea **veintisiete píxeles por celda**, así que
 * esa flecha medía un tercio de píxel de ancho y no se veía ni volando ni
 * clavada. Con 0,05 son quince centímetros y algo más de un píxel: un trazo que
 * se lee. El largo, 0,35, es un metro: por encima de una flecha real, por
 * debajo de una jabalina, y a esta escala son nueve píxeles contra los
 * diecisiete que mide un aldeano de alto.
 *
 * Es la misma decisión que ya tomaron los trastos (`world/props.ts`: «pequeño a
 * propósito» pero una pelota de cuarenta centímetros) y el juego entero: lo que
 * manda es lo que se lee desde arriba.
 */
const SHAFT = 0.35;
const THICK = 0.05;

/** Madera de astil, de la paleta que ya tiene la aldea (`world/props.ts`). */
const WOOD = 0x6b4a2b;

/** Por debajo de esta velocidad no se reorienta: una flecha clavada no gira. */
const STILL = 0.2;

/** El eje del cilindro de Three, para girarlo hacia donde vuela la flecha. */
const UP = new Vector3(0, 1, 0);

export class Arrows {
  readonly group = new Group();
  private readonly shown = new Map<number, Object3D>();
  private readonly geometry = new CylinderGeometry(THICK, THICK, SHAFT, 5);
  private material: Material | null = null;
  private readonly turn = new Quaternion();
  private readonly heading = new Vector3();

  constructor() {
    this.group.name = 'Valley_Arrows';
  }

  /**
   * Pone cada flecha donde está y apuntando a donde va; retira las que ya no
   * salen en la lista.
   *
   * **La altura es absoluta y no va sobre el suelo**, al contrario que un
   * trasto: la `y` sale del mundo físico (`life/physics.ts`), que tiene su
   * propio suelo en la cota cero. Sumarle el relieve haría que una flecha
   * pasara por encima de la muralla en la ladera y por debajo en el llano.
   */
  update(sightings: readonly ArrowSighting[]): void {
    const present = new Set<number>();
    for (const sighting of sightings) {
      present.add(sighting.id);
      let shaft = this.shown.get(sighting.id);
      if (shaft === undefined) {
        this.material ??= new MeshStandardMaterial({ color: WOOD, roughness: 0.8 });
        shaft = new Mesh(this.geometry, this.material);
        shaft.name = `Arrow_${sighting.id}`;
        shaft.castShadow = true;
        this.group.add(shaft);
        this.shown.set(sighting.id, shaft);
      }
      shaft.position.set(sighting.x, sighting.y, sighting.z);
      const speed = Math.hypot(sighting.vx, sighting.vy, sighting.vz);
      if (speed > STILL) {
        this.heading.set(sighting.vx / speed, sighting.vy / speed, sighting.vz / speed);
        this.turn.setFromUnitVectors(UP, this.heading);
        shaft.quaternion.copy(this.turn);
      }
    }
    for (const [id, shaft] of [...this.shown]) {
      if (present.has(id)) continue;
      this.group.remove(shaft);
      this.shown.delete(id);
    }
  }

  clear(): void {
    for (const shaft of this.shown.values()) this.group.remove(shaft);
    this.shown.clear();
  }

  dispose(): void {
    this.clear();
    this.geometry.dispose();
    this.material?.dispose();
    this.material = null;
  }
}
