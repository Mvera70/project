import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const source = path.join(root, 'docs/ui-redesign/texturas-v9-2026-09-29/screen.html');
const target = path.join(here, 'index.html');
const original = fs.readFileSync(source, 'utf8');
const bodyStart = original.indexOf('<div id="prototype"></div>');
const scriptStart = original.lastIndexOf('<script>', bodyStart);
const scriptEnd = original.indexOf('</body>', bodyStart);
if (bodyStart < 0 || scriptEnd < 0) throw new Error('No se reconoce la estructura screen.html');
const tailScript = original.slice(original.indexOf('<script>', bodyStart), scriptEnd);
const stylesheet = fs.readFileSync(path.join(root, 'docs/ui-redesign/texturas-v9-2026-09-29/v9.css'), 'utf8');
let head = original.slice(0, bodyStart);
head = head.replace('<title>The Valley · V8</title>', '<base href="../texturas-v9-2026-09-29/"><title>The Valley · revisión V9</title>');
head = head.replace('</style>', `${stylesheet}\n</style>`);
const optionalScripts = ['compass.js', 'controls.js']
  .filter(file => fs.existsSync(path.join(here, file)))
  .map(file => `<script src="../revision-v9-2026-09-29/${file}" defer></script>`)
  .join('\n');
const page = `${head}<main id="gallery" hidden></main><div id="prototype"></div>${tailScript}\n<link rel="stylesheet" href="../revision-v9-2026-09-29/fixes.css">\n<script src="../revision-v9-2026-09-29/shielding.js" defer></script>\n${optionalScripts}\n</body></html>`;
fs.writeFileSync(target, page);
console.log(`Built ${target}`);


