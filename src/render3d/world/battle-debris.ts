// D6 · Tablas físicas cuando cae un portón. design.md §1b, fase 4.
//
// La física vive en `life/physics.ts`; este fichero sólo le da volumen visible
// a sus cuerpos. Mantener las dos responsabilidades separadas evita que una
// malla decida una colisión o que el render cree una segunda simulación al
// repintar el mismo fotograma.

import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Quaternion } from 'three';
import type { Physics, PhysicsBody } from '../life/physics';

// La firma se reexporta desde la única frontera de Rapier: duplicarla aquí
// separaría los cascotes de los colisionadores que realmente los sostienen.
export type { DebrisSpec } from '../life/physics';
export type DebrisPhysicsBody = Pick<PhysicsBody, 'at' | 'rotation' | 'remove'>;
export type DebrisPhysics = Pick<Physics, 'debris'>;

/** El portón viene de la jornada: su posición es el centro de su celda. */
export interface BrokenGate {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly axis: 'x' | 'z';
}

/** La misma cota que usa el suelo, los actores y Rapier al montar la escena. */
export type GroundFloor = (x: number, z: number) => number;

interface Piece {
  readonly body: DebrisPhysicsBody;
  readonly mesh: Mesh;
  readonly geometry: BoxGeometry;
}

/**
 * Escombros de una puerta rota durante una escena.
 *
 * Son seis tablas —las suficientes para leer una hoja hecha astillas desde la
 * cámara alta, pero un límite fijo para que diez lecturas de `broken` no se
 * conviertan en cientos de rígidos. Rapier las apoya sobre el suelo y los
 * obstáculos que montó al crear el mundo; aquí sólo se copian sus poses.
 */
export class BattleDebris {
  readonly group = new Group();
  private readonly gates = new Map<number, Piece[]>();
  private readonly material = new MeshStandardMaterial({ color: 0x765236, roughness: 0.95 });
  private readonly rotation = new Quaternion();
  private disposed = false;

  constructor(private readonly physics: DebrisPhysics) {
    this.group.name = 'Battle_Debris';
  }

  /**
   * Rompe una hoja una vez. Devuelve `true` sólo en la transición que creó los
   * cuerpos: la escena debe llamar desde la transición de `gate.broken`, no
   * cada fotograma mientras el asalto siga abajo.
   */
  breakGate(gate: BrokenGate, groundFloor: GroundFloor): boolean {
    if (this.disposed || this.gates.has(gate.id)) return false;
    const pieces: Piece[] = [];
    const turn = gate.axis === 'x' ? Math.PI / 2 : 0;
    const sine = Math.sin(turn);
    const cosine = Math.cos(turn);
    const localToWorld = (across: number, through: number): { x: number; z: number } => ({
      x: gate.x + across * cosine + through * sine,
      z: gate.z - across * sine + through * cosine,
    });
    const normal = { x: sine, z: cosine };

    // Dos tablones largos, dos medios y dos cascotes. La silueta conserva la
    // dirección de la hoja antes de que la gravedad termine de ordenarla.
    const boards: ReadonlyArray<readonly [number, number, number, number]> = [
      [-0.28, 0.82, 0.46, 0.075], [0.25, 0.64, 0.46, 0.075],
      [-0.12, 0.46, 0.34, 0.075], [0.34, 0.28, 0.28, 0.075],
      [-0.37, 0.14, 0.16, 0.10], [0.09, 0.10, 0.20, 0.10],
    ];
    for (let index = 0; index < boards.length; index += 1) {
      const board = boards[index];
      if (board === undefined) continue;
      const [across, height, halfLength, halfHeight] = board;
      const at = localToWorld(across, (index % 2 === 0 ? -1 : 1) * 0.03);
      // Rapier interpreta las semiextensiones en local y después aplica el
      // cuaternión. La tabla siempre nace larga en X local; intercambiarlas y
      // rotarla a la vez sería darle dos giros y dejarla cruzada al portón.
      const halfExtents = { x: halfLength, y: halfHeight, z: 0.07 };
      const rotation = { x: 0, y: Math.sin(turn / 2), z: 0, w: Math.cos(turn / 2) };
      const body = this.physics.debris({
        id: `gate-${gate.id}-board-${index}`,
        // `height` es relativo a la hoja de un recurso ajustado a 1×1; sumar
        // la cota real es lo que impide que las tablas nazcan bajo una ladera.
        at: { x: at.x, y: groundFloor(at.x, at.z) + height, z: at.z },
        halfExtents,
        rotation,
        // El impulso abre la hoja, pero no la lanza al otro lado del paso: lo
        // bastante para caer en el umbral y contra las jambas que conoce Rapier.
        velocity: {
          x: normal.x * (index % 2 === 0 ? -0.22 : 0.22) + (index - 2.5) * 0.10 * cosine,
          y: 0.4 + (index % 3) * 0.12,
          z: normal.z * (index % 2 === 0 ? -0.22 : 0.22) - (index - 2.5) * 0.10 * sine,
        },
        angularVelocity: { x: index % 2 === 0 ? 2 : -2, y: (index - 2.5) * 0.5, z: index % 3 - 1 },
        density: 0.65,
        // TUNE: dos minutos escénicos. El límite duro está en seis cuerpos por
        // portón; este vencimiento libera Rapier incluso si la escena se queda
        // abierta después de que el asalto haya acabado.
        ttlSteps: 3600,
      });
      const geometry = new BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
      const mesh = new Mesh(geometry, this.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.kind = 'gate-debris';
      pieces.push({ body, mesh, geometry });
      this.group.add(mesh);
    }
    this.gates.set(gate.id, pieces);
    this.step();
    return true;
  }

  /** Copia el mundo Rapier después de su paso fijo; no avanza física propia. */
  step(): void {
    if (this.disposed) return;
    for (const pieces of this.gates.values()) {
      for (const piece of pieces) {
        piece.mesh.position.set(piece.body.at.x, piece.body.at.y, piece.body.at.z);
        piece.mesh.quaternion.copy(this.rotation.set(
          piece.body.rotation.x, piece.body.rotation.y, piece.body.rotation.z, piece.body.rotation.w,
        ));
      }
    }
  }

  /** Cuántas tablas siguen perteneciendo a esta escena, para pruebas y sonda. */
  get count(): number {
    let total = 0;
    for (const pieces of this.gates.values()) total += pieces.length;
    return total;
  }

  /** Libera cuerpos y geometrías; es seguro llamarlo más de una vez. */
  clear(): void {
    for (const pieces of this.gates.values()) {
      for (const piece of pieces) {
        piece.body.remove();
        piece.geometry.dispose();
        this.group.remove(piece.mesh);
      }
    }
    this.gates.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.clear();
    this.material.dispose();
    this.group.clear();
    this.disposed = true;
  }
}
