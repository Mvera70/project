# The Valley — Documento de diseño detallado

**v2.71 · 10 de septiembre de 2026, 21:00 (Europe/Madrid) · Sucede a `valle.md` (v1)**

Simulación idle de una aldea medieval para móvil.

**Fuente única.** El diseño vigente vive únicamente en `docs/design.md`.
`docs/the-valley-design.md` se utiliza solo para recibir propuestas de un agente
externo: se revisa su diff frente al principal, se incorporan los cambios
aceptados y se elimina la copia una vez sincronizada. El trabajo local actualiza
este documento directamente, con versión, motivos y evidencia.

> **Qué es este documento.** `valle.md` decide *qué* juego es. Este decide *cómo*
> se construye, con el detalle necesario para que varios agentes trabajen en
> paralelo sin consultarse entre ellos. Todo lo que aquí se afirma es
> vinculante; lo que no aparece, se decide en el módulo correspondiente y se
> documenta ahí.

---

## Registro de cambios

Este documento es la fuente de verdad del proyecto y cambia. Cada revisión nace
de implementar un módulo y descubrir que la especificación decía algo imposible,
ambiguo o falso — que es exactamente para lo que sirven los briefs. **Toda
entrada dice qué cambió y por qué**: el motivo es lo que evita que alguien lo
revierta dentro de seis meses creyendo que arregla algo.

| Versión | Fecha | Origen | Qué cambió |
|---|---|---|---|
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

**Hito 5, alcanzado.** M-20 aporta el reloj real y sus cuatro velocidades; M-23
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
Esa evidencia todavía no existe. El generador y la inspección de metadatos
pasan; **el hito 0 continúa sin validar** hasta recibir la respuesta externa.

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
`tools/balance-report.ts`.

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
`tools/attribution-report.ts` (`npm run attribution`). No es una puerta ni un
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

---

## 0. Cómo usar este documento

Está pensado para dos lectores distintos.

**Si vas a coordinar:** lee las secciones 1 a 4 y el capítulo 17 (briefs). Ahí
está el reparto y las dependencias.

**Si eres un agente asignado a un módulo:** lee, en este orden,

1. Sección 1 (decisiones cerradas) y sección 2 (convenciones) — obligatorio,
   son cortas.
2. Sección 3 (modelo de dominio) y sección 4 (el tick) — obligatorio, es el
   contrato común.
3. Las secciones de sistema que tu brief cite.
4. **Tu brief** en el capítulo 17. Es la fuente de verdad de tu tarea: define
   qué ficheros tocas, qué API expones, qué tests debes entregar y cuándo has
   terminado.

**Reglas de convivencia entre agentes:**

- No toques ficheros fuera de los que tu brief lista. Si necesitas un cambio en
  un fichero ajeno, escríbelo como nota en el PR, no lo hagas.
- No inventes números. Todos los valores de balance están en la sección 12 y
  viven en `src/engine/balance.ts`. Si necesitas uno que no existe, añádelo a
  ese fichero con un comentario `// TUNE:` y menciónalo en el PR.
- Los nombres de tipos, campos y funciones de la sección 3 y de los contratos de
  cada brief son **literales**. Otro agente está escribiendo código contra
  ellos ahora mismo.
- Todo texto que vea el jugador está en inglés y sale de un banco de plantillas,
  nunca escrito en línea en el código.

---

## 1. Decisiones cerradas

Las de `valle.md` siguen todas en pie. Estas son las que se cierran aquí.

| Decisión | Elegido | Motivo |
|---|---|---|
| Título | **The Valley** | El contenido va en inglés; el título acompaña |
| Idioma del contenido | Inglés (crónica, UI, nombres, topónimos) | Decisión de producto |
| Idioma del código | Inglés (identificadores, ficheros, comentarios) | Convención estándar; evita mezclas |
| Idioma de la documentación | Español | Es donde se piensa el juego |
| Ambientación | Medieval inglés | Nombres anglosajones, señor de Wealdmere |
| Derrota | **Solo población cero** | Nunca se pierde por no abrir la app |
| Presentación de datos | **Diegética primero** | El valle es el HUD; cifras solo al tocar |
| Unidad de simulación | **La semana** | 48 semanas/año; barato de simular siglos |
| Persistencia | IndexedDB, snapshot + registro de decisiones | Determinismo verificable |
| Escala del mapa | **36 × 56**, transpuesto | 56 × 36 no cabe en vertical; mismas 2 016 celdas (§7) |
| Catálogo inicial | 16 plantillas de encrucijada | Suficiente para validar el hito 0 |
| Fuente de letalidad | Las encrucijadas, no el mundo | Principio 2: el jugador es el cuello de botella |

**La última merece explicación.** La simulación base, jugada sin decisiones, es
poco mortal: 3 % de extinción en 200 años. Es deliberado. Si el mundo matara
solo, el jugador sería un espectador y el principio 2 se rompería. Lo que puede
destruir la aldea son las consecuencias de lo que el jugador elige: matanzas,
graneros perdidos antes del invierno, la reputación que corta la llegada de
forasteros. La sección 12.9 fija los objetivos de mortalidad que la suite de
balance verifica.

---

## 2. Convenciones del proyecto

### 2.1 Repositorio

```
the-valley/
├── src/
│   ├── engine/                 # simulación pura. No conoce el DOM.
│   │   ├── rng.ts
│   │   ├── time.ts
│   │   ├── balance.ts          # TODOS los números
│   │   ├── state.ts            # tipos del estado
│   │   ├── sim.ts              # orquestación del tick
│   │   ├── save.ts
│   │   ├── world/              # mapa, edificios, caminos, bosque
│   │   ├── people/             # aldeanos, rasgos, opiniones, demografía
│   │   ├── subsistence/        # trabajo, cosecha, consumo, ánimo, fe
│   │   ├── crossroads/         # esquema, condiciones, catálogo, resolución
│   │   └── chronicle/          # eventos y plantillas de texto
│   ├── render/                 # Canvas 2D. No modifica el estado.
│   ├── ui/                     # DOM, pantallas, controles
│   └── cli/                    # runner de consola (hito 0)
├── tests/
│   ├── fast/                   # segundos
│   └── balance/                # minutos, se lanza aparte
├── tools/                      # capturas Playwright, hojas de contacto
└── public/
```

### 2.2 Nomenclatura

- Ficheros y carpetas: `kebab-case.ts`.
- Tipos e interfaces: `PascalCase`. Funciones y variables: `camelCase`.
- Constantes de balance: `SCREAMING_SNAKE_CASE`, agrupadas en objetos `as const`.
- Identificadores de contenido (plantillas, rasgos, edificios): `snake_case`
  en minúsculas, estables para siempre — se guardan en las partidas.

### 2.3 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Prohibido `any`. `unknown` + validación en las fronteras (carga de partida).
- El estado del motor es **plano y serializable**: sin clases, sin `Map`, sin
  `Set`, sin referencias circulares. Objetos y arrays, y referencias por `id`.
  Esto no es preferencia estética: es lo que hace que guardar sea `structuredClone`
  y que comparar dos partidas sea un `diff`.

### 2.4 Prohibiciones en `src/engine/`

Un test de arquitectura las verifica leyendo los ficheros:

- `Math.random` — solo `Rng`.
- `Date`, `performance.now` — el tiempo entra como parámetro.
- `document`, `window`, `console` (salvo en `src/cli/`).
- `import` desde `src/render/` o `src/ui/`.

### 2.5 Git

Una rama por módulo: `mod/M-07-crossroad-engine`. El PR cita el identificador
del brief y lista qué criterios de terminado cumple.

---

## 3. Modelo de dominio

Este es el contrato común. Vive en `src/engine/state.ts`.

### 3.1 Estado raíz

```ts
export interface GameState {
  readonly version: number;        // versión del esquema de guardado
  readonly seed: number;           // semilla maestra
  readonly terrainSeed: number;    // persiste entre partidas del mismo valle
  tick: number;                    // semanas desde la fundación
  peakPeople: number;              // máximo al cierre de un tick
  rng: RngBundle;                  // estados de los flujos aleatorios
  map: ValleyMap;
  village: VillageStats;
  people: PeopleState;
  buildings: Building[];
  works: ConstructionWork[];       // obras en curso
  crossroad: PendingCrossroad | null;
  seeds: PlantedSeed[];            // consecuencias diferidas
  flags: Record<string, number>;   // banderas de estado, valor = tick de expiración (0 = permanente)
  chronicle: ChronicleEntry[];
  history: DecisionRecord[];       // registro de decisiones del jugador
  weather: YearWeather;
  outbreak: Outbreak | null;
  ended: EndState | null;
}
```

### 3.2 Tiempo

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Clock {
  tick: number;      // semana absoluta
  week: number;      // 0..47 dentro del año
  year: number;      // 0..N
  season: Season;
  seasonWeek: number; // 0..11
}
```

`weekOf(tick)`, `yearOf(tick)`, `seasonOf(tick)` son funciones puras en
`time.ts`. Nadie recalcula esto a mano.

### 3.3 Estadísticas de aldea

Exactamente cinco. Añadir una sexta requiere modificar este documento.

```ts
export interface VillageStats {
  grain: number;    // unidades. 1 unidad = 1 persona · 1 semana
  wood: number;     // unidades
  morale: number;   // 0..100
  faith: number;    // 0..100
  // 'people' NO se guarda: es people.villagers.filter(alive).length
}
```

### 3.4 Personas

```ts
export type VillagerId = number;

export type Role =
  | 'leader' | 'smith' | 'midwife' | 'priest'
  | 'woodward' | 'reeve' | 'herbalist' | 'stranger';

export type Trait =
  | 'ambitious' | 'devout' | 'spiteful' | 'craven' | 'generous'
  | 'stubborn' | 'cunning' | 'kind' | 'hot_tempered' | 'frail'
  | 'hardy' | 'greedy' | 'loyal' | 'proud' | 'secretive';

export interface Villager {
  id: VillagerId;
  name: string;             // 'Aelric' — solo los nombrados lo tienen no vacío
  named: boolean;
  role: Role | null;
  female: boolean;
  bornTick: number;
  diedTick: number | null;   // causeOfDeath ∈ natural | old_age | hunger |
                             //   cold | plague | fire | violence
  causeOfDeath: DeathCause | null;
  leftTick: number | null;  // se marchó del valle (§5.7); no está muerto
  traits: Trait[];          // 3..4, solo en los nombrados
  homeId: BuildingId | null;
  parentIds: [VillagerId | null, VillagerId | null];
  memories: Memory[];       // solo en los nombrados, máx. 12
  opinions: Record<VillagerId, number>; // -100..100, solo entre nombrados
}

export interface Memory {
  tick: number;
  kind: MemoryKind;         // 'lost_child' | 'was_blamed' | 'was_saved' | ...
  aboutId: VillagerId | null;
  weight: number;           // 1..5, decae con los años
}

export interface Grudge {
  fromId: VillagerId;
  toId: VillagerId;
  cause: MemoryKind;
  causeTick: number;
  formedTick: number;
  healedTick: number | null;
}

export interface PeopleState {
  villagers: Villager[];    // incluye a los muertos; nunca se borra a nadie
  nextId: VillagerId;
  namedIds: VillagerId[];   // vivos y nombrados, máx. 8
  grudges: Grudge[];        // append-only, igual que villagers
}
```

**Por qué no se borra a los muertos.** La crónica los cita cuarenta años
después, y las ruinas de una casa recuerdan quién la levantó. Un array de 400
aldeanos muertos ocupa nada.

**Por qué `leftTick` y no una causa de muerte.** Los que se marchan por §5.7 no
están muertos, y tampoco se pueden borrar del array. Un `diedTick` con una causa
«se fue» haría que la crónica mintiera al citarlos cuarenta años después. Están
vivos, en otra parte; la aldea simplemente ya no los cuenta. Vivo y presente es
`diedTick === null && leftTick === null`.

**Por qué el rencor se almacena y no se deriva.** Un rencor podría leerse de
`opinions` mirando quién está por debajo de −50, pero eso pierde las dos cosas
que lo hacen contable: la causa y el tick en que se formó, que son justo lo que
citan las plantillas de disputa (§8.2 `{k:'grudge'}`, §8.3 `grudgeAgainst`).
`grudges` es **append-only**, con la misma disciplina que `villagers`: un rencor
nunca se borra. Cuando la opinión sube por encima de −20 se le pone
`healedTick`, y ahí queda — la aldea recuerda que un día se odiaron.

### 3.5 El valle

```ts
export type Terrain = 'meadow' | 'forest' | 'water' | 'rock' | 'marsh' | 'cleared';

/** Contrato de serialización. Vive en `state.ts`, NO en `balance.ts`: no es una
 *  perilla. Los bytes de toda partida guardada dependen de estos valores y el
 *  orden no se puede cambiar nunca. */
export const TERRAIN_CODE = {
  meadow: 0, forest: 1, water: 2, rock: 3, marsh: 4, cleared: 5,
} as const;

export interface ValleyMap {
  width: 36;
  height: 56;
  terrain: Uint8Array;      // 36*56, índice = y*36 + x
  traffic: Uint16Array;     // desgaste acumulado por celda
  path: Uint8Array;         // 0 nada, 1 trillado, 2 sendero, 3 calzada
  ruins: Uint8Array;        // 0 nada, 1 ruina; permanente
  forestAge: Uint8Array;    // años desde la tala, para el rebrote
}

export type BuildingId = number;

export type BuildingKind =
  | 'house' | 'field' | 'granary' | 'chapel' | 'smithy'
  | 'well' | 'mill' | 'palisade' | 'wall' | 'church'
  | 'stone_house' | 'watchtower' | 'grave_yard';

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  x: number; y: number;     // esquina superior izquierda
  w: number; h: number;
  builtTick: number;
  lostTick: number | null;  // si !== null, es una ruina
  tier: 0 | 1;              // 0 madera, 1 piedra
  lit: boolean;             // el taller del herrero se apaga si se enfada
}
```

### 3.6 Encrucijadas y semillas

```ts
export interface PendingCrossroad {
  templateId: string;
  posedTick: number;
  cast: Record<string, VillagerId>;   // 'A' -> 17
  optionIds: string[];
}

export interface PlantedSeed {
  id: string;
  fromTemplateId: string;
  fromOptionId: string;
  plantedTick: number;
  firesAtTick: number;
  cast: Record<string, VillagerId>;
  condition: Condition | null;   // si falla al vencer, la semilla se marchita
  firedTick: number | null;      // append-only: las semillas no se borran
  witheredTick: number | null;   //   nunca, igual que villagers y grudges
}

export interface DecisionRecord {
  tick: number;
  templateId: string;
  optionId: string;
  cast: Record<string, VillagerId>;
}
```

### 3.7 Crónica

```ts
export type ChronicleKind =
  | 'founding' | 'season' | 'birth' | 'death' | 'harvest' | 'famine'
  | 'plague' | 'fire' | 'built' | 'lost' | 'arrival' | 'departure'
  | 'grudge' | 'succession' | 'crossroad_posed' | 'crossroad_taken'
  | 'consequence' | 'extinction';

export interface ChronicleEntry {
  tick: number;
  kind: ChronicleKind;
  templateKey: string;               // clave del banco de textos
  params: Record<string, string | number>;
  weight: 1 | 2 | 3;                 // 3 = titular de generación
}
```

La crónica guarda **claves y parámetros, no prosa**. El texto se compone al
mostrarlo. Así se puede reescribir el banco de textos sin invalidar partidas
guardadas, y traducirlo sin tocar el motor.

---

## 4. El reloj y el tick

### 4.1 Unidades

| Unidad | Equivale a | Tiempo real a ×1 |
|---|---|---|
| Tick | 1 semana | 15 s |
| Estación | 12 ticks | 3 min |
| Año | 48 ticks | 12 min |
| Generación | 20 años = 960 ticks | 4 h |
| Ventana de letargo | — | 4 h |

Velocidades disponibles: **pausa, ×1, ×4, ×16**. A ×16 un año son 45 segundos,
que es lo que hace tolerable revisar una partida larga.

El render tiene su propio reloj cosmético: **cada tick se representa como un día
completo** — amanecer, marcha al campo, regreso, noche. Un tick a ×1 dura 15 s y
ese es el ciclo de la multitud ambiental. No hay ninguna relación entre ese
reloj y la simulación más allá de la duración; el motor no sabe que existe.

### 4.2 Orden de resolución del tick

**Este orden es normativo.** Cambiarlo cambia el balance y rompe el determinismo
de las partidas guardadas.

```
tick(state, decision?) :
   1.  ADVANCE      tick += 1; recalcular reloj
   2.  ANNUAL       si week == 0:  tirar clima del año, comprobar peste,
                    comprobar incendio, migración de primavera, envejecer a todos
   3.  DECISION     si hay decision del jugador, aplicar la opción elegida
                    (efectos inmediatos + plantar semillas)
   4.  SEEDS        disparar las semillas cuyo firesAtTick <= tick
   5.  LABOUR       repartir la mano de obra; producir madera y puntos de obra
   6.  WORKS        avanzar obras; completar las que llegan a su coste
   7.  CONSUME      restar grano; calcular severidad de hambre; muertes por hambre
   8.  WINTER       si es invierno, restar leña; marcar frío si falta
   9.  HARVEST      si week == 35, resolver la cosecha
  10.  STORAGE      aplicar merma sobre el excedente
  11.  DEATHS       mortalidad por edad, con multiplicadores
  12.  MOOD         actualizar ánimo y fe
  13.  BIRTHS       nacimientos
  14.  WORLD        tráfico y caminos; rebrote del bosque; iluminación
  15.  CROSSROAD    si no hay una pendiente, evaluar el catálogo
  16.  CHRONICLE    volcar los eventos acumulados del tick
  17.  END          si no queda nadie vivo, marcar fin de partida
```

Notas obligatorias:

- El paso 7 va **antes** que el 9 a propósito: la semana de la cosecha se come
  primero y se cosecha después. Es lo que hace que un otoño malo se note ya en
  el granero antes del invierno.
- Los pasos 12 y 13 se ejecutan sobre listas fotografiadas al empezar el paso.
  Un recién nacido no puede morir en el mismo tick en el que nace.
- El paso 16 no calcula nada. Los pasos anteriores empujan eventos a un búfer y
  este los vuelca. Ningún sistema escribe texto.
- El búfer incluye las entradas que generan las APIs de resolución de M-07:
  M-10 captura esas entradas antes del volcado. El informe semanal incluye las
  muertes de decisiones, semillas, hambre y mortalidad demográfica; MOOD cuenta
  todas una sola vez, y §9.4 se aplica a los nombrados cualquiera que sea la causa.

### 4.3 Determinismo y flujos aleatorios

Un único `Math.random` compartido rompería el determinismo en cuanto un sistema
consumiera un número de más. Se usan **flujos independientes**, cada uno con su
propio estado, derivados de la semilla maestra:

```ts
export type RngStream =
  | 'map' | 'weather' | 'births' | 'deaths' | 'plague'
  | 'crossroads' | 'cast' | 'names' | 'chronicle' | 'world';

export type RngBundle = Record<RngStream, number>;  // estado de 32 bits por flujo
```

Algoritmo: **mulberry32**, sembrado con `hash32(masterSeed, streamName)`.
Rápido, sin dependencias, reproducible entre navegadores y Node.

Regla: **un sistema solo consume de su flujo.** Añadir una tirada en el render
o en un log jamás puede desplazar la simulación.

**Test de determinismo (obligatorio, suite rápida):** dos partidas con la misma
semilla y la misma lista de decisiones producen estados idénticos byte a byte
tras 5 000 ticks.

Ambas ejecuciones deben **alcanzar** el tick 5 000: una extinción anterior no
verifica ese horizonte. Se reproduce el registro de decisiones y se compara el
hash de todo el estado serializado, no una selección de campos. En la prueba de
aislamiento se excluye únicamente el flujo `chronicle` intervenido; se compara
el resto del estado completo tras continuar la simulación.

---

## 5. Sistema A — Estaciones y subsistencia

Es el reloj lento y la fuente de presión. Todo lo demás cuelga de aquí.

### 5.1 El año

| Estación | Semanas | Qué pasa |
|---|---|---|
| Spring | 0–11 | Migración; siembra; el bosque rebrota |
| Summer | 12–23 | Riesgo de peste; máxima construcción |
| Autumn | 24–35 | **Cosecha en la semana 35** |
| Winter | 36–47 | Consumo de leña; mortalidad agravada si falta |

### 5.2 Mano de obra

La fuerza de trabajo de la semana:

```
W = (adultos 15–59) · 1.0  +  (12–14 y 60–69) · 0.5
```

Reparto, en este orden:

```
neededFields  = ceil(people · 48 · 1.3 / FIELD_YIELD)
workedFields  = min(fields, neededFields)
farmDemand    = workedFields · FIELD_CREW
farmers       = min(W, farmDemand)
spare         = W − farmers

// reserva de obras: la aldea nunca deja de construir
if spare < W · WORKS_RESERVE:
    borrowed = min(farmers, W · WORKS_RESERVE − spare)
    farmers −= borrowed;  spare += borrowed

cutters  = spare · CUTTER_SHARE
builders = spare − cutters

labourFactor = farmers / (workedFields · FIELD_CREW)     // 0..1
wood        += cutters · WOOD_PER_CUTTER
buildPoints  = builders · BP_PER_BUILDER · (smithy ? 1.20 : 1.00)
```

**Tripulación mínima.** Un campo con menos de `MIN_FIELD_CREW` adultos **no
rinde nada**: no se puede arar, sembrar y segar entre dos personas. Un campo por
debajo del mínimo no cuenta en `workedFields`.

Sin esta regla, una aldea diminuta es **más** segura en comida que una grande:
dos supervivientes cosechan trescientas fanegas y consumen noventa y seis al
año, y el valle sobrevive con dos habitantes durante cuarenta años sin morirse ni
recuperarse. Eso ya se vio en la primera lectura del hito 0 —treinta y ocho años
de *«The harvest came in heavy. 195 bushels»* para dos bocas— y no es un final:
es una línea plana. Con el mínimo, una aldea que baja de tres o cuatro adultos
deja de comer y muere en un año, que es lo que `valle.md` §4 llama extinguirse.

Cuatro decisiones dentro de esa fórmula merecen defensa:

**`workedFields` en vez de `fields`.** Una aldea no trabaja más tierra de la que
necesita. Sin este tope, un valle con ocho campos y poca gente diluye su mano de
obra y cosecha peor que con cuatro. Contraintuitivo y frustrante.

**La reserva de obras (15 %).** Sin ella, una aldea justa de gente destina todo
al campo, nunca construye y se queda congelada — y el jugador no ve cambiar
nada, que es el pecado capital de este juego. Con ella, siempre hay obra en
marcha, al precio de una cosecha algo peor.

**El herrero acelera la obra un 20 %.** Es lo que hace que su enfado, que apaga
la fragua, se note en el valle sin necesidad de explicarlo.

### 5.3 Grano

```
demand   = people · GRAIN_PER_PERSON            // 1 por persona y semana
severity = max(0, demand − grain) / demand      // 0..1
grain    = max(0, grain − demand)
```

Si `severity > 0`:

```
starving = people · STARVATION_RATE · severity   // parte fraccionaria por sorteo
```
Mueren los más débiles primero: mayores de 60, luego menores de 5, luego el
resto por sorteo. Además `morale −= 4 · severity` y la mortalidad general se
multiplica por `1 + 2 · severity` en el paso 12.

**Cosecha** (semana 35):

```
yield = workedFields · FIELD_YIELD
      · weatherFactor            // 0.60 .. 1.45, tirado al empezar el año
      · (0.8 + 0.4 · morale/100) // 0.80 .. 1.20
      · labourFactor
      · (mill ? 1.15 : 1.00)
