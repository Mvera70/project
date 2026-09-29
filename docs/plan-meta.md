# The Valley — el plan hacia la meta

**La meta está en `docs/design.md` §1b (18 sep 2026): una villa cerrada que cae
o aguanta.** Este documento es el mapa para llegar: los puntos que hay que
desarrollar, las fases de cada uno, qué va antes, cuánto cuesta y a qué agente
se le da. No detalla ninguna fase —cada una tendrá su brief cuando le toque,
como `docs/historico/plan-medios.md` o `docs/historico/plan-rey.md`—; lo que fija es **el orden y el reparto**.

Lo pidió el dueño del diseño con estas palabras: «necesito saber qué es
prioritario, qué va después y la dificultad de la tarea para así poder
destinarla a diferentes agentes en función de la dificultad».

**Estado sincronizado el 23 sep 2026.** Las rondas E1–E3 y D6 ya entregaron
los siete gestos procedurales, siete modelos publicados, armas en mano,
visibilidad del frente, huida civil, saqueo, transición terminal, ragdolls y
escombros. Las filas de arte de abajo describen sólo lo que sigue abierto; la
evidencia del cierre está en `docs/historico/life-rounds/`.

---

## 0. Cómo se lee

**El hueco medido el 18 sep, y es lo primero que va a pedir nivelado (G):** la
fase 2 se cierra a las **61 h** de reloj (edad de piedra) y la fase 3 a las
**425 h** (villa cerrada). Entre una y otra hay más de trescientas horas en las
que el valle hace lo mismo. O la muralla llega antes, o la fase 2 se estira con
contenido, o las dos: es la decisión de balance que abre el punto G.

> **Remedido el 19 sep, y el hueco se ha encogido solo.** Al bajar el suelo
> entre decisiones de un año a un tercio de año (§8.6, changelog 4.16) la villa
> cerrada pasa de **425 h a 308 h** mientras la edad de piedra se queda en
> **60 h**, o sea el objetivo del dueño intacto: el hueco baja de unas
> trescientas sesenta horas a unas doscientas cincuenta. No estaba nivelado
> apretando la muralla, estaba en que la aldea pasaba media partida sin que
> nadie le preguntara nada. **Y el arranque era peor que el hueco**: el 35 % de
> las primeras veinte horas la aldea no tenía ni una obra abierta, y la primera
> decisión no llegaba hasta las 11 h. Ahora llega a las **3,5 h en los doce
> valles**. Sigue abierto estirar la fase 2 con contenido, que es la otra mitad
> que esta fila pedía.

**Prioridad.** P1 es lo que se hace ahora o desbloquea lo demás; P2 lo que va
detrás; P3 lo que necesita lo anterior hecho; P4 lo que se nivela al final,
que es donde el dueño puso el balance y la dificultad («todo eso se irá
nivelando»).

**Dificultad y agente**, con el criterio del dueño:

| Dificultad | Qué es | Agente |
|---|---|---|
| **Baja** | Contrato cerrado y medida clara: textos del banco, mover una puerta de §7.3 con `pace-report`, un edificio nuevo en `works.ts`, una prueba, una fila en el carro | **Luna, Terra** |
| **Media** | Un sistema del motor con brief y contrato de API escritos; la capa de vida acotada a una conducta; una pantalla de interfaz | **Sol** |
| **Alta** | Diseñar una arquitectura nueva, físicas, la IA de un bando hostil, arte y animación, decidir cómo se ve algo | **Astra** |

Una regla que vale para todos: **ninguna fase se cierra sin su medida** —en
horas de reloj si decide *cuándo* pasa algo (`npx tsx tools/reports/pace-report.ts`),
con una toma del observatorio si es de la capa de vida, con captura si es de
interfaz—. Y las decisiones marcadas **«del dueño»** no las toma ningún agente.

---

## 1. Los puntos

### A · Cerrar la villa (fase 3 de la meta)

