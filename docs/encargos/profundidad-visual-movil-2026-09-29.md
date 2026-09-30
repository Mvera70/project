# Encargo para Codex · profundidad visual del valle en móvil

> **Ejecutado el 29 sep 2026 por Claude Code** (rama `ccr-81589d5f-v4dxsy`):
> GV-0, GV-1 y GV-2 hechos; GV-3 medido **sin cambiar el valor por omisión**.
> Lo que se hizo, lo que costó, lo descartado y lo que falta ver en un iPhone o
> iPad está en **«Resultado»**, al final. La lectura crítica previa, en
> `profundidad-visual-movil-revision-2026-09-29.md`.

**29 sep 2026 · propuesta técnica, sin implementar.** Esta ronda mejora el 3D
que el jugador mira habitualmente. No rediseña la interfaz ni cambia el motor.
Se evalúa en el encuadre real de 390×844 y 320×568, con el valle sin interfaz
como apoyo, y en la aldea y la villa.

## Punto de partida

- Captura móvil reciente (`valle-390x844.png`) y vista amplia
  (`after9-overview.png`) —**no se versionaron nunca**, ver la revisión §3.3;
  las tomas reproducibles de GV-0 están en `artifacts/graphics/visual-depth/`—: el estilo
  low poly y la paleta están decididos, pero la aldea se lee poco anclada al
  suelo y el prado pierde estructura en el zoom habitual.
- `renderer.ts` ya usa ACES, sombra PCF, niebla, ciclo de luz y resolución
  adaptativa. En táctil limita DPR a 1,5, usa mapa de sombra 1024 y desactiva
  MSAA por el coste medido. El mapa de sombra es 2048 en escritorio.
- `world/ground.ts` ya tiene `mottleAt`, `patchAt` y `meadowWeight` para manchas
  amplias y suelo más oscuro bajo hierba. `effects/clouds.ts` proyecta sombras
  de nubes. Se afinan esas capas antes de añadir otra técnica de terreno.
- `forest.reveal` ya deja ver caza y frente de asalto; el velo de montaña actúa
  al bajar la cámara. Falta cubrir el seguimiento normal de una persona.
- La sombra solar tuvo un defecto temporal difícil (`S-1`, v4.90–v4.92). No
  cambiar su cámara, sesgo, resolución o cadencia sin vídeo antes/después y
  `shadow-flicker.mjs`. La confirmación en la tablet sigue pendiente.

## Objetivo y contrato

La imagen debe ganar profundidad **a tamaño normal de juego**, conservar la
lectura low poly clara y mantener el presupuesto móvil. Todo lo nuevo es
presentación efímera: misma semilla y estado dan la misma colocación; ninguna
entrada nueva en `GameState`, guardados, `src/engine/` o `src/derive/`.

El trabajo se divide en tres entregas implementables y un experimento de
filtrado. Codex debe cerrar una entrega con capturas y coste comparado antes de
pasar a la siguiente. Si hay trabajo de animación AN en curso, usar checkout
aislado y conservar los cambios ajenos; ambas tandas podrían tocar
`renderer.ts`.

### GV-0 · Línea de base

**Ficheros:** solo evidencia bajo `artifacts/graphics/visual-depth/` y el
informe de esta ronda.

Capturar la aldea semilla 11/año 21 y la villa semilla 7/año 60 con cámara,
hora, estación, viewport y opciones fijas. Guardar vista normal con interfaz y
`--scene-only`; al menos día despejado y otra condición que ponga a prueba
sombras/contraste. Medir ambas escenas con `gl-probe.mjs` y
`scene-report.mjs`. Registrar llamadas, triángulos, programas y JS por
fotograma. SwiftShader sirve para comparar versiones, **no** para afirmar FPS
de iPhone o iPad.

**Terminado cuando:** hay imágenes y cifras reproducibles con sus comandos y
parámetros exactos. Si la captura cambia de cámara entre versiones, se repite.

### GV-1 · Contacto y suelo

**Ficheros permitidos:** `src/render3d/world/ground.ts`, un módulo nuevo
`src/render3d/world/contact-shade.ts`, `src/render3d/renderer.ts`,
`src/render3d/visual-config.ts` y pruebas focales si hay lógica nueva.

