// Punto de entrada. M-20 lo sustituye por el armazón real (design.md §17, M-20).
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { foundGame } from '@engine/found';
import { foundSuccessor } from '@engine/save';
import { HAPPENINGS, MEANS_IDS, SCHEMA_VERSION, type HappeningId, type MeansId, type SaveFile } from '@engine/state';
import { archivedGames, crownNow, crownReady, giveNow, happenNow, huntedNow, mountDebug, offerNow, openAtYearCooperative,
  parseDebugRequest, raidNow, bracedNow, comingNow, warningNow, warningPendingNow, aftermathNow, wallWorkNow,
  runToCrossroad, runToSky, runToWoodChain, stateAt, walkwayNow, WOOD_DEMO_START } from './ui/debug';
import { boot } from './ui/app';
import { loadSave } from './ui/idb';
import { registerServiceWorker } from './ui/pwa';
import { openTitle, type TitleChoice } from './ui/screens/title';
import { installSound } from './ui/sound';
import { openBattleSandbox } from './ui/sandbox';

/**
 * U-10 · la partida con la que se arranca según lo elegido en el menú. Un
 * valle nuevo conserva el archivo —y, si la partida guardada había terminado,
 * se funda sobre sus ruinas, como manda §13.3—; continuar es la partida tal
 * cual se guardó, con su letargo (§13.2) a cargo de `boot`.
 *
 * **U-10b · y si el menú pidió un año, el valle se juega hasta ahí antes de
 * abrirlo** (`openAtYearCooperative`, con la política de referencia). Lo que entra
 * en `boot` es una partida normal de ese año: sus decisiones contestadas en
 * `decisions`, su crónica entera, y su encrucijada pendiente si el año cae en
 * una —`boot` ya sabe abrirla, que es lo que hacía falta para el camino de
 * `?live=1`—. No hay estado inventado y no hay nada que limpiar después.
 */
async function saveFor(choice: TitleChoice, save: SaveFile | null): Promise<SaveFile | undefined> {
  if (choice.kind === 'continue') return save ?? undefined;
  const archive = save?.archive ?? [];
  const ended = save !== null && save.state.ended !== null
    ? archive.find((game) => game.seed === save.state.seed)
    : undefined;
  const state = ended !== undefined ? foundSuccessor(ended, choice.seed) : foundGame(choice.seed);
  await openAtYearCooperative(state, choice.year);
  return {
    schema: SCHEMA_VERSION,
    savedAtMs: Date.now(),
    state,
    decisions: [...state.history],
    archive: [...archive],
  };
}

// §13.4, before anything else and independent of which route boots: the
// worker is what lets the valley open without a network, and it is registered
// once whether the game founds, resumes or shows a debug scene.
registerServiceWorker();
// El sonido, también antes de todo: la portada suena, y el primer toque de la
// página —sea donde sea— es el que le da permiso al navegador para sonar.
installSound();

