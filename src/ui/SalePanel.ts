import { getFirmLevel } from '../core/expansion';
import { canSellFirm } from '../core/prestige';
import type { GameState } from '../core/state';
import { contactsBonusText, contactsText, SALE, SALE_TEXTS } from '../data/prestige';
import { h, setText } from './dom';

/** Onglet « Cession » : céder le cabinet arrivé au siège et repartir avec son réseau (docs/GDD.md §14). */
export class SalePanel {
  readonly el = h('div', { class: 'list' });
  private readonly network = h('p', { class: 'sale__network' });
  private readonly requirement = h('li', { class: 'dept__req', text: SALE_TEXTS.requirement });
  private readonly button = h('button', { class: 'item__buy dept__buy', type: 'button' });

  constructor(onSell: () => void) {
    this.button.addEventListener('click', onSell);
    const card = h(
      'article',
      { class: 'dept sale' },
      h('h3', { class: 'item__name', text: 'Céder le cabinet' }),
      h('ul', { class: 'dept__effects' }, h('li', { text: SALE_TEXTS.keeps }), h('li', { class: 'sale__loses', text: SALE_TEXTS.loses })),
      h('ul', { class: 'dept__reqs', 'aria-label': 'Conditions' }, this.requirement),
      this.button,
    );
    this.el.append(h('p', { class: 'list__summary', text: SALE_TEXTS.lead }), this.network, card);
  }

  render(state: GameState): void {
    const owned = state.prestige.contacts;
    setText(this.network, owned > 0 ? SALE_TEXTS.network(contactsText(owned), contactsBonusText(owned)) : SALE_TEXTS.noNetwork);
    const check = canSellFirm(state);
    this.requirement.classList.toggle('dept__req--met', getFirmLevel(state) >= SALE.minFirmLevel);
    setText(this.button, SALE_TEXTS.button(contactsText(check.contacts)));
    this.button.disabled = !check.ok;
  }
}
