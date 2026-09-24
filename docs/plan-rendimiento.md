# P-1 · Rendimiento de la aldea histórica

**Estado (22 sep 2026): P-1 cerrada para continuar la hoja de ruta.** Vera
considera suficiente el rendimiento actual. P-1a.1 y P-1a.2 produjeron una
línea de base de la app real; P-1b.1 se acepta y P-1b.2 se retira tras medir.
El banco del renderer comparó día y noche bajo lluvia;
la app real ya tiene tres réplicas de día despejado, noche despejada y noche
lluviosa. [Medidas y límites](medidas/p1a-rendimiento-seed11-year21-2026-09-22.md).
Ninguna corrida mide INP real: la observación anterior de 912–1.144 ms queda
sin resolver como métrica del navegador y se retomará si reaparece. Esta fase
precede al adarve E3.
No se optimiza ni se degrada el aspecto por
intuición: primero hay que separar carga inicial, CPU de simulación, CPU de
presentación y coste de GPU en la partida real.

## Evidencia y límites

- Vera observa tirones en el acceso de Desarrollo a la aldea de semilla 11,
  año 21, especialmente con lluvia nocturna. Sus capturas de Edge muestran
  LCP de 0,69 s, CLS 0 e INP de 912–1.144 ms, con interacciones posteriores
  de teclado y puntero también lentas. LCP sólo mide la aparición del contenido
  principal, no que el mundo 3D haya terminado de arrancar ni su fluidez.
- `public/sw.js` guarda recursos y GLB con política caché-primero; esto evita
  descargas repetidas, **no** conserva entre sesiones el parseo de GLB, las
  texturas decodificadas ni los recursos subidos a GPU. `src/render3d/assets.ts`
  carga secuencialmente los modelos solicitados antes de activar el 3D.
- Hay trabajo plausible por fotograma en `src/render3d/renderer.ts`,
  `src/render3d/effects/weather.ts` y `src/ui/app.ts`. La lluvia actualiza el
  búfer de gotas y su esfera de límites en cada fotograma. Ninguna de estas
  observaciones demuestra todavía cuál es el cuello de botella.
- El banco `tools/graphics/bench.ts` ya reproduce la semilla 11/año visible 21
  y mide el renderer por separado, pero no ejecuta la interacción de la
  aplicación. No se reutiliza una cifra antigua como línea de base de INP.

## Brief de la ronda P-1a · Medir

**Objetivo.** Obtener una línea de base repetible de la aldea real en Edge,
separando entrada en el mundo de fluidez e interacción una vez abierto.

**Depende de.** Preset real semilla 11/año 21; condiciones de clima y hora
controlables sin alterar el estado persistido; mismo equipo, perfil, viewport,
DPR y calidad en todas las comparaciones.

**Ficheros.** Para instrumentación: `tools/graphics/bench.ts`, su escenario y
runner, y `tools/README.md`. Si controlar noche/lluvia exige tocar
`src/render3d/` o `src/ui/`, declarar antes el fichero exacto y mantener el
control sólo en la ruta de diagnóstico. Evidencia en `docs/medidas/` y cierre
en `docs/task-log.md`. El motor y el formato de guardado quedan fuera.

**Contrato de salida.** Cada muestra identifica commit, navegador, equipo,
viewport/DPR, preset, clima/hora, caché fría o caliente, calidad y duración.
Se conservan datos crudos y medianas/rangos, no sólo una media: tiempo hasta
3D utilizable, cadencia/tiempo de fotograma (p50/p95/p99), tareas largas,
tiempo de respuesta a una interacción repetible y, cuando se puedan obtener,
draw calls, triángulos, memoria y tiempo de GPU. Si una métrica no está
disponible, se marca como no medida; no se sustituye por otra.

**Reglas.** Tres condiciones comparables: día despejado, noche despejada y
noche lluviosa; al menos tres capturas por condición tras estabilizar la
escena. Carga fría y caliente se miden aparte. No correr capturas/filmaciones
durante la medida de cadencia porque alteran el coste. Mantener la misma
trayectoria y número de habitantes; si cambia el estado, la comparación no
vale. El INP de DevTools es una señal de problema, no identifica por sí solo
la función culpable.