// el bono de ánimo por la cosecha lo aplica el paso MOOD (§5.5), no este.
// Un solo escritor del ánimo, o el ánimo se bifurca.
```

**Almacenamiento:**

```
capacity = BASE_STORAGE + granaries · GRANARY_CAPACITY
if grain > capacity: grain −= (grain − capacity) · SPOILAGE
```

La merma es el freno que impide que una aldea próspera acumule grano infinito y
deje de tener problemas. El granero es la manera de comprarse tranquilidad, y
cuesta madera y obra.

### 5.4 Madera

Producción: `cutters · WOOD_PER_CUTTER`, limitada por el bosque disponible (§7.5).
Consumo: construcción, y calefacción en invierno a `WINTER_WOOD` por persona y
semana. Si la leña se agota en invierno, se marca `cold` y la mortalidad se
multiplica por 1.4 esa semana.

**Cuestión abierta — el tope de la madera.** El grano tiene capacidad y merma;
la madera no tiene ni una cosa ni la otra, así que una aldea sin obras acumula
sin límite. Con los edificios congelados se llega a 5 000 en veinte años. **No se
decide aquí**: hasta M-14 no hay en qué gastarla y hasta M-15 el bosque no
limita la producción. El criterio para decidirlo, después de M-14: si la reserva
acumulada permite levantar más de tres edificios seguidos sin esperar a los
leñadores, la madera necesita tope y merma como el grano; si no, se queda como
está. Ponerle tope antes de saberlo es arriesgarse a asfixiar la construcción.

### 5.5 Ánimo (0–100)

```
morale += (50 − morale) · 0.02                    // deriva al centro
morale −= 4 · severity                            // hambre
morale −= deathsThisTick · 1.5
morale −= max(0, people − housing) · 0.4          // hacinamiento
morale += chapel ? 0.15 : 0
morale += church ? 0.30 : 0
morale += mill   ? 0.05 : 0
morale −= outbreak ? 0.8 : 0
morale += (weatherFactor − 1) · 25                // solo en la semana 35
```

### 5.6 Fe (0–100)

```
faith += (40 − faith) · 0.01
faith += chapel ? 0.20 : 0
faith += church ? 0.35 : 0
faith += priestAlive && priest.traits.includes('devout') ? 0.10 : 0
faith −= priestAlive ? 0 : 0.15
faith −= outbreak ? 0.60 : 0
faith −= unexplainedDeathsThisTick · 0.30
```

**Qué cuenta como muerte inexplicada.** Un fallecimiento de alguien entre 5 y 59
años por causa `natural` — ni hambre, ni peste, ni incendio, ni violencia. Son
las muertes que una aldea medieval lee como señal, y son la principal fuente de
movimiento de la fe en años tranquilos.

**El punto fijo.** La fe es un atractor: sin sucesos se queda quieta en su
equilibrio (25 sin cura, 40 con cura tibio, 53 con cura devoto). Eso es correcto
—la fe se mueve cuando pasan cosas, no porque sí— y por eso **no lleva término
estocástico**: en este juego, algo que cambia en pantalla siempre significa algo.
`FAITH_DEVOUT_PRIEST` vale 0.13 y no 0.10 por un motivo concreto: con 0.10 la
deriva `(40 − 50)·0.01` lo cancelaba exactamente y la fe se congelaba en 50.0
clavado durante décadas, que parece un número escrito a mano.

La fe no da recursos. Hace dos cosas: abre y cierra plantillas de encrucijada, y
pone un suelo al ánimo (`morale` no baja de `faith · 0.25`). Una aldea muy
devota aguanta desgracias que hundirían a una descreída — y por eso el cura es
peligroso.

### 5.7 Migración

Se comprueba una vez al año, en la semana 0.

**Llegada.** Requiere `people ≥ 8`, `morale ≥ 50`, reservas de grano `≥ 0.5`
años, `hostile` sin activar, **un líder en el puesto (Anexo A.15, v2.22)** y al
menos 2 huecos de vivienda. Probabilidad 0.30; llegan 2–4 personas, mezcla de
adultos jóvenes y niños.

**Marcha.** Si `morale < 30`, con probabilidad `(30 − morale)/60` se van 1–3
personas, **el doble mientras el puesto de líder esté vacante** (Anexo A.15,
v2.22). **Sólo se van anónimos.** Que un nombrado desaparezca sin una línea
que lo cuente es sacar un personaje de la historia a espaldas del jugador, y ese
momento le pertenece a él: la plantilla A.7 ya lo tiene como resultado de una
decisión, no como una gota de la simulación.

Los forasteros son el motor principal del crecimiento temprano: la biología sola
hace crecer la aldea demasiado despacio para que la primera generación sea
interesante de ver. Y son un buen castigo: una aldea con mala reputación —
bandera `hostile`, que ponen ciertas encrucijadas — deja de crecer sin que muera
nadie.

> **Medido (v2.16, reconfirmado en v2.23): ese castigo sigue sin ocurrirle a
> quien juega bien.** Las tres opciones que ponen `hostile` no las toma ni
> `prudent` ni `first` en 60 partidas de 200 años, ni siquiera después de que
> M-17 bajara el peso del ánimo de 15 a 3 en la puntuación de `prudent`.
> Acoger a los del vado sigue ganando por dos puntos (−22 contra −24). Ver
> §2.23. Pendiente de decisión de diseño.

**Abandono.** Si la aldea pasa `ABANDON_YEARS` años seguidos por debajo de
`VIABLE_POPULATION` habitantes, los que quedan se marchan: `leftTick` para
todos, el valle a cero y la partida terminada con `cause: 'abandoned'`.

El contador vive en `state.dwindlingSince` y se reinicia en cuanto la población
vuelve a alcanzar el mínimo, así que «cinco años seguidos» quiere decir seguidos.

**Por qué hace falta, y por qué `MIN_FIELD_CREW` no bastaba.** Una aldea de dos
adultos cubre la tripulación mínima de un campo, así que sigue cosechando
trescientas fanegas contra noventa y seis de consumo, y con un granero lleno
—que no se estropea por debajo de su capacidad— aguanta veintiocho años más. Eso
no es un final: es una línea plana de la que la crónica no tiene nada que decir.
Medido antes de esta regla, la mediana de las partidas que morían era de 28 años
por debajo de seis habitantes, y la peor llegó a 55.

Un asentamiento fallido no se muere de hambre. Se abandona, y es lo que la
crónica escribe: peso 3, y no es la línea de la extinción.

### 5.8 Peste

Comprobación anual: `p = PLAGUE_BASE + people/2500`, multiplicada por 0.6 si hay
pozo. Duración 6–10 semanas. Durante el brote, cada persona tiene un riesgo
semanal adicional de `PLAGUE_HAZARD_ADULT`, o `PLAGUE_HAZARD_WEAK` si tiene 4
años o menos, o 60 o más.

Un brote típico se lleva entre un cuarto y la mitad de la aldea. Debe sentirse
como una catástrofe, no como un impuesto.

### 5.9 Incendio

Comprobación anual, `p = FIRE_CHANCE`. Destruye un edificio de madera al azar
(`tier === 0`) **con techo** —casas, granero, capilla, fragua, molino—, con
preferencia por las casas. **Los campos no arden**: son `tier: 0` por accidente
de la tabla de §7.2, no porque el fuego deba llevárselos. Perder un campo cuesta
600 de cosecha para siempre y en la crónica se lee raro. Si toca un granero, se pierde
además el 45 % del grano almacenado. `morale −= 6`. El edificio pasa a ruina y
**se ve** — es el suceso más barato del juego en código y de los más visibles.

Los edificios de piedra (`tier === 1`) no arden. Es la recompensa mecánica de la
progresión tardía descrita en `valle.md` §7.

---

## 6. Sistema B — Las personas

### 6.1 Dos poblaciones

**Los anónimos.** Existen como registros con edad, sexo y casa. No tienen
rasgos, ni memoria, ni opiniones. Nacen, envejecen, trabajan de forma agregada y
mueren. Son el 90 % de la aldea y cuestan cuatro campos por cabeza.

**Los nombrados.** Seis al fundarse, hasta ocho. Tienen nombre, rasgos, memoria
y opiniones. Son los únicos que la crónica cita y los únicos que aparecen en las
encrucijadas.

### 6.2 Roles

| Rol | Al fundarse | Cómo aparece después |
|---|---|---|
| `leader` | Sí | Sucesión al morir (§6.6) |
| `smith` | Sí | Un adulto lo hereda si hay fragua |
| `midwife` | Sí | Una adulta lo hereda |
| `priest` | Sí | Solo si hay capilla; si no, el puesto queda vacante |
| `woodward` | Sí | Un adulto lo hereda |
| `reeve` | Sí | Un adulto lo hereda |
| `herbalist` | No | Surge si hay peste y `faith < 60` |
| `stranger` | No | Llega por encrucijada; puede quedarse |

Cuando un rol queda vacante y hay candidato (adulto vivo, sin rol), se cubre en
el paso ANNUAL del año siguiente. **La cobertura de vacantes la ejecuta M-10**
en el paso 2 del tick, llamando a `promoteToNamed` de M-03: ningún otro brief la
tenía asignada, y sin ella una aldea que pierde al cura fundador no vuelve a
tener cura nunca.

**Cómo se elige al candidato — y no es «el mayor».** Se filtran los adultos
entre `ROLE_MIN_AGE` y `ROLE_MAX_PREFERRED` (55); gana el de mejor opinión media
del resto y desempata el más joven. Solo si la banda queda vacía se ensancha
hacia arriba.

Leer «por edad» como «el de más edad» envejece el reparto entero en pocas
décadas: los oficios recaen siempre en ancianos, los ancianos mueren pronto, y
la sucesión —que debería ser el latido de una generación— se dispara al doble de
su ritmo natural. Medido: 9,55 sucesiones por siglo contra las 3,6 que
corresponden a un líder de cuarenta años con la tabla de §12.4. Y un reparto que
no se renueva tampoco deja ver a nadie envejecer, que es la mitad del bucle
largo. Ascender a un anónimo le genera nombre, rasgos y opiniones
neutras: **nace un personaje**, y la crónica lo anuncia.

### 6.3 Rasgos

Cada nombrado tiene 3 o 4 rasgos, sorteados con pesos por rol (un `priest`
tiene alta probabilidad de `devout`, un `leader` de `ambitious` o `proud`). Los
rasgos hacen exactamente tres cosas, ni una más:

1. **Ponderan opciones de encrucijada.** Un `craven` hace que aparezca la opción
   de huir; un `spiteful` hace que la plantilla de venganza tenga más peso.
2. **Modulan la deriva de opiniones.** Un `loyal` perdona; un `spiteful` no.
3. **Modifican un número concreto y documentado.** Sólo estos:

| Rasgo | Efecto mecánico |
|---|---|
| `hardy` | Su mortalidad base ×0.7 |
| `frail` | Su mortalidad base ×1.6 |
| `devout` (cura) | `faith` +0.10/semana |
| `ambitious` (líder) | Obra +5 %; opinión de los demás −0.02/semana |
| `generous` | En hambruna, `morale` −3·severity en vez de −4 |
| `greedy` (reeve) | Merma −2 puntos porcentuales; `morale` −0.03/semana |

Los nueve rasgos restantes son puramente narrativos y de ponderación. **Esto es
intencionado.** Que cada rasgo tenga un número asociado convierte a los
personajes en un árbol de habilidades, que es justo lo que `valle.md` §9
descarta.

**Rasgos mutuamente excluyentes.** `hardy` y `frail` son ×0.7 y ×1.6 sobre la
misma tasa de mortalidad: tenerlos los dos no es un personaje contradictorio,
es un personaje cuyo multiplicador queda en 1.12 sin que nada lo explique.
Ningún nombrado sale con ambos. El sorteo lo garantiza por construcción, no por
un reintento: al elegir uno se retira el otro de la bolsa. La lista de pares
opuestos vive en `traits.ts` como `OPPOSED`; hoy tiene una sola entrada.

### 6.4 Memoria y opiniones

Los nombrados guardan hasta 12 memorias. Cada una tiene peso 1–5 y decae
`−0.02` por año. Al llenarse, se descarta la de menor peso efectivo.

Las opiniones van de −100 a +100 y solo existen entre nombrados. Se mueven por
sucesos:

| Suceso | Cambio |
|---|---|
| Muere un hijo suyo por hambre y el líder eligió esa opción | −35 hacia el líder |
| Fue acusado en público por otro | −30 hacia el acusador |
| Otro le salvó (opción que le favorece) | +25 |
| Convivencia sin incidentes | +0.05/semana, hacia 0 desde los extremos |
| Rasgo `spiteful` | La recuperación hacia 0 se reduce a la mitad |
| Rasgo `loyal` | La recuperación hacia 0 se duplica |

**Rencor (`grudge`).** Cuando una opinión cruza −50 se crea un rencor con causa
registrada. Los rencores son lo que alimenta las plantillas de disputa, y son la
razón por la que dos partidas con los mismos sucesos cuentan historias distintas.

### 6.5 Demografía

**Nacimientos.** Cada mujer viva de 16 a 40 años, por semana:

```
p = BIRTH_BASE · foodFactor · moraleFactor · housingFactor
foodFactor    = clamp(grain / (people · 24), 0, 1.2)
moraleFactor  = 0.6 + 0.8 · morale/100
housingFactor = freeBeds ≥ 3 ? 1.3 : (freeBeds ≥ 1 ? 1.0 : 0.15)
```

El padre se asigna entre los adultos vivos, con preferencia por el que comparte
casa. Si la madre es nombrada, el hijo puede llegar a serlo.

**Muertes.** Probabilidad semanal `= annualRate(age)/48`, multiplicada por:

- `1 + 2 · severity` (hambre)
- `1.4` si `cold` (invierno sin leña)
- riesgo de peste, combinado como `1 − (1−p)(1−hazard)`
- el modificador de rasgo (`hardy`, `frail`)

Tabla de mortalidad anual base en §12.4.

**Envejecimiento.** Todos cumplen años a la vez, en la semana 0. Una simplificación
que ahorra un campo por aldeano y no se nota.

Literalmente ahorra el campo: la edad **se deriva** de `bornTick` en años de
calendario, `yearOf(tick) − yearOf(bornTick)`, y por eso el cumpleaños de todos
cae en la semana 0 y en ninguna otra. **En el borde del año no hay nada que
incrementar**, así que no existe ninguna función de envejecer. Lo que sí ocurre
en la semana 0 —clima, peste, incendio, migración, cobertura de vacantes— es el
paso 2 del tick y vive en `sim.ts`.

### 6.6 Sucesión

Al morir el `leader` se dispara **siempre** la encrucijada `succession`
(§Anexo A.6), saltándose el intervalo mínimo. Es la única plantilla con esa
excepción, y es lo que convierte la muerte del líder en el latido del bucle
largo: cada generación, el jugador elige quién manda, y arrastra los rencores de
quien no fue elegido.

---

## 7. Sistema C — El valle

**36 × 56 celdas = 2 016 celdas.** El valle corre norte-sur y el río baja por él.
Cabe entero en un móvil vertical, sin desplazamiento de cámara.

> **Cambio respecto a `valle.md` §7.** El documento original decía 56 × 36. Con
> 390 px de ancho eso da celdas de 6,9 px, una franja apaisada en mitad de una
> pantalla de 844 px y aldeanos de 10 px: ilegible. Transpuesto son las mismas
> 2 016 celdas —mismo presupuesto de simulación y de figuras— con celda de
> 10–11 px. Todo el arte del capítulo 10 está diseñado para esa cifra.

### 7.1 Generación del mapa

Determinista a partir del flujo `map`. Cinco pasos, en orden:

1. **Base.** Todo `meadow`.
2. **Río.** Entra por el borde norte en `x ∈ [10, 26]` y baja hasta el borde sur
   mediante un paseo aleatorio con sesgo (65 % avanzar, 35 % desviarse), de 2
   celdas de ancho, ensanchando a 3 en el último tercio. Nunca se bifurca. El
   recorrido largo es el eje visual del valle.
3. **Bosque.** Ruido de valor de dos octavas (celdas de 8 y de 4), umbral tal que
   cubra el 20–26 % del mapa. Se sesga hacia las laderas este y oeste y hacia el
   extremo norte: la aldea nace en claro, en el tercio central, y el bosque es lo
   que la encierra.
4. **Roca.** 3–6 afloramientos de 6–14 celdas, preferentemente lejos del río.
5. **Marisma.** Franja de 1–2 celdas junto al río en los tramos de menor
   pendiente. Terreno inservible, valor puramente visual.

**Sitio de fundación.** Se puntúa cada celda candidata por: distancia al río
(óptimo 3–6 celdas), pradera contigua libre en 12×12, distancia al centro del
mapa, y no adyacente a marisma. Gana la de mayor puntuación; empate por índice
menor.

**Test obligatorio:** para 200 semillas, el mapa generado tiene río continuo de
borde a borde, entre el 18 % y el 30 % de bosque, y un sitio de fundación válido.

### 7.2 Edificios

| Edificio | Celdas | Madera | Obra | Efecto | Tope |
|---|---|---|---|---|---|
| `house` | 2×2 | 60 | 40 | +5 de aforo | 16 |
| `field` | 3×2 | 0 | 60 | +600 de cosecha base | 8 |
| `granary` | 2×2 | 120 | 80 | +650 de capacidad | 3 |
| `well` | 1×1 | 40 | 30 | Peste ×0.6 | 1 |
| `chapel` | 2×2 | 150 | 120 | Fe y ánimo; habilita `priest` | 1 |
| `smithy` | 2×2 | 140 | 100 | Obra +20 %; habilita piedra | 1 |
| `mill` | 2×2 | 180 | 140 | Cosecha +15 % | 1 |
| `palisade` | 1×1 | 30 | 20 | Segmento de empalizada | — |
| `grave_yard` | 3×2 | 0 | 25 | Ánimo +0.05; lo abre una encrucijada | 1 |
| `wall` | 1×1 | 0 + 40 piedra | 60 | Mejora de `palisade` | — |
| `stone_house` | 2×2 | 0 + 50 piedra | 70 | Mejora de `house`; no arde | — |
| `church` | 3×3 | 0 + 120 piedra | 200 | Mejora de `chapel` | 1 |
| `watchtower` | 2×2 | 0 + 60 piedra | 90 | Solo por encrucijada | 2 |

La piedra no es un sexto recurso. Con `smithy` y roca en el mapa, su extracción
añade `stone / WORLD.STONE_PER_BP` a los puntos de obra del proyecto; se paga la
madera de la tabla al comenzar. No se almacena piedra dentro de `wood`: no había
un factor de conversión definido y mezclar ambos materiales ocultaría su coste.
Esta ronda no agota los afloramientos ni introduce un stock nuevo.

### 7.3 Prioridad de construcción

La aldea decide sola, siempre en este orden:

1. `field`, si `fields < min(MAX_FIELDS, neededFields)`
2. `house`, si `people > aforo − 2` y `houses < MAX_HOUSES`
3. `granary`, si `granaries < 3` y hay grano por encima del 80 % de la capacidad
4. `well`, si no existe y `people ≥ 25`
5. `chapel`, si no existe, `people ≥ 30` y `faith ≥ 45`
6. `smithy`, si no existe y `people ≥ 35`
7. `mill`, si no existe y `people ≥ 45`
8. `palisade`, si existe `smithy` y la bandera `threatened` está puesta
9. **Mejoras a piedra**, cuando no queda sitio: casas si A.16 las desbloqueó,
   luego empalizada si A.16 desbloqueó el muro, luego capilla

El punto 9 es lo que resuelve el problema de ritmo a largo plazo de `valle.md`
§7. Cuando el mapa se llena, el mismo motor de obras sigue funcionando pero
produce transformación en vez de superficie.

**Ámbito del punto 9 (v2.12).** «Cuando no queda sitio» se implementa como
«cuando no se puede empezar ninguno de los puntos 1 a 8»: sin parcela, sin
madera o sin necesidad. Es lo que cumple el motivo escrito arriba —que el motor
de obras no se pare— y evita que una aldea que ya lo tiene todo se quede sin
nada que hacer durante un siglo. Las mejoras exigen fragua y roca en el mapa
(§7.2), así que una aldea sin fragua sí se queda parada, que es el incentivo.

La aldea abre **un proyecto cada vez**. §7.3 es una lista ordenada de qué
empezar a continuación, no un conjunto de obras simultáneas: veinte personas
que abren ocho cimientos no terminan ninguno. Un `build` de encrucijada (§8.4)
entra en la misma cola en vez de saltársela, y los puntos que sobran al
terminar una obra pasan a la siguiente de la cola.

### 7.4 Colocación

Determinista y sin intervención del jugador. Para cada tipo se puntúa cada
posición válida y se elige la mejor; empate por índice menor.

| Tipo | Puntuación |
|---|---|
| `house` | Cerca del centro de masas de las casas; adyacente a camino; no sobre pradera cultivable de primera |
| `field` | Adyacente a otro campo o al río; llano; lejos del bosque |
| `granary` | Junto a los campos y a menos de 6 celdas de una casa |
| `chapel` | Celda alta y visible, algo apartada |
| `smithy` | En el borde del núcleo — el fuego lejos de las casas |
| `well` | Lo más cerca posible del centroide de las casas |
| `palisade` | Envolvente convexa del núcleo, dilatada 2 celdas |

Ninguna colocación puede pisar `water`, `marsh` ni `ruins` de piedra. Las ruinas
de madera **sí** se pueden edificar encima; la ruina desaparece del mapa pero
queda en la crónica.

**Cómo se ordenan estas preferencias (v2.12).** No hay elevación ni fertilidad
en el estado, así que no se inventa una suma de coeficientes: las preferencias
de cada fila se ordenan lexicográficamente, en el orden en que están escritas,
y empata el índice menor. Dos de ellas hay que leerlas con cuidado, porque la
lectura literal desperdiga la aldea por el valle entero:

- **`field` · «lejos del bosque» es *no adyacente* al bosque.** Maximizar la
  distancia al bosque manda los campos al borde del mapa, a veinticinco celdas
  de las casas, y arrastra los graneros con ellos.
- **`chapel` · «algo apartada» es al otro lado del borde del núcleo**, a
  `BUILDING_RULES.CHAPEL_SET_BACK` celdas de él, y «celda alta y visible» —la
  roca es el único sustituto disponible— desempata *dentro* de ese anillo. Con
  la roca como primera clave, un afloramiento lejano gana a cualquier sitio
  sensato y la capilla acaba contra el borde del mapa.

**La iglesia crece desde cualquiera de sus cuatro esquinas.** Es 3×3 sobre una
capilla de 2×2, así que tiene que ganar una celda en cada eje. Se prueban las
cuatro posiciones que siguen conteniendo a la capilla, en orden de fila, y vale
la primera que quepa. Probando solo la esquina superior izquierda, una capilla
con un vecino al sur o al este nunca llegaría a iglesia.

### 7.5 El bosque

Cada celda de bosque contiene `WOOD_PER_FOREST_TILE` unidades. Los leñadores
consumen de la celda de bosque más cercana al núcleo; al agotarla pasa a
`cleared` y `forestAge` se pone a 0.

Una celda `cleared` con 3 o más vecinas `forest` y sin edificio vuelve a
`forest` a los `FOREST_REGROWTH_YEARS`. El bosque retrocede desde la aldea hacia
fuera, deja un borde irregular y rebrota por detrás si se deja de talar. Con los
números de §12, un valle pierde la mitad de su bosque en unos cien años: visible
sin ser brusco.

### 7.6 Caminos emergentes

Cada tick, para cada aldeano vivo con casa y destino de trabajo, se suma 1 al
`traffic` de las celdas de su trayecto. El trayecto se calcula una vez, con A\*
sobre un coste que penaliza bosque y roca y premia `path`, y se cachea hasta que
cambie el mapa.

```
traffic ≥ PATH_T1  → path = 1 (trillado)
traffic ≥ PATH_T2  → path = 2 (sendero)
traffic ≥ PATH_T3 y hay smithy → path = 3 (calzada)
```

Todo `traffic` decae un 0.5 % por tick. Un camino que deja de usarse se borra
solo, que es exactamente lo que pasa cuando se abandona un campo.

Los caminos no son decoración: reducen el coste de A\*, así que se
autorrefuerzan, y esa realimentación es la que produce la forma orgánica de la
aldea sin que nadie la diseñe.

---

## 8. Sistema D — Encrucijadas

El verbo del jugador y el motor de la variedad. No se escriben una a una: se
generan cruzando los otros tres sistemas.

### 8.1 Esquema de plantilla

```ts
export interface CrossroadTemplate {
  id: string;                  // 'winter_grain_debt'
  category: CrossroadCategory;
  weight: number;              // peso base de selección
  cooldownYears: number;       // no puede repetirse antes
  maxPerGame?: number;
  minYear?: number;
  requires: Condition[];       // TODAS deben cumplirse
  cast: CastSpec[];
  title: string;               // clave del banco de textos
  body: string;                // clave del banco de textos
  options: CrossroadOption[];  // 2 o 3
}

