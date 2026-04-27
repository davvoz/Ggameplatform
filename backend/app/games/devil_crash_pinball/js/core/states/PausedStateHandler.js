import { GameStateHandler } from './GameStateHandler.js';

/**
 * Handles PAUSED: the game loop ticks (audio/HUD still update in Game._update)
 * but no physics, input, or board logic advances.
 * The base GameStateHandler no-op update is sufficient.
 */
export class PausedStateHandler extends GameStateHandler {}
