# Animación integral de aldeanos y animales para móvil — el plan (AN)

> **El encargo original apareció a media tanda (rama `art/astra-modelos`,
> commit `ae444f7`, 29 sep 2026): `docs/encargos/animacion-integral-goal.md` y
> la primera versión de este plan.** Este fichero se reconstruyó del bloque
> `/goal` antes de tenerlos, y al cruzarlos coinciden en alcance y fases. Lo
> que el original añade y aquí queda incorporado: la lista de ficheros de
> producción de AN-1 (`clips.ts`, `world/cast.ts`, `animal-motion.ts`,
> `animal-gestures.ts`; `action-clips.ts` sólo para `flee`; **todo lo demás,
> `life/` incluido, con brief** — de ahí el brief AN-1b de §6, retroactivo),
> los instrumentos por nombre (`gesture-sheet`, `animals-preview`,
> `observe-life` a 15 fps durante 4–8 s), la lectura en **390×844 y 320×568**,
> la regla de que **una mejora que sólo se aprecia en primer plano no pasa**
> (por eso AN-4 entrega comparaciones a escala nativa además de las de zoom),
> el índice de tomas finales, y decir en el informe **qué falló y qué
> observación refutaría cada mejora**. Su sección «Qué significa mejor» y su
> «Regla de cierre» van al final de este fichero tal cual.


**Fecha:** 29 sep 2026. **Estado:** ronda abierta con `/goal`; el punto exacto
va en `docs/task-log.md`. **Fila del plan:** `docs/plan-meta.md`, sección AN.

**Cómo nació este fichero.** El encargo del dueño del diseño del 29 sep cita
este documento por su nombre, pero no existía ni en el árbol ni en el
historial de git: se reconstruye aquí a partir del encargo literal, que es lo
único escrito. Lo que el encargo fija —las cinco fases, el alcance de AN-1, el
criterio de terminado, las reglas de trabajo— se copia sin recortar; lo que no
fijaba —ficheros por fase, medidas, contratos— se escribe abajo como brief, que
es lo que la skill `goal` exige antes de tocar código.

**El objetivo, con las palabras del encargo:** mejorar de forma visible todas
las animaciones de aldeanos y animales de The Valley. El juego se evalúa
principalmente en móvil. Se trabaja hasta completar AN-0 a AN-4; no se cierra
el goal después de mejorar sólo la locomoción.

---

## 0 · Lo que ya hay, y de qué depende esta ronda

**Lo que anima el juego hoy** (inventariado en AN-0, abajo):

| Familia | Dónde vive | Cuántos |
|---|---|---|
| Clips humanos del GLB (`idle`, `walk`, `work_hoe`, `carry_walk`) | `art/recipes/villager/villager.json` → Blender → `public/assets/valley3d/villager*.glb`; los 17 aldeanos comparten rig y clips | 4 |
| Clips humanos fabricados sobre el `idle` del GLB | `src/render3d/action-clips.ts` (`ACTION_CLIPS`), ritmo en `src/render3d/clips.ts` | 20 |
| Especies | `src/derive/animals.ts` (`AnimalKind`): hen, pig, cow, crow, wolf, fish, partridge, rabbit, deer, boar, bear, dog, fox, duck, mule | 15 |
| Clips de animal, del GLB | receta G-23 (`tools/art/lots/animals-g23.mjs`) o nodos rígidos de Vera con `tools/art/rigid-clips.mjs`; `art/catalog.json` → `motion` | 41 |
| Gestos del perro fabricados (`run`, `bark`, `play`) | `src/render3d/effects/animal-gestures.ts` | 3 |
| Aves ambientales | `src/render3d/effects/ambience.ts` (golondrina de Astra, `bird.glb`, batir procedural) | 1 |
| Controladores | `src/render3d/world/cast.ts` (personas), `src/render3d/effects/animal-motion.ts` (animales), `src/render3d/life/cast.ts` (qué clip toca) | — |

**Dependencias, comprobadas contra `docs/plan-meta.md` el 29 sep 2026:**

| Depende de | Estado | Qué aporta |
|---|---|---|
| G-04 (rig y cuatro clips) · G-23 (animales articulados) · G-33/G-34 (ciervo, oso) | Hechas | El rig, la zancada medida y la marcha por distancia |
| IA-anim (24 sep: `chop`, `mine`, contacto) · IA-fields (`sow`, `spread`) | Hechas | Los gestos con instante de golpe (`STRIKE_AT`, `STRIKE_HEAD`) |
| E1/E1b/E3 (clips de combate por código) · D4/D6 (cuerpo a cuerpo, ragdoll) · E2 (clan vecino) | Hechas | Los seis gestos fechados por hechos, `flee`, el ragdoll de once segmentos y su respaldo animado |
| V-08/«el valle más vivo» (perro, zorro, patos, mula, conejos) | Hechas | Las acciones que la vida produce por especie |
| P-1 / rendimiento (27–29 sep) | Cerrada para continuar | La línea de base de coste y las sondas (`gl-probe`, `scene-report`) |

**Ninguna dependencia imprescindible sigue abierta.** Dos límites del entorno
de esta ronda, que no son bloqueos pero acotan el método:

