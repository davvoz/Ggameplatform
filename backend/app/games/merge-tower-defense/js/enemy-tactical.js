/**
 * Tactical AI System
 * Squad coordination, formation management, and emergent behavior
 */

// ============================================================================
// SQUAD SYSTEM
// ============================================================================

/**
 * Squad
 * Manages groups of enemies with coordinated behavior
 */
class Squad {
    constructor(composition, spawnColumn, waveNumber) {
        this.id = Utils.generateID();
        this.composition = composition;
        this.spawnColumn = spawnColumn;
        this.waveNumber = waveNumber;
        this.members = [];
        this.role = this.determineSquadRole();
        this.formation = this.calculateFormation();
        this.spawnIndex = 0;
        this.lastSpawnTime = 0;
    }
    
    determineSquadRole() {
        // Analyze composition to determine tactical role
        const types = this.composition.map(c => c.type);
        
        if (types.includes('overlord')) return 'boss';
        if (types.includes('assassin')) return 'assassination';
        if (types.includes('saboteur')) return 'disruption';
        if (types.includes('support')) return 'buffed_assault';
        if (types.includes('juggernaut')) return 'siege';
        if (types.includes('flanker')) return 'flanking';
        if (types.filter(t => t === 'rusher').length >= 4) return 'rush';
        
        return 'pressure';
    }
    
    calculateFormation() {
        const formation = [];
        
        switch (this.role) {
            case 'buffed_assault':
                // Support in back, damage dealers in front
                formation.push(...this.composition.filter(c => c.type === 'support'));
                formation.push(...this.composition.filter(c => c.type !== 'support'));
                break;
                
            case 'flanking':
                // Flankers spread across columns
                formation.push(...this.composition);
                break;
                
            case 'siege':
                // Tank in front, support behind
                const tanks = this.composition.filter(c => 
                    c.type === 'juggernaut' || c.type === 'brawler');
                const others = this.composition.filter(c => 
                    c.type !== 'juggernaut' && c.type !== 'brawler');
                formation.push(...tanks);
                formation.push(...others);
                break;
                
            default:
                formation.push(...this.composition);
        }
        
        return formation;
    }
    
    spawn(currentTime, enemyFactory, gameState) {
        if (this.spawnIndex >= this.formation.length) {
            return null; // Squad fully spawned
        }
        
        const unitConfig = this.formation[this.spawnIndex];
        const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
        
        if (timeSinceLastSpawn >= (unitConfig.delay || 0)) {
            // Determine spawn column based on role
            let spawnCol = this.spawnColumn;
            
            if (this.role === 'flanking' && unitConfig.type === 'flanker') {
                // Spread flankers across columns
                const flankerIndex = this.members.filter(m => m.type === 'flanker').length;
                spawnCol = Math.floor(CONFIG.COLS * (flankerIndex / 3)) % CONFIG.COLS;
            }
            
            // Create enemy with wave scaling
            const enemy = enemyFactory.create(
                unitConfig.type, 
                spawnCol,
                { waveNumber: this.waveNumber }
            );
            
            // Mark as squad member
            enemy.squadId = this.id;
            enemy.squadRole = this.role;
            
            this.members.push(enemy);
            this.spawnIndex++;
            this.lastSpawnTime = currentTime;
            
            return enemy;
        }
        
        return null;
    }
    
    update(dt, currentTime, gameState) {
        // Remove dead members
        this.members = this.members.filter(m => m.combat.isAlive());
        
        if (this.members.length === 0) return;
        
        // Coordinate squad behavior
        switch (this.role) {
            case 'buffed_assault':
                this.coordinateBuffedAssault(gameState);
                break;
            case 'flanking':
                this.coordinateFlanking(gameState);
                break;
            case 'assassination':
                this.coordinateAssassination(gameState);
                break;
            case 'siege':
                this.coordinateSiege(gameState);
                break;
        }
        
        // Maintain formation spacing
        this.maintainFormation();
    }
    
