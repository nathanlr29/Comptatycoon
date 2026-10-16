import type { RefusalReason } from '../core/recruitment';

/** Libellé de l'action manuelle selon le niveau du Bureau principal (docs/GDD.md §3). */
export function clickLabel(hqLevel: number): string {
  if (hqLevel >= 4) return 'Établir une liasse fiscale';
  if (hqLevel >= 2) return 'Réviser un bilan';
  return 'Saisir une facture';
}

export function refusalText(reason: RefusalReason, minReputation = 0): string {
  switch (reason) {
    case 'insufficient_funds':
      return 'Fonds insuffisants';
    case 'capacity_full':
      return 'Capacité atteinte : recrutez un associé';
    case 'locked':
      return `Réputation ${minReputation} requise`;
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
    case 'max_level':
      return 'Niveau maximum atteint';
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
