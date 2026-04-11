/**
 * SidebarRenderer
 * Renders the left sidebar with ability buttons and shop item buttons,
 * plus the active boost bars displayed to the right of the sidebar.
 */

import { CONFIG, UI_CONFIG, SHOP_ITEMS, SPECIAL_ABILITIES } from '../config.js';
import { Utils } from '../utils.js';

export class SidebarRenderer {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;

        this.sidebarButtons = [];
        this.sidebarWidth = 0;
        this.sidebarHeight = 0;

        // Legacy ability buttons (BOMB + PUSHBACK only)
        this.abilityButtons = [];

        this.setupSidebar();
        this.setupAbilityButtons();
    }

    /**
     * Setup the left sidebar with abilities and shop items
     */
    setupSidebar() {
        const sidebarWidth = UI_CONFIG.SIDEBAR_WIDTH || 64;
        const buttonSize = 46;
        const buttonSpacing = 5;
        const sidebarX = (sidebarWidth - buttonSize) / 2;
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

        this.sidebarWidth = sidebarWidth;
        this.sidebarHeight = currentY - startY + 10;
    }

    setupAbilityButtons() {
        const buttonSize = 56;
        const buttonSpacing = 10;
        const startX = 10;
        const startY = UI_CONFIG.TOP_BAR_HEIGHT + 80;

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

        this.sidebarButtons.forEach((button) => {
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
     * Render active boost bars on the main game screen.
     * Shows duration bars for all active temporary boosts.
     */
    renderActiveBoostBars(gameState) {
        if (!gameState.activeBoosts || gameState.activeBoosts.length === 0) return;

        const ctx = this.graphics.ctx;
        const now = Date.now();
        const time = now * 0.001;

        // Position bars to the right of the sidebar
        const barX = (this.sidebarWidth || 64) + 8;
        let barY = UI_CONFIG.TOP_BAR_HEIGHT + 10;
        const barWidth = 120;
        const barHeight = 28;
        const barSpacing = 6;

        gameState.activeBoosts.forEach((boost) => {
            const remainingMs = boost.endTime - now;
            const progress = Math.max(0, remainingMs / boost.duration);
            const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

            const shopItem = SHOP_ITEMS[boost.id];
            const boostColor = shopItem?.color || CONFIG.COLORS.TEXT_PRIMARY;
            const barColor = shopItem?.barColor || boostColor;

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

    // -------------------------------------------------------------------------
    // Ability button rendering
    // -------------------------------------------------------------------------

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

        ctx.shadowColor = isReady ? '#ffdd00' : '#333333';
        ctx.shadowBlur = isReady ? 4 : 0;
        ctx.fillStyle = isReady ? '#ffdd00' : '#444444';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isReady ? '#ffffff' : '#666666';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isReady ? '#000000' : '#888888';
        ctx.fillText(`${level}`, badgeX, badgeY);
        ctx.restore();
    }

    drawAbilitySprite(ctx, abilityId, x, y, size, color, isReady, time) {
        ctx.save();
        ctx.translate(x, y);

        const s = size / 2;

        switch (abilityId) {
            case 'BOMB':
                this.drawBomb(ctx, s, isReady, time);
                break;

            case 'PUSHBACK':
                this.drawWaveLines(ctx, color, isReady, time, s);
                break;

            case 'STUN':
                this.drawLightningBolt(ctx, color, s, isReady, time);
                break;

            default:
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();
    }

    drawLightningBolt(ctx, color, s, isReady, time) {
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
    }

    drawWaveLines(ctx, color, isReady, time, s) {
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

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(s * 0.5, 0);
        ctx.lineTo(s * 0.2, -s * 0.25);
        ctx.lineTo(s * 0.2, s * 0.25);
        ctx.closePath();
        ctx.fill();
    }

    drawBomb(ctx, s, isReady, time) {
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(0, 2, s * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(-s * 0.2, -s * 0.1, s * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#666666';
        ctx.fillRect(-s * 0.12, -s * 0.5, s * 0.24, s * 0.3);

        ctx.strokeStyle = '#aa8844';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.5);
        ctx.quadraticCurveTo(s * 0.3, -s * 0.7, s * 0.2, -s * 0.9);
        ctx.stroke();

        if (isReady) {
            const flicker = Math.sin(time * 15) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, ${Math.floor(150 + flicker * 100)}, 0, ${flicker})`;
            ctx.beginPath();
            ctx.arc(s * 0.2, -s * 0.9, s * 0.15 + Math.sin(time * 20) * s * 0.05, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(s * 0.2, -s * 0.9, s * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // -------------------------------------------------------------------------
    // Shop item button rendering
    // -------------------------------------------------------------------------

    renderShopItemButtonStyled(ctx, button, gameState, time, cornerRadius, centerX, centerY) {
        const item = button.data;
        const canAfford = gameState.coins >= item.cost;

        const isActive = item.type === 'temporary' && gameState.activeBoosts?.some(b => b.type === item.effect.type);
        const isDisabled = !canAfford || isActive;

        ctx.save();
        const bgGradient = this.setBgGradient(ctx, button, isActive, time, item, canAfford);
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.fill();
        ctx.restore();

        this.innerHighlight(canAfford, isDisabled, ctx, button, cornerRadius);
        this.renderButtonBorderWithGlow(ctx, isActive, canAfford, item, button, cornerRadius);

        ctx.save();
        ctx.globalAlpha = isDisabled && !isActive ? 0.35 : 1.0;
        const iconSize = button.width * 0.5;
        this.drawShopItemSprite(ctx, button.id, centerX, centerY - 4, iconSize, item.color, canAfford, isActive, time);
        ctx.restore();

        this.renderShopItemCostOrLabel(ctx, button, isActive, centerX, canAfford, item);
    }

    renderButtonBorderWithGlow(ctx, isActive, canAfford, item, button, cornerRadius) {
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
    }

    renderShopItemCostOrLabel(ctx, button, isActive, centerX, canAfford, item) {
        ctx.save();
        const labelY = button.y + button.height - 8;

        if (isActive) {
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ACTIVE', centerX, labelY);
        } else {
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = canAfford ? '#ffcc00' : '#555555';
            ctx.fillText(`💰${item.cost}`, centerX, labelY);
        }
        ctx.restore();
    }

    innerHighlight(canAfford, isDisabled, ctx, button, cornerRadius) {
        if (canAfford && !isDisabled) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#ffffff';
            Utils.drawRoundRect(ctx, button.x + 2, button.y + 2, button.width - 4, button.height * 0.3, cornerRadius - 1);
            ctx.fill();
            ctx.restore();
        }
    }

    setBgGradient(ctx, button, isActive, time, item, canAfford) {
        const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        if (isActive) {
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
        return bgGradient;
    }

    drawShopItemSprite(ctx, itemId, x, y, size, color, canAfford, isActive, time) {
        ctx.save();
        ctx.translate(x, y);

        const s = size / 2;

        switch (itemId) {
            case 'ENERGY_SMALL':
                this.drawEnergySmall(ctx, canAfford, s);
                break;

            case 'ENERGY_LARGE':
                this.drawEnergyLarge(ctx, canAfford, s);
                break;

            case 'RANGE_BOOST':
                this.drawRangeBoost(ctx, canAfford, isActive, time, s);
                break;

            case 'FIRERATE_BOOST':
                this.drawFireRateBoost(ctx, canAfford, s, isActive, time);
                break;

            case 'DAMAGE_BOOST':
                this.drawDamageBoostEffect(ctx, canAfford, s, isActive, time);
                break;

            case 'TOWER_UPGRADE':
                this.drawTowerUpgradeStar(ctx, canAfford, s, time);
                break;

            default:
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();
    }

    drawTowerUpgradeStar(ctx, canAfford, s, time) {
        ctx.fillStyle = canAfford ? '#ffdd00' : '#665522';

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

        ctx.fillStyle = canAfford ? '#ffffff' : '#887744';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.25);
        ctx.lineTo(s * 0.15, s * 0.05);
        ctx.lineTo(-s * 0.15, s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-s * 0.06, s * 0.0, s * 0.12, s * 0.15);

        if (canAfford) {
            ctx.fillStyle = '#ffffff';
            const sparkle = Math.sin(time * 5) * 0.5 + 0.5;
            ctx.globalAlpha = sparkle;
            ctx.beginPath();
            ctx.arc(s * 0.4, -s * 0.4, s * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDamageBoostEffect(ctx, canAfford, s, isActive, time) {
        ctx.fillStyle = canAfford ? '#ff4444' : '#553333';

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

        if (canAfford) {
            ctx.fillStyle = '#ff8866';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }

        if (isActive) {
            const pulse = Math.sin(time * 6) * 0.3 + 0.7;
            ctx.globalAlpha = pulse * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFireRateBoost(ctx, canAfford, s, isActive, time) {
        ctx.fillStyle = canAfford ? '#ffcc00' : '#665533';

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
    }

    drawRangeBoost(ctx, canAfford, isActive, time, s) {
        ctx.strokeStyle = canAfford ? '#4488ff' : '#334455';
        ctx.lineWidth = 2;

        for (let i = 0; i < 3; i++) {
            const waveOffset = isActive ? Math.sin(time * 4 + i) * 2 : 0;
            ctx.globalAlpha = isActive ? 0.4 + i * 0.2 : (canAfford ? 0.5 + i * 0.15 : 0.3);
            ctx.beginPath();
            ctx.arc(-s * 0.2 + waveOffset, 0, s * 0.3 + i * s * 0.25, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = canAfford ? '#4488ff' : '#334455';
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.3);
        ctx.quadraticCurveTo(-s * 0.3, 0, -s * 0.5, s * 0.3);
        ctx.lineTo(-s * 0.6, s * 0.2);
        ctx.lineTo(-s * 0.6, -s * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = canAfford ? '#88aaff' : '#445566';
        ctx.beginPath();
        ctx.arc(-s * 0.45, 0, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEnergyLarge(ctx, canAfford, s) {
        ctx.fillStyle = canAfford ? '#00ff88' : '#446655';

        ctx.fillRect(-s * 0.4, -s * 0.5, s * 0.8, s * 1.0);
        ctx.fillRect(-s * 0.15, -s * 0.7, s * 0.3, s * 0.2);

        ctx.fillStyle = canAfford ? '#88ffaa' : '#557766';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-s * 0.3, s * 0.3 - i * s * 0.3, s * 0.6, s * 0.2);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(-s * 0.35, -s * 0.45, s * 0.15, s * 0.9);
    }

    drawEnergySmall(ctx, canAfford, s) {
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

        if (canAfford) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 6;
            ctx.fill();
        }
    }

    // -------------------------------------------------------------------------
    // Legacy ability buttons (BOMB + PUSHBACK only, old layout)
    // -------------------------------------------------------------------------

    renderAbilityButtons(gameState) {
        const ctx = this.graphics.ctx;
        const now = Date.now();
        const time = now * 0.001;

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

            ctx.save();
            if (isReady) {
                const pulse = Math.sin(time * 4 + index) * 0.3 + 0.7;
                ctx.shadowColor = ability.glowColor;
                ctx.shadowBlur = 15 * pulse;
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

            ctx.strokeStyle = isReady ? ability.glowColor : 'rgba(100, 100, 120, 0.6)';
            ctx.lineWidth = isReady ? 3 : 2;
            Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
            ctx.stroke();

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

            const levelY = button.y + button.height - 10;
            ctx.save();
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isReady ? '#ffdd00' : '#888888';
            ctx.fillText(`Lv.${level}`, centerX, levelY);
            ctx.restore();

            if (abilityState.uses > 0) {
                ctx.save();
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'right';
                ctx.fillStyle = '#00ff88';
                ctx.fillText(`×${abilityState.uses}`, button.x + button.width - 5, button.y + 12);
                ctx.restore();
            }

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

    // -------------------------------------------------------------------------
    // Hit testing
    // -------------------------------------------------------------------------

    getClickedSidebarButton(screenPos) {
        const touchPadding = 8;
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

    /** Check if an ability button was clicked (legacy — uses sidebar) */
    getClickedAbilityButton(screenPos) {
        const clicked = this.getClickedSidebarButton(screenPos);
        if (clicked && clicked.type === 'ability') {
            return { id: clicked.id, ability: clicked.data };
        }
        return null;
    }
}
