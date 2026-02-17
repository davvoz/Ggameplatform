import { EnemyFactory } from '../entities/Enemy.js';
import { getLevelData } from '../LevelData.js';

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

        const enemiesAlive = entities.enemies.filter(e => e.active).length;

        if (this.waveCleared) {
            this.waveDelay -= deltaTime;
            if (this.waveDelay <= 0) {
                if (this.currentWaveIndex < levelData.waves.length) {
                    this.spawnWave(levelData.waves[this.currentWaveIndex], levelData.speedMult);
                    this.currentWaveIndex++;
                    this.waveCleared = false;
                } else if (enemiesAlive === 0) {
                    const miniBossType = levelData.miniboss || (((g.levelManager.currentLevel - 1) % 4) + 1);
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
        g.postProcessing.shake(3, 2.0);
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
        g.postProcessing.shake(3, 0.3);
        g.sound.playExplosionBig();
    }

    onEnemyKilled(enemy) {
        this.game.scoreManager.onEnemyKilled(enemy);
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
