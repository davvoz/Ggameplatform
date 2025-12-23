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
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            
            this.ctx.scale(dpr, dpr);
            
            // Calculate cell size and centering
            const availableWidth = width;
            const availableHeight = height - UI_CONFIG.TOP_BAR_HEIGHT - UI_CONFIG.SHOP_HEIGHT;
            
            // Usa tutta la larghezza disponibile (nessun margine laterale)
            this.cellSize = availableWidth / CONFIG.COLS;
            
            const gridWidth = CONFIG.COLS * this.cellSize;
            const gridHeight = CONFIG.ROWS * this.cellSize;
            
            // Nessun margine laterale, centra verticalmente e sposta un po' più in alto
            this.offsetX = 0;
            this.offsetY = UI_CONFIG.TOP_BAR_HEIGHT + (availableHeight - gridHeight) / 2 - this.cellSize;
            
            this.gridCacheDirty = true;
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
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
        
        const pos = this.gridToScreen(col, row);
        
        // Apply effects
        let x = pos.x;
        let y = pos.y + Math.sin(this.animationTime * 5 + col) * bounce * this.cellSize * 0.1;
        
        if (shake > 0) {
            x += (Math.random() - 0.5) * shake * this.cellSize * 0.1;
            y += (Math.random() - 0.5) * shake * this.cellSize * 0.1;
        }
        
        const size = this.cellSize * 0.8;
        
        // Check if using new sprite system
        if (typeof sprite === 'object' && sprite.parts) {
            // New professional sprite rendering
            this.spriteRenderer.renderSprite(
                this.ctx,
                sprite,
                x,
                y,
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
            this.ctx.translate(x, y);
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
     * Disegna il muro di mattoni dinamico (4 file da 25)
     */
    drawBrickWall(energy) {
        const ctx = this.ctx;
        const totalBricks = Math.max(0, Math.floor(energy));
        const bricksPerRow = 25;
        const brickRows = 4;
        const brickW = this.cellSize * CONFIG.COLS / bricksPerRow;
        const brickH = this.cellSize * 0.22;
        const defenseY = (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS) * this.cellSize;
        let bricksDrawn = 0;
        for (let r = brickRows - 1; r >= 0; r--) {
            for (let c = 0; c < bricksPerRow; c++) {
                if (bricksDrawn >= totalBricks) return;
                const bx = this.offsetX + c * brickW;
                const by = this.offsetY + defenseY - brickRows * brickH + r * brickH;
                ctx.fillStyle = '#b22222';
                ctx.strokeStyle = '#fff2';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.rect(bx, by, brickW - 1.5, brickH - 1.5);
                ctx.fill();
                ctx.stroke();
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

