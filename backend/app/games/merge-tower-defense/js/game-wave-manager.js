/**
 * WaveManager — SRP: handles all wave lifecycle logic.
 * Extracted from Game to comply with SonarQube single-responsibility.
 */
import { CONFIG } from './config.js';
import { Utils } from './utils.js';

const SPECIAL_WAVE = Object.freeze({
    ASSALTO: 'Assalto Speciale!',
    DOPPIO_BOSS: 'Doppio Boss!',
    INCUBO: 'Incubo Oscuro!',
});

export class WaveManager {
    constructor(game) {
        this.game = game;
    }

    // ── convenience accessors ──────────────────────────────────────────────
    get state()     { return this.game.state; }
    get particles() { return this.game.particles; }
    get audio()     { return this.game.audio; }
    get entities()  { return this.game.entities; }

    // ── public API ─────────────────────────────────────────────────────────
    update(dt, currentTime) {
        const { state } = this;
        if (state.tutorialMode || !state.waveModeSelected) return;
        if (!state.waveInProgress && state.wave === 1) this.startWave();
        if (state.waveInProgress) {
            this._processSpawning(currentTime);
            this._checkWaveComplete();
        }
    }

    startWave() {
        const { state, particles, audio } = this;
        state.waveInProgress = true;
        state.waveZombiesSpawned = 0;

        const scalingFactor = 2.0 + Math.floor(state.wave / 8);
        const growthRate    = 6.0 + Math.floor(state.wave / 10);
        let additionalZombies = Math.floor(
            Math.log10(1 + (state.wave - 1) * scalingFactor) * growthRate
        );

        // Note: % 6 checked before % 10 intentionally (wave 60 → Assalto)
        if (state.wave % 6 === 0) {
            additionalZombies += 5 + state.wave;
            state.specialWave = SPECIAL_WAVE.ASSALTO;
        } else if (state.wave % 10 === 0) {
            additionalZombies += 8;
            state.specialWave = SPECIAL_WAVE.DOPPIO_BOSS;
        } else {
            state.specialWave = null;
        }

        state.waveZombiesTotal = CONFIG.BASE_WAVE_ZOMBIES + additionalZombies;
        state.lastSpawnTime    = performance.now();

        let waveText = `⚔️ WAVE ${state.wave} ⚔️`;
        if (state.specialWave) waveText += `\n${state.specialWave}`;
        particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 2, {
            text: waveText, color: CONFIG.COLORS.TEXT_WARNING,
            vy: -0.5, life: 2.0, scale: 2.0, glow: true,
        });
        audio.waveStart();
    }

    spawnZombie() {
        const { state, entities, audio } = this;
        const col    = Utils.randomInt(0, CONFIG.COLS - 1);
        const type   = this.selectZombieType();
        const zombie = entities.addZombie(col, type, state.wave);

        if (type === 'BOSS' || type === 'GOLEM') {
            audio.bossSpawn();
        } else {
            audio.enemySpawn();
        }
        if (zombie) this._applyWaveScaling(zombie);
        state.waveZombiesSpawned++;
    }

    selectZombieType() {
        const { state } = this;
        const wave = state.wave;

        if (state.specialWave === SPECIAL_WAVE.ASSALTO) {
            return Utils.weightedRandom([
                { value: 'RUSHER', weight: 15 }, { value: 'SHADOW', weight: 10 },
                { value: 'NORMAL', weight: 8 },  { value: 'FLYER',  weight: 8 },
            ]);
        }
        if (state.specialWave === SPECIAL_WAVE.DOPPIO_BOSS) {
            return Utils.weightedRandom([
                { value: 'BOSS',    weight: 8 },  { value: 'GOLEM',   weight: 6 },
                { value: 'TANK',    weight: 15 }, { value: 'ARMORED', weight: 12 },
                { value: 'NORMAL',  weight: 10 },
            ]);
        }
        if (state.specialWave === SPECIAL_WAVE.INCUBO) {
            return Utils.weightedRandom([
                { value: 'VAMPIRE', weight: 15 }, { value: 'SHADOW', weight: 12 },
                { value: 'SIREN',   weight: 14 }, { value: 'BOMBER', weight: 8 },
            ]);
        }

        const options = [
            { value: 'NORMAL',   weight: Math.max(3, 15 - wave) },
            { value: 'TANK',     weight: wave >= 3  ? 6 + Math.floor(wave / 3)  : 0 },
            { value: 'RUSHER',   weight: wave >= 3  ? 7 + Math.floor(wave / 3)  : 0 },
            { value: 'FLYER',    weight: wave >= 4  ? 8 + Math.floor(wave / 2)  : 0 },
            { value: 'SPLITTER', weight: wave >= 5  ? 6 + Math.floor(wave / 3)  : 0 },
            { value: 'ARMORED',  weight: wave >= 6  ? 5 + Math.floor(wave / 4)  : 0 },
            { value: 'HEALER',   weight: wave >= 6  ? 5 + Math.floor(wave / 4)  : 0 },
            { value: 'BOMBER',   weight: wave >= 7  ? 6 + Math.floor(wave / 3)  : 0 },
            { value: 'VAMPIRE',  weight: wave >= 7  ? 5 + Math.floor(wave / 4)  : 0 },
            { value: 'SHADOW',   weight: wave >= 8  ? 5 + Math.floor(wave / 4)  : 0 },
            { value: 'PHASER',   weight: wave >= 9  ? 6 + Math.floor(wave / 3)  : 0 },
            { value: 'SIREN',    weight: wave >= 8  ? 6 + Math.floor(wave / 4)  : 0 },
            { value: 'GOLEM',    weight: wave >= 12 ? 3 + Math.floor(wave / 6)  : 0 },
            { value: 'BOSS',     weight: (wave >= 10 && wave % 5 === 0) ? 5 + Math.floor(wave / 10) : 0 },
        ].filter(o => o.weight > 0);

        return Utils.weightedRandom(options);
    }

    completeWave() {
        const { state, particles, audio } = this;
        state.waveInProgress = false;

        const baseReward        = 20;
        const rewardScalingFactor = 1.0;
        const rewardGrowthRate  = 0.8;
        const logMultiplier     = 1.0 + Math.log10(1 + (state.wave - 1) * rewardScalingFactor) * rewardGrowthRate;
        const waveBonus         = Math.floor(baseReward * logMultiplier * 0.6);
        const energyBonus       = Math.floor(state.energy / 15);
        const totalReward       = baseReward + waveBonus + energyBonus;

        state.coins      += totalReward;
        state.score      += waveBonus * 2;
        state.coinsEarned += totalReward;
        state.energy     = Math.min(CONFIG.INITIAL_ENERGY, state.energy + 20);

        particles.createWaveClearEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2);
        particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 + 1, {
            text: `+${totalReward} 💰`, color: CONFIG.COLORS.TEXT_WARNING,
            vy: -1, life: 2.0, scale: 1.5, glow: true,
        });
        audio.waveComplete();

        if (state.targetWaves > 0 && state.wave >= state.targetWaves) {
            this.game.victory();
            return;
        }

        setTimeout(() => {
            if (!state.isGameOver && !state.isVictory) {
                state.wave++;
                this.startWave();
            }
        }, 1500);
    }

    setWaveMode(modeKey) {
        const mode = CONFIG.WAVE_MODES[modeKey];
        if (!mode) {
            console.error('[WaveManager] Invalid wave mode:', modeKey);
            return false;
        }
        const { state } = this;
        state.selectedWaveMode = modeKey;
        state.targetWaves      = mode.waves;
        state.coinReward       = mode.reward;
        state.waveModeSelected = true;
        return true;
    }

    // ── private helpers ────────────────────────────────────────────────────
    _processSpawning(currentTime) {
        const { state } = this;
        if (state.waveZombiesSpawned >= state.waveZombiesTotal) return;

        let spawnInterval = CONFIG.SPAWN_INTERVAL;
        if (state.specialWave === SPECIAL_WAVE.DOPPIO_BOSS) spawnInterval *= 4.5;

        if (currentTime - state.lastSpawnTime >= spawnInterval) {
            this.spawnZombie();
            state.lastSpawnTime = currentTime;
        }
    }

    _checkWaveComplete() {
        const { state, entities } = this;
        if (state.waveZombiesSpawned >= state.waveZombiesTotal && entities.zombies.length === 0) {
            this.completeWave();
        }
    }

    _applyWaveScaling(zombie) {
        const wave = this.state.wave;
        if (zombie.isHealer && wave >= 12) {
            zombie.healAmount  = Math.floor(zombie.healAmount * (1 + (wave - 10) * 0.15));
            zombie.healInterval = Math.max(800, zombie.healInterval - (wave - 10) * 80);
        }
        if (zombie.canPhase && wave >= 15) {
            zombie.phaseInterval = Math.max(1200, zombie.phaseInterval - (wave - 14) * 150);
        }
        if (zombie.canSplit && wave >= 18) {
            zombie.splitCount = Math.min(6, zombie.splitCount + Math.floor((wave - 17) / 3));
        }
    }
}
