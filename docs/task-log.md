# Cuaderno de tareas — el rework

## 21 sep 2026 · Recuperación espacial de bajo coste — cerrada localmente

El dueño cambia la orquestación: Sol dirige como modelo fuerte; Astra sólo
para excepciones, especialmente 3D; Terra/Luna para encargos sencillos.
Sol localizó la transición de tala que saltaba la reserva y Terra añadió
puestos exclusivos con espera local conservando la carga. Luna midió los
71.160/514.561 acercamientos <0,60 de V-06: el test conservaba la huella
anterior a IA-14. La penetración visible es 83/522.213 (0,016 %) con el claro
corregido y V-06 pasa sin cambiar la colisión. Terra dio al claro contemplación en vez de
trabajo inelegible: V-10 pasa 9/9 con plaza, vado y claro visitados en al
menos 3/6 jornadas. V-06 9/9, recursos/distribución/defensas/viviendas 20/20, tipos y
lint verdes. La suite rápida de cierre quedó 1.682/1.686; los tres asertos
de clips obsoletos se corrigieron y pasan aislados, y catch-up pasó aislado
tras fallar su tiempo bajo carga paralela. Fase aceptada **localmente** con
otros rojos de jornadas sin atribuir; sin commit ni publicación.
[Detalle](plan-espacial.md).

## 21 sep 2026 · Aldea orgánica y recinto honesto — implementado, aceptación pendiente

Encargo ampliado por el dueño: caminos, plaza, edificios importantes, variedad
de casas, distribución menos cuadriculada y cierre/portones. Astra dirige y
ejecuta el núcleo; Terra audita independientemente. Caminos con obstáculos,
casas por bandas/hash y calles, plaza social real, defensas de ribera,
portones y cierre topológico, uniones diagonales y cuatro acabados de casa.
Semillas 7/23/41 cierran al año 40; 11 tiene trazado viable pero cae sin cerco
por condiciones de obra. Guardados sin recolocar. Contrato, pruebas, capturas
y límites en [plan-espacial.md](plan-espacial.md). Esta entrada cuenta el primer
estado, antes de la recuperación de arriba. E0 sigue siendo otra fase; no se
hace commit ni publicación por implicación.

## 21 sep 2026 · E0d, transiciones de muralla visibles

`ScenePlan` separa obras activas de edificios terminados y el renderer mantiene
sus solares procedurales en un registro propio. Una obra `gate`/`wall` que
sustituye una empalizada oculta sólo la fuente, recompone las defensas vecinas y
deja el hueco con base y estructura por etapas; al terminar, el solar se libera
y entra el edificio final. No toca estado, colisiones, navegación ni ritmo. La
sonda `--wallwork gate|wall --progress` parte de una estaca real. 11 pruebas
focalizadas, typecheck y lint verdes; capturas/trazas en
`artifacts/graphics/E0d/seed-7-*`, sin errores. [Informe](historico/life-rounds/E0d-transiciones-muralla.md).

## 20 sep 2026 · E0c, la semana posterior al saqueo

La única semana posterior a un saqueo deja dos o tres cargas fijas junto a un
granero/molino real (o casa si no lo hay); si la entrada `raid.beast` consta en
la crónica de llegada, deja además dos haces tumbados junto a un ancla de
ganado/casa. Es una lectura pura de `just_sacked`, `arrivedTick` y crónica: no
es inventario, oferta ni navegación, no escribe el motor y se reduce a nada si
el suelo no es honesto. Las ids y posiciones se reconstruyen idénticas los siete
días escénicos y desaparecen al tick siguiente. El observatorio acepta
`--aftermath [--beast]`; controles y pos-saqueo en 7/23, con el caso de ganado
visible en 23, dejan cero errores. 22 pruebas focalizadas, typecheck y lint
verdes. [Evidencia y límites](historico/life-rounds/E0c-semana-posterior.md).
No se cierra E0 completo ni se añaden activos, economía, combate o motor.

## 20 sep 2026 · E0, pagar al clan

La resolución física de `bought_off` / `turned_back` ya se ve una sola vez: en
el primer día de la semana exacta en que el motor ha hecho volver a la partida,
dos o tres adultos existentes cargan la paga y salen por el portón real hacia
la ladera, siempre por rutas navegables. La escena es efímera, no escribe en el
estado ni consume azar del motor; termina dentro de la jornada y los cuerpos no
vuelven a aparecer al día siguiente ni retienen su reparto. La guarnición queda
fuera de la selección. 24 pruebas focalizadas con E0a/E0b y guarnición,
typecheck y lint verdes. [Evidencia y límites](historico/life-rounds/E0-pago-al-clan.md).
E0 conserva semana posterior y transiciones de muralla.

## 20 sep 2026 · E0b, el mensajero trae el aviso

B2 ya tiene escena física: al cerrar la modal, un adulto vuelve a pie desde el
acceso real del clan durante la primera jornada posterior y desemboca en el
reparto/reunión normal. Astra autoriza la modal como corte de escena; dentro de
la vuelta no hay saltos. La revisión detectó y corrigió dos fallos del primer
prototipo: el relevo del renderer anulaba el origen en una partida continua y
el historial semanal repetía al mensajero cada amanecer. Flujo real modal→tick
validado en 7/23: máximo uno, controles cero, sin reaparición el segundo día,
errores, bloqueos, penetraciones ni deriva. 21 pruebas focalizadas, typecheck y
lint verdes. [Evidencia y límites](historico/life-rounds/E0b-aviso.md). E0 sigue
abierto por pago, semana posterior y transiciones de muralla.

## 20 sep 2026 · E0a, la aldea se prepara

La decisión `raiders_coming:brace` ya se ve mientras la partida sigue en
camino: 2–4 adultos disponibles meten cargas bajo techo por rutas reales y el
ganado usa casas interiores; la guarnición conserva prioridad y el reparto
normal vuelve al caducar la ventana. Dos valles activos/control: 47/49
habitantes, 4 porteadores en ambos, 3/4 entregas, 1/2 defensores conservados y
cero errores, penetraciones, bloqueos, deriva o atascos. 22 pruebas focalizadas,
typecheck y lint verdes. [Evidencia y límites](historico/life-rounds/E0a-preparacion.md).
Se cierra sólo **Prepararse**; E0 sigue abierto por aviso, pago, semana posterior
y transiciones de muralla. Sin motor, balance, fuego ni gore.

## 20 sep 2026 · Plan e inventario sincronizados tras D6

`docs/plan-meta.md` y `docs/encargos-3d.md` ya no presentan como abiertos el
asalto, las armas, los arcos, la ocupación de puestos, el portón roto, el
arado ni la fuente. E0 conserva sólo las escenas realmente invisibles; E2 y E3
quedan parciales por identidad del clan, adarve y bastión. La malla pendiente
fuera de esos dos bloques es la sala del rey. No se abre una ronda nueva.

## 20 sep 2026 · D6 y acabado físico terminados; parada

Saqueo con destino, gesto, carga y huella; transición terminal acotada;
ragdolls de once segmentos y seis tablas físicas por portón roto. Sol y Terra
implementan, el principal revisa y graba. La evidencia descubre y corrige rutas
desde la jamba y mezcla de ids de cuerpo/aldeano al colocar el caído.
66 pruebas focalizadas, typecheck y lint pasan. Dos aldeas muestran 2/3 cargas
y huellas, seis tablas y caída articulada de ambos bandos en posición correcta.
[Evidencia y límites](historico/life-rounds/D6-saqueo-y-fisica.md).
Sin daño/economía nuevos, sangre, fuego, push ni despliegue. Se termina aquí,
sin abrir otra tarea; `deliverables/` permanece ajeno y sin tocar.

## 20 sep 2026 · Puntos 3 y 4: visibilidad y huida terminados

El robledal atenúa sólo los árboles que ocultan el portón y el frente atacante.
Los raiders participan en la separación de cuerpos: pares-muestra a <0,3 celdas
bajan de 3927 a 47 en semilla 7 y de 4026 a cero en 23. Cambian los contactos
y sus tiempos, sin retocar daño, alcance ni cadencia para compensarlos.
Los civiles interrumpen su actividad, corren a un destino seguro alcanzable y
esperan allí; los defensores permanecen en puesto. `flee` procedural cierra los
gestos de E1, no el resto del arte ni D6. Dos Sol implementan y Terra audita.
La observación ajustó la opacidad a 0,06 y detectó/corrigió carrera por empujón
pasivo en refugiados. 131 pruebas focalizadas, typecheck y lint pasan.
[Evidencia y límites](historico/life-rounds/E3-visibilidad-y-huida.md).
Se termina aquí, sin abrir otra tarea, hacer push ni desplegar.

## 20 sep 2026 · Integración y defensa sin arqueros: puntos 1 y 2

Los siete modelos aceptados quedan integrados y publicados localmente en
`public/assets/valley3d/`: arco, lanza, flecha, escudo, portón, arado y fuente.
65 entradas en el manifiesto: siete nuevas y 58 anteriores conservadas.
Terra integra y Luna audita procedencia, hashes y conservación del catálogo.
El publicador admite lotes explícitos y no borra el directorio de destino.

D4 funcionaba sólo al inicializar la física de los arqueros. Se separa ese
enganche: ahora hay combate y bajas sin arcos, sin cambiar daño ni cadencia.
Regresión con semillas 7/23 sin Rapier inyectado y observación del juego real.
[Informe y límites](historico/life-rounds/E2-integracion-y-defensa.md).
El bloqueo de bundle por arado/fuente queda resuelto. No se hace push ni despliegue.
**Parada pedida por el dueño:** no abrir oclusión/solapes ni `flee`.

## 20 sep 2026 · E1b: contacto y reacción del cuerpo a cuerpo

Los siete modelos de la tanda anterior quedan aceptados por el dueño tal como
están, sin publicación todavía. La siguiente prioridad abordada es E1:
`spear_thrust` y `hit_take` procedurales, fechados por golpes reales en ambos
bandos. Caída prioritaria, sin cambiar daño, alcance, cadencia ni motor.
53 pruebas focalizadas, typecheck y lint; observación en 7 y 23, a 15 fps.
[Contrato](encargos/encargo-cuerpo-a-cuerpo.md) y
[evidencia y límites](historico/life-rounds/E1b-cuerpo-a-cuerpo.md).
E1 sigue parcial por `flee`; las armas siguen sin estar en las manos.
**Bloqueo de empaquetado detectado:** `npm run bundle` exige promover `plough`
y `fountain` desde que están catalogados. No se debilita la comprobación ni
se publican implícitamente: la observación de esta ronda usa Vite local.

## 20 sep 2026 · Siete modelos producidos, todavía sin publicar

Arco, lanza, flecha, escudo, portón, arado y fuente tienen receta, `.blend`,
`.glb`, vistas y recibos de validación. Estado `study`: pendientes de aceptación
visual e integración; el juego sigue usando sus representaciones anteriores.
Armas con `grip`, hoja del portón separada como `gate_door`. Arado: 136
triángulos; fuente: 406. Typecheck, lint y 11 pruebas focalizadas pasan.
No se modificó la escena abierta de Blender ni se usaron proveedores de pago.
[Entrega, límites y rutas](historico/graphics-rounds/modelos-pendientes-2026-09-20.md).
E2/E3 no se cierran: clan, adarve, portón roto e integración siguen pendientes.

## 20 sep 2026 · El disparo único entregado; E1 global sigue parcial

La pose se mide desde el hecho: tensar, soltar al nacer la flecha, golpear
portón y caer (ambos bandos), con final sostenido y pureza probada sobre el
GLB publicado. Cadencia y resistencia intactas. El caído deja de disparar y
de ser desplazado por vecinos. **Reacción de puerta hecha** tras autorización para edificios/renderer:
sacudida absoluta desde el contacto, sin tocar colisiones. 61 fotogramas
contrastados con la traza; 72 pruebas focalizadas, typecheck y lint pasan.
Toma diagnóstica sin bosque: la oclusión de la puerta en vista normal queda pendiente.
**No cerrar E1 global:** aún faltan los otros clips del encargo.
También quedan lanza, recibir impacto, huir, armas, adarve y ragdoll.
Typecheck/lint y pruebas focalizadas; asaltos en 7/23/36, clips a 15 fps.
[Revisión, medidas y límites](historico/life-rounds/E1-disparo-unico.md).
No llamar «§1b funcionando» al 26,7 % sin medir cuándo cae cada valle, ni
equiparar `prudent` con un humano sensato. Sin cambios de política o nivelado.


**Dónde está cada cosa, desde el 19 sep 2026.** El dueño del diseño: «se nos va
de las manos la organización». `docs/` y `tools/` estaban planos, con lo vigente
mezclado con lo entregado y herramientas sueltas sin documentar. Ahora:

| Sitio | Qué hay | Índice |
|---|---|---|
| `docs/` | Lo vivo: `design.md`, `changelog.md`, `task-log.md`, `plan-meta.md`, `plan-final.md`, `plan-audio.md`, `encargos-3d.md`, `plan-arte-pendiente.md`, `handover.md`, `roadmap.md`, `agents.md`, `dos-sesiones.md` | `docs/README.md` |
| `docs/medidas/` | Evidencia medida una vez: `findings-drama.md`, `rey-medida.md`, `dead-code-audit-2026-09-17.md`, `catalogo-historias-y-encrucijadas.md` | — |
| `docs/encargos/` | Lo que le falta al arte con documento propio: combate, arado, fuente, sesión de Blender | `docs/encargos-3d.md` sigue siendo el índice de todo |
| `docs/historico/` | Lo que entregó: `rework.md`, `plan-juego.md`, `plan-medios.md`, `plan-rey.md`, `next-plan.md`, `brief-reloj.md`, `life-ai-proposal.md`, y las rondas `graphics-rounds/`, `life-rounds/`, `sesiones/` | `docs/historico/README.md`, con **qué entregó** cada uno |
| `tools/` | Seis carpetas: `reports/`, `shots/`, `pwa/`, `graphics/`, `ui/`, `art/` | `tools/README.md`, con qué mide cada una y cómo se lanza |

Se quedan donde estaban `docs/ui-redesign/` (está vivo: lo citan `src/ui/`,
treinta pruebas y dos skills), `docs/observations/` y `docs/visual-reference/`.

**Lo que costó, y la regla que deja.** Mover un documento es mover sus citas:
**398 referencias en 130 ficheros** —código, pruebas, herramientas y los propios
documentos—, más dos importaciones sin extensión que ninguna búsqueda por ruta
encuentra (`tests/balance/balance.test.ts` importaba `../../tools/balance-report`
y `tests/fast/reader-packet.test.ts`, `../../tools/reader-packet-content`): sólo
las vio el `typecheck`. **Si mueves un documento o una herramienta, reescribes
sus referencias en la misma ronda y pasas el typecheck antes de cerrar.**
`npm run typecheck` y `npm run lint`, verdes.

**Un sitio donde una cita no se reescribió, a propósito:** las recetas de
`art/recipes/`. `tools/art/index.ts` guarda su sha256 en `art/catalog.json` y
sólo compara la construcción nueva con la aprobada si la receta es idéntica, así
que cambiarles una ruta en el campo `note` habría saltado esa comprobación en
silencio para la pelota, el cubo y el palo. Se revirtió; sí se actualizó el
campo `source` de `art/catalog.json`, que no lo cubre ningún hash. Queda escrito
en `tools/README.md`, sección `art/`.

Los `npm run` afectados —`shots`, `eligibility`, `balance:report`, `icons`,
`map`, `attribution`, `policy:attribution`, `migration:ab`, `reader:packet`—
**conservan su nombre**; sólo cambió la ruta de detrás. Y `tools/README.md`
apunta, al final, las nueve herramientas que el código sigue citando y que ya
no existen, para que nadie las busque.

---

**F3d · el cronicón (19 sep), hecho, y con él F3 entera salvo F3f.** Los
valles acabados, uno debajo de otro, desde el menú de inicio
(`src/ui/screens/annals.ts`). Dos decisiones del dueño ese día: **las lápidas
una al lado de otra** y **empieza vacío y se llena**, así que la página vacía es
una pantalla del juego. No sube el esquema ni dibuja una pieza nueva: el archivo
existe desde M-25 y la lápida es la de F3c reducida.

**Y lo que vale de esa ronda son tres defectos que cazó la captura y ninguna
prueba, uno de ellos de la ronda anterior.** `fill` escribe `{count}` con letra
por debajo de trece, así que `doing.besieged` —de F2, esa misma mañana— decía
«six of them are at the gate.» con minúscula cuando bajaban seis; **la captura
de F2 usó una partida de 24, fuera de la lista de palabras, y por eso enseñó un
número y no el defecto**. Es la trampa de siempre en versión nueva: capturar un
valor y dar por buenos todos. Hay guardia desde ahora en `ui-keys.test.ts`
—ninguna plantilla que acabe en punto empieza por `{count}`—. Los otros dos: la
fila decía «ANNO 39» y «38 years» dos líneas más abajo, y la página vacía subía
como una tira. Detalle en `changelog.md` 4.21.

**G4 · qué decisiones acumulan la caída (19 sep), medida.** Por contrafactual,
que es lo único que contesta una pregunta causal: se juega el valle, se apunta
cada respuesta y **se vuelve a jugar cambiando una sola** (`npm run lethality`).
30 semillas × 100 años, 291 ramas, 9 valles caídos de 30. **Lo que acumula la
caída es no prepararse para el asedio** —`raiders_coming:wait` es la segunda
opción más letal del catálogo, +19 pp sobre 26 pares, y las dos siguientes son
de su familia—, con `granary_theft:believe_a` a la cabeza (+38 pp). Salvan
arrodillarse por la deuda de grano (−9 pp) y acoger a los del vado (−4 pp).
**Y lo que más incomoda: esperar es lo que elige la política prudente**, porque
§12.9 la define sin lookahead y prepararse cuesta grano y ánimo *esta semana*:
mira el precio y no ve el asalto. No se tocó ningún número —G4 es nivelado— y no
se duplicó ninguna prueba: la propiedad ya la guarda `threat.test.ts`, y lo que
el informe añade es el orden. Medida en
`docs/medidas/letalidad-por-decision-2026-09-19.md`, detalle en `changelog.md`
4.20.

**Y la trampa más cara del 19 sep, que conviene leer antes de medir nada que
cuente valles caídos: la banda de semillas cambia la tasa de caída nueve
veces.** Con la misma política y los mismos años, `0..29` da **1 valle caído de
30**, `100..129` da **6** y `3+7i` —la de `pace-report`— da **9**. No es la
magnitud de la semilla: la banda alta queda en medio. Es que caer es un suceso
raro, y **treinta semillas no bastan para medirlo**. Es la regla de `CLAUDE.md`
—«los umbrales nunca se fijan con una sola semilla»— llevada un paso más allá:
para una caída, veinticuatro **son** una sola. Salió al medir G4, después de
haber citado «8 de 24 caen» como si fuera la tasa del juego; era la de su banda.

**Y una regla del 19 sep que cuesta media hora cada vez que se olvida: el banco
de balance no se solapa con nada.** Una pasada reventó a los siete minutos con
`Error: Worker exited unexpectedly` por correr a la vez que el empaquetador y
Chrome. Lo peor no fue la caída: fue que **su fichero de salida deja de crecer
igual cuando va bien que cuando está muerto** —`Out-File` escribe al final—, así
que se dio por viva durante una hora. Se comprueba con el proceso, no con el
fichero: `Get-Process node` y el trabajador del banco pasa de 200 MB y acumula
CPU.

**G2 · el banco de balance, remedido (19 sep), hecho.** Lo primero que hizo
falta fue **correrlo**, porque las dos cifras con las que este cuaderno lo
describía eran falsas: son **11 rojas de 37, no 19**, y lo de que «tarda más
que su presupuesto» también lo estaba. Pero ponerle «31 minutos» encima era
igual de frágil: **tres pasadas del mismo banco dan 31, 31 y 46 minutos** —la
tercera corriendo sola— así que el tope sube a 60 por **varianza y no por
lentitud**, con las tres medidas escritas al lado. Nadie lo había corrido desde M-4. Las once son **cuatro
causas**, y tres son el juego moviéndose adonde se le pidió (cadencia, extinción
por asedio, bosque que **no se agota sino que se queda entero**); la cuarta es
la familia de plantillas del clan. **No se movió ningún número**: las cuatro en
`it.fails` con la propiedad intacta y la cifra al lado, y el banco vuelve a
estar verde al correrlo, que es lo que lo hacía inútil. Cada listón dice ya a
qué hora de reloj mira. **Y la quinta roja era del instrumento, que es el
hallazgo: no hay contenido muerto** — se plantean 20 de 21 plantillas jugando de
verdad, y la prueba que decía lo contrario medía una aldea de veinte personas
que no existe desde el 15 sep. Medida entera en
`docs/medidas/banco-de-balance-2026-09-19.md`, detalle en `changelog.md` 4.19.

