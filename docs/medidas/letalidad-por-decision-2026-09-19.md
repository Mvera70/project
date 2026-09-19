# Qué decisiones acumulan la caída — 19 sep 2026 (G4)

`npm run lethality -- --seeds 30 --from 3 --step 7 --years 100 --cap 10`.
Salida cruda en `artifacts/lethality-pace.txt`.

**La pregunta de G4 es causal y una correlación no la contesta.** Las políticas
adversas eligen mal **en todo**, así que en su tabla toda opción que ellas tocan
sale letal. Lo que hay aquí es un **contrafactual por decisión**: se juega el
valle, se apunta cada pregunta que contestó, y **se vuelve a jugar desde el
principio cambiando una sola respuesta**. Lo que separe a las dos partidas es de
esa respuesta.

Treinta semillas, cien años, 291 ramas. **9 de los 30 valles caen jugando
prudente**, que es lo que hace que haya señal que atribuir.

---

## 1 · La tabla

Letalidad positiva = tomarla acaba la partida **más** veces que no tomarla, en
puntos porcentuales sobre los pares comparables.

| decisión | pares | letalidad |
|---|---:|---:|
| `granary_theft:believe_a` | 16 | **+38 pp** |
| `raiders_coming:wait` | 26 | **+19 pp** |
| `after_the_raid:build_up` | 18 | +11 pp |
| `one_at_the_ford:feed_him_and_send_him_on` | 31 | +10 pp |
| `tithe_demand:send_him_away` | 21 | +10 pp |
| `smith_feud:build_together` | 29 | +7 pp |
| `relic_pedlar:send_him_on` | 16 | +6 pp |
| `chapel_or_granary:the_chapel` | 20 | 0 pp |
| `hungry_spring:eat_it` | 8 | 0 pp |
| `plague_pit:bless_them` | 2 | 0 pp |
| `succession:choose_a` | 10 | 0 pp |
| `forest_cut:take_the_edge` | 25 | 0 pp |
| `breaking_ground:let_it_wait` | 18 | 0 pp |
| `wolf_winter:build_the_palisade` | 3 | 0 pp |
| `strangers_at_the_ford:take_them_in` | 24 | −4 pp |
| `winter_grain_debt:kneel` | 23 | **−9 pp** |

Dieciséis de las veintiuna plantillas aparecen con pares comparables.

---

## 2 · Lo que dice

**Lo que acumula la caída es no prepararse para el asedio**, que es exactamente
lo que §1b predecía y lo que el dueño del diseño dijo el 18 sep: «la letalidad
vendrá por las decisiones y por el asedio». `raiders_coming:wait` es la segunda
opción más letal del catálogo con 26 pares, y las dos que la siguen de cerca
—`after_the_raid:build_up`, `tithe_demand:send_him_away`— son de la misma
familia: qué se hace con el clan y con lo que pide.

**Y lo que más incomoda de la tabla: `raiders_coming:wait` es lo que elige la
política prudente**, o sea el jugador sensato de referencia de §12.9. Esperar
mata, y el juego lo premia con su puntuación: `prudent` puntúa lo que una
decisión cuesta *esta semana* —grano, ánimo— y prepararse cuesta las dos, así
que la política mira el precio y no ve el asalto. No es un defecto de la
política: es la definición de §12.9, «sin lookahead, pesa lo que puede ver esta
semana, como haría un aldeano». Pero explica por qué un valle bien jugado cae
igual, y es el material del que está hecha una curva de dificultad.

`granary_theft:believe_a` encabeza la tabla con +38 pp y es de otra cosa: creer
al acusado en el robo del granero. Con 16 pares es la señal más fuerte del
catálogo fuera de la familia del asedio.

**Al otro lado, lo que salva**: `winter_grain_debt:kneel` —arrodillarse ante el
señor por la deuda de grano— con −9 pp sobre 23 pares, y acoger a los del vado
con −4 pp sobre 24. Tragarse el orgullo y aceptar manos.

---

## 3 · Los tres límites de esta medida, que hay que leer antes de usarla

**Uno · el ruido es inherente.** Al divergir, el flujo `crossroads` diverge con
la partida, así que dos ramas del mismo valle no se separan sólo por la
decisión. Se suman semillas y ocasiones para que se cancele, pero con 16 a 31
pares por opción el intervalo es ancho: el orden de la cabeza de la tabla es
sólido, la diferencia entre +10 y +7 no lo es.

**Dos · la columna de población no se lee.** Está en la salida cruda y se ha
dejado fuera de aquí a propósito: quien cae tomado muere **a tamaño completo**,
así que su población final es alta, mientras que un valle que aguanta cien años
puede llegar pequeño. La cifra mide supervivencia al revés y confunde más de lo
que informa.

**Tres · y el más caro, porque costó una conclusión falsa el mismo día: la banda
de semillas cambia la tasa de caída nueve veces.** Con la misma política y los
mismos años, `0..29` da 1 valle caído de 30, `100..129` da 6 y `3+7i` da 9. No
es la magnitud de la semilla —la banda alta queda en medio—: es que caer es un
suceso raro y treinta semillas no bastan para medirlo. La primera pasada de este
informe se hizo sobre `0..23`, donde cae **uno**, y salió una tabla entera de
ceros y negativos: sin caídas en la rama base no hay letalidad que atribuir. Por
eso `npm run lethality` acepta la banda y **lo primero que imprime es cuántos
valles caen en ella**.

---

## 4 · Lo que no se ha tocado

**Ningún número.** Esto es un informe y G4 es nivelado, que es del dueño. Lo que
la tabla habilita es la conversación que la fila pedía: si la curva de dificultad
tiene que subir, esto dice **por dónde** —la familia del asedio— y dice también
que la política de referencia no ve venir el golpe.

La propiedad que esta medida confirma ya tiene guardia y no se ha duplicado:
`tests/journeys/threat.test.ts` mide sobre el mismo valle en el mismo instante
que pagar hace que se den la vuelta y que prepararse salva grano. Lo que este
informe añade es el **orden**: cuánto pesa esa decisión frente a las otras
quince.
