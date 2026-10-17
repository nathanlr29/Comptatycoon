import { formatMoney } from '../core/format';
import { canSellFirm, getSaleBoost } from '../core/prestige';
import type { GameState } from '../core/state';
import type { GameStore } from '../core/store';
import { getAvailableContacts } from '../core/talents';
import { boostText, contactsBonusText, contactsText, SALE_TEXTS } from '../data/prestige';
import { startItemsText } from '../data/talents';
import { h } from './dom';
import { Modal } from './Modal';

/**
 * Cession du cabinet en deux temps : confirmation (ce qu'on gagne, ce qu'on perd),
 * puis bilan de la partie avec un accès direct aux atouts du réseau.
 */
export function confirmSale(store: GameStore, handlers: { onSold: () => void; onOpenTalents: () => void }): void {
  const before = store.getState();
  const check = canSellFirm(before);
  if (!check.ok) return;
  const total = before.prestige.contacts + check.contacts;
  Modal.open({
    title: SALE_TEXTS.confirmTitle,
    body: [
      h('p', { class: 'sale__offer', text: SALE_TEXTS.offer(contactsText(check.contacts)) }),
      h('p', { text: SALE_TEXTS.confirmBody(contactsText(total), contactsBonusText(total)) }),
      h('p', { text: SALE_TEXTS.boost(contactsBonusText(before.prestige.contacts), contactsBonusText(total), boostText(getSaleBoost(before))) }),
      h('p', { class: 'sale__loses', text: SALE_TEXTS.loses }),
    ],
    buttons: [
      { label: 'Annuler' },
      {
        label: SALE_TEXTS.confirm,
        tone: 'danger',
        onClick: () => {
          if (!store.dispatch({ type: 'sellFirm' }, Date.now()).ok) return;
          handlers.onSold();
          showSaleReport(before, store.getState(), check.contacts, handlers.onOpenTalents);
        },
      },
    ],
    dismiss: { label: 'Annuler' },
  });
}

/** Bilan affiché juste après la cession. */
function showSaleReport(before: GameState, after: GameState, gained: number, onOpenTalents: () => void): void {
  const total = after.prestige.contacts;
  const body = [
    h('p', { text: SALE_TEXTS.reportRun(formatMoney(before.stats.totalEarned)) }),
    h('p', { class: 'sale__offer', text: SALE_TEXTS.reportNetwork(contactsText(gained), contactsText(total), contactsBonusText(total)) }),
  ];
  const start = startItemsText(after.prestige.talents);
  if (start) body.push(h('p', { text: SALE_TEXTS.reportStart(start) }));
  const available = getAvailableContacts(after);
  if (available > 0) body.push(h('p', { text: SALE_TEXTS.reportSpend(contactsText(available)) }));
  Modal.open({
    title: SALE_TEXTS.reportTitle,
    body,
    buttons: available > 0 ? [{ label: SALE_TEXTS.reportLater }, { label: SALE_TEXTS.reportButton, tone: 'primary', onClick: onOpenTalents }] : [{ label: 'Repartir', tone: 'primary' }],
    dismiss: { label: SALE_TEXTS.reportLater },
  });
}