1. **No hay Blender en la máquina de la ronda.** Una corrección de rig o de
   clip que exija reconstruir un GLB por `art/recipes/` + `tools/art/` no se
   puede promover aquí. El camino reproducible que sí existe sin Blender es el
   que abrió `tools/art/rigid-clips.mjs` (25 sep): escribir las pistas de un
   clip sobre los nodos del GLB desde un script determinista, con el `motion`
   del catálogo actualizado y publicado por `publish-assets.ts`. Si un hallazgo
   pide tocar un GLB, se escribe primero su brief (sección 6) y se decide
   entre las dos vías; lo que sólo Blender puede hacer queda encargado.
2. **No hay dispositivo real.** SwiftShader no mide FPS de teléfono. Lo que se
   compara es lo que la skill `performance` dice que es comparable: llamadas
   de dibujo, triángulos, programas y JS por fotograma. La comprobación en
   iPhone/iPad queda pendiente y se dice así.

---

## 1 · Reglas de la ronda (del encargo, y mandan)

- Prioridad a lo perceptible **en el juego**, no en una galería. Un clip
  visible sólo en preview se marca `preview-only`, nunca «integrado».
- Si el defecto está en el rig o en un GLB, se corrige por `art/recipes/` y el
  pipeline reproducible, con brief propio. **No se disimula un defecto del
  recurso con una mezcla de código que siga viéndose mal.**
- Se conservan la simulación, los guardados, **la zancada ligada a distancia**
  y **los gestos ligados a hechos** (`combatClip`, `since`). No se añaden
  acciones que la vida del juego no produce sólo para exhibir clips.
- Fuera de este goal: UI, SEO y seguridad.
- Verificación por fase: `npm run typecheck`, lint focal y las pruebas
  afectadas; la suite amplia al cierre de tanda (`CLAUDE.md`). Pruebas de
  propiedad reales cuando cambie el comportamiento. Sin recorridos pesados
  repetidos sin una razón concreta.
- Papel: `docs/task-log.md`, `docs/changelog.md`, la fila AN de
  `docs/plan-meta.md` y `docs/encargos-3d.md` cuando toque. Documentación en
  español; contenido y código en inglés, comentarios según `CLAUDE.md`.
- Commits por rutas explícitas, nunca `git add -A`. Sin cambio de modelo ni
  encargo de modelado 3D a Astra sin autorización de Vera.

**Criterio de terminado del goal:** matriz completa de todas las animaciones,
defectos detectados corregidos o límites explícitos, comparaciones visuales
reproducibles a escala móvil, sincronía de contactos y combate conservada,
coste comparado, pruebas pertinentes superadas y documentación actualizada.
No se declara completado si quedan clips sin revisar.

---

## 2 · AN-0 · Inventario y línea de base

**Objetivo.** Saber qué anima el juego, dónde se ve cada cosa, y con qué
evidencia se va a comparar el después.

**Ficheros.** Ninguno del juego. Herramientas: `tools/graphics/gesture-sheet.mjs`,
`animal-gestures-bench.mjs`, `observe-life.mjs`, `film.mjs`, `performance/gl-probe.mjs`
(sólo lo que haga falta para que corran fuera de Windows: la búsqueda del
navegador y el tamaño de la ventana). Este documento y la fila AN.

**Contrato.**
- Inventario verificado en código y catálogo: 24 clips humanos, 15 especies
  (con sus clips y las acciones que la vida produce por especie), los gestos
  del perro y las aves ambientales. Se amplía si aparece más.
- **La matriz** (sección 7): una fila por clip y especie con origen, situación
  en partida, evidencia visual, defecto concreto, gravedad, coste y decisión.
  Distingue **visto en partida** de **visto sólo en preview**.
- **Tomas reproducibles** a tamaño normal de juego, 390×844 y 320×568, con
  semilla, año, actor, cámara y zoom escritos para repetirlas después.
- **Línea de base de coste**: `gl-probe` en las dos escenas de referencia de
  la skill `performance` (villa 7/60, aldea 11/21).

**Terminado cuando** la matriz tiene todas las filas abiertas con su evidencia
inicial y las tomas de referencia están guardadas bajo `artifacts/graphics/AN-0/`.

## 3 · AN-1 · Locomoción

**Alcance (literal del encargo).** Mejorar reposo, marcha, carga, huida,
arranque, parada y giro de aldeanos; revisar adultos, niños, mayores y clan
vecino. Revisar el desplazamiento de las quince especies, incluidos salto,
carrera, nado y vuelo donde correspondan. Corregir apoyos que resbalan, fases
incorrectas, mezclas bruscas, orientación y diferencias de ritmo entre
especies. Comprobar las animaciones en el controlador real del juego, no sólo
en una galería.

**Depende de.** AN-0.

**Ficheros permitidos.** `src/render3d/world/cast.ts` (mezclas, arranque y
parada, talla), `src/render3d/effects/animal-motion.ts` (marcha por distancia
de todos los clips de desplazamiento, orientación, mezclas),
`src/render3d/effects/fauna.ts` (sólo lo que `AnimalMotion` necesite recibir),
`src/derive/animals.ts` (campos de presentación del `Animal`, p. ej. el rumbo
que la vida ya calcula), los emisores de `Animal` en `src/render3d/life/`
(`beasts.ts`, `companions.ts`, `deer.ts`, `bear.ts`, `rabbits.ts`,
`wild-prey.ts`, `wildlife.ts`, `visitors.ts`, `village.ts` sólo en la línea
que emite), `src/render3d/clips.ts` (ritmos), `src/render3d/action-clips.ts`
(`flee`), y sus pruebas en `tests/fast/`. Un GLB o una receta, sólo con el
brief de la sección 6.

