// Las luces puntuales del valle, siempre las mismas. 27 sep 2026.
//
// Vera, en su tablet: «arranca a 1 FPS… creo que el juego necesita precargar
// sombreadores». Lo que había detrás: **cada vez que cambia el número de luces
// puntuales de la escena, Three recompila el sombreador de cada material**
// (el número de luces va escrito en el programa). Y el número cambiaba sin
// parar: la hoguera aparece al colocar la plaza, los farolillos de la fiesta
// son seis luces que entran y salen con ella, el rayo mete la suya en cada
// descarga y cada casa que arde suma otra hasta cuatro. En un ordenador son
// unos milisegundos; en una tablet, segundos congelada, cada vez.
//
// Aquí se fija el número: un puñado de luces que **están siempre** en la
// escena, apagadas cuando no hacen falta. Los efectos siguen creando y
// moviendo sus `PointLight` como antes, pero ésas ya no se dibujan (se sacan
// de la capa de la cámara): son la petición. En cada fotograma, las más
// fuertes de las que están a la vista se copian a las luces fijas.

import { PointLight, type Object3D } from 'three';

/** Una luz que se ve: ella y todos sus padres visibles. */
function shown(object: Object3D): boolean {
  for (let at: Object3D | null = object; at !== null; at = at.parent) if (!at.visible) return false;
  return true;
}

export class LightPool {
  readonly lights: PointLight[];
  private readonly wanted: PointLight[] = [];

  constructor(size: number) {
    this.lights = Array.from({ length: size }, (_, n) => {
      const light = new PointLight('#ffffff', 0, 1, 2);
      light.name = `PooledLight_${n}`;
      return light;
    });
  }

  /**
   * Recoge las luces que piden los efectos debajo de `roots` y enciende las
   * fijas con las más fuertes. Las fijas tienen que colgar de la escena (sin
   * transformar: la posición se copia en coordenadas de mundo).
   */
  step(roots: readonly Object3D[]): void {
    this.wanted.length = 0;
    for (const root of roots) {
      root.traverse((node) => {
        if (!(node instanceof PointLight) || this.lights.includes(node)) return;
        // Fuera de la capa de la cámara: el renderer ya no la cuenta.
        node.layers.disableAll();
        if (node.intensity > 0 && shown(node)) this.wanted.push(node);
      });
    }
    this.wanted.sort((a, b) => b.intensity - a.intensity);
    this.lights.forEach((light, n) => {
      const source = this.wanted[n];
      if (source === undefined) { light.intensity = 0; return; }
      source.getWorldPosition(light.position);
      light.color.copy(source.color);
      light.intensity = source.intensity;
      light.distance = source.distance;
      light.decay = source.decay;
    });
  }

  /** Cuántas luces encendidas se pidieron en el último paso (para medir). */
  get demand(): number {
    return this.wanted.length;
  }
}
