import { BoardSource } from './BoardSource.js';

/**
 * Receives the board configuration from the parent window via `postMessage`.
 *
 * Used by the level editor's "Test" button: the editor opens this game inside
 * an iframe with `?source=postmessage`, then immediately posts the in-memory
 * board so the user can play their unsaved work-in-progress.
 *
 * Protocol (parent → iframe):
 *   { type: 'devilCrashTestBoard', payload: { board, sections } }
 *
 * Protocol (iframe → parent):
 *   { type: 'devilCrashReady' }   // sent on construction
 */
export class PostMessageBoardSource extends BoardSource {
    /**
     * @param {object} [opts]
     * @param {number} [opts.timeoutMs]   how long to wait for a payload
     * @param {string} [opts.expectedOrigin] if known up-front
     */
    constructor({ timeoutMs = 10000, expectedOrigin = null } = {}) {
        super();
        this.timeoutMs = timeoutMs;
        this.expectedOrigin = expectedOrigin;
        this._handler = null;
    }

    async loadConfigs() {
        const { board, sections, origin } = await this.#awaitPayload();
        // Lock origin for any future messages
        if (!this.expectedOrigin) this.expectedOrigin = origin;

        const sectionKeys = Array.isArray(board?.sections) ? board.sections : [];
        if (sectionKeys.length === 0) {
            throw new Error('PostMessageBoardSource: payload has no sections');
        }
        for (const key of sectionKeys) {
            if (!sections?.[key]) throw new Error(`PostMessageBoardSource: missing section '${key}'`);
        }

        return {
            sectionKeys,
            configs: sections,
            meta: { source: 'editor-test' },
        };
    }

    destroy() {
        if (this._handler) {
            window.removeEventListener('message', this._handler);
            this._handler = null;
        }
    }

    /** @returns {Promise<{ board: object, sections: object, origin: string }>} */
    #awaitPayload() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.destroy();
                reject(new Error('PostMessageBoardSource: timeout waiting for board payload'));
            }, this.timeoutMs);

            this._handler = (event) => {
                const data = event.data;
                if (data?.type !== 'devilCrashTestBoard') return;
                if (this.expectedOrigin && event.origin !== this.expectedOrigin) return;
                const payload = data.payload;
                if (!payload?.board || !payload?.sections) return;
                clearTimeout(timer);
                this.destroy();
                resolve({
                    board: payload.board,
                    sections: payload.sections,
                    origin: event.origin,
                });
            };

            window.addEventListener('message', this._handler);

            // Tell the parent we are ready to receive the payload.
            // We don't know the editor's origin yet, so '*' is necessary here;
            // the inbound payload's origin will be locked in `expectedOrigin`.
            try {
                const parentWin = globalThis.parent;
                // Note: `globalThis.parent === globalThis` for top-level windows.
                // Linter flags this as always-true (TS thinks `parent` is `Window`),
                // but at runtime it can equal `globalThis`. Use Object.is to be safe.
                const inIframe = parentWin && !Object.is(parentWin, globalThis);
                if (inIframe) {
                    parentWin.postMessage({ type: 'devilCrashReady' }, '*');  // NOSONAR: handshake before origin is known
                }
            } catch (err) {
                console.debug('[PostMessageBoardSource] no accessible parent', err);
            }
        });
    }
}
