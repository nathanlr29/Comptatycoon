import { describe, expect, it } from 'vitest';
import { catchUpOffline, isAbsence, shouldShowOfflineReport } from '../src/core/offline';
import { GameStore } from '../src/core/store';
import { makeState, T0 } from './helpers';

const HOUR = 3_600_000;
// 2 juniors = 8 €/s
const working = makeState({ staff: { intern: 0, junior: 2, senior: 0, manager: 0 } });

describe('rattrapage hors ligne', () => {
  it('crédite revenu/s × durée', () => {
    const { state, report } = catchUpOffline(working, T0 + 10 * 60_000);
    expect(report.earned).toBeCloseTo(8 * 600, 9);
    expect(state.money).toBeCloseTo(4_800, 9);
    expect(state.stats.totalEarned).toBeCloseTo(4_800, 9);
    expect(report.capped).toBe(false);
    expect(state.lastSimulatedAt).toBe(T0 + 10 * 60_000);
  });

  it('une absence de 10 h ne crédite que 8 h', () => {
    const { report } = catchUpOffline(working, T0 + 10 * HOUR);
    expect(report.elapsedMs).toBe(10 * HOUR);
    expect(report.creditedMs).toBe(8 * HOUR);
    expect(report.capped).toBe(true);
    expect(report.earned).toBeCloseTo(8 * 8 * 3_600, 6);
  });

  it('deux rattrapages avec le même now ne créditent qu’une fois', () => {
    const first = catchUpOffline(working, T0 + HOUR);
    const second = catchUpOffline(first.state, T0 + HOUR);
    expect(second.report.earned).toBe(0);
    expect(second.state.money).toBe(first.state.money);
  });

  it('une horloge reculée crédite 0 et repart de now', () => {
    const { state, report } = catchUpOffline(working, T0 - HOUR);
    expect(report.elapsedMs).toBe(0);
    expect(report.earned).toBe(0);
    expect(state.money).toBe(working.money);
    expect(state.lastSimulatedAt).toBe(T0 - HOUR);
  });

  it('n’applique pas les effets temporaires et retire ceux expirés pendant l’absence', () => {
    const effects = [
      { id: 'fiscal', incomeMultiplier: 3, expiresAt: T0 + 5 * 60_000 },
      { id: 'long', incomeMultiplier: 2, expiresAt: T0 + 2 * HOUR },
    ];
    const { state, report } = catchUpOffline({ ...working, effects }, T0 + HOUR);
    expect(report.earned).toBeCloseTo(8 * 3_600, 6);
    expect(state.effects.map((e) => e.id)).toEqual(['long']);
  });

  it('n’affiche le récapitulatif qu’au-delà d’une minute', () => {
    expect(shouldShowOfflineReport(catchUpOffline(working, T0 + 60_000).report)).toBe(false);
    expect(shouldShowOfflineReport(catchUpOffline(working, T0 + 61_000).report)).toBe(true);
  });

  it('GameStore.catchUp met l’état à jour et prévient les abonnés', () => {
    const store = new GameStore(working);
    let calls = 0;
    store.subscribe(() => calls++);
    const report = store.catchUp(T0 + HOUR);
    expect(store.getState().money).toBeCloseTo(report.moneyAfter, 9);
    expect(calls).toBe(1);
  });

  it('traite plus d’une minute sans simulation comme une absence', () => {
    expect(isAbsence(working, T0 + 60_000)).toBe(false);
    expect(isAbsence(working, T0 + 60_001)).toBe(true);
  });
});

describe('GameStore', () => {
  it('prévient après chaque action, avec son résultat', () => {
    const store = new GameStore(makeState({ money: 100 }));
    const seen: string[] = [];
    store.onAction((action, result) => seen.push(`${action.type}:${result.ok}`));
    store.dispatch({ type: 'hire', role: 'intern' }, T0);
    store.dispatch({ type: 'buyUpgrade', id: 'keyboardShortcuts' }, T0);
    expect(seen).toEqual(['hire:true', 'buyUpgrade:false']);
  });

  it('replace remplace toute la partie', () => {
    const store = new GameStore(working);
    const fresh = makeState();
    store.replace(fresh);
    expect(store.getState()).toBe(fresh);
  });
});

describe('chantiers pendant l’absence', () => {
  const HOUR_MS = 3_600_000;
  // 2 juniors = 8 €/s ; salle serveurs en travaux (niveau 0 → 1, +5 % de production) finie 1 h après le départ.
  const building = { id: 'serverRoom', type: 'serverRoom' as const, level: 0, slotId: 's1', pending: { targetLevel: 1, endsAt: T0 + HOUR_MS } };
  const base = makeState({ staff: { intern: 0, junior: 2, senior: 0, manager: 0 }, buildings: [...makeState().buildings, building] });

  it('achève le chantier à son heure et applique son bonus ensuite', () => {
    const { state, report } = catchUpOffline(base, T0 + 3 * HOUR_MS);
    const room = state.buildings.find((b) => b.id === 'serverRoom')!;
    expect(room.level).toBe(1);
    expect(room.pending).toBeUndefined();
    expect(state.reputation).toBe(1);
    const repMultiplier = 1.01; // +1 réputation après le chantier
    expect(report.earned).toBeCloseTo(8 * 3_600 + 8 * 1.05 * repMultiplier * 2 * 3_600, 3);
  });

  it('achève aussi un chantier échu après les 8 h créditées, sans revenu en plus', () => {
    const late = { ...building, pending: { targetLevel: 1, endsAt: T0 + 9 * HOUR_MS } };
    const { state, report } = catchUpOffline({ ...base, buildings: [...makeState().buildings, late] }, T0 + 10 * HOUR_MS);
    expect(state.buildings.find((b) => b.id === 'serverRoom')!.level).toBe(1);
    expect(report.earned).toBeCloseTo(8 * 8 * 3_600, 3);
  });

  it('laisse en cours un chantier qui n’est pas fini', () => {
    const { state } = catchUpOffline(base, T0 + HOUR_MS / 2);
    expect(state.buildings.find((b) => b.id === 'serverRoom')!.pending).toBeDefined();
  });
});

