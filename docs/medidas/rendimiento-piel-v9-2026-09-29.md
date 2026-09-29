# ¿La piel v9 hunde el rendimiento? — medida del 29 sep 2026

**El caso.** Vera abrió el sitio publicado en su tablet Android (800×1280) con
un valle de año 60 y lo vio a **0 fps, con el peor fotograma en 2,3 s**, sin
poder moverse. El panel de taller decía 505 llamadas, 775k triángulos, y la
resolución adaptativa al 100 % en una captura y al 85 % en la siguiente. La
pregunta: ¿lo trajo la piel v8/v9 (texturas de imagen, `border-image`,
`filter: drop-shadow`, la brújula de latón con patrón SVG) u otra cosa?

**Lo que se midió, todo en el portátil contra el sitio publicado
(`mvera70.github.io/project`, commit `af8d37e`), semilla 7, año 60.** Ventanas
de cuatro segundos de `requestAnimationFrame`; las sondas están en el
historial de la sesión (`perf-probe*.mjs`), no en el repositorio.

| Condición | Fotograma medio | Nota |
|---|---|---|
| GPU real, sin estrangular | 7,5 ms | 531 fotogramas en 4 s |
| … sin la brújula | 7,5–9,5 ms | igual, dentro del ruido |
| … sin `filter` en cabecera y mandos | 8,7 ms | igual |
| … sin brújula ni filtros | 7,5 ms | igual |
| CPU a un sexto, por la portada (como Vera) | 26 ms | tras 20 s de arranque a 57–200 ms |
| CPU a un sexto, por `?debug=1&live=1` | 28 ms → 1,3 s | **se hunde con el tiempo; ver abajo** |

**Conclusión 1: la piel no cuesta por fotograma.** Apagar la brújula y los
filtros no mueve el fotograma en el portátil. Las piezas de imagen las
compone la GPU una vez; la brújula sólo se redibuja cuando la vista cambia.
Lo que sí encontró la auditoría de Codex en el sitio publicado fue un fallo
de rutas, no de coste: seis texturas del tablón daban 404 (`79e7270`).

**Conclusión 2: la ruta `?debug=1` no sirve para medir el 3D.** Monta
también el valle en Canvas 2D, que pinta cada fotograma debajo del 3D
(elipses de la capa de animales, `clientHeight` del render 2D forzando un
relayout) y con la CPU estrangulada se hunde hasta fotogramas de más de un
segundo. Es la misma trampa que `CLAUDE.md` ya tiene escrita para la capa de
vida, y vale también para medir fotogramas. Con el flujo real de la portada
no pasa.

**Conclusión 3: dos fallos que sí eran nuestros.** La resolución adaptativa
se alimentaba de `realDeltaSeconds`, que el reloj de presentación recorta a
0,1 s: un fotograma de dos segundos contaba como uno de cien milisegundos y
bajar la resolución tardaba minutos en el aparato que más lo necesitaba
(`6acc645`, ahora mide el hueco real). Y no había forma de bajar la calidad
en un aparato flojo: «Graphics» en la portada, con `render3d/profile.ts`.

**Lo que no se sabe desde aquí: dónde se van los dos segundos en esa
tablet.** El panel de taller enseña desde `6acc645` el reparto del fotograma
(`dibujo` = `render`, `vida` = pasos de vida y cuántos, `paint` = todo el
`paint`): con esas tres cifras leídas en la tablet se sabe si es la GPU
(dibujo alto), la vida (vida alta) o lo que queda fuera del `paint`, que es
el motor, la interfaz y la composición del navegador. Es la primera medida
del juego en el dispositivo; todo lo anterior es del portátil.
