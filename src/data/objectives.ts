import type { BuildingType } from './buildings';
import type { StaffRole } from './staff';

/** Objectifs (docs/GDD.md §9) : le fil conducteur des premières minutes, dans l'ordre. */
export type ObjectiveCondition =
  | { kind: 'clicks'; target: number }
  | { kind: 'staff'; role: StaffRole; target: number }
  | { kind: 'income'; target: number }
  | { kind: 'firmLevel'; target: number }
  | { kind: 'building'; type: BuildingType }
  | { kind: 'partners'; target: number }
  | { kind: 'departments'; target: number }
  | { kind: 'totalEarned'; target: number };

export interface ObjectiveReward {
  money?: number;
  reputation?: number;
}

export interface ObjectiveDefinition {
  id: string;
  title: string;
  condition: ObjectiveCondition;
  reward: ObjectiveReward;
}

export const OBJECTIVES: readonly ObjectiveDefinition[] = [
  { id: 'firstInvoices', title: 'Saisir 10 factures', condition: { kind: 'clicks', target: 10 }, reward: { money: 15 } },
  { id: 'interns5', title: 'Recruter 5 alternants', condition: { kind: 'staff', role: 'intern', target: 5 }, reward: { money: 60 } },
  { id: 'income10', title: 'Atteindre 10 €/s', condition: { kind: 'income', target: 10 }, reward: { reputation: 1 } },
  { id: 'expand2', title: 'Agrandir le cabinet', condition: { kind: 'firmLevel', target: 2 }, reward: { money: 300 } },
  { id: 'openSpace', title: 'Aménager l’open space', condition: { kind: 'building', type: 'openSpace' }, reward: { reputation: 2 } },
  { id: 'juniors5', title: 'Recruter 5 juniors', condition: { kind: 'staff', role: 'junior', target: 5 }, reward: { money: 800 } },
  { id: 'income100', title: 'Atteindre 100 €/s', condition: { kind: 'income', target: 100 }, reward: { reputation: 3 } },
  { id: 'firstSenior', title: 'Recruter un senior', condition: { kind: 'staff', role: 'senior', target: 1 }, reward: { money: 3_000 } },
  { id: 'meetingRoom', title: 'Aménager la salle de réunion', condition: { kind: 'building', type: 'meetingRoom' }, reward: { reputation: 3 } },
  { id: 'secondPartner', title: 'S’associer avec un deuxième expert-comptable', condition: { kind: 'partners', target: 2 }, reward: { money: 15_000 } },
  { id: 'firstDepartment', title: 'Ouvrir un premier pôle', condition: { kind: 'departments', target: 1 }, reward: { reputation: 5 } },
  { id: 'income1000', title: 'Atteindre 1 000 €/s', condition: { kind: 'income', target: 1_000 }, reward: { money: 60_000 } },
  { id: 'firmLevel5', title: 'Agrandir le cabinet au maximum', condition: { kind: 'firmLevel', target: 5 }, reward: { reputation: 10 } },
  { id: 'earned10M', title: 'Facturer 10 M€ au total', condition: { kind: 'totalEarned', target: 10_000_000 }, reward: { reputation: 10 } },
];

/** Objectifs affichés en même temps. */
export const VISIBLE_OBJECTIVES = 2;
