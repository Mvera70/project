// Las luces puntuales, siempre las mismas (27 sep 2026). Cambiar cuántas hay
// recompila el sombreador de cada material, y en una tablet eso son segundos
// congelada. Lo que se guarda: el número de luces que ve la cámara no cambia
// haga lo que haga un efecto, y las que se encienden son las más fuertes de
// las que están a la vista.

import { describe, expect, it } from 'vitest';
import { Camera, Group, PointLight, Scene } from 'three';
import { LightPool } from '../../src/render3d/effects/light-pool';

function seenBy(scene: Scene): number {
  const camera = new Camera();
  let count = 0;
  scene.traverseVisible((node) => { if (node instanceof PointLight && node.layers.test(camera.layers)) count += 1; });
  return count;
}

describe('el banco de luces', () => {
  it('la cámara ve siempre las mismas luces, aparezcan las que aparezcan', () => {
    const scene = new Scene();
    const pool = new LightPool(3);
    scene.add(...pool.lights);
    const effects = new Group();
    scene.add(effects);
    pool.step([effects]);
    expect(seenBy(scene)).toBe(3);
    for (let n = 0; n < 6; n += 1) {
      const light = new PointLight('#ff8a33', n + 1, 7, 1.6);
      light.position.set(n, 1, 0);
      effects.add(light);
      pool.step([effects]);
      expect(seenBy(scene)).toBe(3);
    }
  });

  it('enciende las más fuertes de las que se ven, en su sitio del mundo', () => {
    const pool = new LightPool(2);
    const effects = new Group();
    effects.position.set(10, 0, 0);
    const weak = new PointLight('#ffffff', 1);
    const strong = new PointLight('#ff0000', 5);
    strong.position.set(1, 2, 3);
    const hidden = new PointLight('#00ff00', 9);
    const hiding = new Group();
    hiding.visible = false;
    hiding.add(hidden);
    const off = new PointLight('#0000ff', 0);
    effects.add(weak, strong, hiding, off);
    pool.step([effects]);
    const [first, second] = pool.lights;
    expect(first!.intensity).toBe(5);
    expect(first!.position.toArray()).toEqual([11, 2, 3]);
    expect(first!.color.getHexString()).toBe('ff0000');
    expect(second!.intensity).toBe(1);
    effects.remove(weak, strong);
    pool.step([effects]);
    expect(pool.lights.every((light) => light.intensity === 0)).toBe(true);
  });
});
