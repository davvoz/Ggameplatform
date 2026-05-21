// RematchHandshake.js
//
// Session-scoped owner of the rematch handshake events ('rematchRequested'
// and 'matchStart'). Lives for the entire lifetime of a multiplayer session
// (from MultiplayerLobbyState._onMatchStart until the client disconnects).
//
// Why this exists:
//   These two events are SESSION-scoped, but their natural handler lives in
//   the post-battle ResultState — which is STATE-scoped. A client briefly
//   sits outside ResultState while the FSM is transitioning out of BattleState.
//   Any handshake message arriving in that window was silently dropped
//   because no listener was registered. This class closes that gap by
//   subscribing once at session start and BUFFERING events when no observer
//   is attached, then replaying them as soon as ResultState wires itself in.
//
// Contract:
//   - Constructor subscribes to the MultiplayerClient. Call dispose() exactly
//     once when the session ends to release the subscriptions.
//   - reset() clears any buffered state between matches (called by the new
//     BattleState as it boots).
//   - setObservers() lets the active UI state plug in callbacks; any
//     already-buffered events are delivered synchronously to the new
//     observers, so no event is ever lost.
//   - clearObservers() detaches the UI state without affecting the
//     underlying subscription.

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
