import {
    MAX_MULTIPLIER,
    PHASE_KILL_THRESHOLD,
    PHASE_SPAWN_RATE,
    WAVE_SIZE_MIN,
    WAVE_SIZE_MAX,
    DEATH_BANK_RECOVERY,
    PHASE_POOLS,
    BLITZ_DIFFICULTY,
    BLITZ_EVENTS,
    BLITZ_MINIBOSS_POOL,
    BLITZ_BOSS_POOL,
    BLITZ_MAX_CYCLES
} from './BlitzConfig.js';
import { e as enemySpec, makeWave } from '../../../LEVEL_DATA.js';

/**
 * BlitzMode — Drives World 6 gameplay loop.
 *
 * Replaces WaveManager.updateWaves() while `game.gameMode === 'blitz'`.
 *
 * Core loop:
 *  - Kill an enemy → chain extends, multiplier grows (×1 … ×50).
 *  - Every kill score goes to `unbankedScore * multiplier`.
 *  - If the player banks → unbankedScore is added to `scoreManager.score`, chain resets.
 *  - If the player dies → 10% of unbanked is recovered; the rest is lost.
 *  - If the chain window (2s) expires → chain resets, multiplier back to ×1.
 *  - If the player takes damage → chain resets.
 *  - Enemies escalate every PHASE_KILL_THRESHOLD kills through 4 phases.
 */
export default class BlitzMode {
    constructor(game) {
        this.game = game;

        this.active = false;

        // Chain state
        this._chainCount = 0;
        this._chainTimer = 0;

        // Scoring
        this.unbankedScore = 0;
        this.bestChain = 0;
        this._chainBrokeAmount = 0;  // frozen lost amount shown during flash

        // Spawn
        this._spawnAccumulator = 0;
        this._totalKills = 0;
        this._lastPlayerHealth = Infinity;

        // Visual feedback
        this._chainBrokeFlash = 0;      // seconds remaining for HUD flash
        this._bankFlash = 0;
        this._bankAnim = { timer: 0, duration: 1.5, amount: 0 };

        // Perk unlock tracking
        this._bankCount = 0;
        this._perkPending = false;

        // Cycle / milestone tracking
        this._cycle = 0;              // completed cycle count
        this._cycleKills = 0;         // kills within the current cycle
        this._nextEventIdx = 0;       // index into BLITZ_EVENTS for this cycle
        this._milestoneActive = false;
    }

    // ── Lifecycle ──────────────────────────────────────────────

    start() {
        this.active = true;
        this._chainCount = 0;
        this._chainTimer = 0;
        this.unbankedScore = 0;
        this.bestChain = 0;
        this._chainBrokeAmount = 0;
        this._spawnAccumulator = 0;
        this._totalKills = 0;
        this._lastPlayerHealth = this.game.entityManager.player?.health ?? Infinity;
        this._chainBrokeFlash = 0;
        this._bankFlash = 0;
        this._bankCount = 0;
        this._perkPending = false;
        this._cycle = 0;
        this._cycleKills = 0;
        this._nextEventIdx = 0;
        this._milestoneActive = false;
    }

    stop() {
        this.active = false;
        this._bankAnim.timer = 0;
    }

    reset() {
        this.stop();
        this._chainCount = 0;
        this._chainTimer = 0;
        this.unbankedScore = 0;
        this.bestChain = 0;
        this._chainBrokeAmount = 0;
        this._spawnAccumulator = 0;
        this._totalKills = 0;
        this._lastPlayerHealth = Infinity;
        this._chainBrokeFlash = 0;
        this._bankFlash = 0;
        this._bankAnim = { timer: 0, duration: 1.5, amount: 0 };
        this._bankCount = 0;
        this._perkPending = false;
        this._cycle = 0;
        this._cycleKills = 0;
        this._nextEventIdx = 0;
        this._milestoneActive = false;
    }

    // ── Per-frame update ───────────────────────────────────────

    update(dt) {
        if (!this.active) return;

        // Detect player hit → break chain
        const player = this.game.entityManager.player;
        if (player) {
            if (player.health < this._lastPlayerHealth) {
                this._breakChain(0);  // on hit: nothing to show (score is zeroed)
                this.unbankedScore = 0;
            }
            this._lastPlayerHealth = player.health;
        }

        // Chain window countdown
        if (this._chainCount > 0) {
            this._chainTimer -= dt;
            if (this._chainTimer <= 0) {
                this._breakChain(this.unbankedScore);  // timer expiry: show lost amount
            }
        }

        // Flash timers
        if (this._chainBrokeFlash > 0) this._chainBrokeFlash -= dt;
        if (this._bankFlash > 0) this._bankFlash -= dt;
        if (this._bankAnim.timer > 0) this._bankAnim.timer -= dt;

        // Update blitz world renderer intensity
        if (this.game.backgroundFacade) {
            this.game.backgroundFacade.setBlitzIntensity(this._getIntensity());
        }

        // Handle active milestone (boss/miniboss alive — no regular spawning)
        if (this._handleActiveMilestone()) return;

        // Spawn wave
        this._spawnAccumulator += dt;
        const diffCfg  = this._getDiffCfg();
        const cycleScale = this._getCycleScale();
        const spawnRate = PHASE_SPAWN_RATE[this._getPhase()] * diffCfg.spawnMult * cycleScale.spawnMult;
        if (this._spawnAccumulator >= 1 / spawnRate) {
            this._spawnAccumulator = 0;
            this._trySpawnWave();
        }
    }

