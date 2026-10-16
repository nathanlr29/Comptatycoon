import type { RefusalReason } from '../core/refusals';
import type { BuildingDefinition } from './buildings';
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
    case 'no_space':
      return 'Agrandissez le cabinet';
    case 'requires_hq':
      return `Bureau principal niv. ${threshold} requis`;
    case 'under_construction':
      return 'Travaux en cours';
    case 'max_level':
      return 'Niveau maximum atteint';
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

/** Conditions d'équipe manquantes pour agrandir le cabinet. */
export function expansionMissingText(staff: number, partners: number): string {
  const parts: string[] = [];
  if (staff > 0) parts.push(`${staff} collaborateur${staff > 1 ? 's' : ''} de plus`);
  if (partners > 0) parts.push(`${partners} associé${partners > 1 ? 's' : ''} de plus`);
  return `Il faut ${parts.join(' et ')}`;
}

export function expansionRequirementText(minStaff: number, minPartners: number): string {
  const parts = [`${minStaff} collaborateurs`];
  if (minPartners > 1) parts.push(`${minPartners} associés`);
  return `Équipe requise : ${parts.join(', ')}`;
}

const percent = (x: number) => `${Math.round(x * 100)}\u00a0%`;

/** Effet d'une pièce à un niveau donné (docs/GDD.md §6), pour les menus. */
export function effectText(def: BuildingDefinition, level: number): string {
  const { effect } = def;
  const parts: string[] = [];
  if (effect.globalPerLevel) parts.push(`Production globale +${percent(effect.globalPerLevel * level)}`);
  if (effect.rolesPerLevel) {
    const roles = effect.rolesPerLevel.roles.map((r) => `${STAFF[r].name.toLowerCase()}s`).join(' et ');
    parts.push(`${roles.charAt(0).toUpperCase()}${roles.slice(1)} +${percent(effect.rolesPerLevel.bonus * level)}`);
  }
  if (effect.reputationEveryMs) parts.push(`+${level} réputation toutes les ${durationText(effect.reputationEveryMs)}`);
  if (effect.reputationOnBuild) parts.push(`+${effect.reputationOnBuild} réputation à l’aménagement`);
  return parts.length > 0 ? parts.join(' · ') : 'Permet d’ouvrir le pôle';
}

/** Durée lisible : « 40 s », « 2 min », « 1 min 30 s ». */
export function durationText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min === 0) return `${sec}\u00a0s`;
  return sec === 0 ? `${min}\u00a0min` : `${min}\u00a0min ${sec}\u00a0s`;
}
