# Rework del ritmo, la progresión y el descanso

**29 sep 2026 · revisado el 30 sep tras las cuatro integraciones.** La
especificación vigente sigue en `design.md`. Este documento separa lo que Vera
ha decidido, las hipótesis que hay que probar y las reglas todavía abiertas.
Una cifra propuesta aquí es un objetivo de experiencia, no una constante de
`balance.ts`, hasta que se mida y se apruebe en `design.md`.

## 1. Dirección y decisiones que ya mandan

La partida empieza como una experiencia activa: **los primeros diez minutos**
deben ofrecer cosas que mirar, una intervención y su consecuencia. Las
**primeras ocho a diez horas de juego** necesitan una progresión diseñada, con
contenido nuevo y variedad; después la aldea puede acompañar al jugador de
fondo, pero sigue viviendo y contando historias. Lo construido hasta hoy es
provisional para este rework.

**El reloj no se separa del mundo.** Vera ratificó el 29 sep que el paso del sol,
las horas y el calendario deben permanecer sincronizados. Se conserva la
identidad de §12.1: a ×1 una semana son siete jornadas de 120 segundos; cualquier
multiplicador afecta a los tres relojes juntos. El modo de descanso puede
cambiar qué consecuencias se procesan o cuándo se detiene el avance, pero nunca
mostrar una hora o un sol que contradiga el calendario de la partida.

**La forma de intervenir ya tiene fundamento:** `.claude/skills/senales-en-el-mapa/SKILL.md`.
La caza enseña una señal discreta sobre la presa; tocarla acepta una oportunidad
y la aldea resuelve la escena desde donde están sus habitantes. Este patrón se
ampliará con contenido distinto, no con copias de la caza. La crónica registra y
relaciona lo ocurrido; el suceso importante también debe tener expresión en el
valle mientras ocurre (`design.md` §11.6).

**Las encrucijadas actuales también son provisionales.** Vera aclaró que las
decisiones antiguas tienen que entrar en el rework. El catálogo vivo tiene 21
plantillas activas y 3 retiradas para compatibilidad de guardados
(`src/engine/crossroads/catalog/index.ts`, 29 sep). Ninguna de las 21 queda
aprobada por antigüedad: RD-0 las examina una por una y RD-1/RD-3 cambian las
que no sostengan el juego actual. Retirar una plantilla de la selección no debe
borrar su título ni invalidar una decisión pendiente en una partida guardada.

**Abierto:** velocidad normal y función de cada multiplicador; si las ocho a
diez horas son tiempo activo acumulado; activación manual o automática del
descanso; qué progresa durante él; qué oportunidades se pierden y cómo se
protegen las decisiones y crisis. Estas cuestiones se cierran antes de escribir
el contrato técnico del descanso.

## 2. Línea de base que obliga a rehacer la apertura

`npx tsx tools/reports/pace-report.ts --seeds 24 --years 20`, con política
`prudent` y el código del 29 sep, da estas medianas. Son **horas de reloj a
×1**, no años de juego:

| Peldaño | ×1 | ×16 | ×64 |
|---|---:|---:|---:|
| Una semana | 14 min | 52,5 s | 13,1 s |
| Un año | 11 h 12 min | 42 min | 10 min 30 s |
| Primer suceso del valle | 1 h 12 min | 4 min 30 s | 1 min 8 s |
| Primera encrucijada | **3 h 30 min** | **13 min 8 s** | **3 min 17 s** |
| Primera obra de piedra | 61 h | 3 h 49 min | 57 min |
| Primer asalto | 91 h | 5 h 41 min | 1 h 25 min |

En las mismas 24 semillas, el motor ofrece caza al fundar en **17/24** y antes
de la quinta semana en **24/24**. Eso no prueba que la señal entre en la cámara,
se vea entre árboles ni pueda tocarse. La herramienta de ritmo mide estado del
motor; RD-0 medirá la experiencia visible en la app. `design.md` §1b/§12.1
conserva una cifra antigua de 14 h para la primera decisión; la medición actual
y §8.6 dicen 3,5 h. Se corrige al incorporar este rework a la especificación.

