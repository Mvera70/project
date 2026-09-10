import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANIMATION_FPS, parseCatalog, parseRecipe } from '../../tools/art/schema';

const ROOT = resolve(import.meta.dirname, '..', '..');

function source(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;
}

const RECIPE = 'art/recipes/villager/villager.json';

/**
 * La receta cruda, con un color cualquiera puesto en cada material.
 *
 * La receta pide sus colores a la paleta por su papel, y quien los resuelve es
 * `loadRecipe`, que lee dos ficheros. Aquí no se está probando la paleta —eso
 * es de `palette.test.ts`— sino el esqueleto y los clips, así que basta con
 * dejar los materiales satisfechos y mirar lo que interesa.
 */
function rawRecipe(): Record<string, unknown> {
  const raw = source(RECIPE) as Record<string, unknown>;
  const materials = (raw.materials as Array<Record<string, unknown>>)
    .map((material) => ({ ...material, color: '#8a7f6d' }));
  const render = { ...(raw.referenceRender as Record<string, unknown>), worldColor: '#e8e2d6' };
  return { ...raw, materials, referenceRender: render };
}

/**
 * G-04 · El aldeano articulado. design.md D.4.
 *
 * Estas pruebas miran la **receta**, que es la fuente. Lo que sale de Blender
 * lo mide `tools/graphics/animation-audit.ts` sobre el GLB ya cargado en el
 * navegador, y eso necesita Blender y un navegador: no cabe en la suite rápida.
 * Las dos capas comprueban lo mismo desde los dos extremos a propósito, porque
 * entre la receta y el GLB hay un generador, un exportador y un cargador, y ya
 * se perdieron tres clips por el camino una vez.
 */
