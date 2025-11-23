/**
 * FlightButtonUI - Bottone volo con controllo step verticale
 * Simile a TurboButtonUI ma sulla sinistra
 */
import { calculateUIPositions } from '../config/UIPositions.js';

export class FlightButtonUI {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Posizione bottone - usa posizioni centralizzate
        const positions = calculateUIPositions(canvasWidth, canvasHeight);
        this.buttonRadius = positions.flightButton.radius;
        this.buttonX = positions.flightButton.x;
        this.buttonY = positions.flightButton.y;
        
        // Animazioni avanzate
        this.pulseTime = 0;
        this.glowIntensity = 0;
        this.bounceOffset = 0;
        this.bouncePhase = 0;
        this.rotationAngle = 0;
        this.sparkles = [];
        this.ripples = [];
    }
    
    update(deltaTime, player) {
        this.pulseTime += deltaTime;
        this.rotationAngle += deltaTime * 2;
        
        const isReady = player.isFlightCooldownReady() && !player.isFlightActive;
        const isActive = player.isFlightActive;
        
        // Glow pulsante quando ready
        if (isReady) {
            this.glowIntensity = Math.min(this.glowIntensity + deltaTime * 3, 1.0);
        } else {
            this.glowIntensity = Math.max(this.glowIntensity - deltaTime * 2, 0);
        }
        
        // Bounce quando ready
        if (isReady) {
            this.bouncePhase += deltaTime * 4;
            this.bounceOffset = Math.abs(Math.sin(this.bouncePhase)) * 10;
            
            // Genera sparkles quando ready
            if (Math.random() < 0.15) {
                const angle = Math.random() * Math.PI * 2;
                this.sparkles.push({
                    x: this.buttonX + Math.cos(angle) * this.buttonRadius,
                    y: this.buttonY + Math.sin(angle) * this.buttonRadius,
                    vx: Math.cos(angle) * 60,
                    vy: Math.sin(angle) * 60,
                    life: 1.0,
                    size: 3 + Math.random() * 2
                });
            }
        } else {
            this.bounceOffset *= 0.9;
        }
        
        // Update sparkles
        this.sparkles = this.sparkles.filter(s => {
            s.life -= deltaTime * 2;
            s.x += s.vx * deltaTime;
            s.y += s.vy * deltaTime;
            return s.life > 0;
        });
        
        // Update ripples
        this.ripples = this.ripples.filter(r => {
            r.life -= deltaTime;
            r.radius += deltaTime * 120;
            return r.life > 0;
        });
    }
    
    render(gl, renderer, player) {
        const ctx = renderer.textCtx;
        if (!ctx) return;
        
        ctx.save();
        
        const isReady = player.isFlightCooldownReady() && !player.isFlightActive;
        const isActive = player.isFlightActive;
        const displayY = this.buttonY - this.bounceOffset;
        
        // Render ripples (onde d'urto quando attivato)
        for (const ripple of this.ripples) {
            const alpha = ripple.life * 0.6;
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, ripple.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Outer glow elaborato quando ready
        if (isReady && this.glowIntensity > 0) {
            const pulse = Math.sin(this.pulseTime * 5) * 0.4 + 0.6;
            
            // Alone rotante con gradiente
            for (let i = 0; i < 3; i++) {
                const radius = this.buttonRadius + 15 + i * 10;
                const alpha = (0.3 - i * 0.08) * this.glowIntensity * pulse;
                const gradient = ctx.createRadialGradient(
                    this.buttonX, displayY, radius * 0.8,
                    this.buttonX, displayY, radius
                );
                gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha})`);
                gradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.buttonX, displayY, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Raggiera di piume rotante
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 + this.rotationAngle;
                const dist = this.buttonRadius + 22 * pulse;
                const sx = this.buttonX + Math.cos(angle) * dist;
                const sy = displayY + Math.sin(angle) * dist;
                
                const featherAlpha = 0.7 * this.glowIntensity * pulse;
                ctx.fillStyle = `rgba(120, 220, 255, ${featherAlpha})`;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪶', sx, sy);
            }
        }
        
        // Render sparkles
        for (const sparkle of this.sparkles) {
            const alpha = sparkle.life;
            ctx.fillStyle = `rgba(150, 230, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Stella sparkle
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.font = `${sparkle.size * 3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✨', sparkle.x, sparkle.y);
        }
        
        // Cerchio esterno con gradiente migliorato
        const gradient = ctx.createRadialGradient(
            this.buttonX, displayY, this.buttonRadius * 0.2,
            this.buttonX, displayY, this.buttonRadius
        );
        
        if (isActive) {
            // Azzurro brillante quando attivo con animazione
            const activePulse = Math.sin(this.pulseTime * 8) * 0.1 + 0.9;
            gradient.addColorStop(0, `rgba(150, 230, 255, ${activePulse})`);
            gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.95)');
            gradient.addColorStop(1, 'rgba(50, 150, 255, 0.8)');
        } else if (isReady) {
            // Celeste pulsante quando ready
            const pulse = Math.sin(this.pulseTime * 4) * 0.2 + 0.8;
            gradient.addColorStop(0, `rgba(180, 240, 255, ${pulse})`);
            gradient.addColorStop(0.6, `rgba(120, 200, 255, ${pulse * 0.9})`);
            gradient.addColorStop(1, `rgba(80, 180, 255, ${pulse * 0.75})`);
        } else {
            // Grigio quando in cooldown
            gradient.addColorStop(0, 'rgba(120, 120, 120, 0.7)');
            gradient.addColorStop(0.6, 'rgba(80, 80, 80, 0.6)');
            gradient.addColorStop(1, 'rgba(60, 60, 60, 0.5)');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.buttonX, displayY, this.buttonRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bordo con glow
        if (isActive || isReady) {
            ctx.shadowColor = 'rgba(100, 200, 255, 0.8)';
            ctx.shadowBlur = isActive ? 15 : 10;
        }
        ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(200, 230, 255, 0.8)';
        ctx.lineWidth = isActive ? 4 : 3;
        ctx.beginPath();
        ctx.arc(this.buttonX, displayY, this.buttonRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Icona ali/volo con ombra
        if (isActive || isReady) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 8;
        }
        ctx.fillStyle = 'white';
        ctx.font = 'bold 34px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦅', this.buttonX, displayY);
        ctx.shadowBlur = 0;
        
        // Progress ring del tempo attivo (quando volo è attivo) - ATTORNO AL BOTTONE
        if (isActive && player.flightTimeRemaining > 0) {
            const totalDuration = player.flightInitialDuration || player.flightBaseDuration;
            const progress = player.flightTimeRemaining / totalDuration;
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * progress);
            const pulse = Math.sin(this.pulseTime * 6) * 0.15 + 0.85;
            
            // Ring esterno (ombra)
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, this.buttonRadius + 7, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 6;
            ctx.stroke();
            
            // Ring progresso con gradiente animato
            const ringGradient = ctx.createLinearGradient(
                this.buttonX - this.buttonRadius, displayY,
                this.buttonX + this.buttonRadius, displayY
            );
            ringGradient.addColorStop(0, `rgba(80, 220, 255, ${pulse})`);
            ringGradient.addColorStop(0.5, `rgba(120, 240, 255, ${pulse})`);
            ringGradient.addColorStop(1, `rgba(100, 230, 255, ${pulse})`);
            
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, this.buttonRadius + 6, startAngle, endAngle);
            ctx.strokeStyle = ringGradient;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Punto luminoso alla fine del ring
            const dotAngle = endAngle;
            const dotRadius = this.buttonRadius + 6;
            const dotX = this.buttonX + Math.cos(dotAngle) * dotRadius;
            const dotY = displayY + Math.sin(dotAngle) * dotRadius;
            
            const dotGradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 8);
            dotGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            dotGradient.addColorStop(0.5, 'rgba(150, 240, 255, 0.8)');
            dotGradient.addColorStop(1, 'rgba(100, 220, 255, 0)');
            ctx.fillStyle = dotGradient;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Progress ring del cooldown ELABORATO
        if (!isActive && player.flightCooldownRemaining > 0) {
            const cooldownProgress = player.getFlightCooldownProgress();
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * cooldownProgress);
            
            // Ring esterno (ombra)
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, this.buttonRadius + 7, startAngle, endAngle);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 6;
            ctx.stroke();
            
            // Ring principale con gradiente rotante
            const ringGradient = ctx.createLinearGradient(
                this.buttonX - this.buttonRadius, displayY,
                this.buttonX + this.buttonRadius, displayY
            );
            const gradientOffset = (this.pulseTime * 0.5) % 1;
            ringGradient.addColorStop(0, `rgba(80, 180, 255, ${0.6 + Math.sin(this.pulseTime * 3) * 0.2})`);
            ringGradient.addColorStop(0.5, `rgba(120, 210, 255, ${0.8 + Math.sin(this.pulseTime * 3) * 0.2})`);
            ringGradient.addColorStop(1, `rgba(100, 200, 255, ${0.6 + Math.sin(this.pulseTime * 3) * 0.2})`);
            
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, this.buttonRadius + 6, startAngle, endAngle);
            ctx.strokeStyle = ringGradient;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Punto luminoso alla fine del ring
            const dotAngle = endAngle;
            const dotRadius = this.buttonRadius + 6;
            const dotX = this.buttonX + Math.cos(dotAngle) * dotRadius;
            const dotY = displayY + Math.sin(dotAngle) * dotRadius;
            
            const dotGradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 8);
            dotGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            dotGradient.addColorStop(0.5, 'rgba(150, 230, 255, 0.8)');
            dotGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            ctx.fillStyle = dotGradient;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === INDICATORI ZONE DI VOLO ===
        // Quando il volo è attivo, mostra zone cliccabili su/giù
        if (isActive) {
            const midY = this.canvasHeight / 2;
            const pulse = Math.sin(this.pulseTime * 4) * 0.15 + 0.85;
            const arrowBounce = Math.sin(this.pulseTime * 5) * 8;
            
            // === ZONA SUPERIORE (CLICK PER SALIRE) ===
            // Zona semitrasparente superiore
            const topGradient = ctx.createLinearGradient(0, 0, 0, midY);
            topGradient.addColorStop(0, `rgba(100, 255, 150, ${0.15 * pulse})`);
            topGradient.addColorStop(1, `rgba(100, 255, 150, 0)`);
            ctx.fillStyle = topGradient;
            ctx.fillRect(0, 0, this.canvasWidth, midY);
            
            // Freccia SU con ombra
            const arrowUpY = 80 - arrowBounce;
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 3;
            
            // Sfondo freccia
            ctx.fillStyle = `rgba(100, 255, 150, ${0.25 * pulse})`;
            ctx.beginPath();
            ctx.arc(this.canvasWidth / 2, arrowUpY, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // Bordo freccia
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.canvasWidth / 2, arrowUpY, 35, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // Icona freccia SU
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⬆️', this.canvasWidth / 2, arrowUpY);
            
            // Testo "CLICK TO GO UP"
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * pulse})`;
            ctx.font = 'bold 18px Arial';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.lineWidth = 4;
            ctx.strokeText('CLICK TO GO UP', this.canvasWidth / 2, arrowUpY + 55);
            ctx.fillText('CLICK TO GO UP', this.canvasWidth / 2, arrowUpY + 55);
            
            ctx.restore();
            
            // === ZONA INFERIORE (CLICK PER SCENDERE) ===
            // Zona semitrasparente inferiore
            const bottomGradient = ctx.createLinearGradient(0, midY, 0, this.canvasHeight);
            bottomGradient.addColorStop(0, `rgba(255, 150, 100, 0)`);
            bottomGradient.addColorStop(1, `rgba(255, 150, 100, ${0.15 * pulse})`);
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(0, midY, this.canvasWidth, this.canvasHeight - midY);
            
            // Freccia GIÙ con ombra
            const arrowDownY = this.canvasHeight - 180 + arrowBounce;
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 3;
            
            // Sfondo freccia
            ctx.fillStyle = `rgba(255, 150, 100, ${0.25 * pulse})`;
            ctx.beginPath();
            ctx.arc(this.canvasWidth / 2, arrowDownY, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // Bordo freccia
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.canvasWidth / 2, arrowDownY, 35, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // Icona freccia GIÙ
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⬇️', this.canvasWidth / 2, arrowDownY);
            
            // Testo "CLICK TO GO DOWN"
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * pulse})`;
            ctx.font = 'bold 18px Arial';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.lineWidth = 4;
            ctx.strokeText('CLICK TO GO DOWN', this.canvasWidth / 2, arrowDownY + 55);
            ctx.fillText('CLICK TO GO DOWN', this.canvasWidth / 2, arrowDownY + 55);
            
            ctx.restore();
            
            // Linea divisoria centrale (opzionale, sottile)
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(this.canvasWidth, midY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
    
    checkClick(x, y, player) {
        const dx = x - this.buttonX;
        const dy = y - this.buttonY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const clicked = distance <= this.buttonRadius;
        
        // Crea ripple quando cliccato e pronto
        if (clicked && player.isFlightCooldownReady() && !player.isFlightActive) {
            this.ripples.push({
                radius: this.buttonRadius,
                life: 0.8
            });
        }
        
        return clicked;
    }
    
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // Ricalcola posizioni usando il sistema centralizzato
        const positions = calculateUIPositions(width, height);
        this.buttonRadius = positions.flightButton.radius;
        this.buttonX = positions.flightButton.x;
        this.buttonY = positions.flightButton.y;
    }
}
