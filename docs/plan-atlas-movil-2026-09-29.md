# Atlas Agent Teams aplicado a The Valley

**29 sep 2026 · plan de trabajo.** El producto principal es el juego móvil PWA; la web también puede servir para jugarlo y descubrirlo. Este documento prepara la siguiente ronda de animación. No instala Atlas ni cambia el juego.

## Veredicto sobre Atlas

[Atlas Agent Teams](https://github.com/MonumentalSystems/Atlas-Agent-Teams) aporta un catálogo de equipos para Claude Code: `game-dev`, `3d-design`, `design-ux`, `marketing-seo`, `security`, `qa-testing` y otros. Su secuencia de descubrimiento → plan → ejecución → revisión → entrega es aprovechable. La [guía de animación](https://github.com/MonumentalSystems/Atlas-Agent-Teams/blob/main/teams/3d-design/skills/animation/SKILL.md) recuerda poses clave, anticipación, peso, continuidad, mezclas y coste móvil, pero no contiene un procedimiento específico para los clips, el reloj y las herramientas de The Valley. Se usa como lista de preguntas de revisión, no como especificación.

No conviene instalar el equipo completo para esta ronda: la [configuración 3D](https://github.com/MonumentalSystems/Atlas-Agent-Teams/tree/main/teams/3d-design) organiza siete agentes con modelo preasignado, mientras este proyecto ya tiene briefs, pruebas y observatorio propios. El [README de Atlas](https://github.com/MonumentalSystems/Atlas-Agent-Teams#telemetry) dice que sus hooks registran invocaciones y parámetros de herramientas; antes de adoptar uno habría que revisar su código y decidir qué datos se guardan. No se ha hecho esa auditoría ni se afirma que el repositorio tenga una vulnerabilidad.

| Área de Atlas | Aprovechamiento aquí |
|---|---|
| `3d-design` · animación, rigging, optimización | Preguntas de calidad visual y coste por personaje. Adaptarlas a GLB, clips procedurales y cámara ortográfica móvil. |
| `game-dev` y `qa-testing` | Disciplina de revisar en el juego real. The Valley ya tiene `observe-life`, `film`, pruebas de contacto y capturas; se usan esos instrumentos. |
| `design-ux` | Revisar lectura de acciones y accesibilidad en 390×844 y 320×568. La dirección artística y la piel vigentes siguen mandando. |
| `marketing-seo` | Preparar más adelante una página pública de presentación. El SEO ayuda a descubrir el juego web; no mejora por sí solo la experiencia móvil. |
| `security` y `devops-cloud` | Hacer una auditoría acotada de dependencias, CI, guardados y service worker, basada en el código y la publicación reales. |
| `mobile-dev` | Su foco iOS/Android nativo no corresponde al PWA actual. Reconsiderar sólo si hay una app nativa. |

## Animación integral de aldeanos y animales

El objetivo principal es revisar y mejorar **todas** las animaciones de aldeanos y animales para móvil. El inventario de 24 clips humanos, 15 especies y aves ambientales, las rondas AN-0 a AN-4 y el prompt de la siguiente tanda viven en [el plan de animación integral](plan-animacion-integral-movil-2026-09-29.md).

## Otras líneas, después de la animación integral

1. **Movimiento de la interfaz móvil.** La propuesta visual V9 aplazó expresamente animación y modo día/noche. Cuando se decida e integre su piel, revisar entrada y salida de hojas, portada y encrucijada en el juego real, respetando `prefers-reduced-motion`. Ya existen transiciones en `src/ui/`; esta ronda sería de coherencia y lectura, no de añadir movimiento a todo.
2. **Diseño y legibilidad.** Evaluar si las acciones importantes se entienden en la cámara normal y si el HUD deja verlas en pantallas estrechas. Las skills locales `piel-del-valle`, `game-ui-ux` y `press-kit` son la base; Atlas aporta preguntas de revisión, no una nueva dirección artística.
3. **Descubrimiento web.** `index.html` sólo declara el título `The Valley`; el manifiesto PWA contiene una descripción, pero la página inicial casi no explica el juego en HTML. Antes de una campaña SEO, preparar una página pública ligera con propuesta del juego, imágenes reales, texto accesible y enlace claro para jugar o instalar. Añadir título/descripción y vista social coherentes. [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) explica por qué el contenido HTML y los metadatos importan incluso en aplicaciones JavaScript. No hace falta un equipo SEO de cinco agentes para esta primera página.
4. **Seguridad y entrega.** `docs/task-log.md` registra que la CI lleva roja desde el 9 sep; verificar el estado actual y arreglar esa puerta antes de fiarse de nuevas comprobaciones. Después revisar dependencias y alertas, permisos de Actions, validación de importación de partidas, cacheo del service worker y datos locales. [GitHub documenta](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review) cómo la revisión de dependencias complementa las alertas. Esto es un plan de auditoría, no una conclusión de que haya fallos.
