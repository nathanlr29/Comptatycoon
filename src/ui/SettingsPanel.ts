import type { GameState } from '../core/state';
import { SAVE_TEXTS } from '../data/saveTexts';
import { SECRET_IDS, SECRETS, SECRETS_TEXTS } from '../data/secrets';
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
  /** Secrets trouvés : invisible tant qu'aucun n'a été découvert. */
  private readonly secrets = h('section', { class: 'settings__secrets', hidden: true });
  private secretsShown = -1;

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
      this.secrets,
      h('p', { class: 'settings__hint', text: SAVE_TEXTS.localOnly }),
    );
  }

  render(state: GameState): void {
    if (state.secrets.length === this.secretsShown) return;
    this.secretsShown = state.secrets.length;
    this.secrets.hidden = state.secrets.length === 0;
    this.secrets.replaceChildren(
      h('h3', { text: `${SECRETS_TEXTS.heading} · ${SECRETS_TEXTS.count(state.secrets.length, SECRET_IDS.length)}` }),
      h('ul', {}, ...state.secrets.map((id) => h('li', { text: SECRETS[id].name }))),
    );
  }
}
