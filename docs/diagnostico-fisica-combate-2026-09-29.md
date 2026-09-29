# ¿Decide la física las batallas? Diagnóstico, primer experimento medido y lectura de la nota de Astra (29 sep 2026)

**Pregunta de Vera (29 sep 2026, al cerrar la ronda AN de animación):** «mi
objetivo a futuro es que las batallas tengan consecuencias físicas reales —que
impactos, bloqueos, empujes, caídas y proyectiles respondan a posiciones y
colisiones—. Me preocupa que tener Rapier para flechas y ragdolls dé apariencia
de física mientras el resultado siga dependiendo de distancias y
temporizadores.» Este documento es el diagnóstico honesto, leído del código de
la rama `ccr-48790acc-ibi65c` a esta fecha; el primer experimento, **hecho en
sombra y medido** (§3); y la lectura crítica de la nota de Astra
([`ideas-fisica-y-app-nativa-2026-09-29.md`](ideas-fisica-y-app-nativa-2026-09-29.md),
`24ef5e1`), con lo que comparto, lo que no y lo que mejoraría (§5). **No abre
ninguna reescritura del combate**: el experimento no cambia ni un resultado, y
eso está comprobado.

## 0 · En una página

- **La preocupación es correcta.** Rapier decide por dónde vuela una flecha,
  si una almena la para y cómo cae un cuerpo ya muerto. Todo lo que convierte
  un encuentro en un resultado —si una flecha alcanza, quién pega, cuándo
  cede el portón, quién cae— es una distancia y un reloj. Dicho corto:
  **Rapier sólo ve a los muertos**: los vivos no son colisionadores; los
  ragdolls sí, y una flecha puede rebotar en un caído.
- **El primer experimento está hecho** (F-0, §3): una cápsula de Rapier del
  tamaño del aldeano que se pinta, en sombra, al lado del cilindro que decide
  hoy. **Con el cuerpo que se pinta, entre un tercio y dos quintos de las
  bajas por flecha de hoy no lo serían** (31–40 % según la tanda, frente a un
  5–7 % que cambia sólo por el método), y cada caso se explica: flechas que se
  clavan en el suelo a medio metro o más de los pies y flechas que pasan a la
  altura del pecho a más de un metro del cuerpo. Y la flecha que acierta **sigue
  volando siete metros** tras el cuerpo. Las sondas no cambian la batalla
  (56 de 56 pasadas iguales, en veinte batallas) y cuestan aquí 0,05–0,09 ms
  por paso.
- **Se puede avanzar sin Godot ni Unity**, por pasos con vuelta atrás de una
  línea; el límite duro no es el motor gráfico sino que la capa que decide
  (la vida) no conoce la pose, y las armas viven en la pose (§2).
- **Lo que hay que medir en el aparato** es el coste, no el acuerdo: el ms
  del paso con las sondas, el peor fotograma y la memoria en la batalla
  representativa, en el iPhone y el iPad de Vera (§2).

## 1 · Qué decide Rapier hoy, y qué no

