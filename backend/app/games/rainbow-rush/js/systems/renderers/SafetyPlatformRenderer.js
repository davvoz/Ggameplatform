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
        
        // Charge indicators
        if (platform.charges !== undefined && platform.maxCharges) {
            this.renderChargeIndicators(platform, time);
        }

        // Timer indicator AL CENTRO DELLO SCHERMO - GRANDE E VISIBILE
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
        const chargeSize = 14;
        const chargeSpacing = 20;
        const totalWidth = platform.maxCharges * chargeSpacing - chargeSpacing + chargeSize;
        const startX = platform.x + platform.width / 2 - totalWidth / 2;
        const chargeY = platform.y - 40;
        
        for (let i = 0; i < platform.maxCharges; i++) {
            const cx = startX + i * chargeSpacing + chargeSize / 2;
            
            if (i < platform.charges) {
                this.renderAvailableCharge(cx, chargeY, chargeSize, time, i);
            } else {
                this.renderUsedCharge(cx, chargeY, chargeSize);
            }
        }
        
        // Cooldown bar
        this.renderCooldownBar(platform, time, startX, chargeY, totalWidth, chargeSize);
    }

    renderAvailableCharge(x, y, size, time, index) {
        const glowPulse = Math.sin(time * 4 + index) * 0.3 + 0.7;
        
        this.renderer.drawCircle(x, y, size + 6, [0.2, 1.0, 0.4, 0.5 * glowPulse]);
        this.renderer.drawCircle(x, y, size + 3, [0.3, 1.0, 0.5, 0.7 * glowPulse]);
        this.renderer.drawCircle(x, y, size, [0.0, 0.0, 0.0, 0.9]);
        this.renderer.drawCircle(x, y, size - 3, [0.4, 1.0, 0.6, 1.0]);
        this.renderer.drawCircle(x, y, size - 6, [0.8, 1.0, 0.9, 1.0]);
        this.renderer.drawCircle(x, y, size + 1, [1.0, 1.0, 1.0, 0.9]);
        this.renderer.drawCircle(x, y, size - 1, [0.1, 0.6, 0.3, 1.0]);
    }

    renderUsedCharge(x, y, size) {
        this.renderer.drawCircle(x, y, size + 2, [0.0, 0.0, 0.0, 0.8]);
        this.renderer.drawCircle(x, y, size - 1, [0.2, 0.2, 0.2, 0.9]);
        this.renderer.drawCircle(x, y, size, [0.8, 0.5, 0.1, 0.8]);
        this.renderer.drawCircle(x, y, size - 2, [0.15, 0.15, 0.15, 0.9]);
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
}
