/**
 * UI Manager
 * Handles all UI rendering and interactions
 */

import { CONFIG, CANNON_TYPES } from './config.js';
import { Utils } from './utils.js';
import { InfoPagesManager } from './states/info-pages.js';
import { TopBarRenderer } from './ui-renderer/ui-topbar-renderer.js';
import { ShopRenderer } from './ui-renderer/ui-shop-renderer.js';
import { SidebarRenderer } from './ui-renderer/ui-sidebar-renderer.js';
import { TargetingRenderer } from './ui-renderer/ui-targeting-renderer.js';
import { TowerInfoPanel } from './ui-renderer/ui-tower-info-panel.js';
import { EndgameRenderer } from './ui-renderer/ui-endgame-renderer.js';
import { SettingsRenderer } from './ui-renderer/ui-settings-renderer.js';
import { TutorialRenderer } from './ui-renderer/ui-tutorial-renderer.js';

export class UIManager {
    constructor(graphics, canvas, audio = null) {
        this.graphics = graphics;
        this.canvas = canvas;
        this.audio = audio;

        this.showRangePreview = false;
        this.previewCol = 0;
        this.previewRow = 0;

        this.shop = new ShopRenderer(graphics, canvas);
        this.sidebar = new SidebarRenderer(graphics, canvas);
        this.settings = new SettingsRenderer(graphics, canvas, audio);
        this.tutorial = new TutorialRenderer(graphics, canvas);
        this.topBar = new TopBarRenderer(graphics, canvas, audio);
        this.infoPages = new InfoPagesManager(graphics, canvas);
        this.targeting = new TargetingRenderer(graphics, canvas);
        this.towerPanel = new TowerInfoPanel(graphics, canvas, audio);
        this.endgame = new EndgameRenderer(graphics, canvas);

        this.flashCoins = false;
    }

    /**
     * Setup the left sidebar with abilities and shop items
     */
    setupSidebar() {
        this.sidebar.setupSidebar();
    }

    setupAbilityButtons() {
        this.sidebar.setupAbilityButtons();
    }

    setupShopButtons() {
        this.shop.setupShopButtons();
    }

    render(gameState) {
        this.renderTopBar(gameState);
        this.renderShop(gameState);

        // Render left sidebar with abilities and shop items
        this.renderSidebar(gameState);

        // Render active boost bars on screen (always visible when boosts are active)
        this.renderActiveBoostBars(gameState);

        // Render bomb targeting overlay if in targeting mode
        if (this.targeting.bombTargetingMode) {
            this.targeting.renderBombTargeting(gameState);
        }

        // Range preview when hovering
        if (this.showRangePreview && this.isInDefenseZone(this.previewRow)) {
            const cannon = CANNON_TYPES[this.shop.selectedCannonType];
            this.graphics.drawRange(
                this.previewCol,
                this.previewRow,
                cannon.range,
                Utils.colorWithAlpha(cannon.color, 0.2)
            );
        }

        // Settings popup
        if (this.settings.showSettingsPopup) {
            this.settings.render();
        }

        // Tower info panel (for selling)
        if (this.towerPanel.showTowerInfoPanel && this.towerPanel.selectedTowerForInfo) {
            this.towerPanel.render();
        }

        // Info pages (Encyclopedia) - render on top of everything
        if (this.infoPages?.isOpen) {
            this.infoPages.render();
        }
    }

    /**
     * Update UI components
     */
    update(dt) {
        // Update info pages animations
        this.infoPages?.update(dt);
    }

    renderTopBar(gameState) {
        this.topBar.render(gameState, this.flashCoins);
    }

