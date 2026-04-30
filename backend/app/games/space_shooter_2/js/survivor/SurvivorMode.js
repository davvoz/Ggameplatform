import { SURVIVOR_TIMELINE, TOTAL_BOSSES } from './SurvivorTimeline.js';
import { pickSurvivorEnemy } from './SurvivorEnemyPool.js';
import {
    KILLS_PER_STEP,
    PHASE_SPAWN_RATE,
    MAX_LIVE_ENEMIES,
    WAVE_SIZE_MIN,
    WAVE_SIZE_MAX,
    SURVIVOR_PATTERNS
} from './SurvivorConfig.js';
import { e as enemySpec, makeWave } from '../LEVEL_DATA.js';

/**
 * SurvivorMode — Drives World 5 gameplay loop (KILL-BASED, no time pressure).
 *
 * Replaces WaveManager.updateWaves() while `game.gameMode === 'survivor'`.
 *
 * Flow:
 *   - Walk SURVIVOR_TIMELINE event-by-event.
 *   - Between events: spawn regular waves continuously.
 *     A "step" requires KILLS_PER_STEP regular kills (tracked via
 *     scoreManager.totalEnemiesKilled). When the step quota is met,
 *     fire the next milestone (mini-boss or boss).
 *   - Boss kill increments phase; final boss → victory.
 *
 * No timers, no SURVIVOR_DURATION — only kill counts and phase index.
 */
export default class SurvivorMode {
    constructor(game) {
        this.game = game;

        this.active = false;
        this.bossesDefeated = 0;

        this._phaseIndex = 0;            // 0..3
        this._eventCursor = 0;
        this._milestoneActive = false;
        this._spawnAccumulator = 0;

        // Kill-progress tracking for the current step
        this._killsBaseline = 0;          // scoreManager.totalEnemiesKilled at step start
        this._stepTarget = KILLS_PER_STEP;

        this.nextEvent = SURVIVOR_TIMELINE[0] || null;
    }

    // ───────────────────────────────────────────────
    //  Lifecycle
    // ───────────────────────────────────────────────

    start() {
        this.active = true;
        this.bossesDefeated = 0;
        this._phaseIndex = 0;
        this._eventCursor = 0;
        this._milestoneActive = false;
        this._spawnAccumulator = 0;
        this._killsBaseline = this.game.scoreManager?.totalEnemiesKilled || 0;
        this._stepTarget = KILLS_PER_STEP;
        this.nextEvent = SURVIVOR_TIMELINE[0] || null;
    }

    stop() {
        this.active = false;
    }

    reset() {
        this.stop();
        this.bossesDefeated = 0;
        this._phaseIndex = 0;
        this._eventCursor = 0;
        this._milestoneActive = false;
        this._spawnAccumulator = 0;
        this._killsBaseline = 0;
        this._stepTarget = KILLS_PER_STEP;
        this.nextEvent = SURVIVOR_TIMELINE[0] || null;
    }

    // ───────────────────────────────────────────────
    //  Per-frame update
    // ───────────────────────────────────────────────

    update(deltaTime) {
        if (!this.active) return;

        if (this._handleActiveMilestone()) return;

        this._tryFireScheduledEvent();

        if (!this._milestoneActive) {
            this._spawnRegularWaves(deltaTime);
        }
    }

    // ───────────────────────────────────────────────
    //  Internal — milestones (boss / miniboss)
    // ───────────────────────────────────────────────

    _handleActiveMilestone() {
        if (!this._milestoneActive) return false;
        const em = this.game.entityManager;

        if (em.bossActive) {
            if (em.boss && !em.boss.active) this._onBossDefeated();
            return true;
        }
        if (em.miniBossActive) {
            if (em.miniBoss && !em.miniBoss.active) this._onMiniBossDefeated();
            return true;
        }
        // Defensive: flags cleared but milestone flag still set
        this._milestoneActive = false;
        this._resetStepBaseline();
        return false;
    }

    _onBossDefeated() {
        const em = this.game.entityManager;
        // ScoreManager.onBossKilled reads em.boss.* — invoke BEFORE clearing.
        this.game.scoreManager.onBossKilled?.();
        em.bossActive = false;
        em.boss = null;
        this.bossesDefeated++;
        this._milestoneActive = false;

        if (this.bossesDefeated >= TOTAL_BOSSES) {
            this._triggerVictory();
            return;
        }

        // Boss done → advance phase, start fresh step counter
        this._phaseIndex = Math.min(PHASE_SPAWN_RATE.length - 1, this._phaseIndex + 1);
        this._resetStepBaseline();
    }

