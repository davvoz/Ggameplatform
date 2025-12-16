/**
 * Game Controller
 * Facade Pattern: Orchestrates all game components
 */

import { GAME_CONSTANTS, NOTIFICATION_TONE } from '../constants.js';
import { MathUtils } from '../utils/MathUtils.js';
import { GameLogic } from './GameLogic.js';
import { DiceAnimationController } from '../animation/DiceAnimationController.js';
import { BetSystem } from '../betting/BetSystem.js';

export class GameController {
  constructor(uiManager, gameState, renderer, platformAdapter) {
    this._ui = uiManager;
    this._state = gameState;
    this._renderer = renderer;
    this._platform = platformAdapter;
    this._animationController = new DiceAnimationController(renderer);
  }

  /**
   * Acquista un nuovo round con budget specificato
   * @param {number} amount - Importo da usare come budget del round
   */
  async purchaseRound(amount) {
    if (this._state.paused || this._state.rolling) {
      return false;
    }

    // Valida importo minimo
    if (amount < 1) {
      this._ui.setNotice('Importo minimo: 1 coin.', NOTIFICATION_TONE.BAD);
      return false;
    }

    if (this._state.hasInsufficientFunds(amount)) {
      this._ui.setNotice(
        `Hai bisogno di ${amount} coins per acquistare questo round.`,
        NOTIFICATION_TONE.BAD
      );
      return false;
    }

    // Spend coins via platform API
    if (this._state._usePlatformCoins && this._platform.isAvailable()) {
      const spent = await this._platform.spendCoins(
        amount,
        `Seven round purchase: ${amount} coins`
      );
      
      if (!spent) {
        this._ui.setNotice('Errore nell\'acquisto del round.', NOTIFICATION_TONE.BAD);
        return false;
      }
    }

    // Update state
    const success = this._state.purchaseRound(amount);
    if (success) {
      this._state.updateBank(-amount);
      this._ui.setNotice(
        `Round attivato! Budget disponibile: ${amount} coins.`,
        NOTIFICATION_TONE.OK
      );
      this._ui.updateHUD(this._state.rounds, this._state.bank, this._state.score);
      this._ui.updateRoundBudget(this._state.roundBudget);
      await this._refreshPlatformBalance();
      return true;
    }

    return false;
  }

  /**
   * Piazza scommesse multiple per il prossimo tiro
   * @param {Array} bets - Array di scommesse { type, amount, value? }
   */
  placeBets(bets) {
    // Valida scommesse
    const validation = BetSystem.validateBets(bets);
    if (!validation.valid) {
      this._ui.setNotice(validation.error, NOTIFICATION_TONE.BAD);
      return false;
    }

    // Verifica fondi sufficienti
    const totalAmount = BetSystem.calculateTotalBetAmount(bets);
    if (this._state.hasInsufficientFunds(totalAmount)) {
      this._ui.setNotice('Coins insufficienti per queste scommesse.', NOTIFICATION_TONE.BAD);
      return false;
    }

    // Salva scommesse nello state
    this._state.setBets(bets);
    this._ui.setNotice(`${bets.length} scommesse piazzate per ${totalAmount} coins.`, NOTIFICATION_TONE.OK);
    return true;
  }

  async rollWithBet(betType, betAmount) {
    if (this._state.paused || this._state.rolling) {
      return;
    }

    // Crea la scommessa
    const bet = {
      type: betType,
      amount: betAmount
    };

    // Valida scommessa
    const validation = BetSystem.validateBet(bet);
    if (!validation.valid) {
      this._ui.setNotice(validation.error, NOTIFICATION_TONE.BAD);
      return;
    }

    // Verifica fondi sufficienti
    if (this._state.hasInsufficientFunds(betAmount)) {
      this._ui.setNotice('Coins insufficienti per questa scommessa.', NOTIFICATION_TONE.BAD);
      return;
    }

    // Spend coins via platform API
    if (this._state._usePlatformCoins && this._platform.isAvailable()) {
      const spent = await this._platform.spendCoins(
        betAmount,
        `Seven bet: ${betType} - ${betAmount} coins`
      );
      
      if (!spent) {
        console.warn('Failed to spend coins via API');
        this._ui.setNotice('Errore nella spesa coins.', NOTIFICATION_TONE.BAD);
        return;
      }
    }

    // Update local balance
    this._state.updateBank(-betAmount);
    this._state.setCurrentBet(bet);
    this._ui.updateHUD(this._state.rounds, this._state.bank, this._state.score);

    this._state.rolling = true;
    this._renderer.setRolling(true);
    this._ui.setControlsEnabled(false);

    // Generate target numbers
    const targetA = MathUtils.randomInt(1, 6);
    const targetB = MathUtils.randomInt(1, 6);

    // Animate the roll and READ the actual result when dice stop
    const result = await this._animationController.animateRoll(
      this._renderer.getDiceA(),
      this._renderer.getDiceB(),
      targetA,
      targetB
    );

    // Use the ACTUAL read values
    const diceA = result.diceA;
    const diceB = result.diceB;

    await this._processRollOutcome(diceA, diceB, bet);

    // Pulisci scommessa corrente
    this._state.clearCurrentBet();

    this._state.rolling = false;
    this._renderer.setRolling(false);
    this._ui.setControlsEnabled(true);
  }