    renderShop(gameState) {
        this.shop.render(gameState);
    }
    renderActiveBoostBars(gameState) {
        this.sidebar.renderActiveBoostBars(gameState);
    }
    renderSidebar(gameState) {
        this.sidebar.renderSidebar(gameState);
    }
    renderAbilityButtonStyled(ctx, button, options) {
        this.sidebar.renderAbilityButtonStyled(ctx, button, options);
    }
    drawAbilitySprite(ctx, abilityId, x, y, size, options) {
        this.sidebar.drawAbilitySprite(ctx, abilityId, x, y, size, options);
    }
    drawLightningBolt(ctx, color, s, isReady, time) {
        this.sidebar.drawLightningBolt(ctx, color, s, isReady, time);
    }
    drawWaveLines(ctx, color, isReady, time, s) {
        this.sidebar.drawWaveLines(ctx, color, isReady, time, s);
    }
    drawBomb(ctx, s, isReady, time) {
        this.sidebar.drawBomb(ctx, s, isReady, time);
    }
    renderShopItemButtonStyled(ctx, button, gameState, time, cornerRadius, centerX, centerY) {
        this.sidebar.renderShopItemButtonStyled(ctx, button, gameState, time, cornerRadius, centerX, centerY);
    }
    renderButtonBorderWithGlow(ctx, isActive, canAfford, item, button, cornerRadius) {
        this.sidebar.renderButtonBorderWithGlow(ctx, isActive, canAfford, item, button, cornerRadius);
    }
    renderShopItemCostOrLabel(ctx, button, isActive, centerX, canAfford, item) {
        this.sidebar.renderShopItemCostOrLabel(ctx, button, isActive, centerX, canAfford, item);
    }
    innerHighlight(canAfford, isDisabled, ctx, button, cornerRadius) {
        this.sidebar.innerHighlight(canAfford, isDisabled, ctx, button, cornerRadius);
    }
    setBgGradient(ctx, button, isActive, time, item, canAfford) {
        return this.sidebar.setBgGradient(ctx, button, isActive, time, item, canAfford);
    }
    drawShopItemSprite(ctx, itemId, x, y, size, options) {
        this.sidebar.drawShopItemSprite(ctx, itemId, x, y, size, options);
    }
    drawTowerUpgradeStar(ctx, canAfford, s, time) {
        this.sidebar.drawTowerUpgradeStar(ctx, canAfford, s, time);
    }
    drawDamageBoostEffect(ctx, canAfford, s, isActive, time) {
        this.sidebar.drawDamageBoostEffect(ctx, canAfford, s, isActive, time);
    }
    drawFireRateBoost(ctx, canAfford, s, isActive, time) {
        this.sidebar.drawFireRateBoost(ctx, canAfford, s, isActive, time);
    }
    drawRangeBoost(ctx, canAfford, isActive, time, s) {
        this.sidebar.drawRangeBoost(ctx, canAfford, isActive, time, s);
    }
    drawEnergyLarge(ctx, canAfford, s) {
        this.sidebar.drawEnergyLarge(ctx, canAfford, s);
    }
    drawEnergySmall(ctx, canAfford, s) {
        this.sidebar.drawEnergySmall(ctx, canAfford, s);
    }
    renderAbilityButtons(gameState) {
        this.sidebar.renderAbilityButtons(gameState);
    }
    renderBombTargeting(gameState) {
        this.targeting.renderBombTargeting(gameState);
    }
    renderMobileTargetingHint(ctx, x, y, abilityType, time) {
        this.targeting.renderMobileTargetingHint(ctx, x, y, abilityType, time);
    }
    renderMobileTouchIndicator(ctx, x, y, abilityType, time) {
        this.targeting.renderMobileTouchIndicator(ctx, x, y, abilityType, time);
    }
    renderTargetingAreaPreview(ctx, x, y, abilityType, time) {
        this.targeting.renderTargetingAreaPreview(ctx, x, y, abilityType, time);
    }
    renderTargetingCursor(ctx, x, y, abilityType, time) {
        this.targeting.renderTargetingCursor(ctx, x, y, abilityType, time);
    }
    renderBombCursor(ctx, s, time, rotation) {
        this.targeting.renderBombCursor(ctx, s, time, rotation);
    }
    renderStunCursor(ctx, s, time, rotation) {
        this.targeting.renderStunCursor(ctx, s, time, rotation);
    }
    renderGenericCursor(ctx, s, time, rotation) {
        this.targeting.renderGenericCursor(ctx, s, time, rotation);
    }

    renderTowerInfoPanel() {
        this.towerPanel.render();
    }
    renderStatRow(ctx, lx, rx, y, label, value, color) {
        this.towerPanel._renderStatRow(ctx, lx, rx, y, label, value, color);
    }
    renderTowerInfoButton(ctx, options) {
        this.towerPanel._renderButton(ctx, options);
    }
    calculateSellValue(tower) {
        return this.towerPanel.calculateSellValue(tower);
    }

    showTowerInfo(tower, sellCallback, selectForMergeCallback = null) {
        this.towerPanel.show(tower, sellCallback, selectForMergeCallback);
    }
    hideTowerInfo() {
        this.towerPanel.hide();
    }
    isTowerInfoCloseClicked(x, y) {
        return this.towerPanel._isCloseClicked(x, y);
    }
    isTowerInfoSellClicked(x, y) {
        return this.towerPanel._isSellClicked(x, y);
    }
    isTowerInfoSelectClicked(x, y) {
        return this.towerPanel._isSelectClicked(x, y);
    }
    handleTowerInfoClick(x, y) {
        return this.towerPanel.handleClick(x, y);
    }

