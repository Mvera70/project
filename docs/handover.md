# The Valley — Traspaso

**15 de septiembre de 2026 · Al cerrar la auditoría del proyecto**

**La fuente de verdad es `docs/design.md`**, y su historial `docs/changelog.md`.
Este fichero no los sustituye: dice **en qué estado exacto está todo, qué
decisiones ya están tomadas y qué trampas ya han costado tiempo.** Léelo antes de
empezar cualquier ronda.

---

## 1. El método, en cinco reglas

Funciona porque invierte la relación habitual: **el código no es el resultado de
la especificación, es su prueba experimental.** Cada módulo implementado destapa
algo que la spec decía mal, y esa corrección es el producto real de la ronda.
Sesenta y cuatro revisiones lo confirman.

1. **Cada ronda termina en evidencia, no en un visto bueno.** Una medición que
   contrastar o una salida que leer, y por escrito **qué resultado falsaría la
   spec**. Sin esa frase, se imprime un número y nadie sabe qué mira.
2. **Toda invención es un hueco de especificación.** Si hubo que inventar un
   número, una regla o un tipo, la spec callaba: ciérralo en el documento, no
   solo en el código.
3. **Ningún número se inventa.** Todos viven en §12 y en `balance.ts`. Uno nuevo
   entra con `// TUNE:` y sube a spec en la ronda siguiente.
4. **Antes de ajustar una constante, comprueba que el mecanismo que mide
   funciona.** Cinco rondas se dedicaron a apretar tuercas de un motor que
   perdía aceite: una peste vencida seguía restando ánimo para siempre (v2.18).
   Un número fuera de banda puede ser un mecanismo roto.
5. **Versionar y verificar.** Cada cambio del documento sube la versión, se
   fecha, y el registro dice **qué cambió y por qué** — el motivo es lo que
   evita que alguien lo revierta dentro de seis meses creyendo que arregla algo.
   Y verificar la edición no es verificar la escritura: **relee del disco**.

**La regla 5 se rompió y se pagó.** Nueve rondas de interfaz (U-01 a U-09), la
activación de G-12 y V-09b se entregaron **sin una sola entrada en el registro**.
La auditoría del 15 sep las apuntó de golpe, y de ese desfase salieron cuatro
regresiones que nadie podía ver. Detalle en §3.

### El riesgo de fusionar los papeles

Un implementador que también dirige **optimiza lo que puede medir solo**. Se ve
en el historial: rondas enteras de rendimiento e instrumentación mientras el
hito 0 —que necesita a un lector humano ajeno— lleva ocho módulos sin veredicto.

Contrapeso concreto: antes de abrir una ronda, pregunta **qué haría fallar a esta
decisión**, y si la respuesta necesita a una persona, no la sustituyas por otra
medición.

---

## 2. Estado del proyecto

**Rama de trabajo:** `graphics/g-04-villager-rig`, **167 commits por delante de
`main`** y sin haberse abierto nunca como pull request. Eso importa y no es un
detalle de contabilidad: ver §3.

**Puerta en verde:** `npm run typecheck`, `npm test` (1 047 pruebas, 23,7 s),
`npm run test:journeys` (111 pruebas, 221 s), `npm run lint`, `npm run test:pwa`
(6 recorridos) y `npm run test:shots` (10 pasan, 3 declaradas).

**Los presupuestos de prueba subieron en v3.68 y está contado por qué**
(`docs/design.md` §14): el valle es cuatro veces mayor y un tick cuesta 1,67
veces lo que costaba, con dos cuellos ya arreglados —A* rellenaba tres arrays
del tamaño del mapa por ruta; `placeBuilding` recorría el mapa entero por
solar—. Lo que queda son tres ficheros que simulan mil años cada uno.

### Qué es el juego hoy

