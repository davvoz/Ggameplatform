/**
 * Player - Main player entity with physics and controls
 * Follows Single Responsibility Principle
 */
export class Player {
    constructor(x, y, canvasHeight) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.velocityY = 0;
        this.velocityX = 0;
        this.gravity = 750;
        this.jumpForce = -550;
        this.minJumpForce = -350;
        this.maxJumpForce = -700;
        this.superJumpForce = -950; // Super jump powerup
        this.isGrounded = false;
        this.isJumping = false;
        this.canvasHeight = canvasHeight;
        this.color = [0.2, 0.6, 1.0, 1.0]; // Blue player
        this.maxFallSpeed = 600;
        this.alive = true;
        
        // Sistema cuori/energia
        this.maxHealth = 5;
        this.health = 5;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.invulnerabilityDuration = 1.5; // 1.5 secondi dopo danno
        this.damageFlash = 0;
        
        // Shield bonus
        this.shieldActive = false;
        this.shieldDuration = 0;
        this.shieldRotation = 0;
        
        // Boost system
        this.boostActive = false;
        this.boostTimer = 0;
        this.boostDuration = 3.0; // 3 secondi di boost
        this.boostSpeedMultiplier = 1.8; // 80% più veloce
        this.boostParticles = [];
        this.boostDecelerating = false;
        this.boostDecelerationTime = 0;
        this.boostDecelerationDuration = 2.5; // 2.5 secondi per decelerazione molto dolce
        this.boostPeakVelocity = 0; // Velocità di picco del boost
        
        // Powerup states
        this.powerups = {
            immortality: false,
            flight: false,
            superJump: false
        };
        
        // Animation
        this.animationTime = 0;
        this.trailParticles = [];
        this.currentPlatform = null;
        
        // Idle animation
        this.idleAnimationTime = 0;
        this.idleBobbingAmplitude = 2; // Pixels
        this.idleBobbingSpeed = 2; // Cycles per second
        this.isIdle = false;
        
        // Landing detection
        this.wasGrounded = false;
        this.justLanded = false;
        
        // Sistema espressioni e animazioni
        this.expression = 'happy'; // happy, worried, excited, surprised, determined
        this.eyeBlinkTimer = 0;
        this.eyeBlinkInterval = 3 + Math.random() * 2; // Battito ciglia casuale
        this.isBlinking = false;
        this.blinkDuration = 0.15;
        
        // Squash and stretch animation
        this.squashAmount = 0;
        this.stretchAmount = 0;
        this.squashDecay = 8; // Velocità decay squash
        
        // Camera shake
        this.cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        
        // Rotazione player per dinamismo
        this.rotation = 0;
        this.targetRotation = 0;
        this.rotationSpeed = 8;
        