**F2 · el asedio se ve venir (19 sep), hecha.** La crónica contaba el aviso y
el asalto y **la pantalla no decía nada**: la línea de estado seguía anunciando
un granero la semana en que bajaba el clan, que es lo que `encargos-3d.md` §1
llevaba anotado. Cinco frases en la tira y ninguna cifra flotando (§11.1). Tres
las pone el motor por `doing.ts`, delante del hambre porque son lo único de esa
lista que se resuelve **hoy**: la víspera con su cuenta atrás y el clan encima,
que dice «en la puerta» **sólo si hay puerta**. Las otras dos las pone la
escena, y ahí está la frontera de §1b: el motor sabe que hoy hay asalto y no
puede saber cómo va. El renderer expone `siege()` y `gateNow` (`src/ui/doing.ts`,
puro y fuera del bucle de pintado, que es lo que lo hace probable) lo reparte en
aguantar, ceder (`GATE_GIVING` = 2/3 de los sesenta golpes de D3b) y estar
abajo. **Las bajas no llevan línea propia y es una decisión**: las cuenta la
crónica al cerrar la semana (`raid.held`), y un marcador en vivo sería la única
cifra flotante de la pantalla. **Medido**: 6 semillas × 60 años, los seis valles
la ven, el 4,0 % de las semanas; y en el navegador los tres estados del portón
salen en orden (11 golpes, 47, 60 y dentro), cero errores, capturas en
`artifacts/graphics/F2/`. **El defecto lo cazó la captura y no la prueba**, otra
vez: la primera versión le hablaba de un portón a un valle sin cerco. Y la
medida de los seis valles costaba 17 s en la suite rápida, así que vive en
`tests/journeys/threat.test.ts`. Detalle en `changelog.md` 4.18.

**El arranque, arreglado (19 sep).** Del dueño, probándolo: «se tarda muchísimo
en empezar a hacer cosas y es muy lento y muy aburrido», con el aviso de que el
ritmo va a seguir cambiando. Medida de la apertura hora a hora: **el 35 % de las
primeras veinte horas la aldea no tiene ni una obra abierta** (semilla 7:
termina su segunda casa a las 5,6 h y no vuelve a abrir hasta las 9,3 h), porque
todas las puertas de §7.3 son de población y la población sólo se mueve cuando
pasa el año — once horas de reloj. Y la primera decisión **no podía plantearse
antes del tick 47**, que es el suelo de §8.6.

Lo que se cambió es ese suelo: `CROSSROADS.MIN_TICKS_BETWEEN` de un año a **un
tercio de año**. Medido en doce semillas × sesenta años: primera decisión **de
11 h a 3,5 h** y de 11 valles de 12 a **los doce**; decisiones en las primeras
veinte horas **de 0,8 a 1,8**; decisiones en toda la partida **de 38,3 a 39,4**
—ninguna de más, sólo antes—; intervalos que manda el reloj del 22 % al **11 %**.
De paso, la villa cerrada baja de 416 h a **308 h** con la edad de piedra clavada
en **60 h**, que era el objetivo: eso encoge el hueco que `plan-meta.md` §0
nombra como lo primero a nivelar. El forastero del caserío se muda a verano
porque el tamaño del suelo decide en qué estación cae la primera ranura legal
—acoplamiento escrito en §8.6 y en `hamlet.ts` para que no se descubra por las
malas—. Tres listones movidos con su causa: el techo en `balance.test.ts`, el
rey herrero **de vuelta al año 15** (en el 18 el anillo ya está lleno y los dos
valles caen en la misma mejora a piedra, que no es la voluntad de nadie) y la
muestra de hábitos de IA-3 a **seis** valles. Detalle en `changelog.md` 4.16.

**Lo que queda abierto de esto**: estirar la fase 2 con contenido, que es la
otra mitad de lo que §0 pedía, y el hambre que no muerde (G1). Las dos son
nivelado y llevan medida delante.

**Auditoría de la ronda A3/G3 (19 sep), y lo que corrigió.** La ronda se jugó
con un modelo menor y se revisó entera después. El mecanismo del bastión estaba
bien —la ruta de `upgradeSpot`/`canPlace` no pasa por la regla de la línea de
muralla, y que `familyOf('bastion')` colapse en `wall` no rompe nada—, pero
faltaban tres cosas y había un defecto latente:

1. **No tenía medida**, que es lo que §4 de la skill `goal` exige para cerrar
   una fase. Ahora la tiene, con su peldaño nuevo en `pace-report`: **bastión a
   las 555 h de reloj** (mediana; 224–656 h) **en 9 de 12 valles**, que son
   exactamente los nueve que cierran el cerco, y **los nueve llegan al tope de
   dos**. El tope muerde, así que no es decoración.
2. **La especificación no se enteró.** §7.2 no tenía fila para el bastión —ni
   para el portón de A2 ni para la sala de K-4, que llevaban desde el 18 sep
   sólo en `balance.ts`—, §7.3 punto 9 listaba tres mejoras cuando ya son
   cuatro, y las dos uniones de tipos de §3.5 y §8 estaban viejas. Corregido:
   es la trampa que `CLAUDE.md` nombra («una migración sin su documentación no
   está hecha, está escondida»).
3. **Un defecto latente que la trayectoria nueva destapó:** `wallsByCell` de
   `tests/fast/gates.test.ts` llevaba su propia copia de «qué es muralla» y no
   conocía el bastión, así que leía un portón con su torre al lado como «un
   portón solo en el prado». A3 cerró esa idea en el motor y se dejó esta copia
   fuera.

**G3 · el caserío, hecho (19 sep).** Categoría propia `hamlet` y dos plantillas
—`breaking_ground` y `one_at_the_ford`— que se mueren solas al cruzar diez
personas. **Preguntan 5 de 12 valles y en los cinco es su primera decisión, a
las 11,4 h**, con 4 a 9 personas dentro. Lo que la medida enseñó vale más que
las plantillas: **el techo de G3 es el suelo de §8.6** (`MIN_TICKS_BETWEEN` =
48 ticks: la primera pregunta no cabe antes del tick 47, y la población cruza
diez a las 10 h), así que subir ese 5 de 12 es bajar el suelo, y eso es
nivelado del dueño. De la versión anterior de estas plantillas se retiraron tres
defectos: una se llamaba «The First Frost» y **no tenía puerta de estación**
—disparaba en primavera con el texto hablando de escarcha—; otra regalaba una
gallina con `{k:'herd'}` cuando la fundación empieza con **tres gallinas y
aforo para dos**, así que la opción que prometía «una boca más» quitaba una; y
las dos juntas **no tenían ningún lado malo en ninguna parte**, lo que puso
`fate-chaos` en rojo (2 valles rotos de 12 donde pide 3) por apuntalar justo a
los frágiles. Se arregló el contenido, no el listón. Detalle en
`docs/changelog.md` 4.14 y 4.15.

**A3 · el bastión, hecho (19 sep), y el segundo anillo, sin resolver:**
`plan-meta.md` pedía las dos cosas en una fila. El segundo anillo **contradice
§7.4c** (18 sep, medido: 1 824 tramos de muralla contra 131 casas en doce
semillas a 120 años) — no se ha tocado, queda como fila **A3b**, del dueño.
El bastión sí: `BuildingKind` gana `'bastion'`, mejora de `wall` (1×1, no 2×2
como la atalaya suelta — A4 ya midió por qué esa combinación tapa tramos), se
pide sólo con `flags['wall_closed']` y con tope propio (`withinCap` no sirve:
colapsa su familia en `'wall'`, que no tiene tope). Cuenta como muralla en
`wallRuns`, `touchesWall`, `resistance`, `walled` y `ledger.ts`; ocupa puesto
de tiro en `postsOf`. Sin malla propia (usa la atalaya escalada a 1×1) ni
dibujo de crónica propio — las dos tareas están en `encargos-3d.md` y
`plan-arte-pendiente.md`. Puerta verde: `typecheck`, `lint`, y los ficheros
tocados más las dos pruebas de `tests/journeys/works.test.ts` que fija el
tope y la puerta del anillo cerrado. Detalle completo en `docs/changelog.md`
4.14. Después de esto, `/goal` siguió con G3, G1, A3b y F2 —las cuatro
cerradas el 19 sep, y G2, G4 y F3d con ellas— **y con eso se acaba lo que no
es de Astra**: lo que queda del plan es arte (E1–E4) y nivelado, que es del
dueño.

**Crónicas · villa cerrada integrada (19 sep):** `wall-closed.png`,
`built-gate.png`, `built-wall.png` y `built-watchtower.png` se generaron con
la referencia aprobada de la fundación, se normalizaron a 640 × 512 y se
conectaron por clave para que `wall.closed`, `built.gate`, `built.wall` y
`built.watchtower` no usen ya el respaldo genérico. El catálogo pasa a 47 PNG.

**Crónicas · catálogo visual integrado (18 sep):** 23 ilustraciones naturales
de grabado marrón, normalizadas a 640 × 512 en `public/ui/art/`. Fundación y
Nacimiento se regeneraron antes de integrar para eliminar el estilo infantil.
El índice, el selector visual y sus 27 pruebas apuntan a PNG; 40 pruebas
dirigidas y lint de los ficheros tocados, verdes. Verificado dentro del juego:
Fundación aparece en la primera apertura de la crónica. El typecheck general
sigue bloqueado por `src/ui/app.ts:1093` (`live` no definido), cambio paralelo
ajeno a esta ronda.

**Auditoría de crónicas nuevas:** las diez ilustraciones estables de
`means.*.given` (arado, cerdos, hacha, reliquia, armas, arcos, atalaya, portón,
jornalero y cerveza) están generadas, normalizadas e integradas. Catálogo total:
33 PNG de crónica. Las 52 pruebas dirigidas y el lint de los ficheros tocados
pasan. B1–B4 ya están cerradas. La familia `raid` tenía la tabla de arte
preparada por clave y sus siete ilustraciones se han generado, revisado,
normalizado a 640 × 512 e integrado. El catálogo pasa a 40 PNG. `raid.beast`
reutiliza `raid-sack.png`; con la familia de la villa cerrada integrada arriba,
el catálogo visual actual pasa a 47 PNG.

**Crónicas · nacimiento en revisión (18 sep):** se lanzó una única imagen
individual con la fundación aprobada como referencia, en formato 5:4. Job de
Higgsfield `2de52186-5583-408d-87aa-f1f58ac1e065`, coste 1 crédito. Pendiente
de validación visual a tamaño normal y a 125 × 100 px; aún no integrada.

Se lanzó después una tanda de cuatro escenas de la misma familia: muerte
(`d2911ba5-8814-4e72-8a96-a60731501c6d`), boda
(`548914fb-5daa-42a8-b969-52a9cb6129b7`), niño perdido
(`4a7326e2-40c5-41a9-bf35-99a2c1d53b1b`) y rencor
(`78555272-9ea4-4b09-8a4e-ca1b39070949`). Todas terminaron correctamente y
siguen pendientes de aprobación; ninguna está integrada.

**Este fichero es lo primero que hay que leer, y lo último que hay que tocar
antes de cerrar una ronda.** Existe porque el dueño del diseño dijo, el 16 sep
2026: «te has perdido… necesitas un documento en el que te vaya guiando
siempre». Tenía razón: había un informe por ronda (`docs/historico/life-rounds/`,
`docs/ui-redesign/rounds/`) pero **ningún sitio que dijera dónde estoy**, así
que cada vez que se retomaba la sesión había que reconstruirlo leyendo commits.

**La regla, y es una sola:** ninguna ronda se cierra sin actualizar aquí el
tablero (§2), las cifras (§3) y lo abierto (§4). Si sólo se puede hacer una
cosa, es ésta: un informe de ronda sin esta actualización es un informe que
nadie va a encontrar.

---

## 1. Dónde estamos ahora mismo

| Qué | Valor |
|---|---|
| Rama | `rework/parada-a-media` |
| HEAD | ver `git log -1`; la última ronda mía es el nivelado de las estancias y el plazo vencido |
| `main` | **al día** — se empuja al cerrar cada tramo — se empuja al cerrar cada tramo; la rama también está en el remoto |
| Fusionado aquí | `docs/visual-reference` (`f842a8d`), el cuaderno de referencia visual del dueño |
| Sin seguimiento, a propósito | `docs/life-ai-implementation-prompt.md` es del dueño; se deja para que lo commitee él |
| Puerta usada en cada ronda | `npm run typecheck`, `npm run lint`, y **sólo los ficheros tocados** |
| **En vuelo ahora** | **la tanda de piel** (`ui-redesign/piel/plan-piel.md`). **UI-V0 hecha** (`4da029c`: el kit — 17 colores muestreados, Cinzel y EB Garamond empaquetadas, 25 primitivas, muestrario, comparador y medidor de contraste). En vuelo, tres agentes Sonnet en worktrees: **UI-V1** (`hud.ts`), **UI-V2** (`shell.ts`/`shell.css`), **UI-V3** (`screens/chronicle.ts` + `chronicle-art.ts`). Después UI-V4 (ficha), UI-V5 (encrucijada) y UI-V6 (validación). **El dueño trabaja en paralelo en los modelos 3D: ningún agente mío entra en `src/render3d/` ni en `art/`** |
| Blender · qué viene y su encaje | El agente de Codex está haciendo **el aldeano base, el herrero, el cura y un granjero**, y el dueño confirmó el 16 sep que **se meterán en el juego sustituyendo a los actuales**. Los tres primeros encajan uno a uno. El granjero es **un tipo nuevo**, y el dueño lo aclaró: «esto futuro puede implementarse en nuevos aldeanos, no significa que el granjero vaya a ser el aldeano base». O sea que **el repertorio de aldeanos crece** y no hay que encajarlo en los siete oficios que ya existen. Y hay una vía que lo hace fácil: **el modelo no tiene que elegirse por el oficio**. Hoy `VILLAGER_BY_ROLE` (`renderer.ts`) mapea oficio → malla, pero el render ya sabe qué hace cada persona (`Actor.activity`, y la oferta que está consumiendo), así que un granjero puede ser **quien trabaja el campo** sin que el motor invente un oficio nuevo ni se toque `src/engine/`. Eso deja el base para lo que es y admite más tipos después. **Se decide cuando estén las mallas.** |
| Fuera de esta sesión | Un agente de Codex está **diseñando los aldeanos nuevos en Blender** (dicho por el dueño el 16 sep). Eso toca el aparejo del aldeano y `src/render3d/world/cast.ts`, que da talla y ropa por persona: **ningún agente mío entra ahí** hasta que él lo diga. Contexto en `docs/encargos/respuesta-sesion-blender.md`. |
| Lo que acabo de cerrar | **G-18 entregado y verificado** (`9cc97af`: los doce aldeanos de Blender, sin tocar `src/`; pendiente de aprobación estética del dueño). **IA-8**: el descarte de la plaza que falló, el plazo propio del viaje (`arriveBy`) y el labrador a su puesto (fuera del campo 6,5 %, parados 0,08 %, giros 0,39 %). Antes: **Demo v16** con los cuatro aldeanos de G-17 en el valle (`artifacts/graphics/G-18/demo/`, sin seguimiento por `.gitignore`; semilla 11, año 20, ocho fotogramas). **IA-7**: los labradores dentro de su campo (96,1 % fuera → 13,6 %) y el suelo de la convocatoria aplicado de verdad. El encargo G-18 de los doce aldeanos que faltan, en `main` |

## 1b. La fase en curso: C-1 · Cierre de la tanda de IA

**Por qué esta fase y no otra.** El dueño lo dijo el 16 sep: «nos estamos
dejando cosas atrás». Y era verdad: nueve commits sin empujar a `main`, una
fase anunciada como en vuelo que nunca se lanzó, una demo prometida dos veces y
no publicada, nueve jornadas rojas desde hace cuatro fases, y un fallo del
runner de pruebas sin diagnosticar. **Nada nuevo entra hasta que esto se
cierre.** Después, y sólo después, empieza el rediseño de interfaz con UI-R1.

Cada punto tiene dueño, puerta y criterio de hecho. El orden es el de las
dependencias, no el de lo que apetece.

| # | Qué | Dueño | Depende de | Hecho cuando |
|---|---|---|---|---|
| 1 | ~~Aterrizar IA-5~~ **HECHO**. Y reclamó bien: las cuatro rojas de `graphics-effects.test.ts` que le mandé **no eran suyas**, lo comprobó revirtiendo sus ficheros y lo verifiqué yo con `git stash`. Pasan a ser el punto 8 | yo | — | **hecho** |
| 2 | ~~V-15b · enganchar el renderer~~ **HECHO**. Y al hacerlo apareció un fallo que habría empeorado el juego: con un solo respaldo al base, **un jefe anciano perdía su malla de jefe**. Ahora es una **cadena** —anciano, luego jefe, luego base— y hay una prueba que exige que **con las mallas de hoy nadie cambie de figura**, barriendo las 294 combinaciones contra lo que daba la regla vieja | yo | — | **hecho** |
| 3 | ~~Las jornadas rojas~~ **HECHO**: eran once, quedan **128 de 130** en 284 s. Siete eran deriva del fixture (la pareja se rompe desde v3.78: `foundTwenty`, y en `life-scenes` seis semillas fijas de las que sólo una seguía siendo aldea). Dos eran decisiones mías con la prueba vieja: el vado sin hora punta queda como excepción declarada, y la escena persona-animal se mide como **existencia agregada** sobre 5 jornadas × 6 semillas, porque la consolidación de IA-4 la hizo rara de verdad (dos semillas en cero). Un `it.fails` nuevo: la pelota en la semilla 11, la misma causa de siempre (`worth()` no sabe que jugar es barato) en otra semilla. **Dos rojas a propósito**: la de los catorce avisos (decisión del dueño, punto 10) y la de la palanca del bosque, que es el punto 0 de abajo | Sonnet | — | **hecho** |
| 4 | ~~El trabajador de vitest que se cae~~ **HECHO, y era bueno**: no se reproduce. Dos pasadas completas de `tests/fast` en paralelo, sin flags, terminaron limpias. Se fue al mover las cuatro partidas largas a las jornadas. **Y de paso destapó la causa probable de las caídas pasadas:** no era ninguna prueba, era **contención por runs huérfanos** —encontró 29 procesos de una hora de antigüedad ocupando los 28 núcleos—. Si vuelve a aparecer, mirar los procesos antes de tocar un solo fichero de prueba | Sonnet | — | **hecho** |
| 5 | ~~La demo~~ **HECHA**: publicada como **versión 15** en el artefacto de siempre, y secuencia de ocho fotogramas de la semilla 11 en el año 19 enviada al dueño (`artifacts/graphics/C-1/demo/`). **Mismo valle y misma semana que la captura de antes del equilibrado**, así que es un antes/después: 9 personas y ánimo 9 entonces, **15 y ánimo 55** ahora. Se ve la riña con su burbuja propia, terminando y soltándose cinco segundos después. Lo que sigue mal y se ve: el aviso pisando la pista de las órdenes (punto 10). Un 404 único en cada captura, el mismo desde la primera del proyecto, sin identificar porque el servidor no registra rutas; no es de esta tanda | yo | — | **hecho** |
| 6 | **`main` al día** tras cada uno de los puntos anteriores, no al final | yo | cada punto | `git log -1 main` es el último tramo verde |
| 8 | ~~Las cuatro rojas de `graphics-effects.test.ts`~~ **HECHAS**, y con un solo cambio: el fixture fundaba con la pareja y esas pruebas miden lo que el valle **enseña** —humo de fragua, luz de capilla, nivel del granero, vacas y peces—, así que necesitan una aldea que los tenga. Misma causa que las 42 de IA-0. Incluso la de «una señal dentro de un edificio», que parecía un fallo de colocación, era deriva del fixture | yo | — | **hecho** |
| 7 | ~~El plazo vencido de las personas~~ **aplazado con motivo**: no cabe en C-1 porque necesita la pieza que no existe —descartar una plaza que ya falló— y sin ella el arreglo **empeora** la cifra (0,06 → 0,20 %, medido y retirado en `IA-6.md` §4.3). Sigue como punto 1 de la lista abierta | yo | — | aplazado |

**Lo que esta fase deja fuera a propósito**, para que no se cuele: R-3 (los diez
rasgos), R-5b y R-6 (los datos que le faltan al motor), G-18 (Blender, que el
dueño quiere para lo último), el nivelado fino de duraciones con el cuaderno,
y **cualquier fase nueva de IA**.

**La regla de esta fase, y es la que faltaba:** un punto no está hecho hasta
que su fila de arriba dice «hecho», su commit está en `main` y este cuaderno lo
refleja. Anunciar algo como hecho o en vuelo sin que lo esté es lo que nos ha
traído aquí.

## 2. El tablero

**IA-18 · cosecha visible:** la semana 35 recoge en parcelas realmente
trabajadas, carga sacos, recorre el camino, descarga en almacenamiento real y
vuelve sin producir grano dos veces. Ya no se ara en invierno ni se eligen
descargas vacías. Dos semillas observadas; 89 pruebas dirigidas, typecheck y
lint verdes. [Informe](docs/historico/life-rounds/IA-18.md).

