// G-07 · design.md D.7 — cámara y selección.
//
// La cámara se puede probar entera sin GPU: es una proyección ortográfica y dos
// operaciones sobre ella. Lo que no cabe aquí es si el gesto se *siente* bien,
// que se juzga con el dedo encima.

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createValleyCamera, CLOSEST_HEIGHT, RESTING_HEIGHT_MAX } from '../../src/render3d/camera';
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
    // Una caja que cabe —la de una fundación— entra entera en la pantalla.
    // Las cuatro esquinas de lo encuadrado tienen que caer dentro: con un
    // ajuste por radio en vez de por proyección, en vertical se salían, porque
    // un rectángulo visto en isométrica es un rombo.
    const FOUNDING = { minX: 14, minZ: 24, maxX: 24, maxZ: 32 };
    for (const viewport of [PHONE, LANDSCAPE]) {
      const camera = createValleyCamera();
      camera.frame(FOUNDING, viewport);
      for (const corner of [
        [FOUNDING.minX, FOUNDING.minZ], [FOUNDING.maxX, FOUNDING.minZ],
        [FOUNDING.minX, FOUNDING.maxZ], [FOUNDING.maxX, FOUNDING.maxZ],
      ]) {
        const seen = screenOf(camera, corner[0] ?? 0, corner[1] ?? 0);
        expect(seen.x, `${viewport.width}×${viewport.height}`).toBeGreaterThanOrEqual(-1);
        expect(seen.x).toBeLessThanOrEqual(1);
        expect(seen.y).toBeGreaterThanOrEqual(-1);
        expect(seen.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('y una aldea grande no aleja la vista hasta hacerla ilegible', () => {
    // **La otra mitad, y es la que se veía mal.** Encajar entera una caja ancha
    // en un móvil vertical es una trampa aritmética: dieciocho celdas de ancho
    // en una pantalla de proporción 0,6 piden treinta y tantas de alto, y lo
    // medido en el juego eran cuarenta y siete — la aldea, una miniatura; un
    // aldeano, doce píxeles. `RESTING_HEIGHT_MAX` corta ahí: la vista se queda
    // a ese alto, **centrada en la caja**, y lo que no cabe se alcanza
    // arrastrando. En apaisado la misma caja sí cabe y el tope no interviene.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE);
    expect(camera.view.height).toBeLessThanOrEqual(RESTING_HEIGHT_MAX);
    const middle = screenOf(camera, (VILLAGE.minX + VILLAGE.maxX) / 2, (VILLAGE.minZ + VILLAGE.maxZ) / 2);
    expect(Math.abs(middle.x), 'la aldea queda en el centro').toBeLessThan(0.15);
    expect(Math.abs(middle.y)).toBeLessThan(0.15);
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
  it('el 3D por defecto, y ante la duda también', () => {
    // **G-12: el piloto deja de ser el piloto.** Hasta aquí esta prueba exigía
    // Canvas por defecto, porque D.5 prohibía que el piloto sustituyera a
    // `src/render/` antes de P3. El dueño del diseño cerró esa puerta el 14 sep
    // 2026 con el riesgo escrito delante (`docs/roadmap.md`): el 3D es el
    // juego. La prueba cambia de lado porque cambió la decisión, no para que
    // pasara.
    expect(backendFrom('', null)).toBe('pilot3d');
    expect(backendFrom('?render=', null)).toBe('pilot3d');
    expect(backendFrom('?render=webgl', null)).toBe('pilot3d');
    expect(backendFrom('?render=3d', null)).toBe('pilot3d');
    expect(backendFrom('?render=pilot3d', null)).toBe('pilot3d');
  });

  it('y la puerta de vuelta al Canvas sigue abierta', () => {
    // **Esto es lo que no cambia, y es lo que hace la migración reversible.**
    // Todo lo medido de rendimiento es de un portátil —G-09 quedó parcial por
    // no haber un móvil de verdad— así que si el 3D no arranca en un teléfono
    // concreto tiene que haber algo a lo que volver esa misma tarde, sin
    // borrar ni desplegar nada. Quitar esta puerta es el paso irreversible y
    // no se da hasta que alguien lo abra en un móvil real.
    expect(backendFrom('?render=canvas', null)).toBe('canvas');
    expect(backendFrom('?render=2d', null)).toBe('canvas');
    expect(backendFrom('?render=canvas', 'pilot3d')).toBe('canvas');
    expect(backendFrom('', 'canvas')).toBe('canvas');
    // Y lo pedido en la dirección manda sobre lo recordado, en los dos sentidos.
    expect(backendFrom('?render=3d', 'canvas')).toBe('pilot3d');
    expect(backendFrom('', 'lo que sea')).toBe('pilot3d');
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

describe('La cámara gira · el veredicto del 15 sep 2026', () => {
  // *«Aunque tengamos 3D ahora mismo, solamente tenemos una visión de un plano.
  // Deberíamos poder mirar desde diferentes ángulos.»* — el dueño del diseño,
  // probando la demo. Lo que sigue es esa frase convertida en asertos.

  it('la vista de partida es exactamente la de siempre', () => {
    // **Lo primero, porque es lo que hace comparable una captura nueva con una
    // vieja.** Girar es un desvío sobre `VIEW`, no una dirección nueva: si esto
    // falla, todas las capturas de estudio desde G-01 dejan de servir de
    // referencia y nadie se enteraría.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE, VALLEY);
    const before = screenOf(camera, 18, 28);
    camera.orbit(1.2, 0.3);
    camera.reset();
    const after = screenOf(camera, 18, 28);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it('girar mueve de sitio lo que se ve, y el centro se queda en el centro', () => {
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE, VALLEY);
    const centre = camera.view.centre;
    const cornerBefore = screenOf(camera, VILLAGE.minX, VILLAGE.minZ);
    const middleBefore = screenOf(camera, centre.x, centre.z);

    camera.orbit(Math.PI / 2, 0);

    // Media vuelta: una esquina que estaba a un lado tiene que estar al otro.
    const cornerAfter = screenOf(camera, VILLAGE.minX, VILLAGE.minZ);
    expect(Math.hypot(cornerAfter.x - cornerBefore.x, cornerAfter.y - cornerBefore.y))
      .toBeGreaterThan(0.2);
    // Y lo que estaba en el medio sigue en el medio: se gira alrededor de lo
    // que se mira, que es lo que evita perderse.
    const middleAfter = screenOf(camera, centre.x, centre.z);
    expect(middleAfter.x).toBeCloseTo(middleBefore.x, 6);
    expect(middleAfter.y).toBeCloseTo(middleBefore.y, 6);
  });

  it('dar la vuelta entera vuelve al mismo sitio', () => {
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE, VALLEY);
    const before = screenOf(camera, 12, 22);
    for (let step = 0; step < 8; step += 1) camera.orbit(Math.PI / 4, 0);
    const after = screenOf(camera, 12, 22);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it('la vista no se puede tumbar al suelo ni poner en planta', () => {
    // Por debajo de la banda el valle es una línea; por encima desaparecen las
    // fachadas, que es donde está todo el trabajo de G-10.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE, VALLEY);
    camera.orbit(0, -10);
    expect(camera.angles.pitch).toBeGreaterThan(0.2);
    camera.orbit(0, 10);
    expect(camera.angles.pitch).toBeLessThan(Math.PI / 2 - 0.2);
  });

  it('girar no deja el valle sin poder alejarse', () => {
    // El tope de alejarse se mide proyectando las esquinas, así que depende del
    // ángulo: un rectángulo visto de canto ocupa menos alto que de frente. Sin
    // recalcularlo, girar recortaba el valle. Es el mismo fallo que `resize`
    // tuvo, y la prueba es la misma idea.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE, VALLEY);
    for (const turn of [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, 2.5]) {
      camera.orbit(turn, 0);
      const { furthest } = camera.limits;
      camera.zoom(1000, PHONE.width / 2, PHONE.height / 2);
      expect(camera.view.height).toBeCloseTo(furthest, 6);
      // Y desde ahí se ve el valle entero: las cuatro esquinas caen dentro.
      for (const [x, z] of [
        [VALLEY.minX, VALLEY.minZ], [VALLEY.maxX, VALLEY.minZ],
        [VALLEY.minX, VALLEY.maxZ], [VALLEY.maxX, VALLEY.maxZ],
      ]) {
        const at = screenOf(camera, x!, z!);
        expect(Math.abs(at.y), `esquina (${x}, ${z}) con giro ${turn.toFixed(2)}`)
          .toBeLessThanOrEqual(1.001);
      }
    }
  });

  it('arrastrar sigue al dedo después de girar', () => {
    // `pan` traduce píxeles a celdas pasando por el suelo, así que tiene que
    // seguir funcionando con la vista girada sin saber que se ha girado.
    const camera = createValleyCamera();
    camera.frame(VILLAGE, PHONE, VALLEY);
    camera.orbit(1.1, 0.2);
    const before = camera.groundAt(PHONE.width / 2, PHONE.height / 2);
    camera.pan(40, 0);
    const after = camera.groundAt(PHONE.width / 2 + 40, PHONE.height / 2);
    expect(after.x).toBeCloseTo(before.x, 4);
    expect(after.z).toBeCloseTo(before.z, 4);
  });
});

describe('Los gestos del valle · el veredicto del 15 sep 2026', () => {
  // *«No se puede bien mover el mapa»* y *«si seleccionas algo del mapa, nunca
  // se puede deseleccionar»*. Las dos cosas se comprueban sobre el código, por
  // el mismo motivo que la prueba del relevo de lienzo: montar el juego pide un
  // DOM que la suite rápida no tiene, y lo que puede volver a romperse en
  // silencio es el enganche, no el cálculo.
  const app = readFileSync(resolve(ROOT, 'src', 'ui', 'app.ts'), 'utf8');

  it('arrastrar el valle no abre la crónica', () => {
    // Un deslizamiento vertical era el modo de abrir la crónica antes de que
    // U-05 pusiera la barra de destinos. Con cámara es **el mismo movimiento**
    // que arrastrar el mapa: el valle se movía y al soltar se abría la crónica
    // encima. Los deslizamientos quedan sólo donde no hay cámara.
    const swipes = app.slice(app.indexOf("gesture === 'swipe_down'"));
    expect(app, 'los deslizamientos van tras comprobar que no hay cámara')
      .toMatch(/!backend\.live\.movesCamera\)\s*\{[\s\S]{0,900}?swipe_down/u);
    expect(swipes.length).toBeGreaterThan(0);
  });

  it('tocar el suelo cierra la ficha en vez de abrir otra', () => {
    expect(app, 'un objetivo de terreno o ninguno cierra')
      .toMatch(/target === null \|\| target\.kind === 'terrain'\)\s*closePanel\(\)/u);
  });

  it('la ficha lleva su propia salida', () => {
    expect(app).toContain("className = 'valley-panel-close'");
    expect(app).toContain(`close.addEventListener('click', closePanel)`);
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    expect(html, 'con área táctil de §11.7').toMatch(/\.valley-panel-close \{[^}]*44px/u);
  });

  it('dos toques seguidos devuelven la vista de partida', () => {
    expect(app).toContain('DOUBLE_TAP_MS');
    expect(app).toMatch(/doubleTap && backend\.live\.movesCamera\)\s*\{[\s\S]{0,200}resetView\(\)/u);
  });

  it('se puede girar con dos dedos y con mayúsculas', () => {
    expect(app, 'el retorcer de dos dedos gira').toContain('twistStart');
    expect(app, 'y el punto medio levanta la vista').toContain('midStart');
    expect(app, 'y con un ratón de un botón, mayúsculas').toMatch(/event\.shiftKey.*orbit/su);
  });
});
