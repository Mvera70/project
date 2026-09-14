// V-00 · Lo que el banco tiene que cumplir para que su respuesta valga. Anexo E.
//
// Un banco que se ve bonito y no se sostiene no responde nada: la pregunta es
// si **esta forma de mover el valle** aguanta, y eso se mide. Son las mismas
// propiedades que el plan exige luego a V-01, V-02 y V-07, comprobadas aquí en
// pequeño antes de comprometer una sola semana.

import { describe, expect, it } from 'vitest';
import { advance, createWorld, inside, step, STEP, type World } from '../../src/render3d/life/spike/life';
import { createValley } from '../../src/render3d/life/spike/valley';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';

const SEEDS = [7, 11, 23, 41, 97, 3];

/** Un día entero de banco: dos minutos escénicos. */
function live(world: World, seconds = 120): void {
  const steps = Math.round(seconds / STEP);
  for (let n = 0; n < steps; n += 1) step(world);
}

describe('V-00 · la vida se sostiene', () => {
  it('la misma semilla da la misma aldea, cuerpo a cuerpo', () => {
    // Es la condición de todo lo demás: sin esto no hay forma de reproducir un
    // fallo, ni de que la capa sobreviva a un letargo reconstruyéndose.
    for (const seed of SEEDS.slice(0, 3)) {
      const one = createWorld(seed);
      const two = createWorld(seed);
      live(one, 40);
      live(two, 40);
      for (let i = 0; i < one.bodies.length; i += 1) {
        expect(one.bodies[i]?.x, `semilla ${seed}, cuerpo ${i}`).toBe(two.bodies[i]?.x);
        expect(one.bodies[i]?.z).toBe(two.bodies[i]?.z);
      }
      expect(one.chats).toBe(two.chats);
    }
  });

  it('avanzar a trompicones da lo mismo que avanzar de una vez', () => {
    // El paso fijo, que es lo que separa esto del reloj de la pared: treinta
    // fotogramas por segundo y sesenta tienen que dar la misma aldea.
    // Los dos por el mismo camino —`advance`— pero uno de un trago y el otro a
    // sorbos desiguales, como los da un móvil real. Se compara por número de
    // pasos y no por segundos: el resto que no llega a un paso se queda
    // esperando al fotograma siguiente, que es justo lo que no puede perderse.
    // Lo que se prueba del acumulador son dos cosas: que **no pierde ni dobla
    // pasos** —los que da salen del tiempo que ha recibido, ni uno más ni uno
    // menos— y que llegar a paso N a sorbos deja el mundo igual que llegar de
    // una sentada. Sumar segundos en coma flotante no da nunca el redondo, así
    // que se cuenta en pasos, que es la unidad de verdad de esta capa.
    const jerky = createWorld(23);
    let carry = 0;
    let given = 0;
    const gaps = [0.016, 0.033, 0.008, 0.05, 0.021];
    for (let n = 0; n < 900; n += 1) {
      const gap = gaps[n % gaps.length] as number;
      carry = advance(jerky, gap, carry);
      given += gap;
      expect(jerky.steps, 'ni pierde ni dobla').toBe(Math.floor((given + 1e-9) / STEP));
    }

    // Y el mismo mundo llevado de una vez hasta ese mismo paso.
    const steady = createWorld(23);
    for (let n = 0; n < jerky.steps; n += 1) step(steady);
    for (let i = 0; i < steady.bodies.length; i += 1) {
      expect(jerky.bodies[i]?.x).toBeCloseTo(steady.bodies[i]?.x ?? -1, 9);
      expect(jerky.bodies[i]?.z).toBeCloseTo(steady.bodies[i]?.z ?? -1, 9);
    }
    expect(jerky.chats).toBe(steady.chats);
  });

  it('nadie atraviesa una casa ni se sale del valle', () => {
    // Lo que `detour` y `aroundWalls` hacían a mano sobre una ruta que no podía
    // cambiar, aquí lo hace el propio cuerpo al no caber.
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      const steps = Math.round(120 / STEP);
      for (let n = 0; n < steps; n += 1) {
        step(world);
        for (const body of world.bodies) {
          expect(inside(world, body.x, body.z), `semilla ${seed}: alguien dentro de una casa`)
            .toBe(false);
          expect(body.x).toBeGreaterThanOrEqual(0);
          expect(body.x).toBeLessThanOrEqual(world.width);
          expect(body.z).toBeGreaterThanOrEqual(0);
          expect(body.z).toBeLessThanOrEqual(world.height);
        }
      }
    }
  });

  it('dos cuerpos no ocupan el mismo sitio', () => {
    // La propiedad que hace innecesario `lane`: no hay que repartir carriles
    // porque dos cosas con radio no caben en el mismo punto.
    let worst = Infinity;
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      const steps = Math.round(120 / STEP);
      for (let n = 0; n < steps; n += 1) {
        step(world);
        for (let i = 0; i < world.bodies.length; i += 1) {
          for (let j = i + 1; j < world.bodies.length; j += 1) {
            const a = world.bodies[i];
            const b = world.bodies[j];
            if (a === undefined || b === undefined) continue;
            worst = Math.min(worst, Math.hypot(a.x - b.x, a.z - b.z));
          }
        }
      }
    }
    // Medido: se rozan pero no se meten el uno en el otro. El umbral es la
    // mitad de dos radios, que es el solape que ya se vería como un error.
    expect(worst, `lo más cerca que llegan dos es ${worst.toFixed(3)} celdas`)
      .toBeGreaterThan(0.32);
  });

  it('nadie se mueve a saltos: el paso más largo es un paso', () => {
    // El defecto que persiguió a las últimas rondas, medido de raíz. Con
    // posición que avanza en vez de posición que se evalúa, un salto sólo puede
    // venir de una velocidad absurda.
    let biggest = 0;
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      let was = world.bodies.map((b) => ({ x: b.x, z: b.z }));
      const steps = Math.round(120 / STEP);
      for (let n = 0; n < steps; n += 1) {
        step(world);
        world.bodies.forEach((body, i) => {
          const old = was[i];
          if (old === undefined) return;
          biggest = Math.max(biggest, Math.hypot(body.x - old.x, body.z - old.z));
        });
        was = world.bodies.map((b) => ({ x: b.x, z: b.z }));
      }
    }
    // A paso máximo y con un paso de 1/30 s, un cuerpo no puede cubrir más de
    // unas centésimas de celda. Cualquier cosa por encima sería un teletransporte.
    expect(biggest, `el paso más largo es ${biggest.toFixed(4)} celdas`).toBeLessThan(0.12);
  });

  it('la aldea se encuentra sola, y no todo el rato', () => {
    // El corazón de la propuesta: encuentros que nadie escribió al amanecer.
    // Ni cero —entonces esto no aporta nada— ni un guirigay —entonces no se
    // distingue de un ruido.
    const counts: number[] = [];
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      live(world, 120);
      counts.push(world.chats);
    }
    const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
    for (const n of counts) expect(n, `alguna aldea no se encuentra nunca: ${counts.join(', ')}`).toBeGreaterThan(0);
    expect(mean, `encuentros por jornada: ${counts.join(', ')} (media ${mean.toFixed(1)})`)
      .toBeGreaterThan(2);
    expect(mean).toBeLessThan(40);
  });

  it('el carácter se nota: el sociable para más que el huraño', () => {
    // La variedad no sale de un dado suelto, sale de que dos personas distintas
    // responden distinto a la misma situación. Es lo que en el juego harían los
    // `traits` de §6.3.
    let sociableChats = 0;
    let shyChats = 0;
    for (const seed of SEEDS) {
      const world = createWorld(seed, 12);
      const sorted = [...world.bodies].sort((a, b) => b.sociable - a.sociable);
      const outgoing = new Set(sorted.slice(0, 4).map((b) => b.id));
      const quiet = new Set(sorted.slice(-4).map((b) => b.id));
      const seen = new Set<string>();
      const steps = Math.round(180 / STEP);
      for (let n = 0; n < steps; n += 1) {
        step(world);
        for (const body of world.bodies) {
          if (body.talkingTo === null) continue;
          const key = `${Math.min(body.id, body.talkingTo)}:${Math.max(body.id, body.talkingTo)}:${body.talkUntil}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (outgoing.has(body.id)) sociableChats += 1;
          if (quiet.has(body.id)) shyChats += 1;
        }
      }
    }
    expect(sociableChats, `sociables ${sociableChats} contra huraños ${shyChats}`)
      .toBeGreaterThan(shyChats);
  });

  it('hay aldeas de paz y aldeas de bronca, y lo decide quién vive en ellas', () => {
    // El encargo dicho como medida: que dos aldeas no se parezcan. Si el
    // empujón fuera un dado igual para todos, todas darían la misma cuenta y
    // esto no serviría de nada. Sale del genio de la gente, así que un pueblo
    // sin nadie de mal temple no pega a nadie en todo el día.
    const scraps: number[] = [];
    const talks: number[] = [];
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      live(world, 120);
      scraps.push(world.shoves);
      talks.push(world.chats);
    }
    expect(Math.min(...scraps), `empujones por aldea: ${scraps.join(', ')}`)
      .toBeLessThanOrEqual(1);
    expect(Math.max(...scraps), 'alguna aldea tiene que ser de bronca').toBeGreaterThan(2);
    // Y hablar sigue siendo lo corriente: una aldea donde se pega más que se
    // habla no es una aldea, es una taberna a las tres de la mañana.
    const talked = talks.reduce((n, x) => n + x, 0);
    const shoved = scraps.reduce((n, x) => n + x, 0);
    expect(talked, `${talked} charlas contra ${shoved} empujones`).toBeGreaterThan(shoved);
  });

  it('un empujón mueve de verdad, y aun así nadie se teletransporta', () => {
    // Las dos mitades del mismo asunto. Un empujón que no se nota no es un
    // empujón; uno que salta media celda de golpe es el defecto que este banco
    // existe para no repetir. La cura es que empujar dé **velocidad**, y que la
    // integre el mismo paso que todo lo demás.
    let flung = 0;
    let biggest = 0;
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      let was = world.bodies.map((b) => ({ x: b.x, z: b.z }));
      const steps = Math.round(120 / STEP);
      for (let n = 0; n < steps; n += 1) {
        step(world);
        const now = world.steps * STEP;
        world.bodies.forEach((body, i) => {
          const old = was[i];
          if (old === undefined) return;
          const moved = Math.hypot(body.x - old.x, body.z - old.z);
          biggest = Math.max(biggest, moved);
          if (now < body.reelUntil) flung = Math.max(flung, moved);
        });
        was = world.bodies.map((b) => ({ x: b.x, z: b.z }));
      }
    }
    expect(flung, `el empujado se mueve ${flung.toFixed(3)} celdas por paso`)
      .toBeGreaterThan(0.06);
    expect(biggest, `y nadie pasa de ${biggest.toFixed(3)}`).toBeLessThan(0.12);
  });

  it('los trastos no se pierden, ni se cuelan en una casa, ni están en dos manos', () => {
    // La tercera clase de cosa del valle, que hoy no puede existir porque el
    // motor no la conoce. Lo que hay que garantizar es lo de siempre: que no
    // aparezca donde no cabe y que no se duplique.
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      const steps = Math.round(120 / STEP);
      for (let n = 0; n < steps; n += 1) {
        step(world);
        const hands = new Map<number, number>();
        for (const prop of world.props) {
          expect(inside(world, prop.x, prop.z, 0), `semilla ${seed}: un trasto dentro de una casa`)
            .toBe(false);
          expect(prop.x).toBeGreaterThan(0);
          expect(prop.x).toBeLessThan(world.width);
          expect(prop.z).toBeGreaterThan(0);
          expect(prop.z).toBeLessThan(world.height);
          expect(prop.y).toBeGreaterThanOrEqual(0);
          if (prop.held !== null) {
            expect(hands.has(prop.held), 'nadie lleva dos cosas a la vez').toBe(false);
            hands.set(prop.held, prop.id);
          }
        }
      }
    }
  });

  it('se juega y se pega, pero ninguna de las dos cosas se come la jornada', () => {
    // El equilibrio que costó tres intentos. Sin cansancio salían cincuenta y
    // ocho pases por jornada —la aldea entera detrás de una pelota— y con la
    // primera versión del palo, ninguna pelea en cuatrocientas semillas.
    const passes: number[] = [];
    const blows: number[] = [];
    const chats: number[] = [];
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      live(world, 120);
      passes.push(world.passes);
      blows.push(world.blows);
      chats.push(world.chats);
    }
    const sum = (xs: number[]): number => xs.reduce((n, x) => n + x, 0);
    expect(sum(passes), `pases: ${passes.join(', ')}`).toBeGreaterThan(0);
    expect(Math.max(...passes), 'nadie se pasa la jornada con la pelota').toBeLessThan(30);
    // Y hablar sigue siendo lo corriente, por encima de jugar y de pegar.
    expect(sum(chats), `charlas ${sum(chats)} contra ${sum(passes)} pases y ${sum(blows)} palos`)
      .toBeGreaterThan(sum(blows));
  });

  it('hay pueblos que no ven un palo en todo el día, y pueblos que sí', () => {
    // Lo mismo que con los empujones, un escalón más arriba: la pelea seria
    // depende del genio de quien vive allí **y** de si quedó un palo a mano.
    // Que dependa de las dos cosas es lo que hace que no se pueda predecir.
    let peaceful = 0;
    let rough = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      const world = createWorld(seed);
      live(world, 120);
      if (world.blows === 0) peaceful += 1; else rough += 1;
    }
    expect(peaceful, `de 30 aldeas, ${peaceful} en paz y ${rough} con palos`).toBeGreaterThan(4);
    expect(rough).toBeGreaterThan(4);
  });

  it('una jornada entera se reconstruye en un abrir y cerrar de ojos', () => {
    // La propiedad que salva el letargo: si volver a vivir el día es barato, la
    // capa no necesita guardar nada y por eso no puede corromper una partida.
    const started = performance.now();
    const world = createWorld(41);
    live(world, 120);
    const spent = performance.now() - started;
    expect(world.steps).toBe(Math.round(120 / STEP));
    expect(spent, `reconstruir una jornada cuesta ${spent.toFixed(0)} ms`).toBeLessThan(400);
  });

  it('el valle de verdad aguanta a los ochenta, y nadie acaba en un muro', () => {
    // **La prueba que puede matar el plan**, y por eso es la última y la más
    // cara. Ocho cuerpos en un prado liso no dicen nada: el valle real tiene
    // noventa y nueve edificios, un río que no se cruza, roqueda, y calles
    // estrechas entre las casas, que es donde una multitud se atasca.
    const game = foundGame(7);
    run(game, 40 * 48, 'prudent', CATALOG);
    const world = createValley(game, 7, 80);

    let biggest = 0;
    let trapped = 0;
    let was = world.bodies.map((b) => ({ x: b.x, z: b.z }));
    const steps = Math.round(60 / STEP);
    for (let n = 0; n < steps; n += 1) {
      step(world);
      for (const body of world.bodies) if (inside(world, body.x, body.z)) trapped += 1;
      world.bodies.forEach((body, i) => {
        const old = was[i];
        if (old === undefined) return;
        biggest = Math.max(biggest, Math.hypot(body.x - old.x, body.z - old.z));
      });
      was = world.bodies.map((b) => ({ x: b.x, z: b.z }));
    }

    expect(trapped, 'nadie dentro del río, de la roca ni de una casa').toBe(0);
    // El tope sube de 0,12 a 0,15 con ochenta cuerpos y está justificado: en una
    // plaza llena, separar a alguien de cinco vecinos a la vez mueve más que
    // andar. Sin el recorte del paso 8 esto medía 0,26, que sí era un salto.
    expect(biggest, `con ochenta, el paso más largo es ${biggest.toFixed(3)}`)
      .toBeLessThan(0.15);
    expect(world.chats, 'y la aldea se encuentra sola').toBeGreaterThan(10);
  });
});
