import type { EventReport } from '../core/events';
import type { GameStore } from '../core/store';
import type { GameState } from '../core/state';
import { getObjective } from '../core/objectives';
import { OBJECTIVE_TEXTS } from '../data/texts';
import { CoffeeBanner } from './CoffeePanel';
import { h } from './dom';
import { FiscalBanner, notifyEvent } from './EventsView';
import type { NotificationManager } from './NotificationManager';
import { ObjectivesView } from './ObjectivesView';
import { settings } from '../settings';

/** Bandeaux (Période fiscale, pause café) et objectifs en cours, en bas à gauche au-dessus de la barre d'action. */
export class LiveInfo {
  private readonly banner = new FiscalBanner();
  private readonly coffee = new CoffeeBanner();
  private readonly objectives: ObjectivesView;

  /** `intercept` : renvoie `true` quand il a lui-même annoncé l'événement (variante secrète). */
  constructor(store: GameStore, notifications: NotificationManager, intercept: (report: EventReport) => boolean = () => false) {
    this.objectives = new ObjectivesView((id) => {
      const def = getObjective(id);
      if (store.dispatch({ type: 'claimObjective', id }, Date.now()).ok && def) notifications.show(OBJECTIVE_TEXTS.claimed, def.title, 'success', undefined, 'objectives');
    });
    document.body.append(h('div', { class: 'live-info' }, this.banner.el, this.coffee.el, this.objectives.el));
    store.onEvent((report) => {
      if (!intercept(report)) notifyEvent(notifications, report);
    });
  }

  render(state: GameState, now: number): void {
    this.banner.render(state, now);
    this.coffee.render(state, now);
    this.objectives.el.hidden = !settings.get().showObjectives;
    if (!this.objectives.el.hidden) this.objectives.render(state, now);
  }
}
