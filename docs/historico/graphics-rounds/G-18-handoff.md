# Prompt para recibir G-18

Incorporad la entrega G-18 de `rework/parada-a-media`: doce aldeanos publicados
con los ids exactos del encargo. Revisad `docs/historico/graphics-rounds/G-18.md`.

Las recetas canónicas, catálogo, GLB y manifiesto están actualizados. Los cuatro
modelos de G-17 conservan sus huellas. No hace falta cambiar `src/` para que el
juego seleccione las doce figuras. Niño y anciano miden 0,65 celdas antes del
escalado por edad; no los encogáis en la receta. La postura del anciano está en
la malla y todos conservan los clips del base y las manos libres.

Typecheck, lint, 29 pruebas y las doce construcciones/auditorías pasan. Las
evidencias están en `artifacts/graphics/G-18/delivery/`; los renders y Blender
en `artifacts/graphics/G-18/approved/<id>/`.

Tened presente la diferencia entre zancada medida y declarada del niño,
documentada en G-18.md: está dentro de la tolerancia actual; el constructor no
actualiza automáticamente ese dato del catálogo. No se modificó el juego.
