# Implementation Roadmap

## Overview
This document outlines the concrete steps to transform merge-tower-defense from casual prototype to serious indie game.

## Phase 1: Core System Refactor

### 1.1 Configuration System Migration

**Goal**: Replace hard-coded values with data-driven config

**Files to Modify**:
- `js/config.js` → Keep for backward compatibility, but deprecated
- `js/config-indie.js` → New canonical config (created)
- `js/game.js` → Update to read from INDIE_CONFIG
- `js/entities.js` → Update Cannon and Zombie classes

**Changes**:
```javascript
// OLD (config.js)
BASIC: {
    cost: 20,
    damage: 3,
    // ... with emojis
}

// NEW (config-indie.js)
ANCHOR: {
    cost: 50,
    stats: {
        damage: 12,
        // ...
    },
    effectiveness: { /* matrix */ },
    tiers: { /* merge evolution */ }
}
```

**Actions**:
1. Create feature flag: `USE_INDIE_MODE` (default: true)
2. Update entity constructors to check flag
3. Migrate calculations to use effectiveness matrix
4. Remove all emoji references when indie mode enabled

### 1.2 Tower System Refactor

**Goal**: Implement 5 specialized towers with hard counters

**Current State**: 7 generalist towers (BASIC, RAPID, SNIPER, SPLASH, FREEZE, LASER, ELECTRIC)

**Target State**: 5 specialist towers (PIERCER, DISRUPTOR, DEMOLISHER, SENTINEL, ANCHOR)

**Files to Create/Modify**:
- `js/systems/tower-system.js` (new)
- `js/sprites/towers/` (update all)
- `js/entities.js` (refactor Cannon class)

**New Cannon Class Structure**:
```javascript
class IndieCannon {
    constructor(col, row, type, tier = 1) {
        this.col = col;
        this.row = row;
        this.type = type;
        this.tier = tier;
        
        this.loadConfig();
        this.initAbilities();
    }
    
    loadConfig() {
        const config = INDIE_TOWERS[this.type];
        const tierData = config.tiers[this.tier];
        
        // Apply base stats
        this.damage = config.stats.damage * (tierData.damageMultiplier || 1);
        this.fireRate = config.stats.fireRate;
        // ... etc
        
        // Apply tier abilities
        this.ability = tierData.ability;
    }
    
    calculateDamage(target) {
        const effectiveness = INDIE_TOWERS[this.type].effectiveness[target.type];
        let damage = this.damage * effectiveness;
        
        // Apply ability modifiers
        if (this.ability === 'EXECUTION' && target.hp < target.maxHp * 0.3) {
            damage = target.hp; // Instant kill
        }
        
        // Apply mark bonus if target is marked
        if (target.marked) {
            damage *= (1 + target.markBonus);
        }
        
        return damage;
    }
}
```

**Migration Path**:
1. Add indie mode detection in Cannon constructor
2. If indie mode: use IndieCannon logic
3. If classic mode: use existing logic
4. Test both modes work

### 1.3 Enemy System Refactor

**Goal**: Transform enemies from HP bags to tactical problems

**Current State**: 10+ enemy types with varying stats, some abilities

**Target State**: 5 distinct enemy types, each a specific problem

**Files to Modify**:
- `js/entities.js` (Zombie class)
- `js/enemy-components.js` (behavioral systems)
- `js/enemy-configs.js` (update to indie configs)

