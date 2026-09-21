# E0e · Ambiente visible de las tres eras

## Objetivo

Que el mismo valle permita reconocer **caserío, aldea y villa cerrada** desde la cámara habitual: caminos cada vez más asentados, plaza con más enseres y humo más presente sobre los hogares que ya lo producen. Es acabado de presentación sobre la fase real de `eraOf(state)`, no una fase nueva ni una transformación del mapa. Ronda pequeña, sin Blender ni activos publicados nuevos.

## Depende de

- `src/derive/era.ts`: `Era = 'hamlet' | 'village' | 'town'` y `eraOf(state)`. La fragua alcanzada abre aldea; `flags['wall_closed']` abre villa. La era es monótona; el asedio no es una cuarta era.
- `docs/plan-espacial.md`: plaza persistente, caminos accesibles y cerco honesto, aceptados localmente. E0e se apoya en ellos y no reabre trazado, colocación ni navegación.
- `src/render3d/world/plan.ts`: plan/diff de escena y firma del suelo; `src/render3d/world/ground.ts`: `cellColour`, `buildGround`; `src/render3d/world/plaza.ts`: fuente actual; `src/derive/tells.ts`: humo sólo en casas ocupadas, vivas y no apagadas; `src/render3d/effects/tells.ts`: representación 3D de esa señal.
- `docs/encargos-3d.md` §1, fila **La era del valle**, y `docs/plan-meta.md` §E/orden vivo. E0a–E0d ya tienen cierre propio; esta ronda trata sólo el ambiente restante.

Grafo: fase espacial aceptada → E0e. Los tres acabados pueden desarrollarse sobre la misma lectura de era, pero integración y capturas se arbitran juntos. Terra puede implementar el contrato acotado; Sol revisa el diff y las imágenes. Astra sólo si aparece un problema de diseño 3D que exceda estas primitivas.

## Ficheros

Producción cerrada a `src/render3d/world/ground.ts`, `src/render3d/world/plaza.ts`, `src/render3d/effects/tells.ts`, `src/render3d/renderer.ts` y, si hace falta mantener la derivación cosmética pura, **un** módulo nuevo `src/render3d/era-ambience.ts`. La evidencia controlada autoriza además `src/render3d/contracts.ts`, `src/ui/backend.ts` y `tools/graphics/shot.mjs`: un `preview-era` de diagnóstico, leído sólo al crear renderer, que fuerza el acabado cosmético y nunca escribe `GameState`, guardado, UI ni motor. Pruebas focalizadas nuevas o existentes en `tests/fast/` (sólo las que cubran estas propiedades). Capturas con `tools/graphics/shot.mjs` y evidencia en un informe nuevo `docs/historico/life-rounds/E0e-ambiente-eras.md` al cerrar la implementación.

No tocar `src/engine/`, `src/derive/`, `src/render3d/life/`, `src/render3d/world/plan.ts`, `docs/design.md`, balance, guardados, colisiones, economía, interfaz, mallas, audio ni las escenas de E4. Tampoco `docs/plan-meta.md` ni `docs/task-log.md` mientras la otra sesión gestiona su subida. Si un fichero adicional resulta imprescindible, declararlo para arbitraje antes de editarlo.

## Contrato API

- La única entrada de fase es `eraOf(state): Era`. Pasar `Era` desde `renderer.ts` a los acabados de suelo, plaza y humo; no inferirla otra vez por año, número de casas o aspecto de la muralla.
- Extender la API de suelo conservando sus parámetros actuales: `cellColour(map, cell, palette, plaza?, era?)` y `buildGround(map, palette, plaza?, era?)`; si se usa parámetro opcional, su ausencia conserva el aspecto actual para llamadas existentes. La firma efectiva de reconstrucción debe incluir la era, de modo que un cambio de fase repinte el suelo aunque `map.path` y estación no cambien.
- La plaza recibe `show(plaza, ground, era)` y cambia sus complementos sin mover ni sustituir la fuente. Si se prefiere otro nombre para aplicar fase, mantener el mismo contrato observable: actualización idempotente para igual plaza/era y retirada de los complementos anteriores al cambiar.
- La capa de humo consume **sólo** las señales `Tell` de `tellsFor(state)` y la `Era` que entrega el renderer. No añade señales sobre casas sin humo. El mismo conjunto de casas autorizado por `tellsFor` debe permanecer autorizado en las tres eras.
- Estas API son de presentación: llamadas repetidas con el mismo estado/era producen el mismo aspecto, no escriben `GameState` ni consumen RNG del motor.
- Para evidencia, `shot.mjs --preview-era hamlet|village|town --viewport WxH` puede entregar al renderer un override efímero de presentación. La cabecera y el estado conservan su era real; toda toma así se rotula como control visual, no como historia.

