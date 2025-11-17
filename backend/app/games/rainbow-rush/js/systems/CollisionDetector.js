/**
 * CollisionDetector - Modular collision detection with strategy pattern
 * Handles 10+ collision types: platforms, obstacles, collectibles, powerups, hearts, boosts, all bonus types
 */
export class CollisionDetector {
    constructor(player, audioManager, achievementSystem, scoreSystem, particleSystem, animationController) {
        this.player = player;
        this.audioManager = audioManager;
        this.achievementSystem = achievementSystem;
        this.scoreSystem = scoreSystem;
        this.particleSystem = particleSystem;
        this.animationController = animationController;
    }

    /**
     * Check all collisions
     */
    checkAll(entityManager, safetyPlatformSystem, powerupSystem) {
        // Reset grounded state
        this.player.isGrounded = false;
        let playerOnSafetyPlatform = false;

        // Safety platform collision (check first with high tolerance)
        if (safetyPlatformSystem.isActive()) {
            const safetyPlatform = safetyPlatformSystem.getPlatform();
            const onSafety = this.player.checkPlatformCollision(safetyPlatform, 80);
            if (onSafety) {
                playerOnSafetyPlatform = true;
                // Force position above platform
                if (this.player.velocityY > 0) {
                    this.player.y = safetyPlatform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isGrounded = true;
                }
            }
        }

        // Platform collisions
        this.checkPlatformCollisions(entityManager);

        // Obstacle collisions
        this.checkObstacleCollisions(entityManager);

        // Collectible collisions
        this.checkCollectibleCollisions(entityManager);

        // Heart collisions
        this.checkHeartCollisions(entityManager);

        // Boost collisions
        this.checkBoostCollisions(entityManager);

        // Bonus collisions
        this.checkBonusCollisions(entityManager);

        // Powerup collisions
        this.checkPowerupCollisions(entityManager, powerupSystem);

        return playerOnSafetyPlatform;
    }

    /**
     * Check platform collisions
     */
    checkPlatformCollisions(entityManager) {
        const platforms = entityManager.getEntities('platforms');
        
        // Sort platforms by vertical distance to player (closest first)
        const playerBottom = this.player.y + this.player.height;
        const sortedPlatforms = platforms.slice().sort((a, b) => {
            const distA = Math.abs(playerBottom - a.y);
            const distB = Math.abs(playerBottom - b.y);
            return distA - distB;
        });
        
        // Check collision only with the closest platform that we can collide with
        for (const platform of sortedPlatforms) {
            const wasGrounded = this.player.grounded;
            const landed = this.player.checkPlatformCollision(platform);
            
            if (landed) {
                if (!wasGrounded) {
                    this.achievementSystem.recordNormalLanding();
                    this.achievementSystem.checkAchievements();
                }
                // Stop checking other platforms once we've landed on one
                break;
            }
        }
    }

    /**
     * Check obstacle collisions with near-miss detection
     */
    checkObstacleCollisions(entityManager) {
        const obstacles = entityManager.getEntities('obstacles');
        
        for (const obstacle of obstacles) {
            // Near miss detection
            const playerRight = this.player.x + this.player.width;
            const playerBottom = this.player.y + this.player.height;
            const obstacleLeft = obstacle.x;
            const obstacleTop = obstacle.y;
            const obstacleBottom = obstacle.y + obstacle.height;
            
            // Near miss if passes within 15px of obstacle
            if (playerRight > obstacleLeft - 15 && 
                playerRight < obstacleLeft + 5 &&
                this.player.y < obstacleBottom && 
                playerBottom > obstacleTop) {
                if (!obstacle.nearMissTriggered) {
                    obstacle.nearMissTriggered = true;
                    this.audioManager.playSound('near_miss');
                    this.achievementSystem.recordNearMiss();
                    this.animationController.createFloatingText('😎 +5', obstacle.x, obstacle.y - 20, [0.0, 1.0, 1.0, 1.0], entityManager);
                    this.scoreSystem.addPoints(5);
                    this.achievementSystem.checkAchievements();
                    
                    // Near miss sparkles
                    this.particleSystem.createSparkles(playerRight, this.player.y + this.player.height / 2, [0.0, 1.0, 1.0], 10, entityManager);
                }
            }
            
            if (this.player.checkObstacleCollision(obstacle)) {
                if (this.player.alive) {
                    this.audioManager.playSound('hit');
                }
                this.achievementSystem.recordDamage();
                
                // Combo break notification
                if (this.scoreSystem.combo > 3) {
                    this.audioManager.playSound('combo_break');
                    this.achievementSystem.addNotification('💔 Combo Perso!', `Hai perso la combo x${this.scoreSystem.combo}`, 'warning');
                }
            }
        }
    }