| Capa | Estado |
|---|---|
| **Motor** (`src/engine/`) | Completo. M-01 a M-39. Demografía, subsistencia, opiniones, encrucijadas, animales, comerciantes, crónica |
| **Derivación** (`src/derive/`) | Nueva en v3.66. Lo que el estado dice antes de pintarlo, compartido por los dos renders |
| **Vida** (`src/render3d/life/`) | V-00 a V-10, V-12, V-13, V-14. **Es cómo se mueve la aldea**, sin bandera. Falta V-11 |
| **Render 3D** (`src/render3d/`) | G-00 a G-12. **Es el juego** desde el 14 sep 2026 |
| **Render 2D** (`src/render/`) | La puerta de vuelta, en `?render=canvas`. Se queda hasta que alguien pruebe en un móvil |
| **Interfaz** (`src/ui/`) | U-01 a U-09. Piel, hitos, tres pantallas, arranque, barra de destinos, cabecera, decisión pendiente, pantalla de la gente, sonido |

**Los hitos 0 y 6 siguen sin juez.** Son los dos criterios humanos y **no se
declaran superados ni se sustituyen por pruebas automáticas.** Es la deuda más
antigua y la única que ningún agente puede saldar.

### Decisiones que enmarcan lo que viene

Tomadas por el dueño del diseño el 14 sep 2026 (`docs/roadmap.md`):

- **El 3D es el juego**, con el riesgo escrito y aceptado: todo lo medido de
  rendimiento es de un portátil. **Probarlo en un móvil pasó a ser urgente.**
- **El ritmo de decisión: las dos cosas.** Arreglar los fallos, relajar
  condiciones **y** escribir plantillas de menor peso, un paso y remedir. El
  número al que se apunta es seis a ocho decisiones por década, no treinta.
- **El aldeano: que diseñen libre.** No se impone dirección a la sesión de
  Blender.
- **El sonido: ambiente y acentos.** Hecho en U-09.

Y las del Anexo D que siguen en pie: **D.2.1** teja y paja conviven; **D.4.1**
piel rígida; **D.6.1** un día escénico dura 120 s y **sigue la velocidad entera** —decidido
el 15 sep 2026, ver abajo—; **D.6.2** un aldeano mide 0,65 celdas y una celda son tres metros;
**D.6.3** al entrar se encuadra la aldea con su entorno; **D.6.4** la jornada
pertenece al día escénico; **D.6.5** un clip en el sitio exige un cuerpo en el
sitio.

---

## 2.1. La versión 2.0, del 15 sep 2026

> **Añadido el mismo día, después de la versión 2.0: la pareja (v3.69).** El
> dueño rechazó la demo «sólida» —trastos de prueba atravesando el suelo, tres
> filas de botones— y dio la premisa: un idle bonito de mirar de fondo, con la
> aleatoriedad como esencia, y cinco pasos en orden: **pareja fundadora, menú
> de inicio, inicio guiado desde lo alto, reloj con horas, tormentas**. El
> primero está hecho y medido (`tools/founding-report.ts`, §12.2): ninguna de
> seis parejas se extingue en cuarenta años, 5 a 20 personas a los diez. Lo
> que costó: la pareja no cosechaba (regla «dos manos, un campo» en
> `labour.ts`), nadie llegaba (`ARRIVE_MIN_PEOPLE` 8 → 2, aldea pequeña sin
> exigir cama), y sesenta pruebas escritas con veinte fundadores, que ahora
> fundan con `foundTwenty` porque miden una aldea hecha. Los cuatro pasos
> restantes están en la memoria del agente y en `CLAUDE.md`.

El dueño del diseño estuvo a punto de desestimar el proyecto —«la aldea no se
siente viva, no hay ninguna manera lógica de jugar, o paramos y establecemos
objetivos muy claros o esta idea se va fuera»— y después delegó: «toma la
rienda y elige, toma todas tú las decisiones». De ahí salió
`docs/plan-juego.md` y esto es lo que se hizo, en orden.

**E1 a E5 · el juego tiene un verbo.** La aldea obedece al jugador: tres
palancas de órdenes permanentes —cuánto se siembra, dónde van las manos que
sobran, qué se levanta antes—, la aldea contesta cuando no puede obedecer, cada
cifra dice hacia dónde va, y cada valle saca dos rasgos de cuatro para que dos
partidas no se jueguen igual. Las cinco entregas están en el plan con su
medida.

**El reloj, decidido el 15 sep:** la jornada escénica **sigue la velocidad
entera**, así que caben ocho semanas por jornada a cualquier velocidad —antes
eran ocho a ×1 y treinta y dos a ×16, y el calendario y el sol contaban dos
historias—. El coste: a ×64 el día dura 1,9 s, así que la jornada de **luz** se
aplana hacia la de media mañana a ×16 y ×64 (`LIGHT_STEADY`), porque un
parpadeo de media pantalla tapa lo que uno mira a ×64.

