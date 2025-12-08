import { PowerupCollisionHandler } from './PowerupCollisionHandler.js';

/**
 * AdvancedBonusHandler - Handles complex bonus powerups
 * Manages magnet, shield, multiplier, coin rain, rainbow bonuses
 */
export class AdvancedBonusHandler extends PowerupCollisionHandler {
    /**
     * Check all bonus type collisions
     * @param {EntityManager} entityManager
     * @returns {Object|null} - Returns activation data for special effects
     */
    handle(entityManager) {
        this._checkMagnetBonus(entityManager);

        const coinRainResult = this._checkCoinRainBonus(entityManager);
        if (coinRainResult) return coinRainResult;

        this._checkShieldBonus(entityManager);
        this._checkMultiplierBonus(entityManager);

        const rainbowResult = this._checkRainbowBonus(entityManager);
        if (rainbowResult) return rainbowResult;

        this._checkFlightBonus(entityManager);
        this._checkRechargeBonus(entityManager);
        this._checkHeartRechargeBonus(entityManager);

        return null;
    }

    _checkMagnetBonus(entityManager) {
        const magnetBonuses = entityManager.getEntities('magnetBonuses');

        for (let i = magnetBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(magnetBonuses[i])) {
                const magnet = magnetBonuses[i];
                
                // Magnetize all collectibles
                const collectibles = entityManager.getEntities('collectibles');
                collectibles.forEach(c => {
                    c.magnetized = true;
                    c.magnetDuration = this.context.player.isTurboActive ? 8.0 : 5.0;
                });

                this._handlePowerupCollection(magnet, magnetBonuses, i, entityManager, {
                    text: '🧲 MAGNETE!',
                    color: magnet.color,
                    sound: 'powerup'
                });

                this.addNotification('🧲 Magnete Attivo!', 'Tutti i collectibles sono attratti!', 'info');
            }
        }
    }

    _checkCoinRainBonus(entityManager) {
        const coinRainBonuses = entityManager.getEntities('coinRainBonuses');

        for (let i = coinRainBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(coinRainBonuses[i])) {
                const coinRain = coinRainBonuses[i];

                this._handlePowerupCollection(coinRain, coinRainBonuses, i, entityManager, {
                    text: '💰 COIN RAIN!',
                    color: coinRain.color,
                    sound: 'powerup'
                });

                this.addNotification('💰 Pioggia di Monete!', 'Pioveranno monete per 10 secondi!', 'achievement');

                return { type: 'coinRain', activated: true, duration: 10.0 };
            }
        }
        return null;
    }

    _checkShieldBonus(entityManager) {
        const shieldBonuses = entityManager.getEntities('shieldBonuses');

        for (let i = shieldBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(shieldBonuses[i])) {
                const shield = shieldBonuses[i];

                this.context.player.shieldActive = true;
                this.context.player.shieldDuration = 10.0;

                this._handlePowerupCollection(shield, shieldBonuses, i, entityManager, {
                    text: '🛡️ SCUDO!',
                    color: shield.color,
                    sound: 'powerup'
                });

                this.addNotification('🛡️ Scudo Attivo!', 'Sei invincibile per 10 secondi!', 'achievement');
            }
        }
    }

    _checkMultiplierBonus(entityManager) {
        const multiplierBonuses = entityManager.getEntities('multiplierBonuses');

        for (let i = multiplierBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(multiplierBonuses[i])) {
                const multi = multiplierBonuses[i];

                this.context.scoreSystem.bonusMultiplier = 3.0;
                this.context.scoreSystem.bonusMultiplierDuration = 12.0;

                this._handlePowerupCollection(multi, multiplierBonuses, i, entityManager, {
                    text: '✖️3 PUNTI!',
                    color: multi.color,
                    sound: 'powerup'
                });

                this.addNotification('💰 Moltiplicatore x3!', 'Tutti i punti triplicati per 12 secondi!', 'achievement');
            }
        }
    }

    _checkRechargeBonus(entityManager) {
        const rechargeBonuses = entityManager.getEntities('rechargeBonuses');

        for (let i = rechargeBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(rechargeBonuses[i])) {
                const recharge = rechargeBonuses[i];

                // Reset safety platform cooldown
                if (this.context.safetyPlatformSystem) {
                    this.context.safetyPlatformSystem.resetCooldown();
                }

                // Electric energy explosion
                this._createParticleRing(
                    recharge.x,
                    recharge.y,
                    [0.2, 1.0, 0.4, 1.0],
                    40,
                    entityManager
                );

                this._handlePowerupCollection(recharge, rechargeBonuses, i, entityManager, {
                    text: '⚡ RICARICA ISTANTANEA!',
                    color: [0.2, 1.0, 0.4, 1.0],
                    sound: 'powerup'
                });

                this.addNotification('⚡ Safety Ricaricato!', 'Tutti i pallini ripristinati!', 'achievement');
                this.triggerScreenFlash(0.3, [0.2, 1.0, 0.4]);
            }
        }
    }

    _checkFlightBonus(entityManager) {
        const flightBonuses = entityManager.getEntities('flightBonuses');

        for (let i = flightBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(flightBonuses[i])) {
                const flight = flightBonuses[i];

                this.context.player.activateInstantFlight();

                this._handlePowerupCollection(flight, flightBonuses, i, entityManager, {
                    text: '🪶 VOLO ISTANTANEO!',
                    color: flight.color,
                    sound: 'powerup'
                });

                this.addNotification('🪶 Volo Attivato!', '5 secondi di volo libero!', 'info');
            }
        }
    }

    _checkHeartRechargeBonus(entityManager) {
        const heartRechargeBonuses = entityManager.getEntities('heartRechargeBonuses');

        for (let i = heartRechargeBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(heartRechargeBonuses[i])) {
                const heartRecharge = heartRechargeBonuses[i];

                const healedAmount = this.context.player.maxHealth - this.context.player.health;
                this.context.player.health = this.context.player.maxHealth;

                // Heart particle explosion
                this._createParticleRing(
                    heartRecharge.x,
                    heartRecharge.y,
                    [1.0, 0.2 + Math.random() * 0.3, 0.5, 1.0],
                    50,
                    entityManager,
                    150,
                    1.0
                );

                this._handlePowerupCollection(heartRecharge, heartRechargeBonuses, i, entityManager, {
                    text: '💕 CUORI RICARICATI!',
                    color: [1.0, 0.2, 0.5, 1.0],
                    sound: 'powerup'
                });

                if (healedAmount > 0) {
                    this.addNotification('💕 Cuori Completamente Ricaricati!', `+${healedAmount} cuoricini ripristinati!`, 'achievement');
                } else {
                    this.addNotification('💕 Già al Massimo!', 'Cuori già pieni!', 'info');
                }

                this.triggerScreenFlash(0.4, [1.0, 0.2, 0.5]);
            }
        }
    }

    _checkRainbowBonus(entityManager) {
        const rainbowBonuses = entityManager.getEntities('rainbowBonuses');

        for (let i = rainbowBonuses.length - 1; i >= 0; i--) {
            if (this.checkCollision(rainbowBonuses[i])) {
                const rainbow = rainbowBonuses[i];

                // Activate ALL powers
                const collectibles = entityManager.getEntities('collectibles');
                collectibles.forEach(c => {
                    c.magnetized = true;
                    c.magnetDuration = 8.0;
                });

                this.context.player.shieldActive = true;
                this.context.player.shieldDuration = 15.0;
                this.context.scoreSystem.bonusMultiplier = 5.0;
                this.context.scoreSystem.bonusMultiplierDuration = 15.0;

                // Rainbow explosion sequence
                for (let j = 0; j < 5; j++) {
                    setTimeout(() => {
                        const hue = (j * 72) % 360;
                        const rgb = this._hslToRgb(hue / 360, 1.0, 0.5);
                        this.createExplosion(rainbow.x, rainbow.y, rgb, 120, entityManager);
                    }, j * 150);
                }

                rainbowBonuses.splice(i, 1);

                this.createFloatingText('🌈 RAINBOW POWER!', rainbow.x, rainbow.y, [1.0, 1.0, 1.0, 1.0], entityManager);
                this.addNotification('🌈 RAINBOW POWER!', 'TUTTI I POTERI ATTIVI!', 'achievement');
                this.playSound('powerup');
                this.triggerScreenFlash(0.5, [1.0, 1.0, 1.0]);

                return { type: 'rainbow', activated: true };
            }
        }
        return null;
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r, g, b];
    }
}
