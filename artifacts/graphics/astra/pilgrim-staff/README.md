# pilgrim-staff

Bloque 5. 108 triángulos, una malla `pilgrim_staff`, un material `valley_vertex`, COLOR_0 de la paleta canónica y cero texturas. Tamaño XYZ glTF: [0.09666666388511658, 0.7599999308586121, 0.07000000402331352] celdas (3 m/celda).

Origen (0,0,0) en `hand_r`; conector `grip`. **No recentrar ni apoyar este GLB en el suelo.** `attachment.json` contiene la matriz local exacta que se aplica al grupo del accesorio como hijo de `hand_r`, compensando el giro y escala del padre. Error de coincidencia del pivote: 1.5e-08 celdas en reposo. Base medida: `public/assets/valley3d/villager.glb`.

Reproducir: `blender --background --python art/recipes/fiddle-candidate/build-block5.py -- pilgrim-staff`; hojas: `python art/recipes/fiddle-candidate/sheets-block5.py`.

Estado: **preview-only**, como exige la skill animacion. Hoja sobre el aldeano en reposo, detalle y comparación con casa. Sin clips nuevos. Pendiente: integrar en la vida, probar marcha/gestos reales y medir coste; no se certifica aquí la animación en partida.
