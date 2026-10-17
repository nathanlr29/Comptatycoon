import './settings';
import { getBrowserStorage, LocalSaveService, requestPersistentStorage } from './persistence/LocalSaveService';
import { ProfileStore } from './persistence/ProfileStore';
import { startSession } from './session';
import { ProfileScreen } from './ui/ProfileScreen';
import './styles/main.css';
import './styles/ui.css';
import './styles/profiles.css';
import './styles/expansion.css';
import './styles/coffee.css';
import './styles/settings.css';

const storage = getBrowserStorage();
const saves = new LocalSaveService(storage, new ProfileStore(storage));
void requestPersistentStorage();

// Écran d'accueil d'abord : Phaser n'est démarré qu'une fois le cabinet choisi.
const screen = new ProfileScreen(document.body, saves, storage !== null, {
  onPlay: (profileId) => {
    screen.hide();
    startSession(profileId, saves);
  },
});

// Safari iOS : empêche le zoom de la page par pincement (le canvas gère son propre zoom).
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
