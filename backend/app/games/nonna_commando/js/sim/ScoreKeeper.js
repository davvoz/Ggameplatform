import { ScoreTuning as T } from '../config/Tuning.js';
import { Ev } from './Events.js';

/**
 * The score is the point of the game, so every rule about it lives here.
 *
 * HEAT: each kill adds heat; every few points of heat raise the multiplier one
 * step, up to x8. After a pause in the killing the multiplier cools one step at
 * a time. Getting hurt drops it straight back to x1. Fighting up close, with
 * the slipper or in the air adds extra heat, so the brave earn more.
 *
 * All values are integers and depend only on simulation events, so the same
 * run always produces the same score.
 */

/** Style bonuses: label shown, extra percent of points, extra heat. */
export const Style = Object.freeze({
    MELEE: { label: 'SLIPPER!', percent: 100, heat: 2 },
    POINT_BLANK: { label: 'POINT BLANK!', percent: 50, heat: 1 },
    AIR: { label: 'AIRBORNE!', percent: 50, heat: 1 },
    CHAIN: { label: 'CHAIN!', percent: 25, heat: 1 },
    POP: { label: 'POP!', percent: 50, heat: 1 },
    BURN: { label: 'WELL DONE!', percent: 0, heat: 0 },
});

export class MissionStats {
    kills = 0;
    shots = 0;
    hits = 0;
    rescues = 0;
    rescuesTotal = 0;
    teeth = 0;
    teethTotal = 0;
    damageTaken = 0;
    bestMultiplier = 1;
    ticks = 0;
    points = 0;

    get accuracy() {
        return this.shots === 0 ? 0 : Math.min(100, Math.floor((this.hits * 100) / this.shots));
    }
}

export class ScoreKeeper {
    total = 0;
    heat = 0;
    multiplier = 1;
    /** ticks left before cooling starts */
    chainTimer = 0;
    bestMultiplier = 1;
    totalKills = 0;
    totalRescues = 0;
    totalTeeth = 0;
    nextExtraLife = T.extraLifeEvery;
    /** @type {MissionStats} */
    mission = new MissionStats();
    /** called when the score crosses an extra life threshold */
    onExtraLife = () => {};
    #events;

    /** @param {import('./Events.js').EventQueue} events */
    constructor(events) {
        this.#events = events;
    }

    /** Called when a mission starts. */
    beginMission(rescuesTotal, teethTotal) {
        this.mission = new MissionStats();
        this.mission.rescuesTotal = rescuesTotal;
        this.mission.teethTotal = teethTotal;
    }

    tick() {
        this.mission.ticks++;
        if (this.chainTimer > 0) {
            this.chainTimer--;
            return;
        }
        if (this.multiplier > 1 || this.heat > 0) {
            const lost = this.multiplier;
            this.heat = Math.max(0, (this.multiplier - 2) * T.heatPerStep);
            this.#refreshMultiplier();
            this.chainTimer = T.coolTicks;
            if (this.multiplier < lost) this.#events.emit(Ev.CHAIN_LOST, 0, 0, lost);
        }
    }

    /** Fraction of the chain timer left, for the HUD. */
    get chainFraction() {
        return this.multiplier > 1 ? this.chainTimer / T.chainTicks : 0;
    }

    /**
     * A kill. Returns the points scored.
     * @param {number} base points of the enemy
     * @param {{label: string, percent: number, heat: number}[]} styles
     * @param {number} x where to show the points
     * @param {number} y
     * @param {string} type enemy type, for the event
     * @param {any} ref
     * @param {boolean} [multiplied] false for bosses: their points are fixed
     */
    kill(base, styles, x, y, type, ref, multiplied = true) {
        let percent = 100;
        let heat = 1;
        for (const s of styles) {
            percent += s.percent;
            heat += s.heat;
        }
        this.mission.kills++;
        this.totalKills++;
        const mult = multiplied ? this.multiplier : 1;
        const points = Math.floor((base * percent) / 100) * mult;
        this.#add(points);
        this.#events.emit(Ev.KILL, x, y, points, mult, type, ref);
        for (const s of styles) if (s.label) this.#events.emit(Ev.BONUS_TEXT, x, y - 10, 0, 0, s.label);
        if (multiplied) this.#heatUp(heat);
        return points;
    }

