/**
 * game.js — Entrypoint for Merge Tower Defense.
 *
 * This class is the composition root. It wires up all focused managers
 * (WaveManager, TowerManager, DamageHandler, BoostManager, AbilityManager,
 * FullscreenManager, PlatformBridge, EnergyManager) and exposes
 * the same public API as game_old.js for full backward compatibility.
 *
 * Backward compatibility: game_old.js remains untouched and still works.
 * This file is what gets bundled + obfuscated by offusca_game.bat.
 */
import { CONFIG, CANNON_TYPES, MERGE_LEVELS, ZOMBIE_TYPES, SHOP_ITEMS, SPECIAL_ABILITIES } from './config.js';
import { Utils } from './utils.js';
import { ParticleSystem } from './particles.js';
import { EntityManager } from './entities.js';
import { AudioEngine } from './audio.js';
import { CombatSystem } from './combat.js';

import { WaveManager }        from './game-wave-manager.js';
import { DamageHandler }      from './game-damage-handler.js';
import { TowerManager }       from './game-tower-manager.js';
import { BoostManager }       from './game-boost-manager.js';
import { AbilityManager }     from './game-abilities-manager.js';
import { FullscreenManager }  from './game-fullscreen-manager.js';
import { PlatformBridge }     from './game-platform-bridge.js';
import { EnergyManager }      from './game-energy-manager.js';

export class Game {
    constructor(graphics, input, ui) {
        this.graphics = graphics;
        this.input    = input;
        this.ui       = ui;

        // Tutorial system (set by main.js after construction)
        this.tutorial = null;

        this.entities = new EntityManager();
        this.particles = new ParticleSystem();
        this.audio    = new AudioEngine();
        this.state    = this.createInitialState();

        // Combat system (OOP pattern — depends on game reference)
        this.combatSystem = new CombatSystem(this);

        // Focused managers
        this.waveManager      = new WaveManager(this);
        this.damageHandler    = new DamageHandler(this);
        this.towerManager     = new TowerManager(this);
        this.boostManager     = new BoostManager(this);
        this.abilityManager   = new AbilityManager(this);
        this.fullscreenManager = new FullscreenManager(this);
        this.platformBridge   = new PlatformBridge(this);
        this.energyManager    = new EnergyManager(this);

        this.isFullscreenTransition = false;
        this.performanceMonitor     = Utils.createPerformanceMonitor();

        this.setupInputHandlers();
        // Music started after tutorial prompt (in main.js)
    }

