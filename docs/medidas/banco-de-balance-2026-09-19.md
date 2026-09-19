# El banco de balance, remedido — 19 sep 2026 (G2)

`npm run test:balance`, 60 semillas × 200 años × cuatro políticas.
Salida cruda en `artifacts/balance-run.txt` (primera pasada) y
`artifacts/balance-run2.txt` (segunda), series en `artifacts/balance.csv` y
cifras por semilla en `artifacts/balance-summary.json`.

**Lo primero, porque es lo que hacía falta para decidir cualquier cosa: las dos
cifras que el cuaderno llevaba anotadas estaban caducadas.**

| Lo que decía `task-log.md` §4 | Lo medido el 19 sep |
|---|---|
| «19 rojas de 37» | **11 de 37**, y de ellas **cuatro causas**, no once |
| «tarda más que su propio presupuesto» (45 min) | **31 minutos** (1.857 s), y con dos sondas compitiendo |

El banco cabe en su presupuesto y tiene la mitad de rojas de las que se le
atribuían. No había que recortarlo; había que correrlo.

---

## 1 · Lo que sale, política a política

| | prudent | first | last | worst | listón |
|---|---:|---:|---:|---:|---|
| extinción | **26,7 %** | 16,7 % | 75 % | 95 % | 2–12 % (prudent) |
| pico mediano | 80 | 81 | 46 | 32,5 | 65–85 ✓ |
| población a la generación 1 | 43,5 | 43,5 | 29 | 22,5 | ≥ 26 ✓ |
| mapa lleno antes del año 120 | 0,65 | 0,82 | 0,07 | 0,03 | ≥ 0,60 ✓ |
| cadencia (preguntas/generación) | **15,3** | **16,8** | **12,6** | **13,9** | 1–5 |
| bosque en pie al año 100 (mediana) | **72,7 %** | 71,7 % | 77,1 % | 76,5 % | 40–70 % |
| valles en la banda del bosque | 13/47 | 16/52 | 0/16 | 0/3 | ≥ 2/3 |
| años agonizando (máx.) | 5 | 3,6 | 1,2 | 5 | ≤ 10 ✓ |
| cifras fuera de rango o NaN | 0 | 0 | 0 | 0 | 0 ✓ |
| solapes de edificio o obra | 0 | 0 | 0 | 0 | 0 ✓ |
| extinción tras el choque del 90 % | 53 % | 37 % | 97 % | 100 % | ≥ 25 % ✓ |

**La horquilla del principio 2 sigue abierta de par en par**: 95 % contra 26,7 %
son **68 puntos** entre jugar mal y jugar con cabeza, contra los 20 que pide.

---

## 2 · Las cuatro rojas, y de qué son

Ninguna es una regresión sin dueño. Las cuatro tienen causa conocida, y tres de
ellas son **el juego moviéndose adonde se le pidió que fuera**.

### 2.1 · La cadencia: 12,6–16,8 contra una banda de 1–5

De antes de dos cambios del **mismo día**: el suelo de §8.6 bajó de 48 a 16
ticks porque el dueño del diseño dijo que «se tarda muchísimo en empezar a hacer
cosas», y R-1 metió una tirada de sucesos cada semana. La banda de §12.9 se
escribió contra el juego anterior.

### 2.2 · La extinción prudente: 26,7 % contra 2–12 %

**Es §1b funcionando.** Desde B1–B4 un clan vecino baja, rompe el portón y acaba
la partida (`ended.cause = 'stormed'`). Medido aparte en `pace-report`: **8 de
24 valles se acaban en sesenta años, y siete de los ocho son tomados.** La banda
es de antes de que el asedio existiera, y el dueño lo dijo con todas las letras:
«que haya partidas que se rompan es la idea».

### 2.3 · El bosque: 72,7 % de pie contra una banda de 40–70 %

**Y la dirección importa: el bosque no se agota, se queda entero.** El valle no
baja del 70 % en ninguna política. La causa ya estaba medida y escrita en
`task-log.md`: **la leña no es un cuello de botella** —de 507 a 43.000 unidades
en cien años— y desde §7.13 la aldea corta la que necesita en vez de una cuota
fija, así que con el mapa cuatro veces mayor nunca llega a morderlo. Es el mismo
hallazgo que dejó al hacha siendo el medio más flojo del carro (M-4: 39 personas
contra 38).

### 2.4 · La elegibilidad: tres plantillas por encima del 1 %

| plantilla | prudent | first | last | worst |
|---|---:|---:|---:|---:|
| `after_the_raid` | 4,28 % | 4,21 % | 3,20 % | 2,58 % |
| `raiders_coming` | 3,66 % | 4,66 % | 2,23 % | 2,09 % |
| `breaking_ground` | — | — | — | 1,33 % |

