// Lo lento de este fichero vive en `tests/journeys/ui-doing-long.test.ts` (v5.56).
//
// La línea de estado de la tira. design.md §11.1.1 — `src/ui/doing.ts`.
//
// Lo que esto guarda es que la frase **no miente**. Es la única línea de la
// pantalla que afirma algo sobre lo que la aldea está haciendo ahora mismo, y
// una etiqueta de estado que se equivoca es peor que no tenerla: el jugador
// aprende a no mirarla y con ella deja de mirar el resto.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { renderUiText } from '@engine/chronicle/render';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { doingNow, gateNow } from '@ui/doing';
describe('doingNow · la aldea dice qué está haciendo', () => {
  it('y una aldea acabada no dice nada: ahí habla el epitafio', () => {
    const state = foundGame(7);
    run(state, 5 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    for (const villager of state.people.villagers) villager.diedTick = state.tick;
    expect(doingNow(state)).toBeNull();
  });
});

describe('F2 · y mientras la puerta aguanta, manda la puerta', () => {
  // Lo que esto guarda es la frontera de §1b: el motor sabe que hoy hay asalto
  // y **no puede saber cómo va**, porque la pelea pasa en la escena y no es
  // determinista. `gateNow` es ese reparto, y por eso se prueba con lecturas y
  // no con una partida: una partida no tiene puerta que romper.
  //
  // Medido en el navegador con `?raid=24&assault=1` sobre la semilla 7 al año
  // 30: los tres estados salen —11 golpes «holding», 47 «giving way», 60 y
  // dentro «down»— y ningún error de página. Las capturas, en
  // `artifacts/graphics/F2/`.
  it('antes del primer golpe no dice nada de la puerta', () => {
    // Deliberado: mientras la partida camina hacia ella, lo que hay que contar
    // es que están ahí, y eso ya lo dice `doing.besieged`. Una puerta intacta
    // no es noticia.
    expect(gateNow(null)).toBeNull();
    expect(gateNow({ gate: 0, broken: false })).toBeNull();
  });

  it('golpe a golpe la frase sólo avanza, y acaba en la puerta abajo', () => {
    // La propiedad del diseño: la puerta no se repara mientras la golpean, así
    // que la frase nunca puede retroceder. Es lo que hace que quien mira
    // entienda que va a peor sin que haya un solo número en pantalla (§11.1).
    const ORDER = ['doing.gate_holding', 'doing.gate_giving', 'doing.gate_broken'];
    let rank = -1;
    let said: string | null = null;
    for (let blow = 1; blow <= 60; blow += 1) {
      const key = gateNow({ gate: blow / 60, broken: blow >= 60 });
      expect(key, `golpe ${blow}`).not.toBeNull();
      const now = ORDER.indexOf(key!);
      expect(now, `${key} no es una de las tres`).toBeGreaterThanOrEqual(0);
      expect(now, `la frase retrocedió en el golpe ${blow}`).toBeGreaterThanOrEqual(rank);
      rank = now;
      said = key;
    }
    expect(said).toBe('doing.gate_broken');
    // Y las tres salen por el camino: si una fracción no tuviera frase propia,
    // el jugador vería la misma línea desde el primer golpe hasta el último.
    expect(new Set(ORDER.map((k) => renderUiText(k, {}))).size).toBe(3);
  });

  it('un portón roto lo dice aunque la cuenta de golpes no llegue', () => {
    // D5 · quien manda es `broken`, no la fracción: el portón puede caer por
    // otra vía y la frase tiene que seguirlo. Al revés sería una puerta abajo
    // que la pantalla sigue dando por firme.
    expect(gateNow({ gate: 0.1, broken: true })).toBe('doing.gate_broken');
  });

  it('las tres están en el banco', () => {
    for (const key of ['doing.gate_holding', 'doing.gate_giving', 'doing.gate_broken']) {
      const line = renderUiText(key, {});
      expect(line, `${key} no está en el banco`).not.toMatch(/^\[/u);
      expect(line.length, `${key} está vacía`).toBeGreaterThan(3);
    }
  });
});
