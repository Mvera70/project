# OBS-01 · Batería de observación distribuida

17 septiembre 2026. Encargo: detectar anomalías antes de corregirlas, con tres
agentes Luna y revisión del coordinador. Aplicar la skill
`.claude/skills/observe-valley-life/SKILL.md` desde la raíz del proyecto.

## Versión observada

HEAD al empaquetar: `3f9aa2803f32ac2e08f387594f14563d75b425b9`.
Había cambios concurrentes en `src/ui/redesign/hud.ts` y `skin.css`.
Por ello el identificador del experimento es el hash del bundle, no sólo HEAD:
`5ACF3BBF46F435F2C9E3FFD5D2F13E6473E1ADCD9602AA0F66F3FC1C4894348D`.
Bundle inicial inmutable:
`artifacts/graphics/OBS-01/game/valley.html`.

El arranque de ese artefacto falló por una edición concurrente de la UI (INS-01).
Control funcional usado para las tomas posteriores:
`artifacts/graphics/G-24-ford/game/valley.html`, SHA256
`EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`.
No mezclar sus resultados con el bundle fallido ni certificar cambios UI posteriores.

## Matriz y propietarios

| Informe | Agente | Muestra prevista | Pregunta |
|---|---|---|---|
| day.md | Luna | 11/20 y 43/60; 45 s, 2 fps, estado fijo | ¿Llegan al puesto, ejercen, juegan, descansan y conversan de forma coherente? |
| night.md | Luna | 7/1 y 43/60; 42 s, 2 fps, vivo ×64 | ¿Vuelven, usan puertas, duermen y salen? ¿Avanza el motor? |
| animals.md | Luna | 11/20 y 43/60; generales y dos acercamientos de 4 s a 15 fps | ¿Coinciden cuerpo, malla, gesto y reacción? |
| world.md | Coordinador | 7/1, píxel y geometría GLB publicada | ¿Coincide la huella visible con la celda y el terreno? |

Cada agente escribe sólo su informe y su carpeta de evidencia. No modifica el
juego, no reconstruye el bundle, no cambia umbrales ni ejecuta la suite completa.
Tres navegadores como máximo a la vez; el coordinador evita añadir carga larga.
Si un caso falla por instrumentación, registrarlo como bloqueado y hacer una
comprobación independiente. No repetir indefinidamente el mismo comando.

## Formato de hallazgo

ID estable, gravedad, esperado, observado, semilla/año, modo, velocidad,
tiempo e id del cuerpo, comando exacto, ruta de PNG y traza, y confianza:
**confirmado**, **sospecha**, **no observado** o **bloqueado**.
Separar fallos visuales, conductuales y del instrumento. No observado no equivale
a correcto. Enumerar especies, edades, gestos y edificios realmente cubiertos.

Un contador en cero no valida la silueta ni el tamaño de una malla. Revisar
fotogramas consecutivos y, en sólidos, su geometría transformada. Una raíz en la
celda correcta puede tener todos sus vértices en la celda vecina.
`firstTick == lastTick` invalida la afirmación de evolución persistente aunque
la escena atraviese varias noches. Registrar también arranque y selectores rotos.

## Repetición y cierre

Antes de repartir trabajo, hacer un arranque corto y comprobar `pageerror`,
población y WebGL. OBS-01 detectó que empaquetar una edición concurrente a medias
puede invalidar todas las tomas: preferir un checkout de commit estable, o conservar
una instantánea identificada y pasar la prueba de arranque antes de delegar.

Cada observador debe dedicar una pasada al cuadro completo, no sólo a la hipótesis:

- Objetos flotantes, enterrados, superpuestos, fuera de su terreno o tapando accesos.
- Rutas que terminan sin llegar, oscilaciones, giros repetidos y saltos de posición.
- Gestos sin herramienta o lejos del objeto de uso; herramienta atravesando cuerpo.
- Burbujas sin interlocutor o desincronizadas con quién habla.
- Niños trabajando, mayores sin descanso, desplazamientos sin marcha visible.
- Animales visibles que no aparecen en contadores y cuerpos contados fuera de cámara.

No confundir una observación poco frecuente con una ausencia funcional. Para juzgar
un ciclo completo hay que capturar su comienzo, desarrollo y final. Mantener una
tabla de cobertura real: un plano general a 2 fps no evalúa articulación, y una
semilla sin vacas no da un resultado verde a las vacas.

Para una nueva tanda, sustituir OBS-01 por una carpeta nueva, empaquetar una vez,
guardar SHA256 y estado Git y repartir esta matriz. Usar los comandos de cada
informe, con rutas nuevas. El coordinador abre la evidencia de cada hallazgo,
descarta duplicados y redacta `conclusions.md` con prioridades y cobertura faltante.
Presupuesto inicial: unos diez minutos por agente; si no alcanza, informar la
cobertura real. No cerrar como verde una categoría que no se ha observado.
