---
name: animacion
description: Cómo se cambia, se mide y se acepta una animación de aldeanos o animales en The Valley —clips del GLB y fabricados, marcha por suelo recorrido, gestos fechados por hecho, fauna— con el estándar de la ronda AN (29 sep 2026): inventario y matriz, evidencia a escala de móvil con el observatorio, cadencia y apoyo medidos, propiedades de silueta sobre el Cast real, briefs para lo que queda fuera de lista y coste comparado. Úsala antes de tocar clips.ts, action-clips.ts, animal-motion.ts, animal-gestures.ts, la pose o las mezclas de world/cast.ts, una receta de art/recipes o un GLB con animación.
---

# Una animación en The Valley

La ronda AN (`docs/plan-animacion-integral-movil-2026-09-29.md`, matriz en
`docs/medidas/animacion-matriz-2026-09-29.md`, índice de tomas en
`docs/medidas/animacion-tomas-2026-09-29.md`) fijó cómo se trabaja una
animación aquí. Esta skill es ese método en una página: qué no se toca, cómo
se mide antes de cambiar nada, cómo se cambia cada clase de clip, qué prueba
lo guarda y qué papel deja. La pantalla de referencia es el móvil (390×844 y
320×568); el banco y el primer plano diagnostican, no aprueban.

## 1 · Lo que no cambia nunca

- **La simulación, los guardados y el motor** no saben que hay animación.
  Un clip no altera daño, alcance, resultado de batalla ni instantes: la
  vida (`src/render3d/life/`) decide el hecho y la pantalla lo enseña.
- **Todo clip que desplaza el cuerpo va por suelo recorrido** (`clipTime`,
  `strideLength` en `src/render3d/clips.ts`; `AnimalMotion` para la fauna).
  Nunca por reloj: por reloj se patina, y se ve a cualquier tamaño.
- **Un gesto fechado se pone en la pose de su instante** (`combatClip`,
  `since`), sin mezcla ni desfase por persona; saltar a su final da la misma
  pose que verlo entero (`tests/fast/combat-clips.test.ts`). Lo mismo vale
  para un hecho que *viene*: `throw` corre hacia su final desde
  `doing.until` (`life/cast.ts`, `throwSeconds`), que es el paso en que la
  pelota sale de la mano.
- **No se inventan acciones** que la vida no produce para lucir clips, y no
  se disimula un defecto del recurso con una mezcla de código que siga
  viéndose mal: si el defecto está en el rig o en el GLB, se corrige desde
  `art/recipes/` por el pipeline reproducible, con brief.
- **La lista de ficheros de cada ronda manda.** Tocar otro módulo —`life/`,
  `derive/`, catálogo, GLB— exige escribir primero el brief de esa corrección
  (defecto medido, módulo y por qué, vía, prueba), como los de §6 del plan
  de la ronda AN (AN-1a zancada, AN-1b rumbo, AN-2a pelota, AN-2b martillo,
  AN-3a oso).

## 2 · El inventario, y dónde vive cada cosa

| Qué | Dónde |
|---|---|
| 25 clips humanos: 4 del GLB (`idle`, `walk`, `work_hoe`, `carry_walk`) y 21 fabricados sobre el `idle` | `src/render3d/clips.ts` (tabla, segundos, zancada, `STRIKE_AT`, `STRIKE_HEAD`) y `src/render3d/action-clips.ts` (`ACTION_CLIPS`) |
| Qué clip enseña cada situación de la vida | `src/render3d/life/cast.ts`, `clipOf` (personas) y los emisores de `Animal` (`beasts.ts`, `companions.ts`, `deer.ts`, `bear.ts`, `rabbits.ts`, `wild-prey.ts`, `wildlife.ts`, `visitors.ts`) |
| La pose, las mezclas, la parada, lo que se lleva en la mano y el golpe | `src/render3d/world/cast.ts` (`pose`, `equip`, `strike`, `wound`) y `src/render3d/hand-tools.ts` |
| 15 especies con sus clips del GLB | `art/catalog.json` (`motion`), `src/render3d/effects/animal-motion.ts` (rumbo, marcha por distancia, gestos, fundidos, caída), `animal-gestures.ts` (run, bark y play del perro), `effects/fauna.ts` |
| Lo que un modelo comparte | Los 17 aldeanos (base, niño, mayor, oficios, clan vecino) comparten huesos y nombres de clip (D.4): un clip fabricado vale para todos, y **se mide también en el rig del niño**, que tiene las piernas más cortas |
| La golondrina | `effects/ambience.ts` (bate y planea) |

