# La interfaz, versión a versión

Una carpeta por fecha con **todas las pantallas del juego y sus estados**, tal
como estaban ese día: menú, carga, valle, horas, crónica, gente, carro,
decisiones, asedio, finales, lo raro (la bienvenida tras una ausencia, la caza,
el banco de batallas…) y el metraje sin interfaz. Lo pidió Vera el 27 sep 2026:
«guárdalas en una carpeta en docs como versión actual de la interfaz, y cada vez
que tengamos que hacer una nueva, podamos ir haciendo esta tanda de fotos».

Dentro de cada fecha, **`ui/`** tiene copia de las que enseñan interfaz —menús,
paneles, hojas, botones— sin el metraje del valle (Vera, 27 sep 2026: «haz una
división duplicando las que sean exclusivas de UI»). Qué cuenta como interfaz lo
dice la lista `UI_SHOTS` de `tools/graphics/press-archive.py`: una pantalla nueva
se añade ahí.

Sirve para comparar: abrir dos carpetas lado a lado dice qué cambió en la
interfaz entre dos fechas. **Una versión no se pisa nunca**: la siguiente va en
su propia carpeta.

## Versiones

| Fecha | Capturas | Qué la motivó |
|---|---|---|
| [2026-09-27](2026-09-27/README.md) | 107 (43 en `ui/`) | La primera: tras el rediseño de la piel, las tandas de rendimiento y el banco de batallas |

## Cómo se hace una versión nueva

Es la skill `press-kit`, y en tres pasos:

```bash
npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/press/game
node tools/graphics/press-kit.mjs          # todas las tandas; tarda (WebGL por software)
python tools/graphics/press-archive.py --date AAAA-MM-DD --skip <las que no valgan>
```

Antes de archivar, **mira la hoja de contactos** (`artifacts/graphics/press/index.html`):
una captura que salió mal (un menú donde debía estar el valle, dos iguales) se
repite con `--only <grupo>` o se deja fuera con `--skip`. Luego añade la fila a la
tabla de arriba. Los originales a resolución completa quedan en
`artifacts/graphics/press/`, que no se versiona; aquí van en JPG a 780 de ancho.

**Lo que la versión del 27 sep no tiene:** el vuelo de entrada desde lo alto
(con el año de taller la cámara llega ya posada; pide fundar un valle de año 1
sin taller) y el cerco del año 40 de cerca (el botón de despejar no se dejó
tocar; está su plano ancho). Las escenas son del año 30, que cae en otoño.
