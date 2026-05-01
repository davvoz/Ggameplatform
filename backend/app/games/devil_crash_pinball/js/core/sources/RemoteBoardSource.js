import { BoardSource } from './BoardSource.js';

/**
 * Loads a community-authored board by id from the backend.
 *
 * Endpoint: GET /games/devil_crash_pinball/boards/{id}
 * Response shape:
 *   {
 *     board_id, name, owner_username, like_count, ...,
 *     payload: {
 *       board:    { sections: string[] },
 *       sections: { [key]: object }
 *     }
 *   }
 *
 * Also fires a fire-and-forget `POST .../play` ping so the server can keep
 * a play counter without coupling the game to any reward logic.
 */
export class RemoteBoardSource extends BoardSource {
    /**
     * @param {number|string} boardId
     * @param {string} [apiBase]
     */
    constructor(boardId, apiBase) {
        super();
        this.boardId = String(boardId);
        this.apiBase = apiBase ?? '/games/devil_crash_pinball/boards';
    }

    async loadConfigs() {
        const res = await fetch(`${this.apiBase}/${encodeURIComponent(this.boardId)}`, {
            credentials: 'same-origin',
        });
        if (!res.ok) throw new Error(`RemoteBoardSource: HTTP ${res.status} for board ${this.boardId}`);
        const detail = await res.json();
        const payload = detail?.payload ?? {};
        const sectionKeys = Array.isArray(payload?.board?.sections) ? payload.board.sections : [];
        const configs = (payload?.sections && typeof payload.sections === 'object') ? payload.sections : {};

        if (sectionKeys.length === 0) {
            throw new Error('RemoteBoardSource: board has no sections');
        }
        for (const key of sectionKeys) {
            if (!configs[key]) throw new Error(`RemoteBoardSource: missing section payload for '${key}'`);
        }

        // fire-and-forget play ping
        fetch(`${this.apiBase}/${encodeURIComponent(this.boardId)}/play`, {
            method: 'POST',
            credentials: 'same-origin',
        }).catch(() => { /* best-effort */ });

        return {
            sectionKeys,
            configs,
            meta: {
                source: 'community',
                boardId: detail?.board_id,
                name: detail?.name ?? '',
                ownerUsername: detail?.owner_username ?? '',
            },
        };
    }
}