Antes de afirmar cobertura, amplía la matriz si encuentras un clip o una
acción que no esté en ella.

## 3 · Medir antes de cambiar

1. **Cadencia, apoyo y plantado** de todo clip de marcha, sin navegador:
   `npx tsx tools/reports/gait-report.ts [--only id] [--glb candidato] [--pace a,b]`.
   La cadencia es paso de la vida ÷ zancada; un aldeano a 3–5 ciclos por
   segundo son hormigas, un paseo humano es ~1. El plantado (cuánto retrocede
   el pie apoyado respecto a lo que avanza el cuerpo) vale sólo para huesos;
   en los modelos de nodos rígidos no es fiable.
2. **La pose en el mundo** de un clip fabricado se mide con el `Cast` real
   (posiciones de `hips`, manos, rodillas, pies y puntas; ver los medidores
   de `tests/fast/work-gestures.test.ts` y `cast-stops.test.ts`): un clip que
   va por suelo recorrido se pone con `travelled`, no con `clipSeconds`.
3. **Hojas y bancos**: `node tools/graphics/gesture-sheet.mjs <clip> --model villager --frames 12 --out <carpeta>`
   para personas; `animal-gestures-bench.mjs` y `animals-preview.mjs` para
   la fauna. Son diagnóstico: **un clip visto sólo ahí es `preview-only`**.
4. **En partida**, con el observatorio (skill `observe-valley-life`):
   `export VALLEY_CHROMIUM=/opt/pw-browsers/chromium` y
   `node tools/graphics/observe-life.mjs --seed N --year N --lead 20 --seconds 6 --fps 15 --follow ID --zoom 0.18 --viewport 390x844 --out <carpeta>`.
   Mismo estado antes y después: misma semilla, año, lead, actor, cámara y
   zoom; el «antes» se rueda con el empaquetado anterior (`--page`), que se
   construye copiando el GLB viejo a `public/assets/valley3d/` y volviendo a
   dejarlo como estaba. El plano general (2 fps × 20 s, sin `--follow`) a
   390×844 y a 320×568 es la escala que aprueba. Los saltos y la cadencia se
   miden sobre `trace.json` (posiciones por fotograma, pasos exactos), no con
   `film.mjs`. Las comparaciones a escala nativa (GIF «antes | después» a 1:1
   y tira estática) las hace `artifacts/graphics/AN-4/compare/build-compare.py`.
5. **Lo que decide es la escala de móvil.** Una mejora que sólo se aprecia
   en primer plano no pasa: cada fila de la matriz dice qué se ve a 390×844 y
   qué observación la refutaría.

## 4 · Cómo se cambia cada clase de clip

**Un clip del GLB (marcha).** La receta (`art/recipes/<modelo>/*.json`, en
metros de Blender) es la fuente; un generador como
`art/recipes/villager/plant-gait.mjs` la reescribe (pie plantado, cinemática
inversa, claves cada dos fotogramas, `interpolation: 'LINEAR'`) y
`tools/art/bake-clips.mjs <receta> <entrada.glb> <salida.glb> --clips a,b`
hornea las pistas en el GLB sin Blender (`--check` reproduce el exportado a
0,03° en las claves). Después: `gait-report --glb` para medir la zancada
real, la medida a la receta, al catálogo (`approved`, `hashes`,
`recipeSha256`, `motion`) y a `clips.ts`, y `publish-assets.ts --ids`.
`tests/fast/graphics-clock.test.ts` vigila que la tabla y el catálogo digan
lo mismo. Con Blender, `npm run art -- all <modelo>` produce lo mismo.

**Un clip fabricado (gesto).** En `action-clips.ts`, sobre el `idle`, con
`turn(hueso, eje, t => ángulo)` y curvas por tramos (`keyed`: `smooth`,
`strike`, `hold`). Tres tiempos —preparación, contacto, recuperación— y el
contacto donde está la cosa: `STRIKE_AT` fija la fracción del golpe y
`Cast.strike` suelta astillas, simiente, agua, chispas desde la mano o desde
`STRIKE_HEAD`. Una pista `hips.position` (en metros del rig) baja o sube la
cadera: sentarse en el suelo, el brinco, el vuelo de la carrera; **la cadera
sigue a la pierna que apoya** (con las piernas abiertas la pierna es más
corta en vertical y sin bajar la cadera los pies flotan). Signos que cuesta
recordar: `x` negativo en un brazo lo sube al frente; `x` positivo en un
muslo lo lleva atrás; `z` positivo en el brazo derecho lo abre hacia fuera.

