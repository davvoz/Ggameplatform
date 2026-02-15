/**
 * ShopSystem - Professional upgrade shop between levels
 * 
 * Items boost one or more stats and can themselves be upgraded (Mk I → Mk V).
 * Points earned in-game are the currency.
 * Scalable: new categories and items can be added to SHOP_CATALOG.
 */

/**
 * SHOP_CATALOG - All purchasable items
 * 
 * Each item:
 *   id:          unique identifier
 *   name:        display name
 *   icon:        emoji icon
 *   category:    category key
 *   description: what it does
 *   baseCost:    cost for Mk I
 *   costScale:   multiplier per upgrade level
 *   maxLevel:    max upgrade level
 *   stats:       object mapping stat → bonus per level
 *                { hp, speed, resist, fireRate }
 */
const SHOP_CATALOG = {
    // ===== HULL & ARMOR =====
    hull_plating: {
        id: 'hull_plating',
        name: 'Hull Plating',
        icon: '🛡️',
        category: 'armor',
        description: 'Reinforced hull increases max HP.',
        baseCost: 200,
        costScale: 1.6,
        maxLevel: 5,
        stats: { hp: 1, speed: 0, resist: 0, fireRate: 0 }
    },
    armor_module: {
        id: 'armor_module',
        name: 'Armor Module',
        icon: '🔩',
        category: 'armor',
        description: 'Composite plating reduces incoming damage.',
        baseCost: 250,
        costScale: 1.7,
        maxLevel: 5,
        stats: { hp: 0, speed: 0, resist: 1, fireRate: 0 }
    },
    composite_armor: {
        id: 'composite_armor',
        name: 'Composite Armor',
        icon: '⬡',
        category: 'armor',
        description: 'Advanced alloy boosts both HP and resistance.',
        baseCost: 400,
        costScale: 1.8,
        maxLevel: 4,
        stats: { hp: 1, speed: 0, resist: 1, fireRate: 0 }
    },

    // ===== PROPULSION =====
    thruster_boost: {
        id: 'thruster_boost',
        name: 'Thruster Boost',
        icon: '🚀',
        category: 'propulsion',
        description: 'Enhanced thrusters for faster movement.',
        baseCost: 180,
        costScale: 1.5,
        maxLevel: 5,
        stats: { hp: 0, speed: 1, resist: 0, fireRate: 0 }
    },
    agility_drive: {
        id: 'agility_drive',
        name: 'Agility Drive',
        icon: '💫',
        category: 'propulsion',
        description: 'Quick-response system improves speed and fire rate.',
        baseCost: 350,
        costScale: 1.7,
        maxLevel: 4,
        stats: { hp: 0, speed: 1, resist: 0, fireRate: 1 }
    },

    // ===== WEAPONS =====
    rapid_loader: {
        id: 'rapid_loader',
        name: 'Rapid Loader',
        icon: '⚡',
        category: 'weapons',
        description: 'Autoloader mechanism increases fire rate.',
        baseCost: 220,
        costScale: 1.6,
        maxLevel: 5,
        stats: { hp: 0, speed: 0, resist: 0, fireRate: 1 }
    },
    power_core: {
        id: 'power_core',
        name: 'Power Core',
        icon: '🔋',
        category: 'weapons',
        description: 'Overcharged reactor boosts HP and fire rate.',
        baseCost: 380,
        costScale: 1.8,
        maxLevel: 4,
        stats: { hp: 1, speed: 0, resist: 0, fireRate: 1 }
    },

    // ===== TACTICAL =====
    tactical_suite: {
        id: 'tactical_suite',
        name: 'Tactical Suite',
        icon: '🎯',
        category: 'tactical',
        description: 'Integrated systems provide small boost to all stats.',
        baseCost: 500,
        costScale: 2.0,
        maxLevel: 3,
        stats: { hp: 1, speed: 1, resist: 1, fireRate: 1 }
    },
    nano_repair: {
        id: 'nano_repair',
        name: 'Nano Repair',
        icon: '🔧',
        category: 'tactical',
        description: 'Nanobots reinforce hull and boost resistance.',
        baseCost: 300,
        costScale: 1.7,
        maxLevel: 4,
        stats: { hp: 1, speed: 0, resist: 1, fireRate: 0 }
    },
    hyperion_engine: {
        id: 'hyperion_engine',
        name: 'Hyperion Engine',
        icon: '⭐',
        category: 'tactical',
        description: 'Legendary engine: massive speed with some resistance.',
        baseCost: 450,
        costScale: 1.9,
        maxLevel: 3,
        stats: { hp: 0, speed: 2, resist: 1, fireRate: 0 }
    }
};

