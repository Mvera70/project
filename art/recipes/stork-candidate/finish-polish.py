"""Hojas comparativas y contrato de pivotes contra el candidato anterior."""
import json,subprocess,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'artifacts/graphics/astra/stork'
ids=['stork','chick','crane','butterfly','hen','swallow','fox','mule']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for mode in ['scale','detail']:
    sheet=Image.new('RGB',(1920,1060),'#ebe7dd');d=ImageDraw.Draw(sheet)
    d.text((20,12),'Same scale: ortho 1.4 cells' if mode=='scale' else 'Detail comparison: each animal framed individually',font=font,fill='#20251f')
    for index,id in enumerate(ids):
        x=index%4*480;y=55+index//4*500
        sheet.paste(Image.open(OUT/'comparison-after'/f'{id}-{mode}.png'),(x,y))
        d.text((x+12,y+455),id+(' [published]' if index>=4 else ' [candidate]'),font=font,fill='#eeeeee')
    sheet.save(OUT/(mode+'-comparison.png'))
sheet=Image.new('RGB',(960,1530),'#ebe7dd');d=ImageDraw.Draw(sheet)
for row,id in enumerate(['stork','chick','crane']):
    for column,tag in enumerate(['before','after']):
        x=column*480;y=row*510;d.text((x+15,y+7),id+' / '+tag,font=font,fill='#20251f')
        sheet.paste(Image.open(OUT/('comparison-'+tag)/(id+'-detail.png')),(x,y+30))
sheet.save(OUT/'before-after.png')
verification={}
for id in ['stork','chick','crane','butterfly']:
    path=f'artifacts/graphics/astra/{id}/metrics.json'
    old=json.loads(subprocess.check_output(['git','show','9992f09e:'+path],cwd=ROOT))
    new=json.loads((ROOT/path).read_text())
    assert old['pivotsMetres']==new['pivotsMetres']
    assert old['meshCount']==new['meshCount'] and old['primitives']==new['primitives']
    assert new['triangles']<=new['limit']
    verification[id]=dict(before=old['triangles'],after=new['triangles'],limit=new['limit'],unchangedPivots=True,unchangedDrawPrimitives=True)
    if id!='butterfly':
        path=ROOT/f'artifacts/graphics/astra/{id}/README.md';text=path.read_text(encoding='utf8')
        text+='\n## Revisión de estilo, 2 oct 2026\n\nVolúmenes revisados contra `hen`, `bird` (golondrina), `fox` y `mule` publicados, con cámara idéntica de 1,4 celdas y detalle aparte. Comparativas y coste en `../stork/polish-review.md`, `scale-comparison.png`, `detail-comparison.png` y `before-after.png`. Sin excepción de presupuesto; mallas, pivotes y primitivas de dibujo conservados. Para reproducir las recetas: Blender en segundo plano con `art/recipes/stork-candidate/generate.py`; comparativas con `compare.py -- after`; composición y validación con `python art/recipes/stork-candidate/finish-polish.py`.\n'
        path.write_text(text,encoding='utf8')
for id in ['stork-nest','butterfly']:
    rel=f'artifacts/graphics/astra/{id}/{id}.glb'
    assert subprocess.check_output(['git','show','9992f09e:'+rel],cwd=ROOT)==(ROOT/rel).read_bytes()
(OUT/'polish-verification.json').write_text(json.dumps(verification,indent=2)+'\n')
