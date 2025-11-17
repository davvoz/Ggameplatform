/**
 * TurboButtonUI - Renders turbo boost button with cooldown visualization
 */
export class TurboButtonUI {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Button properties
        this.buttonRadius = 40; // Più grande e amichevole
        this.buttonX = canvasWidth - 60; // Destra, 60px dal bordo
        this.buttonY = canvasHeight - 130; // Basso, 130px dal bordo (più in basso)
        
        // Animation
        this.pulseTime = 0;
        this.glowIntensity = 0;
        this.bounceOffset = 0; // Per animazione bounce
        this.wiggleAngle = 0; // Per animazione oscillazione
        this.activationAnimation = 0; // 0-1 per animazione di attivazione
        this.deactivationAnimation = 0; // 0-1 per animazione di disattivazione
        this.wasActive = false; // Traccia stato precedente
        
        // Touch/click state
        this.isPressed = false;
    }
    
    update(deltaTime, player) {
        this.pulseTime += deltaTime;
        
        // Bounce animation quando ready
        if (player.isTurboCooldownReady() && !player.isTurboActive) {
            this.bounceOffset = Math.abs(Math.sin(this.pulseTime * 3)) * 5; // Saltella su e giù
            this.wiggleAngle = Math.sin(this.pulseTime * 8) * 0.1; // Oscillazione leggera
        } else {
            this.bounceOffset = 0;
            this.wiggleAngle = 0;
        }
        
        // Glow when ready
        if (player.isTurboCooldownReady() && !player.isTurboActive) {
            this.glowIntensity = Math.min(1.0, this.glowIntensity + deltaTime * 2);
        } else {
            this.glowIntensity = Math.max(0.0, this.glowIntensity - deltaTime * 3);
        }
    }
    
    render(gl, renderer, player) {
        const ctx = renderer.textCtx; // Use the 2D text canvas context
        if (!ctx) return;
        
        ctx.save();
        
        // Button background circle
        const isReady = player.isTurboCooldownReady() && !player.isTurboActive;
        const isActive = player.isTurboActive;
        
        // Posizione con bounce
        const displayY = this.buttonY - this.bounceOffset;
        
        // Outer glow stellare quando ready
        if (isReady && this.glowIntensity > 0) {
            const pulse = Math.sin(this.pulseTime * 5) * 0.4 + 0.6;
            
            // Raggiera di stelle
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + this.pulseTime * 2;
                const dist = this.buttonRadius + 25 * pulse;
                const sx = this.buttonX + Math.cos(angle) * dist;
                const sy = displayY + Math.sin(angle) * dist;
                
                ctx.fillStyle = `rgba(255, 200, 50, ${0.8 * this.glowIntensity * pulse})`;
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⭐', sx, sy);
            }
        }
        
        // Ombra cartoon - più marcata
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(this.buttonX, displayY + this.buttonRadius + 8, this.buttonRadius * 0.9, this.buttonRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ruota leggermente il bottone quando wiggle
        ctx.translate(this.buttonX, displayY);
        ctx.rotate(this.wiggleAngle);
        ctx.translate(-this.buttonX, -displayY);
        
        // Main button circle - colori vivaci cartoon (SENZA bordo nero)
        ctx.beginPath();
        ctx.arc(this.buttonX, displayY, this.buttonRadius, 0, Math.PI * 2);
        
        if (isActive) {
            // Active - arcobaleno pulsante
            const activePulse = Math.sin(this.pulseTime * 12) * 0.3 + 0.7;
            const activeGradient = ctx.createRadialGradient(
                this.buttonX - 15, displayY - 15, 0,
                this.buttonX, displayY, this.buttonRadius
            );
            activeGradient.addColorStop(0, '#FFF59D'); // Yellow super light
            activeGradient.addColorStop(0.3, '#FFD54F'); // Yellow light
            activeGradient.addColorStop(0.6, '#FF9800'); // Orange
            activeGradient.addColorStop(1, '#FF5722'); // Deep orange
            ctx.fillStyle = activeGradient;
        } else if (isReady) {
            // Ready - giallo brillante allegro
            const readyGradient = ctx.createRadialGradient(
                this.buttonX - 15, displayY - 15, 0,
                this.buttonX, displayY, this.buttonRadius
            );
            readyGradient.addColorStop(0, '#FFEB3B'); // Bright yellow
            readyGradient.addColorStop(0.5, '#FFC107'); // Amber
            readyGradient.addColorStop(1, '#FF9800'); // Orange
            ctx.fillStyle = readyGradient;
        } else {
            // Cooldown - grigio con un tocco di colore
            const cooldownGradient = ctx.createRadialGradient(
                this.buttonX - 12, displayY - 12, 0,
                this.buttonX, displayY, this.buttonRadius
            );
            cooldownGradient.addColorStop(0, '#90A4AE'); // Blue grey
            cooldownGradient.addColorStop(1, '#546E7A'); // Blue grey dark
            ctx.fillStyle = cooldownGradient;
        }
        
        ctx.fill();
        
        // Highlight cartoon - grande e visibile
        const highlightGradient = ctx.createRadialGradient(
            this.buttonX - 12, displayY - 12, 0,
            this.buttonX - 5, displayY - 5, this.buttonRadius * 0.6
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(this.buttonX - 5, displayY - 8, this.buttonRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Progress bar circolare quando TURBO ATTIVO - si consuma
        if (isActive) {
            const turboProgress = player.turboTimeRemaining / (player.turboBaseDuration + (player.turboTimeRemaining / player.turboTimeRemaining)); // Calcola da tempo totale
            const totalDuration = player.turboBaseDuration + Math.floor(player.turboTimeRemaining); // Stima durata iniziale
            const remainingProgress = player.turboTimeRemaining / totalDuration;
            
            // Background ring semi-trasparente
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, this.buttonRadius + 6, 0, Math.PI * 2);
            ctx.stroke();
            
            // Progress ring che si consuma - gradiente arancione->rosso
            const progressGradient = ctx.createLinearGradient(
                this.buttonX, displayY - this.buttonRadius,
                this.buttonX, displayY + this.buttonRadius
            );
            progressGradient.addColorStop(0, '#FFD54F'); // Yellow
            progressGradient.addColorStop(0.5, '#FF9800'); // Orange
            progressGradient.addColorStop(1, '#FF5722'); // Red
            
            ctx.strokeStyle = progressGradient;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(
                this.buttonX, displayY,
                this.buttonRadius + 6,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * remainingProgress),
                false
            );
            ctx.stroke();
        }
        
        // Barra cooldown circolare ESTERNA - animata e brillante
        if (!isReady && !isActive) {
            const progress = player.getTurboCooldownProgress();
            
            // Anello esterno - background grigio scuro
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(this.buttonX, displayY, this.buttonRadius + 8, 0, Math.PI * 2);
            ctx.stroke();
            
            // Progress ring ESTERNO - gradiente arcobaleno animato
            const pulseWidth = 9 + Math.sin(this.pulseTime * 8) * 2; // Pulsazione
            
            // Gradiente rotante nel tempo
            const gradientAngle = this.pulseTime * 0.5;
            const gx1 = this.buttonX + Math.cos(gradientAngle) * this.buttonRadius;
            const gy1 = displayY + Math.sin(gradientAngle) * this.buttonRadius;
            const gx2 = this.buttonX - Math.cos(gradientAngle) * this.buttonRadius;
            const gy2 = displayY - Math.sin(gradientAngle) * this.buttonRadius;
            
            const progressGradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
            progressGradient.addColorStop(0, '#FF6B35'); // Orange vivace
            progressGradient.addColorStop(0.3, '#F7B731'); // Giallo
            progressGradient.addColorStop(0.6, '#5F27CD'); // Viola
            progressGradient.addColorStop(1, '#00D2FF'); // Ciano
            
            ctx.strokeStyle = progressGradient;
            ctx.lineWidth = pulseWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(
                this.buttonX, displayY,
                this.buttonRadius + 8,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * progress),
                false
            );
            ctx.stroke();
            
            // Glow esterno sulla progress bar
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = pulseWidth + 2;
            ctx.beginPath();
            ctx.arc(
                this.buttonX, displayY,
                this.buttonRadius + 8,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * progress),
                false
            );
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Pallino luminoso alla fine della progress bar (segnaposto)
            const endAngle = -Math.PI / 2 + (Math.PI * 2 * progress);
            const dotX = this.buttonX + Math.cos(endAngle) * (this.buttonRadius + 8);
            const dotY = displayY + Math.sin(endAngle) * (this.buttonRadius + 8);
            
            // Glow del pallino
            const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 12);
            dotGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            dotGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.6)');
            dotGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = dotGlow;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Pallino solido
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Bordo pallino
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Icon - Fulmine grande e simpatico
        if (isReady || isActive) {
            // Scala pulsante quando ready
            const iconScale = isReady ? 1 + Math.sin(this.pulseTime * 6) * 0.15 : 1;
            
            ctx.save();
            ctx.translate(this.buttonX, displayY);
            ctx.scale(iconScale, iconScale);
            ctx.translate(-this.buttonX, -displayY);
            
            // Ombra nera spessa (cartoon)
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 34px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', this.buttonX + 2, displayY + 2);
            
            // Fulmine principale bianco brillante
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 34px Arial';
            ctx.fillText('⚡', this.buttonX, displayY);
            
            ctx.restore();
            
            // Scintille saltellanti quando ready
            if (isReady) {
                for (let i = 0; i < 6; i++) {
                    const angle = this.pulseTime * 4 + (i * Math.PI / 3);
                    const dist = 28 + Math.sin(this.pulseTime * 5 + i) * 4;
                    const sx = this.buttonX + Math.cos(angle) * dist;
                    const sy = displayY + Math.sin(angle) * dist;
                    const size = 12 + Math.sin(this.pulseTime * 8 + i) * 4;
                    
                    // Ombra stella
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.font = `${size}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText('✨', sx + 1, sy + 1);
                    
                    // Stella colorata
                    const colors = ['#FFD700', '#FF6B35', '#4ECDC4', '#FF1744', '#76FF03'];
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.font = `${size}px Arial`;
                    ctx.fillText('✨', sx, sy);
                }
            }
        } else {
            // Cooldown - icona grigia
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', this.buttonX + 1, displayY + 1);
            
            ctx.fillStyle = '#B0BEC5';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('⚡', this.buttonX, displayY);
        }
        
        // Timer display - stile cartoon divertente
        if (isActive) {
            // Timer attivo - grande e colorato a destra
            const timerX = this.buttonX + this.buttonRadius + 10;
            
            // Background bubble (usando archi per compatibilità)
            const bubbleX = timerX;
            const bubbleY = displayY - 12;
            const bubbleW = 35;
            const bubbleH = 24;
            const bubbleR = 12;
            
            ctx.fillStyle = '#FFD54F';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(bubbleX + bubbleR, bubbleY);
            ctx.lineTo(bubbleX + bubbleW - bubbleR, bubbleY);
            ctx.arc(bubbleX + bubbleW - bubbleR, bubbleY + bubbleR, bubbleR, -Math.PI/2, 0);
            ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - bubbleR);
            ctx.arc(bubbleX + bubbleW - bubbleR, bubbleY + bubbleH - bubbleR, bubbleR, 0, Math.PI/2);
            ctx.lineTo(bubbleX + bubbleR, bubbleY + bubbleH);
            ctx.arc(bubbleX + bubbleR, bubbleY + bubbleH - bubbleR, bubbleR, Math.PI/2, Math.PI);
            ctx.lineTo(bubbleX, bubbleY + bubbleR);
            ctx.arc(bubbleX + bubbleR, bubbleY + bubbleR, bubbleR, Math.PI, 3*Math.PI/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Testo timer
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.ceil(player.turboTimeRemaining), timerX + 17, displayY);
        }
        
        // NESSUN timer countdown per cooldown - solo progress bar visuale
        
        ctx.restore();
    }
    
    checkClick(x, y, player) {
        const dx = x - this.buttonX;
        const dy = y - this.buttonY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.buttonRadius) {
            // Button clicked
            if (player.isTurboCooldownReady() && !player.isTurboActive) {
                return true; // Signal to activate turbo
            }
        }
        
        return false;
    }
    
    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.buttonX = canvasWidth - 60;
        this.buttonY = canvasHeight - 130;
    }
}
