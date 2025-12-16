/**
 * Game Constants
 * All magic numbers and configuration values
 */

export const GAME_CONSTANTS = Object.freeze({
  INITIAL_BANK: 100,
  MIN_BANK: 0,
  MAX_BANK: 999999,
  MAX_HISTORY_SIZE: 8,
  
  // Round System
  ROUND_COST: 10,           // Costo per acquistare un round
  ROLLS_PER_ROUND: 20,      // Numero di tiri per round
  
  // Bet Limits (deprecated - use BET_MODES)
  MIN_BET_AMOUNT: 1,
  MAX_BET_AMOUNT: 50,
  MAX_BETS_PER_ROLL: 5,     // Massimo numero di scommesse per tiro
  
  DICE_SIZE: 1.25,
  DICE_RADIUS: 0.15,
  DICE_SEGMENTS: 16,
  DICE_POSITION_A: Object.freeze({ x: -1.6, y: 0, z: 0 }),
  DICE_POSITION_B: Object.freeze({ x: 1.6, y: 0, z: 0 }),
  DOT_RADIUS: 0.105,
  DOT_DEPTH: 0.07,
  ANIMATION_LERP_SPEED: 0.1,
  FLOATING_SPEED: 0.0005,
  FLOATING_AMPLITUDE: 0.15,
  ROLL_DURATION: 2000,
  INITIAL_SPIN_DURATION: 500
});

// Face rotations to show each number on TOP (y+) - camera looks from above!
// Physical dot placement:
// 1 dot  -> front (z+)  -> rotation (-90° on X) to bring z+ to y+ (top)
// 2 dots -> right (x+)  -> rotation (0°, 0°, -90°) to bring x+ to y+ (top)
// 3 dots -> top (y+)    -> rotation (0, 0, 0) already on top
// 4 dots -> bottom (y-) -> rotation (180° on X) to bring y- to y+ (flip)
// 5 dots -> left (x-)   -> rotation (0°, 0°, 90°) to bring x- to y+ (top)
// 6 dots -> back (z-)   -> rotation (90° on X) to bring z- to y+ (top)
export const FACE_ROTATIONS = Object.freeze({
  1: Object.freeze({ x: -Math.PI / 2, y: 0, z: 0 }),         // front (z+) to top
  2: Object.freeze({ x: 0, y: 0, z: -Math.PI / 2 }),         // right (x+) to top
  3: Object.freeze({ x: 0, y: 0, z: 0 }),                    // already on top (y+)
  4: Object.freeze({ x: Math.PI, y: 0, z: 0 }),              // bottom (y-) flipped to top
  5: Object.freeze({ x: 0, y: 0, z: Math.PI / 2 }),          // left (x-) to top
  6: Object.freeze({ x: Math.PI / 2, y: 0, z: 0 })           // back (z-) to top
});

// Tipi di scommessa (il gioco è semplice: sotto o sopra 7)
export const BET_TYPE = Object.freeze({
  UNDER: 'under',  // Sotto 7 (< 7)
  OVER: 'over'     // Sopra 7 (> 7)
  // Nota: se esce 7 si perde sempre
});

// Bet Modes - Different stake levels
export const BET_MODES = Object.freeze({
  CASUAL: {
    id: 'casual',
    name: 'Casual',
    icon: '🎲',
    minBet: 1,
    maxBet: 50,
    defaultBet: 5
  },
  STANDARD: {
    id: 'standard',
    name: 'Standard',
    icon: '🎰',
    minBet: 10,
    maxBet: 500,
    defaultBet: 50
  },
  HIGH_ROLLER: {
    id: 'high_roller',
    name: 'High Roller',
    icon: '💎',
    minBet: 100,
    maxBet: 5000,
    defaultBet: 500
  }
});

export const OUTCOME_KIND = Object.freeze({
  WIN: 'win',
  LOSE: 'lose',
  SEVEN: 'seven'
});

export const NOTIFICATION_TONE = Object.freeze({
  NEUTRAL: 'neutral',
  OK: 'ok',
  BAD: 'bad'
});
