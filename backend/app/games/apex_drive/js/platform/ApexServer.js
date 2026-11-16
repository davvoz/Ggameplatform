/**
 * The game's own endpoints (backend apex_drive_be): the career, the shop,
 * races and the weekly challenge. Every call answers, never throws:
 * `{ok: true, data}`, or `{ok: false, code}` with the server's reason (a
 * rule's code) or 'offline' when there is no server to ask.
 *
 * @typedef {{ok: true, data: any} | {ok: false, code: string}} Answer
 */
const API = '/api/apex_drive';

export class ApexServer {
    #fetch;

    /** @param {typeof fetch} [fetchImpl] */
    constructor(fetchImpl = globalThis.fetch?.bind(globalThis)) {
        this.#fetch = fetchImpl;
    }

    /** @returns {Promise<Answer>} */
    async #call(path, method = 'GET', body = undefined) {
        if (!this.#fetch) return { ok: false, code: 'offline' };
        try {
            const response = await this.#fetch(`${API}${path}`, {
                method,
                credentials: 'same-origin',
                headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const data = await response.json().catch(() => null);
            if (response.ok) return { ok: true, data };
            // a rule's refusal names itself; a missing server or session does not
            return { ok: false, code: response.status === 400 && typeof data?.detail === 'string' ? data.detail : 'offline' };
        } catch {
            return { ok: false, code: 'offline' };
        }
    }

    loadCareer() {
        return this.#call('/me');
    }

    buyPart(category) {
        return this.#call(`/me/parts/${encodeURIComponent(category)}`, 'POST');
    }

    buyMod(id) {
        return this.#call(`/me/mods/${encodeURIComponent(id)}`, 'POST');
    }

    /** @param {string[]} mods */
    setFitted(mods) {
        return this.#call('/me/fitted', 'PUT', { mods });
    }

    startRace(trackId) {
        return this.#call('/me/races', 'POST', { trackId });
    }

    /** @param {string} raceId @param {{position: number, bestLap: number|null, cash: number}} result */
    finishRace(raceId, result) {
        return this.#call(`/me/races/${encodeURIComponent(raceId)}/finish`, 'POST', result);
    }

    /** The signed-in player: {name, steem, ranked}. */
    profile() {
        return this.#call('/me/profile');
    }

    challenge() {
        return this.#call('/challenge');
    }

    /** This week's standings: {weekId, trackId, players, entries: [{rank, name, steem, score, time, me}], me}. */
    leaderboard() {
        return this.#call('/challenge/leaderboard');
    }

    startRun() {
        return this.#call('/challenge/races', 'POST');
    }

    /** @param {string} raceId @param {{time: number, bestLap: number|null}} run */
    finishRun(raceId, run) {
        return this.#call(`/challenge/races/${encodeURIComponent(raceId)}/finish`, 'POST', run);
    }
}
