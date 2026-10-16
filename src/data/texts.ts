import type { RefusalReason } from '../core/refusals';
import type { BuildingDefinition } from './buildings';
import { ZONES } from './map';
import { STAFF } from './staff';

/** Libellé de l'action manuelle selon le niveau du Bureau principal (docs/GDD.md §3). */
export function clickLabel(hqLevel: number): string {
  if (hqLevel >= 4) return 'Établir une liasse fiscale';
  if (hqLevel >= 2) return 'Réviser un bilan';
  return 'Saisir une facture';
}

export function refusalText(reason: RefusalReason, threshold = 0): string {
  switch (reason) {
    case 'insufficient_funds':
      return 'Fonds insuffisants';
    case 'capacity_full':
      return 'Capacité atteinte : recrutez un associé';
    case 'locked':
      return `Réputation ${threshold} requise`;
    case 'already_owned':
      return 'Acquis';
    case 'missing_prerequisite':
      return 'Prérequis manquant';
    case 'nobody_to_dismiss':
      return 'Personne à licencier';
    case 'last_partner':
      return 'Vous restez le dernier associé';
    case 'team_too_large':
      return 'Trop de collaborateurs à encadrer';
    case 'zone_locked':
      return 'Local pas encore loué';
    case 'slot_taken':
      return 'Emplacement occupé';
    case 'requires_hq':
      return `Bureau principal niv. ${threshold} requis`;
    case 'under_construction':
      return 'Travaux en cours';
    case 'max_level':
      return 'Niveau maximum';
    case 'unknown':
      return 'Impossible';
  }
}

export function requiresText(name: string): string {
  return `Nécessite : ${name}`;
}

/** Affiché après un premier appui sur « − ». */
export function confirmDismissText(amount: string): string {
  return `Touchez − encore : indemnité ${amount}`;
}

export function dismissRefusalText(reason: string): string {
  return `Départ impossible : ${reason.toLowerCase()}`;
}

const percent = (x: number) => `${Math.round(x * 100)}\u00a0%`;

/** Effet d'une pièce à un niveau donné (docs/GDD.md §6). Le Bureau principal compte à partir du niveau 2. */
export function effectText(def: BuildingDefinition, level: number): string {
  const { effect } = def;
  const levels = def.type === 'headquarters' ? level - 1 : level;
  const parts: string[] = [];
  if (def.type === 'headquarters' && levels === 0) return 'Production de base';
  if (effect.globalPerLevel) parts.push(`Production globale +${percent(effect.globalPerLevel * levels)}`);
  if (effect.rolesPerLevel) {
    const roles = effect.rolesPerLevel.roles.map((r) => `${STAFF[r].name.toLowerCase()}s`).join(' et ');
    parts.push(`${roles.charAt(0).toUpperCase()}${roles.slice(1)} +${percent(effect.rolesPerLevel.bonus * levels)}`);
  }
  if (effect.reputationEveryMs) parts.push(`+${levels} réputation toutes les ${durationText(effect.reputationEveryMs)}`);
  if (effect.reputationOnBuild) parts.push(`+${effect.reputationOnBuild} réputation à l’aménagement`);
  if (def.type === 'headquarters') {
    const zone = ZONES.find((z) => z.unlockLevel === level);
    if (zone && level > 1) parts.push(`ouvre ${zone.name}`);
  }
  if (parts.length === 0) return 'Prépare l’arrivée du pôle (bientôt)';
  return parts.join(' · ');
}

/** Durée lisible : « 40 s », « 2 min », « 1 min 30 s ». */
export function durationText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min === 0) return `${sec}\u00a0s`;
  return sec === 0 ? `${min}\u00a0min` : `${min}\u00a0min ${sec}\u00a0s`;
}
