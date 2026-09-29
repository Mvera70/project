# La documentación de The Valley — el mapa

Se ordenó el 18 sep 2026 y **se repartió en carpetas el 19 sep 2026**, las dos
veces a petición del dueño del diseño: «se va acumulando sin estructura y sin
nada; ve limpiando también lo que es antiguo», y después «crear una división de
docs actuales e histórico, para no mezclar lo antiguo con lo vigente».

**Lo que hay en la raíz de `docs/` está vivo.** Lo que entregó lo suyo está en
`historico/` y no se actualiza. Lo que se midió una vez está en `medidas/`. Lo
que le falta al arte está en `encargos/`. Un documento que no encaje en ninguna
de las cuatro es un documento que nadie sabrá dónde buscar.

**Y se limpió el 27 sep 2026**: seis planes y veintiocho encargos entregados
pasaron a `historico/` con sus citas reescritas, y `design.md` volvió a
describir el juego vivo.

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
| `encargos-3d.md` | **Todo lo que el juego no enseña todavía**: mallas, animaciones y mecánicas sin representación, apuntado en la misma ronda en que se descubre |
| `interfaz/` | **La interfaz, versión a versión**: una carpeta por fecha con todas las pantallas y estados del juego (skill `press-kit`), para comparar qué cambió |
| `plan-animacion-integral-movil-2026-09-29.md` | **La ronda AN de animación** (29 sep): fases AN-0 a AN-4, brief y ficheros permitidos por fase, y los briefs de las correcciones que salieron (AN-1a zancada, AN-1b rumbo, AN-2a pelota, AN-2b martillo, AN-3a oso); al final, el encargo original de Astra tal cual |
| `ideas-fisica-y-app-nativa-2026-09-29.md` | **Combate físico y aplicación móvil** (Astra, 29 sep): las tres vías tras AN-4 —ampliar Rapier, empaquetar con Capacitor, otro motor sólo con causa— y el estudio de portabilidad a Switch; pendiente de decisión. Su lectura crítica, en el diagnóstico de abajo §5 |
| `diagnostico-fisica-combate-2026-09-29.md` | **¿Decide la física las batallas?** (29 sep): qué decide hoy Rapier (el vuelo de la flecha, si la para una almena, cómo caen los muertos) y qué es distancia y reloj (acierto, cuerpo a cuerpo, portón); los límites para avanzar sin cambiar de motor y qué medir en el móvil; **F-0 hecho y medido** («la flecha que toca», en sombra: el contacto cambiaría el 31–40 % de las bajas por flecha) con su veredicto y la propuesta F-1; qué cuidar de la animación; y la nota de Astra leída con lupa |
| `plan-atlas-movil-2026-09-29.md` | **Atlas Agent Teams aplicado a The Valley** (Astra, 29 sep): veredicto sobre Atlas y las líneas que vienen después de la animación (interfaz, legibilidad, descubrimiento web, seguridad) |
| `plan-arte-pendiente.md` | La cola del arte: cada crónica nueva trae aquí su imagen pedida |
| `plan-audio.md` | **Inventario maestro de audio**: ambiente, interfaz, economía, hitos, fases y asedio. En curso |
| `agents.md` | Cómo se delega y se audita |
| `dos-sesiones.md` | Quién toca qué cuando hay dos sesiones a la vez |

## Medidas: evidencia que sigue valiendo — `docs/medidas/`

No se tocan salvo para remedir. Cada uno dice qué se midió, cuándo y con qué.
Las herramientas que las produjeron están en `tools/reports/`.

| Documento | Qué mide |
|---|---|
| `medidas/animacion-matriz-2026-09-29.md` | **La matriz de animación (AN-0 a AN-4)**: 24 clips humanos, 15 especies y la golondrina, con origen, situación en partida, evidencia, defecto, gravedad, coste y decisión; línea de base y «después» de cada fase (cadencia, apoyo, plantado, rumbo, mezclas, gestos, combate) y los veredictos de AN-4 |
| `medidas/animacion-tomas-2026-09-29.md` | **El índice de las tomas de la ronda AN**: cada toma del observatorio con semilla, año, lead, fps, viewport, cámara y escenario, y las hojas de gestos |
| `medidas/findings-drama.md` | Los dos sistemas del motor que no se disparaban nunca (13 sep). **La medida sigue valiendo**; el plan de arreglarla, no |
| `medidas/rey-medida.md` | Qué llegó y qué no de la fase del rey (K-6) |
| `medidas/spatial-engine.md` | Cierre real, accesos y trazado en cuatro semillas; límites y reproducción |
| `medidas/spatial-plaza.md` | Desfase plaza/vida y visitas al claro al separar los dos lugares |
| `medidas/dead-code-audit-2026-09-17.md` | El código muerto que se encontró al auditar |
| `medidas/catalogo-historias-y-encrucijadas.md` | Qué historias tiene el catálogo y cuáles no salen |
| `medidas/letalidad-por-decision-2026-09-19.md` | **Qué decisiones acumulan la caída (G4)**, por contrafactual: lo que mata es no prepararse para el asedio, y es lo que elige la política prudente |
| `medidas/banco-de-balance-2026-09-19.md` | **El banco remedido (G2)**: 11 rojas de 37 y 31 minutos, no 19 y 45; las cuatro rojas con su causa; y que el catálogo no tenía contenido muerto, lo tenía el banco que lo medía |
| `medidas/rendimiento-piel-v9-2026-09-29.md` | **¿La piel v9 hunde el rendimiento?** No por fotograma; `?debug=1` no sirve para medir el 3D; la adaptativa medía un delta recortado. Lo que falta: el reparto del fotograma leído en la tablet |
| `medidas/p1a-rendimiento-seed11-year21-2026-09-22.md` | P-1a: renderer y app real en semilla 11/año 21; comparación controlada de día/noche/lluvia, datos crudos y límites |
| `medidas/auditoria-cosas-a-medias-2026-09-24.md` | **Lo que la aldea dejaba a medias** (24 sep), pedido por el dueño tras probar la demo: material tirado, herrería vacía, granero sin nadie, gente reunida sin hacer nada. Sólo observación, con `observe-life.mjs` |

