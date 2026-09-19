# El plan: convertir esto en un juego

> **CERRADO · entregado el 15 sep 2026 (v2.0).** Dio el verbo del juego, el
> mapa grande y el vado que se cruza. Las tres palancas de órdenes que
> propone **se retiraron** en M-2 por decisión del dueño («no me gustan para
> nada»): lo que las sustituye es el juego de los medios (`docs/historico/plan-medios.md`).
> Se conserva porque el código lo cita y porque explica por qué el juego
> tiene el verbo que tiene. **Lo que hay que hacer ahora está en
> `plan-meta.md`.**

**15 de septiembre de 2026.** Escrito después de que el dueño del diseño jugara
la demo, dijera que la desestimaba —*«no tiene ningún sentido jugar, los
recursos que mostramos no sirven para nada, no hay ninguna manera lógica de
llevar una estrategia, la aldea no muta entre partidas»*— y me pasara la rienda:
*«toma todas tú las decisiones.»*

**Así que las tomo.** Este documento no ofrece opciones: dice qué se hace, en qué
orden, qué se congela y qué decisión escrita del diseño queda derogada. Sustituye
a `docs/historico/next-plan.md` como orden de trabajo.

---

## 1. El diagnóstico, en una frase

**El juego no tiene verbo, así que nada de lo que se muestra significa nada.**

La única acción del jugador es contestar una encrucijada, entre siete y doce
veces en cuarenta años. Todo lo demás lo decide la aldea sola:

| Lo que decide la aldea, no tú | Dónde |
|---|---|
| Cuántos campos se trabajan | `allocateLabour` — exactamente los que la población necesita, ×1,3 |
| A qué van las manos que sobran | `allocateLabour` — un reparto fijo, `CUTTER_SHARE` |
| Qué se construye después | `nextProject` — una lista de prioridad fija |
| Dónde se pone cada cosa | `placement` |

De ahí sale, una por una, cada cosa que se señaló:

- **«Los recursos no sirven para nada.»** Exacto: los cuatro son de sólo
  lectura. Un número significa algo cuando **se mueve porque tú hiciste algo**.
  Ninguno de los cuatro lo hace.
- **«No hay respuesta visual.»** No puede haberla: no hay acción a la que
  responder. Lo que cambia en el valle lo cambia el motor, y por tanto no es
  atribuible a nadie.
- **«Los mensajes no aportan.»** Son prosa de la crónica pasando por delante. Ni
  preguntan, ni contestan, ni piden nada.
- **«Las decisiones se sienten vacías.»** Llegan dos veces por década y su
  consecuencia es un delta de estadística más una frase.
- **«La aldea no muta entre partidas.»** Tres recetas fijas: un mapa, un orden de
  construcción, y las mismas ocho o diez encrucijadas de veinte.

**Y no es un fallo: está escrito.** §1 decide «derrota sólo por población cero».
§1 decide «la fuente de letalidad son las encrucijadas, no el mundo», y la
simulación base mata el 3 % de las aldeas en doscientos años **a propósito**.
§11.1 decide «el valle es el HUD, ni una cifra por defecto». Esas tres juntas
producen exactamente un valle que se mira, que no puede castigarte, y donde tu
única entrada llega dos veces por década.

Por eso puliendo no sale. Las últimas cinco rondas —cámara, objetos, mensajes,
iconos, reloj— mejoraron cómo se ve sin mover nada de esto. Estaban todas en la
altitud equivocada, y eso es mío.

---

## 2. Las decisiones que tomo

Seis, y tres derogan cosas escritas en `docs/design.md`.

**D-1 · Esto es un juego, no un jardín.** El jugador tiene palancas. Un jardín se
mira y lo que da placer es que cambie sin ti; un juego se juega. El documento
describe un jardín con una decisión ocasional encima, y lo que se pide es un
juego.

