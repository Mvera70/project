# The Valley — el plan hacia la meta

**La meta está en `docs/design.md` §1b (18 sep 2026): una villa cerrada que cae
o aguanta.** Este documento es el mapa para llegar: los puntos que hay que
desarrollar, las fases de cada uno, qué va antes, cuánto cuesta y a qué agente
se le da. No detalla ninguna fase —cada una tendrá su brief cuando le toque,
como `plan-medios.md` o `plan-rey.md`—; lo que fija es **el orden y el reparto**.

Lo pidió el dueño del diseño con estas palabras: «necesito saber qué es
prioritario, qué va después y la dificultad de la tarea para así poder
destinarla a diferentes agentes en función de la dificultad».

---

## 0. Cómo se lee

**El hueco medido el 18 sep, y es lo primero que va a pedir nivelado (G):** la
fase 2 se cierra a las **61 h** de reloj (edad de piedra) y la fase 3 a las
**425 h** (villa cerrada). Entre una y otra hay más de trescientas horas en las
que el valle hace lo mismo. O la muralla llega antes, o la fase 2 se estira con
contenido, o las dos: es la decisión de balance que abre el punto G.

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
horas de reloj si decide *cuándo* pasa algo (`npx tsx tools/pace-report.ts`),
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
| A3 · El segundo anillo | Cuándo la aldea desborda el primero y pide el siguiente tres celdas afuera (v3.88 lo dejó en uno); lo de dentro queda «intramuros». **Y con A4 se le suma el bastión**: una torre **en la línea** del anillo, que hoy no se puede porque es 2×2 sobre un cerco de una celda —taparía dos o tres tramos y `upgradeOf` sólo da de baja uno, o sea un boquete con `ringClosed` diciendo que está cerrado—. Pide `ringClosed` y `wallRuns` de la mano, que son de esta fila. Medido: 4 de 20 torres acaban **pegadas por fuera** porque en un valle ya cerrado no queda un solar de 2×2 que respete la calle de §7.4 | P2 | Media | Sol | A1 |
| ~~A4 · La villa de piedra~~ · **hecha el 18 sep 2026**, y lo que destapó es que **la muralla de piedra era contenido muerto**: `wall` tenía tabla, mejora y dibujo de crónica, y su única puerta era la encrucijada de la primera piedra (A.16), que **obliga a elegir** entre la muralla y las casas. Medido en doce semillas a ochenta años: se desbloquea en diez y **las diez eligen las casas** (+12 de ánimo contra +6 y sin bandera mala), o sea **cero valles con un solo muro de piedra**. Ahora hay dos puertas y no una: **un cerco cerrado la abre por sí solo** (`flags['wall_closed']`, la marca de A1 — sin campo nuevo y sin migración), y la encrucijada sigue abriéndola **antes**, que es lo que el jugador paga con las casas frías. Medido: **10 de 12 valles con muralla de piedra** (65 tramos en la semilla 91) y en la escalera del ritmo a las **249 h de reloj**, la misma hora que la villa cerrada — el contrato dicho en cifras. **La era** vive en `src/derive/era.ts`: se **deriva y no se guarda** (misma decisión que §7.4c tomó con el anillo) y es monótona a propósito — un valle al que le tiran la fragua sigue siendo una aldea. Peldaños nuevos en `pace-report`: **aldea a las 40 h** (23 de 24 valles) y **villa a las 249 h** (15 de 24). **Y la torre va contra el cerco**: no tenía caso propio en el marcador de §7.4, así que caía lo más cerca posible de la plaza y C2 le colgaba un arquero tierra adentro; de **10 de 20 pegadas al cerco a 20 de 20**, media al muro de 2,2 a 1,4 celdas | Hecho | Media | — | A1 |
| A5 · La fase en la interfaz | La cabecera y la crónica dicen en qué fase está el valle | P3 | Baja | Luna, Terra | A4 |

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
| ~~D4 · Cuerpo a cuerpo~~ · **el núcleo, hecho el 18 sep 2026**: `life/melee.ts`. Lo que decide es **la distancia** —el alcance de un brazo, 0,9 celdas, muy por debajo del empujón contra el portón— y las dos armas no valen igual: el de la lanza devuelve todos los golpes y **el arquero la mitad**, que es el defecto clásico del arquero y lo que hace que una muralla necesite las dos cosas (C1). Doce contra uno acaban con él. A quien cae se le acaba la jornada ahí, y el motor lo entierra cuando lee el parte (B4, `lost`, que **deja de ser cero**). Medido: de 0 a 3 bajas propias por asalto en cuatro valles × dos maneras. **Falta el ragdoll** —los cuerpos de la gente no son cuerpos de Rapier todavía, y eso es una tanda entera— y los clips (E1: `spear_thrust`, `hit_take`, `fall`) | Hecho (el núcleo) | Alta | — | D3 |
| ~~D5 · Lo que se rompe~~ · **el portón, hecho el 18 sep 2026**: aguanta sesenta golpes y los golpes son **manos**, así que matar a la mitad de la partida dobla lo que tarda en caer — es la carrera de la fase 4, y los dos números están elegidos contra la arquería de D2 medida. Cuando cede, el parte de B4 dice `breached` y **la partida se acaba**; el boquete en el anillo lo abre el motor (`THREAT.BREACH`). **Falta lo que arde**: las casas durante el asalto son E4 y es decisión del dueño | Hecho (el portón) | Media-alta | — | A2, D3 |
| D6 · El saqueo | La escena de cuando cae: la entrada, la gente, el final que se ve | P3 | Alta | Astra | D4, D5, B3 |

