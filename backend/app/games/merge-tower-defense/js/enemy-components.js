/**
 * Enemy Component System
 * Production-grade component-based architecture following SOLID principles
 */

// ============================================================================
// COMPONENT INTERFACES & BASE CLASSES
// ============================================================================

/**
 * Movement Component
 * Handles pathfinding, speed modifiers, and position updates
 */
class MovementComponent {
    constructor(config) {
        this.baseSpeed = config.speed;
        this.currentSpeed = this.baseSpeed;
        this.canChangeColumn = config.canChangeColumn || false;
        this.columnChangeCooldown = config.columnChangeCooldown || 3000;
        this.lastColumnChange = 0;
        
        // Speed modifiers stack
        this.speedModifiers = [];
    }
    
    update(dt, enemy, currentTime, gameState) {
        // Clean expired speed modifiers
        this.speedModifiers = this.speedModifiers.filter(mod => 
            currentTime < mod.expiresAt
        );
        
        // Calculate effective speed
        let speedMultiplier = 1.0;
        this.speedModifiers.forEach(mod => {
            speedMultiplier *= mod.factor;
        });
        
        this.currentSpeed = this.baseSpeed * speedMultiplier;
        
        // Update position
        enemy.row += this.currentSpeed * dt;
        
        // Handle column changes for flankers
        if (this.canChangeColumn && 
            currentTime - this.lastColumnChange >= this.columnChangeCooldown) {
            this.evaluateColumnChange(enemy, currentTime, gameState);
        }
    }
    
    evaluateColumnChange(enemy, currentTime, gameState) {
        // Don't change column if too close to defense line
        if (enemy.row >= CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS - 1) return;
        
        const currentThreat = this.calculateColumnThreat(enemy.col, gameState);
        const leftThreat = enemy.col > 0 ? 
            this.calculateColumnThreat(enemy.col - 1, gameState) : Infinity;
        const rightThreat = enemy.col < CONFIG.COLS - 1 ? 
            this.calculateColumnThreat(enemy.col + 1, gameState) : Infinity;
        
        const minThreat = Math.min(currentThreat, leftThreat, rightThreat);
        
        // Only change if significant threat reduction (>30%)
        if (minThreat < currentThreat * 0.7) {
            if (minThreat === leftThreat) {
                enemy.col -= 1;
                enemy.state.transition('evade', enemy, gameState);
            } else if (minThreat === rightThreat) {
                enemy.col += 1;
                enemy.state.transition('evade', enemy, gameState);
            }
            this.lastColumnChange = currentTime;
        }
    }
    
    calculateColumnThreat(col, gameState) {
        const towersInColumn = gameState.entities.cannons.filter(c => c.col === col);
        return towersInColumn.reduce((sum, tower) => {
            const threat = tower.damage * (1000 / tower.fireRate) * tower.level;
            return sum + threat;
        }, 0);
    }
    
    applySpeedModifier(factor, duration, currentTime) {
        this.speedModifiers.push({
            factor: factor,
            expiresAt: currentTime + duration
        });
    }
    
    getEffectiveSpeed() {
        return this.currentSpeed;
    }
}

/**
 * Combat Component
 * Handles HP, armor, resistances, and damage calculation
 */
class CombatComponent {
    constructor(config) {
        this.maxHP = config.hp;
        this.currentHP = this.maxHP;
        this.armor = config.armor || 0;
        this.dodgeChance = config.dodgeChance || 0;
        this.ccResistance = config.ccResistance || 0; // Crowd control resistance
        this.resistances = config.resistances || {}; // Type-specific resistances
        
        // Hit reaction tracking
        this.lastHitTime = 0;
        this.hitFlashDuration = 200;
    }
    
    takeDamage(amount, damageType, currentTime) {
        // Check dodge
        if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
            return { dodged: true, damage: 0 };
        }
        
        // Apply armor
        let finalDamage = Math.max(1, amount - this.armor);
        
        // Apply resistances
        if (damageType && this.resistances[damageType]) {
            finalDamage *= (1 - this.resistances[damageType]);
        }
        
        // Apply damage
        this.currentHP -= finalDamage;
        this.lastHitTime = currentTime;
        
