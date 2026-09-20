// Juego real + reloj del navegador controlado + píxel y traza atómicos.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback;
const seed = Number(opt('seed', '43')), year = Number(opt('year', '60'));
const lead = Number(opt('lead', '0'));
const advanceWeeks = Number(opt('advance', '0'));
const follow = Number(opt('follow', '-1')), zoom = Number(opt('zoom', '1'));
const seconds = Number(opt('seconds', '120')), fps = Number(opt('fps', '2'));
const live = args.includes('--live');
const speed = Number(opt('speed', '16'));
// M-3 · `--means plough|ale|pigs|axe|relic|hand` abre un valle **con ese medio ya
// dado**, que es la única forma de observar lo que el jugador metió: un medio se
// paga con lo del valle, así que esperar a que la aldea junte la plata no es una
// forma de grabarlo. Entra por la ruta de depuración (`?debug=1&live=1&means=`,
// `src/main.ts`) en vez de por el menú, y por eso se salta sus clics.
const means = opt('means', '');
// IA-5 · `--happening wolves_at_the_coop` provoca ese suceso del valle esta
// semana, por la misma razón: la visita del lobo sale pocas veces en sesenta
// años y esperarla mirando no es grabarla.
const happening = opt('happening', '');
// K-5 · `--crown ready` deja la fila de la corona encendida y `--crown <oficio>`
// corona ya a alguien de ese oficio, para ver la sala y el estilo del valle.
const crown = opt('crown', '');
if (!Number.isFinite(seconds) || seconds < 0 || !Number.isInteger(30 / fps) || fps <= 0 || lead < 0 || lead > 120
  || !Number.isInteger(advanceWeeks) || advanceWeeks < 0) throw new Error('Usa fps divisor de 30, lead entre 0 y 120 y advance entero positivo.');
const out = resolve(opt('out', `artifacts/graphics/IA-10/seed-${seed}`));
if (existsSync(join(out, 'trace.json'))) throw new Error('La toma ya existe; usa otra carpeta --out.');
mkdirSync(join(out, 'frames'), { recursive: true });
const root = join(homedir(), 'AppData/Local/ms-playwright');
const executablePath = readdirSync(root).filter(x => /^chromium-\d+$/.test(x)).sort().reverse()
  .map(x => join(root, x, 'chrome-win64/chrome.exe')).find(existsSync);
