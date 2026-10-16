import { canHire, canHirePartner, getCapacity, getStaffCount, type Check } from '../core/recruitment';
import { formatMoney, formatRate } from '../core/format';
import type { GameState } from '../core/state';
import { BALANCE } from '../data/balance';
import { PARTNER, STAFF, STAFF_ROLES, type StaffRole } from '../data/staff';
import { refusalText } from '../data/texts';
import { h, setText } from './dom';

interface Row {
  count: HTMLElement;
  meta: HTMLElement;
  button: HTMLButtonElement;
  reason: HTMLElement;
  check: (s: GameState) => Check;
  minReputation: number;
}

/** Liste des recrutements possibles, mise à jour en direct pendant que le panneau est ouvert. */
export class RecruitmentPanel {
  readonly el = h('div', { class: 'list' });
  private readonly summary = h('p', { class: 'list__summary' });
  private readonly rows: Row[] = [];

  constructor(onHire: (role: StaffRole | 'partner') => void) {
    this.el.append(this.summary);
    for (const role of STAFF_ROLES) {
      const def = STAFF[role];
      this.addRow(def.name, def.description, `${formatRate(def.income)} chacun`, def.minReputation, (s) => canHire(s, role), () => onHire(role));
    }
    this.addRow(PARTNER.name, PARTNER.description, `+${BALANCE.staffPerPartner} places`, BALANCE.partnerMinReputation, canHirePartner, () => onHire('partner'));
  }

  render(state: GameState): void {
    const count = getStaffCount(state);
    const capacity = getCapacity(state);
    setText(this.summary, `${count} collaborateur${count > 1 ? 's' : ''} sur ${capacity} places · ${state.partners} associé${state.partners > 1 ? 's' : ''}`);
    STAFF_ROLES.forEach((role, i) => this.renderRow(this.rows[i]!, state, String(state.staff[role])));
    this.renderRow(this.rows[STAFF_ROLES.length]!, state, String(state.partners));
  }

  private addRow(name: string, description: string, effect: string, minReputation: number, check: Row['check'], onClick: () => void): void {
    const count = h('span', { class: 'item__count' });
    const meta = h('span', { class: 'item__meta' });
    const button = h('button', { class: 'item__buy', type: 'button' });
    const reason = h('span', { class: 'item__reason' });
    button.addEventListener('click', onClick);
    this.el.append(
      h(
        'article',
        { class: 'item' },
        h('div', { class: 'item__info' }, h('h3', { class: 'item__name' }, name, ' ', count), h('p', { class: 'item__desc', text: description }), meta),
        h('div', { class: 'item__action' }, button, reason),
      ),
    );
    this.rows.push({ count, meta, button, reason, check, minReputation });
    meta.dataset.effect = effect;
  }

  private renderRow(row: Row, state: GameState, owned: string): void {
    const check = row.check(state);
    setText(row.count, `× ${owned}`);
    setText(row.meta, row.meta.dataset.effect ?? '');
    setText(row.button, formatMoney(check.cost));
    row.button.disabled = !check.ok;
    setText(row.reason, check.ok ? '' : refusalText(check.reason, row.minReputation));
  }
}