1. Añadir oscurecimiento suave y local bajo la huella de edificios con techo,
   derivado de `Plan.buildings`/`PlannedBuilding` y adaptado a la cota del
   terreno. Construirlo en lote y rehacerlo solo cuando cambien edificios o
   terreno; un objeto y una luz nuevos por edificio quedarían fuera del
   presupuesto. Mantenerlo legible en nieve y junto a caminos, plaza y agua.
   Probar primero la aldea y la villa antes de extenderlo a otros elementos.
2. Afinar las capas **existentes** de `ground.ts`: tamaño y contraste de manchas,
   `meadowWeight` y desgaste visible alrededor de la aldea. No añadir hierba
   densa al mapa entero ni una textura repetida que haga visible la cuadrícula.
   El prado, caminos, campos y orillas deben seguir distinguiéndose en las
   cuatro estaciones. Guardar dos variantes comparables antes de elegir.
3. Conservar sombras solares, ACES, niebla y luz de día tal como funcionan,
   salvo una corrección que la evidencia muestre imprescindible.

**Terminado cuando:** las casas tocan el suelo sin halos flotantes, z-fighting
ni manchas negras; el prado gana estructura a escala móvil sin moteado de
cuadrícula; una villa grande no multiplica llamadas por cada edificio.

### GV-2 · Oclusión de quien se sigue

**Ficheros permitidos:** `src/render3d/renderer.ts`,
`src/render3d/world/forest.ts`, `src/render3d/world/forest-occlusion.ts` y sus
pruebas focales.

Reutilizar `forest.reveal` y **unir** sus objetivos actuales de caza/asalto con
la persona seguida por `track(id)`. El seguidor no debe borrar la revelación de
un asalto ni atenuar todo el bosque. Al dejar de seguir, restaurar los árboles.
Comprobar en una secuencia corta de movimiento la aparición/desaparición de las
copas y suavizarla solo si el salto se aprecia y el coste lo permite.

**Terminado cuando:** la persona seguida permanece visible al cruzar detrás de
copas; un asalto y una caza conservan su lectura; la escena sin objetivo mantiene
el bosque opaco.

### GV-3 · Filtrado: experimento acotado

**Ficheros:** candidato aislado en el render y capturas/medidas; no activar por
defecto hasta comparar en dispositivo real.

Comparar el estado táctil actual con un antialias de pantalla de bajo coste
aplicado solo al lienzo 3D (por ejemplo FXAA), con la misma escala de render y
cámara. Inspeccionar tejados, ramas, aldeanos y hierba **en movimiento**:
nitidez, parpadeo y estelas. Registrar memoria, llamadas, programas y tiempo.
El filtrado anisotrópico tiene poca utilidad aquí porque predomina el color por
vértice y el material liso. Si el filtro borra a los aldeanos o empeora el
coste, documentar el descarte y conservar el render actual.

## Verificación y cierre

- Comparativas antes/después para GV-1 y GV-2 con iguales semilla, estado,
  cámara y viewport; incluir el recorte normal del móvil, no solo ampliaciones.
- Medir otra vez aldea y villa con las herramientas de GV-0. Si se añaden o
  cambian materiales/sombreadores, pasar `shader-churn.mjs`. No aceptar una
  mejora que degrade la villa sin mostrar el coste y la alternativa probada.
- `npm run typecheck`, lint focal y pruebas afectadas durante la ronda;
  cierre amplio según `CLAUDE.md`. Pruebas nuevas solo para propiedades de
  colocación/oclusión que una captura no pueda proteger.
- Actualizar `docs/task-log.md`, `docs/changelog.md` y este brief con el
  resultado real. Documentación en español; identificadores en inglés y
  comentarios del código en español. Las constantes visuales ajustadas deben
  llevar motivo y evidencia; no inventar cifras de balance.
- Entregar capturas, vídeo breve si cambia una transición, comandos de
  reproducción, métricas antes/después, archivos tocados y límites pendientes
  de comprobar en iPad/iPhone. La aprobación visual del acabado corresponde a
  Vera; la ausencia de respuesta no equivale a aprobación.

---

## Resultado (29 sep 2026)

**Ejecutado por Claude Code en la rama `ccr-81589d5f-v4dxsy`**, sobre `main`
`efafc2e`, sin tocar motor, guardados, interfaz ni modelos. Las entregas, por
orden y cada una con su toma antes de pasar a la siguiente. La evidencia está en
`artifacts/graphics/visual-depth/`: las hojas comparadas (`hojas/`) y las
cifras (`metricas/`) están en el repositorio; las tomas en bruto y las dos
compilaciones del juego se regeneran con los comandos de abajo.