export type CrossroadCategory =
  | 'famine' | 'plague' | 'lord' | 'feud'
  | 'faith' | 'forest' | 'stranger' | 'succession';

export interface CrossroadOption {
  id: string;
  label: string;               // clave: el verbo, 1–3 palabras
  cost: string;                // clave: el precio, visible antes de elegir — CONTRATO (v2.25)
  effects: Effect[];
  visible: VisualEffect[];     // OBLIGATORIO, longitud ≥ 1
  seeds: SeedSpec[];
  requires?: Condition[];      // la opción puede no estar disponible
  traitWeight?: Partial<Record<Trait, number>>; // el reparto pondera, no decide
}
```

**`visible` es obligatorio y con al menos un elemento.** Un test recorre el
catálogo y falla si alguna opción no cambia nada en pantalla. Es el principio 1
de `valle.md` convertido en un test que se ejecuta en cada commit.

**Regla de la aldea madura (v2.45).** Una plantilla cuyas condiciones describen
una aldea **en crecimiento** queda muda en cuanto la aldea **ha crecido**, y el
juego se queda sin presión justo donde más la necesita. Medido en la v2.44:
`forest_cut` aparece **cero veces en 240 partidas** —pide `neededFields > fields`
y con ocho campos eso ya no ocurre nunca— y la categoría `faith` se desploma
entre un 72 % y un 100 % en la segunda mitad, hasta desaparecer con dos
políticas, porque `chapel_or_granary` tiene `maxPerGame: 1` y `relic_pedlar`
exige `faith` entre 30 y 70, franja de la que una aldea con iglesia sale para no
volver.

El patrón es el mismo en los dos casos: **una condición formulada sobre una
carencia o sobre un rango muere cuando la carencia se cubre o el estado se
estabiliza fuera del rango.** Es la cara opuesta de la regla episódica de más
abajo: allí el problema era una condición siempre cierta; aquí, una que deja de
serlo para siempre.

**Toda plantilla debe declarar qué la mantiene viva en una aldea de ochenta
habitantes con el mapa lleno**, o aceptar explícitamente que es contenido de la
primera mitad. El diagnóstico obligatorio del catálogo gana una tercera columna:
apariciones en los años 100–200 frente a los años 0–100.

**Regla de elegibilidad episódica.** Toda plantilla necesita al menos una
condición **episódica**: falsa la mayor parte del tiempo, que se vuelve cierta
por un suceso o al cruzarse un umbral. Las condiciones **ambientales**
—`people ≥ 12`, `has chapel`, `forestLeft > 0.3`— dicen **quién** puede recibir
la pregunta, nunca **cuándo** se hace.

Una plantilla solo con condiciones ambientales dispara siempre que el techo se
lo permite, y con dieciséis plantillas así el jugador percibe un metrónomo.
La aritmética es implacable: para que el intervalo medio ronde los 480 ticks con
un techo de 120, en la inmensa mayoría de los ticks **no puede haber nada
elegible**. Eso solo ocurre si cada plantilla es elegible unas pocas semanas por
siglo.

**Diagnóstico obligatorio del catálogo — dos columnas, no una.**

| Métrica | Qué revela | Remedio |
|---|---|---|
| **% de ticks elegible** | Si la plantilla es ambiental. Por encima del 1 %, lo es. | Darle un disparador episódico |
| **Disparos ÷ máximo que permite su reposo** | Quién marca de verdad el paso. Por encima del 70 %, **manda el reposo, no las condiciones**. | Alargar el reposo |

Las dos columnas hacen falta porque miden cosas distintas y se confunden con
facilidad: una plantilla puede bajar del 70 % de elegibilidad al 4 % y **seguir
disparando lo mismo**, porque a partir de cierto punto el que fija el ritmo es
su reposo. Endurecer condiciones deja de servir en cuanto la elegibilidad cae
por debajo de la tasa que impone el reposo; de ahí en adelante, el reposo es lo
único que queda antes del techo.

**El precio escrito es un contrato (v2.25).** El texto de `cost` es lo único que
el jugador ve antes de elegir, y es una promesa. **Si los efectos no la
entregan, la plantilla miente**, y lo que el jugador aprende no es a temer las
opciones duras: aprende que son palabrería, y a partir de ahí las escoge sin
mirar. Una opción cuyo precio dice «People will die this winter» y da `morale
+10` sin una sola muerte no es una decisión difícil mal calibrada — es una
decisión falsa.

La regla, entonces: **para cada opción, lo que promete la columna «Precio» tiene
que estar en sus efectos o en su semilla**, y una semilla solo cuenta si lo que
lleva dentro lo lee alguien. Una bandera que nadie lee no es un coste; es un
comentario.

Es una regla de revisión, no de código: no hay aserto que sepa leer inglés. Se
comprueba a mano cada vez que se toca una plantilla, y la auditoría completa de
las 48 opciones está en §2.25 — 13 mentían y 9 cumplían a medias, casi todas por
la misma causa: **catorce banderas que se ponen y nadie lee.**

### 8.2 DSL de condiciones

Datos, no funciones. Deben ser serializables para poder inspeccionar por qué se
disparó una encrucijada.

```ts
export type Condition =
  | { k: 'stat';    stat: 'grain'|'wood'|'morale'|'faith'|'people'; op: Op; v: number }
  | { k: 'ratio';   ratio: 'grainYears'|'grainToHarvest'|'housingFree'|'forestLeft'; op: Op; v: number }
  | { k: 'season';  season: Season }
  | { k: 'year';    op: Op; v: number }
  | { k: 'has';     building: BuildingKind }
  | { k: 'flag';    flag: string; set: boolean }
  | { k: 'outbreak'; active: boolean }
  | { k: 'role';    role: Role; alive: boolean }
  | { k: 'grudge';  min: number }            // existe una opinión ≤ −N (no el registro)
  | { k: 'trait';   role: Role; trait: Trait }
  | { k: 'not';     c: Condition }
  | { k: 'any';     cs: Condition[] };

export type Op = '<' | '<=' | '>' | '>=' | '==' ;
```

**Trampa de estación: el invierno es el momento MÁS lleno del granero.** La
cosecha cae en la semana 35 y el invierno empieza en la 36, así que `season =
winter` y «granero vacío» están **anticorrelacionados**. Ninguna plantilla de
escasez debe apoyarse en la estación: se apoya en `grainToHarvest`, que es la
magnitud que pregunta si se llega. Este fallo ya se cometió dos veces, en A.1 y
en A.4.

```ts
```

### 8.3 Reparto (`cast`)

Vincula letras a aldeanos concretos. Si un papel no se puede cubrir, la
plantilla no es elegible.

```ts
export type CastSpec =
  | { as: string; role: Role }
  | { as: string; anyNamed: true; excluding?: string[] }
  | { as: string; grudgeAgainst: string }        // el que más le odia
  | { as: string; childOf: string }
  | { as: string; youngestNamed: true; female?: boolean };
```

El reparto se resuelve **en orden de dependencia, no de declaración**: una
plantilla puede escribir `{as:'B', grudgeAgainst:'A'}` antes que `A` sin fallar
en silencio. Un ciclo entre dos letras devuelve `null` — la plantilla no es
elegible— en vez de colgarse.

**Y con vuelta atrás.** Elegir `A` a ciegas y preguntar después quién lo odia
acierta una vez de cada ocho, así que una plantilla puede cumplir sus `requires`
siempre y no repartir jamás: contenido muerto que **ninguna medición de
elegibilidad detecta**, porque las condiciones se cumplen perfectamente.
`fillCast` no puede elegir un vínculo que deje sin cubrir una letra dependiente:
si lo hace, deshace y prueba otro.

### 8.4 Efectos

```ts
export type Effect =
  | { k: 'stat';   stat: StatName; delta: number }
  | { k: 'stat';   stat: StatName; mul: number }
  | { k: 'kill';   who: 'random'|'weakest'|string; count: number | 'fraction'; fraction?: number }
  | { k: 'leave';  who: string; count?: number }
  | { k: 'arrive'; count: number }
  | { k: 'flag';   flag: string; years: number }   // 0 = permanente
  | { k: 'build';  kind: BuildingKind; free: true }
  | { k: 'destroy'; kind: BuildingKind; count: number; blockYears?: number }
  | { k: 'fell'; wood: number; permanent: boolean }
  | { k: 'harvest'; factor: number; harvests: number }
  | { k: 'outbreak'; weeks: number }
  | { k: 'opinion'; from: string; to: string; delta: number }
  | { k: 'memory'; who: string; kind: MemoryKind; about?: string; weight: number }
  | { k: 'role';   who: string; role: Role | null }
  | { k: 'lit';    kind: BuildingKind; on: boolean };

export type VisualEffect =
  | { k: 'raise';   kind: BuildingKind }
  | { k: 'ruin';    kind: BuildingKind }
  | { k: 'banner';  colour: string; years: number }  // estandarte sobre el núcleo
  | { k: 'douse';   kind: BuildingKind; who?: string }  // apagar un edificio;
                                                      // `who` = letra del reparto
  | { k: 'gather';  where: 'square'|'chapel'|'ford'; days: number }
  | { k: 'scar';    what: 'burnt_field'|'grave_row'|'felled_wood' };
```

### 8.5 Semillas — la consecuencia diferida

Es la mitad del diseño. Sin ella una encrucijada es un menú de modificadores;
con ella, es una decisión.

```ts
export interface SeedSpec {
  id: string;
  delayYears: [number, number];   // se sortea dentro del rango
  condition?: Condition;          // si falla al vencer, la semilla se marchita
  effects: Effect[];
  visible: VisualEffect[];
  chronicleKey: string;           // el texto que enlaza con la decisión original
}
```

Al vencer, la entrada de crónica **cita explícitamente la decisión que la
plantó**, con el año. «Thirty-one years after Osric swore to Wealdmere, the
lord's men came for his grandson.» Esa frase es el producto del juego.

**Los dientes salen de componer, no de subir números (v2.25).** Cuando el
catálogo resulte blando —y §2.25 lo mide: `worst` termina el 8,3 % de las
partidas— la respuesta **no** es multiplicar los efectos. Una decisión mala debe
ser **sobrevivible**; tres seguidas, no. Efectos más grandes hacen que una sola
tirada liquide la partida, y eso choca de frente con el principio de
«decisiones raras y pesadas» de §8.6: si la primera te mata, no hay segunda, y
la aldea deja de ser una historia para ser una moneda al aire.

Lo que sí compone es esto: que el coste **caiga sobre lo que la aldea necesita
para absorber el siguiente golpe**. Vaciar el granero no mata a nadie esa
semana; deja a la aldea sin colchón para el invierno que viene. Quemar un campo
no mata a nadie; baja el techo de la cosecha durante años. Esa es la diferencia
entre un juego donde equivocarse duele y uno donde equivocarse mata.

Regla: toda plantilla con una opción de beneficio inmediato claro debe plantar
al menos una semilla. La suite de balance lo verifica.

### 8.6 Selección

En el paso 15 del tick, si no hay encrucijada pendiente:

```
if tick − lastCrossroadTick < MIN_TICKS_BETWEEN and not crisis: return
eligible = catalog.filter(t =>
     all(t.requires) and
     cooldown ok and
     maxPerGame ok and
     cast completable)
if eligible is empty: return
score(t) = t.weight
         · crisisMultiplier(t)          // ×4 si su categoría es la crisis activa
         · storyMultiplier(t)           // reputación y protección; ver abajo
         · traitMultiplier(t)           // rasgos del reparto
         · noveltyMultiplier(t)         // ×0.4 si ya salió en esta partida
pick weighted by score, from the 'crossroads' stream
```

**El componente `story`, y cómo se compone (v2.43).** Las semillas pueden
modificar el peso de una categoría: es lo que el Anexo A prometía desde la v2.0
para `a_name_in_the_valley` (×0,5 sobre `lord`) y `behind_the_wall` (×0,4 sobre
`lord` y `stranger`), y lo que `feud_ripe` hace al revés (×4 sobre `feud`).

**Varios modificadores sobre la misma categoría NO se multiplican: gana el más
fuerte.** El muro y la reputación dicen lo mismo —«a esta aldea se la molesta
menos»— así que son la misma dimensión, no dos dados independientes.
Multiplicándolos, 0,4 × 0,5 = 0,2, y una tercera semilla dejaría la categoría
muda; con el máximo, quedan en 0,4 y el efecto sigue leyéndose. Los otros
multiplicadores —crisis, novedad, rasgo— sí se multiplican entre sí, porque cada
uno mide algo distinto. Como red de seguridad, el componente `story` nunca baja
de **0,25**.

Esto importa más de lo que parece: `behind_the_wall` dura 20–40 años y
`a_name_in_the_valley` 5–15, así que caen justo en la fase tardía, cuando la
aldea es más fuerte y el juego más necesita presión exterior. Silenciar ahí
`lord` y `stranger` es quitarle dientes al catálogo precisamente donde ya se ha
medido que no los tiene.

**Crisis** = hambruna proyectada —`grain < people · (semanas que faltan hasta la
semana 35)`, es decir, la despensa no llega a la próxima cosecha—, brote activo,
bandera `threatened`, o muerte del líder.

**La exención se gasta en la primera pregunta.** Una crisis y la sucesión se
saltan el techo de 120 ticks, pero **una sola vez por episodio**, no mientras
dure la condición. Una hambruna dura meses y un puesto vacante dura hasta que
alguien lo toma: una exención que valiera todo ese tiempo dispararía la misma
encrucijada cada dos ticks y convertiría la decisión en un menú. §6.6 dice que
la sucesión se dispara «siempre» al morir el líder: **una vez por muerte, no una
vez por tick.**

**Garantía por generación:** si han pasado 960 ticks sin ninguna encrucijada, se
fuerza la de mayor puntuación aunque no sea crisis. Si no hay ninguna elegible
—cosa rara— se usa la plantilla de reserva `quiet_years`, que ofrece al jugador
qué hacer con un excedente.

**Techo:** una cada 120 ticks (30 minutos reales a ×1). Las encrucijadas tienen
que seguir siendo raras o dejan de pesar.

**Cómo se comprueba que el ritmo es sano.** No basta con contar encrucijadas por
partida: hay que mirar **qué fracción de los intervalos queda pegada al techo**.
Si el techo manda casi siempre, el jugador percibe un metrónomo en vez de un
mundo, aunque el total parezca razonable.

| Señal | Diagnóstico | Remedio, en este orden |
|---|---|---|
| La garantía se dispara a menudo | Casi nada resulta elegible | Aflojar condiciones del catálogo |
| **> 40 % de intervalos al ras del techo** | Manda el reloj, no el contenido | Endurecer condiciones; luego subir cooldowns; **subir el techo es el último recurso** |
| < 40 %, y la garantía a cero | Sano | — |

Se mide con el catálogo real de 16 plantillas, sobre 20 semillas × 100 años.

### 8.7 Resolución

Mientras hay una encrucijada pendiente **la simulación no se detiene**. La aldea
sigue comiendo y muriendo. Esto es importante: dudar tiene un precio, y volver
tras cuatro horas para encontrarse la decisión aún abierta y el granero vacío es
una historia, no un error.

La encrucijada no caduca nunca. No se pierde por ausencia (§1).

---

## 9. La crónica

### 9.1 Cómo se compone

Los sistemas empujan `ChronicleEntry` con `templateKey` y `params`. Al mostrar,
`renderEntry` elige una de las 3–5 variantes de esa clave y sustituye los
parámetros.

**Componer no consume aleatoriedad.** La variante es una **función pura** de la
semilla maestra, la clave, el tick y un discriminante que distingue dos entradas
de la misma clave en el mismo tick (su posición en `chronicle` sirve). El flujo
`chronicle` es la fuente de la semilla, no un flujo que se avance: nadie lo
consume nunca. Si cada render gastara una tirada, desplazar la crónica en
pantalla y volver reescribiría la historia de la aldea — y el aislamiento de
§4.3 dejaría de significar nada.

**La capitalización se resuelve al componer**, no escribiendo mejor las
plantillas: el mismo hueco `{count}` va al principio en unas líneas y a mitad de
frase en otras. Si la sustitución cae en la primera posición, se capitaliza.

```ts
// Banco de textos: src/engine/chronicle/bank.en.ts
export const BANK: Record<string, string[]> = {
  'death.old': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. The granary took {grain} bushels; the village is {people}.',
  ],
  // ...
};
```

### 9.2 Pesos y filtrado

Cada entrada tiene peso 1–3. La pantalla de crónica muestra por defecto los
pesos 2 y 3; el peso 1 (nacimientos y muertes corrientes, cambio de estación)
aparece al desplegar un año. **Cualquier volcado de crónica —pantalla, runner de
consola, parte de bienvenida— aplica el filtro.** Volcar los tres pesos produce
un registro de obra, no una crónica.

**Tabla de pesos, normativa:**

| Peso | Qué |
|---|---|
| **3** | Fundación, extinción, muerte de un nombrado, sucesión, encrucijada y su consecuencia diferida, brote de peste, hambruna con muertos |
| **2** | Cosecha excepcional (ruinosa o abundante), llegada o marcha de gente, incendio, edificio **singular** terminado (capilla, iglesia, fragua, molino, pozo, primer granero), rencor formado |
| **1** | Todo lo demás: casas, campos, graneros posteriores, **cada tramo de empalizada o muro**, cosecha normal, nacimientos y muertes corrientes, cambio de estación |

**Y se agregan por año.** Varias entradas de la misma clave en el mismo año se
componen en una sola línea con su recuento: veintiún tramos de empalizada son
*«The palisade closed around the village that year»*, no veintiuna líneas. Sin
esto, un año de obra sepulta la peste, la decisión y los muertos que lo rodean —
que es exactamente lo que pasó en la primera lectura del hito 0.

El **parte de bienvenida** al volver de una ausencia muestra, como máximo: el
titular de peso 3 más reciente, hasta 4 entradas de peso 2, y un resumen
numérico de lo que cambió (gente, edificios levantados o perdidos). Las cuatro
plazas toman primero el suceso más reciente de cada `ChronicleKind`; si quedan
plazas, se completan con una segunda aparición reciente de cada tipo, nunca una
tercera. El resultado se lee en orden cronológico.

### 9.3 Regla de escritura

Los textos son cortos, concretos y sin adjetivar. Nombran a la gente, el año y
la cifra. El drama sale del suceso, no de la prosa — si hay que adornar la
frase para que sea interesante, el suceso no lo era y el problema está en el
cruce de sistemas, no aquí (`valle.md` §8).

Prohibido en el banco de textos: signos de exclamación, segunda persona,
metáforas, y cualquier frase que valore la decisión del jugador. La crónica
narra, no juzga.

### 9.4 La muerte de un nombrado

Una muerte corriente es una línea de peso 1. **La de un nombrado es de peso 3**,
y no puede limitarse a decir el nombre y la edad: tiene que cargar con quién fue
esa persona. Al componerla se le añade una subordinada, eligiendo en este orden:

1. Su **rencor abierto más antiguo**. Antiguo, no hondo: una enemistad de treinta
   años dice más de quién fue alguien que una del invierno pasado.
2. Si no tiene ninguno abierto, su **rencor sanado más largo**. Un arco cerrado
   es tan buen epitafio como uno abierto, y da una de las mejores líneas que
   puede escribir este juego: *«They had not spoken for seven years, and then
   they had.»*
3. Si tampoco, su **memoria de mayor peso**.
4. Si no hay nada, la variante desnuda: nombre, estación y edad.

> *Aethelred died in the winter of year 14, sixty-eight winters old. He had not
> spoken to Wulfnoth since the year 5.*

Sin esa segunda frase, los tres momentos que definieron a Aethelred —la disputa
del año 5, la reconciliación del 12 y su muerte en el 14— quedan en la crónica
como tres líneas sueltas que ningún lector enlaza, y el personaje se muere sin
haber existido. Es el mismo mecanismo que las semillas de §8.5 aplicado a las
personas en vez de a las decisiones: **el material narrativo del juego no está
en los sucesos, está en los enlaces entre sucesos separados por años.**

La sucesión que sigue a la muerte de un líder cita también a quién sucede.

### 9.5 Criterio del hito 0

Tres crónicas de tres partidas distintas, leídas por alguien ajeno al proyecto,
que sepa contar en qué se diferencian. **Esto es lo que decide si el proyecto
sigue.**

---

## 10. Render

Canvas 2D. El render **lee** el estado y no lo modifica nunca. Es un test de
arquitectura: `src/render/` no importa nada que mute `GameState`.

### 10.1 Geometría

```
cell = floor(min(viewportW / 36, viewportH / 56))
canvas = 36·cell × 56·cell, centrado, con devicePixelRatio aplicado
```

En un móvil de 390 × 844 CSS px con la interfaz ocupando 180 px de alto:
`min(390/36, 664/56) = min(10.8, 11.9) = 10`. El valle mide 360 × 560 px y deja
284 px para interfaz y áreas seguras. **Todo el arte se diseña para 10 px de
celda** y debe seguir leyéndose a 9. Si algo no se lee
a ese tamaño, no se dibuja.

### 10.2 Capas

Orden de dibujo, sin excepciones:

| # | Capa | Cuándo se redibuja |
|---|---|---|
| 1 | Terreno base | Al cambiar de estación o mutar el mapa. **Cacheada en un canvas aparte.** |
| 2 | Agua animada | Cada fotograma (2 fotogramas de desfase, muy barato) |
| 3 | Caminos | Con la capa 1 |
| 4 | Ruinas | Con la capa 1 |
| 5 | Sombras de edificio | Con la capa 1 |
| 6 | Edificios | Con la capa 1 |
| 7 | Sombras de figura | Cada fotograma |
| 8 | Figuras | Cada fotograma |
| 9 | Meteorología (nieve, lluvia) | Cada fotograma |
| 10 | Tinte de hora | Cada fotograma |
| 11 | Marcadores de interfaz | Al tocar |

Las capas 1 y 3–6 se componen en un **canvas de fondo cacheado** que solo se
regenera cuando cambia la estación o se levanta o se pierde un edificio. El
bucle por fotograma dibuja el fondo cacheado y encima las capas 2, 7–11. Es lo
que permite 80 figuras a 60 fps en un móvil de gama media.

### 10.3 Paletas

Doce colores por estación. La estación se reconoce por el color antes que por
ningún indicador.

| Ranura | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| `void` | `#b9c9cf` | `#c9cfc2` | `#cfc4b2` | `#c6ccd2` |
| `meadow` | `#96b562` | `#99aa52` | `#a89a55` | `#d9dde0` |
| `meadowAlt` | `#7fa050` | `#8fa14c` | `#98884a` | `#c9ced3` |
| `field` | `#95924a` | `#d2b258` | `#d0b05a` | `#cfd4d6` |
| `forest` | `#4f7a3c` | `#46703a` | `#8a6f33` | `#3d5544` |
| `forestDark` | `#3c6030` | `#35562c` | `#6a5326` | `#2e4235` |
| `water` | `#6ca0ba` | `#69a2b2` | `#6c96a7` | `#aebfc6` |
| `rock` | `#9a968f` | `#a39e94` | `#a09a90` | `#8e939a` |
| `path` | `#b49e76` | `#bfa77d` | `#b89e75` | `#b4b0a6` |
| `wood` | `#8a6a45` | `#8a6a45` | `#83643f` | `#6f563a` |
| `roof` | `#6d5236` | `#6d5236` | `#654c32` | `#55402a` |
| `accent` | `#d9d2c2` | `#efe6cf` | `#e8d9b8` | `#f2f4f6` |

