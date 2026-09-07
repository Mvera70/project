import { beforeAll, describe, expect, it } from 'vitest';
import { median, POLICIES, runBalance } from '../../tools/balance-report';

describe('M-12 · design.md §12.9, real founding and full catalogue', () => {
  let result: ReturnType<typeof runBalance>;
  beforeAll(() => { result = runBalance(); });

  it('runs all 60 seeds for each policy within five minutes', () => {
    expect(result.trials).toHaveLength(180);
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
      it('has at least 25% extinction after a 90% shock among survivors at year 40', () => {
        expect(summary().shockTrials).toBeGreaterThan(0);
        expect(summary().shockExtinction).toBeGreaterThanOrEqual(0.25);
      });
      if (policy !== 'worst') {
        it('has median peak population 65–82', () => {
          expect(summary().medianPeak).toBeGreaterThanOrEqual(65);
          expect(summary().medianPeak).toBeLessThanOrEqual(82);
        });
        it('has median population at least 26 at the end of generation one', () => {
          expect(summary().medianGenerationOne).toBeGreaterThanOrEqual(26);
        });
      }
    });
  }
  it('has at least 25% extinction under the adverse policy', () => {
    expect(result.summaries.find((s) => s.policy === 'worst')?.extinction).toBeGreaterThanOrEqual(0.25);
  });
  it.todo('neutral extinction 2–12%: §12.9 explicitly says first and last are not neutral; policy needs definition');
  it('fills 60% of maps with 8 fields and 16 houses before year 120', () => {
    // §12.9. Now measurable: step 6 spends the build points. `worst` is the
    // adverse policy and is not held to a growth target.
    for (const policy of ['first', 'last'] as const) {
      expect(result.summaries.find((s) => s.policy === policy)?.fullMap, policy)
        .toBeGreaterThanOrEqual(0.6);
    }
  });
  it.todo('40–70% initial forest remaining at year 100: requires M-15');
});

it('computes the even-sample median from both middle observations without mutating input', () => {
  const values = [100, 2, 4, 0];
  expect(median(values)).toBe(3);
  expect(values).toEqual([100, 2, 4, 0]);
});
