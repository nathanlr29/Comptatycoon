import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { canBuild, findFreeSlot } from '../src/core/buildings';
import { getEventWeight } from '../src/core/events';
import { canDismissPartner, canHire, getCapacity } from '../src/core/recruitment';
import type { BuildingState } from '../src/core/state';
import { simulate } from '../src/core/store';
import { BUILDINGS, type BuildingType } from '../src/data/buildings';
import { EVENT_WEIGHTS } from '../src/data/events';
import { OFFICE_STAGES, PARKING_STALLS_PER_LEVEL, getStage, parkingRect, parkingStalls } from '../src/data/office';
import { effectText } from '../src/data/texts';
import { parkingLevel, planRect, toOfficeView } from '../src/game/officeView';
import { makeState, plain, T0 } from './helpers';

const hq = (level: number): BuildingState => ({ id: 'hq', type: 'headquarters', level, slotId: 'hq' });
const owned = (type: BuildingType, level = 1): BuildingState => ({ id: type, type, level, slotId: type });
const staff = (n: number) => ({ intern: n, junior: 0, senior: 0, manager: 0 });
const E = 1e-9;
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w - E && b.x < a.x + a.w - E && a.y < b.y + b.h - E && b.y < a.y + a.h - E;

describe('parking', () => {
  it('se construit au plateau (niveau 3), devant l’immeuble', () => {
    expect(canBuild(makeState({ money: 1e6, buildings: [hq(2)] }), 'parking')).toMatchObject({ ok: false, reason: 'requires_hq' });
    expect(canBuild(makeState({ money: 1e6, buildings: [hq(3)] }), 'parking')).toMatchObject({ ok: true, cost: 100_000, slotId: 'parking' });
    expect(findFreeSlot(makeState({ buildings: [hq(3), owned('parking')] }), 'parking')).toBeUndefined();
  });

  it('chaque niveau ajoute 5 places d’encadrement, aussi pour le départ d’un associé', () => {
    const base = makeState({ partners: 2, staff: staff(30) });
    expect(getCapacity(base)).toBe(30);
    expect(canHire({ ...base, money: 1e6 }, 'intern')).toMatchObject({ ok: false, reason: 'capacity_full' });
    const withParking = { ...base, money: 1e6, buildings: [hq(3), owned('parking', 2)] };
    expect(getCapacity(withParking)).toBe(40);
    expect(canHire(withParking, 'intern').ok).toBe(true);
    // 30 collaborateurs, 1 associé + 10 places de parking = 25 places : le départ est refusé
    expect(canDismissPartner(withParking)).toMatchObject({ ok: false, reason: 'team_too_large' });
    expect(canDismissPartner({ ...withParking, staff: staff(25) }).ok).toBe(true);
    // Un parking encore en chantier (niveau 0) ne compte pas
    expect(getCapacity({ ...base, buildings: [hq(3), { ...owned('parking'), level: 0 }] })).toBe(30);
  });

  it('les travaux finis, ses places comptent ; trois niveaux au plus', () => {
    let state = makeState({ money: 1e8, buildings: [hq(3)] });
    state = applyAction(state, { type: 'build', building: 'parking' }, T0).state;
    state = simulate(state, T0 + 10_000);
    expect(getCapacity(state)).toBe(15 + 5);
    expect(BUILDINGS.parking.maxLevel).toBe(3);
    expect(plain(effectText(BUILDINGS.parking, 3))).toBe('+15 places d’encadrement');
  });

  it('ses places sont hors de l’emprise du cabinet, sans chevauchement, à gauche de l’entrée', () => {
    for (const s of OFFICE_STAGES.filter((st) => st.stage >= 3)) {
      for (let level = 1; level <= 3; level++) {
        const stalls = parkingStalls(s.stage, level);
        expect(stalls.length).toBe(level * PARKING_STALLS_PER_LEVEL);
        const area = parkingRect(s.stage, level);
        expect(area.y).toBeGreaterThan(s.size.h);
        expect(area.x + area.w).toBeLessThan(s.entranceX - 0.5);
        stalls.forEach((a, i) => {
          expect(a.x >= area.x && a.y >= area.y && a.x + a.w <= area.x + area.w && a.y + a.h <= area.y + area.h, `place ${i}`).toBe(true);
          stalls.forEach((b, j) => i !== j && expect(overlap(a, b)).toBe(false));
        });
      }
    }
  });

  it('la vue ne montre le parking qu’une fois acheté et la caméra l’inclut', () => {
    const none = toOfficeView(makeState({ buildings: [hq(3)] }));
    expect(parkingLevel(none)).toBe(0);
    const view = toOfficeView(makeState({ buildings: [hq(3), owned('parking', 2)] }));
    expect(parkingLevel(view)).toBe(2);
    expect(planRect(view, 'parking')).toEqual(parkingRect(3, 2));
  });
});

describe('enseigne lumineuse et terrasse', () => {
  it('l’enseigne : dès le local voisin, +5 réputation, clients prestigieux 50 % plus fréquents', () => {
    expect(canBuild(makeState({ money: 1e6 }), 'signage')).toMatchObject({ ok: false, reason: 'requires_hq' });
    let state = makeState({ money: 1e6, buildings: [hq(2)] });
    state = applyAction(state, { type: 'build', building: 'signage' }, T0).state;
    state = simulate(state, T0 + 10_000);
    expect(state.reputation).toBe(1 + 5);
    expect(getEventWeight(state, 'prestigiousClient')).toBeCloseTo(EVENT_WEIGHTS.prestigiousClient * 1.5);
    expect(getEventWeight(state, 'resignation')).toBe(EVENT_WEIGHTS.resignation);
  });

  it('la terrasse : seulement à l’annexe (niveau 6), démissions −30 % par niveau, réputation toutes les minutes', () => {
    expect(canBuild(makeState({ money: 1e10, buildings: [hq(5)] }), 'terrace')).toMatchObject({ ok: false, reason: 'requires_hq' });
    expect(canBuild(makeState({ money: 1e10, buildings: [hq(6)] }), 'terrace')).toMatchObject({ ok: true, slotId: 'terrace' });
    const state = makeState({ buildings: [hq(6), owned('terrace', 3)] });
    expect(getEventWeight(state, 'resignation')).toBeCloseTo(EVENT_WEIGHTS.resignation * 0.1);
    expect(plain(effectText(BUILDINGS.terrace, 2))).toContain('Démissions −60 %');
  });
});

describe('l’annexe et le campus', () => {
  it('agrandissent le siège vers l’est puis vers le sud', () => {
    expect(getStage(6).size).toEqual({ w: 30, h: 15 });
    expect(getStage(7).size).toEqual({ w: 30, h: 20 });
  });

  it('se débloquent avec l’équipe demandée et ajoutent 10 % chacun', () => {
    const state = makeState({ money: 3e9, staff: staff(60), partners: 4, buildings: [hq(5)] });
    const { state: next, result } = applyAction(state, { type: 'upgradeBuilding', buildingId: 'hq' }, T0);
    expect(result.ok).toBe(true);
    expect(next.money).toBe(5e8);
    expect(applyAction({ ...state, partners: 3 }, { type: 'upgradeBuilding', buildingId: 'hq' }, T0).result.ok).toBe(false);
  });
});
