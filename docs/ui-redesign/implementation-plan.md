# The Valley — diseño de interfaz y plan de ejecución para agentes

**Propuesta v1.0 · 15 de septiembre de 2026 · Europe/Madrid.**
**Base inspeccionada: `d2b85b7`. Estado: documentado, sin implementación.**

## 0. Autoridad y uso

Este documento desarrolla la dirección aceptada: Living Valley como estructura,
Chronicle First para leer y decidir, People of the Valley para acercarse a una
persona. La referencia visual es [la propuesta original](ui-redesign-proposal.md)
y sus [tres imágenes](ui-prototypes/01-living-valley.png).

Es un plan de cambio, no una segunda copia de la normativa vigente. Las reglas
del juego siguen en `docs/design.md`; el rework sigue en `docs/historico/rework.md`.
Antes de ejecutar UI-R1, el coordinador debe integrar en el capítulo 11 del
documento maestro las decisiones de esta propuesta, actualizar su registro y
resolver las discrepancias de UI-R0. Los briefs de este fichero describen cómo
ejecutar esa revisión. Un desacuerdo nuevo se devuelve al coordinador: no se
resuelve modificando el motor desde un módulo de interfaz.

La petición que origina esta revisión autoriza **solo documentación**. Ninguna
fase de implementación se ha iniciado ni se considera entregada por estar aquí.

Lecturas comunes para ejecutar: `CLAUDE.md`, `design.md` §1–4, §11 y §13,
`docs/agents.md`, este documento §0–6 y el brief asignado. No hace falta leer
todos los anexos de render ni todos los briefs de otros módulos.

## 1. Resultado esperado y límites

El jugador debe poder observar, consultar la crónica, consultar una persona,
cambiar órdenes y contestar una encrucijada manteniendo una relación visual con
el valle. Todos los valores proceden de la partida que se está jugando.

| Decisión | Resultado | Motivo |
|---|---|---|
| Mundo permanente | Se conserva el canvas y su cámara al navegar | Consultar una ficha no reinicia el lugar que se estaba mirando |
| Una bandeja principal | Crónica, Personas, ficha y órdenes comparten contenedor | Evita paneles independientes solapados |
| Cuatro indicadores | Gente, semanas de comida, leña y ánimo | Son los datos reales de `vitalsOf`; no existe inventario de oro o piedra |
| Reloj existente | Hora del sol y fecha actual | Evita volver a desacoplar el reloj del paisaje |
| Navegación explícita | Valley, Chronicle y People; cierre visible | Conserva la corrección de U-14: siempre se entiende cómo salir |
| Órdenes y tiempo juntos | Un acceso a una bandeja con ambos grupos | Son los controles de intervención permanente |
| Ficha sin retrato nuevo | Nombre, datos y seguimiento del cuerpo existente | Los retratos generados no tienen sistema de producción aprobado |
| Lectura estable | El texto no se recoloca mientras se está leyendo | La simulación continúa y puede añadir entradas |
| Entrega incremental | Cada integración deja una aplicación utilizable | Permite evaluar sobre el juego y localizar regresiones |

Quedan fuera de esta entrega: modificar balance, cadencia de sucesos, IA,
economía, modelos 3D, terreno, retratos, guardados, nuevos rasgos o relaciones.
Tampoco se crean enlaces causales de crónica a partir de coincidencias de nombres:
el dato tiene que contener una referencia comprobable. La pantalla de inicio,
el epitafio y el parte de bienvenida conservan sus funciones; se verifica su
compatibilidad con el nuevo contenedor.

## 2. Composición y comportamiento

### 2.1 Valle en reposo

De arriba abajo: cabecera con hora/fecha; tira de cuatro indicadores con nombre,
valor y tendencia; paisaje; bandeja compacta con una frase de actividad y acceso
a órdenes/tiempo; navegación inferior. La velocidad actual se lee sin abrir
la bandeja. El aviso de decisión pendiente se sitúa en ella, sin colisionar con
la cabecera. Las tendencias conservan el cálculo y horizonte de `trendsOf`.

La frase procede de `doingNow` y de los sistemas existentes de respuesta/aviso.
No se añade un segundo planificador de noticias. UI-R0 debe identificar qué
mensaje controla cada sistema antes de recolocarlo. Una noticia puede ocupar
temporalmente la frase; no puede borrar el acceso a una decisión pendiente.

