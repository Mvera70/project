# P-1a · Línea de base parcial — semilla 11, año visible 21

**Fecha:** 22 sep 2026. **Commit base:** `817fea64d5f07f8c2d02a4bc6398e5ba592e9ee7`.

## Qué se midió

El modo `--suite p1` del banco abre `foundGame(11)` y ejecuta exactamente veinte
años con la política `prudent`, igual que U-10b para mostrar el año 21. Las dos
condiciones parten del mismo `GameState` (48 habitantes, 22 edificios, mismo día
derivado); sólo cambia la fase de `GraphicsFrame`: 0,28 (día) o 0,85 (noche).
La vida sigue activa a ×1 durante cada muestra. No se escribe motor, guardado ni
estado de la partida.

El cielo real de ese día es `rain`. Por tanto estas cifras **no son** una
comparación despejado/lluvia ni demuestran que llueva peor: son día lluvioso
contra noche lluviosa sobre el preset real. La ruta actual no permite fijar
simultáneamente cielo y hora en la app real sin un control diagnóstico adicional.

## Entorno y datos crudos

- Navegador: HeadlessChrome 153.0.0.0, Playwright; no Edge interactivo.
- GPU: ANGLE / NVIDIA GeForce RTX 4080 / D3D11; 28 núcleos declarados.
- Viewport: 390 × 844 CSS px, DPR 2, calidad `standard`.
- Duración: 4 s por condición, tres ejecuciones independientes; sin captura ni
  filmación durante la cadencia.
- JSON crudos, sin sobrescribir: `artifacts/graphics/P-1a/2026-09-22T10-40-01-843Z/`,
  `artifacts/graphics/P-1a/2026-09-22T10-40-18-740Z/` y
  `artifacts/graphics/P-1a/2026-09-22T10-40-35-649Z/`.

## Resultados

Valores por condición: mediana entre las tres corridas; rango entre corchetes.

| Condición | CPU/frame p50 ms | p95 ms | p99 ms | Cadencia | Draw calls / triángulos |
|---|---:|---:|---:|---:|---:|
| Día, lluvia real | 4,8 [4,7–4,9] | 8,7 [6,3–9,3] | 10,7 [9,0–11,2] | 145 fps | 473 / 572.454 |
| Noche, lluvia real | 2,7 [2,7–3,0] | 4,8 [4,6–6,2] | 6,6 [6,3–7,3] | 145 fps | 464 / 567.636 |

La primera instancia del renderer tardó 185–244 ms (mediana 225 ms) y la segunda
instancia de la misma sesión 117–144 ms (mediana 129 ms); los recursos observados
suman 11.242 KB. Esto **no** equivale a caché fría/caliente de navegador: cada
corredor inicia una sesión nueva y no mide parseo persistente, texturas ni GPU de
una visita real. No hubo errores de página en los JSON.

## Límites de la primera sonda

No se midieron INP, tarea larga, interacción UI, tiempo GPU, Edge real, móvil ni
carga fría/caliente de perfil. El banco llama al renderer y por diseño no ejecuta
el bucle de `src/ui/app.ts`; el INP 912–1.144 ms observado por Vera sigue sin
atribución. Tampoco hay condición despejada ni comparación controlada de lluvia.

En ese punto faltaba instrumentar la aplicación real en Edge con una ruta
diagnóstica sólo local que fijara hora y clima sin persistirlos y capturara
interacción repetible y tareas largas. Las corridas posteriores figuran abajo.

## Primera corrida de la aplicación real · Edge headless

Ejecutada el 22 sep 2026 con autorización de Vera:
`npx tsx tools/graphics/bench-app.ts --repeats 3 --cache cold --seconds 10`.
Los datos crudos están en
`artifacts/graphics/P-1a-app/2026-09-22T12-37-09-121Z-00/run.json` y no
sobrescriben las medidas del renderer. Commit base
`817fea64d5f07f8c2d02a4bc6398e5ba592e9ee7`, con cambios locales sin
commit. Edge 153.0.4234.48 en modo headless, PC-MVERA, Windows
10.0.26200.6899, viewport 390 × 844 y DPR 2. Se creó un contexto nuevo por
réplica: «fría» describe la caché del contexto, no la del sistema operativo ni
el coste de un proceso de navegador recién abierto para cada visita. La calidad
gráfica efectiva no quedó registrada. No hubo capturas durante la cadencia.

