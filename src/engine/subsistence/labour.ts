// M-06 · Steps 5 and 6 of the tick: who works at what, and what comes of it.
// design.md §5.2, §5.4.
//
// Two things in the allocation look like inefficiencies and are not. Both are
// defended in §5.2 and neither may be "optimised away":
//
//   · workedFields is capped at what the village needs. A valley with eight
//     fields and few hands would otherwise spread itself thin and harvest less
//     than it would with four — counterintuitive and infuriating to watch.
//
//   · fifteen per cent of the labour is reserved for the works, borrowed back
//     off the farmers if nothing is left over. Without it a village short of
//     people puts everything into the fields, never builds, and the player
//     watches a valley that does not change — the cardinal sin of this game.
//
// **Y desde el esquema 4 esto obedece al jugador** (`docs/plan-juego.md`, E1).
// Hasta aquí era una fórmula cerrada: la aldea trabajaba exactamente los campos
// que su población necesitaba y repartía lo que sobraba en una proporción fija.
// Nadie decidía nada entre una encrucijada y la siguiente, que llegan dos veces
// por década, y de ahí salía que las cuatro cifras de la tira no significaran
// nada: un número sólo significa algo cuando se mueve porque tú hiciste algo.
//
// Lo que la postura del jugador mueve son dos cosas y sólo dos: **cuántos
// campos se siembran** y **cómo se reparten las manos sobrantes entre el bosque
// y la obra**. Lo que NO mueve, porque entonces dejaría de ser una simulación:
// la dotación mínima de un campo, la reserva de obra como suelo, y los cuervos
// y el forrajeo, que son emergencias y se sirven antes que cualquier postura.
// Un jugador puede equivocarse; no puede saltarse la aritmética del hambre.

import { FOOD, FORAGE, LABOUR, TIME, MEANS } from '../balance';
import { population, workforce } from '../people/demography';
import { hasTrait, INTENT_RANGE } from '../state';
import { will } from '../people/crown';
import type { Allocation, GameState } from '../state';
import { count, smithyWorking } from './building-counts';
import { foragingUrgency, hasRiver } from './forage';
import { wardensWanted } from './crows';

function clamp(value: number, low: number, high: number): number {
  return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : low;
}

/**
 * Step 5. Splits the week's labour. Pure: reads the state, writes nothing.
 *
 * §5.2, in order:
 *
 *   neededFields = ceil(people · 48 · 1.3 / FIELD_YIELD)
 *   workedFields = min(fields, neededFields, crewable)
 *   farmers      = min(W, workedFields · FIELD_CREW)
 *   spare        = W − farmers
 *   if spare < W · WORKS_RESERVE: borrow the difference back off the farmers
 *   cutters      = spare · CUTTER_SHARE
 *   builders     = spare − cutters
 */
