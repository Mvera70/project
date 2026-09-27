# Herramientas de rondas cerradas

Se conservan para reproducir una entrega antigua, pero no forman parte del
camino habitual de desarrollo. No son sustitutos de los comandos actuales de
`tools/README.md`.

| Carpeta | Ronda | Estado |
|---|---|---|
| `graphics/villager-sheet.py` | G-19 | Rehace la hoja de aldeanos a partir de capturas aprobadas de G-17/G-18. Esas entradas están en `artifacts/`. |
| `graphics/g20-check.mjs` | G-20 | Comprueba `artifacts/graphics/G-20/juego-real.html`; depende de esa página concreta. |
| `graphics/capture-chronicle-sheet.mjs` | Crónica | Requiere montar manualmente `chronicle-contact-sheet.html` en la raíz del servidor; esa página no vive en el repositorio. |

Las rutas anteriores siguen siendo código reproducible; si se reabre una ronda,
hay que revisar sus entradas antes de ejecutarlas.
