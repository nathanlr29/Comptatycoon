import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { advanceSequence, crossedClickMilestone, discoverSecret, getSeason, isLostLiasse, registerTap } from '../src/core/secrets';
import { KONAMI_SEQUENCE, SECRET_IDS } from '../src/data/secrets';
import { parseSave, serializeSave } from '../src/persistence/SaveSchema';
import { makeState, T0 } from './helpers';

describe('secrets', () => {
  it('un secret est enregistré une seule fois, avec sa récompense symbolique', () => {
    const once = discoverSecret(makeState({ money: 100 }), 'balance');
    expect(once.secrets).toEqual(['balance']);
    expect(once.money).toBeCloseTo(100.01);
    expect(discoverSecret(once, 'balance')).toBe(once);
  });

  it('aucun secret ne rapporte plus d’un centime', () => {
    for (const id of SECRET_IDS) expect(discoverSecret(makeState(), id).money).toBeLessThanOrEqual(0.01);
  });

  it('passe par l’action discoverSecret', () => {
    const { state, result } = applyAction(makeState(), { type: 'discoverSecret', id: 'konami' }, T0);
    expect(result.ok).toBe(true);
    expect(state.secrets).toEqual(['konami']);
  });

  it('série d’appuis : déclenche dans la fenêtre, pas en dehors', () => {
    let taps: number[] = [];
    for (let i = 0; i < 4; i++) taps = registerTap(taps, T0 + i * 100, 5, 2_000).taps;
    expect(registerTap(taps, T0 + 500, 5, 2_000)).toEqual({ taps: [], triggered: true });
    expect(registerTap(taps, T0 + 5_000, 5, 2_000).triggered).toBe(false);
  });

  it('code Konami complet, y compris après une fausse note ou un ↑ de trop', () => {
    const type = (keys: string[]) => keys.reduce((p, k) => advanceSequence(p, k), 0);
    expect(type([...KONAMI_SEQUENCE])).toBe(KONAMI_SEQUENCE.length);
    expect(type(['ArrowUp', ...KONAMI_SEQUENCE.map((k) => k.toUpperCase())])).toBe(KONAMI_SEQUENCE.length);
    expect(type(['x', 'ArrowUp', 'q', ...KONAMI_SEQUENCE])).toBe(KONAMI_SEQUENCE.length);
    expect(type(KONAMI_SEQUENCE.slice(0, 9))).toBe(9);
    expect(type([...KONAMI_SEQUENCE.slice(0, 9), 'c'])).toBe(0);
  });

  it('saisons du calendrier', () => {
    expect(getSeason(new Date(2027, 4, 1))?.id).toBe('liasseSeason');
    expect(getSeason(new Date(2027, 4, 20))?.id).toBe('liasseSeason');
    expect(getSeason(new Date(2027, 4, 21))).toBeUndefined();
    expect(getSeason(new Date(2026, 11, 31))?.id).toBe('yearEndClosing');
    expect(getSeason(new Date(2027, 3, 1))?.id).toBe('aprilFool');
    expect(getSeason(new Date(2027, 3, 2))).toBeUndefined();
  });

  it('paliers de saisies et liasse perdue', () => {
    expect(crossedClickMilestone(999, 1_000)).toBe('entries1000');
    expect(crossedClickMilestone(1_000, 1_001)).toBeUndefined();
    expect(crossedClickMilestone(9_999, 10_000)).toBe('entries10000');
    expect(isLostLiasse(0.01)).toBe(true);
    expect(isLostLiasse(0.5)).toBe(false);
  });

  it('sauvegarde : relue, absente des anciennes parties, identifiants inconnus ignorés', () => {
    const saved = parseSave(serializeSave(discoverSecret(makeState(), 'aprilFool'), T0));
    expect(saved.ok && saved.save.state.secrets).toEqual(['aprilFool']);
    const raw = JSON.parse(serializeSave(makeState(), T0));
    delete raw.state.secrets;
    const old = parseSave(JSON.stringify(raw));
    expect(old.ok && old.save.state.secrets).toEqual([]);
    raw.state.secrets = ['inconnu', 'konami'];
    const odd = parseSave(JSON.stringify(raw));
    expect(odd.ok && odd.save.state.secrets).toEqual(['konami']);
  });
});