**Tests exigidos.** El preset sigue abriendo el año 21 real; la medición no
cambia simulación ni guardados; el runner existente sigue operativo. Verificar
que el escenario registra parámetros suficientes para repetirlo y que ninguna
salida pisa artefactos anteriores.

**Terminado cuando.** Existe línea de base con la tabla de condiciones,
trazas conservadas y una atribución sustentada a una o varias categorías de
coste. Si la lluvia no aumenta de forma consistente p95/p99 o tareas largas,
la hipótesis «la lluvia causa el tirón» queda falsada y no se retoca ese efecto.

**Avance parcial.** La primera sonda, sin tocar `src/`, produjo tres réplicas
de día y noche bajo la lluvia que ya tenía ese estado. En el navegador de
banco la noche costó menos CPU que el día; esto no refuta la observación de
Vera porque faltan el bucle UI, Edge interactivo y la comparación con cielo
despejado. En ese corte inicial, P-1a seguía abierta; después se añadió un
control local y no persistente de hora/clima a la aplicación.
El runner de la aplicación real se ejecutó tres veces en Edge headless con
caché fría de contexto y diez segundos por muestra. Registró la entrada por el
menú, cadencia, tareas largas y una interacción sintética de rueda, además del
cielo y la fase solar observados. Las tres muestras fueron de día y lluvia;
no se controlan clima ni hora, no se midió INP y no hay atribución del tirón.
La instrumentación añadió `preview-phase` y `preview-sky` sólo en Vite local de
desarrollo. El runner validó el cielo y la fase observados para las tres
condiciones y dejó cinco segundos de estabilización antes de cada muestra.
Las nueve réplicas de Edge headless mantuvieron año 21 y 48 habitantes: noche
despejada y lluviosa empataron en p95/p99 de cadencia (7,0/7,1 ms) y no hubo
tareas largas durante la ventana estabilizada. La lluvia no mostró sobrecoste
consistente en este entorno; no se retoca su efecto por esa hipótesis. El motor
y los guardados no reciben los parámetros de diagnóstico. Faltan una medida
de INP/Edge interactivo y atribución de las tareas largas de entrada.

### Cierre P-1a.1 · Comparación controlada

Las nueve muestras y sus límites cierran sólo la comparación de cielo/hora.
[Informe de ronda](historico/graphics-rounds/P-1a1-comparacion-controlada.md).
El empate nocturno en p95/p99 descarta retocar la lluvia por intuición en este
equipo. En ese corte todavía faltaban una medida comparable de respuesta y la
atribución de CPU; P-1a.2 cubrió ambas rutas, salvo el INP del navegador.

### Brief P-1a.2 · Respuesta real y atribución de entrada

**Objetivo.** Reproducir o falsar la demora interactiva que Vera observó en
Edge y atribuir las tareas largas de entrada a carga, creación de estado, UI,
render o vida, antes de tocar un candidato de P-1b.

**Depende de.** Preset real 11/año 21 y comparación P-1a.1 cerrada. Mantener
390 × 844, DPR 2, calidad `standard`, misma revisión y equipo; medir caché
fría y caliente por separado.

**Ficheros.** `tools/graphics/bench-app.ts` y, si hace falta una sonda separada,
`tools/graphics/bench-inp.ts`; catálogo `tools/README.md`; evidencia en
`docs/medidas/`; cierre en `docs/task-log.md` e informe de gráficos. Declarar
el fichero exacto antes de tocar `src/`. Motor y guardados fuera.

**Contrato.** Conservar la traza de entrada desde el clic del preset hasta 3D
utilizable con perfil de CPU/long tasks; registrar los eventos de una
interacción de UI repetible *después* de estabilizar (abrir/cerrar la vista
despejada) en Edge interactivo. Separar duración de Event Timing, INP medido
por el navegador si está disponible y la latencia sintética rueda→RAF. Ninguna
recibe el nombre de otra. Identificar condición, caché, navegador, viewport,
equipo, calidad, población, errores, marcas temporales y perfil bruto en cada
muestra. Conservar el número real de interacciones y el rango de réplicas.

**Reglas.** No perfilar CPU durante la medida de cadencia: su sobrecoste la
contamina. No usar una interacción durante la carga para afirmar que la app ya
abierta es lenta. Si Edge interactivo no expone INP reproducible, marcarlo como
no medido y conservar Event Timing sin rebautizarlo. No usar captura de pantalla
durante la cadencia. Ejecutar app/GPU/medición del equipo sólo con autorización
explícita para la orden y destino concretos.