**IA-17 · cantera visible:** una obra cuyo coste real incluye piedra reparte
jornadas entre parcela y roca alcanzable; se ve pico, carga, camino, descarga
y vuelta, sin inventario paralelo. Semilla 11/año44 completa la entrega antes
del regreso; 68 pruebas dirigidas, typecheck y lint verdes.
[Informe](docs/historico/life-rounds/IA-17.md).

**IA-16 · bosque visible:** las copas acusan cuatro tramos de existencias; el
último árbol cae sólo con la transición real a claro, deja tocón y los claros
aptos muestran un plantón creciente hasta la regeneración. Semilla 67 filmada
con motor vivo y semilla 1 con rebrote real; 97 pruebas dirigidas, typecheck y
lint verdes. [Informe](docs/historico/life-rounds/IA-16.md).

**Icono PWA renovado (17 sep):** el mosaico plano de M-27 se sustituye por el
emblema aprobado por el dueño —casa de paja, escudo y cinta sobre fondo cuero
naranja— en 192, 512 y 512 `maskable`. La fuente maestra queda en
`tools/ui/icon-source.png` y `npm run icons` reproduce las tres salidas. Revisado a
48 px y bajo máscara circular; typecheck, lint del generador y la prueba del
manifiesto instalable, verdes. La caché del trabajador sube a `valley-v3`: los
iconos conservan sus nombres públicos y, sin invalidarla, una instalación
existente seguiría sirviendo los PNG anteriores después del despliegue.

**HUD · piedra y plata redibujadas (18 sep):** la propuesta aprobada de
Higgsfield se replica como vector propio del juego: una sola roca irregular con
facetas, y una moneda levemente ladeada, de aros irregulares, sello central y
canto estriado visible. Sustituyen a
los tres bloques y a la ficha apilada tanto en `public/ui/icons.svg` como en la
copia incrustada de `index.html`, necesaria para `file://`. Verificadas dentro
del mapa real en `artifacts/graphics/ui-icons-higgsfield.png`; typecheck, bundle
y las 13 pruebas dirigidas de `ui-skin`, verdes.

**Arte pendiente auditado y primer lote Higgsfield (18 sep):** el catálogo de
crónica queda resuelto en **23 ficheros** —las cuatro estaciones son piezas y
Llegadas reutiliza `road.svg`—. El kit de interfaz tiene ya seis diseños de
referencia; hoja, sello, esquina y anillo salen bien, mientras borde y capitular
necesitan simplificación al calcar. La primera familia de crónica resolvió las
seis siluetas kawaii; el rencor se repitió porque el primer pase sentaba a las
figuras juntas. Compararlas con el prototipo destapó la pieza que faltaba:
**fondo ambiental**, no otro estilo. Fundación ya tiene una segunda pasada con
río, hierba, árboles y asentamiento tenue. La referencia final conserva las
figuras kawaii **sin relleno**, queda recortada a **5:4, 640 × 512 px**, y a
125 × 100 px sigue leyendo; está en
`docs/visual-reference/higgsfield/chronicle-founding-640x512.png`. La
puerta antes de generar las otras diecisiete es repetir y aprobar a 100 px los
otros cinco fondos de esta familia. Generaciones y juicio en
`docs/plan-arte-pendiente.md`; todavía no se integra ningún PNG ni se marca
ninguna pieza como terminada.

**Prueba de ambiente sonoro Higgsfield (18 sep):** una sola generación de
Mirelo Text to Audio, 8 s de bosque inglés tranquilo con pájaros, hojas y brisa,
sin música ni voces (`d249cedb-0628-47d8-8d59-3e7fc89e57d2`). Coste comprobado
antes de enviar: 2 créditos; saldo 89 → 87. La generación terminó, pero la
descarga local se interrumpió y no se integra ningún fichero en el juego. El
dueño la descartó por cargada. Se hizo **una sola segunda prueba**: capa aislada
de dos o tres pájaros lejanos, llamadas suaves y silencios largos, 8 s y 2
créditos (`dccda69f-3a48-4185-8bfc-37a1155f735f`). También queda sólo como
referencia: no se integra hasta escucharla y aprobarla.

**Inventario de audio (18 sep):** `plan-audio.md` separa lo que ya sintetiza
`ui/sound.ts` de lo que falta y vincula cada pieza a un disparador real. La
producción se divide en ambiente limpio, interfaz, economía, medios, vida,
sucesos, hitos/fases y asedio. Primera tanda, siempre de una en una: pájaros
aprobados → apertura de panel → plata recibida → acción aceptada → hito mayor
→ concepto de villa de piedra. El dueño pidió moderación: la interfaz no debe
parecer una máquina de premios; abrir/cerrar serán una sola familia muy discreta
y cambiar de pestaña puede quedar en silencio. El cambio de fase queda
documentado pero no se integra antes de A4/A5; no existe un «nivel» separado
del hito.

**Prueba de interfaz sonora (18 sep):** se generó una única toma de
`ui_panel_open` en Mirelo, 2 s técnicos para una cola útil de aproximadamente
medio segundo, con pergamino seco y toque leve de madera. Coste preflight y
real: **0,5 créditos** (`702c3d80-ff92-47a4-9c6d-a85a32eabac6`). Está pendiente
de escucha y no se integra todavía; la moderación de interfaz queda como
criterio de aceptación. Después se rehízo el criterio de prompts: la interfaz
combina un gesto orgánico mínimo con un cuerpo tonal cálido y redondeado; el
tanteo queda registrado, pero no es el patrón. `plan-audio.md` §8 contiene los
**120 prompts canónicos** —todos los IDs del inventario— con duración, cabecera,
núcleo exacto y exclusiones. Se generó después una única toma con el prompt
canónico de `ui_panel_open`, coste **0,5 créditos**, job
`d3daec51-5c35-426a-8d22-84d3d0028087`; queda pendiente de escucha y no se
integra todavía. El dueño lo encontró demasiado flojo, así que se hizo un
segundo intento con el mismo único modelo de efectos disponible, reforzando el
ataque y la presencia en móviles: `41230658-daff-4d8d-b93f-de731eaa790a`,
**0,5 créditos**. Tampoco se integra hasta aprobarlo.

**Prueba con otro modelo (18 sep):** el catálogo confirmó que Seed Audio 1.0
acepta audio ambiental sin voz, mientras ElevenLabs, Qwen, MiniMax, Seed Speech
e Inworld son modelos de voz y Sonilo es música. Se lanzó una sola generación
de `amb_birds_sparse_day` con el **prompt original exacto**, sin reescritura:
Seed Audio 1.0, job `18e505fc-ba53-4a60-8b8f-86117b1f4ca9`, coste **2,7
créditos**. Pendiente de escucha; no se integra todavía.

**IA-15 · primera cadena visible de recursos:** reparto semanal estable, pareja
fundadora dedicada a subsistencia y ciclo `árbol → tala → carga → descarga → vuelta`.
El tajo coincide con la celda que tala el motor; almiares y pilas responden a reservas
reales y desaparecen de la fundación. Dos aldeas observadas sin errores, deriva ni
penetraciones; 72 pruebas, typecheck y lint verdes. [Informe](docs/historico/life-rounds/IA-15.md).

**Localización · primera fase:** la portada ya permite elegir `English` o
`Español`, la preferencia se conserva y la interfaz principal tiene banco
español con respaldo inglés. Las claves guardadas y la simulación no cambian.
Queda pendiente traducir las familias completas de crónica y sucesos antes de
considerar la localización terminada.

**G-25 · tamaños de roca corregidos (17 sep):** guijarros, piedras medianas y bloques grandes; el límite de celda ya no uniformiza las escalas. Ver G-25.

**G-26 · corriente del río:** la ondulación de la lámina deja de viajar en
diagonal como una piscina y sigue el eje real del cauce; el material añade un
brillo procedural suave que corre en la misma dirección, sin textura ni malla
extra. Typecheck, lint y 59 pruebas dirigidas verdes. La captura viva queda
pendiente: el runner no puede leer la instalación local de Playwright por
permisos del entorno.


**G-25 · monte bajo entregado:** recurso nuevo scrub, repartido de forma estable
en bordes de bosque/roca con margen de accesos, cultivos, agua y objetos del corral.
53 pruebas, typecheck y lint verdes; dos capturas finales reales revisadas.

**G-25 · ribera entregada:** hojas abiertas y tres espigas por mata, tinte
estacional y contención en la celda. 51 pruebas, typecheck y lint verdes;
captura real sin errores. Pendientes monte bajo y más siluetas arbóreas.

**G-25 · roca entregada:** afloramiento facetado y colocación completa dentro de
su celda, sin ocupar caminos ni solares. 50 pruebas, typecheck y lint verdes.
Captura real revisada; pendiente continuar vegetación. [Informe](docs/historico/graphics-rounds/G-25.md).

**G-25 · paisaje, primer modelo entregado:** árbol tree rehecho con horquillas
y copa facetada asimétrica. GLB publicado selectivamente, captura real revisada,
48 pruebas, typecheck y lint verdes. [Informe](docs/historico/graphics-rounds/G-25.md).

**OBS-02 · piloto y comparación cerrados:** tres Luna, un Terra y un Sol revisaron
los casos archivados; ninguno localizó concretamente marcha lateral ni vado desplazado.
El método no supera calibración. Propuesta posterior: Luna recopila evidencia y el
coordinador diagnostica, previa comprobación de calidad del material. No lanzada.
[Comparación y límites](observations/OBS-02/pilot/model-comparison.md).

**IA-14 · contacto y marcha:** corregidos radio de contacto humano, giro continuo,
recorrido posterior a colisiones y zancada proporcional a talla. Comparación
cercana a 15 fps: desalineación rumbo/avance >60° baja del 45,6 % al 4,0 %.
68 pruebas, typecheck y lint verdes. Informe [IA-14](docs/historico/life-rounds/IA-14.md).

**OBS-01 · batería de observación con tres agentes Luna: ejecutada y auditada.**
Informes separados de día, noche y fauna, más revisión de geometría por el
coordinador. El bundle inicial coincidió con una edición incompleta de UI y
falló al arrancar; las tomas usan el control G-24 identificado por hash.
Nueve tomas, 627 PNG capturados, selección visual revisada y trazas contrastadas.
No se ha modificado el juego. Conclusiones y protocolo repetible en
[OBS-01](observations/OBS-01/conclusions.md).

**G-24 · vado 3D: hecho.** La hilera blanca junto al río no eran afloramientos
de roca: el renderer ignoraba `TERRAIN_CODE.ford` y volvía a adivinar el cruce
desde la orilla con una búsqueda de hasta catorce celdas. Ahora dibuja únicamente
las celdas de paso que guarda el mapa y conserva la conjetura sólo para partidas
anteriores a ese terreno. En semilla 7/año 1 quedan dos losas contiguas dentro
del cauce, separadas del campo. 60 pruebas, typecheck, lint y captura reales
verdes. Informe [G-24](docs/historico/graphics-rounds/G-24.md).

**IA-13 · puertas domésticas: hecha.** La IA sí entraba, pero a ×64 podía
recorrer `opening → entering → sleeping` dentro de un solo fotograma y el
renderer sólo miraba la etapa final. Ahora acumula el pulso de todos los pasos
internos y la hoja permanece visible 0,8 s reales, también al salir; se congela
en pausa. Validado con GLB publicado, 20/20 pruebas y toma viva a ×64 en
`docs/historico/life-rounds/IA-13.md`. La evidencia posterior se empaquetó desde una copia
aislada para no tocar la UI-V8 concurrente.

**Limpieza de código muerto (17 sep): hecha.** Auditoría contrastada con Knip,
búsqueda global, puntos de entrada y configuración. Eliminados `src/ui/icons.ts`,
`GREET_COOLDOWN_SPAN` y el tipo huérfano `BeastSighting`; 78 exportaciones de
valor y 34 de tipo pasan a ser internas. Se conservan los comandos manuales,
hooks, service worker y el generador reproducible de animales. Informe completo
en `docs/medidas/dead-code-audit-2026-09-17.md`.

**G-23 · animales:** encargo de rehacer las seis especies y sus animaciones.
Vaca subida en `df0ac66`. Cerdo terminado y revisado en movimiento; preparado
para entrega individual. Siguen gallina, lobo, cuervo y pez.
Cerdo subido en `aec6c38`. Gallina terminada y revisada; 45 pruebas, typecheck
y lint verdes, entrega individual preparada. Siguen lobo, cuervo y pez.
Gallina subida en `a48bb00`. Lobo terminado y revisado, con marcha sincronizada
y apoyos comprobados; 50 pruebas, typecheck y lint verdes. Siguen cuervo y pez.
Lobo subido en `b323c58`. Cuervo terminado y revisado, 52 pruebas, typecheck
y lint verdes. Queda el pez para cerrar las seis especies existentes.
Cuervo subido en `3b395c8`. **Las seis especies terminadas y validadas:** vaca,
cerdo, gallina, lobo, cuervo y pez, con rig y clips conectados al juego. Pez y
cierre preparados para subida individual. 75 pruebas, typecheck y lint verdes;
seis bancos visuales, visores con reproducción/pausa y captura del juego.
Vaca terminada, articulada y conectada al render; 42 pruebas, typecheck y lint
verdes. Banco de marcha y reposo revisado. Entrega individual preparada para
subida; siguen cerdo, gallina, lobo, cuervo y pez. Informe [G-23](docs/historico/graphics-rounds/G-23.md).

**Siguiente encargo de Blender · aldea:** alcance preparado para viviendas,
molino, iglesia/capilla, herrería, pozo, granero, campos, carros y adornos.
Inventario y tandas en [encargo-blender-aldea](docs/historico/graphics-rounds/encargo-blender-aldea.md).
**G-21: casas de paja, piedra y molino terminados**, con entrega individual por modelo.
Paja subida en `dcb4cf1` y piedra en `4d2893e`; molino validado con 87 pruebas,
typecheck, lint y captura del juego. Informe en [G-21](docs/historico/graphics-rounds/G-21.md).
Molino subido en `1889d40`. Herrería subida en `8d03f5c`;
validación técnica verde. Su revisión frontal en juego se cierra con la captura
de la capilla (semilla 2, año 60); detalles y evidencias en el informe G-21.
Granero terminado y revisado dentro del juego; conserva el montón variable de
reservas. Typecheck, lint y 87 pruebas verdes; entrega individual G-21.
Granero subido en `a90c54e`. Capilla terminada, validada y revisada dentro del
juego; conserva las velas dinámicas. Entrega individual G-21.
Capilla subida en `0561f34`. Iglesia terminada y revisada en el juego, con
campanario abierto y puerta visible; validación técnica verde. Sigue el pozo.
Iglesia subida en `1dd19df`. Pozo terminado, validado y revisado en juego;
conserva su celda y añade brocal hueco, torno y cubo. Sigue el campo cultivado.
Pozo subido en `6f8876f`. Campo cultivado terminado, validado y revisado en
verano dentro del juego; conserva la alternancia estacional. Sigue `field-cut`.
**G-22 · cultivos:** el dueño rechaza las espigas de G-21 por parecer flechas.
Trigo rehecho con granos laterales y tallos verdes, validado y revisado en juego.
Siguen coles, cultivo de hojas y variedades visuales por parcela; informe [G-22](docs/historico/graphics-rounds/G-22.md).
Trigo G-22 subido en `1b834c7`. Coles terminadas y selección estable por parcela
conectada en el render; 88 pruebas verdes y captura real revisada. Siguen puerros.
Coles subidas en `0edca57`. Puerros terminados y conectados: trigo, coles y
puerros aparecen en parcelas distintas, con selección estable y cosecha intacta.
88 pruebas verdes y captura conjunta revisada; pendiente de valoración estética.
Puerros subidos en `d096f83`. Campo segado terminado y revisado después de la
cosecha; 88 pruebas verdes. Campo segado subido en `4aa61c5`.
Carro G-21 terminado: caja de tablas, ruedas abiertas con radios y varales;
94 pruebas verdes, typecheck y lint. Capturas reales revisadas, entrega
individual subida en `5e6b070`. Almiar G-21 terminado y revisado en juego:
capas de heno, haces y estaca central; 94 pruebas, typecheck y lint verdes.
Almiar subido en `f0e933f`. Pila de leña G-21 terminada y revisada en juego;
94 pruebas, typecheck y lint verdes. Entrega individual validada para commit
y subida. Leña subida en `15b7f5b`; ajuste posterior solicitado por el dueño:
10 % más pequeña, reconstruida y revisada en juego, subida en `5ccfe5b`.
Cobertizo (`shed`) G-21 terminado y validado en Blender y visor GLB; aún no
seleccionado por el juego. 94 pruebas y typecheck verdes; lint global falla
en `compare.mjs:55` ajeno (variable `row` sin uso). Entrega lista para subir.
Cobertizo subido en `f23ffa5`. Avisado el dueño antes de los muros;
autoriza resolver también las uniones en código. Defensas G-21 terminadas:
empalizada y piedra, conexiones cardinales, esquinas, T y cruces mixtos.
86 pruebas, typecheck y lint verdes; captura del juego y banco de uniones
revisados. Defensas subidas en `8a1011e`, `a2e9c8b` y `24b94b1`.
Encargo de completar los cuatro restantes sin parar: torre terminada y
validada, lista para subida individual; siguen cementerio y ambas ruinas.
Torre subida en `128f357`. Cementerio terminado, revisado en el renderer y
en partida (semilla 43, año 60), listo para subir; siguen las dos ruinas.
Cementerio subido en `fc22492`. Ruina de madera terminada y revisada en
partida y banco. El render ajusta ambas ruinas a la parcela perdida; 90
pruebas, typecheck y lint verdes. Lista para subir; queda la ruina de piedra.
Ruina de madera subida en `e61c977`. Ruina de piedra terminada y revisada
en Blender y renderer real con estado de prueba. Los cuatro encargados
están terminados; entrega final validada para commit y subida.

**G-18 · entrega de Blender (16 sep):** doce recetas y GLB terminados y
verificados; subida solicitada por el dueño. Véase [G-18](docs/historico/graphics-rounds/G-18.md).

**U-10b · el menú abre el valle en el año que se le pida (16 sep, `21b11e9`).**
Lo pidió el dueño porque probar le costaba demasiado: «no tengo manera de
elegir el año o solamente la semilla». Botón «Dev» discreto en el menú —la
preferencia se recuerda— y campo «Open at year»; el valle se juega con la
política de referencia (`openAtYear`, `debug.ts`), no con un bucle de `tick`.
El año es el que lee la cabecera: el 1 es fundar. Medido: 20 años 296 ms, 60
años 1,3 s; la semilla 11 da 27 personas al año 20 y 45 al 40. **Y el
capturador lo usa** (`shot.mjs --year N`): 19 años pasan de 20 s de reloj
falso a 300 ms, y por la trayectoria de referencia, así que las capturas de
aquí en adelante son comparables con las cifras del proyecto. **Demo v18.**

**Demo v17 (16 sep, tarde):** los dieciséis aldeanos de Blender (G-17 y
G-18) en el valle e IA-8, 50 recursos y ninguno pendiente; fotogramas en
`artifacts/graphics/G-18/demo-doce/` (sin seguimiento). Sobre `4145cfc`.

**Demo v16 (16 sep):** publicada en el artefacto de siempre con los cuatro
aldeanos de G-17. Empaquetada desde un **worktree limpio en HEAD** (`git
worktree add`, `node_modules` enlazado) porque el agente de UI-R1 tiene
`app.ts` a medias y no compila. `shot.mjs` gana `--answer N`: la primera
encrucijada planteada se queda abierta para siempre y tapaba el valle en toda
captura con `--advance`; ahora la contesta como el dedo. Ojo: el empaquetado
completo **vacía** el directorio y borra la forma partida; `--split` va al
final.

**G-17 · Blender, entrega terminada (16 sep):** `villager`, `villager-smith`,
`villager-priest` y `villager-farmer`, recetas canónicas, catálogo y cuatro GLB
publicados. Informe: [G-17](docs/historico/graphics-rounds/G-17.md); prompt de integración:
[G-17-handoff](docs/historico/graphics-rounds/G-17-handoff.md). No se ha tocado `src/`.

Orden fijado por el dueño: auditoría, movimiento, interacciones, hábitos,
animales, fauna, escenas históricas, **y después interfaz**.

### La IA de la vida (`docs/life-ai-implementation-prompt.md`)

