import { importErrorText, profileRefusalText, SAVE_TEXTS } from '../data/saveTexts';
import type { ProfileEntry } from '../persistence/ProfileStore';
import type { LocalSaveService } from '../persistence/LocalSaveService';
import { h } from './dom';
import { fieldError, Modal } from './Modal';

/** Affiche le texte d'export, prêt à copier. */
export function showExport(text: string, name: string): void {
  const area = h('textarea', { class: 'modal__textarea', readonly: true, rows: 6, 'aria-label': 'Texte d’export' }, text);
  const copied = h('p', { class: 'modal__hint', role: 'status' });
  Modal.open({
    title: `Exporter « ${name} »`,
    body: [h('p', { text: SAVE_TEXTS.exportHelp }), area, copied],
    buttons: [
      { label: 'Fermer' },
      {
        label: 'Copier',
        tone: 'primary',
        onClick: () => {
          area.select();
          void navigator.clipboard?.writeText(text).then(
            () => (copied.textContent = 'Copié dans le presse-papiers.'),
            () => (copied.textContent = 'Sélectionnez le texte et copiez-le.'),
          );
          if (!navigator.clipboard) copied.textContent = 'Sélectionnez le texte et copiez-le.';
          return false;
        },
      },
    ],
    dismiss: { label: 'Fermer' },
  });
}

/** Coller un export : crée un nouveau cabinet si le texte est valide. */
export function showImport(saves: LocalSaveService, onImported: (profile: ProfileEntry) => void): void {
  const area = h('textarea', { class: 'modal__textarea', rows: 6, 'aria-label': 'Texte à importer', placeholder: '{"format":"comptatycoon-cabinet",…}' });
  const error = fieldError();
  Modal.open({
    title: 'Importer un cabinet',
    body: [h('p', { text: SAVE_TEXTS.importHelp }), area, error],
    buttons: [
      { label: 'Annuler' },
      {
        label: 'Importer',
        tone: 'primary',
        onClick: () => {
          const result = saves.importText(area.value);
          if (!result.ok) {
            error.textContent = importErrorText(result);
            return false;
          }
          onImported(result.profile);
        },
      },
    ],
    dismiss: { label: 'Annuler' },
  });
}

/** Renommer un cabinet. */
export function showRename(saves: LocalSaveService, profile: ProfileEntry, onDone: () => void): void {
  const input = h('input', { class: 'modal__input', value: profile.name, maxlength: 24, 'aria-label': 'Nouveau nom', autocomplete: 'off' });
  const error = fieldError();
  Modal.open({
    title: 'Renommer le cabinet',
    body: [input, error],
    buttons: [
      { label: 'Annuler' },
      {
        label: 'Renommer',
        tone: 'primary',
        onClick: () => {
          const result = saves.profiles.rename(profile.id, input.value);
          if (!result.ok) {
            error.textContent = profileRefusalText(result.reason);
            return false;
          }
          onDone();
        },
      },
    ],
    dismiss: { label: 'Annuler' },
  });
}

/** Suppression : il faut retaper le nom du cabinet. */
export function showDelete(saves: LocalSaveService, profile: ProfileEntry, onDone: () => void): void {
  const input = h('input', { class: 'modal__input', 'aria-label': 'Nom du cabinet', autocomplete: 'off', placeholder: profile.name });
  const error = fieldError();
  Modal.open({
    title: `Supprimer « ${profile.name} » ?`,
    body: [h('p', { text: 'La partie sera effacée de cet appareil. Pour confirmer, tapez le nom du cabinet.' }), input, error],
    buttons: [
      { label: 'Annuler' },
      {
        label: 'Supprimer',
        tone: 'danger',
        onClick: () => {
          if (input.value.trim() !== profile.name) {
            error.textContent = 'Le nom ne correspond pas.';
            return false;
          }
          saves.remove(profile.id);
          onDone();
        },
      },
    ],
    dismiss: { label: 'Annuler' },
  });
}
