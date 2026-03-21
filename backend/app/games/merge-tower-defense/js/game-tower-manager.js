/**
 * TowerManager — SRP: tower placement, selection, merge, sell, upgrade, drag-move.
 *
 * Dependencies on BoostManager are resolved through game.boostManager,
 * keeping TowerManager decoupled from boost internals.
 */
import { CONFIG, CANNON_TYPES, MERGE_LEVELS } from './config.js';
import { Utils } from './utils.js';

export class TowerManager {
    constructor(game) {
        this.game = game;
    }

    // ── convenience accessors ──────────────────────────────────────────────
    get state()     { return this.game.state; }
    get particles() { return this.game.particles; }
    get audio()     { return this.game.audio; }
    get entities()  { return this.game.entities; }

    // ── grid tap entry point ───────────────────────────────────────────────
    handleGridTap(gridPos) {
        const cannon = this.entities.getCannon(gridPos.col, gridPos.row);
        if (!cannon) {
            this.placeCannon(gridPos.col, gridPos.row);
            return;
        }
        if (this.state.selectingTowerForUpgrade) {
            this.upgradeTower(cannon);
            return;
        }
        if (cannon.selected) {
            this.showTowerInfoPanel(cannon);
            return;
        }
        this.toggleCannonSelection(cannon);
    }

    // ── info panel ─────────────────────────────────────────────────────────
    showTowerInfoPanel(cannon) {
        this.deselectAll();
        this.game.ui.showTowerInfo(
            cannon,
            (tower, sellValue) => this.sellTower(tower, sellValue),
            (tower)            => this.selectTowerForMerge(tower)
        );
    }

    selectTowerForMerge(tower) {
        this.toggleCannonSelection(tower);
        this.particles.emit(tower.col, tower.row, { text: '🔗', vy: -2, life: 0.6, scale: 0.8 });
    }

    // ── sell ───────────────────────────────────────────────────────────────
    sellTower(tower, sellValue) {
        const { col, row } = tower;
        this.state.coins += sellValue;
        this.entities.removeCannon(tower);

        // Coin burst
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            this.particles.emit(col, row, {
                text: '💰', vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
                gravity: 0.15, life: 1.0, scale: 0.6 + Math.random() * 0.4,
            });
        }
        // Sparkle burst
        for (let i = 0; i < 6; i++) {
            const delay = i * 50;
            setTimeout(() => {
                this.particles.emit(col, row, {
                    text: '✨', vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2,
                    gravity: 0.05, life: 0.6, scale: 0.5,
                });
            }, delay);
        }
        this.particles.emit(col, row, {
            text: `+${sellValue}`, color: '#ffdd00', fontSize: 24,
            vx: 0, vy: -2, gravity: 0, life: 1.2, scale: 1.0,
        });

