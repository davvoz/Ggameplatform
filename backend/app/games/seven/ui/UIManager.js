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
      hudScore: document.getElementById('hudScore'),
      pauseOverlay: document.getElementById('pauseOverlay'),
      
      hudRounds: document.getElementById('hudRounds'),
      
      // Betting System
      betTypes: document.getElementById('betTypes'),
      betAmountRange: document.getElementById('betAmountRange'),
      betAmount: document.getElementById('betAmount')
    });
  }

  setNotice(text, tone = NOTIFICATION_TONE.NEUTRAL) {
    this.elements.notice.textContent = text;
    this.elements.notice.dataset.tone = tone;
  }

  updateHUD(rounds, bank, score) {
    this.elements.hudRounds.textContent = String(rounds);
    this.elements.hudBank.textContent = String(bank);
    this.elements.hudScore.textContent = MathUtils.formatSigned(score);
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
  }

  getCanvas() {
    return this.elements.canvas;
  }

  getStakeValue() {
    return parseInt(this.elements.stakeRange.value, 10);
  }
}
