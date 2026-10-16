/**
 * Cession du cabinet (docs/GDD.md §14) : le joueur revend son cabinet arrivé au siège,
 * repart du petit bureau et garde son carnet d'adresses (les « contacts »), qui augmente la production pour toujours.
 */
export const SALE = {
  /** Niveau du cabinet requis pour céder (5 = Le siège). */
  minFirmLevel: 5,
  /** Contacts gagnés = floor(√(chiffre d'affaires de la partie / earnedPerContact²)) × facteur de difficulté. */
  earnedPerContact: 1_000_000,
  /** Production +10 % par contact (bonus additif : 1 + 0,1 × contacts). */
  bonusPerContact: 0.1,
} as const;

export const SALE_TEXTS = {
  tab: 'Cession',
  lead: 'Revendez votre cabinet à un confrère et fondez-en un nouveau. Votre carnet d’adresses vous suit : chaque contact augmente la production de 10 %, pour toujours.',
  network: (contacts: string, bonus: string) => `Votre réseau : ${contacts} · production +${bonus}`,
  noNetwork: 'Votre réseau : aucun contact pour l’instant.',
  requirement: 'Cabinet agrandi jusqu’au siège (niveau 5)',
  keeps: 'Vous gardez : vos contacts, la difficulté choisie.',
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