| Decisión | Quién la toma | Dónde |
|---|---|---|
| Trayectoria de la flecha: gravedad, arrastre, choque con suelo, muralla y almenas | **Rapier** (bola de 0,08, CCD) | `life/physics.ts`, `launch`, `addObstacles`, `addWallCollider` |
| A dónde se apunta | Cálculo analítico **sin arrastre**, adelantando al blanco, al pecho a 0,4 **de cota absoluta** (no sobre el suelo del blanco) | `life/archery.ts`, `aimAt`, `targetFor`, `CHEST` |
| Si la flecha **alcanza a alguien** | **Lógica**: el centro de la flecha a menos de 0,45 en planta y por debajo de 0,7 **de cota absoluta**, mirado al final de cada paso. El aldeano que se pinta mide 0,65 de alto y 0,10–0,17 de radio (medido sobre el GLB, §3); los vivos no son colisionadores | `life/archery.ts`, `stepArchery`, `HIT_REACH`, `BODY_TOP` |
| Qué hace un flechazo | **Regla**: una flecha tumba | `stepArchery`, `raider.phase = 'down'` |
| Qué pasa con la flecha que acierta | **Nada la para**: Rapier no sabe que ha dado y **sigue volando** hasta el suelo o un caído: una mediana de 7 m tras el cuerpo (§3) | `stepArchery` marca `spent`; `cast.ts`, `arrowsOf` la sigue pintando |
| Cadencia de tiro | Reloj: 63 pasos, la suma de `bow_draw` y `bow_loose` | `archery.ts`, `DRAW_STEPS` |
| Cuerpo a cuerpo: quién pega, cuándo y cuánto | **Lógica**: el más cercano a menos de 0,9 celdas, un golpe cada 15 pasos, cae a los 3 golpes; el arquero devuelve la mitad. Sin dados y sin física | `life/melee.ts`, `stepMelee`, `REACH`, `BLOW_STEPS`, `BLOWS_TO_FALL` |
| Golpe al portón y rotura | **Lógica**: un golpe por segundo a menos de 2,6 celdas; 60 golpes lo rompen | `life/raiders.ts`, `BLOW_STEPS`, `BLOW_REACH`, `GATE_BLOWS` |
| La hoja rota y las tablas | **Rapier**, cosmético (cascotes con tope y vida) | `physics.ts`, `debris` |
| Movimiento, choques y empujes entre cuerpos | **Integrador propio en rejilla**: círculos contra celdas bloqueadas y una separación blanda entre vecinos. No hay empuje físico | `life/body.ts`, `integrate`, `fitsCircle`; `separate` en `village.ts` |
| La caída | El hecho lo decide la regla; **Rapier pinta la caída**: un ragdoll de once segmentos sembrado desde la pose `fall` en t=0, **sin el impulso del golpe**. Tope 24; sin Rapier o por encima del tope, cae el clip `fall` | `life/ragdoll.ts`, `buildRagdoll`; `physics.articulate`; `world/cast.ts`, `captureRagdoll` |
| Flechas contra caídos y cascotes | **Rapier, de verdad**: los ragdolls (`RAGDOLL_COLLISION_GROUPS`) y los cascotes chocan con las flechas; los vivos no | `ragdoll.ts`; `physics.ts` |
| La caza | **Sin Rapier**: proyectiles propios con gravedad explícita y prueba de segmento contra círculo; lanza por distancia —en la toma del jabalí de 7/24 la lanzada que decide **llega a través de una empalizada**—; y una tirada de suerte decide rozar o fallar | `life/hunt-shot.ts`, `stepHuntShots`, `spearCanHit`; `life/hunt-encounter.ts`, `LUCK` |
| Las animaciones de combate | **Fechan los hechos, no los deciden**: el contacto está en t=0 del hecho (`since`) | `clips.ts`, `combatClip`, `clipTime`; `life/cast.ts` |
| El resultado para la partida | El parte de la capa de vida (`life.defence`) entra al motor como dato por `PlayerAct` `kind: 'battle'`; si nadie miró, decide la cuenta de B3. El parte sólo salva si adelgazó la partida | `engine/world/threat.ts`, `settle`; `engine/world/garrison.ts` |

**Lo que sí es físico en el resultado, y es poco:** una flecha que choca con
una almena no llega al cilindro, así que **cubrirse tras la muralla funciona de
verdad**; y el arrastre del aire hace que el apuntado analítico se quede corto
(la prueba de D2 lo mide: 0,07–0,32 celdas a 4–10 celdas). Ninguna otra parte
del resultado depende de una colisión.

**Y dos cosas que el diagnóstico encontró al medir**, que no son física pero
la afectan: el cilindro y el apuntado miden la altura **desde y=0 y no desde
el suelo del blanco**, así que en una ladera el cuerpo que se ve y la zona que
decide se separan (bajo el portón de las villas medidas el suelo está a cota
0 y no muerde; §3); y la flecha que acierta **sigue su vuelo**: se ve pasar a
través del cuerpo y clavarse detrás.

## 2 · ¿Se puede avanzar sin migrar a Godot o Unity?

**Sí, de forma gradual, y el cuello de botella no es el motor gráfico sino qué
decide la física.** La arquitectura ya tiene las piezas: un paso fijo
compartido (`world.timestep = LIFE_STEP`, 1/30 s, el mismo de la vida), la
frontera que deja entrar un resultado no determinista como dato (§1b,
`PlayerAct`), un banco donde medirlo (`?sandbox=battle` y
`tools/reports/battle-report.ts`), y desde F-0 las dos operaciones que
faltaban: **cuerpos vivos en el mundo de Rapier** (sondas cinemáticas) y
**consultas** (barrido de una bola contra ellas).

