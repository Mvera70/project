// La página del informe del valle (`valley-report.ts`): un HTML autocontenido,
// sin librerías ni red, con los datos dentro. Gráficos en SVG hechos a mano,
// la escalera del ritmo en horas de reloj, los sucesos, la crónica con filtros
// y las decisiones. Y el índice de todas las ejecuciones guardadas.

export interface ValleyData {
  seed: number;
  ticks: number;
  ended: { tick: number; cause: string } | null;
  raids: number;
  milestones: Record<string, number>;
  series: Record<'tick' | 'population' | 'adults' | 'children' | 'grain' | 'wood' | 'stone' | 'silver' | 'morale'
    | 'faith' | 'hens' | 'pigs' | 'cows' | 'houses' | 'buildings' | 'fields' | 'forest' | 'clan' | 'era', number[]>;
  events: { tick: number; type: 'death' | 'birth' | 'arrived' | 'left' | 'built' | 'happening' | 'decision'; what: string; detail?: string; count?: number }[];
  chronicle: { tick: number; kind: string; weight: number; key: string; text: string }[];
}

export interface ValleyReport {
  label: string;
  createdAt: string;
  policy: string;
  years: number;
  seeds: number[];
  weeksPerYear: number;
  hoursPerWeek: number;
  ladder: string[];
  valleys: ValleyData[];
  seconds: number;
}

export interface RunSummary {
  folder: string;
  label: string;
  createdAt: string;
  policy: string;
  years: number;
  seeds: number;
  medianPopulation: number;
  ended: number;
  happeningsPerYear: number;
}

const STYLE = `
:root { --bg:#f4efe4; --panel:#fffdf7; --ink:#2b2620; --soft:#6b6258; --line:#e2d8c4; --accent:#8a5a2b; --good:#4f7a3c; --bad:#a8453a; }
@media (prefers-color-scheme: dark) { :root { --bg:#1d1a16; --panel:#27231e; --ink:#eee5d4; --soft:#a89c8a; --line:#3b342b; --accent:#d8a061; --good:#8fbf6f; --bad:#e07a6a; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
header { padding:18px 20px 8px; }
h1 { margin:0 0 4px; font:600 22px Georgia, serif; }
.meta { color:var(--soft); }
nav { display:flex; gap:4px; flex-wrap:wrap; padding:0 20px; border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--bg); z-index:2; }
nav button { border:0; background:none; color:var(--soft); padding:10px 12px; font:inherit; cursor:pointer; border-bottom:2px solid transparent; }
nav button.on { color:var(--ink); border-bottom-color:var(--accent); font-weight:600; }
main { padding:16px 20px 60px; max-width:1400px; }
section { display:none; } section.on { display:block; }
.cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px; }
.card b { font-size:18px; } .card .k { color:var(--soft); font-size:12px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(420px,1fr)); gap:12px; }
.chart { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:8px 10px; position:relative; }
.chart h3 { margin:2px 0 4px; font-size:14px; } .chart svg { width:100%; height:190px; display:block; }
.tip { position:absolute; pointer-events:none; background:var(--ink); color:var(--bg); padding:4px 7px; border-radius:5px; font-size:12px; white-space:nowrap; display:none; z-index:3; }
table { border-collapse:collapse; width:100%; background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
th, td { padding:5px 8px; border-bottom:1px solid var(--line); text-align:right; }
th:first-child, td:first-child { text-align:left; } th { color:var(--soft); font-weight:600; font-size:12px; background:var(--panel); }
td.never { color:var(--soft); }
.bar { display:inline-block; height:8px; background:var(--accent); border-radius:2px; vertical-align:middle; }
.controls { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin:0 0 12px; }
.controls label { color:var(--soft); } select, input { font:inherit; padding:4px 6px; background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:5px; }
.legend { display:flex; gap:10px; flex-wrap:wrap; margin:0 0 10px; }
.legend span { display:inline-flex; align-items:center; gap:4px; cursor:pointer; user-select:none; } .legend span.off { opacity:.35; }
.legend i { width:12px; height:3px; border-radius:2px; display:inline-block; }
.year { margin:14px 0 4px; font:600 15px Georgia, serif; } .year small { color:var(--soft); font:12px system-ui; }
.line { padding:2px 0 2px 10px; border-left:3px solid var(--line); margin:2px 0; }
.line.w2 { border-left-color:var(--accent); } .line.w3 { border-left-color:var(--bad); font-weight:600; }
.line .tag { color:var(--soft); font-size:11px; margin-left:6px; }
p.note { color:var(--soft); max-width:900px; }
`;

