/** Placement des personnes sur les sièges. Pur (aucun Phaser) pour être testé. */
import type { TeamMember } from '../../core/team';

/** Point au sol devant un bureau, en coordonnées monde (bas-centre du personnage). */
export interface Seat {
  x: number;
  y: number;
  /** Bureau d'associé (plus cossu) ou poste de collaborateur. */
  kind: 'partner' | 'staff';
  /** Profondeur d'affichage (tri avec le mobilier, voir src/game/iso.ts). */
  depth: number;
}

/**
 * Attribue un siège à chaque personne en gardant les places déjà prises : une arrivée prend le
 * premier siège libre de son type, un départ libère le sien, personne d'autre ne bouge.
 * Sans siège libre, la personne n'est pas affichée (absente de la table renvoyée).
 */
export function assignSeats(previous: ReadonlyMap<string, number>, team: readonly TeamMember[], seats: readonly Seat[]): Map<string, number> {
  const next = new Map<string, number>();
  const taken = new Set<number>();
  for (const member of team) {
    const seat = previous.get(member.id);
    if (seat !== undefined && seats[seat]?.kind === kindOf(member)) {
      next.set(member.id, seat);
      taken.add(seat);
    }
  }
  for (const member of team) {
    if (next.has(member.id)) continue;
    const kind = kindOf(member);
    const seat = seats.findIndex((s, i) => s.kind === kind && !taken.has(i));
    if (seat === -1) continue;
    next.set(member.id, seat);
    taken.add(seat);
  }
  return next;
}

function kindOf(member: TeamMember): Seat['kind'] {
  return member.role === 'partner' ? 'partner' : 'staff';
}

/** Tenue choisie à partir de l'id : la même personne garde toujours la même apparence. */
export function lookIndex(id: string, looks: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) % looks;
}
