import { Game } from './core/Game.js';
import { PlatformBridge } from './platform/PlatformBridge.js';

/**
 * Application bootstrap. Initializes the platform bridge, builds the game and
 * wires lifecycle events. Kept intentionally tiny: all logic lives in states.
 */
const bridge = new PlatformBridge();
await bridge.init();

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
const game = new Game(canvas, ui, bridge);

bridge.on('pause', () => game.pause());
bridge.on('resume', () => game.resume());
bridge.on('exit', () => game.destroy());

game.start();
