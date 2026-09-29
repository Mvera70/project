# Encargo para Claude Code · animación integral en modo goal

**29 sep 2026.** Objetivo principal: mejorar todas las animaciones de aldeanos y
animales de The Valley, con móvil como pantalla de referencia. Copiar el bloque
siguiente en Claude Code desde la raíz del proyecto. El alcance y la matriz de
aceptación están en
[`docs/plan-animacion-integral-movil-2026-09-29.md`](../plan-animacion-integral-movil-2026-09-29.md).

```text
/goal Animación integral de aldeanos y animales para móvil

Objetivo: mejorar de forma visible todas las animaciones de aldeanos y animales de The Valley. El juego se evalúa principalmente en móvil. Trabaja hasta completar las fases AN-0 a AN-4 del plan; no cierres el goal después de mejorar solo la locomoción.

Antes de modificar código:
1. Lee `.claude/skills/goal/SKILL.md`, `CLAUDE.md`, `docs/design.md` §1–4 y los anexos de render y vida pertinentes, `docs/plan-meta.md`, `docs/task-log.md`, `docs/plan-animacion-integral-movil-2026-09-29.md`, `docs/encargos-3d.md`, `tools/README.md` y las skills locales `observe-valley-life` y `performance`.
2. Comprueba el estado del worktree y conserva los cambios ajenos.
3. La ronda AN aún no tiene fila propia en `docs/plan-meta.md`. Añádela antes de tocar código, con sus fases AN-0 a AN-4, dependencias y criterio de cierre. Comprueba las dependencias existentes según la skill `goal`; si alguna imprescindible sigue abierta, explica el bloqueo.
4. Define un brief y los ficheros permitidos para cada fase antes de implementarla. Respeta el alcance de AN-1 ya escrito en el plan. Si un hallazgo exige tocar otros módulos o un GLB, escribe primero el brief de esa corrección.

Ejecuta el programa completo, por fases:

AN-0 — Inventario y línea de base.
Verifica en el código y el catálogo los 24 clips humanos, las 15 especies, los gestos adicionales del perro y las aves ambientales; amplía el inventario si encuentras más. Crea una matriz por clip y especie con origen, situación en partida, evidencia visual, defecto concreto, gravedad, coste y decisión. Distingue lo visto en partida de lo visto solo en preview. Captura secuencias cortas reproducibles con las herramientas locales, a tamaño normal de juego en 390×844 y 320×568. Conserva semilla, año, actor, cámara y zoom para las comparaciones posteriores.

AN-1 — Locomoción.
Mejora reposo, marcha, carga, huida, arranque, parada y giro de aldeanos; revisa adultos, niños, mayores y clan vecino. Revisa el desplazamiento de las quince especies, incluidos salto, carrera, nado y vuelo donde correspondan. Corrige apoyos que resbalan, fases incorrectas, mezclas bruscas, orientación y diferencias de ritmo entre especies. Comprueba las animaciones en el controlador real del juego, no solo en una galería.

AN-2 — Vida y oficios.
Revisa y mejora todos los gestos cotidianos enumerados en el plan: trabajo, conversación, descanso, siembra, herramientas, bebida, juego y refugio; incluye `bark` y `play` del perro y el vuelo ambiental. Asegura que preparación, contacto y recuperación se entienden desde la cámara móvil. Sincroniza manos, herramientas, suelo y objetos con el gesto.

AN-3 — Encuentros y combate.
Revisa tiro con arco, golpe al portón, lanza, recepción del impacto, caída, huida y las acciones de ataque o fuga de animales que existan y se usen. Conserva el instante de los hechos, el daño, las físicas, el resultado de la batalla y la frontera entre render, vida y motor. Comprueba acción y reacción en secuencia, incluidos los casos de respaldo del ragdoll.

AN-4 — Aceptación conjunta.
Repite tomas antes/después del mismo estado. Cubre dos semillas, distintas edades de la aldea, una villa y un asalto. Cierra cada fila de la matriz con evidencia y veredicto. Un clip que ya funciona puede conservarse si muestras por qué; uno visible solo en preview queda marcado como `preview-only`, no como integrado. Comprueba lectura a tamaño normal de móvil y compara tiempo de JS por fotograma, draw calls y recursos con la línea de base. No presentes FPS de SwiftShader como FPS de un teléfono. Deja la comprobación en iPhone/iPad identificada como pendiente si no tienes acceso real al dispositivo; no inventes esa validación.

Durante el trabajo:
- Prioriza mejoras perceptibles en el juego. Si el defecto está en el rig o en un GLB, corrígelo mediante `art/recipes/` y el pipeline reproducible del proyecto, con un brief propio. No disimules un problema del asset con una mezcla de código que siga viéndose mal.
- Mantén la simulación, los guardados, la zancada ligada a distancia y los eventos ligados a hechos. No añadas acciones que la vida del juego no produce solo para exhibir clips.
- No trabajes en UI, SEO ni seguridad dentro de este goal.
- Ejecuta typecheck, lint focal y pruebas afectadas durante cada fase; deja la suite amplia para el cierre de tanda, conforme a `CLAUDE.md`. Añade pruebas de propiedades reales cuando cambies comportamiento. No hagas recorridos pesados repetidos sin una razón concreta.
- Actualiza `docs/task-log.md`, `docs/changelog.md`, la fila AN de `docs/plan-meta.md` y `docs/encargos-3d.md` cuando corresponda. Documentación en español; contenido y código en inglés, comentarios de código según `CLAUDE.md`.
- Haz commits por rutas explícitas, nunca `git add -A`. No cambies de modelo ni encargues modelado 3D a Astra sin la autorización de Vera.

Criterio de terminado: matriz completa de todas las animaciones, defectos detectados corregidos o límites explícitos, comparaciones visuales reproducibles a escala móvil, sincronía de contactos y combate conservada, coste comparado, pruebas pertinentes superadas y documentación actualizada. Continúa de una fase a la siguiente sin pedirme confirmación rutinaria. Si surge una decisión artística no obvia o un bloqueo real, presenta la evidencia y la decisión concreta que necesito tomar.

Al final informa: qué mejoró por familia, enlaces a las tomas y matriz, archivos y commits, pruebas y costes antes/después, y cualquier validación pendiente en dispositivo real. No declares completado el goal si quedan clips sin revisar.
```
