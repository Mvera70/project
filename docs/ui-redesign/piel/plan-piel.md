# La piel de la interfaz · plan para que se vea como los prototipos

**16 sep 2026.** Diagnóstico de por qué UI-R0 a UI-R6 entregaron la
estructura de los prototipos y no su aspecto, y plan por rondas —escrito para
agentes Sonnet, con valores literales— para cerrar esa distancia **sólo en la
interfaz**. El valle 3D (voxel, low-poly) no se toca: el dueño lo ha dicho, y
el fotorrealismo de los prototipos era ilustración de concepto, no un objetivo.

Los prototipos son `docs/ui-redesign/ui-prototypes/01..03.png` (853 × 1844,
o sea 390 × 844 a 2,19×). Las comparativas que destaparon esto están en
`artifacts/graphics/comparativa/COMPARATIVA-*.png`.

---

## 1. Qué se hizo mal, y por qué (no es culpa de los agentes)

1. **El prompt pidió estructura y prohibió copiar.** `implementation-prompt.md`
   dice «no copies texto ficticio ni datos dibujados de los prototipos». Los
   agentes lo leyeron como «no toques la piel». Lo que quería decir era
   «copia la piel, no los datos». Nadie lo corrigió porque nadie lo comparó.
2. **Los tokens se sembraron desde lo que ya había.** UI-R1 escribió
   `tokens.css` copiando las dos pilas de fuentes y los colores de
   `index.html` (U-01). Con esa semilla, cinco rondas «fieles a los tokens»
   sólo podían reproducir el juego anterior. Está dicho en el propio fichero:
   «las mismas dos pilas que ya vestían el juego».
3. **No había criterio visual de hecho.** Cada ronda tenía criterio de
   comportamiento (navegar, cerrar, no duplicar toques) y capturas «de que
   funciona», pero ninguna exigía **una captura al lado del prototipo**. Sin
   ese lado a lado, «se ve como antes» pasa por hecho.
4. **No había activos.** Un prototipo con capitular, sello de lacre, retratos
   y grabados no se puede alcanzar sin dibujos, y nadie encargó ninguno. Sin
   activos, la única salida era CSS plano, y eso es lo que salió.
5. **Las fuentes.** `CLAUDE.md` prohíbe fuentes de red (la demo abre sin
   servidor). Se leyó como «fuentes del sistema» en vez de «fuentes
   empaquetadas». Con Palatino/Georgia no hay manera de parecerse a una
   inscripción en versalitas.

**Lo que sí se hizo bien y se conserva entero:** la carcasa de una sola
bandeja, el único dueño de la navegación, la crónica y la gente dentro del
contenedor común, los enlaces persona→ficha, el seguimiento honesto, la
encrucijada por encima de todo. La piel se pone **encima** de eso; no se
rehace nada de UI-R1 a UI-R5.

---

## 2. El lenguaje visual, medido en los prototipos

Colores **muestreados** de los PNG (mediana de un recuadro sin texto; la tinta
es la media del 5 % más oscuro; el oro sobre madera, la del 5 % más claro).
Son los valores que van a `tokens.css`. No se redondean «a ojo».

| Token | Hex | De dónde sale |
|---|---|---|
| `--skin-parchment` | `#E5D3BB` | placa de cabecera (01) |
| `--skin-parchment-deep` | `#D9C2A5` | bandeja inferior y chips (01) |
| `--skin-page` | `#EADBC2` | página de la crónica (02) |
| `--skin-parchment-aged` | `#BCA87D` | tarjeta superior de la ficha (03), bordes envejecidos |
| `--skin-ink` | `#1B1613` | texto de las entradas (02) |
| `--skin-ink-soft` | `#3A2E1F` | etiquetas de navegación (01) |
| `--skin-ink-faded` | `#816D52` | versalitas de la cabecera (01) |
| `--skin-gold` | `#7C5C1F` | puntos de la línea de tiempo y filetes (02) |
| `--skin-gold-lit` | `#F1DEAE` | etiqueta activa sobre madera (03) |
| `--skin-ochre` | `#765833` | subrayado de la pestaña activa (01) |
| `--skin-wood` | `#2B1F17` | barra de navegación oscura (03) |
| `--skin-wood-soft` | `#453023` | botón FOLLOW (03) |
| `--skin-wood-plaque` | `#3A2E24` | placa de la pestaña activa (02) |
| `--skin-red` | `#6A2521` | fondo de la capitular (02) |
| `--skin-red-deep` | `#5B1A1B` | sello de lacre (02) |
| `--skin-red-ink` | `#4E0504` | título de la decisión (02) |
| `--ui-alarm` | `#9E4A34` | se conserva (la comida en aviso) |

