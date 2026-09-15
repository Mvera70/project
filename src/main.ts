// Punto de entrada. M-20 lo sustituye por el armazón real (design.md §17, M-20).
import { foundGame } from '@engine/found';
import { foundSuccessor } from '@engine/save';
import { SCHEMA_VERSION, type SaveFile } from '@engine/state';
import { mountDebug, parseDebugRequest, runToStorm, stateAt } from './ui/debug';
import { boot } from './ui/app';
import { loadSave } from './ui/idb';
import { registerServiceWorker } from './ui/pwa';
import { openTitle, type TitleChoice } from './ui/screens/title';

/**
 * U-10 · la partida con la que se arranca según lo elegido en el menú. Un
 * valle nuevo conserva el archivo —y, si la partida guardada había terminado,
 * se funda sobre sus ruinas, como manda §13.3—; continuar es la partida tal
 * cual se guardó, con su letargo (§13.2) a cargo de `boot`.
 */
function saveFor(choice: TitleChoice, save: SaveFile | null): SaveFile | undefined {
  if (choice.kind === 'continue') return save ?? undefined;
  const archive = save?.archive ?? [];
  const ended = save !== null && save.state.ended !== null
    ? archive.find((game) => game.seed === save.state.seed)
    : undefined;
  return {
    schema: SCHEMA_VERSION,
    savedAtMs: Date.now(),
    state: ended !== undefined ? foundSuccessor(ended, choice.seed) : foundGame(choice.seed),
    decisions: [],
    archive: [...archive],
  };
}

// §13.4, before anything else and independent of which route boots: the
// worker is what lets the valley open without a network, and it is registered
// once whether the game founds, resumes or shows a debug scene.
registerServiceWorker();

const root = document.querySelector<HTMLDivElement>('#root');
if (root) {
  const query = new URLSearchParams(window.location.search);
  const request = parseDebugRequest(window.location.search);
  if (request === null) {
    // §13.1: resume the save if there is one and it still parses —
    // `loadSave` already turns a missing or corrupt one into `null` rather
    // than throwing, so a bad blob founds a fresh game instead of a blank page.
    void loadSave().then((save) => {
      openTitle(save, (choice) => boot(root, saveFor(choice, save)));
    });
  } else if (query.get('live') === '1') {
    const state = stateAt(request);
    // U-13 · `&weather=storm` adelanta el valle hasta una jornada de tormenta,
    // que es la única manera de fotografiar una: salen en el 4 % de los días.
    if (query.get('weather') === 'storm') runToStorm(state);
    if (query.get('hunger') === '1') state.village.grain = 0;
    if (query.get('ended') === '1') {
      state.ended = { tick: state.tick, cause: 'abandoned', lastId: null };
    }
    boot(root, {
      schema: state.version,
      savedAtMs: Date.now(),
      state,
      decisions: [...state.history],
      archive: [],
    });
  } else {
    mountDebug(root, request);
  }
}
