# El reloj: qué cuesta afinar el tick, y qué no arregla

> **CERRADO · entregado el 15 sep 2026 (v3.72).** El reloj con horas y la
> jornada de sol de 120 s. **Y su advertencia se cumplió**: al multiplicar la
> semana por 56 nadie remidió el §12, y tres días después B-1 encontró cuatro
> constantes que decían una cosa y significaban otra. Esa lección vive ahora
> en `CLAUDE.md` y en §12.1: un umbral que decide *cuándo* pasa algo se mira
> en horas de reloj, con `tools/pace-report.ts`.

**Medido:** 14 sep 2026, sobre `main` con el estado escénico (v3.59) ya puesto.
**Qué es esto:** el brief del cambio que el dueño del diseño pidió —«me gustaría
muchísimas más iteraciones»— con el coste medido, no estimado. No es una
propuesta cerrada: es lo que hay que saber antes de decidir.

---

## 0. Lo primero, porque cambia la decisión

El dueño del diseño dijo dos cosas en la misma frase: que le falta **que pasen
más cosas**, y que quiere **afinar el tick**. Hay que decir claro que la segunda
no da la primera.

Afinar el tick a día, con las tasas divididas para conservar el calendario, da
**exactamente el mismo juego, más suave**. Ni una decisión más. `MIN_TICKS_BETWEEN`
pasa de 120 semanas a 840 días: los mismos dos años y medio. Las diez plantillas
que no salen nunca (`findings-drama.md` §2) siguen sin salir, porque lo que les
falta no es oportunidad, es que se cumplan sus requisitos.

**Lo que sí justifica hacerlo ahora es que los dos trabajos comparten el gasto
caro.** Recalibrar el tick obliga a correr la suite de balance entera; arreglar
la cadencia y los rencores obliga a lo mismo. Por separado se pagan dos veces
dieciocho minutos por pasada y dos veces el riesgo de recalibrado. Van juntos o
no compensan.

---

## 1. Lo que ya está hecho, y lo que dejó pendiente

El **estado de la jornada** (§D.6.7) está puesto y verificado: 1 009 pruebas en
verde, `typecheck` y `lint` limpios. Elimina la clase entera de fallo «me olvidé
de congelar» y borra el ritual duplicado que `fauna` llevaba dentro.

Lo que **no** arregla, y hay que repetirlo porque es contraintuitivo: el desfase
sigue ahí. La jornada sigue durando ocho semanas a ×1; lo único que cambia es
que ya no se ve cambiar.

---

## 2. El desfase no se arregla afinando el tick

| | a ×1 | a ×4 | a ×16 | a ×64 |
|---|---|---|---|---|
| Pasos por jornada visible, **hoy** (tick = semana) | 8 | 16 | 32 | 64 |
| Pasos por jornada visible, **con tick = día** | 56 | 112 | 224 | 448 |

La jornada escénica corre a **√velocidad** y el mundo a la **velocidad entera**
(D.6.1). La razón entre los dos no es constante: crece con el botón. Hacer el
paso siete veces más fino multiplica por siete el número de pasos por jornada.

Lo que sí mejora es la **magnitud** de cada salto: siete veces menor. Con el
estado de la jornada puesto, eso ya no se ve de todos modos, así que el
argumento visual para afinar el tick **se ha quedado sin objeto**. Si se afina,
que sea por razones de simulación, no de dibujo.

---

## 3. El coste, medido constante a constante

### 3.1 Lo que se arregla solo

El motor ya usa `TIME.WEEKS_PER_YEAR` como «pasos por año» en **20 sitios**, y
varias tasas están declaradas **anuales** y divididas en el punto de uso:
`PEOPLE.MORTALITY`, `DISASTER.PLAGUE_BASE`, `DISASTER.FIRE_CHANCE`, la murrina.

Renombrar la constante a `TICKS_PER_YEAR` y ponerla en 336 arregla esos veinte
sitios sin tocarlos. **Es la mitad buena de la noticia.**

### 3.2 Lo que hay que dividir a mano — 15 tasas

Declaradas por semana, sin conversión de por medio:

| Constante | Hoy | Qué es |
|---|---|---|
| `FOOD.SPOILAGE` | 0,08 | merma semanal del excedente |
| `FOOD.STARVATION_RATE` | 0,025 | muertes por semana |
| `LABOUR.WOOD_PER_CUTTER` | 3,0 | leña por leñador y semana |
| `LABOUR.BP_PER_BUILDER` | 2,0 | puntos de obra por semana |
| `PEOPLE.BIRTH_BASE` | 0,0038 | por mujer fértil y semana |
| `MIGRATION.ARRIVE_CHANCE` | 0,3 | llegada |
| `ANIMALS.WOLF_RAID_CHANCE` | 0,08 | lobos |
| `WELL.BASE` | 0,010 | enfermedad del agua |
| `MURRAIN.BITE_PER_WEEK` | 0,024 | mordida de la murrina |
| `MOOD.MORALE_DRIFT` | 0,02 | deriva del ánimo |
| `MOOD.FAITH_DRIFT` | 0,01 | deriva de la fe |
| `QUARREL.WEEKLY` | 0,022 | riña |
| `RANCOUR.PER_WEEK` | 0,12 | rencor |
| `OPINION.DRIFT_PER_WEEK` | 0,05 | deriva de la opinión |
| `PATHS.TRAFFIC_DECAY` | 0,005 | desgaste del camino |

**Y no se dividen entre siete.** Las que son probabilidades se componen, no se
suman: la tasa diaria que da la misma probabilidad semanal es
`1 − (1 − p)^(1/7)`, no `p/7`. Para las pequeñas la diferencia es del 3–4 % y se
podría discutir; para `ARRIVE_CHANCE`, que es 0,3, la diferencia entre hacerlo
bien y hacerlo a ojo es del **17 %**. Las que son caudales —leña, puntos de
obra— sí se dividen entre siete, porque son cantidades y no sucesos.

Mezclar los dos casos es la forma más fácil de desbalancear esto sin enterarse.

### 3.3 Lo que hay que multiplicar — los plazos

`WEEKS_PER_SEASON` (12), `HARVEST_WEEK` (35), `PLAGUE_WEEKS` ([6,10]),
`CROW_WEEKS_BEFORE_HARVEST` (6), `FIRE.DOUSE_TICKS` (8),
`QUARREL.COOLING_TICKS` (24) y `REPEAT_TICKS` (96), `CROSSROADS.MIN_TICKS_BETWEEN`
(120) y `GUARANTEE_TICKS` (960).

Son multiplicaciones por siete y no tienen misterio, salvo `HARVEST_WEEK`, que
pasa a ser **un día concreto del año** (el 245) y con ello la siega deja de
durar una semana entera: hay que decidir si la cosecha es un día o un tramo.

### 3.4 Lo que se rompe

- **Las partidas guardadas.** La migración es trivial —`tick × 7`— pero hay que
  escribirla y subir `SCHEMA_VERSION`.
- **La suite de balance.** Es lo caro: tarda 17,9 min por pasada y **ya falla
  diez pruebas antes de tocar nada** (`findings-drama.md` §3). Con el tick siete
  veces más fino pasaría de dos horas por pasada.
- **El coste de CPU de toda prueba que simule años.** La suite rápida tarda hoy
  33 s con 1 009 pruebas; buena parte de ese tiempo es simulación.

---

## 4. El orden que recomiendo

**Recalibrar sobre una base rota es el peor momento posible.** Si se afina el
tick con diez pruebas ya en rojo, no habrá forma de saber si un número nuevo
mejoró o empeoró: la referencia no existe.

1. **Arreglar las diez de `findings-drama` §3 primero**, con el tick como está.
   Son las que miden si jugar bien y jugar mal se distinguen, que es el asunto
   del juego. Y ahí está *también* lo que el dueño del diseño pidió de verdad:
   más cosas que pasen. Empujón inicial a las opiniones (§6.4 y M-39 son código
   que hoy no se ejecuta), cadencia de encrucijadas, y las diez plantillas que
   no salen.
2. **Con la suite en verde, afinar el tick.** Entonces sí hay referencia: si una
   prueba se cae, la tiró el cambio de paso.
3. **Una prueba nueva que vigile lo que hoy se descubrió a mano:** correr N
   partidas y listar las plantillas nunca vistas. Convierte un hallazgo de una
   tarde en una regresión vigilada.

Si el orden se invierte, el paso 1 habrá que hacerlo igual, pero a ciegas y con
pasadas de dos horas.

---

## 5. Lo que no se decide aquí

Nada de esto es un cambio aprobado. Es la medida de lo que cuesta y del orden
en que duele menos. Los tres números del §4 del `findings-drama` —el ritmo, la
distancia entre políticas, el empujón a las opiniones— son balance mayor y
mueven el juego entero.
