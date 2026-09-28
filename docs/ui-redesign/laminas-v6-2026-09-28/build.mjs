// Maqueta documental: reutiliza el casco V4 y compone las piezas V6. No arranca el juego.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=p=>'../../../'+p.replaceAll('\\','/');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.generated.json'),'utf8'));
const art=id=>data(({ui:'src/ui/redesign/',art:'public/ui/art/cards/',chronicle:'docs/ui-redesign/laminas-v6-2026-09-28/colour/'}[manifest.find(a=>a.id===id).group])+id+'.png');
const icon=(id,alt='')=>'<img class="resource" src="'+art('res-'+id)+'" alt="'+alt+'">';
const snapshot=path.join(dir,'bank.snapshot.json');
let bank;
if(fs.existsSync(snapshot)) bank=JSON.parse(fs.readFileSync(snapshot,'utf8'));
else {
 const source=execFileSync('git',['show','2d9eb5a:src/engine/chronicle/bank.en.ts'],{cwd:root,encoding:'utf8'});
 bank={};
 for(const m of source.matchAll(/^  '((?:cart|board|mission)\.[^']+)': (['"])(.*)\2,?$/gm)) bank[m[1]]=m[3].replaceAll("\\'", "'").replaceAll('\\"','"');
 fs.writeFileSync(snapshot,JSON.stringify(bank,null,2)+'\n');
}
const t=(key,params={})=>{if(!bank[key])throw Error('Falta '+key);let s=bank[key];for(const [k,v]of Object.entries(params))s=s.replaceAll('{'+k+'}',v);return esc(s)};
const src=read('docs/ui-redesign/laminas-v3-2026-09-28/lamina.src.html');
let css=src.match(/<style>([\s\S]*?)<\/style>/)[1];
let shell=src.match(/<div class="screen" id="screen">([\s\S]*?)<\/body>/)[1];
const sprite=read('index.html').match(/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" aria-hidden="true" style="display:none">[\s\S]*?<\/svg>/)[0];
const v3='docs/ui-redesign/laminas-v3-2026-09-28/';
const replace={cinzel:data('src/ui/redesign/fonts/cinzel.woff2'),garamond:data('src/ui/redesign/fonts/garamond.woff2'),wood:data(v3+'muestra-madera.png'),woodband:data(v3+'muestra-madera.png'),parchment:data('src/ui/redesign/parchment.png'),base:data('docs/interfaz/2026-09-27/ui/010-valle-despejado.jpg'),compass:data(v3+'01-valle.png'),SPRITE:sprite,
 ARC:Array.from({length:25},(_,i)=>[i*90/24,9+11*(1-Math.sin(i/24*Math.PI))].join(',')).join(' '),
 BEADS:[0,22.5,45,67.5,90].map(x=>'<circle class="arc-bead" cx="'+x+'" cy="'+(9+11*(1-Math.sin(x/90*Math.PI)))+'" r="1.5"/>').join(''),
 RAYS:Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return '<line x1="'+Math.cos(a)*7+'" y1="'+Math.sin(a)*7+'" x2="'+Math.cos(a)*10+'" y2="'+Math.sin(a)*10+'"/>'}).join('')};
