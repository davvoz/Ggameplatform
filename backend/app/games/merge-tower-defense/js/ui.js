/**
 * UI Manager
 * Handles all UI rendering and interactions
 */

import { CONFIG, CANNON_TYPES, UI_CONFIG, SHOP_ITEMS, SPECIAL_ABILITIES } from './config.js';
import { Utils } from './utils.js';
import { InfoPagesManager } from './info-pages.js';

export class UIManager {
    constructor(graphics, canvas, audio = null) {
        this.graphics = graphics;
        this.canvas = canvas;
        this.audio = audio;
        
        this.selectedCannonType = 'BASIC';
        this.showRangePreview = false;
        this.previewCol = 0;
        this.previewRow = 0;
        
        // Tutorial restrictions
        this.tutorialAllowedTowers = null; // Array of allowed tower types, null = all allowed
        
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
        
        // Info Pages (Encyclopedia)
        this.infoButton = null;
        this.infoPages = new InfoPagesManager(graphics, canvas);
        
        // Targeting mode for abilities (bomb, stun, etc.)
        this.bombTargetingMode = false;
        this.targetingCallback = null;
        this.targetingAbilityType = null; // 'BOMB', 'STUN', etc.
        this.targetingCursorPos = { x: 0, y: 0 }; // Current cursor position
        this.targetingHasTouch = false; // Whether user has touched during targeting (mobile)
        this.targetingAnimTime = 0; // Animation timer
        
        // Tower info panel (for viewing stats and selling)
        this.showTowerInfoPanel = false;
        this.selectedTowerForInfo = null;
        this.towerInfoSellButton = null;
        this.towerInfoSelectButton = null;
        this.towerInfoCloseButton = null;
        this.sellCallback = null;
        this.selectForMergeCallback = null;
        
        // Visual feedback
        this.flashCoins = false;
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
        
        // Tower info panel (for selling)
        if (this.showTowerInfoPanel && this.selectedTowerForInfo) {
            this.renderTowerInfoPanel(gameState);
        }
        
        // Info pages (Encyclopedia) - render on top of everything
        if (this.infoPages && this.infoPages.isOpen) {
            this.infoPages.render();
        }
    }
    
