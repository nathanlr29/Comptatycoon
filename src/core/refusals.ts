/** Raisons pour lesquelles le moteur refuse une action (affichées par l'interface). */
export type RefusalReason =
  | 'insufficient_funds'
  | 'capacity_full'
  | 'locked'
  | 'already_owned'
  | 'missing_prerequisite'
  | 'missing_building'
  | 'nobody_to_dismiss'
  | 'last_partner'
  | 'team_too_large'
  | 'team_too_small'
  | 'no_space'
  | 'requires_hq'
  | 'under_construction'
  | 'max_level'
  | 'cooling_down'
  | 'unknown';
