# Revisión del encargo «profundidad visual del valle en móvil», y el plan que propongo (29 sep 2026)

**Qué se revisa:** `docs/encargos/profundidad-visual-movil-2026-09-29.md`, en la
rama `art/astra-modelos`, commit `15b4f84` (Astra/Codex, 29 sep). Vera lo pasó
a Claude Code con el encargo de leerlo con ojo crítico —«no hagas porque sí lo
que te pide»— y sacar un plan. **Esta revisión no toca código**: está escrita
contra `main` en `efafc2e`, con las ramas en vuelo miradas (§1) y con capturas
propias del juego (§7). El encargo original se deja como está; esto es la
contrapropuesta.

---

## 0 · En una página

**El objetivo vale** —que el valle gane profundidad a tamaño de móvil sin
salirse del presupuesto— y dos de sus piezas son buenas: un oscurecimiento de
contacto hecho en lote, y que la persona que se sigue no desaparezca bajo las
copas. **Pero no se puede ejecutar tal cual**, por seis razones, de más a menos
grave:

1. **No cuenta con la tablet a 0 fps.** La tablet Android de Vera (800×1280) va
   a 0 fps con fotogramas de 2,3 s en la villa del año 60, y la primera lectura
   en el aparato está pendiente (`docs/medidas/rendimiento-piel-v9-2026-09-29.md`).
   Una ronda que añade coste por píxel no debería fusionarse antes de saber
   dónde se van esos dos segundos.
2. **Parte de un `main` de ayer.** `art/astra-modelos` sale de `36b3042` (28 sep)
   y no tiene «Graphics» (`render3d/profile.ts`, 29 sep): hoy la calidad la
   elige el jugador en cuatro niveles, y **en Low no hay sombras**. Todo lo nuevo
   tiene que declararse por nivel.
3. **Su evidencia no existe en ninguna rama.** Las dos capturas del «punto de
   partida» no están en ninguna de las 22 ramas del remoto.
4. **Su línea de base (GV-0) no se puede tomar con las herramientas de hoy**:
   cuatro sondas sólo arrancan en Windows, `shot.mjs` fotografía el perfil de
   escritorio y no el del móvil, y la resolución adaptativa cambia la escala de
   cada toma sin avisar (medido: de 0,55 a 1,0 en cinco tomas).
5. **Deja fuera lo que menos anclado se ve: la gente.** Los aldeanos no
   proyectan sombra —ninguna de sus mallas lo tiene puesto— y los animales la
   perdieron en v4.70 (costaban una llamada por malla); en la plaza a mediodía
   flotan. Las casas, en cambio, sí la dan.
6. **GV-3 (FXAA) se apoya en una premisa que no se midió** —MSAA se apagó en
   táctil en un paquete, no aislado— y es lo más caro que el encargo propone
   para la tablet: con three r185 obliga a dibujar en búferes de media
   precisión y añadir dos pases de pantalla completa.

**El plan (§4), en cinco fases:** instrumentos → línea de base con lectura en
el aparato → anclaje (la gente primero, luego el suelo, luego el prado) → el
seguido a la vista (medir antes de construir) → suavizado (MSAA medido antes
que FXAA). **Las tres primeras piezas visibles no añaden ni una llamada de
dibujo por edificio y funcionan también en Low.**

---

## 1 · Qué se comprobó y cómo

Código leído en `main` (`efafc2e`): `render3d/renderer.ts`, `profile.ts`,
`visual-config.ts`, `world/ground.ts`, `world/grass.ts`, `world/forest.ts`,
`world/forest-occlusion.ts`, `world/buildings.ts`, `world/plan.ts`,
`effects/clouds.ts`, `effects/mountain-veil.ts`, las herramientas de
`tools/graphics/` y la skill `performance`. Ramas en vuelo, mirando qué ficheros
tocan: `ccr-48790acc-ibi65c` (AN y F-0), `ccr-a64fa8a0-97u9ix` (sonido) y
`art/astra-modelos`. Capturas: aldea 11/año 21 y villa 7/año 60 a 390×844, con
perfil de escritorio y táctil, cielo despejado a mediodía (§7).

