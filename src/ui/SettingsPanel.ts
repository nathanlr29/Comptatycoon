import { SAVE_TEXTS } from '../data/saveTexts';
import { h, setText } from './dom';

export interface SettingsHandlers {
  onSwitchProfile: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

function row(label: string, description: string, onClick: () => void, tone = ''): HTMLElement {
  const button = h('button', { class: `settings__button ${tone}`, type: 'button' }, h('strong', { text: label }), h('span', { text: description }));
  button.addEventListener('click', onClick);
  return button;
}

/** Paramètres : changer de cabinet, exporter, importer, réinitialiser. */
export class SettingsPanel {
  readonly el = h('div', { class: 'settings' });
  private readonly name = h('p', { class: 'settings__profile' });

  constructor(profileName: string | null, handlers: SettingsHandlers) {
    if (profileName === null) {
      this.el.append(h('p', { class: 'settings__profile', text: SAVE_TEXTS.storageUnavailable }));
      return;
    }
    setText(this.name, `Cabinet : ${profileName}`);
    this.el.append(
      this.name,
      row('Changer de cabinet', 'Sauvegarde puis revient à l’écran d’accueil.', handlers.onSwitchProfile),
      row('Exporter', 'Texte à copier pour retrouver ce cabinet ailleurs.', handlers.onExport),
      row('Importer', 'Ajoute un cabinet à partir d’un texte d’export.', handlers.onImport),
      row('Réinitialiser ce cabinet', 'Recommence la partie à zéro.', handlers.onReset, 'settings__button--danger'),
      h('p', { class: 'settings__hint', text: SAVE_TEXTS.localOnly }),
    );
  }

  render(): void {
    // Contenu fixe : rien à rafraîchir à chaque tick.
  }
}