**New Zombie Behavior System**:
```javascript
class IndieEnemy {
    constructor(col, type) {
        this.col = col;
        this.row = -1;
        this.type = type;
        
        this.loadConfig();
        this.initBehavior();
    }
    
    loadConfig() {
        const config = INDIE_ENEMIES[this.type];
        this.hp = config.stats.hp;
        this.maxHp = config.stats.hp;
        this.speed = config.stats.speed;
        this.armor = config.stats.armor;
        this.reward = config.stats.reward;
        
        this.behavior = config.behavior;
    }
    
    initBehavior() {
        switch(this.behavior.pattern) {
            case 'SPRINT_RETREAT':
                this.behavior.state = 'SPRINT';
                this.behavior.stateStartTime = performance.now();
                break;
            case 'PHASE_SHIFT':
                this.behavior.lastTeleport = 0;
                break;
            // ... etc
        }
    }
    
    update(dt, currentTime) {
        // Execute behavior pattern
        switch(this.behavior.pattern) {
            case 'SPRINT_RETREAT':
                this.updateSprintRetreat(dt, currentTime);
                break;
            case 'PHASE_SHIFT':
                this.updatePhaseShift(dt, currentTime);
                break;
            default:
                this.updateSteady(dt);
        }
    }
    
    updateSprintRetreat(dt, currentTime) {
        const elapsed = currentTime - this.behavior.stateStartTime;
        
        if (this.behavior.state === 'SPRINT') {
            this.currentSpeed = this.behavior.sprintSpeed;
            
            if (elapsed >= this.behavior.sprintDuration) {
                this.behavior.state = 'RETREAT';
                this.behavior.stateStartTime = currentTime;
                this.behavior.retreatTargetRow = this.row - this.behavior.retreatDistance;
            }
        } else if (this.behavior.state === 'RETREAT') {
            this.currentSpeed = -this.behavior.retreatSpeed;
            
            if (this.row <= this.behavior.retreatTargetRow || 
                elapsed >= this.behavior.retreatDuration) {
                this.behavior.state = 'SPRINT';
                this.behavior.stateStartTime = currentTime;
            }
        }
        
        this.row += this.currentSpeed * dt;
    }
    
    takeDamage(amount, source) {
        // Apply armor reduction
        const actualDamage = Math.max(1, amount - this.armor);
        this.hp -= actualDamage;
        
        return actualDamage;
    }
}
```

### 1.4 Wave System Refactor

**Goal**: Replace random spawns with authored deterministic waves

**Current State**: Weighted random zombie selection, scaling by wave number

**Target State**: Pre-designed wave compositions from INDIE_WAVES array

**Files to Modify**:
- `js/game.js` (wave management)
- Create `js/systems/wave-director.js`

**New Wave Director**:
```javascript
class WaveDirector {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentWave = null;
        this.spawnQueue = [];
        this.waveNumber = 0;
    }
    
    startWave(waveNumber) {
        this.waveNumber = waveNumber;
        const waveData = INDIE_WAVES[waveNumber - 1];
        
        if (!waveData) {
            console.error('No wave data for wave', waveNumber);
            return;
        }
        
        this.currentWave = waveData;
        this.buildSpawnQueue(waveData);
    }
    
    buildSpawnQueue(waveData) {
        this.spawnQueue = [];
        
        waveData.composition.forEach(group => {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({
                    type: group.type,
                    lane: this.determineLane(group.lane, i, group.count),
                    spawnTime: group.delay + (i * 600) // Stagger spawns
                });
            }
        });
        
        // Sort by spawn time
        this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
    }
    
    determineLane(laneSpec, index, total) {
        switch(laneSpec) {
            case 'center':
                return Math.floor(CONFIG.COLS / 2);
            case 'left':
                return Math.floor(CONFIG.COLS / 4);
            case 'right':
                return Math.floor(CONFIG.COLS * 3 / 4);
            case 'flanks':
                return index % 2 === 0 ? 
                    Math.floor(CONFIG.COLS / 4) : 
                    Math.floor(CONFIG.COLS * 3 / 4);
            case 'spread':
                return Math.floor((index / total) * CONFIG.COLS);
            case 'varied':
                return Utils.randomInt(0, CONFIG.COLS - 1);
            default:
                return Math.floor(CONFIG.COLS / 2);
        }
    }
    
    update(dt, currentTime, waveStartTime) {
        const elapsed = currentTime - waveStartTime;
        
        // Spawn enemies when their time comes
        while (this.spawnQueue.length > 0 && 
               this.spawnQueue[0].spawnTime <= elapsed) {
            const spawn = this.spawnQueue.shift();
            this.gameState.entities.addEnemy(spawn.lane, spawn.type);
        }
        
        return this.spawnQueue.length === 0; // Wave complete when queue empty
    }
}
```

### 1.5 Combat System Refactor

**Goal**: Implement effectiveness matrix and ability system

**Files to Modify**:
- `js/game.js` (checkProjectileCollisions, damageZombie)
- Create `js/systems/combat-system.js`

