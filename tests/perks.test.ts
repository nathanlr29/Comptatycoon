import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { canTakeCoffeeBreak } from '../src/core/coffee';
import { getHireCost, getMultipliers } from '../src/core/economy';
import { getEventWeight } from '../src/core/events';
import { catchUpOffline } from '../src/core/offline';
import { getPerkEffects } from '../src/core/perks';
import { canDismissPartner, getCapacity } from '../src/core/recruitment';
import { canBuyUpgrade } from '../src/core/upgrades';
import type { GameState } from '../src/core/state';
import { OFFICE_STAGES, ROOMS, deskRect, getStage, type TileRect } from '../src/data/office';
import { MIN_RESIGNATION_FACTOR, PERK_CATALOG, PERK_ITEMS, perkItemStage, perkSummaryText, type PerkId } from '../src/data/perks';
import { UPGRADES, type UpgradeId } from '../src/data/upgrades';
import { toOfficeView } from '../src/game/officeView';
import { visiblePerkItems } from '../src/game/perkFurniture';
import { parseSave, serializeSave } from '../src/persistence/SaveSchema';
import { makeState, plain, T0 } from './helpers';

const PERK_IDS = Object.keys(PERK_CATALOG) as PerkId[];
const HOUR = 3_600_000;
const overlap = (a: TileRect, b: TileRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const atLevel = (level: number, patch: Partial<GameState> = {}): GameState =>
  makeState({ buildings: [{ id: 'hq', type: 'headquarters', level, slotId: 'hq' }], money: 1e9, reputation: 100, ...patch });

/** Emprise au sol des meubles de office.ts (approximée large : 2 × 2 cases au plus, coin du fond donné). */
const FURNITURE_SIZE: Record<string, [number, number]> = {
  plant: [0.6, 0.6], cabinet: [0.6, 0.5], bookshelf: [0.9, 0.35], sofa: [1.6, 0.7], meetingTable: [2, 1.1], rack: [0.7, 0.6],
  printer: [0.7, 0.55], coffee: [1.2, 0.5], reception: [1.8, 0.6], whiteboard: [1.3, 0.12], fountain: [2, 2], bench: [1.4, 0.5],
};

describe('confort des équipes : catalogue', () => {
  it('chaque avantage est de la rubrique confort et a un visuel', () => {
    // Bureaux assis-debout : les postes changent. Titres-restaurant, chèques-vacances : une feuille au tableau du CSE.
    const noItem: PerkId[] = ['standingDesks', 'mealVouchers', 'holidayVouchers'];
    for (const id of PERK_IDS) {
      expect(UPGRADES[id].category).toBe('comfort');
      if (!noItem.includes(id)) expect(PERK_ITEMS[id], id).toBeDefined();
    }
    expect(visiblePerkItems(['cse', 'holidayVouchers'], 2)[0]!.key).toBe('perk:noticeBoard:cse+holidayVouchers');
  });

  it('chaque objet tient dans son niveau, hors des pièces, des postes et du mobilier', () => {
    for (const id of PERK_IDS) {
      const item = PERK_ITEMS[id];
      if (!item || item.wall) continue;
      const stage = perkItemStage(id);
      for (let s = stage; s <= OFFICE_STAGES.length; s++) {
        const { w, h } = getStage(s).size;
        expect(item.x >= 0 && item.y >= 0 && item.x + item.w <= w && item.y + item.h <= h, `${id} niveau ${s}`).toBe(true);
        for (const room of ROOMS.filter((r) => r.minStage <= s)) expect(overlap(item, room.rect), `${id} dans ${room.type}`).toBe(false);
        for (const st of OFFICE_STAGES.filter((o) => o.stage <= s)) {
          for (const d of st.desks) expect(overlap(item, deskRect(d)) || overlap(item, { x: d.x - 0.3, y: d.y - 0.3, w: 0.6, h: 0.6 }), `${id} / poste ${d.x},${d.y}`).toBe(false);
          for (const f of st.furniture) {
            const [fw, fh] = FURNITURE_SIZE[f.type] ?? [2, 2];
            expect(overlap(item, { x: f.x, y: f.y, w: fw, h: fh }), `${id} / ${f.type} ${f.x},${f.y}`).toBe(false);
          }
        }
      }
      for (const other of PERK_IDS) {
        const o = PERK_ITEMS[other];
        if (o && o !== item && o.type !== item.type && !o.wall) expect(overlap(item, o), `${id} / ${other}`).toBe(false);
      }
    }
  });

  it('le mur ouest de la photo existe dès son niveau (hors des pièces du mur)', () => {
    const photo = PERK_ITEMS.teamBuilding!;
    expect(photo.y + photo.h).toBeLessThanOrEqual(getStage(perkItemStage('teamBuilding')).size.h);
    for (const room of ROOMS.filter((r) => r.rect.x === 0)) expect(photo.y >= room.rect.y + room.rect.h || photo.y + photo.h <= room.rect.y, room.type).toBe(true);
  });

  it('rien n’est dessiné tant que rien n’est acheté ; le tableau du CSE est unique', () => {
    expect(visiblePerkItems([], 5)).toEqual([]);
    expect(toOfficeView(atLevel(3)).perks).toEqual([]);
    const items = visiblePerkItems(['mutuelle', 'cse', 'mealVouchers'], 5);
    expect(items).toHaveLength(1);
    expect(items[0]!.key).toBe('perk:noticeBoard:mutuelle+cse+mealVouchers');
    // Un objet dont la place n'existe pas encore n'est pas dessiné.
    expect(visiblePerkItems(['billiard'], 2)).toEqual([]);
  });
});

describe('confort des équipes : conditions', () => {
  it('le CSE demande le niveau 2 du cabinet et 11 collaborateurs', () => {
    const staff = { intern: 5, junior: 5, senior: 0, manager: 0 };
    expect(canBuyUpgrade(atLevel(1, { staff: { ...staff, junior: 6 } }), 'cse')).toMatchObject({ ok: false, reason: 'requires_hq' });
    expect(canBuyUpgrade(atLevel(2, { staff }), 'cse')).toMatchObject({ ok: false, reason: 'team_too_small' });
    const { state, result } = applyAction(atLevel(2, { staff: { ...staff, junior: 6 }, reputation: 0 }), { type: 'buyUpgrade', id: 'cse' }, T0);
    expect(result.ok).toBe(true);
    expect(state.reputation).toBe(3);
  });

  it('les titres-restaurant demandent le CSE ; les bureaux assis-debout, les sièges ergonomiques', () => {
    expect(canBuyUpgrade(atLevel(2), 'mealVouchers')).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
    expect(canBuyUpgrade(atLevel(1), 'standingDesks')).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
    expect(canBuyUpgrade(atLevel(1, { upgrades: ['ergoChairs'] }), 'standingDesks').ok).toBe(true);
  });
});

describe('confort des équipes : effets', () => {
  it('chaque avantage réduit les démissions, jamais sous le plancher', () => {
    const base = getEventWeight(makeState(), 'resignation');
    expect(getEventWeight(makeState({ upgrades: ['fruitBasket'] }), 'resignation')).toBeCloseTo(base * 0.9);
    const all = makeState({ upgrades: PERK_IDS as UpgradeId[] });
    expect(getPerkEffects(all).resignation).toBeGreaterThanOrEqual(MIN_RESIGNATION_FACTOR);
    expect(getPerkEffects(all).resignation).toBeLessThan(0.5);
    expect(getEventWeight(all, 'taxAudit')).toBe(getEventWeight(makeState(), 'taxAudit'));
  });

  it('la mutuelle et les titres-restaurant baissent le prix d’embauche', () => {
    const before = getHireCost(makeState(), 'junior');
    expect(getHireCost(makeState({ upgrades: ['mutuelle', 'mealVouchers'] }), 'junior')).toBe(Math.ceil(before * 0.95 * 0.9));
  });

  it('les jeux et les bureaux assis-debout augmentent la production', () => {
    const base = getMultipliers(makeState()).global;
    expect(getMultipliers(makeState({ upgrades: ['standingDesks', 'billiard'] })).global).toBeCloseTo(base * 1.08 * 1.1);
  });

  it('le Séminaire annuel ajoute 2 places par associé, aussi pour le départ d’un associé', () => {
    const state = makeState({ partners: 2, staff: { intern: 17, junior: 0, senior: 0, manager: 0 }, money: 1e9 });
    expect(getCapacity(state)).toBe(30);
    expect(canDismissPartner(state)).toMatchObject({ ok: false, reason: 'team_too_large' });
    const team = { ...state, upgrades: ['cse', 'teamBuilding'] as UpgradeId[] };
    expect(getCapacity(team)).toBe(34);
    expect(canDismissPartner(team).ok).toBe(true);
  });

  it('le télétravail compte 4 h d’absence de plus', () => {
    const state = makeState({ staff: { intern: 1, junior: 0, senior: 0, manager: 0 } });
    const base = catchUpOffline(state, T0 + 24 * HOUR).report.creditedMs;
    const remote = catchUpOffline({ ...state, upgrades: ['remoteWork'] }, T0 + 24 * HOUR).report.creditedMs;
    expect(remote - base).toBe(4 * HOUR);
  });

  it('le coin sieste rend la pause café disponible 25 % plus tôt', () => {
    const state = atLevel(2, { upgrades: ['napCorner'] });
    const after = applyAction(state, { type: 'coffeeBreak' }, T0).state;
    expect(after.coffee.readyAt).toBe(T0 + 0.75 * 5 * 60_000);
    expect(canTakeCoffeeBreak(after, T0 + 0.75 * 5 * 60_000).ok).toBe(true);
  });

  it('le bilan de l’onglet résume les effets cumulés', () => {
    expect(plain(perkSummaryText(getPerkEffects(makeState({ upgrades: ['mutuelle', 'remoteWork'] }))))).toBe('Démissions − 28 % · recrutement − 5 % · absence + 4 h');
  });

  it('les avantages achetés sont relus de la sauvegarde', () => {
    const state = atLevel(3, { upgrades: ['fruitBasket', 'cse', 'billiard'] });
    const parsed = parseSave(serializeSave(state, T0));
    expect(parsed.ok && parsed.save.state.upgrades).toEqual(['fruitBasket', 'cse', 'billiard']);
  });
});
