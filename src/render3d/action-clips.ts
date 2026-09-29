// IA-12 · Acciones compartidas por los esqueletos del catálogo, sin cambiar sus GLB.
import { type AnimationClip, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import { STRIKE_AT, VILLAGER_CLIPS, type ClipName } from './clips';

/**
 * Los clips que este módulo **fabrica**, y que por tanto no están en el GLB ni
 * en `art/catalog.json`.
 *
 * Está exportada porque `VILLAGER_CLIPS` es un superconjunto del catálogo desde
 * IA-12 y alguien tiene que poder comprobar por qué: un nombre en la tabla que
 * ni venga del GLB ni se fabrique aquí es un clip que nadie puede reproducir, y
 * eso en pantalla es un aldeano en pose de descanso haciendo como que trabaja.
 * Lo vigila `tests/fast/graphics-clock.test.ts`.
 */
export const ACTION_CLIPS: readonly ClipName[] = [
  'sit', 'talk', 'pray', 'hammer', 'chop', 'mine', 'sow', 'spread', 'douse', 'play', 'throw', 'drink', 'sort', 'shelter',
  'bow_draw', 'bow_loose', 'gate_strike', 'spear_thrust', 'spear_thrust_high', 'spear_thrust_low', 'hit_take', 'fall', 'flee',
];

export function actionClips(idle: AnimationClip): AnimationClip[] {
  return ACTION_CLIPS.map(name => {
    const duration = VILLAGER_CLIPS[name].seconds;
    const clip = idle.clone(); clip.name = name; clip.duration = duration;
    for (const track of clip.tracks) track.times = Float32Array.from(track.times, t => t * duration / idle.duration);
    // Los giros de un mismo hueso se acumulan (IA-anim: el torso gira y se
    // dobla a la vez); la pista se escribe una sola vez al final.
    const turns = new Map<string, { axis: Vector3; angle: (t: number) => number }[]>();
    const turn = (bone: string, axis: Vector3, angle: (t: number) => number): void => {
      turns.set(bone, [...turns.get(bone) ?? [], { axis, angle }]);
    };
    const flush = (): void => {
      for (const [bone, list] of turns) {
        // GLTFLoader elimina los puntos del nombre del hueso al crear los tracks.
        const original = idle.tracks.find(track => track.name === `${bone.replaceAll('.', '')}.quaternion`);
        if (original === undefined) continue;
        const base = new Quaternion().fromArray(original.values, 0), times: number[] = [], values: number[] = [];
        // 48 muestras: el golpe dura una décima del ciclo y con 24 se perdía.
        for (let n = 0; n <= 48; n++) {
          const t = n / 48; times.push(t * duration);
          const q = base.clone();
          for (const { axis, angle } of list) q.multiply(new Quaternion().setFromAxisAngle(axis, angle(t)));
          values.push(...q.toArray());
        }
        clip.tracks = clip.tracks.filter(track => track.name !== original.name);
        clip.tracks.push(new QuaternionKeyframeTrack(original.name, times, values));
      }
    };
    const x = new Vector3(1, 0, 0), y = new Vector3(0, 1, 0), z = new Vector3(0, 0, 1);
    const wave = (t: number): number => Math.sin(t * Math.PI * 2);
    /**
     * IA-anim · Un valor por pose clave, interpolado entre ellas. Cada tramo
     * lleva su propia curva: la subida suave, el golpe acelerado hasta el
     * impacto (`strike`), el rebote corto. Es lo que distingue un hachazo de un
     * brazo que sube y baja al ritmo de un seno.
     */
    const keyed = (keys: readonly (readonly [number, number, 'smooth' | 'strike' | 'hold'])[]) => (t: number): number => {
      for (let i = 1; i < keys.length; i += 1) {
        const [t0, v0] = keys[i - 1]!, [t1, v1, curve] = keys[i]!;
        if (t > t1) continue;
        const u = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
        const eased = curve === 'strike' ? u * u * u : curve === 'hold' ? 0 : u * u * (3 - 2 * u);
        return v0 + (v1 - v0) * eased;
      }
      return keys.at(-1)![1];
    };
    if (name === 'flee') {
      // Carrera de silueta grande: piernas y brazos opuestos, torso echado
      // hacia delante y dos apoyos idénticos por ciclo. Se fabrica aparte de
      // `walk`: a la distancia de juego acelerar el paseo no se lee como huir.
      // AN-3 · La huida va a 1,6–2,6 celdas/s (5–8 m/s, un esprint) y con la
      // zancada de 0,44 daba 3,7–5,8 ciclos por segundo, casi el paso de andar
      // con las piernas más abiertas. Zancada de 0,7 (2,1 m por ciclo),
      // piernas a ±46°, la de atrás casi recta y la de delante con la rodilla
      // alta: 2,3–3,7 Hz. Y la cadera sigue a la pierna que apoya: con las
      // piernas abiertas la pierna es más corta en vertical, y sin bajar la
      // cadera los pies flotaban (la versión de E1 iba diez centímetros por
      // encima del suelo en cada apoyo); baja hasta 0,10 m y sube 0,03 m en
      // el cruce, que es el vuelo. Medido con el rig: muslo y canilla 0,38 m.
      const thigh = (side: 1 | -1, t: number): number => 0.8 * side * wave(t);
      const bend = (side: 1 | -1, t: number): number => 0.3 + 0.8 * Math.max(0, -side * wave(t));
      turn('thigh.L', x, t => thigh(1, t)); turn('shin.L', x, t => bend(1, t));
      turn('thigh.R', x, t => thigh(-1, t)); turn('shin.R', x, t => bend(-1, t));
      turn('upperarm.L', x, t => -1.0 * wave(t));
      turn('forearm.L', x, () => -1.1);
      turn('upperarm.R', x, t => 1.0 * wave(t));
      turn('forearm.R', x, () => -1.1);
      turn('spine', x, t => 0.26 + 0.04 * Math.abs(wave(t)));
      const root = idle.tracks.find(track => track.name === 'hips.position');
      if (root !== undefined) {
        const LEG = 0.38, extent = (side: 1 | -1, t: number): number => {
          const a = thigh(side, t), b = bend(side, t);
          return LEG * Math.cos(a) + LEG * Math.cos(a - b);
        };
        const at = Array.from(root.values.slice(0, 3)), times: number[] = [], values: number[] = [];
        for (let n = 0; n <= 24; n++) {
          const t = n / 24; times.push(t * duration);
          const drop = Math.max(-0.1, Math.max(extent(1, t), extent(-1, t)) - 2 * LEG);
          values.push(at[0]!, at[1]! + drop + 0.03 * (1 - Math.abs(wave(t))), at[2]!);
        }
        clip.tracks = clip.tracks.filter(track => track.name !== root.name);
        clip.tracks.push(new VectorKeyframeTrack(root.name, times, values));
      }
    } else if (name === 'bow_draw' || name === 'bow_loose') {
      // Tensado sostenible: extremos idénticos, respiración leve. La suelta
      // empieza con la mano ya separándose de la mejilla, sin anticipación
      // que desplace el nacimiento físico de la flecha.
      const release = (t: number): number => name === 'bow_draw' ? 0 : Math.min(1, t * 4);
      turn('upperarm.L', x, t => -1.4 + 0.45 * release(t));
      turn('forearm.L', x, () => -0.12);
      turn('upperarm.R', new Vector3(1, 0, -0.55).normalize(), t => -1.3 + 0.25 * release(t));
      turn('forearm.R', x, t => -2.5 + 1.1 * release(t));
      // El rig no tiene dedos articulados: la apertura se lee en la palma
      // que gira y se libera, ya en t=0 de la flecha, y después en el brazo.
      turn('hand.R', z, t => name === 'bow_draw' ? 0 : 0.35 * (1 - t));
      turn('spine', z, t => name === 'bow_draw' ? 0.025 * wave(t) : -0.1 * Math.sin(Math.PI * t));
    } else if (name === 'gate_strike') {
      // El contacto es t=0, como el daño. AN-3 · Los golpes van a paso fijo
      // (`raiders.ts`, `BLOW_STEPS`: uno por segundo), así que el clip dura
      // el segundo entero y trae el golpe siguiente: retirada del contacto
      // (0–0,3), carga con los dos brazos por encima de la cabeza y el
      // tronco atrás (0,3–0,85), y espera cargado hasta que el hecho
      // siguiente vuelve a ponerlo en t=0. Antes se retiraba y se quedaba
      // con los brazos caídos: un asaltante que golpea sin levantar el arma.
      for (const side of ['L', 'R']) {
        turn(`upperarm.${side}`, x, keyed([[0, -1.45, 'smooth'], [0.3, -0.75, 'smooth'], [0.85, -2.45, 'smooth'], [1, -2.45, 'hold']]));
        turn(`forearm.${side}`, x, keyed([[0, -0.1, 'smooth'], [0.3, -0.8, 'smooth'], [0.85, -1.25, 'smooth'], [1, -1.25, 'hold']]));
      }
      turn('spine', x, keyed([[0, 0.3, 'smooth'], [0.3, 0.05, 'smooth'], [0.85, -0.18, 'smooth'], [1, -0.18, 'hold']]));
      turn('head', x, keyed([[0, 0.1, 'smooth'], [0.3, 0, 'smooth'], [0.85, -0.15, 'smooth'], [1, -0.15, 'hold']]));
    } else if (name === 'spear_thrust' || name === 'spear_thrust_high' || name === 'spear_thrust_low') {
      // Contacto en cero, como el daño real. Recuperación sin mover el cuerpo
      // físico: un nuevo golpe puede interrumpir los 0,9 s del encargo.
      // AN-5b · La alta sube los dos brazos y endereza el tronco: la punta pasa
      // de 0,35 a la altura del pecho de un ciervo; la baja los baja y dobla
      // la espalda, y clava hacia abajo en el lomo del jabalí (`hunt-shot.ts`, `THRUST`).
      const raise = name === 'spear_thrust_high' ? 1 : name === 'spear_thrust_low' ? -0.5 : 0;
      const recoil = (t: number): number => Math.min(1, t * 3);
      turn('upperarm.R', x, t => -1.55 - (raise < 0 ? 0.3 : 0.2) * raise * (1 - recoil(t)) + 1.1 * recoil(t));
      turn('forearm.R', x, t => -0.08 - 0.8 * recoil(t));
      turn('upperarm.L', x, t => -0.7 - 0.2 * raise * (1 - recoil(t)) + 0.4 * recoil(t));
      turn('forearm.L', x, () => -0.65);
      turn('spine', x, t => (0.22 - (raise < 0 ? 0.25 : 0.1) * raise) * (1 - recoil(t)));
      turn('thigh.L', x, t => -0.2 * (1 - recoil(t)));
      turn('shin.L', x, t => 0.25 * (1 - recoil(t)));
    } else if (name === 'hit_take') {
      const recoil = (t: number): number => (1 - t) * (1 - t);
      turn('spine', x, t => -0.3 * recoil(t));
      turn('head', x, t => -0.12 * recoil(t));
      for (const side of ['L', 'R']) {
        turn(`upperarm.${side}`, x, t => -0.8 * recoil(t));
        turn(`forearm.${side}`, x, t => -0.9 * recoil(t));
      }
      turn('thigh.R', x, t => 0.15 * recoil(t));
      turn('shin.R', x, t => 0.2 * recoil(t));
    } else if (name === 'fall') {
      const settle = (t: number): number => t * t * (3 - 2 * t);
      // De espaldas, brazos separados y rodillas flexionadas; el cuerpo gira
      // desde la cadera y baja hasta apoyar el torso. Todo queda inmóvil al final.
      turn('hips', x, t => -Math.PI / 2 * settle(t));
      for (const side of ['L', 'R']) {
        turn(`thigh.${side}`, x, t => -0.2 * settle(t));
        turn(`shin.${side}`, x, t => 0.4 * settle(t));
        turn(`upperarm.${side}`, z, t => (side === 'L' ? -0.65 : 0.65) * settle(t));
        turn(`forearm.${side}`, x, t => -0.3 * settle(t));
      }
      const root = idle.tracks.find(track => track.name === 'hips.position');
      if (root !== undefined) {
        const at = Array.from(root.values.slice(0, 3)), times: number[] = [], values: number[] = [];
        for (let n = 0; n <= 24; n++) {
          const t = n / 24; times.push(t * duration);
          values.push(at[0]!, at[1]! + (0.16 - at[1]!) * settle(t), at[2]!);
        }
        clip.tracks = clip.tracks.filter(track => track.name !== root.name);
        clip.tracks.push(new VectorKeyframeTrack(root.name, times, values));
      }
    } else if (name === 'sit') {
      // AN-2 · Se sentaba en el aire a la altura de un banco que no existe (no
      // hay banco ni tronco en el valle: `encargos-3d.md`). Sin asiento se
      // sienta en el suelo: la cadera baja a 0,25 m, las rodillas se alzan,
      // los pies quedan a ras y las manos descansan sobre las rodillas; el
      // tronco se mece apenas. Números medidos sobre el rig (pies a ±2 cm).
      for (const side of ['L', 'R']) {
        turn(`thigh.${side}`, x, () => -1.9); turn(`shin.${side}`, x, () => 1.35); turn(`foot.${side}`, x, () => 0.4);
        turn(`upperarm.${side}`, x, () => -0.6); turn(`forearm.${side}`, x, () => -0.7);
      }
      turn('spine', x, t => 0.12 + 0.03 * wave(t));
      turn('head', x, () => 0.05);
      const root = idle.tracks.find(track => track.name === 'hips.position');
      if (root !== undefined) {
        clip.tracks = clip.tracks.filter(track => track.name !== root.name);
        const at = Array.from(root.values.slice(0, 3)); at[1] = at[1]! - 0.61;
        clip.tracks.push(new VectorKeyframeTrack(root.name, [0, duration], [...at, ...at]));
      }
    } else if (name === 'talk') {
      // AN-2 · A veinte píxeles sólo se leía la burbuja. La mano derecha sube y
      // abre delante del pecho dos veces por ciclo, la izquierda contesta a
      // contratiempo con un gesto más corto, y la cabeza asiente y se vuelve:
      // dos que hablan se distinguen de dos que esperan.
      const beat = (t: number): number => Math.max(0, Math.sin(t * Math.PI * 4));
      const reply = (t: number): number => Math.max(0, -wave(t));
      turn('upperarm.R', x, t => -0.35 - 0.5 * beat(t));
      turn('upperarm.R', z, t => 0.25 + 0.25 * beat(t));
      turn('forearm.R', x, t => -1.1 - 0.5 * beat(t));
      turn('upperarm.L', x, t => -0.15 - 0.35 * reply(t));
      turn('forearm.L', x, t => -0.8 - 0.45 * reply(t));
      turn('head', x, t => 0.05 + 0.1 * Math.sin(t * Math.PI * 6));
      turn('head', y, t => 0.14 * wave(t));
      turn('spine', x, () => 0.05);
    } else if (name === 'pray') {
      // AN-2 · Manos juntas y cabeza gacha, quietas cinco segundos, era
      // alguien parado. Una inclinación lenta por ciclo: se dobla desde la
      // cintura, las manos suben al mentón y la cabeza baja con el tronco.
      const bow = (t: number): number => 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      for (const side of ['L', 'R']) { turn(`upperarm.${side}`, x, t => -0.55 - 0.3 * bow(t)); turn(`forearm.${side}`, x, () => -1.1); }
      turn('spine', x, t => 0.06 + 0.45 * bow(t));
      turn('head', x, t => 0.2 + 0.12 * bow(t));
    } else if (name === 'mine' || name === 'chop') {
      // IA-anim · Pico y hacha: tres poses —preparado, arriba, golpe— con la
      // subida lenta, la bajada acelerada hasta el impacto y un rebote. El
      // impacto cae en `STRIKE_AT` del ciclo (`clips.ts`), que es donde el
      // render suelta las astillas. El pico sube por encima de la cabeza y
      // clava al suelo delante; el hacha carga sobre el hombro derecho y
      // barre en diagonal hasta el tronco a la altura de la cintura.
      const at = STRIKE_AT[name];
      // Preparado, arriba, golpe y rebote, en fracción del ciclo.
      const pose = (ready: number, up: number, hit: number) => keyed([
        [0, ready, 'smooth'], [at - 0.12, up, 'smooth'], [at, hit, 'strike'],
        [at + 0.06, hit + (up - hit) * 0.08, 'smooth'], [at + 0.12, hit, 'smooth'],
        [at + 0.3, ready, 'smooth'], [1, ready, 'smooth'],
      ]);
      if (name === 'mine') {
        for (const side of ['L', 'R']) {
          // Golpe con los brazos más adelante que abajo: un cuerpo no puede
          // pisar a menos de 0,32 del borde de la roca y el pico, clavando a
          // los pies, se quedaba fuera de ella.
          turn(`upperarm.${side}`, x, pose(-0.9, -2.75, -0.95));
          turn(`forearm.${side}`, x, pose(-0.7, -1.0, -0.05));
          turn(`upperarm.${side}`, z, pose(0, 0, 0));
          turn(`thigh.${side}`, x, pose(-0.1, 0.05, -0.35));
          turn(`shin.${side}`, x, pose(0.15, 0, 0.55));
        }
        turn('spine', x, pose(0.15, -0.2, 0.7));
        turn('head', x, pose(0.1, -0.15, 0.25));
      } else {
        turn('upperarm.R', x, pose(-0.8, -2.3, -1.15));
        turn('forearm.R', x, pose(-0.7, -1.4, -0.1));
        turn('upperarm.L', x, pose(-0.85, -1.9, -1.2));
        turn('forearm.L', x, pose(-0.75, -1.6, -0.15));
        turn('spine', y, pose(0, 0.4, -0.4));
        turn('spine', x, pose(0.1, -0.05, 0.3));
        turn('thigh.L', x, pose(0, 0.05, -0.2));
        turn('shin.L', x, pose(0.05, 0, 0.3));
      }
    } else if (name === 'sow' || name === 'spread' || name === 'douse') {
      // IA-fields · Mismas tres poses que el hacha: preparado, carga, suelta.
      const at = STRIKE_AT[name];
      const pose = (ready: number, up: number, hit: number) => keyed([
        [0, ready, 'smooth'], [at - 0.2, up, 'smooth'], [at, hit, 'strike'],
        [at + 0.15, hit, 'smooth'], [1, ready, 'smooth'],
      ]);
      if (name === 'sow') {
        // La bolsa cuelga de la izquierda, al costado; la derecha carga atrás,
        // junto a su cadera, y barre hacia delante y afuera. Vera (24 sep):
        // con la bolsa cruzada delante de la barriga y la mano yendo a buscar
        // simiente al otro lado, los brazos se veían soldados al cuerpo.
        turn('upperarm.L', x, () => -0.1); turn('upperarm.L', z, () => -0.15); turn('forearm.L', x, () => -0.35);
        // Grande a propósito: a veinte píxeles de aldeano un voleo corto no se
        // distingue de rascarse el pecho (primera versión, vista en el banco).
        // Medido en el banco: con más apertura el brazo acababa por detrás
        // del cuerpo; la suelta va delante y a la derecha, a la altura del hombro.
        turn('upperarm.R', x, pose(-0.3, 0.35, -1.7));
        turn('upperarm.R', z, pose(0.1, -0.15, 0.55));
        turn('forearm.R', x, pose(-0.6, -0.4, -0.1));
        turn('spine', y, pose(0, 0.35, -0.35));
      } else {
        // Horca: se hunde a los pies con el torso doblado y se lanza arriba y
        // adelante; los brazos van juntos por el mango. El cubo de agua (E4) es
        // el mismo gesto a dos manos: se carga abajo y se vacía hacia el fuego.
        for (const side of ['L', 'R']) {
          turn(`upperarm.${side}`, x, pose(-0.7, -0.45, -1.7));
          turn(`forearm.${side}`, x, pose(-0.6, -0.3, -0.9));
          turn(`thigh.${side}`, x, pose(0, -0.3, 0));
          turn(`shin.${side}`, x, pose(0, 0.5, 0));
        }
        turn('spine', x, pose(0.15, 0.55, -0.1));
        turn('spine', y, pose(0, 0.15, -0.2));
      }
    } else if (name === 'hammer') {
      // AN-2b · Era un seno del brazo sin instante de golpe. Las tres poses
      // del hacha a una mano y en corto: carga sobre el hombro, golpe
      // acelerado hasta `STRIKE_AT` y rebote, con la izquierda sujetando la
      // pieza delante y el tronco acompañando. El render suelta chispas o
      // astillas en el golpe (`world/cast.ts`).
      const at = STRIKE_AT.hammer;
      const pose = (ready: number, up: number, hit: number) => keyed([
        [0, ready, 'smooth'], [at - 0.15, up, 'smooth'], [at, hit, 'strike'],
        [at + 0.05, hit + (up - hit) * 0.12, 'smooth'], [at + 0.1, hit, 'smooth'],
        [at + 0.35, ready, 'smooth'], [1, ready, 'smooth'],
      ]);
      turn('upperarm.R', x, pose(-0.9, -2.1, -0.5));
      turn('forearm.R', x, pose(-0.9, -1.5, -0.3));
      turn('upperarm.L', x, () => -0.6); turn('forearm.L', x, () => -0.95);
      turn('spine', x, pose(0.1, -0.05, 0.3));
      turn('head', x, pose(0.15, 0.05, 0.3));
    } else if (name === 'sort') {
      // AN-2 · Ordenar era un vaivén de manos delante del pecho. Ahora es
      // coger y poner: se dobla a por algo a la altura de la cintura, lo
      // levanta al pecho y lo deja a su derecha girando el tronco, y vuelve.
      // Tres tiempos que a veinte píxeles se leen como alguien que mueve cosas.
      const cycle = keyed([[0, 0, 'smooth'], [0.3, 1, 'smooth'], [0.5, 0, 'smooth'], [0.75, -1, 'smooth'], [1, 0, 'smooth']]);
      const bend = (t: number): number => Math.max(0, cycle(t)), place = (t: number): number => Math.max(0, -cycle(t));
      turn('spine', x, t => 0.12 + 0.75 * bend(t));
      turn('spine', y, t => -0.55 * place(t));
      for (const side of ['L', 'R']) {
        turn(`upperarm.${side}`, x, t => -0.35 - 0.2 * bend(t) - 0.55 * place(t));
        turn(`forearm.${side}`, x, t => -1.15 + 0.75 * bend(t) + 0.6 * place(t));
      }
      turn('head', x, t => 0.15 + 0.25 * bend(t) - 0.1 * place(t));
    } else if (name === 'shelter') {
      // Bajo el alero: los brazos cruzados contra el pecho, los hombros
      // encogidos, la cabeza gacha y un tiritón corto de vez en cuando.
      const shiver = (t: number): number => 0.035 * Math.sin(t * Math.PI * 2 * 7) * Math.max(0, Math.sin(t * Math.PI * 2));
      for (const [side, sign] of [['L', -1], ['R', 1]] as const) {
        turn(`upperarm.${side}`, x, () => -0.45);
        turn(`upperarm.${side}`, z, t => sign * (-0.28 + shiver(t)));
        turn(`forearm.${side}`, x, () => -1.5);
        turn(`forearm.${side}`, y, () => sign * 0.6);
      }
      turn('spine', x, t => 0.14 + shiver(t) * 0.5);
      turn('head', x, () => 0.28);
    } else if (name === 'drink') {
      // AN-2 · La taza subía a la boca y se quedaba: a veinte píxeles no se
      // veía beber. Tres tiempos: la taza sube desde la cintura, la cabeza se
      // echa atrás con la taza en la boca, y todo baja.
      const lift = keyed([[0, 0, 'smooth'], [0.3, 1, 'smooth'], [0.62, 1, 'hold'], [0.9, 0, 'smooth'], [1, 0, 'smooth']]);
      const sip = keyed([[0, 0, 'smooth'], [0.3, 0, 'smooth'], [0.45, 1, 'smooth'], [0.6, 1, 'hold'], [0.75, 0, 'smooth'], [1, 0, 'smooth']]);
      turn('upperarm.R', x, t => -0.25 - 0.65 * lift(t));
      turn('upperarm.R', z, t => -0.45 * lift(t));
      turn('forearm.R', x, t => -0.7 - 1.2 * lift(t));
      turn('head', x, t => -0.35 * sip(t));
      turn('spine', x, t => -0.06 * sip(t));
    } else if (name === 'play') {
      // AN-2a · Jugar sin pelota, que es lo que un niño hace la mayor parte
      // de su día de juego (`day.ts`): brinca —dos saltos por ciclo, la
      // rodilla que sube alterna— y bracea abierto, con el tronco que se
      // vuelve. Era un balanceo de brazos abiertos que a veinte píxeles no se
      // distinguía de estar de pie.
      const hop = (t: number): number => Math.max(0, Math.sin(t * Math.PI * 4));
      const side = (t: number): number => Math.sin(t * Math.PI * 2);
      turn('upperarm.L', z, t => -0.45 - 0.5 * hop(t)); turn('upperarm.R', z, t => 0.45 + 0.5 * hop(t));
      turn('upperarm.L', x, t => -0.3 * hop(t)); turn('upperarm.R', x, t => -0.3 * hop(t));
      turn('forearm.L', x, () => -0.5); turn('forearm.R', x, () => -0.5);
      turn('thigh.L', x, t => -1.25 * Math.max(0, side(t)) * hop(t)); turn('shin.L', x, t => 1.35 * Math.max(0, side(t)) * hop(t));
      turn('thigh.R', x, t => -1.25 * Math.max(0, -side(t)) * hop(t)); turn('shin.R', x, t => 1.35 * Math.max(0, -side(t)) * hop(t));
      turn('spine', y, t => 0.3 * side(t));
      turn('spine', x, t => -0.05 * hop(t));
      turn('head', x, t => -0.12 * hop(t));
      const root = idle.tracks.find(track => track.name === 'hips.position');
      if (root !== undefined) {
        const at = Array.from(root.values.slice(0, 3)), times: number[] = [], values: number[] = [];
        for (let n = 0; n <= 48; n++) {
          const t = n / 48; times.push(t * duration);
          // El salto: la cadera sube 0,12 m en lo alto de cada brinco.
          values.push(at[0]!, at[1]! + 0.12 * hop(t), at[2]!);
        }
        clip.tracks = clip.tracks.filter(track => track.name !== root.name);
        clip.tracks.push(new VectorKeyframeTrack(root.name, times, values));
      }
    } else {
      // AN-2a · `throw`: lanzar la pelota, de una vez y fechado por el hecho
      // que viene (`life/cast.ts`). Pose 0: la pelota sujeta con las dos
      // manos delante. Carga atrás y arriba hasta 0,6, giro del tronco y
      // barrido del brazo hasta la suelta al final del clip, que es el paso en
      // que `fling` pone la pelota en el aire; lo que sigue —el brazo que baja—
      // lo pone el fundido a `idle` de `world/cast.ts`.
      const wind = keyed([[0, 0, 'smooth'], [0.6, 1, 'smooth'], [0.97, -1, 'strike'], [1, -1, 'smooth']]);
      const back = (t: number): number => Math.max(0, wind(t)), fore = (t: number): number => Math.max(0, -wind(t));
      turn('upperarm.R', x, t => -0.75 - 1.85 * back(t) - 1.25 * fore(t));
      turn('upperarm.R', z, t => 0.15 + 0.35 * back(t));
      turn('forearm.R', x, t => -1.2 - 0.5 * back(t) + 1.0 * fore(t));
      turn('upperarm.L', x, t => -0.75 - 0.35 * back(t) + 0.3 * fore(t));
      turn('forearm.L', x, t => -1.2 + 0.7 * back(t) + 0.9 * fore(t));
      turn('spine', y, t => 0.4 * back(t) - 0.35 * fore(t));
      turn('spine', x, t => -0.12 * back(t) + 0.28 * fore(t));
      turn('head', x, t => -0.1 * back(t) + 0.1 * fore(t));
    }
    flush();
    return clip;
  });
}