**Un gesto fechado.** Por un hecho que fue (`since`: combate, fechado en
`life/cast.ts` con `combat.since`) o por uno que viene (`until`: `throw`).
Un golpe a paso fijo (`gate_strike`, `BLOW_STEPS`) dura el intervalo entero
y trae la carga del siguiente, sostenida hasta que el hecho lo devuelve al
contacto.

**La fauna.** `AnimalMotion` toma el rumbo de la vida (`Animal.facing`) y,
sin él, el avance neto; `charge`/`flee`/`run` van por distancia con la
zancada del catálogo; los gestos entran con fundido (0,08 s) y caer se tumba
con constante (0,14 s). Un clip de una vez que dura más que su ventana en la
vida se corta a medias: la ventana se ajusta al clip (brief), no al revés.
Un `attack` que nadie emite es `preview-only` y va a `docs/encargos-3d.md`.

**La parada y las mezclas de personas** viven en `world/cast.ts`: fundido de
0,22 s y el clip de marcha que se apaga sigue su ciclo mientras se funde.

## 5 · La prueba que lo guarda

Propiedades del diseño, no ángulos: la silueta (amplitud mínima de la
articulación que define el gesto, medida en el mundo), el ciclo por suelo
recorrido (`combat-clips`: una zancada devuelve la misma pose), la pose que
no depende de dibujar a 30 o 60 fps, el fundido acotado, el pie que no
patina (`graphics-animal-motion`: la pata no se mueve quieto y se mueve al
avanzar), el contacto en su fracción (`work-gestures`: carga arriba, golpe
abajo, más deprisa de lo que sube). Si algo no llega, se escribe lo medido y
se deja `it.fails` con la propiedad intacta. Puerta de cada ronda:
`npm run typecheck && npm run lint` y los ficheros tocados; la suite entera
al cerrar la tanda, con la máquina sola (los bancos y las cadenas de
Chromium la vuelven roja por tiempo).

## 6 · El coste

`npx tsx tools/reports/animation-cost.ts` (JS de `cast.show` y
`fauna.paint` por fotograma, Node, sin dibujar; antes en un worktree del
commit base, después en la rama; dos pasadas seguidas cada uno) y
`tools/graphics/performance/gl-probe.mjs` (llamadas, triángulos; los
programas no son comparables con reloj vivo). Ninguna cifra de SwiftShader es
un FPS de teléfono; la comprobación en iPhone/iPad se deja identificada como
pendiente si no hay aparato.

## 7 · El papel

Fila en la matriz con evidencia y veredicto (**mejorado**, **conservado** con
el porqué, **límite** con la medida, **preview-only**); lo que la pantalla
no enseña, a `docs/encargos-3d.md` en la misma ronda; `docs/changelog.md`
con el porqué; `docs/task-log.md` al día; la fila de `docs/plan-meta.md`.
Commit por rutas explícitas, nunca `git add -A`; los artefactos de evidencia
se añaden con `git add -f` (tiras, hojas, GIF nativos, trazas pequeñas: no
los ×3 ni los empaquetados). No se cambia de modelo ni se encarga modelado 3D
sin la autorización de Vera.

## 8 · Trampas que ya han costado una tarde

- El `play` de un niño casi nunca lleva pelota (`day.ts`, `leisurePlaces`):
  el juego sin trasto es lo común y se brinca; mandarlo a `idle` deja a los
  niños de pie.
- **Las situaciones raras se provocan, no se esperan** (AN-4b): la visita del
  oso con `--hunted partridge,rabbit,deer,boar --happening bear_in_the_wood`
  (sólo nace superado el jabalí); una caza con `--hunt`, que la arranca con
  el gancho `__valleyHunt` y dice el motivo si no empieza; las presas
  siguientes con `--hunted` (conejo tras la perdiz, jabalí tras el ciervo,
  con `--means bows,arms` para tener arma); un asalto con arqueros con
  `--means bows,arms --raid N --assault --follow -9000`. La oferta de caza de
  una semana es un hash de semilla y semana (`huntOpportunity`): se busca sin
  correr el motor. `--beast` sólo actúa con `--aftermath`.
