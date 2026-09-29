// Encuentro escénico de caza: cuerpos y proyectiles a paso fijo; el resultado
// sale como parte para que el llamante lo entregue al motor al cerrar la semana.
//
// AN-5 (29 sep 2026) · Vera: «que la caza enseñe el golpe; tiene que ser
// natural; cuanto más física y realista, mejor; que pueda fallar, que pueda
// acertar; que impacte». Y la lanza «debe clavarse» en la empalizada, no
// atravesarla. Lo que cambió, y por qué:
//
//   · **el contacto decide** (AN-5b). Flecha, piedra y lanza se barren contra
//     el cuerpo que se pinta de la presa y contra lo que está de pie, en Rapier
//     (`hunt-shot.ts`, `hunt-bodies.ts`). La suerte ya no dice «falla» ni
//     «roza»: el cazador apunta con su pulso —una desviación sembrada— y la
//     presa se mueve; roza el tiro que entra de refilón contra la piel.
//   · **el cazador busca por dónde**: sigue un camino y sólo tira o pincha con
//     la línea libre. Antes iba en línea recta, se quedaba contra un tronco y en
//     los valles medidos ninguna caza con lanza llegaba a darse.
//   · **el golpe va fechado** (AN-5a): la estocada y la suelta empiezan en el
//     paso que deciden, el arma sigue en la mano, y el parte espera a que la
//     escena acabe de verse —la presa cae y se queda, o huye y se va—.
//   · **lo que toca se queda** (AN-5c): la flecha, clavada en la presa, en la
//     madera o en el suelo; la lanza, clavada hasta que se saca; y la presa
//     acusa el golpe.

import type { GameState } from '@engine/state';
import { valleyCore } from '@derive/anchors';
import type { Animal } from '@derive/animals';
import type { ArrowSighting } from '../world/arrows';
import { combatClip, VILLAGER_CLIPS, type ClipName } from '../clips';
import type { HuntSpecies, HuntWeapon } from '@engine/world/hunting';
import { hash32 } from '@engine/rng';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { pathTo } from './navigate';
import { LIFE_STEP } from './clock';
import type { Contact, ContactShape, ContactWorld } from './physics';
import { createWildPrey, escapeFrom, stepWildPrey, wildPreyPosition, type WildKind, type WildPrey } from './wild-prey';
import { PREY_BODY, preyShape } from './hunt-bodies';
import { WARNING_SECONDS } from './bear';
import {
  aimHuntShot, launchHuntShot, RELEASE, SHOT_RADIUS, SHOT_SPEED, stepHuntShot, THRUST, thrustContact, thrustFor, tipReach,
  tipYaw, worldOf, type HuntShot,
} from './hunt-shot';

const HIT_POINTS: Readonly<Record<HuntSpecies, number>> = {
  partridge: 1, rabbit: 1, deer: 1, boar: 2, bear: 4,
};
const SPEED = 1.15;
const HUNTER_RADIUS = 0.3;
/**
 * TUNE: la holgura con que el cazador se mueve y busca camino. El aldeano anda
 * con 0,32 para no rozar fachadas (`village.ts`), y con eso entre los troncos
 * del bosque —uno por celda— no cabía: ningún puesto de tiro sobre un ciervo o
 * un jabalí tenía camino (medido en 7/30: 0 de 10; con 0,25, los 10). Su
 * cuerpo pintado mide 0,19 de medio ancho; 0,22 es el de alguien que se cuela
 * entre árboles.
 */
const NAV_RADIUS = 0.22;
const HUNTER_ID = 80_000;
/**
 * TUNE: 75 s. El cazador sale de donde está (`senales-en-el-mapa`) y puede
 * tener quince celdas de camino; con los 20 s de antes el oso no se alcanzaba
 * nunca desde la aldea (medido en `tools/reports/hunt-report.ts`).
 */
const MAX_DURATION_STEPS = Math.round(75 / LIFE_STEP);
/** Lo que se ve la pieza cobrada antes del parte. */
const CORPSE_STEPS = Math.round(3 / LIFE_STEP);
/** Lo que se ve huir a la presa que se escapa antes de irse. */
const FLEE_AFTER_STEPS = Math.round(3 / LIFE_STEP);
/** Entre tiro y tiro, como antes: el gesto de soltar y coger otra flecha o piedra. */
const SHOT_STEPS = Math.round(2.1 / LIFE_STEP);
/** El arco tensado (o la honda cargada) antes de soltar. TUNE: 0,9 s, más de lo que tarda el ojo en leerlo. */
const DRAW_STEPS = Math.round(0.9 / LIFE_STEP);
const SPEAR_STEPS = Math.round(VILLAGER_CLIPS.spear_thrust.seconds / LIFE_STEP);
/** TUNE: la lanza clavada en la madera, hasta que el cazador la saca. */
const STUCK_STEPS = Math.round(0.8 / LIFE_STEP);
/**
 * Dónde se planta para tirar y hasta dónde tira, en celdas. TUNE: fuera de las
 * cuatro celdas a las que la perdiz y el conejo se espantan (`wild-prey.ts`):
 * plantado a 4,2 y a 3,6, el cazador los levantaba antes de soltar (AN-5,
 * medido: la perdiz con honda, 3 de 60 cobradas).
 */
const RANGE = { bow: { stand: 5, max: 8 }, sling: { stand: 4.5, max: 6.5 } } as const;
/**
 * TUNE, en radianes: el pulso del cazador, la desviación típica del rumbo y la
 * elevación con que sale un tiro o entra una estocada. Sustituye a las tiradas
 * de «falla» y «roza» de la caza sola (27 sep): el fallo sale de apuntar mal,
 * de una presa que se mueve o de un tronco en medio. Ajustado con
 * `tools/reports/hunt-report.ts` (AN-5, `artifacts/physics/AN-5/`).
 */
const AIM_SIGMA: Readonly<Record<HuntWeapon, number>> = { bow: 0.018, sling: 0.028, spear: 0.1 };
/** TUNE: cuánto se equivoca al adelantar a una presa que corre (desviación relativa). */
const LEAD_SIGMA = 0.35;
/** TUNE: un tiro que entra con menos de este coseno contra la piel roza: hiere, no mata. */
const GRAZE_COS = 0.4;
/**
 * TUNE: **dónde entra** decide si mata. El pecho —de la cabeza hasta tres
 * décimas del largo por detrás del centro del tronco— es lo vital; el cuarto
 * trasero hiere y la presa se va (la «malherida» de Vera, 27 sep: «o lo cazas,
 * o se va malherido»). El oso alzado no tiene delante ni detrás: todo es pecho.
 */
