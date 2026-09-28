# The Valley — nueva ronda de diseño de interfaz

**Plan vigente · 28 sep 2026 · Propuesta visual entregada, sin cambios de UI.**

## 1. Encargo y resultado

Vera considera que la UI actual se queda muy por debajo del resultado buscado.
Esta ronda debe elevar la **composición, la jerarquía, el acabado y el uso** de
la interfaz entera, conservando The Valley como juego móvil en el que el mundo
3D es el protagonista. La salida no será una lista de retoques CSS: primero se
compararán direcciones visuales sobre pantallas reales; después se construirá y
verificará la dirección elegida por tandas.

El resultado aceptable reúne tres cosas: una identidad reconocible de The
Valley, acciones y estados comprensibles al primer vistazo, y funcionamiento
correcto en móvil con una partida viva. La valoración estética de Vera es una
puerta de aceptación explícita; ninguna prueba automática la sustituye.

Este documento organiza el trabajo. Las reglas de producto siguen en
[`../design.md`](../design.md) §1–4 y §11. Las decisiones visuales ya expresadas
por Vera están en [`game-ui-direction.md`](game-ui-direction.md), en
`.claude/skills/piel-del-valle/SKILL.md` y en `docs/visual-reference/ui-wood/`.
Si una propuesta nueva cambia una decisión aprobada, se presenta como tal,
con el antes y el motivo; tras la elección se actualiza la fuente normativa y
la skill local **en la misma ronda**. Los planes antiguos de esta carpeta son
historia de diseño, no instrucciones para repetir sus prototipos.

## 2. Skills: qué aporta cada una y quién manda

Las tres skills externas se instalaron en Codex el 28 sep 2026 en
`C:/Users/mvera/.codex/skills/` y se copiaron a `.claude/skills/` del proyecto
para que Claude Code las descubra en The Valley. Cada copia conserva su licencia
y, cuando existe, su carpeta de referencias. Obsidian sirve para notas y enlaces;
la versión utilizable de estas skills vive con el proyecto. Las fuentes se
indican abajo para poder revisar futuras actualizaciones sin mezclar versiones.

