/**
 * Cession du cabinet (docs/GDD.md §14) : le joueur revend son cabinet arrivé au siège,
 * repart du petit bureau et garde son carnet d'adresses (les « contacts »), qui augmente la production pour toujours.
 */
export const SALE = {
  /** Contacts gagnés = floor(√(chiffre d'affaires de la partie / earnedPerContact²)) × facteur de difficulté. */
  earnedPerContact: 1_000_000,
  /** Production +10 % par contact (bonus additif : 1 + 0,1 × contacts). */
  bonusPerContact: 0.1,
  /** Une cession « vaut le coup » (pastille sur « Améliorer ») quand elle multiplie au moins par 2 la production du réseau. */
  worthwhileBoost: 2,
} as const;

/** Titres du joueur selon la taille de son réseau (affichés dans l'onglet Cession et les statistiques). */
export const NETWORK_TITLES = [
  { min: 1, title: 'Jeune confrère' },
  { min: 10, title: 'Notable du quartier' },
  { min: 50, title: 'Figure régionale' },
  { min: 200, title: 'Ténor de la profession' },
  { min: 1_000, title: 'Légende de l’Ordre' },
] as const;

export const SALE_TEXTS = {
  tab: 'Cession',
  lead: 'Revendez votre cabinet à un confrère et fondez-en un nouveau. Votre carnet d’adresses vous suit : chaque contact augmente la production de 10 %, pour toujours.',
  network: (title: string, contacts: string, bonus: string) => `${title} · ${contacts} · production +${bonus}`,
  noNetwork: 'Votre réseau : aucun contact pour l’instant.',
  requirement: (level: number) => (level <= 4 ? 'Cabinet agrandi jusqu’à l’étage complet (niveau 4)' : 'Cabinet agrandi jusqu’au siège (niveau 5)'),
  offer: (contacts: string) => `Offre de reprise : +${contacts}`,
  boost: (before: string, after: string, factor: string) => `Production du réseau : +${before} → +${after} (×${factor})`,
  nextContact: (amount: string) => `Encore ${amount} de chiffre d’affaires pour un contact de plus`,
  toSpend: (contacts: string) => `Après la cession : ${contacts} à faire jouer en atouts`,
  worthwhile: 'Un confrère veut racheter votre cabinet',
  worthwhileBody: (contacts: string, factor: string) => `+${contacts} · votre prochain cabinet produira ×${factor}. Onglet « Cession » du menu Améliorer.`,
  reportTitle: 'Cabinet cédé',
  reportRun: (earned: string) => `Cette partie : ${earned} facturés.`,
  reportNetwork: (gained: string, total: string, bonus: string) => `+${gained} : votre réseau compte ${total}, production +${bonus} pour toujours.`,
  reportSpend: (contacts: string) => `Vous avez ${contacts} à faire jouer : choisissez vos atouts avant de repartir.`,
  reportStart: (items: string) => `Votre nouveau cabinet démarre avec : ${items}.`,
  reportButton: 'Choisir mes atouts',
  reportLater: 'Plus tard',
  keeps: 'Vous gardez : vos contacts, vos atouts, la difficulté choisie.',
  loses: 'Vous repartez de zéro : argent, équipe, améliorations, pièces, pôles, réputation et objectifs.',
  button: (contacts: string) => `Céder le cabinet · +${contacts}`,
  confirmTitle: 'Céder le cabinet ?',
  confirmBody: (contacts: string, bonus: string) =>
    `Vous repartez du petit bureau avec ${contacts} au total, soit une production +${bonus} pour toute la suite.`,
  confirm: 'Céder',
  done: 'Cabinet cédé',
  doneBody: (bonus: string) => `Nouveau départ : production +${bonus}.`,
} as const;

/** « 1 contact », « 12 contacts ». */
export function contactsText(n: number): string {
  return `${n.toLocaleString('fr-FR')} contact${n > 1 ? 's' : ''}`;
}

/** Bonus de production de `contacts` contacts, en texte : « 120 % ». */
export function contactsBonusText(contacts: number): string {
  return `${Math.round(contacts * SALE.bonusPerContact * 100).toLocaleString('fr-FR')}\u00a0%`;
}

/** Facteur de production, en texte : « 1,45 » (affiché après « × »). */
export function boostText(factor: number): string {
  return factor.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