**Los mensajes.** «Horrorosos», dos veces, y las dos veces se buscó en la
redacción. No estaba ahí:

- `tools/notice-report.ts` (nuevo) mide qué frases lee el jugador de verdad.
  **2 831 de 3 309 avisos eran la misma clave**: la temporada de caza, catorce
  veces al año. Ahora se cuenta al empezar la temporada, como los cuervos.
- Las cartelas de hito hablaban **en pasado y con fecha** de algo que el
  jugador estaba viendo ocurrir. Veinticuatro claves reescritas en presente.
- Y decían **dos años más** que la cabecera: E4 movió el «+1» de los años
  absolutos a la presentación y cinco sitios de la interfaz ya lo sumaban.

**El mapa grande.** 72 × 112, cuatro veces el área, con el **corazón** de 36 ×
56 centrado —el mapa entero de antes— como única superficie productiva.
Montañas que suben hacia la sierra y un lago llenan el resto. La trampa que
tenía la fase aparcada está contada con números en `WORLD.HEART_WIDTH`.

**Y el vado, que es el arreglo de fondo de esta ronda.** A* no cruzaba el agua,
así que **nadie cruzaba el río nunca**: con campos en las dos orillas, media
aldea se quedaba sin ruta —cuatro rutas para treinta y nueve personas—. El vado
es terreno ahora (`TERRAIN_CODE.ford`). Después: 20 rutas en esa misma semilla,
el reparto de destinos de 6,00 a 8,17, y dos travesías que estaban declaradas
en rojo se pusieron verdes solas.

### Una conclusión falsa, y cómo se destapó

Merece su propio apartado porque estuvo a punto de costar una decisión de
diseño. A media sesión medí que **una aldea madura no tenía nada que
construir** —de 0,3 a 0,5 obras al año, la piedra nunca desbloqueada— y que el
valle no tenía nada que contar —1,04 sucesos por sesión de cinco minutos, justo
en el suelo de §16.3—. Escribí las dos cosas en tres documentos y estuve a un
paso de relajar las condiciones de A.16 para arreglarlo.

**Las dos medidas estaban rotas por el mismo error**: el informe de obras y la
prueba de densidad avanzaban el mundo con `tick` en vez de con `run`, así que
nadie contestaba las encrucijadas. Y §8.6 no plantea dos a la vez: la primera se
queda pendiente para siempre y con ella se van todas las demás, sus
consecuencias, sus semillas y las obras que conceden. Estaba midiendo **una
partida que nadie juega**.

Jugada de verdad, con la política prudente:

| | Roto | Medido de verdad |
|---|---|---|
| Obras en sesenta años (semillas 7, 11, 41) | 10 a 20 | **67 a 99** |
| La piedra se desbloquea | nunca | **años 42, 42 y 45** |
| Sucesos notables por sesión de cinco minutos | 1,04 | **1,45** |

A.16 se queda **exactamente como estaba**, y el comentario de
`crossroads/catalog/succession.ts` cuenta por qué para que nadie lo vuelva a
relajar con el informe roto en la mano.

### Lo demás que entró en la ronda

- **La línea de estado de la tira** (`src/ui/doing.ts`): una frase que dice qué
  está haciendo la aldea —el hambre, el invierno sin leña, la obra en marcha, o
  que no hay nada que construir—. Era la mitad que faltaba de «los recursos no
  sirven para nada»: cuatro cifras y tres palancas no cierran el bucle sin una
  frase que diga si la orden está pasando.
- **V-11 cerrada**, la última fase del Anexo E: la reunión de §11.8 vuelve a
  reunir. Del 77 % al 100 % de la aldea va donde la decisión dijo, y el más
  lejano queda a 8-11 celdas contra más de dieciséis antes. Los tres errores que
  costó están en el commit y en `life/staging.ts`.
- **La encrucijada es la pantalla entera** y el precio de cada opción dejó de
  ir en mayúsculas.
