// M-03 · The name banks. design.md Annex B.1, §17 M-03.
//
// Anglo-Saxon and early Middle English given names, taken from English
// medieval records. No surnames — the village has no surnames, and it has no
// name of its own either: it is "the valley", and that is on purpose.
//
// Annex B.1 lists the first 24 of each bank and leaves the remaining 36 to this
// module, "following the same criterion". The criterion is: a given name that a
// tenth- or eleventh-century English record would actually carry. Edmund and
// Edith belong; anything that reads modern does not.

import type { RngBundle } from '../rng';
import { pick } from '../rng';

/** 60 names. The first 24 are Annex B.1 verbatim, in its order. */
export const MALE_NAMES: readonly string[] = [
  // Annex B.1
  'Aelric', 'Osric', 'Cuthbert', 'Godwin', 'Leofric', 'Wulfstan',
  'Eadric', 'Beorn', 'Alfwine', 'Tostig', 'Hereward', 'Sigeric',
  'Baldwin', 'Oswy', 'Athelstan', 'Ceolwulf', 'Dunstan', 'Edmund',
  'Frithuric', 'Gyrth', 'Hakon', 'Ingeld', 'Merewald', 'Penda',
  // Completed by M-03
  'Aelfheah', 'Aethelred', 'Aethelwulf', 'Ordric', 'Wulfric', 'Siward',
  'Morcar', 'Waltheof', 'Leofwine', 'Eadwig', 'Ecgbert', 'Offa',
  'Cenwulf', 'Beorhtric', 'Aelfgar', 'Thurstan', 'Ealdred', 'Wigmund',
  'Cynric', 'Cerdic', 'Sebbi', 'Swithun', 'Beornwulf', 'Eanred',
  'Osbeorn', 'Wulfnoth', 'Godric', 'Aelfwold', 'Hrothgar', 'Aldhelm',
  'Wilfrid', 'Egfrith', 'Coenred', 'Grimbald', 'Ceolred', 'Wystan',
];

/** 60 names. The first 24 are Annex B.1 verbatim, in its order. */
export const FEMALE_NAMES: readonly string[] = [
  // Annex B.1
  'Mildreth', 'Aelfgifu', 'Edith', 'Godgifu', 'Hild', 'Leofwynn',
  'Osgyth', 'Sunngifu', 'Wulfrun', 'Cwenburh', 'Eadgyth', 'Frideswide',
  'Aethelflaed', 'Beorhtgifu', 'Cynethryth', 'Ealdgyth', 'Hereswith', 'Ingrith',
  'Merewenna', 'Osburh', 'Saethryth', 'Tathwyn', 'Wilburh', 'Ymma',
  // Completed by M-03
  'Aebbe', 'Aelfflaed', 'Aelfthryth', 'Aethelgifu', 'Aethelswith', 'Beornwynn',
  'Botild', 'Burginda', 'Ceolburh', 'Cwenhild', 'Cwenthryth', 'Cyneburh',
  'Eadburh', 'Eadflaed', 'Eadgifu', 'Ealhswith', 'Eanflaed', 'Eanswith',
  'Godhild', 'Hereburh', 'Hildeburh', 'Leofgifu', 'Leofrun', 'Mildburh',
  'Mildgyth', 'Osthryth', 'Sexburh', 'Sigeburh', 'Werburh', 'Wulfgifu',
  'Wulfhild', 'Wynflaed', 'Bertha', 'Aelfwynn', 'Beorhtwynn', 'Cynegifu',
];

/** The lord of Wealdmere and the places beyond the ridge. Annex B.1. */
export const PLACE_NAMES: readonly string[] = [
  'Wealdmere', 'Ashford', 'Netherby', 'Longmoor', 'Crowhurst',
  'Stanbeck', 'Thornleigh', 'Fenwick', 'Ravensden',
];

/**
 * A name nobody living carries. `used` is the caller's set of taken names —
 * the living named, which is at most eight, against a bank of sixty.
 *
 * Consumes exactly one draw from the 'names' stream, whether or not the bank
 * had to be narrowed: a name that happens to collide must not shift the stream
 * for whoever is named next.
 *
 * If every name in the bank were taken the draw falls back to the whole bank
 * rather than failing. It cannot happen in a real game (eight named against
 * sixty names) but a silent throw deep inside the founding would be worse than
 * a repeat.
 */
export function makeName(b: RngBundle, female: boolean, used: Set<string>): string {
  const bank = female ? FEMALE_NAMES : MALE_NAMES;
  const free = bank.filter((n) => !used.has(n));
  return pick(b, 'names', free.length > 0 ? free : bank);
}
