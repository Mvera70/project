// M-02 · El grafo de dependencias del motor. Obligatorio y acíclico.
//
// El orden importa porque state.ts es el contrato que M-03 a M-06 van a
// importar en paralelo. Un ciclo aquí no rompe la compilación —con
// verbatimModuleSyntax los `import type` se borran— pero sí rompe la posibilidad
// de razonar sobre qué depende de qué, y es la clase de deuda que se nota
// cuando ya la han heredado cinco módulos.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE = fileURLToPath(new URL('../../src/engine/', import.meta.url));
const DERIVE = fileURLToPath(new URL('../../src/derive/', import.meta.url));

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
    // Y `crown` desde K-2: la puerta de los que llegan la abre o la cierra
    // quien lleva la corona (§5.7). `people/crown.ts` es una hoja a propósito
    // —no importa `demography`, y copia `isHere` en local— justamente para que
    // esta flecha no se invierta.
    // B-1 · y ya no importa `time`: la migración preguntaba `weekOf(tick) !== 0`
    // —una tirada al año— y ese compás pasó a `MIGRATION.ARRIVE_EVERY_WEEKS`,
    // que se compara con el tick a pelo.
    expect(importsOf('people/demography.ts')).toEqual([
      'balance',
      'crown',
      'rng',
      'state',
      'traits',
      'villagers',
    ]);
    expect(importsOf('state.ts')).not.toContain('people/villagers');
    // M-05. memories.ts no conoce a nadie; opinions.ts lo usa para la causa.
    expect(importsOf('people/memories.ts')).toEqual(['balance', 'state', 'time']);
    expect(importsOf('people/opinions.ts')).toEqual([
      'balance',
      'demography',
      'memories',
      'state',
    ]);
    // M-43, v3.61 · el cerebro es la hoja de arriba: usa a los tres de abajo y
    // no lo usa nadie de `people/`, sólo el tick. Por eso puede juntar lo que
    // ninguno de los tres podía juntar sin morderse la cola.
    expect(importsOf('people/minds.ts')).toEqual([
      'balance',
      'demography',
      'memories',
      'opinions',
      'state',
    ]);
    expect(importsOf('people/opinions.ts')).not.toContain('minds');
    expect(importsOf('people/demography.ts')).not.toContain('minds');
  });

  it('subsistence/ cuelga de people/ y de las hojas, nunca al revés', () => {
    // M-06. buildings.ts es la única puerta a state.buildings; los cinco
    // sistemas de §5 la usan y ninguno cuenta edificios por su cuenta.
    expect(importsOf('subsistence/building-counts.ts')).toEqual(['state']);
    expect(importsOf('subsistence/seasons.ts')).toEqual(['balance', 'rng', 'state', 'time']);
    // K-2 · `people/crown`: los campos que se siembran y los puntos de obra
    // salen de la voluntad del rey, donde antes salían de la postura retirada.
    expect(importsOf('subsistence/labour.ts')).toEqual([
      'balance',
      'building-counts',
      'crows',
      'forage',
      'people/crown',
      'people/demography',
      'state',
    ]);
    expect(importsOf('subsistence/consumption.ts')).toEqual([
      'balance',
      'herd',
      'people/demography',
      'people/scars',
      'people/villagers',
      'rng',
      'state',
      'time',
    ]);
    expect(importsOf('subsistence/harvest.ts')).toEqual([
      'balance',
      'building-counts',
      'state',
      'time',
    ]);
    // K-2 · `people/crown`: la fe del rey cura, el hambre del generoso y el
    // ánimo de la corte.
    expect(importsOf('subsistence/mood.ts')).toEqual([
      'balance',
      'building-counts',
      'people/crown',
      'people/demography',
      'state',
      'time',
    ]);
    expect(importsOf('subsistence/disasters.ts')).toEqual([
      'balance',
      'building-counts',
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

  it('world/ cuelga de subsistence/ y de people/, y no conoce §8', () => {
    // M-13 y M-14. tiles.ts es la hoja topológica: la geometría del mapa sin
    // el generador, para que M-14 y M-15 no arrastren el ruido.
    expect(importsOf('world/tiles.ts')).toEqual(['balance']);
    expect(importsOf('world/mapgen.ts')).toEqual(['balance', 'rng', 'state', 'tiles']);
    // `tiles` desde el mapa grande: `placeBuilding` acota su barrido al
    // corazón del valle (`HEART`), que es la misma geometría que el generador
    // usa y que por eso vive en la hoja topológica. Tres módulos con su propia
    // copia del rectángulo son tres rectángulos en cuanto alguien lo cambie.
    // Y `plaza` desde P-1: la reserva de la plaza es una condición de la
    // colocación, así que quien coloca tiene que preguntarla. La hoja sigue
    // siendo `tiles`; `plaza` sólo mira a `balance`, `state` y `tiles`.
    expect(importsOf('world/placement.ts')).toEqual(['balance', 'plaza', 'state', 'tiles']);
    expect(importsOf('world/plaza.ts')).toEqual(['balance', 'state', 'tiles']);
    // K-2 · `people/crown`: el tope de campos lo levanta el rey del campo, que
    // es lo único que la corona cambia de §12.
    expect(importsOf('world/buildings.ts')).toEqual([
      'balance',
      'people/crown',
      'people/demography',
      'state',
      'subsistence/harvest',
    ]);
    // A3 · el bastión cuenta su propio tope contra `subsistence/building-counts`
    // (`count`), porque `withinCap` colapsa su familia en `'wall'`, que no tiene
    // tope.
    expect(importsOf('world/upgrade.ts'))
      .toEqual(['balance', 'placement', 'state', 'subsistence/building-counts']);
    // M-15. astar.ts es hoja: el coste del suelo y nada más. paths.ts es quien
    // sabe quién va a dónde, así que mira a people/ y a subsistence/; forest.ts
    // le avisa de que los árboles se han movido, y la flecha no vuelve.
    expect(importsOf('world/astar.ts')).toEqual(['balance', 'state', 'tiles']);
    expect(importsOf('world/forest.ts')).toEqual(['balance', 'paths', 'state', 'tiles']);
    expect(importsOf('world/paths.ts')).toEqual([
      'astar',
      'balance',
      'people/demography',
      'state',
      'subsistence/building-counts',
      'subsistence/labour',
      'time',
    ]);
    expect(importsOf('world/paths.ts')).not.toContain('forest');
    // K-2 · `people/crown`: qué familia va delante en la cola de §7.3 y si la
    // muralla espera a que haya amenaza lo dice ahora la voluntad del rey, no
    // `state.intent` —que M-2 dejó sin quien lo escriba—.
    expect(importsOf('world/works.ts')).toEqual([
      'balance',
      'buildings',
      'people/crown',
      'people/demography',
      'placement',
      'state',
      'subsistence/building-counts',
      'subsistence/harvest',
      'upgrade',
    ]);
    // §7.3 punto 8 lee la bandera `threatened`, que hoy vive en
    // crossroads/conditions.ts. Leerla desde allí pondría a world/ por encima
    // de la cima del grafo; works.ts la lee de state.flags, que es de quien es.
    for (const f of [
      'world/works.ts', 'world/buildings.ts', 'world/placement.ts',
      'world/astar.ts', 'world/forest.ts', 'world/paths.ts',
    ] as const) {
      expect(importsOf(f).some((x) => x.includes('crossroads')), f).toBe(false);
      expect(importsOf(f).some((x) => x.includes('chronicle')), f).toBe(false);
    }
    // Y nadie de subsistence/ o people/ mira hacia world/.
    for (const f of [
      'people/demography.ts',
      'subsistence/labour.ts',
      'subsistence/harvest.ts',
      'subsistence/disasters.ts',
    ] as const) {
      expect(importsOf(f).some((x) => x.includes('world')), f).toBe(false);
    }
  });

  it('chronicle/ no lo importa nadie: es la salida, no una entrada', () => {
    // M-09. El banco no importa nada; render sólo lee; digest cuenta cabezas.
    expect(importsOf('chronicle/bank.en.ts')).toEqual([]);
    // events.ts lee gente para el epitafio de §9.4; sigue sin que nadie de
    // people/ o subsistence/ mire hacia chronicle/.
    expect(importsOf('chronicle/events.ts')).toEqual(['people/villagers', 'state', 'time']);
    // v2.14: render.ts asks events.ts which entries aggregate by year (9.2).
    // events.ts still imports nothing from render.ts, so the arrow is one way.
    expect(importsOf('chronicle/render.ts')).toEqual(['bank.en', 'bank.es', 'events', 'rng', 'state', 'time']);
    expect(importsOf('chronicle/events.ts')).not.toContain('render');
    expect(importsOf('chronicle/digest.ts')).toEqual(['people/demography', 'state']);
    for (const f of ['people/demography.ts', 'subsistence/mood.ts', 'state.ts'] as const) {
      expect(importsOf(f).some((x) => x.includes('chronicle')), f).toBe(false);
    }
  });

  it('crossroads/ es la cima: lee de todo y nadie lee de él', () => {
    // M-07. schema.ts sigue siendo la hoja de tipos; el resto cuelga de gente,
    // subsistencia y las hojas, y ningún módulo de abajo mira hacia arriba.
    expect(importsOf('crossroads/schema.ts')).toEqual(['state']);
    expect(importsOf('crossroads/cast.ts')).toEqual([
      'conditions',
      'people/demography',
      'people/opinions',
      'people/villagers',
      'rng',
      'schema',
      'state',
    ]);
    for (const f of [
      'state.ts',
      'people/demography.ts',
      'people/opinions.ts',
      'subsistence/mood.ts',
      'chronicle/render.ts',
    ] as const) {
      expect(importsOf(f).some((x) => x.includes('crossroads')), f).toBe(false);
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
      ['people/memories.ts', 'memories'],
      ['people/opinions.ts', 'opinions'],
      ['subsistence/building-counts.ts', 'building-counts'],
      ['subsistence/labour.ts', 'labour'],
      ['subsistence/consumption.ts', 'consumption'],
      ['subsistence/harvest.ts', 'harvest'],
      ['subsistence/mood.ts', 'mood'],
      ['subsistence/seasons.ts', 'seasons'],
      ['subsistence/disasters.ts', 'disasters'],
      ['chronicle/events.ts', 'events'],
      ['chronicle/render.ts', 'render'],
      ['chronicle/digest.ts', 'digest'],
      ['crossroads/conditions.ts', 'conditions'],
      ['crossroads/cast.ts', 'cast'],
      ['crossroads/select.ts', 'select'],
      ['crossroads/resolve.ts', 'resolve'],
      ['crossroads/seeds.ts', 'seeds'],
      ['world/tiles.ts', 'tiles'],
      ['world/mapgen.ts', 'mapgen'],
      ['world/placement.ts', 'placement'],
      ['world/buildings.ts', 'buildings'],
      ['world/upgrade.ts', 'upgrade'],
      ['world/works.ts', 'works'],
      ['world/astar.ts', 'astar'],
      ['world/forest.ts', 'forest'],
      ['world/paths.ts', 'paths'],
    ] as const) {
      expect(importsOf(file), file).not.toContain(self);
    }
  });
});

describe('la derivación no dibuja', () => {
  // `src/derive/` nació al migrar a 3D (G-12): el renderer nuevo importaba
  // siete módulos del viejo para saber qué contar —la paleta, los animales, los
  // ánimos, las señales, los encuentros, las reuniones—, así que el render que
  // se juega dependía del que ya no se juega. Lo que lee el estado se separó de
  // lo que pone tinta, y estas dos pruebas son lo que mantiene la separación:
  // sin ellas, el primer `import` cómodo la deshace.
  const files = readdirSync(DERIVE).filter((name) => name.endsWith('.ts'));

  it('hay algo que comprobar', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it('ningún módulo de derive conoce un render, una interfaz ni Three', () => {
    for (const file of files) {
      const src = readFileSync(DERIVE + file, 'utf8');
      const targets = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '');
      for (const target of targets) {
        expect(target, `${file} importa de '${target}'`).not.toMatch(
          /render|@ui|\/ui\/|^three(\/|$)/u,
        );
      }
    }
  });

  it('ni dibuja: no hay lienzo, ni contexto, ni DOM', () => {
    for (const file of files) {
      const src = readFileSync(DERIVE + file, 'utf8');
      // `ctx`, `fillStyle`, `getContext`: la huella de haber pintado algo.
      expect(src, `${file} parece dibujar`).not.toMatch(
        /getContext|fillStyle|strokeStyle|document|OffscreenCanvas/u,
      );
    }
  });
});
