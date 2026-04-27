/**
 * Singleton that pre-loads all level JSON configs asynchronously before the
 * game starts. Sections consume configs synchronously during construction.
 *
 * The list of active sections is read from `data/levels/board.json` at load
 * time — no hardcoded keys anywhere in JS code.
 *
 * Usage:
 *   await LevelConfigStore.load();              // once, in Game.init()
 *   const cfg  = LevelConfigStore.get('arkanoid_vault');
 *   const keys = LevelConfigStore.sectionKeys;  // ordered array from board.json
 */
export class LevelConfigStore {
    /** @type {Map<string, object>} */
    static #configs = new Map();

    /** Resolved URL to the data/levels/ folder, relative to this module. */
    static #BASE = new URL('../../data/levels', import.meta.url).href;

    /** @type {string[]} ordered section keys read from board.json */
    static #sectionKeys = [];

    /**
     * Fetch board.json to discover which sections to load, then fetch every
     * section JSON in parallel. Must be awaited before BoardManager is built.
     * @returns {Promise<void>}
     */
    static async load() {
        const boardUrl = `${LevelConfigStore.#BASE}/board.json`;
        const boardRes = await fetch(boardUrl);
        if (!boardRes.ok) {
            throw new Error(`LevelConfigStore: failed to load board.json (HTTP ${boardRes.status})`);
        }
        const board = await boardRes.json();
        LevelConfigStore.#sectionKeys = board.sections ?? [];

        await Promise.all(
            LevelConfigStore.#sectionKeys.map(async (key) => {
                const url = `${LevelConfigStore.#BASE}/${key}.json`;
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`LevelConfigStore: failed to load ${key}.json (HTTP ${res.status})`);
                }
                LevelConfigStore.#configs.set(key, await res.json());
            })
        );
    }

    /**
     * Return the ordered list of section keys as declared in board.json.
     * Available after load() resolves.
     * @returns {string[]}
     */
    static get sectionKeys() {
        return LevelConfigStore.#sectionKeys;
    }

    /**
     * Return a parsed config object by key.
     * @param {string} key  e.g. 'arkanoid_vault'
     * @returns {object}
     */
    static get(key) {
        const cfg = LevelConfigStore.#configs.get(key);
        if (!cfg) {
            throw new Error(`LevelConfigStore: '${key}' not loaded — await LevelConfigStore.load() first`);
        }
        return cfg;
    }

    /** Reset cache (useful in tests). */
    static clear() {
        LevelConfigStore.#configs.clear();
        LevelConfigStore.#sectionKeys = [];
    }
}