**Tipografía.** Dos familias, empaquetadas (OFL, sin red), en `public/fonts/`:

| Papel | Familia | Pesos | Dónde |
|---|---|---|---|
| Inscripción (versalitas) | **Cinzel** | 400, 600 | fecha, cifras, «ANNO XXI», nombre · N WINTERS, etiquetas de navegación, chips de rasgo |
| Lectura | **EB Garamond** | 400, 500, 400 itálica | entradas de la crónica, la frase de la bandeja, subtítulos, precios |

Subconjunto latino, `woff2`, ~25–35 KB cada fichero, seis ficheros como mucho
(~180 KB). Se declaran con `@font-face` en `skin.css` **y además** se enlazan
desde `index.html` con `<link rel="preload" as="font" type="font/woff2"
crossorigin href="./fonts/…">`: el service worker (`public/sw.js`,
`shellAssets`) precachea **sólo lo que `index.html` referencia** por `src`/
`href`, así que una fuente que sólo esté en CSS no abre sin red. La licencia
OFL va junto a los ficheros (`public/fonts/OFL.txt`).

**Texturas y bordes, sin activos externos.**

- **Pergamino**: un mosaico de 256 × 256 PNG generado por
  `tools/ui/parchment.py` (ruido de baja frecuencia + grano, semilla fija,
  ≤ 20 KB), en `public/ui/parchment.png`, usado como `background-image`
  con `background-blend-mode: multiply` sobre el color del token. Determinista:
  dos máquinas producen el mismo PNG.
- **Borde rasgado** («deckle»): `clip-path: polygon(...)` con 24–40 vértices
  generados por `tools/ui/deckle.py` a partir de una semilla por primitiva
  (placa, chip, tarjeta). Se escriben literales en `skin.css`; nada se calcula
  en tiempo de ejecución.
- **Inclinación**: las placas sueltas llevan `rotate(±0,4°…0,8°)` fijo por
  índice (`nth-child`), como en el prototipo, nunca al azar.
- **Sombra**: `0 2px 4px rgba(27,22,19,.25), 0 8px 18px rgba(27,22,19,.18)`.

**Iconos.** Un sprite `public/ui/icons.svg` de trazo («grabado», 1,5 px a
24 px, sin relleno, `currentColor`): `people`, `wheat`, `logs`, `face`,
`mountains`, `book`, `footprints`, `oak-leaf`, `sun`, `seal-tree`. UI-V0 los
dibuja **simples**; el encargo de arte (§4) los sustituye si llega.

---

## 3. Cada pantalla, en píxeles de CSS a 390 × 844

Factor 853 → 390 = 0,457. Todo lo de abajo son medidas del prototipo ya
convertidas; el agente no convierte nada.

### 3.1 Valle en reposo (prototipo 01)

