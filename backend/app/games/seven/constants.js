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
  
  // Bet Limits
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

// Tipi di scommessa disponibili
export const BET_TYPE = Object.freeze({
  // Scommessa su totale esatto (2-12)
  EXACT_TOTAL: 'exact_total',
  
  // Scommessa su range
  LOW_RANGE: 'low_range',      // 2-6
  SEVEN: 'seven',              // esattamente 7 (lucky seven)
  HIGH_RANGE: 'high_range',    // 8-12
  
  // Scommessa pari/dispari
  EVEN: 'even',
  ODD: 'odd',
  
  // Scommesse speciali
  DOUBLE: 'double',            // entrambi dadi stesso numero
  SEQUENCE: 'sequence',        // numeri consecutivi (es. 3-4)
  SNAKE_EYES: 'snake_eyes',    // doppio 1 (1-1)
  BOXCARS: 'boxcars'           // doppio 6 (6-6)
});

// Payout multipliers per tipo di scommessa
export const BET_PAYOUT = Object.freeze({
  [BET_TYPE.EXACT_TOTAL]: 10,      // Molto difficile - payout alto
  [BET_TYPE.LOW_RANGE]: 2,         // 5/12 probabilità
  [BET_TYPE.SEVEN]: 4,             // 6/36 probabilità - lucky!
  [BET_TYPE.HIGH_RANGE]: 2,        // 5/12 probabilità
  [BET_TYPE.EVEN]: 1.9,            // ~50% probabilità
  [BET_TYPE.ODD]: 1.9,             // ~50% probabilità
  [BET_TYPE.DOUBLE]: 5,            // 6/36 probabilità
  [BET_TYPE.SEQUENCE]: 3,          // 10/36 probabilità
  [BET_TYPE.SNAKE_EYES]: 30,       // 1/36 probabilità - jackpot!
  [BET_TYPE.BOXCARS]: 30           // 1/36 probabilità - jackpot!
});

// Descrizioni scommesse per UI
export const BET_DESCRIPTION = Object.freeze({
  [BET_TYPE.EXACT_TOTAL]: 'Totale esatto (2-12)',
  [BET_TYPE.LOW_RANGE]: 'Totale basso (2-6)',
  [BET_TYPE.SEVEN]: 'Lucky Seven! (7)',
  [BET_TYPE.HIGH_RANGE]: 'Totale alto (8-12)',
  [BET_TYPE.EVEN]: 'Totale pari',
  [BET_TYPE.ODD]: 'Totale dispari',
  [BET_TYPE.DOUBLE]: 'Doppio (stessa faccia)',
  [BET_TYPE.SEQUENCE]: 'Sequenza (numeri consecutivi)',
  [BET_TYPE.SNAKE_EYES]: 'Snake Eyes (1-1)',
  [BET_TYPE.BOXCARS]: 'Boxcars (6-6)'
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