  async _processRollOutcome(diceA, diceB, bet) {
    const sum = diceA + diceB;
    
    // Processa la scommessa singola usando processBets con array di 1 elemento
    const betResults = BetSystem.processBets([bet], diceA, diceB);
    const result = betResults.results[0];
    const { winnings, isWinning, multiplier } = result;

    // Award coins if won
    if (winnings > 0) {
      if (this._state._usePlatformCoins && this._platform.isAvailable()) {
        await this._platform.awardCoins(
          winnings,
          `Seven win: ${winnings} coins`
        );
      }
      this._state.updateBank(winnings);
    }

    // Update score and stats
    const netProfit = winnings - bet.amount;
    this._state.updateScore(netProfit);
    this._state.incrementRounds();
    this._state.updateRoundStats(bet.amount, winnings);

    // Update UI
    const betName = this._getBetDisplayName(bet.type);
    const resultMessage = isWinning 
      ? `${betName} vincente! ${multiplier}x = ${winnings} 🪙`
      : `${betName} perdente`;


    // Add to history
    this._state.addHistoryEntry({
      a: diceA,
      b: diceB,
      sum,
      betType: bet.type,
      betAmount: bet.amount,
      winnings,
      netProfit
    });

    const tone = netProfit >= 0 ? NOTIFICATION_TONE.OK : NOTIFICATION_TONE.BAD;
    const winLoseText = netProfit >= 0 ? 'Vinto' : 'Perso';
    
    this._ui.setNotice(
      `${winLoseText} ${MathUtils.formatSigned(netProfit)} coins · Balance: ${this._state.bank}`,
      tone
    );
    this._ui.updateHUD(this._state.rounds, this._state.bank, this._state.score);

    // Refresh balance from platform
    if (this._state._usePlatformCoins && this._platform.isAvailable()) {
      await this._refreshPlatformBalance();
    }

    // Chiudi la sessione e invia lo score finale
    console.log('[GameController] Ending session with final score:', netProfit);
    await this._platform.gameOver(netProfit, {
      bet_type: bet.type,
      bet_amount: bet.amount,
      winnings,
      net_profit: netProfit,
      dice_a: diceA,
      dice_b: diceB,
      sum: diceA + diceB
    });
  }

  _getBetDisplayName(type) {
    const names = {
      'low_range': 'Basso (2-6)',
      'seven': 'Seven',
      'high_range': 'Alto (8-12)',
      'even': 'Pari',
      'odd': 'Dispari',
      'double': 'Doppio',
      'sequence': 'Sequenza',
      'snake_eyes': 'Snake Eyes',
      'boxcars': 'Boxcars'
    };
    return names[type] || type;
  }

  async _refreshPlatformBalance() {
    const balance = await this._platform.getUserBalance();
    if (balance !== null) {
      this._state.setPlatformBalance(balance);
      this._ui.updateHUD(this._state.rounds, this._state.bank, this._state.score);
    }
  }

  async cashOut() {
    if (this._state.rolling) {
      return;
    }

    const budgetRemaining = this._state.roundBudget;
    
    if (budgetRemaining === 0) {
      this._ui.setNotice('Nessun budget da prelevare.', NOTIFICATION_TONE.NEUTRAL);
      return;
    }

    // Award remaining budget as coins via platform API
    if (this._state._usePlatformCoins && this._platform.isAvailable()) {
      await this._platform.awardCoins(
        budgetRemaining,
        `Seven cashout: ${budgetRemaining} coins`
      );
    }

    // Update bank and reset round budget
    this._state.updateBank(budgetRemaining);
    this._state._roundBudget = 0;
    
    this._ui.setNotice(
      `Cash out completato! ${budgetRemaining} coins aggiunti al tuo saldo.`,
      NOTIFICATION_TONE.OK
    );
    this._ui.updateHUD(this._state.rounds, this._state.bank, this._state.score);
    
    await this._refreshPlatformBalance();
  }

  async reset() {
    if (this._state.rolling) {
      return;
    }

    this._state.reset();
    this._ui.resetResult();
    this._ui.setNotice('Partita resettata.', NOTIFICATION_TONE.NEUTRAL);
    this._ui.updateHUD(this._state.rounds, this._state.bank, this._state.score);

    await this._platform.resetSession();

    this._renderer.resetDice();
  }



  pause() {
    this._state.paused = true;
    this._ui.setControlsEnabled(false);
  }

  resume() {
    this._state.paused = false;
    this._ui.setControlsEnabled(true);
  }

  cleanup() {
    this._renderer.cleanup();
  }

  getState() {
    return this._state;
  }
}
