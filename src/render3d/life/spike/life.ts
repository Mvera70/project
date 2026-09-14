// V-00 · El descarte de la vida del valle. Anexo E.
//
// **Esto es un banco, no el juego.** Existe para responder una pregunta y
// morir: ¿un valle con cuerpos de verdad se ve vivo? Si la respuesta es sí, lo
// que quede de aquí es la idea y no el código; si es no, se borra la carpeta.
//
// La diferencia con `actors/index.ts` es toda la propuesta en una línea: allí
// la posición es `f(tick, fase)` —una curva que se evalúa— y aquí es estado que
// avanza. De ahí sale todo lo que hoy es imposible: dos cuerpos que ocupan
// sitio pueden chocar, y dos que se cruzan pueden decidir pararse.
//
// Sin Three.js a propósito: esto se puede probar sin pintar nada.

import { hash32 } from '@engine/rng';

/** El paso de la simulación, en segundos escénicos. Fijo y no negociable. */
export const STEP = 1 / 30;

export interface Point { x: number; z: number }

export interface Obstacle { x: number; z: number; w: number; h: number }

export interface Body {
  readonly id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  readonly radius: number;
  /** Lo que anda cuando no le retiene nada, en celdas por segundo. */
  readonly pace: number;
  /** Cuánto le apetece pararse con quien se cruza. 0 a 1. */
  readonly sociable: number;
  /** Lo fácil que salta. 0 a 1. En el juego saldría de `hot_tempered`. */
  readonly temper: number;
  /** A dónde va ahora, o nada si acaba de llegar. */
  goal: Point | null;
  /**
   * Con quién está teniendo algo, de qué clase y hasta cuándo.
   *
   * **Dos papeles y no dos copias del mismo**: en un empujón hay quien empuja y
   * quien lo recibe, y ésa es toda la diferencia entre una escena y dos
   * personas haciendo lo mismo a la vez. Es lo que V-07 generaliza.
   */
  talkingTo: number | null;
  bout: 'chat' | 'shove' | null;
  role: 'gives' | 'takes' | null;
  talkUntil: number;
  /** Cuándo suelta el empujón, si es que le toca soltarlo. */
  shoveAt: number;
  /** Hasta cuándo va trastabillando, sin gobierno de sus piernas. */
  reelUntil: number;
  /** Si ya devolvió el empujón: se devuelve una vez, no se monta una trifulca. */
  paidBack: boolean;
  /** Para no volver a engancharse con el mismo al separarse. */
  cooldown: number;
}

export interface World {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly obstacles: readonly Obstacle[];
  readonly haunts: readonly Point[];
  bodies: Body[];
  /** Pasos dados. Es el reloj de este mundo: nada mira el de la pared. */
  steps: number;
  /** Lo que ha pasado, para poder contarlo en pantalla. */
  chats: number;
  shoves: number;
  bumps: number;
}

// ---------------------------------------------------------------------------
// Azar
// ---------------------------------------------------------------------------

/**
 * Un número en [0,1) a partir de tres enteros.
 *
 * Sin estado mutable: la misma pregunta da siempre la misma respuesta, y por
 * eso este mundo se puede reconstruir desde cualquier punto sin guardar nada.
 * Es la propiedad que la capa de vida necesita para sobrevivir a un letargo.
 */
function roll(seed: number, a: number, b: number): number {
  return hash32(seed, `${a}:${b}`) / 4_294_967_296;
}

// ---------------------------------------------------------------------------
// El mundo
// ---------------------------------------------------------------------------

const WIDTH = 34;
const HEIGHT = 26;

/** Cuatro casas y un cobertizo, puestos a mano: aquí el pueblo no importa. */
const HOUSES: readonly Obstacle[] = [
  { x: 8, z: 7, w: 4, h: 3 },
  { x: 15, z: 6, w: 4, h: 3 },
  { x: 22, z: 8, w: 4, h: 3 },
  { x: 10, z: 15, w: 4, h: 3 },
  { x: 19, z: 16, w: 3, h: 3 },
];

/** Los sitios por los que se pasa: el pozo, la era, el vado, los bordes. */
const HAUNTS: readonly Point[] = [
  { x: 16.5, z: 11.5 }, // el pozo, en medio de todo
  { x: 5, z: 12 },
  { x: 28, z: 13 },
  { x: 16, z: 21 },
  { x: 16, z: 2.5 },
  { x: 6, z: 20 },
  { x: 27, z: 21 },
];