| Fase | Estado | Commit | Informe |
|---|---|---|---|
| IA-12 · jornada, oficios y gestos | Rutina básica: 15/15 y 21/21 puestos alcanzados; ocho acciones, ocio por edad y burbujas ligadas a encuentros | (este commit) | `docs/historico/life-rounds/IA-12.md` |
| IA-11 · circulación, portones y motor vivo | **hecha en los casos verificados** — 66/66 noches completas en tres aldeas; desvíos, pasillos y colisión fina | (este commit) | `docs/historico/life-rounds/IA-11.md` |
| IA-10 · observatorio, hogares y sólidos | **seguida por IA-11** — visor sincronizado, puertas y rutina doméstica; cifras iniciales conservadas en el informe | `a472eca` | `docs/historico/life-rounds/IA-10.md` |
| IA-0 · auditoría y contratos | **hecha** | `0a45e0c` | `docs/historico/life-rounds/IA-0.md` |
| IA-1 · movimiento y destinos | **hecha** | `1509121` | `docs/historico/life-rounds/IA-1.md` |
| IA-2 · compromisos e interacciones | **hecha** | `17e9022` | `docs/historico/life-rounds/IA-2.md` |
| IA-3 · aldeanos con hábitos | **hecha** | `37c7da6` | `docs/historico/life-rounds/IA-3.md` |
| IA-4 · animales con conducta propia | **hecha**, con dos rondas de arreglo encima | `d7cac67`, `528a764`, `7822454` | `docs/historico/life-rounds/IA-4.md` |
| IA-5 · fauna silvestre | **hecha** — el lobo migra y sólo sale la semana del suceso; el cuervo y el pez se quedan, con el motivo escrito | (este commit) | `docs/historico/life-rounds/IA-5.md` |
| IA-6 · historia visible | **hecha** — la riña con sus dos `id`; funeral e incendio quedan para R-5 por falta de dato | `e20eeb5` y anteriores | `docs/historico/life-rounds/IA-6.md` |
| IA-9 · rodar el valle, y el que va a un sitio sin ruta | **hecha** — la herramienta de película (`film.mjs` + el enganche `__valleyLife` + `film-sheet.py`) y el arreglo que destapó: `decide()` devolvía la intención muerta tal cual. Clavados 3 → 0; queda el 15 % de gente con ruta que no anda, que es dirección y va como **IA-10** | (este commit) | `docs/historico/life-rounds/IA-9.md` |
| IA-8 · la plaza que falló se descarta, el viaje tiene su plazo | **hecha** — cierra el punto 1 de lo abierto y el 0b de IA-7; el devoto queda frágil (§4) | (este commit) | `docs/historico/life-rounds/IA-8.md` |
| IA-7 · los labradores, dentro de su campo | **hecha** — lo vio el dueño en la demo v15; de rebote, el suelo de V-11 se multiplicaba después y no era un suelo | (este commit) | `docs/historico/life-rounds/IA-7.md` |

### El rediseño de interfaz (`docs/ui-redesign/implementation-prompt.md`)

