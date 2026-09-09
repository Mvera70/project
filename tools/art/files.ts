import { rename, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

export function assertInside(parent: string, candidate: string): string {
  const resolvedParent = resolve(parent);
  const resolvedCandidate = resolve(candidate);
  const relation = relative(resolvedParent, resolvedCandidate);
  if (relation === '' || relation.startsWith(`..${sep}`) || relation === '..') {
    throw new Error(`Path must be a child of ${resolvedParent}: ${resolvedCandidate}`);
  }
  return resolvedCandidate;
}

export async function atomicWriteJson(path: string, value: unknown, interruptBeforeReplace = false): Promise<void> {
  const target = resolve(path);
  const temporary = resolve(dirname(target), `.${target.split(sep).at(-1) ?? 'data'}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  if (interruptBeforeReplace) throw new Error('Simulated interruption before atomic replace.');
  await rename(temporary, target);
}
