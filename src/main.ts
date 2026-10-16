import Phaser from 'phaser';
import { createInitialState } from './core/state';
import { GameStore } from './core/store';
import { MapScene } from './game/MapScene';
import { App } from './ui/App';
import './styles/main.css';
import './styles/ui.css';

const store = new GameStore(createInitialState(Date.now()));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#232c3b',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  input: { mouse: { preventDefaultWheel: true } },
  scene: [new MapScene(store)],
});

new App(store, game);

// Simulation : la production est créditée par pas fixes, quelle que soit la fréquence d'images.
const loop = () => {
  store.tick(Date.now());
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// Safari iOS : empêche le zoom de la page par pincement (le canvas gère son propre zoom).
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