const SHOP_CATEGORIES = {
    armor: { name: 'Armor & Hull', icon: '🛡️', order: 1 },
    propulsion: { name: 'Propulsion', icon: '🚀', order: 2 },
    weapons: { name: 'Weapons', icon: '⚡', order: 3 },
    tactical: { name: 'Tactical', icon: '🎯', order: 4 }
};

class ShopSystem {
    constructor() {
        // Track purchased levels: { itemId: currentLevel }
        this.purchasedLevels = {};
        // Total stats bonus accumulated from shop
        this.totalBonusStats = { hp: 0, speed: 0, resist: 0, fireRate: 0 };
    }

    /**
     * Get all shop items organized by category
     */
    getCatalogByCategory() {
        const result = {};
        for (const [catId, catInfo] of Object.entries(SHOP_CATEGORIES)) {
            result[catId] = {
                ...catInfo,
                items: Object.values(SHOP_CATALOG)
                    .filter(item => item.category === catId)
                    .map(item => ({
                        ...item,
                        currentLevel: this.purchasedLevels[item.id] || 0,
                        nextCost: this.getUpgradeCost(item.id),
                        isMaxed: (this.purchasedLevels[item.id] || 0) >= item.maxLevel
                    }))
            };
        }
        return result;
    }

    /**
     * Get cost for next upgrade of an item
     */
    getUpgradeCost(itemId) {
        const item = SHOP_CATALOG[itemId];
        if (!item) return Infinity;
        const currentLevel = this.purchasedLevels[itemId] || 0;
        if (currentLevel >= item.maxLevel) return Infinity;
        return Math.floor(item.baseCost * Math.pow(item.costScale, currentLevel));
    }

    /**
     * Check if player can afford an upgrade
     */
    canAfford(itemId, points) {
        return points >= this.getUpgradeCost(itemId);
    }

    /**
     * Purchase or upgrade an item
     * @returns {{ success: boolean, cost: number, newLevel: number, bonusStats: object }}
     */
    buyUpgrade(itemId, points) {
        const item = SHOP_CATALOG[itemId];
        if (!item) return { success: false };

        const currentLevel = this.purchasedLevels[itemId] || 0;
        if (currentLevel >= item.maxLevel) return { success: false };

        const cost = this.getUpgradeCost(itemId);
        if (points < cost) return { success: false };

        // Apply purchase
        this.purchasedLevels[itemId] = currentLevel + 1;

        // Add stat bonuses for this level
        const bonusStats = { ...item.stats };
        for (const stat of Object.keys(this.totalBonusStats)) {
            this.totalBonusStats[stat] += (bonusStats[stat] || 0);
        }

        return {
            success: true,
            cost,
            newLevel: currentLevel + 1,
            bonusStats
        };
    }

    /**
     * Get current total bonus stats from all purchases
     */
    getTotalBonusStats() {
        return { ...this.totalBonusStats };
    }

    /**
     * Get upgrade level marks text
     */
    getLevelMarks(itemId) {
        const item = SHOP_CATALOG[itemId];
        if (!item) return '';
        const current = this.purchasedLevels[itemId] || 0;
        const marks = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
        let text = '';
        for (let i = 0; i < item.maxLevel; i++) {
            text += i < current ? `<span class="mark-filled">${marks[i]}</span>` : `<span class="mark-empty">${marks[i]}</span>`;
        }
        return text;
    }

    /**
     * Reset shop (new game)
     */
    reset() {
        this.purchasedLevels = {};
        this.totalBonusStats = { hp: 0, speed: 0, resist: 0, fireRate: 0 };
    }

    /**
     * Serialize state for save
     */
    serialize() {
        return {
            purchasedLevels: { ...this.purchasedLevels },
            totalBonusStats: { ...this.totalBonusStats }
        };
    }

    /**
     * Restore from saved state
     */
    deserialize(data) {
        if (data.purchasedLevels) this.purchasedLevels = { ...data.purchasedLevels };
        if (data.totalBonusStats) this.totalBonusStats = { ...data.totalBonusStats };
    }
}

export { ShopSystem, SHOP_CATALOG, SHOP_CATEGORIES };
export default ShopSystem;
