# D6 · Saqueo y acabado físico · 20 sep 2026

Ronda cerrada. [Contrato](../../encargos/encargo-d6-acabado-fisico.md).
Sol implementó escena/transición y física articulada; Terra, la rotura visible,
fragmentos y cierre de integración. El principal revisó, corrigió la
instrumentación y observó. No se abre otra tarea ni se hace push/despliegue.

## Estado previo y criterio

Tras `66dc27f` hay siete gestos procedurales, separación de atacantes y huida.
El saqueador desaparecía al llegar al centro (o al vencer el plazo); no tenía
destino de saqueo, gesto ni carga. El epitafio se montaba en `finish()` en cuanto
el motor terminaba. Rapier se pedía sólo con arqueros y sus colliders tenían
suelo plano a cero. `fall` no tenía articulación física ni respuesta al entorno.

Referencia inmutable de la ronda anterior:
`artifacts/graphics/visibilidad-huida-2026-09-20/final-game/valley.html`.
Las tomas de esa ronda demuestran huida y puerta visible, no D6 ni ragdoll.
Semilla 23, año 30, armas sin arcos, a 46 s escénicos: un atacante y dos
defensores caídos. Es el caso cercano inicial para verificar los dos bandos.

## Entrega y verificación

Las salidas nuevas van en `artifacts/graphics/d6-2026-09-20/`.
Bundle definitivo: `final-game/valley.html`, 62 recursos, 15,45 MB. Los avisos
previos de modelos `barrel` y `hall` siguen fuera de esta ronda.

La escena asigna puertas de edificios existentes; llegar y completar el gesto
concede una carga y una huella, nunca una segunda pérdida del motor. Puede
retirarse vacía si no alcanza el destino. Las rutas usan el radio del cuerpo,
con recuperación de contacto y sin teletransporte. La puerta exacta conserva
su marco; si Rapier llega tarde, recibe la rotura pendiente una sola vez.

Los ragdolls nacen de `fall(0)` del rig publicado, con once cápsulas,
articulaciones y orientación efectiva de combate. Terreno rectangular con
alturas column-major, obstáculos, topes 24/24, sueño a 8 s y liberación segura.
El resultado terminal se guarda antes de la escena y su reloj visual va a 1×.

### Juego 3D observado

Todas las rutas usan año 30, `--means arms --raid 24 --assault`, sin arcos.

| Toma | Parámetros | Resultado |
|---|---|---|
| `sack-final-7` | seed 7, lead 24, 45 s, 2 fps, follow -9005, zoom 0.13 | 69 vecinos, 12 atacantes; 2 cargas/2 huellas, 6 tablas; fase `escaping`, ready al final |
| `sack-final-23` | seed 23, lead 24, 40 s, 2 fps, follow -9001, zoom 0.16 | 71 vecinos, 12 atacantes; 3 cargas/3 huellas, 6 tablas, 3 ragdolls dormidos al final |
| `fall-final-23` | seed 23, lead 19, 8 s, 15 fps, follow 5, zoom 0.06 | Caída visible de atacante -9002 y defensores 5/109; 33 cuerpos físicos; posición correcta del defensor 5 |

Cero errores de página y cero `meshDrift`, `peopleMeshDrift`,
`penetratingCircles`, `penetratingBeasts` y `blockedCentres` en esas tomas.
Estos contadores cubren los cuerpos indicados por el observatorio, no una
garantía de todos los contactos de raiders o de huesos entre muestras.
Inspeccionados PNG antes/durante/después de la caída y de la recogida/salida:
el rig se articula y se asienta, el cargador cambia a `carry_walk` con malla
de carga equipada. Los árboles todavía ocultan algunos tramos fuera del portón.

### Final, guardado y recarga

`ending-final-b4-7` resuelve una batalla con el renderer real y salta sólo el
reloj hasta el tick de B4: no escribe `ended` ni llama a `tick` desde el script.
Resultado real: `stormed`, tick 1459, archivo de una partida. Guardado antes
del epitafio, mismo tick/archivo al terminar; recarga muestra el menú sin botón
de continuar una partida muerta. Cero errores. El salto del reloj es una
discontinuidad deliberada: **no demuestra continuidad de la escena**.

Esa propiedad se observa aparte en `ending-final-scene-full-7`, con escena
preparada a 48 s y `__valleyEnd('stormed')`: el hook sólo prueba la transición,
no B4. La Village conserva sus pasos y avanza a 30 pasos/s, sin avanzar el tick
1458; primero se muestra la lápida y después la hoja de cifras del final
preexistente. `ending-final-reduced-7` abre la hoja inmediatamente (t=0), sin
duplicarla ni perder el guardado al recargar. El primer contador del script
miraba sólo la hoja y no la lápida intermedia; se corrigió la instrumentación.
En la toma completa, 1442 → 1802 pasos (12 s de escena); primera muestra de
lápida a 12,5 s y hoja a 14,5 s, por la inscripción intermedia ya existente.
El archivo conserva una sola partida y la recarga no permite continuarla.

