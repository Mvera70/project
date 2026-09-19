# OBS-02 piloto ciego — contraste de trazas Luna2

## Método y hechos de instrumentación

Leí selectivamente `trace.json` después de cerrar la revisión visual. No volqué los JSON completos. A y B tienen `seed=11`, `year=20`, 61 frames a 15 fps, modo `production-renderer-fixed-state-30hz`, `firstTick=lastTick=912`. C tiene `seed=7`, `year=1`, 17 frames a 2 fps, modo `live-engine-browser-clock`, pero `firstTick=lastTick=0`.

En los tres casos `errors` está vacío. Los contadores agregados son cero para `meshDrift`, `peopleMeshDrift`, `penetratingCircles`, `penetratingBeasts` y `blockedCentres`. Por tanto, en las muestras capturadas no hay incidencia registrada de esos tipos; esto no cubre el espacio entre muestras.

## Caso A — hechos visuales frente a métricas

Visualmente, los 27 aldeanos se desplazan en la ventana de 4 s; se ven estados de caminar y reposo, grupos cerca de la puerta y edificios estables. La traza confirma 27 personas muestreadas, 1 bestia, 1.647 muestras de persona y clips `walk` (1.135), `idle` (98), `work_hoe` (120), `chop` (61), `drink` (46), `sit` (60), `talk` (97), `hammer` (11) y `play` (19). La traza registra 10 interacciones iniciadas y 8 completadas al final, con 0 invalidadas y 0 atascadas. Las posiciones de, por ejemplo, id 0 cambian de `(31.173,60.575)` a `(35.001,57.971)`; id 1 llega a `(34.800,62.490)` y figura `there=true`.

**Anomalía/sospecha:** no hay anomalía confirmada. La diferencia entre inicio y final y la mezcla de clips respaldan movimiento y actividad visibles. **Hipótesis limitada:** las 2 interacciones iniciadas que no constan completadas al final pueden estar aún en curso; no es evidencia de atasco porque `stuck=0`.

## Caso B — hechos visuales frente a métricas

Visualmente, la misma ventana contiene desplazamientos graduales, aproximaciones en la puerta y cuerpos repartidos entre casas y parcela. La traza vuelve a indicar 27 personas y 1 bestia, sin errores ni penetraciones. Los clips son `walk` (1.103), `idle` (109), `work_hoe` (120), `chop` (61), `drink` (46), `sit` (60), `talk` (113), `hammer` (16) y `play` (19). Interacciones finales: 10 iniciadas, 8 completadas, 0 invalidadas, 0 atascadas. La posición de id 0 pasa de `(31.173,60.575)` a `(34.653,58.542)`; id 3 pasa de `(26.937,60.500)` a `(26.569,56.688)`.

**Anomalía/sospecha:** no hay anomalía confirmada. A y B parten con metadatos y posiciones iniciales equivalentes pero terminan con pequeñas diferencias de posición y distribución de clips; son hechos del registro, no una explicación causal. **Hipótesis limitada:** las diferencias podrían ser sensibilidad de la evolución de la capa de vida dentro del muestreo, pero esta toma no permite atribuirles causa.

## Caso C — hechos visuales frente a métricas

Visualmente, dos aldeanos y tres gallinas cambian de posición alrededor de la casa, parcela y río; al final un aldeano aparece en la zona del vado. La traza registra 34 muestras de persona y 51 de bestia, con estados de persona `day=21`, `sleeping=11`, `leaving=1`, `returning=1`. Hay una interacción iniciada y completada, sin invalidación ni atasco. Aparece `ford:crossing` una vez y el clip `drink` una vez; el resto de clips humanos son `idle` (19), `walk` (3) o `none` (11). Las cuatro salidas nocturnas registran `residents=2`, `sleeping=2`, `pending=[]`; las transiciones incluyen sueño, salida y retorno.

**Anomalía/sospecha:** el PNG es compatible con movimiento, escenas nocturnas y un cruce visible, y los contadores no señalan penetración. Sin embargo, `firstTick=lastTick=0` aunque el modo se etiqueta como live; eso limita la interpretación: la traza no demuestra avance del tick del motor durante esta toma. **Hipótesis limitada:** el movimiento observado puede proceder del reloj/renderer y de cambios de vida escénica, pero no permite afirmar renovación persistente del estado del motor.

## Conclusión y límites

En los intervalos inspeccionados no encuentro anomalía visual confirmada en movimiento humano, contactos o colocación del entorno. La evidencia positiva es local: posiciones cambiantes, clips y actividades concordantes, interacciones que progresan, y contadores de penetración/drift en cero. A/B son tomas fijas y no prueban noches ni evolución persistente. C muestra varias noches y estados, pero el tick no avanza en la traza; tampoco prueba ausencia de fallos entre sus 2 fps. No se ejecutaron juego, tests, builds ni se modificó código.
