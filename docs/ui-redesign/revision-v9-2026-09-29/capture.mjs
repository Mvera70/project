import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const dir=path.dirname(fileURLToPath(import.meta.url)), pagePath=pathToFileURL(path.join(dir,'index.html')).href, out=path.join(dir,'capturas');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'}), page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
page.on('requestfailed',r=>console.error('FAILED',r.url())); page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
for(const [scene,label] of [['valley','valle'],['chronicle','cronica'],['cart','carro']]) for(const width of [390,320]) {
 await page.setViewportSize({width,height:width===390?844:568}); await page.goto(`${pagePath}?scene=${scene}`,{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}); await page.waitForTimeout(150);
 await page.screenshot({path:path.join(out,`${label}-${width}x${width===390?844:568}.png`)});
}
await page.setViewportSize({width:390,height:844}); await page.goto(`${pagePath}?scene=cart`,{waitUntil:'load'}); await page.waitForTimeout(200);
const qa=await page.evaluate(()=>{const list=document.querySelector('.cart-list'),buttons=[...document.querySelectorAll('.cart-list .paint-action:not(:disabled)')],band=document.querySelector('.nav-plaque-shield'),nav=document.querySelector('.nav'),crossing=buttons.find(b=>b.getBoundingClientRect().bottom>band.getBoundingClientRect().top&&b.getBoundingClientRect().top<innerHeight);return{targetRect:crossing?.getBoundingClientRect().toJSON(),inert:crossing?.inert,count:buttons.length,listScrollHeight:list?.scrollHeight,listClientHeight:list?.clientHeight,navRect:nav.getBoundingClientRect().toJSON(),bandRect:band.getBoundingClientRect().toJSON()}});
const stateBefore=await page.locator('.cart-list .paint-action:not(:disabled)').count(); let clickResult;
if(qa.targetRect){const x=qa.targetRect.x+qa.targetRect.width/2,y=Math.min(qa.targetRect.bottom-2,qa.bandRect.top-2);await page.mouse.click(x,y);clickResult={stateBefore,stateAfter:await page.locator('.cart-list .paint-action:not(:disabled)').count(),at:{x,y}};}
await page.locator('.nav .tab').nth(1).click(); const navWorked=await page.locator('.chronicle-sheet').count()===1;
await page.goto(`${pagePath}?scene=cart`,{waitUntil:'load'}); await page.waitForTimeout(100);
await page.locator('.cart-list').evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll',{bubbles:true}))}); await page.waitForTimeout(150);
const restored=await page.evaluate(()=>{const b=[...document.querySelectorAll('.cart-list .paint-action:not(:disabled)')].at(-1);return{inert:b?.inert,bottom:b?.getBoundingClientRect().bottom,bandTop:document.querySelector('.nav-plaque-shield').getBoundingClientRect().top}});
const report={geometry:qa,clickResult,navWorked,restored}; fs.writeFileSync(path.join(dir,'qa-point-5.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2)); await browser.close();

