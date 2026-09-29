---
name: performance
description: Cómo medir y mejorar el rendimiento de The Valley en 3D (Three.js + Rapier), sobre todo en tablet y móvil —llamadas de dibujo, sombras, resolución, sombreadores, CPU de la capa de vida—, con las herramientas del proyecto, las cifras de referencia y lo aprendido (qué funcionó, qué no y por qué). Úsala antes de tocar el render por rendimiento, al añadir mallas, modelos o efectos que puedan pesar, o cuando Vera diga que algo va lento.
---

# El rendimiento de The Valley

Lo pidió Vera el 27 sep 2026, tras probar la demo en su tablet: «arranca a 1 FPS…
también pasa con la aldea grande», «el rendimiento es nefasto», y «ve creando una
skill de rendimiento donde apuntes todo lo que vayas viendo y aprendiendo». **Esto es
un cuaderno vivo: quien mida algo nuevo, lo apunta aquí en la misma ronda.**

## Primero, medir — y qué se puede medir aquí

Las máquinas de los agentes no tienen GPU: Playwright dibuja con SwiftShader (por
software) y va a 1–3 FPS en cualquier escena. **Los FPS y los ms de GPU que salen aquí
no representan una tablet.** Lo que sí es comparable entre versiones:

| Cifra | Herramienta | Qué dice |
|---|---|---|
| Llamadas de dibujo por fotograma | `node tools/graphics/performance/gl-probe.mjs <valley.html> "<query>" 60` | Lo que más castiga a una tablet con WebGL (CPU del driver + JS de Three por llamada) |
| Triángulos por fotograma | la misma | Carga de vértices (menos crítica que las llamadas) |
| Programas enlazados | la misma | Sombreadores distintos: cada uno se compila, y en móvil compilar tarda |
| JS por fotograma (mediana · p90) | la misma | CPU del juego: vida, animación, escena y el envío de las llamadas. **Mezcla el callback del juego con otros ligeros**: para el coste del fotograma, el reparto de abajo |
| Reparto del fotograma (`paint`, `render`, vida y el resto) | `gl-probe.mjs <valley.html> --seed 11 --year 21 --touch --scale 1 --sky clear --phase 0.45` (por la portada; `--follow <id>` sigue a alguien) | Lo que mide el propio renderer (`__valleyRenderStats`, el panel de taller). `restMs` es el JS fuera del dibujo y de la vida: bosque, gente, luces. **En SwiftShader `render` incluye el dibujo por software**; el resto sí es comparable |
| Reparto de mallas por grupo | `node tools/graphics/performance/scene-report.mjs "<query>"` (usa `window.__valleySceneReport()`) | De dónde salen las llamadas: mallas visibles, con sombra e instanciadas, por grupo y los edificios por tipo |
| Recompilaciones | `node tools/graphics/performance/shader-churn.mjs <valley.html> "<query>"` | Programas enlazados tras cargar, tras un rayo y con la fiesta. **Cada uno de más es un tirón en una tablet** |
| CPU por función | `node tools/graphics/performance/cpu-profile.mjs <valley.html> "<query>" <espera> <perfil> <función>` sobre `bundle-game.ts --no-minify` | Tiempo inclusivo y quién llama a una función |
| Fotogramas con dibujo por software | contar fotogramas en 40 s, mismo navegador, dos versiones | **Sí sirve para comparar el coste por píxel**: SwiftShader, como una tablet, va limitado por píxeles (así se vio lo que cuesta cada luz) |

Escenas de referencia (siempre las dos, nunca una):

- **La villa grande**: `debug=1&seed=7&year=60&season=summer&live=1`
- **La aldea**: `debug=1&seed=11&year=21&season=summer&live=1`

**Y como juega el jugador, por la portada** (GV-0, 29 sep 2026): `gl-probe.mjs` y
`shot.mjs` con `--seed 7 --year 60` o `--seed 11 --year 21`, `--touch` (el perfil
de un teléfono: en un contexto no táctil `auto` resuelve High aunque la ventana sea
de móvil), `--scale 1` (la adaptativa sujeta: en un dibujo por software baja sola,
y cinco tomas del mismo día salieron a cuatro escalas) y `--sky`/`--phase` fijos.
Así, dos tomas seguidas de la misma versión dan **0 % de píxeles distintos**. La
ruta `?debug=1` pinta además el Canvas 2D debajo del 3D: vale para llamadas,
triángulos y programas, **no para el JS por fotograma**.

