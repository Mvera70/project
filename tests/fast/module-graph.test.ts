// M-02 · El grafo de dependencias del motor. Obligatorio y acíclico.
//
// El orden importa porque state.ts es el contrato que M-03 a M-06 van a
// importar en paralelo. Un ciclo aquí no rompe la compilación —con
// verbatimModuleSyntax los `import type` se borran— pero sí rompe la posibilidad
// de razonar sobre qué depende de qué, y es la clase de deuda que se nota
// cuando ya la han heredado cinco módulos.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE = fileURLToPath(new URL('../../src/engine/', import.meta.url));

/**
 * Los módulos del motor a los que apunta un fichero, sin repetir y ordenados.
 * Un mismo módulo aparece dos veces en el fuente cuando se importan de él tipos
 * y valores por separado, y eso no es una dependencia más.
 */
function importsOf(file: string): string[] {
  const src = readFileSync(ENGINE + file, 'utf8');
  const targets = [...src.matchAll(/from\s+'([^']+)'/g)]
    .map((m) => m[1] ?? '')
    .filter((s) => s.startsWith('.'))
    .map((s) => s.replace(/^\.\.?\//, '').replace(/^\.\//, ''));
  return [...new Set(targets)].sort();
}

describe('grafo de módulos del motor', () => {
  it('rng.ts no importa nada', () => {
    expect(importsOf('rng.ts')).toEqual([]);
  });

  it('balance.ts no importa nada', () => {
    // Todos los números del juego, sin dependencias: cualquiera puede leerlo.
    expect(importsOf('balance.ts')).toEqual([]);
  });

  it('state.ts sólo importa de rng.ts', () => {
    expect(importsOf('state.ts')).toEqual(['rng']);
  });

  it('schema.ts sólo importa de state.ts, nunca al revés', () => {
    // La dirección es ésta y no la contraria porque §8 necesita seis tipos de
    // §3 (Season, Role, Trait, BuildingKind, StatName, MemoryKind) y §3 sólo
    // necesita uno de §8, Condition — que por eso vive en state.ts.
    expect(importsOf('crossroads/schema.ts')).toEqual(['state']);
    expect(importsOf('state.ts')).not.toContain('crossroads/schema');
  });

  it('time.ts importa de balance.ts y de state.ts', () => {
    expect(importsOf('time.ts')).toEqual(['balance', 'state']);
  });

  it('people/ cuelga de las hojas y de state.ts, nunca al revés', () => {
    // M-03. names.ts y traits.ts no se conocen entre sí; villagers.ts los usa.
    expect(importsOf('people/names.ts')).toEqual(['rng']);
    expect(importsOf('people/traits.ts')).toEqual(['balance', 'rng', 'state']);
    expect(importsOf('people/villagers.ts')).toEqual([
      'balance',
      'names',
      'rng',
      'state',
      'time',
      'traits',
    ]);
    expect(importsOf('people/demography.ts')).toEqual([
      'balance',
      'rng',
      'state',
      'time',
      'villagers',
    ]);
    expect(importsOf('state.ts')).not.toContain('people/villagers');
  });

  it('subsistence/ cuelga de people/ y de las hojas, nunca al revés', () => {
    // M-06. buildings.ts es la única puerta a state.buildings; los cinco
    // sistemas de §5 la usan y ninguno cuenta edificios por su cuenta.
    expect(importsOf('subsistence/buildings.ts')).toEqual(['state']);
    expect(importsOf('subsistence/seasons.ts')).toEqual(['balance', 'rng', 'state', 'time']);
    expect(importsOf('subsistence/labour.ts')).toEqual([
      'balance',
      'buildings',
      'people/demography',
      'state',
    ]);
    expect(importsOf('subsistence/consumption.ts')).toEqual([
      'balance',
      'people/demography',
      'people/villagers',
      'rng',
      'state',
      'time',
    ]);
    expect(importsOf('subsistence/harvest.ts')).toEqual([
      'balance',
      'buildings',
      'state',
      'time',
    ]);
    expect(importsOf('subsistence/mood.ts')).toEqual([
      'balance',
      'buildings',
      'people/demography',
      'state',
      'time',
    ]);
    expect(importsOf('subsistence/disasters.ts')).toEqual([
      'balance',
      'buildings',
      'people/demography',
      'rng',
      'state',
      'time',
    ]);
    // Y nadie de people/ mira hacia subsistence/.
    for (const f of ['people/demography.ts', 'people/villagers.ts'] as const) {
      expect(importsOf(f).some((x) => x.includes('subsistence')), f).toBe(false);
    }
  });

  it('ningún módulo del motor se importa a sí mismo', () => {
    for (const [file, self] of [
      ['rng.ts', 'rng'],
      ['balance.ts', 'balance'],
      ['state.ts', 'state'],
      ['time.ts', 'time'],
      ['crossroads/schema.ts', 'schema'],
      ['people/names.ts', 'names'],
      ['people/traits.ts', 'traits'],
      ['people/villagers.ts', 'villagers'],
      ['people/demography.ts', 'demography'],
      ['subsistence/buildings.ts', 'buildings'],
      ['subsistence/labour.ts', 'labour'],
      ['subsistence/consumption.ts', 'consumption'],
      ['subsistence/harvest.ts', 'harvest'],
      ['subsistence/mood.ts', 'mood'],
      ['subsistence/seasons.ts', 'seasons'],
      ['subsistence/disasters.ts', 'disasters'],
    ] as const) {
      expect(importsOf(file), file).not.toContain(self);
    }
  });
});
