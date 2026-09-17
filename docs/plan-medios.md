# Parada del 17 sep 2026 · Por qué no es divertido, y el juego de los medios

Escrito para el dueño del diseño y para los agentes que hagan el trabajo. Es
una parada, no una ronda: aquí no se cambia código. Se mide, se diagnostica y se
propone. Lo que se decida va a `docs/rework.md` como fase nueva.

---

## 0. Lo que dijo el dueño, con sus palabras

> «Esas decisiones que vienen de vez en cuando … no están mal del todo, pero
> tampoco aportan mucho. El tema de la economía y cómo se gestiona el juego, no
> sé hasta qué punto nosotros intervenimos. … Una parte que tenemos
> medianamente bien es que la aldea avanza sola; muchas prosperan. Pero la
> gracia es que todo esto tenga que ver con nuestra intervención.»

> «Ahora mismo no es nada divertido. Lo único bonito es mirar cómo avanza el
> pueblo.»

> «Es como si cogieras a un grupo de personas y le dieses una pala, o un
> martillo, o un no sé qué. Depende de lo que le des van a hacer diferentes
> cosas. Tú realmente no le estás diciendo qué tienen que hacer, sino que
> ciertas cosas dan lugar a otras. Y eso crea situaciones random, que es lo que
> deseamos. Pero esas decisiones de qué pasa las tomamos nosotros.»

La tercera frase es el diseño. El resto de este documento la baja a mecánica.

---

## 1. Lo medido hoy

Dieciséis semillas, sesenta años, política prudente en las encrucijadas salvo
donde se dice otra cosa. Observacional; el script no está en el repo porque no
es una prueba, es una pregunta.

### 1.1 Cuánto importa el jugador

| Qué hace el jugador | Población mediana a los 60 años | Aldeas muertas de 16 |
|---|---|---|
| Nada: postura de reposo, contesta bien las encrucijadas | **42** | 2 |
| Nada: contesta al azar | 18 | 5 |
| Nada: contesta lo peor | 6 | 4 |
| Nada: contesta siempre lo primero | 32 | 2 |
| Prioridad de obra: comida / techo / oficios / defensa | 48 / 45 / 42 / 25 | 2 / 2 / 2 / 2 |

### 1.2 Las tres palancas, posición a posición

| Palanca | 0,5 | 0,8 | **1,0** | 1,3 | 1,6 | 2,0 |
|---|---|---|---|---|---|---|
| `fields` · población mediana | 15 | 38 | **42** | 19 | 9 | 2 |
| `fields` · muertas de 16 | 2 | 2 | **2** | 3 | 6 | 5 |

| Palanca | 0,0 | 0,2 | **0,4** | 0,6 | 0,8 | 1,0 |
|---|---|---|---|---|---|---|
| `timber` · población mediana | 0 | 0 | **42** | 39 | 8 | 0 |
| `timber` · muertas de 16 | 16 | 11 | **2** | 5 | 5 | 16 |

Las que mueren con la leña mal puesta mueren **tarde** (año 33 a 39 de mediana):
cuarenta años de aldea que se apaga sin que nada avise.

---

## 2. El diagnóstico, en tres hallazgos

### 2.1 Las palancas no son un juego: son una trampa con una sola salida

La versión 2.0 dio al juego un verbo —tres órdenes permanentes— y su propio
plan escribió lo que lo falsaría: *«que la aldea aguante igual de bien
cualquier postura»*. Pasó lo contrario y es peor: **la aldea sólo aguanta la
postura de fábrica.** A dos muescas del reposo la mitad de las aldeas se
mueren, y a tres se mueren todas. Un jugador que toque las órdenes hace daño
casi siempre y casi nunca mejora (la prioridad de obra sí mejora, poco: 42 →
48).

