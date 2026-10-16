import type { EventReport } from '../core/events';
import { advanceSequence, crossedClickMilestone, getSeason, hasSecret, isLostLiasse, registerTap } from '../core/secrets';
import type { GameStore } from '../core/store';
import { KONAMI_SEQUENCE, SECRETS, STAFF_QUOTES, TAP_COMBOS, type SecretId } from '../data/secrets';
import type { HUD } from './HUD';
import type { NotificationManager } from './NotificationManager';

/** Easter eggs : écoute les gestes du joueur et annonce les secrets. Les règles sont dans `core/secrets.ts`. */
export class Secrets {
  private moneyTaps: number[] = [];
  private staffTaps: number[] = [];
  private konami = 0;
  private clicks: number;

  constructor(
    private readonly store: GameStore,
    private readonly notifications: NotificationManager,
    hud: HUD,
  ) {
    this.clicks = store.getState().stats.clicks;
    hud.onTap('money', () => this.onMoneyTap());
    hud.onTap('staff', () => this.onStaffTap());
    window.addEventListener('keydown', (e) => this.onKey(e));
    store.onAction((action) => {
      if (action.type === 'click') this.onClick();
    });
    this.greetSeason();
  }

  /** Libellé saisonnier du bouton d'action, s'il y en a un aujourd'hui. */
  clickLabel(now: number): string | undefined {
    return getSeason(new Date(now))?.clickLabel;
  }

  /** Période fiscale : rarement, c'est la liasse perdue (même effet, autre message). */
  interceptEvent(report: EventReport): boolean {
    if (report.id !== 'fiscalPeriod' || !isLostLiasse(Math.random())) return false;
    const def = SECRETS.lostLiasse;
    this.notifications.show(def.title, def.body, 'success', 5000);
    this.discover('lostLiasse', false);
    return true;
  }

  private onMoneyTap(): void {
    const { count, windowMs } = TAP_COMBOS.balance;
    const tap = registerTap(this.moneyTaps, Date.now(), count, windowMs);
    this.moneyTaps = tap.taps;
    if (tap.triggered) this.discover('balance');
  }

  /** Un collaborateur qu'on dérange trop finit par répondre, une phrase différente à chaque fois. */
  private onStaffTap(): void {
    const { count, windowMs } = TAP_COMBOS.chatterbox;
    const tap = registerTap(this.staffTaps, Date.now(), count, windowMs);
    this.staffTaps = tap.taps;
    if (!tap.triggered) return;
    const quote = STAFF_QUOTES[Math.floor(Math.random() * STAFF_QUOTES.length)] ?? '';
    this.notifications.show(SECRETS.chatterbox.title, quote, 'info', 5000);
    this.discover('chatterbox', false);
  }

  private onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable]')) return;
    this.konami = advanceSequence(this.konami, e.key);
    if (this.konami < KONAMI_SEQUENCE.length) return;
    this.konami = 0;
    this.discover('konami');
  }

  private onClick(): void {
    const after = this.store.getState().stats.clicks;
    const milestone = crossedClickMilestone(this.clicks, after);
    this.clicks = after;
    if (milestone) this.discover(milestone);
  }

  private greetSeason(): void {
    const season = getSeason(new Date());
    if (season && !hasSecret(this.store.getState(), season.id)) this.discover(season.id);
  }

  /** Enregistre le secret ; `announce` : afficher son message (sinon déjà fait par l'appelant). */
  private discover(id: SecretId, announce = true): void {
    if (announce) this.notifications.show(SECRETS[id].title, SECRETS[id].body, 'success', 5000);
    this.store.dispatch({ type: 'discoverSecret', id }, Date.now());
  }
}
