/**
 * PerkSystem - Roguelike tactical perk/build system
 *
 * After each level the player picks 1 of 3 randomly offered perks.
 * Perks create unique builds through synergies and trade-offs.
 * Replaces the old stat-only shop for deeper tactical gameplay.
 */

// ─── Rarity tiers with selection weights ───
const PERK_RARITY = {
    common:    { label: 'Common',    color: '#aabbcc', glow: '#8899aa', border: '#667788', weight: 50 },
    rare:      { label: 'Rare',      color: '#4499ff', glow: '#2266dd', border: '#3377ee', weight: 28 },
    epic:      { label: 'Epic',      color: '#bb55ff', glow: '#8822dd', border: '#9933ee', weight: 14 },
    legendary: { label: 'Legendary', color: '#ffaa00', glow: '#ff8800', border: '#ffbb33', weight: 5  }
};

// ─── Category definitions ───
const PERK_CATEGORIES = {
    offensive:  { label: 'Offensive',  icon: '⚔', color: '#ff5555' },
    defensive:  { label: 'Defensive',  icon: '🛡', color: '#5588ff' },
    utility:    { label: 'Utility',    icon: '⚙', color: '#55ff88' }
};

// ─── Full Perk Catalog (20 perks) ───
const PERK_CATALOG = [

    // ══════════ OFFENSIVE ══════════

    {
        id: 'piercing_rounds',
        name: 'Piercing Rounds',
        description: 'Bullets pass through enemies instead of stopping.',
        stackDesc: '+1 enemy pierced per stack',
        category: 'offensive',
        rarity: 'common',
        maxStacks: 3,
        icon: '➤'
    },
    {
        id: 'critical_strike',
        name: 'Critical Strike',
        description: '15% chance to deal 2.5× critical damage.',
        stackDesc: '+12% crit chance per stack',
        category: 'offensive',
        rarity: 'common',
        maxStacks: 3,
        icon: '✦'
    },
    {
        id: 'explosive_rounds',
        name: 'Explosive Rounds',
        description: 'Bullets explode on impact dealing AoE damage (50px).',
        category: 'offensive',
        rarity: 'epic',
        maxStacks: 1,
        icon: '◉'
    },
    {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        description: 'Kills trigger chain lightning to nearest enemy (120px).',
        stackDesc: '+1 chain target per stack',
        category: 'offensive',
        rarity: 'rare',
        maxStacks: 2,
        icon: '⚡'
    },
    {
        id: 'vampire_rounds',
        name: 'Vampire Rounds',
        description: 'Heal 1 HP for every 8 enemies killed.',
        stackDesc: '−2 kills needed per stack',
        category: 'offensive',
        rarity: 'common',
        maxStacks: 3,
        icon: '♥'
    },
    {
        id: 'double_barrel',
        name: 'Double Barrel',
        description: 'Fire 2 bullets per shot. +30% heat generation.',
        category: 'offensive',
        rarity: 'rare',
        maxStacks: 1,
        icon: '⫸',
        stats: { fireRate: 1 },
        tradeoff: '+30% heat per shot'
    },
    {
        id: 'glass_cannon',
        name: 'Glass Cannon',
        description: '+100% damage. −1 max HP and −25% resistance.',
        category: 'offensive',
        rarity: 'legendary',
        maxStacks: 1,
        icon: '☠',
        stats: { hp: -1 },
        tradeoff: '−1 HP, −25% resist'
    },

    // ══════════ DEFENSIVE ══════════

    {
        id: 'auto_shield',
        name: 'Auto Shield',
        description: 'Automatically deploy a shield every 12 seconds (6s duration).',
        stackDesc: '−3 seconds cooldown per stack',
        category: 'defensive',
        rarity: 'rare',
        maxStacks: 2,
        icon: '◎'
    },
    {
        id: 'phase_dodge',
        name: 'Phase Dodge',
        description: '12% chance to phase through enemy attacks.',
        stackDesc: '+8% dodge chance per stack',
        category: 'defensive',
        rarity: 'common',
        maxStacks: 3,
        icon: '◌'
    },
    {
        id: 'emergency_protocol',
        name: 'Emergency Protocol',
        description: 'At 1 HP: 3s invincibility + slow-mo. Once per level.',
        category: 'defensive',
        rarity: 'epic',
        maxStacks: 1,
        icon: '!'
    },
    {
        id: 'damage_converter',
        name: 'Damage Converter',
        description: 'Each hit reduces ultimate cooldown by 20%.',
        stackDesc: '+10% cooldown reduction per stack',
        category: 'defensive',
        rarity: 'rare',
        maxStacks: 2,
        icon: '⟳'
    },
    {
        id: 'thorns',
        name: 'Thorns',
        description: 'Enemies touching you take 3 damage.',
        category: 'defensive',
        rarity: 'epic',
        maxStacks: 1,
        icon: '✴',
        stats: { resist: 1 }
    },
    {
        id: 'fortress_mode',
        name: 'Fortress Mode',
        description: '+2 max HP. −15% movement speed.',
        stackDesc: '+2 HP, −15% speed per stack',
        category: 'defensive',
        rarity: 'common',
        maxStacks: 3,
        icon: '▣',
        stats: { hp: 2 },
        tradeoff: '−15% speed'
    },

    // ══════════ UTILITY ══════════

    {
        id: 'magnet_field',
        name: 'Magnet Field',
        description: 'PowerUps attracted from 150px range.',
        stackDesc: '+80px range per stack',
        category: 'utility',
        rarity: 'common',
        maxStacks: 3,
        icon: '⊕'
    },
    {
        id: 'combo_master',
        name: 'Combo Master',
        description: 'Combo timer decays 40% slower. +15% combo bonus.',
        stackDesc: '+20% slower decay per stack',
        category: 'utility',
        rarity: 'common',
        maxStacks: 2,
        icon: '✕'
    },
    {
        id: 'ultimate_engine',
        name: 'Ultimate Engine',
        description: 'Ultimate cooldown recharges 35% faster.',
        stackDesc: '+20% recharge speed per stack',
        category: 'utility',
        rarity: 'rare',
        maxStacks: 2,
        icon: '★'
    },
    {
        id: 'cool_exhaust',
        name: 'Cool Exhaust',
        description: 'Heat dissipates 50% faster.',
        stackDesc: '+25% per stack',
        category: 'utility',
        rarity: 'common',
        maxStacks: 2,
        icon: '❆',
        stats: { fireRate: 1 }
    },
    {
        id: 'lucky_drops',
        name: 'Lucky Drops',
        description: '+25% power-up drop rate from enemies.',
        stackDesc: '+15% per stack',
        category: 'utility',
        rarity: 'rare',
        maxStacks: 2,
        icon: '♣'
    },
    {
        id: 'point_multiplier',
        name: 'Point Multiplier',
        description: '+20% score from all sources.',
        stackDesc: '+15% per stack',
        category: 'utility',
        rarity: 'common',
        maxStacks: 3,
        icon: '◆'
    },
    {
        id: 'orbital_drone',
        name: 'Orbital Drone',
        description: 'A drone orbits your ship, launching homing missiles.',
        stackDesc: '+1 drone per stack',
        category: 'utility',
        rarity: 'epic',
        maxStacks: 2,
        icon: '⊛'
    }
];


