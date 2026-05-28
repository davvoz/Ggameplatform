/**
 * Loads & freezes all JSON data files. Single source of truth.
 * Throws explicit errors on missing data — no silent fallbacks.
 */
export class DataRegistry {
    constructor() {
        this._bets       = new Map();   // id → frozen bet template
        this._betsOrder  = [];          // insertion order for UI iteration
        this._wheelOrder = null;        // frozen number[]
        this._chips      = null;        // frozen array
        this._config     = null;        // frozen object
        this._numberPos  = new Map();   // n → index on wheel
    }

    async load(basePath = 'data') {
        const [bets, wheel, chips, config] = await Promise.all([
            this._fetchJson(`${basePath}/bets.json`),
            this._fetchJson(`${basePath}/wheel.json`),
            this._fetchJson(`${basePath}/chips.json`),
            this._fetchJson(`${basePath}/config.json`)
        ]);
        this._indexBets(bets);
        this._indexWheel(wheel);
        this._indexChips(chips);
        this._indexConfig(config);
    }

    async _fetchJson(path) {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`DataRegistry: failed to load ${path} (${res.status})`);
        return res.json();
    }

    _indexBets(json) {
        if (!Array.isArray(json?.bets) || json.bets.length === 0) {
            throw new Error('DataRegistry: bets.json missing "bets" array');
        }
        for (const b of json.bets) {
            this._requireKeys(b, ['id', 'label', 'payout', 'selector'], 'bet');
            this._bets.set(b.id, Object.freeze({ ...b, data: Object.freeze({ ...b.data }) }));
            this._betsOrder.push(b.id);
        }
    }

    _indexWheel(json) {
        if (!Array.isArray(json?.order) || json.order.length !== 37) {
            throw new Error('DataRegistry: wheel.json must contain "order" of 37 numbers');
        }
        const seen = new Set();
        for (const n of json.order) {
            if (typeof n !== 'number' || n < 0 || n > 36 || seen.has(n)) {
                throw new Error(`DataRegistry: invalid wheel number ${n}`);
            }
            seen.add(n);
        }
        this._wheelOrder = Object.freeze([...json.order]);
        json.order.forEach((n, i) => this._numberPos.set(n, i));
    }

    _indexChips(json) {
        if (!Array.isArray(json?.chips) || json.chips.length === 0) {
            throw new Error('DataRegistry: chips.json missing "chips" array');
        }
        for (const c of json.chips) {
            this._requireKeys(c, ['value', 'color', 'border', 'label'], 'chip');
        }
        this._chips = Object.freeze(json.chips.map(c => Object.freeze({ ...c })));
    }

    _indexConfig(json) {
        const required = ['startBalance', 'minBet', 'spin', 'reveal', 'heatmap', 'specials'];
        for (const k of required) {
            if (json?.[k] === undefined) throw new Error(`DataRegistry: config.json missing "${k}"`);
        }
        this._config = Object.freeze({
            ...json,
            spin:     Object.freeze({ ...json.spin }),
            reveal:   Object.freeze({ ...json.reveal }),
            heatmap:  Object.freeze({ ...json.heatmap }),
            specials: Object.freeze({
                ...json.specials,
                snakeNumbers: Object.freeze([...(json.specials.snakeNumbers ?? [])])
            })
        });
    }

    _requireKeys(obj, keys, label) {
        for (const k of keys) {
            if (obj[k] === undefined || obj[k] === null) {
                throw new Error(`DataRegistry: ${label} missing required field "${k}"`);
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────

    getBet(id) {
        const b = this._bets.get(id);
        if (!b) throw new Error(`DataRegistry: unknown bet "${id}"`);
        return b;
    }
    getBetsMap()   { return this._bets; }
    getBetIds()    { return this._betsOrder; }
    getWheelOrder() { return this._wheelOrder; }
    getWheelIndex(n) {
        const idx = this._numberPos.get(n);
        if (idx === undefined) throw new Error(`DataRegistry: number ${n} not on wheel`);
        return idx;
    }
    getChipDefs() { return this._chips; }
    getConfig()   { return this._config; }
}