    // =========================================================================
    // STATE
    // =========================================================================
    createInitialState() {
        return {
            coins:  CONFIG.INITIAL_COINS,
            energy: CONFIG.INITIAL_ENERGY,

            wave: 1, waveInProgress: false,
            waveZombiesTotal: CONFIG.BASE_WAVE_ZOMBIES,
            waveZombiesSpawned: 0, lastSpawnTime: 0, waveClearBonus: 0,

            selectedWaveMode: null, targetWaves: 0, coinReward: 0,
            isVictory: false, waveModeSelected: false,

            score: 0, kills: 0, highestLevel: 1, combos: 0,
            towerMerges: 0, towersPlaced: 0, coinsEarned: 0,

            isPaused: false, isGameOver: false, playTime: 0, tutorialMode: false,

            selectedCannons: [],
            cannonLimit: CONFIG.COLS * CONFIG.DEFENSE_ZONE_ROWS,
            showMergeHint: false, mergeHintPos: null,

            displayEnergy: CONFIG.INITIAL_ENERGY,
            energyAnimSpeed: 50,

            activeBoosts: [], shopOpen: false,
            screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },

            draggingTower: null, dragCurrentPos: null, dragTargetGrid: null,

            specialAbilities: {
                BOMB:     { level: 1, lastUsed: 0, uses: 0, kills: 0 },
                PUSHBACK: { level: 1, lastUsed: 0, uses: 0, enemiesPushed: 0 },
                STUN:     { level: 1, lastUsed: 0, uses: 0, enemiesStunned: 0 },
            },
        };
    }

    getState() { return this.state; }

    // =========================================================================
    // INPUT SETUP
    // =========================================================================
    setupInputHandlers() {
        this.input.onTap((gridPos, screenPos) => this._onTap(gridPos, screenPos));

        this.input.onDrag((gridPos, screenPos) => {
            if (this.ui.handleDragMove(screenPos)) return;
            if (this.state.isPaused || this.state.isGameOver) return;

            const startGrid = this.input.getDragStartGridPos();
            if (!startGrid) return;

            if (!this.state.draggingTower) {
                const cannon = this.entities.getCannon(startGrid.col, startGrid.row);
                if (cannon) this.state.draggingTower = cannon;
            }
            if (this.state.draggingTower) {
                this.state.dragCurrentPos = { x: screenPos.x, y: screenPos.y };
                this.state.dragTargetGrid = gridPos;
            }
        });

        this.input.onDragEnd((startPos, endPos) => {
            this.ui.handleDragEnd();
            this.state.draggingTower  = null;
            this.state.dragCurrentPos = null;
            this.state.dragTargetGrid = null;
            if (this.state.isPaused || this.state.isGameOver) return;
            this.towerManager.handleDragMerge(startPos, endPos);
        });

        this.input.onMove(screenPos => {
            if (this.ui.bombTargetingMode) {
                this.ui.updateTargetingCursor(
                    screenPos.x, screenPos.y,
                    screenPos.isTouch   || false,
                    screenPos.touchEnded || false
                );
            }
        });
    }

    _onTap(gridPos, screenPos) {
        if (window.handleWaveModeSelectorTap?.(screenPos)) return;
        if (window.handleTutorialPromptTap?.(screenPos))   return;

        if (this.tutorial?.isActive && this.tutorial.handleTap(screenPos)) return;

        if (this.state.isVictory) {
            if (this.ui.isVictoryPlayAgainClicked(screenPos.x, screenPos.y)) this.restartWithModeSelection();
            return;
        }

        if (this.state.isGameOver) {
            if (this.ui.isContinueButtonClicked(screenPos.x, screenPos.y))      { this.continueGame(); return; }
            if (this.ui.isRetryButtonClicked(screenPos.x, screenPos.y))         { this.restartWithModeSelection(); return; }
            if (this.ui.isExitFullscreenButtonClicked(screenPos.x, screenPos.y)) this.exitFullscreen();
            return;
        }

        const uiAction = this.ui.handleTap(gridPos, screenPos, this.state);
        if (uiAction) {
            this._handleUiAction(uiAction, gridPos);
        }
    }

    _handleUiAction(uiAction, gridPos) {
        if (uiAction.type === 'towerInfo') return;

        if (uiAction.type === 'settings') {
            this._handleSettingsAction(uiAction);
            return;
        }

        if (uiAction.type === 'info') {
            if (uiAction.action === 'open') {
                this.pause();
                this.tutorial?.isActive && this.tutorial.onGameAction('mtdpedia_opened', {});
            } else if (uiAction.action === 'close') {
                this.resume();
            }
            return;
        }

        if (this.state.isPaused) return;

        if (uiAction.type === 'ability') {
            if (uiAction.action === 'activate')         this.activateSpecialAbility(uiAction.abilityId);
            if (uiAction.action === 'cancel_targeting') this.input.setDragEnabled(true);
        } else if (uiAction.type === 'shop') {
            if (uiAction.action === 'purchase' && uiAction.item) {
                this.purchaseShopItem(uiAction.item.id);
            } else if (uiAction.action === 'select') {
                this.particles.emit(gridPos.col, gridPos.row, {
                    text: '✓', color: CONFIG.COLORS.TEXT_PRIMARY, vy: -1, life: 0.5,
                });
            }
        } else if (uiAction.type === 'grid') {
            this.towerManager.handleGridTap(gridPos);
        }
    }

    _handleSettingsAction(uiAction) {
        switch (uiAction.action) {
            case 'open':       this.pause();  break;
            case 'close':      this.resume(); break;
            case 'fullscreen': this.toggleFullscreen(); break;
            case 'music':      this.audio.toggle(); break;
            case 'quit':
                this.ui.closeSettingsPopup();
                this.restartWithModeSelection();
                break;
            // 'checkbox' handled entirely in UI
        }
    }

    // =========================================================================
    // GAME LOOP
    // =========================================================================
    update(dt) {
        if (this.ui?.update) this.ui.update(dt);
        if (this.state.isPaused || this.state.isGameOver) return;

        const now = performance.now();

        // Energy display animation
        if (this.state.displayEnergy !== this.state.energy) {
            const diff = this.state.energy - this.state.displayEnergy;
            const step = this.state.energyAnimSpeed * dt;
            if (Math.abs(diff) <= step) {
                this.state.displayEnergy = this.state.energy;
            } else {
                this.state.displayEnergy += diff > 0 ? step : -step;
            }
        }

        this.updateScreenShake(dt);
        this.waveManager.update(dt, now);
        this.updateCombat(dt, now);
        this.energyManager.update(dt);
        this.boostManager.updateBoosts();
        this.boostManager.updateTowerBoosts();

        this.entities.update(dt, now);
        this.particles.update(dt);
        this.graphics.updateAnimation(dt);

        this.state.playTime += dt;
        this.performanceMonitor.update();
    }

    render() {
        const ctx   = this.graphics.ctx;
        const shake = this.state.screenShake;

        if (shake.duration > 0) { ctx.save(); ctx.translate(shake.x, shake.y); }

        this.graphics.clear();
        this.graphics.drawGrid();

        const isGaining = this.state.displayEnergy < this.state.energy;
        const isLosing  = this.state.displayEnergy > this.state.energy;
        this.graphics.drawBrickWall(this.state.displayEnergy, isGaining, isLosing, this.state.energy);

        this.entities.render(this.graphics, performance.now(), this.state.draggingTower);
        this.particles.render(this.graphics);
        this._renderDragGhost();
        this.boostManager.renderBoostEffects();

        if (shake.duration > 0) ctx.restore();

        this.ui.render(this.state);

        if (this.state.isGameOver) {
            this.ui.showGameOver(this.state, window.platformBalance || 0, CONFIG.CONTINUE_COST || 100);
        }
        if (window.location.search.includes('debug')) this._renderDebugInfo();
    }

    // =========================================================================
    // DRAG GHOST RENDER
    // =========================================================================
    _renderDragGhost() {
        const { draggingTower, dragCurrentPos, dragTargetGrid } = this.state;
        if (!draggingTower || !dragCurrentPos || !dragTargetGrid) return;

        const ctx      = this.graphics.ctx;
        const cellSize = this.graphics.getCellSize();
        const isValid  = this.ui.isValidGridPos(dragTargetGrid) && this.ui.isInDefenseZone(dragTargetGrid.row);
        const occupied = this.entities.getCannon(dragTargetGrid.col, dragTargetGrid.row);
        const canPlace = isValid && (occupied === null || occupied === draggingTower);

        if (isValid) {
            const tp = this.graphics.gridToScreen(dragTargetGrid.col, dragTargetGrid.row);
            ctx.save();
            ctx.fillStyle   = canPlace ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 80, 80, 0.3)';
            ctx.strokeStyle = canPlace ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 80, 80, 0.8)';
            ctx.lineWidth   = 2;
            ctx.fillRect(tp.x - cellSize / 2, tp.y - cellSize / 2, cellSize, cellSize);
            ctx.strokeRect(tp.x - cellSize / 2, tp.y - cellSize / 2, cellSize, cellSize);
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.6;
        if (draggingTower.multiSprite) {
            try { draggingTower.multiSprite.render(ctx, dragCurrentPos.x, dragCurrentPos.y, cellSize); }
            catch { this._drawSimpleTowerGhost(ctx, dragCurrentPos.x, dragCurrentPos.y, cellSize, draggingTower.color); }
        } else if (draggingTower.sprite) {
            this.graphics.drawSpriteAt(draggingTower.sprite, dragCurrentPos.x, dragCurrentPos.y, { scale: 1.0, color: draggingTower.color });
        } else {
            this._drawSimpleTowerGhost(ctx, dragCurrentPos.x, dragCurrentPos.y, cellSize, draggingTower.color);
        }

        if (draggingTower.level > 1) {
            ctx.font          = `bold ${cellSize * 0.25}px Arial`;
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'middle';
            ctx.fillStyle     = '#ffffff';
            ctx.strokeStyle   = '#000000';
            ctx.lineWidth     = 2;
            const lx = dragCurrentPos.x;
            const ly = dragCurrentPos.y + cellSize * 0.35;
            ctx.strokeText(`Lv${draggingTower.level}`, lx, ly);
            ctx.fillText(`Lv${draggingTower.level}`, lx, ly);
        }
        ctx.restore();

        if (canPlace) {
            this.graphics.drawRange(dragTargetGrid.col, dragTargetGrid.row, draggingTower.range, 'rgba(0, 255, 136, 0.1)');
        }
    }

    _drawSimpleTowerGhost(ctx, x, y, cellSize, color) {
        ctx.fillStyle   = color || '#00ff88';
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.stroke();
    }

    _renderDebugInfo() {
        const counts = this.entities.getCounts();
        const fps    = this.performanceMonitor.getFPS();
        const lines  = [
            `FPS: ${fps}`, `Cannons: ${counts.cannons}`,
            `Zombies: ${counts.zombies}`, `Projectiles: ${counts.projectiles}`,
            `Particles: ${this.particles.getCount()}`,
        ];
        lines.forEach((line, i) => {
            this.graphics.drawText(line, 10, 10 + i * 15, { size: 12, color: '#ffff00', shadow: true });
        });
    }

    // =========================================================================
    // SCREEN SHAKE
    // =========================================================================
    addScreenShake(intensity, duration) {
        this.state.screenShake.intensity = intensity;
        this.state.screenShake.duration  = duration;
    }

    updateScreenShake(dt) {
        const shake = this.state.screenShake;
        if (shake.duration > 0) {
            shake.duration -= dt;
            const intensity = shake.duration > 0 ? shake.intensity : 0;
            shake.x = (Math.random() - 0.5) * intensity * 2;
            shake.y = (Math.random() - 0.5) * intensity * 2;
        } else {
            shake.x = shake.y = 0;
        }
    }

    // =========================================================================
    // GAME FLOW
    // =========================================================================
    pause() {
        if (this.isFullscreenTransition) return;
        this.state.isPaused = true;
        this.audio.pause();
    }

    resume() {
        this.state.isPaused = false;
        this.audio.resume();
    }

    gameOver() {
        if (this.state.isGameOver) return;
        this._recalculateHighestLevel();
        this.state.isGameOver = true;
        this.audio.stop();
        this.audio.gameOverSound();
    }

    continueGame() {
        if (window.handleContinueGame) window.handleContinueGame();
    }

    resumeAfterContinue() {
        this.state.isGameOver   = false;
        this.state.energy       = CONFIG.INITIAL_ENERGY;
        this.state.displayEnergy = CONFIG.INITIAL_ENERGY;

        [...this.entities.zombies].forEach(z => this.entities.removeZombie(z));
        this.waveManager.startWave();
        this.ui.clearRetryButton();
        this.audio.play();
    }

    victory() {
        if (this.state.isVictory) return;
        this._recalculateHighestLevel();
        this.state.isVictory = true;
        this.audio.stop();
        this.audio.waveComplete();
        this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 2, {
            text: '🏆 VICTORY! 🏆', color: '#ffdd00',
            vy: -0.3, life: 4.0, scale: 2.5, glow: true,
        });
        if (window.handleVictory) window.handleVictory(this.state.coinReward);
    }

    restart() {
        this._resetGameState();
        this.audio.play();
    }

    restartWithModeSelection() {
        this._resetGameState();
        if (window.showWaveModeSelection) window.showWaveModeSelection();
    }

    /**
     * Deduplicated reset — previously copy-pasted in restart() and restartWithModeSelection().
     */
    _resetGameState() {
        this.state = this.createInitialState();
        this.entities.clear();
        this.particles.clear();
        this.towerManager.deselectAll();
        this.ui.clearRetryButton();
        if (window.resetGameSession) window.resetGameSession();
    }

    /**
     * Deduplicated highest-level scan — was copy-pasted in gameOver() and victory().
     */
    _recalculateHighestLevel() {
        for (const cannon of this.entities.cannons) {
            if (cannon.level > this.state.highestLevel) {
                this.state.highestLevel = cannon.level;
            }
        }
    }

    // =========================================================================
    // DELEGATION — public API preserved for CombatSystem and main.js compatibility
    // =========================================================================

    // Wave
    updateWaveSystem(dt, currentTime) { this.waveManager.update(dt, currentTime); }
    startWave()                       { this.waveManager.startWave(); }
    spawnZombie()                     { this.waveManager.spawnZombie(); }
    selectZombieType()                { return this.waveManager.selectZombieType(); }
    completeWave()                    { this.waveManager.completeWave(); }
    setWaveMode(modeKey)              { return this.waveManager.setWaveMode(modeKey); }

    // Damage (CombatSystem calls these on game instance)
    damageZombie(zombie, proj, t)         { this.damageHandler.damageZombie(zombie, proj, t); }
    applySplashDamage(center, proj, t)    { this.damageHandler.applySplashDamage(center, proj, t); }
    applyChainDamage(source, proj, t)     { this.damageHandler.applyChainDamage(source, proj, t); }
    killZombie(zombie)                    { this.damageHandler.killZombie(zombie); }

    // Tower
    handleGridTap(gridPos)                { this.towerManager.handleGridTap(gridPos); }
    showTowerInfoPanel(cannon)            { this.towerManager.showTowerInfoPanel(cannon); }
    selectTowerForMerge(tower)            { this.towerManager.selectTowerForMerge(tower); }
    sellTower(tower, sellValue)           { this.towerManager.sellTower(tower, sellValue); }
    placeCannon(col, row)                 { this.towerManager.placeCannon(col, row); }
    toggleCannonSelection(cannon)         { this.towerManager.toggleCannonSelection(cannon); }
    checkMerge()                          { this.towerManager.checkMerge(); }
    performMerge(cannons)                 { this.towerManager.performMerge(cannons); }
    handleDragMerge(start, end)           { this.towerManager.handleDragMerge(start, end); }
    findMatchingCannons(cannon)           { return this.towerManager.findMatchingCannons(cannon); }
    deselectAll()                         { this.towerManager.deselectAll(); }
    upgradeTower(cannon)                  { this.towerManager.upgradeTower(cannon); }

    // Combat (passes through to existing CombatSystem)
    updateCombat(dt, currentTime) { this.combatSystem.update(dt, currentTime); }

    // Boosts
    purchaseShopItem(itemId)          { return this.boostManager.purchaseShopItem(itemId); }
    applyInstantBoost(item)           { this.boostManager.applyInstantBoost(item); }
    applyTemporaryBoost(item)         { this.boostManager.applyTemporaryBoost(item); }
    applySpecialBoost(item)           { this.boostManager.applySpecialBoost(item); }
    updateBoosts(dt)                  { this.boostManager.updateBoosts(); }
    updateTowerBoosts()               { this.boostManager.updateTowerBoosts(); }
    renderBoostEffects()              { this.boostManager.renderBoostEffects(); }
    getBoostMultiplier(type)          { return this.boostManager.getBoostMultiplier(type); }
    getRemainingBoostTime(type)       { return this.boostManager.getRemainingBoostTime(type); }
    getBoostProgress(type)            { return this.boostManager.getBoostProgress(type); }

    // Abilities
    activateSpecialAbility(id)             { this.abilityManager.activateSpecialAbility(id); }
    activateBombAbility(config, state)     { this.abilityManager.activateBombAbility(config, state); }
    executeBomb(gridPos, config, state)    { this.abilityManager.executeBomb(gridPos, config, state); }
    activatePushbackAbility(config, state) { this.abilityManager.activatePushbackAbility(config, state); }
    activateStunAbility(config, state)     { this.abilityManager.activateStunAbility(config, state); }
    executeStun(gridPos, config, state)    { this.abilityManager.executeStun(gridPos, config, state); }
    getAbilityCooldownProgress(id)         { return this.abilityManager.getAbilityCooldownProgress(id); }
    isAbilityReady(id)                     { return this.abilityManager.isAbilityReady(id); }

    // Fullscreen
    toggleFullscreen()      { this.fullscreenManager.toggleFullscreen(); }
    toggleIOSFullscreen()   { this.fullscreenManager.toggleIOSFullscreen(); }
    requestFullscreen()     { this.fullscreenManager.requestFullscreen(); }
    exitFullscreen()        { this.fullscreenManager.exitFullscreen(); }
    injectIOSFullscreenStyles() { this.fullscreenManager.injectIOSFullscreenStyles(); }
    createIOSExitButton()   { this.fullscreenManager.createIOSExitButton(); }

    // Platform bridge
    setupWindowListeners()               { /* managed by PlatformBridge constructor */ }
    showXPBanner(xp, extra)              { this.platformBridge.showXPBanner(xp, extra); }
    showLevelUpNotification(data)        { this.platformBridge.showLevelUpNotification(data); }
}

// CommonJS compat shim (used by some build tools)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game };
}
