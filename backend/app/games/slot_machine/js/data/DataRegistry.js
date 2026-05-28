/**
 * Loads and validates every JSON in /data, exposes immutable lookup maps.
 * Throws on missing keys to fail fast at boot.
 */
const FILES = Object.freeze({
    symbols:  'data/symbols.json',
    reels:    'data/reels.json',
    paylines: 'data/paylines.json',
    bets:     'data/bets.json',
    bonuses:  'data/bonuses.json',
    sounds:   'data/sounds.json',
    config:   'data/config.json'
});

export class DataRegistry {
    symbols = null;     // Map<id, symbolDef>
    symbolList = null;  // ordered Array
    reels = null;       // Array of {id, weights}
    stripLength = 0;
    paylines = null;    // Array
    bets = null;        // tiers, defaultTierIndex, maxBetTierIndex
    bonuses = null;     // freeSpins, treasureVault, hotStreak, jackpot
    sounds = null;      // master, sounds
    config = null;      // gameplay tunables
    _loaded = false;

    async load() {
        const entries = await Promise.all(
            Object.entries(FILES).map(async ([key, url]) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`DataRegistry: failed to load ${url}`);
                return [key, await res.json()];
            })
        );
        const raw = Object.fromEntries(entries);

        this._buildSymbols(raw.symbols);
        this._buildReels(raw.reels);
        this._buildPaylines(raw.paylines);
        this._buildBets(raw.bets);
        this._buildBonuses(raw.bonuses);
        this._buildSounds(raw.sounds);
        this._buildConfig(raw.config);

        this._loaded = true;
    }

    _buildSymbols(raw) {
        this._requireKeys(raw, ['symbols'], 'symbols.json');
        const map = new Map();
        for (const s of raw.symbols) {
            this._requireKeys(s, ['id','label','tier','payout','color','accent'], `symbol ${s.id}`);
            map.set(s.id, Object.freeze(s));
        }
        this.symbols = map;
        this.symbolList = Object.freeze(raw.symbols.slice());
    }

    _buildReels(raw) {
        this._requireKeys(raw, ['reels','stripLength'], 'reels.json');
        this.reels = raw.reels.map(r => Object.freeze({ id: r.id, weights: Object.freeze({ ...r.weights }) }));
        this.stripLength = raw.stripLength;
    }

    _buildPaylines(raw) {
        this._requireKeys(raw, ['paylines'], 'paylines.json');
        this.paylines = raw.paylines.map(p => Object.freeze({
            id: p.id, label: p.label, color: p.color,
            cells: Object.freeze(p.cells.map(c => Object.freeze(c.slice())))
        }));
    }

    _buildBets(raw) {
        this._requireKeys(raw, ['tiers','defaultTierIndex','maxBetTierIndex'], 'bets.json');
        this.bets = Object.freeze({
            tiers: Object.freeze(raw.tiers.map(t => Object.freeze({ ...t }))),
            defaultTierIndex: raw.defaultTierIndex,
            maxBetTierIndex: raw.maxBetTierIndex
        });
    }

    _buildBonuses(raw) {
        this._requireKeys(raw, ['freeSpins','treasureVault','hotStreak','jackpot'], 'bonuses.json');
        this.bonuses = Object.freeze({
            freeSpins:     Object.freeze({ ...raw.freeSpins, rewards: Object.freeze({ ...raw.freeSpins.rewards }) }),
            treasureVault: Object.freeze({ ...raw.treasureVault, outcomes: Object.freeze(raw.treasureVault.outcomes.map(o => Object.freeze({...o}))) }),
            hotStreak:     Object.freeze({ thresholds: Object.freeze(raw.hotStreak.thresholds.map(t => Object.freeze({...t}))) }),
            jackpot:       Object.freeze({ ...raw.jackpot })
        });
    }

    _buildSounds(raw) {
        this._requireKeys(raw, ['master','sounds'], 'sounds.json');
        this.sounds = Object.freeze({ master: raw.master, sounds: Object.freeze({ ...raw.sounds }) });
    }

    _buildConfig(raw) {
        this._requireKeys(raw, ['reels','session','jackpotTicker','wins','mystery','autoplay'], 'config.json');
        this.config = Object.freeze({
            reels:        Object.freeze({ ...raw.reels }),
            session:      Object.freeze({ ...raw.session }),
            jackpotTicker:Object.freeze({ ...raw.jackpotTicker }),
            wins:         Object.freeze({
                thresholds: Object.freeze({ ...raw.wins.thresholds }),
                messages:   Object.freeze({ ...raw.wins.messages })
            }),
            mystery:      Object.freeze({ morphPool: Object.freeze(raw.mystery.morphPool.slice()) }),
            autoplay:     Object.freeze({ presets: Object.freeze(raw.autoplay.presets.slice()) })
        });
    }

    getSymbol(id) {
        const s = this.symbols.get(id);
        if (!s) throw new Error(`Unknown symbol: ${id}`);
        return s;
    }

    _requireKeys(obj, keys, ctx) {
        for (const k of keys) {
            if (!(k in obj)) throw new Error(`DataRegistry: missing "${k}" in ${ctx}`);
        }
    }
}
