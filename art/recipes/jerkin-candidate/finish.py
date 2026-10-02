"""Mide cada GLB y monta hojas con la silueta del aldeano a veinte píxeles."""
import json,struct,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3]
ids=['jerkin','mail','helm-nasal','plate','greaves','harness','helm-closed']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for id in ids:
    out=ROOT/'artifacts/graphics/astra'/id
    blob=(out/f'{id}.glb').read_bytes();doc=json.loads(blob[20:20+struct.unpack_from('<I',blob,12)[0]])
    stats=json.loads((out/'metrics.json').read_text())
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for mesh in doc['meshes'] for p in mesh['primitives'])
    assert triangles==stats['triangles'] and triangles<=stats['budget']
    assert len(doc['materials'])==1 and not doc.get('textures')
    assert all('COLOR_0' in p['attributes'] for m in doc['meshes'] for p in m['primitives'])
    stats['sha256']=hashlib.sha256(blob).hexdigest();stats['bytes']=len(blob)
    lo,hi=stats['mountedBoundsBlender'];stats['mountedSizeGltfCells']=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]]
    (out/'metrics.json').write_text(json.dumps(stats,indent=2)+'\n')
    sheet=Image.new('RGB',(1800,870),'#ebe7dd');d=ImageDraw.Draw(sheet)
    d.text((20,15),f'{id} | {triangles} triangles | on published villager.glb',fill='#252920',font=font)
    for index,name in enumerate(['quarter','front','profile']):
        image=Image.open(out/(name+'.png')).convert('RGB');sheet.paste(image,(index*600,55))
        d.text((index*600+18,780),name,fill='#252920',font=font)
    # Escala óptica: con ortho .9 y figura .65, el alto efectivo ronda 20 px.
    small=Image.open(out/'quarter.png').convert('RGB').resize((23,28),Image.Resampling.LANCZOS)
    sheet.paste(small,(20,824));sheet.paste(small.resize((138,168),Image.Resampling.NEAREST),(1650,695))
    d.text((60,827),'~20 px native silhouette',fill='#252920',font=font)
    sheet.save(out/'sheet.png');small.save(out/'silhouette-20px.png')
    mapping='; '.join('`'+mesh+'` → `'+bone+'`' for mesh,bone in stats['mount'].items())
    dimensions=' × '.join(f'{n:.3f}' for n in stats['mountedSizeGltfCells'])
    detail='Cada malla debe colgar individualmente de su hueso; todas tienen origen local cero. No colgar la raíz completa del GLB en un solo hueso.' if len(stats['mount'])>1 else 'La malla cuelga directamente de su hueso, con origen local cero.'
    if id=='greaves':detail+=' Los alias del brief `leg_l/r` corresponden al rig real `shin.L/R`, pivote en la rodilla.'
    (out/'README.md').write_text(f'''# {id} · candidato Bloque 3

- **{triangles} / {stats['budget']} triángulos**, {len(stats['mount'])} mallas, un material con COLOR_0, sin texturas.
- Dimensiones montadas X × Y × Z: **{dimensions} celdas**.
- Anclajes: {mapping}.
- {detail}
- Coordenadas locales de hueso en metros. **No aplicar otra escala 1/3**: ya la aporta el rig. La receta usa metros de Blender; `build.py` transforma con las matrices reales de `villager.glb`.
- Paleta canónica (`palette.json`), sombreado facetado; metalness y roughness declarados en la receta.
- Hoja: vistas tres cuartos desde arriba, frente y perfil sobre el aldeano publicado, en reposo; muestra adicional de silueta a unos 20 px. `metrics.json` incluye límites montados, hash del rig y error de reconstrucción del anclaje ({stats['mountBoundsError']:.2g} celdas).

## Reconstrucción

Desde la raíz, PowerShell:

```powershell
python art/recipes/jerkin-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/jerkin-candidate/build.py
python art/recipes/jerkin-candidate/finish.py
```

Receta declarativa con primitivas y `polygonMeshes`, reconstruida por el constructor de este bloque (no por `npm run art`). Exporta, recarga el GLB y verifica sus límites sobre las matrices reales del rig; la hoja utiliza el GLB recargado. Blender 5.2.1 LTS; Pillow para la hoja.

Pendiente: integración del cuero; metales **sólo modelo**. No modifica catálogo, motor, reglas ni animación. Falta comprobar todas las poses de combate y otros cuerpos (niños/oficios): las piezas se han ajustado al aldeano adulto publicado. Las faldas rígidas de malla/placa pueden necesitar pesos o división si se aprueba su integración.
''',encoding='utf8')
    print(id,triangles,stats['mount'])