// ─── Fast lookup map: perkId → perk object (O(1) vs O(n) find) ───
const PERK_MAP = new Map();
for (const p of PERK_CATALOG) PERK_MAP.set(p.id, p);


/**
 * PerkSystem - Manages active perks, selection, and modifier calculations
 */
class PerkSystem {
    constructor() {
        this.activePerks = new Map(); // perkId → stacks
        this.vampireKillCount = 0;
        this.emergencyUsedThisLevel = false;
        this.autoShieldTimer = 0;
        this.droneAngle = 0;
        this.droneFireTimers = [];
        this.thornsAngle = 0;
        this.thornsTime = 0;
        // Cache for getActivePerks() — invalidated on activatePerk/reset
        this._activePerkCache = null;
    }

    // ══════════════════════════════════
    //  SELECTION
    // ══════════════════════════════════

    /** Return `count` random perks (weighted by rarity), no duplicates */
    getRandomSelection(count = 3) {
        const pool = [];
        for (const perk of PERK_CATALOG) {
            const cur = this.activePerks.get(perk.id) || 0;
            if (cur >= perk.maxStacks) continue;
            const w = PERK_RARITY[perk.rarity].weight;
            for (let i = 0; i < w; i++) pool.push(perk);
        }
        const selected = [];
        const used = new Set();
        let attempts = 0;
        while (selected.length < count && attempts < 300) {
            attempts++;
            if (pool.length === 0) break;
            const perk = pool[Math.floor(Math.random() * pool.length)];
            if (used.has(perk.id)) continue;
            used.add(perk.id);
            selected.push({
                ...perk,
                currentStacks: this.activePerks.get(perk.id) || 0,
                rarityData: PERK_RARITY[perk.rarity],
                categoryData: PERK_CATEGORIES[perk.category]
            });
        }
        return selected;
    }

    /** Activate a perk, returns stat deltas (or null) */
    activatePerk(perkId) {
        const perk = PERK_MAP.get(perkId);
        if (!perk) return null;
        const cur = this.activePerks.get(perkId) || 0;
        if (cur >= perk.maxStacks) return null;
        this.activePerks.set(perkId, cur + 1);
        this._activePerkCache = null; // invalidate cache

        // Initialise extra drone timer if needed
        if (perkId === 'orbital_drone') {
            this.droneFireTimers.push(0);
        }

        return perk.stats || null;
    }

