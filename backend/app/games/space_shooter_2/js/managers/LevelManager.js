import { getLevelData, getTotalLevels } from '../LevelData.js';

class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.levelStartTime = 0;
        this.summaryData = {};
    }

    onLevelComplete() {
        this.game.cinematicManager.beginLevelOutro();
    }

    finalizeLevelComplete() {
        const g = this.game;
        g.state = 'levelComplete';
        g.uiManager.hideHudButtons();
        g.sound.playLevelComplete();
        g.postProcessing.flash({ r: 100, g: 255, b: 100 }, 0.2);

        const levelTime = (performance.now() - this.levelStartTime) / 1000;
        const accuracy = g.scoreManager.totalEnemiesKilled > 0 ?
            Math.min(100, Math.round((this.levelEnemiesKilled / Math.max(1, this.levelEnemiesKilled + 5)) * 100)) : 0;
        const bonusPoints = Math.floor(this.levelEnemiesKilled * 10 + g.scoreManager.maxCombo * 50);

        g.scoreManager.totalPoints += bonusPoints;
        g.scoreManager.score += bonusPoints;
        this.levelPointsEarned += bonusPoints;

        this.summaryData = {
            level: this.currentLevel,
            levelName: getLevelData(this.currentLevel).name,
            enemiesKilled: this.levelEnemiesKilled,
            damageTaken: this.levelDamageTaken,
            maxCombo: g.scoreManager.maxCombo,
            pointsEarned: this.levelPointsEarned,
            bonusPoints,
            time: levelTime,
            accuracy,
            totalScore: g.scoreManager.score,
            totalPoints: g.scoreManager.totalPoints,
            playerHP: g.entityManager.player ? g.entityManager.player.health : 0,
            playerMaxHP: g.entityManager.player ? g.entityManager.player.maxHealth : 0
        };

        g.uiManager.showLevelCompleteScreen();
    }

    startNextLevel() {
        const g = this.game;
        this.currentLevel++;
        if (this.currentLevel > getTotalLevels()) {
            g.state = 'victory';
            g.uiManager.showVictoryScreen();
            return;
        }

        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        g.scoreManager.maxCombo = 0;
        g.scoreManager.combo = 0;
        this.levelStartTime = performance.now();

        g.waveManager.resetForLevel();
        g.cinematicManager.levelOutro = null;

        const entities = g.entityManager;
        entities.enemies = [];
        entities.bullets = [];
        entities.explosions = [];
        entities.powerUps = [];
        entities.homingMissiles = [];
        entities.bossActive = false;
        entities.boss = null;
        entities.miniBossActive = false;
        entities.miniBoss = null;

        if (entities.player) {
            entities.player.recalculateStats();
            g.perkEffectsManager.applyPerkModifiersToPlayer();
            entities.player.health = entities.player.maxHealth;
            entities.player.position.x = g.canvas.width / 2 - entities.player.width / 2;
            entities.player.position.y = g.canvas.height - 100;
        }

        if (g.starField) g.starField.setLevel(this.currentLevel);

        g.perkSystem.onLevelStart();
        g.sound.playGameMusic();

        g.cinematicManager.beginLevelIntro();
    }

    reset() {
        this.currentLevel = 1;
        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.levelStartTime = 0;
        this.summaryData = {};
    }
}

export default LevelManager;
