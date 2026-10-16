import Phaser from 'phaser';
import { formatDuration, formatMoney } from './core/format';
import { isAbsence, shouldShowOfflineReport, type OfflineReport } from './core/offline';
import { createInitialState } from './core/state';
import { GameStore } from './core/store';
import { saveErrorText, SAVE_TEXTS } from './data/saveTexts';
import { MapScene } from './game/MapScene';
import type { LocalSaveService } from './persistence/LocalSaveService';
import type { LoadResult } from './persistence/SaveService';
import { App } from './ui/App';
import { h } from './ui/dom';
import { Modal } from './ui/Modal';
import { showExport, showImport } from './ui/saveDialogs';
import { SettingsPanel } from './ui/SettingsPanel';

const AUTOSAVE_MS = 15_000;

/** Lance la partie d'un cabinet (`null` : sans sauvegarde) et branche les déclencheurs de sauvegarde. */
export function startSession(profileId: string | null, saves: LocalSaveService): void {
  const loaded: LoadResult = profileId ? saves.load(profileId) : { status: 'unavailable', state: createInitialState(Date.now()) };
  const store = new GameStore(loaded.state);
  const firstReport = store.catchUp(Date.now());

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#232c3b',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    input: { mouse: { preventDefaultWheel: true } },
    scene: [new MapScene(store)],
  });
  const app = new App(store, game);

  let lastSaveFailed = false;
  // Tant qu'une sauvegarde abîmée attend la décision du joueur, rien n'est écrit (la copie de secours est préservée).
  let savingEnabled = loaded.status !== 'corrupt';
  const save = (): void => {
    if (!profileId || !savingEnabled) return;
    const result = saves.save(profileId, store.getState());
    if (!result.ok && !lastSaveFailed) app.notifications.show('Sauvegarde', saveErrorText(result), 'warning', 6000);
    lastSaveFailed = !result.ok;
  };

  const showReport = (report: OfflineReport): void => {
    if (!shouldShowOfflineReport(report)) return;
    const duration = report.capped
      ? `${formatDuration(report.creditedMs)} (absence de ${formatDuration(report.elapsedMs)}, plafonnée)`
      : formatDuration(report.creditedMs);
    Modal.open({
      title: 'Pendant votre absence',
      body: [
        h(
          'dl',
          { class: 'modal__facts' },
          h('dt', { text: 'Durée prise en compte' }),
          h('dd', { text: duration }),
          h('dt', { text: 'Gain' }),
          h('dd', { class: 'modal__money', text: `+${formatMoney(report.earned)}` }),
          h('dt', { text: 'Nouveau solde' }),
          h('dd', { text: formatMoney(report.moneyAfter) }),
        ),
      ],
      buttons: [{ label: 'Au travail !', tone: 'primary' }],
      dismiss: { label: 'Au travail !' },
    });
  };

  const welcomeBack = (): void => {
    const report = store.catchUp(Date.now());
    save();
    showReport(report);
  };

  // Chargement : sauvegarde abîmée → proposer la copie de secours, sinon récapitulatif d'absence.
  if (loaded.status === 'corrupt' && profileId) {
    Modal.open({
      title: SAVE_TEXTS.corruptTitle,
      body: [h('p', { text: SAVE_TEXTS.corruptBody })],
      buttons: [
        ...(loaded.backupAvailable
          ? [
              {
                label: 'Restaurer la copie de secours',
                tone: 'primary' as const,
                onClick: () => {
                  savingEnabled = true;
                  const restored = saves.restoreBackup(profileId);
                  if (restored) store.replace(restored);
                  welcomeBack();
                },
              },
            ]
          : []),
        {
          label: 'Recommencer',
          tone: loaded.backupAvailable ? ('ghost' as const) : ('primary' as const),
          onClick: () => {
            savingEnabled = true;
            save();
          },
        },
      ],
    });
  } else {
    save();
    showReport(firstReport);
  }

  // Déclencheurs : toutes les 15 s, après chaque achat, onglet caché, page quittée.
  window.setInterval(save, AUTOSAVE_MS);
  store.onAction((action, result) => {
    if (result.ok && action.type !== 'click') save();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
    else welcomeBack();
  });
  window.addEventListener('pagehide', save);

  // Simulation à pas fixes ; une longue interruption (veille, onglet gelé) passe par le rattrapage plafonné.
  const loop = () => {
    const now = Date.now();
    if (isAbsence(store.getState(), now)) welcomeBack();
    else store.tick(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const profileName = profileId ? (saves.profiles.get(profileId)?.name ?? null) : null;
  const settings = new SettingsPanel(profileName, {
    onSwitchProfile: () => {
      save();
      window.location.reload();
    },
    onExport: () => {
      save();
      const text = profileId ? saves.exportText(profileId) : null;
      if (text && profileName) showExport(text, profileName);
    },
    onImport: () =>
      showImport(saves, (profile) =>
        app.notifications.show('Cabinet importé', `« ${profile.name} » est disponible sur l’écran d’accueil.`, 'success', 5000),
      ),
    onReset: () => confirmReset(() => {
      store.replace(createInitialState(Date.now()));
      save();
      app.notifications.show('Cabinet réinitialisé', 'La partie repart de zéro.');
    }),
  });
  document.querySelector('#settings')?.addEventListener('click', () => app.show('Paramètres', settings));
}

/** Réinitialisation : double confirmation. */
function confirmReset(onConfirmed: () => void): void {
  Modal.open({
    title: 'Réinitialiser ce cabinet ?',
    body: [h('p', { text: SAVE_TEXTS.resetWarning })],
    buttons: [
      { label: 'Annuler' },
      {
        label: 'Continuer',
        tone: 'danger',
        onClick: () =>
          void Modal.open({
            title: 'Dernière confirmation',
            body: [h('p', { text: SAVE_TEXTS.resetConfirm })],
            buttons: [{ label: 'Annuler' }, { label: 'Tout effacer', tone: 'danger', onClick: onConfirmed }],
            dismiss: { label: 'Annuler' },
          }),
      },
    ],
    dismiss: { label: 'Annuler' },
  });
}
