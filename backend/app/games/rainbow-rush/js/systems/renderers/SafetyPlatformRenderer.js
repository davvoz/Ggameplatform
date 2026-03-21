/**
 * SafetyPlatformRenderer - Renders safety platforms with charge indicators
 * Single Responsibility: Safety platform visualization
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';

export class SafetyPlatformRenderer extends IEntityRenderer {
    constructor(renderer) {
        super(renderer);
    }

    render(platform, context) {
        const { time, canvasWidth, canvasHeight } = context;
        let alpha = 1.0;
        
        // Recharging effect
        if (platform.isRecharging) {
            alpha = 0.2 + Math.sin(time * 5) * 0.1;
            this.renderRechargeParticles(platform, time);
        }

        // Dissolving effect
        if (platform.isDissolving && platform.dissolveProgress) {
            alpha *= (1.0 - platform.dissolveProgress);
            this.renderDissolveParticles(platform, alpha);
        }

        // Pulsing glow
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        const glowColor = [...platform.color];
        glowColor[3] = 0.3 * pulse * alpha;
        this.renderer.drawRect(platform.x - 3, platform.y - 3, platform.width + 6, platform.height + 6, glowColor);

        // Main platform
        const mainColor = [...platform.color];
        mainColor[3] = alpha;
        this.renderer.drawRect(platform.x, platform.y, platform.width, platform.height, mainColor);

        // Warning stripes
        if (platform.isDissolving) {
            this.renderWarningStripes(platform, alpha);
        }

        // Highlight
        this.renderer.drawRect(platform.x, platform.y, platform.width, 2, [1.0, 1.0, 1.0, 0.5 * alpha]);
        
        // Glass cracks effect
        if (platform.crackProgress > 0 && platform.cracks && platform.cracks.length > 0) {
            this.renderGlassCracks(platform, alpha);
        }
        
        // Charge indicators
        if (platform.charges !== undefined && platform.maxCharges) {
            this.renderChargeIndicators(platform, time);
        }

        // Timer indicator AL CENTRO DELLO SCHERMO - GRANDE E VISIBILE
        // RENDERIZZATO QUI per essere sopra la piattaforma ma sotto l'UI
        if (platform.playerOnPlatform && platform.timeOnPlatform !== undefined && platform.maxTimeOnPlatform) {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            // Calcola alpha per fade-in/fade-out
            const fadeInDuration = 0.3; // 300ms fade-in
            const fadeOutStart = platform.maxTimeOnPlatform - 0.4; // Inizia fade-out 400ms prima della fine
            const fadeOutDuration = 0.4; // 400ms fade-out
            
            let timerAlpha = 1.0;
            
            // Fade-in all'inizio
            if (platform.timeOnPlatform < fadeInDuration) {
                timerAlpha = platform.timeOnPlatform / fadeInDuration;
            }
            // Fade-out alla fine
            else if (platform.timeOnPlatform > fadeOutStart) {
                const fadeOutProgress = (platform.timeOnPlatform - fadeOutStart) / fadeOutDuration;
                timerAlpha = 1.0 - fadeOutProgress;
            }
            
            // Easing smooth per fade
            timerAlpha = this.easeInOutCubic(Math.max(0, Math.min(1, timerAlpha)));
            
            this.renderBigTimerIndicator(platform, time, centerX, centerY, timerAlpha);
        }
    }
    
    easeInOutCubic(t) {
        // Easing function per rendere il fade più smooth
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    renderRechargeParticles(platform, time) {
        for (let i = 0; i < 8; i++) {
            const angle = (time * 2 + i * Math.PI / 4) % (Math.PI * 2);
            const distance = 30 + Math.sin(time * 3 + i) * 10;
            const px = platform.x + platform.width / 2 + Math.cos(angle) * distance;
            const py = platform.y + platform.height / 2 + Math.sin(angle) * distance;
            
            this.renderer.drawCircle(px, py, 4, [0.3, 0.8, 1.0, 0.8]);
            this.renderer.drawCircle(px, py, 8, [0.3, 0.8, 1.0, 0.3]);
        }
    }

    renderDissolveParticles(platform, alpha) {
        for (let i = 0; i < 5; i++) {
            const particleX = platform.x + Math.random() * platform.width;
            const particleY = platform.y + Math.random() * platform.height;
            const particleColor = [...platform.color];
            particleColor[3] = alpha * 0.5;
            this.renderer.drawCircle(particleX, particleY, 2, particleColor);
        }
    }

    renderWarningStripes(platform, alpha) {
        for (let i = 0; i < platform.width; i += 20) {
            const stripeColor = [1.0, 0.5, 0.0, alpha * 0.6];
            this.renderer.drawRect(platform.x + i, platform.y, 10, platform.height, stripeColor);
        }
    }

    renderChargeIndicators(platform, time) {
        const chargeSize = 16; // Pallini ancora più grandi
        const chargeSpacing = 28; // Più spazio tra loro
        const totalWidth = platform.maxCharges * chargeSpacing - 4;
        const startX = platform.x + platform.width / 2 - totalWidth / 2;
        const chargeY = platform.y - 35; // Più alti
        
        for (let i = 0; i < platform.maxCharges; i++) {
            const cx = startX + i * chargeSpacing;
            
            // Animazione quando un pallino viene spento
            const isJustConsumed = (platform.lastChargeConsumed === i) && (platform.chargeConsumedTime < 0.5);
            
            // Animazione ricarica sequenziale
            const isRecharging = platform.isRecharging || false;
            const rechargeProgress = platform.rechargeAnimProgress || 0;
            const rechargeDuration = platform.rechargeAnimDuration || 0.6;
            const chargesBeforeRecharge = platform.chargesBeforeRecharge || 0;
            
            // Calcola se questo pallino è in fase di ricarica
            let isThisChargeRecharging = false;
            let thisChargeRechargeProgress = 0;
            
            if (isRecharging && i >= chargesBeforeRecharge) {
                const chargesToRecharge = platform.maxCharges - chargesBeforeRecharge;
                const chargeIndex = i - chargesBeforeRecharge;
                const timePerCharge = rechargeDuration / chargesToRecharge;
                const startTime = chargeIndex * timePerCharge;
                const endTime = (chargeIndex + 1) * timePerCharge;
                
                if (rechargeProgress >= startTime && rechargeProgress < endTime) {
                    isThisChargeRecharging = true;
                    thisChargeRechargeProgress = (rechargeProgress - startTime) / timePerCharge;
                }
            }
            
            if (i < platform.charges) {
                this.renderAvailableCharge(cx, chargeY, chargeSize, time, i, false, isThisChargeRecharging, thisChargeRechargeProgress);
            } else {
                this.renderUsedCharge(cx, chargeY, chargeSize, isJustConsumed, platform.chargeConsumedTime, time);
            }
        }
        
        // Cooldown bar orizzontale centrata sotto i pallini
        this.renderHorizontalCooldownBar(platform, time, startX, chargeY + 26, totalWidth);
    }

    renderAvailableCharge(x, y, size, time, index, isConsuming, isRecharging, rechargeProgress) {
        // Bounce verticale allegro
        const bounce = Math.sin(time * 4 + index * 0.5) * 3;
        const yBounce = y + bounce;
        
        const glowPulse = Math.sin(time * 3 + index * 0.8) * 0.3 + 0.7;
        
        // Animazione ricarica - POP molto veloce!
        let scale = 1.0;
        let extraGlow = 0;
        let flashAlpha = 0;
        
        if (isRecharging) {
            // Animazione super veloce con POP
            if (rechargeProgress < 0.3) {
                // Esplosione iniziale
                const popProg = rechargeProgress / 0.3;
                scale = 0.3 + popProg * 1.2; // Parte piccolo e esplode
                extraGlow = (1 - popProg) * 20;
                flashAlpha = (1 - popProg) * 0.9;
            } else if (rechargeProgress < 0.6) {
                // Bounce back
                const bounceProg = (rechargeProgress - 0.3) / 0.3;
                scale = 1.2 - bounceProg * 0.25;
                extraGlow = 0;
                flashAlpha = 0;
            } else {
                // Settle
                const settleProg = (rechargeProgress - 0.6) / 0.4;
                scale = 0.95 + settleProg * 0.05;
            }
        }
        
        // Flash bianco quando si ricarica
        if (flashAlpha > 0) {
            this.renderer.drawCircle(x, yBounce, (size + 15) * scale, [1.0, 1.0, 1.0, flashAlpha]);
            this.renderer.drawCircle(x, yBounce, (size + 10) * scale, [1.0, 1.0, 0.5, flashAlpha * 0.8]);
        }
        
        // Glow colorato arcobaleno
        this.renderer.drawCircle(x, yBounce, (size + 10 + extraGlow) * scale, [0.4, 1.0, 0.6, 0.15 * glowPulse]);
        this.renderer.drawCircle(x, yBounce, (size + 6 + extraGlow * 0.5) * scale, [0.5, 1.0, 0.7, 0.25 * glowPulse]);
        
        // Bordo nero stile fumetto
        this.renderer.drawCircle(x, yBounce, (size + 3) * scale, [0.1, 0.1, 0.15, 1.0]);
        
        // Bordo bianco interno
        this.renderer.drawCircle(x, yBounce, (size + 1.5) * scale, [1.0, 1.0, 1.0, 1.0]);
        
        // Pallino verde lime brillante
        this.renderer.drawCircle(x, yBounce, size * scale, [0.2, 1.0, 0.3, 1.0]);
        
        // Gradiente verso il centro - giallo lime
        this.renderer.drawCircle(x, yBounce, size * 0.7 * scale, [0.6, 1.0, 0.5, 1.0]);
        
        // Centro giallo brillante
        this.renderer.drawCircle(x, yBounce, size * 0.4 * scale, [1.0, 1.0, 0.4, 1.0]);
        
        // Highlight cartoon GRANDE (stile lucido giocoso)
        this.renderer.drawCircle(x - size * 0.3 * scale, yBounce - size * 0.3 * scale, size * 0.45 * scale, [1.0, 1.0, 1.0, 1.0]);
        this.renderer.drawCircle(x - size * 0.3 * scale, yBounce - size * 0.3 * scale, size * 0.35 * scale, [1.0, 1.0, 1.0, 0.8]);
        
        // Piccolo riflesso laterale
        this.renderer.drawCircle(x + size * 0.35 * scale, yBounce + size * 0.2 * scale, size * 0.2 * scale, [1.0, 1.0, 1.0, 0.5]);
        
        // Stellina decorativa che pulsa (solo se non in ricarica)
        if (glowPulse > 0.85 && !isRecharging) {
            const starSize = 3;
            this.renderer.drawCircle(x + size * 0.6, yBounce - size * 0.6, starSize, [1.0, 1.0, 0.3, glowPulse]);
            this.renderer.drawCircle(x + size * 0.6 + starSize * 0.6, yBounce - size * 0.6, starSize * 0.4, [1.0, 1.0, 0.9, glowPulse]);
            this.renderer.drawCircle(x + size * 0.6 - starSize * 0.6, yBounce - size * 0.6, starSize * 0.4, [1.0, 1.0, 0.9, glowPulse]);
            this.renderer.drawCircle(x + size * 0.6, yBounce - size * 0.6 + starSize * 0.6, starSize * 0.4, [1.0, 1.0, 0.9, glowPulse]);
            this.renderer.drawCircle(x + size * 0.6, yBounce - size * 0.6 - starSize * 0.6, starSize * 0.4, [1.0, 1.0, 0.9, glowPulse]);
        }
        
        // Particelle di ricarica che volano via
        if (isRecharging && rechargeProgress < 0.5) {
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + rechargeProgress * Math.PI * 4;
                const dist = rechargeProgress * 40;
                const px = x + Math.cos(angle) * dist;
                const py = yBounce + Math.sin(angle) * dist;
                const particleAlpha = 1 - rechargeProgress * 2;
                this.renderer.drawCircle(px, py, 3, [1.0, 1.0, 0.5, particleAlpha]);
                this.renderer.drawCircle(px, py, 2, [1.0, 1.0, 1.0, particleAlpha]);
            }
        }
    }

    renderUsedCharge(x, y, size, isJustConsumed, consumedTime, time) {
        if (isJustConsumed && consumedTime < 0.5) {
            // Animazione EXPLOSION super divertente
            const progress = consumedTime / 0.5;
            
            if (progress < 0.3) {
                // BOOM esplosivo
                const boomProgress = progress / 0.3;
                const boomSize = size * (1 + boomProgress * 0.8);
                const boomAlpha = 1.0 - boomProgress;
                
                // Flash arancione/giallo esplosivo
                this.renderer.drawCircle(x, y, boomSize + 12, [1.0, 0.8, 0.0, boomAlpha * 0.7]);
                this.renderer.drawCircle(x, y, boomSize + 8, [1.0, 0.5, 0.0, boomAlpha * 0.9]);
                
                // Bordo nero
                this.renderer.drawCircle(x, y, size + 3, [0.1, 0.1, 0.15, 1.0]);
                this.renderer.drawCircle(x, y, size + 1.5, [1.0, 1.0, 1.0, 1.0]);
                
                // Pallino rosso che pulsa
                this.renderer.drawCircle(x, y, size * (1 + boomProgress * 0.2), [1.0, 0.2, 0.2, 1.0]);
                
                // Particelle esplosive a stella (8 direzioni)
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const distance = boomProgress * 35;
                    const px = x + Math.cos(angle) * distance;
                    const py = y + Math.sin(angle) * distance;
                    const particleSize = 5 * (1 - boomProgress);
                    
                    // Particella con bordo nero
                    this.renderer.drawCircle(px, py, particleSize + 1.5, [0.1, 0.1, 0.15, boomAlpha]);
                    this.renderer.drawCircle(px, py, particleSize, [1.0, 0.6 - boomProgress * 0.3, 0.2, boomAlpha]);
                    
                    // Centro bianco brillante
                    this.renderer.drawCircle(px, py, particleSize * 0.4, [1.0, 1.0, 0.8, boomAlpha]);
                }
            } else {
                // Fade to grigio con rotazione
                const fadeProgress = (progress - 0.3) / 0.7;
                const rotation = fadeProgress * Math.PI * 2;
                
                // Interpolazione colore
                const r = 1.0 * (1 - fadeProgress) + 0.4 * fadeProgress;
                const g = 0.2 * (1 - fadeProgress) + 0.4 * fadeProgress;
                const b = 0.2 * (1 - fadeProgress) + 0.45 * fadeProgress;
                
                this.renderer.drawCircle(x, y, size + 3, [0.1, 0.1, 0.15, 1.0]);
                this.renderer.drawCircle(x, y, size + 1.5, [1.0, 1.0, 1.0, 1.0 - fadeProgress * 0.3]);
                this.renderer.drawCircle(x, y, size, [r, g, b, 1.0]);
                this.renderer.drawCircle(x, y, size * 0.6, [r * 0.9, g * 0.9, b * 0.95, 1.0]);
            }
        } else {
            // Pallino spento - FACCINA TRISTE
            // Bordo nero
            this.renderer.drawCircle(x, y, size + 3, [0.1, 0.1, 0.15, 1.0]);
            
            // Bordo bianco
            this.renderer.drawCircle(x, y, size + 1.5, [1.0, 1.0, 1.0, 0.5]);
            
            // Pallino grigio
            this.renderer.drawCircle(x, y, size, [0.4, 0.4, 0.45, 1.0]);
            
            // Centro più scuro
            this.renderer.drawCircle(x, y, size * 0.6, [0.5, 0.5, 0.55, 1.0]);
            
            // FACCINA TRISTE :(
            const eyeSize = 2;
            const eyeY = y - size * 0.25;
            const eyeSpacing = size * 0.35;
            
            // Occhi (cerchietti neri)
            this.renderer.drawCircle(x - eyeSpacing, eyeY, eyeSize, [0.2, 0.2, 0.25, 1.0]);
            this.renderer.drawCircle(x + eyeSpacing, eyeY, eyeSize, [0.2, 0.2, 0.25, 1.0]);
            
            // Bocca triste (curva verso il basso)
            const mouthY = y + size * 0.2;
            const mouthWidth = size * 0.6;
            const mouthHeight = 3;
            
            for (let i = 0; i < 5; i++) {
                const t = i / 4;
                const mx = x - mouthWidth / 2 + t * mouthWidth;
                const curve = Math.sin(t * Math.PI) * (-mouthHeight);
                const my = mouthY + curve;
                this.renderer.drawCircle(mx, my, 1.5, [0.2, 0.2, 0.25, 1.0]);
            }
        }
    }

    renderHorizontalCooldownBar(platform, time, startX, barY, totalWidth) {
        const useTimes = platform.useTimes || [];
        if (useTimes.length === 0) return;
        
        const currentTime = platform.currentTime || (Date.now() / 1000);
        const useWindow = platform.useWindow || 20;
        const oldestUseTime = useTimes[0];
        const timeSinceOldest = currentTime - oldestUseTime;
        const windowProgress = Math.min(timeSinceOldest / useWindow, 1.0);
        
        const barWidth = totalWidth;
        const barHeight = 8; // Barra più spessa
        const barX = startX;
        
        // Ombra divertente spostata
        this.renderer.drawRect(barX + 2, barY + 2, barWidth + 2, barHeight + 1, [0.1, 0.1, 0.15, 0.5]);
        
        // Bordo nero stile fumetto
        this.renderer.drawRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6, [0.1, 0.1, 0.15, 1.0]);
        
        // Bordo bianco
        this.renderer.drawRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, [1.0, 1.0, 1.0, 1.0]);
        
        // Background grigio con texture
        this.renderer.drawRect(barX, barY, barWidth, barHeight, [0.35, 0.35, 0.4, 1.0]);
        this.renderer.drawRect(barX, barY, barWidth, barHeight / 2, [0.4, 0.4, 0.45, 0.5]);
        
        // Progress ARCOBALENO gradiente
        const progressWidth = barWidth * windowProgress;
        
        if (progressWidth > 0) {
            // Colore cambia nel tempo - effetto arcobaleno
            const hue = (time * 0.5 + windowProgress * 2) % 1.0;
            let r, g, b;
            
            if (hue < 0.33) {
                // Rosso -> Giallo
                r = 1.0;
                g = 0.3 + (hue / 0.33) * 0.7;
                b = 0.2;
            } else if (hue < 0.66) {
                // Giallo -> Verde
                r = 1.0 - ((hue - 0.33) / 0.33) * 0.7;
                g = 1.0;
                b = 0.2;
            } else {
                // Verde -> Ciano
                r = 0.3;
                g = 1.0;
                b = 0.2 + ((hue - 0.66) / 0.34) * 0.6;
            }
            
            this.renderer.drawRect(barX, barY, progressWidth, barHeight, [r, g, b, 1.0]);
            
            // Highlight glossy superiore
            this.renderer.drawRect(barX, barY, progressWidth, barHeight / 3, [1.0, 1.0, 1.0, 0.6]);
            
            // Ombra interna in basso
            this.renderer.drawRect(barX, barY + barHeight * 0.7, progressWidth, barHeight * 0.3, [0.0, 0.0, 0.0, 0.3]);
        }
        
        // Pallino indicatore SUPER CARINO sulla punta
        if (windowProgress < 1.0 && progressWidth > 8) {
            const dotX = barX + progressWidth;
            const dotY = barY + barHeight / 2;
            const dotPulse = Math.sin(time * 8) * 0.4 + 0.6;
            const dotSize = 6 + dotPulse * 2;
            
            // Colore sincronizzato con la barra
            const hue = (time * 0.5 + windowProgress * 2) % 1.0;
            let r, g, b;
            if (hue < 0.33) {
                r = 1.0; g = 0.3 + (hue / 0.33) * 0.7; b = 0.2;
            } else if (hue < 0.66) {
                r = 1.0 - ((hue - 0.33) / 0.33) * 0.7; g = 1.0; b = 0.2;
            } else {
                r = 0.3; g = 1.0; b = 0.2 + ((hue - 0.66) / 0.34) * 0.6;
            }
            
            // Glow pulsante colorato
            this.renderer.drawCircle(dotX, dotY, dotSize + 6, [r, g, b, 0.3 * dotPulse]);
            this.renderer.drawCircle(dotX, dotY, dotSize + 3, [r, g, b, 0.5 * dotPulse]);
            
            // Bordo nero
            this.renderer.drawCircle(dotX, dotY, dotSize + 1, [0.1, 0.1, 0.15, 1.0]);
            
            // Pallino colorato
            this.renderer.drawCircle(dotX, dotY, dotSize, [r, g, b, 1.0]);
            
            // Centro più chiaro
            this.renderer.drawCircle(dotX, dotY, dotSize * 0.6, [r + 0.3, g + 0.2, b + 0.2, 1.0]);
            
            // Highlight glossy
            this.renderer.drawCircle(dotX - dotSize * 0.3, dotY - dotSize * 0.3, dotSize * 0.4, [1.0, 1.0, 1.0, 1.0]);
            this.renderer.drawCircle(dotX - dotSize * 0.3, dotY - dotSize * 0.3, dotSize * 0.25, [1.0, 1.0, 1.0, 0.7]);
        }
    }
    
    renderVerticalCooldownBar(platform, time, centerX, startY, chargeSize) {
        const useTimes = platform.useTimes || [];
        if (useTimes.length === 0) return;
        
        const currentTime = platform.currentTime || (Date.now() / 1000);
        const useWindow = platform.useWindow || 20;
        const oldestUseTime = useTimes[0];
        const timeSinceOldest = currentTime - oldestUseTime;
        const windowProgress = Math.min(timeSinceOldest / useWindow, 1.0);
        
        const barWidth = 8; // Barra sottile ed elegante
        const barHeight = 50; // Più compatta
        const barX = centerX - barWidth / 2;
        const barY = startY;
        
        // Bordo bianco arrotondato (stile pop)
        this.renderer.drawRect(barX - 2, barY - 1, barWidth + 4, barHeight + 2, [1.0, 1.0, 1.0, 0.9]);
        
        // Background grigio scuro
        this.renderer.drawRect(barX, barY, barWidth, barHeight, [0.25, 0.25, 0.3, 1.0]);
        
        // Progress colorato (dal basso verso l'alto)
        const progressHeight = barHeight * windowProgress;
        const r = 1.0 - windowProgress * 0.6;
        const g = 0.4 + windowProgress * 0.6;
        this.renderer.drawRect(barX, barY + barHeight - progressHeight, barWidth, progressHeight, [r, g, 0.3, 1.0]);
        
        // Highlight sottile sulla progress bar
        if (progressHeight > 2) {
            this.renderer.drawRect(barX + 1, barY + barHeight - progressHeight, 2, progressHeight, [1.0, 1.0, 1.0, 0.3]);
        }
        
        // Pallino indicatore in cima alla barra (solo se in progress)
        if (windowProgress < 1.0 && progressHeight > 4) {
            const dotX = barX + barWidth / 2;
            const dotY = barY + barHeight - progressHeight;
            const dotPulse = Math.sin(time * 6) * 0.2 + 0.8;
            this.renderer.drawCircle(dotX, dotY, 4, [1.0, 1.0, 1.0, 1.0]);
            this.renderer.drawCircle(dotX, dotY, 3, [r, g, 0.3, dotPulse]);
        }
    }
    
    renderCooldownBar(platform, time, startX, chargeY, totalWidth, chargeSize) {
        const useTimes = platform.useTimes || [];
        if (useTimes.length === 0) return;
        
        const currentTime = platform.currentTime || (Date.now() / 1000);
        const useWindow = platform.useWindow || 20;
        const oldestUseTime = useTimes[0];
        const timeSinceOldest = currentTime - oldestUseTime;
        const windowProgress = Math.min(timeSinceOldest / useWindow, 1.0);
        
        const barWidth = totalWidth;
        const barHeight = 6;
        const barY = chargeY + chargeSize + 12;
        const barX = startX;
        
        // Background
        this.renderer.drawRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, [0.1, 0.1, 0.1, 0.8]);
        
        // Progress
        const progressWidth = barWidth * windowProgress;
        const r = 1.0 - windowProgress * 0.5;
        const g = 0.3 + windowProgress * 0.7;
        this.renderer.drawRect(barX, barY, progressWidth, barHeight, [r, g, 0.2, 0.9]);
        
        // Remaining
        const remainWidth = barWidth - progressWidth;
        if (remainWidth > 0) {
            this.renderer.drawRect(barX + progressWidth, barY, remainWidth, barHeight, [0.3, 0.2, 0.2, 0.7]);
        }
        
        // Border
        const borderColor = [1.0, 1.0, 1.0, 0.6];
        this.renderer.drawRect(barX - 1, barY - 1, barWidth + 2, 1, borderColor);
        this.renderer.drawRect(barX - 1, barY + barHeight, barWidth + 2, 1, borderColor);
        this.renderer.drawRect(barX - 1, barY, 1, barHeight, borderColor);
        this.renderer.drawRect(barX + barWidth, barY, 1, barHeight, borderColor);
        
        // Progress indicator
        if (windowProgress < 1.0) {
            const dotX = barX + progressWidth;
            const dotY = barY + barHeight / 2;
            const dotPulse = Math.sin(time * 8) * 0.3 + 0.7;
            this.renderer.drawCircle(dotX, dotY, 4, [1.0, 0.8, 0.3, dotPulse]);
            this.renderer.drawCircle(dotX, dotY, 2, [1.0, 1.0, 1.0, 1.0]);
        }
    }

    renderTimerIndicator(platform, time) {
        const timerProgress = platform.timeOnPlatform / platform.maxTimeOnPlatform;
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y + platform.height / 2;
        const radius = 30;
        
        // Background
        this.renderer.drawCircle(centerX, centerY, radius + 2, [0.2, 0.2, 0.2, 0.6]);
        
        // Ring color
        let ringColor;
        if (timerProgress < 0.5) {
            ringColor = [timerProgress * 2, 1.0, 0.0, 0.9];
        } else {
            ringColor = [1.0, 1.0 - (timerProgress - 0.5) * 2, 0.0, 0.9];
        }
        
        // Ring segments
        const segments = 24;
        const filledSegments = Math.floor(segments * (1 - timerProgress));
        
        for (let i = 0; i < segments; i++) {
            if (i < filledSegments) {
                const angleMiddle = (i + 0.5) / segments * Math.PI * 2 - Math.PI / 2;
                const x = centerX + Math.cos(angleMiddle) * radius;
                const y = centerY + Math.sin(angleMiddle) * radius;
                const segmentPulse = Math.sin(time * 8 + i * 0.2) * 0.2 + 0.8;
                const segmentColor = [...ringColor];
                segmentColor[3] *= segmentPulse;
                this.renderer.drawCircle(x, y, 3, segmentColor);
            }
        }
        
        // Inner circle
        this.renderer.drawCircle(centerX, centerY, radius - 5, [0.1, 0.1, 0.1, 0.8]);
        
        // Warning glow
        const glowIntensity = timerProgress > 0.7 ? (timerProgress - 0.7) / 0.3 : 0;
        if (glowIntensity > 0) {
            this.renderer.drawCircle(centerX, centerY, radius - 3, [1.0, 0.3, 0.0, glowIntensity * 0.5]);
        }
        
        // Countdown number
        this.renderCountdownNumber(platform, centerX, centerY, timerProgress);
        
        // Warning particles
        if (timerProgress > 0.8) {
            this.renderWarningParticles(time, centerX, centerY, radius);
        }
    }

    renderCountdownNumber(platform, centerX, centerY, timerProgress) {
        const timeLeft = Math.ceil(platform.maxTimeOnPlatform - platform.timeOnPlatform);
        const numberColor = timerProgress > 0.7 ? [1.0, 0.3, 0.0, 1.0] : [1.0, 1.0, 1.0, 1.0];
        const fontSize = 12;
        const numberStr = timeLeft.toString();
        const charWidth = 7;
        const totalWidth = numberStr.length * charWidth;
        let charX = centerX - totalWidth / 2;
        
        for (const char of numberStr) {
            const segments = RenderingUtils.getDigitSegments(char);
            const segW = 1.5;
            const segH = fontSize / 3;
            
            if (segments[0]) this.renderer.drawRect(charX + 1, centerY - fontSize/2, charWidth - 2, segW, numberColor);
            if (segments[1]) this.renderer.drawRect(charX, centerY - fontSize/2, segW, segH, numberColor);
            if (segments[2]) this.renderer.drawRect(charX + charWidth - segW, centerY - fontSize/2, segW, segH, numberColor);
            if (segments[3]) this.renderer.drawRect(charX + 1, centerY - segW/2, charWidth - 2, segW, numberColor);
            if (segments[4]) this.renderer.drawRect(charX, centerY, segW, segH, numberColor);
            if (segments[5]) this.renderer.drawRect(charX + charWidth - segW, centerY, segW, segH, numberColor);
            if (segments[6]) this.renderer.drawRect(charX + 1, centerY + fontSize/2 - segW, charWidth - 2, segW, numberColor);
            
            charX += charWidth + 1;
        }
    }

    renderBigTimerIndicator(platform, time, centerX, centerY, alpha = 1.0) {
        const timerProgress = platform.timeOnPlatform / platform.maxTimeOnPlatform;
        const radius = 120;
        
        // Background semplice - cerchio grande pieno colorato (con alpha)
        const bgPulse = Math.sin(time * 3) * 0.1 + 0.9;
        this.renderer.drawCircle(centerX, centerY, radius + 40, [0.15, 0.15, 0.25, 0.7 * bgPulse * alpha]);
        
        // Cerchio esterno bianco spesso (stile cartoon) (con alpha)
        this.renderer.drawCircle(centerX, centerY, radius + 12, [1.0, 1.0, 1.0, 1.0 * alpha]);
        
        // Colori naif vivaci - più semplici e allegri
        let mainColor, accentColor;
        if (timerProgress < 0.4) {
            mainColor = [0.2, 0.9, 0.3, 1.0 * alpha]; // Verde brillante
            accentColor = [0.4, 1.0, 0.5, 1.0 * alpha]; // Verde chiaro
        } else if (timerProgress < 0.7) {
            mainColor = [1.0, 0.8, 0.1, 1.0 * alpha]; // Giallo vivace
            accentColor = [1.0, 0.9, 0.4, 1.0 * alpha]; // Giallo chiaro
        } else {
            mainColor = [1.0, 0.3, 0.2, 1.0 * alpha]; // Rosso brillante
            accentColor = [1.0, 0.5, 0.4, 1.0 * alpha]; // Rosso chiaro
        }
        
        // Cerchio interno principale (pieno) (con alpha)
        this.renderer.drawCircle(centerX, centerY, radius + 4, mainColor);
        
        // Cerchio progressivo - SEMPLICE con cerchi grandi
        const segments = 20; // Meno segmenti = più naif
        const filledSegments = Math.floor(segments * (1 - timerProgress));
        const segmentSize = 18; // Pallini più grandi
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments * Math.PI * 2) - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i < filledSegments) {
                // Pallino pieno - stile cartoon con bordo bianco (con alpha)
                const bounce = Math.sin(time * 5 + i * 0.3) * 0.15 + 0.85; // Leggero bounce
                this.renderer.drawCircle(x, y, segmentSize * bounce + 3, [1.0, 1.0, 1.0, 1.0 * alpha]); // Bordo bianco
                this.renderer.drawCircle(x, y, segmentSize * bounce, accentColor); // Colore chiaro
                this.renderer.drawCircle(x, y, (segmentSize - 6) * bounce, [1.0, 1.0, 1.0, 0.8 * alpha]); // Highlight
            } else {
                // Pallino vuoto - grigio chiaro (con alpha)
                this.renderer.drawCircle(x, y, segmentSize - 2, [0.4, 0.4, 0.5, 0.8 * alpha]);
                this.renderer.drawCircle(x, y, segmentSize - 6, [0.3, 0.3, 0.35, 0.9 * alpha]);
            }
        }
        
        // Cerchio interno grande e piatto (con alpha)
        this.renderer.drawCircle(centerX, centerY, radius - 35, [0.2, 0.2, 0.3, 1.0 * alpha]);
        this.renderer.drawCircle(centerX, centerY, radius - 40, [0.25, 0.25, 0.35, 1.0 * alpha]);
        
        // Numero GIGANTE stile cartoon (con alpha)
        this.renderNaifCountdownNumber(platform, centerX, centerY, timerProgress, time, mainColor, accentColor, alpha);
        
        // Faccina allegra/preoccupata intorno al numero (con alpha)
        this.renderTimerEmoji(centerX, centerY, timerProgress, time, radius, alpha);
        
        // Stelline decorative quando va bene (con alpha)
        if (timerProgress < 0.5) {
            this.renderDecorativeStars(time, centerX, centerY, radius, mainColor, alpha);
        }
        
        // Effetto pulsante quando critico (con alpha)
        if (timerProgress > 0.75) {
            const warningPulse = Math.sin(time * 12) * 0.5 + 0.5;
            this.renderer.drawCircle(centerX, centerY, radius + 20 + warningPulse * 15, [1.0, 0.4, 0.2, 0.3 * warningPulse * alpha]);
        }
    }
    
    renderNaifCountdownNumber(platform, centerX, centerY, timerProgress, time, mainColor, accentColor, alpha = 1.0) {
        const timeLeft = Math.ceil(platform.maxTimeOnPlatform - platform.timeOnPlatform);
        
        // Colore numero - sempre bianco per contrasto (con alpha)
        const numberColor = [1.0, 1.0, 1.0, 1.0 * alpha];
        const shadowColor = [...mainColor];
        shadowColor[3] *= alpha; // Applica alpha alla shadow
        
        const fontSize = 80; // Ancora più grande
        const numberStr = timeLeft.toString();
        const charWidth = fontSize * 0.65;
        const totalWidth = numberStr.length * (charWidth + 10);
        let charX = centerX - totalWidth / 2;
        
        // Effetto bounce quando cambia numero
        const bounce = timerProgress > 0.9 ? Math.sin(time * 15) * 0.1 + 0.9 : 1.0;
        
        for (const char of numberStr) {
            const segments = RenderingUtils.getDigitSegments(char);
            const segW = 12; // Molto spesso - stile grassetto
            const segH = fontSize / 2.2;
            const gap = 4;
            const offset = 6; // Offset per shadow
            
            // Shadow (colore principale spostato)
            if (segments[0]) this.renderer.drawRect(charX + gap + segW + offset, centerY - fontSize/2 * bounce + offset, charWidth - segW * 2, segW, shadowColor);
            if (segments[1]) this.renderer.drawRect(charX + gap + offset, centerY - fontSize/2 * bounce + offset, segW, segH, shadowColor);
            if (segments[2]) this.renderer.drawRect(charX + charWidth - segW - gap + offset, centerY - fontSize/2 * bounce + offset, segW, segH, shadowColor);
            if (segments[3]) this.renderer.drawRect(charX + gap + segW + offset, centerY - segW/2 * bounce + offset, charWidth - segW * 2, segW, shadowColor);
            if (segments[4]) this.renderer.drawRect(charX + gap + offset, centerY + gap + offset, segW, segH, shadowColor);
            if (segments[5]) this.renderer.drawRect(charX + charWidth - segW - gap + offset, centerY + gap + offset, segW, segH, shadowColor);
            if (segments[6]) this.renderer.drawRect(charX + gap + segW + offset, centerY + fontSize/2 * bounce - segW + offset, charWidth - segW * 2, segW, shadowColor);
            
            // Numero principale bianco
            if (segments[0]) this.renderer.drawRect(charX + gap + segW, centerY - fontSize/2 * bounce, charWidth - segW * 2, segW, numberColor);
            if (segments[1]) this.renderer.drawRect(charX + gap, centerY - fontSize/2 * bounce, segW, segH, numberColor);
            if (segments[2]) this.renderer.drawRect(charX + charWidth - segW - gap, centerY - fontSize/2 * bounce, segW, segH, numberColor);
            if (segments[3]) this.renderer.drawRect(charX + gap + segW, centerY - segW/2 * bounce, charWidth - segW * 2, segW, numberColor);
            if (segments[4]) this.renderer.drawRect(charX + gap, centerY + gap, segW, segH, numberColor);
            if (segments[5]) this.renderer.drawRect(charX + charWidth - segW - gap, centerY + gap, segW, segH, numberColor);
            if (segments[6]) this.renderer.drawRect(charX + gap + segW, centerY + fontSize/2 * bounce - segW, charWidth - segW * 2, segW, numberColor);
            
            charX += charWidth + 10;
        }
    }
    
    renderTimerEmoji(centerX, centerY, timerProgress, time, radius, alpha = 1.0) {
        // Posizione degli occhi
        const eyeY = centerY - radius * 0.6;
        const eyeSpacing = 25;
        
        if (timerProgress < 0.5) {
            // Faccina felice ^_^
            const eyeSize = 8;
            const smile = 4;
            
            // Occhi chiusi felici (lineette) (con alpha)
            this.renderer.drawRect(centerX - eyeSpacing - eyeSize, eyeY - 2, eyeSize * 2, 4, [0.3, 0.3, 0.4, 1.0 * alpha]);
            this.renderer.drawRect(centerX + eyeSpacing - eyeSize, eyeY - 2, eyeSize * 2, 4, [0.3, 0.3, 0.4, 1.0 * alpha]);
            
        } else if (timerProgress < 0.75) {
            // Occhi preoccupati O_O (con alpha)
            const eyeSize = 10;
            
            this.renderer.drawCircle(centerX - eyeSpacing, eyeY, eyeSize, [1.0, 1.0, 1.0, 1.0 * alpha]);
            this.renderer.drawCircle(centerX - eyeSpacing, eyeY, eyeSize - 3, [0.2, 0.2, 0.3, 1.0 * alpha]);
            this.renderer.drawCircle(centerX + eyeSpacing, eyeY, eyeSize, [1.0, 1.0, 1.0, 1.0 * alpha]);
            this.renderer.drawCircle(centerX + eyeSpacing, eyeY, eyeSize - 3, [0.2, 0.2, 0.3, 1.0 * alpha]);
            
        } else {
            // Occhi spaventati >_< (pulsanti) (con alpha)
            const blink = Math.sin(time * 10) * 0.3 + 0.7;
            const eyeSize = 12 * blink;
            
            // Occhi a X
            const lineLen = 12;
            this.renderer.drawRect(centerX - eyeSpacing - lineLen/2, eyeY - 2, lineLen, 4, [1.0, 0.3, 0.2, blink * alpha]);
            this.renderer.drawRect(centerX - eyeSpacing - 2, eyeY - lineLen/2, 4, lineLen, [1.0, 0.3, 0.2, blink * alpha]);
            this.renderer.drawRect(centerX + eyeSpacing - lineLen/2, eyeY - 2, lineLen, 4, [1.0, 0.3, 0.2, blink * alpha]);
            this.renderer.drawRect(centerX + eyeSpacing - 2, eyeY - lineLen/2, 4, lineLen, [1.0, 0.3, 0.2, blink * alpha]);
        }
    }
    
    renderDecorativeStars(time, centerX, centerY, radius, mainColor, alpha = 1.0) {
        // Stelline che ruotano attorno al timer (con alpha)
        const numStars = 4;
        for (let i = 0; i < numStars; i++) {
            const angle = (time * 2 + i * Math.PI / 2) % (Math.PI * 2);
            const distance = radius + 50 + Math.sin(time * 4 + i) * 8;
            const px = centerX + Math.cos(angle) * distance;
            const py = centerY + Math.sin(angle) * distance;
            
            const starSize = 12 + Math.sin(time * 6 + i) * 4;
            const starBounce = Math.abs(Math.sin(time * 5 + i)) * 0.3 + 0.7;
            
            const starMainColor = [...mainColor];
            starMainColor[3] *= alpha;
            
            // Stella semplice - 4 pallini a croce
            this.renderer.drawCircle(px, py, starSize * starBounce, [1.0, 1.0, 1.0, 1.0 * alpha]);
            this.renderer.drawCircle(px, py, starSize * 0.7 * starBounce, starMainColor);
            this.renderer.drawCircle(px + starSize * 0.6, py, starSize * 0.4, [1.0, 1.0, 0.7, 0.9 * alpha]);
            this.renderer.drawCircle(px - starSize * 0.6, py, starSize * 0.4, [1.0, 1.0, 0.7, 0.9 * alpha]);
            this.renderer.drawCircle(px, py + starSize * 0.6, starSize * 0.4, [1.0, 1.0, 0.7, 0.9 * alpha]);
            this.renderer.drawCircle(px, py - starSize * 0.6, starSize * 0.4, [1.0, 1.0, 0.7, 0.9 * alpha]);
        }
    }
    
    renderBigWarningParticles(time, centerX, centerY, radius, intensity) {
        // Particelle semplici che saltano
        const numParticles = 6;
        for (let i = 0; i < numParticles; i++) {
            const angle = (time * 3 + i * (Math.PI * 2 / numParticles)) % (Math.PI * 2);
            const distance = radius + 45;
            const bounce = Math.abs(Math.sin(time * 8 + i * 0.7)) * 15; // Bounce up/down
            const px = centerX + Math.cos(angle) * distance;
            const py = centerY + Math.sin(angle) * distance - bounce;
            
            const particleSize = 10 + bounce * 0.3;
            
            // Pallino rosso/arancione con bordo bianco
            this.renderer.drawCircle(px, py, particleSize + 3, [1.0, 1.0, 1.0, 1.0]);
            this.renderer.drawCircle(px, py, particleSize, [1.0, 0.4, 0.2, 1.0]);
            this.renderer.drawCircle(px, py, particleSize - 4, [1.0, 0.7, 0.4, 1.0]);
        }
    }
    
    renderTimerLabel(x, y, timerProgress) {
        // Nessuna label - stile naif non ha bisogno di testo
        // Il timer è autoesplicativo con i colori e le faccine
    }

    renderWarningParticles(time, centerX, centerY, radius) {
        for (let i = 0; i < 3; i++) {
            const angle = (time * 5 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
            const distance = radius + 8 + Math.sin(time * 10 + i) * 3;
            const px = centerX + Math.cos(angle) * distance;
            const py = centerY + Math.sin(angle) * distance;
            this.renderer.drawCircle(px, py, 2, [1.0, 0.4, 0.0, 0.8]);
        }
    }
    
    renderGlassCracks(platform, alpha) {
        const cracks = platform.cracks || [];
        const platformX = platform.x;
        const platformY = platform.y;
        const crackProgress = platform.crackProgress || 0;
        
        for (const crack of cracks) {
            const points = crack.points;
            if (points.length < 2) continue;
            
            // Calculate crack alpha once per crack - PIÙ FINE E DELICATO
            const crackAlpha = crack.opacity * crackProgress * alpha;
            
            // Draw crack line segments
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                
                // World coordinates
                const x1 = platformX + p1.x;
                const y1 = platformY + p1.y;
                const x2 = platformX + p2.x;
                const y2 = platformY + p2.y;
                
                // Calculate line segments for thick line
                const thickness = crack.thickness * 0.8; // PIÙ FINE
                const dx = x2 - x1;
                const dy = y2 - y1;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                if (length > 0) {
                    const perpX = -dy / length * thickness;
                    const perpY = dx / length * thickness;
                    
                    // Linea scura principale - sottile e delicata
                    this.renderer.drawLine(x1, y1, x2, y2, thickness, [0.0, 0.0, 0.05, crackAlpha * 0.7]);
                    
                    // Highlight bianco sottile (effetto vetro delicato)
                    this.renderer.drawLine(
                        x1 + perpX * 0.4, 
                        y1 + perpY * 0.4, 
                        x2 + perpX * 0.4, 
                        y2 + perpY * 0.4, 
                        thickness * 0.3, 
                        [1.0, 1.0, 1.0, crackAlpha * 0.4]
                    );
                    
                    // Riflesso azzurrato sottile
                    this.renderer.drawLine(
                        x1 + perpX * 0.25, 
                        y1 + perpY * 0.25, 
                        x2 + perpX * 0.25, 
                        y2 + perpY * 0.25, 
                        thickness * 0.2, 
                        [0.7, 0.9, 1.0, crackAlpha * 0.3]
                    );
                }
                
                // Punti di giunzione molto piccoli
                if (i > 0 && i < points.length - 1) {
                    // Punto scuro piccolo
                    this.renderer.drawCircle(x1, y1, thickness * 1.2, [0.0, 0.0, 0.05, crackAlpha * 0.6]);
                    // Piccolo highlight
                    this.renderer.drawCircle(x1 - thickness * 0.3, y1 - thickness * 0.3, thickness * 0.5, [1.0, 1.0, 1.0, crackAlpha * 0.3]);
                }
            }
        }
    }
}
