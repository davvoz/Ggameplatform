import { RaceResult } from './RaceResult.js';

/**
 * Owns the race rules: lap counting, standings, timing and finish detection.
 * It reads car positions and writes back progress fields (segmentIndex,
 * onRoad) but performs NO input handling and NO physics (SRP). Geometry math
 * is delegated to {@link Track}.
 */
export class RaceManager {
    /**
     * @param {import('../domain/Track.js').Track} track
     * @param {number} totalLaps
     */
    constructor(track, totalLaps) {
        this._track = track;
        this.totalLaps = totalLaps;
        this.raceTime = 0;
        this.finished = false;
        /** @type {RaceResult|null} */
        this.result = null;
        /** @type {object[]} */
        this._entries = [];
        /** @type {object[]} reused, sorted view of entries */
        this.standings = [];
        this._playerEntry = null;
    }

    /**
     * Bind cars and capture their starting progress.
     * @param {import('../entities/Car.js').Car[]} cars
     */
    init(cars) {
        for (const car of cars) {
            const p = this._track.project(car.x, car.z, 0);
            const entry = {
                car,
                lastIndex: p.index,
                lastContinuous: p.continuous,
                cumulative: p.continuous,
                lap: 0,
                bestLap: Infinity,
                lapStart: 0,
                position: 0,
            };
            car.segmentIndex = p.index;
            this._entries.push(entry);
            this.standings.push(entry);
            if (car.isPlayer) this._playerEntry = entry;
        }
    }

    /**
     * Advance race state for one frame.
     * @param {number} dt seconds
     */
    updateProgress(dt) {
        this.raceTime += dt;
        for (const e of this._entries) this._advance(e);
        this._sortStandings();
        this._checkFinish();
    }

    _advance(entry) {
        const track = this._track;
        const car = entry.car;
        const p = track.project(car.x, car.z, entry.lastIndex);
        entry.lastIndex = p.index;
        car.segmentIndex = p.index;
        car.onRoad = p.lateral <= track.halfWidth;

        let delta = p.continuous - entry.lastContinuous;
        if (delta < -track.N / 2) delta += track.N;
        else if (delta > track.N / 2) delta -= track.N;
        entry.cumulative += delta;
        entry.lastContinuous = p.continuous;

        const lap = Math.floor(entry.cumulative / track.N);
        if (lap > entry.lap) {
            entry.lap = lap;
            this._recordLap(entry);
        }
    }

    _recordLap(entry) {
        const lapTime = this.raceTime - entry.lapStart;
        if (lapTime > 0 && lapTime < entry.bestLap) entry.bestLap = lapTime;
        entry.lapStart = this.raceTime;
    }

    _sortStandings() {
        this.standings.sort((a, b) => b.cumulative - a.cumulative);
        for (let i = 0; i < this.standings.length; i++) this.standings[i].position = i + 1;
    }

    _checkFinish() {
        if (this.finished) return;
        const pe = this._playerEntry;
        if (pe.cumulative < this.totalLaps * this._track.N) return;
        this.finished = true;
        this.result = new RaceResult({
            position: pe.position,
            totalCars: this._entries.length,
            timeSeconds: this.raceTime,
            bestLapSeconds: Number.isFinite(pe.bestLap) ? pe.bestLap : this.raceTime / this.totalLaps,
            laps: this.totalLaps,
        });
    }

    /** @returns {number} player's 1-based current lap, clamped to total. */
    playerLap() {
        return Math.min(this._playerEntry.lap + 1, this.totalLaps);
    }

    /** @returns {number} player's 1-based position. */
    playerPosition() {
        return this._playerEntry.position;
    }
}