**Todo lo que es tiempo está medido con SwiftShader —dibujo por software— en un
contenedor de cuatro núcleos.** Sirve para comparar dos versiones en la misma
máquina; **no dice nada de los fotogramas de un iPhone o un iPad**, y no se
presenta como tal.

### GV-0 · La línea de base, y los instrumentos que faltaban para tomarla

La lectura previa ya lo advertía (revisión, §3.4): con las herramientas de hoy
dos tomas seguidas no daban la misma imagen. `shot.mjs` fotografiaba el perfil
High aunque fingiera un teléfono, y la resolución adaptativa baja sola en un
dibujo por software —cinco tomas del mismo día salieron a cuatro escalas, de
0,55 a 1—, así que un «antes/después» comparaba resoluciones y no técnicas.
Lo que se añadió, **sin cambio visible** (`89136b2`, que es el «antes» de todo
lo que sigue):

- `shot.mjs --touch --dpr --quality --sky --phase --scale --pause`: el perfil
  de un teléfono (Medium: densidad tope 1,5, sin MSAA, sombra 1024), el cielo y
  la hora fijos, la adaptativa sujeta (`__valleyHoldScale`) y el valle quieto.
  **Dos tomas seguidas de la misma versión: 0 % de píxeles distintos.**
- `gl-probe.mjs --seed --year`: por la portada, como juega el jugador (la ruta
  `?debug=1` pinta además el Canvas 2D y no vale para el JS por fotograma). Las
  cuatro sondas de `performance/` arrancan ya fuera de Windows.
- `follow-sequence.mjs`: sigue a un aldeano como lo hace su ficha
  (`__valleyTrack`) y graba N fotogramas a pasos fijos de la vida, con cuántas
  copas hay atenuadas y si una copa lo tapa. La misma secuencia en dos
  versiones.

Condiciones de todas las tomas: **aldea semilla 11 / año 21** y **villa semilla
7 / año 60**; **390×844 a densidad 3** y **320×568 a densidad 2**; perfil
táctil; escala 1; mediodía (fase 0,45) con cielo despejado y con cielo
cubierto; y además Low —sin sombras— a 390×844.

```bash
# las dos versiones, en un solo fichero cada una
git checkout 89136b2 && npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/visual-depth/game-before
git checkout ccr-81589d5f-v4dxsy && npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/visual-depth/game-after
# una toma (la escena sola; sin --scene-only, con la interfaz)
node tools/graphics/shot.mjs --page artifacts/graphics/visual-depth/game-after/valley.html \
  --seed 11 --year 21 --viewport 390x844 --dpr 3 --touch --sky clear --phase 0.45 --scale 1 --pause \
  --scene-only --out aldea-390x844-despejado-escena.png
# la sonda: llamadas, triángulos, programas, JS y el reparto de la escena
node tools/graphics/performance/gl-probe.mjs artifacts/graphics/visual-depth/game-after/valley.html \
  --seed 11 --year 21 --touch --sky clear --phase 0.45 --scale 1 --seconds 40 --report
# la secuencia del seguido
node tools/graphics/follow-sequence.mjs --page artifacts/graphics/visual-depth/game-after/valley.html \
  --seed 11 --year 21 --follow 66 --frames 16 --every 30 --zoom 0.5 --touch --out seguido/aldea-after
```

### GV-1 · El pie de los edificios y el prado

> **Las hojas antes | después de este apartado se tomaron con C3**, la fuerza
> que propuse. Vera eligió C1, más clara (tabla de abajo); la hoja
> `gv1-c1-final.jpg` enseña C1 en la aldea y la villa a la misma escala.

**Qué se ve.** Las casas se apoyan: una franja oscura y corta pegada a cada
pared, más marcada del lado de la sombra y en los callejones entre dos casas, y
que desaparece a poco más de un metro. Con el cielo cubierto —y en Low, que no tiene
sombras— es lo único que las ata al suelo; antes flotaban. El prado deja de
ser un verde liso a escala de móvil: las alfombras de hierba se leen como
masas oscuras entre el césped claro. Hojas, antes | después, a escala normal:
`hojas/gv1-{aldea,villa}-{390x844,320x568}-{despejado,nublado}-{escena,interfaz}.jpg`
y `hojas/gv1-{aldea,villa}-390x844-low.jpg`.

