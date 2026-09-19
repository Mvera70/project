# La documentación de The Valley — el mapa

Se ordenó el 18 sep 2026 y **se repartió en carpetas el 19 sep 2026**, las dos
veces a petición del dueño del diseño: «se va acumulando sin estructura y sin
nada; ve limpiando también lo que es antiguo», y después «crear una división de
docs actuales e histórico, para no mezclar lo antiguo con lo vigente».

**Lo que hay en la raíz de `docs/` está vivo.** Lo que entregó lo suyo está en
`historico/` y no se actualiza. Lo que se midió una vez está en `medidas/`. Lo
que le falta al arte está en `encargos/`. Un documento que no encaje en ninguna
de las cuatro es un documento que nadie sabrá dónde buscar.

**Al mover, se reescribieron las referencias.** Son 398, repartidas por 130
ficheros —código, pruebas, herramientas y los propios documentos—, y esas citas
son la mitad del valor: dicen *por qué* una línea es como es. Si mueves un
documento, las citas se mueven con él en la misma ronda.

---

## Si acabas de llegar, en este orden

1. **`CLAUDE.md`** (en la raíz del repositorio) — los innegociables y el estado.
2. **`design.md` §1–4** — decisiones cerradas, convenciones, modelo, el tick.
   **§1b es la meta del proyecto**: una villa cerrada que cae o aguanta.
3. **`task-log.md`** — el cuaderno: qué está en vuelo, qué cifras mandan y qué
   está abierto. Se lee antes de tocar nada y se actualiza al cerrar.
4. **`plan-meta.md`** — el mapa hacia la meta: ocho puntos, sus fases, qué es
   prioritario, la dificultad de cada uno y a qué agente va.

Y para las herramientas, **`tools/README.md`**: el catálogo de las seis
carpetas de `tools/`, con qué mide cada informe y cómo se lanza.

---

## Vivos: se leen y se actualizan — `docs/`

| Documento | Qué es |
|---|---|
| `design.md` | **La especificación.** La fuente de verdad. Todo lo demás la explica o la ejecuta |
| `changelog.md` | **El porqué de cada revisión.** Antes de deshacer una decisión, se busca aquí |
| `task-log.md` | **El cuaderno de tareas.** El punto exacto: en vuelo, cifras, abierto |
| `plan-meta.md` | **El plan hacia la meta** (§1b), con prioridad, dificultad y agente |
| `plan-disparo-unico.md` | **El brief de Astra** (19 sep): lo que ha pasado en dos días para que lo revise, y la tarea — clips que ocurren en un instante y sostienen su última pose. Desbloquea E1 y con ella el bloque de arte entero |
| `plan-final.md` | **El final de una partida**: la lápida, la hoja de cuentas y el cronicón (F3), con fases por agente y las decisiones que son del dueño |
| `encargos-3d.md` | **Todo lo que hace falta de Blender**, apuntado en la misma ronda en que se descubre |
| `plan-arte-pendiente.md` | La cola del arte: cada crónica nueva trae aquí su imagen pedida |
| `plan-audio.md` | **Inventario maestro de audio**: ambiente, interfaz, economía, hitos, fases y asedio |
| `handover.md` | El estado exacto de cada pieza y las trampas que ya costaron tiempo |
| `roadmap.md` | Qué falta en total, y qué no puede hacer ningún agente |
| `agents.md` | Cómo se delega y se audita |
| `dos-sesiones.md` | Quién toca qué cuando hay dos sesiones a la vez |

## Medidas: evidencia que sigue valiendo — `docs/medidas/`

No se tocan salvo para remedir. Cada uno dice qué se midió, cuándo y con qué.
Las herramientas que las produjeron están en `tools/reports/`.

