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
| A3 · El segundo anillo | Cuándo la aldea desborda el primero y pide el siguiente tres celdas afuera (v3.88 lo dejó en uno); lo de dentro queda «intramuros» | P2 | Media | Sol | A1 |
| A4 · La villa de piedra | La muralla de piedra (`wall`) y las torres como mejora del anillo; la **era** en el estado (`hamlet · village · town`) | P2 | Media | Sol | A1 |
| A5 · La fase en la interfaz | La cabecera y la crónica dicen en qué fase está el valle | P3 | Baja | Luna, Terra | A4 |

### B · Quién viene y por qué (el motor del asedio)

Lo que sigue siendo del motor y de la semilla: **quién llega, cuándo y con
cuánto**, por lo que la aldea acumuló y decidió (§1, la fuente de letalidad).

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| B1 · La amenaza en el estado | **El clan vecino** (decidido el 18 sep): un valle que crece con los años por su cuenta, y lo que tú acumulaste decide el premio y la dureza. Un flujo `raid`; cuándo llega y con cuánto | **P1** | Media | Sol | — |
| B2 · El aviso | Exploradores, rumores, un plazo: plantillas de encrucijada («riders at the ford»), crónica, y lo que el jugador puede hacer con el aviso | P2 | Media | Sol (motor) · Luna (textos) | B1 |
| B3 · Qué es «caer» | **Decidido el 18 sep**: dos tamaños — el asalto pequeño se saquea y se sigue; el grande que entra acaba la partida. Queda implementarlo: `ended.cause` nuevo, qué se pierde en un saqueo | P2 | Media | Sol | B1 |
| B4 · La puerta de vuelta al motor | El resultado del asalto entra como datos por donde entra `PlayerAct` («lo que el mundo hizo»: muertos, edificios perdidos, grano robado); guardados que siguen cargando | **P1** | Media-alta | Astra (diseño) → Sol | B3 |

### C · Con qué se defiende la aldea (dar, no colocar)

El patrón de M-2: el jugador **da** y la aldea decide.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| C1 · Los medios de defensa | Armas a la herrería, arcos, portón, atalaya en el carro, cada uno con su cara mala (el señor cuenta las armas, la madera que no va a casas) | P2 | Media | Sol | B1 |
| C2 · La guarnición | Quién sube a la muralla: oferta `guard`/`archer` en la jornada, el herrero, el rey herrero que pone a más | P2 | Media | Sol | C1 |
| C3 · Atalaya y torres como obra normal | Hoy la atalaya sólo llega por encrucijada; pasa a §7.3 con su puerta medida | P3 | Baja | Luna, Terra | A4 |
| C4 · La fila del carro | La interfaz de dar defensa, con el precio en fichas y el motivo cuando no se puede | P2 | Baja | Luna, Terra | C1 |

### D · La batalla física (fase 4 de la meta)

**Aquí manda la física, no el motor**, por decisión del dueño (§1b): se ve,
es divertido, y el resultado es el que sale.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| D1 · Rapier, integrado | **Decidido el 18 sep: Rapier (WASM) desde el principio.** Casarlo con el paso fijo de la capa de vida, el presupuesto de ~1 MB en móvil y una medida de fotogramas en dispositivo | **P1** | Alta | Astra | — |
| D2 · Flechas y aldeanos-torre | Flechas como cuerpos de Rapier con gravedad e impacto; el aldeano en la muralla o la atalaya que dispara a lo que entra en alcance | P2 | Media | Sol | **D1** (sin Rapier no hay flecha), C2 |
| D3 · El bando hostil | Cuerpos enemigos que llegan por el camino con su IA: acercarse, romper el portón, entrar, buscar a la gente y lo que arde | P2 | Alta | Astra | D1, B1 |
| D4 · Cuerpo a cuerpo | Golpe con alcance, empujón, caída; muertes que salen de la física | P3 | Alta | Astra | D3 |
| D5 · Lo que se rompe | El portón que cede, la muralla que se abre, las casas que arden durante el asalto | P3 | Media-alta | Sol → Astra | A2, D3 |
| D6 · El saqueo | La escena de cuando cae: la entrada, la gente, el final que se ve | P3 | Alta | Astra | D4, D5, B3 |

### E · Arte y animación (sesión de arte)

**Es el camino largo y hay que empezarlo pronto**: hoy no existe un solo clip
de pelea.

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| E1 · Clips de combate | Arco (tensar, soltar), espada (golpe), recibir un impacto, caer y quedar | **P1** (empezar ya) | Alta | Astra · sesión de arte | — |
| E2 · Modelos del asedio | **El clan vecino**: aldeanos armados de otro valle —no soldados de cota ni bandidos andrajosos—, arco, flecha, espada, escudo | P2 | Alta | Astra · sesión de arte | — |
| E3 · Portón, muralla de piedra, torre | Las mallas de la fase 3; el portón con dos estados y roto | P2 | Media | Sesión de arte | A2, A4 |
| E4 · Fuego, humo, gore | Cómo se ve arder una casa en el asalto y cómo se ve morir; **el gore es decisión del dueño** («ya veremos cómo») | P4 | Alta | Dueño → Astra | D5, D6 |

### F · Interfaz y crónica

| Fase | Qué | Prioridad | Dificultad | Agente | Depende de |
|---|---|---|---|---|---|
| F1 · Textos del banco | Todo lo nuevo en `bank.en.ts`: el aviso, el asalto, el portón, las bajas, el cierre | P2 | Baja | Luna, Terra | cada fase que los pida |
| F2 · La alerta y el HUD del asedio | Qué viene y cuándo; durante el asalto, lo que aguanta el portón y las bajas | P3 | Media | Sol | B2, D3 |
| F3 · La pantalla del final | Cayó o aguantó, con la crónica de esa partida | P3 | Media | Sol | B3 |
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