**La técnica.** `world/contact-shade.ts`: **una máscara de una componente para
todo el valle** (8 texeles por celda: 576 × 896, 516 KB), hecha en lote desde
`ScenePlan.buildings` y leída por el sombreador del suelo —encadenada como las
sombras de las nubes— justo donde three aplica su oclusión ambiental: quita
parte de la luz de cielo y algo menos de la del sol. Es el propio suelo, así
que **no puede flotar, no hay z-fighting y sigue la cota** por construcción;
**cero llamadas de dibujo**, también en la villa; y se rehace sólo cuando
cambian las bases con tejado, no con el fotograma. La base de cada edificio es
la de su GLB medido y no su parcela: la atalaya es la celda central de su
2 × 2, el pozo un brocal casi redondo, la capilla deja 0,18 a cada costado
(`CONTACT_SHADE.bases`). Sólo cuentan los edificios con tejado y en pie, como
pide el encargo: muralla, empalizada, portón, campos y cementerio quedan fuera.

**Dos variantes comparables, y una tercera.** El pie se probó con tres juegos
de fuerza (luz de cielo · luz de sol · alcance), en la capilla al sol
(`hojas/gv1-variantes-contacto-capilla-sol.jpg`) y en la aldea con el cielo
cubierto (`hojas/gv1-variantes-contacto-aldea-nublado.jpg`):

| | Cielo | Sol | Alcance | Qué pasó |
|---|---|---|---|---|
| **C1** | **0,62** | **0,24** | **0,42 celdas** | **Se queda: la eligió Vera** («me gusta la sombra más clara, C1, o la de antes»). La más sutil al sol; con el cielo cubierto sigue apoyando la casa |
| C2 | 0,85 | 0,40 | 0,55 | Al lado de la sombra, el pie de la capilla quedaba casi negro: allí sólo llega luz de cielo y se comía el 85 % — el encargo pide «sin manchas negras» |
| C3 | 0,55 | 0,42 | 0,55 | La que propuse: el sol pinta el apoyo y la sombra oscurece sin ennegrecer. Vera la vio más marcada de lo que quería |

**El prado.** Se tocaron sólo las capas que ya había en `ground.ts`, y se
compararon tres variantes contra hoy sobre la aldea en primavera y en invierno
(`hojas/gv1-variantes-prado-aldea.jpg`, `hojas/gv1-variantes-prado-invierno.jpg`,
y `hojas/gv1-prado-c-verano-otono.jpg` para las otras dos estaciones):

| | Qué cambia | Medida (aldea 11/21, 390×844) | |
|---|---|---|---|
| A · masas amplias | manchas lentas 0,12 cada 9 celdas (hoy 0,07 cada 6) | 1,2 niveles de gris de media sobre 255 | **Fuera**: en invierno ensucia la nieve con manchas grises |
| B · prado hondo suave | mezcla del verde de debajo de la hierba 0,70 (hoy 0,45), 28 % más oscuro | 0,8 niveles de media | **Fuera**: no se ve |
| **C · prado hondo** | **mezcla entera, 40 % más oscuro, y manchas 0,09** | **2,6 niveles de media; el 10 % de los píxeles cambia más de 8** | **Se queda** |

Es la estructura que ya existía —dónde crece la hierba, `meadowWeight`—, no una
textura nueva: no hay cuadrícula repetida, y con nieve no cuenta. Coste en
ejecución, cero: son colores de vértice que se calculan al montar el suelo,
como antes.

**Lo que no se tocó, y por qué.** El **desgaste alrededor de la aldea**: el suelo
pisado es información del motor (`map.path`, las sendas que la gente hace, y el
camino del valle); un halo de tierra inventado alrededor de cada casa
desdibujaría lo que las sendas dicen (revisión, §3.6). Las **sombras solares,
ACES, niebla y luz de día**, como pide el punto 3: ninguna prueba lo hizo
imprescindible.

### GV-2 · Quien se sigue, a la vista

**Qué se ve.** Al seguir a alguien, las copas que lo tapan desde la cámara se
funden hasta casi desaparecer y vuelven al dejar de taparlo o de seguirlo.
Secuencia de la aldea 11/21 siguiendo al aldeano 66 (`hojas/gv2-seguido-aldea-11-21.jpg`,
un fotograma por segundo de vida): **antes, tapado en 6 de 16 fotogramas y
ninguna copa atenuada; después, las 5 copas que lo tapan se atenúan y vuelven
una a una a medida que sale** (5, 4, 3, 2, 1, 0). El fundido, a sexto de
segundo (`hojas/gv2-fundido-1-6s.jpg`): 0,35 s, sin salto.

