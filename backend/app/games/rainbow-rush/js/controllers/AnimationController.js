/**
 * AnimationController - Manages all game animations
 * Handles level transitions, combo animations, death sequences, level up animations, floating texts
 */
export class AnimationController {
    constructor() {
        // Level transition
        this.levelTransition = null;
        this.isInLevelTransition = false;
        
        // Level up animation
        this.levelUpAnimation = null;
        
        // Combo animation
        this.comboAnimation = null;
        
        // Death animation
        this.deathAnimation = null;
        this.isShowingDeathAnimation = false;
        
        // Screen flash for combos
        this.screenFlash = {
            alpha: 0,
            color: [1.0, 1.0, 1.0]
        };
    }

    /**
     * Update all animations
     */
    update(deltaTime) {
        this.updateLevelUpAnimation(deltaTime);
        this.updateComboAnimation(deltaTime);
        this.updateDeathAnimation(deltaTime);
        this.updateScreenFlash(deltaTime);
    }
    
    /**
     * Update floating texts con animazioni ottimizzate
     */
    updateFloatingTexts(floatingTexts, deltaTime) {
        if (!floatingTexts || floatingTexts.length === 0) return;
        
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const text = floatingTexts[i];
            
            text.life -= deltaTime;
            
            // Animazione di scala SEMPLIFICATA: solo esplosione iniziale
            const lifeProgress = 1 - (text.life / text.maxLife);
            if (lifeProgress < 0.2) {
                // Esplosione rapida (0.5 -> 1.2)
                text.scale = 0.5 + (lifeProgress / 0.2) * 0.7;
            } else {
                // Stabile - NO pulse per performance
                text.scale = 1.0;
            }
            
            // Movimento verso l'alto COSTANTE - no decelerazione
            text.y += text.velocityY * deltaTime;
            
            // Pulse phase ridotto
            text.pulsePhase += deltaTime * 2;
            
            // Fade out semplificato
            if (text.life < 0.5) {
                text.alpha = text.life / 0.5;
                text.glowIntensity = text.alpha;
            } else {
                text.alpha = 1.0;
                // Glow pulsante
                text.glowIntensity = 0.7 + Math.sin(text.pulsePhase * 3) * 0.3;
            }
            
            // Rimuovi se morto
            if (text.life <= 0) {
                floatingTexts.splice(i, 1);
            }
        }
    }

    /**
     * Update level up animation
     */
    updateLevelUpAnimation(deltaTime) {
        if (!this.levelUpAnimation) return;
        
        this.levelUpAnimation.life -= deltaTime;
        this.levelUpAnimation.pulsePhase += deltaTime * 5;
        
        // Scale animation: grow quickly, then shrink slowly
        const progress = 1 - (this.levelUpAnimation.life / this.levelUpAnimation.maxLife);
        if (progress < 0.2) {
            // Grow phase (0 to 1.2)
            this.levelUpAnimation.scale = (progress / 0.2) * 1.2;
        } else if (progress < 0.8) {
            // Stable phase (1.2 to 1.0)
            this.levelUpAnimation.scale = 1.2 - ((progress - 0.2) / 0.6) * 0.2;
        } else {
            // Shrink phase (1.0 to 0)
            this.levelUpAnimation.scale = 1.0 - ((progress - 0.8) / 0.2);
        }
        
        if (this.levelUpAnimation.life <= 0) {
            this.levelUpAnimation = null;
        }
    }

    /**
     * Update combo animation
     */
    updateComboAnimation(deltaTime) {
        if (!this.comboAnimation) return;
        
        this.comboAnimation.life -= deltaTime;
        this.comboAnimation.pulsePhase += deltaTime * 8;
        this.comboAnimation.floatY -= deltaTime * 30; // Float upward
        this.comboAnimation.scale = 1.0 + Math.sin(this.comboAnimation.pulsePhase) * 0.15;
        
        if (this.comboAnimation.life <= 0) {
            this.comboAnimation = null;
        }
    }

    /**
     * Update death animation
     */
    updateDeathAnimation(deltaTime) {
        if (!this.deathAnimation) return;
        
        this.deathAnimation.timer += deltaTime;
        this.deathAnimation.fadeAlpha = Math.min(1.0, this.deathAnimation.timer / 0.8);
        this.deathAnimation.playerAlpha = Math.max(0, 1.0 - (this.deathAnimation.timer / 1.5));
        this.deathAnimation.rotation += deltaTime * 3;
        this.deathAnimation.scale = 1.0 + (this.deathAnimation.timer * 0.5);
        
        // Update death particles
        this.deathAnimation.particles.forEach(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 300 * deltaTime; // Gravity
            p.life -= deltaTime;
            p.alpha = Math.max(0, p.life / p.maxLife);
        });
        
        this.deathAnimation.particles = this.deathAnimation.particles.filter(p => p.life > 0);
        
        // NON eliminare l'animazione - lasciala attiva per il rendering
        // Verrà pulita dal reset() quando il gioco ricomincia
    }

    /**
     * Update screen flash
     */
    updateScreenFlash(deltaTime) {
        if (this.screenFlash.alpha > 0) {
            this.screenFlash.alpha -= deltaTime * 2.5; // Fast fade (0.4s for full flash)
            if (this.screenFlash.alpha < 0) {
                this.screenFlash.alpha = 0;
            }
        }
    }

    /**
     * Show level up animation
     */
    showLevelUp(level, x, y) {
        this.levelUpAnimation = {
            text: `✨ LEVEL ${level} ✨`,
            x: x,
            y: y,
            life: 2.5,
            maxLife: 2.5,
            fontSize: 80,
            pulsePhase: 0,
            color: [1.0, 0.9, 0.2, 1.0], // Golden color
            scale: 0
        };
        
        this.startLevelTransition(level);
    }

    /**
     * Start level transition
     */
    startLevelTransition(level) {
        this.isInLevelTransition = true;
        
        const messages = [
            `🌟 LIVELLO ${level} 🌟`,
            `💎 LIVELLO ${level} 💎`,
            `⚡ LIVELLO ${level} ⚡`,
            `🔥 LIVELLO ${level} 🔥`,
            `🚀 LIVELLO ${level} 🚀`
        ];
        
        this.levelTransition = {
            level: level,
            message: messages[level % messages.length],
            duration: 2.5,
            timer: 0,
            fadeInDuration: 0.5,
            fadeOutDuration: 0.5,
            alpha: 0
        };
    }

    /**
     * Show combo animation
     */
    showCombo(combo, multiplier, x, y) {
        if (combo <= 1) return;
        
        let message = '';
        let color = [1.0, 1.0, 1.0, 1.0];
        let intensity = 1.0;
        let flashIntensity = 0;
        
        const multiplierText = multiplier.toFixed(1);
        
        if (combo >= 50) {
            message = `🌟 DIVINO! x${multiplierText} 🌟`;
            color = [1.0, 0.0, 1.0, 1.0];
            intensity = 3.0;
            flashIntensity = 0.4;
        } else if (combo >= 30) {
            message = `🔥 EPICO! x${multiplierText} 🔥`;
            color = [1.0, 0.3, 0.0, 1.0];
            intensity = 2.5;
            flashIntensity = 0.3;
        } else if (combo >= 20) {
            message = `💥 BRUTALE! x${multiplierText} 💥`;
            color = [1.0, 0.2, 0.2, 1.0];
            intensity = 2.0;
            flashIntensity = 0.25;
        } else if (combo >= 15) {
            message = `⚡ PAZZESCO! x${multiplierText} ⚡`;
            color = [1.0, 1.0, 0.0, 1.0];
            intensity = 1.8;
            flashIntensity = 0.2;
        } else if (combo >= 10) {
            message = `🌈 SUPER! x${multiplierText} 🌈`;
            color = [0.0, 1.0, 1.0, 1.0];
            intensity = 1.5;
            flashIntensity = 0.15;
        } else if (combo >= 5) {
            message = `🚀 COMBO x${multiplierText}!`;
            color = [0.5, 1.0, 0.5, 1.0];
            intensity = 1.2;
            flashIntensity = 0.1;
        } else {
            message = `COMBO x${multiplierText}`;
            color = [1.0, 1.0, 1.0, 1.0];
            intensity = 1.0;
        }
        
        // Trigger screen flash for big combos
        if (flashIntensity > 0) {
            this.screenFlash.alpha = flashIntensity;
            this.screenFlash.color = [color[0], color[1], color[2]];
        }
        
        this.comboAnimation = {
            text: message,
            x: x,
            y: y,
            floatY: y,
            life: 2.0,
            maxLife: 2.0,
            fontSize: 32 + Math.min(combo * 0.8, 30),
            pulsePhase: 0,
            color: color,
            scale: 1.0,
            combo: combo,
            intensity: intensity
        };
    }

    /**
     * Start death sequence
     */
    startDeathSequence(playerX, playerY, playerWidth, playerHeight, particleSystem) {
        this.isShowingDeathAnimation = true;
        
        // Create death particles
        const particles = particleSystem.createDeathParticles(
            playerX, playerY, playerWidth, playerHeight
        );
        
        this.deathAnimation = {
            playerX: playerX,
            playerY: playerY,
            playerWidth: playerWidth,
            playerHeight: playerHeight,
            timer: 0,
            duration: 4.0,
            fadeAlpha: 0,
            playerAlpha: 1.0,
            rotation: 0,
            scale: 1.0,
            particles: particles
        };
    }

    /**
     * Create floating text STRABELLLO con effetti EPICI
     */
    createFloatingText(text, x, y, color, entityManager, duration = 2.5) {
        //console.log('🎯 CREATING FLOATING TEXT:', text, 'at position:', x, y, 'color:', color);
        const floatingText = {
            text: text,
            x: x,
            y: y,
            startY: y,
            life: duration,
            maxLife: duration,
            alpha: 1.0,
            color: color,
            fontSize: 48,     // GRANDE E VISIBILE
            velocityY: -50,   // Sale verso l'alto più lentamente
            scale: 0.1,       // Parte piccolo
            rotation: 0,      // NIENTE ROTAZIONE per bonus livello
            pulsePhase: 0,    // Per effetto pulsante
            glowIntensity: 1.0 // Intensità del bagliore
        };
        entityManager.addEntity('floatingTexts', floatingText);
        //console.log('✅ Floating text added to entityManager. Total floatingTexts:', entityManager.floatingTexts.length);
    }
    
    /**
     * Create EPIC floating text con dimensioni ENORMI per bonus livello
     */
    createEpicFloatingText(text, x, y, color, entityManager, duration = 3.0) {
        //console.log('🌟 CREATING EPIC FLOATING TEXT:', text, 'at position:', x, y, 'color:', color);
        const floatingText = {
            text: text,
            x: x,
            y: y,
            startY: y,
            life: duration,
            maxLife: duration,
            alpha: 1.0,
            color: color,
            fontSize: 72,     // ENORME!
            velocityY: -60,   // Sale verso l'alto più lentamente per essere leggibile
            scale: 0.1,       // Parte piccolo
            rotation: 0,
            pulsePhase: 0,
            glowIntensity: 1.5 // Bagliore più intenso
        };
        entityManager.addEntity('floatingTexts', floatingText);
        //console.log('✅ EPIC floating text added! Total floatingTexts:', entityManager.floatingTexts.length);
    }

    /**
     * Trigger screen flash
     */
    triggerScreenFlash(intensity, color) {
        this.screenFlash.alpha = intensity;
        this.screenFlash.color = color;
    }

    /**
     * Get current animations for rendering
     */
    getAnimations() {
        return {
            levelTransition: this.levelTransition,
            levelUpAnimation: this.levelUpAnimation,
            comboAnimation: this.comboAnimation,
            deathAnimation: this.deathAnimation,
            screenFlash: this.screenFlash
        };
    }

    /**
     * Reset all animations
     */
    reset() {
        this.levelTransition = null;
        this.isInLevelTransition = false;
        this.levelUpAnimation = null;
        this.comboAnimation = null;
        this.deathAnimation = null;
        this.isShowingDeathAnimation = false;
        this.screenFlash = {
            alpha: 0,
            color: [1.0, 1.0, 1.0]
        };
    }
}