Derivados, calculados y no escritos a mano:

```
outline(c)  = mezcla de c con negro al 45 %
shadow      = rgba(0, 0, 0, 0.22)
```

La transición entre estaciones interpola las doce ranuras a lo largo de las dos
primeras semanas de la estación nueva. Un corte seco de color se lee como un
fallo.

**Test obligatorio:** cada paleta pasa la comprobación de silueta — convertida a
escala de grises, `forest`, `meadow`, `field`, `water` y `path` mantienen entre
sí al menos 8 puntos de luminancia de diferencia. Es la regla «silueta antes que
color» de `valle.md` §6, verificable.

### 10.4 Reglas de estilo, implementadas

- **Sombra.** Todo lo que está de pie proyecta sombra: desplazamiento
  `(+0.30, +0.18)` celdas, color `shadow`. Edificios: el mismo polígono
  desplazado. Figuras: elipse de `0.7 × 0.25` celdas.
- **Contorno.** `lineWidth = max(1, cell · 0.12)`, color `outline(relleno)`.
  Edificios y figuras siempre; terreno nunca.
- **Manchas grandes.** El terreno se compone de regiones, no de celdas: se
  agrupan celdas contiguas del mismo tipo y se dibuja el contorno del grupo con
  una perturbación determinista de ±0.15 celdas en los vértices. Prohibido el
  ruido por celda.
- **Nada de texturas.** Un campo son cinco surcos rectos, no una trama.
- **Ruina heredada.** La máscara de una aldea anterior se lee como una sola
  cimentación baja: `palette.rock` a alfa `0.58`, con trazo únicamente en los
  bordes cardinales expuestos, color `outline(palette.wood)` y ancho
  `max(1 px, cell · 0.10)`. No se repite el sprite `ruin` por celda: a 10 px se
  convierte en textura y deja de leerse como la huella de un poblado.

### 10.5 Sprites, dibujados por código

Cada uno es una función pura `(ctx, x, y, cell, palette, tier) => void`.

| Sprite | Composición |
|---|---|
| `house` | Cuerpo trapezoidal `1.6×1.1` celdas + techo a dos aguas `1.9×0.9` + puerta oscura de `0.3` |
| `stone_house` | Igual, con `wood` sustituido por gris y una chimenea de `0.25` |
| `field` | Rectángulo con 5 surcos; el color depende de la estación y de si ya se cosechó |
| `granary` | Cuerpo alto y estrecho, sobre 4 pilotes visibles |
| `chapel` | Nave baja + espadaña de `0.5×1.2` con una cruz de dos trazos |
| `church` | Nave larga + torre de `1.0×2.2` |
| `smithy` | Cobertizo abierto + yunque + **resplandor naranja si `lit`** |
| `mill` | Torre + aspas de 4 trazos en orientación fija. Una animación futura exige capa dinámica, estado de viento y presupuesto propios (§2.51) |
| `well` | Círculo + arco de dos postes |
| `palisade` | Serie de trazos verticales de `0.9` de alto con puntas |
| `wall` | Bloque de `1.0` con almenas cada 2 celdas |
| `villager` | Elipse-cuerpo `0.45×0.8` + círculo-cabeza `0.32`, altura total `1.5` celdas |
| `named` | Igual, altura `1.8`, color propio de la lista de tonos, y un punto de `0.2` sobre la cabeza |
| `ruin` | 2–3 trazos bajos e irregulares en `outline(wood)`, sin sombra |

Los ocho tonos de los nombrados son fijos y se asignan por orden de aparición,
para que un personaje conserve su color toda la partida.

### 10.6 La multitud

Hasta 80 figuras. **No se simulan**: se programan.

Cada aldeano vivo tiene un `anchorHome` y un `anchorWork` **derivados y
cacheados, nunca guardados en `GameState`** (su casa y su campo, taller o el
bosque; ver §2.52). El ciclo cosmético del día tiene cuatro tramos:

| Tramo | Fracción del tick | Dónde |
|---|---|---|
| Amanecer | 0.00–0.15 | Saliendo de casa |
| Jornada | 0.15–0.60 | En el destino, con deriva local de ±0.5 celdas |
| Regreso | 0.60–0.80 | Camino de vuelta |
| Noche | 0.80–1.00 | Dentro; no se dibujan, pero la ventana se ilumina |

La posición se interpola sobre el trayecto cacheado de A\* (§7.6) con una
desviación de fase por figura derivada de su `id`, de modo que no salen todas a
la vez. Un domingo de cada cuatro ticks, el destino de todos es la plaza.

Coste: una interpolación y dos primitivas por figura y fotograma. Es
indistinguible de una simulación completa porque nadie mira a un aldeano
concreto durante veinte minutos.

### 10.7 Presupuesto de rendimiento

- 60 fps con 80 figuras y 45 edificios en un móvil de gama media de 2022.
- El fondo cacheado se regenera en menos de 30 ms.
- Un tick del motor, menos de 2 ms con 80 aldeanos. Un siglo, menos de 10 s.

---

## 11. Interfaz

### 11.1 Principio

El valle es el HUD. Por defecto no hay ni una cifra en pantalla. Lo que el
jugador necesita saber lo dice el propio valle:

| Lo que quiere saber | Cómo lo ve |
|---|---|
| Cuánta gente hay | Cuenta figuras, o mira cuántas casas tienen luz |
| Cómo va el grano | El granero se dibuja lleno, a medias o vacío |
| Si hay hambre | Las figuras se mueven más despacio y hay menos en el campo |
| El ánimo | Humo en las chimeneas, y la plaza llena o vacía el domingo |
| La fe | Velas en la capilla |
| Si hay peste | Cruces junto a las puertas; el cementerio crece |
| La estación | El color de todo |

Al tocar cualquier elemento aparece una ficha con **la cifra exacta**. El juego
no esconde datos: los pone a un toque de distancia en vez de a cero.

### 11.2 Pantallas

Cinco, y solo cinco.

**1. El valle.** Por defecto. Arriba a la izquierda, el año en números romanos
pequeños. Abajo a la derecha, los controles de velocidad. Nada más.

**2. Ficha.** Se despliega desde abajo al tocar. Para un edificio: qué es, cuándo
se levantó, quién lo usa, la cifra relevante. Para un nombrado: nombre, edad,
rasgos, dos líneas de memoria y sus opiniones fuertes.

**3. Encrucijada.** Ocupa la pantalla entera, se abre con el valle atenuado
detrás. Título, tres o cuatro frases de contexto, y las opciones como bloques
grandes con **el verbo y el precio**, siempre visible el precio. Sin botón de
cerrar: se decide o se vuelve al valle con gesto, y la encrucijada sigue
pendiente con una marca discreta.

**4. Crónica.** Lista desplazable por años. Al abrir tras una ausencia, encabeza
el parte de bienvenida (§9.2). Si el archivo contiene aldeas anteriores, una
banda fija permite alternar entre «This valley» y cada antepasada, de más
reciente a más antigua. La banda queda dentro de esta pantalla: no abre otra.
Usa fondo `#14130f`, etiqueta dorada `#c9b46b` a `12 px/1.2`, hueco de `6 px` y
margen inferior de `18 px`. El selector mide al menos `44 px`, con relleno
`9 px 34 px 9 px 11 px`, borde `#756c55` de `1 px`, radio `8 px`, fondo
`#24221b` y texto `#f2f4f6` a `14 px/1.2`. Se fija `20 px` por encima del borde
de desplazamiento para compartir el área segura y no tapar el primer año.

**5. Epitafio.** Solo aparece al terminar una aldea. El valle permanece detrás
con un velo `rgba(18,17,14,0.78)` y los controles desaparecen. La tarjeta ocupa
el ancho inferior: relleno superior `max(24 px, safe-area)`, horizontal `20 px`
y fondo `max(28 px, safe-area)`. Título Georgia `23 px/1.2`; texto de cuerpo
`14 px/1.4`, `#d7dadd`. Las acciones se separan `10 px`, empiezan `22 px` bajo
el resumen y miden al menos `48 px` de alto, con relleno `12 × 14 px`, radio
`10 px` y Georgia `15 px/1.2`. La secundaria usa fondo blanco al 10 % y borde al
40 %; «Begin again» usa fondo y borde `#d8c574`, texto `#242016`. El año de la
causa es civil (`yearOf(endedTick) + 1`); la duración son años completos
(`yearOf(endedTick)`). Contiene causa, duración, pico, «Read the chronicle» y
«Begin again»; no se cierra con un toque accidental.

### 11.3 Gestos

| Gesto | Acción |
|---|---|
| Toque | Abrir ficha |
| Toque fuera | Cerrar ficha |
| Deslizar arriba | Crónica |
| Deslizar abajo | Volver al valle |
| Pellizcar | Zoom de 1× a 2,5×, solo para mirar de cerca. **No hay desplazamiento de cámara a 1×: el mapa cabe entero.** |
| Mantener pulsado | Marcar a un nombrado para seguirlo con un halo |

La lógica de gestos vive en `src/ui/gestures.ts`, sin DOM y con tests, como
exige `valle.md` §11.

### 11.4 La interfaz no anima sobre el reloj del navegador

**Ninguna animación de interfaz puede depender del reloj del compositor.** El
juego tiene su propio reloj y el jugador lo controla: pausa, ×1, ×4, ×16, y el
letargo de §13.2 que ejecuta **960 ticks en menos de dos segundos**. Una
transición CSS corre sobre un reloj que no tiene ningún motivo para coincidir con
ninguno de esos, y en cuanto los dos discrepan la interfaz se queda a medias.

Se descubrió en M-22 y no lo cazó una revisión visual: lo cazó una prueba de
reloj falso que encontró el zoom **atascado a mitad de recorrido**. El arreglo
fue sustituir la transición por un corte seco.

La regla, generalizada:

- Lo que representa el estado del juego se anima con **la fracción del tick**,
  nunca con tiempo de pared. La multitud de §10.6 ya lo hace bien.
- Lo que es afordancia para el humano —el enfoque de dos segundos de §11.2— sí
  puede usar tiempo real, pero **debe tener un estado bien definido en todo
  instante y sobrevivir a un salto de reloj**. Si no se puede garantizar, corte
  seco.
- **El caso de prueba es el letargo.** Cualquier animación que no aguante 960
  ticks en dos segundos está mal, y ahí es donde se comprueba.

### 11.5 Cuando el efecto visible no tiene sitio

Los `VisualEffect` no traen coordenada. El motor la deriva al aplicarlos y solo
usa el centro del núcleo (`valleyCore`) cuando la identidad concreta no existe:

| Efecto | Por qué no tiene celda | Deuda |
|---|---|---|
| `banner` | Es sobre el núcleo por definición | Ninguna: correcto |
| `gather where:'ford'` | Los caminos no pueden pisar agua: el cruce literal no existe | Resuelta en v2.66: orilla transitable contigua al río más cercana al núcleo |
| `scar:'felled_wood'` | `fellForest` **sí** elige celda | Resuelta en v2.66: devuelve también la primera celda tocada |
| `douse` con varias instancias | El esquema nombra el **tipo**, y la plantilla quiere **una** | Contrato: ver abajo |

**`douse` gana `who`.** A.7 promete apagar «el edificio de B» y el esquema solo
sabía decir «un edificio de este tipo»: apagaba una casa cualquiera. Es la misma
mentira que §8.1 persigue en la columna del precio, en la columna del efecto
visible. Con `who` —una letra del reparto— se resuelve al edificio de esa
persona. Si no se puede resolver y hay varias instancias, conserva el respaldo
del núcleo; escoger la primera por orden convertiría una falta de identidad en
una identidad falsa.

### 11.6 Accesibilidad

- Ningún dato depende solo del color: la estación se refuerza con el marco del
  canvas y con el texto de la ficha.
- Objetivos táctiles mínimos de 44 px; las figuras se agrandan al tocar cerca.
- Respeta `prefers-reduced-motion`: sin nieve animada, sin aspas girando, la
  multitud se dibuja quieta en su tramo.

---

## 12. Balance

**Todos los números del juego están aquí, con una excepción declarada.** Este
capítulo se traduce literalmente a `src/engine/balance.ts`. La excepción es la
**tabla de edificios de §7.2** —celdas, madera, obra, efecto y tope—, que
también es balance y vive allí porque se lee junto al resto del sistema del
valle; se transcribe a `balance.ts` como `BUILDINGS` y esa transcripción es la
que consume el motor. Fuera de §12 y de esa tabla no hay ningún número del
juego. Cualquier constante que un módulo necesite y no esté en ninguna de las
dos se añade a `balance.ts` con `// TUNE:` y se menciona en el PR.

Estos valores no son una hipótesis en bruto: salen de simular 60 semillas
durante 200 años cada una y ajustar hasta cumplir los objetivos de §12.9. Siguen
siendo provisionales en el sentido de que la primera partida larga real
(hito 5) manda, pero son un punto de partida jugable, no un relleno.

### 12.1 Tiempo

```ts
export const TIME = {
  WEEKS_PER_SEASON: 12,
  WEEKS_PER_YEAR: 48,
  HARVEST_WEEK: 35,
  GENERATION_YEARS: 20,
  REAL_MS_PER_TICK: 15_000,
  SPEEDS: [0, 1, 4, 16],
  LETHARGY_CAP_MS: 4 * 60 * 60 * 1000,
} as const;
```

### 12.2 Fundación

```ts
export const FOUNDING = {
  POPULATION: 20,          // 6 nombrados + 14 anónimos
  ADULTS: 13, CHILDREN: 5, ELDERS: 2,
  GRAIN: 800,
  WOOD: 200,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 4,
  FIELDS: 2,
} as const;
```

Comprobación, con el cálculo explícito para que nadie lo «arregle» en ninguna
de las dos direcciones:

```
consumo = 20 personas · 48 semanas · 1.0            =   960
cosecha = 2 campos · 600 · 1.00 clima · 1.02 ánimo  = 1 224
margen  = 1 224 / 960                               = 1.275
```

El 1.02 es el factor de ánimo de la fundación: `0.8 + 0.4 · 0.55`, con
`MORALE = 55`. El cociente desnudo, sin ánimo, es `1 200 / 960 = 1.25`, y
**también es correcto**: es el mismo margen visto sin el multiplicador. Los dos
números aparecen en sitios distintos del proyecto y ninguno es una errata.

El margen es, pues, del 27 %, y el arranque de 800 de grano cubre casi un año
entero. La primera hambruna es cuestión de cuándo, no de si.

**`GRAIN` es exactamente `BASE_STORAGE`, y eso es a propósito.** Con 900 la
aldea nacía por encima de su propia capacidad y perdía grano a merma desde el
primer tick, que se lee como un fallo aunque no lo sea. El cambio no mueve la
tasa de extinción, los años de extinción ni la mediana de pico.

### 12.3 Subsistencia

```ts
export const FOOD = {
  GRAIN_PER_PERSON: 1.0,        // por semana
  FIELD_YIELD: 600,             // por campo, cosecha completa
  FIELD_CREW: 4,                // adultos para trabajar un campo entero
  MIN_FIELD_CREW: 2,            // por debajo, el campo NO rinde nada (§5.2)
                                // INERTE por medición (v2.24): ninguna partida
                                // bajó nunca de 2,13 adultos por campo. Se
                                // conserva como invariante, no como mecánica.
  MAX_FIELDS: 8,
  BASE_STORAGE: 800,
  GRANARY_CAPACITY: 650,
  MAX_GRANARIES: 3,
  SPOILAGE: 0.08,               // semanal, sobre el excedente
  STARVATION_RATE: 0.025,       // muertos/semana como fracción, por severidad
  MILL_BONUS: 1.15,
} as const;

export const LABOUR = {
  WOOD_PER_CUTTER: 3.0,         // por semana
  BP_PER_BUILDER: 2.0,          // puntos de obra por semana
  WORKS_RESERVE: 0.15,          // fracción mínima de W dedicada a obras
  CUTTER_SHARE: 0.40,           // del sobrante tras el campo
  SMITHY_BONUS: 1.20,
  WINTER_WOOD: 0.4,             // por persona y semana
  COLD_HOUSES_WOOD_MULTIPLIER: 1.5,
  COLD_MORTALITY: 1.4,
} as const;

export const WEATHER = [        // factor, probabilidad
  { f: 0.60, p: 0.15 },   // ruinous
  { f: 0.80, p: 0.20 },   // lean
  { f: 1.00, p: 0.40 },   // fair
  { f: 1.20, p: 0.15 },   // good
  { f: 1.45, p: 0.10 },   // abundant
] as const;
```

### 12.4 Demografía

```ts
export const LIFE = {
  BIRTH_BASE: 0.0038,           // por mujer fértil y semana
  FERTILE: [16, 40],
  ADULT: [15, 59],
  MORTALITY: [                  // anual, por tramo de edad
    { to: 4,   rate: 0.060 },
    { to: 14,  rate: 0.012 },
    { to: 39,  rate: 0.015 },
    { to: 59,  rate: 0.035 },
    { to: 74,  rate: 0.120 },
    { to: 200, rate: 0.300 },
  ],
  HOUSE_CAPACITY: 5,
  MAX_HOUSES: 16,
  HARDY: 0.7, FRAIL: 1.6,
} as const;

export const PEOPLE = {
  MAX_NAMED: 8,                 // §6.1; cuánta gente cabe en la cabeza del jugador
  ROLE_MIN_AGE: {               // edad mínima para tomar el oficio
    leader: 25, midwife: 28, priest: 25,
    smith: 20, woodward: 18, reeve: 22,
  },
  ROLE_MAX_PREFERRED: 55,       // §6.2: por encima, solo si no hay nadie en banda
} as const;

export const MIGRATION = {
  ARRIVE_CHANCE: 0.30,
  ARRIVE_MIN_PEOPLE: 8,
  ARRIVE_MIN_MORALE: 50,
  ARRIVE_MIN_GRAIN_YEARS: 0.5,
  ARRIVE_MIN_FREE_BEDS: 2,
  ARRIVE_COUNT: [2, 4],
  VIABLE_POPULATION: 6,         // §5.7: por debajo, esto ya no es una aldea
  ABANDON_YEARS: 5,             // §5.7: años seguidos así antes de marcharse
  LEAVE_BELOW_MORALE: 30,
  LEAVE_COUNT: [1, 3],
} as const;
```

**Aforo máximo: 80.** 16 casas × 5. Coincide con el tope de figuras del render y
con la escala de `valle.md` §7: no es casualidad, es la misma cifra vista desde
tres sitios.

**`MAX_NAMED` no es una perilla.** Ocho es la decisión de §6.1 sobre cuánta
gente puede el jugador tener en la cabeza a la vez, no un número que se ajuste
buscando una curva. Estaba solo en prosa, que era un fallo del documento.

**`ROLE_MIN_AGE` y la fundación.** §6.2 pondera por edad al cubrir una vacante,
pero no decía nada del reparto fundacional, y sin un suelo salían comadronas de
diecisiete años. Cada oficio va al adulto **de mayor edad** que cumpla su
mínimo; si ninguno lo cumple —raro con trece adultos de 16 a 45, pero no
imposible— va al de más edad disponible antes que quedar vacante. Los oficios se
reparten en orden decreciente de exigencia, de modo que el más difícil de cubrir
elige primero. `herbalist` y `stranger` no tienen suelo: el primero surge de la
necesidad y el segundo llega de fuera.

### 12.5 Desastres

```ts
export const DISASTER = {
  PLAGUE_BASE: 0.014,           // anual; se suma people/2500
  PLAGUE_WELL: 0.6,
  PLAGUE_WEEKS: [6, 10],
  PLAGUE_HAZARD_ADULT: 0.050,   // semanal, durante el brote
  PLAGUE_HAZARD_WEAK: 0.090,    // 0–4 y 60+
  FIRE_CHANCE: 0.035,           // anual
  FIRE_GRAIN_LOSS: 0.45,        // si arde un granero
  FIRE_MORALE: -6,
} as const;
```

### 12.6 Ánimo y fe

