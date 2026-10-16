import type { StaffRole } from './staff';

/** Pôles du cabinet (docs/GDD.md §7). Valeurs d'équilibrage de départ. */
export type DepartmentId = 'social' | 'legal' | 'advisory';

/** Type de la pièce « Locaux … » qui permet d'acheter le pôle (docs/GDD.md §6). */
export type DepartmentBuildingType = 'socialWing' | 'legalWing' | 'advisoryWing';

/** Effets d'un pôle ; un champ absent n'a pas d'effet. */
export interface DepartmentEffect {
  /** Production fixe ajoutée en €/s, avant les multiplicateurs globaux. */
  flatIncome?: number;
  /** Multiplicateur de production globale. */
  global?: number;
  /** Multiplicateurs par catégorie de collaborateurs. */
  roles?: Partial<Record<StaffRole, number>>;
  /** Le contrôle fiscal n'a plus d'effet négatif (docs/GDD.md §8). */
  taxAuditImmunity?: boolean;
}

export interface DepartmentDefinition {
  id: DepartmentId;
  name: string;
  /** Métiers du pôle, affichés sous le nom. */
  tagline: string;
  description: string;
  cost: number;
  /** Pièce à aménager avant l'achat. */
  requiresBuilding: DepartmentBuildingType;
  /** Nom de cette pièce, pour « Nécessite : … ». */
  buildingName: string;
  minReputation: number;
  effect: DepartmentEffect;
  /** Texte court de l'effet. */
  effectText: string;
}

/** Dans l'ordre d'affichage (coût croissant). */
const LIST: DepartmentDefinition[] = [
  {
    id: 'social',
    name: 'Pôle Social',
    tagline: 'Paie, DSN',
    description: 'Les bulletins de paie et les déclarations sociales de vos clients, faits maison.',
    cost: 20_000,
    requiresBuilding: 'socialWing',
    buildingName: 'Locaux Pôle Social',
    minReputation: 15,
    effect: { flatIncome: 150, roles: { junior: 1.5 } },
    effectText: '+150 €/s · Juniors × 1,5',
  },
  {
    id: 'legal',
    name: 'Pôle Juridique',
    tagline: 'Secrétariat, AG, statuts',
    description: 'Approbation des comptes, assemblées et statuts : vos dossiers sont inattaquables.',
    cost: 60_000,
    requiresBuilding: 'legalWing',
    buildingName: 'Locaux Pôle Juridique',
    minReputation: 25,
    effect: { taxAuditImmunity: true, roles: { senior: 1.5 } },
    effectText: 'Immunité au contrôle fiscal · Seniors × 1,5',
  },
  {
    id: 'advisory',
    name: 'Pôle Conseil & Audit',
    tagline: 'Fiscal, stratégie, CAC',
    description: 'Conseil fiscal, stratégie et commissariat aux comptes pour les grands clients.',
    cost: 400_000,
    requiresBuilding: 'advisoryWing',
    buildingName: 'Locaux Conseil & Audit',
    minReputation: 50,
    effect: { global: 2, roles: { manager: 1.5 } },
    effectText: 'Production × 2 · Managers × 1,5',
  },
];

export const DEPARTMENTS = Object.fromEntries(LIST.map((d) => [d.id, d])) as Record<DepartmentId, DepartmentDefinition>;
export const DEPARTMENT_IDS = LIST.map((d) => d.id);

/** Réputation gagnée à l'ouverture d'un pôle (docs/GDD.md §2). */
export const DEPARTMENT_REPUTATION = 5;

/** Rachat de portefeuille clients : achat répétable, débloqué par le Pôle Social (docs/GDD.md §7). */
export const PORTFOLIO = {
  name: 'Rachat de portefeuille clients',
  description: 'Un confrère part à la retraite : reprenez ses clients.',
  requires: 'social' as DepartmentId,
  baseCost: 10_000,
  costGrowth: 1.5,
  /** Production globale +5 % par rachat (bonus additif : 1 + 0,05 × n). */
  globalBonusEach: 0.05,
  reputationEach: 2,
  effectText: 'Production +5 % · +2 réputation',
} as const;

/** Effet du contrôle fiscal selon la protection du Pôle Juridique (docs/GDD.md §8). */
export const TAX_AUDIT = {
  /** Perte = min(part du solde, secondes de revenu). */
  maxLossShare: 0.1,
  maxLossIncomeSeconds: 300,
  reputationLoss: 2,
  /** Avec le Pôle Juridique. */
  protectedReputationGain: 1,
} as const;
