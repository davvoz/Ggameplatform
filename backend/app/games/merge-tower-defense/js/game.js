/**
 * Game Core
 * Main game logic with advanced merge mechanics
 */

class Game {
    constructor(graphics, input, ui) {
        this.graphics = graphics;
        this.input = input;
        this.ui = ui;
        
        this.entities = new EntityManager();
        this.particles = new ParticleSystem();
        
        this.state = this.createInitialState();
        
        this.setupInputHandlers();
        this.performanceMonitor = Utils.createPerformanceMonitor();
    }

    createInitialState() {
        return {
            // Resources
            coins: CONFIG.INITIAL_COINS,
            energy: CONFIG.INITIAL_ENERGY,
            
            // Wave management
            wave: 1,
            waveInProgress: false,
            waveZombiesTotal: CONFIG.BASE_WAVE_ZOMBIES,
            waveZombiesSpawned: 0,
            lastSpawnTime: 0,
            waveClearBonus: 0,
            
            // Scoring
            score: 0,
            kills: 0,
            highestLevel: 1,
            combos: 0,
            
            // Session tracking for XP system
            towerMerges: 0,
            towersPlaced: 0,
            coinsEarned: 0,
            
            // Game state
            isPaused: false,
            isGameOver: false,
            playTime: 0,
            
            // Merge system
            selectedCannons: [],
            cannonLimit: CONFIG.COLS * CONFIG.DEFENSE_ZONE_ROWS,
            
            // UI state
            showMergeHint: false,
            mergeHintPos: null
        };
    }

    setupInputHandlers() {
        // Tap handler
        this.input.onTap((gridPos, screenPos) => {
            if (this.state.isGameOver) {
                // Check if retry button was clicked
                if (this.ui.isRetryButtonClicked(screenPos.x, screenPos.y)) {
                    this.restart();
                }
                return;
            }
            
            if (this.state.isPaused) return;
            
            // Check UI interaction
            const uiAction = this.ui.handleTap(gridPos, screenPos, this.state);
            
            if (uiAction) {
                if (uiAction.type === 'shop') {
                    // Shop button selected
                    this.particles.emit(gridPos.col, gridPos.row, {
                        text: '✓',
                        color: CONFIG.COLORS.TEXT_PRIMARY,
                        vy: -1,
                        life: 0.5
                    });
                } else if (uiAction.type === 'grid') {
                    this.handleGridTap(gridPos);
                }
            }
        });
        
        // Drag handler for merge system
        this.input.onDragEnd((startPos, endPos) => {
            if (this.state.isPaused || this.state.isGameOver) return;
            
            this.handleDragMerge(startPos, endPos);
        });
    }

    handleGridTap(gridPos) {
        const cannon = this.entities.getCannon(gridPos.col, gridPos.row);
        
        if (cannon) {
            // Toggle cannon selection for merge
            this.toggleCannonSelection(cannon);
        } else {
            // Place new cannon
            this.placeCannon(gridPos.col, gridPos.row);
        }
    }

    placeCannon(col, row) {
        const cannonType = this.ui.getSelectedCannonType();
        const cannonDef = CANNON_TYPES[cannonType];
        
        // Check if in defense zone
        if (!this.ui.isInDefenseZone(row)) {
            this.particles.createWarningEffect(col, row, '❌');
            return;
        }
        
        // Check if position occupied
        if (this.entities.getCannon(col, row)) {
            return;
        }
        
        // Check if can afford
        const actualCost = typeof calculateTowerCost === 'function' ? 
                          calculateTowerCost(cannonType, 1) : cannonDef.cost;
        if (this.state.coins < actualCost) {
            this.particles.createWarningEffect(col, row, '💰');
            return;
        }
        
        // Check cannon limit
        if (this.entities.cannons.length >= this.state.cannonLimit) {
            this.particles.createWarningEffect(col, row, 'FULL!');
            return;
        }
        
        // Place cannon
        this.state.coins -= actualCost;
        this.entities.addCannon(col, row, cannonType);
        this.particles.createPlacementEffect(col, row);
        
        // Track for XP system
        this.state.towersPlaced++;
        
        // Play sound feedback (if audio system added later)
    }

