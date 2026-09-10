// G-07 · The valley camera. design.md D.7, §11.
//
// A fixed tilt, an orthographic volume, and two things the player can change:
// how close, and where. D.7 asks that zoom change the orthographic volume
// rather than move the camera, and that the point under the gesture stay under
// it. Both are here, and both are checkable without a GPU, which is why this
// lives apart from the renderer.
//
// The tilt is not adjustable. D.7 says to calibrate it against the river, the
// density of houses and the reading of people rather than assume forty-five
// degrees is right; the angle that G-01 to G-06 used is the one every study
// capture was judged on, so it stays until someone judges a different one.

import { OrthographicCamera, Vector3 } from 'three';

/** The direction the camera looks from. Matches every study capture since G-01. */
export const VIEW = new Vector3(1, 0.9, 1.15);

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
  frame(box: Bounds, viewport: Viewport): void;
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
  /** Back to the framing `frame` last established. */
  reset(): void;
  /** Where a point on the screen lands on the ground plane, in cells. */
  groundAt(xCss: number, yCss: number): { x: number; z: number };
  readonly view: View;
  /** How much the player may still zoom out, and in. */
  readonly limits: { closest: number; furthest: number };
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export function createValleyCamera(): ValleyCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  let viewport: Viewport = { width: 1, height: 1 };
  let bounds: Bounds = { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  let resting: View = { centre: { x: 0.5, z: 0.5 }, height: 1 };
  let view: View = resting;
  let furthest = 1;

  /**
   * The visible height that fits `bounds` on this viewport.
   *
   * Measured by projecting the box's corners into camera space, not by its
   * radius. A rectangular area seen in isometric is a lozenge much wider than it
   * is tall, and fitting a radius leaves margins nobody asked for.
   */
  function fitting(box: Bounds): number {
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
    return Math.max(halfHeight, halfWidth / aspect) * 2 * 1.06;
  }

  /** Put the camera above `centre`, showing `height` cells of valley. */
  function place(centre: { x: number; z: number }, height: number): void {
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1);
    const away = span * 4;
    const at = new Vector3(centre.x, 0, centre.z);
    camera.position.copy(at).addScaledVector(VIEW.clone().normalize(), away);
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
   * Keep the middle inside the valley.
   *
   * D.7 asks that dragging stay within the valley. The clamp is on the centre
   * and not on the visible edges on purpose: clamping the edges would refuse to
   * pan at all whenever the view is wider than the valley, which is exactly the
   * resting view.
   */
  function settle(next: View): void {
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

    frame(box: Bounds, next: Viewport): void {
      viewport = next;
      bounds = box;
      furthest = Math.max(CLOSEST_HEIGHT, fitting(box));
      resting = {
        centre: { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 },
        height: furthest,
      };
      settle(resting);
    },

    resize(next: Viewport): void {
      viewport = next;
      // The furthest view depends on the shape of the screen, so a rotation
      // changes it. Keeping the same visible height across a rotation would
      // crop the valley on one of the two orientations.
      furthest = Math.max(CLOSEST_HEIGHT, fitting(bounds));
      resting = { ...resting, height: furthest };
      settle(view);
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

    reset(): void {
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

    get limits(): { closest: number; furthest: number } {
      return { closest: CLOSEST_HEIGHT, furthest };
    },
  };
}
