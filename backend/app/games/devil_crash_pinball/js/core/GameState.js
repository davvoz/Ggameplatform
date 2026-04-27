/**
 * Top-level game state machine. Pure state holder; transitions live in Game.
 */
export const GameState = Object.freeze({
    ATTRACT:    0,
    BALL_READY: 1,
    PLAY:       2,
    GAME_OVER:  3,
    PAUSED:     4,
    BALL_DRAIN: 5,   // animated drain sequence (implode → hold → spawn)
});