    coordinateBuffedAssault(gameState) {
        // Ensure support units stay behind frontline
        const supports = this.members.filter(m => m.type === 'support');
        const frontline = this.members.filter(m => m.type !== 'support');
        
        if (supports.length > 0 && frontline.length > 0) {
            const avgFrontlineRow = frontline.reduce((sum, m) => sum + m.row, 0) / frontline.length;
            
            supports.forEach(support => {
                // Slow down if getting too far ahead
                if (support.row > avgFrontlineRow - 1.5) {
                    support.movement.currentSpeed = support.movement.baseSpeed * 0.5;
                } else {
                    support.movement.currentSpeed = support.movement.baseSpeed;
                }
            });
        }
    }
    
    coordinateFlanking(gameState) {
        // Flankers evade in sync for maximum disruption
        const flankers = this.members.filter(m => m.type === 'flanker');
        
        if (flankers.length < 2) return;
        
        // Check if any flanker is evading
        const evadingFlanker = flankers.find(f => f.state.currentState === 'evade');
        
        if (evadingFlanker) {
            // Other flankers also evade (with slight delay)
            flankers.forEach(f => {
                if (f !== evadingFlanker && f.state.currentState === 'move') {
                    setTimeout(() => {
                        if (f.combat.isAlive()) {
                            f.state.transition('evade', f, gameState);
                        }
                    }, 200);
                }
            });
        }
    }
    
    coordinateAssassination(gameState) {
        // Assassins wait for support buff before engaging
        const assassins = this.members.filter(m => m.type === 'assassin');
        const supports = this.members.filter(m => m.type === 'support');
        
        if (assassins.length > 0 && supports.length > 0) {
            assassins.forEach(assassin => {
                // Check if buffed
                const isBuffed = assassin.hasActiveBuffs();
                
                if (isBuffed) {
                    // Increase speed when buffed
                    assassin.movement.currentSpeed = assassin.movement.baseSpeed * 1.5;
                } else {
                    // Slow down to wait for buff
                    if (assassin.row < supports[0].row + 3) {
                        assassin.movement.currentSpeed = assassin.movement.baseSpeed * 0.6;
                    }
                }
            });
        }
    }
    
    coordinateSiege(gameState) {
        // Tank absorbs damage while support heals
        const tanks = this.members.filter(m => 
            m.type === 'juggernaut' || m.type === 'brawler');
        const supports = this.members.filter(m => m.type === 'support');
        
        if (tanks.length > 0 && supports.length > 0) {
            // Support prioritizes healing tank
            supports.forEach(support => {
                // Stay behind tank
                const leadTank = tanks[0];
                if (support.row > leadTank.row - 1.0) {
                    support.movement.currentSpeed = support.movement.baseSpeed * 0.4;
                } else {
                    support.movement.currentSpeed = support.movement.baseSpeed;
                }
            });
        }
    }
    
    maintainFormation() {
        // Prevent units from overlapping
        for (let i = 0; i < this.members.length; i++) {
            const unit = this.members[i];
            
            // Check against other units
            for (let j = i + 1; j < this.members.length; j++) {
                const other = this.members[j];
                
                const dist = Utils.distance(
                    { col: unit.col, row: unit.row },
                    { col: other.col, row: other.row }
                );
                
                // If too close, slow down the one behind
                if (dist < 0.5) {
                    if (unit.row > other.row) {
                        unit.movement.currentSpeed *= 0.8;
                    } else {
                        other.movement.currentSpeed *= 0.8;
                    }
                }
            }
        }
    }
    
    isComplete() {
        return this.spawnIndex >= this.formation.length;
    }
    
    isDefeated() {
        return this.isComplete() && this.members.length === 0;
    }
    
    getActiveMembers() {
        return this.members.filter(m => m.combat.isAlive());
    }
}

// ============================================================================
// THREAT ASSESSMENT SYSTEM
// ============================================================================

class ThreatAssessment {
    constructor() {
        this.threatCache = new Map();
        this.cacheTimeout = 500; // ms
    }
    
