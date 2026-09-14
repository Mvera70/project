# `src/derive/` — lo que el estado dice, antes de que nadie lo pinte

Funciones puras del `GameState`: **dónde** está el rebaño, **qué** señales tiene
el valle esta semana, **de qué color** es la hierba en la semana 34, **quién** se
cruza con quién, **dónde** se junta la aldea si una decisión la convocó.

Ni una línea de aquí dibuja. No hay `canvas`, ni `three`, ni DOM.

## Por qué existe

Todo esto se escribió para el Canvas 2D (M-16 a M-29) y por eso vivía en
`src/render/`. Cuando el 3D pasó a ser el juego (G-12), el renderer nuevo
resultó estar importando siete módulos del viejo: la paleta de las estaciones,
los animales, los ánimos, las señales, los encuentros, las reuniones. Es decir,
**el render que se juega dependía del render que ya no se juega** para saber qué
hay que contar.

Eso convertía «borrar `src/render/`» en imposible sin antes decidir qué parte de
él era dibujo y qué parte era lectura del estado. Esta carpeta es esa decisión,
tomada: lo que lee el estado vive aquí y lo leen los dos renders; lo que pone
tinta se queda en `src/render/` (Canvas) y en `src/render3d/` (WebGL).

## Las reglas

1. **No se importa nada que dibuje.** Ni `src/render/`, ni `src/render3d/`, ni
   `src/ui/`, ni `three`. Hay una prueba en `module-graph.test.ts`.
2. **El motor tampoco importa de aquí.** La flecha va en un solo sentido, igual
   que con `render` y `ui`, y ESLint lo verifica (§2.4).
3. **No se escribe en el estado.** Se lee y se devuelve algo nuevo.
4. **Nada de reloj de pared ni de azar.** Si dos renders derivan lo mismo del
   mismo estado, tienen que obtener lo mismo.

## Qué hay

| Fichero | Qué deriva | Quién lo lee |
|---|---|---|
| `anchors.ts` | El centro de la aldea y qué sigue en pie | `animals`, `marks`, `gatherings` |
| `animals.ts` | Dónde está el ganado, la fauna y los cuervos (§7.7) | 2D, y `render3d/effects/fauna.ts` |
| `encounters.ts` | Quién se para con quién, y quién esquiva a quién (§11.9) | 2D, y V-11 |
| `gatherings.ts` | Dónde y cuándo se junta la aldea (§11.8) | 2D, y V-11 |
| `marks.ts` | Estandartes izados y luces apagadas por decisión | `tells` |
| `moods.ts` | Qué lleva encima quien está pasando algo (§11.1.1) | 2D, y `render3d/effects/bubbles.ts` |
| `palette.ts` | El color del valle en cada semana del año (§10.3) | 2D, y el suelo y el bosque en 3D |
| `tells.ts` | Humo, luz, velas, grano y peste sobre lo construido | 2D, y `render3d/effects/tells.ts` |

`src/render/crowd.ts` **no** está aquí a propósito: deriva posiciones con la
geometría de la cuadrícula 2D de 36 × 56 y sólo sirve para el Canvas y para su
selección por proporción. Se irá con él.