        return { dodged: false, damage: finalDamage };
    }
    
    heal(amount) {
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    }
    
    isAlive() {
        return this.currentHP > 0;
    }
    
    getHPPercent() {
        return this.currentHP / this.maxHP;
    }
    
    isFlashing(currentTime) {
        return currentTime - this.lastHitTime < this.hitFlashDuration;
    }
    
    applySlowWithResistance(factor, duration, currentTime, movementComponent) {
        const effectiveDuration = duration * (1 - this.ccResistance);
        if (effectiveDuration > 0) {
            movementComponent.applySpeedModifier(factor, effectiveDuration, currentTime);
        }
    }
}

/**
 * AI Component
 * Handles decision-making and tactical behavior
 */
class AIComponent {
    constructor(config) {
        this.behaviorType = config.behaviorType || 'simple';
        this.perceptionRadius = config.perceptionRadius || 5;
        this.targetPriority = config.targetPriority || 'nearest';
        this.updateInterval = config.updateInterval || 200;
        this.lastUpdate = 0;
        
        // Cached decisions
        this.currentDecision = null;
    }
    
    evaluate(enemy, currentTime, gameState) {
        // Throttle AI updates for performance
        if (currentTime - this.lastUpdate < this.updateInterval) {
            return this.currentDecision;
        }
        
        this.lastUpdate = currentTime;
        
        // Behavior tree evaluation
        switch (this.behaviorType) {
            case 'simple':
                this.currentDecision = this.simpleAI(enemy, gameState);
                break;
            case 'flanker':
                this.currentDecision = this.flankerAI(enemy, gameState);
                break;
            case 'support':
                this.currentDecision = this.supportAI(enemy, gameState);
                break;
            case 'saboteur':
                this.currentDecision = this.saboteurAI(enemy, gameState);
                break;
            case 'assassin':
                this.currentDecision = this.assassinAI(enemy, gameState);
                break;
            default:
                this.currentDecision = { action: 'move' };
        }
        
        return this.currentDecision;
    }
    
    simpleAI(enemy, gameState) {
        // Just move forward
        return { action: 'move' };
    }
    
    flankerAI(enemy, gameState) {
        // Already handled in MovementComponent.evaluateColumnChange
        return { action: 'move' };
    }
    
    supportAI(enemy, gameState) {
        // Find allies in range
        const alliesInRange = this.getAlliesInRadius(enemy, this.perceptionRadius, gameState);
        
        if (alliesInRange.length > 0) {
            // Prioritize by threat level
            alliesInRange.sort((a, b) => b.threatLevel - a.threatLevel);
            return {
                action: 'buff',
                target: alliesInRange[0]
            };
        }
        
        return { action: 'move' };
    }
    
    saboteurAI(enemy, gameState) {
        // Check if in defense zone
        if (enemy.row >= CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS) {
            // Find nearest tower
            const towersInRange = this.getTowersInRadius(enemy, 2, gameState);
            if (towersInRange.length > 0) {
                // Prioritize high-level towers
                towersInRange.sort((a, b) => b.level - a.level);
                return {
                    action: 'disable',
                    target: towersInRange[0]
                };
            }
        }
        
        return { action: 'move' };
    }
    
    assassinAI(enemy, gameState) {
        // Calculate least defended column
        let minThreat = Infinity;
        let bestColumn = enemy.col;
        
        for (let col = 0; col < CONFIG.COLS; col++) {
            const threat = this.calculateColumnDefense(col, gameState);
            if (threat < minThreat) {
                minThreat = threat;
                bestColumn = col;
            }
        }
        
        // If current column isn't optimal, consider moving
        if (bestColumn !== enemy.col && Math.random() < 0.3) {
            return {
                action: 'evade',
                targetColumn: bestColumn
            };
        }
        
        return { action: 'move' };
    }
    
    // Helper methods
    getAlliesInRadius(enemy, radius, gameState) {
        return gameState.entities.zombies.filter(z => {
            if (z === enemy || !z.combat.isAlive()) return false;
            const dist = Utils.distance(
                { col: enemy.col, row: enemy.row },
                { col: z.col, row: z.row }
            );
            return dist <= radius;
        });
    }
    
    getTowersInRadius(enemy, radius, gameState) {
        return gameState.entities.cannons.filter(t => {
            const dist = Utils.distance(
                { col: enemy.col, row: enemy.row },
                { col: t.col, row: t.row }
            );
            return dist <= radius;
        });
    }
    
    calculateColumnDefense(col, gameState) {
        const towers = gameState.entities.cannons.filter(t => t.col === col);
        return towers.reduce((sum, t) => sum + t.damage * t.level, 0);
    }
}

/**
 * Animation Component
 * Manages animation states and sprite rendering
 */