- **Dos cuellos de rendimiento del mapa grande**, arreglados: A* rellenaba tres
  arrays del tamaño del mapa por cada ruta y `placeBuilding` recorría el mapa
  entero por cada solar. Y los presupuestos de prueba de §14 subidos con la
  cuenta escrita, no en silencio.

### Lo que esta ronda midió y dejó abierto, de verdad

- **La última década está vacía.** Con todo levantado —los dieciséis a piedra y
  la empalizada— el 100 % de las semanas del año 50 al 60 no tienen nada que
  querer construir. Antes de eso la cola está vacía entre el 54 % y el 93 % de
  las semanas según la década, que es lo propio de una aldea que abre una obra
  cada vez (§7.3), no un defecto.
- **La regla que esto dejó escrita:** un informe que avanza el mundo sin
  contestar las encrucijadas no mide este juego. Si una medida nueva usa `tick`
  en un bucle, está midiendo otra cosa.
- **La semilla 3 no juega a la pelota ni una vez en diez jornadas.** Caso
  extremo de la causa ya declarada en `life-props.test.ts`: nadie gana el
  concurso de utilidad de la primera recogida del día.
- La demo se publica **partida en dos** (`bundle-game.ts --split`): la página
  de 0,95 MB y un JSON de 3 MB con los GLB. Una página de cuatro megas la
  rechaza el publicador por tamaño.

---

## 3. Lo que la auditoría del 15 sep encontró, y por qué importa

El encargo fue: *«hemos dado muchos palos de ciego, hay que eliminar código
muerto y decisiones antiguas, establecer unas bases sólidas.»* Lo que salió no
fue código muerto suelto: fue **un día de desfase con cuatro consecuencias
invisibles.**

G-12 activó el 3D el 14 sep tocando cinco ficheros de código y ninguno de
documentación. Su propio brief pedía las dos cosas en la misma ronda. De ahí:

1. **Las reuniones de §11.8 dejaron de ocurrir.** Sólo existían en
   `actorsFor`, el camino viejo, que desde G-12 no se ejecuta. `life/` no conoce
   la palabra `gather`. Nadie lo vio porque la prueba que las vigilaba llamaba a
   `actorsFor` directamente y siguió verde sobre un camino muerto. Medido: con
   una reunión convocada, a media jornada el más lejano está a **12,4 celdas**
   del sitio. **Es lo que V-11 debe**, y está declarado en
   `tests/fast/life-staging.test.ts`.
2. **La reja de capturas de §14.3 llevaba roja desde U-01**: 8 de 13 recorridos.
   No se veía porque `ci.yml` sólo dispara en `main` o en un PR. Y los que
   pasaban lo hacían **por no tener WebGL**: el relevo a 3D fallaba en silencio y
   medían el Canvas creyendo medir el juego.
3. **Los modelos 3D no se precacheaban.** Sin red, el valle abría en 2D. La
   promesa de §13.4 se cumplía a la letra y no en espíritu, y el día que no haya
   Canvas al que caer, no habría abierto.
4. **El render nuevo importaba ocho módulos del viejo** para saber qué contar.
   Eso convertía retirar el Canvas en imposible.

**Lo que se arregló:** V-12 (6 011 líneas fuera), la segunda mitad de G-12 en la
spec, `src/derive/`, la suite en tres niveles, WebGL en la reja de PWA con
`data-render` como señal, el precacheo, y siete exports muertos.

**Lo que no, y es de quien lea esto:** V-11, y recalibrar los siete recorridos de
captura declarados — que pide **mirar las capturas**, no ajustar números.

---

## 4. Trampas que ya han costado tiempo

No son teoría: cada una se pagó con al menos una ronda.

### Del motor y el balance

- **El invierno es el momento más lleno del granero.** La cosecha es la semana 35
  y el invierno empieza en la 36. Ninguna plantilla de escasez se apoya en la
  estación; se apoya en `grainToHarvest`. Se cayó dos veces, en A.1 y en A.4.
- **Una condición ambiental dispara siempre que el techo lo permite** (§8.1,
  regla episódica). Y su reverso: **una condición sobre una carencia o un rango
  muere cuando la carencia se cubre** (§8.1, regla de la aldea madura).
