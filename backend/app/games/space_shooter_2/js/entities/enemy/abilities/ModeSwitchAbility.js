// ============================================================
//  ModeSwitchAbility — cycles through N modes on a timer,
//  modifying turret behaviour per mode
//  Used by: electroweakPhase (B20), grandUnification (B24)
// ============================================================
import BossAbility from './BossAbility.js';
import { mono } from '../../../FontConfig.js';

class ModeSwitchAbility extends BossAbility {
    init(boss) {
        this._modeIndex = 0;
        this._timer = this.config.interval;
        this._applyMode(boss);
    }

    update(dt, game, boss) {
        this._timer -= dt;
        if (this._timer <= 0) {
            this._modeIndex = (this._modeIndex + 1) % this.config.modes.length;
            this._timer = this.config.interval;
            this._applyMode(boss);
            game.particles.emit(boss.centerX, boss.centerY, 'hit', 8);
        }
    }

    render(ctx, boss, barY) {
        const mode = this.config.modes[this._modeIndex];
        if (!mode?.indicator) return;
        const ind = mode.indicator;

        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.font = mono(8);
        ctx.fillStyle = ind.color;
        ctx.textAlign = 'center';
        ctx.fillText(ind.text, boss.centerX, barY - (boss.enraged ? 24 : 14));
        ctx.restore();
    }

    _applyMode(boss) {
        const mode = this.config.modes[this._modeIndex];
        if (!mode) return;

        for (const p of boss.parts) {
            if (!p.active || !p.canShoot || p.role !== 'turret') continue;
            if (mode.shootRateMult != null) {
                p.shootRate = p._baseShootRate * mode.shootRateMult;
            }
            if (mode.shootPattern != null) {
                p.shootPattern = mode.shootPattern;
            }
        }
    }
}

export default ModeSwitchAbility;
