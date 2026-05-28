import { BasePowerUp } from './BasePowerUp.js';

/**
 * Doubles every coin payout for the next `baseDuration` spins.
 * Stacks multiplicatively with other multipliers (free-spins, hot-streak)
 * because PowerUpManager applies its product last.
 */
export class MegaMultiplierPowerUp extends BasePowerUp {
    static id = 'mega_mult';
    static label = 'x2';
    static icon = '⚡';
    static color = '#ff3366';
    static description = 'All wins ×2';
    static baseCostMultiplier = 6;
    static baseDuration = 3;

    static MULTIPLIER = 2;

    multiplyWin(coins) {
        return Math.floor(coins * MegaMultiplierPowerUp.MULTIPLIER);
    }
}