No es un número mal puesto. Es la naturaleza de la palanca: **una orden global
y permanente que la aldea obedece sin rechistar.** `allocateLabour` no tiene
manera de decir «esto no puede ser»: si le dices que todas las manos sobrantes
vayan al bosque, van, y no se levanta ni una casa en cuarenta años. La aldea
obedece —que era la meta de E1— y una aldea que obedece a ciegas es una aldea
que muere cuando te equivocas. Y como no se ve nada de eso hasta veinte años
después, el jugador no aprende: aprende a no tocar.

Es exactamente lo contrario de lo que el dueño ha descrito. En su frase no se
le dice a nadie qué hacer.

### 2.2 Las encrucijadas pesan, pero no se sienten

Contestar bien contra contestar mal es la diferencia entre 42 personas y 6.
**Es el sistema con más peso que hay**, y el jugador no lo nota por tres cosas
que ya estaban medidas y siguen ahí:

- Llegan dos veces por década y su consecuencia es un delta de estadística y
  una frase (`plan-juego.md` §1).
- **Diez de veinte plantillas no salen nunca** (`findings-drama.md` §2, §7), así
  que se ven siempre las mismas.
- Nada en pantalla conecta la decisión con lo que pasa veinte años después. El
  enfoque de la cámara al contestar (arreglado hoy, VZ-6) es lo único que la
  liga a un sitio.

Y una cosa más, del propio motor: son **el mundo preguntándote a ti**. El
jugador no elige cuándo actuar. Eso está bien como sal; como único plato es lo
que hace que el juego se sienta como un vídeo con dos botones.

### 2.3 La aldea prospera sola, y eso era una decisión de diseño

Catorce de dieciséis aldeas llegan a los sesenta años sin que nadie toque
nada. `design.md` §1 lo escribe como regla: *«fuente de letalidad: las
encrucijadas, no el mundo»*, y la simulación base mata el 3 % en doscientos
años a propósito. **Sin presión del mundo no hay motivo para intervenir**, y
sin motivo para intervenir no hay juego: sólo hay algo bonito que mirar, que es
lo que el dueño describe.

El dueño ya lo tumbó de palabra el 15 sep («que haya partidas que se rompan es
la idea», `rework.md` §0.4). Lo que no se ha hecho es sacar la consecuencia:
**si el mundo puede romper la aldea, lo que el jugador hace es lo que decide si
se rompe o no.** Ahí está la intervención que pide.

---

## 3. La propuesta: dar medios, no órdenes

### 3.1 El principio

**El jugador nunca fija un número ni da una orden. Mete cosas en el valle.** Una
herramienta, un animal, una persona, un objeto. Lo que la aldea hace con ello
lo deciden sus propios sistemas —las necesidades, el reparto de manos, los
sucesos, las opiniones—, y por eso dos jugadores que metan lo mismo en dos
valles verán cosas distintas, y el mismo jugador que meta cosas distintas en
la misma semilla verá dos aldeas.

Es la pala y el martillo del dueño, literalmente. Y encaja con la premisa en
vez de pelearse con ella: la aleatoriedad sigue siendo el motor; el jugador es
quien la siembra.

### 3.2 En qué se diferencia de lo que hay

| | Las órdenes (v2.0) | Las encrucijadas | **Los medios** |
|---|---|---|---|
| Quién empieza | El jugador | El mundo | El jugador |
| Qué es | Un número global y permanente | Una pregunta con tres respuestas | **Una cosa en el valle** |
| Qué hace la aldea | Obedece | Sufre la consecuencia | **Decide qué hacer con ello** |
| Cuándo se ve | Nunca directamente | Una frase | **Se ve la cosa, y se ve lo que provoca** |
| Riesgo | Acantilado: sólo vive el reposo | Estadístico e invisible | Cada medio abre algo bueno **y** algo malo |

### 3.3 Cómo se ve un medio, con ejemplos

Cada uno es una cosa visible en 3D, con un coste, y **sin resultado garantizado**:
abre posibilidades que la aldea y el azar convierten en historia.

