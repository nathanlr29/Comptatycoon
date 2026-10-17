/**
 * Atouts du réseau (docs/GDD.md §14 bis) : achetés avec les contacts gagnés en cédant le cabinet.
 * Faire jouer un contact ne le retire pas du réseau : le bonus de production (+10 % par contact) reste.
 * Les atouts sont gardés d'une cession à l'autre ; ceux « au départ » donnent leur effet tout de suite, puis à chaque nouveau cabinet.
 */
export const TALENT_IDS = [
  'quickInput',
  'seedCapital',
  'loyalTeam',
  'goodName',
  'coffeeHabit',
  'headhunter',
  'trustedBuilders',
  'friendlyLandlord',
  'trustedManager',
  'foundingPartner',
  'negotiator',
  'eagerBuyer',
] as const;
export type TalentId = (typeof TALENT_IDS)[number];

/** Niveau de chaque atout acheté (absent = 0). */
export type TalentLevels = Partial<Record<TalentId, number>>;

export interface TalentDefinition {
  name: string;
  description: string;
  /** Prix en contacts de chaque niveau : `costs[0]` pour le niveau 1, etc. Le nombre de niveaux est `costs.length`. */
  costs: readonly number[];
  /** Effet au niveau donné (≥ 1), en texte. */
  effect: (level: number) => string;
  /** Effet appliqué à chaque nouveau départ plutôt que tout de suite. */
  atStart?: boolean;
}

/** Valeur de chaque niveau ; l'index 0 est l'absence d'atout. */
export const TALENT_VALUES = {
  quickInput: [1, 2, 4, 8],
  seedCapital: [0, 1_000, 50_000, 5_000_000],
  loyalTeam: [0, 3, 6, 10],
  goodName: [0, 10, 25, 50],
  coffeeHabit: [1, 2, 3, 4],
  headhunter: [1, 0.9, 0.8, 0.7],
  trustedBuilders: [1, 0.75, 0.5],
  friendlyLandlord: [1, 0.8, 0.6],
  trustedManager: [0, 4 * 3_600_000, 8 * 3_600_000],
  foundingPartner: [1, 2],
  negotiator: [1, 1.2, 1.4, 1.6],
  eagerBuyer: [5, 4],
} as const satisfies Record<TalentId, readonly number[]>;

const euros = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR')} M€` : `${n.toLocaleString('fr-FR')} €`);
const percent = (factor: number) => `${Math.round(Math.abs(1 - factor) * 100)} %`;

export const TALENTS: Record<TalentId, TalentDefinition> = {
  quickInput: {
    name: 'Saisie éclair',
    description: 'Vos réflexes de vieux routier de la saisie.',
    costs: [1, 5, 20],
    effect: (l) => `Saisie manuelle ×${TALENT_VALUES.quickInput[l]}`,
  },
  seedCapital: {
    name: 'Apport personnel',
    description: 'Une part du prix de cession réinvestie dans le cabinet suivant.',
    costs: [3, 15, 60],
    effect: (l) => `Départ avec ${euros(TALENT_VALUES.seedCapital[l] ?? 0)}`,
    atStart: true,
  },
  loyalTeam: {
    name: 'Équipe fidèle',
    description: 'Vos meilleurs juniors vous suivent dans la nouvelle aventure.',
    costs: [3, 10, 40],
    effect: (l) => `Départ avec ${TALENT_VALUES.loyalTeam[l]} juniors`,
    atStart: true,
  },
  goodName: {
    name: 'Nom connu',
    description: 'Les clients se souviennent de vous : la réputation ne part plus de zéro.',
    costs: [5, 15, 50],
    effect: (l) => `Départ avec ${TALENT_VALUES.goodName[l]} de réputation`,
    atStart: true,
  },
  coffeeHabit: {
    name: 'Fidèle à sa machine',
    description: 'Vous emportez la machine à café. Personne ne s’en étonne.',
    costs: [2, 8, 25],
    effect: (l) => ['', 'Départ avec la machine à capsules', 'Départ avec l’expresso à grain', 'Départ avec le comptoir de barista'][l] ?? '',
    atStart: true,
  },
  headhunter: {
    name: 'Chasseur de têtes',
    description: 'Votre carnet vous ouvre les meilleurs profils.',
    costs: [5, 20, 60],
    effect: (l) => `Embauches −${percent(TALENT_VALUES.headhunter[l] ?? 1)}`,
  },
  trustedBuilders: {
    name: 'Artisans de confiance',
    description: 'Les mêmes entreprises de travaux, à chaque fois.',
    costs: [10, 40],
    effect: (l) => `Durée des travaux −${percent(TALENT_VALUES.trustedBuilders[l] ?? 1)}`,
  },
  friendlyLandlord: {
    name: 'Bailleur ami',
    description: 'Un propriétaire qui préfère un locataire sérieux à un gros loyer.',
    costs: [8, 30],
    effect: (l) => `Agrandissements −${percent(TALENT_VALUES.friendlyLandlord[l] ?? 1)}`,
  },
  trustedManager: {
    name: 'Bras droit',
    description: 'Quelqu’un tient la boutique quand vous n’êtes pas là.',
    costs: [5, 20],
    effect: (l) => `Absence créditée +${(TALENT_VALUES.trustedManager[l] ?? 0) / 3_600_000} h`,
  },
  foundingPartner: {
    name: 'Associé de toujours',
    description: 'Votre associé repart avec vous, et ses 15 places d’encadrement aussi.',
    costs: [20],
    effect: () => 'Départ avec 2 associés',
    atStart: true,
  },
  negotiator: {
    name: 'Négociateur',
    description: 'Vous savez faire monter les enchères au moment de céder.',
    costs: [10, 40, 120],
    effect: (l) => `Contacts à la cession +${percent(TALENT_VALUES.negotiator[l] ?? 1)}`,
  },
  eagerBuyer: {
    name: 'Repreneur pressé',
    description: 'Un confrère guette votre cabinet et n’attend pas le siège.',
    costs: [50],
    effect: () => 'Cession possible dès l’étage complet (niveau 4)',
  },
};

/** Ce que les atouts « au départ » apportent, en liste courte : « 50 k€, 6 juniors ». */
export function startItemsText(levels: TalentLevels): string {
  return TALENT_IDS.filter((id) => TALENTS[id].atStart && (levels[id] ?? 0) > 0)
    .map((id) => TALENTS[id].effect(levels[id]!).replace(/^Départ avec (la |l’)?/, ''))
    .join(', ');
}

export const TALENT_TEXTS = {
  heading: 'Atouts du réseau',
  lead: 'Faites jouer vos contacts : un contact dépensé reste dans votre réseau et garde son bonus de production. Les atouts sont acquis pour toujours.',
  available: (n: string, total: string) => `${n} à faire jouer, sur ${total} dans votre réseau`,
  none: 'Cédez votre cabinet pour gagner vos premiers contacts et débloquer les atouts.',
  level: (level: number, max: number) => `niv. ${level} / ${max}`,
  next: (text: string) => `Prochain : ${text}`,
  atStart: 'Tout de suite, puis à chaque nouveau cabinet',
  max: 'Maximum',
  bought: (name: string) => `${name} : atout acquis`,
} as const;
