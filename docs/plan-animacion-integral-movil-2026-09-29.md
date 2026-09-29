# Animación integral de aldeanos y animales · móvil

**29 sep 2026 · objetivo principal vigente.** Vera quiere mejorar **todas las animaciones de aldeanos y animales**. La pantalla de referencia es el móvil; el navegador de escritorio sirve para producir y comparar evidencia. La animación de la interfaz V9, SEO y seguridad tienen planes aparte y no consumen esta tanda.

Este es un programa de rondas consecutivas, con inventario cerrado y aceptación visual por familia. Cada ronda entrega mejoras donde se observen defectos; la auditoría sola no cierra el programa. Se conserva la simulación, sus guardados y el resultado de las batallas.

## Inventario que hay que cubrir

**Aldeanos.** `src/render3d/clips.ts` declara 24 clips. Cuatro vienen en los GLB (`idle`, `walk`, `work_hoe`, `carry_walk`); veinte se fabrican en `src/render3d/action-clips.ts`: `sit`, `talk`, `pray`, `hammer`, `chop`, `mine`, `sow`, `spread`, `douse`, `play`, `drink`, `sort`, `shelter`, `bow_draw`, `bow_loose`, `gate_strike`, `spear_thrust`, `hit_take`, `fall` y `flee`. Las variantes de niño, mayor, oficios y clan vecino comparten esos nombres, pero deben revisarse en sus proporciones reales. `src/render3d/world/cast.ts` mezcla gestos ordinarios y ata los de combate a su hecho.

**Animales.** `art/catalog.json` registra estas quince especies con clips publicados; `src/render3d/effects/animal-motion.ts` mezcla reposo y desplazamiento, reproduce acciones y sincroniza el paso con la distancia. El perro añade `run`, `bark` y `play` en `animal-gestures.ts` si el GLB no los trae.

| Vida cotidiana | Clips del GLB | Fauna libre y encuentros | Clips del GLB |
|---|---|---|---|
| vaca (`cow`) | `idle`, `walk` | lobo (`wolf`) | `idle`, `walk`, `attack` |
| cerdo (`pig`) | `idle`, `walk` | cuervo (`crow`) | `idle`, `walk` |
| gallina (`hen`) | `idle`, `walk` | pez (`fish`) | `idle`, `walk` (nado) |
| perro (`dog`) | `idle`, `walk` | zorro (`fox`) | `idle`, `walk` |
| pato (`duck`) | `idle`, `walk` | ciervo (`deer`) | `idle`, `walk` |
| mula (`mule`) | `idle`, `walk` | jabalí (`boar`) | `idle`, `walk`, `charge`, `attack` |
| | | oso (`bear`) | `idle`, `walk`, `attack` |
| | | conejo (`rabbit`) | `idle`, `hop`, `flee` |
| | | perdiz (`partridge`) | `idle`, `walk`, `takeoff`, `flight` |

**También entra el vuelo ambiental:** `bird.glb` y el aleteo instanciado de `src/render3d/effects/ambience.ts`. La tabla es el mínimo conocido; AN-0 busca cualquier animación animal activa que no aparezca aquí y la añade al inventario antes de afirmar cobertura completa.

## Qué significa «mejor»

