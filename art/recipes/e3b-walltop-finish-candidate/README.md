# Acabado de piedra para la familia walltop

Seis recetas nuevas, compatibles con el pipeline de primitivas actual, derivadas de las variantes geométricas previamente medidas. Hiladas y juntas rellenas conservan exactamente los sólidos; las pequeñas almenas quedan dentro de la huella de pretil existente. No hay texturas ni GLB nuevos.

Evidencia, costes, límites y láminas: `artifacts/graphics/E3b2-candidates/walltop-finish-review-01/README.md`. Abrir `index.html` en esa carpeta para comparar la familia con el muro publicado.

`review.ts` genera y comprueba recetas; `raster.ts` produce proyecciones CPU con profundidad. `mixed-finish-spec.md` fija el acabado y contrato de color para los ocho adaptadores explícitos sin modificar sus fuentes.

El portón conserva su hoja y `mergeByMaterial: false`; no se debe aplicar una unión global que destruya el pivote. El bastión296 conserva la escalera prolongada y media unión237 de su fuente. Ninguna de estas condiciones se modifica en el pase de acabado.
