// G-07 · The valley camera. design.md D.7, §11.
//
// A fixed tilt, an orthographic volume, and two things the player can change:
// how close, and where. D.7 asks that zoom change the orthographic volume
// rather than move the camera, and that the point under the gesture stay under
// it. Both are here, and both are checkable without a GPU, which is why this
// lives apart from the renderer.
//
// **El ángulo ya sí se mueve, y lo pidió el dueño del diseño** (15 sep 2026):
// *«aunque tengamos 3D, solamente tenemos una visión de un plano. Deberíamos
// poder mirar desde diferentes ángulos.»* Tenía razón y era un agujero honesto:
// D.7 se escribió cuando el 3D era un piloto que había que juzgar contra unas
// capturas de estudio, y para eso la dirección **tenía** que ser fija. Desde
// G-12 el 3D es el juego y una dirección fija es una maqueta.
//
// Lo que no cambia: **la dirección de partida es exactamente la de siempre.**
// `VIEW` sigue siendo el vector con el que se juzgó todo desde G-01, y el giro
// se guarda como un desvío sobre él. Así una captura nueva es comparable con
// una vieja mientras nadie toque los dedos, y `reset()` vuelve a ese ángulo.

import { OrthographicCamera, Vector3 } from 'three';

/** The direction the camera looks from. Matches every study capture since G-01. */
export const VIEW = new Vector3(1, 0.9, 1.15);

/**
 * `VIEW` en los dos ángulos que el jugador puede mover.
 *
 * `yaw` es el rumbo alrededor del eje vertical y `pitch` cuánto se mira desde
 * arriba. Se derivan del vector en vez de escribirse a mano justo para que la
 * vista de partida sea **la misma al bit** que antes de que esto existiera: si
 * alguien ajusta `VIEW`, los dos ángulos le siguen.
 */
const BASE_YAW = Math.atan2(VIEW.x, VIEW.z);
const BASE_PITCH = Math.atan2(VIEW.y, Math.hypot(VIEW.x, VIEW.z));

/**
 * Hasta dónde se puede levantar y bajar la vista.
 *
 * TUNE: entre 12° y 78°. Por debajo de 12° la cámara está casi en el suelo, no
 * se ve la aldea y el valle se convierte en una línea; por encima de 78° es una
 * planta y las fachadas —que es donde está el trabajo de G-10— desaparecen. La
 * de partida son 30,6°, que es la que `VIEW` da.
 */
const PITCH_LOW = (12 * Math.PI) / 180;
const PITCH_HIGH = (78 * Math.PI) / 180;

/** El rumbo y la inclinación, en radianes. `yaw` da la vuelta completa. */
export interface Angles {
  readonly yaw: number;
  readonly pitch: number;
}

/**
 * How close the player may get, in cells of visible height.
 *
 * The near end is what makes the scale decision of D.6.2 liveable: a villager is
 * 0.65 cells, so eight cells of visible height puts them at about a twelfth of
 * the screen — close enough to watch one person work. The far end is the whole
 * valley plus its margin, and there is no reason to allow further: past that the
 * player is looking at empty meadow.
 */
export const CLOSEST_HEIGHT = 8;

