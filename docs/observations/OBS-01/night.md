# OBS-01 · noche, puertas y rutas

Fecha: 2026-09-17. Alcance: vida nocturna en renderer 3D real, puertas domésticas, colas de entrada/salida y atascos. No se modifica `src/`, tests, skills ni `docs/task-log.md`.

## Artefacto y reproducibilidad

El bundle fijo pedido para OBS-01 fue `artifacts/graphics/OBS-01/game/valley.html`, SHA-256 `5ACF3BBF46F435F2C9E3FFD5D2F13E6473E1ADCD9602AA0F66F3FC1C4894348D`. El observatorio no pudo arrancarlo: tras pulsar New Valley no expuso personas y terminó en `page.waitForFunction` (línea 42) tras 30 s. El diagnóstico de coordinación identifica un `TypeError` al pintar el HUD (`cell` indefinido) durante la edición concurrente de UI. No se atribuye este bloqueo al motor de vida ni se reconstruyó el bundle.

Para obtener evidencia reproducible se usó exclusivamente el control anterior `artifacts/graphics/G-24-ford/game/valley.html`, SHA-256 `EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`. Chromium se ejecutó con ANGLE/SwiftShader mediante autorización elevada.

## Tomas

```powershell
node tools/graphics/observe-life.mjs --live --speed 64 --seed 7 --year 1 --seconds 42 --fps 2 --out artifacts/graphics/OBS-01/night/control-g24-seed7 --page artifacts/graphics/G-24-ford/game/valley.html
node tools/graphics/observe-life.mjs --live --speed 64 --seed 43 --year 60 --seconds 42 --fps 2 --out artifacts/graphics/OBS-01/night/control-g24-seed43 --page artifacts/graphics/G-24-ford/game/valley.html
node tools/graphics/observe-life.mjs --live --speed 64 --seed 43 --year 60 --seconds 6 --fps 15 --follow 155 --zoom 0.18 --out artifacts/graphics/OBS-01/night/control-g24-seed43-follow155 --page artifacts/graphics/G-24-ford/game/valley.html
```

Las dos tomas largas terminaron con `errors: 0`. Seed 7/año 1 muestrea 2 personas y 3 animales, `firstTick=0`, `lastTick=3`; seed 43/año 60 muestrea 36 personas, `firstTick=2832`, `lastTick=2835`. Por tanto `lastTick > firstTick` en ambos casos y el motor vivo avanzó.

| toma | noches observadas | resultado final del amanecer | pendientes | anomalías |
|---|---:|---|---|---|
| seed 7 / year 1 | 22 | 22/22 amaneceres completos, 2/2 durmiendo | ninguno | mesh 0, people mesh 0, círculos 0, animales 0, centros bloqueados 0 |
| seed 43 / year 60 | 22 | 21/22 amaneceres completos; uno queda en 31/32 durmiendo | `155` pendiente en el amanecer del tick 2834 | mesh 0, people mesh 0, círculos 0, animales 0, centros bloqueados 0 |

En seed 43 hay cuatro personas `no-home`; no se cuentan como fallo según el contrato. El id `155` aparece como `pending` en el resultado del amanecer del tick 2834 (aproximadamente 35 s, frame 0070, fase 0.943), con etapa `returning` y ruta rodeando un edificio (`x=34.766, z=53.612`). Ese amanecer queda incompleto: 31/32 residentes con casa durmiendo. La toma sigue mostrando que el id continúa y acaba entrando en observaciones posteriores, pero eso no convierte el amanecer 2834 en completo. Es una reentrada tardía medida y una sospecha de atasco puntual, no una prueba de teletransporte.

## NGT-01–04

| ID | esperado | observado | tiempo / ids / PNG | confianza |
|---|---|---|---|---|
| NGT-01 · motor vivo | ticks que avanzan | seed 7: 0→3; seed 43: 2832→2835 | 42 s, 2 fps; summaries | confirmado |
| NGT-02 · regreso nocturno | residentes con casa terminan `sleeping` | seed 7: 22/22 amaneceres completos, 2/2; seed 43: 21/22, con 31/32 en tick 2834 y `pending=[155]` | summaries de ambas tomas | confirmado en seed 7; **fallo confirmado** de regreso en una noche de seed 43; causa pendiente |
| NGT-03 · puertas y cola | etapas `returning/opening/entering/sleeping/leaving` sin salto falso | `155`: `returning→sleeping→day`, y otra noche `returning→sleeping→leaving→day`; seed 43 muestra `opening`/`entering` en ids 79/130 | seguimiento 6 s a 15 fps; PNG `0000.png`, `0010.png`, `0050.png` | confirmado visualmente para la secuencia; hoja exacta no se distingue en todos los PNG |
| NGT-04 · rutas/atascos | rutas progresan, sin teleport ni penetración | `blockedCentres=0`, penetraciones 0, drift 0; `155` conserva rodeo y llega a dormir | PNG `0000.png`, `0001.png`, `0020.png`; seguimiento focalizado | confirmado para estas muestras; no prueba todo el catálogo de sólidos |

## Inspección visual

Se revisaron PNG consecutivos de la toma densa: `0000.png` y `0001.png` muestran el valle bajo lluvia y el cambio de posiciones/rutas; `0020.png` muestra la escena posterior sin cuerpos pegados a sólidos. En el seguimiento a 15 fps de `155` se revisaron `0000.png`, `0010.png` y `0050.png`: la cámara sigue al cuerpo por el caserío y las puertas/umbrales permanecen en la escena; no se observa ocultación ni salto espacial. Los contadores físicos no se usan para inferir geometría visual.

## Conclusión y límites

**Nota de auditoría del coordinador:** el seguimiento de 6 s empieza sin `lead`
y conserva el tick 2832. Sus entradas completas son de noches anteriores al
fallo de tick 2834, no una reproducción ni una reparación de éste. El resultado
31/32 está confirmado; que su causa sea un atasco puntual sigue siendo hipótesis.
NGT-03 acredita etapas y una selección visual, no cada articulación de la hoja;
NGT-04 no certifica ausencia de atascos en toda la toma ni entre muestras.

NGT-01 queda confirmado en el control G-24. NGT-02 queda confirmado para seed 7, pero **fallo confirmado de regreso** para una noche de seed 43: 21/22 amaneceres completos y el amanecer 2834 deja `155` pendiente. NGT-03 y NGT-04 quedan confirmados en las muestras visuales y físicas, con esa sospecha puntual de retorno tardío. No se declara teletransporte por la diferencia entre muestras a ×64: son muchos pasos internos por muestra y la traza conserva el estado `returning` y el rodeo. El bundle fijo OBS-01 queda **no observado/bloqueado por arranque** durante la edición concurrente de UI; estas cifras no deben presentarse como validación de ese bundle hasta repetir la misma matriz sobre un bundle arrancable.

