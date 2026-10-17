import { canDismiss, canDismissPartner, canHire, canHirePartner, getCapacity, getStaffCount, getStaffPerPartner, type Check } from '../core/recruitment';
import { formatMoney, formatRate } from '../core/format';
import type { GameState } from '../core/state';
import { BALANCE } from '../data/balance';
import { PARTNER, STAFF, STAFF_ROLES, type StaffRole } from '../data/staff';
import { confirmDismissText, dismissRefusalText, refusalText } from '../data/texts';
import { h, setText } from './dom';

interface Row {
  count: HTMLElement;
  meta: HTMLElement;
  button: HTMLButtonElement;
  dismiss: HTMLButtonElement;
  reason: HTMLElement;
  check: (s: GameState) => Check;
  dismissCheck: (s: GameState) => Check;
  minReputation: number;
  effect: (s: GameState) => string;
}

type Target = StaffRole | 'partner';
/** Délai pendant lequel le second appui sur « − » confirme le licenciement. */
const CONFIRM_MS = 3000;

/** Liste des recrutements possibles, mise à jour en direct pendant que le panneau est ouvert. */
export class RecruitmentPanel {
  readonly el = h('div', { class: 'list' });
  private readonly summary = h('p', { class: 'list__summary' });
  private readonly rows: Row[] = [];
  /** Ligne dont le bouton « − » attend une confirmation, et jusqu'à quand. */
  private armed: { index: number; until: number } | null = null;
  private last: GameState | null = null;

  constructor(
    onHire: (target: Target) => void,
    private readonly onDismiss: (target: Target) => void,
  ) {
    this.el.append(this.summary);
    for (const role of STAFF_ROLES) {
      const def = STAFF[role];
      this.addRow(def.name, def.description, `${formatRate(def.income)} chacun`, def.minReputation, (s) => canHire(s, role), (s) => canDismiss(s, role), () => onHire(role), role);
    }
    this.addRow(PARTNER.name, PARTNER.description, (s) => `+${getStaffPerPartner(s)} places`, BALANCE.partnerMinReputation, canHirePartner, canDismissPartner, () => onHire('partner'), 'partner');
  }

  render(state: GameState, now = Date.now()): void {
    this.last = state;
    if (this.armed && this.armed.until <= now) this.armed = null;
    const count = getStaffCount(state);
    const capacity = getCapacity(state);
    setText(this.summary, `${count} collaborateur${count > 1 ? 's' : ''} sur ${capacity} places · ${state.partners} associé${state.partners > 1 ? 's' : ''}`);
    STAFF_ROLES.forEach((role, i) => this.renderRow(i, state, String(state.staff[role])));
    this.renderRow(STAFF_ROLES.length, state, String(state.partners));
  }

  /** Premier appui : demande confirmation ; second appui dans les 3 s : licencie. */
  private pressDismiss(index: number, target: Target): void {
    const now = Date.now();
    if (this.armed?.index === index && this.armed.until > now) {
      this.armed = null;
      this.onDismiss(target);
    } else {
      this.armed = { index, until: now + CONFIRM_MS };
      window.setTimeout(() => this.last && this.render(this.last), CONFIRM_MS + 50);
    }
    if (this.last) this.render(this.last, now);
  }

  private addRow(
    name: string,
    description: string,
    effect: string | ((s: GameState) => string),
    minReputation: number,
    check: Row['check'],
    dismissCheck: Row['dismissCheck'],
    onClick: () => void,
    target: Target,
  ): void {
    const index = this.rows.length;
    const count = h('span', { class: 'item__count' });
    const meta = h('span', { class: 'item__meta' });
    const button = h('button', { class: 'item__buy', type: 'button' });
    const dismiss = h('button', { class: 'item__dismiss', type: 'button', 'aria-label': `Licencier : ${name}`, text: '−' });
    const reason = h('span', { class: 'item__reason' });
    button.addEventListener('click', onClick);
    dismiss.addEventListener('click', () => this.pressDismiss(index, target));
    this.el.append(
      h(
        'article',
        { class: 'item' },
        h('div', { class: 'item__info' }, h('h3', { class: 'item__name' }, name, ' ', count), h('p', { class: 'item__desc', text: description }), meta),
        h('div', { class: 'item__action' }, h('div', { class: 'item__buttons' }, dismiss, button), reason),
      ),
    );
    this.rows.push({ count, meta, button, dismiss, reason, check, dismissCheck, minReputation, effect: typeof effect === 'string' ? () => effect : effect });
  }

  private renderRow(index: number, state: GameState, owned: string): void {
    const row = this.rows[index]!;
    const check = row.check(state);
    const dismissCheck = row.dismissCheck(state);
    const armed = this.armed?.index === index;
    setText(row.count, `× ${owned}`);
    setText(row.meta, row.effect(state));
    setText(row.button, formatMoney(check.cost));
    row.button.disabled = !check.ok;
    // Personne à licencier : bouton inactif. Autre refus : expliqué au premier appui.
    const nobody = !dismissCheck.ok && (dismissCheck.reason === 'nobody_to_dismiss' || dismissCheck.reason === 'last_partner');
    row.dismiss.disabled = nobody;
    row.dismiss.classList.toggle('item__dismiss--armed', armed && dismissCheck.ok);
    let reason = '';
    if (armed && !nobody) reason = dismissCheck.ok ? confirmDismissText(formatMoney(dismissCheck.cost)) : dismissRefusalText(refusalText(dismissCheck.reason));
    else if (!check.ok) reason = refusalText(check.reason, row.minReputation);
    setText(row.reason, reason);
  }
}
