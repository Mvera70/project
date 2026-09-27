# Auditoría de la ronda de agentes — 17 de septiembre de 2026

## Alcance

La rama de revisión completa (`codex/valley-next-review`, `c5581fa5`) partía de
una versión anterior del juego. Integrarla entera eliminaría pruebas y cambios
posteriores de `main`, entre ellos el resaltado y el anillo de selección de
VZ-5. Por eso la integración se ha rehecho desde `main` (`c17faf75`) y sólo se
han trasladado piezas verificables.

## Piezas aceptadas

- **Índice de evidencias.** `tools/graphics/evidence-index.mjs` reúne los
  metadatos de observaciones sin copiar capturas. Incluye seis pruebas de
  contrato y casos de error.
- **Contrato de observación.** La referencia de la skill documenta
  `--advance` y distingue el reloj base del instante observado.
- **Vado.** Las losas rotan alrededor del centro de su celda. Dos pruebas, una
  con geometría asimétrica y otra con el GLB real, comprueban las cuatro
  orientaciones y sus límites.
- **Animaciones procedurales.** Las pruebas validan sobre el aldeano real que
  cada clip tiene respaldo exportado o generado, pistas finitas y huesos
  existentes, y que `idle` no se altera.

Los cambios de prueba se han aplicado encima de los actuales para conservar
la cobertura de VZ-5.

## Material que no se integra

P0, P2, P3, P6 y P7 aportaron observaciones e informes útiles, pero no cambios
de producto listos para incorporar. Sus evidencias permanecen en la rama de
revisión y no se copian a `main`.

Tampoco se integran como soluciones cerradas estos hallazgos:

- el zoom del observatorio aún no permite evaluar bien la articulación animal;
- una recolección larga puede interrumpirse al llegar la noche;
- la cantera no presenta un cierre visual completo;
- la cobertura de especies observadas sigue incompleta;
- el vado necesita una lámina de agua coherente con el resto del río.

## Validación

- Pruebas dirigidas: **65/65** correctas.
- TypeScript: correcto.
- ESLint: correcto.
- Build de producción: correcto.
- Suite rápida completa: **1395 correctas, 2 fallos**.
- Jornadas: **122 correctas, 8 fallos**.

Los dos fallos se reproducen sin cambios en `main`: el umbral de cobertura de
capilla para la semilla 23 (`20/39`) y el mínimo de hitos visibles para la
semilla 999 (`18`). No son regresiones de esta selección.

Las ocho jornadas rojas coinciden en número y caso con la auditoría P7 de la
ronda original: frecuencia de avisos, visita a la pradera, rendimiento y aforo,
sesgo de tala, separación persona-animal y dos contratos de trastos. Ninguno
recorre los componentes incorporados por esta selección.

## Decisión

La selección es válida como candidata de integración. La rama de revisión
completa no debe fusionarse; sólo debe conservarse como archivo de evidencias.