**D-2 · El invierno es el antagonista, y el año es la ronda.** Ya está todo en el
motor y nadie lo está jugando: hay que llegar a la semana 36 con grano para las
bocas y leña para los fuegos (§5.3, §5.4). Hoy la aldea resuelve eso sola. **A
partir de ahora es tu trabajo.** Eso le da al juego un pulso que se siente —
primavera y verano te comprometes, otoño cosechas, invierno pagas — y hace que
las cuatro cifras sean el marcador de ese pulso.

**D-3 · Dos palancas, no cuatro.** Cuánto se esfuerzan en el campo, y cómo se
reparten las manos sobrantes entre cortar leña y construir. **Dos palancas con
consecuencia de verdad valen más que cuatro decorativas**, y añadir una tercera
sin mecánica detrás es exactamente cómo se llega a «los recursos no sirven para
nada». Guardia no entra hasta que haya algo de lo que guardarse.

**D-4 · §11.1 queda derogada en parte.** «Ni una cifra por defecto» era coherente
con un valle que se mira. Un mando necesita lectura, y la tira de arriba pasa de
ser un parte a ser **el instrumento**: cada cifra es la respuesta de una palanca.
Lo que sobrevive de §11.1 es lo importante: el valle sigue siendo lo que ocupa la
pantalla, y no habrá paneles de estadísticas.

**D-5 · «Nunca se pierde por no abrir la app» sobrevive, y es lo que lo mantiene
idle.** Una postura razonable sostiene la aldea sola durante semanas. Lo que
cambia es que una postura **buena** hace crecer la aldea y una **mala** la deja
pobre, fría y pequeña. Se empobrece, no se muere.

**D-6 · La partida por defecto reproduce el juego de hoy, al bit.** Las palancas
arrancan en los valores que la fórmula actual usa. Eso no es timidez: es lo que
permite comprobar que el cambio no rompe el balance —la suite tiene que dar lo
mismo con la postura por defecto— y es la única manera honesta de tocar el
corazón de §5.2.

---

## 3. El bucle que falta

Cinco pasos, y hoy sólo existe el tercero:

1. **Fijas la intención de la aldea.** No micromanejo: una postura que dura hasta
   que la cambies.
2. **La aldea la ejecuta, y con límites que no negocia.** Un campo con menos de
   dos manos no da nada; nadie trabaja si no ha comido; siempre queda alguien en
   la obra, porque un valle que no cambia es el pecado capital de este juego.
3. **El mundo hace lo suyo:** estaciones, cosecha, peste, lobos. *(Existe.)*
4. **Las cifras y el valle contestan, y se puede atribuir:** la comida baja
   **porque** mandaste las manos al bosque.
5. **Las encrucijadas llegan como consecuencia de tu postura**, no como sorteo.

El cuarto paso es la «respuesta visual» que falta y el primero es la
«estrategia». Sin el primero, el cuarto es imposible.

---

## 3.1. Estado: E1 a E5 **entregadas**, 15 sep 2026

Las cinco están en la rama, cada una con su commit y su medida, y la demo se
juega en `https://claude.ai/artifact/CbbvpwDfa5NUoog9E7XiMK`.

| Entrega | Commit | Lo que se mide |
|---|---|---|
| E1 · el verbo | `9c6726c` | `allocateLabour` obedece a `state.intent`; con la postura de reposo la suite de balance no se mueve (D-6) |
| E2 · se ve | `c50534f` | Talar y construir no tenían **sitio** en el valle: `placesOf` saca los sitios de los edificios y dos de los tres destinos no son edificios |
| E3 · la cola de obra | `a9d4ad4` | `nextProject` ordena por la familia que el jugador elige |
| E4 · la aldea contesta | `aff4626` | Flechas de tendencia y `answer.ts`: «te he entendido y no puedo» |
| E5 · dos valles distintos | `4c50ca4` | Dos rasgos de cuatro por valle; murallas de 8 a 99 tramos según el valle |

