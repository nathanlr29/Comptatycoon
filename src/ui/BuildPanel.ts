import { canBuild, getConstructionMs } from '../core/buildings';
import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { BUILDINGS, CONSTRUCTIBLE, type BuildingType } from '../data/buildings';
import { durationText, effectText, refusalText } from '../data/texts';
import { h, setText } from './dom';

/** Liste des pièces aménageables sur un emplacement libre. */
export class BuildPanel {
  readonly el = h('div', { class: 'list' });
  private slotId = '';
  private readonly rows = new Map<BuildingType, { item: HTMLElement; button: HTMLButtonElement; reason: HTMLElement }>();

  constructor(onBuild: (slotId: string, type: BuildingType) => void) {
    this.el.append(h('p', { class: 'list__summary', text: 'Choisissez la pièce à aménager ici.' }));
    for (const type of CONSTRUCTIBLE) {
      const def = BUILDINGS[type];
      const button = h('button', { class: 'item__buy', type: 'button' });
      const reason = h('span', { class: 'item__reason' });
      button.addEventListener('click', () => onBuild(this.slotId, type));
      const item = h(
        'article',
        { class: 'item' },
        h(
          'div',
          { class: 'item__info' },
          h('h3', { class: 'item__name', text: def.name }),
          h('p', { class: 'item__desc', text: def.description }),
          h('span', { class: 'item__meta', text: `${effectText(def, 1)} · travaux ${durationText(getConstructionMs(1))}` }),
        ),
        h('div', { class: 'item__action' }, button, reason),
      );
      this.el.append(item);
      this.rows.set(type, { item, button, reason });
    }
  }

  select(slotId: string): void {
    this.slotId = slotId;
  }

  render(state: GameState): void {
    for (const [type, row] of this.rows) {
      const check = canBuild(state, this.slotId, type);
      const owned = !check.ok && check.reason === 'already_owned';
      row.item.hidden = owned;
      setText(row.button, formatMoney(check.cost));
      row.button.disabled = !check.ok;
      setText(row.reason, check.ok ? '' : refusalText(check.reason, BUILDINGS[type].requiresHq));
    }
  }
}
