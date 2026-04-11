/**
 * ScoreSystem - Manages scoring, levels, and progression
 * Follows Single Responsibility Principle
 * Integrato con RainbowRushSDK per high score sicuro
 */
export class ScoreSystem {
    score = 0;
    totalScore = 0; // Punteggio totale cumulativo
    highScore = 0; // Inizializzato a 0, caricato in modo asincrono
    distance = 0;
    level = 1;
    collectibles = 0;
    multiplier = 1;
    scoreListeners = [];
    levelListeners = [];
    
    // Sistema combo
    combo = 0;
    comboTimer = 0;
    comboTimeout = 3; // 3 secondi per mantenere la combo
    comboMultiplier = 1;
    maxCombo = 0;
    comboListeners = [];
    
    // Bonus multiplier (da bonus speciali)
    bonusMultiplier = 1;
    bonusMultiplierDuration = 0;
    
    // Speed multiplier (basato sulla velocità del gioco)
    speedMultiplier = 1;
    currentSpeed = 0;
    
    // Level time tracking for speed bonus
    levelStartTime = Date.now();
    levelTimeBonus = [];
    
    // Extra stats for XP system
    enemiesDefeated = 0;
    powerupsCollected = 0;

    // Rainbow Rush SDK per persistenza sicura
    sdk;
    sdkEnabled;
    highScoreLoaded = false;

    constructor(sdk = null) {
        this.sdk = sdk;
        this.sdkEnabled = sdk !== null;
    }
    
    /**
     * Inizializza high score da SDK o localStorage
     * @private
     */
    async initHighScore() {
        this.highScore = await this.loadHighScore();
        this.highScoreLoaded = true;
    }

    reset() {
        // Aggiungi lo score del livello al totale prima di resettare
        this.totalScore += this.score;
        this.score = 0;
        this.distance = 0;
        this.level = 1;
        this.collectibles = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.maxCombo = 0;
        this.bonusMultiplier = 1;
        this.bonusMultiplierDuration = 0;
        this.speedMultiplier = 1;
        this.currentSpeed = 0;
        this.levelStartTime = Date.now();
        this.levelTimeBonus = [];
    }
    
