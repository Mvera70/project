# Evidencia IA-11

Los comandos completos y límites están en `docs/life-rounds/IA-11.md`.

- `live-7.json`, `live-11.json`, `live-43.json`: resúmenes de las tomas
  `adaptive-live-*`, 42 segundos de navegador a ×64 y 2 fps. Partida viva.
- `gate-and-passages.png`: fotograma 66 de `final-live-11`, portón de palisada
  y colocación del mundo ya definitivos; anterior a los últimos ajustes de tráfico.
- `door-opening.png`, `door-entering.png`, `door-sleeping.png`, `door-leaving.png`:
  fotogramas 11, 12, 13 y 90 de `door-closeup-11`, siguiendo al residente 17.
  Estado persistente fijo; anteriores al ajuste de anticipo del regreso.

Los visores completos `index.html`, trazas y todos los PNG se generan localmente
con `tools/graphics/observe-life.mjs`; no se versionan cientos de imágenes por toma.
Cero penetraciones en muestras no demuestra que ningún sólido de todo el catálogo
pueda atravesarse. Estas tomas no certifican FPS ni gait de todas las especies.