Se mide sobre el juego empaquetado (`npx tsx tools/graphics/bundle-game.ts --out
artifacts/graphics/alive/game`) y, para comparar con una versión anterior, se monta
esa versión en otra copia (`git worktree add … <commit>` + un enlace a
`node_modules`) y se empaqueta igual. La sonda intercepta WebGL desde fuera, así que
mide cualquier versión.

**El perfil de CPU con CDP**: el ~90 % sale como `(program)` (el dibujo por software).
Lo útil es el reparto del resto, y sólo sobre el juego sin minificar
(`bundle-game.ts --no-minify` + `cpu-profile.mjs`). Así salió que crear animales
costaba un 2 % por una esfera de recorte mal calculada. Para la capa de vida, también
sin navegador (`tools/reports/battle-report.ts`: ~0,7 ms por paso con Rapier).

Y la medida que falta y manda: **un aparato real**. Sin un móvil o tablet delante,
todo lo de arriba es comparativo. El banco del proyecto para eso es
`tools/graphics/bench-app.ts` (P-1a, ver `tools/README.md`).

## Cifras (27 sep 2026)

| Momento | Villa grande: llamadas · triángulos · programas · JS mediana/p90 | Aldea |
|---|---|---|
| Antes de las rondas del 26–27 sep (56d5f28) | 1.695 · 767 mil · 30 · — | 587 · 604 mil · 28 · — |
| Con montañas, agua, cascadas, pájaros y Astra | 1.724 · 795 mil · 36 · 16,4/21,7 ms | 607 · 632 mil · 33 · 7,0/9,6 ms |
| Tras la primera tanda, v4.70 (lote de muralla, casas fundidas, animales sin sombra) | 796 · 718 mil · 35 · 14,8/19 ms | 460 · 605 mil · ~33 · 6,2/8,7 ms |
| Tras la segunda, v4.71 (cuerpos fundidos, humo en una malla, sombras cada 2, una luz fija) | **421 · 586 mil · 38 · ~10/15 ms** | **335 · 482 mil · 39 · 5,3/7 ms** |

Pasos de la segunda tanda en la villa: cuerpos fundidos 796 → 598 (aldeanos 187 → 70
mallas, animales 177 → 43); recorte de animales → 585; humo → 546; sombras cada dos
fotogramas → 447 (en táctil, cada cuatro: menos aún). Recompilaciones (`shader-churn`,
aldea): **antes, un rayo 27 programas y la fiesta 26 más; ahora 4 y 2**.

Lo que hay que retener: **las rondas de arte del 26–27 sep sumaron un 1–4 %; el peso
venía de antes**. Y la villa grande sigue por encima de lo cómodo para una tablet
(unas pocas centenas de llamadas).

## Lo aprendido

1. **Cada malla visible es una llamada, y cada una con sombra, otra más.** La villa
   tenía 1.029 mallas visibles y 730 con sombra: 1.029 + 730 ≈ las 1.724 medidas. Antes
   de optimizar nada, `scene-report` dice dónde están.
2. **La muralla era la mitad**: 347 tramos, cada uno su malla y su sombra. Como no se
   mueve, va en **lote** (`Village.batchWalls`, `batchStatic` en
   `src/render3d/world/merge-static.ts`): se funden por material en unas pocas mallas y
   se rehace sólo cuando el plan cambia algo (lo llama el renderer tras aplicar el plan).
   Los originales siguen en escena, escondidos.
3. **Fundir un edificio no sirve si cada pieza tiene su propio material.**
   `varyHouse` (`house-variation.ts`) y `roofsOf` (`buildings.ts`) clonaban el material
   **por pieza** (para teñir la casa y para la nieve del tejado), y eso impedía fundir.
   Ahora clonan **una vez por material de origen** dentro de cada edificio. Regla: si
   hace falta una copia privada de un material, una por material de origen y edificio,
   nunca una por malla.
