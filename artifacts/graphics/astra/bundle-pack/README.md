# bundle-pack

Bloque 5. 92 triángulos, una malla `bundle_pack`, un material `valley_vertex`, COLOR_0 de la paleta canónica y cero texturas. Tamaño XYZ glTF: [0.20333333313465118, 0.24666668474674225, 0.1808333471417427] celdas (3 m/celda).

Origen (0,0,0) en `spine`; conector `mount`. **No recentrar ni apoyar este GLB en el suelo.** `attachment.json` contiene la matriz local exacta que se aplica al grupo del accesorio como hijo de `spine`, compensando el giro y escala del padre. Error de coincidencia del pivote: 0 celdas en reposo. Base medida: `public/assets/valley3d/villager.glb`.

Reproducir: `blender --background --python art/recipes/fiddle-candidate/build-block5.py -- bundle-pack`; hojas: `python art/recipes/fiddle-candidate/sheets-block5.py`.

Estado: **preview-only**, como exige la skill animacion. Hoja sobre el aldeano en reposo, detalle y comparación con casa. Sin clips nuevos. Pendiente: integrar en la vida, probar marcha/gestos reales y medir coste; no se certifica aquí la animación en partida.