    /**
     * Full reset - resetta tutto incluso il punteggio totale (per game over)
     */
    fullReset() {
        this.score = 0;
        this.totalScore = 0;
        this.distance = 0;
        this.level = 1;
        this.collectibles = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.maxCombo = 0;
        this.bonusMultiplier = 1;
        this.bonusMultiplierDuration = 0;
        this.speedMultiplier = 1;
        this.currentSpeed = 0;
        this.levelStartTime = Date.now();
        this.levelTimeBonus = [];
        this.enemiesDefeated = 0;
        this.powerupsCollected = 0;
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
                this.bonusMultiplier = 1;
                this.bonusMultiplierDuration = 0;
            }
        }
    }
    
    updateSpeedMultiplier(currentSpeed) {
        this.currentSpeed = currentSpeed;
        // Calcola moltiplicatore basato su velocità (speed 120 = 1x, 240 = 2x, 360 = 3x, etc.)
        this.speedMultiplier = 1 + Math.max(0, (currentSpeed - 120) / 120);
    }
    
    getSpeedMultiplier() {
        return this.speedMultiplier;
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
        this.comboMultiplier = 1 + (Math.pow(this.combo, 1.3) * 0.15);
        
        // Notifica listeners
        this.notifyComboChange();
    }
    
    resetCombo() {
        if (this.combo > 0) {
            this.combo = 0;
            this.comboMultiplier = 1;
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
    
    addAltitudeScore(basePoints, speedMultiplier) {
        // Base points moltiplicato per velocità, combo e bonus
        // Il speedMultiplier passato come parametro viene ignorato, usiamo quello interno
        const totalMultiplier = this.multiplier * this.comboMultiplier * this.bonusMultiplier;
        const points = Math.floor(basePoints * totalMultiplier);
        this.addScore(points); // addScore applicherà automaticamente this.speedMultiplier
        return points;
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
    
    addEnemyDefeated() {
        this.enemiesDefeated++;
        this.addCombo();
        // Enemy defeat reward: base 30 points
        const points = Math.floor(30 * this.multiplier * this.comboMultiplier);
        this.addScore(points);
        return points;
    }
    
    addPowerupCollected() {
        this.powerupsCollected++;
    }

    addScore(points) {
        // Applica tutti i moltiplicatori (bonus + velocità)
        const finalPoints = Math.floor(points * this.bonusMultiplier * this.speedMultiplier);
        this.score += finalPoints;

        // Update high score (solo locale, SDK gestisce la persistenza)
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }

        this.notifyScoreChange();
        
        // Emit event for floating text with multiplier info
        let text = `+${finalPoints}`;
        let color = '#FFD700';
        
        if (this.speedMultiplier >= 1.5) {
            text = `+${finalPoints} ×${this.speedMultiplier.toFixed(1)}`;
            if (this.speedMultiplier >= 3) {
                color = '#ff0066'; // Rosa intenso per moltiplicatori alti
            } else if (this.speedMultiplier >= 2) {
                color = '#ff6600'; // Arancione
            } else {
                color = '#ffcc00'; // Giallo
            }
        }
        
        globalThis.dispatchEvent(new CustomEvent('scoreAdded', {
            detail: {
                points: finalPoints,
                text: text,
                color: color
            }
        }));
    }
    
    addPoints(points) {
        this.addScore(points);
    }
    
    // Called externally to level up (e.g., every N platforms)
    levelUp() {
        // Calculate time bonus before leveling up
        const now = Date.now();
        const levelTime = (now - this.levelStartTime) / 1000; // seconds
        


        
        const bonus = this.calculateLevelTimeBonus(levelTime, this.level);
        

        
        // Store bonus info for display
        this.levelTimeBonus.push({
            level: this.level,
            time: levelTime,
            bonus: bonus.points,
            rank: bonus.rank
        });
        
        // Award bonus points
        if (bonus.points > 0) {
            this.addScore(bonus.points);
        }
        
        this.level++;
        this.multiplier = 1 + (this.level - 1) * 0.3;
        
        // Reset level timer for next level
        this.levelStartTime = Date.now();
        
        this.notifyLevelUp(this.level, bonus);
    }
    
    calculateLevelTimeBonus(timeInSeconds, level) {
        // Target times for each rank - PIÙ SFIDANTI!
        const baseTargetTime = 8; // 8 secondi per perfect (era 20)
        const levelAdjustment = (level - 1) * 1; // +1 secondo per livello
        
        const perfectTime = baseTargetTime + levelAdjustment;
        const goldTime = perfectTime * 1.5;      // 50% più tempo
        const silverTime = perfectTime * 2;     // Doppio tempo
        const bronzeTime = perfectTime * 3;     // Triplo tempo
        
        // MOLTIPLICATORE invece di bonus fisso - PIÙ AGGRESSIVO!
        let bonusMultiplier = 1;
        let rank ;
        let rankIcon = '';
        let color;
        
        if (timeInSeconds <= perfectTime) {
            // PERFECT! Moltiplicatore 1.2x - +20% punti
            bonusMultiplier = 1.2;
            rank = 'perfect';
            rankIcon = '💎';
            color = [0.4, 0.9, 1, 1]; // Cyan brillante
        } else if (timeInSeconds <= goldTime) {
            // GOLD! Moltiplicatore 1.15x - +15% punti
            bonusMultiplier = 1.15;
            rank = 'gold';
            rankIcon = '🥇';
            color = [1, 0.84, 0, 1]; // Gold
        } else if (timeInSeconds <= silverTime) {
            // SILVER! Moltiplicatore 1.1x - +10% punti
            bonusMultiplier = 1.1;
            rank = 'silver';
            rankIcon = '🥈';
            color = [0.75, 0.75, 0.75, 1]; // Silver
        } else if (timeInSeconds <= bronzeTime) {
            // BRONZE! Moltiplicatore 1.05x - +5% punti
            bonusMultiplier = 1.05;
            rank = 'bronze';
            rankIcon = '🥉';
            color = [0.8, 0.5, 0.2, 1]; // Bronze
        } else {
            // TOO SLOW - NESSUN BONUS
            rank = 'slow';
            rankIcon = '⏱️';
            color = [0.5, 0.5, 0.5, 1]; // Gray
        }
        
        // Calcola i punti bonus come percentuale dello score attuale, diviso per 10
        const bonusPoints = Math.floor(this.score * (bonusMultiplier - 1) / 10);
        
        return {
            points: bonusPoints,
            multiplier: bonusMultiplier,
            rank: rank,
            rankIcon: rankIcon,
            color: color,
            time: timeInSeconds,
            targetTime: perfectTime
        };
    }
    
    getLastLevelBonus() {
        return this.levelTimeBonus.at(-1) || null;
    }

    getScore() {
        return Math.floor(this.score);
    }
    
    getTotalScore() {
        return Math.floor(this.totalScore + this.score);
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

    /**
     * Carica high score da SDK o localStorage
     */
    async loadHighScore() {
        if (this.sdkEnabled && this.sdk) {

                // Usa il nuovo metodo getUserHighScore per ottenere il vero high score dal backend
                const highScore = await this.sdk.getUserHighScore();

                return highScore;
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

    notifyLevelUp(level, bonus) {
        this.levelListeners.forEach(callback => callback(level, bonus));
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
            maxCombo: this.maxCombo,
            speedMultiplier: this.speedMultiplier,
            enemiesDefeated: this.enemiesDefeated,
            powerupsCollected: this.powerupsCollected
        };
    }
}