## Reglas visuales

1. **Camino:** conservar exactamente las celdas y niveles de `map.path` (0–3). Cambiar únicamente lectura de color/textura procedural para que las celdas con mayor desgaste se distingan mejor en aldea y villa. El paso de caserío a villa debe ser gradual por nivel real de camino, no pintar una calzada donde `map.path[cell] === 0`. La plaza y el vado conservan prioridad sobre el camino; terreno, relieve, estación y nieve siguen legibles.
2. **Plaza:** conservar centro, radio, fuente y plazas reservadas. Añadir pocos enseres procedurales de escala pequeña en puntos estables y libres alrededor de la fuente: caserío casi vacío; aldea con algún uso visible; villa con más señales de reunión/actividad. Su cantidad es aforo visual, no recursos, inventario ni oferta de actividad. Nunca ocupan el paso de la fuente, accesos o rutas; no entran en navegación ni física. Reutilizar colores/materiales existentes y liberar geometría/materiales propios al cambiar de valle o disponer el renderer. Si la huella libre real no alcanza, mostrar menos antes que invadir un camino.
3. **Humo doméstico:** hacer perceptible la progresión en el humo de las casas que `tellsFor` ya autoriza, mediante densidad/volumen o persistencia visual acotada. Mantener la intensidad ligada al ánimo que entrega la señal. Cero humo para casa vacía, perdida, apagada por `douse` o señal ausente. No convertirlo en incendio, humo del asalto ni nueva mecánica de E4. Evitar un aumento que tape tejados o siluetas desde móvil.
4. La villa se lee por acumulación de estos tres rasgos y por el cerco ya existente; la era no mueve edificios, caminos, plaza, portones ni personas. No introducir números de balance. Cualquier tamaño, cantidad o mezcla elegida aquí se justifica como parámetro cosmético en el informe y se ajusta con capturas, no en `engine/balance.ts`.

## Tests exigidos

1. Estado sintético con la misma topología y `map.path` en tres eras reales: las celdas sin camino quedan sin acabado de camino; un nivel mayor se sigue distinguiendo; plaza/vado conservan prioridad. El cambio de era provoca reconstrucción del suelo aunque la firma del mapa no varíe.
2. La plaza mantiene coordenadas y fuente; sus complementos aumentan de forma legible entre eras sin invadir el centro o los puntos de paso. Repetir `show` no duplica objetos; cambiar de fase/valle y `dispose` retiran los anteriores.
3. El conjunto de casas con humo coincide con `tellsFor` en las tres eras: incluir ocupada vigente; excluir vacía, ruina y `doused`. El humo de villa es visualmente más presente que el del caserío con idénticas señales; sigue reaccionando a la intensidad de la señal.
4. `GameState` serializado idéntico antes/después de derivar y mostrar; no hay consumo de flujos aleatorios. Typecheck, lint, pruebas focalizadas y `git diff --check`. No lanzar jornadas ni batería completa durante esta ronda visual.

## Evidencia y terminado cuando

Guardar capturas del **juego 3D real** en `artifacts/graphics/E0e/`, con caserío, aldea y villa de al menos dos semillas que alcancen las fases. Para cada semilla, anotar año, `eraOf`, `map.path` cerca de la plaza, casas ocupadas y señales de humo; usar luz/estación y encuadre comparables. Incluir una comparación de la misma escena con fase controlada sólo para aislar el acabado, claramente rotulada como control visual y nunca como partida histórica. Inspeccionar en tamaño móvil y en iPad; capturar también un hogar vacío o apagado si se usa humo como rasgo de era. Registrar errores de página y coste visible (objetos/geometría) frente al control.

La ronda termina cuando las tres eras se distinguen sin leer la cabecera, los tres cambios son atribuibles a estado/era real, no se pierde legibilidad ni paso en plaza/camino, y las pruebas focalizadas y capturas sostienen el resultado. **Falsaría el brief** que sólo cambiase el rótulo de era, que surgiese humo de una casa sin señal, que la villa pintase caminos inexistentes o que los enseres invadiesen el lugar por el que pasan las personas.

## Incertidumbres para arbitraje

