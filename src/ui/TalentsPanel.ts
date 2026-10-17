import type { GameState } from '../core/state';
import { canBuyTalent, getAvailableContacts, getTalentLevel, getTalentMaxLevel } from '../core/talents';
import { contactsText } from '../data/prestige';
import { TALENT_IDS, TALENT_TEXTS, TALENTS, type TalentId } from '../data/talents';
import { refusalText } from '../data/texts';
import { h, setText } from './dom';

interface Row {
  el: HTMLElement;
  level: HTMLElement;
  current: HTMLElement;
  next: HTMLElement;
  button: HTMLButtonElement;
  reason: HTMLElement;
}

/** Atouts du réseau (docs/GDD.md §14 bis), sous la cession : ce que les contacts permettent d'acheter. */
export class TalentsPanel {
  readonly el = h('section', { class: 'talents' });
  private readonly summary = h('p', { class: 'list__summary' });
  private readonly rows = new Map<TalentId, Row>();

  constructor(onBuy: (id: TalentId) => void) {
    this.el.append(h('h3', { class: 'list__heading', text: TALENT_TEXTS.heading }), h('p', { class: 'list__summary', text: TALENT_TEXTS.lead }), this.summary);
    for (const id of TALENT_IDS) this.el.append(this.createRow(id, onBuy));
  }

  private createRow(id: TalentId, onBuy: (id: TalentId) => void): HTMLElement {
    const def = TALENTS[id];
    const level = h('span', { class: 'item__count' });
    const current = h('span', { class: 'item__meta' });
    const next = h('span', { class: 'talent__next' });
    const button = h('button', { class: 'item__buy talent__buy', type: 'button' });
    const reason = h('span', { class: 'item__reason' });
    button.addEventListener('click', () => onBuy(id));
    const info = h(
      'div',
      { class: 'item__info' },
      h('h3', { class: 'item__name' }, def.name, ' ', level),
      h('p', { class: 'item__desc', text: def.description }),
      current,
      next,
    );
    if (def.atStart) info.append(h('span', { class: 'talent__tag', text: TALENT_TEXTS.atStart }));
    const el = h('article', { class: 'item talent' }, info, h('div', { class: 'item__action' }, button, reason));
    this.rows.set(id, { el, level, current, next, button, reason });
    return el;
  }

  render(state: GameState): void {
    const total = state.prestige.contacts;
    setText(this.summary, total > 0 ? TALENT_TEXTS.available(contactsText(getAvailableContacts(state)), contactsText(total)) : TALENT_TEXTS.none);
    for (const [id, row] of this.rows) {
      const def = TALENTS[id];
      const level = getTalentLevel(state, id);
      const max = getTalentMaxLevel(id);
      const check = canBuyTalent(state, id);
      const maxed = level >= max;
      setText(row.level, TALENT_TEXTS.level(level, max));
      setText(row.current, level > 0 ? def.effect(level) : '');
      row.current.hidden = level === 0;
      setText(row.next, maxed ? '' : level > 0 ? TALENT_TEXTS.next(def.effect(level + 1)) : def.effect(1));
      row.next.hidden = maxed;
      setText(row.button, maxed ? TALENT_TEXTS.max : contactsText(check.cost));
      row.button.disabled = !check.ok;
      row.button.classList.toggle('item__buy--owned', maxed);
      row.el.classList.toggle('talent--owned', level > 0);
      setText(row.reason, !check.ok && !maxed ? refusalText(check.reason) : '');
    }
  }
}