    /**
     * Check if sidebar button was clicked (ability or shop item)
     */
    getClickedSidebarButton(screenPos) {
        return this.sidebar.getClickedSidebarButton(screenPos);
    }

    /**
     * Check if ability button was clicked (legacy - uses sidebar)
     */
    getClickedAbilityButton(screenPos) {
        return this.sidebar.getClickedAbilityButton(screenPos);
    }

    isBombCancelButtonClicked(screenX, screenY) {
        return this.targeting.isCancelButtonClicked(screenX, screenY);
    }

    get bombTargetingMode() {
        return this.targeting.bombTargetingMode;
    }

    enterBombTargetingMode(callback, abilityType = 'BOMB') {
        this.targeting.enter(callback, abilityType);
    }

    updateTargetingCursor(x, y, isTouch = false, touchEnded = false) {
        this.targeting.updateCursor(x, y, isTouch, touchEnded);
    }

    exitBombTargetingMode() {
        this.targeting.exit();
    }

    renderShopButton(button, gameState) {
        this.shop._renderButton(button, gameState);
    }

    handleTap(gridPos, screenPos) {
        const handlers = [
            () => this._handleTowerInfoTap(screenPos),
            () => this._handleInfoPagesTap(screenPos),
            () => this._handleBombTargetingTap(gridPos, screenPos),
            () => this._handleSettingsPopupTap(screenPos),
            () => this._handleInfoButtonTap(screenPos),
            () => this._handleSidebarTap(screenPos),
            () => this._handleSettingsGearTap(screenPos),
            () => this._handleShopButtonTap(screenPos),
        ];

        for (const handler of handlers) {
            const result = handler();
            if (result !== undefined) return result;
        }

        return this._handleGridTap(gridPos);
    }

    _handleTowerInfoTap(screenPos) {
        if (!this.towerPanel.showTowerInfoPanel)
            return undefined;
        const action = this.towerPanel.handleClick(screenPos.x, screenPos.y);
        if (action === 'close') {
            this.towerPanel.hide();
            if (this.audio) this.audio.uiClick();
            return { type: 'towerInfo', action: 'close' };
        }
        if (action === 'select') {
            const tower = this.towerPanel.selectedTowerForInfo;
            if (this.towerPanel.selectForMergeCallback) this.towerPanel.selectForMergeCallback(tower);
            this.towerPanel.hide();
            if (this.audio) this.audio.uiClick();
            return { type: 'towerInfo', action: 'select', tower };
        }
        if (action === 'sell') {
            const tower = this.towerPanel.selectedTowerForInfo;
            const sellValue = this.towerPanel.calculateSellValue(tower);
            if (this.towerPanel.sellCallback) this.towerPanel.sellCallback(tower, sellValue);
            this.towerPanel.hide();
            return { type: 'towerInfo', action: 'sell', tower, sellValue };
        }
        this.towerPanel.hide();
        if (this.audio) this.audio.uiClick();
        return { type: 'towerInfo', action: 'close' };
    }

    _handleInfoPagesTap(screenPos) {
        if (!this.infoPages?.isOpen)
            return undefined;
        const result = this.infoPages.handleTap(screenPos);
        return result ? { type: 'info', action: result } : null;
    }

    _handleBombTargetingTap(gridPos, screenPos) {
        if (!this.targeting.bombTargetingMode)
            return undefined;
        if (this.isBombCancelButtonClicked(screenPos.x, screenPos.y)) {
            this.exitBombTargetingMode();
            return { type: 'ability', action: 'cancel_targeting' };
        }
        const clampedGridPos = {
            col: Math.max(0, Math.min(CONFIG.COLS - 1, gridPos.col)),
            row: Math.max(0, Math.min(CONFIG.ROWS - 1, gridPos.row))
        };
        const isNearGrid = gridPos.col >= -1 && gridPos.col <= CONFIG.COLS &&
            gridPos.row >= -1 && gridPos.row <= CONFIG.ROWS;
        if (isNearGrid) {
            const callback = this.targeting.targetingCallback;
            this.exitBombTargetingMode();
            if (callback) callback(clampedGridPos);
            return { type: 'ability', action: 'bomb_placed', gridPos: clampedGridPos };
        }
        return null;
    }

    _handleSettingsPopupTap(screenPos) {
        if (!this.settings.showSettingsPopup)
            return undefined;
        const popupAction = this.settings.handleClick(screenPos.x, screenPos.y);
        if (popupAction) {
            if (popupAction === 'close') this.closeSettingsPopup();
            return { type: 'settings', action: popupAction };
        }
        this.closeSettingsPopup();
        return { type: 'settings', action: 'close' };
    }