describe('G-04 · el rig del aldeano', () => {
  const recipe = parseRecipe(rawRecipe());
  const rig = recipe.rig;

  it('declara un esqueleto con los clips que el catálogo indexa', () => {
    const catalog = parseCatalog(source('art/catalog.json'));
    const asset = catalog.assets.find((item) => item.id === recipe.id);

    expect(rig).not.toBeNull();
    expect(asset?.recipe).toBe(RECIPE);
    // El catálogo lleva el índice —sólo nombres— y la receta las definiciones.
    expect(asset?.clips).toEqual(recipe.clips);
    expect(recipe.clips).toEqual(recipe.clipDefinitions.map((clip) => clip.name));
    expect(recipe.clips.length).toBeGreaterThanOrEqual(4);
  });

  it('mueve sólo huesos que existen, y ata sólo piezas que existen', () => {
    const bones = new Set(rig?.bones.map((bone) => bone.name) ?? []);
    for (const clip of recipe.clipDefinitions) {
      for (const track of clip.tracks) {
        expect(bones.has(track.bone), `${clip.name} moves '${track.bone}'`).toBe(true);
      }
    }

    const pieces = new Set([
      ...recipe.primitives.map((piece) => piece.name),
      ...recipe.groups.map((group) => group.name),
    ]);
    for (const piece of Object.keys(rig?.bind ?? {})) {
      expect(pieces.has(piece), `bind names '${piece}'`).toBe(true);
    }
  });

  it('deja las manos disponibles para una herramienta', () => {
    // D.4 · la herramienta es un accesorio que sigue a la mano, no un segundo
    // cuerpo. Sin conector atado no hay dónde colgarla.
    for (const connector of recipe.connectors) {
      expect(Object.keys(rig?.bind ?? {})).toContain(connector);
    }
    expect(recipe.connectors.length).toBeGreaterThanOrEqual(2);
  });

  it('cada clip se basta solo: los cuatro mueven los mismos huesos', () => {
    // Un hueso sin clave conserva la pose que dejo el clip anterior. Andar no
    // tocaba la columna, asi que al pasar de azadonar a andar el torso se
    // quedaba doblado 26 grados y el aldeano caminaba encorvado. No es un
    // defecto del reproductor: un clip tiene que bastarse solo, porque el juego
    // encadenara clips en un orden que nadie decide de antemano.
    const sets = recipe.clipDefinitions.map(
      (clip) => [...new Set(clip.tracks.map((track) => track.bone))].sort().join(','),
    );
    expect(new Set(sets).size, `bone sets: ${sets.join(' | ')}`).toBe(1);
    expect(sets[0]?.split(',').length).toBeGreaterThanOrEqual(12);
  });

  it('declara que huesos son pies y cuales forman una rodilla', () => {
    // Sin esto la auditoria no puede juzgar una marcha, y una pierna que se
    // balancea entera desde la cadera pasa todas las demas comprobaciones.
    const gait = rig?.gait;
    const bones = new Set(rig?.bones.map((bone) => bone.name) ?? []);
    expect(gait).not.toBeNull();
    expect(gait?.feet.length).toBe(2);
    for (const foot of gait?.feet ?? []) expect(bones.has(foot)).toBe(true);
    expect(Object.keys(gait?.knees ?? {}).length).toBe(2);
    for (const chain of Object.values(gait?.knees ?? {})) {
      expect(chain.length).toBe(3);
      for (const bone of chain) expect(bones.has(bone)).toBe(true);
    }
  });

  it('pliega la rodilla hacia atras, no hacia delante', () => {
    // Medido con la sonda del visor: en estos huesos, que apuntan hacia abajo,
    // el signo NEGATIVO es hacia delante. Las espinillas de la primera marcha
    // estaban en negativo, asi que la rodilla se abria hacia delante como la de
    // un pajaro y el paso se veia como un balanceo de pendulo. La flexion vive
    // en positivo, y ningun fotograma puede pasarse al otro lado.
    for (const clip of recipe.clipDefinitions.filter((candidate) => candidate.strideLength !== null)) {
      for (const track of clip.tracks.filter((candidate) => candidate.bone.startsWith('shin'))) {
        const pitches = track.keys.map((key) => key.rotation[0]);
        for (const pitch of pitches) {
          expect(pitch, `${clip.name}/${track.bone} extends the knee forwards`).toBeGreaterThanOrEqual(0);
        }
        expect(Math.max(...pitches), `${clip.name}/${track.bone} barely bends`).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('lleva la zancada de cada clip que camina', () => {
    // D.4 · el controlador mueve al aldeano por el valle y el clip mueve el
    // cuerpo. Sin la zancada no hay forma de casar las dos velocidades, y unos
    // pies que patinan es lo primero que se nota.
    const walking = recipe.clipDefinitions.filter((clip) => clip.name.includes('walk'));
    expect(walking.length).toBeGreaterThanOrEqual(2);
    for (const clip of walking) {
      expect(clip.strideLength, `${clip.name} has no stride`).toBeGreaterThan(0);
    }
    // Cargado se anda más corto que con las manos libres. Las dos zancadas
    // salen de medir el GLB, no de elegirlas: es lo que dan las piernas.
    const free = walking.find((clip) => clip.name === 'walk')?.strideLength ?? 0;
    const laden = walking.find((clip) => clip.name === 'carry_walk')?.strideLength ?? 0;
    expect(laden).toBeLessThan(free);
  });

  it('lleva la zancada hasta el catálogo, que es donde el juego la lee', () => {
    // La receta no la lee nadie en tiempo de ejecución. Si el número se queda
    // ahí, el controlador no puede casar su velocidad con la del clip y los
    // pies patinan —y nadie se entera hasta verlo.
    const catalog = parseCatalog(source('art/catalog.json'));
    const asset = catalog.assets.find((item) => item.id === recipe.id);

    expect(asset?.motion.map((clip) => clip.name)).toEqual(recipe.clips);
    for (const clip of recipe.clipDefinitions) {
      const motion = asset?.motion.find((candidate) => candidate.name === clip.name);
      expect(motion?.strideLength, `${clip.name} stride`).toBe(clip.strideLength);
      expect(motion?.seconds, `${clip.name} duration`).toBeCloseTo(clip.frames / ANIMATION_FPS, 6);
      expect(motion?.loop).toBe(clip.loop);
    }
  });

  it('deja en paz a los recursos que no se mueven', () => {
    // El campo es añadido, nunca exigido: los cinco recursos anteriores a G-04
    // siguen siendo válidos sin tocarlos.
    const catalog = parseCatalog(source('art/catalog.json'));
    for (const asset of catalog.assets.filter((item) => item.clips.length === 0)) {
      expect(asset.motion, `${asset.id}`).toEqual([]);
    }
  });

  it('rechaza un catálogo que dé zancada a un clip que no existe', () => {
    const raw = source('art/catalog.json') as { assets: Array<Record<string, unknown>> };
    const broken = structuredClone(raw);
    const asset = broken.assets.find((item) => item.id === recipe.id);
    if (asset === undefined) throw new Error('The villager left the catalog.');
    asset.motion = [{ name: 'work_scythe', seconds: 1, loop: true, strideLength: 0.6 }];
    expect(() => parseCatalog(broken)).toThrow("names an unlisted clip 'work_scythe'");
  });

  it('rechaza una zancada imposible', () => {
    const broken = structuredClone(rawRecipe());
    const clips = broken.clips as Array<{ name: string; strideLength?: number }>;
    const walk = clips.find((candidate) => candidate.name === 'walk');
    if (walk === undefined) throw new Error('The walk clip is gone.');
    walk.strideLength = 0;
    expect(() => parseRecipe(broken)).toThrow('strideLength must be a positive number');
  });

  it('no mueve la raíz: la locomoción es in-place', () => {
    // §5.2 · quien desplaza al aldeano por el valle es el juego, que ya sabe a
    // qué velocidad va. Si el clip también lo desplazara, las dos velocidades
    // tendrían que coincidir para siempre y los pies patinarían en cuanto
    // alguien tocara una constante.
    for (const clip of recipe.clipDefinitions) {
      const roots = clip.tracks.filter((track) => track.bone === 'root');
      expect(roots, `${clip.name} keys the root`).toEqual([]);
    }
  });

  it('mantiene cada clave dentro de los fotogramas que el clip declara', () => {
    for (const clip of recipe.clipDefinitions) {
      for (const track of clip.tracks) {
        for (const key of track.keys) {
          expect(key.frame).toBeGreaterThanOrEqual(1);
          expect(key.frame, `${clip.name}/${track.bone}`).toBeLessThanOrEqual(clip.frames);
        }
      }
    }
  });

  it('cierra el bucle de los clips que ciclan', () => {
    for (const clip of recipe.clipDefinitions.filter((candidate) => candidate.loop)) {
      for (const track of clip.tracks) {
        const first = track.keys[0];
        const last = track.keys[track.keys.length - 1];
        expect(last?.frame, `${clip.name}/${track.bone} ends short of its span`).toBe(clip.frames);
        expect(last?.rotation, `${clip.name}/${track.bone} jumps on the loop`).toEqual(first?.rotation);
      }
    }
  });

  it('rechaza un bucle que no vuelve a su primera pose', () => {
    const broken = structuredClone(rawRecipe());
    const clips = broken.clips as Array<{ name: string; frames: number; tracks: Array<{ keys: Array<{ rotation: number[] }> }> }>;
    const clip = clips.find((candidate) => candidate.name === 'walk');
    const track = clip?.tracks[0];
    const last = track?.keys[track.keys.length - 1];
    if (last === undefined) throw new Error('The walk clip lost its keys.');
    last.rotation = [last.rotation[0] ?? 0, 0, 12];

    expect(() => parseRecipe(broken)).toThrow('loops but its last key does not match its first');
  });

  it('rechaza un esqueleto imposible antes de llamar a Blender', () => {
    const base = rawRecipe();
    const withRig = (bones: unknown, bind?: unknown): unknown => ({
      ...base,
      rig: { ...(base.rig as Record<string, unknown>), bones, ...(bind === undefined ? {} : { bind }) },
    });
    const good = { name: 'root', head: [0, 0, 0], tail: [0, 0, 0.2], parent: null };

    expect(() => parseRecipe(withRig([good, { ...good, name: 'twin' }, { ...good, name: 'twin' }])))
      .toThrow("duplicate 'twin'");
    expect(() => parseRecipe(withRig([{ ...good, tail: [0, 0, 0] }])))
      .toThrow("bone 'root' has zero length");
    expect(() => parseRecipe(withRig([{ ...good, parent: 'nobody' }])))
      .toThrow("unknown parent 'nobody'");
    expect(() => parseRecipe(withRig([good], { Villager_Head: 'nobody' })))
      .toThrow("bind['Villager_Head'] names an unknown bone");
  });
});