class AnimationComponent {
    constructor(config) {
        this.animations = config.animations; // State name -> animation config
        this.currentState = 'idle';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.animPhase = Math.random() * Math.PI * 2; // For procedural animations
    }
    
    update(dt) {
        const anim = this.animations[this.currentState];
        if (!anim) return;
        
        // Update frame timer
        const frameDuration = anim.fps ? (1000 / anim.fps) / 1000 : 0.1;
        this.frameTimer += dt;
        
        if (this.frameTimer >= frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % (anim.frames || 1);
        }
        
        // Update procedural animation phase
        this.animPhase += dt * 3;
    }
    
    setState(newState) {
        if (this.currentState === newState) return;
        
        const anim = this.animations[newState];
        if (!anim) {
            console.warn(`Animation state '${newState}' not found`);
            return;
        }
        
        this.currentState = newState;
        this.currentFrame = 0;
        this.frameTimer = 0;
    }
    
    getCurrentSprite() {
        const anim = this.animations[this.currentState];
        if (!anim) return '❓';
        
        // Return sprite (can be emoji string or sprite object)
        return anim.sprite;
    }
    
    getVisualEffects() {
        return {
            wobble: Math.sin(this.animPhase) * 0.05,
            rotation: Math.sin(this.animPhase * 0.5) * 0.1,
            bounce: Math.abs(Math.sin(this.animPhase)) * 0.1
        };
    }
}

/**
 * State Component
 * Manages state machine and transitions
 */
class StateComponent {
    constructor(config) {
        this.states = config.states; // State definitions
        this.currentState = config.initialState || 'idle';
        this.stateData = {};
        this.stateEnterTime = 0;
        this.stateDuration = 0;
    }
    
    transition(newState, enemy, gameState) {
        const currentStateDef = this.states[this.currentState];
        const newStateDef = this.states[newState];
        
        if (!newStateDef) {
            console.warn(`State '${newState}' not defined`);
            return false;
        }
        
        // Check if transition is allowed
        if (currentStateDef.transitions && 
            !currentStateDef.transitions.includes(newState)) {
            return false;
        }
        
        // Exit current state
        if (currentStateDef.onExit) {
            this[currentStateDef.onExit](enemy, gameState);
        }
        
        // Enter new state
        this.currentState = newState;
        this.stateEnterTime = Date.now();
        this.stateDuration = newStateDef.duration || 0;
        
        if (newStateDef.onEnter) {
            this[newStateDef.onEnter](enemy, gameState);
        }
        
        // Sync animation
        enemy.animation.setState(newState);
        
        return true;
    }
    
    update(dt, enemy, currentTime, gameState) {
        const stateDef = this.states[this.currentState];
        if (!stateDef) return;
        
        // Execute state update logic
        if (stateDef.onUpdate) {
            this[stateDef.onUpdate](dt, enemy, gameState);
        }
        
        // Check for automatic transitions
        if (this.stateDuration > 0 && 
            currentTime - this.stateEnterTime >= this.stateDuration) {
            // Duration expired, transition to next state
            if (stateDef.nextState) {
                this.transition(stateDef.nextState, enemy, gameState);
            }
        }
        
        // Check state conditions
        if (stateDef.conditions) {
            for (const condition of stateDef.conditions) {
                if (this.checkCondition(condition, enemy, gameState)) {
                    this.transition(condition.transitionTo, enemy, gameState);
                    break;
                }
            }
        }
    }
    
    checkCondition(condition, enemy, gameState) {
        // Evaluate condition (placeholder - extend as needed)
        switch (condition.type) {
            case 'hp_below':
                return enemy.combat.getHPPercent() < condition.value;
            case 'reached_row':
                return enemy.row >= condition.value;
            default:
                return false;
        }
    }
    
    // State handlers (can be overridden)
    onIdleEnter(enemy, gameState) { }
    onMoveEnter(enemy, gameState) { }
    onHitEnter(enemy, gameState) { }
    onDeathEnter(enemy, gameState) { }
}

// ============================================================================
// ENEMY BASE CLASS
// ============================================================================

/**
 * Enemy
 * Base class using component composition
 */
