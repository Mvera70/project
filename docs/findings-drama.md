# Dos sistemas del motor que no se disparan nunca

**Medido:** 13 sep 2026, sobre `main` con el motor tal cual está.
**Quién lo encontró:** el trabajo gráfico de §11.1.1, buscando de dónde sacar la
burbuja de «enfadado» que el dueño del diseño pidió.
**De quién es esto:** del motor, no del render. Aquí no se toca nada; se mide y
se deja escrito.

---

## 1. Los rencores no se forman jamás

`§6.4` define el rencor: la opinión entre dos personas cae por debajo de −50 y
queda registrado con la semana en que se formó. M-39 construyó encima toda la
maquinaria de las riñas: dos que se detestan tienen un mal día, se gritan, la
aldea se entera, y el catálogo pesa más una plantilla de rencilla.

**Nunca pasa.** Medido en tres partidas de cuarenta años, semillas 7, 11 y 23,
con la política `prudent`:

| | semilla 7 | semilla 11 | semilla 23 |
|---|---|---|---|
| Rencores formados | **0** | **0** | **0** |
| Riñas en la crónica | **0** | **0** | **0** |

La cadena es ésta: las opiniones sólo se mueven con los efectos `opinion` de las
encrucijadas y con las propias riñas. Si las encrucijadas que los reparten no
salen, ninguna opinión llega a −50; si ninguna llega a −50, no hay rencor; sin
rencor no hay riña, y sin riña no hay nada que empuje una opinión hacia abajo.
**Es un ciclo que necesita un empujón inicial que nadie da.**

Y arrastra a lo que depende de ello: `smith_feud` y `granary_theft` exigen
`grudge:min 45` en sus requisitos, así que tampoco salen nunca.

## 2. Media docena de encrucijadas al siglo, y medio catálogo muerto

Lo mismo, medido sobre cinco partidas de cuarenta años:

| Semilla | Decisiones en 40 años | Gente al final |
|---|---|---|
| 7 | 9 | 43 |
| 11 | 12 | 72 |
| 23 | 10 | 52 |
| 41 | 7 | 80 |
| 97 | 10 | 72 |

**Entre siete y doce decisiones en cuarenta años**: una cada cuatro o cinco años.
Y de las veinte plantillas del catálogo, **diez no salieron ni una vez en las
cinco partidas**:

`tithe_demand`, `hungry_spring`, `granary_theft`, `plague_blame`, `smith_feud`,
`feud_inherited`, `relic_pedlar`, `wolf_winter`, `first_stone`, `quiet_years`.

## Por qué esto importa para lo que se está haciendo ahora

La ronda gráfica lleva meses haciendo que el valle se vea vivo: la gente anda
por donde debe, se para a hablar, el sol cruza, nieva en los tejados. Y la queja
del jugador sigue siendo **«no parece que haya nada de reacción, es muy
aburrida»**.

Una parte de eso era de dibujo y está arreglada. La otra parte no lo es: el
juego es *tomar decisiones con consecuencias*, y el jugador toma una decisión
cada cuatro años sobre la mitad de un catálogo. Ninguna cantidad de arte tapa
eso.

## 3. Y la suite de balance ya estaba en rojo

**Medido:** 13 sep 2026, dos pasadas completas de `npm run test:balance` —60
semillas por politica, 200 anos cada una, unos 18 minutos por pasada— una con
el motor tal cual y otra con la calle de §7.2 puesta. **Fallan las mismas diez
pruebas en las dos.** La calle no las rompio: ya estaban rotas.

| Prueba de §12.9 | Lo que pide | Sin calle | Con calle |
|---|---|---|---|
| Extincion jugando `prudent` | 2 % – 12 % | **1,7 %** | 1,7 % |
| Extincion jugando `worst` | >= 25 % | **13,3 %** | 11,7 % |
| Distancia entre las dos | >= 20 puntos | **11,7** | 10,0 |
| Cadencia media `worst` | <= 5 | **5,08** | 5,04 |
| Peor cadencia `last` | <= 7 | **7,59** | 7,59 |
| `smith_feud` elegible | < 1 % | **3,9 %** | 3,7 % |
| `feud_inherited` elegible en `worst` | < 1 % | **1,09 %** | 1,00 % |
| La pasada entera | < 15 min | **17,9 min** | 19,5 min |

