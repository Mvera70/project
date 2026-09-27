# Siguiente tanda: trabajo acotado para Terra y Luna

17 de septiembre de 2026. Preparado por el coordinador sobre **`141652d`**.
Estado anterior, al redactar la guía: **plan preparado; ninguna tarea lanzada**.
Estado vigente tras la auditoría: **P0–P7 completados y revisados; pendiente de decisión del usuario, sin integrar**. El usuario dirige la tanda.
Todo resultado es candidato hasta la revisión final del coordinador; nada se
fusiona a `main` durante esta fase. Esta guía organiza trabajo, no cambia la
especificación del juego.

## 1. Diagnóstico y prioridad

La prioridad es cerrar lagunas de las entregas existentes antes de ampliar la
economía. IA-15–18 ya muestran madera, bosque, cantera y cosecha. El problema
pendiente es cuánto de ese comportamiento sobrevive al paso del tiempo real del
juego y qué defectos visuales no detectan las pruebas unitarias.

| Hallazgo revisado | Estado y fuente | Trabajo apropiado |
|---|---|---|
| Cosecha y cantera tienen ciclos visibles | Entregados; IA-17/18 los observan con motor fijo | Luna recoge transiciones con motor vivo; no rehacer cadenas |
| Porte agrícola largo de semilla 7 | IA-18 termina a 45 s con progreso, sin descarga completada | Cerrar la evidencia o identificar interrupción, sin darlo por atasco de antemano |
| Regreso nocturno incompleto | IA-14 conserva 21/22 noches, pendiente 132 en tick 2834; antes fue 155 | Reproducir sobre la base actual, sin asumir que persiste el mismo id |
| Vado desplazado | OBS-01 midió vértices fuera de celda; `buildFord` aún gira el recurso sobre la esquina | Terra puede corregir con contrato geométrico cerrado |
| Agua del vado | `ground.ts:buildWater` aún selecciona únicamente terreno 2 | Comparación separada; no atribuir ambos defectos al pivote |
| Animaciones y encuentros de fauna | Seis modelos entregados; cobertura de comportamiento incompleta | Luna recopila secuencias; el coordinador juzga naturalidad |
| Herramienta de observación | La referencia aún describe fase inicial fija 0,28, pero el script calcula `basePhase`; falta `--advance` en su tabla | Luna corrige documentación; Terra mejora trazabilidad |
| Prueba de clips | `graphics-clock.test.ts` aún exige mismo número de clips que catálogo; runtime añade acciones procedurales | Terra separa contratos sin eliminar validaciones |
| Seguimiento de persona | `renderer.track` recentra una vez y `track(null)` sale; confirmado por lectura | Pendiente real, pero fuera de esta tanda por coordinación con UI |
| Cuaderno de tareas | Cabecera habla de rama y encargos antiguos; §4 conserva pendientes ya entregados | Inventario de discrepancias, sin borrar historial ni declarar cierres por intuición |

Esto es una auditoría documental y de puntos concretos del código, **no una
nueva ejecución de pruebas ni una revisión visual completa**. Los resultados
numéricos citados son los de los informes previos, no mediciones de hoy.

El piloto OBS-02 no acreditó diagnóstico visual autónomo ni con Luna ni con
Terra. Por eso Luna recoge datos y Terra implementa causas ya delimitadas.
No existe una medida comparable de coste por modelo en el piloto: este reparto
busca limitar contexto, reintentos y trabajo duplicado, no promete un ahorro exacto.

## 2. Rama de revisión y aislamiento

Rama de integración: **`codex/valley-next-review`**, creada y preparada en P0
desde la base completa `141652d6e0f9c0b89881edc9faad7474a21a80fa`. El worktree
vigente es
`C:\Users\mvera\.codex\visualizations\2026\09\16\01a0a98c-25e2-7c11-8696-e38a74e72966\valley-next-review`.
Los siguientes agentes deben inspeccionar y reutilizar esa rama y ese worktree,
sin crear otra rama/worktree ni tocar el checkout principal. Si se escoge una
base más nueva, hay que anotar las diferencias y revalidar los casos antes de
asignarlos.

