/**
 * Enemy Type Configurations
 * Production-ready enemy definitions following design document
 */

// ============================================================================
// FRONTLINE ENEMIES
// ============================================================================

const ENEMY_GRUNT = {
    type: 'grunt',
    threatLevel: 1,
    reward: 4,
    
    movement: {
        speed: 0.6,
        canChangeColumn: false
    },
    
    combat: {
        hp: 15,
        armor: 0,
        dodgeChance: 0,
        ccResistance: 0,
        resistances: {}
    },
    
    animation: {
        animations: {
            idle: { sprite: '🧟', frames: 1, fps: 1 },
            move: { sprite: '🧟', frames: 2, fps: 4 },
            hit: { sprite: '🧟', frames: 1, duration: 0.2 },
            death: { sprite: '💀', frames: 1, duration: 1.0 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            idle: {
                transitions: ['move']
            },
            move: {
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 200,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 1000,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🧟',
        scale: 1.0,
        colorPrimary: '#3a4a3a',
        colorSecondary: '#2d3a2d'
    }
};

const ENEMY_RUSHER = {
    type: 'rusher',
    threatLevel: 2,
    reward: 5,
    
    movement: {
        speed: 1.8,
        canChangeColumn: false
    },
    
    combat: {
        hp: 8,
        armor: 0,
        dodgeChance: 0,
        ccResistance: 0,
        resistances: {}
    },
    
    animation: {
        animations: {
            idle: { sprite: '🧟‍♂️', frames: 1, fps: 1 },
            move: { sprite: '🧟‍♂️', frames: 4, fps: 8 },
            hit: { sprite: '🧟‍♂️', frames: 1, duration: 0.15 },
            death: { sprite: '💀', frames: 1, duration: 0.8 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 150,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 800,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🧟‍♂️',
        scale: 0.9,
        colorPrimary: '#d4a834',
        colorSecondary: '#f4c844'
    }
};

const ENEMY_BRAWLER = {
    type: 'brawler',
    threatLevel: 2,
    reward: 12,
    
    movement: {
        speed: 0.35,
        canChangeColumn: false
    },
    
    combat: {
        hp: 60,
        armor: 3,
        dodgeChance: 0,
        ccResistance: 0.2,
        resistances: {}
    },
    
    animation: {
        animations: {
            idle: { sprite: '🧟‍♀️', frames: 1, fps: 1 },
            move: { sprite: '🧟‍♀️', frames: 2, fps: 2 },
            hit: { sprite: '🧟‍♀️', frames: 1, duration: 0.3 },
            death: { sprite: '💀', frames: 1, duration: 1.5 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 300,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 1500,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🧟‍♀️',
        scale: 1.3,
        colorPrimary: '#5a2020',
        colorSecondary: '#3a1010'
    }
};

// ============================================================================
// TACTICAL ENEMIES
// ============================================================================

const ENEMY_FLANKER = {
    type: 'flanker',
    threatLevel: 2,
    reward: 8,
    
    movement: {
        speed: 0.9,
        canChangeColumn: true,
        columnChangeCooldown: 3000
    },
    
    combat: {
        hp: 20,
        armor: 0,
        dodgeChance: 0,
        ccResistance: 0,
        resistances: {}
    },
    
    ai: {
        behaviorType: 'flanker',
        perceptionRadius: 6,
        updateInterval: 300
    },
    
    animation: {
        animations: {
            idle: { sprite: '🏃', frames: 1, fps: 1 },
            move: { sprite: '🏃', frames: 4, fps: 6 },
            evade: { sprite: '🤸', frames: 1, duration: 0.4 },
            hit: { sprite: '🏃', frames: 1, duration: 0.2 },
            death: { sprite: '💀', frames: 1, duration: 1.0 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['evade', 'hit', 'death']
            },
            evade: {
                duration: 400,
                nextState: 'move',
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 200,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 1000,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🏃',
        scale: 1.0,
        colorPrimary: '#8a8a3a',
        colorSecondary: '#6a6a2a'
    }
};

const ENEMY_SABOTEUR = {
    type: 'saboteur',
    threatLevel: 3,
    reward: 10,
    
    movement: {
        speed: 0.7,
        canChangeColumn: false
    },
    
    combat: {
        hp: 12,
        armor: 0,
        dodgeChance: 0,
        ccResistance: 0,
        resistances: {}
    },
    
    ai: {
        behaviorType: 'saboteur',
        perceptionRadius: 2,
        updateInterval: 500
    },
    
    abilities: {
        disable: {
            duration: 4000,
            range: 2,
            telegraphTime: 1000
        }
    },
    
    animation: {
        animations: {
            idle: { sprite: '🥷', frames: 1, fps: 1 },
            move: { sprite: '🥷', frames: 3, fps: 5 },
            attack: { sprite: '💥', frames: 1, duration: 1.0 },
            hit: { sprite: '🥷', frames: 1, duration: 0.2 },
            death: { sprite: '💀', frames: 1, duration: 1.0 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['attack', 'hit', 'death']
            },
            attack: {
                duration: 1000,
                nextState: 'move',
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 200,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 1000,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🥷',
        scale: 0.95,
        colorPrimary: '#4a3a6a',
        colorSecondary: '#3a2a5a'
    }
};

const ENEMY_SUPPORT = {
    type: 'support',
    threatLevel: 3,
    reward: 15,
    
    movement: {
        speed: 0.4,
        canChangeColumn: false
    },
    
    combat: {
        hp: 25,
        armor: 1,
        dodgeChance: 0,
        ccResistance: 0,
        resistances: {}
    },
    
    ai: {
        behaviorType: 'support',
        perceptionRadius: 3,
        updateInterval: 500
    },
    
    abilities: {
        buffAura: {
            radius: 3,
            speedBonus: 1.3,
            regenBonus: 2,
            duration: 2000,
            tickRate: 1000
        }
    },
    
    animation: {
        animations: {
            idle: { sprite: '🧙', frames: 2, fps: 2 },
            move: { sprite: '🧙', frames: 2, fps: 3 },
            hit: { sprite: '🧙', frames: 1, duration: 0.25 },
            death: { sprite: '💀', frames: 1, duration: 1.2 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 250,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 1200,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🧙',
        scale: 1.1,
        colorPrimary: '#339966',
        colorSecondary: '#228855'
    }
};

// ============================================================================
// ELITE ENEMIES
// ============================================================================

const ENEMY_ASSASSIN = {
    type: 'assassin',
    threatLevel: 4,
    reward: 12,
    
    movement: {
        speed: 2.2,
        canChangeColumn: true,
        columnChangeCooldown: 2000
    },
    
    combat: {
        hp: 10,
        armor: 0,
        dodgeChance: 0.40,
        ccResistance: 0,
        resistances: {}
    },
    
    ai: {
        behaviorType: 'assassin',
        perceptionRadius: 8,
        updateInterval: 200
    },
    
    animation: {
        animations: {
            idle: { sprite: '👤', frames: 1, fps: 1 },
            move: { sprite: '👤', frames: 6, fps: 12 },
            evade: { sprite: '💨', frames: 1, duration: 0.3 },
            hit: { sprite: '👤', frames: 1, duration: 0.15 },
            death: { sprite: '💀', frames: 1, duration: 0.8 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['evade', 'hit', 'death']
            },
            evade: {
                duration: 300,
                nextState: 'move',
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 150,
                nextState: 'move',
                transitions: ['death']
            },
            death: {
                duration: 800,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '👤',
        scale: 0.95,
        colorPrimary: '#1a1a2a',
        colorSecondary: '#0a0a1a'
    }
};

const ENEMY_JUGGERNAUT = {
    type: 'juggernaut',
    threatLevel: 4,
    reward: 20,
    
    movement: {
        speed: 0.25,
        canChangeColumn: false
    },
    
    combat: {
        hp: 120,
        armor: 8,
        dodgeChance: 0,
        ccResistance: 0.75,
        resistances: {}
    },
    
    animation: {
        animations: {
            idle: { sprite: '🛡️', frames: 1, fps: 1 },
            move: { sprite: '🛡️', frames: 2, fps: 2 },
            hit: { sprite: '🛡️', frames: 1, duration: 0.4 },
            enrage: { sprite: '🔥', frames: 4, fps: 8 },
            death: { sprite: '💥', frames: 1, duration: 2.0 }
        }
    },
    
    states: {
        initialState: 'move',
        states: {
            move: {
                transitions: ['hit', 'enrage', 'death'],
                conditions: [
                    { type: 'hp_below', value: 0.25, transitionTo: 'enrage' }
                ]
            },
            hit: {
                duration: 400,
                nextState: 'move',
                transitions: ['enrage', 'death']
            },
            enrage: {
                onEnter: 'onEnrageStart',
                transitions: ['hit', 'death']
            },
            death: {
                duration: 2000,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '🛡️',
        scale: 1.5,
        colorPrimary: '#888888',
        colorSecondary: '#666666'
    }
};

// ============================================================================
// BOSS ENEMIES
// ============================================================================

const ENEMY_OVERLORD = {
    type: 'overlord',
    threatLevel: 5,
    reward: 50,
    isBoss: true,
    
    movement: {
        speed: 0.5,
        canChangeColumn: false
    },
    
    combat: {
        hp: 150,
        armor: 5,
        dodgeChance: 0,
        ccResistance: 0.5,
        resistances: {}
    },
    
    abilities: {
        summon: {
            type: 'grunt',
            count: 2,
            interval: 5000,
            phase: 1
        },
        shield: {
            amount: 50,
            regenTime: 10000,
            phase: 2
        },
        areaAttack: {
            damage: 10,
            radius: 2,
            interval: 3000,
            telegraphTime: 1000,
            phase: 3
        }
    },
    
    animation: {
        animations: {
            idle: { sprite: '👹', frames: 2, fps: 2 },
            move: { sprite: '👹', frames: 3, fps: 3 },
            attack: { sprite: '💢', frames: 4, fps: 4 },
            transition: { sprite: '💥', frames: 1, duration: 2.0 },
            hit: { sprite: '👹', frames: 1, duration: 0.3 },
            death: { sprite: '💀', frames: 1, duration: 3.0 }
        }
    },
    
    states: {
        initialState: 'phase1',
        states: {
            phase1: {
                transitions: ['phase2', 'hit', 'death'],
                conditions: [
                    { type: 'hp_below', value: 0.60, transitionTo: 'transition1' }
                ]
            },
            transition1: {
                duration: 2000,
                nextState: 'phase2',
                transitions: []
            },
            phase2: {
                onEnter: 'onPhase2Start',
                transitions: ['phase3', 'hit', 'death'],
                conditions: [
                    { type: 'hp_below', value: 0.30, transitionTo: 'transition2' }
                ]
            },
            transition2: {
                duration: 2000,
                nextState: 'phase3',
                transitions: []
            },
            phase3: {
                onEnter: 'onPhase3Start',
                transitions: ['hit', 'death']
            },
            hit: {
                duration: 300,
                transitions: ['phase1', 'phase2', 'phase3', 'death']
            },
            death: {
                duration: 3000,
                transitions: []
            }
        }
    },
    
    visual: {
        sprite: '👹',
        scale: 1.8,
        colorPrimary: '#ff0000',
        colorSecondary: '#aa0000'
    }
};

// ============================================================================
// ENEMY FACTORY REGISTRY
// ============================================================================

const ENEMY_CONFIGS = {
    // Frontline
    grunt: ENEMY_GRUNT,
    rusher: ENEMY_RUSHER,
    brawler: ENEMY_BRAWLER,
    
    // Tactical
    flanker: ENEMY_FLANKER,
    saboteur: ENEMY_SABOTEUR,
    support: ENEMY_SUPPORT,
    
    // Elite
    assassin: ENEMY_ASSASSIN,
    juggernaut: ENEMY_JUGGERNAUT,
    
    // Boss
    overlord: ENEMY_OVERLORD
};

// ============================================================================
// WAVE COMPOSITION TEMPLATES
// ============================================================================

const WAVE_TEMPLATES = {
    // Early game waves (1-5)
    basic: [
        { type: 'grunt', count: 5, delay: 0 },
        { type: 'rusher', count: 1, delay: 3000 }
    ],
    
    early_pressure: [
        { type: 'grunt', count: 4, delay: 0 },
        { type: 'brawler', count: 1, delay: 2000 },
        { type: 'rusher', count: 2, delay: 4000 }
    ],
    
    // Mid game waves (6-12)
    flanking_assault: [
        { type: 'brawler', count: 2, delay: 0 },
        { type: 'flanker', count: 2, delay: 2000 },
        { type: 'grunt', count: 3, delay: 3000 }
    ],
    
    tactical_squad: [
        { type: 'grunt', count: 4, delay: 0 },
        { type: 'support', count: 1, delay: 1000 },
        { type: 'saboteur', count: 1, delay: 3000 },
        { type: 'rusher', count: 2, delay: 5000 }
    ],
    
    disruption: [
        { type: 'brawler', count: 1, delay: 0 },
        { type: 'saboteur', count: 2, delay: 2000 },
        { type: 'flanker', count: 2, delay: 4000 }
    ],
    
    // Late game waves (13+)
    elite_assault: [
        { type: 'juggernaut', count: 1, delay: 0 },
        { type: 'assassin', count: 2, delay: 3000 },
        { type: 'support', count: 1, delay: 4000 },
        { type: 'grunt', count: 4, delay: 5000 }
    ],
    
    swarm: [
        { type: 'rusher', count: 8, delay: 0 },
        { type: 'support', count: 2, delay: 2000 },
        { type: 'brawler', count: 2, delay: 4000 }
    ],
    
    assassination_squad: [
        { type: 'assassin', count: 3, delay: 0 },
        { type: 'support', count: 1, delay: 1000 },
        { type: 'saboteur', count: 2, delay: 3000 }
    ],
    
    // Boss waves (every 5 waves)
    boss_wave: [
        { type: 'overlord', count: 1, delay: 0 }
        // Overlord summons its own adds
    ]
};

// ============================================================================
// WAVE PROGRESSION SYSTEM
// ============================================================================

function generateWaveComposition(waveNumber) {
    // Boss waves every 5 waves
    if (waveNumber % 5 === 0 && waveNumber >= 5) {
        return WAVE_TEMPLATES.boss_wave;
    }
    
    // Early game
    if (waveNumber <= 5) {
        return waveNumber % 2 === 0 ? 
            WAVE_TEMPLATES.basic : 
            WAVE_TEMPLATES.early_pressure;
    }
    
    // Mid game
    if (waveNumber <= 12) {
        const templates = [
            WAVE_TEMPLATES.flanking_assault,
            WAVE_TEMPLATES.tactical_squad,
            WAVE_TEMPLATES.disruption
        ];
        return templates[(waveNumber - 6) % templates.length];
    }
    
    // Late game
    const templates = [
        WAVE_TEMPLATES.elite_assault,
        WAVE_TEMPLATES.swarm,
        WAVE_TEMPLATES.assassination_squad
    ];
    return templates[(waveNumber - 13) % templates.length];
}

function applyWaveScaling(config, waveNumber) {
    const scaled = JSON.parse(JSON.stringify(config)); // Deep clone
    
    // HP scaling
    const hpMultiplier = 1.0 + (waveNumber - 1) * 0.15;
    scaled.combat.hp = Math.floor(scaled.combat.hp * hpMultiplier);
    
    // Speed scaling (capped)
    const speedMultiplier = Math.min(1.5, 1.0 + (waveNumber - 1) * 0.05);
    scaled.movement.speed *= speedMultiplier;
    
    // Reward scaling
    scaled.reward = Math.floor(scaled.reward * (1.0 + (waveNumber - 1) * 0.1));
    
    return scaled;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ENEMY_CONFIGS,
        WAVE_TEMPLATES,
        generateWaveComposition,
        applyWaveScaling
    };
}
