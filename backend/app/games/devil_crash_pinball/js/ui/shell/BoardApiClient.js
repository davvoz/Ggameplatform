/**
 * Thin REST client for `/games/devil_crash_pinball/boards`.
 *
 * Pure data-layer: no DOM, no game state. The platform has no SessionMiddleware,
 * so we read the logged-in user_id from localStorage and forward it as a
 * `user_id` query param on every request that needs identity.
 */
import { getCurrentUserId } from './currentUser.js';

export class BoardApiClient {
    /** @param {string} [base] */
    constructor(base) {
        this.base = base ?? '/games/devil_crash_pinball/boards';
    }

    async listCommunity({ sort = 'likes', page = 1, pageSize = 20 } = {}) {
        const qs = new URLSearchParams({ sort, page: String(page), page_size: String(pageSize) });
        BoardApiClient.#appendUserId(qs);
        return this.#getJson(`${this.base}/community?${qs}`);
    }

    async listMine() {
        const qs = new URLSearchParams();
        BoardApiClient.#appendUserId(qs, { required: true });
        return this.#getJson(`${this.base}/mine?${qs}`);
    }

    async getBoard(boardId) {
        const qs = new URLSearchParams();
        BoardApiClient.#appendUserId(qs);
        const tail = qs.toString() ? `?${qs}` : '';
        return this.#getJson(`${this.base}/${encodeURIComponent(boardId)}${tail}`);
    }

    async createBoard({ name, payload }) {
        return this.#sendJson('POST', this.base, { name, payload }, { auth: true });
    }

    async updateBoard(boardId, { name, payload }) {
        const body = {};
        if (name !== undefined) body.name = name;
        if (payload !== undefined) body.payload = payload;
        return this.#sendJson('PUT', `${this.base}/${encodeURIComponent(boardId)}`, body, { auth: true });
    }

    async deleteBoard(boardId) {
        const qs = new URLSearchParams();
        BoardApiClient.#appendUserId(qs, { required: true });
        const res = await fetch(`${this.base}/${encodeURIComponent(boardId)}?${qs}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        if (!res.ok && res.status !== 204) throw await BoardApiClient.#asError(res);
    }

    async toggleLike(boardId) {
        return this.#sendJson('POST', `${this.base}/${encodeURIComponent(boardId)}/like`, {}, { auth: true });
    }

    // ── private ──────────────────────────────────────────────────────────────

    static #appendUserId(params, { required = false } = {}) {
        const uid = getCurrentUserId();
        if (uid) {
            params.set('user_id', uid);
        } else if (required) {
            const err = new Error('Authentication required');
            err.status = 401;
            throw err;
        }
    }

    async #getJson(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw await BoardApiClient.#asError(res);
        return res.json();
    }

    async #sendJson(method, url, body, { auth = false } = {}) {
        let finalUrl = url;
        if (auth) {
            const qs = new URLSearchParams();
            BoardApiClient.#appendUserId(qs, { required: true });
            finalUrl = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
        }
        const res = await fetch(finalUrl, {
            method,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw await BoardApiClient.#asError(res);
        if (res.status === 204) return null;
        return res.json();
    }

    static async #asError(res) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = String(body.detail);
        } catch (e) { console.debug('[BoardApiClient] non-JSON error body', e); }
        const err = new Error(detail);
        err.status = res.status;
        return err;
    }
}
