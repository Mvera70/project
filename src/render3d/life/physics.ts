// D1 · El mundo físico. design.md §1b, fase 4.
//
// **Por qué existe, y por qué no lo mueve el motor.** La meta del proyecto dice
// que el asedio se resuelve **en físico** y que no es determinista, y es una
// decisión del dueño del diseño con estas palabras: «quiero que la pelea sea
// física, que sea divertido de ver, que haya física entre los muñecos… que dos
// jugadores con la misma semilla tengan finales distintos no importa, esa es un
// poco también la gracia». Así que esto vive en la capa de vida —la efímera, la
// que no escribe en el motor— y lo que decide es **cómo cae una flecha**, nunca
// cuánto grano hay en el granero.
//
// **El matrimonio con el paso fijo, que es lo único delicado.** La vida ya corre
// a 1/30 de segundo escénico (`life/clock.ts`) y un mundo de Rapier quiere
// exactamente eso: un `timestep` fijo y un paso por tick. Se casan uno a uno, y
// por eso no hay interpolación ni acumuladores aquí: quien acumula es el
// renderer, y cuando decide que toca un paso de vida, toca un paso de física.
//
// **Y se carga tarde, que es la otra decisión de esta ronda.** El paquete son
// **2,86 MB** en crudo (el `compat` lleva el WASM dentro en base64), y este
// juego es un idle de móvil que hoy pesa 12,5 MB con todas sus mallas. Un valle
// en paz no puede pagar eso: el módulo entra por `import()` dinámico, así que
// el empaquetador lo deja en su propio trozo y **el navegador sólo lo pide la
// primera vez que hay algo que simular**. Mientras no baje nadie del valle
// vecino, Rapier no existe para el jugador.

import type RAPIER_NS from '@dimforge/rapier3d-compat';
import { LIFE_STEP } from './clock';
import type { Point, Terrain } from './body';

/** Lo que este módulo deja usar de Rapier, sin que nadie más lo importe. */
type Rapier = typeof RAPIER_NS;

/**
 * El módulo cargado, o la promesa de cargarlo. Memoizado a propósito: pedirlo
 * dos veces no puede traer dos WASM.
 */
let loading: Promise<Rapier> | null = null;

/**
 * Trae Rapier y lo arranca. La primera llamada paga la descarga; las demás
 * devuelven lo mismo.
 *
 * Devuelve `null` si no se puede cargar —sin red, o un navegador sin WASM— y
 * eso **no es un error**: es la respuesta honesta, y quien llame tiene que
 * saber seguir sin física. El valle entero funciona sin ella; lo que no habrá
 * es batalla.
 */
export async function loadPhysics(): Promise<Rapier | null> {
  loading ??= import('@dimforge/rapier3d-compat')
    .then(async (mod) => { await mod.init(); return mod; });
  try {
    return await loading;
  } catch {
    loading = null;
    return null;
  }
}

/** Un cuerpo del mundo físico, visto desde fuera. */
export interface PhysicsBody {
  /** Dónde está ahora, en coordenadas del valle. `y` es la altura. */
  readonly at: { x: number; y: number; z: number };
  /** A qué velocidad va, por si quien lo dibuja quiere orientarlo. */
  readonly velocity: { x: number; y: number; z: number };
  /** Si ya ha tocado algo. Una flecha clavada deja de volar. */
  readonly resting: boolean;
  /** Quitarlo del mundo. */
  remove(): void;
}

/** El mundo, con lo poco que la capa de vida necesita saber de él. */
export interface Physics {
  /** Un paso, y es el mismo paso que da la vida. */
  step(): void;
  /**
   * Lanza algo: una flecha, una piedra. `at` es de dónde sale y `velocity`
   * hacia dónde va, en celdas por segundo escénico.
   */
  launch(at: { x: number; y: number; z: number },
    velocity: { x: number; y: number; z: number }): PhysicsBody;
  /** Cuántos cuerpos hay ahora mismo. Para medir, y para no dejarlos crecer. */
  readonly count: number;
  /** Suelta el mundo entero. */
  dispose(): void;
}

/**
 * La gravedad del valle, en celdas por segundo escénico al cuadrado.
 *
 * TUNE: una celda es tres metros (D.6.2) y un segundo escénico es un segundo,
 * así que 9,81 m/s² son **3,27 celdas/s²**. No es un número elegido: es la
 * gravedad, escrita en las unidades de este juego. Si algún día una flecha
 * parece de juguete, lo que hay que cambiar es su velocidad de salida, no esto.
 */
const GRAVITY = -9.81 / 3;

