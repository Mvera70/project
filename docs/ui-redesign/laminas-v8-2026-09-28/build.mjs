// Composición V8 a partir del HTML documental V7. No cambia sus piezas ni componentes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const prior=path.join(dir,'../laminas-v7-2026-09-28');
const css=fs.readFileSync(path.join(dir,'v8.css'),'utf8');
let page=fs.readFileSync(path.join(prior,'index.html'),'utf8').replaceAll('assets/','../laminas-v7-2026-09-28/assets/');
page=page.replace('</style>',css+'</style>');
const js=`
const v8q=new URLSearchParams(location.search);
if(v8q.get('material')==='iron')document.body.classList.add('iron');
document.querySelectorAll('.nav .tab').forEach((old,i)=>{
 const button=document.createElement('button');button.type='button';button.className=old.className;
 const label=old.textContent.trim();button.setAttribute('aria-label',label);
 button.innerHTML='<span class="nav-medal" aria-hidden="true">'+old.querySelector('svg').outerHTML+'</span><span class="nav-label">'+label+'</span>';
 if(button.classList.contains('on'))button.setAttribute('aria-current','page');
 button.onclick=()=>{
  if(i===2){document.querySelectorAll('.nav .tab').forEach(b=>{b.classList.remove('on');b.removeAttribute('aria-current')});button.classList.add('on');button.setAttribute('aria-current','page');return;}
  location.search='?scene='+(i===1?'chronicle':'valley')+'&material='+(v8q.get('material')||'leather');
 };
 old.replaceWith(button);
});
if(v8q.get('material')==='iron')document.querySelectorAll('.board-close').forEach(b=>b.onclick=()=>location.search='?scene=valley&material=iron');
`;
page=page.replace('</body>','<script>'+js+'</script></body>');
// Reemplazar solo el catálogo exterior: las cuatro escenas permanecen como en V7.
const frames=(material,scenes=[['valley','Valle de día'],['board','Tablón abierto'],['cart','Carro'],['chronicle','Crónica']])=>scenes.map(([id,title])=>'<section><h2>'+title+'</h2><div class="material-row">'+[[390,844],[320,568]].map(([w,h])=>'<figure><figcaption>'+w+' × '+h+' · '+(material==='iron'?'hierro':'cuero')+'</figcaption><iframe title="'+title+' '+w+'" width="'+w+'" height="'+h+'" src="index.html?scene='+id+'&material='+material+'"></iframe></figure>').join('')+'</div></section>').join('');
const gallery='<main id="gallery" class="review-shell"><p>THE VALLEY · V8 · 28 SEPTIEMBRE 2026</p><h1>Cuero oscuro y medallones de latón.</h1><p>Una navegación con material propio: correa mate, costura clara, medallones de 56 px y nombres en Cinzel crema. La pestaña activa sube 4 px y se enciende por dentro.</p><nav class="review-nav"><a href="comparison.html">Comparar cuero e hierro</a><a href="pieces.html">Piezas a tamaño real</a><a href="../propuesta-barra-v8-2026-09-28.md">Documento V8</a></nav><p>Maqueta documental: Valley y Chronicle cambian de lámina; People muestra solo su estado activo, sin simular una pantalla nueva.</p>'+frames('leather')+'</main>';
page=page.replace(/<main id="gallery"[\s\S]*?<\/main>/,gallery).replace('<title>The Valley · V7</title>','<title>The Valley · V8</title>');
fs.writeFileSync(path.join(dir,'index.html'),page);
const style=page.match(/<style>([\s\S]*?)<\/style>/)[1];
const wrap=(title,content)=>'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+style+'</style></head><body><main class="review-shell"><p>THE VALLEY · V8</p><h1>'+title+'</h1><a href="index.html">Volver a las cuatro láminas</a>'+content+'</main></body></html>';
const compare=['valley','board'].map(scene=>'<section><h2>'+(scene==='valley'?'Valle de día':'Tablón abierto')+'</h2><div class="material-row">'+['leather','iron'].map(material=>'<figure><figcaption>'+(material==='leather'?'A · Cuero cosido':'B · Hierro forjado con remaches')+'</figcaption><a href="index.html?scene='+scene+'&material='+material+'"><img alt="'+scene+' '+material+'" src="'+(material==='iron'?'hierro-':'')+(scene==='valley'?'valle':'tablon')+'-390x844.png" width="390" height="844"></a></figure>').join('')+'</div></section>').join('');
fs.writeFileSync(path.join(dir,'comparison.html'),wrap('Dos materiales, la misma navegación',compare+'<p>Se conserva el mismo latón y los mismos símbolos para comparar el soporte. El hierro es una alternativa de revisión; no sustituye la propuesta de cuero.</p>'));
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.generated.json')));
const pieces=manifest.map(a=>'<section><h2>'+a.id+'</h2><p>PNG '+a.size.join(' × ')+' · uso '+a.css.join(' × ')+' CSS'+(a.slice?' · nueve partes: corte 32 / borde 16':'')+'</p><div class="nav-piece-stage"><img src="assets/'+a.id+'.png" width="'+a.css[0]+'" height="'+a.css[1]+'" alt="'+a.id+'"></div></section>').join('');
fs.writeFileSync(path.join(dir,'pieces.html'),wrap('Piezas V8 a tamaño real',pieces));
console.log('V8: cuatro láminas, comparación y piezas.');
