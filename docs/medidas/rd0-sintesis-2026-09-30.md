# RD-0 · Síntesis: la apertura visible y el catálogo, medidos (30 sep 2026)

Cierre de RD-0 del rework de ritmo
(`docs/plan-ritmo-descanso-y-progresion-2026-09-29.md`). Junta cuatro medidas
hechas el 30 sep sobre `main` `debf7f8` (posterior a la PR #17). Las cifras del
29 sep del plan quedan como historia.

| Informe | Qué mide | Muestra |
|---|---|---|
| [`rd0-motor-2026-09-30.md`](rd0-motor-2026-09-30.md) | Lo que **el motor ofrece**: escalera en horas, elegibilidad, variedad y repetición en 10 min, 1 h y 8–10 h a ×1/×4/×16/×64 | 24 semillas (escalera), 8 × 60 años (catálogo), 8 × 53 años (ventanas) |
| [`rd0-apertura-visible-2026-09-30.md`](rd0-apertura-visible-2026-09-30.md) | Lo que **se ve y se puede tocar**: caza, tablón, crónica, audio, sol y rendimiento en 390×844 y 320×568 | 3 semillas × 3 velocidades, Chromium por software |
| [`rd0-encrucijadas-2026-09-30.md`](rd0-encrucijadas-2026-09-30.md) | Las **21 encrucijadas** una por una, con dictamen, y las 3 retiradas | 10 semillas × 60 años, más código |
| [`rd2-descanso-2026-09-30.md`](rd2-descanso-2026-09-30.md) | Qué pasa **mientras nadie mira** (letargo, reglas A y A′) | 24 semillas |

**Límite común:** nada de esto se ha medido en un móvil real. El contenedor
pinta a 0,5–2,4 fps con WebGL por software: los ticks y las ventanas de oferta
son reales, las latencias de toque y la duración de las escenas no.

## 1. La tabla de §3, marcada

«Motor» = lo ofreció; «Visto» = se ve y se puede tocar con la cámara de
apertura; «Comprendido» = el jugador puede decir qué hizo y qué cambió. Sin
lectura humana, «comprendido» se juzga por lo que la pantalla enseña.

| Tramo | ×1 | ×16 | ×64 | Veredicto |
|---|---|---|---|---|
| **0–10 min** | Motor: 0 semanas; sólo la oferta de caza del tick 0 (17/24 valles). Visto: **la perdiz tapada por el bosque en 2 de 3 valles** (D1). | Motor: 11 semanas, 1,6 sucesos, 1,1 llegadas, **0 elecciones** (la 1.ª a los 13 min). Visto: caza completable en 1 de 3 valles. | Motor: 45 semanas, 1,6 elecciones a los 3,3 min. Visto: la oferta dura 13 s y la del tick 0 se perdió en 3/3 (D2). | **No se cumple a ninguna velocidad.** Hueco: una intervención visible y una elección antes del minuto 10. |
| **10–60 min** | Motor: 4 semanas, sólo perdiz. | Motor: 2 elecciones, caza + tablón (mandable 37 de 68 semanas). Visto: el tablón se sale de cuadro (D7). | Motor: 64 sucesos de 16 tipos (25 %). | Contenido de motor a ×16; **la consecuencia de una elección anterior no vuelve dentro del tramo**. |
| **1–3 h** | Motor: escaso (10 personas a las 10 h). | Motor: 10 personas a los 38 min, pozo 1,4 h, granero 1,9 h. | Todo antes de 40 min. | Sin medios ni cadenas medidos: la política no da medios. **Hueco**. |
| **3–6 h** | No llega (piedra 54 h). | **Sí**: piedra 3,4 h (2,4–7,6), primer asalto 6,4 h (3,6–13). | Ya pasó (piedra 51 min). | Sólo ×16 lo pone en su sitio. Lectura real en pantalla: sin medir. |
| **6–10 h** | No llega. | Años 11–14: 39 sucesos de 14,5 tipos (37 %); 8 de 13 elecciones son del asalto. | Años 46–53: 96 sucesos de 16,6 tipos (17 %). | **Volumen sin variedad**; el asalto domina las preguntas. |
| **Después** | — | — | — | El letargo **acaba 4 de 24 valles** en el tope y resuelve 66 asaltos sin jugador (arreglado en la PR #21). El regreso no distingue pendientes. |

## 2. Qué se ha corregido ya (PR por separado)

| PR | Qué | Evidencia |
|---|---|---|
| #19 · v5.38 | El sol sigue la hora a ×16 y ×64 (fuera `LIGHT_STEADY`) | captura antes/después; 240 fases × 5 velocidades |
| #20 · v5.39 | Una encrucijada retirada pendiente se enseña, se resuelve y deja preguntar | 3 semillas; prerrequisito de RD-3 |
| #21 · v5.40 | Ninguna derrota ni asalto resuelto en ausencia (`restTick`) | 24 semillas; las dos puertas del letargo |
| (D1) | La perdiz y el conejo nacen en campo abierto, no pegados a la linde | 1 de 24 → ≥ 22 de 24 en el motor; navegador en curso |

## 3. Defectos abiertos, por dueño

| # | Qué | Dueño | Estado |
|---|---|---|---|
| D2 | La oferta de caza dura una semana: 13 s a ×64; el tick 0 se pierde con el vuelo de entrada | jugabilidad | depende de la velocidad normal |
| D3 | Un hueco > 1 s entre fotogramas aborta la caza en curso (riesgo, no reproducido limpio) | vida / física | medir en aparato |
| D4 | Cobrar una pieza fuerza el tick: a ×1 salta una semana (7 días de sol y calendario, juntos) | jugabilidad | RD-1: el parte puede esperar a su semana |
| D5 | La consecuencia de la caza sólo se lee en la crónica | jugabilidad | RD-1 |
| D7 | El tablón se sale del encuadre de apertura en la semilla 7 | interfaz / cámara | RD-1 |
| C-1 | `chapel_or_granary` se plantea con iglesia en pie 10/10; `feud_inherited` enseña `{B}` literal; `granary_theft` no toca el grano | motor | RD-3 |
| C-2 | `first_stone` llega en el año 41, con muralla de piedra ya en pie 9/10 | motor | RD-3 |
| C-3 | 7 de 59 opciones declaran en `visible` algo que no pasa | motor | RD-3 |

## 4. Lo que RD-1 tiene para diseñar

- **Primera intervención:** la caza de la perdiz de la fundación (tick 0 en
  17/24 valles), una vez visible (D1) y con su consecuencia a la vista (D4, D5).
  Es la única ocasión del mapa que el motor da antes de la semana 4.
- **Primera elección:** hoy es `one_at_the_ford` en la semana 15 en todas las
  semillas (auditoría: conservar, con cuerpo para el que llega y texto de
  caserío). `breaking_ground` es la mejor alineada con la fundación pero cae en
  el año 1–2. Ninguna de las dos cabe antes del minuto 10 salvo a ×64: hace
  falta **una elección de fundación con elegibilidad propia**, no adelantar una
  crisis de aldea madura (`winter_grain_debt` ya cae a los 9 min a ×64 en 4/10
  con +900 de grano, que es el caso que el plan prohíbe).

## 5. Decisiones que son del dueño

1. **La velocidad normal.** Recomendación: ×16, con las escenas bajando a ×1
   como ya hace la caza. Es la única que pone piedra y primer asalto en
   3–6 h. Opciones y efectos en el mensaje de la sesión y en el cuaderno.
2. **El descanso.** Recomendación: A′ (la decisión espera; paran el aviso de
   asalto y la semana que acabaría la partida), automático al ocultar o cerrar,
   a la velocidad a la que se dejó, guardada para las dos puertas.
3. **La primera elección de la fundación** (contenido narrativo).

## 6. Qué refutaría esta síntesis

Una medida en un móvil real en la que la perdiz de las semillas 1 y 7 se
pueda tocar con la cámara de apertura en el `main` de hoy (entonces D1 sería
del contenedor); una partida a ×16 en la que la primera elección llegue antes
del minuto 10 sin cambiar el catálogo; o 16 semillas en las que la variedad de
sucesos a ×16 en 8–10 h pase de 37 % a más del 60 %.