| El encargo dice | Lo que hay | Veredicto |
|---|---|---|
| ACES, PCF, niebla, ciclo de luz y adaptativa | `renderer.ts:320–330`, `fogAround`, `adaptResolution` | Cierto |
| «En táctil limita DPR a 1,5, sombra 1024 y sin MSAA **por el coste medido**» | Es el nivel **Medium** de `profile.ts:51`, al que resuelve `auto` en táctil. Hay además High y **Low (sin sombras)**. MSAA se apagó en v4.70 junto con la densidad y las sombras, **sin medirlo aislado en un aparato** | Desfasado y exagerado |
| `ground.ts` tiene `mottleAt`, `patchAt` y `meadowWeight` | `meadowWeight` vive en `world/grass.ts:199`; el suelo la recibe como función. Tocarla mueve también dónde crece la hierba | Impreciso, y `grass.ts` no está en los ficheros permitidos |
| `clouds.ts` proyecta sombras de nubes | Sí, en el sombreador del suelo (`vCloudXZ`), sólo sobre el suelo | Cierto, y es la vía para GV-1 (§3.6) |
| `forest.reveal` deja ver caza y asalto; falta el seguimiento | `track(id)` (`renderer.ts:2621`) sólo llama a `revealAssault()`, que revela caza o asalto | Cierto |
| Derivado de `Plan.buildings`/`PlannedBuilding` | Es `ScenePlan.buildings` (`world/plan.ts:443`), con huella `x, z, w, h` y `roofed` | Cierto salvo el nombre |
| No tocar la sombra solar sin vídeo y `shadow-flicker.mjs` | S-1 costó v4.90–v4.92; hoy `stepDegrees: 0` y centro alineado a la rejilla del mundo | Cierto y bien dicho |
| Capturas de partida en `docs/ui-redesign/opciones-graficas-v10-2026-09-29/capturas/` y `artifacts/graphics/env/` | No están en ninguna de las 22 ramas del remoto; `artifacts/*` además está en `.gitignore` | **Evidencia inaccesible** |
| Medir con `gl-probe.mjs` y `scene-report.mjs` | Las dos, y `shader-churn.mjs` y `cpu-profile.mjs`, llevan escrita la ruta de Chromium de Windows (`~/AppData/Local/ms-playwright/…/chrome.exe`) sin respaldo | **No arrancan fuera de Windows** |
| Tomas con «cámara, hora, estación, viewport y opciones fijas» | `shot.mjs` no elige calidad ni emula táctil (`shot.mjs:172`), no fija cielo ni hora (los ganchos `__valleyHoldSky`/`__valleyHoldPhase` existen en `renderer.ts:1585–1588` y ninguna herramienta los usa) y `__valleyCapture` dibuja a la escala que la adaptativa tenga en ese momento | **No se puede cumplir hoy** |

---

## 2 · Lo que vale y se conserva

- **El diagnóstico visual, en lo grueso, es correcto.** En las tomas a mediodía
  despejado la cara soleada de las casas apoya en prado claro sin ninguna
  transición, y en la aldea el prado de arriba es un verde casi plano con
  matas sueltas. En la villa las copas tapan casas y parte del cerco.
- **Los límites**: todo es presentación efímera y determinista; nada en
  `GameState`, guardados, `src/engine/` ni `src/derive/`. Es la regla de capas
  de `CLAUDE.md` y el encargo la respeta.
- **Reutilizar antes de añadir**: afinar las manchas del suelo antes que otra
  técnica de terreno, y no sembrar hierba densa en todo el mapa.
- **El presupuesto**: «un objeto y una luz nuevos por edificio quedarían fuera
  del presupuesto». Coincide con la skill `performance` (lecciones 1 y 12:
  cada malla es una llamada; ninguna luz nueva en la escena).
- **No tocar la sombra solar** sin vídeo antes y después.
- **Cerrar cada entrega con capturas y coste** antes de pasar a la siguiente, y
  **«la ausencia de respuesta no equivale a aprobación»**.
- **GV-3 como experimento que no se activa por defecto**, con el descarte
  documentado si borra a los aldeanos o cuesta.
