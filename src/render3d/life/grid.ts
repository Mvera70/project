// V-02 · La rejilla de vecinos. design.md Anexo E.
//
// **Lo que hace que la escala deje de importar.**
//
// Separar a la gente exige saber quién tiene cerca a quién, y mirarlos todos
// contra todos son n² parejas: con ochenta son 3 160 y con doscientos son
// 19 900. Medido en el descarte, el paso pasaba de 236 µs a 1 378 al triplicar
// la gente — cuadrático, como manda la aritmética.
//
// Casi todas esas parejas están a media legua la una de la otra. La rejilla
// reparte los cuerpos por casillas y sólo compara los de las casillas vecinas,
// que es un puñado por cuerpo y no depende de cuánta gente haya en el valle.
//
// Se reconstruye entera cada paso en vez de mantenerse al día. Suena a
// derroche y no lo es: ochenta escrituras en un array de enteros cuestan menos
// que llevar la cuenta de quién se ha movido de casilla, y además no puede
// desincronizarse, que es el fallo clásico de las rejillas que se actualizan.

import type { Body } from './body';

/**
 * Lo que mide una casilla de la rejilla, en celdas del valle.
 *
 * TUNE: dos. El alcance de la separación es como mucho dos radios más un palmo
 * —poco más de una celda—, así que con casillas de dos, mirar las nueve de
 * alrededor cubre de sobra cualquier vecino que pueda tocar. Más pequeñas
 * multiplican las casillas vacías que recorrer; más grandes meten en cada
 * comparación a gente que no iba a tocar a nadie.
 */
const CELL = 2;

export interface Neighbourhood {
  /** Reparte los cuerpos por casillas. Se llama una vez por paso. */
  rebuild(bodies: readonly Body[]): void;
  /**
   * Visita los cuerpos que puedan estar a `reach` de este, y alguno más.
   *
   * **Alguno más a propósito**: la rejilla descarta a los que están lejos
   * seguro, no afina los que están cerca. Quien la usa comprueba la distancia
   * de verdad, que es una resta y sale más barata que ajustar la rejilla.
   *
   * Recorre en orden de identificador, no de casilla: dos partidas iguales
   * tienen que separar a la gente en el mismo orden o dejan de ser iguales.
   */
  near(of: Body, visit: (other: Body) => void): void;
}

export function createNeighbourhood(width: number, height: number): Neighbourhood {
  const cols = Math.max(1, Math.ceil(width / CELL));
  const rows = Math.max(1, Math.ceil(height / CELL));
  // Listas por casilla, reutilizadas entre pasos: crear ochenta arrays por
  // fotograma es basura que el recolector acaba cobrando en un tirón.
  const slots: Body[][] = Array.from({ length: cols * rows }, () => []);

  function slotOf(x: number, z: number): number {
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(x / CELL)));
    const cz = Math.max(0, Math.min(rows - 1, Math.floor(z / CELL)));
    return cz * cols + cx;
  }

  return {
    rebuild(bodies: readonly Body[]): void {
      for (const slot of slots) slot.length = 0;
      for (const body of bodies) (slots[slotOf(body.x, body.z)] as Body[]).push(body);
    },

    near(of: Body, visit: (other: Body) => void): void {
      const cx = Math.max(0, Math.min(cols - 1, Math.floor(of.x / CELL)));
      const cz = Math.max(0, Math.min(rows - 1, Math.floor(of.z / CELL)));
      for (let dz = -1; dz <= 1; dz += 1) {
        const row = cz + dz;
        if (row < 0 || row >= rows) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const col = cx + dx;
          if (col < 0 || col >= cols) continue;
          for (const other of slots[row * cols + col] as Body[]) {
            if (other.id !== of.id) visit(other);
          }
        }
      }
    },
  };
}
