# Transiciones candidatas del adarve centrado

Dos recetas completas derivadas de fuentes existentes:

- `e3b-walltop-gate-transition-candidate.json`: recrecido de tres hiladas, tablero Y=1,02 y paso 0,70; conserva íntegra la hoja del portón ancho.
- `e3b-walltop-bastion-centered-candidate.json`: dos bocas cardinales de 0,70; conserva aparejo y escalera del bastión y resuelve los vecinos cardinales del 295.

**La salida diagonal real del bastión296 hacia muro237 sigue pendiente.** Su recurso y topología son distintos de los del295; no aplicar la receta cardinal como si resolviese ambos casos.

Evidencia y límites en `artifacts/graphics/E3b2-candidates/walltop-transition-review-01/README.md`. `state.ts` reproduce el estado; `review.ts` genera las recetas y pruebas CPU. No exportan GLB ni invocan Blender.
