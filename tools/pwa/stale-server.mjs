// M-27.2 · Serves dist/ the way GitHub Pages does, and can redeploy on demand.
//
// design.md §13.4 promises that a new deployment reaches a device that already
// visited. `vite preview` sends no caching headers, so the test that checked
// that promise could not see the thing that broke it: Pages sends
// `Cache-Control: max-age=600`, and an ordinary `fetch` inside the service
// worker is answered by the browser's HTTP cache instead of the network.
//
// GET /__bump stands in for a deployment: the document served afterwards is a
// different one, with the same URL and the same headers.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const PORT = 4181;
const MAX_AGE = 600; // what GitHub Pages sends, measured
const root = resolve('dist');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

let version = 1;

createServer(async (req, res) => {
  let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (path === '/__bump') {
    version += 1;
    res.writeHead(200, { 'Cache-Control': 'no-store' });
    res.end(String(version));
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  try {
    let body = await readFile(join(root, path));
    if (path.endsWith('index.html')) {
      // The marker a test can read without depending on anything the game draws.
      body = Buffer.from(body.toString().replace('<title>The Valley</title>', `<title>V${version}</title>`));
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': `max-age=${MAX_AGE}`,
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, () => process.stdout.write(`stale-headers server on http://127.0.0.1:${PORT}/\n`));
