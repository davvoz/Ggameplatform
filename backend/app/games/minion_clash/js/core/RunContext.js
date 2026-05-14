/**
 * RunContext: holds player choices across states. Reset between matches.
 */
export class RunContext {
    constructor() {
        this.reset();
    }
    reset() {
        this.mode = null;       // 'campaign' | 'multiplayer'
        this.heroId = null;
        this.deckIds = [];      // ordered card ids (10)
        this.levelId = null;
        this.outcome = null;    // 'win' | 'lose' | 'timeout'
        this.matchStats = null; // { score, durationSec, unitsKilled, ... }
        // Multiplayer-only:
        this.mpRoom = null;     // roomCode, opponentName, opponentHeroId, opponentDeckIds, seed
        this.mpClient = null;   // live MultiplayerClient instance (transport)
    }
}
