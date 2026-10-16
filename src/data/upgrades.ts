/** Améliorations à achat unique (docs/GDD.md §3). */
export type UpgradeId = 'dualScreen' | 'keyboardShortcuts';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  cost: number;
  /** Multiplicateur appliqué à la valeur du clic. */
  clickMultiplier: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  dualScreen: {
    id: 'dualScreen',
    name: 'Double écran',
    description: 'Saisie deux fois plus rapide.',
    cost: 50,
    clickMultiplier: 2,
  },
  keyboardShortcuts: {
    id: 'keyboardShortcuts',
    name: 'Raccourcis clavier',
    description: 'Plus besoin de la souris : saisie doublée.',
    cost: 500,
    clickMultiplier: 2,
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
