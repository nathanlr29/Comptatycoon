import { formatDate, formatDuration, formatMoney } from '../core/format';
import { AUTOSAVE_SECONDS, NOTIFICATION_KINDS, TEXT_SCALES } from '../core/settings';
import type { GameState } from '../core/state';
import { SAVE_TEXTS } from '../data/saveTexts';
import { SECRET_IDS, SECRETS, SECRETS_TEXTS } from '../data/secrets';
import { AUTOSAVE_LABELS, MOTION_OPTIONS, NOTATION_OPTIONS, NOTIFICATION_LABELS, SETTINGS_TEXTS as T, STATS_LABELS, TEXT_SCALE_LABELS } from '../data/settings';
import { settings } from '../settings';
import { h, setText } from './dom';
import { segmented, slider, toggle, type Control } from './settingsControls';
import { playSound } from './sound';

export interface SettingsHandlers {
  onSwitchProfile: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  /** Sauvegarde immédiate ; `true` si elle a réussi. */
  onSaveNow: () => boolean;
  /** Heure (ms) de la dernière sauvegarde réussie, `null` s'il n'y en a pas eu. */
  lastSavedAt: () => number | null;
}

function row(label: string, description: string, onClick: () => void, tone = ''): HTMLButtonElement {
  const button = h('button', { class: `settings__button ${tone}`, type: 'button' }, h('strong', { text: label }), h('span', { text: description }));
  button.addEventListener('click', onClick);
  return button;
}

function section(title: string, ...children: Node[]): HTMLElement {
  return h('section', { class: 'settings__section' }, h('h3', { text: title }), ...children);
}

/** Paramètres en sections : cabinet et sauvegarde, son, affichage, notifications, statistiques, secrets, à propos. */
export class SettingsPanel {
  readonly el = h('div', { class: 'settings' });
  private readonly controls: Control[] = [];
  private readonly lastSave = h('span');
  private readonly stats = h('dl', { class: 'settings__stats' });
  /** Secrets trouvés : invisible tant qu'aucun n'a été découvert. */
  private readonly secrets = h('section', { class: 'settings__section settings__secrets', hidden: true });
  private secretsShown = -1;

  constructor(
    profileName: string | null,
    difficultyName: string,
    private readonly handlers: SettingsHandlers,
  ) {
    this.el.append(
      this.firmSection(profileName, difficultyName),
      this.soundSection(),
      this.displaySection(),
      this.notificationsSection(),
      section(T.sections.stats, this.stats),
      this.secrets,
      this.aboutSection(),
    );
    settings.subscribe(() => this.controls.forEach((c) => c.sync()));
  }

  private add(control: Control): HTMLElement {
    this.controls.push(control);
    return control.el;
  }

  private firmSection(profileName: string | null, difficultyName: string): HTMLElement {
    if (profileName === null) return section(T.sections.firm, h('p', { class: 'settings__profile', text: SAVE_TEXTS.storageUnavailable }));
    const s = settings.get.bind(settings);
    const saveNow = row(T.saveNow, '', () => {
      if (this.handlers.onSaveNow()) {
        playSound('click');
        saveNow.classList.add('settings__button--done');
        window.setTimeout(() => saveNow.classList.remove('settings__button--done'), 1500);
      }
      this.renderLastSave(Date.now());
    });
    saveNow.querySelector('span')?.replaceWith(this.lastSave);
    return section(
      T.sections.firm,
      h('p', { class: 'settings__profile', text: `${profileName} · ${difficultyName}` }),
      saveNow,
      this.add(segmented(T.autosave, AUTOSAVE_SECONDS.map((v) => ({ value: v as number, label: AUTOSAVE_LABELS[v] ?? `${v} s` })), () => s().autosaveSeconds, (v) => settings.update({ autosaveSeconds: v }), T.autosaveHint)),
      row('Changer de cabinet', 'Sauvegarde puis revient à l’écran d’accueil.', this.handlers.onSwitchProfile),
      row('Exporter', 'Texte à copier pour retrouver ce cabinet ailleurs.', this.handlers.onExport),
      row('Importer', 'Ajoute un cabinet à partir d’un texte d’export.', this.handlers.onImport),
      row('Réinitialiser ce cabinet', 'Recommence la partie à zéro.', this.handlers.onReset, 'settings__button--danger'),
      h('p', { class: 'settings__hint', text: SAVE_TEXTS.localOnly }),
    );
  }

