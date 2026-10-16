import { describe, expect, it } from 'vitest';
import { clockHands, daylightAt, localHour, mixColor } from '../src/game/daylight';

describe('cycle jour / nuit', () => {
  it('plein jour l’après-midi, nuit noire à 2 h', () => {
    expect(daylightAt(14)).toMatchObject({ phase: 'day', darkness: 0, sun: 1 });
    expect(daylightAt(2)).toMatchObject({ phase: 'night', darkness: 1, sun: 0 });
  });

  it('aube le matin, crépuscule le soir', () => {
    expect(daylightAt(7).phase).toBe('dawn');
    expect(daylightAt(19.5).phase).toBe('dusk');
  });

  it('change progressivement et boucle sur 24 h', () => {
    const a = daylightAt(20);
    const b = daylightAt(20.5);
    expect(b.darkness).toBeGreaterThan(a.darkness);
    expect(b.darkness - a.darkness).toBeLessThan(0.3);
    expect(daylightAt(24)).toEqual(daylightAt(0));
    expect(daylightAt(-1)).toEqual(daylightAt(23));
  });

  it('heure locale décimale', () => {
    expect(localHour(new Date(2026, 9, 16, 18, 30))).toBe(18.5);
  });
});

describe('mélange de couleurs', () => {
  it('extrémités et milieu', () => {
    expect(mixColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColor(0x000000, 0x204060, 0.5)).toBe(0x102030);
    expect(mixColor(0x000000, 0xffffff, 2)).toBe(0xffffff);
  });
});

describe('horloge murale', () => {
  it('3 h 00 : petite aiguille à un quart de tour, grande à midi', () => {
    const h = clockHands(new Date(2026, 9, 16, 15, 0, 0));
    expect(h.hour).toBeCloseTo(Math.PI / 2);
    expect(h.minute).toBeCloseTo(0);
  });
});