**Cómo.** Reutiliza `forest.reveal`: quien se sigue **se suma** a los objetivos
de la caza o del asalto, no los sustituye. **El asalto conserva su lectura**:
28 copas atenuadas ante el portón de la villa 7/60, antes y después
(`hojas/gv2-asalto-villa-7-60.jpg`). Sin nadie seguido y sin encuentro, el
bosque queda opaco y la llamada a `forestOccluders` sale en la primera línea.

**Lo que hubo que arreglar por el camino**, todo en `forest.ts`:

- **El hachazo.** Revelar compactaba las instancias y `sway` se apagaba
  mientras hubiera *cualquier* copa atenuada; seguir al leñador —el caso más
  probable de alguien bajo copas— dejaba quieto el árbol que tala. Ahora cada
  árbol sabe en qué malla y en qué hueco está, y se mueve atenuado o no.
- **El leñador atenuaba su propio árbol.** Con el volumen de una presa y la
  esfera del árbol entero, el que estaba al lado del tronco se atenuaba sin
  taparlo. El seguido se mide ahora **contra la copa sola** (`canopyOnly`) y
  con el radio de medio cuerpo; la caza y el asalto se siguen midiendo como
  antes. Secuencia del leñador (aldeano 3): una copa atenuada en falso con la
  primera versión, ninguna con ésta.
- **El salto, la sombra y el viento.** Antes la copa pasaba de opaca a 0,06 de
  golpe, perdía su sombra en el suelo y dejaba de mecerse. Ahora se funde por
  instancia (un atributo `instanceFade`), conserva la sombra y se mece con las
  demás.

### GV-3 · Suavizado: medido, y el valor por omisión no cambia

`effects/screen-aa.ts`: `?aa=none|msaa|fxaa` en la dirección sustituye sólo el
suavizado; sin él, el del perfil. Vale también en el sitio publicado, a
propósito: la medida que decide es la de un iPhone o un iPad. FXAA va detrás
del mapeo de tonos, que es donde trabaja bien, lo que obliga a dibujar la
escena en un búfer de media precisión y añadir dos pases de pantalla completa.
Misma cámara, misma escala, aldea y villa a 390×844, quieto y en movimiento
(`hojas/gv3-suavizado-aldea-x3.jpg`, un recorte ampliado tres veces):

| | Nitidez aldea / villa (varianza del laplaciano) | Parpadeo en movimiento (media / píxeles que cambian más de 16) | Memoria añadida | Llamadas · programas · fotogramas por software en 40 s (aldea / villa) |
|---|---|---|---|---|
| Sin suavizado (hoy en táctil) | 1717 / 1473 | 0,56 / 0,45 % | — | — · 41 · 55 / 9 |
| MSAA 4× | 754 / 668 | 0,53 / 0,51 % | la del navegador, no medible desde el juego | las mismas · 41 · 38 / 8 |
| FXAA | 299 / 293 | 0,49 / 0,41 % | 17,8 MB a 390×844; 55 MB en una tablet de 800×1280 | +2 (los dos pases de pantalla, un triángulo cada uno) · 70 / 72 · 48 / 9 |

Nitidez: varianza del laplaciano en gris sobre la toma entera; más alta, bordes
más duros. Parpadeo: diferencia media entre fotogramas seguidos de
`follow-sequence.mjs --follow none --lead 20 --frames 10 --every 2 --zoom 1`, y
la fracción de píxeles que cambia más de 16 niveles. **FXAA recompila la escena
entera** para dibujarla en el búfer —sin mapeo de tonos ni sRGB en cada
material—, y de ahí los ~30 programas de más: en un móvil, otros tantos tirones
al abrir el valle.

**FXAA, descartado**: borra lo que no debe —se come el 80–83 % del detalle fino, y
un aldeano mide seis píxeles—, apenas mejora el parpadeo y es lo
más caro en el recurso que falta en la tablet: memoria y ancho de banda por
píxel. **MSAA es el mejor a la vista** —bordes limpios sin emborronar a la
gente—, pero es justo lo que el perfil Medium apaga por coste medido en su día;
**queda pendiente de medir en el aparato** con `?aa=msaa` contra `?aa=none`.