| Elemento | Posición y tamaño | Piel |
|---|---|---|
| Placa de fecha | x 27–361, y 16–50 (alto 34) | `--skin-parchment`, deckle, sombra; texto `YEAR 21 · SUMMER · DAY 43` en Cinzel 600 13 px, `letter-spacing: .08em`, `--skin-ink-faded`; **arco del sol** a la derecha (ancho 90): un arco fino `--skin-gold` con el sol en la posición que da `stats().sunPhase` (ya existe, U-12) |
| Cuatro chips | y 57–90 (alto 33), anchos 64–70, hueco 12, empezando en x 43 | `--skin-parchment-deep`, deckle propio, rotación `−0,6°, 0,4°, −0,3°, 0,5°`; icono 16 px + cifra Cinzel 600 16 px `--skin-ink-soft`; la comida en aviso en `--ui-alarm` como hoy |
| Velocidad | dos círculos ⌀ 40 en (x 300, y 634) y (x 350, y 634) | `--skin-parchment`, sombra; ▶/⏸ y `1×` en Cinzel 600 15 px |
| Bandeja | borde superior en y 662 | ver 3.4 |
| Frase | y 738, centrada, máx. 32 ch | EB Garamond 400 17 px `--skin-ink` |
| Navegación | y 776–844 | ver 3.4 |

La línea de órdenes («› Sowing enough · hands…») **no está en el prototipo**.
Se conserva como segunda línea pequeña de la bandeja (EB Garamond itálica
13 px `--skin-ink-faded`), porque es el verbo del juego y quitarla sería una
decisión del dueño, no de esta ronda.

### 3.2 Crónica (prototipo 02)

| Elemento | Medida | Piel |
|---|---|---|
| Cabecera compacta | dos placas: fecha x 27–170 (dos líneas: `YEAR 21` / `SUMMER, DAY 83`, con `sun` 16 px a la izquierda) y cifras x 178–361 (cuatro cifras separadas por filetes verticales de 1 px `--skin-gold` al 40 %) | como 3.1 |
| Página | desde y 379 hasta la navegación, con **degradado** de 60 px desde transparente a `--skin-page` para que el valle se funda con el papel | `--skin-page` + textura |
| Cabecera de año | «ANNO XXI» Cinzel 600 24 px `--skin-ink`, con **capitular**: cuadrado 54 × 54 `--skin-red`, borde interior 2 px `--skin-gold`, la letra en Cinzel 700 34 px `--skin-gold-lit`; debajo un filete `--skin-gold` de 1 px con un rombo de 6 px en el centro | |
| Línea de tiempo | vertical 1 px `--skin-gold` en x 46, un punto ⌀ 10 por entrada | |
| Entrada | ilustración 100 × 80 a la izquierda (x 62–162), texto a la derecha (x 180–350) EB Garamond 400 17 px / 1,45; separador entre entradas: filete 1 px `--skin-gold` al 35 % con ornamento de 8 px centrado | ilustración por `kind` (tabla en §3.6), **respaldo**: `oak-leaf` 24 px centrado en un óvalo `--skin-parchment-aged` |
| Decisión pendiente (documento sellado) | tarjeta x 27–361, rotación `−1,5°`, `--skin-parchment-deep`, deckle; **sello** ⌀ 48 en (x 52, y −8) sobre el borde, `--skin-red-deep`, con `seal-tree`; título Cinzel 600 18 px `--skin-red-ink` en versalitas; subtítulo EB Garamond itálica 15 px; tocarla abre la encrucijada de siempre | sólo si `state.crossroad !== null`; los `crossroad_taken` pasados se enseñan como tarjeta **sin** sello, plana |
| Márgenes | dos ornamentos vegetales en las esquinas superiores de la página (SVG 90 × 140, `--skin-ink` al 18 %) | respaldo: ninguno (se omiten sin activo) |
| Navegación | la activa como **placa de madera** (`--skin-wood-plaque`, 120 × 56, icono y etiqueta en `--skin-gold-lit`), las otras sobre pergamino | |

**Los enlaces persona→ficha de UI-R5 se conservan**: subrayado 1 px
`--skin-gold`, color `--skin-ink`.

### 3.3 Ficha de persona (prototipo 03)

