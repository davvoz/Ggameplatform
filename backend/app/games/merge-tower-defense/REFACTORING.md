# Code Refactoring Examples

This document shows concrete before/after code examples for transforming the codebase.

## Example 1: Tower Damage Calculation

### Before (Casual - config.js + game.js)

```javascript
// config.js
CANNON_TYPES = {
    BASIC: {
        damage: 3,
        fireRate: 1500,
        icon: '🔫',
        effectiveness: { HEALER: 1.0, SHIELDED: 0.8 }
    }
}

// game.js - damageZombie()
damageZombie(zombie, proj, currentTime) {
    const cannonType = proj.cannonType || 'BASIC';
    const cannonConfig = CANNON_TYPES[cannonType];
    const effectiveness = (cannonConfig.effectiveness && 
                          cannonConfig.effectiveness[zombie.type]) || 1.0;
    
    const baseDamage = proj.damage * effectiveness;
    const actualDamage = zombie.takeDamage(baseDamage, currentTime);
    
    // Visual feedback with emoji
    if (effectiveness >= 1.5) {
        this.particles.createDamageNumber(zombie.col, zombie.row, 
                                         actualDamage, '#00ff00'); // Green
    } else {
        this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage);
    }
}
```

### After (Indie Serious - config-indie.js + combat-system.js)

```javascript
// config-indie.js
INDIE_TOWERS = {
    ANCHOR: {
        stats: { damage: 12, fireRate: 1200 },
        visual: { shape: 'diamond', primaryColor: '#888888', icon: '◆' },
        effectiveness: {
            SWARM: 1.0,
            CHARGER: 1.0,
            FORTRESS: 1.0,
            PHANTOM: 1.0,
            VANGUARD: 1.0
        }
    }
}

// systems/combat-system.js
class CombatSystem {
    static applyDamage(tower, enemy, projectile, gameState) {
        // Calculate base damage with effectiveness
        const config = INDIE_TOWERS[tower.type];
        const effectiveness = config.effectiveness[enemy.type];
        
        let damage = tower.damage * effectiveness;
        
        // Apply tier abilities
        if (tower.ability === 'EXECUTION' && 
            enemy.hp < enemy.maxHp * tower.executionThreshold) {
            damage = enemy.hp; // Instant kill
        }
        
        // Apply mark bonus if present
        if (enemy.marked) {
            damage *= (1 + enemy.markBonus);
        }
        
        // Apply armor
        if (tower.type === 'DEMOLISHER') {
            const armorPen = tower.armorPenetration || 0.8;
            damage -= (enemy.armor * (1 - armorPen));
        } else {
            damage -= enemy.armor;
        }
        
        damage = Math.max(1, Math.floor(damage));
        
        // Apply damage
        enemy.hp -= damage;
        
        // Calculate bounty quality
        const bounty = this.calculateBounty(enemy, effectiveness, damage);
        
        // Visual feedback (no emojis, color-coded by effectiveness)
        const feedbackColor = effectiveness >= 2.0 ? '#00ff88' :
                             effectiveness <= 0.6 ? '#888888' : '#ffffff';
        
        gameState.particles.createDamageNumber(
            enemy.col, enemy.row, damage, feedbackColor
        );
        
        return { damage, effectiveness, bounty };
    }
    
    static calculateBounty(enemy, effectiveness, damageDealt) {
        let multiplier = INDIE_ECONOMY.BOUNTY_MULTIPLIERS.NORMAL;
        
        // Check for optimal kill (minimal overkill)
        const overkill = Math.max(0, damageDealt - enemy.hp);
        const overkillPercent = overkill / enemy.maxHp;
        
        if (overkillPercent > 1.5) {
            multiplier = INDIE_ECONOMY.BOUNTY_MULTIPLIERS.OVERKILL;
        } else if (overkillPercent < 0.2 && effectiveness >= 2.0) {
            multiplier = INDIE_ECONOMY.BOUNTY_MULTIPLIERS.COUNTER;
        } else if (overkillPercent < 0.2) {
            multiplier = INDIE_ECONOMY.BOUNTY_MULTIPLIERS.OPTIMAL;
        }
        
        return Math.floor(enemy.reward * multiplier);
    }
}
```

**Key Changes**:
1. No emojis in config or feedback
2. Effectiveness explicitly calculated and used
3. Bounty quality system rewards optimal play
4. Modular combat system, not inline in game.js
5. Color-coded feedback based on effectiveness

## Example 2: Enemy Behavior

### Before (Casual - entities.js)

