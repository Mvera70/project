// G-10 · La fauna del valle, en tres dimensiones. design.md D.6, D.8, §7.7.
//
// **No hay ninguna regla nueva aquí.** Cuántos animales hay y dónde están lo
// deciden `animalPositions` y `wildlifePositions`, que son los mismos que usa el
// render 2D y salen en coordenadas de mapa porque nunca fueron código de
// dibujo. Esto sólo decide qué forma tiene cada bicho y hacia dónde mira.
//
// §7.7 dice que la cabaña es cosmética: no se guarda, no alimenta a nadie y no
// mueve ningún número de §12. Y §4.3 dice que el render no consume azar: estas
// dos funciones no lo consumen, derivan la posición del estado y de la hora, así
// que el mismo instante da siempre la misma vaca en el mismo sitio.
//
// Van instanciados, como los árboles: una aldea madura tiene cerca de cuarenta
// cabezas, y cuarenta objetos sueltos serían cuarenta llamadas de dibujo por un
// puñado de triángulos.

import { Group, InstancedMesh, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import { TERRAIN_CODE, type GameState, type ValleyMap } from '@engine/state';
import {
  animalPositions, wildlifePositions, type Animal, type AnimalKind,
} from '@derive/animals';
import { piecesOf, type Piece } from '../world/forest';

/**
 * Cuánto tiene que moverse un animal para que se le cambie la cara.
 *
 * TUNE: dos centésimas de celda, seis centímetros. Por debajo de eso el
 * movimiento es el temblor del paseo y no una dirección: girar con él dejaba a
 * las gallinas dando vueltas sobre sí mismas sin avanzar.
 */
const TURN_FLOOR = 0.02;

/**
 * A que altura nada un pez, en celdas.
 *
 * La lamina de agua esta diez centesimas por debajo del prado, y el pez saca la
 * aleta: un poco por debajo de ella es donde va el lomo.
 */
const FISH_LEVEL = -0.14;

/**
 * Saca de la corriente a un animal de tierra.
 *
 * Las posiciones vienen de las anclas de §7.7 —la gallina al umbral, la vaca al
 * campo— y esas anclas no miran el terreno. En el valle plano del 2D no se
 * notaba; con el río metido en un cauce, una vaca a la orilla se veía dentro
 * del agua. Se la empuja a la celda de al lado que sí es tierra, que es donde
 * estaba de todas formas: no cambia dónde pasta, cambia que no se ahoga.
 *
 * El pez no pasa por aquí, claro. Para él el agua es el sitio.
 *
 * V-08, ronda de fauna: **la salida es el punto de tierra más cercano de
 * verdad, no la cara más cercana de la propia celda.** La versión de G-10
 * probaba cuatro salidas —una por cara de la celda en la que está el animal—
 * y se quedaba con la de menor hueco: parece razonable, pero no es continua.
 * En cuanto el punto cruza la línea donde dos huecos empatan, la cara elegida
 * cambia de golpe de una fachada a la perpendicular, y con un cauce de más de
 * una celda de ancho ninguna de las dos caras de la propia celda es tierra
 * siquiera, así que el salto podía ser de varias celdas — medido, hasta 4,1
 * en un intento de extender la búsqueda en línea recta, y 1,08 con el reparto
 * por caras de siempre. **El primer intento de arreglo fue peor que el
 * problema** (regla séptima de E.3: a la tercera sin cuadrar, para y mira el
 * modelo, no el número) — extender la misma cara en línea recta seguía
 * siendo una elección discreta, sólo que más cara.
 *
 * Lo que sí es continuo: mirar las celdas de tierra de alrededor —no sólo las
 * cuatro caras de una— y quedarse con el punto más cercano de verdad,
 * proyectando sobre cada una como una caja (`Math.max`/`Math.min`, lo mismo
 * que usa `separate()` en `life/steering.ts` para lo mismo con un cuerpo).
 * Sigue sin ser continuo en el empate exacto entre dos tierras igual de
 * cerca, pero eso es un caso mucho más raro que «la cara de mi propia celda»,
 * y cuando empata, los dos candidatos están cerca *entre sí* —los dos están
 * cerca del animal— así que el salto en el empate es pequeño en vez de una
 * celda entera.
 */
const ASHORE_RADIUS = 4;

export function ashore(map: ValleyMap, x: number, y: number): { x: number; y: number } | null {
  const cellAt = (cx: number, cy: number): number | undefined => {
    const ix = Math.floor(cx);
    const iy = Math.floor(cy);
    if (ix < 0 || iy < 0 || ix >= map.width || iy >= map.height) return undefined;
    return map.terrain[iy * map.width + ix];
  };
  if (cellAt(x, y) !== TERRAIN_CODE.water) return { x, y };

  const cx0 = Math.floor(x);
  const cy0 = Math.floor(y);
  let best: { x: number; y: number; d2: number } | null = null;
  for (let cy = cy0 - ASHORE_RADIUS; cy <= cy0 + ASHORE_RADIUS; cy += 1) {
    for (let cx = cx0 - ASHORE_RADIUS; cx <= cx0 + ASHORE_RADIUS; cx += 1) {
      const kind = cellAt(cx + 0.5, cy + 0.5);
      if (kind === undefined || kind === TERRAIN_CODE.water) continue;
      // El punto de esta celda de tierra más cercano a (x, y), un margen
      // adentro para no quedar pegado a la línea exacta del agua.
      const nx = Math.max(cx + MARGIN, Math.min(x, cx + 1 - MARGIN));
      const ny = Math.max(cy + MARGIN, Math.min(y, cy + 1 - MARGIN));
      const d2 = (nx - x) ** 2 + (ny - y) ** 2;
      if (best === null || d2 < best.d2) best = { x: nx, y: ny, d2 };
    }
  }
  // Nada de tierra en el radio de búsqueda: un bicho en mitad del río y sin
  // orilla cerca no se dibuja. Es mejor que no esté a que nade.
  return best === null ? null : { x: best.x, y: best.y };
}

/** Lo que se separa del agua quien acaba de salir de ella, en celdas. */
const MARGIN = 0.04;

/** Cuántos animales de una clase caben antes de rehacer su malla. */
function capacityFor(count: number): number {
  let size = 8;
  while (size < count) size *= 2;
  return size;
}

interface Herd {
  readonly pieces: readonly InstancedMesh[];
  capacity: number;
}

/**
 * El rebaño, seguido fotograma a fotograma.
 *
 * A diferencia de las señales, esto sí cambia en cada fotograma: los animales
 * pastan, y un rebaño congelado entre tick y tick sería peor que no tenerlo. Lo
 * que no se rehace nunca es la geometría: sólo se reescriben las matrices, que
 * es lo que D.9 pide en vez de reconstruir objetos por fotograma.
 */
export class Fauna {
  readonly group = new Group();
  private readonly herds = new Map<AnimalKind, Herd>();
  /** Hacia dónde miraba cada bicho la última vez, para que gire y no salte. */
  private readonly facing = new Map<number, number>();
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly turn = new Quaternion();
  private readonly size = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);
  private readonly hidden = new Vector3(0, 0, 0);
  private readonly last = new Map<number, { x: number; y: number }>();
  /** El día escénico que se está dibujando, y la semana con la que se dibuja. */

  /**
   * `instance` da una copia del recurso de cada clase, o `undefined` si el
   * catálogo no la tiene. Una clase sin recurso simplemente no se ve: un valle a
   * medio catalogar sigue siendo un valle.
   */
  constructor(private readonly source: (kind: AnimalKind) => Object3D | undefined) {
    this.group.name = 'Valley_Fauna';
  }

  /** La cota del suelo, por el mismo motivo que en el reparto. */
  standOn(ground: (x: number, z: number) => number): void {
    this.ground = ground;
  }

  private ground: (x: number, z: number) => number = () => 0;

  /**
   * Coloca la fauna que corresponde a este instante.
   *
   * `dayPhase` es la hora escénica y no la fracción del tick: los animales se
   * recogen al anochecer igual que la gente (§10.6), y usar el tick los habría
   * metido en casa cuatro veces por día escénico a ×1.
   *
   * **El estado llega quieto y por eso aquí ya no se congela nada.** La
   * querencia de cada animal se sortea con la semana (§11.9, v3.06), y el
   * identificador de cada bicho es su puesto en la fila de la cabaña, así que
   * los dos se movían solos dentro de una misma jornada —ocho semanas a ×1,
   * sesenta y cuatro a ×64— y el rebaño se teletransportaba. La cura era
   * guardar aquí la semana, la cabaña y el pueblo de anoche; hoy la trae hecha
   * `scenic-state.ts`, para todos y de una vez, y este método vuelve a ser lo
   * que debía: una función de la hora.
   *
   * **Y sigue derivando del estado, que es la deuda que queda aquí.** V-08
   * partió la clase en dos —«de dónde salen las posiciones» y «cómo se
   * pintan», `paint` abajo— para que la capa de vida pudiera entrar por la
   * segunda mitad: `life/beasts.ts` ya da animales vivos, con cuerpo y sin
   * necesidad de `ashore`. Ese enganche **no se ha hecho**, así que el rebaño
   * que se ve es todavía una función de la hora mientras la gente a su lado
   * son cuerpos que andan. Es trabajo de la ronda que integre el renderer, y
   * no estaba en el alcance de V-08 (E.8) ni en el de V-12.
   */
  update(state: GameState, dayPhase: number): void {
    const animals: Animal[] = [];
    for (const animal of [...animalPositions(state, dayPhase), ...wildlifePositions(state, dayPhase)]) {
      if (animal.kind === 'fish') {
        animals.push(animal);
        continue;
      }
      const dry = ashore(state.map, animal.x, animal.y);
      if (dry !== null) animals.push({ ...animal, x: dry.x, y: dry.y });
    }
    this.paint(animals);
  }

  /**
   * Pinta exactamente los animales que se le dan, y nada más.
   *
   * **Esto es «pintar instancias»**: no deriva nada del estado, no consulta la
   * hora, no corrige el agua — sólo reparte la lista en mallas por clase y
   * escribe una matriz por bicho. `update` es hoy el único que la llama, con
   * la lista de siempre (§7.7 cosmético); un `life/beasts.ts` en marcha
   * llamaría aquí con su propia lista —viva, sin `ashore`, porque un
   * animal-`Dweller` no llega a pisar el agua— sin que esta clase necesite
   * saber que la vida existe.
   */
  paint(animals: readonly Animal[]): void {
    const byKind = new Map<AnimalKind, Animal[]>();
    for (const animal of animals) {
      const list = byKind.get(animal.kind);
      if (list === undefined) byKind.set(animal.kind, [animal]);
      else list.push(animal);
    }

    const seen = new Set<number>();
    for (const [kind, herd] of this.herds) {
      this.place(kind, herd, byKind.get(kind) ?? []);
    }
    for (const [kind, list] of byKind) {
      if (this.herds.has(kind)) continue;
      const herd = this.grow(kind, list.length);
      if (herd !== null) this.place(kind, herd, list);
    }
    for (const animal of animals) seen.add(animal.id);
    // Un bicho que ya no está se lleva su memoria: si no, el mapa crece con
    // cada lobo que pasó por el valle en sesenta años.
    for (const id of [...this.last.keys()]) if (!seen.has(id)) this.last.delete(id);
    for (const id of [...this.facing.keys()]) if (!seen.has(id)) this.facing.delete(id);
  }

  private grow(kind: AnimalKind, count: number): Herd | null {
    const model = this.source(kind);
    if (model === undefined) return null;
    const capacity = capacityFor(count);
    const pieces: InstancedMesh[] = [];
    for (const piece of piecesOf(model) as Piece[]) {
      const instanced = new InstancedMesh(piece.geometry, piece.material, capacity);
      instanced.name = `Fauna_${kind}`;
      instanced.castShadow = true;
      instanced.receiveShadow = false;
      // Sin esto, un rebaño que se aleja del sitio donde nació deja de dibujarse:
      // la esfera de recorte se calcula una vez y aquí las matrices cambian.
      instanced.frustumCulled = false;
      pieces.push(instanced);
      this.group.add(instanced);
    }
    const herd: Herd = { pieces, capacity };
    this.herds.set(kind, herd);
    return herd;
  }

  private place(kind: AnimalKind, herd: Herd, list: readonly Animal[]): void {
    if (list.length > herd.capacity) {
      this.drop(kind);
      const bigger = this.grow(kind, list.length);
      if (bigger === null) return;
      this.place(kind, bigger, list);
      return;
    }
    for (const piece of herd.pieces) {
      for (let slot = 0; slot < herd.capacity; slot += 1) {
        const animal = list[slot];
        if (animal === undefined) {
          // Las plazas que sobran se encogen a nada. Es más barato que rehacer
          // la malla cada vez que nace o muere una gallina.
          this.matrix.compose(this.position.set(0, -5, 0), this.turn.identity(), this.hidden);
          piece.setMatrixAt(slot, this.matrix);
          continue;
        }
        // El pez no se apoya en el fondo: nada en la lamina, que esta por
        // encima del cauce.
        const floor = animal.kind === 'fish' ? FISH_LEVEL : this.ground(animal.x, animal.y);
        this.position.set(animal.x, floor, animal.y);
        this.turn.setFromAxisAngle(this.up, this.headingOf(animal));
        this.matrix.compose(this.position, this.turn, this.size);
        piece.setMatrixAt(slot, this.matrix);
      }
      piece.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Hacia dónde mira un animal: hacia donde se está moviendo.
   *
   * La receta los dibuja con la cabeza en -X, así que el ángulo se toma desde
   * ahí. Un bicho que pasta y no avanza conserva la última dirección en vez de
   * ponerse a mirar al norte, que es lo que hace un rebaño de maniquíes.
   */
  private headingOf(animal: Animal): number {
    const before = this.last.get(animal.id);
    this.last.set(animal.id, { x: animal.x, y: animal.y });
    if (before !== undefined) {
      const dx = animal.x - before.x;
      const dy = animal.y - before.y;
      if (Math.hypot(dx, dy) >= TURN_FLOOR) {
        const heading = Math.atan2(-dy, -dx);
        this.facing.set(animal.id, heading);
        return heading;
      }
    }
    return this.facing.get(animal.id) ?? 0;
  }

  private drop(kind: AnimalKind): void {
    const herd = this.herds.get(kind);
    if (herd === undefined) return;
    for (const piece of herd.pieces) {
      this.group.remove(piece);
      piece.dispose();
      // La geometría es copia nuestra y se suelta; el material es del recurso
      // compartido y soltarlo dejaría sin piel a cualquier otro que lo use.
      piece.geometry.dispose();
    }
    this.herds.delete(kind);
  }

  /** Cuántas cabezas hay puestas ahora mismo, sumando las clases. */
  get count(): number {
    return this.last.size;
  }

  clear(): void {
    for (const kind of [...this.herds.keys()]) this.drop(kind);
    this.last.clear();
    this.facing.clear();
  }

  dispose(): void {
    this.clear();
  }
}
