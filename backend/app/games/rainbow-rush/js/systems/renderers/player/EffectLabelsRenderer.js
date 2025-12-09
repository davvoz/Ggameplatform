/**
 * EffectLabelsRenderer - Renders floating labels with duration bars for active player effects
 * Shows: Shield, Magnet, Boost, Turbo, Flight, and Powerups near the player
 */
export class EffectLabelsRenderer {
    constructor(renderer, textCtx) {
        this.renderer = renderer;
        this.textCtx = textCtx;
        
        // Layout configuration - posizionato vicino al player
        this.spacing = 45;
        this.offsetX = 80;
        this.offsetY = -30;
        this.barWidth = 100;
        this.barHeight = 6;
        this.iconSize = 20;
        
        // Animation timers
        this.pulseTime = 0;
        this.bounceTime = 0;
        this.shimmerTime = 0;
        
        // Animation states per effect
        this.activeEffectsState = new Map();
        
        // Powerup timers (set externally)
        this.powerupTimers = {};
        
        // Effect configurations
        this.effectConfigs = this._createEffectConfigs();
    }
    
    update(deltaTime) {
        this.pulseTime += deltaTime;
        this.bounceTime += deltaTime * 3;
        this.shimmerTime += deltaTime * 2;
        
        // Update animation states
        for (const [key, state] of this.activeEffectsState.entries()) {
            if (state.scale < 1.0) {
                state.scale = Math.min(1.0, state.scale + deltaTime * 4);
            }
            if (state.alpha < 1.0) {
                state.alpha = Math.min(1.0, state.alpha + deltaTime * 5);
            }
            if (state.wobble > 0) {
                state.wobble = Math.max(0, state.wobble - deltaTime * 2);
            }
        }
    }
    
    setPowerupTimers(timers) {
        this.powerupTimers = timers || {};
    }
    
    render(player, playerCenterX, playerCenterY) {
        if (!this.textCtx || !player.alive) return;
        
        const activeEffects = this._getActiveEffects(player);
        if (activeEffects.length === 0) return;
        
        // Il player appare sempre in una posizione fissa sullo schermo durante il gameplay
        // Normalmente è centrato orizzontalmente e un po' più in basso verticalmente
        // Usiamo le coordinate fisse dello schermo invece delle world coordinates
        const canvas = this.textCtx.canvas;
        const screenPlayerX = canvas.width * 0.3; // Player appare circa al 30% orizzontale
        const screenPlayerY = canvas.height * 0.6; // Player appare circa al 60% verticale
        
        activeEffects.forEach((effect, index) => {
            if (!this.activeEffectsState.has(effect.key)) {
                this.activeEffectsState.set(effect.key, {
                    scale: 0.3,
                    alpha: 0,
                    wobble: 1.0
                });
            }
            
            const state = this.activeEffectsState.get(effect.key);
            
            // Posiziona le label vicino al player (screen space)
            const x = screenPlayerX + this.offsetX;
            const y = screenPlayerY + this.offsetY + (index * this.spacing);
            const bounce = Math.sin(this.bounceTime + index * 0.5) * 3;
            
            this._renderEffectLabel(effect, x, y + bounce, state, index);
        });
        
        // Cleanup inactive effects
        const activeKeys = new Set(activeEffects.map(e => e.key));
        for (const key of this.activeEffectsState.keys()) {
            if (!activeKeys.has(key)) {
                this.activeEffectsState.delete(key);
            }
        }
    }
    
    _getActiveEffects(player) {
        const active = [];
        
        for (const [key, config] of Object.entries(this.effectConfigs)) {
            if (config.check(player)) {
                const duration = config.getDuration(player);
                const maxDuration = config.getMaxDuration(player);
                const progress = maxDuration > 0 ? duration / maxDuration : 1;
                
                active.push({
                    key,
                    ...config,
                    duration,
                    maxDuration,
                    progress: Math.max(0, Math.min(1, progress))
                });
            }
        }
        
        return active;
    }
    
    _renderEffectLabel(effect, x, y, state, index) {
        const ctx = this.textCtx;
        const pulse = Math.sin(this.pulseTime * 4 + index * 0.3) * 0.15 + 0.85;
        const shimmer = Math.sin(this.shimmerTime + index * 0.7) * 0.5 + 0.5;
        
        ctx.save();
        ctx.globalAlpha = state.alpha;
        
        const wobbleX = Math.sin(this.bounceTime * 6) * state.wobble * 5;
        const wobbleY = Math.cos(this.bounceTime * 7) * state.wobble * 3;
        
        ctx.translate(x + wobbleX, y + wobbleY);
        ctx.scale(state.scale, state.scale);
        ctx.translate(-x, -y);
        
        this._renderBackground(x - 8, y - 12, 120, 38, shimmer, ctx);
        this._renderIcon(effect, x, y, pulse, shimmer, index, ctx);
        this._renderLabel(effect, x + 24, y - 8, ctx);
        this._renderDurationBar(effect, x + 24, y + 6, shimmer, ctx);
        this._renderTimeText(effect, x + 24, y + 16, ctx);
        
        ctx.restore();
    }
    
