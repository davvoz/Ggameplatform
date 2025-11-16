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
        
        // Bonus multiplier (da bonus speciali)
        this.bonusMultiplier = 1.0;
        this.bonusMultiplierDuration = 0;
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
        this.bonusMultiplier = 1.0;
        this.bonusMultiplierDuration = 0;
    }
    
    update(deltaTime) {
        // Decrementa timer combo
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
        
        // Decrementa bonus multiplier
        if (this.bonusMultiplierDuration > 0) {
            this.bonusMultiplierDuration -= deltaTime;
            if (this.bonusMultiplierDuration <= 0) {
                this.bonusMultiplier = 1.0;
                this.bonusMultiplierDuration = 0;
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
        
        // Moltiplicatore esponenziale più generoso
        // x1 → x1.2 → x1.5 → x2.0 → x2.6 → x3.5 → x4.5...
        this.comboMultiplier = 1.0 + (Math.pow(this.combo, 1.3) * 0.15);
        
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
        // Rewards più generose: base 15 invece di 10
        const points = Math.floor(15 * this.multiplier * this.comboMultiplier);
        this.addScore(points);
        return points;
    }
    
    addBoostCombo() {
        this.addCombo();
        // Boost reward: base 50 invece di 25
        const points = Math.floor(50 * this.multiplier * this.comboMultiplier);
        this.addScore(points);
        return points;
    }

    addScore(points) {
        // Applica bonus multiplier
        const finalPoints = points * this.bonusMultiplier;
        this.score += finalPoints;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        this.notifyScoreChange();
    }
    
    addPoints(points) {
        this.addScore(points);
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
