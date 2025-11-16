/**
 * ScoreSystem - Manages scoring, levels, and progression
 * Follows Single Responsibility Principle
 */
export class ScoreSystem {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.distance = 0;
        this.level = 1;
        this.collectibles = 0;
        this.multiplier = 1;
        this.scoreListeners = [];
        this.levelListeners = [];
        
        // Sistema combo
        this.combo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 3.0; // 3 secondi per mantenere la combo
        this.comboMultiplier = 1.0;
        this.maxCombo = 0;
        this.comboListeners = [];
    }

    reset() {
        this.score = 0;
        this.distance = 0;
        this.level = 1;
        this.collectibles = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1.0;
        this.maxCombo = 0;
    }
    
    update(deltaTime) {
        // Decrementa timer combo
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }
    
    addCombo() {
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
        
        // Reset timer
        this.comboTimer = this.comboTimeout;
        
        // Calcola moltiplicatore combo (cresce progressivamente)
        this.comboMultiplier = 1.0 + (this.combo * 0.1);
        
        // Notifica listeners
        this.notifyComboChange();
    }
    
    resetCombo() {
        if (this.combo > 0) {
            this.combo = 0;
            this.comboMultiplier = 1.0;
            this.notifyComboChange();
        }
    }
    
    getCombo() {
        return this.combo;
    }
    
    getComboMultiplier() {
        return this.comboMultiplier;
    }
    
    getComboTimeLeft() {
        return Math.max(0, this.comboTimer);
    }
    
    getComboProgress() {
        return this.combo > 0 ? this.comboTimer / this.comboTimeout : 0;
    }

    addDistance(pixels) {
        this.distance += pixels;
        const distanceScore = Math.floor(pixels / 10);
        this.addScore(distanceScore);
    }

    addCollectible() {
        this.collectibles++;
        this.addCombo();
        const points = Math.floor(10 * this.multiplier * this.comboMultiplier);
        this.addScore(points);
        return points; // Ritorna punti per visualizzazione
    }
    
    addBoostCombo() {
        this.addCombo();
        const points = Math.floor(25 * this.multiplier * this.comboMultiplier);
        this.addScore(points);
        return points;
    }

    addScore(points) {
        this.score += points;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        this.notifyScoreChange();
    }
    
    // Called externally to level up (e.g., every N platforms)
    levelUp() {
        this.level++;
        this.multiplier = 1 + (this.level - 1) * 0.3;
        this.notifyLevelUp(this.level);
    }

    getScore() {
        return Math.floor(this.score);
    }

    getHighScore() {
        return this.highScore;
    }

    getLevel() {
        return this.level;
    }

    getCollectibles() {
        return this.collectibles;
    }

    getDistance() {
        return Math.floor(this.distance);
    }

    loadHighScore() {
        try {
            const saved = localStorage.getItem('rainbowRush_highScore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (error) {
            return 0;
        }
    }

    saveHighScore() {
        try {
            localStorage.setItem('rainbowRush_highScore', this.highScore.toString());
        } catch (error) {
            console.warn('Failed to save high score:', error);
        }
    }

    onScoreChange(callback) {
        this.scoreListeners.push(callback);
    }

    onLevelUp(callback) {
        this.levelListeners.push(callback);
    }
    
    onComboChange(callback) {
        this.comboListeners.push(callback);
    }

    notifyScoreChange() {
        this.scoreListeners.forEach(callback => callback(this.getScore()));
    }

    notifyLevelUp(level) {
        this.levelListeners.forEach(callback => callback(level));
    }
    
    notifyComboChange() {
        this.comboListeners.forEach(callback => callback(this.combo, this.comboMultiplier));
    }

    getGameStats() {
        return {
            score: this.getScore(),
            highScore: this.getHighScore(),
            level: this.level,
            collectibles: this.collectibles,
            distance: this.getDistance(),
            combo: this.combo,
            comboMultiplier: this.comboMultiplier,
            maxCombo: this.maxCombo
        };
    }
}
