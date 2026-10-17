import { formatMoney } from '../core/format';
import { h, prefersReducedMotion, setText } from './dom';
import { ICONS } from './icons';

export interface DockHandlers {
  onClick: () => number | null;
  onOpenRecruitment: () => void;
  onOpenUpgrades: () => void;
}

function tab(icon: string, label: string, onClick: () => void) {
  const button = h('button', { class: 'dock__tab', type: 'button' });
  button.innerHTML = icon;
  button.append(h('span', { text: label }));
  button.addEventListener('click', onClick);
  return button;
}

/** Barre du bas : grand bouton d'action manuelle, accès aux panneaux. */
export class ActionDock {
  private readonly actionLabel = h('span', { class: 'dock__action-label' });
  private readonly action = h('button', { class: 'dock__action', type: 'button' }, this.actionLabel);
  private readonly upgradesTab: HTMLButtonElement;

  constructor(root: HTMLElement, handlers: DockHandlers) {
    this.upgradesTab = tab(ICONS.upgrade, 'Améliorer', handlers.onOpenUpgrades);
    root.replaceChildren(tab(ICONS.hire, 'Recruter', handlers.onOpenRecruitment), this.action, this.upgradesTab);
    this.action.addEventListener('click', (e) => {
      const amount = handlers.onClick();
      if (amount !== null) this.floatGain(amount, e);
    });
  }

  /** Pastille sur « Améliorer » (une cession qui vaut le coup attend dans l'onglet Cession). */
  setUpgradesReady(ready: boolean): void {
    this.upgradesTab.classList.toggle('dock__tab--ready', ready);
  }

  setLabel(label: string): void {
    setText(this.actionLabel, label);
  }

  /** Texte flottant `+X €` : exactement le montant crédité. */
  private floatGain(amount: number, e: MouseEvent): void {
    const rect = this.action.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top;
    const el = h('span', { class: 'float-gain', text: `+${formatMoney(amount)}`, 'aria-hidden': 'true' });
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.append(el);
    if (prefersReducedMotion()) window.setTimeout(() => el.remove(), 600);
    else el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}
