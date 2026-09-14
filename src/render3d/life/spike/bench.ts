// V-00 · La vista del banco. Anexo E.
//
// Figuras simples a propósito: **lo que hay que juzgar es el movimiento, no el
// arte**. Un aldeano con su ropa y su azada distrae de la única pregunta que
// este banco hace, que es si el valle se ve vivo. Si con cápsulas de colores ya
// parece que ahí vive gente, con los modelos de verdad no va a parecer menos.

import {
  AmbientLight, BoxGeometry, CapsuleGeometry, Color, CylinderGeometry,
  DirectionalLight, Group, InstancedMesh as InstancedMeshCtor, Matrix4, Mesh,
  MeshStandardMaterial, type Object3D, OrthographicCamera, PCFSoftShadowMap,
  PlaneGeometry, Scene, SphereGeometry, WebGLRenderer,
} from 'three';
import { advance, createWorld, STEP, type Body, type Prop, type World } from './life';
import { createValley } from './valley';
import type { GameState } from '@engine/state';

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

  function frameWorld(): void {
    camera.position.set(world.width / 2 + 26, 30, world.height / 2 + 26);
    camera.lookAt(world.width / 2, 0, world.height / 2);
    sun.position.set(world.width / 2 + 20, 40, world.height / 2 - 16);
    sun.target.position.set(world.width / 2, 0, world.height / 2);
    const reach = Math.max(world.width, world.height) * 0.75 + 6;
    const shadow = sun.shadow.camera;
    shadow.left = -reach; shadow.right = reach;
    shadow.top = reach; shadow.bottom = -reach; shadow.far = 120;
    shadow.updateProjectionMatrix();
  }

  function resize(): void {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    const span = Math.max(world.width, world.height) * 0.62;
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

  // --- el suelo, dibujado desde la máscara -----------------------------------
  //
  // Lo mismo vale para el prado de cinco casas y para el valle entero: se
  // recorre lo que no se pisa y se levanta. Sin esto habría dos vistas, y dos
  // vistas es donde una se queda atrás sin que nadie lo note.
  let terrain: Object3D[] = [];

  function paintGround(w: World, colourOf?: (cell: number) => string | null): void {
    for (const thing of terrain) {
      scene.remove(thing);
      if (thing instanceof Mesh) {
        thing.geometry.dispose();
        (thing.material as MeshStandardMaterial).dispose();
      }
    }
    terrain = [];

    const ground = new Mesh(
      new PlaneGeometry(w.width, w.height),
      new MeshStandardMaterial({ color: '#7E9B5B' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(w.width / 2, -0.01, w.height / 2);
    ground.receiveShadow = true;
    scene.add(ground);
    terrain.push(ground);

    // Las celdas que tienen color propio —agua, bosque, roqueda— van en una
    // sola malla instanciada: dos mil celdas no pueden ser dos mil objetos.
    if (colourOf !== undefined) {
      const tint = new Map<string, number[]>();
      for (let cell = 0; cell < w.width * w.height; cell += 1) {
        const colour = colourOf(cell);
        if (colour === null) continue;
        const list = tint.get(colour) ?? [];
        list.push(cell);
        tint.set(colour, list);
      }
      for (const [colour, cells] of tint) {
        const patch = new InstancedMeshCtor(
          new BoxGeometry(1, 0.06, 1),
          new MeshStandardMaterial({ color: colour }),
          cells.length,
        );
        const at = new Matrix4();
        cells.forEach((cell, i) => {
          at.makeTranslation((cell % w.width) + 0.5, 0.02, Math.floor(cell / w.width) + 0.5);
          patch.setMatrixAt(i, at);
        });
        patch.receiveShadow = true;
        scene.add(patch);
        terrain.push(patch);
      }
    }

    // Y lo que corta el paso, levantado. Una sola malla para todo.
    const walls: number[] = [];
    for (let cell = 0; cell < w.width * w.height; cell += 1) {
      if (w.blocked[cell] === 1 && (colourOf === undefined || colourOf(cell) === null)) {
        walls.push(cell);
      }
    }
    if (walls.length > 0) {
      const built = new InstancedMeshCtor(
        new BoxGeometry(1, 2.1, 1),
        new MeshStandardMaterial({ color: '#A08A6F' }),
        walls.length,
      );
      const at = new Matrix4();
      walls.forEach((cell, i) => {
        at.makeTranslation((cell % w.width) + 0.5, 1.05, Math.floor(cell / w.width) + 0.5);
        built.setMatrixAt(i, at);
      });
      built.castShadow = true;
      built.receiveShadow = true;
      scene.add(built);
      terrain.push(built);
    }

    for (const h of w.haunts) {
      const slab = new Mesh(
        new CylinderGeometry(0.4, 0.4, 0.06, 12),
        new MeshStandardMaterial({ color: '#9AA98B' }),
      );
      slab.position.set(h.x, 0.05, h.z);
      slab.receiveShadow = true;
      scene.add(slab);
      terrain.push(slab);
    }
  }

  paintGround(world);

  // --- los trastos -----------------------------------------------------------
  //
  // Una pelota y un palo, que son la tercera clase de cosa del valle. Se
  // dibujan donde la simulación diga y nada más: si están en una mano, es
  // porque la simulación los ha puesto ahí.
  const things = new Map<number, Mesh>();

  function makeThing(prop: Prop): Mesh {
    const mesh = prop.kind === 'ball'
      ? new Mesh(
        new SphereGeometry(0.18, 14, 12),
        new MeshStandardMaterial({ color: '#D9C18B' }),
      )
      : new Mesh(
        new CylinderGeometry(0.055, 0.07, 1.05, 8),
        new MeshStandardMaterial({ color: '#6B4A2E' }),
      );
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
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

    // La marca sobre la cabeza dice **qué** está pasando, no sólo que pasa
    // algo: charlar y encararse se leen distinto desde arriba, y a esta escala
    // el color separa mucho antes que la postura.
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
  let cost = 0;
  let fps = 0;
  let frames = 0;
  let fpsAt = performance.now();

  function frame(): void {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();
    const real = Math.min((now - last) / 1000, 0.25);
    last = now;

    const before = performance.now();
    carry = advance(world, real * rate, carry);
    const spent = performance.now() - before;
    cost = cost * 0.92 + spent * 0.08;
    frames += 1;
    if (now - fpsAt > 500) { fps = frames * 1000 / (now - fpsAt); frames = 0; fpsAt = now; }

    for (const body of world.bodies) {
      let figure = figures.get(body.id);
      if (figure === undefined) {
        figure = makeFigure(body);
        figures.set(body.id, figure);
      }
      figure.group.position.set(body.x, 0, body.z);
      figure.group.rotation.y = body.facing;
      figure.mark.visible = body.talkingTo !== null;
      if (body.talkingTo !== null) {
        const stuff = figure.mark.material as MeshStandardMaterial;
        const angry = body.bout === 'shove';
        stuff.color.set(angry ? '#E8503A' : '#FFFFFF');
        stuff.emissive.set(angry ? '#C42D18' : '#FFD98A');
      }
      // Quien va trastabillando se inclina: es lo que hace que un empujón se
      // lea como un empujón y no como alguien que se aparta deprisa.
      const reeling = body.reelUntil > world.steps * STEP;
      figure.group.rotation.x = reeling ? -0.28 : 0;
      if (trails && world.steps - crumbAt > 6) dropCrumb(body, figure);
    }
    if (trails && world.steps - crumbAt > 6) crumbAt = world.steps;

    for (const prop of world.props) {
      let mesh = things.get(prop.id);
      if (mesh === undefined) { mesh = makeThing(prop); things.set(prop.id, mesh); }
      mesh.position.set(prop.x, prop.y + (prop.kind === 'ball' ? 0.18 : 0.08), prop.z);
      if (prop.kind === 'stick') {
        // El palo va tumbado en el suelo y en alto cuando alguien lo empuña:
        // es lo que hace que se vea que va a caer sobre alguien.
        const wielded = prop.held !== null;
        mesh.rotation.set(wielded ? -0.9 : Math.PI / 2, prop.held ?? prop.id, 0);
        mesh.position.y = wielded ? 1.15 : 0.07;
      } else if (prop.held === null) {
        // La pelota rueda: gira según lo que se mueve.
        mesh.rotation.x += prop.vz * STEP * 3;
        mesh.rotation.z -= prop.vx * STEP * 3;
      }
    }

    const talking = world.bodies.filter((b) => b.bout === 'chat').length;
    const scrapping = world.bodies.filter((b) => b.bout === 'shove').length;
    hud.innerHTML = `día ${(world.steps * STEP).toFixed(0)} s · `
      + `${world.bodies.length} vecinos · `
      + `${talking} hablando · ${scrapping} a malas · `
      + `${world.chats} charlas · ${world.shoves} empujones · `
      + `${world.passes} pases · ${world.blows} palos<br>`
      + `<b>${fps.toFixed(0)} fps · ${(cost * 1000).toFixed(0)} µs de simulación por fotograma</b>`;

    resize();
    renderer.render(scene, camera);
  }

  frameWorld();
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
  function reseed(seed: number): void {
    for (const figure of figures.values()) scene.remove(figure.group);
    figures.clear();
    for (const mesh of things.values()) scene.remove(mesh);
    things.clear();
    clearTrails();
    world = createWorld(seed);
    carry = 0;
  }
  control('again', () => reseed(Math.floor(Math.random() * 10_000)));
  // Aldeas donde se sabe que va a haber pelea. La bronca es rara a propósito
  // —la mitad de los pueblos no ve un palo en todo el día— y sin esto habría
  // que darle diez veces a «otra aldea» para verla una.
  const ROUGH = [1, 45, 62, 395, 11, 41];
  control('rough', () => reseed(ROUGH[Math.floor(Math.random() * ROUGH.length)] as number));

  // El valle de verdad, con su río, su bosque y sus noventa y nueve edificios.
  // La partida se simula aquí mismo: cuarenta años de motor tardan un momento y
  // es lo que hace que esto sea el mapa real y no una maqueta parecida.
  let valley: GameState | null = null;
  async function toValley(count: number): Promise<void> {
    hud.innerHTML = '<b>fundando el valle y corriendo cuarenta años…</b>';
    await new Promise((wake) => setTimeout(wake, 30));
    if (valley === null) {
      const { foundGame } = await import('@engine/found');
      const { run } = await import('@engine/sim');
      const { CATALOG } = await import('@engine/crossroads/catalog');
      const game = foundGame(7);
      run(game, 40 * 48, 'prudent', CATALOG);
      valley = game;
    }
    for (const figure of figures.values()) scene.remove(figure.group);
    figures.clear();
    for (const mesh of things.values()) scene.remove(mesh);
    things.clear();
    clearTrails();
    world = createValley(valley, 7, count);
    carry = 0;
    const map = valley.map;
    paintGround(world, (cell) => {
      const kind = map.terrain[cell];
      if (kind === 2) return '#5C7E92';
      if (kind === 1) return '#3F5B35';
      if (kind === 4) return '#6E7A55';
      return null;
    });
    frameWorld();
  }
  control('valley', () => { void toValley(80); });
  control('crowd', () => { void toValley(200); });
  control('trails', () => {
    trails = !trails;
    document.getElementById('trails')?.setAttribute('aria-pressed', String(trails));
    if (!trails) clearTrails();
  });

  return (): void => { running = false; renderer.dispose(); };
}
