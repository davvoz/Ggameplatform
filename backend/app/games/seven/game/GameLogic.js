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
      return `You won: ${sum} ${betName}.`;
    }

    if (outcomeKind === OUTCOME_KIND.SEVEN) {
      return "It's 7: always loses.";
    }

    const betName = bet === BET_TYPE.UNDER ? 'Under' : 'Over';
    return `You lost: ${sum} is not ${betName} 7.`;
  }

  static createBetHint(bet) {
    return bet === BET_TYPE.UNDER
      ? 'You chose Under: win if the sum is < 7.'
      : 'You chose Over: win if the sum is > 7.';
  }

  static createBetLabel(bet) {
    return bet === BET_TYPE.UNDER ? 'Under 7' : 'Over 7';
  }
}
