/**
 * LevelSummaryScreen - Schermata riepilogativa al completamento di un livello
 * Mostra statistiche, stelle guadagnate e opzioni per proseguire
 */

export class LevelSummaryScreen {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.visible = false;
        this.summary = null;
        
        // Animazioni
        this.animationProgress = 0;
        this.animationDuration = 1.0;
        this.starAnimationDelay = 0.3;
        this.starAnimations = [0, 0, 0]; // Progress per ogni stella
        
        // Particelle celebrative
        this.confettiParticles = [];
        this.sparkleParticles = [];
        
        // Pulsanti
        this.buttons = {
            nextLevel: null,
            retry: null,
            menu: null
        };
        
        this.selectedButton = null;
    }
    
    /**
     * Mostra la schermata con il riepilogo del livello
     */
    show(summary) {
        this.summary = summary;
        this.visible = true;
        this.animationProgress = 0;
        this.starAnimations = [0, 0, 0];
        this.confettiParticles = [];
        this.sparkleParticles = [];
        
        // Crea pulsanti
        this.createButtons();
        
        // Genera confetti se 3 stelle
        if (summary.stars === 3) {
            this.generateConfetti();
        }
        
        // Abilita pointer-events sul textCanvas per catturare i click
        const textCanvas = document.getElementById('textCanvas');
        if (textCanvas) {
            textCanvas.style.pointerEvents = 'auto';
        }
        
        console.log('🎊 Level Summary shown:', summary);
    }
    
    /**
     * Nascondi schermata
     */
    hide() {
        this.visible = false;
        this.summary = null;
        
        // Disabilita pointer-events sul textCanvas per permettere click sul game
        const textCanvas = document.getElementById('textCanvas');
        if (textCanvas) {
            textCanvas.style.pointerEvents = 'none';
        }
    }
    
    /**
     * Crea pulsanti interattivi
     */
    createButtons() {
        // Initialize button structure with labels and colors only
        // Positions will be calculated in updateButtonPositions()
        this.buttons = {
            nextLevel: null,
            retry: {
                label: 'Retry',
                color: [0.9, 0.6, 0.2, 1.0],
                hoverColor: [1.0, 0.7, 0.3, 1.0],
                action: 'retry',
                x: 0, y: 0, width: 0, height: 0  // Initialize with default values
            },
            menu: {
                label: 'Menu',
                color: [0.6, 0.6, 0.7, 1.0],
                hoverColor: [0.7, 0.7, 0.8, 1.0],
                action: 'menu',
                x: 0, y: 0, width: 0, height: 0  // Initialize with default values
            }
        };
        
        // Add Next Level button if available
        if (this.summary.nextLevelId) {
            this.buttons.nextLevel = {
                label: 'Next Level',
                color: [0.2, 0.8, 0.3, 1.0],
                hoverColor: [0.3, 0.9, 0.4, 1.0],
                action: 'next',
                x: 0, y: 0, width: 0, height: 0  // Initialize with default values
            };
        }
        
        // Calculate initial positions
        this.updateButtonPositions(this.canvasWidth, this.canvasHeight);
    }

    /**
     * Update button positions based on canvas dimensions
     */
    updateButtonPositions(canvasWidth, canvasHeight) {
        const centerX = canvasWidth / 2;
        const isMobile = canvasWidth < 600;
        const buttonWidth = isMobile ? Math.min(160, canvasWidth * 0.35) : 180;
        const buttonHeight = isMobile ? 45 : 50;
        const spacing = isMobile ? 15 : 20;
        const buttonY = isMobile ? canvasHeight * 0.72 : canvasHeight * 0.75;

        // Update button positions based on layout
        if (this.buttons.nextLevel) {
            // Next Level button centered at top
            this.buttons.nextLevel.x = centerX - buttonWidth / 2;
            this.buttons.nextLevel.y = buttonY;
            this.buttons.nextLevel.width = buttonWidth;
            this.buttons.nextLevel.height = buttonHeight;
            
            // Retry and Menu buttons below in a row
            const smallButtonWidth = (buttonWidth * 2 + spacing) / 2;
            
            this.buttons.retry.x = centerX - smallButtonWidth - spacing / 2;
            this.buttons.retry.y = buttonY + buttonHeight + spacing;
            this.buttons.retry.width = smallButtonWidth;
            this.buttons.retry.height = buttonHeight * 0.8;
            
            this.buttons.menu.x = centerX + spacing / 2;
            this.buttons.menu.y = buttonY + buttonHeight + spacing;
            this.buttons.menu.width = smallButtonWidth;
            this.buttons.menu.height = buttonHeight * 0.8;
        } else {
            // No Next Level - Retry and Menu side by side
            this.buttons.retry.x = centerX - buttonWidth - spacing / 2;
            this.buttons.retry.y = buttonY;
            this.buttons.retry.width = buttonWidth;
            this.buttons.retry.height = buttonHeight;
            
            this.buttons.menu.x = centerX + spacing / 2;
            this.buttons.menu.y = buttonY;
            this.buttons.menu.width = buttonWidth;
            this.buttons.menu.height = buttonHeight;
        }
    }
    
    /**
     * Genera confetti per 3 stelle
     */
    generateConfetti() {
        const colors = [
            [1.0, 0.2, 0.2, 1.0],
            [0.2, 1.0, 0.2, 1.0],
            [0.2, 0.2, 1.0, 1.0],
            [1.0, 1.0, 0.2, 1.0],
            [1.0, 0.2, 1.0, 1.0]
        ];
        
        for (let i = 0; i < 100; i++) {
            this.confettiParticles.push({
                x: this.canvasWidth / 2,
                y: this.canvasHeight * 0.3,
                vx: (Math.random() - 0.5) * 400,
                vy: -Math.random() * 300 - 200,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                gravity: 500
            });
        }
    }
    
    /**
     * Update animazioni
     */
    update(deltaTime) {
        if (!this.visible) return;
        
        // Update animazione entrata
        if (this.animationProgress < 1.0) {
            this.animationProgress += deltaTime / this.animationDuration;
            if (this.animationProgress > 1.0) {
                this.animationProgress = 1.0;
            }
        }
        
        // Update animazione stelle
        for (let i = 0; i < 3; i++) {
            if (i < this.summary.stars) {
                const delay = i * this.starAnimationDelay;
                const progress = Math.max(0, this.animationProgress - delay);
                this.starAnimations[i] = Math.min(1.0, progress / 0.5);
                
                // Genera sparkle quando stella appare
                if (this.starAnimations[i] > 0.5 && this.starAnimations[i] < 0.7 && Math.random() < 0.3) {
                    this.generateStarSparkle(i);
                }
            }
        }
        
        // Update confetti
        this.confettiParticles = this.confettiParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += p.gravity * deltaTime;
            p.rotation += p.rotationSpeed * deltaTime;
            p.life -= deltaTime * 0.5;
            return p.life > 0 && p.y < this.canvasHeight + 50;
        });
        
        // Update sparkles
        this.sparkleParticles = this.sparkleParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime * 2;
            p.scale = p.life;
            return p.life > 0;
        });
    }
    
    /**
     * Genera sparkle per stella
     */
    generateStarSparkle(starIndex) {
        const starX = this.canvasWidth / 2 + (starIndex - 1) * 60;
        const starY = this.canvasHeight * 0.35;
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.sparkleParticles.push({
                x: starX,
                y: starY,
                vx: Math.cos(angle) * 150,
                vy: Math.sin(angle) * 150,
                color: [1.0, 0.9, 0.2, 1.0],
                life: 1.0,
                scale: 1.0
            });
        }
    }
    
    /**
     * Check click sui pulsanti
     */
    checkClick(x, y) {
        if (!this.visible) return null;
        
        // Check tutti i pulsanti
        for (const key in this.buttons) {
            const btn = this.buttons[key];
            if (!btn) continue;
            
            if (x >= btn.x && x <= btn.x + btn.width &&
                y >= btn.y && y <= btn.y + btn.height) {
                return btn.action;
            }
        }
        
        return null;
    }
    
    /**
     * Check hover sui pulsanti
     */
    checkHover(x, y) {
        this.selectedButton = null;
        
        if (!this.visible) return;
        
        for (const key in this.buttons) {
            const btn = this.buttons[key];
            if (!btn) continue;
            
            if (x >= btn.x && x <= btn.x + btn.width &&
                y >= btn.y && y <= btn.y + btn.height) {
                this.selectedButton = key;
                break;
            }
        }
    }
    
    /**
     * Render con Canvas 2D
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (!this.visible || !this.summary) return;
        
        // Dark overlay with gradient
        const gradient = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, 0, canvasWidth / 2, canvasHeight / 2, canvasWidth);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Panel with shadow and gradient
        const panelWidth = Math.min(420, canvasWidth * 0.85);
        const panelHeight = canvasHeight * 0.85;
        const panelX = (canvasWidth - panelWidth) / 2;
        const panelY = (canvasHeight - panelHeight) / 2;
        
        // Outer glow
        ctx.shadowColor = 'rgba(102, 126, 234, 0.6)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
        ctx.beginPath();
        ctx.roundRect(panelX - 5, panelY - 5, panelWidth + 10, panelHeight + 10, 30);
        ctx.fill();
        
        // Panel gradient background
        const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        panelGradient.addColorStop(0, '#ffffff');
        panelGradient.addColorStop(1, '#f0f8ff');
        ctx.fillStyle = panelGradient;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 30);
        ctx.fill();
        
        // Border accent with gradient
        const borderGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight);
        borderGradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
        borderGradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.4)');
        borderGradient.addColorStop(1, 'rgba(102, 126, 234, 0.4)');
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 30);
        ctx.stroke();
        
        // Decorative top bar
        const topBarGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + 80);
        topBarGradient.addColorStop(0, 'rgba(102, 126, 234, 0.25)');
        topBarGradient.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
        ctx.fillStyle = topBarGradient;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, 80, [30, 30, 0, 0]);
        ctx.fill();
        
        // Title with rainbow gradient
        ctx.save();
        const titleGradient = ctx.createLinearGradient(panelX, panelY + 40, panelX + panelWidth, panelY + 40);
        titleGradient.addColorStop(0, '#ff0080');
        titleGradient.addColorStop(0.2, '#ff7f00');
        titleGradient.addColorStop(0.4, '#ffff00');
        titleGradient.addColorStop(0.6, '#00ff00');
        titleGradient.addColorStop(0.8, '#0080ff');
        titleGradient.addColorStop(1, '#8000ff');
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillText(this.summary.levelName || `Level ${this.summary.levelId}`, canvasWidth / 2, panelY + 45);
        ctx.restore();
        
        // Subtitle with emoji
        ctx.fillStyle = '#666';
        ctx.font = 'bold 16px Arial';
        ctx.shadowColor = 'transparent';
        ctx.fillText('✨ Level Complete! ✨', canvasWidth / 2, panelY + 72);
        
        // Stars section with enhanced animation
        const starsY = panelY + 150;
        const starSpacing = 80;
        const startX = canvasWidth / 2 - starSpacing;
        
        // Stars background glow with pulsing effect
        if (this.summary.stars > 0) {
            for (let i = 0; i < this.summary.stars; i++) {
                const starX = startX + i * starSpacing;
                const pulseScale = 1 + Math.sin(Date.now() / 300 + i) * 0.1;
                const starGlow = ctx.createRadialGradient(starX, starsY, 0, starX, starsY, 50 * pulseScale);
                starGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
                starGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
                starGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
                ctx.fillStyle = starGlow;
                ctx.fillRect(starX - 50, starsY - 50, 100, 100);
            }
        }
        
        // Stars with enhanced scale animation and rotation
        ctx.font = '60px Arial';
        for (let i = 0; i < 3; i++) {
            const starX = startX + i * starSpacing;
            const animProgress = this.starAnimations[i] || 0;
            
            // Elastic easing for bounce effect
            const elasticOut = (t) => {
                if (t === 0 || t === 1) return t;
                return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
            };
            const scale = elasticOut(animProgress);
            const rotation = (1 - animProgress) * Math.PI * 2;
            
            ctx.save();
            ctx.translate(starX, starsY);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);
            
            if (i < this.summary.stars) {
                // Filled star with enhanced shadow
                ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
                ctx.shadowBlur = 20;
                ctx.shadowOffsetY = 4;
                
                // Create gradient for star
                const starGradient = ctx.createLinearGradient(-30, -30, 30, 30);
                starGradient.addColorStop(0, '#FFD700');
                starGradient.addColorStop(0.5, '#FFA500');
                starGradient.addColorStop(1, '#FF8C00');
                ctx.fillStyle = starGradient;
                ctx.fillText('⭐', 0, 0);
            } else {
                // Empty star
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ddd';
                ctx.fillText('☆', 0, 0);
            }
            
            ctx.restore();
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Performance rank with animated badge
        const rankConfig = {
            'perfect': { color: '#FFD700', emoji: '🏆', text: 'PERFECT!', bgColor: 'rgba(255, 215, 0, 0.15)' },
            'gold': { color: '#FFA500', emoji: '🥇', text: 'EXCELLENT!', bgColor: 'rgba(255, 165, 0, 0.15)' },
            'silver': { color: '#C0C0C0', emoji: '🥈', text: 'GREAT!', bgColor: 'rgba(192, 192, 192, 0.15)' },
            'bronze': { color: '#CD7F32', emoji: '🥉', text: 'GOOD!', bgColor: 'rgba(205, 127, 50, 0.15)' }
        };
        
        const rank = this.summary.stars === 3 ? 'perfect' : 
                     this.summary.stars === 2 ? 'gold' : 
                     this.summary.stars === 1 ? 'silver' : 'bronze';
        const rankInfo = rankConfig[rank];
        
        // Rank badge background
        const badgeY = starsY + 65;
        const badgeWidth = 200;
        const badgeHeight = 40;
        const badgeX = canvasWidth / 2 - badgeWidth / 2;
        
        ctx.fillStyle = rankInfo.bgColor;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY - 15, badgeWidth, badgeHeight, 20);
        ctx.fill();
        
        ctx.strokeStyle = rankInfo.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Rank text
        ctx.fillStyle = rankInfo.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = `${rankInfo.color}44`;
        ctx.shadowBlur = 8;
        ctx.fillText(`${rankInfo.emoji} ${rankInfo.text}`, canvasWidth / 2, badgeY + 10);
        ctx.shadowBlur = 0;
        
        // Stats section with modern card design
        const statsStartY = panelY + 300;
        const statsX = panelX + 30;
        const statCardWidth = (panelWidth - 80) / 2;
        const statCardHeight = 85;
        const statSpacing = 20;
        
        const stats = [
            { icon: '⏱️', label: 'Time diocan', value: `${this.summary.time.toFixed(1)}s`, color: '#667eea', bgColor: 'rgba(102, 126, 234, 0.1)' },
            { icon: '🪙', label: 'Coins', value: `${this.summary.coinsCollected}/${this.summary.totalCoins}`, color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.1)' }
        ];
        
        stats.forEach((stat, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const cardX = statsX + col * (statCardWidth + statSpacing);
            const cardY = statsStartY + row * (statCardHeight + statSpacing);
            
            // Card background with gradient
            const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + statCardHeight);
            cardGradient.addColorStop(0, '#ffffff');
            cardGradient.addColorStop(1, '#fafafa');
            ctx.fillStyle = cardGradient;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, statCardWidth, statCardHeight, 16);
            ctx.fill();
            
            // Card colored accent bar at top
            ctx.fillStyle = stat.color;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, statCardWidth, 4, [16, 16, 0, 0]);
            ctx.fill();
            
            // Card border with subtle shadow
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, statCardWidth, statCardHeight, 16);
            ctx.stroke();
            
            // Icon circle with colored background
            const iconSize = 36;
            const iconX = cardX + 18;
            const iconY = cardY + statCardHeight / 2;
            
            ctx.fillStyle = stat.bgColor;
            ctx.beginPath();
            ctx.arc(iconX + iconSize/2, iconY, iconSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Icon
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(stat.icon, iconX + iconSize/2, iconY + 8);
            
            // Label and value
            ctx.textAlign = 'left';
            ctx.fillStyle = '#888';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(stat.label.toUpperCase(), cardX + iconSize + 28, cardY + 30);
            
            ctx.fillStyle = stat.color;
            ctx.font = 'bold 22px Arial';
            ctx.fillText(stat.value, cardX + iconSize + 28, cardY + 58);
        });
        
        // Update button positions with current canvas dimensions
        this.updateButtonPositions(canvasWidth, canvasHeight);

        // Buttons with enhanced design
        const buttonsStartY = panelY + panelHeight - 150;
        
        for (const key in this.buttons) {
            const btn = this.buttons[key];
            if (!btn) continue;
            
            const isHovered = this.selectedButton === key;
            const color = isHovered ? btn.hoverColor : btn.color;
            
            // Button outer glow on hover
            if (isHovered) {
                ctx.shadowColor = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, 0.5)`;
                ctx.shadowBlur = 25;
                ctx.shadowOffsetY = 0;
            }
            
            // Button gradient with depth
            const btnGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
            const lightColor = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3]})`;
            const darkColor = `rgba(${color[0] * 220}, ${color[1] * 220}, ${color[2] * 220}, ${color[3]})`;
            btnGradient.addColorStop(0, lightColor);
            btnGradient.addColorStop(1, darkColor);
            
            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 25);
            ctx.fill();
            
            // Inner highlight
            const highlightGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height / 3);
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlightGradient;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height / 3, [25, 25, 0, 0]);
            ctx.fill();
            
            // Button border
            ctx.strokeStyle = `rgba(${color[0] * 200}, ${color[1] * 200}, ${color[2] * 200}, 0.5)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 25);
            ctx.stroke();
            
            // Button text with enhanced shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Confetti particles with glow
        this.confettiParticles.forEach(particle => {
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation || 0);
            ctx.globalAlpha = particle.life;
            
            // Glow effect
            ctx.shadowColor = `rgba(${particle.color[0] * 255}, ${particle.color[1] * 255}, ${particle.color[2] * 255}, 0.6)`;
            ctx.shadowBlur = 10;
            
            ctx.fillStyle = `rgba(${particle.color[0] * 255}, ${particle.color[1] * 255}, ${particle.color[2] * 255}, ${particle.color[3]})`;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        });
        
        // Sparkle particles
        this.sparkleParticles.forEach(particle => {
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.globalAlpha = particle.life;
            ctx.scale(particle.scale, particle.scale);
            
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            ctx.shadowBlur = 8;
            
            ctx.fillStyle = `rgba(${particle.color[0] * 255}, ${particle.color[1] * 255}, ${particle.color[2] * 255}, ${particle.color[3]})`;
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    
    /**
     * Render con WebGL (sarà chiamato dal rendering system)
     */
    getRenderData() {
        if (!this.visible || !this.summary) return null;
        
        // Easing per animazione smooth
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        
        const progress = easeOutBack(this.animationProgress);
        
        return {
            visible: true,
            progress: progress,
            summary: this.summary,
            stars: this.summary.stars,
            starAnimations: this.starAnimations,
            confetti: this.confettiParticles,
            sparkles: this.sparkleParticles,
            buttons: this.buttons,
            selectedButton: this.selectedButton,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight
        };
    }
    
    /**
     * Formatta tempo in mm:ss
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Ottieni testo rank stelle
     */
    static getStarRank(stars) {
        switch (stars) {
            case 3: return '🏆 PERFECT!';
            case 2: return '🥈 GREAT!';
            case 1: return '🥉 GOOD!';
            default: return '✅ COMPLETED';
        }
    }
    
    /**
     * Update dimensioni
     */
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        if (this.visible && this.summary) {
            this.createButtons();
        }
    }
    
    /**
     * Check se è visibile
     */
    isVisible() {
        return this.visible;
    }
}
