import { TALENT_IDS, TALENT_VALUES, TALENTS, type TalentId } from '../data/talents';
import type { RefusalReason } from './refusals';
import type { GameState } from './state';

/** Niveau acheté d'un atout du réseau (docs/GDD.md §14 bis). */
export function getTalentLevel(state: GameState, id: TalentId): number {
  return state.prestige.talents[id] ?? 0;
}

export function getTalentMaxLevel(id: TalentId): number {
  return TALENTS[id].costs.length;
}

/** Contacts déjà engagés dans des atouts. */
export function getSpentContacts(state: GameState): number {
  let spent = 0;
  for (const id of TALENT_IDS) spent += TALENTS[id].costs.slice(0, getTalentLevel(state, id)).reduce((a, b) => a + b, 0);
  return spent;
}

/** Contacts encore à faire jouer (le bonus de production compte, lui, tous les contacts). */
export function getAvailableContacts(state: GameState): number {
  return Math.max(0, state.prestige.contacts - getSpentContacts(state));
}

export type TalentCheck = { ok: true; cost: number } | { ok: false; reason: RefusalReason; cost: number };

export function canBuyTalent(state: GameState, id: TalentId): TalentCheck {
  const level = getTalentLevel(state, id);
  const cost = TALENTS[id].costs[level] ?? 0;
  if (level >= getTalentMaxLevel(id)) return { ok: false, reason: 'max_level', cost };
  if (getAvailableContacts(state) < cost) return { ok: false, reason: 'insufficient_contacts', cost };
  return { ok: true, cost };
}

/**
 * Monte l'atout d'un niveau (à appeler après un `canBuyTalent` réussi). Un atout « au départ » donne aussi
 * tout de suite la différence avec le niveau précédent, pour que l'achat se voie dans la partie en cours.
 */
export function buyTalent(state: GameState, id: TalentId): GameState {
  const talents = { ...state.prestige.talents, [id]: getTalentLevel(state, id) + 1 };
  const next = { ...state, prestige: { ...state.prestige, talents } };
  return TALENTS[id].atStart ? grantStartingTalents(next, state) : next;
}

/** Valeur courante d'un atout (table `TALENT_VALUES`). */
export function talentValue(state: GameState, id: TalentId): number {
  const values: readonly number[] = TALENT_VALUES[id];
  return values[Math.min(getTalentLevel(state, id), values.length - 1)] ?? values[0]!;
}

/**
 * Ce que les atouts « au départ » donnent : tout, à un cabinet qui vient d'être fondé après une cession
 * (`before` absent), ou seulement ce qui a changé depuis `before` (achat d'un niveau en cours de partie).
 */
export function grantStartingTalents(state: GameState, before?: GameState): GameState {
  const gain = (id: TalentId) => talentValue(state, id) - (before ? talentValue(before, id) : TALENT_VALUES[id][0]);
  return {
    ...state,
    money: state.money + gain('seedCapital'),
    reputation: state.reputation + gain('goodName'),
    partners: Math.max(state.partners, talentValue(state, 'foundingPartner')),
    staff: { ...state.staff, junior: state.staff.junior + gain('loyalTeam') },
    coffee: { ...state.coffee, machine: Math.max(state.coffee.machine, talentValue(state, 'coffeeHabit')) },
  };
}