**Tests exigidos.** El preset abre el año 21 real, los controles locales no
alteran guardados, las salidas no pisan runs anteriores, la interacción se
identifica por `interactionId` cuando exista y los errores de página quedan
registrados. Typecheck y lint focal antes de medir.

**Terminado cuando.** Hay al menos tres sesiones comparables con entrada e
interacción posterior distinguidas, frío/caliente por separado, traza de CPU
de las tareas largas, y evidencia suficiente para elegir una categoría de
coste o rechazar la hipótesis. Si la demora de 900 ms no reaparece en Edge
interactivo, no se optimiza un proxy: se documenta esa falsación y se solicita
la condición exacta en la que Vera la observa.

**Cierre de la ruta medida.** [Informe P-1a.2](historico/graphics-rounds/P-1a2-entrada-y-respuesta.md):
se ejecutaron tres réplicas frías y tres calientes en Edge visible, con perfil
CPU de entrada separado de la cadencia y seis clics posteriores por réplica.
La primera tarea larga, 505–531 ms también en caliente, coincide con el avance
síncrono de 20 años del preset; la segunda, 323–344 ms en caliente, con el
montaje 3D y primer uso de programas WebGL. Los clics del botón de vista
despejada dieron 16–48 ms en Event Timing; el clic de entrada llegó a 872 ms.
El INP del navegador no se midió. La interacción anterior de 912–1.144 ms
queda sin reproducir y no bloquea el cierre pedido por Vera.

## Ronda P-1b · Optimizar después de la medida

Una sola intervención acotada por vez, elegida por el cuello medido. Comparar
con la misma escena y repeticiones, conservar aspecto y comportamiento, y
revertir si la mejora no supera el ruido o trae regresiones. Límite inicial:
dos candidatos. La carga progresiva con pantalla de preparación se considera
**sólo si** el tramo de entrada al mundo lo justifica; no arregla un INP de
900 ms durante una partida ya abierta. No fijar un umbral de FPS ni prometer
una cifra antes de medir el dispositivo objetivo.

**Asignación.** Sol dirige y revisa. Luna auditó carga/caché; Terra auditó el
bucle. Astra no intervino. E3 queda liberada tras el cierre de P-1.

### Brief P-1b.1 · Partir el avance del preset

**Objetivo.** Quitar la tarea continua de unos 0,5 s que aparece al abrir el
preset de año 21 sin cambiar una sola decisión ni el estado resultante.

**Ficheros previstos.** `src/main.ts`, `src/ui/debug.ts`,
`src/ui/screens/title.ts` y una prueba focal del avance. Ajustar el límite
exacto antes de codificar; `src/engine/` queda fuera. La indicación de progreso
debe usar las plantillas de UI existentes o solicitar una clave nueva al banco
permitido, sin introducir texto visible literal en el código.

**Contrato.** Ejecutar el mismo `run` y la misma política prudente por tramos,
cediendo al navegador entre ellos para pintar y recibir entrada. No convertir
el año 21 en un estado precalculado. El botón de inicio comunica que el valle
se está preparando y evita dobles clics. No escribir un guardado intermedio.

**Pruebas y puerta.** Comparar byte a byte el `GameState` síncrono y el
fragmentado para semilla 11/año 21 y un caso con final prematuro; mantener
decisiones, crónica y población. Luego, con permiso explícito para usar app/GPU
y medir el equipo, repetir las tres réplicas frías y calientes en la misma
escena. Conservar las trazas. Aceptar sólo si baja la duración de Event Timing
del clic de entrada más que el ruido y no aparece un coste nuevo en la
interacción posterior. El tiempo total hasta 3D puede no disminuir: se informa
por separado. Si la comparación no mejora, revertir el candidato.