```ts
export const MOOD = {
  MORALE_DRIFT_TO: 50,   MORALE_DRIFT: 0.02,
  MORALE_PER_DEATH: -1.5,
  MORALE_HUNGER: -4.0,          // × severidad
  MORALE_CROWDING: -0.4,        // por persona sin cama
  MORALE_CHAPEL: 0.15, MORALE_CHURCH: 0.30, MORALE_MILL: 0.05,
  MORALE_GRAVEYARD: 0.05,       // el efecto que §7.2 da a `grave_yard`
  MORALE_OUTBREAK: -0.8,
  MORALE_HARVEST: 25,           // × (factor de clima − 1)
  FAITH_DRIFT_TO: 40,    FAITH_DRIFT: 0.01,
  FAITH_CHAPEL: 0.20, FAITH_CHURCH: 0.35,
  FAITH_DEVOUT_PRIEST: 0.13,   // 0.10 congelaba la fe en 50.0 exacto (§5.6)
  FAITH_NO_PRIEST: -0.15,
  FAITH_OUTBREAK: -0.60,
  MORALE_FLOOR_FROM_FAITH: 0.25,
} as const;
```

### 12.7 El valle

```ts
export const WORLD = {
  WIDTH: 36, HEIGHT: 56,
  FOREST_TARGET: [0.18, 0.30],
  WOOD_PER_FOREST_TILE: 300,
  FOREST_REGROWTH_YEARS: 8,
  FOREST_REGROWTH_NEIGHBOURS: 3,
  BARREN_CLEARING: 254,         // una tala de encrucijada no rebrota
  FLOOD_PRONE_SHIFT: 0.05,      // de clima justo a ruinoso
  PATH_T1: 400, PATH_T2: 1600, PATH_T3: 6000,
  TRAFFIC_DECAY: 0.005,         // por tick
  STONE_PER_BP: 0.5,
  VIRGIN_FOREST: 255,           // §9: marca de `forestAge` en el bosque viejo
} as const;
```

### 12.8 Encrucijadas

```ts
export const CROSSROADS = {
  MIN_TICKS_BETWEEN: 120,       // 30 min reales a ×1
  GUARANTEE_TICKS: 960,         // una por generación como mínimo
  CRISIS_MULTIPLIER: 4.0,
  FEUD_RIPE_MULTIPLIER: 4.0,
  BEHIND_WALL_MULTIPLIER: 0.4,
  VALLEY_NAME_LORD_MULTIPLIER: 0.5,
  NOVELTY_MULTIPLIER: 0.4,      // si ya salió en esta partida
  DEFAULT_COOLDOWN_YEARS: 25,
} as const;
```

### 12.9 Objetivos que verifica la suite de balance

Estos son los asertos, no los resultados. Se comprueban sobre 60 semillas × 200
años, con **cuatro políticas**.

**Ninguna de las tres primeras representa a alguien jugando con cabeza, y por eso
no sirven para fijar una banda.** `first` toma siempre la primera opción, que en
casi todas las plantillas es la acomodaticia — y en un juego de subsistencia la
acomodaticia es **la manirrota**: comprar la reliquia son seis semanas de pan,
acoger a los nueve del vado son nueve bocas más, pagar a los bandidos es un
tercio del granero. Además nunca paga un coste presente, así que jamás levanta la
empalizada y toda plantilla cuyo interruptor sea una obra del jugador se queda
encendida para siempre. `last` toma la desafiante y `worst` la peor. Las tres son
cotas, no medidas.

**Regla de no degeneración, obligatoria en las CUATRO políticas.** Si la misma
opción se ha elegido en las **dos** apariciones anteriores de esa plantilla, la
política debe elegir otra distinta si existe. Sin esta regla, `last` y `worst`
son discos rayados y no miden el catálogo: medido en v2.23, contestan
`succession:no_one` **178 de 178 veces** —`last` porque es la última de la lista,
`worst` porque su coste inmediato es mayor— y el 68,2 % de todas sus decisiones
va a esa sola opción.

Ese es el motivo de que sus cifras de la v2.23 no valgan: terminan el 100 % y la
horquilla sale de 98,3 puntos, así que **los dos umbrales de esta tabla “pasan”
midiendo una única opción en vez del juego.** Un aserto que pasa por el motivo
equivocado es peor que uno que falla, porque deja de avisar.

La raíz es que ninguna de las dos mira más allá de la semana en curso, así que
jamás ven el coste diferido de repetir. **Un jugador que elige mal no elige lo
mismo ciento setenta y ocho veces**, y una política que sí lo hace no representa
a nadie. La regla no cambia el juego: corrige el instrumento.

**`prudent` es la política de referencia.** Sin lookahead y determinista: puntúa
cada opción disponible como

```
score = −(grano que cuesta) − 3·(ánimo perdido)
        + 10·(si no planta semilla)
```

y toma la mayor, **pero las muertes no se compran**: si alguna opción no mata a
nadie de inmediato, `prudent` elige solo entre esas; si todas matan, minimiza los
muertos. La primera versión ponía las muertes en la misma suma que el grano, con
lo que una vida quedaba tasada en cuarenta fanegas y había opciones donde salía a
cuenta — medido, `prudent` moría de violencia tres veces más que `first`. Un
aldeano cauto no cambia vidas por grano a ningún precio.

**`hostile` fuera del alcance de `prudent` no es contenido muerto (v2.24).**
Medido dos veces: `prudent` y `first` nunca la activan; `last` y `worst` la
activan en 36 y 34 partidas de 60. Eso es exactamente lo que debe pasar. La mala
reputación es el castigo de echar a la gente del vado, y **un castigo que el
juego prudente no alcanza es un castigo que funciona**, no uno que sobra. Lo
traté como defecto durante dos revisiones y no lo era. El peso del ánimo en 3 se
mantiene, pero por su propio motivo —un aldeano cauto valora el granero lleno por
encima del buen humor—, no por esto.

No pretende ser juego óptimo —no lo es— sino **un aldeano cauto**: el suelo por debajo del cual ningún jugador razonable debería caer. Las
bandas de esta tabla se miden con ella; las otras tres se informan al lado para
ver la horquilla.

**Por qué hacía falta.** Medido con M-14 en pie, `first` extingue el 61,7 % de
las aldeas y `worst` el 75 %: catorce puntos de diferencia entre la política
manirrota y la peor posible. Si el desenlace apenas depende de lo que se elige,
el jugador no es un cuello de botella sino un espectador con botones, y eso rompe
el principio 2 de `valle.md`. Antes de tocar la letalidad de las encrucijadas hay
que medir con una política que no se arruine sola.

| Propiedad | Umbral | Política |
|---|---|---|
| **Partida terminada** (abandono o extinción) | 2 % – 12 % | `prudent` · **medido (v2.44): 1,7 %, al filo por abajo** |
| **Partida terminada** | ≥ 25 % | `worst` — **secundario a la horquilla (v2.25)**, ver abajo. **Medido (v2.44): 10,0 %**, con trece contratos reparados y `story` compuesto por fuerza |
| **Horquilla entre `prudent` y `worst`** | **≥ 20 puntos** | — · **el aserto que manda (v2.25)**. **Medido (v2.44): 8,3 puntos** — ni el bucle de A.15 ni el instrumento de políticas explican esto ya; descartados los dos, lo que queda es el catálogo |
| Decisiones de `last`/`worst` dedicadas a una sola opción | **< 45 %** | atribución por opción. **Cuando falla, se arregla la POLÍTICA, no el juego** (§12.9, regla de no degeneración). Era < 40 % y **es inalcanzable (v2.25)**: con la regla, una opción todavía se lleva dos de cada tres apariciones de su plantilla, y `succession` es el 60 % de lo que se pregunta a las adversas — dos tercios de 60 son 40. El techo es estructural; el umbral se pone encima. **Medido (v2.44): pasa por primera vez — 43,9 % y 41,3 %.** |
| Mediana del pico de población | 65 – 85 | `prudent` · era 65–82 y fallaba por un habitante (v2.25): fallar por uno es ruido. **Medido (v2.44): 82** |
| Mapa lleno (8 campos, 16 casas) antes del año 120 | ≥ 60 % de las semillas | `prudent` · **medido (v2.44): 96,7 %** |
| Población visible al final de la primera generación | ≥ 26 en la mediana | `prudent` · **medido (v2.44): 41** |
| **Encrucijadas por generación** | **media entre 1 y 5**, y ninguna semilla por encima de 7. Se mide **excluyendo `forest_cut` y `wolf_winter` hasta que exista M-15** (sin bosque que mengüe, `forestLeft` está congelado y sus disparos son artefacto) y **con la fundación real**, no un banco de pruebas que reparta catorce casas y una fragua desde el tick 0. Deuda registrada: volver a medir con las dos plantillas dentro y con la fundación de M-13/M-14 en cuanto estén fusionados. **Medido (v2.23): la media pasa en las cuatro políticas (3,78–4,41), pero el máximo de `last`/`worst` sube a 9,37** — una partida que se dispersa en diez años concentra sus tres sucesiones en pocas generaciones. Consecuencia del final más corto de Anexo A.15, no del catálogo. **Vuelto a medir (v2.44), con las partidas viviendo más: media 3,32–4,22, máximo 4,60–6,05 — dentro de banda en las cuatro.** |
| Intervalos pegados al techo | < 40 % — diagnóstico, no objetivo |
| Fracción de ticks elegibles, por plantilla | < 1 % · **medido (v2.44): falla en cuatro casos, todos al filo** — `smith_feud` con `prudent` (1,42 %), `succession` con `first` (2,52 %) y `last` (2,21 %), `strangers_at_the_ford` con `worst` (1,02 %) |
| Bosque restante en el año 100 | 40 % – 70 % del inicial. **Aguas abajo de la extinción (v2.16):** falla por arriba, no por abajo — el valle que se queda sin gente conserva sus árboles porque no hay quien los tale. Medido: 24 de 40 valles en banda, uno solo por debajo del 40 % y quince por encima del 70 %. No se ajusta hasta que la extinción esté en banda. |
| Choque del 90 % de bajas en el año 40 → extinción | ≥ 25 % |
| Cualquier estadística fuera de rango o `NaN` | 0 casos |
| **Ninguna plantilla del catálogo a cero apariciones** | — · comprobación de cobertura, no aserto del banco | **Medido (v2.44), sumando las 240 partidas de las cuatro políticas: solo `forest_cut` se queda a cero.** El resto aparece con alguna política aunque falte con otra — `tithe_demand`, `feud_inherited` y `smith_feud` no salen con `last`/`worst` pero sí con `prudent`/`first`. |

**El presupuesto de la sucesión.** El rango era 1–4 y estaba mal calibrado: lo
fijé antes de que existiera el catálogo. Medido, la sucesión sola consume un
tercio del total —unas 7 por siglo, que es lo que da una tenencia de 13 o 14
años para un líder elegido a los cuarenta— y **eso es correcto, no un exceso**:
la muerte del líder es el latido del bucle largo, no ruido que apretar. Con 20
encrucijadas por siglo y 7 sucesiones quedan 13 para las otras dieciséis
plantillas, menos de una por plantilla y siglo. El rango sube a 1–5 para
reconocerlo en vez de disimularlo sacando la sucesión de la cuenta.

La fila de `worst` es la que hace cumplir el principio 4 de `valle.md`: **la
aldea solo muere si el jugador la mata.** Si esa cifra baja del 25 %, las
encrucijadas no tienen dientes suficientes y hay que endurecer sus efectos, no el
mundo. Y la fila de la horquilla es la que hace cumplir el principio 2: si jugar
bien y jugar mal acaban en el mismo sitio, el jugador sobra.

**De las dos, manda la horquilla (v2.25).** El 25 % es una suposición de la
v2.0, escrita antes de que existiera el catálogo y sin nada medido detrás — de
la misma cosecha que el rango 1–4 de encrucijadas por generación, que resultó
estar mal en cuanto se midió y se corrigió a 1–5 en la v2.10. No hay razón para
tratar este número con más respeto que aquel.

Lo que encarna el principio 2 no es una cifra absoluta de aldeas muertas: es la
**separación**. Una aldea que aguanta el desastre no incumple nada —hay juegos
enteros construidos sobre resistir—; una donde da exactamente igual lo que se
elija, sí. Si algún día la horquilla llega a los 20 puntos con `worst` en el
18 %, el juego cumple: jugar mal cuesta cuatro veces más que jugar bien, y eso
es un jugador que importa. Al revés —`worst` en el 30 % con `prudent` en el
28 %— no cumple nada, y con el aserto viejo habría pasado.

**Medido (v2.23), con A.15 en pie: las dos filas pasan, de sobra.** `worst`
termina el 100 % de las partidas —muy por encima del 25 %— y la horquilla con
`prudent` es de 98,3 puntos. Esa es también la condición que decide si toca
hablar de los efectos del catálogo: solo se abriría esa conversación si `worst`
siguiera por debajo del 25 % estando ya fuera del bucle de `succession`. No es
el caso. Lo que sigue fallando —la fila de arriba, y la cadencia máxima de
`last`/`worst` en 9,37— es harina de otro costal: ambas políticas contestan
`no_one` el 100 % de las veces que se les pregunta, por cómo deciden, no por lo
que la plantilla ofrezca a cambio. Ver §2.23.

---

## 13. Persistencia y letargo

### 13.1 Formato de guardado

IndexedDB, base `the-valley`, almacén `saves`, clave `current`.

```ts
export interface SaveFile {
  schema: number;              // versión del esquema
  savedAtMs: number;           // reloj de pared, para calcular la ausencia
  state: GameState;            // instantánea completa, autoritativa
  decisions: DecisionRecord[]; // registro paralelo, para depurar y migrar
  archive: ArchivedGame[];     // crónicas de partidas anteriores + sus ruinas
}
```

**Por qué las dos cosas.** La instantánea es la verdad: se carga al instante y
sobrevive a un cambio de balance. El registro de decisiones permite reproducir
la partida desde la semilla para depurar un fallo, comparar dos configuraciones
y migrar una partida si algún día cambia el esquema. Guardar solo el registro
sería elegante y frágil: en cuanto se toque un número de §12, todas las partidas
guardadas divergen.

Se guarda cada 20 ticks, al ocultarse la pestaña (`visibilitychange`) y en
`pagehide`, antes de detener el bucle. El oyente de `pagehide` pertenece a la
aplicación, no a una instancia del bucle: fundar otra aldea no acumula oyentes.

Cada solicitud clona su `SaveFile` en el momento de pedirla y entra en una cola
de escritura única. Terminar, archivar y fundar de nuevo son mutaciones
consecutivas que pueden solicitar dos guardados casi a la vez; IndexedDB debe
recibirlos en ese orden para que la instantánea terminada no pueda completar
después y sustituir a la sucesora viva.

**Esquema actual: 2 (v2.67).** El esquema 1 se migra de forma aditiva: su única
`seed` pasa también a `terrainSeed`; `peakPeople` toma el mayor valor de
`params.people` conservado en la crónica o la población presente. No se atribuye
al guardado antiguo una precisión que nunca almacenó.

### 13.2 Letargo

Al cargar:

```
elapsed = min(now − savedAtMs, LETHARGY_CAP_MS)
ticks   = floor(elapsed / REAL_MS_PER_TICK)      // máx. 960
```

Se ejecutan esos ticks en lotes de 64 dentro de `requestAnimationFrame`, con una
pantalla de progreso que ya muestra el valle dibujándose. 960 ticks tardan menos
de 2 s.

Si había una encrucijada pendiente, **sigue pendiente**: la aldea ha vivido esas
semanas sin decisión, con las consecuencias que eso tenga. No se resuelve sola,
no caduca y no mata (§1).

Al terminar, se abre el **parte de bienvenida** (§9.2).

### 13.3 Herencia entre partidas

Al terminar una aldea por cualquiera de las tres causas de `EndState`, la
partida se cierra y su crónica completa se archiva junto con la unión de las
ruinas existentes y la máscara de sus edificios en pie. La siguiente partida
usa una `seed` maestra nueva, genera un mapa nuevo con la misma `terrainSeed` y
**siembra las ruinas de la anterior** en `map.ruins`.

```ts
export function archiveGame(state: GameState): ArchivedGame; // exige state.ended
export function foundSuccessor(game: ArchivedGame, seed: number): GameState;
```

Las ruinas heredadas no tienen efecto mecánico: no dan recursos, no bloquean la
construcción de madera, no modifican ningún número. Están ahí para verse. Darles
efecto convertiría la derrota en una moneda y la ruina en un recurso, que es
justo lo contrario de lo que buscan los principios 4 y 3.

La interfaz detiene el reloj y descarta la pantalla de encrucijada al detectar
`ended`. El epitafio nombra causa, duración y pico de población, permite abrir
la crónica completa y exige **«Begin again»** para llamar a `foundSuccessor`.
El archivo conserva todas las partidas cerradas; una misma pareja
`(seed, ended.tick)` solo se añade una vez. La semilla de una sucesora no puede
ser ninguna del archivo: si la extracción coincide, avanza módulo `2³²` hasta
la primera libre. Así esa pareja sigue siendo una identidad inequívoca.

La pantalla de crónica expone el archivo completo tras la fundación siguiente.
Las entradas se renderizan con `makeBundle(ArchivedGame.seed)`: el flujo
`chronicle` nunca avanza (§9.1), así que la semilla reconstruye la misma voz sin
guardar otro estado aleatorio ni subir el esquema. La partida terminada que aún
se muestra como estado actual no se duplica en el selector.

---

## 14. Pruebas

### 14.1 Suite rápida (`tests/fast/`, segundos)

Se ejecuta en cada commit. Prohibido que tarde más de 20 s.

- **Determinismo.** Misma semilla + mismas decisiones → estado idéntico a los
  5 000 ticks. Se compara un hash del estado serializado.
- **Aislamiento de flujos.** Consumir 1 000 números del flujo `chronicle` no
  cambia el estado de la simulación.
- **Arquitectura.** `src/engine/` no contiene `Math.random`, `Date`, `document`,
  `window`, ni importa de `render/` ni de `ui/`.
- **Invariantes por tick.** Sobre 200 ticks de 5 semillas: `grain ≥ 0`,
  `morale ∈ [0,100]`, `faith ∈ [0,100]`, ningún aldeano con `bornTick > tick`,
  ningún edificio solapado, ningún edificio sobre agua.
- **Catálogo.** Toda opción tiene `visible.length ≥ 1`; toda plantilla tiene 2 o
  3 opciones; todo `templateKey` y toda `cost`/`label` existe en el banco de
  textos; todo `cast` referenciado por efectos y semillas está declarado.
- **Condiciones.** Tabla de casos para cada variante del DSL.
- **Mapa.** 200 semillas: río continuo, bosque en rango, sitio de fundación válido.
- **Gestos y cámara.** Lógica pura, sin DOM.
- **Guardado.** Ida y vuelta: `load(save(state))` es idéntico a `state`.

### 14.2 Suite de balance (`tests/balance/`, minutos)

Se lanza aparte (`npm run test:balance`), en CI nocturna y antes de tocar §12.
Comprueba los umbrales de §12.9. **Nunca se fija un umbral con una sola
semilla**: dos partidas divergen desde el primer tick y una sola es ruido.

Salida: una tabla por consola y un CSV con las series de población, grano, ánimo
y edificios, para poder mirar la forma de las curvas y no solo el aserto.

**Presupuesto: 10 minutos** (v2.16; antes 5). Los cinco minutos se fijaron cuando
esta suite todavía no medía nada. Se lanza aparte y en nocturna, así que el
presupuesto está para que no se descontrole, no para forzar decisiones: **no se
degrada la medición para caber en él.** Si un módulo nuevo lo desborda, se
informa y se decide; no se recortan semillas ni años por su cuenta.

**Medido (v2.44): cruzado, 638,4 s.** No por un módulo más caro de calcular:
las partidas adversas, que antes se dispersaban hacia el año 25 por el bucle de
A.15 sin consecuencias, ahora sobreviven mucho más cerca del horizonte de 200
años — el mismo arreglo que abrió la horquilla alarga el bucle principal del
banco. Sin recortar semillas, años ni políticas. Sin resolver esta ronda.

### 14.3 Capturas (`tools/screenshots.ts`, Playwright)

**Obligatorio desde el primer día que se dibuje algo** (`valle.md` §12).

Genera una hoja de contacto en `artifacts/`: el mismo valle en las cuatro
estaciones, en los años 1, 20, 60 y 120, a resolución de móvil real; más una
versión en escala de grises de cada una para verificar la regla de silueta.

Regla de trabajo: **ningún cambio visual se da por terminado sin mirar la hoja de
contacto.** Los fallos que este juego no puede permitirse —una estación con el
color equivocado, figuras ilegibles a tamaño real— no los detecta ningún aserto.

---

## 15. Hitos

| | Hito | Criterio de salida | Módulos |
|---|---|---|---|
| **0** | Crónica sin gráficos | Tres crónicas distinguibles por un tercero | M-00 … M-12 |
| **1** | Valle visible | Se ve la aldea y las estaciones; sin jugador | M-13 … M-19 |
| **2** | Encrucijadas | Una decisión que cambia el valle de forma visible | M-20 … M-22 |
| **3** | Generaciones | Envejecen, mueren, heredan; la aldea recuerda | M-04, M-05, M-06 · **alcanzado v2.69** |
| **4** | Fracaso y herencia | Una aldea puede extinguirse; quedan ruinas | M-24, M-25 |
| **5** | Idle | Tiempo real, letargo, parte de bienvenida | M-20, M-23 · **alcanzado v2.69** |
| **6** | Guardado | Persistencia; primera partida real de varios días | M-23 completo; aceptación humana pendiente |

### 15.1 El hito 0 en detalle

Es el que puede matar el proyecto, y ese es su propósito.

**Entregable:** `npm run chronicle -- --seed 7 --years 60 --policy first`
escribe por consola la crónica de sesenta años de una aldea. Sin valle, sin
dibujo, sin interfaz.

**Qué debe incluir ya:** personas con nombre y rasgos, opiniones y rencores,
demografía completa, subsistencia con estaciones, las 16 plantillas de
encrucijada con su reparto y sus semillas, y el banco de textos.

**Qué no debe incluir:** nada del capítulo 7 salvo el conteo de edificios como
números, nada del 10, nada del 11.

**Criterio de aceptación:** tres crónicas de tres semillas distintas, leídas por
alguien ajeno al proyecto, que sepa contar en qué se diferencian. Si la
respuesta es «se parecen mucho», el problema está en el cruce de sistemas y hay
que arreglarlo antes de dibujar un solo píxel.

---

## 16. Hitos 4 a 6 — estado

Nacieron como esbozos porque dependían de cómo se sintiera el juego. M-20 a M-25
ya permiten evaluarlos: aquí queda separado lo implementado de las aceptaciones
que todavía requieren una persona jugando.

### 16.1 Hito 4 — Fracaso y herencia

Contrato que el resto del código debe respetar desde ya:

- `GameState.ended: EndState | null` existe desde el principio y el bucle lo
  comprueba en el paso 17.
- `SaveFile.archive` existe desde el principio, aunque esté vacío.
- `ValleyMap.ruins` se rellena y se dibuja desde el hito 1, aunque solo lo use
  el incendio.

