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
    }

    reset() {
        this.score = 0;
        this.distance = 0;
        this.level = 1;
        this.collectibles = 0;
        this.multiplier = 1;
    }

    addDistance(pixels) {
        this.distance += pixels;
        const distanceScore = Math.floor(pixels / 10);
        this.addScore(distanceScore);
    }

    addCollectible() {
        this.collectibles++;
        this.addScore(10 * this.multiplier);
    }

    addScore(points) {
        this.score += points;
        
        // Check for level up (every 500 points)
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.multiplier = 1 + (this.level - 1) * 0.5;
            this.notifyLevelUp(this.level);
        }

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        this.notifyScoreChange();
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

    notifyScoreChange() {
        this.scoreListeners.forEach(callback => callback(this.getScore()));
    }

    notifyLevelUp(level) {
        this.levelListeners.forEach(callback => callback(level));
    }

    getGameStats() {
        return {
            score: this.getScore(),
            highScore: this.getHighScore(),
            level: this.level,
            collectibles: this.collectibles,
            distance: this.getDistance()
        };
    }
}