### Lo que costó

Mismo navegador (Chromium 141 con SwiftShader), perfil táctil, escala 1,
mediodía despejado, 40 s por sonda. Cifras en `metricas/sondas.txt` (llamadas,
programas, fotogramas y el reparto de escena) y `metricas/reparto.txt` (el
reparto del fotograma que mide el renderer).

| | Antes | Después | Qué dice |
|---|---|---|---|
| Llamadas de dibujo, el mismo fotograma (sin / con pase de sombra) | aldea 261 / 426 · villa 240 / 449 | **las mismas** | El pie no añade ninguna. Mientras haya copas atenuadas, una por pieza de árbol en la malla translúcida y su pareja en el pase de sombra |
| Triángulos, el mismo fotograma | aldea 445 530 · villa 485 810 | **los mismos** | |
| Programas enlazados en la sonda | 41 | **41** | El suelo cambia de clave de programa, no añade uno |
| Recompilaciones (`shader-churn`: al cargar, tras un rayo, con la fiesta, al quitarla) | 43 · 47 · 47 · 47 | **43 · 47 · 47 · 47** | Ningún tirón nuevo |
| Memoria de GPU | — | +516 KB | La máscara (R8, 576 × 896) y 4 bytes por árbol del fundido |
| CPU al terminar un edificio con tejado | — | 0,3 ms la aldea · 1,9 ms una villa de 140 casas | Rehacer la máscara; al principio recorría el mapa entero (3,2 y 6,9 ms) y se acotó a la caja de los edificios, con los mismos bytes |
| CPU por fotograma sin seguir a nadie | — | 0,3 µs | `reveal` sale en la primera línea |
| CPU por fotograma siguiendo a alguien por el bosque | — | 24 µs de mediana, 73 de p90 (486 árboles) | Una prueba de oclusión por árbol; la caza o el asalto ya costaban 15 µs |
| Reparto del fotograma en la aldea (mediana, ms: `paint` · dibujo · vida · resto) | 22,3 · 7,2 · 4,2 · 9,6 | 21,0 · 7,2 · 3,6 · 9,3 (y 20,6 · 7,1 · 3,6 · 8,9 y 19,6 · 7,7 · 3,4 · 9,3 con la versión final) | Igual dentro del ruido. El «resto» —JS fuera del dibujo y de la vida, donde vive el bosque— no se mueve |
| Siguiendo al aldeano 66 | 18,7 · 5,0 · 3,5 · 9,3 · 69 fotogramas · 128 llamadas | 21,4 · 5,6 · 5,0 · 9,3 · 63 fotogramas · 139 llamadas | El resto, igual: los 24 µs no se ven. Las copas translúcidas cuestan píxeles al dibujo por software y tres llamadas por pase (tronco y dos hojas) mientras duran; la vida no la toca esta ronda y varía 1,5 ms entre tomas |
| Villa, a escala 0,25 para tener fotogramas | 3949 · 10 · 0 · 3941 · 10 fotogramas | 3744 · 12,9 · 0 · 3731 · 10 fotogramas | **La villa no llega a vivir, antes ni después**: ver el hallazgo de abajo. Con la vida parada no se puede comparar su JS; el dibujo, igual |
| Fotogramas dibujados por software en 40 s (aldea · villa) | 53, 53, 54 · 9, 9 | 42, 51, 55, 55 · 8, 9, 9 | Dentro del ruido de las repeticiones: el muestreo de la máscara no se distingue en software. **Se lee en el aparato** con `?contact=off` (abajo) |
| El pie encendido y apagado, misma versión (`?contact=off`, aldea, dos veces cada uno) | apagado: 56 y 55 fotogramas · dibujo 6,8 y 7,5 ms | encendido: 55 y 56 · 7,1 y 7,7 ms | Indistinguible por software |

Las cifras de CPU sin navegador son de `forest.reveal`, `stepReveal` y
`contactMask` sobre el bosque y la aldea de `foundTwenty(11)` en Node, en esta
misma máquina.

### Un hallazgo que no es de esta ronda: la villa se queda en bucle (y la tablet a 0 fps)

> Apuntado aparte, con la evidencia entera y cómo reproducirlo:
> `docs/medidas/bucle-villa-2026-09-29.md` (GV-4 en `plan-meta.md`).