## Encargos de arte abiertos — `docs/encargos/`

`encargos-3d.md` (en la raíz) es el índice de todo; éstos son los que tienen su
propio documento. **Los entregados están en `historico/encargos/`** (27 sep
2026): veintiocho, del arado y la fuente a toda la familia del bastión y el
adarve.

| Documento | Qué pide |
|---|---|
| `encargos/encargo-astra-modelos.md` | **Los modelos 3D para Astra**, con el prompt listo para pegar. Entregados la sala del líder, los puestos, la cantera, las rocas y la golondrina; **quedan el roble y la casa quemada**, a la espera de que Vera decida |
| `encargos/animacion-integral-goal.md` | **El encargo de la ronda AN de animación, de Astra** (29 sep): el bloque `/goal` completo, tal como se recibió |
| `encargos/opciones-graficas-v10.md` | **La pantalla «Graphics» para Codex**: lámina de revisión, un estado «elegido» del botón de pergamino si hace falta, y un grabado de cabecera |
| `encargos/profundidad-visual-movil-2026-09-29.md` | **La profundidad visual del valle en móvil** (encargo de Astra, `art/astra-modelos` `15b4f84`), **ejecutado el 29 sep 2026** con su resultado al final: el pie de los edificios, el prado hondo, el seguido a la vista bajo el bosque y el experimento de suavizado (sin cambiar el valor por omisión). Pendiente de verlo en un iPhone o iPad |
| `encargos/profundidad-visual-movil-revision-2026-09-29.md` | **La revisión crítica del encargo de profundidad visual en móvil** (el de Astra, `art/astra-modelos` `15b4f84`) y el plan que propone en su lugar: instrumentos, línea de base en el aparato, sombra de los pies, máscara de contacto, el seguido a la vista y suavizado. Pendiente de Vera |
| `encargos/respuesta-sesion-blender.md` | Contexto para la sesión de Blender sobre los aldeanos nuevos, con decisiones que el dueño dejó sin contestar |

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
| `historico/handover.md` | El estado exacto de cada pieza y sus trampas, a 15 sep | **Foto del 15 sep.** El estado vivo está en `task-log.md` y `plan-meta.md`; sus trampas siguen valiendo por el porqué |
| `historico/roadmap.md` | Qué faltaba en total y qué no podía hacer ningún agente (15 sep) | **Superado** por `plan-meta.md` (A–H); sus decisiones del dueño —el rework, los hitos 0 y 6 descartados— siguen citadas desde el código |
| `historico/plan-rendimiento.md` | P-1: rendimiento antes de más contenido (22 sep) | **P-1 cerrada** para seguir la hoja de ruta; la medida está en `medidas/p1a-…` |
| `historico/plan-disparo-unico.md` | El brief de Astra del 19 sep: clips que ocurren en un instante | **Entregado** con E1 (20 sep) |
| `historico/plan-final.md` | El final de una partida: lápida, hoja de cuentas y cronicón (F3) | **F3a–F3e hechas** (18–19 sep); sólo queda F3f, sin prioridad, en `plan-meta.md` |
| `historico/plan-espacial.md` | La aldea orgánica: caminos, plaza, viviendas y cierre real del recinto | **Aceptada** el 21 sep |
| `historico/encargos/` | Los veintiocho encargos de arte entregados o superados (27 sep) | Arado, fuente, combate, cuerpo a cuerpo, D6, E0a–E0e, E2 y la familia del bastión y el adarve, cerrada con E3b.3 |
| `historico/graphics-rounds/` | El informe de cada ronda de gráficos (G-xx, E3b) | Cerradas hasta E3b.3 (24 sep): el adarve se genera desde el anillo y E3 está completa |
| `historico/life-rounds/` | El informe de cada ronda de la vida del valle (V-xx, IA-xx) | Cerradas: V-00 a V-14, IA-0 a IA-18 |
| `historico/sesiones/` | Notas de sesión | — |

## Carpetas que se quedan donde están

| Carpeta | Qué hay | Por qué no se movió |
|---|---|---|
| `ui-redesign/` | El rediseño de interfaz: plan, piel, rondas, prototipos y capturas | **Está vivo**: sus PNG y sus planes los citan `src/ui/`, treinta pruebas y las skills `piel-del-valle` y `calcar-iconos` |
| `observations/` | Las observaciones del valle en marcha (OBS-01, OBS-02) | Evidencia reciente, en su propia carpeta desde el principio |
| `visual-reference/` | La referencia visual del dueño del diseño | Material aprobado, con su propio README y su verificador |
| `art-direction-mobile-2026-09/` | Capturas fuente, láminas generadas y workflow reproducible para la piel móvil | Material de trabajo vigente de «Diorama vivo + libro de crónica» |

---

**Cómo se mantiene esto.** Un documento nuevo entra en una de las cuatro listas
de arriba —y en su carpeta— el día que se escribe. Un plan que entrega se mueve
a `historico/` con una línea de qué entregó, y **sus referencias se reescriben
en la misma ronda**; no se borra: lo que explica por qué una línea de código es
como es vale más que el sitio que ocupa.
