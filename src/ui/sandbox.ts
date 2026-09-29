// El banco de batallas. 27 sep 2026.
//
// Vera: «un sandbox muy simple donde se puedan ver batallas y métricas en
// directo … yo mismo quiero ver y probar cómo se reproduce el combate para
// corregirlo: físicas, animaciones, gore». `?sandbox=battle` abre una villa
// amurallada de verdad —la de la semilla 7 en el verano del año 60, la escena
// de referencia del adarve (E3b)— con un asalto que llega hoy, y encima un
// panel con los mandos y las cifras.
//
// **Es el combate del juego, no una copia.** No hay campo vacío porque el
// combate lee la partida entera —los puestos salen de la muralla y el portón,
// los asaltantes andan por las rutas de la villa—; lo que el banco cambia es
// cuántos cuerpos hay a cada lado (`window.__valleyBattle`, en la capa de vida:
// `garrisonAs` y sin el tope de `BAND_SHOWN`). El motor no sabe nada.
//
// **Y no guarda nunca**: la partida es efímera (`boot(…, { ephemeral: true })`),
// porque en el móvil comparte navegador con la partida de verdad.
//
// Es una herramienta de taller: el texto va en español y no sale del banco de
// plantillas, que es para lo que lee el jugador.

import { MEANS_IDS, SCHEMA_VERSION, type MeansId } from '@engine/state';
import { boot } from './app';
import { giveNow, raidNow, stateAt } from './debug';
import type { BattleStats } from '../render3d/renderer';

export interface BattleSetup {
  readonly seed: number;
  readonly year: number;
  readonly defenders: number;
  readonly arm: 'bow' | 'spear';
  readonly raiders: number;
  /**
   * F-0 · `&shadow=0.12`: una cápsula de Rapier de ese radio por asaltante,
   * en sombra (`docs/diagnostico-fisica-combate-2026-09-29.md` §3). No cambia
   * la batalla; el panel dice lo que cuestan las sondas y en cuántos aciertos
   * coincidiría el contacto. Es la medida del aparato que F-1 necesita.
   */
  readonly shadow?: number;
}

/** Lo que pide la dirección, con valores por omisión que dan una batalla corta. */
export function battleSetupFrom(search: string): BattleSetup {
  const query = new URLSearchParams(search);
  const number = (key: string, fallback: number, low: number, high: number): number => {
    const value = Number(query.get(key));
    return Number.isFinite(value) && query.get(key) !== null ? Math.max(low, Math.min(high, Math.round(value))) : fallback;
  };
  return {
    seed: number('seed', 7, 1, 1_000_000),
    year: number('year', 60, 1, 200),
    defenders: number('defenders', 6, 0, 60),
    arm: query.get('arm') === 'spear' ? 'spear' : 'bow',
    raiders: number('raiders', 12, 1, 80),
    ...(shadowFrom(query.get('shadow'))),
  };
}

function shadowFrom(value: string | null): { shadow?: number } {
  const radius = Number(value);
  if (value === null || !Number.isFinite(radius) || radius <= 0) return {};
  return { shadow: Math.round(Math.max(0.05, Math.min(0.5, radius)) * 100) / 100 };
}

/** La dirección que abre esta misma batalla. */
export function battleUrl(setup: BattleSetup, path: string = location.pathname): string {
  const query = new URLSearchParams({
    sandbox: 'battle', seed: String(setup.seed), year: String(setup.year),
    defenders: String(setup.defenders), arm: setup.arm, raiders: String(setup.raiders),
    ...(setup.shadow === undefined ? {} : { shadow: String(setup.shadow) }),
  });
  return `${path}?${query.toString()}`;
}