- **Que el motor lo pida no quiere decir que la pantalla lo enseñe** (AN-4c):
  la visita del oso no nacía nunca en partida porque su guarida exigía una
  celda de bosque libre y el juego pone un tronco en cada una
  (`solidTerrain`); la prueba pasaba porque montaba la jornada sobre el
  terreno a secas. Si una toma no encuentra a un actor, mira `bearDen` (o lo
  que toque) en la traza desde el paso 0 antes de culpar a la semilla, y
  prueba con la biblioteca real (`loadAssets` + `solidTerrain`).
- La cueva del oso está al pie de la montaña (AN-4d, pedido de Vera) y el oso
  sale por la boca en el paso 0: se rueda con `--lead 0` y `--look` en la
  cueva (la posición del oso en el fotograma 0 de la traza, `wild`, es la
  boca). La presa de una
  caza puede quedar fuera de cuadro (la cámara va al cazador): `--look` en la
  presa. **La honda usa los gestos del arco** (`hunt-encounter.ts`): límite
  anotado en `encargos-3d.md`.
- El observatorio abre el empaquetado de `artifacts/graphics/G-10/game`: tras
  tocar código, `npx tsx tools/graphics/bundle-game.ts` antes de rodar, o la
  toma enseña el juego de antes.
- Las tiras de un actor siguiendo la traza:
  `python3 artifacts/graphics/AN-4b/trace-strip.py <toma> --find` y
  `--id N [--animal]`; escala las coordenadas al PNG, que la resolución
  adaptativa puede bajar (273×590 en una villa con asalto).
- La pelota suelta **no existe en la partida** desde el 15 sep (decisión del
  dueño: `createVillage` sin `props: true`), así que `throw` no sale nunca;
  Vera decidió conservarlo (29 sep 2026): no se retira ni se «arregla».
- `fps` del observatorio tiene que dividir a 30. Un solo Chromium a la vez.
- La hoja de gestos pone el clip a `action.time = t` sobre el GLB a secas:
  un salto de 0,12 m son 7 px en la hoja; la propiedad lo guarda mejor.
- Un clip nuevo se añade a `ClipName`, a `VILLAGER_CLIPS`, a `ACTION_CLIPS`
  y a `clipOf`; `graphics-clock` cuenta que las tres listas casen.
- **Un gesto que decide algo se mide sobre lo que se pinta y se vigila con
  una prueba** (AN-5): la punta de las tres estocadas de la caza en su
  contacto y la mano que suelta el tiro están en `life/hunt-shot.ts`
  (`THRUST`, `RELEASE`) y las guarda `hunt-gestures.test.ts` sobre el GLB con
  el arma colgada por su `grip`. Si tocas `spear_thrust*` o `bow_loose` en
  `action-clips.ts`, esa prueba falla y se vuelve a medir. Tocar
  `spear_thrust` mueve también la estocada del asalto: para la caza se
  añadieron la alta y la baja sin cambiar la de siempre.
- **El gesto fechado por la vida llega al render como `clipSeconds`**, no se
  calcula con el reloj de presentación: la pose de la caza lo trae (0 en el
  contacto) y el render sólo lo pinta; andar va por `clipTime` con el suelo
  recorrido. Un bucle (`bow_draw`) se envuelve con su duración.
- **La pieza caída se tumba sobre su eje largo** (AN-5c): el modelo mira a -X,
  así que el vuelco va en X con el orden `YXZ` (primero el rumbo) y sube medio
  ancho **de su tronco** (`PREY_BODY.flank` en las presas): con medio ancho del
  modelo, el ciervo nuevo flotaba sobre su cuerna, que es más ancha que él.
  Con `rotation.z` se ponía de pie sobre el hocico, medio enterrada, y nadie
  lo vio en cinco rondas porque la prueba miraba el ángulo y no la caja: mide
  la caja del cuerpo, no el número de la implementación.
- **El parte de una escena espera a que se vea** (AN-5a, `settled`): si lo
  que se entrega al motor acaba la escena, la pieza cobrada desaparece en el
  fotograma del golpe. La semana ya esperaba a la caza; ahora espera también
  a que la presa caiga y se quede, o se vaya.
