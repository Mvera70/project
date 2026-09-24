# G-32 · Publicación de tres candidatos E3b

**22 sep 2026.** Vera autorizó expresamente publicar los tres GLB exportados
en E3b.0. Se añadieron al catálogo local con identificadores propios, sin
reemplazar G-27 ni los muros actuales. La orden ejecutada desde la raíz del
proyecto fue `npx tsx tools/graphics/publish-assets.ts --ids e3b-bastion-joint-candidate,e3b-walkway-entry-candidate,e3b-walkway-candidate`.
El publicador verificó el lote completo antes de copiar, preservó 68 entradas
anteriores y dejó 71 en `public/assets/valley3d/manifest.json`.

| ID publicado | Bytes | SHA-256 verificado tras copiar |
|---|---:|---|
| `e3b-bastion-joint-candidate` | 88.972 | `543DD56F580893F56A5CBD62237C36E0EE1F1D8BB20E9538373D36D7A422536E` |
| `e3b-walkway-entry-candidate` | 11.428 | `4792C63B4E279B63089D61F3702DABF2E93162381EA94CC0DB272255D6B49678` |
| `e3b-walkway-candidate` | 11.416 | `AB541602681C656A6839BC680548AB7DF7956DB3213D03C26AD32C8D46083601` |

Cada hash coincide con la fuente, el archivo público y el manifiesto. La
[validación aislada](E3b0-exportacion-candidata.md) cubre GLB y medidas. Esta
publicación por sí sola no cambia el render ni la partida. E3b.1a añadió
selector y ruta puros; faltan ensamblado, colisiones, asignación y revisión
en el juego. Sin app, GPU, commit ni push en esta ronda.