    /**
     * Calculate threat score for a tower against a specific enemy
     */
    calculateTowerThreat(tower, enemy) {
        const cacheKey = `${tower.id}_${enemy.id}`;
        const cached = this.threatCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.score;
        }
        
        let threat = 0;
        
        // Base damage output
        const dps = tower.damage / (tower.fireRate / 1000);
        threat += dps * 10;
        
        // Level scaling
        threat *= Math.pow(1.5, tower.level - 1);
        
        // Type effectiveness
        if (enemy.combat.armor > 0) {
            // Certain tower types ignore armor
            if (tower.type === 'LASER') {
                threat *= 1.5;
            } else {
                // Armor reduces threat
                threat *= Math.max(0.2, 1 - (enemy.combat.armor * 0.1));
            }
        }
        
        if (enemy.combat.dodgeChance > 0) {
            // Area damage can't be dodged
            if (tower.splashRadius > 0) {
                threat *= 1.8;
            } else {
                // Single-target reduced by dodge chance
                threat *= (1 - enemy.combat.dodgeChance);
            }
        }
        
        // CC resistance affects slow towers
        if (tower.slowFactor && enemy.combat.ccResistance > 0) {
            threat *= (1 - enemy.combat.ccResistance * 0.5);
        }
        
        // Distance factor
        const distance = Utils.distance(
            { col: tower.col, row: tower.row },
            { col: enemy.col, row: enemy.row }
        );
        
        if (distance > tower.range) {
            threat = 0; // Out of range
        } else {
            // Closer towers are more threatening
            threat *= (1 + (tower.range - distance) / tower.range);
        }
        
        // Cache result
        this.threatCache.set(cacheKey, {
            score: threat,
            timestamp: Date.now()
        });
        
        return threat;
    }
    
    /**
     * Calculate total threat in a column
     */
    calculateColumnThreat(col, gameState) {
        const towersInColumn = gameState.entities.cannons.filter(t => t.col === col);
        
        return towersInColumn.reduce((sum, tower) => {
            const baseThreat = tower.damage * tower.level;
            const fireRateFactor = 1000 / tower.fireRate;
            return sum + (baseThreat * fireRateFactor);
        }, 0);
    }
    
    /**
     * Find the least defended column
     */
    findWeakestColumn(gameState) {
        let minThreat = Infinity;
        let weakestCol = Math.floor(CONFIG.COLS / 2);
        
        for (let col = 0; col < CONFIG.COLS; col++) {
            const threat = this.calculateColumnThreat(col, gameState);
            if (threat < minThreat) {
                minThreat = threat;
                weakestCol = col;
            }
        }
        
        return weakestCol;
    }
    
    /**
     * Assess enemy threat level (for support targeting priority)
     */
    calculateEnemyThreatLevel(enemy, gameState) {
        let threat = enemy.combat.currentHP;
        
        // Armor makes them more durable = higher threat
        threat *= (1 + enemy.combat.armor * 0.2);
        
        // Closer to goal = more threatening
        const progressToGoal = enemy.row / CONFIG.ROWS;
        threat *= (1 + progressToGoal);
        
        // Type-specific threat
        const threatMultipliers = {
            assassin: 2.0,
            juggernaut: 1.5,
            saboteur: 1.8,
            support: 1.6,
            brawler: 1.3,
            rusher: 1.2,
            grunt: 1.0
        };
        
        threat *= (threatMultipliers[enemy.type] || 1.0);
        
        return threat;
    }
    
    clearCache() {
        this.threatCache.clear();
    }
}

// ============================================================================
// SPAWN DIRECTOR
// ============================================================================

/**
 * Spawn Director
 * Manages wave spawning with tactical squad composition
 */
class SpawnDirector {
    constructor(enemyFactory) {
        this.enemyFactory = enemyFactory;
        this.activeSquads = [];
        this.pendingSquads = [];
    }
    
    scheduleWave(waveNumber, gameState) {
        const composition = generateWaveComposition(waveNumber);
        
        // Convert composition to squads
        const squads = this.createSquadsFromComposition(composition, waveNumber);
        
        this.pendingSquads.push(...squads);
    }
    