| Elemento | Medida | Piel / dato |
|---|---|---|
| Tarjeta superior | x 18–372, y 16–120, `--skin-parchment`, deckle, rotación `−0,4°` | |
| Medallón | ⌀ 90 en x 30–120, anillo 2 px `--skin-ink` | **retrato**: hoy no existe. Respaldo obligatorio: **monograma** (inicial del nombre en Cinzel 600 40 px `--skin-ink` sobre `--skin-parchment-deep`). Mejora opcional UI-V4b: el modelo real del aldeano renderizado a un lienzo pequeño en sepia |
| Nombre | Cinzel 600 20 px `--skin-ink`: `HEREWARD · 21 WINTERS` | de `name`, edad de `bornTick` (o hasta `diedTick`, como ya hace UI-R4) |
| Oficio | EB Garamond itálica 15 px `--skin-ink-soft` | de `role`; sin oficio, nada |
| Rasgos | chips 28 px de alto, Cinzel 400 11 px `letter-spacing .1em`, `--skin-parchment-deep`, borde 1 px `--skin-parchment-aged` | de `traits` |
| Franja de relaciones | y 590, dos medallones ⌀ 44 con nombre y vínculo, un ornamento en medio | **sólo vínculos que el motor tiene**: `parentIds` (madre/padre/hijo), `homeId` igual (comparte techo), `opinions ≥ +60` (amigo), `opinions ≤ −50` (rival, `OPINION.GRUDGE_AT`). **«Esposa» no existe en el estado**: no se enseña. Si no hay ningún vínculo, la franja no se monta |
| «Today:» | EB Garamond 500 17 px, icono 24 px a la izquierda | necesita un dato que hoy la interfaz **no tiene**: qué está haciendo esa persona ahora. UI-V4 añade `activityOf(id)` a `ValleyBackend` (el 3D lo implementa desde `lastActors[].occupation`; el 2D devuelve `null` y la línea no se monta). Texto por clave del banco: `today.field`, `today.felling`, `today.building`, `today.herding`, `today.water`, `today.idle` |
| Botones | dos, 52 px de alto, hueco 12: **FOLLOW** (`--skin-wood-soft`, texto `--skin-gold-lit`, icono `footprints`) y **LIFE STORY** (`--skin-parchment`, borde 1 px `--skin-parchment-aged`, icono `book`) | FOLLOW = el `track` honesto de UI-R4 con su nota; LIFE STORY = navegar a la crónica (los enlaces de UI-R5 hacen el resto) |
| Navegación | fondo `--skin-wood` cuando la ruta es `people`/`inspect`; activa en `--skin-gold-lit` con subrayado | |

El resalte de la persona y su casa **en el valle** (el aro y el contorno
dorados del prototipo) es render 3D, no interfaz: queda fuera de este plan y
anotado como UI-V4c para el coordinador.

### 3.4 La bandeja y la navegación (común)

- **Borde superior de la bandeja**: SVG de 390 × 26 (`public/ui/scroll-edge.svg`),
  la silueta curvada del prototipo, relleno `--skin-wood`, con el pergamino
  empezando 8 px por debajo. Respaldo si no hay SVG: borde superior 6 px
  `--skin-wood` con `border-radius: 18px 18px 0 0`.
- **Ornamento**: `oak-leaf` 22 px centrado, con dos filetes de 40 px `--skin-gold`
  a los lados, 14 px por encima de la frase.
- **Navegación**: tres celdas, icono 22 px + etiqueta Cinzel 400 11 px
  `letter-spacing .12em` en versalitas; filetes verticales de 1 px
  `--skin-gold` al 30 % entre celdas; **activa**: subrayado 2 px `--skin-ochre`
  de 40 px bajo la etiqueta (valle) o placa de madera (crónica/gente, §3.2 y
  §3.3). Altura 68 px, área táctil ≥ 44 px (se conserva `--ui-tap-min`).

### 3.5 Encrucijada y epitafio (sin prototipo propio)