    toggleCannonSelection(cannon) {
        const index = this.state.selectedCannons.indexOf(cannon);
        
        if (index >= 0) {
            // Deselect
            cannon.selected = false;
            this.state.selectedCannons.splice(index, 1);
        } else {
            // Select
            cannon.selected = true;
            this.state.selectedCannons.push(cannon);
            
            // Check for auto-merge (3 of same type and level)
            if (this.state.selectedCannons.length === 3) {
                this.checkMerge();
            }
        }
    }

    checkMerge() {
        const selected = this.state.selectedCannons;
        
        if (selected.length !== 3) return;
        
        const first = selected[0];
        const allSame = selected.every(c => 
            c.type === first.type && c.level === first.level
        );
        
        if (allSame && first.level < MERGE_LEVELS.length) {
            // MERGE!
            this.performMerge(selected);
        } else {
            // Not compatible - deselect all
            this.deselectAll();
            this.particles.createWarningEffect(first.col, first.row, '❌ NO MATCH');
        }
    }

    performMerge(cannons) {
        // Use position of the last selected cannon
        const targetCannon = cannons[cannons.length - 1];
        const col = targetCannon.col;
        const row = targetCannon.row;
        const type = targetCannon.type;
        const newLevel = targetCannon.level + 1;
        
        // Remove all selected cannons
        cannons.forEach(cannon => {
            this.entities.removeCannon(cannon);
        });
        
        // Create upgraded cannon at target position
        const newCannon = this.entities.addCannon(col, row, type);
        newCannon.level = newLevel;
        newCannon.updateStats();
        
        // Update highest level reached
        if (newLevel > this.state.highestLevel) {
            this.state.highestLevel = newLevel;
        }
        
        // Visual feedback
        this.particles.createMergeEffect(col, row);
        
        // Score bonus
        const mergeBonus = Math.floor(100 * Math.pow(2, newLevel - 1));
        this.state.score += mergeBonus;
        this.particles.emit(col, row, {
            text: `+${Utils.formatNumber(mergeBonus)}`,
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -2,
            life: 1.5,
            scale: 1.5,
            glow: true
        });
        
        // Track merges for XP system
        this.state.towerMerges++;
        
        // Clear selection
        this.deselectAll();
    }

    handleDragMerge(startPos, endPos) {
        // Advanced merge: drag cannon onto another to attempt merge
        const sourceCannon = this.entities.getCannon(startPos.col, startPos.row);
        const targetCannon = this.entities.getCannon(endPos.col, endPos.row);
        
        if (!sourceCannon) return;
        
        if (targetCannon) {
            // Try to merge source into target
            if (sourceCannon.canMergeWith(targetCannon)) {
                // Need to find third matching cannon nearby
                const matchingCannons = this.findMatchingCannons(sourceCannon);
                
                if (matchingCannons.length >= 2) {
                    // Auto-select and merge
                    const toMerge = [sourceCannon, targetCannon, matchingCannons[0]];
                    this.state.selectedCannons = toMerge;
                    this.performMerge(toMerge);
                }
            }
        } else {
            // Move cannon to new position if valid
            if (this.ui.isInDefenseZone(endPos.row) && 
                this.ui.isValidGridPos(endPos)) {
                sourceCannon.col = endPos.col;
                sourceCannon.row = endPos.row;
                this.particles.emit(endPos.col, endPos.row, {
                    text: '↔️',
                    color: CONFIG.COLORS.TEXT_PRIMARY,
                    vy: -0.5,
                    life: 0.5
                });
            }
        }
    }

    findMatchingCannons(cannon) {
        return this.entities.cannons.filter(c => 
            c !== cannon && c.canMergeWith(cannon)
        );
    }

    deselectAll() {
        this.state.selectedCannons.forEach(c => c.selected = false);
        this.state.selectedCannons = [];
    }

    // ========== WAVE MANAGEMENT ==========
    