Las dos primeras son **la familia del clan vecino** (B1): desde que el valle
tienta, sus condiciones se cumplen temporada sí y temporada también. Elegible no
es planteada —el techo de §8.6 está delante— pero un 4 % dice que esas preguntas
han dejado de ser raras.

`breaking_ground` sale **sólo bajo `worst`**, y no es un defecto: es del caserío
(G3) y pide menos de diez personas, así que sólo se queda elegible en la política
que mantiene al valle pequeño. Su contrato cumpliéndose.

**Y la trampa que esto costó, que vale para cualquier prueba cara:** el aserto
recorría las plantillas y fallaba en la primera que se pasara, así que el informe
decía «`raiders_coming`» y callaba las otras dos. Excluirla y volver a correr
destapaba la siguiente **media hora después**. Una prueba que sólo enseña el
primer fallo obliga a pagar el banco entero por cada uno; ahora recoge todas y
las compara de una vez.

---

## 3 · Lo que se hizo con ellas, y lo que no

**No se movió ningún número.** Las cuatro se quedan como `it.fails` con la
propiedad del brief intacta y la cifra escrita al lado, que es el patrón que
`CLAUDE.md` manda: bajar la banda de la cadencia a 17 sería escribir lo que hoy
sale y llamarlo diseño. **Las cuatro son nivelado, y el nivelado es del dueño.**

Lo que sí cambia es que **el banco vuelve a estar verde al correrlo**, que es lo
que lo hacía inútil: con once rojas conocidas mezcladas con las que vengan,
nadie distingue una regresión nueva de la deuda de septiembre. Si una de las
cuatro vuelve a su banda, su `it.fails` se pone roja y hay que venir a leer esto.

---

## 4 · Y la quinta, que sí era un defecto del instrumento

`tests/balance/catalog-coverage.test.ts` daba por **contenido muerto**
plantillas que el juego plantea en todos los valles. La causa estaba escrita en
el banco que usaba (`tests/helpers/catalogue-bench.ts`): funda con **veinte
personas en el tick 0** —la aldea de antes de la pareja fundadora— y las
mantiene ahí, con su propio bucle de tick. La premisa que lo justificaba —«la
partida real tarda siglos en visitar estos estados»— caducó.

Medido con `foundGame` + `run` y la política prudente:

| banco | mudas |
|---|---|
| 8 semillas × 60 años, 21 s | `plague_blame`, `quiet_years` |
| 12 × 60, 28 s | `plague_blame`, `quiet_years` |
| **12 × 100, 49 s** | **`quiet_years`** |
| 24 × 60, 57 s | `plague_blame`, `quiet_years` |
| 24 × 100, 95 s | `quiet_years` |

**Se plantean 20 de las 21 plantillas.** Las tres que las pruebas daban por
mudas o excusaban a mano salen en 24, 24 y 11 valles de 24
(`chapel_or_granary`, `one_at_the_ford`, `breaking_ground`). La única muda es
`quiet_years`, que es la reserva de §8.6: su silencio pasa de excusarse a
**afirmarse**, porque si empieza a salir lo que dice es que el resto del
catálogo se ha quedado sin condiciones que cumplir.

Sustituida por `tests/journeys/catalogue-coverage.test.ts`. Y cambia de suite a
propósito: en `tests/balance/` no la corría nadie.

**Un dato que esto deja y que no se ha tocado**: `plague_blame` **no sale en
sesenta años en ninguna de 24 semillas**. Sesenta años son 672 h de reloj a ×1 y
el último peldaño del juego cae a las 350 h, así que hay una plantilla del
catálogo que vive fuera del horizonte de cualquier jugador. Es contenido y es
del dueño.

---

## 5 · Lo que el banco no mide, y conviene saber

**Su horizonte no es el de nadie.** Doscientos años son **2.240 h de reloj a ×1**
(§12.1: una semana son catorce minutos), y el último peldaño del juego entero
—el bastión— cae a las **350 h** de mediana. El año 120 del listón del mapa son
1.344 h; el año 100 del bosque, 1.120 h.

Eso no invalida el banco —es un remojo de estabilidad del motor, y como tal
sigue dando cero NaN y cero solapes en 48.000 años de aldea— pero sí quiere
decir que **lo que un jugador ve en sus primeras trescientas horas no lo mide
ningún listón de aquí**. Desde G2 cada uno lleva su hora escrita al lado y
`runBalance` acepta el horizonte como parámetro (`PLAYED`, 60 años = 672 h),
para que ese banco se pueda montar cuando haga falta.
