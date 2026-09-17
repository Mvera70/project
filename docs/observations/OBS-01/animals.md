# OBS-01 · Auditoría visual de fauna y animaciones

## Alcance y límite del bundle

Se leyó `CLAUDE.md`, `docs/task-log.md`, `observe-valley-life`, su contrato y
`valley-life-ai`. El bundle solicitado
`artifacts/graphics/OBS-01/game/valley.html` tenía SHA-256
`5ACF3BBF46F435F2C9E3FFD5D2F13E6473E1ADCD9602AA0F66F3FC1C4894348D`, pero no
llegó a crear una toma: Chromium arrancaba la página y la edición concurrente
de UI producía `TypeError` por leer un valor undefined en `cell` al procesar `paint` en `startup.json`. No se usa
ese fallo para atribuir un defecto a la fauna.

Para obtener evidencia reproducible se usó el bundle de control ya existente
`artifacts/graphics/G-24-ford/game/valley.html`, SHA-256
`EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`.
No se ejecutó `animals-preview.mjs` ni se reconstruyó el bundle OBS-01.

## Comandos y salidas

```powershell
node tools/graphics/observe-life.mjs --page artifacts/graphics/G-24-ford/game/valley.html --seed 43 --year 60 --lead 55 --seconds 15 --fps 2 --out artifacts/graphics/OBS-01/animals/seed43-y60-route-g24
node tools/graphics/observe-life.mjs --page artifacts/graphics/G-24-ford/game/valley.html --seed 11 --year 20 --lead 55 --seconds 15 --fps 2 --out artifacts/graphics/OBS-01/animals/seed11-y20-route-g24
node tools/graphics/observe-life.mjs --page artifacts/graphics/G-24-ford/game/valley.html --seed 11 --year 20 --lead 55 --seconds 4 --fps 15 --follow 10000 --zoom 0.18 --out artifacts/graphics/OBS-01/animals/seed11-y20-follow-hen-g24
node tools/graphics/observe-life.mjs --page artifacts/graphics/G-24-ford/game/valley.html --seed 11 --year 20 --lead 55 --seconds 4 --fps 15 --follow 10001 --zoom 0.18 --out artifacts/graphics/OBS-01/animals/seed11-y20-follow-fish-g24
```

Las cuatro salidas tienen `errors: []`, `meshDrift: 0`,
`peopleMeshDrift: 0`, `penetratingCircles: 0`, `penetratingBeasts: 0` y
`blockedCentres: 0`. En modo fijo `firstTick == lastTick` es esperado: la
partida no avanza; se midió la capa escénica real a 30 Hz.

## Catálogo realmente observado

| especie / fuente | ids observados | toma | cobertura |
|---|---:|---|---|
| gallina, cuerpo de fauna | `10000` | seed11/año20, 15 fps | evaluada |
| pez, fauna ambiental | `10000–10003` en seed43; `10001–10003` en seed11 | ambas rutas y seguimiento `10001` | presencia; no se equipara a cuerpo físico ni a su contador de penetración |
| vaca | — | ninguna | no evaluada |
| cerdo | — | ninguna | no evaluada |
| lobo | — | ninguna | no evaluada |
| cuervo | — | ninguna | no evaluada |

La gallina `10000` aparece en seed11/año20 con `doing: peck`, `scratch` y
`pause`; su reacción queda sin compromiso (`stage/commitment: null`). La traza no demuestra por sí sola que cada intención sea un clip de huesos distinto. En la
toma de seguimiento cambia de posición de forma continua al principio
(`t=0`, x=32.627/z=62.205; `t=0.4`, x=32.596/z=62.155), queda en reposo
brevemente y después pasa a `scratch` (`t=0.6`). Los peces están en
`renderedAnimals`, no en `beasts`: se registran como fauna ambiental y no se
usan como prueba de cuerpo navegable, encuentro o animación de marcha.

## Hallazgos

| id | esperado | observado | evidencia PNG / tiempo | confianza |
|---|---|---|---|---|
| ANI-01 | La gallina mantiene estados de actividad/reposo y posición coherentes. | Confirmado para la única gallina observada: la traza alterna intenciones `peck → pause → scratch` y el cuerpo cambia de posición; esto no certifica clips de huesos distintos. No hay `reaction` comprometida. | `seed11-y20-follow-hen-g24/frames/0000.png`, `0001.png`, `0010.png`; 0.0–0.667 s, 15 fps. Revisados visualmente consecutivos. | Media-alta para presencia/posición de `hen`; no poblacional ni prueba de articulación fina. |
| ANI-02 | Un seguimiento a 15 fps permite juzgar movimiento y articulación. | Parcial: la gallina cambia de posición y su clip alterna actividad/reposo; el cuerpo es pequeño en el encuadre, por lo que la articulación fina sólo queda parcialmente visible. | `seed11-y20-follow-hen-g24`, 61 PNG, 0–4 s; además `summary.json` sin anomalías. | Media-alta. |
| ANI-03 | La fauna ambiental no debe denunciarse como cuerpo físico sin contrato equivalente. | Confirmado: peces `10000–10003`/`10001–10003` aparecen como `renderedAnimals`; no se aplica el contador físico de penetración. No se observó cuervo. | `seed43-y60-route-g24`, `seed11-y20-route-g24`; peces visibles en traza; `seed11-y20-follow-fish-g24/frames/0000.png` y `0001.png` revisados consecutivamente. | Alta para clasificación; baja para conducta del pez porque no hay `beasts`/clip de cuerpo. |
| ANI-04 | Las especies presentes deben poder auditarse sin inventar cobertura. | Sólo `hen` y `fish` aparecen en estas tomas. Vaca, cerdo, lobo y cuervo quedan sin evaluación. | `trace.json` de ambas rutas y seguimientos; ningún id de esas especies. | Alta. |
| ANI-05 | No hay penetración ni deriva de malla en muestras observadas para cuerpos con contrato físico. | Para la gallina y los aldeanos, cero en las tomas: `penetratingBeasts=0`, `meshDrift=0`, `peopleMeshDrift=0`, `penetratingCircles=0`, `blockedCentres=0`. Este contador no cubre los peces ambientales. | `summary.json` de cada salida. | Alta para los fotogramas muestreados; no es garantía entre muestras. |
| ANI-06 | La fauna debe intervenir en encuentros sólo si hay contrato y evidencia visual. | No se observó encuentro animal ni `reaction` comprometida; las interacciones contabilizadas son de aldeanos. | `interactions` de rutas (seed43 hasta 46 iniciadas/43 completadas; seed11 35/35) y `beasts[].reaction`; sin participante animal. | Alta para estas tomas. |

## Lectura visual y límites

Se inspeccionaron PNG consecutivos de la gallina (`0000`, `0001`, `0010`) y
del pez (`0000`, `0001`) mediante el visor de imagen, además de la traza y los
resúmenes. La gallina es visible en el terreno y su posición cambia entre
fotogramas; el pez no debe interpretarse como cuerpo de vida seguido. Las
capturas de 2 fps sirven para rutas/estado y las de 15 fps para la transición
de la gallina, pero no hubo vaca, cerdo, lobo ni cuervo en las semillas/años
solicitados. Tampoco se afirma cobertura de encuentros, reproducción,
colisiones entre animales o conducta del pez/cuervo. La evidencia se limita al
bundle G-24 de control por el fallo de arranque del bundle OBS-01 durante la
edición concurrente.