const VITAL_BACK = 0.3;
/**
 * TUNE: cuántas celdas de rodeo le vale al cazador tirar de costado y no por la
 * grupa o de frente al elegir puesto. Sin él, la mitad de los ciervos se iban
 * heridos por el cuarto trasero (medido: 16 de 30 en el llano).
 */
const BROADSIDE = 4;
const SMALL_GAME: ReadonlySet<HuntSpecies> = new Set(['partridge', 'rabbit']);
/** Lo que oye la presa: un tiro o una estocada que cae a menos de esto la espanta. */
const NOTICE = 1;
/**
 * TUNE: el ciervo que ve venir al cazador, sin nada en medio, alza la cabeza un
 * momento y sale corriendo. **Cada ciervo es distinto**: uno lo ve a 2,5 celdas
 * y otro a 6,5, y uno tarda medio segundo en arrancar y otro uno y pico (lo
 * siembra el encuentro). Es la suerte de la caza puesta en el animal y no en
 * un dado: al del arco, un ciervo arisco se le va antes de tensar; al de la
 * lanza, le da una carrera que puede perder.
 */
const WARY = { near: 2.5, far: 6.5 } as const;
const ALERT_SECONDS = { short: 0.5, long: 1.3 } as const;
/** El que caza con lanza, cuando el ciervo alza la cabeza, echa a correr. */
const CHARGE = 1.8;
/**
 * TUNE: con lanza hay que llegar al lado, y el cazador se acerca al ciervo al
 * acecho —a seis décimas del paso—, lo que le deja ver a la mitad de distancia.
 */
const STALK = { within: 7, pace: 0.6, seen: 0.5 } as const;
/**
 * TUNE: la presa espantada que no cae llega a su refugio —la mata, la
 * madriguera, el bosque— en unos segundos y se da por ida. Sin esto, un conejo
 * que huía a trompicones alargaba la caza a 45 s de media.
 */
const COVER_STEPS = Math.round(8 / LIFE_STEP);
/** Se escapó: huyendo, más lejos que esto del cazador. */
const ESCAPE = 11;
/** La presa no cuenta su tiempo hasta que el cazador se acerca a esto. */
const NOTICE_RANGE = 8;
/** Cada cuánto se rehace el camino del cazador. */
const PLAN_STEPS = 15;
/** TUNE: el ciervo espantado, al trote largo (dos veces lo que anda). */
const DEER_RUN = 1.8;
/** TUNE, en celdas: cuánto mueve un impacto a cada presa, de la perdiz al oso. */
const KICK: Readonly<Record<HuntSpecies, number>> = { partridge: 0.1, rabbit: 0.1, deer: 0.06, boar: 0.05, bear: 0.03 };
const KICK_STEPS = 6;
/**
 * Cuántos zarpazos aguanta el cazador antes de que el oso se retire, en la
 * caza sola (27 sep 2026, Vera: «o lo cazas, o se va malherido») y tocando.
 * TUNE: con tres el oso no caía nunca en la caza sola (0 de 60), y con el
 * alcance real de la lanza (AN-5b) tampoco tocando.
 */
const BEAR_SWIPES = 4;
/**
 * TUNE: cada cuánto tira un zarpazo el oso, en pasos: **cada oso el suyo**, de
 * 0,9 a 1,6 s (lo siembra el encuentro). Con un ritmo fijo la pelea era un
 * empate de relojes —con tres zarpazos no caía ninguno, con cuatro casi todos—;
 * con el suyo, un oso rápido deja al cazador sin la cuarta estocada. Medido
 * en el llano: con 1,2–2 s caía el 75 %; con 1–1,7 s, el 43 %; así, el 32 %.
 */
const BEAR_CADENCE = { fast: 27, slow: 48 } as const;
/**
 * TUNE: el zarpazo empuja al cazador media celda hacia atrás y lo deja sin
 * clavar lo que dura el golpe recibido (`hit_take`). Sin él, a un palmo del oso
 * la lanza no falla y el oso caía siempre (AN-5, medido: 60 de 60).
 */
const SHOVE = 0.5;
const SHOVE_STEPS = 8;
const STAGGER_STEPS = Math.round(VILLAGER_CLIPS.hit_take.seconds / LIFE_STEP);
/**
 * La presa caída se tumba como la pinta `effects/animal-motion.ts`: de costado,
 * rodando sobre su eje largo un cuarto de vuelta hacia -Z, en unas décimas.
 */
const DOWN_EASE = 0.14;
const DOWN_ROLL = -Math.PI / 2;

export interface HuntReport {
  readonly sourceTick: number;
  readonly species: HuntSpecies;
  readonly weapon: HuntWeapon;
  readonly hits: number;
  readonly killed: boolean;
}

export interface HuntHunterPose {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly facing: number;
  readonly clip: ClipName;
  readonly travelled: number;
  /**
   * AN-5a · El tiempo del gesto, fechado por el hecho: 0 en el paso de la
   * estocada o de la suelta, como `combatClip` en el asalto. Null en andar y
   * reposo, que van por suelo recorrido y por reloj.
   */
  readonly clipSeconds: number | null;
  /** AN-5a · El arma sigue en la mano hasta que la escena acaba de verse. */
  readonly weapon: HuntWeapon;
}

/** AN-5 · Lo que pasó con cada tiro o estocada: el informe, las pruebas y el observatorio. */
export interface HuntStroke {
  readonly step: number;
  readonly kind: 'shot' | 'thrust';
  /** De lleno en lo vital, en el cuarto trasero, de refilón, en algo de pie, en el suelo o en el aire. */
  readonly outcome: 'hit' | 'wound' | 'graze' | 'standing' | 'ground' | 'miss';
}

export interface HuntEncounter {
  readonly weapon: HuntWeapon;
  readonly targetId: number;
  readonly animals: readonly Animal[];
  readonly hunter: HuntHunterPose;
  /** Lo que vuela y lo que se quedó clavado (`stuck`). */
  readonly projectiles: readonly ArrowSighting[];
  readonly completed: HuntReport | null;
  /** AN-5a · El parte está y la escena ya terminó de verse: la presa cayó y se vio, o se fue. */
  readonly settled: boolean;
  readonly strokes: readonly HuntStroke[];
  /**
   * El jugador ordena un golpe; espera a alcance, línea libre y arma lista.
   * `precision` (0 a 1) es la puntería del golpe: con 0 el tiro sale desviado a
   * propósito; con 1, sin temblor. En la caza sola apunta el pulso del cazador.
   * Devuelve `false` si el arma se está recargando, y entonces el toque no cuenta.
   */
  attack(precision?: number): boolean;
  step(wildlife: readonly Animal[]): void;
  /** AN-5b · El mundo de contacto. Hasta que llega, el cazador se acerca pero no tira. */
  attach(world: ContactWorld | null): void;
}

