import type Phaser from 'phaser';
import type { GameStore } from '../core/store';
import type { GameState } from '../core/state';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { DEPARTMENT_IDS, DEPARTMENTS, type DepartmentId } from '../data/departments';
import { canTakeCoffeeBreak, getCoffeeBreakEnd, getCoffeeMachine, isCoffeeUnlocked } from '../core/coffee';
import { canExpand, getFirmLevel } from '../core/expansion';
import { getExpansionLevel } from '../data/expansion';
import { clickLabel, clockText, COFFEE_TEXTS, durationText, multiplierText } from '../data/texts';
import { canSellFirm } from '../core/prestige';
import { contactsBonusText, contactsText, SALE_TEXTS } from '../data/prestige';
import { MAP_EVENTS } from '../game/MapScene';
import { ActionDock } from './ActionDock';
import { BuildingInfo } from './BuildingInfo';
import { CoffeePanel } from './CoffeePanel';
import { h } from './dom';
import { ExpansionPanel } from './ExpansionPanel';
import { ICONS } from './icons';
import { HUD } from './HUD';
import { LiveInfo } from './LiveInfo';
import { NotificationManager } from './NotificationManager';
import { Panel } from './Panel';
import { RecruitmentPanel } from './RecruitmentPanel';
import { RoomsPanel } from './RoomsPanel';
import { Secrets } from './Secrets';
import { DevelopmentPanel } from './DevelopmentPanel';
import { departmentViews } from './departmentViews';
import { Modal } from './Modal';
import { SalePanel } from './SalePanel';
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
  /** « Améliorer » : améliorations, onglet Développement (pôles) et Cession. */
  private readonly growth: Tabs;
  private readonly buildingInfo = new BuildingInfo(() => this.openFirm(0));
  private readonly expansion = new ExpansionPanel(() => this.expand());
  private readonly rooms = new RoomsPanel({ onBuild: (type) => this.build(type), onUpgrade: (id) => this.upgradeRoom(id) });
  /** « Agrandir » : les locaux (niveaux du cabinet) et les pièces à aménager. */
  private readonly firm = new Tabs([
    { label: 'Locaux', view: this.expansion },
    { label: 'Pièces', view: this.rooms },
  ]);
  /** Pièces en travaux au dernier rendu, pour annoncer leur fin. */
  private roomWorks = new Set<string>();
  /** Niveau du cabinet au dernier rendu, pour annoncer la fin des travaux d'agrandissement. */
  private firmLevel = Number.POSITIVE_INFINITY;
  private readonly expandButton = h('button', { class: 'expand-button', type: 'button', 'aria-label': 'Agrandir le cabinet' });
  private readonly coffee = new CoffeePanel({ onBreak: () => this.coffeeBreak(), onUpgrade: () => this.upgradeCoffee() });
  private readonly coffeeTime = h('span', { class: 'coffee-button__time' });
  private readonly coffeeButton = h('button', { class: 'expand-button coffee-button', type: 'button', 'aria-label': COFFEE_TEXTS.title, hidden: true });
  private openView: View | null = null;
  private readonly liveInfo: LiveInfo;
  private readonly secrets: Secrets;

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
      { label: SALE_TEXTS.tab, view: new SalePanel(() => this.sell()) },
    ]);

    this.expandButton.innerHTML = ICONS.expand;
    this.expandButton.append(h('span', { text: 'Agrandir' }));
    this.expandButton.addEventListener('click', () => this.openFirm(0));
    this.coffeeButton.innerHTML = ICONS.coffee;
    this.coffeeButton.append(this.coffeeTime);
    this.coffeeButton.addEventListener('click', () => this.show(COFFEE_TEXTS.title, this.coffee));
    query('.map-controls').prepend(this.coffeeButton, this.expandButton);
    query('#recenter').addEventListener('click', () => game.events.emit(MAP_EVENTS.recenter));
    game.events.on(MAP_EVENTS.buildingSelected, (id: string | null) => this.onBuildingSelected(id));

    this.secrets = new Secrets(store, this.notifications, this.hud);
    this.liveInfo = new LiveInfo(store, this.notifications, (report) => this.secrets.interceptEvent(report));
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

  /** Cession du cabinet, après confirmation : la partie repart du petit bureau avec les contacts gagnés. */
  private sell(): void {
    const state = this.store.getState();
    const check = canSellFirm(state);
    if (!check.ok) return;
    const total = state.prestige.contacts + check.contacts;
    Modal.open({
      title: SALE_TEXTS.confirmTitle,
      body: [h('p', { text: SALE_TEXTS.confirmBody(contactsText(total), contactsBonusText(total)) }), h('p', { text: SALE_TEXTS.loses })],
      buttons: [
        { label: 'Annuler' },
        {
          label: SALE_TEXTS.confirm,
          tone: 'danger',
          onClick: () => {
            if (!this.store.dispatch({ type: 'sellFirm' }, Date.now()).ok) return;
            this.panel.close();
            this.game.events.emit(MAP_EVENTS.recenter);
            this.notifications.show(SALE_TEXTS.done, SALE_TEXTS.doneBody(contactsBonusText(total)), 'success', 6000);
          },
        },
      ],
      dismiss: { label: 'Annuler' },
    });
  }

  private click(): number | null {
    const result = this.store.dispatch({ type: 'click' }, Date.now());
    return result.ok && result.amount !== undefined ? result.amount : null;
  }

  private coffeeBreak(): void {
    if (!this.store.dispatch({ type: 'coffeeBreak' }, Date.now()).ok) return;
    const machine = getCoffeeMachine(this.store.getState());
    const t = COFFEE_TEXTS.started(multiplierText(machine.multiplier), durationText(machine.durationMs));
    this.panel.close();
    this.notifications.show(t.title, t.body, 'success');
  }

  private upgradeCoffee(): void {
    if (!this.store.dispatch({ type: 'upgradeCoffeeMachine' }, Date.now()).ok) return;
    const t = COFFEE_TEXTS.upgraded(getCoffeeMachine(this.store.getState()).name);
    this.notifications.show(t.title, t.body, 'success');
  }

  /** Bouton café : caché avant le local voisin, compte à rebours pendant la pause puis jusqu'à la suivante. */
  private renderCoffeeButton(state: GameState, now: number): void {
    this.coffeeButton.hidden = !isCoffeeUnlocked(state);
    if (this.coffeeButton.hidden) return;
    const end = getCoffeeBreakEnd(state, now);
    const ready = canTakeCoffeeBreak(state, now).ok;
    const label = end !== null ? clockText(end - now) : ready ? COFFEE_TEXTS.button : clockText(state.coffee.readyAt - now);
    if (this.coffeeTime.textContent !== label) this.coffeeTime.textContent = label;
    this.coffeeButton.classList.toggle('expand-button--ready', ready);
    this.coffeeButton.classList.toggle('coffee-button--active', end !== null);
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

  private openFirm(tab: number): void {
    this.firm.select(tab);
    this.show('Agrandir le cabinet', this.firm);
  }

  /** Lance l'aménagement d'une pièce : le jeu lui choisit une place libre. */
  private build(type: BuildingType): void {
    if (!this.store.dispatch({ type: 'build', building: type }, Date.now()).ok) return;
    this.notifyWorks(type);
  }

  private upgradeRoom(buildingId: string): void {
    if (!this.store.dispatch({ type: 'upgradeBuilding', buildingId }, Date.now()).ok) return;
    const building = this.store.getState().buildings.find((b) => b.id === buildingId);
    if (building) this.notifyWorks(building.type);
  }

  private notifyWorks(type: BuildingType): void {
    const building = this.store.getState().buildings.find((b) => b.type === type);
    const remaining = building?.pending ? durationText(building.pending.endsAt - Date.now()) : '';
    this.notifications.show('Travaux lancés', `${BUILDINGS[type].name} dans ${remaining}`);
  }

  /** Annonce les pièces dont les travaux viennent de finir (le Bureau principal a son propre message). */
  private announceFinishedRooms(state: GameState): void {
    const pending = new Set(state.buildings.filter((b) => b.pending && b.id !== 'hq').map((b) => b.id));
    for (const id of this.roomWorks) {
      const building = state.buildings.find((b) => b.id === id);
      if (!pending.has(id) && building) this.notifications.show('Travaux terminés', `${BUILDINGS[building.type].name}, niveau ${building.level}`, 'success');
    }
    this.roomWorks = pending;
  }

  private onBuildingSelected(id: string | null): void {
    if (id === 'hq') this.show('Bureau principal', this.buildingInfo, true);
    else if (id) {
      this.firm.select(1);
      this.show('Agrandir le cabinet', this.firm, true);
    } else if (this.openView === this.buildingInfo) this.panel.close();
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
    this.announceFinishedRooms(state);
    this.dock.setLabel(this.secrets.clickLabel(now) ?? clickLabel(firmLevel));
    this.expandButton.classList.toggle('expand-button--ready', canExpand(state).ok);
    this.renderCoffeeButton(state, now);
    this.openView?.render(state, now);
  }
}