```javascript
// entities.js - Zombie class
class Zombie {
    constructor(col, type, wave) {
        this.col = col;
        this.row = -1;
        this.type = type;
        
        const typeData = ZOMBIE_TYPES[type];
        this.hp = typeData.hp;
        this.speed = typeData.speed;
        this.icon = typeData.icon; // 🧟 emoji
        
        // Simple speed scaling
        if (wave > 5) {
            this.hp *= (1 + (wave - 5) * 0.1);
        }
    }
    
    update(dt) {
        // Simple linear movement
        this.row += this.speed * dt;
    }
}
```

### After (Indie Serious - systems/enemy-system.js)

```javascript
// systems/enemy-system.js
class IndieEnemy {
    constructor(col, type, waveNumber) {
        this.col = col;
        this.row = -1;
        this.type = type;
        this.id = Utils.generateID();
        
        this.loadConfig(type);
        this.initBehavior();
    }
    
    loadConfig(type) {
        const config = INDIE_ENEMIES[type];
        
        // Base stats
        this.hp = config.stats.hp;
        this.maxHp = config.stats.hp;
        this.baseSpeed = config.stats.speed;
        this.currentSpeed = this.baseSpeed;
        this.armor = config.stats.armor;
        this.reward = config.stats.reward;
        
        // Visual (geometric, no emoji)
        this.visual = config.visual;
        
        // Behavior pattern
        this.behaviorPattern = config.behavior.pattern;
        this.behaviorData = config.behavior;
    }
    
    initBehavior() {
        switch(this.behaviorPattern) {
            case 'SPRINT_RETREAT':
                this.behavior = {
                    state: 'SPRINT',
                    stateStartTime: 0,
                    retreatTargetRow: 0
                };
                break;
                
            case 'PHASE_SHIFT':
                this.behavior = {
                    lastTeleport: 0,
                    canTeleport: true
                };
                break;
                
            case 'SHIELD_WALL':
                this.behavior = {
                    shieldActive: true
                };
                break;
                
            default:
                this.behavior = {};
        }
    }
    
    update(dt, currentTime, gameState) {
        // Execute behavior pattern
        switch(this.behaviorPattern) {
            case 'SPRINT_RETREAT':
                this.updateSprintRetreat(dt, currentTime);
                break;
            case 'PHASE_SHIFT':
                this.updatePhaseShift(dt, currentTime, gameState);
                break;
            case 'STEADFAST':
            default:
                this.updateSteady(dt);
                break;
        }
        
        // Update position
        this.row += this.currentSpeed * dt;
    }
    
    updateSprintRetreat(dt, currentTime) {
        if (this.behavior.stateStartTime === 0) {
            this.behavior.stateStartTime = currentTime;
        }
        
        const elapsed = currentTime - this.behavior.stateStartTime;
        
        if (this.behavior.state === 'SPRINT') {
            this.currentSpeed = this.behaviorData.sprintSpeed;
            
            if (elapsed >= this.behaviorData.sprintDuration) {
                // Switch to retreat
                this.behavior.state = 'RETREAT';
                this.behavior.stateStartTime = currentTime;
                this.behavior.retreatTargetRow = this.row - this.behaviorData.retreatDistance;
            }
        } else if (this.behavior.state === 'RETREAT') {
            this.currentSpeed = -this.behaviorData.retreatSpeed;
            
            if (this.row <= this.behavior.retreatTargetRow || 
                elapsed >= this.behaviorData.retreatDuration) {
                // Switch back to sprint
                this.behavior.state = 'SPRINT';
                this.behavior.stateStartTime = currentTime;
            }
        }
    }
    
    updatePhaseShift(dt, currentTime, gameState) {
        this.currentSpeed = this.baseSpeed;
        
        // Check if slowed by DISRUPTOR
        if (this.slowed) {
            this.behavior.canTeleport = false;
        } else {
            this.behavior.canTeleport = true;
        }
        
        // Teleport logic
        if (this.behavior.canTeleport) {
            const timeSinceLastTeleport = currentTime - this.behavior.lastTeleport;
            
            if (timeSinceLastTeleport >= this.behaviorData.teleportInterval) {
                // TELEPORT!
                this.row += this.behaviorData.teleportDistance;
                this.behavior.lastTeleport = currentTime;
                this.invulnerable = true;
                
                // Visual effect
                gameState.particles.createTeleportEffect(this.col, this.row);
                
                // Remove invulnerability after delay
                setTimeout(() => {
                    this.invulnerable = false;
                }, this.behaviorData.invulnerableAfterTeleport);
            }
        }
    }
    
    updateSteady(dt) {
        this.currentSpeed = this.baseSpeed;
    }
    
    takeDamage(amount, sourceType) {
        if (this.invulnerable) return 0;
        
        // Apply armor
        const actualDamage = Math.max(1, amount - this.armor);
        this.hp -= actualDamage;
        
        return actualDamage;
    }
}
```