    updateWaveSystem(dt, currentTime) {
        // Start first wave
        if (!this.state.waveInProgress && this.state.wave === 1) {
            this.startWave();
        }
        
        // Spawn zombies
        if (this.state.waveInProgress) {
            if (this.state.waveZombiesSpawned < this.state.waveZombiesTotal) {
                const timeSinceLastSpawn = currentTime - this.state.lastSpawnTime;
                
                if (timeSinceLastSpawn >= CONFIG.SPAWN_INTERVAL) {
                    this.spawnZombie();
                    this.state.lastSpawnTime = currentTime;
                }
            }
            
            // Check if wave completed
            if (this.state.waveZombiesSpawned >= this.state.waveZombiesTotal && 
                this.entities.zombies.length === 0) {
                this.completeWave();
            }
        }
    }

    startWave() {
        this.state.waveInProgress = true;
        this.state.waveZombiesSpawned = 0;
        
        // ZOMBIE COUNT RIDOTTO - Wave più veloci e intense
        const zombieScalingFactor = 2.5; // Ridotto da 5.0
        const zombieGrowthRate = 8.0; // Ridotto da 18.0
        const additionalZombies = Math.floor(
            Math.log10(1 + (this.state.wave - 1) * zombieScalingFactor) * zombieGrowthRate
        );
        this.state.waveZombiesTotal = CONFIG.BASE_WAVE_ZOMBIES + additionalZombies;
        
        this.state.lastSpawnTime = performance.now();
        
        // Wave announcement
        this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 2, {
            text: `⚔️ WAVE ${this.state.wave} ⚔️`,
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -0.5,
            life: 2.0,
            scale: 2.0,
            glow: true
        });
    }

    spawnZombie() {
        const col = Utils.randomInt(0, CONFIG.COLS - 1);
        const type = this.selectZombieType();
        
        // Passa il numero della wave per applicare lo scaling logaritmico
        this.entities.addZombie(col, type, this.state.wave);
        this.state.waveZombiesSpawned++;
    }

    selectZombieType() {
        const wave = this.state.wave;
        
        // Progressive difficulty con NEMICI TATTICI SPECIALIZZATI
        const options = [
            { value: 'NORMAL', weight: Math.max(5, 15 - wave) },
            { value: 'FAST', weight: wave >= 2 ? 12 + wave : 0 },
            { value: 'TANK', weight: wave >= 3 ? 8 + Math.floor(wave / 2) : 0 },
            { value: 'AGILE', weight: wave >= 4 ? 10 + Math.floor(wave / 2) : 0 },
            { value: 'ARMORED', weight: wave >= 5 ? 6 + Math.floor(wave / 3) : 0 },
            { value: 'BOSS', weight: wave >= 8 && wave % 4 === 0 ? 3 : 0 },
            
            // TACTICAL VARIANTS - richiedono strategie specifiche
            { value: 'HEALER', weight: wave >= 5 ? 4 + Math.floor(wave / 4) : 0 },  // Priority target
            { value: 'SHIELDED', weight: wave >= 6 ? 6 + Math.floor(wave / 3) : 0 }, // Needs sustained fire
            { value: 'SPLITTER', weight: wave >= 7 ? 5 + Math.floor(wave / 4) : 0 }, // AoE counter
            { value: 'PHASER', weight: wave >= 8 ? 4 + Math.floor(wave / 5) : 0 }    // Fast reaction
        ];
        
        return Utils.weightedRandom(options.filter(o => o.weight > 0));
    }

    completeWave() {
        this.state.waveInProgress = false;
        
        // WAVE REWARDS - Più generose all'inizio
        const baseReward = 20; // Aumentato da 10
        const rewardScalingFactor = 1.0;
        const rewardGrowthRate = 0.8; // Aumentato da 0.4
        const logMultiplier = 1.0 + Math.log10(1 + (this.state.wave - 1) * rewardScalingFactor) * rewardGrowthRate;
        const waveBonus = Math.floor(baseReward * logMultiplier * 0.6); // *0.6 invece di *0.3
        
        const energyBonus = Math.floor(this.state.energy / 15); // Cambiato da /30 a /15
        const totalReward = baseReward + waveBonus + energyBonus;
        
        this.state.coins += totalReward;
        this.state.score += waveBonus * 2;
        this.state.coinsEarned += totalReward; // Track for XP system
        
        // Heal energy
        this.state.energy = Math.min(CONFIG.INITIAL_ENERGY, this.state.energy + 20);
        
        // Visual feedback
        this.particles.createWaveClearEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2);
        this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 + 1, {
            text: `+${totalReward} 💰`,
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -1,
            life: 2.0,
            scale: 1.5,
            glow: true
        });
        
        // Next wave after delay
        setTimeout(() => {
            if (!this.state.isGameOver) {
                this.state.wave++;
                this.startWave();
            }
        }, 1500); // Ridotto da 3000 a 1500ms - wave più veloci
    }

    // ========== COMBAT SYSTEM ==========
    
    updateCombat(dt, currentTime) {
        // HEALER healing system
        this.entities.zombies.forEach(healer => {
            if (healer.isHealer && currentTime - healer.lastHealTime >= healer.healInterval) {
                healer.lastHealTime = currentTime;
                
                // Find zombies in heal range
                let healedCount = 0;
                this.entities.zombies.forEach(target => {
                    if (target === healer || target.hp >= target.maxHp) return;
                    
                    const dist = Utils.distance(healer.col, healer.row, target.col, target.row);
                    if (dist <= healer.healRange) {
                        target.hp = Math.min(target.maxHp, target.hp + healer.healAmount);
                        healedCount++;
                        
                        // Visual feedback
                        this.particles.emit(target.col, target.row, {
                            text: `+${healer.healAmount}💚`,
                            color: '#00ff88',
                            vy: -0.8,
                            life: 0.8,
                            scale: 0.9
                        });
                    }
                });
                
                if (healedCount > 0) {
                    // Healer pulse effect
                    this.particles.emit(healer.col, healer.row, {
                        text: '✨',
                        color: '#00ffaa',
                        vy: -0.5,
                        life: 0.5,
                        scale: 1.2
                    });
                }
            }
        });
        
        // Cannons fire at zombies
        this.entities.cannons.forEach(cannon => {
            if (!cannon.canFire(currentTime)) return;
            
            // Find target
            const target = this.findTarget(cannon);
            
            if (target) {
                cannon.fire(currentTime, target);
                this.entities.fireProjectile(cannon, target);
            }
        });
        
        // Check projectile collisions
        this.checkProjectileCollisions(currentTime);
    }

    findTarget(cannon) {
        let bestTarget = null;
        let bestScore = -Infinity;
        
        for (const zombie of this.entities.zombies) {
            const dist = Utils.distance(cannon.col, cannon.row, zombie.col, zombie.row);
            
            if (dist <= cannon.range) {
                // Prioritize zombies further along the path
                const progressScore = zombie.row * 10;
                const healthScore = -zombie.hp; // Prefer low health
                const score = progressScore + healthScore;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = zombie;
                }
            }
        }
        
        return bestTarget;
    }

    checkProjectileCollisions(currentTime) {
        const projectiles = this.entities.projectilePool.active;
        
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            if (!proj.active) continue;
            
            // Check collision with zombies
            for (const zombie of this.entities.zombies) {
                if (proj.hasHitTarget(zombie)) continue;
                
                const dist = Utils.distance(proj.x, proj.y, zombie.col, zombie.row);
                
                if (dist < 0.4) {
                    // Check dodge
                    if (zombie.dodgeChance && Math.random() < zombie.dodgeChance) {
                        this.particles.emit(zombie.col, zombie.row, {
                            text: 'DODGE!',
                            color: CONFIG.COLORS.TEXT_WARNING,
                            vy: -1,
                            life: 0.5,
                            scale: 0.8
                        });
                        proj.addPiercedTarget(zombie);
                        continue;
                    }
                    
                    // Hit!
                    this.damageZombie(zombie, proj, currentTime);
                    
                    // Handle special effects
                    if (proj.splashRadius > 0) {
                        this.applySplashDamage(zombie, proj, currentTime);
                    }
                    
                    if (proj.chainTargets > 0) {
                        this.applyChainDamage(zombie, proj, currentTime);
                    }
                    
                    // Mark projectile as hit (unless piercing)
                    if (proj.piercing > 0) {
                        proj.addPiercedTarget(zombie);
                    } else {
                        proj.active = false;
                    }
                    
                    break;
                }
            }
        }
    }

    damageZombie(zombie, proj, currentTime) {
        // Apply tower effectiveness multiplier
        const cannonType = proj.cannonType || 'BASIC';
        const cannonConfig = CANNON_TYPES[cannonType];
        const effectiveness = (cannonConfig.effectiveness && cannonConfig.effectiveness[zombie.type]) || 1.0;
        
        const baseDamage = proj.damage * effectiveness;
        const actualDamage = zombie.takeDamage(baseDamage, currentTime);
        
        // Visual feedback with effectiveness indicator
        if (effectiveness >= 1.5) {
            this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage, '#00ff00'); // Green for effective
        } else if (effectiveness <= 0.7) {
            this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage, '#888888'); // Gray for ineffective
        } else {
            this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage);
        }
        
        // Apply slow effect
        if (proj.slowFactor > 0) {
            zombie.applySlow(proj.slowFactor, proj.slowDuration, currentTime);
            this.particles.createFreezeEffect(zombie.col, zombie.row);
        }
        
        // Check death
        if (zombie.isDead()) {
            this.killZombie(zombie);
        }
    }

    applySplashDamage(epicenter, proj, currentTime) {
        this.particles.createExplosion(epicenter.col, epicenter.row, proj.splashRadius, proj.color);
        
        for (const zombie of this.entities.zombies) {
            if (zombie === epicenter) continue;
            
            const dist = Utils.distance(epicenter.col, epicenter.row, zombie.col, zombie.row);
            
            if (dist <= proj.splashRadius) {
                const splashDamage = proj.damage * 0.5;
                zombie.takeDamage(splashDamage);
                this.particles.createDamageNumber(zombie.col, zombie.row, splashDamage);
                
                if (zombie.isDead()) {
                    this.killZombie(zombie);
                }
            }
        }
    }

    applyChainDamage(source, proj, currentTime) {
        let currentTarget = source;
        let chainsLeft = proj.chainTargets;
        const hitTargets = [source];
        
        while (chainsLeft > 0) {
            let nearestTarget = null;
            let nearestDist = Infinity;
            
            for (const zombie of this.entities.zombies) {
                if (hitTargets.includes(zombie)) continue;
                
                const dist = Utils.distance(currentTarget.col, currentTarget.row, zombie.col, zombie.row);
                
                if (dist < 3 && dist < nearestDist) {
                    nearestDist = dist;
                    nearestTarget = zombie;
                }
            }
            
            if (!nearestTarget) break;
            
            // Chain to next target
            this.particles.createLightningEffect(nearestTarget.col, nearestTarget.row);
            
            const chainDamage = proj.damage * 0.7;
            nearestTarget.takeDamage(chainDamage);
            this.particles.createDamageNumber(nearestTarget.col, nearestTarget.row, chainDamage);
            
            if (nearestTarget.isDead()) {
                this.killZombie(nearestTarget);
            }
            
            hitTargets.push(nearestTarget);
            currentTarget = nearestTarget;
            chainsLeft--;
        }
    }

    killZombie(zombie) {
        // SPLITTER ability: spawn smaller enemies on death
        if (zombie.canSplit && zombie.splitCount > 0) {
            const splitType = zombie.splitType;
            const splitHp = ZOMBIE_TYPES[splitType].hp * zombie.splitHpPercent;
            
            for (let i = 0; i < zombie.splitCount; i++) {
                const newZombie = this.entities.addZombie(zombie.col, splitType, this.state.wave);
                newZombie.hp = splitHp;
                newZombie.maxHp = splitHp;
                newZombie.row = zombie.row;
                
                // Spread them out slightly
                newZombie.col += (Math.random() - 0.5) * 0.5;
            }
            
            this.particles.emit(zombie.col, zombie.row, {
                text: 'SPLIT!',
                color: '#ff00ff',
                vy: -1.5,
                life: 1.0,
                scale: 1.2
            });
        }
        
        // Rewards
        this.state.coins += zombie.reward;
        this.state.kills++;
        
        const scoreReward = Math.floor(zombie.reward * this.state.wave * 1.5);
        this.state.score += scoreReward;
        
        // Visual feedback
        this.particles.createDeathEffect(zombie.col, zombie.row, zombie.icon);
        this.particles.createCoinReward(zombie.col, zombie.row, zombie.reward);
        
        // Remove zombie
        this.entities.removeZombie(zombie);
    }

    // ========== ENERGY SYSTEM ==========
    
    updateEnergy(dt) {
        // Check zombies past defense line
        let zombiesPastLine = 0;
        
        for (const zombie of this.entities.zombies) {
            if (zombie.isPastDefenseLine()) {
                zombiesPastLine++;
            }
        }
        
        if (zombiesPastLine > 0) {
            // Drain energy
            this.state.energy -= CONFIG.ENERGY_DRAIN_PER_ZOMBIE * zombiesPastLine * dt;
            
            if (this.state.energy <= 0) {
                this.state.energy = 0;
                this.gameOver();
            }
        } else {
            // Regen energy slowly when safe
            this.state.energy = Math.min(
                CONFIG.INITIAL_ENERGY,
                this.state.energy + CONFIG.ENERGY_REGEN_RATE * dt
            );
        }
    }

    // ========== GAME FLOW ==========
    
    update(dt) {
        if (this.state.isPaused || this.state.isGameOver) return;
        
        const currentTime = performance.now();
        
        // Update systems
        this.updateWaveSystem(dt, currentTime);
        this.updateCombat(dt, currentTime);
        this.updateEnergy(dt);
        
        // Update entities
        this.entities.update(dt, currentTime);
        this.particles.update(dt);
        this.graphics.updateAnimation(dt);
        
        // Update play time
        this.state.playTime += dt;
        
        // Performance monitoring
        this.performanceMonitor.update();
    }

    render() {
        this.graphics.clear();
        this.graphics.drawGrid();
        
        // Render game entities
        this.entities.render(this.graphics, performance.now());
        this.particles.render(this.graphics);
        
        // Render UI
        this.ui.render(this.state);
        
        // Show game over popup if game is over
        if (this.state.isGameOver) {
            this.ui.showGameOver(this.state);
        }
        
        // Debug info (optional)
        if (window.location.search.includes('debug')) {
            this.renderDebugInfo();
        }
    }

    renderDebugInfo() {
        const counts = this.entities.getCounts();
        const fps = this.performanceMonitor.getFPS();
        
        const debug = [
            `FPS: ${fps}`,
            `Cannons: ${counts.cannons}`,
            `Zombies: ${counts.zombies}`,
            `Projectiles: ${counts.projectiles}`,
            `Particles: ${this.particles.getCount()}`
        ];
        
        let y = 10;
        debug.forEach(line => {
            this.graphics.drawText(line, 10, y, {
                size: 12,
                color: '#ffff00',
                shadow: true
            });
            y += 15;
        });
    }

    pause() {
        this.state.isPaused = true;
    }

    resume() {
        this.state.isPaused = false;
    }

    gameOver() {
        if (this.state.isGameOver) return;
        
        this.state.isGameOver = true;
        
        // Note: gameOver is now handled by main.js with complete session management
        // This ensures proper tracking of session duration and all XP metrics
    }

    restart() {
        // Reset everything
        this.state = this.createInitialState();
        this.entities.clear();
        this.particles.clear();
        this.deselectAll();
        this.ui.clearRetryButton();
        
        // Reset session state (handled entirely in main.js)
        if (window.resetGameSession) {
            window.resetGameSession();
        }
    }

    getState() {
        return this.state;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
