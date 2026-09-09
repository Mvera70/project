#!/usr/bin/env tsx
// Hito 0 · Three blind chronicles for a reader outside the project.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildReaderPacket } from './reader-packet-content';

const output = resolve('artifacts', 'hito-0-reader');
await mkdir(output, { recursive: true });
for (const file of buildReaderPacket()) {
  await writeFile(resolve(output, file.name), file.content, 'utf8');
}
process.stdout.write(`Wrote three blind chronicles and one question to ${output}\n`);