    // ── Kill hook (called by WaveManager.onEnemyKilled) ───────

    onEnemyKilled(enemy) {
        const diffCfg = this._getDiffCfg();
        this._chainCount = Math.min(this._chainCount + 1, MAX_MULTIPLIER);
        // Reset chain timer using difficulty-scaled window
        this._chainTimer = diffCfg.chainWindow;
        this._totalKills++;
        this._cycleKills++;

        if (this._chainCount > this.bestChain) {
            this.bestChain = this._chainCount;
        }

        // Score = enemy base score × current multiplier × difficulty multiplier
        const pts = Math.floor(
            enemy.score * this._chainCount * this.game.difficulty.scoreMultiplier
        );
        this.unbankedScore += pts;

        // Check cycle events (miniboss / boss thresholds)
        this._tryFireCycleEvent();
    }

    // ── Bank ──────────────────────────────────────────────────

    /**
     * Convert all unbanked score into safe (permanent) score.
     * Resets the chain multiplier back to ×1.
     * No-op if nothing to bank.
     */
    bank() {
        if (this.unbankedScore <= 0) return;

        const banked = this.unbankedScore;
        this.game.scoreManager.score += banked;
        this.game.scoreManager.totalPoints += banked;

        this.unbankedScore = 0;
        this._chainCount = 0;
        this._chainTimer = 0;
        this._bankFlash = 1.5;

        // Trigger the big bank animation
        this._bankAnim.amount = banked;
        this._bankAnim.timer  = this._bankAnim.duration;

        this.game.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.25);
        this.game.sound.playPowerUp?.();

