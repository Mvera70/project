// Punto de entrada. M-20 lo sustituye por el armazón real (design.md §17, M-20).
import { mountDebug, parseDebugRequest } from './ui/debug';

const root = document.querySelector<HTMLDivElement>('#root');
if (root) {
  const request = parseDebugRequest(window.location.search);
  if (request === null) {
    root.textContent = 'The Valley — andamiaje. Empieza por M-01 (design.md §17).';
  } else {
    mountDebug(root, request);
  }
}