La toma continua a ×64 se descartó por coste del diagnóstico; se separaron
batalla/B4 y continuidad visual para mantener acotada la verificación. No es
una prueba de rendimiento ni de FPS en móvil.

### Comandos reproducibles

```powershell
npm run bundle -- --out artifacts/graphics/d6-2026-09-20/final-game
node tools/graphics/observe-life.mjs --page artifacts/graphics/d6-2026-09-20/final-game/valley.html --seed 7 --year 30 --means arms --raid 24 --assault --lead 24 --seconds 45 --fps 2 --follow -9005 --zoom 0.13 --out artifacts/graphics/d6-2026-09-20/sack-final-7
node tools/graphics/observe-life.mjs --page artifacts/graphics/d6-2026-09-20/final-game/valley.html --seed 23 --year 30 --means arms --raid 24 --assault --lead 24 --seconds 40 --fps 2 --follow -9001 --zoom 0.16 --out artifacts/graphics/d6-2026-09-20/sack-final-23
node tools/graphics/observe-life.mjs --page artifacts/graphics/d6-2026-09-20/final-game/valley.html --seed 23 --year 30 --means arms --raid 24 --assault --lead 19 --seconds 8 --fps 15 --follow 5 --zoom 0.06 --out artifacts/graphics/d6-2026-09-20/fall-final-23
node artifacts/graphics/d6-2026-09-20/check-ending.mjs --page artifacts/graphics/d6-2026-09-20/final-game/valley.html --out artifacts/graphics/d6-2026-09-20/ending-final-b4-7 --natural --jump --seconds 13
node artifacts/graphics/d6-2026-09-20/check-ending.mjs --page artifacts/graphics/d6-2026-09-20/final-game/valley.html --out artifacts/graphics/d6-2026-09-20/ending-final-scene-full-7 --stage --lead 48 --seconds 16
node artifacts/graphics/d6-2026-09-20/check-ending.mjs --page artifacts/graphics/d6-2026-09-20/final-game/valley.html --out artifacts/graphics/d6-2026-09-20/ending-final-reduced-7 --lead 0 --seconds 1 --reduced
```

Usar salidas nuevas al repetir. Artefactos locales ignorados por Git;
`check-ending.mjs` es un diagnóstico de esta ronda, no una herramienta publicada.

**66 pruebas focalizadas verdes**, 10 ficheros: `sack`, `stormed-transition`,
`ragdoll-physics`, `battle-debris`, `physics`, `archery`, `combat-clips`,
`flee-crowd`, `raiders`, `stormed`. Typecheck, lint global y diff check verdes.
No se ejecutó la suite larga. Las pruebas de saqueo guardan estado idéntico,
ausencia de carga durante búsqueda, unicidad y salida no forzada en dos semillas.

### Límites y parada

No todos los atacantes consiguen carga ni completan su salida dentro de los
40–45 s grabados; no se simula éxito cuando vence una ruta. Los restos son
efímeros, no se guardan entre jornadas. Sin física queda `fall` y la hoja rota
sin tablas. No incluye sangre, fuego, identidad propia del clan, adarve ni
modelos pendientes. No cambia motor, daño, cadencia ni economía.

## Hallazgos de la integración

- `sack-a-7`: semilla 7, año 30, armas sin arcos, asalto de 24, lead 24 s,
  40 s a 2 fps. Cero errores de página, pero **cero cargas y huellas**; once
  atacantes acababan escapando vacíos y varios permanecían inmóviles. No se
  acepta como evidencia de D6 aunque los contadores de civiles sean cero.
- El reloj del observatorio falló antes de grabar por `pauseAt` en el pasado:
  instalarlo bajo carga tardó más que sus 100 ms de margen. Se amplía el margen
  anterior al reset de escena; no cambia el tiempo del experimento.
- `fall-b-23`: semilla 23, año 30, lead 40 s, 6 s a 15 fps. Dos ragdolls,
  22 cuerpos, cero errores y cero anomalías del resumen. Los PNG y las poses
  muestran articulación y asentamiento, **pero la ubicación de un defensor
  era incorrecta**: el mapa `byId` usa ids de cuerpo y la herida usa VillagerId.
  Esta toma no certifica el cierre; exige corregir la búsqueda y repetirla.

Estas incidencias se descubren cruzando píxel y traza; las pruebas físicas
aisladas no podían demostrar la colocación ni la navegación del juego vivo.