**Contrato.**
- Todo clip que desplaza el cuerpo se reproduce por **suelo recorrido** (ya lo
  hacen `walk`, `carry_walk`, `flee` humanos y `walk`/`hop`/`run` de animal);
  los que hoy van por reloj —`charge`, `flee` de animal— pasan a distancia
  cuando declaran zancada.
- La orientación de un animal es la que la vida decidió (`body.facing`, con su
  histéresis de `body.ts`), no una derivada de píxeles de desplazamiento.
- Cambiar de clip no da un salto: mezcla corta y sin dependencia de la tasa de
  fotogramas; un gesto fechado (`combatClip`) sigue sin mezclarse, por
  contrato de E1.
- Niños y mayores conservan la zancada escalada por talla; un mayor puede
  llevar el ritmo más corto si se ve y se mide.

**Pruebas exigidas.** Propiedades sobre el controlador real (`Cast`, `Fauna`):
ninguna pata patina en ningún clip de desplazamiento (extensión de
`graphics-animal-motion.test.ts` a `charge`/`flee`/`run`); la cara sigue al
rumbo de la vida; la pose no depende de dibujar a 30 o 60 fps (ya existe);
las mezclas acotadas.

**Medida y terminado cuando.** Tomas a 15 fps siguiendo un cuerpo, antes y
después con la misma semilla, año, actor y cámara, en dos semillas; contadas
las patas que patinan y los giros bruscos en la traza (`film-sheet.py`).

## 4 · AN-2 · Vida y oficios

**Alcance (literal).** Revisar y mejorar todos los gestos cotidianos: trabajo,
conversación, descanso, siembra, herramientas, bebida, juego y refugio;
incluir `bark` y `play` del perro y el vuelo ambiental. Asegurar que
preparación, contacto y recuperación se entienden desde la cámara móvil.
Sincronizar manos, herramientas, suelo y objetos con el gesto.

**Depende de.** AN-1 (la mezcla y el ritmo).

**Ficheros permitidos.** `src/render3d/action-clips.ts`, `src/render3d/clips.ts`
(`STRIKE_AT`, `STRIKE_HEAD` si el gesto cambia se remiden), `src/render3d/hand-tools.ts`,
`src/render3d/world/cast.ts` (`HELD`, `strike`), `src/render3d/effects/animal-gestures.ts`,
`src/render3d/effects/ambience.ts` (el batir), `tests/fast/work-gestures.test.ts`,
`tests/fast/procedural-clips.test.ts` y las nuevas.

**Contrato.** Cada gesto tiene tres tiempos legibles a la distancia de juego:
preparación, contacto y recuperación. El contacto cae donde está la cosa
(`STRIKE_HEAD` vigilado por prueba) y las astillas, la simiente, el agua y las
monedas salen de la mano o de la cabeza de la herramienta en ese instante. Los
gestos sin herramienta (charla, rezo, sentarse, beber, jugar, ordenar, cobijo)
se distinguen entre sí en silueta a veinte píxeles.

**Pruebas exigidas.** Las de `work-gestures` (carga por encima de la cabeza,
golpe rápido, cabeza de la herramienta en el golpe) siguen en verde con los
nuevos números; una prueba por gesto nuevo o cambiado que fije su silueta
(amplitud mínima de la articulación que lo define).

**Terminado cuando.** Hojas de gesto (`gesture-sheet`) y tomas en partida de
cada gesto cambiado, con la sincronía de la herramienta medida.

## 5 · AN-3 · Encuentros y combate

**Alcance (literal).** Revisar tiro con arco, golpe al portón, lanza,
recepción del impacto, caída, huida y las acciones de ataque o fuga de
animales que existan y se usen. Conservar el instante de los hechos, el daño,
las físicas, el resultado de la batalla y la frontera entre render, vida y
motor. Comprobar acción y reacción en secuencia, incluidos los casos de
respaldo del ragdoll.

**Depende de.** AN-1, AN-2.

**Ficheros permitidos.** `src/render3d/action-clips.ts` (los seis gestos
fechados y `flee`), `src/render3d/clips.ts` (duraciones), `src/render3d/world/cast.ts`
(`wound`, la salida del ragdoll), `src/render3d/effects/animal-motion.ts`
(`attack`, `charge`, `flee`, `down`), `tests/fast/combat-clips.test.ts` y las
nuevas. **No se toca** `melee.ts`, `archery.ts`, `raiders.ts`, `ragdoll.ts`,
`physics.ts` ni nada que decida daño, alcance o resultado.

**Contrato.** El contacto sigue en `t = 0` del hecho (`since`), el daño y el
parte de B4 no cambian, la pose de un gesto fechado es función del instante
(las pruebas de E1 lo guardan), y la caída animada de respaldo termina
tendida sobre el suelo. Un animal que ataca o huye lo enseña con su clip, sin
patinar y sin quedarse clavado en una pose de una vez.