4. `mergeStatic(root)` funde por material + sombras las mallas estáticas de un modelo.
   Deja fuera: mallas con esqueleto o instanciadas, las de varios materiales, las de
   atributos distintos y **lo que ya no cuelga del modelo** (la hoja de la puerta, que se
   saca a su bisagra antes). Se llama después de la bisagra y de copiar los tejados.
5. **Sombras de lo pequeño, fuera**: los animales (177 mallas) proyectaban sombra; a esta
   distancia no se ve y costaba 177 llamadas. `animal-motion.ts` las apaga.
6. **Aparatos táctiles** (`(pointer: coarse)`): `auto` resuelve al nivel Medium de
   `render3d/profile.ts` —sin MSAA, densidad de píxeles tope 1,5 (en vez de 2) y mapa
   de sombras de 1024 (en vez de 2048)—, y «Graphics» deja elegir otro. En una tablet
   la pantalla tiene el doble de píxeles y la GPU la mitad.
7. **Resolución adaptativa** (`adaptResolution`, constantes `ADAPT`): si la media entre
   fotogramas pasa de 36 ms baja la densidad un 15 % cada 2 s, hasta la mitad; si pasa 6 s
   por debajo de 20 ms, sube un paso. Cambiar la densidad rehace el lienzo: nunca más de
   una vez cada 2 s.
8. **`renderer.compileAsync` al montar el valle NO sirve tal cual**: los programas
   enlazados pasaron de 35 a 68 —compiló variantes con otro estado de luces/sombras que
   luego no se usaron— y se retiró. Precompilar bien pide hacerlo con la escena ya
   iluminada como se va a dibujar. La causa eran las luces que cambian (lección 12);
   resuelto en la 13.
9. **El roble es de Vera** (lo está rehaciendo): no tocar `world/great-oak.ts` sin
   preguntar. Fundido, bajaba de 27 a 3 mallas.
10. **Los cuerpos con esqueleto se funden al cargar** (`fuseSkinnedParts`,
    `assets.ts`): las piezas que comparten esqueleto, padre y matriz de enlace y no
    tienen textura pasan a una malla con **el color de cada pieza en los vértices** y
    un material blanco con `vertexColors`. El tinte de cada aldeano (`dress`,
    `cast.ts`) se aplica entonces a los colores de los vértices, en una geometría
    suya (`userData.ownedGeometry`, se suelta en `retire`); la copia del material se
    sigue haciendo porque es la que se enciende al seguir a alguien. Un modelo nuevo
    con textura o con varios esqueletos no se funde, y no pasa nada.
11. **La esfera de recorte de un `SkinnedMesh`**: `computeBoundingSphere()` recorre
    cada vértice por los huesos (caro, y con los huesos sin poner da basura). Para
    recortar vale la de la geometría en reposo, agrandada (`animal-motion.ts`: ×3).
12. **Cambiar el número de luces recompila todos los materiales.** El número de luces
    puntuales va escrito en cada programa. La hoguera, los farolillos, el rayo y los
    fuegos entraban y salían, y cada vez se recompilaba todo: en una tablet, segundos
    congelada. Ahora hay **un banco fijo** (`effects/light-pool.ts`, `POINT_LIGHTS` en
    `renderer.ts`): los efectos crean sus `PointLight` como siempre, el banco las saca
    de la capa de la cámara y copia la más fuerte a la luz fija. **Regla: nunca
    añadas una luz a la escena ni la escondas con `visible`**; crea la tuya dentro de
    uno de los grupos que recorre `poolLights` y ponle intensidad 0 cuando no alumbre.
    Y **una luz apagada cuesta igual**: cuatro fijas quitaban un tercio de los
    fotogramas (152 contra 229 en 40 s); por eso hay una.
13. **Precompilar** (`warmUp` en `renderer.ts`): `renderer.compile` encarga los
    programas antes del primer dibujo y se espera a `isReady()` con tope
    (`WARM_UP_MS`). **No uses `compileAsync`**: su espera revienta (`currentProgram`
    indefinido) si un material se suelta mientras compila, y aquí la vida cambia la
    escena en cada fotograma; la promesa no se resolvía nunca. En SwiftShader no se
    nota (compila en serie); en un aparato con compilación en paralelo, sí.
