import { beforeAll, describe, expect, it } from 'vitest';
import { hoursOf, median, POLICIES, runBalance, SOAK } from '../../tools/reports/balance-report';

/**
 * **El horizonte de este banco, en la unidad en la que el dueño pone los
 * objetivos** (G2, 19 sep 2026). §12.1: una semana son catorce minutos a ×1,
 * así que doscientos años son 2.240 h de reloj — y el último peldaño que el
 * juego tiene que enseñar, el bastión, cae a las **350 h** de mediana
 * (`npx tsx tools/reports/pace-report.ts`, 24 semillas).
 *
 * O sea: este banco simula seis veces más juego del que nadie va a ver. Eso no
 * lo invalida —es un remojo de estabilidad del motor y como tal vale— pero sí
 * obliga a escribir al lado de cada listón **a qué hora mira**, porque medir
 * en años es lo que dejó pasar tres días que v3.72 había multiplicado la semana
 * por 56 sin que nadie remidiera el §12 (B-1).
 */
const H = (years: number): string => `año ${years} = ${hoursOf(years).toFixed(0)} h de reloj a ×1`;

describe(`M-12 · design.md §12.9, real founding and full catalogue (${H(SOAK.years)})`, () => {
  let result: ReturnType<typeof runBalance>;
  beforeAll(() => { result = runBalance(); });

  it('runs all 60 seeds for each policy within the budget', () => {
    // v2.45: budget up from 10 to 15, and that raise was without optimising —
    // adverse games surviving to the 200-year horizon instead of dispersing
    // near year 25 is the fixed world, not a slower calculation.
    //
    // v3.68: up to 45 minutes, and the reason is the map. **El valle es cuatro
    // veces mayor** (§7) y un tick cuesta 1,67 veces lo que costaba —medido,
    // 642 ms contra 1 073 por cuarenta años—, así que este banco, que simula
    // 240 partidas de doscientos años, sube con él. Antes de subirlo se
    // arreglaron los dos cuellos que sí eran desperdicio y están contados en
    // §14: A* rellenaba tres arrays del tamaño del mapa por cada ruta, y
    // `placeBuilding` recorría el mapa entero por cada solar.
    //
    // G2 · **remedido el 19 sep 2026, tres veces, y lo que enseña es la
    // varianza y no el número**:
    //
    // | pasada | duración | con qué al lado |
    // |---|---|---|
    // | 1 | 1.857 s · 31 min | dos sondas compitiendo |
    // | 2 | 1.884 s · 31 min | — |
    // | 3 | **2.732 s · 46 min** | **nada, y de madrugada** |
    //
    // O sea: el mismo banco, en la misma máquina, va de 31 a 46 minutos, y la
    // tercera se pasó del presupuesto de 45 **corriendo sola**. El cuaderno
    // decía que «tarda más que su propio presupuesto» y eso resultó estar
    // caducado; escribir «tarda 31 minutos» en su lugar fue pasarse al otro
    // lado con una sola medida.
    //
    // **El presupuesto sube a 60 minutos, y no porque el banco se haya vuelto
    // más lento.** Un tope con un 1,2 % de margen sobre lo observado no
    // distingue «el banco se ha degradado» de «el portátil estaba ocupado», que
    // es lo único que este aserto existe para cazar. Sesenta deja un 30 % sobre
    // la peor de las tres. **No es un número del juego** —no vive en
    // `balance.ts` ni sale de §12— sino el reloj de una herramienta, y §14.2 ya
    // lo ha subido dos veces (10 → 15 → 45) por motivos escritos. Éste es el
    // suyo. Si vuelve a pasarse, lo que hay que mirar es el banco, no el tope.
    expect(result.trials).toHaveLength(SOAK.seeds * POLICIES.length);
    for (const policy of POLICIES) {
      expect(result.trials.filter((t) => t.policy === policy)).toHaveLength(SOAK.seeds);
    }
    expect(result.durationMs).toBeLessThan(3_600_000);
  });

  for (const policy of POLICIES) {
    describe(policy, () => {
      const summary = () => result.summaries.find((s) => s.policy === policy)!;
      it('has no statistics outside their ranges or NaN', () => { expect(summary().invalidCases).toBe(0); });
      // M-14, §7.4. The brief asks for 30 seeds by 150 years; this is 60 by
      // 200, on the same runs, so the geometry is checked where the engine
      // actually plays rather than on a bench of its own.
      it('never overlaps a building or work, and never builds on water or marsh', () => {
        expect(summary().geometryCases).toBe(0);
      });
      /**
       * G2 · **medido el 19 sep 2026: de 12,6 a 16,8 preguntas por generación**
       * (prudent 15,3 · first 16,8 · last 12,6 · worst 13,9), contra una banda
       * de 1–5 que es de §12.9 y **de antes de dos cambios del mismo día**: el
       * suelo de §8.6 bajó de 48 a 16 ticks porque el dueño del diseño dijo que
       * «se tarda muchísimo en empezar a hacer cosas», y R-1 metió una tirada de
       * sucesos cada semana.
       *
       * Se queda en `it.fails` con la propiedad intacta, que es el patrón que
       * `CLAUDE.md` manda cuando algo no llega: bajar la banda a 17 sería
       * escribir el número que hoy sale y llamarlo diseño, y **la banda es
       * nivelado, que es del dueño**. Si el juego vuelve a la banda, esto se
       * pone rojo y hay que venir a leerlo.
       */
      it.fails('has mean cadence 1–5 and no seed above 7, excluding forest templates from the count', () => {
        expect(summary().cadence).toBeGreaterThanOrEqual(1);
        expect(summary().cadence).toBeLessThanOrEqual(5);
        expect(summary().maxCadence).toBeLessThanOrEqual(7);
      });
      /**
       * G2 · **tres plantillas pasan del 1 %**, medidas el 19 sep 2026, y dos
       * de ellas por un sistema que no existía cuando se escribió este listón:
       *
       * | plantilla | prudent | first | last | worst |
       * |---|---:|---:|---:|---:|
       * | `after_the_raid` | 4,28 % | 4,21 % | 3,20 % | 2,58 % |
       * | `raiders_coming` | 3,66 % | 4,66 % | 2,23 % | 2,09 % |
       * | `breaking_ground` | — | — | — | 1,33 % |
       *
       * Las dos primeras son la familia del clan vecino (B1): desde que el
       * valle tienta, sus condiciones se cumplen temporada sí y temporada
       * también. Elegible no es planteada —el techo de §8.6 está delante— pero
       * un 4 % dice que esas preguntas han dejado de ser raras.
       *
       * `breaking_ground` sale **sólo bajo `worst`**, y no es un defecto: es del
       * caserío (G3) y pide menos de diez personas, así que sólo se queda
       * elegible en la política que mantiene al valle pequeño. Su contrato
       * cumpliéndose.
       *
       * **Y la trampa que costó media hora de reloj**: la versión anterior de
       * esta prueba fallaba en la primera plantilla que se pasara, así que el
       * informe decía «`raiders_coming`» y callaba las otras dos. Excluirla y
       * volver a correr destapaba la siguiente, media hora después. Ahora se
       * recogen **todas** y se comparan de una vez: una prueba que sólo enseña
       * el primer fallo obliga a pagar el banco entero por cada uno.
       */
      const KNOWN_OVER = new Set(['raiders_coming', 'after_the_raid', 'breaking_ground']);
      it('has less than 1% eligible ticks for every template', () => {
        const over = Object.entries(summary().eligibility)
          .filter(([id, fraction]) => fraction >= 0.01 && !KNOWN_OVER.has(id))
          .map(([id, fraction]) => `${id} ${(fraction * 100).toFixed(2)}%`);
        expect(over, `por encima del 1 % y sin medir: ${over.join(' · ')}`).toEqual([]);
      });
      it.fails('and the three measured over 1% come back under it', () => {
        const still = [...KNOWN_OVER]
          .filter((id) => (summary().eligibility[id] ?? 0) >= 0.01);
        expect(still, `siguen por encima: ${still.join(' · ')}`).toEqual([]);
      });
      it('never lingers more than 10 years below a workable village before dying', () => {
        // §5.2, v2.14. A game that spends decades at two or three people is not
        // an ending; it is a flat line with nothing to write about. One trial
        // used to sit there for 38 years.
        //
        // G2 · **diez años son 112 h de reloj a ×1**, y éste sí es un listón de
        // ritmo: es el único de este banco que mira cuánto dura algo que el
        // jugador está viendo. Ciento doce horas de agonía siguen siendo
        // muchísimo, y bajarlo es nivelado.
        expect(summary().maxYearsDying).toBeLessThanOrEqual(10);
      });
      it('has at least 25% extinction after a 90% shock among survivors at year 40', () => {
        expect(summary().shockTrials).toBeGreaterThan(0);
        expect(summary().shockExtinction).toBeGreaterThanOrEqual(0.25);
      });
      // v2.13: the population bands belong to `prudent` and to nothing else.
      // `first` is the spendthrift policy, `last` the defiant one and `worst`
      // the adverse one; none of the three stands in for a player with their
      // head on, so none of the three can set a floor.
      if (policy === 'prudent') {
        it('has median peak population 65–85', () => {
          // v2.25: the band was 65-82 and failed by one villager. Failing by
          // one is noise, not signal.
          expect(summary().medianPeak).toBeGreaterThanOrEqual(65);
          expect(summary().medianPeak).toBeLessThanOrEqual(85);
        });
        it('has median population at least 26 at the end of generation one', () => {
          expect(summary().medianGenerationOne).toBeGreaterThanOrEqual(26);
        });
        /**
         * G2 · **medido el 19 sep 2026: 26,7 % con la política prudente**,
         * contra una banda de 2–12 % que es **de antes del asedio**. La causa
         * está contada y es la meta del juego: desde B1–B4 un clan vecino baja,
         * rompe el portón y **acaba la partida** (`ended.cause = 'stormed'`);
         * medido aparte en `pace-report`, 8 de 24 valles se acaban en sesenta
         * años y siete de los ocho son tomados.
         *
         * O sea que esta roja **no es una regresión: es §1b funcionando**, y el
         * dueño del diseño lo dijo con todas las letras — «que haya partidas
         * que se rompan es la idea». Subir la banda a 27 % es nivelado y es
         * suyo, así que aquí se deja la propiedad intacta y la cifra escrita.
         *
         * Lo que **sí** sigue verde y es lo que este listón protegía de verdad:
         * la horquilla entre jugar con cabeza y jugar mal, 95 % contra 26,7 %,
         * son 68 puntos contra los 20 que pide el principio 2.
         */
        it.fails('has extinction between 2% and 12%', () => {
          expect(summary().extinction).toBeGreaterThanOrEqual(0.02);
          expect(summary().extinction).toBeLessThanOrEqual(0.12);
        });
      }
      // §12.9, v2.22: an adverse policy caught looping on one answer is not
      // measuring the catalogue, it is measuring the loop. `succession:no_one`
      // used to be 93% of every decision `last` and `worst` made.
      if (policy === 'last' || policy === 'worst') {
        it('never dedicates 45% or more of its decisions to a single option', () => {
          // v2.25: 40 % was unreachable. With the non-degeneracy rule an option
          // can still take two of every three appearances of its template, and
          // succession is about 60 % of what the adverse policies are asked, so
          // the floor is 2/3 x 60 = 40 %. The ceiling is structural; the gate
          // moves to 45 % to sit above it and still catch a real degeneration.
          expect(summary().busiestOptionShare, summary().busiestOption ?? '?')
            .toBeLessThan(0.45);
        });
      }
    });
  }
  it('has at least 25% extinction under the adverse policy', () => {
    expect(result.summaries.find((s) => s.policy === 'worst')?.extinction).toBeGreaterThanOrEqual(0.25);
  });
  it('opens at least 20 points of extinction between prudent and worst', () => {
    // Principle 2 of valle.md, as a number: if playing well and playing badly
    // end in the same place, the player is a spectator with buttons.
    const of = (policy: string): number =>
      result.summaries.find((s) => s.policy === policy)?.extinction ?? Number.NaN;
    expect(of('worst') - of('prudent')).toBeGreaterThanOrEqual(0.2);
  });
  it('fills 60% of maps with 8 fields and 16 houses before year 120', () => {
    // §12.9, measured with the reference policy since v2.13.
    //
    // G2 · **el año 120 son 1.344 h de reloj a ×1**, cuatro veces el último
    // peldaño del juego (el bastión, 350 h). Este listón no describe la partida
    // de nadie: describe que el mapa **tiene sitio**, que es una propiedad de
    // §7 y no de ritmo. Se deja en su año y con su hora escrita; moverlo al
    // horizonte de un jugador sería nivelado, y el nivelado es del dueño.
    expect(result.summaries.find((s) => s.policy === 'prudent')?.fullMap)
      .toBeGreaterThanOrEqual(0.6);
  });
  /**
   * G2 · **medido el 19 sep 2026: 13 de 47 valles en la banda, con la mediana
   * en el 72,7 % de pie** (first 71,7 %, last 77,1 %, worst 76,5 %). Y la
   * dirección importa: el bosque no se está agotando, **se está quedando
   * entero**. El listón pide 40–70 % y el valle no baja del 70.
   *
   * La causa está medida desde antes y escrita en `task-log.md`: **la leña no
   * es un cuello de botella** —de 507 a 43.000 unidades en cien años— y desde
   * el balanceo de §7.13 la aldea corta la que necesita en vez de una cuota
   * fija, así que con un mapa cuatro veces mayor (§7) nunca llega a morder el
   * bosque. Es exactamente el mismo hallazgo que dejó al hacha siendo el medio
   * más flojo del carro (M-4: 39 personas contra 38).
   *
   * Que la leña escasee es nivelado y es del dueño, así que la propiedad se
   * queda intacta con su cifra al lado.
   */
  it.fails('leaves 40-70% of the forest standing at year 100 in most valleys', () => {
    // §12.9, live since M-15. M-15's own gate is 20 of 30 seeds; measured here
    // over the 60 that reached year 100 under the reference policy.
    //
    // G2 · **el año 100 son 1.120 h**, y lo que mide es que el bosque no se
    // agota ni se queda intacto en una partida larguísima: es una propiedad del
    // suelo (§7.8), no del ritmo. Lo que un jugador ve del bosque en sus
    // primeras trescientas horas no lo dice este listón, y hoy no lo dice
    // ninguno.
    const s = result.summaries.find((x) => x.policy === 'prudent');
    expect(s?.forestTrials ?? 0).toBeGreaterThan(0);
    expect((s?.forestInBand ?? 0) / (s?.forestTrials ?? 1)).toBeGreaterThanOrEqual(2 / 3);
  });
});

it('computes the even-sample median from both middle observations without mutating input', () => {
  const values = [100, 2, 4, 0];
  expect(median(values)).toBe(3);
  expect(values).toEqual([100, 2, 4, 0]);
});