Al preparar esta guía hay cambios ajenos en `src/ui/app.ts` y carpetas sin
seguimiento `.codex-remote-attachments/`, `docs/observations/OBS-02/` y `tmp/`.
No trasladarlos, añadirlos al commit, borrarlos ni guardarlos con un stash global.

**Modo económico recomendado: un agente escritor cada vez**, en el worktree
aislado de la rama de revisión. Conserva el checkout principal tal como está.
Antes de cada tarea, inspecciona la rama y la ruta vigentes con
`git -C C:\Users\mvera\.codex\visualizations\2026\09\16\01a0a98c-25e2-7c11-8696-e38a74e72966\valley-next-review status --short --branch`
y reutilízalas sin sobrescribirlas. No crees otra rama ni otro worktree para
esta tanda.

La ruta real está fuera del proyecto principal y fue verificada durante P0. No
edites `.gitignore` para cambiar el aislamiento.
Resolver dependencias desde el lockfile del checkout; no copiar cambios de código
ni actualizar paquetes. Las operaciones que requieran permisos siguen el flujo
normal del entorno.

Esta guía debe estar disponible en el worktree: si todavía no está versionada,
copiar **sólo este documento** y añadirlo en el commit documental inicial de la
rama de revisión. No arrastrar todo el árbol de documentos sin seguimiento.
Los informes OBS-02 pueden leerse en el checkout original; la guía conserva aquí
su conclusión operativa para no depender de que esas rutas estén en Git.

Si el usuario decide paralelizar, cada escritor necesita rama `codex/next-<ID>`
y worktree propio desde el mismo hash acordado. Un único integrador incorpora
commits seleccionados a `codex/valley-next-review`. Nunca dos agentes escribiendo
en un checkout ni dos worktrees con la misma rama. No repartir `renderer.ts`,
`village.ts`, catálogo o manifiesto entre escritores simultáneos.

Un commit por tarea; separar corrección y evidencia si son independientes.
Añadir rutas explícitas, revisar `git diff --cached`, sin `git add .`.
Se puede subir **la rama de revisión**, sin force push. No merge, cherry-pick a
`main`, rebase de `main` ni publicación/despliegue. El usuario ha sustituido para
esta tanda la entrega directa a `main` por revisión diferida.

## 3. Orden, presupuesto de trabajo y entregables

Los límites siguientes son topes operativos de esta tanda, no constantes de juego.

1. **P0** prepara checkout y línea base. **P1** asegura que la evidencia se puede leer.
2. **P2** recoge recursos y **P3** noches; son la tanda mínima útil.
3. **P4** y **P5** son dos correcciones pequeñas e independientes.
4. **P6** amplía fauna sólo después de revisar que el primer lote tiene sujetos visibles.
5. **P7** reúne el índice y deja todo preparado para revisión. Se puede cerrar
   aquí aunque algunas observaciones resulten insuficientes.

No hace falta ejecutar todas las tareas para obtener valor. Con poco presupuesto,
hacer P0–P3 y P7. No abrir automáticamente nuevos encargos al terminar.
Una sola ejecución de navegador a la vez por máquina; nada de baterías masivas
en paralelo. Reutilizar un bundle inmutable para tareas sin cambios de runtime.
No ejecutar suites completas en cada tarea: tests dirigidos cuando haya código,
typecheck y lint; suite de cierre una sola vez en P7.

Por captura: una exploración corta y como máximo dos reintentos de encuadre o
duración. Si el evento no aparece, entregar `no ocurrido` o `insuficiente`,
conservar material y parar ese caso. Si una tarea consume 25 minutos sin resultado
revisable, dejar informe parcial y devolverla al usuario antes de superar media hora.
No gastar el resto buscando semillas indefinidamente.