**New Combat Calculation**:
```javascript
class CombatSystem {
    static calculateDamage(tower, enemy, projectile) {
        // Base damage from tower stats
        let damage = tower.damage;
        
        // Apply effectiveness multiplier
        const effectiveness = INDIE_TOWERS[tower.type].effectiveness[enemy.type];
        damage *= effectiveness;
        
        // Apply tier abilities
        damage = this.applyTowerAbilities(tower, enemy, damage);
        
        // Apply enemy armor
        if (tower.type === 'DEMOLISHER') {
            // Demolisher ignores armor
            const armorPenetration = tower.armorPenetration || 0.8;
            damage -= (enemy.armor * (1 - armorPenetration));
        } else {
            damage -= enemy.armor;
        }
        
        // Minimum damage
        damage = Math.max(1, damage);
        
        // Apply mark bonus
        if (enemy.marked) {
            damage *= (1 + enemy.markBonus);
        }
        
        return {
            damage: damage,
            effectiveness: effectiveness,
            wasCritical: effectiveness >= 2.0,
            wasResisted: effectiveness <= 0.6
        };
    }
    
    static applyTowerAbilities(tower, enemy, baseDamage) {
        let damage = baseDamage;
        
        switch(tower.ability) {
            case 'EXECUTION':
                if (enemy.hp < enemy.maxHp * tower.executionThreshold) {
                    damage = enemy.hp; // Instant kill
                }
                break;
                
            case 'LOCK_ON':
                if (tower.lastTarget === enemy.id) {
                    const stacks = Math.min(tower.focusStacks, tower.maxFocusStacks);
                    damage *= (1 + (stacks * tower.focusBonus));
                }
                break;
                
            case 'TERMINATOR':
                if (enemy.hp < enemy.maxHp * tower.executionThreshold) {
                    damage = enemy.hp; // Instant kill
                }
                break;
        }
        
        return damage;
    }
    
    static calculateBounty(enemy, damageResult) {
        let bounty = enemy.reward;
        
        // Apply quality multipliers
        if (damageResult.wasCritical) {
            bounty *= INDIE_ECONOMY.BOUNTY_MULTIPLIERS.COUNTER;
        } else if (damageResult.wasResisted) {
            bounty *= INDIE_ECONOMY.BOUNTY_MULTIPLIERS.OVERKILL;
        } else {
            bounty *= INDIE_ECONOMY.BOUNTY_MULTIPLIERS.NORMAL;
        }
        
        return Math.floor(bounty);
    }
}
```

## Phase 2: Visual Refactor

### 2.1 Remove Casual Aesthetics

**Goal**: Replace emojis with geometric shapes

**Files to Modify**:
- `js/sprites/towers/*.js` (all tower sprites)
- `js/enemy-sprites.js`
- `js/graphics.js` (rendering system)

**Actions**:
1. Create geometric tower renderer
2. Create geometric enemy renderer
3. Add feature flag for visual mode
4. Maintain emoji mode for backward compatibility

**Geometric Renderer**:
```javascript
class GeometricRenderer {
    static renderTower(ctx, tower, x, y, size) {
        const visual = INDIE_TOWERS[tower.type].visual;
        
        ctx.save();
        ctx.translate(x, y);
        
        // Tier indicator (size scaling)
        const scale = 1 + (tower.tier - 1) * 0.2;
        
        switch(visual.shape) {
            case 'triangle':
                this.drawTriangle(ctx, size * scale, visual.primaryColor);
                break;
            case 'hexagon':
                this.drawHexagon(ctx, size * scale, visual.primaryColor);
                break;
            case 'square':
                this.drawSquare(ctx, size * scale, visual.primaryColor);
                break;
            case 'circle':
                this.drawCircle(ctx, size * scale, visual.primaryColor);
                break;
            case 'diamond':
                this.drawDiamond(ctx, size * scale, visual.primaryColor);
                break;
        }
        
        // Range indicator (when selected)
        if (tower.selected) {
            this.drawRange(ctx, tower.range, size);
        }
        
        ctx.restore();
    }
    
    static drawTriangle(ctx, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Stroke for definition
        ctx.strokeStyle = this.adjustBrightness(color, -20);
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    static drawHexagon(ctx, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = Math.cos(angle) * size / 2;
            const y = Math.sin(angle) * size / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.adjustBrightness(color, -20);
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // ... similar for other shapes
    
    static drawRange(ctx, range, cellSize) {
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, range * cellSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
```

### 2.2 Clean UI

**Goal**: Remove casual elements, create information-dense interface

**Files to Modify**:
- `js/ui.js`
- `index.html` (minimal changes)