El multiplicador por sí solo deja un compromiso claro: a ×64 la primera
pregunta llega pronto, pero una señal semanal dura 13 segundos y el sol completa
una jornada en menos de dos. Hay que crear contenido y consecuencias cercanas,
y después elegir una velocidad normal que permita leerlos.

El letargo actual (`design.md` §13.2) simula las semanas ausentes: una pestaña
oculta recupera a la velocidad que tenía; una apertura desde cero recupera a
×1 porque el guardado no almacena la velocidad. La pausa evita la recuperación
al volver de una pestaña oculta, pero **no queda persistida para una apertura
nueva**. El descanso exige definir ambas puertas y el resultado de una crisis
antes de sustituir la pausa.

**Referencia que aportó Vera:** [Informe del valle · madera-entregas](https://claude.ai/artifact/PF1qkhEjLPwZoqZJUQ9Ehn),
generado el 28 sep con seis semillas, 60 años y política `prudent`. Es una foto
anterior de la simulación, útil para leer secuencias; sus medianas no sustituyen
la medida de 24 semillas de arriba. En los seis valles, la **primera
encrucijada fue `one_at_the_ford`**, sobre 3,7 h a ×1, y en cinco de seis llegó
`winter_grain_debt` cerca de las diez horas. La crónica del primer valle repite
varias pérdidas de un niño y riñas durante el primer año: hay volumen de texto,
pero pocas situaciones distintas. `child_lost` se resuelve automáticamente en
esa foto; si se convierte en señal interactiva, su resolución debe pasar por la
escena y no duplicarse en la crónica.

El informe vivo `npm run eligibility` del 29 sep, ocho semillas × 60 años,
planteó 412 encrucijadas. `quiet_years` no se planteó ninguna vez (es un
**canario intencional**, no un fallo que haya que forzar) y la pareja
`raiders_coming` + `after_the_raid` sumó 157 de 412. Esta muestra no predice
una partida humana, pero obliga a medir **diversidad, repetición y reparto por
etapa**, además del número total de sucesos. Un catálogo más grande no mejora
el ritmo si la selección sigue mostrando los mismos temas.

## 3. Objetivos de experiencia por tramo

Se medirán en **tiempo real activo a la velocidad normal que se elija**, y se
recalcularán si esa velocidad cambia. Los límites de esta tabla son objetivos
para un prototipo y una prueba humana, no tasas que el motor deba forzar cada
semana.

| Tramo | Qué debe vivir el jugador | Prueba de que funciona |
|---|---|---|
| 0–10 min · fundación | Ve una ocasión real en el mapa, interviene, sigue a alguien y ve el resultado. Llega una primera elección con coste y efecto reconocible. | En varias semillas, alguien que no conoce el juego sabe qué hizo y qué cambió antes del minuto diez. Objetivo inicial: primera encrucijada o decisión equivalente **antes de diez minutos**. |
| 10–60 min · caserío | Aparecen al menos dos clases distintas de ocasiones, la pareja deja de estar sola y una consecuencia de una elección anterior regresa. | La sesión tiene variación entre semillas; no la sostiene la misma huella o el mismo aviso repetido. |
| 1–3 h · aldea naciente | El jugador da un medio o renuncia a él con un motivo, observa el beneficio y encuentra su coste. Empiezan relaciones y episodios encadenados. | Puede explicar una cadena propia: «di X, la aldea hizo Y, ocurrió Z». |
| 3–6 h · transformación | Obras y piedra alteran la silueta del valle; una amenaza exterior da sentido a lo acumulado. | La imagen del valle y las opciones del jugador son materialmente distintas a las de la primera hora. A ×16 la piedra y el primer asalto ya caen aproximadamente en este tramo; hay que comprobar su lectura real. |
| 6–10 h · presión y preparación | Las decisiones, los medios y las relaciones pasadas afectan a la defensa y al siguiente objetivo de crecimiento. | Hay razones visibles para continuar hacia la villa cerrada y partidas con historias diferentes, sin depender de una lista de tareas genéricas. |
| Después · compañía | La aldea mantiene rutinas legibles, oportunidades opcionales y arcos a largo plazo; volver tiene contexto. | Una ausencia se resume con claridad y no resuelve una decisión importante en nombre del jugador. |

La primera encrucijada actual es demasiado tardía para la apertura. RD-1
preparará contenido de fundación y medirá su primera ranura legal: §8.6 advierte
que mover el suelo de 16 semanas cambia qué plantillas son alcanzables. No se
adelanta sin más una crisis escrita para una aldea madura. La apertura necesita
una elección propia de la fundación; las posteriores se revisan para conservar
su rareza y su peso cuando realmente correspondan.

**Ensayo de apertura, pendiente de RD-0 y de elegir velocidad normal:**

| Momento real | Secuencia de prueba | Lo que debe quedar claro |
|---|---|---|
| 0–2 min | Fundación legible y primera oportunidad localizable en el valle. | Quién vive aquí y dónde intervenir. |
| 2–5 min | Una acción de un toque desencadena una escena con resultado cercano. | Lo que decidió el jugador cambió algo observable. |
| 5–10 min | Una decisión de fundación con alternativas reales y un coste comprensible. | La siguiente meta nace de esa elección, no de una lista de tareas. |

Si ×16 resultara ser la velocidad normal, diez minutos representan unas once
semanas del juego. La ranura actual de la primera encrucijada llega después;
RD-1 deberá diseñar una situación legítima de fundación y su elegibilidad,
además de moverla. No se fijará a ×16 únicamente porque cuadre esta tabla: RD-0
también juzga si sus personas, señales y luz se pueden leer.

## 4. Bucles y recompensas que el contenido debe conectar

El ritmo buscado es **intenso al descubrir la aldea y respirable al acompañarla**.
Más contenido no significa una ventana urgente cada minuto. Cada tipo de
contenido tiene una función:

| Pieza | Función de diseño | Forma de comprobarla |
|---|---|---|
| Señal del mapa | Oportunidad breve y espacial, aceptada con un toque; la aldea actúa. | Se reconoce dónde ocurre y puede verse la respuesta. |
| Tablón y expediciones | Objeto permanente del mapa: el jugador elige una misión, ve salir a personas concretas y espera su retorno. | Se entiende quién falta, qué se arriesga y qué cambió al volver; no se presenta como señal efímera. |
| Suceso | El mundo toma la iniciativa; cambia estado, imagen y crónica. | La crónica explica algo que también se ha podido percibir. |
| Encrucijada | Elección deliberada entre consecuencias distintas y duraderas. | Opciones veraces, coste inteligible y retorno visible. |
| Objetivo de aldea | Proyecto de crecimiento que nace del estado y de elecciones previas. | El jugador sabe qué persigue y ve acercarse el hito. |
| Descanso y regreso | Permite ausentarse sin perder el hilo ni una respuesta crucial. | El parte de regreso distingue hechos, pendientes y próximos pasos. |

| Horizonte | Acción y respuesta | Recompensa para el jugador | Riesgo a vigilar |
|---|---|---|---|
| Segundos | Trabajo, transporte, clima y encuentros se leen en los cuerpos y en el mapa. | Ver una causa y su efecto sin abrir una hoja. | Animación abundante que no comunica ningún cambio. |
| Minutos | Señal localizada → un toque → alguien actúa → uno de varios resultados. | Oportunidad, escena propia y cambio en personas o existencias. | Repetir el mismo toque hasta volverlo automático. |
| Decenas de minutos | Dar un medio, comerciar o responder una encrucijada; aparece su precio y su consecuencia. | Una nueva capacidad, un problema propio y una aldea diferente. | Resultado que tarda horas en notarse o sólo vive en la crónica. |
| Horas | Cadenas de personas, construcción, fases y defensa. | Transformación visible y relato de ese valle. | Mesetas largas sin un objetivo comprensible. |
| Regreso | Parte de lo vivido y estado actual. | Entender qué ha cambiado y qué reclama atención. | Premios gratuitos por abrir y cerrar o un final ocurrido sin posibilidad de respuesta. |

Una nueva señal debe tener **una razón para tocarla, un coste o riesgo y varios
resultados**. La caza cubre el primer tipo. Candidatas para el primer lote:
una visita del camino con trato concreto y una búsqueda de alguien perdido.
Fuego, riada y asedio requieren antes la regla de descanso y de atención: no se
deja la supervivencia de la aldea escondida tras un icono que expira durante la
noche. La selección de señales tendrá un presupuesto visible y diversidad, no
una frecuencia independiente por cada contenido añadido.

El tablón de la plaza y sus cinco expediciones ya existen (`design.md` §7.15).
RD-0 medirá cuándo se desbloquea y si el jugador lo descubre, especialmente
porque la pareja fundadora no puede enviar a nadie: deben quedar dos adultos en
casa y el líder no sale. RD-1 no debe prometer una expedición en los primeros
diez minutos ni duplicar el tablón con otra señal. RD-5 puede usar la salida,
ausencia y vuelta como cadena de objetivos cuando la población la permita.

La recompensa se apoya primero en **escena, consecuencia, nueva posibilidad y
memoria**. No se añade una moneda de puntos por abrir la app. Si más adelante
hace falta un sistema explícito de metas, se diseña contra los hitos de la
aldea y se comprueba que el jugador puede reconocerlos en el mundo.

### Revisión obligatoria de las encrucijadas existentes

Esta es la lista activa del 29 sep, tomada del catálogo del motor. La auditoría
de RD-0 producirá una fila **por ID**, con: etapa prevista y primera elegibilidad
real; frecuencia por semillas; situación y opciones frente al estado actual del
mundo; coste anunciado y efecto ejecutado; consecuencia inmediata, diferida y
visible; vínculo con personas, señales, crónica y meta; decisión
**conservar / reescribir / sustituir / retirar**, con motivo. Un texto antiguo
que aún tenga sentido puede conservarse sólo tras pasar esa revisión.

| Bloque | IDs activos que no se pueden omitir | Foco de la revisión |
|---|---|---|
| Señor | `winter_grain_debt`, `tithe_demand` | Presión exterior, grano real y momento de aparición. |
| Hambre | `hungry_spring`, `granary_theft` | Subsistencia de la pareja inicial, autoría y huella en el granero. |
| Peste | `plague_pit`, `plague_blame` | Gravedad proporcionada a la etapa, personajes y efecto visible. |
| Riña | `smith_feud`, `feud_inherited` | Continuidad generacional y gente que existe en el valle. |
| Fe | `chapel_or_granary`, `relic_pedlar` | Edificios y medios disponibles; que el trato no duplique el camino. |
| Bosque | `forest_cut`, `wolf_winter` | Árboles, lobos y riesgo observables en el mapa. |
| Forasteros | `strangers_at_the_ford`, `bandits` | Llegada física, relaciones y defensa vigente. |
| Caserío | `breaking_ground`, `one_at_the_ford` | Fundación temprana sin imponer una crisis de aldea madura. |
| Asalto | `raiders_coming`, `after_the_raid` | Preparación, batalla física y consecuencias coherentes con su resultado. |
| Sucesión | `succession` | Liderazgo, edad y disponibilidad real de candidatos. |
| Reserva | `first_stone`, `quiet_years` | Progresión de obras y periodos tranquilos con elección significativa. |

La auditoría también leerá las **tres plantillas retiradas de comercio** sólo
para comprobar la compatibilidad de guardados. El informe histórico
`medidas/catalogo-historias-y-encrucijadas.md` es una foto del 17 sep y no se
usará como inventario actual; `npm run eligibility` y el catálogo fuente son la
referencia. Antes de publicar cada reescritura se verificará que todas sus
opciones cumplen el principio de `CLAUDE.md`: cambian algo en pantalla. La
promesa del texto debe coincidir con los efectos reales y con las semillas que
se disparen después (`design.md` §8.1).

## 5. El descanso: contrato de producto antes que implementación

**Hipótesis para probar, aún no aprobada:** «dormir la aldea» deja avanzar
actividad cotidiana y algunos recursos a una velocidad común para sol y
calendario, pero una decisión o un peligro que pueda cambiar irreversiblemente
la partida reclama atención antes de resolverse. Al despertar se enseña qué
ocurrió y se continúa desde un estado coherente. Las oportunidades menores
pueden pasar de largo según la regla que se acuerde; ninguna derrota nace sólo
de no haber mirado una señal discreta.

| Categoría | Pregunta que debe cerrarse | Puerta de aceptación |
|---|---|---|
| Reloj y sol | ¿Siguen avanzando juntos durante el descanso o se detienen juntos? ¿A qué multiplicador? | Fecha, hora y luz nunca discrepan, incluida una reapertura. |
| Economía y población | ¿Qué trabajo, consumo, crecimiento y muerte ordinaria continúan? | Dormir no regala recursos ni permite esquivar sistemáticamente costes. |
| Señales del mapa | ¿Cuáles caducan, cuáles esperan y qué se cuenta al volver? | No se promete en el parte una escena que nadie pudo ver o tocar. |
| Encrucijadas y crisis | ¿Se detiene todo al surgir una, se guarda pendiente o existe resolución de resguardo? | Ninguna elección se contesta en nombre del jugador; no aparece un final irreversible mientras duerme. |
| Ataques físicos | ¿En qué punto se detiene un asalto si falta el jugador? | El parte, la batalla y el guardado no dan resultados distintos por la puerta de regreso. |
| Persistencia | ¿Se activa a mano, al ocultar la app o por las dos vías? ¿Qué pasa al cerrar y reabrir? | La misma ausencia da el mismo resultado por pestaña oculta y por apertura nueva. |
| Expediciones en curso | ¿Avanza el plazo, se resuelve el retorno o queda pendiente mientras duerme la aldea? | Nadie vuelve, muere o cobra dos veces al alternar descanso, guardado y reanudación. |

Hay dos arquitecturas a comparar en RD-2. **A:** simular el tick normal y
detener el avance completo ante el primer hecho que necesita atención; conserva
el orden de §4.2 y puede producir poco progreso si la alarma llega pronto.
**B:** tick de descanso con pasos permitidos y hechos pendientes; da más rutina,
pero modifica el contrato normativo del motor y necesita reglas contra la
producción gratuita y la divergencia del guardado. La elección se hará con una
simulación corta de varias semillas y una noche de ausencia, no con una cifra
inventada. En ambos casos el sol y la fecha avanzan o se detienen **juntos**.

## 6. Orden de trabajo y prioridades

| Ronda | Prioridad | Objetivo y entrega | Depende de / criterio de cierre |
|---|---|---|---|
| **RD-0 · Apertura visible y auditoría del catálogo** | P0 | Traza de los primeros diez minutos y la primera hora: qué entra en cámara, cuándo se puede tocar, cuánto tarda el resultado y cuándo llega una elección. Comparación ×1/×16/×64 en móvil, incluida la caza física, el sol, el sonido y el tablón. Matriz de las 21 encrucijadas según §4; diversidad y repetición de sucesos. | Antes de mover balance o escribir contenido. El informe distingue «el motor lo ofreció» de «el jugador lo vio», recomienda una velocidad normal provisional sólo si cumple la sincronía solar e identifica qué decisiones están desfasadas. |
| **RD-1 · Fundación y primeras decisiones** | P0 | Una apertura de punta a punta: ocasión visible, intervención, resultado, primera elección propia de la fundación con coste y una consecuencia cercana. Reescribir o sustituir las decisiones tempranas obsoletas; brief de contenido y archivos cerrado antes de programar. | Primeros diez minutos jugables en varias semillas; lectura humana en móvil. Si sólo mejora una semilla, no pasa. |
| **RD-2 · Contrato y prototipo de descanso** | P0 | Cerrar las siete categorías de §5, comparar A/B y probar ausencia con pestaña oculta y app cerrada, incluidas expediciones y audio. | Sol/reloj coherentes; ni final desatendido ni ganancia gratuita; guardado reproducible; GV-4 resuelto para validar el regreso en villa. |
| **RD-3 · Rework del resto de encrucijadas** | P0 | Ejecutar el dictamen de RD-0 para las decisiones restantes: textos, costes, elegibilidad, efectos visibles y consecuencias diferidas. Conservar compatibilidad de las retiradas. | Las 21 tienen dictamen y ninguna obsoleta sigue activa; opciones veraces y con efecto visible; cobertura de etapas sin repetir una misma pregunta. |
| **RD-4 · Catálogo de señales y recompensa** | P1 | Dos tipos nuevos y distintos de ocasión, selección común, costes, resultados y conexión con personas, recursos y crónica. | Tres desenlaces legibles donde corresponda, sin iconos simultáneos ni repetición que tape los otros tipos. |
| **RD-5 · Arco de las primeras 8–10 h** | P1 | Completar tramos de §3 con cadenas de consecuencias, acceso a medios, desarrollo de personajes y preparación de la defensa. | Jornadas con varias semillas y recorrido humano: sin mesetas largas ni biografías idénticas. |
| **RD-6 · Balance y cierre de especificación** | P2 | Ajustar velocidades, cadencias y coste de recompensas a la experiencia medida; promover reglas aprobadas a `design.md` y `balance.ts`. | Comparación antes/después, suite rápida y jornadas según `CLAUDE.md`, captura móvil y discrepancias documentales corregidas. |

Las cuatro integraciones del 29–30 sep están ya en `main`: animación integral,
modelos 3D, gráficos remasterizados y sonido. No cambian la duración del tick ni
el suelo de la primera encrucijada. **Sí cambian la experiencia que hay que
medir**; la tabla de §2 es una base del motor fechada el 29 sep, no una prueba
de los minutos que tarda hoy un jugador en ver y resolver una escena.

| Integración | Efecto para este plan | Ajuste de la siguiente ronda |
|---|---|---|
| Animación integral y caza física (AN-0–AN-5) | La caza necesita contacto y lectura de la escena; al aceptarla, la app baja temporalmente a ×1 y luego restaura la velocidad elegida. El resultado físico no lo predice `pace-report`. El oso permanece visible más tiempo. | RD-0 cronometra oferta → toque → golpe → consecuencia en móvil, por especie y arma, y anota la velocidad antes, durante y después. RD-1 no cuenta sólo el tick que ofreció la caza como «intervención completada». |
| Modelos 3D mejorados | Cambian tamaño, silueta y colisionadores de animales; AN-5 ya adaptó sus cuerpos físicos a esos modelos. | RD-0 juzga visibilidad y tactilidad con los modelos integrados; evita rescatar cifras visuales anteriores. |
| Gráficos remasterizados | Mejoran la lectura del valle; no fijan velocidad normal ni resuelven la sincronía solar. La ronda GV detectó el bucle de la villa GV-4, que ya existía antes de GV: un fotograma lento se interpreta como ausencia y reconstruye la vida una y otra vez. | Separar GV-4 de este rework, pero exigir su cierre antes de validar regreso del descanso o ritmo tardío en móvil. No atribuirle a la nueva piel un defecto anterior. |
| Sonido | Hay sonidos de interfaz y ambientes de naturaleza/día/noche; aldea, hoguera y fiesta fueron rechazados y retirados. Faltan golpes de caza, oso y combate. La pestaña oculta suspende el audio. | RD-0 anota qué información llega por sonido y qué queda muda; RD-1 no usa un efecto ausente como señal de éxito. RD-2 prueba silencio y reanudación al dormir/despertar. |

**Bloqueo de coherencia ya presente en `main`:** `src/render3d/effects/daylight.ts`
mezcla el sol y la luz de la hora real con una media mañana fija: 55 % a ×16 y
95 % a ×64 (`LIGHT_STEADY`). Esto contradice la decisión de Vera de que el sol
acompañe siempre al reloj y al calendario, aunque la simulación sí avance
junta. Corregir ese aplanado, conservando una lectura visual cómoda, es un
requisito previo para recomendar ×16 o ×64 como velocidad habitual. RD-0 debe
mostrar el desacople en una captura continua; RD-6 no puede aprobar una
velocidad normal que lo mantenga.

**Riesgo independiente para RD-2:** `docs/medidas/bucle-villa-2026-09-29.md`
documenta GV-4: la detección de ausencia por un hueco entre fotogramas superior
a un segundo puede tratar un render lento como pestaña oculta. El descanso debe
basarse en el estado real de visibilidad y persistencia, con prueba de que un
fotograma lento no activa el regreso ni congela la vida. El informe de fusión
de cuatro ramas detectó además falta de una medición conjunta en móvil; RD-0
hará esa medición sobre `main` ya integrado, sin dar por actuales los errores
de audio que la integración posterior corrigió.

RD-0 y el diseño de RD-1/RD-2 pueden prepararse sin tocar archivos de estas
rondas; cada implementación delimitará propiedad antes de empezar.
La cadena de la madera I1 ofrece un caso útil para RD-0: comprobar si seguir
porteador → leñera → obra mantiene el interés, como pide `plan-meta.md` §I.

### Siguiente brief: RD-0 · medir y auditar antes de cambiar el contenido

**Objetivo.** Convertir la apertura actual en una cronología de cosas vistas,
tocadas y comprendidas, no sólo de ticks del motor, y emitir el dictamen de
contenido de cada una de las 21 encrucijadas activas.

**Depende de.** `CLAUDE.md`; `design.md` §1–4, §7.15, §8.6, §11.6,
§11.10–11.11, §12.1 y §13.2;
`.claude/skills/senales-en-el-mapa/SKILL.md`; `tools/README.md`; el catálogo
`src/engine/crossroads/catalog/`, banco de textos y este plan.

**Ficheros.** RD-0 lee motor, UI, render y catálogo sin cambiarlos. Su informe
nuevo vive en `docs/medidas/` y los artefactos temporales en `artifacts/`. Si hace falta
instrumentación reutilizable, se redacta un brief separado con contrato, ruta
en `tools/README.md` y archivos exactos.

**Evidencia.** Varias semillas para los peldaños del motor; recorridos visuales
acotados a 390×844 y 320×568 en tres valles con apertura distinta; anotar
visibilidad real de cada señal y del tablón, cambio de cámara, acción, desenlace, hito y
primera encrucijada. Un recorrido de diez minutos se observa como secuencia,
no como captura única. Comparar ×1, ×16 y ×64 sin modificar el tiempo de §12.1;
distinguir tiempo de simulación y tiempo real de caza a ×1, y registrar
sol/reloj/audio en cada caso.
Contar por separado escenas nuevas y repeticiones en diez minutos, una hora y
el tramo de ocho a diez horas; el total de líneas de crónica no es la métrica.
Para el catálogo, ejecutar `npm run eligibility`, revisar código y textos de los
21 IDs y registrar cada columna de la matriz pedida en §4. Los tres retirados
se comprueban por separado para guardados; no se les asigna una nueva cadencia.

**Falsaría la hipótesis de ×16** que el sol discrepe del reloj, que la luz o
la gente sean ilegibles, que la mayoría de señales caduquen fuera de cámara
o que el jugador llegue al minuto
diez sin comprender un efecto suyo. **Terminado cuando** la tabla de §3 puede
marcarse con evidencia o con huecos precisos, la matriz cubre 21/21 decisiones
con dictamen y RD-1 tiene una primera intervención y una primera elección
identificadas para diseñar.
