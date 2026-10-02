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

**Y en las jornadas de la CI, diecinueve rojas en trece ficheros.** Se
diagnosticaron en tres tandas, cada una contra `main` con la misma sonda:

- **Tres regresiones de verdad, arregladas en el código.**
  - **El corro de las reuniones** (`life/staging.ts`): `MEETING_SEARCH` (6) se
    leía como distancia de búsqueda y es el radio del claro libre que se pide.
    Eso es un claro de doce celdas de lado, y con el contorno quedan pocos (112
    celdas en la semilla 11 contra 401). El corro se plantaba a 14 celdas de la
    capilla. Con `MEETING_CLEARING` = 3,5 (lo que piden los ochenta del aforo),
    el más lejano vuelve a 7,2–13,9 celdas en siete valles.
  - **Las cascadas** (`world/waterfalls.ts`): la falda ensancha las gargantas
    y la pared quedaba más allá del alcance de 5 a 8 celdas. Once gargantas de
    120 se quedaban sin cascada, y las que había caían menos (mediana 5,9
    contra 8,6). Ahora se busca de 5 a 14 celdas, puntuando por la pendiente:
    120 de 120 (y 280 de 280 en las semillas 61 a 200), caída mediana 9,7. En
    los mapas de `main` da 120 de 120. Una de 120 (la 8 norte, pendiente 0,5)
    se lee más como arroyo que como salto; en `main` había tres flojas.
  - **El zorro al amanecer** (`life/companions.ts`): el tope de seguridad se
    medía en línea recta y el río o el cerco alargan la ruta. En cinco valles
    de 28 (también en `main`) llegaba al tope y desaparecía de golpe. Ahora va
    por la ruta.
  - **La partida, en la orilla del portón** (`life/raiders.ts`): `outsideOf`
    cogía el campo más grande del valle y no el de la puerta. El río parte el
    valle, la orilla del portón puede ser la pequeña, y entonces la partida
    se plantaba al otro lado del agua: cero golpes a la puerta en un asalto y
    cero aciertos de las flechas en la 11 y la 23. En 24 semillas a los 25 y
    35 años, partidas a más de diez celdas del portón o sin montarse:
    - en `main`, 5 de 44 (11 %);
    - con el contorno, 10 de 39 (26 %), porque la orilla de la puerta queda
      más corta;
    - con la cara de fuera del propio portón por delante (`fieldOutside`), 0
      de 44 y 2 de 39.
- **De trayectoria, cada una con su causa escrita en la prueba:**
  - el récord de 0,15 vuelve a `it` (0,162);
  - el devoto, a `it.fails` (1,35× en la muestra de seis; en doce semillas,
    1,72× con el contorno y 1,74× en `main`);
  - el peloteo de tres, a `it.fails` (una jornada de 180 contra dos);
  - el golpe de herramienta busca villas con alguien golpeando;
  - los lobos, un valle con bosque a su alcance;
  - el claro de la 7, a `it.fails` (su cerco la deja en 1 039 celdas), y la
    37 sube a la lista;
  - las visitas por la garganta se cuentan en doce valles: 9 de 12, y 10 en
    `main`;
  - la 11 vuelve a la lista del arco (29 flechas, 11 aciertos), y el asalto,
    el pasillo de E3b y la excepción de ribera buscan su villa o su celda por
    lo que necesitan, no por un número que el mapa movió.

**Y el tick.** La regla de `CLAUDE.md` pide medirlo al tocar `placement.ts`
(`tools/reports/tick-bench.ts`, semillas 7, 23 y 41, cuarenta años). Contra el
`main` de hoy salía un 26 % más lento, con aldeas del mismo tamaño (de 8,8 a
11,1 ms por semana; la semilla 7, cerca del 45 %). **Lo pagaban las rutas que
no llegan.** En la semilla 7, A* fallaba 23 204 veces en cuarenta años (1 713
en `main`), y cada fallo recorre entera la zona alcanzable. Hay más fallos
porque hay más pueblos que su cerco deja sin salida (§6). Además
`routeBetween` repetía la búsqueda imposible con cada pareja de entradas de
las dos parcelas.

Ahora la búsqueda que falla dice qué alcanzó, y las parejas que no pueden
llegar se saltan (`paths.ts`, `astar.ts`). Es exacto: las cinco huellas de la
partida —crónica, gente, edificios, tráfico y sendas— salen idénticas. Medido
alternando las dos ramas semilla a semilla, dos vueltas:

| ms por semana | `main` | contorno |
|---|---:|---:|
| semilla 7 | 6,9 | 8,3 |
| semilla 23 | 11,7 | 8,7 |
| semilla 41 | 8,4 | 7,9 |
| **media** | **9,0** | **8,3** |

La 7 sigue un 21 % por encima: es la aldea que su cerco encierra, y tiene 80
vecinos contra 82.

## 6 · Abierto

- **La cantera lejana.** Con la roca a más de catorce celdas de la obra, al
  albañil se le acaba la jornada antes de cargar: pasa en 15 valles de 60 en
  `main` y en 20 con el contorno (la roca más cercana, mediana 11,4 → 12,6
  celdas). Es de la PR de la cantera (v5.74), que la lleva al pie de la montaña.
- **La muralla en la falda**: el cerco sale del contorno en los doce valles.
  Se levanta igual (la falda es prado), pero llega 36 h más tarde; si eso pide
  nivelado, es de Vera.
- **Pueblos que su propio cerco deja sin salida.** A los cuarenta años, con el
  cerco puesto, el pueblo alcanza menos de 500 celdas en 3 valles de 24 (las
  semillas 6, 13 y 17). Menos de 1 200 en 8 de 24; en `main`, 1 de 24 en los
  dos recuentos. En la 13 el único portón da a tres celdas de prado y luego a
  la montaña. Es un defecto que ya existía (la 18 en `main`, la 37 antes de
  RD-3: `placeBuilding` no comprueba que el portón dé a algún sitio) y el
  contorno lo hace más frecuente. Arreglarlo es cambiar la regla de colocación
  del cerco y del portón, que mueve todas las trayectorias otra vez: va en su
  propia ronda.
- **Menos sitio para campos cerca de la plaza.** Sitios libres para un campo de
  3×2 en pradera o claro, a 18 celdas o menos de la plaza, a los sesenta años y
  en doce semillas: de 195–451 en `main` (mediana unos 245) a 123–200 (unos
  144). Se lo dije a K5, que piensa en un campo de lino.
- **Gargantas más anchas.** En los extremos del mapa la pared arranca a 9 o 14
  celdas del río en lugar de a 3, porque el contorno llega hasta las gargantas
  con su falda. Se ve en las hojas cenitales.