**Changes**:
- Remove: Emoji buttons, flashy colors, decorative elements
- Add: Tower effectiveness indicators, range previews, clear cost/benefit display
- Update: Clean monospace font, high contrast, grid-based layout

### 2.3 Feedback System

**Goal**: Replace "+100 💰" with clear, functional feedback

**Files to Modify**:
- `js/particles.js`

**New Feedback**:
```javascript
class FunctionalFeedback {
    static showDamage(x, y, damage, effectiveness) {
        // Color-code by effectiveness
        let color;
        if (effectiveness >= 2.0) color = '#00ff88'; // Effective
        else if (effectiveness <= 0.6) color = '#888888'; // Resisted
        else color = '#ffffff'; // Normal
        
        // Show numeric damage only
        return {
            text: Math.floor(damage).toString(),
            x: x,
            y: y,
            color: color,
            life: 0.8,
            scale: effectiveness >= 2.0 ? 1.3 : 1.0
        };
    }
    
    static showBounty(x, y, amount, quality) {
        // Simple numeric bounty with quality indicator
        const prefix = quality === 'COUNTER' ? '+' : '';
        return {
            text: prefix + amount,
            x: x,
            y: y,
            color: quality === 'COUNTER' ? '#ffaa00' : '#ffffff',
            life: 1.0
        };
    }
}
```

## Phase 3: Systems Integration

### 3.1 Economy System

**Goal**: Implement bounty quality and salvage system

**Files to Create**:
- `js/systems/economy-system.js`

### 3.2 Progression System

**Goal**: Implement scenario and doctrine systems

**Files to Create**:
- `js/systems/scenario-manager.js`
- `js/systems/unlock-system.js`

### 3.3 Merge System Update

**Goal**: Implement tier-based ability unlocks

**Files to Modify**:
- `js/game.js` (merge logic)

## Phase 4: Testing & Balance

### 4.1 Test Each Wave
- Verify each wave is solvable with intended strategy
- Ensure no dominant strategy exists
- Check resource pacing

### 4.2 Tower Balance
- Test each tower's counter effectiveness
- Verify no tower is universally useful
- Ensure cost matches power

### 4.3 Enemy Balance
- Test each enemy creates meaningful problem
- Verify behavior patterns are readable
- Check reward scaling

## Phase 5: Documentation

### 5.1 Update README
- Rewrite with serious indie positioning
- Remove casual language and emojis
- Add strategic depth description

### 5.2 Create Strategy Guide
- Document tower-enemy counters
- Explain merge tier system
- Provide wave solution hints

### 5.3 Developer Notes
- Document all config files
- Explain design decisions
- Provide extension guidelines

## Backward Compatibility

To maintain compatibility during transition:

```javascript
// Feature flag system
const GAME_MODE = {
    INDIE: 'indie',
    CLASSIC: 'classic'
};

// Detect mode from URL or localStorage
let currentMode = new URLSearchParams(window.location.search).get('mode') || 
                  localStorage.getItem('gameMode') || 
                  GAME_MODE.INDIE;

// Use mode-specific configs
const CONFIG = currentMode === GAME_MODE.INDIE ? INDIE_CONFIG : CLASSIC_CONFIG;
const TOWERS = currentMode === GAME_MODE.INDIE ? INDIE_TOWERS : CANNON_TYPES;
// ... etc
```

## Migration Checklist

- [ ] Create config-indie.js with new configurations
- [ ] Implement feature flag system
- [ ] Refactor Cannon class to support both modes
- [ ] Refactor Zombie class to support behavior patterns
- [ ] Create WaveDirector for deterministic waves
- [ ] Implement CombatSystem with effectiveness matrix
- [ ] Create GeometricRenderer for clean visuals
- [ ] Update UI to remove casual elements
- [ ] Implement bounty quality system
- [ ] Create scenario system
- [ ] Test all 10 initial waves
- [ ] Balance tower costs and effectiveness
- [ ] Update README and documentation
- [ ] Add strategy guide
- [ ] Final polish pass

## Timeline Estimate

- Phase 1 (Core Refactor): 2-3 days
- Phase 2 (Visual): 1-2 days
- Phase 3 (Systems): 1-2 days
- Phase 4 (Testing): 2-3 days
- Phase 5 (Docs): 1 day

Total: ~1-2 weeks for complete transformation
