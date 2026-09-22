// D2 · Las flechas, y quién las dispara. design.md §1b, fase 4.
//
// **Es la primera cosa del juego que la física decide.** D1 montó el mundo de
// Rapier y dejó dicho lo que faltaba —«nadie dispara todavía»—; C2 puso a los
// arqueros en sus puestos. Esto une las dos: el que está en la muralla con un
// arco tira a lo que entra en alcance, la flecha vuela con su parábola y su
// rozamiento, y **lo que le pase al que recibe lo decide ese vuelo**, no una
// tirada del motor. Es §1b tal cual: «que la pelea sea física».
//
// **Y por eso no es determinista, a propósito.** Dos partidas con la misma
// semilla pueden acabar con distinto número de saqueadores en el suelo, porque
// el vuelo depende de dónde estaba cada cuerpo en el paso en que se soltó la
// cuerda. Lo dijo el dueño del diseño: «que dos jugadores con la misma semilla
// tengan finales distintos no importa, esa es un poco también la gracia». Lo
// que **no** cambia es nada del motor: esta capa es efímera y no escribe (E.3).
// La cuenta de lo que pasó se queda aquí, a la espera de B4, que es la fase que
// la mete en el motor como datos —«lo que el mundo hizo»— por la puerta de
// `PlayerAct`.
//
// **Lo que esta ronda no hace:** el cuerpo a cuerpo (D4, que es donde las
// lanzas del portón sirven de algo), el ragdoll de quien cae (el que cae se
// queda en el suelo con su clip, y el clip todavía no existe: E1), y romper
// nada (D5). Un saqueador alcanzado se para; no hay sangre porque cómo se ve
// eso es decisión del dueño (E4).

import type { Manned } from './garrison';
import type { Physics, PhysicsBody } from './physics';
import type { Raider } from './raiders';

/** Una flecha en el aire, o clavada donde cayó. */
export interface Arrow {
  readonly body: PhysicsBody;
  /** De qué puesto salió. Vale para contar y para dibujar de dónde viene. */
  readonly from: string;
  /** El paso en que se soltó, para retirarla cuando ya no es una flecha. */
  readonly loosed: number;
  /** Si ya ha hecho lo que tenía que hacer: tocar algo o caer. */
  spent: boolean;
}

/** Un arquero en su puesto, con su cadencia. */
export interface Archer {
  /** Se conserva aunque la flecha ya haya salido de la lista de proyectiles. */
  lastShot?: number;
  facing?: number;
  readonly post: Manned;
  /** Paso a partir del cual puede volver a soltar. */
  nextShot: number;
  /** Cuántas ha soltado en la jornada, y cuántas han dado. */
  loosed: number;
  hits: number;
}

/**
 * La velocidad de salida de una flecha, en celdas por segundo escénico.
 *
 * TUNE: doce, o sea treinta y seis metros por segundo. Un arco de caza de
 * verdad da entre cuarenta y sesenta, y a esa velocidad —veinte celdas por
 * segundo— una flecha cruza el alcance entero de este juego en **medio
 * segundo**: a la cámara de este juego eso son tres fotogramas y lo que se ve
 * es un parpadeo. Doce deja un vuelo de ocho décimas a diez celdas, que es lo
 * que hace que se vea salir, subir y caer. Es la decisión que D1 dejó escrita
 * en su propio comentario: la gravedad no se toca —es la gravedad—, lo que se
 * afina es la salida.
 */
const ARROW_SPEED = 12;

/**
 * La gravedad, en la misma unidad, y **repetida aquí a propósito**.
 *
 * No se importa de `physics.ts` porque allí es el vector de un mundo (negativa,
 * en `y`) y aquí es la magnitud de una cuenta de balística. Son el mismo número
 * y tienen que serlo: si un día se cambia allí y no aquí, la flecha apuntará a
 * un sitio y caerá en otro. La prueba de esta ronda lo vigila comparando el
 * punto al que se apunta con el punto en el que la flecha de verdad aterriza.
 */
const GRAVITY = 9.81 / 3;

