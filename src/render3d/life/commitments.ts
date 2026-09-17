// IA-2 · El registro de compromisos. design.md Anexo E, docs/life-ai-proposal.md §8.
//
// **Lo que faltaba, según IA-0 §2**: dos mecanismos parciales y separados
// (`taken`/`noSeats` para el aforo de las ofertas, y `Dweller.scene` para las
// escenas de dos) y ninguno de los dos con propuesta, reserva atómica de dos
// actores y dos sitios, caducidad o liberación idempotente. Esto es esa pieza
// que faltaba: **quién puede empezar algo con quién, ahora mismo, y hasta
// cuándo** — no mueve un solo cuerpo (eso lo sigue haciendo `scenes.ts`) ni
// decide quién quiere qué (eso lo sigue haciendo `decide.ts`).
//
// Los tres contratos de abajo están **congelados** por
// `docs/life-ai-implementation-prompt.md`: se copian tal cual, no se
// rediseñan. El resto de este fichero — la forma del registro — no lo está,
// porque el brief sólo nombra esos tres tipos como cerrados.

import type { Point } from './body';

// ---------------------------------------------------------------------------
// Contratos congelados. Copiados tal cual del brief; no tocar su forma.
// ---------------------------------------------------------------------------

export type ActorRef =
  | { kind: 'villager'; id: number }
  | { kind: 'beast'; id: number };

export type InteractionKind =
  | 'greet' | 'chat' | 'yield' | 'give' | 'play'
  | 'feed' | 'pet' | 'chase';

export interface InteractionProposal {
  id: string;
  kind: InteractionKind;
  initiator: ActorRef;
  recipient: ActorRef;
  spots: readonly [Point, Point];
  expiresAtStep: number;
}

export interface InteractionLease {
  id: string;
  participants: readonly [ActorRef, ActorRef];
  spots: readonly [Point, Point];
  expiresAtStep: number;
}

// ---------------------------------------------------------------------------
// Identidad de un actor, para poder usarlo como clave de mapa.
// ---------------------------------------------------------------------------

/** La clave con la que se guarda un actor, sea persona o bestia. */
export function actorKey(actor: ActorRef): string {
  return `${actor.kind}:${actor.id}`;
}

