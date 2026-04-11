/**
 * ShopRenderer
 * Manages the bottom tower-selection bar: setup, rendering, and hit-testing.
 * Owns: shopButtons array, selectedCannonType, tutorialAllowedTowers.
 */

import { CONFIG, CANNON_TYPES, UI_CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class ShopRenderer {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;

        this.shopButtons = [];
        this.selectedCannonType = 'BASIC';

        /** Array of allowed tower ids during tutorial, null = all allowed */
        this.tutorialAllowedTowers = null;

        this.setupShopButtons();
    }

    // ── Setup ────────────────────────────────────────────────────────────────

    setupShopButtons() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const buttonCount = Object.keys(CANNON_TYPES).length;
        const horizontalPadding = 12;
        const minSpacing = 4;

        // Make buttons responsive: reduce spacing first, then shrink size.
        let spacing = UI_CONFIG.BUTTON_SPACING;
        let buttonSize = UI_CONFIG.BUTTON_SIZE;

        const fitSize = (candidateSpacing) =>
            Math.floor((width - horizontalPadding * 2 - candidateSpacing * (buttonCount - 1)) / buttonCount);

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
                x,
                y: buttonY,
                width: buttonSize,
                height: buttonSize,
                cannon
            });
            x += buttonSize + spacing;
        }
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    render(gameState) {
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

        this.shopButtons.forEach(button => this._renderButton(button, gameState));
    }

    _renderButton(button, gameState) {
        const cannon = button.cannon;
        const isSelected = button.id === this.selectedCannonType;

        const isBlockedByTutorial = this.tutorialAllowedTowers &&
            this.tutorialAllowedTowers.length > 0 &&
            !this.tutorialAllowedTowers.includes(button.id);

        // Compute actual cost with dynamic price multiplier
        let baseCost = typeof calculateTowerCost === 'function'
            ? calculateTowerCost(cannon.id, 1)
            : cannon.cost;
        let multiplier = gameState.cannonPriceMultiplier?.[cannon.id] ?? 1;
        const actualCost = Math.floor(baseCost * multiplier);
        const canAfford = gameState.coins >= actualCost && !isBlockedByTutorial;

        const cornerRadius = Math.min(8, Math.floor(button.width * 0.12));

        this._renderButtonBackground(button, cannon, isSelected, isBlockedByTutorial, canAfford, cornerRadius);
        this._renderButtonHighlight(button, isBlockedByTutorial, canAfford, cornerRadius);
        this._renderButtonBorder(button, cannon, isSelected, isBlockedByTutorial, canAfford, cornerRadius);
        this._renderButtonSprite(button, cannon, isSelected, isBlockedByTutorial, canAfford);
        this._renderButtonLabels(button, cannon, actualCost, canAfford, isBlockedByTutorial);
        this._renderLockIcon(button, isBlockedByTutorial);
        this._renderSelectionAccents(button, cannon, isSelected, isBlockedByTutorial, cornerRadius);
    }

    _renderButtonBackground(button, cannon, isSelected, isBlockedByTutorial, canAfford, cornerRadius) {
        const ctx = this.graphics.ctx;
        ctx.save();
        const bgGradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        if (isBlockedByTutorial) {
            bgGradient.addColorStop(0, '#2a2a2a');
            bgGradient.addColorStop(1, '#1a1a1a');
            ctx.globalAlpha = 0.5;
        } else if (isSelected) {
            const towerColor = cannon.color || CONFIG.COLORS.BUTTON_ACTIVE;
            bgGradient.addColorStop(0, Utils.colorWithAlpha(towerColor, 0.4));
            bgGradient.addColorStop(0.5, Utils.colorWithAlpha(towerColor, 0.2));
            bgGradient.addColorStop(1, Utils.colorWithAlpha(towerColor, 0.35));
        } else {
            bgGradient.addColorStop(0, canAfford ? '#1e2832' : '#181818');
            bgGradient.addColorStop(1, canAfford ? '#0f1418' : '#0d0d0d');
            ctx.globalAlpha = canAfford ? 1 : 0.5;
        }
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.fill();
        ctx.restore();
    }

    _renderButtonHighlight(button, isBlockedByTutorial, canAfford, cornerRadius) {
        if (!isBlockedByTutorial && canAfford) {
            const ctx = this.graphics.ctx;
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#ffffff';
            Utils.drawRoundRect(ctx, button.x + 2, button.y + 2, button.width - 4, button.height * 0.3, cornerRadius - 1);
            ctx.fill();
            ctx.restore();
        }
    }

    _renderButtonBorder(button, cannon, isSelected, isBlockedByTutorial, canAfford, cornerRadius) {
        const ctx = this.graphics.ctx;
        ctx.save();
        if (isSelected && !isBlockedByTutorial) {
            ctx.shadowColor = cannon.color || CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.shadowBlur = 12;
        }
        const borderColor = canAfford ? CONFIG.COLORS.BUTTON_BORDER : '#444444';
        ctx.strokeStyle = isSelected
            ? (cannon.color || CONFIG.COLORS.BUTTON_ACTIVE)
            : borderColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, cornerRadius);
        ctx.stroke();
        ctx.restore();
    }

    _renderButtonSprite(button, cannon, isSelected, isBlockedByTutorial, canAfford) {
        const ctx = this.graphics.ctx;
        ctx.save();
        const spriteSize = Math.floor(button.width * 0.65);
        const spriteX = button.x + button.width / 2;
        const spriteY = button.y + button.height * 0.38;

        if (isBlockedByTutorial) {
            ctx.globalAlpha = 0.3;
        } else if (!canAfford) {
            ctx.globalAlpha = 0.5;
        }

        if (cannon.sprite && typeof cannon.sprite === 'function') {
            const towerSprite = cannon.sprite();
            if (towerSprite && typeof towerSprite.render === 'function') {
                if (isSelected && !isBlockedByTutorial) {
                    const time = Date.now() * 0.003;
                    const pulse = 1 + Math.sin(time) * 0.05;
                    ctx.translate(spriteX, spriteY);
                    ctx.scale(pulse, pulse);
                    ctx.translate(-spriteX, -spriteY);
                }
                towerSprite.render(ctx, spriteX, spriteY, spriteSize, { opacity: 1 });
            }
        }
        ctx.restore();
    }

    _renderButtonLabels(button, cannon, actualCost, canAfford, isBlockedByTutorial) {
        const labelSize = Math.max(8, Math.min(11, Math.floor(button.height * 0.15)));
        this.graphics.drawText(cannon.name.toUpperCase(), button.x + button.width / 2, button.y + button.height * 0.72, {
            size: labelSize,
            color: canAfford ? CONFIG.COLORS.TEXT_PRIMARY : '#555555',
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: true
        });

        const costSize = Math.max(9, Math.min(11, Math.floor(button.height * 0.15)));
        const costColor = canAfford ? '#ffcc00' : '#993333';
        this.graphics.drawText(`💰 ${actualCost}`, button.x + button.width / 2, button.y + button.height * 0.88, {
            size: costSize,
            color: isBlockedByTutorial ? '#444444' : costColor,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: true
        });
    }

    _renderLockIcon(button, isBlockedByTutorial) {
        if (isBlockedByTutorial) {
            const ctx = this.graphics.ctx;
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
    }

    _renderSelectionAccents(button, cannon, isSelected, isBlockedByTutorial, cornerRadius) {
        if (isSelected && !isBlockedByTutorial) {
            const ctx = this.graphics.ctx;
            ctx.save();
            const time = Date.now() * 0.004;
            ctx.globalAlpha = 0.7 + Math.sin(time) * 0.3;
            ctx.strokeStyle = cannon.color || CONFIG.COLORS.BUTTON_ACTIVE;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            // Top-left
            ctx.beginPath();
            ctx.moveTo(button.x + 3, button.y + cornerRadius + 8);
            ctx.lineTo(button.x + 3, button.y + 3);
            ctx.lineTo(button.x + cornerRadius + 8, button.y + 3);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(button.x + button.width - 3, button.y + button.height - cornerRadius - 8);
            ctx.lineTo(button.x + button.width - 3, button.y + button.height - 3);
            ctx.lineTo(button.x + button.width - cornerRadius - 8, button.y + button.height - 3);
            ctx.stroke();

            ctx.restore();
        }
    }

    // ── Hit-testing ──────────────────────────────────────────────────────────

    getClickedShopButton(screenPos) {
        const touchPadding = 6;
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

    // ── State setters ────────────────────────────────────────────────────────

    setSelectedCannonType(type) {
        this.selectedCannonType = type;
    }

    setTutorialAllowedTowers(allowedTypes) {
        this.tutorialAllowedTowers = allowedTypes;
    }
}
