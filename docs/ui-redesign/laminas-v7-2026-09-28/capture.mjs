// Capturas de maquetas estáticas, sin arrancar la simulación.
import {chromium} from 'playwright';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const url=pathToFileURL(path.join(dir,'index.html')).href;
const browser=await chromium.launch({headless:true,channel:'msedge'});
const report=[],errors=[];
const ready=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 for(const [w,h]of [[390,844],[320,568]]){
  await page.setViewportSize({width:w,height:h});
  for(const [scene,label]of [['cart','carro'],['board','tablon'],['chronicle','cronica'],['valley','valle']]){
   await page.goto(url+'?scene='+scene);await ready(page);
   await page.screenshot({path:path.join(dir,label+'-'+w+'x'+h+'.png')});
   report.push(await page.evaluate(({scene,w,h})=>{
    const size=e=>({width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)});
    const all=s=>[...document.querySelectorAll(s)];
    return {scene,width:w,height:h,bodyWidth:document.body.scrollWidth,brokenImages:all('img').filter(i=>!i.naturalWidth).length,
     buttons:all('.paint-action,.step button,.board-close').map(e=>({label:e.getAttribute('aria-label')||e.textContent,...size(e),close:e.matches('.board-close')})),
     art:all('.object-art,.nail,.chronicle-line img,.cost-chip').map(e=>({kind:e.className||'vignette',...size(e)})),
     overflowingText:all('.paint-card p,.card-heading h3,.card-heading h4,.facts-row,.cost-chip,.foot').filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({kind:e.className,width:e.clientWidth,scroll:e.scrollWidth})),
     artOverlapsDescription:all('.paint-card').filter(c=>c.querySelector('.object-art')?.getBoundingClientRect().bottom>c.querySelector('p')?.getBoundingClientRect().top+1).map(c=>c.dataset.key),
     beads:all('.date .arc-bead').length,date:document.querySelector('.date span').textContent,
     actionImages:[...new Set(all('.paint-action').map(e=>getComputedStyle(e).borderImageSource))]};
   },{scene,w,h}));
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(url+'?scene=chronicle');await ready(page);
 await page.evaluate(()=>document.body.classList.add('reading-strip'));
 await page.screenshot({path:path.join(dir,'cronica-siete-390.png'),fullPage:true});
 report.push({continuousChronicle:{entries:await page.locator('.chronicle-line').count(),viewport:page.viewportSize(),height:await page.evaluate(()=>document.documentElement.scrollHeight)}});
 await page.goto(url+'?scene=board');await ready(page);
 const step=page.locator('.step').first();await step.locator('button').last().click();await step.locator('button').last().click();
 const capped=await step.locator('em').textContent();
 await page.locator('.paint-action').first().click();const dimmed=await page.locator('.paint-action').first().isDisabled();
 await page.locator('.board-close').click();await ready(page);const closed=page.url().includes('scene=valley');
 await page.locator('.open-cart button').click();await ready(page);
 report.push({interactions:{countCapped:capped==='3',actionDimmed:dimmed,closedToValley:closed,openedCart:page.url().includes('scene=cart')}});
 await page.setViewportSize({width:1160,height:900});
 await page.goto(pathToFileURL(path.join(dir,'pieces.html')).href);await ready(page);
 await page.screenshot({path:path.join(dir,'hoja-piezas-tamano-real.png'),fullPage:true});
 report.push({pieces:{count:await page.locator('.piece').count(),chronicleCount:await page.locator('.chronicle-grid figure').count(),brokenImages:await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).length)}});
 await page.goto(url);await page.evaluate(()=>document.querySelectorAll('iframe').forEach(f=>f.loading='eager'));
 for(const frame of page.frames().filter(f=>f!==page.mainFrame()))await frame.locator('.screen').waitFor();
 await Promise.all(page.frames().map(ready));
 await page.screenshot({path:path.join(dir,'resumen-v7.png'),fullPage:true});
 report.push({errors});
 fs.writeFileSync(path.join(dir,'verification-layout.json'),JSON.stringify(report,null,2)+'\n');
 const failed=errors.length||report.some(r=>r.brokenImages||r.bodyWidth>r.width||r.overflowingText?.length||r.artOverlapsDescription?.length||r.buttons?.some(b=>b.width<(b.close?44:40)||b.height<(b.close?44:40)));
 console.log(JSON.stringify({failed,scenes:report.filter(r=>r.scene).map(r=>({scene:r.scene,width:r.width,overflow:r.overflowingText,overlaps:r.artOverlapsDescription})),errors}));
 if(failed)process.exitCode=1;
}finally{await browser.close()}