const SCRIPT = String.raw`
const R = JSON.parse(document.getElementById('data').textContent);
const COLORS = ['#b8483a','#4f7a8a','#6d8a3f','#d9a441','#7a5aa8','#c2703a','#3a8a7a','#a83a6e','#5a6ea8','#8a8a3a','#3a3a8a','#8a3a3a'];
const colorOf = (i) => COLORS[i % COLORS.length];
const hours = (t) => t * R.hoursPerWeek;
const years = (t) => t / R.weeksPerYear;
const fmtH = (h) => h < 1 ? Math.round(h * 60) + ' min' : (h < 10 ? h.toFixed(1) : Math.round(h)) + ' h';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const median = (xs) => { const s = [...xs].sort((a,b)=>a-b); return s.length ? s[Math.floor(s.length/2)] : null; };
const hidden = new Set();

// --- pestañas
document.querySelectorAll('nav button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('nav button, section').forEach((x) => x.classList.remove('on'));
  b.classList.add('on'); document.getElementById(b.dataset.t).classList.add('on');
});

// --- resumen
const cards = document.getElementById('cards');
for (const [i, v] of R.valleys.entries()) {
  const pop = v.series.population, last = pop.length - 1;
  const n = (type) => v.events.filter((e) => e.type === type).reduce((s, e) => s + (e.count ?? 1), 0);
  const yrs = years(v.ticks);
  cards.insertAdjacentHTML('beforeend', '<div class="card" style="border-top:3px solid ' + colorOf(i) + '">'
    + '<div class="k">semilla</div><b>' + v.seed + '</b> <span class="k">' + yrs.toFixed(0) + ' años · ' + fmtH(hours(v.ticks)) + '</span>'
    + '<div>población <b>' + pop[last] + '</b> <span class="k">(máx. ' + Math.max(...pop) + ')</span></div>'
    + '<div class="k">' + n('birth') + ' nacidos · ' + n('death') + ' muertos · ' + n('arrived') + ' llegados · ' + n('left') + ' marchados</div>'
    + '<div class="k">' + n('happening') + ' sucesos (' + (n('happening') / Math.max(1, yrs)).toFixed(1) + '/año) · ' + n('decision') + ' decisiones · ' + v.raids + ' asaltos</div>'
    + '<div class="k">era final: ' + ['caserío','aldea','villa'][v.series.era[last]] + '</div>'
    + (v.ended ? '<div style="color:var(--bad)">acabó: ' + esc(v.ended.cause) + ' (año ' + years(v.ended.tick).toFixed(1) + ')</div>' : '<div style="color:var(--good)">sigue en pie</div>')
    + '</div>');
}

// --- leyenda de semillas, compartida por todos los gráficos
function legend(el) {
  el.innerHTML = R.valleys.map((v, i) => '<span data-s="' + v.seed + '" class="' + (hidden.has(v.seed) ? 'off' : '') + '"><i style="background:' + colorOf(i) + '"></i>' + v.seed + '</span>').join('')
    + '<span data-s="median"' + (hidden.has('median') ? ' class="off"' : '') + '><i style="background:var(--ink);height:4px"></i>mediana</span>';
  el.querySelectorAll('span').forEach((s) => s.onclick = () => {
    const key = s.dataset.s === 'median' ? 'median' : Number(s.dataset.s);
    hidden.has(key) ? hidden.delete(key) : hidden.add(key); drawCharts();
  });
}

// --- gráficos de líneas en SVG
const METRICS = [
  ['population', 'Población'], ['adults', 'Adultos'], ['children', 'Niños'], ['grain', 'Grano'], ['wood', 'Leña'],
  ['stone', 'Piedra'], ['silver', 'Plata'], ['morale', 'Ánimo (0–100)'], ['faith', 'Fe (0–100)'], ['houses', 'Casas'],
  ['buildings', 'Edificios (sin campos)'], ['fields', 'Campos'], ['hens', 'Gallinas'], ['pigs', 'Cerdos'], ['cows', 'Vacas'],
  ['forest', 'Bosque que queda (%)'], ['clan', 'Fuerza del clan vecino'], ['era', 'Era (0 caserío · 1 aldea · 2 villa)'],
];
const tip = document.getElementById('tip');
function drawCharts() {
  legend(document.getElementById('legend'));
  const grid = document.getElementById('charts');
  grid.innerHTML = '';
  const maxTick = Math.max(...R.valleys.map((v) => v.ticks));
  for (const [key, title] of METRICS) {
    const box = document.createElement('div'); box.className = 'chart';
    const W = 600, H = 190, L = 42, B = 22, T = 6, Rt = 20;
    let maxY = 0;
    for (const v of R.valleys) if (!hidden.has(v.seed)) maxY = Math.max(maxY, ...v.series[key]);
    maxY = maxY <= 0 ? 1 : maxY * 1.05;
    const x = (t) => L + (t / maxTick) * (W - L - Rt), y = (val) => T + (1 - val / maxY) * (H - T - B);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    for (let g = 0; g <= 4; g++) { const gy = T + g * (H - T - B) / 4; svg += '<line x1="' + L + '" x2="' + (W - Rt) + '" y1="' + gy + '" y2="' + gy + '" stroke="var(--line)"/><text x="' + (L - 4) + '" y="' + (gy + 4) + '" font-size="10" text-anchor="end" fill="var(--soft)">' + Math.round(maxY * (1 - g / 4)) + '</text>'; }
    const step = Math.max(1, Math.round(R.years / 6 / 5) * 5) || 10;
    for (let yr = 0; yr <= years(maxTick); yr += step) svg += '<text x="' + x(yr * R.weeksPerYear) + '" y="' + (H - 6) + '" font-size="10" text-anchor="middle" fill="var(--soft)">' + yr + ' a</text>';
    const stride = Math.max(1, Math.ceil(maxTick / 400));
    R.valleys.forEach((v, i) => {
      if (hidden.has(v.seed)) return;
      let d = ''; const s = v.series;
      for (let k = 0; k < s.tick.length; k += stride) d += (d ? 'L' : 'M') + x(s.tick[k]).toFixed(1) + ' ' + y(s[key][k]).toFixed(1);
      svg += '<path d="' + d + '" fill="none" stroke="' + colorOf(i) + '" stroke-width="1.3" opacity=".8"/>';
    });
    if (!hidden.has('median') && R.valleys.length > 1) {
      let d = '';
      for (let t = 1; t <= maxTick; t += stride) {
        const vals = R.valleys.filter((v) => !hidden.has(v.seed) && t <= v.ticks).map((v) => v.series[key][t - 1]);
        if (vals.length) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(median(vals)).toFixed(1);
      }
      svg += '<path d="' + d + '" fill="none" stroke="var(--ink)" stroke-width="2.4"/>';
    }
    svg += '<line class="cursor" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--soft)" stroke-dasharray="3 3" style="display:none"/></svg>';
    box.innerHTML = '<h3>' + title + '</h3>' + svg;
    const el = box.querySelector('svg'), cursor = box.querySelector('.cursor');
    el.onmousemove = (ev) => {
      const r = el.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      const t = Math.max(1, Math.min(maxTick, Math.round((px - L) / (W - L - Rt) * maxTick)));
      cursor.setAttribute('x1', x(t)); cursor.setAttribute('x2', x(t)); cursor.style.display = '';
      const rows = R.valleys.filter((v) => !hidden.has(v.seed) && t <= v.ticks).map((v) => '<span style="color:' + colorOf(R.valleys.indexOf(v)) + '">■</span> ' + v.seed + ': <b>' + v.series[key][t - 1] + '</b>');
      tip.innerHTML = 'año ' + years(t).toFixed(1) + ' · ' + fmtH(hours(t)) + ' a ×1<br>' + rows.join('<br>');
      tip.style.display = 'block'; tip.style.left = (ev.pageX + 14) + 'px'; tip.style.top = (ev.pageY + 10) + 'px';
    };
    el.onmouseleave = () => { tip.style.display = 'none'; cursor.style.display = 'none'; };
    grid.appendChild(box);
  }
}
drawCharts();

// --- ritmo: la escalera en horas de reloj
{
  const head = '<tr><th>hito</th><th>mediana</th><th>año</th>' + R.valleys.map((v) => '<th>' + v.seed + '</th>').join('') + '<th>valles</th></tr>';
  const rows = R.ladder.map((name) => {
    const ts = R.valleys.map((v) => v.milestones[name]);
    const got = ts.filter((t) => t !== undefined), m = median(got);
    return '<tr><td>' + esc(name) + '</td><td><b>' + (m === null ? '—' : fmtH(hours(m))) + '</b></td><td>' + (m === null ? '—' : years(m).toFixed(1)) + '</td>'
      + ts.map((t) => t === undefined ? '<td class="never">nunca</td>' : '<td>' + fmtH(hours(t)) + '</td>').join('')
      + '<td>' + got.length + '/' + R.valleys.length + '</td></tr>';
  });
  document.getElementById('ladder').innerHTML = head + rows.join('');
}

// --- tablas de recuento: sucesos, muertes, obras
function tally(type, target) {
  const kinds = [...new Set(R.valleys.flatMap((v) => v.events.filter((e) => e.type === type).map((e) => e.what)))].sort();
  const counts = kinds.map((k) => R.valleys.map((v) => v.events.filter((e) => e.type === type && e.what === k).reduce((s, e) => s + (e.count ?? 1), 0)));
  const most = Math.max(1, ...counts.map((c) => c.reduce((a, b) => a + b, 0)));
  const totalYears = R.valleys.reduce((s, v) => s + years(v.ticks), 0);
  document.getElementById(target).innerHTML = '<tr><th>' + type + '</th>' + R.valleys.map((v) => '<th>' + v.seed + '</th>').join('') + '<th>total</th><th>al año</th><th></th></tr>'
    + kinds.map((k, i) => { const total = counts[i].reduce((a, b) => a + b, 0);
      return '<tr><td>' + esc(k) + '</td>' + counts[i].map((c) => '<td>' + c + '</td>').join('') + '<td><b>' + total + '</b></td><td>' + (total / Math.max(1, totalYears)).toFixed(2) + '</td><td style="width:120px"><span class="bar" style="width:' + Math.round(total / most * 110) + 'px"></span></td></tr>'; }).join('');
}
tally('happening', 'happenings'); tally('death', 'deaths'); tally('built', 'built'); tally('decision', 'decisions-count');

// --- crónica con filtros
const seedSel = document.getElementById('c-seed'), wSel = document.getElementById('c-weight'), kSel = document.getElementById('c-kind'), q = document.getElementById('c-q');
seedSel.innerHTML = R.valleys.map((v) => '<option>' + v.seed + '</option>').join('');
const kinds = [...new Set(R.valleys.flatMap((v) => v.chronicle.map((c) => c.kind)))].sort();
kSel.innerHTML = '<option value="">todas</option>' + kinds.map((k) => '<option>' + k + '</option>').join('');
function drawChronicle() {
  const v = R.valleys.find((x) => String(x.seed) === seedSel.value), min = Number(wSel.value), kind = kSel.value, text = q.value.trim().toLowerCase();
  let html = '', year = -1, shown = 0;
  for (const c of v.chronicle) {
    if (c.weight < min || (kind && c.kind !== kind) || (text && !c.text.toLowerCase().includes(text) && !c.key.includes(text))) continue;
    const y = Math.floor(years(c.tick));
    if (y !== year) { year = y; html += '<div class="year">Año ' + (y + 1) + ' <small>desde ' + fmtH(hours(y * R.weeksPerYear)) + ' a ×1</small></div>'; }
    html += '<div class="line w' + c.weight + '">' + esc(c.text) + '<span class="tag">' + esc(c.kind) + ' · ' + esc(c.key) + '</span></div>';
    if (++shown > 4000) { html += '<p class="note">… (se cortan las líneas a partir de 4000: afina el filtro)</p>'; break; }
  }
  document.getElementById('chron').innerHTML = html || '<p class="note">Nada con este filtro.</p>';
}
[seedSel, wSel, kSel].forEach((el) => el.onchange = drawChronicle); q.oninput = drawChronicle; drawChronicle();

// --- decisiones
document.getElementById('decisions').innerHTML = '<tr><th>semilla</th><th>año</th><th>horas</th><th>encrucijada</th><th>opción</th></tr>'
  + R.valleys.flatMap((v) => v.events.filter((e) => e.type === 'decision').map((e) => '<tr><td>' + v.seed + '</td><td>' + years(e.tick).toFixed(1) + '</td><td>' + fmtH(hours(e.tick)) + '</td><td>' + esc(e.what) + '</td><td>' + esc(e.detail ?? '') + '</td></tr>')).join('');

// --- descargar las series de una semilla como CSV
document.getElementById('csv').onclick = () => {
  const v = R.valleys.find((x) => String(x.seed) === document.getElementById('csv-seed').value), keys = Object.keys(v.series);
  const rows = [['year', 'hours', ...keys].join(',')];
  for (let k = 0; k < v.series.tick.length; k++) rows.push([years(v.series.tick[k]).toFixed(3), hours(v.series.tick[k]).toFixed(2), ...keys.map((key) => v.series[key][k])].join(','));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
  a.download = 'valle-' + v.seed + '.csv'; a.click();
};
document.getElementById('csv-seed').innerHTML = R.valleys.map((v) => '<option>' + v.seed + '</option>').join('');
`;