        this.audio.towerSell();
        this.audio.coinCollect();
        this.game.ui.flashCoins = true;
        setTimeout(() => { this.game.ui.flashCoins = false; }, 300);
    }

    // ── placement ─────────────────────────────────────────────────────────
    placeCannon(col, row) {
        const ui        = this.game.ui;
        const cannonType = ui.getSelectedCannonType();
        const cannonDef  = CANNON_TYPES[cannonType];

        if (!this.state.cannonPriceMultiplier)             this.state.cannonPriceMultiplier = {};
        if (!this.state.cannonPriceMultiplier[cannonType]) this.state.cannonPriceMultiplier[cannonType] = 1;

        if (ui.tutorialAllowedTowers?.length > 0 && !ui.tutorialAllowedTowers.includes(cannonType)) {
            ui.selectedCannonType = ui.tutorialAllowedTowers[0];
            this.particles.createWarningEffect(col, row, '🔒 BASIC!');
            this.audio.uiError();
            return;
        }
        if (!ui.isInDefenseZone(row)) {
            this.particles.createWarningEffect(col, row, '❌');
            this.audio.uiError();
            return;
        }
        if (this.entities.getCannon(col, row)) {
            this.audio.uiError();
            return;
        }

        const baseCost   = typeof calculateTowerCost === 'function'
            ? calculateTowerCost(cannonType, 1)
            : cannonDef.cost;
        const actualCost = Math.floor(baseCost * this.state.cannonPriceMultiplier[cannonType]);

        if (this.state.coins < actualCost) {
            this.particles.createWarningEffect(col, row, '💰');
            this.audio.uiError();
            return;
        }
        if (this.entities.cannons.length >= this.state.cannonLimit) {
            this.particles.createWarningEffect(col, row, 'FULL!');
            this.audio.uiError();
            return;
        }

        this.state.coins -= actualCost;
        this.entities.addCannon(col, row, cannonType);
        this.particles.createPlacementEffect(col, row);
        this.audio.towerPlace();

        this.state.cannonPriceMultiplier[cannonType] =
            parseFloat((this.state.cannonPriceMultiplier[cannonType] * 1.25).toFixed(3));

        this.state.towersPlaced++;
        this.game.tutorial?.isActive &&
            this.game.tutorial.onGameAction('tower_placed', { col, row, type: cannonType });
    }

    // ── selection / merge ──────────────────────────────────────────────────
    toggleCannonSelection(cannon) {
        const index = this.state.selectedCannons.indexOf(cannon);
        if (index >= 0) {
            cannon.selected = false;
            this.state.selectedCannons.splice(index, 1);
        } else {
            cannon.selected = true;
            this.state.selectedCannons.push(cannon);
            if (this.state.selectedCannons.length === 3) this.checkMerge();
        }
        this.audio.uiClick();
    }

    checkMerge() {
        const selected = this.state.selectedCannons;
        if (selected.length !== 3) return;

        const first   = selected[0];
        const allSame = selected.every(c => c.type === first.type && c.level === first.level);

        if (allSame && first.level < MERGE_LEVELS.length) {
            this.performMerge(selected);
        } else {
            this.deselectAll();
            this.particles.createWarningEffect(first.col, first.row, '❌ NO MATCH');
            this.audio.uiError();
        }
    }

    performMerge(cannons) {
        const target   = cannons[cannons.length - 1];
        const { col, row, type } = target;
        const newLevel = target.level + 1;

        cannons.forEach(c => this.entities.removeCannon(c));
        const newCannon   = this.entities.addCannon(col, row, type);
        newCannon.level   = newLevel;

        // Deduplicated via BoostManager
        this.game.boostManager.applyBoostsToTower(newCannon);

        if (newLevel > this.state.highestLevel) this.state.highestLevel = newLevel;

        this.particles.createMergeEffect(col, row);
        this.audio.towerMerge();

        const mergeBonus = Math.floor(100 * Math.pow(2, newLevel - 1));
        this.state.score += mergeBonus;
        this.particles.emit(col, row, {
            text: `+${Utils.formatNumber(mergeBonus)}`, color: CONFIG.COLORS.TEXT_WARNING,
            vy: -2, life: 1.5, scale: 1.5, glow: true,
        });

        this.state.towerMerges++;
        if (this.game.tutorial?.isActive) {
            this.game.tutorial.onGameAction('towers_merged', { col, row, type, newLevel });
        }

        this.deselectAll();
    }

    // ── drag-move ──────────────────────────────────────────────────────────
    handleDragMerge(startPos, endPos) {
        const sourceCannon = this.entities.getCannon(startPos.col, startPos.row);
        if (!sourceCannon) return;

        const targetOccupied = this.entities.getCannon(endPos.col, endPos.row);
        if (targetOccupied) return; // merge only via selection

        const ui = this.game.ui;
        if (!ui.isInDefenseZone(endPos.row) || !ui.isValidGridPos(endPos)) return;

        const didMove = sourceCannon.col !== endPos.col || sourceCannon.row !== endPos.row;
        sourceCannon.col = endPos.col;
        sourceCannon.row = endPos.row;
        this.particles.emit(endPos.col, endPos.row, {
            text: '↔️', color: CONFIG.COLORS.TEXT_PRIMARY, vy: -0.5, life: 0.5,
        });

        if (didMove && this.game.tutorial?.isActive) {
            this.game.tutorial.onGameAction('tower_moved', {
                from: startPos, to: endPos, type: sourceCannon.type,
            });
        }
    }

    // ── upgrade (shop special) ─────────────────────────────────────────────
    upgradeTower(cannon) {
        if (!cannon || !this.state.pendingUpgradeItem) return;
        if (cannon.level >= MERGE_LEVELS.length) {
            this.particles.createWarningEffect(cannon.col, cannon.row, '⚠️ MAX LEVEL!');
            this.audio.uiError();
            return;
        }

        cannon.level++;
        // Deduplicated via BoostManager
        this.game.boostManager.applyBoostsToTower(cannon);

        this.particles.createTowerUpgradeEffect(cannon.col, cannon.row);
        this.audio.towerMerge();

        const upgradeBonus = Math.floor(500 * cannon.level);
        this.state.score  += upgradeBonus;
        this.particles.emit(cannon.col, cannon.row, {
            text: `⭐ LEVEL ${cannon.level} ⭐`, color: '#ffdd00',
            vy: -2, life: 2.0, scale: 1.8, glow: true,
        });

        this.state.selectingTowerForUpgrade = false;
        this.state.pendingUpgradeItem       = null;
    }

    // ── utilities ──────────────────────────────────────────────────────────
    deselectAll() {
        this.state.selectedCannons.forEach(c => { c.selected = false; });
        this.state.selectedCannons = [];
    }

    findMatchingCannons(cannon) {
        return this.entities.cannons.filter(c => c !== cannon && c.canMergeWith(cannon));
    }
}
