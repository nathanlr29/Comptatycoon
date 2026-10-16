import type Phaser from 'phaser';
import type { GameStore } from '../core/store';
import type { GameState } from '../core/state';
import { getBuildingAt } from '../core/buildings';
import { BUILDINGS } from '../data/buildings';
import { getZone, type ZoneId } from '../data/map';
import { clickLabel } from '../data/texts';
import { MAP_EVENTS } from '../game/MapScene';
import { ActionDock } from './ActionDock';
import { BuildPanel } from './BuildPanel';
import { BuildingPanel } from './BuildingPanel';
import { HUD } from './HUD';
import { NotificationManager } from './NotificationManager';
import { Panel } from './Panel';
import { RecruitmentPanel } from './RecruitmentPanel';
import { UpgradesPanel } from './UpgradesPanel';

type View = { render: (state: GameState, now: number) => void; el: HTMLElement };

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Élément manquant : ${selector}`);
  return el;
}

/** Interface HTML par-dessus la carte : lit le store, envoie des actions. */
export class App {
  private readonly hud = new HUD(query('#hud'));
  private readonly notifications = new NotificationManager(document.body);
  private readonly panel = new Panel(document.body);
  private readonly dock: ActionDock;
  private readonly recruitment: RecruitmentPanel;
  private readonly upgrades: UpgradesPanel;
  private readonly buildingPanel: BuildingPanel;
  private readonly buildPanel: BuildPanel;
  private openView: View | null = null;
  /** Pièces en travaux au dernier rendu, pour annoncer la fin des travaux. */
  private pending = new Set<string>();

  constructor(
    private readonly store: GameStore,
    private readonly game: Phaser.Game,
  ) {
    this.dock = new ActionDock(query('#dock'), {
      onClick: () => this.click(),
      onOpenRecruitment: () => this.show('Recrutement', this.recruitment),
      onOpenUpgrades: () => this.show('Améliorations', this.upgrades),
    });
    this.recruitment = new RecruitmentPanel((role) => {
      const result = role === 'partner' ? store.dispatch({ type: 'hirePartner' }, Date.now()) : store.dispatch({ type: 'hire', role }, Date.now());
      if (result.ok && role === 'partner') this.notifications.show('Nouvel associé', '+15 places d’encadrement', 'success');
    }, (role) => {
      if (role === 'partner') store.dispatch({ type: 'dismissPartner' }, Date.now());
      else store.dispatch({ type: 'dismiss', role }, Date.now());
    });
    this.upgrades = new UpgradesPanel((id) => store.dispatch({ type: 'buyUpgrade', id }, Date.now()));
    this.buildingPanel = new BuildingPanel((buildingId) => store.dispatch({ type: 'upgradeBuilding', buildingId }, Date.now()));
    this.buildPanel = new BuildPanel((slotId, building) => {
      const result = store.dispatch({ type: 'build', slotId, building }, Date.now());
      const built = result.ok ? getBuildingAt(store.getState(), slotId) : undefined;
      if (built) this.showBuilding(built.id);
    });

    query('#recenter').addEventListener('click', () => game.events.emit(MAP_EVENTS.recenter));
    game.events.on(MAP_EVENTS.buildingSelected, (id: string | null) => this.onBuildingSelected(id));
    game.events.on(MAP_EVENTS.slotSelected, (slotId: string) => {
      this.buildPanel.select(slotId);
      this.show('Aménager une pièce', this.buildPanel, true);
    });
    game.events.on(MAP_EVENTS.zoneSelected, (id: ZoneId) => {
      const zone = getZone(id);
      this.notifications.show(`${zone.name} : à louer`, `Bureau principal niveau ${zone.unlockLevel} requis.`);
    });

    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  }

  private click(): number | null {
    const result = this.store.dispatch({ type: 'click' }, Date.now());
    return result.ok && result.amount !== undefined ? result.amount : null;
  }

  private onBuildingSelected(id: string | null): void {
    if (id) this.showBuilding(id);
    else if (this.openView === this.buildingPanel || this.openView === this.buildPanel) this.panel.close();
  }

  private showBuilding(id: string): void {
    this.show(this.buildingPanel.select(id, this.store.getState()), this.buildingPanel, true);
  }

  private announceFinishedWorks(state: GameState): void {
    const pending = new Set(state.buildings.filter((b) => b.pending).map((b) => b.id));
    for (const id of this.pending) {
      const building = state.buildings.find((b) => b.id === id);
      if (pending.has(id) || !building) continue;
      const name = BUILDINGS[building.type].name;
      this.notifications.show('Travaux terminés', building.level > 1 ? `${name} : niveau ${building.level}` : `${name} : aménagement terminé`, 'success');
    }
    this.pending = pending;
  }

  private show(title: string, view: View, fromMap = false): void {
    if (!fromMap) this.game.events.emit(MAP_EVENTS.clearSelection);
    this.openView = view;
    view.render(this.store.getState(), Date.now());
    this.panel.open(title, view.el, () => {
      if (this.openView === view) this.openView = null;
      if (fromMap) this.game.events.emit(MAP_EVENTS.clearSelection);
    });
  }

  private render(state: GameState): void {
    const now = Date.now();
    this.hud.render(state, now);
    this.announceFinishedWorks(state);
    const hq = state.buildings.find((b) => b.id === 'hq');
    this.dock.setLabel(clickLabel(hq?.level ?? 1));
    this.openView?.render(state, now);
  }
}