Lo que dicen juntas es una sola cosa, y es la misma del apartado 2: **jugar mal
y jugar bien se parecen demasiado.** El diseno pide que una politica adversa
mate una de cada cuatro aldeas y mata una de cada ocho; pide veinte puntos de
diferencia entre la prudente y la mala y hay once. Un juego cuyo asunto es
tomar decisiones con consecuencias tiene aqui la medida de sus consecuencias, y
sale corta.

Las dos de elegibilidad son de otro orden: `smith_feud` y `feud_inherited`
**pueden salir** el 4 % de las semanas —cuatro veces el techo— y aun asi no
salen nunca, porque lo que les falta es el rencor del apartado 1. Una plantilla
elegible que no se elige es peso muerto en el reparto del catalogo.

**Lo que la calle mueve, dicho aparte para que nadie lo confunda:** todo lo de
la columna derecha se mueve entre una y dos decimas en la misma direccion —la
aldea ocupa mas suelo, se llena antes y pasa antes a la piedra, o sea algo mas
facil—, menos el tiempo de la pasada, que sube un 9 %. Ninguna de las diez
cambia de lado por ella.

## Lo que habría que mirar, sin decidirlo aquí

1. **El ritmo.** `CROSSROADS.MIN_TICKS_BETWEEN` son 120 semanas —dos años y
   medio— y `GUARANTEE_TICKS` 960, veinte años. Si el ritmo pretendido es ése,
   está bien y el problema es otro; si no, es un número.
2. **Los requisitos que nadie cumple.** Diez plantillas no salen: hay que ver
   cuál de sus condiciones es la que nunca se da. Un test que corra N partidas y
   liste las plantillas nunca vistas convertiría esto en una regresión vigilada
   en vez de un hallazgo de una tarde.
3. **La distancia entre jugar bien y jugar mal.** Es la medida del apartado 3 y
   es la que decide si el juego es un juego. Tocarla es balance mayor.
4. **El empujón que falta a las opiniones.** Sin una vía por la que dos vecinos
   se caigan mal sin haber pasado antes por una encrucijada, §6.4 y M-39 son
   código que no se ejecuta.

**Dicho para que conste:** nada de esto es una propuesta de cambio de balance.
Es una medida. Cambiar cualquiera de los tres números de arriba mueve el
equilibrio del juego y toca correr la suite de balance entera.

---

## 4. La contradicción que hay debajo (14 sep 2026)

Al arreglar el apartado 1 —la convivencia ya puede agriarse, y los rencores se
forman— apareció la razón de fondo por la que no se formaban. **No era un
número mal puesto: son dos requisitos del diseño que no caben juntos.**

La aritmética, que no depende de ninguna semilla:

| | |
|---|---|
| Un rencor se abre al cruzar −50 y sana al subir de −20 | 30 puntos |
| La deriva de §6.4 los recorre a 0,05 por semana | **600 semanas = 12,5 años** |
| Una partida de la suite de balance | 200 años = 9 600 ticks |
| Fracción de la partida con **un solo** rencor abierto | **6,25 %** |
| Lo que la prueba de §12.9 permite por plantilla | **1 %** |

Para caber en ese 1 %, un rencor tendría que durar **menos de dos años**. Con la
deriva de §6.4 dura doce y medio. De modo que la única manera de pasar la prueba
de elegibilidad es que los rencores **casi nunca se formen**, que es exactamente
el estado en que estaba el juego y exactamente la queja del jugador.

El motor no está roto: **está cumpliendo la especificación al pie de la letra, y
la especificación pide dos cosas incompatibles.** Que haya feudos, y que los
feudos sean raros. Con las opiniones modeladas como un número que deriva
despacio hacia cero, un feudo no es un episodio: es un estado que dura
décadas, y un estado que dura décadas satura cualquier techo de elegibilidad.

**Lo que esto descarta:** seguir moviendo `NEIGHBOUR.FRICTION` hasta que salga.
Está medido que con roce fuerte (−0,18) salen veintitrés rencores por partida y
el valle es una taberna; con roce flojo (−0,09) seis de cada diez partidas
vuelven a cero. Y en los dos casos, en cuanto uno cruza, las riñas lo hunden a
−100 y ya no vuelve, porque la riña resta entre 8 y 20 de golpe y la deriva
devuelve 2,4 al año. **El sistema no tiene zona intermedia**: o no pasa nada, o
pasa para siempre.

**Lo que habría que decidir, y no se decide aquí:**

1. **O los rencores se curan mucho más rápido** —la deriva de §6.4 sube, o hay
   una reconciliación explícita— y entonces son episodios y caben en el 1 %.
