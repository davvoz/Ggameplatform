/**
 * UI Manager
 * Handles all UI rendering and interactions
 */

import { CONFIG, CANNON_TYPES, UI_CONFIG, SHOP_ITEMS, SPECIAL_ABILITIES } from './config.js';
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
        
        // Shop buttons (bottom bar for tower types)
        this.shopButtons = [];
        this.setupShopButtons();
        
        // Left sidebar with abilities and shop items
        this.sidebarButtons = [];
        this.setupSidebar();
        
        // Game over button
        this.retryButton = null;
        
        // Settings
        this.settingsButton = null;
        this.showSettingsPopup = false;
        this.settingsPopupButtons = [];
        this.settingsCheckboxes = [];
        
        // Targeting mode for bomb ability
        this.bombTargetingMode = false;
        this.targetingCallback = null;
    }

    /**
     * Setup the left sidebar with abilities and shop items
     */
    setupSidebar() {
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        const sidebarWidth = UI_CONFIG.SIDEBAR_WIDTH || 64;
        const buttonSize = 46;
        const buttonSpacing = 5;
        const sidebarX = (sidebarWidth - buttonSize) / 2; // Center buttons in sidebar
        const startY = UI_CONFIG.TOP_BAR_HEIGHT + 10;
        
        this.sidebarButtons = [];
        let currentY = startY;
        
        // Add ability buttons first
        for (const [key, ability] of Object.entries(SPECIAL_ABILITIES)) {
            this.sidebarButtons.push({
                id: key,
                type: 'ability',
                x: sidebarX,
                y: currentY,
                width: buttonSize,
                height: buttonSize,
                data: ability
            });
            currentY += buttonSize + buttonSpacing;
        }
        
        // Add separator space
        currentY += 6;
        
        // Add shop item buttons
        for (const [key, item] of Object.entries(SHOP_ITEMS)) {
            this.sidebarButtons.push({
                id: key,
                type: 'shop',
                x: sidebarX,
                y: currentY,
                width: buttonSize,
                height: buttonSize,
                data: item
            });
            currentY += buttonSize + buttonSpacing;
        }
        
        // Store sidebar dimensions
        this.sidebarWidth = sidebarWidth;
        this.sidebarHeight = currentY - startY + 10;
    }

    setupAbilityButtons() {
        // Setup ability buttons on the left side of the screen
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        const buttonSize = 56;
        const buttonSpacing = 10;
        const startX = 10;
        const startY = UI_CONFIG.TOP_BAR_HEIGHT + 80; // Below boost bars area
        
        this.abilityButtons = [
            {
                id: 'BOMB',
                x: startX,
                y: startY,
                width: buttonSize,
                height: buttonSize,
                ability: SPECIAL_ABILITIES.BOMB
            },
            {
                id: 'PUSHBACK',
                x: startX,
                y: startY + buttonSize + buttonSpacing,
                width: buttonSize,
                height: buttonSize,
                ability: SPECIAL_ABILITIES.PUSHBACK
            }
        ];
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
        
        // Render left sidebar with abilities and shop items
        this.renderSidebar(gameState);
        
        // Render active boost bars on screen (always visible when boosts are active)
        this.renderActiveBoostBars(gameState);
        
        // Render bomb targeting overlay if in targeting mode
        if (this.bombTargetingMode) {
            this.renderBombTargeting(gameState);
        }
        
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
        
        // Position bars to the right of the sidebar
        const barX = (this.sidebarWidth || 64) + 8;
        let barY = UI_CONFIG.TOP_BAR_HEIGHT + 10;
        const barWidth = 120;
        const barHeight = 28;
        const barSpacing = 6;
        
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

    /**
     * Render the left sidebar with abilities and shop items
     */
    renderSidebar(gameState) {
        const ctx = this.graphics.ctx;
        const now = Date.now();
        const time = now * 0.001;
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const sidebarWidth = UI_CONFIG.SIDEBAR_WIDTH || 64;
        
        // Draw sidebar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, UI_CONFIG.TOP_BAR_HEIGHT, sidebarWidth, height - UI_CONFIG.TOP_BAR_HEIGHT - UI_CONFIG.SHOP_HEIGHT);
        
        // Draw sidebar border
        ctx.strokeStyle = CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sidebarWidth, UI_CONFIG.TOP_BAR_HEIGHT);
        ctx.lineTo(sidebarWidth, height - UI_CONFIG.SHOP_HEIGHT);
        ctx.stroke();
        
        // Get ability states
        const abilities = gameState.specialAbilities || {
            BOMB: { level: 1, lastUsed: 0, uses: 0 },
            PUSHBACK: { level: 1, lastUsed: 0, uses: 0 }
        };
        
        this.sidebarButtons.forEach((button, index) => {
            const cornerRadius = 6;
            const centerX = button.x + button.width / 2;
            const centerY = button.y + button.height / 2;
            
            if (button.type === 'ability') {
                // Render ability button
                const ability = button.data;
                const abilityState = abilities[button.id] || { level: 1, lastUsed: 0, uses: 0 };
                const level = abilityState.level;
                const lastUsed = abilityState.lastUsed;
                const cooldown = ability.baseCooldown;
                const elapsed = now - lastUsed;
                const isReady = elapsed >= cooldown;
                const cooldownProgress = Math.min(1, elapsed / cooldown);
                
                // Button background
                ctx.save();
                if (isReady) {
                    ctx.shadowColor = ability.glowColor;
                    ctx.shadowBlur = 8;
                }
                
                const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
                if (isReady) {
                    bgGradient.addColorStop(0, Utils.colorWithAlpha(ability.color, 0.9));
                    bgGradient.addColorStop(1, Utils.colorWithAlpha(ability.color, 0.6));
                } else {
                    bgGradient.addColorStop(0, 'rgba(40, 40, 50, 0.9)');
                    bgGradient.addColorStop(1, 'rgba(25, 25, 35, 0.9)');
                }
                ctx.fillStyle = bgGradient;
                Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
                ctx.fill();
                ctx.restore();
                
                // Cooldown overlay
                if (!isReady) {
                    ctx.save();
                    ctx.globalAlpha = 0.7;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    const startAngle = -Math.PI / 2;
                    const endAngle = startAngle + (1 - cooldownProgress) * Math.PI * 2;
                    ctx.arc(centerX, centerY, button.width / 2, startAngle, endAngle);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                    
                    // Cooldown timer
                    const remainingSec = Math.ceil((cooldown - elapsed) / 1000);
                    ctx.save();
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`${remainingSec}s`, centerX, centerY + 12);
                    ctx.restore();
                }
                
                // Border
                ctx.strokeStyle = isReady ? ability.glowColor : 'rgba(100, 100, 120, 0.6)';
                ctx.lineWidth = isReady ? 2 : 1;
                Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
                ctx.stroke();
                
                // Icon
                ctx.save();
                ctx.font = `${button.width * 0.45}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = isReady ? 1.0 : 0.5;
                ctx.fillText(ability.icon, centerX, centerY - 4);
                ctx.restore();
                
                // Level indicator
                ctx.save();
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = isReady ? '#ffdd00' : '#888888';
                ctx.fillText(`Lv${level}`, centerX, button.y + button.height - 6);
                ctx.restore();
                
            } else if (button.type === 'shop') {
                // Render shop item button
                const item = button.data;
                const canAfford = gameState.coins >= item.cost;
                
                // Check if temporary boost is already active
                const isActive = item.type === 'temporary' && 
                    gameState.activeBoosts?.some(b => b.type === item.effect.type);
                const isDisabled = !canAfford || isActive;
                
                // Button background
                ctx.save();
                const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
                if (isActive) {
                    // Active boost - show with pulsing glow
                    const pulse = Math.sin(time * 3) * 0.2 + 0.8;
                    ctx.shadowColor = item.color;
                    ctx.shadowBlur = 10 * pulse;
                    bgGradient.addColorStop(0, Utils.colorWithAlpha(item.color, 0.7));
                    bgGradient.addColorStop(1, Utils.colorWithAlpha(item.color, 0.4));
                } else if (canAfford) {
                    bgGradient.addColorStop(0, Utils.colorWithAlpha(item.color, 0.4));
                    bgGradient.addColorStop(1, Utils.colorWithAlpha(item.color, 0.2));
                } else {
                    bgGradient.addColorStop(0, 'rgba(40, 40, 50, 0.8)');
                    bgGradient.addColorStop(1, 'rgba(25, 25, 35, 0.8)');
                }
                ctx.fillStyle = bgGradient;
                Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
                ctx.fill();
                ctx.restore();
                
                // Border
                ctx.strokeStyle = isActive ? item.color : (canAfford ? Utils.colorWithAlpha(item.color, 0.8) : 'rgba(80, 80, 100, 0.5)');
                ctx.lineWidth = isActive ? 2 : 1;
                Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
                ctx.stroke();
                
                // Icon
                ctx.save();
                ctx.font = `${button.width * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = isDisabled && !isActive ? 0.4 : 1.0;
                ctx.fillText(item.icon, centerX, centerY - 4);
                ctx.restore();
                
                // Cost or "ACTIVE" label
                ctx.save();
                ctx.font = 'bold 8px Arial';
                ctx.textAlign = 'center';
                if (isActive) {
                    ctx.fillStyle = '#00ff88';
                    ctx.fillText('ACTIVE', centerX, button.y + button.height - 5);
                } else {
                    ctx.fillStyle = canAfford ? '#ffdd00' : '#666666';
                    ctx.fillText(`${item.cost}`, centerX, button.y + button.height - 5);
                }
                ctx.restore();
            }
        });
    }

    /**
     * Render special ability buttons (Bomb and Pushback)
     */
    renderAbilityButtons(gameState) {
        const ctx = this.graphics.ctx;
        const now = Date.now();
        const time = now * 0.001;
        
        // Get ability state from game state
        const abilities = gameState.specialAbilities || {
            BOMB: { level: 1, lastUsed: 0, uses: 0 },
            PUSHBACK: { level: 1, lastUsed: 0, uses: 0 }
        };
        
        this.abilityButtons.forEach((button, index) => {
            const ability = button.ability;
            const abilityState = abilities[button.id] || { level: 1, lastUsed: 0, uses: 0 };
            const level = abilityState.level;
            const lastUsed = abilityState.lastUsed;
            const cooldown = ability.baseCooldown;
            const elapsed = now - lastUsed;
            const isReady = elapsed >= cooldown;
            const cooldownProgress = Math.min(1, elapsed / cooldown);
            
            const cornerRadius = 10;
            const centerX = button.x + button.width / 2;
            const centerY = button.y + button.height / 2;
            
            // Button background with glow when ready
            ctx.save();
            if (isReady) {
                // Pulsing glow effect when ready
                const pulse = Math.sin(time * 4 + index) * 0.3 + 0.7;
                ctx.shadowColor = ability.glowColor;
                ctx.shadowBlur = 15 * pulse;
            }
            
            // Background gradient
            const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
            if (isReady) {
                bgGradient.addColorStop(0, Utils.colorWithAlpha(ability.color, 0.9));
                bgGradient.addColorStop(1, Utils.colorWithAlpha(ability.color, 0.6));
            } else {
                bgGradient.addColorStop(0, 'rgba(40, 40, 50, 0.9)');
                bgGradient.addColorStop(1, 'rgba(25, 25, 35, 0.9)');
            }
            ctx.fillStyle = bgGradient;
            Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
            ctx.fill();
            ctx.restore();
            
            // Cooldown overlay (pie chart style)
            if (!isReady) {
                ctx.save();
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                const startAngle = -Math.PI / 2;
                const endAngle = startAngle + (1 - cooldownProgress) * Math.PI * 2;
                ctx.arc(centerX, centerY, button.width / 2, startAngle, endAngle);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                
                // Cooldown timer text
                const remainingSec = Math.ceil((cooldown - elapsed) / 1000);
                ctx.save();
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 4;
                ctx.fillText(`${remainingSec}s`, centerX, centerY + button.height / 4);
                ctx.restore();
            }
            
            // Border
            ctx.strokeStyle = isReady ? ability.glowColor : 'rgba(100, 100, 120, 0.6)';
            ctx.lineWidth = isReady ? 3 : 2;
            Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
            ctx.stroke();
            
            // Icon
            ctx.save();
            if (isReady) {
                ctx.shadowColor = ability.glowColor;
                ctx.shadowBlur = 10;
            }
            ctx.font = `${button.width * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = isReady ? 1.0 : 0.5;
            ctx.fillText(ability.icon, centerX, centerY - 5);
            ctx.restore();
            
            // Level indicator (stars at bottom)
            const levelY = button.y + button.height - 10;
            ctx.save();
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isReady ? '#ffdd00' : '#888888';
            const levelText = `Lv.${level}`;
            ctx.fillText(levelText, centerX, levelY);
            ctx.restore();
            
            // Uses counter (if any)
            if (abilityState.uses > 0) {
                ctx.save();
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'right';
                ctx.fillStyle = '#00ff88';
                ctx.fillText(`×${abilityState.uses}`, button.x + button.width - 5, button.y + 12);
                ctx.restore();
            }
            
            // Ready indicator animation
            if (isReady) {
                const readyPulse = Math.sin(time * 6) * 0.5 + 0.5;
                ctx.save();
                ctx.strokeStyle = Utils.colorWithAlpha('#ffffff', readyPulse * 0.6);
                ctx.lineWidth = 2;
                Utils.drawRoundRect(ctx, button.x - 2, button.y - 2, button.width + 4, button.height + 4, cornerRadius + 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    /**
     * Render bomb targeting overlay
     */
    renderBombTargeting(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const time = Date.now() * 0.001;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(255, 50, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        // Instruction text
        ctx.save();
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4400';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        const pulse = Math.sin(time * 5) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillText('💣 TAP TO DROP BOMB 💣', width / 2, UI_CONFIG.TOP_BAR_HEIGHT + 40);
        ctx.restore();
        
        // Cancel button
        const cancelBtnWidth = 120;
        const cancelBtnHeight = 40;
        const cancelBtnX = width / 2 - cancelBtnWidth / 2;
        const cancelBtnY = height - UI_CONFIG.SHOP_HEIGHT - 60;
        
        ctx.fillStyle = 'rgba(100, 30, 30, 0.9)';
        Utils.drawRoundRect(ctx, cancelBtnX, cancelBtnY, cancelBtnWidth, cancelBtnHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, cancelBtnX, cancelBtnY, cancelBtnWidth, cancelBtnHeight, 8);
        ctx.stroke();
        
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('❌ CANCEL', width / 2, cancelBtnY + cancelBtnHeight / 2);
        
        // Store cancel button position for click detection
        this.bombCancelButton = {
            x: cancelBtnX,
            y: cancelBtnY,
            width: cancelBtnWidth,
            height: cancelBtnHeight
        };
    }

    /**
     * Check if sidebar button was clicked (ability or shop item)
     */
    getClickedSidebarButton(screenPos) {
        for (const button of this.sidebarButtons) {
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

    /**
     * Check if ability button was clicked (legacy - uses sidebar)
     */
    getClickedAbilityButton(screenPos) {
        const clicked = this.getClickedSidebarButton(screenPos);
        if (clicked && clicked.type === 'ability') {
            return { id: clicked.id, ability: clicked.data };
        }
        return null;
    }

    /**
     * Check if bomb cancel button was clicked
     */
    isBombCancelButtonClicked(screenX, screenY) {
        if (!this.bombCancelButton) return false;
        return Utils.pointInRect(
            screenX, screenY,
            this.bombCancelButton.x, this.bombCancelButton.y,
            this.bombCancelButton.width, this.bombCancelButton.height
        );
    }

    /**
     * Enter bomb targeting mode
     */
    enterBombTargetingMode(callback) {
        this.bombTargetingMode = true;
        this.targetingCallback = callback;
    }

    /**
     * Exit bomb targeting mode
     */
    exitBombTargetingMode() {
        this.bombTargetingMode = false;
        this.targetingCallback = null;
        this.bombCancelButton = null;
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
        // Check if in bomb targeting mode
        if (this.bombTargetingMode) {
            // Check cancel button
            if (this.isBombCancelButtonClicked(screenPos.x, screenPos.y)) {
                this.exitBombTargetingMode();
                return { type: 'ability', action: 'cancel_targeting' };
            }
            
            // Valid grid position for bomb
            if (this.isValidGridPos(gridPos)) {
                const callback = this.targetingCallback;
                this.exitBombTargetingMode();
                if (callback) {
                    callback(gridPos);
                }
                return { type: 'ability', action: 'bomb_placed', gridPos: gridPos };
            }
            return null;
        }
        
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
        
        // Check sidebar button clicks (abilities and shop items)
        const clickedSidebar = this.getClickedSidebarButton(screenPos);
        if (clickedSidebar) {
            if (clickedSidebar.type === 'ability') {
                return { type: 'ability', action: 'activate', abilityId: clickedSidebar.id };
            } else if (clickedSidebar.type === 'shop') {
                // Shop item from sidebar - trigger purchase
                return { type: 'shop', action: 'purchase', item: clickedSidebar.data };
            }
        }
        
        // Check settings gear click
        if (this.checkSettingsClick(screenPos.x, screenPos.y)) {
            this.toggleSettingsPopup();
            return { type: 'settings', action: 'open' };
        }
        
        // Check shop button clicks (tower types)
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
        
        // Reset Tutorial button
       
        
        // Close button
        contentY += 5;
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
    
    // ========== TUTORIAL UI ==========
    
    /**
     * Render tutorial overlay
     */
    renderTutorial(game) {
        if (!game.tutorial || !game.tutorial.isActive()) return;
        
        const ctx = this.graphics.ctx;
        const canvas = this.canvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const currentStep = game.tutorial.getCurrentStep();
        
        if (!currentStep) return;
        
        // Dark overlay - but exclude shop buttons area if they're highlighted
        if (currentStep.highlightShopButtons && this.shopButtons && this.shopButtons.length > 0) {
            // Calculate shop area bounds
            const firstButton = this.shopButtons[0];
            const lastButton = this.shopButtons[this.shopButtons.length - 1];
            const shopAreaX = firstButton.x - 10;
            const shopAreaY = firstButton.y - 10;
            const shopAreaWidth = (lastButton.x + lastButton.width) - firstButton.x + 20;
            const shopAreaHeight = firstButton.height + 20;
            
            // Draw overlay in sections, excluding shop area
            ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * game.tutorial.dialogAlpha})`;
            
            // Top section (above shop)
            ctx.fillRect(0, 0, width, shopAreaY);
            
            // Left section
            ctx.fillRect(0, shopAreaY, shopAreaX, shopAreaHeight);
            
            // Right section
            ctx.fillRect(shopAreaX + shopAreaWidth, shopAreaY, width - (shopAreaX + shopAreaWidth), shopAreaHeight);
            
            // Bottom section (below shop) - minimal or none if dialog is there
            const bottomStartY = shopAreaY + shopAreaHeight;
            if (bottomStartY < height) {
                ctx.fillRect(0, bottomStartY, width, height - bottomStartY);
            }
        } else {
            // Normal dark overlay
            ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * game.tutorial.dialogAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }
        
        // Highlight area if specified
        if (currentStep.highlightArea) {
            const area = currentStep.highlightArea;
            
            // Clear the highlighted area
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * game.tutorial.highlightAlpha})`;
            Utils.drawRoundRect(ctx, area.x, area.y, area.width, area.height, 10);
            ctx.fill();
            ctx.restore();
            
            // Border around highlighted area
            ctx.strokeStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            Utils.drawRoundRect(ctx, area.x - 2, area.y - 2, area.width + 4, area.height + 4, 10);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Highlight circle if specified
        if (currentStep.highlightCircle) {
            const circle = currentStep.highlightCircle;
            const gridX = circle.col * CONFIG.CELL_SIZE + (CONFIG.SIDEBAR_WIDTH || 64);
            const gridY = circle.row * CONFIG.CELL_SIZE + CONFIG.TOP_BAR_HEIGHT;
            const radius = (circle.radius || 1) * CONFIG.CELL_SIZE;
            
            // Clear the highlighted circle
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(gridX + CONFIG.CELL_SIZE / 2, gridY + CONFIG.CELL_SIZE / 2, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * game.tutorial.highlightAlpha})`;
            ctx.fill();
            ctx.restore();
            
            // Border around circle
            ctx.strokeStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(gridX + CONFIG.CELL_SIZE / 2, gridY + CONFIG.CELL_SIZE / 2, radius + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Highlight shop buttons if specified
        if (currentStep.highlightShopButtons && this.shopButtons && game.state) {
            const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.15; // Pulse animation
            const glowIntensity = 0.7 + Math.sin(Date.now() * 0.006) * 0.3; // Glow animation
            const playerCoins = game.state.coins;
            
            this.shopButtons.forEach((button) => {
                // Check if player can afford this tower
                const cannonType = button.id; // Use button.id instead of button.cannonType
                const cannonDef = button.cannon; // cannon data is in button.cannon
                if (!cannonDef) return;
                
                // Calculate actual cost with multiplier
                const baseCost = cannonDef.cost;
                let actualCost = baseCost;
                if (game.state.cannonPriceMultiplier && game.state.cannonPriceMultiplier[cannonType]) {
                    actualCost = Math.floor(baseCost * game.state.cannonPriceMultiplier[cannonType]);
                }
                
                const canAfford = playerCoins >= actualCost;
                
                // Only highlight affordable towers
                if (!canAfford) {
                    // Darken unaffordable towers
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, 8);
                    ctx.fill();
                    ctx.restore();
                    return;
                }
                
                const centerX = button.x + button.width / 2;
                const centerY = button.y + button.height / 2;
                
                ctx.save();
                
                // Translate to center for scaling
                ctx.translate(centerX, centerY);
                ctx.scale(pulseScale, pulseScale);
                ctx.translate(-centerX, -centerY);
                
                // Outer glow (multiple layers for stronger effect)
                for (let i = 0; i < 3; i++) {
                    ctx.shadowColor = `rgba(255, 215, 0, ${glowIntensity * 0.4})`;
                    ctx.shadowBlur = 20 + i * 10;
                    ctx.strokeStyle = `rgba(255, 215, 0, ${glowIntensity * 0.6})`;
                    ctx.lineWidth = 4;
                    Utils.drawRoundRect(ctx, button.x - 3, button.y - 3, button.width + 6, button.height + 6, 8);
                    ctx.stroke();
                }
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                
                // Bright border
                ctx.strokeStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.lineDashOffset = -Date.now() * 0.05; // Moving dashes
                Utils.drawRoundRect(ctx, button.x - 2, button.y - 2, button.width + 4, button.height + 4, 8);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Sparkle effect at corners
                const sparklePhase = (Date.now() * 0.01) % (Math.PI * 2);
                const sparkleAlpha = Math.abs(Math.sin(sparklePhase));
                ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha * 0.9})`;
                
                const sparkleSize = 6;
                const corners = [
                    {x: button.x, y: button.y},
                    {x: button.x + button.width, y: button.y},
                    {x: button.x, y: button.y + button.height},
                    {x: button.x + button.width, y: button.y + button.height}
                ];
                
                corners.forEach((corner, index) => {
                    const phase = sparklePhase + (index * Math.PI / 2);
                    if (Math.sin(phase) > 0.5) {
                        ctx.beginPath();
                        ctx.arc(corner.x, corner.y, sparkleSize, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Star rays
                        ctx.strokeStyle = `rgba(255, 255, 255, ${sparkleAlpha * 0.7})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(corner.x - sparkleSize * 1.5, corner.y);
                        ctx.lineTo(corner.x + sparkleSize * 1.5, corner.y);
                        ctx.moveTo(corner.x, corner.y - sparkleSize * 1.5);
                        ctx.lineTo(corner.x, corner.y + sparkleSize * 1.5);
                        ctx.stroke();
                    }
                });
                
                ctx.restore();
            });
        }
        
        // Arrow if specified
        if (currentStep.arrow) {
            const arrow = currentStep.arrow;
            const arrowSize = 30;
            let arrowX = arrow.x;
            let arrowY = arrow.y;
            
            // Apply bounce animation
            if (arrow.direction === 'down') {
                arrowY += game.tutorial.arrowBounce;
            } else if (arrow.direction === 'up') {
                arrowY -= game.tutorial.arrowBounce;
            } else if (arrow.direction === 'right') {
                arrowX += game.tutorial.arrowBounce;
            } else if (arrow.direction === 'left') {
                arrowX -= game.tutorial.arrowBounce;
            }
            
            // Draw arrow
            ctx.save();
            ctx.translate(arrowX, arrowY);
            
            // Rotate based on direction
            if (arrow.direction === 'down') {
                ctx.rotate(Math.PI);
            } else if (arrow.direction === 'left') {
                ctx.rotate(-Math.PI / 2);
            } else if (arrow.direction === 'right') {
                ctx.rotate(Math.PI / 2);
            }
            
            ctx.fillStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
            ctx.beginPath();
            ctx.moveTo(0, -arrowSize);
            ctx.lineTo(-arrowSize / 2, 0);
            ctx.lineTo(arrowSize / 2, 0);
            ctx.closePath();
            ctx.fill();
            
            // Arrow shadow
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 * game.tutorial.highlightAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Tutorial dialog
        if (game.tutorial.showDialog) {
            const dialogWidth = Math.min(450, width - 40);
            const dialogPadding = 20;
            const maxContentWidth = dialogWidth - (dialogPadding * 2);
            
            // Calculate required height based on content
            const titleHeight = 50;
            const progressHeight = 30;
            const continueHintHeight = currentStep.waitForAction === 'tap' ? 35 : 10;
            const skipButtonHeight = 40;
            
            // Word wrap for description
            ctx.font = '16px Arial';
            const words = currentStep.description.split(' ');
            const wrappedLines = [];
            let currentLine = '';
            
            for (const word of words) {
                // Check for manual line breaks
                if (word.includes('\n')) {
                    const parts = word.split('\n');
                    for (let i = 0; i < parts.length; i++) {
                        const testLine = currentLine + (currentLine ? ' ' : '') + parts[i];
                        if (i < parts.length - 1) {
                            wrappedLines.push(testLine);
                            currentLine = '';
                        } else {
                            currentLine = parts[i];
                        }
                    }
                } else {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxContentWidth && currentLine) {
                        wrappedLines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
            }
            if (currentLine) {
                wrappedLines.push(currentLine);
            }
            
            const lineHeight = 22;
            const descriptionHeight = wrappedLines.length * lineHeight + 20;
            
            const dialogHeight = titleHeight + descriptionHeight + progressHeight + continueHintHeight + skipButtonHeight;
            const dialogX = (width - dialogWidth) / 2;
            
            // Position dialog between game grid and shop buttons
            const shopButtonsY = height - UI_CONFIG.SHOP_HEIGHT + 10;
            const gameGridBottom = CONFIG.TOP_BAR_HEIGHT + (CONFIG.ROWS * CONFIG.CELL_SIZE);
            
            // Center the dialog in the space between grid and shop buttons
            const availableSpace = shopButtonsY - gameGridBottom;
            const dialogY = gameGridBottom + (availableSpace - dialogHeight) / 2;
            
            // Dialog background
            ctx.fillStyle = `rgba(26, 26, 46, ${0.95 * game.tutorial.dialogAlpha})`;
            Utils.drawRoundRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 15);
            ctx.fill();
            
            // Dialog border
            ctx.strokeStyle = `rgba(233, 69, 96, ${game.tutorial.dialogAlpha})`;
            ctx.lineWidth = 3;
            Utils.drawRoundRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 15);
            ctx.stroke();
            
            // Title
            this.graphics.drawText(currentStep.title, dialogX + dialogWidth / 2, dialogY + 30, {
                size: 22,
                color: '#e94560',
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: true,
                alpha: game.tutorial.dialogAlpha
            });
            
            // Description (wrapped lines)
            const descStartY = dialogY + titleHeight + 10;
            wrappedLines.forEach((line, index) => {
                this.graphics.drawText(line, dialogX + dialogWidth / 2, descStartY + index * lineHeight, {
                    size: 15,
                    color: '#ffffff',
                    align: 'center',
                    baseline: 'middle',
                    shadow: true,
                    alpha: game.tutorial.dialogAlpha
                });
            });
            
            // Progress indicator
            const currentIndex = game.tutorial.currentStepIndex + 1;
            const totalSteps = game.tutorial.steps.length;
            const progressText = `${currentIndex} / ${totalSteps}`;
            
            this.graphics.drawText(progressText, dialogX + dialogWidth - 15, dialogY + 15, {
                size: 13,
                color: '#a0a0a0',
                align: 'right',
                baseline: 'top',
                alpha: game.tutorial.dialogAlpha
            });
            
            // Continue hint (if waiting for tap)
            if (currentStep.waitForAction === 'tap') {
                const hintText = '[ Tocca per continuare ]';
                const hintY = dialogY + dialogHeight - skipButtonHeight - 20;
                
                // Blinking effect
                const blinkAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
                
                this.graphics.drawText(hintText, dialogX + dialogWidth / 2, hintY, {
                    size: 13,
                    color: '#ffd700',
                    align: 'center',
                    baseline: 'middle',
                    alpha: blinkAlpha * game.tutorial.dialogAlpha
                });
            }
            
            // Skip button (small, in corner)
            if (game.tutorial.currentStepIndex < game.tutorial.steps.length - 1) {
                const skipBtnWidth = 80;
                const skipBtnHeight = 30;
                const skipButtonX = dialogX + 15;
                const skipButtonY = dialogY + dialogHeight - skipBtnHeight - 15;
                
                ctx.fillStyle = `rgba(100, 100, 100, ${0.7 * game.tutorial.dialogAlpha})`;
                Utils.drawRoundRect(ctx, skipButtonX, skipButtonY, skipBtnWidth, skipBtnHeight, 5);
                ctx.fill();
                
                this.graphics.drawText('Salta', skipButtonX + skipBtnWidth / 2, skipButtonY + skipBtnHeight / 2, {
                    size: 13,
                    color: '#ffffff',
                    align: 'center',
                    baseline: 'middle',
                    alpha: game.tutorial.dialogAlpha
                });
                
                // Store button bounds for click detection
                this.tutorialSkipButton = {
                    x: skipButtonX,
                    y: skipButtonY,
                    width: skipBtnWidth,
                    height: skipBtnHeight
                };
            }
        }
    }
    
    /**
     * Check if tutorial skip button was clicked
     */
    isTutorialSkipButtonClicked(x, y) {
        if (!this.tutorialSkipButton) return false;
        
        const btn = this.tutorialSkipButton;
        return x >= btn.x && x <= btn.x + btn.width &&
               y >= btn.y && y <= btn.y + btn.height;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
