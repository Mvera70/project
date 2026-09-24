# P-1a.2 · Entrada y respuesta con Edge visible

**Cierre local:** 22 sep 2026. La ruta medida queda atribuida; P-1a general
sigue abierta para el INP de la interacción concreta que observó Vera.

## Método y datos

Con autorización explícita, `bench-app.ts` abrió el preset real semilla 11/año
visible 21 en Edge 153.0.4234.48 **visible**, 390 × 844, DPR 2 y calidad
`standard`. Se fijó sólo la presentación en día despejado. Se hicieron tres
réplicas con contexto nuevo y tres con contexto previamente visitado; caché
«fría» no significa sistema operativo frío. Cada réplica conservó perfil CPU
desde antes del clic hasta 3D utilizable, diez segundos de cadencia sin perfil
tras cinco de estabilización y seis clics reales del botón de vista despejada.
Los seis casos mostraron año 21, 48 habitantes, cielo despejado, fase solar
0,3800 y cero errores de página.

Datos crudos, incluidos perfiles CPU y Event Timing:

- Fría: `artifacts/graphics/P-1a-app/2026-09-22T13-31-31-069Z-00/run.json`.
- Caliente: `artifacts/graphics/P-1a-app/2026-09-22T13-34-01-487Z-00/run.json`.

Una primera tentativa caliente falló **antes de medir**: la preferencia
«Desarrollo» persistía tras preparar el contexto y el runner volvía a pulsar
su interruptor, ocultando los presets. Se corrigió `openPreset` para abrirlo
sólo cuando está cerrado y se repitió la misma orden autorizada. La tentativa
fallida no produjo `run.json`; se conserva su directorio vacío.

| Caché | Réplica | Clic preset, Event Timing | Hasta app ready | Hasta 3D utilizable | Tareas largas de entrada | Máximo de 6 clics posteriores |
|---|---:|---:|---:|---:|---|---:|
| Fría | 1 | 872 ms | 665 ms | 1.874 ms | 520, 239, 548 ms | 40 ms |
| Fría | 2 | 536 ms | 527 ms | 1.212 ms | 513, 329, 61 ms | 24 ms |
| Fría | 3 | 544 ms | 536 ms | 1.198 ms | 521, 329 ms | 24 ms |
| Caliente | 1 | 528 ms | 522 ms | 1.146 ms | 505, 323 ms | 48 ms |
| Caliente | 2 | 528 ms | 525 ms | 1.159 ms | 510, 344 ms | 24 ms |
| Caliente | 3 | 552 ms | 551 ms | 1.170 ms | 531, 323 ms | 24 ms |

RAF p95 fue 7,0 ms en las seis muestras; p99, 7,1 ms. La sonda de rueda→RAF
permanece separada y es sintética. Edge expuso seis `interactionId` por réplica
para los clics posteriores; sus duraciones individuales fueron 16–48 ms. El
observador solicitó umbral de 16 ms, así que un evento inferior podría faltar.
**No se midió INP del navegador**, ni GPU ni un móvil real. El perfil de CPU
añade sobrecoste a la entrada; las cifras de entrada con perfil no se comparan
como si fueran idénticas a las tandas previas sin perfil.

## Atribución y límite

La primera tarea larga aparece justo después del clic y coincide con
`openAtYear(state, 21)`: éste llama a `run` durante 20 años de semanas de
simulación en el hilo principal. En los perfiles, el primer tramo concentra
muestras en `src/engine/`, especialmente colocación, mapa de paso y condiciones
de encrucijadas. Esa tarea persiste con caché caliente (505–531 ms), por lo
que no es una descarga de recursos. El segundo tramo coincide con el montaje
3D y reúne muestras de `src/render3d/` y de Three.js, incluido `onFirstUse` de
programas WebGL. La primera réplica fría añade inicialización de contexto y
compilación más costosas. Son categorías sustentadas por las marcas, tareas
largas y perfiles muestreados; el perfil no reparte milisegundos exactos por
función ni mide el trabajo interno de la GPU.

La duración elevada del clic **de entrada** sí se reproduce, hasta 872 ms en
esta tanda. La interacción elegida con la partida abierta no reproduce una
demora cercana a 900 ms. Esto acota el resultado al botón de vista despejada:
no descarta otra interacción lenta ni convierte Event Timing en INP. Para
resolver la observación original de Vera hace falta saber qué control pulsó y
en qué momento del juego apareció el INP de 912–1.144 ms.

## Puerta y siguiente fase

La atribución del camino medido cierra P-1a.2. Typecheck, ESLint focal y
`git diff --check` pasaron. No se alteraron motor, guardados ni escena Blender;
no hubo commit ni push. P-1b.1 puede atacar la primera tarea de unos 0,5 s:
avanzar el preset en trozos con cesiones al navegador y una indicación visible,
exigiendo que el estado final sea byte a byte igual al avance síncrono y que
Event Timing de entrada mejore en réplicas equivalentes. La compilación 3D
queda como candidato posterior, con límite de dos candidatos en P-1b.
