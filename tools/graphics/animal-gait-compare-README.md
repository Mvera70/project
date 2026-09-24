# Comparar marcha de ciervo y oso

`animal-gait-compare.mjs` captura 12 fases del clip `walk` en los GLB publicados y en dos GLB candidatos. Reutiliza el visor `viewer.html`, la cámara isométrica y el cargador Three.js del proyecto. Las hojas comparativas marcan rodillas (`K`, rojo) y tobillos (`A`, azul); `gait-comparison.json` guarda sus posiciones, flexión de rodilla y errores de JavaScript.

Después de exportar los GLB candidatos a una carpeta dentro del repo, ejecutar:

```powershell
npx tsx tools/graphics/animal-gait-compare.mjs --candidate-dir artifacts/graphics/<ronda>/candidate
```

La carpeta debe contener `deer.glb` y `bear.glb`. El script aborta si falta cualquiera, si falta el clip `walk`, si no encuentra los huesos de rodilla/tobillo o si el destino ya existe. Escribe las capturas en `artifacts/graphics/gait-review/<marca UTC>/` (o en `--output <ruta>`). No construye ni exporta GLB; no modifica recetas, `public/` ni el código del juego. Ejecutarlo sólo cuando el export de ambos candidatos esté autorizado.
