/**
 * AchievementSystem - Sistema di achievement e gamification
 */
export class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.notifications = [];
        
        // Statistiche di gioco
        this.stats = {
            totalJumps: 0,
            collectiblesCollected: 0,
            boostsCollected: 0,
            platformsLanded: 0,
            damagesTaken: 0,
            powerupsCollected: 0,
            maxCombo: 0,
            maxStreak: 0,
            nearMisses: 0,
            longestSession: 0
        };
        
        this.currentStreak = 0;
        
        this.initializeAchievements();
    }
    
    initializeAchievements() {
        // Achievement semplici ma gratificanti
        this.addAchievement('first_jump', '🚀 Primo Salto!', 'Fai il tuo primo salto', 
            () => this.stats.totalJumps >= 1);
        
        this.addAchievement('collector', '💎 Collezionista', 'Raccogli 10 gemme', 
            () => this.stats.collectiblesCollected >= 10);
        
        this.addAchievement('pro_collector', '💎 Collezionista Pro', 'Raccogli 50 gemme', 
            () => this.stats.collectiblesCollected >= 50);
        
        this.addAchievement('speed_demon', '⚡ Demone della Velocità', 'Raccogli 5 boost', 
            () => this.stats.boostsCollected >= 5);
        
        this.addAchievement('combo_master', '🎮 Maestro dei Combo', 'Raggiungi combo x10', 
            () => this.stats.maxCombo >= 10);
        
        this.addAchievement('survivor', '💪 Sopravvissuto', 'Atterra su 25 piattaforme', 
            () => this.stats.platformsLanded >= 25);
        
        this.addAchievement('near_miss_master', '😎 Maestro del Rischio', '10 evitamenti per un soffio', 
            () => this.stats.nearMisses >= 10);
        
        this.addAchievement('powerup_hunter', '✨ Cacciatore di Poteri', 'Raccogli 3 powerup', 
            () => this.stats.powerupsCollected >= 3);
    }
    
    addAchievement(id, title, description, condition) {
        this.achievements.set(id, { id, title, description, condition });
    }
    
    checkAchievements() {
        const newUnlocks = [];
        
        for (const [id, achievement] of this.achievements) {
            if (!this.unlockedAchievements.has(id) && achievement.condition()) {
                this.unlockedAchievements.add(id);
                newUnlocks.push(achievement);
                this.addNotification(achievement.title, achievement.description, 'achievement');
            }
        }
        
        return newUnlocks;
    }
    
    addNotification(title, message, type = 'info') {
        this.notifications.push({
            title,
            message,
            type,
            time: Date.now(),
            duration: 3000,
            alpha: 1
        });
    }
    
    updateNotifications(deltaTime) {
        const now = Date.now();
        
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notif = this.notifications[i];
            const elapsed = now - notif.time;
            
            if (elapsed > notif.duration) {
                this.notifications.splice(i, 1);
            } else if (elapsed > notif.duration - 500) {
                // Fade out negli ultimi 500ms
                notif.alpha = (notif.duration - elapsed) / 500;
            }
        }
    }
    
    recordJump() {
        this.stats.totalJumps++;
    }
    
    recordNormalLanding() {
        this.stats.platformsLanded++;
    }
    
    recordCollectible() {
        this.stats.collectiblesCollected++;
        this.currentStreak++;
        this.stats.maxStreak = Math.max(this.stats.maxStreak, this.currentStreak);
    }
    
    recordBoost() {
        this.stats.boostsCollected++;
    }
    
    recordDamage() {
        this.stats.damagesTaken++;
        this.currentStreak = 0;
    }
    
    recordPowerup() {
        this.stats.powerupsCollected++;
    }
    
    recordCombo(combo) {
        this.stats.maxCombo = Math.max(this.stats.maxCombo, combo);
    }
    
    recordNearMiss() {
        this.stats.nearMisses++;
    }
    
    getNotifications() {
        return this.notifications;
    }
    
    getProgress() {
        return {
            total: this.achievements.size,
            unlocked: this.unlockedAchievements.size,
            percentage: (this.unlockedAchievements.size / this.achievements.size) * 100
        };
    }
}
