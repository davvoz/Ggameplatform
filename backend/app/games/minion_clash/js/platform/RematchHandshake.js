// RematchHandshake.js
//
// Session-scoped manager for rematch handshake events ('rematchRequested' and 'matchStart').
// Buffers events arriving between state transitions and replays them when observers attach.
//
// Public API:
//   - setObservers({ onOpponentReady, onMatchStart }): Attach callbacks; buffered events fire immediately.
//   - clearObservers(): Detach callbacks without unsubscribing from the client.
//   - reset(): Clear buffered state between matches.
//   - dispose(): Unsubscribe and cleanup.

export class RematchHandshake {
    constructor(client) {
        this._client = client;
        this._opponentReady = false;
        this._pendingMatchStart = null;
        this._onOpponentReady = null;
        this._onMatchStart = null;
        this._boundOpp = (msg) => this._handleOpponentReady(msg);
        this._boundStart = (msg) => this._handleMatchStart(msg);
        client.on('rematchRequested', this._boundOpp);
        client.on('matchStart', this._boundStart);
    }

    setObservers({ onOpponentReady, onMatchStart } = {}) {
        this._onOpponentReady = onOpponentReady || null;
        this._onMatchStart = onMatchStart || null;
        this._replayBuffered();
    }

    clearObservers() {
        this._onOpponentReady = null;
        this._onMatchStart = null;
    }

    reset() {
        this._opponentReady = false;
        this._pendingMatchStart = null;
    }

    dispose() {
        this._client.off('rematchRequested', this._boundOpp);
        this._client.off('matchStart', this._boundStart);
        this.clearObservers();
    }

    get opponentReady() {
        return this._opponentReady;
    }

    _replayBuffered() {
        if (this._opponentReady && this._onOpponentReady) {
            this._onOpponentReady();
        }
        if (this._pendingMatchStart && this._onMatchStart) {
            const msg = this._pendingMatchStart;
            this._pendingMatchStart = null;
            this._onMatchStart(msg);
        }
    }

    _handleOpponentReady() {
        this._opponentReady = true;
        if (this._onOpponentReady) this._onOpponentReady();
    }

    _handleMatchStart(message) {
        if (this._onMatchStart) {
            this._onMatchStart(message);
            return;
        }
        // No active observer (we're between states): buffer until one shows up.
        this._pendingMatchStart = message;
    }
}
