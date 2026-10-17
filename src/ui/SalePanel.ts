import { formatMoney } from '../core/format';
import { getFirmLevel } from '../core/expansion';
import {
  canSellFirm,
  getNetworkTitle,
  getNextContactAt,
  getNextContactProgress,
  getSaleBoost,
  getSaleMinFirmLevel,
} from '../core/prestige';
import type { GameState } from '../core/state';
import { getAvailableContacts } from '../core/talents';
import { boostText, contactsBonusText, contactsText, SALE_TEXTS } from '../data/prestige';
import type { TalentId } from '../data/talents';
import { h, setText } from './dom';
import { TalentsPanel } from './TalentsPanel';

/**
 * Onglet « Cession » (docs/GDD.md §14) : ce que rapporterait la cession maintenant, ce qu'elle change
 * pour la partie suivante, puis les atouts du réseau à acheter avec les contacts.
 */
export class SalePanel {
  readonly el = h('div', { class: 'list' });
  private readonly network = h('p', { class: 'sale__network' });
  private readonly offer = h('p', { class: 'sale__offer' });
  private readonly boost = h('li');
  private readonly nextContact = h('li', { class: 'sale__next' });
  private readonly barFill = h('span', { class: 'objective__bar-fill' });
  private readonly toSpend = h('li');
  private readonly requirement = h('li', { class: 'dept__req' });
  private readonly button = h('button', { class: 'item__buy dept__buy', type: 'button' });
  private readonly talents: TalentsPanel;

  constructor(onSell: () => void, onBuyTalent: (id: TalentId) => void) {
    this.button.addEventListener('click', onSell);
    this.talents = new TalentsPanel(onBuyTalent);
    const card = h(
      'article',
      { class: 'dept sale' },
      h('h3', { class: 'item__name', text: 'Céder le cabinet' }),
      this.offer,
      h('ul', { class: 'dept__effects' }, this.boost, this.toSpend),
      h('ul', { class: 'dept__effects' }, this.nextContact),
      h('span', { class: 'objective__bar sale__bar', 'aria-hidden': 'true' }, this.barFill),
      h('ul', { class: 'dept__effects' }, h('li', { class: 'sale__loses', text: SALE_TEXTS.keeps }), h('li', { class: 'sale__loses', text: SALE_TEXTS.loses })),
      h('ul', { class: 'dept__reqs', 'aria-label': 'Conditions' }, this.requirement),
      this.button,
    );
    this.el.append(h('p', { class: 'list__summary', text: SALE_TEXTS.lead }), this.network, card, this.talents.el);
  }

  render(state: GameState): void {
    const owned = state.prestige.contacts;
    const title = getNetworkTitle(owned);
    setText(this.network, title ? SALE_TEXTS.network(title, contactsText(owned), contactsBonusText(owned)) : SALE_TEXTS.noNetwork);
    const check = canSellFirm(state);
    const gained = check.contacts;
    setText(this.offer, SALE_TEXTS.offer(contactsText(gained)));
    setText(this.boost, SALE_TEXTS.boost(contactsBonusText(owned), contactsBonusText(owned + gained), boostText(getSaleBoost(state))));
    setText(this.toSpend, SALE_TEXTS.toSpend(contactsText(getAvailableContacts(state) + gained)));
    setText(this.nextContact, SALE_TEXTS.nextContact(formatMoney(Math.max(0, getNextContactAt(state) - state.stats.totalEarned))));
    this.barFill.style.width = `${Math.round(getNextContactProgress(state) * 100)}%`;
    const minLevel = getSaleMinFirmLevel(state);
    setText(this.requirement, SALE_TEXTS.requirement(minLevel));
    this.requirement.classList.toggle('dept__req--met', getFirmLevel(state) >= minLevel);
    setText(this.button, SALE_TEXTS.button(contactsText(gained)));
    this.button.disabled = !check.ok;
    this.talents.render(state);
  }
}
