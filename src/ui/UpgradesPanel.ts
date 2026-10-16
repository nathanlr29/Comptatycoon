import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { canBuyUpgrade } from '../core/upgrades';
import { UPGRADES, UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import { refusalText, requiresText } from '../data/texts';
import { h, setText } from './dom';

/** Équipements et logiciels à achat unique. */
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
            h('span', { class: 'item__meta', text: def.effectText }),
          ),
          h('div', { class: 'item__action' }, button, reason),
        ),
      );
      this.rows.set(id, { button, reason });
    }
  }

  render(state: GameState): void {
    for (const [id, row] of this.rows) {
      const def = UPGRADES[id];
      const check = canBuyUpgrade(state, id);
      const owned = !check.ok && check.reason === 'already_owned';
      setText(row.button, owned ? 'Acquis' : formatMoney(check.cost));
      row.button.disabled = !check.ok;
      row.button.classList.toggle('item__buy--owned', owned);
      let reason = '';
      if (!check.ok && !owned) {
        reason = check.reason === 'missing_prerequisite' && def.requires ? requiresText(UPGRADES[def.requires].name) : refusalText(check.reason, def.minReputation);
      }
      setText(row.reason, reason);
    }
  }
}
