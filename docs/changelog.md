# The Valley — Registro de cambios

## v4.42 · 24 sep 2026 · Hacha y pico modelados (G-40)

Vera pidió el hacha y el pico en Blender. Salen del pipeline de recetas del
proyecto como recursos originales, con conector `grip` y cabeza de hierro
gris que se distingue del mango. Mismo agarre y mismo golpe que el respaldo
por código: la cabeza del GLB cae a menos de 0,08 del punto medido.

## v4.41 · 24 sep 2026 · Nada suelto por el pueblo, y el ganado fuera de los sembrados

Vera vio montones de material tirados y olvidados. Cada entrega dejaba hasta
tres haces, piedras o sacos junto a la descarga, y la leña se repartía en
seis pilas contra casas distintas. Ahora la carga entra en su almacén y la
leña se guarda en un solo leñero, con su cobertizo, fuera de la plaza y
alineada. Y el ganado tiene su propio terreno con los campos cerrados: antes
pasaba del 29 % al 40 % del tiempo dentro de un sembrado; ahora, nunca.

## v4.40 · 24 sep 2026 · El golpe toca el tronco y la roca

El hacha pegaba con el lomo y ningún golpe llegaba a tocar lo que golpeaba:
de 0,1 a 0,3 celdas de hueco con el tronco, y el pico fuera de la roca. Con la
cabeza medida en el golpe (`STRIKE_HEAD`), el trabajador se planta a la
distancia de contacto en un árbol del borde o en la cara de la roca, y el
árbol oscila y suelta hojas. La cantera aparece también donde la roca queda
fuera del alcance de la aldea, en la ladera. Medido: de −0,06 a 0,19.

## v4.39 · 24 sep 2026 · Reuniones que se acaban; talar y picar con gesto propio

`gather.days` se lee como jornadas y no como semanas: desde v3.72 una reunión
de tres días dejaba a la aldea parada veintiuna jornadas. Además el corro tenía
seis plazas, la convocatoria no llegaba a más de veinte celdas y el deber
contaba como urgencia; con las cuatro causas corregidas el vado de la semilla
7 junta 29 de 29, y tres propiedades rojas desde B-1 pasan. Talar y picar
tienen gesto de carga y golpe, herramienta visible (la de respaldo quedaba a
un tercio de su tamaño) y astillas en el impacto. Evidencia en
`historico/life-rounds/IA-anim-reuniones-y-gestos.md`.

## v4.38 · 24 sep 2026 · El adarve se genera desde el anillo (E3b cerrada)

El adarve deja de depender de una malla aprobada por cada esquina: sale del
trazado real del anillo de piedra, igual que los muros de `defences.ts`. El
motivo es medido: en tres días E3b.2 juntó dieciséis carpetas de candidatos y
ninguna villa aleatoria quedaba cubierta, porque cada una trae máscaras nuevas.
Se conservan las cotas de la familia walltop (suelo 1,02, tablero 0,90, paso
0,70). El pretil va sobre el borde de la unión de suelos, así que las bocas,
los descansillos y los extremos de tramo se resuelven sin casos especiales.

El guardia sube directo a su puesto y hace la ronda después, sin enemigos a
la vista. Al revés, medido en un asalto de la villa 91, las torres pasaban
cincuenta segundos andando sin tirar. El relevo del anochecer ya no baja de
golpe a quien está arriba, y de noche no se empieza a subir. La junta GLB de
E3b.1 queda superada. Evidencia en `historico/graphics-rounds/E3b3-adarve-generado.md`.

## v4.37 · 23 sep 2026 · Bosque y ribera en el fondo del valle

Revisión: composición longitudinal siguiendo el río, pasos abiertos y dos flancos
montañosos. Se atenúa el relieve visual de montaña en los extremos para eliminar
el cuenco. Decorado limitado a 256 árboles, rejilla exterior simplificada lejos
del mapa y luz lunar común. Tipos de celda y reglas de simulación intactos.

El decorado exterior sustituye la pared oscura por lomas bajas, bosque
instanciado y continuidad del río. El suelo lejano comparte la paleta de la
estación para que no asomen esquinas claras al alejar o girar la cámara. El
motivo es la referencia visual aportada por Vera: cerrar la escena con paisaje,
sin copiar los colores ni el arte de otro juego. No cambia el mapa jugable.

## v4.36 · 22 sep 2026 · Velo común para el cronicón

El cronicón emplea el mismo velo carbón ligero que las demás superposiciones;
su fondo y las tarjetas ya usan los tokens compartidos. Se elimina el velo
verde azulado más opaco que quedaba como una excepción visual.

## v4.35 · 22 sep 2026 · Piedra cálida para las superficies

Vera señaló que el fondo de los paneles aún se veía verde azulado. La superficie
de lectura y las bandejas pasan a piedra cálida neutra (`#D8D0C0`), con controles
`#E7DFD0` y borde cálido `#C9B99E`; conserva las curvas topográficas en tinta
tierra. La navegación común oscura y su selección ámbar se mantienen.

## v4.34 · 22 sep 2026 · Continuidad visual entre rutas

§11.4 separa el movimiento del mundo, que sigue el tick, de las transiciones
decorativas de interfaz, que pueden usar animaciones breves y respetan el
movimiento reducido. La navegación conserva el mismo fondo oscuro en Valle,
Crónica y Personas; al volver al valle entra sólo la barra, sin mover el mundo
ni el reloj solar. El epitafio abre su resumen tras una pausa de lectura breve.
Motivo: Vera pidió que toda la app se sienta como un juego y que los cambios de
ventana no parezcan cargas bruscas, conservando el reloj del sol.

## v4.33 · 22 sep 2026, 22:54 · Interfaz de juego para toda la app

§11.0 actualiza la dirección visual después de que Vera comparase la demo con
una interfaz de juego actual: el estilo de libro antiguo pesa demasiado en
controles y paneles. La referencia de Clash Royale se usa para jerarquía,
botones con relieve y estados claros, con menos saturación y una identidad
medieval propia que acompañe al valle voxel/low poly. **El reloj del sol se
conserva.** La crónica retiene un acento narrativo; la información funcional
prioriza lectura y juego. No cambia el contenido ni el motor.

## v4.32 · 22 sep 2026, 22:24 · Transiciones visuales de estación

§10.3 corrige dónde y cómo cambia la paleta visible. La mezcla estacional llega
al final de la estación: base en `seasonWeek` 0–9, punto medio en 10 y paleta
siguiente en 11, que coincide con la semana 0 posterior. La firma del suelo
sigue esos pasos reales, porque la anterior se activaba al principio y dejaba
sin actualizar las semanas de mezcla. Cada paso ahora interpola en tiempo real
de presentación el suelo, el
agua, el follaje y la nieve de los tejados; un cambio de acabado del suelo por
era usa el mismo mecanismo. Motivo: Vera señaló que el cambio entre estaciones
era brusco y feo, y pidió una base reutilizable para las eras. La animación no
altera el tick ni el estado del juego. La primera duración es un ajuste visual
pendiente de revisar en la demo.

## v4.31 · 22 sep 2026, 02:19 · Modelo propio del bastión

§1b corrige el estado visual de la villa cerrada: Vera aprobó la malla propia
G-26; el GLB se validó, se publicó con hash y el render lo coloca en su celda.
El muro reconoce al bastión vivo como vecino sin ensamblar la torre como tramo;
se prueban la caja real y las conexiones. Motivo: la atalaya escalada no leía
como torre integrada y la junta muro–bastión dejaba un hueco. No se declara
resuelta la lectura de esa unión en la cámara del juego: la captura móvil no
incluyó los bastiones y la toma amplia quedó bloqueada en Chrome. Tampoco se
declara construido el apoyo elevado navegable, que sigue en E3.

## v4.30 · 22 sep 2026 · Plaza por eras, decisión del dueño

§7.4b deja de exigir empedrado completo desde la fundación: el mismo círculo
reservado pasa de tierra pisada en caserío a empedrado parcial en aldea y
completo en villa. Plaza, fuente, accesos y navegación no cambian. Motivo:
el dueño confirmó que el empedrado inicial era una regla antigua de
presentación que debía ceder ante la lectura visual de las eras; los controles
E0e muestran que tres tonos de piedra no separan bien aldea y villa en tableta.
El acabado se deriva de la era y no se añade al estado ni al balance.

## v4.29 · 21 sep 2026 · Cierre de la revisión espacial

El claro deja de ofrecer trabajo a personas que ya tienen oficio y pasa a
ofrecer contemplación a mediodía; plaza, vado y claro reciben visita en al
menos 3/6 jornadas distintas sin forzar decisiones ni alterar la utilidad
global. La entrega de madera reserva el puesto concreto o espera lejos de la
leñera con el haz. La prueba V-06 deja de confundir el radio de navegación de
0,32 con la huella física de 0,19 por talla introducida en IA-14: mide
penetración de la anchura visible del GLB (0,35 por talla), conserva el límite
<0,1 % y no cambia colisiones.
Motivo y medidas en `plan-espacial.md` y `medidas/spatial-plaza.md`.

## v4.28 · 21 sep 2026, 20:46 · Revisión espacial

Encargo del dueño: distribución orgánica, caminos, plaza, variedad de vivienda
y cerco sin huecos falsos. Se corrigen rutas de desgaste que cruzaban edificios,
la plaza social detectada en otro prado y el cierre confundido con agotamiento
de solares. Defensas de una celda pueden ocupar ribera pantanosa, pero no agua
ni vado; de otro modo ninguna circunferencia de ciertos valles era edificable.
Variedad visual por parcela sin mover puertas. Contrato y evidencias en
`plan-espacial.md`; no cambia economía ni añade azar a la simulación.

**El historial de `docs/design.md`, que es la fuente de verdad.** Vivía dentro
de él: tres mil líneas de registro por delante del §0, así que quien abría la
especificación a buscar una regla se comía ochenta y cuatro revisiones antes de
llegar a la primera. Se separó al auditar el proyecto el 15 de septiembre de
2026; no se ha tocado ni una entrada.

**Sigue siendo normativo en un sentido concreto:** cada entrada dice *qué cambió
y por qué*, y el motivo es lo que evita que alguien lo revierta dentro de seis
meses creyendo que arregla algo. Antes de deshacer una decisión, búscala aquí.

Las reglas vigentes están en `docs/design.md`. Esto es cómo se llegó a ellas.

---

Este documento es la fuente de verdad del proyecto y cambia. Cada revisión nace
de implementar un módulo y descubrir que la especificación decía algo imposible,
ambiguo o falso — que es exactamente para lo que sirven los briefs. **Toda
entrada dice qué cambió y por qué**: el motivo es lo que evita que alguien lo
revierta dentro de seis meses creyendo que arregla algo.

| Versión | Fecha | Origen | Qué cambió |
|---|---|---|---|
| **4.27** | 20 sep 2026, 14:09 Europe/Madrid | **Cierre documental antes de publicar D6** | §1b deja de describir la villa y el asedio como trabajo futuro: las fases 3 y 4 están cerradas de punta a punta y se explicita lo que continúa fuera —ambiente, identidad del clan, adarve, bastión, fuego y gore—. `plan-meta.md`, `encargos-3d.md` y `task-log.md` se sincronizan con la evidencia de E1–E3 y D6: arado, fuente, armas, portón roto, combate, huida, saqueo, ragdolls y escombros ya no figuran como pendientes. Motivo: el código estaba siete commits por delante de `origin/main` y los documentos vivos todavía ordenaban empezar por A1. No cambia motor, balance ni arte. |
| **4.25** | 20 sep 2026, 08:53 Europe/Madrid | **D6 y acabado físico autorizados** | D.7 define saqueo con destino real y cargas visuales, continuidad terminal con guardado inmediato, cuerpos articulados y tablas físicas sobre el terreno. Motivo: el epitafio cortaba el desenlace y las caídas no respondían al entorno. Contrato en `encargos/encargo-d6-acabado-fisico.md`; sin nuevas pérdidas, sangre ni fuego. |
| **4.26** | 20 sep 2026, 13:17 Europe/Madrid | **D6 y acabado físico integrados** | D.7 fija topes 24/24, once segmentos por cuerpo, seis tablas por puerta, reposo a 8 s y transición 8–12 s a 1×. Se corrigen rutas desde contacto, identidad/orientación del caído y llegada tardía de Rapier. Evidencia y limitaciones en `historico/life-rounds/D6-saqueo-y-fisica.md`; el motor y el balance no cambian. |
| **4.24** | 20 sep 2026, 02:08 Europe/Madrid | **Puntos 3 y 4 autorizados** | D.7 concreta oclusión selectiva del robledal, contactos reales de atacantes y huida civil efímera al entrar hostiles. Motivo: el bosque tapaba el encuentro, los raiders no participaban en la separación y `flee` no tenía conducta que representar. Sin motor, gore ni balance; contrato en `encargos/encargo-visibilidad-y-huida.md` y evidencia en `historico/life-rounds/E3-visibilidad-y-huida.md`. |
| **4.23** | 20 sep 2026 | **E1: el portón acusa, alcance ampliado por el dueño** | `hitAt` y posición llegan desde vida al renderer. Una capa local sacude sólo la puerta atacada y vuelve exactamente al reposo en 0,45 s, sin mover obstáculos ni depender del historial de fotogramas. Usa la malla provisional; si hay hoja propia, sólo la hoja. 72 pruebas focalizadas, typecheck y lint pasan; 61 fotogramas del navegador coinciden con los hechos físicos. El bosque oculta la puerta en las tomas normales: se valida también con una captura diagnóstica explícita que lo oculta sólo al fotografiar. La oclusión queda pendiente, no se presenta como resuelta. |
| **4.22** | 20 sep 2026 | **E1: el disparo único, parcial** | Tiempo desde el hecho, sin módulo y con final sostenido. `Cast` muestrea combate sin historial de mezclas: saltar, repetir o retroceder conserva la pose. Tensado 1,5 s, suelta 0,6 s, golpe y caída 1,2 s sobre el aparejo existente. Cadencia de 63 pasos y portón de 60 golpes intactos; caídos sin disparos póstumos ni empujones de vecinos. **Reacción de puerta pendiente**, fuera del alcance autorizado. Sin gore. [Revisión y tomas](historico/life-rounds/E1-disparo-unico.md). |
| **4.21** | 19 sep 2026 | **F3d: el cronicón, y tres defectos que sólo vio la captura** | El último hueco de F3: **comparar partidas**. `src/ui/screens/annals.ts`, al que se entra desde el menú de inicio —que es donde se comparan valles, uno acabado y otro por empezar, y la única pantalla que existe antes de que haya partida—. Dos decisiones del dueño del diseño ese día: **las lápidas una al lado de otra** (capitular de la causa, inscripción, `ANNO {año} · VALLE {semilla}` y las cifras de la hoja de cuentas) y **empieza vacío y se llena**, así que la página vacía es una pantalla del juego con su línea y no un hueco. **No guarda nada nuevo y no sube el esquema**, que es lo que lo hace barato: `SaveFile.archive` existe desde M-25 con la semilla, el tick final, la causa y —desde F3a— el libro de cuentas; esto es la primera pantalla que lo lee entero, porque hasta hoy sólo se miraba el último para fundar el sucesor. Una partida archivada antes de F3a se recuenta de su crónica, con el mismo respaldo que el epitafio: dos maneras de leer un archivo viejo serían dos respuestas a la misma pregunta. Y **no dibuja ni una pieza nueva** —la lápida es la de F3c reducida, el papel, el canto y la cruz son los de la piel—, que es la regla de oro de esa skill: busca la que ya hace ese trabajo y úsala, no la copies. **Y lo que vale de esta ronda son los tres defectos que cazó la captura y ninguna prueba.** Uno es de la ronda anterior: `fill` escribe `{count}` con letra por debajo de trece (`numberWord`), así que `doing.besieged` —de F2, esta misma mañana— decía **«six of them are at the gate.»** con minúscula cuando bajaban seis; la captura de F2 usó una partida de 24, fuera de la lista de palabras, y por eso enseñó un número y no el defecto. Las tres frases se reescriben para que la cifra no abra la oración y queda **guardia en `ui-keys.test.ts`**: ninguna plantilla que acabe en punto puede empezar por `{count}` (una etiqueta sí puede, y el punto final es lo que las distingue). Los otros dos: la fila decía «ANNO 39» arriba y «38 years» dos líneas más abajo —el año de la crónica va en base 1 (`ABSOLUTE_YEARS`) y los años vividos no— y se quita la cifra repetida, que es la misma cura que F3b le dio al epitafio; y la página vacía subía como una tira de cuatro dedos con el menú entero encima, así que la hoja gana un **mínimo** de alto (§4 de la piel: mínimos, no topes). Capturado a 390 y a 750, lleno y vacío, cero errores de página y cero corchetes; `?annals=N` abre el menú con N valles acabados en el archivo, que es la única forma de fotografiarlo. |
| **4.20** | 19 sep 2026 | **G4: qué decisiones acumulan la caída, medido por contrafactual** | La pregunta de la fila es causal y una correlación no la contesta: las políticas adversas eligen mal **en todo**, así que en su tabla toda opción que ellas tocan sale letal. El instrumento nuevo (`npm run lethality`, `tools/reports/lethality-report.ts`) juega el valle, apunta cada respuesta y **lo vuelve a jugar desde el principio cambiando una sola**; lo que separe a las dos partidas es de esa respuesta. 30 semillas × 100 años, 291 ramas, 9 valles caídos de 30. **Lo que acumula la caída es no prepararse para el asedio**, que es lo que §1b predecía y lo que el dueño dijo el 18 sep («la letalidad vendrá por las decisiones y por el asedio»): `raiders_coming:wait` es la segunda opción más letal del catálogo (**+19 pp** sobre 26 pares) y las dos que la siguen son de su familia, `after_the_raid:build_up` (+11) y `tithe_demand:send_him_away` (+10). La encabeza `granary_theft:believe_a` con +38 pp sobre 16 pares. Al otro lado salvan `winter_grain_debt:kneel` (−9 pp) y `strangers_at_the_ford:take_them_in` (−4 pp): tragarse el orgullo y aceptar manos. **Y el hallazgo que más incomoda: `raiders_coming:wait` es lo que elige la política prudente**, el jugador sensato de referencia de §12.9. Esperar mata y la puntuación lo premia, porque `prudent` pesa lo que una decisión cuesta *esta semana* —grano, ánimo— y prepararse cuesta las dos: mira el precio y no ve el asalto. No es un defecto de la política —§12.9 la define sin lookahead, «como haría un aldeano»— pero explica por qué un valle bien jugado cae igual, y es el material del que está hecha una curva de dificultad. **No se tocó ningún número**: G4 es nivelado y el nivelado es del dueño; lo que la tabla habilita es decir **por dónde**. La propiedad que confirma ya tiene guardia y no se duplicó (`tests/journeys/threat.test.ts` mide sobre el mismo valle en el mismo instante que pagar les da la vuelta y que prepararse salva grano); lo que el informe añade es el **orden**. **Tres límites escritos con la medida**: el ruido es inherente —al divergir, el flujo `crossroads` diverge con la partida— así que el orden de la cabeza es sólido y la diferencia entre +10 y +7 no lo es; la columna de población **no se lee**, porque quien cae tomado muere a tamaño completo y la cifra mide supervivencia al revés; y la banda de semillas cambia la tasa de caída nueve veces, que es lo que dejó la primera pasada —sobre `0..23`, donde cae uno— con una tabla entera de ceros. Detalle en `docs/medidas/letalidad-por-decision-2026-09-19.md`. |
| **4.19** | 19 sep 2026 | **G2: el banco de balance, remedido — y el catálogo no tenía contenido muerto** | **Lo primero que hizo falta fue correrlo, porque las dos cifras con las que el cuaderno lo describía eran falsas**: son **11 rojas de 37, no 19**; y lo de «tarda más que su presupuesto» también estaba caducado, aunque la cifra que se le puso encima —31 minutos— resultó igual de frágil: tres pasadas del mismo banco dan **31, 31 y 46 minutos**, y la tercera se pasó del tope de 45 **corriendo sola**. Nadie lo había corrido desde M-4, así que su deuda se citaba de memoria. Las once rojas son **cuatro causas**, y tres son el juego moviéndose adonde se le pidió: la **cadencia** (12,6–16,8 preguntas por generación contra una banda de 1–5) es de antes de que el suelo de §8.6 bajara de 48 a 16 ticks esta misma mañana y de que R-1 metiera una tirada semanal; la **extinción prudente** (26,7 % contra 2–12 %) **es §1b funcionando** —casi todas son valles tomados, y el dueño dijo que «que haya partidas que se rompan es la idea»—; el **bosque** (72,7 % de pie contra 40–70 %) falla **por arriba**: no se agota, se queda entero, que es el mismo hallazgo que dejó al hacha siendo el medio más flojo del carro; y la **elegibilidad** de `after_the_raid` (4,3 %), `raiders_coming` (3,7 %) y `breaking_ground` (1,3 % sólo bajo `worst`) es la familia del clan de B1 más el contrato del caserío. **No se movió ningún número.** Las cuatro quedan en `it.fails` con la propiedad intacta y la cifra al lado, que es el patrón que `CLAUDE.md` manda, porque bajar la banda de la cadencia a 17 sería escribir lo que hoy sale y llamarlo diseño; las cuatro son nivelado y el nivelado es del dueño. Lo que se compra es que **el banco vuelva a estar verde al correrlo**: con once rojas conocidas mezcladas con las que vengan, nadie distingue una regresión nueva de la deuda de septiembre. Cada listón dice ahora **a qué hora de reloj mira** —el año 120 del mapa son 1.344 h, el año 100 del bosque 1.120 h, contra un juego cuyo último peldaño cae a las 350 h— y `runBalance` acepta el horizonte como parámetro. **Y la quinta roja sí era un defecto del instrumento, y es el hallazgo de la ronda: no había contenido muerto.** `tests/balance/catalog-coverage.test.ts` daba por muertas plantillas que el juego plantea en todos los valles, porque el banco que usaba (`tests/helpers/catalogue-bench.ts`) funda con **veinte personas en el tick 0** —la aldea de antes de la pareja fundadora— y las mantiene ahí con su propio bucle de tick. Su premisa —«la partida real tarda siglos en visitar estos estados»— caducó con la fundación de dos y el ritmo de 4.16, y ya se había excusado a mano dos veces sin sacar la conclusión. Medido con `foundGame` + `run`: **se plantean 20 de las 21 plantillas** en 12 semillas × 100 años (49 s), y las tres que se daban por mudas salen en 24, 24 y 11 valles de 24. La única muda es `quiet_years`, la reserva de §8.6, cuyo silencio **pasa de excusarse a afirmarse**: es el canario del catálogo. La sustituye `tests/journeys/catalogue-coverage.test.ts`, que además **cambia de suite a propósito** —en `tests/balance/` no la corría nadie—. **Dos trampas que esto deja escritas.** Una: un aserto que recorre una lista y falla en el primer elemento obliga a pagar el banco entero por cada fallo — excluir `raiders_coming` destapó `after_the_raid` media hora después, así que ahora se recogen todos y se comparan de una vez. Otra: `plague_blame` **no sale en sesenta años en ninguna de 24 semillas** y hace falta llegar a cien, o sea que hay una plantilla del catálogo que vive fuera del horizonte de cualquier jugador; es contenido y es del dueño. **Y una tercera, que costó una conclusión falsa el mismo día y es la más cara de olvidar: la banda de semillas cambia la tasa de caída nueve veces.** Con la misma política y los mismos años, `0..29` da 1 valle caído de 30, `100..129` da 6 y `3+7i` —la de `pace-report`— da 9. No es la magnitud de la semilla: la banda alta queda en medio. Es que caer es un suceso raro y **treinta semillas no bastan para medirlo**, así que citar «8 de 24 caen» como la tasa del juego es citar una banda. Es la regla de `CLAUDE.md` sobre no fijar umbrales con una semilla, llevada un paso más allá: para una caída, veinticuatro son una sola. Detalle completo en `docs/medidas/banco-de-balance-2026-09-19.md`. |
| **4.18** | 19 sep 2026 | **F2: el valle cuenta el asedio mientras pasa** | Hasta hoy la crónica contaba el aviso y el asalto **y la pantalla no**: la línea de estado seguía diciendo que se levantaba un granero la semana en que bajaba el clan, que es lo que `docs/encargos-3d.md` §1 llevaba anotado como «nada en pantalla dice que esa semana es la semana». Cinco frases nuevas en la tira, y **ninguna cifra flotando** (§11.1: el valle es el HUD). Tres las pone el motor, en `doing.ts` y por delante del hambre —porque son lo único de esa lista que se resuelve **hoy**, mientras se mira—: la víspera con su cuenta atrás (`doing.raid_coming`, contada por `weeksAway` y no por una resta local, que dos restas de ticks son dos ideas de cuánto aviso da el clan) y el clan encima, que dice «en la puerta» **sólo si hay puerta** (`doing.besieged` / `doing.besieged_open`). Las otras dos las pone la **escena**, y ahí está la frontera de §1b: el motor sabe que hoy hay asalto y no puede saber cómo va, porque la pelea es física y no determinista por decisión del dueño. El renderer expone `siege()` —la fracción de los sesenta golpes de D3b y si cedió, no los golpes: quien lo lee escribe una frase— y `gateNow` (`src/ui/doing.ts`) la reparte en `doing.gate_holding`, `doing.gate_giving` (desde `GATE_GIVING` = 2/3, con su `// TUNE:` y la medida al lado) y `doing.gate_broken`, que manda por `broken` y no por la fracción: un portón que cae por otra vía tiene que seguir contándose. **El reparto es puro y vive fuera del bucle de pintado** a propósito: `app.ts` no se puede llamar desde la suite rápida y esto sí. **Las bajas no llevan línea propia, y es una decisión, no un hueco**: las cuenta la crónica al cerrar la semana (`raid.held`, con `{slain}` y `{fallen}`), y un marcador en vivo sería la única cifra flotante de la pantalla. **Medido**: seis semillas × sesenta años, los seis valles ven la línea, 1.048 semanas de víspera y 131 con el clan encima de 29.835 — el 4,0 % del tiempo. En el navegador (`?debug=1&live=1&seed=7&year=30&season=summer&raid=24&assault=1`, 390 × 844): los tres estados del portón salen en orden —11 golpes «holding», 47 «giving way», 60 y alguien dentro «down»— y cero errores de página. **Y el defecto de esta ronda lo cazó la captura y no la prueba**, otra vez: la primera versión le hablaba de un portón a la semilla 7 al año 20, que no tiene cerco. De ahí `doing.besieged_open` y la prueba que lo fija. La medida de «los valles la ven» son seis partidas de sesenta años y costaba 17 s en la suite rápida: vive en `tests/journeys/threat.test.ts`, con el mismo cuerpo y el mismo umbral, que es lo que `CLAUDE.md` manda hacer con una prueba que no cabe. |
| **4.17** | 19 sep 2026 | **S-09, G1 y A3b: el hueco {B}, el hambre remedida, y el anillo final aclarado** | Tres decisiones pendientes desde antes del 18 sep, resueltas en la misma ronda con preguntas al dueño del diseño. **S-09 · el hueco `{B}`.** `namesOf` (`crossroads/resolve.ts`) se saltaba a quien tiene el nombre vacío en la crónica, y `feud_inherited` reparte `{as:'B', childOf:'A'}` — el único reparto de todo el catálogo que no saca de la reserva de nombrados, porque busca un hijo de verdad y un hijo casi nunca lo está. Medido: el hueco salía en **12 de 12** valles fundados con la pareja, siempre esa plantilla, siempre entre los años 26 y 27. De las dos maneras de arreglarlo, el dueño eligió **nombrar a quien sale elegido** —la otra, repartir sólo gente ya nombrada, mataba la plantilla para siempre, porque su B es un hijo por definición—. El nombramiento va en `applyOption` **antes** de aplicar los efectos de la opción, así que si además da un oficio (`{k:'role'}`) quien lo recibe ya es un personaje y no un anónimo con un puesto; `promoteToNamed` (`people/villagers.ts`) acepta ahora `role: Role \| null` para esto, sin el suelo de edad de §12.4 que sólo tiene sentido con un puesto real que cubrir. Gasta una tirada del flujo `names` y ninguna del `crossroads`, así que no mueve el sorteo de ninguna partida guardada. Medido tras el arreglo: 22 líneas de `feud_inherited` en doce semillas, todas con nombre, **cero huecos en cualquier plantilla del catálogo**. La prueba que lo vigilaba en rojo a propósito (`chronicle.test.ts`, «un hueco de reparto llega a la pantalla») pasa de `it.fails` a `it`. **G1 · el hambre, remedida y cerrada.** La fila decía «el grano toca cero y no mata a nadie», medido antes del ritmo nuevo de 4.16. Vuelto a medir con el informe canónico de §12.9 (`npm run attribution`, 60 semillas × 200 años): **el hambre es hoy la primera causa de muerte del juego, 40,9 % de 31.224 muertes**, por delante de la vejez natural (36,4 %), la peste (12,0 %) y la violencia (8,9 %). La premisa de la fila ya no era cierta —el ritmo de 4.16 hizo que las decisiones y el crecimiento llegaran antes, y con ellos la presión sobre el grano—, así que el dueño cerró la fila sin tocar `FOOD.STARVATION_RATE` ni la capacidad del granero: no se inventa un número para un problema que ya no está. **A3b · el anillo final, aclarado y no resuelto por contradicción.** `plan-meta.md` pedía «un segundo anillo tres celdas afuera» y `design.md` §7.4c lo prohíbe con una medida del propio dueño del 18 sep (1.824 tramos de muralla contra 131 casas en doce semillas a 120 años). Preguntado, contestó que no es una mecánica de nivelado sino **contenido de cierre de partida**: un anillo, siempre, hasta que la aldea toque su techo de crecimiento, y sólo entonces un último anillo que envuelve el pueblo entero como remate. §7.4c no se toca —no había contradicción que resolver, había una fase sin brief todavía—, y A3b pasa de «bloqueada, del dueño» a «P4, depende de D6 y de un evento de techo de crecimiento que no existe hoy». Ninguna de las tres tocó una sola línea de `balance.ts`. |
| **4.16** | 19 sep 2026 | **El arranque deja de ser una sala de espera** | Del dueño del diseño, probándolo: «ahora mismo se tarda muchísimo en empezar a hacer cosas y es muy lento y muy aburrido», y con la advertencia de que **el ritmo del juego puede ir cambiando** —las decisiones y las crónicas cambiarán, así que lo que hay que elegir es el contrato que aguante, no la cifra que cuadra hoy—. Lo primero fue medir la apertura de verdad, hora a hora, y lo que salió no era una sensación: en la semilla 7 la aldea **termina su segunda casa a las 5,6 h y no vuelve a abrir obra hasta las 9,3 h**, y **el 35 % de las primeras veinte horas no hay ni una obra abierta**. La causa no es el ritmo de construcción: es que **todas las puertas de §7.3 son de población** —pozo 10, capilla 12, fragua 14, molino 18— y la población sólo se mueve cuando pasa el año, que a catorce minutos por semana son **once horas de reloj**. Una aldea de seis con dos casas y un campo no quiere nada, y no lo querrá hasta que el año cambie. **Y el verbo del jugador estaba peor**: `CROSSROADS.MIN_TICKS_BETWEEN` era un año, así que la primera encrucijada de una partida **no podía plantearse antes del tick 47** — once horas sin una sola decisión. Eso es lo que se arregla, y se arregla en el sitio exacto: el hueco pasa de un año a **un tercio de año**. Medido en doce semillas × sesenta años: **primera decisión de 11 h a 3,5 h y de 11 valles de 12 a los doce**, decisiones en las primeras veinte horas **de 0,8 a 1,8** por valle, y —la fila que decide que el cambio sea el correcto— decisiones en toda la partida **de 38,3 a 39,4**: no hay preguntas de más, sólo llegan antes. Los intervalos que manda el reloj bajan del 22 % al **11 %**, más lejos del 40 % que §8.6 pone como línea de «manda el reloj, no el contenido». Se probó también un hueco de una estación (12 ticks): mismo arranque y **43,4** decisiones, o sea preguntas añadidas donde no hacían falta; un tercio de año es el menor cambio que arregla la apertura sin tocar el resto. **Y con él, el forastero del caserío se muda a verano**, porque el tamaño del hueco decide en qué estación cae la primera ranura legal: con el suelo en un año esa ranura era el tick 48 —primavera— y con un tercio es el tick 15 —verano—; sin mudarlo, la primera pregunta se habría quedado en las 11 h aunque el suelo bajara. Es un acoplamiento real y queda escrito en §8.6 y en `hamlet.ts`. **De regalo, el hueco de trescientas horas que `plan-meta.md` §0 nombra como lo primero que pediría nivelado**: la villa cerrada pasa de 416 h a **308 h** y la muralla de piedra de 438 a 308, mientras la edad de piedra se queda en **60 h**, que es el objetivo que el dueño puso («60/70 horas»). **Tres listones movidos, cada uno con su causa**: el techo de `balance.test.ts` deja de ser «un año» y pasa a «un tercio de año» con la tabla medida al lado; la prueba del rey herrero **vuelve del año 18 al 15** —estaba en 18 porque la 41 no tenía once casas al quince, y con el ritmo nuevo tiene catorce; en el 18 el anillo ya está lleno y los dos valles caen en la misma mejora a piedra, que es la vía de escape de §7.3 y no la voluntad de nadie—; y la muestra de hábitos de IA-3 pasa de cuatro valles a **seis**, la tercera vez que se queda corta por tamaño y no por falsedad (el devoto se quedó en 3,05 % contra el 3,46 % que pide el doble). |
| **4.15** | 19 sep 2026 | **G3 · el caserío tiene algo que preguntar** | Todas las categorías del catálogo estaban escritas contra una aldea hecha —fragua, capilla, veinte adultos entre los que repartir un rencor—, así que **un valle de menos de diez personas no tenía ni una sola plantilla que pudiera ver**. Ahora hay categoría propia, `hamlet`, con dos: **`breaking_ground`** —romper una besana nueva al borde del bosque o sembrar bien la que ya está rota, con la semilla que convierte lo desmontado en campo un año después— y **`one_at_the_ford`**, que es A.13 a escala de caserío: **uno** en el vado ante una casa donde viven dos, y un tercer par de manos no es caridad sino la diferencia entre levantar un campo más o no levantarlo (su semilla: manda venir a los suyos). **Categoría propia y no `famine`**, que era lo fácil: `crisisOf` le da el multiplicador de crisis a esa categoría cuando la despensa no llega a la cosecha, y una pregunta sobre desmontar no es una crisis de hambre ni debe crecer cuando la haya. **Medido en las doce semillas de la jornada de fundación: preguntan 5 de 12, y en los cinco es su primera decisión, tick 49 = 11,4 h de reloj**, con 4 a 9 personas en el valle; tres vuelven a preguntar en el tick 98. **Y la medida trajo el hallazgo que vale más que las plantillas: el techo de G3 no es el contenido, es el suelo de §8.6.** `CROSSROADS.MIN_TICKS_BETWEEN` son 48 ticks, así que la primera pregunta de una partida **no puede plantearse antes del tick 47** —once horas— y la población cruza diez a las diez. La ventana del caserío se cierra casi cuando la puerta se abre: los siete valles que no preguntan ya eran aldea. Por eso las dos piden primavera, que es la única estación que cae dentro de esa primera ranura (el tick 48 es a la vez la primera ranura legal y la primera semana de primavera). Subir el 5 de 12 es bajar ese suelo, que es nivelado y del dueño. **Y el hallazgo que más valió, que salió de una jornada roja**: la primera versión de estas dos plantillas **apuntalaba a los valles frágiles**. Una opción daba `harvest ×1.2` y ánimo sin pedir nada, y la semilla del forastero hacía venir a los suyos —dos pares de manos más—, así que la decisión no tenía ningún lado malo en ninguna parte. Medido, eso puso `fate-chaos` en rojo: **2 valles rotos de 12 donde pide 3**, o sea contenido que contradice lo que el dueño del diseño dijo con todas las letras («que haya partidas que se rompan es la idea»). Arreglado donde estaba el defecto y no en el listón: la opción de esperar da **ánimo y nada más** —el ánimo no salva a quien se queda sin grano, el grano sí— y la semilla del forastero es ahora lo que A.13 ya hacía a escala de aldea, **lo que ese hombre traía detrás** (`threatened`, tres años). Con eso el caos vuelve a su sitio y la varianza sube, que es lo que se buscaba: medido en trece semillas, ocho salen idénticas —no ven caserío— y las que lo ven se separan **en los dos sentidos** (la 53 pasa de tomada a sobrevivir con 54; la 41, al revés). **Tres trampas de banco que esto destapó, y las tres eran de medir con la aldea equivocada**: `tests/helpers/catalogue-bench.ts` y `crossroads-reachability` fundan con **veinte** personas —la aldea de antes del 15 sep 2026—, así que declaraban «contenido muerto» algo que en una partida real sale; la reachability además **decía en su cabecera que medía `foundGame`** y medía `foundTwenty`, y ahora juega las dos. La cobertura de verdad la vigila `tests/journeys/founding.test.ts`, que funda con la pareja y exige que el caserío llegue a preguntar y que **nunca pregunte con diez o más**. **Y una jornada cambia de semilla con su motivo escrito**: `wall-rings` clavaba la 41 —una de las cinco que ven caserío— para medir que el anillo se escribe una vez, y con una decisión en el año uno esa semilla llega a los cuarenta años tomada y sin anillo. Pasa a la 7, que no ve contenido de caserío y por tanto mide §7.4c y nada más (anillo 11, 59 de 59 piezas en él). Clavar una sola semilla para un umbral es lo que `CLAUDE.md` desaconseja, y aquí se pagó. |
| **4.14** | 19 sep 2026 | **A3 · el bastión, y la mitad de la fila que no se hace** | `plan-meta.md` pedía dos cosas bajo un mismo nombre: un segundo anillo de muralla y una torre en la línea del primero. Lo primero **contradice §7.4c**, escrito el mismo 18 sep con una medida del dueño del diseño —1 824 tramos de muralla contra 131 casas en doce semillas a 120 años, una semilla con anillos en 8, 11, 14 y 17 celdas para catorce casas—: «un anillo por valle, y uno solo». Se dice en el PR y no se toca; queda abierta como A3b, del dueño. Lo segundo se construye: **el bastión** (`BuildingKind`, `BUILDINGS.bastion`) es una mejora de `wall` como `stone_house` lo es de `house`, y **1×1 y no 2×2** como la atalaya suelta —A4 ya había medido por qué una torre de dos celdas no cabe en un anillo de una: tapa dos o tres tramos y `upgradeOf` sólo da de baja uno, un boquete con `ringClosed` diciendo que está cerrado—. Se pide sólo con `flags['wall_closed']` (la marca permanente de A1, no `ringClosed(state)` en directo: esa lectura recorre las rejillas de ocupación y A1 ya la paga una vez por partida para evitar pagarla cada semana ociosa) y con tope propio contado a mano, porque `withinCap` colapsa la familia de `bastion` en `'wall'` por su propio `upgradeOf`, y esa familia no tiene tope. Cuenta como muralla donde antes sólo contaban `palisade`/`wall`: `wallRuns` (§7.3, la puerta), `touchesWall` (dónde se pega una estaca nueva), `resistance` y `walled` (B3, C1 — cuánto vale el cerco y si el valle está cerrado) y el recuento final de `ledger.ts`. Ocupa un puesto de tiro en `postsOf` igual que la atalaya suelta (`derive/garrison.ts`). **Medido, que es lo que la primera versión de esta entrada no traía**: peldaño nuevo en `pace-report` y doce semillas × ochenta años — el primer bastión a las **555 h de reloj** (mediana, 224–656 h) en **9 de 12 valles**, que son exactamente los nueve que cierran su cerco, y **los nueve llegan al tope de dos**, así que el tope no es decoración: es lo que decide que una villa cerrada tenga cuatro puestos de torre y no dos. La letalidad no se mueve (3 de 12 partidas acabadas, dentro de la cuenta de B3) porque el brazo de un bastión es el mismo que el del tramo de muralla que sustituye. **Y la especificación se pone al día con ello**: §7.2 no conocía al bastión —ni al portón de A2 ni a la sala de K-4, que llevaban desde el 18 sep sólo en `balance.ts`— y §7.3 punto 9 listaba tres mejoras cuando ya son cuatro. Sin malla propia —usa la de la atalaya escalada a 1×1, y dos huecos de arte quedan anotados en `encargos-3d.md`: la escala achata la torre y `defenceConnections` no sabe que un bastión también es muralla, así que el tramo vecino no estira un extremo hacia él— y sin dibujo de crónica propio (`plan-arte-pendiente.md`, cae al grabado genérico de construcción mientras tanto, como le pasó a `built.gate`/`built.wall`/`built.watchtower` antes de que A4 y A2 les dieran el suyo). |
| **4.13** | 18 sep 2026 | **UI-V10b · cinco arreglos vistos jugando** | Todos del dueño del diseño mirando la pantalla, y ninguno salió de una prueba. **El filo de la bandeja**: la elevación de 4.12 «no se veía nada», y tenía razón — en mi propio antes/después no se distinguía. Mirando el prototipo 01 ampliado, lo que da la altura ahí **no es un difuminado**: es un listón con el canto de arriba iluminado y una sombra dura debajo. Así que la sombra proyectada pasa a ser **dos**, una de cero difuminado y dos píxeles que traza el contorno diente a diente —el filo— y otra de nueve que es la altura; y el papel gana un **filo claro por dentro**, que va de hijo a propósito: la máscara del desgarro recorta a sus descendientes, así que la tira sale recortada a la forma de los dientes en vez de cruzarlos. **Se probó también el arco** —el canto del prototipo sube 30 px en el centro, y se generó la pieza curva con los mismos dientes (`torn-edge.py --css`)— y **se retiró a petición suya**: «recto». Queda la cuenta escrita por si vuelve. **Los dos botones de la pantalla despejada se van a las esquinas**: «el de silencio a la derecha del todo y el otro a la izquierda del todo» — medido, a 390 el del valle queda en x 10 y el del sonido en 336, al 0,4 de opacidad. **La cámara sigue de verdad a quien se sigue**: ya iba detrás desde VZ-4, pero centraba en la pantalla y desde UI-V10 el centro de la pantalla es el canto de la ficha, así que el seguido salía medio tapado por su propio papel (medido: Hakon a y 430 de 844). Ahora se le sube un 14 % de la pantalla y queda a y 0,35 — con sitio por delante para ver hacia dónde va. **Y el resalte deja de ser una farola**: «lo de iluminarse es un poco exagerado; mucho más sutil». La emisión de la ropa baja de 1 a 0,22 y el anillo del suelo de 0,85 a 0,55 de opacidad; lo que identifica sigue siendo el anillo, que es lo que la ficha promete, y la ropa sólo confirma que es ése. **La noche sube un 24 %**: «no se ven bien las cosas de noche, tiene que ser un poquito más clara». El hemisférico nocturno pasa de 1,08 a 1,34 de intensidad (`NIGHT_SKY_GAIN` 1,9 → 2,35) y el rebote del suelo de `#2E3644` a `#3D4859`, que es la mitad que de verdad enseña los bultos —una luz de cielo sola deja las caras de abajo negras—. **El color del cielo no se toca**: aclararlo haría la noche más gris, no más legible. **Y una trampa que costó media hora, la que la propia skill tiene escrita**: `bundle-game.ts` imprime «55 recursos» y su tamaño **aunque su vite interno haya fallado**, así que empaqueta el `dist/` anterior y las capturas salen idénticas mientras crees que has cambiado algo. Un comentario mal cerrado en `skin.css` dejó tres capturas mintiendo. Lo que lo cazó fue leer las cajas en el navegador —la máscara seguía siendo el azulejo y el token del arco salía vacío—, no mirar la imagen. |
| **4.12** | 18 sep 2026 | **UI-V10 · la crónica y la gente cubren la pantalla, y un botón que la despeja** | Tres decisiones del dueño del diseño en una ronda, todas de la carcasa. **Una:** «la parte de People y Crónica debería cubrir toda la pantalla, que no se ve la aldea … en principio el valle es la única que va a tener la pestaña baja». Toda hoja se topaba a `max-height: 60vh`, así que las tres secciones se leían con medio valle moviéndose por encima del texto; ahora la hoja va de debajo de la cabecera a la barra —medido a 390: de y 98 a 776 en vez de 60 vh— y la crónica enseña seis entradas donde enseñaba dos. **La cabecera se queda en las cuatro pantallas**, que es §3 del estándar y decisión suya anterior: lo que la hoja tapa es el valle, no los instrumentos. **Dos:** la excepción, con nombre y motivo suyos —«solamente en People, cuando pinche una persona y le das al follow, que se baje hasta abajo y se quede a una altura bajita»—: seguir a alguien **es** mirar el valle, y una ficha a pantalla completa tapaba justo al aldeano que se acaba de pedir ver. Son 40 vh (338 px de 844) y la marca la pone `inspect-panel.ts` donde ya estaba el único punto de escritura de esa ficha sobre el mundo (`setTracking`), no en un segundo sitio que pueda desincronizarse. **Tres:** el botón que **despeja la pantalla** —«que se quite todo, que solamente se vea el valle; y solamente se vea ese icono y a lo mejor el del sonido en tenue»—, a la izquierda de los tres redondos. Se apaga con `visibility` y no con `display` a propósito: la bandeja publica su alto y media interfaz se coloca contra él, así que plegarla recolocaría lo que queda —lo que §8 existe para impedir—. Medido: despejada esconde placa y bandeja, el rincón baja de 570 a 780, el sonido queda al 0,4 y el botón del valle entero, porque **es el camino de vuelta**; y volver devuelve cada caja a su sitio exacto. Abrir cualquier hoja sale del modo, que es lo que impide una hoja sobre un valle sin salida a la vista. **Y tres cosas que sólo vio la captura, ninguna prueba.** La primera versión publicaba `--ui-hud-height: 0px` y la crónica se tragaba la cabecera entera: `.ui-hud-header` es una caja de **altura cero** porque la placa y los chips van `position: absolute` (piel de U-01), así que lo que se mide es **el canto de abajo de la fila de chips** y no el envoltorio — 90 px a 390 y a 750. La segunda: la crónica tenía su propio hueco de **439 px escritos a mano** (`.chronicle-fade`) para dejar valle asomando, así que seguía siendo una hoja baja dentro de una hoja alta; ahora ese hueco es la cabecera y nada más. Y la tercera, la que se veía peor: con la hoja alta salían **dos papeles y dos cruces**, el de la carcasa por encima de la página de la crónica, porque quien hospeda se estaba vistiendo — la excepción de `:has(.chronicle-scrim)` ya le quitaba la máscara y ahora le quita también el papel, la sombra y el aspa. **Lo que el estándar gana** está en §1b de la skill `piel-del-valle`: en vertical, una hoja cubre y la bandeja no. Y **lo que falta**, apuntado: el botón usa el icono del valle (`mountains`) porque el sprite y el documento que lo incrusta están tocados por el dueño ahora mismo; un icono propio en la temática de tinta parda queda en `plan-arte-pendiente.md`. |
| **4.11** | 18 sep 2026 | **A5 · la fase del valle, dicha** | §1b parte la partida en cuatro fases, A4 las hizo preguntables (`derive/era.ts`) y esto es lo que hace que el jugador las lea. **Lo que decidió el sitio fue una medida, no un gusto**: la fila pedía la cabecera, y en la placa de fecha no cabe — medido en el navegador a 390 y a 750, la fecha ocupa 179 px y el arco del sol 90 de los 302 útiles, o sea **23 px de holgura**, y la más corta de las tres palabras pide sesenta y pico. Meterla ahí habría sido recortar en silencio, que es lo que prohíbe §4 del estándar de piel, y abrir una cabecera compacta habría sido lo que prohíbe §3. Así que la era va **donde una hoja grabada pone su título**: bajo el ornamento de la bandeja, que es el encabezado de esa superficie desde el prototipo 01. Ninguna pieza nueva —los filetes y la hoja ya estaban— y la bandeja crece **14 px una vez**, porque el ornamento cede la mitad de su respiro; **durante la partida no se mueve nada**, que es la promesa de §8, y no puede: la era nunca está vacía, un valle recién fundado es un caserío. **Y la crónica la fecha bien**, que es la mitad que se podía hacer mal sin que nadie lo notara: la cabecera de cada año dice la fase de **aquel** año y no la de hoy, leída de la propia crónica (`eraAtYear`) con las dos líneas que ya se escribían —`wall.closed`, peso 3, y la construcción de la fragua—, así que el año doce de una villa cerrada sigue diciendo «hamlet». Las tres palabras son las de §1b y viven en el banco (`era.hamlet`, `era.village`, `era.town`), y la de la fase 3 es **«Walled town»** y no «Town» a secas por lo que la meta del juego es: no un tamaño de pueblo, un pueblo **cerrado**. Cerrado con captura a 390 y a 750 y cero errores de página. **Y en la misma ronda entran dos reglas nuevas del dueño del diseño.** La primera: «cada vez que crees una crónica hay que ir creando la tarea de pedir las imágenes» — está en `CLAUDE.md` y como §4c de la skill `goal`, y al escribirla destapó su propia deuda: `wall.closed` —el cierre de la villa, peso 3, una vez en la vida de una aldea— compartía el grabado genérico de construcción con «se ha levantado un campo», y lo mismo el portón, la muralla de piedra y la atalaya; las cuatro tareas están en `plan-arte-pendiente.md`. La segunda: subió **la temática visual nueva** —cinco grabados de una sola tinta parda sobre papel crema, «la nueva temática es menos colorida»— y con ella los tres prototipos de `ui-prototypes/` **dejan de mandar en el color** y siguen mandando en la maquetación. Referencia estable y correspondencia pieza a pieza en `docs/visual-reference/engraving/README.md`, tareas de integración en `plan-arte-pendiente.md`, y la regla en §10 de la skill `piel-del-valle`: todo diseño que suba pasa por ahí antes de entrar al juego. |
| **4.10** | 18 sep 2026 | **A4 · la villa de piedra: la era, la muralla y la torre** | **La ronda que descubrió que la fase 3 de §1b tenía la mitad de su contenido muerto.** `wall` —la muralla de piedra— tenía tabla en §7.2, mejora en §7.3 punto 9 y dibujo de crónica, y **ni un solo uso**: su única puerta era la encrucijada de la primera piedra (A.16), que no la concede sino que **obliga a elegir** entre la muralla y las casas, una de las dos y para siempre. Medido en doce semillas a ochenta años: se desbloquea en diez y **las diez eligen las casas** —dan doce de ánimo contra seis y sin bandera mala—, así que **cero valles llegaban a tener un solo muro de piedra**. Eso se escribió cuando la muralla era un adorno; desde §1b es lo que decide si el valle cae, y dejarla detrás de un cara o cruz contra un +12 de ánimo hacía inalcanzable el objetivo del proyecto por la vía de tomar la decisión razonable. Ahora hay **dos caminos y no uno**: la encrucijada sigue abriéndola **antes** —eso es lo que se compra con la bandera de las casas frías— y **un cerco cerrado la abre por sí solo**, que es lo que haría un pueblo que ya tiene su anillo y le sobra piedra. La marca es la de A1 (`flags['wall_closed']`, permanente): **sin campo nuevo, sin migración y sin subir el esquema**. Medido igual: **10 de 12 valles con muralla de piedra**, 65 tramos en la semilla 91, y en la escalera del ritmo la piedra llega a las **249 h de reloj** — la misma hora que la villa cerrada, que es el contrato dicho en cifras. **La era** (`src/derive/era.ts`) es la otra mitad: §1b parte la partida en cuatro fases y el juego las cumplía **sin saber en cuál estaba**, así que nada podía decirlo (A5) ni condicionarse a ellas. Tres eras —`hamlet`, `village`, `town`— que se **derivan y no se guardan**, que es la misma decisión que §7.4c tomó con el anillo: guardarlas sería un campo más que migrar y una segunda verdad que se desincroniza. Son **monótonas a propósito**: un valle al que le tiran la fragua en un asalto sigue siendo una aldea, porque lo que la era cuenta es lo que la aldea **alcanzó**. Y **el asedio no es una era** —lo que el valle *es* no cambia porque le estén pegando; eso dura una semana y lo dice `alertOf`—, sin lo cual la cabecera de A5 anunciaría un cambio de fase cada vez que baja un clan. Peldaños nuevos en `pace-report`: **aldea a las 40 h** (23 de 24 valles) y **villa a las 249 h** (15 de 24), sin mover ninguno de los que ya había. **Y la tercera parte, «las torres como mejora del anillo», acabó siendo un defecto que se veía desde C2**: `watchtower` no tenía caso propio en el marcador de §7.4, así que caía en el `default` —lo más cerca posible de la plaza— y `postsOf` le colgaba un arquero tierra adentro, mirando tejados. Ahora se pega al cerco por dentro: de **10 de 20 pegadas a 20 de 20**, y la distancia media al muro de 2,2 a 1,4 celdas (1,4 es el mínimo de una pieza de 2×2 cuyo centro cae media celda dentro, o sea tocándolo). Lo que **no** se hizo, y se escribe para que nadie lo intente de pasada: **una torre en la línea del anillo**. Es 2×2 sobre un cerco de una celda, así que taparía dos o tres tramos y `upgradeOf` sólo da de baja uno — un boquete con `ringClosed` diciendo que está cerrado. El bastión de verdad pide `ringClosed` y `wallRuns` de la mano y queda apuntado en A3. Por lo mismo, **4 de 20 torres acaban pegadas por fuera**: en un valle ya cerrado no queda un solar de 2×2 que respete la calle de §7.4, y fuera es lo único que hay. De paso, una prueba de era jugada se comía **5,2 de los 20 segundos** de la suite rápida y se mudó a las jornadas con seis semillas y ochenta años, que es la regla del 16 sep. |
| **4.09** | 18 sep 2026 | **F3 (la lápida y la hoja de cuentas) y C4 (el motivo del carro)** | **F3a–F3c y F3e**, con el plan en `docs/plan-final.md`: al acabar una partida, el valle se queda quieto y se atenúa, la capitular roja con su letra de oro se asienta como un sello, la inscripción en Cinzel se graba de izquierda a derecha —«THE VALLEY WAS TAKEN · ANNO 40»— y dos segundos después sube el documento de siempre con **la hoja de cuentas**: tres cifras grandes (años, gente en su mejor momento, asaltos aguantados) y quince filas. **No dice «game over»** y eso es una decisión escrita: es la única frase del juego que hablaría del juego y no del valle. El libro de cuentas vive en el motor junto al `digest` que ya hacía esta lectura por semanas, y **no sube el esquema**: casi todo se recuenta de la crónica —que sobrevive en el archivo— así que `ledger` es opcional y una partida guardada antes se recuenta al enseñarla; lo único que la crónica no puede decir es qué quedó en pie el último día, y una fila vacía **no se enseña**, porque «0 casas» de un valle que tenía dieciséis es mentira y no un dato. Cuatro cosas salieron mal: la inscripción en tinta roja sobre tejados claros **no se leía** (la arregla una banda de pergamino, que es lo que este juego ya hace con el texto sobre el valle, y el velo al 52 %); el **HUD seguía puesto**, y un final con la cinta de la fecha encima no es un final; la línea de resumen **repetía** las dos primeras cifras de la hoja a dos centímetros; y la capitular no podía ser la inicial de la inscripción porque las cuatro empiezan por «THE» y las cuatro serían una T — es la letra de la palabra que nombra el final. Las tres primeras las encontró una captura y la cuarta una prueba. **Y C4**: los cuatro medios de defensa ya salían en el carro con su precio en fichas, y lo que estaba roto era el motivo de la negativa. `cart.no.feasting` **no existía** —pedir un segundo barril pintaba la clave entre corchetes— y `cart.no.room` decía «no room in the pen», escrita para la pocilga, a quien pedía una segunda puerta. Ahora el motivo se busca por cosa con la frase general de respaldo, y una prueba recorre **cada medio × cada negativa que el motor puede darle**. De paso, el recorrido que vigila el carro llevaba roto desde A2b: la corona compartía clase con las filas de medios, así que la cuenta daba once para diez y el bucle le pedía un botón de dar a una fila que tiene uno por candidato. |
| **4.08** | 18 sep 2026 | **D4 · el cuerpo a cuerpo: defender cuesta** | Hasta aquí el asedio era de un solo sentido —las flechas salían de la muralla, la partida golpeaba una puerta y nadie tocaba a los que defendían— y el parte de B4 informaba **`lost: 0` siempre**. Un asedio en el que sólo muere el que ataca no es un asedio, es una diana. `life/melee.ts` lo cierra con una sola regla: **lo que decide es la distancia**. Un saqueador que llega al alcance de un brazo —0,9 celdas, y es a propósito **mucho menos** que el empujón contra el portón (2,6): contra una puerta empuja el grupo y contra un hombre pega el que lo tiene delante— deja de ser un blanco y golpea a quien tenga enfrente, y el que defiende le devuelve. Sin tiradas, sin iniciativa y sin turnos: dos cuerpos a una distancia y un reloj de golpes, que es §1b —«que haya física entre los muñecos»— con la maquinaria que esta capa ya tenía. **Las dos armas no valen lo mismo, y eso es lo que hace que C1 tenga sentido**: el de la lanza devuelve todos los golpes y el arquero la mitad, porque está soltando un arco cuando le llegan encima. Es el defecto clásico del arquero, y convierte «lanzas **y** arcos» en una decisión en vez de una lista. Doce contra uno acaban con él, que es lo que §1b pide del asalto grande: el que sujeta la puerta solo no la sujeta. **Y una mentira que se veía, arreglada en la misma ronda**: al que caía se le marcaba la baja y seguía con su jornada —iba a beber, volvía a casa— hasta que el motor lo enterraba la semana siguiente. Ahora se queda donde cayó; **que se vea caído falta** y es el clip `fall` de E1, anotado. Medido en cuatro valles × dos maneras de jugar: de **cero a tres bajas propias** por asalto, y el reparto es dispar a propósito —depende de a quién alcancen los doce de la puerta—. Un saqueo no cuesta a nadie, porque nadie se acerca. Lo que falta y no se disimula: **el ragdoll**, que pide que los cuerpos de la gente sean cuerpos de Rapier y es una tanda entera, y los tres clips de E1 (`spear_thrust`, `hit_take`, `fall`). Cómo se ve morir sigue siendo decisión del dueño (E4). |
| **4.07** | 18 sep 2026 | **D3b/D5 · el portón que cede, y con él la partida** | **Aquí se cierra el bucle de §1b.** El motor marca el asalto (B3), la escena lo pelea, y lo que sale de esa pelea entra al motor por la puerta de B4 y puede acabar la partida: «el tower defense es literal» y «la pelea decide», funcionando de punta a punta. Desde esta ronda hay **dos visitas distintas porque el motor las distingue**: un saqueo es lo de D3 —llegan, se plantan, se llevan lo que el motor ya decidió y se van— y un asalto va **a por la puerta**: se apretujan contra la hoja, la golpean, y si cede entran y tiran al corazón del pueblo. El portón aguanta **sesenta golpes y los golpes son manos**, no segundos: matar a la mitad de la partida dobla lo que tarda en caer, y de ahí sale la carrera de la fase 4. Los dos números están elegidos con la arquería de D2 medida en la mano —cinco arqueros tumban del orden de uno y medio por segundo— así que doce hombres tiran la puerta en cinco segundos y tres tardan veinte. **Medido en el navegador con el observatorio, que es lo que hizo esta ronda honesta**: en la semilla 7 con siete puestos y arcos, la partida entra a los 0 s, la primera flecha sale a los 9,5, van cayendo de camino, **llegan cinco a la puerta a los 18,5 s, meten 18 golpes de los 60**, y a los 24,5 s están los doce en el suelo: el valle aguanta. Sin arcos la puerta cae en 18–31 segundos en las cuatro semillas y entran los doce. Tres correcciones, y las tres las encontró una medida y no una prueba: **los doce se apilaban en el mismo punto a 5,8 celdas de la puerta** —`nearestReachable` con tres celdas de búsqueda devolvía la misma celda a todos cuando el punto pedido cae dentro del cerco—, con lo que el portón recibía cero golpes; **un portón roto con la partida entera en el suelo no es un valle tomado**, así que el parte mira si alguien entró **y sigue en pie** y no si la puerta cayó (la semilla 7 salvaba el valle y lo perdía por esa cuenta); y **se empuja contra la puerta, no se golpea desde el puesto**, porque el terreno del juego no es el de la prueba —el renderer cierra las celdas con las mallas de verdad— y ningún número de alcance vale para los dos: en la toma del navegador los cinco que llegaban se plantaban a más de un brazo y la puerta recibía **cero golpes en cuarenta segundos**. Andar hacia ella lo arregla y además es lo que el dueño del diseño reconoció al verlo: «una especie de avalancha golpeando la puerta… chocándose». `--assault` en el observatorio para poder grabarlo. |
| **4.06** | 18 sep 2026 | **B4 · la puerta de vuelta al motor** | **La frontera que §1b abrió, escrita en código.** El asedio se resuelve en físico y no es determinista —decisión del dueño del diseño: «que dos jugadores con la misma semilla tengan finales distintos no importa, esa es un poco también la gracia»— y esto es por dónde entra ese resultado: `PlayerAct` gana **`kind: 'battle'`** (cuántos del clan cayeron, cuántos de los nuestros, si entraron), que es la misma puerta por la que entra una oferta aceptada o una corona. Así el motor **sigue siendo determinista dadas sus entradas** y una partida guardada vuelve a contar la misma historia; lo que no se repite es lo que pasa en la muralla, y eso pasa fuera. **La pieza de diseño de la ronda es la semana de espera.** El asalto se anuncia la semana que llegan (`raid.assault`, peso 3: el jugador ve venir lo que viene) y se resuelve **la siguiente**, con el parte si alguien peleó y con la cuenta de B3 si nadie miró. Esa semana es lo que evita el único diseño imposible que había aquí: si el motor resolviera el asalto al llegar, la batalla tendría que **deshacer** un final, y un final deshecho no es un final. Y dos reglas que cierran los dos agujeros obvios: **sin parte manda la cuenta** —un valle que nadie mira no se salva por no haber sido mirado— y **el parte no salva por existir**: la primera versión se creía el `breached` del parte tal cual, y con la escena de hoy —donde nadie puede romper el portón todavía— eso hacía que mirar la pantalla volviera al valle inmortal. Lo que decide es lo que queda en pie: si a los enteros les sigue sobrando para tomar el sitio, entran igual. En la otra dirección el parte **sí** es absoluto, y ahí está la puerta de D5: si la escena vio entrar a alguien, entraron, dijera lo que dijera la cuenta. Lo que el clan pierde **se queda perdido** (`threat.strength` baja), así que una defensa que mata veinte hombres compra años de paz: es la primera vez que lo que pasa en pantalla cambia el mundo. **Medido en doce semillas × ochenta años, con la política prudente y la puerta de actos de `run`**: nadie mirando, **3 de 12 tomados**; con la muralla tumbando al 10 % de la partida, 2 de 12; al 30 %, **0 de 12**; al 60 % —que es lo que la arquería de D2 hizo de verdad en el navegador, 8 y 10 de 12— 0 de 12, y el clan acaba con 39–60 hombres en vez de 57–60. El circuito está cableado de punta a punta: `life/archery.ts` cuenta, `renderer.battle()` lo informa con **la muestra y su tamaño** —la escena enseña doce cuerpos de una partida que puede ser de sesenta, así que el parte lleva `shown` y el motor escala; mentir aquí sería decirle al motor que el clan perdió doce cuando se vieron doce de sesenta—, y `app.ts` lo mete por la puerta de los actos la semana del asalto. En Canvas no hay batalla y no se disimula: el motor resuelve con su cuenta, o sea que un valle jugado en el camino de vuelta se defiende peor, y eso es verdad. |
| **4.05** | 18 sep 2026 | **B3 · qué es «caer»: el valle tomado** | La decisión del dueño del diseño del 18 sep, hecha mecánica: «caer tiene dos tamaños — un asalto pequeño se saquea y se sigue; uno grande que rompa el portón y entre entero acaba la partida». `EndState.cause` gana **`stormed`**, y es **el primer final que causa alguien de fuera**: los tres que había —extinción, abandono, dispersión— son un valle que se agota, y éste es un valle tomado. Cuando entran se llevan la plata, el grano y el corral **enteros**, el portón cae con las dos estacas de cada lado —un boquete, no el anillo: una aldea tomada sigue teniendo su muralla con un agujero, y eso cuenta mejor lo que pasó—, **mueren los que defendían** (los mayores primero: el que sube a la muralla no es el niño) y **no el pueblo entero**, que es lo que distingue esto de una extinción y lo que deja que la última línea tenga nombre y viuda. Se cuenta con peso 3 (`raid.stormed`) y tiene epitafio propio, porque «The valley is empty» sería mentira: **«The valley was taken»**. Lo que decide es **lo que se dio**, que es §1b llevado a una resta: la resistencia del valle es la guarnición de C2 —lo que se dio: lanzas, arcos, la fragua, el rey herrero— más lo que vale el cerco más las manos del pueblo con techo, y hace falta **cuadruplicarla** para tomar el sitio. De paso, la cuenta de defensores se muda al motor (`engine/world/garrison.ts`): cuántas manos suben es una regla del juego con constantes en §12, y tenerla también en `derive/` era tener dos ideas de cuánta defensa tiene una aldea. **Medido, y los tres números que se probaron están escritos al lado de la constante**: con el factor en tres caían **12 de 12** valles sin defensa y la escalera del ritmo daba 23 de 24 partidas acabadas —el juego se terminaba siempre—; en cinco no caía **ninguno** y la mecánica no se disparaba nunca; en cuatro caen **3 de 12 sin dar nada** (304–819 h de reloj) y **0 de 12 dándola**, que es a la vez «el caos es el juego» y «la defensa sirve». En la escalera: 9 de 24 partidas acaban, 8 tomadas, y la villa cerrada la alcanzan 15 de 24 en vez de 9. **Y pone verde `fate-chaos`**, la jornada que llevaba roja desde B-1 midiendo 0 de 12 valles roturados donde pedía 3: la letalidad vino por el asedio y por las decisiones, que es exactamente lo que el dueño contestó cuando se le preguntó por ella. Cinco pruebas de la suite rápida movieron su listón y cada una lleva su causa escrita: dos medían «no acaba» cuando lo que querían medir era «no se abandona» y «mientras viva», una contaba ticks en vez del aislamiento del flujo de crónica, una necesitaba `{fallen}` en su reparto de huecos, y la de los encontronazos pasó de dos semillas a cuatro porque doce muestras de la capa de vida bailan con cualquier cambio de trayectoria —es la segunda vez que se queda corta—. |
| **4.04** | 18 sep 2026 | **D2 · la muralla contesta: flechas con física** | **Lo primero del juego que decide la física y no el motor**, que es la frontera que §1b abrió el 18 sep. D1 dejó el mundo de Rapier montado con un «nadie dispara todavía»; C2 puso a los arqueros en sus puestos; esto une las dos. `life/archery.ts` resuelve la balística de libro —parábola con velocidad dada, de los dos ángulos el bajo, que es el que tira un defensor— y **tira adelantado**, porque un saqueador anda a 1,4 celdas por segundo y la flecha tarda casi un segundo en cruzar diez celdas: apuntar a donde está es tirar a donde estaba. La flecha es un cuerpo de Rapier con su gravedad y su rozamiento, y **a quien le entra se le acaba la visita** (`RaiderPhase.down`, un estado terminal que **se sigue dibujando**: un cuerpo en el suelo es la marca de que la muralla sirvió). Tres reglas de honestidad: **sólo dispara el puesto ocupado** —`manned` es una lista de sitios, no de gente, y sin esto la muralla disparaba sola mientras el arquero iba de camino—, **sólo con arcos dados** (C1: sin ellos hay guarnición y no hay arquería, porque las lanzas son el cuerpo a cuerpo y eso es D4), y **no se escribe una sola cifra del motor**: lo que el asalto le costó al clan se cuenta aquí y entra en la partida en B4, como datos. Y se pintan (`world/arrows.ts`), porque una flecha que no se ve no existe para quien juega. **Medido en el navegador con el observatorio**, que es la única forma de medir esta capa como la ejecuta el navegador: en la semilla 7, cinco puestos y **8 de 12 en el suelo con 10 flechas**; en la 23, siete puestos y **10 de 12 con 57**; primera flecha a los **9–10 segundos** del día, pico de 8 a 24 flechas en el aire, cero errores y cero cuerpos físicos al cerrar. La jornada cuesta un **4–15 % más** el día del asalto y **nada** los otros: Rapier no se pide si no hay algo que simular. Cuatro cosas que esa toma destapó y que ninguna prueba habría visto: leerle la posición a un cuerpo de Rapier ya liberado **revienta el WASM** («RuntimeError: unreachable», que se lleva la página por delante) —ahora un cuerpo retirado contesta dónde se murió y las flechas gastadas salen de la lista—; los tres primeros puestos del anillo daban **el mismo punto** en pantalla, tres arqueros en el mismo palmo de suelo, porque la celda de dentro más cercana al corazón es la misma para varias estacas vecinas; exigir celda distinta dejaba la guarnición en **uno de tres**, y de ahí el segundo anillo de búsqueda; y una flecha de grosor real mide **un tercio de píxel** a esta cámara, o sea que no se veía. De paso, el observatorio aprende a mirar la batalla: `--follow` acepta un saqueador (llevan identificador negativo) y la traza lleva guarnición, partida, flechas y el marcador, que es lo que D3 a D6 van a necesitar para medirse. `&braced=2` deja el valle en vísperas y `&means=bows,arms` da varias cosas de golpe. Lo que sigue sin verse queda anotado: el arquero se pinta con `idle` y el caído de pie, porque `bow_draw`, `bow_loose` y `fall` son de E1. |
| **4.03** | 18 sep 2026 | **C2 · la guarnición: quién sube al cerco** | La mitad que faltaba del «tower defense literal» de §1b. C1 puso lo que se da —lanzas, arcos, atalaya— y no había **quien los usara**: la muralla estaba vacía el día del asalto. Ahora `derive/garrison.ts` dice, leyendo el estado y nada más, **cuántas manos suben, a qué puesto y con qué**; `life/garrison.ts` las baja a la jornada como dos ofertas nuevas (`guard`, `archer`) y el reparto del día las ocupa igual que ocupa la fragua o el granero. **Nadie se coloca con el dedo** (§1b): la tabla dice cuántos, el orden de los puestos dice dónde importa —primero las puertas, luego las atalayas, luego la muralla junto a la puerta, que es donde cae un asalto— y **quién** lo decide la cercanía, como se decide quién va a qué tajo. Tres reglas que son diseño y no número: **lo que suma es lo que se dio** (lanzas, arcos, la fragua, el rey herrero), con una sola mano de base porque un pueblo que sabe que bajan pone a alguien en la puerta aunque no tenga con qué; **el portón se sujeta con lanza y desde la muralla y la atalaya se dispara**, y sin arcos dados no hay un solo arquero; y **el techo es la aldea**, un tercio de los adultos, para que un caserío no se pare por estar de guardia. Sube la víspera —dos semanas, no las ocho del aviso de B2: ocho semanas de gente plantada en la muralla son dos horas de reloj sin sembrar— y el día que llegan, leyendo el mismo `arrivedTick` que saca los cuerpos al camino (D3). **Medido en diez valles jugados sesenta años dando la defensa en cuanto se puede**: los diez llegan a tener guarnición, la primera guardia sube a las **59–126 h** de reloj con una mano, y con todo dado son **siete manos, seis de ellas con arco**, entre el 13 % y el 30 % de sus adultos. En la jornada, medido en cuatro semillas: **todos los puestos se ocupan**. Y una trampa que costó la medida y queda escrita: los puestos se caían de la lista que reparte la jornada cuando el motor había convocado a la aldea la misma semana —una reunión sustituye los sitios de la aldea a propósito— y entonces **nadie subía** (siete puestos con sitio y cero asignados en la semilla 11). Una guardia no es un sitio al que se va por gusto: va en las dos ramas. **Sin cerco no hay guarnición**, y no es un descuido: un puesto es un sitio de la muralla, y lo que le pasa a un pueblo abierto ya lo decide el motor. Lo que no se ve todavía queda anotado (`encargos-3d.md`): un arquero se pinta con `idle` hasta que E1 entregue `bow_draw`, no hay malla de arco ni de lanza, y se está **detrás** de la estaca y no encima porque un adarve es E3. |
| **4.02** | 18 sep 2026 | **A2c · el cerco tiene una capa, y las dos puertas son puertas** | Lo pidió el dueño del diseño y después mandó atacarlo de raíz: «no es el remedio para el valle que se queda encerrado, **las dos puertas tienen que ser funcionales**», y «para, intenta abordar tú el problema». La raíz era **el grosor de la muralla**. El anillo se plantaba en una *banda* —`|distancia − radio| ≤ 0,75`— y esa banda no es una línea: es celda y media, así que en muchos ángulos entraban **dos celdas** y el cerco salía de dos capas. Un portón es una celda: perforaba una capa y la otra seguía sellando el pueblo. De ahí salía todo lo que se había estado remendando por síntomas —bolsas de suelo, puertas que comunicaban campo con campo, la semilla 41 con sus quince casas en 220 celdas de 8 064—. La banda tenía su motivo (con 0,5 se rechazaban celdas que están en el círculo y la muralla se buscaba otro radio cada pocas piezas: de 25 a 47 tramos por valle), y la sustituye lo que de verdad hacía falta: **el círculo dibujado**. Se recorre por ángulos y se queda la celda que contiene cada punto, así que el anillo está conectado en ocho direcciones y **no tiene dos celdas en la misma perpendicular** — que es lo que hace que una puerta lo atraviese. Con él, tres cosas más caen en su sitio: **una estaca no se levanta antes de que el anillo esté decidido** (una encrucijada podía conceder empalizada el año dos y esa pieza se buscaba su propio radio; dejarla fijar el anillo es peor, se cerraba en radio 7 y la aldea crecía fuera de su muralla); **una puerta nueva sustituye un tramo de muralla hecha** —se apunta como mejora y `complete` da de baja la estaca— porque con el cerco cerrado no queda ni una celda libre del círculo donde colgarla, y una aldea que quiere otra salida tira un tramo; y **la segunda puerta va a un radio de la primera** (`GATE_APART`, contando también la que está en obra), porque dos puertas pegadas son un portillo ancho y no dos puertas. Y lo que el dueño pidió de las dos: **la aldea abre una, el jugador paga la segunda** por el carro (M-2), que es «debería haber una, y después que haya posibilidad de construirse otra más» hecho mecánica. Los recuentos de tramos pasan a **ocho direcciones** en el motor, en la jornada y en la prueba: un círculo rasterizado avanza en diagonal cada pocos pasos, y contando en cruz el cerco entero de la semilla 7 se leía como once trozos. **Medido en diez valles a los sesenta años**: 0 de 10 con muralla de dos capas (antes 5 de 10), **0 aldeas encerradas**, **20 de 20 puertas que llevan de las casas al campo abierto**, separadas de 12 a 16 celdas, y el cerco en 1 a 7 tramos. La segunda puerta se puede pagar en **8 de 10** valles; donde el pueblo no dejó paso, el carro la rechaza por sitio, que es la respuesta honesta. Y de paso una prueba que llevaba tres días roja se pone verde sola: `crossroads-reachability` medía `plague_blame` y `bandits` sin cumplirse nunca, y **B1 les dio el vecino que baja a saquear**. |
| **4.01** | 18 sep 2026 | **D3 (primera mitad) · la partida se ve llegar** | Lo primero de «lo que pasa y no se ve» (`encargos-3d.md` §1): desde B1 un clan bajaba, se llevaba plata, grano y una cabeza, y **no aparecía nadie**. Ahora la semana que llegan se ven: doce cuerpos entran por el campo, se plantan ante el portón y se van. `life/raiders.ts` los mueve con el mismo `Router`/`pathTo` con el que anda cualquiera en esta capa —la lección de IA-5, navegado y no guionizado— y `cast.ts` los pinta con **la figura del forastero**: un desconocido entre conocidos, que es lo más honesto que hay hasta que el taller entregue el clan armado (E2). **No pelean, no rompen y no matan**: lo que se llevan lo decidió el motor antes de que empiece la jornada, y esto sólo lo enseña (E.8). El motor gana dos campos —`threat.arrivedTick` y `lastBand`— porque un asalto pasa en una semana y la jornada necesita saber que hoy hay gente en el camino; es el mismo trato que `state.happenings` tiene con el lobo. **Medido en diez valles**: 120 cuerpos, los diez valles ven llegar la partida, **cero se quedan colgados** y todos se van. Llegar a eso costó tres correcciones, y las tres son la misma lección desde ángulos distintos: el plazo de un tramo sale de **la distancia** y no del número de puntos de ruta (con lo primero, 102 de 120 acababan por vencimiento); el sitio donde se plantan se elige **probando a llegar** y no mirando el mapa (la inundación no exige anchura de paso y A* sí); y la bolsa de suelo por la que entran se busca **desde la puerta hacia fuera** y no al revés, con lo que la conexión no hay que comprobarla porque no puede faltar. Y de paso **dos defectos de la muralla, medidos y anotados**: en la semilla 41 el interior de la aldea son 232 celdas de 8 064 con el portón dando a una bolsa aparte, y en la 7 el portón tiene tres lados tapiados y una bolsa de ocho celdas. La partida los rodea; la muralla sigue rota. `?raid=<cuántos>` y `--raid` en el observatorio para poder verlo sin esperar a la hora 114. |
| **4.00** | 18 sep 2026 | **D1 · el mundo físico, casado con el paso de la vida** | Rapier (WASM) entra en el proyecto, que es la tercera decisión del dueño del 18 sep. `src/render3d/life/physics.ts` monta un mundo sobre el mismo terreno que ya usa la gente —las celdas cerradas que paran a un aldeano paran una flecha, sin una segunda idea de dónde está la muralla— y **da un paso de física por cada paso de vida**: la capa ya corría a 1/30 de segundo escénico y un mundo de Rapier quiere exactamente eso, así que no hay acumuladores ni interpolación. Si el paso no fuera fijo, dos móviles con distinta tasa de refresco verían dos batallas distintas. **Y se carga tarde, que es la decisión de diseño de la ronda**: el paquete son 2,86 MB en crudo y este juego pesa 12,5 MB con todas sus mallas, así que entra por `import()` dinámico — medido con una sonda: **el bundle principal no crece** (432 kB) y Rapier queda en su propio trozo de **1,05 MB comprimido**, que el navegador sólo pide la primera vez que hay algo que simular. Un valle en paz paga **cero bytes**. Lo demás medido con `tools/reports/physics-report.ts`: arrancar el WASM cuesta **39 ms** y un paso con **200 cuerpos en el aire cuesta 403 µs**, el 1,2 % del presupuesto de 33 ms (la gente ya se comía el 0,7 %). La gravedad no es un número elegido: 9,81 m/s² en celdas de tres metros. Cuatro pruebas rápidas guardan el contrato —que cargue una sola vez, que caiga en el tiempo que dice la física de libro, que la muralla pare una flecha rasa y deje pasar una alta, y que lo que se clava se pueda quitar—. **Lo que falta y no se disimula**: nadie dispara todavía (eso es D2) y **no hay medida de fotogramas en un dispositivo real**, que es la misma deuda que G-09 dejó abierta para el 3D entero. |
| **3.99** | 18 sep 2026 | **C1 · lo que se da para aguantar un asalto** | Tres medios nuevos en el carro (§1b, fase 4), y el patrón de M-2 de punta a punta: **el jugador da y la aldea decide**, nada se coloca con el dedo. **Tres ejes distintos, y eso es lo que los hace una elección**: las **armas** para la herrería hacen que la aldea se lleve un cuarto menos de golpe —y el señor las cuenta, que es §7.12 al pie de la letra (`watched`, doce años)—; los **arcos** no pelean, disuaden: bajan lo que el valle tienta, y su cara mala es la del que se arma —cuando por fin bajan, bajan con más gente—; y la **atalaya** no quita ni un golpe: los ve venir, y las semanas de aviso de B2 pasan de ocho a catorce, que es tiempo para usar las tres salidas que B2 ofrece. Si los tres hicieran lo mismo con números distintos serían un solo medio con tres precios, que es lo que `docs/historico/plan-medios.md` §3.2 prohíbe. La atalaya **se levanta de verdad** —el edificio `watchtower`, que hasta hoy sólo llegaba por encrucijada— por la misma puerta que usa una encrucijada al conceder un edificio, y si el valle ya tiene las suyas la negativa llega **antes de cobrar**: no se cobra a medias. Medido en 8 semillas × 80 años contra el mismo valle sin nada: el botín baja de 5 817 a **4 386** con armas, los asaltos de 18 a **13** con arcos, y el aviso sube de 8 a **14 semanas** con atalaya. Los tres rasgos entran en `ValleyTrait` pero **no en `VALLEY_TRAITS`**: los cuatro sorteables son lo que el valle era antes de que llegara nadie, y unas armas no le salen a un valle de la tierra. |
| **3.98** | 18 sep 2026 | **B2 · el aviso, y qué hacer con él** | El clan del valle vecino da **ocho semanas** desde B1, y esta ronda las llena. La crónica avisa (`raid.coming`) el día que se organizan, y la categoría de encrucijada **`raid` es una crisis**: mientras `threat.comingTick` no sea nulo, su pregunta pasa por encima del techo de §8.6 igual que lo hace la sucesión desde §6.6 — un aviso que avisa tarde no es un aviso. Va detrás del hambre en el orden de crisis y no delante, y también es una decisión: el hambre ya está matando esta semana. **Dos preguntas**, que son las dos mitades de la historia: *Men Over the Ridge* —meter todo dentro, pagarles o esperarles— y *What They Left*, la semana de después: perseguirlos (vuelve grano, no vuelve alguien), levantar la muralla con la madera de las casas, o encajarlo y que todos lo recuerden. Lo que cada salida cambia lo lee `world/threat.ts` por banderas (`braced`, `bought_off`, `known_to_pay`, `just_sacked`), que es el trato que A.1 dejó escrito para lo que el DSL de §8.4 no sabe decir: la decisión se apunta en el estado y la mecánica se queda con quien la posee. **Pagar funciona y sale caro**: se dan la vuelta esta vez, y la semilla `they_come_again` hace que vuelvan antes durante ocho años. Medido en 12 semillas × 80 años: **198 avisos y 185 preguntas planteadas** (93 %), 86 preguntas del día después, y la primera a las **101 h de reloj a ×1**. Y un arreglo que esto destapó en el banco de pruebas del catálogo: su tick de juguete no hacía crecer al vecino, así que daba las dos plantillas nuevas por mudas cuando en una partida de verdad salen desde el año nueve — la misma trampa que `CLAUDE.md` documenta desde v2.0 («un informe que avanza el mundo con `tick` en un bucle no mide este juego»). Dos pruebas ajenas movidas con su motivo: `resentment` pasa a medir **el salto** y no el total —la aldea llega al año veinte ya tocada por los asaltos, y que un año de hambre rompa a quien está a −40 es correcto— y la muestra de hábitos de IA-3 pasa de **una jornada a tres por semilla**, que es la regla que `CLAUDE.md` ya exigía para esa capa. |
| **3.97** | 18 sep 2026 | **B1 · el clan del valle vecino** | **Esquema 11** y fase 4 de la meta empezada (§1b). `state.threat` guarda lo que el vecino ha juntado, la partida que viene y cuántas han llegado; el flujo `raid` es suyo. Las dos mitades vienen de la decisión del dueño —ataca **otro valle**—: **lo que el clan junta corre con los años** (2 hombres al año, con su variación, hasta un techo de 60 que es «todos los que un valle puede armar», medido contra los 48 de mediana que tiene el tuyo a los sesenta años) y **lo que tú has juntado decide si bajan y con cuántos**, que es §1 visto desde la otra ladera: lo que tienta es lo que se ve desde fuera —plata, grano, ganado—, no las casas ni la gente. Se decide en la semana 0 y llegan **ocho semanas después**, que es el hueco donde B2 meterá el aviso. Y llega la **mitad pequeña de «caer»** que el dueño ya había decidido: entran, se llevan una parte de la plata y del grano y una cabeza del corral, y la aldea sigue con lo que queda; **la mitad grande —el ejército que entra y acaba la partida— necesita la batalla física y no está hecha**, así que ningún asalto puede acabar un valle todavía. **A1 y A2 cobran sentido aquí**: con el anillo cerrado y el portón en pie se llevan una cuarta parte de lo que se llevarían a campo abierto, y el ganado se queda dentro. Medido (`tools/reports/threat-report.ts`, 12 semillas × 80 años): el primer asalto en el **año 9,2 = 103 h de reloj a ×1**, ningún valle se libra, 17 asaltos por partida de mediana y bandas de 5 a 60 hombres. Un arreglo de forma durante la medida: sin techo, el clan crecía para siempre y bajaban **partidas de 152 hombres** contra aldeas de 48 — eso no es el valle de al lado, es una invasión. El asalto tiene **clase propia de crónica** (`raid`) y no `happening`, por la misma razón que `road` la tuvo en M-0: una prueba compara los sucesos contados con `state.happenings` y contarlo allí descuadra las dos listas. La migración 10 → 11 es aditiva y **entra a cero**: una aldea vieja no tuvo vecinos armándose mientras esto no existía. Suite rápida entera en verde: 1 459. |
| **3.96** | 18 sep 2026 | **A2 · el portón es una cosa, no un cálculo** | Fase 3 de la meta (§1b). El paso de la muralla era una **estaca elegida cada vez** por `derive/defence-gates.ts`, y esa elección **se movía**: la aldea levanta muralla pieza a pieza, el tramo cambia de forma y con él la puerta. Es la misma enfermedad que tenía el anillo antes de v3.88 y la misma cura: **se construye y se queda**. `gate` entra como clase de edificio (1×1, 60 de madera, 40 de obra, sin tope), §7.3 lo pide **por delante de la estacada** —el anillo se llena, y un portón pedido después no tendría dónde ponerse— en cuanto hay un tramo de tres piezas **y anillo escrito**, y se coloca donde ya se pisa. Los tres estados, sin un campo nuevo en el esquema: **abierto y cerrado** son de día y de noche, con el mismo gozne que abre la puerta de una casa —idea del dueño: «para la animación de la puerta, algo similar a lo que se hace con las casas»— y **roto** es la ruina de siempre, que §7.3 vuelve a pedir. **Y dos defectos que sólo aparecieron midiendo**: el portón se colgaba de un anillo *tanteado* de radio 7 mientras la muralla de verdad se cerraba en el 11, así que el valle quedaba **amurallado sin una sola salida** (semilla 23); y `touchesWall` no contaba el portón, así que la estacada no crecía pegada a él y el anillo se cerraba con un hueco a cada lado de la puerta (semilla 11: dos arcos de 37 y 32 en vez de uno de 69). Medido a los cuarenta años en cuatro semillas: **un portón por valle**, en el anillo, pegado a muralla, el único paso —cero estacas abiertas por error— y repuesto solo si se pierde. En la escalera: **200 h** de reloj a ×1, antes de que la villa se cierre a las 435. Cinco guardas del proyecto obligaron a decidir de qué lado cae el tipo nuevo (la tabla de §7.2, el sprite del lienzo, el recurso 3D, suelo o pared, y su hito): el portón es **suelo**, que es para lo que está. |
| **3.95** | 18 sep 2026 | **A1 · la villa se cierra, y el juego se entera** | Primera fase de la meta (§1b, fase 3). `ringClosed` en `placement.ts` —hay anillo y ya no cabe una pieza más— vive junto a las rejillas de ocupación que usa `placeBuilding`, porque tener dos ideas de dónde cabe una pieza sería tener dos murallas. Cuando se levanta la pieza que cierra el anillo, la crónica lo dice con **peso 3**: §9.2 se amplía con la única línea de obra que llega a titular, y el motivo es §1b —cerrar el anillo no es terminar un edificio, es cambiar de fase—. La marca `flags['wall_closed']` hace que suene **una vez** (si arde una estaca y se repone, el anillo se vuelve a cerrar y eso no es noticia) y es lo que la fase 4 preguntará para saber si hay algo que sitiar. **Medido en doce semillas × ochenta años**: cierran 11 de 12, mediana el **año 38 —425 h de reloj a ×1— con 58 a 103 piezas**, y ninguna lo dijo dos veces; la que no cierra tiene el anillo sobre el agua y se queda en 67 piezas, que es el caso que `ringClosed` tiene que leer sin esperar un círculo perfecto. El peldaño entra en `pace-report`, y con él **el hueco que abre el nivelado**: de la edad de piedra (61 h) a la villa cerrada (425 h) hay más de trescientas horas en las que el valle hace lo mismo. Sin esquema nuevo: la marca cabe en `flags`. |
| **3.94** | 18 sep 2026 | **Las cuatro decisiones del asedio** | Sólo documentación (§1b de `design.md`, `plan-meta.md`). El dueño del diseño cerró lo que quedaba abierto del plan. **Caer tiene dos tamaños**: el asalto pequeño se saquea —bajas, grano y plata robados, casas quemadas— y la aldea sigue; el grande que rompe el portón y entra **acaba la partida**, un final militar que el motor no tenía. **Ataca otro valle**, un clan vecino que crece por su cuenta: la amenaza corre con los años y no con la riqueza, mientras que lo acumulado decide el premio y la dureza —§1 intacto— y abre la puerta a que ese valle se pueda ver algún día; el señor y los bandidos siguen donde están y no son el ejército. **Las físicas son Rapier (WASM) desde el principio**, elegido sabiendo el precio que estaba escrito: cerca de un megabyte más en el móvil, una tanda entera para casarlo con el paso fijo de la capa de vida, y la primera flecha más tarde; a cambio, ragdolls, escombros y el portón que se astilla salen del mismo sitio. Y **lo primero es A1**, que cerrar la muralla se note, porque sin cierre no hay contra qué llegue un asedio. |
| **3.93** | 18 sep 2026 | **La meta del proyecto: una villa cerrada que cae o aguanta** | Sólo documentación (§1b, y una frontera nueva en CLAUDE.md). El dueño del diseño puso la meta con sus palabras: «una aldea completa, fortificada, al completo […] y el juego en ese momento se convertiría en una especie de tower defense; los muñequitos empezarían a tener física y pueden pelear entre ellos». Cuatro fases —caserío, aldea, villa cerrada, asedio—, las dos primeras hechas y medidas en horas de reloj por B-1. **Y la regla que cambia una frontera del proyecto**: el asalto se resuelve en físico y no es determinista, por decisión suya («que dos jugadores con la misma semilla tengan finales distintos no importa, esa es la gracia»); su resultado entra al motor como datos por la puerta de `PlayerAct`, así que el motor sigue siendo determinista dadas sus entradas y las partidas guardadas siguen cargando. Lo que no cambia: quién viene y cuándo lo decide el motor por lo acumulado y lo decidido (§1), y la defensa se construye dando, no colocando. Queda escrito lo que cuesta cada pieza y que hoy no existe un solo clip de pelea. Y su respuesta a la letalidad perdida en B-1, para que nadie la arregle por su cuenta: «no pasa nada, todo eso se irá nivelando; a medida que vas tomando decisiones, si la vas cagando, el valle puede morir. Esa es la clave». |
| **3.92** | 18 sep 2026 | **El ritmo, medido en horas de reloj** | **B-1**, y lo pidió el dueño del diseño jugando: «el ritmo del juego ahora mismo es muy lento… esperar simplemente un año es muchísimo». Eligió además cómo arreglarlo —«me gusta el reloj realista, está ligado a muchos sistemas; el ritmo se arregla con el contenido y la velocidad de omisión. Deberíamos llegar a la **edad de piedra en 60/70 horas**, el año es lo de menos»— y qué quiere ver pronto: «en los primeros meses deben pasar eventos ya, dinamismo por favor». Así que §12.1 **no se toca** y se remide todo lo que decide cuándo pasan las cosas. **El diagnóstico es lo que importa**: v3.72 multiplicó la semana por 56 (15 s → 14 min) y ningún umbral del §12 se volvió a medir, así que el juego llevaba tres días calibrado contra un reloj que no existe. Cuatro calibraciones caducadas, con la misma firma: el techo entre encrucijadas decía «30 minutos reales» y eran **28 horas** (mandaba el 68 % de los intervalos, y §8.6 pide menos del 40 %); la migración tiraba **una vez al año**, o sea una vez cada once horas de reloj, y veinte personas costaban 138 h; `BP_PER_BUILDER` 2 y `WORKS_RESERVE` 0,15 venían de la aldea de veinte de antes de v3.69, y con la fundación en pareja son 0,45 albañiles y **44 semanas por casa**; y las puertas de §7.3 (pozo 25, capilla 30 y fe 45, herrería 35, molino 45) pedían más gente de la que un valle tiene nunca —23 personas al año 20—, así que la **capilla salía en 1 valle de 16 en ochenta años** y no había una sola obra de piedra. Y una quinta del mismo descuido: el suelo de la cadencia de sucesos (0,25) se midió en v3.78 **antes** de que M-1 pusiera la gracia de la pareja. Seis palancas, cada una con su medida: suceso mínimo 0,5, llegada mensual mientras el valle es pequeño, obra a 4 puntos con el 30 % de las manos, las cinco puertas bajadas y el techo de decisión en un año. **Medido en 24 semillas × 60 años** (`tools/reports/pace-report.ts`, que entra en el proyecto porque medir el ritmo en años de juego es lo que dejó pasar esto): primer suceso a 1,2 h, cinco personas a 56 min, **primera decisión a 14 h contra 100**, capilla a 47 h contra nunca, **edad de piedra a 61 h contra 661**, molino a 70 h contra 490. **El caos no se mueve** (una partida acabada de 24, igual que antes) y el ánimo mejora solo: las semanas por debajo de 25 caen del 26 % al 4 %, porque lo que lo hundía era dormir en el suelo. **Y un fallo de verdad que esto destapó**: al existir capillas por fin, el corro de §11.8 caía en una bolsa de suelo cerrada entre edificios a la que llegaban 2 de 6 casas, así que la reunión se descartaba entera —cero de veinticinco, con la decisión del jugador sin nada en pantalla—; `meetingPlace` recibe ahora la orilla y busca el corro donde la aldea pisa. Lo que queda anotado y no llega: **una reunión de setenta no cabe en un corro** (se junta el 54 % de la aldea, y cuanto más grande el valle menos fracción), declarado en `life-staging.test.ts` con lo medido. **Y la muralla, con la regla que pidió el dueño**: «para hacerlo más sencillo, la muralla se podría hacer a partir de X número de casas». La X son **once** y está medida —con once casas el pueblo ocupa ya el 91 % del radio que va a ocupar, con cinco el 49 %—, y hacía falta porque el anillo de §7.4c **se fija una sola vez** y §7.3 no es el único que levanta muralla: una encrucijada contestada también la concede, y al llegar la primera decisión a las 14 h había empalizada en el año dos. Medido: el anillo se fijaba en radio 7 en el año 1,8 a 6,3 con cuatro o cinco casas, para no moverse nunca —49 piezas en un círculo de 44 celdas, con el pueblo creciendo fuera de su propia muralla—; ahora se fija en el año 13 a 34 con radio 10 a 12, el del valle hecho, y el tramo mayor tiene del 62 % al 92 % de las piezas. Lo que se levantó antes son **secciones**, que es la palabra del dueño para eso, y las dos pruebas de P-4 pasan a medir eso mismo. **Lo que esta ronda se lleva por delante, y es decisión del dueño: la letalidad.** `fate-chaos` mide su principio —«que haya partidas que se rompan es la idea»— y dice **0 de 12 valles acabados donde pedía 3**: con casas a tiempo, gente llegando y el ánimo alto, el valle ya no se rompe. La prueba se queda **roja y medida**, sin tocar el listón, porque bajar la cota sería borrar el principio. Es la otra mitad de lo del grano que ya estaba anotado. La suite rápida queda con **una sola roja** —la del devoto, ajena y de la sesión de vida, que además mejora: antes nadie rezaba (0 % contra 0 %) porque no había capillas, y ahora reza el 8,6 % contra el 6,0 %, lo que no llega es el doble—; las jornadas quedan en 11 rojas de 124, **curando `founding` y dos de `life-props`** de las nueve que R-1 dejó. |
| **3.91** | 18 sep 2026 | **El rey se ve en la lista** | K-8, y lo pidió el dueño del diseño con la partida delante: «cuando selecciones un rey, tiene que destacar después en la lista. No se ve rey en chiquitito, parece uno más». Tenía razón, y el fallo era de K-5: cambiar la palabra —`role.leader` a `role.king`— no cambia nada cuando la palabra sale en la misma cursiva de trece píxeles con la que la fila dice «midwife». Ahora la fila del rey lleva **medallón de lacre con aro de oro**, una **chapa con la corona** y la palabra en versalitas sobre la cera, **el primer sitio de la lista** —la única ordenación que esa pantalla hace, y va con su motivo escrito— y debajo **a qué atiende el valle con él** (`crown.style.*`), que es información y no adorno. La ficha se viste igual, porque se llega a ella tocando esa fila. Ni un color nuevo: el lacre es el de la gota de cera del prototipo 02 y el oro es el de siempre; la corona es un símbolo más del sprite (`public/ui/icons.svg` e `index.html`, que la prueba de paridad obliga a mantener iguales). `isKing` y `crownStyleKey` viven en `derive/crown.ts` para que una cadena de contenido no acabe siendo la condición de un pintado, y `kingFirst` es puro y tiene prueba. **Dos cosas que sólo se vieron en la captura**: `.ui-shell-content-body p` le gana en especificidad a la chapa de la ficha y le devolvía la tinta parda sobre el lacre —ilegible, y el CSS parecía correcto—, y el recorte rasgado de las filas partía en dos cuñas el filete de lacre del canto, así que la fila del rey lleva el rasgado de placa. |
| **3.90** | 18 sep 2026 | **`state.intent` se retira** | K-7 del plan del rey, y la limpieza más vieja del cuaderno. Las tres palancas de órdenes de v2.0 se retiraron en M-2 por decisión del dueño («sí se retiran, no me gustan para nada») y su postura se quedó en el estado sin que nadie la escribiera; K-2 le quitó el último lector cuando la cola de obras y el reparto de manos pasaron a leer **la voluntad del rey**. Fuera `Intent`, `restingIntent`, `INTENT_RANGE`, `INTENT_STOPS`, `PRIORITY_STOPS` y `stopOf`, y fuera la migración 3 → 4 con su parche. El rango del sembrado se muda a `CROWN.FIELDS_RANGE`, que es de quien es ahora. **Y es la única excepción a §13.1 de toda la fase del rey**, escrita aquí: una partida de la v2.0 con una palanca puesta cambia de postura al cargarla, porque la palanca ya no existe; desde M-4 la interfaz no puede escribirla, así que sólo afecta a guardados de antes de M-2. La jornada `intent.test.ts` se retira con ella: medía una palanca que no existe. El esquema **no sube**: quitar un campo no lo mueve. |
| **3.89** | 18 sep 2026 | **El rey** | **Esquema 10** (§6.7), cinco fases del plan que diseñó Fable 5.1 (`docs/historico/plan-rey.md`) y una medida que dice qué llegó y qué no (`docs/medidas/rey-medida.md`). El jugador **da la corona a alguien**: 30 de plata, 30 personas, una fila en el carro con los candidatos y hacia dónde tiraría el valle con cada uno. El rey ocupa el asiento del jefe —que no se renombra, porque siete plantillas lo reparten— y desde ese día **ocho pasos del tick leen su voluntad**: la cola de obras, el reparto de manos, la fe, el ánimo, los pesos de los sucesos, la puerta de los que llegan y el interés del señor. Cuatro estilos por oficio y cuatro rasgos con número, **dos de los cuales §6.3 prometía desde el primer día y nadie había escrito**. Cuando el rey muere la corona pasa por la sucesión de A.15 con el estilo del sucesor, y el cartel de esa pregunta se reescribe neutro. **Sin coronar, la partida es byte a byte la de antes.** Medido en 24 partidas de sesenta años: el herrero deja 45 tramos de muralla contra 24, el cura deja la fe en 83 contra 34, el noble levanta su sala y paga tres casas por ella, la corona llega el año 27 y las muertas no se mueven. Y dos cosas que el medir arregló: **la sala costaba dos o tres casas a todos los reyes** —un impuesto por coronar, ahora sólo la pide el noble— y **el rey cura era una mejora limpia** hasta que se le puso precio (la obra le rinde un 10 % menos). Queda anotado lo que no llegó: **el rey del campo no tiene firma**, y los tres permisos que se le probaron no se ven porque lo que limita el campo no es el permiso sino la madera y las manos. |
| **3.88** | 18 sep 2026 | **Una muralla por aldea, no un anillo tras otro** | Corrección medida de §7.4c con el banco de balance en la mano. El anillo permitía levantar el siguiente cuando la aldea lo desbordaba, y eso abrió un sumidero: **§7.3 sólo pide casa cuando falta sitio para dormir**, así que en cuanto la aldea tiene camas de sobra la empalizada es lo único que queda en la lista de obras. Medido a 120 años en doce semillas: **1 824 tramos de muralla contra 131 casas**, y la semilla 51 con anillos en 8, 11, 14 y 17 y 336 tramos para catorce casas. Ahora hay **un anillo por valle**: cuando se cierra no hay más muralla que pedir y la obra pasa a las mejoras a piedra, que es lo que §7.3 manda hacer cuando ya está todo levantado. Quedan de 37 a 59 tramos por aldea y las casas y los campos no se mueven (131 y 89, los mismos). Es también lo que el dueño del diseño había pedido con sus palabras: «se construye la muralla alrededor y después la siguiente sección de construcción **va fuera** de la muralla» — lo nuevo va fuera, no otra muralla. |
| **3.87** | 18 sep 2026 | **Pinos en la ladera y el campo que ya no parpadea** | Trabajo de la sesión de arte, revisado y corregido con el dueño del diseño delante (§D.8b). **Los pinos**: la primera versión los metía en el bosque próximo a la falda y su veredicto fue «los pinos deben salir en la loma de la montaña, están mal puestos», así que ahora salen de la **ladera** —celdas de montaña de cota 0,2 a 1,6, la banda baja medida— en corros de uno, dos y tres y con tres alturas, tal como pidió. Medido en cuatro semillas: de 96 a 122 pinos en 45 a 59 corros, todos en la ladera, los tres tamaños de corro y las tres escalas presentes en cada valle, y el mismo valle siempre los mismos pinos. Los pinos **no son bosque**: no se talan y el árbol que cae sigue siendo de hoja, así que la fontanería que los metía en `tree-falls` y en los obstáculos se retira. **La sombra que parpadeaba era el campo**: sus hileras facetadas proyectaban y recibían sombra a la vez, y el shadow map dibujaba una sombra por diente. Un campo es suelo trabajado, así que se queda sin auto-sombra. Medido después: salto medio entre fotogramas de 1,9 sobre 255 y el único pico es el cambio de medianoche. |
| **3.86** | 18 sep 2026 | **La muralla, por anillos** | **Esquema 9** (§7.4c). Pedido por el dueño del diseño mirando una captura —«evitar esos cachos sueltos … la muralla tendrá que quedarse por secciones: si la aldea crece a un cierto punto, se construye la muralla alrededor y después la siguiente sección de construcción va fuera»—. La empalizada se levantaba sobre la envolvente convexa del núcleo, que crece con la aldea, así que cada pieza caía en la línea de su año: **de 7 a 19 tramos desconectados por valle al año 60**. Ahora hay un **anillo escrito en el estado** (`GameState.ring`, un radio desde la plaza) que no se mueve mientras quepa una pieza, la muralla crece pegada a sí misma, **ningún otro edificio puede pisar su línea** —de ahí que lo nuevo salga fuera solo— y cuando se llena, el siguiente anillo va tres celdas más afuera. Medido: al año 40, **un solo tramo en las cuatro semillas**; al 60, el tramo mayor tiene del 45 % al 100 % de las piezas contra el 25 % de antes. Dos números costaron tres medidas cada uno: la banda del anillo es 0,75 y no media celda —un círculo de celdas no pasa por sus centros, y con media celda el anillo parecía lleno y la muralla se iba a otro radio: 47 tramos— y el radio **se guarda** porque derivarlo de la mediana del tramo más largo no es estable: la mediana se mueve con cada pieza y salían 48 tramos. Cuesta madera y un 3 % de población (334 a 322 en ocho partidas), porque ahora la muralla de verdad se cierra. |
| **3.85** | 18 sep 2026 | **La plaza existe, y el pueblo se ordena alrededor** | **Esquema 8** (§7.4b). Hasta aquí la plaza era `valleyCore`, la media de los centros de los edificios, y **se movía sola**: medido, de 4,2 a 10,8 celdas entre la fundación y el año 60 en ocho semillas. Ahora se elige el día de la fundación al lado de la casa fundadora, se guarda, **nadie construye dentro de su círculo de tres celdas de radio** —ni un campo— y **§7.4 mide el trazado desde ella**, así que las casas se reparten a su alrededor en vez de alrededor de sí mismas. La reunión de §11.8 se convoca ahí, y el barril de la fiesta también. Medido en ocho partidas de sesenta años: reservar el círculo no cuesta nada (352 personas contra 354), y centrar el trazado cuesta un 6 % de población (354 a 334, casi todo en la semilla 11) a cambio de que el pueblo tenga centro. Se ve empedrada, con el borde más oscuro, y con **una fuente en el medio** cuya celda está cerrada al paso; la malla está encargada (`docs/encargos/encargo-fuente.md`) y hasta entonces son tres primitivas. **Y las puertas sueltas, que el dueño del diseño vio en una captura**: `defenceGates` daba un portón por cada tramo de muralla conectado, y la aldea levanta la empalizada pieza a pieza, así que un trozo de una sola pieza se convertía en una puerta de pie en la hierba —medido: de 6 a 17 portones por valle al año 60, y de 5 a 11 de ellos sueltos—. Ahora un portón pide tres piezas de muralla: la semilla 41 pasa de 17 a 5 y ninguno se queda solo. |
| **3.84** | 18 sep 2026 | **El barril en la plaza, el arado en el campo, y la tabla de clips descongelada** | **Lo que el jugador da se ve en el valle** (§7.14): el barril de la fiesta se planta en el corro de la reunión de §11.8 mientras dura la ventana que se pagó, y de él se bebe —seis plazas, medido: tres aldeanos distintos se acercan en cuarenta segundos de toma—; el arado se queda apoyado dentro de su campo desde el día que se dio. Van por `given()`, aparte de los trastos de V-09, que siguen apagados: el dueño del diseño dejó dicho que la maquinaria valía «para un trasto **en su sitio**, repartidos por el prado, no». **El sitio se midió tres veces** porque el aviso fue «el posicionamiento no estaba bien hecho»: entre los sembrados primero, a las afueras después, y al final en una plaza del propio corro con 0,8 celdas de aire —doce semillas, de 0,80 a 2,24, nunca bloqueado, nunca en un campo—. Y `Prop.fixed`, porque `village.ts` cogía cualquier trasto a cuya plaza llegaba y la fiesta se iba andando detrás del primero que bebía. **La tabla de clips deja de estar congelada**: `graphics-clock` comparaba doce entradas contra las cuatro del GLB y llevaba roja desde IA-12, que añadió ocho clips fabricados en código; ahora comprueba las tres propiedades que importan y `ACTION_CLIPS` es lo que las une. **Y el observatorio puede ver lo que el jugador metió**: `--means` y `--happening` abren el valle con un medio dado o con un suceso provocado, y la traza dice dónde está cada trasto y en qué píxel. Con eso queda rodado que **el lobo del corral ya iba al corral** (IA-5): se acerca a 1,8 de una gallina y a 1,0 del corral, sin penetraciones ni errores, así que esa línea de pendientes estaba mal anotada. |
| **3.83** | 17 sep 2026 | **La leña se corta por necesidad** | **Balanceo de los recursos básicos**, pedido por el dueño del diseño al cerrar el juego de los medios y deliberadamente corto («tampoco te excedas porque el sistema irá mutando»). La aldea manda al bosque **las manos que hacen falta** y no una parte fija de lo que sobra: la necesidad es el invierno que viene más el fondo de obra, menos lo que hay en la leñera (§7.13, `LABOUR.WOOD_TARGET_WEEKS`, `WOOD_WORKS_STOCK`, `WOOD_CATCH_UP_WEEKS`, `CUTTER_FLOOR_SHARE`). **Medido, la cuota fija hacía dos cosas mal con la misma regla**: un valle que no recibía nada del jugador pasaba **1 982 semanas de invierno con la leñera vacía** en veinticuatro partidas —el frío de §5.4— mientras otro apilaba **20 415** unidades de leña que nadie iba a gastar. Con la necesidad delante: **frío cero**, la leña se queda en 368 y nunca baja de 168, la población mediana de un valle sin ayuda sube de 38 a **44** y los que llegan a la piedra pasan de 7 a **12 de 24**. **Y las decisiones pasan a complementarse**, que es lo que se pidió: el hacha no cambiaba nada —la leña ocupa la décima parte de las manos, así que multiplicarla sólo podía liberar un 3 % de la aldea— y gana su efecto propio en la obra (`MEANS.AXE_WORKS`), porque un hacha buena también escuadra vigas. Queda anotado que **el hacha sigue siendo el medio más flojo** (18 de plata para +2 obras de 60) y que **el banco de balance hay que rehacerlo**: sus 19 rojas de 37 son de antes de este cambio. |
| **3.82** | 17 sep 2026 | **M-4 · el resto del carro, y las órdenes fuera del código** | **El juego de los medios, completo.** Tres medios más en el carro (§7.12): **un hacha buena** —más leña por leñador, y el bosque del corazón lo paga, que es de donde la riada saca su peso—, **una reliquia** —la fe deriva a `MEANS.RELIC_FAITH`, así que hay capilla y cura sin esperar una generación, y el camino se entera con `watched`— y **un par de manos**, el forastero que se queda. El forastero **no cuesta una tirada**: su nombre y sus rasgos salen de un `hash32` del tick, porque la invariante de todos los actos del jugador es que dar algo no mueve una sola tirada del mundo (§4.3) y `makeName` habría consumido del flujo `names`. **Y las órdenes permanentes salen del código**, no sólo de la pantalla: fuera `redesign/orders.ts`, `ui/answer.ts`, `UiActions.setIntent`, su prueba y cuarenta y una claves del banco; `state.intent` se queda en reposo dentro del motor porque sacarlo es una migración de esquema por limpieza y la limpieza va después (decisión 5 del dueño). **Medido** (24 semillas × 60 años, tabla completa en §7.12): de 38 de población sin dar nada a **61 con el arado**, con la reliquia adelantando la primera piedra **diez años**. Y dos cosas que la medida dice y el diseño no había previsto: **el carro entero sale peor que sólo el arado** (45 contra 61) porque comprar de todo deja sin plata para lo que cambia la partida, y **el hacha casi no cambia nada** (39 contra 38) — no por el medio, sino porque **la leña no es un cuello de botella en este juego**: de 507 a 43 000 unidades en cien años, medido desde v2.9. Que la leña deba escasear es balance, y el balance va después. |
| **3.81** | 17 sep 2026 | **M-2 · los medios, y el carro en el sitio de las órdenes** | **El verbo del juego cambia de sitio: el jugador deja de mandar y empieza a dar.** Es la imagen del dueño del diseño hecha mecánica —«le das una pala o un martillo y hacen cosas distintas; tú no les dices qué hacer»— y sustituye a las tres palancas permanentes de la v2.0, que se retiran de la interfaz por su decisión («no me gustan para nada») y con la medida detrás: sólo vivía la postura de fábrica. Tres medios (§7.12): **el arado** —un campo con la mitad de las manos, así que **sobran brazos y la aldea los reparte**; no sube la cosecha, que sería un número mejor y no un medio—, **dos cerdos** y **un barril**, cada uno con su coste en grano, leña y plata y cada uno con su cara mala: ratas y ladrones tras el granero lleno, lobos tras el corral, riñas tras la fiesta. **El carro** es la quinta ruta en el sitio de las órdenes: el precio en fichas de recurso, ni una cifra suelta, y el motivo escrito cuando no se puede dar (lo único que se conserva de las órdenes, el «te he entendido y no puedo» de E4). **Medido, y era la medida que decidía si el patrón valía** (`tools/reports/agency-report.ts`, 24 semillas × 60 años): población mediana **38 sin dar nada contra 61 con arado**, y la primera piedra en **24 valles de 24 contra 7** — veintitrés puntos de distancia, contra los cinco que §12.9 medía entre políticas de encrucijada. Y un hallazgo que no estaba diseñado: **con la misma plata, quien compra barriles en cuanto puede nunca junta para el arado** (45 contra 60), así que elegir no es una preferencia sino la partida. **Lo que costó medir**: con los precios primeros, un valle compraba **cincuenta y un barriles en sesenta años**; con los de ahora, y sin poder encadenar barriles, toda la plata de una partida da para una docena de medios. **Y tres trampas viejas que volvieron a morder, las tres cazadas por una captura y ninguna por una prueba**: `.valley-panel` es `position: absolute` y dejaba la bandeja del carro con altura cero; el atributo `hidden` no oculta nada cuando la piel pone `display` en el mismo elemento —escrito en `shell.css` desde UI-R2, ahora también en la skill— así que los dos toques de una oferta seguían en pantalla mientras la voz contaba otra cosa; y un `TS1005` por acentos graves dentro de una plantilla de CSS. |
| **3.80** | 17 sep 2026 | **M-1 · el mundo contesta a lo que hay** | **Lo que puede romper la aldea escala con lo que la aldea ha acumulado, y de primeras no la rompe.** Segunda fase del juego de los medios y decisión 4 del dueño del diseño, con sus dos mitades: «que haya partidas que se rompan es la idea» y «que caiga un rayo en una casa y eso ya se muera no tiene gracia; se puede morir, pero más adelante, porque ya hemos tomado varias decisiones que hacen que se tumbe». Los lobos pesan × cada cabeza del corral y ÷ empalizada, y con el corral apretado se llevan un cerdo; la riada pesa × el bosque del corazón que ya no está; el ladrón del granero (§A) y el diezmo del señor pasan a mirar **también la plata** —prosperar a la vista deja de ser gratis, y es el precio que el factor de grano siempre cobró con su bandera `watched`—. **El rayo y el incendio anual de §5.9 no dejan nunca a la aldea sin techo**: con un solo techo en pie caen en otra cosa, y si no hay otra cosa caen y no se llevan nada. Y **la gracia de los primeros años**: mientras la aldea sea joven y pequeña, lo que destruye pesa una cuarta parte —no es una puerta, el rayo sigue cayendo (§2.6 del rework)—. §1 de la especificación se reescribe: la fuente de letalidad pasa de «las encrucijadas, no el mundo» a **«la acumulación de lo que el jugador metió»**. **Medido, y la medida corrigió el brief** (`tools/reports/agency-report.ts`): un valle intocado pasa de 9 muertas de 32 a 1, y aislando las piezas se ve que la causa no es la gracia (sin ella, 2 de 32) sino que **la mayoría de los finales de antes eran ese rayo sobre la única casa**; el único final temprano que queda es un abandono en el año 8, que es §5.7 y tiene motivo. La letalidad por acumulación tarda: a sesenta años el valle cargado muere lo mismo pero con **la mitad de gente** (mediana 23 contra 42), y a ciento veinte años **9 muertas de 24 contra 1**. **Y un error que casi se queda dentro**: la gracia atada a «pequeña **o** joven volvía casi inmune a cualquier valle que se estuviera apagando, o sea un escudo para el que va perdiendo, que no protege el principio sino que borra el final; ahora es «joven **y** pequeña», con prueba de ese nombre. `weightNow` expone el peso de un suceso para medirlo sin jugar cien partidas. |
| **3.79** | 17 sep 2026 | **M-0 · la mesa del juego: piedra y plata** | **La economía pasa a estar en pantalla, porque el jugador va a pagar con ella.** Primera fase del juego de los medios (`docs/historico/plan-medios.md`, `docs/historico/rework.md` §4b), con el diagnóstico medido detrás: las palancas de órdenes son una trampa, las encrucijadas pesan pero no se sienten y la aldea prospera sola por diseño. Dos existencias nuevas (esquema 7). **La piedra**: era trabajo escondido (`bpCost = bp + piedra / STONE_PER_BP`) y no estaba en ningún sitio, mientras la capa de vida ya animaba la cantera; ahora la obra pica con sus propios puntos hasta tener la que pide —mismo cambio y **mismo trabajo total**, con prueba de equivalencia— y la gasta al levantar, y con la obra parada cantea al montón hasta `WORLD.STONE_IDLE_CAP`. Medido: la primera piedra sigue llegando en el año 48 de mediana (base 48, 32 semillas). **La plata**: lo único que viene de fuera, entra vendiendo a quien pasa y sale con el diezmo del señor cada otoño. **Y los tres comerciantes dejan de ser encrucijadas**: el canal propio de §7.8 (`selectTrader`) se retira entero y quien sube por el camino lo sortea la tabla de sucesos de R-1, dejando una **oferta** —una frase en la voz de la bandeja y dos toques, que es el formato que el dueño del diseño eligió: «una oferta que se acepta o se deja pasar», sin pantalla entera—. Las tres plantillas quedan en `RETIRED_TEMPLATES` para que una partida guardada que ya las contestó siga cargando. **El ánimo se enseña como cara** (§11.1.1): medido, va de 6 a 79 en sesenta años y pasa el 17 % de las semanas por debajo de 10, así que no estaba quieto —vive a escala de años y se miraba a escala de semanas—; cuatro gestos, y la cifra a un toque. **Lo que costó medir, y es la misma trampa que las palancas**: con un año de reserva el factor le compraba a la pareja fundadora el grano que la separaba del hambre y la semilla 9 se extinguía en el año 2; sin suelo de población, aceptar ofertas bajaba la población mediana de 47 a 15 y mataba seis aldeas de dieciséis. De ahí `OFFER.MIN_PEOPLE` 8, `FACTOR_KEEP_YEARS` 2 y `AGAIN_WEEKS` —sin el último, el factor subía 1 181 veces en dieciséis partidas y tapaba al resto de los sucesos—, las tres con su medida en §12.10. **Y la trampa de la ronda, que no habría fallado sola**: `life/resource-sites.ts` detectaba la cantera por el coste viejo, así que sacar la piedra de `bpCost` la borraba del valle en silencio; la obra se abre antes de picar y lleva su propio `stoneDone`. Cinco pruebas que medían una aldea hecha se reescribieron contra su propiedad (las riñas montaban su enfado sobre «los dos primeros nombrados» y la trayectoria nueva ya no lo cumple), y **una declarada como fallo volvió al verde sola** (`resentment`: esa aldea ya no llega al año 20 con las opiniones en el suelo). |
| **3.78** | 16 sep 2026 | **La cadencia de los sucesos va con el tamaño de la aldea** | **Un caserío de tres tiene una vida callada y una aldea de cuarenta un noticiario** (§7.10, §12.10). Con la tirada plana de v3.75 la pareja fundadora recibía los mismos doce sucesos al año que una aldea hecha —una catástrofe por trimestre— y no se recuperaba nunca: medido en doce semillas a cuarenta años, **ocho se rompían** y el ánimo pasaba por debajo de 25 entre dieciocho y treinta y siete años de cada cuarenta. Eso no era el caos que el dueño del diseño pidió, y lo dijo con estas palabras: «que una partida salga mal por casualidad está bien, es parte del juego, pero que casi todas se vayan a romper no es la idea; no hay que poner límites, pero que tampoco sea una locura, hay que equilibrar». La tirada semanal se reparte ahora en proporción a la población (`FATED_FULL_PEOPLE` 20, `FATED_LEAST_SHARE` 0,25). **No es un techo y no prohíbe ningún suceso**: el rayo sigue pudiendo caer sobre la única casa de la pareja, que es lo que §2.6 del rework decidió. Medido con la proporción: **tres de doce se rompen** y los nueve que aguantan llegan con entre 20 y 57 habitantes, en vez de 22, 9, 4 y 1. Y es más variedad entre valles, no menos. Dos pruebas se reescribieron contra la propiedad nueva —la cadencia se mide ahora sobre una aldea hecha y se exige que un caserío hable menos— y una tercera curaba un solo rencor cuando lo que su título dice es que un rencor curado no discute. |
| **3.77** | 16 sep 2026 | **UI-R0, auditoría del rediseño de interfaz** | **§11.2 separa rutas de superposiciones, y la puerta de vuelta pierde su condición.** Dos cosas que el rediseño de interfaz (`docs/ui-redesign/`) destapó al cerrar su especificación. (1) §11.2 listaba «cinco pantallas» mezclando lo que se navega con lo que se superpone, y además no contaba la pantalla de la gente, que existe desde U-08: una carcasa de navegación no se puede construir sobre esa lista. Ahora dice cinco **rutas** —valle, crónica, gente, ficha, órdenes, las mismas de `SheetRoute`— y dos **superposiciones** —encrucijada y epitafio—, y deja escrito como regla que de toda ruta se sale (U-14), que estaba contado como anécdota de una ronda. (2) La fila del render 2D justificaba la puerta `?render=canvas` con «no se borra hasta que alguien abra el juego en un teléfono», y **eso ya pasó**: el dueño lo abrió en su iPad y su iPhone el 15 sep. La puerta se queda por si acaso, no porque haga falta, y borrarla pasa a ser una decisión suya y no un bloqueo. Comprobado además que las diez APIs que el plan de interfaz nombra existen con ese nombre exacto (`vitalsOf`, `trendsOf`, `doingNow`, `answerFor`, `INTENT_STOPS`, `PRIORITY_STOPS`, `stopOf`, `speedLabel`, `panelFor`, `UI_BANK`) y que `TIME.SPEEDS` coincide con §12.1: **ningún contrato bloquea el rediseño**. Detalle en `docs/ui-redesign/rounds/UI-R0.md`. |
| **3.76** | 15 sep 2026 | **El caos es el juego: se quitan las puertas del rayo** | **El dueño del diseño, tras ver R-1:** «que haya caos y que haya partidas que se rompan y no se pueda seguir jugando es la idea del juego». R-1 había hecho lo contrario: al medir, el rayo quemaba la única casa de la pareja fundadora y tres aldeas de seis morían antes del año treinta, así que se pusieron dos puertas —`FATE.LIGHTNING_MIN_HOUSES = 2`, `FATE.LIGHTNING_MIN_PEOPLE = 4`— que protegían al valle. Van contra esa decisión y se quitan: `lightning_fire` (`src/engine/world/fate.ts`) sólo pide `ctx.sky.storms > 0 && wooden(state).length > 0`, y las dos constantes salen de `FATE` en `balance.ts`. Nada en el motor debe impedir que un valle muera. **Medido en doce semillas a cuarenta años** (`tools/reports/fate-report.ts`): 8 de 12 acaban (6 `abandoned`, 2 `extinction`) y 4 siguen (una de ellas, la semilla 67, con una sola persona); el rayo, que antes sólo salía en valles con dos casas y cuatro personas, ahora sale en las doce, con 0,32 apariciones al año (3 529 sucesos en 286 años de aldea, 12,3 al año; distancia entre valles 0,22, antes 0,16). La prueba que exigía que las seis semillas llegaran vivas al año treinta —«el mundo sigue en pie con los sucesos dentro»— se dio la vuelta: ahora es «el caos es el juego: unos valles se rompen y otros no» y mide que unas acaben y otras no, con la causa en la crónica; lo que se sigue exigiendo es integridad, no supervivencia (grano nunca negativo, ánimo entre 0 y 100, gallinas nunca negativas). `tests/journeys/founding.test.ts` pasó de seis a doce semillas y cuatro de sus cinco pruebas se remidieron con cotas nuevas y su motivo escrito, porque la promesa de fundación («ninguna pareja se extingue») daba por hecho justo lo que esta decisión prohíbe dar por hecho. |
| **3.75** | 15 sep 2026 | **R-1, los sucesos del valle** | **El mundo pasa cosas por su cuenta** (§7.10, §12.10, paso 2b de §4.2): cada semana el motor tira en el flujo nuevo `fate` contra doce sucesos —rayo, riada, lobos, boda, buhonero, pesca, tejado bajo la nieve, fiesta de la cosecha (rito), riña en la plaza, oso, niño perdido, forastero— y el que sale cambia el estado, se cuenta y se ve con los efectos de §11.5. Es la primera fase del rework que pidió el dueño («mucho más aleatorio y con mucha más vida», `docs/historico/rework.md`) y responde al diagnóstico de `docs/medidas/findings-drama.md`: la riña de la plaza es el empujón que las opiniones nunca recibían (de cero rencores en cuarenta años a entre 4 y 11). El cielo pasa al motor (`world/sky.ts`, sin tirada) para que un rayo tenga consecuencias. Medido en seis semillas × cuarenta años: 13,0 al año, mediana de tres semanas, distancia entre valles 0,16. `SCHEMA_VERSION` 6; los guardados anteriores no cargan. Doce pruebas se movieron porque la aldea de veinte años ya no es la de antes (16 personas en la semilla 7), cada una con su causa en `docs/historico/rework.md` §2.7; **nueve jornadas quedan rojas** por lo mismo y están listadas en §2.8, sin tocar porque el dueño pidió parar y documentar. **Y una contradicción anotada:** las dos puertas del rayo (`LIGHTNING_MIN_HOUSES`/`MIN_PEOPLE`) van contra su decisión posterior —«que haya partidas que se rompan es la idea del juego»— y hay que quitarlas (§2.6). |
| **3.74** | 15 sep 2026 | **Todo a main** | **Se fusiona la última rama suelta y el proyecto entero pasa a `main`**, por decisión del dueño («todo a main, ya»): sesenta y dos de las sesenta y cuatro ramas ya estaban dentro, faltaban la del trabajo de estos días y una de agente del 14 sep con un arreglo sin fusionar. Y al fusionarla salió algo mejor que su arreglo: **el mapa grande ya lo había arreglado**. La rama bajaba el umbral de `wolf_winter` de 0.25 a 0.15 porque en el mapa de 36 × 56 era inalcanzable por construcción —cero apariciones en cuatro semillas × sesenta años, la misma errata que el 0.3 de A.11—, pero v3.68 redefinió `forestLeft` contra el corazón productivo y con eso **el 0.25 ya se cruza**: su propia prueba de alcanzabilidad lo encuentra elegible sin tocar nada. Así que se deshizo el cambio de umbral y se quedó la prueba, que es lo que vale. Con 0.15, además, caían cinco pruebas medidas (la sal de §7.8, la desgracia compartida de §7.9, el apagón de §11.8 dos veces y dos alcanzabilidades). **Lo que la prueba nueva sí destapa y queda rojo a propósito:** `plague_blame` y `bandits` no cumplen condiciones nunca en seis semillas × sesenta años. El conflicto de la fusión fue el changelog viejo, que vivía dentro de `design.md` hasta v3.66; el cambio de especificación de la rama se aplicó a mano para no perderlo con él. |
| **3.73** | 15 sep 2026 | **U-13, el cielo; U-14, la vuelta atrás** | **Llueve, nieva y hay tormentas con rayos** (§10.8), que es el quinto y último paso del dueño del diseño. Es presentación y el motor no se entera: el cielo se **deriva** de la fila del clima del año, la estación y un `hash32` de la jornada (`derive/weather.ts`), sin consumir una tirada —hay prueba— y sin tocar el balance. Medido con `tools/reports/sky-report.ts`: 79 % de jornadas claras, una tormenta cada tres semanas, y **el año manda** (33,9 % de cielo cerrado en un valle ruinoso contra 9,2 % en uno abundante), así que dos valles del mismo año se ven distintos. Tres mallas para todo (D.9), invisibles con cielo claro. Dos cosas se arreglaron mirando capturas: el rayo caía fuera de cámara nueve de cada diez veces —ahora cae en el corazón— y medía cuarenta celdas, que la cámara isométrica proyecta como una raya de esquina a esquina. El trueno es ruido rosa filtrado (ni un fichero de audio, U-09) y lo dispara `app.ts` contando los rayos que el renderer cuenta, así que el render sigue sin saber que existe el sonido. **Y U-14: la crónica y la gente se podían abrir y no cerrar.** Lo dijo el dueño —«no hay forma de volver atrás»—: se cerraban sólo deslizando hacia abajo y su velo tapaba la barra de destinos. Ahora la barra se queda encima, es una barra de pestañas de verdad —la encendida dice dónde estás, tocar el valle vuelve— y cada pantalla lleva su botón de cerrar. |
| **3.72** | 15 sep 2026 | **U-12, el reloj con horas** | **La cabecera dice la hora, y la hora es la del sol que se ve.** Cuarto de los cinco pasos del dueño: «un contador con horas incluso, por eso quería arreglar el reloj: debe ser real el paso del tiempo». Lo que lo impedía era la tabla de §12.1: con la semana en 15 s y la jornada de sol en 120, pasaban **ocho amaneceres por semana**. La semana pasa a durar siete jornadas —`REAL_MS_PER_TICK` 15 s → 840 s— y de ahí sale todo lo demás: una jornada de sol **es un día**, la fecha cuenta días de 1 a 84 por estación, y `derive/clock.ts` da el día mientras `hourAt` da la hora **interpolando entre los momentos que el cielo ya tiene marcados** (alba 05:00, mediodía 12:00, anochecer 19:00, noche 22:00), porque la jornada comprime la noche y multiplicar la fase por 24 puso «la 01:00 sobre un valle a pleno sol» en la primera captura. Se puede comprobar desde fuera: `data-sun-phase` en la raíz y un recorrido que compara esa fase con lo que dice la cabecera. **El coste, escrito y medido:** a ×1 un año son once horas, así que lo que pasaba a ×1 pasa ahora a ×64 —la densidad de §11.6 se mide allí— y el techo de §8.6 se dice en semanas y no en minutos; el tope del letargo sigue siendo una generación (960 ticks) y en la pared son nueve días; y una pestaña oculta recupera **a la velocidad que estaba puesta**, que antes perdía quince de cada dieciséis semanas. Tres duplicados menos: el tick copiado a mano en `presentation-clock.ts`, los hitos de la jornada (ahora en `effects/day-phases.ts`, sin Three, para que la cabecera no lo arrastre) y el origen del día. §11.2, §12.1, §13.2, D.6.1. |
| **3.71** | 15 sep 2026 | **U-11, el inicio guiado** | **Al fundar, la cámara baja desde la sierra hasta la aldea, y la primera vez dos pistas dicen dónde están los dos mandos.** Tercero de los cinco pasos del dueño. El vuelo es cámara y no juego (`flyIn`; `lift` en la cámara, porque `zoom` recorta a `furthest` y desplaza el centro; y con el reloj real, `realDeltaSeconds`, porque el escénico lleva la velocidad y se para en pausa); arranca en `furthest`, cualquier gesto lo corta y aterriza en el reposo de D.6.3. Las pistas se tocan para pasar y no vuelven (`valley.guided`). **Medido con `data-view-height`** —la altura de la vista en la raíz, como `data-tick`—: 92 → 26 celdas en nueve segundos, suave, y las pistas a los diez. Antes de medir así, tres versiones seguidas «funcionaban» en captura suelta y en secuencia se veían quietas cinco segundos y un salto: primero por el reloj escénico, luego por el recorte de `zoom`, luego por un `lift` que fijaba el techo en vez de la altura. §11.2, pantalla 0b. |
| **3.70** | 15 sep 2026 | **U-10, el menú de inicio** | **El juego abre con un menú, y lo único que se configura es el número del valle.** Segundo de los cinco pasos del dueño (pareja, menú, inicio guiado, reloj con horas, tormentas). La configuración es el número porque la premisa es comparar valles: el mismo número da a cualquiera el mismo valle de partida. Continuar sólo con partida viva; si terminó, el menú funda sobre sus ruinas (§13.3). Sonido como preferencia. Pantalla antes de `boot` (`screens/title.ts`, `main.ts`), sin tocar el motor; las rutas de depuración no la ven, Playwright la pasa como el dedo y tiene su recorrido, `shot.mjs` la fotografía con `--open title`. §11.2, pantalla 0. |
| **3.69** | 15 sep 2026 | **La pareja** | **La aldea la fundan un hombre y una mujer, y crece con los que llegan.** Decisión del dueño del diseño, junto con la premisa del juego: un idle bonito de mirar de fondo cuya esencia es que cada valle salga distinto. `FOUNDING` pasa de veinte a dos (§12.2), `foundGame` y `foundPeople` aceptan un `FoundingProfile`, y las pruebas de mecánica siguen con la aldea de veinte (`TWENTY`, `tests/helpers/founding.ts`) porque miden una aldea hecha, no su nacimiento. Tres cosas salieron el primer día y están medidas con `tools/reports/founding-report.ts`: la pareja no cosechaba nada —la reserva de obra la dejaba en 1,7 brazos y `MIN_FIELD_CREW` es 2— y ahora **dos manos siempre pueden con un campo**; nadie llegaba con `ARRIVE_MIN_PEOPLE` en 8, y la aldea pequeña **atrae más y no exige cama** (§5.7); y `VIABLE_POPULATION` baja a 2. Seis semillas, cuarenta años: ninguna pareja se extingue, 5 a 20 personas a los diez años. Y del tratante de §7.8: ya no ofrece vender dos cerdos a quien tiene tres gallinas (`herd`, condición nueva del DSL). |
| **3.68** | 15 sep 2026 | **El mapa grande, V-11, la pantalla** | **72 × 112 con el corazón productivo de 36 × 56, y el vado se cruza.** El valle es el centro de algo más amplio: montañas por altura, lago, y un vado que A* atraviesa (`PATHING.FORD`) —antes nadie cruzaba el río y media aldea se quedaba sin ruta—. La suite de balance, remedida entera: las mismas once. V-11 cierra el Anexo E: `life/staging.ts` baja las órdenes del motor a la jornada. Y la pantalla vuelve a ser el valle, por el veredicto del dueño («¿de verdad esto es sólido?»): fuera los trastos de prueba, las órdenes en una hoja detrás de una línea, el tiempo en un botón, tres bocadillos como máximo, la cámara más lejos y sin volver sola. |
| **3.67** | 15 sep 2026 | **La versión 2.0** | **El juego tiene un verbo** (`docs/historico/plan-juego.md`): tres palancas de órdenes permanentes, la aldea contesta cuando no puede obedecer, cada cifra dice hacia dónde va, dos rasgos por valle. El reloj a velocidad entera: ocho semanas por jornada a cualquier velocidad, con la luz aplanada a ×16 y ×64. Y los mensajes: la temporada de caza se contaba catorce veces al año (2 831 de 3 309 avisos), las cartelas hablaban en pasado de lo que se estaba viendo. Medido con `tools/reports/notice-report.ts` y `tools/reports/works-report.ts`; y la trampa que quedó escrita: **un informe que avanza el mundo con `tick` en bucle no mide este juego**, porque nadie contesta las encrucijadas. |
| **3.66** | 15 sep 2026 | **Auditoría del proyecto** | **Se retira el camino viejo y la especificación alcanza al juego que se juega.** Pedido por el dueño del diseño: «hemos dado muchos palos de ciego, hay que eliminar código muerto y decisiones antiguas». Lo que se hizo, por orden de lo que pesa. **(1) V-12**, la retirada: 6 011 líneas fuera —`actors/index.ts`, el descarte de V-00, los bancos del piloto— y con ellas la bandera `valley.life`, que sin camino viejo no tenía nada que apagar. **(2) La segunda mitad de G-12**, que nunca se hizo: §1, §2.1, §2.4, §10, §13.4, §14, D.0, D.5, E.0 y E.3.6 describían un juego que llevaba un día sin jugarse. **(3) `src/derive/`**: el render nuevo importaba ocho módulos del viejo para saber qué contar, así que el que se juega dependía del que no. **(4) La suite en tres niveles**: `tests/fast/` prometía 20 s y tardaba 91 porque siete ficheros vivían jornadas enteras dentro; separados en `tests/journeys/`, la rápida volvió a 17,5 s sin tocar una aserción. **(5) Las rejas de navegador**: no pasaban las banderas de WebGL, el relevo a 3D fallaba en silencio y medían el Canvas creyendo medir el juego. **(6) Los modelos se precachean**, o sin red el valle abría en 2D. **(7) Siete exports muertos**, uno de ellos un duplicado de la entrada de crónica de «se plantea una encrucijada». **Cuatro regresiones invisibles**, todas del mismo día y todas fáciles de arreglar una vez vistas — la de fondo está en G-12: una migración sin su documentación no está hecha, está escondida. |
| **3.65** | 14 sep 2026 | **U-01 a U-09, la interfaz** | **Nueve rondas que no se habían registrado**, apuntadas al auditar. La demo tenía que leerse como un juego de móvil de verdad, y el diagnóstico no era que faltara color: faltaba **que se viera qué se puede hacer**. U-01 la piel, pergamino y tinta como tokens y ni una fuente de red. U-02 los hitos, derivados de estado con fecha real —**las edades tecnológicas no existen en este motor y no se inventan**—. U-03 las tres pantallas. U-04 el arranque, que es una frase y no un tutorial. U-05 la barra de destinos, que es lo que más acercó esto a un juego. U-06 la cabecera con la estación y cifras que reaccionan. U-07 la decisión pendiente, que era un punto de catorce píxeles para lo más importante que el juego pide. U-08 la pantalla de la gente, que destapó cinco oficios sin palabra en el banco. U-09 el sonido, sintetizado con Web Audio: ni un fichero de audio y +0,41 % de peso. **Y buena parte de «se ve muy pobre» no era la interfaz:** el valle abría pintado de invierno —la mezcla devolvía la estación anterior entera en la semana cero— y estaba sobreexpuesto sin mapeo de tonos. Corregir las dos cosas hizo más que toda la piel. |
| **3.64** | 14 sep 2026 | Anexo E, documentación | **El plan de la vida del valle pasa al documento.** Vivía en una página publicada fuera del repositorio y un agente que llegara al código no podía encontrarlo. Anexo E: diagnóstico (el valle no se simula, se dibuja), tres capas, seis innegociables, el mecanismo de ofertas e impulsos, lo hecho con sus medidas (V-00 a V-06, V-14), **por qué la demo en el juego es hoy peor que el descarte** (E.6: faltan V-07 y V-09, que son lo que se ve; se enseñó lo vistoso y se construyó lo invisible), las trampas ya pagadas (E.7) y los briefs de V-07 a V-16 en el formato de §17. Informes en `docs/historico/life-rounds/`. |
| **3.63** | 14 sep 2026 | V-14, el cuenco | **Hay sierra alrededor del valle y vive fuera del mapa.** Levantar el borde del propio mapa se midió antes de escribirlo: en las dos celdas del contorno viven el 32 % del bosque, trece edificios y el cauce por donde el río entra y sale. Así que el cuenco empieza donde el mapa acaba y el motor no sabe que existe. La cámara gana dos cajas —reposa en la aldea, alcanza la sierra—, porque con una sola tenía prohibido llegar a verla. Detalle en D.6.8. |
| **3.62** | 14 sep 2026 | G-11, dos reglas a medias | **En casa es dentro de casa, y de noche el sol está puesto.** `progressOf` marcaba `home` y se dibujaba en el umbral: los veinte vecinos pasaban la noche de pie en su puerta. Ahora quien está en casa no se pinta, como los animales al recogerse (§10.6), y la aldea se vacía a tirones. Y `NIGHT_FLOOR` era el suelo de las dos luces, así que el sol seguía al 38 % de noche proyectando sombras de árboles a medianoche; ahora se pone del todo y el hemisférico sostiene la noche, con el día exactamente igual que antes. |
| **3.61** | 14 sep 2026 | Motor, el carácter | **Todos los aldeanos nacen con carácter, y cuatro rasgos dejan de ser etiquetas.** Los rasgos se repartían al nombrar, así que la personalidad la fabricaba el cargo; ahora se nace con ellos (flujo `minds`) y el oficio va a quien encaja (`suitsRole`). `ambitious`, `craven`, `cunning` y `secretive` no cambiaban ningún resultado fuera del catálogo; deciden quién se va, quién aguanta el hambre, a quién le sienta mal el puesto de otro y quién no se ata. Medido: rencores en ocho de diez partidas donde antes no había ninguno. Balance: 12 pruebas rojas contra 10 — la extinción prudente entra por fin en banda (1,7 % → 6,67 %), la distancia entre políticas cae a 5 puntos y `smith_feud` se triplica. Es la contradicción de `docs/medidas/findings-drama.md` §4, medida. |
| **3.60** | 14 sep 2026 | Motor, §7.9 | **La convivencia deja de acercar siempre.** `workedTogether` era la única fuerza continua sobre las opiniones y era incondicionalmente positiva: el valle derivaba hacia la concordia y el −50 de `GRUDGE_AT` era inalcanzable, así que §6.4 y M-39 eran código que no se ejecutaba. Ahora se agria por carácter (dos ásperos se desgastan; uno amable lo desactiva) y por hambre. El roce va sobre todos los nombrados, no sobre la cuadrilla: contra una fuerza que actúa siempre hay que poner otra que actúe siempre. `NEIGHBOUR.FRICTION`, `HARSH`, `GENTLE`, `SOURS`, `FLOOR`. |
| **3.59** | 14 sep 2026 | G-11, el estado de la jornada | **Un solo sitio sostiene el estado que se pinta.** Dentro de una jornada escénica pasan ocho semanas a ×1 y sesenta y cuatro a ×64, y cada sistema del render se defendía por su cuenta congelando lo suyo; un sistema nuevo nacía con el teletransporte dentro sin que nada se quejara. Ahora `paint` releva el estado al anochecer y reparte ése (`scenic-state.ts`); el defecto se invierte: hay que pedir lo vivo. No arregla el desfase, sólo que ya no se ve; afinar el tick tampoco lo arreglaría (56 pasos por jornada en vez de 8), porque nace de D.6.1. Coste de afinarlo, medido, en `docs/historico/brief-reloj.md`. Detalle en D.6.7. |
| **3.58** | 13 sep 2026 | G-10, el suelo cuadriculado | **El valle estaba dibujado con un cuadrado de color plano por celda** y con elementos en tres dimensiones encima se leía como papel milimetrado. Las esquinas de la cuadrícula se mueven de sitio, cada esquina lleva algo del color de las celdas que la tocan, y el tono varía en dos escalas: una fina y otra lenta cada seis celdas. Ni el mapa ni el terreno cambian —esto es cómo se pinta, no qué hay—, y la malla sigue cerrada porque el desplazamiento sale de la esquina y no de la celda. Detalle en D.6.6. |
| **3.57** | 13 sep 2026 | G-10, la aldea no tenía calles | **Entre dos edificios con paredes queda ahora una celda de calle** (`BUILDING_RULES.STREET_GAP`, §7.2). Hasta aquí el motor pegaba las casas unas a otras —seis seguidas sin un hueco en la partida medida— y eso no era una fealdad: la puerta de la de en medio daba a la pared de la de al lado, y nadie podía entrar en su casa sin cruzar la del vecino. Los campos, la empalizada, el pozo y el camposanto están exentos: no tienen dentro, se pisan. Lo que esto mueve: la aldea ocupa más suelo y el reparto de destinos baja de 7,50 a 6,67 de media en seis partidas de veinte años —el mismo reparto en un pueblo más ancho—, y ni las decisiones ni la población cambian en cinco partidas de cuarenta años. **Y destapó dos teletransportes que llevaban tiempo escondidos**, los dos por lo mismo de siempre: algo que cambia con el tick, leído dentro de una jornada escénica que dura muchos ticks. (1) Al que perdía el tajo a media semana se le borraba la ruta y se le acababa el día de golpe en la puerta de su casa: siete celdas y media de salto. Ahora sólo se olvida a quien ya no está. (2) La gallina cuelga de la casa que le toca por su puesto en la fila, y una casa nueva cambiaba el reparto entero: dos celdas. La fila se congela al anochecer, como la cabaña. |
| **3.56** | 13 sep 2026 | G-10, los edificios estaban dos celdas al norte | **Todo lo construido se dibujaba desplazado el fondo de su huella.** El exportador de Blender convierte poniendo `z_glTF = −y_blender`, así que una receta que ocupa de 0 a 6 metros en Y sale ocupando de −6 a 0 en Z: el modelo se plantaba con su fondo en el origen. Llevaba así desde G-06 y no se veía porque el pueblo entero estaba desplazado igual; lo delató la gente, que sí sale de las coordenadas del motor. Era la causa de tres defectos que se estaban persiguiendo por separado: las ventanas encendidas donde no hay ventana, los aldeanos trabajando fuera del campo y los juncos creciendo debajo de lo construido. |
| **3.55** | 13 sep 2026 | G-10, el rebaño se teletransportaba | **El mismo fallo que la gente tuvo dos rondas, en los animales, y por la misma razón:** la querencia de cada bicho se sortea **con la semana** (§11.9, v3.06) para que no repita el mismo círculo desde la fundación. En el render 2D está bien —allí un tick es un día en pantalla y el salto se lee como «se ha ido a otra mata»— pero una jornada escénica dura **ocho semanas a ×1 y ciento veintiocho a ×16**: la querencia se re-sorteaba ciento veintiocho veces al día. Medido, **2,90 celdas de salto**. Se congela la semana, **y se cambia al anochecer, no al amanecer**: es la única hora en la que no se ve a nadie moverse, porque el ganado, los cuervos y los peces dejan de dibujarse en esa misma línea (§10.6) y el lobo empieza justo ahí, o sea que aparece ya en su sitio nuevo. Congelada al amanecer quedaba un salto al día, y con el ganado en pantalla. Con la cabaña se congela también el recuento, porque **el identificador de un animal es su puesto en la fila** y de ese número salen su fase, su radio y su querencia: naciendo una gallina a media jornada, todos los cerdos y todas las vacas cambiaban de número. Y al medirlo apareció un tercer salto, este de la ronda anterior: sacar de un empujón fijo a quien pisaba el agua costaba 0,61 celdas en el borde mismo; ahora se le deja pegado a la orilla y el desplazamiento crece desde cero. Queda en **0,04 celdas**, que son doce centímetros. |
| **3.54** | 13 sep 2026 | G-07, los gestos estaban colgados de un lienzo oculto | **En 3D no funcionaba ningún gesto, y no daba ningún error.** Ni arrastrar, ni pellizcar, ni tocar para abrir la ficha, ni mantener para seguir a alguien. La causa: los gestos se enganchan una vez al arrancar y **el relevo cambia de lienzo** —cuando el piloto entra, el de Canvas se oculta con `display: none` y aparece otro encima—, y un elemento oculto no recibe eventos. Ahora van en la raíz, que no cambia, y las coordenadas se miden contra el lienzo que el backend declara vivo. **Y entra la rueda del ratón**, que en un móvil no existe y en un navegador de escritorio era la única manera de acercarse, porque allí no hay dos dedos que pellizcar. Se normaliza a muescas, que unas ruedas dan píxeles y otras líneas. Las dos cosas salieron de jugar la demo en el ordenador; ninguna prueba las hubiera encontrado, y la que se deja puesta vigila el enganche sobre el código porque montar el juego entero pide un DOM que la suite rápida no tiene. |
| **3.53** | 13 sep 2026 | Decisión de diseño: §11.1.1 | **«El valle es el HUD y por defecto no hay ni una cifra» se relaja, por decisión del dueño del diseño y por lo que se vio jugando:** con el catálogo puesto, el valle está lleno y el jugador sigue sin saber qué pasa. Las señales diegeticas son lentas —el granero tarda una estación en vaciarse— y mudas sobre las personas. Entran **dos elementos y sólo dos**: una tira con gente, comida, leña y ánimo, y una burbuja de estado sobre quien está viviendo algo. **La comida se enseña en semanas y no en unidades**, porque la unidad es «una persona una semana» y la división la puede hacer el juego. **Y no hay contador de oro ni de piedra**: ninguno de los dos existe en la simulación —el comercio es trueque y la piedra se convierte en puntos de obra sin almacenarse nunca—, así que ponerlos sería inventar un número. Si hay moneda algún día, se decide en el motor y llega después. La burbuja **sólo sale de estado con fecha** —rencor formado, muerte de un allegado, hijo nacido, hambre, brote, y los encuentros de §11.9— y va en ese orden de prioridad: quien acaba de enterrar a un hijo no enseña que tiene hambre. |
| **3.52** | 13 sep 2026 | G-10, la luz por las ventanas y la puerta de casa | Tres cosas vistas jugando. **(1) La luz de noche era un rectángulo pegado a la fachada**, del tamaño de medio muro y sin relación con ningún hueco: se leía como un cartel encendido. Ahora sale **por las ventanas**, una por hueco y del tamaño del hueco. Las posiciones están escritas dos veces —en la receta en metros y en la escena en celdas— y hay prueba que las compara: una ventana encendida donde no hay ventana es peor que ninguna luz. **(2) La gente atravesaba las paredes y no usaba las puertas.** La ruta del motor va de centro a centro de edificio, que es lo que necesita para desgastar caminos, y el dibujo la seguía tal cual: el 48 % de la jornada transcurría **dentro de un muro**, empezando por el propio salón. Ahora cada edificio con paredes tiene **una puerta, fija y suya**, la ruta empieza y acaba en ella, y lo que quedaba dentro se rodea con una búsqueda corta. Baja al 5 %. **(3) Y ahí está el hallazgo que el dibujo no puede arreglar: esta aldea no tiene calles.** El motor coloca las casas pegadas —seis seguidas sin un hueco en la partida medida—, así que la puerta de la de en medio da a la pared de la de al lado. Lo que hace el render es lo que hace una hilera de casas de verdad: agrupa las huellas que se tocan y **saca la puerta al borde del grupo**. El resto es de §7.2 y queda anotado. |
| **3.51** | 11 sep 2026 | G-10, la gente se para a hablar | §11.9 en tres dimensiones: **quien se cruza con quien se para, y lo decide la opinión**. Dos que se aprecian se paran a menudo y dos que se detestan no se paran nunca, que es lo que hace que dos partidas con los mismos sucesos cuenten historias distintas. Lo decide `encountersAmong`, el mismo del render 2D; aquí sólo se dibuja. Se acerca, se está y se vuelve, con la azada guardada: una conversación con la azada en la mano no es una conversación. **Tres saltos costaron encontrarse, y los tres los caza la misma medida.** El emparejamiento sale del tick y una jornada escénica dura ocho ticks a ×1: sin congelarlo al amanecer, la conversación cambiaba de sitio ocho veces al día —**5,88 celdas**—. Repartiendo la ida en una fracción fija de la charla, la gente cruzaba el campo a **seis veces su paso**; ahora la ida dura lo que se tarda en andarla, y si no da tiempo a ir, estarse y volver, no se va. Y midiendo la distancia desde el centro del puesto en vez de desde donde se está cavando, una charla a un palmo se daba por alcanzada al instante y el aldeano aparecía allí —**0,78**—. La medida, de paso, aprendió algo: **muestreando cada 0,4 s, andar parece saltar**. La primera versión de la prueba medía 0,50 celdas en una jornada sin conversaciones y creía estar viendo un defecto. A ritmo de fotograma, el paso mayor del día es el camino de ida y vale 0,1. |
| **3.50** | 11 sep 2026 | G-10, la aldea se junta | **El principio 1 del juego, cumplido también en tres dimensiones.** Veinticinco de las cincuenta y seis opciones del catálogo convocan a la gente (§11.8); el render 2D las obedece desde M-32 y en 3D no pasaba nada. Ahora, el día que hay reunión, **nadie va al tajo**: salen de casa, van al sitio y se quedan quietos mirando al centro del corro, que es lo que convierte a doce personas sueltas en una reunión. En la reunión no se cava, y hay prueba que lo dice. Tres decisiones, y las tres son de presentación: **(1)** se decide al amanecer como los destinos, porque cambiarla a media jornada teletransporta —hay prueba que mide el salto mayor de doscientos cuarenta fotogramas y exige menos de media celda—; **(2)** `gatheringsAt` gana un tercer argumento opcional para preguntar *desde el amanecer anterior*, porque una reunión de cuatro semanas cabe entera entre dos amaneceres y preguntando sólo por ahora la mitad no se vería nunca —el render 2D no lo pasa y para él no cambia nada—; **(3)** la ruta es la puerta de casa y el sitio, **en línea recta**, que es lo mismo que hace el 2D y lo único posible sin pedirle rutas al motor: su caché de rutas es la que usa para desgastar caminos, y escribir en ella sería que el render moviera la simulación. El repartidor de puestos ya sabía poner a la gente en corro cuando el destino no es un edificio, así que la plaza no necesitó nada nuevo. Y `valley.html` gana `?gather=1`: las reuniones salen dos veces en treinta años, y esperar a que salga una para mirarla no es un método. |
| **3.49** | 11 sep 2026 | G-10, ninguna señal enterrada, y prueba que lo impide | Sacar la luz a la fachada no bastaba: **en esta aldea las casas se tocan**, y la de delante puede estar pegada, con lo que la luz caía dentro de su pared trasera y volvía a estar enterrada. Ahora se prueban las cuatro caras y se elige la libre. Sin ninguna libre, la luz **sube al caballete**, y arriba es un resplandor pequeño y no la ventana: una ventana de tres metros flotando sobre el tejado se lee como un panel encendido, no como una casa habitada. Lo que sale por el caballete de una casa medieval es la luz del hogar por el agujero del humo, y eso es del tamaño de un puño. **Y la lección queda convertida en aserto:** hay una prueba que recorre todas las señales y exige que cada una esté fuera de las paredes o por encima de los tejados. No arregla las cuatro que se encontraron mirando; impide que nazca la quinta. |
| **3.48** | 11 sep 2026 | Deuda saldada en el render 2D | Las reuniones «en el vado» se dibujaban **en el centro de la aldea**, que es donde no está el vado. §11.8 lo llevaba anotado como deuda con estas palabras: «repetir el cálculo exacto del motor exigiría exportarlo». G-10 lo exportó para poner las piedras de paso en su sitio, así que la deuda se paga de camino y con una línea. Es la tercera vez en esta ronda que la respuesta es la misma: **un sitio que la ficción nombra se calcula una vez**. |
| **3.47** | 11 sep 2026 | G-10, el vado | **El río se cruzaba por el aire.** El motor sabe dónde está el vado desde M-10 —la orilla firme más cercana al centro de la aldea— y es un sitio con historia: ahí llegan los forasteros, de ahí sale la cacería del lobo, ahí se despide a quien se va. En la escena no había nada. Ahora hay una losa de paso por cada celda de agua del cruce. **El sitio se le pregunta al motor**, que pasa a exportar su `ford`: calcularlo aquí sería tener dos vados, y en este proyecto **ya hay uno de más** —`render/gatherings.ts` tiene su propia conjetura y apunta a otro sitio—. Es la misma leccion de las cuatro señales perdidas: lo que viaja del 2D al 3D es el significado. Lo que sí se decide en la escena es por dónde cruza: desde la orilla, derecho al otro lado, y si no se llega a tierra firme no se pone nada, que mejor ningún vado que uno que no lleva a ninguna parte. |
| **3.46** | 11 sep 2026 | G-10, la partida ya no empieza de noche | El reloj escénico empezaba en cero, que con la luz de v3.34 es **antes del amanecer**. Abrir el juego y encontrarse el valle a oscuras, con todo el mundo dentro de casa y nada que mirar, es la peor primera impresión posible de un sitio que se vende por estar vivo. Ahora arranca a media mañana, con la aldea entera en la calle. **Desplaza el origen y nada más**: el día dura lo mismo y sigue siendo función del reloj, así que la misma partida da la misma imagen. Salió de mirar el juego de verdad con `?render=3d`, no el banco de pruebas; una prueba que pedía «el segundo cero» queriendo decir «de madrugada» pasa a pedir la hora. |
| **3.45** | 11 sep 2026 | G-10, lo que pisa el valle sigue su cota | El suelo dejó de ser plano en v3.32 y **todo lo que anda sobre él se quedó puesto a cero**: sobre un camino hundido la gente flotaba, y en la orilla se metía en el barro. Ahora el reparto y el rebaño preguntan al suelo por su cota. Hacía falta una función nueva: la que ya había vale para **esquinas de celda**, que son los vértices de la malla, y un aldeano no anda por las esquinas, anda por el medio; se interpola entre las cuatro que le rodean, que es exactamente la superficie que se dibuja. El pez es la excepción y no pregunta: nada en la lámina, no se apoya en el fondo. |
| **3.44** | 11 sep 2026 | G-10, nieva en los tejados | El suelo cambiaba de estación desde G-08 y el bosque desde v3.40, y **los tejados seguían de agosto en enero**. Ahora la nieve cuaja arriba, con el mismo blanco con el que §10.3 pinta el prado nevado: cuando el prado se pone blanco es que ha nevado, y la nieve no elige dónde cuajar. **Cuaja al 72 % y no del todo**, porque un tejado del color exacto del prado deja de leerse como tejado; y no toca la pared, que una casa blanca entera es una casa de otro color. El material del tejado **se copia por edificio**, igual que la ropa del aldeano y por el mismo motivo: el del recurso es de la biblioteca y nevar sobre él nevaría sobre todas las casas del valle a la vez. No cuesta una llamada de dibujo más, porque la llamada la cuenta la malla. Una casa levantada en enero nace nevada. Con esto se cierra el segundo punto abierto del informe de la ronda. |
| **3.43** | 11 sep 2026 | G-10, cobertura cerrada | **Los trece tipos de edificio tienen recurso, y hay prueba que lo vigila**: recorre la tabla de §7.2 y exige uno por tipo, y además que esté publicado, porque un recurso nombrado que nadie promovió sale como caja gris sin decir por qué. La caja con tejado sigue existiendo y sigue siendo lo correcto para un valle a medio catalogar: lo que pasa es que hoy no la usa nadie. **Y los nombrados se distinguen**, que era la fila de D.8 que quedaba: un 8 % más altos. El render 2D ya los dibuja más altos desde M-18 —1,8 contra 1,5—, así que esto es lo mismo dicho en tres dimensiones y no un lenguaje nuevo. Con esto la cobertura de G-10 queda sin placeholders y el presupuesto sin regresión, que son sus dos criterios de terminado. **Los hitos humanos 0 y 6 siguen sin validar y no los toca nadie salvo una persona jugando.** |
| **3.42** | 11 sep 2026 | G-10, el resto de señales perdidas | Encontrada una señal encerrada dentro de un muro, se miraron las demás, **y había tres más**. La peste estaba a media altura de la pared, o sea dentro de la casa: sube por encima del caballete, porque una alarma que hay que buscar no es una alarma. Las velas de la capilla, igual: salen a la fachada. Y el montón de grano del granero estaba en el centro del granero, que va **sobre postes**, así que desde arriba no se veía crecer nada: sube delante, que es donde se apila el grano de todas formas. **Y las luces aprenden qué hora es.** §10.3 pide luz *al caer el día*, y recién sacadas a la fachada lucían también a mediodía, lo que no dice que haya alguien en casa: dice que el render no sabe qué hora es. Ahora se enciende con el día escénico, con el mismo número que apaga el sol, y se apagan al amanecer. |
| **3.41** | 11 sep 2026 | G-10, la luz de las casas se recupera | **No se veía ni una luz en todo el valle, y llevaba así desde G-08.** En 2D la luz de una casa habitada se pinta sobre su dibujo; aquí la casa es un volumen y el punto que da `tellsFor` cae dentro de sus paredes, así que el resplandor quedaba encerrado. Una señal que no se puede ver no dice nada, y §10.3 pide justo lo contrario. Ahora la luz sale a la fachada —la cara de -Y, donde la receta pone la puerta y las ventanas— buscando la casa por el punto, y con las ventanas de esta misma ronda **el pueblo se enciende al anochecer**. La búsqueda se arma una vez por reconstrucción y no una por señal. Si el ancla del 2D se moviera y la casa no apareciera, la luz se queda donde venía: peor, pero no un fallo. Y la prueba dice la propiedad, no la geometría: el punto del 2D está dentro de las paredes y el de la escena delante de ellas. **Lo que no se comprueba** es que no caiga dentro de la casa de al lado, porque en este valle las casas se tocan y eso lo resuelve la cámara, no la señal. |
| **3.40** | 11 sep 2026 | G-10, el bosque también tiene estaciones | **En octubre el valle se ponía de oro y los árboles seguían de mayo.** El suelo cambia de estación desde G-08 y el bosque no lo hacía, y con nueve­cientos árboles encima eso era la mitad de la imagen contradiciendo a la otra mitad. Ahora el follaje se tiñe con `forest` y `forestDark` de §10.3, **la misma paleta que pinta el suelo y la misma que usa el render 2D**: aquí no se decide ningún verde, sólo se aplica el que ya estaba decidido. El tronco no se toca, que la corteza no cambia con el año. Los juncos de la orilla van con ellos. El material se **copia** para teñirlo, porque el del recurso es de la biblioteca y pintarlo se lo pintaría a todo el que lo use; la copia se suelta con el bosque. No cuesta nada en tiempo de ejecución: el bosque ya se replantaba al cambiar la firma del suelo, y la estación entra en esa firma desde v3.26, así que son doce reconstrucciones al año y ni una más. |
| **3.39** | 11 sep 2026 | G-10, el aldeano gana una frente | **Se salda la deuda más vieja del programa gráfico**, abierta desde G-04: el aldeano era simétrico delante y detrás, así que de espaldas y de cara se veía igual. De lejos eso quita la mitad de la información de una figura —hacia dónde mira es hacia dónde va— y de cerca se lee como un muñeco. **Se arregla con un mandil y no con una cara**: a la escala del valle un ojo son cero píxeles, y lo que se ve es una mancha del color de las perneras delante y nada detrás. Los ojos entran igualmente, porque de cerca cuentan mucho. El cuarto material **cuesta una llamada de dibujo por aldeano**, que es el precio exacto de la unión por material de v3.28, y se paga a propósito: unos ojos del color de la piel no son ojos. Medido antes y después: de 420 a **497 llamadas** en la peor escena contra un límite de 1 200, y de 1,90 a **2,10 ms** de CPU. Sigue holgado. Su papel de color es `trunk`, el marrón oscuro del valle, y no uno de los de casa: el aldeano no elige teja ni paja, así que esos papeles no existen para él, y el primer intento falló la construcción por pedir `timberDark`. Las casas ganan ventanas en la misma tanda, que una casa de yeso sin un solo hueco es una caja de yeso. |
| **3.38** | 11 sep 2026 | G-10, azada y fardo | **El aldeano cavaba con las manos vacías.** El clip de cavar está bien hecho —la espalda se dobla, los brazos bajan— y aun así no se leía como cavar, porque cavar sin azada no es cavar: es agacharse. Ahora cuelga una azada de `hand_r` mientras dure ese clip y un fardo de `hand_l` mientras alguien vuelve del campo. **Los conectores existían desde G-04 y no colgaba nada de ellos.** Se cuelgan una sola vez y luego sólo se encienden y se apagan, porque colgarlas en cada cambio de clip sería rehacer objetos por fotograma; y cuelgan del hueso, así que las anima el mismo esqueleto sin que nadie las mueva a mano. La herramienta hereda el `villagerId` de quien la lleva: sin eso, tocar la azada no devolvía a nadie. **Son los dos únicos recursos del catálogo que no se escalan a celdas**, y merece dicho por qué: el esqueleto del aldeano está en metros y la escala se la aplica su raíz, por encima de los huesos. Una azada ya convertida a celdas y colgada ahí se escala dos veces y queda de diecisiete centímetros, que es invisible y parece que no se ha puesto nada. Así salió el primer intento. El segundo puso la hoja a medio metro del mango, por colocar las piezas a ojo en vez de sobre el eje del cilindro ya girado. Medido: peor escena 420 llamadas contra 1 200 y 286 028 triángulos contra 450 000, CPU 1,90 ms. 879 KB por red. |
| **3.37** | 11 sep 2026 | G-10, la gente deja de ser clones | **Veintisiete personas en pantalla eran veintisiete copias del mismo señor.** Ahora cada aldeano tiene su talla y su ropa. La talla sale de la edad —de 0,62 al nacer a 1 a los dieciséis, en curva y no en recta porque con recta los de ocho años parecían enanos— y se pone en cada pasada, no al entrar en escena, para que un niño vaya creciendo. Desde arriba, que es donde no hay fichas que leer, el tamaño es lo único que dice que ahí hay un niño. La ropa sale del `id` y **no de un flujo de azar** (§4.3): el mismo aldeano viste igual en toda máquina y para siempre. La variación es pequeña a propósito —cuatro centésimas de tono y un quinto de claridad— porque la paleta de P1 sigue mandando y esto sólo la despeina. **No cuesta ni una llamada de dibujo más**: cada clon ya tenía sus mallas, y lo que cuenta una llamada es la malla y no el material. **Y se cierra la prueba intermitente** que llevaba tres rondas apareciendo y desapareciendo: la de los mil fotogramas de multitud medía tiempo de pared una sola vez y fallaba con 103 ms contra 100 cuando la máquina estaba compilando al lado. Pasa a tomar la mejor de tres. Sigue cazando un bucle de más; deja de cazar el ruido del equipo, que nunca fue el objetivo. Un fallo que aparece y desaparece es peor que no tener prueba, porque enseña a ignorarla. |
| **3.36** | 11 sep 2026 | G-10, el río corre y el camino se hunde | **El agua se mueve.** Un río quieto es un suelo azul por bien hecho que esté el cauce; lo que dice que eso es agua es que la superficie se inclina y la luz cambia con ella. Seis centímetros de onda bastan, con dos frecuencias cruzadas para que el patrón tarde en repetirse. La onda **se calcula desde el reposo guardado**, no desde el fotograma anterior: acumulándola, el río se iría hundiendo hasta desaparecer, y hay prueba que lo vigila doscientos fotogramas. **Y el camino deja rodada:** era sólo un color más claro y ahora se hunde con lo pisado que esté, de seis centímetros la senda a quince el camino real. La rodada **se suma al terreno en vez de sustituirlo**, para que un vado siga estando más bajo que el prado. Dos defectos vistos mirando, que es como se ven: el humo se hinchaba al doble y medio y de cerca eran discos grises del tamaño de un tejado; y **las chimeneas de yeso salían blancas bajo este sol**, así que cada casa parecía tener un huevo puesto encima. La chimenea pasa a ser de piedra, más alta y más estrecha, y el humo usa material sin luz: **el humo no se ilumina, se ve**. |
| **3.35** | 11 sep 2026 | G-10, el humo y la demo publicable | **El humo sube.** Era tres bolas quietas sobre cada chimenea, y una columna quieta es lo que delataba que el valle era una maqueta: todo se movía menos lo que por definición no puede estarse quieto. Ahora cada bocanada sube, se hincha y se deshace en seis segundos, desfasada un tercio de vuelta, **y el desfase de cada chimenea sale de dónde está**, para que dos casas no humeen al unísono como un coro. Es lo único de las señales que cambia por fotograma; el resto sigue cambiando con la semana. **Y el armador de la demo entra en el repo** (`tools/graphics/bundle-pilot.ts` con su plantilla): vivía en el scratchpad de la sesión y el handover lo anotaba como fragilidad. Toma los recursos **importando la lista del renderer**, que pasa a exportarse: el primer intento la rascaba del fichero con expresiones regulares y se dejó los juncos fuera sin que nadie lo notara, porque una orilla pelada no parece un fallo. Medido con todo dentro, en el mismo equipo de siempre: peor escena **398 llamadas** contra 1 200 y **286 028 triángulos** contra 450 000, con la CPU en 1,60 ms de mediana —sin moverse desde v3.30 pese al río, la fauna, la luz y la niebla—. Los bytes por la red suben a **857 KB**: siguen por debajo del límite de 1 MB y siguen pasados del objetivo de 600, que ya se anotó como tal en v3.30. |
| **3.34** | 11 sep 2026 | G-10, la luz del día escénico | **El valle tenía día pero la luz no se enteraba.** La gente sale al amanecer y a las ocho décimas se mete en casa (§10.6), y lo hacía con sol de mediodía: un pueblo que se acuesta a plena luz no se lee como un pueblo que se acuesta, se lee como un fallo. Ahora el sol sale por el este, cruza y se pone, se pone cálido cuando está bajo y el cielo se enciende de naranja justo antes de irse. **La legibilidad manda sobre el realismo:** §10.3 quiere el valle como HUD, así que la noche de este valle es de luna llena —baja el sol, entra el azul y no se apaga nada, con un suelo del 38 % del mediodía—. Es función pura de la hora, sin estado y sin azar, así que el mismo instante da siempre la misma luz. **Y entra niebla**, porque el fondo es un color plano y sin ella el borde del mapa era un corte limpio contra el cielo: el valle parecía una maqueta sobre una mesa. Se calibra **desde la cámara y no desde el mapa**: calibrada con el radio del valle empezaba a treinta y seis unidades con la cámara panorámica a más de cien, y la primera captura salió en blanco. |
| **3.33** | 11 sep 2026 | G-10, lote de fauna | **El valle tiene bichos: vaca, cerdo, gallina, lobo, cuervo y pez.** Cuántos hay y dónde están no lo decide esto: lo deciden `animalPositions` y `wildlifePositions`, los mismos del render 2D, igual que las señales salen de `tellsFor`. Duplicar §7.7 habría separado las dos aldeas en cuanto alguien tocara un umbral. Van instanciados, una malla por clase y por material, y **no se reconstruyen nunca**: en cada fotograma sólo se reescriben las matrices, que es lo que D.9 pide. La hora que se les pasa es **la del día escénico y no la fracción del tick**, para que se recojan al anochecer a la vez que la gente; con el tick se habrían metido en casa cuatro veces por día a ×1. Miran hacia donde andan, con un suelo de giro de seis centímetros: por debajo de eso el movimiento es el temblor del paseo, y girar con él dejaba a las gallinas dando vueltas sobre sí mismas. **Y aparece un defecto que el valle plano escondía:** las anclas de §7.7 no miran el terreno, así que una vaca junto al campo de la orilla se quedaba dentro del agua. En 2D no se veía; con el río en un cauce, sí. Se la empuja media celda a la orilla, y un bicho de tierra en mitad del río sin orilla cerca no se dibuja. El pez no pasa por ahí, que para él el agua es el sitio. Treinta recursos en el catálogo, gate verde con 950 pruebas. |
| **3.32** | 11 sep 2026 | G-10, el río, la ruina y la orilla | **El río deja de ser un color y pasa a ser un cauce.** El agua estaba pintada sobre el prado: misma altura, mismo material mate, y desde arriba era una alfombra azul. Ahora el terreno tiene relieve —el agua baja catorce centésimas de celda, la roca sube nueve— y **las esquinas promedian las celdas que las tocan**, que es lo que da la orilla; bajando la celda entera de golpe, el cauce tendría paredes verticales y un escalón en cada borde. Encima va una lámina de agua propia, plana mientras el cauce baja y lisa donde el prado es mate, porque **lo que distingue el agua de la hierba no es el color, es que brilla**. **Una casa perdida deja una ruina de verdad**, y son dos porque §7.4 trata distinto las dos: sobre la de madera se vuelve a construir y sobre la de piedra no. Postes rotos, vigas caídas y tierra quemada la primera; tres lienzos de muro desiguales y cascote la segunda. Esto **corrige v3.30**, que dejó la ruina sin recurso y por tanto en la caja gris de reserva: no usar el modelo intacto era lo correcto, quedarse sin modelo no. Y la orilla se puebla de juncos, un manojo de seis tallos inclinados donde el prado toca el agua. **La orilla no es un terreno**: el mapa no la nombra y no tiene por qué, sale de mirar los cuatro vecinos. Un puente se descartó por el mismo criterio en sentido contrario: ningún camino cruza el agua en el estado, así que ponerlo sería inventarlo. Veinticuatro recursos en el catálogo, gate verde con 945 pruebas. |
| **3.31** | 11 sep 2026 | G-10, lotes de campo, defensa y muerte | **El campo cambia con la cosecha**, que es la consecuencia visible mas grande del año: entre la siembra y la siega tiene cinco surcos de mies, y el resto del año los mismos surcos rasos y del color de la tierra. La regla sale de `TIME.HARVEST_WEEK`, la misma semana en la que el motor recoge el grano, así que si alguien mueve la cosecha el campo se mueve con ella. **Qué recurso le toca a un edificio pasa a vivir en el plan** y no en el renderer: es parte de qué hay que ver, y así el diff nota la siega y reconstruye los campos y sólo los campos. Con ellos entran empalizada, muralla, atalaya y cementerio: quince recursos en el catálogo. La empalizada lleva las estacas desiguales y el cementerio las lápidas torcidas a propósito, porque alineadas y todas iguales se leen como un almacén de bloques. |
| **3.30** | 11 sep 2026 | G-10, lotes de vivienda, sustento, comunidad y mundo | **La aldea deja de ser cajas: hay casa, casa de piedra, granero, molino, herrería, capilla, iglesia, pozo, cobertizo y roca.** Diez recetas nuevas, todas por debajo de 120 triángulos salvo el granero, con puertas, chimeneas, aspas, campanario y cruz. Las rocas se instancian sobre el terreno rocoso con la misma cuenta que los árboles: separar las dos habría sido tener dos veces el mismo reparto. Una ruina **nunca** usa recurso, porque lo que tiene que leerse es que ya no es una casa. Y una familia sin recurso cae a la caja con tejado: un valle a medio catalogar sigue siendo un valle. **La paleta gana dos papeles, `stone` y `grain`**, elevados como pide G-10 en vez de tocados en silencio: P1 no tuvo que nombrarlos porque no había mundo que pintar. Medido con el catálogo entero: 364 llamadas en la peor escena contra un límite de 1 200, 259 604 triángulos contra 450 000, y el tiempo de CPU sin moverse en 1,50 ms. Los bytes por la red suben a 632 KB y **pasan el objetivo de 600 sin llegar al límite de 1 MB**: queda anotado. |
| **3.29** | 11 sep 2026 | G-10, lote del mundo | **El valle tiene árboles.** Un tronco y tres masas de copa, 188 triángulos, casi tres celdas de alto, instanciados: novecientos árboles cuestan **tres** llamadas de dibujo, que es el caso que D.9 nombra por su nombre. Dónde va cada uno sale de su celda y de nada más, así que el mismo valle da siempre el mismo bosque y talar quita exactamente los árboles talados. **Y el presupuesto de triángulos de D.9.1 se corrige de 120 000 a 450 000**: los 90 000 de objetivo salían de medir un valle sin un solo árbol. Al plantarlo, los triángulos se multiplican por tres y el coste no se mueve —1,40 ms de mediana antes y después, seis llamadas más— porque van instanciados. Con instanciación, el número de triángulos deja de seguir al coste; lo siguen las llamadas y el tiempo de CPU. Y la lista cerrada de `metadata.kind` se abre: era una trampa de mantenimiento con una familia por lote. |
| **3.28** | 11 sep 2026 | G-09, la optimización que el banco señaló | **El aldeano se une por material antes de exportar: de dieciocho mallas a tres.** Es lo primero del orden de optimización de D.9 y lo que el banco señaló, con los aldeanos poniendo el 87 % de las llamadas de dibujo. Medido antes y después en el mismo equipo: 914 llamadas a **269** en la escena de comparación, 1 143 a **318** en la peor, y el tiempo de CPU de 3,60 a **1,30 ms** de mediana. **Ni un triángulo se mueve** y la auditoría de animación da los mismos números dígito a dígito, porque los grupos de vértices y el modificador de armadura viajan con cada malla al unirse. La unión va después del atado: antes dejaría una sola malla atada entera a un solo hueso. Los nodos pasan a llamarse por su material, así que las dos validaciones —binario y escena de Three.js— comprueban lo uno o lo otro según lo que la receta pida. Los dos objetivos de D.9.1 quedan cumplidos con margen, y ese margen es el presupuesto de G-10. |
| **3.27** | 10 sep 2026 | Ejecución G-09 | **Hay banco y hay presupuesto propuesto (D.9.1), medido sin dispositivo real y declarado como parcial.** Siete escenas de las que D.9 nombra, seis segundos cada una, con tiempo de CPU, cadencia, llamadas, triángulos, geometrías, programas, bytes por la red y deriva en sesión sostenida. No se informa tiempo de GPU porque no hay acceso fiable, y D.9 prohíbe llamarlo así. **El hallazgo: los aldeanos son el 87 % de las llamadas de dibujo**, dieciocho mallas cada uno, y unirlos por material los dejaría en tres. Se asigna al dueño del módulo medido en vez de apañarse aquí. Ninguna fuga: la deriva se queda en ruido, y las pruebas montan y desmontan pueblo y señales cien veces sin dejar nada. El renderer gana `stats()`, porque nadie fuera de él puede contar llamadas ni triángulos. |
| **3.26** | 10 sep 2026 | Ejecución G-08 | **El valle cambia de estación y dice lo que le pasa sin abrir una ficha.** El suelo se pinta con la paleta de §10.3, la misma que usa el render 2D: reutilizada, no duplicada, porque dos copias se separan en cuanto alguien retoca un verde. La estación entra en la firma del suelo, que antes sólo cambiaba si alguien talaba un árbol —el valle seguía verde en enero— y las dos semanas de transición de §10.3 también, así que hay doce reconstrucciones al año y ni una más. Las señales —humo, luz, peste, velas, estandartes, nivel del granero— salen de `tellsFor`, el mismo del 2D, y **ninguna tiene temporizador propio**: se leen del estado y desaparecen cuando el estado deja de decirlas. La forma y el sitio son la señal y el color acompaña, que es lo que D.3 pide para que se lea en grises. |
| **3.25** | 10 sep 2026 | G-07, segunda mitad | **El piloto 3D se puede jugar dentro del juego**, detrás de `?render=3d` y con Canvas por defecto. Canvas pinta desde el primer fotograma y el piloto releva cuando termina de cargar; si falla, el valle sigue en 2D en vez de quedarse en un error. **Dos lienzos, no uno**: un canvas no cambia de tipo de contexto una vez lo tiene. Cada backend sabe qué hay bajo un punto de su propia pantalla —el 2D por proporción de la rejilla, el 3D lanzando un rayo— y el pellizco pasa a ser zoom de verdad en vez de escalar el elemento con CSS, que es lo que D.7 pedía. Three.js se carga con `import()` diferido: quien juega en 2D no lo descarga. Y el contrato de D.5 gana **×64**, que el juego tenía desde que §11 lo añadió y el Anexo D no recogía. |
| **3.24** | 10 sep 2026 | G-07, primera mitad | **La cámara se puede acercar y arrastrar**, que es lo que faltaba desde que D.6.2 hizo al aldeano de 0,65 celdas: se ve la aldea entera y hay que acercarse para ver a la gente. `camera.ts` guarda su propio estado —centro y alto visible en celdas— y el renderer expone `zoom`, `pan` y `resetView`, porque D.7 dice que las acciones de cámara no son decisiones del juego. Acercar mantiene bajo el dedo el punto que estaba bajo el dedo; el arrastre no saca el centro del valle; girar el móvil recalcula cuánto cabe sin devolver al jugador al encuadre de partida. Diez pruebas sin GPU. Cuando las dos reglas de D.7 se cruzan —pellizcar sobre el cielo de al lado exigiría sacar la vista del mapa— manda el límite de arrastre. Falta la mitad de la ronda: los gestos y las fichas dentro de `src/ui/`, que hoy sólo existen en la página del piloto. |
| **3.23** | 10 sep 2026 | Dos fallos más vistos jugando la demo | **Un clip en el sitio exige un cuerpo en el sitio.** Al trabajar se reproducía el golpe de azada mientras el cuerpo se desplazaba alrededor del puesto, y eso se lee como deslizarse por poco que se mueva. Ahora se cava quieto y se dan unos pasos al surco siguiente, y esos pasos son el clip de andar; los surcos empiezan y acaban en el puesto para que llegar y marcharse sean continuos. Y **el día escénico se acelera con la raíz de la velocidad** (D.6.5): atado a la velocidad entera ponía las piernas a dieciséis ciclos por segundo, y sin atar el botón de ×16 no cambiaba nada visible. Dos pruebas nuevas guardan la regla desde los dos lados. |
| **3.22** | 10 sep 2026 | Tres fallos vistos jugando la demo de G-06 | **La jornada de un aldeano pertenece al día escénico, no a la semana.** El plan se sorteaba con el tick, que dura quince segundos frente a los ciento veinte del día, así que se rehacía ocho veces por día a ×1 y ciento veintiocho a ×16: cada rehecho era un teletransporte, y a velocidad alta la gente parpadeaba por el valle. El destino se congela también al amanecer, porque el motor reasigna el 6,7 % de las persona-semanas con saltos de nueve celdas de mediana; el tráfico y la economía siguen siendo del motor, lo único que cambia es cuándo se entera el actor. Es el estado efímero que D.6 ya concedía. Y el puesto de trabajo se reparte por la huella de la parcela en vez de amontonar a todo el mundo en la celda final de la ruta, formando parte de la ruta y no como un desvío al llegar. |
| **3.21** | 10 sep 2026 | Ejecución G-06 | **Una partida real produce una escena: el valle, el río, el bosque, treinta y cinco edificios y veinticinco aldeanos andando por él.** `createGraphicsRenderer` queda implementado entero, sin métodos vacíos: `pick` prioriza aldeano, edificio y terreno en ese orden, y `track` encuadra. La contabilidad de la escena vive separada de Three.js como un **plan** —función pura del estado— y un **diff**, que es lo que hace comprobable en la suite rápida lo que D.6 pide: que una ruina deje de ser una casa, que demoler retire sólo a ése, que talar mueva el suelo sin tocar un edificio y que otra partida se tire entera en vez de actualizarse. La propiedad de los recursos es explícita: la biblioteca posee geometría, materiales y clips, y un actor sólo su esqueleto y su mezclador, de modo que el primero que muere no se lleva por delante al resto. Los recursos aprobados se publican a `public/assets/valley3d/` con manifiesto y hash, y una prueba comprueba que lo publicado es lo que el catálogo aprobó. D.6.3 fija el encuadre de partida. Los edificios son cajas con tejado hasta que G-10 traiga el catálogo: lo que hay que juzgar ahora es si un valle de estas proporciones se lee desde arriba, y eso no necesita el arte final para leerse mal. |
| **3.20** | 10 sep 2026 | Decisión del usuario sobre la escala | **Un aldeano mide 0,65 celdas, no dos.** La aldea se ve entera al entrar y la gente se ve muy pequeña; para el detalle se acerca la cámara. El número sale de lo construido: una casa ocupa dos por dos celdas y mide seis metros de lado, así que una celda son tres metros y una persona 0,65. A 390 px de ancho, seis píxeles. La receta sigue en metros y declara un `scale` que el generador aplica a las raíces antes de exportar, así que la zancada baja de 0,95 a 0,32 sin tocar una sola clave. Arrastra la recalibración del día escénico a 120 s (D.6.1) y convierte los umbrales de la auditoría de animación en proporción del alto del recurso: en unidades absolutas denunciaban clips que no habían cambiado. |
| **3.19** | 10 sep 2026 | Ejecución G-05 | **Hay reloj de presentación y actores derivados: el piloto ya sabe qué hace cada aldeano en cada instante.** El reloj es dueño único del tiempo escénico, no toca el acumulador del motor, congela en pausa, suspende con la pestaña oculta y marca `discontinuity` cuando un letargo trae semanas de golpe. Los actores son función pura del estado y el instante: no guardan ruta, así que una muerte o una mudanza no pueden dejar a nadie andando un camino viejo. **El clip lo mueve el suelo recorrido y no el reloj**, que es lo que impide que los pies patinen, y eso obligó a calibrar el día escénico (D.6.1) en sesenta segundos. Por el camino, tres defectos que el render de Canvas también tiene: el reparto de la ruta iba por índice de celda y el aldeano aceleraba en las diagonales; el desvío del carril giraba de golpe en cada esquina; y un crío «jugando» se movía a doce veces la velocidad a la que nadie anda. |
| **3.18** | 10 sep 2026 | Segundo repaso de G-04, en el móvil | **Los codos doblaban al revés en andar y cargar.** El mismo error de signo que las rodillas pero espejado: la rodilla lleva el talón atrás y vive en positivo, el codo lleva la mano adelante y vive en negativo. Azadonar los tenía bien, y por eso era el único clip cuyos brazos se veían bien, lo que descartó la cámara como explicación. La auditoría gana la comprobación de **sentido** de cada bisagra, porque el ángulo por sí solo no distingue una rodilla de una rodilla del revés; verificada contra el artefacto defectuoso, denuncia los dos clips malos y deja en paz el bueno. |
| **3.17** | 10 sep 2026 | Repaso de G-04 tras verlo en movimiento | **Las rodillas del aldeano se doblaban al revés.** En huesos que apuntan hacia abajo el signo negativo es hacia delante, y las espinillas estaban en negativo: la rodilla se abría como la de un pájaro y el paso se veía como un balanceo de péndulo. Con apoyo y vuelo de verdad la flexión pasa de 25 a 41 grados. Andar no tocaba la columna, así que heredaba la inclinación de azadonar; ahora los cuatro clips mueven el mismo juego de huesos y un clip se basta solo. Cuentas esféricas en codo y rodilla, porque dos cilindros que se juntan en un punto enseñan sus tapas al doblar. La zancada declarada no era la que daban las piernas (0,62 contra 0,95) y pasa a medirse por el recorrido del pie que pisa. Y la promoción sólo exige equivalencia con lo aprobado si la receta no ha cambiado: sin eso, ningún cambio de forma era promovible. |
| **3.16** | 10 sep 2026 | Ejecución G-04 | **Existe un aldeano articulado con cuatro clips, construido por la misma cadena declarativa que un edificio.** 916 triángulos, 16 huesos, conectores en las dos manos. D.4.1 fija la piel rígida tras un banco común que dio coste idéntico y aspecto peor en la deformable. El atado va por grupo de vértices porque emparentar al hueso pivota por su cola y desprendía la cabeza con la validación en verde. `animation-audit.ts` mide los clips en el navegador —duración, deriva de raíz, cierre de bucle— y deja hojas de contactos, incluida una a 18×26 px que es el tamaño real del aldeano a 390 px de ancho. El catálogo gana un campo `motion` añadido —duración, bucle y zancada por clip— para que el controlador pueda casar su velocidad con la del clip y no deslizar los pies. Queda anotado que el aldeano no tiene frente. |
| **2.92** | 9 sep 2026, 20:08 | Ejecución G-02 | **Una receta declarativa ya genera, valida y promueve un recurso sin editar Blender.** Dos builds distintos conservaron 7 objetos, 4 materiales, 504 triángulos, caja y captura Three.js idénticos aunque sus binarios difirieran. El catálogo apunta a una promoción inmutable y guarda hashes concretos; los clips y conectores vacíos solo son válidos para el marcador. |
| **2.91** | 9 sep 2026, 17:26 | Ejecución G-01 | **El GLB de Blender carga directamente en Three.js r185 y dos capturas del mismo host coinciden byte a byte.** Se ratifican el encuadre ortográfico por caja, tiempo explícito y estados de carga; sombra y sesgo se derivan de escala. Three 0.185.0 + tipos 0.185.4 sustituyen r186 por compatibilidad. La cadena local de P0 queda cerrada; solo falta comprobar la recuperación desde otro dispositivo. |
| **2.90** | 9 sep 2026, 14:54 | Ejecución G-00 | **Blender 5.2.1 LTS fabrica `.blend`, `.glb` y PNG en segundo plano y sin GUI.** El éxito exige una marca explícita y comprobar artefactos porque Blender devolvió 0 ante dos excepciones Python durante el diagnóstico. Chrome del sistema cubre Playwright. P0 queda parcial hasta cargar el GLB en Three.js y abrir la evidencia desde un segundo dispositivo. |
| **2.89** | 9 sep 2026, 14:37 | Programa gráfico G-00–G-12 | **Una maqueta medieval 3D, producida y revisada por rondas reproducibles.** Anexo D incorpora análisis, dirección artística, contratos, producción Blender → GLB → Three.js, operación remota, pruebas y briefs. Autoriza un piloto aislado; no declara migrado el juego ni sustituye todavía los contratos Canvas de producción. La fecha es la del entorno de esta revisión; se conservan las fechas posteriores ya presentes en el historial, sin reinterpretarlas. |
> ### ⚠ Aviso sobre las entradas 2.10 a 2.17
>
> El fallo corregido en la **v2.18** —un brote de peste vencido que seguía
> restando ánimo para siempre— llevaba activo desde M-06. En cuanto una aldea
> sufría su primera peste, hacia el año 30, el ánimo quedaba clavado en el suelo
> de fe (≈10) y con él: **inmigración cerrada de por vida** (exige ánimo ≥ 50),
> **natalidad al 68 %** y **cosechas al 84 %**, en todas las partidas y para
> siempre.
>
> **Toda medición de balance anterior a la v2.18 describe ese mundo roto, no
> este.** Las decisiones que se tomaron *en respuesta* a esas cifras siguen en
> pie pero **necesitan volver a justificarse por sí solas**, y están marcadas
> abajo con ⚠. La lección, que vale para cualquier proyecto: **un número fuera
> de banda puede ser un mecanismo roto y no un balance mal calibrado; antes de
> ajustar una constante, comprueba que el mecanismo que mide funciona.**

| **2.0** | 6 sep 2026 | Diseño inicial | Documento detallado completo: modelo de dominio, balance verificado sobre 60 semillas × 200 años, 16 encrucijadas, 24 briefs. Única desviación de `valle.md`: mapa transpuesto a 36 × 56. |
| **2.1** | 6 sep 2026 | Revisión de M-01 | Tipo `RngBundle` inválido; alcance real de §12. |
| **2.2** | 6 sep 2026 | Revisión de M-02 | Grafo de dependencias invertido; `Grudge` incorporado; mortalidad no monótona; dos erratas de prosa. |
| **2.3** | 6 sep 2026 | Revisión de M-03 | Edad mínima por rol; rasgos incompatibles; constantes que solo vivían en prosa. |
| **2.4** | 6 sep 2026 | Revisión de M-04 | `leftTick`; edad derivada; `ageEveryone` eliminada; `FOUNDING.GRAIN` a 800. |
| **2.5** | 7 sep 2026, 13:34 | Revisión de M-06 | Orden del tick corregido; un solo escritor del ánimo; punto fijo de la fe roto; muerte inexplicada definida. |
| **2.6** | 7 sep 2026, 13:56 | Revisión de M-05 y M-09 | Componer crónica no consume aleatoriedad; **§9.4 nueva: la muerte de un nombrado**; semillas append-only; crisis de hambruna definida con fórmula. |
| **2.7** | 7 sep 2026, 14:18 | Revisión de M-07 | **La exención del techo se gasta en la primera pregunta**; criterio medible para el ritmo; epitafio con rencores sanados; `TERRAIN_CODE` como contrato de serialización. |
| **2.8** | 7 sep 2026, 18:53 | Revisión de M-08 | **Regla de elegibilidad episódica**; `grudge` mira opiniones; ratio `grainToHarvest`; A.1, A.13 y A.15 corregidas; la cobertura de vacantes tiene dueño. |
| **2.9** | 7 sep 2026, 19:11 | Puerta de M-08b | **Cubrir una vacante no es elegir al mayor**; el diagnóstico del catálogo pasa a dos columnas; `quiet_years` fuera del reparto; deuda del bosque registrada. |
| ⚠ **2.10** | 7 sep 2026, 19:26 | Puerta de M-08c | **Rango a 1–5**: la sucesión es el latido, no ruido; `fillCast` con vuelta atrás; la política `first` no es neutra; trampa de estación documentada. **Puerta superada.** |
| **2.11** | 7 sep 2026, 23:44 | Revisión de M-10 y desarrollo de M-11/M-12 | Muertes de todos los pasos con epitafio y coste de ánimo; búfer de crónica; determinismo con 5 000 ticks realmente alcanzados; banco real y cobertura pendiente explícita. |
| **2.12** | 8 sep 2026, 00:47 | M-13 y M-14 | Fuente única; **mapa real y aldea que se construye sola**; piedra en puntos de obra; dos lecturas de §7.4 corregidas; la iglesia crece desde cualquier esquina. Medido, no previsto. |
| **2.13** | 8 sep 2026, 01:20 | Revisión de M-13/M-14 | **Política `prudent` como referencia** y bandas por política; horquilla mínima entre jugar bien y mal; `interregnum` cierra la sucesión; los campos no arden. |
| ⚠ **2.14** | 8 sep 2026, 01:46 | Primera lectura del hito 0 | **Tabla de pesos normativa y agregación por año**; **tripulación mínima de campo**: se acabó la aldea zombi; `prudent` no compra muertes. |
| **2.15** | 8 sep 2026, 09:52 | M-15 | **Caminos y bosque**: el mapa cuenta dónde se pisa y qué se tala. Deuda del bosque de §12.9 saldada: incluir las dos plantillas mueve la cadencia 0,02. El banco se sale del presupuesto. |
| ⚠ **2.16** | 8 sep 2026, 11:20 | M-16 | **Abandono**: se acabó la agonía de cuarenta años. Presupuesto del banco a 10 min. La banda del bosque queda aguas abajo de la extinción. Atribución medida: `hostile` no se activa nunca con `prudent`. |
| ⚠ **2.17** | 8 sep 2026, 12:00 | Puerta de migración | **`prudent` deja de sobrevalorar el ánimo**: su peso baja de 15 a 3. La agonía se mide por la racha consecutiva más larga, igual que la regla de abandono. La puerta de ocho habitantes se somete a un A/B antes de tocarla. |
| **2.18** | 8 sep 2026, 12:30 | Expiración de la peste | **Un brote dura 6–10 semanas también para el ánimo y para la siguiente tirada anual.** Un objeto `outbreak` vencido se estaba tratando como peste perpetua: hundía el ánimo hasta el suelo de fe e impedía cualquier brote posterior. |
| **2.19** | 8 sep 2026, 13:00 | Rendimiento de M-12 | **Los caminos dejan de recorrer 2.016 celdas inertes cada semana.** Un conjunto derivado conserva solo celdas con tráfico o camino; no forma parte del estado ni del guardado y mantiene el orden observable de los eventos. |
| **2.20** | 8 sep 2026, 13:30 | Rendimiento de M-14 | **Un fracaso de colocación se recuerda mientras sus causas sigan iguales y cada búsqueda construye una sola máscara de ocupación.** El banco vuelve a entrar en diez minutos sin perder observaciones. |
| **2.21** | 8 sep 2026, 14:00 | Atribución de política | **La brecha adversa se mide por opción tomada.** Antes de cambiar A.15 se separa la repetición de `succession:no_one` del resto de decisiones de `last` y `worst`. |
| **2.22** | 8 sep 2026, 15:10 | El problema invertido | **Quedarse sin líder duele**: sin llegadas, marchas dobles y dispersión al tercer rechazo. Aviso de contaminación sobre las entradas medidas bajo la peste perpetua. Las bandas miden «partida terminada». |
| **2.24** | 8 sep 2026, 13:54 | El instrumento, no el juego | **Regla de no degeneración en las cuatro políticas.** Los dos umbrales adversos de la v2.23 pasan midiendo una sola opción: no valen. `hostile` inalcanzable para `prudent` es correcto. `MIN_FIELD_CREW` queda como invariante inerte. |
| **2.25** | 8 sep 2026, 18:20 | El precio escrito es un contrato | **§8.1, regla nueva.** Auditadas las 48 opciones: 13 mienten y 9 cumplen a medias. La causa es una sola y estructural — **14 banderas que nadie lee**. La horquilla manda sobre el ≥ 25 %. Dos umbrales recalibrados. Experimento de tres dientes: `worst` sube de 3,3 % a 8,3 %, `prudent` no se mueve. |
| **2.23** | 8 sep 2026, 16:40 | Verificación bajo el mundo corregido | **Los tres ⚠ re-medidos, sin ajustar nada.** A.15 implementado: `last`/`worst` pasan de casi nunca terminar a terminar el 100 %. La horquilla se dispara a 98,3 puntos. El bucle no era la elección — era que no tenía consecuencias; ahora las tiene y ambas políticas la eligen igual, deterministas. |
| **2.26** | 8 sep 2026, 19:00 | Contrato de A.3 | **Las tres respuestas de `hungry_spring` cobran su precio.** Sembrar fuerza ocho semanas de hambre 0,5; comer o repartir compromete la siguiente siega mediante el mecanismo contado en cosechas de v2.25. |
| **2.27** | 8 sep 2026, 19:30 | Contrato de A.5/A.6 | **Las decisiones durante una peste cambian su fecha final.** Un efecto explícito suma o resta semanas al brote activo una sola vez; desaparecen las dos banderas anuales que nadie podía leer correctamente. |
| **2.28** | 8 sep 2026, 20:00 | Contrato de trabajo | **Cada promesa de obra tiene su factor y su duración.** A.7 aplica 0,85 durante cuatro años, A.15 aplica 0,8 durante dos y A.12 aplica 0,4 durante seis semanas exactas. |
| **2.29** | 8 sep 2026, 20:30 | Contrato de expulsión | **Ser expulsado significa abandonar la población.** A.4 y A.8 marcan `leftTick`, sacan al personaje del reparto de nombres y contabilizan la marcha en el informe semanal y la crónica. |
| **2.30** | 8 sep 2026, 21:00 | Contrato de conflicto diferido | **`feud_ripe` conserva durante cinco años la prioridad de una disputa sembrada.** Las plantillas `feud` elegibles multiplican su peso por cuatro mientras la bandera está activa. |
| **2.31** | 8 sep 2026, 21:30 | Contrato de A.6 | **Silenciar al sacerdote conserva al sacerdote.** `silence_a` mantiene el oficio y cobra la pérdida de fe y ánimo que promete; `no_shepherd` solo cae si el cargo queda vacante después. |
| **2.32** | 8 sep 2026, 22:00 | Contrato de tregua de A.7 | **Construir juntos no hace que los rivales se perdonen.** Las opiniones mutuas bajan 15 en vez de subir 15; los cuatro proyectos y el ánimo común se conservan. |
| **2.33** | 8 sep 2026, 22:30 | Contrato visible de A.13 | **El precio de despedir a los forasteros dice cuánto grano sale.** Se sustituye «It costs less» por «Sixty bushels»; la mecánica no cambia. |
| **2.34** | 8 sep 2026, 23:00 | Contrato de A.9 | **La capilla compromete la próxima cosecha al 80 %.** El precio deja de prometer un «año magro» indefinido y nombra el quinto que se perderá en la siguiente siega. |
| **2.35** | 8 sep 2026, 23:30 | Contrato de A.11 | **Las dos decisiones de tala modifican el bosque real.** `fell_it` extrae 900 de madera y deja claras sin rebrote; `take_the_edge` extrae 300 y fuerza una semana de hambre 0,5. |
| **2.36** | 8 sep 2026, 23:50 | Consecuencia de A.11 | **Las laderas desnudas cambian el clima que se sortea.** `flood_prone` suma cinco puntos a los años ruinosos y los resta de los justos, sin añadir tiradas aleatorias. |
| **2.37** | 9 sep 2026, 00:20 | Contrato de piedra de A.16 | **La elección abre la familia de mejora que nombra.** Muros y casas de piedra dejan de construirse antes de A.16; elegir muro aumenta un 50 % la leña invernal durante veinte años. |
| **2.38** | 9 sep 2026, 00:45 | Consecuencia de A.16 | **Vivir tras la muralla reduce, pero no elimina, la presión exterior.** `behind_the_wall` multiplica por 0,4 el peso de las plantillas `lord` y `stranger`. |
| **2.39** | 9 sep 2026, 01:05 | Consecuencia de A.14 | **La reputación ganada frente a los bandidos reduce a la mitad el peso del señor.** `a_name_in_the_valley` se acumula con `behind_the_wall` sin saltarse elegibilidad ni crisis. |
| **2.40** | 9 sep 2026, 01:30 | Consecuencia de A.7 | **Quien se retira acaba dejando el valle con dos acompañantes.** `leave` admite una cuenta aleatoria anónima; `the_withdrawn` marca tres marchas y deja de convertir una retirada en muerte. |
| **2.41** | 9 sep 2026, 02:00 | Cierre de deuda de banderas | **El catálogo ya no escribe ninguna bandera sin lector.** Se retiran `unconsecrated`, para la que nunca existió plantilla, y `burnt_row`, sustituida por el bloqueo temporal de ruinas de v2.25. |
| **2.43** | 9 sep 2026, 19:35 | Composición de `story` | **Dos protecciones no se multiplican: gana la más fuerte.** Muro y reputación dejaban `lord` en 0,2 justo en la fase tardía, que es donde el catálogo ya no tenía dientes. Suelo de 0,25 como red. |
| **2.42** | 9 sep 2026, 02:20 | Instrumento de políticas | **Una marcha cuenta como población perdida al decidir.** `prudent` filtra expulsiones igual que muertes y `worst` las valora con el mismo peso, sin convertirlas en mortalidad. |
| **2.45** | 9 sep 2026, 22:55 | La aldea madura | **El catálogo está escrito para una aldea que crece y enmudece cuando ha crecido.** `forest_cut` a cero y `faith` desplomada son el mismo fallo. Los dientes no faltan: la gente se regenera y la capacidad no se toca. Presupuesto a 15 min, la última vez. |
| **3.15** | 13 sep 2026, 10:30 | P1 cerrada · dirección artística decidida | **Las dos direcciones de G-03 dejan de competir y pasan a ser materiales de casa: teja y paja conviven en la misma aldea.** El valle es uno solo, con las formas suaves de B. La ropa se integra en la paleta por decisión del usuario, con la legibilidad de la gente resuelta por silueta y no por color. Vista de cerca producida: P1 tenía las dos escalas pendientes y ya no. |
| **3.14** | 13 sep 2026, 02:00 | Las dos deudas, atacadas con perfilador | **Suite rápida de 34 s a 30,6 s**, partiendo el fichero que sola tardaba 35 y no se podía repartir. El banco sigue en 18 min: perfilado, el Aê es el 29 % y se llama 20.474 veces por partida **porque el suelo cambia 631 veces y cada cambio vacía la caché de rutas entera**. Bajarlo exige tocar el tráfico, que es balance. Tres optimizaciones probadas y **dos revertidas por medirlas**. |
| **3.12** | 12 sep 2026, 23:20 | Los guardas espantan cuervos de verdad | **Mandabas gente a espantar pájaros y veías los mismos pájaros.** §7.7 descontaba la vigilancia del mordisco desde v2.93 y en la imagen no se notaba. Con un hallazgo anotado: en una partida corriente la cobertura está casi siempre al máximo, así que la diferencia apenas se ve. |
| **3.11** | 12 sep 2026, 22:40 | La densidad, medida contra el veredicto | **El problema que abrió §11.6 está resuelto y se puede enseñar.** La primera sesión humana veía entre 0,0 y 0,6 sucesos notables en cinco minutos. Ahora son **2,8 a ×1** y 21 a ×4. Algo digno de contarse cada dos minutos a velocidad normal, donde antes cabía una sesión entera sin nada. |
| **3.10** | 12 sep 2026, 22:00 | El banco después de la vida nueva | **`forest_cut` entra en banda por primera vez desde v2.47** — el invierno en el bosque hizo lo que años de ajustes no consiguieron. A cambio `smith_feud` pasa de fallar en una política a fallar en las cuatro, y la extinción adversa vuelve de 15,0 % a 11,7 %. El tiempo del banco baja de 43 a **18,1 min**, todavía por encima de los 15. Diez fallos. |
| **3.09** | 12 sep 2026, 20:15 | La convivencia, y el freno que hacía falta | **Todas las fuerzas sobre las opiniones empujaban hacia abajo**, así que un valle largo acababa siendo siempre un valle de gente que no se aprecia. Trabajar en el mismo sitio ahora acerca. Y se destapa un bucle: sin freno, las riñas pasaron de 21 a **224** en cinco partidas, porque cada una hundía la opinión y los enemigos no trabajan juntos. |
| **3.08** | 12 sep 2026, 18:45 | Los rencores se ven | **Dos que se detestan dejan de trabajar codo con codo como si nada.** No pararse a hablar era sólo la mitad; la otra es darse la espalda, y eso se ve sin leer una línea de crónica. Un rencor de §6.4 pasa de ser una fila en un registro a algo que se nota todos los días. |
| **3.07** | 12 sep 2026, 17:30 | M-39 · las riñas, y lo que costó la vida nueva | **El valle escribía rencores desde M-05 y no hacía nada con ellos**: un rencor abierto era una fila en un registro y nadie discutía jamás. Ahora dos que se detestan acaban teniendo un mal día, con nombres y con consecuencias. Y se paga la factura de rendimiento de v3.03: mandar a la aldea entera al bosque en invierno había llevado el banco de once minutos a **cuarenta y tres**. |
| **3.06** | 12 sep 2026, 15:00 | M-38 · el paso y el carril | **Todos andaban por la misma raya y a la misma velocidad**, tapándose unos a otros: media docena de figuras dibujadas como una. Cada uno anda ahora a su paso y por su carril. Y el rebaño deja de pastar veinte años en el mismo metro cuadrado. Medido de punta a punta del bloque: de 145 figuras tapadas por instante a 9,6, y de repetir sitio casi todos a 6 de 32. |
| **3.05** | 12 sep 2026, 13:30 | M-36/M-37 · la aldea se entera y los oficios se ven | **Ardía una casa y la gente seguía camino del campo.** Ahora lo que acaba de pasarle a la aldea manda sobre todo lo demás. Y los ocho con nombre dejan de ser ocho labradores más: el herrero está en la fragua, el cura en la capilla, el alguacil en el granero. Los que no trabajan hacen recados en vez de quedarse clavados en su puerta, y los críos juegan delante de casa. |
| **3.03** | 12 sep 2026, 11:00 | M-35 · que la aldea parezca viva | **Segundo veredicto humano, y es el mismo problema visto de cerca: «se mueven todos los días igual».** Y era literal. Todos salían en el mismo instante, iban al mismo campo, se quedaban clavados y volvían juntos. §11.9 nueva: jornada propia por persona y por semana, la tierra repartida entre los campos, gente trabajando en vez de quieta, encuentros entre vecinos que deciden las opiniones, y un invierno en que **nadie ara**. |
| **3.01** | 12 sep 2026, 08:30 | M-33 · el estandarte y el apagón | **Quedan 17 opciones menos mudas.** El estandarte se iza sobre el núcleo y el edificio que una decisión manda apagar se queda sin humo, sin luz y sin velas. Y se arregla un fallo que dejaba muerto justo el estandarte que más significa: `years: 0` es **para siempre** (§3.1), no «dura cero», así que el paño gris de arrodillarse ante el señor no se izaba jamás. Sólo queda `scar`, con dos de sus tres variantes irreconstruibles. |
| **3.00** | 12 sep 2026, 06:00 | M-32 · que la decisión se vea | **42 de las 56 opciones del catálogo enfocaban una celda donde no aparecía nada nuevo.** El efecto visible no estaba roto —la cámara sí enfoca, como promete §11.2— pero ninguno de los seis tipos se representaba: un estandarte, una reunión y una cicatriz daban la misma imagen. §11.8 nueva: `gather` convoca de verdad a la aldea, derivado del historial y sin un byte de estado nuevo. Quedan cuatro tipos por representar, anotados. |
| **2.99** | 12 sep 2026, 04:20 | M-31 · lo que el mundo escribe en la gente | **§7.9 nueva: hasta hoy sólo las decisiones del jugador dejaban recuerdo.** Una hambruna o un incendio le pasaban a una población, no a nadie. La prueba estaba a la vista: `went_hungry` y `lost_home` tenían epitafio escrito desde M-09 y **ningún sistema los escribía jamás**. Ahora el hambre marca a quien la vive y el fuego a quien vivía en esa casa, con un recuerdo por año y no uno por semana. |
| **2.98** | 12 sep 2026, 03:05 | Cuánto comercio quiere la partida | **Medido el reposo largo y descartado.** Alargarlo de 18 a 26 años mete la cadencia adversa en banda y **devuelve la extinción a la línea base**: 15,0 % → 11,7 % y la separación 13,3 → 10,0 puntos. Menos comercio es menos presión. Se conservan los 18: el desenlace blando es el problema de fondo desde v2.47 y vale más que siete centésimas de cadencia. |
| **2.97** | 12 sep 2026, 02:15 | El canal propio del comercio | **Los comerciantes salen del sorteo de §8.6 y dejan de gastar su reposo.** Un buhonero ya no puede retrasar la sucesión que ha dejado pendiente una muerte. Y no sólo devuelve la cadencia a su sitio: el comercio empuja el desenlace hacia la banda que §12.9 pide — extinción adversa 11,7 % → 15,0 % y separación 10,0 → 13,3 puntos, ambas mejores que antes de que los comerciantes existieran. De once fallos del banco a nueve. |
| **2.96** | 12 sep 2026, 00:40 | Lo que costó meter tres plantillas | **El catálogo estaba lleno y nadie lo sabía.** Los tres comerciantes suben la cadencia de §12.9 por encima de su techo en las cuatro políticas (5,46–5,92 contra ≤5), y `forest_cut` pasa más tiempo elegible porque sale menos. Subir sus reposos para compensar silencia `feud` en el barrido corto, y se comprobó con tres valores distintos: no hay hueco. **No se toca el techo ni se ajusta a ciegas**: queda como decisión de diseño abierta con tres salidas. |
| **2.95** | 11 sep 2026, 23:30 | M-30 · los comerciantes del camino | **§7.8 nueva: el mundo exterior deja de ser mudo, y llega andando.** No hay pueblos vecinos en el mapa y no los habrá: lo que la aldea sabe de fuera es quién entra en ella. Tres comerciantes, una estación cada uno, y cada uno toca un sistema distinto — el tratante mueve el rebaño de §7.7, el salinero cambia lo que vale una matanza, el factor compra el excedente y paga en ser visto. Categoría `trade` y efecto `herd` nuevos en el DSL de §8.4. |
| **2.94** | 11 sep 2026, 21:15 | M-29 · la peste del ganado | **Lo que al rebaño le faltaba: miedo.** Hasta ahora un rebaño grande solo costaba grano; ahora también enferma, y cuanto más apretado está el corral más probable es. Construida a imagen de la plaga de §5.8, con el pozo protegiendo igual que protege a las personas, que era el segundo motivo que le faltaba a ese edificio. Flujo `murrain` propio: añadir la enfermedad no desplaza ni un lobo de una partida ya guardada. |
| **2.93** | 11 sep 2026, 19:40 | M-29 · los cuervos muerden | **El primer animal que le pide algo al jugador en vez de solo pasarle algo.** En las seis semanas antes de la siega los pájaros se llevan parte de la cosecha en pie, y la respuesta no es una obra sino brazos: alguien tiene que estar en el campo, y son los mismos brazos que quieren el bosque y las obras. Sin tirada de azar: lo que se pierde es consecuencia del reparto y se puede leer en él. De paso se arregla que `SCHEMA_VERSION` estuviera escrito a mano en dos sitios y se hubieran desincronizado. |
| **2.92** | 11 sep 2026, 18:10 | M-29 · caza y pesca, y lo que cuestan | **La aldea hambrienta sale al bosque y al río, y eso devuelve el desenlace a donde estaba antes del rebaño.** Extinción adversa 13,3 % → 11,7 % y separación 11,7 → 10,0 puntos: el forrajeo anula exactamente lo que el rebaño había ganado. Es la palanca que §2.47 dejó sin explorar, medida por fin. **No se ajusta ninguna constante para taparlo**: la fase de balance sigue cerrada y esto es una decisión de diseño pendiente, no un número mal puesto. |
| **2.91** | 11 sep 2026, 16:30 | M-29 · el rebaño, con mecánica y medido | **El ganado deja de ser dibujo y pasa a ser estado: come, se sacrifica y cría, y los lobos se llevan cabezas de verdad.** La pregunta que §7.7 dejó abierta —colchón o coste— la contesta el banco: **gana el coste**. La extinción adversa sube de 11,7 % a 13,3 % y la separación con `prudent` de 10,0 a 11,7 puntos; las dos van **hacia** la banda de §12.9, no en contra. Fallan las mismas siete pruebas que antes del rebaño, ni una más. Esquema de guardado 3 con migración 2→3. |
| **2.88** | 11 sep 2026, 15:45 | M-29 · la fauna, segundo trozo | **Cuervos sobre el grano maduro, lobos en la linde en las noches de invierno, peces en el río.** Cada uno con su reloj: es lo que hace que una noche de enero no se parezca a una tarde de julio. Siguen sin comerse nada — derivados y cosméticos como el ganado. |
| **2.87** | 11 sep 2026, 15:00 | M-29 · el ganado, primer trozo | **§7.7 nueva: el valle tiene animales.** Gallinas por casa, cerdos cuando hay granero, vacas cuando hay campos. Derivado y cosmético como la multitud de §10.6 y como las ruinas de §13.3: no es estado, no se guarda, no mueve un número. Lobos, cuervos, caza y pesca quedan declarados y sin construir. |
| **2.86** | 11 sep 2026, 14:15 | M-27.2 · «red primero» no lo era | **Un despliegue nuevo no llegaba a un móvil ya instalado, que es justo lo que §13.4 prometía.** Pages manda `Cache-Control: max-age=600` y un `fetch` corriente lo contesta la caché HTTP del navegador, por debajo del service worker. La prueba no lo veía porque `vite preview` no manda esa cabecera. |
| **2.85** | 11 sep 2026, 13:40 | 64× para poder probar | **Una cuarta velocidad, y por un motivo declarado: §16.2 dice que el ritmo solo se resuelve jugando, y a 16× un año son 45 s.** A 64× son once. Los botones dejan de estar escritos a mano y salen de `TIME.SPEEDS`, que era la única lista que debía existir. |
| **2.84** | 11 sep 2026, 13:10 | M-28 · lo que pasa se ve, y el reloj no se para | **Primera sesión humana real, y dice que no.** No es el guardado: en veinte años vistos hubo un asalto repelido, un asesinato, un incendio, una fragua y una sucesión, y el valle enseñó gente andando. §11.6 nueva: los sucesos de peso 2 y 3 aparecen sobre el valle con su propia línea. Y §13.2 gana su segunda puerta: volver de segundo plano ya no pierde el tiempo. |
| **2.83** | 11 sep 2026, 12:05 | M-27.1 · el subdirectorio, probado | **Pages no sirve en la raíz, y eso solo falla una vez desplegado.** Un servidor propio monta el mismo `dist/` bajo `/project/` y un recorrido comprueba que arranca, que el ámbito del trabajador se limita a ese prefijo y que ninguna ruta guardada se sale de él. |
| **2.82** | 11 sep 2026, 11:30 | M-27 · instalable y sin conexión | **La PWA que `CLAUDE.md` prometía desde el primer día y la spec no definía.** Manifest, iconos y un service worker con dos políticas: documento por red primero, lo demás por caché. §13.4 nueva, despliegue a GitHub Pages, y una frontera medida y declarada — abre sin red **desde la segunda apertura**, no desde la primera. |
| **2.81** | 11 sep 2026, 10:40 | M-23.6 · dominios de las condiciones guardadas | **Una referencia que resuelve todavía puede nombrar algo que el DSL no tiene.** `PlantedSeed.condition` aceptaba `stat` y `ratio` como cualquier cadena y `minWeek` como cualquier entero ≥ 0: la frontera de v2.73 comprobaba la plantilla, la opción y el `id`, pero no los tres dominios cerrados de §8.2. |
| **2.80** | 11 sep 2026, 03:20 | M-23.5 · guardado durante el letargo | **Una instantánea parcial no puede perdonar las semanas que aún debe.** Ocultar o cerrar entre lotes conserva en `savedAtMs` exactamente los ticks restantes; completar el letargo solicita su guardado antes de abrir la bienvenida y arrancar el reloj normal. |
| **2.79** | 11 sep 2026, 02:45 | M-10.1 · contrato del paquete ciego | **La entrega reproducible también tiene una regresión.** El contenido puro se separa de la escritura en disco y una prueba fija los cuatro nombres, las tres historias distintas, la ausencia de metadatos y la única pregunta permitida. Esto protege el cegado; el veredicto del hito 0 sigue perteneciendo a una persona ajena. |
| **2.78** | 11 sep 2026, 02:15 | M-09.1 · banco de interfaz completo | **El banco acababa en el epitafio.** Bienvenida, reloj, controles, marcador y fichas aún escribían inglés en los módulos UI, contra §2.2. Todo el texto visible y accesible pasa por `UI_BANK`; terrenos despejados dicen «clearing» y rasgos/memorias dejan de mostrar identificadores con guion bajo. |
| **2.77** | 11 sep 2026, 01:40 | M-00.1 · integración continua | **«En CI nocturna» ya significa un proceso existente.** Push y pull request ejecutan tipos, suite rápida, build, lint y Playwright; el banco largo queda en otro workflow diario a las 03:00 UTC y con disparo manual. Capturas y series se conservan como artefactos. |
| **2.76** | 11 sep 2026, 01:10 | Puerta de entrada del repositorio | **El README seguía viviendo en M-00.** Deja de anunciar «andamiaje» y cuenta el estado hasta M-26, cómo arrancar y validar, y cuáles son las dos aceptaciones que una automatización no puede adjudicarse. El paquete del lector del hito 0 queda accesible desde la portada. |
| **2.75** | 11 sep 2026, 00:40 | M-25.1 · crónica sobre el epitafio | **Existir en el DOM no es estar delante del jugador.** «Read the chronicle» montaba la pantalla 4 debajo del epitafio por el orden de capas. La crónica pasa al frente y al cerrarla devuelve intacto el epitafio. Playwright comprueba la superficie que recibe el toque, no solo la visibilidad CSS. |
| **2.74** | 11 sep 2026, 00:10 | Auditoría de la tabla de hitos | **Tres cierres existían fuera de la tabla.** La puerta visual dio su veredicto en v2.57, la decisión visible en v2.61 y la herencia en v2.68. Los hitos 1, 2 y 4 quedan marcados donde se consulta el estado, sin repetir ni automatizar sus aceptaciones. |
| **2.73** | 10 sep 2026, 23:00 | M-23.4 · identidad del contenido guardado | **Una forma completa también puede apuntar a nada.** Encrucijadas, decisiones y semillas guardadas solo cruzan la frontera si su plantilla, opción y consecuencia siguen en el catálogo y el reparto conserva todas sus letras. Una pregunta sin opciones ya no puede dejar la partida viva e irresoluble. |
| **2.72** | 10 sep 2026, 22:00 | M-23.3 · frontera de guardado | **Un objeto no es todavía una partida.** `deserialize` deja de aceptar contenedores parciales que rompían después, fuera del `catch` de IndexedDB. Valida capas tipadas, longitudes, entradas que recorrerán motor/render, identificadores de contenido y el archivo completo antes de entregar el estado a `boot`. |
| **2.71** | 10 sep 2026, 21:00 | M-26 · lector del archivo | **Una crónica guardada vuelve a ser legible.** La pantalla de crónica incorpora un selector para la aldea actual y todas las anteriores; reconstruye la voz desde la semilla archivada sin cambiar el esquema. La copia de la aldea que aún ocupa el epitafio no aparece dos veces. |
| **2.70** | 10 sep 2026, 20:00 | M-23.2 · bordes de persistencia | **Cerrar también guarda, y una identidad archivada no vuelve.** `pagehide` solicita una instantánea antes de detener el bucle; cada sucesora evita las semillas de todo el archivo, no solo la de su madre. Se eliminan la pérdida posible antes del tick 20 y la colisión de `(seed, endedTick)`. |
| **2.69** | 10 sep 2026, 19:15 | Auditoría de hitos 3, 5 y 6 | **Implementar y aceptar dejan de figurar como sinónimos.** Generaciones e idle cumplen sus criterios y se cierran con evidencia longitudinal y de interfaz. M-23 está completo, pero el hito 6 conserva su prueba de una partida humana de varios días: cuatro horas de reloj falso no son varios días jugados. |
| **2.68** | 10 sep 2026, 18:30 | M-25 · epitafio y herencia visible | **El fracaso ya tiene salida y memoria visible.** El reloj se detiene ante un epitafio que explica causa, duración y pico; la crónica se puede leer y «Begin again» funda gente distinta sobre el mismo terreno. Las ruinas heredadas se dibujan como una cimentación continua. Las escrituras de IndexedDB se ordenan para que la partida muerta nunca sobrescriba a su sucesora. **Hito 4 alcanzado.** |
| **2.67** | 10 sep 2026, 17:45 | M-24 · núcleo de herencia | **La semilla del valle sobrevive a sus habitantes.** El estado separa `seed` de `terrainSeed` y registra `peakPeople`; una partida terminada se archiva como crónica + huella, y una nueva semilla funda otra gente sobre el terreno y las ruinas anteriores. El hito 4 sigue abierto hasta decidir y mirar su interfaz. |
| **2.66** | 10 sep 2026, 17:00 | Coordenadas de efectos de M-22 | **El vado es una orilla, no una celda de agua.** `gather ford` enfoca el acceso terrestre contiguo al río más cercano al núcleo; `scar felled_wood`, la primera celda que la tala tocó realmente. Los dos dejan de caer sobre `valleyCore`. |
| **2.65** | 10 sep 2026, 16:30 | Cierre de M-11 | **La suite ya no promete trabajo futuro que existe en otro sitio.** Gestos/cámara viven en `ui.test.ts`, `app.test.ts` y Playwright; el guardado completo vive en `save.test.ts`. Se retiran los dos `it.todo`: 620 pruebas, cero pendientes, 17,53 s. |
| **2.64** | 10 sep 2026, 16:00 | Revisión del parte de bienvenida | **La recencia gana dentro de la variedad.** Las cuatro plazas toman primero el suceso más reciente de cada tipo y después una segunda aparición como máximo. Tres cosechas ya no expulsan una llegada ni se repiten por tercera vez. Bienvenida opaca y controles ocultos bajo la encrucijada cierran el sangrado entre pantallas. |
| **2.63** | 10 sep 2026, 15:10 | M-23 · hito 6 | **La aldea sigue sin ti, y el parte de bienvenida se entiende leído en frío — casi siempre.** Guardado, letargo y bienvenida implementados y verificados con reloj falso. Hallazgo sin arreglar: la selección de las cuatro entradas puede llenarse de cosechas seguidas y dejar fuera todo lo demás — un problema de selección, no de formato. |
| **2.62** | 10 sep 2026, 13:20 | El reloj del navegador no es el del juego | **Ninguna animación de interfaz corre sobre el compositor.** Una transición CSS dejó el zoom a medias; el caso de prueba es el letargo, 960 ticks en dos segundos. Y `douse` gana `who`: prometía apagar el taller de B y apagaba una casa cualquiera. |
| **2.61** | 10 sep 2026, 12:40 | M-22 · hito 2 | **La encrucijada está en pantalla y decidir cambia el valle.** El precio de las tres opciones se lee sin desplazar a 390 px reales. Sin coordenada natural: `douse` sobre una clase con más de una en pie, `gather ford` y `scar felled_wood` — los tres caen al centro de la aldea, igual que el estandarte. |
| **2.60** | 10 sep 2026, 09:15 | Contrato de decisión de M-22 | **`App.decide` encola; el paso 3 del tick aplica.** La interfaz nunca llama a `applyOption`. Encolar fuerza el tick siguiente para que el toque no se sienta roto, y el motor devuelve qué cambió y dónde — nunca adónde mirar. |
| **2.59** | 10 sep 2026, 07:00 | M-21 · HUD diegético y fichas | **Las cifras ya viven detrás del valle.** Tocar abre la ficha exacta, mantener sigue a un nombrado, pellizcar amplía y los deslizamientos navegan. Luces, humo, reserva, velas, cruces y ritmo de trabajo traducen el estado sin mutarlo. |
| **2.58** | 10 sep 2026, 06:30 | M-21a · contrato del HUD | **Una figura móvil se inspecciona donde se dibuja.** `inspectAt` admite la fracción visual sin romper su llamada de tres argumentos. Las señales de §11.1 reciben escalas deterministas y los seis gestos, umbrales táctiles explícitos. |
| **2.57** | 10 sep 2026, 06:00 | Puerta de movimiento de M-18 | **La multitud supera sus veinte segundos.** Una ruta viva determinista abre un valle de 80 habitantes; el GIF muestra salida, trabajo, regreso, noche vacía y nuevo ciclo sin perder figuras ni convertirlas en ruido. §14.3 queda cerrada. |
| **2.56** | 10 sep 2026, 05:30 | M-20 · armazón de aplicación | **La simulación ya corre en la pantalla móvil.** El reloj acumula fracciones sin perder ticks en sus límites, descarta el tiempo oculto y limita a ocho semanas cada fotograma. `ANNO I` presenta el año cero interno como primer año civil; la velocidad inicial es ×1. |
| **2.55** | 10 sep 2026, 05:00 | Veredicto visual de §14.3 | **M-16 y M-17 superan la hoja a tamaño móvil.** Las cuatro estaciones se reconocen, el gris conserva las masas y los edificios principales tienen siluetas propias. La densidad de M-18 se juzga en movimiento tras M-20; una captura estática no demuestra ni falsifica su ciclo. |
| **2.54** | 10 sep 2026, 04:35 | Puerta visual de §14.3 | **Generar no es mirar.** La hoja de contacto rotula año, estación y versión gris en cada panel para que una persona pueda juzgarla sin memorizar el orden. M-16, M-17 y M-18 quedan técnicamente implementados y visualmente pendientes de ese veredicto. |
| **2.53** | 10 sep 2026, 04:15 | Paquete ciego del hito 0 | **La entrega al lector ya es reproducible.** Un comando genera tres crónicas A/B/C de 60 años y una sola pregunta, sin semilla, política ni saldo final. El hito sigue sin validar: preparar al juez no equivale a recibir su veredicto. |
| **2.52** | 10 sep 2026, 03:50 | M-18 · la multitud | **Los anclajes son caché, no estado.** M-15 ya deriva rutas desde hogares, trabajo y suelo; M-18 las lee una vez por fotograma y completa niños, mayores y gente sin oficio con su hogar o la plaza. Ochenta figuras, 1.000 llamadas en 9,14 ms. |
| **2.51** | 10 sep 2026, 03:10 | M-17 · edificios y figuras | **Las aspas no giran dentro de un fondo inmóvil.** La firma pura no recibe tiempo ni viento y los edificios se cachean; el molino conserva una orientación fija. Trece edificios, ruina y dos figuras dibujados por código, con sombras y contornos. |
| **2.50** | 10 sep 2026, 02:20 | M-16 · terreno y paletas | **La tabla de color no cumplía su propio test.** Primavera y verano dejaban siluetas a 1–2 puntos; se aplica el menor desplazamiento de luminosidad que garantiza 8, con margen de cuantización. Terreno por regiones, caminos y cuatro estaciones visibles en la hoja de M-19. |
| **2.49** | 10 sep 2026, 01:35 | M-19 antes del primer píxel | **La captura deja de depender del render.** La ruta de depuración salta a año y estación con política `prudent`; el comando produce 16 vistas móviles, sus 16 versiones grises y una hoja de contacto. M-16 heredará este instrumento ya ejecutable. |
| **2.48** | 10 sep 2026, 01:00 | Aplicación del cierre | **Las dos puertas decididas en v2.47 están vivas.** En 30 semillas × 150 años, `forest_cut` aparece 268 veces y `relic_pedlar` 49; ninguna de las 17 plantillas queda muda. Suite rápida: 577 pruebas pasan. No se reabre el balance. |
| **2.47** | 10 sep 2026, 00:30 | Cierre de fase | **Las dos plantillas muertas se arreglan** (`forest_cut` pedía un bosque imposible; `relic_pedlar` abandonaba su franja de fe para siempre). Y se cierra la fase de balance: **dos hipótesis falsadas seguidas significan que falta evidencia, no otra hipótesis.** Siguiente hito, el render. |
| **2.46** | 9 sep 2026, 23:50 | La hipótesis falsada, la auditoría completa | **La capacidad no es el palanca — al menos no así.** Campos en pie a mediana 8 en las cuatro políticas, `worst` incluido: la aldea reconstruye tan rápido como `fight_them` destruye. Auditoría de la aldea madura, 17 plantillas: `forest_cut` pide más bosque del que el mapa puede generar nunca — descuido puro, no maduración. |
| **2.44** | 9 sep 2026, 21:40 | El banco que termina | **60 × 200 × 4, sin interrupción.** `story` compone por fuerza, no por producto — implementado. `worst` termina el 10,0 %, la horquilla es de 8,3 puntos: ni el bucle ni el instrumento; el catálogo. `forest_cut` a cero en 240 partidas. El banco cruza el presupuesto: 638,4 s. |

### 2.88 — Cuervos, lobos y un río que por fin tiene algo dentro

Segundo trozo de §7.7, y el mismo trato que el primero: derivado, cosmético, sin
escribir estado y sin mover un número. Lo que aporta no es mecánica sino
**tiempo**: cada bicho tiene su reloj, y eso es lo que hace que una noche de
enero no se parezca a una tarde de julio.

- **Cuervos** sobre los campos, solo en las semanas en que hay grano en pie que
  valga la pena: las seis anteriores a la siega de la semana 35 (§5.1). En
  primavera, con el campo recién sembrado, no bajan. De noche tampoco vuelan.
- **Lobos** en la linde del bosque, en las noches de invierno, **justo cuando el
  corral se ha quedado vacío**. No es casualidad de guion: la misma frontera de
  la fracción de tick que mete a la gente en casa es la que los saca a ellos.
- **Peces** en el río, que estaba dibujado desde M-13 y no tenía nada dentro. Se
  pintan como una onda y no como un pez: lo que se ve desde la orilla es el agua
  moviéndose.

**Mirado** (§14.3). La captura de una noche de invierno es la que justifica el
trozo entero: la aldea vacía y nevada, las ventanas encendidas, y tres lobos en
la linde. Las ondas del río salieron mejor de lo esperado. Los cuervos son lo
más flojo del conjunto —una mancha oscura sobre el campo— y queda dicho aquí en
vez de descubrirse más tarde; el pase de arte tiene ahí trabajo.

**Evidencia.** Cinco pruebas nuevas, trece en total para §7.7: que la fauna
tampoco escribe estado, que los cuervos aparecen la semana 34 y no la 4 ni la
39 ni de noche, que los lobos son de noche **y** de invierno —y que a esa misma
hora no queda una cabeza de ganado fuera, comprobado en la misma prueba—, que
los peces caen sobre agua y no sobre hierba, y que todo ello es determinista.
Suite rápida **653 en 17,5 s**, Playwright **13/13**, tipos, lint y build pasan.

**Lo falsaría** un cuervo en primavera, un lobo en verano o de día, un pez sobre
la hierba, o que cualquiera de los tres escribiese en `GameState`.

**Sigue sin construirse** lo que da de comer: que el lobo se lleve una cabeza,
que el cuervo muerda el rendimiento, la caza y la pesca como trabajo. Todo eso
exige promover los animales a estado, subir el esquema (§13.1) y volver a correr
el banco, porque son comida y §12.9 mide hambrunas.

### 2.87 — Un valle sin un animal a la vista

Primer trozo de §7.7. La sesión humana de §16.3 no dijo que faltaran sucesos:
dijo que no se veía ninguno. **Un animal es la excepción a ese problema**: una
gallina picoteando entre dos casas se ve sin que nadie la anuncie, mientras que
un rencor o una semilla diferida necesitan que alguien los cuente. Por eso el
ganado va antes que más contenido.

**Derivado, no estado.** Se calcula de lo que la aldea ya tiene, igual que la
multitud de §10.6, y `GameState` no se escribe ni una vez. Es el trato de §13.3
con las ruinas heredadas —*están ahí para verse*— y por un motivo concreto: el
balance está fuera de banda y cerrado como red de regresión (§2.47), así que una
fuente de comida nueva no entra sin volver a medir el banco. Gallinas por cada
casa, cerdos solo cuando hay granero con que cebarlos, vacas solo cuando hay
campos que pastorear al lado. De noche —la fracción de tick pasada 0,8, la misma
que recoge a la gente— el corral queda vacío, que es la ventana por la que
entrarán los lobos.

**Mirado, no solo probado** (§14.3). La primera versión pintaba las vacas con
`palette.rock`, que es literalmente el color de las manchas de roca del mapa: en
la captura ampliada parecían piedras. Son de color crema desde la segunda.
Gallinas y cerdos se leen a la primera. Los sprites son provisionales y el pase
de arte los sustituirá; nada depende de cómo se ven.

**Evidencia.** Ocho pruebas fijan lo que importa, que no es el dibujo: que el
ganado no escribe estado —huella del estado idéntica antes y después de
consultarlo—, que dos partidas iguales lo colocan igual, que de noche no hay
ninguno, que sin aldea no hay ninguno, que las gallinas siguen a las casas y las
vacas a los campos, que sin granero no hay cerdos, que ninguna cabeza se sale
del mapa en cinco semillas y que una aldea de ochenta no se vuelve un corral de
cientos. Suite rápida **648 en 17,2 s**; tipos, lint y build pasan.

**Lo falsaría** que el ganado escribiese en `GameState`, que apareciese sin
aldea, que dos partidas con la misma semilla lo colocasen distinto, o que
moviese un número del balance.

**Lo que NO hace todavía:** alimentar a nadie. Lobos, cuervos, caza y pesca
están declarados en §7.7 y sin construir, y cada uno exige promover el ganado a
estado, subir el esquema y volver a correr el banco.

### 2.86 — «Red primero» pasaba por una caché que no habíamos contado

Reportado jugando: cerrar y abrir la aplicación instalada no traía la versión
nueva. Es exactamente lo que §13.4 decía que no podía pasar, y la sección
estaba equivocada.

**La causa, medida.** GitHub Pages sirve el documento con
`Cache-Control: max-age=600`. El service worker hacía `fetch(request)` a secas,
y esa petición **pasa por la caché HTTP del navegador**, que está por debajo
del trabajador: durante diez minutos contesta ella y la red no se toca. La
política no era «red primero» sino «caché del navegador primero, y la del
trabajador después». Un dispositivo que abre la aplicación cada pocos minutos
—justo lo que hace quien la está probando— puede no ver nunca una versión
nueva.

**Por qué la prueba de la v2.82 no lo vio.** Servía el build con
`vite preview`, que no manda cabeceras de caché. La prueba comprobaba la
política del trabajador sobre un servidor que no se parecía al de producción en
lo único que importaba aquí. Es el fallo clásico: verde en un entorno que no
reproduce la condición que rompe.

**La corrección.** El documento se pide con `cache: 'reload'`, que salta la
caché HTTP. Se construye un `Request` nuevo a partir del URL porque una
petición de navegación no se puede reconstruir con un init —`fetch(request, {
cache })` lanza justo en las peticiones para las que existe esta rama—. Sin red
sigue cayendo al respaldo de siempre.

**Evidencia.** `tools/pwa/stale-server.mjs` sirve el mismo `dist/` con
`max-age=600` y sabe «desplegar» otra versión bajo el mismo URL. El recorrido
carga, deja que el trabajador tome el control, despliega, vuelve a abrir y
exige la versión nueva; falla antes del arreglo y pasa después, y comprueba
además que tras actualizarse sigue abriendo sin red. Suite rápida **640 en
17,1 s**, PWA **6/6**, Playwright **10/10**, tipos, lint y build pasan.

**Qué lo falsaría:** que una versión nueva no alcance a un cliente que ya
visitó, con las cabeceras de Pages puestas; que el documento deje de venir de
la red habiéndola; o que saltar la caché HTTP rompa la apertura sin conexión.

**Deuda anotada y no pagada:** el nombre de la caché no cambia entre
despliegues, así que los paquetes viejos se quedan dentro. No afecta a la
corrección y purgarlos junto a una actualización tiene el riesgo de borrar el
recurso viejo antes de haber guardado el nuevo; se hará cuando haya motivo
medido, no antes.

### 2.85 — Una velocidad más, para poder preguntar por el ritmo

§16.2 lleva escrito desde hace tiempo que la estación de tres minutos y la
generación de cuatro horas son «una hipótesis razonada, no un dato», y que
ajustarlas es mover `REAL_MS_PER_TICK` y nada más. Pero para poder juzgar el
ritmo hay que poder recorrerlo, y a 16× un año son cuarenta y cinco segundos:
ver un siglo cuesta hora y cuarto de pantalla encendida. **A 64× un año son
once segundos.** La progresión sigue siendo geométrica —1, 4, 16, 64— y los
cinco botones caben a 390 px sin bajar del objetivo táctil de 44 px de §11.4.

Esto **no responde** a la pregunta de §16.2 ni la da por cerrada: solo hace que
se pueda formular con una partida delante en vez de con una estimación.

De paso se corrige una duplicación que llevaba desde M-20: la fila de botones
estaba escrita a mano como `[0, 1, 4, 16]` en `app.ts` y repetida en su prueba,
de modo que §12.1 no era la única lista. Ahora las tres salen de `TIME.SPEEDS`,
que es lo que CLAUDE.md exige de cualquier número del juego.

**Evidencia.** Suite rápida **640 en 16,9 s** y Playwright **10/10**; el
recorrido de M-20 comprueba los cinco botones y sus 44 px. Los localizadores de
velocidad pasan a ser exactos: `4×` es subcadena de `64×` y el recorrido se
volvió ambiguo en cuanto apareció el nuevo — encontrado por la prueba, no
leyendo.

**Lo falsaría** que un botón bajase del objetivo táctil, que la fila se saliese
a 390 px, o que alguna velocidad dejase de corresponder con `TIME.SPEEDS`.

### 2.84 — El valle no contaba nada, y el reloj se paraba

La primera partida humana real duró treinta y cinco minutos y terminó con
*«no sé ni qué está pasando»* y *«no me pidas que me entren ganas de volver»*.
Es la evidencia que el proyecto llevaba dieciséis módulos esperando, y la
lectura importante no es el veredicto sino en qué se equivocaba el diagnóstico
de todos —el mío incluido—.

**Lo primero que había que descartar: que faltase contenido.** No falta. La
crónica de esa misma sesión registra, en los veinte años que el jugador estuvo
mirando, la fragua encendida, un asalto al granero repelido, una muerte a manos
de otro, un incendio, una sucesión y dos encrucijadas decididas. Unos quince
sucesos notables en veinte años: **uno por minuto de pantalla**. La densidad no
era el problema. Ninguno de esos sucesos tenía un solo píxel en el valle.

**§11.1 explica por qué, y lleva explicándolo desde que se escribió.** Sus siete
filas —gente, grano, hambre, ánimo, fe, peste, estación— son **todas estados**.
Ninguna es un suceso. La especificación nunca le pidió al valle que dijera que
algo acababa de pasar, así que el render hacía exactamente lo pedido, y lo
pedido era una pantalla donde nada ocurre. **§11.6, nueva:** lo que la crónica
imprimiría en negrita aparece sobre el valle, con su propia frase del banco,
unos segundos y con corte seco. Sin cifras (§11.1 las prohíbe) y sin vocabulario
nuevo de sprites: qué dibujo merece una muerte o un asalto es del trabajo de
arte, y este cambio no lo hipoteca.

**El segundo hallazgo salió de las marcas de hora de las capturas.** A 16× un
año son 45 s. Entre las 11:57 y las 12:10 pasaron trece minutos y diecisiete
años: correcto. Entre las 12:11 y las 12:25 pasaron catorce minutos y **siete**
años, cuando tocaban dieciocho. Faltaban once años. La causa: `loop.ts` descarta
el tiempo transcurrido al ocultarse la pestaña, `app.ts` solo guardaba, y
`runLethargy` se llamaba **en un único sitio, dentro de `boot`**. Es decir: el
letargo solo funcionaba si el sistema mataba la página. Un móvil que bloquea la
pantalla la mantiene viva, y entonces §13.2 —«la aldea sigue sin ti»— era
sencillamente falso. No era una decisión de diseño: la propia spec decía que el
letargo lo resolvía, y en esa ruta el letargo no se ejecutaba nunca.

Ahora el letargo tiene dos puertas y comparten camino: arrancar con un guardado
viejo, y volver de segundo plano. En pausa no se debe nada, y el parte de
bienvenida pide al menos una estación de ausencia para no aparecer por cada
ojeada a otra aplicación.

**Evidencia.** El fallo del reloj se reprodujo primero: un recorrido oculta la
pestaña, adelanta treinta minutos de reloj falso y la devuelve, exigiendo los
120 ticks debidos; fallaba antes del arreglo y pasa después. `resumeAfterHidden`
fija las tres reglas sin DOM. Para §11.6, `noticeworthy` fija el filtro de §9.2
y comprueba sobre una partida real de diez años que el valle habla algunas
veces y no en cada tick (menos del 25 %); un recorrido espera a que la aldea
tenga algo que contar, lee la frase, comprueba que no queda ninguna clave sin
resolver y que el aviso se retira solo. Suite rápida **640 en 17,42 s**;
Playwright **10/10 en 41,9 s**; tipos, lint y build pasan.

**Qué lo falsaría:** que volver de segundo plano siga perdiendo tiempo o que lo
recupere estando en pausa; que el aviso hable en cada tick, se quede fijo, o
tape la encrucijada; o que una segunda sesión humana con esto puesto vuelva a
decir «no sé qué está pasando» — en cuyo caso el problema no era la presencia y
habrá que buscar en otro sitio.

**Lo que este cierre NO concede.** El hito 6 sigue sin aceptar (§16.3) y el hito
0 sigue sin lector externo. Esto retira dos obstáculos concretos y medidos; la
siguiente sesión humana es la que dirá si eran los que importaban.

### 2.83 — La ruta que solo falla desplegada

§13.4 dice que el mismo `dist/` sirve desde la raíz de un dominio y desde el
subdirectorio de Pages sin reconstruirse. Estaba escrito y no estaba probado:
`vite preview` solo sirve la raíz, así que la mitad que de verdad usa el
despliegue —`/project/`— no la recorría nadie. Una sola ruta absoluta en un
recurso, en el manifest o en el ámbito del trabajador rompe **solo ahí**, solo
una vez publicado, y en ninguna ejecución local.

`tools/pwa/subpath-server.mjs` monta `dist/` bajo `/project/` y el recorrido
comprueba las tres cosas: que la aldea arranca, que el ámbito del trabajador es
ese prefijo y no la raíz —uno con `scope: '/'` se apropiaría de todo lo demás
publicado en el dominio— y que **toda** entrada que guarda en caché cuelga de
él. Después, sin red, vuelve a abrir. Devolver 404 hasta que existe `dist/` es
además lo que hace esperar a Playwright sin ordenar los dos servidores a mano.

**Evidencia.** Cinco recorridos de PWA en 12,4 s, con el nuevo dentro; tipos y
lint pasan. Medido antes de publicar nada: el ámbito sale
`http://127.0.0.1:4180/project/` y las cinco entradas de la caché empiezan por
`/project/`.

**Lo falsaría** que la aldea no arrancase bajo un prefijo, que el trabajador
reclamase la raíz o que una sola entrada guardada se saliera del subdirectorio.

### 2.82 — Instalable, y sin red desde la segunda vez

`CLAUDE.md` describe el proyecto como PWA desde M-00. `docs/design.md` no
mencionaba ni el manifest, ni el trabajo sin conexión, ni la instalación: era un
hueco de especificación en una promesa central del producto, y el hito 6 lo
convirtió en urgente. Una partida de varios días en un móvil real atraviesa
túneles y Wi-Fi que se caen, y **un juego que promete sobrevivir a que lo cierres
y responde con una página en blanco no está midiendo su ritmo: está midiendo la
cobertura.**

§13.4 queda escrita primero y el código detrás. Manifest con `standalone`,
vertical y tres iconos —192, 512 y uno `maskable`— generados renderizando la
paleta de verano de §10.3 en Chromium, como M-19 ya produce todo lo demás: el
icono es el valle o no es nada. Service worker con las dos políticas que §13.4
vuelve normativas: **documento por red primero** —o un despliegue nuevo no
alcanzaría jamás a un dispositivo ya instalado— y **todo lo demás por caché**,
que es seguro porque Vite marca cada recurso con su hash. `base: './'` para que
el mismo `dist/` sirva desde la raíz de un dominio y desde el subdirectorio de
Pages sin reconstruirse.

**La frontera medida, que no es la que yo quería escribir.** La promesa natural
era «tras la primera visita». No se sostiene. El trabajador precachea en su
instalación todo lo que `index.html` referencia —leído del propio documento, no
de un manifest generado que haya que mantener en paso— y tras una sola visita
está todo guardado: se comprobó entrada por entrada. Aun así, en esa primera
vuelta el paquete **no carga como módulo**: `ERR_FAILED` sobre una entrada que
la caché tiene y que el mismo trabajador entrega con un `fetch` normal, tipo
`basic`, estado 200. Se descartaron por medición tres explicaciones: que faltara
el recurso —estaba—, que la navegación no pasara por el trabajador
—`workerStart > 0` en las dos— y que el modo de la petición al guardarla no
coincidiera con el del parser —guardarla en modo `cors` con credenciales
omitidas no cambió nada—. Desde la segunda apertura funciona siempre.

Queda escrito como limitación conocida y no como promesa cumplida. Para el hito
6 basta —una partida de varios días abre decenas de veces— pero quien lo
retome merece saber dónde se quedó esto y qué se descartó ya.

**Evidencia.** Cuatro recorridos nuevos contra el build real servido por
`vite preview`, porque el trabajador no existe en el servidor de desarrollo:
el manifest declara lo que §13.4 exige y sus tres iconos existen de verdad; la
aldea abre en modo avión y la captura lo enseña; la partida de §13.1 sobrevive a
quedarse sin red —el trabajador no toca IndexedDB—; y con red el documento viene
de la red, comprobado interceptando en el contexto y no en la página, porque
`page.route` no ve lo que pide un trabajador. Suite rápida **634 en 18,87 s**;
tipos, lint y build pasan; Playwright **8/8** de siempre más **4/4** de PWA. El
despliegue a Pages se añade a los workflows y la suite PWA entra en CI.

**Qué falsaría este cierre:** que la aldea no abra sin red a partir de la segunda
apertura; que un despliegue nuevo no llegue a un dispositivo ya instalado; que el
trabajador conteste a algo que no sea `GET` del mismo origen; o que instalarla
pierda la partida. Nada de esto concede el hito 6: sigue exigiendo la partida
real de varios días de §15, y esto solo retira un obstáculo que la habría
medido mal.

### 2.81 — Una referencia que resuelve puede seguir nombrando lo que no existe

v2.73 cerró las referencias huérfanas: plantilla, opción, `id` de semilla y
letras del reparto tienen que resolver en el catálogo estable. La condición
diferida que viaja con esa semilla quedó fuera. `condition` comprobaba la forma
—`k` conocida, `op` en dominio, `v` finito— pero para los tres campos que §8.2
cierra por enumeración se conformaba con el tipo: `stat` y `ratio`, cualquier
cadena; `minWeek`, cualquier entero no negativo.

**Reproducido antes de tocar nada.** Una semilla con plantilla, opción, `id` y
reparto correctos y `condition: { k: 'stat', stat: 'missing', op: '>', v: 0 }`
atraviesa `deserialize`. Lo mismo `{ k: 'ratio', ratio: 'missing' }` y
`{ k: 'season', season: 'winter', minWeek: 12 }` o `999`. También anidadas bajo
`not` y `any`. Once formas imposibles medidas, once aceptadas. El daño no es un
fallo visible: `evaluate` compara `state.village['missing']` —`undefined`—
contra un número, la comparación responde que no, y la consecuencia prometida
por §8.5 no vence nunca sin que nada lo diga. Es exactamente lo que v2.73 decía
haber cerrado.

**La corrección se queda en los dominios cerrados.** `stat` pasa a exigir
`people`, `grain`, `wood`, `morale` o `faith`; `ratio`, los cuatro nombres que
`ratioOf` sabe calcular; `minWeek`, `0 .. WEEKS_PER_SEASON − 1`, derivado de la
constante y no escrito a mano, porque es la semana **dentro** de la estación y
`weekOf % 12` nunca llega a doce. `op`, `role`, `trait`, `building`, `season` y
las causas de muerte ya estaban cerrados y se dejan como están. `flag` y
`grudge.min` **no** se tocan: una bandera es un nombre libre y un umbral de
rencor fuera de rango sigue siendo interpretable —siempre cierto o siempre
falso—, no ilegible. Ampliarlos sería inventar dominio, no protegerlo.

**Evidencia.** La regresión planta cada condición como semilla real y recorre la
frontera completa: quince formas legítimas aceptadas —los cinco nombres de
`stat`, los cuatro de `ratio`, `minWeek` 0 y 11— y siete imposibles rechazadas,
dos de ellas anidadas. Y un control que no depende de la lista: **las 65
condiciones que el catálogo escribe hoy**, que cubren las doce variantes del
DSL, siguen entrando una por una. Ese control es el que impide apretar de más;
el catálogo usa `minWeek: 11` y no usa `stat: 'grain'`, así que ni el borde
superior ni un dominio recortado a «lo que se usa» pasarían inadvertidos. Tres
mutaciones deliberadas lo confirman: quitar `people` de la lista, bajar el techo
a `< 11` y volver a `typeof string` fallan la prueba, cada una por su motivo.
Suite rápida: **634 pruebas en 18,39 s**; tipos, lint y build pasan. No se
ejecuta Playwright: el cambio no alcanza la interfaz ni mueve un píxel.

**Qué habría falsado este cierre:** que una condición escrita por el catálogo
—cualquiera de las 65— dejase de cargar, que un guardado real de v2.80 fuese
rechazado, o que alguna de las once formas imposibles siguiera entrando. Nada
de esto toca los dos criterios humanos: el hito 0 sigue esperando a un lector
ajeno y el hito 6, la partida de varios días de §15.

### 2.80 — Guardar a mitad de una ausencia no la termina

El guardado de v2.70 cubría `visibilitychange` y `pagehide`, pero durante el
letargo esos dos eventos fotografiaban un estado que solo había recorrido parte
de sus lotes y lo fechaban como actual. Si la pestaña desaparecía tras 64 de 960
ticks, la siguiente carga veía cero deuda en vez de los 896 ticks restantes. Si
el proceso sí llegaba a la bienvenida, tampoco persistía ese final de inmediato:
cerrar sobre el parte podía recuperar la instantánea anterior.

M-23.5 fecha un punto intermedio como
`now − (total − done) × REAL_MS_PER_TICK`. La instantánea y su reloj avanzan
juntos, incluso cuando una ausencia mayor ya alcanzó el tope de cuatro horas.
Antes del primer lote se conserva la fecha original. Al completar todos los
ticks o terminar la aldea, la fecha pasa a ser la actual y se solicita un
guardado antes de abrir la bienvenida o continuar el bucle.

**Qué falsaría este cierre:** interrumpir tras 64 de 960 y que la siguiente
carga deba algo distinto de 896 ticks; llegar al parte y encontrar en IndexedDB
el tick previo al letargo o una fecha anterior al regreso. La prueba pura fija
la primera cuenta y Playwright comprueba la segunda sobre la ruta real. Suite
rápida: **633 pruebas en 17,39 s**; build y lint pasan; Playwright, **8/8 en
29,7 s**. No cambia ningún píxel.

### 2.79 — El cegado es un contrato comprobable

El generador de v2.53 producía el paquete correcto, pero la afirmación de que la
inspección de metadatos «pasa» no tenía una prueba que pudiera fallar. M-10.1
separa `buildReaderPacket`, que devuelve el contenido exacto sin tocar el sistema
de ficheros, de `tools/reports/reader-packet.ts`, que solo crea el directorio y escribe ese
resultado. Así la entrega real y la prueba recorren la misma fuente.

La regresión exige exactamente tres crónicas A/B/C distintas y
`reader-question.txt`; comprueba que las historias empiezan por un año, contienen
más de cincuenta líneas y no exponen semilla, política ni población final. La
pregunta se compara completa para impedir que una futura ayuda insinúe al lector
qué diferencias debe buscar. El comando conserva las 145, 169 y 188 líneas de
v2.53. Suite rápida: **631 pruebas en 17,45 s**; tipos, lint, build y generación
real pasan.

**Qué falsaría este cierre técnico:** un quinto fichero, dos crónicas iguales,
una etiqueta de ejecución, una pregunta distinta o superar el presupuesto de
veinte segundos de la suite rápida. Nada de esto concede el hito: la respuesta
libre de una persona ajena sigue siendo la única evidencia de §9.5 y continúa
pendiente.

### 2.78 — La interfaz también habla desde el banco

§2.2 exige que todo texto visto por el jugador salga de plantillas. M-25 y M-26
crearon `UI_BANK` para el epitafio y el selector, pero el resto conservaba prosa
en línea: «While you were gone», año, controles, marcador de encrucijada y cada
frase de las fichas. Las fichas filtraban además identificadores internos como
`hot_tempered` y `was_passed_over`; una celda `cleared` aparecía como la reserva
genérica «land» porque su lista tenía solo cinco de los seis terrenos.

M-09.1 lleva al banco el armazón, la bienvenida y la inspección. Los valores
dinámicos siguen siendo parámetros: año romano, cifras, nombres, capacidad,
opiniones, rasgos y recuerdos. Edificios, terrenos, rasgos y memorias tienen una
clave estable por identificador; `cleared` se presenta como «clearing». No
cambia ningún estado, tick, señal ni texto narrativo de `BANK`.

**Evidencia.** Dos pruebas nuevas exigen cobertura para las claves fijas y todos
los identificadores dinámicos, y componen una ficha con rasgo y memoria de
varias palabras sin dejar `[]` ni guiones bajos. La red pasa **630 pruebas en
16,84 s**, build y lint; Playwright pasa **8/8 en 29,6 s**. Se miraron
`app-shell.png`, `m21-panel.png` y `m23-welcome.png` a 390 × 844: no hay cortes,
cambios de jerarquía ni claves visibles.

**Lo falsaría** cualquier prosa inglesa construida dentro de `src/ui`, una clave
dinámica sin entrada, un parámetro sin sustituir, que traducir `UI_BANK` exigiese
tocar el motor o una captura donde el traslado alterase la composición.

### 2.77 — Una red declarada tiene que ejecutarse sola

§14.2 llevaba desde v2.16 diciendo que el banco se ejecutaba «en CI nocturna»,
pero no existía `.github/workflows/`. La red solo corría cuando un agente se
acordaba. Eso dejaba sin vigilancia tanto los umbrales de balance como los
recorridos móviles que §14.3 exige desde el primer píxel.

M-00.1 añade dos workflows con Node 22 y `npm ci`. `CI` corre en cada push a
`main` y pull request: tipos, 628 pruebas rápidas, build y lint en un trabajo;
Playwright con Chromium en otro, para aislar instalación y diagnóstico. Sus
capturas se conservan siete días incluso ante fallo. `Nightly balance` corre a
las **03:00 UTC**, también se puede lanzar a mano, tiene veinte minutos de tope
y conserva CSV y resumen durante catorce días. El banco no entra en cada cambio:
su última medida consume 638,4 s y §14.2 lo separa de forma expresa.

**Evidencia local.** Los mismos comandos pasan en v2.73 y v2.75; los workflows
solo los orquestan sobre un checkout limpio. La sintaxis usa acciones oficiales
de checkout, Node y artefactos. La primera ejecución remota será la prueba del
entorno GitHub, que no se confunde con esta revisión local.

**Lo falsaría** que un push a `main` no iniciase ambas redes ordinarias, que el
banco se ejecutase en cada commit, que el horario no iniciase el banco, que un
fallo no dejase diagnóstico o que la duración medida agotase sus topes.

### 2.76 — La primera página también forma parte del estado

`README.md` aún cerraba con «Estado: andamiaje» y señalaba el hito 0 como el
siguiente desarrollo. Era cierto en M-00 y falso después de M-26. Un nuevo
colaborador que siguiera la portada recibía una dirección incompatible con la
fuente de verdad aunque `CLAUDE.md` apuntase correctamente a ella.

La portada resume ahora el producto implementado, enlaza diseño, traspaso e
instrucciones, da los comandos de arranque y la red ordinaria de validación, y
explica el alcance de IndexedDB y la geometría móvil. También expone
`npm run reader:packet`, que ya existía pero solo se encontraba dentro de esta
spec. El estado distingue los hitos 1…5 aceptados de las dos pruebas humanas
pendientes: lector externo para el 0 y partida real de varios días para el 6.

**Evidencia.** Cada comando citado existe en `package.json`; los cuatro de la
red son los mismos que pasan en v2.73/v2.75. Los enlaces apuntan a ficheros
versionados. No se cambia código ejecutable ni se adjudica una aceptación.

**Lo falsaría** un comando inexistente, un enlace roto, que la portada anunciase
un hito distinto de §15 o que describiese como automática cualquiera de las dos
deudas humanas.

### 2.75 — La pantalla que estaba detrás

El botón «Read the chronicle» del epitafio sí llamaba a `openChronicle`, y la
prueba encontraba `.chronicle-scrim` visible. Sin embargo, la crónica tenía la
misma capa que la encrucijada (`z-index: 10`) y el epitafio estaba en la 12: el
jugador seguía viendo y tocando la tarjeta de muerte. El aserto probaba estilo,
no acceso.

La crónica ocupa la capa 13. Es la pantalla de lectura que pueden invocar tanto
el valle como el epitafio; cuando nace desde este último debe cubrirlo por
completo y, al deslizarla hacia abajo, devolver el mismo epitafio para que el
jugador aún pueda fundar la sucesora. No se añade una sexta pantalla ni se
desmonta el final.

**Evidencia.** Playwright abre un epitafio real, pulsa su acción y pregunta a
`elementFromPoint` qué pantalla recibe el centro táctil. La respuesta debe ser
la crónica; luego la cierra por gesto y continúa con «Begin again». La captura
`m25-epitaph-chronicle.png` fue mirada a 390 × 844: no asoma el epitafio y el
texto conserva su lectura. Build y lint pasan; Playwright queda **8/8 en
29,7 s**.

**Lo falsaría** que el centro siguiera perteneciendo al epitafio, que alguna
parte de este asomase o recibiese toques, que cerrar la crónica cerrase también
el final, o que «Begin again» dejase de estar disponible al volver.

### 2.74 — Los hitos que la tabla olvidó cerrar

El criterio del hito 1 es ver la aldea y distinguir sus estaciones sin
intervención del jugador. M-19 produjo primero el instrumento; M-16 y M-17
pasaron después la hoja de contacto móvil y gris, mirada en v2.55; M-18 pasó en
v2.57 su veredicto propio de veinte segundos: salida, trabajo, regreso, noche y
nuevo ciclo. Los cuatro módulos figuran cerrados en sus briefs, pero la tabla de
§15 seguía sin registrar el resultado. Allí faltaban también dos cierres ya
explícitos: M-22 alcanzó el hito 2 en v2.61 al mostrar una decisión y enfocar su
cambio, y M-25 alcanzó el hito 4 en v2.68 al cerrar una aldea y hacer visible su
huella en la sucesora.

**Hitos 1, 2 y 4, alcanzados.** Esta revisión corrige el índice de estado. No
vuelve a generar imágenes ni sustituye los juicios ya registrados por asertos:
las evidencias que aceptan cada hito permanecen en v2.55/v2.57, v2.61 y v2.68.

**Lo falsaría** una hoja donde las estaciones no se distinguieran, edificios
principales indistinguibles a 390 px, figuras ilegibles en movimiento, una
opción sin cambio visible o una sucesora sin la huella de la aldea terminada.
Cualquiera reabriría su hito; ninguna condición aparece en el estado documentado
y fusionado.

### 2.73 — Una referencia válida tiene que resolver

La validación estructural de v2.72 todavía aceptaba una encrucijada con todos
sus campos y un `templateId` inexistente. `openCrossroad` no encontraba la
plantilla y regresaba sin mostrar nada; la partida conservaba una pregunta que
ninguna opción podía resolver. Una lista de opciones vacía producía el mismo
bloqueo. Las decisiones de replay y las semillas diferidas admitían referencias
igual de huérfanas: las primeras divergían en silencio y las segundas vencían
sin aplicar la consecuencia prometida.

`deserialize` contrasta ahora esas tres formas con `CATALOG`. Una encrucijada
requiere plantilla, al menos una opción existente sin duplicados y todas las
letras de su reparto. Cada decisión requiere una opción de su plantilla y el
mismo reparto mínimo. Cada semilla requiere que su plantilla, opción y `id`
resuelvan hasta un `SeedSpec` vigente. Los identificadores del catálogo son
estables para siempre según §2.2; por tanto esto distingue corrupción de datos
históricos válidos, no crea una política nueva de migración.

**Evidencia.** La regresión añade una plantilla inexistente, una pregunta sin
opciones, una decisión con opción desconocida y una semilla huérfana. Las cuatro
formas se rechazan junto a las seis de v2.72; una instantánea real, el replay y
la migración 1→2 siguen siendo los controles positivos. La red completa pasa
**628 pruebas rápidas en 16,90 s**, build y lint; Playwright pasa **8/8 en
29,7 s**, incluidas sus dos reaperturas reales desde IndexedDB.

**Lo falsaría** que una referencia aceptada no encontrase contenido al abrirse,
resolverse o vencer; que una encrucijada cargada no ofreciese ninguna acción; o
que un guardado emitido por esta versión dejase de pasar la frontera.

### 2.72 — Rechazar antes de arrancar

El contrato de M-23 decía que un guardado corrupto se rechaza sin romper la
aplicación, pero `isPlausibleState` solo preguntaba si `map`, `people`, `rng` y
`village` eran objetos. `{ map: {} }` pasaba `deserialize`; el `catch` de
`loadSave` terminaba y el fallo ocurría después en el render. M-26 extendía el
mismo riesgo al archivo: una huella o entrada malformada llegaba al selector.

La frontera valida ahora **estructura consumible**, no solo contenedores:
semillas y flujos `uint32`; mapa 36 × 56 con las seis capas tipadas y 2.016
celdas; códigos de terreno, camino y ruina dentro de dominio; estadísticas
finitas; aldeanos, memoria, opiniones y rencores con sus campos; edificios y
obras con clase y geometría válida; encrucijada, semillas diferidas, banderas,
crónica, decisiones, clima, peste, modificador de cosecha y final. Cada
`ArchivedGame` pasa además la misma forma de crónica y una máscara de ruinas
completa. La validación semántica semanal sigue en §14.1: esta frontera impide
que el motor o el render reciban una forma que no pueden recorrer.

No cambia el esquema 2. Un dato válido se carga igual; uno inválido hace que
`loadSave` devuelva `null` y la aplicación funde una partida limpia, tal como ya
prometía §13.1.

**Evidencia.** La prueba que antes solo usaba basura exterior añade seis valores
que parecían guardados: mapa vacío, capa corta, edificio desconocido,
encrucijada parcial, ruina archivada corta y crónica sin parámetros. Los seis se
rechazan; la instantánea real de 300 ticks, el replay y la migración 1→2 siguen
aceptados. La red completa pasa **628 pruebas rápidas en 17,22 s** y **8/8**
recorridos Playwright en 29,9 s; estos últimos incluyen dos cargas reales desde
IndexedDB después de la nueva frontera.

**Lo falsaría** que cualquier forma rechazada alcanzase `boot`, que un guardado
producido por `serialize` dejase de cargar, que la migración 1→2 perdiese datos o
que el validador intentase sustituir los invariantes por tick del motor.

### 2.71 — Guardar una historia obliga a devolverla

Desde M-25 el archivo era acumulativo, pero después de «Begin again» no había
ningún camino de interfaz hacia él. Conservar bytes que el jugador no puede
volver a leer no es memoria del valle. M-26 añade el acceso dentro de la propia
pantalla de crónica: sigue habiendo cinco pantallas, no nace una sexta.

Cuando existe al menos una antepasada aparece el selector **«Valley
chronicle»**. La primera opción es **«This valley»** y las anteriores se ordenan
de más reciente a más antigua como **«Earlier valley N — X years, peak Y»**;
`N` conserva el orden de archivo. Mientras se lee desde el epitafio, su copia
recién archivada se excluye del selector porque «This valley» ya es esa misma
crónica. Tras fundar de nuevo aparece como antepasada.

`ArchivedGame` no gana otro campo ni fuerza un esquema 3. Las variantes del
banco dependen de `rng.chronicle`, y §9.1 garantiza que ese flujo nunca avanza;
`makeBundle(game.seed)` recupera exactamente el valor original. El compositor
se abre en dos: `renderChronicleYear(entries, rng, year)` sirve tanto al archivo
como a `renderYear(state, year)`, que conserva su contrato público.

**Evidencia.** La prueba rápida confirma que dos entradas archivadas recuperan
la misma voz que el estado original. Playwright termina una aldea de 80 años,
funda la siguiente, abre la crónica con gesto, encuentra dos fuentes, selecciona
la anterior y obtiene una historia distinta. La captura a 390 × 844 se miró:
etiqueta, resumen y flecha caben en una línea; el encabezado fijo no tapa el
primer año y el texto mantiene el ancho anterior. La red completa pasa
**627 pruebas rápidas en 16,84 s** y **8/8** recorridos Playwright en 29,7 s.

**Lo falsaría** necesitar una sexta pantalla, reescribir una línea al archivarla,
mostrar dos veces la aldea del epitafio, ordenar las antepasadas al revés,
truncar el resumen a 390 px o perder el cierre por gesto de la crónica.

### 2.70 — Los dos bordes que una partida larga sí tocará

La auditoría del hito 6 encontró dos riesgos que las cuatro horas simuladas no
ejercitaban. `visibilitychange` pedía guardado, pero `pagehide` se limitaba a
detener el bucle. Un cierre antes del primer autoguardado de veinte ticks podía
perder toda la sesión si el navegador no entregaba antes el cambio de
visibilidad. `pagehide` solicita ahora la instantánea y después detiene el bucle;
el oyente se instala una sola vez, aunque «Begin again» cree otros bucles.

La identidad con la que M-25 evita archivar dos veces es `(seed, endedTick)`.
La semilla sucesora excluía solo la partida recién terminada: una colisión con
cualquier antepasada y el mismo tick habría recuperado la crónica equivocada.
Una extracción aleatoria que ya está en el archivo avanza, módulo `2³²`, hasta
la primera semilla libre. La sucesora excluye **todas** las semillas archivadas;
desde v2.70 ninguna identidad nueva puede colisionar con una anterior.

**Evidencia.** La prueba pura cubre una cadena ocupada y el borde
`0xffffffff → 0`. Playwright deja avanzar menos de veinte ticks, dispara
`pagehide`, comprueba que IndexedDB contiene ese estado y solo entonces salta
cuatro horas y recarga; el parte de bienvenida sigue apareciendo. Build, lint y
la suite completa pasan: **626 pruebas rápidas en 16,85 s** y **8/8** recorridos
Playwright en 29,5 s.

**Lo falsaría** perder los primeros diecinueve ticks al cerrar una pestaña,
instalar un oyente nuevo por cada aldea, reutilizar cualquier `seed` del archivo
o recuperar la crónica de una antepasada al terminar la sucesora.

### 2.69 — Un test de reloj no juega durante varios días

La tabla de hitos seguía llamando «esbozados» a sistemas ya recorribles y, a la
vez, M-23 proclamaba el hito 6 superado con una prueba que no satisface su
criterio. Esta revisión separa **módulo implementado** de **hito aceptado**.

**Hito 3, alcanzado.** El contrato no exige una nueva interfaz: pide que la gente
envejezca, muera, herede roles y que el valle conserve memoria. La suite ya fija
edad derivada, nacimientos con padres, muerte, promoción, opiniones, recuerdos,
rencores y sucesión. Como lectura longitudinal se corrieron diez semillas
`prudent` durante cien años: una terminó por abandono en el año 20 y nueve
llegaron al 100; juntas produjeron **2.351 descendientes**, **203 personajes
nombrados nacidos después de la fundación** y **60 decisiones de sucesión**.
Hubo dos rencores y uno llegó a sanar sin borrarse. No son piezas aisladas: el
bucle largo las enlaza durante varias generaciones.

**Hito 5, alcanzado.** M-20 aporta el reloj real y sus velocidades; M-23
calcula la ausencia, ejecuta hasta 960 ticks en lotes de 64 y presenta el parte;
v2.64 corrigió su selección y opacidad tras leerlo. La suite prueba el límite y
Playwright recorre cuatro horas con reloj falso. La sensación de tres minutos
por estación sigue siendo una hipótesis de balance para una partida larga, pero
no falta ninguna pieza del criterio «tiempo real, letargo, parte».

**Hito 6, pendiente de aceptación humana.** M-23 está implementado y Playwright
demuestra que IndexedDB sobrevive a cerrar, adelantar cuatro horas y volver.
M-24 prueba además la migración aditiva de esquema 1 a 2. Pero §15 exige la
«primera partida real de varios días». Ningún reloj falso observa hábitos de
guardado, cierres reales del navegador ni el deseo de volver. El hito no se
declara alcanzado hasta que ocurra esa partida; es una deuda humana del mismo
tipo que el lector externo del hito 0, aunque el software necesario ya exista.

**Lo falsaría** encontrar una semilla longeva sin descendientes, promociones ni
sucesiones; que un salto de cuatro horas resolviera una decisión pendiente,
animara entre ticks o omitiera el parte; o llamar aceptado al hito 6 sin una
sesión real que atraviese varios días.

### 2.68 — El valle termina antes de volver a empezar

M-24 podía construir una sucesora, pero no decía cuándo hacerlo ni qué debía
comprender el jugador. La transición queda cerrada así: al aparecer
`state.ended`, el reloj se detiene, se retira cualquier encrucijada pendiente y
se archiva la partida una sola vez. Un epitafio muestra la causa concreta, los
años vividos y el máximo de habitantes. Desde él se puede leer la crónica
completa o pulsar **«Begin again»**. Solo ese gesto funda la siguiente aldea;
usa una semilla humana nueva sobre el mismo `terrainSeed` y conserva las ruinas.
El archivo es acumulativo y no se poda: todavía no hay evidencia de presión de
almacenamiento que justifique borrar memoria del jugador.

La primera captura reveló un incumplimiento que ningún test de estado veía:
`map.ruins` formaba parte de la caché y de la herencia, pero el render solo
dibujaba edificios perdidos de la partida actual. Pintar un sprite triangular
por cada celda volvió el antiguo poblado una trama ruidosa y **falsó esa primera
solución al mirarla**. La regla aceptada es una cimentación conectada: cada celda
de la máscara se rellena con `palette.rock` a alfa **0,58**, y solo sus bordes
cardinales expuestos reciben `outline(palette.wood)` con ancho
`max(1 px, cell · 0,10)`. Los escombros de un edificio perdido en la partida
actual conservan el sprite individual de §10.5.

El flujo descubrió además una carrera de persistencia. Terminar encolaba un
guardado muerto y fundar encolaba el vivo, pero dos escrituras asíncronas podían
completarse al revés; una recarga resucitaría el epitafio. Cada petición captura
ahora su propia instantánea mediante clon estructurado y las escrituras en
IndexedDB se ejecutan en una cola estricta. La partida archivada precede siempre
a su sucesora.

**Evidencia.** Playwright recorre a 390 × 844 la muerte, el epitafio, la lectura
y cierre gestual de la crónica, la nueva fundación y una entrada posterior por
la ruta normal. Antes de recargar comprueba en IndexedDB `tick === 0`,
`ended === null` y exactamente una partida archivada. Las dos capturas se
miraron a tamaño real: el texto y los dos verbos caben; la cimentación gris se
reconoce detrás de cuatro casas y dos campos nuevos sin parecer un edificio
activo. La suite rápida completa pasa **625 pruebas en 17,05 s**; build y lint
también pasan, y Playwright completa sus **8/8** recorridos en 37,5 s.

**Lo falsaría** que la causa o los verbos no se entendieran sin desplazar a
390 px, que la huella pareciera una textura o dominara el valle, que comenzar
otra vez cambiase el terreno, que una recarga devolviese la partida terminada,
o que volver a presentar el mismo final duplicase su archivo.

### 2.67 — Lo que sobrevive no puede reconstruirse después

El contrato de §13.3 llevaba dos datos en los tipos y ninguno en el estado que
debía producirlos. `ArchivedGame.peakPeople` no se deduce de la población final:
los inmigrantes no guardan el tick de llegada. Y `seed` no era «semilla de
terreno»: alimentaba también nombres, nacimientos, clima y encrucijadas;
reutilizarla fundaba otra vez a las mismas personas.

`GameState` gana `terrainSeed` y `peakPeople`. El primero permanece al cambiar de
partida; el segundo toma el máximo de las poblaciones observadas al completar
cada tick, que son los estados que llegan a pantalla y guardado. El esquema de
guardado sube a 2. Los guardados de esquema 1 migran sin tirarse: `terrainSeed`
era necesariamente su `seed`, y el pico toma el mayor recuento de población que
su crónica llegó a escribir o la población cargada. Es el mejor dato observable;
la precisión anterior no existe y no se finge.

`archiveGame` solo acepta una aldea terminada y copia su crónica, las ruinas que
ya tenía y la huella de todos los edificios aún en pie. `foundSuccessor` recibe
una semilla maestra nueva, regenera el mapa con `terrainSeed` y siembra aquella
máscara después de colocar la fundación. Las ruinas siguen sin participar en la
colocación: pueden quedar bajo una casa nueva, pero no bloquean, pagan ni dan
recursos.

**Evidencia.** Cuatro pruebas nuevas cubren la migración 1→2, el pico observado,
el rechazo de una aldea viva y la copia aislada de crónica/huella, y una
sucesora con nombres y semilla nuevos cuyo terreno **regenerado** y ruinas
coinciden byte a byte con lo heredado. La ampliación del estado destapó además
que el `fingerprint` de determinismo omitía `forestStock`, `dwindlingSince`,
`noOneStreak` y `harvestModifier`; ya recorre esos bytes y campos.
La suite completa pasa **625 pruebas en 19,55 s**, a solo 0,45 s del presupuesto
de §14.1: pasa, pero el margen vuelve a ser materialmente estrecho.

**Lo falsaría** poder archivar una partida viva, perder una celda ocupada al
cerrarla, que una mutación posterior reescribiese la crónica archivada, que la
sucesora cambiase el terreno o repitiese la semilla humana, o que una ruina
impidiese colocar un edificio. La interfaz sigue fuera de esta afirmación.

### 2.66 — El lugar que la prosa daba por hecho

§11.5 decía que el vado era «donde el camino cruza el río». El mapa demuestra
que esa celda no puede existir: §7.6 y A* prohíben que caminos y rutas pisen
agua o marisma. La posición queda definida como **el acceso terrestre al vado**:
entre las celdas transitables contiguas al agua, la más cercana al centro del
núcleo; a igual distancia, el índice menor. Es derivada, determinista y no añade
estado ni una constante de balance. Las reuniones ocurren en tierra y la cámara
puede mostrar a la vez la gente y el río.

La tala tenía la información correcta dentro de `fellForest` y la descartaba al
devolver solo la madera. `fellForestWithLocation` ejecuta la misma operación y
devuelve `{ wood, firstCell }`; `fellForest` conserva su contrato numérico para
la producción semanal. Una decisión con varias peticiones enfoca la primera
celda que llegó a tocar de verdad. No se vuelve a buscar el bosque después de
modificarlo y no cambia ni el orden del tick ni la cantidad talada.

**Evidencia.** La prueba integrada de `forest_cut/fell_it` comprueba que la celda
señalada era bosque y acaba `cleared` y `BARREN_CLEARING`; la de
`leave_it_standing` comprueba que el punto es transitable, toca agua y que no hay
otra orilla candidata más cercana. La captura Playwright de M-22 decide ahora
`Fell it`: enfoca el borde talado real y fue revisada como imagen, además de
pasar las siete pruebas de navegador.

**Lo falsaría** que un efecto `felled_wood` señalase una celda que no hubiese
sido tocada por esa decisión, que un `ford` cayese en agua, marisma o una orilla
no mínima, o que la misma partida talase una cantidad distinta por conservar la
coordenada.

### 2.65 — Los pendientes tenían ya dueño

Los dos `it.todo` de M-11 se escribieron antes de que existieran M-21 y M-23.
Hoy duplicarlos dentro de `invariants.test.ts` habría probado otra vez la misma
implementación: gestos e inspección pura ya viven en `ui.test.ts`, la cola y el
enfoque en `app.test.ts` y Playwright, y el guardado recorre `serialize`, el clon
estructurado de IndexedDB y `deserialize` con una huella de todo `GameState` en
`save.test.ts`.

Se retiran los marcadores y la matriz de cobertura apunta a esas pruebas de
producción. `npm test` ejecuta **620 pruebas, cero pendientes, en 17,53 s**; los
nueve grupos de §14.1 están cubiertos y M-11 queda cerrado.

**Qué habría falsado el cierre:** un grupo sin prueba propietaria, una prueba de
guardado que comparase la misma referencia consigo misma, una suite por encima
de 20 s o cualquier `it.todo` restante. Ninguna condición ocurre.

### 2.64 — Cuatro plazas para contar una ausencia

El parte selecciona primero la entrada más reciente de cada `ChronicleKind`,
recorriendo la ausencia desde el final. Si hubo menos de cuatro tipos, admite
una segunda aparición reciente de cada uno, nunca una tercera; después ordena
lo elegido de antiguo a nuevo para leerlo. Así la recencia sigue decidiendo
entre sucesos equivalentes y una plaza vacía cuesta menos que un tercer eco.

El caso que destapó v2.63 queda convertido en prueba: tres cosechas consecutivas,
una llegada y una obra producen obra, llegada y las dos cosechas más recientes.
Si la ausencia solo produjo cosechas, se muestran las dos más recientes: la
regla no inventa diversidad para completar una cuota que §9.2 define como tope.

La bienvenida cubre ahora de forma opaca cualquier encrucijada pendiente que
deba reaparecer al cerrarla. La encrucijada conserva el valle atenuado que pide
§11.2, pero oculta los controles de velocidad mientras ocupa la pantalla; al
resolverla o reducirla a su marcador los restaura.

**Qué habría falsado este cierre:** perder la entrada más reciente de un tipo,
cambiar el orden narrativo, mostrar una tercera entrada del mismo tipo, o
dejar controles u otra pantalla legibles bajo un overlay. El caso sintético y
la reapertura Playwright comprueban esos cuatro bordes.

### 2.63 — La aldea sigue sin ti

**PARTE 0, hecha primero porque M-23 la necesitaba.** `douse` gana `who?:
string` (§8.4, §11.5): una letra del reparto, resuelta al edificio que esa
persona llama suyo (`Villager.homeId`). A.7 (`smith_feud`) es quien lo
prometía y no lo cumplía — sus dos opciones dousaban `kind:'smithy'` a secas,
así que apagaban el mismo taller sin mirar a quién servía. Ahora `side_with_a`
apaga la casa de B y `side_with_b` la de A, tal y como dice el Anexo. Sin
`who`, o si la persona no tiene casa en pie, cae donde caía antes: la única en
pie de esa clase, o el centro.

**M-23, el último módulo del hito 6.** `serialize`/`deserialize`/`catchUp`
viven en `src/engine/save.ts`, sin `Date` ni IndexedDB — eso es
`src/ui/idb.ts`, un fichero que el brief no nombraba y que hizo falta: ninguno
de los tres contratos abre una base de datos, y algo tenía que hacerlo.
`catchUp` corre los 960 ticks de un tirón (lo que su prueba cronometra); el
letargo de la interfaz (`ui/lethargy.ts`) es un bucle *distinto* sobre lotes de
64, no el mismo `catchUp` llamado en bucle — uno es atómico y el otro tiene
que ceder el hilo entre lotes, y forzar los dos por la misma forma le habría
costado la propiedad al que la necesita.

**El caso de prueba de §11.4 era este letargo, y la prueba que lo prueba no
toca ni DOM ni reloj falso.** `runBatch` devuelve un progreso que es una
fracción entera de un recuento de ticks — nunca una animación de reloj real —
así que "ningún estado intermedio" se comprueba corriendo los quince lotes de
64 y mirando que cada uno aterriza en un número entero, mayor que el anterior,
sin saltos de más de 64. Es la comprobación que una transición CSS no podía
pasar y un recuento sí.

**Ratificado, otra vez, el cableado más allá del contrato literal.** `app.ts`
guarda cada 20 ticks y al ocultar la pestaña; `main.ts` carga al abrir, pone al
día antes de arrancar el bucle normal — nunca los dos tocando el mismo estado a
la vez — y abre el parte de bienvenida antes de que se vea nada más. Sin esto,
"cerrar y abrir a las cuatro horas" solo era cierto dentro de un test, otra vez
el mismo fallo que M-22 ya había encontrado.

**El parte de bienvenida, leído en frío — la petición del hallazgo.**
Verificado con Playwright y reloj falso instalado antes de navegar
(`page.clock.setSystemTime` sobrevive a un `reload`, cosa que no daba por
supuesta): cerrar tras algo de juego real, saltar cuatro horas sin esperarlas,
recargar, y el parte aparece solo. Dos partidas de muestra:

> While you were gone
>
> Age took Aethelswith that spring. 62 winters.
>
> The harvest failed. 729 bushels for 15 mouths.
> A ruined autumn. 715 bushels, and the village is 15.
> They got 707 bushels out of the ground in year 19, and counted them twice.
> One of the houses burned down in year 20.
>
> 958 weeks passed.
> The valley counts 18 now: 8 born, 13 died, 3 arrived, 0 left.
> 4 raised, 0 lost.

> While you were gone
>
> Botild died in year 17. 62 winters, and had seen the valley empty.
>
> Year 12 gave 3514 bushels to 34 mouths.
> The church was finished in the winter of year 12.
> 3673 bushels, and the granary would not hold it all.
> One of the houses burned down in year 14.
>
> 958 weeks passed.
> 34 people now. 36 born, 26 died, 4 arrived, 0 left.
> 12 raised, 0 lost.

La segunda se lee bien: una muerte con epitafio (§9.4), una cosecha, una
capilla que se convierte en iglesia, otra cosecha, un incendio. Cuatro sucesos
distintos, cuatro tipos distintos.

**La primera no.** Tres de las cuatro entradas de peso 2 son cosechas
seguidas —fallida, ruinosa, y una que ni siquiera suena mal pero comparte
plantilla— y ninguna cuenta nada que no sea grano. `welcomeDigest` (M-09,
§9.2) toma las cuatro últimas de peso 2 por orden cronológico, sin mirar de qué
tratan; si los años más recientes de la ausencia dieron tres cosechas notables
seguidas, se comen las cuatro plazas y cualquier llegada, construcción o disputa
de antes queda fuera aunque hubiera pasado en la misma ausencia. Leído en frío,
la primera partida dice "hubo una muerte y luego grano, grano, grano, una casa
ardió" — se entiende, pero no dice nada de la aldea que las cifras de abajo sí
cuentan (18 personas, 8 nacimientos, 3 llegadas: hubo más historia que grano).

**Es un problema de selección, no de formato** (tal y como se pidió juzgar): la
regla de §9.2 dice "hasta 4 entradas de peso 2", no dice nada sobre variedad,
y la implementación de M-09 —ya probada, ya en uso— no la tiene. No se ha
tocado: es un módulo de otro hito, y el arreglo natural —como mucho una o dos
por categoría, no cuatro seguidas de la misma— es una decisión de diseño que
corresponde decidir con esta prueba delante, no imponerla de oficio.

### 2.62 — El reloj del navegador no es el del juego

**§11.4, nueva.** El hallazgo de M-22, y vale más que la pantalla que lo
destapó: una transición CSS corre sobre el reloj del compositor, que no tiene
ningún motivo para coincidir con el del juego —pausa, ×1, ×4, ×16, y el letargo
de §13.2 con **960 ticks en menos de dos segundos**—. En cuanto discrepan, la
interfaz se queda a medias, y así apareció: una prueba de reloj falso encontró el
zoom **atascado a mitad de recorrido**.

Lo notable es que no lo cazó una revisión visual sino una prueba, y que el
arreglo —corte seco— es un cambio real de comportamiento, no un retoque para que
la captura quedara bien. Quedó dicho al reportarlo, y así debe ser.

La regla generalizada distingue dos cosas: lo que representa el estado del juego
se anima con la fracción del tick; lo que es afordancia para el humano puede usar
tiempo real, pero tiene que tener estado definido en todo instante. **El caso de
prueba es el letargo**, porque es donde el reloj del juego salta más.

**§11.5 y §8.4 · `douse` gana `who`.** A.7 promete apagar «el edificio de B» y el
esquema solo sabía nombrar el tipo: apagaba una casa cualquiera. Es la mentira de
§8.1 trasladada de la columna del precio a la del efecto visible. Las otras tres
carencias de coordenada son fontanería —el vado es derivable, `fellForest` ya
elige celda y no la devuelve— y se saldan cuando se toque su módulo.

**Ratificado el cableado de `app.ts` más allá de `decide()`.** Nada llamaba a
`openCrossroad` ni a `openChronicle`, y el gesto de deslizar arriba llevaba desde
M-21 emitiendo un evento sin oyente. Sin cerrar eso, el criterio del hito 2
—«una decisión cambia el valle de forma visible»— solo se alcanzaba con un test
llamando a la función, que es exactamente el fallo de pruebas verdes y juego
roto.

### 2.61 — El hito 2: la encrucijada en pantalla

M-22 estaba escrito sobre el contrato de v2.60 y sobre un supuesto que no
estaba escrito en ningún sitio: que un `VisualEffect` siempre tiene dónde
señalar. No es así, y la lista completa importa más que el código:

- **`raise`/`ruin`** se localizan solos: la obra que `requestBuild` acaba de
  abrir, o el edificio que acaba de perder `lostTick` este mismo tick — ambos
  ya existen en el estado cuando el paso 3 termina de aplicar la opción.
- **`douse`** encuentra el único edificio en pie de esa clase — salvo que haya
  más de uno. Hoy solo `house` tiene ese problema (`chapel`, `smithy`, `mill`
  son singulares en la práctica); no hay forma de saber CUÁL casa desde el
  efecto, que solo nombra la clase.
- **`gather where:'ford'`** nunca tuvo una celda: el vado es atrezzo de la
  crónica («up the ford road»), nunca una coordenada del mapa.
- **`scar what:'felled_wood'`**: `fellForest` sí elige una celda real, pero
  devuelve solo un total de madera, y `world/forest.ts` no es de este brief.
- **`banner`** no señala nunca un edificio — el propio comentario de
  `schema.ts` lo dice: «a banner over the core».

Las cinco caen en el mismo sitio: el centro de la aldea, la misma cifra que ya
calculan por su cuenta `render/crowd.ts` (`plaza`, adonde va la multitud del
domingo) y `world/forest.ts` (`core`, de donde salen los leñadores). `sim.ts`
guarda su propia copia — `valleyCore` — porque el motor no puede importar de
`render/`, y tocar esos dos ficheros no estaba autorizado esta ronda. Tres
copias de la misma fórmula no es ideal; es preferible a una cuarta que
inventara un centro distinto.

**El GIF, y la pregunta que lo decide.** ¿Se lee el precio antes de elegir, sin
desplazar, con las tres opciones y el cuerpo en pantalla? A 390 px reales, sí:
las 16 plantillas caben porque el precio vive en el mismo bloque que el verbo,
nunca detrás de un segundo toque. Un hallazgo que no estaba pedido: la
transformación de la cámara **no lleva transición CSS**. La probé con una
(`transition: transform 250ms`) y el banco de pruebas la delató de inmediato —
un reloj falso puede saltar los dos segundos de `setTimeout` sin que el
compositor real haya movido un solo fotograma de la animación, y la captura
quedaba a mitad de camino entre el zoom y la vuelta. Un corte seco es más
honesto que una animación que dos relojes que no se hablan entre sí no pueden
mantener de acuerdo.

**Lo que no estaba en el brief de M-22 y hubo que tocar de todos modos.**
`app.ts` ya estaba autorizado por el contrato de decisión (v2.60); esta ronda
además engancha `openCrossroad`/`openChronicle` ahí, porque si nadie los llama
el hito 2 no se puede alcanzar jugando: `paint` abre la encrucijada en cuanto
`state.crossroad` no es nulo (incluida la primera pintura, para una partida
guardada o `?live=1` que ya aterrice sobre una pendiente) y el deslizar hacia
arriba, que llevaba dos rondas disparando un evento sin nadie escuchando, ahora
abre la crónica.


M-22 necesitaba una forma de que la opción elegida llegase al motor, y el
contrato de `App` no tenía ninguna. La solución correcta es la que evita el
atajo: **`decide` encola y el paso 3 del tick aplica**, porque §4.2 es normativo
y porque el registro de decisiones del que depende la reproducción de §13.1 solo
existe si todo pasa por ahí. Una interfaz que llamara a `applyOption` mutaría el
estado fuera del orden y rompería las dos cosas a la vez.

Las cuatro reglas están en el brief M-20. Dos merecen mención aparte:

- **Encolar fuerza el tick siguiente de inmediato.** Sin eso el jugador toca y no
  pasa nada durante quince segundos a ×1: la decisión más pesada del juego se
  sentiría rota, y el arreglo tentador —aplicar el efecto en el acto desde la
  interfaz— es justo el atajo que la regla prohíbe. Forzar el tick da inmediatez
  conservando un único camino de mutación.
- **El motor informa; la interfaz enfoca.** `TickReport` devuelve los
  `VisualEffect` aplicados con coordenadas. El motor no sabe que existe una
  cámara (§2.4): dice qué cambió y dónde, no adónde mirar. Los dos segundos de
  §11.2 son decisión de la interfaz.

### 2.59 — La cifra está a un toque

M-21 conecta el contrato puro de v2.58 al lienzo. La ficha inferior conserva el
valle detrás y muestra la lectura exacta del objetivo; una vivienda no duplica
«usuarios» y «residentes», y talleres y templos nombran a quien ejerce el oficio.
Mantener una figura nombrada activa un halo, el pellizco limita el lienzo entre
1× y 2,5×, deslizar abajo cierra la ficha y deslizar arriba emite la transición
a la crónica que M-22 materializa.

El hambre no necesita estado nuevo: se deriva con la misma demanda semanal y
la misma bandera `forced_hunger` que el consumo. Reduce de forma determinista
cuánta gente llega al trabajo y ralentiza visualmente salida y regreso. La ruta
viva acepta `hunger=1` solo en depuración para mantener una escena reproducible;
la captura móvil muestra un granero vacío y menos manos en los destinos sin
abrir ninguna ficha.

**Qué habría falsado el cierre:** una ficha que no correspondiera al píxel
tocado, cifras duplicadas o reconstruidas, gestos que escribieran en el motor,
una señal que consumiera RNG o una escena hambrienta indistinguible de su control.
La suite pura, cinco recorridos Playwright y la revisión de ambas capturas no
muestran esos fallos.

### 2.58 — Tocar lo que se ve

La firma inicial de M-21 no llevaba tiempo visual: una figura podía estar en el
campo y `inspectAt(state,x,y)` solo podía adivinar otra posición. Se conserva la
llamada de tres argumentos y se añade `tickFraction = 0.45` como cuarto argumento
opcional; la aplicación entrega la fracción exacta que acaba de pintar.

La tabla de §11.1 tampoco fijaba escalas. Son presentación, no balance: el
granero enseña su fracción de capacidad, cada casa ocupada tiene luz nocturna,
el ánimo controla la opacidad del humo, la fe enciende de cero a cinco velas y
un brote activo pone una cruz en cada vivienda ocupada. La ficha devuelve edad,
rasgos, dos memorias y dos opiniones fuertes para un nombrado, y año, usuarios y
cifra relevante para un edificio. Los umbrales de gesto son 10 px/300 ms para
toque, 500 ms para mantener, 44 px verticales para deslizar y 12 px de cambio
entre dedos para pellizcar.

**Qué falsaría este contrato:** que un borde no sea pulsable, que consultar una
señal mute el estado, que una cifra de ficha no proceda del estado actual o que
dos gestos normativos produzcan el mismo resultado con trazas inequívocas. Las
pruebas puras cubren estos límites. Falta conectar la ficha y los gestos al DOM
para cerrar M-21.

### 2.57 — La multitud se entiende en movimiento

La ruta `?debug=1&live=1&seed=7&year=80&season=summer` carga el mismo estado
maduro en el bucle real de M-20. No altera la ruta estática de M-19 y permite
repetir una observación sin depender de la semilla aleatoria de una partida
nueva. En ese estado hay 80 habitantes presentes.

El GIF de veinte segundos, muestreado cada medio segundo a tamaño móvil, enseña
la salida desde las viviendas, la separación por los caminos de trabajo, el
regreso entre los segundos 9 y 12, la noche sin figuras y el comienzo del ciclo
siguiente en el segundo 15. Los ocho tonos de personajes nombrados siguen
localizables entre la multitud. **M-18 y la puerta visual de §14.3 quedan
cerrados.**

**Qué habría falsado este cierre:** teletransportes entre fotogramas, gente a la
intemperie durante la noche, figuras perdidas fuera del mapa, una masa ilegible
en el centro o destinos sin relación con campos y obras. No aparece ninguno.

### 2.56 — El tiempo del motor llega a la pantalla

M-20 arranca una partida nueva a velocidad ×1, compone el fondo cacheado con la
multitud móvil y ofrece pausa, ×1, ×4 y ×16 en controles de al menos 44 px. El
año cero del motor se presenta como **`ANNO I`**: es un ordinal civil y no cambia
ningún tick guardado. Elegir ×1 al abrir resuelve el único valor inicial que el
brief no fijaba y permite ver el juego vivo sin acelerar una decisión ausente.

La suma de fracciones de `requestAnimationFrame` dejó el caso normativo una
semana corto: 43.200 fotogramas de 1/60 s a ×4 daban 191 ticks. La comparación
se hace ahora en unidades de tick con tolerancia numérica y conserva cualquier
deuda por encima del límite de ocho; no redondea el tiempo jugado. La prueba da
exactamente 192 ticks, y Playwright confirma a 390×844 que el valle abre, que
los cuatro botones responden y que el reloj virtual cruza a la paleta siguiente.

**Qué habría falsado este cierre:** perder o inventar una semana en doce minutos,
consumir tiempo de una pestaña oculta, ejecutar más de ocho ticks en un cuadro,
no cambiar de estación o exigir desplazamiento para alcanzar un control. Ninguno
ocurre. M-18 ya recibe tiempo real; su GIF de veinte segundos sigue siendo una
puerta visual propia.

### 2.55 — Veredicto de la primera hoja

La hoja rotulada de la semilla 7 se revisa a su resolución móvil, no solo por
asertos. **M-16 pasa:** primavera y verano son cercanas pero distinguibles por
temperatura y claridad; otoño cambia la familia cromática e invierno cambia
tanto terreno como agua. En gris siguen separados río, bosque, pradera, roca y
caminos. **M-17 pasa:** campos, viviendas, graneros, capilla, fragua, molino y
defensas conservan perfiles distintos sin etiquetas a 10 px.

M-18 queda técnicamente correcto y visualmente abierto hasta su criterio real:
el GIF de veinte segundos. La concentración en campos y obras es coherente con
los destinos, pero una imagen inmóvil no dice si la salida y el regreso se leen
como multitud o como parpadeo. M-20 aporta la fracción temporal que falta.

**Qué habría falsado este cierre:** confundir una estación aun con los paneles
rotulados, perder una masa en gris o no separar las siete familias de edificio.
No ocurre. La densidad en movimiento conserva su propio criterio falsable y no
se declara aprobada por extensión.

### 2.54 — Una hoja generada todavía no ha sido mirada

§14.3 es una puerta humana independiente de §9.5. El lector de las crónicas
debe ser ajeno al proyecto; quien mira los píxeles solo necesita juzgarlos a
tamaño real. Las pruebas de geometría, luminancia y cajas evitan regresiones,
pero no pueden decidir si primavera y verano se confunden, si un edificio se
reconoce o si ochenta cuerpos forman una mancha.

La primera hoja reunía las 32 capturas sin identificar los paneles y obligaba a
conocer su orden. M-19 ahora escribe sobre cada uno año, estación y `gray`, sin
alterar las capturas individuales de 390×844. La puerta pide tres respuestas:
si las cuatro estaciones se reconocen, si los siete edificios principales se
distinguen sin rótulos y si la multitud sigue legible en los años 60 y 120.

**Qué falsaría el cierre visual:** un «no» en cualquiera de esas tres preguntas.
Hasta que una persona mire la hoja rotulada, M-16, M-17 y M-18 están
técnicamente implementados, pero §14.3 sigue abierta. Esto no afecta al cegado
del paquete de crónicas de §9.5.

### 2.53 — El juez sigue siendo una persona

`npm run reader:packet` genera en `artifacts/hito-0-reader/` tres crónicas de
sesenta años como `chronicle-a.txt`, `chronicle-b.txt` y `chronicle-c.txt`, más
`reader-question.txt`. Las partidas usan las semillas 7, 42 y 108 y la misma
política `first`, pero esa correspondencia no aparece en los ficheros que recibe
el lector. Tampoco aparecen banner, política, población final ni indicación de
qué historia debería ser mejor.

El paquete actual contiene 145, 169 y 188 líneas. La pregunta es una sola:
*«How do these three villages differ?»*. Así se evita convertir el criterio de
§9.5 en una lista de comprobación que enseñe al lector qué debe encontrar.

**Qué falsaría el hito 0:** que una persona ajena responda que las tres se
parecen mucho o no pueda describir diferencias concretas entre gente y sucesos.
Esa evidencia todavía no existe. Desde v2.79, el generador puro y el contrato de
metadatos forman una regresión rápida; el escritor consume ese mismo resultado y
su comando se verifica aparte. **El hito 0 continúa sin validar** hasta recibir
la respuesta externa.

### 2.52 — La multitud no crea una segunda aldea

§10.6 decía que cada aldeano «tiene» `anchorHome` y `anchorWork`, pero esas
propiedades no existen en `Villager` y M-15 ya resolvió el mismo dato para el
desgaste de caminos. Guardarlas ahora duplicaría hogar, asignación de trabajo y
ruta, con tres maneras de quedar obsoletas.

Los anclajes pasan a ser explícitamente **cachés derivadas**. M-18 lee en bloque
las rutas de M-15 para la población trabajadora; niños, mayores y gente sin ruta
laboral se quedan en el hogar, o en la plaza si no tienen casa. Uno de cada
cuatro ticks recalcula el camino de todos a la plaza. La caché se identifica por
objeto de partida y tick y nunca entra en `GameState` ni en el guardado.

El ciclo interpola salida 0,00–0,15, jornada 0,15–0,60 y regreso 0,60–0,80 con
un desfase determinista máximo de ±0,04 por `id`; desde 0,80 devuelve cero
figuras. La deriva en destino es de hasta ±0,5 celdas y también deriva solo del
`id` y la fracción. El render limita la multitud a las primeras 80 personas
vivas en orden estable.

**Qué habría falsado la solución:** una escritura en el estado, una posición
fuera del mapa, una figura visible a 0,9 o superar 100 ms en 1.000 llamadas con
80 personas. Las pruebas pasan; la medición aislada da **9,14 ms** y devuelve
las 80 figuras.

### 2.51 — Lo inmóvil se cachea; las aspas también

M-17 destapó una contradicción entre tres contratos de §10: los edificios viven
en el fondo cacheado, el sprite recibe solo contexto, posición, celda, paleta y
nivel, pero la tabla pedía que las aspas girasen «si hay viento». `GameState` no
tiene viento, la firma no tiene tiempo y regenerar edificios por fotograma
rompería precisamente el presupuesto que justifica la caché.

La orientación fija de las cuatro aspas pasa a ser normativa. Si una fase futura
introduce viento visible, tendrá que separar las aspas en una capa dinámica con
su propio contrato y presupuesto; M-17 no inventa ese sistema desde una frase
incompatible.

Los trece tipos de edificio, la ruina, el aldeano y el nombrado se dibujan por
código. Los edificios en pie reutilizan su propia silueta desplazada para la
sombra; la fragua solo recibe el punto naranja cuando `lit`; los ocho tonos de
nombrados son estables por índice. La auditoría de navegador cubre los trece
edificios a 9 y 10 px sobre blanco y negro: **52 casos**, todos con píxeles y
ninguno fuera de su caja. Las ocupaciones de casa, capilla, granero y molino son
cuatro mapas distintos.

**Qué habría falsado la implementación:** una silueta principal confundible,
un solo píxel fuera de caja, un sprite vacío sobre alguno de los dos fondos o
una fragua apagada con resplandor. La auditoría automática pasa y la hoja móvil
muestra las siete familias principales sin etiquetas.

### 2.50 — La tabla que se veía bien y no se leía

Al convertir la tabla de §10.3 en su test obligatorio apareció una contradicción:
las cinco ranuras exigían al menos 8 puntos de luminancia entre sí, pero el
mínimo era **1,97 en primavera, 1,04 en verano y 7,57 en otoño**. Cumplir la
tabla literal hacía imposible cumplir su criterio de terminado.

Se conserva el orden perceptivo y el tono de cada ranura y se resuelve la
restricción como un ajuste mínimo sobre sus canales: se ordenan las luminancias,
se proyectan a una separación de 9 puntos y se desplaza cada RGB por igual. Ese
punto adicional absorbe la cuantización a ocho bits. Los mínimos reales quedan
en **8,63 primavera, 9,00 verano, 8,57 otoño y 9,28 invierno**. Diez valores de
la tabla cambian; los otros treinta y ocho se conservan.

M-16 pinta cada tipo como contornos de regiones cardinales, con perturbación
determinista máxima de ±0,15 celdas solo en sus bordes; no introduce ruido por
celda. El fondo añade los caminos del mapa y queda en `OffscreenCanvas`. La hoja
de M-19 muestra las cuatro estaciones distintas antes de cualquier rótulo y las
copias grises conservan cauce, pradera, roca, bosque y camino.

**Qué habría falsado la solución:** una separación menor de 8, una estación
confundible en la hoja, un contorno distinto para la misma entrada o una región
fragmentada por celdas. Las cinco pruebas específicas, la captura completa y la
inspección de la hoja pasan. M-17 puede empezar sobre este fondo cacheado.

### 2.49 — M-19 antes del primer píxel

La dependencia escrita en el brief de M-19 era circular en la práctica: pedía
M-16 para construir la herramienta que §14.3 exige **antes del primer día que se
dibuje algo**. Se separan infraestructura y juicio visual. M-19 monta primero la
ruta determinista y la captura sobre un lienzo diagnóstico; M-16 sustituye el
pintado y usa la misma hoja para demostrar que las estaciones se distinguen.

`npm run shots -- --seed 7 --years 1,20,60,120` genera 33 PNG: 16 combinaciones
de año y estación a 390×844, las 16 copias en gris y una hoja que reúne ambas.
La ruta acepta semilla, año y estación, simula sin interacción con `prudent` y
expone el lienzo de 360×560 CSS px. Chromium empaquetado es la primera opción;
en una máquina de desarrollo sin él se usa Chrome instalado, sin cambiar el
comportamiento de CI.

**Qué habría falsado la decisión:** una captura ausente, una geometría distinta
de la móvil o necesitar interacción para alcanzar el estado. El comando produjo
las 33 imágenes en 12 s; el test Playwright de la ruta pasa, igual que build y
las 577 pruebas rápidas. La hoja aún debe verse plana: juzgar estaciones antes
de M-16 confundiría el instrumento con el arte.

### 2.48 — Las dos puertas, abiertas

Se aplican las dos correcciones decididas en v2.47 sin tocar ningún otro
mecanismo: A.11 exige `forestLeft > 0.12` y A.10 conserva `faith > 30` sin techo.
El barrido de cobertura de **30 semillas × 150 años** da 268 apariciones de
`forest_cut`, 49 de `relic_pedlar` y cero plantillas mudas. La suite rápida pasa
**577 pruebas** (2 pendientes deliberadas).

**Qué habría falsado la decisión:** que cualquiera de las dos siguiera a cero,
que otra plantilla desapareciera del barrido o que fallara una prueba ajena a
esas dos condiciones. No ocurrió ninguno. Esta es una confirmación de contenido
vivo, no una nueva ronda de balance; los umbrales de desenlace quedan como están
y el siguiente trabajo es M-19.

### 2.47 — Cierre de la fase de balance

**Dos correcciones que la auditoría de la v2.46 dejó servidas.** Las dos son
erratas mías de la v2.0, no consecuencias de nada:

- **A.11 · `forestLeft > 0.3` era inalcanzable.** `FOREST_TARGET` topa en 0.26
  (§12.7), así que la plantilla estaba muerta **desde el tick cero** y sus cero
  apariciones en 240 partidas no eran un síntoma de madurez: era aritmética. Baja
  a 0.12, que es lo que la condición quería decir —«queda madera que valga la
  pena talar»— dejando el disparador episódico en `neededFields > fields`. Con
  eso, `forest_cut` es contenido de la primera mitad **por diseño**: no se
  roturan más campos que el tope de ocho, y eso es correcto.
- **A.10 · `relic_pedlar` abandonaba su franja de fe para no volver.** La deriva
  de §5.6 estabiliza la fe por encima de 70 en cuanto hay capilla. Se retira el
  tope: una aldea próspera y devota es exactamente donde aparecería un vendedor
  de reliquias. Caso de manual de la regla de la aldea madura (§8.1).

**Y el cierre de la fase.** El desenlace sigue fuera de banda —`prudent` 1,7 %
contra 2–12 %, `worst` 10,0 % contra ≥25 %, horquilla 8,3 contra ≥20— y van
**dos hipótesis falsadas seguidas** con el mismo método:

| Hipótesis | Cómo se falsó |
|---|---|
| La puerta de ocho habitantes cierra la recuperación | A/B idéntico semilla por semilla (v2.17) |
| Los dientes deben dañar la capacidad, no a la gente | Ocho campos en pie al año 200 en las cuatro políticas (v2.46) |

La segunda dejó, además, la explicación de por qué: **un campo cuesta 0 de
madera y 60 puntos de obra y encabeza la prioridad de construcción**, así que
destruirlo es un rasguño que la aldea repara en semanas. El gradiente existe
—7,92 campos y 98 % al tope con `prudent` contra 7,38 y 68 % con `worst`— pero
queda sepultado por lo barato que es reconstruir.

**Dos hipótesis falsadas seguidas significan que falta evidencia, no que falte
otra hipótesis.** Una tercera conjetura de despacho tendría la misma calidad que
las dos anteriores. Lo que queda por saber no es qué constante mover: es si un
jugador **siente** la diferencia entre jugar bien y jugar mal — y eso §16.2 ya
dice que solo se resuelve jugando.

Por eso la fase de balance se cierra aquí. El banco queda como **red de
regresión**, no como instrumento de diseño: sirve para que nada empeore mientras
se construye el render. Las tres pistas vivas, para cuando haya con qué medirlas,
quedan anotadas y sin tocar:

1. **Impedir la reconstrucción, no destruir.** El mecanismo existe y no se ha
   probado: `plague_pit:burn_the_houses` marca ruina de piedra veinte años. Un
   campo quemado que no se puede volver a roturar es otra cosa que un campo
   quemado.
2. **El motor de recuperación es la inmigración, y el juego prudente nunca lo
   apaga.** `hostile` no se activa jamás con `prudent` (medido dos veces). Nada
   de lo que hace un jugador cuidadoso puede cortar su propia recuperación.
3. **Los umbrales de §12.9 son suposiciones de la v2.0.** El 25 % y los 20
   puntos se escribieron antes de que existiera el catálogo, igual que el rango
   de cadencia 1–4 que ya hubo que corregir a 1–5.

### 2.46 — La hipótesis falsada, y la aldea madura completa

**PARTE 1, resultado: la hipótesis se falsa tal como estaba planteada.**
`bandits:fight_them` ya llevaba `destroy field 1` desde la v2.25 —no hubo nada
que cambiar; se dice así en vez de fingir un experimento que no hizo falta— así
que el banco de esta ronda mide exactamente la configuración pedida, con la
métrica nueva (campos en pie al terminar la partida) añadida a
`tools/reports/balance-report.ts`.

| | `prudent` | `first` | `last` | `worst` |
|---|---:|---:|---:|---:|
| Terminadas | 1,7 % | 1,7 % | 5,0 % | 10,0 % |
| Horquilla `worst`−`prudent` | | | | 8,3 pts |
| Pérdida media, `fight_them` a 5 años | — | — | — | 4,11 (205 veces) |
| **Campos en pie al terminar, mediana** | **8** | **8** | **8** | **8** |

Terminadas, horquilla y pérdida de `fight_them` salen idénticas a la v2.44,
porque nada en el motor cambió entre un banco y otro: es la confirmación de que
la medición es determinista y de que no hacía falta tocar código.

**La mediana no discrimina — las cuatro políticas terminan con el mapa de
campos lleno.** Por el criterio falsable que se propuso —`worst` sube
claramente, `prudent` apenas se mueve—, esto es que **no se mueve ninguna de
las dos**: la hipótesis, tal como se planteó con esta variable, es falsa.
`FOOD.MAX_FIELDS` es 8 y `field` cuesta 0 de madera y solo 60 puntos de obra —el
edificio más barato de reconstruir del catálogo, y el primero en la prioridad de
§7.3—, así que una aldea que pierde un campo lo recupera antes de que el banco
vuelva a mirar. Trescientos cuatro destrucciones de campo en doscientas
cuarenta partidas (60 × 4 políticas) no dejan mella visible en la mediana.

**La media sí ve algo, y hay que decirlo aunque la mediana no lo pida.**
Repartición de campos al terminar: `prudent` 59/60 partidas en el tope, media
7,92; `first` 51/60, media 7,78; `last` 56/60, media 7,68; **`worst` 41/60,
media 7,38**. Hay un gradiente real —`worst` tiene doce partidas por debajo de
7 campos, `prudent` solo una— pero está dominado por partidas que igual acaban
en el tope, y la mediana, que es lo que se pidió medir, no lo distingue. La
capacidad como palanca no está descartada del todo: está descartada **para
esta opción y esta magnitud de golpe**. Un campo cada vez, con la prioridad de
obra más alta del juego reconstruyéndolo, es un golpe demasiado pequeño y
demasiado barato de curar.

**No se toca nada.** Ni `fight_them`, ni `refuse`, ni ninguna otra opción; ni el
mecanismo de bloqueo temporal que ya existe para `plague_pit:burn_the_houses`
—que si se aplicara a un campo sí impediría la reconstrucción inmediata y sería
la siguiente prueba, no esta.

**PARTE 2 — Auditoría de la aldea madura, las 17 plantillas.**

| Plantilla | Qué la mantiene elegible a los 80/mapa lleno | 0–100 → 100–200 | Primera mitad |
|---|---|---:|---|
| `winter_grain_debt` | Invierno, `grainToHarvest`<0,9, no vasallo. Tope 2/partida | 26 → 38 | Por diseño: crisis rara, capada a propósito |
| `tithe_demand` | Solo si el jugador fue vasallo alguna vez (`kneel`); otoño, año>5 | 27 → 72 (`prudent`); 0 → 0 (`worst`, que nunca se arrodilla) | Por diseño: gira sobre una decisión anterior, no sobre la edad |
| `hungry_spring` | `grainYears`<0,35, primavera | 42 → 80 | Por diseño: crisis de grano real, sube con la aldea |
| `granary_theft` | `grainToHarvest`<1,1, granero, rencor≥40 | 14 → 30 | Por diseño: depende de rencores, no de la edad |
| `smith_feud` | Rencor≥45 o `feud_ripe`; gente>20 | 7 → 11 | Por diseño |
| `feud_inherited` | Año>24; rencor≥45 o `feud_ripe`; gente>15 | 7 → 8 | Por diseño |
| **`forest_cut`** | `forestLeft`>0,3; gente>25 | **0 → 0** | **Por descuido.** El mapa nunca genera más del 0,26 de bosque (`MAPGEN.FOREST_FRACTION`); el umbral pide más bosque del que puede existir el día uno. Inalcanzable desde el tick cero, no por maduración |
| `wolf_winter` | Invierno, `forestLeft`>0,25, gente>15 | 12 → 0 | **Aldea madura de manual.** El umbral cabe en el rango de fundación (0,20–0,26), así que nace viable; la tala acumulada de un siglo lo cierra para siempre. Ambiguo entre diseño («sin bosque no hay lobos») y descuido (nadie decidió que se apagara sin vuelta) |
| `chapel_or_granary` | Gente≥30, sin capilla, madera>200, fe>45. Tope 1/partida | 16 → 0 | Por diseño: hito de una sola vez |
| `relic_pedlar` | Verano, capilla, fe entre 30 y 70 | 12 → 0 | **Por descuido.** Con capilla la fe deriva hacia arriba y se estabiliza por encima de 70; sale de la banda para no volver. Nadie quiso que se apagara para siempre |
| `plague_pit` | Brote activo, gente>12 | 24 → 16 | Por diseño: depende del brote, no de la edad |
| `plague_blame` | Brote activo, fe>55, sacerdote devoto | 6 → 9 | Por diseño |
| `strangers_at_the_ford` | Gente≥12, sitio libre, no `hostile`, ánimo≥55, primavera | 179 → 166 | Por diseño |
| `bandits` | Otoño, gente>30, SIN empalizada, año>15 | 80 → 72 | Autolimitación deliberada —una de sus propias opciones levanta la empalizada—, no descuido: en la práctica sigue sano porque la empalizada no siempre se levanta |
| `succession` | Líder muerto, sin interregno | 540 → 568 | Por diseño: el latido del bucle largo |
| `first_stone` | Primavera, gente≥45, fragua, año>40. Tope 1/partida | 54 → 3 | Por diseño: hito de una sola vez |
| `quiet_years` | `grainYears`>1,0 (reserva) | 17 → 16 | Por diseño: siempre disponible |

Medido sobre 30 semillas × 200 años con `prudent` y `worst` (60 partidas
combinadas); las cifras de `succession` y `strangers_at_the_ford` son grandes
porque disparan cada semana que se cumplen sus condiciones, no porque se hayan
contado distinto que el resto.

**El patrón tiene dos formas, no una.** `chapel_or_granary` y `first_stone` se
apagan porque **están diseñadas para apagarse** —hitos de una vez—, y eso no es
un fallo: es exactamente lo que `maxPerGame: 1` promete. `tithe_demand` no
enmudece por edad sino por una rama narrativa que la mayoría de políticas nunca
toma. El fallo real, y solo él, tiene esta forma: **una condición de rango o de
carencia que una aldea madura satisface o rebasa de forma permanente**, sin que
nada en el catálogo pueda devolverla a la banda. Tres plantillas la tienen:
`forest_cut` (inalcanzable desde el principio, el caso más simple), `relic_pedlar`
(la fe se estabiliza fuera de rango) y `wolf_winter` (el bosque se agota con la
edad). Las tres son `forest` o `faith` — las dos categorías que la v2.44 midió
desplomadas.

No se ha tocado nada de esto todavía.

### 2.45 — La aldea madura no tiene enemigos

La medición de la v2.44 completa la eliminación: **no es el bucle** (43,9 % y
41,3 %, dentro del 45 %), **no es el instrumento** (`prudent` cuenta marchas
desde la v2.42 y sigue en 1,7 %) y **no es el mundo roto** (arreglado en la
v2.18). Queda el catálogo, con `worst` en el 10,0 % contra el 25 % exigido.

Pero la tabla de pérdida por opción dice algo más preciso que «faltan dientes»:
**los dientes existen y no matan.** `winter_grain_debt:refuse` se lleva 54,35
personas de media —dos tercios de una aldea de ochenta— setenta y cinco veces, y
la aldea sobrevive igual. No porque el golpe sea flojo: porque **el daño va a la
gente, y la gente se regenera**. Ocho campos, dieciséis casas, tres graneros y el
motor de inmigración siguen intactos y la vuelven a llenar. La aldea no es un
edificio que se derriba: es un manantial que se vacía y se repone.

De ahí la hipótesis a falsar: **el daño que cuenta es a la capacidad de
recuperarse —campos, graneros, viviendas, la llegada de forasteros—, no a la
población.** Se prueba con una sola variable, no rediseñando el catálogo.

- **§8.1 · Regla de la aldea madura.** El hallazgo estructural de la ronda, y no
  lo buscaba nadie: `forest_cut` a cero en 240 partidas y la categoría `faith`
  desplomada hasta desaparecer son **el mismo fallo**. Una condición formulada
  sobre una carencia (`neededFields > fields`) o sobre un rango (`faith` entre 30
  y 70) muere cuando la carencia se cubre o el estado se estabiliza fuera del
  rango. Es la cara opuesta de la regla episódica: allí la condición era siempre
  cierta; aquí deja de serlo para siempre. El catálogo está escrito para una
  aldea que crece — y enmudece justo donde el juego se queda sin presión.
- **§14.2 · Presupuesto a 15 minutos**, con la nota de que es la última subida
  sin optimizar.

**Nota de proceso.** La v2.45 se perdió una vez antes de llegar: se escribió en
una ruta de salida reutilizada de la ronda anterior y se envió el fichero viejo,
revirtiendo la v2.44 entera. La medición se recuperó del commit `8ce9ef3`. Desde
aquí, toda escritura del documento usa nombre único por ronda y **se relee del
disco después de escribir**: verificar la edición no es verificar la escritura.

### 2.44 — El banco que termina

Dieciocho revisiones —de la v2.26 a la v2.43— repararon trece contratos,
compusieron `story` por fuerza en vez de por producto y cerraron la deuda de
banderas. Ninguna se había medido junta: el banco llevaba tres rondas
cortándose a mitad. Esta ronda no añade nada. Ejecuta el banco entero, sin
interrumpirlo, y dice lo que hay.

**`story` compone por fuerza, implementado y probado.** `CROSSROADS.STORY_FLOOR
= 0.25`; para cada categoría se recogen los modificadores que le aplican y solo
sobrevive el más lejano de 1 — no se multiplican. `behind_the_wall` (0,4) y
`a_name_in_the_valley` (0,5) sobre `lord` dan ahora 0,4, no 0,2. Dos pruebas
nuevas en `crossroads.test.ts`: la composición ya no multiplica, y el suelo
resiste con las banderas reales del catálogo.

**60 semillas × 200 años × 4 políticas, sin interrupción:**

| | `prudent` | `first` | `last` | `worst` |
|---|---:|---:|---:|---:|
| Terminadas | 1,7 % | 1,7 % | 5,0 % | **10,0 %** |
| Horquilla `worst`−`prudent` | | | | **8,3 pts** |
| Pico mediano | 82 | 83 | 81 | 81 |
| Población gen. 1, mediana | 41 | 41,5 | 28 | 27,5 |
| Mapas llenos < año 120 | 96,7 % | 95,0 % | 78,3 % | 75,0 % |
| Cadencia media | 3,32 | 3,63 | 3,81 | 4,22 |
| Cadencia máxima | 4,60 | 5,10 | 5,38 | 6,05 |
| Opción más repetida | `succession:choose_a` 26,8 % | `succession:choose_a` 24,7 % | `succession:no_one` 43,9 % | `succession:no_one` 41,3 % |

**Contra §12.9:** cadencia (media y máxima, las cuatro) ✅. Una sola opción
< 45 % (`last`/`worst`) ✅ — 43,9 % y 41,3 %, la primera vez que este aserto
pasa. Elegibilidad < 1 % por plantilla ❌ en cuatro casos: `smith_feud` con
`prudent` (1,42 %), `succession` con `first` (2,52 %) y `last` (2,21 %),
`strangers_at_the_ford` con `worst` (1,02 %) — los cuatro al filo, ninguno lejos
del umbral. Partida terminada de `prudent` entre 2–12 % ❌, 1,7 %, al filo por
abajo como en la v2.24. **Partida terminada de `worst` ≥ 25 % ❌, 10,0 %. Y la
horquilla ≥ 20 puntos ❌, 8,3.**

**Con las políticas ya no degeneradas y trece contratos reparados, las dos
puertas se abren igual que en la v2.25 — y esta vez con el catálogo entero
detrás, no con tres opciones sueltas.** `worst` casi se triplica frente al 3,3 %
de la v2.25 (contra dos dientes), pero sigue a menos de la mitad del 25 % que
exige §12.9. **No es el bucle** —la horquilla lo demuestra: `last` y `worst`
dedican ahora el 43,9 % y el 41,3 % a su opción más repetida, dentro de banda,
no el 68,2 % de la v2.24— **y no es el instrumento** —`prudent` recibe crédito
por las marchas desde la v2.42 y sigue en 1,7 %—. Lo que queda, después de
descartar las dos explicaciones anteriores, es el catálogo: trece contratos
reparados no bastan para que jugar mal cueste lo que promete costar.

**Cobertura: una sola plantilla a cero.** Sumando las 240 partidas (60 semillas
× 4 políticas), `forest_cut` no aparece **ni una vez**. No es un problema de
`last`/`worst` concretamente —`tithe_demand`, `feud_inherited` y `smith_feud`
también caen a cero con ellas, pero salen con `prudent`/`first`—; `forest_cut`
está muda con las cuatro. Contenido muerto, medido y sin tocar.

**Categorías por mitad de partida, apariciones sumadas en 60 semillas:**

| Categoría | `prudent` 0–100 → 100–200 | `first` | `last` | `worst` |
|---|---|---|---|---|
| `lord` | 115 → 178 (+55 %) | 129 → 187 (+45 %) | 35 → 39 (+11 %) | 26 → 49 (**+88 %**) |
| `stranger` | 242 → 207 (−14 %) | 336 → 364 (+8 %) | 229 → 185 (−19 %) | 307 → 297 (−3 %) |
| `faith` | 27 → 3 (−89 %) | 26 → 0 | 25 → 7 (−72 %) | 27 → 0 |
| `feud` | 34 → 64 (+88 %) | 4 → 28 | 2 → 2 | 0 → 0 |

**`lord` y `stranger` no se desploman en la fase tardía — al contrario:** `lord`
sube en las cuatro políticas, hasta casi duplicarse con `worst`. El máximo en
vez del producto ha bastado para esto; no hace falta hablarlo. **Lo que sí se
desploma es `faith`**, sin que nadie lo pidiera: cae entre el 72 % y el 100 %
en las cuatro, y con `first` y `worst` desaparece del todo en la segunda mitad.
Ninguna semilla del catálogo actual toca su `story`; la explicación más simple
es que sus condiciones —fe alta, capilla en pie— dejan de sortear tan seguido
según el resto de la partida madura, no una supresión deliberada. Medido, no
tocado.

**Población perdida, cinco años después de que `worst` tome una opción dura:**

| Opción | Pérdida media | Veces tomada |
|---|---:|---:|
| `winter_grain_debt:refuse` | **54,35** | 75 |
| `hungry_spring:half_and_half` | 38,00 | 8 |
| `plague_pit:burn_the_houses` | 5,36 | 28 |
| `bandits:fight_them` | 4,11 | 205 |

Trece contratos deberían haber puesto dientes donde no los había, y en dos de
estas cuatro los puso: `refuse` (grano a cero, cosecha al 0,55 el año
siguiente) y `half_and_half` arrastran pérdidas de tamaño de aldea entera.
`fight_them` (un campo destruido) y `burn_the_houses` (parcelas bloqueadas 20
años) cuestan un puñado de vidas de media, no una aldea — la ventana de cinco
años puede ser corta para que un campo perdido se note en la mortalidad, o el
coste de estas dos puede seguir siendo insuficiente. La tabla no dice cuál;
dice que dos de trece contratos concentran casi toda la pérdida medida y las
otras once —las que no llegan a `hardOptionLoss` porque ni matan, ni destruyen,
ni penalizan cosecha— no aparecen aquí en absoluto.

**Presupuesto: cruzado.** 638,4 s contra los 600 de §14.2, un 6,4 % por encima
—38,4 s—. No es un cálculo que se haya vuelto más caro: es que las partidas
adversas, que antes se dispersaban hacia el año 25 y ahora sobreviven mucho más
cerca del horizonte de 200 años gracias al propio arreglo de A.15 y los
contratos, alargan el bucle principal del banco. **El mundo arreglado cuesta
más medir que el roto.** Ninguna semilla, año ni política se ha recortado para
caber; el presupuesto se deja fuera de banda a propósito, como hallazgo y no
como problema resuelto.

### 2.42 — Irse también vacía el valle

La política `prudent` rechazaba cualquier muerte inmediata antes de puntuar,
pero ignoraba el nuevo efecto `leave`; `worst` tampoco veía ese coste. Ambas
lecturas hacían que una expulsión pareciera gratis en el instrumento aunque la
población bajase igual. El filtro pasa a contar personas perdidas: suma muertes
y marchas, y sigue prefiriendo el mínimo antes de valorar grano y ánimo.
`worst` asigna a una marcha el mismo peso de 40 que a una baja inmediata.
El estado conserva la diferencia: quien se marcha mantiene `diedTick = null` y
no aparece en ninguna causa de mortalidad.

### 2.41 — Ninguna bandera muda

Tras conectar hambre, trabajo, disputas, clima, reputación y piedra, solo dos
banderas del inventario de v2.25 seguían sin lector. `burnt_row` era redundante:
las casas quemadas ya llevan `blockedUntil` y la semilla conserva su entrada y
su cicatriz visual. `unconsecrated` prometía abrir una plantilla que no forma
parte de las dieciséis del Anexo A; `unquiet_ground` conserva los costes reales
de fe y ánimo y su entrada de crónica, sin dejar estado perpetuo ficticio.

La prueba de forma enumera las banderas con lector y recorre efectos inmediatos
y diferidos del catálogo. Cualquier nombre nuevo falla hasta que su módulo
consumidor exista.

### 2.40 — La retirada termina en el camino

Las dos semillas `the_withdrawn` prometían que A o B se marcharía con otras dos
personas, pero siempre lo mataban y no tocaban a nadie más. El efecto `leave`
admite ahora `who:'random', count`; esa forma solo elige habitantes anónimos,
porque una salida con nombre necesita una letra del reparto y una historia que
la identifique. Cada semilla marca la salida del rival y de dos acompañantes,
reduce la población en tres y la crónica cuenta el camino en vez de una tumba.
Si quedan menos de dos anónimos, se marchan los disponibles.

### 2.39 — Un nombre que llega a Wealdmere

La semilla de A.14 `fight_them` escribía `a_name_in_the_valley`, pero ninguna
selección la observaba. Mientras la bandera esté activa, las plantillas `lord`
multiplican su componente `story` por 0,5. Si además existe `behind_the_wall`,
**los dos NO se multiplican**: se aplica el más fuerte (§8.6). La crisis del
señor conserva su multiplicador independiente. La prueba cubre el factor aislado y
su composición.

### 2.38 — La muralla cambia qué llega de fuera

La semilla de A.16 escribía `behind_the_wall` veinte a cuarenta años después de
abrir la cantera, pero selección no la leía. Mientras esté activa, el componente
`story` multiplica por 0,4 las plantillas de categorías `lord` y `stranger`.
No toca sus condiciones, reposos, límites ni el multiplicador de crisis: una
amenaza concreta todavía puede llegar, solo compite con menos peso en tiempos
ordinarios. La prueba compara ambas categorías con una historia de hambruna que
permanece en 1.

### 2.37 — Piedra para una cosa

A.16 dice que la cantera alcanza para una de dos transformaciones, pero M-14
mejoraba casas y empalizadas sin leer `stone_house_unlocked` ni `wall_unlocked`.
`nextUpgrade` exige ahora la bandera correspondiente; la iglesia conserva su
regla propia. La caché de «no hay proyecto» incorpora ambos desbloqueos para
que una decisión abra trabajo inmediatamente aunque el resto del valle no haya
cambiado.

`the_wall` añade `cold_houses` durante veinte años. En invierno, esa bandera
multiplica por 1,5 la leña necesaria por persona; al vencer vuelve al consumo
normal. Así «Cold houses for a generation» deja de ser una ganancia neta de
ánimo. Las pruebas cubren el bloqueo antes de elegir, la invalidación de caché,
el orden de mejoras ya abiertas y el gasto adicional de leña.

### 2.36 — Las laderas llegan a la cosecha

`bare_slopes` ya plantaba `flood_prone` de forma permanente veinte a cuarenta
años después de talar el bosque, pero el clima no la leía. `rollWeather` conserva
la tabla de §12.3 y, mientras la bandera está activa, traslada 0,05 de la fila
justa a la ruinosa: 20 % ruinoso, 35 % justo; las otras tres filas no cambian.
La misma tirada sobre el mismo flujo elige la fila, de modo que no se desplaza
ningún sistema aleatorio. Un barrido de 20.000 años comprueba ambas bandas.
El cambio de trayectoria saca `smith_feud` de la muestra rápida de doce partidas;
el barrido completo de 30 × 150 años sigue cubriendo las diecisiete plantillas y
las ocho categorías, por lo que A.7 queda clasificada entre las historias lentas.

### 2.35 — Lo que sale del bosque sale del mapa

§8.4 incorpora `{k:'fell', wood, permanent}` como petición al módulo M-15,
igual que `build` y `destroy` delegan en M-14. A.11 `fell_it` tala 900 unidades
con `permanent: true`; A.11 `take_the_edge` tala 300 con rebrote normal. La
madera que aparece en el almacén tiene así una pérdida idéntica en el bosque.

`forestAge = 254` queda reservado para una clara que no rebrota durante la vida
de la simulación; 255 sigue significando bosque virgen. El barrido anual omite
254 y los contadores normales saturan en 253. La tala menor añade
`forced_hunger` durante un tick: como la decisión precede al consumo, «the
children are hungry now» se cobra esa misma semana con severidad mínima 0,5.
El informe semanal suma la madera de encrucijada a la tala ordinaria y el evento
del último bosque viejo también detecta una tala decidida antes del paso 5.

### 2.34 — La madera que no guarda grano

«The next lean year will be leaner» prometía una deuda sin definir qué año era
magro ni cuánto empeoraba. A.9 ocurre una vez y contrapone capilla y granero: al
elegir la capilla, la próxima cosecha usa el mecanismo contado en siegas de
§5.3 con factor 0,8. El precio visible pasa a «The next harvest comes in one
fifth lighter». La penalización no se repite ni depende del año civil; se
consume en la primera siega posterior a la decisión.

### 2.33 — El coste antes de elegir

A.13 `feed_them_and_send_them_on` cobra 60 fanegas, frente a las 40 de acoger
al grupo. Puede ser más barato a largo plazo porque evita nueve bocas, pero el
texto visible no decía ese horizonte y afirmaba simplemente «It costs less».
El precio pasa a «Sixty bushels, and they leave before nightfall»: expone la
cifra que el motor descontará y deja al jugador comparar población y grano sin
una promesa ambigua. No cambia ningún efecto ni constante de balance.

### 2.32 — Una pared no es una reconciliación

El precio de A.7 `build_together` dice «Neither forgives it», pero sus dos
efectos de opinión sumaban 15 y deshacían el rencor que da sentido a la
consecuencia `uneasy_truce`. Ambos pasan a `−15`: trabajar juntos levanta cuatro
tramos de empalizada y mejora el ánimo colectivo, mientras la relación personal
empeora. La prueba resuelve la opción real, comprueba los cuatro proyectos y
las dos direcciones de opinión.

### 2.31 — Silenciado, todavía sacerdote

En A.6 la letra A es necesariamente quien ocupa el sacerdocio. El precio de
`silence_a` dice «The village keeps its priest and loses its faith», pero un
efecto posterior ponía su `role` a `null`. Se elimina esa contradicción: A
conserva el oficio, pierde autoridad mediante `faith −30`, `morale −5` y el
recuerdo de haber sido culpado. La consecuencia `no_shepherd` conserva su
condición; solo se cobra si el sacerdote muere y el puesto está vacío cuando
vence. Una prueba resuelve la opción completa y comprueba oficio y fe.

### 2.30 — La disputa llega antes que el olvido

Las semillas de A.4, A.6, A.8 y A.15 ya escribían `feud_ripe`, pero la selección
no la leía. El retraso de una semilla deja una ventana corta: todavía deben
coexistir el agraviado, su contrario, población suficiente y un reparto válido.
Durante los cinco años de la bandera, esta sustituye el umbral ambiental de
rencor de A.7 y A.8: la semilla ya es la prueba de que existe una deuda concreta.
La plantilla conserva sus demás condiciones y debe poder completar el reparto.
Si resulta elegible, recibe `FEUD_RIPE_MULTIPLIER = 4`; no omite su reposo ni el
techo, solo evita que otra historia consuma la ventana que una consecuencia
anterior abrió expresamente.

El factor iguala el de crisis y queda en §12.8. La prueba de selección separa
su componente `story` del de crisis y de los rasgos para que la procedencia del
peso siga siendo auditable.

### 2.29 — Un nombre que cruza el vado

`role null` solo deja un oficio vacante; no expulsa a nadie. §8.4 incorpora
`{k:'leave', who}` para los dos verbos que prometen echar a un personaje: A.4
`believe_b` y A.8 `send_b_away`. La resolución marca `leftTick`, conserva al
aldeano en el registro histórico, lo retira del reparto vivo de nombres y
devuelve su id en `AppliedEffects.left`. El orquestador suma esa salida al
informe semanal y escribe el suceso de marcha, igual que la migración anual.

La prueba de propiedad exige simultáneamente que la población baje en uno, que
el personaje no conste como muerto y que deje de ser elegible para otro reparto.

**Hallazgo aguas abajo.** El barrido de 30 semillas × 150 años deja mudas A.7 y
A.8: la política del banco toma primero A.4 `believe_b` y ahora el agraviado se
marcha de verdad, por lo que ya no queda disponible para su disputa posterior.
Esto confirma que `feud_ripe`, escrita para transportar el conflicto entre
historias, necesita un lector propio. Se corrige en la fase siguiente y no
alterando la semántica de la expulsión.

### 2.28 — Cuando las manos no construyen

La bandera única `works_slowed` mezclaba tres contratos distintos y nadie la
leía. Se sustituye por tres banderas explícitas: `works_slowed_85`,
`works_slowed_80` y `works_slowed_40`. `produce` aplica a los puntos de obra el
factor activo más bajo; la tala y los campos conservan su asignación normal,
porque los tres efectos escritos hablan de obra. Los solapes no multiplican
penalizaciones que el catálogo nunca prometió.

A.7 dura cuatro años al 85 %, A.15 dos años al 80 % y A.12 seis ticks al 40 %.
La prueba recorre un solape y ambas caducidades, demostrando la transición
0,40 → 0,85 → 1 sin inspeccionar la implementación.

### 2.27 — Los días que gana la peste

La duración de un brote ya iniciado no puede expresarse con una bandera de un
año: leerla cada semana repetiría el ajuste, y leerla al crear el brote llegaría
demasiado pronto. §8.4 incorpora `{k:'outbreak', weeks}` y la resolución mueve
`endsTick` una sola vez, sin permitir que retroceda antes del tick actual.

A.5 aplica +3 semanas al bendecir, −3 al abrir la fosa y −4 al quemar las casas.
A.6 aplica +2 al callar. La prueba de propiedad verifica extensión, reducción y
el límite temporal. Esta rama no cambia ninguna otra consecuencia de peste.

**Verificación.** TypeScript, ESLint y 556 pruebas ejecutables pasan; quedan dos
pendientes. `feud_inherited` salió de la muestra rápida tras cambiar estas
historias, pero sigue apareciendo en el barrido completo de 30 semillas × 150
años, que pasa íntegro; se clasifica por ello entre las plantillas lentas.

### 2.26 — Semilla o pan

A.3 queda aislada en su propia rama. `sow_it` conserva una bandera semanal,
ahora leída por `consume`: durante exactamente ocho ticks la severidad es como
mínimo 0,5. `eat_it` y `half_and_half` dejan de poner `lean_harvest` y
`half_harvest`, banderas muertas, y usan `{k:'harvest'}` con 0,55 y 0,78 para
una siega. El modificador se consume al cosechar, no al pasar un año civil.

**Criterio.** Las pruebas directas deben demostrar activación y caducidad del
hambre y el mecanismo ya probado de cosecha debe recibir los dos factores del
catálogo. El balance se mide al reunir las ramas de contratos; una sola
plantilla no justifica gastar de nuevo los nueve minutos del banco.

### 2.25 — El precio escrito es un contrato

- **§8.1 · Regla nueva.** El texto de la columna «Precio» promete algo. Si los
  efectos no lo entregan, la plantilla miente y el jugador aprende que las
  opciones duras son palabrería. Es la regla que faltaba, y la auditoría de esta
  ronda dice cuánto hacía falta.
- **§12.9 · La horquilla manda; el ≥ 25 % de `worst` es secundario.** El 25 % es
  una suposición de la v2.0, anterior al catálogo — de la misma cosecha que el
  rango 1–4 de cadencia que ya se corrigió en la v2.10 al medirlo. Lo que
  encarna el principio 2 de `valle.md` no es una cifra absoluta de muertes: es
  la **separación** entre jugar bien y jugar mal. Una aldea que aguanta el
  desastre no incumple nada; una donde da igual lo que se elija, sí.
- **§12.9 · Dos umbrales mal calibrados.** El pico mediano pasa de 65–82 a
  **65–85**: fallar por un habitante es ruido, no señal. Y «una sola opción
  < 40 %» sube a **< 45 %**, porque el 40 era inalcanzable: con la regla de no
  degeneración una opción todavía puede llevarse dos de cada tres apariciones de
  su plantilla, y `succession` es el 60 % de lo que se pregunta a las políticas
  adversas — dos tercios de 60 son 40. **El techo es estructural**, y un aserto
  que no se puede cumplir no avisa de nada.
- **§8.5 · Los dientes salen de componer, no de subir números.** Una decisión
  mala tiene que ser sobrevivible; tres seguidas, no. Efectos más grandes harían
  que una sola tirada liquide la partida, y eso choca de frente con «decisiones
  raras y pesadas»: si la primera te mata, no hay segunda.

**Auditoría del contrato: las 48 opciones.** Recorridas una a una, comparando el
precio escrito con los efectos que se ejecutan.

| | Opciones |
|---|---:|
| ✅ El precio se cobra | **26** |
| ⚠️ A medias o contradictorio | **9** |
| ❌ El precio no se cobra | **13** |

**La causa es una sola, y no son trece defectos sueltos: son 14 banderas que
nadie lee.** El documento especificaba costes mecánicos reales —«`severity`
forzada a 0.5 durante 8 semanas», «cosecha del año ×0.55», «brote +3 semanas»,
«obra ×0.4 durante 6 semanas»— y M-08 los implementó como banderas con nombre.
Nunca se escribió el sistema que las leyera. Medido: de las 19 banderas que pone
el catálogo, solo **cinco** hacen algo — `hostile` (bloquea llegadas y condiciona
tres plantillas), `threatened` (enruta crisis y prioriza la empalizada),
`vassal`, `watched` y `proud` (condicionan plantillas). Las otras catorce
—`forced_hunger`, `lean_harvest`, `half_harvest`, `feud_ripe`, `outbreak_slower`,
`outbreak_faster`, `unconsecrated`, `burnt_row`, `works_slowed`, `flood_prone`,
`a_name_in_the_valley`, `wall_unlocked`, `stone_house_unlocked`,
`behind_the_wall`— se ponen y no las lee nadie, ni el motor ni otra plantilla.

Eso explica la tabla del banco mejor que ninguna constante: **el catálogo no es
blando, es que buena parte de su dureza no está conectada.**

Las trece que mienten, por plantilla:

| Plantilla · opción | Precio escrito | Lo que hace | Por qué miente |
|---|---|---|---|
| A.1 `refuse` | People will die this winter | `morale +10`, `flag proud` | Nadie muere. Es **ganancia neta** |
| A.3 `sow_it` | A hungry summer | bandera muerta, `morale −8` | El doc pedía `severity` 0.5 ocho semanas |
| A.3 `eat_it` | A thin harvest | **`grain +300`**, bandera muerta, semilla **vacía** | El doc pedía cosecha ×0.55. Ganancia pura |
| A.3 `half_and_half` | Both, and neither enough | **`grain +140`**, bandera muerta | El doc pedía cosecha ×0.78. Ganancia neta |
| A.4 `believe_b` | {A} is cast out | `role A null`, `morale −6` | A no se va: pierde el oficio. El doc pedía `people −1` |
| A.5 `bless_them` | The sickness has more days to work | `faith +18`, `morale +6`, cementerio gratis | El brote no dura ni un día más. Ganancia pura |
| A.6 `silence_a` | The village keeps its priest… | `faith −30`, **`role A null`** | A **es** el cura: el precio se contradice a sí mismo |
| A.8 `send_b_away` | The valley loses a pair of hands and a name | `role B null`, `morale −4` | B sigue en la aldea trabajando. El doc pedía `people −1` |
| A.9 `the_chapel` | The next lean year will be leaner | capilla gratis, `faith +20`, `morale +10` | Nada hace peor el año magro. Ganancia pura |
| A.11 `fell_it` | The wood does not come back in a lifetime | 2 campos gratis, `wood +900` | **No se tala ni una celda**: ningún efecto toca el terreno, y §7.5 rebrota a los 8 años |
| A.11 `take_the_edge` | Slower, and the children are hungry now | 1 campo gratis, `wood +300` | Coste cero. Nadie pasa hambre |
| A.12 `keep_everyone_inside` | Nothing gets done for a month | bandera muerta, `wood −60`, `morale −8` | El trabajo no se detiene |
| A.16 `the_wall` | Cold houses for a generation | bandera muerta, `morale +6` | Ni casas frías ni desbloqueo: M-14 ya permite `wall` sin bandera |

Las nueve a medias: A.4 `believe_a` y A.15 `choose_a`/`choose_b` (el recuerdo es
real, la semilla es una bandera muerta); A.5 `burn_the_houses` (las casas caen y
se reconstruyen); A.6 `say_nothing` (el precio se cumple por accidente, porque
el brote acaba solo); A.7 `build_together` (el precio dice que nadie perdona y el
efecto inmediato es **opinión +15 en ambos sentidos**); A.13 `feed_them_and_send_them_on`
(«cuesta menos» y cuesta 60 de grano frente a los 40 de acogerlos: cuesta
**más**); A.14 `fight_them` (el precio no promete ningún coste, y el resultado
neto es ganancia); A.16 `the_houses` (el precio no promete coste; la semilla sí
entrega).

**El experimento de los tres dientes.** Solo las tres que ya prometían un coste y
no lo entregaban. Dos de ellas necesitaban mecanismos que no existían, y se
escriben aquí porque son los que el Anexo A lleva pidiendo desde A.3:

- **§5.3 · `GameState.harvestModifier`** y el efecto `{k:'harvest', factor,
  harvests}`. La siega que una decisión ya se gastó. Se cuenta en siegas y no en
  semanas, para que «la cosecha del año siguiente» sea la siguiente se decida en
  primavera o la víspera de segar.
- **§7.4 · `Building.blockedUntil`** y `destroy.blockYears`. El tercer caso que
  el catálogo pedía y §3 no tenía: suelo quemado que nadie toca en unos años.
  §7.4 tenía ruina de madera —se edifica encima— y ruina de piedra —nunca—; esto
  es la de en medio, y es lo que la semilla `the_burnt_row` decía desde el
  principio.

Los tres cambios: `winter_grain_debt:refuse` vacía el granero y deja la siguiente
siega al 0,55; `bandits:fight_them` añade `destroy field 1`;
`plague_pit:burn_the_houses` deja las dos parcelas quemadas veinte años.

**Resultado. La hipótesis se confirma en dirección y se queda corta en tamaño:**

| | v2.24 | con los tres dientes |
|---|---:|---:|
| Terminadas, `prudent` | 1,7 % | **1,7 %** |
| Terminadas, `first` | 1,7 % | 1,7 % |
| Terminadas, `last` | 8,3 % | 8,3 % |
| Terminadas, `worst` | 3,3 % | **8,3 %** |
| **Horquilla `worst`−`prudent`** | 1,7 pts | **6,7 pts** |
| Pico mediano, `prudent` | 83 | 83 |
| Cadencia, las cuatro | 3,82–4,15 | 3,80–4,25 |

`worst` se multiplica por 2,5 y `prudent` no se mueve **ni un punto**, que es lo
que decía la hipótesis. Y no se mueve por la razón más limpia posible: de las
tres opciones tocadas, `prudent` no elige **ninguna** en 60 partidas — 0, 0 y 0.
El mecanismo no es romo; es que sólo alcanza a quien elige mal.

Que dispara está comprobado: `worst` toma `refuse` 58 veces (44 de sus 60 valles
ven la cosecha penalizada), `fight_them` 207 y `burn_the_houses` 31. `first`
quema un campo 118 veces y **su terminación no se mueve del 1,7 %** — que es, por
sí solo, la mejor medida de lo blando que sigue siendo el resto.

**Pero 6,7 puntos contra los 20 que pide la horquilla, y 8,3 % contra el 25 %.**
Tres opciones de trece no bastan, y era previsible: la auditoría dice que el
problema es sistémico y de catorce banderas, no de tres plantillas. **Nada más se
toca en esta ronda.**

**Presupuesto.** El banco tarda 551,9 s de 600. El experimento no lo cruzó —bajó
ocho segundos respecto a los 560,6 de la v2.24, dentro del ruido—, pero el margen
sigue siendo de menos de un minuto y no se ha optimizado nada.

### 2.24 — El instrumento, no el juego

- **§12.9 · Regla de no degeneración en las cuatro políticas.** El hallazgo de la
  ronda: `last` y `worst` contestan `succession:no_one` **178 de 178 veces**, y
  el 68,2 % de todas sus decisiones va a esa única opción. Con las consecuencias
  de la v2.22 eso las lleva al 100 % de terminaciones y a una horquilla de 98,3
  puntos — **así que los dos umbrales adversos de §12.9 “pasan” midiendo una sola
  opción en vez del juego.** Un aserto que pasa por el motivo equivocado es peor
  que uno que falla: deja de avisar. Ninguna de las dos políticas mira más allá
  de la semana en curso, así que jamás ve el coste diferido de repetir. **Un
  jugador que elige mal no elige lo mismo ciento setenta y ocho veces.** La regla
  —no repetir una opción elegida en las dos apariciones anteriores de su
  plantilla— corrige el instrumento y no toca el juego. Las cifras adversas de la
  v2.23 quedan **anuladas** hasta volver a medirlas con ella.
- **§12.9 · `hostile` inalcanzable para `prudent` es correcto**, no un defecto.
  Un castigo que el juego prudente no alcanza es un castigo que funciona. Lo
  traté como contenido muerto durante dos revisiones y me equivoqué; el peso del
  ánimo en 3 se queda, pero por su propio motivo.
- **§12.3 · `MIN_FIELD_CREW` es un invariante inerte**, y así queda escrito:
  ninguna partida bajó nunca de 2,13 adultos por campo. Se conserva porque es
  correcto y barato, no porque haga trabajo.
- **§5.7 · El abandono se queda.** Dispara 1 de 60 con `prudent` y 4 de 60 con
  las adversas: es un final poco frecuente y en la dirección correcta, no una red
  que sostenga el balance.

**Medido con la regla en pie (M-21).** 60 semillas × 200 años, las cuatro
políticas, 560,6 s de los 600 del presupuesto. Nada ajustado.

| Métrica | `prudent` | `first` | `last` | `worst` | Umbral |
|---|---:|---:|---:|---:|---|
| Partidas terminadas | 1,7 % | 1,7 % | 8,3 % | **3,3 %** | 2–12 % / ≥ 25 % |
| Horquilla `worst`−`prudent` | | | | **1,7 pts** | ≥ 20 |
| Decisiones en una sola opción | 22,2 % | 23,8 % | 39,9 % | **41,1 %** | < 40 % |
| Cadencia por generación | 3,82 | 3,81 | 4,12 | 4,15 | 1–5 |
| Cadencia máxima | 5,60 | 5,20 | 5,50 | 5,50 | ≤ 7 |
| Mediana del pico | **83** | 83 | 81 | 81 | 65–82 |
| Mapas llenos < año 120 | 95,0 % | 96,7 % | 70,0 % | 71,7 % | ≥ 60 % |
| Rangos / geometría | 0/0 | 0/0 | 0/0 | 0/0 | 0 |

**La regla funciona: el instrumento ya mide el catálogo.** `last` y `worst`
pasan de 8 opciones distintas cada una en la v2.23 a 22 y 21, y de 261
decisiones a 2.361 y 2.465 — comparables a las 2.288 de `prudent`. La cadencia
entra en banda en las cuatro, y el máximo baja de 9,37 a 5,50. `succession:no_one`
cae del 68,2 % al 39,9 % en `last` y al 41,1 % en `worst`, que es **justo el
techo estructural que la regla permite**: dos de cada tres apariciones de una
plantilla que supone el 60 % de sus decisiones.

**Y con el instrumento arreglado, las dos puertas se abren.**

1. **`worst` termina el 3,3 % de las partidas, contra el 25 % que exige §12.9.**
   No es que no tome opciones duras: toma `bandits:fight_them` 218 veces en 58
   valles, `strangers_at_the_ford:turn_them_away` 211, `hungry_spring:sow_it` 80,
   `winter_grain_debt:refuse` 66, `first_stone:the_wall` 58,
   `plague_pit:burn_the_houses` 34. Las toma, y la aldea sobrevive igual: mediana
   de población final de los supervivientes, 62. **El catálogo no tiene dientes**,
   y ahora está medido con la atribución por opción delante, no supuesto.
2. **`prudent` termina el 1,7 %, por debajo del 2 % de la banda.** Al filo, como
   estaba, y ahora al otro lado. La horquilla entre jugar bien y jugar mal es de
   **1,7 puntos**: el principio 2 de `valle.md` sigue sin cumplirse, y el 98,3 de
   la v2.23 era el artefacto que esta regla vino a borrar.

**Lo que no llega, además.** El pico mediano de `prudent` es 83 contra el techo
de 82 — un habitante—, `worst` se pasa del 40 % por una décima, y `smith_feud`
sigue por encima del 1 % de elegibilidad con `prudent` (1,69 %) y `first`
(1,38 %), como desde la v2.20. Ninguna de las tres se ha tocado.

**Coste.** El banco sube de 352,8 s a 560,6 s: las partidas adversas ya no se
dispersan en el año 25, así que casi todas llegan a los 200 años. Sigue dentro
de los 600 s de §14.2, con menos margen del que había.

### 2.23 — Verificación bajo el mundo corregido

**PARTE 0 · Los tres ⚠ re-medidos, sin tocar nada, sobre el mundo de la v2.22.**

- **Abandono.** 60 semillas × 200 años, las cuatro políticas, antes de tocar
  A.15: `prudent` 1/60 (1,7 %), `first` 1/60 (1,7 %), `last` 4/60 (6,7 %),
  `worst` 4/60 (6,7 %). Cero extinciones puras en las cuatro. No es contenido
  muerto —dispara, y más en las políticas peores, que es la dirección
  correcta— pero tampoco es una red de seguridad que se note: la inmensa
  mayoría de las partidas no la necesita. Sigue sin ajustarse.
- **`hostile`.** Sigue sin activarse con `prudent` ni con `first` —0/60 en
  ambas— después de que M-17 bajara el peso del ánimo de 15 a 3. Con
  `last`/`worst` sí: 36/60 y 34/60. La aritmética de por qué no se mueve:
  `take_them_in` cuesta 40 de grano y da +6 de ánimo (puntuación −40+18=−22);
  `turn_them_away` no cuesta grano y pierde 8 de ánimo (puntuación −24). Acoger
  sigue ganando, por dos puntos. El margen es estrecho pero no es cero, así
  que bajar el peso del ánimo un paso más lo volcaría — y eso no se ha hecho
  aquí: se deja anotado, no decidido.
- **`MIN_FIELD_CREW`.** Nunca se viola. Muestreado cada 12 ticks en las cuatro
  políticas —entre 45 826 y 47 280 muestras por política—, la proporción de
  adultos por campo trabajado nunca baja de 2,13. La regla es correcta y
  sigue inerte: no hay ninguna partida donde estuviera decidiendo algo. Se
  deja como está, tal como pediste.

**PARTE 1 · A.15, implementado según la v2.22.** Tres mecanismos, todos sobre
maquinaria que ya existía — ningún efecto nuevo en el catálogo:

- Mientras el puesto de líder esté vacante, la puerta de llegada de §5.7 exige
  además `holderOf(state, 'leader') !== null`: sexta puerta, nadie se muda a
  un valle sin nadie al mando.
- Mientras esté vacante, la cuenta de quienes se marchan se dobla. El
  multiplicador escala la tirada ya hecha en vez de tirar otra vez, así que
  una semana sin líder no consume un número más del flujo que una con él.
- Al tercer `succession:no_one` seguido sin que se haya nombrado a nadie entre
  medias, la aldea se dispersa: `EndState.cause: 'dispersed'`, todos a
  `leftTick`, línea de crónica propia (`dispersal`, peso 3, banco de
  `chronicle/bank.en.ts`) distinta de `abandonment`. El contador,
  `state.noOneStreak`, se reinicia al elegir `{A}` o `{B}`.

**Medido después, 60 semillas × 200 años:**

| Métrica | `prudent` | `first` | `last` | `worst` |
|---|---:|---:|---:|---:|
| Partidas terminadas | 1,7 % | 1,7 % | **100 %** | **100 %** |
| Horquilla `worst`−`prudent` | | | | **98,3 puntos** |
| Mediana del pico | 83 | 83 | 29,5 | 29,5 |
| Cadencia media | 3,78 | 3,79 | 4,36 | 4,41 |
| Cadencia máxima | 5,70 | 5,40 | **9,37** | **9,37** |
| Opción más repetida | `succession:choose_a` 31,4 % | `succession:choose_a` 34,8 % | `succession:no_one` **68,2 %** | `succession:no_one` **68,2 %** |

`prudent` y `first` no se movieron: terminación y pico idénticos a los de antes
de tocar nada. No es que se hayan protegido a mano — **`prudent` nunca contesta
`no_one`**: de 711 sucesiones resueltas en las 60 partidas, las 711 nombran a
alguien (`policy-attribution`, columna `chooseA`). Casi nunca deja el puesto
vacante más de una semana, así que las tres consecuencias nuevas no tienen
ocasión de aplicarse. El pico y la terminación de `prudent` quedan tal como
estaban porque el mecanismo que los movería no llega a rozarlos.

`last` y `worst` sí lo tocan: de tirar hasta 3 519 decisiones en 60 partidas
(v2.21, con el bucle sin consecuencias) pasan a 261. El bucle ya no es
infinito, y la horquilla se dispara de 5 a 98,3 puntos — muy por encima del
mínimo de 20. **Pero sigue siendo un bucle, no una elección**: `last` responde
`no_one` las 178 veces que se le pregunta —no 177, no 179: las 178— porque
`no_one` es literalmente la última opción de la lista, que es todo lo que
`last` mira. `worst` también responde `no_one` las 178 veces, porque su coste
inmediato (12 de ánimo + 6 de fe = 18) supera al de nombrar a alguien (0, ya
que `role`, `opinion` y `memory` no puntúan en `immediateCost`). Ninguna
consecuencia que se le añada a `no_one` cambia esa aritmética: ambas políticas
deciden sin mirar lo que pasa después de la semana en curso.

**Por eso el aserto nuevo de §12.9 —menos del 40 % de las decisiones en una
sola opción— sigue fallando, con 68,2 % en las dos**, y por eso la cadencia
máxima se dispara a 9,37: una partida que se resuelve en diez años concentra
sus tres sucesiones en muy pocas generaciones. Ninguna de las dos cosas es el
bucle infinito que había: son la huella de un final que ahora llega rápido en
vez de nunca.

**No se abre la conversación sobre los efectos del catálogo.** La condición
que la abriría era `worst` por debajo del 25 % de terminación estando ya fuera
del bucle. Está en el 100 %. Por la regla que se puso esta misma ronda, aquí
se para.

**No es nuevo, y sigue sin explicarse del todo.** `smith_feud` sigue cruzando
el 1 % de elegibilidad con `prudent` (1,74 %) y con `first` (1,20 %) — ya
estaba entre los diez asertos rojos que la v2.20 dejó anotados como límites de
balance abiertos, antes de que existiera A.15. No se ha medido si el margen se
movió con esta ronda; con el resto del rediseño encima no se puede aislar la
causa sin una medición dedicada, y no se ha hecho. Sigue anotado, no tocado.

**Herramientas.** `npm run attribution` mide (a)-(d) de la ronda anterior
sobre el mundo actual; `npm run policy:attribution` es la que ya existía de la
v2.21, vuelta a correr — su tabla de arriba es la que sostiene los números de
esta sección.

### 2.22 — El problema invertido

Con la peste arreglada, **el problema es el contrario del que perseguí durante
cinco revisiones**. No es que las encrucijadas maten demasiado: es que
**el jugador no puede perder aunque lo intente**. `worst` termina 4 partidas de
60 y la horquilla contra `prudent` es de 5 puntos. Eso incumple el principio 4
de `valle.md` más gravemente que el 66 % de terminaciones anterior, porque un
juego donde jugar mal no tiene consecuencias no tiene drama, solo contemplación.

- **Anexo A.15 · Quedarse sin líder deja de salir gratis.** La atribución mostró
  que `last` y `worst` dedican el **93 % de sus decisiones** a `succession:no_one`
  —54,5 por partida— y les quedan unas 250 para todo el resto del catálogo. La
  opción no resuelve nada y vuelve a plantear la misma pregunta. Ahora, mientras
  el puesto esté vacante: **ninguna llegada** —nadie se muda a un sitio donde
  nadie manda—, **marchas ×2**, y **dispersión al tercer «No one» consecutivo**.
  No se toca ni un efecto del catálogo: son mecanismos que ya existen.
- **§12.9 · Aserto nuevo:** ninguna política puede dedicar más del 40 % de sus
  decisiones a una sola opción. Una política adversa atrapada en un bucle no
  está midiendo el catálogo, está midiendo el bucle.
- **§12.9 · Las bandas miden «partida terminada»**, no «extinción»: con el
  abandono en pie, casi todos los finales son abandonos y seguir llamándolo
  extinción es contarse un cuento.
- **Registro · Aviso de contaminación** sobre las entradas 2.10 a 2.17, con las
  cuatro decisiones que hay que volver a justificar marcadas con ⚠.

**Qué NO se toca todavía:** la terminación de `prudent` (1,7 % contra la banda
2–12 %) y el pico de población (83 contra 65–82). Los dos están al filo y los dos
se moverán cuando la sucesión tenga consecuencias. Ajustarlos ahora sería repetir
el error que este aviso documenta.

### 2.21 — Qué elige realmente la política adversa

El banco dice que `last` y `worst` crecen menos, pero no terminan mucho más que
`prudent`. También dice que `succession` domina su elegibilidad y su cadencia.
Eso no basta para tocar la plantilla: la elegibilidad mide cuánto tiempo puede
salir una pregunta, no cuántas veces se eligió cada respuesta ni qué otras
opciones separan las políticas.

**Medición.** `npm run policy:attribution` corre `prudent`, `last` y `worst`
sobre 60 semillas × 200 años. Cuenta cada par plantilla–opción, cuántas partidas
lo vieron y cuántas decisiones y sucesiones hubo por generación. No cambia el
catálogo ni introduce umbrales.

**Hipótesis falsable.** Si casi toda la cadencia adicional es
`succession:no_one` y la política adversa apenas toma opciones con muertes o
destrucción diferida, A.15 está absorbiendo el presupuesto de decisiones sin
convertir la obstinación en riesgo terminal. Si las decisiones destructivas ya
son frecuentes, el fallo está en su magnitud o en la recuperación posterior.

**Resultado: hipótesis confirmada.** Sobre las 60 semillas, `prudent` toma 2.249
decisiones: 705 son sucesiones y en todas nombra a A. `last` toma 3.517 y
`worst` 3.519; respectivamente 3.269 y 3.275 son `succession:no_one`, en las 60
partidas. La negativa ocupa aproximadamente el 93 % de todo su historial y se
repite unas 54,5 veces por valle, frente a 11,75 sucesiones resueltas por valle
con `prudent`. Solo quedan 248 y 244 decisiones adversas para el resto del
catálogo. A.15 no está haciendo más variada ni más peligrosa la mala política:
está desplazando casi todas sus demás oportunidades de hacer daño.

**Siguiente experimento.** Al vencer `the_leaderless_years`, A toma el cargo en
la rama experimental. No se añaden muertes ni se cambia la respuesta inicial:
se aísla únicamente si cerrar la vacante tras pagar los 2–4 años de desgobierno
devuelve variedad, cadencia y riesgo a la política adversa. El cambio no se hace
permanente hasta medirlo.

### 2.20 — El solar que no aparece por insistir

Cuando `nextProject` no encuentra nada que construir, `advanceWorks` repetía la
misma búsqueda completa la semana siguiente. En un valle lleno, cada intento
recorre hasta 2.016 posiciones para cada edificio deseado y después vuelve a
probar todas las mejoras. El perfil de v2.19 señala esta repetición como el coste
dominante del banco.

**Regla de caché.** Solo se recuerda el resultado nulo y solo dentro de la misma
partida. Se invalida si cambia la población viva, qué costes de madera pueden
pagarse, la puerta de granero, la de fe, el estado efectivo de `threatened`, la
descripción completa de los edificios o cualquier celda del terreno. Las rutas
no invalidan un fracaso: alteran cuál es el mejor solar entre los válidos, pero
no convierten un mapa sin solar en uno edificable. La caché es derivada, vive en
un `WeakMap` y no entra en el estado serializado.

**Criterio.** El banco debe conservar exactamente sus resultados de v2.18 y
bajar de forma material los 201,59 s de las 60 semillas `prudent`. Una prueba de
propiedad debe demostrar que una puerta que se abre después de un fracaso inicia
la obra; no se comprueba la existencia interna de la caché.

**Resultado focalizado.** Además del recuerdo de resultados nulos,
`placeBuilding` construye una sola máscara de ocupación por búsqueda, marca las
celdas de campo una vez y evalúa la envolvente sin crear listas por candidato.
Son las mismas reglas y los mismos desempates. Las 60 semillas `prudent` tardan
aproximadamente 67,6 s, frente a 201,59 s, y repiten exactamente 1/60 partidas
terminadas, pico mediano 83 y 58/60 mapas llenos antes del año 120. La suite
rápida pasa 525 pruebas, con dos pendientes, en 11,92 s.

**Resultado completo: presupuesto recuperado.** El banco de 60 semillas × 200
años × cuatro políticas, incluidas las ramas de choque, tarda 536,90 s frente a
1.143,63 s en v2.18. Conserva exactamente todas las métricas de aquella versión,
con cero estados inválidos y cero fallos de geometría. Sus diez asertos rojos
son los límites de balance ya abiertos: pico y extinción marginales de
`prudent`, elegibilidad de `smith_feud`, cadencia y elegibilidad de `succession`
en `last`/`worst`, y la escasa mortalidad y horquilla de la política adversa.
M-12 vuelve a cumplir su presupuesto sin reducir la muestra.

### 2.19 — El coste de andar

Con la peste corregida, casi todas las partidas y sus ramas de choque llegan a
200 años. El banco pasó de 443,0 a 1.143,63 s. El coste no se arregla recortando
la muestra: el motor recorría las 2.016 celdas del mapa dos veces cada semana,
una para decaer tráfico y otra para comprobar si cambiaba el camino, aunque casi
todas estuvieran a cero.

**Implementación.** `paths.ts` mantiene en un `WeakMap` el conjunto de celdas
con tráfico o camino. Es caché derivada, como las rutas: no se serializa, cada
clon tiene la suya y puede reconstruirse desde el mapa. `upgradePaths` ordena
los índices antes de emitir cambios, de modo que conserva el mismo orden que el
recorrido completo anterior.

`forest.ts` conserva también en un `WeakMap` el árbol que se está talando. Una
celda contiene 300 unidades y suele tardar muchas semanas en caer; mientras siga
en pie y el centro de la aldea no cambie, volver a recorrer el mapa solo puede
dar la misma respuesta. Al caer la celda o moverse el núcleo, el objetivo se
calcula de nuevo con los mismos desempates.

La clave de destinos incluye todos los pares aldeano–casa y las posiciones de
campos y obras. La clave anterior solo guardaba longitud y extremos de la
cuadrilla: cambiar un trabajador intermedio o su casa podía dejarle la ruta
anterior aunque el número de trabajadores siguiera igual.

**Criterio.** El estado final, los eventos de camino y las bandas del banco deben
ser idénticos a v2.18. Solo puede cambiar el tiempo. Si el banco sigue por encima
de 600 s, se perfila el siguiente coste; no se rebaja el número de observaciones.

**Resultado parcial.** Las pruebas focalizadas de caminos bajan y el informe de
60 semillas `prudent` tarda 201,59 s, prácticamente lo mismo que antes. Un perfil
de CPU de una partida completa coloca `canPlace`, `onEnvelope` y
`placeBuilding` muy por encima de rutas y bosque. El cuello real es volver a
buscar cada semana un solar para una obra que sigue sin caber. Las cachés se
conservan porque eliminan trabajo lineal y corrigen la identidad de los
trayectos, pero no cierran el presupuesto de M-12. La siguiente optimización
pertenece a M-14 y debe invalidar un fracaso de colocación cuando cambien
ocupación, terreno o las puertas que hacen deseable la obra.

**Verificación.** TypeScript, ESLint y las 524 pruebas ejecutables pasan; las dos
pendientes siguen reservadas para M-20/M-23. La suite completa tarda 14,70 s.

### 2.18 — La peste que no terminaba

La puerta de población de v2.17 no movió una sola semilla porque no era la
puerta cerrada. En las aldeas que terminan, el ánimo mediano de las tres décadas
finales está entre 10,2 y 10,5: no llega a 50, y apenas llega a 30 entre el 1 %
y el 7 % de los años. Esa cifra coincide con el suelo de fe, no con una deriva
normal hacia 50.

**Causa.** La mortalidad comprobaba correctamente `startedTick ≤ tick <
endsTick`, pero ánimo y fe comprobaban solo `outbreak !== null`. Como el objeto
no se limpiaba al vencer, el primer brote aplicaba `MORALE_OUTBREAK` y
`FAITH_OUTBREAK` todas las semanas durante el resto de la partida. La misma
referencia no nula impedía además que `rollPlague` hiciera tiradas en años
posteriores.

**Regla cerrada.** `Outbreak` representa exclusivamente un brote activo. Se
limpia en el primer tick posterior a `endsTick`; todos los consumidores usan la
ventana temporal, y un brote vencido no bloquea la tirada anual siguiente. Esto
no cambia ningún número de §12: hace cumplir las 6–10 semanas que ya decía
§5.8.

**Evidencia exigida.** Tras el arreglo se repite el banco completo. Si el ánimo
deja de quedar clavado junto a 10 y vuelve la migración, la extinción perpetua
era un defecto de duración. Si la terminación continúa fuera de banda, se
reanuda la atribución sobre el nuevo mundo; no se compensará el fallo tocando
`ARRIVE_MIN_MORALE`.

**Resultado: causa confirmada.** La única modificación es la expiración del
brote; no se ha tocado ningún número de balance. El banco de 60 semillas × 200
años × cuatro políticas da:

| Métrica | `prudent` | `first` | `last` | `worst` |
|---|---:|---:|---:|---:|
| Partidas terminadas | 1,7 % | 1,7 % | 6,7 % | 6,7 % |
| Mediana del pico | 83 | 83 | 81 | 81 |
| Población mediana, año 20 | 42 | 41,5 | 28 | 28 |
| Mapas llenos < año 120 | 96,7 % | 95,0 % | 70,0 % | 65,0 % |
| Cadencia por generación | 3,75 | 3,83 | 6,01 | 6,02 |
| Choque del 90 % → final | 44,1 % | 40,7 % | 84,5 % | 77,6 % |
| Bosque en banda al año 100 | 48/59 | 47/59 | 23/57 | 21/57 |

El ánimo deja de quedar clavado en 10 y la extinción de `prudent` cae de 80 %
a 1,7 %. La banda pedía 2–12 % y el pico 65–82: ambos fallan por una sola
partida o una persona, respectivamente. No se toca nada para hacer verdes esos
bordes antes de resolver el problema grande.

**Problema grande, ahora visible.** `worst` debería terminar al menos el 25 % y
solo termina el 6,7 %; la horquilla `worst − prudent` es de cinco puntos contra
los veinte exigidos. Las elecciones malas reducen el crecimiento —año 20: 28
contra 42—, pero no matan la aldea. `last` y `worst` superan además la cadencia
máxima media (6,01 y 6,02), arrastradas por `succession`, elegible en torno al
6,9 % de los ticks. La siguiente ronda debe estudiar el bucle de sucesión y los
efectos adversos; no endurecer la mortalidad ambiental, que castigaría también
a `prudent`.

**Coste del banco.** 1 143,63 s, por encima del presupuesto de 600 s. Ahora casi
todas las partidas recorren los 200 años completos, y sus choques también. Es
un incumplimiento real de M-12. Se optimiza la instrumentación o el trabajo
redundante del mundo sin recortar semillas, años ni políticas.

**Suite rápida.** La misma supervivencia llevó `npm test` por encima de veinte
segundos. Dos recorridos integrados que se habían vuelto redundantes o vacuos se
reemplazan por casos directos que fuerzan el suceso: la última celda de bosque
viejo y la única partida terminal de este banco. Resultado: 523 pruebas pasan,
dos quedan pendientes de M-20/M-23, y la suite completa tarda 19,81 s.

### 2.17 — La puerta de ocho habitantes

- **§12.9 · `prudent`.** El peso del ánimo baja de 15 a 3. La atribución de
  v2.16 demostró que, a quince fanegas por punto, seis puntos de ánimo valían
  noventa fanegas y hacían que acoger desconocidos dominara el coste visible de
  alimentarlos. Tres conserva el ánimo en la decisión sin convertirlo en la
  unidad que manda sobre el grano.
- **§12.9 · Agonía.** La medida pasa del total de años bajo
  `VIABLE_POPULATION` a la **racha consecutiva más larga**. El contador de
  abandono se reinicia cuando la aldea vuelve a ser viable; la métrica tiene que
  medir la misma regla. Sumar recaídas distintas hacía aparecer como fallo un
  comportamiento correcto.
- **§5.7 · Puerta de llegadas.** `ARRIVE_MIN_PEOPLE = 8` se mantiene mientras se
  contrasta con 3 sobre las mismas 60 semillas × 200 años. El valor B es un
  experimento y no una decisión de balance.

**Hipótesis falsable.** Si bajar la puerta a tres reduce de golpe las partidas
terminadas y la descomposición de las tres décadas finales muestra que primero
desaparecen las llegadas, la puerta de ocho convierte una peste profunda en una
sentencia diferida. Si las llegadas continúan y domina otro término, la causa
está en otro sistema y la puerta se queda.

**Resultado: hipótesis falsada.** Las dos ramas dieron exactamente el mismo
resultado, semilla por semilla. `ARRIVE_MIN_PEOPLE` se queda en 8.

| `ARRIVE_MIN_PEOPLE` | Partidas terminadas | Mediana del pico | Mapas llenos < año 120 | Mediana del final |
|---:|---:|---:|---:|---:|
| 8 | 47/60 | 76,5 | 30/60 | año 104 |
| 3 | 47/60 | 76,5 | 30/60 | año 104 |

La descomposición siguiente usa solo ventanas completas de diez años y da la
media por aldea terminada. El neto reconcilia exactamente nacimientos y llegadas
menos muertes y marchas.

| Ventana antes del final | Aldeas | Nacimientos | Llegadas | Muertes | Marchas | Neto |
|---|---:|---:|---:|---:|---:|---:|
| 30–20 años | 41 | 7,63 | 0,17 | 7,56 | 5,76 | −5,51 |
| 20–10 años | 44 | 4,07 | 0,09 | 6,18 | 6,39 | −8,41 |
| 10–0 años | 47 | 1,36 | 0,00 | 2,30 | 4,79 | −5,72 |

Las llegadas sí se apagan, pero no por la población. Una sonda anual de las
cinco puertas muestra que, en los últimos veinte años, grano, reputación y camas
están abiertos en el 100 % de las observaciones y la población aún lo está en el
87,5 % de la penúltima década. **El ánimo no alcanza 50 ni una sola vez.** Ya
entre treinta y veinte años antes solo abre en el 1,5 % de las observaciones.
La siguiente variable a aislar es, por tanto, `ARRIVE_MIN_MORALE`; tocar la
puerta de población no arreglaría ninguna partida.

### 2.16 — El abandono, y dónde se mueren las aldeas

- **§5.7 · Abandono.** `MIN_FIELD_CREW = 2` no mordía: con dos adultos ya se
  cubre el mínimo de un campo, así que la aldea de dos seguía cosechando. El
  listón estaba por debajo del caso que había que matar. En su lugar,
  `VIABLE_POPULATION = 6` y `ABANDON_YEARS = 5`: cinco años seguidos por debajo
  de seis habitantes y los que quedan se marchan. **Se van, no se mueren** —
  `leftTick`, no `diedTick`—, así que la mortalidad de §12.4 no se lleva un
  mérito que no es suyo, y la partida termina con el valle a cero, que es la
  única forma de perder que admite §1. `MIN_FIELD_CREW` se queda: la regla es
  correcta aunque no resolviera esto.
- **§3 · `GameState.dwindlingSince`.** La semana en que se les vio por debajo de
  seis, o `null`. Un tick y no una cuenta de años, para que diga lo mismo se
  mire cuando se mire y para que una partida guardada no tenga que recordar por
  dónde iba el año.
- **§9 · Dos líneas nuevas.** `abandonment`, peso 3: un asentamiento fallido no
  se muere de hambre, se abandona, y la crónica tiene que decir cuál de las dos
  cosas pasó. Y `forest.old_gone`, peso 2, la semana en que cae la última celda
  del bosque que estaba en pie cuando llegaron — lo único del bosque que es
  suceso y no estado. Nada más de bosque en la crónica.
- **§12.7 · `VIRGIN_FOREST`.** La marca que lleva `forestAge` en una celda del
  bosque viejo. En una celda de bosque ese campo no tenía nada que decir —cuenta
  los años de una celda *despejada*—, así que es donde cabe «este árbol estaba
  aquí cuando llegaron» sin otra capa. Talar borra la marca y el rebrote no la
  pone: lo que vuelve a crecer no es el bosque que encontraron.
- **§14.2 · El presupuesto del banco sube de 5 a 10 minutos.** Los cinco se
  fijaron cuando la suite no hacía nada. Se lanza aparte, en nocturna, y no
  tiene sentido degradar la medición para caber en un número inventado.
- **§12.9 · La banda del bosque es aguas abajo de la extinción.** Falla por
  arriba, no por abajo: el valle que se queda sin gente conserva sus árboles
  porque no hay quien los tale. No se ajusta hasta que la extinción esté en
  banda.

**Atribución de la extinción.** Medido con `prudent`, 60 semillas × 200 años, en
`tools/reports/attribution-report.ts` (`npm run attribution`). No es una puerta ni un
umbral: son cuatro medidas para que la decisión sobre qué efecto tocar se tome
contra números.

Con el abandono dentro, **48 de 60 partidas terminan: 47 abandonadas y 1
extinguida**. No son partidas nuevas que se mueran; son las mismas que antes se
arrastraban décadas, terminadas cuando dejan de ser una aldea.

**(a) Opciones tomadas en los 20 años anteriores al final.** Solo aparecen
cuatro opciones distintas, porque a 2,2 encrucijadas por generación una ventana
de veinte años contiene unas dos decisiones. Con esa reserva:

| Opción | En finales | En supervivientes | Factor |
|---|---:|---:|---:|
| `succession:choose_a` | 70,8 % | 83,3 % | 0,85 |
| `quiet_years:a_free_work` | 37,5 % | 16,7 % | **2,25** |
| `tithe_demand:send_him_away` | 18,8 % | 58,3 % | 0,32 |
| `quiet_years:a_season_of_feasting` | 8,3 % | 0,0 % | solo en finales |

Las dos de `quiet_years` son la reserva de §8.1: salen cuando no hay ninguna
otra plantilla elegible, que es lo que le pasa a una aldea que se está quedando
sin gente. Son síntoma, no causa. `tithe_demand:send_him_away` aparece tres
veces más en las que sobreviven.

**(b) La bandera `hostile` no se activa nunca con `prudent`.** Ni una vez en 60
partidas, ni tampoco con `first`. La ponen tres opciones —
`strangers_at_the_ford:turn_them_away`, `relic_pedlar:take_the_box` y la semilla
de `granary_theft:a_new_latch`— y ninguna de las dos políticas razonables toma
ninguna. `last` y `worst` sí: `turn_them_away` en 34 y 35 de 60.

El motivo es la fórmula de §12.9. En `strangers_at_the_ford`, acoger cuesta 40
de grano y da +6 de ánimo; a 15 puntos por punto de ánimo eso son **+90 contra
−40**, así que `prudent` acoge siempre. **El castigo por mala reputación que
describe §5.7 es contenido muerto para el jugador que juega bien.** Es una
decisión de diseño, no un fallo: o el ánimo pesa menos, o la mala reputación
tiene que llegar por otro camino.

**(c) Causas de muerte con `prudent`.** La violencia bajó de **14,1 % a 8,5 %**
al dejar de comprar muertes; `first` está en 3,8 %. Lo que queda son opciones
donde matan todas —ahí `prudent` minimiza pero sigue matando— y semillas que
matan al vencer, años después de la decisión.

| Causa | Muertes | Parte |
|---|---:|---:|
| natural | 6 897 | 59,7 % |
| peste | 1 323 | 11,4 % |
| hambre | 1 265 | 10,9 % |
| vejez | 1 084 | 9,4 % |
| violencia | 981 | 8,5 % |
| frío | 5 | 0,0 % |

**(d) Se decide tarde.** Población en el año 40, mediana: **54 en las que
terminan, 62,5 en las que sobreviven**. Solo 9 de las 48 terminan antes del año
40. Una aldea de cincuenta y cuatro personas en el año 40 no está condenada por
nada que pasara temprano; se deshace después, a lo largo de un siglo o más.

**Lo que no se ha tocado.** Ni reposos, ni condiciones, ni el techo, ni A.7=45,
ni ningún efecto del catálogo. Las cuatro medidas están para que se decida
contra ellas.

**Lo que el abandono le hizo al banco.** 60 semillas × 200 años × cuatro
políticas, 443 s (presupuesto nuevo: 600).

| Métrica | `prudent` | `first` | `last` | `worst` |
|---|---:|---:|---:|---:|
| Partidas terminadas | 80,0 % | 71,7 % | 83,3 % | 83,3 % |
| Mediana del pico | 76,5 | 72,5 | 46,5 | 50,5 |
| Mapas llenos < año 120 | 50,0 % | 48,3 % | 33,3 % | 31,7 % |
| Cadencia sin bosque | 2,465 | 2,468 | 5,312 | 5,338 |
| **Mediana de años bajo seis** | **5,0** | **5,0** | **5,0** | **5,0** |
| Máximo de años bajo seis | 9,96 | 15,31 | 10,25 | 10,25 |
| Bosque 40–70 % al año 100 | 24/37 | 24/37 | 15/29 | 14/26 |
| Rangos / geometría | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Tres consecuencias que hay que leer juntas, porque son la misma:

1. **La agonía se acabó.** La mediana de años por debajo de seis habitantes cae
   de **27,8 a 5,0** en las cuatro políticas. Es exactamente
   `ABANDON_YEARS`: en cuanto una aldea cruza el umbral, tiene cinco años y se
   acabó.
2. **La medida anterior sumaba recaídas distintas.** Por eso llegaba a 15,3
   años con `first` aunque ninguna racha pudiera durar más de cinco. Desde v2.17
   se informa la racha consecutiva más larga, que es lo que la regla acota.
3. **La extinción sube y la cadencia con ella.** Con `prudent`, terminadas
   66,7 % → 80,0 % y cadencia 2,27 → 2,47; con `worst`, 5,07 → 5,34. No son
   partidas nuevas que se mueran: son las mismas, terminadas antes. Una partida
   que acababa en el año 60 y ahora acaba en el 25 tiene las mismas
   encrucijadas repartidas entre menos generaciones. La horquilla
   `prudent`–`worst` se estrecha a 3,3 puntos por lo mismo.

**Nada de esto se ajusta en esta ronda.** El abandono era el arreglo pedido y
está medido; lo que arrastra —extinción, horquilla, cadencia de `last`/`worst`,
bosque— sale de la misma decisión de diseño pendiente, y no se toca a ojo.

### 2.15 — Caminos y bosque

- **M-15.** `astar.ts`, `forest.ts` y `paths.ts`, y el paso 14 del tick deja de
  estar vacío. Todo entero y medido; los números están abajo.
- **Capa nueva en el mapa: `forestStock`.** Desviación declarada. §7.5 dice que
  «cada celda de bosque contiene `WOOD_PER_FOREST_TILE` unidades», y una semana
  de tala son unas siete unidades contra una celda de trescientas: la celda pasa
  medio año a medias. Sin dónde guardar eso, talar sería o una celda entera por
  semana o nada. Es un cambio de §3 y del formato de §13.1; no hay partidas
  guardadas todavía, y M-23 hereda la capa.
- **`woodCap` deja de ser infinito.** El paso 5 pregunta al bosque cuánta madera
  hay antes de producirla. Un valle talado deja de dar madera en vez de darla de
  la nada, que es lo que hacía desde M-06.
- **Coste del A\*: `PATHING`, todo TUNE.** §7.6 da la forma —«penaliza bosque y
  roca y premia `path`»— y ningún número. Enteros, no decimales: dos máquinas
  que redondeen distinto rutarían distinto, y una ruta que se desvía una celda
  pone el desgaste en otro sitio, que al cabo de un siglo es otra aldea.
- **Un edificio no cambia ninguna ruta.** El coste de §7.6 lee el terreno y el
  camino, y nada más, así que levantar una casa no mueve un trayecto: lo que
  puede mover es a dónde va la gente, y eso ya forma parte de la clave de la
  caché. Invalidar por edificio costaba cuarenta A\* cada pocas semanas para
  nada.
- **Una celda talada no es un cambio de suelo.** Talar solo abarata el paso, así
  que la ruta que la cruzaba sigue siendo una ruta —deja de ser la más barata y
  se recalcula la próxima vez que algo se mueva—. El leñador cuyo árbol cae sí
  recibe ruta nueva en el acto, porque el destino es parte de la clave.
- **El destino de cada aldeano.** §7.6 quiere «cada aldeano vivo con casa y
  destino de trabajo» y §5.2 reparte la mano de obra en tres cifras, no en
  asignaciones. Se reparte por rango: los primeros `farmers` van a los campos,
  los siguientes `cutters` al bosque, el resto a la obra abierta. Determinista,
  sin estado nuevo, y se mueve con la asignación.

**Medición de esta ronda.** 60 semillas × 200 años × cuatro políticas.

| Métrica | `prudent` | `first` | `last` | `worst` |
|---|---:|---:|---:|---:|
| Extinción | 66,7 % | 66,7 % | 81,7 % | 78,3 % |
| Mediana del pico | 76,5 | 72,5 | 46,5 | 50,5 |
| Mapas llenos < año 120 | 50,0 % | 48,3 % | 33,3 % | 31,7 % |
| Cadencia **sin** bosque | 2,266 | 2,272 | 4,999 | 5,072 |
| Cadencia **con** bosque | 2,283 | 2,286 | 5,018 | 5,091 |
| Bosque 40–70 % al año 100 | 24/40 | 24/42 | 15/31 | 14/31 |
| Mediana del bosque al año 100 | 62,3 % | 67,2 % | 71,6 % | 71,7 % |
| Rangos / geometría | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

**Deuda del bosque de §12.9, saldada.** La fila de encrucijadas por generación
decía «se mide excluyendo `forest_cut` y `wolf_winter` hasta que exista M-15» y
dejaba registrado volver a medirlo con las dos dentro. Medido: **la cadencia se
mueve 0,02** (2,266 → 2,283 con `prudent`, 4,999 → 5,018 con `last`). La
exclusión ya no cambia nada y puede retirarse cuando se quiera; se deja escrita
para que la comparación con las rondas anteriores siga siendo legible.

**Lo que no llega, sin ajustar nada:**

1. **El bosque entra en banda en 24 de 40 valles que alcanzan el año 100** —el
   60 %, contra los 20 de 30 que pide el brief de M-15—. Y falla **por arriba**:
   sólo uno se queda por debajo del 40 %, y quince se pasan del 70 %. La aldea
   que se muere pronto deja de talar, así que su valle conserva el bosque por no
   haber nadie. Es la misma extinción del 66,7 % vista desde otro sitio, no un
   problema de la tala.
2. **`npm run test:balance` tarda 512 s contra el límite de 300.** Venía de 292.
   El tick es un 30 % más caro con el paso 14 dentro, y el banco son unas 470
   partidas de hasta 200 años. Muestrear la sonda no toca esto: ya está medido
   que la sonda vale un 13 %.
3. Siguen fuera de banda la extinción de `prudent` (66,7 % contra 2–12 %), la
   horquilla (11,7 puntos contra 20), los mapas llenos (50 % contra 60 %), los
   años agonizando (55,6 contra 10) y `succession` en `last`/`worst` (5,3 %
   contra 1 %). Ninguno se ha tocado.

### 2.12 — El valle existe y la aldea se construye sola

Todo lo de abajo está medido sobre el motor, no previsto. Las cifras vienen de
`npm run test:balance` (60 semillas × 200 años × tres políticas, 187,55 s) y de
`npm test` (464 pruebas, 2 pendientes, 9,5 s).

- Se elimina la copia sincronizada `the-valley-design.md` y se registra arriba
  el flujo indicado por el usuario; evita mantener dos diseños vigentes.
- **M-13.** El generador sustituye la pradera provisional, con los cinco pasos
  de §7.1 y un claro de fundación garantizado. `foundingSite` devuelve la
  esquina superior izquierda de un claro de 12×12, no un punto ambiguo que el
  consumidor tenga que reinterpretar; el claro se reserva **antes** de bosque,
  roca y marisma, así que ninguno de los tres puede invadirlo y el río no se
  corta ni se desplaza para abrirle sitio. `generateMap` es pura: trabaja sobre
  una copia del *bundle*, de modo que llamarla dos veces da el mismo valle y no
  desplaza ningún flujo. Verificado en 200 semillas: río continuo de borde a
  borde y de una sola masa de agua, bosque entre el 18 % y el 30 %, y claro
  válido en todas.
- **M-14.** El paso 6 del tick deja de tirar los puntos de obra. La aldea abre
  **un proyecto cada vez** —§7.3 es una lista ordenada de qué empezar, no un
  conjunto de obras en paralelo, y veinte personas que abren ocho cimientos no
  terminan ninguno—, paga la madera al empezar, reserva la parcela mientras
  dura y escribe la entrada de crónica cuando el edificio se levanta.
  Fundación, incendios y efectos de encrucijada usan las mismas reglas.
- **Piedra.** La conversión a `wood` carecía de factor especificado y
  contradecía su producción mediante obra. Se usa la tasa ya existente
  `STONE_PER_BP`: `bpCost = BUILDINGS[kind].bp + BUILDINGS[kind].stone /
  WORLD.STONE_PER_BP`. Requiere fragua y roca en el mapa; no añade una sexta
  estadística ni un almacén de piedra.
- **Encrucijadas.** `build.free` exime materiales, no puntos de obra. El
  contrato actual de M-07 solo admite `free: true`, así que **no se cambia**
  `schema.ts` ni `resolve.ts`. Lo que se exime es la madera *y* el recargo de
  cantera: la piedra que el señor regala no hay que picarla, pero la torre sí
  hay que levantarla. `bpCost(free) = BUILDINGS[kind].bp`.

**Tres lecturas de §7.4 y §7.3 que había que fijar,** porque la primera versión
razonable de cada una rompía la aldea:

- **«Lejos del bosque» (campo) es *no pegado* al bosque, no lo más lejos
  posible.** Maximizar esa distancia mandaba los campos al borde sur del mapa,
  a veinticinco celdas de las casas, y arrastraba con ellos a los graneros.
- **«Algo apartada» (capilla) es al otro lado del borde del núcleo, no en la
  esquina opuesta.** Y la roca —único sustituto de «celda alta» que hay en el
  estado— es el desempate *dentro* de ese anillo, no la primera clave: con la
  roca primero, un afloramiento a quince celdas ganaba a cualquier sitio
  sensato y la capilla acababa contra el borde del mapa, donde una iglesia de
  3×3 ya no cabe. Ambas preferencias se ordenan lexicográficamente, sin
  inventar una suma de coeficientes; empata el índice menor.
- **La iglesia crece desde cualquiera de las cuatro esquinas que contengan a la
  capilla.** Es 3×3 sobre 2×2, y una capilla bien colocada tiene vecinos: si
  solo se probara la esquina superior izquierda, §7.3 punto 9 terminaría en las
  murallas y la iglesia sería contenido muerto.

**Punto 9 de §7.3, ámbito declarado.** Dice «cuando no queda sitio». Se
implementa como «cuando no se puede empezar nada de los puntos 1 a 8» —sin
sitio, sin madera o sin necesidad—, que es lo que cumple su motivo escrito: que
el motor de obras siga funcionando produciendo transformación en vez de
superficie. Con fragua y roca, una aldea que ya lo tiene todo pasa sus casas a
piedra en lugar de quedarse parada.

**Medición de esta ronda.** Frente a v2.11, con WORKS vacío, en la misma prueba:

| Métrica | `first` | `last` | `worst` |
|---|---:|---:|---:|
| Extinción | 61,7 % (era 100 %) | 80,0 % (era 100 %) | 75,0 % (era 100 %) |
| Mediana del pico de población | **72,5** (era 21) | 46,0 (era 20) | 45,5 (era 20) |
| Mediana al año 20 | **37,5** (era 12,5) | 27,5 (era 13) | 27,5 (era 13) |
| Mapas con 8 campos y 16 casas antes del año 120 | 46,7 % | 26,7 % | 28,3 % |
| Encrucijadas/generación, sin bosque | **2,278** | 5,932 | 5,914 |
| Máximo por semilla, sin bosque | **4,600** | 7,800 | 7,900 |
| Extinción tras el choque del año 40 | 78,9 % | 84,2 % | 77,2 % |
| Rangos o valores no finitos | 0 | 0 | 0 |
| **Geometría: solapamientos y edificios sobre agua o marisma** | **0** | **0** | **0** |

`first` pasa ahora los seis umbrales aplicables de §12.9. **Siguen fallando
cuatro asertos, y ninguno se relaja:**

1. **Cadencia de `last` y `worst`: 5,93 y 5,91 contra el máximo de 5.** La causa
   está localizada y es una sola: `succession` es elegible en el **78,25 %** de
   los ticks bajo ambas políticas, y el 94,9 % de los intervalos entre preguntas
   caen exactamente en el techo global. Ambas políticas eligen la opción que
   deja el liderazgo vacante, la vacante vuelve a hacer elegible la plantilla al
   tick siguiente y el juego pregunta tan a menudo como el techo le permite.
   Se arregla en la plantilla, no en el reposo ni en el techo, y esta ronda
   tenía prohibido tocar los tres.
2. **Elegibilidad de `wolf_winter`: 1,27 % y 1,77 % contra el 1 %.** Depende del
   bosque, que no retrocede hasta M-15. No se juzga hasta entonces.
3. **Pico de población de `last`: 46 contra la banda 65–82.** `first` da 72,5 y
   entra. La distancia entre ambas es el coste real de la política desafiante,
   que es exactamente lo que §12.9 quería medir teniendo las dos.
4. **Mapas llenos antes del año 120: 46,7 % de `first` contra el 60 %.** El
   techo lo pone la extinción, no la construcción: solo el 38,3 % de las
   partidas de `first` llegan vivas al año 200. Las muertes se reparten
   natural 7 520, hambre 1 964, vejez 1 272, peste 1 271, violencia 519 y frío
   **5** en 60 semillas de 200 años; el frío no interviene, así que las obras no
   están dejando a la aldea sin leña para el invierno y no hace falta una regla
   de reserva que §7.3 no tiene.

No se han tocado reposos, condiciones, techo, A.7=45 ni ninguna constante de
§12. Lo que falta para cerrar M-12 es una decisión de diseño sobre `succession`
y sobre la banda de extinción «neutra», que sigue sin política asignada.
M-15, cámara, guardado y la lectura por un tercero siguen fuera de esta ronda.

### 2.11 — Revisión de M-10 y desarrollo de M-11/M-12

- **§4.2, §5.5 y §9.4 · Todas las muertes de la semana cuentan.** M-10
  solo componía epitafios para la mortalidad del paso 11. El hambre agrupaba
  también a los nombrados como anónimos y la violencia de decisiones y semillas
  no componía epitafio. Ahora los pasos 3, 4, 7 y 11 aportan sus víctimas al
  informe y al coste de ánimo; cada nombrado recibe su entrada de peso 3 con
  memoria o rencor, sin duplicarse entre causas. No se cambian tasas de muerte.
- **§4.2 · El búfer incluye la resolución de M-07.** Sus entradas directas se
  capturan en la orquestación para que no adelanten los eventos anuales y para
  que el paso 16 vuelque también decisiones y consecuencias.
- **Brief M-10 · API ratificada.** Se explicitan el catálogo inyectado y los
  informes devueltos por `run`, ya presentes en la implementación anterior:
  permiten instrumentar y probar el motor sin depender de un catálogo global.
- **§4.3 y M-11 · El reloj es parte del aserto.** El antiguo test pedía 5 000
  ticks a una partida que terminaba antes. El nuevo exige alcanzar los 5 000 y
  reproduce el registro exacto de decisiones; compara SHA-256 del estado
  completo, incluidos mapa, obras y pregunta pendiente. Se añade aislamiento
  tras 1 000 tiradas de `chronicle`, e invariantes en 200 ticks de cinco semillas.
- **M-11 · Cobertura honesta.** §14.1 enumera nueve grupos, no diez. Quedan
  explícitos los pendientes de geometría, mapa, cámara y guardado, dependientes
  de módulos posteriores. La suite rápida verificada en esta ronda: 431 pruebas
  aprobadas y cuatro pendientes, 8,58 segundos; no equivale al cierre de M-11.
- **M-12 · Banco con la fundación y motor reales.** Se miden semillas 0–59
  durante hasta 200 años con `first`, `last` y `worst`. Las partidas extinguidas
  no aportan siglos vacíos al denominador de cadencia. Las series y el resumen
  se conservan aunque fallen asertos. La banda de extinción «neutra» queda
  pendiente de asignación explícita: no se inventa una política ni se llama
  neutra a `first` o `last` para cerrar la contradicción heredada.
- **Alcance conservado.** No se retocan reposos, condiciones, techo ni A.7=45.
  La aceptación narrativa por un tercero sigue pendiente; esta ronda verifica
  el motor y no sustituye esa lectura.

**Medición de esta ronda, no umbrales nuevos.** M-12 termina en 32,94 segundos
(32,56 de banco): once pruebas aprobadas, ocho fallidas y tres pendientes.
Semillas 0–59, hasta 200 años, con el catálogo completo y el M-10 corregido:

| Métrica | `first` | `last` | `worst` |
|---|---:|---:|---:|
| Extinción | 100 % | 100 % | 100 % |
| Mediana del pico de población | 21 | 20 | 20 |
| Mediana de población al año 20 | 12,5 | 13 | 13 |
| Encrucijadas/generación, media sin bosque | 1,963 | 5,189 | 5,203 |
| Máximo por semilla, sin bosque | 3,849 | 7,750 | 8,287 |
| Partidas vivas al choque del año 40 | 53 | 48 | 52 |
| Extinción posterior al choque | 100 % | 100 % | 100 % |
| Incidencias de rango o valores no finitos | 0 | 0 | 0 |

Los ocho fallos corresponden a pico y población al año 20 (`first` y `last`),
cadencia (`last` y `worst`) y elegibilidad (`last` y `worst`, con `succession`
por encima del 60 % de los ticks). **M-12 no está cerrado.** WORKS sigue vacío:
la falta de M-14 limita la interpretación de población y extinción, pero no
convierte sus objetivos incumplidos en aprobados. El choque mide mortalidad
posterior, no causalidad: también se extinguen todas las partidas base.

Metodología reproducible en `tests/balance/README.md`: cadencia por generaciones
efectivamente vividas; las dos plantillas de bosque siguen en la simulación y
se excluyen solo de ese numerador. Elegibilidad se observa en la frontera previa
al tick con copia del RNG, incluyendo condiciones, reparto y reposos; no es una
sonda interna del paso 15. La segunda columna de §8.1 informa disparos divididos
por el máximo teórico del reposo, considerando `minYear` y `maxPerGame`, con la
reserva aparte. Las series anuales están en `artifacts/balance.csv` y las cifras
por semilla en `artifacts/balance-summary.json`; se regeneran con
`npm run test:balance`, incluso cuando los asertos fallan.

**Siguiente trabajo.** M-13/M-14 deben sustituir el mapa y la colocación
provisionales y ejecutar WORKS antes de recalibrar contra crecimiento real;
M-15 habilitará la comprobación del bosque. El mapa provisional ya coloca el
campo 5 de la semilla 7 sobre agua: no se acepta como generador definitivo.
Las crónicas anteriores a esta corrección carecían de algunos epitafios y deben
regenerarse para la lectura externa. En esta ronda se han regenerado sin errores
en `artifacts/chronicle-7-v2.11.txt`, `artifacts/chronicle-42-v2.11.txt` y
`artifacts/chronicle-108-v2.11.txt`. La comprobación adicional encuentra 9, 13
y 6 muertes de nombrados respectivamente: todas tienen exactamente un epitafio.
Typecheck y lint completos también pasan.
La geometría no forma parte del hito 0
(§15.1); su prueba queda pendiente, no aprobada por esperar ese defecto.

### 2.10 — Puerta de M-08c · superada

- **§12.9 · El rango sube de 1–4 a 1–5, media, y ninguna semilla por encima
  de 7.** El 1–4 lo fijé antes de que existiera el catálogo y era una
  suposición. Medido: la sucesión sola consume un tercio del presupuesto —7 por
  siglo, que es lo que da una tenencia de 13 o 14 años— y **eso es correcto**.
  La muerte del líder es el latido del bucle largo, no ruido que apretar.
  Subir el rango reconoce el presupuesto; sacar la sucesión de la cuenta lo
  habría disimulado.
- **§8.3 · `fillCast` con vuelta atrás.** El hallazgo más fino de la ronda:
  elegir `A` a ciegas y preguntar después quién lo odia acierta una vez de cada
  ocho, así que una plantilla puede cumplir siempre sus `requires` y no repartir
  jamás. Es contenido muerto que **ninguna medición de elegibilidad detecta**,
  porque las condiciones se cumplen perfectamente.
- **§8.2 · Trampa de estación, documentada.** La cosecha es la semana 35 y el
  invierno empieza en la 36: `season = winter` y «granero vacío» están
  anticorrelacionados. El fallo se cometió dos veces —A.1 y A.4— y la segunda
  fue reintroducirlo justo después de arreglar la primera. Las plantillas de
  escasez se apoyan en `grainToHarvest`, nunca en la estación.
- **§12.9 y §14.2 · La política `first` no es neutra: es acomodaticia.** Toma
  siempre la primera opción, que en casi todas las plantillas es la que no paga
  un coste presente. Nunca levanta la empalizada, así que `bandits` no se apaga
  jamás. Toda medición informa dos políticas y la verdad queda entre ellas.
- **§12.9 · La cadencia se medirá otra vez con la fundación real.** El banco
  actual reparte catorce casas y una fragua desde el tick 0, lo que abre desde
  el año 1 las puertas de `people > 30`, `has granary` y `has smithy`. Medir
  contra eso es calibrar contra un valle que no existe.
- **Anexo A.7 · `smith_feud` queda en 45**, comprobado: con 55 no dispara ni una
  vez en 2 000 años de aldea.

### 2.9 — Puerta de M-08b

- **§6.2 · Cubrir una vacante no es elegir al de más edad.** Error de redacción
  mío: «se elige por edad» se leyó como «el mayor», que es una lectura legítima.
  La consecuencia es una cascada: los oficios recaen en ancianos, los ancianos
  mueren pronto, la sucesión se dispara al doble de su ritmo natural —9,55 por
  siglo contra 3,6— y `succession` acaba siendo el 27 % de todas las
  encrucijadas. Ahora es una banda: `ROLE_MIN_AGE` a `ROLE_MAX_PREFERRED` (55),
  gana la mejor opinión media, desempata el más joven. Y un reparto que no se
  renueva tampoco deja ver a nadie envejecer, que es la mitad del bucle largo.
- **§8.1 · El diagnóstico del catálogo pasa a dos columnas.** La lección de la
  ronda: los disparadores episódicos atacaron la elegibilidad —del 70 % al 4 %—
  y **la cadencia apenas se movió**, de 36,4 a 35,4 disparos. Son métricas
  distintas: por debajo de cierta elegibilidad, quien fija el ritmo es el
  reposo. La segunda columna es disparos ÷ máximo que permite el reposo, y por
  encima del 70 % el remedio ya no es endurecer condiciones.
- **Anexo A.15 · `agedBetween` pasa de preferencia a filtro duro**, banda 20–60,
  con ensanche solo si no hay dos candidatos.
- **Anexo A.17 · `quiet_years` está fuera del reparto normal.** §8.6 la define
  como reserva y el Anexo no lo decía con claridad; en la baraja era una de cada
  seis encrucijadas.
- **§12.9 · La cadencia se mide excluyendo las dos plantillas de bosque hasta
  M-15**, con la deuda registrada y su disparador. Ajustar sus reposos ahora
  sería calibrar contra un artefacto: sin M-15 el bosque no mengua y su
  condición está congelada.

### 2.8 — Revisión de M-08

- **§8.1 · Regla de elegibilidad episódica.** El hallazgo de la ronda, y explica
  las cinco anomalías a la vez en vez de parchearlas una a una: **una plantilla
  cuyas condiciones son ambientales dispara siempre que el techo se lo permite.**
  Toda plantilla necesita al menos una condición que sea falsa casi siempre y se
  vuelva cierta por un suceso. Las ambientales dicen quién puede recibir la
  pregunta, no cuándo se hace. Con diagnóstico medible: fracción de ticks
  elegibles por plantilla, por debajo del 1 %.
- **§12.9 · El aserto que manda es 1–4 encrucijadas por generación.** El
  porcentaje pegado al techo es diagnóstico. La medición de M-08 dio 8,9 por
  generación: el doble del máximo, y por eso el catálogo se lee repetitivo.
- **§8.2 · `{k:'grudge', min:N}` mira las opiniones, no el registro.** Un
  `Grudge` no existe hasta cruzar −50, así que `min: 30` y `min: 40` eran
  insatisfacibles y las cuatro plantillas de disputa eran contenido muerto.
- **§8.2 · Nuevo ratio `grainToHarvest`** = `grain / (people · semanas hasta la
  cosecha)`. Es la magnitud que ya define la crisis en §8.6, y es la que las
  plantillas necesitan para preguntar «¿llegamos?».
- **Anexo A.1 · Condición corregida.** Pedía `grainYears < 0.25` en invierno, y
  el invierno empieza en la semana 36, **justo después de la cosecha**: pedía el
  momento más vacío en el momento más lleno. Además `grainYears` está acotado
  por arriba por la capacidad del granero, no por la cosecha. Ahora usa
  `grainToHarvest` y exige invierno avanzado. A.2 dependía de la bandera que
  solo pone A.1 y caía con ella.
- **Anexo A.13 · `strangers_at_the_ford`**: reposo de 10 a 20 años y condición
  episódica `morale ≥ 55`. Disparaba al 89 % de su máximo posible.
- **Anexo A.15 · El reparto de la sucesión prefiere de 25 a 55 años.** Con
  `anyNamed` se encadenaban ancianos: 11 sucesiones por partida contra las 5 que
  corresponden a una generación de 20 años.
- **§6.2 y §17 M-10 · La cobertura de vacantes tiene dueño.** Ningún brief la
  tenía asignada. Sin ella, una aldea que pierde al cura fundador no vuelve a
  tener cura nunca.

### 2.7 — Revisión de M-07

- **§8.6 · La exención del techo se gasta en la primera pregunta.** El fallo de
  la ronda, y era de diseño, no de implementación: §6.6 dice que la sucesión se
  dispara «siempre» al morir el líder y §8.6 que una crisis salta el techo, sin
  decir que la exención es **por episodio y no mientras dure la condición**. Con
  el líder muerto y sin sucesor, la encrucijada se disparaba cada dos ticks para
  siempre — 6 578 veces en 20 partidas. Una hambruna dura meses y un puesto
  vacante dura hasta que alguien lo toma: una exención que valiera todo ese
  tiempo convierte la decisión en un menú.
- **§8.6 · Criterio medible para el ritmo.** Contar encrucijadas por partida no
  basta: lo que importa es qué fracción de los intervalos queda pegada al techo.
  Si manda el reloj, el jugador percibe un metrónomo en vez de un mundo. Umbral:
  40 %, y **subir el techo es el último remedio**, no el primero.
- **§9.4 · El epitafio admite rencores sanados**, con orden de preferencia de
  cuatro escalones. Un arco cerrado es tan buen epitafio como uno abierto: *«They
  had not spoken for seven years, and then they had.»* Y se elige el rencor más
  **antiguo**, no el más hondo.
- **§8.3 · El reparto se resuelve en orden de dependencia**, no de declaración, y
  un ciclo devuelve `null` en vez de colgarse.
- **§3.5 · `TERRAIN_CODE` vive en `state.ts`, no en `balance.ts`.** Es contrato
  de serialización, no perilla: los bytes de toda partida guardada dependen de
  él. Un fichero cuyo propósito es que lo toquen no es sitio para algo que no se
  puede tocar nunca.

### 2.6 — Revisión de M-05 y M-09

- **§9.4 · Nueva sección: la muerte de un nombrado.** El hallazgo de la ronda.
  Al leer la crónica de veinte años se vio que la disputa del año 5, la
  reconciliación del 12 y la muerte del 14 del mismo personaje quedan como tres
  líneas sueltas que ningún lector enlaza: el personaje se muere sin haber
  existido. Ahora la muerte de un nombrado es de peso 3 y arrastra su rencor
  abierto más antiguo o su memoria de mayor peso. Es el mecanismo de las
  semillas de §8.5 aplicado a las personas: **el material narrativo no está en
  los sucesos, está en los enlaces entre sucesos separados por años.**
- **§9.1 · Componer no consume aleatoriedad.** La variante es función pura de
  semilla, clave, tick y un discriminante. Si cada render gastara una tirada,
  desplazar la crónica en pantalla y volver reescribiría la historia de la
  aldea. El flujo `chronicle` es fuente de semilla, no flujo que se avance.
- **§9.1 · La capitalización se resuelve al componer.** El mismo hueco va al
  principio en unas plantillas y a mitad de frase en otras; no se arregla
  escribiendo mejor.
- **§6.4 y §17 M-05 · Las opiniones hacia los muertos no se limpian**, contra lo
  que decía el brief. Que uno no perdonara a un muerto es material narrativo.
- **§3.4 · `DeathCause` enumerada, con `cold`.** Morir de frío se explica tan
  bien como morir de hambre; sin esa causa, esas muertes contarían como presagio
  y la fe caería sin motivo.
- **§3.6 · Las semillas son append-only**, con `firedTick` y `witheredTick`.
  Misma disciplina que `villagers` y `grudges`.
- **§8.6 · Hambruna proyectada, con fórmula.** Estaba en prosa y cada módulo
  habría interpretado una cosa.

### 2.5 — Revisión de M-06

- **§4.2 · `DEATHS` pasa a ser el paso 11 y `MOOD` el 12.** Con el orden
  anterior, las muertes de un tick llegaban al ánimo al tick siguiente y había
  que arrastrarlas en el contexto. Ahora el ánimo ve las muertes de su propio
  tick, y los nacimientos (13) usan un ánimo ya actualizado. Es el momento de
  cambiarlo: no hay partidas guardadas que invalidar.
- **§5.3 · El bono de ánimo de la cosecha sale de aquí.** Estaba escrito en dos
  sitios, §5.3 y §5.5. Con dos escritores, el ánimo se bifurca. Lo aplica el
  paso `MOOD` y nadie más.
- **§12.6 · `FAITH_DEVOUT_PRIEST` de 0.10 a 0.13.** Con 0.10, la deriva
  `(40 − 50)·0.01` lo cancelaba exactamente: cualquier aldea con cura devoto
  congelaba la fe en 50.0 clavado durante décadas. Un equilibrio está bien; un
  equilibrio en un número redondo parece un valor escrito a mano.
- **§5.6 · Definida la «muerte inexplicada».** El término existía en la fórmula
  sin definición: es una muerte entre los 5 y los 59 años por causa natural. Es
  la principal fuente de movimiento de la fe en años tranquilos.
- **§5.6 · La fe no lleva término estocástico**, y queda escrito por qué: en
  este juego lo que cambia en pantalla significa algo.
- **§5.4 · Anotada como cuestión abierta el tope de la madera**, con el criterio
  para decidirla después de M-14 en vez de ahora a ciegas.

### 2.4 — Revisión de M-04

- **§12.2 · `FOUNDING.GRAIN` de 900 a 800.** Con `BASE_STORAGE = 800` la aldea
  nacía por encima de la capacidad y perdía grano a merma desde el primer tick:
  se leía como un fallo. Verificado contra el modelo de calibración — extinción,
  años de extinción y mediana de pico no se mueven.
- **§3.4 · `Villager.leftTick`.** §5.7 hace que se marche gente y §3.4 prohíbe
  borrar a nadie del array; sin el campo, `DeathCause` tendría que mentir.
- **§5.7 · Solo se marchan anónimos.** Un nombrado que desaparece sin una línea
  de crónica es sacar un personaje de la historia sin contarlo, y ese momento
  pertenece al jugador.
- **§6.5 · La edad se deriva; en el borde del año no hay nada que incrementar.**
- **§17 M-04 · `ageEveryone` eliminada.** Era un no-op: la escribí como si la
  edad estuviera almacenada. Una función vacía en un contrato público es una
  invitación a que alguien la «implemente».
- **§17 M-04 · Corregido el test de hambre**, que atribuía a M-04 una extinción
  que provoca el paso 7 (de M-06), y la esperanza de vida, que hay que medir
  sobre la tabla pura o el umbral no se cumple.

### 2.3 — Revisión de M-03

- **§12.4 · `ROLE_MIN_AGE`.** §6.2 pondera por edad en las sucesiones y la
  fundación no: salían comadronas de diecisiete años.
- **§6.3 · `hardy` y `frail` son incompatibles.** Son ×0.7 y ×1.6 sobre la misma
  tasa; tener los dos es incoherente por construcción.
- **§12.2 y §12.4 · `MAX_NAMED`, `AGE_RANGES`, `MIN_FERTILE_WOMEN`.**
  Constantes que el documento usaba en prosa sin fijarlas, obligando a los
  módulos a inventarlas.

### 2.2 — Revisión de M-02

- **§17 M-02 · Grafo de dependencias invertido.** §8 necesita seis tipos de §3 y
  §3 necesita uno solo de §8. `Op` y `Condition` viven en `state.ts`.
- **§3.4 · `Grudge` y `PeopleState.grudges`.** §6.4 decía «con causa registrada»
  y no había dónde guardarla. Almacenado y append-only: una opinión que remonta
  por encima de −50 no borra lo que pasó.
- **§12.6 · `MORALE_GRAVEYARD`**, número citado en §7.2 que §12 no tenía.
- **§17 M-02 · Mortalidad no monótona.** Es una curva de bañera y el 0.060
  infantil es deliberado; el brief pedía monotonía y habría llevado a
  «arreglar» la demografía del juego.
- **§12.2 · Cálculo del margen fundacional explícito.**

### 2.1 — Revisión de M-01

- **§4.3 · `RngBundle`.** `interface` con tipo mapeado no es TypeScript válido.
- **§12 · Excepción declarada:** la tabla de edificios de §7.2 también es
  balance y se transcribe como `BUILDINGS`.
- **§17 M-02 · Alcance ampliado** con los tipos que §3 referencia sin declarar.