        // Anticipazione salto
        this.isPreparingJump = false;
        this.jumpPreparationTime = 0;
    }

    jump() {
        // Flight powerup allows unlimited jumping
        if (this.isGrounded || this.powerups.flight) {
            // Animazione anticipazione salto
            this.squashAmount = 0.3; // Compresso prima del salto
            this.expression = 'determined';
            
            // Apply jump force (super jump if active)
            const jumpPower = this.powerups.superJump ? this.superJumpForce : this.maxJumpForce;
            this.velocityY = jumpPower;
            this.isGrounded = false;
            this.isJumping = true;
            
            // Stretch verso l'alto quando salta
            this.stretchAmount = 0.4;
            this.targetRotation = -0.2; // Leggera rotazione all'indietro
            
            return true; // Successful jump for sound trigger
        }
        return false;
    }

    releaseJump(pressDuration) {
        if (this.isJumping && this.velocityY < 0) {
            // Modulate jump based on hold time
            const shortTapThreshold = 100; // 100ms
            const longTapThreshold = 200; // 200ms
            
            if (pressDuration < shortTapThreshold) {
                // Very short tap: minimal jump (50% power)
                this.velocityY = this.velocityY * 0.5;
            } else if (pressDuration < longTapThreshold) {
                // Medium tap: partial jump (70% power)
                this.velocityY = this.velocityY * 0.7;
            }
            // Long hold (>200ms): full jump - no reduction
            
            this.isJumping = false;
        }
    }

    update(deltaTime) {
        if (!this.alive) return;

        this.animationTime += deltaTime;
        
        // Rilevamento atterraggio per suono e animazione
        this.justLanded = false;
        if (this.isGrounded && !this.wasGrounded) {
            this.justLanded = true;
            // Animazione squash su atterraggio
            this.squashAmount = 0.4;
            this.expression = 'surprised';
            // Camera shake su atterraggio
            this.addCameraShake(3, 0.15);
        }
        this.wasGrounded = this.isGrounded;
        
        // Update espressioni basate sul contesto
        this.updateExpression(deltaTime);
        
        // Update blink (battito ciglia)
        this.updateBlink(deltaTime);
        
        // Update squash & stretch
        this.updateSquashStretch(deltaTime);
        
        // Update rotazione
        this.updateRotation(deltaTime);
        
        // Update camera shake
        this.updateCameraShake(deltaTime);
        
        // Idle animation quando fermo a terra
        if (this.isGrounded && Math.abs(this.velocityX) < 50 && Math.abs(this.velocityY) < 10) {
            this.isIdle = true;
            this.idleAnimationTime += deltaTime;
        } else {
            this.isIdle = false;
            this.idleAnimationTime = 0;
        }
        
        // Update invulnerabilità
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
        
        // Update shield
        if (this.shieldActive) {
            this.shieldDuration -= deltaTime;
            this.shieldRotation += deltaTime * 3; // Rotazione scudo
            if (this.shieldDuration <= 0) {
                this.shieldActive = false;
                this.shieldDuration = 0;
            }
        }
        
        // Update damage flash
        if (this.damageFlash > 0) {
            this.damageFlash -= deltaTime;
        }
        
        // Update boost
        if (this.boostActive) {
            this.boostTimer -= deltaTime;
            if (this.boostTimer <= 0) {
                // Inizia decelerazione invece di fermarsi bruscamente
                this.boostActive = false;
                this.boostDecelerating = true;
                this.boostDecelerationTime = 0;
                this.boostPeakVelocity = this.velocityX;
            }
            
            // Genera particelle boost
            this.boostParticles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: -150 - Math.random() * 50,
                vy: (Math.random() - 0.5) * 100,
                life: 0.4,
                maxLife: 0.4,
                size: 5 + Math.random() * 3,
                color: [0.0, 1.0, 0.9, 1.0]
            });
        }
        
        // Gestione decelerazione fluida del boost
        if (this.boostDecelerating) {
            this.boostDecelerationTime += deltaTime;
            const progress = Math.min(1.0, this.boostDecelerationTime / this.boostDecelerationDuration);
            
            // Easing esponenziale in uscita - decelerazione molto dolce e naturale
            const smoothEase = (t) => {
                return 1 - Math.pow(2, -10 * t);
            };
            
            const easedProgress = smoothEase(progress);
            
            // Interpola da velocità di picco a 0 con easing molto dolce
            this.velocityX = this.boostPeakVelocity * (1 - easedProgress);
            
            // Particelle decelerazione (meno intense)
            if (Math.random() < 0.3) {
                this.boostParticles.push({
                    x: this.x + this.width / 2,
                    y: this.y + this.height / 2,
                    vx: -100 - Math.random() * 30,
                    vy: (Math.random() - 0.5) * 60,
                    life: 0.3,
                    maxLife: 0.3,
                    size: 3 + Math.random() * 2,
                    color: [0.0, 0.8, 0.7, 0.7]
                });
            }
            
            if (progress >= 1.0) {
                this.boostDecelerating = false;
                this.velocityX = 0;
            }
        }
        
        // Update boost particles
        this.boostParticles = this.boostParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Apply gravity (reduced if flight is active)
        const currentGravity = this.powerups.flight ? this.gravity * 0.3 : this.gravity;
        this.velocityY += currentGravity * deltaTime;
        
        // Cap fall speed
        if (this.velocityY > this.maxFallSpeed) {
            this.velocityY = this.maxFallSpeed;
        }

        // Update position
        this.y += this.velocityY * deltaTime;
        
        // Il player NON si muove mai in X - rimane sempre a 100px
        // Solo l'ambiente si muove attorno a lui
        // VelocityX viene usata solo come riferimento per la velocità della camera
        
        // Decay velocityX (friction) - solo se non in boost o decelerazione
        if (!this.boostActive && !this.boostDecelerating) {
            this.velocityX *= 0.92;
        }

        // Check if fell off screen (game over quando cade troppo basso, a meno che immortale)
        if (this.y > this.canvasHeight && !this.powerups.immortality) {
            this.alive = false;
        }
        
        // Update trail particles for powerups
        this.updateTrailParticles(deltaTime);
    }
    
    updateTrailParticles(deltaTime) {
        // Add trail particles when powerups are active (più frequenti e visibili)
        if (this.powerups.immortality || this.powerups.flight || this.powerups.superJump) {
            // Aggiungi più particelle per frame
            for (let i = 0; i < 2; i++) {
                this.trailParticles.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                    y: this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                    life: 0.8,
                    maxLife: 0.8,
                    color: this.getPowerupTrailColor(),
                    size: 8 + Math.random() * 4
                });
            }
        }
        
        // Update existing particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            this.trailParticles[i].life -= deltaTime;
            if (this.trailParticles[i].life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
        
        // Limita il numero di particelle per performance
        if (this.trailParticles.length > 50) {
            this.trailParticles.splice(0, this.trailParticles.length - 50);
        }
    }
    
    getPowerupTrailColor() {
        if (this.powerups.immortality) return [1.0, 0.84, 0.0, 0.8]; // Gold
        if (this.powerups.flight) return [0.4, 0.7, 1.0, 0.8]; // Light blue
        if (this.powerups.superJump) return [1.0, 0.3, 0.5, 0.8]; // Pink
        return [1.0, 1.0, 1.0, 0.5];
    }
    
    takeDamage(amount = 1) {
        // Scudo blocca TUTTI i danni
        if (this.shieldActive) return false;
        
        if (this.invulnerable || this.powerups.immortality) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.invulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        this.damageFlash = 0.5; // Flash rosso per 0.5s
        
        // Espressione e animazioni danno
        this.expression = 'surprised';
        this.squashAmount = 0.5; // Forte squash
        this.addCameraShake(8, 0.3); // Camera shake forte
        
        if (this.health <= 0) {
            this.alive = false;
        }
        
        return true; // Danno inflitto
    }
    
    heal(amount = 1) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health > oldHealth; // True se curato
    }
    
    applyBoost() {
        this.boostActive = true;
        this.boostTimer = this.boostDuration;
        
        // Salva la velocità boost per la camera
        this.velocityX = 300 * this.boostSpeedMultiplier;
        
        // Small upward boost for visual effect
        this.velocityY = Math.min(this.velocityY, -150);
    }

    checkPlatformCollision(platform, toleranceOverride = null) {
        if (!this.alive) return false;

        const playerBottom = this.y + this.height;
        const playerRight = this.x + this.width;
        const playerLeft = this.x;
        const platformRight = platform.x + platform.width;
        const platformLeft = platform.x;
        const platformTop = platform.y;

        // Check horizontal overlap
        const horizontalOverlap = playerRight > platformLeft && playerLeft < platformRight;
        
        // Check if player is on top of platform (generous tolerance)
        // Use toleranceOverride if provided (for safety platform), otherwise use default 15
        const tolerance = toleranceOverride !== null ? toleranceOverride : 15;
        const verticalDistance = Math.abs(playerBottom - platformTop);
        const onPlatform = verticalDistance < tolerance && horizontalOverlap;

        if (onPlatform && this.velocityY >= 0) {
            // Snap to platform
            this.y = platformTop - this.height;
            
            // Apply bounce multiplier for bouncy platforms
            if (platform.bounceMultiplier && platform.bounceMultiplier > 1.0) {
                this.velocityY = -Math.abs(this.velocityY) * platform.bounceMultiplier;
                
                // Comprimi la molla se è una spring platform
                if (platform.platformType === 'spring') {
                    platform.springCompression = 1.0; // Compressione massima
                }
            } else {
                this.velocityY = 0;
            }
            
            this.isGrounded = true;
            this.currentPlatform = platform;
            
            // Trigger crumbling for crumbling platforms
            if (platform.platformType === 'crumbling' && !platform.isCrumbling) {
                platform.isCrumbling = true;
            }
            
            return true;
        } else {
            if (this.currentPlatform === platform) {
                this.currentPlatform = null;
            }
        }

        return false;
    }

    checkObstacleCollision(obstacle) {
        if (!this.alive) return false;
        
        // Immortality powerup makes player invincible
        if (this.powerups.immortality) return false;

        const playerRight = this.x + this.width;
        const playerBottom = this.y + this.height;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleBottom = obstacle.y + obstacle.height;

        if (this.x < obstacleRight &&
            playerRight > obstacle.x &&
            this.y < obstacleBottom &&
            playerBottom > obstacle.y) {
            return this.takeDamage(1); // Usa sistema cuori
        }

        return false;
    }
    
    checkPowerupCollision(powerup) {
        if (!this.alive) return false;

        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;
        const powerupCenterX = powerup.x;
        const powerupCenterY = powerup.y;

        const distance = Math.sqrt(
            Math.pow(playerCenterX - powerupCenterX, 2) +
            Math.pow(playerCenterY - powerupCenterY, 2)
        );

        // Raggio di collisione aumentato per facilitare la raccolta
        const collisionRadius = this.width / 2 + powerup.radius * 1.5;
        return distance < collisionRadius;
    }

    checkCollectibleCollision(collectible) {
        if (!this.alive) return false;

        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;
        const collectibleCenterX = collectible.x;
        const collectibleCenterY = collectible.y;

        const distance = Math.sqrt(
            Math.pow(playerCenterX - collectibleCenterX, 2) +
            Math.pow(playerCenterY - collectibleCenterY, 2)
        );

        return distance < (this.width / 2 + collectible.radius);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocityY = 0;
        this.velocityX = 0;
        this.isGrounded = false;
        this.isJumping = false;
        this.alive = true;
        this.powerups = {
            immortality: false,
            flight: false,
            superJump: false
        };
        this.trailParticles = [];
        this.boostParticles = [];
        this.boostActive = false;
        this.boostTimer = 0;
        this.boostDecelerating = false;
        this.boostDecelerationTime = 0;
        this.boostPeakVelocity = 0;
        this.health = this.maxHealth;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.damageFlash = 0;
        this.currentPlatform = null;
        this.animationTime = 0;
        this.idleAnimationTime = 0;
        this.isIdle = false;
        this.wasGrounded = false;
        this.justLanded = false;
        this.expression = 'happy';
        this.eyeBlinkTimer = 0;
        this.isBlinking = false;
        this.squashAmount = 0;
        this.stretchAmount = 0;
        this.rotation = 0;
        this.targetRotation = 0;
        this.cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    }
    
    activatePowerup(type) {
        switch (type) {
            case 'immortality':
                this.powerups.immortality = true;
                break;
            case 'flight':
                this.powerups.flight = true;
                break;
            case 'superJump':
                this.powerups.superJump = true;
                break;
        }
    }
    
    deactivatePowerup(type) {
        switch (type) {
            case 'immortality':
                this.powerups.immortality = false;
                break;
            case 'flight':
                this.powerups.flight = false;
                break;
            case 'superJump':
                this.powerups.superJump = false;
                break;
        }
    }
    
    getTrailParticles() {
        return this.trailParticles;
    }
    
    getBoostParticles() {
        return this.boostParticles;
    }
    
    getIdleOffset() {
        if (!this.isIdle) return 0;
        // Movimento sinusoidale di respirazione
        return Math.sin(this.idleAnimationTime * this.idleBobbingSpeed * Math.PI * 2) * this.idleBobbingAmplitude;
    }
    
    hasJustLanded() {
        return this.justLanded;
    }
    
    updateExpression(deltaTime) {
        // Cambia espressione in base al contesto
        if (!this.alive) {
            this.expression = 'dead';
        } else if (this.powerups.immortality || this.powerups.flight || this.powerups.superJump) {
            this.expression = 'excited';
        } else if (this.boostActive) {
            this.expression = 'determined';
        } else if (!this.isGrounded && this.velocityY > 300) {
            this.expression = 'worried'; // Caduta veloce
        } else if (!this.isGrounded && this.velocityY < -200) {
            this.expression = 'excited'; // Salto verso l'alto
        } else if (this.isGrounded && this.isIdle) {
            // Alterna tra happy e blink quando idle
            this.expression = 'happy';
        } else if (this.isGrounded) {
            this.expression = 'happy';
        }
    }
    
    updateBlink(deltaTime) {
        if (this.isBlinking) {
            this.eyeBlinkTimer += deltaTime;
            if (this.eyeBlinkTimer >= this.blinkDuration) {
                this.isBlinking = false;
                this.eyeBlinkTimer = 0;
                this.eyeBlinkInterval = 2 + Math.random() * 3;
            }
        } else {
            this.eyeBlinkTimer += deltaTime;
            if (this.eyeBlinkTimer >= this.eyeBlinkInterval) {
                this.isBlinking = true;
                this.eyeBlinkTimer = 0;
            }
        }
    }
    
    updateSquashStretch(deltaTime) {
        // Decay squash verso 0
        if (this.squashAmount > 0) {
            this.squashAmount = Math.max(0, this.squashAmount - deltaTime * this.squashDecay);
        }
        
        // Decay stretch verso 0
        if (this.stretchAmount > 0) {
            this.stretchAmount = Math.max(0, this.stretchAmount - deltaTime * this.squashDecay);
        }
        
        // Stretch automatico durante la caduta veloce
        if (!this.isGrounded && this.velocityY > 200) {
            this.stretchAmount = Math.min(0.3, this.velocityY / 1000);
        }
        
        // Squash anticipazione quando sta per atterrare
        if (!this.isGrounded && this.velocityY > 400) {
            this.squashAmount = Math.min(0.2, (this.velocityY - 400) / 1000);
        }
    }
    
    updateRotation(deltaTime) {
        // Interpola rotazione verso target
        const rotationDiff = this.targetRotation - this.rotation;
        this.rotation += rotationDiff * this.rotationSpeed * deltaTime;
        
        // Rotazione basata su velocità
        if (!this.isGrounded) {
            if (this.velocityY < -200) {
                this.targetRotation = -0.15; // Ruota indietro quando sale
            } else if (this.velocityY > 200) {
                this.targetRotation = 0.15; // Ruota avanti quando scende
            } else {
                this.targetRotation = 0;
            }
        } else {
            this.targetRotation = 0; // Livella quando a terra
        }
        
        // Rotazione durante boost
        if (this.boostActive) {
            this.targetRotation = -0.1;
        }
    }
    
    addCameraShake(intensity, duration) {
        this.cameraShake.intensity = intensity;
        this.cameraShake.duration = duration;
    }
    
    updateCameraShake(deltaTime) {
        if (this.cameraShake.duration > 0) {
            this.cameraShake.duration -= deltaTime;
            
            const shake = this.cameraShake.intensity;
            this.cameraShake.x = (Math.random() - 0.5) * shake * 2;
            this.cameraShake.y = (Math.random() - 0.5) * shake * 2;
            
            // Decay intensity
            this.cameraShake.intensity *= 0.9;
        } else {
            this.cameraShake.x = 0;
            this.cameraShake.y = 0;
            this.cameraShake.intensity = 0;
        }
    }
    
    getCameraShake() {
        return this.cameraShake;
    }
    
    getExpression() {
        return this.expression;
    }
    
    getSquashStretch() {
        return {
            squash: this.squashAmount,
            stretch: this.stretchAmount
        };
    }
    
    getRotation() {
        return this.rotation;
    }
    
    isEyeBlinking() {
        return this.isBlinking;
    }

    updateCanvasHeight(height) {
        this.canvasHeight = height;
    }
}
