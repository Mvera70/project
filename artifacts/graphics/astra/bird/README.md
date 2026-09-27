# Bird · golondrina en vuelo

- Envergadura: **0,25 m = 0,083333 celdas**. Largo: 0.109 m. Grosor corporal: 0.014 m.
- **110 triángulos / 120**. Exactamente tres mallas y nodos: `bird_body`, `bird_wing_l`, `bird_wing_r`.
- Alas barridas, puntas largas, cola ahorquillada, vientre claro. Sin texturas ni suavizado.
- Paleta: feathers/strangerSlate `#39475E`, breast/neighborLinen `#D3C1A0`, tips/clericalBlack `#08090B`.
- Ejes GLB: +Y arriba, +Z hacia el pico, ala l en −X. Orígenes de alas en hombros (±0,008; 0,002; 0,008 m), convertidos a celdas en GLB. Para batir: girar alrededor de Z local. Pose superior l −55°, r +55°; inferior l +35°, r −35°.
- `sheet.png`: superior y lateral arriba; alas levantadas y bajadas abajo. Capturas del GLB reimportado. Las poses de revisión no se guardan en el GLB: se entrega extendido, listo para giro procedural.
- Receta explícita: `art/recipes/bird-candidate/bird.json`. Sus vértices están en metros, relativos al pivote de cada malla. Usa el adaptador local porque el esquema de primitivas común no expresa alas barridas con precisión.
- Reconstruir: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/bird-candidate/build.py`.

Sin preguntas pendientes. Modelo candidato; integración fuera del encargo.
