import { beforeAll, describe, expect, it } from 'vitest';
import { median, POLICIES, runBalance } from '../../tools/balance-report';

describe('M-12 · design.md §12.9, real founding and full catalogue', () => {
  let result: ReturnType<typeof runBalance>;
  beforeAll(() => { result = runBalance(); });

  it('runs all 60 seeds for each policy within five minutes', () => {
    expect(result.trials).toHaveLength(60 * POLICIES.length);
    for (const policy of POLICIES) expect(result.trials.filter((t) => t.policy === policy)).toHaveLength(60);
    expect(result.durationMs).toBeLessThan(300_000);
  });

  for (const policy of POLICIES) {
    describe(policy, () => {
      const summary = () => result.summaries.find((s) => s.policy === policy)!;
      it('has no statistics outside their ranges or NaN', () => { expect(summary().invalidCases).toBe(0); });
      // M-14, §7.4. The brief asks for 30 seeds by 150 years; this is 60 by
      // 200, on the same runs, so the geometry is checked where the engine
      // actually plays rather than on a bench of its own.
      it('never overlaps a building or work, and never builds on water or marsh', () => {
        expect(summary().geometryCases).toBe(0);
      });
      it('has mean cadence 1–5 and no seed above 7, excluding forest templates from the count', () => {
        expect(summary().cadence).toBeGreaterThanOrEqual(1);
        expect(summary().cadence).toBeLessThanOrEqual(5);
        expect(summary().maxCadence).toBeLessThanOrEqual(7);
      });
      it('has less than 1% eligible ticks for every template', () => {
        for (const [id, fraction] of Object.entries(summary().eligibility)) expect(fraction, id).toBeLessThan(0.01);
      });
      it('never lingers more than 10 years below a workable village before dying', () => {
        // §5.2, v2.14. A game that spends decades at two or three people is not
        // an ending; it is a flat line with nothing to write about. One trial
        // used to sit there for 38 years.
        expect(summary().maxYearsDying).toBeLessThanOrEqual(10);
      });
      it('has at least 25% extinction after a 90% shock among survivors at year 40', () => {
        expect(summary().shockTrials).toBeGreaterThan(0);
        expect(summary().shockExtinction).toBeGreaterThanOrEqual(0.25);
      });
      // v2.13: the population bands belong to `prudent` and to nothing else.
      // `first` is the spendthrift policy, `last` the defiant one and `worst`
      // the adverse one; none of the three stands in for a player with their
      // head on, so none of the three can set a floor.
      if (policy === 'prudent') {
        it('has median peak population 65–82', () => {
          expect(summary().medianPeak).toBeGreaterThanOrEqual(65);
          expect(summary().medianPeak).toBeLessThanOrEqual(82);
        });
        it('has median population at least 26 at the end of generation one', () => {
          expect(summary().medianGenerationOne).toBeGreaterThanOrEqual(26);
        });
        it('has extinction between 2% and 12%', () => {
          expect(summary().extinction).toBeGreaterThanOrEqual(0.02);
          expect(summary().extinction).toBeLessThanOrEqual(0.12);
        });
      }
    });
  }
  it('has at least 25% extinction under the adverse policy', () => {
    expect(result.summaries.find((s) => s.policy === 'worst')?.extinction).toBeGreaterThanOrEqual(0.25);
  });
  it('opens at least 20 points of extinction between prudent and worst', () => {
    // Principle 2 of valle.md, as a number: if playing well and playing badly
    // end in the same place, the player is a spectator with buttons.
    const of = (policy: string): number =>
      result.summaries.find((s) => s.policy === policy)?.extinction ?? Number.NaN;
    expect(of('worst') - of('prudent')).toBeGreaterThanOrEqual(0.2);
  });
  it('fills 60% of maps with 8 fields and 16 houses before year 120', () => {
    // §12.9, measured with the reference policy since v2.13.
    expect(result.summaries.find((s) => s.policy === 'prudent')?.fullMap)
      .toBeGreaterThanOrEqual(0.6);
  });
  it('leaves 40-70% of the forest standing at year 100 in most valleys', () => {
    // §12.9, live since M-15. M-15's own gate is 20 of 30 seeds; measured here
    // over the 60 that reached year 100 under the reference policy.
    const s = result.summaries.find((x) => x.policy === 'prudent');
    expect(s?.forestTrials ?? 0).toBeGreaterThan(0);
    expect((s?.forestInBand ?? 0) / (s?.forestTrials ?? 1)).toBeGreaterThanOrEqual(2 / 3);
  });
});

it('computes the even-sample median from both middle observations without mutating input', () => {
  const values = [100, 2, 4, 0];
  expect(median(values)).toBe(3);
  expect(values).toEqual([100, 2, 4, 0]);
});
