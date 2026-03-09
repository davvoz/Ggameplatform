import { EnemyFactory } from '../entities/Enemy.js';
import { getLevelData } from '../LevelDataFacade.js';

class WaveManager {
    constructor(game) {
        this.game = game;
        this.currentWaveIndex = 0;
        this.waveDelay = 0;
        this.waveCleared = true;
        this.miniBossNotification = null;
        this._pendingBoss = null;
    }

    updateWaves(deltaTime) {
        const g = this.game;
        const entities = g.entityManager;
        const levelData = getLevelData(g.levelManager.currentLevel);
        if (!levelData) return;

        if (this.miniBossNotification) {
            this.miniBossNotification.timer -= deltaTime;
            if (this.miniBossNotification.timer <= 0) this.miniBossNotification = null;
        }

        if (entities.bossActive) {
            if (entities.boss && !entities.boss.active) {
                entities.bossActive = false;
                entities.boss = null;
                g.levelManager.onLevelComplete();
            }
            return;
        }

        if (entities.miniBossActive) {
            if (entities.miniBoss && !entities.miniBoss.active) {
                g.scoreManager.onMiniBossKilled();
                entities.miniBossActive = false;
                entities.miniBoss = null;

                if (levelData.boss) {
                    this.waveDelay = 2;
                    this.waveCleared = true;
                    this._pendingBoss = levelData.boss;
                } else {
                    g.levelManager.onLevelComplete();
                }
            }
            return;
        }

        if (this._pendingBoss) {
            this.waveDelay -= deltaTime;
            if (this.waveDelay <= 0) {
                this.spawnBoss(this._pendingBoss);
                this._pendingBoss = null;
            }
            return;
        }

        const enemiesAlive = entities.enemies.filter(e => e.active && !e._isAlly).length;

        if (this.waveCleared) {
            this.waveDelay -= deltaTime;
            if (this.waveDelay <= 0) {
                if (this.currentWaveIndex < levelData.waves.length) {
                    this.spawnWave(levelData.waves[this.currentWaveIndex], levelData.speedMult);
                    this.currentWaveIndex++;
                    this.waveCleared = false;
                } else if (enemiesAlive === 0) {
                    // Miniboss alternation: cycle through available types per world
                    const lvl = g.levelManager.currentLevel;
                    let miniBossType;
                    if (levelData.miniboss) {
                        miniBossType = levelData.miniboss;
                    } else if (lvl > 90) {
                        // World 4: cycle through types 13-16
                        miniBossType = 13 + (((lvl - 91) % 4));
                    } else if (lvl > 60) {
                        // World 3: cycle through types 9-12
                        miniBossType = 9 + (((lvl - 61) % 4));
                    } else if (lvl > 30) {
                        // World 2: cycle through types 5-8
                        miniBossType = 5 + (((lvl - 31) % 4));
                    } else {
                        // World 1: cycle through types 1-4
                        miniBossType = ((lvl - 1) % 4) + 1;
                    }
                    this.spawnMiniBoss(miniBossType);
                }
            }
        } else {
            if (enemiesAlive === 0) {
                this.waveCleared = true;
                const nextWave = levelData.waves[this.currentWaveIndex];
                this.waveDelay = nextWave ? nextWave.delay : 1;

                if (this.currentWaveIndex >= levelData.waves.length) {
                    this.waveDelay = 1.5;
                    this.waveCleared = true;
                    this.currentWaveIndex = levelData.waves.length;
                }
            }
        }
    }

    spawnWave(wave, speedMult) {
        const g = this.game;
        const spawned = EnemyFactory.spawnFormationWave(wave, g.logicalWidth, speedMult, g.difficulty, g.levelManager.currentLevel);
        g.entityManager.enemies.push(...spawned);
    }

    spawnBoss(bossLevel) {
        const g = this.game;
        const entities = g.entityManager;
        entities.bossActive = true;
        const x = g.logicalWidth / 2 - 95;
        entities.boss = EnemyFactory.createBoss(x, -200, bossLevel, g.logicalWidth, g.difficulty, g.levelManager.currentLevel);
        g.sound.playBossWarning();
        // W4 bosses (19-24): stronger entrance
        const isW4 = bossLevel >= 19 && bossLevel <= 24;
        g.postProcessing.shake(isW4 ? 5 : 3, isW4 ? 2.5 : 2.0);
        if (isW4) {
            // Mark boss for warp-in animation
            entities.boss._warpInTimer = 0;
            entities.boss._warpInDuration = 1.8;
        }
    }

    spawnMiniBoss(miniBossType) {
        const g = this.game;
        const entities = g.entityManager;
        entities.miniBossActive = true;
        const x = g.logicalWidth / 2 - 55;
        entities.miniBoss = EnemyFactory.createMiniBoss(x, -120, miniBossType, g.logicalWidth, g.difficulty, g.levelManager.currentLevel);
        this.miniBossNotification = {
            text: `★ ${entities.miniBoss.name.toUpperCase()} ★`,
            timer: 2.0,
            color: entities.miniBoss.def.color,
            maxTimer: 2.0
        };
        // W4 mini-bosses (13-16): warp-in effect
        const isW4Mini = miniBossType >= 13 && miniBossType <= 16;
        g.postProcessing.shake(isW4Mini ? 4 : 3, isW4Mini ? 0.6 : 0.3);
        g.sound.playExplosionBig();
        if (isW4Mini) {
            entities.miniBoss._warpInTimer = 0;
            entities.miniBoss._warpInDuration = 1.2;
        }
    }

    onEnemyKilled(enemy) {
        this.game.scoreManager.onEnemyKilled(enemy);

        const perks = this.game.perkSystem;
        if (!perks) return;

        // Entropy Shield: track kills for auto-shield
        if (perks.getEntropyShieldKills() < Infinity) {
            perks.entropyShieldKills++;
        }

        // Data Leech: chance for double score
        if (perks.getDataLeechChance() > 0 && Math.random() < perks.getDataLeechChance()) {
            this.game.scoreManager.onEnemyKilled(enemy); // extra score credit
        }
    }

    onBossKilled() {
        this.game.scoreManager.onBossKilled();
    }

    reset() {
        this.currentWaveIndex = 0;
        this.waveDelay = 2;
        this.waveCleared = true;
        this.miniBossNotification = null;
        this._pendingBoss = null;
    }

    resetForLevel() {
        this.currentWaveIndex = 0;
        this.waveCleared = true;
        this.waveDelay = 2;
        this.miniBossNotification = null;
        this._pendingBoss = null;
    }
}

export default WaveManager;
