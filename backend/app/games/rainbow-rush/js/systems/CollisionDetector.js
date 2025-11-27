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
        this.levelManager = null; // Will be set from GameController
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
                
                // Suono negativo quando atterriamo (usa previousVelocityY perché velocityY potrebbe essere già azzerata)
                if (this.player.previousVelocityY > 50 && !this.player.wasOnSafetyPlatform) {
                    this.audioManager.playSound('safety_land');
                    this.player.wasOnSafetyPlatform = true;
                }
                
                // Force position above platform
                if (this.player.velocityY > 0) {
                    this.player.y = safetyPlatform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isGrounded = true;
                }
            } else {
                this.player.wasOnSafetyPlatform = false;
            }
        }

        // Platform collisions
        this.checkPlatformCollisions(entityManager);

        // Obstacle collisions
        this.checkObstacleCollisions(entityManager);
        
        // NEW: Enemy collisions
        this.checkEnemyCollisions(entityManager);

        // Collectible collisions
        this.checkCollectibleCollisions(entityManager);

        // Heart collisions
        this.checkHeartCollisions(entityManager);

        // Shield collisions
        this.checkShieldCollisions(entityManager);

        // Magnet collisions
        this.checkMagnetCollisions(entityManager);

        // Boost collisions
        this.checkBoostCollisions(entityManager);

        // Bonus collisions - REMOVED: now called separately in GameController to get return value
        // this.checkBonusCollisions(entityManager);

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
     * OPTIMIZED: Spatial early exit
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
            
            // Early rejection - skip if too far horizontally
            if (obstacle.x > playerRight + 100 || obstacle.x + obstacle.width < this.player.x - 50) {
                continue;
            }
            
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
            
            // Controlla collisione con nemico/ostacolo
            if (this.player.checkObstacleCollision(obstacle)) {
                // Usa un flag sull'ostacolo per evitare di processare la collisione ripetutamente
                if (!obstacle.hasHitPlayer && this.player.alive) {
                    obstacle.hasHitPlayer = true; // Segna che questo ostacolo ha già colpito
                    
                    this.audioManager.playSound('hit');
                    
                    // Floating text per il danno
                    this.animationController.createFloatingText(
                        '💥 -1 ❤️', 
                        this.player.x + this.player.width / 2, 
                        this.player.y - 20, 
                        [1.0, 0.2, 0.2, 1.0], 
                        entityManager
                    );
                    
                    // Camera shake intenso
                    this.player.addCameraShake(15, 0.5); // Shake forte per 0.5 secondi
                    
                    // Screen flash rosso
                    this.animationController.triggerScreenFlash(0.4, [1.0, 0.2, 0.2]);
                    
                    // Particelle di danno intorno al player
                    for (let j = 0; j < 12; j++) {
                        const angle = (Math.PI * 2 * j) / 12;
                        const speed = 100 + Math.random() * 80;
                        entityManager.addEntity('powerupParticles', {
                            x: this.player.x + this.player.width / 2,
                            y: this.player.y + this.player.height / 2,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed - 50,
                            life: 0.6,
                            maxLife: 0.6,
                            size: 4 + Math.random() * 3,
                            color: [1.0, 0.2, 0.2, 1.0],
                            gravity: 200,
                            type: 'damage-particle'
                        });
                    }
                    
                    this.achievementSystem.recordDamage();
                    
                    // Combo break notification
                    if (this.scoreSystem.combo > 3) {
                        this.audioManager.playSound('combo_break');
                        this.achievementSystem.addNotification('💔 Combo Perso!', `Hai perso la combo x${this.scoreSystem.combo}`, 'warning');
                    }
                }
            } else {
                // Reset flag quando non c'è più collisione
                obstacle.hasHitPlayer = false;
            }
        }
    }

    /**
     * Check collectible collisions
     * OPTIMIZED: Early exit se troppo distanti
     */
    checkCollectibleCollisions(entityManager) {
        const collectibles = entityManager.getEntities('collectibles');
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const collectible = collectibles[i];
            
            // Early rejection - skip if too far away (Manhattan distance)
            const dx = Math.abs(collectible.x - playerCenterX);
            const dy = Math.abs(collectible.y - playerCenterY);
            if (dx > 150 || dy > 150) continue;
            
            // Apply magnet effect if player has magnet powerup
            if (this.player.hasMagnet && collectible.type === 'collectible') {
                const dx = this.player.x + this.player.width / 2 - collectible.x;
                const dy = this.player.y + this.player.height / 2 - collectible.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.magnetRange && distance > 0) {
                    // Attract collectible towards player
                    const attractionSpeed = 8;
                    collectible.x += (dx / distance) * attractionSpeed;
                    collectible.y += (dy / distance) * attractionSpeed;
                }
            }
            
            if (this.player.checkCollectibleCollision(collectible)) {
                collectibles.splice(i, 1);
                const points = this.scoreSystem.addCollectible();
                this.audioManager.playSound('collect');
                
                // Track coin collection for level manager
                if (this.levelManager) {
                    this.levelManager.recordCoinCollected();
                }
                
                this.achievementSystem.recordCollectible();
                this.achievementSystem.checkAchievements();
                
                // Streak notification every 5
                if (this.achievementSystem.currentStreak > 0 && this.achievementSystem.currentStreak % 5 === 0) {
                    this.audioManager.playSound('streak');
                    this.achievementSystem.addNotification(`🔥 Streak x${this.achievementSystem.currentStreak}!`, 'Continua così!', 'streak');
                }
                
                // Show score with speed multiplier
                const speedMult = this.scoreSystem.getSpeedMultiplier();
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
                
                this.animationController.createFloatingText(text, collectible.x, collectible.y, color, entityManager);
                
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
                // Heal player (returns true if health increased)
                const healed = this.player.heal(1);
                
                // Always remove heart, but only play sound if healed
                hearts.splice(i, 1);
                
                if (healed) {
                    this.audioManager.playSound('powerup');
                    this.scoreSystem.addPoints(25); // Bonus points for healing
                }
            }
        }
    }

    /**
     * Check shield bonus collisions
     */
    checkShieldCollisions(entityManager) {
        const shields = entityManager.getEntities('shieldBonuses');
        
        for (let i = shields.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(shields[i])) {
                const shield = shields[i];
                shields.splice(i, 1);
                
                // Activate shield
                this.player.hasShield = true;
                this.player.shieldDuration = shield.duration || 15000; // Usa duration dal collectible o fallback
                this.player.shieldStartTime = Date.now();
                
                this.scoreSystem.addPoints(75);
                this.audioManager.playSound('powerup');
                
                // Create particles
                this.particleSystem.createBonusExplosion(shield.x, shield.y, '#00BFFF', 8, entityManager);
                
                // Floating text
                entityManager.addEntity('floatingTexts', {
                    x: shield.x,
                    y: shield.y - 30,
                    text: 'SHIELD!',
                    color: [0.0, 0.75, 1.0, 1.0],
                    velocity: { x: 0, y: -50 },
                    life: 1.0,
                    maxLife: 1.0,
                    fadeSpeed: 1.0,
                    type: 'floatingText'
                });
                
            }
        }
    }

    /**
     * Check magnet bonus collisions
     */
    checkMagnetCollisions(entityManager) {
        const magnets = entityManager.getEntities('magnetBonuses');
        
        for (let i = magnets.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(magnets[i])) {
                const magnet = magnets[i];
                magnets.splice(i, 1);
                
                // Activate magnet
                this.player.hasMagnet = true;
                this.player.magnetDuration = magnet.duration || 10000; // Usa duration dal collectible o fallback
                this.player.magnetStartTime = Date.now();
                this.player.magnetRange = 200; // pixels
                
                this.scoreSystem.addPoints(75);
                this.audioManager.playSound('powerup');
                
                // Create particles
                this.particleSystem.createBonusExplosion(magnet.x, magnet.y, '#FFA500', 8, entityManager);
                
                // Floating text
                entityManager.addEntity('floatingTexts', {
                    x: magnet.x,
                    y: magnet.y - 30,
                    text: 'COIN MAGNET!',
                    color: [1.0, 0.65, 0.0, 1.0],
                    velocity: { x: 0, y: -50 },
                    life: 1.0,
                    maxLife: 1.0,
                    fadeSpeed: 1.0,
                    type: 'floatingText'
                });
                
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
                
                // Mostra combo boost se >= 2
                const boostCombo = this.player.boostCombo;
                if (boostCombo >= 2) {
                    const speedBonus = Math.floor(this.player.boostComboSpeedBonus * 100);
                    const speedMult = this.scoreSystem.getSpeedMultiplier();
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
                    
                    this.animationController.createFloatingText(
                        text, 
                        boost.x, 
                        boost.y, 
                        color, 
                        entityManager
                    );
                    
                    // Notifica achievement per combo boost epiche
                    if (boostCombo >= 5) {
                        this.achievementSystem.addNotification(
                            `🚀 BOOST COMBO x${boostCombo}!`, 
                            `+${speedBonus}% velocità!`, 
                            'achievement'
                        );
                    }
                } else {
                    const speedMult = this.scoreSystem.getSpeedMultiplier();
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
                    this.animationController.createFloatingText(text, boost.x, boost.y, color, entityManager);
                }
                
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
        
        const coinRainResult = this.checkCoinRainBonusCollisions(entityManager);
        if (coinRainResult) return coinRainResult;
        
        this.checkShieldBonusCollisions(entityManager);
        this.checkMultiplierBonusCollisions(entityManager);
        
        const rainbowResult = this.checkRainbowBonusCollisions(entityManager);
        if (rainbowResult) return rainbowResult;
        
        this.checkFlightBonusCollisions(entityManager);
        this.checkRechargeBonusCollisions(entityManager);
        this.checkHeartRechargeBonusCollisions(entityManager);
        
        return null;
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
     * Check coin rain bonus collisions
     */
    checkCoinRainBonusCollisions(entityManager) {
        const coinRainBonuses = entityManager.getEntities('coinRainBonuses');
        
        for (let i = coinRainBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(coinRainBonuses[i])) {
                const coinRain = coinRainBonuses[i];
                coinRainBonuses.splice(i, 1);
                
                // Activate coin rain for 10 seconds
                this.particleSystem.createBonusExplosion(coinRain.x, coinRain.y, coinRain.color, 100, entityManager);
                this.animationController.createFloatingText('💰 COIN RAIN!', coinRain.x, coinRain.y, coinRain.color, entityManager);
                this.achievementSystem.addNotification('💰 Pioggia di Monete!', 'Pioverann monete per 10 secondi!', 'achievement');
                this.audioManager.playSound('powerup');
                
                // Return signal to start coin rain effect in GameController
                return { type: 'coinRain', activated: true, duration: 10.0 };
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
     * Check recharge bonus collisions
     */
    checkRechargeBonusCollisions(entityManager) {
        const rechargeBonuses = entityManager.getEntities('rechargeBonuses');
        
        for (let i = rechargeBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(rechargeBonuses[i])) {
                const recharge = rechargeBonuses[i];
                rechargeBonuses.splice(i, 1);
                
                // Accedi al SafetyPlatformSystem tramite il riferimento passato
                if (this.safetyPlatformSystem) {
                    this.safetyPlatformSystem.resetCooldown();
                }
                
                // Esplosione energia elettrica
                for (let j = 0; j < 40; j++) {
                    const angle = (Math.PI * 2 * j) / 40;
                    const speed = 150 + Math.random() * 100;
                    entityManager.addEntity('powerupParticles', {
                        x: recharge.x,
                        y: recharge.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        maxLife: 0.8,
                        size: 4 + Math.random() * 3,
                        color: [0.2, 1.0, 0.4, 1.0],
                        gravity: 0,
                        rotationSpeed: (Math.random() - 0.5) * 10,
                        rotation: 0,
                        type: 'powerup-particle'
                    });
                }
                
                this.particleSystem.createBonusExplosion(recharge.x, recharge.y, recharge.color, 80, entityManager);
                this.animationController.createFloatingText('⚡ RICARICA ISTANTANEA!', recharge.x, recharge.y, [0.2, 1.0, 0.4, 1.0], entityManager);
                this.achievementSystem.addNotification('⚡ Safety Ricaricato!', 'Tutti i pallini ripristinati!', 'achievement');
                this.audioManager.playSound('powerup');
                
                // Screen flash verde
                this.animationController.triggerScreenFlash(0.3, [0.2, 1.0, 0.4]);
            }
        }
    }
    
    /**
     * Check instant flight bonus collisions
     */
    checkFlightBonusCollisions(entityManager) {
        const flightBonuses = entityManager.getEntities('flightBonuses');
        
        for (let i = flightBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(flightBonuses[i])) {
                const flight = flightBonuses[i];
                flightBonuses.splice(i, 1);
                
                this.player.activateInstantFlight();
                
                this.particleSystem.createBonusExplosion(flight.x, flight.y, flight.color, 70, entityManager);
                this.animationController.createFloatingText('🪶 VOLO ISTANTANEO!', flight.x, flight.y, flight.color, entityManager);
                this.achievementSystem.addNotification('🪶 Volo Attivato!', '5 secondi di volo libero!', 'info');
                this.audioManager.playSound('powerup');
            }
        }
    }
    
    /**
     * Check heart recharge bonus collisions
     */
    checkHeartRechargeBonusCollisions(entityManager) {
        const heartRechargeBonuses = entityManager.getEntities('heartRechargeBonuses');
        
        for (let i = heartRechargeBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(heartRechargeBonuses[i])) {
                const heartRecharge = heartRechargeBonuses[i];
                heartRechargeBonuses.splice(i, 1);
                
                // Ricarica tutti i cuoricini
                const healedAmount = this.player.maxHealth - this.player.health;
                this.player.health = this.player.maxHealth;
                
                // Esplosione di cuoricini
                for (let j = 0; j < 50; j++) {
                    const angle = (Math.PI * 2 * j) / 50;
                    const speed = 150 + Math.random() * 120;
                    entityManager.addEntity('powerupParticles', {
                        x: heartRecharge.x,
                        y: heartRecharge.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1.0,
                        maxLife: 1.0,
                        size: 6 + Math.random() * 4,
                        color: [1.0, 0.2 + Math.random() * 0.3, 0.5, 1.0],
                        gravity: -50,
                        rotationSpeed: (Math.random() - 0.5) * 12,
                        rotation: 0,
                        type: 'powerup-particle'
                    });
                }
                
                this.particleSystem.createBonusExplosion(heartRecharge.x, heartRecharge.y, heartRecharge.color, 100, entityManager);
                this.animationController.createFloatingText('💕 CUORI RICARICATI!', heartRecharge.x, heartRecharge.y, [1.0, 0.2, 0.5, 1.0], entityManager);
                
                if (healedAmount > 0) {
                    this.achievementSystem.addNotification('💕 Cuori Completamente Ricaricati!', `+${healedAmount} cuoricini ripristinati!`, 'achievement');
                } else {
                    this.achievementSystem.addNotification('💕 Già al Massimo!', 'Cuori già pieni!', 'info');
                }
                
                this.audioManager.playSound('powerup');
                
                // Screen flash rosa
                this.animationController.triggerScreenFlash(0.4, [1.0, 0.2, 0.5]);
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
     * NEW: Check enemy collisions with player
     */
    checkEnemyCollisions(entityManager) {
        const enemies = entityManager.getEntities('enemies');
        
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            
            // Check player collision with enemy
            if (this.player.checkObstacleCollision(enemy)) {
                if (!enemy.hasHitPlayer && this.player.alive) {
                    enemy.hasHitPlayer = true;
                    
                    // Player takes damage
                    this.audioManager.playSound('hit');
                    
                    // Floating text
                    this.animationController.createFloatingText(
                        `💥 -${enemy.damage} ❤️`, 
                        this.player.x + this.player.width / 2, 
                        this.player.y - 20, 
                        [1.0, 0.2, 0.2, 1.0], 
                        entityManager
                    );
                    
                    // Camera shake
                    this.player.addCameraShake(15, 0.5);
                    
                    // Screen flash
                    this.animationController.triggerScreenFlash(0.4, [1.0, 0.2, 0.2]);
                    
                    // Damage particles
                    for (let j = 0; j < 12; j++) {
                        const angle = (Math.PI * 2 * j) / 12;
                        const speed = 100 + Math.random() * 80;
                        entityManager.addEntity('powerupParticles', {
                            x: this.player.x + this.player.width / 2,
                            y: this.player.y + this.player.height / 2,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed - 50,
                            life: 0.6,
                            maxLife: 0.6,
                            size: 4 + Math.random() * 3,
                            color: [1.0, 0.2, 0.2, 1.0],
                            gravity: 200,
                            type: 'damage-particle'
                        });
                    }
                    
                    this.achievementSystem.recordDamage();
                    
                    // Combo break
                    if (this.scoreSystem.combo > 3) {
                        this.audioManager.playSound('combo_break');
                        this.achievementSystem.addNotification('💔 Combo Perso!', `Hai perso la combo x${this.scoreSystem.combo}`, 'warning');
                    }
                }
            } else {
                enemy.hasHitPlayer = false;
            }
            
            // Check projectile collisions
            if (enemy.projectiles && enemy.projectiles.length > 0) {
                for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
                    const proj = enemy.projectiles[i];
                    
                    // Check if projectile hits player
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const dx = proj.x - playerCenterX;
                    const dy = proj.y - playerCenterY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < (proj.radius + Math.max(this.player.width, this.player.height) / 2)) {
                        // Remove projectile
                        enemy.projectiles.splice(i, 1);
                        
                        // Player takes damage
                        if (this.player.alive) {
                            // FIXED: Applica danno al player
                            const damageTaken = this.player.takeDamage(proj.damage || 1);
                            
                            if (damageTaken) {
                                this.audioManager.playSound('hit');
                                
                                this.animationController.createFloatingText(
                                    `💥 -${proj.damage || 1} ❤️`, 
                                    proj.x, 
                                    proj.y, 
                                    [1.0, 0.2, 0.2, 1.0], 
                                    entityManager
                                );
                                
                                this.player.addCameraShake(10, 0.3);
                                this.achievementSystem.recordDamage();
                                
                                // Combo break
                                if (this.scoreSystem.combo > 3) {
                                    this.audioManager.playSound('combo_break');
                                    this.achievementSystem.addNotification('💔 Combo Perso!', `Hai perso la combo x${this.scoreSystem.combo}`, 'warning');
                                }
                            }
                            
                            // Projectile hit particles
                            for (let j = 0; j < 8; j++) {
                                const angle = (Math.PI * 2 * j) / 8;
                                const speed = 80 + Math.random() * 60;
                                entityManager.addEntity('powerupParticles', {
                                    x: proj.x,
                                    y: proj.y,
                                    vx: Math.cos(angle) * speed,
                                    vy: Math.sin(angle) * speed,
                                    life: 0.4,
                                    maxLife: 0.4,
                                    size: 3 + Math.random() * 2,
                                    color: [...proj.color],
                                    gravity: 150,
                                    type: 'projectile-hit'
                                });
                            }
                        }
                    }
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
