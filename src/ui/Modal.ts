import { h } from './dom';

export interface ModalButton {
  label: string;
  tone?: 'primary' | 'danger' | 'ghost';
  /** Renvoie `false` pour garder la fenêtre ouverte (saisie invalide, par exemple). */
  onClick?: () => boolean | void;
}

export interface ModalOptions {
  title: string;
  body?: (Node | string)[];
  buttons: ModalButton[];
  /** Fermeture par Échap ou tap à côté : appelle ce bouton (aucun si absent). */
  dismiss?: ModalButton;
}

/**
 * Fenêtre centrée au-dessus de tout (écran d'accueil compris).
 * Une seule à la fois : en ouvrir une ferme la précédente.
 */
export class Modal {
  private static current: Modal | null = null;
  private readonly backdrop: HTMLElement;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.options.dismiss) this.press(this.options.dismiss);
  };

  static open(options: ModalOptions): Modal {
    Modal.current?.close();
    Modal.current = new Modal(options);
    return Modal.current;
  }

  private constructor(private readonly options: ModalOptions) {
    const buttons = options.buttons.map((b) => {
      const el = h('button', { class: `modal__button modal__button--${b.tone ?? 'ghost'}`, type: 'button', text: b.label });
      el.addEventListener('click', () => this.press(b));
      return el;
    });
    const titleId = `modal-title-${Date.now()}`;
    const box = h(
      'div',
      { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      h('h2', { class: 'modal__title', id: titleId, text: options.title }),
      h('div', { class: 'modal__body' }, ...(options.body ?? [])),
      h('div', { class: 'modal__buttons' }, ...buttons),
    );
    this.backdrop = h('div', { class: 'modal-backdrop' }, box);
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && options.dismiss) this.press(options.dismiss);
    });
    document.addEventListener('keydown', this.onKey);
    document.body.append(this.backdrop);
    const focus = box.querySelector<HTMLElement>('input, textarea') ?? buttons.find((b) => b.classList.contains('modal__button--primary'));
    focus?.focus();
  }

  close(): void {
    document.removeEventListener('keydown', this.onKey);
    this.backdrop.remove();
    if (Modal.current === this) Modal.current = null;
  }

  private press(button: ModalButton): void {
    if (button.onClick?.() === false) return;
    this.close();
  }
}

/** Petit texte d'erreur sous un champ, vide tant qu'il n'y a rien à dire. */
export function fieldError(): HTMLElement {
  return h('p', { class: 'modal__error', role: 'alert' });
}
