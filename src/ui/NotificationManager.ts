import { h, prefersReducedMotion } from './dom';

export type ToastTone = 'info' | 'success' | 'warning';

/** Notifications empilées en haut de l'écran, fermées automatiquement. */
export class NotificationManager {
  private readonly root = h('div', { class: 'toasts', 'aria-live': 'polite' });

  constructor(parent: HTMLElement) {
    parent.append(this.root);
  }

  show(title: string, body = '', tone: ToastTone = 'info', durationMs = 3500): void {
    const toast = h('div', { class: `toast toast--${tone}`, role: 'status' }, h('strong', { text: title }));
    if (body) toast.append(h('span', { text: body }));
    this.root.append(toast);
    while (this.root.children.length > 3) this.root.firstElementChild?.remove();

    window.setTimeout(() => {
      if (prefersReducedMotion()) return toast.remove();
      toast.classList.add('toast--leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, durationMs);
  }
}
