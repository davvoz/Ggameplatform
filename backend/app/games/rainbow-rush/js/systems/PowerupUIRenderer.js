/**
 * PowerupUIRenderer - Renders animated powerup bars directly in the game canvas
 * Shows active powerups and cooldowns with slick animations
 */

export class PowerupUIRenderer {
    constructor(renderer, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.animationTime = 0;
        
        // Ottieni il canvas dal renderer WebGL per scrivere testo
        this.canvas = renderer.gl.canvas;
        this.ctx2d = null;
        
        // Powerup bar configuration
        this.barWidth = 200;
        this.barHeight = 10;
        this.barSpacing = 50;
        this.iconSize = 30;
        this.startY = 80;
        this.padding = 15;
        
        // Colors for each powerup type
        this.powerupConfig = {
            immortality: {
                color: [1.0, 0.84, 0.0, 1.0], // Gold
                glowColor: [1.0, 0.95, 0.6, 0.8],
                bgColor: [0.3, 0.25, 0.1, 0.6],
                name: '⭐ IMMORTALE'
            },
            flight: {
                color: [0.4, 0.7, 1.0, 1.0], // Light blue
                glowColor: [0.6, 0.85, 1.0, 0.8],
                bgColor: [0.1, 0.2, 0.3, 0.6],
                name: '🪶 VOLO'
            },
            superJump: {
                color: [1.0, 0.3, 0.5, 1.0], // Pink
                glowColor: [1.0, 0.5, 0.7, 0.8],
                bgColor: [0.3, 0.1, 0.2, 0.6],
                name: '⚡ SUPER SALTO'
            }
        };
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
    }
    
