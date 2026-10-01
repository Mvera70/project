# RD-2 · Qué le pasa al valle mientras nadie lo mira (30 sep 2026)

Medida del motor para decidir el descanso (`plan-ritmo-descanso-y-progresion`
§5). Herramienta: `npx tsx tools/reports/rest-report.ts` (24 semillas, 1–24;
la partida se juega con `run(…, 'prudent')` hasta la salida y desde ahí avanza
con `tick` sin decisión, que es lo que hace el letargo de §13.2). La salida
entera está copiada en el anexo.

## El problema, medido

El letargo de hoy (`src/ui/lethargy.ts`) avanza todas las semanas debidas con
el tick normal. **No contesta ninguna encrucijada** (§13.2 se cumple), pero
**sí deja que un asalto se resuelva por la cuenta de B3 y que la partida
acabe** sin que nadie pudiera responder:

| Ausencia | Qué es en reloj | Valles acabados (de 24) | Asaltos resueltos sin jugador |
|---|---|---:|---:|
| 34 semanas | una noche de 8 h a ×1 | 0 | 0 |
| 548 semanas | 8 h con la pestaña oculta a ×16 | 1 (extinción) | 31 |
| 960 semanas (tope) | 9,5 días a ×1, 14 h a ×16, 3,5 h a ×64 | **4** (3 tomados, 1 extinción) | 66 |

Salida a los 12 min, 1 h y 8 h de partida dan lo mismo; a las 40 h, ningún
final pero 95 asaltos resueltos sin mirar. **Es la violación del invariante**
«ninguna derrota irreversible mientras la aldea descansa», y está en `main`.

La otra puerta del letargo (§13.2): la pestaña oculta recupera a la velocidad
que tenía y la apertura en frío a ×1, porque el guardado no lleva la
velocidad. La misma ausencia da hoy **dos resultados distintos** según la
puerta.

## Las tres reglas comparadas

| Regla | Qué para el avance | Una noche a ×1 (34 sem) | Ausencia larga (548–960 sem) | Finales sin jugador |
|---|---|---|---|---|
| **Hoy** (§13.2) | nada | avanza entera | avanza entera | 1–4 de 24 |
| **A** (parar ante cualquier atención) | encrucijada, aviso de asalto, crisis nueva, final | **7–26 semanas** de mediana: se para casi siempre | igual: 7–26 | 0 |
| **A′** (la decisión espera) | aviso de asalto y la semana que acabaría la partida (se deshace) | **avanza entera** en 24/24 | 261–431 semanas (5–8 años), se para en el aviso del asalto | 0 |

Lectura:

- **A** es segura pero apenas deja vivir a la aldea: a la fundación la
  hambruna proyectada (§8.6, «crisis») salta en 22 de 24 valles antes de la
  semana 7. Dormir una noche daría unas semanas de juego.
- **A′** deja vivir a la aldea de verdad y nunca acaba una partida en
  ausencia. Su precio: la primera encrucijada planteada se queda **esperando
  años** (hasta ~9 700 semanas-valle de decisión pendiente en 24 valles), y como
  sólo hay una a la vez (§8.6), durante ese tiempo no se plantea ninguna otra.
  §13.2 ya lo acepta («no se resuelve sola, no caduca y no mata»); el parte de
  regreso tiene que decirlo.
- La alternativa **B** del plan (un tick de descanso con pasos permitidos) no
  se ha medido: cambia el orden normativo de §4.2 y las dos medidas de arriba
  ya separan lo que importa. Queda descrita, sin prototipo.

## Lo que falta para decidir (es de Vera)

1. **Qué para**: A, A′ u otra combinación (p. ej. A′ más «una crisis de
   hambre para»).
2. **A qué velocidad corre la ausencia**: la del momento, guardada también
   para la apertura en frío (una sola regla por las dos puertas), o una fija.
3. **Si se activa a mano, sola al ocultar, o las dos.**
4. **Cómo se detiene sol y calendario**: si la ausencia para en un aviso de
   asalto, el reloj de la partida se queda en esa semana y al volver el sol
   está donde dice esa hora (se paran juntos, nunca por separado).

**Qué refutaría esta medida**: que un valle acabe o resuelva un asalto en
una ausencia con la regla A′ (el informe lo contaría en «acabadas» o «asaltos
resueltos»), o que la misma ausencia dé estados distintos por pestaña oculta y
por apertura nueva una vez implementada.

## Anexo · salida de `rest-report.ts` (24 semillas)

