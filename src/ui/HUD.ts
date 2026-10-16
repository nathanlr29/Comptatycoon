import { getIncomePerSecond } from '../core/economy';
import { formatMoney, formatRate } from '../core/format';
import { getCapacity, getStaffCount } from '../core/recruitment';
import type { GameState } from '../core/state';
import { h, setText } from './dom';
import { ICONS } from './icons';

function stat(icon: string, label: string, extraClass = '') {
  const value = h('span', { class: 'stat__value' });
  const el = h('div', { class: `stat ${extraClass}`, title: label, 'aria-label': label });
  el.innerHTML = icon;
  el.append(value);
  return { el, value };
}

/** Barre supérieure : solde, revenu/s, réputation, collaborateurs / capacité. */
export class HUD {
  private readonly money = stat(ICONS.money, 'Solde', 'stat--money');
  private readonly rate = stat(ICONS.rate, 'Revenu par seconde');
  private readonly reputation = stat(ICONS.star, 'Réputation');
  private readonly staff = stat(ICONS.people, 'Collaborateurs / capacité');

  constructor(root: HTMLElement) {
    root.replaceChildren(
      h('div', { class: 'hud__main' }, this.money.el, this.rate.el),
      h('div', { class: 'hud__side' }, this.reputation.el, this.staff.el),
    );
  }

  /** Appuis sur le solde ou l'effectif (easter eggs, rien ne l'annonce à l'écran). */
  onTap(which: 'money' | 'staff', fn: () => void): void {
    const el = which === 'money' ? this.money.el : this.staff.el;
    el.classList.add('stat--tappable');
    el.addEventListener('pointerup', fn);
  }

  render(state: GameState, now: number): void {
    setText(this.money.value, formatMoney(state.money));
    setText(this.rate.value, formatRate(getIncomePerSecond(state, now)));
    setText(this.reputation.value, String(state.reputation));

    const count = getStaffCount(state);
    const capacity = getCapacity(state);
    setText(this.staff.value, `${count} / ${capacity}`);
    this.staff.el.classList.toggle('stat--warn', count >= capacity * 0.8 && count < capacity);
    this.staff.el.classList.toggle('stat--full', count >= capacity);
  }
}
