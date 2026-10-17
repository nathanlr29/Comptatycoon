import { NETWORK_TITLES, SALE } from '../data/prestige';
import { getDifficulty } from './difficulty';
import { getFirmLevel } from './expansion';
import type { RefusalReason } from './refusals';
import { createInitialState, type GameState } from './state';
import { grantStartingTalents, talentValue } from './talents';

/** Multiplicateur de production pour `contacts` contacts : 1 + 10 % par contact. */
export function networkMultiplier(contacts: number): number {
  return 1 + SALE.bonusPerContact * contacts;
}

/** Multiplicateur de production du carnet d'adresses. */
export function getPrestigeMultiplier(state: GameState): number {
  return networkMultiplier(state.prestige.contacts);
}

/** Facteur appliqué aux contacts de la cession : mode de difficulté × atout « Négociateur ». */
function contactFactor(state: GameState): number {
  return getDifficulty(state).contacts * talentValue(state, 'negotiator');
}

/** Contacts gagnés en cédant maintenant : floor(√(CA de la partie / 1 M€) × facteur). */
export function getContactsForSale(state: GameState): number {
  const earned = Math.max(0, state.stats.totalEarned);
  // Le petit epsilon évite qu'un produit flottant (1,2 × 2,5 = 2,999…) perde un contact.
  return Math.floor(Math.sqrt(earned / SALE.earnedPerContact) * contactFactor(state) + 1e-9);
}

/** Chiffre d'affaires de la partie à atteindre pour gagner un contact de plus à la cession. */
export function getNextContactAt(state: GameState): number {
  const target = getContactsForSale(state) + 1;
  return Math.ceil((target / contactFactor(state)) ** 2 * SALE.earnedPerContact);
}

/** Avancée vers le contact suivant, entre 0 et 1. */
export function getNextContactProgress(state: GameState): number {
  const value = Math.sqrt(Math.max(0, state.stats.totalEarned) / SALE.earnedPerContact) * contactFactor(state);
  return Math.min(1, Math.max(0, value - getContactsForSale(state)));
}

/** Niveau du cabinet à partir duquel la cession est possible (4 avec l'atout « Repreneur pressé »). */
export function getSaleMinFirmLevel(state: GameState): number {
  return talentValue(state, 'eagerBuyer');
}

/** Production après cession ÷ production du réseau actuel (×2 = la prochaine partie va deux fois plus vite). */
export function getSaleBoost(state: GameState): number {
  return networkMultiplier(state.prestige.contacts + getContactsForSale(state)) / getPrestigeMultiplier(state);
}

/** Titre du joueur selon la taille de son réseau, ou null sans contact. */
export function getNetworkTitle(contacts: number): string | null {
  return [...NETWORK_TITLES].reverse().find((t) => contacts >= t.min)?.title ?? null;
}

export type SaleCheck = { ok: true; contacts: number } | { ok: false; reason: RefusalReason; contacts: number };

/** Cession possible une fois le cabinet agrandi jusqu'au siège, et si elle rapporte au moins un contact. */
export function canSellFirm(state: GameState): SaleCheck {
  const contacts = getContactsForSale(state);
  if (getFirmLevel(state) < getSaleMinFirmLevel(state)) return { ok: false, reason: 'missing_prerequisite', contacts };
  if (contacts < 1) return { ok: false, reason: 'locked', contacts };
  return { ok: true, contacts };
}

/** Une cession qui vaut le coup : la première, ou une qui double au moins la production du réseau. */
export function isSaleWorthwhile(state: GameState): boolean {
  return canSellFirm(state).ok && (state.prestige.sales === 0 || getSaleBoost(state) >= SALE.worthwhileBoost);
}

/**
 * Nouvelle partie au petit bureau ; seuls la difficulté, le réseau (contacts et atouts), la date de fondation
 * et le temps de jeu sont gardés, puis les atouts « au départ » s'appliquent. Suppose `canSellFirm(...).ok`.
 */
export function sellFirm(state: GameState, contacts: number, now: number): GameState {
  const next = createInitialState(now, {
    difficulty: state.difficulty,
    createdAt: state.createdAt,
    prestige: {
      contacts: state.prestige.contacts + contacts,
      sales: state.prestige.sales + 1,
      pastEarned: state.prestige.pastEarned + state.stats.totalEarned,
      talents: state.prestige.talents,
    },
  });
  return grantStartingTalents({ ...next, stats: { ...next.stats, playMs: state.stats.playMs } });
}