- **Un umbral que pasa por el motivo equivocado es peor que uno que falla.**
  `worst` llegó al 100 % de terminaciones midiendo una sola opción repetida 178
  veces. Cuando una política degenera, se arregla **la política**, no el juego.
- **El precio escrito es un contrato** (§8.1). De 48 opciones auditadas, 13
  mentían. Si el texto promete un coste y los efectos no lo entregan, el jugador
  aprende que las opciones duras son palabrería.
- **Tocar la elegibilidad de una sola plantilla mueve el balance entero.** El
  recalibrado de `wolf_winter` está hecho y sin fusionar por eso: mete veintiuna
  encrucijadas nuevas en la ventana medida y **trece pruebas calibradas sobre
  semillas concretas pasan a fallar**. Detalle en `docs/next-plan.md`.
- **Nunca un umbral con una sola semilla.** Dos partidas divergen desde el primer
  tick.
- **Dos copias de la spec divergen.** Se sincroniza reemplazando, nunca
  parcheando, y siempre construyendo sobre la copia del repositorio.

### Del render y el arte

- **Un umbral absoluto en una cadena que escala recursos caduca.** Al llevar el
  aldeano a 0,65 celdas, la auditoría de animación empezó a denunciar clips que
  no habían cambiado: medía el tamaño de la figura, no su animación. Los
  umbrales van en proporción al alto del recurso.
- **Un ángulo no distingue una rodilla de una rodilla del revés.** El signo de
  la flexión estuvo cambiado dos veces —espinillas primero, antebrazos
  después— y las dos veces todo lo demás pasó en verde. Se mide el **sentido**,
  no solo la amplitud. Y verifica la comprobación contra el artefacto
  defectuoso, no contra el arreglado.
- **La validación en verde no ve una cabeza suelta.** El atado emparentaba cada
  pieza a la cola de su hueso y la cabeza flotaba separada del torso, con GLB
  bien formado, clips presentes y captura repetible. Se vio mirando una hoja de
  contactos. §14.3 no es retórica.
- **Tres formas de medir una zancada dan tres números y dos son falsos.** La
  buena: el pie más bajo es el que pisa, y lo que retrocede es lo que el cuerpo
  avanza. Ninguna de las tres se desmentía a ojo.
- **La promoción presupone la misma receta.** `report` comparaba el candidato con
  el aprobado usando la receta nueva, así que ningún cambio deliberado de
  geometría podía promoverse. El catálogo guarda ahora el hash de la receta.
- **Los fallos de animación se ven jugando, no en una prueba.** Teletransporte al
  trabajar, parpadeo a velocidad alta, gente amontonada, deslizamiento con la
  azada, botón de velocidad sin efecto: los cinco los encontró el usuario
  mirando la demo, con la suite entera en verde.

### De las pruebas y la infraestructura — nuevas, del 15 sep

- **Una prueba que llama a una función directamente no sabe si el juego la
  llama.** Treinta pruebas verdes vigilaban `actorsFor` mientras el camino vivo
  no tenía ninguna. **Cuando un camino se vuelve opcional, sus pruebas se mudan
  el mismo día.**
- **Un recorrido de navegador tiene que decir contra qué render corre.** Un
  relevo que falla en silencio es lo correcto para el jugador y desastroso para
  una prueba: pasaba en 730 ms sin esperar a nada.
- **Una prueba que congela una lista literal se rompe sin que nada se rompa.**
  La frontera de G-01 comparaba los imports de `contracts.ts` contra una copia
  congelada. Se comprueba la propiedad —sólo tipos, nada que se ejecute— no la
  lista.
- **Una bandera de convivencia es una deuda con fecha.** Mientras existe, cada
  prueba que corre por el lado apagado es una prueba que no vigila el juego.
- **Una migración sin su documentación no está hecha, está escondida.**

---

## 5. Deudas, por lo que pesan

1. **La lectura del hito 0 por un tercero.** Las tres crónicas, sin contexto y
   sin el documento de diseño, y una sola pregunta: *«¿en qué se diferencian
   estas tres aldeas?»*. Ni quien diseñó el juego ni quien lo programó sirven.
   `npm run reader:packet` genera el paquete. **El hito 6 está igual.**
