# Los animales rehechos (v5.100, 2 oct 2026)

Vera: «los modelos de Astra de los animales no me gustan, los corregirás tú con
el estilo que has ido usando con los últimos». Rehechos con el camino de los
animales del valle (`deliverables/marked-models-trial/build-models.py` +
`tools/art/rigid-clips.mjs` + `tools/art/adopt-models.mjs`) los seis candidatos
de Astra de hoy: `stork`, `stork-nest`, `chick`, `crane`, `butterfly`
(`art/astra-b6-fauna-polish`) y `horse` (`art/astra-b7-village`).

## Qué fallaba en cada uno, comparado con los nuestros

| Animal | Lo de Astra | Lo nuevo |
|---|---|---|
| Cigüeña | Huevo de caras planas, el ala negra pegada como una placa, el cuello en pieza aparte sin esqueleto, sin patas que anden | Cuerpo en `ell`, cuello en `tube`, ala plegada en rombo como la de la gallina; nodos de la gallina y clips `walk`/`idle` |
| Nido | Palangana de pared recta y fondo plano con astillas en el borde: se lee cesto | Rodete facetado de ramas con las puntas saliendo por el borde y el hueco hundido |
| Polluelo | Campana amarilla sin cabeza distinta, sin nodos | Bola con la cabeza encima, pico y patas naranjas, nodos y clips de la gallina |
| Grulla | Alas de papel con dientes de sierra, cuerpo de huso: una cometa gris | Cuerpo en `loft`, cuello negro, alas grises con el borde de las remeras negro, en el hombro como la golondrina |
| Mariposa | Pajaritas con los colores horneados, que el juego no puede teñir | Alas blancas de punta negra, que el juego tiñe por instancia |
| Caballo | Patas en salchichas con huecos, tronco de caja, cascos de cubo (el estilo de G-23) | La mula de Vera más grande y pesada: crin y cola negras, lucero, calzas con pelo, collera; esqueleto de la mula y el casco plantado del ciervo |

## Presupuestos (encargo de la tanda larga, bloques 6 y 7)

| | Astra | Nuevo | Tope |
|---|---|---|---|
| `stork` | 230 | 238 | 250 |
| `stork-nest` | 180 | 188 | 200 |
| `chick` | 78 | 80 | 80 |
| `crane` | 148 | 142 | 150 |
| `butterfly` | 16 | 15 | 16 |
| `horse` | 748 | 888 | 900 |

## Coste en el juego (`gl-probe.mjs`, antes y después seguidos, la máquina sola)

| Escena | Antes: llamadas · triángulos · programas | Después |
|---|---|---|
| Aldea 11/21, primavera | 384 · 745 840 · 47 | 386 · 745 696 · 48 |
| Aldea 11/21, verano | 391 · 745 423 · 51 | 393 · 745 400 · 52 |
| Aldea 11/21, otoño | 379 · 746 727 · 47 | 368 · 745 557 · 48 |
| Villa 7/60, verano | 491 · 762 832 · 60 | 493 · 762 807 · 62 |

Las dos llamadas de más son las patas de la cigüeña (cuatro mallas instanciadas
en vez de dos, sólo con cigüeñas a la vista); el programa de más, el Lambert con
color de vértice de la grulla y la mariposa. SwiftShader: no son fotogramas de
un teléfono, y falta la medida en el aparato.

## Evidencia

- `artifacts/graphics/animales-rehechos/antes-despues.png`: los seis, A = Astra,
  B = nuevo, a la cámara de reposo del juego y junto a sus vecinos.
- `artifacts/graphics/animales-rehechos/<id>/hoja.png`: cada uno, de reposo, de
  perfil, con sus vecinos (la cigüeña con la vaca, el polluelo con la gallina,
  el caballo con la mula, la grulla con la golondrina, el nido con la cigüeña
  dentro) y a escala de móvil (32 px por celda), ampliado ×4 y a 1:1.
- `artifacts/graphics/animales-rehechos/juego-summer-ciguena-antes-despues.png`:
  en el juego, semilla 11, año 8, verano a mediodía (`seasons.mjs`, que desde
  esta ronda encuadra sola la primera cigüeña con `seasonal.storkLead`).

## Lo que no se pudo ver

- **La uve de grullas en el juego**: en el dibujo por software su reloj real
  avanza a una décima (igual que en v5.85).
- **El polluelo en el juego**: la aldea 11 del año 8 no tiene gallinas.
- **La cigüeña en el juego queda tapada a medias** por la hierba alta y la copa
  de al lado, antes y después: es del sitio que elige `storkSpots`
  (`derive/seasonal-fauna.ts`), no del modelo, y queda abierto.