Una obra activa se expresa con la información ya disponible. No mostrar fecha
de terminación, porcentaje o causalidad que la función existente no calcule.

### 2.2 Bandeja principal

Tiene estado compacto o expandido. Al abrir Crónica, Personas u Órdenes se
expande y sustituye el contenido anterior. La navegación permanece visible.
Volver a Valley o cerrar devuelve el estado compacto. Tocar la pestaña activa
no reinicia su desplazamiento. Las fichas de edificio y terreno usan la misma
bandeja y `panelFor`.

Hay un único propietario del estado de navegación, en `app.ts`. Los componentes
emiten intenciones; no abren pantallas por su cuenta ni añaden scrims a `body`.
Los adaptadores heredados se retiran al integrar su módulo, no antes.

La zona visible de paisaje permite mirar y seleccionar. Un gesto iniciado en
la bandeja no llega al canvas. El cierre por deslizamiento es complementario:
solo se reconoce desde el asa/cabecera; desplazar una lista hacia abajo no cierra
la pantalla. Se conservan los gestos de cámara de la aplicación actual.

### 2.3 Órdenes y tiempo

Primero las tres órdenes: siembra (`fields`), manos al bosque (`timber`) y
prioridad de obra (`priority`); después velocidad y pausa. Se usan exactamente
`INTENT_STOPS`, `PRIORITY_STOPS`, `stopOf`, `TIME.SPEEDS` y `speedLabel`.
No reconstruir sus opciones con literales ni redondear el estado al abrir.

La selección cambia a través del adaptador de `app.ts`, que conserva la
semántica y persistencia actuales. Abrir o cerrar la bandeja no cambia ninguna
orden ni la velocidad. Pausa es una selección visible. La explicación de que
la aldea no puede obedecer sigue procediendo de `answerFor`.

### 2.4 Crónica

Papel opaco dentro de la bandeja; texto oscuro; año y entradas en orden actual.
Se conservan el selector de valles archivados y el renderizado editorial
existente. Una entrada nueva no roba el desplazamiento: se ofrece una acción
del banco de textos para volver a lo más reciente. Al cambiar de valle se
reinicia la lectura al comienzo de esa fuente; nunca se mezclan sus entradas.

La crónica abierta desde el epitafio conserva su retorno al epitafio. Ese caso
es un modo de lectura de fin de partida y puede ocupar toda la pantalla.
No se permite fundar otra aldea como efecto secundario de cerrar la crónica.

La propuesta inicial de «consecuencias enlazadas» se limita en esta entrega al
texto real existente. Un enlace persona/lugar solo se habilita si UI-R0 demuestra
que hay un identificador estable disponible y el coordinador añade su contrato.
No se analizan frases renderizadas para extraer supuestas identidades.

### 2.5 Personas y fichas

La lista mantiene el alcance existente: personas nombradas y presentes, en su
orden actual. La cifra global de población puede ser mayor; la etiqueta de la
lista debe dejar claro su alcance. Seleccionar abre una ficha dentro de la
bandeja, con una acción explícita para volver a la lista.

La ficha reutiliza `panelFor`: nombre, edad, rasgos, recuerdos y opiniones que
ya expone. No convierte una opinión unilateral en una relación recíproca.
No inventa actividad instantánea a partir del oficio. La actividad global del
valle no es la actividad de una persona.

«Seguir» llama a `backend.live.track(id)` mediante `app.ts`; «Dejar de seguir»
llama con `null`. No se prescribe un nuevo movimiento de cámara ni se promete
un centrado que el backend no soporte. UI-R0 verifica visualmente qué hace
`track`. No debe afirmarse que el cuerpo está enfocado si solo queda marcado.
Cerrar la ficha termina el seguimiento iniciado desde ella.

Si muere o se marcha mientras está abierta, se actualiza la información,
se cancela el seguimiento y se conserva la salida. Si desaparece la referencia,
se usa el estado vacío de `panelFor`. Un cambio de selección no modifica el RNG.

### 2.6 Encrucijadas y prioridades

La encrucijada tiene prioridad sobre la bandeja normal. Conserva título,
contexto, verbo y precio por opción. El precio está junto al verbo, sin tooltip,
segundo toque ni recorte. Si hay demasiadas opciones, se desplaza el contenido.

