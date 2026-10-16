import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../src/data/buildings';
import { durationText, effectText } from '../src/data/texts';
import { plain } from './helpers';

describe('textes des pièces', () => {
  it('écrit les durées de travaux', () => {
    expect(plain(durationText(10_000))).toBe('10 s');
    expect(plain(durationText(90_000))).toBe('1 min 30 s');
    expect(plain(durationText(600_000))).toBe('10 min');
    expect(plain(durationText(-5))).toBe('0 s');
  });

  it('décrit l’effet selon le niveau', () => {
    expect(plain(effectText(BUILDINGS.openSpace, 2))).toBe('Alternants et juniors +50 %');
    expect(plain(effectText(BUILDINGS.serverRoom, 1))).toBe('Production globale +5 %');
    expect(plain(effectText(BUILDINGS.meetingRoom, 3))).toBe('+3 réputation toutes les 2 min');
    expect(effectText(BUILDINGS.fountain, 1)).toBe('+3 réputation à l’aménagement');
    expect(effectText(BUILDINGS.socialWing, 1)).toBe('Permet d’ouvrir le pôle');
  });
});
