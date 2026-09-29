# Animación integral de aldeanos y animales para móvil — el plan (AN)

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