Lo que falta para que la tercera fase exista de verdad: hoy el anillo se cierra
y nadie se entera.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~A1 · El cierre se ve y se celebra~~ · **hecho el 18 sep 2026**: `ringClosed` en `placement.ts`, línea de crónica `wall.closed` con **peso 3** (§9.2 ampliada), marca permanente `flags['wall_closed']` y el peldaño en `pace-report`. Medido: cierran 11 de 12 valles, mediana **año 38 = 425 h de reloj**, ninguno lo dice dos veces | Hecho | Baja-media | — | — |
| ~~A2 · El portón~~ · **hecho el 18 sep 2026**: `gate` es un edificio (60 de madera, 40 de obra) que va en el anillo escrito y por delante de la estacada; el paso de la muralla es él; abierto de día y cerrado de noche con el gozne de las casas; roto es la ruina de siempre, y §7.3 lo repone. Medido: un portón por valle a las **200 h** de reloj, y ni una estaca abierta por error | Hecho | Media | — | — |
| ~~A2c · El cerco de una capa y las dos puertas~~ · **hecho el 18 sep 2026**, y es el arreglo de raíz que el dueño del diseño pidió: el anillo pasa de ser una **banda** (`|distancia − radio| ≤ 0,75`, celda y media, dos capas en muchos ángulos) a un **círculo rasterizado de una celda**, una estaca no se levanta antes de que el anillo esté decidido, una puerta nueva puede **sustituir un tramo de muralla hecha**, y la segunda va a un radio de la primera (`GATE_APART`). La aldea abre **una** puerta; la segunda la paga el jugador por el carro. Medido en diez valles a los sesenta años: **0 de 10 con muralla de dos capas** (antes 5 de 10), **0 aldeas encerradas** (antes la 41 con 220 celdas de 8 064), **20 de 20 puertas que llevan de las casas al campo**, separadas de 12 a 16 celdas, y el cerco en 1 a 7 tramos (antes de 25 a 47) | Hecho | Alta | — | A1, A2 |
| ~~A3 · El bastión~~ · **hecho el 19 sep 2026**: la mitad de esta fila que no choca con §7.4c. Torre **en la línea** de muralla y no al lado, **1×1** y no 2×2 —sobre un cerco de una celda una torre de dos tapaba dos o tres tramos y `upgradeOf` sólo daba de baja uno, un boquete con `ringClosed` diciendo cerrado—. Es una mejora más (`upgradeOf: 'wall'`, como `stone_house`/`church`), sólo se pide con el anillo ya cerrado (`flags['wall_closed']`, no `ringClosed(state)` en directo — recorrer la rejilla cada semana ociosa es justo lo que esa bandera existe para evitar) y con tope propio (`BUILDINGS.bastion.cap`, contado a mano porque `withinCap` colapsa su familia en `'wall'`, que no tiene tope). Cuenta como muralla en `wallRuns`, `touchesWall`, `resistance` y `walled`; ocupa un puesto de tiro en `postsOf` igual que la atalaya suelta. **Medido en doce semillas × ochenta años, con su peldaño nuevo en `pace-report`: el primer bastión a las 350 h de reloj** (mediana; 197–602 h) **en 7 de 12 valles —los siete que cierran el cerco— y los siete llegan al tope de dos**, así que una villa cerrada acaba con cuatro puestos de torre en vez de dos. (Con el ritmo de antes del 19 sep eran 555 h en 9 de 12; lo que lo movió es el hueco entre decisiones, no el bastión.) Sin malla propia todavía —usa la de la atalaya, anotado en `docs/encargos-3d.md`— y sin dibujo de crónica propio —anotado en `docs/plan-arte-pendiente.md`, cae al grabado genérico de construcción mientras tanto | Hecho | Media | — | A1 |
| A3b · El anillo final | **Aclarado por el dueño el 19 sep 2026: no es un segundo anillo de nivelado, es contenido de cierre de partida.** Esta fila pedía «cuándo la aldea desborda el primero y pide el siguiente tres celdas afuera», y `design.md` §7.4c prohíbe exactamente eso —un anillo por valle— con una medida del propio dueño del mismo día: 1.824 tramos de muralla contra 131 casas en doce semillas a 120 años. Preguntado, contestó: «el tema del segundo anillo es para el final del juego, cuando la aldea alcance el máximo de casas y estructuras será el momento en el que se construirá un último anillo que cerrará la aldea entera… por ahora construiremos el primer anillo y listo». O sea: **un anillo, siempre, hasta que el valle llegue a su techo de crecimiento** (`LIFE.MAX_HOUSES`/`FOOD.MAX_FIELDS`, hoy sin evento que los lea), y entonces —y sólo entonces— un anillo final envuelve el pueblo entero como remate del juego, no como mecánica de nivelado que se repite. §7.4c se queda como está: no hay contradicción que resolver, hay una fase que todavía no tiene brief porque depende de fase 4 (D6, el saqueo) y de qué es «el final» en detalle. No se toca el motor esta ronda | P4 | — | — | D6, el techo de crecimiento |
| ~~A4 · La villa de piedra~~ · **hecha el 18 sep 2026**, y lo que destapó es que **la muralla de piedra era contenido muerto**: `wall` tenía tabla, mejora y dibujo de crónica, y su única puerta era la encrucijada de la primera piedra (A.16), que **obliga a elegir** entre la muralla y las casas. Medido en doce semillas a ochenta años: se desbloquea en diez y **las diez eligen las casas** (+12 de ánimo contra +6 y sin bandera mala), o sea **cero valles con un solo muro de piedra**. Ahora hay dos puertas y no una: **un cerco cerrado la abre por sí solo** (`flags['wall_closed']`, la marca de A1 — sin campo nuevo y sin migración), y la encrucijada sigue abriéndola **antes**, que es lo que el jugador paga con las casas frías. Medido: **10 de 12 valles con muralla de piedra** (65 tramos en la semilla 91) y en la escalera del ritmo a las **249 h de reloj**, la misma hora que la villa cerrada — el contrato dicho en cifras. **La era** vive en `src/derive/era.ts`: se **deriva y no se guarda** (misma decisión que §7.4c tomó con el anillo) y es monótona a propósito — un valle al que le tiran la fragua sigue siendo una aldea. Peldaños nuevos en `pace-report`: **aldea a las 40 h** (23 de 24 valles) y **villa a las 249 h** (15 de 24). **Y la torre va contra el cerco**: no tenía caso propio en el marcador de §7.4, así que caía lo más cerca posible de la plaza y C2 le colgaba un arquero tierra adentro; de **10 de 20 pegadas al cerco a 20 de 20**, media al muro de 2,2 a 1,4 celdas | Hecho | Media | — | A1 |
| ~~A5 · La fase en la interfaz~~ · **hecha el 18 sep 2026**, y lo decide una medida: **en la placa de fecha no cabe**. Medido en el navegador a 390 y a 750, la fecha ocupa 179 px y el arco del sol 90 de los 302 útiles — **23 px de holgura** contra los sesenta y pico que pide la más corta de las tres palabras. Meterla ahí era recortar en silencio (§4 del estándar) y una segunda cabecera estaba prohibida (§3), así que la era va **donde una hoja grabada pone su título**: bajo el ornamento de la bandeja —la hoja de roble entre dos filetes del prototipo 01—, en versalitas y tinta apagada. Sin geometría nueva: el ornamento cede sus 14 px y la bandeja crece 14, y **no se mueve nunca durante la partida** porque la era nunca está vacía. **Y la crónica la fecha bien**: cada cabecera de año dice la fase de *aquel* año, leída de la propia crónica (`eraAtYear`: `wall.closed` y la fragua, dos líneas que ya se escribían), así que el año doce de una villa cerrada dice «hamlet». Capturado a 390 y a 750, cero errores de página | Hecho | Baja | — | A4 |

### B · Quién viene y por qué (el motor del asedio)

Lo que sigue siendo del motor y de la semilla: **quién llega, cuándo y con
cuánto**, por lo que la aldea acumuló y decidió (§1, la fuente de letalidad).

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~B1 · La amenaza en el estado~~ · **hecho el 18 sep 2026**: `state.threat` (esquema 11) con el clan que crece 2 hombres al año hasta 60, el flujo `raid`, y el saqueo —la mitad pequeña de «caer»—. Medido: primer asalto a las **103 h**, partidas de 5 a 60 hombres, y tras la muralla se llevan una cuarta parte | Hecho | Media | — | — |
| ~~B2 · El aviso~~ · **hecho el 18 sep 2026**: la crónica avisa ocho semanas antes, `raid` es una categoría de encrucijada que pasa por encima del techo de §8.6 por ser crisis, y dos preguntas —qué se hace antes (esconder, pagar, esperar) y qué después del saqueo (perseguir, amurallar, encajar)—. Medido: 198 avisos y 185 preguntas en 12 valles, la primera a las **101 h** | Hecho | Media | — | — |
| ~~B3 · Qué es «caer»~~ · **hecha el 18 sep 2026**: `ended.cause` gana **`stormed`**, el primer final que causa alguien de fuera. Una partida que cuadruplica lo que el valle pone contra ella entra: se llevan plata, grano y corral **enteros**, el portón y el cerco de al lado quedan en ruinas, **mueren los que defendían** y la partida acaba con su línea de peso 3 y su epitafio propio («The valley was taken»). La resistencia la escribió el jugador: la guarnición de C2 más lo que vale el cerco más las manos del pueblo, con techo. Medido en doce semillas × ochenta años: **sin dar defensa caen 3 de 12** (a las 304–819 h de reloj), **dándola 0 de 12**; en la escalera del ritmo, 9 de 24 partidas acaban (8 tomadas). Y pone verde a **`fate-chaos`**, roja desde B-1: la letalidad llegó por el asedio, como el dueño dijo | Hecho | Media | — | — |
| ~~B4 · La puerta de vuelta al motor~~ · **hecha el 18 sep 2026**, y es **la frontera del proyecto escrita en código**: `PlayerAct` gana `kind: 'battle'` —cuántos del clan cayeron, cuántos de los nuestros, si entraron— y el motor sigue siendo determinista *dadas sus entradas*. El asalto se anuncia al llegar y **se resuelve la semana siguiente**, que es lo que deja que la pelea tenga la última palabra sin deshacer nada; sin parte manda la cuenta de B3, y el parte **no salva por existir**: salva si adelgazó la partida por debajo de lo que hace falta para tomar el valle. Lo que el clan pierde **se queda perdido** (`threat.strength`), así que una defensa que mata compra años de paz. Medido en doce semillas × ochenta años: nadie mirando, 3 de 12 tomados; tumbando al 10 %, 2 de 12; al 30 %, **0 de 12**; al 60 %, 0 de 12 y el clan acaba en 39–60 en vez de 57–60. La escena lo informa por `battle()` y el bucle de la aplicación lo mete por la puerta de los actos | Hecho | Media-alta | — | — |