export function createWorld(seed: number, count = 8): World {
  const bodies: Body[] = [];
  for (let id = 0; id < count; id += 1) {
    const spot = HAUNTS[id % HAUNTS.length] as Point;
    bodies.push({
      id,
      x: spot.x + (roll(seed, id, 1) - 0.5) * 3,
      z: spot.z + (roll(seed, id, 2) - 0.5) * 3,
      vx: 0,
      vz: 0,
      facing: roll(seed, id, 3) * Math.PI * 2,
      radius: 0.32,
      // Cada uno a su paso, o la aldea marcha en formación.
      pace: 1.1 + roll(seed, id, 4) * 0.7,
      // Y cada uno con sus ganas de hablar. Esto es el carácter, en pequeño:
      // en el juego saldría de `traits`, aquí de un dado.
      sociable: roll(seed, id, 5),
      temper: roll(seed, id, 6),
      goal: null,
      talkingTo: null,
      bout: null,
      role: null,
      talkUntil: 0,
      shoveAt: 0,
      reelUntil: 0,
      paidBack: false,
      cooldown: 0,
    });
  }
  return {
    seed, width: WIDTH, height: HEIGHT,
    obstacles: HOUSES, haunts: HAUNTS,
    bodies, steps: 0, chats: 0, shoves: 0, bumps: 0,
  };
}

// ---------------------------------------------------------------------------
// El paso
// ---------------------------------------------------------------------------

/** A qué distancia se oye a alguien y se le puede saludar. */
const EARSHOT = 1.9;
/**
 * A qué distancia se ponen dos que hablan.
 *
 * Ni pegados ni a gritos. La primera versión dejaba a los que hablaban quietos
 * donde les pillara y se saltaba el apartarse, así que dos que se enganchaban
 * muy juntos se quedaban metidos el uno en el otro: medido, 0,29 celdas entre
 * centros con radios de 0,32. Ahora se colocan, que además es lo que hace la
 * gente — uno se para y el otro se acerca hasta donde se oye sin levantar la voz.
 */
const CHAT_GAP = 0.95;
/** Lo que dura una charla, en segundos escénicos. */
const CHAT = [3, 9] as const;
/** Lo que se tarda en volver a tener ganas de parar con alguien. */
const COOLDOWN = 14;
/**
 * A qué distancia se planta uno para empujar a otro. Más cerca que para hablar:
 * encararse **es** acercarse más de la cuenta, y eso ya se lee antes del empujón.
 */
const SHOVE_GAP = 0.72;
/** Lo que se tarda en soltarlo desde que se plantan. El instante de tensión. */
const WIND_UP = 0.7;
/** Lo que dura el encontronazo entero, empujón y recomposición incluidos. */
const BOUT = 3.4;
/**
 * La fuerza del empujón, en celdas por segundo.
 *
 * TUNE: 2,8. Tiene que verse —por debajo de dos parece un roce— y no puede
 * teletransportar: a treinta pasos por segundo son menos de diez centésimas de
 * celda por paso, o sea que el trastabilleo sigue siendo movimiento continuo y
 * no un salto. Es el mismo límite que vigila la prueba de los saltos.
 */
const SHOVE_PUSH = 2.8;
/** Lo que se tarda en recomponerse tras recibirlo. */
const REEL = 0.75;
/** A partir de qué genio salta uno. Por debajo, se aguanta y sigue su camino. */
const HOT_ENOUGH = 0.62;
/** Y cuánto salta el que pasa de ahí, por encuentro. */
const SHOVE_ODDS = 0.22;
/** A qué distancia se considera llegado un destino. */
const ARRIVED = 0.55;
/** Desde dónde se empieza a frenar, para no clavar el freno al llegar. */
const BRAKE = 2.2;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Si este punto cae dentro de una casa. */
export function inside(world: World, x: number, z: number, margin = 0): boolean {
  for (const o of world.obstacles) {
    if (x > o.x - margin && x < o.x + o.w + margin
      && z > o.z - margin && z < o.z + o.h + margin) return true;
  }
  return false;
}

