// La página del informe del valle (`tools/reports/valley-report-page.ts`): se
// abre sin servidor ni red y lleva los datos dentro, así que lo que se vigila es
// que el HTML sea autocontenido y que ningún texto de la crónica lo rompa.

import { describe, expect, it } from 'vitest';
import { indexPage, reportPage, type ValleyReport } from '../../tools/reports/valley-report-page';

const series = Object.fromEntries(['tick', 'population', 'adults', 'children', 'grain', 'wood', 'stone', 'silver', 'morale',
  'faith', 'hens', 'pigs', 'cows', 'houses', 'buildings', 'fields', 'forest', 'clan', 'era'].map((key) => [key, [1, 2]])) as ValleyReport['valleys'][number]['series'];

const report: ValleyReport = {
  label: 'prueba', createdAt: '2026-09-26T09:00:00Z', policy: 'prudent', years: 1, seeds: [7],
  weeksPerYear: 48, hoursPerWeek: 14 / 60, ladder: ['5 personas'], seconds: 1,
  valleys: [{
    seed: 7, ticks: 2, ended: null, raids: 0, milestones: { '5 personas': 2 }, series,
    events: [{ tick: 1, type: 'happening', what: 'pedlar' }],
    chronicle: [{ tick: 1, kind: 'happening', weight: 2, key: 'fate.pedlar', text: 'A pedlar said </script><b>hi</b>' }],
  }],
};

describe('El informe del valle, en HTML', () => {
  it('es autocontenido: sin recursos de fuera, y la crónica no cierra el script de datos', () => {
    const html = reportPage(report);
    expect(html).not.toMatch(/<script[^>]+src=/u);
    // Lo único de fuera son las letras del juego (Google Fonts), con respaldo:
    // sin red, la página se lee igual con las del sistema.
    for (const [, href] of html.matchAll(/<link[^>]+href="([^"]+)"/gu)) expect(href).toMatch(/^https:\/\/fonts\.(googleapis|gstatic)\.com/u);
    // El texto de la crónica va escapado dentro del JSON: un `</script>` en una
    // línea no puede cerrar el bloque de datos antes de tiempo.
    const data = html.slice(html.indexOf('<script id="data"'), html.indexOf('</script>', html.indexOf('<script id="data"')));
    expect(data).toContain('\\u003c/script>');
    expect(JSON.parse(data.slice(data.indexOf('>') + 1).replace(/\\u003c/gu, '<')).valleys[0].seed).toBe(7);
  });

  it('para publicar sale como fragmento, sin el enlace al índice local', () => {
    const html = reportPage(report, { publish: true });
    expect(html.startsWith('<title>')).toBe(true);
    expect(html).not.toMatch(/<html|<body|<!doctype/iu);
    expect(html).not.toContain('../index.html');
  });

  it('el índice enlaza cada ejecución con su informe', () => {
    const html = indexPage([{ folder: '2026-09-26-prueba', label: 'prueba', createdAt: report.createdAt, policy: 'prudent',
      years: 60, seeds: 6, medianPopulation: 50, ended: 1, happeningsPerYear: 12.7 }]);
    expect(html).toContain('href="2026-09-26-prueba/report.html"');
  });
});
