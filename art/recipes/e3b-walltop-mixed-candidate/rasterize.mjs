/** Rasteriza láminas SVG CPU en Edge; no abre ni renderiza el juego. */
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out='artifacts/graphics/E3b2-candidates/walltop-mixed-review-01';
const data=JSON.parse(await readFile(`${out}/measurements.json`,'utf8'));
const panels=await Promise.all(data.models.map(async m=>`<section>${await readFile(`${out}/${m.id}-plan.svg`,'utf8')}</section>`));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Mixed walltop geometry</title><style>body{margin:0;background:#f1eee6}main{display:grid;grid-template-columns:repeat(4,460px)}section svg{display:block;width:460px;height:370px}</style><main>${panels.join('')}</main></html>`;
await writeFile(`${out}/contact-sheet.html`,html);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1840,height:740}});await page.setContent(html);await page.screenshot({path:resolve(`${out}/contact-sheet.png`)});
await page.setViewportSize({width:920,height:740});await page.setContent(await readFile(`${out}/mixed-n-sw-iso.svg`,'utf8'));await page.screenshot({path:resolve(`${out}/mixed-n-sw-iso.png`)});}finally{await browser.close();}