**Los límites reales, de más a menos duros:**

1. **La capa que decide no conoce la pose.** La vida mueve círculos a paso
   fijo; los huesos, el arma en la mano y la punta de la lanza los calcula el
   mezclador de three en el render (`world/cast.ts`). Una lanza con
   colisionador, un escudo que para o un golpe que toca el hombro piden la
   trayectoria del arma **como dato de la vida**: una tabla por clip —la punta
   en función del tiempo del clip, en el marco del cuerpo—, horneada de los
   mismos clips y vigilada por una prueba contra la pose pintada. Leer la pose
   del render desde `life/` rompería la regla de capas. **Es el trabajo más
   caro del camino, y no depende de Rapier.**
2. **Los vivos no estaban en Rapier.** F-0 lo resuelve para medir: una cápsula
   cinemática por asaltante en pie que **sigue** al cuerpo de la vida y que
   nada toca. La salida gradual es ésa: la vida sigue moviendo, Rapier informa
   de contactos.
3. **La animación es binaria: clip o ragdoll entero.** Un tambaleo, un empujón
   que no tumba o un escudo que para piden mezclar pose animada con física
   parcial (reacción procedural o *active ragdoll*), que no existe.
4. **Dos fuentes de verdad.** Si nadie mira, decide B3; si alguien mira,
   decide la escena. Cuanto más decida la física, más importa que mirar no
   cambie sistemáticamente las probabilidades (hoy lo acota la regla «el parte
   sólo salva si adelgazó la partida»).
5. **Determinismo.** `@dimforge/rapier3d-compat` 0.20 no promete el mismo
   resultado entre aparatos (la variante `-deterministic` sí). Hoy da igual
   —la batalla no es determinista por decisión (§1b)— pero las pruebas de
   combate tienen que ser estadísticas, sobre muchas batallas y semillas.
6. **Escala.** Una celda son tres metros y la gravedad va dividida por tres;
   masas, impulsos y fricciones hay que pasarlos con cuidado o los números
   «parecen» bien y se comportan raro.

**Qué hay que comprobar en el móvil** (SwiftShader no es un teléfono; todo lo
de aquí es de un portátil): con la batalla representativa —villa del año 60,
diez en el cerco contra veinticuatro— en el iPhone y el iPad de Vera, **la
línea de base primero**: fotogramas, peor fotograma, memoria y el ms del paso
de Rapier (`?sandbox=battle`, «Copiar métricas» en el pico de la pelea); si
una batalla larga calienta el aparato y baja los fotogramas a los dos o tres
minutos; la memoria y el tiempo de carga del WASM. Y después **lo mismo con
las sondas encendidas** (`&shadow=0.12`: la fila «Sondas F-0» del panel y el
bloque `probes` de «Copiar métricas»), que es lo que F-1 pediría pagar. Aquí
no se puede: en el Chromium sin GPU del contenedor el banco se pinta, con su
fila de sondas, pero va a 0 fps y la pelea no llega
(`artifacts/physics/F-0/banco/`).

**Qué obligaría a pensar en un motor nativo**, y hoy no se ha visto: que el
paso de Rapier en el teléfono no quepa en el presupuesto con los
colisionadores de una batalla real, o que la mezcla de animación y física
necesite herramientas que three.js no tiene. Las dos cosas se miden antes de
decidir.

## 3 · F-0: la flecha que toca, en sombra — hecho y medido

**Qué se hizo** (sin cambiar ningún resultado):

- `life/physics.ts`: `probes(lista, forma)` pone una cápsula cinemática por
  cuerpo **en un mundo de consulta aparte** —ninguna flecha, cascote ni
  ragdoll puede tocarla— y `sweep(desde, hasta, sólido?)` barre una bola del
  radio de la flecha y devuelve la primera cápsula que toca, dónde y a qué
  altura sobre los pies (o el muro o el suelo, si se pide lo sólido). La
  cápsula arranca en los pies con la semiesfera de abajo enterrada: un cuerpo
  tiene pies, no es un huevo.
