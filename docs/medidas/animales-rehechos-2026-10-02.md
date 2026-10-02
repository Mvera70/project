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
| Nido | Palangana de pared recta y fondo plano con astillas en el borde: se lee cesto | Plataforma ancha de ramas pardas con el rodete encima y las puntas saliendo por el borde; la cigüeña, de pie sobre ella |
| Polluelo | Campana amarilla sin cabeza distinta, sin nodos | La cabeza nace del pecho, pico, dos ojos, dos patas con el pie adelante y alitas; nodos y clips de la gallina |
| Grulla | Alas de papel con dientes de sierra, cuerpo de huso: una cometa gris | Cuerpo en `loft`, cuello negro, alas grises con el borde de las remeras negro, en el hombro como la golondrina |
| Mariposa | Pajaritas con los colores horneados, sin forma de mariposa | Los colores de la de Astra (ocre, terracota, cuerpo oscuro) en dos pares de alas redondeadas, cuerpo fino y antenas; en el juego, un matiz por instancia |
| Caballo | Patas en salchichas con huecos, tronco de caja, cascos de cubo (el estilo de G-23) | La mula de Vera hecha caballo de tiro con su receta, a ×1,3: crin en la cresta, cola llena, lucero, calzas; esqueleto de la mula y el casco plantado del ciervo |

## La segunda vuelta

Vera vio la primera hoja y no la aceptó («mira el pollo»). Se rehicieron el
polluelo (dos bolas apiladas, sin ojos, una pata a la vista), la mariposa
(blanca y plana), el nido (gris de ceniza, la cigüeña hundida) y la escala del
caballo (apenas pasaba a la mula, y «la mula es mucho mejor»: ahora es la mula hecha caballo, a ×1,3). En la tercera, la mariposa con los colores de A y alas redondeadas, y el polluelo con las dos patas a la vista. La regla
que queda: **ninguna hoja se enseña sin mirarla antes a la escala del juego,
junto al vecino, preguntando si se reconoce sin el rótulo.**

**Cuarta vuelta:** el caballo, de piezas rígidas, abría rendijas al andar; ahora
es una sola malla con el esqueleto y los pesos del zorro (`rig-single-mesh.py`).
El polluelo, con esferas de pocos husos, salía lleno de picos: ahora son de diez,
como las de la gallina.

**Quinta vuelta:** el caballo seguía armado de cuerpos que se cruzan, con
escalones en la nuca y en el pecho. Ahora tronco, cuello y patas son una piel
continua (Skin de Blender), con la cabeza de la mula hundida en el cuello, la
crin en cresta y el casco plantado. La regla: **un animal que se ve de cerca se
mira de cerca en sus juntas, y andando, antes de enseñarlo.**

## Presupuestos (encargo de la tanda larga, bloques 6 y 7)

| | Astra | Nuevo | Tope |
|---|---|---|---|
| `stork` | 230 | 238 | 250 |
| `stork-nest` | 180 | 192 | 200 |
| `chick` | 78 | 460 | 80 (excepción: con 80 salía lleno de picos) |
| `crane` | 148 | 142 | 150 |
| `butterfly` | 16 | 16 | 16 |
| `horse` | 748 | 818 (una malla, piel continua) | 900 |

## Coste en el juego (`gl-probe.mjs`, antes y después seguidos, la máquina sola)

| Escena | Antes: llamadas · triángulos · programas | Después |
|---|---|---|
| Aldea 11/21, primavera | 384 · 745 840 · 47 | 386 · 745 696 · 48 |
| Aldea 11/21, verano | 391 · 745 423 · 51 | 393 · 745 400 · 52 |
| Aldea 11/21, otoño | 379 · 746 727 · 47 | 368 · 745 557 · 48 |
| Villa 7/60, verano | 491 · 762 832 · 60 | 493 · 762 807 · 62 |

**Y contra `main` de después de #59–#61** (segunda vuelta, con los objetos de
los bloques 0 y 1 ya dentro: 133 recursos), mismo procedimiento:

| Escena | `main`: llamadas · triángulos · programas | Esta rama |
|---|---|---|
| Aldea 11/21, primavera | 382 · 809 185 · 48 | 384 · 809 046 · 49 |
| Aldea 11/21, verano | 395 · 818 674 · 52 | 392 · 808 928 · 53 |
| Aldea 11/21, otoño | 377 · 809 586 · 48 | 366 · 808 416 · 49 |
| Villa 7/60, verano | 499 · 839 554 · 60 | 501 · 839 541 · 62 |

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