**Terminado cuando.** Una secuencia de banco de batallas (`?sandbox=battle` o
`battle-report.ts`) y una toma de asalto en partida con acción y reacción
fotograma a fotograma; `combat-clips.test.ts`, `melee.test.ts`, `archery.test.ts`
y `ragdoll-physics.test.ts` en verde sin cambiar sus números.

## 6 · Brief de una corrección de rig o de GLB (si hace falta)

Se escribe **antes** de tocar el recurso, con: el defecto medido (qué hueso,
qué fotograma, qué cifra), la receta o el modelo afectado, la vía (Blender por
`npm run art` cuando haya Blender; o pistas escritas por script sobre los
nodos del GLB, como `rigid-clips.mjs`, determinista y con el `motion` del
catálogo actualizado), la prueba que fija la propiedad, y la publicación por
`publish-assets.ts --ids`. Nunca se edita un GLB a mano ni se cambian bytes
publicados sin catálogo y manifiesto.

### AN-1a · La zancada del aldeano (brief ejecutado el 29 sep 2026)

**Defecto medido.** `walk` cubre 0,317 celdas por ciclo (0,95 m) y la vida
mueve a la gente a 1,05–1,65 celdas/s (`village.ts`, `pace`): 3,3–5,2 ciclos
de pierna por segundo en todo trayecto, 6–9 en un niño; el pie apoyado
retrocede a 0,79–0,90× de lo que avanza el cuerpo (`gait-report.ts`, AN-0).
Es la «aldea de esprínters» que D.6.1 quiso evitar, vuelta por otro lado:
D.6.2 bajó la zancada al escalar el aldeano y el paso de la vida se calibró
después contra la jornada de ciento veinte segundos, no contra el clip.

**Recurso.** `art/recipes/villager/villager.json`, clips `walk` y
`carry_walk`. Los 17 aldeanos comparten los clips del base (`world/cast.ts`),
así que basta con el `villager.glb`.

**Vía.** Sin Blender en la ronda. (1) `art/recipes/villager/plant-gait.mjs`
reescribe las dos pistas en la receta con el pie plantado —el tobillo apoyado
retrocede en línea recta, el talón se levanta al final, la pierna vuelve
levantada; cadera y rodilla por cinemática inversa; brazos en oposición—, con
claves cada dos fotogramas e `interpolation: 'LINEAR'`. (2)
`tools/art/bake-clips.mjs` (nuevo) muestrea la receta a 24 fps como el
exportador y reescribe sólo esas dos animaciones en el GLB de G-17; con
`--check` reproduce las claves publicadas a 0,03°, que es lo que valida las
convenciones. (3) `gait-report.ts --only villager --glb <candidato>` mide la
zancada; la medida (0,423 y 0,339 celdas) va a la receta, al catálogo y a
`clips.ts`. (4) El GLB horneado se aprueba en
`artifacts/graphics/AN-1/approved/<hash>/` y se publica con
`publish-assets.ts --ids villager`. Un `npm run art -- all villager` con
Blender produce las mismas muestras (claves lineales) y sustituye este horneado.

**Prueba.** `tests/fast/villager-rig.test.ts` (rodilla y codo hacia su lado,
zancada cargada menor, receta y catálogo iguales) y
`tests/fast/graphics-clock.test.ts` (tabla y catálogo) siguen en verde con las
cifras nuevas; el reporte de marcha deja el «plantado» en 0,97–1,03×.

**Medida.** Cadencia 2,5–3,9 Hz andando (era 3,3–5,2) y 3,1–4,9 cargando
(era 4,0–6,3); apoyo 44–49 % del ciclo (era 26–32 %); rodilla a 14° al apoyar
el talón. **Lo que no arregla, y es decisión del dueño:** a 3–5 m/s reales la
gente sigue yendo deprisa; un clip de trote (dos pies en el aire) bajaría la
cadencia a 1,8–2,8 Hz con el mismo paso, pero cambia el carácter del valle.

### AN-1b · El rumbo de la vida y las carreras por suelo recorrido (brief retroactivo, ejecutado el 29 sep 2026)

**Defecto medido (AN-0).** `AnimalMotion.place` giraba el cuerpo hacia el
desplazamiento de píxel entre dos fotogramas con un umbral de 0,00001 celdas
e ignoraba el `facing` que la vida ya calcula con histéresis: un animal
apretado contra una valla o entre vecinos oscilaba de cara, y el perro ladraba
hacia donde iba y no hacia el forastero. `charge` del jabalí y `flee` del
conejo iban por reloj (patinaban 0,96 y 2,1 celdas por ciclo); los gestos
entraban a peso 1 de golpe; el zorro se acercaba al gallinero a 7,3 ciclos de
pata por segundo.

**Módulos fuera de la lista de AN-1 del encargo, y por qué.**
`src/derive/animals.ts` (un campo de presentación, `facing?: number`, del
mismo tipo que `Body.facing`) y la línea que emite `Animal` en `life/village.ts`,
`companions.ts`, `deer.ts`, `bear.ts`, `rabbits.ts`, `wild-prey.ts`,
`hunt-encounter.ts` y `renderer.ts`: la vida **ya sabía** hacia dónde miraba
cada cuerpo y no lo contaba; no se cambia conducta, sólo se publica un dato
que existía. Y `companions.ts`, `FOX_PACE` 0,95 → 0,6 (TUNE, medido: la
zancada del zorro es 0,13 y el clip no se puede alargar sin receta).