- `life/archery.ts`: con una bitácora (`archeryShadow`), cada flecha barre el
  tramo que recorrió en el paso contra las cápsulas y apunta el primer
  contacto; cuando el cilindro acierta antes de que la flecha llegue al
  cuerpo, se mira una celda adelante en la dirección del vuelo (cuerpo, o
  antes muro o suelo). **El cilindro sigue decidiendo.**
- `life/village.ts`: la opción `shadow` coloca las sondas de los asaltantes
  en pie antes del paso de física. El juego no la pone nunca.
- `tools/reports/battle-report.ts --shadow r1,r2 --seeds … [--relief]`: corre
  cada batalla **sin** sombra y **con** cada radio, comprueba que el resultado
  es el mismo, e imprime la tabla de acuerdo y el coste.
- `tests/fast/physics-probes.test.ts`: la cápsula se ve a la altura justa y
  tiene pies; el muro de delante tapa al cuerpo de detrás; **una flecha vuela
  igual, al bit, con sondas que sin ellas**; y la arquería con bitácora da el
  mismo resultado, las mismas sueltas y el mismo vuelo que sin ella.

**El cuerpo que se pinta**, medido sobre el GLB publicado en reposo: 0,65 de
alto (1,95 m); radio del tronco 0,10–0,12 y 0,17 con los brazos (1 celda =
3 m); cadera a 0,287, arranque de la cabeza a 0,493. Se prueban tres radios:
**0,12** (el tronco), **0,17** (la silueta con brazos) y **0,37** (la
cápsula del tamaño del cilindro, 0,45 menos la flecha: el **control** que
separa lo que cambia por el método de lo que cambia por la forma).

**Cómo se midió.** `battle-report.ts --seeds 7,11,21,42,3,5,13,23 --shadow
0.12,0.17,0.37`: ocho villas del año 60, diez en el cerco con arco contra
veinticuatro; la misma tanda **con el relieve del juego** (`--relief`); y
cuatro villas con seis contra doce. Cada batalla, sin sombra y con cada radio.
Veinte batallas distintas, 56 pasadas con sondas. Las salidas están en
`artifacts/physics/F-0/`.

**La sombra no cambia nada: las 56 pasadas con sondas acaban igual que su
batalla sin ellas**, en flechas, aciertos, bajas de los dos lados y portón.
No fue así a la primera, y es una lección para lo que siga: con las sondas
**en el mismo mundo** de Rapier y los grupos de colisión a cero —sin poder
tocar nada— la semilla 42 acababa con uno o dos aciertos de más o de menos
(`shadow-flat-mismo-mundo.txt`). Añadir colisionadores cambia qué ranura
recibe cada flecha y cada ragdoll y el orden en que Rapier recorre los
contactos, y en una escena con muchos caídos eso basta para divergir. Las
sondas viven ahora en un mundo de consulta aparte. **Para F-1 quiere decir
que ninguna comparación con y sin contacto se puede hacer batalla a batalla:
sólo con distribuciones.**

| Tanda | Cápsula | Aciertos del cilindro | Aciertos de Rapier | Iguales | A otro | Sólo el cilindro (con suelo o muro delante) | Sólo Rapier | Cambian |
|---|---|---|---|---|---|---|---|---|
| 10 contra 24, llano (1070 flechas) | 0,12 · el tronco | 151 | 100 | 98 | 2 | 51 (47) | 0 | **53 · 35 % de los aciertos** |
| | 0,17 · con los brazos | 151 | 106 | 104 | 2 | 45 (42) | 0 | **47 · 31 %** |
| | 0,37 · control | 151 | 148 | 143 | 3 | 5 (4) | 2 | 10 · 7 % |
| 10 contra 24, con relieve (922 flechas) | 0,12 | 158 | 96 | 95 | 1 | 62 (58) | 0 | **63 · 40 %** |
| | 0,17 | 158 | 99 | 97 | 2 | 59 (56) | 0 | **61 · 39 %** |
| | 0,37 · control | 158 | 155 | 151 | 3 | 4 (4) | 1 | 8 · 5 % |
| 6 contra 12, llano (183 flechas) | 0,12 y 0,17 | 36 | 25 | 25 | 0 | 11 (10) | 0 | **11 · 31 %** |

