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
        this.maxFallSpeed = 500; // Ridotta da 600 per migliori collisioni
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
        
        // Shield and Magnet powerups
        this.hasShield = false;
        this.shieldDuration = 0;
        this.shieldStartTime = 0;
        
        this.hasMagnet = false;
        this.magnetDuration = 0;
        this.magnetStartTime = 0;
        this.magnetRange = 200;
        
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
        
        // Boost combo system
        this.boostCombo = 0;
        this.boostComboTimer = 0;
        this.boostComboTimeout = 4.0; // 4 secondi per mantenere la combo
        this.boostComboSpeedBonus = 0; // Bonus velocità dalla combo
        
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
        this.expression = 'happy'; // happy, worried, excited, surprised, determined, running, lookingUp
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
        
        // Icy platform sliding
        this.isOnIcyPlatform = false;
        this.slideVelocityX = 0;
        this.slideFriction = 0.96; // Very low friction
        this.slideDecelerationTime = 0;
        this.isSliding = false;
        
        // Turbo boost immortal mode
        this.isTurboActive = false;
        this.turboTimeRemaining = 0;
        this.turboInitialDuration = 0; // Salva la durata totale iniziale
        this.turboCooldownRemaining = 0;
        this.instantFlightActive = false;
        this.instantFlightDuration = 0;
        this.turboCooldownDuration = 12; // 12 secondi cooldown (ridotto da 20)
        this.turboBaseDuration = 3; // 3 secondi base (ridotto da 5) + level bonus
        this.turboSpeedMultiplier = 2.0; // 2x speed (ridotto da 2.5x) - più controllabile
        this.turboTrailParticles = [];
        
        // Safety platform state
        this.onSafetyPlatform = false;
        this.wasOnSafetyPlatform = false;
        this.previousVelocityY = 0;
        
        // Flight horizontal mode - controllo volo orizzontale
        this.isFlightActive = false;
        this.flightTimeRemaining = 0;
        this.flightInitialDuration = 0; // Salva la durata totale iniziale
        this.flightCooldownRemaining = 0;
        this.flightCooldownDuration = 10; // 10 secondi cooldown (ridotto da 15)
        this.flightBaseDuration = 4; // 4 secondi flight (ridotto da 6) + level bonus
        this.flightTargetY = 0; // Target Y position per smooth movement
        this.flightStep = 100; // Pixel per step su/giù
        this.flightTrailParticles = [];
        
        // Instant flight bonus (separate from button flight)
        this.instantFlightActive = false;
        this.instantFlightDuration = 0;
        this.instantFlightMaxDuration = 5.0; // 5 secondi
        
        // Animazione volo fluttuante
        this.flightFloatPhase = 0;
        this.flightFloatAmplitude = 8; // Oscillazione verticale in pixel
        this.wingFlapPhase = 0;
        this.wingFlapSpeed = 8; // Velocità battito ali
        
        // Offscreen altitude scoring
        this.isOffscreenTop = false;
        this.offscreenAltitudeTimer = 0;
        this.offscreenScoreInterval = 0.15; // Score every 0.15 seconds
        this.lastOffscreenScore = 0;
    }

    activateInstantFlight() {
        this.instantFlightActive = true;
        this.instantFlightDuration = this.instantFlightMaxDuration;
        // Inizia il volo dalla posizione corrente (come il flight button)
        this.flightTargetY = this.y;
        this.velocityY = 0;
        // Inizializza le animazioni volo (stesse del flight button)
        this.flightFloatPhase = 0;
        this.wingFlapPhase = 0;
    }
    
    instantFlightMoveUp() {
        if (!this.instantFlightActive) return;
        this.flightTargetY = Math.max(50, this.flightTargetY - this.flightStep);
    }
    
    instantFlightMoveDown() {
        if (!this.instantFlightActive) return;
        this.flightTargetY = Math.min(this.canvasHeight - 50, this.flightTargetY + this.flightStep);
    }
    
    jump() {
        // Flight powerup, flight button or instant flight allows unlimited jumping
        if (this.isGrounded || this.powerups.flight || this.isFlightActive || this.instantFlightActive) {
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
        // Modulate jump ONLY if moving upward (negative velocity)
        if (this.velocityY < 0) {
            // Soglie alte per dare tempo al giocatore
            const shortTapThreshold = 300; // 300ms per tap brevi
            const longTapThreshold = 600; // 600ms per tap medi
            
            let modifier = 1.0;
            let jumpType = "FULL";
            let emoji = "🚀";
            
            if (pressDuration < shortTapThreshold) {
                // Very short tap: minimal jump (35% power)
                modifier = 0.35;
                jumpType = "SHORT";
                emoji = "🐰";
            } else if (pressDuration < longTapThreshold) {
                // Medium tap: partial jump (65% power)
                modifier = 0.65;
                jumpType = "MEDIUM";
                emoji = "🦘";
            }
            
            const oldVelocity = this.velocityY;
            this.velocityY *= modifier;
            
            console.log(`${emoji} ${jumpType} JUMP! Duration: ${pressDuration.toFixed(0)}ms → Modifier: ${(modifier * 100).toFixed(0)}% → Velocity: ${oldVelocity.toFixed(1)} → ${this.velocityY.toFixed(1)}`);
        } else {
            console.log(`❌ releaseJump called but velocityY = ${this.velocityY.toFixed(1)} (not jumping up)`);
        }
    }

    update(deltaTime) {
        // Store previous velocity for collision detection
        this.previousVelocityY = this.velocityY;
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
        
        // Update turbo boost
        if (this.isTurboActive) {
            this.turboTimeRemaining -= deltaTime;
            if (this.turboTimeRemaining <= 0) {
                this.isTurboActive = false;
                this.turboTimeRemaining = 0;
                // Inizia il cooldown SOLO quando il turbo finisce
                this.turboCooldownRemaining = this.turboCooldownDuration;
                console.log(`⏱️ Turbo finito! Cooldown di ${this.turboCooldownDuration}s iniziato`);
            }
            
            // Genera particelle turbo trail
            this.turboTrailParticles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: (Math.random() - 0.5) * 200,
                vy: Math.random() * 100,
                life: 1.0,
                maxLife: 0.6,
                color: [0.2 + Math.random() * 0.3, 0.8 + Math.random() * 0.2, 1.0, 1.0]
            });
        }
        // Update turbo cooldown SOLO quando il turbo NON è attivo
        else if (this.turboCooldownRemaining > 0) {
            this.turboCooldownRemaining -= deltaTime;
            if (this.turboCooldownRemaining < 0) {
                this.turboCooldownRemaining = 0;
                console.log(`✅ Cooldown turbo completato! Turbo pronto`);
            }
        }
        
        // Update turbo trail particles
        this.turboTrailParticles = this.turboTrailParticles.filter(p => {
            p.life -= deltaTime / p.maxLife;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy -= 200 * deltaTime; // Gravity
            return p.life > 0;
        });
        
        // Update flight mode
        if (this.isFlightActive) {
            this.flightTimeRemaining -= deltaTime;
            if (this.flightTimeRemaining <= 0) {
                this.isFlightActive = false;
                this.flightTimeRemaining = 0;
                // Inizia il cooldown SOLO quando il volo finisce
                this.flightCooldownRemaining = this.flightCooldownDuration;
                this.flightTargetY = this.y; // Reset target
            }
            
            // Animazione fluttuante durante il volo
            this.flightFloatPhase += deltaTime * 4;
            this.wingFlapPhase += deltaTime * this.wingFlapSpeed;
            const floatOffset = Math.sin(this.flightFloatPhase) * this.flightFloatAmplitude;
            
            // Smooth movement verso target Y + oscillazione fluttuante
            const diff = this.flightTargetY - this.y;
            const moveSpeed = 400; // Velocità smooth
            if (Math.abs(diff) > 1) {
                this.velocityY = Math.sign(diff) * Math.min(Math.abs(diff) * 5, moveSpeed);
            } else {
                // Quando vicino al target, applica solo oscillazione
                this.velocityY = Math.cos(this.flightFloatPhase) * this.flightFloatAmplitude * 4;
            }
            
            // Genera particelle flight trail (ali/propulsori) più frequenti
            if (Math.random() < 0.5) {
                // Particelle dalle ali (sinistra e destra)
                const wingOffset = Math.sin(this.wingFlapPhase) * 15;
                this.flightTrailParticles.push({
                    x: this.x + this.width / 2 + wingOffset,
                    y: this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 80,
                    vy: Math.random() * 60 - 30 + Math.sin(this.wingFlapPhase) * 20,
                    life: 1.0,
                    maxLife: 1.0,
                    color: [0.6 + Math.random() * 0.4, 0.85 + Math.random() * 0.15, 1.0, 0.9]
                });
            }
        }
        // Update flight cooldown SOLO quando il volo NON è attivo
        else if (this.flightCooldownRemaining > 0) {
            this.flightCooldownRemaining -= deltaTime;
            if (this.flightCooldownRemaining < 0) {
                this.flightCooldownRemaining = 0;
            }
        }
        
        // Update flight trail particles
        this.flightTrailParticles = this.flightTrailParticles.filter(p => {
            p.life -= deltaTime * 2;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            return p.life > 0;
        });
        
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
        
        // Gestione timer combo boost
        if (this.boostCombo > 0) {
            this.boostComboTimer -= deltaTime;
            if (this.boostComboTimer <= 0) {
                // Combo scaduta
                this.boostCombo = 0;
                this.boostComboSpeedBonus = 0;
            }
        }
        
        // Update shield powerup
        if (this.hasShield) {
            const elapsed = Date.now() - this.shieldStartTime;
            if (elapsed >= this.shieldDuration) {
                this.hasShield = false;
                console.log('🛡️ Shield expired');
            }
        }
        
        // Update magnet powerup
        if (this.hasMagnet) {
            const elapsed = Date.now() - this.magnetStartTime;
            if (elapsed >= this.magnetDuration) {
                this.hasMagnet = false;
                console.log('🧲 Magnet expired');
            }
        }
        
        // Gestione instant flight bonus - IDENTICO al volo normale
        if (this.instantFlightActive) {
            this.instantFlightDuration -= deltaTime;
            if (this.instantFlightDuration <= 0) {
                this.instantFlightActive = false;
                this.instantFlightDuration = 0;
            } else {
                // Animazione fluttuante durante il volo (IDENTICO al volo normale)
                this.flightFloatPhase += deltaTime * 4;
                this.wingFlapPhase += deltaTime * this.wingFlapSpeed;
                const floatOffset = Math.sin(this.flightFloatPhase) * this.flightFloatAmplitude;
                
                // Smooth movement verso target Y + oscillazione fluttuante
                const diff = this.flightTargetY - this.y;
                const moveSpeed = 400; // Velocità smooth
                if (Math.abs(diff) > 1) {
                    this.velocityY = Math.sign(diff) * Math.min(Math.abs(diff) * 5, moveSpeed);
                } else {
                    // Quando vicino al target, applica solo oscillazione
                    this.velocityY = Math.cos(this.flightFloatPhase) * this.flightFloatAmplitude * 4;
                }
                
                // Genera particelle flight trail (ali/propulsori) più frequenti
                if (Math.random() < 0.5) {
                    // Particelle dalle ali (sinistra e destra)
                    const wingOffset = Math.sin(this.wingFlapPhase) * 15;
                    this.flightTrailParticles.push({
                        x: this.x + this.width / 2 + wingOffset,
                        y: this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 80,
                        vy: Math.random() * 60 - 30 + Math.sin(this.wingFlapPhase) * 20,
                        life: 1.0,
                        maxLife: 1.0,
                        color: [0.6 + Math.random() * 0.4, 0.85 + Math.random() * 0.15, 1.0, 0.9]
                    });
                }
            }
        }
        
        // Update boost particles
        this.boostParticles = this.boostParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Apply gravity (reduced if flight is active or instant flight is active)
        let currentGravity = this.gravity;
        if (this.powerups.flight || this.instantFlightActive) {
            currentGravity = this.gravity * 0.3;
        }
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
        
        // Handle icy platform sliding
        if (this.isOnIcyPlatform && this.isGrounded) {
            // Continua a scivolare
            this.isSliding = true;
            this.slideVelocityX *= this.slideFriction; // Very slow decay
            this.slideDecelerationTime += deltaTime;
            
            // Se la velocità di slide è quasi zero, ferma lo slide
            if (Math.abs(this.slideVelocityX) < 5) {
                this.slideVelocityX = 0;
                this.isSliding = false;
            }
        } else if (this.isSliding && !this.isGrounded) {
            // Se lascia la piattaforma ghiacciata mentre scivola
            this.slideVelocityX = 0;
            this.isSliding = false;
            this.slideDecelerationTime = 0;
        }
        
        // Apply turbo speed boost to camera velocity
        if (this.isTurboActive) {
            this.velocityX = 500 * this.turboSpeedMultiplier; // Super fast forward speed!
        }
        
        // Decay velocityX (friction) - solo se non in boost, turbo o decelerazione
        if (!this.boostActive && !this.boostDecelerating && !this.isTurboActive) {
            this.velocityX *= 0.92;
        }

        // Check if fell off screen (game over quando cade troppo basso, a meno che immortale)
        if (this.y > this.canvasHeight && !this.powerups.immortality) {
            console.log('Player is dead! y:', this.y, 'canvasHeight:', this.canvasHeight);
            this.alive = false;
            // Azzera i cooldown e disattiva il turbo quando muori
            this.turboCooldownRemaining = 0;
            this.flightCooldownRemaining = 0;
            this.isTurboActive = false;
            this.turboTimeRemaining = 0;
        }
        
        // Update trail particles for powerups
        this.updateTrailParticles(deltaTime);
    }
    
    updateTrailParticles(deltaTime) {
        // Add trail particles when powerups are active (ridotte per performance)
        if (this.powerups.immortality || this.powerups.flight || this.powerups.superJump) {
            // Solo 1 particella invece di 2 per frame
            this.trailParticles.push({
                x: this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                y: this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                life: 0.6, // Ridotto da 0.8
                maxLife: 0.6,
                color: this.getPowerupTrailColor(),
                size: 6 + Math.random() * 3 // Ridotto da 8+4
            });
        }
        
        // Update existing particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            this.trailParticles[i].life -= deltaTime;
            if (this.trailParticles[i].life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
        
        // Limita il numero di particelle per performance
        if (this.trailParticles.length > 30) { // Ridotto da 50
            this.trailParticles.splice(0, this.trailParticles.length - 30);
        }
    }
    
    getPowerupTrailColor() {
        if (this.powerups.immortality) return [1.0, 0.84, 0.0, 0.6]; // Gold - ridotto alpha da 0.8
        if (this.powerups.flight) return [0.4, 0.7, 1.0, 0.6]; // Light blue - ridotto
        if (this.powerups.superJump) return [1.0, 0.3, 0.5, 0.6]; // Pink - ridotto
        return [1.0, 1.0, 1.0, 0.4]; // Ridotto da 0.5
    }
    
    takeDamage(amount = 1) {
        // Check if player has shield bonus
        if (this.hasShield) {
            console.log('🛡️ Shield absorbed damage!');
            this.hasShield = false;
            // Visual feedback
            this.invulnerable = true;
            this.invulnerabilityTimer = 1.0; // Brief invincibility after shield breaks
            return false;
        }
        
        // Scudo blocca TUTTI i danni
        if (this.shieldActive) return false;
        
        // Turbo mode blocks all damage
        if (this.invulnerable || this.powerups.immortality || this.isTurboActive) return false;
        
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
            // Azzera i cooldown quando muori
            this.turboCooldownRemaining = 0;
            this.flightCooldownRemaining = 0;
        }
        
        return true; // Danno inflitto
    }
    
    heal(amount = 1) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health > oldHealth; // True se curato
    }
    
    applyBoost() {
        // Reset decelerazione se attiva (nuovo boost interrompe la decelerazione)
        this.boostDecelerating = false;
        this.boostDecelerationTime = 0;
        
        // Incrementa combo boost
        this.boostCombo++;
        this.boostComboTimer = this.boostComboTimeout;
        
        // Calcola bonus velocità dalla combo (ogni boost +15% velocità, max +150%)
        this.boostComboSpeedBonus = Math.min(this.boostCombo * 0.15, 1.5);
        
        // Attiva boost (resetta timer anche se già attivo)
        this.boostActive = true;
        this.boostTimer = this.boostDuration;
        
        // Salva la velocità boost con bonus combo
        const totalSpeedMultiplier = this.boostSpeedMultiplier + this.boostComboSpeedBonus;
        this.velocityX = 300 * totalSpeedMultiplier;
        
        // Small upward boost for visual effect (più forte con combo)
        const boostJump = -150 - (this.boostCombo * 20);
        this.velocityY = Math.min(this.velocityY, boostJump);
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
        const horizontalMargin = 5;
        const horizontalOverlap = playerRight > (platformLeft - horizontalMargin) && 
                                  playerLeft < (platformRight + horizontalMargin);
        
        if (!horizontalOverlap) return false;
        
        // CONTINUOUS COLLISION DETECTION
        // Store previous Y position to check if player crossed platform during this frame
        const prevBottom = playerBottom - this.velocityY * (1/60); // Approximate previous position
        
        // Check if player was above platform and is now at or below it (falling through)
        const wasAbove = prevBottom <= platformTop;
        const isNowAtOrBelow = playerBottom >= platformTop;
        const isFalling = this.velocityY > 0;
        
        // Tolerance for landing (smaller than before for better precision)
        const tolerance = toleranceOverride !== null ? toleranceOverride : 25;
        const verticalDistance = Math.abs(playerBottom - platformTop);
        
        // Collision occurs if:
        // 1. Player is falling AND crossed the platform top this frame
        // 2. OR player is very close to platform top
        const crossedPlatform = isFalling && wasAbove && isNowAtOrBelow;
        const nearPlatform = verticalDistance < tolerance && isFalling;
        
        const onPlatform = (crossedPlatform || nearPlatform) && horizontalOverlap;

        if (onPlatform) {
            // Snap precisely to platform top
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
            
            // Handle icy platform
            if (platform.platformType === 'icy') {
                this.isOnIcyPlatform = true;
                // Start sliding with momentum when landing on ice
                if (!this.isSliding) {
                    this.slideVelocityX = platform.velocity * 0.5; // Inherit some platform velocity
                    this.slideDecelerationTime = 0;
                }
            } else {
                this.isOnIcyPlatform = false;
            }
            
            // Trigger crumbling for crumbling platforms
            if (platform.platformType === 'crumbling' && !platform.isCrumbling) {
                platform.isCrumbling = true;
            }
            
            return true;
        } else {
            if (this.currentPlatform === platform) {
                this.currentPlatform = null;
                this.isOnIcyPlatform = false;
            }
        }

        return false;
    }

    checkObstacleCollision(obstacle) {
        if (!this.alive) return false;
        
        // Immortality powerup makes player invincible
        if (this.powerups.immortality) return false;
        
        // Temporary invulnerability after taking damage
        if (this.invulnerable) return false;

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
        this.boostCombo = 0;
        this.boostComboTimer = 0;
        this.boostComboSpeedBonus = 0;
        this.boostDecelerationTime = 0;
        this.boostPeakVelocity = 0;
        // NON resettare la salute - i cuori persi restano persi tra i livelli
        // this.health = this.maxHealth;
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
        this.isOnIcyPlatform = false;
        this.slideVelocityX = 0;
        this.slideDecelerationTime = 0;
        this.isSliding = false;
        
        // Reset turbo boost
        this.isTurboActive = false;
        this.turboTimeRemaining = 0;
        this.turboInitialDuration = 0;
        this.turboCooldownRemaining = 0;
        this.turboTrailParticles = [];
        
        // Reset flight mode
        this.isFlightActive = false;
        this.flightTimeRemaining = 0;
        this.flightInitialDuration = 0;
        this.flightCooldownRemaining = 0;
        this.flightTargetY = this.y;
        this.flightTrailParticles = [];
        this.flightFloatPhase = 0;
        this.wingFlapPhase = 0;
        
        // Reset instant flight bonus
        this.instantFlightActive = false;
        this.instantFlightDuration = 0;
        
        // Reset shield and magnet powerups
        this.hasShield = false;
        this.shieldStartTime = 0;
        this.hasMagnet = false;
        this.magnetStartTime = 0;
        
        // Reset shield bonus
        this.shieldActive = false;
        this.shieldDuration = 0;
        this.shieldRotation = 0;
        
        // Reset safety platform state
        this.onSafetyPlatform = false;
        this.wasOnSafetyPlatform = false;
        this.previousVelocityY = 0;
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
    
    activateTurbo(currentLevel = 1) {
        // Check if already active
        if (this.isTurboActive) {
            return false;
        }
        
        // Check if cooldown is ready
        if (this.turboCooldownRemaining > 0) {
            return false; // Still on cooldown
        }
        
        // Activate turbo boost
        this.isTurboActive = true;
        this.turboInitialDuration = this.turboBaseDuration + currentLevel; // Salva durata totale
        this.turboTimeRemaining = this.turboInitialDuration; // 5 + level seconds
        // NON iniziare il cooldown qui - inizierà quando il turbo finisce
        this.expression = 'excited';
        
        console.log(`🚀 Turbo attivato! Durata: ${this.turboInitialDuration}s, Cooldown partirà tra ${this.turboInitialDuration}s`);
        
        return true; // Successfully activated
    }
    
    getTurboTrailParticles() {
        return this.turboTrailParticles;
    }
    
    isTurboCooldownReady() {
        return this.turboCooldownRemaining === 0;
    }
    
    getTurboCooldownProgress() {
        if (this.turboCooldownRemaining === 0) return 1.0;
        return 1.0 - (this.turboCooldownRemaining / this.turboCooldownDuration);
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
        } else if (this.isFlightActive) {
            this.expression = 'lookingUp'; // Guarda verso l'alto durante il volo verticale
        } else if (this.onSafetyPlatform) {
            this.expression = 'worried'; // Espressione preoccupata sulla safety platform
        } else if (this.powerups.immortality || this.powerups.flight || this.powerups.superJump) {
            this.expression = 'excited';
        } else if (this.boostActive) {
            this.expression = 'determined';
        } else if (!this.isGrounded && this.velocityY > 300) {
            this.expression = 'worried'; // Caduta veloce
        } else if (!this.isGrounded && this.velocityY < -200) {
            this.expression = 'excited'; // Salto verso l'alto
        } else if (this.isGrounded && !this.isIdle && Math.abs(this.velocityX) > 100) {
            this.expression = 'running'; // Espressione trafelata quando corre
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
    
    getSlideVelocity() {
        return this.slideVelocityX;
    }
    
    hasJustStoppedSliding() {
        // Returns true when slide just stopped (for camera shake trigger)
        return this.slideDecelerationTime > 0 && !this.isSliding && this.slideVelocityX === 0;
    }
    
    // ============================================
    // FLIGHT HORIZONTAL MODE METHODS
    // ============================================
    
    activateFlight() {
        // Check if already active
        if (this.isFlightActive) {
            return false;
        }
        
        if (!this.isFlightCooldownReady()) return false;
        
        this.isFlightActive = true;
        this.flightInitialDuration = this.flightBaseDuration; // Salva durata totale
        this.flightTimeRemaining = this.flightInitialDuration;
        // NON iniziare il cooldown qui - inizierà quando il volo finisce
        this.flightTargetY = this.y; // Inizia dalla posizione corrente
        
        return true;
    }
    
    flightMoveUp() {
        if (!this.isFlightActive) return;
        this.flightTargetY = Math.max(50, this.flightTargetY - this.flightStep);
    }
    
    flightMoveDown() {
        if (!this.isFlightActive) return;
        this.flightTargetY = Math.min(this.canvasHeight - 50, this.flightTargetY + this.flightStep);
    }
    
    isFlightCooldownReady() {
        return this.flightCooldownRemaining <= 0;
    }
    
    getFlightCooldownProgress() {
        return 1.0 - (this.flightCooldownRemaining / this.flightCooldownDuration);
    }
    
    getFlightTrailParticles() {
        return this.flightTrailParticles;
    }

    updateCanvasHeight(height) {
        this.canvasHeight = height;
    }
}