    createSquadsFromComposition(composition, waveNumber) {
        const squads = [];
        
        // Group by delay to create tactical squads
        const delayGroups = new Map();
        
        composition.forEach(unit => {
            const delay = unit.delay || 0;
            if (!delayGroups.has(delay)) {
                delayGroups.set(delay, []);
            }
            
            // Expand count into individual units
            for (let i = 0; i < unit.count; i++) {
                delayGroups.get(delay).push({
                    type: unit.type,
                    delay: delay
                });
            }
        });
        
        // Create squads from delay groups
        delayGroups.forEach((units, delay) => {
            const spawnColumn = this.selectSpawnColumn(waveNumber);
            const squad = new Squad(units, spawnColumn, waveNumber);
            squad.spawnDelay = delay;
            squads.push(squad);
        });
        
        return squads;
    }
    
    selectSpawnColumn(waveNumber) {
        // Vary spawn columns for tactical diversity
        const columns = [
            Math.floor(CONFIG.COLS / 4),
            Math.floor(CONFIG.COLS / 2),
            Math.floor(CONFIG.COLS * 3 / 4)
        ];
        
        return columns[waveNumber % columns.length];
    }
    
    update(currentTime, gameState) {
        // Move pending squads to active when ready
        for (let i = this.pendingSquads.length - 1; i >= 0; i--) {
            const squad = this.pendingSquads[i];
            
            if (currentTime >= squad.spawnDelay) {
                this.activeSquads.push(squad);
                this.pendingSquads.splice(i, 1);
            }
        }
        
        // Update active squads
        for (let i = this.activeSquads.length - 1; i >= 0; i--) {
            const squad = this.activeSquads[i];
            
            // Try to spawn next member
            const enemy = squad.spawn(currentTime, this.enemyFactory, gameState);
            if (enemy) {
                gameState.entities.addZombie(enemy);
            }
            
            // Update squad coordination
            squad.update(0, currentTime, gameState);
            
            // Remove defeated squads
            if (squad.isDefeated()) {
                this.activeSquads.splice(i, 1);
            }
        }
    }
    
    hasActiveSquads() {
        return this.activeSquads.length > 0 || this.pendingSquads.length > 0;
    }
    
    getActiveEnemyCount() {
        return this.activeSquads.reduce((sum, squad) => 
            sum + squad.getActiveMembers().length, 0);
    }
    
    reset() {
        this.activeSquads = [];
        this.pendingSquads = [];
    }
}

// ============================================================================
// ENEMY FACTORY WITH REGISTRY
// ============================================================================

class EnemyFactory {
    constructor() {
        this.registry = new Map();
        this.threatAssessment = new ThreatAssessment();
        this.registerDefaults();
    }
    
    registerDefaults() {
        // Register all enemy types from configs
        Object.keys(ENEMY_CONFIGS).forEach(type => {
            this.register(type, ENEMY_CONFIGS[type]);
        });
    }
    
    register(type, config) {
        this.registry.set(type, config);
    }
    
    create(type, spawnCol, options = {}) {
        const baseConfig = this.registry.get(type);
        if (!baseConfig) {
            console.error(`Unknown enemy type: ${type}`);
            return null;
        }
        
        // Apply modifiers
        let config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
        
        // Apply wave scaling
        if (options.waveNumber) {
            config = applyWaveScaling(config, options.waveNumber);
        }
        
        // Apply additional modifiers
        if (options.hpMultiplier) {
            config.combat.hp *= options.hpMultiplier;
        }
        if (options.speedMultiplier) {
            config.movement.speed *= options.speedMultiplier;
        }
        
        // Create enemy entity
        config.spawnCol = spawnCol;
        config.spawnRow = -1;
        
        const enemy = new EnemyEntity(config);
        
        // Add threat assessment reference
        enemy.threatAssessment = this.threatAssessment;
        
        return enemy;
    }
    
    getThreatAssessment() {
        return this.threatAssessment;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Squad,
        ThreatAssessment,
        SpawnDirector,
        EnemyFactory
    };
}
