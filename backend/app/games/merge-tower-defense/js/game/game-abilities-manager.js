/**
 * AbilityManager — SRP: Bomb, Pushback, Stun special abilities.
 *
 * SonarQube deduplication: the ability level-up check appeared identically in
 * executeBomb, executeStun, and activatePushbackAbility. It is now in `_checkLevelUp`.
 */
import { CONFIG, SPECIAL_ABILITIES } from '../config.js';
import { Utils } from '../utils.js';

export class AbilityManager {
    constructor(game) {
        this.game = game;
    }

    // ── convenience accessors ──────────────────────────────────────────────
    get state()     { return this.game.state; }
    get particles() { return this.game.particles; }
    get audio()     { return this.game.audio; }
    get entities()  { return this.game.entities; }

    // ── public API ─────────────────────────────────────────────────────────
    activateSpecialAbility(abilityId) {
        const config      = SPECIAL_ABILITIES[abilityId];
        if (!config) return;

        const abilityState = this.state.specialAbilities[abilityId];
        const elapsed      = Date.now() - abilityState.lastUsed;

        if (elapsed < config.baseCooldown) {
            const remaining = Math.ceil((config.baseCooldown - elapsed) / 1000);
            this.particles.createWarningEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 1, `⏳ ${remaining}s`);
            this.audio.uiError();
            return;
        }