| Medio | Qué cambia en el motor | Lo bueno que puede traer | Lo malo que puede traer |
|---|---|---|---|
| **Un arado** | Un campo rinde más con menos manos | Sobran manos → la aldea las manda donde ella quiera: obra, leña, bosque | El granero se llena → el señor pide más, la rata, el robo (`granary_theft` sale por fin) |
| **Un hacha buena** | Se tala más rápido | Casas antes, piedra antes | El bosque retrocede → riada más probable, el oso y los lobos se acercan, el guardabosque protesta |
| **Una pareja de cerdos / vacas** | Nace ganado | Comida en invierno, la fiesta | Lobos en invierno, la peste del ganado, comen grano |
| **Un forastero con oficio** | Llega alguien con un rol (herrero, partera, cura) | Fragua antes → piedra → muralla | Trae un rasgo: ambicioso, rencoroso; la sucesión se disputa |
| **Un barril de cerveza** | Una fiesta esta semana | Ánimo, boda, fe | La riña en la plaza; dos vecinos que se caen mal para siempre |
| **Una reliquia** | Fe | Capilla antes, peregrinos, el cura | Diezmo, la disputa con el señor (`tithe_demand`, `relic_pedlar`) |

Nótese que **medio catálogo de encrucijadas que hoy no sale nunca** sale con
esto: cada medio hace probable un grupo de plantillas. Las encrucijadas dejan de
ser el mundo preguntando al azar y pasan a ser **la consecuencia de lo que tú
metiste** — que es lo que las hace significar algo.

### 3.4 Por qué no hay acantilado

Un medio no fija cuántas manos van a dónde: cambia **lo que la aldea puede
hacer y lo que el mundo puede tirar**, y el reparto de manos lo sigue haciendo
`allocateLabour` por necesidades. La aldea no puede obedecer a ciegas porque no
se le ha ordenado nada. Lo que sí puede es **descompensarse por lo que tiene**
—muchos cerdos y pocos lobos que espantar, mucho granero y poca empalizada— y
eso es presión legible, no una muerte lenta por un número mal puesto.

### 3.5 El coste de un medio, y el ritmo — **decidido por el dueño, 17 sep**

**Cuesta lo del valle**: grano y leña. «No quiero que sea gratis.» Un arado son
manos y leña que no van a una casa; una pareja de cerdos, grano que no va al
invierno. El jugador administra la economía **a través** de los medios, sin
tocar ningún número — que es la respuesta a «no sé hasta qué punto
intervenimos en la economía».

**Y el ritmo es alto**: «esperar un año delante de la pantalla se hace muy muy
lento; tiene que ser dinámico, cada semana, cada mes, cada tres meses que pasen
cosas». Dos consecuencias:

- El carro **siempre tiene algo que ofrecer** si hay con qué pagarlo. No hay
  espera artificial: el límite es el granero y la leñera, no un contador.
- El mundo contesta a lo que se mete **en semanas, no en décadas**: los cerdos
  paren o los lobos vienen ese mismo invierno; la fiesta es esta semana; el
  arado se nota en la siguiente cosecha. Lo que tarde más de una estación en
  verse no sirve como medio.

Para dimensionarlo: a ×1 una semana son catorce minutos y a ×64 son trece
segundos. R-1 ya tira un suceso cada tres o cuatro semanas; con los medios
dentro, el objetivo es **algo que mirar o que decidir cada dos o tres semanas
del valle**, sea suceso, consecuencia de un medio o encrucijada.

**Nada se coloca con el dedo.** «En este juego no se coloca nada; todo se
decide y el mapa interactúa solo.» La parcela marcada de §3.3 se cae; el resto
se **da** y la aldea decide dónde va, como ya hace con cada edificio.

