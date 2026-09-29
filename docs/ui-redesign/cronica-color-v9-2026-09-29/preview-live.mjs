// La UI es la desplegada; Playwright sustituye solo PNG de crónica por el lote local.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const batch=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batch,'../../..');
const art=path.join(root,'public/ui/art');
const names=new Set(JSON.parse(fs.readFileSync(path.join(art,'index.json'),'utf8')).art.map(x=>x.file));
const browser=await chromium.launch({channel:'msedge',headless:true});
const result=[];
for(const width of [390,320]){
  const height=width===390?844:568;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();let substituted=0;
  await page.route('**/ui/art/*.png',async route=>{
    const name=path.basename(new URL(route.request().url()).pathname);
    if(!names.has(name))return route.continue();
    substituted++;await route.fulfill({path:path.join(art,name),contentType:'image/png'});
  });
  await page.goto('https://mvera70.github.io/project/?debug=1&live=1&seed=11&year=20&season=summer',{waitUntil:'networkidle',timeout:45000});
  await page.waitForFunction(()=>window.__valleyBoardScreen?.());
  await page.getByRole('button',{name:'Chronicle',exact:true}).click();
  await page.locator('.chronicle-year').first().waitFor({timeout:8000});
  await page.waitForFunction(()=>[...document.querySelectorAll('img[data-chronicle-art]')].some(i=>i.dataset.chronicleArt&&i.getAttribute('src')?.endsWith(i.dataset.chronicleArt)),null,{timeout:5000});
  await page.evaluate(async()=>Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,2000))]));
  await page.screenshot({path:path.join(batch,`cronica-color-juego-${width}x${height}.png`),animations:'disabled'});
  result.push({width,height,substituted,visible:await page.locator('img[data-chronicle-art]').count()});
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(batch,'preview-live.json'),JSON.stringify(result,null,2)+'\n');
console.log(result);