/** Elige adónde ir ahora: un sitio de los de siempre, y no el que ya pisa. */
function pickGoal(world: World, body: Body): Point {
  const draw = roll(world.seed, body.id, 1000 + world.steps);
  const options = world.haunts.filter((h) => distance(h, body) > 3);
  const pool = options.length > 0 ? options : world.haunts;
  return pool[Math.floor(draw * pool.length) % pool.length] as Point;
}

/**
 * Un paso de la vida de todos. **Éste es el fichero entero, en realidad.**
 *
 * El orden importa y es siempre el mismo, que es lo que hace esto reproducible:
 * primero se decide, luego se empuja, luego se mueve, y sólo al final se mira
 * quién se ha encontrado con quién.
 */
export function step(world: World): void {
  const now = world.steps * STEP;

  for (const body of world.bodies) {
    // 1 · ¿Sigue la charla? Cuando se acaba, cada uno a lo suyo y con el otro
    //     fresco en la memoria un rato, para no volver a engancharse al paso.
    let partner: Body | null = null;
    if (body.talkingTo !== null) {
      const other = world.bodies[body.talkingTo];
      if (other === undefined || now >= body.talkUntil) {
        body.talkingTo = null;
        body.bout = null;
        body.role = null;
        body.paidBack = false;
        body.cooldown = now + COOLDOWN;
      } else {
        partner = other;
      }
    }

    // 1b · El empujón, cuando toca soltarlo. Se planta, se encara, y al cabo de
    //      un instante de tensión lo suelta: el otro sale despedido hacia atrás
    //      y pierde el gobierno de sus piernas un momento.
    //
    //      **No se teletransporta a nadie**: lo que el empujón hace es dar
    //      velocidad, y la velocidad la integra el mismo paso que todo lo demás.
    //      Por eso el trastabilleo se ve como un trastabilleo.
    if (partner !== null && body.bout === 'shove' && body.role === 'gives'
      && body.shoveAt > 0 && now >= body.shoveAt) {
      const gap = Math.max(1e-6, distance(partner, body));
      partner.vx = (partner.x - body.x) / gap * SHOVE_PUSH;
      partner.vz = (partner.z - body.z) / gap * SHOVE_PUSH;
      partner.reelUntil = now + REEL;
      body.shoveAt = 0;
      world.shoves += 1;

      // Y el que lo recibe decide si lo devuelve. Una vez, no una trifulca: en
      // el juego, si esto llegara a más, lo diría el motor y no el empujón.
      if (!partner.paidBack) {
        const back = roll(world.seed, partner.id * 31 + body.id, world.steps);
        if (back < partner.temper * 0.8) {
          partner.paidBack = true;
          partner.role = 'gives';
          partner.shoveAt = now + REEL + WIND_UP * 0.6;
          body.role = 'takes';
        }
      }
    }

    // 1c · Trastabillando: las piernas no obedecen. Se deja correr la velocidad
    //      que le dieron, frenando, y no se decide nada.
    if (now < body.reelUntil) {
      body.vx *= 0.94;
      body.vz *= 0.94;
      body.x += body.vx * STEP;
      body.z += body.vz * STEP;
      body.x = Math.max(0.5, Math.min(world.width - 0.5, body.x));
      body.z = Math.max(0.5, Math.min(world.height - 0.5, body.z));
      if (partner !== null) {
        const look = Math.atan2(partner.x - body.x, partner.z - body.z);
        let turn = look - body.facing;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        body.facing += turn * 0.12;
      }
      continue;
    }

    let dx = 0;
    let dz = 0;

    if (partner !== null) {
      // 2a · Hablando: **colocarse**, no congelarse. Se busca la distancia de
      //      conversación, acercándose si se está lejos y apartándose si se ha
      //      quedado encima. Y siguen valiendo el empujón de los demás y el de
      //      las paredes, que es lo que impide que dos charlando se solapen.
      const gap = distance(partner, body);
      const want = body.bout === 'shove' ? SHOVE_GAP : CHAT_GAP;
      if (gap > 1e-6) {
        const off = (gap - want) / Math.max(want, gap);
        // El que va a empujar se acerca con más decisión que el que charla.
        const urge = body.bout === 'shove' ? 1.7 : 1;
        dx = (partner.x - body.x) / gap * off * body.pace * urge;
        dz = (partner.z - body.z) / gap * off * body.pace * urge;
      }
    } else {
      // 2b · Si no hay a dónde ir, o ya se llegó, se elige sitio nuevo.
      if (body.goal === null || distance(body.goal, body) < ARRIVED) {
        body.goal = pickGoal(world, body);
      }
      // 3 · Ir hacia allí, frenando al acercarse.
      const gap = distance(body.goal, body);
      const want = body.pace * Math.min(1, gap / BRAKE);
      dx = (body.goal.x - body.x) / Math.max(1e-6, gap) * want;
      dz = (body.goal.z - body.z) / Math.max(1e-6, gap) * want;
    }

    // 4 · Apartarse de quien viene. **Esto es lo que `lane` emulaba**, y aquí
    //     sale solo: dos cuerpos no pueden estar en el mismo sitio, así que se
    //     empujan. No hace falta repartir carriles porque no hay carriles.
    for (const other of world.bodies) {
      if (other.id === body.id) continue;
      const apart = distance(other, body);
      // A quien se le está hablando se le respeta la distancia de charla; a
      // cualquier otro, la de no chocar.
      const touching = other.id === body.talkingTo
        ? body.radius + other.radius
        : body.radius + other.radius + 0.25;
      if (apart >= touching || apart < 1e-6) continue;
      const push = (touching - apart) / touching;
      dx += (body.x - other.x) / apart * push * body.pace * 1.8;
      dz += (body.z - other.z) / apart * push * body.pace * 1.8;
      if (apart < body.radius + other.radius) world.bumps += 1;
    }

    // 5 · Y de las paredes, por lo mismo. `detour` y `aroundWalls` eran esto
    //     escrito a mano sobre una ruta que no podía cambiar.
    for (const o of world.obstacles) {
      const nx = Math.max(o.x, Math.min(body.x, o.x + o.w));
      const nz = Math.max(o.z, Math.min(body.z, o.z + o.h));
      const apart = Math.hypot(body.x - nx, body.z - nz);
      const clear = body.radius + 0.6;
      if (apart >= clear) continue;
      if (apart < 1e-6) { dx += 1; continue; }
      const push = (clear - apart) / clear;
      dx += (body.x - nx) / apart * push * body.pace * 3.2;
      dz += (body.z - nz) / apart * push * body.pace * 3.2;
    }

    // 6 · Suavizado: la velocidad persigue a lo que se quiere, no salta a ello.
    body.vx += (dx - body.vx) * 0.22;
    body.vz += (dz - body.vz) * 0.22;

    const speed = Math.hypot(body.vx, body.vz);
    if (speed > body.pace * 1.6) {
      body.vx = body.vx / speed * body.pace * 1.6;
      body.vz = body.vz / speed * body.pace * 1.6;
    }

    body.x += body.vx * STEP;
    body.z += body.vz * STEP;
    body.x = Math.max(0.5, Math.min(world.width - 0.5, body.x));
    body.z = Math.max(0.5, Math.min(world.height - 0.5, body.z));

    // 7 · La cara va hacia donde se anda, y no de un tirón. Quien habla mira a
    //     quien le habla: es la mitad de lo que hace que dos parados parezcan
    //     dos conversando en vez de dos parados.
    if (partner !== null) {
      const look = Math.atan2(partner.x - body.x, partner.z - body.z);
      let turn = look - body.facing;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      body.facing += turn * 0.25;
    } else if (speed > 0.05) {
      const heading = Math.atan2(body.vx, body.vz);
      let turn = heading - body.facing;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      body.facing += turn * 0.18;
    }
  }

  // 8 · Y después de mover a todos, **separar a los que hayan quedado
  //     encima**. La fuerza del paso 4 es lo que hace el comportamiento —se
  //     ven venir y se apartan— pero no garantiza nada: dos que llegan a la vez
  //     por caminos opuestos pueden acabar solapados un instante. Esto es la
  //     garantía, y es lo que en un motor de físicas se llama resolver.
  //
  //     Medido sin esto: dos centros a 0,31 celdas con radios de 0,32, o sea un
  //     solape de medio cuerpo que en pantalla se lee como un error de dibujo.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < world.bodies.length; i += 1) {
      for (let j = i + 1; j < world.bodies.length; j += 1) {
        const a = world.bodies[i] as Body;
        const b = world.bodies[j] as Body;
        const apart = distance(a, b);
        const room = a.radius + b.radius;
        if (apart >= room || apart < 1e-6) continue;
        const half = (room - apart) / 2;
        const ux = (b.x - a.x) / apart;
        const uz = (b.z - a.z) / apart;
        a.x -= ux * half; a.z -= uz * half;
        b.x += ux * half; b.z += uz * half;
      }
    }
  }

  // 9 · ¿Quién se ha encontrado con quién? **Esto es lo que hoy no puede
  //     existir**: un encuentro que no estaba escrito al amanecer, sino que
  //     ocurre porque dos cuerpos se han acercado andando.
  for (let i = 0; i < world.bodies.length; i += 1) {
    const a = world.bodies[i] as Body;
    if (a.talkingTo !== null || now < a.cooldown) continue;
    for (let j = i + 1; j < world.bodies.length; j += 1) {
      const b = world.bodies[j] as Body;
      if (b.talkingTo !== null || now < b.cooldown) continue;
      if (distance(a, b) > EARSHOT) continue;

      // **¿Qué clase de encuentro es éste?** Aquí está el carácter decidiendo,
      // que es de donde sale que dos aldeas no se parezcan. Salta el más
      // irascible de los dos, y salta contra quien se le cruza: no hace falta
      // que el otro tenga nada que ver, que es justo como empiezan estas cosas.
      const hot = a.temper > b.temper ? a : b;
      const cold = hot === a ? b : a;
      const spark = roll(world.seed, a.id * 131 + b.id, world.steps + 3);
      // **Con umbral, no proporcional.** La primera versión hacía que empujara
      // todo el mundo un poco —diez a diecisiete encontronazos por jornada, más
      // que charlas: una taberna y no una aldea— porque la probabilidad crecía
      // desde cero con el carácter. Así sólo salta quien tiene mal genio de
      // verdad, y de paso una aldea sin gente de ese temple no pega a nadie en
      // todo el día. Que dos aldeas se distingan en esto es medio encargo.
      const angry = hot.temper > HOT_ENOUGH
        && spark < (hot.temper - HOT_ENOUGH) * SHOVE_ODDS;

      if (angry) {
        const span = BOUT;
        hot.talkingTo = cold.id;
        cold.talkingTo = hot.id;
        hot.bout = 'shove';
        cold.bout = 'shove';
        hot.role = 'gives';
        cold.role = 'takes';
        hot.shoveAt = now + WIND_UP;
        cold.shoveAt = 0;
        hot.talkUntil = now + span;
        cold.talkUntil = now + span;
        hot.goal = null;
        cold.goal = null;
        break;
      }

      // Y si no hay chispa, los dos tienen que querer pararse. Uno solitario
      // deja pasar de largo al más hablador del valle, y eso ya es carácter.
      const dice = roll(world.seed, a.id * 97 + b.id, world.steps);
      const willing = (a.sociable + b.sociable) / 2;
      if (dice > willing * 0.35) continue;

      const span = CHAT[0] + roll(world.seed, a.id + b.id, world.steps + 7) * (CHAT[1] - CHAT[0]);
      a.talkingTo = b.id;
      b.talkingTo = a.id;
      a.bout = 'chat';
      b.bout = 'chat';
      a.role = null;
      b.role = null;
      a.talkUntil = now + span;
      b.talkUntil = now + span;
      a.goal = null;
      b.goal = null;
      world.chats += 1;
      break;
    }
  }

  world.steps += 1;
}

/**
 * Avanza el mundo el tiempo escénico que se le diga, en pasos enteros.
 *
 * El acumulador vive fuera para que ningún resto se pierda entre fotogramas: es
 * lo que hace que la simulación avance igual con treinta fotogramas que con
 * sesenta, y lo que la separa de todo lo que hoy depende del reloj de la pared.
 */
export function advance(world: World, seconds: number, carry: number): number {
  let left = carry + seconds;
  // Tope: un móvil que se atraganta no puede arrastrar media jornada de golpe.
  let budget = 240;
  while (left >= STEP && budget > 0) {
    step(world);
    left -= STEP;
    budget -= 1;
  }
  return left;
}
