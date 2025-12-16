/**
 * Game State
 * Single Responsibility: State management
 */

import { GAME_CONSTANTS, BET_MODES } from '../constants.js';
import { MathUtils } from '../utils/MathUtils.js';

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this._currentBet = null;
    this._rounds = 0;
    this._bank = GAME_CONSTANTS.INITIAL_BANK;
    this._platformBalance = 0;
    this._usePlatformCoins = true;
    this._score = 0;
    this._rolling = false;
    this._paused = false;
    this._history = [];
    this._currentRoundStats = this._createRoundStats();
    this._betMode = BET_MODES.CASUAL; // Default mode
  }

  _createRoundStats() {
    return {
      rollsPlayed: 0,
      totalBet: 0,
      totalWon: 0,
      netProfit: 0,
      winningRolls: 0,
      losingRolls: 0
    };
  }

  get currentBet() {
    return this._currentBet;
  }

  setCurrentBet(bet) {
    this._currentBet = bet;
  }

  clearCurrentBet() {
    this._currentBet = null;
  }

  get rounds() {
    return this._rounds;
  }

  get bank() {
    return this._usePlatformCoins ? this._platformBalance : GAME_CONSTANTS.INITIAL_BANK;
  }

  get roundBudget() {
    return this._roundBudget;
  }

  get currentRoundStats() {
    return { ...this._currentRoundStats };
  }

  get hasActiveRound() {
    return this._roundBudget > 0;
  }

  get score() {
    return this._score;
  }

  get rolling() {
    return this._rolling;
  }

  set rolling(value) {
    this._rolling = value;
  }

  get paused() {
    return this._paused;
  }

  set paused(value) {
    this._paused = value;
  }

  get history() {
    return [...this._history];
  }

  incrementRounds() {
    this._rounds++;
  }

  updateBank(delta) {
    if (this._usePlatformCoins) {
      // Platform coins are updated via API calls
      // Just update local cache
      this._platformBalance = Math.max(0, this._platformBalance + delta);
    } else {
      // Fallback to old system
      this._platformBalance = MathUtils.clamp(
        this._platformBalance + delta,
        GAME_CONSTANTS.MIN_BANK,
        GAME_CONSTANTS.MAX_BANK
      );
    }
  }

  setPlatformBalance(balance) {
    this._platformBalance = balance;
  }

  enablePlatformCoins(enable) {
    this._usePlatformCoins = enable;
  }

  updateScore(delta) {
    this._score += delta;
  }

  addHistoryEntry(entry) {
    this._history.unshift(entry);
    this._history = this._history.slice(0, GAME_CONSTANTS.MAX_HISTORY_SIZE);
  }

  hasInsufficientFunds(amount) {
    const balance = this._usePlatformCoins ? this._platformBalance : this._bank;
    return balance < amount;
  }

  // Round Budget Management
  purchaseRound(amount) {
    // Aggiungi importo al budget del round
    this._roundBudget += amount;
    this._rounds++;
    return true;
  }

  spendFromRoundBudget(amount) {
    if (this._roundBudget >= amount) {
      this._roundBudget -= amount;
      return true;
    }
    return false;
  }

  addToRoundBudget(amount) {
    // Aggiungi vincite al budget del round
    this._roundBudget += amount;
  }

  updateRoundStats(totalBet, totalWon) {
    this._currentRoundStats.totalBet += totalBet;
    this._currentRoundStats.totalWon += totalWon;
    this._currentRoundStats.netProfit = this._currentRoundStats.totalWon - this._currentRoundStats.totalBet;
    
    if (totalWon > 0) {
      this._currentRoundStats.winningRolls++;
    } else {
      this._currentRoundStats.losingRolls++;
    }
  }

  _addRoundToHistory() {
    // Salva statistiche round nella history
    this.addHistoryEntry({
      type: 'round_complete',
      stats: { ...this._currentRoundStats },
      timestamp: Date.now()
    });
  }

  get betMode() {
    return this._betMode;
  }

  setBetMode(mode) {
    this._betMode = mode;
  }

  getMinBet() {
    return this._betMode.minBet;
  }

  getMaxBet() {
    return this._betMode.maxBet;
  }

  getDefaultBet() {
    return this._betMode.defaultBet;
  }
}