| Ronda | Estado | Commit |
|---|---|---|
| UI-R0 · auditoría y cierre de especificación | **hecha** | `f9f2df4` |
| UI-R1 · carcasa, tokens y navegación | **hecha** — carcasa, tokens, un solo dueño de la navegación, aviso y pista comparten ranura y nunca se pisan (era el defecto visible de la demo v15); las pantallas **no** se dan por migradas, a propósito | (este commit) · `ui-redesign/rounds/UI-R1.md` |
| UI-R2 · cabecera, actividad, órdenes, velocidad | **hecha** — tres fallos de gestos reales arreglados (toques fantasma al valle, ranura de mensaje tapando el botón de velocidad, `pointer-events` sin recuperar) | `c278e12` |
| UI-R3 · crónica | **hecha** — migrada a `shell.content`, no roba el desplazamiento del lector | `ee2279d` |
| UI-R4 · personas y fichas | **hecha** — un fallecido/emigrado deja de envejecer en su propia ficha; seguimiento honesto ("marca, no promete centrar") | `00f8ed7` |
| UI-R5 · integración, decisiones y salida | **hecha** — `contentRouteFor` unificado, enlace crónica→ficha, la encrucijada gana a una bandeja abierta (fallo real encontrado) | `af8d7d0` |
| **UI-V0 · el kit de la piel** | **hecha** — `4da029c`, informe en `ui-redesign/piel/UI-V0.md`. El muestrario cazó dos fallos antes de costar seis rondas (la textura oscurecía a la mitad; el rasgado se comía el texto) | `4da029c` |
| **UI-V1 a UI-V6 · las pantallas** | **V1, V1b, V2 y V3 en `main`; quedan V4, V5 y V6** — el diagnóstico y el plan están en `ui-redesign/piel/plan-piel.md` §1 (por qué salió la estructura y no el aspecto: el prompt prohibía copiar, los tokens se sembraron del juego viejo, no había criterio visual de hecho ni activos ni fuentes empaquetadas) | `197b143`, `e38c053`, `c1ddc72` |
| **UI-V2b · los iconos del chip** | **hecha** — la espiga y la pila **calcadas del prototipo** con `tools/ui/trace-glyph.py`, y la caja del icono del chip de 16 a 21 px (medido: el glifo del prototipo ocupa 18,3 px de 31,5; el nuestro se quedaba en 12,5). Nueve versiones dibujadas a mano no valieron; calcadas salieron a la primera. **El método está en la skill `calcar-iconos`** |  |
| **UI-V3 · la crónica** | **hecha**, en dos pasadas e informe en `ui-redesign/piel/UI-V3.md`. El agente entregó la estructura; el veredicto del dueño fue «la estética sigue siendo muy mala», y la segunda pasada la cerró **calcando los seis adornos del prototipo** (capitular ilustrado, viñeta a pluma, palmeta, rombo, orla de hojas; la cuenta anillada a mano). Medido en el juego: 21 años, 228 entradas, 216 viñetas y ninguna rota. **El documento sellado no se ha visto en captura** y el motivo está medido: no había encrucijada pendiente — queda para UI-V5 |  |
| **CERRADA · una decisión pendiente bloquea la navegación** | **Cerrada en VZ-6** (17 sep 2026) — y lo estaba desde VZ-03 sin que nadie lo hubiera comprobado: separar la decisión **aplazada** de la planteada quitó el candado, porque sólo la planteada devuelve la ruta al valle. Ahora hay recorrido que lo guarda (`una decisión aplazada deja ir a mirar otra cosa`), y hace falta uno: el fallo vivía en el bucle de pintado, así que un solo `expect` lo habría dado por bueno. Con ella se desbloquea **el documento sellado de UI-V3**, que sólo existe habiendo decisión pendiente y por eso no se había visto nunca en captura. Lo que sigue abajo es el diagnóstico original, que se queda escrito. **Fallo encontrado** (17 sep 2026), y era de los que cancelan dos funciones a la vez. `app.ts:624`, dentro de `paint` y por tanto **en cada fotograma**: `if (state.crossroad !== null …) if (currentRoute.kind !== 'valley') navigate({kind:'valley'})`. Mientras hay decisión pendiente —incluso **aplazada**, con la píldora puesta y el velo retirado— la crónica y la lista de la gente **no se pueden abrir**: la pestaña se pulsa, la ruta cambia y el fotograma siguiente la devuelve al valle. Medido: semilla 11, año 37 (`forest_cut` queda pendiente al abrir), aplazada deslizando; `data-screen` se queda en `valley`, 0 bloques de crónica y 0 filas de gente. **Y de ahí sale que el documento sellado de UI-V3 sea inalcanzable por construcción**: sólo existe cuando hay una decisión pendiente, que es justo el estado en el que la crónica no abre. La intención original es de UI-R5 y es buena —una bandeja abierta tapaba las opciones—, pero la condición tiene que ser «el velo de la encrucijada está en pantalla», no «hay decisión pendiente»: aplazar existe precisamente para poder ir a mirar otra cosa. Evidencia en `artifacts/graphics/UI-V3c/` |  |
| **CERRADA · seguir a un aldeano no le marca** | **Cerrada en VZ-5** (`723dead`): se le enciende su propia ropa y lleva un anillo de oro en el suelo, y desde VZ-4 la cámara le sigue en cada fotograma. Lo de abajo es el diagnóstico con el que se abrió. **Revisado, sin tocar** (17 sep 2026, a petición del dueño para no pisar la sesión 3D). Enfocar **sí** funciona: `renderer.track` llama a `view.look` y la cámara se recentra (medido con el reloj en pausa: cambia el 44 % de los píxeles del valle). **Iluminar la silueta no existe en el 3D**: `src/render3d/renderer.ts:995` no guarda a quién sigue, así que no hay nada que pintar — el aro sí existe, pero en el renderer 2D (`src/render/renderer.ts:78`), o sea en el camino muerto. Además apunta una vez y no sigue, `track(null)` sale en la primera línea, y el texto `inspect.track.note` promete «marks {name} on the map», que en el 3D es falso. Faltan también el aro de luz y el contorno de oro de su casa del prototipo 03. El arreglo cabe entero en `src/render3d/renderer.ts` |  |
| **BALANCEO · los recursos básicos** | **hecho, y a propósito corto** (pedido por el dueño al cerrar las cinco fases: «balancéalo un poco, tampoco te excedas porque el sistema irá mutando»). **La aldea corta la leña que necesita, no una cuota** (§7.13): la cuota fija hacía dos cosas mal con la misma regla —un valle sin ayuda del jugador pasaba **1 982 semanas de invierno con la leñera vacía** en 24 partidas y otro apilaba **20 415** de leña sin gastar—. Con la necesidad delante: **frío 0**, leña al final 368 y nunca por debajo de 168, población mediana sin ayuda de 38 a **44**, y los valles que llegan a la piedra de 7 a **12 de 24**. Y **las decisiones pasan a complementarse**: el hacha, que no cambiaba nada porque la leña ocupa la décima parte de las manos, gana su efecto propio en la obra (`MEANS.AXE_WORKS` 1,15) | **el hacha sigue siendo el medio más flojo**: 18 de plata para +2 obras de 60 y la primera piedra hasta veinte años antes en algún valle, pero sin mover la población (39 contra 40 en 60 semillas). O baja de precio o necesita otro efecto, y eso es decisión del dueño. **Y el banco de balance está por rehacer**: las 19 rojas de 37 que se midieron al cerrar M-4 son de **antes** de este cambio |
| **M-4 · el resto del carro** | **hecha** (`docs/historico/rework.md` §4b), y con ella el juego de los medios entero. Tres medios más: **un hacha buena** (más leña por leñador, y el bosque lo paga), **una reliquia** (la fe deriva alto, así que hay capilla y cura sin esperar una generación — y el camino se entera) y **un par de manos** (el forastero que se queda). Éste último **no cuesta una tirada**: su nombre y sus rasgos salen de un `hash32` del tick, porque la invariante de los actos del jugador es que dar algo no mueve el azar del mundo; con `makeName` habría consumido del flujo `names` y un forastero habría desplazado la partida entera. **Retirado del código**: `redesign/orders.ts`, `ui/answer.ts`, `UiActions.setIntent`, su prueba y **41 claves del banco** (23 en inglés, 18 en español). `state.intent` se queda en reposo en el motor: sacarlo es una migración de esquema por limpieza, y la limpieza va después (decisión 5). **Medido** (24 semillas × 60 años, tabla en `design.md` §7.12): de 38 de población sin dar nada a **61 con el arado**, y la reliquia adelanta la primera piedra **diez años** (año 34 contra 44). Y dos cosas que la medida dice y el diseño no había previsto: **el carro entero sale peor que sólo el arado** (45 contra 61), porque comprar de todo deja sin plata para lo que cambia la partida; y **el hacha casi no cambia nada** (39 contra 38), y no por el medio sino porque **la leña no es un cuello de botella** en este juego (de 507 a 43 000 unidades en cien años, medido desde v2.9) | que la leña escasee es balance y va después (decisión 5); el banco de balance se remidió y **no se ha tocado** por lo mismo |
| **M-2 · tres medios, de punta a punta** | **hecha, y el patrón vale** (`docs/historico/rework.md` §4b). El arado, dos cerdos y un barril: cada uno **cuesta lo del valle** y abre algo bueno **y** algo malo. El arado libera brazos —no sube la cosecha— y de ahí salen la leña, la obra y la piedra; los cerdos dan matanza y llaman a los lobos; el barril es una fiesta **esa misma semana** y trae bodas y riñas a partes iguales. **El carro** sustituye a la hoja de órdenes en la interfaz, con el precio en fichas de recurso y el motivo escrito cuando no se puede dar; las tres palancas quedan fuera. **La medida que decidía, cumplida** (24 semillas × 60 años): población mediana 38 sin dar nada contra **61 con arado**, y la primera piedra en 24 valles de 24 contra 7 — 23 puntos de distancia. Y el hallazgo que no estaba diseñado: **con la misma plata, quien compra barriles en cuanto puede nunca junta para el arado** (45 contra 60), así que elegir es la partida. **Lo que costó medir**: con los precios primeros (12, 8 y 4 de plata) un valle compraba 51 barriles en sesenta años; con 20, 14 y 10 y sin encadenar barriles, toda la plata de una partida da para una docena de medios. **Y tres trampas viejas que volvieron a morder, las tres cazadas por capturas**: `.valley-panel` es `position: absolute` y colapsaba la bandeja del carro; el `[hidden]` de los botones de la oferta no oculta nada si la piel les pone `display` (ya estaba escrito en `shell.css` desde UI-R2, ahora está en la skill); y un `TS1005` por acentos graves dentro de una plantilla de CSS. 13 pruebas nuevas en `means.test.ts` y un recorrido del carro | dos pruebas de trayectoria se reescribieron **para que midan la regla y no la biografía** (`resentment` había caído tres veces sin que la regla cambiara, y el listón del genio se remidió sobre tres semillas); `orders.ts` y `state.intent` se borran en M-4 |
| **M-1 · el mundo contesta a lo que hay** | **hecha** (`docs/historico/rework.md` §4b). Lobos × cada cabeza del corral y ÷ empalizada —y con el corral apretado se llevan un cerdo—, riada × el bosque talado, y el ladrón del granero y el diezmo del señor miran **también la plata**: prosperar a la vista deja de ser gratis. Y las dos cosas que el dueño del diseño puso por delante: **el rayo y el incendio anual no dejan nunca a la aldea sin techo** —el fuego de §5.9 hacía lo mismo que el rayo dos semanas después, y lo cazó una prueba que forzaba un solo techo— y **la gracia de los primeros años**. **La medida corrigió el brief**: un valle intocado pasa de 9 muertas de 32 a **1**, y aislando las dos piezas se ve que no es la gracia (sin ella, 2 de 32) sino que **la mayoría de los finales de antes eran «un rayo quemó la única casa»**, que es justo lo que él dijo que no tiene gracia; el único final temprano que queda (año 8) es un **abandono**, con motivo. Y la letalidad por acumulación existe pero tarda: a 60 años el valle cargado muere lo mismo con **la mitad de gente** (23 contra 42), y a 120 años **9 de 24 contra 1**. **El error que casi se cuela**: la gracia atada a «pequeña o joven» volvía casi inmune a cualquier valle que se estuviera apagando —un escudo para el que va perdiendo borra el final—; ahora es «joven y pequeña», con prueba de ese nombre. `weightNow` expone el peso de un suceso para poder medirlo sin jugar cien partidas; nueve pruebas nuevas en `pressure.test.ts` | la letalidad por acumulación se ve a 120 años y apenas a 60: lo que la hará valer a escala de partida son los medios de M-2, que cuestan recursos |
| **M-0 · la mesa: piedra y plata** | **hecha** (rama `medios/m-0`), primera fase del juego de los medios (`docs/historico/rework.md` §4b). **La piedra es una existencia**: la obra la cantea con sus propios puntos al cambio de siempre y la gasta al levantar, y con la obra parada cantea al montón hasta `STONE_IDLE_CAP` en vez de perder la semana. El trabajo total no se mueve —prueba de equivalencia en `journeys/works.test.ts`— y la primera piedra sigue en el año 48 de mediana (base medida: 48). **La plata entra por el camino y sale por el señor**: las tres encrucijadas de comercio y el buhonero pasan a ser **ofertas** —una frase en la voz de la bandeja y dos toques, «Take it» / «Let him go»—, el canal de comerciantes de §7.8 se retira entero (`selectTrader` fuera; las tres plantillas quedan en `RETIRED_TEMPLATES` para que una partida guardada siga cargando), y el diezmo se cobra cada otoño en plata o en grano del que sobra. **Cabecera de cinco cifras y el ánimo como cara** (`MOOD_FACE`): medido, el ánimo va de 6 a 79 y pasa el 17 % de las semanas por debajo de 10, así que la cifra no engañaba por estar quieta sino por vivir a escala de años. **Dos cifras que el camino obligó a medir**: sin `OFFER.MIN_PEOPLE` 8 y `FACTOR_KEEP_YEARS` 2, aceptar ofertas bajaba la población mediana de 47 a 15 y la semilla 9 se extinguía en el año 2 vendiendo su comida; y sin `AGAIN_WEEKS` el factor subía 1 181 veces en dieciséis partidas. **Y la trampa de la ronda**: `life/resource-sites.ts` detectaba la cantera por el coste viejo, así que sacar la piedra de `bpCost` la borraba del valle en silencio — la obra se abre antes de picar y lleva su `stoneDone`. Esquema 7 con migración (una obra en vuelo entra con su piedra puesta: ya la pagó). **Medido** (`tools/reports/agency-report.ts`, 32 semillas × 60 años, con la base del motor de `a0e2706` al lado): primera piedra en el año 49 contra 48 de la base, muertas 9 contra 10, y la plata entra y sale en 123 de 161 décadas vividas. **Y una lectura que conviene tener escrita**: aceptar **todas** las ofertas siempre sale algo peor que no aceptar ninguna (población mediana 27 contra 39, con las mismas muertas), y no es un acantilado como las palancas —vender grano te pone la bandera `watched`, que es el precio que el factor siempre tuvo, y comprar vacas sube la densidad del corral y con ella la peste—. Lo que M-2 tiene que medir no es «aceptar es bueno» sino que **combinaciones distintas dan aldeas distintas**. Typecheck y lint limpios, 1 397 pruebas rápidas en verde con 25 nuevas, 15 recorridos y 6 de PWA | quedan 3 rojas de la otra sesión (`graphics-clock`, `life-staging` ×2), y una de ellas es una **declarada que ahora pasa** (el corro de la semilla 23): no se toca porque es su fichero |
| **PARADA · las mecánicas, 17 sep** | **hecha: diagnóstico, plan y briefs**, sin código. El dueño paró el trabajo: «no es nada divertido; lo único bonito es mirar cómo avanza el pueblo». Medido con dieciséis semillas y sesenta años (`docs/historico/plan-medios.md` §1): **las palancas de órdenes son una trampa** —sólo vive la postura de fábrica; `timber` a 0,2 mata 11 de 16, `fields` a 1,3 baja la población de 42 a 19—, **las encrucijadas pesan pero no se sienten** (42 contra 6 entre contestar bien y mal), y **la aldea prospera sola por diseño** (§1: letalidad sólo por encrucijadas). El ánimo, que él ve «siempre en 50–60», en el motor va de 6 a 79 y pasa un 27 % de las semanas de la primera década por debajo de 10: es un problema de reloj (lo mueve la cosecha una vez al año) y de que nada suyo lo levanta. **La propuesta, con su metáfora: dar medios, no órdenes** —el jugador mete cosas en el valle y la aldea decide—, más piedra y plata en la mesa. Sus decisiones: cuesta lo del valle y con ritmo alto; nada con el dedo; palancas fuera; el mundo no mata sin motivo; ánimo como cara; visitas de comercio como ofertas en la voz; diezmo regular; el rey después. **Briefs M-0 a M-4 en `docs/historico/rework.md` §4b**, con ficheros, contrato, pruebas y medida; van antes que R-2, R-5 y R-3 | ninguna línea de código; la medida de M-2 decide si el patrón vale |
| **VZ-6 · el resto de las deudas** | **hecha**, informe en `ui-redesign/piel/VZ-6.md`. Cierra la tanda VZ con el encargo «cubrir el resto de deudas». **(1) Los modelos viejos que no se iban del iPad**: no era código ni la otra sesión, era el worker. Su cabecera decía que «caché primero» es seguro porque cada recurso lleva huella en el nombre, y **para los modelos era falso** —`cow.glb` se llama igual toda la vida—, así que los animales rediseñados no llegaban a un dispositivo que ya hubiera visitado. `assets.ts` les cuelga los ocho primeros caracteres del `sha256` y `sw.js` precachea **esas mismas** direcciones, o se guardarían claves que nadie pide. **(2) Enfocar al decidir no hacía nada**, y la prueba declarada no estaba mal: el juego sí. `crossroad.ts` escalaba `#valley` con un `transform`, y ese lienzo va oculto desde UI-V10 — la prueba leía ese mismo `transform`, o sea que medía el camino muerto. Conducto nuevo `app.look` → `backend.live.look` → `renderer.look` → `view.look`, que mueve el centro y no la altura, y **cuenta como mover la cámara** (apaga el vuelo y pone `disturbed`, o el encuadre automático del fotograma siguiente se comía el enfoque). `viewCentre` entra en `GraphicsStats` y sale en la raíz como `data-view-centre`. **(3) Los tres recorridos declarados en verde**, los tres por fallo de la prueba: un velo congelado como literal, un «82 people at its height» y una clase que UI-V2b retiró, y un instante fijo que R-1 movió. **(4) La línea «Today» de la ficha**, que era la de «si es fácil»: lo fue en cuanto se vio de dónde sacar el dato — `ActorDoing` del mismo `lastActors` con el que se pintó el fotograma, así que dice lo que se ve. Nueve palabras y ninguna inventa un destino; la carga manda sobre el tramo; quien ya no está no tiene línea. **(5) Y tres cosas que no estaban en ninguna lista, las tres cazadas por una prueba nueva**: el **sello de la decisión aplazada no se podía pulsar** —llevaba `pointer-events: none` de cuando el ornamento era una hoja decorativa, y es el único camino de vuelta a esa decisión; la excepción va atada a `:disabled`—, la deuda «una decisión pendiente bloquea la navegación» estaba **cerrada por VZ-03 y nadie lo había comprobado**, y **el documento sellado de UI-V3 se ha visto por primera vez** (`artifacts/vz6-sealed.png`), gracias a `?crossroad=1` en las rutas de depuración. Typecheck y lint limpios, **15 recorridos en verde y ninguno declarado**, 172 pruebas rápidas de los ficheros tocados | el documento sellado lleva al valle y no abre la decisión de un toque: asimetría anotada, y cambiarla es del dueño del diseño. El nombre del caché del worker se sigue subiendo a mano |
| **VZ-5 · a quien se sigue se le ve** | **hecha**, y cierra el encargo que VZ-4 dejó a medias. El resalte estaba bloqueado por tener `renderer.ts` con cambios sin comprometer de la otra sesión; en cuanto lo subieron (`141652d`) se hizo. **Dos piezas, y la segunda porque la primera no bastaba.** (1) **Se le enciende su propia ropa**: `dress` clona el material de cada malla para cada aldeano, así que subirle la emisión a uno no puede tocar a nadie más —un contorno postizo habría que clonarlo y posarlo cada fotograma sobre un cuerpo con esqueleto; esto son dos colores, y se guarda el que había para devolverlo—. (2) **Un anillo de oro en el suelo**, porque medido en el juego la ropa encendida sola no se distingue: a la distancia a la que se juega el cuerpo mide unos pocos píxeles y el tono se confunde con su propia tela. El anillo va en `cast.mark` y **no** en `cast.group` —ahí dentro están los cuerpos y siete pruebas los leen por índice, que es lo que rompí al primer intento— y se coloca en cada pasada donde esté el cuerpo, así que sigue al que anda y se apaga si esa persona se va del valle. Tres pruebas nuevas en `graphics-world.test.ts` guardan las tres propiedades: que se enciende sólo el seguido, que cambiar de persona apaga a la anterior, y que el anillo va donde está el cuerpo. **Y el texto de la ficha, que había pasado a ser falso**: decía «no promete mantener la vista» y desde VZ-4 la mantiene, así que ahora dice «rings them and keeps the view on them». Typecheck y lint limpios, 49 pruebas rápidas de los ficheros tocados y los trece recorridos en verde | la fuerza del resalte está sin juzgar en dispositivo: el arnés no la aísla —el oro del anillo se confunde con la paja del valle al buscarlo por píxel— y la cámara no centra a quien sigue, así que el recorte del medio no sirve |
| **VZ-4 · la cámara sigue, y las seis pruebas de PWA** | **hecha**. Dos cosas que el dueño del diseño pidió al revisar lo pendiente. **(1) Seguir es seguir**: `renderer.track` mira a quien se le dice y vuelve, así que pulsar «Follow» centraba a la persona y ésta se iba andando del encuadre. Ahora `app.ts` guarda a quién sigue y lo repite en cada pintado. **Lo que falta —el resalte de la silueta— está bloqueado**: se dibuja en `src/render3d/renderer.ts` y la otra sesión lo tiene con cambios sin comprometer; se hace en cuanto quede libre. **(2) Las cinco pruebas de PWA que llevaban rotas, verdes, y la suite baja de 6,1 minutos a 11,5 segundos.** Dos causas, una del juego y otra de las pruebas. La del juego: **un valle recién fundado no se guardaba hasta el primer tick**, que a ×1 son catorce minutos, así que quien fundaba y cerraba la pestaña perdía la partida y al volver el menú ofrecía fundar otra en vez de continuar —el `pagehide` no lo tapaba, porque `persist` encola una escritura en IndexedDB y la página se desmonta antes—. Se arregla guardando al fundar. La de las pruebas: **el menú de inicio de U-10 sale también al recargar** y ninguna de las cinco lo pasaba, así que la espera de `data-app-ready` no se cumplía; `passTitle` ya sabía pulsar el botón que hubiera. Y tres medidas caducadas de paso: el avance del reloj usaba los **15 s por tick de antes de v3.72** (una cincuentava parte de lo que dice, así que el autoguardado no se cruzaba nunca) y ahora sale de `balance.ts`; ese avance se **salta** en vez de correrse, que es lo que los recorridos aprendieron (un millón de milisegundos fotograma a fotograma ahoga la página); y las cuatro velocidades viven recogidas detrás del botón desde UI-V2b, así que hay que desplegarlas antes de pedir una. **Y dos asimetrías que quedaron decididas, no arregladas**: `BACK TO THE LIST` no es una tercera forma de cerrar —sólo sale viniendo de la lista y vuelve a ella, cerrar lo hace la cruz— y la hoja de roble se queda sólo en el valle, que es el estándar aprobado en el lienzo de VZ-2. Typecheck y lint limpios, **los seis de PWA y los trece recorridos en verde** | la silueta resaltada y la línea «Today» de la ficha, las dos bloqueadas por la otra sesión; el nombre del caché del worker, que se sube a mano |
| **VZ-3 · la cabecera, exactamente igual en las tres** | **hecha**. El dueño del diseño puso las tres capturas en fila y lo señaló: «la parte de la UI de arriba no está alineada; que sea exactamente igual en las tres pantallas». Medido, lo era en todo **menos la placa de fecha**: 334 px en el valle y 272 en la crónica y la gente, con el arco del sol en 90 contra 62. La causa era una excepción de UI-V9 que estrechaba la placa para dejar sitio al botón de cerrar —una placa de 71 px arriba a la derecha— y **VZ-2 retiró ese botón**, así que la excepción se había quedado sin motivo y sólo dejaba el defecto. Retirada, y el arco vuelve a sus 90 fijos. Medido después a 390 y a 750: placa x 27 y 16 de 334 × 34, arco x 255 de 90 × 29 y fila de chips x 43 de 318 × 33, **idénticas en las tres rutas y a los dos anchos**, con la fecha entera. Y un daño colateral de VZ-2 corregido: el arreglo del barrido de la ruta viva se aplicó por error **a los dos** recorridos que tocan el lienzo, y el de U-14 funda un valle nuevo donde al año 1 hay **una casa** en un mapa de 72 × 112 —unos pocos píxeles en el centro—, así que un barrido de treinta en treinta la saltaba: 220 toques sin abrir nada, tres veces seguidas. Vuelve al barrido fino de cinco en cinco alrededor del centro, y el ancho se queda sólo donde hace falta, en el valle de ochenta años con la cámara siguiendo a alguien. Lint limpio y los trece recorridos en verde |  |
| **VZ-2 · un canto, un papel, una textura** | **hecha**. Sale de tres pestañas seguidas en la tablet del dueño del diseño: «que cada sección tenga un borde diferente y además el fondo no sea de la misma tonalidad ni textura, no me gusta nada; queda fatal cuando cambias entre pestañas. Quiero intentar llegar a algo más genérico». Se le dibujaron **tres alternativas en un lienzo** con los valores reales del proyecto —el listón de madera curvo, un canto recto y el papel rasgado— y eligió el tercero: «me gusta más el borde como de hoja rota». **Lo entregado:** una sola clase (`.skin-torn-top`) para las **seis** superficies de papel —la bandeja, la hoja de gente, la página de la crónica, la decisión, el epitafio y el parte— con el azulejo de `tools/ui/torn-edge.py` (semilla fija, escrito y no calculado, como los `deckle`). Se retiran la franja de fusión de 64 px, la esquina redondeada de 16, la sombra de la hoja, el filete recto de su canto y **el segundo tono de papel**: la bandeja deja de ser `--skin-parchment-deep`, que es la única desviación deliberada del prototipo 01 y va escrita. Y **el botón de cerrar**: «no lo puedes poner arriba a la derecha; tiene que ir como una cruz pequeñita o si no la opción de poder deslizar hacia abajo» → fuera la placa con la palabra `CLOSE`, y una cruz de 19 px en un toque de 44 sobre el papel, la misma en las dos secciones, con el deslizamiento donde estaba. **Tres trampas medidas, las tres cazadas con captura y no con número**: un azulejo que se repite en vez de estirarse (la lección del listón); una tira dibujada en `::after` **la recorta `overflow: auto`** —el epitafio y la hoja de gente salían con el canto recto mientras la bandeja y la crónica salían rasgadas—, así que es una máscara sobre la propia hoja; y **una máscara recorta a sus descendientes**, y la crónica vive anidada dentro de la hoja de la carcasa con un velo `position: fixed` desde UI-R3, así que su página quedaba recortada a los 33 px que esa hoja mide: de ahí la única excepción, con `:has(.chronicle-scrim)`. La cruz se repone con `replaceChildren(close)` porque la crónica se vacía en cada repintado. Typecheck y lint limpios, **los trece recorridos en verde**, las pruebas rápidas de interfaz al día (la de las superposiciones cambia de propiedad: ya no guarda el degradado, guarda el canto). Norma en `design.md` §11.2 y la skill `piel-del-valle` §2, §6 y §7 |  |
| **VZ · la voz del valle: un sitio, una cola, una piel** | **hecha**, informe en `ui-redesign/piel/VZ.md`; el plan que la ordenó es `ui-redesign/piel/plan-voz.md`. Sale de la corrección del dueño del diseño a UI-V10 («esta forma de arreglarlo me parece una chapuza… mira cómo son los circuitos»), y de que la estructura correcta llevaba escrita dos veces sin construirse (`visual-reference/README.md` §5, «no conservar una quinta cartela flotante»). **Lo entregado:** una cola pura (`src/ui/voice.ts`) decide qué frase lee el valle —hito > suceso > pista > estado— y la bandeja la enseña en un hueco de **altura fija de dos líneas**; se fueron tres `setTimeout`, un `MutationObserver` que espiaba el atributo `hidden`, `resolveMessageSlot`, la cartela de hito entera (`moment.ts`, borrado) y la píldora de la decisión, que pasa a ser el **sello de lacre en el ornamento**; el hito se marca poniendo **la hoja de roble en oro**, sólo con CSS; y el parte de bienvenida y el epitafio —las dos únicas pantallas que seguían con tokens de U-01 y cero clases de la piel— se visten con el lenguaje del documento sellado. Las tres decisiones del plan §3.4 las contestó el dueño, las tres con la recomendación. **Medido a 750 y 390, en los cinco momentos del arranque: pila 200 en todos, hueco 50, rincón de velocidad clavado, cero piezas flotando, cero errores de página.** Esa columna de constantes es el arreglo: nada de lo que hay encima se recoloca nunca. **Tres cosas destapadas por el camino**: una variable en la zona muerta temporal que dejaba el hueco vacío —y las cifras perfectas, porque nada hablaba: una medida no es una captura—, `intro.orders` con 129 caracteres que se iba a una tercera línea (medido: 97 caben, 129 no; acortada y vigilada desde el banco) y el `›` flotando porque en una caja `flex` un pseudo-elemento es otro ítem. **Y dos defectos anteriores que las capturas sacaron y se arreglan aquí**: el parte de bienvenida se leía **detrás de la bandeja** —la pila va en z-index 14 y cada superposición la aparta por su nombre; el parte no estaba en la lista desde que la pila existe— y el recorrido de la ruta viva pasaba por accidente, midiendo la caja del 2D y tocando esas coordenadas en el 3D (ahora espera a que el lienzo esté dimensionado: el 3D recién montado mide 300 × 150). Typecheck y lint limpios, **los trece recorridos en verde**, 76 pruebas rápidas de interfaz con 34 nuevas. Los tres fallos de la suite rápida (`graphics-clock`, `life-staging`, `ui-milestones`) **no son de esta ronda**: se comprobaron en un árbol limpio de `origin/main` con los mismos números |  |
| **UI-V10 · la secuencia del inicio** | **hecha**. Cuatro capturas seguidas del arranque, mandadas por el dueño del diseño, y tres defectos en ellas. **(1) El 2D asomaba antes del 3D** («no sé por qué se ve un momento la aldea en 2D»): el relevo de `backend.ts` dejaba pintar al lienzo 2D mientras se descargaba Three y lo apagaba al acabar, así que había un instante de **otro juego** —el mapa plano de casillas—. Ahora el 2D va oculto de entrada cuando el destino es el 3D y sólo vuelve si el 3D no llega (su `catch`), y el hueco espera en `--ui-ground`, muestreado del prado. **(2) El listón tapaba la cartela de hito** («el marco tapa el mensaje que sale por encima»): `.valley-moment` estaba a `bottom: 200px` fijos, de antes de la piel, y la bandeja mide ahora lo que mida su texto —crece a dos líneas— más los 46 del canto. Se ancla a `--ui-stack-height` + `--ui-batten-height` + 14, y el alto del canto pasa a ser un token para que no haya dos copias del número. Medido a 750: la cartela acaba en y 918 con la pila en 978, o sea 14 px de hierba sobre la madera. **(3) La pista del inicio guiado** seguía siendo la tarjeta de tinta de noche de U-11, de cuando flotaba sobre el prado desnudo, y encima del pergamino era un parche negro sobre el ornamento: pasa a tinta sobre el papel con su `›` de latón, el mismo arreglo que el aviso recibió en UI-V2. Y **baja detrás de la línea de órdenes**, porque su frase dice «the line above» y el orden del DOM en la bandeja sí es el orden de la pantalla; el texto no se toca. Las dos reglas nuevas quedan en la skill `piel-del-valle` (§7 y §8). Typecheck, lint y build limpios, 54 pruebas rápidas y 12 de los 13 recorridos en verde; el que falla es la tormenta, y falla porque el servidor de desarrollo no puede servir `src/render3d/renderer.ts` mientras la otra sesión lo está escribiendo (`data-render-failure` con un `?t=` distinto en cada intento), no por esta ronda |  |
| **UI-V9 · un estándar, no un catálogo de excepciones** | **hecha**, informe en `ui-redesign/piel/UI-V9.md` y la regla en `.claude/skills/piel-del-valle/`. Sale de tres frases del dueño del diseño en la tablet: «revisa el trabajo con una simple captura», «no usamos el mismo que tenemos en la otra pantalla funcionando» y «los fondos detrás de los textos, usa siempre el mismo; no estamos estandarizando las cosas». El diagnóstico: cada ronda vistió **una** pantalla desde su prototipo, y el conjunto salió con dos papeles, dos cabeceras y tres formas de cerrar. **(1) Una cabecera, la del valle**: la compacta de la crónica se retira entera —DOM, CSS e interruptor de ruta— y con ella el duplicado de UI-V1 por el que **cada cifra vivía dos veces en el DOM**; la crónica enseñaba tres cifras de cuatro por estar topada a 334, que es lo que UI-V8 intentó arreglar en la pieza equivocada. Con hoja abierta la placa cede 118 px al botón de cerrar (272 a 390 px, 334 desde 452) y lo que cede es el arco del sol, que tiene `viewBox`; la fecha no se toca. **(2) Un papel para leer**: la hoja de gente/ficha/órdenes se pintaba con `--ui-paper-bg`, token de U-01 anterior al rediseño y sin textura → ahora lleva la clase `skin-paper--page`, la misma de la crónica, y no una copia de sus valores. **(3) El canto en tres piezas**: hombros de 80 px fijos y franja llana estirada, porque estirar una sola tapa dejaba a 750 px una recta con dos ganchos — **una pieza cuya forma cambia con el ancho no es un estándar**. Y los círculos de velocidad suben 40 px para que el papel no los muerda (37 del canto + 13 de hierba medidos en el prototipo). **La lección de método**: en UI-V8 verifiqué midiendo cajas, todas correctas, y subí un canto malo; la captura a 390 **y a 750** entra en el bucle y está escrita en la skill. Typecheck y lint limpios, 54 pruebas rápidas de interfaz, cuatro recorridos de maquetación en verde, capturado y mirado en las cuatro pantallas a los dos anchos |  |
| **UI-V8 · una sola directriz, y la bandeja del prototipo** | **hecha**, informe en `ui-redesign/piel/UI-V8.md`. Cuatro correcciones del dueño del diseño probando la demo en la tablet. **(1)** La directriz, que UI-V7 dejó a medias: acoté las hojas a 390 y dejé cruzar las barras, o sea dos reglas para la misma cosa, y se vio en la crónica («deberíamos tener un estándar y que se viesen los tres iguales»). Ahora **la superficie cruza la pantalla y su contenido va en columna de 390**, para las cinco pantallas; medido a 1240: velo y página 1240, columna x 425 ancho 390, fila de gente y ficha igual. **(2)** La cabecera compacta recortaba el grano de tres dígitos (334 px de tope con 183 para cuatro cifras) → `width: auto` con mínimos en vez de topes. **(3)** Fuera el selector de crónicas de varios valles («esa barra ahí en medio es horrorosa»): `.chronicle-source` ya no existe en el DOM. **(4)** La bandeja, que no se parecía al prototipo: la hoja de roble **calcada** (caja 400,1490,454,1560, bias 0, 4 bucles), el filete acabado en punto de oro, y el canto rehecho. El canto es el trabajo de verdad: **no es un arco**, y un `border-radius` sólo sabe hacer elipses. Medido en el prototipo, la madera baja a y 1507 en la esquina y sube a 1452 en el centro —31 px de flecha— y a 27 px de la esquina sólo ha subido 6 mientras a 55 ya está arriba: hombros cortos y meseta larga. Lo pinta una tapa SVG colgada del hueco y estirada, con el papel bajo la curva y el valle por encima. Dos medidas que lo hicieron creíble: el listón es madera **clara** (tres tokens nuevos muestreados, `--skin-wood` salía casi negro) y el relleno lleva el color con el que la bandeja se pinta de verdad (`#CBB59A`) y no el del token (`#D9C2A5`), que dejaba un escalón. Typecheck y lint limpios, 54 pruebas rápidas de interfaz y los cuatro recorridos de maquetación en verde |  |
| **UI-V7 · el juego ocupa la pantalla** | **hecha**. Tres síntomas que el dueño del diseño encontró probando la demo en su tablet, y que eran **el mismo defecto**: la pantalla se movía y no se quedaba fija, el pellizco ampliaba la página en vez del valle, y no se podía girar el ángulo. `index.html` topaba `.valley-app` a `min(100vw, 390px)` por `min(100dvh, 844px)` desde U-01, y en un móvil eso es la pantalla entera y no se nota nunca; medido a 1240 × 1900, el juego se pintaba en una columna de 390 px en x 425 y la carcasa —que usa `position: fixed`, medido contra la **pantalla** y no contra esa caja— ocupaba los 1240. Arreglado con tres cambios: la caja a pantalla completa (el renderer se mide contra ella y `view.resize` reencuadra, así que **enseña más valle**), `touch-action: none` en el lienzo 3D —`#valley` lo tenía desde U-01 y `#valley3d` nació sin él— y `user-scalable=no` en el viewport. Y la mitad del trabajo es lo que quitar el tope destapó: **toda la piel está medida a 390 px**, así que la regla pasa a ser la imagen a sangre y el texto en su columna de 390, con la barra cruzando la pantalla y sus tres celdas centradas en un envoltorio nuevo. Se retira el raíl lateral de 360 px que `shell.css` guardaba para 900 px o más: con el tope **nunca se había activado**, y al quitarlo pintó una banda en el canto derecho a la vez que la página de la crónica. Medido: en móvil la geometría es idéntica pieza por pieza (placa de fecha x 27 ancho 334, rincón x 232, crónica 390) |  |
| **UI-V5c · la encrucijada, y la fuga de la cabecera** | **hecha**, informe en `ui-redesign/piel/UI-V5.md`. La decision se viste como documento sellado (3.5): fuera el velo oscuro -- el valle queda atenuado al 18 %, que es lo que 11.2 pide --, pagina que sube con franja de fusion, sello a la izquierda del titulo, tinta roja, y cada opcion una tarjeta rasgada con el precio al lado. Y **la cabecera dejaba de ocultarse**: la lista de `crossroad.ts` nombraba los elementos de U-01 y UI-V1 los metio dentro de placas nuevas, asi que se ocultaba el texto y quedaba la placa de fecha vacia encima de la decision, mas el circulo de pausa detras de las tarjetas. Medido: 3 de 3 precios en pantalla sin desplazar, cuatro piezas ocultas, cero solapes. **Falta el epitafio**, que 3.5 cubre en la misma frase |  |
| **UI-V5b · la lista de la gente** | **hecha**. El último trozo sin vestir, y el segundo sin prototipo (el 03 dibuja una ficha, no una lista): fila de pergamino rasgado con los cuatro cantos alternados, el medallón de la ficha en talla pequeña, y el nombre con la edad detrás como en la placa. **Los rasgos se quedan en texto y no como chips**: ochenta y un recuadros convierten una lista que se recorre con el pulgar en un muro |  |
| **UI-V5 · el menú de inicio** | **hecho**, informe en `ui-redesign/piel/UI-V5.md`. **La única pantalla sin prototipo**, así que se diseña en vez de calcarse: **la cubierta de la crónica** — madera de fondo, una hoja de pergamino con el canto deshilachado encima, el título con el filete y la palmeta de la crónica, y el sello de lacre en el centro como «documento por abrir». Ni un texto cambia. De paso, `--skin-seal-blob`: el sello usaba el recorte de un chip y era un cuadrado rojo, ahora es una gota de cera — arregla también el documento sellado de la crónica |  |
| **UI-V4 · la ficha de la persona** | **hecha**, informe en `ui-redesign/piel/UI-V4.md`. La ficha del prototipo 03: medallón con **monograma** (no hay retratos y no se inventan), nombre con edad, oficio, chips de rasgo, helecho calcado, tira de parentesco y los dos botones de madera y pergamino. **El parentesco sale sólo de lo que el motor guarda** —`parentIds` y `opinions`—: la «wife» del prototipo no existe porque la boda de R-1 es un suceso y no un vínculo. Falta la línea «Today», que necesita la capa de vida que el dueño está reescribiendo: derivarla del motor podría contradecir al cuerpo que se ve. 14 pruebas del modelo puro |  |
| **UI-V3b · los tres remates** | **hecha**. Salieron de la vuelta completa de capturas, ninguno visto antes: la **regleta de velocidad** seguía con la píldora de U-01 y **se salía de la pantalla** (sus cinco botones piden 220 px y el rincón ya gasta 150, en 390 no caben en fila) — ahora va vestida y **apilada encima** del rincón; el **botón de cerrar de la crónica** era `fixed` y al leer hacia abajo se comía el final de dos líneas — ahora es `absolute` dentro del velo, así que vive sobre el valle y se va con la página, y volver lo da la barra de abajo, que desde UI-V2 está siempre a la vista; y la **hoja de órdenes** («no parece que cumpla la estética del resto», dueño del diseño) pasa a chips de pergamino rasgado con la elegida en placa de tinta y letra de oro, igual que la pestaña activa y el multiplicador |  |
| **UI-V2b · la bandeja y el rincón** | **hecha**. La frase de actividad y la línea de órdenes bajan a la bandeja, centradas bajo la hoja de roble como el prototipo 01, y con ellas se retira el parche de altura de UI-V1. Y el rincón de velocidad deja de caer dentro de la bandeja: `shell.ts` mide la bandeja con un `ResizeObserver` y publica `--ui-stack-height`, porque su alto **no es fijo** — medido: la bandeja ocupaba 669–844 y los círculos 740–784, y ahora 615–659. De paso, con una hoja abierta el hueco del mensaje se **pliega** en vez de sólo ocultarse: la pila va en z-index 14 y la hoja en 13, así que el papel le tapaba los últimos 107 px y «Build first» volvía a quedar escondido |  |
| UI-R6 · validación | **hecha** — 1215/1216 en la suite rápida, 128/130 en jornadas (sin novedad), manifiesto de instalación verde; tres hallazgos documentados sin perseguir más (offline tras redespliegue, picking en aldea de 83 edificios, factura de opinión con el reequilibrado del caos) | `ui-redesign/rounds/UI-R6.md` |