**Vía.** `effects/animal-motion.ts` (en la lista): rumbo de la vida si llega,
si no el avance neto ≥ 0,05 celdas; giro suavizado a 12 s⁻¹; `charge`/`flee`
por distancia con la zancada del catálogo (`FLEE_HOP` ×2,2 para el brinco);
fundidos de 0,08/0,10/0,14 s; caer con constante de 0,14 s.

**Prueba.** Cinco propiedades en `tests/fast/graphics-animal-motion.test.ts`
(la cara sigue al rumbo; el ruido no la mueve; la pata no se mueve quieto y
se mueve al avanzar en `charge` y `flee`; el primer fotograma de un gesto
pesa < 0,6; caer tarda). Ejecutado en `c7755bf`.

### AN-2a · La pelota sale de la mano (brief, 29 sep 2026)

**Defecto medido.** `play` es un balanceo de brazos abiertos sobre `idle`
(2,4 s, en bucle, por reloj con desfase por persona): no hay gesto de lanzar
ni de coger, y la pelota sale de la nada. La vida sí sabe cuándo sale: al
acabar la oferta `play` (`village.ts`, `fling` en `doing.until`, fijado al
llegar), desde 0,4 celdas por delante y a 0,53 de alto (`props.ts`,
`THROW_FORWARD`, `THROW_HEIGHT`).

**Módulos fuera de la lista de AN-2, y por qué.** `src/render3d/life/cast.ts`
(el productor del `Actor`): `play` pasa a ser un clip **fechado por el hecho
que viene**, como los de combate lo son por el hecho que fue —`clipSeconds =
D − (until − steps) · LIFE_STEP`, acotado a `[0, D]`—, de modo que la suelta
del clip cae en el paso en que `fling` pone la pelota en el aire; y un niño en
la plaza de `play` sin pelota en la mano (`holding === null`, porque otro se
la llevó) enseña `idle` y no un lanzamiento al aire. No se toca `village.ts`
ni `props.ts`: el hecho y su instante ya existen.

**Vía.** `action-clips.ts`: un clip nuevo, `throw` (`clips.ts`: 1,0 s,
`loop: false`): carga atrás y arriba (0–0,6), giro del tronco y barrido del
brazo hasta la suelta al final; la pose 0 es la pelota sujeta con las dos
manos delante, que es lo que se ve mientras la oferta dura y aún no toca
lanzar. `play` sigue siendo bucle y es el juego **sin** pelota: el oficio del
día de un niño (`day.ts`, `leisurePlaces`) se ofrece sin trasto y en las
tomas no hay pelota (`props: []`), así que ahí se brinca en vez de lanzar al
aire (ejecutado así el mismo día: la primera versión mandaba a `idle` y
dejaba a los niños de pie). **Lo que no hace:** la pelota sigue
pintándose 0,38 celdas por delante del cuerpo a 0,45 de alto mientras se
lleva (`world/props.ts`), no en la mano que carga; colgarla del hueso es un
cambio de `world/props.ts` que se anota en `encargos-3d.md`.

**Prueba.** En `tests/fast/work-gestures.test.ts`: la mano derecha en la
suelta (t = 0,85) está por delante y por encima de donde estaba en la carga
(t = 0,55), a menos de 0,25 celdas del punto de salida de la pelota para un
adulto; y `life/cast.ts` fecha el clip: con `until − steps` pasos por delante,
`clipSeconds = max(0, D − pasos · LIFE_STEP)`.

### AN-2b · El golpe del martillo y las chispas de la fragua (brief, 29 sep 2026)

**Defecto medido.** `hammer` es un seno del brazo derecho (1,6 s) sin
instante de golpe: `STRIKE_AT` no lo cubre, el render no suelta nada y a
veinte píxeles el herrero y el que levanta una casa parecen saludar.

**Módulos fuera de la lista.** `src/render3d/effects/work-chips.ts`: una clase
de viruta nueva, `spark` (clara, corta, sube y se apaga), para la fragua; la
obra suelta `wood`. `world/cast.ts` ya está en la lista (`strike`).

**Vía.** `STRIKE_AT.hammer = 0,55`; el clip toma las tres poses del hacha a
una mano —carga sobre el hombro, golpe acelerado, rebote— con la izquierda
sujetando delante; `Cast.strike` suelta desde la mano derecha `spark` si el
actor es el herrero (`role === 'smith'`) y `wood` en la obra.

**Prueba.** En `work-gestures.test.ts`: la mano en `STRIKE_AT − 0,15` está
por encima del hombro y en `STRIKE_AT` por debajo de la cintura, y el golpe
baja más deprisa de lo que sube (mismo criterio que hacha y pico).

### AN-3a · El aviso del oso dura lo que su clip (brief, 29 sep 2026)

**Defecto medido.** El clip `attack` del oso de Vera dura 3 s (catálogo): se
alza sobre las patas traseras en el primer segundo y medio y amenaza el
resto. El aviso de la vida (`life/bear.ts`, `WARNING_STEPS`) duraba 1,55 s:
el oso se cortaba a media subida y se iba andando, y con el fundido de AN-1b
lo que se veía era un oso que empieza a alzarse y se lo piensa.