2. **O la prueba de elegibilidad deja de medir «ticks en que la plantilla podría
   salir»** y pasa a medir lo que de verdad quería evitar, que es que una
   plantilla domine el reparto: cuántas veces sale, no cuántas podría salir.

La segunda es probablemente la correcta, porque la prueba existe para vigilar la
variedad del catálogo y hoy castiga algo distinto: que el mundo tenga estados
duraderos. Pero es §12.9 y la toca el dueño del diseño.

---

## 5. Lo que pasó al dar cerebro a todos (14 sep 2026, v3.61)

Pasada completa de `npm run test:balance` con el carácter repartido a los
ochenta vecinos y los cuatro rasgos muertos decidiendo. **Doce pruebas en rojo
contra las diez de la línea base**, y el detalle importa más que la cuenta:

| Prueba de §12.9 | Pide | Base | v3.61 | |
|---|---|---|---|---|
| Extinción jugando `prudent` | 2 % – 12 % | 1,7 % | **6,67 %** | ✅ arreglada |
| Extinción jugando `worst` | ≥ 25 % | 11,7 % | 11,7 % | = |
| Distancia entre las dos | ≥ 20 pts | 10,0 | **5,0** | ✗ peor |
| `smith_feud` elegible | < 1 % | 1,56 % | **5,30 %** | ✗ mucho peor |
| `quiet_years` sale alguna vez | sí | sí | **nunca** | ✗ nuevo |

**Lo que se arregló de verdad:** la extinción jugando bien estaba *por debajo*
del suelo del diseño —una aldea prudente casi no moría— y ahora cae dentro de la
banda. El valle es más duro, y lo es porque la gente tiene carácter: el cobarde
se marcha cuando debe, el hambre enemista, y una aldea rota por dentro aguanta
menos.

**Lo que empeoró, y por qué era previsible.** La distancia entre jugar bien y
jugar mal se ha reducido a la mitad, pero no porque jugar mal salga más barato:
`worst` está clavada en 11,7 %. Es que **jugar bien salió más caro**. El carácter
castiga a las dos políticas por igual, y esta prueba no mide dureza: mide
*discriminación*. Subir el suelo sin subir el techo la acerca.

Y `smith_feud` al 5,3 % es exactamente la contradicción del apartado 4, ahora
medida en vez de deducida: había un 1,56 % de elegibilidad **sin que existiera un
solo rencor** —le llegaba por el flag `feud_ripe`—, y en cuanto los rencores
existen se triplica. Un rencor abierto dura doce años y medio; un techo del 1 %
sobre una partida de doscientos años no cabe con eso de ninguna manera.

`quiet_years` es la cara amable del mismo hecho: es la reserva que sale cuando
no hay nada más elegible, y ya nunca hace falta.

## 6. Y por tanto

El cerebro está bien y el balance está peor. Las dos cosas son ciertas y no se
arreglan la una a la otra, porque **lo que falla no es el coeficiente sino dos
pruebas que miden lo que ya no es**:

1. **La de elegibilidad** castiga que el mundo tenga estados duraderos, cuando lo
   que quería vigilar es que una plantilla no domine el reparto. Medir cuántas
   veces **sale** en lugar de cuántas **podría salir** la devolvería a su
   propósito sin tocar el motor.
2. **La de distancia** pide veinte puntos entre políticas y hoy hay cinco. Eso no
   se arregla con carácter, porque el carácter no sabe si el jugador está
   jugando bien: hace falta que **las decisiones malas cuesten más**, que es
   balance del catálogo y de §12.

Mover `NEIGHBOUR.FRICTION` o `CHARACTER.AMBITIOUS_PASSED_OVER` hacia abajo
devolvería los números viejos y con ellos el valle sin rencores del apartado 1.
No es un cambio pendiente: es la decisión de qué se quiere, y la toma el dueño
del diseño.

## 7. Por qué medio catálogo no sale, plantilla a plantilla (14 sep 2026)

§2 midió que el jugador decide poco y que medio catálogo está muerto. Lo que
faltaba era **por qué**, y «no sale» son tres cosas distintas que se arreglan de
maneras distintas. `tools/eligibility-report.ts` las separa: recorre la partida
tick a tick y, para cada plantilla, cuenta en cuántos cumple sus condiciones, en
cuántos llega a ofrecerse, cuántas veces se plantea de verdad, y **qué condición
concreta la bloquea** cuando falla.

Medido en cuatro semillas × sesenta años (11 520 ticks), política `prudent`:

**El ritmo: 19,3 encrucijadas por partida de sesenta años — 3,2 por década.**
Coincide con lo que §2 midió a cuarenta años (siete a doce): el ritmo no ha
cambiado, sólo está ahora medido con más semillas.

**Siete de veinte plantillas no salen ni una vez.** Y de las que salen, dos se
llevan la mitad de todas las decisiones de la partida: `succession` 22 veces y
`forest_cut` 16, de 77 en total. La aldea no tiene medio catálogo: tiene dos
plantillas que se repiten y un puñado de invitadas.

### Tres hallazgos que no son «pocas veces», son fallos

**1. `wolf_winter` es imposible por construcción.** Exige `forestLeft > 0.25`.
Medido en tres semillas × sesenta años, `forestLeft` va de 0,177 a **0,244**: no
llega al umbral **nunca, en ninguna partida**. La causa es que `forestLeft` es
*bosque sobre el mapa entero* y la condición está escrita como si fuera *lo que
queda del bosque original*; el valle nace con un 24 % de bosque, así que el
umbral está por encima del máximo posible. No es una plantilla rara: es una
plantilla muerta, y lleva así desde que se escribió.

**2. `tithe_demand` NO cuelga de una cadena rota — esto estaba mal escrito.**
La primera versión de esta sección decía que la bandera `vassal` no la pone
nada. Es falso, y lo encontró quien fue a arreglarlo: la opción `kneel` de
`winter_grain_debt` la pone (`catalog/lord.ts`), y se comprobó disparando esa
opción a mano — `state.flags.vassal` queda puesta y permanente.

Lo que pasa es otra cosa: `winter_grain_debt` es elegible el **0,2 %** de los
ticks (pide `grainToHarvest < 0.9` en pleno invierno) y sólo una de sus tres
opciones se arrodilla. La cadena existe y funciona; lo que casi nunca ocurre es
el primer eslabón. No es un fallo, es el mismo problema de ritmo del resto.

**La lección del error, que vale más que el dato:** la sonda mide que una
condición no se cumple nunca, y de ahí no se sigue que el mecanismo esté roto.
«Nadie pone esta bandera» y «nadie llega a la encrucijada que la pone» se ven
igual desde fuera y se arreglan de maneras opuestas. Antes de llamar rota a una
cadena, hay que abrir el código que debería recorrerla.

**3. `quiet_years`, que es el `FALLBACK_ID`, no se plantea ni una vez.** El
recurso para cuando no hay nada que contar no llega a usarse: exige
`grainYears > 1`, que falla el 44 % de los ticks, y compite como una más.

### Y un patrón que explica el resto

Casi todas las plantillas llevan una condición de estación, que por sí sola
cuesta el **75 % de los ticks**, sumada a otra condición rara. Las dos se
multiplican: `strangers_at_the_ford` cumple todo el 3,18 % del tiempo,
`first_stone` el 6,49 %, `bandits` el 0,02 %. No hace falta que ninguna sea
imposible para que el catálogo se quede en dos plantillas repitiéndose.

### Qué decidir, y no se decide aquí

- **Sólo había un fallo, no dos**, y arreglarlo no es gratis. `wolf_winter` sí
  es imposible y el umbral hay que bajarlo (a 0,15, que es exactamente la misma
  errata que `forest_cut` tuvo con su 0,3 y se corrigió así en v2.47). Pero
  hacerlo elegible mete veintiuna encrucijadas nuevas en la ventana medida, y
  **eso cambia la trayectoria de cada partida**: otras decisiones, otra
  población, otro valle. Medido: trece pruebas calibradas sobre semillas
  concretas pasan a fallar — no por ruido, comprobado con y sin el cambio en los
  mismos ficheros seguidos.

  Así que el arreglo es correcto y **cuesta una ronda de recalibrado**, no un
  commit. Está hecho y esperando en la rama `worktree-agent-afdfba3b92d4bb7ee`.
  Es lo primero que hay que retomar, y confirma con número lo que la decisión de
  ritmo ya avisaba: tocar la elegibilidad mueve el balance entero.
- Lo otro es la pregunta de `docs/roadmap.md` §1: **¿cada cuánto quiere el juego
  que decidas?** Hoy son tres veces por década y dos de cada cuatro son la misma
  plantilla. Relajar las estaciones, bajar umbrales o añadir plantillas ligeras
  que salgan a menudo son tres respuestas distintas con consecuencias distintas
  sobre el balance, y las decide el dueño del diseño con esta tabla delante.

Para repetir la medida: `npx tsx tools/eligibility-report.ts 7 11 23 --years 60`.
