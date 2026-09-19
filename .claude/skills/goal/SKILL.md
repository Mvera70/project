---
name: goal
description: Abre una ronda contra la meta del proyecto (docs/plan-meta.md). Úsala cuando el dueño diga «/goal <fase>» o pida trabajar en una fase de la meta — la villa cerrada, el asedio, el portón, las físicas, los clips de combate. Encierra la disciplina de ronda: leer el plan, medir, escribir el porqué y dejar el cuaderno al día.
---

# Una ronda contra la meta

La meta está en `docs/design.md` §1b y el mapa en `docs/plan-meta.md`. Esta
skill es cómo se trabaja una de sus fases, no qué fase.

## 1 · Antes de tocar código

Lee, en este orden y sin saltarte ninguno:

1. `docs/plan-meta.md` — la fila de la fase: qué es, de qué depende, quién la
   hace. Si algo de lo que depende no está hecho, **dilo y para**.
2. `docs/design.md` §1b — la meta y las cuatro decisiones del dueño del
   18 sep 2026 (caer tiene dos tamaños; ataca otro valle; las físicas son
   Rapier; se cae por las decisiones).
3. `docs/task-log.md` §4 — lo abierto, por si la fase lo roza.
4. `CLAUDE.md` — los innegociables, que siguen mandando.

## 2 · Las tres reglas que esta skill existe para recordar

**No calibres contra el juego de hoy.** Vienen muchos más eventos, edificios y
recursos, y van a mover la economía entera. Una medida rara es un dato, no una
alarma; elige el contrato que aguante más cosas encima, no el que cuadra con
las cifras de esta semana. El nivelado va al final y es del dueño.

**Ningún número se inventa** (CLAUDE.md). Todo TUNE en `balance.ts` con su
medida escrita al lado: qué se midió, en cuántas semillas, y qué salía antes.

**Lo que decide *cuándo* pasa algo se mira en horas de reloj**, no en años:
`npx tsx tools/reports/pace-report.ts`. A catorce minutos por semana, una hora real es
un mes de juego.

## 3 · El trabajo

Elige el contrato pensando en la fase 4: lo que se construya ahora tiene que
poder romperse, verse y contarse cuando llegue el asedio. Prefiere la
maquinaria que ya existe —una ruina es un `lostTick`, una marca cabe en
`state.flags`, una decisión de la aldea se apunta como se apuntó el anillo— a
un campo nuevo en el esquema; si hace falta el campo, sube `SCHEMA_VERSION` con
su migración y dilo en el PR.

## 4 · Cerrar

Una fase no está cerrada sin las cuatro cosas:

1. **La medida.** En horas de reloj si decide cuándo; con una toma del
   observatorio (`observe-valley-life`) si es de la capa de vida; con captura
   (`npm run shot`) si es de interfaz. Varias semillas, nunca una.
2. **La prueba**, que describe la propiedad del diseño y no la implementación.
   Si tarda minutos, va a `tests/journeys/`. Si algo no llega, se escribe lo
   medido y se deja `it.fails` con la propiedad intacta.
3. **La puerta**: `npm run typecheck`, `npm run lint` y los ficheros tocados.
   La suite entera sólo al cerrar una tanda.
4. **El papel**: la fila de `docs/plan-meta.md` tachada con lo medido, la
   entrada en `docs/changelog.md` con el porqué, y `docs/task-log.md` al día.
   Commit por rutas explícitas —nunca `git add -A`— y el motivo en el mensaje.

## 4b · Y lo que la pantalla no cuenta

**Toda mecánica que se diseñe sin representación real se apunta en
`docs/encargos-3d.md`, en la misma ronda.** No sólo las mallas que falten:
también las animaciones, los sucesos y los efectos que el motor sabe y la
pantalla no enseña. Es del dueño del diseño, dos veces: «todas estas cosas que
estemos diseñando que no tengan una representación real… todo eso hay que ir
anotándolo como pendiente». Una mecánica que no se ve no existe para quien
juega, y un encargo que sólo vive en un comentario del código es un encargo que
nadie hará.

## 4c · Y una crónica sin su imagen pedida

**Toda línea de crónica nueva crea, en la misma ronda, la tarea de pedir su
ilustración**, en `docs/plan-arte-pendiente.md`: fichero, clave y qué tiene que
enseñar. Es del dueño del diseño, 18 sep 2026 —«cada vez que crees una crónica
hay que ir creando la tarea de pedir las imágenes»— y es la gemela de §4b.

Sin ella la línea cae al respaldo por `kind` y nadie se entera: `wall.closed`
—el cierre de la villa, peso 3, una vez en la vida de una aldea— compartía el
grabado genérico de construcción con «se ha levantado un campo», y lo mismo les
pasaba al portón, a la muralla de piedra y a la atalaya.

## 5 · Lo que no decides tú

Qué es «caer» en detalle, cómo se ve el gore, cuánto hay que nivelar, y qué se
le encarga a Blender y en qué orden. Eso es del dueño: se le pregunta.
