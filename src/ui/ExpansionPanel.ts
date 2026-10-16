import { canExpand, getFirmLevel, missingForExpansion } from '../core/expansion';
import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { EXPANSION_LEVELS, FIRM_BONUS_PER_LEVEL, MAX_FIRM_LEVEL, type ExpansionLevel } from '../data/expansion';
import { durationText, expansionMissingText, expansionRequirementText, refusalText } from '../data/texts';
import { h, setText } from './dom';

type Row = { el: HTMLElement; status: HTMLElement; button: HTMLButtonElement; reason: HTMLElement; level: ExpansionLevel };

/** Menu « Agrandir le cabinet » : les niveaux, leur prix, leurs conditions et ce qu'ils ajoutent. */
export class ExpansionPanel {
  readonly el = h('div', { class: 'list expansion' });
  private readonly summary = h('p', { class: 'list__summary' });
  private readonly rows: Row[] = [];

  constructor(onExpand: () => void) {
    this.el.append(this.summary);
    for (const level of EXPANSION_LEVELS) {
      const status = h('span', { class: 'expansion__status' });
      const button = h('button', { class: 'item__buy', type: 'button' });
      const reason = h('span', { class: 'item__reason' });
      button.addEventListener('click', onExpand);
      const adds = h('ul', { class: 'expansion__adds' }, ...level.adds.map((text) => h('li', { text })));
      const info = h(
        'div',
        { class: 'item__info' },
        h('h3', { class: 'item__name' }, h('span', { class: 'expansion__level', text: `Niv. ${level.level}` }), ` ${level.name}`),
        h('p', { class: 'item__desc', text: level.description }),
      );
      if (level.adds.length) info.append(adds);
      if (level.level > 1) info.append(h('span', { class: 'expansion__req', text: expansionRequirementText(level.minStaff, level.minPartners) }));
      const el = h('article', { class: 'item expansion__step' }, info, h('div', { class: 'item__action' }, status, button, reason));
      this.el.append(el);
      this.rows.push({ el, status, button, reason, level });
    }
  }

  render(state: GameState): void {
    const current = getFirmLevel(state);
    const bonus = Math.round(FIRM_BONUS_PER_LEVEL * (current - 1) * 100);
    setText(this.summary, `Votre cabinet : niveau ${current} sur ${MAX_FIRM_LEVEL}${bonus ? `, production +${bonus} %` : ''}.`);
    const check = canExpand(state);
    for (const row of this.rows) {
      const { level } = row;
      const done = level.level <= current;
      const next = level.level === current + 1;
      row.el.classList.toggle('expansion__step--done', done);
      row.el.classList.toggle('expansion__step--next', next);
      row.el.classList.toggle('expansion__step--later', !done && !next);
      setText(row.status, done ? (level.level === current ? 'Actuel' : 'Fait') : next ? '' : formatMoney(level.cost));
      row.status.hidden = next;
      row.button.hidden = !next;
      row.reason.hidden = !next;
      if (!next) continue;
      setText(row.button, `Agrandir · ${formatMoney(level.cost)}`);
      row.button.disabled = !check.ok;
      let reason = '';
      if (!check.ok) {
        const missing = missingForExpansion(state, level);
        const works = state.buildings.find((b) => b.id === 'hq')?.pending;
        if (check.reason === 'missing_prerequisite') reason = expansionMissingText(missing.staff, missing.partners);
        else if (works) reason = `Travaux en cours, encore ${durationText(works.endsAt - Date.now())}`;
        else reason = refusalText(check.reason);
      }
      setText(row.reason, reason);
    }
  }
}
