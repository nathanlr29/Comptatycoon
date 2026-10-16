import type { StaffRole } from './staff';

/** Équipements et logiciels à achat unique (docs/GDD.md §3 bis). */
export type UpgradeId =
  | 'dualScreen'
  | 'scanner'
  | 'keyboardShortcuts'
  | 'ocr'
  | 'ebics'
  | 'edi'
  | 'einvoicing'
  | 'reviewSoftware'
  | 'ged'
  | 'dashboards';

/** Effets multiplicatifs d'une amélioration ; un champ absent vaut ×1. */
export interface UpgradeEffect {
  click?: number;
  global?: number;
  roles?: Partial<Record<StaffRole, number>>;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  cost: number;
  effect: UpgradeEffect;
  /** Texte court de l'effet, affiché sous la description. */
  effectText: string;
  requires?: UpgradeId;
  minReputation?: number;
}

/** Dans l'ordre d'affichage (coût croissant). */
const LIST: UpgradeDefinition[] = [
  { id: 'dualScreen', name: 'Double écran', description: 'Saisie deux fois plus rapide.', cost: 50, effect: { click: 2 }, effectText: 'Saisie × 2' },
  { id: 'scanner', name: 'Scanner de documents', description: 'Les pièces papier sont numérisées en un seul passage.', cost: 150, effect: { roles: { intern: 2 } }, effectText: 'Alternants × 2' },
  { id: 'keyboardShortcuts', name: 'Raccourcis clavier', description: 'Plus besoin de la souris : saisie doublée.', cost: 500, effect: { click: 2 }, effectText: 'Saisie × 2' },
  { id: 'ocr', name: 'Logiciel OCR', description: 'Les factures scannées sont lues et pré-saisies automatiquement.', cost: 2_000, effect: { click: 3 }, effectText: 'Saisie × 3', requires: 'scanner' },
  { id: 'ebics', name: 'Connexion bancaire EBICS', description: 'Les relevés des clients arrivent seuls chaque matin : rapprochement bancaire express.', cost: 4_000, effect: { roles: { junior: 2 } }, effectText: 'Juniors × 2' },
  { id: 'edi', name: 'Télétransmission EDI', description: 'Liasses et déclarations envoyées aux impôts en un clic.', cost: 8_000, effect: { global: 1.1 }, effectText: 'Production + 10 %' },
  { id: 'einvoicing', name: 'Facture électronique', description: 'Les factures arrivent déjà structurées par la plateforme de dématérialisation.', cost: 12_000, effect: { roles: { intern: 1.5, junior: 1.5 } }, effectText: 'Alternants et juniors × 1,5', requires: 'ocr' },
  { id: 'reviewSoftware', name: 'Logiciel de révision', description: 'Dossiers de travail et contrôles de cohérence automatiques.', cost: 20_000, effect: { roles: { senior: 2 } }, effectText: 'Seniors × 2', minReputation: 5 },
  { id: 'ged', name: 'GED et portail client', description: 'Les clients déposent leurs pièces en ligne, tout est classé et retrouvé.', cost: 60_000, effect: { global: 1.25 }, effectText: 'Production + 25 %', requires: 'einvoicing' },
  { id: 'dashboards', name: 'Tableaux de bord clients', description: 'Indicateurs en temps réel pour piloter chaque portefeuille.', cost: 150_000, effect: { roles: { manager: 2 } }, effectText: 'Managers × 2', minReputation: 20 },
];

export const UPGRADES = Object.fromEntries(LIST.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDefinition>;
export const UPGRADE_IDS: UpgradeId[] = LIST.map((u) => u.id);