for(const[k,v]of Object.entries(replace)){css=css.replaceAll('@@'+k+'@@',v);shell=shell.replaceAll('@@'+k+'@@',v)}
shell=shell.replace('@@BODY@@','<div id="scene-content"></div>');
for(const[id,res]of [['face','people'],['wheat','grain'],['logs','wood'],['stone','stone'],['silver','silver']])shell=shell.replace('<svg class="skin-icon" viewBox="0 0 24 24"><use href="#'+id+'"/></svg>',icon(res,res));
css+='\n'+read('docs/ui-redesign/laminas-v4-2026-09-28/refinement.css');
let tokens=read('docs/ui-redesign/laminas-v6-2026-09-28/pieces.tokens.css');
for(const a of manifest.filter(a=>a.group==='ui'))tokens=tokens.replace("url('./"+a.id+".png')","url('"+art(a.id)+"')");
css+='\n'+tokens+'\n'+read('docs/ui-redesign/laminas-v6-2026-09-28/v6.css');
const close='<button class="board-close" aria-label="'+t('board.close')+'">×</button>';
const heading=(title,id,board=false)=>'<div class="card-heading"><'+(board?'h4':'h3')+'>'+title+'</'+(board?'h4':'h3')+'><img class="object-art" src="'+art(id)+'" alt=""></div>';
const cost=items=>'<div class="cost-chip">'+items.map(([id,n])=>'<span>'+icon(id,id)+' '+n+'</span>').join('')+'</div>';
const step=(n,min,max)=>'<div class="step" data-min="'+min+'" data-max="'+max+'"><button aria-label="'+t('board.fewer')+'">−</button><em>'+n+'</em><button aria-label="'+t('board.more')+'">+</button></div>';
const button=(label,off=false)=>'<button class="paint-action"'+(off?' disabled':'')+'>'+label+'</button>';
// EXPEDITION.MISSIONS en 2d9eb5a: cifras literales, muestra situada en verano.
const missions=[['mushrooms',1,0,'none',2],['high_seam',3,8,'high',3],['market',4,15,'low',2,'silver'],['herbs',1,0,'low',2,'away'],['wolf_den',2,5,'high',3]];
const missionLimits={mushrooms:[1,3],high_seam:[2,4],market:[2,3],herbs:[1,2],wolf_den:[2,5]};
const notes=missions.map(([id,weeks,silver,risk,n,off],i)=>'<article class="note paint-card" data-key="mission.'+id+'"><img class="nail'+(i%2?' bent':'')+'" src="'+art(i%2?'nail-bent':'nail')+'" alt="">'+heading(t('mission.'+id+'.name'),'mission-'+id.replaceAll('_','-'),true)+'<p>'+t('mission.'+id+'.what')+'</p><div class="facts-row"><span>'+t(weeks===1?'board.weeks.one':'board.weeks.many',{count:weeks})+'</span><span>· '+t('board.risk.'+risk)+'</span></div><div class="facts-row">'+(silver?cost([['silver',silver]]):'<span>'+t('board.free')+'</span>')+'</div><div class="foot">'+(off?'<span class="why">'+t('board.why.'+off)+'</span>':step(n,...missionLimits[id]))+button(t('board.send'),!!off)+'</div></article>').join('');
const board='<div class="veil"></div><section class="board plank" role="dialog" aria-label="'+t('board.title')+'"><div class="board-title">'+t('board.title')+'</div>'+close+'<div class="notes">'+notes+'</div><div class="away">'+t('board.away',{place:bank['mission.herbs.name'],names:'Ada and Tom',days:4})+'</div></section>';
const means=[['plough','wood',40,20],['pigs','grain',30,14],['ale','grain',25,10],['axe','grain',20,18],['relic',null,0,30],['hand','grain',60,24],['arms','wood',40,22],['bows','wood',30,16],['tower','wood',90,12],['gate','wood',70,10]];
const cart='<section class="cart-sheet" aria-label="'+t('cart.open')+'"><header class="cart-header"><h2>'+t('cart.open')+'</h2>'+close+'</header><div class="cart-list">'+means.map(([id,res,n,silver])=>'<article class="cart-card paint-card" data-key="cart.'+id+'">'+heading(t('cart.'+id),'means-'+id)+'<p>'+t('cart.'+id+'.what')+'</p><div class="foot">'+cost([...(res?[[res,n]]:[]),['silver',silver]])+button(t('cart.give'))+'</div></article>').join('')+'</div></section>';
const chronicles=manifest.filter(a=>a.group==='chronicle');
const chronicle='<section class="chronicle-sheet" aria-label="Chronicle"><header><h2>Anno L</h2>'+close+'</header>'+chronicles.map(a=>'<article class="chronicle-line" data-art="'+a.id+'"><img src="'+art(a.id)+'" alt=""><p>'+esc(a.line)+'</p></article>').join('')+'</section>';
const scenes={board,cart,chronicle};
const js='const scenes='+JSON.stringify(scenes)+';const q=new URLSearchParams(location.search);const scene=q.get("scene");if(scene){document.body.className="standalone";document.getElementById("gallery").remove();document.getElementById("prototype").innerHTML='+JSON.stringify('<div class="screen" id="screen">'+shell)+';document.getElementById("scene-content").innerHTML=scenes[scene]||"";if(scenes[scene])document.getElementById("screen").classList.add("modal-open");if(scene==="board"){document.querySelector(".vital:last-child").lastChild.textContent="12";document.querySelector(".date span").textContent="YEAR 50 · SUMMER, DAY 1";}document.querySelectorAll(".board-close").forEach(b=>b.onclick=()=>location.search="?scene=valley");document.querySelectorAll(".step button").forEach(b=>b.onclick=()=>{const n=b.parentElement.querySelector("em");n.textContent=Math.max(Number(b.parentElement.dataset.min),Math.min(Number(b.parentElement.dataset.max),Number(n.textContent)+(b.textContent==="+"?1:-1)))});document.querySelectorAll(".paint-action:not(:disabled)").forEach(b=>b.onclick=()=>{b.disabled=true});document.querySelectorAll(".tab").forEach((b,i)=>{b.classList.toggle("on",i===(scene==="chronicle"?1:0));b.onclick=()=>location.search="?scene="+(i===1?"chronicle":"valley")});if(q.get("entry"))document.querySelector("[data-art="+q.get("entry")+"]")?.scrollIntoView({block:"start"});}else{document.getElementById("prototype").remove()}';
const gallery='<main id="gallery" class="review-shell"><p>THE VALLEY · V6 · 28 SEPTIEMBRE 2026</p><h1>La aldea, el papel y lo que cuentan.</h1><p class="lead">35 piezas generadas para revisar sobre la V4 y el encargo V5. Dibujos nuevos, materiales compartidos y cerdos con proporciones naturales. Las escenas de la crónica conservan la composición de los grabados.</p><nav class="review-nav"><a href="pieces.html">Todas las piezas a tamaño real</a><a href="chronicle.html">Las siete escenas de crónica</a><a href="../propuesta-piel-v6-2026-09-28.md">Documento V6</a></nav><p>Maqueta estática: cifras de ejemplo, sin partida. − y + permiten probar el espacio; Give y Send solo muestran el aspecto apagado.</p>'+[['cart','01 · El carro'],['board','02 · El tablón'],['chronicle','03 · La crónica']].map(([id,title])=>'<section><h2>'+title+'</h2><div class="pair">'+[[390,844],[320,568]].map(([w,h])=>'<figure><figcaption>'+w+' × '+h+' CSS px</figcaption><iframe title="'+title+' '+w+'" src="?scene='+id+'" width="'+w+'" height="'+h+'" loading="lazy"></iframe><a href="?scene='+id+'">Abrir</a></figure>').join('')+'</div></section>').join('')+'<h2>Referencia V5</h2><p>Se sustituyen los recortes con fondo por PNG transparentes; se mantiene la estructura de las tarjetas.</p><a href="../laminas-v5-2026-09-28/01-carro.png">Ver lámina V5 original</a><footer>Estado: propuesta para Vera. Pendientes las otras 44 imágenes de crónica y las escenas que hoy comparten fichero.</footer></main>';
const page=(title,body,script='')=>'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+css+'</style></head><body>'+body+(script?'<script>'+script+'</script>':'')+'</body></html>';
fs.writeFileSync(path.join(dir,'index.html'),page('The Valley · V6','<div id="prototype"></div>'+gallery,js));
const pieces=manifest.filter(a=>a.group!=='chronicle');
const pieceBody='<main class="review-shell"><p>THE VALLEY · V6</p><h1>Piezas a tamaño de uso</h1><p>Zoom del navegador al 100 %. Cada PNG está a 2×; aquí se muestra a su medida CSS. El fondo gris permite ver el recorte.</p><a href="index.html">Volver a las láminas</a>'+[['Marcos y controles',pieces.slice(0,8)],['Recursos · 20 × 20',pieces.slice(8,13)],['Carro y misiones · 96 × 80',pieces.slice(13)]].map(([title,items])=>'<h2>'+title+'</h2><div class="piece-grid">'+items.map(a=>'<figure class="piece"><figcaption>'+a.id+'<br>'+a.css.join(' × ')+' CSS · PNG '+a.size.join(' × ')+'</figcaption><div class="piece-stage"><img src="'+art(a.id)+'" width="'+a.css[0]+'" height="'+a.css[1]+'" alt="'+a.id+'"></div></figure>').join('')+'</div>').join('')+'<h2>Nueve partes · esquinas fijas</h2><div class="slice-tests"><div class="paint-card" style="width:280px;height:150px">280 × 150</div><div class="paint-card" style="width:440px;height:210px">440 × 210</div></div><h2>Crónica · 320 × 256 CSS</h2><div class="chronicle-grid">'+chronicles.map(a=>'<figure><figcaption>'+a.id+' · '+a.key+'</figcaption><img src="'+art(a.id)+'" alt=""><p>'+esc(a.line)+'</p></figure>').join('')+'</div></main>';
fs.writeFileSync(path.join(dir,'pieces.html'),page('V6 · Muestrario a tamaño real',pieceBody));
const comparison='<main class="review-shell"><p>THE VALLEY · V6</p><h1>Siete escenas. La misma composición.</h1><p>Sepia original a la izquierda; nueva versión a color a la derecha. Textos del banco con parámetros de ejemplo.</p><a href="index.html?scene=chronicle">Verlas dentro de la crónica</a>'+chronicles.map(a=>'<section><h2>'+a.id+' · '+a.key+'</h2><div class="original-compare"><img src="'+data('docs/ui-redesign/laminas-v6-2026-09-28/originals/public/ui/art/'+a.id+'.png')+'" alt="Sepia original"><img src="'+art(a.id)+'" alt="Versión a color"></div><p>'+esc(a.line)+'</p></section>').join('')+'</main>';
fs.writeFileSync(path.join(dir,'chronicle.html'),page('V6 · Crónica, sepia y color',comparison));
console.log('V6: index.html, pieces.html y chronicle.html generados.');
