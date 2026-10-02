from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path('artifacts/graphics/astra');ids=json.loads(Path('art/recipes/tailor-candidate/ids.json').read_text());overview=Image.new('RGB',(5*320,350),'#e5e4d4');draw=ImageDraw.Draw(overview)
for i,id in enumerate(ids):
 d=root/id;sheet=Image.new('RGB',(1440,410),'#e5e4d4');text=ImageDraw.Draw(sheet)
 for col,(v,label) in enumerate([('quarter','Three-quarter'),('front','Front +Z'),('profile','Right profile'),('scale','Native scale: candidate / villager / house')]):
  sheet.paste(Image.open(d/f'{v}.png'),(col*360,35));text.text((col*360+12,12),label,fill='#30392b')
 report=json.loads((d/'report.json').read_text());text.text((12,397),f'{id} | {report["triangles"]} tris | one mesh / one material | metres = cells x 3',fill='#30392b');sheet.save(d/'sheet.png')
 image=Image.open(d/'quarter.png').resize((320,320));overview.paste(image,(i*320,0));draw.text((i*320+6,328),f'{id} / {report["triangles"]} tri',fill='#30392b')
overview.save(root/'block2-overview.png')