- **El aviso de colisión en `renderer.ts`** es real: la rama de AN y F-0
  (`ccr-48790acc-ibi65c`) lleva +128/−55 líneas ahí sin fusionar. Las zonas que
  toca (caza, banco de batallas, sonda de F-0) no son las de este encargo, pero
  el fichero es el mismo.

---

## 3 · Lo que está mal o falta

### 3.1 · La tablet va a 0 fps y el encargo no lo menciona

El único aparato con un problema medido es la tablet Android de Vera: 505
llamadas, 775 mil triángulos, 0 fps y el peor fotograma en 2,3 s en la villa
del año 60. El panel de taller enseña desde `6acc645` el reparto del fotograma
(dibujo, vida, paint) y **esa lectura en el aparato es lo primero que falta**:
dice si la tablet está limitada por la GPU, por la capa de vida o por lo que
queda fuera del paint. El encargo habla de «presupuesto móvil» sin cifra y
remite a iPhone e iPad. Mientras no se sepa dónde se van esos dos segundos,
**nada que añada coste por píxel debe fusionarse**, y GV-3 es justo eso.

### 3.2 · El punto de partida es de ayer: falta el perfil «Graphics»

Desde `5c22772` el renderer no decide por `(pointer: coarse)`: aplica un
`RenderProfile` que elige el jugador (Auto, High, Medium, Low). Tres
consecuencias que el encargo no puede ver:

- **Cada pieza nueva se declara por nivel** en `RenderProfile` (un campo, como
  `lightGrass`), no con una comprobación de táctil escondida en el renderer.
- **En Low no hay sombras solares**: el oscurecimiento de contacto es ahí la
  única pista de apoyo que queda. Por eso tiene que existir en Low, y por eso
  tiene que ser casi gratis.
- **«El estado táctil actual» ya no es uno**: GV-3 tendría que compararse al
  menos en Medium y en Low.

### 3.3 · La evidencia no se puede abrir

`docs/ui-redesign/opciones-graficas-v10-2026-09-29/capturas/valle-390x844.png`
y `artifacts/graphics/env/after9-overview.png` no existen en ninguna rama; el
mensaje de entrega lo confirma («los demás cambios locales quedaron fuera»). Y
`artifacts/*` está en `.gitignore`: lo que se guarde ahí sin `git add -f` no
viaja. El mismo agujero tiene `docs/encargos/opciones-graficas-v10.md` en
`main`, que remite a esa carpeta. Un diagnóstico que nadie más puede ver no se
puede discutir: la línea de base tiene que subirse al repositorio.

### 3.4 · GV-0 no se puede tomar con las herramientas de hoy

Y todo lo demás compara contra GV-0. Cuatro huecos, todos pequeños:

1. **Las sondas sólo arrancan en Windows.** `gl-probe.mjs:20`,
   `scene-report.mjs:14`, `shader-churn.mjs:12` y `cpu-profile.mjs:13` buscan
   Chromium en `~/AppData/Local/ms-playwright` sin alternativa. En una sesión
   de Claude Code en la nube (Linux) no arrancan; `shot.mjs` y `film.mjs` sí
   tienen respaldo.
2. **`shot.mjs` fotografía el perfil de escritorio.** Abre la página sin
   táctil y a 2×, así que dibuja en **High** (MSAA, 2× y sombras 2048), que no
   es lo que ve un móvil (Medium). Medido en las tomas de §7: `coarse: false,
   level: 'high'` salvo que se fuerce.
3. **La adaptativa cambia la escala de cada toma.** En SwiftShader todo
   fotograma es lento, así que la adaptativa baja la densidad sola, y
   `__valleyCapture` dibuja a la que haya. En cinco tomas: 0,55, 0,7, 0,7, 0,85
   y 1,0. Comparar nitidez o dientes de sierra entre un «antes» a 0,55 y un
   «después» a 0,85 no dice nada de la técnica. **Hace falta fijar la escala
   para las tomas.**
4. **Ni la hora ni el cielo se pueden fijar desde la herramienta**, aunque los
   ganchos existen. `--year N` abre siempre en primavera, día 1, con el cielo
   que toque: la aldea 11/21 abre lloviendo a las 11:00, que no sirve para
   juzgar el contacto con el suelo.