Se visten con el mismo lenguaje que el documento sellado de §3.2, que es lo
que el prototipo 02 enseña de una decisión: fondo `--skin-page` con la
página subiendo desde y 300; título Cinzel 600 20 px `--skin-red-ink`; cuerpo
EB Garamond 17 px; cada opción es una tarjeta `--skin-parchment-deep` con
deckle, el verbo en Cinzel 600 15 px y el precio en EB Garamond itálica 14 px
`--skin-ink-faded` **al lado**, como exige UI-R5; el sello ⌀ 48 arriba a la
izquierda del título. El epitafio: la misma página, con la capitular en
`--skin-wood-plaque` en vez de rojo.

### 3.6 Qué ilustración lleva cada entrada de la crónica

`ChronicleEntry.kind` tiene 21 valores. Se agrupan en 16 dibujos; los
`happening` se abren por su suceso (`state.happenings[].kind`, los doce de
R-1). Nombres de fichero en `public/ui/art/`:

| `kind` | dibujo |
|---|---|
| `founding` | `founding.svg` (dos figuras y un hato) |
| `season` | `season-<spring\|summer\|autumn\|winter>.svg` (4) |
| `birth` | `birth.svg` |
| `death`, `extinction` | `death.svg` |
| `harvest`, `forage` | `harvest.svg` |
| `famine` | `famine.svg` |
| `plague` | `plague.svg` |
| `fire` | `fire.svg` |
| `built` | `built.svg` (un tejado) |
| `lost`, `abandonment` | `lost.svg` (ruina) |
| `arrival`, `departure` | `road.svg` |
| `grudge` | `grudge.svg` |
| `succession` | `succession.svg` |
| `crossroad_posed`, `crossroad_taken`, `consequence` | **documento sellado** (§3.2), sin dibujo |
| `happening` → `lightning_fire` | `fire.svg` |
| `happening` → `river_flood` | `flood.svg` |
| `happening` → `wolves_at_the_coop` | `wolf.svg` |
| `happening` → `wedding` | `wedding.svg` |
| `happening` → `pedlar` | `pedlar.svg` |
| `happening` → `good_catch` | `fish.svg` |
| `happening` → `roof_under_snow` | `season-winter.svg` |
| `happening` → `harvest_feast` | `harvest.svg` |
| `happening` → `quarrel_in_the_square` | `grudge.svg` |
| `happening` → `bear_in_the_wood` | `bear.svg` |
| `happening` → `child_lost` | `child.svg` |
| `happening` → `stranger_passes` | `road.svg` |

La función pura `illustrationFor(entry, happenings): string | null` vive en
`src/ui/redesign/chronicle-art.ts` y se prueba sin DOM (una prueba por fila).
Si el fichero no existe en `public/ui/art/index.json`, el respaldo es la hoja
de roble: **una entrada nunca se queda sin su hueco**, y el arte «aparece»
cuando llega, como los aldeanos de V-15.

---

## 4. Los activos, y por qué el plan no se bloquea sin ellos

Encargo aparte para la sesión de arte: `encargo-arte-piel.md` (misma
carpeta). Lo que pide: los 22 dibujos de §3.6, el sello, la hoja de roble, dos
ornamentos de esquina, el borde de la bandeja, y los diez iconos del sprite en
trazo. **Todos con respaldo en este plan**, así que cada ronda de interfaz
cierra con o sin ellos:

| Activo | Respaldo hasta que llegue |
|---|---|
| ilustraciones de crónica | hoja de roble sobre óvalo (§3.2) |
| retratos | monograma (§3.3) |
| sello | círculo `--skin-red-deep` con `seal-tree` del sprite |
| ornamentos de esquina | se omiten |
| borde de la bandeja | borde plano de 6 px (§3.4) |
| iconos | los del sprite de UI-V0, simples |
| textura de pergamino | **no es un activo**: la genera `tools/ui/parchment.py` |

---

## 5. Las rondas, en orden, y qué agente

