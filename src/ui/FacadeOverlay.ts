import type Phaser from 'phaser';
import type { GameStore } from '../core/store';
import { getStage } from '../data/office';
import { FACADE_TEXTS } from '../data/texts';
import { closeFacade, openFacade } from '../game/FacadeScene';
import { toOfficeView } from '../game/officeView';
import { h } from './dom';

const ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14"/><path d="M2 21h20M10 21v-4h4v4M8 9h2M14 9h2M8 13h2M14 13h2"/></svg>';

/**
 * Bouton « Façade » près de Recentrer, et la barre « ← Cabinet » de la vue extérieure.
 * Pendant l'aperçu, le HUD, le dock et les boutons de la carte sont masqués (classe `facade-open`).
 */
export class FacadeOverlay {
  private readonly title = h('b');
  private readonly sub = h('span');
  private readonly back = h('button', { class: 'facade-bar__back', type: 'button', 'aria-label': FACADE_TEXTS.backLabel }, `← ${FACADE_TEXTS.back}`);
  private readonly bar = h('div', { class: 'facade-bar', hidden: true }, this.back, h('div', { class: 'facade-bar__title' }, this.title, this.sub));
  private readonly hint = h('p', { class: 'facade-hint', hidden: true, text: FACADE_TEXTS.hint });
  private isOpen = false;

  constructor(
    private readonly game: Phaser.Game,
    private readonly store: GameStore,
    controls: HTMLElement,
  ) {
    const button = h('button', { id: 'facade', class: 'icon-button', type: 'button', 'aria-label': FACADE_TEXTS.open, title: FACADE_TEXTS.open });
    button.innerHTML = ICON;
    button.addEventListener('click', () => this.open());
    controls.insertBefore(button, controls.querySelector('#recenter'));
    this.back.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
    document.body.append(this.bar, this.hint);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    const stage = toOfficeView(this.store.getState()).stage;
    this.title.textContent = getStage(stage).name;
    this.sub.textContent = FACADE_TEXTS.level(stage);
    document.body.classList.add('facade-open');
    this.bar.hidden = false;
    this.hint.hidden = false;
    openFacade(this.game);
    this.back.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    closeFacade(this.game);
    document.body.classList.remove('facade-open');
    this.bar.hidden = true;
    this.hint.hidden = true;
    document.querySelector<HTMLElement>('#facade')?.focus();
  }
}
