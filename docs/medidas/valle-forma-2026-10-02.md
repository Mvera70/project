# El valle con forma natural · lo medido y lo decidido (2 oct 2026)

Encargo de Vera (goal del 2 oct, punto 2): «el valle es muy cuadrado, debería
tener una forma más natural, y hay zonas muy desaprovechadas» (marcó las dos
laderas grandes del norte, a los lados de la garganta). Es un cambio del motor:
se midió en `main` antes de proponer nada, y lo que tocara el balance se le
preguntó a ella.

Herramientas: `tools/reports/valley-shape-report.ts` (nueva: qué hay dentro y
fuera del corazón, dónde se construye, qué se pisa y qué no toca nadie) y
`tools/reports/pace-report.ts` (la escalera en horas de reloj a ×1). Las dos
juegan con `run` y la política prudente.

## 1 · En `main` (12 semillas × 60 años)

| | por valle |
|---|---|
| Mapa | 72 × 112 = 8 064 celdas |
| Corazón (el rectángulo de 36 × 56) | 2 016 |
| Fuera del corazón | 6 048: montaña 3 950 · **prado 1 823** · marisma 74 · lago 61 · río 140 |
| Construido dentro | 611 celdas |
| Construido fuera | 12,5 celdas, todo empalizada y portón, en 5 valles de 12 |
| Pisado (tráfico ≥ 400), dentro / fuera | 202 / 44 |
| Suelo abierto de fuera sin pisar ni construir en sesenta años | **97,4 %** |
| Suelo abierto del corazón usado (pisado, construido o cambiado) | 31,1 % |

**No faltaba sitio**: la aldea usa un tercio de su corazón en sesenta años. Lo
desaprovechado era lo que se ve: 1 823 celdas de prado alrededor del
rectángulo —casi tanto como el corazón entero— que nadie pisa, y las laderas
desnudas que Vera marcó.

## 2 · La propuesta

El corazón deja de ser el rectángulo (`world/valley-shape.ts`, `design.md`
§7.1, paso 2b): crece desde el claro de fundación siguiendo al río, ancho en el
centro y cerrándose hacia las dos gargantas, con lóbulos —dos al norte, a los
lados de la garganta— y espolones, **con la misma superficie**. El bosque, la
roca, el lago y la montaña se colocan desde ese contorno, y en el 3D la ladera
sube desde él y no desde el eje del río. Lo guarda el mapa (`map.heart`,
esquema 13; una partida de antes recibe el rectángulo).

Las tres hojas que vio Vera, en `valle-forma-img/`:

- `cenital-7-11-23.jpg` — en su ángulo (cenital, el norte arriba), hoy y la
  propuesta, semillas 7, 11 y 23.
- `planta-7-11-23.jpg` — la planta del motor: el rectángulo en rojo y el
  contorno en blanco.
- `oblicua-tres-bordes.jpg` — en la cámara de siempre, hoy, la propuesta con
  la falda de prado y la propuesta con la ladera pegada al contorno.

## 3 · Lo que decidió Vera (2 oct 2026, con las hojas delante)

| Pregunta | Respuesta |
|---|---|
| ¿Con qué superficie? | **La de hoy, 2 016 celdas** (no un 30 % más) |
| ¿Cómo es el borde? | **Con falda de prado**, como hoy (no la ladera pegada al contorno) |
| ¿Qué hay en el cinturón? | **Pasto, bosque de ladera y cantera** (no la caza) |
| ¿Recursos o vida? | **Sólo vida, sin tocar el balance** |

Los usos del cinturón van en su propia PR (v5.74), detrás de esta.

## 4 · Medido con el contorno nuevo