14. **Las sombras no se rehacen en cada fotograma** (`scheduleShadows`,
    `SHADOW_EVERY`: 2 en ordenador, 4 en táctil). Casi nada de lo que da sombra se
    mueve (aldeanos y animales no la dan). Un mapa viejo sigue cuadrando consigo mismo
    —guarda su matriz—, así que sólo hay que rehacerlo al instante cuando deja de
    cubrir la vista: al mover o acercar la cámara. **Ojo**: el centro de la cámara de
    sombra baila una fracción de texel en cada fotograma al girar el sol; comparar
    con igualdad lo rehacía siempre (se compara con un 2 % del alcance).
15. **El humo va instanciado** (`Smoke` en `tells.ts`), con la opacidad de cada
    bocanada en un atributo por instancia (`onBeforeCompile`). Las bocanadas siguen
    en el grupo como marcadores sin malla, porque la lógica y las pruebas las leen ahí.
16. **La hierba (28 sep 2026, `world/grass.ts`): dos llamadas para todo el valle**
    —una malla instanciada de matas y otra de rastrojo—, sin sombras, Lambert y el
    viento en el vértice. Aldea de referencia: 467 → 463 llamadas, 536 → 643 mil
    triángulos, y con dibujo por software 179 → 119 fotogramas en 30 s. **Ese
    tercio menos es de vértices, no de píxeles**: con las mismas matas diminutas
    (casi sin píxeles) salen 118. SwiftShader procesa los vértices en la CPU; una
    GPU de móvil no. **Lección: antes de recortar algo por los fotogramas de
    SwiftShader, separar vértices de píxeles con la prueba de las piezas
    diminutas**, porque recortar vértices por una medida de software puede costar
    lo que se ve sin ganar nada en el aparato. En táctil, menos matas igualmente.
17. **Lo instanciado que cubre el mapa entero va por tramos, y con muestra por
    altura de vista** (v4.88, `world/grass.ts`). Una sola `InstancedMesh` para
    todo el valle no se puede recortar: la cámara siempre la ve. En tramos de 24
    celdas, cada uno con `computeBoundingSphere()` **antes** de bajar `count`,
    la cámara se salta los que no ve (+14 llamadas como mucho, que es menos de
    lo que ahorra). Y como la cámara es ortográfica, la «distancia» es la altura
    de la vista (`view.height`): con las instancias **ordenadas por una
    prioridad al azar**, `count = total · densidad(altura)` es una muestra
    uniforme sin reordenar nada. Así la hierba dobló su densidad de cerca
    costando lo mismo en la vista de siempre.
18. **El parpadeo de las sombras no era de resolución: era la cámara de sombra
    girando con el sol en cada fotograma** (v4.90, `effects/sun-steps.ts`). Con
    el mapa rehecho cada dos fotogramas y la rejilla de texeles girada un poco
    cada vez, cada borde caía en otros texeles; y alinear el centro a una rejilla
    que gira no fija nada. Subir el mapa a 2048 hizo la texela más fina y el
    baile siguió. La cura: el rumbo del sol que ven las sombras avanza **por
    pasos** (`SUN_SHADOW.stepDegrees`) y entre pasos la cámara es la misma; lo
    quieto rasteriza igual, y el mapa se sigue rehaciendo para quien anda. Regla:
    **lo que se alinea a una rejilla necesita que la rejilla no se mueva**. Se
    mide con `window.__valleyShadowStats()` (reorientaciones por segundo), no
    con diferencias de píxeles, que el viento contamina.

19. **Oscurecer el suelo va en el sombreador del suelo, no en objetos** (GV-1,
    `world/contact-shade.ts`): el pie de los edificios es una máscara R8 para todo el
    valle (8 texeles por celda, 516 KB) que el suelo lee donde three aplica su
    oclusión. Cero llamadas, ningún programa más (el del suelo cambia de clave), sin
    z-fighting, y se rehace sólo cuando cambian los edificios con tejado (unos 4 ms
    de CPU en un portátil, una vez por obra). Un disco o una luz por edificio habría
    sido una llamada —y una sombra— por casa. Lo que cuesta de verdad es un
    muestreo por fragmento de suelo, que en software no se distingue del ruido: se
    lee en el aparato con `?contact=off`.