/** Si dos referencias señalan al mismo cuerpo. */
function sameActor(a: ActorRef, b: ActorRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

// ---------------------------------------------------------------------------
// El compás de una interacción, de principio a fin. §8 del brief:
// «propuesta → aceptación/reserva → aproximación → acción → recuperación →
// liberación». La reserva ya deja el compromiso en pie (aceptado); lo que
// este tipo recorre es lo que pasa mientras sigue vivo.
// ---------------------------------------------------------------------------

export type CommitmentStage = 'approach' | 'act' | 'recover';

/**
 * Un compromiso ya concedido, con todo lo que el registro necesita recordar.
 *
 * `kind` es un `string` y no `InteractionKind` a propósito: `chat`, `shove` y
 * `brawl` (`scenes.ts`, `SceneKind`) también pasan por este mismo registro
 * —es lo que unifica la liberación que hoy está escrita a mano y duplicada en
 * `village.ts`— y `shove`/`brawl` no son interacciones del catálogo de §8, son
 * el mecanismo de conflicto que ya existía antes de esta fase. `tryReserve`
 * sigue exigiendo `InteractionKind` de verdad para lo que sí es una propuesta
 * del catálogo nuevo; `reserveRaw` es la puerta de atrás para lo que ya
 * existía y no encaja en ese enum sin inventárselo.
 */
interface Commitment {
  readonly id: string;
  readonly kind: string;
  readonly participants: readonly [ActorRef, ActorRef];
  readonly spots: readonly [Point, Point];
  readonly expiresAtStep: number;
  readonly since: number;
  stage: CommitmentStage;
}

/**
 * Cuánto tienen que separarse dos sitios reservados para no pisarse.
 *
 * TUNE: 0,5 celdas. Menos que la distancia a la que dos personas conversan
 * (`CHAT_GAP` en `scenes.ts`, 0,95) para no bloquear dos charlas legítimas que
 * pasan a estar cerca por casualidad, y más que el margen de un empujón
 * (`SHOVE_GAP`, 0,72, no — por debajo) porque lo que este número protege no es
 * la charla en sí —eso ya lo hace `busy()` por actor— sino los sitios
 * sintéticos de un solo uso (el paso a un lado de `yield`) que dos parejas
 * distintas podrían elegir casi en el mismo punto si no se comprobara.
 */
const SPOT_CLEARANCE = 0.5;

function spotsClash(a: readonly [Point, Point], b: readonly [Point, Point]): boolean {
  for (const p of a) {
    for (const q of b) {
      if (Math.hypot(p.x - q.x, p.z - q.z) < SPOT_CLEARANCE) return true;
    }
  }
  return false;
}

/**
 * El registro común de propuestas y reservas. §8 del brief, con la forma que
 * hace falta para que `village.ts` deje de llevar la cuenta a mano.
 *
 * No es `InteractionRegistry` de `docs/life-ai-proposal.md` calcado: ese
 * contrato no está en la lista de los tres que el brief congela, así que
 * aquí se amplía con lo que de verdad hace falta (`reserveRaw`, `stageOf`,
 * `advance`, `get`, `entries`) sin dejar de cumplir lo que sí pide —
 * `tryReserve` atómico, `release` idempotente, `expire`, `busy`.
 */
export interface CommitmentRegistry {
  /** Concede o rechaza una propuesta del catálogo §8. Atómico: o quedan los
   *  dos actores y los dos sitios reservados, o no queda nada. */
  tryReserve(proposal: InteractionProposal, step: number): InteractionLease | null;
  /**
   * La misma reserva atómica, para lo que no encaja en `InteractionKind`
   * (`shove`, `brawl`: el mecanismo de conflicto que ya existía). Mismo
   * criterio de admisión, mismo almacén, misma liberación.
   */
  reserveRaw(
    kind: string,
    participants: readonly [ActorRef, ActorRef],
    spots: readonly [Point, Point],
    expiresAtStep: number,
    step: number,
    id: string,
  ): InteractionLease | null;
  /** Suelta un compromiso por id. Idempotente: si ya no está, no hace nada. */
  release(id: string): void;
  /** Suelta todo lo que haya caducado a este paso o antes. */
  expire(step: number): void;
  /** Si este actor está ahora mismo en algún compromiso. */
  busy(actor: ActorRef): boolean;
  /** El compromiso de este actor ahora mismo, si tiene. */
  of(actor: ActorRef): Commitment | undefined;
  /** Un compromiso por id, para leer su `kind`/`stage`/`spots`. */
  get(id: string): Commitment | undefined;
  /** En qué compás va un compromiso, o nada si ya no existe. */
  stageOf(id: string): CommitmentStage | null;
  /** Avanza el compás de un compromiso vivo. No hace nada si ya no existe. */
  advance(id: string, stage: CommitmentStage): void;
  /** Todos los compromisos vivos ahora mismo, de sólo lectura. */
  entries(): readonly Commitment[];
}

export function createCommitmentRegistry(): CommitmentRegistry {
  const byId = new Map<string, Commitment>();
  const byActor = new Map<string, string>(); // actorKey -> commitment id

  function admit(
    kind: string,
    participants: readonly [ActorRef, ActorRef],
    spots: readonly [Point, Point],
    expiresAtStep: number,
    step: number,
    id: string,
  ): InteractionLease | null {
    // **Todo se comprueba antes de tocar nada** — es lo que hace atómica la
    // reserva: una condición que falla a mitad de camino, con la primera mitad
    // ya escrita, es justo el «medio compromiso puesto» que el brief prohíbe.
    if (byId.has(id)) return null;
    if (expiresAtStep <= step) return null;
    if (sameActor(participants[0], participants[1])) return null;
    for (const actor of participants) {
      if (byActor.has(actorKey(actor))) return null;
    }
    for (const other of byId.values()) {
      if (spotsClash(spots, other.spots)) return null;
    }

    const entry: Commitment = {
      id, kind, participants, spots, expiresAtStep, since: step, stage: 'approach',
    };
    byId.set(id, entry);
    for (const actor of participants) byActor.set(actorKey(actor), id);
    return { id, participants, spots, expiresAtStep };
  }

  return {
    tryReserve(proposal, step) {
      return admit(
        proposal.kind,
        [proposal.initiator, proposal.recipient],
        proposal.spots,
        proposal.expiresAtStep,
        step,
        proposal.id,
      );
    },

    reserveRaw(kind, participants, spots, expiresAtStep, step, id) {
      return admit(kind, participants, spots, expiresAtStep, step, id);
    },

    release(id) {
      const entry = byId.get(id);
      if (entry === undefined) return; // ya suelto: llamar dos veces no empeora nada.
      byId.delete(id);
      for (const actor of entry.participants) {
        // Sólo se borra la entrada si de verdad apunta a este compromiso: si
        // por lo que sea el actor ya quedó reasignado a otro (no debería
        // pasar, `admit` lo impide), liberar el viejo no puede arrastrarse el
        // nuevo.
        if (byActor.get(actorKey(actor)) === id) byActor.delete(actorKey(actor));
      }
    },

    expire(step) {
      for (const entry of [...byId.values()]) {
        if (entry.expiresAtStep <= step) this.release(entry.id);
      }
    },

    busy(actor) {
      return byActor.has(actorKey(actor));
    },

    of(actor) {
      const id = byActor.get(actorKey(actor));
      return id === undefined ? undefined : byId.get(id);
    },

    get(id) {
      return byId.get(id);
    },

    stageOf(id) {
      return byId.get(id)?.stage ?? null;
    },

    advance(id, stage) {
      const entry = byId.get(id);
      if (entry !== undefined) entry.stage = stage;
    },

    entries() {
      return [...byId.values()];
    },
  };
}

// ---------------------------------------------------------------------------
// Orden canónico y resolución por lotes.
// ---------------------------------------------------------------------------

/**
 * La clave con la que se ordenan dos propuestas del mismo paso.
 *
 * **Por los ids de los actores, nunca por el orden en que llegó la lista**
 * (§8 del brief): `initiator`/`recipient` se normalizan —el par ordenado, no
 * quién propuso— para que dos propuestas del mismo cruce generen la misma
 * clave sin importar quién se mire primero, y el desempate final es el `id`
 * de la propia propuesta.
 */
function pairKey(proposal: InteractionProposal): string {
  const a = actorKey(proposal.initiator);
  const b = actorKey(proposal.recipient);
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `${lo}|${hi}|${proposal.kind}`;
}

/**
 * Resuelve varias propuestas del mismo paso, en orden canónico y con
 * desempate determinista.
 *
 * **No decide nada sobre lo que ya existe**: como `tryReserve`/`admit` sólo
 * añaden o quitan, nunca desalojan, un compromiso válido que ya estuviera en
 * pie sigue en pie sin que este lote lo toque — es lo que el brief pide como
 * «los compromisos válidos que ya existen se conservan primero», y aquí se
 * cumple por construcción y no por una regla aparte.
 *
 * Devuelve sólo lo concedido, por `proposal.id`: lo que no entra no aparece.
 */
export function resolveBatch(
  registry: CommitmentRegistry,
  proposals: readonly InteractionProposal[],
  step: number,
): ReadonlyMap<string, InteractionLease> {
  const granted = new Map<string, InteractionLease>();
  const ordered = [...proposals].sort((x, y) => {
    const kx = pairKey(x);
    const ky = pairKey(y);
    if (kx !== ky) return kx < ky ? -1 : 1;
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
  for (const proposal of ordered) {
    const lease = registry.tryReserve(proposal, step);
    if (lease !== null) granted.set(proposal.id, lease);
  }
  return granted;
}
