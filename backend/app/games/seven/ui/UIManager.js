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
      betAmountRange: document.getElementById('betAmountRange'),
      betAmount: document.getElementById('betAmount'),
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
    this.elements.betAmount.textContent = String(amount);
  }

  getBetAmount() {
    return parseInt(this.elements.betAmountRange.value, 10);
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
    this.elements.betAmountRange.disabled = !enabled;
    
    // Disable bet type buttons
    const betButtons = document.querySelectorAll('[data-bet-type]');
    betButtons.forEach(btn => btn.disabled = !enabled);
    
    // Disable mode buttons while rolling
    this.elements.modeButtons.forEach(btn => btn.disabled = !enabled);
  }

  updateBetMode(mode) {
    // Update slider min/max/step
    this.elements.betAmountRange.min = mode.minBet;
    this.elements.betAmountRange.max = mode.maxBet;
    this.elements.betAmountRange.step = mode.minBet; // Step deve corrispondere al minBet
    this.elements.betAmountRange.value = mode.defaultBet;
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