/**
 * Hasta dónde tira un arquero, en celdas.
 *
 * TUNE: diez, treinta metros. Un arco llega mucho más lejos, pero lo que se
 * defiende aquí es un cerco de radio diez a doce (§7.4c) y la partida entra
 * entre diez y veintiséis celdas del portón (D3): con diez, **se dispara
 * cuando la partida se acerca**, no al horizonte. Y hay una razón de escena:
 * una flecha que sale de un sitio que no se ve en el encuadre es una flecha que
 * aparece de la nada.
 */
const BOW_RANGE = 10;

/**
 * Lo que se tarda en tensar y soltar, en pasos de vida.
 *
 * TUNE: 63 pasos, que a 1/30 son 2,1 segundos escénicos — **la suma exacta de
 * los dos clips que el encargo E1 pide**: `bow_draw` (1,5 s, en bucle y
 * sostenible) y `bow_loose` (0,6 s). Se elige así para que el día que los clips
 * existan no haya que reajustar nada: la cadencia **es** la animación.
 */
const DRAW_STEPS = 63;

/**
 * Lo que una flecha se queda en el mundo después de gastarse, en pasos.
 *
 * TUNE: 240, ocho segundos. Una flecha clavada se ve —es la marca de que ahí
 * hubo una pelea— pero no puede acumularse: con doce arqueros a una cada dos
 * segundos, una jornada de dos minutos dejaría setecientos cuerpos en el mundo
 * físico, y D1 midió que doscientos cuestan 403 µs. Ocho segundos deja del
 * orden de cincuenta a la vez.
 */
const ARROW_LIFE = 240;

/**
 * A qué distancia una flecha ha dado. En celdas, y en las dos direcciones.
 *
 * Un cuerpo de esta capa es un círculo de 0,32 (`body.ts`) y una flecha una
 * bola de 0,08, así que tocarse es 0,40: se redondea a 0,45 porque el paso de
 * física es de 1/30 y a doce celdas por segundo una flecha avanza **0,4 celdas
 * por paso** — con el umbral justo, pasaría de estar delante a estar detrás sin
 * haber estado nunca «tocando». Y en alto, de cero a 0,7: un aldeano mide poco
 * menos de dos metros y una celda son tres.
 */
const HIT_REACH = 0.45;
const BODY_TOP = 0.7;

/**
 * La altura a la que se suelta y a la que se apunta, en celdas.
 *
 * Se apunta al pecho, a 0,4, que son un metro veinte: a los pies no se tira, y
 * a la cabeza tampoco.
 *
 * Y se suelta desde **2,3 y no desde 2**, que es lo alto de la empalizada
 * (`physics.ts`, `WALL_HEIGHT`). Los treinta centímetros de más son **el parapeto
 * asomado**, y hacen falta: medido en la semilla 36, los arqueros soltaban
 * **136 flechas y no acertaban ni una**, porque saliendo justo a la altura de la
 * estaca la flecha se la comía su propia muralla en cuanto el blanco se pegaba
 * al pie de ella. Es verdad física —por eso las murallas de verdad tienen
 * matacanes— y es un agujero de diseño: un cerco no puede tener una zona ciega
 * pegada a su propia puerta, que es justo donde se apretuja un asalto.
 *
 * Quien dispara está **en** la muralla (§1b: «las torres son aldeanos en la
 * muralla disparando»); que por ahora se pinte detrás de la estaca y no encima
 * es una carencia de arte —falta el adarve, E3— y no una decisión de balística.
 */
const LOOSE_HEIGHT = 2.3;
const CHEST = 0.4;

/**
 * Cota local del grip `hand_l` al comienzo de `bow_draw`/`bow_loose`.
 *
 * El clip se construye desde `idle`: al evaluar el GLB publicado en t=0, el
 * grip queda a 0,42863 sobre los pies. La flecha no tiene un hueso `nock` ni
 * `arrow_exit`, por lo que éste es el origen reproducible más próximo al arma,
 * no una altura de parapeto inventada. X/Z nacen del cuerpo que ocupa el
 * puesto y se desplazan sólo por el conector medido, rotado con su `facing`.
 */
export const ELEVATED_BOW_GRIP = { x: -0.020588, y: 0.428627, z: 0.243754 } as const;

type ArcherPosition = { readonly x: number; readonly y: number; readonly z: number };
type OccupantPosition = { readonly x: number; readonly y?: number; readonly z: number };

