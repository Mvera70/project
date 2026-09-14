// V-00 · Lo que el banco tiene que cumplir para que su respuesta valga. Anexo E.
//
// Un banco que se ve bonito y no se sostiene no responde nada: la pregunta es
// si **esta forma de mover el valle** aguanta, y eso se mide. Son las mismas
// propiedades que el plan exige luego a V-01, V-02 y V-07, comprobadas aquí en
// pequeño antes de comprometer una sola semana.

import { describe, expect, it } from 'vitest';
import { advance, createWorld, inside, step, STEP, type World } from '../../src/render3d/life/spike/life';

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
});
