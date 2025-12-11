import { PowerupCollisionHandler } from './PowerupCollisionHandler.js';

/**
 * HeartCollisionHandler - Handles heart (health) pickups
 * Single Responsibility: Health restoration
 */
export class HeartCollisionHandler extends PowerupCollisionHandler {
    handle(entityManager, options = {}) {
        if (options.goalReached) return null;

        const hearts = entityManager.getEntities('hearts');

        for (let i = hearts.length - 1; i >= 0; i--) {
            if (this.checkCollision(hearts[i])) {
                const healed = this.context.player.heal(1);
                hearts.splice(i, 1);

                if (healed) {
                    this.playSound('powerup');
                    this.context.scoreSystem.addPoints(25);
                }
            }
        }

        return null;
    }
}

/**
 * ShieldCollisionHandler - Handles shield powerup
 * Single Responsibility: Shield activation
 */
export class ShieldCollisionHandler extends PowerupCollisionHandler {
    handle(entityManager, options = {}) {
        if (options.goalReached) return null;

        const shields = entityManager.getEntities('shieldBonuses');

        for (let i = shields.length - 1; i >= 0; i--) {
            if (this.checkCollision(shields[i])) {
                const shield = shields[i];
                
                this._handlePowerupCollection(shield, shields, i, entityManager, {
                    text: 'SHIELD!',
                    color: [0.0, 0.75, 1.0, 1.0],
                    points: 75,
                    sound: 'powerup'
                });

                // Track powerup collection
                this.context.scoreSystem.addPowerupCollected();

                // Activate shield
                this.context.player.hasShield = true;
                this.context.player.shieldDuration = shield.duration || 15000;
                this.context.player.shieldStartTime = Date.now();
            }
        }

        return null;
    }
}

/**
 * MagnetCollisionHandler - Handles magnet powerup
 * Single Responsibility: Magnet activation
 */
export class MagnetCollisionHandler extends PowerupCollisionHandler {
    handle(entityManager, options = {}) {
        if (options.goalReached) return null;

        const magnets = entityManager.getEntities('magnetBonuses');

        for (let i = magnets.length - 1; i >= 0; i--) {
            if (this.checkCollision(magnets[i])) {
                const magnet = magnets[i];

                this._handlePowerupCollection(magnet, magnets, i, entityManager, {
                    text: 'COIN MAGNET!',
                    color: [1.0, 0.65, 0.0, 1.0],
                    points: 75,
                    sound: 'powerup'
                });
                // Track powerup collection
                this.context.scoreSystem.addPowerupCollected();
                // Activate magnet
                this.context.player.hasMagnet = true;
                this.context.player.magnetDuration = magnet.duration || 10000;
                this.context.player.magnetStartTime = Date.now();
                this.context.player.magnetRange = 200;
            }
        }

        return null;
    }
}

/**
 * BoostCollisionHandler - Handles boost powerup
 * Single Responsibility: Boost activation and combo
 */
export class BoostCollisionHandler extends PowerupCollisionHandler {
    handle(entityManager, options = {}) {
        if (options.goalReached) return null;

        const boosts = entityManager.getEntities('boosts');

        for (let i = boosts.length - 1; i >= 0; i--) {
            if (this.checkCollision(boosts[i])) {
                const boost = boosts[i];
                boosts.splice(i, 1);

                this.context.player.applyBoost();
                this.playSound('boost');

                const points = this.context.scoreSystem.addBoostCombo();
                this.context.achievementSystem.recordBoost();
                this.context.achievementSystem.checkAchievements();

                this.context.particleSystem.createBoostExplosion(boost.x, boost.y, entityManager);

                // Show boost combo text
                this._showBoostComboText(boost, points, entityManager);

                // Show combo animation
                const combo = this.context.scoreSystem.getCombo();
                const multiplier = this.context.scoreSystem.getComboMultiplier();
                this.context.animationController.showCombo(combo, multiplier, 0, 80);

                this.playSound('collect');
            }
        }

        return null;
    }

    _showBoostComboText(boost, points, entityManager) {
        const boostCombo = this.context.player.boostCombo;
        const speedMult = this.context.scoreSystem.getSpeedMultiplier();

        if (boostCombo >= 2) {
            const speedBonus = Math.floor(this.context.player.boostComboSpeedBonus * 100);
            let text = `+${points} BOOST x${boostCombo}! 🚀`;
            let color = [0.0, 1.0, 0.9, 1.0];

            if (speedMult >= 1.5) {
                text = `+${points} ×${speedMult.toFixed(1)} BOOST x${boostCombo}! 🚀`;
                if (speedMult >= 3.0) {
                    color = [1.0, 0.0, 0.4, 1.0];
                } else if (speedMult >= 2.0) {
                    color = [1.0, 0.4, 0.0, 1.0];
                }
            }

            this.createFloatingText(text, boost.x, boost.y, color, entityManager);

            if (boostCombo >= 5) {
                this.addNotification(
                    `🚀 BOOST COMBO x${boostCombo}!`,
                    `+${speedBonus}% velocità!`,
                    'achievement'
                );
            }
        } else {
            let text = `+${points} BOOST!`;
            let color = [0.0, 1.0, 0.9, 1.0];

            if (speedMult >= 1.5) {
                text = `+${points} BOOST! ×${speedMult.toFixed(1)}`;
                if (speedMult >= 3.0) {
                    color = [1.0, 0.0, 0.4, 1.0];
                } else if (speedMult >= 2.0) {
                    color = [1.0, 0.4, 0.0, 1.0];
                }
            }
            this.createFloatingText(text, boost.x, boost.y, color, entityManager);
        }
    }
}