### E · Arte y animación (sesión de arte)

**Es el camino largo y hay que empezarlo pronto**: hoy no existe un solo clip
de pelea.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| E1 · Clips de combate | Arco (tensar, soltar), lanza, recibir un impacto, caer y huir. **Encargo escrito: `encargo-combate.md`** (18 sep), sobre el aparejo del aldeano que ya existe | **P1** (empezar ya) | Alta | Sesión de arte | — |
| E0 · **Lo que pasa y no se ve** | Ocho mecánicas ya en `main` que sólo salen como línea de crónica: el asalto, el aviso, prepararse, pagar, la semana de después, armas, arcos y la atalaya vacía. El inventario está en `docs/encargos-3d.md` §1 | **P1** | Media-alta | Astra (diseño) · Sol (capa de vida) | — |
| E2 · Modelos del asedio | **El clan vecino**: aldeanos armados de otro valle —no soldados de cota ni bandidos andrajosos—, arco, flecha, espada, escudo | P2 | Alta | Astra · sesión de arte | — |
| E3 · Portón, muralla de piedra, torre | Las mallas de la fase 3; el portón con dos estados y roto | P2 | Media | Sesión de arte | A2, A4 |
| E4 · Fuego, humo, gore | Cómo se ve arder una casa en el asalto y cómo se ve morir; **el gore es decisión del dueño** («ya veremos cómo») | P4 | Alta | Dueño → Astra | D5, D6 |

### F · Interfaz y crónica

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| F1 · Textos del banco | Todo lo nuevo en `bank.en.ts`: el aviso, el asalto, el portón, las bajas, el cierre | P2 | Baja | Luna, Terra | cada fase que los pida |
| F2 · La alerta y el HUD del asedio | Qué viene y cuándo; durante el asalto, lo que aguanta el portón y las bajas | P3 | Media | Sol | B2, D3 |
| ~~F3 · La pantalla del final~~ · **F3a, F3b, F3c y F3e hechas el 18 sep 2026** (plan y medidas en `plan-final.md`): el libro de cuentas (`engine/chronicle/ledger.ts`, y **sin subir el esquema** porque casi todo se recuenta de la crónica), la hoja de cuentas con tres cifras grandes y quince filas sobre el documento que ya existía, y la lápida —capitular de la palabra que nombra el final e inscripción en Cinzel que se graba sobre el valle atenuado, con el HUD escondido—. Fotografiadas las cuatro causas. **Falta F3d** (el cronicón, comparar partidas) y F3f (la hoja como imagen, sin prioridad) | P3 (lo que queda) | Media | Sol | B3 hecha |
| F4 · La captura de cada fase | Ninguna ronda de interfaz se cierra sin captura (`npm run shot`) | — | Baja | Luna, Terra | — |

