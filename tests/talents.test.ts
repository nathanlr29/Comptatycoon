import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { canBuild, canUpgrade } from '../src/core/buildings';
import { getOfflineCapMs } from '../src/core/difficulty';
import { getClickValue, getHireCost } from '../src/core/economy';
import { getExpansionCost } from '../src/core/expansion';
import {
  canSellFirm,
  getContactsForSale,
  getNetworkTitle,
  getNextContactAt,
  getPrestigeMultiplier,
  getSaleBoost,
  isSaleWorthwhile,
} from '../src/core/prestige';
import { getAvailableContacts, getSpentContacts } from '../src/core/talents';
import type { BuildingState, GameState } from '../src/core/state';
import { getExpansionLevel } from '../src/data/expansion';
import { startItemsText, TALENT_IDS, TALENTS, type TalentLevels } from '../src/data/talents';
import { SCHEMA_VERSION, validateSave } from '../src/persistence/SaveSchema';
import { makeState, plain, T0 } from './helpers';

const firm = (level: number): BuildingState[] => [{ id: 'hq', type: 'headquarters', level, slotId: 'hq' }];

function networked(contacts: number, talents: TalentLevels = {}, patch: Partial<GameState> = {}): GameState {
  return makeState({ prestige: { contacts, sales: 1, pastEarned: 0, talents }, ...patch });
}

describe('atouts du réseau', () => {
  it('se paient en contacts sans réduire le bonus de production', () => {
    const before = networked(10);
    const { state, result } = applyAction(before, { type: 'buyTalent', id: 'headhunter' }, T0);
    expect(result).toEqual({ ok: true, amount: 5 });
    expect(state.prestige.talents.headhunter).toBe(1);
    expect(getSpentContacts(state)).toBe(5);
    expect(getAvailableContacts(state)).toBe(5);
    expect(getPrestigeMultiplier(state)).toBe(getPrestigeMultiplier(before));
  });

  it('refusent sans contacts suffisants ou au niveau maximum', () => {
    expect(applyAction(networked(2), { type: 'buyTalent', id: 'headhunter' }, T0).result).toEqual({ ok: false, reason: 'insufficient_contacts' });
    expect(applyAction(networked(99, { eagerBuyer: 1 }), { type: 'buyTalent', id: 'eagerBuyer' }, T0).result).toEqual({ ok: false, reason: 'max_level' });
    // 12 contacts dont 5 déjà engagés : le niveau 2 (20) reste hors de portée.
    expect(applyAction(networked(12, { headhunter: 1 }), { type: 'buyTalent', id: 'headhunter' }, T0).result).toEqual({ ok: false, reason: 'insufficient_contacts' });
  });

  it('ont chacun un prix par niveau, croissant, et un texte d’effet par niveau', () => {
    for (const id of TALENT_IDS) {
      const { costs, effect } = TALENTS[id];
      expect(costs.length).toBeGreaterThan(0);
      for (let i = 1; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1]!);
      for (let l = 1; l <= costs.length; l++) expect(effect(l)).not.toBe('');
    }
  });

  it('changent les règles : saisie, embauche, travaux, agrandissement, absence', () => {
    const plain = networked(0, {}, { money: 1e9 });
    const boosted = networked(0, { quickInput: 2, headhunter: 3, trustedBuilders: 1, friendlyLandlord: 2, trustedManager: 1 }, { money: 1e9 });
    expect(getClickValue(boosted, T0)).toBeCloseTo(getClickValue(plain, T0) * 4, 9);
    expect(getHireCost(boosted, 'junior')).toBe(Math.ceil(getHireCost(plain, 'junior') * 0.7));
    expect(canBuild(boosted, 'openSpace').durationMs).toBe(canBuild(plain, 'openSpace').durationMs * 0.75);
    const level2 = getExpansionLevel(2)!;
    expect(canUpgrade(boosted, 'hq').cost).toBe(Math.ceil(level2.cost * 0.6));
    expect(getExpansionCost(boosted, level2)).toBe(canUpgrade(boosted, 'hq').cost);
    expect(getOfflineCapMs(boosted)).toBe(getOfflineCapMs(plain) + 4 * 3_600_000);
  });

  it('« au départ » : appliqués au nouveau cabinet après la cession', () => {
    const before = networked(40, { seedCapital: 2, loyalTeam: 2, goodName: 1, coffeeHabit: 1, foundingPartner: 1 }, {
      buildings: firm(5),
      stats: { totalEarned: 1e8, clicks: 0, playMs: 0 },
    });
    const { state } = applyAction(before, { type: 'sellFirm' }, T0);
    expect(state.money).toBe(50_000);
    expect(state.staff.junior).toBe(6);
    expect(state.reputation).toBe(10);
    expect(state.partners).toBe(2);
    expect(state.coffee.machine).toBe(2);
    expect(state.prestige.talents).toEqual(before.prestige.talents);
    expect(state.stats.totalEarned).toBe(0); // l'apport n'est pas du chiffre d'affaires
  });

  it('« au départ » : un niveau acheté en cours de partie donne tout de suite la différence', () => {
    const before = networked(20, { seedCapital: 1 }, { money: 300 }); // niveau 2 : 15 contacts
    const { state } = applyAction(before, { type: 'buyTalent', id: 'seedCapital' }, T0);
    expect(state.money).toBe(300 + 49_000);
    const team = applyAction(networked(5), { type: 'buyTalent', id: 'loyalTeam' }, T0).state;
    expect(team.staff.junior).toBe(3);
  });

  it('résument ce qu’ils apportent au départ', () => {
    expect(plain(startItemsText({ seedCapital: 2, loyalTeam: 1, coffeeHabit: 2, headhunter: 1 }))).toBe('50 000 €, 3 juniors, expresso à grain');
    expect(startItemsText({})).toBe('');
  });
});

