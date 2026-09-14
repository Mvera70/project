// V-06 · Elegir, y la aldea entera. Anexo E.
//
// **Aquí es donde el plan dice que hay que parar y mirar.** Con cuerpos,
// impulsos y elección, el valle ya debería hacer cosas que nadie escribió. Si a
// partir de aquí sigue pareciendo una coreografía, el problema es el modelo y
// no falta más código encima.
//
// Así que estas pruebas no comprueban un módulo: comprueban que **pasa algo, que
// no pasa siempre lo mismo, y que pasa por una razón**.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState } from '@engine/state';
import { blockedAt } from '../../src/render3d/life/body';
import { createVillage } from '../../src/render3d/life/village';
import { worth } from '../../src/render3d/life/decide';
import { freshNeeds } from '../../src/render3d/life/needs';
import { OFFERS } from '../../src/render3d/life/offers';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

const grown = new Map<number, GameState>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, 40 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

describe('V-06 · elegir', () => {
  it('lo que calma lo que aprieta vale más', () => {
    // La regla entera, en una comparación. Un árbol de decisión diría «si tiene
    // sed, al pozo»; esto dice cuánto vale el pozo para quien tiene sed, que es
    // lo que permite que a veces gane otra cosa.
    const needs = freshNeeds();
    needs.thirst = 0.9;
    needs.rest = 0.05;
    const here = { x: 10, z: 10 };
    const drink = { ...OFFERS.drink, at: here } as never;
    const sit = { ...OFFERS.sit, at: here } as never;

    expect(worth(drink, needs, [], here)).toBeGreaterThan(worth(sit, needs, [], here));

    // Y al revés en cuanto cambia lo que aprieta: la misma persona, el mismo
    // sitio, otra decisión.
    needs.thirst = 0.05;
    needs.rest = 0.95;
    expect(worth(sit, needs, [], here)).toBeGreaterThan(worth(drink, needs, [], here));
  });

  it('lo mismo vale menos cuanto más lejos está', () => {
    const needs = freshNeeds();
    needs.thirst = 0.8;
    const near = { ...OFFERS.drink, at: { x: 10, z: 10 } } as never;
    const far = { ...OFFERS.drink, at: { x: 40, z: 40 } } as never;
    const from = { x: 10, z: 10 };
    expect(worth(near, needs, [], from)).toBeGreaterThan(worth(far, needs, [], from) * 2);
  });

  it('el carácter elige, y no sólo se cansa distinto', () => {
    const needs = freshNeeds();
    needs.irritation = 0.6;
    needs.boredom = 0.6;
    const here = { x: 5, z: 5 };
    const pray = { ...OFFERS.pray, at: here } as never;
    expect(worth(pray, needs, ['devout'], here), 'el devoto va a rezar')
      .toBeGreaterThan(worth(pray, needs, [], here));

    needs.company = 0.7;
    const gossip = { ...OFFERS.gossip, at: here } as never;
    expect(worth(gossip, needs, ['secretive'], here), 'el reservado esquiva el corro')
      .toBeLessThan(worth(gossip, needs, ['generous'], here));
  });

  it('la aldea hace cosas, y no todos la misma', () => {
    // El criterio del plan, dicho en una medida: si a estas alturas el valle no
    // sorprende, sobra seguir. Se mira qué hace la aldea a lo largo del día.
    for (const seed of [7, 11, 23]) {
      const life = createVillage(village(seed), 0);
      const seen = new Map<string, number>();
      let busiest = 0;

      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        if (n % 120 !== 0) continue;
        const tally = life.tally();
        let doing = 0;
        for (const [what, count] of Object.entries(tally)) {
          if (what === 'nada') continue;
          seen.set(what, (seen.get(what) ?? 0) + count);
          doing += count;
        }
        busiest = Math.max(busiest, doing);
      }

      const kinds = [...seen.keys()].filter((k) => k !== 'andando');
      expect(busiest, `semilla ${seed}: la aldea no hace nada`).toBeGreaterThan(0);
      expect(kinds.length, `semilla ${seed}: sólo se hace ${kinds.join(', ') || 'nada'}`)
        .toBeGreaterThan(1);
    }
  });

  it('nadie acaba dentro de una pared, con la aldea entera suelta', () => {
    // Todo junto y a escala: ochenta personas eligiendo, andando y apartándose
    // durante una jornada completa.
    for (const seed of [7, 23]) {
      const life = createVillage(village(seed), 0);
      expect(life.dwellers.length, `semilla ${seed}: no hay aldea`).toBeGreaterThan(20);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const dweller of life.dwellers) {
          expect(blockedAt(life.land, dweller.body.x, dweller.body.z),
            `semilla ${seed}: alguien dentro de un muro en el paso ${n}`).toBe(false);
        }
      }
    }
  });

  it('la misma jornada da la misma aldea, cuerpo a cuerpo', () => {
    // §4.3 llevado hasta el final: si esto se cumple, la jornada se puede
    // reconstruir tras un letargo y nadie nota nada.
    const one = createVillage(village(7), 3);
    const two = createVillage(village(7), 3);
    for (let n = 0; n < 900; n += 1) { one.step(); two.step(); }
    one.dwellers.forEach((dweller, i) => {
      const other = two.dwellers[i];
      expect(other).toBeDefined();
      expect(dweller.body.x).toBe(other?.body.x);
      expect(dweller.body.z).toBe(other?.body.z);
      expect(dweller.doing?.offer.id ?? null).toBe(other?.doing?.offer.id ?? null);
    });
  });

  it('dos jornadas distintas no son la misma jornada', () => {
    // Lo contrario de lo anterior, y hace falta decirlo: un valle reproducible
    // que además fuera idéntico todos los días sería un bucle, no una vida.
    const monday = createVillage(village(7), 1);
    const tuesday = createVillage(village(7), 2);
    for (let n = 0; n < 900; n += 1) { monday.step(); tuesday.step(); }
    let same = 0;
    monday.dwellers.forEach((dweller, i) => {
      if (dweller.body.x === tuesday.dwellers[i]?.body.x) same += 1;
    });
    expect(same, `${same} de ${monday.dwellers.length} hacen exactamente lo mismo`)
      .toBeLessThan(monday.dwellers.length / 2);
  });

  it('una jornada entera de la aldea cuesta poco', () => {
    // El presupuesto de V-13, comprobado aquí porque aquí ya está todo junto:
    // reconstruir el día tras un letargo tiene que ser barato o la capa deja de
    // poder ser efímera.
    const life = createVillage(village(7), 0);
    const started = performance.now();
    for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step();
    const spent = performance.now() - started;
    expect(spent, `una jornada de ${life.dwellers.length} personas cuesta ${spent.toFixed(0)} ms`)
      .toBeLessThan(2500);
  });

  it('nadie se apiña, nadie se pasa del aforo y nadie se queda forcejeando', () => {
    // **Los tres síntomas que el dueño del diseño vio en pantalla**, cada uno
    // con su número, para que no vuelvan sin avisar. Lo que dijo fue: «se
    // quedan pillados, dando vueltas, no se chocan, tienen como un imán entre
    // ellos». Tenía razón en los tres, y los tres tenían causa:
    //
    // - El imán: el aforo se contaba una vez al empezar el paso, así que los
    //   veinte que decidían a la vez veían el mismo pozo libre.
    // - El apiñamiento: una oferta de cuatro plazas tenía un solo punto.
    // - El forcejeo: dos que se cruzan de frente se empujan en línea recta y
    //   ninguno gana.
    const life = createVillage(village(7), 0);
    const people = life.dwellers.length;

    let overCapacity = 0;
    let jammed = 0;
    let tightest = Infinity;
    const was = new Map<number, { x: number; z: number }>();

    for (let n = 0; n < STEPS_PER_DAY; n += 1) {
      life.step();
      for (let i = 0; i < people; i += 1) {
        for (let j = i + 1; j < people; j += 1) {
          const a = life.dwellers[i]?.body;
          const b = life.dwellers[j]?.body;
          if (a === undefined || b === undefined) continue;
          tightest = Math.min(tightest, Math.hypot(a.x - b.x, a.z - b.z));
        }
      }
      if (n % 30 !== 0) continue;

      const heading = new Map<string, number>();
      for (const dweller of life.dwellers) {
        if (dweller.doing === null) continue;
        const key = `${dweller.doing.place.id}/${dweller.doing.offer.id}`;
        const count = (heading.get(key) ?? 0) + 1;
        heading.set(key, count);
        if (count > dweller.doing.offer.seats) overCapacity += 1;
      }
      for (const dweller of life.dwellers) {
        const before = was.get(dweller.body.id);
        const speed = Math.hypot(dweller.body.vx, dweller.body.vz);
        if (before !== undefined && speed > 0.3
          && Math.hypot(dweller.body.x - before.x, dweller.body.z - before.z) < 0.15) jammed += 1;
        was.set(dweller.body.id, { x: dweller.body.x, z: dweller.body.z });
      }
    }

    expect(overCapacity, `${overCapacity} veces más gente de la que cabe en un sitio`).toBe(0);
    // Dos radios son 0,64. Medido tras los arreglos: 0,60, o sea que se rozan
    // sin llegar a meterse. Antes bajaba a 0,55.
    expect(tightest, `lo más cerca que llegan dos es ${tightest.toFixed(3)}`)
      .toBeGreaterThan(0.58);
    // Forcejeos: 369 de 9 600 comprobaciones tras ceder el paso por un lado,
    // contra 1 003 antes. Alguno es inevitable —una calle estrecha es estrecha—
    // pero no puede ser la tónica.
    expect(jammed, `${jammed} forcejeos de ${people * 120} comprobaciones`)
      .toBeLessThan(people * 120 * 0.08);
  });
});