    /** Hitting anything keeps the chain warm, so bosses don't kill the multiplier. */
    keepAlive() {
        if (this.multiplier > 1 || this.heat > 0) this.chainTimer = Math.max(this.chainTimer, T.hitKeepAlive);
    }

    /** Points for a pickup or a stunt, multiplied by the current heat. */
    award(base, x, y, label = '', multiplied = true) {
        const points = base * (multiplied ? this.multiplier : 1);
        this.#add(points);
        this.#events.emit(Ev.BONUS_TEXT, x, y, points, multiplied ? this.multiplier : 1, label);
        return points;
    }

    /** Flat points, no text (summaries). */
    addFlat(points) {
        this.#add(points);
    }

    shotFired() {
        this.mission.shots++;
    }

    shotLanded() {
        this.mission.hits++;
    }

    rescued() {
        this.mission.rescues++;
        this.totalRescues++;
    }

    toothFound() {
        this.mission.teeth++;
        this.totalTeeth++;
    }

    /** The player got hurt: the heat is gone. */
    hurt() {
        this.mission.damageTaken++;
        if (this.multiplier > 1) this.#events.emit(Ev.CHAIN_LOST, 0, 0, this.multiplier);
        this.heat = 0;
        this.chainTimer = 0;
        this.multiplier = 1;
    }

    /**
     * End-of-mission bonuses, in the order they are shown.
     * @param {number} parSeconds
     * @returns {{label: string, value: string, points: number}[]}
     */
    closeMission(parSeconds) {
        const m = this.mission;
        const seconds = Math.floor(m.ticks / 60);
        const lines = [
            { label: 'ACCURACY', value: `${m.accuracy}%`, points: m.accuracy * T.accuracyPerPercent },
            { label: 'TIME', value: formatTime(seconds), points: Math.max(0, parSeconds - seconds) * T.timeBonusPerSecond },
            { label: 'GRANDKIDS', value: `${m.rescues}/${m.rescuesTotal}`, points: m.rescues * T.rescueBonus },
            { label: 'GOLD TEETH', value: `${m.teeth}/${m.teethTotal}`, points: m.teethTotal > 0 && m.teeth === m.teethTotal ? T.allTeethBonus : 0 },
            { label: 'FLAWLESS', value: m.damageTaken === 0 ? 'YES' : 'NO', points: m.damageTaken === 0 ? T.flawlessBonus : 0 },
        ];
        for (const line of lines) this.#add(line.points);
        return lines;
    }

    /** Bonus for each life left when the last boss falls. */
    livesBonus(lives) {
        const points = lives * T.livesBonus;
        this.#add(points);
        return points;
    }

    #heatUp(amount) {
        this.heat += amount;
        this.chainTimer = T.chainTicks;
        const before = this.multiplier;
        this.#refreshMultiplier();
        if (this.multiplier > before) this.#events.emit(Ev.CHAIN_UP, 0, 0, this.multiplier);
    }

    #refreshMultiplier() {
        this.multiplier = Math.min(T.maxMultiplier, 1 + Math.floor(this.heat / T.heatPerStep));
        if (this.multiplier > this.bestMultiplier) this.bestMultiplier = this.multiplier;
        if (this.multiplier > this.mission.bestMultiplier) this.mission.bestMultiplier = this.multiplier;
    }

    #add(points) {
        this.total += points;
        this.mission.points += points;
        while (this.total >= this.nextExtraLife) {
            this.nextExtraLife += T.extraLifeEvery;
            this.#events.emit(Ev.EXTRA_LIFE);
            this.onExtraLife();
        }
    }
}

export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
