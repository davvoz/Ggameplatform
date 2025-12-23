/**
 * Indie Serious Game Configuration
 * Data-driven design - all gameplay values externalized
 * No hard-coded logic, no random elements, pure tactical depth
 */

const INDIE_CONFIG = {
    // Core Game Settings
    GRID: {
        COLS: 7,
        ROWS: 12,
        DEFENSE_ZONE_ROWS: 4,
        CELL_SIZE: 60, // Base size, scales with screen
    },
    
    // Session Design - Short, Intense
    GAME_FLOW: {
        INITIAL_RESOURCES: 100, // Enough for meaningful opening
        WAVE_PREP_TIME: 3000,   // 3s between waves - minimal downtime
        MAX_TOWER_SLOTS: 28,     // 7x4 grid, all usable
    },
    
    // Visual - Minimalist, Functional
    VISUALS: {
        BACKGROUND: '#0a0a12',
        GRID_LINE: '#1a1a2e',
        DEFENSE_LINE: '#ff4444',
        TOWER_RANGE_EFFECTIVE: '#00ff88',
        TOWER_RANGE_INEFFECTIVE: '#ff4444',
        UI_PRIMARY: '#ffffff',
        UI_SECONDARY: '#888888',
        UI_ACCENT: '#00ff88',
        UI_WARNING: '#ff8800',
        UI_DANGER: '#ff4444',
    },
    
    // Performance
    PERF: {
        MAX_PARTICLES: 100,    // Reduced - clarity over effects
        MAX_PROJECTILES: 50,
        TARGET_FPS: 60,
    }
};

/**
 * TOWER SYSTEM - Hard Counters & Specialization
 * Each tower excels in one context, fails in another
 */