    _handleInfoButtonTap(screenPos) {
        if (!this.topBar.checkInfoButtonClick(screenPos.x, screenPos.y))
            return undefined;
        this.infoPages.open();
        return { type: 'info', action: 'open' };
    }

    _handleSidebarTap(screenPos) {
        const clicked = this.getClickedSidebarButton(screenPos);
        if (!clicked) return undefined;
        if (clicked.type === 'ability') return { type: 'ability', action: 'activate', abilityId: clicked.id };
        if (clicked.type === 'shop') return { type: 'shop', action: 'purchase', item: clicked.data };
        return undefined;
    }

    _handleSettingsGearTap(screenPos) {
        if (!this.topBar.checkSettingsClick(screenPos.x, screenPos.y)) return undefined;
        this.toggleSettingsPopup();
        return { type: 'settings', action: 'open' };
    }

    _handleShopButtonTap(screenPos) {
        const btn = this.getClickedShopButton(screenPos);
        if (!btn) return undefined;
        if (this.tutorialAllowedTowers && this.tutorialAllowedTowers.length > 0) {
            if (!this.tutorialAllowedTowers.includes(btn.id)) return null;
        }
        this.shop.setSelectedCannonType(btn.id);
        return { type: 'shop', action: 'select', cannonType: btn.id };
    }

    _handleGridTap(gridPos) {
        if (this.isValidGridPos(gridPos) && this.isInDefenseZone(gridPos.row)) {
            return { type: 'grid', action: 'tap', gridPos };
        }
        return null;
    }

    getClickedShopButton(screenPos) {
        return this.shop.getClickedShopButton(screenPos);
    }

    setRangePreview(show, col = 0, row = 0) {
        this.showRangePreview = show;
        this.previewCol = col;
        this.previewRow = row;
    }

    setTutorialAllowedTowers(allowedTypes) {
        this.tutorialAllowedTowers = allowedTypes;
        this.shop.setTutorialAllowedTowers(allowedTypes);
    }

    isValidGridPos(gridPos) {
        return gridPos.col >= 0 && gridPos.col < CONFIG.COLS &&
            gridPos.row >= 0 && gridPos.row < CONFIG.ROWS;
    }

    isInDefenseZone(row) {
        return row >= (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS);
    }

    getSelectedCannonType() {
        return this.shop.selectedCannonType;
    }

    get shopButtons() {
        return this.shop.shopButtons;
    }
    get infoButton() {
        return this.topBar.infoButton;
    }
    set selectedCannonType(type) {
        this.shop.setSelectedCannonType(type);
    }

    // Game over / Victory
    showGameOver(gameState, platformBalance = 0, continueCost = 100) {
        this.endgame.showGameOver(gameState, platformBalance, continueCost);
    }
    showVictory(gameState, coinReward = 0, rewardAwarded = false) {
        this.endgame.showVictory(gameState, coinReward, rewardAwarded);
    }
    isContinueButtonClicked(x, y) {
        return this.endgame.isContinueButtonClicked(x, y);
    }
    isRetryButtonClicked(x, y) {
        return this.endgame.isRetryButtonClicked(x, y);
    }
    isExitFullscreenButtonClicked(x, y) {
        return this.endgame.isExitFullscreenButtonClicked(x, y);
    }
    isVictoryPlayAgainClicked(x, y) {
        return this.endgame.isVictoryPlayAgainClicked(x, y);
    }
    clearRetryButton() {
        this.endgame.clearButtons();
    }


    // Settings popup
    renderSettingsPopup() {
        this.settings.render();
    }
    renderSettingsToggle(x, y, w, text, action, checked) {
        this.settings._renderToggle(x, y, w, text, action, checked);
    }
    renderSettingsButton(x, y, w, h, text, action, disabled) {
        this.settings._renderButton(x, y, w, h, text, action, disabled);
    }
    checkSettingsPopupClick(x, y) {
        return this.settings.handleClick(x, y);
    }
    toggleSettingsPopup() {
        this.settings.toggle();
    }
    closeSettingsPopup() {
        this.settings.close();
    }

    // Tutorial
    renderTutorial(game) {
        this.tutorial.render(game, this.shop.shopButtons);
    }
    isTutorialSkipButtonClicked(x, y) {
        return this.tutorial.isTutorialSkipButtonClicked(x, y);
    }

    handleDragMove(screenPos) {
        if (this.infoPages?.isOpen) {
            return this.infoPages.handleDragMove(screenPos);
        }
        return false;
    }

    handleDragEnd() {
        if (this.infoPages?.isOpen) {
            this.infoPages.handleDragEnd();
        }
    }

    isInfoPagesOpen() {
        return this.infoPages?.isOpen;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}