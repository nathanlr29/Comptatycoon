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
    case 'missing_building':
      return 'Pièce requise';
    case 'nobody_to_dismiss':
      return 'Personne à licencier';
    case 'last_partner':
      return 'Vous restez le dernier associé';
    case 'team_too_large':
      return 'Trop de collaborateurs à encadrer';
    case 'team_too_small':
      return `${threshold} collaborateurs requis`;
    case 'no_space':
      return 'Agrandissez le cabinet';
    case 'requires_hq':
      return `Bureau principal niv. ${threshold} requis`;
    case 'under_construction':
      return 'Travaux en cours';
    case 'max_level':
      return 'Niveau maximum atteint';
    case 'cooling_down':
      return 'Le café coule encore';
    case 'unknown':
      return 'Impossible';
  }
}

/** « Cabinet niv. 3 requis » (niveau d'agrandissement). */
export function firmLevelText(level: number): string {
  return `Cabinet niv. ${level} requis`;
}

export function requiresText(name: string): string {
  return `Nécessite : ${name}`;
}

/** « Nécessite : Salle serveurs niv. 2 ». */
export function requiresBuildingText(building: BuildingDefinition, level: number): string {
  return requiresText(`${building.name} niv. ${level}`);
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
  if (effect.capacityPerLevel) parts.push(`+${effect.capacityPerLevel * level} places d’encadrement`);
  for (const [id, delta] of Object.entries(effect.eventWeightPerLevel ?? {})) {
    const pct = percent(Math.abs(delta * level));
    parts.push(id === 'resignation' ? `Démissions −${pct}` : id === 'prestigiousClient' ? `Clients prestigieux +${pct}` : `${id} ${pct}`);
  }
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

/** Notifications des événements aléatoires (docs/GDD.md §8). Montants déjà formatés par l'interface. */
export const EVENT_TEXTS = {
  fiscalPeriod: { title: 'Période fiscale !', body: 'Revenu ×2 pendant 20 s' },
  taxAuditLoss: (loss: string, reputation: number) => ({ title: 'Contrôle fiscal', body: `−${loss} · réputation ${reputation}` }),
  taxAuditSafe: { title: 'Contrôle fiscal sans suite', body: 'Le Pôle Juridique veillait · réputation +1' },
  resignation: (role: string) => ({ title: 'Démission', body: `Un ${role.toLowerCase()} quitte le cabinet` }),
  prestigiousClient: (bonus: string, reputation: number) => ({ title: 'Client prestigieux', body: `+${bonus} · réputation +${reputation}` }),
  fiscalBanner: (seconds: number) => `Période fiscale ×2 · ${seconds}\u00a0s`,
} as const;

export const OBJECTIVE_TEXTS = {
  heading: 'Objectif',
  claim: 'Réclamer',
  reward: (parts: string[]) => `Récompense : ${parts.join(' et ')}`,
  reputation: (n: number) => `${n} de réputation`,
  claimed: 'Objectif atteint',
} as const;

/** Compte à rebours compact : « 3:05 », « 0:24 ». */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Multiplicateur à la française : « 1,5 », « 2 ». */
export function multiplierText(m: number): string {
  return String(Math.round(m * 100) / 100).replace('.', ',');
}

/** Mode café (docs/GDD.md §8 bis). */
export const COFFEE_TEXTS = {
  button: 'Café',
  title: 'Pause café',
  intro: 'Toute l’équipe file à la machine et revient pleine d’énergie.',
  start: 'Lancer la pause café',
  effect: (multiplier: string, duration: string) => `Revenu ×${multiplier} pendant ${duration}`,
  cooldown: (duration: string) => `Une pause toutes les ${duration}`,
  active: (seconds: number) => `En pause · encore ${seconds}\u00a0s`,
  waiting: (duration: string) => `Prochaine pause dans ${duration}`,
  machineHeading: 'Machine à café',
  current: 'Machine actuelle',
  next: 'Machine suivante',
  maxed: 'Vous avez la meilleure machine du quartier.',
  started: (multiplier: string, duration: string) => ({ title: 'Pause café !', body: `Revenu ×${multiplier} pendant ${duration}` }),
  upgraded: (name: string) => ({ title: 'Nouvelle machine', body: name }),
  banner: (multiplier: string, seconds: number) => `Pause café ×${multiplier} · ${seconds}\u00a0s`,
} as const;