const INDIE_TOWERS = {
    PIERCER: {
        id: 'PIERCER',
        name: 'Piercer',
        description: 'Line-penetrating shot. Eliminates priority targets.',
        
        // Visual (geometric, no emoji)
        visual: {
            shape: 'triangle',
            primaryColor: '#00aaff',
            secondaryColor: '#0088dd',
            icon: '▲', // Geometric ASCII fallback
        },
        
        // Base Stats (Tier 1)
        stats: {
            damage: 40,
            fireRate: 3000,      // Slow but powerful
            range: 4.5,
            projectileSpeed: 30,
            pierceCount: 3,      // Hits 3 enemies in line
        },
        
        // Economy
        cost: 120,
        salvageValue: 72, // 60% of cost
        
        // Effectiveness Matrix
        effectiveness: {
            SWARM: 0.5,      // Weak: Overkill on weak targets
            CHARGER: 2.0,    // Strong: One-shot priority
            FORTRESS: 0.4,   // Weak: Armor negates damage
            PHANTOM: 1.5,    // Strong: Can anticipate teleport line
            VANGUARD: 1.2,   // Neutral: Baseline
        },
        
        // Merge Evolution
        tiers: {
            1: { // Base
                ability: null,
            },
            2: { // 3 merged
                ability: 'DEEP_STRIKE',
                abilityDesc: 'Pierces 5 enemies instead of 3',
                pierceCount: 5,
                damageMultiplier: 2.0,
            },
            3: { // 9 merged  
                ability: 'EXECUTION',
                abilityDesc: 'Instantly kills enemies below 30% HP',
                executionThreshold: 0.3,
                damageMultiplier: 4.0,
            }
        }
    },
    
    DISRUPTOR: {
        id: 'DISRUPTOR',
        name: 'Disruptor',
        description: 'Area slow effect. Zones and controls.',
        
        visual: {
            shape: 'hexagon',
            primaryColor: '#00ddff',
            secondaryColor: '#00bbdd',
            icon: '⬡',
        },
        
        stats: {
            damage: 8,           // Low damage, utility focused
            fireRate: 1500,
            range: 3.0,
            projectileSpeed: 15,
            slowFactor: 0.4,     // 60% slow
            slowDuration: 2500,
            slowRadius: 1.8,     // AoE effect
        },
        
        cost: 80,
        salvageValue: 48,
        
        effectiveness: {
            SWARM: 2.0,      // Strong: Slows entire group
            CHARGER: 0.6,    // Weak: Fast targets resist slow
            FORTRESS: 0.8,   // Weak: Slow doesn't help vs armor
            PHANTOM: 2.5,    // Strong: Prevents teleport
            VANGUARD: 1.2,
        },
        
        tiers: {
            1: {
                ability: null,
            },
            2: {
                ability: 'CASCADE',
                abilityDesc: 'Slowed enemies slow adjacent enemies',
                cascadeRadius: 1.2,
                damageMultiplier: 2.0,
                slowFactor: 0.3, // 70% slow
            },
            3: {
                ability: 'LOCKDOWN',
                abilityDesc: 'Creates permanent slow zone',
                permanentZone: true,
                damageMultiplier: 3.5,
                slowFactor: 0.2, // 80% slow
            }
        }
    },
    
    DEMOLISHER: {
        id: 'DEMOLISHER',
        name: 'Demolisher',
        description: 'Heavy AoE with armor penetration. Breaks fortifications.',
        
        visual: {
            shape: 'square',
            primaryColor: '#ff8800',
            secondaryColor: '#dd7700',
            icon: '■',
        },
        
        stats: {
            damage: 25,
            fireRate: 4000,      // Very slow
            range: 3.5,
            projectileSpeed: 8,
            splashRadius: 2.5,   // Large AoE
            armorPenetration: 0.8, // Ignores 80% of armor
        },
        
        cost: 140,
        salvageValue: 84,
        
        effectiveness: {
            SWARM: 2.5,      // Strong: AoE destroys clusters
            CHARGER: 0.8,    // Weak: Overkill, hard to land
            FORTRESS: 3.0,   // Strong: Armor penetration
            PHANTOM: 0.5,    // Weak: Can't predict position
            VANGUARD: 1.2,
        },
        
        tiers: {
            1: {
                ability: null,
            },
            2: {
                ability: 'SHRAPNEL',
                abilityDesc: 'Leaves damage-over-time zone',
                dotDamage: 3,
                dotDuration: 3000,
                damageMultiplier: 2.2,
            },
            3: {
                ability: 'DEVASTATION',
                abilityDesc: 'Massive radius, stuns for 1s',
                splashRadius: 4.0,
                stunDuration: 1000,
                damageMultiplier: 4.5,
            }
        }
    },
    
    SENTINEL: {
        id: 'SENTINEL',
        name: 'Sentinel',
        description: 'Rapid fire with focus bonus. Sustained DPS.',
        
        visual: {
            shape: 'circle',
            primaryColor: '#ff4444',
            secondaryColor: '#dd3333',
            icon: '●',
        },
        
        stats: {
            damage: 6,
            fireRate: 400,       // Very fast
            range: 3.0,
            projectileSpeed: 20,
            focusBonus: 0.1,     // +10% damage per consecutive hit
            maxFocusStacks: 10,
        },
        
        cost: 70,
        salvageValue: 42,
        
        effectiveness: {
            SWARM: 0.7,      // Weak: Targets keep changing
            CHARGER: 2.5,    // Strong: Tracks and shreds fast targets
            FORTRESS: 0.3,   // Weak: Can't penetrate armor with low damage
            PHANTOM: 1.8,    // Strong: Fast enough to retarget
            VANGUARD: 1.2,
        },
        
        tiers: {
            1: {
                ability: null,
            },
            2: {
                ability: 'LOCK_ON',
                abilityDesc: 'Focus bonus increased to 15% per hit',
                focusBonus: 0.15,
                damageMultiplier: 2.0,
            },
            3: {
                ability: 'TERMINATOR',
                abilityDesc: 'Instantly kills enemies below 20% HP',
                executionThreshold: 0.2,
                damageMultiplier: 3.8,
            }
        }
    },
    
    ANCHOR: {
        id: 'ANCHOR',
        name: 'Anchor',
        description: 'Baseline versatility. Marks targets for team.',
        
        visual: {
            shape: 'diamond',
            primaryColor: '#888888',
            secondaryColor: '#666666',
            icon: '◆',
        },
        
        stats: {
            damage: 12,
            fireRate: 1200,
            range: 3.0,
            projectileSpeed: 15,
            markDuration: 3000,
            markBonus: 0.15, // Marked targets take +15% damage from all sources
        },
        
        cost: 50,
        salvageValue: 30,
        
        effectiveness: {
            SWARM: 1.0,      // Neutral vs all (by design)
            CHARGER: 1.0,
            FORTRESS: 1.0,
            PHANTOM: 1.0,
            VANGUARD: 1.0,
        },
        
        tiers: {
            1: {
                ability: 'MARK',
                abilityDesc: 'Marks target for +15% team damage',
            },
            2: {
                ability: 'COMMANDER',
                abilityDesc: 'Mark bonus increased to +25%',
                markBonus: 0.25,
                damageMultiplier: 2.0,
            },
            3: {
                ability: 'MASTERMIND',
                abilityDesc: 'Marks spread to nearby enemies',
                markRadius: 1.5,
                damageMultiplier: 3.5,
            }
        }
    }
};

