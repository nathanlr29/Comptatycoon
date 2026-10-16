import { describe, expect, it } from 'vitest';
import { maxWalkers, pathTo, pickActivity, placesFrom } from '../src/game/characters/behavior';

/** Hasard rejoué : renvoie les valeurs dans l'ordre, puis 0,5. */
const seq = (...values: number[]) => () => values.shift() ?? 0.5;
const all = { canWalk: true, places: ['printer', 'coffee'] as const, hasColleague: true };

describe('activités des employés', () => {
  it('le plus souvent, on tape au clavier', () => {
    const a = pickActivity(seq(0.9), all);
    expect(a).toMatchObject({ kind: 'desk', action: 'type' });
  });

  it('parfois on se lève vers un lieu du plan ou un collègue', () => {
    expect(pickActivity(seq(0.1, 0), all)).toMatchObject({ kind: 'walk', to: 'printer' });
    expect(pickActivity(seq(0.1, 0.99), all)).toMatchObject({ kind: 'walk', to: 'colleague' });
  });

  it('on reste assis quand trop de monde est debout ou sans destination', () => {
    expect(pickActivity(seq(0.1), { ...all, canWalk: false }).kind).toBe('desk');
    expect(pickActivity(seq(0.1), { canWalk: true, places: [], hasColleague: false }).kind).toBe('desk');
  });

  it('téléphone, étirement et café au bureau', () => {
    expect(pickActivity(seq(0.25), all)).toMatchObject({ action: 'phone' });
    expect(pickActivity(seq(0.33), all)).toMatchObject({ action: 'stretch' });
    expect(pickActivity(seq(0.4), all)).toMatchObject({ action: 'sip' });
  });

  it('peu de personnes debout en même temps', () => {
    expect(maxWalkers(1)).toBe(1);
    expect(maxWalkers(15)).toBe(3);
    expect(maxWalkers(80)).toBe(4);
  });

  it('les meubles connus deviennent des destinations, les autres sont ignorés', () => {
    const places = placesFrom(
      [
        { type: 'printer', x: 3, y: 5 },
        { type: 'plant', x: 1, y: 1 },
        { type: 'meetingTable', x: 9, y: 1 },
      ],
      { w: 12, h: 10 },
    );
    expect(places.map((p) => p.kind)).toEqual(['printer', 'meeting']);
    for (const spot of places.flatMap((p) => p.spots)) {
      expect(spot.ix).toBeGreaterThan(0);
      expect(spot.iy).toBeLessThan(10);
    }
  });

  it('trajet en L : d’abord en x, puis en y', () => {
    expect(pathTo({ x: 1, y: 1 }, { x: 4, y: 3 })).toEqual([{ x: 4, y: 1 }, { x: 4, y: 3 }]);
  });
});