/**
 * Monta el mundo sobre el terreno que la vida ya conoce.
 *
 * El suelo es un plano a la altura cero, y las celdas cerradas del terreno
 * —agua, roca, y los edificios que `terrainOf` cierra— son cajas estáticas: lo
 * mismo que un cuerpo de la vida no puede atravesar, una flecha tampoco. Así la
 * muralla para las flechas por la misma razón por la que para a la gente, sin
 * una segunda idea de dónde está la muralla.
 */
export async function createPhysics(land: Terrain): Promise<Physics | null> {
  const RAPIER = await loadPhysics();
  if (RAPIER === null) return null;

  const world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 });
  world.timestep = LIFE_STEP;

  // El suelo. Un plano fino y muy ancho: nada de este juego cae fuera del mapa.
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(land.width, 0.05, land.height)
      .setTranslation(land.width / 2, -0.05, land.height / 2),
  );

  // Y lo que corta el paso, celda a celda. Se monta una vez: el valle cambia de
  // forma una vez por jornada escénica (`terrainOf`), no por fotograma.
  for (let z = 0; z < land.height; z += 1) {
    for (let x = 0; x < land.width; x += 1) {
      if (land.blocked[z * land.width + x] !== 1) continue;
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.5, WALL_HEIGHT / 2, 0.5)
          .setTranslation(x + 0.5, WALL_HEIGHT / 2, z + 0.5),
      );
    }
  }

  const live = new Set<{ body: RAPIER_NS.RigidBody }>();

  return {
    step(): void { world.step(); },
    get count(): number { return live.size; },
    launch(at, velocity): PhysicsBody {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(at.x, at.y, at.z)
          .setLinvel(velocity.x, velocity.y, velocity.z)
          // Una flecha no rueda ni da vueltas de campana: vuela y se clava.
          .setLinearDamping(ARROW_DRAG),
      );
      world.createCollider(RAPIER.ColliderDesc.ball(ARROW_RADIUS), body);
      const handle = { body };
      live.add(handle);
      // **Un cuerpo retirado tiene que seguir contestando dónde estaba**, y esto
      // lo encontró una toma del observatorio con la primera versión de D2: el
      // renderer guarda la lista de flechas de un fotograma y la lee en el
      // siguiente, y preguntarle la posición a un cuerpo ya liberado **revienta
      // el WASM** («RuntimeError: unreachable», que no es una excepción de
      // JavaScript y se lleva la página entera por delante). Se guarda lo último
      // que se supo de él y se contesta eso: un cuerpo muerto está quieto donde
      // se murió, que además es la verdad.
      let last = { x: at.x, y: at.y, z: at.z };
      let lastVelocity = { x: velocity.x, y: velocity.y, z: velocity.z };
      let dead = false;
      return {
        get at() {
          if (dead) return last;
          const t = body.translation();
          return { x: t.x, y: t.y, z: t.z };
        },
        get velocity() {
          if (dead) return lastVelocity;
          const v = body.linvel();
          return { x: v.x, y: v.y, z: v.z };
        },
        get resting(): boolean {
          if (dead) return true;
          const v = body.linvel();
          return v.x * v.x + v.y * v.y + v.z * v.z < RESTING_SPEED * RESTING_SPEED;
        },
        remove(): void {
          if (dead) return;
          const t = body.translation();
          const v = body.linvel();
          last = { x: t.x, y: t.y, z: t.z };
          lastVelocity = { x: v.x, y: v.y, z: v.z };
          dead = true;
          live.delete(handle);
          world.removeRigidBody(body);
        },
      };
    },
    dispose(): void {
      live.clear();
      world.free();
    },
  };
}

/**
 * Lo alto que se levanta una celda cerrada, en celdas.
 *
 * TUNE: dos, o sea seis metros. Es lo que mide la empalizada de D.6.2 y lo que
 * hace que una flecha tenga que pasar **por encima** de la muralla o no pasar.
 * Que una casa sea igual de alta no importa: para una flecha, una casa es una
 * pared con techo.
 */
const WALL_HEIGHT = 2;

/**
 * El radio de lo que se lanza, y cuánto lo frena el aire.
 *
 * TUNE: 0,08 celdas son veinticuatro centímetros — el grosor de una flecha con
 * su punta, redondeado a algo que Rapier pueda resolver sin que se cuele entre
 * dos cajas. El rozamiento, 0,2, es lo que convierte una parábola de libro en
 * una que se acorta al final; sin él, una flecha llega igual de lejos a favor
 * que en contra del viento, y el viento no existe en este juego.
 */
const ARROW_RADIUS = 0.08;
const ARROW_DRAG = 0.2;

/** Por debajo de esta velocidad, algo está quieto. Media celda por segundo. */
const RESTING_SPEED = 0.5;

/** Lo que `launch` necesita saber de dónde sale una flecha: una plaza y su alto. */
export function fromWall(at: Point, height = WALL_HEIGHT): { x: number; y: number; z: number } {
  return { x: at.x, y: height, z: at.z };
}
