/**
 * Thin WebSocket wrapper for Minion Clash 1v1 multiplayer.
 *
 * Pure transport layer: it knows nothing about the battle simulation,
 * coordinates or game rules. It exposes a typed event API and a small
 * set of outbound message helpers that mirror the server protocol
 * defined in `minion_clash_be/router.py`.
 *
 * Wire protocol (server-authoritative simulation, A2.1):
 *   Out: createRoom | joinRoom | playCard | rematch | leave | ping
 *   In : roomCreated | matchStart | state | event | outcome
 *      | playRejected | rematchRequested | opponentDisconnected
 *      | error | pong
 */
export class MultiplayerClient {
    _ws = null;
    _url = null;
    _connected = false;

    constructor() {
        this._listeners = new Map();   // type -> Set<callback>
    }

    // ── Lifecycle ───────────────────────────────────────────────

    connect(url) {
        this._url = url;
        return new Promise((resolve, reject) => {
            let ws;
            try {
                ws = new WebSocket(url);
            } catch (err) {
                reject(err instanceof Error ? err : new Error(String(err)));
                return;
            }
            this._ws = ws;
            ws.onopen = () => { this._connected = true; resolve(); };
            ws.onerror = (evt) => {
                if (!this._connected) reject(new Error('WebSocket transport error'));
                this._emit('error', { type: 'error', message: 'transport error', evt });
            };
            ws.onclose = () => { this._connected = false; this._emit('close', { type: 'close' }); };
            ws.onmessage = (msg) => {
                let data;
                try { data = JSON.parse(msg.data); } catch { return; }
                if (data && typeof data.type === 'string') this._emit(data.type, data);
            };
        });
    }

    disconnect() {
        try { this._ws?.close(); }
        catch (err) { console.debug('[mp-client] close ignored', err); }
        this._ws = null;
        this._connected = false;
        this._listeners.clear();
    }

    isConnected() {
        return this._connected && this._ws?.readyState === WebSocket.OPEN;
    }

    // ── Pub/Sub ─────────────────────────────────────────────────

    on(type, cb) {
        if (!this._listeners.has(type)) this._listeners.set(type, new Set());
        this._listeners.get(type).add(cb);
    }

    off(type, cb) {
        this._listeners.get(type)?.delete(cb);
    }

    _emit(type, data) {
        const set = this._listeners.get(type);
        if (!set) return;
        for (const cb of set) {
            try { cb(data); }
            catch (err) { console.warn('[mp-client] listener threw', err); }
        }
    }

    // ── Outbound helpers ────────────────────────────────────────

    _send(payload) {
        if (!this.isConnected()) return false;
        try { this._ws.send(JSON.stringify(payload)); return true; }
        catch (err) { console.warn('[mp-client] send failed', err); return false; }
    }

    createRoom(username, heroId, deckIds) {
        return this._send({ type: 'createRoom', username, heroId, deckIds });
    }

    joinRoom(roomCode, username, heroId, deckIds) {
        return this._send({ type: 'joinRoom', roomCode, username, heroId, deckIds });
    }

    sendCardPlay(slot, cardId, x, y) {
        return this._send({
            type: 'playCard', slot, cardId, x, y, t: performance.now(),
        });
    }

    sendRematch() { return this._send({ type: 'rematch' }); }
    sendLeave()   { return this._send({ type: 'leave' }); }
    sendPing()    { return this._send({ type: 'ping', t: performance.now() }); }
}