### C · Con qué se defiende la aldea (dar, no colocar)

El patrón de M-2: el jugador **da** y la aldea decide.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~C1 · Los medios de defensa~~ · **hecho el 18 sep 2026**: tres medios y tres ejes — **armas** (se llevan un cuarto menos, y el señor las cuenta), **arcos** (tientan menos, pero cuando bajan bajan más) y **atalaya** (catorce semanas de aviso en vez de ocho, y se levanta de verdad). Medido en 8 semillas × 80 años | Hecho | Media | — | — |
| ~~C2 · La guarnición~~ · **hecha el 18 sep 2026**: `derive/garrison.ts` dice cuántas manos suben, a qué puesto y con qué —el portón se sujeta con lanza, la muralla y la atalaya se disparan— y `life/garrison.ts` las baja a la jornada como dos ofertas (`guard`, `archer`) que el reparto ocupa igual que la fragua. Sube la víspera (dos semanas) y el día que llegan. Medido en diez valles: **10 de 10 llegan a tener guarnición**, la primera guardia a las **59–126 h** de reloj con **una sola mano** —la del portón, porque aún no hay nada dado— y con todo dado **siete manos, seis con arco**, el 13 % al 30 % de los adultos. En pantalla, **todos los puestos se ocupan** en las cuatro semillas medidas | Hecho | Media | — | — |
| ~~C3 · La atalaya como obra normal~~ · **hecha el 18 sep 2026** (la mitad que no necesitaba A4): la aldea se la levanta sola **después del primer saqueo** (§7.3 punto 8b, `WATCHTOWER_AFTER_RAIDS`), que es la obra que más sentido tiene que salga de ella —no quita ni un golpe, avisa— y hasta hoy sólo llegaba si el jugador la daba. Medido en 24 semillas: **atalaya a las 179 h** de reloj (127–473) en los 15 valles que llegan a tener anillo. Y una condición que la medida obligó a añadir: **espera a que el anillo esté decidido**, porque la muralla pide once casas y la torre no, así que sin ella un valle saqueado joven se gastaba en la torre la piedra del cerco —el portón se iba de 159 a **189 h** y la villa cerrada de 249 a **320**—. `byCrossroad` pasa a `false`, que ya era mentira desde C1. **Lo que queda con A4**: las torres como mejora del anillo | Hecho (la atalaya) | Baja | — | A4 (las torres del anillo) |
| ~~C4 · La fila del carro~~ · **hecha el 18 sep 2026**: los cuatro medios de defensa ya salían en el carro con su nombre, su precio en fichas y su botón —eso lo trajo C1— y lo que estaba roto era **el motivo**. Dos fallos vivos: `cart.no.feasting` no existía en el banco, así que pedir un segundo barril pintaba `[cart.no.feasting]` en pantalla; y `cart.no.room` decía «no room in the pen» —escrito para la pocilga— a quien pedía una **segunda puerta**, una atalaya o un par de manos. El motivo pasa a buscarse por cosa (`cart.no.<motivo>.<cosa>`) con la frase general de respaldo. Y el recorrido que vigila el carro estaba **rojo desde A2b** porque la corona llevaba la misma clase que las filas de medios: ahora tiene la suya. Prueba nueva: para cada cosa y cada negativa que el motor puede dar por ella, hay frase y dice lo suyo | Hecho | Baja | — | — |

### D · La batalla física (fase 4 de la meta)

**Aquí manda la física, no el motor**, por decisión del dueño (§1b): se ve,
es divertido, y el resultado es el que sale.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~D1 · Rapier, integrado~~ · **hecho el 18 sep 2026**: `life/physics.ts`, un paso de física por paso de vida, y **carga tardía** — el bundle principal no crece y Rapier queda en su trozo de 1,05 MB comprimido que sólo se pide cuando hay algo que simular. Medido: 200 cuerpos en el aire cuestan **403 µs**, el 1,2 % del presupuesto. **Falta la medida en un dispositivo real** | Hecho (salvo la medida en móvil) | Alta | — | — |
| ~~D2 · Flechas y aldeanos-torre~~ · **hecha el 18 sep 2026**, y es **lo primero del juego que decide la física**: `life/archery.ts` resuelve la balística (parábola con velocidad dada, arco bajo, tiro adelantado), la flecha es un cuerpo de Rapier con gravedad y rozamiento, y a quien le entra se le acaba la visita (`RaiderPhase.down`). Sólo dispara el puesto **ocupado**, y sólo con arcos dados (C1). Se pintan (`world/arrows.ts`). Medido en el navegador con el observatorio, dos semillas: **primera flecha a los 9–10 s**, de 10 a 57 soltadas, **8 y 10 de 12 saqueadores en el suelo**, pico de 8 a 24 flechas en el aire, 0 errores, y la jornada cuesta **un 4–15 % más** sólo el día del asalto. En pruebas, cuatro semillas: 28–97 flechas y 4–12 caídos | Hecho | Media | — | — |
| ~~D3 · El bando hostil~~ · **entera el 18 sep 2026**. Primera mitad: llegan por el camino y se plantan (10 valles, 120 cuerpos, cero colgados). Segunda: **un asalto va a por la puerta** —el motor lo distingue de un saqueo (B3)—, se apretujan contra la hoja y la golpean, y si cede entran y van al corazón del pueblo. Medido en el navegador (semilla 7, siete puestos con arcos): llegan cinco a la puerta a los 18,5 s, meten **18 golpes de los 60** y las flechas se los comen — los doce en el suelo a los 24,5 s y el valle aguanta. Sin arcos la puerta cae en 18–31 s y entran los doce. **Falta lo que hacen dentro** (D4, D6) | Hecho | Alta | — | — |
| ~~D4 · Cuerpo a cuerpo~~ · **hecho; acabado físico cerrado el 20 sep 2026**: `life/melee.ts`. Lo que decide es **la distancia** —el alcance de un brazo, 0,9 celdas, muy por debajo del empujón contra el portón— y las dos armas no valen igual: el de la lanza devuelve todos los golpes y **el arquero la mitad**, que es el defecto clásico del arquero y lo que hace que una muralla necesite las dos cosas (C1). Doce contra uno acaban con él. A quien cae se le acaba la jornada ahí, y el motor lo entierra cuando lee el parte (B4, `lost`, que **deja de ser cero**). Medido: de 0 a 3 bajas propias por asalto en cuatro valles × dos maneras. `spear_thrust`, `hit_take` y `fall` están ligados a hechos; la caída prioriza ragdoll de once segmentos con suelo y obstáculos, con animación de respaldo | Hecho | Alta | — | D3 |
| ~~D5 · Lo que se rompe~~ · **el portón, hecho el 18 sep 2026**: aguanta sesenta golpes y los golpes son **manos**, así que matar a la mitad de la partida dobla lo que tarda en caer — es la carrera de la fase 4, y los dos números están elegidos contra la arquería de D2 medida. Cuando cede, el parte de B4 dice `breached` y **la partida se acaba**; el boquete en el anillo lo abre el motor (`THREAT.BREACH`). **Falta lo que arde**: las casas durante el asalto son E4 y es decisión del dueño | Hecho (el portón) | Media-alta | — | A2, D3 |
| ~~D6 · El saqueo~~ | **20 sep 2026:** destinos alcanzables, gesto, cargas y huellas, salida y transición terminal acotada. Sin pérdidas económicas adicionales. [Evidencia y límites](historico/life-rounds/D6-saqueo-y-fisica.md) | Hecho | Alta | — | D4, D5, B3 |

