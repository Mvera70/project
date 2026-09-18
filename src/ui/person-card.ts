// UI-V4 · La ficha de una persona, como datos. `docs/ui-redesign/piel/
// plan-piel.md` §3.3 y el prototipo 03.
//
// **Por qué existe separado de `inspect.ts`.** `panelFor` devuelve `{title,
// lines}` —un montón de frases ya renderizadas— y con eso se puede pintar una
// lista, que es lo que la ficha era. El prototipo 03 no es una lista: es un
// medallón, un nombre con su edad, un oficio, tres chips de rasgo y una tira
// de parentesco con dos retratos. Para pintar eso hace falta la ficha
// **estructurada**, no aplanada. `panelFor` se queda intacto: la lista de
// People lo sigue usando, y esta ronda no la toca.
//
// **Pura y sin DOM**, como sus vecinas: así lo que se puede comprobar sin
// navegador es lo que de verdad decide la ficha —a quién se enseña como
// allegado y con qué palabra— y no el HTML que lo envuelve.
//
// **Y el parentesco sale sólo de lo que el motor guarda.** El prototipo dibuja
// «Ymma · wife» y «Osric · rival», y la mitad de eso no existe: el motor no
// guarda matrimonios —la boda de R-1 es un suceso, no un vínculo— así que una
// esposa no se puede enseñar sin inventarla. Lo que sí guarda, y es de donde
// sale esta tira, son `parentIds` (padre y madre, y de ahí los hijos) y
// `opinions` entre los que tienen nombre. Con eso se sirve la misma idea del
// prototipo —un lazo cálido y uno frío, con su palabra— sin escribir un dato
// que nadie ha medido.

import { renderUiText } from '@engine/chronicle/render';
import { roleKeyFor } from '@derive/crown';
import { isHere } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import type { GameState, Villager, VillagerId } from '@engine/state';
import { yearOf } from '@engine/time';
import type { ActorDoing } from '../render3d/contracts';

/** Lo mínimo para dibujar a alguien en un medallón y nombrarlo. */
interface CardFace {
  readonly id: VillagerId;
  readonly name: string;
  /**
   * La letra del medallón.
   *
   * **Una inicial y no un retrato, y es una decisión del plan** (§3.3): el
   * prototipo pinta caras dibujadas y no existe ni una en el proyecto. Un
   * retrato inventado por persona sería o un dibujo que no es de nadie,
   * repetido veintisiete veces, o veintisiete dibujos que nadie ha hecho. La
   * inicial en el aro de tinta es honesta, distingue a cada uno y aguanta el
   * día que haya retratos: entonces el medallón cambia de contenido y ni una
   * línea de esto se mueve.
   */
  readonly monogram: string;
}

/** Un allegado, con la palabra que lo nombra y si el lazo es cálido o frío. */
export interface CardKin extends CardFace {
  readonly relation: string;
  readonly warm: boolean;
}

export interface PersonCard extends CardFace {
  /** Los inviernos que tiene, o `null` si ya no está para tenerlos. */
  readonly age: number | null;
  /** El oficio, ya en la palabra del banco, o `null` si no tiene ninguno. */
  readonly role: string | null;
  /** Los rasgos, ya en palabras. Vacío si no tiene nombre. */
  readonly traits: readonly string[];
  /**
   * El lazo cálido y el frío, en ese orden, y **sólo los que existen de
   * verdad**: la tira puede traer dos, uno o ninguno.
   */
  readonly kin: readonly CardKin[];
  /** Lo que recuerda, lo más pesado primero. La vida, para quien la pida. */
  readonly memories: readonly string[];
  /**
   * La frase de quien ya no está —muerto o marchado— o `null` si sigue aquí.
   * Cuando la trae, la ficha no enseña edad ni allegados: enseñar las
   * opiniones que le tienen hoy sería inventarle un presente.
   */
  readonly gone: string | null;
}

/**
 * VZ-6 · La línea «Today» de la ficha: qué está haciendo esa persona.
 *
 * Puro y aparte de `personCard` porque **su dato no está en el estado**: lo que
 * se ve andando es efímero y lo produce la capa de vida en cada paso (Anexo E),
 * así que no hay `GameState` del que sacarlo. Recibe lo que el renderer dice
 * del cuerpo que está pintando y devuelve la frase, o `null` cuando no hay
 * cuerpo —el lienzo 2D no simula ninguno, y en 3D alguien puede no tenerlo
 * todavía—. `null` es «no se dice nada», nunca una frase de relleno.
 *
 * La carga manda sobre el tramo: quien lleva un fardo está acarreando, y da
 * igual si en ese instante va o vuelve.
 */
