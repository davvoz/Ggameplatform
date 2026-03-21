/**
 * PlayerAnimationController - Gestisce animazioni professionali per il player
 * Mantiene forma e espressioni originali, aggiunge movimento fluido
 */

export class PlayerAnimationController {
    constructor() {
        this.animations = {
            idle: { time: 0, speed: 1.5 },
            running: { time: 0, speed: 8 },
            jumping: { time: 0, speed: 6 },
            falling: { time: 0, speed: 4 },
            landing: { time: 0, speed: 12 },
            turbo: { time: 0, speed: 15 }
        };

        this.currentAnimation = 'idle';
        this.lastUpdateTime = Date.now();
    }

    /**
     * Update animation state
     */
    update(player) {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // Determine current animation
        const newAnimation = this.determineAnimation(player);
        if (newAnimation !== this.currentAnimation) {
            this.currentAnimation = newAnimation;
            this.animations[newAnimation].time = 0;
        }

        // Update animation time
        this.animations[this.currentAnimation].time += deltaTime * this.animations[this.currentAnimation].speed;
    }

    /**
     * Determine which animation to play
     */
    determineAnimation(player) {
        // Turbo ha priorità massima
        if (player.boostActive || player.isTurboActive || player.powerups?.turbo) return 'turbo';
        if (player.justLanded) return 'landing';
        if (!player.isGrounded) {
            return player.velocityY < -50 ? 'jumping' : 'falling';
        }
        if (Math.abs(player.velocityX) > 50) return 'running';
        return 'idle';
    }

    /**
     * Get squash and stretch values for current animation
     */
    getSquashStretch() {
        const anim = this.animations[this.currentAnimation];
        const t = anim.time;

        switch (this.currentAnimation) {
            case 'idle':
                // Gentle breathing
                return {
                    scaleX: 1 + Math.sin(t * 2) * 0.02,
                    scaleY: 1 - Math.sin(t * 2) * 0.02,
                    offsetY: Math.sin(t * 2) * 1,
                    rotation: 0 // Aggiunto per coerenza
                };

            case 'running':
                // Bob up and down
                return {
                    scaleX: 1 + Math.abs(Math.sin(t * Math.PI)) * 0.05,
                    scaleY: 1 - Math.abs(Math.sin(t * Math.PI)) * 0.05,
                    offsetY: -Math.abs(Math.sin(t * Math.PI)) * 3,
                    rotation: Math.sin(t * Math.PI) * 0.05
                };

            case 'jumping':
                // Stretch upward
                const jumpProgress = Math.min(1, t / 0.3);
                return {
                    scaleX: 1 - jumpProgress * 0.15,
                    scaleY: 1 + jumpProgress * 0.3,
                    offsetY: 0,
                    rotation: 0 // Aggiunto per coerenza
                };
            case 'falling':
                // Slight wobble
                return {
                    scaleX: 1 + Math.sin(t * 8) * 0.03,
                    scaleY: 1, // Aggiunto per evitare invisibilità
                    offsetY: Math.sin(t * 4) * 1.5,
                    rotation: 0 // Aggiunto per coerenza
                };
            case 'turbo':
                // Animazione turbo BOLIDE - come un meteorite che entra in atmosfera
                const turboVibration = Math.sin(t * 30) * 0.01; // Vibrazione veloce
                const turboPulse = Math.sin(t * 6) * 0.06; // Pulsazione energetica
                const turboWave = Math.sin(t * 10) * 0.03; // Onda di velocità
                
                // Allungamento estremo dietro (coda del bolide)
                const horizontalStretch = 1.8 + Math.sin(t * 8) * 0.2; // Molto allungato
                const verticalCompress = 0.65 - Math.sin(t * 8) * 0.08; // Compresso
                
                // Inclinazione dinamica in avanti
                const aeroTilt = -0.12 + Math.sin(t * 12) * 0.04; // Più inclinato
                
                return {
                    scaleX: horizontalStretch + turboVibration + turboPulse,
                    scaleY: verticalCompress + turboVibration - turboPulse,
                    offsetY: turboWave * 1.2,
                    rotation: aeroTilt + turboVibration,
                    glow: 0.8 + Math.sin(t * 15) * 0.2,
                    faceOffsetX: 15, // Faccia spostata in AVANTI
                    bodyGradient: true, // Gradiente dissoluzione
                    flameTrail: true, // Scia di fiamme dietro
                    heatDistortion: 0.3 + Math.sin(t * 20) * 0.1 // Distorsione da calore
                };
            case 'landing':
                // Heavy squash then recover - PIÙ IMPATTO
                const landProgress = Math.min(1, t / 0.5); // Durata aumentata
                const squashAmount = Math.max(0, 1 - landProgress);
                const elasticBounce = squashAmount * (1 + Math.sin(landProgress * Math.PI * 3) * 0.2);
                return {
                    scaleX: 1 + elasticBounce * 0.5, // Schiacciamento molto più forte
                    scaleY: 1 - elasticBounce * 0.5,
                    offsetY: elasticBounce * 2,
                    rotation: 0 // Aggiunto per coerenza
                };

            default:
                return { scaleX: 1, scaleY: 1, offsetY: 0, rotation: 0 };
                return { scaleX: 1, scaleY: 1, offsetY: 0 };
        }
    }

