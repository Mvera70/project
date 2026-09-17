# OBS-01 · Auditoría diurna

Fecha: 2026-09-17. El bundle solicitado `artifacts/graphics/OBS-01/game/valley.html` no pudo arrancar el observatorio: ambas tomas agotaron `page.waitForFunction` en `observe-life.mjs:42` porque la función `window.__valleyLife` existe, pero su resultado no llegó a contener personas. La captura diagnóstica del mismo bundle sí abrió la pantalla, pero registró `TypeError: Cannot read properties of undefined (reading 'cell')`; queda en [startup.json](../../../artifacts/graphics/OBS-01/day/startup.json) y [shot-check.png](../../../artifacts/graphics/OBS-01/day/shot-check.png). No se atribuye el fallo al código actual: el bundle se preparó durante edición concurrente de UI.

Se conservan los comandos pedidos:

```powershell
node tools/graphics/observe-life.mjs --seed 11 --year 20 --lead 0 --seconds 45 --fps 2 --page artifacts/graphics/OBS-01/game/valley.html --out artifacts/graphics/OBS-01/day/seed11-year20
node tools/graphics/observe-life.mjs --seed 43 --year 60 --lead 0 --seconds 45 --fps 2 --page artifacts/graphics/OBS-01/game/valley.html --out artifacts/graphics/OBS-01/day/seed43-year60
```

La primera ejecución sandboxed falló al leer `C:\Users\mvera\AppData\Local\ms-playwright` (`EPERM`); se reintentaron los mismos comandos con Chromium fuera del sandbox. Ambos terminaron después con timeout de arranque. SHA256 del bundle solicitado: `5ACF3BBF46F435F2C9E3FFD5D2F13E6473E1ADCD9602AA0F66F3FC1C4894348D`.

Para obtener evidencia observable sin reconstruir el bundle OBS-01 se usó como control separado el bundle ya publicado `artifacts/graphics/G-24-ford/game/valley.html`, SHA256 `EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`:

```powershell
node tools/graphics/observe-life.mjs --seed 11 --year 20 --lead 0 --seconds 45 --fps 2 --page artifacts/graphics/G-24-ford/game/valley.html --out artifacts/graphics/OBS-01/day/control-g24-seed11-year20
node tools/graphics/day-report.mjs artifacts/graphics/OBS-01/day/control-g24-seed11-year20/trace.json
```

El control completó 91 muestras (0–45 s), 27 personas y 1 animal; `summary.json` informa `errors` vacío, `meshDrift=0`, `peopleMeshDrift=0`, `penetratingCircles=0`, `penetratingBeasts=0` y `blockedCentres=0`. `day-report` informa 15/15 puestos alcanzados, cero trabajadores pendientes, cero charlas engañosas y cero clips incorrectos. El estado persistente queda fijo (`firstTick=lastTick=912`), por lo que esto acredita la rutina escénica diurna y no evolución del motor.

Hallazgos:

| ID | Esperado | Observado | Evidencia | Confianza |
|---|---|---|---|---|
| DAY-01 | Bundle OBS-01 arranca y permite medir trabajos, niños, ancianos, desempleados, charlas, burbujas y clips | No observado: error `undefined.cell`; `window.__valleyLife` existe, pero no devuelve personas antes de la primera muestra | [startup.json](../../../artifacts/graphics/OBS-01/day/startup.json) | confirmado |
| DAY-02 | La rutina diurna alcanza todos los puestos asignados | En control G-24: 15 asignados, 15 alcanzados, 0 pendientes | `control-g24-seed11-year20/day-report.txt`, `summary.json` | confirmado, sólo para el control |
| DAY-03 | Niños reciben ocio/juego; adultos ejercen acciones y clips coherentes | En control: 9 niños y 18 adultos; a lo largo de la traza aparecen `play` 249, `hammer` 274, `chop` 150, `work_hoe` 415, `sort` 72, `drink` 65, `sit` 73 y `talk` 154; todos los clips esperados en la muestra | `trace.json` y PNG `frames/0000.png`, `0020.png`, `0050.png`, `0090.png` | confirmado, sólo para el control |
| DAY-04 | Las charlas sólo muestran burbuja con escena válida | En control: `misleadingChat=0`; se inspeccionó burbuja visible alrededor del segundo 45 en `frames/0090.png` | `day-report.txt`, `frames/0090.png` | confirmado, sólo para el control |
| DAY-05 | Ancianos y desempleados deben poder auditarse por edad/ocupación | No observado en el bundle solicitado; el control año 20 no contiene ancianos (`age >= 60`) en la muestra inspeccionada y no se puede extrapolar a año 60 | `trace.json` del control | no observado |

