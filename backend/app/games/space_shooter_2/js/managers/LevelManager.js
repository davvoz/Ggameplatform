import { getLevelData, getTotalLevels } from '../LevelData.js';
import {
    LEVELS_PER_WORLD,
    getWorldForLevel,
    getWorldLevel   as _getWorldLevel,
    getPlanetIndex  as _getPlanetIndex,
    getPlanetName   as _getPlanetName
} from '../WorldConfig.js';

class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.currentWorld = 1;
        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.levelStartTime = 0;
        this.summaryData = {};
    }

    /** Returns the current world number (data-driven via WorldConfig) */
    getCurrentWorld() {
        return getWorldForLevel(this.currentLevel);
    }

    /** Returns the level number within the current world (1-based) */
    getWorldLevel() {
        return _getWorldLevel(this.currentLevel);
    }

    /** Returns the planet index within the current world (-1 for World 1) */
    getPlanetIndex() {
        return _getPlanetIndex(this.currentLevel);
    }

    /** Planet name for the current level (null for World 1) */
    getPlanetName() {
        return _getPlanetName(this.currentLevel);
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
        const prevLevel = this.currentLevel;
        this.currentLevel++;

        if (this.currentLevel > getTotalLevels()) {
            // Final world completed — save progress
            const completedWorld = Math.ceil(prevLevel / LEVELS_PER_WORLD);
            if (window.saveWorldProgress) window.saveWorldProgress(completedWorld);
            g.state = 'victory';
            g.uiManager.showVictoryScreen();
            return;
        }

        // Update current world
        this.currentWorld = this.getCurrentWorld();

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

        // ── World Transition: reset perks when entering a new world ──
        if (prevLevel % LEVELS_PER_WORLD === 0 && this.currentLevel === prevLevel + 1) {
            // World completed — save progress
            const completedWorld = prevLevel / LEVELS_PER_WORLD;
            if (window.saveWorldProgress) window.saveWorldProgress(completedWorld);
            g.perkSystem.reset();
        }

        if (entities.player) {
            entities.player.recalculateStats();
            g.perkEffectsManager.applyPerkModifiersToPlayer();
            entities.player.health = entities.player.maxHealth;
            entities.player.position.x = g.logicalWidth / 2 - entities.player.width / 2;
            entities.player.position.y = g.logicalHeight - 100;
        }

        if (g.backgroundFacade) g.backgroundFacade.setLevel(this.currentLevel);

        g.perkSystem.onLevelStart();
        g.sound.playGameMusic();

        // ── World Transition Cinematic ──
        if (prevLevel % LEVELS_PER_WORLD === 0 && this.currentLevel === prevLevel + 1) {
            g.cinematicManager.beginWorldTransition(null, this.getCurrentWorld());
        } else {
            g.cinematicManager.beginLevelIntro();
        }
    }

    reset() {
        this.currentLevel = 1;
        this.currentWorld = 1;
        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.levelStartTime = 0;
        this.summaryData = {};
    }
}

export default LevelManager;