Se propone un botón visible «volver al valle» además del gesto actual. Cerrar
aplaza la lectura y conserva la decisión pendiente. Reabrir presenta la misma
encrucijada. Este cambio frente a §11.2 se sincroniza expresamente en UI-R0.

La elección pasa por `App.decide(optionId)` y respeta `attemptDecision`: un
doble toque no encola dos decisiones; en pausa, aceptar no fuerza el tick.
No presentar consecuencias como aplicadas hasta que se hayan resuelto.
Tras contestar o aplazar se vuelve a Valley; no se restaura automáticamente una
bandeja que pueda ocultar la consecuencia visual.

| Suceso | Navegación resultante | Estado del juego |
|---|---|---|
| Abrir consulta | Bandeja correspondiente | Sin cambio |
| Cambiar consulta | Sustituye bandeja | Sin cambio |
| Cerrar consulta | Valley compacto | Sin cambio |
| Encrucijada se presenta por flujo actual | Decisión delante; consultas suspendidas | No alterar velocidad automáticamente |
| Aplazar decisión | Valley y acceso a pendiente | Sigue pendiente |
| Respuesta aceptada | Valley; esperar resolución si está en pausa | Contrato actual de `decide` |
| Extinción | Epitafio, cerrar consultas y seguimiento | Flujo existente de final de partida |
| Volver de pestaña oculta | Revalidar selección y contenido | Letargo existente, una sola ejecución |

## 3. Sistema visual y adaptación

Los siguientes valores son **punto de partida de maquetación**, no mediciones
de rendimiento ni constantes de balance. UI-R1 los concentra en
`src/ui/redesign/tokens.css`; los agentes de módulos no crean variantes locales.
El coordinador puede corregirlos tras las capturas y registra aquí el motivo.

| Token o regla | Valor inicial |
|---|---|
| Fondo papel / texto | `#f2e9d8` / `#221d18` |
| Superficie oscura / texto | `#1a1511` / `#f2e9d8` |
| Acento sobre papel / sobre oscuro | `#7d5c2e` / `#c9ab6b` |
| Tipografía narrativa | Pila serif local actual, sin descarga de fuentes |
| Controles y cifras | Pila sans local actual; cifras tabulares |
| Texto de lectura / controles | 16 px con interlínea 1,5 / 14 px con interlínea 1,4 |
| Título de bandeja | 22 px con interlínea 1,2 |
| Espaciado | Escala 4, 8, 12, 16, 24 px |
| Área interactiva mínima | 44 × 44 px, también iconos de cierre |
| Margen lateral móvil | 12 px más área segura cuando corresponda |
| Radio de bandeja / control | 16 px / 8 px |
| Animación inicial | Apertura y cierre inmediatos; sin dependencia de transición |

Móvil vertical: canvas a viewport completo; cabecera en área segura superior;
navegación en área segura inferior. Bandeja expandida de hasta 60 % de la altura
útil. Cabecera y navegación quedan fuera del scroll; el cuerpo tiene scroll
propio. En 390 × 844, reposo debe reservar al menos la mitad de la altura útil
como paisaje sin paneles. Se mide en captura; no se afirma aún que se cumpla.

En anchuras de al menos 900 px, la bandeja expandida pasa a un lateral de
360 px; la navegación conserva las mismas acciones. En pantallas de altura
útil inferior a 600 px o con texto ampliado que no quepa, la lectura puede
ocupar toda el área disponible. La accesibilidad prevalece sobre el porcentaje
de paisaje. Usar viewport dinámico con respaldo y `env(safe-area-inset-*)`.

No reducir la fuente para encajar cifras largas. Permitir salto de línea y
crecimiento de cabecera; no abreviar semanas o nombres sin etiqueta accesible.
El contraste se evalúa sobre superficies opacas con valores calculados, además
de capturas con nieve, noche y tormenta. Objetivo de proyecto: 4,5:1 en texto
normal; 3:1 en contornos funcionales y foco. No usar latón claro como texto sobre
papel si no alcanza el objetivo. Icono y texto acompañan todo dato por color.

Tabulación lógica, foco visible y salida por Escape. La bandeja normal es una
región etiquetada, no un modal que atrape el foco. La decisión y el epitafio sí
gestionan foco modal y deshabilitan la interacción del fondo. Al cerrar se
devuelve el foco al control que abrió; si ya no existe, a Valley. Los mensajes
nuevos usan anuncio discreto; reloj y cifras no se anuncian cada frame.
`prefers-reduced-motion` conserva todas las acciones sin exigir animación.