**Hito alcanzado en M-25 (v2.68).** M-24 aporta archivo, semilla de terreno
separada, pico de población y transición pura. M-25 detiene el reloj, presenta
causa, duración y pico, deja releer la crónica completa y funda la sucesora solo
por gesto explícito. La huella heredada se ve como cimentación continua. El
archivo conserva todas las partidas; una política de poda exigiría primero
evidencia real de presión de almacenamiento.

### 16.2 Hito 5 — Idle

**Alcanzado en v2.69.** El contrato de §13.2 está implementado por M-20 y M-23:
reloj real, pausa y tres velocidades, letargo acotado y parte de bienvenida. Lo
que sigue necesitando juego humano es el ajuste de los tiempos de §12.1. La
estación de 3 minutos y la generación de 4 horas son una hipótesis razonada, no
un dato. Ese ajuste consiste en cambiar `REAL_MS_PER_TICK` y nada más — por eso
el motor cuenta en ticks y no en minutos — y no reabre el hito mientras el flujo
funcional permanezca entero.

### 16.3 Hito 6 — Guardado

**M-23 implementado; hito pendiente.** §13.1 funciona en IndexedDB y M-24 ya
resolvió la primera política de migración: esquema 1 a 2, aditiva y sin inventar
el pico histórico ausente. Falta el criterio que no automatiza ninguna suite:
una partida real de varios días. Hasta entonces el guardado está verificado,
pero el hito no está aceptado.

---

## 17. Briefs por módulo

Cada brief es autocontenido. Un agente que lea las secciones 1–4 y su brief
tiene todo lo necesario. Las dependencias indican qué debe estar fusionado
antes de empezar.

**Formato de cada brief:** Objetivo · Depende de · Ficheros · Contrato · Reglas ·
Tests · Terminado cuando.

---

### M-00 · Andamiaje

**Objetivo.** Repositorio que compila, prueba y arranca.
**Depende de.** Nada.
**Ficheros.** `package.json`, `tsconfig.json`, `vite.config.ts`,
`vitest.config.ts`, `playwright.config.ts`, `.editorconfig`, `eslint.config.js`,
`index.html`, `src/main.ts`, la estructura de carpetas de §2.1 con un
`.gitkeep` en cada una.
**Contrato.** Scripts: `dev`, `build`, `test` (suite rápida), `test:balance`,
`chronicle`, `shots`, `lint`, `typecheck`.
**Reglas.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
ESLint prohíbe `any` y los identificadores prohibidos de §2.4 dentro de
`src/engine/`.
**Tests.** Un test trivial que pase, para verificar la tubería.
**Terminado cuando.** `npm ci && npm run typecheck && npm test && npm run build`
pasa en limpio.

---

### M-01 · Aleatoriedad y tiempo

**Objetivo.** Los cimientos deterministas.
**Depende de.** M-00.
**Ficheros.** `src/engine/rng.ts`, `src/engine/time.ts`.
**Contrato.**
```ts
export function hash32(seed: number, stream: string): number;
export function makeBundle(seed: number): RngBundle;
export function next(b: RngBundle, s: RngStream): number;        // [0,1)
export function int(b: RngBundle, s: RngStream, a: number, z: number): number; // [a,z]
export function pick<T>(b: RngBundle, s: RngStream, xs: readonly T[]): T;
export function weighted<T>(b, s, xs: readonly T[], w: (x: T) => number): T;
export function clockOf(tick: number): Clock;
export function seasonOf(tick: number): Season;
export function yearOf(tick: number): number;
```
**Reglas.** mulberry32. `next` muta el estado del flujo dentro del bundle. Ningún
otro módulo implementa aleatoriedad.
**Tests.** Reproducibilidad entre ejecuciones; distribución uniforme razonable a
100 000 muestras; independencia de flujos; `clockOf` en los bordes de estación y
de año.
**Terminado cuando.** Los tests pasan y `weighted` maneja pesos cero sin dividir
por cero.

---

### M-02 · Tipos de estado y balance

**Objetivo.** El contrato común, escrito una vez.
**Depende de.** M-01.
**Ficheros.** `src/engine/state.ts`, `src/engine/balance.ts`,
`src/engine/crossroads/schema.ts`.
**Contrato.** Todos los tipos de §3, literalmente. Todas las constantes de §12,
literalmente, como objetos `as const`, más la tabla de edificios de §7.2 como
`BUILDINGS`. Los tipos de §8.1, §8.3, §8.4 y §8.5 van en `schema.ts`: son
declaraciones puras y `state.ts` necesita el DSL para `PlantedSeed`. M-07
escribe sólo la lógica en el resto de esa carpeta.
**Reglas.** Sin lógica: solo tipos y datos. Ni una función.

**Grafo de dependencias, obligatorio y acíclico:**

```
rng.ts, balance.ts        hojas, no importan nada
state.ts                  -> rng.ts
crossroads/schema.ts      -> state.ts
time.ts                   -> state.ts, balance.ts
```

`Op` y `Condition` (§8.2) viven en `state.ts`, no en `schema.ts`, y la flecha va
de `schema` a `state` y no al revés. La razón es de conteo: §8 necesita seis
tipos de §3 —`Season`, `Role`, `Trait`, `BuildingKind`, `StatName`,
`MemoryKind`— y §3 necesita uno solo de §8, `Condition`, para `PlantedSeed`. Con
`Condition` en `state.ts` el grafo queda acíclico; en la dirección contraria los
dos ficheros se importarían entre sí. Con `verbatimModuleSyntax` un ciclo de
`import type` compila sin quejarse, así que no se notaría hasta que lo hubieran
heredado cinco módulos: hay un test que guarda el grafo.

**Tests.** Un test que compruebe la coherencia interna de §12: aforo máximo
(`MAX_HOUSES · HOUSE_CAPACITY`) igual a 80; probabilidades de `WEATHER` sumando
1; y sobre `MORTALITY`, tramos de edad estrictamente crecientes que cubren de 0
a 200 sin hueco ni solape, con tasas crecientes **a partir del segundo tramo**.
La curva es de bañera, no una rampa: el `0.060` infantil es deliberado y está
por encima del `0.012` que le sigue. Exigir monotonía desde el primer tramo era
una errata de este brief, no de §12.4.
**Terminado cuando.** El resto de módulos puede importar de aquí sin
dependencias circulares.

---

### M-03 · Nombres, aldeanos y rasgos

**Objetivo.** Crear gente.
**Depende de.** M-02.
**Ficheros.** `src/engine/people/names.ts`, `traits.ts`, `villagers.ts`.
**Contrato.**
```ts
export function makeName(b: RngBundle, female: boolean, used: Set<string>): string;
export function rollTraits(b: RngBundle, role: Role | null): Trait[];
export function makeVillager(...): Villager;
export function foundPeople(b: RngBundle, tick: number): PeopleState;
export function promoteToNamed(state: GameState, id: VillagerId, role: Role): void;
```
**Reglas.** Bancos de nombres del Anexo B, anglosajones. Ningún nombre se repite
entre vivos. Pesos de rasgo por rol según §6.3. Los anónimos tienen `traits: []`,
`memories: []`, `opinions: {}`.
**Tests.** `foundPeople` produce exactamente `FOUNDING.POPULATION` con el
reparto de edades de §12.2 y los 6 roles fundacionales; sin nombres repetidos en
1 000 semillas; los rasgos siempre son 3 o 4 y sin duplicados.
**Terminado cuando.** Dos semillas distintas dan reparto claramente distinto.

---

### M-04 · Demografía

**Objetivo.** Nacer, envejecer, morir.
**Depende de.** M-03.
**Ficheros.** `src/engine/people/demography.ts`.
**Contrato.**
```ts
export function resolveDeaths(state: GameState, ctx: TickContext): DeathEvent[];
export function resolveBirths(state: GameState, ctx: TickContext): BirthEvent[];
export function resolveMigration(state: GameState): MigrationEvent[];
export function workforce(state: GameState): number;
export function population(state: GameState): number;
```
**Reglas.** Fórmulas de §6.5 y §5.7 exactas. `TickContext` transporta `severity`,
`cold` y el brote activo; la demografía no los calcula. Las listas se fotografían
al empezar: un recién nacido no muere en su mismo tick.

**No hay `ageEveryone`.** La edad se deriva de `bornTick` (§6.5), así que en el
borde del año no hay ningún campo que incrementar y la función sería un no-op en
el contrato público del módulo de personas. Lo que sí pasa en la semana 0 es el
paso 2 del tick y vive en `sim.ts` (M-10).

**Tests.** Una aldea de 20 personas sin hambre ni peste crece; con `severity = 1`
sostenido deja de reproducirse por completo y encoge —la extinción la produce el
paso 7 del tick, `STARVATION_RATE`, que es de M-06 y se asevera allí—; la
esperanza de vida al nacer cae entre 28 y 38 años sobre 20 000 aldeanos
simulados con la tabla **pura**, sin hambre ni frío ni brote, porque medida
dentro de una partida con hambre baja de 28 y el test fallaría sin que nada
estuviera mal; en torno a dos de cada tres llegan a los 15; la migración respeta
todas sus puertas.
**Terminado cuando.** Los tests pasan sobre al menos 10 semillas.

---

### M-05 · Memoria, opiniones y rencores

**Objetivo.** Que los nombrados tengan pasado.
**Depende de.** M-03.
**Ficheros.** `src/engine/people/opinions.ts`, `memories.ts`.
**Contrato.**
```ts
export function remember(v: Villager, m: Memory): void;
export function decayMemories(state: GameState): void;
export function adjustOpinion(state, from: VillagerId, to: VillagerId, d: number): void;
export function driftOpinions(state: GameState): void;
export function grudges(state: GameState, min?: number): Grudge[];
export function worstEnemyOf(state: GameState, id: VillagerId): VillagerId | null;
```
**Reglas.** Tabla de §6.4 exacta. Máximo 12 memorias, se descarta la de menor
peso efectivo. `spiteful` y `loyal` modulan la recuperación. Las opiniones solo
existen entre nombrados. **No se limpian al morir alguien**: que uno no
perdonara a un muerto es material narrativo, y con ocho nombrados vivos el coste
de guardarlo es cero. `driftOpinions` sí se salta a los muertos en ambos
sentidos — un muerto no cambia de opinión, ni sobre él se ablanda nadie solo con
el tiempo.
**Tests.** Una opinión llevada a −60 crea rencor con causa; sin sucesos nuevos,
un `loyal` vuelve a 0 en la mitad de tiempo que un `spiteful`; la memoria nunca
supera 12 entradas.
**Terminado cuando.** `grudges()` devuelve resultados estables y deterministas.

---

### M-06 · Subsistencia

**Objetivo.** El reloj lento: trabajo, grano, madera, ánimo, fe.
**Depende de.** M-02, M-04.
**Ficheros.** `src/engine/subsistence/labour.ts`, `harvest.ts`, `consumption.ts`,
`mood.ts`, `seasons.ts`.
**Contrato.**
```ts
export function allocateLabour(state: GameState): Allocation;
export function produce(state: GameState, a: Allocation): void;    // madera + puntos de obra
export function consume(state: GameState): { severity: number; starved: VillagerId[] };
export function overwinter(state: GameState): { cold: boolean };
export function harvest(state: GameState, a: Allocation): HarvestResult;
export function updateMood(state: GameState, ctx: TickContext): void;
export function rollWeather(state: GameState): YearWeather;
```
**Reglas.** Fórmulas de §5 exactas, incluida la reserva de obras del 15 % y el
tope de `workedFields`. `consume` va antes que `harvest` en el tick.
**Tests.** La aldea fundacional con clima 1.0 termina el año 1 con grano
positivo; con clima 0.60 dos años seguidos, entra en hambruna; la reserva de
obras nunca baja de `W · 0.15`; el ánimo y la fe se mantienen en `[0,100]` en
50 000 ticks; el suelo de ánimo por fe se respeta.
**Terminado cuando.** Se reproduce la curva de referencia de §12.9 en
combinación con M-04.

---

### M-07 · Motor de encrucijadas

**Objetivo.** Evaluar, elegir, repartir, resolver, plantar.
**Depende de.** M-05, M-06.
**Ficheros.** `src/engine/crossroads/schema.ts`, `conditions.ts`, `cast.ts`,
`select.ts`, `resolve.ts`, `seeds.ts`.
**Contrato.**
```ts
export function evaluate(c: Condition, state: GameState): boolean;
export function fillCast(t: CrossroadTemplate, state): Record<string, VillagerId> | null;
export function eligible(state: GameState): ScoredTemplate[];
export function selectCrossroad(state: GameState): PendingCrossroad | null;
export function applyOption(state: GameState, optionId: string): AppliedEffects;
export function fireSeeds(state: GameState): FiredSeed[];
```
**Reglas.** Todo el DSL de §8.2. La selección usa el flujo `crossroads`, el
reparto el flujo `cast`. Multiplicadores de crisis, novedad y rasgo según §8.6.
Garantía por generación y techo de 120 ticks. `applyOption` planta las semillas
y registra en `history`.
**Tests.** Tabla de casos por cada variante de `Condition`; una plantilla con
reparto imposible nunca es elegible; el techo se respeta salvo en crisis; la
garantía dispara a los 960 ticks exactos; una semilla plantada con retraso
[3,5] vence dentro de esa ventana; una semilla cuya condición falla se marchita
sin efectos y deja constancia.
**Terminado cuando.** Con el catálogo de M-08, 20 semillas × 100 años producen
entre 5 y 20 encrucijadas cada una, sin repeticiones adyacentes.

---

### M-08 · Catálogo de encrucijadas

**Objetivo.** Las 16 plantillas del Anexo A, como datos.
**Depende de.** M-07.
**Ficheros.** `src/engine/crossroads/catalog/*.ts` (una por categoría),
`catalog/index.ts`.
**Contrato.** `export const CATALOG: readonly CrossroadTemplate[]`.
**Reglas.** Transcripción literal del Anexo A. Sin lógica, sin funciones: datos
puros. Toda clave de texto debe existir en el banco de M-09.
**Tests.** Los del catálogo listados en §14.1; además, cada categoría tiene al
menos una plantilla elegible en algún estado alcanzable — se verifica ejecutando
30 semillas × 150 años y comprobando que ninguna plantilla queda a cero apariciones.
**Terminado cuando.** El test de cobertura del catálogo pasa.

---

### M-09 · Crónica

**Objetivo.** Registrar y componer el texto.
**Depende de.** M-02.
**Ficheros.** `src/engine/chronicle/events.ts`, `bank.en.ts`, `render.ts`,
`digest.ts`.
**Contrato.**
```ts
export function record(state: GameState, e: Omit<ChronicleEntry,'tick'>): void;
export function renderEntry(e: ChronicleEntry, b: RngBundle): string;
export function renderYear(state: GameState, year: number, minWeight?: 1|2|3): string[];
export function welcomeDigest(state: GameState, sinceTick: number): Digest;
```
**Reglas.** El banco del Anexo B, 3–5 variantes por clave. Prohibiciones de
§9.3. Ningún otro módulo escribe texto: empujan claves y parámetros.
**Tests.** Toda clave usada por el catálogo existe en el banco; toda clave del
banco tiene al menos 3 variantes; ningún texto contiene `!`, ` you `, ` your `;
todos los parámetros de una plantilla se sustituyen (no quedan `{}` sin
resolver) sobre 5 000 entradas generadas.
**Terminado cuando.** `renderYear` de una partida de 60 años se lee de corrido.

---

### M-10 · Orquestación y runner de consola

**Objetivo.** El tick completo y el entregable del hito 0.
**Depende de.** M-04, M-06, M-07, M-08, M-09.
**Ficheros.** `src/engine/sim.ts`, `src/engine/found.ts`, `src/cli/chronicle.ts`.
**Contrato.**
```ts
export function foundGame(seed: number, inherited?: {
  terrainSeed: number; ruins: Uint8Array;
}): GameState;
export function tick(state: GameState, catalogue: Catalogue, decision?: Decision): TickReport;
export function run(state: GameState, ticks: number, policy: Policy, catalogue: Catalogue): TickReport[];
export type Policy = 'first' | 'last' | 'random' | 'worst' | 'prudent'
  | ((state: GameState, options: readonly string[]) => string);
```
El catálogo se inyecta como en M-07, para probar escenarios sin introducir un
catálogo global en la orquestación. `run` devuelve los informes semanales que
usa la instrumentación; `TickReport.deaths` abarca todas las causas de la semana.
Estas firmas hacen explícita la API ya implementada en M-10.
**Reglas.** El orden de §4.2 es normativo y el código lo refleja con 17 llamadas
numeradas y comentadas. `tick` no dibuja ni escribe por consola.
**Tests.** El test de determinismo de §4.3; el orden del tick verificado con
espías; 1 000 ticks sin excepciones en 20 semillas.
**Terminado cuando.** `npm run chronicle -- --seed 7 --years 60` imprime una
crónica legible. **Este es el hito 0.**

---

### M-11 · Suite rápida

**Objetivo.** Que romper algo se note en segundos.
**Depende de.** M-10.
**Ficheros.** `tests/fast/**`.
**Contrato.** Los nueve grupos enumerados en §14.1.
**Reglas.** Los tests describen propiedades del diseño, no detalles de
implementación. Nada de comprobar que una función llama a otra.
**Tests.** Son el entregable.
**Terminado cuando.** `npm test` tarda menos de 20 s y cubre los nueve grupos.
Hasta implementar M-13/M-14, M-20 y M-23, las propiedades de geometría, mapa,
cámara y guardado figuran pendientes: no se sustituyen por pruebas del andamiaje.

**Estado (v2.65): implementado.** Los nueve grupos tienen pruebas propietarias;
la suite ejecuta 620 pruebas sin pendientes en 17,53 s.

---

### M-12 · Banco de pruebas de balance

**Objetivo.** Poder tocar §12 sin volar el juego.
**Depende de.** M-10.
**Ficheros.** `tests/balance/**`, `tools/balance-report.ts`.
**Contrato.** `npm run test:balance` ejecuta 60 semillas × 200 años con las
políticas `prudent`, `first`, `last` y `worst`, comprueba los umbrales de §12.9, imprime una tabla
y escribe `artifacts/balance.csv`.
**Reglas.** Ningún umbral se fija con una sola semilla. Las series se guardan
para poder mirar la forma de las curvas.
**Tests.** Son el entregable.
**Terminado cuando.** Los umbrales aplicables de §12.9 pasan, las comprobaciones
pendientes de módulos posteriores o de aclaración de política están resueltas,
y la ejecución completa tarda menos de 15 minutos. **Subido de 10 a 15 en la
v2.45, y es la última vez que se sube sin optimizar:** el coste creció a 638,4 s
porque las partidas adversas ya no se dispersan hacia el año 25 y llegan al
horizonte de 200 años. Es el mundo sano, no instrumentación cara. Pero un
presupuesto que se amplía cada vez que se cruza deja de ser un presupuesto.

**Estado (v2.12): no cerrado.** 19 de 25 asertos pasan en 187,55 s. `first` pasa
los seis umbrales que le aplican. Quedan cuatro fallos, enumerados en §2.12: la
cadencia de `last`/`worst` (arrastrada por `succession`, elegible en el 78 % de
los ticks), la elegibilidad de `wolf_winter` (pendiente de M-15), el pico de
`last` y el 60 % de mapas llenos. Ninguno se ha relajado. Las dos pruebas
pendientes son la banda de extinción «neutra» —sin política asignada— y el
bosque restante al año 100, de M-15.

---

### M-13 · Generación del mapa

**Objetivo.** Un valle creíble y siempre igual para la misma semilla.
**Depende de.** M-02.
**Ficheros.** `src/engine/world/mapgen.ts`, `tiles.ts`.
La ronda v2.12 incluye sus constantes en `balance.ts` (`MAPGEN`), las pruebas en
`tests/fast/mapgen.test.ts` y el volcado ASCII en `tools/map-dump.ts`
(`npm run map -- --seed 7`); la conexión con `found.ts` pertenece a M-10.
`idx` y `neighbours4` viven en `tiles.ts`, para que M-14 y M-15 tengan la
topología sin arrastrar el generador, y `mapgen.ts` las reexporta para que el
contrato de abajo se lea de un solo import.
**Contrato.**
```ts
export function generateMap(b: RngBundle): ValleyMap;
export function foundingSite(map: ValleyMap): { x: number; y: number };
export function idx(x: number, y: number): number;
export function neighbours4(i: number): number[];
```
**Reglas.** Los cinco pasos de §7.1 en ese orden, con el flujo `map`.
**Tests.** Los de §7.1 sobre 200 semillas; `generateMap` es puro; dos semillas
distintas dan mapas visiblemente distintos (más del 15 % de celdas diferentes).
**Terminado cuando.** Un volcado ASCII del mapa por consola se reconoce como un
valle con río.

**Estado (v2.12): hecho.** Nueve pruebas sobre 200 semillas: río continuo de
borde a borde y de una sola masa de agua, bosque en la banda, claro de 12×12 de
pradera sin marisma adyacente, pureza de `generateMap`, reproducibilidad celda a
celda y más del 15 % de celdas distintas entre semillas. El volcado de la
semilla 7 se reconoce como valle.

---

### M-14 · Edificios, colocación y obras

**Objetivo.** Que la aldea se construya sola y con criterio.
**Depende de.** M-13, M-06.
**Ficheros.** `src/engine/world/buildings.ts`, `placement.ts`, `works.ts`,
`upgrade.ts`.
La ronda v2.12 incluye las constantes en `balance.ts` (`BUILDING_RULES`), las
pruebas en `tests/fast/works.test.ts` y en `tests/balance/`, y la integración
M-10 en `found.ts`/`sim.ts`. El contrato M-07 ya garantiza `build.free: true`;
no se cambia su API, el catálogo ni sus efectos. `nextProject` devuelve también
las mejoras, y el tipo `Upgrade` vive en `upgrade.ts` junto a `upgradeSpot`, que
es quien sabe que una iglesia es más grande que su capilla.
**Contrato.**
```ts
export function nextProject(state: GameState): BuildingKind | Upgrade | null;
export function placeBuilding(state, kind: BuildingKind): {x,y} | null;
export function advanceWorks(state: GameState, buildPoints: number): BuiltEvent[];
export function destroyBuilding(state: GameState, id: BuildingId): void;
export function capacityOf(state: GameState): { housing: number; storage: number };
```
**Reglas.** Tabla de §7.2, prioridad de §7.3 y puntuación de §7.4, exactas. Nunca
sobre agua, marisma ni ruina de piedra. Al destruir, el edificio queda con
`lostTick` y sus celdas se marcan en `map.ruins`.
**Tests.** Ningún solapamiento en 30 semillas × 150 años; la prioridad se
respeta en una batería de estados construidos a mano; al llenarse el mapa,
`nextProject` devuelve mejoras y no nuevos edificios; los topes de §7.2 nunca se
superan.
**Terminado cuando.** Una partida de 120 años llega a los ~45 edificios de
`valle.md` §7.