    /**
     * Check collectible collisions
     */
    checkCollectibleCollisions(entityManager) {
        const collectibles = entityManager.getEntities('collectibles');
        
        for (let i = collectibles.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(collectibles[i])) {
                const collectible = collectibles[i];
                collectibles.splice(i, 1);
                const points = this.scoreSystem.addCollectible();
                this.audioManager.playSound('collect');
                
                this.achievementSystem.recordCollectible();
                this.achievementSystem.checkAchievements();
                
                // Streak notification every 5
                if (this.achievementSystem.currentStreak > 0 && this.achievementSystem.currentStreak % 5 === 0) {
                    this.audioManager.playSound('streak');
                    this.achievementSystem.addNotification(`🔥 Streak x${this.achievementSystem.currentStreak}!`, 'Continua così!', 'streak');
                }
                
                this.animationController.createFloatingText(`+${points}`, collectible.x, collectible.y, [1.0, 0.9, 0.2, 1.0], entityManager);
                
                // Show combo animation
                const combo = this.scoreSystem.getCombo();
                const multiplier = this.scoreSystem.getComboMultiplier();
                this.animationController.showCombo(combo, multiplier, 0, 80); // x, y will be set in controller
                
                // FLOATING TEXT EPICO per COMBO AL CENTRO!
                if (combo >= 5) {
                    let comboText = '';
                    let comboColor = [1.0, 1.0, 1.0, 1.0];
                    
                    if (combo >= 50) {
                        comboText = `🌟 x${combo} DIVINO! 🌟`;
                        comboColor = [1.0, 0.0, 1.0, 1.0]; // Magenta
                    } else if (combo >= 30) {
                        comboText = `🔥 x${combo} EPICO! 🔥`;
                        comboColor = [1.0, 0.3, 0.0, 1.0]; // Arancione fuoco
                    } else if (combo >= 20) {
                        comboText = `💥 x${combo} BRUTALE! 💥`;
                        comboColor = [1.0, 0.2, 0.2, 1.0]; // Rosso
                    } else if (combo >= 15) {
                        comboText = `⚡ x${combo} PAZZESCO! ⚡`;
                        comboColor = [1.0, 1.0, 0.0, 1.0]; // Giallo
                    } else if (combo >= 10) {
                        comboText = `🌈 x${combo} SUPER! 🌈`;
                        comboColor = [0.0, 1.0, 1.0, 1.0]; // Ciano
                    } else if (combo >= 5) {
                        comboText = `🚀 COMBO x${combo}! 🚀`;
                        comboColor = [0.5, 1.0, 0.5, 1.0]; // Verde
                    }
                    
                    // Centro schermo: 400x400 (canvas 800x800)
                    this.animationController.createFloatingText(comboText, 400, 400, comboColor, entityManager);
                }
            }
        }
    }

    /**
     * Check heart collisions
     */
    checkHeartCollisions(entityManager) {
        const hearts = entityManager.getEntities('hearts');
        
        for (let i = hearts.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(hearts[i])) {
                if (this.player.heal(1)) {
                    hearts.splice(i, 1);
                    this.audioManager.playSound('powerup');
                }
            }
        }
    }

    /**
     * Check boost collisions
     */
    checkBoostCollisions(entityManager) {
        const boosts = entityManager.getEntities('boosts');
        
        for (let i = boosts.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(boosts[i])) {
                const boost = boosts[i];
                boosts.splice(i, 1);
                
                this.player.applyBoost();
                this.audioManager.playSound('boost');
                
                const points = this.scoreSystem.addBoostCombo();
                this.achievementSystem.recordBoost();
                this.achievementSystem.checkAchievements();
                
                this.particleSystem.createBoostExplosion(boost.x, boost.y, entityManager);
                this.animationController.createFloatingText(`+${points} BOOST!`, boost.x, boost.y, [0.0, 1.0, 0.9, 1.0], entityManager);
                
                const combo = this.scoreSystem.getCombo();
                const multiplier = this.scoreSystem.getComboMultiplier();
                this.animationController.showCombo(combo, multiplier, 0, 80);
                
                this.audioManager.playSound('collect');
            }
        }
    }

    /**
     * Check all bonus type collisions
     */
    checkBonusCollisions(entityManager) {
        this.checkMagnetBonusCollisions(entityManager);
        this.checkTimeBonusCollisions(entityManager);
        this.checkShieldBonusCollisions(entityManager);
        this.checkMultiplierBonusCollisions(entityManager);
        this.checkRainbowBonusCollisions(entityManager);
    }

    /**
     * Check magnet bonus collisions
     */
    checkMagnetBonusCollisions(entityManager) {
        const magnetBonuses = entityManager.getEntities('magnetBonuses');
        
        for (let i = magnetBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(magnetBonuses[i])) {
                const magnet = magnetBonuses[i];
                magnetBonuses.splice(i, 1);
                
                // Magnetize all collectibles
                const collectibles = entityManager.getEntities('collectibles');
                collectibles.forEach(c => {
                    c.magnetized = true;
                    c.magnetDuration = this.player.isTurboActive ? 8.0 : 5.0;
                });
                
                this.particleSystem.createBonusExplosion(magnet.x, magnet.y, magnet.color, 80, entityManager);
                this.animationController.createFloatingText('🧲 MAGNETE!', magnet.x, magnet.y, magnet.color, entityManager);
                this.achievementSystem.addNotification('🧲 Magnete Attivo!', 'Tutti i collectibles sono attratti!', 'info');
                this.audioManager.playSound('powerup');
            }
        }
    }

    /**
     * Check time slow bonus collisions
     */
    checkTimeBonusCollisions(entityManager) {
        const timeBonuses = entityManager.getEntities('timeBonuses');
        
        for (let i = timeBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(timeBonuses[i])) {
                const timeSlow = timeBonuses[i];
                timeBonuses.splice(i, 1);
                
                // Slow motion for 8 seconds (handled in GameController)
                this.particleSystem.createBonusExplosion(timeSlow.x, timeSlow.y, timeSlow.color, 80, entityManager);
                this.animationController.createFloatingText('⏰ SLOW MOTION!', timeSlow.x, timeSlow.y, timeSlow.color, entityManager);
                this.achievementSystem.addNotification('⏰ Tempo Rallentato!', 'Hai 8 secondi di tempo!', 'info');
                this.audioManager.playSound('powerup');
                
                // Return true to signal GameController to apply time scale
                return { type: 'timeSlow', activated: true };
            }
        }
        return null;
    }

    /**
     * Check shield bonus collisions
     */
    checkShieldBonusCollisions(entityManager) {
        const shieldBonuses = entityManager.getEntities('shieldBonuses');
        
        for (let i = shieldBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(shieldBonuses[i])) {
                const shield = shieldBonuses[i];
                shieldBonuses.splice(i, 1);
                
                this.player.shieldActive = true;
                this.player.shieldDuration = 10.0;
                
                this.particleSystem.createBonusExplosion(shield.x, shield.y, shield.color, 80, entityManager);
                this.animationController.createFloatingText('🛡️ SCUDO!', shield.x, shield.y, shield.color, entityManager);
                this.achievementSystem.addNotification('🛡️ Scudo Attivo!', 'Sei invincibile per 10 secondi!', 'achievement');
                this.audioManager.playSound('powerup');
            }
        }
    }

    /**
     * Check multiplier bonus collisions
     */
    checkMultiplierBonusCollisions(entityManager) {
        const multiplierBonuses = entityManager.getEntities('multiplierBonuses');
        
        for (let i = multiplierBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(multiplierBonuses[i])) {
                const multi = multiplierBonuses[i];
                multiplierBonuses.splice(i, 1);
                
                this.scoreSystem.bonusMultiplier = 3.0;
                this.scoreSystem.bonusMultiplierDuration = 12.0;
                
                this.particleSystem.createBonusExplosion(multi.x, multi.y, multi.color, 80, entityManager);
                this.animationController.createFloatingText('✖️3 PUNTI!', multi.x, multi.y, multi.color, entityManager);
                this.achievementSystem.addNotification('💰 Moltiplicatore x3!', 'Tutti i punti triplicati per 12 secondi!', 'achievement');
                this.audioManager.playSound('powerup');
            }
        }
    }

    /**
     * Check rainbow bonus collisions
     */
    checkRainbowBonusCollisions(entityManager) {
        const rainbowBonuses = entityManager.getEntities('rainbowBonuses');
        
        for (let i = rainbowBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(rainbowBonuses[i])) {
                const rainbow = rainbowBonuses[i];
                rainbowBonuses.splice(i, 1);
                
                // Activate ALL powers
                const collectibles = entityManager.getEntities('collectibles');
                collectibles.forEach(c => { 
                    c.magnetized = true; 
                    c.magnetDuration = 8.0; 
                });
                
                this.player.shieldActive = true;
                this.player.shieldDuration = 15.0;
                this.scoreSystem.bonusMultiplier = 5.0;
                this.scoreSystem.bonusMultiplierDuration = 15.0;
                
                // RAINBOW explosion
                for (let j = 0; j < 5; j++) {
                    setTimeout(() => {
                        const hue = (j * 72) % 360;
                        const rgb = this.hslToRgb(hue / 360, 1.0, 0.5);
                        this.particleSystem.createBonusExplosion(rainbow.x, rainbow.y, rgb, 120, entityManager);
                    }, j * 150);
                }
                
                this.animationController.createFloatingText('🌈 RAINBOW POWER!', rainbow.x, rainbow.y, [1.0, 1.0, 1.0, 1.0], entityManager);
                this.achievementSystem.addNotification('🌈 RAINBOW POWER!', 'TUTTI I POTERI ATTIVI!', 'achievement');
                this.audioManager.playSound('powerup');
                
                this.animationController.triggerScreenFlash(0.5, [1.0, 1.0, 1.0]);
                
                // Return signal for time scale
                return { type: 'rainbow', activated: true };
            }
        }
        return null;
    }

    /**
     * Check powerup collisions
     */
    checkPowerupCollisions(entityManager, powerupSystem) {
        const powerups = entityManager.getEntities('powerups');
        
        for (let i = powerups.length - 1; i >= 0; i--) {
            if (this.player.checkPowerupCollision(powerups[i])) {
                const powerup = powerups[i];
                powerup.collected = true;

                this.particleSystem.createPowerupExplosion(powerup.x, powerup.y, powerup.powerupType || powerup.type, entityManager);

                const powerupType = powerup.powerupType || powerup.type;
                const activated = powerupSystem.activatePowerup(
                    powerupType,
                    powerup.duration,
                    powerup.cooldown
                );

                if (activated) {
                    powerups.splice(i, 1);
                    this.achievementSystem.recordPowerup();
                    this.achievementSystem.checkAchievements();
                }
            }
        }
    }

    /**
     * HSL to RGB conversion
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }
}