Y una trampa que la medida de hoy dejó escrita: las escenas de referencia de
la skill `performance` usan `?debug=1`, que pinta además el valle en Canvas 2D
debajo del 3D. Vale para contar llamadas y triángulos (el Canvas no usa
WebGL), **no para el JS por fotograma**.

### 3.5 · La gente no tiene sombra, y es lo que más flota

La skill lo dice (lección 5 y la 14: «aldeanos y animales no la dan») y la
toma ampliada de la plaza lo enseña: a mediodía, cada casa tiene su sombra y
ninguna persona la tiene. En un juego que se mira de cerca y donde se toca a
un aldeano para seguirlo, **lo menos anclado del valle son los cuerpos**, no
los edificios. Los aldeanos nunca la han dado (no hay `castShadow` en sus
mallas) y a los animales se les quitó en v4.70 por una razón buena —en el
mapa de sombras cada malla es una llamada más, y eran 177—. La respuesta
barata es la clásica: **un disco de sombra suave bajo cada cuerpo, todos en una
`InstancedMesh`: una llamada para toda la aldea**, colocado a la cota de los
pies (así vale también en el adarve) y que se apaga con la luz del día y dentro
de casa. El encargo no lo contempla, y es probablemente la mejora de anclaje
más visible por su coste.

### 3.6 · GV-1: la técnica no está decidida, y la obvia no sirve

- **El suelo tiene un color por esquina de celda**, un vértice cada tres
  metros (`buildGround`, `ground.ts:826`). Oscurecer en ese color daría una
  mancha de dos por dos celdas —seis metros— alrededor de una casa de una
  celda: se leería como suciedad, no como contacto.
- **Calcomanías sobre el suelo** (un quad por edificio, instanciados): el
  suelo junto a los caminos se hunde hasta 0,05 celdas (`RUT`, `ground.ts:440`)
  y los edificios se colocan a cota 0 (`buildings.ts:245`). Un quad a cota fija
  flotaría justo junto a las sendas, que es el «halo flotante» que el encargo
  teme; y además pide ordenar transparencias contra la hierba y el agua.
- **Lo que propongo: una máscara de contacto en textura**, de una sola
  componente (R8), de 4 a 8 texeles por celda —de 129 KB a 516 KB en el mapa
  de 72×112—, leída en el sombreador del suelo por su XZ de mundo. **El suelo
  ya lleva un parche así** para las nubes (`cloudShadows`, `ground.ts:898`).
  Cero llamadas nuevas, sin z-fighting, sigue la cota por construcción, se
  rehace sólo cuando cambia el plan, y vale en Low. La misma máscara puede
  oscurecer las matas de hierba de al lado si su sombreador la lee, para que
  una mata clara no tape la base.
- **«Edificios con techo» deja fuera las defensas**: muralla, empalizada y
  portón tienen `roofed: false`, y en la villa el cerco largo es lo que más
  pediría apoyo. Entran, con una caída más estrecha. Los campos y el
  cementerio, no.
- **El «desgaste visible alrededor de la aldea» tiene una trampa**: el
  desgaste del suelo es información del motor (`map.path`, las sendas que la
  gente pisa, y el camino del valle). Un anillo de tierra inventado alrededor
  de cada casa desdibuja lo que las sendas dicen. Si se quiere tierra pisada
  junto a una puerta, que salga de algo real, no de un halo.
- **Afinar `meadowWeight` es tocar `grass.ts`** y su prueba
  (`tests/fast/grass.test.ts`): hay que declararlo.
- **El criterio de coste está incompleto**: «una villa grande no multiplica
  llamadas» protege a un aparato limitado por llamadas, no a uno limitado por
  píxeles. Falta la cifra de coste por píxel que la skill ya sabe tomar
  (fotogramas por software en 40 s, dos versiones, mismo navegador).

### 3.7 · GV-2: el problema existe, no está medido, y la solución propuesta choca con algo

