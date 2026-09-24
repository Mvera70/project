/** Convierte las láminas CPU en PNG; no abre el juego. */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out='artifacts/graphics/E3b2-candidates/walltop-mixed-finish-review-01';
const data=JSON.parse(await readFile(`${out}/measurements.json`,'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try {const page=await browser.newPage({viewport:{width:1612,height:900}});await page.setContent(await readFile(`${out}/index.html`,'utf8'));await page.screenshot({path:resolve(`${out}/contact-sheet.png`),fullPage:true});
  await page.setViewportSize({width:1000,height:780});for(const r of data.reports){const id=r.id.replace(/-finish$/,'');await page.setContent(await readFile(`${out}/${id}-color.svg`,'utf8'));await page.screenshot({path:resolve(`${out}/${id}-color.png`)});}
} finally {await browser.close();}