        if      (abilityId === 'BOMB')     this.activateBombAbility(config, abilityState);
        else if (abilityId === 'PUSHBACK') this.activatePushbackAbility(config, abilityState);
        else if (abilityId === 'STUN')     this.activateStunAbility(config, abilityState);
    }

    activateBombAbility(config, state) {
        this.game.input.setDragEnabled(false);
        this.game.ui.enterBombTargetingMode(gridPos => {
            this.game.input.setDragEnabled(true);
            this.executeBomb(gridPos, config, state);
        }, 'BOMB');
        this.audio.uiClick();
    }

    executeBomb(gridPos, config, state) {
        const now    = Date.now();
        const level  = state.level;
        const wave   = this.state.wave || 1;

        const baseDamage     = config.baseDamage + (level - 1) * config.damagePerLevel;
        const waveMultiplier = 1 + (wave - 1) * 0.5;
        const damage         = Math.round(baseDamage * waveMultiplier);
        const radius         = config.baseRadius;

        state.lastUsed = now;
        state.uses++;

        this.particles.createMegaBombEffect(gridPos.col, gridPos.row, radius, damage);
        this.game.addScreenShake(8, 0.25);
        this.audio.explosion?.() || this.audio.towerMerge();

        let killCount        = 0;
        const zombiesToCheck = [...this.entities.zombies];
        for (const zombie of zombiesToCheck) {
            const dist = Utils.distance(gridPos.col, gridPos.row, zombie.col, zombie.row);
            if (dist > radius) continue;

            const falloff      = 1 - (dist / radius) * 0.3;
            const result       = zombie.takeDamage(damage * falloff, now);
            if (!result.blocked) {
                this.particles.createDamageNumber(zombie.col, zombie.row, result.damage, '#ff4400');
            }
            if (zombie.isDead()) { this.game.killZombie(zombie); killCount++; }
        }

        state.kills += killCount;
        this._checkLevelUp(state, config, gridPos.col, gridPos.row);

        if (killCount > 0) {
            const bonus = killCount * 25 * level;
            this.state.score += bonus;
            this.particles.emit(gridPos.col, gridPos.row - 1.2, {
                text: `+${bonus}`, color: '#ffaa00', vy: -1.5, life: 1, scale: 1.2, glow: true,
            });
        }
    }

    activatePushbackAbility(config, state) {
        const now         = Date.now();
        const level       = state.level;
        const pushDistance = config.basePushDistance + (level - 1) * config.pushDistancePerLevel;

        state.lastUsed = now;
        state.uses++;

        const defenseLineY = CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS;
        this.particles.createForceWaveEffect(defenseLineY, CONFIG.COLS);
        this.audio.waveStart?.() || this.audio.towerMerge();

        let pushedCount = 0;
        for (const zombie of this.entities.zombies) {
            const newRow     = Math.max(-1, zombie.row - pushDistance);
            const actualPush = zombie.row - newRow;
            if (actualPush <= 0) continue;

            this.particles.createEnemyPushbackEffect(zombie.col, zombie.row, actualPush);
            zombie.row   = newRow;
            zombie.atWall = false;
            pushedCount++;
        }

        state.enemiesPushed += pushedCount;
        this._checkLevelUp(state, config, CONFIG.COLS / 2, CONFIG.ROWS / 2);

        if (pushedCount > 0) {
            const bonus = pushedCount * 10 * level;
            this.state.score += bonus;
            this.particles.emit(CONFIG.COLS / 2, defenseLineY - 0.5, {
                text: `+${bonus}`, color: '#00ccff', vy: -1.5, life: 1, scale: 1.2, glow: true,
            });
        }
    }

    activateStunAbility(config, state) {
        this.game.input.setDragEnabled(false);
        this.game.ui.enterBombTargetingMode(gridPos => {
            this.game.input.setDragEnabled(true);
            this.executeStun(gridPos, config, state);
        }, 'STUN');
        this.audio.uiClick();
    }

    executeStun(gridPos, config, state) {
        const gameTime    = performance.now();
        const level       = state.level;
        const stunDuration = config.baseStunDuration + (level - 1) * config.stunDurationPerLevel;
        const radius       = config.baseRadius + (level - 1) * config.radiusPerLevel;

        state.lastUsed = Date.now();
        state.uses++;

        this.particles.createStunWaveEffect(gridPos.col, gridPos.row, radius, stunDuration);
        this.game.addScreenShake(5, 0.2);
        this.audio.waveStart?.() || this.audio.towerMerge();

        let stunnedCount = 0;
        for (const zombie of this.entities.zombies) {
            const dist = Utils.distance(gridPos.col, gridPos.row, zombie.col, zombie.row);
            if (dist > radius) continue;

            const effectiveDuration = stunDuration * (1 - (zombie.ccResistance || 0));
            if (effectiveDuration <= 0) continue;

            zombie.stunnedUntil = gameTime + effectiveDuration;
            stunnedCount++;
            this.particles.emit(zombie.col, zombie.row, {
                text: '💫', color: '#ffee00', vy: -1, life: 0.8, scale: 1, glow: true,
            });
        }

        state.enemiesStunned += stunnedCount;
        this._checkLevelUp(state, config, gridPos.col, gridPos.row);

        if (stunnedCount > 0) {
            const bonus = stunnedCount * 15 * level;
            this.state.score += bonus;
            this.particles.emit(gridPos.col, gridPos.row - 1, {
                text: `+${bonus}`, color: '#ffee00', vy: -1.5, life: 1, scale: 1.2, glow: true,
            });
            this.particles.emit(gridPos.col, gridPos.row + 0.5, {
                text: `⚡${stunnedCount} STUNNED!`, color: '#ffffff',
                vy: -0.8, life: 1.5, scale: 1.3, glow: true,
            });
        }
    }

    getAbilityCooldownProgress(abilityId) {
        const config = SPECIAL_ABILITIES[abilityId];
        const state  = this.state.specialAbilities[abilityId];
        if (!config || !state) return 1;
        return Math.min(1, (Date.now() - state.lastUsed) / config.baseCooldown);
    }

    isAbilityReady(abilityId) {
        return this.getAbilityCooldownProgress(abilityId) >= 1;
    }

    // ── private helpers ────────────────────────────────────────────────────

    /**
     * Deduplicated ability level-up check.
     * Previously copy-pasted in executeBomb, executeStun, activatePushbackAbility.
     */
    _checkLevelUp(state, config, col, row) {
        if (state.uses % 5 === 0 && state.level < config.maxLevel) {
            state.level++;
            this.particles.createAbilityLevelUpEffect(col, row, state.level, config.icon, config.color);
        }
    }
}
