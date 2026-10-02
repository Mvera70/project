from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path('artifacts/graphics/astra');ids=json.loads(Path('art/recipes/fiddle-candidate/ids.json').read_text());overview=Image.new('RGB',(5*260,2*290),'#e5e4d4');draw=ImageDraw.Draw(overview)
for i,id in enumerate(ids):
 d=root/id;sheet=Image.new('RGB',(1800,410),'#e5e4d4');text=ImageDraw.Draw(sheet);report=json.loads((d/'report.json').read_text());back=report['attachment']=='spine'
 for col,(v,label) in enumerate([('quarter','Rear three-quarter equipped' if back else 'Three-quarter equipped'),('front','Front equipped'),('profile','Right profile equipped'),('detail','Accessory detail / origin at mount'),('scale','Native scale: equipped / house')]):
  sheet.paste(Image.open(d/f'{v}.png'),(col*360,35));text.text((col*360+9,12),label,fill='#30392b')
 text.text((12,397),f'{id} | {report["triangles"]} tris | {report["attachment"]} | pivot error {report["pivotErrorCells"]:.2g} cells | rest pose preview',fill='#30392b');sheet.save(d/'sheet.png')
 x=i%5*260;y=i//5*290;overview.paste(Image.open(d/'quarter.png').resize((260,260)),(x,y));draw.text((x+6,y+267),f'{id} / {report["triangles"]} tri',fill='#30392b')
overview.save(root/'block5-overview.png')
