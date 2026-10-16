import type Phaser from 'phaser';
import type { GameStore } from '../core/store';
import type { GameState } from '../core/state';
import { DEPARTMENT_IDS, DEPARTMENTS, type DepartmentId } from '../data/departments';
import { getZone, type ZoneId } from '../data/map';
import { clickLabel } from '../data/texts';
import { MAP_EVENTS } from '../game/MapScene';
import { ActionDock } from './ActionDock';
import { BuildingInfo } from './BuildingInfo';
import { HUD } from './HUD';
import { NotificationManager } from './NotificationManager';
import { Panel } from './Panel';
import { RecruitmentPanel } from './RecruitmentPanel';
import { DevelopmentPanel } from './DevelopmentPanel';
import { departmentViews } from './departmentViews';
import { Tabs } from './Tabs';
import { UpgradesPanel } from './UpgradesPanel';

type View = { render: (state: GameState, now: number) => void; el: HTMLElement };

function isDepartmentId(id: string): id is DepartmentId {
  return (DEPARTMENT_IDS as string[]).includes(id);
}

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
  /** « Améliorer » : améliorations et onglet Développement (pôles). */
  private readonly growth: Tabs;
  private readonly buildingInfo = new BuildingInfo();
  private openView: View | null = null;

  constructor(
    private readonly store: GameStore,
    private readonly game: Phaser.Game,
  ) {
    this.dock = new ActionDock(query('#dock'), {
      onClick: () => this.click(),
      onOpenRecruitment: () => this.show('Recrutement', this.recruitment),
      onOpenUpgrades: () => this.show('Améliorer', this.growth),
    });
    this.recruitment = new RecruitmentPanel((role) => {
      const result = role === 'partner' ? store.dispatch({ type: 'hirePartner' }, Date.now()) : store.dispatch({ type: 'hire', role }, Date.now());
      if (result.ok && role === 'partner') this.notifications.show('Nouvel associé', '+15 places d’encadrement', 'success');
    }, (role) => {
      if (role === 'partner') store.dispatch({ type: 'dismissPartner' }, Date.now());
      else store.dispatch({ type: 'dismiss', role }, Date.now());
    });
    this.upgrades = new UpgradesPanel((id) => store.dispatch({ type: 'buyUpgrade', id }, Date.now()));
    const development = new DevelopmentPanel(departmentViews, (id) => this.buyDevelopment(id));
    this.growth = new Tabs([
      { label: 'Améliorations', view: this.upgrades },
      { label: 'Développement', view: development },
    ]);

    query('#recenter').addEventListener('click', () => game.events.emit(MAP_EVENTS.recenter));
    game.events.on(MAP_EVENTS.buildingSelected, (id: string | null) => this.onBuildingSelected(id));
    game.events.on(MAP_EVENTS.zoneSelected, (id: ZoneId) => {
      const zone = getZone(id);
      this.notifications.show(zone.name, `Se débloque au niveau ${zone.unlockLevel} du Bureau principal.`);
    });

    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  }

  private buyDevelopment(id: string): void {
    if (id === 'portfolio') {
      if (this.store.dispatch({ type: 'buyPortfolio' }, Date.now()).ok) this.notifications.show('Portefeuille racheté', 'De nouveaux clients rejoignent le cabinet.', 'success');
      return;
    }
    if (!isDepartmentId(id)) return;
    if (this.store.dispatch({ type: 'buyDepartment', id }, Date.now()).ok) this.notifications.show(`${DEPARTMENTS[id].name} ouvert`, DEPARTMENTS[id].effectText, 'success');
  }

  private click(): number | null {
    const result = this.store.dispatch({ type: 'click' }, Date.now());
    return result.ok && result.amount !== undefined ? result.amount : null;
  }

  private onBuildingSelected(id: string | null): void {
    if (id === 'hq') this.show('Bureau principal', this.buildingInfo, true);
    else if (this.openView === this.buildingInfo) this.panel.close();
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
    const hq = state.buildings.find((b) => b.id === 'hq');
    this.dock.setLabel(clickLabel(hq?.level ?? 1));
    this.openView?.render(state, now);
  }
}
