import { CollisionHandler } from './CollisionHandler.js';

/**
 * CollectibleCollisionHandler - Handles collectible (coin) collisions
 * Single Responsibility: Coin collection, magnet effects, combo tracking
 */
export class CollectibleCollisionHandler extends CollisionHandler {
    /**
     * Handle collectible collisions
     * @param {EntityManager} entityManager
     * @returns {null}
     */
    handle(entityManager) {
        const collectibles = entityManager.getEntities('collectibles');
        const playerCenterX = this.context.player.x + this.context.player.width / 2;
        const playerCenterY = this.context.player.y + this.context.player.height / 2;

        for (let i = collectibles.length - 1; i >= 0; i--) {
            const collectible = collectibles[i];

            // Early rejection - skip if too far away (Manhattan distance)
            const dx = Math.abs(collectible.x - playerCenterX);
            const dy = Math.abs(collectible.y - playerCenterY);
            if (dx > 150 || dy > 150) continue;

            // Apply magnet effect if player has magnet powerup
            this._applyMagnetEffect(collectible, playerCenterX, playerCenterY);

            if (this.checkCollision(collectible)) {
                this._handleCollectiblePickup(collectible, collectibles, i, entityManager);
            }
        }

        return null;
    }

    /**
     * Apply magnet effect to collectible
     * @private
     */
    _applyMagnetEffect(collectible, playerCenterX, playerCenterY) {
        if (this.context.player.hasMagnet && collectible.type === 'collectible') {
            const dx = playerCenterX - collectible.x;
            const dy = playerCenterY - collectible.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.context.player.magnetRange && distance > 0) {
                const attractionSpeed = 8;
                collectible.x += (dx / distance) * attractionSpeed;
                collectible.y += (dy / distance) * attractionSpeed;
            }
        }
    }

    /**
     * Handle collectible pickup
     * @private
     */
    _handleCollectiblePickup(collectible, collectibles, index, entityManager) {
        collectibles.splice(index, 1);
        const points = this.context.scoreSystem.addCollectible();
        this.playSound('collect');

        // Track coin collection for level manager
        if (this.context.levelManager) {
            this.context.levelManager.recordCoinCollected();
            if (collectible.fromCoinRain) {
                console.log(`🪙 BONUS COIN from rain collected! Total: ${this.context.levelManager.coinsCollected}/${this.context.levelManager.totalCoins}`);
            }
        }

        this.context.achievementSystem.recordCollectible();
        this.context.achievementSystem.checkAchievements();

        // Streak notification every 5
        if (this.context.achievementSystem.currentStreak > 0 && 
            this.context.achievementSystem.currentStreak % 5 === 0) {
            this.playSound('streak');
            this.addNotification(
                `🔥 Streak x${this.context.achievementSystem.currentStreak}!`,
                'Continua così!',
                'streak'
            );
        }

        // Show score with speed multiplier
        this._showScoreText(points, collectible, entityManager);

        // Show combo animation
        const combo = this.context.scoreSystem.getCombo();
        const multiplier = this.context.scoreSystem.getComboMultiplier();
        this.context.animationController.showCombo(combo, multiplier, 0, 80);

        // Epic combo text at center
        this._showComboText(combo, entityManager);
    }

    /**
     * Show score floating text with speed multiplier
     * @private
     */
    _showScoreText(points, collectible, entityManager) {
        const speedMult = this.context.scoreSystem.getSpeedMultiplier();
        let text = `+${points}`;
        let color = [1.0, 0.9, 0.2, 1.0];

        if (speedMult >= 1.5) {
            text = `+${points} ×${speedMult.toFixed(1)}`;
            if (speedMult >= 3.0) {
                color = [1.0, 0.0, 0.4, 1.0]; // Rosa intenso
            } else if (speedMult >= 2.0) {
                color = [1.0, 0.4, 0.0, 1.0]; // Arancione
            } else {
                color = [1.0, 0.8, 0.0, 1.0]; // Giallo
            }
        }

        this.createFloatingText(text, collectible.x, collectible.y, color, entityManager);
    }

    /**
     * Show epic combo text at screen center
     * @private
     */
    _showComboText(combo, entityManager) {
        if (combo < 5) return;

        const comboData = this._getComboData(combo);
        if (comboData) {
            // Centro schermo: 400x400 (canvas 800x800)
            this.createFloatingText(comboData.text, 400, 400, comboData.color, entityManager);
        }
    }

    /**
     * Get combo text and color based on combo count
     * @private
     */
    _getComboData(combo) {
        if (combo >= 50) {
            return {
                text: `🌟 x${combo} DIVINO! 🌟`,
                color: [1.0, 0.0, 1.0, 1.0] // Magenta
            };
        } else if (combo >= 30) {
            return {
                text: `🔥 x${combo} EPICO! 🔥`,
                color: [1.0, 0.3, 0.0, 1.0] // Arancione fuoco
            };
        } else if (combo >= 20) {
            return {
                text: `💥 x${combo} BRUTALE! 💥`,
                color: [1.0, 0.2, 0.2, 1.0] // Rosso
            };
        } else if (combo >= 15) {
            return {
                text: `⚡ x${combo} PAZZESCO! ⚡`,
                color: [1.0, 1.0, 0.0, 1.0] // Giallo
            };
        } else if (combo >= 10) {
            return {
                text: `🌈 x${combo} SUPER! 🌈`,
                color: [0.0, 1.0, 1.0, 1.0] // Ciano
            };
        } else if (combo >= 5) {
            return {
                text: `🚀 COMBO x${combo}! 🚀`,
                color: [0.5, 1.0, 0.5, 1.0] // Verde
            };
        }
        return null;
    }
}