class EnemyEntity {
    constructor(config) {
        this.id = Utils.generateID();
        this.type = config.type;
        this.col = config.spawnCol;
        this.row = config.spawnRow || -1;
        
        // Components (Composition over Inheritance)
        this.movement = new MovementComponent(config.movement);
        this.combat = new CombatComponent(config.combat);
        this.animation = new AnimationComponent(config.animation);
        this.state = new StateComponent(config.states);
        this.ai = config.ai ? new AIComponent(config.ai) : null;
        
        // Metadata
        this.reward = config.reward;
        this.threatLevel = config.threatLevel || 1;
        this.visualConfig = config.visual;
        
        // Special abilities
        this.abilities = config.abilities || {};
        this.abilityState = {};
        
        // Buffs
        this.activeBuffs = [];
    }
    
    update(dt, currentTime, gameState) {
        if (!this.combat.isAlive()) {
            // Handle death state
            if (this.state.currentState !== 'death') {
                this.state.transition('death', this, gameState);
            }
            return;
        }
        
        // Update components
        this.state.update(dt, this, currentTime, gameState);
        
        if (this.ai) {
            const decision = this.ai.evaluate(this, currentTime, gameState);
            this.executeDecision(decision, currentTime, gameState);
        }
        
        this.movement.update(dt, this, currentTime, gameState);
        this.animation.update(dt);
        
        // Update abilities
        this.updateAbilities(dt, currentTime, gameState);
        
        // Update buffs
        this.updateBuffs(currentTime);
    }
    
    executeDecision(decision, currentTime, gameState) {
        if (!decision) return;
        
        switch (decision.action) {
            case 'buff':
                if (decision.target) {
                    this.applyBuffToTarget(decision.target, currentTime);
                }
                break;
            case 'disable':
                if (decision.target) {
                    this.disableTower(decision.target, currentTime, gameState);
                }
                break;
            case 'evade':
                if (decision.targetColumn !== undefined) {
                    this.col = decision.targetColumn;
                    this.state.transition('evade', this, gameState);
                }
                break;
        }
    }
    
    updateAbilities(dt, currentTime, gameState) {
        // Support ability: buff aura
        if (this.abilities.buffAura) {
            const ability = this.abilities.buffAura;
            
            if (!this.abilityState.buffAura) {
                this.abilityState.buffAura = { lastTick: 0 };
            }
            
            if (currentTime - this.abilityState.buffAura.lastTick >= ability.tickRate) {
                this.abilityState.buffAura.lastTick = currentTime;
                
                // Find allies in radius
                const allies = this.getAlliesInRadius(ability.radius, gameState);
                allies.forEach(ally => {
                    this.applyBuffToTarget(ally, currentTime);
                });
            }
        }
        
        // Regeneration ability
        if (this.abilities.regeneration) {
            const ability = this.abilities.regeneration;
            
            if (!this.abilityState.regen) {
                this.abilityState.regen = { lastTick: 0 };
            }
            
            if (currentTime - this.abilityState.regen.lastTick >= ability.tickRate) {
                this.abilityState.regen.lastTick = currentTime;
                this.combat.heal(ability.amount);
            }
        }
    }
    
    applyBuffToTarget(target, currentTime) {
        if (!target || !this.abilities.buffAura) return;
        
        const buff = this.abilities.buffAura;
        target.addBuff({
            source: this.id,
            type: 'speed',
            factor: buff.speedBonus || 1.3,
            duration: buff.duration,
            appliedAt: currentTime
        });
        
        if (buff.regenBonus) {
            target.addBuff({
                source: this.id,
                type: 'regen',
                amount: buff.regenBonus,
                duration: buff.duration,
                appliedAt: currentTime
            });
        }
    }
    
    disableTower(tower, currentTime, gameState) {
        if (!this.abilities.disable) return;
        
        const ability = this.abilities.disable;
        
        // Telegraph state
        this.state.transition('attack', this, gameState);
        
        // Disable tower after telegraph
        setTimeout(() => {
            tower.disabled = true;
            tower.disabledUntil = currentTime + ability.duration;
            
            // Visual feedback
            gameState.particles.emit(tower.col, tower.row, {
                text: '⚠️',
                color: '#ff3333',
                vy: -1,
                life: 1.0
            });
        }, ability.telegraphTime || 1000);
    }
    
    addBuff(buff) {
        this.activeBuffs.push(buff);
        
        // Apply buff effect
        if (buff.type === 'speed') {
            this.movement.applySpeedModifier(buff.factor, buff.duration, buff.appliedAt);
        }
    }
    
