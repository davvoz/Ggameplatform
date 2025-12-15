/**
 * Game Logic
 * Single Responsibility: Business rules and game logic
 */

import { BET_TYPE, OUTCOME_KIND } from '../constants.js';

export class GameLogic {
  static computeOutcome(sum, bet) {
    if (sum === 7) {
      return { won: false, kind: OUTCOME_KIND.SEVEN };
    }

    if (bet === BET_TYPE.UNDER) {
      return {
        won: sum < 7,
        kind: sum < 7 ? OUTCOME_KIND.WIN : OUTCOME_KIND.LOSE
      };
    }

    return {
      won: sum > 7,
      kind: sum > 7 ? OUTCOME_KIND.WIN : OUTCOME_KIND.LOSE
    };
  }

  static calculateDelta(outcome, stake) {
    return outcome.won ? stake : -stake;
  }

  static createResultMessage(sum, bet, outcomeKind) {
    if (outcomeKind === OUTCOME_KIND.WIN) {
      const betName = bet === BET_TYPE.UNDER ? '(< 7)' : '(> 7)';
      return `Hai vinto: ${sum} ${betName}.`;
    }

    if (outcomeKind === OUTCOME_KIND.SEVEN) {
      return 'È uscito 7: perde sempre.';
    }

    const betName = bet === BET_TYPE.UNDER ? 'Sotto' : 'Sopra';
    return `Hai perso: ${sum} non è ${betName} 7.`;
  }

  static createBetHint(bet) {
    return bet === BET_TYPE.UNDER
      ? 'Hai scelto Sotto: vinci se la somma è < 7.'
      : 'Hai scelto Sopra: vinci se la somma è > 7.';
  }

  static createBetLabel(bet) {
    return bet === BET_TYPE.UNDER ? 'Sotto 7' : 'Sopra 7';
  }
}
