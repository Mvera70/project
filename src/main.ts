// Punto de entrada. M-20 lo sustituye por el armazón real (design.md §17, M-20).
import { mountDebug, parseDebugRequest, stateAt } from './ui/debug';
import { boot } from './ui/app';

const root = document.querySelector<HTMLDivElement>('#root');
if (root) {
  const request = parseDebugRequest(window.location.search);
  if (request === null) {
    boot(root);
  } else if (new URLSearchParams(window.location.search).get('live') === '1') {
    const state = stateAt(request);
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