/** Lo clavado. En la presa, en su marco (`local`); en el mundo, donde tocó. */
interface Stuck {
  readonly id: number;
  readonly weapon: 'bow' | 'sling';
  readonly at: { x: number; y: number; z: number };
  readonly dir: { x: number; y: number; z: number };
  readonly local: { at: { x: number; y: number; z: number }; dir: { x: number; y: number; z: number } } | null;
}

function findHunter(land: Terrain, target: Point, seed: number): Point | null {
  const start = hash32(seed, 'hunt-hunter-spawn') % 24;
  for (let n = 0; n < 24; n += 1) {
    const angle = (start + n) * Math.PI / 12;
    for (const distance of [4.2, 3.8, 4.8, 3.4, 5.2]) {
      const at = { x: target.x + Math.cos(angle) * distance,
        z: target.z + Math.sin(angle) * distance };
      if (fitsCircle(land, at.x, at.z, HUNTER_RADIUS)) return at;
    }
  }
  return null;
}

/** El rumbo con que el modelo de un animal mira a `facing` (`animal-motion.ts`: la cabeza en -X). */
const headingOf = (facing: number): number => Math.atan2(Math.cos(facing), -Math.sin(facing));
/** Rotación sobre Y, como la de Three: (x, z) → (x cos + z sin, −x sin + z cos). */
function turnY(p: { x: number; y: number; z: number }, angle: number): { x: number; y: number; z: number } {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}
/** Rotación sobre X (el eje largo del modelo): la presa caída rueda sobre él. */
function rollX(p: { x: number; y: number; z: number }, angle: number): { x: number; y: number; z: number } {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

/**
 * Prepara un encuentro fuera del estado guardado. Las presas comunes se crean
 * en terreno transitable; ciervo y oso deben existir ya en las instantáneas.
 * `ground` devuelve la altura absoluta del suelo en coordenadas de escena.
 */
export function createHuntEncounter(
  state: Readonly<GameState>, land: Terrain, species: HuntSpecies, weapon: HuntWeapon,
  ground: (x: number, z: number) => number, wildlife: readonly Animal[], seed: number,
  den: Point | null = null,
  auto = false,
  /**
   * `hunter`: el cuerpo de un aldeano de verdad, que sale desde donde está
   * (`senales-en-el-mapa`: nadie aparece de la nada). `prey`: la presa que ya
   * estaba a la vista con su señal encima. `world`: el mundo de contacto, si ya
   * está hecho (si no, llega por `attach`). Sin ellos, como antes: un cazador
   * junto a la presa y una presa nueva (las pruebas).
   */
  extras: { hunter?: Body; prey?: WildPrey | null; world?: ContactWorld | null } = {},
): HuntEncounter | null {
  const wild: WildPrey | null = extras.prey !== undefined && extras.prey !== null ? extras.prey
    : species === 'partridge' || species === 'rabbit' || species === 'boar'
    ? createWildPrey(state as GameState, land, seed,
      (() => { const core = valleyCore(state as GameState); return { x: core.x, z: core.y }; })(), species as WildKind)
    : null;
  const initialTarget = wild === null
    ? wildlife.find(animal => animal.kind === species) ?? null
    : null;
  if (wild === null && initialTarget === null) return null;
  const targetId = wild?.body.id ?? initialTarget!.id;
  const initialAt = wild === null
    ? { x: initialTarget!.x, z: initialTarget!.y }
    : { x: wild.body.x, z: wild.body.z };
  const spawn = extras.hunter ?? findHunter(land, initialAt, seed);
  if (spawn === null) return null;

  const hunterBody: Body = extras.hunter ?? { id: HUNTER_ID + (hash32(seed, 'hunt-hunter-id') % 10_000),
    x: spawn.x, z: spawn.z, vx: 0, vz: 0,
    facing: Math.atan2(initialAt.x - spawn.x, initialAt.z - spawn.z),
    radius: HUNTER_RADIUS, pace: SPEED };
  let world: ContactWorld | null = extras.world ?? null;
  const shots: HuntShot[] = [];
  const stuck: Stuck[] = [];
  const strokes: HuntStroke[] = [];
  let stepNumber = 0;
  let travelled = 0;
  let hits = 0;
  /** Lo que cuenta para matar: los toques que no fueron roces. */
  let damage = 0;
  let spooked = false;
  // El oso no se espanta: embiste, y se retira a su cueva por su propia regla.
  const skittish = species !== 'bear';
  let clip: ClipName = weapon === 'spear' ? 'walk' : 'bow_draw';
  /** Desde qué paso corre el gesto de combate que se pinta, y hasta cuándo se queda quieto (la lanza clavada). */
  let gestureSince = 0;
  let holdUntil = -1;
  let drawSince = -1;
  let lastShot = -SHOT_STEPS;
  let lastThrust = -SPEAR_STEPS;
  let thrustClip: ClipName = 'spear_thrust';
  let report: HuntReport | null = null;
  let reportStep = -1;
  let downAt = -1;
  let shotsMade = 0;
  let externalTarget: Animal | null = initialTarget;
  let deerRun: Body | null = null;
  let deerGoal: Point | null = null;
  let alertAt = -1;
  const alertness = hash32(seed, 'hunt:wary') / 4_294_967_296;
  const wary = WARY.near + (WARY.far - WARY.near) * alertness;
  const alertSteps = Math.round((ALERT_SECONDS.short + (ALERT_SECONDS.long - ALERT_SECONDS.short)
    * (hash32(seed, 'hunt:alert') / 4_294_967_296)) / LIFE_STEP);
  /** La primera vez que un golpe o un tiro la tocó o la espantó: desde ahí la presa ya no se va sola. */
  let engagedAt = -1;
  const bearCadence = BEAR_CADENCE.fast + hash32(seed, 'hunt:bear-cadence') % (BEAR_CADENCE.slow - BEAR_CADENCE.fast + 1);
  let bearWounds = 0;
  let lastBearSwipe = -BEAR_CADENCE.slow;
  let bearAction: Animal['action'] = undefined;
  let retreatSince = -1;
  let retreatRoute: Point[] | null = null;
  let requested = false;
  let precision = 1;
  let fired = false;
  let route: Point[] | null = null;
  /** A qué distancia de la presa está el puesto elegido: desde ahí se tira. */
  let standRing = 0;
  let routeFor: Point | null = null;
  let routeAt = -PLAN_STEPS;
  let noticedAt = -1;
  let struckAt = -KICK_STEPS;
  let struckDir = { x: 0, z: 0 };
  let previousTarget: { x: number; y: number; z: number } | null = null;
  let targetVelocity = { x: 0, y: 0, z: 0 };

  /** Una desviación sembrada de media 0 y desviación típica 1 (suma de tres uniformes). */
  let draws = 0;
  const gauss = (what: string): number => {
    let sum = 0;
    for (let n = 0; n < 3; n += 1) sum += hash32(seed, `hunt:${what}:${draws}:${n}`) / 4_294_967_296;
    draws += 1;
    return (sum - 1.5) * 2;
  };
  const sigma = (): number => AIM_SIGMA[weapon] * (auto ? 1 : 1 - precision);

  const currentTarget = (snapshots: readonly Animal[]): Point | null => {
    if (wild !== null) {
      if (wild.phase === 'gone') return null;
      return { x: wild.body.x, z: wild.body.z };
    }
    if (deerRun !== null) return { x: deerRun.x, z: deerRun.z };
    const found = snapshots.find(animal => animal.id === targetId);
    if (found !== undefined && (species !== 'bear' || stepNumber === 0)) externalTarget = found;
    if (found === undefined && species !== 'bear') return null;
    return externalTarget === null ? null : { x: externalTarget.x, z: externalTarget.y };
  };
  const altitudeOf = (): number => wild?.altitude ?? externalTarget?.altitude ?? 0;
  const facingOf = (): number => wild?.body.facing ?? deerRun?.facing ?? externalTarget?.facing ?? 0;
  // Alzado lo que dura su `attack`, el mismo que su aviso en la visita.
  const risen = (): boolean => species === 'bear' && bearAction === 'attack'
    && stepNumber - lastBearSwipe < Math.round(WARNING_SECONDS / LIFE_STEP);
  const shapeAt = (point: Point): ContactShape =>
    preyShape(species, targetId, point.x, point.z, ground(point.x, point.z), facingOf(), altitudeOf(), risen());

  /** La presa caída: cuánto ha rodado ya sobre su costado (0 a 1), como la pinta el render. */
  const downSettle = (): number => {
    if (downAt < 0) return 0;
    const blend = 1 - Math.exp(-(stepNumber - downAt) * LIFE_STEP / DOWN_EASE);
    return blend * blend * (3 - 2 * blend);
  };

  /** La sacudida del impacto: un empujón que se apaga en unas décimas. */
  const kickOf = (): { x: number; z: number } => {
    const fade = Math.max(0, 1 - (stepNumber - struckAt) / KICK_STEPS);
    return { x: struckDir.x * KICK[species] * fade, z: struckDir.z * KICK[species] * fade };
  };

  const animalOutput = (snapshots: readonly Animal[]): Animal[] => {
    const point = currentTarget(snapshots);
    if (point === null) return [];
    if (report !== null && !report.killed && stepNumber - reportStep >= FLEE_AFTER_STEPS) return [];
    if (species === 'bear' && report !== null && !report.killed) return [];
    const kick = kickOf();
    if (wild !== null) {
      if (report?.killed) return [{ id: targetId, kind: species, x: point.x + kick.x, y: point.z + kick.z,
        facing: wild.body.facing, action: 'down' }];
      return wildPreyPosition(wild).map(animal => ({ ...animal, x: animal.x + kick.x, y: animal.y + kick.z }));
    }
    if (deerRun !== null) {
      return [{ id: targetId, kind: species, x: deerRun.x + kick.x, y: deerRun.z + kick.z, facing: deerRun.facing,
        action: report?.killed ? 'down' : undefined }];
    }
    const source = externalTarget;
    // Con rumbo explícito: el render lo gira como la vida lo mira, y lo que
    // lleve clavado cae donde se pinta (`stuckOutput`).
    return source === null ? [] : [{ ...source, x: source.x + kick.x, y: source.y + kick.z, facing: source.facing ?? 0,
      action: report?.killed ? 'down' : species === 'bear' ? bearAction : source.action }];
  };

  /** Lo clavado en la presa sigue a la presa: su sitio, su rumbo y, caída, su costado. */
  const stuckOutput = (): ArrowSighting[] => {
    const point = currentTarget(externalTarget === null ? wildlife : [externalTarget]);
    const kick = kickOf();
    const heading = headingOf(facingOf());
    const settle = downSettle();
    const roll = DOWN_ROLL * settle;
    const origin = point === null ? null
      : { x: point.x + kick.x, y: ground(point.x, point.z) + altitudeOf() + PREY_BODY[species].flank * settle, z: point.z + kick.z };
    const shown = animalOutput(externalTarget === null ? wildlife : [externalTarget]).length > 0;
    const out: ArrowSighting[] = [];
    for (const item of stuck) {
      if (item.local === null) {
        out.push({ id: item.id, weapon: item.weapon, x: item.at.x, y: item.at.y, z: item.at.z,
          vx: item.dir.x, vy: item.dir.y, vz: item.dir.z, stuck: true });
        continue;
      }
      if (origin === null || !shown) continue;
      const at = turnY(rollX(item.local.at, roll), heading);
      const dir = turnY(rollX(item.local.dir, roll), heading);
      out.push({ id: item.id, weapon: item.weapon, x: origin.x + at.x, y: origin.y + at.y, z: origin.z + at.z,
        vx: dir.x, vy: dir.y, vz: dir.z, stuck: true });
    }
    return out;
  };

  const finish = (killed: boolean): void => {
    report = { sourceTick: state.tick, species, weapon, hits, killed };
    reportStep = stepNumber;
    if (clip === 'walk') clip = 'idle';
    if (killed) {
      downAt = stepNumber;
      if (wild !== null) { wild.phase = 'down'; wild.health = 0; }
    }
    hunterBody.vx = 0; hunterBody.vz = 0;
  };

  /** Espanta a la presa: huye del cazador (la suelta y el ciervo, por su cuenta). */
  const spook = (): void => {
    if (!skittish || spooked) return;
    spooked = true;
    if (wild !== null) {
      if (wild.kind === 'boar') { wild.enraged = true; return; }
      wild.phase = 'flee';
      wild.target = escapeFrom(wild.body, wild.home, hunterBody, land);
      wild.fleeSince = Math.max(0, stepNumber - Math.max(0, noticedAt));
    } else if (species === 'deer' && externalTarget !== null) {
      deerRun = { id: targetId, x: externalTarget.x, z: externalTarget.y, vx: 0, vz: 0,
        facing: externalTarget.facing ?? 0, radius: 0.34, pace: DEER_RUN };
      deerGoal = escapeFrom(deerRun, { x: externalTarget.x, z: externalTarget.y }, hunterBody, land);
    }
  };

  /** Lo que un tiro o una estocada le hace a la presa. */
  const strike = (kind: HuntStroke['kind'], contact: Contact | null, dir: { x: number; y: number; z: number },
    shotId: number | null, shotWeapon: 'bow' | 'sling' | null): void => {
    const target = currentTarget(externalTarget === null ? wildlife : [externalTarget]);
    if (contact === null) {
      strokes.push({ step: stepNumber, kind, outcome: 'miss' });
      if (kind === 'thrust') spook();
      return;
    }
    if (contact.surface !== 'body') {
      strokes.push({ step: stepNumber, kind, outcome: contact.surface });
      if (shotId !== null && shotWeapon === 'bow') {
        stuck.push({ id: shotId, weapon: shotWeapon, at: contact.at, dir, local: null });
      }
      if (target !== null && Math.hypot(contact.at.x - target.x, contact.at.z - target.z) < NOTICE) spook();
      return;
    }
    // Dónde entra: el coseno entre la dirección del golpe y la piel. De frente, 1;
    // de refilón, cerca de 0. La piel es la cápsula que se pinta.
    const shape = target === null ? null : shapeAt(target);
    let cos = 1;
    let vital = true;
    if (shape !== null) {
      const axis = shape.upright === true ? { x: 0, y: 1, z: 0 }
        : { x: Math.sin(shape.facing), y: 0, z: Math.cos(shape.facing) };
      const rel = { x: contact.at.x - shape.x, y: contact.at.y - shape.y, z: contact.at.z - shape.z };
      const onAxis = rel.x * axis.x + rel.y * axis.y + rel.z * axis.z;
      const along = Math.max(-shape.halfLength, Math.min(shape.halfLength, onAxis));
      const normal = { x: rel.x - axis.x * along, y: rel.y - axis.y * along, z: rel.z - axis.z * along };
      const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
      cos = -(dir.x * normal.x + dir.y * normal.y + dir.z * normal.z) / length;
      // A cuatro patas el eje va de la cola (-) a la cabeza (+): detrás del pecho,
      // el cuarto trasero. En la caza menor no hay tal: una flecha o una piedra
      // que entra de lleno en una perdiz o un conejo lo tumba.
      vital = SMALL_GAME.has(species) || shape.upright === true
        || onAxis >= -VITAL_BACK * (shape.halfLength + shape.radius);
    }
    const graze = cos < GRAZE_COS;
    hits += 1;
    if (!graze && vital) damage += 1;
    strokes.push({ step: stepNumber, kind, outcome: graze ? 'graze' : vital ? 'hit' : 'wound' });
    const flat = Math.hypot(dir.x, dir.z) || 1;
    struckAt = stepNumber; struckDir = { x: dir.x / flat, z: dir.z / flat };
    if (shotId !== null && shotWeapon === 'bow' && target !== null) {
      // Clavada en su marco: se mueve, gira y cae con ella.
      const heading = headingOf(facingOf());
      const origin = { x: target.x, y: ground(target.x, target.z) + altitudeOf(), z: target.z };
      stuck.push({ id: shotId, weapon: shotWeapon, at: contact.at, dir, local: {
        at: turnY({ x: contact.at.x - origin.x, y: contact.at.y - origin.y, z: contact.at.z - origin.z }, -heading),
        dir: turnY(dir, -heading),
      } });
    }
    if (damage >= HIT_POINTS[species]) { finish(true); return; }
    if (graze || !vital || species === 'boar') spook();
  };

  /**
   * AN-5b · **Desde dónde tirar.** El cazador no va a la presa: va a un puesto
   * alrededor de ella donde cabe, al que se llega andando y desde el que la
   * línea hasta el tronco está libre. En el bosque, con un tronco en cada celda,
   * ir hasta la presa no tenía camino y ninguna caza de ciervo ni de jabalí
   * llegaba a darse (medido en `hunt-report.ts`). Sin puesto, hacia la presa.
   */
  const planRoute = (target: Point, torso: { x: number; y: number; z: number }, rings: readonly number[],
    fromOf: (at: Point, facing: number) => { x: number; y: number; z: number }, radius: number): Point[] | null => {
    // Los anillos van por preferencia (el primero es el puesto bueno); dentro
    // de cada uno, el sitio más cerca del cazador, **mejor de costado**: por la
    // grupa el tiro hiere y no mata (`VITAL_BACK`), y quien caza rodea.
    const axis = facingOf();
    const candidates: { at: Point; ring: number; order: number; cost: number }[] = [];
    rings.forEach((ring, order) => {
      for (let k = 0; k < 16; k += 1) {
        const angle = k * Math.PI / 8;
        const at = { x: target.x - Math.sin(angle) * ring, z: target.z - Math.cos(angle) * ring };
        if (!fitsCircle(land, at.x, at.z, NAV_RADIUS)) continue;
        const facing = Math.atan2(target.x - at.x, target.z - at.z);
        if (world !== null && world.cast(fromOf(at, facing), torso, radius, false) !== null) continue;
        const endOn = Math.abs(Math.cos(facing - axis));
        candidates.push({ at, ring, order,
          cost: Math.hypot(at.x - hunterBody.x, at.z - hunterBody.z) + BROADSIDE * endOn });
      }
    });
    candidates.sort((a, b) => a.order - b.order || a.cost - b.cost);
    let tries = 0;
    for (const { at, ring } of candidates) {
      if (tries++ >= 4) break;
      const path = pathTo(land, hunterBody, at, NAV_RADIUS);
      if (path !== null) { standRing = ring; return path.map(point => ({ x: point.x, z: point.z })); }
    }
    standRing = rings[0] ?? 0;
    return pathTo(land, hunterBody, target, NAV_RADIUS)?.map(point => ({ x: point.x, z: point.z })) ?? null;
  };

  /** El camino del cazador a su puesto, rehecho cada tanto o si la presa se ha movido. */
  const nextWaypoint = (target: Point, torso: { x: number; y: number; z: number }, rings: readonly number[],
    fromOf: (at: Point, facing: number) => { x: number; y: number; z: number }, radius: number): Point => {
    const moved = routeFor === null || Math.hypot(routeFor.x - target.x, routeFor.z - target.z) > 1;
    // Sin camino (la presa al otro lado del agua), no se vuelve a buscar en cada
    // replanteo: recorrer el valle entero para no encontrar nada cuesta.
    const wait = route === null && routeFor !== null ? PLAN_STEPS * 4 : PLAN_STEPS;
    if (stepNumber - routeAt >= wait || (route !== null && moved) || routeFor === null) {
      route = planRoute(target, torso, rings, fromOf, radius);
      routeFor = { ...target };
      routeAt = stepNumber;
    }
    while (route !== null && route.length > 1
      && Math.hypot(route[0]!.x - hunterBody.x, route[0]!.z - hunterBody.z) < 0.25) route.shift();
    return route?.[0] ?? target;
  };

  /** El cuerpo con que se mueve el cazador, con la holgura del que se cuela entre árboles. */
  const moveHunter = (): void => {
    const nav: Body = { ...hunterBody, radius: NAV_RADIUS };
    integrate(nav, land, LIFE_STEP);
    hunterBody.x = nav.x; hunterBody.z = nav.z; hunterBody.vx = nav.vx; hunterBody.vz = nav.vz;
  };

  const walkTo = (point: Point, pace = SPEED): void => {
    const dx = point.x - hunterBody.x, dz = point.z - hunterBody.z;
    const gap = Math.hypot(dx, dz);
    if (gap < 1e-6) { hunterBody.vx = 0; hunterBody.vz = 0; return; }
    hunterBody.vx = pace * dx / gap;
    hunterBody.vz = pace * dz / gap;
    const beforeX = hunterBody.x, beforeZ = hunterBody.z;
    moveHunter();
    travelled += Math.hypot(hunterBody.x - beforeX, hunterBody.z - beforeZ);
    turnTo(hunterBody, Math.atan2(dx, dz), LIFE_STEP);
  };

  /** Los tiros en vuelo, y lo que tocan. */
  const flyShots = (): void => {
    if (world === null) return;
    for (const shot of shots) {
      const speed = Math.hypot(shot.vx, shot.vy, shot.vz) || 1;
      const dir = { x: shot.vx / speed, y: shot.vy / speed, z: shot.vz / speed };
      const contact = stepHuntShot(shot, world);
      if (contact !== null) {
        if (report === null || contact.surface !== 'body') strike('shot', contact, dir, shot.id, shot.weapon);
      } else if (shot.spent) {
        strokes.push({ step: stepNumber, kind: 'shot', outcome: 'miss' });
      }
    }
    for (let i = shots.length - 1; i >= 0; i -= 1) if (shots[i]!.spent) shots.splice(i, 1);
  };

  const stepFleeingDeer = (): void => {
    if (deerRun === null || deerGoal === null) return;
    const dx = deerGoal.x - deerRun.x, dz = deerGoal.z - deerRun.z;
    const gap = Math.hypot(dx, dz);
    if (gap < 0.3) { deerGoal = escapeFrom(deerRun, deerGoal, hunterBody, land); return; }
    deerRun.vx = DEER_RUN * dx / gap; deerRun.vz = DEER_RUN * dz / gap;
    integrate(deerRun, land, LIFE_STEP);
    turnTo(deerRun, Math.atan2(dx, dz), LIFE_STEP);
  };

  const huntStep = (snapshots: readonly Animal[]): void => {
    if (retreatSince >= 0 && species === 'bear' && externalTarget !== null) {
      const home = den ?? initialAt;
      retreatRoute ??= pathTo(land,
        { x: externalTarget.x, z: externalTarget.y }, home, 0.52)?.map(at => ({ x: at.x, z: at.z })) ?? [home];
      while (retreatRoute.length > 0 && Math.hypot(retreatRoute[0]!.x - externalTarget.x,
        retreatRoute[0]!.z - externalTarget.y) < 0.24) retreatRoute.shift();
      const next = retreatRoute[0] ?? home;
      const dx = next.x - externalTarget.x, dz = next.z - externalTarget.y;
      const gap = Math.hypot(dx, dz);
      if ((retreatRoute.length === 0 && gap < 0.24) || stepNumber - retreatSince > 360) {
        finish(false);
        return;
      }
      const x = externalTarget.x + dx / gap * LIFE_STEP * 0.9;
      const z = externalTarget.y + dz / gap * LIFE_STEP * 0.9;
      if (fitsCircle(land, x, z, 0.52)) externalTarget = { ...externalTarget, x, y: z, facing: Math.atan2(dx, dz) };
      bearAction = 'flee';
      clip = 'fall';
      gestureSince = retreatSince;
      return;
    }
    const target = currentTarget(snapshots);
    if (target === null || stepNumber >= MAX_DURATION_STEPS) { finish(false); return; }
    const distance = Math.hypot(target.x - hunterBody.x, target.z - hunterBody.z);
    if (noticedAt < 0 && distance < NOTICE_RANGE) noticedAt = stepNumber;
    // Hasta que el cazador asoma, la presa no gasta su tiempo en el valle; y
    // una vez trabada la caza, ya no se va por aburrimiento: huye o pelea.
    if (engagedAt < 0 && (spooked || hits > 0)) engagedAt = stepNumber;
    const preyClock = noticedAt < 0 ? 0 : (engagedAt < 0 ? stepNumber : engagedAt) - noticedAt;

    if (wild !== null) {
      stepWildPrey(wild, land, seed, preyClock, [{ body: hunterBody }]);
      // La presa espantada que llega a donde huía sigue huyendo, más lejos.
      if (spooked && wild.phase === 'flee' && Math.hypot(wild.target.x - wild.body.x, wild.target.z - wild.body.z) < 0.3) {
        wild.target = escapeFrom(wild.body, wild.home, hunterBody, land);
      }
    } else if (deerRun !== null) {
      stepFleeingDeer();
    } else if (species === 'deer' && externalTarget !== null) {
      // Ve venir al cazador: alza la cabeza un momento y se va.
      const eyes = { x: externalTarget.x, y: ground(externalTarget.x, externalTarget.y) + 0.7, z: externalTarget.y };
      const head = { x: hunterBody.x, y: ground(hunterBody.x, hunterBody.z) + 0.6, z: hunterBody.z };
      const seenAt = weapon === 'spear' ? wary * STALK.seen : wary;
      if (alertAt < 0 && distance < seenAt && world !== null && world.cast(eyes, head, 0.02, false) === null) alertAt = stepNumber;
      if (alertAt >= 0 && stepNumber - alertAt >= alertSteps) spook();
    } else if (species === 'bear' && externalTarget !== null) {
      const dx = hunterBody.x - externalTarget.x;
      const dz = hunterBody.z - externalTarget.y;
      const gap = Math.hypot(dx, dz);
      if (gap > 1.2 && gap < 7) {
        const x = externalTarget.x + dx / gap * LIFE_STEP * 0.72;
        const z = externalTarget.y + dz / gap * LIFE_STEP * 0.72;
        if (fitsCircle(land, x, z, 0.52)) externalTarget = { ...externalTarget, x, y: z, facing: Math.atan2(dx, dz) };
        bearAction = 'charge';
      }
    }
    if (spooked && (distance > ESCAPE || (engagedAt >= 0 && stepNumber - engagedAt > COVER_STEPS
      && !(wild?.enraged === true)))) { finish(false); return; }

    if (auto && !requested) {
      requested = true;
      precision = 1;
    }
    const feet = ground(hunterBody.x, hunterBody.z);
    const shape = shapeAt(target);
    world?.shapes([shape]);
    const torso = { x: shape.x, y: shape.y, z: shape.z };
    // La presa se mueve en las tres: la perdiz que vuela sube y baja.
    targetVelocity = previousTarget === null ? { x: 0, y: 0, z: 0 }
      : { x: (torso.x - previousTarget.x) / LIFE_STEP, y: (torso.y - previousTarget.y) / LIFE_STEP,
        z: (torso.z - previousTarget.z) / LIFE_STEP };
    previousTarget = { ...torso };
    const aimYaw = Math.atan2(target.x - hunterBody.x, target.z - hunterBody.z);

    if (weapon === 'spear') {
      // La estocada que llega: la que clava más cerca del centro del tronco.
      const variant = thrustFor(shape.y - ground(target.x, target.z));
      const reach = tipReach(variant) + shape.radius - 0.08;
      const thrustFacing = aimYaw - tipYaw(variant);
      const hand = worldOf(hunterBody, feet, thrustFacing, THRUST[variant].hand);
      const clear = world !== null && world.cast(hand, torso, 0.03, false) === null;
      const inReach = distance <= reach + 0.1;
      const ready = stepNumber - lastThrust >= SPEAR_STEPS && stepNumber >= holdUntil
        && stepNumber - lastBearSwipe >= STAGGER_STEPS;
      // El empujón del zarpazo, por el suelo y contra lo que haya.
      if (stepNumber - lastBearSwipe < SHOVE_STEPS && externalTarget !== null) {
        const away = Math.atan2(hunterBody.x - externalTarget.x, hunterBody.z - externalTarget.y);
        hunterBody.vx = Math.sin(away) * SHOVE / (SHOVE_STEPS * LIFE_STEP);
        hunterBody.vz = Math.cos(away) * SHOVE / (SHOVE_STEPS * LIFE_STEP);
        moveHunter();
      }
      // El zarpazo recibido se ve entero, salvo que una estocada lo corte.
      const hurt = stepNumber - lastBearSwipe < Math.round(VILLAGER_CLIPS.hit_take.seconds / LIFE_STEP)
        && lastBearSwipe > lastThrust;
      const thrusting = stepNumber < Math.max(lastThrust + SPEAR_STEPS, holdUntil);
      if (!inReach || (!clear && world !== null)) {
        // Al ciervo, al acecho; con el ciervo alerta, a la carrera: o llega
        // antes de que arranque, o lo pierde.
        const stalking = species === 'deer' && alertAt < 0 && !spooked && distance < STALK.within;
        const pace = alertAt >= 0 && !spooked ? SPEED * CHARGE : stalking ? SPEED * STALK.pace : SPEED;
        if (stepNumber >= holdUntil) {
          walkTo(nextWaypoint(target, torso, [reach - 0.05, reach - 0.2], (at, facing) =>
            worldOf(at, ground(at.x, at.z), facing - tipYaw(variant), THRUST[variant].hand), 0.03), pace);
        }
        clip = hurt ? 'hit_take' : thrusting ? thrustClip : alertAt >= 0 && !spooked ? 'flee' : 'walk';
        if (hurt) gestureSince = lastBearSwipe;
      } else {
        hunterBody.vx = 0; hunterBody.vz = 0;
        if (stepNumber >= holdUntil) turnTo(hunterBody, thrustFacing, LIFE_STEP);
        clip = hurt ? 'hit_take' : thrusting ? thrustClip : 'idle';
        if (hurt) gestureSince = lastBearSwipe;
        if (requested && ready && world !== null) {
          // El pulso: la estocada entra torcida lo que tiemble la mano; con la
          // puntería a cero, a propósito fuera.
          const facing = thrustFacing + (precision <= 0 && !auto ? 0.9 : sigma() * gauss('thrust'));
          hunterBody.facing = facing;
          const contact = thrustContact(world, hunterBody, feet, facing, variant);
          const tip = worldOf(hunterBody, feet, facing, THRUST[variant].tip);
          const length = Math.hypot(tip.x - hand.x, tip.y - hand.y, tip.z - hand.z) || 1;
          strike('thrust', contact, { x: (tip.x - hand.x) / length, y: (tip.y - hand.y) / length, z: (tip.z - hand.z) / length }, null, null);
          // En la madera o en la tierra la lanza se clava, y hay que sacarla.
          if (contact !== null && contact.surface !== 'body') holdUntil = stepNumber + STUCK_STEPS;
          lastThrust = stepNumber;
          gestureSince = stepNumber;
          fired = true;
          requested = auto;
          thrustClip = THRUST[variant].clip;
          clip = thrustClip;
        }
      }
    } else {
      const range = RANGE[weapon];
      const from = worldOf(hunterBody, feet, aimYaw, RELEASE[weapon]);
      const clear = world !== null && world.cast(from, torso, SHOT_RADIUS[weapon], false) === null;
      const inPlace = distance <= Math.max(range.stand, standRing) + 0.15 || (spooked && distance <= range.max);
      const loosing = stepNumber - lastShot < Math.round(VILLAGER_CLIPS.bow_loose.seconds / LIFE_STEP);
      if (!(inPlace && clear)) {
        drawSince = -1;
        const rings = [range.stand, range.stand - 1, range.stand + 1, range.stand - 2, range.stand + 2]
          .filter(ring => ring >= 1.5 && ring <= range.max);
        walkTo(nextWaypoint(target, torso, rings, (at, facing) =>
          worldOf(at, ground(at.x, at.z), facing, RELEASE[weapon]), SHOT_RADIUS[weapon]));
        clip = loosing ? 'bow_loose' : 'walk';
      } else {
        hunterBody.vx = 0; hunterBody.vz = 0;
        turnTo(hunterBody, aimYaw, LIFE_STEP);
        const ready = stepNumber - lastShot >= SHOT_STEPS;
        if (ready && drawSince < 0) { drawSince = stepNumber; gestureSince = stepNumber; }
        if (loosing) clip = 'bow_loose';
        else if (drawSince >= 0) clip = 'bow_draw';
        else clip = 'idle';
        if (requested && ready && drawSince >= 0 && stepNumber - drawSince >= DRAW_STEPS) {
          hunterBody.facing = aimYaw;
          const release = worldOf(hunterBody, feet, aimYaw, RELEASE[weapon]);
          // Adelanta a la presa que corre lo que tarda en llegar el tiro, con su error.
          const flight = Math.hypot(torso.x - release.x, torso.z - release.z) / SHOT_SPEED[weapon];
          const lead = flight * (1 + (auto ? LEAD_SIGMA * gauss('lead') : 0));
          let aim = { x: torso.x + targetVelocity.x * lead, y: torso.y + targetVelocity.y * lead,
            z: torso.z + targetVelocity.z * lead };
          if (precision <= 0 && !auto) {
            // Con la puntería a cero, desviado a propósito: de lado, perpendicular a la línea.
            const lx = aim.x - release.x, lz = aim.z - release.z, along = Math.hypot(lx, lz) || 1;
            const side = shotsMade % 2 === 0 ? 1 : -1;
            aim = { x: aim.x - (lz / along) * 1.1 * side, y: aim.y, z: aim.z + (lx / along) * 1.1 * side };
          }
          let velocity = aimHuntShot(release, aim, weapon);
          if (velocity !== null) {
            const spread = sigma();
            const yaw = spread * gauss('yaw');
            const pitch = spread * gauss('pitch');
            const flat = Math.hypot(velocity.x, velocity.z);
            const speed = Math.hypot(flat, velocity.y);
            const elevation = Math.atan2(velocity.y, flat) + pitch;
            const heading = Math.atan2(velocity.x, velocity.z) + yaw;
            velocity = { x: Math.sin(heading) * Math.cos(elevation) * speed, y: Math.sin(elevation) * speed,
              z: Math.cos(heading) * Math.cos(elevation) * speed };
          }
          const shot = launchHuntShot(release, velocity, weapon, hunterBody.id, 100_000 + shotsMade);
          if (shot !== null) {
            shotsMade += 1;
            shots.push(shot);
            lastShot = stepNumber;
            gestureSince = stepNumber;
            drawSince = -1;
            fired = true;
            requested = auto;
            clip = 'bow_loose';
          }
        }
      }
    }

    flyShots();
    if (report !== null) return;
    if (species === 'bear' && externalTarget !== null
      && Math.hypot(externalTarget.x - hunterBody.x, externalTarget.y - hunterBody.z) < 1.35
      && stepNumber - lastBearSwipe >= bearCadence) {
      bearAction = 'attack';
      lastBearSwipe = stepNumber;
      bearWounds += 1;
      // El zarpazo que cae en el mismo paso que una estocada no la borra: se
      // ve la estocada en su contacto, y el golpe recibido después.
      if (lastThrust !== stepNumber) { clip = 'hit_take'; gestureSince = stepNumber; }
      // AN-5b · Igual en la caza sola que tocando: con el alcance real de la
      // lanza el cazador tiene que ponerse al lado del oso y encaja el primer
      // zarpazo antes de clavar; con tres, la cuarta estocada no llegaba nunca.
      if (bearWounds >= BEAR_SWIPES) retreatSince = stepNumber;
    }
  };

  /** Después del parte: la pieza caída se queda, la que se escapa sigue huyendo, lo que vuela aterriza. */
  const aftermathStep = (): void => {
    if (report === null) return;
    if (!report.killed && stepNumber - reportStep < FLEE_AFTER_STEPS) {
      if (wild !== null && wild.phase !== 'gone') stepWildPrey(wild, land, seed, Math.max(0, stepNumber - Math.max(0, noticedAt)), [{ body: hunterBody }]);
      if (deerRun !== null) stepFleeingDeer();
    }
    flyShots();
    const gesture = combatClip(clip) ? VILLAGER_CLIPS[clip].seconds : 0;
    if (combatClip(clip) && clip !== 'fall' && (stepNumber - Math.max(gestureSince, holdUntil)) * LIFE_STEP >= gesture) clip = 'idle';
  };

  return {
    weapon,
    targetId,
    get animals() { return animalOutput(externalTarget === null ? wildlife : [externalTarget]); },
    get hunter() {
      // `stepNumber` ya cuenta el paso dado: el hecho de este paso es t = 0,
      // como `castOf` con `combat.since`. La lanza clavada se queda en su
      // contacto hasta que se saca, y la retirada corre desde entonces.
      let clipSeconds: number | null = null;
      if (combatClip(clip)) {
        const stuckThrust = (clip === 'spear_thrust' || clip === 'spear_thrust_high') && holdUntil > gestureSince;
        const elapsed = stuckThrust ? Math.max(0, stepNumber - 1 - holdUntil) : Math.max(0, stepNumber - 1 - gestureSince);
        const motion = VILLAGER_CLIPS[clip];
        const seconds = elapsed * LIFE_STEP;
        clipSeconds = motion.loop ? seconds % motion.seconds : Math.min(motion.seconds, seconds);
      }
      return { id: hunterBody.id, x: hunterBody.x, z: hunterBody.z,
        facing: hunterBody.facing, clip, travelled, clipSeconds, weapon };
    },
    get projectiles() {
      const flying: ArrowSighting[] = shots.map(shot => ({ id: shot.id, x: shot.x, y: shot.y, z: shot.z,
        vx: shot.vx, vy: shot.vy, vz: shot.vz, weapon: shot.weapon }));
      return [...flying, ...stuckOutput()];
    },
    get completed() { return report; },
    get settled() {
      if (report === null) return false;
      const after = stepNumber - reportStep;
      if (report.killed) return after >= CORPSE_STEPS && shots.length === 0;
      if (species === 'bear') return true;
      return after >= FLEE_AFTER_STEPS && shots.length === 0;
    },
    get strokes() { return strokes; },
    attack(aim = 1) {
      if (report !== null || retreatSince >= 0) return false;
      const recovery = weapon === 'spear' ? SPEAR_STEPS : SHOT_STEPS;
      if (fired && stepNumber - (weapon === 'spear' ? lastThrust : lastShot) < recovery) return false;
      requested = true;
      precision = Math.max(0, Math.min(1, aim));
      return true;
    },
    attach(next) { world = next; },
    step(snapshots: readonly Animal[]): void {
      if (report !== null) aftermathStep();
      else huntStep(snapshots);
      stepNumber += 1;
    },
  };
}