const escapeHtml = (s: string): string => s.replace(/[&<>"]/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function reportPage(report: ValleyReport): string {
  const data = JSON.stringify(report).replace(/</gu, '\\u003c');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe del valle · ${escapeHtml(report.label)}</title><style>${STYLE}</style></head><body>
<header><h1>Informe del valle · ${escapeHtml(report.label)}</h1>
<div class="meta">${report.valleys.length} valles (semillas ${report.seeds.join(', ')}) · ${report.years} años · política <b>${escapeHtml(report.policy)}</b> ·
una semana son ${(report.hoursPerWeek * 60).toFixed(0)} min a ×1, un año ${(report.hoursPerWeek * report.weeksPerYear).toFixed(1)} h ·
generado ${escapeHtml(report.createdAt.slice(0, 16).replace('T', ' '))} en ${report.seconds} s · <a href="../index.html">todas las ejecuciones</a></div></header>
<nav>
<button data-t="s-summary" class="on">Resumen</button><button data-t="s-pace">Ritmo</button><button data-t="s-charts">Gráficos</button>
<button data-t="s-events">Sucesos</button><button data-t="s-chron">Crónica</button><button data-t="s-decisions">Decisiones</button>
</nav>
<main>
<section id="s-summary" class="on"><div class="cards" id="cards"></div>
<p class="note">Cada valle se juega con <code>run</code> y la política indicada, como los demás informes del motor. Las horas son de reloj a ×1, la velocidad por omisión: la unidad en la que se ponen los objetivos de ritmo.</p></section>
<section id="s-pace"><p class="note">La escalera del juego (<code>tools/reports/ladder.ts</code>, la misma de <code>pace-report.ts</code>): cuándo llega cada cosa, en horas de reloj a ×1.</p><table id="ladder"></table></section>
<section id="s-charts"><div class="legend" id="legend"></div><div class="grid" id="charts"></div></section>
<section id="s-events">
<h3>Sucesos del valle</h3><table id="happenings"></table>
<h3>Muertes, por causa</h3><table id="deaths"></table>
<h3>Obras terminadas, por clase</h3><table id="built"></table>
<h3>Encrucijadas contestadas</h3><table id="decisions-count"></table>
</section>
<section id="s-chron"><div class="controls">
<label>semilla <select id="c-seed"></select></label>
<label>peso <select id="c-weight"><option value="1">todo (1+)</option><option value="2" selected>lo que se ve (2+)</option><option value="3">titulares (3)</option></select></label>
<label>clase <select id="c-kind"></select></label>
<label>buscar <input id="c-q" placeholder="texto o clave"></label></div><div id="chron"></div></section>
<section id="s-decisions"><div class="controls"><label>series de <select id="csv-seed"></select></label><button id="csv">descargar CSV</button></div><table id="decisions"></table></section>
</main><div class="tip" id="tip"></div>
<script id="data" type="application/json">${data}</script>
<script>${SCRIPT}</script></body></html>`;
}

export function indexPage(runs: readonly RunSummary[]): string {
  const rows = runs.map((run) => `<tr><td><a href="${escapeHtml(run.folder)}/report.html">${escapeHtml(run.label)}</a></td>`
    + `<td>${escapeHtml(run.createdAt.slice(0, 16).replace('T', ' '))}</td><td>${escapeHtml(run.policy)}</td><td>${run.seeds}</td><td>${run.years}</td>`
    + `<td>${run.medianPopulation}</td><td>${run.ended}/${run.seeds}</td><td>${run.happeningsPerYear}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informes del valle</title><style>${STYLE} td,th{text-align:left}</style></head><body>
<header><h1>Informes del valle</h1><div class="meta">Una fila por ejecución de <code>npx tsx tools/reports/valley-report.ts</code>. La más reciente arriba.</div></header>
<main><table><tr><th>ejecución</th><th>fecha</th><th>política</th><th>valles</th><th>años</th><th>población final (mediana)</th><th>acabados</th><th>sucesos/año</th></tr>${rows}</table></main></body></html>`;
}