**Acabado físico, 20 sep:** se cierra el ragdoll que el registro de D4 del
18 sep dejaba pendiente: once segmentos por cuerpo, terreno y obstáculos,
reposo acotado y caída animada de respaldo. La hoja rota de D5 conserva el
marco y produce seis tablas físicas. Ni sangre ni fuego ni persistencia entre
jornadas forman parte de este cierre.

### E · Arte y animación (sesión de arte)

**20 sep, E1b:** contacto `spear_thrust` y reacción `hit_take` entregados sobre
el esqueleto publicado y ligados a D4. La ronda posterior cierra `flee`,
con conducta civil de refugio y carrera procedural.
Los siete modelos de la primera tanda están aceptados e integrados en el juego
(20 sep). También se corrige D4 sin arqueros: ya no depende de inicializar Rapier.
[Integración y defensa](historico/life-rounds/E2-integracion-y-defensa.md).
  E2 está cerrado y E3 también, desde el 24 sep: el adarve se genera desde el
  anillo (E3b.3). La rotura del
  portón queda resuelta por código en D6, sin requerir otra variante GLB.

**El arte sigue parcial:** los siete gestos de E1 tienen representación
procedural; no son nuevos clips embebidos en el GLB.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| E1 · Clips de combate · **entregados por código, 20 sep 2026** | `bow_draw`, `bow_loose`, `gate_strike`, `fall`, `spear_thrust` y `hit_take` fechados por hechos; `flee` cíclico con refugio civil. Reacción de puerta y armas integradas. Oclusión selectiva del robledal y separación de raiders verificadas, con límites documentados. [Cierre y evidencia](historico/life-rounds/E3-visibilidad-y-huida.md) | Hecho | Alta | Sol + revisión Terra | — |
| E0 · **Lo que todavía pasa y no se ve** · *E0a–E0e cerrados, 22 sep 2026* | E0e conecta caminos, plaza y humo a la era real sin cambiar motor ni navegación. §7.4b fija tierra pisada → piedra parcial → piedra completa. Doce tomas históricas sin rótulo, dos semillas y móvil/tableta fueron clasificadas 12/12 por otro agente; cuatro lecturas de plaza tuvieron confianza media. La piedra lisa sin juntas queda como deuda de acabado. [Brief](historico/encargos/encargo-e0e-aceptacion-historica.md) e [informe](historico/life-rounds/E0e-ambiente-eras.md) | Hecho | Media-alta | Sol dirige · Terra revisa | — |
| E2 · Modelos del asedio · **hecho, 22 sep 2026** | Arco, flecha, lanza y escudo están integrados. El clan vecino lleva `villager-neighbor`, aldeano de otro valle con gorro y esclavina propios; conserva rig/clips y respaldo al forastero civil. Se verificó en aproximación y puerta del juego real, sin cambiar mecánica. No se añade espada: ninguna conducta actual la pide. La captura no certifica ragdoll visual. [G-28](historico/graphics-rounds/G-28.md) | Hecho | Alta | Astra sólo modelo · Terra integra · Sol revisa | — |
| E3 · Portón, muralla de piedra, torre · **hecho, 24 sep 2026** | Portón, hoja articulada, rotura procedural, muralla y atalaya integrados; E3a sube al puesto de la torre. **E3b cerrada: el adarve se genera desde el anillo real** —rectas, codos, diagonales y portón— con pretiles sobre el borde de la unión de suelos. El guardia sube directo a su puesto y hace la ronda sin enemigos a la vista: vuelta cerrada en la villa 91, ida y vuelta hasta el primer corte en 23, 7 y 42. Suelo en todas las muestras, holgura ≥ 0,325 contra un cuerpo de 0,32, cero bordes abiertos; en asalto las torres tiran. Falta medir su coste en un móvil real. [G-27](historico/graphics-rounds/G-27.md) · [G-29](historico/graphics-rounds/G-29.md) · [E3b.3](historico/graphics-rounds/E3b3-adarve-generado.md) | Hecho | Media-alta | Claude (Opus) implementa y mide | A2, A3, A4 |
| ~~E4 · Fuego, humo, gore~~ · **hecho, 25 sep 2026** | **Decidido por el dueño:** gore *contenido*, fuego en las cuatro formas y llamas de *textura dibujada animada*. (1) La casa que arde se ve tres días de llama y cuatro de brasa, con humo negro, chispas y luz (`effects/fires.ts`, marca `burnt:<id>`). (2) Salpicadura corta al golpe y mancha que se va en ocho horas (`GORE`, `effects/stains.ts`). (3) Villa tomada: arden las tres casas más cercanas al portón; aldea abierta saqueada: una, nunca la última. (4) Flechas incendiarias cuando el cerco aguanta: uno o dos tejados junto a la muralla, **salvados si hay agua a 6 celdas** (mediana medida en 84 casas de seis semillas), y la brigada de cubos acude. Todo sin dados. **Límites:** la mancha y la brigada están probadas en pruebas, no vistas en captura. | Hecho | Alta | — | D5, D6 |
| E5 · Recogida de escombros | En una ronda futura, aldeanos que acudan a una casa derruida, carguen tablones/piedras y dejen la cimentación limpia. Es una acción escénica ligada al derrumbe y al calendario visual existente, sin generar recursos gratis ni introducir una cuadrilla simulada ahora. Pedida el 24 sep 2026; por ahora sólo envejece el render del montón. | P4 | Media-alta | Por asignar | E4 |