        // Check if a perk screen should be awarded
        this._bankCount++;
        const diffCfg = this._getDiffCfg();
        if (this._bankCount % diffCfg.perkEvery === 0) {
            this._perkPending = true;
        }
    }

    /**
     * Called by Game.js on player death — recover a fraction of unbanked.
     */
    onRunEnd() {
        if (this.unbankedScore > 0) {
            const recovered = Math.floor(this.unbankedScore * DEATH_BANK_RECOVERY);
            this.game.scoreManager.score += recovered;
            this.game.scoreManager.totalPoints += recovered;
        }
    }

    // ── HUD Getters ───────────────────────────────────────────

    get multiplier()       { return this._chainCount; }
    get chainProgress()    { return this._chainCount > 0 ? this._chainTimer / this._getDiffCfg().chainWindow : 0; }
    get isChainBroke()     { return this._chainBrokeFlash > 0; }
    get chainBrokeAmount() { return this._chainBrokeAmount ?? 0; }
    get isBankFlash()      { return this._bankFlash > 0; }
    get canBank()          { return this.unbankedScore > 0; }
    /** Animation state for the BANKED splash — timer counts down from duration to 0. */
    get bankAnim()         { return this._bankAnim; }
    /** True when the player has earned a perk selection — consumed by Game.js. */
    get perkPending()      { return this._perkPending; }
    /** Consume the pending perk flag (called before showing the perk screen). */
    consumePerk()          { this._perkPending = false; }
    /** Score costs for perk actions based on current difficulty. */
    get perkCosts()        { return this._getDiffCfg().perkCosts; }

    getPhase()             { return this._getPhase(); }

    // ── Internal ─────────────────────────────────────────────

    _breakChain(lostAmount = 0) {
        if (this._chainCount === 0) return;
        this._chainCount = 0;
        this._chainTimer = 0;
        this._chainBrokeFlash = 0.4;
        this._chainBrokeAmount = lostAmount;  // freeze amount for HUD display
        this.game.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.08);
    }

    _getDiffCfg() {
        const id = this.game.difficulty?.id || 'normal';
        return BLITZ_DIFFICULTY[id] ?? BLITZ_DIFFICULTY.normal;
    }

    _getPhase() {
        // Phases reset every cycle — based on kills within the current cycle
        const raw = Math.floor(this._cycleKills / PHASE_KILL_THRESHOLD);
        return Math.min(raw, PHASE_SPAWN_RATE.length - 1);
    }

    /**
     * Per-cycle difficulty escalation.
     * Each completed cycle adds +15% spawn rate and +10% speed, capped at cycle 5.
     */
    _getCycleScale() {
        const n = Math.min(this._cycle, 5);
        return { spawnMult: 1 + n * 0.15, speedMult: 1 + n * 0.1 };
    }

    /** Intensity 0-1 based on current chain for visual feedback. */
    _getIntensity() {
        return Math.min(this._chainCount / MAX_MULTIPLIER, 1);
    }

    _trySpawnWave() {
        const em = this.game.entityManager;
        const diffCfg = this._getDiffCfg();
        const cycleScale = this._getCycleScale();
        const alive = em.enemies.filter(e => e.active && !e._isAlly).length;
        if (alive >= diffCfg.maxLive) return;

        const pool = PHASE_POOLS[this._getPhase()];
        const count = WAVE_SIZE_MIN + Math.floor(Math.random() * (WAVE_SIZE_MAX - WAVE_SIZE_MIN + 1));
        const toSpawn = Math.min(count, diffCfg.maxLive - alive);

        const PATTERNS = ['straight', 'sine', 'zigzag', 'dive', 'circle', 'spiral', 'strafe', 'swoop'];
        const enemies = [];
        for (let i = 0; i < toSpawn; i++) {
            const type = pool[Math.floor(Math.random() * pool.length)];
            const xRatio = Number.parseFloat((0.1 + Math.random() * 0.8).toFixed(2));
            const pat = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
            enemies.push(enemySpec(type, xRatio, pat));
        }
        const wave = makeWave(enemies, 0, 'none');
        this.game.waveManager.spawnWave(wave, diffCfg.speedMult * cycleScale.speedMult);
    }

    // ── Cycle / milestone ──────────────────────────────

    /** Check if a milestone threshold has been crossed; fire if so. */
    _tryFireCycleEvent() {
        if (this._milestoneActive) return;
        if (this._nextEventIdx >= BLITZ_EVENTS.length) return;

        const evt = BLITZ_EVENTS[this._nextEventIdx];
        if (this._cycleKills < evt.cycleKill) return;

        this._nextEventIdx++;
        if (evt.type === 'boss') {
            this._fireBossEvent();
        } else {
            this._fireMiniBossEvent();
        }
    }

    _fireBossEvent() {
        const em = this.game.entityManager;
        // Clear grunts to give breathing room
        em.enemies = em.enemies.filter(e => !e.active || e._isAlly);
        const bossId = BLITZ_BOSS_POOL[this._cycle % BLITZ_BOSS_POOL.length];
        this.game.waveManager.spawnBoss(bossId);
        this._milestoneActive = true;
    }

    _fireMiniBossEvent() {
        const miniBossIdx = (this._cycle * 2 + (this._nextEventIdx - 1)) % BLITZ_MINIBOSS_POOL.length;
        const miniBossId = BLITZ_MINIBOSS_POOL[miniBossIdx];
        this.game.waveManager.spawnMiniBoss(miniBossId);
        this._milestoneActive = true;
    }

    /**
     * Called each frame while _milestoneActive is true.
     * Returns true while the milestone is still pending, halting regular spawn.
     */
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
        // Flags cleared externally but milestone still set — release
        this._milestoneActive = false;
        return false;
    }

    _onBossDefeated() {
        const em = this.game.entityManager;
        this.game.scoreManager.onBossKilled?.();
        em.bossActive = false;
        em.boss = null;
        this._milestoneActive = false;

        this._cycle++;

        // Check for victory after last cycle
        if (this._cycle >= BLITZ_MAX_CYCLES) {
            this._triggerVictory();
            return;
        }

        // Start next cycle
        this._cycleKills = 0;
        this._nextEventIdx = 0;

        // Visual fanfare
        this.game.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.4);
        this.game.postProcessing.shake?.(4, 1.5);
    }

    _triggerVictory() {
        const g = this.game;
        this.stop();
        const finish = () => {
            if (globalThis.saveWorldProgress) globalThis.saveWorldProgress(6);
            g.saveManager?.deleteSave?.();
            g.state = 'victory';
            g.uiManager.showVictoryScreen?.();
        };
        if (g.cinematicManager?.beginVictoryOutro) {
            g.cinematicManager.beginVictoryOutro(finish);
        } else {
            finish();
        }
    }

    _onMiniBossDefeated() {
        const em = this.game.entityManager;
        this.game.scoreManager.onMiniBossKilled?.();
        em.miniBossActive = false;
        em.miniBoss = null;
        this._milestoneActive = false;
    }
}