/**
 * ENEMY SYSTEM - Tactical Problems
 * Each enemy is a specific challenge requiring specific solution
 */
const INDIE_ENEMIES = {
    SWARM: {
        id: 'SWARM',
        name: 'Swarm',
        description: 'Many weak units in tight formation',
        
        visual: {
            shape: 'small_circle',
            color: '#66ff66',
            icon: '•',
            scale: 0.7,
        },
        
        stats: {
            hp: 15,
            speed: 0.7,
            armor: 0,
            reward: 8,
        },
        
        behavior: {
            formation: 'CLUSTER',     // Spawns in tight groups
            groupSize: { min: 5, max: 8 },
            spacing: 0.3,             // Very tight
        },
        
        counters: ['DISRUPTOR', 'DEMOLISHER'],
        vulnerableTo: ['DISRUPTOR', 'DEMOLISHER'],
        resistantTo: ['PIERCER', 'SENTINEL'],
    },
    
    CHARGER: {
        id: 'CHARGER',
        name: 'Charger',
        description: 'Fast striker that sprints and retreats',
        
        visual: {
            shape: 'elongated_triangle',
            color: '#ff6666',
            icon: '▶',
            scale: 1.0,
        },
        
        stats: {
            hp: 35,
            speed: 1.5,
            armor: 0,
            reward: 25,
        },
        
        behavior: {
            pattern: 'SPRINT_RETREAT',
            sprintDuration: 2000,     // Sprint for 2s
            sprintSpeed: 2.5,
            retreatDuration: 1500,    // Retreat for 1.5s
            retreatSpeed: 0.8,
            retreatDistance: 2.0,
        },
        
        counters: ['SENTINEL', 'PIERCER'],
        vulnerableTo: ['SENTINEL', 'PIERCER'],
        resistantTo: ['DEMOLISHER', 'DISRUPTOR'],
    },
    
    FORTRESS: {
        id: 'FORTRESS',
        name: 'Fortress',
        description: 'Heavily armored vanguard',
        
        visual: {
            shape: 'thick_square',
            color: '#888888',
            icon: '▪',
            scale: 1.4,
        },
        
        stats: {
            hp: 80,
            speed: 0.4,
            armor: 20,            // Flat damage reduction
            reward: 40,
        },
        
        behavior: {
            pattern: 'STEADFAST',
            formation: 'SHIELD_WALL', // Protects units behind
            protectionRadius: 2.0,
        },
        
        counters: ['DEMOLISHER'],
        vulnerableTo: ['DEMOLISHER'],
        resistantTo: ['SENTINEL', 'ANCHOR', 'PIERCER'],
    },
    
    PHANTOM: {
        id: 'PHANTOM',
        name: 'Phantom',
        description: 'Teleporting infiltrator',
        
        visual: {
            shape: 'ghostly_circle',
            color: '#aa88ff',
            icon: '◯',
            scale: 1.0,
        },
        
        stats: {
            hp: 25,
            speed: 1.0,
            armor: 0,
            reward: 35,
        },
        
        behavior: {
            pattern: 'PHASE_SHIFT',
            teleportInterval: 4000,   // Teleports every 4s
            teleportDistance: 3.0,    // Forward 3 cells
            invulnerableAfterTeleport: 500, // 0.5s immune
        },
        
        counters: ['DISRUPTOR', 'PIERCER'],
        vulnerableTo: ['DISRUPTOR', 'PIERCER'],
        resistantTo: ['DEMOLISHER'],
    },
    
    VANGUARD: {
        id: 'VANGUARD',
        name: 'Vanguard',
        description: 'Baseline threat. Tests overall defense.',
        
        visual: {
            shape: 'regular_circle',
            color: '#ffaa66',
            icon: '○',
            scale: 1.0,
        },
        
        stats: {
            hp: 30,
            speed: 0.6,
            armor: 5,
            reward: 15,
        },
        
        behavior: {
            pattern: 'STEADY',
            formation: 'LOOSE_LINE',
        },
        
        counters: [], // Baseline - any tower works
        vulnerableTo: [],
        resistantTo: [],
    }
};

