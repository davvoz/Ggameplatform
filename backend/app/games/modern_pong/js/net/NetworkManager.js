/**
 * WebSocket network manager for multiplayer.
 * Handles connection, room management, and message relay.
 */
export class NetworkManager {
    #ws = null;
    #listeners = new Map();
    #connected = false;
    #playerId = null;
    #roomCode = null;
    #isHost = false;
    #rtt = 0;
    #pingInterval = null;

    get connected() { return this.#connected; }
    get playerId() { return this.#playerId; }
    get roomCode() { return this.#roomCode; }
    get isHost() { return this.#isHost; }
    get rtt() { return this.#rtt; }

    on(type, callback) {
        if (!this.#listeners.has(type)) {
            this.#listeners.set(type, []);
        }
        this.#listeners.get(type).push(callback);
    }

    off(type) {
        this.#listeners.delete(type);
    }

    connect() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            this.#ws = new WebSocket(`${protocol}//${host}/ws/modern-pong`);

            this.#ws.onopen = () => {
                this.#connected = true;
                this.#startPing();
                resolve();
            };

            this.#ws.onerror = (err) => {
                reject(err);
            };

            this.#ws.onclose = () => {
                this.#connected = false;
                this.#emit('disconnected');
            };

            this.#ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.#handleMessage(data);
                } catch (e) {
                    // Ignore malformed messages
                }
            };
        });
    }

    disconnect() {
        if (this.#ws) {
            this.send({ type: 'leave' });
            this.#ws.close();
            this.#ws = null;
            this.#connected = false;
            this.#playerId = null;
            this.#roomCode = null;
            this.#isHost = false;
            this.#rtt = 0;
            this.#listeners.clear();
            if (this.#pingInterval) {
                clearInterval(this.#pingInterval);
                this.#pingInterval = null;
            }
        }
    }

    send(data) {
        if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
            this.#ws.send(JSON.stringify(data));
        }
    }

    createRoom(username, betAmount, roundsToWin, stageId) {
        this.send({
            type: 'createRoom',
            username,
            betAmount,
            roundsToWin,
            stageId,
        });
    }

    joinRoom(roomCode, username) {
        this.send({
            type: 'joinRoom',
            roomCode,
            username,
        });
    }

    sendInput(input) {
        this.send({
            type: 'input',
            ...input,
        });
    }

    sendGameState(state) {
        this.send({
            type: 'gameState',
            state,
        });
    }

    sendGoal(scorerId) {
        this.send({
            type: 'goal',
            scorerId,
        });
    }

    sendPowerUpCollected(powerUpId, collectorId) {
        this.send({
            type: 'powerUpCollected',
            powerUpId,
            collectorId,
        });
    }

    sendSuperShot(charId, isTopPlayer) {
        this.send({
            type: 'superShot',
            charId,
            isTopPlayer,
        });
    }

    sendRematch() {
        this.send({ type: 'rematch' });
    }

    #handleMessage(data) {
        const type = data.type;

        switch (type) {
            case 'roomCreated':
                this.#playerId = data.playerId;
                this.#roomCode = data.roomCode;
                this.#isHost = true;
                break;
            case 'joinedRoom':
                this.#playerId = data.playerId;
                this.#roomCode = data.roomCode;
                this.#isHost = false;
                break;
            case 'pong':
                this.#rtt = performance.now() - (data.t ?? 0);
                return; // don't emit pong to listeners
            default:
                break;
        }

        this.#emit(type, data);
    }

    #startPing() {
        if (this.#pingInterval) clearInterval(this.#pingInterval);
        this.#pingInterval = setInterval(() => {
            if (this.#connected) {
                this.send({ type: 'ping', t: performance.now() });
            }
        }, 2000);
    }

    #emit(type, data = null) {
        const cbs = this.#listeners.get(type);
        if (cbs) {
            for (const cb of cbs) {
                cb(data);
            }
        }
    }
}