| Skill | Fuente | Papel en esta ronda |
|---|---|---|
| [`redesign-existing-projects`](https://github.com/leonxlnx/taste-skill/tree/main/skills/redesign-skill) | Leonxlnx/taste-skill | Inventariar fallos de la UI existente y ordenar los cambios por impacto. Su secuencia es inspeccionar → diagnosticar → corregir. |
| [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Anthropic | Proponer una dirección estética propia, fijar tipografía, composición y lenguaje de superficies, y criticar las propuestas antes de construirlas. |
| [`game-ui-ux`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/main/skills/disciplines/game-ui-ux) | gamedev-skills | Comprobar navegación, estados, escalado, áreas seguras, foco y relación de la UI con el estado del juego. Se adapta a DOM/CSS sobre Three.js; sus ejemplos de Godot/Unity no son recetas para este proyecto. |
| `threejs-game-ui-designer` | `.agents/skills/threejs-game-ui-designer/SKILL.md` | Traducir el diseño a HUD, hojas, gestos y controles táctiles sobre el valle 3D. |
| `piel-del-valle` y `calcar-iconos` | `.claude/skills/` | Aplicar las decisiones locales y producir iconos/ornamentos fieles a una referencia aceptada. |

**Orden de autoridad:** instrucciones de Vera → `CLAUDE.md` y `docs/design.md`
vigentes → decisiones visuales aprobadas y skills locales → skills externas. Las
skills externas son herramientas de crítica y diseño, no una licencia para
introducir un dashboard web, tipografías genéricas de moda, navegación de
consola, datos inventados o mecánicas nuevas. Sus listas de antipatrones se
aplican solo donde describan un problema visto en las capturas.

## 3. Punto de partida y preguntas de diseño

La base visual versionada es [`../interfaz/2026-09-27/README.md`](../interfaz/2026-09-27/README.md):
107 capturas a 390 × 844, con 43 vistas de UI separadas en `ui/`. Las cuatro
primeras pantallas de trabajo son
[`valle`](../interfaz/2026-09-27/ui/007-valle.jpg),
[`crónica`](../interfaz/2026-09-27/ui/016-cronica.jpg),
[`carro`](../interfaz/2026-09-27/ui/024-carro.jpg) y
[`encrucijada`](../interfaz/2026-09-27/ui/026-encrucijada.jpg).

Lectura inicial de esas cuatro capturas, **hipótesis que la auditoría debe
confirmar o corregir**:

- La cabecera y la barra inferior enmarcan con mucha fuerza una escena que
  necesita respirar. Hay que comparar cuánto valle visible gana o pierde cada
  alternativa, sin ocultar información necesaria.
- **Decisión de Vera del 28 sep:** el fondo de piedra de la botonera inferior
  no le gusta y debe salir de la nueva UI. Las propuestas no lo conservan ni
  lo suavizan: plantean otra base para la navegación, integrada con el valle y
  con estados táctiles claros. La piedra puede seguir existiendo donde tenga
  sentido para una era o una superficie, no como suelo de esa barra.
- Crónica, carro y decisión conservan personalidad, pero la jerarquía entre
  título, relato, coste y acción cambia de una hoja a otra. Conviene diseñarlas
  como una familia y dar a cada una un foco claro.
- La textura y el relieve ya existen; sumar más adorno por sí solo no elevará
  la calidad. El nuevo diseño debe demostrar una composición mejor y una
  respuesta más clara al toque.

Se conservan como referencias aprobadas el **reloj solar**, el lenguaje
material de madera y pergamino, los iconos y el logotipo hechos para el
juego. La piedra queda sujeta a la decisión anterior sobre la barra inferior.
Su tamaño, distribución y peso visual sí se revisan. Si Vera prefiere
una dirección que cambie una de esas decisiones, se documentará exactamente
cuál y por qué antes de extenderla al resto de pantallas.

Antes de editar código hay que aclarar una divergencia documental: `design.md`
§11.0 describe hojas a media altura, mientras `piel-del-valle` §1b conserva una
regla de hojas completas y la captura actual enseña una hoja parcial. La ronda
de diagnóstico anotará el comportamiento implementado y la última decisión
expresa de Vera; la dirección elegida cerrará esta regla en la fuente normativa.

## 4. Método y puertas de cada fase

### R0 · Auditoría visual y funcional

**Entrada:** los documentos del §1, las cinco skills del §2, las capturas del
27 sep, `src/ui/redesign/`, `src/ui/screens/` y el catálogo de herramientas
`tools/README.md`.

**Trabajo:** aplicar la auditoría de `redesign-existing-projects` a todas las
superficies visibles. Para cada problema, registrar captura, elemento,
consecuencia para el jugador y prioridad. Separar hechos observados de gusto o
hipótesis. Dibujar un mapa de pantallas y estados: carga, menú, valle nuevo y
maduro, pausa, pantalla despejada, crónica, gente y seguimiento, carro con
acción disponible/no disponible, encrucijada pendiente/resuelta, avisos,
caza, asedio, anales y finales. Revisar el recorrido de volver/cerrar.

**Salida:** diagnóstico breve con las diez intervenciones de mayor impacto y
matriz de estados. No se diseña desde una sola captura ni se abre una refactorización
del motor. La tanda archivada evita ejecutar de entrada el paquete de prensa
completo; las capturas frescas se harán por pantalla cuando empiece la
implementación.

**Puerta:** cada propuesta posterior debe responder a problemas concretos de
este diagnóstico. Una preferencia estética se identifica como tal.

### R1 · Una dirección visual con variantes comparables

Tras las elecciones posteriores de Vera, `frontend-design` desarrolla **una
piel cohesionada** con variantes solo para cabecera y navegación. La propuesta
concreta está en [`propuesta-piel-v2-2026-09-28.md`](propuesta-piel-v2-2026-09-28.md):
concepto, jerarquía, tipografía, color, material, estados y láminas a escala.
Las dos variantes sustituyen el fondo de piedra de la botonera inferior.
La comparación nocturna/lluviosa queda como comprobación del prototipo.

`game-ui-ux` y `threejs-game-ui-designer` revisan las variantes antes de
presentarlos: zona segura, lectura en móvil vertical, controles táctiles,
apertura y cierre de hojas, foco, estado seleccionado, contenido largo y espacio
libre para el 3D. Las sugerencias de webs promocionales o de interfaces de
consola se descartan si no sirven a ese uso.

**Puerta de Vera:** elegir tratamiento de cabecera/tira, ajustar A1/B1 o pedir
otra iteración. La intención de A1 (lectura) y B1 (decisión) ya está elegida.
La elección del acabado es una decisión del dueño, no una inferencia del agente.

### R2 · Sistema visual aprobado y prototipo funcional

Convertir la elección en un inventario de componentes, tokens y estados:
cabecera, cifras, navegación, hoja, títulos, filas, costes, acciones, sellos,
avisos, popups, carga y final. Para cada pieza se define el papel, no solo un
valor CSS: activo, pulsado, foco, deshabilitado con motivo, pendiente y vacío.
Se fijan tipografía y tamaños según su función; las texturas e ilustraciones
siguen el flujo reproducible del proyecto. `calcar-iconos` se usa cuando el
dibujo aprobado ya existe. El movimiento debe explicar apertura, cierre,
selección y consecuencia, respetando `prefers-reduced-motion`.

La primera implementación es una **sección vertical**: valle, apertura del
carro, dar una cosa y volver al valle; incluye cabecera y navegación compartidas.
Se trabaja en los ficheros declarados en un brief de ronda, sin tocar el motor.
Se fotografían antes/después en móvil y escritorio y se comprueba el efecto
real de la acción. Si el aspecto sigue corto respecto al prototipo, se corrige
esa sección antes de multiplicar el diseño.

**Puerta:** Vera acepta el aspecto en el juego, no solo en una lámina. La skill
`piel-del-valle` se actualiza con la dirección aceptada y sus motivos para que
las rondas siguientes no vuelvan a la versión anterior.

### R3 · Extensión por familias de pantallas

Cada tanda tiene su propio brief con **objetivo · dependencias · ficheros
permitidos · contrato · estados · verificación · terminado cuando**. Se entrega
captura comparativa y flujo probado antes de pasar a la siguiente.

| Orden | Familia | Estados que deben enseñarse |
|---|---|---|
| 1 | Crónica, anales, bienvenida | Lista corta/larga, lectura con nuevo hecho, decisión sellada, archivo vacío, regreso. |
| 2 | Gente, ficha, inspección | Lista, persona seguida, vida larga, persona ausente, volver a lista y al valle. |
| 3 | Encrucijadas y avisos | Opciones cortas/largas, aplazar, reabrir, confirmar, amenaza y consecuencia visible. |
| 4 | Menú, carga, caza y finales | Nueva/continuar, carga real, elección de arma, encuentro, epitafios y reinicio. |

Los elementos compartidos se cambian una vez en el sistema visual y se revisan
en todas las superficies que los usan. Si aparece una necesidad de texto,
derivación o arte que no está en el contrato actual, se registra y se prepara
su brief; no se inventa un dato en la UI para rellenar el diseño.

### R4 · Pase completo y archivo de versión

Recorrer todos los estados de la matriz de R0, incluidos los poco frecuentes.
Comparar 390 × 844, un móvil estrecho, una tablet y escritorio, con área segura
y contenido largo. Comprobar contraste de día, noche, lluvia y sobre terreno
claro/oscuro; solapes, recortes, lectura, foco, orden de navegación y blancos
táctiles de al menos 44 px donde corresponda. Verificar que tocar, cerrar,
arrastrar, pausar, decidir y volver siguen enviando las acciones correctas y
que la UI lee el estado real sin duplicar reglas del motor.

Durante cada ronda: `npm run typecheck`, `npm run lint` y comprobaciones
dirigidas a los ficheros tocados; capturas con `npm run shot` o el grupo
pertinente de `tools/graphics/press-kit.mjs`. La suite completa queda para el
cierre de la tanda, conforme a `CLAUDE.md`. Los recorridos del navegador hoy
tienen doce fallos por selectores de la UI anterior (`docs/task-log.md`, 28 sep):
se adaptan a la interfaz vigente en la tanda que toca cada superficie y no se
declaran verdes por omisión. El paquete completo de prensa se ejecuta por
grupos y se inspecciona antes de archivarlo en `docs/interfaz/AAAA-MM-DD/`.

**Terminado cuando:** todas las rutas y estados tienen captura revisada; no hay
recortes ni acciones sin respuesta; la documentación normativa, la skill local
y las pruebas de navegador describen la UI entregada; Vera ha visto la versión
en el juego y considera que alcanza la dirección elegida.

## 5. Contexto y prompt para la primera ronda

El agente de R0/R1 recibe exactamente este paquete, para evitar que una skill
genérica sustituya el conocimiento del juego:

1. `CLAUDE.md`; `docs/design.md` §1–4 y §11; `docs/task-log.md` (estado vivo).
2. Este plan; `docs/ui-redesign/game-ui-direction.md`;
   `.claude/skills/piel-del-valle/SKILL.md` (sobre todo §0) y
   `.agents/skills/threejs-game-ui-designer/SKILL.md` con su referencia.
3. Las tres skills externas en `.claude/skills/` para Claude Code o en la
   instalación global de Codex; `game-ui-ux/references/layout-and-flow.md` al
   revisar escalado, foco y hojas.
4. `docs/interfaz/2026-09-27/README.md` y las cuatro capturas enlazadas en §3;
   `docs/visual-reference/ui-wood/` para la materia aprobada.

> **Encargo R0/R1.** Audita la UI actual de The Valley con
> `redesign-existing-projects`. Usa la dirección de
> `propuesta-piel-v2-2026-09-28.md` con `frontend-design`, aplicada al valle,
> crónica, carro, encrucijada y ventanas A1/B1 reales.
> Usa `game-ui-ux` y `threejs-game-ui-designer` para revisar flujo y móvil.
> Elimina el fondo de piedra de la botonera inferior.
> Respeta las decisiones locales de Vera o señala con claridad la alternativa
> que propones cambiar. Entrega matriz de problemas con evidencia, comparativas
> de cabecera y navegación, reglas de composición y estados. Las láminas
> documentales son la entrada; la aceptación final requiere verlo en el juego.

El informe debe contestar una pregunta falsable: **¿se identifica antes la
acción o información importante y se percibe más valle y más juego que en las
capturas base, sin perder claridad ni personalidad?** Si la respuesta no es
visible en el antes/después, la propuesta vuelve a composición.

## 6. Registro de decisiones de esta ronda

| Fecha | Decisión | Motivo |
|---|---|---|
| 28 sep 2026 | Instalar las tres skills externas y usarlas junto a las locales. | La dirección artística propia fija el lenguaje, pero el resultado actual necesita crítica, exploración visual y revisión de UI de juego. |
| 28 sep 2026 | Elegir dirección sobre cuatro pantallas reales antes de extender código. | Una colección de retoques aislados puede mejorar detalles y dejar intacta la composición que Vera rechaza. |
| 28 sep 2026 | Mantener las propuestas como candidatas hasta la revisión de Vera. | El salto estético es una decisión de producto y las diferencias entre opciones no son obvias ni medibles solo con tests. |
| 28 sep 2026 | Retirar el fondo de piedra de la botonera inferior. | Vera lo rechaza expresamente al revisar la interfaz actual. |
| 28 sep 2026 | Compartir las tres skills también con Claude Code desde `.claude/skills/`. | Claude Code las descubre como skills del proyecto; Obsidian no es un directorio de carga de skills. |
| 28 sep 2026 | Elegir A1 y B1, conservando concepto y rehaciendo acabado; madera para decidir y papel para leer. | Vera eligió las maquetas al conocer la UI v4.95 y pidió una propuesta detallada. |
| 28 sep 2026 | Una sola piel con variantes de cabecera y navegación, documentada en la propuesta enlazada. | Sustituye la exploración inicial de dos direcciones completas tras recibir decisiones visuales concretas. |