Midiendo el reparto del fotograma, la villa 7/60 dio **3,7–3,9 s por `paint`**
con el dibujo en 10 ms y la vida en cero pasos, **antes y después** de esta
ronda, con los ganchos de toma y sin ellos. El perfil de CPU (el juego sin
minificar) lo reparte así: **el 83–87 % es `createVillage`**, casi todo rutas
de A* (`finePathTo` desde `placesOf`: el común y la orilla; `fordDrinkOf` de las
bestias). La cabecera no se mueve del «Year 60 · Spring, day 1» y la vida se
queda en `steps: 0`: **se rehace entera en cada fotograma**. La causa está en
`presentation-clock.ts`:

1. `SUSPEND_GAP_SECONDS = 1`: un hueco de más de un segundo entre fotogramas
   se toma por una ausencia —la pestaña escondida—, y el fotograma sale
   `discontinuity`.
2. Una discontinuidad reinicia la jornada escénica (`scenic.reset()`), el
   estado que se pinta es otro objeto y el renderer rehace la capa de vida.
3. En la villa, rehacerla cuesta más de un segundo (3,8 s aquí). El fotograma
   siguiente vuelve a llegar con más de un segundo de hueco: otra
   «ausencia», otra jornada nueva, otro `createVillage`. **No sale nunca.**

**Comprobado**: el mismo `main` con el umbral a 30 s se recupera tras el primer
fotograma (5,7 s) y queda en 18–78 ms por `paint`, con la vida dando tres pasos
por fotograma. Es exactamente lo que Vera vio en la tablet —«0 fps con
fotogramas de dos segundos, año 60»—: en un portátil `createVillage` de la
villa no llega al segundo y el bucle no arranca, y en un aparato más lento sí.
La aldea no entra (su vida se hace en menos de un segundo aquí).

**No se ha tocado**: `presentation-clock.ts` no estaba entre los ficheros del
encargo. El arreglo que propongo, para una ronda propia: que el hueco que
cuenta como ausencia descuente el tiempo que el propio fotograma anterior
estuvo trabajando (el bucle sabe cuánto tardó su `paint`), o que la vuelta de
una ausencia sólo rehaga la jornada si el reloj escénico cambió de día; y
**además** abaratar `createVillage` (las rutas del común y de la orilla se
pueden guardar por plan, no por jornada). Con la prueba de propiedad de que un
fotograma lento no encadena discontinuidades.

### Lo descartado

- **El pie C2 y C3** (arriba): C2 ennegrecía la sombra, y C3 —la que propuse—
  a Vera le pareció más marcada que C1 o que no tener ninguna. **Un disco o una luz por edificio** no se probó: el propio encargo lo
  deja fuera de presupuesto, y la máscara da lo mismo sin llamadas.
- **El prado A y B** (arriba): uno ensuciaba la nieve, el otro no se veía.
- **FXAA**: borra a los aldeanos, apenas mejora el parpadeo, 18–55 MB y 29–31
  programas más. Se queda como opción de taller (`?aa=fxaa`), apagada.
- **El desgaste inventado alrededor de las casas**: el suelo pisado es del
  motor.
- **El velo de tramado para el seguido** que proponía la revisión (§3.7): el
  encargo pedía reutilizar `forest.reveal`, y con el fundido por instancia no
  hizo falta.

### Límites que quedan

- **Sólo las copas.** Un tronco o una casa que tape al seguido no se atenúan:
  el encargo pedía el bosque. Desde la cámara del valle, a unos 30°, un tronco
  tapa las piernas unos pocos fotogramas.
- **El orden de lo translúcido durante el fundido.** La copa atenuada no escribe
  profundidad: en los 0,35 s en que todavía se ve casi opaca, el anillo del
  seguido se ve por encima de ella (fotograma 1 del GIF), y dos copas que se
  cruzan pueden ordenarse mal. A 0,06 de opacidad no se aprecia.
- **Las defensas no tienen pie.** Muralla, empalizada y portón quedan fuera
  porque el encargo pedía edificios con tejado; en la villa, el cerco largo es
  lo que más lo pediría (revisión, §3.6). Es añadirlas a `contactBases` con una
  caída más estrecha.
- **La hierba no lee la máscara**: una mata clara puede quedar encima del pie
  oscuro. `grass.ts` no estaba entre los ficheros permitidos.
- **La gente sigue sin sombra propia** (revisión, §3.5): no estaba en el
  encargo, y es lo que más flota de la escena.

### Lo que falta ver en un iPhone o un iPad

