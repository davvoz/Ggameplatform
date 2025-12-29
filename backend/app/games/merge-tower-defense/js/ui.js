/**
 * UI Manager
 * Handles all UI rendering and interactions
 */

import { CONFIG, CANNON_TYPES, UI_CONFIG, SHOP_ITEMS } from './config.js';
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
        this.shopButton = null; // Nuovo bottone shop
        this.showSettingsPopup = false;
        this.showShopPopup = false; // Nuovo popup shop
        this.settingsPopupButtons = [];
        this.settingsCheckboxes = [];
        this.shopItems = []; // Array dei pulsanti del negozio
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
        
        // Render active boost bars on screen (always visible when boosts are active)
        this.renderActiveBoostBars(gameState);
        
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
        
        // Shop popup
        if (this.showShopPopup) {
            this.renderShopPopup(gameState);
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
        
        // Shop cart icon (under settings button)
        const shopX = gearX;
        const shopY = gearY + gearSize + 6;
        
        // Store shop button position for click detection
        this.shopButton = {
            x: shopX,
            y: shopY,
            width: gearSize,
            height: gearSize
        };
        
        // Draw settings gear background
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
        
        // Draw shop cart background
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(shopX + gearSize/2, shopY + gearSize/2, gearSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw shop cart icon
        ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
        ctx.fillText('🛒', shopX + gearSize/2, shopY + gearSize/2);
        
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

    /**
     * Render active boost bars on the main game screen
     * Shows duration bars for all active temporary boosts
     */
    renderActiveBoostBars(gameState) {
        if (!gameState.activeBoosts || gameState.activeBoosts.length === 0) return;
        
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const now = Date.now();
        const time = now * 0.001;
        
        // Position bars on the left side, below the top bar
        const barX = 10;
        let barY = UI_CONFIG.TOP_BAR_HEIGHT + 10;
        const barWidth = 140;
        const barHeight = 32;
        const barSpacing = 8;
        
        gameState.activeBoosts.forEach((boost, index) => {
            const remainingMs = boost.endTime - now;
            const progress = Math.max(0, remainingMs / boost.duration);
            const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
            
            // Get boost styling from shop items
            const shopItem = SHOP_ITEMS[boost.id];
            const boostColor = shopItem?.color || CONFIG.COLORS.TEXT_PRIMARY;
            const barColor = shopItem?.barColor || boostColor;
            
            // Pulse effect when low time
            const isLowTime = remainingSec <= 3;
            const pulseAlpha = isLowTime ? 0.8 + Math.sin(time * 10) * 0.2 : 1;
            
            // Container background with glow
            ctx.save();
            if (!isLowTime) {
                ctx.shadowColor = boostColor;
                ctx.shadowBlur = 8 + Math.sin(time * 3) * 3;
            } else {
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10 + Math.sin(time * 10) * 5;
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            Utils.drawRoundRect(ctx, barX, barY, barWidth, barHeight, 8);
            ctx.fill();
            ctx.restore();
            
            // Border
            ctx.strokeStyle = isLowTime ? 
                Utils.colorWithAlpha('#ff4444', pulseAlpha) : 
                Utils.colorWithAlpha(boostColor, 0.6);
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, barX, barY, barWidth, barHeight, 8);
            ctx.stroke();
            
            // Progress bar background
            const progressBarX = barX + 30;
            const progressBarY = barY + 20;
            const progressBarWidth = barWidth - 40;
            const progressBarHeight = 6;
            
            ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
            Utils.drawRoundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 3);
            ctx.fill();
            
            // Progress bar fill with gradient
            if (progress > 0) {
                const fillWidth = progressBarWidth * progress;
                const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + fillWidth, 0);
                progressGradient.addColorStop(0, boostColor);
                progressGradient.addColorStop(1, barColor);
                ctx.fillStyle = progressGradient;
                Utils.drawRoundRect(ctx, progressBarX, progressBarY, fillWidth, progressBarHeight, 3);
                ctx.fill();
                
                // Shine effect on progress bar
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                Utils.drawRoundRect(ctx, progressBarX, progressBarY, fillWidth, progressBarHeight / 2, 3);
                ctx.fill();
            }
            
            // Icon with glow
            ctx.save();
            ctx.shadowColor = boostColor;
            ctx.shadowBlur = 6;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(boost.icon, barX + 16, barY + 12);
            ctx.restore();
            
            // Timer text
            const timerColor = isLowTime ? CONFIG.COLORS.TEXT_DANGER : '#ffffff';
            this.graphics.drawText(`${remainingSec}s`, barX + barWidth - 10, barY + 12, {
                size: 12,
                color: timerColor,
                align: 'right',
                bold: true
            });
            
            // Boost name (abbreviated)
            const shortName = boost.name.split(' ')[0];
            this.graphics.drawText(shortName, progressBarX + 5, barY + 10, {
                size: 10,
                color: CONFIG.COLORS.TEXT_SECONDARY,
                align: 'left',
                bold: false
            });
            
            barY += barHeight + barSpacing;
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
        
        // Check shop popup clicks
        if (this.showShopPopup) {
            const popupAction = this.checkShopPopupClick(screenPos.x, screenPos.y);
            if (popupAction) {
                if (popupAction.type === 'button' && popupAction.action === 'close') {
                    this.closeShopPopup();
                    return { type: 'shop', action: 'close' };
                } else if (popupAction.type === 'purchase') {
                    return { type: 'shop', action: 'purchase', item: popupAction.item };
                }
            }
            // Click outside popup - close it
            this.closeShopPopup();
            return { type: 'shop', action: 'close' };
        }
        
        // Check settings gear click
        if (this.checkSettingsClick(screenPos.x, screenPos.y)) {
            this.toggleSettingsPopup();
            return { type: 'settings', action: 'open' };
        }
        
        // Check shop cart click
        if (this.checkShopClick(screenPos.x, screenPos.y)) {
            this.toggleShopPopup();
            return { type: 'shop', action: 'open' };
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
    showGameOver(gameState, platformBalance = 0, continueCost = 100) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Ensure values are numbers
        platformBalance = Number(platformBalance) || 0;
        continueCost = Number(continueCost) || 100;
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);
        
        // Popup box
        const popupWidth = Math.min(420, width * 0.85);
        const popupHeight = Math.min(540, height * 0.75);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;
        
        // Popup background with darker theme
        ctx.fillStyle = 'rgba(15, 15, 20, 0.98)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
        
        // Double border effect (tower defense style)
        ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
        ctx.lineWidth = 4;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX + 6, popupY + 6, popupWidth - 12, popupHeight - 12);
        
        // Title
        this.graphics.drawText('💀 GAME OVER 💀', width / 2, popupY + 55, {
            size: 40,
            color: CONFIG.COLORS.TEXT_DANGER,
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Stats section with header
        const statsY = popupY + 110;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.fillRect(popupX + 20, statsY, popupWidth - 40, 160);
        
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 1;
        ctx.strokeRect(popupX + 20, statsY, popupWidth - 40, 160);
        
        const stats = [
            `Wave Reached: ${gameState.wave}`,
            `Score: ${Utils.formatNumber(gameState.score)}`,
            `Kills: ${gameState.kills}`,
            `Time: ${Utils.formatTime(gameState.playTime)}`
        ];
        
        let y = statsY + 28;
        stats.forEach(stat => {
            this.graphics.drawText(stat, width / 2, y, {
                size: 20,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                shadow: true
            });
            y += 35;
        });
        
        // Buttons section
        const buttonWidth = 200;
        const buttonHeight = 55;
        const isFullscreen = document.body.classList.contains('game-fullscreen');
        const spacing = 12;
        const canAffordContinue = platformBalance >= continueCost;
        
        // Continue info box (if can't afford)
        if (!canAffordContinue) {
            const infoY = popupY + popupHeight - 200;
            const infoWidth = popupWidth - 40;
            const infoHeight = 50;
            const infoX = popupX + 20;
            
            // Info box background
            ctx.fillStyle = 'rgba(255, 170, 0, 0.1)';
            ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
            
            ctx.strokeStyle = CONFIG.COLORS.TEXT_WARNING;
            ctx.lineWidth = 2;
            ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);
            
            this.graphics.drawText('💎 Need Platform Coins to Continue', width / 2, infoY + 18, {
                size: 14,
                color: CONFIG.COLORS.TEXT_WARNING,
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: false
            });
            this.graphics.drawText(`You have ${platformBalance} • Need ${continueCost}`, width / 2, infoY + 35, {
                size: 12,
                color: '#aaaaaa',
                align: 'center',
                baseline: 'middle',
                shadow: false
            });
        }
        
        // Adjust button positions based on fullscreen state
        let buttonY;
        if (isFullscreen) {
            // Three buttons: Continue, Retry, and Exit Fullscreen
            const totalHeight = buttonHeight * 3 + spacing * 2;
            buttonY = popupY + popupHeight - totalHeight - 25;
            
            // Continue button (if can afford)
            const continueButtonX = (width - buttonWidth) / 2;
            if (canAffordContinue) {
                this.continueButton = {
                    x: continueButtonX,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
                
                // Continue button - bright green with border
                ctx.fillStyle = 'rgba(0, 200, 100, 0.95)';
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.fill();
                
                ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
                ctx.lineWidth = 3;
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.stroke();
                
                // Button text with icon
                this.graphics.drawText('💎 CONTINUE', width / 2, buttonY + buttonHeight / 2 - 8, {
                    size: 22,
                    color: '#000000',
                    align: 'center',
                    baseline: 'middle',
                    bold: true,
                    shadow: false
                });
                
                this.graphics.drawText(`${continueCost} Platform Coins`, width / 2, buttonY + buttonHeight / 2 + 12, {
                    size: 13,
                    color: 'rgba(0, 0, 0, 0.7)',
                    align: 'center',
                    baseline: 'middle',
                    bold: false,
                    shadow: false
                });
                
                buttonY += buttonHeight + spacing;
            } else {
                this.continueButton = null;
            }
            
            // Retry button
            const retryButtonX = (width - buttonWidth) / 2;
            this.retryButton = {
                x: retryButtonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            };
            
            ctx.fillStyle = 'rgba(200, 40, 40, 0.9)';
            Utils.drawRoundRect(ctx, retryButtonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, retryButtonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.stroke();
            
            this.graphics.drawText('🔄 RETRY', width / 2, buttonY + buttonHeight / 2, {
                size: 24,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: false
            });
            
            // Exit Fullscreen button
            const exitButtonY = buttonY + buttonHeight + spacing;
            this.exitFullscreenButton = {
                x: retryButtonX,
                y: exitButtonY,
                width: buttonWidth,
                height: buttonHeight
            };
            
            ctx.fillStyle = 'rgba(50, 60, 70, 0.9)';
            Utils.drawRoundRect(ctx, retryButtonX, exitButtonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(100, 120, 140, 0.8)';
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, retryButtonX, exitButtonY, buttonWidth, buttonHeight, 8);
            ctx.stroke();
            
            this.graphics.drawText('EXIT FULLSCREEN', width / 2, exitButtonY + buttonHeight / 2, {
                size: 18,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: false
            });
        } else {
            // Continue and Retry buttons
            const totalHeight = canAffordContinue ? buttonHeight * 2 + spacing : buttonHeight;
            buttonY = popupY + popupHeight - totalHeight - 25;
            
            // Continue button (if can afford)
            if (canAffordContinue) {
                const continueButtonX = (width - buttonWidth) / 2;
                this.continueButton = {
                    x: continueButtonX,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
                
                // Continue button - bright green with border
                ctx.fillStyle = 'rgba(0, 200, 100, 0.95)';
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.fill();
                
                ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
                ctx.lineWidth = 3;
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.stroke();
                
                // Button text with icon
                this.graphics.drawText('💎 CONTINUE', width / 2, buttonY + buttonHeight / 2 - 8, {
                    size: 22,
                    color: '#000000',
                    align: 'center',
                    baseline: 'middle',
                    bold: true,
                    shadow: false
                });
                
                this.graphics.drawText(`${continueCost} Platform Coins`, width / 2, buttonY + buttonHeight / 2 + 12, {
                    size: 13,
                    color: 'rgba(0, 0, 0, 0.7)',
                    align: 'center',
                    baseline: 'middle',
                    bold: false,
                    shadow: false
                });
                
                buttonY += buttonHeight + spacing;
            } else {
                this.continueButton = null;
            }
            
            // Retry button
            const buttonX = (width - buttonWidth) / 2;
            this.retryButton = {
                x: buttonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            };
            this.exitFullscreenButton = null;
            
            ctx.fillStyle = 'rgba(200, 40, 40, 0.9)';
            Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.stroke();
            
            this.graphics.drawText('🔄 RETRY', width / 2, buttonY + buttonHeight / 2, {
                size: 24,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: false
            });
        }
    }

    // Check if continue button was clicked
    isContinueButtonClicked(screenX, screenY) {
        if (!this.continueButton) return false;
        
        return screenX >= this.continueButton.x &&
               screenX <= this.continueButton.x + this.continueButton.width &&
               screenY >= this.continueButton.y &&
               screenY <= this.continueButton.y + this.continueButton.height;
    }
    
    // Check if retry button was clicked
    isRetryButtonClicked(screenX, screenY) {
        if (!this.retryButton) return false;
        
        return screenX >= this.retryButton.x &&
               screenX <= this.retryButton.x + this.retryButton.width &&
               screenY >= this.retryButton.y &&
               screenY <= this.retryButton.y + this.retryButton.height;
    }
    
    // Check if exit fullscreen button was clicked
    isExitFullscreenButtonClicked(screenX, screenY) {
        if (!this.exitFullscreenButton) return false;
        
        return screenX >= this.exitFullscreenButton.x &&
               screenX <= this.exitFullscreenButton.x + this.exitFullscreenButton.width &&
               screenY >= this.exitFullscreenButton.y &&
               screenY <= this.exitFullscreenButton.y + this.exitFullscreenButton.height;
    }
    
    // Reset retry button
    clearRetryButton() {
        this.retryButton = null;
        this.continueButton = null;
        this.exitFullscreenButton = null;
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
    
    // Shop popup rendering
    renderShopPopup(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Overlay with animated gradient
        const time = Date.now() * 0.001;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);
        
        // Popup box
        const popupWidth = Math.min(380, width * 0.92);
        const popupHeight = Math.min(520, height * 0.85);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;
        
        // Popup background with gradient
        const gradient = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupHeight);
        gradient.addColorStop(0, 'rgba(20, 25, 35, 0.98)');
        gradient.addColorStop(1, 'rgba(10, 12, 18, 0.98)');
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, popupX, popupY, popupWidth, popupHeight, 12);
        ctx.fill();
        
        // Animated outer glow
        const glowIntensity = 0.3 + Math.sin(time * 2) * 0.1;
        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 20 * glowIntensity;
        ctx.strokeStyle = CONFIG.COLORS.TEXT_WARNING;
        ctx.lineWidth = 3;
        Utils.drawRoundRect(ctx, popupX, popupY, popupWidth, popupHeight, 12);
        ctx.stroke();
        ctx.restore();
        
        // Inner border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, popupX + 4, popupY + 4, popupWidth - 8, popupHeight - 8, 10);
        ctx.stroke();
        
        // Title with animated sparkle
        const titleY = popupY + 40;
        this.graphics.drawText('🛒 POWER SHOP 🛒', width / 2, titleY, {
            size: 24,
            color: CONFIG.COLORS.TEXT_WARNING,
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Player coins display with coin icon animation
        const coinBounce = Math.sin(time * 4) * 2;
        this.graphics.drawText(`💰 ${Utils.formatNumber(gameState.coins)}`, width / 2, popupY + 68 + coinBounce, {
            size: 20,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            bold: true
        });
        
        // Active boosts section (inside popup, at top)
        if (gameState.activeBoosts && gameState.activeBoosts.length > 0) {
            this.renderActiveBoostsInShop(popupX + 15, popupY + 90, popupWidth - 30, gameState);
        }
        
        // Shop items section
        const hasActiveBoosts = gameState.activeBoosts && gameState.activeBoosts.length > 0;
        const contentWidth = popupWidth - 30;
        const contentX = popupX + 15;
        let contentY = hasActiveBoosts ? popupY + 90 + 60 : popupY + 95;
        
        this.shopItems = [];
        
        // Render shop items
        const items = Object.values(SHOP_ITEMS);
        const itemHeight = 65;
        const itemSpacing = 8;
        
        for (const item of items) {
            this.renderShopItem(contentX, contentY, contentWidth, itemHeight, item, gameState);
            contentY += itemHeight + itemSpacing;
        }
        
        // Close button
        contentY += 10;
        const buttonHeight = 40;
        this.renderShopPopupButton(contentX, contentY, contentWidth, buttonHeight, '✕ CLOSE', 'close', false);
    }
    
    // Render active boosts inside shop popup
    renderActiveBoostsInShop(x, y, width, gameState) {
        const ctx = this.graphics.ctx;
        const boostHeight = 50;
        const now = Date.now();
        
        // Section background
        ctx.fillStyle = 'rgba(0, 255, 136, 0.05)';
        Utils.drawRoundRect(ctx, x, y, width, boostHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, x, y, width, boostHeight, 8);
        ctx.stroke();
        
        // Title
        this.graphics.drawText('⚡ ACTIVE BOOSTS', x + 10, y + 12, {
            size: 10,
            color: CONFIG.COLORS.TEXT_SECONDARY,
            align: 'left',
            bold: true
        });
        
        // Render each active boost as a mini bar
        const boostCount = gameState.activeBoosts.length;
        const barWidth = (width - 20) / Math.min(boostCount, 3);
        const barHeight = 22;
        const barY = y + 22;
        
        gameState.activeBoosts.slice(0, 3).forEach((boost, index) => {
            const barX = x + 10 + index * barWidth;
            const remainingMs = boost.endTime - now;
            const progress = Math.max(0, remainingMs / boost.duration);
            const remainingSec = Math.ceil(remainingMs / 1000);
            
            // Get boost color
            const item = SHOP_ITEMS[boost.id];
            const boostColor = item?.color || CONFIG.COLORS.TEXT_PRIMARY;
            const barColor = item?.barColor || boostColor;
            
            // Bar background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            Utils.drawRoundRect(ctx, barX, barY, barWidth - 5, barHeight, 4);
            ctx.fill();
            
            // Progress bar with gradient
            if (progress > 0) {
                const barGradient = ctx.createLinearGradient(barX, barY, barX + (barWidth - 5) * progress, barY);
                barGradient.addColorStop(0, boostColor);
                barGradient.addColorStop(1, barColor);
                ctx.fillStyle = barGradient;
                Utils.drawRoundRect(ctx, barX, barY, (barWidth - 5) * progress, barHeight, 4);
                ctx.fill();
            }
            
            // Icon and time
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(boost.icon, barX + 4, barY + barHeight / 2);
            
            this.graphics.drawText(`${remainingSec}s`, barX + barWidth - 12, barY + barHeight / 2, {
                size: 11,
                color: remainingSec <= 3 ? CONFIG.COLORS.TEXT_DANGER : '#ffffff',
                align: 'right',
                bold: true
            });
        });
    }
    
    renderShopItem(x, y, width, height, item, gameState) {
        const ctx = this.graphics.ctx;
        const canAfford = gameState.coins >= item.cost;
        const time = Date.now() * 0.001;
        
        // Check if this boost type is already active
        const isActive = gameState.activeBoosts && gameState.activeBoosts.some(b => b.id === item.id);
        
        // Store for click detection
        this.shopItems.push({
            x, y, width, height,
            item,
            canAfford
        });
        
        // Item background with gradient
        const bgGradient = ctx.createLinearGradient(x, y, x + width, y);
        if (isActive) {
            bgGradient.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
            bgGradient.addColorStop(1, 'rgba(0, 255, 136, 0.05)');
        } else if (canAfford) {
            bgGradient.addColorStop(0, `${item.color || 'rgba(255, 215, 0, 0.15)'}22`);
            bgGradient.addColorStop(1, 'rgba(255, 215, 0, 0.05)');
        } else {
            bgGradient.addColorStop(0, 'rgba(60, 60, 60, 0.2)');
            bgGradient.addColorStop(1, 'rgba(40, 40, 40, 0.1)');
        }
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Animated border for affordable items
        if (canAfford && !isActive) {
            const pulseAlpha = 0.4 + Math.sin(time * 3) * 0.2;
            ctx.strokeStyle = Utils.colorWithAlpha(item.color || CONFIG.COLORS.TEXT_WARNING, pulseAlpha);
            ctx.lineWidth = 2;
        } else if (isActive) {
            ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(80, 80, 80, 0.4)';
            ctx.lineWidth = 1;
        }
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        
        // Icon with glow effect for affordable items
        const iconX = x + 35;
        const iconY = y + height / 2;
        
        if (canAfford && !isActive) {
            ctx.save();
            ctx.shadowColor = item.color || CONFIG.COLORS.TEXT_WARNING;
            ctx.shadowBlur = 10 + Math.sin(time * 4) * 5;
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.icon, iconX, iconY);
            ctx.restore();
        } else {
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = canAfford || isActive ? '#ffffff' : 'rgba(150, 150, 150, 0.5)';
            ctx.fillText(item.icon, iconX, iconY);
        }
        
        // Active indicator
        if (isActive) {
            this.graphics.drawText('ACTIVE ✓', x + width - 15, y + 12, {
                size: 10,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'right',
                bold: true
            });
        }
        
        // Item name and description
        const textX = x + 70;
        const textColor = canAfford || isActive ? CONFIG.COLORS.TEXT_PRIMARY : 'rgba(180, 180, 180, 0.5)';
        const descColor = canAfford || isActive ? CONFIG.COLORS.TEXT_SECONDARY : 'rgba(120, 120, 120, 0.5)';
        
        this.graphics.drawText(item.name, textX, y + height / 2 - 10, {
            size: 15,
            color: textColor,
            bold: true,
            align: 'left'
        });
        
        this.graphics.drawText(item.description, textX, y + height / 2 + 10, {
            size: 12,
            color: descColor,
            align: 'left'
        });
        
        // Price with buy button look
        const priceX = x + width - 55;
        const priceY = y + height / 2;
        const priceWidth = 80;
        const priceHeight = 30;
        
        // Price button background
        if (canAfford && !isActive) {
            ctx.fillStyle = 'rgba(255, 200, 0, 0.2)';
            Utils.drawRoundRect(ctx, priceX - 25, priceY - priceHeight/2, priceWidth, priceHeight, 6);
            ctx.fill();
            ctx.strokeStyle = CONFIG.COLORS.TEXT_WARNING;
            ctx.lineWidth = 1;
            Utils.drawRoundRect(ctx, priceX - 25, priceY - priceHeight/2, priceWidth, priceHeight, 6);
            ctx.stroke();
        }
        
        const priceColor = isActive ? CONFIG.COLORS.TEXT_SECONDARY : 
                          canAfford ? CONFIG.COLORS.TEXT_WARNING : CONFIG.COLORS.TEXT_DANGER;
        this.graphics.drawText(`${item.cost} 💰`, priceX + 15, priceY, {
            size: 14,
            color: priceColor,
            align: 'center',
            bold: true
        });
    }
    
    renderShopPopupButton(x, y, width, height, text, action, disabled) {
        const ctx = this.graphics.ctx;
        
        // Store for click detection
        this.shopItems.push({
            x, y, width, height,
            action,
            disabled,
            isButton: true
        });
        
        // Button background
        ctx.fillStyle = disabled ? 'rgba(60, 60, 60, 0.3)' : 'rgba(255, 215, 0, 0.15)';
        Utils.drawRoundRect(ctx, x, y, width, height, 8);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = disabled ? 'rgba(100, 100, 100, 0.5)' : CONFIG.COLORS.TEXT_WARNING;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 8);
        ctx.stroke();
        
        // Button text
        this.graphics.drawText(text, x + width / 2, y + height / 2, {
            size: 18,
            color: disabled ? '#666666' : CONFIG.COLORS.TEXT_WARNING,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: !disabled
        });
    }
    
    renderActiveBoosts(x, y, gameState) {
        if (gameState.activeBoosts.length === 0) return;
        
        const ctx = this.graphics.ctx;
        const boostWidth = 160;
        const boostHeight = 60;
        const spacing = 10;
        
        // Title
        this.graphics.drawText('Active Boosts', x + boostWidth / 2, y, {
            size: 16,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            bold: true
        });
        
        let boostY = y + 25;
        
        for (const boost of gameState.activeBoosts) {
            // Boost background
            ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
            Utils.drawRoundRect(ctx, x, boostY, boostWidth, boostHeight, 6);
            ctx.fill();
            
            // Boost border
            ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
            ctx.lineWidth = 1;
            Utils.drawRoundRect(ctx, x, boostY, boostWidth, boostHeight, 6);
            ctx.stroke();
            
            // Icon and name
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
            ctx.fillText(boost.icon, x + 8, boostY + 8);
            
            this.graphics.drawText(boost.name, x + 35, boostY + 12, {
                size: 12,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'left',
                bold: true
            });
            
            // Remaining time
            const remainingMs = boost.endTime - Date.now();
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            this.graphics.drawText(`${remainingSeconds}s`, x + boostWidth - 8, boostY + 12, {
                size: 12,
                color: CONFIG.COLORS.TEXT_WARNING,
                align: 'right',
                bold: true
            });
            
            // Progress bar
            const progress = 1 - ((Date.now() - boost.startTime) / boost.duration);
            const barWidth = boostWidth - 16;
            const barHeight = 8;
            const barX = x + 8;
            const barY = boostY + boostHeight - 16;
            
            // Bar background
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            Utils.drawRoundRect(ctx, barX, barY, barWidth, barHeight, 4);
            ctx.fill();
            
            // Bar progress
            if (progress > 0) {
                ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
                Utils.drawRoundRect(ctx, barX, barY, barWidth * progress, barHeight, 4);
                ctx.fill();
            }
            
            boostY += boostHeight + spacing;
        }
    }
    
    // Shop interaction methods
    checkShopClick(screenX, screenY) {
        if (!this.shopButton) return false;
        
        return screenX >= this.shopButton.x && 
               screenX <= this.shopButton.x + this.shopButton.width &&
               screenY >= this.shopButton.y && 
               screenY <= this.shopButton.y + this.shopButton.height;
    }
    
    checkShopPopupClick(screenX, screenY) {
        if (!this.showShopPopup) return null;
        
        for (const shopItem of this.shopItems) {
            if (screenX >= shopItem.x && 
                screenX <= shopItem.x + shopItem.width &&
                screenY >= shopItem.y && 
                screenY <= shopItem.y + shopItem.height) {
                
                if (shopItem.isButton) {
                    return { type: 'button', action: shopItem.action };
                } else if (shopItem.item && shopItem.canAfford) {
                    return { type: 'purchase', item: shopItem.item };
                }
            }
        }
        
        return null;
    }
    
    toggleShopPopup() {
        this.showShopPopup = !this.showShopPopup;
        this.shopItems = []; // Reset shop items when toggling
    }
    
    closeShopPopup() {
        this.showShopPopup = false;
        this.shopItems = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