export function allocateLabour(state: GameState): Allocation {
  const w = workforce(state);
  const people = population(state);

  // **Lo que el rey quiere, recortado a su rango.** Hasta K-2 esto era
  // `state.intent`, la postura que el jugador movía con las palancas de v2.0; M-2
  // las retiró y desde K-2 quien empuja los campos es **quien lleva la corona**:
  // un rey del campo siembra más ancho, y sin rey esto vale 1, que es
  // exactamente la fórmula cerrada de §5.2 de siempre.
  //
  // El recorte se queda: `will()` es del motor y no puede traer un número
  // absurdo, pero el rango sigue siendo la garantía de que una cifra nueva en
  // `CROWN` no puede dejar a la aldea sin sembrar.
  const intent = {
    fields: clamp(will(state).fields, INTENT_RANGE.fields.min, INTENT_RANGE.fields.max),
  };

  // **Lo que hace falta, por lo que el jugador quiera esforzarse.** Con la
  // postura en 1 esto es exactamente lo que la fórmula daba antes, y por eso la
  // suite de balance tiene que quedarse quieta (D-6): el techo real sigue
  // siendo `MAX_FIELDS` y los campos que existan, así que sembrar de más sin
  // haber construido campos no hace nada — como debe ser.
  const neededFields = Math.ceil(
    (people * TIME.WEEKS_PER_YEAR * FOOD.NEEDED_FIELDS_MARGIN * intent.fields) / FOOD.FIELD_YIELD,
  );
  // §5.2, v2.14: a field with fewer than MIN_FIELD_CREW on it yields nothing —
  // one pair of hands cannot plough, sow and reap a field. So the village works
  // no more fields than it can crew at that minimum.
  //
  // The labour measured against is what is left after the works reserve, not
  // the raw workforce: those hands are not standing in the field. Without that,
  // two survivors still crew one field, and two survivors reaping three hundred
  // bushels against ninety-six of consumption is the flat line §5.2 is written
  // to end — forty years of a village that neither dies nor recovers.
  const farmLabour = w * (1 - LABOUR.WORKS_RESERVE);
  // **Y dos manos siempre pueden con un campo.** Con la fundación en pareja
  // (15 sep 2026) esto salió el primer día: dos personas menos la reserva de
  // obra son 1,7, y 1,7 entre `MIN_FIELD_CREW` = 2 es cero campos — la pareja
  // no cosechaba nada y moría de hambre en el año cuatro en cuatro semillas de
  // seis (`tools/founding-report.ts`). La regla de v2.14 sigue para todo lo
  // demás; lo que cambia es que la reserva de obra no puede dejar a una aldea
  // de dos sin su único campo, porque entonces no es una reserva, es la ruina.
  const crewable = Math.max(
    w >= FOOD.MIN_FIELD_CREW ? 1 : 0,
    Math.floor(farmLabour / FOOD.MIN_FIELD_CREW),
  );
  const workedFields = Math.min(count(state, 'field'), neededFields, crewable);
  // M-2 · **el arado.** Un campo se trabaja con menos manos, así que sobran
  // brazos y el reparto de abajo los manda donde haga falta —al bosque, a la
  // obra, a la cantera—. No sube la cosecha: eso sería un número mejor y no un
  // medio; lo que cambia es **quién queda libre**, y eso lo decide la aldea.
  const crew = FOOD.FIELD_CREW * (hasTrait(state, 'plough') ? MEANS.PLOUGH_CREW : 1);
  const farmDemand = workedFields * crew;

  let farmers = Math.min(w, farmDemand);
  let spare = w - farmers;

  const reserve = w * LABOUR.WORKS_RESERVE;
  if (spare < reserve) {
    const borrowed = Math.min(farmers, reserve - spare);
    farmers -= borrowed;
    spare += borrowed;
  }

  // §7.7, v2.93: the crows come first of the three, because the grain already
  // in the field is worth more than the grain nobody has hunted yet. Only in
  // the weeks before the reaping, and only up to what is spare: a village does
  // not take people off the harvest itself to guard it.
  const wardens = Math.min(spare, wardensWanted(state, workedFields));
  spare -= wardens;

  // §7.7, v2.92: before the wood and the works, the hungry village takes hands
  // off both and sends them out for food. Only when it is short — with a full
  // granary `urgency` is 0 and this whole block does nothing — and never more
  // than half of what is spare, so the works reserve above survives it.
  const grainYears = people > 0
    ? state.village.grain / (people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON)
    : Number.POSITIVE_INFINITY;
  const foragers = spare * FORAGE.MAX_SHARE * foragingUrgency(state, grainYears);
  spare -= foragers;

  // Half to the woods and half to the river, and all of it to whichever the
  // valley actually has. A map with no water fishes nothing; that is why the
  // river being on the map matters before anyone eats from it.
  const river = hasRiver(state);
  const hunters = river ? foragers * 0.5 : foragers;
  const fishers = river ? foragers - hunters : 0;

  // **La aldea corta la leña que necesita, no una cuota.**
  //
  // Aquí vivía `spare * intent.timber`: una parte fija de lo que sobra iba al
  // bosque, viniera de una palanca del jugador (v2.0) o de `RESTING_TIMBER`. El
  // balanceo del 17 sep 2026 lo cambió porque medido hacía dos cosas mal a la
  // vez —un valle sin ayuda se congelaba ochenta y dos semanas y otro acumulaba
  // veinte mil de leña sin usar—; el motivo largo está en `balance.ts`, junto a
  // las constantes.
  //
  // La necesidad es el invierno que viene más el fondo de obra, menos lo que ya
  // hay en la leñera; se cubre en `WOOD_CATCH_UP_WEEKS` semanas y con un suelo
  // de leñadores para que el bosque no se quede vacío de gente. **Y aquí es
  // donde el hacha se convierte en manos libres**: si cada leñador trae más, la
  // misma necesidad pide menos leñadores.
  const perCutter = LABOUR.WOOD_PER_CUTTER * (hasTrait(state, 'axe') ? MEANS.AXE_WOOD : 1);
  const want = people * LABOUR.WINTER_WOOD * LABOUR.WOOD_TARGET_WEEKS + LABOUR.WOOD_WORKS_STOCK;
  const missing = Math.max(0, want - state.village.wood);
  const wanted = perCutter > 0 ? missing / (perCutter * LABOUR.WOOD_CATCH_UP_WEEKS) : 0;
  // Entre el suelo y el techo: ni el bosque se queda sin nadie, ni una leñera
  // vacía se lleva todas las manos y deja el valle sin construir.
  const cutters = Math.min(
    spare * LABOUR.CUTTER_CAP_SHARE,
    Math.max(spare * LABOUR.CUTTER_FLOOR_SHARE, wanted),
  );
  const builders = spare - cutters;

  return {
    workforce: w,
    workedFields,
    farmers,
    cutters,
    builders,
    hunters,
    fishers,
    wardens,
    // No fields worked means no harvest at all, so the factor is 0 rather than
    // a division by zero.
    labourFactor: farmDemand > 0 ? farmers / farmDemand : 0,
  };
}