**Lo que vino después, en la misma sesión:** el reloj a velocidad entera, los
tres defectos de los mensajes, el mapa grande y el vado. Todo con su medida en
`docs/handover.md` §2.1.

**Lo que esta ronda midió y dejó abierto:** la última década de una partida de
sesenta años está vacía —con los dieciséis a piedra y la empalizada levantados,
el 100 % de las semanas no tienen nada que querer construir—. Antes de eso la
aldea levanta de 67 a 99 obras y la piedra llega en los años 42 a 45, así que el
problema es el final de la partida y no su medio.

**Y una advertencia que costó media página de conclusiones falsas:** la primera
versión de esa medida avanzaba el mundo con `tick` sin contestar las
encrucijadas y decía «de 0,3 a 0,5 obras al año y la piedra nunca». Está contado
en `docs/handover.md` §2.1.

---

## 4. Las entregas. Cada una se juega y se juzga sola

**La regla que ordena esto: ninguna entrega depende de la siguiente para tener
sentido.** Si la primera no enciende nada, se para ahí y se ha perdido una
semana, no dos meses.

### E1 · Las dos palancas *(la que decide todo)*

**Qué.** `GameState` gana una intención de dos números y `allocateLabour` deja de
ser una fórmula cerrada para obedecerla:

| Palanca | Qué hace | Rango | Por defecto |
|---|---|---|---|
| **`fields`** | Cuántos campos se trabajan, como múltiplo de lo que hace falta | 0,5 – 2,0 | **1,0** (lo de hoy) |
| **`timber`** | De las manos que sobran, cuántas van al bosque en vez de a la obra | 0 – 1 | **`CUTTER_SHARE`** (lo de hoy) |

Lo que **no** se negocia, y por eso sigue siendo una simulación y no una hoja de
cálculo: `MIN_FIELD_CREW` (un campo mal dotado no da nada), la reserva de obra
como suelo, y los cuervos y el forrajeo, que son emergencias y se sirven antes
que tu postura.

**El triángulo que esto abre**, y es el juego: comida, calor y crecimiento, con
tres manos para dos sitios. Apretar el campo llena el granero y deja el pueblo
sin construir ni leña. Apretar el bosque calienta el invierno y no da de comer.
Apretar la obra hace crecer la aldea y te deja a merced de una mala cosecha. **Y
el invierno es quien juzga**, cada año, con lo que el motor ya tiene escrito.

**Lo que cuesta.** `state.ts` (dos números, `SCHEMA_VERSION` a 4), `labour.ts`,
`found.ts`, `save.ts` (una partida vieja entra con la postura por defecto),
`app.ts` e `index.html`, y **una pasada de balance de 18 minutos** — que con la
postura por defecto tiene que dar exactamente lo de hoy (D-6).

**Terminado cuando** mueves la palanca al bosque y en tres o cuatro ticks la leña
sube y el grano baja, y se ve en la tira sin abrir nada.

**Qué lo falsaría, y es la pregunta seria:** que la aldea aguante igual de bien
cualquier postura. Si las cinco posturas dan la misma partida a los veinte años,
las palancas son decorado y hay que subir las consecuencias **antes** de seguir.
Se mide con el banco: cinco posturas fijas × las semillas de siempre, y la
distancia entre la mejor y la peor tiene que ser grande.

### E2 · El valle obedece, y se ve

**Qué.** Cada palanca con su respuesta en el valle en el mismo tick o el
siguiente: manos al bosque y hay gente talando **en el bosque**, el bosque
retrocede y las leñeras crecen; manos al campo y los campos se trabajan; manos a
la obra y el andamio tiene gente encima.

**Por qué es barata.** La capa de vida ya pone a cada uno donde está su trabajo:
`offers.ts` reparte plazas por oferta. Lo que falta es que el número de plazas de
cada oferta salga de tu reparto en vez del recuento de edificios.

