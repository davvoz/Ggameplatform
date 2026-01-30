/**
 * Survivor Arena - Enemy Spawner
 * @fileoverview Handles enemy spawning logic and waves
 */

'use strict';

class Spawner {
    /**
     * @param {Game} game - Game reference
     */
    constructor(game) {
        this.game = game;
        this.arenaWidth = CONFIG.ARENA.WIDTH;
        this.arenaHeight = CONFIG.ARENA.HEIGHT;
        
        // Spawn timing
        this.spawnRate = CONFIG.SPAWNING.INITIAL_SPAWN_RATE;
        this.spawnTimer = 0;
        
        // Wave system
        this.waveNumber = 0;
        this.waveSize = CONFIG.SPAWNING.WAVE_SIZE_BASE;
        this.enemiesInWave = 0;
        
        // Special wave system
        this.specialWaveTimer = 0;
        this.hordeTimer = 0;
        this.hordeCount = 0;
        this.isHordeActive = false;
        
        // Difficulty tracking
        this.gameTime = 0;
        this.difficultyMultipliers = { ...DIFFICULTY_SCALING[0] };
        
        // Boss spawning
        this.lastMiniBossTime = 0;
        this.lastBossTime = 0;
        this.bossWarningShown = false;
        
        // Enemy type weights (adjusted over time)
        this.enemyWeights = this.getInitialWeights();
    }

    /**
     * Get initial enemy spawn weights
     * @returns {Object}
     */
    getInitialWeights() {
        const weights = {};
        for (const [type, config] of Object.entries(CONFIG.ENEMIES)) {
            weights[type] = config.spawnWeight || 0;
        }
        return weights;
    }

    /**
     * Update difficulty multipliers based on game time
     */
    updateDifficulty() {
        const timeSeconds = Math.floor(this.gameTime);
        
        // Find appropriate difficulty tier
        let lastTier = DIFFICULTY_SCALING[0];
        for (const [time, multipliers] of Object.entries(DIFFICULTY_SCALING)) {
            if (timeSeconds >= parseInt(time)) {
                lastTier = multipliers;
            }
        }
        
        this.difficultyMultipliers = { ...lastTier };
        
        // Update spawn rate
        const minutesPassed = this.gameTime / 60;
        this.spawnRate = Math.max(
            CONFIG.SPAWNING.MIN_SPAWN_RATE,
            CONFIG.SPAWNING.INITIAL_SPAWN_RATE - (minutesPassed * CONFIG.SPAWNING.SPAWN_RATE_DECREASE * 60)
        );
        
        // Update wave size
        this.waveSize = CONFIG.SPAWNING.WAVE_SIZE_BASE + Math.floor(minutesPassed * CONFIG.SPAWNING.WAVE_SIZE_GROWTH);
        
        // Adjust enemy weights based on time
        this.adjustEnemyWeights();
    }

    /**
     * Adjust enemy spawn weights based on game time
     */
    adjustEnemyWeights() {
        const minutesPassed = this.gameTime / 60;
        
        // Reduce basic enemies, increase special types over time
        this.enemyWeights.basic = Math.max(10, 40 - minutesPassed * 3);
        this.enemyWeights.fast = Math.min(35, 25 + minutesPassed * 1);
        this.enemyWeights.tank = Math.min(25, 15 + minutesPassed * 1);
        this.enemyWeights.ranged = Math.min(20, 12 + minutesPassed * 1);
        this.enemyWeights.exploder = Math.min(15, 8 + minutesPassed * 1);
    }

