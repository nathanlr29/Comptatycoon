import { h } from './dom';

const DESKTOP = window.matchMedia('(min-width: 900px)');

/**
 * Tiroir réutilisable : feuille du bas sur mobile, panneau latéral sur grand écran.
 * Fermeture par bouton, Échap, tap hors du panneau (mobile) ou glissement vers le bas.
 */
export class Panel {
  readonly body = h('div', { class: 'panel__body' });
  private readonly title = h('h2', { class: 'panel__title' });
  private readonly backdrop = h('div', { class: 'panel-backdrop', hidden: true });
  private readonly el: HTMLElement;
  private onClose: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    const close = h('button', { class: 'panel__close', type: 'button', 'aria-label': 'Fermer' }, '×');
    const handle = h('div', { class: 'panel__handle', 'aria-hidden': 'true' });
    this.el = h(
      'section',
      { class: 'panel', role: 'dialog', 'aria-modal': 'false', hidden: true },
      handle,
      h('header', { class: 'panel__header' }, this.title, close),
      this.body,
    );
    parent.append(this.backdrop, this.el);

    close.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && this.isOpen && this.close());
    this.enableSwipeToClose(handle);
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  open(title: string, content: Node, onClose?: () => void): void {
    this.onClose?.();
    this.onClose = onClose ?? null;
    this.title.textContent = title;
    this.el.setAttribute('aria-label', title);
    this.body.replaceChildren(content);
    this.body.scrollTop = 0;
    this.el.hidden = false;
    this.backdrop.hidden = DESKTOP.matches;
  }

  close(): void {
    if (!this.isOpen) return;
    this.el.hidden = true;
    this.backdrop.hidden = true;
    this.el.style.transform = '';
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  /** Glisser la poignée vers le bas de plus de 80 px ferme la feuille (mobile). */
  private enableSwipeToClose(handle: HTMLElement): void {
    let startY: number | null = null;
    const header = this.el.querySelector<HTMLElement>('.panel__header');
    for (const zone of [handle, header]) {
      zone?.addEventListener('pointerdown', (e) => {
        if (DESKTOP.matches || (e.target as HTMLElement).closest('button')) return;
        startY = e.clientY;
        zone.setPointerCapture(e.pointerId);
      });
      zone?.addEventListener('pointermove', (e) => {
        if (startY === null) return;
        this.el.style.transform = `translateY(${Math.max(0, e.clientY - startY)}px)`;
      });
      zone?.addEventListener('pointerup', (e) => {
        if (startY === null) return;
        const moved = e.clientY - startY;
        startY = null;
        if (moved > 80) this.close();
        else this.el.style.transform = '';
      });
    }
  }
}