Informes versionados: `docs/agent-phase/<ID>.md`; índice: `docs/agent-phase/index.md`.
Datos voluminosos: `artifacts/graphics/agent-phase/<ID>/<caso>/` (ignorados por Git).
Cada informe incluye commit de código, hash SHA-256 del HTML, comando exacto,
salida/exit code de pruebas, ids, ticks, unidades, archivos revisados y límites.
Un commit con referencias a artefactos locales **no transporta esos artefactos**:
conservarlos hasta la revisión. Si cambia de máquina, entregar además un archivo
comprimido con las tomas seleccionadas, trazas completas y manifiesto de hashes,
por el medio que el usuario indique. No subir cientos de PNG al repositorio.

## 4. Briefs ejecutables

### P0 · Preparación y discrepancias del cuaderno — Luna

**Objetivo:** establecer una base inequívoca sin gastar en redescubrir el proyecto.
**Depende de:** nada. **Escritura:** `docs/agent-phase/P0.md`, `docs/agent-phase/index.md`.

- Leer `CLAUDE.md`, esta guía, §1–4 de diseño como exige el proyecto y las entradas
  recientes IA-15–18 del cuaderno. No leer todos los informes históricos.
- Preparar el worktree según §2; registrar rama, base y estado de Git.
- Enumerar contradicciones relevantes del cuaderno con referencia a informe/código:
  especialmente rama antigua, animales ya entregados y pendientes ya cerrados.
  Proponer corrección, **no reescribir ni borrar el cuaderno**.
- Empaquetar `npm run bundle -- --out artifacts/graphics/agent-phase/base/game`.
  Registrar `Get-FileHash <HTML> -Algorithm SHA256`.
- Arranque: observatorio, semilla 11/año20, 1 s a 2 fps, `--page` explícito.
  Confirmar traza con personas, renderer real y `errors` vacío. Una pantalla de
  título o una carpeta vacía no pasa. Si falla, entregar stack; no reparar UI.

**Terminado:** índice con base y bundle utilizables, o bloqueo reproducible.
No tests de código ni suite completa en esta tarea documental.

### P1 · Manifiesto verificable de capturas — Terra

**Objetivo:** que el coordinador pueda saber qué mide cada toma sin abrir mil PNG.
**Depende de:** P0. **Escritura permitida:** nuevo `tools/graphics/evidence-index.mjs`,
nuevo `tests/fast/evidence-index.test.ts`, referencia
`.claude/skills/observe-valley-life/references/observation-contract.md`, informe P1.
No modificar `observe-life.mjs`, el renderer ni el visor existente.

**Contrato nuevo de CLI:** `node tools/graphics/evidence-index.mjs <carpeta-toma>`.
Lee `trace.json`, `summary.json` y archivos nombrados por `frames[].file`.
Escribe `evidence-index.json` en esa carpeta, sin reescribir entradas ni PNG.
Campos: `schemaVersion: 1`, `sourceTraceSha256`, `mode`, `seed`, `year`, `fps`,
`speed`, `lead`, `advanceWeeks`, `firstTick`, `lastTick`, `frameCount`,
`missingFiles: string[]`, `errors: string[]`, `warnings: string[]`.
Conservar `null` para campos no disponibles; no inventar valores antiguos.
El hash del bundle permanece en el informe de P0; no confundirlo con hash de traza.

- Comprobar JSON legible, frames no vacíos, tiempos finitos y ordenados, PNG
  existentes, correspondencia de ticks extremos y resumen. Rechazar rutas que
  escapen de la carpeta. Error estructural o archivo ausente: exit code no cero.
- Modo fijo con tick constante es válido. Modo vivo sin avance de tick: advertencia
  de evidencia insuficiente para persistencia, no corrupción. No emitir `IA correcta`.
- No contar cuerpos ocultos durmiendo como mallas ausentes defectuosas.
- Actualizar en la referencia la tabla de `--advance` y la fórmula relativa a
  `basePhase`, cotejando el script; conservar distinción de segundos vivos/escénicos.
- Tests con fixtures mínimos en directorios temporales: válida fija, viva sin
  tick, PNG ausente, JSON incorrecto, ruta fuera de raíz y resumen inconsistente.

**Terminado:** tests dirigidos, typecheck/lint, índice de la toma P0 y errores
explicados. No generar un nuevo framework, dashboard ni dependencias.

