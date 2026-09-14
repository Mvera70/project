// V-00 · La vista del banco. Anexo E.
//
// Figuras simples a propósito: **lo que hay que juzgar es el movimiento, no el
// arte**. Un aldeano con su ropa y su azada distrae de la única pregunta que
// este banco hace, que es si el valle se ve vivo. Si con cápsulas de colores ya
// parece que ahí vive gente, con los modelos de verdad no va a parecer menos.

import {
  AmbientLight, BoxGeometry, CapsuleGeometry, Color, CylinderGeometry,
  DirectionalLight, Group, Mesh, MeshStandardMaterial, OrthographicCamera,
  PCFSoftShadowMap, PlaneGeometry, Scene, SphereGeometry, WebGLRenderer,
} from 'three';
import { advance, createWorld, STEP, type Body } from './life';

const SKIN = ['#C8553D', '#4A7C59', '#3E6B8A', '#B58A3C', '#7A4E8C', '#2F6F6B', '#A34F6D', '#5C6B3A'];

interface Figure {
  group: Group;
  mark: Mesh;
  trail: Mesh[];
}

export function mount(canvas: HTMLCanvasElement, hud: HTMLElement): () => void {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color('#AFC3C8');

  let world = createWorld(7);
  let carry = 0;
  let rate = 1;
  let trails = false;
  let last = performance.now();

  // --- cámara isométrica, como la del juego ---------------------------------
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(world.width / 2 + 26, 30, world.height / 2 + 26);
  camera.lookAt(world.width / 2, 0, world.height / 2);

  function resize(): void {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    const span = 21;
    const aspect = w / h;
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
  }

  // --- luz -------------------------------------------------------------------
  const sun = new DirectionalLight('#FFF4D8', 2.4);
  sun.position.set(world.width / 2 + 20, 34, world.height / 2 - 14);
  sun.target.position.set(world.width / 2, 0, world.height / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shade = sun.shadow.camera;
  shade.left = -28; shade.right = 28; shade.top = 28; shade.bottom = -28; shade.far = 90;
  shade.updateProjectionMatrix();
  scene.add(sun, sun.target, new AmbientLight('#CFE0E4', 1.5));

  // --- suelo y casas ---------------------------------------------------------
  const ground = new Mesh(
    new PlaneGeometry(world.width, world.height),
    new MeshStandardMaterial({ color: '#7E9B5B' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(world.width / 2, 0, world.height / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  for (const o of world.obstacles) {
    const wall = new Mesh(
      new BoxGeometry(o.w, 2.1, o.h),
      new MeshStandardMaterial({ color: '#A08A6F' }),
    );
    wall.position.set(o.x + o.w / 2, 1.05, o.z + o.h / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    const roof = new Mesh(
      new BoxGeometry(o.w + 0.5, 0.35, o.h + 0.5),
      new MeshStandardMaterial({ color: '#8B5E3C' }),
    );
    roof.position.set(o.x + o.w / 2, 2.28, o.z + o.h / 2);
    roof.castShadow = true;
    scene.add(wall, roof);
  }

  // Los sitios de siempre, marcados con una losa para entender adónde va todo
  // el mundo. En el juego serían el pozo, la era y el vado.
  for (const h of world.haunts) {
    const slab = new Mesh(
      new CylinderGeometry(0.85, 0.85, 0.08, 20),
      new MeshStandardMaterial({ color: '#9AA98B' }),
    );
    slab.position.set(h.x, 0.04, h.z);
    slab.receiveShadow = true;
    scene.add(slab);
  }

  // --- la gente --------------------------------------------------------------
  const figures = new Map<number, Figure>();

  function makeFigure(body: Body): Figure {
    const group = new Group();
    const colour = SKIN[body.id % SKIN.length] as string;
    const torso = new Mesh(
      new CapsuleGeometry(body.radius, 0.55, 4, 10),
      new MeshStandardMaterial({ color: colour }),
    );
    torso.position.y = 0.62;
    torso.castShadow = true;
    const head = new Mesh(
      new SphereGeometry(0.21, 14, 12),
      new MeshStandardMaterial({ color: '#E8C9A8' }),
    );
    head.position.y = 1.14;
    head.castShadow = true;
    // Un peto al frente: a esta escala el color separa mucho mejor que la forma,
    // y hace falta ver hacia dónde mira alguien para creerse que conversa.
    const front = new Mesh(
      new BoxGeometry(0.3, 0.26, 0.1),
      new MeshStandardMaterial({ color: '#F2EDE3' }),
    );
    front.position.set(0, 0.72, body.radius + 0.02);
    group.add(torso, head, front);

    const mark = new Mesh(
      new SphereGeometry(0.15, 12, 10),
      new MeshStandardMaterial({ color: '#FFFFFF', emissive: new Color('#FFD98A') }),
    );
    mark.position.y = 1.62;
    mark.visible = false;
    group.add(mark);

    scene.add(group);
    return { group, mark, trail: [] };
  }

  function dropCrumb(body: Body, figure: Figure): void {
    const crumb = new Mesh(
      new CylinderGeometry(0.06, 0.06, 0.02, 8),
      new MeshStandardMaterial({
        color: SKIN[body.id % SKIN.length] as string,
        transparent: true, opacity: 0.5,
      }),
    );
    crumb.position.set(body.x, 0.03, body.z);
    scene.add(crumb);
    figure.trail.push(crumb);
    if (figure.trail.length > 90) {
      const old = figure.trail.shift();
      if (old !== undefined) {
        scene.remove(old);
        old.geometry.dispose();
        (old.material as MeshStandardMaterial).dispose();
      }
    }
  }

  function clearTrails(): void {
    for (const figure of figures.values()) {
      for (const crumb of figure.trail) {
        scene.remove(crumb);
        crumb.geometry.dispose();
        (crumb.material as MeshStandardMaterial).dispose();
      }
      figure.trail.length = 0;
    }
  }

  // --- bucle -----------------------------------------------------------------
  let running = true;
  let crumbAt = 0;

  function frame(): void {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();
    const real = Math.min((now - last) / 1000, 0.25);
    last = now;

    carry = advance(world, real * rate, carry);

    for (const body of world.bodies) {
      let figure = figures.get(body.id);
      if (figure === undefined) {
        figure = makeFigure(body);
        figures.set(body.id, figure);
      }
      figure.group.position.set(body.x, 0, body.z);
      figure.group.rotation.y = body.facing;
      figure.mark.visible = body.talkingTo !== null;
      if (trails && world.steps - crumbAt > 6) dropCrumb(body, figure);
    }
    if (trails && world.steps - crumbAt > 6) crumbAt = world.steps;

    const talking = world.bodies.filter((b) => b.talkingTo !== null).length;
    hud.textContent = `día ${(world.steps * STEP).toFixed(0)} s · `
      + `${world.bodies.length} vecinos · ${talking} hablando ahora · `
      + `${world.chats} encuentros`;

    resize();
    renderer.render(scene, camera);
  }

  resize();
  frame();

  // --- mandos ----------------------------------------------------------------
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
  control('again', () => {
    for (const figure of figures.values()) scene.remove(figure.group);
    figures.clear();
    clearTrails();
    world = createWorld(Math.floor(Math.random() * 10_000));
    carry = 0;
  });
  control('trails', () => {
    trails = !trails;
    document.getElementById('trails')?.setAttribute('aria-pressed', String(trails));
    if (!trails) clearTrails();
  });

  return (): void => { running = false; renderer.dispose(); };
}
