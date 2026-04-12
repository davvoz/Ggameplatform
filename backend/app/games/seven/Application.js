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
  _gameController = null;
  _eventHandler = null;

  async start() {
    if (!this._isThreeJSLoaded()) {
      setTimeout(() => this.start(), 100);
      return;
    }

    this._initializeComponents();

    await this._initializePlatformSDK();

    // Register platform message handlers via SDK (origin validation handled by SDK)
    this._registerPlatformEventHandlers();

    // Load coins after platform is ready
    await this._loadUserCoins();

    // Ensure game is always in active state after initialization
    this._gameController.resume();

    const uiManager = this._gameController._ui;
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
    while (!globalThis.platformConfig?.userId && (Date.now() - startWait < maxWait)) {
      await new Promise(resolve => setTimeout(resolve, 100));
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
      console.error('[Application] Platform SDK initialization error:', error);
      gameState.enablePlatformCoins(false);
      gameState.setPlatformBalance(GAME_CONSTANTS.INITIAL_BANK);
      this._gameController._ui.setNotice(
        'Offline mode: using local coins.',
        NOTIFICATION_TONE.NEUTRAL
      );
    }
  }

  /**
   * Register handlers for platform events using SDK's secure event system
   * Origin validation is handled by PlatformSDK internally
   */
  _registerPlatformEventHandlers() {
    const platformAdapter = this._gameController._platform;
    if (!platformAdapter.isAvailable()) {
      return;
    }

    // XP Banner event - SDK validates origin before triggering
    platformAdapter.on('showXPBanner', (payload) => {
      try {
        if (!payload) return;
        const xp = Number(payload.xp_earned);
        if (!Number.isFinite(xp)) return;
        this._gameController._ui.showXPBanner(xp, payload);
      } catch (err) {
        console.error('[Seven] Error handling showXPBanner:', err);
      }
    });

    // Level Up Modal event - SDK validates origin before triggering
    platformAdapter.on('showLevelUpModal', (payload) => {
      try {
        if (!payload) return;
        // Sanitize numeric values
        const sanitized = {
          old_level: Number.isFinite(Number(payload.old_level)) ? Number(payload.old_level) : null,
          new_level: Number.isFinite(Number(payload.new_level)) ? Number(payload.new_level) : null,
          title: String(payload.title || ''),
          badge: String(payload.badge || ''),
          coins_awarded: Number.isFinite(Number(payload.coins_awarded)) ? Number(payload.coins_awarded) : 0,
          is_milestone: Boolean(payload.is_milestone),
          user_data: payload.user_data && typeof payload.user_data === 'object' ? {
            is_anonymous: Boolean(payload.user_data.is_anonymous)
          } : {}
        };
        this._gameController._ui.showLevelUpModal(sanitized);
      } catch (err) {
        console.error('[Seven] Error handling showLevelUpModal:', err);
      }
    });
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