**Y la presión del mundo tiene una regla que manda** (§4, M-1): la aldea no se
muere sin motivo ni al principio. «Que caiga un rayo en una casa y eso ya se
muera no tiene gracia. Se puede morir, pero más adelante, porque ya hemos
tomado varias decisiones que hacen que se tumbe. De primeras la aldea no tiene
por qué morirse.» Lo que el mundo puede romper **escala con lo que el jugador
ha metido**: más ganado, más lobos; más bosque talado, más riada; más grano,
más ladrones y más señor. Una aldea en la que no se ha metido nada tiene la
presión de hoy (3 % en doscientos años), y la pareja fundadora **no puede
quedarse a cero** por el mundo.

### 3.6 Lo que ya existe y sirve tal cual

- **Los rasgos del valle** (E5): «un rasgo cambia un número de la economía para
  siempre, se sortea en la fundación y se cuenta en la crónica». Un medio es
  **un rasgo que el jugador añade a mitad de partida, visible y con coste.** El
  mecanismo del motor ya está; lo que falta es que lo dé el jugador.
- **La tabla de sucesos** (R-1) con sus `weightOf`: cada medio multiplica pesos.
  Lobos ×1,6 con bosque viejo ya existe; «lobos ×2 con cerdos» es una fila más.
- **La capa de vida**: los medios se ven porque son objetos y animales, que es
  lo que esa capa ya sabe posar y mover.
- **La crónica**: lo que se dio queda escrito, y por eso dos jugadores pueden
  comparar («yo le di el arado el año 4»).
- **Las encrucijadas**: se quedan (R-4), y ganan sentido al ser consecuencia.

### 3.7 Lo que se retira

- **Las tres palancas de órdenes**, de la interfaz. Lo que hacían bien lo hace
  un medio (el arado *es* «más campo»; el hacha *es* «más leña»), y sin el
  acantilado. `state.intent` puede quedarse en reposo por dentro, o irse; es
  una decisión de código, no de juego.
- **La regla de §1 «fuente de letalidad: las encrucijadas, no el mundo».**

---

## 4. El plan, en fases que se juegan y se juzgan solas

Cada fase cierra con **una secuencia de capturas** para el dueño y una medida.
Orden de menor a mayor riesgo, y cada una se puede parar sola.

### M-1 · El mundo contesta a lo que hay (motor)

**No** es «el mundo mata solo». Es que tres sucesos de R-1 pasan a escalar con
lo que la aldea tiene: lobos con el ganado, riada con el bosque talado, robo y
señor con el granero lleno. Y se quitan las dos puertas del rayo de R-1 §2.6
**sin que un rayo pueda acabar con una aldea**: destruye una casa, no una
partida — el dueño lo ha dicho con todas las letras.

La regla de §1 «letalidad sólo por encrucijadas» se reescribe como **«letalidad
sólo por acumulación de lo que el jugador metió»**: una aldea intocada no se
muere más que hoy, y la pareja fundadora no se queda a cero por el mundo.

**Medida:** con reposo y sin medios, las mismas 2 muertas de 16 que hoy (no
más). Con una combinación deliberadamente mala de medios —todo cerdos y nada
de empalizada, todo hacha y nada de campo— **entre 6 y 10 muertas de 16**, y
ninguna antes del año 10. Si mueren aldeas sin medios, el mundo mata solo y
está mal; si no muere ninguna con la peor combinación, no hay riesgo y está
igual de mal.

### M-2 · Tres medios, de punta a punta (motor + vida + interfaz)

El arado, la pareja de cerdos y el barril. Uno de economía, uno de animales,
uno de gente: tres sistemas distintos, para saber si el patrón vale en los
tres. Cada uno: un objeto en 3D, una entrada en la crónica, dos filas nuevas en
la tabla de sucesos (una buena, una mala), y una plantilla de encrucijada que
pasa a salir.

La interfaz es **una pantalla** —«el carro», lo que traes— en la misma hoja de
papel que las otras tres (VZ-2), con la cruz pequeña. Sin números.