    /**
     * Get particle effects for current animation
     */
    getParticleEffects() {
        const anim = this.animations[this.currentAnimation];

        switch (this.currentAnimation) {
            case 'running':
            // Dust particles behind
            case 'landing':
                // Impact particles
                if (anim.time < 0.15) {
                    return {
                        type: 'impact',
                        count: 12, // Più particelle per impatto visibile
                        offsetX: 0,
                        offsetY: 20,
                        spread: 180,
                        velocityRange: [80, 150],
                        lifetime: 0.6
                    };
                }
                break;

            case 'turbo':
                // Particelle FIAMME tipo rientro atmosferico
                if (Math.random() < 0.9) { // Frequenza altissima
                    return {
                        type: 'flame_trail',
                        count: 5, // Molte particelle
                        offsetX: -25 - Math.random() * 15, // Dietro il player
                        offsetY: Math.random() * 20 - 10,
                        spread: 60,
                        velocityRange: [80, 180],
                        lifetime: 0.5,
                        color: [
                            1.0, // Rosso
                            0.3 + Math.random() * 0.4, // Arancione variabile
                            0.1 // Poco blu
                        ],
                        fadeOut: true, // Dissoluzione
                        turbulence: 0.3 // Movimento caotico delle fiamme
                    };
                }
                break;

            case 'jumping':
                // Launch particles
                if (anim.time < 0.1) {
                    return {
                        type: 'launch',
                        count: 5,
                        offsetX: 0,
                        offsetY: 20,
                        spread: 180,
                        velocityRange: [30, 60],
                        lifetime: 0.4
                    };
                }
                break;
            default:
                break;
        }

        return null;
    }

    /**
     * Get anticipation offset for jumps
     */
    getAnticipation(player) {
        if (this.currentAnimation === 'idle' && player.isJumping && this.animations.idle.time < 0.15) {
            // Quick squat before jump
            const progress = this.animations.idle.time / 0.15;
            return {
                scaleX: 1 + progress * 0.1,
                scaleY: 1 - progress * 0.15,
                offsetY: progress * 3
            };
        }
        return null;
    }

    /**
     * Get motion blur effect
     */
    getMotionBlur(player) {
        const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);

        if (speed > 300) {
            return {
                enabled: true,
                strength: Math.min(1, speed / 600),
                direction: Math.atan2(player.velocityY, player.velocityX)
            };
        }

        return { enabled: false };
    }

    /**
     * Get trail effect
     */
    shouldDrawTrail(player) {
        return (this.currentAnimation === 'running' && Math.abs(player.velocityX) > 200) ||
            (this.currentAnimation === 'falling' && Math.abs(player.velocityY) > 300);
    }

    /**
     * Reset animation
     */
    reset() {
        Object.keys(this.animations).forEach(key => {
            this.animations[key].time = 0;
        });
        this.currentAnimation = 'idle';
    }
}
