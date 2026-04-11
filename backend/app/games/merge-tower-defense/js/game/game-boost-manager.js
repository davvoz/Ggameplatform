/**
 * BoostManager — SRP: shop purchases, temporary/instant boosts, tower stat updates.
 *
 * SonarQube deduplication: the boost-multiplier building pattern appeared three times
 * in game_old.js (performMerge, upgradeTower, updateTowerBoosts).
 * It is now consolidated in `applyBoostsToTower` and `_buildMultipliers`.
 */
import { CONFIG, SHOP_ITEMS } from '../config.js';

export class BoostManager {
    constructor(game) {
        this.game = game;
    }

    // ── convenience accessors ──────────────────────────────────────────────
    get state()     { return this.game.state; }
    get particles() { return this.game.particles; }
    get audio()     { return this.game.audio; }
    get entities()  { return this.game.entities; }

    // ── public API ─────────────────────────────────────────────────────────

    purchaseShopItem(itemId) {
        const item = SHOP_ITEMS[itemId];
        if (!item) return false;

        if (item.type === 'temporary') {
            const alreadyActive = this.state.activeBoosts.some(b => b.type === item.effect.type);
            if (alreadyActive) {
                this.particles.createWarningEffect(3, 2, '⏳ Already active!');
                this.audio.uiError();
                return false;
            }
        }

        if (this.state.coins < item.cost) {
            this.particles.createWarningEffect(3, 2, '💰 Not enough coins!');
            this.audio.uiError();
            return false;
        }

        this.state.coins -= item.cost;

        if      (item.type === 'instant')   this.applyInstantBoost(item);
        else if (item.type === 'temporary') this.applyTemporaryBoost(item);
        else if (item.type === 'special')   this.applySpecialBoost(item);

        this.audio.uiClick();
        return true;
    }