/** Cuánto tardó, en qué acabó y con qué cifras: lo que se copia para comparar. */
export interface BattleSummary {
  readonly setup: BattleSetup;
  readonly seconds: number;
  readonly outcome: string;
  readonly defendersLost: number;
  readonly raidersDown: number;
  readonly arrowsLoosed: number;
  readonly arrowHits: number;
  readonly spearHits: number;
  readonly gateHits: number;
  readonly gateBroken: boolean;
  readonly entered: boolean;
  readonly fps: number;
  readonly physicsMs: number;
  /** F-0 · con sondas: ms por paso de Rapier y de las sondas, en total de la batalla, y el acuerdo. */
  readonly probes?: { readonly stepMs: number; readonly probeMs: number; readonly arrows: number;
    readonly cylinder: number; readonly rapier: number; readonly same: number };
}

/** Las fases en que un asaltante ya no pelea. */
const OUT = new Set(['down', 'gone', 'leaving']);

/**
 * El estado de la batalla a partir de las cifras. Puro, para poder probarlo:
 * empieza cuando algún asaltante ha llegado (deja de estar `coming`) y acaba
 * cuando no queda ninguno en pie y peleando. **Si alguno entró, acaba como
 * «entraron» aunque caiga después**: es lo que el motor llama `breached`, y el
 * panel lo recuerda en `enteredEver` porque la escena lo olvida al caer.
 */
export function battleOutcome(stats: BattleStats, enteredEver = false): 'waiting' | 'fighting' | 'held' | 'stormed' {
  if (stats.raiders === 0) return 'waiting';
  const arrived = Object.entries(stats.phases).some(([phase, count]) => phase !== 'coming' && count > 0);
  if (!arrived) return 'waiting';
  const fighting = Object.entries(stats.phases).reduce((sum, [phase, count]) => sum + (OUT.has(phase) ? 0 : count), 0);
  if (fighting > 0) return 'fighting';
  return enteredEver || stats.defence?.gate?.entered === true ? 'stormed' : 'held';
}

export function openBattleSandbox(root: HTMLElement): void {
  // Preparar la villa es jugar sesenta años: segundos en un móvil. Se avisa y
  // se deja pintar el aviso antes de ponerse a ello.
  const notice = document.createElement('p');
  notice.textContent = 'Banco de batallas · preparando la villa (unos segundos)…';
  notice.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;margin:0;'
    + 'background:#1c1a16;color:#efe6d2;font:15px system-ui,sans-serif;z-index:60';
  document.body.append(notice);
  window.setTimeout(() => { prepare(root); notice.remove(); }, 60);
}

function prepare(root: HTMLElement): void {
  const setup = battleSetupFrom(location.search);
  const state = stateAt({ seed: setup.seed, year: setup.year, season: 'summer' });
  // Con qué se defienden: armas y arcos dados, como en la toma del asedio.
  for (const means of ['arms', 'bows'] as const) {
    if ((MEANS_IDS as readonly string[]).includes(means)) giveNow(state, means as MeansId);
  }
  raidNow(state, setup.raiders, true);
  boot(root, {
    schema: SCHEMA_VERSION, savedAtMs: Date.now(), state, decisions: [...state.history], archive: [],
  }, { ephemeral: true });
  // La semana del asalto, congelada: el motor no avanza, la partida no se
  // acaba y el asalto no se resuelve solo. Cada jornada de escena (unos dos
  // minutos a ×1) vuelve a empezar uno, con los mismos números.
  window.__valleyHoldTicks?.(true);
  // La interfaz del juego, fuera: la pantalla despejada de UI-V10.
  document.documentElement.classList.add('bare');
  const gate = state.buildings.find((building) => building.kind === 'gate' && building.lostTick === null);
  mountPanel(setup, gate === undefined ? null : { x: gate.x + 0.5, y: gate.y + 0.5 });
}

