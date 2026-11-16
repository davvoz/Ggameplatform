import { Career } from '../sim/Career.js';

/**
 * The player's career, kept on the server (backend apex_drive_be). The
 * screens ask this for every change: the rule answers here at once (the
 * garage stays instant: sound, toast, new stats), the server is asked in
 * the background, in order, and when the last pending answer is in, the
 * server's career replaces this one: it is the authority. A refusal (a rule
 * the server applies, a race it finds impossible) reloads the server's.
 *
 * Without a server (the game alone, the automated checks) the career lives
 * for the visit: `online` is false and nothing is saved.
 *
 * @typedef {import('../platform/ApexServer.js').ApexServer} ApexServer
 */
export class CareerSync {
    career;
    online = false;
    #server;
    #queue = Promise.resolve();
    #pending = 0;
    #stale = false;

    /** @param {ApexServer} server @param {Career} [career] */
    constructor(server, career = new Career()) {
        this.#server = server;
        this.career = career;
    }

    /** The server's career, or a new one for the visit when there is no server. */
    async load() {
        const answer = await this.#server.loadCareer();
        this.online = answer.ok;
        if (answer.ok) this.career.replaceWith(answer.data.career);
        return this.online;
    }

    /** Waits for every change sent so far (tests, and before leaving). */
    settled() {
        return this.#queue;
    }

    // ---- the garage: answered by the rules here, then by the server

    /** @returns {import('../sim/Career.js').ShopAnswer} */
    buyPart(category) {
        return this.#local(this.career.buyPart(category), () => this.#server.buyPart(category));
    }

    /** Buys a mod and fits it when it fits. */
    buyMod(id) {
        const answer = this.career.buyMod(id);
        if (answer !== 'ok') return answer;
        this.#send(() => this.#server.buyMod(id));
        if (this.career.fit(id) === 'ok') this.#sendFitted();
        return answer;
    }

    fit(id) {
        return this.#local(this.career.fit(id), () => this.#server.setFitted([...this.career.fitted]));
    }

    unfit(id) {
        this.career.unfit(id);
        this.#sendFitted();
    }

    #sendFitted() {
        const mods = [...this.career.fitted];
        this.#send(() => this.#server.setFitted(mods));
    }

    #local(answer, call) {
        if (answer === 'ok') this.#send(call);
        return answer;
    }

    // ---- races

    /**
     * A career race starts: its seed now (the server gives the same), its id
     * from the server when it answers.
     * @returns {{seed: number, id: Promise<string|null>}}
     */
    startRace(trackId) {
        const seed = this.career.races + 1;
        if (!this.online) return { seed, id: Promise.resolve(null) };
        return { seed, id: this.#server.startRace(trackId).then((answer) => (answer.ok ? answer.data.raceId : null)) };
    }

    /**
     * Pays a race here (the results show it at once) and on the server, which
     * checks it and has the last word.
     * @param {{seed: number, id: Promise<string|null>}} race what startRace gave
     */
    finishRace(race, trackId, result, prizeScale) {
        const payout = this.career.finishRace(trackId, result, prizeScale);
        const { position, bestLap, cash } = result;
        this.#send(async () => {
            const id = await race.id;
            return id ? this.#server.finishRace(id, { position, bestLap, cash }) : { ok: false, code: 'no_race' };
        });
        return payout;
    }

    /** @returns {Promise<{name: string, steem: string|null, ranked: boolean}|null>} who is playing, null offline */
    async profile() {
        const answer = await this.#server.profile();
        return answer.ok ? answer.data : null;
    }

    // ---- the weekly challenge (only with a server)

    /** @returns {Promise<object|null>} this week's track and the player's best */
    async challenge() {
        const answer = await this.#server.challenge();
        return answer.ok ? answer.data : null;
    }

    /** @returns {Promise<object|null>} this week's standings with the player's place, null offline */
    async leaderboard() {
        const answer = await this.#server.leaderboard();
        return answer.ok ? answer.data : null;
    }

    /** @returns {Promise<{raceId: string, seed: number, trackId: string, weekId: string, laps: number}|null>} */
    async startRun() {
        const answer = await this.#server.startRun();
        return answer.ok ? answer.data : null;
    }

    /** @returns {Promise<{ok: true, data: {score: number, time: number, best: object}}|{ok: false, code: string}>} */
    finishRun(raceId, run) {
        return this.#server.finishRun(raceId, run);
    }

    // ---- the queue

    /** Sends a change after the ones before it; the last answer brings the server's career. */
    #send(call) {
        if (!this.online) return;
        this.#pending++;
        this.#queue = this.#queue.then(() => this.#deliver(call)).catch((error) => console.error('[Apex Drive] sync', error));
    }

    async #deliver(call) {
        let answer;
        try {
            answer = await call();
        } catch {
            answer = { ok: false, code: 'offline' };
        } finally {
            this.#pending--;
        }
        if (!answer.ok) this.#stale = true;
        if (this.#pending > 0) return;
        if (this.#stale) await this.#reload();
        else if (answer.data?.career) this.career.replaceWith(answer.data.career);
    }

    async #reload() {
        this.#stale = false;
        const answer = await this.#server.loadCareer();
        if (answer.ok) this.career.replaceWith(answer.data.career);
    }
}