### P2 · Recursos: completar evidencia y cruzar semanas — Luna

**Depende de:** P0, P1 si está disponible. **Escritura:** informe P2 y artefactos propios.
Leer IA-18, límites IA-17 y skill `observe-valley-life` con su referencia.
No editar `src/`, tests ni scripts. No asumir que los ids históricos se conservan.

**Caso A, entrega larga:** semilla7/año20, `--advance 35`, fijo, 90 s a 2 fps,
plano general; verificar semana35 por tick real. En IA-18 id3 progresó sin acabar
a 45 s. Localizar los portadores actuales, anotar recogida, destino, progreso,
descarga, regreso o interrupción nocturna. Si hay evento, una toma cercana de
6 s a 15 fps con `--follow <id>` y `--lead` elegido dentro del rango 0–120.
No concluir fallo sólo porque la ventana termina antes de la descarga.

**Caso B, cosecha viva:** semilla11/año20, preparar semana34 con `--advance`
verificado; punto inicial orientativo `--advance 33`, no garantía del tick.
Grabar `--live --speed 64 --seconds 42 --fps 2`. Exigir en la traza cruce
34→35→36, registrar planes, cargas y contadores a ambos lados. Si no se cruza,
informar y usar como máximo el reintento previsto; no modificar reloj ni estado.
No inferir duplicación de grano por un contador escénico de entregas.

**Caso C, cantera viva:** semilla11/año44, `--live --speed 64 --seconds 29 --fps 2`.
Comprobar si la obra de piedra sigue presente en esta base y observar su cierre
si ocurre. Registrar qué hace el porteador cuando desaparece su destino.
Si no hay obra adecuada, resultado `caso ausente`; no fabricar una.

**Terminado:** tres fichas con secuencias enlazadas e incertidumbres. Los cambios
de jornada pueden reiniciar estado efímero; marcar las transiciones para revisión,
no declarar pérdida económica ni inventar una política de interrupción.

### P3 · Noche pendiente y puertas — Luna

**Depende de:** P0. **Escritura:** informe P3 y artefactos propios.
Leer IA-14 y skill de observación; no corregir navegación.

- Dos tomas: semilla7/año1 y semilla43/año60; ambas
  `--live --speed 64 --seconds 42 --fps 2`, con `--page` y `--out` propios.
- Entregar cada entrada de `nightOutcomes` separada, residentes/durmiendo/ids
  pendientes; no agrupar por tick ni ocultar noches fallidas con promedios.
- Localizar tick2834 si aparece, pero no exigir ids132/155 si la trayectoria cambió.
- Si hay pendiente, conservar tramos previos/posteriores, residencia y ruta.
  Una nueva toma fija en otra jornada no reproduce automáticamente ese fallo.
- Una secuencia cercana de puerta de 6–8 s a 15 fps y velocidad normal/fija,
  con entrada o salida visible. El caso de ciclo vivo a ×64 prueba transiciones;
  no sirve para juzgar naturalidad de la marcha.

**Terminado:** dos series nocturnas más muestra de puerta o ausencia justificada;
separar `no-home`, durmiendo oculto, caso fuera de encuadre y regreso fallido.

### P4 · Pivote del vado — Terra

**Depende de:** P0. **Escritura:** `src/render3d/world/ford.ts`,
`tests/fast/graphics-world.test.ts`, informe P4 y capturas.
Leer OBS-01/world, G-24 y diseño §7.6 / D.6 / D.8.

**Contrato existente:** conservar `fordCells`, `Ford`, `buildFord` y su API.
La losa girada debe mantener toda su huella XZ en la celda elegida. Pivotar sobre
el centro de la celda con un contenedor y compensación local del recurso; no
trasladar la celda, cambiar A*, agrandar el río ni rehacer el GLB.
Conservar variación determinista de cuarto de vuelta, ruta legada y liberación
de nodos sin destruir geometría/materiales compartidos.

