/**
 * Dice Animation Controller
 * Single Responsibility: Dice roll animations
 */

import { DiceFaceReader } from '../utils/DiceFaceReader.js';

export class DiceAnimationController {
  constructor(renderer) {
    this._renderer = renderer;
  }

  async animateRoll(diceA, diceB, targetResultA, targetResultB) {
    // Throw the dice with physics
    this._renderer.throwDice();

    // Wait for dice to settle (physics-based)
    await this._waitForDiceToSettle();

    // Wait a moment for rendering to settle
    await this._sleep(100);

    // Read the actual faces that are on top
    const actualResultA = DiceFaceReader.readTopFace(diceA);
    const actualResultB = DiceFaceReader.readTopFace(diceB);

    return {
      diceA: actualResultA,
      diceB: actualResultB,
      sum: actualResultA + actualResultB
    };
  }

  async _waitForDiceToSettle() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this._renderer.areDiceAtRest()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
