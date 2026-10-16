import Phaser from 'phaser';
import { MapScene } from './game/MapScene';
import './styles/main.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#8fbf6a',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [MapScene],
});