Cada ronda: **un agente Sonnet, un worktree, una pantalla**. Nadie toca
`tokens.css`, `skin.css`, `index.html` ni `public/ui/` fuera de UI-V0 sin
decirlo. La verificación de cada ronda es **typecheck + lint + los ficheros
tocados + la comparativa de §6**; la suite entera, al cerrar UI-V6.

| Ronda | Qué | Ficheros | Prueba de hecho |
|---|---|---|---|
| **UI-V0 · el kit de piel** | `tokens.css` con los `--skin-*` de §2 (los `--ui-*` se quedan, apuntando a los nuevos); `skin.css` con las primitivas `.skin-plate`, `.skin-plate--chip`, `.skin-plate--round`, `.skin-rule`, `.skin-capital`, `.skin-seal`, `.skin-medallion`, `.skin-chip`, `.skin-button--wood`, `.skin-button--parchment`, `.skin-nav`, `.skin-nav--plaque`, `.skin-scroll-edge`; fuentes empaquetadas + preload en `index.html`; `tools/ui/parchment.py` y `tools/ui/deckle.py`; `public/ui/icons.svg`; `public/ui/art/index.json` vacío; `tools/graphics/skin-compare.py` (§6) | `src/ui/redesign/{tokens,skin}.css`, `index.html`, `public/fonts/`, `public/ui/`, `tools/ui/`, `tools/graphics/skin-compare.py`, `tests/fast/ui-skin.test.ts` | un **muestrario** `artifacts/graphics/piel/muestrario.html` con cada primitiva al lado de su recorte del prototipo; las fuentes cargan **sin red** (captura con `--offline` tras una visita); prueba: cada token de §2 existe con su hex exacto; el PNG del pergamino es determinista (dos ejecuciones, misma huella) |
| **UI-V1 · cabecera, cifras y velocidad** | `hud.ts` usa las primitivas; el arco del sol desde `stats().sunPhase`; la cabecera compacta de dos placas cuando la ruta es `chronicle` | `src/ui/redesign/hud.ts` (+ su CSS en `skin.css` sólo si UI-V0 dejó hueco «hud») | comparativa 3.1 y la cabecera de 3.2; prueba pura: `sunArcPoint(phase)` devuelve el punto del arco para 0, 0,25, 0,5, 0,75 |
| **UI-V2 · bandeja y navegación** | borde de la bandeja, ornamento, frase, línea de órdenes pequeña, navegación con subrayado/placa y variante madera | `src/ui/redesign/shell.ts`, `shell.css` | comparativa de la franja inferior de 3.1, 3.2 y 3.3; `ui-redesign-shell.test.ts` sigue verde |
| **UI-V3 · la crónica como página** | página, degradado, ANNO con capitular, línea de tiempo, ilustración por entrada con respaldo, documento sellado para la decisión pendiente, `crossroad_taken` como tarjeta plana, ornamentos de esquina si existen | `src/ui/screens/chronicle.ts`, `src/ui/redesign/chronicle-art.ts` (nuevo), `tests/fast/ui-chronicle-art.test.ts` | comparativa 3.2; `illustrationFor` probada fila a fila; los enlaces de UI-R5 siguen funcionando (clic real) |
| **UI-V4 · la ficha de persona** | tarjeta, medallón con monograma, nombre · winters, oficio, chips, franja de relaciones **sólo con datos reales**, «Today:» con `activityOf`, FOLLOW / LIFE STORY | `src/ui/redesign/inspect-panel.ts`, `people-panel.ts`, `src/ui/backend.ts` (+ `activityOf` en `ValleyBackend`), `src/render3d/renderer.ts` **sólo** el método `activityOf` (avisar al coordinador: es la frontera de `dos-sesiones.md`), `bank.en.ts` (claves `today.*`, `kin.*`), `tests/fast/ui-kin.test.ts` | comparativa 3.3; prueba pura `kinOf(person, state)` con los cuatro vínculos y con ninguno; `activityOf` en 2D devuelve `null` y la línea no se monta |
| **UI-V5 · encrucijada y epitafio** | el documento sellado como pantalla; precio al lado de cada opción (UI-R5); el epitafio con capitular oscura | `src/ui/screens/crossroad.ts`, `epitaph.ts` | comparativa contra la tarjeta sellada de 02; los recorridos de `valley.shots.ts` sobre la encrucijada siguen verdes |
| **UI-V6 · validación visual** | hoja de contactos de las seis pantallas al lado de los prototipos; contraste; sin red; peso; y el dueño lo mira en su iPad | `tools/graphics/skin-compare.py` (ampliar), `docs/ui-redesign/piel/UI-V6.md` | §6 entero |
| UI-V4b (opcional, coordinador) | retrato desde el modelo real del aldeano, sepia, a un lienzo de 90 px | `src/render3d/` | sólo si el dueño quiere retratos sin ilustrador |
| UI-V4c (opcional, coordinador) | aro dorado bajo la persona seguida y contorno de su casa | `src/render3d/` | idem |

