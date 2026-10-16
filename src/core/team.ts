import { STAFF_ROLES, type StaffRole } from '../data/staff';
import type { GameState } from './state';

/** Catégories visibles dans le cabinet : les associés (joueur compris) et les collaborateurs. */
export type TeamRole = 'partner' | StaffRole;
export const TEAM_ROLES: readonly TeamRole[] = ['partner', ...[...STAFF_ROLES].reverse()];

/**
 * Une personne du cabinet. L'état ne garde que des effectifs par catégorie : la n-ième personne
 * d'une catégorie a l'id `${role}-${n}`. Un départ retire toujours la dernière arrivée (indemnité
 * calculée sur le dernier recruté), donc les autres gardent leur id.
 */
export interface TeamMember {
  id: string;
  role: TeamRole;
  /** Rang d'arrivée dans la catégorie (0 = premier). `partner-0` est le joueur. */
  rank: number;
}

export function getTeam(state: GameState): TeamMember[] {
  const team: TeamMember[] = [];
  for (const role of TEAM_ROLES) {
    const count = role === 'partner' ? state.partners : state.staff[role];
    for (let rank = 0; rank < count; rank++) team.push({ id: `${role}-${rank}`, role, rank });
  }
  return team;
}