    _onMiniBossDefeated() {
        const em = this.game.entityManager;
        // ScoreManager.onMiniBossKilled reads em.miniBoss.* — invoke BEFORE clearing.
        this.game.scoreManager.onMiniBossKilled?.();
        em.miniBossActive = false;
        em.miniBoss = null;
        this._milestoneActive = false;
        this._resetStepBaseline();
    }

    /** Snapshot kill counter so the next step's progress starts at 0. */
    _resetStepBaseline() {
        this._killsBaseline = this.game.scoreManager?.totalEnemiesKilled || 0;
    }

    /** Fire the next milestone if the player has cleared the step quota. */
    _tryFireScheduledEvent() {
        if (this._eventCursor >= SURVIVOR_TIMELINE.length) return;
        if (this.getStepKills() < this._stepTarget) return;

        const evt = SURVIVOR_TIMELINE[this._eventCursor];
        this._eventCursor++;
        this.nextEvent = SURVIVOR_TIMELINE[this._eventCursor] || null;

        if (evt.type === 'boss') {
            this._fireBossEvent(evt);
        } else {
            this._fireMiniBossEvent(evt);
        }
    }

    _fireBossEvent(evt) {
        // Clear minor enemies for breathing room before the boss arrives
        const em = this.game.entityManager;
        em.enemies = em.enemies.filter(e => !e.active || e._isAlly);
        this.game.waveManager.spawnBoss(evt.id);
        this._milestoneActive = true;
    }

    _fireMiniBossEvent(evt) {
        this.game.waveManager.spawnMiniBoss(evt.id);
        this._milestoneActive = true;
    }

    // ───────────────────────────────────────────────
    //  Internal — regular waves
    // ───────────────────────────────────────────────

    _spawnRegularWaves(deltaTime) {
        const rate = PHASE_SPAWN_RATE[Math.min(PHASE_SPAWN_RATE.length - 1, this._phaseIndex)];
        this._spawnAccumulator += rate * deltaTime;
        if (this._spawnAccumulator < WAVE_SIZE_MIN) return;

        const em = this.game.entityManager;
        const aliveCount = em.enemies.filter(e => e.active && !e._isAlly).length;
        if (aliveCount >= MAX_LIVE_ENEMIES) {
            this._spawnAccumulator = Math.min(this._spawnAccumulator, WAVE_SIZE_MAX);
            return;
        }

        const room = MAX_LIVE_ENEMIES - aliveCount;
        const desired = Math.min(WAVE_SIZE_MAX, Math.floor(this._spawnAccumulator), room);
        const size = Math.max(WAVE_SIZE_MIN, desired);
        this._spawnAccumulator -= size;

        this._emitWave(size);
    }

    _emitWave(size) {
        const enemies = [];
        for (let i = 0; i < size; i++) {
            const type = pickSurvivorEnemy(this._phaseIndex);
            const x = 0.1 + (i / Math.max(1, size - 1)) * 0.8;
            const pat = SURVIVOR_PATTERNS[Math.floor(Math.random() * SURVIVOR_PATTERNS.length)];
            enemies.push(enemySpec(type, Number.parseFloat(x.toFixed(2)), pat));
        }
        const wave = makeWave(enemies, 0, 'none');
        this.game.waveManager.spawnWave(wave, 0.75);
    }

    // ───────────────────────────────────────────────
    //  Victory
    // ───────────────────────────────────────────────

    _triggerVictory() {
        const g = this.game;
        this.stop();
        if (globalThis.saveWorldProgress) globalThis.saveWorldProgress(5);
        g.saveManager?.deleteSave?.();
        g.state = 'victory';
        g.uiManager.showVictoryScreen();
    }

    // ───────────────────────────────────────────────
    //  HUD-facing helpers
    // ───────────────────────────────────────────────

    /** Current phase index 0..3. */
    getPhase() {
        return this._phaseIndex;
    }

    /** Kills accumulated since the last milestone. */
    getStepKills() {
        const total = this.game.scoreManager?.totalEnemiesKilled || 0;
        return Math.max(0, total - this._killsBaseline);
    }

    /** Step progress as { current, target }. */
    getStepProgress() {
        return {
            current: Math.min(this.getStepKills(), this._stepTarget),
            target: this._stepTarget
        };
    }

    /** True while a boss/miniboss fight is in progress. */
    isMilestoneActive() {
        return this._milestoneActive;
    }
}
