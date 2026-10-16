import { formatDate, formatRate } from '../core/format';
import { createInitialState } from '../core/state';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY_IDS, type DifficultyId } from '../data/difficulty';
import { profileRefusalText, SAVE_TEXTS } from '../data/saveTexts';
import type { LocalSaveService } from '../persistence/LocalSaveService';
import { MAX_PROFILES, PROFILE_NAME_MAX, type ProfileEntry } from '../persistence/ProfileStore';
import { h } from './dom';
import { Modal } from './Modal';
import { showDelete, showExport, showImport, showRename } from './saveDialogs';

export interface ProfileScreenOptions {
  /** `null` : jouer sans sauvegarde (stockage refusé). */
  onPlay: (profileId: string | null) => void;
}

/**
 * Écran d'accueil (docs/GDD.md §10 bis) : choisir ou créer un cabinet avant d'afficher la carte.
 * La zone `actions` en haut accueillera la connexion au compte (étape 10).
 */
export class ProfileScreen {
  private readonly el = h('main', { class: 'profiles', 'aria-label': 'Choix du cabinet' });
  private readonly actions = h('div', { class: 'profiles__actions' });
  private readonly content = h('div', { class: 'profiles__content' });

  constructor(
    parent: HTMLElement,
    private readonly saves: LocalSaveService,
    private readonly storageAvailable: boolean,
    private readonly options: ProfileScreenOptions,
  ) {
    this.el.append(
      h(
        'div',
        { class: 'profiles__inner' },
        h('header', { class: 'profiles__header' }, h('h1', { class: 'profiles__title', text: 'ComptaTycoon' }), this.actions),
        this.content,
      ),
    );
    parent.append(this.el);
    this.render();
  }

  hide(): void {
    this.el.remove();
  }

  private render(): void {
    this.actions.replaceChildren();
    if (!this.storageAvailable) {
      const play = h('button', { class: 'profiles__primary', type: 'button', text: 'Jouer sans sauvegarde' });
      play.addEventListener('click', () => this.options.onPlay(null));
      this.content.replaceChildren(h('p', { class: 'profiles__notice', text: SAVE_TEXTS.storageUnavailable }), play);
      return;
    }

    const importButton = h('button', { class: 'profiles__link', type: 'button', text: 'Importer' });
    importButton.addEventListener('click', () => showImport(this.saves, () => this.render()));
    this.actions.append(importButton);

    const profiles = this.saves.profiles.list();
    const [last, ...others] = profiles;
    const parts: Node[] = [];
    if (!last) {
      parts.push(h('p', { class: 'profiles__lead', text: SAVE_TEXTS.welcome }), this.createForm(true));
    } else {
      parts.push(this.card(last, true));
      if (others.length > 0) parts.push(h('ul', { class: 'profiles__list' }, ...others.map((p) => h('li', {}, this.card(p, false)))));
      parts.push(profiles.length < MAX_PROFILES ? this.createForm(false) : h('p', { class: 'profiles__hint', text: SAVE_TEXTS.limitReached }));
    }
    parts.push(h('p', { class: 'profiles__hint', text: SAVE_TEXTS.localOnly }));
    this.content.replaceChildren(...parts);
  }

  private card(profile: ProfileEntry, featured: boolean): HTMLElement {
    const play = h('button', { class: featured ? 'profiles__primary' : 'profiles__play', type: 'button', text: featured ? 'Continuer' : 'Jouer' });
    play.addEventListener('click', () => this.options.onPlay(profile.id));
    const more = h('button', { class: 'profiles__more', type: 'button', 'aria-label': `Options de ${profile.name}`, text: '⋯' });
    more.addEventListener('click', () => this.openMenu(profile));
    return h(
      'article',
      { class: `profile-card${featured ? ' profile-card--featured' : ''}` },
      h(
        'div',
        { class: 'profile-card__top' },
        h(
          'div',
          { class: 'profile-card__info' },
          h('h2', { class: 'profile-card__name', text: profile.name }),
          h('p', { class: 'profile-card__meta', text: this.meta(profile) }),
        ),
        more,
      ),
      play,
    );
  }

  /** « 1,2 k€/s · Exigeant · 16/10/2026 » ; le mode Classique n'est pas rappelé. */
  private meta(profile: ProfileEntry): string {
    const mode = profile.summary.difficulty;
    const parts = [formatRate(profile.summary.incomePerSecond)];
    if (mode && mode !== DEFAULT_DIFFICULTY && DIFFICULTIES[mode]) parts.push(DIFFICULTIES[mode].name);
    parts.push(formatDate(profile.lastPlayedAt));
    return parts.join(' · ');
  }

  /** Choix du mode de difficulté (docs/GDD.md §13), fixe pour toute la vie du cabinet. */
  private difficultyPicker(): { el: HTMLElement; value: () => DifficultyId } {
    let selected: DifficultyId = DEFAULT_DIFFICULTY;
    const hint = h('p', { class: 'difficulty__hint' });
    const options = DIFFICULTY_IDS.map((id) => {
      const input = h('input', { type: 'radio', name: 'difficulty', value: id, class: 'difficulty__input' });
      input.checked = id === selected;
      input.addEventListener('change', () => {
        selected = id;
        hint.textContent = DIFFICULTIES[id].description;
      });
      return h('label', { class: 'difficulty__option' }, input, h('span', { text: DIFFICULTIES[id].name }));
    });
    hint.textContent = DIFFICULTIES[selected].description;
    const el = h(
      'fieldset',
      { class: 'difficulty' },
      h('legend', { class: 'difficulty__legend', text: 'Difficulté (définitive)' }),
      h('div', { class: 'difficulty__options' }, ...options),
      hint,
    );
    return { el, value: () => selected };
  }

  private createForm(open: boolean): HTMLElement {
    const input = h('input', {
      class: 'profiles__input',
      name: 'cabinet',
      placeholder: SAVE_TEXTS.namePlaceholder,
      maxlength: PROFILE_NAME_MAX,
      autocomplete: 'off',
      enterkeyhint: 'go',
      'aria-label': SAVE_TEXTS.namePlaceholder,
    });
    const error = h('p', { class: 'profiles__error', role: 'alert' });
    const submit = h('button', { class: open ? 'profiles__primary' : 'profiles__secondary', type: 'submit', text: open ? 'Fonder le cabinet' : 'Créer' });
    const difficulty = this.difficultyPicker();
    const form = h('form', { class: 'profiles__form' }, input, difficulty.el, submit, error);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = this.saves.profiles.create(input.value);
      if (!result.ok) {
        error.textContent = profileRefusalText(result.reason);
        return;
      }
      // La partie est créée tout de suite pour porter le mode choisi.
      this.saves.save(result.profile.id, createInitialState(Date.now(), { difficulty: difficulty.value() }));
      this.options.onPlay(result.profile.id);
    });
    if (open) return form;
    return h('details', { class: 'profiles__new' }, h('summary', { text: '+ Nouveau cabinet' }), form);
  }

  private openMenu(profile: ProfileEntry): void {
    const refresh = () => this.render();
    const exportText = this.saves.exportText(profile.id);
    Modal.open({
      title: profile.name,
      // Affichés de bas en haut : Annuler tout en bas.
      buttons: [
        { label: 'Annuler' },
        { label: 'Supprimer', tone: 'danger', onClick: () => showDelete(this.saves, profile, refresh) },
        ...(exportText ? [{ label: 'Exporter', onClick: () => showExport(exportText, profile.name) }] : []),
        { label: 'Renommer', onClick: () => showRename(this.saves, profile, refresh) },
      ],
      dismiss: { label: 'Annuler' },
    });
  }
}