function mountPanel(setup: BattleSetup, gate: { x: number; y: number } | null): void {
  const panel = document.createElement('aside');
  panel.className = 'battle-sandbox';
  panel.innerHTML = `
    <style>
      .battle-sandbox { position: fixed; top: calc(8px + env(safe-area-inset-top, 0px)); left: 8px; z-index: 50;
        width: min(300px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow: auto;
        background: rgba(22, 20, 17, 0.82); color: #efe6d2; font: 12px/1.35 system-ui, sans-serif;
        border-radius: 10px; padding: 10px 12px; box-shadow: 0 4px 18px rgba(0,0,0,.35); }
      .battle-sandbox h1 { font-size: 13px; margin: 0 0 6px; display: flex; justify-content: space-between; align-items: center; }
      .battle-sandbox h2 { font-size: 11px; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: .06em; color: #c9b88f; }
      .battle-sandbox label { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 3px 0; }
      .battle-sandbox input, .battle-sandbox select { width: 72px; font: inherit; background: #2d2922; color: inherit;
        border: 1px solid #5a5040; border-radius: 5px; padding: 3px 5px; }
      .battle-sandbox button { font: inherit; background: #4a4131; color: inherit; border: 1px solid #6d6049;
        border-radius: 6px; padding: 6px 8px; min-height: 32px; cursor: pointer; }
      .battle-sandbox button[aria-pressed="true"] { background: #8a6d3b; border-color: #b8914a; }
      .battle-sandbox .row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
      .battle-sandbox dl { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; margin: 0; }
      .battle-sandbox dt { color: #cfc3a8; } .battle-sandbox dd { margin: 0; font-variant-numeric: tabular-nums; text-align: right; }
      .battle-sandbox .outcome { font-weight: 600; }
      .battle-sandbox.folded .body { display: none; }
      .battle-sandbox .brief { margin: 0; color: #e8dcc0; font-variant-numeric: tabular-nums; }
      .battle-sandbox:not(.folded) .brief { display: none; }
      @media (max-width: 600px) { .battle-sandbox { width: calc(100vw - 16px); padding: 8px 10px; }
        .battle-sandbox.folded { background: rgba(22, 20, 17, 0.7); } }
    </style>
    <h1><span>Banco de batallas</span><button type="button" data-act="fold" aria-label="Plegar">–</button></h1>
    <p class="brief" data-brief></p>
    <div class="body">
      <h2>Batalla</h2>
      <label>Defensores <input type="number" min="0" max="60" data-set="defenders" value="${setup.defenders}"></label>
      <label>Arma <select data-set="arm"><option value="bow"${setup.arm === 'bow' ? ' selected' : ''}>Arco</option>
        <option value="spear"${setup.arm === 'spear' ? ' selected' : ''}>Lanza</option></select></label>
      <label>Asaltantes <input type="number" min="1" max="80" data-set="raiders" value="${setup.raiders}"></label>
      <div class="row"><button type="button" data-act="launch">Lanzar asalto</button>
        <button type="button" data-act="restart">Reiniciar</button></div>
      <h2>Tiempo</h2>
      <div class="row" data-group="time">
        <button type="button" data-time="0">Pausa</button>
        <button type="button" data-time="0.25">×¼</button>
        <button type="button" data-time="1" aria-pressed="true">×1</button>
        <button type="button" data-time="4">×4</button>
      </div>
      <h2>En directo</h2>
      <dl data-live></dl>
      <div class="row"><button type="button" data-act="copy">Copiar métricas</button></div>
    </div>`;
  document.body.append(panel);
  const live = panel.querySelector<HTMLDListElement>('[data-live]')!;
  const brief = panel.querySelector<HTMLParagraphElement>('[data-brief]')!;
  const fold = panel.querySelector<HTMLButtonElement>('[data-act="fold"]')!;
  // En un móvil el panel entero tapa media pantalla: empieza plegado, con el
  // resumen de una línea, y se despliega con un toque.
  if (window.matchMedia('(max-width: 600px)').matches) { panel.classList.add('folded'); fold.textContent = '+'; }

  const read = (): BattleSetup => ({
    ...setup,
    defenders: Number(panel.querySelector<HTMLInputElement>('[data-set="defenders"]')!.value) || 0,
    arm: panel.querySelector<HTMLSelectElement>('[data-set="arm"]')!.value === 'spear' ? 'spear' : 'bow',
    raiders: Number(panel.querySelector<HTMLInputElement>('[data-set="raiders"]')!.value) || 1,
  });
  panel.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('button');
    if (target === null) return;
    const act = target.dataset['act'];
    if (act === 'fold') { panel.classList.toggle('folded'); target.textContent = panel.classList.contains('folded') ? '+' : '–'; }
    // Lanzar y reiniciar abren la batalla de nuevo: una partida limpia cada vez.
    if (act === 'launch') location.assign(battleUrl(read()));
    if (act === 'restart') location.reload();
    if (act === 'copy') void copy(JSON.stringify(summary(), null, 2), target);
    const time = target.dataset['time'];
    if (time !== undefined) {
      const value = Number(time);
      window.__valleySpeed?.(value === 0 ? 0 : value >= 4 ? 4 : 1);
      window.__valleyTimeScale?.(value > 0 && value < 1 ? value : 1);
      for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-time]')) {
        button.setAttribute('aria-pressed', String(button === target));
      }
    }
  });

  // En cuanto el renderer está, se le dice la batalla y se mira al portón.
  let told = false;
  let frames = 0;
  let fps = 0;
  let lastFps = performance.now();
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let last: BattleStats | null = null;
  let enteredEver = false;
  const countFrame = (): void => {
    frames += 1;
    const now = performance.now();
    if (now - lastFps >= 1000) { fps = (frames * 1000) / (now - lastFps); frames = 0; lastFps = now; }
    requestAnimationFrame(countFrame);
  };
  requestAnimationFrame(countFrame);

  const summary = (): BattleSummary => {
    const d = last?.defence ?? null;
    return {
      setup: read(),
      seconds: startedAt === null ? 0 : Math.round(((endedAt ?? performance.now()) - startedAt) / 100) / 10,
      outcome: last === null ? 'waiting' : battleOutcome(last, enteredEver),
      defendersLost: d?.lost ?? 0,
      raidersDown: d?.fallen ?? 0,
      arrowsLoosed: d?.loosed ?? 0,
      arrowHits: d?.arrowHits ?? 0,
      spearHits: Math.max(0, (d?.hits ?? 0) - (d?.arrowHits ?? 0)),
      gateHits: d?.gate?.hits ?? 0,
      gateBroken: d?.gate?.broken ?? false,
      entered: enteredEver,
      fps: Math.round(fps),
      physicsMs: Math.round((last?.physics?.stepMsAverage ?? 0) * 100) / 100,
      ...(probed() === null ? {} : { probes: probed()! }),
    };
  };
  // F-0 · lo que cuestan las sondas y en cuántos aciertos coincidiría el contacto.
  const probed = (): BattleSummary['probes'] | null => {
    const physics = last?.physics ?? null;
    const shadow = last?.shadow ?? null;
    if (setup.shadow === undefined || physics === null || shadow === null || physics.steps === 0) return null;
    const round = (value: number): number => Math.round(value * 1000) / 1000;
    return { stepMs: round(physics.stepMsTotal / physics.steps), probeMs: round(physics.probeMsTotal / physics.steps), ...shadow };
  };

  const OUTCOME: Readonly<Record<string, string>> = {
    waiting: 'Esperando a la partida', fighting: 'Peleando', held: 'Aguantaron', stormed: 'Entraron',
  };
  const tick = (): void => {
    if (!told && window.__valleyBattle !== undefined) {
      window.__valleyBattle({ raiders: setup.raiders, hands: setup.defenders, arm: setup.arm,
        ...(setup.shadow === undefined ? {} : { shadow: setup.shadow }) });
      if (gate !== null) window.__valleyLook?.(gate.x, gate.y);
      told = true;
    }
    const stats = window.__valleyBattleStats?.() ?? null;
    if (stats !== null) {
      // Un asalto nuevo —la jornada siguiente vuelve a empezar uno— se nota en
      // que las cuentas bajan: se empieza a medir de cero.
      const restarted = last !== null && ((stats.defence?.loosed ?? 0) < (last.defence?.loosed ?? 0)
        || (stats.defence?.fallen ?? 0) < (last.defence?.fallen ?? 0));
      if (restarted) { startedAt = null; endedAt = null; enteredEver = false; }
      last = stats;
      if (stats.defence?.gate?.entered === true) enteredEver = true;
      const outcome = battleOutcome(stats, enteredEver);
      if (outcome !== 'waiting' && startedAt === null) startedAt = performance.now();
      if ((outcome === 'held' || outcome === 'stormed') && endedAt === null) endedAt = performance.now();
      if (outcome === 'fighting') endedAt = null;
    }
    const s = summary();
    const physics = last?.physics ?? null;
    const rows: [string, string][] = [
      ['Estado', `<span class="outcome">${OUTCOME[s.outcome] ?? s.outcome}</span>`],
      ['Duración', `${s.seconds.toFixed(1)} s`],
      ['Defensores en pie', `${Math.max(0, (last?.garrison ?? 0) - s.defendersLost)} / ${last?.garrison ?? 0}`],
      ['Asaltantes en pie', `${Math.max(0, (last?.raiders ?? 0) - s.raidersDown)} / ${last?.raiders ?? 0}`],
      ['Bajas (def · asalt)', `${s.defendersLost} · ${s.raidersDown}`],
      ['Flechas · aciertos', `${s.arrowsLoosed} · ${s.arrowHits} (${s.arrowsLoosed === 0 ? 0 : Math.round((100 * s.arrowHits) / s.arrowsLoosed)} %)`],
      ['Golpes de lanza', `${s.spearHits}`],
      ['Portón', `${s.gateHits} / 60 golpes${s.gateBroken ? ' · roto' : ''}${enteredEver ? ' · han entrado' : ''}`],
      ['FPS', `${s.fps}`],
      ['Física por paso', physics === null ? 'arranca al llegar' : `${physics.stepMs.toFixed(2)} ms (media ${physics.stepMsAverage.toFixed(2)})`],
      ['Cuerpos físicos', physics === null ? '—' : `${physics.bodies}`],
      ['Cayendo (ragdoll)', physics === null ? '—' : `${physics.activeRagdolls} de ${physics.ragdolls} (tope 24)`],
      ['Cascotes', physics === null ? '—' : `${physics.debris}`],
      ...(setup.shadow === undefined ? [] : [['Sondas F-0', s.probes === undefined ? 'arrancan al llegar'
        : `${physics?.probes ?? 0} · ${s.probes.probeMs.toFixed(3)} ms/paso (Rapier ${s.probes.stepMs.toFixed(3)}) · `
          + `contacto ${s.probes.rapier} de ${s.probes.cylinder} aciertos, ${s.probes.same} iguales`] as [string, string]]),
      ['Llamadas de dibujo', `${last?.drawCalls ?? 0}`],
      ['Triángulos', `${(last?.triangles ?? 0).toLocaleString('es-ES')}`],
    ];
    live.innerHTML = rows.map(([name, value]) => `<dt>${name}</dt><dd>${value}</dd>`).join('');
    brief.textContent = `${OUTCOME[s.outcome] ?? s.outcome} · ${Math.max(0, (last?.garrison ?? 0) - s.defendersLost)} vs `
      + `${Math.max(0, (last?.raiders ?? 0) - s.raidersDown)} · ${s.arrowsLoosed} flechas · portón ${s.gateHits}/60 · ${s.fps} fps`;
  };
  window.setInterval(tick, 250);
}

/** Al portapapeles; si el navegador no deja, se enseña para copiarlo a mano. */
async function copy(text: string, button: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copiado';
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;inset:10% 5%;z-index:60;font:11px monospace';
    document.body.append(area);
    area.select();
    area.addEventListener('blur', () => area.remove());
    button.textContent = 'Selecciónalo y cópialo';
  }
  window.setTimeout(() => { button.textContent = 'Copiar métricas'; }, 1600);
}
