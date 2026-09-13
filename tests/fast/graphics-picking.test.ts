// G-07 · design.md D.7 — cámara y selección.
//
// La cámara se puede probar entera sin GPU: es una proyección ortográfica y dos
// operaciones sobre ella. Lo que no cabe aquí es si el gesto se *siente* bien,
// que se juzga con el dedo encima.

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createValleyCamera, CLOSEST_HEIGHT } from '../../src/render3d/camera';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { backendFrom } from '../../src/ui/backend';

const ROOT = resolve(import.meta.dirname, '..', '..');

const VALLEY = { minX: 0, minZ: 0, maxX: 36, maxZ: 56 };
const VILLAGE = { minX: 8, minZ: 18, maxX: 26, maxZ: 38 };
const PHONE = { width: 390, height: 640 };
const LANDSCAPE = { width: 640, height: 390 };

describe('G-07 · la cámara del valle', () => {
  it('encuadra lo que se le pide, en vertical y en apaisado', () => {
    for (const viewport of [PHONE, LANDSCAPE]) {
      const camera = createValleyCamera();
      camera.frame(VILLAGE, viewport);
      // Las cuatro esquinas de lo encuadrado tienen que caer dentro de la
      // pantalla. Con un ajuste por radio en vez de por proyección, en vertical
      // se salían: un rectángulo visto en isométrica es un rombo.
      for (const corner of [
        [VILLAGE.minX, VILLAGE.minZ], [VILLAGE.maxX, VILLAGE.minZ],
        [VILLAGE.minX, VILLAGE.maxZ], [VILLAGE.maxX, VILLAGE.maxZ],
      ]) {
        const seen = screenOf(camera, corner[0] ?? 0, corner[1] ?? 0);
        expect(seen.x, `${viewport.width}×${viewport.height}`).toBeGreaterThanOrEqual(-1);
        expect(seen.x).toBeLessThanOrEqual(1);
        expect(seen.y).toBeGreaterThanOrEqual(-1);
        expect(seen.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('acercar mantiene bajo el dedo lo que había bajo el dedo', () => {
    // D.7 lo pide con esas palabras, y es lo que separa un zoom que se siente
    // de uno que hay que corregir a mano después de cada pellizco.
    const camera = createValleyCamera();
    camera.frame(VALLEY, PHONE);
    let checked = 0;
    for (const [x, y] of [[195, 320], [140, 260], [250, 400], [195, 240], [195, 420]]) {
      // Desde la vista de partida casi toda la pantalla es cielo: un mapa
      // rectangular visto en isométrica deja mucho margen. Se prueba ya
      // acercado, que es cuando alguien pellizca de verdad.
      camera.reset();
      camera.zoom(0.35, 195, 320);
      const before = camera.groundAt(x ?? 0, y ?? 0);
      // Sólo cuenta si el dedo cae sobre el valle. Pellizcando sobre el cielo
      // que hay al lado, mantener el punto exigiría sacar el centro fuera del
      // mapa, y ahí manda el límite de arrastre: son dos reglas de D.7 y en ese
      // caso se cruzan. Que gane el límite es lo correcto —la vista no se va
      // del valle— y esta prueba no puede pedir lo contrario.
      const inside = before.x > VALLEY.minX + 1 && before.x < VALLEY.maxX - 1
        && before.z > VALLEY.minZ + 1 && before.z < VALLEY.maxZ - 1;
      if (!inside) continue;
      camera.zoom(0.5, x ?? 0, y ?? 0);
      const after = camera.groundAt(x ?? 0, y ?? 0);
      expect(after.x, `en ${x},${y}`).toBeCloseTo(before.x, 3);
      expect(after.z, `en ${x},${y}`).toBeCloseTo(before.z, 3);
      checked += 1;
    }
    expect(checked, 'ningún punto de prueba cae sobre el valle').toBeGreaterThanOrEqual(3);
  });

  it('no se puede alejar más allá del encuadre de partida', () => {
    // Más lejos sólo hay prado vacío, y una vista que no cabe en la pantalla no
    // es una vista.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE);
    const resting = camera.view.height;
    for (let step = 0; step < 20; step += 1) camera.zoom(1.5, 195, 320);
    expect(camera.view.height).toBeCloseTo(resting, 6);
  });

  it('ni acercar más de lo que hace falta para ver a una persona', () => {
    const camera = createValleyCamera();
    camera.frame(VALLEY, PHONE);
    for (let step = 0; step < 40; step += 1) camera.zoom(0.7, 195, 320);
    expect(camera.view.height).toBeCloseTo(CLOSEST_HEIGHT, 6);
    // Y a esa distancia un aldeano de 0,65 celdas (D.6.2) ocupa una fracción
    // legible de la pantalla, que es la razón de que el tope esté donde está.
    const share = 0.65 / camera.view.height;
    expect(share).toBeGreaterThan(0.05);
  });

  it('arrastrar mueve el valle y no se sale de él', () => {
    const camera = createValleyCamera();
    camera.frame(VALLEY, PHONE);
    camera.zoom(0.4, 195, 320);
    const before = camera.view.centre;
    camera.pan(120, 0);
    expect(camera.view.centre.x !== before.x || camera.view.centre.z !== before.z).toBe(true);

    // Empujar hasta el infinito deja el centro en el borde, no fuera.
    for (let step = 0; step < 200; step += 1) camera.pan(400, 400);
    expect(camera.view.centre.x).toBeGreaterThanOrEqual(VALLEY.minX);
    expect(camera.view.centre.x).toBeLessThanOrEqual(VALLEY.maxX);
    expect(camera.view.centre.z).toBeGreaterThanOrEqual(VALLEY.minZ);
    expect(camera.view.centre.z).toBeLessThanOrEqual(VALLEY.maxZ);

    for (let step = 0; step < 200; step += 1) camera.pan(-400, -400);
    expect(camera.view.centre.x).toBeGreaterThanOrEqual(VALLEY.minX);
    expect(camera.view.centre.z).toBeGreaterThanOrEqual(VALLEY.minZ);
  });

  it('arrastrar sigue al dedo: el suelo se mueve lo que se mueve la mano', () => {
    const camera = createValleyCamera();
    camera.frame(VALLEY, PHONE);
    camera.zoom(0.5, 195, 320);
    const grabbed = camera.groundAt(150, 300);
    camera.pan(60, 40);
    const under = camera.groundAt(210, 340);
    expect(under.x).toBeCloseTo(grabbed.x, 3);
    expect(under.z).toBeCloseTo(grabbed.z, 3);
  });

  it('volver devuelve exactamente la vista de partida', () => {
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE);
    const resting = { ...camera.view.centre, height: camera.view.height };
    camera.zoom(0.3, 100, 200);
    camera.pan(80, -50);
    camera.reset();
    expect(camera.view.height).toBeCloseTo(resting.height, 6);
    expect(camera.view.centre.x).toBeCloseTo(resting.x, 6);
    expect(camera.view.centre.z).toBeCloseTo(resting.z, 6);
  });

  it('girar el móvil no recorta el valle', () => {
    // El alto visible que hace falta depende de la forma de la pantalla, así
    // que conservarlo al girar dejaría el valle cortado en una de las dos.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE);
    const vertical = camera.limits.furthest;
    camera.resize(LANDSCAPE);
    expect(camera.limits.furthest).not.toBeCloseTo(vertical, 3);
    camera.reset();
    for (const corner of [
      [VILLAGE.minX, VILLAGE.minZ], [VILLAGE.maxX, VILLAGE.maxZ],
    ]) {
      const seen = screenOf(camera, corner[0] ?? 0, corner[1] ?? 0);
      expect(Math.abs(seen.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(seen.y)).toBeLessThanOrEqual(1);
    }
  });

  it('mirar a alguien lo pone en el centro sin cambiar la distancia', () => {
    // Es lo que `track` necesita: seguir a un aldeano no es acercarse a él.
    const camera = createValleyCamera();
    camera.frame(VALLEY, PHONE);
    camera.zoom(0.4, 195, 320);
    const height = camera.view.height;
    camera.look(20, 30);
    expect(camera.view.centre.x).toBeCloseTo(20, 6);
    expect(camera.view.centre.z).toBeCloseTo(30, 6);
    expect(camera.view.height).toBeCloseTo(height, 6);
  });

  it('el suelo bajo un punto de pantalla es el que se ve ahí', () => {
    // La vuelta completa: de celda a pantalla y de pantalla a celda.
    const camera = createValleyCamera();
    camera.frame(VALLEY, PHONE);
    for (const [x, z] of [[10, 20], [30, 50], [1, 1]]) {
      const seen = screenOf(camera, x ?? 0, z ?? 0);
      const back = camera.groundAt(
        ((seen.x + 1) / 2) * PHONE.width,
        ((1 - seen.y) / 2) * PHONE.height,
      );
      expect(back.x).toBeCloseTo(x ?? 0, 3);
      expect(back.z).toBeCloseTo(z ?? 0, 3);
    }
  });
});

describe('G-07 · qué backend pinta el valle', () => {
  it('Canvas por defecto, y ante la duda también', () => {
    // D.5 · el piloto no sustituye a `src/render/` antes de P3, y G-12 es la
    // ronda que decide si alguna vez lo hace. Un interruptor de desarrollo no
    // puede dejar a nadie sin valle por una errata en la dirección.
    expect(backendFrom('', null)).toBe('canvas');
    expect(backendFrom('?render=', null)).toBe('canvas');
    expect(backendFrom('?render=webgl', null)).toBe('canvas');
    expect(backendFrom('?render=3d', null)).toBe('pilot3d');
    expect(backendFrom('?render=pilot3d', null)).toBe('pilot3d');
  });

  it('lo pedido en la dirección manda sobre lo recordado', () => {
    // Volver a 2D tiene que ser posible sin borrar nada, que es lo que se hace
    // cuando el piloto deja de arrancar en un teléfono concreto.
    expect(backendFrom('?render=canvas', 'pilot3d')).toBe('canvas');
    expect(backendFrom('', 'pilot3d')).toBe('pilot3d');
    expect(backendFrom('', 'canvas')).toBe('canvas');
    expect(backendFrom('', 'lo que sea')).toBe('canvas');
  });
});

/** Dónde cae un punto del suelo en la pantalla, en coordenadas de −1 a 1. */
function screenOf(
  camera: ReturnType<typeof createValleyCamera>, x: number, z: number,
): { x: number; y: number } {
  const projected = new Vector3(x, 0, z).project(camera.camera);
  return { x: projected.x, y: projected.y };
}

describe('G-07 · el relevo de lienzo', () => {
  it('los gestos no se enganchan al lienzo, que puede quedarse oculto', () => {
    // El fallo que esto guarda se vio jugando en el ordenador: en 3D no
    // funcionaba **nada** —ni arrastrar, ni pellizcar, ni tocar para abrir la
    // ficha— y no daba ningún error.
    //
    // La causa: los gestos se enganchan una vez al arrancar, y el relevo cambia
    // de lienzo. Cuando el piloto 3D entra, el lienzo de Canvas se oculta con
    // `display: none` y aparece otro encima; un elemento oculto no recibe
    // eventos, así que los gestos se quedaban colgados de nada.
    //
    // Se comprueba sobre el código porque el contrato ya lo fuerza el tipo
    // —`ValleyBackend` exige `surface`— y lo que puede volver a romperse en
    // silencio es el enganche. Montar el juego de verdad necesita un DOM, y la
    // suite rápida no lo tiene.
    const app = readFileSync(resolve(ROOT, 'src', 'ui', 'app.ts'), 'utf8');
    for (const gesture of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) {
      expect(app, `los gestos de ${gesture} van en la raíz, no en el lienzo`)
        .not.toContain(`canvas.addEventListener('${gesture}'`);
    }
    // Y el que hay que usar para medir es el vivo, no el de Canvas.
    expect(app).toContain('backend.live.surface');
  });
});