- **Choca con el hachazo.** `forest.sway` —el árbol que acusa el golpe del
  hacha (IA-anim)— se desactiva mientras haya **cualquier** árbol revelado
  (`forest.ts:629`), porque revelar compacta las ranuras de las instancias.
  Seguir al leñador, que es el caso más probable de alguien bajo copas,
  apagaría el vaivén del árbol que tala.
- **Sólo el robledal se puede atenuar** (`scatterCells(…, occludable = true)`
  sólo para él): los pinos de la loma, el matorral, el gran roble y **las
  casas** no. Con la cámara ortográfica a unos 30°, una casa de 1,04 de
  caballete tapa entero a quien pase a menos de ~0,7 celdas por detrás, y los
  pies hasta ~1,8. En una aldea «donde las casas se tocan» puede tapar más una
  casa que un árbol. **No se sabe qué pasa más**, y de eso depende qué
  construir.
- **El coste no es el del recorrido** —unos 500 árboles, uno por celda de
  bosque (505 en la semilla 7, 486 en la 11); recorrerlos es barato— **sino el
  de cada cambio de firma**: reescribe las matrices de todas las piezas y
  recalcula dos esferas. Con el seguido andando, la firma cambia a menudo.
  Acotable con histéresis, pero hay que contarlo.
- **Hay una técnica ya probada en casa**: el velo de la montaña
  (`effects/mountain-veil.ts`) usa tramado (`discard` con una matriz de Bayer)
  y uniformes compartidos: **ninguna llamada, ninguna recompilación, ninguna
  instancia movida** y fundido suave. Un velo así alrededor del seguido, en el
  material de las copas y si hace falta en el de las casas, resuelve los dos
  tapadores con una pieza, no toca `forest.reveal` (que sigue sirviendo a caza
  y asalto) y deja el hachazo en paz.

### 3.8 · GV-3: premisa sin medir, y lo más caro para la tablet

- **MSAA no se apagó «por el coste medido»**: v4.70 lo apagó en táctil en un
  paquete con la densidad a 1,5 y las sombras a 1024, y no hay una medida de
  MSAA solo; lo que se midió entonces era del portátil y de SwiftShader, que
  rasteriza en la CPU y donde MSAA sí cuesta. En las GPU
  de teselas de los móviles el MSAA del lienzo suele resolverse dentro del
  propio tile y ser barato; depende del aparato y del navegador, y **eso es
  justo lo que no se midió**.
- **FXAA no es gratis en este renderer.** Hoy se dibuja directo al lienzo, con
  el ACES y el sRGB aplicados en cada material. Con three r185 un filtro de
  pantalla pide o bien `outputBufferType: HalfFloatType` + `setEffects` (la
  escena en un búfer de media precisión, el filtro y el pase de salida: y el
  filtro correría **antes** del mapeo de tonos, que no es donde FXAA funciona
  bien) o bien la cadena clásica `RenderPass` → `OutputPass` → FXAA. En los dos
  casos, **dos pases de pantalla completa más y búferes de 8 bytes por píxel**:
  unos 18 MB cada uno a 1,5× en 800×1280. En una tablet que ya va a 0 fps es
  añadir ancho de banda.
- **Y quizá no ataca lo que molesta.** A 390×844 con densidad 1,5 sobre una
  pantalla de 3×, el compositor ya escala ×2: los dientes llegan como
  escalones blandos. Lo que más se nota en movimiento suele ser el parpadeo de
  lo fino (briznas, listones), y un filtro espacial lo arregla poco.
- **El orden correcto**: A/B de MSAA solo, en el aparato; si sobra margen,
  dejar que la adaptativa suba la densidad por encima de 1,5; FXAA sólo si
  ninguna de las dos cabe.

### 3.9 · De forma

- **¿Para quién es?** El título dice «Encargo para Codex» y el cuerpo «Codex
  debe cerrar una entrega…», pero se entrega como brief para Claude Code. Si
  lo ejecuta una sesión en la nube, §3.4.1 lo bloquea desde el primer paso.
- **Mezcla dos objetivos**: profundidad (GV-1, GV-3) y legibilidad del seguido
  (GV-2). Van mejor como dos rondas con su medida cada una.