Todo con el panel de taller abierto (el reparto del fotograma: dibujo, vida,
`paint`), en la misma partida y a la misma hora, alternando la dirección:

1. **Lo que cuesta el pie de los edificios**: un muestreo de textura más por
   fragmento de suelo, que en software no se distingue del ruido. El valle
   normal contra `?contact=off`, en la aldea y en la villa.
2. **MSAA**: `?aa=msaa` contra `?aa=none`, en movimiento, mirando tejados,
   ramas y aldeanos. En SwiftShader cuesta un 30 % de fotogramas (38 contra 55
   en la aldea), pero una GPU de móvil por teselas resuelve el MSAA en el chip y
   el coste es otro. Si en el aparato cabe, se propone como valor de Medium en
   táctil; si no, se queda como está.
3. **El fundido de las copas**: que 0,35 s se lean como fundido y no como
   parpadeo, y que la sombra de una copa atenuada no despiste.
4. **El pie y el prado a la luz del teléfono**: las tomas son de SwiftShader con
   perfil sRGB forzado. **El pie C1 lo eligió Vera; el visto bueno del prado C sigue siendo suyo.**
5. **La tablet a 0 fps no es de esta ronda, pero ya tiene causa probable**: el
   bucle de la villa de arriba. Hasta que se arregle, las lecturas 1 y 2 en la
   tablet conviene hacerlas en la aldea (11/21), o la villa medirá el bucle y
   no el dibujo.

### Pruebas

- `npm run typecheck` y `eslint` de los ficheros tocados: limpios.
- **Pruebas nuevas, sólo de lo que una captura no protege**:
  `tests/fast/contact-shade.test.ts` (6: qué edificios hacen pie, dónde empieza
  la base, la caída hasta el alcance, el callejón, los mismos bytes en una aldea
  de verdad, y `?contact=off`), `tests/fast/forest-occlusion.test.ts` (+4: la
  copa sola, la unión con el asalto, el fundido, el hachazo con copas
  atenuadas) y `tests/fast/screen-aa.test.ts` (2).
- **Las 24 de la suite rápida que tocan suelo, bosque, efectos o render: 235
  verdes**, sobre la rama ya fusionada con `main`.
- **Tras la fusión con la PR #2**, sobre `main` `da8836f` y la rama fusionada
  (`metricas/tras-la-fusion.txt`): 41 programas en los dos, 313 contra 314
  llamadas y el JS fuera del dibujo en 9,3 contra 9,4 ms; y la toma de la
  aldea nublada de la rama fusionada es idéntica al píxel a la de «después».
- **Jornadas: `e3b-corridor` (5) y `work-contact` (1) rojas, y lo mismo en
  `main` `efafc2e`**, comprobado en un checkout aparte: no son de esta ronda.
- **Suite rápida entera, sobre la rama fusionada: 219 de 220 ficheros y 2102
  de 2103 pruebas verdes** (24 min en este contenedor). La única roja es
  `catchUp · §13.2` («960 ticks en
  menos de 2 s»), que en este contenedor tarda 2,2 s **también en `main`**
  (2,13 y 2,15 s, sola y sin carga): es la velocidad de la máquina, no el
  motor, que no se tocó.

### Ficheros

- Nuevos: `src/render3d/world/contact-shade.ts`,
  `src/render3d/effects/screen-aa.ts`, `tools/graphics/follow-sequence.mjs`,
  `tests/fast/contact-shade.test.ts`, `tests/fast/screen-aa.test.ts`.
- Tocados: `src/render3d/renderer.ts`, `src/render3d/world/ground.ts`,
  `src/render3d/world/forest.ts`, `src/render3d/world/forest-occlusion.ts`,
  `src/render3d/visual-config.ts`, `tests/fast/forest-occlusion.test.ts`,
  `tools/graphics/shot.mjs`, las cuatro sondas de
  `tools/graphics/performance/`, `tools/README.md`, `tools/graphics/README.md`
  y la skill `performance`.
- **Fusionada con `main` después de la PR #2** (la tanda AN, `da8836f`), el
  mismo día: `renderer.ts`, `shot.mjs` y `tools/README.md` entraron solos; en
  `gl-probe.mjs` y `scene-report.mjs` las dos tandas habían añadido
  `VALLEY_CHROMIUM` con el mismo nombre, y se quedó la versión que hace las
  dos cosas; los cuadernos llevan las entradas de las dos.
