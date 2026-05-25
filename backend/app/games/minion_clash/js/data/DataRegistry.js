/**
 * Loads & indexes all JSON data files. Single source of truth for definitions.
 * Throws on missing required data — no silent fallbacks.
 */
export class DataRegistry {
    constructor() {
        this._heroes = new Map();
        this._units = new Map();
        this._cards = new Map();
        this._towerDef = null;
        this._leaderDef = null;
        this._levels = new Map();
        this._levelOrder = [];
    }

    async load(basePath = 'data') {
        const [heroes, units, cards, towers, campaign] = await Promise.all([
            this._fetchJson(`${basePath}/heroes.json`),
            this._fetchJson(`${basePath}/units.json`),
            this._fetchJson(`${basePath}/cards.json`),
            this._fetchJson(`${basePath}/towers.json`),
            this._fetchJson(`${basePath}/campaign.json`)
        ]);
        this._indexHeroes(heroes);
        this._indexUnits(units);
        this._indexCards(cards);
        this._indexTowers(towers);
        this._indexLevels(campaign);
        this._validateCardReferences();
    }

    async _fetchJson(path) {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`DataRegistry: failed to load ${path} (${res.status})`);
        return res.json();
    }

    _indexHeroes(json) {
        if (!Array.isArray(json?.heroes) || json.heroes.length === 0) {
            throw new Error('DataRegistry: heroes.json missing "heroes" array');
        }
        for (const h of json.heroes) {
            this._requireKeys(h, ['id','name','hp','hpRegen','moveSpeed','attackDamage','attackInterval','attackRange','attackKind','radius','respawnDelay'], 'hero');
            this._heroes.set(h.id, Object.freeze({ ...h }));
        }
    }

    _indexUnits(json) {
        if (!json?.units || typeof json.units !== 'object') {
            throw new Error('DataRegistry: units.json missing "units" map');
        }
        for (const [id, def] of Object.entries(json.units)) {
            if (id.startsWith('_')) continue;
            this._requireKeys(def, ['name','hp','moveSpeed','attackDamage','attackInterval','attackRange','attackKind','radius'], `unit "${id}"`);
            this._units.set(id, Object.freeze({ id, hpRegen: 0, ...def }));
        }
    }

    _indexCards(json) {
        if (!Array.isArray(json?.cards) || json.cards.length === 0) {
            throw new Error('DataRegistry: cards.json missing "cards" array');
        }
        for (const c of json.cards) {
            this._requireKeys(c, ['id','name','kind','cost','cooldown'], 'card');
            if (c.kind !== 'summon' && c.kind !== 'spell') {
                throw new Error(`DataRegistry: card "${c.id}" has unknown kind "${c.kind}"`);
            }
            this._cards.set(c.id, Object.freeze({ count: 1, spread: 0, ...c }));
        }
    }

    _indexTowers(json) {
        if (!json?.tower) throw new Error('DataRegistry: towers.json missing "tower"');
        this._requireKeys(json.tower, ['hp','attackDamage','attackInterval','attackRange','attackKind','radius'], 'tower');
        this._towerDef = Object.freeze({ ...json.tower });
        this._leaderDef = json.leader ? Object.freeze({ ...json.leader }) : null;
    }

    _indexLevels(json) {
        if (!Array.isArray(json?.levels) || json.levels.length === 0) {
            throw new Error('DataRegistry: campaign.json missing "levels" array');
        }
        for (const lvl of json.levels) {
            this._requireKeys(lvl, ['id','title','enemyHeroId','enemyDeck','difficulties'], 'level');
            if (!Array.isArray(lvl.enemyDeck) || lvl.enemyDeck.length !== 10) {
                throw new Error(`DataRegistry: level "${lvl.id}" enemyDeck must have exactly 10 cards`);
            }
            for (const diff of ['easy', 'medium', 'hard']) {
                const block = lvl.difficulties[diff];
                if (!block) {
                    throw new Error(`DataRegistry: level "${lvl.id}" missing difficulty "${diff}"`);
                }
                this._requireKeys(block, ['aiProfile', 'modifiers'],
                    `level "${lvl.id}" difficulty "${diff}"`);
            }
            this._levels.set(lvl.id, Object.freeze({
                id:          lvl.id,
                title:       lvl.title,
                subtitle:    lvl.subtitle ?? '',
                theme:       lvl.theme    ?? '',
                enemyHeroId: lvl.enemyHeroId,
                enemyDeck:   Object.freeze([...lvl.enemyDeck]),
                difficulties: Object.freeze({ ...lvl.difficulties }),
            }));
            this._levelOrder.push(lvl.id);
        }
    }

    _validateCardReferences() {
        for (const card of this._cards.values()) {
            if (card.kind === 'summon' && !this._units.has(card.unitId)) {
                throw new Error(`DataRegistry: card "${card.id}" references unknown unit "${card.unitId}"`);
            }
        }
        for (const lvl of this._levels.values()) {
            if (!this._heroes.has(lvl.enemyHeroId)) {
                throw new Error(`DataRegistry: level "${lvl.id}" references unknown hero "${lvl.enemyHeroId}"`);
            }
            for (const cid of lvl.enemyDeck) {
                if (!this._cards.has(cid)) {
                    throw new Error(`DataRegistry: level "${lvl.id}" references unknown card "${cid}"`);
                }
            }
        }
    }

    _requireKeys(obj, keys, label) {
        for (const k of keys) {
            if (obj[k] === undefined || obj[k] === null) {
                throw new Error(`DataRegistry: ${label} missing required field "${k}"`);
            }
        }
    }

    // — Public API —
    getHero(id) {
        const h = this._heroes.get(id);
        if (!h) throw new Error(`DataRegistry: unknown hero "${id}"`);
        return h;
    }
    getAllHeroes() { return Array.from(this._heroes.values()); }

    getUnit(id) {
        const u = this._units.get(id);
        if (!u) throw new Error(`DataRegistry: unknown unit "${id}"`);
        return u;
    }

    getCard(id) {
        const c = this._cards.get(id);
        if (!c) throw new Error(`DataRegistry: unknown card "${id}"`);
        return c;
    }
    getAllCards() { return Array.from(this._cards.values()); }

    getTowerDef() { return this._towerDef; }
    getLeaderDef() { return this._leaderDef; }

    getLevel(id) {
        const l = this._levels.get(id);
        if (!l) throw new Error(`DataRegistry: unknown level "${id}"`);
        return l;
    }

    /**
     * Returns a flat level object (same shape as before) for the given difficulty.
     * Falls back to 'medium' if the requested difficulty block is absent.
     *
     * @param {string} id         - level id
     * @param {string} difficulty - 'easy' | 'medium' | 'hard'
     * @returns {object} Frozen level object with aiProfile and modifiers resolved.
     */
    getLevelForDifficulty(id, difficulty) {
        const lvl  = this.getLevel(id);
        const diff = lvl.difficulties[difficulty] ?? lvl.difficulties['medium'];
        if (!diff) throw new Error(`DataRegistry: level "${id}" has no difficulty block`);
        return Object.freeze({
            id:          lvl.id,
            title:       lvl.title,
            subtitle:    lvl.subtitle,
            theme:       lvl.theme,
            enemyHeroId: lvl.enemyHeroId,
            enemyDeck:   lvl.enemyDeck,
            aiProfile:   diff.aiProfile,
            modifiers:   diff.modifiers,
        });
    }

    getAllLevels() { return this._levelOrder.map((id) => this._levels.get(id)); }
}
