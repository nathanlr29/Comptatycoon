import type { EventReport } from '../core/events';
import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { FISCAL_PERIOD } from '../data/events';
import { STAFF } from '../data/staff';
import { EVENT_TEXTS } from '../data/texts';
import { h, setText } from './dom';
import type { NotificationManager } from './NotificationManager';

/** Notification chiffrée pour chaque événement aléatoire. */
export function notifyEvent(notifications: NotificationManager, report: EventReport): void {
  switch (report.id) {
    case 'fiscalPeriod':
      return notifications.show(EVENT_TEXTS.fiscalPeriod.title, EVENT_TEXTS.fiscalPeriod.body, 'success', undefined, 'events');
    case 'taxAudit': {
      if (report.protected) return notifications.show(EVENT_TEXTS.taxAuditSafe.title, EVENT_TEXTS.taxAuditSafe.body, 'success', undefined, 'events');
      const t = EVENT_TEXTS.taxAuditLoss(formatMoney(report.loss), report.reputationChange);
      return notifications.show(t.title, t.body, 'warning', 5000, 'events');
    }
    case 'resignation': {
      const t = EVENT_TEXTS.resignation(STAFF[report.role].name);
      return notifications.show(t.title, t.body, 'warning', 5000, 'events');
    }
    case 'prestigiousClient': {
      const t = EVENT_TEXTS.prestigiousClient(formatMoney(report.bonus), report.reputation);
      return notifications.show(t.title, t.body, 'success', undefined, 'events');
    }
  }
}

/** Bandeau de la Période fiscale avec compte à rebours. */
export class FiscalBanner {
  readonly el = h('div', { class: 'fiscal-banner', role: 'status', hidden: true });

  render(state: GameState, now: number): void {
    const effect = state.effects.find((e) => e.id === FISCAL_PERIOD.effectId && e.expiresAt > now);
    this.el.hidden = !effect;
    if (effect) setText(this.el, EVENT_TEXTS.fiscalBanner(Math.ceil((effect.expiresAt - now) / 1000)));
  }
}
