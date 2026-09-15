// S-06 · El servidor de capturas, sin dejarlo huérfano.
//
// El juego partido en dos (`npm run bundle -- --split`) pide su JSON de
// recursos por la red: una página abierta con `file://` no puede pedir nada,
// así que `shot.mjs --page http://127.0.0.1:8127/...` necesita algo detrás
// sirviendo `artifacts/graphics/G-10/game`. Hasta ahora eso era
// `python -m http.server 8127`, a mano, en otra terminal — y cada sesión lo
// dejaba corriendo, porque nada lo paraba ni avisaba de que ya estaba puesto.
//
// Esto es lo mismo con `node:http` y `node:fs`, que ya estaban en el
// proyecto: sin dependencia nueva. Sirve los pocos tipos de fichero que el
// juego empaquetado usa, avisa por consola si el puerto está ocupado en vez
// de reventar con la traza de Node, y se para con Ctrl+C.
//
//   node tools/graphics/serve.mjs              puerto 8127, artifacts/graphics/G-10/game
//   node tools/graphics/serve.mjs --port 9000  otro puerto
//   node tools/graphics/serve.mjs --dir foo    otro directorio
//   npm run serve:shots                        lo mismo, desde package.json

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const PORT = Number(opt('port', '8127'));
const ROOT = resolve(opt('dir', 'artifacts/graphics/G-10/game'));
/** Lo que se sirve si se pide la raíz: la página que arma `bundle-game.ts`. */
const INDEX = 'valley.html';

/** Los tipos que la página empaquetada y sus recursos usan. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

if (!existsSync(ROOT)) {
  console.error(
    `El servidor de capturas no encuentra ${ROOT}.\n` +
    'Empaqueta el juego primero: npx tsx tools/graphics/bundle-game.ts --split',
  );
  process.exit(1);
}

const server = createServer((req, res) => {
  // Sin query ni "..": esto sirve una carpeta de capturas locales, no hace
  // falta nada más de lo que un fichero estático necesita.
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const safe = path.includes('..') ? '/' : path;
  const target = join(ROOT, safe === '/' ? INDEX : safe);
  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 not found');
    return;
  }
  const type = MIME[extname(target)] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  createReadStream(target).pipe(res);
});

// **La razón de ser de este fichero.** `python -m http.server` no dice nada
// si el puerto está ocupado: revienta con la traza de un `OSError` que no
// nombra el puerto ni dice qué hacer. Aquí el error se atrapa antes de que
// Node lo vuelva a lanzar sin manejar, y se avisa con una frase que sí dice
// qué pasó.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `El puerto ${PORT} ya está ocupado — puede que otra sesión tenga ` +
      'un servidor de capturas corriendo. Ciérralo o usa --port para elegir otro.',
    );
    process.exit(1);
    return;
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Sirviendo ${ROOT} en http://127.0.0.1:${PORT}/${INDEX} — Ctrl+C para parar.`);
});

const shutdown = () => {
  console.log('\nServidor de capturas cerrado.');
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