**Key Changes**:
1. Behavior patterns explicitly defined and modular
2. No emojis, geometric visual data instead
3. Complex behaviors (sprint/retreat, teleport) properly implemented
4. State machines for behavior management
5. Counter-play mechanics built in (DISRUPTOR prevents teleport)

## Example 3: Wave Generation

### Before (Casual - game.js)

```javascript
// game.js
spawnZombie() {
    const col = Utils.randomInt(0, CONFIG.COLS - 1);
    const type = this.selectZombieType();
    
    this.entities.addZombie(col, type, this.state.wave);
    this.state.waveZombiesSpawned++;
}

selectZombieType() {
    const wave = this.state.wave;
    
    // Weighted random - RNG determines composition
    const options = [
        { value: 'NORMAL', weight: Math.max(5, 15 - wave) },
        { value: 'FAST', weight: wave >= 2 ? 12 + wave : 0 },
        { value: 'TANK', weight: wave >= 3 ? 8 + Math.floor(wave / 2) : 0 },
        // ... more random weights
    ];
    
    return Utils.weightedRandom(options.filter(o => o.weight > 0));
}
```

### After (Indie Serious - systems/wave-director.js)

```javascript
// systems/wave-director.js
class WaveDirector {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentWave = null;
        this.spawnQueue = [];
        this.waveStartTime = 0;
    }
    
    startWave(waveNumber) {
        // Get authored wave data
        const waveData = INDIE_WAVES[waveNumber - 1];
        
        if (!waveData) {
            console.error(`No wave data for wave ${waveNumber}`);
            return false;
        }
        
        this.currentWave = waveData;
        this.waveStartTime = performance.now();
        
        // Build deterministic spawn queue
        this.buildSpawnQueue(waveData);
        
        // Show wave preview to player
        this.gameState.ui.showWavePreview(waveData);
        
        return true;
    }
    
    buildSpawnQueue(waveData) {
        this.spawnQueue = [];
        
        // Process each composition group
        waveData.composition.forEach(group => {
            const baseDelay = group.delay || 0;
            const staggerTime = 600; // ms between individual spawns
            
            for (let i = 0; i < group.count; i++) {
                const spawnTime = baseDelay + (i * staggerTime);
                const lane = this.determineLane(group.lane, i, group.count);
                
                this.spawnQueue.push({
                    type: group.type,
                    lane: lane,
                    spawnTime: spawnTime
                });
            }
        });
        
        // Sort by spawn time for efficient processing
        this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
    }
    
    determineLane(laneSpec, index, total) {
        const COLS = INDIE_CONFIG.GRID.COLS;
        
        switch(laneSpec) {
            case 'center':
                return Math.floor(COLS / 2);
                
            case 'left':
                return Math.floor(COLS / 4);
                
            case 'right':
                return Math.floor(COLS * 3 / 4);
                
            case 'flanks':
                // Alternate left and right
                return index % 2 === 0 ? 
                    Math.floor(COLS / 4) : 
                    Math.floor(COLS * 3 / 4);
                
            case 'spread':
                // Evenly distribute across columns
                return Math.floor((index / total) * COLS);
                
            case 'varied':
                // Still use some variation, but predictable seed-based
                return (index * 7) % COLS;
                
            default:
                return Math.floor(COLS / 2);
        }
    }
    
    update(dt, currentTime) {
        if (!this.currentWave || this.spawnQueue.length === 0) {
            return true; // Wave complete
        }
        
        const elapsed = currentTime - this.waveStartTime;
        
        // Process all spawns that should have happened by now
        while (this.spawnQueue.length > 0 && 
               this.spawnQueue[0].spawnTime <= elapsed) {
            const spawn = this.spawnQueue.shift();
            
            // Create enemy with deterministic positioning
            const enemy = this.gameState.entities.addEnemy(
                spawn.lane,
                spawn.type
            );
            
            // Visual spawn effect
            this.gameState.particles.createSpawnEffect(spawn.lane, 0);
        }
        
        return this.spawnQueue.length === 0;
    }
    
    getCurrentWaveData() {
        return this.currentWave;
    }
}

// Example wave data from INDIE_WAVES
const WAVE_8_EXAMPLE = {
    id: 8,
    name: 'Armored Assault',
    composition: [
        { 
            type: 'FORTRESS', 
            count: 1, 
            lane: 'center', 
            delay: 0 
        },
        { 
            type: 'SWARM', 
            count: 8, 
            lane: 'flanks', 
            delay: 2000 
        },
        { 
            type: 'CHARGER', 
            count: 2, 
            lane: 'center', 
            delay: 4000 
        }
    ],
    solution: 'DEMOLISHER breaks FORTRESS armor. DISRUPTOR controls SWARM. SENTINEL tracks CHARGER.',
    tutorialHint: 'Armor requires armor penetration. Use DEMOLISHER first.'
};
```