/**
 * WAVE SYSTEM - Deterministic Authored Challenges
 * No randomness. Each wave is a designed puzzle.
 */
const INDIE_WAVES = [
    // Tutorial Phase - Introduce Each Enemy Type
    {
        id: 1,
        name: 'First Contact',
        composition: [
            { type: 'VANGUARD', count: 3, lane: 'center', delay: 0 }
        ],
        tutorialHint: 'Place ANCHOR towers to establish baseline defense',
    },
    
    {
        id: 2,
        name: 'The Swarm',
        composition: [
            { type: 'SWARM', count: 8, lane: 'left', delay: 0 }
        ],
        tutorialHint: 'SWARM requires area damage. Use DISRUPTOR or DEMOLISHER',
    },
    
    {
        id: 3,
        name: 'Fast Strike',
        composition: [
            { type: 'CHARGER', count: 2, lane: 'right', delay: 0 },
            { type: 'CHARGER', count: 2, lane: 'center', delay: 3000 }
        ],
        tutorialHint: 'SENTINEL locks onto fast targets with focus fire',
    },
    
    {
        id: 4,
        name: 'Shield Wall',
        composition: [
            { type: 'FORTRESS', count: 1, lane: 'center', delay: 0 },
            { type: 'VANGUARD', count: 3, lane: 'center', delay: 1000 }
        ],
        tutorialHint: 'FORTRESS armor blocks low damage. Use DEMOLISHER',
    },
    
    {
        id: 5,
        name: 'Phase Shift',
        composition: [
            { type: 'PHANTOM', count: 3, lane: 'varied', delay: 0 }
        ],
        tutorialHint: 'DISRUPTOR prevents teleport. PIERCER can predict lines',
    },
    
    // Combination Phase - Multi-Type Challenges
    {
        id: 6,
        name: 'Armored Swarm',
        composition: [
            { type: 'FORTRESS', count: 1, lane: 'center', delay: 0 },
            { type: 'SWARM', count: 12, lane: 'flanks', delay: 2000 }
        ],
        solution: 'DEMOLISHER on FORTRESS, then AoE on SWARM',
    },
    
    {
        id: 7,
        name: 'Blitz Protocol',
        composition: [
            { type: 'CHARGER', count: 4, lane: 'spread', delay: 0 },
            { type: 'PHANTOM', count: 2, lane: 'center', delay: 3000 }
        ],
        solution: 'SENTINEL for CHARGER, DISRUPTOR to lock PHANTOM',
    },
    
    {
        id: 8,
        name: 'Fortress Line',
        composition: [
            { type: 'FORTRESS', count: 2, lane: 'left', delay: 0 },
            { type: 'FORTRESS', count: 2, lane: 'right', delay: 2000 },
            { type: 'VANGUARD', count: 6, lane: 'center', delay: 4000 }
        ],
        solution: 'Multiple DEMOLISHER or high-tier PIERCER',
    },
    
    {
        id: 9,
        name: 'Chaos Pattern',
        composition: [
            { type: 'SWARM', count: 6, lane: 'left', delay: 0 },
            { type: 'CHARGER', count: 2, lane: 'right', delay: 2000 },
            { type: 'PHANTOM', count: 2, lane: 'center', delay: 4000 }
        ],
        solution: 'Diverse tower types required',
    },
    
    {
        id: 10,
        name: 'The Gauntlet',
        composition: [
            { type: 'FORTRESS', count: 1, lane: 'center', delay: 0 },
            { type: 'SWARM', count: 10, lane: 'flanks', delay: 2000 },
            { type: 'CHARGER', count: 3, lane: 'center', delay: 4000 },
            { type: 'PHANTOM', count: 2, lane: 'varied', delay: 6000 }
        ],
        solution: 'Ultimate test of tower synergy and positioning',
    }
];

