import { PlayerTuning } from '../config/Tuning.js';
import { Rng } from '../core/Rng.js';
import { Btn, ButtonState } from './Buttons.js';
import { EventQueue, Ev } from './Events.js';
import { Missions } from './levels/Missions.js';
import { Player } from './Player.js';
import { ScoreKeeper } from './ScoreKeeper.js';
import { World } from './World.js';

/**
 * A whole run, from the first mission to the last boss or the last life.
 *
 * The only input is `step(buttons)`, once per tick. There is no clock, no
 * Math.random and no trigonometry from the engine in here: the same seed and
 * the same button presses always give the same run and the same score.
 *
 * Phases:
 *  play     a mission in progress
 *  clear    mission accomplished: the tally is shown, then the next mission
 *  victory  the Supremo is down: final tally
 *  over     no lives left
 *  done     the run is finished and its result final
 */
const CLEAR_MIN_TICKS = 150;
const CLEAR_MAX_TICKS = 60 * 9;
const OVER_TICKS = 170;
const VICTORY_MIN_TICKS = 240;
const VICTORY_MAX_TICKS = 60 * 14;

export class Simulation {
    seed;
    tick = 0;
    phase = 'play';
    phaseTicks = 0;
    missionIndex;
    events = new EventQueue();
    input = new ButtonState();
    score = new ScoreKeeper(this.events);
    player;
    /** @type {World} */
    world;
    /** tally of the last mission: [{label, value, points}] */
    tally = [];
    livesBonus = 0;
    #rng;
    #won = false;
    /** no buttons: what the world gets while the tally is on screen */
    #idle = new ButtonState();

    /**
     * @param {number} seed
     * @param {{startMission?: number}} [options]
     */
    constructor(seed, { startMission = 0 } = {}) {
        this.seed = seed >>> 0;
        this.#rng = new Rng(this.seed);
        this.player = new Player(this.#rng.fork('weapons'));
        this.score.onExtraLife = () => this.player.lives++;
        this.missionIndex = startMission;
        this.#startMission();
    }

    get mission() {
        return Missions[this.missionIndex];
    }

    get missionCount() {
        return Missions.length;
    }

    get finished() {
        return this.phase === 'done';
    }

    /** true once the last boss has fallen */
    get won() {
        return this.#won;
    }

    /** @param {number} buttons bitmask of Btn */
    step(buttons) {
        if (this.phase === 'done') return;
        this.events.clear();
        this.input.update(buttons);
        this.tick++;
        this.phaseTicks++;

        switch (this.phase) {
            case 'play': this.#play(); break;
            case 'clear': this.#clear(); break;
            case 'victory': this.#victory(); break;
            case 'over': this.#over(); break;
            default: break;
        }
    }

    /** Facts about the run, for the leaderboard and the quests. */
    result() {
        return {
            score: this.score.total,
            missionsCleared: this.#won ? Missions.length : this.missionIndex,
            reachedMission: this.missionIndex + 1,
            kills: this.score.totalKills,
            rescues: this.score.totalRescues,
            teeth: this.score.totalTeeth,
            bestMultiplier: this.score.bestMultiplier,
            victory: this.#won,
            ticks: this.tick,
            seed: this.seed,
        };
    }

    #startMission() {
        const mission = this.mission;
        this.world = new World({
            level: mission,
            rng: this.#rng.fork(`mission${this.missionIndex}`),
            events: this.events,
            score: this.score,
            player: this.player,
            difficulty: mission.difficulty,
        });
        const teeth = (mission.pickups ?? []).filter((p) => p.type === 'tooth').length
            + (mission.props ?? []).filter((p) => p.drop === 'tooth').length;
        this.score.beginMission(mission.hostages?.length ?? 0, teeth);
        this.player.placeAt(60, -30);
        this.player.body.vx = 0;
        this.player.arsenal.cooldown = 0;
        this.phase = 'play';
        this.phaseTicks = 0;
        this.events.emit(Ev.LEVEL_START, 0, 0, this.missionIndex, 0, mission.name);
        this.events.emit(Ev.MUSIC, 0, 0, 0, 0, mission.music);
    }

    #play() {
        this.world.update(this.input);
        this.score.tick();
        if (this.player.state === 'out') {
            this.phase = 'over';
            this.phaseTicks = 0;
            this.events.emit(Ev.GAME_OVER);
            return;
        }
        if (this.world.cleared) {
            // the tally is a safe moment: nothing left can hurt her
            this.player.invuln = 1e9;
            this.world.clearEnemyShots();
            this.tally = this.score.closeMission(this.mission.parSeconds);
            const last = this.missionIndex === Missions.length - 1;
            this.phase = last ? 'victory' : 'clear';
            this.phaseTicks = 0;
            if (last) {
                this.#won = true;
                this.livesBonus = this.score.livesBonus(this.player.lives);
                this.events.emit(Ev.VICTORY);
            } else {
                this.events.emit(Ev.LEVEL_CLEAR, 0, 0, this.missionIndex);
            }
        }
    }

    /** The world keeps running in the background while the tally shows. */
    #clear() {
        this.world.update(this.#idle);
        if (this.#skip(CLEAR_MIN_TICKS, CLEAR_MAX_TICKS)) {
            this.missionIndex++;
            this.player.heal(PlayerTuning.maxHearts);
            this.#startMission();
        }
    }

    #victory() {
        this.world.update(this.#idle);
        if (this.#skip(VICTORY_MIN_TICKS, VICTORY_MAX_TICKS)) this.phase = 'done';
    }

    #over() {
        this.world.update(this.#idle);
        if (this.phaseTicks >= OVER_TICKS) this.phase = 'done';
    }

    #skip(min, max) {
        return this.phaseTicks >= max || (this.phaseTicks >= min && this.input.pressed(Btn.FIRE));
    }
}
