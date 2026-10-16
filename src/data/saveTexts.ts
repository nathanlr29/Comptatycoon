import type { ProfileRefusal } from '../persistence/ProfileStore';
import type { ImportResult, SaveResult } from '../persistence/SaveService';

/** Textes de l'écran d'accueil, de la sauvegarde et du retour d'absence. */
export const SAVE_TEXTS = {
  welcome: 'Fondez votre cabinet d’expertise comptable et faites-le grandir.',
  storageUnavailable:
    'Ce navigateur refuse l’enregistrement (navigation privée ?). Vous pouvez jouer, mais la partie ne sera pas sauvegardée.',
  localOnly: 'Les parties sont enregistrées sur cet appareil, dans ce navigateur.',
  namePlaceholder: 'Nom du cabinet',
  limitReached: '5 cabinets au maximum : supprimez-en un pour en créer un autre.',
  corruptTitle: 'Sauvegarde illisible',
  corruptBody: 'La sauvegarde de ce cabinet est abîmée. Elle a été mise de côté sans être effacée.',
  importHelp: 'Collez ici le texte d’export d’un cabinet. Il sera ajouté comme nouveau cabinet.',
  exportHelp: 'Copiez ce texte et gardez-le en lieu sûr : il permet de retrouver ce cabinet sur un autre appareil.',
  resetWarning: 'Toute la progression de ce cabinet sera perdue. Pensez à l’exporter avant.',
  resetConfirm: 'Vraiment tout effacer ? Cette action est définitive.',
} as const;

export function profileRefusalText(reason: ProfileRefusal): string {
  switch (reason) {
    case 'invalid_name':
      return 'Le nom doit compter de 2 à 24 caractères.';
    case 'limit':
      return SAVE_TEXTS.limitReached;
    case 'unknown_profile':
      return 'Ce cabinet n’existe plus.';
    case 'unavailable':
      return 'Enregistrement impossible sur ce navigateur.';
  }
}

export function importErrorText(result: Exclude<ImportResult, { ok: true }>): string {
  if (result.reason === 'invalid') return `Texte refusé : ${result.error}.`;
  if (result.reason === 'limit') return SAVE_TEXTS.limitReached;
  return 'Enregistrement impossible sur ce navigateur.';
}

export function saveErrorText(result: Exclude<SaveResult, { ok: true }>): string {
  if (result.reason === 'quota') return 'Sauvegarde impossible : l’espace de stockage est plein.';
  return 'Sauvegarde impossible : le navigateur refuse l’enregistrement.';
}
