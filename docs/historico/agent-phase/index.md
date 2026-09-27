> **Archivado el 27 sep 2026** desde la rama `codex/valley-next-review`, que no
> se llegó a fusionar. La guía de la tanda es `../agent-work-phase.md` y la
> auditoría final, `../sesiones/2026-09-17-auditoria-ronda-agentes.md`. Lo que
> la auditoría aceptó —el vado, el índice de evidencias, la prueba de clips—
> entró en `main` el mismo día (e980c81). Las rutas `docs/agent-phase/…` del
> texto son las de entonces.

# Índice de la tanda

## P0

- Estado: preparado y documentado; sin implementación.
- Rama: `codex/valley-next-review`.
- Base: `141652d6e0f9c0b89881edc9faad7474a21a80fa`.
- Worktree: `C:\Users\mvera\.codex\visualizations\2026\09\16\01a0a98c-25e2-7c11-8696-e38a74e72966\valley-next-review`.
- Informe: [P0.md](P0.md).
- Bundle: `artifacts/graphics/agent-phase/base/game/valley.html`; SHA-256 `8A47FB0CC8EB38469103BEBB4B5FE1BBD2AC987E31C6C9291F21014936348737`.
- Arranque: observatorio fijo, semilla 11, año 20, 1 s a 2 fps, `--page` explícito; exit code 0, 27 personas, renderer de producción, `errors` vacío, tick 912→912.
- Límites: no se ejecutaron tests ni suites; no se modificó código; no se inició P1.

Los artefactos de P0 están fuera del seguimiento normal según las reglas del proyecto y deben conservarse junto al worktree para la revisión.

## P1

- Estado: índice verificable aplicado a la toma P0.
- Informe: [P1.md](P1.md).
- Índice: `artifacts/graphics/agent-phase/base/observation/evidence-index.json`.

## P2

- Estado: completada; tres casos ejecutados secuencialmente sobre el bundle P0 inmutable.
- Informe: [P2.md](P2.md).
- Caso A: 181 fotogramas, tick 947/semana 35, portadores 3, 4, 14, 17 y 19; sin descarga final dentro de la ventana.
- Caso B: 85 fotogramas, ticks 946→949 y semanas 34→35→36→37; entregas/cargas observadas.
- Caso C: 59 fotogramas, ticks 2064→2066; `caso ausente`, sin obra de piedra adecuada.
- Índices: `artifacts/graphics/agent-phase/P2/caso-A/seed7-harvest-long/evidence-index.json`, `artifacts/graphics/agent-phase/P2/caso-B/seed11-harvest-live/evidence-index.json`, `artifacts/graphics/agent-phase/P2/caso-C/seed11-quarry-live/evidence-index.json`.

## P3

- Estado: completada; dos noches vivas y una secuencia cercana de puerta a 15 fps.
- Informe: [P3.md](P3.md).
- Seed 7/año 1: 85 fotogramas, ticks 0→3, 22 `nightOutcomes`, 2/2 durmientes y sin pendientes.
- Seed 43/año 60: 85 fotogramas, ticks 2832→2835, 22 `nightOutcomes`; tick 2834 aparece con 32/32 durmientes y cuatro `no-home`.
- Puerta: exploración y toma cercana de 121 fotogramas cada una; id 85 completa `returning→opening→entering→sleeping`.

## P4

- Estado: pivote del vado corregido y acotado por bounds mundiales.
- Informe: [P4.md](P4.md).
- Bundle: `artifacts/graphics/agent-phase/P4/game/valley.html`; SHA-256 `F81F9B826520328637CAD30734281F4EB944610E961F4D28DC9DE43261BF34F8`.
- Evidencia: comparación semilla 7/año 1 antes/después y semilla 11/año 1, con índices en `artifacts/graphics/agent-phase/P4/`.
- Límite: no se modificó `ground.ts`; la lámina de agua sigue pendiente.

## P5

- Estado: contrato de clips exportados y procedurales separado.
- Informe: [P5.md](P5.md).
- Reproducción: la igualdad antigua fallaba con 12 clips de runtime frente a 4 exportados.
- Verificación: pruebas dirigidas 11/11, typecheck y lint correctos.

## P6

- Estado: completada; calibración aceptada para presencia/transición y matriz de seis especies cerrada con ausencias explícitas.
- Informe: [P6.md](P6.md).
- Seed 11/year20: gallina física `10000` y peces ambientales `10001–10003`.
- Seed 43/year60: sólo peces ambientales `10000–10003`; vaca, cerdo, lobo y cuervo ausentes en las dos partidas permitidas.
- Calibración: tomas `calibration-close-hen-10000` y `calibration-close-hen-10000-zoom04`, 91 frames cada una, transición `pause→peck`; articulación fina insuficiente.

## P7

- Estado: cierre documental completado; pendiente de auditoría final del coordinador.
- Informe: [P7.md](P7.md).
- Commit: `79656f5`.
- Puerta: `npm run typecheck` y `npm run lint` correctos; `npm test` y `npm run test:journeys` rojos, con fallos literales registrados en [P7.md](P7.md). No se ejecutó `test:balance`.
- Inventario: commits `38125e9`, `f48d173`, `19f649f`, `d5aa3df`, `5868592`, `d7e0b10`, `5fc0c25`, `b0a52da`, `b7736b5` y `1ff7428`; los informes P0–P6 y las rutas de código, tests y evidencia se contrastan en P7.

## Auditoría final del coordinador

- Estado: completada; rama apta para revisión, sin fusionar ni subir.
- Informe: [final-review.md](final-review.md).
- Decisión: P1, P4 y P5 aceptados; P0, P2, P3, P6 y P7 aceptados como preparación/evidencia dentro de sus límites.
