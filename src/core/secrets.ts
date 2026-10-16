import { CLICK_MILESTONES, KONAMI_SEQUENCE, LOST_LIASSE_CHANCE, SEASONS, SECRETS, type SecretId } from '../data/secrets';
import type { GameState } from './state';

export function hasSecret(state: GameState, id: SecretId): boolean {
  return state.secrets.includes(id);
}

/** Enregistre un secret (une seule fois) et sa récompense symbolique. Fonction pure. */
export function discoverSecret(state: GameState, id: SecretId): GameState {
  if (hasSecret(state, id)) return state;
  const reward = SECRETS[id].reward ?? 0;
  return { ...state, money: state.money + reward, secrets: [...state.secrets, id] };
}

/**
 * Ajoute un appui à la série. Déclenche quand `count` appuis tombent dans `windowMs` ;
 * la série repart alors de zéro.
 */
export function registerTap(taps: readonly number[], now: number, count: number, windowMs: number): { taps: number[]; triggered: boolean } {
  const recent = [...taps.filter((t) => now - t < windowMs), now];
  if (recent.length >= count) return { taps: [], triggered: true };
  return { taps: recent, triggered: false };
}

/**
 * Avance dans une suite de touches. Renvoie la nouvelle position ;
 * `sequence.length` = suite complète. Une erreur repart de zéro (ou de 1 si la touche ouvre la suite).
 */
export function advanceSequence(position: number, key: string, sequence: readonly string[] = KONAMI_SEQUENCE): number {
  const k = key.toLowerCase();
  if (position < sequence.length && sequence[position] === k) return position + 1;
  // ↑ ↑ ↑ : on reste sur « deux ↑ tapés » plutôt que de tout perdre.
  if (position === 2 && k === sequence[1] && sequence[0] === sequence[1]) return 2;
  return sequence[0] === k ? 1 : 0;
}

/** Saison du calendrier (date locale du joueur), s'il y en a une. */
export function getSeason(date: Date): (typeof SEASONS)[number] | undefined {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return SEASONS.find((s) => s.month === month && day >= s.fromDay && day <= s.toDay);
}

/** Palier de saisies franchi entre deux compteurs de clics. */
export function crossedClickMilestone(before: number, after: number): SecretId | undefined {
  return CLICK_MILESTONES.find((m) => before < m.clicks && after >= m.clicks)?.id;
}

/** `roll` dans [0, 1[ : la Période fiscale tirée est-elle la liasse perdue ? */
export function isLostLiasse(roll: number): boolean {
  return roll < LOST_LIASSE_CHANCE;
}