    _renderBackground(x, y, width, height, shimmer, ctx) {
        ctx.shadowColor = `rgba(100, 150, 255, ${0.3 * shimmer})`;
        ctx.shadowBlur = 12 + shimmer * 8;
        
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, 'rgba(30, 30, 50, 0.9)');
        gradient.addColorStop(1, 'rgba(20, 20, 40, 0.85)');
        ctx.fillStyle = gradient;
        
        this._roundRect(ctx, x, y, width, height, 6);
        ctx.fill();
        
        const borderAlpha = 0.3 + shimmer * 0.2;
        ctx.strokeStyle = `rgba(100, 200, 255, ${borderAlpha})`;
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, x, y, width, height, 6);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }
    
    _renderIcon(effect, x, y, pulse, shimmer, index, ctx) {
        const glowIntensity = pulse * shimmer;
        ctx.shadowColor = effect.glowColor;
        ctx.shadowBlur = 20 * glowIntensity;
        
        ctx.save();
        ctx.translate(x + 10, y);
        
        const anim = this._getIconAnimation(effect.animType, index);
        ctx.translate(anim.offsetX, anim.offsetY);
        ctx.rotate(anim.rotation);
        
        ctx.font = `${this.iconSize * anim.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = anim.color;
        ctx.fillText(effect.icon, 0, 0);
        
        ctx.restore();
        ctx.shadowBlur = 0;
    }
    
    _getIconAnimation(animType, index) {
        let rotation = 0, offsetX = 0, offsetY = 0;
        let scale = 0.9 + Math.sin(this.pulseTime * 4) * 0.1;
        let color = '#FFFFFF';
        
        switch (animType) {
            case 'rotate':
                rotation = this.bounceTime * 2;
                break;
            case 'pulse':
                scale = 0.85 + Math.sin(this.pulseTime * 6) * 0.25;
                break;
            case 'shake':
                offsetX = Math.sin(this.bounceTime * 15) * 2;
                offsetY = Math.cos(this.bounceTime * 20) * 1;
                break;
            case 'bounce':
                offsetY = Math.abs(Math.sin(this.bounceTime * 4)) * -4;
                rotation = Math.sin(this.bounceTime * 3) * 0.2;
                break;
            case 'wave':
                rotation = Math.sin(this.bounceTime * 3) * 0.3;
                offsetY = Math.sin(this.bounceTime * 2) * 2;
                break;
            case 'sparkle':
                scale = 0.9 + Math.sin(this.shimmerTime * 8) * 0.2;
                rotation = Math.sin(this.shimmerTime * 4) * 0.4;
                const brightness = 60 + Math.sin(this.shimmerTime * 10) * 20;
                color = `hsl(280, 70%, ${brightness}%)`;
                break;
            case 'rainbow':
                rotation = this.shimmerTime;
                scale = 1.0 + Math.sin(this.pulseTime * 4) * 0.15;
                const hue = (this.shimmerTime * 100) % 360;
                color = `hsl(${hue}, 80%, 70%)`;
                break;
            case 'float':
                offsetY = Math.sin(this.bounceTime) * 3;
                rotation = Math.sin(this.bounceTime * 0.5) * 0.2;
                break;
            case 'zap':
                scale = 0.9 + Math.abs(Math.sin(this.pulseTime * 8)) * 0.3;
                break;
        }
        
        return { rotation, offsetX, offsetY, scale, color };
    }
    
    _renderLabel(effect, x, y, ctx) {
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = effect.color;
        ctx.fillText(effect.label, x, y);
        ctx.shadowBlur = 0;
    }
    
    _renderDurationBar(effect, x, y, shimmer, ctx) {
        ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
        this._roundRect(ctx, x, y, this.barWidth, this.barHeight, 3);
        ctx.fill();
        
        if (effect.progress > 0) {
            const fillWidth = this.barWidth * effect.progress;
            const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
            
            if (effect.progress > 0.5) {
                const hue = 120 + shimmer * 20;
                gradient.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
                gradient.addColorStop(1, `hsl(${hue + 20}, 70%, 60%)`);
            } else if (effect.progress > 0.25) {
                gradient.addColorStop(0, '#FFA726');
                gradient.addColorStop(1, '#FFB74D');
            } else {
                const flashAlpha = Math.sin(this.pulseTime * 8) * 0.3 + 0.7;
                gradient.addColorStop(0, `rgba(239, 83, 80, ${flashAlpha})`);
                gradient.addColorStop(1, `rgba(229, 115, 115, ${flashAlpha})`);
            }
            
            ctx.fillStyle = gradient;
            this._roundRect(ctx, x, y, fillWidth, this.barHeight, 3);
            ctx.fill();
            
            // Animated shine
            const shineX = (this.shimmerTime * 50) % (fillWidth + 40) - 20;
            const shineGradient = ctx.createLinearGradient(x + shineX - 10, y, x + shineX + 10, y);
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
            shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = shineGradient;
            this._roundRect(ctx, x, y, fillWidth, this.barHeight, 3);
            ctx.fill();
        }
        
        ctx.shadowColor = `rgba(100, 200, 255, ${0.4 * shimmer})`;
        ctx.shadowBlur = 4;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + shimmer * 0.2})`;
        ctx.lineWidth = 1;
        this._roundRect(ctx, x, y, this.barWidth, this.barHeight, 3);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    _renderTimeText(effect, x, y, ctx) {
        const seconds = Math.ceil(effect.duration / 1000);
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        
        let textColor;
        if (seconds > 3) {
            textColor = '#A0FFA0';
        } else if (seconds > 1) {
            textColor = '#FFD700';
        } else {
            const flash = Math.sin(this.pulseTime * 10) * 0.5 + 0.5;
            textColor = `rgba(255, ${100 + flash * 100}, ${100 + flash * 100}, 1)`;
        }
        
        ctx.fillStyle = textColor;
        ctx.fillText(`${seconds}s`, x, y);
        ctx.shadowBlur = 0;
    }
    
    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    _createEffectConfigs() {
        return {
            shield: {
                icon: '🛡️',
                label: 'SHIELD',
                color: '#4FC3F7',
                glowColor: 'rgba(79, 195, 247, 0.5)',
                animType: 'rotate',
                check: (player) => player.hasShield || player.shieldActive,
                getDuration: (player) => {
                    if (player.shieldActive) return player.shieldDuration * 1000;
                    if (player.hasShield) {
                        const elapsed = Date.now() - player.shieldStartTime;
                        return Math.max(0, 15000 - elapsed);
                    }
                    return 0;
                },
                getMaxDuration: () => 15000
            },
            magnet: {
                icon: '🧲',
                label: 'MAGNET',
                color: '#F06292',
                glowColor: 'rgba(240, 98, 146, 0.5)',
                animType: 'pulse',
                check: (player) => player.hasMagnet,
                getDuration: (player) => {
                    const elapsed = Date.now() - player.magnetStartTime;
                    return Math.max(0, 10000 - elapsed);
                },
                getMaxDuration: () => 10000
            },
            boost: {
                icon: '💨',
                label: 'BOOST',
                color: '#00E5FF',
                glowColor: 'rgba(0, 229, 255, 0.5)',
                animType: 'shake',
                check: (player) => player.boostActive,
                getDuration: (player) => player.boostTimer * 1000,
                getMaxDuration: () => 3000
            },
            turbo: {
                icon: '🚀',
                label: 'TURBO',
                color: '#FFD700',
                glowColor: 'rgba(255, 215, 0, 0.5)',
                animType: 'bounce',
                check: (player) => player.isTurboActive,
                getDuration: (player) => player.turboTimeRemaining * 1000,
                getMaxDuration: (player) => player.turboInitialDuration * 1000
            },
            flight: {
                icon: '🪽',
                label: 'FLIGHT',
                color: '#81D4FA',
                glowColor: 'rgba(129, 212, 250, 0.5)',
                animType: 'wave',
                check: (player) => player.isFlightActive,
                getDuration: (player) => player.flightTimeRemaining * 1000,
                getMaxDuration: (player) => player.flightInitialDuration * 1000
            },
            instantFlight: {
                icon: '✨',
                label: 'INSTANT FLIGHT',
                color: '#CE93D8',
                glowColor: 'rgba(206, 147, 216, 0.5)',
                animType: 'sparkle',
                check: (player) => player.instantFlightActive,
                getDuration: (player) => player.instantFlightDuration * 1000,
                getMaxDuration: () => 5000
            },
            immortality: {
                icon: '👑',
                label: 'IMMORTALITY',
                color: '#FFD700',
                glowColor: 'rgba(255, 215, 0, 0.5)',
                animType: 'rainbow',
                check: (player) => player.powerups?.immortality,
                getDuration: (player) => {
                    const timer = this.powerupTimers?.immortality;
                    return timer?.active ? timer.duration : 0;
                },
                getMaxDuration: () => {
                    const timer = this.powerupTimers?.immortality;
                    return timer?.maxDuration || 5000;
                }
            },
            powerupFlight: {
                icon: '🪶',
                label: 'FLIGHT POWERUP',
                color: '#64B5F6',
                glowColor: 'rgba(100, 181, 246, 0.5)',
                animType: 'float',
                check: (player) => player.powerups?.flight,
                getDuration: (player) => {
                    const timer = this.powerupTimers?.flight;
                    return timer?.active ? timer.duration : 0;
                },
                getMaxDuration: () => {
                    const timer = this.powerupTimers?.flight;
                    return timer?.maxDuration || 4000;
                }
            },
            superJump: {
                icon: '⚡',
                label: 'SUPER JUMP',
                color: '#FF4081',
                glowColor: 'rgba(255, 64, 129, 0.5)',
                animType: 'zap',
                check: (player) => player.powerups?.superJump,
                getDuration: (player) => {
                    const timer = this.powerupTimers?.superJump;
                    return timer?.active ? timer.duration : 0;
                },
                getMaxDuration: () => {
                    const timer = this.powerupTimers?.superJump;
                    return timer?.maxDuration || 6000;
                }
            }
        };
    }
}