### F · Interfaz y crónica

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| F1 · Textos del banco | Todo lo nuevo en `bank.en.ts`: el aviso, el asalto, el portón, las bajas, el cierre | P2 | Baja | Luna, Terra | cada fase que los pida |
| ~~F2 · La alerta y el HUD del asedio~~ · **hecha el 19 sep 2026** | **Lo que faltaba era que el valle lo dijera mientras pasa**: la crónica contaba el aviso y el asalto y la línea de estado seguía diciendo que se levantaba un granero (`docs/encargos-3d.md` §1). Cinco frases en la tira, ninguna cifra flotando (§11.1). Tres las pone el motor por `doing.ts` —la víspera con su cuenta atrás (`doing.raid_coming`), y el clan encima, que dice «en la puerta» **sólo si hay puerta** (`doing.besieged` / `doing.besieged_open`)— y dos la escena por `backend.live.siege()`: `doing.gate_holding`, `doing.gate_giving` (a `GATE_GIVING` = 2/3 de los sesenta golpes de D3b) y `doing.gate_broken`. **El reparto de la puerta es puro y vive en `gateNow` (`src/ui/doing.ts`), no en el bucle de pintado**, que es lo que lo hace probable desde la suite rápida. **Medido**: seis semillas × sesenta años, los seis valles ven la línea, 1.048 semanas de víspera y 131 con el clan encima — el 4,0 % del tiempo. Y en el navegador (`?raid=24&assault=1`, semilla 7, año 30, 390 × 844): los tres estados de la puerta salen —11 golpes «holding», 47 «giving way», 60 y dentro «down»—, cero errores de página, capturas en `artifacts/graphics/F2/`. **Las bajas no llevan línea propia, y es una decisión**: §11.1 dice que el valle es el HUD y que las cifras viven en la tira y en las fichas, y las de la batalla ya las cuenta la crónica al cerrar la semana (`raid.held`, con `{slain}` y `{fallen}`). Un marcador en vivo sería la única cifra flotante de la pantalla. **Y el defecto lo cazó la captura, no la prueba**: la primera versión hablaba de un portón a un valle sin cerco | Hecho | Media | — | — |
| ~~F3 · La pantalla del final~~ · **F3a, F3b, F3c y F3e hechas el 18 sep 2026** (plan y medidas en `historico/plan-final.md`): el libro de cuentas (`engine/chronicle/ledger.ts`, y **sin subir el esquema** porque casi todo se recuenta de la crónica), la hoja de cuentas con tres cifras grandes y quince filas sobre el documento que ya existía, y la lápida —capitular de la palabra que nombra el final e inscripción en Cinzel que se graba sobre el valle atenuado, con el HUD escondido—. Fotografiadas las cuatro causas. **F3d hecha el 19 sep 2026**: el cronicón, en `src/ui/screens/annals.ts`, al que se entra desde el menú de inicio. Dos decisiones del dueño ese día: **las lápidas una al lado de otra** —capitular de la causa, inscripción, `ANNO {año} · VALLE {semilla}` y dos cifras de la hoja de cuentas— y **empieza vacío y se llena**, así que la página vacía es una pantalla del juego con su línea y no un hueco. **No guarda nada nuevo y no sube el esquema**: el archivo existe desde M-25 y esto es la primera pantalla que lo lee entero. No dibuja ni una pieza nueva: la lápida es la de F3c reducida, el papel y el canto son los de la piel. **Y la captura cazó tres defectos que ninguna prueba vio**, uno de ellos de la ronda anterior: `{count}` se escribe con letra por debajo de trece, así que `doing.besieged` —de F2, esta misma mañana— decía «six of them are at the gate.» con minúscula cuando bajaban seis; la captura de F2 usó una partida de 24 y por eso enseñó un número. Arreglado en las tres frases y con guardia en `ui-keys.test.ts`. Los otros dos: la fila decía «ANNO 39» y «38 years» dos líneas más abajo (el año de la crónica va en base 1 y los vividos no), y la página vacía subía como una tira de cuatro dedos. **Queda F3f** (la hoja como imagen, sin prioridad) | P4 (lo que queda) | Media | Sol | B3 hecha |
| F4 · La captura de cada fase | Ninguna ronda de interfaz se cierra sin captura (`npm run shot`) | — | Baja | Luna, Terra | — |

### G · Ritmo, balance y letalidad (transversal, y va después)

El dueño lo puso al final: «todo eso se irá nivelando y se irá haciendo el
juego más difícil». Se toca cuando lo de arriba exista.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~G1 · El hambre muerde~~ · **cerrada el 19 sep 2026: la premisa ya no era cierta** | La fila decía «el grano toca cero y no mata a nadie», medido antes del ritmo nuevo (§8.6). Remedido con `npm run attribution` (60 semillas × 200 años): **el hambre es la primera causa de muerte, 40,9 % de 31.224**, por delante de la vejez natural (36,4 %). El dueño decidió que está bien así — no se toca ningún número | Hecho | — | — | — |
| ~~G2 · El banco de balance rehecho~~ · **hecha el 19 sep 2026** | **Lo primero que hizo falta fue correrlo, porque las dos cifras de esta fila estaban caducadas: son 11 rojas de 37, no 19. Y lo de que «tarda más que su presupuesto» también estaba caducado, pero la cifra que se le puso encima era igual de frágil: tres pasadas dan **31, 31 y 46 minutos** y la tercera se pasó del tope de 45 corriendo sola, así que el tope sube a 60 por varianza —no por lentitud— con las tres medidas escritas.** Las cuatro rojas tienen causa y tres son el juego moviéndose adonde se le pidió: la **cadencia** (12,6–16,8 preguntas por generación contra 1–5) es de antes de que el suelo de §8.6 bajara de 48 a 16 ticks esta misma mañana y de que R-1 metiera una tirada semanal; la **extinción prudente** (26,7 % contra 2–12 %) es §1b funcionando —casi todas son valles tomados—; el **bosque** (72,7 % de pie contra 40–70 %) no se agota sino que **se queda entero**, porque la leña no es cuello de botella; y la **elegibilidad** de `after_the_raid` (4,3 %), `raiders_coming` (3,7 %) y `breaking_ground` (1,3 %, sólo bajo `worst`) es la familia del clan de B1 más el contrato del caserío. **No se movió ningún número**: las cuatro quedan en `it.fails` con la propiedad intacta y la cifra al lado, que es lo que `CLAUDE.md` manda, y las cuatro son nivelado del dueño. Lo que se compró es que **el banco vuelva a estar verde al correrlo**: con once rojas conocidas mezcladas con las que vengan, nadie distingue una regresión nueva de la deuda de septiembre. Cada listón dice ahora **a qué hora de reloj mira** (el año 120 del mapa son 1.344 h; el año 100 del bosque, 1.120 h; contra un juego cuyo último peldaño cae a las 350 h) y `runBalance` acepta el horizonte como parámetro. **Y la quinta roja sí era un defecto del instrumento**: la prueba de cobertura daba por contenido muerto plantillas que el juego plantea en todos los valles, porque el banco que usaba funda con veinte personas en el tick 0. Medido jugando de verdad, **se plantean 20 de 21**; la sustituye `tests/journeys/catalogue-coverage.test.ts`, en las jornadas, donde sí se corre. **Y la trampa más cara de la ronda, que costó una conclusión falsa el mismo día: la banda de semillas cambia la tasa de caída nueve veces** — `0..29` da 1 valle caído de 30, `100..129` da 6 y `3+7i` da 9, con la misma política y los mismos años. No es la magnitud: caer es un suceso raro y **treinta semillas no bastan para medirlo**. Detalle en `docs/medidas/banco-de-balance-2026-09-19.md` | Hecho | Media | — | — |
| ~~G3 · Plantillas para el caserío~~ · **hecho el 19 sep 2026**: categoría propia `hamlet` (no `famine`, porque `crisisOf` le daría multiplicador de crisis a una pregunta que no lo es) y dos plantillas que se mueren solas al cruzar diez personas — **`breaking_ground`** (romper besana nueva —grano y ánimo ahora, campo dentro de un año— o dejarlo estar) y **`one_at_the_ford`**, la versión de caserío de A.13: **uno** en el vado ante una casa de dos, un par de manos a cambio de lo que ese hombre traiga detrás. **La primera versión de las dos no tenía ningún lado malo y puso `fate-chaos` en rojo** —2 valles rotos de 12 donde pide 3—: apuntalaba justo a los frágiles, que es lo contrario de lo que el dueño pidió. Arreglado en el contenido y no en el listón. **Medido en las doce semillas de la jornada de fundación: preguntan 5 de 12 valles, y en los cinco es su primera decisión, en el tick 49 = 11,4 h**, con 4 a 9 personas en el valle; tres de ellos vuelven a preguntar en el tick 98. **Y lo que la medida destapó, que es el hallazgo de la fila: el techo de G3 no es el contenido, es el suelo de §8.6** — `MIN_TICKS_BETWEEN` son 48 ticks, así que la primera pregunta no puede plantearse antes del tick 47 (11 h) y la población cruza diez a las 10 h. Los siete valles que no preguntan ya eran aldea cuando la puerta se abrió. Subir esa cifra es **bajar el suelo de §8.6**, que es nivelado y del dueño (§3 de este plan) | Hecho | Baja-media | — | — |
| ~~G4 · La curva de dificultad~~ · **medida el 19 sep 2026** (el nivelado sigue siendo del dueño) | **La pregunta es causal y una correlación no la contesta** —las políticas adversas eligen mal en todo—, así que se midió por **contrafactual**: se juega el valle, se apunta cada respuesta y **se vuelve a jugar cambiando una sola** (`npm run lethality`). 30 semillas × 100 años, 291 ramas, 9 valles caídos de 30. **Lo que acumula la caída es no prepararse para el asedio**, que es lo que §1b predecía: `raiders_coming:wait` es la segunda opción más letal del catálogo (**+19 pp** sobre 26 pares) y las dos que la siguen —`after_the_raid:build_up` (+11), `tithe_demand:send_him_away` (+10)— son de la misma familia. La encabeza `granary_theft:believe_a` (+38 pp sobre 16 pares). Al otro lado salvan arrodillarse por la deuda de grano (−9 pp) y acoger a los del vado (−4 pp). **Y lo que más incomoda: `raiders_coming:wait` es lo que elige la política prudente**, el jugador sensato de referencia de §12.9. Esperar mata y el juego lo premia, porque `prudent` puntúa lo que cuesta *esta semana* —grano, ánimo— y prepararse cuesta las dos: mira el precio y no ve el asalto. No es un defecto de la política (§12.9 la define sin lookahead, «como haría un aldeano»), pero explica por qué un valle bien jugado cae igual. **La fila decía «hoy 0 de 12 valles caen» y eso también estaba caducado.** No se tocó ningún número: la tabla dice **por dónde** subir la curva si hay que subirla, y eso es del dueño. Detalle en `docs/medidas/letalidad-por-decision-2026-09-19.md` | Medido | Media | — | — |

