// Capturas y medidas acotadas de la propuesta V8, sin arrancar el juego.
import {chromium} from 'playwright';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const url=pathToFileURL(path.join(dir,'index.html')).href;
const browser=await chromium.launch({headless:true,channel:'msedge'});
const report=[],errors=[];
const ready=page=>page.evaluate(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
 // Las piezas nuevas son fondos CSS: esperar también su decodificación.
 await Promise.all(['nav-leather','nav-iron','nav-medal','nav-medal-on'].map(async id=>{
  const image=new Image();image.src='assets/'+id+'.png';await image.decode();
 }));
});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height]of [[390,844],[320,568]]){
  await page.setViewportSize({width,height});
  for(const material of ['leather','iron']){
   for(const [scene,label]of [['valley','valle'],['board','tablon'],['cart','carro'],['chronicle','cronica']]){
    if(material==='iron'&&!['valley','board'].includes(scene))continue;
    await page.goto(url+'?scene='+scene+'&material='+material);await ready(page);
    await page.screenshot({path:path.join(dir,(material==='iron'?'hierro-':'')+label+'-'+width+'x'+height+'.png')});
    const measurements=await page.evaluate(()=>{
     const nav=document.querySelector('.nav'),r=nav.getBoundingClientRect();
     return {bodyWidth:document.body.scrollWidth,nav:{x:r.x,width:r.width,height:r.height,bottom:r.bottom},
      brokenImages:[...document.images].filter(i=>!i.naturalWidth).length,
      tabs:[...document.querySelectorAll('.nav .tab')].map(b=>{
       const r=b.getBoundingClientRect(),m=b.querySelector('.nav-medal').getBoundingClientRect(),s=getComputedStyle(b.querySelector('.nav-label'));
       return {label:b.textContent.trim(),width:r.width,height:r.height,medalWidth:m.width,medalHeight:m.height,medalTop:m.top,medalCentre:m.x+m.width/2,labelSize:s.fontSize,labelFont:s.fontFamily,active:b.classList.contains('on'),current:b.getAttribute('aria-current'),icon:b.querySelector('use').getAttribute('href'),labelOverflow:b.querySelector('.nav-label').scrollWidth>b.clientWidth};
      }),
      overflow:[...document.querySelectorAll('.paint-card p,.facts-row,.card-heading h3,.card-heading h4')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className)};
    });
    report.push({scene,material,width,height,...measurements});
   }
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(url+'?scene=valley');await ready(page);
 await page.getByRole('button',{name:'CHRONICLE',exact:true}).click();await ready(page);
 const navigates=page.url().includes('scene=chronicle');
 await page.getByRole('button',{name:'PEOPLE',exact:true}).focus();await page.keyboard.press('Enter');
 const peopleActive=await page.getByRole('button',{name:'PEOPLE',exact:true}).getAttribute('aria-current');
 report.push({interactions:{chronicleNavigation:navigates,keyboardPeopleState:peopleActive==='page'}});
 await page.setViewportSize({width:900,height:950});
 await page.goto(pathToFileURL(path.join(dir,'comparison.html')).href);
 for(const frame of page.frames().filter(f=>f!==page.mainFrame())){await frame.locator('.nav-medal').first().waitFor();await ready(frame)}
 await ready(page);
 await page.screenshot({path:path.join(dir,'comparativa-cuero-hierro.png'),fullPage:true});
 await page.setViewportSize({width:700,height:900});
 await page.goto(pathToFileURL(path.join(dir,'pieces.html')).href);await ready(page);
 await page.screenshot({path:path.join(dir,'hoja-piezas-v8.png'),fullPage:true});
 const failures=[];
 for(const r of report.filter(r=>r.scene)){
  const prefix=r.material+'/'+r.scene+'/'+r.width;
  if(r.bodyWidth>r.width||r.brokenImages||r.overflow.length)failures.push(prefix+': carga o desbordamiento');
  if(r.nav.width!==r.width||r.nav.height!==72||r.nav.bottom!==r.height)failures.push(prefix+': correa');
  if(r.tabs.length!==3||r.tabs.filter(t=>t.active).length!==1)failures.push(prefix+': selección');
  const resting=r.tabs.find(t=>!t.active).medalTop;
  r.tabs.forEach((t,i)=>{
   if(t.height<44||t.medalWidth!==56||t.medalHeight!==56||t.labelSize!=='10px'||t.labelOverflow||Math.abs(t.medalCentre-r.width*(i+.5)/3)>.5)failures.push(prefix+': medidas '+t.label);
   if(t.active&&Math.abs(resting-t.medalTop-4)>.1)failures.push(prefix+': elevación');
  });
 }
 report.push({errors,failures});
 fs.writeFileSync(path.join(dir,'verification-layout.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({captures:report.filter(r=>r.scene).length,errors,failures}));
 if(errors.length||failures.length)process.exitCode=1;
}finally{await browser.close()}