    render(powerupTimers) {
        if (!powerupTimers) return;
        
        // Crea contesto 2D se non esiste
        if (!this.ctx2d && this.canvas) {
            // Crea un canvas 2D overlay temporaneo
            this.overlayCanvas = document.createElement('canvas');
            this.overlayCanvas.width = this.canvas.width;
            this.overlayCanvas.height = this.canvas.height;
            this.overlayCanvas.style.position = 'absolute';
            this.overlayCanvas.style.top = this.canvas.offsetTop + 'px';
            this.overlayCanvas.style.left = this.canvas.offsetLeft + 'px';
            this.overlayCanvas.style.pointerEvents = 'none';
            this.canvas.parentElement.appendChild(this.overlayCanvas);
            this.ctx2d = this.overlayCanvas.getContext('2d');
        }
        
        // Pulisci il canvas overlay
        if (this.ctx2d) {
            this.ctx2d.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
        
        let visibleIndex = 0;
        const powerupTypes = ['immortality', 'flight', 'superJump'];
        
        for (const type of powerupTypes) {
            const timer = powerupTimers[type];
            if (!timer) continue;
            
            // Show only if active or on cooldown
            const isActive = timer.active;
            const isOnCooldown = timer.cooldown > 0;
            
            if (!isActive && !isOnCooldown) {
                continue; // Skip if ready but not used
            }
            
            const config = this.powerupConfig[type];
            const yPos = this.startY + (visibleIndex * this.barSpacing);
            
            this.renderPowerupBar(type, timer, config, yPos);
            visibleIndex++;
        }
        
        // Renderizza cuori del player (passati dall'esterno)
        if (this.playerHealth !== undefined && this.playerMaxHealth !== undefined) {
            this.renderHearts(this.playerHealth, this.playerMaxHealth);
        }
    }
    
    setPlayerHealth(health, maxHealth) {
        this.playerHealth = health;
        this.playerMaxHealth = maxHealth;
    }
    
    renderHearts(health, maxHealth) {
        const heartSize = 20;
        const spacing = 28;
        const startX = this.canvasWidth - (maxHealth * spacing + 20);
        const y = 35;  // Allineato con l'header HUD singola riga
        
        for (let i = 0; i < maxHealth; i++) {
            const x = startX + i * spacing;
            const filled = i < health;
            
            if (filled) {
                // Cuore pieno - rosso brillante
                const color = [1.0, 0.1, 0.3, 1.0];
                
                // Glow più evidente
                const glowColor = [...color];
                glowColor[3] = 0.4;
                this.renderer.drawCircle(x + heartSize/2, y, heartSize, glowColor);
                
                // Cuore (2 cerchi + corpo)
                const lobeRadius = heartSize * 0.35;
                const lobeY = y - heartSize * 0.1;
                this.renderer.drawCircle(x + heartSize * 0.3, lobeY, lobeRadius, color);
                this.renderer.drawCircle(x + heartSize * 0.7, lobeY, lobeRadius, color);
                
                // Corpo del cuore
                this.renderer.drawRect(x + heartSize * 0.15, y, heartSize * 0.7, heartSize * 0.5, color);
                
                // Punta del cuore (3 rettangoli scalati)
                for (let step = 0; step < 3; step++) {
                    const stepWidth = heartSize * 0.7 * (1 - (step + 1) / 3);
                    const stepY = y + heartSize * 0.5 + step * (heartSize * 0.15);
                    this.renderer.drawRect(
                        x + heartSize * 0.5 - stepWidth / 2,
                        stepY,
                        stepWidth,
                        heartSize * 0.15,
                        color
                    );
                }
            } else {
                // Cuore vuoto - grigio
                const emptyColor = [0.3, 0.3, 0.3, 0.5];
                const lobeRadius = heartSize * 0.35;
                const lobeY = y - heartSize * 0.1;
                this.renderer.drawCircle(x + heartSize * 0.3, lobeY, lobeRadius, emptyColor);
                this.renderer.drawCircle(x + heartSize * 0.7, lobeY, lobeRadius, emptyColor);
                this.renderer.drawRect(x + heartSize * 0.15, y, heartSize * 0.7, heartSize * 0.5, emptyColor);
                
                for (let step = 0; step < 3; step++) {
                    const stepWidth = heartSize * 0.7 * (1 - (step + 1) / 3);
                    const stepY = y + heartSize * 0.5 + step * (heartSize * 0.15);
                    this.renderer.drawRect(
                        x + heartSize * 0.5 - stepWidth / 2,
                        stepY,
                        stepWidth,
                        heartSize * 0.15,
                        emptyColor
                    );
                }
            }
        }
    }
    
    renderPowerupBar(type, timer, config, yPos) {
        const x = this.padding;
        const isActive = timer.active;
        const isOnCooldown = timer.cooldown > 0;
        
        // Calculate progress
        let progress = 0;
        let isCharging = false;
        
        if (isActive) {
            progress = timer.duration / timer.maxDuration;
            isCharging = false;
        } else if (isOnCooldown) {
            progress = 1.0 - (timer.cooldown / timer.maxCooldown);
            isCharging = true;
        } else {
            progress = 1.0; // Ready
            isCharging = false;
        }
        
        // Animation effects
        const pulse = Math.sin(this.animationTime * 3) * 0.5 + 0.5;
        const shimmer = Math.sin(this.animationTime * 5 + yPos) * 0.5 + 0.5;
        
        // Icon background circle
        const iconX = x + this.iconSize / 2;
        const iconY = yPos + this.iconSize / 2;
        
        // Outer glow when active
        if (isActive) {
            const glowSize = this.iconSize * (0.7 + pulse * 0.3);
            const glowColor = [...config.glowColor];
            glowColor[3] = 0.4 * pulse;
            this.renderer.drawCircle(iconX, iconY, glowSize, glowColor);
        }
        
        // Icon background
        const iconBgColor = isActive ? config.color : 
                           isCharging ? [...config.bgColor] : config.bgColor;
        if (isActive) {
            iconBgColor[3] = 0.9;
        }
        this.renderer.drawCircle(iconX, iconY, this.iconSize / 2, iconBgColor);
        
        // Icon border
        const borderColor = isActive ? [1.0, 1.0, 1.0, 0.9] : 
                           !isOnCooldown ? config.color : [0.5, 0.5, 0.5, 0.6];
        this.drawCircleOutline(iconX, iconY, this.iconSize / 2, borderColor, 2);
        
        // Progress bar background
        const barX = x + this.iconSize + 10;
        const barY = yPos + (this.iconSize - this.barHeight) / 2;
        
        // Bar background with border
        const barBgColor = [0.1, 0.1, 0.1, 0.7];
        this.renderer.drawRect(barX, barY, this.barWidth, this.barHeight, barBgColor);
        
        // Border around bar
        this.drawRectOutline(barX, barY, this.barWidth, this.barHeight, [0.3, 0.3, 0.3, 0.8], 1);
        
        // Progress fill
        const fillWidth = this.barWidth * progress;
        
        if (fillWidth > 0) {
            let fillColor;
            
            if (isActive) {
                // Active: bright color with pulse
                fillColor = [...config.color];
                fillColor[3] = 0.9 + pulse * 0.1;
            } else if (isCharging) {
                // Charging: dim color
                fillColor = [...config.color];
                fillColor[3] = 0.5 + shimmer * 0.2;
            } else {
                // Ready: full bright
                fillColor = [...config.color];
                fillColor[3] = 1.0;
            }
            
            // Main fill
            this.renderer.drawRect(barX + 1, barY + 1, fillWidth - 2, this.barHeight - 2, fillColor);
            
            // Shimmer effect on top
            if (isActive || progress >= 1.0) {
                const shimmerWidth = 20;
                const shimmerX = barX + (shimmer * (fillWidth - shimmerWidth));
                const shimmerColor = [1.0, 1.0, 1.0, 0.3 * pulse];
                
                if (shimmerX + shimmerWidth <= barX + fillWidth) {
                    this.renderer.drawRect(
                        shimmerX,
                        barY + 1,
                        shimmerWidth,
                        this.barHeight - 2,
                        shimmerColor
                    );
                }
            }
            
            // Glow effect on bar when active
            if (isActive) {
                const topGlowColor = [...config.glowColor];
                topGlowColor[3] = 0.5;
                this.renderer.drawRect(barX + 1, barY, fillWidth - 2, 2, topGlowColor);
            }
        }
        
        // Ready indicator
        if (!isActive && !isOnCooldown) {
            // Pulsing ready glow
            const readyGlow = [...config.color];
            readyGlow[3] = 0.3 + pulse * 0.3;
            this.renderer.drawRect(barX - 2, barY - 2, this.barWidth + 4, this.barHeight + 4, readyGlow);
            
            // "READY" sparkle
            const sparkleColor = [1.0, 1.0, 1.0, 0.8 * pulse];
            this.renderer.drawCircle(barX + this.barWidth + 8, yPos + this.iconSize / 2, 3, sparkleColor);
        }
        
        // Cooldown overlay when charging
        if (isCharging) {
            const cooldownOverlay = [0.0, 0.0, 0.0, 0.3];
            const overlayWidth = this.barWidth * (1.0 - progress);
            this.renderer.drawRect(
                barX + fillWidth,
                barY,
                overlayWidth,
                this.barHeight,
                cooldownOverlay
            );
        }
        
        // Time remaining text (draw using small rectangles to form numbers)
        if (isActive) {
            const secondsLeft = Math.ceil(timer.duration / 1000);
            this.drawTimeDigit(barX + this.barWidth + 8, yPos + 8, secondsLeft, config.color);
        }
        
        // Nome del powerup - grande e visibile accanto alla barra
        this.drawPowerupName(barX + this.barWidth + 25, yPos + 5, config.name, config.color, isActive);
    }
    
    drawCircleOutline(x, y, radius, color, thickness) {
        // Outer circle
        this.renderer.drawCircle(x, y, radius + thickness / 2, color);
        // Inner circle (black to create outline effect)
        const innerColor = [0.0, 0.0, 0.0, 0.0];
        this.renderer.drawCircle(x, y, radius - thickness / 2, innerColor);
    }
    
    drawRectOutline(x, y, width, height, color, thickness) {
        // Top
        this.renderer.drawRect(x, y, width, thickness, color);
        // Bottom
        this.renderer.drawRect(x, y + height - thickness, width, thickness, color);
        // Left
        this.renderer.drawRect(x, y, thickness, height, color);
        // Right
        this.renderer.drawRect(x + width - thickness, y, thickness, height, color);
    }
    
    drawTimeDigit(x, y, number, color) {
        // Simple digit display using rectangles
        const digitWidth = 3;
        const digitHeight = 5;
        const digitColor = [...color];
        digitColor[3] = 0.9;
        
        // Draw a small filled rectangle as digit representation
        const digitStr = number.toString();
        for (let i = 0; i < digitStr.length; i++) {
            const dx = x + (i * 8);
            // Simple representation - just show rectangles for each digit
            this.renderer.drawRect(dx, y, digitWidth, digitHeight, digitColor);
            
            // Add a dot for each unit
            const digit = parseInt(digitStr[i]);
            for (let d = 0; d < Math.min(digit, 3); d++) {
                this.renderer.drawCircle(dx + 1, y + d * 2, 0.5, digitColor);
            }
        }
    }
    
    drawPowerupName(x, y, text, color, isActive) {
        if (!this.ctx2d) return;
        
        // Converti colore da array RGB a stringa CSS
        const r = Math.floor(color[0] * 255);
        const g = Math.floor(color[1] * 255);
        const b = Math.floor(color[2] * 255);
        const alpha = isActive ? 1.0 : 0.7;
        
        this.ctx2d.save();
        this.ctx2d.font = 'bold 14px Arial';
        this.ctx2d.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        this.ctx2d.fillText(text, x, y + 16);
        this.ctx2d.restore();
    }
    
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
