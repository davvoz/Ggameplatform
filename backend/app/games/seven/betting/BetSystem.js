/**
 * Bet System
 * Single Responsibility: Gestione logica scommesse, validazione e calcolo vincite
 */

import { BET_TYPE, BET_PAYOUT, GAME_CONSTANTS } from '../constants.js';

export class BetSystem {
  /**
   * Valida una scommessa
   * @param {Object} bet - { type: BET_TYPE, amount: number, value?: number }
   * @returns {Object} { valid: boolean, error?: string }
   */
  static validateBet(bet) {
    if (!bet || typeof bet !== 'object') {
      return { valid: false, error: 'Scommessa non valida' };
    }

    const { type, amount, value } = bet;

    // Verifica tipo scommessa
    if (!Object.values(BET_TYPE).includes(type)) {
      return { valid: false, error: 'Tipo di scommessa non valido' };
    }

    // Verifica ammontare
    if (typeof amount !== 'number' || amount < GAME_CONSTANTS.MIN_BET_AMOUNT || amount > GAME_CONSTANTS.MAX_BET_AMOUNT) {
      return { 
        valid: false, 
        error: `Ammontare deve essere tra ${GAME_CONSTANTS.MIN_BET_AMOUNT} e ${GAME_CONSTANTS.MAX_BET_AMOUNT}` 
      };
    }

    // Per EXACT_TOTAL, richiede value (2-12)
    if (type === BET_TYPE.EXACT_TOTAL) {
      if (typeof value !== 'number' || value < 2 || value > 12) {
        return { valid: false, error: 'Per totale esatto, specificare valore 2-12' };
      }
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

    if (bets.length > GAME_CONSTANTS.MAX_BETS_PER_ROLL) {
      return { 
        valid: false, 
        error: `Massimo ${GAME_CONSTANTS.MAX_BETS_PER_ROLL} scommesse per tiro` 
      };
    }

    // Valida ogni singola scommessa
    for (const bet of bets) {
      const validation = this.validateBet(bet);
      if (!validation.valid) {
        return validation;
      }
    }

    // Verifica conflitti logici
    const hasEven = bets.some(b => b.type === BET_TYPE.EVEN);
    const hasOdd = bets.some(b => b.type === BET_TYPE.ODD);
    if (hasEven && hasOdd) {
      return { valid: false, error: 'Non puoi scommettere sia su pari che dispari' };
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
    const { type, value } = bet;

    switch (type) {
      case BET_TYPE.EXACT_TOTAL:
        return total === value;

      case BET_TYPE.LOW_RANGE:
        return total >= 2 && total <= 6;

      case BET_TYPE.SEVEN:
        return total === 7;

      case BET_TYPE.HIGH_RANGE:
        return total >= 8 && total <= 12;

      case BET_TYPE.EVEN:
        return total % 2 === 0;

      case BET_TYPE.ODD:
        return total % 2 === 1;

      case BET_TYPE.DOUBLE:
        return diceA === diceB;

      case BET_TYPE.SEQUENCE:
        return Math.abs(diceA - diceB) === 1;

      case BET_TYPE.SNAKE_EYES:
        return diceA === 1 && diceB === 1;

      case BET_TYPE.BOXCARS:
        return diceA === 6 && diceB === 6;

      default:
        return false;
    }
  }

  /**
   * Calcola vincita per una scommessa
   * @param {Object} bet - Scommessa
   * @param {number} diceA - Risultato primo dado
   * @param {number} diceB - Risultato secondo dado
   * @returns {number} - Vincita (0 se perde, amount * multiplier se vince)
   */
  static calculateWinnings(bet, diceA, diceB) {
    if (!this.isBetWinning(bet, diceA, diceB)) {
      return 0;
    }

    const multiplier = BET_PAYOUT[bet.type] || 1;
    return bet.amount * multiplier;
  }

  /**
   * Processa tutte le scommesse per un tiro
   * @param {Array} bets - Array di scommesse
   * @param {number} diceA - Risultato primo dado
   * @param {number} diceB - Risultato secondo dado
   * @returns {Object} { totalWinnings: number, results: Array }
   */
  static processBets(bets, diceA, diceB) {
    const results = bets.map(bet => {
      const isWinning = this.isBetWinning(bet, diceA, diceB);
      const winnings = this.calculateWinnings(bet, diceA, diceB);
      
      return {
        bet,
        isWinning,
        winnings,
        multiplier: BET_PAYOUT[bet.type]
      };
    });

    const totalWinnings = results.reduce((sum, result) => sum + result.winnings, 0);

    return {
      totalWinnings,
      results,
      totalBet: this.calculateTotalBetAmount(bets),
      netProfit: totalWinnings - this.calculateTotalBetAmount(bets)
    };
  }

  /**
   * Genera statistiche probabilità per tipo di scommessa
   * @param {string} betType - Tipo scommessa
   * @returns {Object} { probability: number, expectedValue: number }
   */
  static getBetStatistics(betType) {
    const probabilities = {
      [BET_TYPE.EXACT_TOTAL]: 1/36,  // varia per numero, questa è media
      [BET_TYPE.LOW_RANGE]: 15/36,
      [BET_TYPE.SEVEN]: 6/36,
      [BET_TYPE.HIGH_RANGE]: 15/36,
      [BET_TYPE.EVEN]: 18/36,
      [BET_TYPE.ODD]: 18/36,
      [BET_TYPE.DOUBLE]: 6/36,
      [BET_TYPE.SEQUENCE]: 10/36,
      [BET_TYPE.SNAKE_EYES]: 1/36,
      [BET_TYPE.BOXCARS]: 1/36
    };

    const probability = probabilities[betType] || 0;
    const payout = BET_PAYOUT[betType] || 0;
    const expectedValue = probability * payout;

    return {
      probability,
      payout,
      expectedValue,
      houseEdge: 1 - expectedValue
    };
  }
}