### Las fases nuevas, salidas de la lista de aldeanos (16 sep 2026)

La lista completa, escrita para quien modela, está en
`docs/historico/graphics-rounds/aldeanos-por-hacer.md`. De analizarla salen cuatro fases,
y **el orden importa**: la primera es de arte, la segunda es la que hace que el
arte sirva sin tocar el motor, y las dos últimas necesitan que el motor tenga un
dato que hoy no tiene.

| Fase | Qué | Depende de | Estado |
|---|---|---|---|
| **G-19 · la hoja de contactos** | Las dieciséis figuras a tamaño natural, a 20 px y a 6 px, con quién las lleva y qué las distingue, para que la aprobación estética cueste un minuto | De G-17 y G-18 | **hecha** (`artifacts/graphics/G-19/aldeanos.html`, `docs/historico/graphics-rounds/G-19.md`). **Su veredicto quedó en duda el mismo día, y con razón:** decía que ocho de dieciséis son la misma mancha marrón, pero lo midió sobre un render de **estudio, fondo beige, sin movimiento y a píxeles de CSS**. El dueño lo miró en el juego y dijo que los modelos le gustan y que «no se ve tan mal»; el recorte del juego real a 1:1 (`artifacts/graphics/G-19/real-1a1.png`) le da la razón. Lo que sí sobrevive del análisis: las parejas que compiten por familia de color (dos azules, dos sombreros, tres verdes) son difíciles de distinguir **entre sí**. Aviso escrito en el propio informe |
| **G-20 · la medida sobre el juego, no sobre el taller** | Redirigida el mismo día: en vez de un plan de repintado, **medir la legibilidad en el juego empaquetado** —cuántos píxeles reales mide una persona a la distancia de apertura y acercada, recortes a 1:1 sobre prado— y corregir o confirmar el veredicto de G-19. Sólo si alguna figura falla **ahí**, se propone su arreglo mínimo | De G-19 | **en vuelo** (Sonnet) |
| **G-18 · los aldeanos que faltan** | Las mallas: cinco oficios por rehacer en el estilo nuevo, y los tipos nuevos —niño, anciano, forastero, leñador, albañil, pastor, pescador— | De nada. Es la sesión de Blender | **entregado** (`9cc97af`, doce ids, verificado: huesos y clips del base al byte, 54 huellas, G-17 intacto). Falta la **aprobación estética del dueño** y la demo con los doce. Buhonero, novios, doliente y vigía: fuera hasta R-5b/R-6 |
| **V-15 · el modelo se elige por lo que se hace** | La regla está escrita y probada en `src/render3d/world/models.ts`: manda la edad, luego el oficio, luego lo que se está haciendo. `Actor` gana `occupation` y la capa de vida la calcula del sitio y la oferta. Nueve pruebas en `tests/fast/life-models.test.ts` | — | **hecha, menos el último enganche** |
| ~~V-15b~~ **hecha** | `renderer.ts` sigue teniendo su propio `VILLAGER_BY_ROLE` y elige por oficio. Hay que **borrarlo de ahí**, llamar a `modelFor(actor)` y **caer al aldeano base si el recurso no existe**, que es lo que permite que las mallas se enciendan una a una sin tocar código. No se hizo porque IA-5 tenía `renderer.ts` abierto | De que IA-5 suelte `renderer.ts` | **lo siguiente** |
| **R-5b · quién acude a un funeral y a un incendio** | El motor sabe quién murió y qué edificio se quemó, pero **no sabe quién asiste**, y por eso IA-6 se negó a inventar espectadores. Falta el dato en el estado: un puñado de `id` de acompañantes en el suceso, como la riña ya trae los suyos en `who` | Cambio del motor (§7.10) | pendiente |
| **R-6 · la vigilancia** | Existen la torre y la empalizada como edificios y una bandera de amenaza, pero **nadie vigila**: no hay ocupación que ponga a una persona ahí. Sin eso, un vigía modelado se quedaría sin usar | Cambio del motor y una oferta nueva en `life/offers.ts` | pendiente |

**Por qué V-15 antes que más mallas:** sin ella, cada tipo nuevo que no sea un
oficio del motor no tiene forma de entrar en el juego, y el arte se acumula sin
verse. Es una fase pequeña —cambiar de qué se lee la malla— y desbloquea de una
vez el niño, el anciano, el granjero, el leñador, el albañil y el pastor.

### El rework de fondo (`docs/historico/rework.md`)

| Fase | Estado |
|---|---|
| R-1 · los sucesos del valle | **hecha** (v3.75), y el caos de §2.6 aplicado (v3.76) |
| R-2 · gente distinta | **cubierta en la práctica por IA-3**; la riña con `id` la cubre IA-6 |
| R-3 · diez rasgos de valle | pendiente. **El cuaderno del dueño ya trae las diez plantas** (`visual-reference` §4) |
| R-4 · encrucijadas | no es trabajo: se quedan y no se afinan |
| R-5 · más vida en pantalla | se cubre con IA-6 y con el nivelado de §4 |

## 3. Las cifras que mandan

**B-1 · EL RITMO, Y LA UNIDAD EN QUE SE MIDE (18 sep 2026).** Decisión del dueño
del diseño: el reloj realista **se queda** («está ligado a muchos sistemas») y el
ritmo se arregla con el contenido. Su objetivo, en sus palabras: **«la edad de
piedra en 60/70 horas»** y «en los primeros meses deben pasar eventos ya». La
velocidad por omisión es **×1**, y ahí una hora real es un mes de juego.

**A partir de aquí, un umbral del §12 no se mira en años de juego.** Se mira con
`npx tsx tools/reports/pace-report.ts`, que imprime la escalera en horas de reloj.
Medirlo en años es lo que dejó pasar que v3.72 multiplicara la semana por 56 sin
que nadie remidiera nada: cuatro constantes decían una cosa y significaban otra
(el techo de decisión «30 minutos reales» eran 28 horas; la migración tiraba una
vez cada once horas; la obra venía calibrada para la aldea de veinte de antes de
v3.69; y las puertas de §7.3 pedían 25-45 personas a valles que llegan a 23).

La escalera que manda ahora (24 semillas × 60 años, `prudent`, horas a ×1):
primer suceso **1,2 h** · cinco personas **56 min** · primera decisión **14 h**
(antes 100) · diez personas **11 h** · granero **27 h** · capilla **47 h** (antes
nunca) · veinte personas **32 h** · **edad de piedra 61 h** (antes 661) · molino
**70 h** (antes 490) · corona **99 h**. Una partida acabada de 24, la misma que
antes; población final de 0 a 80; semanas con el ánimo bajo, del 26 % al 4 %.

IA-18: tick947/semana35. Semilla 11, 26 personas: id37 recoge, carga a 1,13 s,
camina a 1,20 s, descarga a 1,87 s y entrega a 3,87 s; dos entregas y dos sacos
al final. Semilla 7, 21 personas: cuatro porteadores, ruta del id3 de 19 a 6
tramos en 45 s, aún sin descarga. Cero descargas vacías, errores, deriva,
penetraciones o centros bloqueados. 89 pruebas dirigidas, typecheck y lint.

IA-17: semilla 11/año44, tick2064, 62 personas, obra `stone_house` 166,29/170
y cantera en celda4056. Id15: pico a 17,33 s, carga a 23,33 s, descarga a
24,17 s y entrega a 25,67 s. Cero errores, deriva, penetraciones o centros
bloqueados. 68 pruebas dirigidas, typecheck y lint verdes.

IA-16: semilla 67/año19, toma viva a ×64 y 6 fps: tick 864→865, celda 2986,
bosque 472→471; caída 1,17→2,67 s, tocón visible desde 2,17 s y tronco retirado
a 8,17 s. Semilla 1: 0 rebrotes en tick432 y 1 en tick480. Cero errores, deriva,
penetraciones y centros bloqueados. 97 pruebas dirigidas, typecheck y lint verdes.

IA-15: semilla 7/año20, 286 fotogramas a 15 fps siguiendo al id2: tala, carga,
transporte, descarga a 17,93 s y vuelta, 1 entrega, 0 charlas con carga. Semilla
11/año20: 27 personas, 17/17 puestos alcanzados, cinco ids en tala/transporte/
descarga. Dos tomas con 0 errores, deriva, penetraciones o centros bloqueados;
tick fijo 912→912. 72 pruebas dirigidas, typecheck y lint verdes.

**G-25 · tamaños:** ocupación horizontal 28–99 % de celda, variación vertical superior a 4×; 49 pruebas, typecheck y lint correctos.


**G-25 scrub:** 244 triángulos, 2 materiales/mallas, 22 524 bytes y altura
0,304 celdas. 53 recursos empaquetados; sin medición nueva de rendimiento móvil.

**G-25 reed:** 72→228 triángulos; 3 materiales/mallas, 21 572 bytes, altura
0,572 celdas. Verificación de todos los vértices tras giro/escala por instancia.

**G-25 rock:** 72→186 triángulos, dos materiales/mallas, 17 496 bytes.
Contención comprobada sobre vértices del GLB en todas las instancias del mapa de prueba.

**G-25 tree:** 188→352 triángulos; 3 materiales/mallas; 9 868→30 428 bytes.
Huella física del tronco idéntica al GLB anterior. Sin medición móvil nueva.

**OBS-02 piloto + comparación:** 5 revisores (3 Luna, Terra y Sol), 3 casos,
139 PNG archivados y 10 informes originales. 0/5 detecciones visuales concretas de
marcha lateral y vado; contacto no aislado suficientemente. 24 encargos sin ejecutar.
No valida el juego actual ni mide una tasa universal de acierto.

IA-14: 27 personas en comparación seed11/año20, 61 frames por toma a15fps.
485/1063→44/1089 muestras con desalineación >60°. Noche seed43/año60:
21/22 completas, pendiente132 en tick2834, cero penetraciones/deriva.

OBS-01: día 15/15 y 21/21 puestos alcanzados (11/20 y 43/60); noches vivas
22/22 y 21/22 completas (7/1 y 43/60), ticks 0→3 y 2832→2835. Residente 155
pendiente al amanecer del tick 2834. Nueve tomas sin errores ni penetraciones
muestreadas. Gallina y peces observados; cuatro especies y ancianos sin evaluar.
WLD-01 confirma mediante GLB transformado que una losa de G-24 sigue fuera de
su celda, aunque su raíz esté bien colocada: la conclusión visual previa era excesiva.

G-24: semilla 7/año 1, dos celdas de vado `(38,52)` y `(39,52)` frente al campo
en `x=34…36`; 17 fotogramas revisados, 2 personas y 3 animales. Cero errores,
penetraciones, centros bloqueados o deriva. 60/60 pruebas dirigidas, typecheck
y lint verdes. La toma mantiene `engineTick=0`: valida colocación, no evolución.

IA-13: semilla 7/año 1, toma viva a ×64, 6 s y 15 fps; dos residentes, tres
animales y tres noches completas. Apertura, paso y cierre visibles en los
fotogramas 10–20 aunque el residente ya conste `sleeping`; cero errores,
penetraciones, centros bloqueados o deriva. 20/20 pruebas dirigidas verdes.

Limpieza estática: 1 módulo, 1 alias ejecutable y 1 tipo huérfano eliminados;
112 exportaciones públicas innecesarias cerradas. Typecheck, lint, build y
comprobación de inalcanzables verdes. Knip final sólo deja puntos de entrada
manuales/configurados y tres falsos positivos con consumidores comprobados.
Suite: 1.327/1.330; las tres rojas no pasan por los símbolos retirados.

IA-12: dos tomas diurnas reales (semillas 11/43, años 20/60, 45 s a 2 fps),
15/15 y 21/21 trabajadores/religiosos asignados llegan a ejercer. Cero discrepancias
de burbuja de charla o clip aplicado. Mayor natural (7/37): descanso y conversación
observados; ocho clips nuevos comprobados sobre esqueletos publicados. Detalles,
regresión nocturna y límites en `docs/historico/life-rounds/IA-12.md`.

IA-11: 62 pruebas pertinentes en 11 archivos; typecheck, lint y bundle verdes.
Tres partidas vivas a ×64, 42 s y 2 fps: 22/22 noches completas cada una, 66/66
en total. Semillas 7/11/43: 2, 23→22 y 32 residentes con casa. Ticks 0→3,
912→915 y 2832→2835. Cero penetraciones de personas/animales, centros en sólidos,
desajustes cuerpo/modelo y errores JS muestreados. Evidencia en IA-11/delivery.

IA-10: 156 pruebas pertinentes verdes. Tres tomas del renderer real con estado fijo:
semillas 7/11/43, durmiendo 2/2, 14/23 y 26/32 con vivienda. Cero penetraciones
y desajustes cuerpo/modelo muestreados. No equivale a una partida completa.
Casas con puertas: paja 668 triángulos/6 materiales; piedra 764/5.


G-23: vaca de 3476 triángulos, cuatro materiales; clips idle/walk y controlador
por distancia. 42 pruebas pertinentes verdes. Cuatro llamadas por vaca visible;
sin nueva medida de FPS móvil.
Cerdo: 2808 triángulos, cuatro materiales y 18 huesos; 43 pruebas pertinentes.
Gallina: 874 triángulos, cuatro materiales y 12 huesos; 45 pruebas. Banco de
40 cerdos: CPU/envío mediana 1,6 ms, p95 3,8 ms; no es una medida de FPS móvil.
Lobo: 2828 triángulos, cuatro materiales, 18 huesos. 50 pruebas pertinentes.
Cuervo: 826 triángulos, cuatro materiales, 12 huesos. 52 pruebas pertinentes.
Pez: 700 triángulos, cuatro materiales, seis huesos. Cierre: 75 pruebas en seis
archivos; GLB de las seis especies 1 916 800 bytes. Todos los hashes verificados.

**Inventario del nuevo encargo de aldea:** 21 ids existentes en cuatro tandas;
las variantes de vivienda y adornos nuevos se definirán con su integración.
Casa de paja: 656 triángulos y cinco materiales/mallas; piedra: 752 y cuatro.
Molino: 966 triángulos y cuatro materiales/mallas; herrería: 894 y cuatro.
Granero: 1 220 triángulos, cuatro materiales/mallas y GLB de 89 972 bytes.
Capilla: 776 triángulos, cuatro materiales/mallas y GLB de 57 672 bytes.
Iglesia: 1 230 triángulos, cuatro materiales/mallas y GLB de 89 412 bytes.
Pozo: 1 108 triángulos, cuatro materiales/mallas y GLB de 78 572 bytes.
Campo cultivado: 2 056 triángulos, dos materiales/mallas y GLB de 160 704 bytes.
G-22 sustituye ese campo por trigo de 4 732 triángulos y tres materiales/mallas.
Coles G-22: 2 292 triángulos y tres materiales/mallas.
Puerros G-22: 2 212 triángulos y tres materiales/mallas; 52 recursos empaquetados.
Campo segado G-22: 232 triángulos, un material/malla y GLB de 17 856 bytes.
Carro G-21: 888 triángulos, tres materiales/mallas y GLB de 64 556 bytes;
94 pruebas verdes, incluidas las seis de colocación de adornos.
Almiar G-21: 958 triángulos, tres materiales/mallas; altura 0,666667 celdas
conservada y 94 pruebas verdes.
Pila de leña G-21: 1 544 triángulos, dos materiales/mallas, 97 652 bytes;
94 pruebas verdes y captura real revisada.
Leña: geometría reducida un 10 %, conservando la escala de exportación 1/3.
Cobertizo G-21: 844 triángulos, tres materiales/mallas y 62 564 bytes;
parcela 1×1, altura máxima 0,912712 celdas.
Defensas G-21: empalizada 318 triángulos / 23 808 bytes; piedra 276 /
21 636 bytes; dos materiales cada recurso. 16 máscaras cardinales cubiertas
por pruebas. Las esquinas añaden geometría recortada propia del render.
Torre G-21: 1 638 triángulos, cuatro materiales, 119 384 bytes; 86 pruebas,
typecheck y lint verdes. Banco con renderer real y estado de prueba revisado.
Cementerio G-21: 936 triángulos, tres materiales, 68 260 bytes; 86 pruebas,
typecheck y lint verdes, captura natural bajo lluvia y banco de integración.
Ruina de madera G-21: 792 triángulos, tres materiales, 57 084 bytes;
90 pruebas, incluidas cuatro huellas de parcela sin deformar la altura.
Ruina de piedra G-21: 956 triángulos, cuatro materiales, 70 436 bytes.
Cierre de los cuatro: 90 pruebas, typecheck/lint verdes y huellas de todos
los artefactos y archivos publicados verificadas.
87 pruebas verdes para cada entrega; revisadas dentro del juego real.

**G-18:** doce modelos, 0,65 celdas, cuatro materiales/mallas, 948–1092
triángulos. 29 pruebas y doce auditorías verdes; las huellas de G-17 se conservan.

**G-17:** cuatro modelos de 0,65 celdas; 1056 / 1116 / 1012 / 960 triángulos
(base / herrero / cura / granjero), cuatro materiales y cuatro mallas cada uno.
Typecheck y lint verdes; 16/16 pruebas del rig; cuatro construcciones y cuatro
auditorías de animación verdes. Todos reproducen los clips del base.

**Movimiento** (`npx tsx tools/reports/life-report.ts 7 23 97 --days 2`, 26 880
cuerpo-segundos). La primera columna es el estado antes de tocar nada.

| | línea de partida | ahora (`7822454`) |
|---|---|---|
| centro en celda cerrada | 0 | **0** |
| círculo en celda cerrada | 1,31 % | **0,09 %** |
| giros > π/2 estando parado | 4,75 % | **0,39 %** |
| parados con impulso ≥ 0,9 | 0,20 % | **0,00 %** |