**Estado (v2.12): hecho, con un objetivo de §12.9 sin alcanzar.** La semilla 108
llega al año 120 con 49 edificios en pie —16 casas de piedra, 8 campos, 3
graneros, capilla, molino, fragua, pozo y 18 tramos de muralla— y 45 vivos. En
60 semillas × 200 años × tres políticas no hay **ni un** solapamiento entre
edificios u obras, ni un edificio sobre agua o marisma, ni un tope de §7.2
superado. Lo que no llega es el 60 % de mapas con 8 campos y 16 casas antes del
año 120: `first` da 46,7 %, y el techo lo pone la extinción (61,7 %), no la
construcción. Ver §2.12.

---

### M-15 · Caminos y bosque

**Objetivo.** Que el mapa cuente la historia de dónde se pisa y qué se tala.
**Depende de.** M-14.
**Ficheros.** `src/engine/world/paths.ts`, `forest.ts`, `astar.ts`.
**Contrato.**
```ts
export function routeFor(state: GameState, id: VillagerId): number[]; // cacheada
export function accrueTraffic(state: GameState): void;
export function upgradePaths(state: GameState): PathEvent[];
export function fellForest(state: GameState, wood: number, permanent?: boolean): number;
export function fellForestWithLocation(
  state: GameState, wood: number, permanent?: boolean,
): { wood: number; firstCell: number | null };
export function regrowForest(state: GameState): void;
```
**Reglas.** Umbrales y decaimiento de §12.7. La tala consume la celda de bosque
más cercana al núcleo. El rebrote necesita 3 vecinas y 8 años.
**Tests.** Con tráfico constante, una celda alcanza `path = 2` en el número de
ticks esperado ±5 %; sin tráfico, un camino desaparece; el bosque nunca baja de
0 ni sube del total inicial; el rebrote no ocurre bajo un edificio.
**Terminado cuando.** A los 100 años, el bosque restante cae en el rango de
§12.9 en al menos 20 de 30 semillas.

**Estado (v2.15): implementado, con el criterio de cierre sin alcanzar.** Las
cinco funciones del contrato están, con veintiuna pruebas: el coste del suelo,
que el trayecto es contiguo y determinista y prefiere la calzada al bosque, que
una celda llega a sendero en el número de semanas que sale de la fórmula ±5 %,
que sin tráfico el camino se borra, que la calzada necesita fragua, que la
madera nunca baja de cero ni sube del total inicial en un siglo, y que el
rebrote necesita sus tres vecinas y sus ocho años y no ocurre bajo un edificio.
Lo que no llega es la fila del bosque: 24 de 40 valles, y quince de los fallos
son por conservar **de más**. Ver §2.15.

---

### M-16 · Terreno y paletas

**Objetivo.** Que el valle se vea, y que la estación se reconozca por el color.
**Depende de.** M-13, M-00.
**Ficheros.** `src/render/palette.ts`, `src/render/layers/terrain.ts`,
`src/render/canvas.ts`.
**Contrato.**
```ts
export function paletteFor(season: Season, seasonWeek: number): Palette; // interpola 2 semanas
export function outline(c: string): string;
export function paintTerrain(ctx, map: ValleyMap, p: Palette, cell: number): void;
export function makeBackground(map, p, cell): OffscreenCanvas;
```
**Reglas.** Tabla de §10.3 literal. Manchas por región, jamás ruido por celda.
Sin contorno en el terreno.
**Tests.** La comprobación de silueta de §10.3 para las cuatro paletas;
`paletteFor` interpola de forma continua en los bordes de estación.
**Terminado cuando.** La hoja de contacto de M-19 muestra cuatro estaciones
inconfundibles.

**Estado (v2.50): implementado.** El fondo cacheado pinta regiones de terreno y
caminos; la hoja de 16 estados muestra cuatro estaciones inconfundibles. La
tabla se corrigió porque sus colores originales no podían superar el test de
silueta que ella misma imponía; evidencia y valores están en §2.50.

---

### M-17 · Edificios y figuras

**Objetivo.** El resto del arte.
**Depende de.** M-16, M-14.
**Ficheros.** `src/render/sprites/*.ts`, `src/render/layers/buildings.ts`,
`figures.ts`, `shadows.ts`.
**Contrato.** Una función pura por sprite, con la firma de §10.5.
**Reglas.** Todo lo que está de pie proyecta sombra. Contorno en edificios y
figuras. Proporciones de §10.5. Nada se dibuja fuera de su caja.
**Tests.** Cada sprite se renderiza a 10 px y a 9 px de celda sobre fondo blanco y sobre
negro y produce píxeles no vacíos en ambos; ningún sprite pinta fuera de su caja
(comprobado sobre el buffer); test de silueta: en blanco y negro, `house`,
`chapel`, `granary` y `mill` tienen mapas de ocupación distintos entre sí.
**Terminado cuando.** A tamaño de móvil real se distinguen los siete edificios
principales sin leer una etiqueta.

**Estado (v2.51): implementado.** Trece clases de edificio, ruina, aldeano y
nombrado pasan la auditoría de píxeles a 9 y 10 px; la hoja móvil distingue las
siete familias principales sin rótulos. Las aspas quedan quietas por el contrato
de caché documentado en §2.51.

---

### M-18 · La multitud

**Objetivo.** Ochenta figuras que van y vienen.
**Depende de.** M-17, M-15.
**Ficheros.** `src/render/crowd.ts`.
**Contrato.**
```ts
export function crowdPositions(state: GameState, tickFraction: number): Figure[];
```
**Reglas.** El horario de §10.6. Desfase de fase derivado del `id`. Interpolación
sobre el trayecto cacheado. **No muta el estado.** De noche no se dibujan
figuras: se ilumina la ventana.
**Tests.** Función pura: misma entrada, misma salida; ninguna figura fuera del
mapa; a `tickFraction = 0.9` no hay figuras a la intemperie; con 80 aldeanos,
1 000 llamadas en menos de 100 ms.
**Terminado cuando.** En un GIF de 20 s se ve salir al campo y volver.

**Estado (v2.57): cerrado.** Posiciones puras, rutas cacheadas, domingo en la
plaza, noche vacía, límite de 80 y presupuesto verificados. El GIF de veinte
segundos sobre un valle determinista de 80 habitantes muestra salida, trabajo,
regreso, noche y nuevo ciclo con la fracción temporal real de M-20.

---

### M-19 · Capturas automáticas

**Objetivo.** Que quien programa pueda ver el juego. Es el riesgo número uno de
`valle.md` §12 y esto es su mitigación.
**Depende de.** M-16.
**Ficheros.** `tools/screenshots.ts`, `playwright.config.ts`, `src/ui/debug.ts`.
**Contrato.** `npm run shots -- --seed 7 --years 1,20,60,120` genera en
`artifacts/` una PNG por combinación de año y estación, a 390×844 (mapa 360×560), más su
versión en escala de grises, más una hoja de contacto que las junta.
**Reglas.** Debe funcionar sin interacción y en CI. Una ruta de depuración
permite saltar la simulación a un tick dado sin jugar.
**Tests.** El comando termina con código 0 y produce el número esperado de
ficheros.
**Terminado cuando.** Está fusionado **antes** que M-17. Ningún trabajo visual
empieza sin esto.

**Estado (v2.49): implementado.** Ruta determinista, geometría móvil, 32
capturas y hoja de contacto verificadas antes de empezar M-16. El lienzo
diagnóstico es deliberadamente plano: su único contrato es recibir el pintado
real sin volver a diseñar la automatización.

---

### M-20 · Armazón de aplicación

**Objetivo.** Que el juego corra en una pantalla.
**Depende de.** M-10, M-16, M-17.
**Ficheros.** `src/ui/app.ts`, `loop.ts`, `speed.ts`, `src/main.ts`.
**Contrato.**
```ts
export function boot(root: HTMLElement, save?: SaveFile): App;
export interface App {
  setSpeed(s: 0|1|4|16): void;
  state(): Readonly<GameState>;
  decide(optionId: string): boolean;   // v2.60 — ver abajo
}
```
**La decisión pendiente (v2.60).** `decide` **encola**, no aplica. La opción la
consume el **paso 3 del tick**, que es donde §4.2 pone las decisiones, y así todo
cambio de estado sigue pasando por el tick: la interfaz nunca llama a
`applyOption`. Si lo hiciera, mutaría el estado fuera del orden normativo y
rompería el registro de decisiones del que depende la reproducción de §13.1.

Cuatro reglas, y las cuatro son contrato:

1. **Se consume exactamente una vez.** Si no hay encrucijada pendiente, o ya hay
   una decisión encolada, `decide` devuelve `false` y **no sustituye** a la
   anterior. Decidido es decidido: un doble toque no puede cambiar algo que ya va
   camino de `history`.
2. **Encolar fuerza el tick siguiente de inmediato**, sea cual sea la velocidad.
   Sin esto, el jugador toca y no pasa nada hasta quince segundos después a ×1, y
   la decisión más pesada del juego se siente rota. Con esto, el efecto aparece
   en el acto y sigue habiendo un solo camino de mutación.
3. **En pausa la decisión espera.** §8.7 dice que la simulación no se detiene por
   una encrucijada pendiente, no que el jugador no pueda pausar el juego.
4. **El motor informa; la interfaz enfoca.** `TickReport` devuelve los
   `VisualEffect` aplicados **con sus coordenadas de mapa**. El motor no sabe que
   existe una cámara (§2.4) y no dice «enfoca aquí»: dice «esto ha cambiado, en
   estas celdas». Los dos segundos de §11.2 los decide la interfaz con esa lista.

**Reglas.** El bucle acumula tiempo real y ejecuta ticks enteros; el render
interpola con la fracción sobrante. Si la pestaña estuvo oculta, no se acumulan
ticks: eso lo resuelve el letargo (M-23). Nunca más de 8 ticks por fotograma.
**Tests.** Lógica de acumulación de tiempo probada sin DOM: a ×4 y 60 fps, 12
minutos reales dan exactamente 192 ticks.
**Terminado cuando.** Se abre en un móvil, se ve el valle y las estaciones pasan.

**Estado (v2.56): implementado.** La prueba pura produce 192 ticks exactos y
mantiene la deuda tras el tope por fotograma. Playwright abre la aplicación a
390×844, acciona las cuatro velocidades y adelanta el reloj hasta comprobar un
cambio de estación.

**Estado de `decide` (v2.61): implementado.** `attemptDecision` — la lógica
pura de las cuatro reglas — se prueba sin DOM; `boot` la envuelve con el reloj
real. Playwright confirma que decidir cierra la encrucijada y cambia la
transformación del lienzo (§17 M-22).

---

### M-21 · HUD diegético y fichas

**Objetivo.** Informar sin números en pantalla.
**Depende de.** M-20.
**Ficheros.** `src/ui/inspect.ts`, `gestures.ts`, `src/render/layers/tells.ts`.
**Contrato.**
```ts
export function tellsFor(state: GameState): Tell[];         // humo, velas, cruces, granero
export function inspectAt(state, x: number, y: number, tickFraction?: number): InspectTarget | null;
export function panelFor(t: InspectTarget, state): PanelModel;
```
**Reglas.** La tabla de §11.1 completa. La ficha muestra la cifra exacta: el
juego no esconde datos. Gestos de §11.3, en un módulo sin DOM y con tests.
**Tests.** `inspectAt` acierta el objetivo en los bordes de las cajas; `tellsFor`
es pura; el reconocimiento de gestos se prueba con secuencias de eventos
sintéticas.

**Estado (v2.59): implementado.** Señales, inspección, fichas y reconocimiento
de los seis gestos tienen pruebas sin DOM; la adaptación de puntero abre el panel
inferior, sigue nombrados y aplica zoom. Playwright verifica el toque en un valle
maduro y conserva una escena de hambre sin cifras ni ficha abiertas.
**Terminado cuando.** Alguien que no conoce el juego sabe decir si hay hambre
mirando la pantalla.

---

### M-22 · Encrucijada y crónica en pantalla

**Objetivo.** Cerrar el bucle corto.
**Depende de.** M-21, M-09.
**Ficheros.** `src/ui/screens/crossroad.ts`, `screens/chronicle.ts`.
**Contrato.**
```ts
export function openCrossroad(app: App, p: PendingCrossroad): void;
export function openChronicle(app: App, sinceTick?: number): void;
```
**Reglas.** El precio de cada opción siempre visible antes de elegir. Sin botón
de cerrar. La simulación **no se pausa** mientras la encrucijada está abierta.
Al decidir, la cámara enfoca durante 2 s el efecto visible. El enfoque lo elige
la interfaz a partir de los `VisualEffect` con coordenadas que devuelve el
`TickReport` (M-20): el motor informa de qué cambió y dónde, nunca de adónde
mirar.
**Tests.** Todas las opciones de las 16 plantillas se renderizan sin
desbordamiento a 390 px de ancho; el enfoque posterior apunta a una celda
válida.
**Terminado cuando.** Una decisión cambia el valle de forma visible. **Este es
el hito 2.**

**Estado (v2.61): implementado — hito 2 alcanzado.** El precio de las tres
opciones se lee sin desplazar a 390 px de ancho reales (GIF y hallazgos en
§2.61). `boot` (M-20) abre la encrucijada él mismo en cuanto hay una pendiente
—incluida la primera pintura, para una partida guardada o una ruta de depuración
que ya aterrice sobre una— y conecta el deslizar hacia arriba a `openChronicle`,
que hasta ahora no tenía oyente. Sin botón de cerrar: un deslizar hacia abajo
devuelve al valle y dibuja una marca discreta que reabre la misma encrucijada.

---

### M-23 · Guardado y letargo

