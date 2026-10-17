import { isNotificationEnabled, type NotificationKind } from '../core/settings';
import { reducedMotion, settings } from '../settings';
import { h } from './dom';
import { playSound } from './sound';

export type ToastTone = 'info' | 'success' | 'warning';

/** Notifications empilées en haut de l'écran, fermées automatiquement. */
export class NotificationManager {
  private readonly root = h('div', { class: 'toasts', 'aria-live': 'polite' });

  constructor(parent: HTMLElement) {
    parent.append(this.root);
  }

  /** `kind` : type désactivable dans les Paramètres ; sans type, la notification s'affiche toujours. */
  show(title: string, body = '', tone: ToastTone = 'info', durationMs = 3500, kind?: NotificationKind): void {
    if (!isNotificationEnabled(settings.get(), kind)) return;
    const toast = h('div', { class: `toast toast--${tone}`, role: 'status' }, h('strong', { text: title }));
    if (body) toast.append(h('span', { text: body }));
    this.root.append(toast);
    while (this.root.children.length > 3) this.root.firstElementChild?.remove();
    if (tone === 'warning') playSound('warning');
    else if (kind) playSound('success');

    window.setTimeout(() => {
      if (reducedMotion()) return toast.remove();
      toast.classList.add('toast--leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, durationMs);
  }
}