**Medida, y es la que decide todo:** la misma semilla con tres combinaciones de
medios tiene que dar **tres aldeas que un tercero distinga** en población,
obras y crónica; y la distancia entre la mejor combinación y la peor tiene que
ser **≥ 20 puntos de población** (el umbral de §12.9 que hoy está en 5). Si
las tres dan la misma aldea, los medios son decorado y se para aquí.

### M-3 · Se ve lo que provoca (vida + render)

Los cerdos en el corral, el arado en el campo, la fiesta en la plaza; los lobos
que vienen a por los cerdos se ven venir. Es lo que hace que «lo que metí» y
«lo que pasó» se liguen por los ojos y no por la crónica.

**Medida:** secuencia de capturas en tres momentos por medio, y el dueño dice
si se lee.

### M-4 · El resto del carro

Los otros medios de §3.3 y los que salgan. Las tres palancas se retiran de la
interfaz **en M-2**, el día que el carro ocupe su sitio: «no me gustan para
nada», y medido sólo hacen daño. Se remide el balance (`rework.md` §5 lo tenía para después; aquí
ya toca porque el motor ha cambiado dos veces).

### Lo que **no** entra

- Afinar el catálogo de encrucijadas (R-4: se quedan, no se afinan). Lo que M-2
  hace es que salgan las que no salían, sin tocar sus textos ni sus precios.
- Colocar edificios con el dedo. «Una parcela marcada» es lo más cerca que se
  llega, y es un medio más, no un modo de construcción.
- Cualquier cifra en pantalla. §11.1 sigue: el valle es el HUD.

---

## 5. Lo que esto no cambia de la premisa

Sigue siendo un idle bonito de mirar de fondo. El jugador puede no meter nada y
ver una aldea que sale adelante o se rompe sola (M-1). Lo que gana es que
cuando quiera intervenir, **tiene una cosa que dar en vez de un número que
mover**, y que dos valles con la misma semilla son dos valles distintos por lo
que cada uno les dio. Es la variedad entre aldeas —la esencia, según él— con el
jugador dentro.

---

## 6. La economía — la segunda parada del dueño, misma tarde

> «¿Podríamos cambiar también el sistema de economía? Comida y madera bien,
> están asociados a las rutinas de talar y cosechar. Pero no tenemos la piedra
> … y sería clave alguna moneda. Ahora mismo tenemos simplemente la felicidad,
> que creo que no varía nada, siempre está en 55, 50, 60. Más adelante
> proclamar un rey, decidir qué aldeano se hace rey, y que dependiendo de quién
> sea la aldea tire por un lado o por otro.»

Si el jugador paga los medios con lo del valle, la economía es la mesa sobre la
que se juega. Lo medido y lo que hay:

### 6.1 Lo que hay hoy, recurso a recurso

| Recurso | Cómo está | Qué le pasa |
|---|---|---|
| **Grano** | Existencia real, se cosecha y se come | Bien. Las rutinas de la vida lo cosechan y lo acarrean |
| **Leña** | Existencia real, se tala y se quema en invierno | Bien. Igual |
| **Piedra** | **No es un recurso**: se cobra como trabajo (`bpCost = bp + stone / STONE_PER_BP`) si hay fragua y roca (`works.ts`) | La capa de vida **ya anima la cantera y el acarreo** (`quarry:`, `deliver-stone`) — el motor es el único que no la cuenta. Es el recurso más barato de añadir |
| **Moneda** | **No existe.** Lo más parecido: tres encrucijadas de comercio —el tratante, el salinero, el factor de grano— que cambian grano por leña o por ganado, y la visita del buhonero de R-1 (−15 leña, +30 grano) | El trueque ya está; lo que falta es el saldo |
| **Ánimo** | 0–100, deriva al 50 al 2 % por semana; lo mueven la cosecha (±25 una vez al año), las muertes (−1,5), el hambre (−4 × severidad), el hacinamiento | Ver 6.2 |
| **Fe** | 0–100, deriva al 40; capilla, cura, muertes sin explicar | Casi siempre entre 25 y 50; sólo la iglesia la sube |
| **Ganado** | Gallinas, cerdos, vacas | Existe y tiene mecánica (v2.87–2.94) |