export function doingLine(doing: ActorDoing | null): string | null {
  if (doing === null) return null;
  const what = doing.load !== null ? doing.load : doing.activity;
  return renderUiText('inspect.today', { doing: renderUiText(`inspect.doing.${what}`) });
}

/** El umbral con el que una opinión deja de ser ruido. El mismo que `inspect.ts`. */
const STRONG = 40;

const monogramOf = (person: Villager): string =>
  (person.name === '' ? '?' : person.name.charAt(0).toUpperCase());

const faceOf = (person: Villager): CardFace => ({
  id: person.id, name: person.name, monogram: monogramOf(person),
});

/** Sólo entra en la tira quien tiene nombre y sigue en el valle. */
const showable = (person: Villager | undefined): person is Villager =>
  person !== undefined && person.named && person.name !== '' && isHere(person);

function findPerson(state: GameState, id: VillagerId | null): Villager | undefined {
  return id === null ? undefined : state.people.villagers.find((v) => v.id === id);
}

/**
 * El lazo cálido: el hijo, el padre o la madre si los hay a mano, y si no el
 * amigo de más opinión.
 *
 * **La sangre antes que la opinión, y a propósito**: el prototipo pone ahí a
 * la mujer, o sea al vínculo que no cambia de semana en semana, y una opinión
 * sí cambia (`driftOpinions` la mueve cada tick). De los dos que el motor
 * guarda, el parentesco es el que se parece a lo que el prototipo enseña.
 */
function warmestTie(person: Villager, state: GameState): CardKin | null {
  const kids = state.people.villagers.filter(
    (v) => showable(v) && v.parentIds.includes(person.id),
  );
  const child = kids[0];
  if (child !== undefined) {
    return { ...faceOf(child), warm: true,
      relation: renderUiText(child.female ? 'kin.daughter' : 'kin.son') };
  }
  for (const parentId of person.parentIds) {
    const parent = findPerson(state, parentId);
    if (showable(parent)) {
      return { ...faceOf(parent), warm: true,
        relation: renderUiText(parent.female ? 'kin.mother' : 'kin.father') };
    }
  }
  let best: { person: Villager; value: number } | null = null;
  for (const [id, value] of Object.entries(person.opinions)) {
    if (value < STRONG) continue;
    const other = findPerson(state, Number(id));
    if (!showable(other)) continue;
    if (best === null || value > best.value) best = { person: other, value };
  }
  return best === null
    ? null
    : { ...faceOf(best.person), relation: renderUiText('kin.friend'), warm: true };
}

/** El lazo frío: la opinión más baja que pase de ruido. */
function coldestTie(person: Villager, state: GameState, taken: VillagerId | null): CardKin | null {
  let worst: { person: Villager; value: number } | null = null;
  for (const [id, value] of Object.entries(person.opinions)) {
    if (value > -STRONG) continue;
    const other = findPerson(state, Number(id));
    if (!showable(other) || other.id === taken) continue;
    if (worst === null || value < worst.value) worst = { person: other, value };
  }
  return worst === null
    ? null
    : { ...faceOf(worst.person), relation: renderUiText('kin.rival'), warm: false };
}

/**
 * La ficha de alguien, o `null` si ese id ya no existe en la partida.
 *
 * `null` es «no hay a quién enseñar», no un fallo: la ficha de una persona que
 * el estado ya no tiene se cierra sola, igual que `trackedIdFor` deja caer el
 * seguimiento (AC-11).
 */
export function personCard(state: GameState, id: VillagerId): PersonCard | null {
  const person = findPerson(state, id);
  if (person === undefined) return null;

  const base = {
    ...faceOf(person),
    // K-5 · «king» si lleva la corona; el motor sigue diciendo `leader`.
    role: (() => {
      const key = roleKeyFor(state, person);
      return key === null ? null : renderUiText(key);
    })(),
    traits: person.traits.map((trait) => renderUiText(`trait.${trait}`)),
    memories: [...person.memories]
      .sort((a, b) => b.weight - a.weight || b.tick - a.tick)
      .map((memory) => renderUiText('inspect.memory', {
        memory: renderUiText(`memory.${memory.kind}`), year: yearOf(memory.tick),
      })),
  };

  if (person.diedTick !== null) {
    return { ...base, age: null, kin: [], gone: renderUiText('inspect.died', {
      year: yearOf(person.diedTick), age: ageOf(person, person.diedTick),
    }) };
  }
  if (person.leftTick !== null) {
    return { ...base, age: null, kin: [],
      gone: renderUiText('inspect.left', { year: yearOf(person.leftTick) }) };
  }

  const warm = warmestTie(person, state);
  const cold = coldestTie(person, state, warm === null ? null : warm.id);
  return {
    ...base,
    age: ageOf(person, state.tick),
    kin: [warm, cold].filter((tie): tie is CardKin => tie !== null),
    gone: null,
  };
}
