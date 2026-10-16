import type { GameStore } from '../core/store';
import type { GameState } from '../core/state';
import { getObjective } from '../core/objectives';
import { OBJECTIVE_TEXTS } from '../data/texts';
import { h } from './dom';
import { FiscalBanner, notifyEvent } from './EventsView';
import type { NotificationManager } from './NotificationManager';
import { ObjectivesView } from './ObjectivesView';

/** Bandeau de Période fiscale et objectifs en cours, en bas à gauche au-dessus de la barre d'action. */
export class LiveInfo {
  private readonly banner = new FiscalBanner();
  private readonly objectives: ObjectivesView;

  constructor(store: GameStore, notifications: NotificationManager) {
    this.objectives = new ObjectivesView((id) => {
      const def = getObjective(id);
      if (store.dispatch({ type: 'claimObjective', id }, Date.now()).ok && def) notifications.show(OBJECTIVE_TEXTS.claimed, def.title, 'success');
    });
    document.body.append(h('div', { class: 'live-info' }, this.banner.el, this.objectives.el));
    store.onEvent((report) => notifyEvent(notifications, report));
  }

  render(state: GameState, now: number): void {
    this.banner.render(state, now);
    this.objectives.render(state, now);
  }
}