    /**
     * Update spawner - spawns enemies directly into game arrays
     * @param {number} deltaTime 
     * @param {number} currentGameTime 
     */
    update(deltaTime, currentGameTime) {
        this.gameTime = currentGameTime;
        this.updateDifficulty();
        
        const currentEnemyCount = this.game.enemies.length;
        const deltaMs = deltaTime * 1000;
        
        // Check max enemies
        if (currentEnemyCount >= CONFIG.SPAWNING.MAX_ENEMIES) {
            return;
        }
        
        // Regular enemy spawning
        this.spawnTimer += deltaMs;
        
        if (this.spawnTimer >= this.spawnRate / this.difficultyMultipliers.spawnRate) {
            this.spawnTimer = 0;
            
            // Spawn a wave of enemies
            const enemiesToSpawn = Math.min(
                this.waveSize,
                CONFIG.SPAWNING.MAX_ENEMIES - currentEnemyCount
            );
            
            for (let i = 0; i < enemiesToSpawn; i++) {
                this.spawnEnemy();
            }
            
            this.waveNumber++;
        }
        
        // Special wave timer (every 45 seconds, after 30s of game)
        this.specialWaveTimer += deltaMs;
        if (this.specialWaveTimer >= CONFIG.SPAWNING.WAVE_INTERVAL && this.gameTime > 30) {
            this.specialWaveTimer = 0;
            this.spawnSpecialWave();
        }
        
        // Horde timer (every 90 seconds, after 60s of game)
        this.hordeTimer += deltaMs;
        if (this.hordeTimer >= CONFIG.SPAWNING.HORDE_INTERVAL && this.gameTime > 60) {
            this.hordeTimer = 0;
            this.triggerHorde();
        }
        
        // Mini boss spawning (every 60 seconds after 30s)
        const timeSinceMiniBoss = (this.gameTime * 1000) - this.lastMiniBossTime;
        if (timeSinceMiniBoss >= CONFIG.MINI_BOSS.spawnInterval && 
            this.gameTime > 30 && 
            !this.game.miniBoss) {
            this.spawnMiniBoss();
            this.lastMiniBossTime = this.gameTime * 1000;
        }
        
        // Boss spawning (every 3 minutes after 2.5min)
        const timeSinceBoss = (this.gameTime * 1000) - this.lastBossTime;
        
        // Boss warning 3 seconds before spawn
        if (timeSinceBoss >= CONFIG.BOSS.spawnInterval - CONFIG.BOSS.warningDuration && 
            timeSinceBoss < CONFIG.BOSS.spawnInterval &&
            this.gameTime > 150 &&
            !this.bossWarningShown &&
            !this.game.boss) {
            this.game.ui.showBossWarning();
            this.game.events.emit('bossSpawn');
            this.bossWarningShown = true;
        }
        
        if (timeSinceBoss >= CONFIG.BOSS.spawnInterval && 
            this.gameTime > 150 &&
            !this.game.boss) {
            this.spawnBoss();
            this.lastBossTime = this.gameTime * 1000;
            this.bossWarningShown = false;
        }
    }
    