/**
 * RESOURCE SYSTEM - Tension Through Scarcity
 */
const INDIE_ECONOMY = {
    // No passive generation - every coin is earned
    PASSIVE_INCOME: 0,
    
    // Bounty multipliers based on execution quality
    BOUNTY_MULTIPLIERS: {
        OVERKILL: 0.5,       // Wasted >150% HP damage
        NORMAL: 1.0,         // Standard kill
        OPTIMAL: 1.5,        // Killed with <20% damage waste
        COUNTER: 1.8,        // Killed with effective tower type
    },
    
    // Salvage system for repositioning
    SALVAGE_RATE: 0.6,       // Get 60% of cost back
    
    // Risk/reward system
    RESERVE_BONUS: {
        waves: 3,            // Hold resources for 3 waves
        multiplier: 1.2,     // Get +20% bonus
    },
};

/**
 * PROGRESSION SYSTEM - Horizontal Unlocks
 */
const INDIE_PROGRESSION = {
    // No grinding, no daily rewards
    // Progression through mastery and choice
    
    SCENARIOS: [
        {
            id: 1,
            name: 'Tutorial',
            waves: [1, 2, 3, 4, 5],
            restrictions: null,
            unlocks: ['SCENARIO_2']
        },
        {
            id: 2,
            name: 'Combinations',
            waves: [6, 7, 8, 9, 10],
            restrictions: null,
            unlocks: ['SCENARIO_3', 'SCENARIO_4']
        },
        // More scenarios defined elsewhere...
    ],
    
    DOCTRINES: {
        AGGRESSIVE: {
            name: 'Aggressive Doctrine',
            effect: 'Tower damage +30%, cost +20%',
            disabledTowers: ['ANCHOR', 'DISRUPTOR'],
        },
        DEFENSIVE: {
            name: 'Defensive Doctrine',
            effect: 'Tower range +1, fire rate -20%',
            disabledTowers: ['SENTINEL', 'DEMOLISHER'],
        },
        ECONOMIC: {
            name: 'Economic Doctrine',
            effect: 'Bounties +40%, tower cost +10%',
            disabledTowers: ['PIERCER'],
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        INDIE_CONFIG,
        INDIE_TOWERS,
        INDIE_ENEMIES,
        INDIE_WAVES,
        INDIE_ECONOMY,
        INDIE_PROGRESSION
    };
}
