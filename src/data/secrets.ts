/** Secrets (easter eggs). Rien n'est affiché avant la première découverte. */
export type SecretId =
  | 'balance'
  | 'chatterbox'
  | 'konami'
  | 'liasseSeason'
  | 'yearEndClosing'
  | 'aprilFool'
  | 'lostLiasse'
  | 'entries1000'
  | 'entries10000';

export const SECRET_IDS: readonly SecretId[] = [
  'balance',
  'chatterbox',
  'konami',
  'liasseSeason',
  'yearEndClosing',
  'aprilFool',
  'lostLiasse',
  'entries1000',
  'entries10000',
];

export interface SecretDef {
  /** Nom dans la liste des secrets trouvés (Paramètres). */
  name: string;
  title: string;
  body: string;
  /** Récompense symbolique en euros (jamais de quoi changer l'équilibrage). */
  reward?: number;
}

export const SECRETS: Record<SecretId, SecretDef> = {
  balance: {
    name: 'Balance équilibrée',
    title: 'Total débit = total crédit',
    body: 'L’écart de 0,01 € a été retrouvé. Vous pouvez dormir tranquille.',
    reward: 0.01,
  },
  chatterbox: {
    name: 'Collaborateur dérangé',
    title: 'Un collaborateur lève la tête',
    body: '',
  },
  konami: {
    name: 'Code du plan comptable',
    title: 'Plan comptable général débloqué',
    body: 'Classe 6 : charges. Classe 7 : produits. Vous le saviez déjà.',
  },
  liasseSeason: {
    name: 'Saison des liasses',
    title: 'C’est la saison des liasses',
    body: 'Date limite de dépôt en vue. Le café est offert jusqu’au 20 mai.',
  },
  yearEndClosing: {
    name: 'Clôture du 31 décembre',
    title: 'Clôture de l’exercice',
    body: 'Inventaire, cut-off, provisions… Joyeux réveillon quand même.',
  },
  aprilFool: {
    name: 'Poisson d’avril',
    title: 'Un poisson dans le grand livre',
    body: 'Quelqu’un a lettré un poisson au compte 471. Personne n’ose y toucher.',
  },
  lostLiasse: {
    name: 'Liasse retrouvée',
    title: 'La liasse 2065 était sous la machine à café',
    body: 'Période fiscale : production ×2 pendant 20 s, et un grand soulagement.',
  },
  entries1000: {
    name: 'Mille saisies',
    title: 'Millième saisie',
    body: 'Le stagiaire vous apporte un café. Sans sucre, il a lu votre fiche.',
  },
  entries10000: {
    name: 'Dix mille saisies',
    title: 'Dix mille saisies',
    body: 'Vous rêvez désormais en écritures comptables. C’est normal.',
  },
};

/** Taps rapides qui déclenchent un secret : nombre d'appuis dans la fenêtre donnée. */
export const TAP_COMBOS = {
  balance: { count: 5, windowMs: 2_000 },
  chatterbox: { count: 7, windowMs: 3_000 },
} as const;

/** ↑ ↑ ↓ ↓ ← → ← → B A (valeurs de KeyboardEvent.key, lettres en minuscules). */
export const KONAMI_SEQUENCE: readonly string[] = [
  'arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a',
];

/** Saisies manuelles qui déclenchent un secret. */
export const CLICK_MILESTONES: readonly { clicks: number; id: SecretId }[] = [
  { clicks: 1_000, id: 'entries1000' },
  { clicks: 10_000, id: 'entries10000' },
];

/** Chance qu'une Période fiscale soit en fait la liasse perdue (même effet, autre message). */
export const LOST_LIASSE_CHANCE = 0.05;

/** Saisons (mois 1 à 12, jours inclus) : message une fois par partie, libellé du bouton changé. */
export const SEASONS: readonly { id: SecretId; month: number; fromDay: number; toDay: number; clickLabel: string }[] = [
  { id: 'liasseSeason', month: 5, fromDay: 1, toDay: 20, clickLabel: 'Boucler une liasse (encore une)' },
  { id: 'yearEndClosing', month: 12, fromDay: 31, toDay: 31, clickLabel: 'Clôturer l’exercice' },
  { id: 'aprilFool', month: 4, fromDay: 1, toDay: 1, clickLabel: 'Lettrer un poisson' },
];

/** Ce que dit un collaborateur qu'on dérange trop (tiré au hasard à chaque fois). */
export const STAFF_QUOTES: readonly string[] = [
  '« Débit à gauche, crédit à droite. Toujours. »',
  '« Tu as pensé à lettrer le 401 ? »',
  '« Le compte 471, c’est temporaire. Depuis 2019. »',
  '« Je ne suis pas en retard, je suis en période de clôture. »',
  '« Une facture sans TVA ? Joli. Suspect, mais joli. »',
  '« Si ça ne tombe pas juste, c’est l’arrondi. »',
  '« Mon bureau est rangé par ordre de plan comptable. »',
  '« Le client a encore envoyé ses tickets dans une boîte à chaussures. »',
];

export const SECRETS_TEXTS = {
  heading: 'Secrets trouvés',
  count: (found: number, total: number) => `${found} / ${total}`,
  discovered: 'Secret découvert',
} as const;