    updateBuffs(currentTime) {
        this.activeBuffs = this.activeBuffs.filter(buff => {
            const active = currentTime - buff.appliedAt < buff.duration;
            
            // Apply regen tick
            if (active && buff.type === 'regen') {
                if (currentTime % 1000 < 50) { // Tick every second
                    this.combat.heal(buff.amount);
                }
            }
            
            return active;
        });
    }
    
    hasActiveBuffs() {
        return this.activeBuffs.length > 0;
    }
    
    getAlliesInRadius(radius, gameState) {
        return gameState.entities.zombies.filter(z => {
            if (z === this || !z.combat.isAlive()) return false;
            const dist = Utils.distance(
                { col: this.col, row: this.row },
                { col: z.col, row: z.row }
            );
            return dist <= radius;
        });
    }
    
    takeDamage(amount, damageType, currentTime, gameState) {
        const result = this.combat.takeDamage(amount, damageType, currentTime);
        
        if (result.dodged) {
            // Trigger dodge animation
            this.state.transition('evade', this, gameState);
            return result;
        }
        
        // Trigger hit reaction
        if (this.combat.isAlive()) {
            this.state.transition('hit', this, gameState);
        } else {
            this.onDeath(gameState);
        }
        
        return result;
    }
    
    onDeath(gameState) {
        this.state.transition('death', this, gameState);
        
        // Drop rewards
        gameState.coins += this.reward;
        gameState.kills++;
        
        // Spawn coin particles
        gameState.particles.createCoinBurst(this.col, this.row, this.reward);
    }
    
    isPastDefenseLine() {
        return this.row >= (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS);
    }
    
    isOffScreen() {
        return this.row > CONFIG.ROWS + 1;
    }
    
    render(graphics, currentTime) {
        const sprite = this.animation.getCurrentSprite();
        const effects = this.animation.getVisualEffects();
        
        // Calculate position with effects
        let displayCol = this.col;
        let displayRow = this.row + effects.wobble;
        
        // Flash effect when hit
        const flashColor = this.combat.isFlashing(currentTime) ? '#ffffff' : null;
        
        // Glow effects
        const isSpecial = this.threatLevel >= 3 || this.hasActiveBuffs();
        
        // Draw sprite (professional vector or fallback to emoji)
        graphics.drawSprite(sprite, displayCol, displayRow, {
            scale: this.visualConfig.scale || 1.0,
            color: flashColor || this.visualConfig.colorPrimary,
            tint: flashColor || this.visualConfig.colorPrimary, // For vector sprites
            glow: isSpecial,
            glowColor: this.visualConfig.colorPrimary,
            bounce: effects.bounce,
            rotation: effects.rotation
        });
        
        // Draw health bar
        const hpPercent = this.combat.getHPPercent();
        if (hpPercent < 1.0) {
            graphics.drawHealthBar(displayCol, displayRow, hpPercent, {
                offsetY: -0.5 * (this.visualConfig.scale || 1.0),
                width: 0.8 * (this.visualConfig.scale || 1.0)
            });
        }
        
        // Draw armor indicator
        if (this.combat.armor > 0) {
            const pos = graphics.gridToScreen(displayCol, displayRow);
            graphics.drawText('🛡️', pos.x + graphics.getCellSize() * 0.3, 
                             pos.y - graphics.getCellSize() * 0.3, {
                size: graphics.getCellSize() * 0.2,
                align: 'center'
            });
        }
        
        // Draw buff indicators
        if (this.hasActiveBuffs()) {
            this.renderBuffIndicators(graphics, displayCol, displayRow);
        }
        
        // Draw support aura
        if (this.abilities.buffAura && this.combat.isAlive()) {
            graphics.drawRange(displayCol, displayRow, this.abilities.buffAura.radius, 
                              Utils.colorWithAlpha('#00ff88', 0.15));
        }
    }
    
    renderBuffIndicators(graphics, col, row) {
        const pos = graphics.gridToScreen(col, row);
        const cellSize = graphics.getCellSize();
        
        let offsetX = -cellSize * 0.3;
        
        this.activeBuffs.forEach((buff, index) => {
            let icon = '✨';
            if (buff.type === 'speed') icon = '⚡';
            if (buff.type === 'regen') icon = '💚';
            
            graphics.drawText(icon, pos.x + offsetX, pos.y - cellSize * 0.4, {
                size: cellSize * 0.15,
                align: 'center'
            });
            
            offsetX += cellSize * 0.15;
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MovementComponent,
        CombatComponent,
        AIComponent,
        AnimationComponent,
        StateComponent,
        EnemyEntity
    };
}