- Hoy `tellsFor` ya emite humo de **todas** las casas ocupadas; «más tejados» no puede significar crear nuevas casas emisoras sin contradecir la señal existente. Este brief interpreta la frase como humo más visible sobre más tejados *en la lectura panorámica*. Si las capturas no lo consiguen, informar antes de ampliar la semántica de `tellsFor`.
- El grado de ocupación de la plaza y la paleta de caminos se fijan visualmente con las capturas; no hay umbral canónico en la spec. No convertir un valor de tanteo en constante de balance.
- Las partidas de distintas eras también tienen distinto número de casas y diferente tráfico. Por eso se exige tanto toma histórica como control de la misma escena: una sola comparación entre años confundiría el crecimiento real con el acabado.

## Dirección visual para la continuación · 22 sep 2026

**Una dirección: hacer de la plaza el indicador de era.** El círculo reservado y su fuente son el centro estable que aparece en los dos tamaños de pantalla. Se conserva el empedrado de **todas** sus celdas, exigido por `docs/design.md` §7.4b, pero cambia la lectura del pavimento: caserío, canto rústico oscuro e irregular; aldea, mezcla visible de canto y piedra asentada; villa, piedra clara y ordenada, con el borde definido. No cambia el radio, la cota, la fuente ni la navegación. Los caminos existentes, bancos y humo siguen como pistas secundarias, sin más intensidad ni emisores en esta ronda.

**Por qué el primer intento no basta.** En `artifacts/graphics/E0e/control-seed-7-year-30-{hamlet,village,town}-{mobile,tablet}.png`, la misma villa real cambia sólo de acabado. El gran círculo pardo y la fuente son prácticamente idénticos en las seis tomas; dos/cuatro bancos se pierden entre personas, y el humo y las pocas celdas `map.path > 0` apenas cuentan a escala panorámica. En semilla 7/año 30 hay 12 señales de humo, pero la villa sólo suma una esfera por casa; el control no demuestra reconocimiento de era. En tableta se ve además la mayor parte del recinto, por lo que el pavimento común pesa más que los bancos. Las tomas históricas tampoco aíslan el acabado: cambian a la vez casas, habitantes y cerco.

### Contrato visual y presupuesto

- `src/render3d/world/ground.ts`: restringir el patrón a `gap <= plaza.radius`. Mantener prioridad de plaza sobre camino y terreno, y del vado fuera del círculo. Usar la `Era` ya entregada a `cellColour`/`buildGround`; conservar el moteado determinista y las paletas estacionales. El patrón debe ser una lectura de superficie: bloques amplios de tono, con irregularidad de borde en caserío, transición mixta en aldea y juntas/sectores más regulares en villa. Sin losas geométricas que sobresalgan ni marcas que parezcan rutas nuevas. La piedra clara no debe convertir una celda `map.path === 0` exterior a la plaza en calzada.
- Dentro del círculo, mantener una progresión tonal perceptible con el mismo estado y luz: el área clara debe aumentar estrictamente caserío < aldea < villa. Como objetivo de diseño inicial, aproximadamente un cuarto, la mitad y tres cuartos de las celdas visibles del círculo deberán leerse claras, respectivamente; son proporciones cosméticas para calibrar con capturas, no constantes de balance ni obligación de añadir ruido fino por celda. La forma circular y la fuente deben seguir reconocibles en las tres eras. Si el muestreo por vértices disuelve las juntas a 390 px, usar manchas de escala mayor derivadas de coordenadas; no compensar añadiendo objetos.
- `src/render3d/renderer.ts`: conservar la firma de apariencia que incluye `Era`, de modo que la transición repinte sólo al cambiar suelo/estación/era. `src/render3d/world/plaza.ts` y `src/render3d/effects/tells.ts`: mantener posiciones, recuentos y costes existentes. No tocar `src/derive/`, `src/engine/`, `src/render3d/life/`, `src/render3d/world/plan.ts`, UI ni `docs/design.md` en la ronda de implementación.
- Presupuesto: seguir con el mesh/material de suelo existente, **cero draw calls, meshes, texturas o emisores nuevos**; coste de cálculo únicamente al reconstruir el suelo. No aumentar las 48/40 esferas de humo observadas en villa (semillas 7/23) ni los ocho meshes máximos de bancos. Si para lograr contraste hiciera falta una malla nueva por losa, parar y arbitrar presupuesto y arte antes de implementarla.

### Prueba y aceptación