La [guía de animación de Atlas](https://github.com/MonumentalSystems/Atlas-Agent-Teams/blob/main/teams/3d-design/skills/animation/SKILL.md) propone revisar poses, anticipación, peso, continuidad y mezclas. En The Valley esas preguntas se convierten en observaciones a tamaño de juego, no en una lista de efectos nuevos:

- **Movimiento:** patas y pies alternan apoyos; al apoyar, no resbalan; la orientación acompaña la trayectoria sin giro brusco; parar y reanudar conserva continuidad.
- **Acción:** se distingue preparación, acto y recuperación cuando el gesto lo necesita; herramienta, presa, suelo u objeto reaccionan en el mismo instante; el cuerpo comunica peso sin gesticular fuera de escala.
- **Especie y edad:** vaca, gallina, pez, perro y aldeano no comparten el mismo ritmo por accidente; niño y mayor conservan una marcha plausible con sus tallas reales.
- **Lectura móvil:** se entiende en cámara normal a 390×844 y en pantalla estrecha de 320×568. Un primer plano puede diagnosticar, pero no basta para aprobar.
- **Coste:** no se cambia una animación por más draw calls, huesos, clips o trabajo de CPU sin comparar la base. La skill local `.claude/skills/performance/SKILL.md` deja claro que los FPS de SwiftShader no representan un teléfono; la última aceptación es en un aparato real.

Un clip que ya cumple estos criterios puede conservarse, con evidencia. «Todas» exige **revisar cada fila y cada gesto**, corregir los defectos detectados y documentar por qué se mantienen los que ya funcionan; no exige introducir cambios arbitrarios en cada archivo.

## Rondas y puerta de cada una

| Ronda | Alcance completo | Resultado que se entrega |
|---|---|---|
| **AN-0 · Inventario y línea de base** | Los 24 clips humanos, las 15 especies, los tres gestos extra del perro y las aves ambientales. Confirmar cuáles se ven en juego y cuáles sólo en banco. | Matriz por clip/especie: origen GLB o código, situación real, defecto visible, gravedad/frecuencia, toma, coste y decisión. Hojas de contacto y trazas reproducibles. La prioridad de arreglo sale de esa evidencia. |
| **AN-1 · Locomoción y transiciones** | Humanos `idle`, `walk`, `carry_walk`, `flee` y sus variantes; todas las especies en reposo/desplazamiento (`walk`, `hop`, nado, `run`, `flight`), con giro, parada y arranque. | Mejoras visibles en los casos débiles de ambos grupos; comparación antes/después, apoyo y deslizamiento medidos, pruebas focales y coste. |
| **AN-2 · Vida y oficios** | Humanos `work_hoe`, `sit`, `talk`, `pray`, `hammer`, `chop`, `mine`, `sow`, `spread`, `douse`, `play`, `drink`, `sort`, `shelter`; perro `bark` y `play`; vuelo ambiental. | Gestos legibles y distintos, manos/herramientas con contacto, eventos sincronizados; revisión de todos los clips enumerados. |
| **AN-3 · Encuentros y combate** | Humanos `bow_draw`, `bow_loose`, `gate_strike`, `spear_thrust`, `hit_take`, `fall`; animales `takeoff`, `charge`, `attack`, `flee`, `down` donde existan y se usen. | Acción y reacción coinciden con flechas, impactos y físicas; sin alterar daños, resultado de batalla ni instantes del motor. |
| **AN-4 · Aceptación de conjunto** | Dos edades de aldea, dos semillas, un asalto y las situaciones raras que no surjan naturalmente. Teléfono y tableta reales cuando estén disponibles. | Índice de las tomas finales, matriz cerrada sin filas sin revisar, regresiones resueltas y coste comparado. Lo no visible en partida queda marcado `preview-only`, no aceptado como integración real. |

AN-0 y AN-1 forman la **siguiente tanda**. Las otras rondas continúan el mismo objetivo hasta completar el inventario. Si el diagnóstico revela que un defecto vive en un GLB o rig, se corrige desde su receta reproducible (`art/recipes/`) y se publica por el pipeline existente en una ronda con sus archivos propios; no se sustituye una malla ni se exige Blender abierto para evitar describir el problema.

## Brief de la siguiente tanda · AN-0 + AN-1

**Depende de:** `CLAUDE.md`; `docs/design.md` §1–4, D.4, D.6, D.9 y E.1/E.3/E.6/E.7; `docs/task-log.md`; este plan; `.claude/skills/observe-valley-life/SKILL.md`; `.claude/skills/performance/SKILL.md`; y el catálogo de herramientas `tools/README.md`.

**Ficheros de producción AN-1:** `src/render3d/clips.ts`, `src/render3d/world/cast.ts`, `src/render3d/effects/animal-motion.ts`, `src/render3d/effects/animal-gestures.ts`. Sólo si AN-0 muestra un defecto de las poses procedurales de locomoción: `src/render3d/action-clips.ts`. AN-0 es de lectura y artefactos. Pruebas pertinentes: `tests/fast/graphics-clock.test.ts`, `tests/fast/procedural-clips.test.ts`, `tests/fast/graphics-animal-motion.test.ts`, `tests/fast/animal-gait-axis.test.ts`, `tests/fast/animals.test.ts` y las pruebas de contacto afectadas. Otros ficheros, incluidos `life/`, motor, UI, balance, catálogo y GLB, requieren un brief de la ronda correspondiente basado en el hallazgo; no se amplía AN-1 en silencio.

**Parte 0 · Cierres y línea de base.** Confirmar qué cambios ajenos hay en el worktree. Construir la matriz completa de AN-0 desde catálogo y usos reales. Usar `gesture-sheet.mjs` para humanos y `animals-preview.mjs`/`animal-gait-compare.mjs` para las quince especies; identificar si el banco representa el movimiento en partida. Capturar tomas cortas del navegador real con `observe-life.mjs`: a 15 fps durante 4–8 s para paso, transiciones y acciones; mismo actor, semilla, año, hora, cámara y zoom antes/después. No lanzar `press-kit` ni recorridos largos para esta tarea. En cada caso anotar visibilidad real y un defecto preciso, no «se ve raro». Mirar en 390×844 y 320×568.

**Parte 1 · Locomoción humana.** Corregir lo que AN-0 haya localizado en arranque, giro, parada, paso y transición entre `idle`/`walk`/`carry_walk`/`flee`. Comprobar adulto, niño, mayor y clan vecino. Conservar zancada por distancia, posición real, modelo elegido y poses reproducibles al suspender la pestaña.

**Parte 2 · Locomoción animal.** Recorrer las quince especies y corregir las fallas de reposo/desplazamiento detectadas: apoyo, orientación, mezcla, fase, vuelo/nado y tamaño. Verificar los gestos `run` del perro y `hop` del conejo en el controlador real. No inventar acciones que la vida no ofrece ni alterar la conducta del motor para lucir clips.

**Parte 3 · Evidencia y coste.** Repetir las tomas idénticas; inspeccionar la secuencia, no sólo un fotograma. Acompañar con traza y pruebas de propiedades que hayan cambiado. En una aldea y una villa de referencia, comparar coste de JS por fotograma, draw calls y recursos con la base; anotar que esas cifras no son FPS móvil. Ejecutar `typecheck`, lint focal y pruebas afectadas durante el trabajo, según `CLAUDE.md`; suite amplia sólo al cierre de tanda. La revisión en iPhone/iPad decide legibilidad y rendimiento percibido cuando Vera pueda hacerla.

**Terminado cuando:** cada clip de locomoción humana y cada una de las quince especies tiene una fila con evidencia y veredicto; los defectos priorizados de AN-1 han mejorado a escala móvil normal; no se ve patinaje, salto de pose ni giro erróneo en las tomas de aceptación; no hay regresión de coste no explicada ni de pruebas pertinentes. AN-2 y AN-3 permanecen explícitamente abiertas hasta revisar todos los gestos cotidianos y de encuentro. Si la diferencia sólo se aprecia en primer plano, la mejora no pasa y se rediseña.

### Prompt listo para pegar

> **AN-0 + AN-1 · Animación integral, primera tanda.** El objetivo del programa es mejorar todas las animaciones de aldeanos y animales para móvil, no sólo un gesto. Lee `CLAUDE.md`, `docs/design.md` §1–4/D.4/D.6/D.9/E.1/E.3/E.6/E.7, `docs/task-log.md`, `docs/plan-animacion-integral-movil-2026-09-29.md` y las skills locales `observe-valley-life` y `performance`. Sigue el brief de ese plan. Primero inventaría los 24 clips humanos, las 15 especies y las aves ambientales, con estado en juego, toma visual a escala móvil y defectos concretos. Después mejora locomoción y transiciones de aldeanos y de **todas** las especies en los ficheros permitidos. Conserva simulación, guardados, zancadas por distancia y acciones fechadas. Entrega matriz de cobertura, tomas antes/después del mismo estado, traza, pruebas focales y coste comparado. No declares aprobada una especie sólo porque su preview funcione; marca `preview-only` donde falte escena real. Indica qué falló y qué observación refutaría la mejora. Deja listos los hallazgos priorizados de gestos cotidianos y encuentros para AN-2/AN-3.

## Regla de cierre del programa

No se declara «animaciones terminadas» por tener clips conectados o pruebas verdes. Se cierra AN-4 cuando la matriz cubra los 24 clips humanos, las quince especies y las aves ambientales; las acciones con contacto coincidan con sus hechos; las secuencias reales se lean en móvil; y el coste esté comparado con la base. Los casos que no puedan provocarse en una partida se identifican como límite y reciben una toma de integración en cuanto exista ruta para verla.
