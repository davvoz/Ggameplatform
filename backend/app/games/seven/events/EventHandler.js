/**
 * Event Handler
 * Single Responsibility: Event management
 */

import { BET_TYPE, BET_MODES } from '../constants.js';

export class EventHandler {
  constructor(uiManager, gameController) {
    this._ui = uiManager;
    this._controller = gameController;
  }

  attachEventListeners() {
    this._attachRoundEvents();
    this._attachModalEvents();
    this._attachBetTypeEvents();
    this._attachBetAmountEvents();
    this._attachBetManagementEvents();
    this._attachModeEvents();
    this._attachKeyboardEvents();
  }

  _attachModalEvents() {
    // Open bets modal
    const openBetsBtn = document.getElementById('openBetsBtn');
    const betsModal = document.getElementById('betsModal');
    const closeBetsModal = document.getElementById('closeBetsModal');
    const betsModalOverlay = document.getElementById('betsModalOverlay');
    
    openBetsBtn?.addEventListener('click', () => {
      betsModal.hidden = false;
    });
    
    closeBetsModal?.addEventListener('click', () => {
      betsModal.hidden = true;
    });
    
    betsModalOverlay?.addEventListener('click', () => {
      betsModal.hidden = true;
    });

    // Open view bets modal
    const viewBetsBtn = document.getElementById('viewBetsBtn');
    const viewBetsModal = document.getElementById('viewBetsModal');
    const closeViewBetsModal = document.getElementById('closeViewBetsModal');
    const viewBetsModalOverlay = document.getElementById('viewBetsModalOverlay');
    
    viewBetsBtn?.addEventListener('click', () => {
      viewBetsModal.hidden = false;
    });
    
    closeViewBetsModal?.addEventListener('click', () => {
      viewBetsModal.hidden = true;
    });
    
    viewBetsModalOverlay?.addEventListener('click', () => {
      viewBetsModal.hidden = true;
    });

    // Close modals with ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        betsModal.hidden = true;
        viewBetsModal.hidden = true;
      }
    });
  }

  _attachRoundEvents() {
    // Round events removed - simple bet system only
  }

  _attachBetTypeEvents() {
    // Trova TUTTI i bottoni con data-bet-type in tutta la pagina
    const allBetButtons = document.querySelectorAll('[data-bet-type]');
    
    console.log('[EventHandler] Found bet buttons:', allBetButtons.length);
    
    allBetButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const betType = button.dataset.betType;
        const amount = this._ui.getBetAmount();
        
        console.log('[EventHandler] Bet button clicked:', betType, 'Amount:', amount);
        
        // Tira subito i dadi con questa scommessa
        await this._controller.rollWithBet(betType, amount);
      });
    });
  }

  _attachBetAmountEvents() {
    this._ui.elements.betAmountRange.addEventListener('input', () => {
      const value = this._ui.getBetAmount();
      this._ui.updateBetAmount(value);
    });

    // Double button
    const doubleBtn = document.getElementById('doubleBtn');
    if (doubleBtn) {
      doubleBtn.addEventListener('click', () => {
        const currentValue = this._ui.getBetAmount();
        const maxValue = parseInt(this._ui.elements.betAmountRange.max, 10);
        const newValue = Math.min(currentValue * 2, maxValue);
        
        this._ui.elements.betAmountRange.value = newValue;
        this._ui.updateBetAmount(newValue);
      });
    }
  }

  _attachBetManagementEvents() {
    // No bet list management needed
  }

  _attachModeEvents() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const modeId = btn.dataset.mode;
        this._handleModeChange(modeId);
      });
    });
  }

  _handleModeChange(modeId) {
    let selectedMode;
    if (modeId === 'casual') {
      selectedMode = BET_MODES.CASUAL;
    } else if (modeId === 'standard') {
      selectedMode = BET_MODES.STANDARD;
    } else if (modeId === 'high_roller') {
      selectedMode = BET_MODES.HIGH_ROLLER;
    }
    
    if (selectedMode) {
      const state = this._controller.getState();
      state.setBetMode(selectedMode);
      this._ui.updateBetMode(selectedMode);
    }
  }

  _attachKeyboardEvents() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat || this._isInputFocused()) {
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        this._controller.roll();
      } else if (event.key === 'b' || event.key === 'B') {
        // Quick buy round shortcut
        const amount = this._ui.getRoundAmount();
        this._controller.purchaseRound(amount).then(success => {
          if (success) {
            const state = this._controller.getState();
            this._ui.updateRoundBudget(state.roundBudget);
          }
        });
      }
    });
  }

  _isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && ['INPUT', 'BUTTON'].includes(activeElement.tagName);
  }
}