Los giros subieron de 0,21 % a 0,39 % en `7822454` y es efecto conocido: un
animal que ahora se queda quieto en su sitio gira ahí. **Vigilar.**

**El día de cada especie** (`npx tsx tools/reports/life-report-species.ts 7 23 --days 2`):

| | andando | quieta sin nada | lo suyo |
|---|---|---|---|
| gallina | 35,7 % | 51,3 % | **13,0 %** |
| cerdo | 28,5 % | 30,6 % | **40,9 %** |
| vaca | 82,5 % | 0,7 % | **16,9 %** |

De partida eran: gallina 88,7 % andando y 8,9 % lo suyo; cerdo 65 % y 34,6 %;
**vaca 95 % andando y 2,8 % pastando**. La vaca sigue siendo la que más anda —es
el cuerpo más lento y el de parches más anchos— y el siguiente nivel está en las
duraciones y distancias del cuaderno del dueño.

**Interacciones** (IA-2): 1 144 empiezan, 1 122 terminan, **0 colgadas**.
**Historia visible** (IA-6): 80–91 riñas reales por semilla en 40 años, de ellas
6–20 montadas, terminadas y liberadas el mismo día del suceso; **0 canceladas,
0 colgadas** en las ~514 revisadas.
**Sucesos del valle** (R-1): en una aldea hecha, unos 12 al año; en un caserío,
menos, porque la cadencia va con la población desde v3.78. **3 de 12 valles se
rompen a los cuarenta años** —antes eran 8— y los nueve que aguantan llegan con
entre 20 y 57 habitantes, antes 22, 9, 4 y 1.

## 4. Lo abierto, por orden de lo que más duele

### 4.0 · Pendientes del juego de los medios y del balanceo (17 sep 2026)

**Lista a petición del dueño del diseño** —«todo lo que dejemos sin hacer hay que
anotarlo»— al cerrar las cinco fases M-0 a M-4 y el primer balanceo. Está
ordenada por lo que más cuesta que siga abierto, y cada línea dice **de quién
es**.