## 4. Contratos de integración propuestos

Estos contratos son **nuevos**, no APIs ya presentes. UI-R1 los materializa en
`src/ui/redesign/contracts.ts`; no cambiar las firmas durante una rama paralela.
Los imports de dominio se toman de `@engine/state`, y `Speed` de `../speed`.

```ts
export type SheetRoute =
  | { kind: 'valley' }
  | { kind: 'chronicle' }
  | { kind: 'people' }
  | { kind: 'inspect'; target: InspectTarget; from: 'valley' | 'people' }
  | { kind: 'orders' };

export interface UiActions {
  navigate(route: SheetRoute): void;
  setSpeed(speed: Speed): void;
  setIntent(intent: Intent): void;
  track(id: number | null): void;
}

export interface UiSnapshot {
  state: Readonly<GameState>;
  archive: readonly ArchivedGame[];
  speed: Speed;
}

export interface UiPanel {
  element: HTMLElement;
  update(snapshot: UiSnapshot): void;
  dispose(): void;
}

export type PanelFactory = (actions: UiActions) => UiPanel;

export interface ShellHandle {
  element: HTMLElement;
  content: HTMLElement;
  setRoute(route: SheetRoute): void;
  dispose(): void;
}
```

`InspectTarget` se importa desde `../inspect`; no se redefine. Las factories
de órdenes, crónica y lista de personas usan `PanelFactory`. La ficha tiene
firma `createInspectPanel(actions: UiActions, target: InspectTarget): UiPanel`.
El coordinador añade el retorno a lista al componer su cabecera, según `from`.

El shell expone `element`, `content: HTMLElement`, `setRoute(route: SheetRoute)`
y `dispose()`. Se crea con `createShell(actions: UiActions): ShellHandle`.
`app.ts` inserta como máximo un `UiPanel` en `content`, llama a `dispose` al
sustituirlo y nunca elimina el canvas por cambiar de ruta.

`update` no escribe en el snapshot, no registra listeners adicionales ni mueve
el scroll por defecto. `dispose` libera listeners/observadores propios y es
seguro si se llama dos veces. Las acciones invocan el código de aplicación
existente; una panel no llama a `tick`, no serializa y no consume azar.
`setIntent` recibe una copia completa de la intención con las opciones vigentes;
`app.ts` valida y aplica el cambio en el mismo punto que los controles actuales.

Actualizar paneles al cambiar el tick, una orden, velocidad, fuente o selección;
actualizar la hora con el flujo visual existente. No recrear todo el DOM a cada
frame. La crónica conserva fuente seleccionada y posición durante actualizaciones.

Los módulos reciben texto por `renderUiText`, `renderEntry`, `renderChronicleYear`
y `panelFor`. Cada agente entrega un listado de claves faltantes y su propuesta
en inglés. Solo el integrador edita `UI_BANK` en
`src/engine/chronicle/bank.en.ts`; no modifica las plantillas narrativas ni el motor.

## 5. Organización, dependencias y propiedad

El coordinador diseña y audita; los agentes implementan briefs cerrados. Aplicar
los carriles de `docs/agents.md`: `construir` para código/pruebas, `medir` para
recoger evidencia. Los nombres de modelos de ese documento pertenecen a su
entorno; no presuponer su disponibilidad en otro ejecutor. El coordinador asigna
un modelo disponible apto sin cambiar las responsabilidades del carril.

Secuencia: **UI-R0 → UI-R1 → UI-R2 → (UI-R3 y UI-R4) → UI-R5 → UI-R6**.
Solo UI-R3 y UI-R4 pueden ejecutarse en paralelo, en worktrees distintos nacidos
del mismo commit que contenga UI-R2 y el contrato congelado. Esta propuesta no
ordena lanzar agentes durante la tarea documental actual.

Un único integrador posee `app.ts`, `index.html`, `contracts.ts`, `tokens.css`,
`icons.ts`, `UI_BANK` y documentación normativa. Las ramas de módulos no los
tocan. Se prohíbe editar configuraciones de pruebas, dependencias o exclusiones
para hacer pasar verificaciones. Necesitar otro fichero es un hallazgo que se
devuelve con motivo y cambio propuesto.

