/**
 * HUDRenderer - Renders pause button, score and level using the game's rendering framework
 * Similar style to PowerupUIRenderer, TurboButtonUI and FlightButtonUI
 */
export class HUDRenderer {
    constructor(renderer, textCtx, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.textCtx = textCtx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Pause button configuration
        this.pauseButtonRadius = 25;
        this.pauseButtonX = 35;
        this.pauseButtonY = 35;
        
        // Animation
        this.pulseTime = 0;
        this.pauseHover = false;
        this.pausePressed = false;
        
        // Score/Level display configuration - TUTTI allineati a sinistra
        this.scoreX = 110; // Dopo il bottone pause
        this.scoreY = 35;
        this.levelX = 240; // Dopo lo score
        this.levelY = 35;
        this.heartsStartX = 360; // Dopo il level, più vicino
        this.heartsY = 35;
        
        // Animation effects
        this.scoreGlow = 0;
        this.levelGlow = 0;
        this.scorePulse = 0;
        this.levelPulse = 0;
        
        // Last values for change detection
        this.lastScore = 0;
        this.lastLevel = 1;
    }
    
    update(deltaTime, score, level) {
        this.pulseTime += deltaTime;
        
        // Detect score change
        if (score !== this.lastScore) {
            this.scoreGlow = 1.0;
            this.scorePulse = 1.0;
            this.lastScore = score;
        }
        
        // Detect level change
        if (level !== this.lastLevel) {
            this.levelGlow = 1.0;
            this.levelPulse = 1.0;
            this.lastLevel = level;
        }
        
        // Decay glows
        this.scoreGlow = Math.max(0, this.scoreGlow - deltaTime * 1.5);
        this.levelGlow = Math.max(0, this.levelGlow - deltaTime * 1.5);
        this.scorePulse = Math.max(0, this.scorePulse - deltaTime * 2);
        this.levelPulse = Math.max(0, this.levelPulse - deltaTime * 2);
    }
    
    render(score, level, isPaused) {
        if (!this.textCtx) return;
        
        this.renderPauseButton(isPaused);
        this.renderScore(score);
        this.renderLevel(level);
    }
    
