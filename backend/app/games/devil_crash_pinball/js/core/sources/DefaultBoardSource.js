import { BoardSource } from './BoardSource.js';

/**
 * Loads the canonical campaign board from `data/levels/board.json` and the
 * referenced section JSON files.
 *
 * Equivalent to the previous behaviour of LevelConfigStore.load() with no
 * arguments — extracted here to live behind the BoardSource interface.
 */
export class DefaultBoardSource extends BoardSource {
    /**
     * @param {string} [baseUrl] absolute or relative URL of the levels folder
     */
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl ?? new URL('../../../data/levels', import.meta.url).href;
    }

    async loadConfigs() {
        const board = await this.#fetchJson(`${this.baseUrl}/board.json`);
        const sectionKeys = Array.isArray(board.sections) ? board.sections : [];
        if (sectionKeys.length === 0) {
            throw new Error('DefaultBoardSource: board.json declares no sections');
        }

        const entries = await Promise.all(
            sectionKeys.map(async (key) => {
                const cfg = await this.#fetchJson(`${this.baseUrl}/${encodeURIComponent(key)}.json`);
                return [key, cfg];
            })
        );

        return {
            sectionKeys,
            configs: Object.fromEntries(entries),
            meta: { source: 'default' },
        };
    }

    async #fetchJson(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`DefaultBoardSource: HTTP ${res.status} for ${url}`);
        return res.json();
    }
}
