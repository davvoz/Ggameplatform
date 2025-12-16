/**
 * Bet System
 * Single Responsibility: Gestione logica scommesse, validazione e calcolo vincite
 */

import { BET_TYPE, GAME_CONSTANTS } from '../constants.js';

export class BetSystem {
  /**
   * Valida una scommessa
   * @param {Object} bet - { type: BET_TYPE, amount: number }
   * @returns {Object} { valid: boolean, error?: string }
   */
  static validateBet(bet) {
    if (!bet || typeof bet !== 'object') {
      return { valid: false, error: 'Scommessa non valida' };
    }

    const { type, amount } = bet;

    // Verifica tipo scommessa (solo UNDER o OVER)
    if (!Object.values(BET_TYPE).includes(type)) {
      return { valid: false, error: 'Tipo di scommessa non valido (usa UNDER o OVER)' };
    }

    // Verifica ammontare
    if (typeof amount !== 'number' || amount < GAME_CONSTANTS.MIN_BET_AMOUNT || amount > GAME_CONSTANTS.MAX_BET_AMOUNT) {
      return { 
        valid: false, 
        error: `Ammontare deve essere tra ${GAME_CONSTANTS.MIN_BET_AMOUNT} e ${GAME_CONSTANTS.MAX_BET_AMOUNT}` 
      };
    }

    return { valid: true };
  }

  /**
   * Valida array di scommesse per un singolo tiro
   * @param {Array} bets - Array di scommesse
   * @returns {Object} { valid: boolean, error?: string }
   */
  static validateBets(bets) {
    if (!Array.isArray(bets)) {
      return { valid: false, error: 'Le scommesse devono essere un array' };
    }

    if (bets.length === 0) {
      return { valid: false, error: 'Devi piazzare almeno una scommessa' };
    }

    if (bets.length > 1) {
      return { valid: false, error: 'Puoi fare solo una scommessa per tiro (UNDER o OVER)' };
    }

    // Valida la singola scommessa
    const validation = this.validateBet(bets[0]);
    if (!validation.valid) {
      return validation;
    }

    return { valid: true };
  }

  /**
   * Calcola ammontare totale delle scommesse
   * @param {Array} bets - Array di scommesse
   * @returns {number}
   */
  static calculateTotalBetAmount(bets) {
    return bets.reduce((sum, bet) => sum + bet.amount, 0);
  }

  /**
   * Verifica se una scommessa è vincente
   * @param {Object} bet - Scommessa
   * @param {number} diceA - Risultato primo dado (1-6)
   * @param {number} diceB - Risultato secondo dado (1-6)
   * @returns {boolean}
   */
  static isBetWinning(bet, diceA, diceB) {
    const total = diceA + diceB;
    const { type } = bet;

    // Se esce 7, si perde sempre
    if (total === 7) {
      return false;
    }

    // UNDER: vinci se totale < 7
    if (type === BET_TYPE.UNDER) {
      return total < 7;
    }

    // OVER: vinci se totale > 7
    if (type === BET_TYPE.OVER) {
      return total > 7;
    }

    return false;
  }

  /**
   * Calcola vincita per una scommessa
   * @param {Object} bet - Scommessa
   * @param {number} diceA - Risultato primo dado
   * @param {number} diceB - Risultato secondo dado
   * @returns {number} - Vincita (0 se perde, amount se vince - payout 1:1)
   */
  static calculateWinnings(bet, diceA, diceB) {
    if (!this.isBetWinning(bet, diceA, diceB)) {
      return 0;
    }

    // Payout 1:1 (vinci l'importo che hai scommesso)
    return bet.amount;
  }

  /**
   * Processa la scommessa per un tiro
   * @param {Array} bets - Array con singola scommessa
   * @param {number} diceA - Risultato primo dado
   * @param {number} diceB - Risultato secondo dado
   * @returns {Object} { totalWinnings: number, results: Array }
   */
  static processBets(bets, diceA, diceB) {
    const bet = bets[0]; // Solo una scommessa per tiro
    const isWinning = this.isBetWinning(bet, diceA, diceB);
    const winnings = this.calculateWinnings(bet, diceA, diceB);
    
    const result = {
      bet,
      isWinning,
      winnings,
      multiplier: 1 // Payout fisso 1:1
    };

    return {
      totalWinnings: winnings,
      results: [result],
      totalBet: bet.amount,
      netProfit: winnings - bet.amount
    };
  }

  /**
   * Genera statistiche probabilità per tipo di scommessa
   * @param {string} betType - Tipo scommessa (UNDER o OVER)
   * @returns {Object} { probability: number, expectedValue: number }
   */
  static getBetStatistics(betType) {
    // UNDER (2-6): 15 combinazioni su 36
    // OVER (8-12): 15 combinazioni su 36
    // 7: 6 combinazioni su 36 (perde sempre)
    const probability = 15/36; // 41.67% per entrambi UNDER e OVER
    const payout = 1; // Payout 1:1
    const expectedValue = probability * payout;

    return {
      probability,
      payout,
      expectedValue,
      houseEdge: 1 - expectedValue // ~0.583 (58.3% house edge per il 7)
    };
  }
}
