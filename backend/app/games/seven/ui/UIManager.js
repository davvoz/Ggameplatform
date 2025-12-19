/**
 * UI Manager
 * Single Responsibility: User Interface management
 */

import { NOTIFICATION_TONE } from '../constants.js';
import { MathUtils } from '../utils/MathUtils.js';

export class UIManager {
  constructor() {
    this.elements = this._initializeElements();
  }

  _initializeElements() {
    return Object.freeze({
      canvas: document.getElementById('diceCanvas'),
      resultSum: document.getElementById('resultSum'),
      resultDetail: document.getElementById('resultDetail'),
      notice: document.getElementById('notice'),
      resetBtn: document.getElementById('resetBtn'),
      hudBank: document.getElementById('hudBank'),
      pauseOverlay: document.getElementById('pauseOverlay'),
      
      // Betting System
      betTypes: document.getElementById('betTypes'),
      betAmountInput: document.getElementById('betAmountInput'),
      increaseBet: document.getElementById('increaseBet'),
      decreaseBet: document.getElementById('decreaseBet'),
      doubleBtn: document.getElementById('doubleBtn'),
      halfBtn: document.getElementById('halfBtn'),
      modeButtons: document.querySelectorAll('.mode-btn')
    });
  }

  setNotice(text, tone = NOTIFICATION_TONE.NEUTRAL) {
    this.elements.notice.textContent = text;
    this.elements.notice.dataset.tone = tone;
  }

  updateHUD(bank) {
    this.elements.hudBank.textContent = String(bank);
  }

  updateBetAmount(amount) {
    this.elements.betAmountInput.value = String(amount);
    this._updateBetButtons();
  }

  getBetAmount() {
    return parseInt(this.elements.betAmountInput.value, 10);
  }

  _updateBetButtons() {
    const currentBet = this.getBetAmount();
    const min = parseInt(this.elements.betAmountInput.min, 10);
    const max = parseInt(this.elements.betAmountInput.max, 10);
    const step = parseInt(this.elements.betAmountInput.step || 1, 10);

    // Disable decrease if at minimum
    this.elements.decreaseBet.disabled = currentBet <= min;
    
    // Disable increase if at maximum
    this.elements.increaseBet.disabled = currentBet >= max;
    
    // Disable double if would exceed max
    this.elements.doubleBtn.disabled = currentBet * 2 > max;
    
    // Disable half if would go below min
    this.elements.halfBtn.disabled = Math.floor(currentBet / 2) < min;
  }

  _getBetDisplayName(type) {
    const names = {
      'exact_total': 'Totale Esatto',
      'low_range': 'Totale Basso',
      'seven': 'Lucky Seven',
      'high_range': 'Totale Alto',
      'even': 'Pari',
      'odd': 'Dispari',
      'double': 'Doppio',
      'sequence': 'Sequenza',
      'snake_eyes': 'Snake Eyes',
      'boxcars': 'Boxcars'
    };
    return names[type] || type;
  }

  resetResult() {
    this.elements.resultSum.textContent = '—';
    this.elements.resultDetail.textContent = 'Scegli Sopra o Sotto e lancia.';
  }

  setControlsEnabled(enabled) {
    this.elements.betAmountInput.disabled = !enabled;
    this.elements.increaseBet.disabled = !enabled;
    this.elements.decreaseBet.disabled = !enabled;
    this.elements.doubleBtn.disabled = !enabled;
    this.elements.halfBtn.disabled = !enabled;
    
    // Disable bet type buttons
    const betButtons = document.querySelectorAll('[data-bet-type]');
    betButtons.forEach(btn => btn.disabled = !enabled);
    
    // Disable mode buttons while rolling
    this.elements.modeButtons.forEach(btn => btn.disabled = !enabled);
    
    // Re-check button states if enabled
    if (enabled) {
      this._updateBetButtons();
    }
  }

  updateBetMode(mode) {
    // Update input min/max/step
    this.elements.betAmountInput.min = mode.minBet;
    this.elements.betAmountInput.max = mode.maxBet;
    this.elements.betAmountInput.step = mode.minBet; // Step deve corrispondere al minBet
    this.elements.betAmountInput.value = mode.defaultBet;
    this.updateBetAmount(mode.defaultBet);
    
    // Update active mode button
    this.elements.modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode.id) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  getCanvas() {
    return this.elements.canvas;
  }

  getStakeValue() {
    return parseInt(this.elements.stakeRange.value, 10);
  }
}