export interface Bounds {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/**
 * The camera's own state: what it looks at and how much it shows.
 *
 * `height` is the visible height in cells, which is the honest unit here — it
 * says how much valley fits on the screen, and it is what the limits are written
 * in. A zoom factor would say nothing without knowing the screen.
 */
export interface View {
  readonly centre: { x: number; z: number };
  readonly height: number;
}

export interface ValleyCamera {
  readonly camera: OrthographicCamera;
  /** Fit this box on the screen and remember it as the resting view. */
  /**
   * Encuadra `box` y deja llegar hasta `reach`.
   *
   * **Dos cajas y no una.** La de reposo es la aldea, porque es lo que hay que
   * mirar al abrir; la de alcance es el valle con su sierra, porque es hasta
   * donde se puede apartar la vista. Con una sola, alejarse todo lo posible
   * seguía enseñando la aldea y nada más: las montañas de V-14 estaban a
   * cuarenta celdas de una caja que medía veintitrés, o sea que la cámara tenía
   * prohibido llegar a verlas. `reach` se omite cuando son la misma.
   */
  frame(box: Bounds, viewport: Viewport, reach?: Bounds): void;
  resize(viewport: Viewport): void;
  /**
   * Multiply how much is visible by `factor`, keeping the point under
   * `(atX, atY)` in CSS pixels where it was. Below one is closer.
   */
  zoom(factor: number, atX: number, atY: number): void;
  /** Drag the valley by this many CSS pixels. */
  pan(dxCss: number, dyCss: number): void;
  /** Put this point in the middle without changing how close we are. */
  look(x: number, z: number): void;
  /**
   * Gira la vista: `dYaw` alrededor del valle, `dPitch` levantándola.
   *
   * Gira **alrededor de lo que se está mirando**, no sobre la propia cámara: lo
   * que hay en el centro de la pantalla se queda en el centro. Es lo que hace
   * que girar sirva para «mírame esto desde el otro lado» en vez de para
   * perderse. `dPitch` se recorta a la banda de `PITCH_LOW`/`PITCH_HIGH`; `dYaw`
   * no se recorta porque dar la vuelta entera es legítimo.
   */
  orbit(dYaw: number, dPitch: number): void;
  readonly angles: Angles;
  /** Back to the framing `frame` last established. */
  reset(): void;
  /** Where a point on the screen lands on the ground plane, in cells. */
  groundAt(xCss: number, yCss: number): { x: number; z: number };
  readonly view: View;
  /** How much the player may still zoom out, and in. */
  readonly limits: { closest: number; furthest: number };
}

/**
 * El aire que se deja alrededor de lo encuadrado, en celdas de alto.
 *
 * TUNE: cinco. Es lo justo para que la aldea no toque los bordes de la pantalla
 * sin que parezca perdida en medio del prado.
 */
const AIR = 5;


function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export function createValleyCamera(): ValleyCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  let viewport: Viewport = { width: 1, height: 1 };
  let bounds: Bounds = { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  /**
   * La caja que hay que **encuadrar**, aparte de la de alcance.
   *
   * `resize` no la recordaba, y para no dejar el valle cortado al girar el
   * móvil hacía una cosa rara: ponía la altura de reposo igual al tope de
   * alejarse. O sea que después de una rotación «volver» no volvía a la aldea,
   * volvía a ver el valle entero. Guardándola, cada límite se recalcula con la
   * caja que le toca y el apaño desaparece.
   */
  let framed: Bounds = { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  let resting: View = { centre: { x: 0.5, z: 0.5 }, height: 1 };
  let view: View = resting;
  /**
   * La altura que el jugador pidió, antes de recortarla.
   *
   * Hace falta porque los topes se mueven al girar: un rombo visto de canto
   * ocupa menos alto que de frente, así que el tope de alejarse baja en algunos
   * ángulos. Recortando `view.height` y volviendo a recortar el recortado, el
   * giro se comía la distancia **en un solo sentido** y dar la vuelta entera no
   * devolvía la vista de partida — medido, 0,0036 de deriva en ocho octavos.
   * Con la altura pedida guardada aparte, girar y volver deja lo que había.
   */
  let wanted = 1;
  let furthest = 1;
  let angles: Angles = { yaw: BASE_YAW, pitch: BASE_PITCH };

  /** La dirección desde la que se mira, con el giro de ahora mismo aplicado. */
  function direction(): Vector3 {
    const flat = Math.cos(angles.pitch);
    return new Vector3(
      Math.sin(angles.yaw) * flat,
      Math.sin(angles.pitch),
      Math.cos(angles.yaw) * flat,
    );
  }

  /**
   * Lo alto que hay que ver para que `box` quepa, o para que llene la pantalla.
   *
   * Se mide proyectando las cuatro esquinas al espacio de la cámara y no por el
   * radio: un rectángulo visto en isométrica es un rombo mucho más ancho que
   * alto, y encajar un radio deja márgenes que nadie ha pedido.
   *
   * **Y hay dos maneras de encajarlo, no una** (v3.67). `contain` mete la caja
   * entera dentro de la pantalla; `cover` busca la vista más alejada en la que
   * la caja **sigue llenando** la pantalla, dejando que se salga por el lado
   * largo.
   *
   * La diferencia no es cosmética y se vio en una captura. Al reposo hay que
   * contener —la aldea tiene que caber—, pero usar `contain` también para el
   * tope de alejarse daba esto: en un móvil vertical la proporción es 0,46, así
   * que caber **a lo ancho** exige `anchura / 0,46` = 2,16 veces más alto de lo
   * que la caja mide. El valle entero con su sierra, que son 88 celdas de
   * fondo, pedía 243 celdas de alto: el mundo quedaba como un sello en medio de
   * una pantalla vacía, y eso es la mitad de la queja de «el mapa sigue siendo
   * muy pequeño». Con `cover` se ve valle de borde a borde y lo que falta se
   * alcanza arrastrando, que es como funciona cualquier mapa grande.
   */
  function fitting(box: Bounds, mode: 'contain' | 'cover' = 'contain'): number {
    const aspect = Math.max(0.01, viewport.width / Math.max(1, viewport.height));
    place({ x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 }, 1);
    const inverse = camera.matrixWorldInverse;
    let halfWidth = 0;
    let halfHeight = 0;
    for (const corner of [
      new Vector3(box.minX, 0, box.minZ), new Vector3(box.maxX, 0, box.minZ),
      new Vector3(box.minX, 0, box.maxZ), new Vector3(box.maxX, 0, box.maxZ),
    ]) {
      const seen = corner.applyMatrix4(inverse);
      halfWidth = Math.max(halfWidth, Math.abs(seen.x));
      halfHeight = Math.max(halfHeight, Math.abs(seen.y));
    }
    // El aire de alrededor se **suma**, no se multiplica: metido en la caja, el
    // margen horizontal se divide por la proporcion de la pantalla y en un
    // movil vertical vale el doble que el vertical.
    const both = mode === 'contain' ? Math.max : Math.min;
    return both(halfHeight, halfWidth / aspect) * 2 + AIR;
  }

  /** Put the camera above `centre`, showing `height` cells of valley. */
  function place(centre: { x: number; z: number }, height: number): void {
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1);
    const away = span * 4;
    const at = new Vector3(centre.x, 0, centre.z);
    camera.position.copy(at).addScaledVector(direction(), away);
    camera.up.set(0, 1, 0);
    camera.lookAt(at);
    const aspect = Math.max(0.01, viewport.width / Math.max(1, viewport.height));
    const half = height / 2;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.near = 0.1;
    camera.far = away * 4;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  /**
   * Los dos límites, cada uno con su caja.
   *
   * El reposo **contiene** lo encuadrado —la aldea tiene que caber entera— y el
   * tope de alejarse **cubre** la caja de alcance, para que la pantalla siga
   * llena de valle en vez de enseñar un sello en medio del prado. Y el tope
   * nunca queda por debajo del reposo, o `reset()` no podría volver: `settle`
   * recorta la altura al tope, así que un tope más cerca que la vista de
   * partida hace imposible volver a ella.
   */
  function limits(): void {
    resting = { ...resting, height: Math.max(CLOSEST_HEIGHT, fitting(framed)) };
    furthest = Math.max(resting.height, fitting(bounds, 'cover'));
  }

  /**
   * Keep the middle inside the valley.
   *
   * D.7 asks that dragging stay within the valley. The clamp is on the centre
   * and not on the visible edges on purpose: clamping the edges would refuse to
   * pan at all whenever the view is wider than the valley, which is exactly the
   * resting view.
   */
  function settle(next: View): void {
    wanted = next.height;
    view = {
      centre: {
        x: clamp(next.centre.x, bounds.minX, bounds.maxX),
        z: clamp(next.centre.z, bounds.minZ, bounds.maxZ),
      },
      height: clamp(next.height, CLOSEST_HEIGHT, furthest),
    };
    place(view.centre, view.height);
  }

  return {
    camera,

    frame(box: Bounds, next: Viewport, reach?: Bounds): void {
      viewport = next;
      framed = box;
      bounds = reach ?? box;
      resting = {
        centre: { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 },
        height: 1,
      };
      limits();
      settle(resting);
    },

    resize(next: Viewport): void {
      viewport = next;
      // **Lo que hace falta ver depende de la forma de la pantalla**, así que
      // una rotación lo cambia todo: conservar la altura visible dejaría el
      // valle cortado en una de las dos orientaciones.
      limits();
      settle({ centre: view.centre, height: wanted });
    },

    zoom(factor: number, atX: number, atY: number): void {
      const before = this.groundAt(atX, atY);
      const height = clamp(view.height * factor, CLOSEST_HEIGHT, furthest);
      // Move the centre so that whatever was under the fingers stays there.
      place(view.centre, height);
      const after = this.groundAt(atX, atY);
      settle({
        centre: {
          x: view.centre.x + (before.x - after.x),
          z: view.centre.z + (before.z - after.z),
        },
        height,
      });
    },

    pan(dxCss: number, dyCss: number): void {
      const from = this.groundAt(0, 0);
      const to = this.groundAt(dxCss, dyCss);
      settle({
        centre: { x: view.centre.x - (to.x - from.x), z: view.centre.z - (to.z - from.z) },
        height: view.height,
      });
    },

    look(x: number, z: number): void {
      settle({ centre: { x, z }, height: view.height });
    },

    orbit(dYaw: number, dPitch: number): void {
      angles = {
        yaw: angles.yaw + dYaw,
        pitch: clamp(angles.pitch + dPitch, PITCH_LOW, PITCH_HIGH),
      };
      // **El tope de alejarse depende del ángulo**, igual que depende de la
      // forma de la pantalla: un rectángulo visto de canto ocupa menos alto que
      // visto de frente. Sin recalcularlo, girar recortaba el valle por un lado
      // o dejaba de poder alejarse por el otro — el mismo fallo que `resize` ya
      // tenía resuelto, con la misma cura.
      limits();
      // Con la altura **pedida** y no la recortada: si no, girar se comía la
      // distancia en un solo sentido y dar la vuelta entera no devolvía la
      // vista de partida.
      settle({ centre: view.centre, height: wanted });
    },

    reset(): void {
      // Vuelve también el ángulo: «volver» significa la vista de partida, y la
      // de partida es la de `VIEW`, la que todas las capturas han juzgado.
      angles = { yaw: BASE_YAW, pitch: BASE_PITCH };
      limits();
      settle(resting);
    },

    /**
     * Where a screen point meets the ground.
     *
     * The ground is the plane `y = 0`, so this is a ray cast against it by hand.
     * Cheaper than a raycaster and available before anything is in the scene,
     * which is what the zoom needs: it has to ask twice per gesture.
     */
    groundAt(xCss: number, yCss: number): { x: number; z: number } {
      const ndcX = (xCss / Math.max(1, viewport.width)) * 2 - 1;
      const ndcY = -(yCss / Math.max(1, viewport.height)) * 2 + 1;
      const point = new Vector3(ndcX, ndcY, -1).unproject(camera);
      const direction = new Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
      if (Math.abs(direction.y) < 1e-9) return { x: point.x, z: point.z };
      const travel = -point.y / direction.y;
      return { x: point.x + direction.x * travel, z: point.z + direction.z * travel };
    },

    get view(): View {
      return view;
    },

    get angles(): Angles {
      return angles;
    },

    get limits(): { closest: number; furthest: number } {
      return { closest: CLOSEST_HEIGHT, furthest };
    },
  };
}
