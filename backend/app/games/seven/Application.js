/**
 * Application Bootstrap
 * Single Responsibility: Application initialization
 */

import { GAME_CONSTANTS, NOTIFICATION_TONE } from './constants.js';
import { UIManager } from './ui/UIManager.js';
import { GameState } from './game/GameState.js';
import { GameController } from './game/GameController.js';
import { DiceRenderer } from './renderer/DiceRenderer.js';
import { PlatformSDKAdapter } from './platform/PlatformSDKAdapter.js';
import { EventHandler } from './events/EventHandler.js';

export class Application {
  constructor() {
    this._gameController = null;
    this._eventHandler = null;
  }

  async start() {
    if (!this._isThreeJSLoaded()) {
      setTimeout(() => this.start(), 100);
      return;
    }

    this._initializeComponents();
    
    // Listen for platform messages (XP banner, level-up) and render them in-game
    window.addEventListener('message', (event) => {
      try {
        if (!event.data || !event.data.type) return;

        if (event.data.type === 'showXPBanner' && event.data.payload) {
          this._gameController._ui.showXPBanner(event.data.payload.xp_earned, event.data.payload);
        }

        if (event.data.type === 'showLevelUpModal' && event.data.payload) {
          this._gameController._ui.showLevelUpModal(event.data.payload);
        }
      } catch (err) {
        console.error('[Seven] Error handling platform message:', err);
      }
    });

    await this._initializePlatformSDK();
    
    // Load coins after platform is ready
    await this._loadUserCoins();

    // Ensure game is always in active state after initialization
    this._gameController.resume();

    const uiManager = this._gameController._ui;
    const state = this._gameController.getState();
    uiManager.setNotice('Choose your bets and roll the dice!', NOTIFICATION_TONE.OK);
  }
  
  async _loadUserCoins() {
    const platformAdapter = this._gameController._platform;
    const gameState = this._gameController._state;
    
    if (!platformAdapter.isAvailable()) {

      return;
    }
    
    // Aspetta che arrivi il config con userId (max 3 secondi)

    const maxWait = 3000;
    const startWait = Date.now();
    while (!window.platformConfig?.userId && (Date.now() - startWait < maxWait)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (window.platformConfig?.userId) {

    } else {

      return;
    }
    

    const balance = await platformAdapter.getUserBalance();

    
    // Balance can be 0, so check for null/undefined specifically
    if (balance !== null && balance !== undefined && typeof balance === 'number') {
      gameState.setPlatformBalance(balance);
      gameState.enablePlatformCoins(true);
      this._gameController._ui.updateHUD(gameState.bank);
      
      if (balance > 0) {
        this._gameController._ui.setNotice(
          `You have ${balance} coins available.`,
          NOTIFICATION_TONE.OK
        );
      } else {
        this._gameController._ui.setNotice(
          'Balance: 0 coins. Win to earn more!',
          NOTIFICATION_TONE.NEUTRAL
        );
      }

    } else {

    }
  }

  _isThreeJSLoaded() {
    return typeof THREE !== 'undefined';
  }

  _initializeComponents() {
    const uiManager = new UIManager();
    const gameState = new GameState();
    const platformAdapter = new PlatformSDKAdapter();

    const canvas = uiManager.getCanvas();
    const renderer = new DiceRenderer(canvas);
    renderer.initialize();

    this._gameController = new GameController(
      uiManager,
      gameState,
      renderer,
      platformAdapter
    );

    this._eventHandler = new EventHandler(uiManager, this._gameController);
    this._eventHandler.attachEventListeners();

    const state = this._gameController.getState();
    uiManager.updateBetAmount(uiManager.getBetAmount());
    uiManager.updateHUD(state.bank);
    
    // Force game to start in active state - hide pause overlay
    uiManager.setControlsEnabled(true);
  }

  async _initializePlatformSDK() {
    const platformAdapter = this._gameController._platform;
    const gameState = this._gameController._state;

    // Initialize offline mode as default
    gameState.enablePlatformCoins(false);
    gameState.setPlatformBalance(GAME_CONSTANTS.INITIAL_BANK);
    this._gameController._ui.updateHUD(gameState.bank);

    if (!platformAdapter.isAvailable()) {

      this._gameController._ui.setNotice(
        'Offline mode: using local coins.',
        NOTIFICATION_TONE.NEUTRAL
      );
      return;
    }

    try {
      await platformAdapter.initialize({
        onStart: () => {

          this._gameController.resume();
        },
        onPause: () => {

          this._gameController.pause();
        },
        onResume: () => {

          this._gameController.resume();
        },
        onExit: () => this._handleExit(),
        onConfig: () => {

        }
      });

      // Send initial score
      await platformAdapter.sendScore(0, {
        rounds_played: 0,
        bank: gameState.bank
      });
      

    } catch (error) {
      gameState.enablePlatformCoins(false);
      gameState.setPlatformBalance(GAME_CONSTANTS.INITIAL_BANK);
      this._gameController._ui.setNotice(
        'Offline mode: using local coins.',
        NOTIFICATION_TONE.NEUTRAL
      );
    }
  }

  _handleExit() {
    this._gameController.cleanup();

    const state = this._gameController.getState();
    this._gameController._platform.gameOver(state.score, {
      rounds_played: state.rounds,
      bank: state.bank
    });
  }
}