    applyInstantBoost(item) {
        if (item.effect.type === 'energy') {
            this.state.energy = Math.min(CONFIG.INITIAL_ENERGY * 2, this.state.energy + item.effect.amount);
            this.particles.createEnergyBoostEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 1, item.effect.amount);
        }
    }

    applyTemporaryBoost(item) {
        const now   = Date.now();
        const boost = {
            id: item.id, type: item.effect.type, multiplier: item.effect.multiplier,
            startTime: now, duration: item.duration, endTime: now + item.duration,
            icon: item.icon, name: item.name,
        };

        this.state.activeBoosts = this.state.activeBoosts.filter(b => b.type !== item.effect.type);
        this.state.activeBoosts.push(boost);

        const cx = CONFIG.COLS / 2;
        const cy = CONFIG.ROWS / 2 - 1;
        switch (item.effect.type) {
            case 'damage_multiplier':   this.particles.createDamageBoostEffect(cx, cy);   break;
            case 'range_multiplier':    this.particles.createRangeBoostEffect(cx, cy);    break;
            case 'firerate_multiplier': this.particles.createFireRateBoostEffect(cx, cy); break;
            default:
                this.particles.createShopEffect(cx, cy, item.icon, CONFIG.COLORS.TEXT_WARNING);
        }
    }

    applySpecialBoost(item) {
        if (item.effect.type === 'tower_upgrade') {
            this.state.selectingTowerForUpgrade = true;
            this.state.pendingUpgradeItem       = item;
            this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 1, {
                text: '⭐ CLICK A TOWER TO UPGRADE ⭐',
                color: '#ffdd00', vy: -1, life: 3.0, scale: 1.5, glow: true,
            });
        }
    }

    updateBoosts() {
        const now = Date.now();
        const expired = this.state.activeBoosts.filter(b => now >= b.endTime);
        expired.forEach(b => {
            this.particles.createBoostExpiredEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2, b.icon, b.name);
        });
        this.state.activeBoosts = this.state.activeBoosts.filter(b => now < b.endTime);
    }

    updateTowerBoosts() {
        const multipliers    = this._buildMultipliers();
        const hasBoosts      = multipliers.damage > 1 || multipliers.range > 1 || multipliers.fireRate > 1;
        const wasActive      = this.state.lastBoostUpdate;

        if (hasBoosts || wasActive) {
            this.entities.cannons.forEach(cannon =>
                cannon.updateStats(hasBoosts ? multipliers : null)
            );
            this.state.lastBoostUpdate = hasBoosts;
        }
    }

    /**
     * Deduplicated: applies current active boosts to a single cannon.
     * Was duplicated in performMerge and upgradeTower in game_old.js.
     */
    applyBoostsToTower(cannon) {
        const multipliers = this._buildMultipliers();
        const hasBoosts   = this.state.activeBoosts && this.state.activeBoosts.length > 0;
        cannon.updateStats(hasBoosts ? multipliers : null);
    }

    getBoostMultiplier(type) {
        const boost = this.state.activeBoosts.find(b => b.type === type);
        return boost ? boost.multiplier : 1;
    }

    getRemainingBoostTime(type) {
        const boost = this.state.activeBoosts.find(b => b.type === type);
        return boost ? Math.max(0, boost.endTime - Date.now()) : 0;
    }

    getBoostProgress(type) {
        const boost = this.state.activeBoosts.find(b => b.type === type);
        if (!boost) return 0;
        return Math.max(0, Math.min(1, (Date.now() - boost.startTime) / boost.duration));
    }

    renderBoostEffects() {
        if (this.state.activeBoosts.length === 0) return;

        const ctx         = this.game.graphics.ctx;
        const cellSize    = this.game.graphics.cellSize;
        const time        = Date.now() * 0.001;
        const damageBoost = this.state.activeBoosts.find(b => b.type === 'damage_multiplier');
        const rangeBoost  = this.state.activeBoosts.find(b => b.type === 'range_multiplier');
        const fireBoost   = this.state.activeBoosts.find(b => b.type === 'firerate_multiplier');

        this.entities.cannons.forEach((cannon, index) => {
            const sp   = this.game.graphics.gridToScreen(cannon.col, cannon.row);
            const x    = sp.x + cellSize / 2;
            const y    = sp.y + cellSize / 2;
            const pOff = index * 0.5;

            if (damageBoost) this._renderDamageBoost(ctx, x, y, cellSize, time, pOff);
            if (rangeBoost)  this._renderRangeBoost(ctx, x, y, cellSize, time, pOff);
            if (fireBoost)   this._renderFireRateBoost(ctx, x, y, cellSize, time, pOff);
        });
    }

    // ── private helpers ────────────────────────────────────────────────────

    _buildMultipliers() {
        return {
            damage:   this.getBoostMultiplier('damage_multiplier'),
            range:    this.getBoostMultiplier('range_multiplier'),
            fireRate: this.getBoostMultiplier('firerate_multiplier'),
        };
    }

    _renderDamageBoost(ctx, x, y, cellSize, time, pOff) {
        const pulse      = Math.sin(time * 6 + pOff) * 0.5 + 0.5;
        const outerPulse = Math.sin(time * 4 + pOff) * 0.3 + 0.7;

        ctx.save();
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur  = 15 + pulse * 10;
        ctx.globalAlpha = 0.15 + pulse * 0.15;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 0.7);
        grad.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
        grad.addColorStop(0.5, 'rgba(255, 50, 50, 0.2)');
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.7 * outerPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.3 + pulse * 0.2;
        ctx.fillStyle   = '#ff6644';
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < 4; i++) {
            const angle  = time * 3 + (i * Math.PI / 2) + pOff;
            const radius = cellSize * (0.35 + Math.sin(time * 8 + i) * 0.1);
            ctx.save();
            ctx.globalAlpha = 0.7 + Math.sin(time * 10 + i) * 0.3;
            ctx.fillStyle   = i % 2 === 0 ? '#ff4400' : '#ffaa00';
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                3 + Math.sin(time * 5 + i),
                0, Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        }
    }

    _renderRangeBoost(ctx, x, y, cellSize, time, pOff) {
        const waveSpeed = time * 2;
        for (let ring = 0; ring < 3; ring++) {
            const ringPhase  = (waveSpeed + ring * 0.5 + pOff) % 1.5;
            const ringRadius = cellSize * (0.3 + ringPhase * 0.6);
            ctx.save();
            ctx.globalAlpha = Math.max(0, 0.5 - ringPhase * 0.35);
            ctx.strokeStyle = '#4488ff';
            ctx.lineWidth   = 2 - ringPhase;
            ctx.beginPath();
            ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur  = 10;
        const rGrad = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 0.3);
        rGrad.addColorStop(0, 'rgba(68, 136, 255, 0.3)');
        rGrad.addColorStop(1, 'rgba(68, 136, 255, 0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth   = 2;
        const sweep = time * 4 + pOff;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(sweep) * cellSize * 0.5, y + Math.sin(sweep) * cellSize * 0.5);
        ctx.stroke();
        ctx.restore();
    }

    _renderFireRateBoost(ctx, x, y, cellSize, time, pOff) {
        const sparkIntensity = Math.sin(time * 12 + pOff) * 0.5 + 0.5;

        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur  = 8 + sparkIntensity * 8;
        const cGrad = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 0.25);
        cGrad.addColorStop(0, 'rgba(255, 255, 100, 0.5)');
        cGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < 6; i++) {
            const angle  = time * 8 + (i * Math.PI / 3) + pOff;
            const orbit  = cellSize * 0.4;
            ctx.save();
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur  = 5;
            ctx.globalAlpha = 0.6 + Math.sin(time * 15 + i * 2) * 0.4;
            ctx.fillStyle   = '#ffee00';
            ctx.beginPath();
            ctx.arc(x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.3 + sparkIntensity * 0.3;
        ctx.strokeStyle = '#ffff88';
        ctx.lineWidth   = 1;
        for (let i = 0; i < 3; i++) {
            const sAngle = time * 8 + (i * Math.PI * 2 / 3) + pOff;
            const eAngle = sAngle + Math.PI / 3;
            const sx = x + Math.cos(sAngle) * cellSize * 0.35;
            const sy = y + Math.sin(sAngle) * cellSize * 0.35;
            const ex = x + Math.cos(eAngle) * cellSize * 0.35;
            const ey = y + Math.sin(eAngle) * cellSize * 0.35;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(
                (sx + ex) / 2 + (Math.random() - 0.5) * 10,
                (sy + ey) / 2 + (Math.random() - 0.5) * 10,
                ex, ey
            );
            ctx.stroke();
        }
        ctx.restore();
    }
}
