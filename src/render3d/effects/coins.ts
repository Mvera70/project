// El valle más vivo (26 sep 2026) · Las monedas de un trato, de mano a mano.
//
// «No se ve a nadie pagar: no hay moneda que pase de mano.» Cuando un trato
// cambia algo de dueño (`Village.payments`: el buhonero paga cada bulto que le
// traen; al tratante y al salinero les paga un vecino), cuatro monedas saltan
// una tras otra en arco de la mano del que paga a la del que cobra, girando.
// Decorado: no toca el estado ni tira dados.

import { CylinderGeometry, DynamicDrawUsage, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { LIFE_STEP } from '../life/clock';
import type { Payment } from '../life/village';

/** Cuántas monedas por pago, cada cuánto sale una y lo que tarda en llegar, en segundos. */
const COINS = 4;
const GAP = 0.09;
const FLIGHT = 0.55;
/** A qué altura va la mano y cuánto sube el arco, en celdas. */
const HAND = 0.3;
const ARC = 0.25;
/** Cuántos pagos a la vez se dibujan como mucho. */
const MOST = 6;

export interface Coins {
  readonly mesh: InstancedMesh;
  /** Cuántas monedas hay en el aire ahora (para la traza). */
  readonly flying: number;
  step(payments: readonly Payment[], steps: number, ground: (x: number, z: number) => number): void;
  dispose(): void;
}

export function createCoins(): Coins {
  // TUNE: radio 0,05 celdas. Con 0,035 la moneda apenas se leía a la distancia
  // de juego (captura del 26 sep, tratante en la semilla 23).
  const geometry = new CylinderGeometry(0.05, 0.05, 0.01, 10);
  // Color liso y sin luz: una moneda al sol brilla, y a la distancia de juego
  // un metal sin reflejo que reflejar sale negro.
  const material = new MeshBasicMaterial({ color: '#e8c25a' });
  const mesh = new InstancedMesh(geometry, material, COINS * MOST);
  mesh.name = 'Valley_Coins';
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const matrix = new Matrix4();
  const at = new Vector3();
  const turn = new Quaternion();
  const euler = new Euler();
  const one = new Vector3(1, 1, 1);
  let flying = 0;

  return {
    mesh,
    get flying() { return flying; },
    step(payments, steps, ground): void {
      let n = 0;
      const last = FLIGHT + GAP * (COINS - 1);
      for (const payment of payments) {
        const age = (steps - payment.at) * LIFE_STEP;
        if (age < 0 || age > last) continue;
        const fromY = ground(payment.from.x, payment.from.z) + HAND;
        const toY = ground(payment.to.x, payment.to.z) + HAND;
        for (let k = 0; k < COINS && n < COINS * MOST; k += 1) {
          const u = (age - k * GAP) / FLIGHT;
          if (u < 0 || u > 1) continue;
          at.set(
            payment.from.x + (payment.to.x - payment.from.x) * u,
            fromY + (toY - fromY) * u + ARC * Math.sin(Math.PI * u),
            payment.from.z + (payment.to.z - payment.from.z) * u,
          );
          turn.setFromEuler(euler.set(age * 14 + k, 0, age * 9));
          matrix.compose(at, turn, one);
          mesh.setMatrixAt(n, matrix);
          n += 1;
        }
      }
      mesh.count = n;
      flying = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