| Documento | Qué mide |
|---|---|
| `medidas/findings-drama.md` | Los dos sistemas del motor que no se disparaban nunca (13 sep). **La medida sigue valiendo**; el plan de arreglarla, no |
| `medidas/rey-medida.md` | Qué llegó y qué no de la fase del rey (K-6) |
| `medidas/dead-code-audit-2026-09-17.md` | El código muerto que se encontró al auditar |
| `medidas/catalogo-historias-y-encrucijadas.md` | Qué historias tiene el catálogo y cuáles no salen |
| `medidas/letalidad-por-decision-2026-09-19.md` | **Qué decisiones acumulan la caída (G4)**, por contrafactual: lo que mata es no prepararse para el asedio, y es lo que elige la política prudente |
| `medidas/banco-de-balance-2026-09-19.md` | **El banco remedido (G2)**: 11 rojas de 37 y 31 minutos, no 19 y 45; las cuatro rojas con su causa; y que el catálogo no tenía contenido muerto, lo tenía el banco que lo medía |

## Encargos de arte abiertos — `docs/encargos/`

`encargos-3d.md` (en la raíz) es el índice de todo; éstos son los que tienen su
propio documento con medidas y presupuesto de triángulos.

| Documento | Qué pide |
|---|---|
| `encargos/encargo-combate.md` | **Los seis clips de combate (E1)**, el camino largo de la fase 4 |
| `encargos/encargo-arado.md` | La malla del arado (M-3) |
| `encargos/encargo-fuente.md` | La fuente de la plaza (P-3) |
| `encargos/respuesta-sesion-blender.md` | Contexto para la sesión de Blender sobre los aldeanos nuevos |

## Histórico: se conserva por el porqué — `docs/historico/`

**Entregaron lo suyo y siguen citados desde el código.** Se leen para entender
una decisión vieja, nunca para saber qué hacer ahora — para eso está
`plan-meta.md`. Tienen su propio índice en
[`historico/README.md`](historico/README.md), con qué entregó cada uno.

| Documento | Qué fue | Dónde acabó |
|---|---|---|
| `historico/plan-juego.md` | El plan que sacó al proyecto del atasco (15 sep) | **Entregado**: v2.0, las órdenes permanentes y el mapa grande |
| `historico/rework.md` | «Más azar y más vida» (15 sep) | **R-1 entregado** (los sucesos del valle). Lo que quedaba abierto lo recoge `plan-meta.md` |
| `historico/plan-medios.md` | El juego de los medios (17 sep) | **Entregado**: M-0 a M-4, dar en vez de mandar |
| `historico/plan-rey.md` | La fase del rey (18 sep) | **Entregado**: K-1 a K-8 |
| `historico/next-plan.md` | Los briefs de la auditoría (15 sep) | **Entregado**: U-10 a U-14 |
| `historico/brief-reloj.md` | Qué costaba afinar el tick (14 sep) | **Entregado**: v3.72, el reloj con horas |
| `historico/life-ai-proposal.md` | Propuesta de IA para aldeanos y fauna (16 sep) | **Superada** por las rondas IA-1 a IA-18, que sí están implementadas |
| `historico/graphics-rounds/` | El informe de cada ronda de gráficos (G-xx) | Cerradas: G-00 a G-25 |
| `historico/life-rounds/` | El informe de cada ronda de la vida del valle (V-xx, IA-xx) | Cerradas: V-00 a V-14, IA-0 a IA-18 |
| `historico/sesiones/` | Notas de sesión | — |

## Carpetas que se quedan donde están

| Carpeta | Qué hay | Por qué no se movió |
|---|---|---|
| `ui-redesign/` | El rediseño de interfaz: plan, piel, rondas, prototipos y capturas | **Está vivo**: sus PNG y sus planes los citan `src/ui/`, treinta pruebas y las skills `piel-del-valle` y `calcar-iconos` |
| `observations/` | Las observaciones del valle en marcha (OBS-01, OBS-02) | Evidencia reciente, en su propia carpeta desde el principio |
| `visual-reference/` | La referencia visual del dueño del diseño | Material aprobado, con su propio README y su verificador |

---

**Cómo se mantiene esto.** Un documento nuevo entra en una de las cuatro listas
de arriba —y en su carpeta— el día que se escribe. Un plan que entrega se mueve
a `historico/` con una línea de qué entregó, y **sus referencias se reescriben
en la misma ronda**; no se borra: lo que explica por qué una línea de código es
como es vale más que el sitio que ocupa.