**Pruebas:** cuatro orientaciones con geometría asimétrica cuyo origen está en
esquina; medir bounds mundiales, no sólo `position`. Además cargar el GLB
publicado y verificarlo con las transformaciones reales; registrar bounds.
Conservar pruebas de selección de celdas y compatibilidad antigua.
**Evidencia:** antes/después semilla7/año1, mismo encuadre; segunda semilla con
vado; una secuencia de cruce si hay sujeto. Bundle distinto al de P0.

**Terminado:** huellas contenidas, pruebas dirigidas/typecheck/lint y capturas.
La falta de lámina de agua queda explícita en el informe: **no tocar ground.ts**
en este encargo. No reclamar resuelto todo el río.

### P5 · Contrato de clips exportados y procedurales — Terra

**Depende de:** P0. **Escritura:** `tests/fast/graphics-clock.test.ts`,
nuevo `tests/fast/procedural-clips.test.ts`, informe P5.
Lectura: `clips.ts`, `action-clips.ts`, `assets.ts`, `art/catalog.json` y
conexión de `actionClips` al cargador. No modificar producción ni catálogo.

Reproducir primero la prueba del catálogo. El runtime tiene acciones generadas
desde idle, por lo que el número total no tiene por qué igualar el del GLB.
Sustituir la igualdad de cardinalidad por propiedades más precisas:

- Cada clip declarado por el catálogo mantiene duración, loop y zancada acordados.
- Cada clip de runtime está respaldado por el recurso exportado o un clip
  procedural generado realmente; los no respaldados hacen fallar la prueba.
- Acciones generadas: nombres únicos, duración positiva y pistas finitas para
  huesos existentes del rig importado; el clip fuente no queda mutado.
- Incluir al menos un caso negativo que detecte ausencia de respaldo. No resolver
  la roja borrando sólo el aserto ni copiando una lista de doce nombres.

**Terminado:** pruebas relevantes, typecheck/lint y explicación de la propiedad
que ahora se protege. Si el fallo real difiere del diagnóstico, entregar causa y
parar. No reducir umbrales ni marcar `it.fails` para ocultar una regresión.

### P6 · Fauna y encuentros, lote pequeño — Luna

**Depende de:** P0 y revisión por el usuario de un primer caso encuadrado.
**Escritura:** informe P6 y artefactos propios. Leer G-23, OBS-01/conclusions y
skill de observación. Este lote recoge evidencia; no aprueba estética.

Primera entrega: una especie, plano general de contexto y secuencia cercana de
6 s a 15 fps, con id visible y cambio movimiento/reposo o acción propia. Mostrar
al usuario y esperar que confirme que el material sirve antes de ampliar.
Después: vaca, cerdo, gallina, lobo, cuervo y pez, una ficha por especie y
como máximo una toma cercana por especie además de la exploración.
Buscar primero sujetos en semillas11/año20 y43/año60; si no aparecen,
entregar cobertura ausente en vez de buscar infinitamente.

Registrar si es cuerpo físico o animal ambiental y la fuente de movimiento.
Para un encuentro: participantes, comienzo, contacto observable, reacción y
finalización. Si no ocurre en la ventana, queda pendiente; no juntar escenas
distintas para simular un encuentro completo. Mantener muestras ordinarias,
además de candidatos. Nombre de clip y contador verde no prueban articulación.

**Terminado:** matriz de presencia/cobertura/ausencia y secuencias originales.
No inventar umbrales de distancia entre centros para declarar choques.

### P7 · Paquete de revisión — Luna

**Depende de:** las tareas que el usuario haya decidido ejecutar.
**Escritura:** `docs/agent-phase/index.md`, informe P7.
No editar código ni resumir sospechas como errores confirmados.

- Listar por tarea: estado, commits, archivos, resultado, pruebas y evidencias.
- Comprobar ancla con `git merge-base --is-ancestor <base> HEAD` y revisar
  `git diff --stat <base>...HEAD`; marcar cualquier ruta fuera del brief.
- Ejecutar una sola vez typecheck, lint, suite rápida y jornadas como cierre
  si hubo cambios de código. Conservar rojas literales; distinguir preexistentes
  mediante ejecución dirigida en la base limpia, nunca por intuición ni revirtiendo
  archivos del checkout compartido. No ejecutar test:balance.
