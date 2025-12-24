/**
 * UI Manager
 * Handles all UI rendering and interactions
 */

import { CONFIG, CANNON_TYPES, UI_CONFIG } from './config.js';
import { Utils } from './utils.js';

export class UIManager {
    constructor(graphics, canvas, audio = null) {
        this.graphics = graphics;
        this.canvas = canvas;
        this.audio = audio;
        
        this.selectedCannonType = 'BASIC';
        this.showRangePreview = false;
        this.previewCol = 0;
        this.previewRow = 0;
        
        // Shop buttons
        this.shopButtons = [];
        this.setupShopButtons();
        
        // Game over button
        this.retryButton = null;
        
        // Settings
        this.settingsButton = null;
        this.showSettingsPopup = false;
        this.settingsPopupButtons = [];
        this.settingsCheckboxes = [];
    }

    setupShopButtons() {
        // Use canvas width to match iframe width
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
        
        // Settings popup
        if (this.showSettingsPopup) {
            this.renderSettingsPopup();
        }
    }

    renderTopBar(gameState) {
        const ctx = this.graphics.ctx;
        // Use canvas width to match iframe width
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        
        // Background - full canvas width
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, UI_CONFIG.TOP_BAR_HEIGHT);
        
        // Border
        ctx.strokeStyle = CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, UI_CONFIG.TOP_BAR_HEIGHT);
        
        // Settings gear icon (top-right)
        const gearSize = 32;
        const gearX = width - gearSize - 10;
        const gearY = 10;
        
        // Store settings button position for click detection
        this.settingsButton = {
            x: gearX,
            y: gearY,
            width: gearSize,
            height: gearSize
        };
        
        // Draw gear background
        ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.beginPath();
        ctx.arc(gearX + gearSize/2, gearY + gearSize/2, gearSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw gear icon
        ctx.font = `${gearSize * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.fillText('⚙️', gearX + gearSize/2, gearY + gearSize/2);
        
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
        
        // Adjust stat width to accommodate gear icon
        const statsAreaWidth = width - gearSize - 20;
        const statWidth = statsAreaWidth / stats.length;
        
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
            const barWidth = statsAreaWidth * 0.8;
            const barHeight = 4;
            const barX = (statsAreaWidth - barWidth) / 2;
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
        // Use canvas width to match iframe width
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Background - full canvas width
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
        
        // Calcola il costo reale con il moltiplicatore dinamico
        let baseCost = typeof calculateTowerCost === 'function' ? 
                          calculateTowerCost(cannon.id, 1) : cannon.cost;
        let multiplier = 1;
        if (gameState.cannonPriceMultiplier && gameState.cannonPriceMultiplier[cannon.id]) {
            multiplier = gameState.cannonPriceMultiplier[cannon.id];
        }
        const actualCost = Math.floor(baseCost * multiplier);
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
        // Check settings popup clicks first (highest priority)
        if (this.showSettingsPopup) {
            const popupAction = this.checkSettingsPopupClick(screenPos.x, screenPos.y);
            if (popupAction) {
                // Close popup if close button was clicked
                if (popupAction === 'close') {
                    this.closeSettingsPopup();
                }
                return { type: 'settings', action: popupAction };
            }
            // Click outside popup - close it
            this.closeSettingsPopup();
            return { type: 'settings', action: 'close' };
        }
        
        // Check settings gear click
        if (this.checkSettingsClick(screenPos.x, screenPos.y)) {
            this.toggleSettingsPopup();
            return { type: 'settings', action: 'open' };
        }
        
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
    
    // Settings popup
    renderSettingsPopup() {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);
        
        // Popup box
        const popupWidth = Math.min(380, width * 0.85);
        const popupHeight = Math.min(380, height * 0.65);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;
        
        // Popup background with tower defense theme
        ctx.fillStyle = 'rgba(10, 20, 15, 0.95)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
        
        // Popup border (neon green like defense zone)
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 3;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);
        
        // Inner glow effect
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 6;
        ctx.strokeRect(popupX + 3, popupY + 3, popupWidth - 6, popupHeight - 6);
        
        // Title with gear icon
        this.graphics.drawText('⚙️ SETTINGS', width / 2, popupY + 45, {
            size: 32,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Settings options
        const contentWidth = popupWidth * 0.8;
        const contentX = popupX + (popupWidth - contentWidth) / 2;
        let contentY = popupY + 100;
        
        this.settingsPopupButtons = [];
        this.settingsCheckboxes = [];
        
        // Music toggle checkbox
        const musicEnabled = this.audio ? this.audio.enabled : true;
        this.renderCheckbox(contentX, contentY, '🎵 Background Music', 'music', musicEnabled);
        contentY += 60;
        
        // Sound toggle checkbox
        const soundEnabled = this.audio ? this.audio.soundEnabled : true;
        this.renderCheckbox(contentX, contentY, '🔊 Sound Effects', 'sound', soundEnabled);
        contentY += 70;
        
        // Fullscreen toggle button
        const buttonHeight = 50;
        const isFullscreen = document.body.classList.contains('game-fullscreen');
        const fullscreenText = isFullscreen ? '🔲 Exit Fullscreen' : '⛶ Enter Fullscreen';
        this.renderSettingsButton(contentX, contentY, contentWidth, buttonHeight, fullscreenText, 'fullscreen');
        contentY += buttonHeight + 15;
        
        // Close button
        contentY += 15;
        this.renderSettingsButton(contentX, contentY, contentWidth, buttonHeight * 0.8, '✕ Close', 'close');
    }
    
    renderCheckbox(x, y, text, action, checked) {
        const ctx = this.graphics.ctx;
        const boxSize = 32;
        const boxX = x + 5;
        const boxY = y;
        
        // Store checkbox for interaction
        this.settingsCheckboxes.push({
            x: boxX,
            y: boxY,
            width: boxSize,
            height: boxSize,
            action,
            checked
        });
        
        // Checkbox box
        ctx.fillStyle = checked ? CONFIG.COLORS.TEXT_PRIMARY : 'rgba(40, 40, 40, 0.8)';
        Utils.drawRoundRect(ctx, boxX, boxY, boxSize, boxSize, 6);
        ctx.fill();
        
        // Checkbox border
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, boxX, boxY, boxSize, boxSize, 6);
        ctx.stroke();
        
        // Checkmark
        if (checked) {
            this.graphics.drawText('✓', boxX + boxSize / 2, boxY + boxSize / 2, {
                size: 24,
                color: '#000000',
                align: 'center',
                baseline: 'middle',
                bold: true
            });
        }
        
        // Label text
        this.graphics.drawText(text, boxX + boxSize + 15, boxY + boxSize / 2, {
            size: 20,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'left',
            baseline: 'middle',
            bold: true,
            shadow: true
        });
    }
    
    renderSettingsButton(x, y, width, height, text, action, disabled = false) {
        const ctx = this.graphics.ctx;
        
        // Store button for click detection
        this.settingsPopupButtons.push({
            x, y, width, height, action, disabled
        });
        
        // Button background
        if (disabled) {
            ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        } else if (action === 'close') {
            ctx.fillStyle = 'rgba(220, 50, 50, 0.8)';
        } else {
            ctx.fillStyle = CONFIG.COLORS.BUTTON_BG;
        }
        
        Utils.drawRoundRect(ctx, x, y, width, height, 8);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = disabled ? '#555555' : CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 8);
        ctx.stroke();
        
        // Button text
        this.graphics.drawText(text, x + width / 2, y + height / 2, {
            size: 18,
            color: disabled ? '#666666' : CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: !disabled
        });
    }
    
    // Check if settings gear was clicked
    checkSettingsClick(screenX, screenY) {
        if (!this.settingsButton) return false;
        
        return screenX >= this.settingsButton.x && 
               screenX <= this.settingsButton.x + this.settingsButton.width &&
               screenY >= this.settingsButton.y && 
               screenY <= this.settingsButton.y + this.settingsButton.height;
    }
    
    // Check if settings popup button was clicked
    checkSettingsPopupClick(screenX, screenY) {
        if (!this.showSettingsPopup) return null;
        
        // Check checkbox clicks
        for (const checkbox of this.settingsCheckboxes) {
            if (screenX >= checkbox.x && screenX <= checkbox.x + checkbox.width &&
                screenY >= checkbox.y && screenY <= checkbox.y + checkbox.height) {
                // Toggle checkbox
                if (this.audio) {
                    if (checkbox.action === 'music') {
                        this.audio.toggle();
                    } else if (checkbox.action === 'sound') {
                        this.audio.toggleSounds();
                    }
                }
                return 'checkbox';
            }
        }
        
        // Check buttons
        for (const button of this.settingsPopupButtons) {
            if (button.disabled) continue;
            
            if (screenX >= button.x && 
                screenX <= button.x + button.width &&
                screenY >= button.y && 
                screenY <= button.y + button.height) {
                return button.action;
            }
        }
        
        return null;
    }
    
    toggleSettingsPopup() {
        this.showSettingsPopup = !this.showSettingsPopup;
    }
    
    closeSettingsPopup() {
        this.showSettingsPopup = false;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
