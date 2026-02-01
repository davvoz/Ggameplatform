/**
 * Graphics Engine
 * Handles all rendering with sprite-based system
 */
import { SpriteRenderer } from './sprite-renderer.js';
import { UI_CONFIG, CONFIG } from './config.js';
import { Utils } from './utils.js';

export class Graphics {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.cellSize = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Pre-rendered canvases for optimization
        this.gridCache = null;
        this.gridCacheDirty = true;
        
        // Professional sprite rendering system
        this.spriteRenderer = new SpriteRenderer();
        
        // Animation frame tracking
        this.animationTime = 0;
        
        this.setupCanvas();
    }

    setupCanvas() {
        const updateSize = () => {
            const dpr = window.devicePixelRatio || 1;
            
            // Portrait aspect ratio: 9:16 (width:height)
            const TARGET_ASPECT_RATIO = 9 / 16;
            const isDesktop = window.innerWidth >= 769;
            // Check fullscreen state: prefer local tracking, then PlatformSDK, fallback to native/CSS
            const isFullscreen = window._gameFullscreenState === true ||
                ((window.PlatformSDK && typeof window.PlatformSDK.isFullscreen === 'function') 
                    ? window.PlatformSDK.isFullscreen() 
                    : (document.fullscreenElement || document.body.classList.contains('game-fullscreen') || document.body.classList.contains('ios-game-fullscreen')));
            
            let width, height;
            
            if (isDesktop && isFullscreen) {
                // Desktop fullscreen: maintain portrait aspect ratio centered
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                
                // Calculate dimensions maintaining 9:16 aspect ratio
                if (screenWidth / screenHeight > TARGET_ASPECT_RATIO) {
                    // Screen is wider than target - height is limiting factor
                    height = screenHeight;
                    width = Math.floor(height * TARGET_ASPECT_RATIO);
                } else {
                    // Screen is narrower - width is limiting factor
                    width = screenWidth;
                    height = Math.floor(width / TARGET_ASPECT_RATIO);
                }
                
                // Center the canvas
                const offsetLeft = Math.floor((screenWidth - width) / 2);
                this.canvas.style.position = 'fixed';
                this.canvas.style.left = offsetLeft + 'px';
                this.canvas.style.top = '0px';
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';
            } else if (isDesktop && !isFullscreen) {
                // Desktop not fullscreen: maintain portrait aspect ratio
                const maxWidth = Math.min(500, window.innerWidth * 0.9);
                const maxHeight = Math.min(900, window.innerHeight * 0.95);
                
                if (maxWidth / maxHeight > TARGET_ASPECT_RATIO) {
                    height = maxHeight;
                    width = Math.floor(height * TARGET_ASPECT_RATIO);
                } else {
                    width = maxWidth;
                    height = Math.floor(width / TARGET_ASPECT_RATIO);
                }
                
                this.canvas.style.position = 'relative';
                this.canvas.style.left = 'auto';
                this.canvas.style.top = 'auto';
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';
            } else {
                // Mobile: full screen
                width = window.innerWidth;
                height = window.innerHeight;
                
                this.canvas.style.position = 'fixed';
                this.canvas.style.left = '0px';
                this.canvas.style.top = '0px';
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';
            }
            
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            
            this.ctx.scale(dpr, dpr);
            
            // Calculate cell size and centering (accounting for sidebar)
            const sidebarWidth = UI_CONFIG.SIDEBAR_WIDTH || 64;
            const availableWidth = width - sidebarWidth;
            const availableHeight = height - UI_CONFIG.TOP_BAR_HEIGHT - UI_CONFIG.SHOP_HEIGHT;
            
            // Calcola cellSize basandosi sul minimo tra larghezza e altezza disponibili
            // per garantire che l'intera griglia sia visibile su tutti i dispositivi
            const cellSizeByWidth = availableWidth / CONFIG.COLS;
            const cellSizeByHeight = availableHeight / CONFIG.ROWS;
            this.cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
            
            const gridWidth = CONFIG.COLS * this.cellSize;
            const gridHeight = CONFIG.ROWS * this.cellSize;
            
            // Position grid to the right of sidebar, centered in remaining space
            this.offsetX = sidebarWidth + (availableWidth - gridWidth) / 2;
            this.offsetY = UI_CONFIG.TOP_BAR_HEIGHT + (availableHeight - gridHeight) / 2;
            
            this.gridCacheDirty = true;
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
        document.addEventListener('fullscreenchange', updateSize);
    }

    /**
     * Pre-render grid to cache canvas
     */
    renderGridCache() {
        if (!this.gridCacheDirty) return;
        
        const width = CONFIG.COLS * this.cellSize;
        const height = CONFIG.ROWS * this.cellSize;
        
        if (!this.gridCache) {
            this.gridCache = document.createElement('canvas');
        }
        
        this.gridCache.width = width;
        this.gridCache.height = height;
        const ctx = this.gridCache.getContext('2d');
        
        // Background
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);
        
        // Defense zone highlight
        const defenseY = (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS) * this.cellSize;
        ctx.fillStyle = CONFIG.COLORS.DEFENSE_ZONE;
        ctx.fillRect(0, defenseY, width, CONFIG.DEFENSE_ZONE_ROWS * this.cellSize);
        
        // Spawn zone highlight
        ctx.fillStyle = CONFIG.COLORS.SPAWN_ZONE;
        ctx.fillRect(0, 0, width, this.cellSize * 2);
        
        // Grid lines
        ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
        ctx.lineWidth = CONFIG.GRID_LINE_WIDTH;
        
        // Vertical lines
        for (let col = 0; col <= CONFIG.COLS; col++) {
            const x = col * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let row = 0; row <= CONFIG.ROWS; row++) {
            const y = row * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Add defense zone label
        ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.font = `bold ${this.cellSize * 0.25}px ${UI_CONFIG.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.3;
        ctx.fillText('⚔️ DEFENSE ZONE ⚔️', width / 2, defenseY + this.cellSize * 2);
        ctx.globalAlpha = 1.0;
        
        this.gridCacheDirty = false;
    }

    /**
     * Clear screen and draw background
     */
    clear() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear all
        this.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, width, height);
    }

    /**
     * Draw the cached grid
     */
    drawGrid() {
        this.renderGridCache();
        this.ctx.drawImage(this.gridCache, this.offsetX, this.offsetY);
    }

    /**
     * Draw sprite using professional vector rendering
     * @param {Object|string} sprite - Sprite definition object or legacy emoji string
     * @param {number} col - Grid column
     * @param {number} row - Grid row
     * @param {Object} options - Rendering options
     */
    drawSprite(sprite, col, row, options = {}) {
        if (!sprite) return; // Skip if no sprite available
        
        const pos = this.gridToScreen(col, row);
        this.drawSpriteAt(sprite, pos.x, pos.y, options);
    }
    
    /**
     * Draw sprite at specific screen coordinates (pixel position)
     * @param {Object|string} sprite - Sprite definition object or legacy emoji string
     * @param {number} x - Screen X coordinate (pixels)
     * @param {number} y - Screen Y coordinate (pixels)
     * @param {Object} options - Rendering options
     */
    drawSpriteAt(sprite, x, y, options = {}) {
        if (!sprite) return; // Skip if no sprite available
        
        const {
            scale = 1.0,
            opacity = 1.0,
            rotation = 0,
            color = null,
            glow = false,
            glowColor = null,
            bounce = 0,
            shake = 0,
            flipX = false,
            flipY = false,
            tint = null
        } = options;
        
        // Apply effects
        let finalX = x;
        let finalY = y + Math.sin(this.animationTime * 5) * bounce * this.cellSize * 0.1;
        
        if (shake > 0) {
            finalX += (Math.random() - 0.5) * shake * this.cellSize * 0.1;
            finalY += (Math.random() - 0.5) * shake * this.cellSize * 0.1;
        }
        
        const size = this.cellSize * 0.8;
        
        // Check if using new sprite system
        if (typeof sprite === 'object' && sprite.parts) {
            // New professional sprite rendering
            this.spriteRenderer.renderSprite(
                this.ctx,
                sprite,
                finalX,
                finalY,
                size,
                {
                    scale,
                    rotation,
                    opacity,
                    tint: tint || color,
                    flipX,
                    flipY,
                    glow,
                    glowColor: glowColor || color,
                    glowIntensity: glow ? 0.6 : 0
                }
            );
        } else {
            // Legacy emoji rendering (fallback)
            this.ctx.save();
            this.ctx.globalAlpha = opacity;
            this.ctx.translate(finalX, finalY);
            this.ctx.rotate(rotation);
            
            if (glow) {
                this.ctx.shadowBlur = this.cellSize * 0.3;
                this.ctx.shadowColor = glowColor || color || CONFIG.COLORS.TEXT_PRIMARY;
            }
            
            const fontSize = size * 0.7 * scale;
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = color || '#ffffff';
            this.ctx.fillText(sprite, 0, 0);
            
            this.ctx.restore();
        }
    }

    /**
     * Draw health bar
     */
    drawHealthBar(col, row, hpPercent, options = {}) {
        const {
            width = 0.8,
            height = 0.1,
            offsetY = -0.4,
            backgroundColor = 'rgba(0, 0, 0, 0.5)',
            foregroundColor = '#00ff88',
            borderColor = 'rgba(255, 255, 255, 0.3)'
        } = options;
        
        const pos = this.gridToScreen(col, row);
        const barWidth = this.cellSize * width;
        const barHeight = this.cellSize * height;
        const x = pos.x - barWidth / 2;
        const y = pos.y + this.cellSize * offsetY;
        
        // Background
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Foreground
        const fillColor = hpPercent > 0.5 ? foregroundColor : 
                         hpPercent > 0.25 ? '#ffaa00' : '#ff3333';
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
        
        // Border
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    /**
     * Draw selection indicator
     */
    drawSelection(col, row, color = CONFIG.COLORS.SELECTION) {
        const pos = this.gridToScreen(col, row);
        const size = this.cellSize * 0.9;
        
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineDashOffset = -this.animationTime * 20;
        
        this.ctx.strokeRect(
            pos.x - size / 2,
            pos.y - size / 2,
            size,
            size
        );
        
        this.ctx.restore();
    }

    /**
     * Draw projectile
     */
    drawProjectile(x, y, color, size = 1.0, options = {}) {
        const {
            trail = false,
            glow = true
        } = options;
        
        const screenPos = this.worldToScreen(x, y);
        const radius = this.cellSize * 0.15 * size;
        
        this.ctx.save();
        
        if (glow) {
            this.ctx.shadowBlur = radius * 2;
            this.ctx.shadowColor = color;
        }
        
        // Draw main projectile
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner glow
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    /**
     * Draw particle
     */
    drawParticle(x, y, options = {}) {
        const {
            text = '',
            color = '#ffffff',
            size = 1.0,
            opacity = 1.0,
            glow = false
        } = options;
        
        const screenPos = this.worldToScreen(x, y);
        
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        
        if (glow) {
            this.ctx.shadowBlur = this.cellSize * 0.2;
            this.ctx.shadowColor = color;
        }
        
        this.ctx.font = `bold ${this.cellSize * 0.4 * size}px ${UI_CONFIG.FONT_FAMILY}`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, screenPos.x, screenPos.y);
        
        this.ctx.restore();
    }

    /**
     * Draw level indicator
     */
    drawLevel(col, row, level, icon) {
        const pos = this.gridToScreen(col, row);
        const size = this.cellSize * 0.3;  // Cerchio più grande
        
        // Background circle
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(pos.x + this.cellSize * 0.35, pos.y - this.cellSize * 0.35, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Level number (più grande, senza icona)
        this.ctx.font = `bold ${size * 1.4}px ${UI_CONFIG.FONT_FAMILY}`;
        this.ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(level, pos.x + this.cellSize * 0.35, pos.y - this.cellSize * 0.35);
        
        this.ctx.restore();
    }

    /**
     * Draw range indicator
     */
    drawRange(col, row, range, color = 'rgba(0, 255, 136, 0.2)') {
        const pos = this.gridToScreen(col, row);
        const radius = range * this.cellSize;
        
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = Utils.colorWithAlpha(color, 0.5);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Draw bomb target area indicator with pulsing animation
     */
    drawBombTarget(col, row, radius, time) {
        const pos = this.gridToScreen(col, row);
        const baseRadius = radius * this.cellSize;
        
        // Pulsing effect
        const pulse = Math.sin(time * 8) * 0.1 + 1;
        const actualRadius = baseRadius * pulse;
        
        this.ctx.save();
        
        // Outer glow
        this.ctx.shadowColor = '#ff4400';
        this.ctx.shadowBlur = 20 + Math.sin(time * 6) * 10;
        
        // Danger zone fill
        const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, actualRadius);
        gradient.addColorStop(0, 'rgba(255, 68, 0, 0.4)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.25)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, actualRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Animated dashed border
        this.ctx.setLineDash([10, 5]);
        this.ctx.lineDashOffset = -time * 50;
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Inner crosshair
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#ff4400';
        this.ctx.lineWidth = 2;
        
        const crossSize = this.cellSize * 0.4;
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - crossSize, pos.y);
        this.ctx.lineTo(pos.x + crossSize, pos.y);
        this.ctx.stroke();
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y - crossSize);
        this.ctx.lineTo(pos.x, pos.y + crossSize);
        this.ctx.stroke();
        
        // Center circle
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, crossSize * 0.3, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    /**
     * Disegna il muro di mattoni dinamico (4 file da 25)
     * @param {number} displayEnergy - Energia visualizzata (animata)
     * @param {boolean} isGaining - Se stiamo guadagnando energia
     * @param {boolean} isLosing - Se stiamo perdendo energia
     * @param {number} targetEnergy - Energia target reale
     */
    drawBrickWall(displayEnergy, isGaining = false, isLosing = false, targetEnergy = 0) {
        const ctx = this.ctx;
        const displayBricks = Math.max(0, Math.floor(displayEnergy));
        const targetBricks = Math.max(0, Math.floor(targetEnergy));
        const bricksPerRow = 25;
        const brickRows = 4;
        const brickW = this.cellSize * CONFIG.COLS / bricksPerRow;
        const brickH = this.cellSize * 0.22;
        const defenseY = (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS) * this.cellSize;
        
        // Animazione pulse
        const pulsePhase = (this.animationTime * 6) % 1;
        const pulseGlow = 0.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.5;
        
        // Determina quanti mattoncini disegnare (il massimo tra display e target per mostrare quelli che stanno sparendo)
        const maxBricks = isLosing ? displayBricks : Math.max(displayBricks, targetBricks);
        let bricksDrawn = 0;
        
        for (let r = brickRows - 1; r >= 0; r--) {
            for (let c = 0; c < bricksPerRow; c++) {
                if (bricksDrawn >= maxBricks) return;
                
                const bx = this.offsetX + c * brickW;
                const by = this.offsetY + defenseY - brickRows * brickH + r * brickH;
                
                // Determina lo stato del mattoncino
                const isNewBrick = isGaining && bricksDrawn >= displayBricks && bricksDrawn < targetBricks;
                const isDyingBrick = isLosing && bricksDrawn >= targetBricks && bricksDrawn < displayBricks;
                const isNormalBrick = bricksDrawn < displayBricks && bricksDrawn < targetBricks;
                const isDisplayedBrick = bricksDrawn < displayBricks;
                
                if (isNewBrick) {
                    // Mattoncino in arrivo - glow verde brillante che pulsa
                    ctx.save();
                    ctx.shadowColor = '#00ff88';
                    ctx.shadowBlur = 10 + pulseGlow * 8;
                    ctx.fillStyle = `rgb(${100 + Math.floor(pulseGlow * 80)}, ${180 + Math.floor(pulseGlow * 75)}, ${100 + Math.floor(pulseGlow * 50)})`;
                    ctx.strokeStyle = `rgba(0, 255, 136, ${0.6 + pulseGlow * 0.4})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.rect(bx, by, brickW - 1.5, brickH - 1.5);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                } else if (isDyingBrick) {
                    // Mattoncino che sta per sparire - glow rosso che pulsa e fade
                    ctx.save();
                    ctx.shadowColor = '#ff4444';
                    ctx.shadowBlur = 8 + pulseGlow * 6;
                    ctx.globalAlpha = 0.5 + pulseGlow * 0.5;
                    ctx.fillStyle = `rgb(${200 + Math.floor(pulseGlow * 55)}, ${50 + Math.floor(pulseGlow * 30)}, ${30})`;
                    ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 + pulseGlow * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.rect(bx, by, brickW - 1.5, brickH - 1.5);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                } else if (isDisplayedBrick) {
                    // Mattoncino normale
                    ctx.fillStyle = '#b22222';
                    ctx.strokeStyle = '#fff2';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.rect(bx, by, brickW - 1.5, brickH - 1.5);
                    ctx.fill();
                    ctx.stroke();
                }
                bricksDrawn++;
            }
        }
    }

    /**
     * Convert grid coordinates to screen coordinates
     */
    gridToScreen(col, row) {
        return {
            x: this.offsetX + (col + 0.5) * this.cellSize,
            y: this.offsetY + (row + 0.5) * this.cellSize
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(x, y) {
        return {
            x: this.offsetX + x * this.cellSize,
            y: this.offsetY + y * this.cellSize
        };
    }

    /**
     * Convert screen coordinates to grid coordinates
     */
    screenToGrid(x, y) {
        const gridX = (x - this.offsetX) / this.cellSize;
        const gridY = (y - this.offsetY) / this.cellSize;
        
        return {
            col: Math.floor(gridX),
            row: Math.floor(gridY)
        };
    }

    /**
     * Update animation time
     */
    updateAnimation(dt) {
        this.animationTime += dt;
    }

    /**
     * Draw text with shadow
     */
    drawText(text, x, y, options = {}) {
        const {
            size = UI_CONFIG.FONT_SIZE_MEDIUM,
            color = CONFIG.COLORS.TEXT_PRIMARY,
            align = 'left',
            baseline = 'top',
            shadow = true,
            bold = false
        } = options;
        
        this.ctx.save();
        this.ctx.font = `${bold ? 'bold ' : ''}${size}px ${UI_CONFIG.FONT_FAMILY}`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        
        if (shadow) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
        }
        
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * Get cell size
     */
    getCellSize() {
        return this.cellSize;
    }

    /**
     * Get grid offset
     */
    getOffset() {
        return { x: this.offsetX, y: this.offsetY };
    }
}

// Export

