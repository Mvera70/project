// V-06 · La demo de la aldea viva. design.md Anexo E.
//
// El banco de V-00 probaba una idea con ocho cápsulas en un prado. Esto pinta
// **la capa de producción entera** —V-01 a V-06— sobre el valle que funda el
// motor: ochenta vecinos con carácter, impulsos, elección, navegación y
// colisión, cada uno decidiendo por su cuenta qué hacer con su día.
//
// Sigue sin tocar el juego: es una página aparte, como todos los bancos.

import {
  AmbientLight, BoxGeometry, CapsuleGeometry, Color, CylinderGeometry,
  DirectionalLight, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial,
  type Object3D, OrthographicCamera, PCFSoftShadowMap, PlaneGeometry, Scene,
  SphereGeometry, WebGLRenderer,
} from 'three';
import type { GameState } from '@engine/state';
import { createVillage, type Dweller, type Village } from '../village';
import { LIFE_STEP, STEPS_PER_DAY } from '../clock';

/** Un color por lo que se está haciendo. La aldea se lee de un vistazo. */
const DOING: Readonly<Record<string, string>> = {
  work: '#B5793A',
  sit: '#6E8FA8',
  drink: '#4E93A6',
  gossip: '#C86A8E',
  pray: '#9A86C4',
  watch: '#8AA14F',
  loiter: '#7E8B96',
  walking: '#C9C3B4',
  idle: '#6F6A5F',
};

interface Figure {
  group: Group;
  torso: Mesh;
  mark: Mesh;
}

