# Los animales rehechos (v5.100, 2 oct 2026)

Vera: «los modelos de Astra de los animales no me gustan, los corregirás tú con
el estilo que has ido usando con los últimos». Rehechos los seis candidatos de
Astra de hoy: `stork`, `stork-nest`, `chick`, `crane`, `butterfly`
(`art/astra-b6-fauna-polish`) y `horse` (`art/astra-b7-village`).

## Qué fallaba en los de Astra

| Animal | Lo de Astra |
|---|---|
| Cigüeña | Huevo de caras planas, el ala negra pegada como una placa, cuello en pieza aparte sin esqueleto, sin patas que anden |
| Nido | Palangana de pared recta y fondo plano: se lee cesto |
| Polluelo | Campana amarilla sin cabeza distinta, sin nodos para andar |
| Grulla | Alas de papel en dientes de sierra, cuerpo de huso: una cometa gris |
| Mariposa | Dos pajaritas con los colores horneados, sin forma de mariposa |
| Caballo | Patas en salchichas con huecos, tronco de caja, cascos de cubo (el estilo de G-23) |

## Cinco vueltas rechazadas, y la que vale

Las cinco primeras se hicieron **dentro de los topes del encargo de Astra** (80
triángulos el polluelo, 250 la cigüeña, 900 el caballo): esferas de cinco y
seis husos, piezas que no se tocaban, una piel continua sin el lenguaje de la
mula. Vera las rechazó una tras otra («mira el pollo», «muchos vértices», «el
caballo tiene piezas con huecos», «es un nivel bajísimo») y la sexta salió de su
última frase: **«para y hazlos bien, con la calidad de los que tenemos ahora».**

Cada uno sale de la receta de su animal del valle, casi literal y con su
densidad (`deliverables/marked-models-trial/build-models.py`):

| Animal | De qué receta | Triángulos | Referencia | Astra |
|---|---|---|---|---|
| Caballo | `mule()` sin albarda, ×1,22 | 2202 | mula 2474 | 748 |
| Cigüeña | `hen()` | 1838 | gallina 1978 | 230 |
| Polluelo | `hen()` en cría | 1454 | gallina 1978 | 78 |
| Grulla | cuerpo de la gallina, plumas de la perdiz | 832 | — | 148 |
| Mariposa | alas punto a punto | 182 | — | 16 |
| Nido | ramas | 192 | — | 180 |

**Lo que queda escrito para la próxima:** un tope pensado para otro autor no es
una razón para entregar menos calidad que los animales que ya hay; y **nada se
enseña sin mirarlo antes de cerca en sus juntas, andando y junto a su vecino**
(`tools/art/fauna-sheet.py`, con `look` y `clip`).

## Coste en el juego (`gl-probe.mjs`, la máquina sola)

Contra `main` con #59–#61 dentro (133 recursos), mismo procedimiento:

| Escena | `main`: llamadas · triángulos · programas | Esta rama |
|---|---|---|
| Aldea 11/21, primavera | 382 · 809 185 · 48 | 384 · 813 159 · 49 |
| Aldea 11/21, verano | 395 · 818 674 · 52 | 397 · 824 316 · 53 |
| Aldea 11/21, otoño | 377 · 809 586 · 48 | 371 · 828 406 · 49 |
| Villa 7/60, verano | 499 · 839 554 · 60 | 492 · 835 814 · 62 |

Dos llamadas más con cigüeñas a la vista (sus patas); de un 0,5 a un 2,3 % más
de triángulos (el máximo, en otoño: quince grullas de 832); un programa más (el
Lambert con color de vértice de la grulla y la mariposa). SwiftShader: no son
fotogramas de un teléfono, y falta la medida en el aparato.

## Evidencia

- `artifacts/graphics/animales-rehechos/antes-despues.png`: los seis, A = Astra,
  B = nuevo, a la cámara de reposo del juego y junto a sus vecinos.
- `artifacts/graphics/animales-rehechos/<id>/hoja.png`: cada uno de reposo, de
  perfil, con sus vecinos (la cigüeña con la vaca, el polluelo con la gallina,
  el caballo con la mula, la grulla con la golondrina, el nido con la cigüeña
  encima) y a escala de móvil (32 px por celda).
- `artifacts/graphics/animales-rehechos/revision/`: la revisión de cerca antes
  de enseñarlos (`r1.png`, cada uno junto a su referencia; `grulla.png`).
- `artifacts/graphics/animales-rehechos/juego-summer-ciguena-antes-despues.png`:
  en el juego (`seasons.mjs`, que encuadra sola la primera cigüeña).

## Lo que no se pudo ver

- **La uve de grullas en el juego**: en el dibujo por software su reloj real
  avanza a una décima (igual que en v5.85).
- **El polluelo en el juego**: la aldea 11 del año 8 no tiene gallinas.
- **La cigüeña en el juego queda tapada a medias** por la hierba alta y la copa
  de al lado, antes y después: es del sitio de `storkSpots`, no del modelo.