| Qué queda | De quién | Por qué no está hecho |
|---|---|---|
| ~~El paquete de prensa~~ · **hecho el 19 sep 2026**: pedido el 18 sep para un vídeo tráiler | `tools/graphics/press-kit.mjs` (skill `press-kit`) | **98 capturas × 2 tamaños reales**, mismos nombres en los dos: `artifacts/graphics/press/` (móvil, 1170 × 2532) y `artifacts/graphics/press-ipad/` (iPad Pro 12,9", 2048 × 2732) — decisión del dueño el 19 sep, «móvil vertical + iPad vertical», nada de 16:9 literal. Las pantallas con interfaz y el metraje sin interfaz (nueve edades, cuatro estaciones, diez escenas, el cerco, el asedio, ocho estados y las cuatro lápidas). **Cuatro defectos reales de la herramienta, arreglados esta ronda**: (1) un ítem que fallaba dentro de un bucle mataba el proceso entero sin avisar — los siete bucles por ítem van en `try/catch`; (2) pedir una hora exacta (`09:00`) a ×64 fallaba casi siempre porque esa hora sólo «existe» en pantalla ~83 ms — se pide una banda de luz de día (8–17); (3) `getByRole('button', {name: '64x'})` con la equis ASCII nunca existe y sin plazo propio Playwright esperaba el máximo por si acaso — eran los picos de ochenta segundos; (4) **el primer intento de iPad salió roto**: `--width 2048 --height 2732 --scale 1` son los físicos tal cual, pero un iPad real tiene viewport CSS 1024 × 1366 a densidad ×2 — pedirle los físicos como CSS le dice al juego que tiene una pantalla cuatro veces más ancha de lo real, y salió con el contenido diminuto en medio de un vacío enorme. La receta correcta queda en la cabecera del fichero. **Y uno que queda documentado y sin cerrar del todo**: en una tanda larga puede colarse una encrucijada nueva entre el último `dismiss` y el disparo, 1-2 de 9 capturas de una tira larga. El guion del tráiler que el dueño escribió está en su mensaje del 18 sep — y dos de sus planos **no existen en el juego**: un valle literalmente vacío (se abre con la pareja ya puesta) y un entierro (no hay clip; la muerte se cuenta en la crónica y deja tumba) |
| ~~**Una crónica enseña `{B}` en vez de un nombre**~~ · **arreglado el 19 sep 2026 (S-09)** | Hecho | Cazado en una captura de UI-V10: en la semilla 7 al año 50 se leía **«The smithy passed to {B} in year 49.»**, con la llave y la letra en pantalla. La causa: `namesOf` (`crossroads/resolve.ts`) se salta a quien tiene el nombre vacío, y `feud_inherited` reparte `{as:'B', childOf:'A'}` — **el único reparto de todo el catálogo que no saca de la reserva de nombrados**, porque busca un hijo de verdad y un hijo casi nunca lo está. Medido: el hueco salía en **12 de 12** valles fundados con la pareja, siempre esa plantilla, siempre entre los años 26 y 27. **El dueño eligió nombrar a quien sale elegido** —de las dos opciones, la otra (repartir sólo gente nombrada) mataba la plantilla para siempre, porque su B es un hijo por definición—. Se nombra en `applyOption` (`resolve.ts`) antes de aplicar los efectos de la opción, para que si además da un oficio (`{k:'role'}`) quien lo recibe ya sea un personaje. `promoteToNamed` (`people/villagers.ts`) acepta ahora `role: Role \| null` para esto: nombrar sin oficio, sin el suelo de edad de §12.4 que sólo tiene sentido cuando hay un puesto de verdad que cubrir. Sólo gasta una tirada del flujo `names`, nunca del `crossroads` — no mueve el sorteo de encrucijadas de ninguna partida. Medido tras el arreglo: 22 líneas de `feud_inherited` en doce semillas, todas con nombre, cero huecos `{X}` en cualquier plantilla. La prueba que lo vigilaba en rojo a propósito (`tests/fast/chronicle.test.ts`, «Un hueco de reparto llega a la pantalla») pasa de `it.fails` a `it`. Ver changelog 4.17 |
| **Al seguido se le puede tapar la ficha** · consecuencia conocida de UI-V10 | Sesión de piel, si molesta | La ficha baja ocupa el 40 % de abajo, y `track` **marca pero no centra la cámara** (decisión de UI-R0, comprobada contra `backend.live.track`), así que a quien esté en el tercio inferior del valle se le sigue con el anillo de oro detrás del papel. Se vio en la toma de la ronda con Hakon. Arreglarlo es decidir que seguir a alguien **sí** mueva la cámara, y eso es una decisión del dueño del diseño, no un ajuste |
| **La temática visual nueva, sin integrar** · subida el 18 sep 2026 | Sesión de piel (`piel-del-valle`) | Cinco grabados de **una sola tinta parda sobre papel crema** —marco de hojas de roble, esquina de vid, sello con el roble, banderola y la hoja—, con las palabras del dueño: «todo debe pasar por nuestra skill» y «la nueva temática es **menos colorida**». Referencia estable y correspondencia pieza a pieza en `docs/visual-reference/engraving/README.md`; tareas en `plan-arte-pendiente.md`; regla en §10 de la skill. **Lo que esto cambia hoy mismo**: los tres prototipos de `ui-prototypes/` siguen mandando en la maquetación y **dejan de mandar en el color**, así que la hoja de roble en oro (`--skin-gold`) y el capitular en rojo son de la versión anterior. Y **la banderola no tiene sitio todavía**, que es el hueco más claro: la fase del valle (A5) se lee en versalitas sueltas y en una banderola sería un rótulo |
| **Cuatro crónicas sin su imagen** · destapadas al escribir la regla nueva | Sesión de arte | Regla del dueño del 18 sep: «cada vez que crees una crónica hay que ir creando la tarea de pedir las imágenes» (en `CLAUDE.md` y como §4c de la skill `goal`). Las cuatro son de `kind: 'built'`, así que `illustrationFor` las manda al grabado genérico de construcción: **`wall.closed`** —el cierre de la villa, **peso 3**, una vez en la vida de una aldea— comparte dibujo con «se ha levantado un campo», y con ella el portón (A2), la muralla de piedra (A4, que hasta hoy no levantaba ningún valle) y la atalaya (C3). Encargo con clave y qué enseñar en `plan-arte-pendiente.md` |
| ~~**El barril y el arado en la escena**~~ · **hecho el 18 sep 2026** (§7.14): el barril en el corro de la plaza mientras dura la fiesta, y se bebe de él; el arado apoyado dentro de su campo. **Queda una de las tres**: el arado **acarreado** el día que se da, que es una escena de dos con la carreta y no una colocación | Sesión de vida (`life/props.ts`) | El sitio se midió tres veces tras el aviso del dueño («el posicionamiento no estaba bien hecho»): entre el trigo, luego a las afueras, y al final en una plaza del corro con 0,8 de aire |
| **La malla del arado** | Sesión de Blender | No existe ninguna: `manifest.json` tiene 57 recursos y ni barril ni arado. **Encargo completo en `docs/encargos/encargo-arado.md`** (medidas, piezas, materiales, presupuesto de 400 triángulos y los tres pasos para meterlo). El barril lo tiene el dueño casi hecho |
| ~~**Los lobos van al corral**~~ · **esta línea estaba mal anotada**: ya lo hacía IA-5 (`life/wildlife.ts`), y el 18 sep 2026 se rodó para comprobarlo | — | Toma de 90 s en la semilla 11, año 30, con el suceso provocado (`--happening wolves_at_the_coop`): el lobo sale del bosque, se acerca a **1,8 celdas de una gallina y 1,0 del corral**, ronda y se vuelve. Cero errores y cero penetraciones. Lo que faltaba no era el lobo: era poder **provocar** el suceso para verlo |
| **LA META: la villa cerrada y el asedio** (`design.md` §1b, 18 sep 2026) · **A1, A2, A2c, B1, B2, B3, B4, C1, C2, D1, D2, D3, D4 (el núcleo) y D5 (el portón) hechas** (el cerco es de una capa y tiene dos puertas funcionales; la guarnición sube de una a siete manos la víspera de un asalto y ocupa todos sus puestos; **la muralla dispara**, y en el navegador tumba a 8 y 10 de 12 saqueadores con flechas de Rapier; **y el valle se puede perder**: `stormed` es el final de un valle tomado, y caen 3 de 12 sin dar defensa y 0 de 12 dándola; y **el resultado de la batalla física ya entra al motor** por la puerta de `PlayerAct`, con la semana de espera que deja que la pelea decida; **y el portón se rompe a golpes**: en el navegador, cinco hombres meten 18 de los 60 golpes antes de que las flechas se los coman; y **defender cuesta**: de 0 a 3 bajas propias por asalto) (el mundo físico ya existe y cuesta el 1,2 % del presupuesto; falta medirlo en un móvil de verdad) (el clan vecino baja a las 103 h y saquea; la mitad grande de «caer» espera a la batalla física): el cierre se cuenta con peso 3 y deja marca (`flags['wall_closed']`), y el portón es un edificio que va en el anillo (200 h de reloj); medido, la villa se cierra a las **425 h** de reloj contra las 61 h de la edad de piedra, y ese hueco es lo primero que pedirá el nivelado · **el plan está en `docs/plan-meta.md`**: ocho puntos (A-H), sus fases, prioridad, dificultad y agente (Luna/Terra baja, Sol media, Astra alta), y el orden en seis pasos | Dueño + quien retome | La fase 3 (villa cerrada) está a medias: el anillo existe y se cierra, el cierre no se celebra ni se ve distinto. La fase 4 (asedio) está por hacer entera y tiene tres piezas con coste conocido: flechas y aldeanos-torre (barato), cuerpo a cuerpo y ejército hostil (una tanda como la IA de la vida), gore y destrucción visible (sesión de arte: hoy no hay un solo clip de pelea). Antes de escribir el brief hay que decidir con el dueño qué es «caer» —el motor tiene tres finales y ninguno es una derrota militar— y con qué motor de físicas (balística propia basta para las flechas; el cuerpo a cuerpo con caídas pide más) |
| ~~**LA LETALIDAD: el valle ya no se rompe**~~ · **respondido por el dueño el 18 sep y resuelto por B3 el mismo día**: `fate-chaos` **está verde** — la letalidad vino por el asedio, como él dijo: un valle al que no se le da defensa lo toma el clan vecino (3 de 12 en ochenta años, 8 de 24 en la escalera del ritmo). Lo que sigue abierto es el nivelado fino (G4) y por dónde muerde el hambre, abajo · lo que contestó: «no pasa nada, todo eso se irá nivelando y haciendo el juego más difícil; si la vas cagando, el valle puede morir. Esa es la clave». La letalidad vendrá por las decisiones y por el asedio (§1b), no por remedir el rayo. `fate-chaos` **ya no**: B3 la puso verde | Decisión tomada | B-1 arregló el ritmo y con ello se llevó el caos: `tests/journeys/fate-chaos.test.ts` mide el principio —«que haya partidas que se rompan es la idea»— y da **0 de 12 valles acabados donde pide 3 o más**; a sesenta años, 1 de 24. La causa está medida y es la misma que arregló el ritmo: con casas a tiempo hay camas, con camas llega gente, y el ánimo pasa de estar por debajo de 25 el 26 % de las semanas al 4 %. La prueba se queda **roja y sin tocar el listón**: bajar la cota sería borrar el principio. Lo que hay que decidir es **por dónde muerde el mundo** — el hambre (el grano toca cero y no mata a nadie, la línea de abajo), los desastres acumulados de M-1, o la gracia de la pareja, que hoy cubre `GRACE_PEOPLE` 6 y `GRACE_YEARS` 5 |
| ~~**DOS DEFECTOS DE LA MURALLA, medidos al hacer D3**~~ · **arreglados de raíz el 18 sep 2026 (A2c)** | Hecho | Los encontró la partida del valle vecino al buscar por dónde entrar: en la semilla 41 el interior transitable eran **232 celdas de 8 064** con el portón dando a una bolsa aparte, y en la 7 el portón tenía tres lados tapiados. Se remendaron dos veces por síntomas hasta que el dueño del diseño mandó parar y atacar el problema. **La causa era el grosor**: el anillo se plantaba en una banda de celda y media, así que la muralla salía de dos capas y una puerta de una celda perforaba sólo una. Ahora el anillo es un círculo rasterizado de una celda (`ringCells` en `placement.ts`). Medido en diez valles: **0 de 10 con dos capas** (antes 5), **0 encerradas**, **20 de 20 puertas útiles**. Ver changelog 4.02 |
| **La segunda puerta no cabe en dos valles de diez** | Sol (motor), cuando toque A3 | Medido al cerrar A2c: el jugador puede pagarla en **8 de 10** valles, y en los otros dos el carro la rechaza por sitio. La causa es legítima —una puerta necesita suelo libre dentro **y** fuera, y esos pueblos construyeron hasta pegar con su propia muralla— así que la negativa es honesta y no un fallo. Lo que lo arreglaría de verdad es reservar el paso de una **segunda** puerta como se reserva el de la primera (`inGateway`), y eso encaja con A3 (el segundo anillo), no aquí |
| ~~**A4 bloquea A5, y media C3**~~ · **A4 hecha el 18 sep 2026** | Hecho | La villa de piedra está cerrada y con ella se desbloquean las tres cosas que esperaban. Lo que A4 destapó es que **la muralla de piedra era contenido muerto**: su única puerta era la encrucijada de la primera piedra, que obliga a elegir entre la muralla y las casas, y en doce semillas a ochenta años se desbloqueó en diez y **las diez eligieron las casas** — cero valles con un solo muro de piedra, y la malla `wall.glb` en el juego desde G-10 sin dibujarse en una partida. Ahora **un cerco cerrado la abre por sí solo** (`flags['wall_closed']`, sin campo nuevo): **10 de 12 valles**, a las **249 h** de reloj. La **era** (`src/derive/era.ts`) se deriva y no se guarda, es monótona, y el asedio **no** es una era. Peldaños nuevos: aldea a las **40 h**, villa a las **249 h**. Y la segunda mitad de C3: **la torre va contra el cerco** (de 10 de 20 pegadas a 20 de 20). **Y A5 se cerró el mismo día**: la era se lee bajo el ornamento de la bandeja —en la placa de fecha no cabe, medido: 23 px de holgura contra los sesenta y pico que pide la palabra— y cada cabecera de año de la crónica dice la fase de *aquel* año (`eraAtYear`). Lo que queda, apuntado en A3, es **el bastión** — una torre en la línea del anillo, que hoy taparía tres tramos y daría de baja uno |
| **La reunión de §11.8 no cabe en una aldea grande** | Sesión de vida (Anexo E) | Medido en B-1: se junta el **54 %** de la aldea (244 de 450 en doce combinaciones), y la fracción baja con el tamaño —la semilla 23 (19 personas) junta 10, la 41 (70) junta 28—. El corro son anillos alrededor de un punto y setenta personas no caben; subir el aforo pedido **no cambia nada** (medido con 40, 80 y 140 plazas). Tres pruebas declaradas con lo medido en `life-staging.test.ts`. Lo que B-1 **sí** arregló: el corro caía en una bolsa de suelo cerrada y la reunión se descartaba entera (cero de veinticinco) |
| ~~**Rehacer el banco de balance**~~ · **hecho el 19 sep 2026 (G2)** | Cerrado; lo que queda de las cuatro rojas es nivelado del dueño | **Las dos cifras de esta fila estaban caducadas y era lo primero que había que saber: son 11 rojas de 37, no 19, y lo de «tarda más que su presupuesto» estaba caducado — aunque la cifra que se le puso encima, 31 minutos, era igual de frágil: tres pasadas dan 31, 31 y 46, y la tercera se pasó del tope de 45 corriendo sola.** Nadie lo había corrido desde M-4. Las cuatro rojas, con causa: **cadencia** 12,6–16,8 por generación contra 1–5 (el suelo de §8.6 bajó de 48 a 16 ticks esta misma mañana, y R-1 metió una tirada semanal); **extinción prudente** 26,7 % contra 2–12 % (**es §1b funcionando**: casi todas son valles tomados); **bosque** 72,7 % de pie contra 40–70 % —y la dirección importa: **no se agota, se queda entero**, porque la leña no es cuello de botella—; y **elegibilidad** de `after_the_raid` (4,3 %), `raiders_coming` (3,7 %) y `breaking_ground` (1,3 %, sólo bajo `worst`). **No se movió ningún número**: las cuatro en `it.fails` con la propiedad intacta y la cifra al lado. Lo que se compró es que el banco **vuelva a estar verde al correrlo**, que es lo que lo hacía inútil. **Y la quinta sí era del instrumento**: la prueba de cobertura daba por muertas plantillas que el juego plantea en todos los valles, porque su banco funda con veinte personas en el tick 0. Jugando de verdad **se plantean 20 de 21**; la sustituye `tests/journeys/catalogue-coverage.test.ts`. Medida entera en `docs/medidas/banco-de-balance-2026-09-19.md` |
| **El hacha es el medio más flojo** | Decisión del dueño | 18 de plata para +2 obras de 60 y la primera piedra hasta veinte años antes en algún valle, pero sin mover la población (39 contra 40 en sesenta semillas). O baja de precio o necesita otro efecto; inventar el número sería inventarlo |
| ~~**El grano toca cero y no mata a nadie**~~ · **remedido el 19 sep 2026 (G1), y la premisa ya no es cierta** | Cerrado, decisión del dueño | Esta fila es de antes del ritmo nuevo (§8.6) y de B-1; medida entonces, la comida bajaba a menos de una semana por persona y no mataba a nadie en sesenta años. **Vuelto a medir con `npm run attribution`** (60 semillas × 200 años, el informe canónico de §12.9): **el hambre es hoy la primera causa de muerte del juego, 40,9 % de 31 224 muertes** —por delante de la vejez natural (36,4 %), la peste (12,0 %) y la violencia (8,9 %)—. El dueño decidió que está bien así: no se toca `FOOD.STARVATION_RATE` ni la capacidad del granero. Se cierra con la cifra, no con un número inventado |
| **`quiet_years` deja de salir nunca** | Decisión del dueño (balance) | Es la plantilla de reserva y deja de hacer falta por M-1: al abrir el ladrón y el diezmo a la riqueza, la aldea tiene más preguntas propias. Se queda donde está. **Y desde G2 su silencio se afirma en vez de excusarse** (`tests/journeys/catalogue-coverage.test.ts`): es el canario del catálogo, porque si empieza a salir lo que dice es que el resto se ha quedado sin condiciones que cumplir |
| **`plague_blame` vive fuera del horizonte de un jugador** | Decisión del dueño (contenido) | Medido en G2: **no sale en sesenta años en ninguna de 24 semillas**, y hacen falta cien para verla. Sesenta años son 672 h de reloj a ×1 y el último peldaño del juego cae a las 350 h, así que hay una plantilla del catálogo que nadie va a ver jugando. No se ha tocado |
| ~~**`state.intent` en el motor**~~ · **retirado el 18 sep 2026** (K-7): K-2 le quitó el último lector al pasar la cola de obras y el reparto de manos a la voluntad del rey. `PRIORITY_FAMILIES` se queda, que ahora es del rey | Hecho | Sacarlo es una migración entera por limpieza y la limpieza va después (decisión 5). La interfaz ya no lo escribe: `setIntent` y la hoja de órdenes están borradas | La única excepción a §13.1 de la fase, escrita en el changelog: un guardado de la v2.0 con palanca puesta cambia de postura al cargarlo |
| ~~**LA PLAZA**~~ · **P-1 y P-2 hechos el 18 sep 2026** (§7.4b): se elige al fundar, se guarda (esquema 8), nadie construye dentro, el pueblo se ordena a su alrededor y se ve empedrada con una fuente. **Queda P-3**, la malla de la fuente: encargo en `docs/encargos/encargo-fuente.md` | Blender | Hoy la plaza es **un punto calculado y nada más**: `valleyCore` (`derive/anchors.ts`) es la media de los centros de los edificios en pie, se recalcula cada vez que se pregunta —así que **se mueve sola** mientras la aldea crece—, no se dibuja nada en ella y puede caer dentro de una casa o entre sembrados. El dueño la quiere «un espacio con un círculo grande, con separación, y en el centro quizás una fuente». Eso son tres trabajos y uno es del motor: ver §4.0b | La de apaño son tres primitivas y se ve; la buena son 500 triángulos y cinco piezas |
| ~~**LA MURALLA POR SECCIONES**~~ · **hecha el 18 sep 2026** (§7.4c, esquema 9): anillo escrito en el estado, la muralla crece pegada a sí misma, su línea es suya y el anillo siguiente va tres celdas afuera. Al año 40, un solo tramo en cuatro semillas | Hecho | «¿Podemos también evitar esos cachos sueltos? … la muralla también tendrá que quedarse por secciones: si la aldea crece a un cierto punto, se construye la muralla alrededor y después la siguiente sección de construcción va fuera de la muralla.» Hoy la empalizada se levanta **pieza a pieza sobre la envolvente del núcleo** (§7.4, `onEnvelope`), y la envolvente crece con la aldea, así que las piezas quedan repartidas por envolventes distintas: **de 7 a 19 tramos desconectados por valle al año 60**, medido. Lo que se pide es un **anillo**: cuando la aldea llega a un tamaño se fija un perímetro, se completa sección a sección, y lo que se construye después va fuera. Es un cambio del motor con estado nuevo (el anillo en curso) y toca §7.4, §12 y el trazado de todos los valles |
| ~~**El rey**~~ · **K-1 a K-8 hechos el 18 sep 2026** (§6.7, esquema 10): se corona desde el carro, ocho pasos del tick leen su voluntad, la corona pasa por la sucesión y tiene su sala. **Queda K-6 a medias y K-7 sin empezar** | Medida en `docs/medidas/rey-medida.md` | «Más adelante». Sus piezas están puestas: tesorería en plata, rasgos que un medio añade, `who` en los sucesos. Nada de M-0 a M-4 lo impide | Lo que no llegó: **el rey del campo no tiene firma** —tres permisos probados y medidos, ninguno se ve— y eso es decisión del dueño (lo que queda sin usar es la cosecha por campo). Y la malla de la sala, encargada en `docs/historico/plan-rey.md` §8. K-7 es retirar `state.intent`, que ya no lo lee nadie. **K-8 lo pidió el dueño al probarlo** —«cuando selecciones un rey, tiene que destacar después en la lista. No se ve rey en chiquitito, parece uno más»— y está hecho: medallón de lacre, chapa con la corona, primer sitio de la lista y a qué atiende el valle con él, en la lista y en la ficha (`artifacts/graphics/K-8/gente-rey.png`) |
| **Una prueba rápida roja y once jornadas** | Sesión de vida | **B-1 rehízo la cuenta.** Rápida: queda **una**, la del devoto (`life-needs`), y dice algo distinto que antes — no es que nadie rece (0 % contra 0 %, porque no había capillas), es que el devoto reza el 8,6 % del tiempo contra el 6,0 % del resto y la propiedad pide el doble. Las tres de `life-staging` están declaradas con su medida. Jornadas: **9 de 161** (y las nueve son la familia de R-1: `life-beasts` ×3, `life-decide` ×2, `life-places`, `life-props` ×2 y `notices`) — A2c curó `works`, **B3 curó `fate-chaos`** (roja desde B-1) y la tanda de la fase 4 curó `founding`, y B-1 **curó** `founding` («a los diez años es una aldea») y dos de `life-props`; siguen `notices` (16,2 avisos al año contra 6, era 14,1; remedido el 18 sep tras A2c, y lo que habla son los doce sucesos de R-1 —`fate.*` en los doce primeros puestos—, no la muralla), `life-decide` ×2, `life-places` ×1, `life-beasts` ×3 y `life-props` ×2. La familia es la de R-1 §2.8 |
| ~~**Tres pruebas rápidas rojas**~~ (`life-needs`, `life-staging` ×2) | Sesión de vida | `graphics-clock` **arreglada el 18 sep 2026**: comparaba doce clips contra los cuatro del GLB desde IA-12, que añadió ocho fabricados en código. Las otras tres siguen siendo ajenas; una es una declarada que cambia de estado según la trayectoria |
| **Leer la crónica de un valle anterior** | Interfaz, sin dueño asignado | Sin puerta de entrada desde que UI-V8 retiró el selector de archivo. El dato sigue guardado |
| **La fuerza del resalte del aldeano, sin juzgar en dispositivo** | Dueño del diseño | El arnés no la aísla: el oro del anillo se confunde con la paja del valle al buscarlo por píxel |


**Recursos visibles:** IA-15 e IA-16 cierran la madera, IA-17 hace visible la
cantera e IA-18 conecta cosecha, porte y almacenamiento con el tick real. Queda
arte específico de siega y decidir si el motor debe guardar crecimiento por
parcela. El agotamiento de roca también exige un contrato persistente nuevo.

**G-25:** corregida la uniformidad de las rocas señalada por el dueño. Sigue pendiente ampliar siluetas de árboles.


**G-25 paisaje:** rocas, ribera y monte bajo entregados; siguen pendientes otras siluetas
de árboles; requieren respetar accesos y campos. El vado desplazado sigue abierto.
La batería OBS-02 se aplaza por decisión del usuario; se retoma modelado 3D.

**OBS-02 detenido tras el piloto por petición del usuario:** decidir después cómo
mejorar encuadre y revisión temporal antes de repetir calibración. No lanzar la
batería completa con el método actual. La cobertura visual sigue sin certificarse.

**IA-14:** el contacto y la orientación mejoran; no equivale a apoyo perfecto
de pies. Regresión nocturna conserva 21/22 noches completas, ahora pendiente132.
El fallo de regreso y la geometría del vado siguen como tareas separadas.

**OBS-01:** corregir el pivote del vado y comprobar continuidad del agua; G-24
arregló la selección de celdas pero no toda la geometría. El regreso del 155
se reproduce (21/22 noches completas); no queda resuelto porque otra noche del
mismo tick sí termine. Completar cobertura de ancianos, vaca, cerdo, lobo,
cuervo, encuentros y gestos cercanos. Ver prioridades en OBS-01.

**IA-12:** regreso nocturno pendiente del residente 155, semilla 43/año 60,
tick 2834 (31/32 durmiendo; 21/22 noches completas). La semilla 11 completa 22/22.
Queda revisar encuentros y acciones propias de cada especie; anclajes de
uso del yunque/bancos y tareas específicas de partera, herbolario, caza y pesca.
El ocio, cultivo, tala, construcción, herrería, granero y rezo básicos están
conectados. Sentarse es en el suelo; un especialista sin edificio usa ocio.

**IA-11:** regreso/salida, desvíos, pasillos, portones y colisión fina de troncos/lápidas
verificados con 66 noches del motor vivo. Queda revisar encuentros completos y clips
de todas las especies, y ampliar la muestra a otros recintos y aldeas; los portones
permanecen abiertos. No hay interiores ni clip de acostarse, ni se asignan viviendas
ficticias a los residentes sin casa. Véase `docs/historico/life-rounds/IA-11.md`; no dar por
cerrada toda la IA por esta muestra.


G-23: seis especies terminadas y comprobadas. No queda modelado pendiente del
catálogo animal actual. Coste del banco documentado en G-23; no hay medida
nueva de FPS en dispositivo móvil. Nuevas especies o conductas son otro encargo.

**G-22:** trigo, coles y puerros terminados, conectados y revisados en juego.
Campo segado también terminado y revisado tras la cosecha. Carro G-21 terminado
y revisado en juego y subido. Almiar (`haystack`) terminado y revisado;
almiar subido. Pila de leña (`log-pile`) terminada y revisada en juego;
cobertizo (`shed`) terminado como recurso de catálogo; falta selección runtime.
Defensas modeladas y conectadas por petición del dueño; subir la entrega
antes de seguir con la torre de vigilancia. El aviso previo ya se cumplió.
Torre terminada; continuar con cementerio, ruina de madera y ruina de piedra,
con commit y subida individual de cada modelo.
Cementerio terminado; tras subirlo quedan las ruinas de madera y piedra.
Ruina de madera terminada; publicar antes de continuar con la piedra.
Los cuatro modelos restantes están terminados; entrega final validada para
commit y subida. Sigue pendiente integrar `shed`; variantes de casas y adornos nuevos
son ampliaciones aún no realizadas, no parte de estos cuatro.
**Avisar al dueño al llegar a los muros, antes de empezar esa parte.**

**Rediseño de aldea:** paja, piedra y molino terminados; herrería modelada y
validada técnicamente y revisada de frente en juego. Granero y capilla terminados;
iglesia, pozo y campo cultivado terminados y revisados en juego; sigue el campo segado. Las variantes
adicionales, los adornos nuevos y la aparición de `shed` requieren conexión del
equipo del juego; reemplazar los ids ya seleccionados encaja directamente.

**G-18:** recursos entregados para revisión visual; diferencia de zancada
medida/declarada del niño dentro de tolerancia, documentada en el informe.

**G-17 queda cerrado técnicamente:** los cuatro recursos están publicados con
los ids del encargo. El cura lleva sotana negra. No necesita cambios de selección
en el juego; el seguimiento de esta entrega está en `docs/historico/graphics-rounds/G-17.md`.

0. **La palanca «apretar el bosque» hace lo contrario de lo que dice, y es el
   verbo del juego.** Lo destapó C-1.3 al medir la jornada `intent.test.ts`,
   que fallaba «al filo» (27 contra 28): **no es al filo, es sistemático**. Con
   30 semillas, la postura «obra» (`timber: 0.05`) da 174 edificios contra 225
   de la postura «leña» (`timber: 0.9`), y sólo 11 de 30 semillas cumplen la
   propiedad por separado. La causa, mirada en las peores: **con «obra» la
   aldea no libera manos para construir, se muere de hambre y de frío**
   —población a 3–5, madera a 0— mientras «leña» sostiene 7–25 habitantes y
   acumula miles de unidades. Una aldea que colapsa construye menos por
   definición, y eso invierte la palanca. Es balance del motor, no un fixture,
   y **es la más grave de esta lista** porque las tres órdenes permanentes son
   lo que `CLAUDE.md` llama «el verbo del juego». El agente no tocó nada, que
   es lo correcto. Queda roja en las jornadas hasta que se decida con el dueño:
   o `timber: 0.05` no es una postura de referencia válida, o la subsistencia
   no puede depender tanto de la leña. Ronda propia, medida, antes del rediseño
   de interfaz o en paralelo con él, pero **no dentro de C-1**.

0a. **El 15 % de la aldea está de pie con una ruta que no anda** (IA-9, y es
   lo que el dueño ve como «la IA sigue siendo torpe»). Medido **en el
   navegador** con `tools/graphics/film.mjs`: en la semilla 42, año 50, siete
   personas clavadas media película con rutas de 12 a 21 tramos, pegadas a un
   borde de celda junto a un edificio, y con el replanteo entrando (el `until`
   se renueva). No es la decisión: es `seek()` contra `avoid()`. **Es IA-10** y
   la película es cómo se comprueba. La primera mitad del problema —la
   intención muerta que se conservaba para siempre— ya está arreglada en IA-9:
   clavados 3 → 0 en la semilla 11.

0b. **~~El 13,6 % de labradores que cavan la linde~~ HECHO en IA-8**: 6,5 %
   con `PARCEL_REACH` 0,9 y temblor ±0,15.

0d. **`ui-milestones` está roja y no es de nadie de hoy**: «una partida de
   sesenta años da entre unos pocos y unas docenas de hitos», semilla 999 da
   18 contra 20. Falla igual en HEAD limpio (`4145cfc`). Es deriva de la
   trayectoria nueva, como las de `docs/historico/rework.md` §2.8, y va con la decisión del
   peso de los avisos (punto 10).

0e. **La limpieza no deja verde la suite completa por dos rojas ajenas más.**
   `graphics-clock` espera cuatro clips en el manifiesto del aldeano y encuentra
   doce; `life-staging` reúne 20 de 39 aldeanos en la capilla (51,3 % frente al
   60 % exigido). Ninguna depende de los símbolos retirados: la primera mide el
   catálogo de arte y la segunda la trayectoria de V-11 ya documentada en
   `docs/historico/rework.md` §2.8. Se dejan abiertas para sus rondas funcionales.

0c. **El devoto se mide con una muestra que no lo ve.** `el devoto reza al
   menos el doble` (IA-3) pasa por poco con dos semillas y su proporción va
   de 0,6× a 2,7× sobre seis al apagar cambios que no tocan el rezo
   (`docs/historico/life-rounds/IA-8.md` §3). Hace falta un sesgo del devoto visible con
   una muestra barata, o una muestra mayor en las jornadas. Mientras, si se
   pone roja al tocar otra cosa, no es del devoto.

1. **~~Falta poder descartar una plaza que ya falló~~ HECHO en IA-8**
   (`Dweller.failed`, `Chooser.shunned`), y con ello el plazo vencido de las
   personas, con plazo propio del viaje (`Intent.arriveBy`). Parados 0,08 %,
   giros 0,39 %.

### 4.0b · La plaza de verdad (pedida el 18 sep 2026)

**Lo que el dueño pidió, con sus palabras:** «me gustaría que la plaza fuese un
espacio que tuviese un círculo grande, con separación. Creo que las cosas se
deberían mover para que esa plaza parezca una plaza de verdad. Y en el centro
quizás puedo poner una fuente, que eso habrá que hacerlo con 3D».

**De dónde se parte, medido el 18 sep 2026:** la plaza no tiene cuerpo. Es
`valleyCore`, la media de los centros de los edificios en pie, y la usan cuatro
sitios sin que ninguno la enseñe —las reuniones de §11.8, las marcas del mapa,
hacia dónde miran los animales y las reacciones del render 2D—. El motor tiene
**su propia copia** de la función (`sim.ts`), que es la misma trampa que la
tabla de clips. En doce semillas, el punto de reunión que se saca de ella queda
de 0,0 a 1,5 celdas de la media, y el barril de la fiesta tiene que buscarse un
hueco con aire entre los tejados: de 0,80 a 2,24 celdas de la casa más cercana.

Son tres trabajos, y el primero es del motor y manda sobre los otros dos:

| Paso | Qué es | Quién |
|---|---|---|
| **P-1 · la plaza existe y no se mueve** | Un punto guardado en el estado (no una media que cambia cada semana) y un **radio reservado**: la colocación de obras (`world/works.ts`) no puede levantar nada dentro de él. Sin esto no hay plaza que empedrar: lo que hoy hay es un punto que se desplaza y al que las casas se le echan encima | Motor. **Sube el esquema del guardado** y **mueve el trazado de todos los valles**, así que toca medir población, obras y el frío antes y después con `tools/reports/agency-report.ts` |
| **P-2 · la plaza se ve** | El empedrado: un círculo de suelo distinto donde cae el punto, con su borde. Y las reuniones, el barril y el corro pasan a usarlo | Render (`src/render3d/`) |
| ~~**P-3 · la fuente**~~ · **hecha el 20 sep 2026** | Malla propia de 406 triángulos, con receta reproducible, publicada e integrada en el centro de la plaza | Cerrado en la tanda de siete modelos; evidencia en `docs/historico/life-rounds/E2-integracion-y-defensa.md` |

**Lo que hay que decidir antes de empezar P-1, y es del dueño:** si la plaza se
fija **en la fundación** —la pareja llega, elige un claro y ahí se queda para
siempre, aunque la aldea crezca hacia otro lado— o si la aldea puede
**trasladarla** al crecer. Lo primero es una línea de código y una plaza que a
veces queda descentrada; lo segundo es un empedrado que se mueve, y eso no
existe en ningún pueblo.

**Cierre posterior:** la fuente se produjo por la receta reproducible del
pipeline, fue aceptada y se publicó con la tanda del 20 de septiembre. No
dependió de conducir manualmente la sesión de Blender abierta.


## 5. Lo que ya se aprendió y no hay que volver a aprender

De método, y cada una costó tiempo:

- **Nada de suites largas.** Orden del dueño: «no podemos estar parando a hacer
  pruebas de 15, 30, 45, una hora». Typecheck, lint y los ficheros tocados.
- **Una sola cosa corriendo a la vez, y al matar un run se matan sus
  trabajadores.** Esta sesión llegó a tener **121 procesos de vitest huérfanos**
  comiéndose la máquina, y todo parecía lentísimo por eso.
- **Nunca `git stash` sobre el árbol entero si hay otro agente escribiendo.** La
  forma segura de comparar antes/después es `git show HEAD:<fichero> > tmp`.
- **Reparto de ficheros por escrito antes de lanzar dos agentes en paralelo**, y
  decirle a cada uno qué ficheros son del otro. Funcionó con IA-3 e IA-4.
- **Medir antes de afirmar.** **Cinco veces** esta sesión tuve una hipótesis
  convincente y falsa, y las cinco lo supe porque la medida no se movió. Lo que
  sí funciona, siempre: **seguir un solo cuerpo paso a paso** imprimiendo su
  intención, su destino y su distancia. Así salieron las cuatro causas del
  defecto de los animales y la de V-11. Y una vez estuve a punto de informar de
  que el mundo era incoherente por contar sólo las casas de madera: eran de
  piedra.
- **Un arreglo que empeora la cifra no se queda «porque es correcto en
  principio».** Se retira, se escribe el número en el sitio del código y se
  nombra la pieza que falta. Pasó con el plazo vencido de las personas.

De diseño, y son las que más valen:

- **Una cota absoluta calibrada con una persona no vale para un cuerpo que no es
  una persona.** Tres fallos distintos de la misma familia: el umbral de avance,
  el margen con las paredes y el radio de la pausa. Lo que se le pide a un
  cuerpo se mide **con ese cuerpo**.
- **Una probabilidad que se tira cada paso no es la probabilidad que parece.**
  `GREET_ODDS = 0.2` se leía como «uno de cada cinco cruces» y era «siempre»,
  porque la llave llevaba el paso: con p repetida n veces sale 1 − (1 − p)^n.
- **Un compromiso es una interacción de verdad, no una cercanía.** Reservarlo
  por proximidad dejaba a los animales esperando en `approach` hasta caducar.
- **Una convocatoria se obedece, no se sopesa.** La reunión de §11.8 daba
  compañía y quitaba aburrimiento, así que a quien no le faltaba ninguna de las
  dos no le ofrecía nada y se quedaba en su sitio, viéndola a cuatro celdas.
  Lo que el motor ordena no compite por utilidad con estar de brazos cruzados.
- **Tapar el síntoma mejora la cifra y empeora el juego.** Hacer que estar
  parado saciara la sed quitaba a los sedientos de la estadística y les quitaba
  las ganas de ir al agua. El hueco real era que **sólo se podía beber en un
  sitio y con dos plazas**.
- **A 6 píxeles no hay que confiarle el significado a un gesto fino**, dice el
  cuaderno del dueño: ni un giro de cabeza ni un picotazo. Lo que sobrevive a la
  reducción es la continuidad de la trayectoria y la alternancia de quietud y
  marcha. Eso cambia qué merece la pena implementar.
- **La capa de vida sólo corre en 3D.** Una captura Canvas no acredita nada de
  estas fases, y la ruta `?debug=1` monta Canvas. Para ver un valle crecido hay
  que adelantar el reloj: `shot.mjs --advance <semanas>`
  (`docs/historico/life-rounds/evidencia-capturas.md`).

## 6. Qué hacer cuando se retoma esto

1. Leer §1 y §2 de aquí. Si hay algo «en vuelo», **no tocar sus ficheros**.
2. Mirar `git status` y `git log --oneline -5`. Conservar lo ajeno; nada de
   `reset` ni `checkout` destructivo sin documentarlo.
3. Coger el punto 1 de §4, o la fase «siguiente» de §2 si el 1 está hecho.
4. Cerrar con: informe de ronda en `docs/historico/life-rounds/` o
   `docs/ui-redesign/rounds/`, **actualizar este fichero**, y commit con las
   medidas dentro del mensaje.
