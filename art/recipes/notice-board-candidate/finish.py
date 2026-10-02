"""Verifica el GLB real y compone las hojas; requiere Pillow."""
import json,struct,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3]
ids=['notice-board','smithy-board','chapel-board','tailor-board','signpost','hide-rack','hammer']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for id in ids:
    out=ROOT/'artifacts/graphics/astra'/id
    blob=(out/f'{id}.glb').read_bytes();doc=json.loads(blob[20:20+struct.unpack_from('<I',blob,12)[0]])
    stats=json.loads((out/'metrics.json').read_text())
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    assert triangles==stats['triangles'] and triangles<=stats['budget']
    assert len(doc['materials'])==1 and not doc.get('textures')
    assert all('COLOR_0' in p['attributes'] for m in doc['meshes'] for p in m['primitives'])
    names=[n.get('name','') for n in doc['nodes']]
    if id=='hide-rack': assert all('hide_'+str(i) in names for i in range(1,5))
    if id=='notice-board': assert all('note_'+str(i) in names for i in range(1,5))
    if id=='hammer': assert 'grip' in names
    stats['glbBytes']=len(blob);stats['sha256']=hashlib.sha256(blob).hexdigest()
    (out/'metrics.json').write_text(json.dumps(stats,indent=2)+'\n')
    sheet=Image.new('RGB',(1280,1320),'#eee9de');draw=ImageDraw.Draw(sheet)
    draw.text((22,14),id+'  |  '+str(triangles)+' triangles  |  1 material',font=font,fill='#302c24')
    for index,(name,label) in enumerate([('quarter','Three-quarter'),('front','Front'),('profile','Side'),('context','Village scale: house + villager')]):
        x=(index%2)*640;y=55+(index//2)*625
        sheet.paste(Image.open(out/(name+'.png')).convert('RGB'),(x,y))
        draw.text((x+12,y+599),label,font=font,fill='#302c24')
    sheet.save(out/'sheet.png')
    dims=' × '.join(f'{x:.3f}' for x in stats['sizeGltf'])
    extra='Cuatro pieles independientes `hide_1`…`hide_4`, más `frame`; todas en el origen base. Ocultar por estado o fusionar una variante por estado al integrar. La exportación separada cuesta hasta cinco llamadas; aún no cumple una llamada hasta esa fusión.' if id=='hide-rack' else 'Una malla y un material: una llamada de dibujo por instancia.'
    if id=='hide-rack': extra+=' La receta incluye `polygonMeshes`: contornos de piel extruidos y reconstruidos por el `build.py` de este bloque; el constructor genérico no interpreta ese campo.'
    if id=='notice-board': extra='Estructura `notice-board` y cuatro documentos independientes `note_1`…`note_4` (cada uno con su clavo), todos con origen base. Permite ocultar avisos por estado. Cinco llamadas como máximo, material compartido.'
    if id=='hammer': extra+=' Conector `grip` y origen en la empuñadura; mango en +Y glTF. Colgar de `hand_r` con el contrato de escala de `Cast`; la hoja muestra ese conector sobre el aldeano, sin sustituir la prueba del gesto real.'
    (out/'README.md').write_text(f'''# {id} · candidato Bloque 1

- Dimensiones X × Y × Z glTF: **{dims} celdas** (3 m/celda).
- **{triangles} / {stats['budget']} triángulos**, {len(stats['meshes'])} mallas, 1 material, 0 texturas; colores de `art/recipes/palette.json` horneados en `COLOR_0`.
- Mallas: {', '.join('`'+x+'`' for x in stats['meshes'])}. Origen: {stats['origin']}; frente +Z.
- {extra}
- `sheet.png`: tres cuartos desde arriba, frente, perfil, contexto con `villager.glb` y `house.glb` publicados, a escala compartida.

## Reconstrucción

Desde la raíz del repositorio, en PowerShell:

```powershell
python art/recipes/notice-board-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/notice-board-candidate/build.py -- {id}
python art/recipes/notice-board-candidate/finish.py
```

El primer comando regenera las siete recetas. El segundo usa la receta JSON, las primitivas del constructor canónico y la paleta; fusiona con colores de vértice para reducir llamadas. El tercero valida y compone las siete hojas después de construir el bloque entero. `metrics.json` mide el GLB exportado. Blender 5.2.1 LTS.

Pendiente: integración, observación en partida a 390 × 844 y medidas de rendimiento a cargo del director. No se ha cambiado el catálogo ni el motor. Hoja de estudio, no aprobación de cámara de reposo.
''',encoding='utf8')
    print(id,triangles,dims)
