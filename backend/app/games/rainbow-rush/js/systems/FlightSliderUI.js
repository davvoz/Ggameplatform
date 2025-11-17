/**
 * FlightSliderUI - Slider verticale per controllo volo orizzontale
 */
export class FlightSliderUI {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Slider properties
        this.sliderX = 60; // Sinistra, 60px dal bordo
        this.sliderY = canvasHeight / 2; // Centro verticale
        this.sliderWidth = 50;
        this.sliderHeight = 200;
        this.sliderTrackWidth = 8;
        
        // Handle (cursore slider)
        this.handleY = 0; // Posizione relativa (-1 a 1, 0 = centro)
        this.handleRadius = 20;
        this.isDragging = false;
        
        // Animation
        this.pulseTime = 0;
        this.glowIntensity = 0;
        
        // Flight state tracking
        this.wasActive = false;
    }
    
    update(deltaTime, player) {
        this.pulseTime += deltaTime;
        
        // Glow when ready
        if (player.isFlightCooldownReady() && !player.isFlightActive) {
            this.glowIntensity = Math.min(1.0, this.glowIntensity + deltaTime * 2);
        } else {
            this.glowIntensity = Math.max(0.0, this.glowIntensity - deltaTime * 3);
        }
        
        // Reset handle quando volo non attivo
        if (!player.isFlightActive && !this.isDragging) {
            // Torna al centro dolcemente
            this.handleY *= 0.9;
            if (Math.abs(this.handleY) < 0.01) this.handleY = 0;
        }
    }
    
    render(gl, renderer, player) {
        const ctx = renderer.textCtx;
        if (!ctx) return;
        
        ctx.save();
        
        const isReady = player.isFlightCooldownReady() && !player.isFlightActive;
        const isActive = player.isFlightActive;
        
        // Calcola posizioni
        const trackLeft = this.sliderX - this.sliderTrackWidth / 2;
        const trackTop = this.sliderY - this.sliderHeight / 2;
        const handlePixelY = this.sliderY + (this.handleY * this.sliderHeight / 2);
        
        // Outer glow quando ready
        if (isReady && this.glowIntensity > 0) {
            const pulse = Math.sin(this.pulseTime * 5) * 0.4 + 0.6;
            const glowGradient = ctx.createRadialGradient(
                this.sliderX, this.sliderY, 0,
                this.sliderX, this.sliderY, 80 * pulse
            );
            glowGradient.addColorStop(0, `rgba(100, 200, 255, ${0.3 * this.glowIntensity})`);
            glowGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            ctx.fillStyle = glowGradient;
            ctx.fillRect(
                this.sliderX - 80, trackTop - 20,
                160, this.sliderHeight + 40
            );
        }
        
        // Track background - sfondo scuro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(trackLeft, trackTop, this.sliderTrackWidth, this.sliderHeight, 4);
        ctx.fill();
        
        // Progress bar durante volo attivo - si consuma
        if (isActive) {
            const remainingProgress = player.flightTimeRemaining / (player.flightBaseDuration + Math.floor(player.flightTimeRemaining));
            const progressHeight = this.sliderHeight * remainingProgress;
            
            // Gradiente celeste->blu
            const progressGradient = ctx.createLinearGradient(
                trackLeft, trackTop,
                trackLeft, trackTop + this.sliderHeight
            );
            progressGradient.addColorStop(0, '#64B5F6'); // Light blue
            progressGradient.addColorStop(0.5, '#42A5F5'); // Blue
            progressGradient.addColorStop(1, '#2196F3'); // Dark blue
            
            ctx.fillStyle = progressGradient;
            ctx.beginPath();
            ctx.roundRect(
                trackLeft, 
                trackTop + this.sliderHeight - progressHeight,
                this.sliderTrackWidth, 
                progressHeight, 
                4
            );
            ctx.fill();
        }
        
        // Progress bar cooldown - anello esterno animato
        if (!isReady && !isActive) {
            const progress = player.getFlightCooldownProgress();
            const pulseWidth = 6 + Math.sin(this.pulseTime * 8) * 1.5;
            
            // Background semi-trasparente
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.roundRect(
                trackLeft - 6, trackTop - 6,
                this.sliderTrackWidth + 12, this.sliderHeight + 12,
                8
            );
            ctx.stroke();
            
            // Progress gradient animato
            const progressGradient = ctx.createLinearGradient(
                trackLeft, trackTop,
                trackLeft, trackTop + this.sliderHeight
            );
            progressGradient.addColorStop(0, '#00BCD4'); // Cyan
            progressGradient.addColorStop(0.5, '#00ACC1'); // Cyan dark
            progressGradient.addColorStop(1, '#0097A7'); // Cyan darker
            
            ctx.strokeStyle = progressGradient;
            ctx.lineWidth = pulseWidth;
            ctx.lineCap = 'round';
            
            // Disegna progress dal basso verso l'alto
            const progressHeight = this.sliderHeight * progress;
            ctx.beginPath();
            ctx.moveTo(trackLeft, trackTop + this.sliderHeight);
            ctx.lineTo(trackLeft, trackTop + this.sliderHeight - progressHeight);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(trackLeft + this.sliderTrackWidth, trackTop + this.sliderHeight);
            ctx.lineTo(trackLeft + this.sliderTrackWidth, trackTop + this.sliderHeight - progressHeight);
            ctx.stroke();
            
            // Glow
            ctx.shadowColor = '#00E5FF';
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Indicatori direzione (frecce)
        if (isActive || isReady) {
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Freccia SU
            ctx.fillStyle = isActive && this.handleY < -0.1 ? '#FFD700' : 'rgba(255, 255, 255, 0.5)';
            ctx.fillText('▲', this.sliderX, trackTop - 20);
            
            // Freccia GIÙ
            ctx.fillStyle = isActive && this.handleY > 0.1 ? '#FFD700' : 'rgba(255, 255, 255, 0.5)';
            ctx.fillText('▼', this.sliderX, trackTop + this.sliderHeight + 20);
        }
        
        // Handle (cursore) - solo se pronto o attivo
        if (isReady || isActive) {
            // Ombra handle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(
                this.sliderX + 3, handlePixelY + 5,
                this.handleRadius * 0.9, this.handleRadius * 0.4,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Handle principale
            ctx.beginPath();
            ctx.arc(this.sliderX, handlePixelY, this.handleRadius, 0, Math.PI * 2);
            
            if (isActive) {
                // Active - blu pulsante
                const activePulse = Math.sin(this.pulseTime * 10) * 0.3 + 0.7;
                const activeGradient = ctx.createRadialGradient(
                    this.sliderX - 8, handlePixelY - 8, 0,
                    this.sliderX, handlePixelY, this.handleRadius
                );
                activeGradient.addColorStop(0, '#E3F2FD'); // Blue super light
                activeGradient.addColorStop(0.3, '#90CAF9'); // Blue light
                activeGradient.addColorStop(0.6, '#42A5F5'); // Blue
                activeGradient.addColorStop(1, '#1976D2'); // Blue dark
                ctx.fillStyle = activeGradient;
            } else {
                // Ready - celeste brillante
                const readyGradient = ctx.createRadialGradient(
                    this.sliderX - 8, handlePixelY - 8, 0,
                    this.sliderX, handlePixelY, this.handleRadius
                );
                readyGradient.addColorStop(0, '#B3E5FC'); // Cyan light
                readyGradient.addColorStop(0.5, '#4FC3F7'); // Cyan
                readyGradient.addColorStop(1, '#0288D1'); // Cyan dark
                ctx.fillStyle = readyGradient;
            }
            
            ctx.fill();
            
            // Highlight
            const highlightGradient = ctx.createRadialGradient(
                this.sliderX - 6, handlePixelY - 6, 0,
                this.sliderX - 3, handlePixelY - 3, this.handleRadius * 0.6
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = highlightGradient;
            ctx.beginPath();
            ctx.arc(this.sliderX - 3, handlePixelY - 4, this.handleRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Icona ali nel cursore
            if (isActive) {
                const wingScale = 1 + Math.sin(this.pulseTime * 15) * 0.15;
                
                ctx.save();
                ctx.translate(this.sliderX, handlePixelY);
                ctx.scale(wingScale, wingScale);
                ctx.translate(-this.sliderX, -handlePixelY);
                
                // Ombra icona
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🕊️', this.sliderX + 1, handlePixelY + 1);
                
                // Icona principale
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText('🕊️', this.sliderX, handlePixelY);
                
                ctx.restore();
            } else {
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🕊️', this.sliderX + 1, handlePixelY + 1);
                
                ctx.fillStyle = '#64B5F6';
                ctx.fillText('🕊️', this.sliderX, handlePixelY);
            }
        }
        
        // Timer display durante volo attivo
        if (isActive) {
            const timerX = this.sliderX + 50;
            
            // Background bubble
            ctx.fillStyle = '#42A5F5';
            ctx.strokeStyle = '#1976D2';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(timerX, handlePixelY - 12, 35, 24, 12);
            ctx.fill();
            ctx.stroke();
            
            // Testo timer
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.ceil(player.flightTimeRemaining), timerX + 17, handlePixelY);
        }
        
        ctx.restore();
    }
    
    // Gestisce inizio drag
    startDrag(x, y, player) {
        const trackTop = this.sliderY - this.sliderHeight / 2;
        const trackBottom = this.sliderY + this.sliderHeight / 2;
        const handlePixelY = this.sliderY + (this.handleY * this.sliderHeight / 2);
        
        // Check se click dentro l'area dello slider
        const inSliderArea = x >= this.sliderX - this.sliderWidth / 2 &&
                            x <= this.sliderX + this.sliderWidth / 2 &&
                            y >= trackTop - 30 &&
                            y <= trackBottom + 30;
        
        if (inSliderArea && (player.isFlightCooldownReady() || player.isFlightActive)) {
            this.isDragging = true;
            this.updateHandlePosition(y, player);
            return true;
        }
        
        return false;
    }
    
    // Gestisce drag movimento
    updateDrag(y, player) {
        if (this.isDragging) {
            return this.updateHandlePosition(y, player);
        }
        return false;
    }
    
    // Gestisce fine drag
    endDrag(player) {
        this.isDragging = false;
    }
    
    // Aggiorna posizione handle e attiva volo
    updateHandlePosition(mouseY, player) {
        const trackTop = this.sliderY - this.sliderHeight / 2;
        const trackBottom = this.sliderY + this.sliderHeight / 2;
        
        // Clamp Y dentro i limiti dello slider
        const clampedY = Math.max(trackTop, Math.min(trackBottom, mouseY));
        
        // Converti in valore normalizzato (-1 a 1, dove -1 = su, 1 = giù)
        this.handleY = ((clampedY - this.sliderY) / (this.sliderHeight / 2));
        
        // Attiva volo se non già attivo
        let flightJustActivated = false;
        if (!player.isFlightActive && player.isFlightCooldownReady()) {
            flightJustActivated = player.activateFlight();
        }
        
        // Aggiorna direzione volo
        if (player.isFlightActive) {
            player.flightDirection = -this.handleY; // Inverti perché -1 = su
        }
        
        return flightJustActivated;
    }
    
    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.sliderY = canvasHeight / 2;
    }
}