const root = document.querySelector<HTMLDivElement>('#root');
if (root) {
  const query = new URLSearchParams(window.location.search);
  const request = parseDebugRequest(window.location.search);
  const annals = query.get('annals');
  if (query.get('sandbox') === 'battle') {
    // El banco de batallas (`src/ui/sandbox.ts`, 27 sep 2026): una villa con
    // un asalto que llega hoy, mandos y cifras en directo. Nunca guarda.
    openBattleSandbox(root);
  } else if (annals !== null) {
    // F3d · `?annals=3` abre el menú de inicio con **tres valles acabados en el
    // archivo**, que es la única forma de fotografiar el cronicón: el índice
    // sólo tiene algo que enseñar cuando alguien ha acabado varios, y eso son
    // horas de reloj. `?annals=0` es la página vacía, que es una pantalla del
    // juego y no un hueco (decisión del dueño, 19 sep 2026).
    const archive = archivedGames(Number(annals) || 0);
    const state = foundGame(1);
    openTitle({
      schema: SCHEMA_VERSION, savedAtMs: Date.now(), state,
      decisions: [...state.history], archive,
    }, async (choice) => { boot(root, await saveFor(choice, null)); });
  } else if (request === null) {
    // §13.1: resume the save if there is one and it still parses —
    // `loadSave` already turns a missing or corrupt one into `null` rather
    // than throwing, so a bad blob founds a fresh game instead of a blank page.
    void loadSave().then((save) => {
      openTitle(save, async (choice) => { boot(root, await saveFor(choice, save)); });
    });
  } else if (query.get('live') === '1') {
    // K7 · `&policy=worst` juega el valle **desde la fundación** con la
    // política adversa (§12.9) en vez de la prudente, hasta el año pedido o
    // hasta que caiga. Es la única manera de fotografiar el epitafio de un
    // valle asaltado de verdad, con su crónica: `&ended=stormed` lo acaba de
    // golpe y no hay nada que contar. (Medido: la semilla 129 cae asaltada en
    // el año 6.)
    const state = query.get('policy') === 'worst' ? foundGame(request.seed) : stateAt(request);
    if (query.get('policy') === 'worst') run(state, TIME.WEEKS_PER_YEAR * request.year, 'worst', CATALOG);
    // U-13 · `&weather=` adelanta el valle hasta una jornada con ese cielo, que
    // es la única manera de fotografiarlo: la tormenta sale en el 4 % de los
    // días y la nieve en el 3,5 %. `storm`, `snow` o `wet` (cualquiera de los
    // dos, o nubes). En invierno hay que pedir `snow`: no truena.
    const sky = query.get('weather');
    if (sky === 'storm' || sky === 'snow' || sky === 'wet') runToSky(state, sky);
    // Esquema 12 · `&demo=wood` adelanta hasta una semana con entregas de
    // madera cuya siguiente abre una obra, y la abre a media semana: la cadena
    // entera —«+1» en la leñera, la obra que se abre y su madera saliendo hacia
    // la parcela— cabe en diez minutos a ×1.
    const woodDemo = query.get('demo') === 'wood';
    if (woodDemo) runToWoodChain(state);
    // VZ-6 · `&crossroad=1` sigue jugando hasta que haya una decisión sin
    // contestar. Sin esto no se puede fotografiar ni el documento sellado ni
    // el sello del ornamento: el valle que estas rutas abren viene ya jugado
    // con la política prudente, o sea con todas contestadas.
    if (query.get('crossroad') === '1') runToCrossroad(state);
    // M-0 · y `&offer=1` deja a alguien esperando en el camino.
    if (query.get('offer') === '1') offerNow(state);
    // M-3 · y `&means=pigs|plough|ale` da un medio al abrir, para verlo.
    // C2/D2 · `&means=bows,arms` da varias cosas de golpe, que es lo que hace
    // falta para grabar una defensa: sin arcos no hay arqueros, y con un solo
    // medio por toma no se podía ver la muralla contestando.
    const means = query.get('means');
    if (means !== null && (MEANS_IDS as readonly string[]).includes(means)) {
      giveNow(state, means as MeansId);
    } else if (means !== null) {
      for (const one of means.split(',')) {
        if ((MEANS_IDS as readonly string[]).includes(one)) giveNow(state, one as MeansId);
      }
    }
    // IA-5 · y `&happening=wolves_at_the_coop` provoca un suceso del valle esta
    // semana, que es la única forma de grabar una visita que sale pocas veces
    // en sesenta años.
    const happening = query.get('happening');
    if (happening !== null && (HAPPENINGS as readonly string[]).includes(happening)) {
      happenNow(state, happening as HappeningId);
    }
    // AN-4b · y `&hunted=partridge,rabbit` da por cazadas esas especies, para
    // grabar las cazas que vienen detrás y la visita del oso (`huntedNow`).
    const hunted = query.get('hunted');
    if (hunted !== null) huntedNow(state, hunted.split(','));
    // v5.74 · y `&cows=4` pone esas vacas en el corral, para ver el rebaño
    // pastando en la falda: con la política prudente casi ninguna aldea las
    // tiene (una muestra de 96, en doce valles hasta los sesenta años).
    const cows = Number(query.get('cows'));
    if (Number.isInteger(cows) && cows > 0) state.herd.cows = cows;
    // K-5 · `&crown=ready` deja la fila de la corona encendida, y
    // `&crown=<oficio>` corona ya a alguien de ese oficio para ver lo que viene
    // después (la sala, la palabra «king», el estilo del valle).
    // D3 · `&raid=20` planta la partida del valle vecino llegando hoy.
    const raid = query.get('raid');
    // D3b · `&assault=1` hace que la partida venga a por la puerta.
    if (raid !== null) raidNow(state, Number(raid) || 12, query.get('assault') === '1');
    // E0a · `&braced=2` construye la decisión real: amenaza futura y bandera.
    // `&coming=2` deja la misma víspera sin prepararse, para compararla.
    const coming = query.get('coming');
    if (coming !== null) comingNow(state, Number(coming) || 1);
    const warning = query.get('warning');
    if (warning === 'pending') warningPendingNow(state);
    else if (warning !== null) warningNow(state, Number(warning) || 8);
    const braced = query.get('braced');
    if (braced !== null) bracedNow(state, Number(braced) || 1);
    if (query.get('aftermath') === '1') aftermathNow(state, query.get('beast') === '1');
    const wallWork = query.get('wallwork');
    if (wallWork === 'gate' || wallWork === 'wall') wallWorkNow(state, wallWork, Number(query.get('progress')) || 0.35);
    const crown = query.get('crown');
    if (crown === 'ready') crownReady(state);
    else if (crown !== null) crownNow(state, crown);
    // E3b.1d · escena de revisión controlada, nunca una forma de jugar ni de
    // alterar otra ruta de depuración: sólo vive bajo los tres interruptores.
    if (query.get('e3b') === '1') walkwayNow(state);
    if (query.get('hunger') === '1') state.village.grain = 0;
    // K5 · `&hides=8` pone pieles en los bastidores, para fotografiar el aviso
    // de los petos de la herrería y el buhonero que las pide.
    const hides = Number(query.get('hides'));
    if (Number.isFinite(hides) && hides > 0) state.village.hides = Math.floor(hides);
    // K5 · y `&linen=6` pone lienzo en la sastrería, para fotografiar la ropa.
    const linen = Number(query.get('linen'));
    if (Number.isFinite(linen) && linen > 0) state.village.linen = Math.floor(linen);
    // K5 · `&jerkins=1` deja el encargo de los petos en marcha un año, para
    // fotografiar el cerco con ellos puestos (`Garrison.jerkins`).
    if (query.get('jerkins') === '1') state.flags['smithy:jerkins'] = state.tick + TIME.WEEKS_PER_YEAR;
    // F3 · `&ended=1` acaba la partida, y `&ended=<causa>` acaba de esa manera
    // concreta: `extinction`, `abandoned`, `dispersed` o `stormed`. Hacía falta
    // para poder fotografiar las cuatro lápidas —cada una tiene su capitular y
    // su inscripción— sin esperar a que un valle se muera de la manera que toca.
    const ended = query.get('ended');
    if (ended !== null) {
      const cause = (['extinction', 'abandoned', 'dispersed', 'stormed'] as const)
        .find((one) => one === ended) ?? 'abandoned';
      state.ended = { tick: state.tick, cause, lastId: null };
    }
    boot(root, {
      schema: state.version,
      savedAtMs: Date.now(),
      state,
      decisions: [...state.history],
      archive: [],
    }, woodDemo ? { startFraction: WOOD_DEMO_START } : {});
  } else {
    mountDebug(root, request);
  }
}
