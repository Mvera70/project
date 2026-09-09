// Punto de entrada. M-20 lo sustituye por el armazón real (design.md §17, M-20).
import { mountDebug, parseDebugRequest, stateAt } from './ui/debug';
import { boot } from './ui/app';
import { loadSave } from './ui/idb';

const root = document.querySelector<HTMLDivElement>('#root');
if (root) {
  const query = new URLSearchParams(window.location.search);
  const request = parseDebugRequest(window.location.search);
  if (request === null) {
    // §13.1: resume the save if there is one and it still parses —
    // `loadSave` already turns a missing or corrupt one into `null` rather
    // than throwing, so a bad blob founds a fresh game instead of a blank page.
    void loadSave().then((save) => boot(root, save ?? undefined));
  } else if (query.get('live') === '1') {
    const state = stateAt(request);
    if (query.get('hunger') === '1') state.village.grain = 0;
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