describe('cession plus attirante', () => {
  const seat = (patch: Partial<GameState> = {}) =>
    makeState({ buildings: firm(5), stats: { totalEarned: 1e8, clicks: 0, playMs: 0 }, ...patch });

  it('« Négociateur » augmente les contacts, « Repreneur pressé » permet de céder dès le niveau 4', () => {
    expect(getContactsForSale(seat({ prestige: { contacts: 0, sales: 0, pastEarned: 0, talents: { negotiator: 1 } } }))).toBe(12);
    const early = seat({ buildings: firm(4), prestige: { contacts: 0, sales: 0, pastEarned: 0, talents: { eagerBuyer: 1 } } });
    expect(canSellFirm(early).ok).toBe(true);
    expect(canSellFirm(seat({ buildings: firm(4) })).ok).toBe(false);
  });

  it('annonce le chiffre d’affaires du contact suivant', () => {
    const s = seat(); // 10 contacts à 100 M€ : le 11e à 121 M€
    expect(getNextContactAt(s)).toBe(121_000_000);
    expect(getContactsForSale(seat({ stats: { totalEarned: 121_000_000, clicks: 0, playMs: 0 } }))).toBe(11);
  });

  it('vaut le coup la première fois, puis quand elle double la production du réseau', () => {
    expect(isSaleWorthwhile(seat())).toBe(true);
    const ten = { contacts: 10, sales: 1, pastEarned: 0, talents: {} };
    expect(getSaleBoost(seat({ prestige: ten }))).toBeCloseTo(3 / 2, 9);
    expect(isSaleWorthwhile(seat({ prestige: ten }))).toBe(false);
    expect(isSaleWorthwhile(seat({ prestige: ten, stats: { totalEarned: 9e8, clicks: 0, playMs: 0 } }))).toBe(true); // +30 : ×2,0
  });

  it('donne un titre selon la taille du réseau', () => {
    expect(getNetworkTitle(0)).toBeNull();
    expect(getNetworkTitle(1)).toBe('Jeune confrère');
    expect(getNetworkTitle(57)).toBe('Figure régionale');
  });
});

describe('sauvegarde des atouts', () => {
  const save = (prestige: unknown) => ({ schemaVersion: SCHEMA_VERSION, savedAt: T0, state: { ...makeState(), prestige } });

  it('relit les atouts, ignore les inconnus et borne les niveaux', () => {
    const result = validateSave(save({ contacts: 5, sales: 1, pastEarned: 0, talents: { headhunter: 2, ghost: 3, eagerBuyer: 9 } }));
    expect(result.ok && result.save.state.prestige.talents).toEqual({ headhunter: 2, eagerBuyer: 1 });
  });

  it('les parties d’avant les atouts n’en ont aucun', () => {
    const result = validateSave(save({ contacts: 5, sales: 1, pastEarned: 0 }));
    expect(result.ok && result.save.state.prestige.talents).toEqual({});
  });
});