**Candidato aceptado tras medir.** `openAtYearCooperative`
llama al mismo `run` con la misma política en grupos de ocho semanas y cede al
navegador entre grupos; el camino síncrono de diagnósticos permanece. El título
conserva el aviso «Founding…» hasta `boot` y espera dos RAF antes del primer
grupo para que el aviso pueda pintarse. La prueba focal en jornadas comparó el
`GameState` serializado completo para semilla 11/año 21 y semilla 31/año 41,
que termina en el tick 1257: ambos estados fueron idénticos a la ruta síncrona.
Typecheck y ESLint focal pasan. Las seis réplicas autorizadas en Edge visible
redujeron el Event Timing del clic de entrada de 528–872 ms a 16 ms o por debajo
del umbral de 16 ms, sin penalización visible en los seis clics posteriores ni
en p95 de RAF. La mediana hasta 3D utilizable aumentó ~0,6 s en ambas cachés;
se acepta el intercambio de tiempo de carga por respuesta. INP sigue sin
medirse. [Informe P-1b.1](historico/graphics-rounds/P-1b1-avance-cooperativo.md).

### Brief P-1b.2 · Primera tarea de montaje 3D

**Objetivo.** Reducir la tarea larga de ~314–337 ms que queda al montar el
valle en cinco de seis réplicas candidatas, sin perder el primer fotograma ni
introducir parpadeos. Éste es el segundo y último candidato previsto en P-1b.

**Primera acción.** Leer los perfiles crudos de P-1b.1 y localizar la ruta de
montaje y primer uso de Three/WebGL. Separar CPU JavaScript de esperas del
driver que el perfil muestre como llamada síncrona; no confundirlas con tiempo
GPU medido. Delimitar después el fichero exacto de `src/render3d/` que se
tocaría. El defecto visual de sombras de día se mantiene como diagnóstico
separado y exige comparación visual antes de aceptar un cambio de render.

**Lectura inicial de perfiles.** La tarea restante comienza al marcarse 3D.
Las muestras mezclan código de `src/render3d/` (terreno, navegación y cuerpos)
con Three.js; `onFirstUse` de programas WebGL aparece repetidamente. Una réplica
incluye además `detectGlade` con peso notable. No hay todavía una única función
que explique los ~0,32 s, ni tiempo GPU directo. La siguiente instrumentación
debe poner marcas en las etapas de `createGraphicsRenderer` y primer render
antes de decidir qué código tocar.

**Sonda medida.** `--stages true` agrega marcas
`valley3d:` de importación, creación de contexto y objetos, plan del primer
fotograma, suelo, vida y envío a WebGL. Sólo se emiten en Vite local; el runner
las conserva con los perfiles y exige que llegue la marca de primer render.
La corrida fría autorizada dio 245–260 ms para el primer fotograma en dos de
tres réplicas; la primera fue un extremo de 551 ms. Suelo y vida ocuparon
64–81 y 72–73 ms; el envío inicial a WebGL, 88 ms en las dos réplicas típicas.
Dos corridas calientes se solaparon entre sí y no son una línea de base limpia:
registraron 259–333 ms de primer fotograma, con 64–83 ms de suelo, 72–77 ms de
vida y 85–154 ms de envío. Es tiempo de pared en el hilo del navegador, no
tiempo GPU. Ningún tramo por sí solo explica el total.

**Candidato medido y retirado.** Se probó construir la escena en un RAF y
enviar a WebGL en el siguiente. Vera ejecutó cuatro corridas secuenciales:
control y candidato, tres réplicas frías y calientes cada uno. La mediana de
la mayor tarea del primer fotograma bajó de 255 a 167 ms en frío y de 237 a
149 ms en caliente. El tiempo hasta 3D utilizable no mejoró y, en caliente,
subió de 1,600 a 1,787 s; el p95 de los clics posteriores pasó de 24 a 32 ms.
Las capturas conservan composición y luz, pero no certifican la transición
inicial. Dado que el rendimiento actual basta para continuar, se retira la
partición y se conserva P-1b.1. [Informe P-1b.2 y datos crudos](historico/graphics-rounds/P-1b2-primer-fotograma.md).

**Puerta.** Una intervención concreta, comparación con las mismas condiciones
frías/calientes y tres réplicas por caché, sin perfil durante cadencia. Conservar
aspecto, estado y respuesta del clic ganada en P-1b.1. La app/GPU y toda
medición del equipo requieren nueva autorización explícita para la orden y
destino. Si no hay mejora por encima del ruido o empeoran las sombras, retirar
el candidato y cerrar P-1b sin forzar una segunda optimización.
