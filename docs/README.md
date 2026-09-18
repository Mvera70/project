# La documentación de The Valley — el mapa

Se ordenó el 18 sep 2026, a petición del dueño del diseño: «se va acumulando
sin estructura y sin nada; ve limpiando también lo que es antiguo».

**Lo que no se hizo, y es deliberado: mover los documentos de sitio.** Los que
explican una decisión están citados desde los comentarios del código —
`rework.md` desde **136 ficheros**, `next-plan.md` desde 60, `findings-drama.md`
desde 46— y esas citas son la mitad del valor: dicen *por qué* una línea es como
es. Cambiarles la ruta las rompe todas a cambio de nada. Así que lo que se
ordena es **qué es cada cosa y si sigue viva**, no dónde vive.

---

## Si acabas de llegar, en este orden

1. **`CLAUDE.md`** (en la raíz del repositorio) — los innegociables y el estado.
2. **`design.md` §1–4** — decisiones cerradas, convenciones, modelo, el tick.
   **§1b es la meta del proyecto**: una villa cerrada que cae o aguanta.
3. **`task-log.md`** — el cuaderno: qué está en vuelo, qué cifras mandan y qué
   está abierto. Se lee antes de tocar nada y se actualiza al cerrar.
4. **`plan-meta.md`** — el mapa hacia la meta: ocho puntos, sus fases, qué es
   prioritario, la dificultad de cada uno y a qué agente va.

---

## Vivos: se leen y se actualizan

| Documento | Qué es |
|---|---|
| `design.md` | **La especificación.** La fuente de verdad. Todo lo demás la explica o la ejecuta |
| `changelog.md` | **El porqué de cada revisión.** Antes de deshacer una decisión, se busca aquí |
| `task-log.md` | **El cuaderno de tareas.** El punto exacto: en vuelo, cifras, abierto |
| `plan-meta.md` | **El plan hacia la meta** (§1b), con prioridad, dificultad y agente |
| `encargos-3d.md` | **Todo lo que hace falta de Blender**, apuntado en la misma ronda en que se descubre |
| `handover.md` | El estado exacto de cada pieza y las trampas que ya costaron tiempo |
| `roadmap.md` | Qué falta en total, y qué no puede hacer ningún agente |
| `agents.md` | Cómo se delega y se audita |
| `dos-sesiones.md` | Quién toca qué cuando hay dos sesiones a la vez |

## Medidas: evidencia que sigue valiendo

No se tocan salvo para remedir. Cada uno dice qué se midió, cuándo y con qué.

| Documento | Qué mide |
|---|---|
| `findings-drama.md` | Los dos sistemas del motor que no se disparaban nunca (13 sep). **La medida sigue valiendo**; el plan de arreglarla, no |
| `rey-medida.md` | Qué llegó y qué no de la fase del rey (K-6) |
| `dead-code-audit-2026-09-17.md` | El código muerto que se encontró al auditar |
| `catalogo-historias-y-encrucijadas.md` | Qué historias tiene el catálogo y cuáles no salen |

## Encargos de arte abiertos

`encargos-3d.md` es el índice de todo; estos son los que tienen su propio
documento con medidas y presupuesto de triángulos.

| Documento | Qué pide |
|---|---|
| `encargo-arado.md` | La malla del arado (M-3) |
| `encargo-fuente.md` | La fuente de la plaza (P-3) |
| `plan-arte-pendiente.md` | Lo que el arte tiene en cola |
| `respuesta-sesion-blender.md` | Contexto para la sesión de Blender sobre los aldeanos nuevos |

## Cerrados: se conservan por el porqué, no se actualizan

**Entregaron lo suyo y siguen citados desde el código.** Se leen para entender
una decisión vieja, nunca para saber qué hacer ahora — para eso está
`plan-meta.md`. Cada uno lleva su estado escrito en la cabecera.

| Documento | Qué fue | Dónde acabó |
|---|---|---|
| `plan-juego.md` | El plan que sacó al proyecto del atasco (15 sep) | **Entregado**: v2.0, las órdenes permanentes y el mapa grande |
| `rework.md` | «Más azar y más vida» (15 sep) | **R-1 entregado** (los sucesos del valle). Lo que quedaba abierto lo recoge `plan-meta.md` |
| `plan-medios.md` | El juego de los medios (17 sep) | **Entregado**: M-0 a M-4, dar en vez de mandar |
| `plan-rey.md` | La fase del rey (18 sep) | **Entregado**: K-1 a K-8 |
| `next-plan.md` | Los briefs de la auditoría (15 sep) | **Entregado**: U-10 a U-14 |
| `brief-reloj.md` | Qué costaba afinar el tick (14 sep) | **Entregado**: v3.72, el reloj con horas |
| `life-ai-proposal.md` | Propuesta de IA para aldeanos y fauna (16 sep) | **Superada** por las rondas IA-1 a IA-18, que sí están implementadas |

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `graphics-rounds/` | El informe de cada ronda de gráficos (G-xx) |
| `life-rounds/` | El informe de cada ronda de la vida del valle (V-xx, IA-xx) |
| `ui-redesign/` | El rediseño de interfaz: plan, prototipos y capturas |
| `observations/` | Las observaciones del valle en marcha |
| `visual-reference/` | La referencia visual del dueño del diseño |
| `sesiones/` | Notas de sesión |

---

**Cómo se mantiene esto.** Un documento nuevo entra en una de las cuatro listas
de arriba el día que se escribe. Un plan que entrega se mueve a «cerrados» con
una línea de qué entregó — no se borra: lo que explica por qué una línea de
código es como es vale más que el sitio que ocupa.
