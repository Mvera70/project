# UI-V0 · El kit de la piel

**16 sep 2026.** Primera ronda de la tanda de piel (`plan-piel.md`), hecha por
el coordinador porque es la base de la que dependen las otras seis y lo que
más precisión pide. **No pinta ninguna pantalla del juego**: entrega el
vocabulario con el que UI-V1 a UI-V5 van a componerlas.

Commit de partida: `a5744b7`.

---

## 1. Lo entregado

| Fichero | Qué es |
|---|---|
| `src/ui/redesign/tokens.css` | reescrito: 17 colores **muestreados de los prototipos**, con el hex y la pieza de la que sale cada uno; tipografía, tamaños medidos, rasgados, giros. Los `--ui-*` de UI-R1 se conservan apuntando a los nuevos |
| `src/ui/redesign/skin.css` | nuevo: las 25 primitivas (`.skin-paper`, `.skin-plate` y sus variantes, `.skin-inscription`, `.skin-label`, `.skin-read`, `.skin-rule`, `.skin-capital`, `.skin-seal`, `.skin-medallion`, `.skin-chip`, los dos botones, las tres navegaciones, el borde de la bandeja, el ornamento, los iconos) |
| `src/ui/redesign/fonts/` | Cinzel y EB Garamond, variables, subconjunto latino, con su OFL. **93 KB los tres** |
| `src/ui/redesign/parchment.png` | la textura, generada |
| `public/ui/icons.svg` | los diez iconos de trazo, `currentColor` |
| `public/ui/art/index.json` | el índice de arte, vacío: el arte aparece cuando llegue |
| `tools/ui/parchment.py` | genera la textura, determinista |
| `tools/ui/deckle.py` | genera los bordes rasgados |
| `tools/ui/contrast.py` | mide los 14 pares texto/fondo |
| `tools/ui/sampler.html` · `sampler.mjs` | el muestrario y su captura |
| `tools/graphics/skin-compare.py` | prototipo al lado de la captura, 10 regiones fijas |
| `tests/fast/ui-skin.test.ts` | 12 pruebas |
| `src/ui/app.ts` | una línea: importa `skin.css` antes de `shell.css` |

## 2. Lo medido

- **Contraste:** los 14 pares pasan (`tools/ui/contrast.py`). El más justo,
  4,66:1.
- **Fuentes:** las cinco variantes cargan de verdad
  (`document.fonts.check`), comprobado en el muestrario. Cero peticiones de
  red a `fonts.googleapis.com`: los ficheros van dentro.
- **Peso:** el `dist/` crece **118 KB** (fuentes 95 KB, textura 25 KB, sprite
  6 KB). El tope del plan era 300 KB.
- **Rutas:** el CSS compilado sale con `url(./cinzel-….woff2)` y
  `url(./parchment-….png)` — relativas, así que el mismo `dist/` sirve desde
  la raíz y desde `/project/` (§13.4), que es lo que `tools/pwa/subpath.pwa.ts` vigila.
- **Determinismo:** la textura da la misma huella zlib (`68cc24ee`) en dos
  ejecuciones seguidas.
- **Pruebas:** `ui-skin` 12/12, y las **135** de las doce pruebas de interfaz
  siguen verdes con el kit enganchado. typecheck y lint limpios.

## 3. Los dos fallos que el muestrario cazó, y son el motivo de que exista

Esta ronda entregó el muestrario **antes** que cualquier pantalla, y las dos
primeras veces que se miró estaba mal. Los dos fallos habrían llegado a las
seis rondas siguientes multiplicados:

1. **El pergamino salía gris barro.** `multiply` divide, no matiza: con la
   textura centrada en 128, `#E5D3BB` se quedaba a la mitad de luz y el texto
   encima dejaba de leerse. La textura ahora está centrada en **246** y sólo
   resta luz (0–8 %). Escrito en la cabecera de `parchment.py` para que nadie
   lo vuelva a poner en 128.
2. **El rasgado se comía el texto.** Las amplitudes van en porcentaje, y el
   3 % de una placa de 334 px son diez píxeles por el lado: cortó la fecha.
   Ahora la amplitud baja con el ancho de la pieza (placa 1,2 %, tarjeta 1 %,
   hoja 0,6 %, chips 4 %) y queda dicho que el contenido lleva 12 px de
   relleno como mínimo.

## 4. La única desviación del prototipo, con su motivo

`--skin-ink-faded`. La muestra del prototipo daba `#816D52`, y con él las
versalitas de la fecha quedan en **3,39:1** sobre la placa y **2,88:1** sobre
la bandeja — por debajo del 4,5:1 que el plan exige, en un juego que se mira
a pleno sol en un móvil. Se oscureció manteniendo el tono hasta el mínimo que
pasa: **`#5D4E3B`** (5,49:1 y 4,66:1). La regla que se siguió, y que queda
escrita en `contrast.py`: **se oscurece la tinta, nunca se aclara el papel**,
porque el papel es lo que hace que se parezca al prototipo.

## 5. Lo que esta ronda deja a las siguientes

- **El vocabulario está congelado.** UI-V1 a UI-V5 componen con estas clases.
  Si una ronda necesita una pieza que no existe, la añade **a `skin.css`** y
  lo dice en su informe; no inventa una piel local, que es como la tanda
  anterior acabó con seis estilos.
- **El criterio de hecho ya no es una opinión:** cada ronda adjunta
  `python tools/graphics/skin-compare.py <región> <captura>` y el coordinador
  decide. Las diez regiones están escritas en el script con sus cajas.
- **El juego se ve todavía como ayer**, a propósito: nadie usa el kit aún. La
  captura de referencia está en `artifacts/graphics/UI/V0/valle.png`.

## 6. Qué observación refutaría esta ronda

Que el muestrario se vea distinto en otra máquina (la textura o los rasgados
no serían deterministas). Que una fuente pida algo a la red. Que el
`dist/` pase de 300 KB por este kit. Que un par de texto/fondo baje de 4,5:1
sin que `contrast.py` lo diga. Que el juego abra distinto de
`artifacts/graphics/UI/V0/valle.png` antes de que UI-V1 empiece.