    /**
     * Update UI components
     */
    update(dt) {
        // Update info pages animations
        if (this.infoPages) {
            this.infoPages.update(dt);
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
        
        // Info/Encyclopedia button (below settings gear)
        const infoSize = 28;
        const infoX = width - infoSize - 12;
        const infoY = gearY + gearSize + 5;
        
        // Store info button position for click detection
        this.infoButton = {
            x: infoX,
            y: infoY,
            width: infoSize,
            height: infoSize
        };
        
        // Draw info button background with pulsing effect
        const time = Date.now() * 0.003;
        const pulse = 0.15 + Math.sin(time) * 0.05;
        ctx.fillStyle = `rgba(100, 150, 255, ${pulse})`;
        ctx.beginPath();
        ctx.arc(infoX + infoSize/2, infoY + infoSize/2, infoSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw info button border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(infoX + infoSize/2, infoY + infoSize/2, infoSize/2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw info icon (book emoji)
        ctx.font = `${infoSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#88aaff';
        ctx.fillText('📖', infoX + infoSize/2, infoY + infoSize/2);
        
        // Stats
        // Show wave progress if target is set (e.g., "15/50" instead of just "15")
        const waveDisplay = gameState.targetWaves > 0 
            ? `${gameState.wave}/${gameState.targetWaves}` 
            : gameState.wave;
        
        const stats = [
            { 
                label: '💰 COINS', 
                value: Utils.formatNumber(gameState.coins),
                color: CONFIG.COLORS.TEXT_PRIMARY,
                flash: this.flashCoins
            },
            { 
                label: '⚡ ENERGY', 
                value: Math.floor(gameState.energy),
                color: gameState.energy > 50 ? CONFIG.COLORS.TEXT_PRIMARY : CONFIG.COLORS.TEXT_DANGER 
            },
            { 
                label: '🌊 WAVE', 
                value: waveDisplay,
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
            
            // Flash effect for coins when selling
            if (stat.flash) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Label
            this.graphics.drawText(stat.label, x, y - 18, {
                size: 12,
                color: CONFIG.COLORS.TEXT_SECONDARY,
                align: 'center',
                baseline: 'middle',
                shadow: true
            });
            
            // Value with flash effect
            const valueColor = stat.flash ? '#ffff00' : stat.color;
            const valueSize = stat.flash ? 24 : 20;
            
            this.graphics.drawText(String(stat.value), x, y + 8, {
                size: valueSize,
                color: valueColor,
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
        
        // Draw sidebar background with subtle gradient
        const sidebarGradient = ctx.createLinearGradient(0, UI_CONFIG.TOP_BAR_HEIGHT, sidebarWidth, UI_CONFIG.TOP_BAR_HEIGHT);
        sidebarGradient.addColorStop(0, 'rgba(10, 15, 20, 0.95)');
        sidebarGradient.addColorStop(1, 'rgba(5, 10, 15, 0.9)');
        ctx.fillStyle = sidebarGradient;
        ctx.fillRect(0, UI_CONFIG.TOP_BAR_HEIGHT, sidebarWidth, height - UI_CONFIG.TOP_BAR_HEIGHT - UI_CONFIG.SHOP_HEIGHT);
        
        // Draw sidebar border with glow
        ctx.save();
        ctx.shadowColor = CONFIG.COLORS.BUTTON_BORDER;
        ctx.shadowBlur = 4;
        ctx.strokeStyle = CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sidebarWidth, UI_CONFIG.TOP_BAR_HEIGHT);
        ctx.lineTo(sidebarWidth, height - UI_CONFIG.SHOP_HEIGHT);
        ctx.stroke();
        ctx.restore();
        
        // Get ability states
        const abilities = gameState.specialAbilities || {
            BOMB: { level: 1, lastUsed: 0, uses: 0 },
            PUSHBACK: { level: 1, lastUsed: 0, uses: 0 }
        };
        
        this.sidebarButtons.forEach((button, index) => {
            const cornerRadius = 8;
            const centerX = button.x + button.width / 2;
            const centerY = button.y + button.height / 2;
            
            if (button.type === 'ability') {
                this.renderAbilityButtonStyled(ctx, button, abilities, now, time, cornerRadius, centerX, centerY);
            } else if (button.type === 'shop') {
                this.renderShopItemButtonStyled(ctx, button, gameState, time, cornerRadius, centerX, centerY);
            }
        });
    }
    
    /**
     * Render styled ability button with custom vector graphics
     */
    renderAbilityButtonStyled(ctx, button, abilities, now, time, cornerRadius, centerX, centerY) {
        const ability = button.data;
        const abilityState = abilities[button.id] || { level: 1, lastUsed: 0, uses: 0 };
        const level = abilityState.level;
        const lastUsed = abilityState.lastUsed;
        const cooldown = ability.baseCooldown;
        const elapsed = now - lastUsed;
        const isReady = elapsed >= cooldown;
        const cooldownProgress = Math.min(1, elapsed / cooldown);
        
        // Button background with 3D gradient
        ctx.save();
        const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        if (isReady) {
            // Ready state - vibrant gradient
            ctx.shadowColor = ability.glowColor;
            ctx.shadowBlur = 10 + Math.sin(time * 4) * 4;
            bgGradient.addColorStop(0, Utils.colorWithAlpha(ability.color, 0.85));
            bgGradient.addColorStop(0.5, Utils.colorWithAlpha(ability.color, 0.6));
            bgGradient.addColorStop(1, Utils.colorWithAlpha(ability.color, 0.75));
        } else {
            bgGradient.addColorStop(0, '#2a2a35');
            bgGradient.addColorStop(0.5, '#1a1a22');
            bgGradient.addColorStop(1, '#222228');
        }
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.fill();
        ctx.restore();
        
        // Inner highlight for 3D effect
        if (isReady) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#ffffff';
            Utils.drawRoundRect(ctx, button.x + 2, button.y + 2, button.width - 4, button.height * 0.35, cornerRadius - 1);
            ctx.fill();
            ctx.restore();
        }
        
        // Cooldown overlay with radial sweep
        if (!isReady) {
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (1 - cooldownProgress) * Math.PI * 2;
            ctx.arc(centerX, centerY, button.width / 2 + 2, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
            // Cooldown progress ring
            ctx.save();
            ctx.strokeStyle = ability.glowColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(centerX, centerY, button.width / 2 - 2, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            
            // Cooldown timer with glow
            const remainingSec = Math.ceil((cooldown - elapsed) / 1000);
            ctx.save();
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${remainingSec}s`, centerX, centerY + 14);
            ctx.restore();
        }
        
        // Border with glow
        ctx.save();
        if (isReady) {
            ctx.shadowColor = ability.glowColor;
            ctx.shadowBlur = 6;
        }
        ctx.strokeStyle = isReady ? ability.glowColor : 'rgba(80, 80, 100, 0.5)';
        ctx.lineWidth = isReady ? 2.5 : 1.5;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.stroke();
        ctx.restore();
        
        // Draw custom ability icon sprite
        ctx.save();
        ctx.globalAlpha = isReady ? 1.0 : 0.4;
        const iconSize = button.width * 0.55;
        this.drawAbilitySprite(ctx, button.id, centerX, centerY - 3, iconSize, ability.color, isReady, time);
        ctx.restore();
        
        // Level badge with glow
        ctx.save();
        const badgeX = button.x + button.width - 10;
        const badgeY = button.y + button.height - 10;
        const badgeRadius = 9;
        
        // Badge background
        ctx.shadowColor = isReady ? '#ffdd00' : '#333333';
        ctx.shadowBlur = isReady ? 4 : 0;
        ctx.fillStyle = isReady ? '#ffdd00' : '#444444';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Badge border
        ctx.strokeStyle = isReady ? '#ffffff' : '#666666';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Level text
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isReady ? '#000000' : '#888888';
        ctx.fillText(`${level}`, badgeX, badgeY);
        ctx.restore();
    }
    
    /**
     * Draw custom vector sprite for abilities
     */
    drawAbilitySprite(ctx, abilityId, x, y, size, color, isReady, time) {
        ctx.save();
        ctx.translate(x, y);
        
        const s = size / 2; // half size for easier drawing
        
        switch(abilityId) {
            case 'BOMB':
                // Draw bomb body
                ctx.fillStyle = '#333333';
                ctx.beginPath();
                ctx.arc(0, 2, s * 0.7, 0, Math.PI * 2);
                ctx.fill();
                
                // Bomb highlight
                ctx.fillStyle = '#555555';
                ctx.beginPath();
                ctx.arc(-s * 0.2, -s * 0.1, s * 0.25, 0, Math.PI * 2);
                ctx.fill();
                
                // Fuse holder
                ctx.fillStyle = '#666666';
                ctx.fillRect(-s * 0.12, -s * 0.5, s * 0.24, s * 0.3);
                
                // Fuse
                ctx.strokeStyle = '#aa8844';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -s * 0.5);
                ctx.quadraticCurveTo(s * 0.3, -s * 0.7, s * 0.2, -s * 0.9);
                ctx.stroke();
                
                // Spark/flame at fuse tip
                if (isReady) {
                    const flicker = Math.sin(time * 15) * 0.3 + 0.7;
                    ctx.fillStyle = `rgba(255, ${Math.floor(150 + flicker * 100)}, 0, ${flicker})`;
                    ctx.beginPath();
                    ctx.arc(s * 0.2, -s * 0.9, s * 0.15 + Math.sin(time * 20) * s * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Inner spark
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(s * 0.2, -s * 0.9, s * 0.06, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'PUSHBACK':
                // Draw wave lines
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                
                for (let i = 0; i < 3; i++) {
                    const offset = isReady ? Math.sin(time * 4 + i * 0.5) * 2 : 0;
                    const alpha = isReady ? 0.6 + i * 0.15 : 0.5;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(offset - s * 0.3 + i * s * 0.35, 0, s * 0.4, -Math.PI * 0.6, Math.PI * 0.6);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                
                // Arrow indicator
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(s * 0.5, 0);
                ctx.lineTo(s * 0.2, -s * 0.25);
                ctx.lineTo(s * 0.2, s * 0.25);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'STUN':
                // Draw lightning bolt
                ctx.fillStyle = color;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                
                ctx.beginPath();
                ctx.moveTo(-s * 0.1, -s * 0.8);
                ctx.lineTo(s * 0.3, -s * 0.1);
                ctx.lineTo(0, -s * 0.1);
                ctx.lineTo(s * 0.2, s * 0.8);
                ctx.lineTo(-s * 0.2, s * 0.1);
                ctx.lineTo(s * 0.05, s * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Electric sparks when ready
                if (isReady) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    for (let i = 0; i < 4; i++) {
                        const angle = (time * 3 + i * Math.PI / 2) % (Math.PI * 2);
                        const sparkX = Math.cos(angle) * s * 0.6;
                        const sparkY = Math.sin(angle) * s * 0.6;
                        ctx.globalAlpha = 0.5 + Math.sin(time * 10 + i) * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(sparkX - 3, sparkY);
                        ctx.lineTo(sparkX + 3, sparkY);
                        ctx.moveTo(sparkX, sparkY - 3);
                        ctx.lineTo(sparkX, sparkY + 3);
                        ctx.stroke();
                    }
                }
                break;
                
            default:
                // Fallback circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
                ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Render styled shop item button with custom vector graphics
     */
    renderShopItemButtonStyled(ctx, button, gameState, time, cornerRadius, centerX, centerY) {
        const item = button.data;
        const canAfford = gameState.coins >= item.cost;
        
        // Check if temporary boost is already active
        const isActive = item.type === 'temporary' && 
            gameState.activeBoosts?.some(b => b.type === item.effect.type);
        const isDisabled = !canAfford || isActive;
        
        // Button background with 3D gradient
        ctx.save();
        const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        if (isActive) {
            // Active boost - pulsing glow
            const pulse = Math.sin(time * 3) * 0.15 + 0.85;
            ctx.shadowColor = item.color;
            ctx.shadowBlur = 12 * pulse;
            bgGradient.addColorStop(0, Utils.colorWithAlpha(item.color, 0.7));
            bgGradient.addColorStop(0.5, Utils.colorWithAlpha(item.color, 0.5));
            bgGradient.addColorStop(1, Utils.colorWithAlpha(item.color, 0.6));
        } else if (canAfford) {
            bgGradient.addColorStop(0, Utils.colorWithAlpha(item.color, 0.35));
            bgGradient.addColorStop(0.5, Utils.colorWithAlpha(item.color, 0.15));
            bgGradient.addColorStop(1, Utils.colorWithAlpha(item.color, 0.25));
        } else {
            bgGradient.addColorStop(0, '#252530');
            bgGradient.addColorStop(0.5, '#1a1a20');
            bgGradient.addColorStop(1, '#202025');
        }
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.fill();
        ctx.restore();
        
        // Inner highlight
        if (canAfford && !isDisabled) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#ffffff';
            Utils.drawRoundRect(ctx, button.x + 2, button.y + 2, button.width - 4, button.height * 0.3, cornerRadius - 1);
            ctx.fill();
            ctx.restore();
        }
        
        // Border with glow
        ctx.save();
        if (isActive || canAfford) {
            ctx.shadowColor = item.color;
            ctx.shadowBlur = isActive ? 8 : 3;
        }
        ctx.strokeStyle = isActive ? item.color : (canAfford ? Utils.colorWithAlpha(item.color, 0.7) : 'rgba(60, 60, 80, 0.5)');
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.stroke();
        ctx.restore();
        
        // Draw custom shop item sprite
        ctx.save();
        ctx.globalAlpha = isDisabled && !isActive ? 0.35 : 1.0;
        const iconSize = button.width * 0.5;
        this.drawShopItemSprite(ctx, button.id, centerX, centerY - 4, iconSize, item.color, canAfford, isActive, time);
        ctx.restore();
        
        // Cost badge or ACTIVE label
        ctx.save();
        const labelY = button.y + button.height - 8;
        
        if (isActive) {
            // Active label with glow
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ACTIVE', centerX, labelY);
        } else {
            // Cost with coin icon
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = canAfford ? '#ffcc00' : '#555555';
            ctx.fillText(`💰${item.cost}`, centerX, labelY);
        }
        ctx.restore();
    }
    
    /**
     * Draw custom vector sprite for shop items
     */
    drawShopItemSprite(ctx, itemId, x, y, size, color, canAfford, isActive, time) {
        ctx.save();
        ctx.translate(x, y);
        
        const s = size / 2;
        
        switch(itemId) {
            case 'ENERGY_SMALL':
                // Lightning bolt (small energy)
                ctx.fillStyle = canAfford ? '#00ffff' : '#446666';
                ctx.beginPath();
                ctx.moveTo(-s * 0.15, -s * 0.7);
                ctx.lineTo(s * 0.4, -s * 0.05);
                ctx.lineTo(s * 0.05, -s * 0.05);
                ctx.lineTo(s * 0.25, s * 0.7);
                ctx.lineTo(-s * 0.3, s * 0.05);
                ctx.lineTo(0, s * 0.05);
                ctx.closePath();
                ctx.fill();
                
                // Glow effect
                if (canAfford) {
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = 6;
                    ctx.fill();
                }
                break;
                
            case 'ENERGY_LARGE':
                // Battery icon
                ctx.fillStyle = canAfford ? '#00ff88' : '#446655';
                
                // Battery body
                ctx.fillRect(-s * 0.4, -s * 0.5, s * 0.8, s * 1.0);
                
                // Battery terminal
                ctx.fillRect(-s * 0.15, -s * 0.7, s * 0.3, s * 0.2);
                
                // Energy level bars
                ctx.fillStyle = canAfford ? '#88ffaa' : '#557766';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(-s * 0.3, s * 0.3 - i * s * 0.3, s * 0.6, s * 0.2);
                }
                
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(-s * 0.35, -s * 0.45, s * 0.15, s * 0.9);
                break;
                
            case 'RANGE_BOOST':
                // Radar dish
                ctx.strokeStyle = canAfford ? '#4488ff' : '#334455';
                ctx.lineWidth = 2;
                
                // Radar waves
                for (let i = 0; i < 3; i++) {
                    const waveOffset = isActive ? Math.sin(time * 4 + i) * 2 : 0;
                    ctx.globalAlpha = isActive ? 0.4 + i * 0.2 : (canAfford ? 0.5 + i * 0.15 : 0.3);
                    ctx.beginPath();
                    ctx.arc(-s * 0.2 + waveOffset, 0, s * 0.3 + i * s * 0.25, -Math.PI * 0.4, Math.PI * 0.4);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                
                // Dish base
                ctx.fillStyle = canAfford ? '#4488ff' : '#334455';
                ctx.beginPath();
                ctx.moveTo(-s * 0.5, -s * 0.3);
                ctx.quadraticCurveTo(-s * 0.3, 0, -s * 0.5, s * 0.3);
                ctx.lineTo(-s * 0.6, s * 0.2);
                ctx.lineTo(-s * 0.6, -s * 0.2);
                ctx.closePath();
                ctx.fill();
                
                // Dish center
                ctx.fillStyle = canAfford ? '#88aaff' : '#445566';
                ctx.beginPath();
                ctx.arc(-s * 0.45, 0, s * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'FIRERATE_BOOST':
                // Speed lines / turbo
                ctx.fillStyle = canAfford ? '#ffcc00' : '#665533';
                
                // Arrow shape
                ctx.beginPath();
                ctx.moveTo(s * 0.5, 0);
                ctx.lineTo(-s * 0.1, -s * 0.4);
                ctx.lineTo(-s * 0.1, -s * 0.15);
                ctx.lineTo(-s * 0.5, -s * 0.15);
                ctx.lineTo(-s * 0.5, s * 0.15);
                ctx.lineTo(-s * 0.1, s * 0.15);
                ctx.lineTo(-s * 0.1, s * 0.4);
                ctx.closePath();
                ctx.fill();
                
                // Speed lines
                ctx.strokeStyle = canAfford ? '#ffee88' : '#554422';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const lineY = -s * 0.3 + i * s * 0.3;
                    const offset = isActive ? Math.sin(time * 8 + i) * 3 : 0;
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.7 + offset, lineY);
                    ctx.lineTo(-s * 0.55 + offset, lineY);
                    ctx.stroke();
                }
                break;
                
            case 'DAMAGE_BOOST':
                // Explosion / power burst
                ctx.fillStyle = canAfford ? '#ff4444' : '#553333';
                
                // Star burst shape
                const points = 8;
                ctx.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const angle = (i * Math.PI) / points - Math.PI / 2;
                    const radius = i % 2 === 0 ? s * 0.7 : s * 0.35;
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                
                // Inner glow
                if (canAfford) {
                    ctx.fillStyle = '#ff8866';
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Animated pulse when active
                if (isActive) {
                    const pulse = Math.sin(time * 6) * 0.3 + 0.7;
                    ctx.globalAlpha = pulse * 0.5;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'TOWER_UPGRADE':
                // Star with up arrow
                ctx.fillStyle = canAfford ? '#ffdd00' : '#665522';
                
                // Star shape
                const starPoints = 5;
                ctx.beginPath();
                for (let i = 0; i < starPoints * 2; i++) {
                    const angle = (i * Math.PI) / starPoints - Math.PI / 2;
                    const radius = i % 2 === 0 ? s * 0.65 : s * 0.3;
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                
                // Up arrow in center
                ctx.fillStyle = canAfford ? '#ffffff' : '#887744';
                ctx.beginPath();
                ctx.moveTo(0, -s * 0.25);
                ctx.lineTo(s * 0.15, s * 0.05);
                ctx.lineTo(-s * 0.15, s * 0.05);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(-s * 0.06, s * 0.0, s * 0.12, s * 0.15);
                
                // Sparkle effect when affordable
                if (canAfford) {
                    ctx.fillStyle = '#ffffff';
                    const sparkle = Math.sin(time * 5) * 0.5 + 0.5;
                    ctx.globalAlpha = sparkle;
                    ctx.beginPath();
                    ctx.arc(s * 0.4, -s * 0.4, s * 0.08, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            default:
                // Fallback - simple circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
        }
        
        ctx.restore();
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
        this.targetingAnimTime += 0.016; // ~60fps
        
        const abilityType = this.targetingAbilityType || 'BOMB';
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const abilityColor = abilityConfig?.color || '#ff4400';
        const glowColor = abilityConfig?.glowColor || '#ff8800';
        
        // Detect if on mobile (touch device)
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const hasTouchPosition = this.targetingHasTouch && this.targetingCursorPos.x > 0;
        
        // Semi-transparent overlay with ability color
        ctx.fillStyle = Utils.colorWithAlpha(abilityColor, 0.08);
        ctx.fillRect(0, 0, width, height);
        
        // Animated border pulse
        ctx.save();
        const borderPulse = Math.sin(time * 4) * 0.3 + 0.7;
        ctx.strokeStyle = Utils.colorWithAlpha(abilityColor, borderPulse * 0.5);
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.restore();
        
        // Instruction text with icon
        ctx.save();
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = abilityColor;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        const pulse = Math.sin(time * 5) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        
        const instructionText = abilityType === 'BOMB' ? 
            (isMobile ? '👆 TAP WHERE TO DROP BOMB' : 'TAP TO DROP BOMB') : 
            abilityType === 'STUN' ? 
            (isMobile ? '👆 TAP WHERE TO STUN' : 'TAP TO STUN ENEMIES') : 
            'TAP TO ACTIVATE';
        ctx.fillText(instructionText, width / 2, UI_CONFIG.TOP_BAR_HEIGHT + 35);
        ctx.restore();
        
        // On mobile: show targeting reticle in center if no touch yet
        if (isMobile && !hasTouchPosition) {
            // Draw animated "tap here" indicator in the play area center
            const gridCenterX = this.graphics.offsetX + (CONFIG.COLS * this.graphics.cellSize) / 2;
            const gridCenterY = this.graphics.offsetY + (CONFIG.ROWS * this.graphics.cellSize) / 2;
            
            this.renderMobileTargetingHint(ctx, gridCenterX, gridCenterY, abilityType, time);
        } else {
            // Get cursor/touch grid position for area preview
            const cursorGridPos = this.graphics.screenToGrid(this.targetingCursorPos.x, this.targetingCursorPos.y);
            const cursorScreenPos = this.graphics.gridToScreen(cursorGridPos.col, cursorGridPos.row);
            
            // Draw targeting area preview on grid (always show when we have a position)
            if (cursorGridPos.col >= 0 && cursorGridPos.col < CONFIG.COLS && 
                cursorGridPos.row >= 0 && cursorGridPos.row < CONFIG.ROWS) {
                this.renderTargetingAreaPreview(ctx, cursorScreenPos.x, cursorScreenPos.y, abilityType, time);
                
                // On mobile: show simplified touch indicator at touch position
                if (isMobile && hasTouchPosition) {
                    this.renderMobileTouchIndicator(ctx, this.targetingCursorPos.x, this.targetingCursorPos.y, abilityType, time);
                }
            }
            
            // On desktop: draw animated cursor sprite at actual cursor position
            if (!isMobile) {
                this.renderTargetingCursor(ctx, this.targetingCursorPos.x, this.targetingCursorPos.y, abilityType, time);
            }
        }
        
        // Cancel button
        const cancelBtnWidth = 130;
        const cancelBtnHeight = 44;
        const cancelBtnX = width / 2 - cancelBtnWidth / 2;
        const cancelBtnY = height - UI_CONFIG.SHOP_HEIGHT - 65;
        
        // Cancel button with gradient
        ctx.save();
        const cancelGradient = ctx.createLinearGradient(cancelBtnX, cancelBtnY, cancelBtnX, cancelBtnY + cancelBtnHeight);
        cancelGradient.addColorStop(0, '#4a2020');
        cancelGradient.addColorStop(0.5, '#2a1010');
        cancelGradient.addColorStop(1, '#3a1515');
        ctx.fillStyle = cancelGradient;
        Utils.drawRoundRect(ctx, cancelBtnX, cancelBtnY, cancelBtnWidth, cancelBtnHeight, 10);
        ctx.fill();
        
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, cancelBtnX, cancelBtnY, cancelBtnWidth, cancelBtnHeight, 10);
        ctx.stroke();
        ctx.restore();
        
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('✕ CANCEL', width / 2, cancelBtnY + cancelBtnHeight / 2);
        
        // Store cancel button position for click detection
        this.bombCancelButton = {
            x: cancelBtnX,
            y: cancelBtnY,
            width: cancelBtnWidth,
            height: cancelBtnHeight
        };
    }
    
    /**
     * Render mobile targeting hint (shown when no touch yet)
     */
    renderMobileTargetingHint(ctx, x, y, abilityType, time) {
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const color = abilityConfig?.color || '#ff4400';
        const cellSize = this.graphics.cellSize;
        const radius = abilityConfig?.baseRadius || 2;
        
        ctx.save();
        
        // Pulsing circle showing potential area
        const pulseScale = 1 + Math.sin(time * 3) * 0.1;
        const areaRadius = radius * cellSize * pulseScale;
        
        // Outer dashed circle (animated)
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -time * 40;
        ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Inner glow fill
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, areaRadius);
        gradient.addColorStop(0, Utils.colorWithAlpha(color, 0.25));
        gradient.addColorStop(0.7, Utils.colorWithAlpha(color, 0.1));
        gradient.addColorStop(1, Utils.colorWithAlpha(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Animated finger icon (bouncing)
        ctx.globalAlpha = 0.85 + Math.sin(time * 5) * 0.15;
        ctx.font = `${cellSize * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bounce = Math.sin(time * 4) * 10;
        const fingerY = y + bounce;
        ctx.fillText('👆', x, fingerY);
        
        // Glowing ring around finger area
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, fingerY, cellSize * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        
        // "Tap to target" text below
        ctx.shadowBlur = 10;
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fillText('TAP TO TARGET', x, y + cellSize * 2);
        
        ctx.restore();
    }
    
    /**
     * Render mobile touch indicator (simplified, non-intrusive)
     */
    renderMobileTouchIndicator(ctx, x, y, abilityType, time) {
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const color = abilityConfig?.color || '#ff4400';
        
        ctx.save();
        ctx.translate(x, y);
        
        // Larger pulsing outer ring for visibility
        const pulseSize = 35 + Math.sin(time * 6) * 8;
        
        // Outer glow ring
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Secondary expanding ring
        const expandRing = ((time * 1.5) % 1);
        ctx.globalAlpha = 1 - expandRing;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize * (0.5 + expandRing * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner crosshair
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        const crossSize = 15;
        ctx.beginPath();
        ctx.moveTo(-crossSize, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(crossSize, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(0, -crossSize);
        ctx.lineTo(0, -8);
        ctx.moveTo(0, crossSize);
        ctx.lineTo(0, 8);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Ability icon floating above
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.9;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const floatY = -pulseSize - 25 + Math.sin(time * 4) * 4;
        const icon = abilityType === 'BOMB' ? '💣' : abilityType === 'STUN' ? '⚡' : '🎯';
        ctx.fillText(icon, 0, floatY);
        
        ctx.restore();
    }
    
    /**
     * Render targeting area preview on grid
     */
    renderTargetingAreaPreview(ctx, x, y, abilityType, time) {
        const cellSize = this.graphics.cellSize;
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const radius = abilityConfig?.baseRadius || 2;
        const color = abilityConfig?.color || '#ff4400';
        
        ctx.save();
        
        // Pulsing area circle
        const pulseScale = 1 + Math.sin(time * 6) * 0.08;
        const areaRadius = radius * cellSize * pulseScale;
        
        // Outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        
        // Fill with gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, areaRadius);
        gradient.addColorStop(0, Utils.colorWithAlpha(color, 0.4));
        gradient.addColorStop(0.6, Utils.colorWithAlpha(color, 0.2));
        gradient.addColorStop(1, Utils.colorWithAlpha(color, 0.05));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Animated ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner pulsing ring
        const innerPulse = (time * 2) % 1;
        ctx.globalAlpha = 1 - innerPulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius * innerPulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Crosshair
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        const crossSize = cellSize * 0.4;
        ctx.beginPath();
        ctx.moveTo(x - crossSize, y);
        ctx.lineTo(x + crossSize, y);
        ctx.moveTo(x, y - crossSize);
        ctx.lineTo(x, y + crossSize);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Render animated targeting cursor sprite
     */
    renderTargetingCursor(ctx, x, y, abilityType, time) {
        ctx.save();
        ctx.translate(x, y);
        
        const size = 60; // Cursor size
        const s = size / 2;
        
        // Rotation animation
        const rotation = time * 0.5;
        
        switch(abilityType) {
            case 'BOMB':
                this.renderBombCursor(ctx, s, time, rotation);
                break;
            case 'STUN':
                this.renderStunCursor(ctx, s, time, rotation);
                break;
            default:
                this.renderGenericCursor(ctx, s, time, rotation);
        }
        
        ctx.restore();
    }
    
    /**
     * Render bomb targeting cursor with falling bomb animation
     */
    renderBombCursor(ctx, s, time, rotation) {
        // Outer rotating danger rings
        ctx.save();
        ctx.rotate(rotation);
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.2;
        
        // Danger octagon
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 8;
            const px = Math.cos(angle) * s * 1.1;
            const py = Math.sin(angle) * s * 1.1;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        
        // Counter-rotating inner ring
        ctx.save();
        ctx.rotate(-rotation * 1.5);
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        
        // Bomb body with bounce animation
        const bounce = Math.sin(time * 10) * 3;
        ctx.save();
        ctx.translate(0, bounce);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(2, s * 0.4, s * 0.35, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bomb body
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        // Bomb highlight
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(-s * 0.15, -s * 0.15, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        // Fuse holder
        ctx.fillStyle = '#555555';
        ctx.fillRect(-s * 0.08, -s * 0.55, s * 0.16, s * 0.15);
        
        // Animated fuse
        ctx.strokeStyle = '#aa7744';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.55);
        const fuseWave = Math.sin(time * 12) * s * 0.1;
        ctx.quadraticCurveTo(fuseWave, -s * 0.7, s * 0.1 + fuseWave * 0.5, -s * 0.8);
        ctx.stroke();
        
        // Animated spark/flame
        const flameSize = s * 0.2 + Math.sin(time * 20) * s * 0.08;
        const flameX = s * 0.1 + Math.sin(time * 12) * s * 0.05;
        
        // Outer flame
        const flameGradient = ctx.createRadialGradient(flameX, -s * 0.8, 0, flameX, -s * 0.8, flameSize);
        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.3, '#ffff00');
        flameGradient.addColorStop(0.6, '#ff8800');
        flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(flameX, -s * 0.8, flameSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Sparks
        ctx.fillStyle = '#ffff88';
        for (let i = 0; i < 5; i++) {
            const sparkAngle = time * 15 + i * 1.2;
            const sparkDist = s * 0.15 + Math.sin(time * 20 + i) * s * 0.1;
            const sparkX = flameX + Math.cos(sparkAngle) * sparkDist;
            const sparkY = -s * 0.8 + Math.sin(sparkAngle) * sparkDist - s * 0.1;
            const sparkSize = 2 + Math.sin(time * 25 + i * 2) * 1.5;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Warning triangles rotating around
        ctx.save();
        ctx.rotate(rotation * 2);
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI * 2 / 3);
            ctx.translate(s * 0.9, 0);
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(5, 5);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', 0, 4);
            ctx.fillStyle = '#ffcc00';
            ctx.restore();
        }
        ctx.restore();
    }
    
    /**
     * Render stun targeting cursor with electric effect
     */
    renderStunCursor(ctx, s, time, rotation) {
        // Electric field rings
        ctx.save();
        ctx.rotate(rotation * 0.8);
        
        // Outer electric ring
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffff88';
        ctx.shadowBlur = 15;
        
        // Pulsing hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI / 3) + Math.sin(time * 3) * 0.1;
            const dist = s * (0.95 + Math.sin(time * 8 + i) * 0.1);
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        
        // Inner rotating electric arcs
        ctx.save();
        ctx.rotate(-rotation * 1.2);
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.6, -0.3, 0.3);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        
        // Central lightning bolt
        ctx.save();
        const boltScale = 1 + Math.sin(time * 12) * 0.15;
        ctx.scale(boltScale, boltScale);
        
        // Glow
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        
        ctx.fillStyle = '#ffee00';
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.55);
        ctx.lineTo(s * 0.25, -s * 0.05);
        ctx.lineTo(0, -s * 0.05);
        ctx.lineTo(s * 0.15, s * 0.55);
        ctx.lineTo(-s * 0.15, s * 0.05);
        ctx.lineTo(s * 0.05, s * 0.05);
        ctx.closePath();
        ctx.fill();
        
        // Inner white
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-s * 0.05, -s * 0.4);
        ctx.lineTo(s * 0.12, -s * 0.02);
        ctx.lineTo(-s * 0.02, -s * 0.02);
        ctx.lineTo(s * 0.08, s * 0.4);
        ctx.lineTo(-s * 0.08, s * 0.05);
        ctx.lineTo(s * 0.02, s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Electric sparks around
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) {
            const sparkTime = time * 6 + i * 0.8;
            const sparkAngle = sparkTime % (Math.PI * 2);
            const sparkDist = s * (0.7 + Math.sin(sparkTime * 3) * 0.2);
            const sparkX = Math.cos(sparkAngle) * sparkDist;
            const sparkY = Math.sin(sparkAngle) * sparkDist;
            
            ctx.globalAlpha = 0.5 + Math.sin(sparkTime * 5) * 0.5;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2 + Math.sin(sparkTime * 8), 0, Math.PI * 2);
            ctx.fill();
            
            // Mini lightning from spark
            if (Math.sin(sparkTime * 10) > 0.7) {
                ctx.strokeStyle = '#ffff88';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sparkX, sparkY);
                const endX = sparkX + (Math.random() - 0.5) * s * 0.3;
                const endY = sparkY + (Math.random() - 0.5) * s * 0.3;
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        // Circular pulse wave
        ctx.globalAlpha = 1;
        const pulsePhase = (time * 2) % 1;
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 3 * (1 - pulsePhase);
        ctx.globalAlpha = 1 - pulsePhase;
        ctx.beginPath();
        ctx.arc(0, 0, s * pulsePhase * 1.2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
     * Render generic targeting cursor
     */
    renderGenericCursor(ctx, s, time, rotation) {
        // Simple crosshair with pulse
        ctx.save();
        ctx.rotate(rotation);
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        
        // Outer circle
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        
        // Cross
        const crossSize = s * 0.6;
        ctx.beginPath();
        ctx.moveTo(-crossSize, 0);
        ctx.lineTo(-s * 0.3, 0);
        ctx.moveTo(crossSize, 0);
        ctx.lineTo(s * 0.3, 0);
        ctx.moveTo(0, -crossSize);
        ctx.lineTo(0, -s * 0.3);
        ctx.moveTo(0, crossSize);
        ctx.lineTo(0, s * 0.3);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Render elegant tower info panel with stats and sell button
     */
    renderTowerInfoPanel(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const time = Date.now() * 0.001;
        
        const tower = this.selectedTowerForInfo;
        if (!tower) return;
        
        const towerConfig = CANNON_TYPES[tower.type];
        if (!towerConfig) return;
        
        // Calculate sell value (50% of total invested value)
        const sellValue = this.calculateSellValue(tower);
        
        // Panel dimensions - taller to fit everything
        const panelWidth = Math.min(300, width * 0.88);
        const panelHeight = 320;
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;
        
        // Semi-transparent backdrop
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);
        
        // Panel outer glow
        ctx.save();
        ctx.shadowColor = towerConfig.color;
        ctx.shadowBlur = 25;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        Utils.drawRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.fill();
        ctx.restore();
        
        // Panel background with gradient
        ctx.save();
        const bgGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        bgGradient.addColorStop(0, '#1e2d3d');
        bgGradient.addColorStop(0.15, '#152232');
        bgGradient.addColorStop(0.5, '#0d1820');
        bgGradient.addColorStop(1, '#0a1318');
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.fill();
        
        // Inner border highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4, 18);
        ctx.stroke();
        
        // Glowing border with tower color
        ctx.shadowColor = towerConfig.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = towerConfig.color;
        ctx.lineWidth = 2.5;
        Utils.drawRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.stroke();
        ctx.restore();
        
        // === HEADER SECTION ===
        const iconSize = 50;
        const iconCenterX = panelX + panelWidth / 2;
        const iconCenterY = panelY + 45;
        
        // Circular glow behind sprite
        ctx.save();
        const iconGlow = ctx.createRadialGradient(iconCenterX, iconCenterY, 0, iconCenterX, iconCenterY, iconSize * 0.7);
        iconGlow.addColorStop(0, Utils.colorWithAlpha(towerConfig.color, 0.3));
        iconGlow.addColorStop(0.6, Utils.colorWithAlpha(towerConfig.color, 0.1));
        iconGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = iconGlow;
        ctx.beginPath();
        ctx.arc(iconCenterX, iconCenterY, iconSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Draw tower sprite
        if (tower.multiSprite) {
            ctx.save();
            tower.multiSprite.render(ctx, iconCenterX, iconCenterY, iconSize);
            ctx.restore();
        } else {
            ctx.font = `${iconSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(towerConfig.icon, iconCenterX, iconCenterY);
        }
        
        // Tower name and level badge on same line
        const nameY = iconCenterY + iconSize / 2 + 18;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = towerConfig.color;
        ctx.shadowBlur = 8;
        const nameText = towerConfig.name;
        ctx.fillText(nameText, iconCenterX - 20, nameY);
        ctx.shadowBlur = 0;
        
        // Level badge next to name
        const nameWidth = ctx.measureText(nameText).width;
        const badgeX = iconCenterX - 20 + nameWidth / 2 + 8;
        ctx.fillStyle = towerConfig.color;
        Utils.drawRoundRect(ctx, badgeX, nameY - 12, 36, 18, 5);
        ctx.fill();
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv.${tower.level}`, badgeX + 18, nameY - 3);
        
        // === STATS SECTION ===
        const statsStartY = nameY + 28;
        const statSpacing = 24;
        const leftX = panelX + 25;
        const rightX = panelX + panelWidth - 25;
        
        this.renderStatRow(ctx, leftX, rightX, statsStartY, 'DAMAGE', tower.damage.toFixed(1), '#ff6b6b');
        this.renderStatRow(ctx, leftX, rightX, statsStartY + statSpacing, 'FIRE RATE', `${(1000 / tower.fireRate).toFixed(1)}/s`, '#ffa94d');
        this.renderStatRow(ctx, leftX, rightX, statsStartY + statSpacing * 2, 'RANGE', tower.range.toFixed(1), '#69db7c');
        
        // === SELL VALUE SECTION ===
        const sellBoxY = statsStartY + statSpacing * 3 + 8;
        const sellBoxHeight = 34;
        const sellBoxMargin = 20;
        
        // Sell value background box
        ctx.save();
        const sellGradient = ctx.createLinearGradient(panelX + sellBoxMargin, sellBoxY, panelX + panelWidth - sellBoxMargin, sellBoxY);
        sellGradient.addColorStop(0, 'rgba(255, 200, 0, 0.1)');
        sellGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.2)');
        sellGradient.addColorStop(1, 'rgba(255, 200, 0, 0.1)');
        ctx.fillStyle = sellGradient;
        Utils.drawRoundRect(ctx, panelX + sellBoxMargin, sellBoxY, panelWidth - sellBoxMargin * 2, sellBoxHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, panelX + sellBoxMargin, sellBoxY, panelWidth - sellBoxMargin * 2, sellBoxHeight, 8);
        ctx.stroke();
        ctx.restore();
        
        // Sell value text
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd43b';
        ctx.shadowColor = '#ffd43b';
        ctx.shadowBlur = 5;
        ctx.fillText(`💰 SELL VALUE: ${sellValue}`, panelX + panelWidth / 2, sellBoxY + sellBoxHeight / 2);
        ctx.shadowBlur = 0;
        
        // === BUTTONS SECTION ===
        const buttonY = panelY + panelHeight - 60;
        const buttonHeight = 44;
        const buttonSpacing = 10;
        const sideMargin = 20;
        const closeButtonWidth = 50;
        const remainingWidth = panelWidth - sideMargin * 2 - closeButtonWidth - buttonSpacing * 2;
        const actionButtonWidth = remainingWidth / 2;
        
        // Close button (X)
        const closeX = panelX + sideMargin;
        this.renderTowerInfoButton(ctx, closeX, buttonY, closeButtonWidth, buttonHeight, 
            '✕', '#3a3a3a', '#555555', time, false, '#999999');
        this.towerInfoCloseButton = { x: closeX, y: buttonY, width: closeButtonWidth, height: buttonHeight };
        
        // Select button (for merge)
        const selectX = closeX + closeButtonWidth + buttonSpacing;
        this.renderTowerInfoButton(ctx, selectX, buttonY, actionButtonWidth, buttonHeight,
            '🔗 SELECT', '#1a3a5c', '#2d5a8a', time, false, '#7ec8e3');
        this.towerInfoSelectButton = { x: selectX, y: buttonY, width: actionButtonWidth, height: buttonHeight };
        
        // Sell button with animated glow
        const sellBtnX = selectX + actionButtonWidth + buttonSpacing;
        this.renderTowerInfoButton(ctx, sellBtnX, buttonY, actionButtonWidth, buttonHeight,
            `💰 SELL`, '#1a4a2a', '#2d6b3d', time, true, '#6ee7a0');
        this.towerInfoSellButton = { x: sellBtnX, y: buttonY, width: actionButtonWidth, height: buttonHeight };
    }
    
    /**
     * Render a stat row with label and value
     */
    renderStatRow(ctx, leftX, rightX, y, label, value, accentColor) {
        // Label
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(label, leftX, y);
        
        // Value with accent
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.fillText(value, rightX, y);
        
        // Dotted line between
        const labelWidth = ctx.measureText(label).width;
        const valueWidth = ctx.measureText(value).width;
        const lineStartX = leftX + labelWidth + 10;
        const lineEndX = rightX - valueWidth - 10;
        
        if (lineEndX > lineStartX) {
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(lineStartX, y);
            ctx.lineTo(lineEndX, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    /**
     * Render a styled button for tower info panel
     */
    renderTowerInfoButton(ctx, x, y, width, height, text, bgColor, borderColor, time, animated = false, textColor = '#ffffff') {
        ctx.save();
        
        // Button background gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, Utils.lightenColor(bgColor, 15));
        gradient.addColorStop(0.4, bgColor);
        gradient.addColorStop(1, Utils.darkenColor(bgColor, 15));
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Inner highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, x + 1, y + 1, width - 2, height - 2, 9);
        ctx.stroke();
        
        // Animated glow for sell button
        if (animated) {
            const glowIntensity = 10 + Math.sin(time * 4) * 6;
            ctx.shadowColor = borderColor;
            ctx.shadowBlur = glowIntensity;
        }
        
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Text with shadow
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
        ctx.fillText(text, x + width / 2, y + height / 2);
        
        ctx.restore();
    }
    
    /**
     * Calculate the sell value of a tower
     * Returns 50% of the total invested value (base cost * level multiplier)
     */
    calculateSellValue(tower) {
        const config = CANNON_TYPES[tower.type];
        if (!config) return 0;
        
        // Calculate total value: base cost + value of all merges
        // Level 1 = base cost
        // Level 2 = 3x level 1 towers merged = 3 * baseCost
        // Level 3 = 3x level 2 = 9 * baseCost
        // etc.
        const baseCost = config.cost;
        const totalValue = baseCost * Math.pow(3, tower.level - 1);
        
        // Return 50% as sell value
        return Math.floor(totalValue * 0.5);
    }
    
    /**
     * Show tower info panel for a specific tower
     */
    showTowerInfo(tower, sellCallback, selectForMergeCallback = null) {
        this.selectedTowerForInfo = tower;
        this.showTowerInfoPanel = true;
        this.sellCallback = sellCallback;
        this.selectForMergeCallback = selectForMergeCallback;
        if (this.audio) this.audio.uiClick();
    }
    
    /**
     * Hide tower info panel
     */
    hideTowerInfo() {
        this.showTowerInfoPanel = false;
        this.selectedTowerForInfo = null;
        this.towerInfoSellButton = null;
        this.towerInfoSelectButton = null;
        this.towerInfoCloseButton = null;
        this.sellCallback = null;
        this.selectForMergeCallback = null;
    }
    
    /**
     * Check if tower info panel close button was clicked
     */
    isTowerInfoCloseClicked(screenX, screenY) {
        if (!this.towerInfoCloseButton) return false;
        return Utils.pointInRect(
            screenX, screenY,
            this.towerInfoCloseButton.x, this.towerInfoCloseButton.y,
            this.towerInfoCloseButton.width, this.towerInfoCloseButton.height
        );
    }
    
    /**
     * Check if tower info panel sell button was clicked
     */
    isTowerInfoSellClicked(screenX, screenY) {
        if (!this.towerInfoSellButton) return false;
        return Utils.pointInRect(
            screenX, screenY,
            this.towerInfoSellButton.x, this.towerInfoSellButton.y,
            this.towerInfoSellButton.width, this.towerInfoSellButton.height
        );
    }
    
    /**
     * Check if tower info panel select button was clicked
     */
    isTowerInfoSelectClicked(screenX, screenY) {
        if (!this.towerInfoSelectButton) return false;
        return Utils.pointInRect(
            screenX, screenY,
            this.towerInfoSelectButton.x, this.towerInfoSelectButton.y,
            this.towerInfoSelectButton.width, this.towerInfoSelectButton.height
        );
    }
    
    /**
     * Handle tower info panel clicks
     * Returns: 'close', 'sell', 'select', or null
     */
    handleTowerInfoClick(screenX, screenY) {
        if (!this.showTowerInfoPanel) return null;
        
        if (this.isTowerInfoCloseClicked(screenX, screenY)) {
            return 'close';
        }
        if (this.isTowerInfoSelectClicked(screenX, screenY)) {
            return 'select';
        }
        if (this.isTowerInfoSellClicked(screenX, screenY)) {
            return 'sell';
        }
        return null;
    }

    /**
     * Check if sidebar button was clicked (ability or shop item)
     */
    getClickedSidebarButton(screenPos) {
        const touchPadding = 8; // Extra padding for easier touch targeting
        for (const button of this.sidebarButtons) {
            if (Utils.pointInRectWithPadding(
                screenPos.x, screenPos.y,
                button.x, button.y,
                button.width, button.height,
                touchPadding
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
    enterBombTargetingMode(callback, abilityType = 'BOMB') {
        this.bombTargetingMode = true;
        this.targetingCallback = callback;
        this.targetingAbilityType = abilityType;
        this.targetingAnimTime = 0;
        this.targetingHasTouch = false; // Reset touch state
        this.targetingCursorPos = { x: 0, y: 0 }; // Reset position
        // Hide default cursor on desktop
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isMobile) {
            this.canvas.style.cursor = 'none';
        }
    }

    /**
     * Update targeting cursor position (called from input handler)
     */
    updateTargetingCursor(x, y, isTouch = false, touchEnded = false) {
        this.targetingCursorPos.x = x;
        this.targetingCursorPos.y = y;
        
        if (touchEnded) {
            // Touch ended - hide mobile cursor
            this.targetingHasTouch = false;
        } else if (isTouch) {
            // Touch active - show cursor at touch position
            this.targetingHasTouch = true;
        }
    }

    /**
     * Exit bomb targeting mode
     */
    exitBombTargetingMode() {
        this.bombTargetingMode = false;
        this.targetingCallback = null;
        this.targetingAbilityType = null;
        this.targetingHasTouch = false;
        this.bombCancelButton = null;
        // Restore default cursor
        this.canvas.style.cursor = 'default';
    }

    renderShopButton(button, gameState) {
        const ctx = this.graphics.ctx;
        const cannon = button.cannon;
        const isSelected = button.id === this.selectedCannonType;
        
        // Check if this tower is blocked by tutorial
        const isBlockedByTutorial = this.tutorialAllowedTowers && 
                                    this.tutorialAllowedTowers.length > 0 && 
                                    !this.tutorialAllowedTowers.includes(button.id);
        
        // Calcola il costo reale con il moltiplicatore dinamico
        let baseCost = typeof calculateTowerCost === 'function' ? 
                          calculateTowerCost(cannon.id, 1) : cannon.cost;
        let multiplier = 1;
        if (gameState.cannonPriceMultiplier && gameState.cannonPriceMultiplier[cannon.id]) {
            multiplier = gameState.cannonPriceMultiplier[cannon.id];
        }
        const actualCost = Math.floor(baseCost * multiplier);
        const canAfford = gameState.coins >= actualCost && !isBlockedByTutorial;

        const cornerRadius = Math.min(8, Math.floor(button.width * 0.12));
        
        // Button background with gradient for gaming feel
        ctx.save();
        const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        if (isBlockedByTutorial) {
            bgGradient.addColorStop(0, '#2a2a2a');
            bgGradient.addColorStop(1, '#1a1a1a');
            ctx.globalAlpha = 0.5;
        } else if (isSelected) {
            // Selected: vibrant glow with tower color
            const towerColor = cannon.color || CONFIG.COLORS.BUTTON_ACTIVE;
            bgGradient.addColorStop(0, Utils.colorWithAlpha(towerColor, 0.4));
            bgGradient.addColorStop(0.5, Utils.colorWithAlpha(towerColor, 0.2));
            bgGradient.addColorStop(1, Utils.colorWithAlpha(towerColor, 0.35));
        } else {
            bgGradient.addColorStop(0, canAfford ? '#1e2832' : '#181818');
            bgGradient.addColorStop(1, canAfford ? '#0f1418' : '#0d0d0d');
            ctx.globalAlpha = canAfford ? 1.0 : 0.5;
        }
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.fill();
        ctx.restore();
        
        // Inner highlight for 3D effect
        if (!isBlockedByTutorial && canAfford) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#ffffff';
            Utils.drawRoundRect(ctx, button.x + 2, button.y + 2, button.width - 4, button.height * 0.3, cornerRadius - 1);
            ctx.fill();
            ctx.restore();
        }
        
        // Border with glow effect for selected
        ctx.save();
        if (isSelected && !isBlockedByTutorial) {
            ctx.shadowColor = cannon.color || CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.shadowBlur = 12;
        }
        ctx.strokeStyle = isSelected ? (cannon.color || CONFIG.COLORS.BUTTON_ACTIVE) : 
                         canAfford ? CONFIG.COLORS.BUTTON_BORDER : '#444444';
        ctx.lineWidth = isSelected ? 3 : 2;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.stroke();
        ctx.restore();
        
        // Render tower sprite instead of emoji icon
        ctx.save();
        const spriteSize = Math.floor(button.width * 0.65);
        const spriteX = button.x + button.width / 2;
        const spriteY = button.y + button.height * 0.38;
        
        // Apply effects for disabled/tutorial blocked
        if (isBlockedByTutorial) {
            ctx.globalAlpha = 0.3;
        } else if (!canAfford) {
            ctx.globalAlpha = 0.5;
        }
        
        // Create and render the tower sprite
        try {
            if (cannon.sprite && typeof cannon.sprite === 'function') {
                const towerSprite = cannon.sprite();
                if (towerSprite && typeof towerSprite.render === 'function') {
                    // Add subtle animation for selected tower
                    if (isSelected && !isBlockedByTutorial) {
                        const time = Date.now() * 0.003;
                        const pulse = 1.0 + Math.sin(time) * 0.05;
                        ctx.translate(spriteX, spriteY);
                        ctx.scale(pulse, pulse);
                        ctx.translate(-spriteX, -spriteY);
                    }
                    towerSprite.render(ctx, spriteX, spriteY, spriteSize, { opacity: 1.0 });
                } else {
                    // Fallback to emoji if sprite render not available
                    ctx.font = `${Math.floor(button.width * 0.35)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cannon.icon, spriteX, spriteY);
                }
            } else {
                // Fallback to emoji
                ctx.font = `${Math.floor(button.width * 0.35)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cannon.icon, spriteX, spriteY);
            }
        } catch (e) {
            // Fallback to emoji on error
            ctx.font = `${Math.floor(button.width * 0.35)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cannon.icon, spriteX, spriteY);
        }
        ctx.restore();
        
        // Name with better styling
        const labelSize = Math.max(8, Math.min(11, Math.floor(button.height * 0.15)));
        const costSize = Math.max(9, Math.min(11, Math.floor(button.height * 0.15)));

        this.graphics.drawText(cannon.name.toUpperCase(), button.x + button.width / 2, button.y + button.height * 0.72, {
            size: labelSize,
            color: canAfford ? CONFIG.COLORS.TEXT_PRIMARY : '#555555',
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: true
        });
        
        // Cost with coin icon
        const costColor = canAfford ? '#ffcc00' : '#993333';
        this.graphics.drawText(`💰 ${actualCost}`, button.x + button.width / 2, button.y + button.height * 0.88, {
            size: costSize,
            color: isBlockedByTutorial ? '#444444' : costColor,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: true
        });
        
        // Draw lock icon if blocked by tutorial
        if (isBlockedByTutorial) {
            ctx.save();
            ctx.font = `${Math.floor(button.width * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.9;
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText('🔒', button.x + button.width / 2, button.y + button.height * 0.4);
            ctx.restore();
        }
        
        // Selection indicator (animated corner accent)
        if (isSelected && !isBlockedByTutorial) {
            ctx.save();
            const time = Date.now() * 0.004;
            const accentAlpha = 0.7 + Math.sin(time) * 0.3;
            ctx.globalAlpha = accentAlpha;
            ctx.strokeStyle = cannon.color || CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            // Top-left corner accent
            ctx.beginPath();
            ctx.moveTo(button.x + 3, button.y + cornerRadius + 8);
            ctx.lineTo(button.x + 3, button.y + 3);
            ctx.lineTo(button.x + cornerRadius + 8, button.y + 3);
            ctx.stroke();
            
            // Bottom-right corner accent
            ctx.beginPath();
            ctx.moveTo(button.x + button.width - 3, button.y + button.height - cornerRadius - 8);
            ctx.lineTo(button.x + button.width - 3, button.y + button.height - 3);
            ctx.lineTo(button.x + button.width - cornerRadius - 8, button.y + button.height - 3);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    handleTap(gridPos, screenPos, gameState) {
        // Check if tower info panel is open (highest priority)
        if (this.showTowerInfoPanel) {
            const action = this.handleTowerInfoClick(screenPos.x, screenPos.y);
            if (action === 'close') {
                this.hideTowerInfo();
                if (this.audio) this.audio.uiClick();
                return { type: 'towerInfo', action: 'close' };
            } else if (action === 'select') {
                const tower = this.selectedTowerForInfo;
                if (this.selectForMergeCallback) {
                    this.selectForMergeCallback(tower);
                }
                this.hideTowerInfo();
                if (this.audio) this.audio.uiClick();
                return { type: 'towerInfo', action: 'select', tower };
            } else if (action === 'sell') {
                const tower = this.selectedTowerForInfo;
                const sellValue = this.calculateSellValue(tower);
                if (this.sellCallback) {
                    this.sellCallback(tower, sellValue);
                }
                this.hideTowerInfo();
                return { type: 'towerInfo', action: 'sell', tower, sellValue };
            }
            // Click outside buttons - close panel
            this.hideTowerInfo();
            if (this.audio) this.audio.uiClick();
            return { type: 'towerInfo', action: 'close' };
        }
        
        // Check if info pages are open (highest priority)
        if (this.infoPages && this.infoPages.isOpen) {
            const result = this.infoPages.handleTap(screenPos);
            if (result) {
                return { type: 'info', action: result };
            }
            return null;
        }
        
        // Check if in bomb targeting mode
        if (this.bombTargetingMode) {
            // Check cancel button first
            if (this.isBombCancelButtonClicked(screenPos.x, screenPos.y)) {
                this.exitBombTargetingMode();
                return { type: 'ability', action: 'cancel_targeting' };
            }
            
            // For bomb/stun targeting, be more permissive with grid position
            // Clamp to valid grid bounds instead of rejecting
            const clampedGridPos = {
                col: Math.max(0, Math.min(CONFIG.COLS - 1, gridPos.col)),
                row: Math.max(0, Math.min(CONFIG.ROWS - 1, gridPos.row))
            };
            
            // Accept any tap that's reasonably close to the grid area
            // (within 1 cell of the edges)
            const isNearGrid = gridPos.col >= -1 && gridPos.col <= CONFIG.COLS &&
                               gridPos.row >= -1 && gridPos.row <= CONFIG.ROWS;
            
            if (isNearGrid) {
                const callback = this.targetingCallback;
                this.exitBombTargetingMode();
                if (callback) {
                    callback(clampedGridPos);
                }
                return { type: 'ability', action: 'bomb_placed', gridPos: clampedGridPos };
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
        
        // Check info button click
        if (this.checkInfoButtonClick(screenPos.x, screenPos.y)) {
            this.infoPages.open();
            return { type: 'info', action: 'open' };
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
            // Check if tutorial restricts tower selection
            if (this.tutorialAllowedTowers && this.tutorialAllowedTowers.length > 0) {
                if (!this.tutorialAllowedTowers.includes(clickedButton.id)) {
                    // Tower not allowed during this tutorial step - ignore click
                    return null;
                }
            }
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
        const touchPadding = 6; // Extra padding for easier touch targeting
        for (const button of this.shopButtons) {
            if (Utils.pointInRectWithPadding(
                screenPos.x, screenPos.y,
                button.x, button.y,
                button.width, button.height,
                touchPadding
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

    /**
     * Set allowed tower types for tutorial (null = all allowed)
     */
    setTutorialAllowedTowers(allowedTypes) {
        this.tutorialAllowedTowers = allowedTypes;
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
        // Check fullscreen state: prefer local tracking, then PlatformSDK, fallback to CSS classes
        const isFullscreen = window._gameFullscreenState === true ||
            ((window.PlatformSDK && typeof window.PlatformSDK.isFullscreen === 'function') 
                ? window.PlatformSDK.isFullscreen() 
                : (document.body.classList.contains('game-fullscreen') || document.body.classList.contains('ios-game-fullscreen')));
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
        this.victoryPlayAgainButton = null;
    }

    // Victory screen - player completed all waves
    showVictory(gameState, coinReward = 0, rewardAwarded = false) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Overlay with gold tint
        ctx.fillStyle = 'rgba(20, 15, 0, 0.92)';
        ctx.fillRect(0, 0, width, height);
        
        // Popup box
        const popupWidth = Math.min(400, width * 0.85);
        const popupHeight = Math.min(480, height * 0.7);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;
        
        // Popup background with gold theme
        ctx.fillStyle = 'rgba(15, 12, 5, 0.98)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
        
        // Gold border
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 4;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);
        
        ctx.strokeStyle = 'rgba(255, 221, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX + 6, popupY + 6, popupWidth - 12, popupHeight - 12);
        
        // Title
        this.graphics.drawText('🏆 VICTORY! 🏆', width / 2, popupY + 55, {
            size: 42,
            color: '#ffdd00',
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Subtitle
        this.graphics.drawText(`Completed ${gameState.targetWaves} Waves!`, width / 2, popupY + 95, {
            size: 20,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            shadow: true
        });
        
        // Stats section
        const statsY = popupY + 130;
        ctx.fillStyle = 'rgba(255, 221, 0, 0.1)';
        ctx.fillRect(popupX + 20, statsY, popupWidth - 40, 140);
        
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1;
        ctx.strokeRect(popupX + 20, statsY, popupWidth - 40, 140);
        
        const stats = [
            `Score: ${Utils.formatNumber(gameState.score)}`,
            `Kills: ${gameState.kills}`,
            `Time: ${Utils.formatTime(gameState.playTime)}`,
            `Highest Tower: Lv.${gameState.highestLevel}`
        ];
        
        let y = statsY + 28;
        stats.forEach(stat => {
            this.graphics.drawText(stat, width / 2, y, {
                size: 18,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                shadow: true
            });
            y += 30;
        });
        
        // Reward section
        const rewardY = statsY + 160;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.fillRect(popupX + 20, rewardY, popupWidth - 40, 60);
        
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX + 20, rewardY, popupWidth - 40, 60);
        
        this.graphics.drawText('🎁 REWARD', width / 2, rewardY + 20, {
            size: 14,
            color: CONFIG.COLORS.TEXT_SECONDARY,
            align: 'center',
            bold: true
        });
        
        const rewardText = rewardAwarded ? 
            `+${coinReward} Platform Coins Awarded!` : 
            `+${coinReward} Platform Coins`;
        this.graphics.drawText(rewardText, width / 2, rewardY + 42, {
            size: 22,
            color: '#ffdd00',
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Play Again button
        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 80;
        
        this.victoryPlayAgainButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        ctx.fillStyle = 'rgba(0, 200, 100, 0.9)';
        Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.stroke();
        
        this.graphics.drawText('🔄 Play Again', width / 2, buttonY + buttonHeight / 2, {
            size: 22,
            color: '#ffffff',
            align: 'center',
            baseline: 'middle',
            bold: true
        });
    }
    
    // Check if victory play again button was clicked
    isVictoryPlayAgainClicked(screenX, screenY) {
        if (!this.victoryPlayAgainButton) return false;
        
        return screenX >= this.victoryPlayAgainButton.x &&
               screenX <= this.victoryPlayAgainButton.x + this.victoryPlayAgainButton.width &&
               screenY >= this.victoryPlayAgainButton.y &&
               screenY <= this.victoryPlayAgainButton.y + this.victoryPlayAgainButton.height;
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
        // Check fullscreen state: prefer local tracking, then PlatformSDK, fallback to CSS classes
        const isFullscreen = window._gameFullscreenState === true ||
            ((window.PlatformSDK && typeof window.PlatformSDK.isFullscreen === 'function') 
                ? window.PlatformSDK.isFullscreen() 
                : (document.body.classList.contains('game-fullscreen') || document.body.classList.contains('ios-game-fullscreen')));
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
    
    // Check if info button was clicked
    checkInfoButtonClick(screenX, screenY) {
        if (!this.infoButton) return false;
        
        return screenX >= this.infoButton.x && 
               screenX <= this.infoButton.x + this.infoButton.width &&
               screenY >= this.infoButton.y && 
               screenY <= this.infoButton.y + this.infoButton.height;
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
                const hintText = '[ Tap to continue ]';
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
    
    /**
     * Handle drag move for info pages scrolling
     */
    handleDragMove(screenPos) {
        if (this.infoPages && this.infoPages.isOpen) {
            return this.infoPages.handleDragMove(screenPos);
        }
        return false;
    }
    
    /**
     * Handle drag end for info pages scrolling
     */
    handleDragEnd() {
        if (this.infoPages && this.infoPages.isOpen) {
            this.infoPages.handleDragEnd();
        }
    }
    
    /**
     * Check if info pages are currently open
     */
    isInfoPagesOpen() {
        return this.infoPages && this.infoPages.isOpen;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