function shotOrigin(archer: Archer, positions: ReadonlyMap<string, OccupantPosition>, facing?: number): ArcherPosition | null {
  if (archer.post.elevated === undefined) {
    return { x: archer.post.place.at.x, y: LOOSE_HEIGHT, z: archer.post.place.at.z };
  }
  const body = positions.get(archer.post.place.id);
  if (body === undefined || body.y === undefined) return null;
  const yaw = facing ?? archer.facing ?? Math.atan2(
    archer.post.elevated.approach.x - archer.post.elevated.foot.x,
    archer.post.elevated.approach.z - archer.post.elevated.foot.z,
  );
  // Matriz de yaw de Three: el grip sigue el cuerpo real, no la plaza de
  // aproximación. Con la escalera hacia +Z, mirando exterior -Z, resulta
  // (.520588, 1.448627, .336246), la medición del GLB a t=0.
  return {
    x: body.x + ELEVATED_BOW_GRIP.x * Math.cos(yaw) + ELEVATED_BOW_GRIP.z * Math.sin(yaw),
    y: body.y + ELEVATED_BOW_GRIP.y,
    z: body.z - ELEVATED_BOW_GRIP.x * Math.sin(yaw) + ELEVATED_BOW_GRIP.z * Math.cos(yaw),
  };
}

/** Los arqueros de hoy, de los puestos que tienen arco. */
export function archersOf(manned: readonly Manned[]): Archer[] {
  return manned
    .filter((post) => post.post.arm === 'bow')
    .map((post) => ({ post, nextShot: 0, loosed: 0, hits: 0 }));
}

/**
 * Con qué velocidad hay que soltar para acertar, o nada si no se llega.
 *
 * La solución de libro del tiro parabólico con velocidad dada: de los dos
 * ángulos que valen se coge **el bajo**, que es el que dispara un defensor —una
 * flecha rasa llega antes y se ve venir menos—. Si el discriminante sale
 * negativo, el blanco está fuera de alcance para esa velocidad, y eso no es un
 * error: es que no se llega.
 */
export function aimAt(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  speed = ARROW_SPEED,
): { x: number; y: number; z: number } | null {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const far = Math.hypot(dx, dz);
  if (far < 0.5) return null;
  const rise = to.y - from.y;
  const v2 = speed * speed;
  const disc = v2 * v2 - GRAVITY * (GRAVITY * far * far + 2 * rise * v2);
  if (disc < 0) return null;
  const tan = (v2 - Math.sqrt(disc)) / (GRAVITY * far);
  const angle = Math.atan(tan);
  const flat = speed * Math.cos(angle);
  return {
    x: (dx / far) * flat,
    y: speed * Math.sin(angle),
    z: (dz / far) * flat,
  };
}

/**
 * A quién se le tira: el más cercano dentro del alcance que todavía anda.
 *
 * **Y se le tira adelantado.** Un saqueador anda a 1,4 celdas por segundo y una
 * flecha tarda casi un segundo en cruzar diez celdas, así que apuntar a donde
 * está es tirar a donde estaba. Se apunta a donde va a estar cuando llegue, con
 * una sola pasada: la segunda corrección vale menos que el ancho de un cuerpo.
 */
function targetFor(
  from: ArcherPosition, raiders: readonly Raider[],
): { at: { x: number; y: number; z: number }; raider: Raider } | null {
  let best: Raider | null = null;
  let bestGap = BOW_RANGE;
  for (const raider of raiders) {
    if (raider.phase === 'gone' || raider.phase === 'down') continue;
    const gap = Math.hypot(raider.body.x - from.x, raider.body.z - from.z);
    if (gap >= bestGap) continue;
    bestGap = gap;
    best = raider;
  }
  if (best === null) return null;
  const flight = bestGap / ARROW_SPEED;
  return {
    raider: best,
    at: {
      x: best.body.x + best.body.vx * flight,
      y: CHEST,
      z: best.body.z + best.body.vz * flight,
    },
  };
}

/**
 * Un paso de la arquería: quien puede soltar suelta, y las flechas en el aire
 * miran si han dado.
 *
 * El mundo físico lo hace avanzar quien llama (`village.ts`, un paso de física
 * por paso de vida, que es el matrimonio de D1). Esto sólo pone flechas en él y
 * lee dónde están.
 */