export function mount(canvas: HTMLCanvasElement, hud: HTMLElement): () => void {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color('#AFC3C8');
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 500);

  const sun = new DirectionalLight('#FFF4D8', 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun, sun.target, new AmbientLight('#CFE0E4', 1.6));

  let game: GameState | null = null;
  let life: Village | null = null;
  let scenery: Object3D[] = [];
  const figures = new Map<number, Figure>();
  let rate = 1;
  let carry = 0;
  let last = performance.now();
  let running = true;
  let day = 0;

  function clearScenery(): void {
    for (const thing of scenery) {
      scene.remove(thing);
      if (thing instanceof Mesh || thing instanceof InstancedMesh) {
        thing.geometry.dispose();
        (thing.material as MeshStandardMaterial).dispose();
      }
    }
    scenery = [];
    for (const figure of figures.values()) scene.remove(figure.group);
    figures.clear();
  }

  function paint(world: Village): void {
    clearScenery();
    const { land } = world;

    const ground = new Mesh(
      new PlaneGeometry(land.width, land.height),
      new MeshStandardMaterial({ color: '#7E9B5B' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(land.width / 2, -0.02, land.height / 2);
    ground.receiveShadow = true;
    scene.add(ground);
    scenery.push(ground);

    // El agua, el bosque y la roqueda, cada uno en una malla instanciada.
    const tint: Record<number, string> = { 1: '#3F5B35', 2: '#5C7E92', 3: '#8A8175', 4: '#6E7A55' };
    const byKind = new Map<number, number[]>();
    if (game !== null) {
      for (let cell = 0; cell < game.map.terrain.length; cell += 1) {
        const kind = game.map.terrain[cell] ?? 0;
        if (tint[kind] === undefined) continue;
        const list = byKind.get(kind) ?? [];
        list.push(cell);
        byKind.set(kind, list);
      }
    }
    for (const [kind, cells] of byKind) {
      const patch = new InstancedMesh(
        new BoxGeometry(1, 0.08, 1),
        new MeshStandardMaterial({ color: tint[kind] as string }),
        cells.length,
      );
      const at = new Matrix4();
      cells.forEach((cell, i) => {
        at.makeTranslation((cell % land.width) + 0.5, 0.03, Math.floor(cell / land.width) + 0.5);
        patch.setMatrixAt(i, at);
      });
      patch.receiveShadow = true;
      scene.add(patch);
      scenery.push(patch);
    }

    // Lo construido, de la máscara: una sola malla para todo el pueblo.
    const walls: number[] = [];
    for (let cell = 0; cell < land.blocked.length; cell += 1) {
      const kind = game?.map.terrain[cell] ?? 0;
      if (land.blocked[cell] === 1 && kind !== 2 && kind !== 3) walls.push(cell);
    }
    if (walls.length > 0) {
      const built = new InstancedMesh(
        new BoxGeometry(1, 2.2, 1),
        new MeshStandardMaterial({ color: '#A08A6F' }),
        walls.length,
      );
      const at = new Matrix4();
      walls.forEach((cell, i) => {
        at.makeTranslation((cell % land.width) + 0.5, 1.1, Math.floor(cell / land.width) + 0.5);
        built.setMatrixAt(i, at);
      });
      built.castShadow = true;
      built.receiveShadow = true;
      scene.add(built);
      scenery.push(built);
    }

    // Y los sitios que ofrecen algo: una losa donde la gente se pone.
    for (const place of world.places) {
      const slab = new Mesh(
        new CylinderGeometry(0.55, 0.55, 0.05, 14),
        new MeshStandardMaterial({ color: '#A9B49C' }),
      );
      slab.position.set(place.at.x, 0.06, place.at.z);
      slab.receiveShadow = true;
      scene.add(slab);
      scenery.push(slab);
    }

    // Cámara y sol al tamaño del valle.
    camera.position.set(land.width / 2 + 30, 34, land.height / 2 + 30);
    camera.lookAt(land.width / 2, 0, land.height / 2);
    sun.position.set(land.width / 2 + 22, 44, land.height / 2 - 18);
    sun.target.position.set(land.width / 2, 0, land.height / 2);
    const reach = Math.max(land.width, land.height) * 0.8 + 8;
    const shade = sun.shadow.camera;
    shade.left = -reach; shade.right = reach;
    shade.top = reach; shade.bottom = -reach; shade.far = 140;
    shade.updateProjectionMatrix();
  }

  function makeFigure(dweller: Dweller): Figure {
    const group = new Group();
    const torso = new Mesh(
      new CapsuleGeometry(dweller.body.radius, 0.55, 4, 10),
      new MeshStandardMaterial({ color: DOING.idle as string }),
    );
    torso.position.y = 0.62;
    torso.castShadow = true;
    const head = new Mesh(
      new SphereGeometry(0.2, 12, 10),
      new MeshStandardMaterial({ color: '#E8C9A8' }),
    );
    head.position.y = 1.12;
    head.castShadow = true;
    const front = new Mesh(
      new BoxGeometry(0.28, 0.24, 0.1),
      new MeshStandardMaterial({ color: '#F2EDE3' }),
    );
    front.position.set(0, 0.72, dweller.body.radius + 0.02);
    const mark = new Mesh(
      new SphereGeometry(0.13, 10, 8),
      new MeshStandardMaterial({ color: '#FFFFFF', emissive: new Color('#FFD98A') }),
    );
    mark.position.y = 1.58;
    mark.visible = false;
    group.add(torso, head, front, mark);
    scene.add(group);
    return { group, torso, mark };
  }

  function resize(): void {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    const span = life === null ? 30 : Math.max(life.land.width, life.land.height) * 0.62;
    const aspect = w / h;
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
  }

  function frame(): void {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();
    const real = Math.min((now - last) / 1000, 0.25);
    last = now;

    if (life !== null) {
      carry += real * rate;
      let given = 0;
      while (carry >= LIFE_STEP && given < 240) {
        life.step();
        carry -= LIFE_STEP;
        given += 1;
      }
      // La jornada se acaba y empieza otra: gente nueva, decisiones nuevas.
      if (game !== null && life.steps >= STEPS_PER_DAY) {
        day += 1;
        life = createVillage(game, day);
        paint(life);
      }

      for (const dweller of life.dwellers) {
        let figure = figures.get(dweller.body.id);
        if (figure === undefined) {
          figure = makeFigure(dweller);
          figures.set(dweller.body.id, figure);
        }
        figure.group.position.set(dweller.body.x, 0, dweller.body.z);
        figure.group.rotation.y = dweller.body.facing;
        const what = dweller.doing === null ? 'idle'
          : dweller.doing.there ? dweller.doing.offer.id : 'walking';
        (figure.torso.material as MeshStandardMaterial).color.set(
          DOING[what] ?? (DOING.idle as string),
        );
        figure.mark.visible = dweller.doing?.there === true;
      }

      const tally = life.tally();
      const order = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      hud.innerHTML = `jornada ${day + 1} · ${(life.steps * LIFE_STEP).toFixed(0)} s · `
        + `${life.dwellers.length} vecinos · ${life.places.length} sitios<br>`
        + order.map(([k, n]) => `${k} <b>${n}</b>`).join(' · ');
    }

    resize();
    renderer.render(scene, camera);
  }

  async function load(seed: number): Promise<void> {
    hud.innerHTML = '<b>fundando el valle y corriendo cuarenta años…</b>';
    await new Promise((wake) => setTimeout(wake, 30));
    const { foundGame } = await import('@engine/found');
    const { run } = await import('@engine/sim');
    const { CATALOG } = await import('@engine/crossroads/catalog');
    const fresh = foundGame(seed);
    run(fresh, 40 * 48, 'prudent', CATALOG);
    game = fresh;
    day = 0;
    life = createVillage(fresh, 0);
    carry = 0;
    paint(life);
  }

  function control(id: string, fn: () => void): void {
    document.getElementById(id)?.addEventListener('click', fn);
  }
  for (const speed of [0, 1, 2, 4]) {
    control(`speed-${speed}`, () => {
      rate = speed;
      for (const button of document.querySelectorAll('[id^="speed-"]')) {
        button.setAttribute('aria-pressed', String(button.id === `speed-${speed}`));
      }
    });
  }
  control('again', () => { void load(Math.floor(Math.random() * 10_000)); });

  resize();
  frame();
  void load(7);

  return (): void => { running = false; renderer.dispose(); };
}
