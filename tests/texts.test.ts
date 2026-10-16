import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../src/data/buildings';
import { durationText, effectText } from '../src/data/texts';

const NBSP = ' ';

describe('textes des pièces', () => {
  it('écrit les durées de travaux', () => {
    expect(durationText(10_000)).toBe(`10${NBSP}s`);
    expect(durationText(90_000)).toBe(`1${NBSP}min 30${NBSP}s`);
    expect(durationText(600_000)).toBe(`10${NBSP}min`);
    expect(durationText(-5)).toBe(`0${NBSP}s`);
  });

  it('décrit l’effet selon le niveau', () => {
    expect(effectText(BUILDINGS.openSpace, 2)).toBe(`Alternants et juniors +50${NBSP}%`);
    expect(effectText(BUILDINGS.headquarters, 1)).toBe('Production de base');
    expect(effectText(BUILDINGS.headquarters, 2)).toBe(`Production globale +10${NBSP}% · ouvre Local voisin`);
    expect(effectText(BUILDINGS.meetingRoom, 3)).toBe(`+3 réputation toutes les 2${NBSP}min`);
    expect(effectText(BUILDINGS.fountain, 1)).toBe('+3 réputation à l’aménagement');
  });
});