export function stepArchery(
  archers: readonly Archer[],
  raiders: readonly Raider[],
  arrows: Arrow[],
  physics: Physics,
  step: number,
  /**
   * Los puestos que tienen a alguien dentro ahora mismo.
   *
   * **Sin esto la muralla disparaba sola**, y lo enseñó una toma del
   * observatorio: `manned` es la lista de **puestos**, no de gente, así que las
   * flechas salían de un sitio vacío mientras el arquero todavía iba de camino.
   * Un puesto es un sitio; quien lo ocupa lo decide el reparto de la jornada y
   * tarda en llegar. Quien llama sabe quién ha llegado, y lo dice aquí.
   */
  occupied: ReadonlySet<string>,
  /** Posición real de quien ocupa los puestos elevados; el suelo conserva su origen previo. */
  positions: ReadonlyMap<string, OccupantPosition> = new Map(),
): void {
  for (const archer of archers) {
    if (!occupied.has(archer.post.place.id)) continue;
    // Primero se elige desde el cuerpo. Después se rota el grip hacia ese
    // blanco y se vuelve a elegir desde la mano: no nace con el yaw del tiro
    // anterior cuando cambia de saqueador.
    const base = archer.post.elevated === undefined
      ? shotOrigin(archer, positions)
      : (() => {
        const body = positions.get(archer.post.place.id);
        return body?.y === undefined ? null : { x: body.x, y: body.y + ELEVATED_BOW_GRIP.y, z: body.z };
      })();
    if (base === null) continue;
    const firstTarget = targetFor(base, raiders);
    if (firstTarget === null) continue;
    const firstFacing = Math.atan2(firstTarget.at.x - base.x, firstTarget.at.z - base.z);
    const from = shotOrigin(archer, positions, firstFacing);
    if (from === null) continue;
    const target = targetFor(from, raiders);
    if (target === null) continue;
    archer.facing = Math.atan2(target.at.x - from.x, target.at.z - from.z);
    const finalFrom = shotOrigin(archer, positions, archer.facing);
    if (finalFrom === null) continue;
    if (step < archer.nextShot) continue;
    const velocity = aimAt(finalFrom, target.at);
    if (velocity === null) continue;
    arrows.push({
      body: physics.launch(finalFrom, velocity),
      from: archer.post.place.id,
      loosed: step,
      spent: false,
    });
    archer.loosed += 1;
    archer.lastShot = step;
    archer.nextShot = step + DRAW_STEPS;
  }

  // **Se recorre al revés porque se quitan cosas de la lista.** Una flecha que
  // cumple su tiempo sale del mundo físico **y de aquí**: dejarla en la lista
  // con el cuerpo liberado es lo que reventó la primera toma del observatorio,
  // porque quien dibuja lee la lista y le pregunta la posición (`physics.ts`).
  for (let n = arrows.length - 1; n >= 0; n -= 1) {
    const arrow = arrows[n] as Arrow;
    if (arrow.spent) {
      if (step - arrow.loosed > ARROW_LIFE) {
        arrow.body.remove();
        arrows.splice(n, 1);
      }
      continue;
    }
    const at = arrow.body.at;
    // Ha caído: se queda clavada donde esté y deja de buscar a quien tocar.
    if (arrow.body.resting || at.y <= 0.05) { arrow.spent = true; continue; }
    for (const raider of raiders) {
      if (raider.phase === 'gone' || raider.phase === 'down') continue;
      if (at.y > BODY_TOP) continue;
      if (Math.hypot(raider.body.x - at.x, raider.body.z - at.z) > HIT_REACH) continue;
      arrow.spent = true;
      raider.hits += 1;
      // **Una flecha basta**, y es la decisión honesta mientras no haya cuerpo
      // a cuerpo ni ragdoll: un hombre alcanzado en el pecho deja de subir por
      // la ladera. Cuántas hacen falta de verdad es balance, y el nivelado va
      // al final y es del dueño.
      raider.phase = 'down';
      raider.downAt = step;
      raider.body.vx = 0;
      raider.body.vz = 0;
      break;
    }
  }
}

/** Las que siguen en el mundo, para que quien dibuje no vea las retiradas. */
export function flying(arrows: readonly Arrow[]): Arrow[] {
  return arrows.filter((arrow) => !arrow.spent);
}