1. Pruebas focalizadas en `tests/fast/graphics-world.test.ts` y, sólo si el contrato existente lo exige, `tests/fast/era-ambience.test.ts`: mismo `ValleyMap`/plaza/paleta en las tres eras; pavimento sólo en el círculo; `map.path === 0` exterior intacto; prioridad de plaza/vado y niveles de camino conservados; firma de reconstrucción sensible a era; misma entrada produce mismo patrón. Verificar que el estado serializado no cambia. Typecheck, lint y `git diff --check`; no suite larga para una ronda de color.
2. Repetir los seis controles con `tools/graphics/shot.mjs --preview-era ... --viewport 390x844|1024x768`, misma semilla 7/año 30, cámara, estación y luz, en `artifacts/graphics/E0e/` con sufijo `-plaza-v2`; añadir seis controles de una segunda villa real, semilla 23/año 31. Guardar asimismo las seis tomas históricas 7/23 de caserío, aldea y villa, sin override. Registrar `eraOf`, recuento real de `map.path` alrededor de plaza, `tellsFor`, errores de página y draw calls/meshes antes y después. No presentar controles de villa como historia de caserío.
3. **Dos lecturas distintas.** Los controles de la misma villa con `Era` forzada aíslan el acabado: se comparan para comprobar orden, localización y legibilidad del pavimento, **no** para clasificar caserío/aldea/villa, porque todos conservan arquitectura y cerco de villa. Para aceptación de producto hacen falta tomas históricas nuevas, sin override ni cabecera/pie de era, presentadas individualmente y mezcladas a lectores ajenos a la implementación. Como prueba propuesta: cinco lectores, ≥80 % de aciertos por viewport y ninguna era por debajo de 60 %, anotando matriz de confusión y rasgos citados. Esa prueba mide reconocimiento del conjunto, no atribuye el resultado al pavimento; requiere organizar lectores externos y no se declara realizada por inspección del equipo. Confirmar además que fuente, accesos y trayectorias no quedaron tapados y que humo doméstico no parece fuego. Si falla o no se ejecuta, **E0e sigue visualmente pendiente**.

### Límite de especificación

**Límite vigente antes de la decisión siguiente:** la opción de tierra pisada en caserío y empedrado parcial en aldea daba más contraste, pero la antigua §7.4b exigía empedrado desde la fundación. En esa ronda no estaba autorizada y había que llevarla al dueño. La autorización y la nueva regla aparecen a continuación; esta restricción queda como historial del arbitraje, no como regla vigente. Tampoco se encargó arte 3D nuevo.

## Ronda autorizada · tierra → piedra · 22 sep 2026

El dueño autorizó expresamente sustituir la regla antigua de §7.4b: plaza y
fuente permanecen desde la fundación, pero el pavimento es **tierra pisada en
caserío, mezcla de tierra y empedrado parcial en aldea, piedra continua en villa**.
`docs/design.md` v4.30 y `docs/changelog.md` son la fuente normativa; el apartado
anterior documenta por qué se paró la ronda v2, no limita esta implementación.
La prohibición inicial de tocar `design.md` queda superada sólo para esta
corrección documental. No se cambian motor, estado, navegación, radio, cota,
fuente, caminos externos, humo ni bancos.

**Contrato de ejecución:** `src/render3d/world/ground.ts` calcula los tres
acabados a partir de `Era` y la paleta estacional ya recibidos. El caserío debe
leerse como tierra compactada (distinta del prado, sin losas); la aldea deja
áreas continuas de tierra y piedra reconocibles; la villa cubre el círculo con
piedra. El borde sigue delimitando el espacio sin crear un camino nuevo. La
misma entrada produce el mismo patrón, sin RNG, textura, mesh, material ni
draw call nuevos. Si el color por vértice no da para leerlo, comunicarlo antes
de ampliar el presupuesto visual; no inventar mosaicos geométricos por tanteo.

**Evidencia exigida:** pruebas focalizadas de cobertura (0/parte/todo), plaza
prioritaria sobre caminos, terreno exterior y vado intactos, firma sensible a
era, estado serializado igual. Typecheck, lint y diff-check. Repetir dos
controles de villa real con las tres eras forzadas en móvil/tableta (12 tomas)
y obtener tomas históricas sin override de las tres eras en dos semillas, con
cabecera/pie ocultos sólo para la revisión. Sol juzga la lectura a tamaño de
uso. La propuesta anterior de cinco lectores externos no fue una decisión
del dueño y no bloquea esta ronda; si la lectura sigue ambigua se documenta
como pendiente, sin declarar aceptación visual por pasar los tests.
