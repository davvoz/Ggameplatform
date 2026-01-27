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

  /**
   * Show XP banner inside the game (platform-triggered)
   * @param {number} xpAmount
   * @param {object|null} payload
   */
  showXPBanner(xpAmount, payload = null) {
    try {
      // Ensure blocky-road XP banner styles are available in this game
      if (!document.querySelector('#game-xp-styles')) {
        const style = document.createElement('style');
        style.id = 'game-xp-styles';
        style.textContent = `
          .game-xp-banner {
              position: fixed;
              top: 80px;
              right: 20px;
              z-index: 10000;
              animation: xpSlideIn 0.5s ease;
              pointer-events: none;
          }
          .game-xp-banner.hiding {
              animation: xpSlideOut 0.5s ease forwards;
          }
          .game-xp-badge {
              background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
              padding: 16px 24px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
              display: flex;
              align-items: center;
              gap: 12px;
          }
          .game-xp-icon { font-size: 1.5em; }
          .game-xp-amount { font-size: 1.2em; font-weight: bold; color: #1a1a1a; }
          @keyframes xpSlideIn {
              from { transform: translateX(400px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
          }
          @keyframes xpSlideOut {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(400px); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      // Create banner using shared game markup used by other games (game-xp-banner)
      const banner = document.createElement('div');
      banner.className = 'game-xp-banner';
      banner.innerHTML = `
        <div class="game-xp-badge">
          <span class="game-xp-icon">⭐</span>
          <span class="game-xp-amount">+${Number(xpAmount).toFixed(2)} XP</span>
        </div>
      `;

      document.body.appendChild(banner);

      // Trigger any CSS animations from existing styles
      setTimeout(() => banner.classList.add('show'), 10);

      // Hide using the same class other games use so CSS can animate out
      setTimeout(() => {
        banner.classList.add('hiding');
        setTimeout(() => {
          if (banner.parentElement) banner.remove();
        }, 600);
      }, 3500);
    } catch (err) {
      // Silent fail to avoid breaking game
      console.error('[UIManager] showXPBanner error:', err);
    }
  }

  /**
   * Show level-up modal inside the game (platform-triggered)
   * @param {object} levelUpData
   */
  showLevelUpModal(levelUpData = {}) {
    try {
      const { old_level, new_level, title = '', badge = '', coins_awarded = 0, is_milestone = false, user_data = {} } = levelUpData;

      const isAnonymous = user_data?.is_anonymous === true;

      const modal = document.createElement('div');
      modal.className = 'level-up-modal';
      modal.innerHTML = `
        <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
          <div class="level-up-animation">
            <div class="level-up-rays"></div>
            <div class="level-up-badge-container">
              <span class="level-up-badge">${badge || '🏅'}</span>
            </div>
          </div>
          <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
          <div class="level-up-levels">
            <span class="old-level">${old_level ?? '-'}</span>
            <span class="level-arrow">→</span>
            <span class="new-level">${new_level ?? '-'}</span>
          </div>
          <div class="level-up-new-title">${title}</div>
          ${is_milestone ? '<div class="level-up-milestone-badge">✨ MILESTONE ✨</div>' : ''}
          ${!isAnonymous && coins_awarded > 0 ? `
            <div class="level-up-reward">
              <span class="reward-icon">🪙</span>
              <span class="reward-amount">+${coins_awarded} Coins</span>
            </div>
          ` : ''}
          <button class="level-up-close">Continue</button>
        </div>
      `;


      // Ensure shared level-up styles are loaded (same as quest.js)
      if (!document.querySelector('#level-up-styles')) {
        const link = document.createElement('link');
        link.id = 'level-up-styles';
        link.rel = 'stylesheet';
        link.href = '/css/level-widget.css';
        document.head.appendChild(link);
      }

      document.body.appendChild(modal);

      // Small delay to allow CSS transitions
      setTimeout(() => modal.classList.add('show'), 10);

      const closeBtn = modal.querySelector('.level-up-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        });
      }

      // Auto close after 6s
      setTimeout(() => {
        if (modal.parentElement) {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        }
      }, 6000);
    } catch (err) {
      console.error('[UIManager] showLevelUpModal error:', err);
    }
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
      'exact_total': 'Exact Total',
      'low_range': 'Low Total',
      'seven': 'Lucky Seven',
      'high_range': 'High Total',
      'even': 'Even',
      'odd': 'Odd',
      'double': 'Double',
      'sequence': 'Sequence',
      'snake_eyes': 'Snake Eyes',
      'boxcars': 'Boxcars'
    };
    return names[type] || type;
  }

  resetResult() {
    this.elements.resultSum.textContent = '—';
    this.elements.resultDetail.textContent = 'Choose Over or Under and roll.';
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