Cada módulo entrega informe en `docs/ui-redesign/rounds/UI-Rn.md`: ancla, ficheros,
decisiones, verificaciones con salida real, capturas, diferencias conocidas y
pendientes. Antes de integrar, leer el diff completo y verificar el ancla como
exige `docs/agents.md`. No mezclar el trabajo de arte o de vida del valle.

## 6. Briefs ejecutables

### UI-R0 — Cerrar normativa y fotografiar la base (coordinador)

**Objetivo:** dejar un punto de partida inequívoco.
**Depende de:** autorización posterior de implementación.
**Ficheros:** `docs/design.md`, `docs/changelog.md`, este documento,
`docs/ui-redesign/rounds/UI-R0.md`; capturas en `artifacts/ui-redesign/UI-R0/`.
**Contrato:** matriz función → fuente → propietario y ancla de ejecución.
**Reglas:** inspeccionar tick/reloj/velocidad, `track`, mensajes, órdenes,
guardado, crónica archivada y APIs de pantallas; actualizar capítulo 11 con
esta propuesta sin copiar todo el diseño aquí.
**Tests exigidos:** registrar baseline de typecheck, rápida, jornadas y lint;
capturar los seis flujos de §7 con el render real identificado.
**Terminado cuando:** las discrepancias siguientes estén resueltas por escrito
y los módulos tengan rutas de archivo y datos confirmadas.

Discrepancias observadas: cabecera de `design.md` v3.66 con secciones v3.75;
§4.1 conserva tiempos y velocidades antiguos, mientras `TIME.SPEEDS` incluye
×64; §11 conserva descripciones anteriores a órdenes/U-14. No corregir balance
para ajustarlo a un párrafo antiguo. El nuevo botón de aplazar decisión, el paso
de pantallas completas a bandejas y las excepciones de lectura necesitan entrada
explícita en el maestro. Si aparece otra incompatibilidad, cerrarla antes de UI-R1.

### UI-R1 — Contratos, tokens y contenedor (integrador)

**Objetivo:** montar la base visual de la nueva interfaz.
**Depende de:** UI-R0.
**Ficheros:** `src/ui/redesign/{contracts.ts,tokens.css,shell.ts,shell.css}`,
`src/ui/app.ts`, `index.html`, `tests/fast/ui-redesign-shell.test.ts` e informe.
**Contrato:** §4 y `ShellHandle` descrito allí.
**Reglas:** un canvas, una navegación, un contenedor. Introducir el nuevo shell
en la ruta normal; los adaptadores existentes siguen atendiendo las pantallas
que aún no se han migrado. Retirar del HTML solo los estilos ya reemplazados.
**Tests exigidos:** cerrar/cambiar panel elimina interacciones anteriores,
conserva estado y canvas; foco y ruta coherentes.
**Terminado cuando:** reposo 390 × 844 verificable, cabecera/navegación no
solapadas y contratos listos para consumidores. No dar por migradas las pantallas.

### UI-R2 — Cabecera, órdenes y velocidad (integrador)

**Objetivo:** primera pantalla funcional completa sobre datos reales.
**Depende de:** UI-R1.
**Ficheros:** `src/ui/redesign/{hud.ts,hud.css,orders.ts,orders.css}`,
`src/ui/app.ts`, `src/ui/icons.ts`, `src/engine/chronicle/bank.en.ts` (solo UI_BANK),
`tests/fast/ui-redesign-orders.test.ts` e informe.
**Contrato:** `createOrdersPanel: PanelFactory`; HUD compuesto por el integrador
con las funciones existentes de reloj, indicadores y actividad.
**Reglas:** §2.1/2.3, sin nuevos cálculos económicos. Sustituir los controles
antiguos en esta integración para evitar dos escritores de órdenes.
**Tests exigidos:** cada opción vigente conserva valor/etiqueta; abrir/cerrar no
muta intención; pausa no avanza tick por navegar; reloj coincide con el sol.
**Terminado cuando:** reposo, obra y órdenes/tiempo funcionan en la app real;
se congela el commit común para UI-R3 y UI-R4.

### UI-R3 — Crónica en bandeja (agente construir A)

