import type { MotionPreference, NotificationKind, NumberNotation } from '../core/settings';

/** Textes de l'écran Paramètres. */
export const SETTINGS_TEXTS = {
  sections: {
    firm: 'Cabinet',
    sound: 'Son',
    display: 'Affichage',
    notifications: 'Notifications',
    stats: 'Statistiques',
    about: 'À propos',
  },
  saveNow: 'Sauvegarder maintenant',
  saved: 'Cabinet sauvegardé',
  lastSave: (ago: string) => `Dernière sauvegarde il y a ${ago}.`,
  neverSaved: 'Pas encore sauvegardé pendant cette visite.',
  autosave: 'Sauvegarde automatique',
  autosaveHint: 'Le jeu sauvegarde aussi après chaque achat et quand vous quittez l’onglet.',
  sound: 'Effets sonores',
  soundHint: 'Saisie, achats et notifications. Le mode silencieux de l’iPhone peut couper le son.',
  volume: 'Volume',
  textSize: 'Taille du texte',
  notation: 'Affichage des montants',
  motion: 'Animations',
  motionHint: 'Auto suit le réglage « Réduire les animations » de l’appareil.',
  objectives: 'Carte des objectifs',
  objectivesHint: 'En bas de l’écran, au-dessus de la barre d’action.',
  notificationsHint: 'Les alertes de sauvegarde s’affichent toujours.',
  resetSettings: 'Rétablir les réglages par défaut',
  resetSettingsHint: 'Son, affichage et notifications. Ne touche pas aux cabinets.',
  deviceOnly: 'Ces réglages sont propres à cet appareil et communs à tous vos cabinets.',
  version: (version: string, commit: string) => (commit ? `Version ${version} (${commit})` : `Version ${version}`),
  credits: 'Imaginé par Nathan, développé avec Claude Code. Moteur de jeu : Phaser 3. Sons synthétisés dans le navigateur.',
} as const;

export const NOTATION_OPTIONS: { value: NumberNotation; label: string }[] = [
  { value: 'short', label: '12,5 k€' },
  { value: 'full', label: '12 500 €' },
];

export const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'full', label: 'Activées' },
  { value: 'reduced', label: 'Réduites' },
];

export const TEXT_SCALE_LABELS: Record<number, string> = { 0.9: 'Petit', 1: 'Normal', 1.15: 'Grand', 1.3: 'Très grand' };

export const AUTOSAVE_LABELS: Record<number, string> = { 5: '5 s', 15: '15 s', 30: '30 s', 60: '1 min' };

export const NOTIFICATION_LABELS: Record<NotificationKind, { label: string; hint: string }> = {
  events: { label: 'Événements', hint: 'Période fiscale, contrôle, démission, client prestigieux.' },
  works: { label: 'Fin des travaux', hint: 'Pièce aménagée ou améliorée, cabinet agrandi.' },
  objectives: { label: 'Objectifs', hint: 'Récompense d’objectif réclamée.' },
};

export const STATS_LABELS = {
  playTime: 'Temps de jeu',
  founded: 'Fondé le',
  earned: 'Chiffre d’affaires de la partie',
  earnedTotal: 'Chiffre d’affaires total',
  clicks: 'Factures saisies à la main',
  sales: 'Cabinets cédés',
  contacts: 'Contacts',
} as const;
