# pilgrim-hat

Bloque 5. 98 triángulos, una malla `pilgrim_hat`, un material `valley_vertex`, COLOR_0 de la paleta canónica y cero texturas. Tamaño XYZ glTF: [0.2536150813102722, 0.11916665732860565, 0.2666666805744171] celdas (3 m/celda).

Origen (0,0,0) en `head`; conector `mount`. **No recentrar ni apoyar este GLB en el suelo.** `attachment.json` contiene la matriz local exacta que se aplica al grupo del accesorio como hijo de `head`, compensando el giro y escala del padre. Error de coincidencia del pivote: 3e-08 celdas en reposo. Base medida: `public/assets/valley3d/villager.glb`.

Reproducir: `blender --background --python art/recipes/fiddle-candidate/build-block5.py -- pilgrim-hat`; hojas: `python art/recipes/fiddle-candidate/sheets-block5.py`.

Estado: **preview-only**, como exige la skill animacion. Hoja sobre el aldeano en reposo, detalle y comparación con casa. Sin clips nuevos. Pendiente: integrar en la vida, probar marcha/gestos reales y medir coste; no se certifica aquí la animación en partida.
