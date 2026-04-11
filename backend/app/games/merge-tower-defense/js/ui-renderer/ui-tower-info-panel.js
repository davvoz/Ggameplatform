import { CANNON_TYPES } from '../config.js';
import { Utils } from '../utils.js';

export class TowerInfoPanel {
    constructor(graphics, canvas, audio = null) {
        this.graphics = graphics;
        this.canvas = canvas;
        this.audio = audio;

        this.showTowerInfoPanel = false;
        this.selectedTowerForInfo = null;
        this.towerInfoSellButton = null;
        this.towerInfoSelectButton = null;
        this.towerInfoCloseButton = null;
        this.sellCallback = null;
        this.selectForMergeCallback = null;
    }

    /**
     * Show tower info panel for a specific tower
     */
    show(tower, sellCallback, selectForMergeCallback = null) {
        this.selectedTowerForInfo = tower;
        this.showTowerInfoPanel = true;
        this.sellCallback = sellCallback;
        this.selectForMergeCallback = selectForMergeCallback;
        if (this.audio) this.audio.uiClick();
    }

    /**
     * Hide tower info panel
     */
    hide() {
        this.showTowerInfoPanel = false;
        this.selectedTowerForInfo = null;
        this.towerInfoSellButton = null;
        this.towerInfoSelectButton = null;
        this.towerInfoCloseButton = null;
        this.sellCallback = null;
        this.selectForMergeCallback = null;
    }

    /**
     * Calculate the sell value of a tower (50% of total invested value)
     */
    calculateSellValue(tower) {
        const config = CANNON_TYPES[tower.type];
        if (!config) return 0;
        const baseCost = config.cost;
        const totalValue = baseCost * Math.pow(3, tower.level - 1);
        return Math.floor(totalValue * 0.5);
    }

    /**
     * Handle click on the tower info panel.
     * Returns: 'close' | 'sell' | 'select' | null
     */
    handleClick(screenX, screenY) {
        if (!this.showTowerInfoPanel) return null;
        if (this._isCloseClicked(screenX, screenY)) return 'close';
        if (this._isSelectClicked(screenX, screenY)) return 'select';
        if (this._isSellClicked(screenX, screenY)) return 'sell';
        return null;
    }

    _isCloseClicked(screenX, screenY) {
        if (!this.towerInfoCloseButton) return false;
        return Utils.pointInRect(screenX, screenY,
            this.towerInfoCloseButton.x, this.towerInfoCloseButton.y,
            this.towerInfoCloseButton.width, this.towerInfoCloseButton.height);
    }

    _isSellClicked(screenX, screenY) {
        if (!this.towerInfoSellButton) return false;
        return Utils.pointInRect(screenX, screenY,
            this.towerInfoSellButton.x, this.towerInfoSellButton.y,
            this.towerInfoSellButton.width, this.towerInfoSellButton.height);
    }

    _isSelectClicked(screenX, screenY) {
        if (!this.towerInfoSelectButton) return false;
        return Utils.pointInRect(screenX, screenY,
            this.towerInfoSelectButton.x, this.towerInfoSelectButton.y,
            this.towerInfoSelectButton.width, this.towerInfoSelectButton.height);
    }

    /**
     * Render the full tower info panel
     */
    render() {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const time = Date.now() * 0.001;

        const tower = this.selectedTowerForInfo;
        if (!tower) return;

        const towerConfig = CANNON_TYPES[tower.type];
        if (!towerConfig) return;

        const sellValue = this.calculateSellValue(tower);

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

        this._renderStatRow(ctx, leftX, rightX, statsStartY, 'DAMAGE', tower.damage.toFixed(1), '#ff6b6b');
        this._renderStatRow(ctx, leftX, rightX, statsStartY + statSpacing, 'FIRE RATE', `${(1000 / tower.fireRate).toFixed(1)}/s`, '#ffa94d');
        this._renderStatRow(ctx, leftX, rightX, statsStartY + statSpacing * 2, 'RANGE', tower.range.toFixed(1), '#69db7c');

        // === SELL VALUE SECTION ===
        const sellBoxY = statsStartY + statSpacing * 3 + 8;
        const sellBoxHeight = 34;
        const sellBoxMargin = 20;

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

        const closeX = panelX + sideMargin;
        this._renderButton(ctx, closeX, buttonY, closeButtonWidth, buttonHeight,
            '✕', '#3a3a3a', '#555555', time, false, '#999999');
        this.towerInfoCloseButton = { x: closeX, y: buttonY, width: closeButtonWidth, height: buttonHeight };

        const selectX = closeX + closeButtonWidth + buttonSpacing;
        this._renderButton(ctx, selectX, buttonY, actionButtonWidth, buttonHeight,
            '🔗 SELECT', '#1a3a5c', '#2d5a8a', time, false, '#7ec8e3');
        this.towerInfoSelectButton = { x: selectX, y: buttonY, width: actionButtonWidth, height: buttonHeight };

        const sellBtnX = selectX + actionButtonWidth + buttonSpacing;
        this._renderButton(ctx, sellBtnX, buttonY, actionButtonWidth, buttonHeight,
            `💰 SELL`, '#1a4a2a', '#2d6b3d', time, true, '#6ee7a0');
        this.towerInfoSellButton = { x: sellBtnX, y: buttonY, width: actionButtonWidth, height: buttonHeight };
    }

    _renderStatRow(ctx, leftX, rightX, y, label, value, accentColor) {
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(label, leftX, y);

        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.fillText(value, rightX, y);

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

    _renderButton(ctx, x, y, width, height, text, bgColor, borderColor, time, animated = false, textColor = '#ffffff') {
        ctx.save();

        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, Utils.lightenColor(bgColor, 15));
        gradient.addColorStop(0.4, bgColor);
        gradient.addColorStop(1, Utils.darkenColor(bgColor, 15));
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, x + 1, y + 1, width - 2, height - 2, 9);
        ctx.stroke();

        if (animated) {
            const glowIntensity = 10 + Math.sin(time * 4) * 6;
            ctx.shadowColor = borderColor;
            ctx.shadowBlur = glowIntensity;
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;

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
}