**El contorno**, en 200 valles (`tests/fast/valley-shape.test.ts` lo guarda en
cuarenta): siempre de una pieza y sin agujeros; de 2 016 a 2 038 celdas (lo que
queda cercado se rellena); el borde, de 308 a 406 aristas cuando el rectángulo
tiene 184; la anchura por fila varía entre un 32 y un 53 % (la del rectángulo,
nada); el claro de fundación siempre dentro; nunca bosque ni piedra fuera, ni
montaña ni lago dentro; en la primera celda de fuera, un 0,7 % de montaña (la
falda); y las dos laderas del norte dentro, con veinte celdas o más cada una,
en 161 de 200 (una sola en 8, ninguna nunca).

**Lo que hay y lo que se usa** (12 semillas × 60 años):

| | `main` | contorno |
|---|---|---|
| Fuera: montaña · prado · marisma · lago · río | 3 950 · 1 823 · 74 · 61 · 140 | 3 679 · 2 219 · 29 · 68 · 50 |
| Construido dentro, por valle | 611 | 545 |
| Construido fuera (todo defensa), por valle | 12,5, en 5 de 12 | 62, en 12 de 12 |
| Pisado dentro / fuera, por valle | 202 / 44 | 187 / 26 |
| Suelo abierto de fuera sin tocar | 97,4 % | 97,4 % |
| Suelo abierto del corazón usado | 31,1 % | 30,5 % |

El río y la marisma pasan casi enteros a estar dentro (el valle sigue al río de
garganta a garganta). Y el cerco sale del contorno en los doce valles: alrededor
del pueblo el valle es más estrecho que el rectángulo, y la muralla se levanta en
la falda.

**La escalera** (24 semillas × 60 años, mediana en horas a ×1):

| Peldaño | `main` | contorno |
|---|---:|---:|
| 10 personas | 12 h | 10 h |
| granero | 25 h | 27 h |
| capilla | 33 h | 38 h |
| primera piedra | 40 h | 42 h |
| **edad de piedra** | **63 h** | **61 h** |
| 30 personas | 69 h | 79 h |
| primer asalto | 125 h | 136 h |
| muralla | 157 h | 193 h |
| portón | 158 h | 194 h |
| atalaya | 199 h | 232 h |
| **villa cerrada** | **331 h** | **329 h** |
| bastión | 448 h | 491 h |
| población al final (mediana) | 52 | 56 |
| partidas acabadas | 2/24 | 2/24 |

Las dos partidas acabadas son las mismas en los dos (la 108 y la 129, de hambre
el primer año, antes de que el mapa cuente). Lo que se mueve: **la primera
muralla llega más tarde** (157 → 193 h), porque el cerco no cabe dentro del
contorno y sale a la falda; la villa cerrada, no.

## 5 · Lo que el mapa nuevo movió en las pruebas

Suite rápida entera en local: 8 rojas de 2 101, ninguna por un fallo del
contorno.

- **Un fallo de verdad, destapado**: `reachableNear` (`life/terrain.ts`) se
  quedaba en un rincón de una celda cuando el centro del pueblo caía en una
  casa, y en esa aldea —la 11 de veinte vecinos— no nacía ninguna presa. Ahora
  se salta los rincones (`MIN_SHORE`).
- **Siete atadas a la semilla 7 o a un supuesto que ya no valía**, cada una con
  su causa escrita en la prueba: los lobos (sin bosque a su alcance a los veinte
  años), el albañil (la roca a 17 celdas), el jabalí (el cazador de la prueba en
  la otra orilla), los trastos del corral (el leñero sin sitio para más de una
  pila), la tala (un plantón entre los treinta primeros árboles) y la caché de
  rutas (abaratamientos pendientes contados a la obra que se medía).

## 6 · Abierto

- **La cantera lejana.** Con la roca a más de catorce celdas de la obra, al
  albañil se le acaba la jornada antes de cargar: pasa en 15 valles de 60 en
  `main` y en 20 con el contorno (la roca más cercana, mediana 11,4 → 12,6
  celdas). Es de la PR de la cantera (v5.74), que la lleva al pie de la montaña.
- **La muralla en la falda**: el cerco sale del contorno en los doce valles.
  Se levanta igual (la falda es prado), pero llega 36 h más tarde; si eso pide
  nivelado, es de Vera.