Las tres réplicas abrieron desde el menú de Desarrollo el preset real de
semilla 11/año visible 21, con 48 habitantes, `sky=rain` y fase solar observada
0,372–0,379 (día). Por tanto la corrida **no compara clima ni hora**.

| Réplica | Hasta app ready | Hasta 3D utilizable | Frame p50 / p95 / p99 | Rueda → RAF p50 / p95 | Tareas largas de carga | Event Timing, clic de entrada |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 549 ms | 1.967 ms | 6,9 / 7,0 / 13,9 ms | 5,3 / 5,9 ms | 498 y 661 ms | 832 ms |
| 2 | 504 ms | 1.125 ms | 6,9 / 7,0 / 7,1 ms | 5,4 / 6,0 ms | 487 y 306 ms | 504 ms |
| 3 | 502 ms | 1.146 ms | 6,9 / 7,0 / 7,1 ms | 5,2 / 5,6 ms | 484 y 308 ms | 504 ms |

Cada cadencia duró diez segundos y reunió 1.419–1.437 intervalos de RAF. La
sonda de rueda recoge ocho eventos por réplica; mide hasta el siguiente RAF,
**no INP**. Event Timing atribuye el clic de entrada a una interacción, pero
su duración tampoco es una medición de INP de la sesión. El procesamiento del
clic fue inferior a 1 ms en estas entradas; el retraso registrado corresponde
al tiempo hasta la siguiente presentación y coincide con el tramo de carga.
No hubo errores de página. No se midieron tiempo de GPU, memoria, perfil de CPU,
draw calls ni triángulos en la app; tampoco Edge interactivo ni dispositivo
móvil. Estas cifras no identifican el cuello de botella de la lluvia nocturna.

El runner falló inicialmente antes de tomar muestras porque `tsx` insertó
`__name` en el script de Playwright; se corrigió su inicialización y la corrida
completa terminó con código de salida 0. `npm run typecheck` y ESLint focal del
runner pasaron. En esa primera corrida P-1a seguía abierta para controles
diagnósticos de clima/hora, condiciones comparables y una medida separada de
respuesta real/INP.

## Comparación controlada de la aplicación real · Edge headless

Vera autorizó la corrida y pidió ejecutarla desde The Valley después de
intentarla desde otro proyecto. Orden:
`npx tsx tools/graphics/bench-app.ts --condition all --repeats 3 --cache cold
--seconds 10 --settle-seconds 5`. Datos crudos, sin pisar la línea anterior:
`artifacts/graphics/P-1a-app/2026-09-22T13-12-06-413Z-00/run.json`.
Commit base `817fea64d5f07f8c2d02a4bc6398e5ba592e9ee7`, con cambios locales
sin commit. Edge 153.0.4234.48 headless, PC-MVERA, viewport 390 × 844, DPR 2,
calidad `standard`. Nueve contextos nuevos, diez segundos de cadencia por
réplica y cinco de estabilización previos; orden rotado para repartir el
calentamiento. «Caché fría» significa contexto nuevo, no sistema operativo o
proceso Edge recién arrancado en cada réplica.

Cada condición abrió el mismo preset real: año 21, primavera día 1, 48
habitantes. El runner comprobó `sky=clear` y fase 0,3800 de día, `sky=clear` y
0,8500 de noche, y `sky=rain` y 0,8500 en noche lluviosa. El override vive sólo
en la presentación local; no cambia el clima del motor, la partida ni el
guardado. La lluvia usa la intensidad derivada de ese día, que ya era lluvioso.

Mediana de tres réplicas; rango entre corchetes:

| Condición | Hasta 3D utilizable | Intervalo RAF p50 / p95 / p99 | Rueda → RAF p95 | Event Timing del clic de entrada |
|---|---:|---:|---:|---:|
| Día despejado | 1.108 ms [1.101–1.689] | 6,9 / 7,0 / 7,1 ms* | 5,6 ms [5,4–5,6] | 488 ms [480–792] |
| Noche despejada | 1.119 ms [1.113–1.133] | 6,9 / 7,0 / 7,1 ms | 2,2 ms [2,0–2,3] | 488 ms [488–504] |
| Noche lluviosa | 1.119 ms [1.105–1.153] | 6,9 / 7,0 / 7,1 ms | 2,4 ms [2,4–2,9] | 496 ms [488–504] |

\* La primera réplica de día despejado dio p99 13,9 ms; las otras dos, 7,1 ms.
La primera tuvo además tres tareas largas de entrada (477, 197 y 552 ms),
frente a dos en cada otra réplica (aprox. 465–488 y 300–314 ms). Sus marcas
temporales caen antes de la ventana estabilizada. No hubo errores de página.

**Lectura.** La lluvia nocturna no elevó de forma consistente p95/p99 ni las
tareas largas frente a la noche despejada en esta app y equipo. No se justifica
retocar el efecto de lluvia por esta medida. La demora más visible está en la
entrada: el clic dura 480–792 ms en Event Timing y coincide con tareas largas
de carga, pero esta señal no identifica la función que las causa ni sustituye
el INP real. La latencia rueda → RAF es sintética y tampoco es INP. El intervalo
RAF se aproxima al refresco de este entorno; no mide tiempo de GPU. Quedan sin
medir Edge interactivo, INP, GPU, móvil, caché caliente y un perfil de CPU de
la carga. P-1a sigue abierta para atribuir la entrada y medir respuesta real.

## Entrada y respuesta posterior · Edge visible

Vera autorizó dos órdenes desde este proyecto, una fría y otra caliente:
`npx tsx tools/graphics/bench-app.ts --condition day-clear --repeats 3 --cache
cold --seconds 10 --settle-seconds 5 --profile-load true --headed true` y la
misma orden con `--cache warm`. Datos brutos y perfiles CPU:
`artifacts/graphics/P-1a-app/2026-09-22T13-31-31-069Z-00/run.json` y
`artifacts/graphics/P-1a-app/2026-09-22T13-34-01-487Z-00/run.json`.
Edge 153.0.4234.48 visible, 390 × 844, DPR 2, `standard`, día despejado
con fase 0,3800. Las seis réplicas abrieron año 21 con 48 habitantes y cero
errores. La primera tentativa caliente falló en el menú antes de medir por una
preferencia persistente; el runner se corrigió y la orden se repitió sin
modificar la aplicación.

| Caché | Hasta 3D utilizable | Clic de entrada en Event Timing | Máximo de seis clics con la app abierta | RAF p95/p99 |
|---|---:|---:|---:|---:|
| Fría, tres réplicas | 1.198–1.874 ms | 536–872 ms | 24–40 ms | 7,0/7,1 ms |
| Caliente, tres réplicas | 1.146–1.170 ms | 528–552 ms | 24–48 ms | 7,0/7,1 ms |

El perfil atribuye la primera tarea larga de entrada, 505–531 ms también en
caliente, al avance síncrono de 20 años con `run` en el hilo principal. La
segunda coincide con la construcción 3D y primer uso de Three/WebGL. Hay
[informe de atribución y límites](../historico/graphics-rounds/P-1a2-entrada-y-respuesta.md).
Event Timing no es el INP del navegador; éste sigue sin medirse. El coste de
perfilar afecta al tiempo de entrada, y la tarea de unos 0,5 s no equivale por
sí sola a medio segundo de CPU de una única función. La interacción posterior
probada fue el botón de vista despejada; falta conocer el control exacto en el
que Vera vio INP de 912–1.144 ms.