### 6.2 El ánimo: no está clavado, está en otro reloj

Medido en el motor, doce semillas:

| | Mínimo | Mediana | Máximo | Semanas por debajo de 10 |
|---|---|---|---|---|
| Sesenta años | 6 | 13 a 48 según la semilla | 55 a 79 | **17 %** |
| Diez primeros años | 6 | 9 a 49 según la semilla | 55 a 72 | **27 %** (cinco semillas de doce, media década en el pozo) |

Así que el número **sí** se mueve, y mucho. Lo que el dueño ve —«siempre 55,
50, 60»— es un problema de **reloj**: lo único que lo cambia de golpe es la
cosecha, una vez al año; el resto es una deriva del 2 % semanal hacia 50. A ×1
una semana son catorce minutos: en una hora de juego se ven cuatro semanas y el
ánimo no ha tenido motivo para moverse. Se mira a escala de semanas un número
que vive a escala de años.

Y cuando se mueve, se mueve mal: una aldea que cae a 6–10 se queda ahí años,
porque nada de lo que el jugador tiene lo levanta (la capilla suma 0,15 por
semana). Es la muerte lenta y sin gracia de §4, en versión ánimo.

**Lo que cambia con los medios:** el barril, la boda, la fiesta, el cerdo en
invierno son movimientos de ánimo **de esta semana**, en la mano del jugador. El
ánimo pasa a tener el reloj del jugador. No hace falta tocar su fórmula: hace
falta que haya cosas que lo muevan a la cadencia de §3.5.

### 6.3 La propuesta: cuatro existencias, dos estados, y el ganado

| | Qué es | De dónde sale | En qué se gasta | Quién lo mueve en la vida |
|---|---|---|---|---|
| **Grano** | Como hoy | Cosecha, pesca, caza, el buhonero | Comer, el ganado, **los medios** | Ya |
| **Leña** | Como hoy | Tala | Invierno, obra, **los medios** | Ya |
| **Piedra** | **Existencia nueva.** Se cantea con manos, hace falta roca y fragua (como hoy) | La cantera | Muralla, casas de piedra, iglesia, atalaya; **los medios** que la pidan | **Ya** (cantera y acarreo animados) |
| **Plata** | **Existencia nueva.** Lo único que viene de **fuera** del valle | Vender excedente al factor, al tratante, al buhonero; lo que trae un forastero | Lo que el valle no puede hacer: el arado, la sal, la reliquia, el forastero con oficio. Y lo que **se lleva el señor** (diezmo) | Nadie: es un cofre. Se ve en la crónica y en lo que se compra |
| Ánimo, fe | Como hoy | Como hoy, **más los medios** a ritmo semanal | — | — |
| Ganado | Como hoy | Nace, se compra al tratante, **se da como medio** | Se come, se vende | Ya |

**Por qué la plata y no otra cosa.** Es el recurso que hace que el camino
importe: llega con quien pasa y se va con quien cobra. Convierte las tres
encrucijadas de comercio y el buhonero en **visitas recurrentes** (sucesos de
R-1 con un cambio dentro: «el factor ofrece tanto por tu grano», y el jugador
decide o no) — que es ritmo, lo que el dueño pide. Y da al rey, cuando llegue,
una tesorería.

**Por qué la piedra es un recurso y no trabajo.** Porque el dueño quiere verla,
y verla es tener existencia: una pila en la cantera, un acarreo, un número que
baja al levantar la muralla. La vida ya lo hace; el motor sólo tiene que contar
lo que la vida enseña.

**Lo que no se añade:** hierro, armas, tela. Cuatro existencias son las que
caben en la cabecera y en la cabeza. Si el rey herrero «hace armas», las armas
son un rasgo de valle y no un quinto montón.