**Objetivo:** lectura contextual estable, incluida historia archivada.
**Depende de:** UI-R2.
**Ficheros:** `src/ui/redesign/{chronicle.ts,chronicle.css}`,
`tests/fast/ui-redesign-chronicle.test.ts` e informe.
**Contrato:** `createChroniclePanel: PanelFactory`.
**Reglas:** §2.4; reutilizar composición narrativa, preservar RNG; entregar
claves nuevas al integrador. El adaptador de epitafio lo conecta el integrador.
**Tests exigidos:** fuentes separadas, orden conservado, nueva entrada no salta
la lectura, cambiar fuente no mantiene datos ajenos; renderizar no cambia partida.
**Terminado cuando:** panel entregado con evidencia; la integración final añade
el recorrido Valley → Chronicle → Valley y Epitaph → Chronicle → Epitaph.

### UI-R4 — Personas y fichas (agente construir B)

**Objetivo:** consultar identidades reales y seleccionar seguimiento.
**Depende de:** UI-R2.
**Ficheros:** `src/ui/redesign/{people.ts,people.css,inspect-panel.ts}`,
`tests/fast/ui-redesign-people.test.ts` e informe.
**Contrato:** `createPeoplePanel: PanelFactory`, `createInspectPanel` según §4.
**Reglas:** §2.5; `panelFor` es fuente de contenido; ninguna escritura en
`life/` ni cambios de cámara. Edificios y terreno usan la misma ficha.
**Tests exigidos:** filtro nombrados/presentes; identidad por id; persona ausente
o muerta cancela seguimiento; volver a lista no selecciona otra identidad;
una ficha de edificio no emite seguimiento de persona.
**Terminado cuando:** estados normal/vacío/referencia perdida cubiertos y
selección desde lista y canvas integrada posteriormente por el coordinador.

### UI-R5 — Integrar navegación y decisiones (integrador)

**Objetivo:** todos los flujos comparten el sistema y tienen salida.
**Depende de:** UI-R3 y UI-R4 revisados.
**Ficheros:** `src/ui/app.ts`, `src/ui/screens/{chronicle,people,crossroad}.ts`,
`src/ui/redesign/{shell.ts,shell.css,tokens.css}`, `index.html`,
`src/engine/chronicle/bank.en.ts` (solo UI_BANK),
`tests/fast/ui-redesign-navigation.test.ts` e informe.
**Contrato:** mantener APIs públicas heredadas que sigan teniendo consumidores;
redirigirlas al contenedor cuando corresponda. `App.decide` no cambia.
**Reglas:** §2.6, foco modal, un solo aviso de pendiente. Retirar estilos y
listeners de las rutas reemplazadas. Mantener crónica del epitafio y bienvenida.
**Tests exigidos:** transiciones de tabla §2.6; doble toque; decisión en pausa;
aplazamiento y reapertura; llegada de decisión con consulta abierta; extinción;
letargo; no supervivencia de listeners de paneles cerrados.
**Terminado cuando:** los seis flujos se recorren desde la aplicación real,
con evidencia en 3D y recorrido de compatibilidad Canvas.

### UI-R6 — Validación visual y cierre (coordinador; medición delegable)

**Objetivo:** comprobar la entrega completa, publicar evidencia y pendientes.
**Depende de:** UI-R5.
**Ficheros:** `tools/ui-redesign.shots.ts`, `docs/ui-redesign/rounds/UI-R6.md`,
este documento, `docs/design.md`, `docs/changelog.md`;
capturas en `artifacts/ui-redesign/UI-R6/`.
**Contrato:** matriz §7 cumplimentada con enlaces a evidencia.
**Reglas:** la base inspeccionada usa `testDir: 'tools'` y patrón `*.shots.ts`.
Confirmar que Playwright descubre el nuevo fichero; si no lo descubre en la
base de ejecución, el coordinador redefine su ubicación aquí,
sin alterar la configuración para ocultar fallos. Correcciones de producción
vuelven al propietario del módulo y se revisan como una nueva iteración.
**Tests exigidos:** typecheck, rápida, jornadas y lint; recorridos específicos,
capturas reales y comprobación de accesibilidad de §3. Verificar build/PWA si
la extracción de CSS afecta recursos empaquetados o funcionamiento sin conexión.
**Terminado cuando:** evidencia revisada, maestro sincronizado y ninguna
afirmación de implementado sin recorrido real. Fallos heredados separados de
regresiones, sin bajar umbrales ni excluir pruebas.