2. **Un móvil de verdad.** G-09 quedó parcial a propósito y D.9 no acepta
   emulación. Es lo único que falta para cerrar P3, y desde la migración es
   además lo que decide si el 3D se sostiene. **Hay demo publicada, de una sola
   página y sin servidor:** `npm run shot` la arma.
3. ~~**V-11**, que salda la regresión de §11.8.~~ **Cerrada el 15 sep 2026.** Lo
   que queda de ella son las otras dos órdenes de su contrato —la riña de §7.9 y
   el duelo— y las dos esperan un cambio del **motor**: la crónica guarda los
   nombres de quienes riñen y no sus `id`, y `quarrelOf` consume azar, así que
   `life/` no puede llamarlo (§4.3). Añadir los dos `id` a la entrada de crónica
   es todo lo que hace falta.
4. **El ritmo de decisión.** Siete a doce decisiones en cuarenta años, medio
   catálogo muerto, cuatro plantillas al filo del 1 %. La decisión está tomada;
   la ronda no. Empieza por `npm run eligibility`.
5. **La suite de balance falla once pruebas de §12.9**, y ya fallaba antes de
   todo esto. **Remedida entera el 15 sep con el valle cuatro veces mayor** —22
   minutos, 240 partidas de doscientos años— y salen **las mismas once y por las
   mismas causas**. Ésa era la comprobación que el brief del mapa grande
   exigía: crecer el valle **no tocó la economía**.

   Las once: la cadencia de encrucijadas y el 1 % de ticks elegibles, en las
   cuatro políticas (ocho pruebas); la extinción adversa en **23,3 %** contra el
   25 % que pide el diseño; el bosque en banda del 40–70 % en sólo 34 de 59
   valles; y `quiet_years` sin salir nunca en 30 semillas × 150 años —que su
   propio fichero explica como la señal buena: es la reserva de §8.6 y que no
   haga falta significa que había algo mejor que preguntar—.

   Los números de §12.9 tal como salieron, para comparar la próxima vez:

   | Política | Extinción | Pico mediano | Mapa lleno | Cadencia | Horizonte |
   |---|---|---|---|---|---|
   | `prudent` | 3,3 % | 82 | 88,3 % | 5,63 | 58/60 |
   | `first` | 5,0 % | 83 | 90,0 % | 5,81 | 57/60 |
   | `last` | 10,0 % | 81 | 66,7 % | 5,51 | 54/60 |
   | `worst` | 23,3 % | 81 | 48,3 % | 5,56 | 46/60 |

   > **Remedida con la fundación en pareja (v3.69, 15 sep, 25 minutos): 16
   > rojas, no 11.** Las once de antes siguen, y se suman cinco **del mismo
   > lado**: la extinción prudente cae al **1,7 %** (banda 2–12 %), la
   > extinción tras el golpe del 90 % a los cuarenta años se queda en 17 / 10 /
   > 22 % según política (pide 25), la adversa baja a **20 %**, la distancia
   > `prudent`–`worst` a **18 puntos** (pide 20) y el bosque queda en banda en
   > sólo el 27 % de los valles. Leído junto: **la pareja hace el juego más
   > seguro y más talador** —dos bocas no pasan hambre, y una aldea que crece
   > con los que llegan rotura y tala más que una que nace hecha—. No se ha
   > tocado un número por esto: el dueño pidió cinco pasos en orden y éste era
   > el primero; el balance de §12.9 con la pareja es una decisión suya, y
   > choca de frente con su esencia (aldeas muy distintas): una extinción del
   > 1,7 % es sesenta valles que se parecen. Es lo primero que habría que
   > remedir cuando acaben los cinco pasos.

   **Y la de fondo sigue siendo la misma:** jugar bien y jugar mal se parecen
   demasiado —veinte puntos justos de extinción entre `prudent` y `worst`, que
   es el mínimo que el diseño pide—. No lo arregla una ronda gráfica: es balance
   del motor y lo decide el dueño del diseño. Medido en
   `docs/findings-drama.md` §3–§6. La de fondo es que jugar bien y jugar mal se parecen demasiado: la
   distancia entre políticas cayó a cinco puntos contra los veinte que pide el
   diseño, y `smith_feud` se triplicó. **No lo arregla una ronda gráfica: es
   balance del motor y lo decide el dueño del diseño.** Medido en
   `docs/findings-drama.md` §3–§6.