  private soundSection(): HTMLElement {
    const s = () => settings.get().sound;
    return section(
      T.sections.sound,
      this.add(toggle(T.sound, () => s().enabled, (enabled) => {
        settings.update({ sound: { enabled } });
        if (enabled) playSound('success');
      }, T.soundHint)),
      this.add(slider(T.volume, () => s().volume, (volume) => settings.update({ sound: { volume } }), () => s().enabled, () => playSound('buy'))),
    );
  }

  private displaySection(): HTMLElement {
    const s = () => settings.get();
    return section(
      T.sections.display,
      this.add(segmented(T.textSize, TEXT_SCALES.map((v) => ({ value: v as number, label: TEXT_SCALE_LABELS[v] ?? `${v}` })), () => s().textScale, (v) => settings.update({ textScale: v }))),
      this.add(segmented(T.notation, NOTATION_OPTIONS, () => s().notation, (notation) => settings.update({ notation }))),
      this.add(segmented(T.motion, MOTION_OPTIONS, () => s().motion, (motion) => settings.update({ motion }), T.motionHint)),
      this.add(toggle(T.objectives, () => s().showObjectives, (showObjectives) => settings.update({ showObjectives }), T.objectivesHint)),
    );
  }

  private notificationsSection(): HTMLElement {
    const s = () => settings.get().notifications;
    return section(
      T.sections.notifications,
      ...NOTIFICATION_KINDS.map((kind) =>
        this.add(toggle(NOTIFICATION_LABELS[kind].label, () => s()[kind], (on) => settings.update({ notifications: { [kind]: on } }), NOTIFICATION_LABELS[kind].hint)),
      ),
      h('p', { class: 'settings__hint', text: T.notificationsHint }),
    );
  }

  private aboutSection(): HTMLElement {
    return section(
      T.sections.about,
      h('p', { class: 'settings__hint', text: T.version(__APP_VERSION__, __APP_COMMIT__) }),
      h('p', { class: 'settings__hint', text: T.credits }),
      row(T.resetSettings, T.resetSettingsHint, () => settings.reset()),
      h('p', { class: 'settings__hint', text: T.deviceOnly }),
    );
  }

  private renderLastSave(now: number): void {
    const at = this.handlers.lastSavedAt();
    setText(this.lastSave, at === null ? T.neverSaved : T.lastSave(formatDuration(now - at)));
  }

  private renderStats(state: GameState): void {
    const rows: [string, string][] = [
      [STATS_LABELS.playTime, formatDuration(state.stats.playMs)],
      [STATS_LABELS.founded, formatDate(state.createdAt)],
      [STATS_LABELS.earned, formatMoney(state.stats.totalEarned)],
      [STATS_LABELS.clicks, Math.floor(state.stats.clicks).toLocaleString('fr-FR')],
    ];
    if (state.prestige.sales > 0) {
      rows.splice(3, 0, [STATS_LABELS.earnedTotal, formatMoney(state.prestige.pastEarned + state.stats.totalEarned)]);
      rows.push([STATS_LABELS.sales, String(state.prestige.sales)], [STATS_LABELS.contacts, String(state.prestige.contacts)]);
    }
    const signature = rows.map((r) => r[1]).join('|');
    if (this.stats.dataset.signature === signature) return;
    this.stats.dataset.signature = signature;
    this.stats.replaceChildren(...rows.flatMap(([label, value]) => [h('dt', { text: label }), h('dd', { text: value })]));
  }

  render(state: GameState, now: number): void {
    this.renderLastSave(now);
    this.renderStats(state);
    if (state.secrets.length === this.secretsShown) return;
    this.secretsShown = state.secrets.length;
    this.secrets.hidden = state.secrets.length === 0;
    this.secrets.replaceChildren(
      h('h3', { text: `${SECRETS_TEXTS.heading} · ${SECRETS_TEXTS.count(state.secrets.length, SECRET_IDS.length)}` }),
      h('ul', {}, ...state.secrets.map((id) => h('li', { text: SECRETS[id].name }))),
    );
  }
}
