# OBS-02 — contraste de trazas, piloto luna3

Esta fase se hizo después de cerrar `luna3-visual.md`. La lectura fue selectiva:
metadatos, `summary`, primer/último frame y colecciones resumidas; no se hizo un
volcado completo.

## Métrica registrada

| Caso | muestras | modo/parametría | personas/cuerpos | ticks | métricas de contacto | clips observados |
|---|---:|---|---:|---|---|---|
| A | 61 | seed 11, year 20, lead 1, 15 fps, estado fijo | 27 / 1 animal | 912 → 912 | errors vacío; meshDrift 0; peopleMeshDrift 0; penetratingCircles 0; penetratingBeasts 0; blockedCentres 0 | walk, idle, work_hoe, chop, drink, sit, talk, hammer, play |
| B | 61 | seed 11, year 20, lead 1, 15 fps, estado fijo | 27 / 1 animal | 912 → 912 | igual que A | igual que A |
| C | 17 | seed 7, year 1, lead 0, 2 fps, live ×64 | 2 / 3 animales | 0 → 0 | errors vacío; meshDrift 0; peopleMeshDrift 0; penetratingCircles 0; penetratingBeasts 0; blockedCentres 0 | idle, walk, drink |

En A y B la traza resume 24 de 27 personas con desplazamiento superior a
0,01 unidades y un máximo de 5,537; registra sólo estado `day` o `no-home` al
inicio, sin noches. En C resume cuatro muestras de noche con 2 residentes, 2
durmiendo y `pending: []`; también enumera transiciones `sleeping`, `leaving`,
`returning` y `day` entre 1 y 7,5 s, pero el contador de motor se mantiene en 0.

## Contraste y clasificación

### A, intervalo 0000–0060 — sin anomalía

La inspección visual describe movimiento y disposición coherentes. Las métricas
no muestran errores, drift, penetraciones ni centros bloqueados. Los clips cambian
entre locomoción, reposo y actividades. Esto apoya el resultado visual, limitado
a una toma fija de 4 s y a muestras de 15 fps.

### B, intervalo 0000–0060 — sin anomalía

La evidencia de imagen y las métricas coinciden con A: hay movimiento de personas,
varios clips y cero incidencias agregadas. No se deriva una garantía poblacional
por ser la misma semilla y parámetros que A.

### C, intervalo 0000–0016 — sospecha métrica, observación visual sin anomalía

Visualmente se ve un aldeano desplazarse junto a casa/campo y animales en el
entorno sin contacto evidente. La traza informa cuatro comprobaciones nocturnas
completas, pero `firstTick = lastTick = 0` y todos los `nightOutcomes.tick` son 0
en modo declarado `live-engine-browser-clock`; por el contrato, un recorrido vivo
debería avanzar ticks. Esto es una **sospecha de instrumentación o del avance
persistente**, no una anomalía visual de marcha/contacto. Las transiciones de vida
y las posiciones renderizadas prueban que hubo actividad de la capa de vida, pero
no permiten decidir si el motor avanzó correctamente.

## Límites y no inferencias

Los contadores sólo cubren muestras. A/B son estado fijo (`engineTick` constante),
por lo que no evalúan nacimientos, cambios de jornada ni persistencia. C tiene
17 imágenes a 2 fps y no permite inspeccionar zancada. No he atribuido un fallo a
los cuatro residentes `no-home` de A/B: es un estado de datos y no una colisión.
No se ejecutaron tests, build ni capturas nuevas; los únicos auxiliares propios
son las hojas de contacto bajo `artifacts/graphics/OBS-02-pilot/reviewer3`.