### I · La cadena a la vista (prototipo, 28 sep 2026)

La pregunta del dueño del diseño: **¿mirar una cadena productiva entera hace el
valle más interesante sin pedir nada al jugador?** Se contesta mirando diez
minutos a ×1 sin tocar nada, antes y después.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| I1 · La madera, de «+1» a la obra · **hecha el 28 sep 2026** (v4.84, esquema 12) | La madera de la semana entra de una en una a su hora de día (`subsistence/wood-run.ts`), el porteador la trae y la suelta cuando el motor la apunta, sale un «+1» sobre la leñera y la cabecera sube a la vez; la obra que se abre saca «−N» y sus albañiles llevan la madera a la parcela. **Medido**: 35 de 38 entregas llegan con porteador delante (cuatro semillas, dos edades, tres jornadas); doce semillas × veinte años, 40,6 → 39,2 personas y ninguna aldea más acabada. Demo: `?debug=1&live=1&seed=11&year=3&demo=wood`. Grabaciones antes/después en `artifacts/graphics/wood-chain/` | Hecho | Media | — | — |
| I2 · La piedra y el grano, igual | El mismo plan de entregas para la piedra de la cantera y el grano de la cosecha | P2 | Media | — | que el dueño juzgue I1 |

### J · Salir del valle (28 sep 2026)

Lo que el jugador manda fuera: gente, con su riesgo. Pedido por el dueño con el
camino ya en el motor.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| J1 · Llegadas y expediciones · **en vuelo** (v4.95) | Cinco llegadas por el camino; cinco misiones con cinco finales; el tablón de la plaza y su ventana. Motor, vida y pruebas hechos; falta que el toque abra la ventana y la suite (`task-log.md`) | P1 | Media | — | — |
| J2 · Las misiones que tocan el asedio | Espiar al clan vecino (retrasa o adelanta el aviso), ir a pedir ayuda a otro valle | P2 | Media | Sol | J1 y B1 |

### AN · Animación integral de aldeanos y animales para móvil (29 sep 2026)