**Módulo fuera de la lista de AN-3, y por qué.** `src/render3d/life/bear.ts`,
una constante: el aviso pasa a 3 s. No decide daño ni resultado —la visita
del oso no hiere a nadie— y no toca el motor.

**Prueba.** `tests/fast/life-bear.test.ts` fijaba la duración por los pasos
que daba (60 tras el aviso): ahora comprueba que a los dos segundos todavía
amenaza y que después se retira y se va. La toma en partida no se pudo
rodar (el observatorio no provoca la visita: `encargos-3d.md`); la evidencia
del gesto es el banco de AN-0.

### AN-4b · Las tomas que faltaban (brief, 29 sep 2026)

**Defecto medido.** Cuatro familias quedaron sin toma en partida porque el
observatorio no podía llegar a ellas, no por mala suerte de semilla: (1) la
**visita del oso** sólo nace superada la caza del jabalí (`createBear`:
`hunt:boar` = 0), así que `--happening bear_in_the_wood` solo no la trae
nunca; (2) la **caza** exige tocar la señal, y la señal sólo se coloca con la
presa en cuadro (`huntSign()`), que desde el encuadre de reposo casi nunca
está: tres valles con oferta del motor y ninguna señal tocable; (3) el
**asalto de la villa 7/60** agotó los 30 s de `page.goto` (sesenta personas,
muralla y Rapier bajo SwiftShader), y sin `--means bows,arms` no hay arqueros
que tensen; (4) el **lanzamiento** (`throw`) no se puede grabar: la pelota
suelta la retiró el dueño del diseño el 15 sep («eran el descarte de
físicas»; `createVillage` no recibe `props: true` en el juego). Eso no es una
ruta que falte sino una decisión: `throw` queda como límite dicho, y sólo se
enseña si hay un trasto de verdad en la mano (`holding >= 0`, no una carga). **Vera decidió conservarlo (29 sep 2026)**: no se retira, espera a que vuelvan los trastos.

**Módulos fuera de la lista, y por qué.** `src/main.ts` y `src/ui/debug.ts`:
un parámetro de la ruta de depuración, `&hunted=perdiz,conejo…`, que da por
cazadas esas especies (`hunt:<especie>` = 0, lo mismo que apunta
`settleHunt`); es la familia de `&happening=` y `&raid=` —poner el valle en el
estado que se quiere mirar— y no toca el motor ni la partida normal.
`src/render3d/renderer.ts`: un campo `hunt` en la instantánea del
observatorio (ofrecida, en marcha o hecha; especie, arma, presa), sin
cambiar nada de lo que se pinta. `tools/graphics/observe-life.mjs`:
`page.goto` con 240 s, `--hunted`, y `--hunt` que arranca la caza con un
gancho del renderer, `__valleyHunt` (la especie de la oferta del motor y el
arma por el hash de la semana, como el toque de la señal) y devuelve el
motivo si no empieza; `startHunt` pasa a apoyarse en `beginHunt`, que dice
el motivo, sin cambiar lo que responde al juego. **Ejecutado así el mismo
día:** la primera versión tocaba la señal con un clic del DOM y la caza no
empezaba en tres valles con oferta (la señal se valida en la interfaz, que
en modo de observación no se refresca); con el gancho empezó a la primera
(perdiz con honda en 11/24: el cazador tensa y la presa despega).
`src/render3d/life/cast.ts`: `throw` sólo con un trasto en la mano.

**Prueba.** Una propiedad nueva: con las especies anteriores cazadas, la
oferta del motor puede ser la siguiente y el oso de la visita nace (y sin el
jabalí cazado, no). Las tomas las rueda un agente con los comandos cerrados;
su medida es la traza (fases del oso, acciones de la presa, clips del
cazador y de la guarnición, fotograma a fotograma).

### AN-4c · El oso nace con los troncos del juego (brief, 29 sep 2026)

**Defecto medido.** La visita del oso **no nacía nunca en partida**, aunque el
motor la tirara y la crónica la contara. `createBear` busca la guarida en una
celda de bosque que admita el cuerpo del oso (radio 0,52); el juego mete el
tronco del árbol publicado en cada celda de bosque (`world/obstacles.ts`,
`solidTerrain`) y con ellos ninguna la admite. Medido fuera del navegador con
la biblioteca de modelos real, en 7/30, 11/21 y 23/30: con el terreno a secas,
22 guaridas posibles y un oso; con los troncos, **0 guaridas y ningún oso**
(61 celdas de bosque bloqueadas y 84 donde no cabe). El observatorio lo
confirmó: `bearDen` nulo desde el paso 0 en las tres tomas. La prueba de la
visita (`life-bear.test.ts`) pasaba porque montaba la jornada sobre el terreno
a secas: la trampa de CLAUDE.md, una prueba que llama a la función no sabe si
el juego la llama.

**Vía.** `src/render3d/life/bear.ts`, fuera de la lista (como AN-3a): la
guarida puede ser también una celda de pradera pegada al bosque —la linde, de
donde el oso sale de entre los árboles—, con las mismas condiciones de sitio,
alcance y línea libre hasta el claro. No toca el motor ni el resultado de nada:
la visita no hiere a nadie.

