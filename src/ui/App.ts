import type Phaser from 'phaser';
import type { GameStore } from '../core/store';
import type { GameState } from '../core/state';
import { DEPARTMENT_IDS, DEPARTMENTS, type DepartmentId } from '../data/departments';
import { canExpand, getFirmLevel } from '../core/expansion';
import { getExpansionLevel } from '../data/expansion';
import { clickLabel, durationText } from '../data/texts';
import { MAP_EVENTS } from '../game/MapScene';
import { ActionDock } from './ActionDock';
import { BuildingInfo } from './BuildingInfo';
import { h } from './dom';
import { ExpansionPanel } from './ExpansionPanel';
import { ICONS } from './icons';
import { HUD } from './HUD';
import { LiveInfo } from './LiveInfo';
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
  readonly notifications = new NotificationManager(document.body);
  private readonly panel = new Panel(document.body);
  private readonly dock: ActionDock;
  private readonly recruitment: RecruitmentPanel;
  private readonly upgrades: UpgradesPanel;
  /** « Améliorer » : améliorations et onglet Développement (pôles). */
  private readonly growth: Tabs;
  private readonly buildingInfo = new BuildingInfo(() => this.show('Agrandir le cabinet', this.expansion));
  private readonly expansion = new ExpansionPanel(() => this.expand());
  /** Niveau du cabinet au dernier rendu, pour annoncer la fin des travaux d'agrandissement. */
  private firmLevel = Number.POSITIVE_INFINITY;
  private readonly expandButton = h('button', { class: 'expand-button', type: 'button', 'aria-label': 'Agrandir le cabinet' });
  private openView: View | null = null;
  private readonly liveInfo: LiveInfo;

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

    this.expandButton.innerHTML = ICONS.expand;
    this.expandButton.append(h('span', { text: 'Agrandir' }));
    this.expandButton.addEventListener('click', () => this.show('Agrandir le cabinet', this.expansion));
    query('.map-controls').prepend(this.expandButton);
    query('#recenter').addEventListener('click', () => game.events.emit(MAP_EVENTS.recenter));
    game.events.on(MAP_EVENTS.buildingSelected, (id: string | null) => this.onBuildingSelected(id));

    this.liveInfo = new LiveInfo(store, this.notifications);
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

  /** Lance les travaux d'agrandissement ; le nouveau local apparaît à leur fin (voir `render`). */
  private expand(): void {
    const next = getExpansionLevel(getFirmLevel(this.store.getState()) + 1);
    const result = this.store.dispatch({ type: 'upgradeBuilding', buildingId: 'hq' }, Date.now());
    if (!result.ok || !next) return;
    this.panel.close();
    const hq = this.store.getState().buildings.find((b) => b.id === 'hq');
    const remaining = hq?.pending ? durationText(hq.pending.endsAt - Date.now()) : '';
    this.notifications.show('Travaux d’agrandissement lancés', `${next.name} dans ${remaining}`);
  }

  private onBuildingSelected(id: string | null): void {
    if (id === 'hq') this.show('Bureau principal', this.buildingInfo, true);
    else if (this.openView === this.buildingInfo) this.panel.close();
  }

  show(title: string, view: View, fromMap = false): void {
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
    this.liveInfo.render(state, now);
    const firmLevel = getFirmLevel(state);
    if (firmLevel > this.firmLevel) {
      const level = getExpansionLevel(firmLevel);
      if (level) this.notifications.show('Cabinet agrandi', `${level.name} · +1 réputation`, 'success');
    }
    this.firmLevel = firmLevel;
    this.dock.setLabel(clickLabel(getFirmLevel(state)));
    this.expandButton.classList.toggle('expand-button--ready', canExpand(state).ok);
    this.openView?.render(state, now);
  }
}