    // ══════════════════════════════════
    //  QUERIES
    // ══════════════════════════════════

    hasPerk(id) { return (this.activePerks.get(id) || 0) > 0; }
    getStacks(id) { return this.activePerks.get(id) || 0; }

    getActivePerks() {
        if (this._activePerkCache) return this._activePerkCache;
        const out = [];
        for (const [id, stacks] of this.activePerks) {
            const p = PERK_MAP.get(id);
            if (p) out.push({ ...p, stacks, rarityData: PERK_RARITY[p.rarity], categoryData: PERK_CATEGORIES[p.category] });
        }
        this._activePerkCache = out;
        return out;
    }

    // ══════════════════════════════════
    //  MODIFIER GETTERS
    // ══════════════════════════════════

    //  Damage
    getDamageMultiplier()  { return this.hasPerk('glass_cannon') ? 2.0 : 1.0; }
    getCritChance()        { return this.hasPerk('critical_strike') ? 0.15 + (this.getStacks('critical_strike') - 1) * 0.12 : 0; }
    getCritMultiplier()    { return 2.5; }
    getPierceCount()       { return this.getStacks('piercing_rounds'); }

    //  Defense
    getPhaseChance()       { return this.hasPerk('phase_dodge') ? 0.12 + (this.getStacks('phase_dodge') - 1) * 0.08 : 0; }
    getDamageConverterRate() { return this.hasPerk('damage_converter') ? 0.20 + (this.getStacks('damage_converter') - 1) * 0.10 : 0; }
    getAutoShieldCooldown() { return this.hasPerk('auto_shield') ? 12 - (this.getStacks('auto_shield') - 1) * 3 : Infinity; }
    getResistanceModifier() { return this.hasPerk('glass_cannon') ? -0.25 : 0; }
    getSpeedMultiplier()    { let m = 1; if (this.hasPerk('fortress_mode')) m -= 0.15 * this.getStacks('fortress_mode'); return Math.max(0.4, m); }

    //  Utility
    getDropRateBonus()     { return this.hasPerk('lucky_drops') ? 0.25 + (this.getStacks('lucky_drops') - 1) * 0.15 : 0; }
    getPointMultiplier()   { return this.hasPerk('point_multiplier') ? 1 + 0.20 + (this.getStacks('point_multiplier') - 1) * 0.15 : 1; }
    getComboDecayMultiplier() { return this.hasPerk('combo_master') ? Math.max(0.2, 1 - 0.40 - (this.getStacks('combo_master') - 1) * 0.20) : 1; }
    getComboPointsBonus()  { return this.hasPerk('combo_master') ? 0.15 : 0; }
    getUltChargeMultiplier() { return this.hasPerk('ultimate_engine') ? 1 + 0.35 + (this.getStacks('ultimate_engine') - 1) * 0.20 : 1; }
    getHeatDissipationMult() { return this.hasPerk('cool_exhaust') ? 1 + 0.50 + (this.getStacks('cool_exhaust') - 1) * 0.25 : 1; }
    getHeatPerShotMult()   { return this.hasPerk('double_barrel') ? 1.30 : 1; }
    getMagnetRange()       { return this.hasPerk('magnet_field') ? 150 + (this.getStacks('magnet_field') - 1) * 80 : 0; }
    getVampireKillThreshold() { return this.hasPerk('vampire_rounds') ? Math.max(2, 8 - (this.getStacks('vampire_rounds') - 1) * 2) : Infinity; }
    getChainTargets()      { return this.getStacks('chain_lightning'); }
    getDroneCount()        { return this.getStacks('orbital_drone'); }

    //  Boolean shortcuts
    hasExplosiveRounds()   { return this.hasPerk('explosive_rounds'); }
    hasThorns()            { return this.hasPerk('thorns'); }
    hasDoubleBarrel()      { return this.hasPerk('double_barrel'); }
    hasEmergencyProtocol() { return this.hasPerk('emergency_protocol') && !this.emergencyUsedThisLevel; }

    // ══════════════════════════════════
    //  LIFECYCLE
    // ══════════════════════════════════

    /** Called at the start of each level */
    onLevelStart() {
        this.emergencyUsedThisLevel = false;
        // Deploy shield shortly after level starts (2s delay)
        this.autoShieldTimer = this.hasPerk('auto_shield') ? 2 : this.getAutoShieldCooldown();
    }

    /** Full reset for new game */
    reset() {
        this.activePerks.clear();
        this._activePerkCache = null;
        this.vampireKillCount = 0;
        this.emergencyUsedThisLevel = false;
        this.autoShieldTimer = 0;
        this.droneAngle = 0;
        this.droneFireTimers = [];
        this.thornsAngle = 0;
        this.thornsTime = 0;
    }
}

export { PerkSystem, PERK_CATALOG, PERK_RARITY, PERK_CATEGORIES };
