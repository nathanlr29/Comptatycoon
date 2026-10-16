import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { UPGRADES, UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import { refusalText } from '../data/texts';
import { h, setText } from './dom';

/** Améliorations à achat unique. */
export class UpgradesPanel {
  readonly el = h('div', { class: 'list' });
  private readonly rows = new Map<UpgradeId, { button: HTMLButtonElement; reason: HTMLElement }>();

  constructor(onBuy: (id: UpgradeId) => void) {
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      const button = h('button', { class: 'item__buy', type: 'button' });
      const reason = h('span', { class: 'item__reason' });
      button.addEventListener('click', () => onBuy(id));
      this.el.append(
        h(
          'article',
          { class: 'item' },
          h(
            'div',
            { class: 'item__info' },
            h('h3', { class: 'item__name', text: def.name }),
            h('p', { class: 'item__desc', text: def.description }),
            h('span', { class: 'item__meta', text: `Saisie × ${def.clickMultiplier}` }),
          ),
          h('div', { class: 'item__action' }, button, reason),
        ),
      );
      this.rows.set(id, { button, reason });
    }
  }

  render(state: GameState): void {
    for (const [id, row] of this.rows) {
      const owned = state.upgrades.includes(id);
      const cost = UPGRADES[id].cost;
      setText(row.button, owned ? 'Acquis' : formatMoney(cost));
      row.button.disabled = owned || state.money < cost;
      row.button.classList.toggle('item__buy--owned', owned);
      setText(row.reason, !owned && state.money < cost ? refusalText('insufficient_funds') : '');
    }
  }
}