Inspección visual: los cuatro PNG del control muestran continuidad de posiciones y rutas alrededor de casas, granero y vado; el último muestra una burbuja de charla. La toma es a 2 fps y no acredita la calidad de una animación fina a 15 fps. No se ejecutó una toma corta adicional porque el fallo está antes de crear la traza del bundle solicitado y los controles ya respondieron la hipótesis diurna básica.

## Segunda toma de control: seed 43, año 60

Comando:

```powershell
node tools/graphics/observe-life.mjs --seed 43 --year 60 --lead 0 --seconds 45 --fps 2 --page artifacts/graphics/G-24-ford/game/valley.html --out artifacts/graphics/OBS-01/day/control-g24-seed43-year60
node tools/graphics/day-report.mjs artifacts/graphics/OBS-01/day/control-g24-seed43-year60/trace.json
```

La toma terminó sin errores: 91 muestras, 36 personas, `firstTick=lastTick=2832`, y cero `meshDrift`, `peopleMeshDrift`, penetraciones de círculos o centros bloqueados. El informe de día da 21/21 puestos alcanzados, cero trabajadores pendientes, cero `misleadingChat` y cero `wrongClip`. La traza contiene 25 adultos y 11 niños; no hay un actor de 60 años o más en esta aldea concreta, así que el comportamiento de ancianos sigue sin observarse. Hay 18 actores sin ocupación persistente, 3 de tala y 15 de campo; ese dato no basta por sí solo para clasificar todos como desempleados.

Inspeccioné [frames/0000.png](../../../artifacts/graphics/OBS-01/day/control-g24-seed43-year60/frames/0000.png), [frames/0020.png](../../../artifacts/graphics/OBS-01/day/control-g24-seed43-year60/frames/0020.png), [frames/0050.png](../../../artifacts/graphics/OBS-01/day/control-g24-seed43-year60/frames/0050.png) y [frames/0090.png](../../../artifacts/graphics/OBS-01/day/control-g24-seed43-year60/frames/0090.png). La aldea densa conserva las casas, capilla, parcelas, vallas y río estables mientras los cuerpos cambian de posición; no vi cuerpos dentro de edificios, anclas desplazadas ni trabajadores flotando fuera de sus parcelas en esos cuatro fotogramas. `frames/0090.png` corresponde exactamente a 45 s y muestra una burbuja `chat` del id 150; la traza muestra además burbujas de los ids 136, 150, 115 y 159 entre 39 y 45 s. `day-report` no encuentra charla engañosa. Los clips observados en la traza incluyen `work_hoe` (947), `chop` (209), `sit` (235), `drink` (100), `play` (129), `pray` (55), `talk` (62), `sort` (16), `hammer` (25) y `walk` (1260), pero a 2 fps esto sólo acredita que el mixer los aplica en muestras; no acredita la calidad de sus huesos.

Hallazgos adicionales:

| ID | Esperado | Observado | Evidencia | Confianza |
|---|---|---|---|---|
| DAY-06 | Una aldea densa mantiene anclas y rutas de trabajo coherentes | No se observan desplazamientos de casas, parcelas o vallas; trabajadores visibles permanecen en el recinto productivo a lo largo de los cuatro PNG revisados | PNG 0000/0020/0050/0090 y `summary.json` de seed43 | confirmado en control |
| DAY-07 | Niños tienen ocio y los clips propios aparecen en la jornada | 11 niños en la muestra; `play` aparece 129 veces en la traza y se ven cuerpos pequeños fuera de las casas; no se siguió un id individual | `trace.json`, PNG 0020/0050 | confirmado parcialmente en control |
| DAY-08 | La charla tiene burbuja cuando la escena está activa | Burbuja visible en `frames/0090.png` (45 s), id 150; la traza registra ids 136, 150, 115 y 159 entre 39–45 s; `misleadingChat=0` | `trace.json`, PNG 0090, `day-report.txt` | confirmado en control |
| DAY-09 | Ancianos deben poder auditarse por edad y actividad | No hay actores de 60+ en seed43/year60; no observado | `trace.json` actores iniciales | no observado |