### 6.4 El rey, más adelante, y por qué encaja

«Decidir qué aldeano se hace rey, y que dependiendo de quién sea la aldea tire
por un lado o por otro.» Es **el principio de §3.1 aplicado a una persona**: no
dices qué hacer; dices quién. Su oficio y sus rasgos deciden lo que la aldea
prefiere —la familia de obra que se adelanta, los pesos de los sucesos, a quién
se vende y a quién no—, que es exactamente el hueco que dejan las palancas
retiradas, pero en forma de alguien con cara, con memoria y con enemigos. Es
una fase después de M-4 y no se detalla aquí; lo que sí se decide ahora es que
**nada de M-0 a M-4 lo impida**: la tesorería (plata), los rasgos del valle que
un medio añade, y el `who` de los sucesos son sus piezas.

### 6.5 Lo que esto añade al plan de §4

**M-0 · La mesa: piedra y plata (motor + interfaz)**, antes de M-1. Es la única
fase que se pone delante, porque los medios se pagan con ella.

- `VillageStats` gana `stone` y `silver` (`SCHEMA_VERSION` nuevo, y una partida
  vieja entra con cero). La piedra deja de cobrarse como trabajo: se cantea con
  las manos que ya la cantean en la vida y se gasta al levantar.
- Las tres encrucijadas de comercio y el buhonero pasan a **visitas** de la
  tabla de R-1 con un cambio dentro, y dejan plata o se la llevan. El diezmo se
  cobra en plata.
- La cabecera enseña cinco cosas y no cuatro: gente, grano, leña, piedra,
  plata. El ánimo deja de ser cifra y pasa a ser **cara** —§11.1 lo prefería
  así desde el principio, y medido, la cifra engaña—.

**Medida:** en sesenta años con reposo, la piedra llega en los mismos años que
hoy (42 a 45, `handover.md` §2.1) y la plata **entra y sale** al menos una vez
por década; ninguna aldea muere por añadir la mesa (las mismas 2 de 16).

**Y las respuestas a lo que preguntó:** la piedra no se pide: la aldea la cantea
cuando tiene fragua, roca y algo que levantar con ella, como hoy, y pasa a
verse en el montón; el paso a piedra es el que ya existe (`first_stone`, A.16).
La moneda es la plata de 6.3. Y el ánimo no hay que arreglarlo: hay que darle
cosas que lo muevan cada semana, y una cara en vez de un número.

---

## 7. Las decisiones del dueño (17 sep 2026, por la tarde)

Las cuatro preguntas que había aquí, contestadas con sus palabras, y lo que
cambian:

| Pregunta | Decisión | Dónde manda |
|---|---|---|
| ¿Cuesta o es gratis y raro? | **Cuesta lo del valle.** «No quiero que sea gratis. Esperar un año se hace muy muy lento; cada semana, cada mes, cada tres meses que pasen cosas» | §3.5: sin contador, el límite es el granero; ritmo de algo cada dos o tres semanas |
| ¿Se coloca con el dedo? | **No.** «En este juego no se coloca nada; todo se decide y el mapa interactúa solo» | §3.3: la parcela marcada se cae; todo se da |
| ¿Se retiran las palancas? | **Sí.** «No me gustan para nada» | M-2, el día que entra el carro |
| ¿Cuánto mata el mundo solo? | **Sin motivo, nada.** «Que caiga un rayo en una casa y eso ya se muera no tiene gracia. Se puede morir, pero más adelante, porque hemos tomado varias decisiones que hacen que se tumbe. De primeras la aldea no tiene por qué morirse» | M-1 reescrito: la letalidad escala con lo que se metió; una aldea intocada muere como hoy; la pareja no se queda a cero por el mundo |

**Lo siguiente:** convertir M-0, M-1 y M-2 en briefs de `docs/rework.md` §4 con
ficheros, contrato y medida, y empezar por M-0, que es motor puro y se mide con
el mismo script de §1.
