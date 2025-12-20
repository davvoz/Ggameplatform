/**
 * UI Manager
 * Handles all UI rendering and interactions
 */

class UIManager {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;
        
        this.selectedCannonType = 'BASIC';
        this.showRangePreview = false;
        this.previewCol = 0;
        this.previewRow = 0;
        
        // Shop buttons
        this.shopButtons = [];
        this.setupShopButtons();
        
        // Game over button
        this.retryButton = null;
    }

    setupShopButtons() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const buttonCount = Object.keys(CANNON_TYPES).length;
        const horizontalPadding = 12;
        const minSpacing = 4;

        // Make buttons responsive: if they don't fit, reduce spacing and then shrink button size.
        let spacing = UI_CONFIG.BUTTON_SPACING;
        let buttonSize = UI_CONFIG.BUTTON_SIZE;

        const fitSize = (candidateSpacing) => {
            return Math.floor((width - horizontalPadding * 2 - candidateSpacing * (buttonCount - 1)) / buttonCount);
        };

        let maxSize = fitSize(spacing);
        if (maxSize < buttonSize) {
            spacing = Math.max(minSpacing, spacing);
            maxSize = fitSize(spacing);
            if (maxSize < buttonSize && spacing > minSpacing) {
                spacing = minSpacing;
                maxSize = fitSize(spacing);
            }
            buttonSize = Math.max(48, Math.min(buttonSize, maxSize));
        }

        const totalWidth = buttonCount * buttonSize + (buttonCount - 1) * spacing;
        const startX = Math.max(horizontalPadding, (width - totalWidth) / 2);
        const buttonY = this.canvas.height / (window.devicePixelRatio || 1) - UI_CONFIG.SHOP_HEIGHT + 10;
        
        this.shopButtons = [];
        let x = startX;
        
        for (const [key, cannon] of Object.entries(CANNON_TYPES)) {
            this.shopButtons.push({
                id: key,
                x: x,
                y: buttonY,
                width: buttonSize,
                height: buttonSize,
                cannon: cannon
            });
            x += buttonSize + spacing;
        }
    }

    render(gameState) {
        this.renderTopBar(gameState);
        this.renderShop(gameState);
        
        // Range preview when hovering
        if (this.showRangePreview && this.isInDefenseZone(this.previewRow)) {
            const cannon = CANNON_TYPES[this.selectedCannonType];
            this.graphics.drawRange(
                this.previewCol, 
                this.previewRow, 
                cannon.range, 
                Utils.colorWithAlpha(cannon.color, 0.2)
            );
        }
    }

    renderTopBar(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, UI_CONFIG.TOP_BAR_HEIGHT);
        
        // Border
        ctx.strokeStyle = CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, UI_CONFIG.TOP_BAR_HEIGHT);
        
        // Stats
        const stats = [
            { 
                label: '💰 COINS', 
                value: Utils.formatNumber(gameState.coins),
                color: CONFIG.COLORS.TEXT_PRIMARY 
            },
            { 
                label: '⚡ ENERGY', 
                value: Math.floor(gameState.energy),
                color: gameState.energy > 50 ? CONFIG.COLORS.TEXT_PRIMARY : CONFIG.COLORS.TEXT_DANGER 
            },
            { 
                label: '🌊 WAVE', 
                value: gameState.wave,
                color: CONFIG.COLORS.TEXT_WARNING 
            },
            { 
                label: '⭐ SCORE', 
                value: Utils.formatNumber(gameState.score),
                color: CONFIG.COLORS.TEXT_SECONDARY 
            }
        ];
        
        const statWidth = width / stats.length;
        
        stats.forEach((stat, index) => {
            const x = statWidth * index + statWidth / 2;
            const y = UI_CONFIG.TOP_BAR_HEIGHT / 2;
            
            // Label
            this.graphics.drawText(stat.label, x, y - 18, {
                size: 12,
                color: CONFIG.COLORS.TEXT_SECONDARY,
                align: 'center',
                baseline: 'middle',
                shadow: true
            });
            
            // Value
            this.graphics.drawText(String(stat.value), x, y + 8, {
                size: 20,
                color: stat.color,
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: true
            });
        });
        
        // Wave progress bar
        if (gameState.waveInProgress) {
            const barWidth = width * 0.8;
            const barHeight = 4;
            const barX = (width - barWidth) / 2;
            const barY = UI_CONFIG.TOP_BAR_HEIGHT - 10;
            const progress = gameState.waveZombiesSpawned / gameState.waveZombiesTotal;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }
    }

    renderShop(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, height - UI_CONFIG.SHOP_HEIGHT, width, UI_CONFIG.SHOP_HEIGHT);
        
        // Border
        ctx.strokeStyle = CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, height - UI_CONFIG.SHOP_HEIGHT, width, UI_CONFIG.SHOP_HEIGHT);
        
        // Render buttons
        this.shopButtons.forEach(button => {
            this.renderShopButton(button, gameState);
        });
    }

    renderShopButton(button, gameState) {
        const ctx = this.graphics.ctx;
        const cannon = button.cannon;
        const isSelected = button.id === this.selectedCannonType;
        
        // Usa la funzione calculateTowerCost per ottenere il costo reale
        const actualCost = typeof calculateTowerCost === 'function' ? 
                          calculateTowerCost(cannon.id, 1) : cannon.cost;
        const canAfford = gameState.coins >= actualCost;

        const cornerRadius = Math.min(8, Math.floor(button.width * 0.12));
        
        // Button background
        if (isSelected) {
            ctx.fillStyle = CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.globalAlpha = 0.2;
        } else {
            ctx.fillStyle = CONFIG.COLORS.BUTTON_BG;
            ctx.globalAlpha = canAfford ? 0.8 : 0.3;
        }
        
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Border
        ctx.strokeStyle = isSelected ? CONFIG.COLORS.BUTTON_ACTIVE : 
                         canAfford ? CONFIG.COLORS.BUTTON_BORDER : '#555555';
        ctx.lineWidth = isSelected ? 3 : 2;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.stroke();
        
        // Icon
        ctx.font = `${Math.floor(button.width * 0.4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cannon.icon, button.x + button.width / 2, button.y + button.height * 0.35);
        
        // Name
        const labelSize = Math.max(8, Math.min(10, Math.floor(button.height * 0.14)));
        const costSize = Math.max(8, Math.min(10, Math.floor(button.height * 0.14)));

        this.graphics.drawText(cannon.name.toUpperCase(), button.x + button.width / 2, button.y + button.height * 0.65, {
            size: labelSize,
            color: canAfford ? CONFIG.COLORS.TEXT_PRIMARY : '#666666',
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: false
        });
        
        // Cost
        const costColor = canAfford ? CONFIG.COLORS.TEXT_WARNING : CONFIG.COLORS.TEXT_DANGER;
        this.graphics.drawText(`💰${actualCost}`, button.x + button.width / 2, button.y + button.height * 0.85, {
            size: costSize,
            color: costColor,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: false
        });
        
        // Selection glow
        if (isSelected) {
            ctx.save();
            ctx.shadowColor = CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.shadowBlur = Math.max(10, Math.floor(button.width * 0.18));
            ctx.strokeStyle = CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, button.x - 2, button.y - 2, button.width + 4, button.height + 4, cornerRadius + 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    handleTap(gridPos, screenPos, gameState) {
        // Check shop button clicks
        const clickedButton = this.getClickedShopButton(screenPos);
        if (clickedButton) {
            this.selectedCannonType = clickedButton.id;
            return { type: 'shop', action: 'select', cannonType: clickedButton.id };
        }
        
        // Check grid click
        if (this.isValidGridPos(gridPos)) {
            if (this.isInDefenseZone(gridPos.row)) {
                return { type: 'grid', action: 'tap', gridPos: gridPos };
            }
        }
        
        return null;
    }

    getClickedShopButton(screenPos) {
        for (const button of this.shopButtons) {
            if (Utils.pointInRect(
                screenPos.x, screenPos.y,
                button.x, button.y,
                button.width, button.height
            )) {
                return button;
            }
        }
        return null;
    }

    setRangePreview(show, col = 0, row = 0) {
        this.showRangePreview = show;
        this.previewCol = col;
        this.previewRow = row;
    }

    isValidGridPos(gridPos) {
        return gridPos.col >= 0 && gridPos.col < CONFIG.COLS &&
               gridPos.row >= 0 && gridPos.row < CONFIG.ROWS;
    }

    isInDefenseZone(row) {
        return row >= (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS);
    }

    getSelectedCannonType() {
        return this.selectedCannonType;
    }

    // Game over screen
    showGameOver(gameState, onRestart) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);
        
        // Popup box
        const popupWidth = Math.min(400, width * 0.85);
        const popupHeight = Math.min(450, height * 0.7);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;
        
        // Popup background
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
        
        // Popup border
        ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
        ctx.lineWidth = 3;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);
        
        // Title
        this.graphics.drawText('💀 GAME OVER 💀', width / 2, popupY + 60, {
            size: 42,
            color: CONFIG.COLORS.TEXT_DANGER,
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Stats
        const stats = [
            `Wave Reached: ${gameState.wave}`,
            `Score: ${Utils.formatNumber(gameState.score)}`,
            `Kills: ${gameState.kills}`,
            `Time: ${Utils.formatTime(gameState.playTime)}`
        ];
        
        let y = popupY + 130;
        stats.forEach(stat => {
            this.graphics.drawText(stat, width / 2, y, {
                size: 22,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                shadow: true
            });
            y += 38;
        });
        
        // Retry button
        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 80;
        
        // Store button bounds for click detection
        this.retryButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Button background
        ctx.fillStyle = CONFIG.COLORS.TEXT_DANGER;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button text
        this.graphics.drawText('🔄 RETRY', width / 2, buttonY + buttonHeight / 2, {
            size: 24,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: true
        });
    }

    // Check if retry button was clicked
    isRetryButtonClicked(screenX, screenY) {
        if (!this.retryButton) return false;
        
        return screenX >= this.retryButton.x &&
               screenX <= this.retryButton.x + this.retryButton.width &&
               screenY >= this.retryButton.y &&
               screenY <= this.retryButton.y + this.retryButton.height;
    }
    
    // Reset retry button
    clearRetryButton() {
        this.retryButton = null;
    }

    // Victory screen (optional, for future waves)
    showVictory(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        ctx.fillStyle = 'rgba(0, 20, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);
        
        this.graphics.drawText('🎉 VICTORY! 🎉', width / 2, height * 0.4, {
            size: 48,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            bold: true,
            shadow: true
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
