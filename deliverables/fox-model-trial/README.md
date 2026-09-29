# Histórico · pruebas del zorro

Estas piezas documentan la prueba de modelado anterior a la integración. No
son el recurso que carga el juego: ese archivo es
`public/assets/valley3d/fox.glb`.

- `fox-astra-candidate.glb`: primera propuesta.
- `fox-astra-softened-muzzle.glb`: revisión del morro, menos picudo.
- `fox-preview.png` y `fox-softened-muzzle-preview.png`: capturas de ambas.
- `preview.html`: visor local de la segunda propuesta.

Se conservan como referencia de diseño y como entrada del script
`tools/art/rig-single-mesh.py`. **Desde el 29 sep 2026 el `fox` publicado es
`fox-astra-softened-muzzle.glb` con ese esqueleto**, a 0,56 celdas (algo menor
que el perro): `python3 tools/art/rig-single-mesh.py -- <este GLB> <salida.glb> 0.56`,
`tools/art/adopt-models.mjs` y `publish-assets.ts --ids fox`. Lo aprobado está en
`artifacts/graphics/fox-rig/approved/fox/`.