    /**
     * Spawn a special wave with stronger enemies
     */
    spawnSpecialWave() {
        const waveTypes = ['fast', 'tank', 'ranged', 'exploder'];
        const waveType = waveTypes[Math.floor(Math.random() * waveTypes.length)];
        const waveSize = 5 + Math.floor(this.gameTime / 30);
        
        // Announce wave
        if (this.game.ui) {
            this.game.ui.showWaveAnnouncement(`${waveType.toUpperCase()} WAVE!`, waveSize);
        }
        
        // Spawn enemies in a circle around player
        for (let i = 0; i < waveSize; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 / waveSize) * i + Math.random() * 0.5;
                const dist = CONFIG.SPAWNING.SPAWN_DISTANCE_MIN + Math.random() * 100;
                
                // Spawn relative to player - infinite world
                const x = this.game.player.x + Math.cos(angle) * dist;
                const y = this.game.player.y + Math.sin(angle) * dist;
                
                this.spawnEnemyAt(x, y, waveType, 'uncommon');
            }, i * 100);
        }
    }
    
    /**
     * Trigger a zombie horde
     */
    triggerHorde() {
        this.hordeCount++;
        const hordeSize = CONFIG.SPAWNING.HORDE_SIZE_BASE + (this.hordeCount * CONFIG.SPAWNING.HORDE_SIZE_GROWTH);
        
        // Announce horde
        if (this.game.ui) {
            this.game.ui.showWaveAnnouncement('🧟 ZOMBIE HORDE! 🧟', hordeSize);
        }
        
        // Play horde sound
        if (this.game.audio) {
            this.game.audio.play('horde');
        }
        
        // Spawn horde from all directions
        for (let i = 0; i < hordeSize; i++) {
            setTimeout(() => {
                const side = Math.floor(Math.random() * 4);
                let x, y;
                
                switch(side) {
                    case 0: // Top
                        x = Math.random() * this.arenaWidth;
                        y = 50;
                        break;
                    case 1: // Right
                        x = this.arenaWidth - 50;
                        y = Math.random() * this.arenaHeight;
                        break;
                    case 2: // Bottom
                        x = Math.random() * this.arenaWidth;
                        y = this.arenaHeight - 50;
                        break;
                    case 3: // Left
                    default:
                        x = 50;
                        y = Math.random() * this.arenaHeight;
                        break;
                }
                
                // Mix of enemy types with higher rarity chance during hordes
                const types = ['basic', 'basic', 'fast', 'fast', 'tank'];
                const type = types[Math.floor(Math.random() * types.length)];
                const rarity = this.selectRarity(true); // Higher rarity during horde
                
                this.spawnEnemyAt(x, y, type, rarity);
            }, i * 50);
        }
    }
    
    /**
     * Select enemy rarity based on weights and time
     * @param {boolean} boosted - Whether to boost rare chances
     * @returns {string}
     */
    selectRarity(boosted = false) {
        const rarities = CONFIG.SPAWNING.RARITY;
        let totalWeight = 0;
        const adjustedWeights = {};
        
        // Adjust weights based on game time
        const timeFactor = Math.min(this.gameTime / 300, 1); // Max boost at 5 minutes
        
        for (const [rarity, data] of Object.entries(rarities)) {
            let weight = data.weight;
            
            // Increase rare enemy chances over time
            if (rarity !== 'common') {
                weight *= (1 + timeFactor * 2);
                if (boosted) weight *= 2;
            } else {
                weight *= (1 - timeFactor * 0.5);
            }
            
            adjustedWeights[rarity] = weight;
            totalWeight += weight;
        }
        
        let random = Math.random() * totalWeight;
        
        for (const [rarity, weight] of Object.entries(adjustedWeights)) {
            random -= weight;
            if (random <= 0) {
                return rarity;
            }
        }
        
        return 'common';
    }

    /**
     * Spawn a regular enemy
     */
    spawnEnemy() {
        // Select enemy type based on weights
        const type = this.selectEnemyType();
        
        // Calculate spawn position (outside screen, around player)
        const position = this.getSpawnPosition();
        
        // Select rarity
        const rarity = this.selectRarity();
        
        this.spawnEnemyAt(position.x, position.y, type, rarity);
    }
    
    /**
     * Spawn enemy at specific position with type and rarity
     * @param {number} x 
     * @param {number} y 
     * @param {string} type 
     * @param {string} rarity 
     */
    spawnEnemyAt(x, y, type, rarity = 'common') {
        const rarityData = CONFIG.SPAWNING.RARITY[rarity] || CONFIG.SPAWNING.RARITY.common;
        
        // Create enemy with difficulty scaling
        const enemy = new Enemy(x, y, type);
        
        // Apply difficulty multipliers
        enemy.health *= this.difficultyMultipliers.enemyHealth * rarityData.healthMult;
        enemy.maxHealth = enemy.health;
        enemy.damage *= this.difficultyMultipliers.enemyDamage * rarityData.damageMult;
        enemy.speed *= this.difficultyMultipliers.enemySpeed;
        
        // Apply rarity visual
        enemy.rarity = rarity;
        if (rarityData.color) {
            enemy.rarityColor = rarityData.color;
            enemy.rarityGlow = true;
        }
        
        // Apply XP multiplier
        enemy.xpValue = Math.floor(enemy.xpValue * rarityData.xpMult);
        enemy.scoreValue = Math.floor(enemy.scoreValue * rarityData.xpMult);
        
        // Set target to player
        enemy.setTarget(this.game.player);
        
        this.game.enemies.push(enemy);
        return enemy;
    }

    /**
     * Select enemy type based on weights
     * @returns {string}
     */
    selectEnemyType() {
        const totalWeight = Object.values(this.enemyWeights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (const [type, weight] of Object.entries(this.enemyWeights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }
        
        return 'basic';
    }

    /**
     * Wrap coordinate for seamless toroidal world
     * @param {number} value 
     * @param {number} max 
     * @returns {number}
     */
    wrapCoordinate(value, max) {
        return ((value % max) + max) % max;
    }
    
    /**
     * Get spawn position around player (with wrapping for seamless toroidal world)
     * @returns {{x: number, y: number}}
     */
    getSpawnPosition() {
        const player = this.game.player;
        const minDist = CONFIG.SPAWNING.SPAWN_DISTANCE_MIN;
        const maxDist = CONFIG.SPAWNING.SPAWN_DISTANCE_MAX;
        
        // Random angle
        const angle = Math.random() * Math.PI * 2;
        
        // Random distance
        const distance = MathUtils.randomRange(minDist, maxDist);
        
        // Spawn relative to player with wrapping for seamless toroidal world
        let x = player.x + Math.cos(angle) * distance;
        let y = player.y + Math.sin(angle) * distance;
        
        // Wrap to arena bounds
        x = this.wrapCoordinate(x, this.arenaWidth);
        y = this.wrapCoordinate(y, this.arenaHeight);
        
        return { x, y };
    }

    /**
     * Spawn mini boss
     */
    spawnMiniBoss() {
        const position = this.getSpawnPosition();
        
        const miniBoss = new MiniBoss(position.x, position.y);
        miniBoss.health *= this.difficultyMultipliers.enemyHealth;
        miniBoss.maxHealth = miniBoss.health;
        miniBoss.damage *= this.difficultyMultipliers.enemyDamage;
        miniBoss.setTarget(this.game.player);
        
        this.game.miniBoss = miniBoss;
    }

    /**
     * Spawn boss (relative to player for seamless toroidal world)
     */
    spawnBoss() {
        // Boss spawns at distance from player (like regular spawns but farther)
        const player = this.game.player;
        const angle = Math.random() * Math.PI * 2;
        const distance = 600; // Spawn boss farther away
        
        let x = player.x + Math.cos(angle) * distance;
        let y = player.y + Math.sin(angle) * distance;
        
        // Wrap to arena bounds
        x = this.wrapCoordinate(x, this.arenaWidth);
        y = this.wrapCoordinate(y, this.arenaHeight);
        
        const boss = new Boss(x, y);
        boss.health *= this.difficultyMultipliers.enemyHealth;
        boss.maxHealth = boss.health;
        boss.damage *= this.difficultyMultipliers.enemyDamage;
        boss.setTarget(this.game.player);
        
        this.game.boss = boss;
        this.game.ui.hideBossWarning();
    }

    /**
     * Spawn enemies around a specific position (for mini-boss summon)
     * @param {number} x 
     * @param {number} y 
     * @param {number} count 
     */
    spawnSummonedEnemies(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const dist = 50 + Math.random() * 30;
            
            const enemy = new Enemy(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                'basic'
            );
            enemy.setTarget(this.game.player);
            
            this.game.enemies.push(enemy);
        }
    }

    /**
     * Get current difficulty info for UI
     * @returns {Object}
     */
    getDifficultyInfo() {
        return {
            waveNumber: this.waveNumber,
            spawnRate: this.spawnRate,
            difficultyMultipliers: this.difficultyMultipliers,
            gameTime: this.gameTime
        };
    }

    /**
     * Reset spawner for new game
     */
    reset() {
        this.spawnRate = CONFIG.SPAWNING.INITIAL_SPAWN_RATE;
        this.spawnTimer = 0;
        this.waveNumber = 0;
        this.waveSize = CONFIG.SPAWNING.WAVE_SIZE_BASE;
        this.gameTime = 0;
        this.difficultyMultipliers = { ...DIFFICULTY_SCALING[0] };
        this.lastMiniBossTime = 0;
        this.lastBossTime = 0;
        this.enemyWeights = this.getInitialWeights();
        this.specialWaveTimer = 0;
        this.hordeTimer = 0;
        this.hordeCount = 0;
        this.isHordeActive = false;
        this.bossWarningShown = false;
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Spawner;
}