**Prueba.** `life-bear.test.ts`: con un tronco de 0,3 en cada celda de bosque,
donde el juego planta cada árbol (`scatterTransform`), la visita nace, el oso
cabe y su guarida tiene bosque al lado. Sin el arreglo, la prueba falla
(«expected [] to have a length of 1»). Con la biblioteca real, el oso nace en
los tres valles.

**Y una segunda mitad, vista al rodarlo.** Con la guarida arreglada, la toma
de 11/21 enseñó al oso **dentro de la roca**: nacía en el centro del modelo de
la cueva (`bear-den`) y los 3 s del aviso pasaban tapados. La receta publicada
dice dónde va: «la entrada está a 0,55 por delante del centro, mirando al
claro; el oso se retira hacia dentro y se esconde tras el hueco oscuro». El oso
nace ahora en esa boca, mirando al claro (`DEN_MOUTH`), y al retirarse vuelve
al centro, dentro. La prueba lo guarda y la toma lo enseña
(`AN-4b/bear-seed11-y21-an4c/strip-bear-wide.png`: se alza delante de la cueva
en los fotogramas 1–30 y entra del 31 al 36).

**Superado en parte por AN-4d** (abajo): la cueva ya no está en la linde sino
al pie de la montaña, que es lo que pidió Vera.

**Lo que no decidía este brief, y era del dueño.** La guarida se elegía junto al
árbol que se tala, y ahí está el leñador (a 0,2–1,3 celdas en los tres valles):
el oso avisa en el primer paso de la jornada y a los 3 s se ha ido, sin llegar
a hozar en el claro. Para que se le vea salir, hozar y retirarse al ver gente
habría que alejar la guarida del tajo —un cambio de cómo es la visita, no de
cómo se anima—.

### AN-4d · La cueva del oso en la montaña (pedido de Vera, 29 sep 2026)

**Pedido.** Vera, al ver la toma de AN-4c: «la cueva del oso debe salir en la
montaña». AN-4c la había dejado en la linde del bosque, junto al tajo: una
cueva de roca en un prado, al lado de un huerto. El modelo se hizo para la
montaña (`art/recipes/bear-den`: «hundir la base en la montaña», la boca al
frente).

**Vía** (`life/bear.ts`, `createBear`). La cueva es una celda transitable al
pie de la montaña (`TERRAIN_CODE.mountain` en alguna de sus ocho vecinas, y
no a los dos lados); el claro, a 1,5–5 celdas **delante** —hacia el valle, a
menos de 60° del frente— y con suelo libre **desde la boca**, que es donde
tiene que caber el oso; y a la espalda del modelo (la contraria al claro),
**tres celdas de roca seguidas y una ladera que sube al menos 0,5 celdas a
dos celdas** (`DEN_ROCK`, `DEN_RISE`, con la cota que pinta el juego, que la
jornada ya recibe como `ground`). Entre las que cumplen, la del claro más
cerca del bosque que se tala; si un valle no tuviera ninguna, la mejor sin
ladera antes que ninguna visita. El oso nace en la boca (AN-4c), vuelve a
ella al retirarse y el último medio metro hasta el centro lo hace en línea
recta, porque la roca del modelo no está en la máscara de la vida. La caza del
oso usa la misma cueva y vuelve a la boca (`renderer.ts`, `beginHunt`).

**Dos tropiezos, medidos y corregidos por el camino.** (1) Con una sola celda
de montaña al lado bastaba una mota suelta: la primera versión puso la cueva
de 23/30 con pradera detrás (la ladera subía 0,01). En el borde de la montaña
el suelo sube poco casi en todas partes —mediana 0,05–0,2 a dos celdas—
porque la roca crece con la hondura (`risesOf`). (2) Exigir que el oso cupiera
en el **centro** de la cueva dejaba fuera todo pie de ladera de verdad: una
celda pegada de lado a la montaña no admite un círculo de 0,52 (hay 0,5 hasta
la roca), así que sólo pasaban las que la tocan por una esquina —las motas—.
En 23/30, de 201 pies con ladera, 194 caían por eso.

**Medido** con el terreno real y la cota del juego: en 23/30, 11/21, 7/30,
3/25 y 5/40 la cueva queda contra una ladera que sube de +0,52 a +0,80 a dos
celdas, con el vecino más cercano a 8–12 celdas de la boca: el oso sale y
hoza; en tres valles avisa cuando alguien se acerca y se mete, en dos vuelve
a su hora. **En partida** (7/30, `observe-life --seed 7 --year 30 --hunted
partridge,rabbit,deer,boar --happening bear_in_the_wood --lead 0 --zoom 0.5
--look 13.5,66.5`, 6 fps): la cueva al pie de la ladera de roca con pinos; el
oso sale por la boca, se alza con las garras fuera cuando alguien se acerca
(fotogramas 6–23), baja, da media vuelta y se mete (24–33)
(`AN-4b/bear-seed7-y30-montana-ancha/strip-bear-visita.png`).

**Prueba.** `life-bear.test.ts`: con troncos en cada celda de bosque y la cota
del juego, la cueva toca la montaña, a su espalda hay tres celdas de roca y la
ladera sube al menos 0,5, la boca mira al valle y el oso nace en ella mirando
al claro.

