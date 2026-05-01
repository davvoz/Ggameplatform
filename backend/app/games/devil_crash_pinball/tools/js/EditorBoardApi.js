/**
 * REST client used by the level editor. Same endpoints as the in-game shell,
 * isolated here so the editor doesn't depend on the runtime tree.
 *
 * Auth: the platform has no SessionMiddleware. We read the logged-in user_id
 * from {@link PlatformIdentity} (populated by PlatformBridge when the editor
 * runs inside the platform iframe) and forward it as `?user_id=` on every
 * call. NO localStorage reads — when the editor is opened directly (no
 * platform host), identity stays null and mutating calls will get 401.
 */
import { PlatformIdentity } from '../../js/platform/PlatformIdentity.js';

function _currentUserId() {
    return PlatformIdentity.getUserId();
}

function _requireUid() {
    const uid = _currentUserId();
    if (uid) return uid;
    const e = new Error('Authentication required (no logged-in user)');
    e.status = 401;
    throw e;
}

function _withUid(url, { required = false } = {}) {
    const uid = required ? _requireUid() : _currentUserId();
    if (!uid) return url;
    return `${url}${url.includes('?') ? '&' : '?'}user_id=${encodeURIComponent(uid)}`;
}

export class EditorBoardApi {
    constructor(base) {
        this.base = base ?? '/games/devil_crash_pinball/boards';
    }

    async listMine() {
        return this.#json(_withUid(`${this.base}/mine`, { required: true }));
    }

    async getBoard(id) {
        return this.#json(_withUid(`${this.base}/${encodeURIComponent(id)}`));
    }

    async createBoard(name, payload) {
        return this.#send('POST', _withUid(this.base, { required: true }), { name, payload });
    }

    async updateBoard(id, name, payload) {
        return this.#send(
            'PUT',
            _withUid(`${this.base}/${encodeURIComponent(id)}`, { required: true }),
            { name, payload },
        );
    }

    async deleteBoard(id) {
        const res = await fetch(_withUid(`${this.base}/${encodeURIComponent(id)}`, { required: true }), {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        if (!res.ok && res.status !== 204) throw await EditorBoardApi.#err(res);
    }

    async #json(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw await EditorBoardApi.#err(res);
        return res.json();
    }

    async #send(method, url, body) {
        const res = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw await EditorBoardApi.#err(res);
        return res.json();
    }

    static async #err(res) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = String(body.detail);
        } catch (parseErr) {
            console.debug('[EditorBoardApi] non-JSON error body', parseErr);
        }
        const err = new Error(detail);
        err.status = res.status;
        return err;
    }
}