## 7. Evidencia y criterios que pueden refutar el diseño

Los recorridos concretos, sus precondiciones y el reparto por módulo están en
[Escenarios de aceptación](acceptance-scenarios.md). Ese documento desarrolla
esta sección sin sustituir las decisiones de diseño ni ampliar los ficheros
autorizados por brief.

| Flujo | Evidencia mínima | La propuesta falla si… |
|---|---|---|
| Reposo | Captura con hora, indicadores y navegación | No se entiende una cifra o no queda la mitad del paisaje en 390 × 844 |
| Obra activa | Captura y origen de la frase | Se inventa progreso o compite con una segunda frase permanente |
| Órdenes/tiempo | Recorrido por las opciones reales y pausa | Cambiar de panel altera órdenes o avanza la partida pausada |
| Crónica | Lectura, nueva entrada y cambio a archivo | Se pierde posición, se mezclan valles o el RNG cambia |
| Persona | Selección, seguimiento, salida y muerte/marcha | Se sigue otro id o la ficha atribuye datos que no existen |
| Decisión | Opciones/precio, aplazar, reabrir y contestar | Hay costes ocultos, decisión duplicada o no hay forma visible de salir |

Capturar los seis flujos a 390 × 844. Verificar además 320 × 568, 844 × 390
y 1280 × 800, texto al 200 %, teclado y movimiento reducido. Las escenas de
contraste incluyen día, noche, invierno y tormenta, con fixture reproducible.
Registrar semilla, tick, velocidad, resolución, backend solicitado y backend
real. Usar al menos semillas 7, 42 y 108 para revisar encuadres; no deducir
distribuciones de juego ni umbrales estadísticos de esas capturas.

Los estados forzados para pruebas son fixtures y se identifican como tales.
Para alcanzar estados mediante simulación usar `run` con política registrada,
no un bucle de `tick` que deje la primera encrucijada pendiente. Si 3D cae a
Canvas, la captura no acredita 3D. No presentar capturas de portátil como medida
de rendimiento en móvil. Inspeccionar las imágenes, no solo su existencia.

## 8. Prompt reutilizable por ronda

```text
Tier: construir
Implementa UI-R<n> de docs/ui-redesign/implementation-plan.md.
Lee CLAUDE.md, design.md §1–4, §11 y §13, docs/agents.md,
implementation-plan.md §0–6 y tu brief. Lee §7 para la evidencia.
No leas todos los anexos ni ejecutes otros módulos.

PARTE 0 — Cierres
Comprueba el commit base asignado y el diff antes de editar.
Confirma que las dependencias están integradas y el contrato coincide.
No reviertas cambios ajenos. Si la base o un contrato falta, informa con
evidencia y detén el módulo dependiente hasta que el coordinador lo resuelva.

PARTE 1 — Módulo
Trabaja solo en los ficheros de tu brief. Usa los contratos de §4 y los
tokens de §3. No inventes datos, constantes de juego ni APIs del backend.
Entrega las claves de texto necesarias al integrador. No cambies exclusiones
de pruebas, dependencias, balance ni guardados.

PARTE 2 — Evidencia
Ejecuta las verificaciones del brief y entrega el diff, resultados reales,
capturas aplicables y pendientes en rounds/UI-R<n>.md.
Explica qué criterio de §7 podría quedar refutado por lo observado.
No declares completo un flujo probado solo llamando directamente a su función.
No hagas push ni integres otras ramas por tu cuenta.
```

El coordinador sustituye identificador y commit base antes de enviar el prompt.
UI-R0, UI-R1, UI-R2, UI-R5 y el cierre de UI-R6 pertenecen al integrador; no se
reparten entre escritores simultáneos de `app.ts`. UI-R3/UI-R4 entregan módulos;
el coordinador conserva la decisión de diseño y la auditoría de integración.

## 9. Registro

| Revisión | Cambio y motivo |
|---|---|
| v1.0 · 15 sep 2026 | Se concreta la dirección híbrida en flujos, contratos, propiedad, seis fases de implementación tras el cierre normativo y evidencia. Se limita la primera entrega a datos y arte existentes para que los mockups no introduzcan funciones ficticias. |

Pendiente de ejecución: UI-R0 a UI-R6. No hay pruebas de implementación ni
capturas nuevas producidas por esta revisión documental.