### G · Ritmo, balance y letalidad (transversal, y va después)

El dueño lo puso al final: «todo eso se irá nivelando y se irá haciendo el
juego más difícil». Se toca cuando lo de arriba exista.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| G1 · El hambre muerde | El grano toca cero y no mata a nadie; con B-1 el ánimo casi no baja de 25 | P4 | Media | Sol | — |
| G2 · El banco de balance rehecho | Contra la escalera en horas, no contra la de años (`test:balance`, hoy 19 rojas de 37 de antes de B-1) | P4 | Media | Luna, Terra (medir) · Sol (cotas) | — |
| G3 · Plantillas para el caserío | No hay una sola encrucijada que un valle de menos de diez personas pueda ver: la primera decisión llega a las 14 h | P3 | Baja-media | Luna (escribir) · Sol (condiciones) | — |
| G4 · La curva de dificultad | La letalidad por decisiones: qué decisiones acumulan la caída, medido con `fate-chaos` (hoy 0 de 12 valles caen) | P4 | Media | Sol | B1, D |

### H · Deuda medida (el cuaderno)

Lo que `docs/task-log.md` §4 lleva anotado con su medida y **no bloquea la
meta**, pero hay que ir bajando:

| Qué | Dificultad | Agente |
|---|---|---|
| La reunión de §11.8 no cabe en una aldea de 70 (se junta el 54 %) | Media | Sol (capa de vida) |
| Las once jornadas rojas de la familia R-1 y la del devoto | Baja (medir y declarar) · Media (arreglar) | Luna, Terra → Sol |
| Las mallas encargadas: arado, fuente, sala del rey | Media | Sesión de arte |
| El hacha es el medio más flojo; `quiet_years` no sale | Baja | Dueño (decisión) → Luna |

---

## 2. El orden

Lo que va junto puede ir en paralelo a agentes distintos; lo que va debajo
necesita lo de arriba.

1. **Ahora** — **A1** (el cierre se ve), elegido por el dueño el 18 sep. Las
   decisiones que bloqueaban este paso están tomadas (§1b de `design.md`): caer
   tiene dos tamaños, ataca un clan vecino, y las físicas son Rapier. En
   paralelo, **E1** (los clips de combate, porque el arte tarda más que todo lo
   demás) y **D1** (la integración de Rapier, que ahora es lo que bloquea toda
   la letra D).
2. **El motor del asedio** — B1 (la amenaza), B4 (la puerta de vuelta), C1 (los
   medios de defensa). Es donde el asedio deja de ser una idea y pasa a ser un
   número que crece en el estado.
3. **Lo primero que se ve** — D2 (flechas y aldeanos-torre), C2 (la
   guarnición), C4 y F1 (el carro y los textos). Con esto un valle ya se
   defiende de algo, aunque el algo todavía no entre.
4. **El enemigo** — D3 (el bando hostil), D5 (lo que se rompe), B2 (el aviso),
   F2 (la alerta). Aquí el asedio existe entero salvo el final.
5. **El final** — D4 (cuerpo a cuerpo), D6 (el saqueo), F3 (la pantalla del
   final), E4 (fuego y gore).
6. **Nivelar** — G entero, cuando haya juego que nivelar, que es donde el
   dueño lo puso.

A2, A3 y A4 (portón, segundo anillo, villa de piedra) van entre el paso 1 y el
4 según haga falta: el portón antes de D3, la piedra cuando el arte la tenga.

---

## 3. Lo que ningún agente decide

- **Qué es caer** (B3), **con qué físicas** (D1) y **cómo se ve el gore** (E4):
  del dueño.
- **Cuánto hay que nivelar** (G): del dueño, con las medidas delante.
- **Qué encargar a Blender y en qué orden** (E): del dueño con la sesión de
  arte; este plan sólo dice qué hace falta y para cuándo.

Cuando una fase se abra, su brief se escribe aparte con lo de siempre: ficheros
que toca, contrato de API, pruebas exigidas, criterio de terminado y **la
medida** con la que se cierra.
