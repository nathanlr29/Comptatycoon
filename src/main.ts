import './settings';
import { getBrowserStorage, LocalSaveService, requestPersistentStorage } from './persistence/LocalSaveService';
import { ProfileStore } from './persistence/ProfileStore';
import { startSession } from './session';
import { preventPageZoom } from './ui/pageZoom';
import { ProfileScreen } from './ui/ProfileScreen';
import './styles/main.css';
import './styles/ui.css';
import './styles/profiles.css';
import './styles/expansion.css';
import './styles/coffee.css';
import './styles/settings.css';
import './styles/facade.css';

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

preventPageZoom();
