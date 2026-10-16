import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { canBuyUpgrade, isUpgradeListed } from '../core/upgrades';
import { BUILDINGS } from '../data/buildings';
import { UPGRADE_CATEGORIES, UPGRADES, UPGRADE_IDS, type UpgradeCategory, type UpgradeId } from '../data/upgrades';
import { refusalText, requiresBuildingText, requiresText } from '../data/texts';
import { h, setText } from './dom';

interface Row {
  el: HTMLElement;
  button: HTMLButtonElement;
  reason: HTMLElement;
}

/** Achats uniques, regroupés par rubrique (équipement, logiciels, technologies, formations, certifications). */
export class UpgradesPanel {
  readonly el = h('div', { class: 'list' });
  private readonly rows = new Map<UpgradeId, Row>();
  private readonly headings = new Map<UpgradeCategory, HTMLElement>();

  constructor(onBuy: (id: UpgradeId) => void) {
    for (const category of UPGRADE_CATEGORIES) {
      const heading = h('h3', { class: 'list__heading' });
      this.headings.set(category.id, heading);
      this.el.append(heading);
      for (const id of UPGRADE_IDS) {
        if (UPGRADES[id].category === category.id) this.el.append(this.createRow(id, onBuy));
      }
    }
  }

  private createRow(id: UpgradeId, onBuy: (id: UpgradeId) => void): HTMLElement {
    const def = UPGRADES[id];
    const button = h('button', { class: 'item__buy', type: 'button' });
    const reason = h('span', { class: 'item__reason' });
    button.addEventListener('click', () => onBuy(id));
    const el = h(
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
    );
    this.rows.set(id, { el, button, reason });
    return el;
  }

  render(state: GameState): void {
    for (const category of UPGRADE_CATEGORIES) {
      const ids = UPGRADE_IDS.filter((id) => UPGRADES[id].category === category.id);
      const owned = ids.filter((id) => state.upgrades.includes(id)).length;
      setText(this.headings.get(category.id)!, `${category.label} · ${owned} / ${ids.length}`);
    }
    for (const [id, row] of this.rows) {
      const def = UPGRADES[id];
      row.el.hidden = !isUpgradeListed(state, id);
      const check = canBuyUpgrade(state, id);
      const owned = !check.ok && check.reason === 'already_owned';
      setText(row.button, owned ? 'Acquis' : formatMoney(check.cost));
      row.button.disabled = !check.ok;
      row.button.classList.toggle('item__buy--owned', owned);
      let reason = '';
      if (!check.ok && !owned) {
        if (check.reason === 'missing_prerequisite' && def.requires) reason = requiresText(UPGRADES[def.requires].name);
        else if (check.reason === 'missing_building' && def.requiresBuilding) reason = requiresBuildingText(BUILDINGS[def.requiresBuilding.type], def.requiresBuilding.level);
        else reason = refusalText(check.reason, def.minReputation);
      }
      setText(row.reason, reason);
    }
  }
}
