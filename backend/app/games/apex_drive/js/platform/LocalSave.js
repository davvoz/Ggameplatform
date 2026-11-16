/**
 * Keeps some of this device's data (the settings) in the browser's storage,
 * under its own key. Every call fails soft: in a private window or with
 * storage blocked the data lasts for the visit. The career is not here: it
 * lives on the server (app/CareerSync.js).
 */
export class LocalSave {
    #key;
    #storage;

    /** @param {string} key @param {Storage} [storage] */
    constructor(key, storage = globalThis.localStorage) {
        this.#key = key;
        this.#storage = storage;
    }

    /** @returns {object|null} the saved data */
    load() {
        try {
            const text = this.#storage?.getItem(this.#key);
            return text ? JSON.parse(text) : null;
        } catch {
            return null;
        }
    }

    save(data) {
        try {
            this.#storage?.setItem(this.#key, JSON.stringify(data));
        } catch {
            // storage full or blocked: the data lasts for this visit
        }
    }

    clear() {
        try {
            this.#storage?.removeItem(this.#key);
        } catch {
            // storage blocked: there is nothing to clear
        }
    }
}
