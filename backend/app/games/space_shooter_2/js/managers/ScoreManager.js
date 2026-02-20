import Explosion from '../entities/Explosion.js';
import PowerUp from '../entities/PowerUp.js';

class ScoreManager {
    constructor(game) {
        this.game = game;
        this.score = 0;
        this.totalPoints = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.totalEnemiesKilled = 0;
    }

    addScore(points) {
        const adjusted = Math.round(points * this.game.difficulty.scoreMultiplier);
        this.score += adjusted;
        this.totalPoints += adjusted;
        this.game.levelManager.levelPointsEarned += adjusted;
    }

    updateCombo(deltaTime) {
        if (this.combo > 0) {
            this.comboTimer -= deltaTime * this.game.perkSystem.getComboDecayMultiplier();
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }
    }

    onEnemyKilled(enemy) {
        const g = this.game;
        const entities = g.entityManager;
        const perks = g.perkSystem;

        this.game.levelManager.levelEnemiesKilled++;
        this.totalEnemiesKilled++;

        this.combo++;
        this.comboTimer = 2;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const comboMultiplier = 1 + Math.min(this.combo * 0.1, 3) + perks.getComboPointsBonus();
        const points = Math.floor(enemy.score * comboMultiplier * perks.getPointMultiplier());
        this.addScore(points);

        // Ultimate charge is now time-based (no kill-based charge)

        if (perks.hasPerk('vampire_rounds') && entities.player && entities.player.active) {
            perks.vampireKillCount++;
            if (perks.vampireKillCount >= perks.getVampireKillThreshold()) {
                perks.vampireKillCount = 0;
                if (entities.player.health < entities.player.maxHealth) {
                    entities.player.health = Math.min(entities.player.maxHealth, entities.player.health + 1);
                    g.particles.emit(entities.player.position.x + entities.player.width / 2, entities.player.position.y + entities.player.height / 2, 'powerup', 4);
                }
            }
        }

        if (perks.getChainTargets() > 0) {
            g.perkEffectsManager.applyChainLightning(
                enemy.position.x + enemy.width / 2,
                enemy.position.y + enemy.height / 2,
                perks.getChainTargets(),
                Math.ceil(perks.getDamageMultiplier())
            );
        }

        entities.explosions.push(new Explosion(
            enemy.position.x + enemy.width / 2,
            enemy.position.y + enemy.height / 2,
            enemy.width > 52 ? 1.8 : 1.2
        ));
        g.particles.emit(
            enemy.position.x + enemy.width / 2,
            enemy.position.y + enemy.height / 2,
            'explosion', 12
        );
        g.sound.playExplosion();

        const dropChance = enemy.dropChance + perks.getDropRateBonus();
        if (Math.random() < dropChance) {
            const types = ['health', 'shield', 'weapon', 'speed', 'rapid', 'points', 'ultimate'];
            const weights = [15, 10, 20, 8, 8, 20, 5];
            const type = this.weightedRandom(types, weights);
            entities.powerUps.push(new PowerUp(
                enemy.position.x + enemy.width / 2 - 17,
                enemy.position.y + enemy.height / 2 - 17,
                type
            ));
        }
    }

    onBossKilled() {
        const g = this.game;
        const entities = g.entityManager;

        g.postProcessing.shake(12, 0.6);
        g.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.5);

        const cx = entities.boss.position.x + entities.boss.width / 2;
        const cy = entities.boss.position.y + entities.boss.height / 2;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                entities.explosions.push(new Explosion(
                    cx + (Math.random() - 0.5) * 60,
                    cy + (Math.random() - 0.5) * 60,
                    2
                ));
                g.particles.emit(cx, cy, 'explosion', 20);
                g.sound.playExplosionBig();
                g.postProcessing.shake(8, 0.3);
            }, i * 200);
        }

        const points = entities.boss.score;
        this.addScore(points);
        g.levelManager.levelEnemiesKilled++;
        this.totalEnemiesKilled++;

        for (let i = 0; i < 3; i++) {
            const types = ['health', 'points', 'ultimate'];
            entities.powerUps.push(new PowerUp(
                cx + (i - 1) * 40 - 17,
                cy - 17,
                types[i]
            ));
        }
    }

    onMiniBossKilled() {
        const g = this.game;
        const entities = g.entityManager;

        g.postProcessing.shake(6, 0.4);
        g.postProcessing.flash({ r: 255, g: 220, b: 100 }, 0.3);

        const cx = entities.miniBoss.position.x + entities.miniBoss.width / 2;
        const cy = entities.miniBoss.position.y + entities.miniBoss.height / 2;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                entities.explosions.push(new Explosion(
                    cx + (Math.random() - 0.5) * 40,
                    cy + (Math.random() - 0.5) * 40,
                    1.5
                ));
                g.particles.emit(cx, cy, 'explosion', 14);
                g.sound.playExplosionBig();
            }, i * 150);
        }

        const points = entities.miniBoss.score;
        this.addScore(points);
        g.levelManager.levelEnemiesKilled++;
        this.totalEnemiesKilled++;

        const types = ['health', 'points'];
        for (let i = 0; i < 2; i++) {
            entities.powerUps.push(new PowerUp(
                cx + (i - 0.5) * 30 - 17,
                cy - 17,
                types[i]
            ));
        }
    }

    reset() {
        this.score = 0;
        this.totalPoints = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.totalEnemiesKilled = 0;
    }

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        return items[items.length - 1];
    }
}

export default ScoreManager;