Pedida por el dueño del diseño el 29 sep 2026 con `/goal`: «mejorar de forma
visible todas las animaciones de aldeanos y animales; el juego se evalúa
principalmente en móvil; trabajar hasta completar AN-0 a AN-4». El plan y los
briefs por fase están en `docs/plan-animacion-integral-movil-2026-09-29.md`;
la matriz con la evidencia, en `docs/medidas/animacion-matriz-2026-09-29.md`.
**Dependencias comprobadas ese día: todas cerradas** (G-04, G-23, IA-anim,
IA-fields, E1–E3, D4/D6, E2, «el valle más vivo»). Dos límites del entorno,
no bloqueos: sin Blender (una corrección de GLB va por brief y por la vía de
script de `rigid-clips.mjs`, o queda encargada) y sin dispositivo real (se
compara coste, no FPS).

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~AN-0 · Inventario y línea de base~~ | **hecha el 29 sep 2026** (`d82bd84`): 24 clips humanos (4 del GLB, 20 fabricados), 15 especies, gestos del perro y golondrina, verificados en código y catálogo; matriz en `docs/medidas/animacion-matriz-2026-09-29.md`; tomas a 390×844 con semilla, año, actor, cámara y zoom; coste de referencia con `gl-probe` (villa 503 llamadas, aldea 441); `tools/reports/gait-report.ts`. Medido: los clips están plantados y lo que falla es el ritmo (aldeano 3,3–5,2 Hz, niño 6–9, gallina y zorro 7, perdiz 23) y dos carreras por reloj que patinan | Hecho | Baja | Claude | — |
| ~~AN-1 · Locomoción~~ | **hecha el 29 sep 2026** (`c8834ff`, `c7755bf`, AN-1c): la zancada del aldeano 0,317 → 0,423 y 0,260 → 0,339, horneada sin Blender (`tools/art/bake-clips.mjs` sobre `art/recipes/villager/plant-gait.mjs`), plantado 0,97–1,03×, cadencia 2,5–3,9 Hz; la parada con la pierna que baja; `Animal.facing` desde la vida, `charge`/`flee` por suelo recorrido, fundidos de 0,08–0,14 s, zorro a 0,6; comprobado en el controlador real (`cast-stops`, `graphics-animal-motion`) y en partida (pares antes/después en las semillas 11 y 7). Límites dichos (matriz §2.4): gallina 7,3 Hz, niño 4,5–7,1 Hz, trote humano = decisión de Vera, `walk` perdiz y `attack` lobo/jabalí `preview-only`, ciervo sin carrera | Hecho | Media-alta | Claude | AN-0 |
| ~~AN-2 · Vida y oficios~~ | **hecha el 29 sep 2026** (`759e1e7`): siete gestos con tres tiempos y propiedad de silueta sobre el `Cast` real (hablar, rezar, ordenar, beber, sentarse en el suelo, martillar con golpe y chispas, brincar); `throw` fechado con `fling` (brief AN-2a); chispas y astillas del martillo (brief AN-2b); hojas y tomas en partida (herrero con chispas, niño sentado); la golondrina ya planeaba; encargos: banco, pelota en la mano, martillo publicado | Hecho | Media | Claude | AN-1 |
| ~~AN-3 · Encuentros y combate~~ | **hecha el 29 sep 2026**: `gate_strike` dura el segundo del golpe y carga el siguiente (portón de la semilla 11: golpes en los fotogramas 41 y 51, brazos sobre la cabeza entre ambos); `flee` esprint que pisa (43 huyendo a 2,4 Hz en el asalto); aviso del oso = su clip (brief AN-3a); arco, lanza, impacto y caída conservados con `combat-clips`, `melee`, `archery`, `ragdoll-physics`; parte del banco de batallas sin cambio. Límites dichos: oso, caza y asalto de la villa sin toma (ruta pendiente en `encargos-3d.md`) | Hecho | Media-alta | Claude | AN-1, AN-2 |
| ~~AN-4 · Aceptación conjunta~~ | **hecha el 29 sep 2026**: pares antes/después del mismo instante (trazas alineadas) en dos semillas y dos edades, la plaza a 390×844 y a 320×568, el asalto de la semilla 11; matriz cerrada fila a fila con veredicto y observación que lo refutaría (§5; `preview-only` y «sin toma» donde toca); coste: llamadas y triángulos iguales en la aldea, `animation-cost.ts` dentro del ruido (4,0–4,7 ms por fotograma); índice de tomas; **iPhone/iPad pendiente y dicho así** | Hecho | Media | Claude | AN-0 a AN-3 |
| ~~AN-4b · Las tomas que faltaban~~ y ~~AN-4c · El oso que no nacía~~ | **hechas el 29 sep 2026**: en partida el asalto de la villa 7/60 con arqueros, el conejo, la perdiz (despegue y vuelo) y la carga del jabalí; el observatorio arranca cazas (`--hunt`, `--hunted`) y las graba desde su primer paso. AN-4c: la visita del oso no nacía nunca en partida (los troncos de `solidTerrain` no dejaban guarida) y ahora nace en la linde. Límites apuntados: la honda con gestos de arco; la visita del oso de 3 s (decisión del dueño) | Hecho | Media | Claude + agentes Sonnet | AN-4 |
| ~~AN-4d · La cueva del oso en la montaña~~ | **hecha el 29 sep 2026**, pedido de Vera («la cueva del oso debe salir en la montaña»): la cueva va al pie de la montaña, contra una ladera que sube (tres celdas de roca y +0,5 a la espalda del modelo), con la boca y el claro hacia el valle; la visita y la caza del oso la comparten. Cinco valles con el terreno real: +0,52 a +0,80 detrás; en partida (7/30) el oso sale, se alza y se mete | Hecho | Baja | Claude | AN-4c |
| ~~AN-5a · La caza enseña el golpe que la decide~~ | **hecha el 29 sep 2026**, aprobada por Vera («que la caza enseñe el golpe… natural»): la estocada y la suelta van fechadas por el tiro (`clipSeconds` = 0 en el contacto), el arma sigue en la mano, la presa espantada huye antes de irse y **el parte espera a que la escena acabe de verse** (`settled`: la pieza tumbada 3 s). Tres estocadas medidas sobre el GLB —pecho 0,35, alta 0,50, baja hacia abajo 0,20— y cada presa recibe la que le llega (`hunt-gestures.test.ts`) | Hecho | Media | Claude | AN-4b |
| ~~AN-5b · La caza física: el contacto decide~~ | **hecha el 29 sep 2026**, pedido de Vera («cuanto más física y realista, mejor; que pueda fallar, que pueda acertar») y **la lanza se clava en la madera, no la atraviesa**: mundo de contacto de Rapier sólo de consulta (suelo, lo que está de pie con su altura pintada, cápsula de la presa del catálogo); tiro barrido paso a paso; sin dados de falla ni roce: pulso sembrado, presa que se mueve, roce de refilón y **cuarto trasero que hiere y no mata**; el cazador busca un puesto con línea libre y se cuela entre árboles (0,22). Antes, en cinco valles, **ninguna caza con lanza llegaba a darse** (0 %). Ahora cobradas en valle: perdiz 33–42 %, conejo 42–53 %, ciervo 67 % (arco) y 79 % (lanza), jabalí 46–50 %, oso 17 % (`artifacts/physics/AN-5/`). **El reparto es del dueño**: la caza menor cae menos que con la suerte (68 %) | Hecho | Alta | Claude | AN-5a |
| ~~AN-5c · El impacto se ve~~ | **hecha el 29 sep 2026**: la flecha se queda clavada en la presa (se mueve y cae con ella), en la madera o en el suelo, con la punta dentro; la presa acusa el golpe (empujón que se apaga en 0,2 s); **la pieza caída se tumba de costado** —antes quedaba de pie sobre el hocico, medio enterrada— para todo animal que cae | Hecho | Media | Claude | AN-5b |
| ~~AN-5d · La visita del oso, más larga~~ | **hecha el 29 sep 2026**, pedido de Vera («hay que ampliarla, claramente»): se alza a quien se acerca (3,5 celdas) y, si se aparta, vuelve a hozar; se mete si lo acosan de cerca (1,6), a la tercera vez o al acabar su rato; quien huyó vuelve a lo suyo con el oso calmado 6 s. Medida con `bear-visit-report.ts` | Hecho | Baja | Claude | AN-4d |

**Criterio de cierre del goal:** matriz completa, defectos corregidos o límites
explícitos, comparaciones reproducibles a escala móvil, sincronía de contactos
y combate conservada, coste comparado, pruebas superadas y papel al día. No se
cierra con clips sin revisar.

### F · Consecuencias físicas en el combate (propuesta, 29 sep 2026)

Pedida por el dueño del diseño al cerrar la ronda AN: que impactos, bloqueos,
empujes, caídas y proyectiles respondan a posiciones y colisiones. El
diagnóstico (`docs/diagnostico-fisica-combate-2026-09-29.md`) dice que hoy
Rapier sólo decide por dónde vuela una flecha y si la para una almena; el
acierto, el cuerpo a cuerpo, el portón y las caídas son distancias y relojes.
**F-0 está hecho, en sombra y sin cambiar nada**; lo demás no está empezado, y
el orden es del dueño.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| ~~F-0 · La flecha que toca, en sombra~~ | **hecha el 29 sep 2026** (`eb845ea`): una cápsula de Rapier del tamaño del aldeano que se pinta por asaltante, en un mundo de consulta aparte, y la bitácora de a quién habría dado cada flecha; `battle-report.ts --shadow`, `?sandbox=battle&shadow=0.12`, `physics-probes.test.ts`. Medido en veinte batallas del año 60 (ocho villas 10 contra 24 en llano y con relieve, cuatro 6 contra 12): **las 56 pasadas con sondas acaban igual que su batalla sin ellas**; con el cuerpo que se pinta cambiaría **entre el 31 y el 40 % de las bajas por flecha** (5–7 % es el ruido del método), siempre a menos —flechas que se clavan a medio metro o más de los pies o pasan a más de un metro del pecho—; la flecha que acierta **sigue volando 7 m** (mediana); las sondas, 0,08 ms por paso sobre 0,21 de Rapier en este contenedor. Veredicto y salidas en el diagnóstico §3 | Hecho | Media | Claude | AN (cerrada) |
| F-0b · La línea de base en el aparato | En el iPhone y el iPad: `?sandbox=battle&defenders=10&raiders=24` y «Copiar métricas» en el pico de la pelea; después lo mismo con `&shadow=0.12`. Fotogramas, peor fotograma y lo que añaden las sondas como fracción del fotograma. Es lo único de esta línea que no se puede medir aquí | P2 | Baja | Vera (con el aparato) | F-0 |
| F-1 · La flecha que se clava | **Propuesta, no empezada.** Detrás de una opción `contact` (y `&contact=1` en el banco): decide el barrido de F-0; la altura desde el suelo del blanco; la flecha se para donde toca y se cuelga del segmento del ragdoll; el ragdoll recibe su velocidad y `hit_take`/la caída miran en contra de ella. Medida: veinte batallas o más con y sin contacto como distribuciones (la cifra de balance para Vera), una tira a 390×844 con la caída en la dirección de la flecha en 9 de 10, y el coste de F-0b. **Antes, una decisión del dueño**: aceptar la muralla un tercio menos letal, apuntar con el aire, o separar lo que se ve de lo que decide (diagnóstico §3) | P2 | Media | Claude | F-0, F-0b; decisión del dueño |