Cuatro de cada cinco flechas no dan a nadie para ninguno de los dos jueces.

| Lo que más se ve | Medido (0,12; 1 celda = 3 m) |
|---|---|
| Dónde toca Rapier, sobre los pies | cabeza y hombros (≥ 0,49) **81** · tronco 17 · piernas 2 (con relieve, 72 · 21 · 3) |
| Cuánto antes de llegar al cuerpo decide el cilindro | mediana 0,13 celdas (40 cm), 49 flechas |
| **Cuánto sigue volando la flecha que acierta** | **mediana 2,35 celdas (7 m), p90 6,26 (19 m)**, 149 flechas; con relieve 2,30 y 6,04; en 6 contra 12, 2,32 y 6,98 |
| Coste en este contenedor | Rapier 0,22 ms por paso sin sombra (19 883 pasos) y 0,20–0,21 con ella; **las sondas, 0,08 ms por paso con 24** (0,09 con relieve; 0,05–0,06 con 12): colocarlas y barrer las flechas en vuelo |

**Lo que dice, y lo que no.**

1. **El método no inventa diferencias.** Con la cápsula del tamaño del
   cilindro cambia el 5–7 % de los aciertos (tapa redonda contra tapa plana,
   barrido contra mirada al final del paso). Es el suelo del ruido.
2. **Con el cuerpo que se pinta, cambia un tercio** —35 % con el tronco, 31 %
   con los brazos; 40 % y 39 % con relieve; 31 % en seis contra doce—, cinco
   veces el ruido, y **siempre en el mismo sentido**:
   ninguna flecha da con Rapier donde el cilindro falla, porque el cuerpo cabe
   dentro del cilindro. De las 51 que sólo cuenta el cilindro,
   **28 van a 7–10 centésimas de celda del suelo** (20–30 cm: la flecha se
   está clavando en la tierra, a medio metro o más de los pies, y el cilindro
   la cuenta como baja porque llega hasta el suelo) y **21 van a la altura del
   pecho o la cabeza a 0,39–0,45 celdas del eje** (1,2–1,35 m: pasan de largo
   por un lado). Las dos cosas son el mismo hecho: **el cilindro gordo tapa un
   apuntado que no cuenta con el aire.** `aimAt` resuelve la parábola sin
   rozamiento; con él la flecha llega más tarde y más baja, y cae corta o por
   detrás del punto adelantado. El cilindro lo perdona; un cuerpo, no.
3. **Toca arriba.** 81 de 100 contactos son en la cabeza y los hombros: se
   dispara desde la muralla, y una flecha que baja encuentra primero lo más
   alto. Importa para cómo se enseñe —el retroceso y el impulso del ragdoll
   vienen de arriba— y para el gore, que es decisión del dueño (E4).
4. **Lo que hoy se ve mal, y el contacto arregla sin tocar el balance:** la
   flecha que acierta sigue su vuelo, atraviesa el cuerpo y se clava siete
   metros detrás (diecinueve en una de cada diez). Rapier no sabe que ha dado.
5. **El relieve no es lo que cambia aquí, pero cambia la batalla.** Bajo el
   portón de las villas medidas el suelo está a cota 0 (−0,02 a 0,11 bajo
   los aciertos, semillas 7, 5 y 13), así que la regla del cilindro «desde
   y=0» no muerde en ellas; en una ladera sí lo haría. Pero el banco sin
   navegador corría **en llano** y el juego tiene relieve (`elevationAt`), y
   con él la misma batalla cambia: la villa 7/60 acaba en 36 s en vez de 96
   y el portón aguanta con 32 golpes en vez de romperse. Para cualquier medida
   de combate, `--relief` (no es el defecto del informe para no romper las
   cifras de antes; ni con relieve es exactamente el banco del navegador, que
   añade los sólidos de los edificios).
6. **Cuesta poco aquí, y aquí no es un teléfono.** 0,08 ms por paso sobre los
   0,21 de Rapier (+37 % de la física), unos 2,4 ms por segundo de escena. A
   ×1 la vida da medio paso por fotograma a 60 fps; a ×4, dos. Lo que decide
   es el aparato (§2).