**Key Changes**:
1. No randomness - waves are authored puzzles
2. Deterministic spawn timing and positioning
3. Wave preview shows composition before spawning
4. Solution hints guide player learning
5. Spawn queue system allows complex choreography

## Example 4: UI Rendering

### Before (Casual - ui.js)

```javascript
// ui.js - renderShopButtons()
renderShopButtons() {
    const btnY = this.canvas.height - 100;
    
    Object.entries(CANNON_TYPES).forEach((([type, config], index) => {
        const x = 20 + index * 90;
        
        // Draw button with emoji
        this.graphics.ctx.fillStyle = '#1a1a2e';
        this.graphics.ctx.fillRect(x, btnY, 80, 80);
        
        // Draw emoji icon
        this.graphics.ctx.font = '40px Arial';
        this.graphics.ctx.fillText(config.icon, x + 20, btnY + 50); // 🔫
        
        // Draw cost with coin emoji
        this.graphics.ctx.font = '16px Arial';
        this.graphics.ctx.fillText(`${config.cost} 💰`, x + 10, btnY + 75);
    });
}
```

### After (Indie Serious - ui.js)

```javascript
// ui.js - renderTowerSelector()
renderTowerSelector() {
    const ctx = this.graphics.ctx;
    const btnSize = 60;
    const btnSpacing = 10;
    const btnY = this.canvas.height - btnSize - 20;
    
    Object.entries(INDIE_TOWERS).forEach(([type, config], index) => {
        const x = 20 + index * (btnSize + btnSpacing);
        
        // Determine button state
        const affordable = this.gameState.coins >= config.cost;
        const selected = this.selectedTower === type;
        
        // Draw button background
        ctx.fillStyle = selected ? '#1a4a2e' : '#1a1a2e';
        ctx.fillRect(x, btnY, btnSize, btnSize);
        
        // Draw border
        ctx.strokeStyle = selected ? '#00ff88' : 
                         affordable ? '#888888' : '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, btnY, btnSize, btnSize);
        
        // Draw geometric shape icon
        ctx.save();
        ctx.translate(x + btnSize / 2, btnY + btnSize / 2);
        
        const size = btnSize * 0.4;
        const alpha = affordable ? 1.0 : 0.4;
        ctx.globalAlpha = alpha;
        
        switch(config.visual.shape) {
            case 'triangle':
                this.drawTriangle(ctx, size, config.visual.primaryColor);
                break;
            case 'hexagon':
                this.drawHexagon(ctx, size, config.visual.primaryColor);
                break;
            case 'square':
                this.drawSquare(ctx, size, config.visual.primaryColor);
                break;
            case 'circle':
                this.drawCircle(ctx, size, config.visual.primaryColor);
                break;
            case 'diamond':
                this.drawDiamond(ctx, size, config.visual.primaryColor);
                break;
        }
        
        ctx.restore();
        
        // Draw cost (no emoji)
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = affordable ? '#ffffff' : '#ff4444';
        ctx.textAlign = 'center';
        ctx.fillText(config.cost.toString(), x + btnSize / 2, btnY + btnSize + 15);
        
        // Draw single letter abbreviation
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(type[0], x + btnSize / 2, btnY + btnSize - 5);
    });
}

// Geometric shape drawing methods
drawTriangle(ctx, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.lineTo(size / 2, size / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = this.adjustBrightness(color, -30);
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

drawHexagon(ctx, size, color) {
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
    
    ctx.strokeStyle = this.adjustBrightness(color, -30);
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// ... similar for other shapes

adjustBrightness(color, amount) {
    // Parse hex color and adjust brightness
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
```

**Key Changes**:
1. No emojis - geometric shapes instead
2. Clear affordability indicators (color-coded borders)
3. Monospace font for clarity
4. Single letter abbreviations for compact display
5. Professional button states (selected, affordable, disabled)

## Summary

Core refactoring principles across all examples:

1. **Data-driven**: All values in external configs, no hard-coding
2. **No emojis**: Geometric shapes and clean text
3. **Modular systems**: Separate concerns (combat, waves, behavior)
4. **Deterministic**: Remove RNG, add authored content
5. **Functional clarity**: Every element serves gameplay

The transformation is comprehensive but maintains backward compatibility through feature flags. All casual elements can coexist during transition period.