- **No dice dónde entra en `docs/plan-meta.md`** («toda ronda nueva se ordena
  contra el plan»): no avanza la meta —la villa que cae o aguanta—; es acabado
  visual, y va detrás del rendimiento en el aparato.
- **Sin contrato de API** para el módulo nuevo; para render basta con una
  firma corta, pero hace falta (§4).

---

## 4 · El plan

**Dónde entra en la meta:** es acabado visual, no avanza §1b. Va en la deuda
no bloqueante de `plan-meta` §2 (punto 6, «medida adicional en móvil»), y su
primera mitad —instrumentos y lectura en el aparato— sirve también al
problema de rendimiento, que sí es urgente.

| Fase | Qué | Prioridad | Dificultad | Quién | Depende de |
|---|---|---|---|---|---|
| **V-0 · Instrumentos** | Sondas fuera de Windows; `shot.mjs` con `--quality`, `--touch`, `--sky`, `--phase` y **escala fija**; interruptor de taller para MSAA | P1 | Baja | Luna, Terra (o cualquier sesión en la nube) | — |
| **V-1a · Línea de base aquí** | Aldea 11/21 y villa 7/60; Medium y Low (High de referencia); 390×844, 320×568 y **800×1280**; despejado a mediodía, atardecer y nublado; cifras de coste | P1 | Baja | Cualquiera | V-0 |
| **V-1b · Lectura en el aparato** | El panel de taller en la tablet y el iPhone, villa del año 60, Medium y Low; y MSAA sí/no | P1 | Baja | **Vera** (15 min) | — (V-0 sólo para el `?msaa`) |
| **V-2a · La sombra de los que andan** | Disco de contacto instanciado bajo cada cuerpo en pie | P2 | Media | Sol | V-1a |
| **V-2b · La máscara de contacto** | Casas con techo y defensas oscurecen el suelo a su pie, en el sombreador | P2 | Media | Sol | V-1a |
| **V-2c · El prado** | `PATCH`, `MOTTLE`, `MEADOW_SHADE`, `meadowWeight`: dos variantes, cuatro estaciones | P3 | Alta (cómo se ve) | Astra, con Vera | V-2b |
| **V-3a · ¿Cuánto se tapa el seguido?** | Medir la fracción del seguimiento tapada y por qué | P2 | Baja | Cualquiera | V-0 |
| **V-3b · El velo del seguido** | Tramado alrededor del seguido en copas (y casas si V-3a lo pide) | P3 | Media | Sol | V-3a, decisión de Vera |
| **V-4 · Suavizado** | MSAA en el aparato; densidad; FXAA sólo si nada cabe | P3 | Media | Sol | V-1b |

### V-0 · Instrumentos (sin cambio visible)

**Ficheros:** `tools/graphics/shot.mjs`, `tools/graphics/performance/{gl-probe,scene-report,shader-churn,cpu-profile}.mjs`,
`src/render3d/renderer.ts` (un gancho), `tools/README.md` y la skill
`performance`.

- Las cuatro sondas buscan Chromium como `shot.mjs`: la ruta de Windows si
  existe, si no la de Playwright; y todas, `shot.mjs` incluida, aceptan una
  ruta explícita por variable de entorno, porque el Chromium que trae la
  máquina no siempre es el que pide el Playwright del proyecto (§7).
- `shot.mjs`: `--quality auto|high|medium|low` (escribe `valley.graphics` antes
  de cargar), `--touch` (táctil y móvil a 3×, para que `auto` resuelva como en
  un teléfono), `--sky clear|overcast|rain|storm|snow` y `--phase 0..1` con los
  ganchos que ya existen (el mediodía es 0,45), y `--scale 1`.
- `renderer.ts`: `window.__valleyHoldScale(escala | null)` congela la
  resolución adaptativa mientras se toma. Y un `?msaa=0|1` de taller que
  sobreescribe sólo `antialias` al crear el contexto, para V-1b y V-4.
- **Terminado cuando** la misma orden dos veces da la misma imagen con el
  juego en pausa, y las sondas corren en esta máquina.

### V-1 · Línea de base