```
Descanso · 24 semillas · política prudente hasta la salida · semana = 14 min a ×1

salida 0.2 h · ausencia 34 sem · hoy · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 23 · muertes 8
salida 0.2 h · ausencia 34 sem · A   · avanza mediana 7 sem · para: crisis famine 22, encrucijada 2 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 2 · muertes 0
salida 0.2 h · ausencia 34 sem · A′  · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 23 · muertes 8
salida 0.2 h · ausencia 548 sem · hoy · avanza mediana 548 sem · para: tope 24 · acabadas 1 (extinction) · asaltos resueltos 31 · encrucijadas planteadas 24 · muertes 272
salida 0.2 h · ausencia 548 sem · A   · avanza mediana 7 sem · para: crisis famine 22, encrucijada 2 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 2 · muertes 0
salida 0.2 h · ausencia 548 sem · A′  · avanza mediana 431 sem · para: aviso de asalto 20, tope 3, la partida acabaría 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 176
salida 0.2 h · ausencia 960 sem · hoy · avanza mediana 960 sem · para: tope 24 · acabadas 4 (extinction, stormed, stormed, stormed) · asaltos resueltos 66 · encrucijadas planteadas 24 · muertes 595
salida 0.2 h · ausencia 960 sem · A   · avanza mediana 7 sem · para: crisis famine 22, encrucijada 2 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 2 · muertes 0
salida 0.2 h · ausencia 960 sem · A′  · avanza mediana 431 sem · para: aviso de asalto 23, la partida acabaría 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 184

salida 1 h · ausencia 34 sem · hoy · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 23 · muertes 8
salida 1 h · ausencia 34 sem · A   · avanza mediana 11 sem · para: encrucijada 12, crisis famine 12 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 12 · muertes 0
salida 1 h · ausencia 34 sem · A′  · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 23 · muertes 8
salida 1 h · ausencia 548 sem · hoy · avanza mediana 548 sem · para: tope 24 · acabadas 1 (extinction) · asaltos resueltos 31 · encrucijadas planteadas 24 · muertes 274
salida 1 h · ausencia 548 sem · A   · avanza mediana 11 sem · para: encrucijada 12, crisis famine 12 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 12 · muertes 0
salida 1 h · ausencia 548 sem · A′  · avanza mediana 428 sem · para: aviso de asalto 20, tope 3, la partida acabaría 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 176
salida 1 h · ausencia 960 sem · hoy · avanza mediana 960 sem · para: tope 24 · acabadas 4 (extinction, stormed, stormed, stormed) · asaltos resueltos 66 · encrucijadas planteadas 24 · muertes 595
salida 1 h · ausencia 960 sem · A   · avanza mediana 11 sem · para: encrucijada 12, crisis famine 12 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 12 · muertes 0
salida 1 h · ausencia 960 sem · A′  · avanza mediana 428 sem · para: aviso de asalto 23, la partida acabaría 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 184

salida 8 h · ausencia 34 sem · hoy · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 19 · muertes 11
salida 8 h · ausencia 34 sem · A   · avanza mediana 14 sem · para: crisis succession 1, encrucijada 14, tope 3, crisis famine 6 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 14 · muertes 4
salida 8 h · ausencia 34 sem · A′  · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 19 · muertes 11
salida 8 h · ausencia 548 sem · hoy · avanza mediana 548 sem · para: tope 24 · acabadas 0 · asaltos resueltos 32 · encrucijadas planteadas 24 · muertes 259
salida 8 h · ausencia 548 sem · A   · avanza mediana 14 sem · para: crisis succession 1, encrucijada 17, crisis famine 6 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 17 · muertes 4
salida 8 h · ausencia 548 sem · A′  · avanza mediana 398 sem · para: aviso de asalto 23, tope 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 160
salida 8 h · ausencia 960 sem · hoy · avanza mediana 960 sem · para: tope 24 · acabadas 3 (stormed, stormed, stormed) · asaltos resueltos 79 · encrucijadas planteadas 24 · muertes 574
salida 8 h · ausencia 960 sem · A   · avanza mediana 14 sem · para: crisis succession 1, encrucijada 17, crisis famine 6 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 17 · muertes 4
salida 8 h · ausencia 960 sem · A′  · avanza mediana 398 sem · para: aviso de asalto 23, tope 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 166

salida 40 h · ausencia 34 sem · hoy · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 16 · muertes 11
salida 40 h · ausencia 34 sem · A   · avanza mediana 26 sem · para: tope 8, encrucijada 14, crisis famine 2 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 14 · muertes 8
salida 40 h · ausencia 34 sem · A′  · avanza mediana 34 sem · para: tope 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 16 · muertes 11
salida 40 h · ausencia 548 sem · hoy · avanza mediana 548 sem · para: tope 24 · acabadas 0 · asaltos resueltos 48 · encrucijadas planteadas 24 · muertes 387
salida 40 h · ausencia 548 sem · A   · avanza mediana 26 sem · para: encrucijada 21, crisis famine 2, aviso de asalto 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 22 · muertes 21
salida 40 h · ausencia 548 sem · A′  · avanza mediana 261 sem · para: aviso de asalto 22, tope 2 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 148
salida 40 h · ausencia 960 sem · hoy · avanza mediana 960 sem · para: tope 24 · acabadas 0 · asaltos resueltos 95 · encrucijadas planteadas 24 · muertes 752
salida 40 h · ausencia 960 sem · A   · avanza mediana 26 sem · para: encrucijada 21, crisis famine 2, aviso de asalto 1 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 22 · muertes 21
salida 40 h · ausencia 960 sem · A′  · avanza mediana 261 sem · para: aviso de asalto 24 · acabadas 0 · asaltos resueltos 0 · encrucijadas planteadas 24 · muertes 159

```