**Lo que cuesta.** `life/offers.ts`, `life/places.ts`. Nada de motor.

**Terminado cuando** alguien que mire la pantalla veinte segundos pueda decir qué
está haciendo la aldea sin leer una cifra.

### E3 · La cola de obra

**Qué.** `nextProject` deja de ser una lista de prioridad y pasa a ser una cola
que reordenas. El motor sigue decidiendo dónde cabe y cuánto tarda; **qué se
levanta primero, no.**

**Terminado cuando** dos partidas de la misma semilla con colas distintas son
aldeas distintas a los veinte años.

### E4 · Que la aldea conteste

**Qué.** Los mensajes dejan de ser prosa pasando por delante y pasan a ser la
aldea contestando a tu postura: «el alguacil dice que los campos no pueden
soltar tres manos más», «el herrero no tiene con qué trabajar». Y cada cifra
lleva su causa: no «comida 40», sino «comida 40, y bajando».

**Terminado cuando** puedas decir, sin abrir nada, por qué ha bajado cada cifra
que ha bajado.

### E5 · Que dos valles no se parezcan

**Qué.** Arquetipos de mapa —de bosque, de marisma, alto y pobre, ancho de río—,
dos o tres rasgos por valle del estilo de las banderas que §8 ya tiene, y la cola
inicial saliendo de lo que ese valle tiene.

**Por qué va la última de las cinco.** Variar el mapa sin palancas sólo cambia el
papel pintado. Con palancas, cambia qué postura funciona, y entonces sí cambia la
partida.

---

## 5. Lo que se congela

Hasta que E1 y E2 estén jugables **no se toca nada de esto**, por mucho que se
vea mal:

- El mapa grande (V-15/V-16). Un mapa cuatro veces mayor de un juego sin verbo es
  un jardín cuatro veces mayor.
- Más modelos, más objetos, más arte.
- La cámara, los iconos, la tipografía, los colores.
- V-11 y el resto del Anexo E. La capa de vida ya hace su trabajo; lo que le
  falta es tener algo que obedecer, y eso es E2.
- Los siete recorridos de captura declarados.

**No es que estén mal: es que ninguno contesta la pregunta de por qué jugar.**

---

## 6. El experimento que decide si el proyecto sigue

**E1 más E2, y después jugarlo.**

- **Si mover las manos y ver al valle obedecer no da ganas de seguir**, la
  premisa es el problema y desestimarlo es la decisión correcta — tomada con
  evidencia en vez de con cansancio.
- **Si se enciende**, E3, E4 y E5 son el juego, y todo lo construido hasta ahora
  pasa a tener algo que vestir.

Y la deuda más vieja sigue sin saldarse: **el hito 0 nunca lo ha leído un
tercero.** Tres crónicas, sin contexto, y una pregunta: *¿en qué se diferencian
estas tres aldeas?* Si alguien ajeno contesta «en nada», eso confirma «la aldea
no muta» desde fuera y E5 sube al primer puesto.

---

## 7. Qué queda vivo de lo hecho

Para decidir sabiendo lo que hay y no sólo lo que falta:

| Qué | Estado |
|---|---|
| El motor | Completo y medido. Demografía, subsistencia, opiniones, encrucijadas, animales, comercio, crónica. Cuarenta años que se sostienen |
| El render 3D | G-00 a G-17. Cámara que gira, 42 recursos, estaciones, luz del día, relieve |
| La capa de vida | Cuerpos que chocan, se paran a hablar, se pasan una pelota. Es lo que falta enganchar a una intención |
| Las herramientas | Capturas sin red, banco de arte con Blender, sondas, medida de brillo |
| Las rejas | typecheck, lint, 1 026 rápidas, 94 de recorrido, 6 de PWA, 13 de captura. Verdes |

**Lo que no hay es un verbo.** Todo lo de arriba es el escenario, y está bien
construido. Falta lo que el jugador hace dentro.