**V-1a**, aquí: las dos escenas, con Medium y Low, a 390×844, 320×568 y
800×1280 (la tablet), mediodía despejado, atardecer y nublado, **escena sola y
con interfaz**, y las cifras: llamadas, triángulos y programas (vale
`?debug=1`), JS por fotograma (por la portada, no por `?debug=1`) y
**fotogramas por software en 40 s** para el coste por píxel. Las imágenes se
suben al repositorio (`git add -f`) o no existen para nadie más.

**V-1b**, en el aparato, y **es la puerta de todo lo que cueste por píxel**:
Vera abre la villa del año 60 en la tablet y en el iPhone y lee las tres cifras
del panel de taller (dibujo, vida, paint) en Medium y en Low, y con `?msaa=1`.
Con eso se sabe si la tablet está limitada por la GPU, por la vida o por lo que
queda fuera del paint.

### V-2 · Anclaje

**V-2a · La sombra de los que andan.** Módulo nuevo
`src/render3d/world/foot-shadows.ts`; `renderer.ts` le pasa los actores donde
ya los pinta.

```ts
export interface FootShadows {
  readonly mesh: InstancedMesh;            // una llamada para todos
  update(actors: readonly Actor[], daylight: number): void;
  dispose(): void;
}
export function createFootShadows(capacity: number): FootShadows;
```

Un disco con caída radial en el sombreador (sin textura), a la cota de los
pies de cada cuerpo en pie; ninguno para quien está dentro de casa ni para un
caído (el ragdoll ya está en el suelo). La opacidad baja con la luz del día y
de noche desaparece. En los cuatro niveles. **Prueba** (propiedad, no captura):
una sola malla sea cual sea el número de cuerpos, y ningún disco para quien
está dentro. **Terminado cuando** la toma de la plaza a mediodía enseña a cada
persona apoyada, +1 llamada en las dos escenas y los fotogramas por software
dentro del ruido.

**V-2b · La máscara de contacto.** Módulo nuevo
`src/render3d/world/contact-shade.ts`, **puro y probado sin pantalla**:

```ts
/** De 0 (nada) a 255 (pie de la pared), `perCell` texeles por celda. */
export function contactMask(
  map: ValleyMap, buildings: readonly PlannedBuilding[], perCell: number,
): Uint8Array;
```

Casas con techo con una caída de unas 0,4 celdas; defensas con una más
estrecha; campos, cementerio y ruinas sin techo, nada. `ground.ts` la lee junto
a las nubes y oscurece el color final como mucho un 30 % (`// TUNE:` con la
captura al lado). Se rehace cuando cambia el plan, no cada fotograma. **Pruebas**:
cero lejos de todo edificio, máxima junto a la huella y decreciente hacia
fuera, ninguna celda de agua oscurecida, misma entrada → mismos bytes. **Terminado cuando** la
aldea y la villa se ven apoyadas en despejado, nublado y nieve, junto a
senda, plaza y agua; +0 llamadas; `shader-churn.mjs` sin programas nuevos al
pasar un rayo o una fiesta; y en Low se nota.

**V-2c · El prado.** Lo que el encargo pedía en GV-1.2, con los ficheros
declarados (`ground.ts` y `grass.ts`, con su prueba): dos variantes de
amplitud y tamaño de mancha, las cuatro estaciones (`--advance` de trece en
trece semanas), recorte normal de móvil y no sólo ampliaciones. Si el prado
necesita estructura más fina que un vértice por celda, antes que
subdividir la malla, ruido en el sombreador como el de las nubes. **Opcional,
y medido**: pasar el suelo de `MeshStandardMaterial` a Lambert, que la skill
ya apunta como ahorro por píxel y pagaría lo que V-2b y V-2c añaden. Lo decide
Vera con las dos capturas delante.

### V-3 · El seguido a la vista

**V-3a · Medir primero.** Un contador de taller para quien se sigue:
tapado por copa, por casa o por la loma, con `forest.hides` y una prueba de
rayo contra las cajas de los edificios. Diez aldeanos, sesenta segundos cada
uno, en las dos escenas. **Si el seguido está tapado menos del 5 % del tiempo,
V-3b no se hace** (umbral propuesto: que Vera lo fije antes de medir, no
después).