const browser = await chromium.launch({ executablePath,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const tab = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  if (live || advanceWeeks > 0) {
    await tab.clock.install({ time: new Date('2026-09-17T12:00:00Z') });
    if (live) await tab.clock.pauseAt(new Date('2026-09-17T12:00:00Z'));
  }
  const errors = [];
  tab.on('pageerror', e => errors.push(String(e)));
  const pageUrl = pathToFileURL(resolve(opt('page', 'artifacts/graphics/G-10/game/valley.html')));
  // D3 · `--raid 20` planta la partida del valle vecino llegando hoy, que es
  // la única forma de grabarla: un asalto llega hacia la hora 114 de reloj.
  const raid = opt('raid', '');
  // E0a · `braced` es la decisión real; `coming` deja la misma víspera sin
  // bandera para la toma de control.
  const braced = opt('braced', '');
  const coming = opt('coming', '');
  const warning = opt('warning', '');
  const aftermath = args.includes('--aftermath') ? '1' : '';
  // E0c · mismo constructor de depuración que el pos-saqueo, sin la huella:
  // así control y caso se comparan con idéntica partida y encuadre.
  const aftermathControl = args.includes('--aftermath-control') ? '1' : '';
  const beast = args.includes('--beast') ? '1' : '';
  // D3b · `--assault` hace que la partida venga a tirar el porton.
  const assault = args.includes('--assault') ? '1' : '';
  const debugRoute = means !== '' || happening !== '' || crown !== '' || raid !== ''
    || braced !== '' || coming !== '' || warning !== '' || assault !== '' || aftermath !== '' || aftermathControl !== '';
  if (debugRoute) {
    const extra = (means === '' ? '' : `&means=${means}`)
      + (happening === '' ? '' : `&happening=${happening}`)
      + (crown === '' ? '' : `&crown=${crown}`)
      + (raid === '' ? '' : `&raid=${raid}`)
      + (coming === '' ? '' : `&coming=${coming}`)
      + (warning === '' ? '' : `&warning=${warning}`)
      + (braced === '' ? '' : `&braced=${braced}`)
      + (aftermath === '' ? '' : `&aftermath=${aftermath}`)
      + (aftermathControl === '' ? '' : '&aftermath=0')
      + (beast === '' ? '' : `&beast=${beast}`)
      + (assault === '' ? '' : `&assault=${assault}`);
    pageUrl.search = `?debug=1&live=1&seed=${seed}&year=${year}&season=${opt('season', 'summer')}${extra}`;
  }
  await tab.goto(pageUrl.href);
  if (!debugRoute) {
    await tab.locator('#valley-seed').fill(String(seed));
    if (await tab.locator('.title-dev').getAttribute('aria-pressed') === 'false') await tab.locator('.title-dev').click();
    await tab.locator('#valley-year').fill(String(year));
    await tab.locator('.title-new').click();
  }
  if (live) for (let attempt = 0; attempt < 200; attempt++) {
    if (await tab.evaluate(() => (window.__valleyLife?.()?.people.length ?? 0) > 0)) break;
    await tab.clock.runFor(100);
  }
  await tab.waitForFunction(() => window.__valleyLife?.()?.people.length > 0);
  if (advanceWeeks > 0) {
    const MS_PER_WEEK = 840_000, CHUNK = 48;
    for (let left = advanceWeeks; left > 0; left -= CHUNK) {
      await tab.clock.fastForward(Math.min(left, CHUNK) * MS_PER_WEEK);
      await tab.clock.runFor(1000);
      const decision = tab.locator('.crossroad-options button').first();
      if (await decision.isVisible()) await decision.click();
    }
    await tab.clock.runFor(1000);
    if (!live) {
      const now = await tab.evaluate(() => Date.now());
      await tab.clock.pauseAt(new Date(now));
    }
  }
  // Congela todo el navegador entre muestras, incluido RAF: una captura lenta
  // no hace avanzar la simulación mientras se escribe el PNG.
  if (live) {
    await tab.evaluate(() => window.__valleyObserveLive());
    // E0b · una decisión tapa los controles. Resolverla primero reproduce el
    // flujo real (modal → tick → escena) y evita que el observatorio espere un
    // botón de velocidad que está correctamente oculto detrás de la modal.
    const openingDecision = tab.locator('.crossroad-options button').first();
    if (await openingDecision.isVisible()) {
      await openingDecision.click();
      await tab.clock.runFor(100);
    }
    await tab.locator('.valley-speed-badge').click();
    await tab.getByRole('button', { name: `${speed}×`, exact: true }).evaluate(button => button.click());
    if (lead > 0) await tab.clock.runFor(lead * 1000);
  } else {
    if (advanceWeeks === 0) {
      const start = new Date();
      await tab.clock.install({ time: start });
      // Instalar el reloj puede tardar más de 100 ms con WebGL ocupado. El
      // reset de abajo descarta este margen; nunca pedimos pausar en el pasado.
      await tab.clock.pauseAt(new Date(start.getTime() + 10_000));
    }
    await tab.evaluate(() => window.__valleyAdvance(0, true));
    if (lead > 0) {
      // El reset crea otra Village. Dejar resolver su carga asíncrona antes
      // del salto evita que 40 s síncronos parezcan 40 s de latencia de Rapier.
      // Este paso se descuenta del lead: no se mueve la fase de la toma.
      const warmup = raid !== '' ? 1 : 0;
      if (warmup) {
        await tab.evaluate(() => window.__valleyAdvance(1));
        await tab.waitForFunction(() => {
          const physics = window.__valleyLife?.()?.physics;
          return physics !== null && physics !== undefined;
        },
          undefined, { polling: 100, timeout: 10_000 }).catch(() => {
          process.stdout.write('Rapier no disponible: se observa el respaldo animado.\n');
        });
      }
      await tab.evaluate(steps => window.__valleyAdvance(steps), Math.round(lead * 30) - warmup);
    }
  }
  const frames = [];
  let basePhase = null;
  for (let n = 0; n <= seconds * fps; n += 1) {
    if (live) {
      const decision = tab.locator('.crossroad-options button').first();
      if (await decision.isVisible()) await decision.click();
      if (n) await tab.clock.runFor(1000 / fps);
    } else if (n) await tab.evaluate(steps => window.__valleyAdvance(steps), Math.round(30 / fps));
    const shot = await tab.evaluate(({ follow, zoom }) => window.__valleyCapture(follow, zoom), { follow, zoom: n === 0 ? zoom : 1 });
    if (shot.life === null) throw new Error('Fotograma sin vida.');
    if (basePhase === null) basePhase = (shot.life.phase - n / fps / 120 + 1) % 1;
    const expectedPhase = (basePhase + n / fps / 120) % 1;
    const phaseError = Math.abs(shot.life.phase - expectedPhase);
    if (!live && Math.min(phaseError, 1 - phaseError) > 0.002) throw new Error('El reloj externo ha interferido en la toma.');
    const file = `frames/${String(n).padStart(4, '0')}.png`;
    const pixels = Buffer.from(shot.image.split(',')[1], 'base64');
    writeFileSync(join(out, file), pixels);
    if (n === 0) writeFileSync(join(out, 'before.png'), pixels);
    if (n === Math.floor(seconds * fps / 2)) writeFileSync(join(out, 'middle.png'), pixels);
    if (n === seconds * fps) writeFileSync(join(out, 'after.png'), pixels);
    frames.push({ seconds: n / fps, file, life: shot.life, engineTick: Number(await tab.locator('html').getAttribute('data-tick')) });
    if (n % (10 * fps) === 0) process.stdout.write(`${n / fps}s, fase ${shot.life.phase}, ${shot.life.people.length} personas\n`);
  }
  const summary = { sampledPeople: frames[0]?.life.people.length ?? 0, sampledBeasts: frames[0]?.life.beasts.length ?? 0,
    firstTick: frames[0]?.engineTick, lastTick: frames.at(-1)?.engineTick, nightOutcomes: frames.at(-1)?.life.nightOutcomes,
    preparation: {
      active: frames[0]?.life.preparation.active ?? false,
      porters: frames[0]?.life.preparation.porters ?? [],
      maxCarrying: 0,
      deliveries: 0,
      defenders: frames[0]?.life.people.filter(person => person.dayPlan?.job?.place?.startsWith('post:')).map(person => person.id) ?? [],
      stalledPorters: [],
    },
    meshDrift: 0, peopleMeshDrift: 0, penetratingCircles: 0, penetratingBeasts: 0, blockedCentres: 0, night: [], transitions: [] };
  const last = new Map();
  const porterMotion = new Map();
  for (const frame of frames) {
    const life = frame.life;
    const porterIds = new Set(life.preparation.porters.map(porter => porter.id));
    summary.preparation.maxCarrying = Math.max(summary.preparation.maxCarrying,
      life.actors.filter(actor => porterIds.has(actor.id) && actor.load !== null).length);
    summary.preparation.deliveries = Math.max(summary.preparation.deliveries, life.preparation.deliveries);
    for (const beast of life.beasts) {
      if (beast.penetration > 0.001) summary.penetratingBeasts += 1;
      const mesh = life.renderedAnimals.find(item => item.id === beast.id);
      if (mesh === undefined || Math.hypot(mesh.x - beast.x, mesh.z - beast.z) > 0.002) summary.meshDrift += 1;
    }
    const counts = {};
    for (const person of life.people) {
      const stage = person.residence?.stage ?? 'no-home';
      const mesh = life.renderedPeople.find(item => item.id === person.id);
      if (stage !== 'sleeping' && (mesh === undefined || Math.hypot(mesh.x - person.x, mesh.z - person.z) > 0.002)) summary.peopleMeshDrift += 1;
      if (stage !== 'sleeping' && person.penetration > 0.001) summary.penetratingCircles += 1; counts[stage] = (counts[stage] ?? 0) + 1;
      const cell = Math.floor(person.z) * life.map.width + Math.floor(person.x);
      if (stage !== 'sleeping' && life.map.blocked[cell] === 1) summary.blockedCentres += 1;
      if (last.get(person.id) !== stage) summary.transitions.push({ at: frame.seconds, id: person.id, stage });
      last.set(person.id, stage);
      const preparingOutside = (person.residence === null || person.residence.stage === 'day')
        && person.doing?.offer?.startsWith('prepare') && person.doing.route > 0;
      if (porterIds.has(person.id) && preparingOutside) {
        const prior = porterMotion.get(person.id);
        const moved = prior === undefined || Math.hypot(person.x - prior.x, person.z - prior.z) > 0.02;
        porterMotion.set(person.id, { x: person.x, z: person.z, since: moved ? frame.seconds : prior.since });
        if (!moved && frame.seconds - prior.since >= 10 && !summary.preparation.stalledPorters.includes(person.id)) {
          summary.preparation.stalledPorters.push(person.id);
        }
      } else porterMotion.delete(person.id);
    }
    if (life.phase >= 0.78 || life.phase < 0.06) summary.night.push({ at: frame.seconds, phase: life.phase, counts });
  }
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  const report = { seed, year, advanceWeeks, fps, lead, speed: live ? speed : null,
    mode: live ? 'live-engine-browser-clock' : 'production-renderer-fixed-state-30hz', errors, summary, frames };
  writeFileSync(join(out, 'trace.json'), JSON.stringify(report));
  const data = JSON.stringify(report).replaceAll('<', '\\u003c');
  writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Observatorio · Valle ${seed}</title>
<style>body{margin:20px;background:#17201e;color:#ede7d6;font:16px system-ui}button,select,input{font:inherit}main{display:flex;gap:20px;align-items:flex-start}figure{margin:0;position:relative;height:calc(100vh - 180px);aspect-ratio:390/844;flex-shrink:0}img,svg{width:100%;height:100%}svg{position:absolute;inset:0;height:100%;pointer-events:none}aside{flex:1;max-height:calc(100vh - 180px);overflow:auto;white-space:pre-wrap;font:13px monospace}input{width:50%}circle{cursor:pointer;pointer-events:all}</style>
<h1>Observatorio · Valle ${seed}, año ${year}</h1><p>${live ? `Partida viva a ×${speed}, motor y reloj del navegador avanzando.` : 'Render y vida reales a 30 Hz, con el estado de la partida fijo durante la toma.'} Selecciona un cuerpo para ver su ruta, intención y animación. El ganado dibujado se marca en naranja.</p>
<button id="play">▶ / pausa</button> <input id="time" type="range" min="0" max="${frames.length - 1}" value="0"> <span id="stamp"></span>
<main><figure><img id="frame"><svg id="overlay" viewBox="0 0 1100 850"></svg></figure><aside><select id="who"><option value="">Todos</option></select><pre id="info"></pre></aside></main>
<script>const data=${data};let selected='',timer=null;const $=id=>document.getElementById(id);const choices=new Set();for(const f of data.frames){for(const p of f.life.people)choices.add('p:'+p.id);for(const b of f.life.beasts)choices.add('b:'+b.id)}for(const id of choices){const o=document.createElement('option');o.value=id;o.textContent=id;$('who').append(o)}
function draw(){const f=data.frames[+$('time').value],l=f.life;$('frame').src=f.file;$('overlay').setAttribute('viewBox','0 0 '+l.viewport.width+' '+l.viewport.height);$('stamp').textContent=f.seconds+' s · fase '+l.phase+' · paso '+l.steps;const list=[...l.people.map(p=>({...p,key:'p:'+p.id})),...l.beasts.map(b=>({...b,key:'b:'+b.id}))];let svg='';for(const p of list){const active=p.key===selected;if(selected&&!active)continue;svg+='<circle data-key="'+p.key+'" cx="'+p.screen.x+'" cy="'+p.screen.y+'" r="7" fill="none" stroke="'+(active?'#ffed65':'#7aeed4')+'" stroke-width="2"/><text x="'+(p.screen.x+8)+'" y="'+p.screen.y+'" fill="white" font-size="12">'+p.key+'</text>';if(active){svg+='<polyline fill="none" stroke="#ffed65" stroke-width="2" points="'+[p.screen,...p.routePoints.map(q=>q.screen)].map(q=>q.x+','+q.y).join(' ')+'"/>';$('info').textContent=JSON.stringify({body:p,animation:l.actors.find(a=>a.id===p.id),mesh:l.renderedAnimals.find(a=>a.id===p.id)},null,2)}}for(const a of l.renderedAnimals){if(selected&&selected!=='b:'+a.id)continue;svg+='<circle cx="'+a.screen.x+'" cy="'+a.screen.y+'" r="3" fill="#ff9b59"/>'}$('overlay').innerHTML=svg;if(!selected)$('info').textContent=JSON.stringify({people:l.people.length,beasts:l.beasts.length,rendered:l.renderedAnimals.length,interactions:l.interactions,errors:data.errors},null,2)}
$('overlay').onclick=e=>{if(e.target.dataset.key){selected=e.target.dataset.key;$('who').value=selected;draw()}};$('who').onchange=()=>{selected=$('who').value;draw()};$('time').oninput=draw;$('play').onclick=()=>{if(timer){clearInterval(timer);timer=null}else timer=setInterval(()=>{$('time').value=(+$('time').value+1)%data.frames.length;draw()},1000/data.fps)};draw();</script>`);
  process.stdout.write(`Observatorio: ${join(out, 'index.html')} · errores: ${errors.length}\n`);
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