/**
 * Step 6. The week's wood and build points. §5.2, §5.4.
 *
 * The wood goes into the village store, which is what §5.4 says. The build
 * points do NOT: they are handed back so that M-10 can pass them to M-14's
 * `advanceWorks`. Parking them in the state would add a field that only exists
 * between two steps of the same tick, and would have to be saved and migrated.
 *
 * `woodCap` is how much the forest can actually give this week. M-15 owns the
 * forest and will supply it; until then the cap is off and the cutters are
 * limited only by their own hands.
 */
export function produce(
  state: GameState,
  a: Allocation,
  woodCap: number = Number.POSITIVE_INFINITY,
): { wood: number; buildPoints: number } {
  const cut = a.cutters * LABOUR.WOOD_PER_CUTTER;
  const wood = Math.max(0, Math.min(cut, woodCap));
  state.village.wood += wood;

  const active = (flag: string): boolean => {
    const until = state.flags[flag];
    return until !== undefined && (until === 0 || until > state.tick);
  };
  let worksFactor = 1;
  if (active('works_slowed_85')) worksFactor = Math.min(worksFactor, 0.85);
  if (active('works_slowed_80')) worksFactor = Math.min(worksFactor, 0.8);
  if (active('works_slowed_40')) worksFactor = Math.min(worksFactor, 0.4);

  // M-4 · **el hacha buena también levanta la obra** (`MEANS.AXE_WORKS`): es la
  // herramienta con la que se escuadran las vigas, y es lo que hace que la
  // decisión de darla complemente al arado en vez de repetir su punto flaco. El
  // motivo medido está en `balance.ts`, junto a la constante.
  // K-2 · **y el rey ambicioso levanta un 5 % más**, que es lo que §6.3 prometía
  // desde el primer día y nadie había escrito (`CROWN.AMBITIOUS_WORKS`).
  const buildPoints = a.builders * LABOUR.BP_PER_BUILDER *
    (smithyWorking(state) ? LABOUR.SMITHY_BONUS : 1)
    * (hasTrait(state, 'axe') ? MEANS.AXE_WORKS : 1) * will(state).works * worksFactor;

  return { wood, buildPoints };
}
