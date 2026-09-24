# P-1b.1 · Avance cooperativo del preset

**Cierre local:** 22 sep 2026. Se acepta el candidato para la demora del clic
de entrada. P-1a general sigue pendiente de identificar la interacción en la
que Vera observó INP de 912–1.144 ms.

## Cambio

El menú prepara el año pedido en grupos de ocho semanas y cede el hilo al
navegador entre grupos. La política y `run` del motor son los mismos. La
portada mantiene «Founding…» hasta `boot`, con un cuadro pintado antes de
empezar. `openAtYear` síncrono permanece para rutas de diagnóstico; no se
tocaron `src/engine/` ni guardados intermedios.

La prueba focal en jornadas comparó `JSON.stringify(GameState)` entre ambas
rutas: semilla 11/año 21 y semilla 31/año 41, que termina antes de lo pedido
(tick 1257). Los estados completos coincidieron byte a byte. Typecheck,
ESLint focal y `git diff --check` pasaron.

## Comparación autorizada

Vera autorizó las órdenes frías y calientes de P-1a.2. Sus intentos desde
`C:\Users\mvera` no encontraron el archivo y terminaron antes de abrir la app;
se ejecutaron desde el proyecto. Edge 153.0.4234.48 visible, 390 × 844,
DPR 2, calidad `standard`, día despejado, fase 0,3800, preset real semilla
11/año visible 21. Tres réplicas frías y tres calientes, con perfil CPU de
entrada, diez segundos de cadencia tras cinco de estabilización y seis clics
posteriores por réplica. Las seis muestras candidatas mostraron 48 habitantes,
seis `interactionId` posteriores y ningún error de página.

| Caché | Clic de entrada, base → candidato | Hasta 3D utilizable, base → candidato | Máximo de clics posteriores, base → candidato | RAF p95 |
|---|---:|---:|---:|---:|
| Fría (3) | 536–872 ms → 16 ms o sin entrada ≥16 ms | mediana 1.212 → 1.810 ms | 24–40 → 24–40 ms | 7,0 ms en ambas |
| Caliente (3) | 528–552 ms → 16 ms o sin entrada ≥16 ms | mediana 1.159 → 1.738 ms | 24–48 → 24–48 ms | ~7,0 ms en ambas |

Datos crudos:

- Base fría: `artifacts/graphics/P-1a-app/2026-09-22T13-31-31-069Z-00/run.json`.
- Base caliente: `artifacts/graphics/P-1a-app/2026-09-22T13-34-01-487Z-00/run.json`.
- Candidato frío: `artifacts/graphics/P-1a-app/2026-09-22T13-52-55-147Z-00/run.json`.
- Candidato caliente: `artifacts/graphics/P-1a-app/2026-09-22T13-54-05-939Z-00/run.json`.

El observador pidió Event Timing con umbral de 16 ms. En dos réplicas
candidatas hubo entrada del clic de 16 ms; en las otras cuatro no se registró
una entrada del clic con ese umbral. Eso acredita una caída clara frente a los
528–872 ms de base, pero **no mide INP** ni permite asignar cero milisegundos
a los cuatro clics sin entrada. El perfil CPU añade sobrecoste a ambos lados.

La tarea continua de simulación de ~0,5 s desapareció. El 3D mantiene una
tarea de ~314–337 ms en cinco réplicas candidatas, y la primera fría añadió
inicialización WebGL de 580 ms. El tiempo hasta 3D utilizable **subió** unos
0,6 s en la mediana de ambas cachés, por los turnos cedidos al navegador. Es
el coste de permitir respuesta y pintura durante la preparación. No se midió
GPU ni dispositivo móvil.

## Decisión y siguiente paso

El criterio de P-1b.1 se cumple en la ruta medida: el clic responde mucho
antes, el estado final es idéntico y no aparece un coste nuevo en los clics
posteriores ni en p95 de cadencia. Se conserva el candidato y se declara la
demora adicional de carga. P-1b.2, si se abre, debe atacar la tarea de montaje
3D sin retocar el motor ni la lluvia por intuición. La observación de INP de
Vera requiere aún el control y momento concretos para compararla.

No hubo commit, push ni cambios en Blender. Los cambios locales ajenos se
conservaron.