**Contra los criterios que dejé escritos antes de medir**, sin maquillar:
(1) «una de cada diez flechas acaba distinto»: por flecha es un 5 %, porque el
86 % de las flechas fallan para los dos jueces; el criterio estaba mal
planteado —lo que decide quién cae son los aciertos— y por acierto es un
31–40 %, cinco veces el ruido, explicado caso a caso. (2) «Se ve a 390×844»: no se
puede medir en sombra; es el criterio de F-1. (3) «Menos de 0,5 ms en el
aparato»: lo retiro (§5, punto 2) por un criterio relativo a la línea de base
del aparato, que está por medir.

**Cómo se integraría con las animaciones nuevas, sin tocarlas.** Cuando Rapier
diga «tocó», el golpe ya tiene fecha (`hitAt`, `downAt`) y `hit_take` o la
caída lo enseñan en su instante; se añade la dirección del impacto como dato
de presentación (igual que `meleeFacing`), para que el retroceso vaya **en
contra** de la flecha; el ragdoll recibe la velocidad de la flecha en el
segmento tocado en vez de caer desde el reposo; y la flecha **se queda donde
tocó** —clavada en el segmento del ragdoll— en vez de seguir de largo. El clip
`fall` sigue de respaldo. Nada de esto toca un clip.

**Veredicto: merece la pena continuar, con una condición que es del dueño.**
La física no sería decorado: cambiaría quién cae en un tercio de las bajas por
flecha, por razones que se explican una a una y que se ven (la flecha que se
clava a los pies, la que pasa a un metro), y arregla un defecto que hoy se ve
en cada acierto. La condición: **con el apuntado de hoy, el contacto real deja
la muralla un tercio menos letal**, y eso mueve lo que §1b decide —cuántas
villas caen—. El nivelado es del dueño, y hay tres salidas, de menos a más
trabajo:

- **(a) Aceptar la muralla menos letal**: caerían más valles. Encaja con «el
  caos es el juego», pero es una decisión, no un efecto secundario.
- **(b) Apuntar mejor en vez de engordar el blanco**: que `aimAt` cuente con
  el rozamiento (unas pocas iteraciones del mismo vuelo que Rapier hace). Es
  la salida física: los arqueros de verdad no aciertan por tener blancos de
  dos metros de ancho, sino por apuntar con el aire.
- **(c) Separar lo que se ve de lo que decide**: la flecha se para donde toca
  el cuerpo —o en el suelo, si no lo toca— aunque el cilindro siga decidiendo.
  Arregla lo que se ve mal sin mover el balance, pero en un tercio de las
  bajas enseñaría a un hombre que cae con la flecha clavada en el suelo a su
  lado: no esconde que la decisión no es física, sólo lo hace visible.

**La propuesta, F-1 · «la flecha que se clava»** (no empezada; detrás de una
opción `contact`, apagada por omisión, y `&contact=1` en el banco):

1. Decide el barrido que F-0 midió; el cilindro queda de respaldo mientras
   Rapier carga.
2. La altura, desde el suelo del blanco y no desde y=0 (lo que el relieve
   mide abajo).
3. La flecha se para donde toca y, cuando nace el ragdoll, se cuelga del
   segmento tocado.
4. El ragdoll recibe la velocidad de la flecha en ese segmento, y `hit_take`
   y la caída miran en contra de ella (`impactFacing`, un dato de
   presentación como `meleeFacing`).
5. El apuntado con aire, como opción aparte, medido por separado (salida b).

**Qué diría que sigamos después de F-1**: en veinte batallas o más, llano y
con relieve, con y sin contacto —como distribuciones, nunca batalla a batalla—
la cifra de balance escrita para Vera (bajas por flecha, asaltantes caídos,
portón, villas que caen); en una tira a 390×844 del observatorio, la flecha
clavada y la caída en su dirección (la cadera se desplaza en el sentido de la
flecha en nueve de cada diez caídas medidas en la traza); y el coste de las
sondas en el iPhone y el iPad como fracción del fotograma de la línea de base.
**Qué diría «parad aquí»**: que la flecha clavada y la caída no se lean a
escala de móvil, que el coste no quepa en la fracción acordada, o que Vera
prefiera la letalidad de hoy sin compensarla con el apuntado —y entonces (c)
es lo único que queda—.

