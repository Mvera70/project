# E3 · Dar a la escalera un bastión real donde aparecer

## Hallazgo y objetivo

G-27 pasó pruebas sintéticas y publicó la escalera, pero la comprobación
histórica del 22 sep 2026 encontró **0 variantes en 9 semillas** al abrir el
año 60. En la semilla 7 hay 79 muros vivos y 12 solares con huella de acceso
válida, pero los dos bastiones consumieron su cupo en muros sin ella. Las
coordenadas `(15,57)` atribuidas antes a la semilla 3 no pertenecen a la
partida que abre el menú; no son evidencia de aceptación. El objetivo es que
la aldea prefiera tramos accesibles al mejorar el muro, sin inventar una
escalera que atraviese árbol, agua, edificio o otra defensa.

## Depende de

- `docs/encargos/encargo-e3-escalera-visual.md` y G-27;
  `docs/design.md` §1–4, §7.4 y §12 (cupo y orden de mejoras).
- `src/engine/world/upgrade.ts`, `src/derive/bastion-access.ts`,
  `src/render3d/world/plan.ts`, `src/render3d/life/terrain.ts`.
- La medida de disponibilidad **en el instante de la primera mejora**, no
  sólo el año 60 después de consumir el cupo, se comprueba antes de programar.

## Ficheros y reparto

Sol arbitra el contrato y revisa las medidas. Terra programa. El helper puro
de huella pasa a `src/engine/world/bastion-access.ts` para que la selección de
obra pueda leerlo sin importar `derive/` hacia el motor; `derive/bastion-access.ts`
mantiene una API pública de presentación compatible, como adaptador si hace
falta. `src/engine/world/upgrade.ts` sólo cambia la prioridad de fuentes para
`bastion`. Pruebas focales en `tests/fast/` y una historia real en
`tests/journeys/` si su coste no cabe en la suite rápida. No tocar generación
del mapa, radio del anillo, límite de dos bastiones, balance, guardados,
físicas, guarnición, navegación elevada ni otros tipos de mejora.

## Contrato

1. Entre muros que `upgradeSpot` acepta en ese tick, preferir los que cumplen
   la **misma huella** que la variante visual. No copiar predicados en dos
   capas; misma función pura y misma definición de bosque, ruinas, obras,
   terreno y aproximación. No consumir RNG ni añadir estado serializado.
2. Si ningún muro permite acceso, conservar el resultado anterior: bastión
   G-26 sin escalera. La obra no se bloquea por una preferencia cosmética.
3. Con un bastión ya levantado, preferir el candidato accesible más separado
   de él; empates estables por id. Sin bastión previo, empate estable por id.
   Mantener la prioridad normativa entre clases de mejora: casas, muros,
   iglesia y sólo después bastión.
4. Resolver aún al pintar: si durante la obra una ruina, árbol, construcción
   u otro volumen invalida la huella, el bastión se muestra G-26. No reservar
   una celda en el motor en esta ronda ni abrirla a peatones.

## Pruebas y falsación

- Escenario sintético con dos muros: el primero por id sin acceso y el segundo
  accesible. La mejora elige el segundo; un escenario sin ninguno conserva el
  primero. Dos accesibles con bastión previo se separan de forma estable.
- La función de huella da la misma respuesta para obra prospectiva y bastión
  construido; capa del motor no importa `derive/` ni render, y `GameState` no
  cambia. Tests de arquitectura, `typecheck`, `lint` y focales.
- Rejugar al menos dos historias prudentes por el menú real hasta tener el
  cupo, anotar coordenadas, disponibilidad, render plan y efecto sobre cierre
  del anillo/puertas/tiempo de obra. Una historia con acceso real se captura
  en móvil y tableta con `--look`, sin `preview-era`, mostrando peldaños y
  unión con muro. Si el acceso no se lee o el cupo sigue gastándose siempre en
  G-26, este encargo no ha terminado.
- En el cierre de tanda: suite rápida, jornadas y recorridos relevantes de
  interfaz. No aflojar listones de balance por desplazar dos bastiones.

## Terminado cuando

Existe una escalera en una partida histórica real, colocada sobre un muro
mejorado por el juego; se ve sin solapamiento y se mantiene el cierre del
anillo. El respaldo G-26 y la colisión conservan su contrato. Subir guardias
y el adarve continuo siguen explícitamente fuera por decisión previa de Vera.
