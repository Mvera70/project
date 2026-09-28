// Conserva la tanda a color en documentación y repone los siete originales.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../..');
const v6=path.join(dir,'../laminas-v6-2026-09-28');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(v6,'manifest.generated.json')));
fs.mkdirSync(path.join(v6,'colour'),{recursive:true});
const report=[];
for(const a of manifest.filter(a=>a.group==='chronicle')){
 const live=path.join(root,'public/ui/art',a.id+'.png');
 const saved=path.join(v6,'colour',a.id+'.png');
 const original=path.join(v6,'originals/public/ui/art',a.id+'.png');
 if(!fs.existsSync(original))throw Error('Falta original '+a.id);
 if(!fs.existsSync(saved))fs.copyFileSync(live,saved);
 if(hash(saved)===hash(original))throw Error('La copia a color coincide con el sepia: '+a.id);
 fs.copyFileSync(original,live);
 report.push({id:a.id,colourSha256:hash(saved),originalSha256:hash(original),publicMatchesOriginal:hash(live)===hash(original)});
}
fs.writeFileSync(path.join(dir,'verification-restored.json'),JSON.stringify(report,null,2)+'\n');
const build=path.join(v6,'build.mjs');
fs.writeFileSync(build,fs.readFileSync(build,'utf8').replace("chronicle:'public/ui/art/'","chronicle:'docs/ui-redesign/laminas-v6-2026-09-28/colour/'"));
const exporter=path.join(v6,'export-assets.py');
fs.writeFileSync(exporter,fs.readFileSync(exporter,'utf8').replace("'chronicle':'public/ui/art'","'chronicle':'docs/ui-redesign/laminas-v6-2026-09-28/colour'"));
console.log('Siete colores conservados en docs; siete originales repuestos.');