6. **Los siete recorridos de captura declarados.** Pide mirar capturas.
7. **La reja visual del 3D no existe.** Hoy se mira a mano con `npm run shot`.
   Automatizarla es una ronda con alguien delante.
8. **El rebaño sigue siendo una función de la hora.** V-08 partió `fauna.ts` en
   dos para que la capa de vida entrara por la segunda mitad —`life/beasts.ts` ya
   da animales con cuerpo— y **ese enganche no se ha hecho**: los animales que se
   ven se calculan del estado mientras la gente a su lado son cuerpos que andan.
9. **El aldeano no tiene frente.** Por delante y por detrás es casi la misma
   silueta, y en el valle giran hacia donde caminan. A seis píxeles —lo que mide
   en el encuadre de reposo— la forma no separa nada. La vía propuesta y nunca
   decidida: un peto terracota y una cuña en la cabeza.
10. **El banco de balance tarda 18,1 min contra el techo de 15.** La causa está
    medida: el coste del suelo cambia 631 veces por partida y cada cambio vacía
    la caché de pares de ruta. Bajarlo obliga a tocar el tráfico, que es balance.
11. **`resolve` nunca se había medido con la aldea moviéndose**, y sigue sin
    resolverse. De 827 234 y 686 135 parejas cercanas quedan 35 y 276 por debajo
    de 0,60 celdas (semillas 7 y 11). **Dos intentos gastados, los dos medidos y
    los dos peores** —exigir a cada plaza la holgura de `avoid` se llevaba el
    27 % de las plazas; repartir el tope como presupuesto por cuerpo mató las
    correcciones siguientes—. Por la regla séptima de E.3, el tercer intento **no
    es otro número**: el recorte retroactivo funciona mejor de lo que parece, y
    lo que falta es entender por qué.
12. **El río parte el valle y no se cruza:** sólo el 37 % del suelo libre está
    conectado con el centro. No es un fallo, es el motor. O el mapa gana un
    puente, o los asentamientos van del mismo lado.
13. **V-15 y V-16**, el mapa grande y el relieve, aparcadas a propósito. Son
    motor, suben `SCHEMA_VERSION` a 4 y rompen partidas guardadas. El cuenco de
    V-14 es decorado: el valle sigue plano por dentro.
14. **Afinar el tick a día no arregla el desfase con la jornada** y su coste está
    medido constante a constante en `docs/brief-reloj.md`. Si se hace, que sea
    por simulación y no por dibujo.

---

### Lo que está rojo a propósito, y dónde

Tres pruebas declaradas con `it.fails`, que es lo que el método manda cuando
algo no llega al listón: se deja la propiedad entera y se escribe la medida.

| Dónde | Qué pide | Lo medido |
|---|---|---|
| `tests/fast/chronicle.test.ts` | Ninguna entrada de crónica llega con un parámetro sin rellenar | El hueco `{B}` del reparto: arreglarlo mueve la trayectoria de todas las semillas, porque `fillCast` corre en la elegibilidad de cada tick |
| `tests/journeys/life-props.test.ts` | Que se juegue a la pelota **en todas** las semillas | Cinco de seis; la semilla 3 pasa diez jornadas sin que nadie toque un trasto |

Y una que **dejó de estar roja** con el mapa grande sin tocarle un número: la
cadena de tres pases seguidos de V-09b. Lo que cambió fue el vado — la aldea
dejó de estar partida en dos orillas.

---

## 6. Cómo se mira el juego

```bash
npm run shot          # empaqueta el juego en una página y lo fotografía
npm run dev           # y jugarlo, en 390 × 844
npm run dev           # ?render=canvas para la puerta de vuelta
```

`tools/graphics/shot.mjs` funciona **sin red**, con los navegadores instalados en
la máquina, y pide WebGL por software (`--use-gl=swiftshader`). Playwright no
puede descargar el suyo aquí.

**Antes de publicar recursos nuevos:** `npm run assets:publish` copia lo aprobado
a `public/assets/valley3d/` con manifiesto y hash. Un candidato sin promoción no
llega al juego — y desde v3.66 el service worker precachea lo que ese manifiesto
nombre, así que añadir un modelo cuesta descarga en la instalación.
