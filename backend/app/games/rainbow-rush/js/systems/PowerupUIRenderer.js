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
                name: 'IMMORTALE',
                icon: '🛡️'
            },
            flight: {
                color: [0.4, 0.7, 1.0, 1.0], // Light blue
                glowColor: [0.6, 0.85, 1.0, 0.8],
                bgColor: [0.1, 0.2, 0.3, 0.6],
                name: 'VOLO',
                icon: '🪶'
            },
            superJump: {
                color: [1.0, 0.3, 0.5, 1.0], // Pink
                glowColor: [1.0, 0.5, 0.7, 0.8],
                bgColor: [0.3, 0.1, 0.2, 0.6],
                name: 'SUPER SALTO',
                icon: '⚡'
            }
        };
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
    }
    
    render(powerupTimers) {
        if (!powerupTimers) return;
        
        // Renderizza i cuori SEMPRE (anche con popup)
        if (this.playerHealth !== undefined && this.playerMaxHealth !== undefined) {
            this.renderHearts(this.playerHealth, this.playerMaxHealth);
        }
        
        // Crea contesto 2D se non esiste
        if (!this.ctx2d && this.canvas) {
            // Crea un canvas 2D overlay temporaneo
            this.overlayCanvas = document.createElement('canvas');
            this.overlayCanvas.width = this.canvas.width;
            this.overlayCanvas.height = this.canvas.height;
            this.overlayCanvas.style.position = 'absolute';
            this.overlayCanvas.style.top = '0px';
            this.overlayCanvas.style.left = '0px';
            this.overlayCanvas.style.pointerEvents = 'none';
            this.overlayCanvas.style.zIndex = '10'; // Più basso del popup (che ha zIndex più alto)
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
            
            // Mostra SEMPRE tutti i powerup che sono stati raccolti almeno una volta
            // Questo permette di vedere la barra di durata e cooldown in ogni momento
            const isActive = timer.active;
            const isInCooldown = timer.cooldown > 0;
            const wasEverUsed = timer.everActivated;
            
            // Mostra se: attivo, in cooldown, oppure è stato mai usato
            if (!isActive && !isInCooldown && !wasEverUsed) {
                continue; // Skip - mai usato
            }
            
            const config = this.powerupConfig[type];
            const yPos = this.startY + (visibleIndex * this.barSpacing);
            
            this.renderPowerupBar(type, timer, config, yPos);
            visibleIndex++;
        }
    }
    
    setPlayerHealth(health, maxHealth) {
        this.playerHealth = health;
        this.playerMaxHealth = maxHealth;
    }
    
    renderHearts(health, maxHealth) {
        const isMobile = this.canvasWidth < 450;
        const isVerySmall = this.canvasWidth < 380;
        
        // Dimensioni e spaziatura responsive - coordinate con HUDRenderer
        let baseHeartSize, baseSpacing, startX, y;
        
        if (isVerySmall) {
            // Schermo molto piccolo
            baseHeartSize = 14;
            baseSpacing = 18;
            startX = 215;
            y = 28;
        } else if (isMobile) {
            // Mobile standard
            baseHeartSize = 16;
            baseSpacing = 22;
            startX = 250;
            y = 32;
        } else {
            // Desktop
            baseHeartSize = 20;
            baseSpacing = 28;
            startX = 330;
            y = 35;
        }
        
        // Calcola lo spazio disponibile e adatta dimensioni se necessario
        const availableWidth = this.canvasWidth - startX - 10;
        const requiredWidth = maxHealth * baseSpacing;
        
        // Scala verso il basso se ancora non entra
        let heartSize = baseHeartSize;
        let spacing = baseSpacing;
        
        if (requiredWidth > availableWidth) {
            const scale = Math.max(0.5, availableWidth / requiredWidth);
            heartSize = baseHeartSize * scale;
            spacing = baseSpacing * scale;
        }
        
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
        
        // Calculate progress separati per durata e cooldown
        const durationProgress = isActive ? (timer.duration / timer.maxDuration) : 0;
        const cooldownProgress = isOnCooldown ? (1.0 - (timer.cooldown / timer.maxCooldown)) : 1.0;
        
        // Animation effects
        const pulse = Math.sin(this.animationTime * 3) * 0.5 + 0.5;
        const shimmer = Math.sin(this.animationTime * 5 + yPos) * 0.5 + 0.5;
        
        // CERCHIO ICONA (a sinistra di tutto) - con icona del bonus dentro e progressbar CURVA
        const iconCircleX = x + this.iconSize / 2;
        const iconCircleY = yPos + this.iconSize / 2;
        const circleRadius = this.iconSize / 2;
        
        // Background cerchio icona
        const iconBgColor = isActive ? [...config.color] : (isOnCooldown ? [...config.bgColor] : [...config.color]);
        if (!isOnCooldown && !isActive) iconBgColor[3] = 0.9; // Ready
        this.renderer.drawCircle(iconCircleX, iconCircleY, circleRadius, iconBgColor);
        
        // Border cerchio icona
        const iconBorderColor = isActive ? [...config.color] :
                               (isOnCooldown ? [0.8, 0.4, 0.0, 0.9] : [0.0, 1.0, 0.0, 0.9]);
        this.drawCircleOutline(iconCircleX, iconCircleY, circleRadius, iconBorderColor, 2);
        
        // Icona dentro cerchio
        this.drawIconEmoji(iconCircleX, iconCircleY, config.icon, !isOnCooldown && !isActive, isOnCooldown);
        
        // PROGRESSBAR CURVA di cooldown sulla circonferenza del cerchio (SOLO se in cooldown)
        if (isOnCooldown && !isActive) {
            this.drawCooldownArc(iconCircleX, iconCircleY, circleRadius, cooldownProgress, [0.8, 0.4, 0.0, 0.9]);
        }
        
        // PROGRESSBAR CURVA di durata sulla circonferenza del cerchio (SOLO se attivo)
        if (isActive) {
            this.drawCooldownArc(iconCircleX, iconCircleY, circleRadius, durationProgress, [...config.color, 1.0]);
        }
        
        // Ready indicator sul cerchio quando pronto
        if (!isActive && !isOnCooldown) {
            const readyGlow = [0.0, 1.0, 0.0, 0.3 + pulse * 0.3];
            this.renderer.drawCircle(iconCircleX, iconCircleY, circleRadius + 4, readyGlow);
        }
        
        // BARRA DURATA ORIZZONTALE (a destra del cerchio) - SEMPRE VISIBILE
        const barX = x + this.iconSize + 10;
        const barY = yPos + (this.iconSize - this.barHeight) / 2;
        
        // Altezza barra più grande per maggiore visibilità
        const enhancedBarHeight = this.barHeight + 4;
        const barYAdjusted = barY - 2;
        
        // Bar background with border
        const barBgColor = [0.1, 0.1, 0.1, 0.7];
        this.renderer.drawRect(barX, barYAdjusted, this.barWidth, enhancedBarHeight, barBgColor);
        
        // Border around bar
        this.drawRectOutline(barX, barYAdjusted, this.barWidth, enhancedBarHeight, [0.3, 0.3, 0.3, 0.8], 2);
        
        // Progress fill - durata quando attivo, cooldown quando in ricarica
        let fillWidth = 0;
        let fillColor = [...config.color];
        
        if (isActive) {
            // Barra di DURATA - si svuota da piena a vuota
            fillWidth = this.barWidth * durationProgress;
            fillColor[3] = 0.9 + pulse * 0.1;
            
            // Main fill
            this.renderer.drawRect(barX + 2, barYAdjusted + 2, fillWidth - 4, enhancedBarHeight - 4, fillColor);
            
            // Shimmer effect on top
            const shimmerWidth = 30;
            const shimmerX = barX + (shimmer * (fillWidth - shimmerWidth));
            const shimmerColor = [1.0, 1.0, 1.0, 0.4 * pulse];
            
            if (shimmerX + shimmerWidth <= barX + fillWidth && fillWidth > shimmerWidth) {
                this.renderer.drawRect(
                    shimmerX,
                    barYAdjusted + 2,
                    shimmerWidth,
                    enhancedBarHeight - 4,
                    shimmerColor
                );
            }
            
            // Glow effect on bar when active
            const topGlowColor = [...config.glowColor];
            topGlowColor[3] = 0.6;
            this.renderer.drawRect(barX + 2, barYAdjusted, fillWidth - 4, 3, topGlowColor);
            
            // Timer digitale sulla barra
            const secondsLeft = Math.ceil(timer.duration / 1000);
            const timeText = `${secondsLeft}s`;
            this.drawTimeText(barX + this.barWidth / 2, barYAdjusted + enhancedBarHeight / 2, timeText, [1.0, 1.0, 1.0, 1.0]);
            
        } else if (isOnCooldown) {
            // Barra di COOLDOWN - si riempie da vuota a piena
            fillWidth = this.barWidth * cooldownProgress;
            const cooldownColor = [0.8, 0.4, 0.0, 0.7];
            
            // Main fill
            this.renderer.drawRect(barX + 2, barYAdjusted + 2, fillWidth - 4, enhancedBarHeight - 4, cooldownColor);
            
            // Animated stripe pattern
            const stripeWidth = 10;
            const stripeOffset = (this.animationTime * 30) % (stripeWidth * 2);
            for (let i = 0; i < fillWidth; i += stripeWidth * 2) {
                const stripeX = barX + 2 + i - stripeOffset;
                const actualStripeWidth = Math.min(stripeWidth, fillWidth - (stripeX - barX - 2));
                if (actualStripeWidth > 0 && stripeX >= barX + 2) {
                    this.renderer.drawRect(stripeX, barYAdjusted + 2, actualStripeWidth, enhancedBarHeight - 4, [0.9, 0.5, 0.1, 0.4]);
                }
            }
            
            // Timer digitale sulla barra
            const secondsLeft = Math.ceil(timer.cooldown / 1000);
            const timeText = `${secondsLeft}s`;
            this.drawTimeText(barX + this.barWidth / 2, barYAdjusted + enhancedBarHeight / 2, timeText, [0.9, 0.6, 0.2, 1.0]);
            
        } else {
            // PRONTO - barra piena con colore verde
            fillWidth = this.barWidth;
            const readyColor = [0.0, 1.0, 0.0, 0.5 + pulse * 0.3];
            this.renderer.drawRect(barX + 2, barYAdjusted + 2, fillWidth - 4, enhancedBarHeight - 4, readyColor);
            
            // Pulsing sparkle
            const sparkleColor = [1.0, 1.0, 1.0, 0.8 * pulse];
            this.renderer.drawCircle(barX + this.barWidth / 2, barYAdjusted + enhancedBarHeight / 2, 4, sparkleColor);
            
            // Testo "PRONTO"
            this.drawTimeText(barX + this.barWidth / 2, barYAdjusted + enhancedBarHeight / 2, "PRONTO", [1.0, 1.0, 1.0, 1.0]);
        }
        
        // Nome del powerup - grande e visibile accanto alla barra
        const statusText = isActive ? "ATTIVO" : (isOnCooldown ? "RICARICA" : "PRONTO");
        this.drawPowerupName(barX + this.barWidth + 10, yPos + 5, config.name, config.color, isActive);
        this.drawPowerupStatus(barX + this.barWidth + 10, yPos + 20, statusText, isActive, isOnCooldown);
    }
    
    drawCircleOutline(x, y, radius, color, thickness) {
        // Outer circle
        this.renderer.drawCircle(x, y, radius + thickness / 2, color);
        // Inner circle (black to create outline effect)
        const innerColor = [0.0, 0.0, 0.0, 0.0];
        this.renderer.drawCircle(x, y, radius - thickness / 2, innerColor);
    }
    
    drawIconEmoji(x, y, emoji, isActive, isCharging) {
        if (!this.ctx2d || !emoji) return;
        
        const alpha = isActive ? 1.0 : (isCharging ? 0.5 : 0.8);
        
        this.ctx2d.save();
        this.ctx2d.font = '20px Arial';
        this.ctx2d.textAlign = 'center';
        this.ctx2d.textBaseline = 'middle';
        this.ctx2d.globalAlpha = alpha;
        this.ctx2d.fillText(emoji, x, y);
        this.ctx2d.restore();
    }
    
    drawCooldownArc(x, y, radius, progress, color) {
        if (!this.ctx2d) {

            return;
        }
        
        
        // Convert color array to CSS rgba
        const r = Math.floor(color[0] * 255);
        const g = Math.floor(color[1] * 255);
        const b = Math.floor(color[2] * 255);
        const a = color[3] || 1.0;
        
        this.ctx2d.save();
        
        // Draw background arc (grigio scuro)
        this.ctx2d.strokeStyle = 'rgba(50, 50, 50, 0.8)';
        this.ctx2d.lineWidth = 5;
        this.ctx2d.beginPath();
        this.ctx2d.arc(x, y, radius + 3, 0, 2 * Math.PI);
        this.ctx2d.stroke();
        
        // Draw progress arc (colorato)
        this.ctx2d.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        this.ctx2d.lineWidth = 5;
        this.ctx2d.lineCap = 'round';
        this.ctx2d.beginPath();
        // Arc from top (-90deg) clockwise based on progress
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (2 * Math.PI * progress);
        this.ctx2d.arc(x, y, radius + 3, startAngle, endAngle);
        this.ctx2d.stroke();
        
        this.ctx2d.restore();
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
    
    drawTimeText(x, y, text, color) {
        if (!this.ctx2d) return;
        
        const r = Math.floor(color[0] * 255);
        const g = Math.floor(color[1] * 255);
        const b = Math.floor(color[2] * 255);
        const alpha = color[3] || 1.0;
        
        this.ctx2d.save();
        this.ctx2d.font = 'bold 11px Arial';
        this.ctx2d.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        this.ctx2d.textAlign = 'center';
        this.ctx2d.textBaseline = 'middle';
        this.ctx2d.fillText(text, x, y);
        this.ctx2d.restore();
    }
    
    drawPowerupStatus(x, y, text, isActive, isOnCooldown) {
        if (!this.ctx2d) return;
        
        let color;
        if (isActive) {
            color = 'rgba(100, 255, 100, 0.9)';
        } else if (isOnCooldown) {
            color = 'rgba(255, 150, 50, 0.9)';
        } else {
            color = 'rgba(150, 255, 150, 0.9)';
        }
        
        this.ctx2d.save();
        this.ctx2d.font = 'bold 10px Arial';
        this.ctx2d.fillStyle = color;
        this.ctx2d.textAlign = 'left';
        this.ctx2d.textBaseline = 'top';
        this.ctx2d.fillText(text, x, y);
        this.ctx2d.restore();
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
