// M-27.1 · Serves dist/ under /project/, the way GitHub Pages does.
//
// design.md §13.4 says the same build has to work from a domain root and from
// Pages' subdirectory without being rebuilt. `vite preview` only ever serves
// the root, so the subdirectory half of that claim needs its own server.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const PREFIX = '/project';
const PORT = 4180;
const root = resolve('dist');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

createServer(async (req, res) => {
  let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!path.startsWith(`${PREFIX}/`)) {
    res.writeHead(302, { Location: `${PREFIX}/` });
    res.end();
    return;
  }
  path = path.slice(PREFIX.length);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    // Also what keeps Playwright waiting until `npm run build` has produced
    // dist/: until then every path here is a 404.
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, () => process.stdout.write(`subpath server on http://127.0.0.1:${PORT}${PREFIX}/\n`));