**Después, y en el orden que decida el dueño:** el empujón en el portón (la
partida contra la hoja como cuerpos de Rapier, que es donde un contacto se
vería mejor), y el cuerpo a cuerpo con la trayectoria del arma como dato
(§2, límite 1), que es lo más caro.

## 4 · Lo que conviene cuidar ya del rework de animación

1. **Que las animaciones sigan fechando hechos y no decidiéndolos**
   (`combatClip`, `since`, `until`). Es lo que permite que mañana el hecho lo
   ponga un contacto de Rapier sin tocar un clip.
2. **Que la pose siga siendo función del instante** (el mezclador se pone en
   un tiempo absoluto, `world/cast.ts`, `pose`). Es la condición para hornear
   la trayectoria del arma como dato (§2, límite 1) y para mezclar después
   animación y física por hueso.
3. **Que el esqueleto no cambie de nombres ni de jerarquía.** Los once
   segmentos del ragdoll se leen del rig publicado (`RAGDOLL_SEGMENTS` en
   `world/cast.ts`); el horneado sin Blender (`tools/art/bake-clips.mjs`)
   respeta los nombres, y así debe seguir.
4. **Nada de desplazamiento de raíz en los clips**: la marcha va en el sitio y
   la mueve el suelo recorrido. Un cuerpo empujado por la física tiene que
   poder moverse sin que el clip lo arrastre a otro lado.
5. **Los datos de presentación en el `Actor`, no lógica en el render**: la
   dirección del impacto, cuando llegue, es un campo como `meleeFacing`.
6. **Que las reglas hablen con la física por la interfaz estrecha de
   `physics.ts`** (`launch`, `articulate`, `probes`, `sweep`, y los eventos
   cuando lleguen), nunca con tipos de Rapier. El día de un port, esa interfaz
   se reescribe sobre Jolt o PhysX y las reglas no se tocan.
7. **Pensando en una app nativa**: los clips fabricados viven en código
   (`action-clips.ts`, sobre three.js) y no viajan a otro motor; los del GLB,
   sí (glTF). Si la app nativa o la trayectoria del arma como dato llegan,
   conviene hornear los fabricados al GLB con la vía de AN-1a
   (`plant-gait.mjs` + `bake-clips.mjs`), para que sean datos y no código. Es
   trabajo de una ronda, no urgente, y sirve a las dos cosas.
8. **La traza del observatorio y el banco**: `hunt`, `defence`,
   `physics.stats` (con `probes`, `stepMsTotal` y `probeMsTotal` desde F-0),
   `trace-strip.py` y `battle-report.ts --shadow` son los instrumentos de lo
   que venga.

## 5 · La nota de Astra, leída con lupa

**En lo que tiene razón, y se sigue:** terminar la animación antes (hecho:
AN-0 a AN-4 y las tomas de AN-4b); ampliar Rapier sin llevar a la física la
rutina entera de la aldea (F-0 lo hace con una cápsula por asaltante, sólo en
batalla); Capacitor es un contenedor que no da render nativo ni fotogramas, y
no es un paso hacia una consola; y no empezar una migración antes de una
prueba acotada en el hardware.

**En lo que discrepo o afino:**

1. **El orden.** La nota pide la línea de base en el aparato antes de la
   prueba con Rapier. Para decidir **si** el contacto cambia resultados no
   hace falta el aparato: la sombra se mide en Node y ya lo dice (§3). El
   aparato hace falta para el **coste**, y eso sí va antes de F-1. Las dos en
   paralelo; la de aquí está hecha.
2. **«No se fija un umbral numérico antes de medir».** De acuerdo con no
   fijar milisegundos absolutos desde un portátil —mi propuesta anterior de
   «menos de medio milisegundo» era eso y la retiro—; pero una decisión sin
   criterio se toma por gusto. Propuesta: fijar ahora **la forma** del
   criterio —lo que añaden las sondas como fracción del fotograma medido en
   la línea de base del aparato, en la batalla representativa— y el número
   después de medir.
3. **Colisionadores de armas.** Es la parte cara, y no por Rapier (§2,
   límite 1): la vida no conoce la pose. Antes que el colisionador hace falta
   la trayectoria del arma como dato horneado de los clips.