**V-3b · El velo.** Tramado alrededor del seguido, con la técnica del velo de
la montaña: el material de las copas —y el de las casas si V-3a dice que tapan
ellas— descarta los píxeles que quedan entre la cámara y el seguido dentro de
un radio, con uniformes compartidos. No se toca `forest.reveal`; el hachazo
sigue; la caza y el asalto siguen como están. **Terminado cuando** quien se
sigue se ve al cruzar bajo copas y tras casas, con +0 llamadas y sin
programas nuevos al empezar o dejar de seguir. **Decisión de Vera**: velo o
silueta a través (dibujar al seguido otra vez con la prueba de profundidad
invertida, una llamada más, de otro color). El velo es más del juego; la
silueta se lee siempre.

### V-4 · Suavizado

Con V-1b hecho: si MSAA en la tablet cuesta poco, se enciende en Medium (una
línea en `profile.ts`). Si no cabe y sobra margen, la adaptativa puede subir la
densidad por encima de 1,5 cuando va holgada. **FXAA sólo si ninguna de las
dos cabe**, como opción del nivel y no por defecto, medido en el aparato y con
las capturas a escala fija de V-0.

---

## 5 · Lo que no haría

- **Nada de SSAO, desenfoque de profundidad ni contornos por posproceso**: cada
  uno es un pase de pantalla completa en el aparato que peor va.
- **Ni una luz ni un objeto por edificio** (lo dice el encargo, y bien).
- **No tocar la sombra solar** en esta ronda.
- **No meter `forest.reveal` en el seguimiento continuo** tal como está: está
  hecho para sucesos cortos (caza, asalto) y apaga el hachazo.
- **No empezar V-2 ni V-3 en `renderer.ts` mientras la rama de AN y F-0 siga
  abierta** sin mirar sus cambios: los cruces se dejan en una llamada por
  pieza (`docs/dos-sesiones.md`).

---

## 6 · Lo que decide Vera

1. **Si la ronda va antes o después del rendimiento de la tablet.** Mi
   recomendación: V-0 y V-1 ya (sirven a las dos cosas); V-2 detrás de V-1b.
2. **Cómo se ven** la sombra de los pies y la máscara (cuánto oscurecen), con
   capturas a escala fija.
3. **Velo o silueta** para el seguido, si V-3a dice que merece la pena.
4. **MSAA en Medium**, con la cifra de la tablet delante.
5. **Quién ejecuta**: si es una sesión en la nube, V-0 es lo primero; si es
   Codex en Windows, las sondas ya le corren, pero el resto de V-0 hace falta
   igual.

---

## 7 · Cómo se hicieron las capturas de esta revisión

Juego empaquetado de `main` (`npx tsx tools/graphics/bundle-game.ts`) y
`shot.mjs` con dos añadidos locales **que no están en el repositorio** (son la
mitad de V-0): contexto táctil a 3× para que `auto` resuelva en Medium, y los
ganchos `__valleyHoldSky('clear')` y `__valleyHoldPhase(0.45)` antes de
disparar. Y en la nube `shot.mjs` tampoco arrancó a la primera: el Playwright
del proyecto pide su Chromium (1243) y el instalado es otro (1194); hubo que
enlazarlo a mano. V-0 debería aceptar una ruta explícita del navegador. Escena
sola (`--scene-only`), 390×844:

| Toma | Perfil | Escala adaptativa al disparar | Llamadas · triángulos |
|---|---|---|---|
| Aldea 11/21 | Medium (táctil) | **0,55** | 265 · 446 mil |
| Aldea 11/21 | High | 0,7 | 261 · 488 mil |
| Villa 7/60 | Medium (táctil) | 0,85 | 241 · 486 mil |
| Villa 7/60 | High | 1,0 | 240 · 538 mil |
| Aldea 11/21 ampliada ×0,4 | High | 0,7 | — |

La columna de la escala es el argumento de §3.4.3: cinco tomas, cuatro escalas
distintas. Las imágenes no se suben porque no sirven como línea de base (no
tienen la escala fija); V-1a las rehace bien.
