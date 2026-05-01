import { DefaultBoardSource } from './sources/DefaultBoardSource.js';

/**
 * Singleton that holds parsed level configs for the active board.
 *
 * The data is supplied by a {@link BoardSource} strategy passed to `load()`.
 * If no source is provided, the canonical {@link DefaultBoardSource} is used
 * so older callers keep working.
 *
 * Sections consume configs synchronously during construction, so callers
 * MUST `await LevelConfigStore.load(source)` before building BoardManager.
 *
 * Usage:
 *   await LevelConfigStore.load(new RemoteBoardSource(42));
 *   const cfg  = LevelConfigStore.get('arkanoid_vault');
 *   const keys = LevelConfigStore.sectionKeys;
 */
export class LevelConfigStore {
    /** @type {Map<string, object>} */
    static #configs = new Map();
    /** @type {string[]} */
    static #sectionKeys = [];
    /** @type {object|null} */
    static #meta = null;

    /**
     * Load section configs through the given source. If no source is passed,
     * the canonical default board (data/levels/board.json) is used.
     *
     * @param {import('./sources/BoardSource.js').BoardSource} [source]
     * @returns {Promise<void>}
     */
    static async load(source) {
        const src = source ?? new DefaultBoardSource();
        const { sectionKeys, configs, meta } = await src.loadConfigs();

        LevelConfigStore.clear();
        LevelConfigStore.#sectionKeys = [...sectionKeys];
        for (const key of sectionKeys) {
            LevelConfigStore.#configs.set(key, configs[key]);
        }
        LevelConfigStore.#meta = meta ?? null;
    }

    /** Ordered section keys (top → bottom of the world). */
    static get sectionKeys() {
        return LevelConfigStore.#sectionKeys;
    }

    /** Optional metadata about the loaded board (source, name, owner...). */
    static get meta() {
        return LevelConfigStore.#meta;
    }

    /** Return a parsed config object by key. Throws if not loaded. */
    static get(key) {
        const cfg = LevelConfigStore.#configs.get(key);
        if (!cfg) {
            throw new Error(`LevelConfigStore: '${key}' not loaded — await LevelConfigStore.load() first`);
        }
        return cfg;
    }

    /** Reset cache (tests + reload between sessions). */
    static clear() {
        LevelConfigStore.#configs.clear();
        LevelConfigStore.#sectionKeys = [];
        LevelConfigStore.#meta = null;
    }
}