### H · Deuda medida (el cuaderno)

Lo que `docs/task-log.md` §4 lleva anotado con su medida y **no bloquea la
meta**, pero hay que ir bajando:

| Qué | Dificultad | Agente |
|---|---|---|
| La reunión de §11.8 no cabe en una aldea de 70 (se junta el 54 %) | Media | Sol (capa de vida) |
| ~~Las once jornadas rojas de la familia R-1 y la del devoto~~ **Hecho**: quedan 128 de 130, y las dos rojas son a propósito y declaradas (`task-log.md`, «Las jornadas rojas») | — | — |
| ~~La malla de la sala y la identidad del clan~~ **hechas**: la casa larga de Astra (v4.67, 27 sep) y el clan vecino de E2 (22 sep). Bastión y escalera visual están aceptados en escena real; el puesto elevado navegable (E3a) y el adarve continuo (E3b, generado desde el anillo) se cerraron el 22 y el 24 sep. Arado y fuente están publicados e integrados. **Queda de esta fila:** medir el coste del adarve en un móvil real | Baja | Cualquiera, con un móvil |
| El hacha es el medio más flojo; `quiet_years` no sale | Baja | Dueño (decisión) → Luna |

---

## 2. El orden

Lo que va junto puede ir en paralelo a agentes distintos; lo que va debajo
necesita lo de arriba.

El orden original A1→G ya se recorrió: A1–A5, B, C, D, E1, F2/F3 y la medición
de G están cerrados. Desde el cierre del 20 de septiembre, el orden vivo es:

1. **Hecho, 22 sep** — E0e se aceptó en partida histórica: doce capturas sin
   rótulo clasificadas 12/12 por otro agente, con contraste moderado entre
   aldea y villa en algunos encuadres. La piedra lisa queda como deuda menor.
   La [revisión espacial](historico/plan-espacial.md) está aceptada localmente.
2. **Cerrado para continuar, 22 sep** — [P-1 rendimiento](historico/plan-rendimiento.md):
   la app real tiene línea de base de entrada, cadencia y condiciones de
   día/noche. P-1b.1 mejoró claramente el clic del preset; P-1b.2 se midió y
   se retiró. Vera considera suficiente el rendimiento actual. El INP anterior
   de 912–1.144 ms no se reprodujo como INP del navegador y queda anotado para
   una futura reproducción; el defecto de sombras diurnas es independiente.
3. **Cerrado el 24 sep 2026** — E3b: el adarve se genera desde el anillo
   real ([E3b.3](historico/graphics-rounds/E3b3-adarve-generado.md)); lo que
   sigue es historia del camino por piezas aprobadas. **Antes**, E3: **adarve continuo**. El
   [brief E3b](historico/encargos/encargo-e3b-adarve-continuo.md) acota geometría,
   navegación y colisiones del enlace bastión → muro. Primero,
   el [modelo recto candidato](../art/recipes/e3b-walkway-candidate/README.md)
   reveló que el pretil lateral de G-27 bloqueaba la unión. La
   [variante con abertura](../art/recipes/e3b-bastion-joint-candidate/README.md)
   ya pasa la comprobación geométrica por CPU y la
   [exportación aislada](historico/graphics-rounds/E3b0-exportacion-candidata.md)
   pasó Blender, `game-dev asset inspect` y GLTFLoader. Los tres GLB se
   [publicaron como G-32](historico/graphics-rounds/G-32-e3b-candidatos.md)
   y E3b.1a añadió un selector y ruta puros con pruebas focales. E3b.1b
   ensambló selectivamente la primera junta, y E3b.1c añadió navegación y
   colisiones. La [revisión E3b.1d](historico/graphics-rounds/E3b1d-revision-app.md)
   observó la subida continua del guardia y flechas en un asalto controlado;
   la autoría de cada flecha y el defecto previo de sombras no quedan
   resueltos por esa captura. El [inventario E3b.2a](historico/graphics-rounds/E3b2a-inventario-topologia.md)
   midió rectas, diagonales, portones y árboles junto al tablero en dos villas;
   el [encargo E3b.2b](historico/encargos/encargo-e3b2b-modelos-candidatos.md) prepara
   variantes de giro, diagonal y portón. La [sonda E3b.2b](historico/graphics-rounds/E3b2b-candidatos-y-puertas.md)
    deja el codo condicionado a sus juntas; la segunda sonda mide el paso
    diagonal; la primera alma falló 22 de 95 puntos sobre el muro real. Una
    variante más estrecha con clave de vértice apoya 2.115 de 2.121 puntos,
    puentea la costura y queda condicional. El GLB del portón deja 0,667 de
    abertura visual frente a 0,84 de paso lógico. La variante de marco amplio
    se exportó en aislamiento y
    pasó geometría estática y giro de hoja, sin aprobarse en partida. El [contrato E3b.2c](historico/encargos/encargo-e3b2c-integracion-selectiva.md)
   queda preparado, sin despachar integración hasta aprobar geometría.
   E3b.2 sigue abierta y la tala cercana
   debe hacer visible el espacio ganado al bosque.
   E2 quedó integrado
   y observado en partida real (G-28); el puesto elevado navegable E3a está
   cerrado con límites medidos en G-29. La sala del rey es deuda independiente
   en H. Sol dirige software; Astra sólo 3D excepcional y con permiso nuevo.
4. **Decisiones del dueño** — E4 (fuego y gore) y el nivelado que G ya dejó
   medido. Ningún agente inventa esos criterios.
5. **Final del crecimiento** — A3b, sólo después de definir qué significa el
   techo de la partida y cómo se juega el anillo final.
6. **Deuda no bloqueante** — medida adicional en móvil tras P-1, reunión de
   §11.8, jornadas declaradas y F3f.

---

## 3. Lo que ningún agente decide

- **Qué es caer** (B3), **con qué físicas** (D1) y **cómo se ve el gore** (E4):
  del dueño.
- **Cuánto hay que nivelar** (G): del dueño, con las medidas delante.
- **Qué encargar a Blender y en qué orden** (E): del dueño con la sesión de
  arte; este plan sólo dice qué hace falta y para cuándo.
- **Qué es el anillo final en detalle** (A3b): aclarado que existe y cuándo
  llega —al techo de crecimiento del valle—, pero no cómo se ve ni cómo se
  juega. Es del dueño, con D6 delante.

Cuando una fase se abra, su brief se escribe aparte con lo de siempre: ficheros
que toca, contrato de API, pruebas exigidas, criterio de terminado y **la
medida** con la que se cierra.
