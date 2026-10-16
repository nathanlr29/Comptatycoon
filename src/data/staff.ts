/** Collaborateurs recrutables (docs/GDD.md §4). Les associés sont gérés à part. */
export const STAFF_ROLES = ['intern', 'junior', 'senior', 'manager'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface StaffDefinition {
  role: StaffRole;
  name: string;
  description: string;
  baseCost: number;
  /** Production en €/s par collaborateur, avant multiplicateurs. */
  income: number;
  minReputation: number;
}

export const STAFF: Record<StaffRole, StaffDefinition> = {
  intern: {
    role: 'intern',
    name: 'Alternant',
    description: 'Saisit les pièces comptables entre deux jours de cours.',
    baseCost: 15,
    income: 0.5,
    minReputation: 0,
  },
  junior: {
    role: 'junior',
    name: 'Junior',
    description: 'Tient les dossiers des petites entreprises.',
    baseCost: 120,
    income: 4,
    minReputation: 0,
  },
  senior: {
    role: 'senior',
    name: 'Senior',
    description: 'Révise les bilans et prépare les liasses fiscales.',
    baseCost: 1_300,
    income: 30,
    minReputation: 5,
  },
  manager: {
    role: 'manager',
    name: 'Manager',
    description: 'Pilote un portefeuille de clients et une équipe.',
    baseCost: 14_000,
    income: 250,
    minReputation: 20,
  },
};

export const PARTNER = {
  name: 'Associé expert-comptable',
  description: 'Encadre jusqu’à 15 collaborateurs. Vous êtes le premier associé.',
} as const;