    renderPauseButton(isPaused) {
        const ctx = this.textCtx;
        ctx.save();
        
        const pulse = Math.sin(this.pulseTime * 3) * 0.5 + 0.5;
        const displayRadius = this.pauseButtonRadius + (this.pausePressed ? -2 : 0);
        
        // Outer glow when hovered
        if (this.pauseHover) {
            const glowSize = displayRadius * 1.4;
            const gradient = ctx.createRadialGradient(
                this.pauseButtonX, this.pauseButtonY, displayRadius * 0.5,
                this.pauseButtonX, this.pauseButtonY, glowSize
            );
            gradient.addColorStop(0, 'rgba(100, 150, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.pauseButtonX, this.pauseButtonY, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Button background with gradient
        const bgGradient = ctx.createRadialGradient(
            this.pauseButtonX - 8, this.pauseButtonY - 8, 0,
            this.pauseButtonX, this.pauseButtonY, displayRadius
        );
        if (isPaused) {
            // Green gradient for resume
            bgGradient.addColorStop(0, '#66BB6A');
            bgGradient.addColorStop(1, '#43A047');
        } else {
            // Blue-purple gradient for pause
            bgGradient.addColorStop(0, '#5C6BC0');
            bgGradient.addColorStop(1, '#3F51B5');
        }
        
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.arc(this.pauseButtonX, this.pauseButtonY, displayRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        const highlightGradient = ctx.createRadialGradient(
            this.pauseButtonX - 8, this.pauseButtonY - 8, 0,
            this.pauseButtonX - 3, this.pauseButtonY - 3, displayRadius * 0.6
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(this.pauseButtonX - 3, this.pauseButtonY - 5, displayRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.pauseButtonX, this.pauseButtonY, displayRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Icon - pause or play
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (isPaused) {
            // Play icon (triangle)
            ctx.fillText('▶', this.pauseButtonX + 2, this.pauseButtonY);
        } else {
            // Pause icon (two bars)
            ctx.fillText('⏸', this.pauseButtonX, this.pauseButtonY);
        }
        
        ctx.restore();
    }
    
    renderScore(score) {
        const ctx = this.textCtx;
        ctx.save();
        
        const pulse = this.scorePulse * 0.2;
        const scale = 1 + pulse;
        const baseY = this.scoreY;
        
        // Background pill/badge
        const text = score.toString();
        ctx.font = 'bold 24px Arial';
        const textWidth = ctx.measureText(text).width;
        const paddingX = 25;
        const paddingY = 12;
        const badgeWidth = textWidth + paddingX * 2;
        const badgeHeight = 30 + paddingY;
        const badgeX = this.scoreX - badgeWidth / 2;
        const badgeY = baseY - badgeHeight / 2;
        const borderRadius = badgeHeight / 2;
        
        // Apply scale transform
        ctx.translate(this.scoreX, baseY);
        ctx.scale(scale, scale);
        ctx.translate(-this.scoreX, -baseY);
        
        // Outer glow when score changes
        if (this.scoreGlow > 0) {
            const glowAlpha = this.scoreGlow * 0.4;
            const glowSize = 8 * this.scoreGlow;
            
            ctx.shadowColor = `rgba(255, 215, 0, ${glowAlpha})`;
            ctx.shadowBlur = glowSize;
            
            for (let i = 0; i < 3; i++) {
                this.drawRoundedRect(ctx, badgeX - i * 2, badgeY - i * 2, 
                    badgeWidth + i * 4, badgeHeight + i * 4, borderRadius + i * 2);
                ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha / (i + 1)})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        
        // Badge background with gradient
        const badgeGradient = ctx.createLinearGradient(
            badgeX, badgeY,
            badgeX, badgeY + badgeHeight
        );
        badgeGradient.addColorStop(0, '#FFD700');
        badgeGradient.addColorStop(0.5, '#FFC107');
        badgeGradient.addColorStop(1, '#FF9800');
        
        ctx.fillStyle = badgeGradient;
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
        ctx.fill();
        
        // Badge border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
        ctx.stroke();
        
        // Inner shadow for depth
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, badgeX + 2, badgeY + 2, badgeWidth - 4, badgeHeight - 4, borderRadius - 2);
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', badgeX + 12, baseY);
        
        // Score text with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, this.scoreX + 8, baseY);
        
        ctx.restore();
    }
    
    renderLevel(level) {
        const ctx = this.textCtx;
        ctx.save();
        
        const pulse = this.levelPulse * 0.2;
        const scale = 1 + pulse;
        const baseY = this.levelY;
        
        // Background badge
        const text = `LV ${level}`;
        ctx.font = 'bold 20px Arial';
        const textWidth = ctx.measureText(text).width;
        const paddingX = 20;
        const paddingY = 10;
        const badgeWidth = textWidth + paddingX * 2;
        const badgeHeight = 26 + paddingY;
        const badgeX = this.levelX - badgeWidth / 2;
        const badgeY = baseY - badgeHeight / 2;
        const borderRadius = badgeHeight / 2;
        
        // Apply scale transform
        ctx.translate(this.levelX, baseY);
        ctx.scale(scale, scale);
        ctx.translate(-this.levelX, -baseY);
        
        // Outer glow when level changes
        if (this.levelGlow > 0) {
            const glowAlpha = this.levelGlow * 0.5;
            const glowSize = 10 * this.levelGlow;
            
            ctx.shadowColor = `rgba(138, 43, 226, ${glowAlpha})`;
            ctx.shadowBlur = glowSize;
            
            for (let i = 0; i < 3; i++) {
                this.drawRoundedRect(ctx, badgeX - i * 2, badgeY - i * 2, 
                    badgeWidth + i * 4, badgeHeight + i * 4, borderRadius + i * 2);
                ctx.strokeStyle = `rgba(138, 43, 226, ${glowAlpha / (i + 1)})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        
        // Badge background with gradient
        const badgeGradient = ctx.createLinearGradient(
            badgeX, badgeY,
            badgeX, badgeY + badgeHeight
        );
        badgeGradient.addColorStop(0, '#9C27B0');
        badgeGradient.addColorStop(0.5, '#7B1FA2');
        badgeGradient.addColorStop(1, '#6A1B9A');
        
        ctx.fillStyle = badgeGradient;
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
        ctx.fill();
        
        // Badge border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
        ctx.stroke();
        
        // Inner shadow for depth
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, badgeX + 2, badgeY + 2, badgeWidth - 4, badgeHeight - 4, borderRadius - 2);
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏆', badgeX + 10, baseY);
        
        // Level text with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, this.levelX + 8, baseY);
        
        ctx.restore();
    }
    
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
        ctx.lineTo(x + radius, y + height);
        ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
        ctx.lineTo(x, y + radius);
        ctx.arc(x + radius, y + radius, radius, Math.PI, 3 * Math.PI / 2);
        ctx.closePath();
    }
    
    checkPauseClick(x, y) {
        const dx = x - this.pauseButtonX;
        const dy = y - this.pauseButtonY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.pauseButtonRadius;
    }
    
    setPauseHover(hover) {
        this.pauseHover = hover;
    }
    
    setPausePressed(pressed) {
        this.pausePressed = pressed;
    }
    
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // Posizioni fisse allineate a sinistra
        this.scoreX = 110;
        this.levelX = 240;
        this.heartsStartX = 360;
    }
    
    getHeartsPosition() {
        return {
            startX: this.heartsStartX,
            y: this.heartsY
        };
    }
}
