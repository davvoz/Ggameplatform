import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Per-game session state. Pure data holder \u2014 logic lives in the controllers
 * that own this object (Game, BallLifecycle, TiltController, \u2026).
 */
export class GameSession {
    constructor() {
        this.ballsLeft       = C.BALLS_PER_GAME;
        this.ballSaveTimer   = 0;
        this.tiltCount       = 0;
        this.tilted          = false;
        this.bossesDefeated  = 0;
        this.timePlayed      = 0;
        this.startTime       = 0;
        this.hintTimer       = 0;
        /** Seconds remaining before menu input is accepted again. */
        this.menuGuard       = 0;
    }

    reset() {
        this.ballsLeft      = C.BALLS_PER_GAME;
        this.ballSaveTimer  = 0;
        this.tiltCount      = 0;
        this.tilted         = false;
        this.bossesDefeated = 0;
        this.timePlayed     = 0;
        this.hintTimer      = 0;
        this.menuGuard      = 0;
    }
}