4. **Movimiento cinemático y controlador de personajes.** No ahora. El
   integrador de la vida (`body.ts`) es la autoridad del movimiento y lo han
   afinado diecinueve rondas de IA; dos autoridades del movimiento son dos
   verdades. Las sondas **siguen** al cuerpo; si un contacto decide un
   empujón, se aplica como velocidad en ese integrador. El controlador de
   Rapier, sólo si un empuje entre combatientes pide resolución rígida de
   verdad, y medido antes.
5. **Capacitor, lo que la nota no dice.** (a) La partida vive en IndexedDB
   del origen (`ui/idb.ts`, `the-valley/saves/current`) y **no hay exportar ni
   importar**; una app con Capacitor es otro origen (`capacitor://localhost`),
   así que la partida de la PWA no pasa sola. Antes de probar el contenedor
   hace falta sacar la partida a un fichero (el guardado ya es serializable,
   `engine/save.ts`), que además es la mejor defensa de una partida larga
   contra un borrado del navegador. (b) El service worker de `ui/pwa.ts` no se
   comporta igual dentro de WKWebView; con los recursos empaquetados no hace
   falta, pero hay que comprobar que el juego no dependa de él. (c) Lo que se
   gana es la tienda y un almacenamiento propio, no fotogramas.
6. **Switch y el motor en TypeScript.** La nota da por hecho que un port
   reescribe el motor. Hay una tercera vía que conviene medir antes de
   descartarla: **embeber el motor tal cual** en un intérprete de JavaScript
   dentro del port. El motor es TypeScript puro, sin DOM, y su valor es el
   determinismo byte a byte, que una reescritura a mano pone en riesgo. En
   consola y en iOS un motor embebido no tiene JIT, así que correría
   interpretado. Medido aquí con la aproximación más barata, `node
   --jitless` (el intérprete de V8, sin compilador), alternando pasadas:
   **veinte años de la semilla 7 (960 semanas) tardan 5,8 s con JIT y 25,8 s
   sin él, ×4,4, y la crónica sale idéntica byte a byte.** Una semana de
   juego son catorce minutos a ×1, así que el tick interpretado cabe de
   sobra; lo que no cabe es la recuperación de una ausencia larga: la puerta
   de §13.2 (960 semanas en menos de 2 s) ya se pasa aquí con JIT (3,4 s,
   la máquina) y sin él serían unos quince segundos, más en una consola, y
   otros intérpretes (QuickJS) suelen ir más despacio que el de V8. Un port
   con el motor embebido tendría que repartir esa recuperación. No está
   validado para Switch ni para ningún intérprete concreto: es una medida
   para no descartarlo a ciegas.
7. **Rapier en un port.** Además de lo que dice la nota: que las reglas del
   combate hablen con la física sólo por la interfaz de `physics.ts` (§4,
   punto 6); así se reescribe la interfaz y no las reglas.

## Riesgos y dudas

- **Que la física sea invisible a esta escala.** Un cuerpo mide 10–20 px en
  el móvil; un roce o un desvío pueden no leerse. Por eso el criterio de F-1
  que se ve —la flecha clavada, la caída en su dirección— es obligatorio, no
  decorativo.
- **Que el contacto real cambie el balance.** Medido en F-0: con el apuntado
  de hoy, la muralla sería un tercio menos letal, y eso son villas que caen.
  No es un efecto secundario que se arregle luego: es la primera cosa que el
  contacto hace. El nivelado es del dueño y va al final; F-1 tiene que
  llegar con esa cifra delante.
- **Que más física signifique partidas más difíciles de probar.** Cada prueba
  de combate pasa a ser una distribución; los listones, con muchas batallas y
  varias semillas.
- **Que mirar cambie el resultado.** Si la escena física es más dura o más
  blanda que B3, mirar se vuelve una estrategia; hay que medirlo antes de dar
  más peso a la escena.
- **El coste en teléfonos modestos** no está medido; todo lo medido es de
  este contenedor (cuatro núcleos lentos) y de SwiftShader. Las cifras de
  milisegundos de §3 ordenan magnitudes, no deciden.
- **Duda de diseño para Vera:** qué resultados quieres que decida la física
  primero —¿el acierto de las flechas, el empuje en el portón, las caídas?—.
  Este documento propone el acierto porque es el único que ya pasa por Rapier
  a medias y porque F-0 dice lo que cambiaría; el orden es tuyo.
