// M-23 · IndexedDB, `the-valley` / `saves` / `current` (design.md §13.1).
//
// `serialize`/`deserialize` (engine/save.ts) know nothing of storage — they
// only shape a value. This is the one place that actually opens a database,
// and it is small on purpose: a failed read founds a fresh game, a failed
// write is swallowed rather than crashing a game already in progress.

import { deserialize } from '@engine/save';
import type { SaveFile } from '@engine/state';

const DB_NAME = 'the-valley';
const STORE = 'saves';
const KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

/** The current save, or `null` if there is none or it will not parse (§13.1: corrupt is rejected, not thrown at the caller). */
export async function loadSave(): Promise<SaveFile | null> {
  try {
    const db = await openDb();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB get failed'));
    });
    db.close();
    return raw === undefined ? null : deserialize(raw);
  } catch {
    return null;
  }
}

/** Best-effort: called every 20 ticks and on `visibilitychange` (§13.1), neither of which should ever throw. */
export async function persistSave(save: SaveFile): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(save, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'));
    });
    db.close();
  } catch {
    // A save that could not be written is not a reason to stop the game.
  }
}