**Orden obligatorio:** UI-V0 primero y congelada antes de lanzar nada más;
después UI-V1, UI-V2 y UI-V3 pueden ir en paralelo (ficheros distintos); UI-V4
después de UI-V2 (usa la variante madera de la navegación); UI-V5 la última
antes de UI-V6.

---

## 6. Criterio visual de hecho: la comparativa, no la palabra

Cada ronda entrega, además de sus capturas, **una imagen** hecha por
`tools/graphics/skin-compare.py <pantalla>`: recorte del prototipo a 390 px de
ancho | captura real, misma altura, misma región (las regiones —cabecera,
franja inferior, página, tarjeta— van escritas en el propio script con sus
cajas en píxeles, no las elige el agente). El coordinador la mira y decide;
el agente **no declara «se parece»**: adjunta la imagen.

Y cuatro comprobaciones con número:

1. **Contraste** ≥ 4,5:1 en todo texto de lectura sobre pergamino y sobre
   madera (`tools/ui/contrast.py`, con los hex de §2; se ejecuta en UI-V0 y
   UI-V6). Si un par no llega, se oscurece la tinta, nunca se aclara el papel.
2. **Sin red**: una captura con la red cortada tras una primera visita abre
   con Cinzel y EB Garamond puestas (se comprueba `document.fonts.check`).
3. **Peso**: el `dist/` crece como mucho **300 KB** con fuentes, textura y
   sprite. Los SVG de arte se cuentan aparte cuando lleguen.
4. **Toque**: ningún control por debajo de 44 × 44 (ya hay prueba).

---

## 7. Lo que este plan no hace, a propósito

- No toca el valle 3D ni sus modelos: el fotorrealismo de los prototipos era
  ilustración de concepto, y el dueño lo ha dicho.
- No inventa datos: sin retratos hay monograma; sin esposa no hay «wife»; sin
  dibujo hay hoja de roble.
- No cambia comportamiento: todo lo de UI-R1 a UI-R5 se conserva y sus
  pruebas siguen siendo la red.
- No quita la línea de órdenes, aunque el prototipo no la tenga: es el verbo
  del juego y quitarla es una decisión del dueño.

---

## 8. Cómo se lanza cada ronda (para el coordinador)

El brief de cada agente es: este documento entero, más la fila de su ronda en
§5, más las reglas de siempre (`CLAUDE.md`, no cometer, worktree propio,
typecheck+lint+ficheros tocados, capturas con `shot.mjs --year 50`). Y una
frase al principio que corrige el error de la tanda anterior:

> **Copia la piel de los prototipos, no sus datos.** Los colores son los de
> §2 al hex; las medidas, las de §3 al píxel; los textos, los del banco. Si
> algo del prototipo necesita un dato que el motor no tiene, no lo inventes:
> usa el respaldo de §4 y dilo en tu informe.