20. **Una copa atenuada no puede perder su sombra ni su viento** (GV-2): el clon
    translúcido de un material no hereda su `onBeforeCompile` —sin volver a
    aplicarle el viento se queda quieto— y sin `castShadow` la sombra salta al
    atenuar. El fundido va por instancia (atributo `instanceFade`): ningún programa
    más por árbol, y la copa conserva sombra y vaivén.
21. **FXAA con three r185 no es barato en este renderer** (GV-3): obliga a dibujar la
    escena en un búfer de media precisión y a mapear tonos en un pase aparte
    —24 bytes por píxel entre los dos búferes: 17,8 MB en un teléfono de 390×844,
    55 MB en una tablet de 800×1280—, recompila la escena para ese destino (70
    programas enlazados contra 41) y añade dos pases de pantalla completa. Y borra
    el 80–83 % del detalle fino, con aldeanos de seis píxeles. Descartado. El candidato
    es el MSAA del lienzo, y se decide en el aparato (`?aa=msaa` contra `?aa=none`).

22. **Un fotograma de más de un segundo se toma por una ausencia, y en la villa
    eso es un bucle** (29 sep 2026, sin arreglar): `presentation-clock.ts`
    (`SUSPEND_GAP_SECONDS = 1`) marca el fotograma siguiente `discontinuity`,
    la jornada se reinicia y el renderer rehace la capa de vida; en la villa
    7/60, `createVillage` (rutas de A* del común y la orilla) tarda más de un
    segundo en un aparato lento, y vuelta a empezar: 3,8 s por `paint`, la vida
    en cero pasos y la fecha quieta. Se ve en el reparto del fotograma (`paint`
    enorme, `lifeMs` 0) y en el perfil de CPU (`createVillage`). Con el umbral a
    30 s se recupera a 18–78 ms. **Mientras no se arregle, la villa no sirve
    para medir el dibujo**: mide el bucle.

## Lo que queda (por lo que pesa)

- **Romper el bucle de la villa** (lección 22): que el hueco que cuenta como
  ausencia descuente el trabajo del propio fotograma, y abaratar `createVillage`.
  Es la causa probable de la tablet a 0 fps con fotogramas de dos segundos.
- **Medir en un aparato real** (la tablet de Vera) y apuntar aquí las cifras: FPS, y
  si siguen los tirones al caer un rayo o empezar una fiesta. Y las dos lecturas que
  dejó GV (29 sep 2026): el pie de los edificios (`?contact=off` contra el valle
  normal) y el suavizado (`?aa=msaa` contra `?aa=none`), con el panel de taller.
- **El coste por píxel**: todo es `MeshStandardMaterial` (PBR). Si la tablet sigue
  limitada por píxeles, pasar lo lejano o lo pequeño a `MeshLambertMaterial`, o bajar
  la densidad de partida en táctil (hoy 1,5; la adaptativa baja hasta la mitad).
- **Casas (70 mallas en la villa) y campos (24)**: un lote como el de la muralla pide
  separar lo que se mueve (puertas) y la nieve de los tejados.
- **El JS de la villa (~10 ms)**: la vida (`finePathTo`, `stepHome`) es lo que más pesa
  de lo que no es dibujo. Animar menos a menudo a los lejanos.

## Reglas para quien añada cosas

- Un efecto con muchas copias va **instanciado** (`InstancedMesh`), como peñascos,
  pájaros, gotas o charcos: una llamada para todas.
- Un modelo estático de muchas piezas se **funde** (`mergeStatic`), salvo lo que se mueve.
- No actives `castShadow` en lo pequeño o lejano.
- No pongas `frustumCulled = false` sin necesidad: obliga a dibujar fuera de pantalla.
- **Ninguna luz nueva en la escena**, ni escondida con `visible`: pasa por el banco
  (lección 12). Tras tocar luces o materiales, `shader-churn.mjs`.
- Un personaje nuevo con esqueleto se funde solo si es de colores lisos; con textura,
  cuenta una llamada por pieza.
- Tras un cambio que pueda pesar, pasa `gl-probe` en las dos escenas y apunta la cifra.