- Verificar hashes y existencia de artefactos citados; documentar los ausentes.
- Subir sólo la rama de revisión si el usuario pide/autoriza la subida al dirigir
  la tanda. Dejar `main` intacta. Entregar hash final y lista de commits por tarea.

**Terminado:** paquete auditable, aunque tenga fallos pendientes. Pasar pruebas
no convierte por sí solo una tarea en aceptada.

## 5. Trabajo reservado al coordinador

No asignar durante esta tanda: stock/agotamiento de piedra, crecimiento y tipos
económicos por parcela, molienda con producción nueva, balance de subsistencia,
oficios persistentes, asistentes a funerales/incendios, vigilancia, migración de
guardados, reescritura de navegación o IK de pies. Necesitan diseño y evaluación
conjunta. Tampoco añadir especies, edificios o árboles por rellenar trabajo.

Quedan como propuestas posteriores: clip/herramienta de siega (hoy se usa
`sort`), otras siluetas de árboles, integración del cobertizo, agua del vado,
seguimiento visual y anclajes de trabajo/descanso. Ninguno se da por aprobado
con esta guía. La UI tiene trabajo concurrente; `src/ui/app.ts` queda fuera.

## 6. Prompt para dirigir cada tarea

Copiar este bloque, sustituyendo ID y modelo. No enviar toda la conversación.

> Trabaja como [Luna/Terra] en la tarea [P0–P7] de
> `docs/agent-work-phase.md`. Lee CLAUDE.md, las secciones comunes exigidas y sólo
> las lecturas de tu brief. Confirma ruta, rama de revisión y base antes de editar.
> Ejecuta únicamente esa tarea, dentro de sus archivos permitidos. No trabajes
> en main ni incorpores cambios ajenos. No modifiques economía, configuración de
> pruebas, dependencias o umbrales para conseguir verde. Mantén las evidencias
> originales y distingue observado, sospechado y no medido. Respeta los topes de
> intentos de la guía. Si necesitas otro archivo o una decisión nueva, entrega
> el bloqueo concreto sin extender el alcance. Haz un commit de tu tarea en la
> rama aislada y entrega hash, pruebas, informe, artefactos y límites. No fusiones
> ni continúes con la siguiente tarea. Yo dirigiré la tanda.

Para P0, añadir: «Prepara la rama/worktree siguiendo §2 y copia sólo esta guía
si no está en la base. No ejecutes otros briefs». Para observación, añadir:
«Tu entrega es evidencia utilizable, no un veredicto de que la IA funciona».

## 7. Revisión final cuando vuelva el coordinador

1. Leer índice, comprobar base y diff completo por commit; preservar trabajo
   concurrente de main. Revisar pruebas nuevas con el criterio literal del brief.
2. Clasificar cada tarea: aceptar, pedir corrección, rechazar o evidencia insuficiente.
   Las candidatas P4 y P5 deben poder aceptarse/rechazarse independientemente.
3. Remedir casos críticos sobre candidato y base con parámetros iguales; revisar
   secuencias de forma temporal, no sólo contadores o láminas de resumen.
4. Revisar cualquier descubrimiento de motor vivo antes de cambiar contratos:
   la producción atómica y la carga escénica son autoridades diferentes.
5. Integrar sólo commits aceptados sobre main actual, resolver conflictos y
   comprobar de nuevo. Si un commit depende de otro rechazado, no aplicarlo a ciegas.
6. Actualizar el cuaderno vigente con decisiones reales, sin borrar el historial.
   Hasta ese momento, toda la rama sigue siendo una propuesta.

Prompt de vuelta:

> Audita la tanda de `codex/valley-next-review` usando
> `docs/agent-work-phase.md` y `docs/agent-phase/index.md`. No asumas que los
> informes ni los tests verdes bastan. Revisa cada commit y su evidencia, repite
> los casos críticos, separa lo aceptable de lo rechazado y presenta tu decisión
> por tarea antes de integrar. Conserva el trabajo paralelo de main.