**Objetivo.** Que la aldea siga sin ti.
**Depende de.** M-20, M-10.
**Ficheros.** `src/engine/save.ts`, `src/ui/lethargy.ts`, `src/ui/welcome.ts`.
**Contrato.**
```ts
// v2.63: `serialize` gana dos parámetros que el esquema original no traía.
// `SaveFile` necesita `archive` (partidas anteriores; no las deriva `state`) y
// `savedAtMs` (reloj de pared) y ninguno de los dos sale de `(state,
// decisions)` — y `src/engine/` no puede leer el reloj él mismo (CLAUDE.md).
export function serialize(
  state: GameState, decisions: DecisionRecord[],
  archive: ArchivedGame[], savedAtMs: number,
): SaveFile;
export function deserialize(raw: unknown): SaveFile;          // valida y migra
export function catchUp(state: GameState, elapsedMs: number): CatchUpReport;
```
**Reglas.** §13 completa. Guardado cada 20 ticks y en `visibilitychange`. Tope
de letargo de 4 h. Una encrucijada pendiente sigue pendiente. Lotes de 64 ticks
dentro de `requestAnimationFrame`.
**Tests.** Ida y vuelta idéntica; un guardado corrupto se rechaza sin romper la
aplicación; `catchUp` de 4 h ejecuta exactamente 960 ticks y tarda menos de 2 s;
reproducir el registro de decisiones desde la semilla da el mismo estado que la
instantánea.
**Terminado cuando.** Cerrar y abrir a las cuatro horas presenta un parte de
bienvenida coherente. Esto cierra M-23 y deja listo el hito 6; la aceptación
adicional de varios días reales permanece en §15.

**Estado (v2.70): módulo implementado; hito 6 pendiente de aceptación humana
según §15.** `catchUp` corre los 960 ticks en un solo lote síncrono (es lo que su
propia prueba mide en menos de 2 s); el letargo de la interfaz (`ui/lethargy.ts`)
es un bucle distinto sobre lotes de 64, la misma separación pura/DOM que
`loop.ts`. El guardado real vive en IndexedDB (`ui/idb.ts`, fuera del contrato
de este módulo: ninguno de los tres ficheros lo abre por su cuenta) y
`app.ts`/`main.ts` quedan enganchados: guardan cada 20 ticks, al ocultar la
pestaña y en `pagehide` antes de detener el bucle; cargan al abrir, ponen al día
antes de que el bucle normal toque el mismo estado y muestran el parte de
bienvenida antes que nada más. Verificado
con Playwright y reloj falso: cerrar y volver a las cuatro horas, sin esperar,
entrega un parte legible (§2.63 trae el texto real y lo que no se entiende a la
primera lectura).

---

### M-24 · Núcleo de fracaso y herencia

**Objetivo.** Que una aldea terminada pueda convertirse, sin interfaz, en la
memoria visual de la siguiente.
**Depende de.** M-23, M-13, M-14.
**Ficheros.** `src/engine/state.ts`, `found.ts`, `save.ts`, `sim.ts`.
**Contrato.** `GameState.terrainSeed`, `GameState.peakPeople`, `archiveGame` y
`foundSuccessor` tal como se fijan en §13.3.
**Reglas.** Una aldea viva no se archiva. La máscara une ruinas previas y
edificios finales. La sucesora cambia `seed`, conserva `terrainSeed`; la ruina
es solo visible. El pico se observa al cierre de tick. Esquema 1 migra según
§13.1.
**Tests.** Migración aditiva; copia aislada; huella completa; terreno y máscara
idénticos; personas distintas; ruina sin ocupación mecánica.
**Terminado cuando.** La transición pura completa pasa ida y vuelta y no hace
ninguna elección de interfaz. **No alcanza todavía el hito 4.**

**Estado (v2.67): implementado.** Las decisiones pendientes permanecen en
§16.1 y requieren jugar la pantalla que las presente.

---

### M-25 · Epitafio y herencia visible

**Objetivo.** Cerrar una aldea ante el jugador y convertir su huella en el
comienzo visible de la siguiente.
**Depende de.** M-24, M-22, M-23.
**Ficheros.** `src/ui/app.ts`, `src/ui/screens/epitaph.ts`,
`src/ui/screens/crossroad.ts`, `src/render/layers/buildings.ts`, banco y render
de crónica, ruta de depuración y Playwright.
**Contrato.** El primer `EndState` detiene el bucle y archiva una sola vez. El
epitafio presenta causa, años y `peakPeople`; «Read the chronicle» abre el
registro cerrado y «Begin again» llama a `foundSuccessor` con semilla nueva.
Las escrituras de guardado mantienen el orden de solicitud fijado en §13.1.
**Reglas.** Ninguna opción se decide al cerrar; las ruinas son visibles e
inertes; la máscara usa la regla gráfica de §10.4; el archivo es acumulativo.
La semilla nueva no repite ninguna del archivo. Todo texto visible procede del
banco.
**Tests.** Pantalla y controles a 390 × 844; crónica abrible y cerrable; sucesora
en `ANNO I`; huella visible; guardado vivo con un solo archivo después de entrar
de nuevo por la ruta normal.
**Terminado cuando.** Las dos capturas se han mirado, el flujo completo pasa y
una recarga no devuelve la aldea muerta.

**Estado (v2.68): implementado. Hito 4 alcanzado.**

---

### M-26 · Lector de crónicas archivadas

**Objetivo.** Que las historias conservadas por §13.3 sigan al alcance después
de fundar otra aldea.
**Depende de.** M-25, M-22, M-09.
**Ficheros.** `src/ui/app.ts`, `src/ui/screens/chronicle.ts`,
`src/engine/chronicle/render.ts`, `bank.en.ts`, pruebas rápida y Playwright.
**Contrato.** `App.archive(): readonly ArchivedGame[]` expone lectura;
`renderChronicleYear(entries, rng, year, minWeight?)` compone una fuente sin
exigir un `GameState`. `renderYear` delega y no cambia de firma.
**Reglas.** El selector vive dentro de la pantalla 4; actual primero,
antepasadas en orden inverso de archivo. La partida actual terminada no se
duplica. La voz se reconstruye desde `seed`, sin migración.
**Tests.** Igualdad de prosa actual/archivada; dos opciones tras la primera
sucesora; selección cambia el cuerpo; cierre por gesto; captura móvil mirada.
**Terminado cuando.** Una crónica anterior se puede leer completa desde el
valle sucesor y el selector cabe a 390 px.

**Estado (v2.71): implementado y mirado.**

---

### 17.1 Orden de trabajo

```
M-00
 └─ M-01 ─ M-02 ─┬─ M-03 ─┬─ M-04 ─┐
                 │        └─ M-05 ─┤
                 ├─ M-06 ──────────┤
                 ├─ M-09 ──────────┤
                 └─ M-13 ─ M-14 ─ M-15
                                   │
                          M-07 ─ M-08
                                   │
                                 M-10  ← HITO 0
                                   ├─ M-11, M-12
                                   │
                          M-19 ─ M-16 ─ M-17 ─ M-18  ← HITO 1
                                   │
                                 M-20 ─ M-21 ─ M-22  ← HITO 2
                                   │
                                 M-23  ← HITO 6
                                   │
                                 M-24 ─ M-25  ← HITO 4
                                         └─ M-26  (archivo legible)
```

Se pueden trabajar en paralelo, sin pisarse: (M-03, M-06, M-09, M-13),
(M-04, M-05), (M-11, M-12), (M-16, M-19), (M-17, M-18).

**M-19 va antes que M-17.** No es una preferencia de orden: es la mitigación del
riesgo principal del proyecto.

---

## Anexo A · Catálogo de encrucijadas

Dieciséis plantillas, dos por categoría. Los textos van en inglés porque son
contenido; los comentarios en español porque son diseño.

Formato: identificador, condiciones, reparto, texto, y de cada opción el verbo,
el precio visible, los efectos, el cambio en pantalla y las semillas.

---

### A.1 `winter_grain_debt` · lord

**Peso** 10 · **Reposo** 30 años · **Máx.** 2
**Requiere** `season = winter`, `seasonWeek ≥ 6`, `grainToHarvest < 0.9`, `flag vassal` sin poner
**Reparto** `A = leader`

> **The Lord's Grain**
> Year {year}. The granary is bare and the frost has not broken. Riders from
> Wealdmere wait at the ford with three carts of rye. Their captain will not
> unload them until {A} kneels.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Kneel** | The valley is no longer its own | `grain +900`, `flag vassal 0`, `morale −12` | `banner` gris sobre el núcleo, permanente | `tithe_due`, 8–14 años: `grain −450`, `morale −6` |
| **Refuse** | People will die this winter | `morale +10`, `flag proud 20` | `gather square 3` | `wealdmere_remembers`, 12–25 años: si `flag proud`, `threatened` durante 5 años |
| **Take it at night** | If you are caught, they come armed | `grain +600`, `faith −15`, `memory A stole 4` | `scar felled_wood` | `the_reckoning`, 3–9 años, 55 % de que dispare: `kill random fraction 0.15`, `destroy palisade 3` |

*Nota de diseño: es la plantilla insignia, la que aparece en `valle.md` §3. Las
tres opciones son malas de formas distintas y ninguna resuelve el invierno del
todo.*

---

### A.2 `tithe_demand` · lord

**Peso** 6 · **Reposo** 20 años
**Requiere** `flag vassal` puesto, `season = autumn`, `year > 5`
**Reparto** `A = reeve`, `B = leader`

> **The Reeve's Ledger**
> The lord's man has counted the sheaves twice and written down a number
> {A} says is wrong.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Pay in full** | A quarter of the harvest | `grain −25 %`, `morale −5` | `gather square 2` | — |
| **Pay short** | They will count again next year | `grain −12 %`, `flag watched 10` | `banner` gris parpadeante 2 años | `double_tithe`, 1–3 años: `grain −30 %` si `flag watched` |
| **Send him away** | Wealdmere does not forget | `morale +12`, `flag threatened 6` | `douse` de la fragua 1 año | `punitive_raid`, 2–5 años: `kill random fraction 0.12`, `destroy house 2` |

---

### A.3 `hungry_spring` · famine

**Peso** 12 · **Reposo** 12 años
**Requiere** `season = spring`, `grainYears < 0.35`
**Reparto** `A = reeve`, `B = midwife`

> **Seed or Bread**
> There is grain enough to sow the fields, or grain enough to eat until
> midsummer. {A} has counted it, and {B} has counted the children.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Sow it** | A hungry summer | `severity` forzada a 0.5 durante 8 semanas, `morale −8` | `scar burnt_field` invertido: los campos aparecen sembrados de inmediato | — |
| **Eat it** | A thin harvest | `grain +300`, cosecha del año ×0.55 | `douse` del molino 1 año | `lean_autumn`, 1 año: entrada de crónica que enlaza la decisión |
| **Half and half** | Both, and neither enough | `grain +140`, cosecha ×0.78, `morale −4` | `gather square 1` | — |

---

### A.4 `granary_theft` · famine

**Peso** 7 · **Reposo** 18 años
**Requiere** `grainYears < 0.5`, `has granary`, `grudge min 40`
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Broken Latch**
> Someone has been at the granary in the night. {B} says it was {A}.
> {A} says nothing at all.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Believe {B}** | {A} is cast out | `role A null`, `people −1`, `morale −6`, `opinion` del resto hacia B −10 | `gather square 2` | `exile_returns`, 10–20 años, 40 %: `arrive 3`, `flag threatened 4` |
| **Believe {A}** | {B} will not forget | `opinion B→A −45`, `memory B was_blamed 5` | `douse` del taller de B 2 años | `the_feud`, 2–8 años: dispara `smith_feud` con prioridad |
| **Hang a new latch and say nothing** | Everyone stays, and everyone knows | `morale −10`, `faith −5` | `raise` de un `palisade` junto al granero | `rot_within`, 5–15 años: `morale −15`, `flag hostile 6` |

---

### A.5 `plague_pit` · plague

**Peso** 14 · **Reposo** 25 años
**Requiere** `outbreak active`, `people > 12`
**Reparto** `A = priest`, `B = herbalist` (si no hay, `anyNamed`)

> **Where the Dead Go**
> Nine dead in eleven days. The churchyard is small and the ground is hard.
> {A} wants them blessed one by one. {B} wants a pit and lime, dug today.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Bless them** | The sickness has more days to work | `faith +18`, `morale +6`, brote +3 semanas | `build grave_yard free` | — |
| **The pit** | No one will forget who chose it | `faith −20`, brote −3 semanas, `opinion A→leader −40` | `scar grave_row` | `unquiet_ground`, 6–18 años: `faith −10`, `morale −8` |
| **Burn the houses of the dead** | Roofs for ash | `destroy house 2` con suelo bloqueado 20 años, brote −4 semanas, `morale −14` | `ruin house` ×2 | `the_burnt_row`, 3–10 años: entrada de crónica y cicatriz |

---

### A.6 `plague_blame` · plague

**Peso** 8 · **Reposo** 30 años
**Requiere** `outbreak active`, `faith > 55`, `trait priest devout`
**Reparto** `A = priest`, `B = anyNamed excluding [A]`

> **A Reason for It**
> {A} has preached three days that the sickness is a judgement, and by the
> third day the village had decided whose.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Give them {B}** | You will not get {B} back | `kill B 1`, `faith +25`, `morale +8`, `opinion` de los parientes de B hacia A −60 | `gather chapel 3` | `blood_debt`, 8–20 años: un hijo de B, si vive, `memory was_blamed 5` y dispara `feud_inherited` |
| **Silence {A}** | The village keeps its priest and loses its faith | `faith −30`, `morale −5` | `douse` de la capilla 3 años | `no_shepherd`, 4–10 años: `faith −15` si entonces no hay cura |
| **Say nothing** | It will find its own end | `morale −12`, `faith −8`, brote +2 semanas | `gather square 4` | `whispers`, 5–12 años: `grudge` nuevo entre dos nombrados al azar |

---

### A.7 `smith_feud` · feud

**Peso** 9 · **Reposo** 15 años
**Requiere** `grudge min 45`, `people > 20` — con 55 no dispara nunca: la ventana en que alguien odia a otro por más de 55, hay más de veinte personas y el reposo ha vencido, no llega a solaparse en 2 000 años de aldea
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Anvil and the Altar**
> It has been building for years. This morning {A} put a hand on {B} in front
> of the whole village, and now both are waiting to see what you do.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Side with {A}** | {B} withdraws | `opinion B→A −30`, `lit` del edificio de B apagado 4 años, obra −15 % 4 años | `douse` del edificio de B | `the_withdrawn`, 6–14 años: B se marcha con 2 personas |
| **Side with {B}** | {A} withdraws | Simétrico | `douse` del edificio de A | Simétrico |
| **Make them build something together** | Neither forgives it, and the wall goes up | `build palisade free` ×4, `morale +8`, ambas opiniones −15 | `raise palisade` | `uneasy_truce`, 10–25 años, 50 %: el rencor vuelve peor, `opinion −70` |

---

### A.8 `feud_inherited` · feud

**Peso** 5 · **Reposo** 20 años · **Año mínimo** 25
**Requiere** existe un nombrado con `memory kind = was_blamed` heredada
**Reparto** `A = anyNamed`, `B = childOf A`

> **What the Father Left**
> {B} was four years old when it happened and has never spoken of it.
> {B} is not four years old now.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Let it be settled** | One of them will not see the winter | `kill B 1` con 50 % / `kill A 1` con 50 %, `morale −10`, `faith −6` | `scar grave_row` | — |
| **Send {B} away** | The valley loses a pair of hands and a name | `people −1`, `role B null`, `morale −4` | `gather ford 2` | `the_returned`, 15–30 años, 35 %: vuelve con gente y con una demanda |
| **Give {B} the smithy** | {A} watches it happen | `role B smith`, `opinion A→B −50`, `morale +6` | `lit` de la fragua encendido | `two_smiths`, 5–12 años: dispara `smith_feud` con peso ×3 |

---

### A.9 `chapel_or_granary` · faith

**Peso** 8 · **Reposo** 40 años · **Máx.** 1
**Requiere** `people ≥ 30`, `not has chapel`, `wood > 200`, `faith > 45`
**Reparto** `A = priest` (o `anyNamed` si no hay)

> **Timber Enough for One**
> There is standing timber for one great work and the season for it. {A} has
> been drawing a chapel in the dirt for two years. The reeve has been drawing
> a granary.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **The chapel** | The next harvest comes in one fifth lighter | `build chapel free`, `faith +20`, `morale +10`, próxima cosecha ×0.8 | `raise chapel` | `the_faithful_valley`, 15–30 años: si `faith > 70`, `arrive 4` peregrinos |
| **The granary** | {A} will remember which you chose | `build granary free`, `opinion A→leader −35`, `faith −10` | `raise granary` | `a_priest_without_a_roof`, 8–16 años: `role priest null`, `faith −15` |

---

### A.10 `relic_pedlar` · faith

**Peso** 6 · **Reposo** 25 años
**Requiere** `has chapel`, `faith > 30`, `grainYears > 0.6` — se retira el tope de 70: la deriva de §5.6 estabiliza la fe por encima de esa cifra en cuanto hay capilla, así que la franja se abandonaba para no volver (§8.1, regla de la aldea madura). Y una aldea próspera y devota es justo donde aparecería un vendedor de reliquias
**Reparto** `A = priest`, `B = leader`

> **A Bone in a Box**
> A man came up the ford road with a box and a story. He says it is the
> finger of a saint. {A} believes him. {B} has counted the price in grain.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Buy it** | Six weeks of bread | `grain −6 × people`, `faith +25`, `morale +8` | `raise` de un `palisade` decorativo junto a la capilla + `gather chapel 4` | `the_relic_works`, 10–25 años, 50 %: `faith +15`, `arrive 3`; si no, `faith −25` y la crónica lo llama fraude |
| **Send him on** | {A} will preach about it for a year | `faith −8`, `opinion A→B −20` | `gather ford 1` | — |
| **Take the box and pay nothing** | He will tell the road what happened here | `faith +10`, `flag hostile 8`, `morale −6` | `banner` rojo 2 años | `no_one_comes`, 3–8 años: sin llegadas mientras dure `hostile` |

---

### A.11 `forest_cut` · forest

**Peso** 9 · **Reposo** 15 años
**Requiere** `forestLeft > 0.12`, `neededFields > fields`, `people > 25` — el 0.3 original era **inalcanzable**: la generación de mapa tope en 0.26 (§12.7), así que la plantilla estaba muerta desde el tick cero. El bosque es aquí una **puerta** («queda madera que valga la pena talar»); el disparador episódico es `neededFields > fields`, y por eso `forest_cut` es contenido de la primera mitad **por diseño**: no se roturan más campos que el tope de ocho
**Reparto** `A = woodward`

> **The Old Wood**
> The fields will not feed another winter's worth of children. The nearest
> flat ground is under three hundred years of oak. {A} has walked it twice
> and come back with nothing to say.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Fell it** | The wood does not come back in your lifetime | `fell 900 permanent`, `build field free` ×2, `wood +900`, `faith −10` | `scar felled_wood` + `raise field` | `bare_slopes`, 20–40 años: `flag flood_prone 0`; el clima ruinoso pasa a ser un 5 % más probable |
| **Take only the edge** | Slower, and the children are hungry now | `fell 300`, `build field free` ×1, `wood +300`, `severity` mínima 0.5 una semana | `raise field` | — |
| **Leave it standing** | {A} sleeps well; nobody else does | `morale −8`, `faith +12`, `opinion A→leader +40` | `gather ford 2` | `the_wood_holds`, 15–35 años: si `forestLeft > 0.5`, `arrive 3` y `morale +10` |

---

### A.12 `wolf_winter` · forest

**Peso** 7 · **Reposo** 12 años
**Requiere** `season = winter`, `forestLeft > 0.25`, `people > 15`
**Reparto** `A = woodward`, `B = youngestNamed`

> **Tracks at the Palisade**
> Three nights running. On the third, they took something. {A} says it will
> be a child next.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Hunt them** | Men in the wood in February | `kill random 1` con 35 %, `morale +12`, `wood +120` | `gather ford 3` | — |
| **Build up the palisade** | Timber that was meant for a house | `build palisade free` ×6, `wood −180`, `morale +5` | `raise palisade` | — |
| **Keep everyone inside** | Nothing gets done for a month | Obra ×0.4 durante 6 semanas, `wood −60`, `morale −8` | `douse` general: ninguna figura sale de casa 6 ticks | `the_long_indoors`, 1 año: `morale −6` |

---

### A.13 `strangers_at_the_ford` · stranger

**Peso** 10 · **Reposo** 20 años
**Requiere** `people ≥ 12`, `housingFree ≥ 2`, `not flag hostile`, `morale ≥ 55`
**Reparto** `A = leader`, `B = reeve`

> **Nine at the Ford**
> Nine of them, with a cart and no oxen. They say their village is ash and
> will not say who burned it. {B} has counted the grain twice.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Take them in** | Nine more mouths before the harvest | `arrive 9`, `grain −40`, `morale +6` | `gather ford 4` | `whoever_burned_it`, 3–10 años, 40 %: `flag threatened 3`, `kill random fraction 0.10` |
| **Feed them and send them on** | Sixty bushels, and they leave before nightfall | `grain −60`, `faith +10`, `morale −3` | `gather ford 2` | — |
| **Turn them away** | The road will hear of it | `flag hostile 10`, `faith −18`, `morale −8` | `banner` rojo 3 años | `no_one_comes`, 1 año: sin llegadas mientras dure `hostile` |

---

### A.14 `bandits` · stranger

**Peso** 8 · **Reposo** 18 años
**Requiere** `people > 30`, `not has palisade`, `year > 15`
**Reparto** `A = leader`, `B = smith`

> **Six Men and a Horse**
> They came out of the north wood at noon so that everyone would see them.
> They want a third of the granary and they will be back in the spring.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Pay them** | And every spring after | `grain −33 %`, `morale −10` | `gather square 2` | `the_spring_visit`, 1–2 años, se repite: `grain −25 %` hasta que haya empalizada |
| **Fight them** | {B} leads it | `kill random fraction 0.10`, `morale +18`, `wood +80`, 25 % de `kill B 1` | `scar grave_row` | `a_name_in_the_valley`, 5–15 años: `morale +10`, plantillas de `lord` con peso ×0.5 |
| **Wall the village first** | They take the harvest while you dig | `build palisade free` ×10, `grain −20 %` | `raise palisade` | — |

---

### A.15 `succession` · succession

**Peso** 100 · **Reposo** 0 · **Salta el intervalo mínimo**
**Requiere** `not role leader alive`, `not flag interregnum`
**Reparto** `A = anyNamed` **filtrado** a 20–60 años, `B = anyNamed excluding [A]` (igual). Si no llegan a dos candidatos en la banda, se ensancha; el respaldo es la excepción, no la regla.

> **Who Speaks Now**
> {leaderName} is buried. Two people in this valley expect to be asked, and
> only one of them is going to be.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **{A}** | {B} will remember it | `role A leader`, `opinion B→A −45`, `memory B was_passed_over 4` | `gather square 3` | `the_passed_over`, 5–20 años: si `opinion B→A < −60`, dispara `smith_feud` |
| **{B}** | {A} will remember it | Simétrico | `gather square 3` | Simétrico |
| **No one** | Nobody joins a valley with nobody in charge | `morale −12`, `faith −6`, obra ×0.8 durante 2 años, **`flag interregnum` los mismos años que tarde la semilla**, **llegadas bloqueadas y marchas ×2 mientras no haya líder**; al **tercer «No one» seguido**, la aldea se dispersa (abandono) | `douse` general 1 año | `the_leaderless_years`, 2–4 años: levanta `interregnum` y se vuelve a disparar `succession` |

*Nota de diseño: es la única plantilla que ignora el intervalo mínimo, y el
latido del bucle largo. Cada generación el jugador reparte una herencia y crea
un rencor.*

**Por qué quedarse sin líder tiene que doler (v2.22).** `interregnum` bajó la
elegibilidad de la plantilla del 78 % de los ticks al 5,5 %, pero no arregló lo
de fondo: **«No one» es una opción que no resuelve nada y vuelve a plantear la
misma pregunta.** Medido, `last` y `worst` dedican el **93 % de todas sus
decisiones** —unas 54,5 por partida— a rechazar el liderazgo, y les quedan unas
250 para el resto del catálogo entero. Rechazar salía gratis.

Ahora no. Mientras el puesto esté vacante **ningún forastero se une** —nadie se
muda a un sitio donde nadie manda— y **las marchas de §5.7 se duplican**; al
tercer «No one» consecutivo sin líder de por medio, la aldea se dispersa. No
hace falta tocar ni un efecto del catálogo: bastan mecanismos que ya existen.

**Medido (v2.23).** Funciona, y de más: `last` y `worst` pasan de terminar
prácticamente nunca a terminar el **100 %** de las 60 partidas, casi siempre
antes del año 46. Pero `no_one` sigue siendo el **68,2 %** de sus decisiones —
no el 93 % de antes, pero tampoco menos del 40 % que pide el nuevo aserto de
§12.9—, porque ambas políticas contestan `no_one` **las 178 veces que se les
pregunta, sin una sola excepción**: `last` porque es la última opción de la
lista, que es todo lo que mira; `worst` porque su coste inmediato de ánimo y fe
(18) supera al de nombrar a alguien (0, ninguno de los efectos de `choose_a`
puntúa en `immediateCost`). Ningún castigo que se le añada a `no_one` cambia
esa aritmética, porque ninguna de las dos políticas mira más allá de la semana
en curso. Ver §2.23; la puerta que decidiría si tocar los efectos del
catálogo —`worst` por debajo del 25 % de terminación estando ya fuera del
bucle— no se cruza: está en el 100 %.

**Por qué la bandera `interregnum`.** Sin ella, elegir «No one» deja el puesto
vacante, la vacante vuelve a hacer elegible la plantilla al tick siguiente, y
`succession` pasa a ser elegible el 78 % de los ticks: bajo cualquier política
que rechace a los dos candidatos, la aldea vive preguntándose quién manda y no
queda presupuesto para nada más. La semilla ya decía que la aldea pasa dos a
cuatro años a gritos antes de volver a preguntar; la bandera es la mitad que
faltaba para que eso se cumpliera de verdad.

---

### A.16 `first_stone` · succession

**Peso** 6 · **Reposo** 50 años · **Máx.** 1
**Requiere** `people ≥ 45`, `has smithy`, `year > 40`, sin sitio libre en el mapa
**Reparto** `A = leader`, `B = smith`

> **The First Stone**
> There is nowhere left to build outward. {B} says the quarry on the east
> slope will give stone for a wall, or for houses, and that {A} will not live
> to see both finished.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **The wall** | Cold houses for a generation | Habilita `wall`, leña de invierno ×1.5 durante 20 años, `morale +6` | `raise wall` | `behind_the_wall`, 20–40 años: plantillas de `lord` y `stranger` con peso ×0.4 |
| **The houses** | The valley is rich and open | Habilita `stone_house`, incendios ×0.3, `morale +12` | `raise stone_house` | `worth_taking`, 15–30 años: `flag threatened 8` |

---

### A.17 `quiet_years` · reserva

Plantilla de reserva para la garantía por generación cuando no hay ninguna otra
elegible. **Está fuera del reparto normal**: `eligible()` la salta siempre y solo
se alcanza por el camino de la garantía. Tenerla en la baraja la convertía en una
de cada seis encrucijadas. Requiere solo `grainYears > 1.0`. Ofrece dos usos de un excedente
(una obra libre o una temporada de fiesta con `morale +20`), y **no planta
semillas**. Existe para que la garantía nunca falle, no para ser interesante.

---

## Anexo B · Bancos de contenido

### B.1 Nombres

Anglosajones, tomados de registros medievales ingleses. Cada banco tiene 60
entradas; aquí se listan las 24 primeras de cada uno y el módulo M-03 completa
el resto siguiendo el mismo criterio.

**Masculinos.** Aelric, Osric, Cuthbert, Godwin, Leofric, Wulfstan, Eadric,
Beorn, Alfwine, Tostig, Hereward, Sigeric, Baldwin, Oswy, Athelstan, Ceolwulf,
Dunstan, Edmund, Frithuric, Gyrth, Hakon, Ingeld, Merewald, Penda.

**Femeninos.** Mildreth, Aelfgifu, Edith, Godgifu, Hild, Leofwynn, Osgyth,
Sunngifu, Wulfrun, Cwenburh, Eadgyth, Frideswide, Aethelflaed, Beorhtgifu,
Cynethryth, Ealdgyth, Hereswith, Ingrith, Merewenna, Osburh, Saethryth,
Tathwyn, Wilburh, Ymma.

**Topónimos.** El señor feudal es **Wealdmere**. Otros: Ashford, Netherby,
Longmoor, Crowhurst, Stanbeck, Thornleigh, Fenwick, Ravensden. La aldea del
jugador no tiene nombre: es «the valley», y eso está buscado.

### B.2 Banco de textos — muestra

Estructura de `bank.en.ts`. El módulo M-09 lo completa: **toda clave usada por
el catálogo o por los eventos debe tener entre 3 y 5 variantes.**

```ts
export const BANK: Record<string, string[]> = {
  'founding': [
    'Twenty came over the ridge and stopped where the river bends. Year one.',
    'They stopped here because the water was clean and no one owned it. Year one.',
    'Nobody wrote down why they stopped. Year one.',
  ],
  'death.old': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
  ],
  'death.hunger': [
    '{name} went in the {season}. There had been no bread for eleven days.',
    'Hunger took {name}, {age} winters old.',
    '{name} gave their share to the children twice, and then did not need it.',
  ],
  'death.plague': [
    'The sickness took {name} on the fourth day.',
    '{name} was well on the Sunday and buried on the Thursday.',
    '{name}, {age} winters. The pit took eleven that week.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. {grain} bushels; the village is {people}.',
    'They got {grain} bushels out of the ground and counted them twice.',
  ],
  'harvest.abundant': [
    'The best harvest anyone could remember. {grain} bushels.',
    '{grain} bushels, and the granary would not hold it all.',
    'A fat autumn. {grain} bushels, and bread every day until Christmas.',
  ],
  'built.house': [
    'A house went up on the north side. {people} now live in the valley.',
    'They raised a roof this summer. The village is {people}.',
    'One more house, one more chimney.',
  ],
  'grudge.formed': [
    '{a} and {b} have not spoken since the {season}.',
    'Whatever was between {a} and {b}, it is not going to mend.',
    '{a} stopped going to {b}\'s door in year {year}.',
  ],
  'crossroad.taken': [
    'In year {year}, {leader} chose: {choice}.',
    'Year {year}. It was decided. {choice}.',
    '{leader} gave the word in year {year}. {choice}.',
  ],
  'consequence': [
    '{delay} years after {origin}, {what}',
    'It took {delay} years. {what}',
    'Nobody had thought about {origin} in {delay} years. {what}',
  ],
  'extinction': [
    'The last of them was {name}, {age} winters old, in year {year}.',
    '{name} was the last. Year {year}. Nobody came up the ford road after that.',
    'Year {year}. The valley kept the walls for a while and then it did not.',
  ],
};
```

### B.3 Prohibiciones en el banco

Verificadas por test (§14.1):

- Ningún signo de exclamación.
- Ninguna segunda persona (` you `, ` your `).
- Ninguna valoración de la decisión del jugador: nada de *wisely*, *foolishly*,
  *at last*, *thankfully*.
- Ninguna metáfora. La crónica cuenta lo que pasó, con nombres y cifras.

---

## Anexo C · Glosario

| Término | Significado |
|---|---|
| **Tick** | Una semana de simulación. La unidad atómica del motor. |
| **Nombrado** | Aldeano con nombre, rasgos, memoria y opiniones. Máximo 8. |
| **Encrucijada** | Decisión del jugador, generada por plantilla. Su único verbo. |
| **Semilla (consecuencia)** | Efecto diferido plantado por una opción. No confundir con la semilla del generador. |
| **Bandera (`flag`)** | Estado con caducidad que condiciona plantillas. No se muestra al jugador. |
| **Reparto (`cast`)** | Vinculación de letras (`A`, `B`) a aldeanos concretos. |
| **Reserva de obras** | 15 % de la mano de obra siempre dedicada a construir. |
| **Letargo** | Estado de la aldea mientras el jugador no está. Máximo 4 h de tiempo simulado. |
| **Severidad** | Fracción de la demanda de grano no cubierta esta semana. 0–1. |
| **Hoja de contacto** | PNG que junta las capturas automáticas de todas las estaciones y años. |

---

*Fin del documento. Toda modificación a este fichero exige actualizar la tabla
de decisiones de §1 y avisar a los módulos afectados.*