### AN-5a · La caza enseña el golpe que la decide (brief propuesto, no ejecutado)

**Defecto medido** en la toma del jabalí de AN-4b (7/24, lanza, 30 fps): la
carga se ve 32 pasos y la estocada que resuelve la caza, ninguno. En el paso
en que la lanza llega, `life/hunt-encounter.ts` resuelve la caza (espantada o
muerta) y pone el clip del cazador en `idle`; el renderer
(`renderer.ts`, actor del cazador) le quita el arma al completarse y le da
`clipSeconds` del reloj de presentación, así que ni `spear_thrust` ni
`bow_loose` empiezan en el tiro. Y la presa espantada pasa a `gone` en el
sitio.

**Vía propuesta.** (1) `HuntHunterPose` lleva los pasos desde el último tiro
y el renderer los usa como tiempo de los clips de gesto —lo que el asalto ya
hace con `combatClip` y `since`—; (2) al completarse, el gesto del último tiro
y el arma se quedan hasta que acaba el clip; (3) la presa espantada huye unos
segundos con `stepWildPrey` antes de irse. Módulos: `hunt-encounter.ts` y la
parte del cazador en `renderer.ts`. Prueba: una caza con lanza que acaba en
estocada enseña `spear_thrust` con el contacto en t=0 del paso que decidió.
**Fuera de este brief, y del dueño:** que la lanza no pase a través de una
empalizada (mirar la línea libre cambia cuántas cazas salen bien).

## 7 · AN-4 · Aceptación conjunta

**Alcance (literal).** Repetir tomas antes/después del mismo estado. Cubrir
dos semillas, distintas edades de la aldea, una villa y un asalto. Cerrar cada
fila de la matriz con evidencia y veredicto. Un clip que ya funciona puede
conservarse si se muestra por qué; uno visible sólo en preview queda marcado
como `preview-only`, no como integrado. Comprobar lectura a tamaño normal de
móvil y comparar tiempo de JS por fotograma, draw calls y recursos con la
línea de base. No presentar FPS de SwiftShader como FPS de un teléfono. Dejar
la comprobación en iPhone/iPad identificada como pendiente si no hay acceso
real al dispositivo.

**Terminado cuando** la matriz de abajo no tiene ninguna fila sin veredicto,
la suite rápida y las jornadas están en verde (o con sus rojas declaradas de
antes), y el cuaderno, el changelog, la fila AN y `encargos-3d.md` están al día.

---

## 8 · La matriz

Se rellena en AN-0 y se cierra fila a fila en AN-4. Columnas: **origen** (GLB,
fabricado, bench), **situación** (dónde lo produce la vida), **evidencia**
(toma o hoja; `partida` o `preview`), **defecto**, **gravedad** (alta: se ve a
tamaño de móvil y contradice el hecho; media: se ve de cerca; baja: sólo con
zoom o en preview), **coste** (S/M/L), **decisión** (corregir en AN-n /
conservar con motivo / `preview-only` / encargo).

Está en `docs/medidas/animacion-matriz-2026-09-29.md` para que las tomas y las
cifras vivan con la evidencia y este plan se quede con el porqué.

---

## 9 · Del encargo original (ae444f7), tal cual

### Qué significa «mejor»

La [guía de animación de Atlas](https://github.com/MonumentalSystems/Atlas-Agent-Teams/blob/main/teams/3d-design/skills/animation/SKILL.md) propone revisar poses, anticipación, peso, continuidad y mezclas. En The Valley esas preguntas se convierten en observaciones a tamaño de juego, no en una lista de efectos nuevos:

- **Movimiento:** patas y pies alternan apoyos; al apoyar, no resbalan; la orientación acompaña la trayectoria sin giro brusco; parar y reanudar conserva continuidad.
- **Acción:** se distingue preparación, acto y recuperación cuando el gesto lo necesita; herramienta, presa, suelo u objeto reaccionan en el mismo instante; el cuerpo comunica peso sin gesticular fuera de escala.
- **Especie y edad:** vaca, gallina, pez, perro y aldeano no comparten el mismo ritmo por accidente; niño y mayor conservan una marcha plausible con sus tallas reales.
- **Lectura móvil:** se entiende en cámara normal a 390×844 y en pantalla estrecha de 320×568. Un primer plano puede diagnosticar, pero no basta para aprobar.
- **Coste:** no se cambia una animación por más draw calls, huesos, clips o trabajo de CPU sin comparar la base. La skill local `.claude/skills/performance/SKILL.md` deja claro que los FPS de SwiftShader no representan un teléfono; la última aceptación es en un aparato real.

Un clip que ya cumple estos criterios puede conservarse, con evidencia. «Todas» exige **revisar cada fila y cada gesto**, corregir los defectos detectados y documentar por qué se mantienen los que ya funcionan; no exige introducir cambios arbitrarios en cada archivo.

### Regla de cierre del programa

No se declara «animaciones terminadas» por tener clips conectados o pruebas verdes. Se cierra AN-4 cuando la matriz cubra los 24 clips humanos, las quince especies y las aves ambientales; las acciones con contacto coincidan con sus hechos; las secuencias reales se lean en móvil; y el coste esté comparado con la base. Los casos que no puedan provocarse en una partida se identifican como límite y reciben una toma de integración en cuanto exista ruta para verla.

