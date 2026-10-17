import { describe, expect, it } from 'vitest';
import { canBuild } from '../src/core/buildings';
import { isLunchTime } from '../src/core/canteen';
import { getMultipliers } from '../src/core/economy';
import { getEventWeight } from '../src/core/events';
import type { BuildingState, GameState } from '../src/core/state';
import { BUILDINGS } from '../src/data/buildings';
import { CANTEEN_LEVELS, CANTEEN_ROOM, canteenSeats } from '../src/data/canteen';
import { EVENT_WEIGHTS } from '../src/data/events';
import { roomFurnitureAt } from '../src/data/office';
import { effectText, levelText } from '../src/data/texts';
import { parseSave, serializeSave } from '../src/persistence/SaveSchema';
import { makeState, T0 } from './helpers';

const hq = (level: number): BuildingState => ({ id: 'hq', type: 'headquarters', level, slotId: 'hq' });
const canteen = (level: number): BuildingState => ({ id: 'canteen', type: 'canteen', level, slotId: 'canteen' });
const firm = (buildings: BuildingState[], patch: Partial<GameState> = {}) => makeState({ money: 1e12, buildings, ...patch });

describe('cantine', () => {
  it('ne s’aménage qu’au Campus (niveau 7 du cabinet)', () => {
    expect(canBuild(firm([hq(6)]), 'canteen')).toMatchObject({ ok: false, reason: 'requires_hq' });
    expect(BUILDINGS.canteen.requiresHq).toBe(CANTEEN_ROOM.minStage);
  });

  it('a quatre niveaux nommés, de la kitchenette au restaurant d’entreprise', () => {
    expect(BUILDINGS.canteen.maxLevel).toBe(CANTEEN_LEVELS.length);
    expect(BUILDINGS.canteen.upgradeCosts).toHaveLength(CANTEEN_LEVELS.length - 1);
    expect(levelText(BUILDINGS.canteen, 1)).toBe('niv. 1 · Kitchenette');
    expect(levelText(BUILDINGS.canteen, 4)).toBe('niv. 4 · Restaurant d’entreprise');
    expect(levelText(BUILDINGS.openSpace, 2)).toBe('niv. 2');
  });

  it('rend l’équipe plus productive (+4 % par niveau)', () => {
    const without = getMultipliers(firm([hq(7)])).global;
    expect(getMultipliers(firm([hq(7), canteen(2)])).global / without).toBeCloseTo(1.08);
    // Pendant le premier chantier (niveau 0), rien
    expect(getMultipliers(firm([hq(7), canteen(0)])).global).toBeCloseTo(without);
  });

  it('rend les démissions moins fréquentes, les autres événements inchangés', () => {
    const base = EVENT_WEIGHTS.resignation;
    expect(getEventWeight(firm([hq(7)]), 'resignation')).toBeCloseTo(base);
    expect(getEventWeight(firm([hq(7), canteen(0)]), 'resignation')).toBeCloseTo(base);
    expect(getEventWeight(firm([hq(7), canteen(4)]), 'resignation')).toBeCloseTo(base * 0.4);
    const state = firm([hq(7), canteen(2)]);
    expect(getEventWeight(state, 'resignation')).toBeCloseTo(base * 0.7);
    expect(getEventWeight(state, 'taxAudit')).toBe(EVENT_WEIGHTS.taxAudit);
    expect(effectText(BUILDINGS.canteen, 4)).toContain('Démissions −60');
  });

  it('se meuble davantage à chaque niveau', () => {
    const counts = CANTEEN_LEVELS.map((l) => roomFurnitureAt(CANTEEN_ROOM, l.level).length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1] as number);
    expect(roomFurnitureAt(CANTEEN_ROOM, 1).map((f) => f.type)).toEqual(['kitchenette', 'canteenTable']);
    expect(roomFurnitureAt(CANTEEN_ROOM, 4).some((f) => f.type === 'kitchen')).toBe(true);
    // Deux places assises par table, dans la pièce
    expect(canteenSeats(1)).toHaveLength(2);
    expect(canteenSeats(4)).toHaveLength(12);
    const { x, y, w, h } = CANTEEN_ROOM.rect;
    for (const s of canteenSeats(4)) expect(s.x > x && s.x < x + w && s.y > y && s.y < y + h).toBe(true);
  });

  it('déjeuner de 12 h à 13 h 30, heure du joueur', () => {
    expect(isLunchTime(11.99)).toBe(false);
    expect(isLunchTime(12)).toBe(true);
    expect(isLunchTime(13.4)).toBe(true);
    expect(isLunchTime(13.5)).toBe(false);
  });

  it('est relue par la sauvegarde', () => {
    const state = firm([hq(7), canteen(3)]);
    const parsed = parseSave(serializeSave(state, T0));
    expect(parsed.ok && parsed.save.state.buildings.find((b) => b.type === 'canteen')?.level).toBe(3);
  });
});

describe('plan de la cantine', () => {
  it('aucun meuble n’en chevauche un autre, tout tient dans la pièce', async () => {
    const { CANTEEN_SIZES } = await import('../src/game/canteenFurniture');
    const sizes: Record<string, readonly [number, number]> = { ...CANTEEN_SIZES, plant: [0.6, 0.6] };
    const rects = roomFurnitureAt(CANTEEN_ROOM, 4).map((f) => {
      const [w, h] = sizes[f.type] as readonly [number, number];
      // Chaises des tables comprises (0,35 case de chaque côté)
      return f.type === 'canteenTable' ? { x: f.x, y: f.y - 0.35, w, h: h + 0.7 } : { x: f.x, y: f.y, w, h };
    });
    const r = CANTEEN_ROOM.rect;
    for (const a of rects) {
      expect(a.x >= r.x && a.y >= r.y && a.x + a.w <= r.x + r.w && a.y + a.h <= r.y + r.h, JSON.stringify(a)).toBe(true);
      for (const b of rects) if (a !== b) expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h, `${JSON.stringify(a)} ${JSON.stringify(b)}`).toBe(false);
    }
  });
});
